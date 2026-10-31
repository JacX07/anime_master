// Équilibre des sorts de personnage SSR/UR (docs/specs/combat.md §4 bis) sur le vrai pool. Lecture seule.
// Mesure : (1) équipes avec sorts contre la même rareté sans sorts, (2) la hiérarchie des raretés, (3) le poids de chaque sort
// (même équipe avec et sans le sort de la carte, camps alternés). Cible : un sort pèse de 1 à 6 points ; l'écart de rareté reste net.
// Usage : npx tsx scripts/simulate-spells.ts [--games 4000] [--seed 42]

import type { Rarity } from "../src/generated/prisma/enums";
import { battle, type BattleCard, type Random } from "../src/lib/battle";
import { prisma } from "../src/lib/db";
import { CHARACTER_SPELLS } from "../src/lib/spells";

const arg = (name: string, d: number) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? d : Number(process.argv[i + 1]);
};
const GAMES = arg("--games", 4000);
function seeded(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = seeded(arg("--seed", 42));
const any = <T>(l: T[]) => l[Math.floor(rng() * l.length)];
const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
const pts = (x: number) => `${x >= 0 ? "+" : ""}${((x - 0.5) * 100).toFixed(1)} pts`;
const off = (t: BattleCard[]) => t.map((c) => ({ ...c, noSpell: true }));

async function main() {
  const rows = await prisma.character.findMany({
    where: { disabled: false },
    select: { id: true, name: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } },
  });
  const cards = rows.map((r) => ({ name: r.name, card: { characterId: r.id, rarity: r.rarity, type: r.type, attack: r.attack, defense: r.defense, power: r.power, franchiseId: r.mainMedia?.franchiseId ?? r.mainMediaId } as BattleCard }));
  const by = (r: Rarity) => cards.filter((c) => c.card.rarity === r).map((c) => c.card);
  const team = (r: Rarity) => [0, 1, 2, 3].map(() => any(by(r)));
  /** Victoire du camp A (alternance des camps pour annuler l'avantage du premier joueur) */
  const rate = (make: () => [BattleCard[], BattleCard[]]) => {
    let w = 0;
    for (let g = 0; g < GAMES; g++) {
      const [a, b] = make();
      const swap = g % 2 === 1;
      const r = swap ? battle(b, a, rng) : battle(a, b, rng);
      const win = swap ? r.winner === "B" : r.winner === "A";
      w += win ? 1 : r.winner === null ? 0.5 : 0;
    }
    return w / GAMES;
  };

  console.log(`Pool : ${cards.length} personnages, ${GAMES} combats par scénario\n`);
  console.log("1. Équipe avec sorts contre la même rareté sans sorts (victoires de l'équipe avec sorts)");
  for (const r of ["SSR", "UR"] as Rarity[]) {
    const x = rate(() => { const t = team(r); const u = team(r); return [t, off(u)]; });
    console.log(`   4 ${r} avec sorts / 4 ${r} sans : ${pct(x)} (${pts(x)})`);
  }
  const mixed = rate(() => [[...team("UR").slice(0, 2), ...team("SSR").slice(0, 2)], off([...team("UR").slice(0, 2), ...team("SSR").slice(0, 2)])]);
  console.log(`   2 UR + 2 SSR avec sorts / identique sans : ${pct(mixed)} (${pts(mixed)})`);
  console.log(`   Un seul SSR avec sort + 3 SR / 4 SR : ${pct(rate(() => [[any(by("SSR")), ...team("SR").slice(0, 3)], off(team("SR"))]))}\n`);

  console.log("2. La rareté reste décisive (tout le monde a ses sorts)");
  const gap = (a: Rarity, b: Rarity) => pct(rate(() => [team(a), team(b)]));
  console.log(`   4 SSR / 4 SR : ${gap("SSR", "SR")}   4 UR / 4 SSR : ${gap("UR", "SSR")}`);
  const sspell = rate(() => [team("SSR"), off(team("UR"))]);
  console.log(`   4 SSR avec sorts / 4 UR SANS sorts : ${pct(sspell)} (le pire cas pour l'UR ; la spec veut qu'un UR domine)\n`);

  console.log("3. Poids de chaque sort : même équipe avec et sans le sort de la carte (le reste de l'équipe sans sorts)");
  const rows3: { nom: string; rareté: string; poids: number }[] = [];
  const weight = (c: BattleCard) =>
    rate(() => {
      const mates = [0, 1, 2].map(() => ({ ...any(by(c.rarity)), noSpell: true }));
      return [[c, ...mates], [{ ...c, noSpell: true }, ...mates.map((m) => ({ ...m }))]];
    });
  for (const id of Object.keys(CHARACTER_SPELLS).map(Number)) {
    const row = cards.find((c) => c.card.characterId === id);
    if (row) rows3.push({ nom: `${row.name} (${CHARACTER_SPELLS[id].name})`, rareté: row.card.rarity, poids: weight(row.card) });
  }
  for (const t of ["COMBAT", "MYSTERE", "MAGIE", "COEUR", "AVENTURE"] as const) {
    const g = cards.find((c) => c.card.rarity === "SSR" && c.card.type === t && !(c.card.characterId in CHARACTER_SPELLS));
    if (g) rows3.push({ nom: `Générique ${t} (${g.name})`, rareté: "SSR", poids: weight(g.card) });
  }
  rows3.sort((a, b) => b.poids - a.poids);
  console.table(rows3.map((r) => ({ sort: r.nom, rareté: r.rareté, poids: pts(r.poids), verdict: r.poids - 0.5 > 0.08 ? "⚠ trop fort" : r.poids - 0.5 < 0.005 ? "⚠ inutile" : "ok" })));
  const w = rows3.map((r) => r.poids - 0.5);
  console.log(`Moyenne ${(w.reduce((a, b) => a + b, 0) / w.length * 100).toFixed(1)} pts, min ${(Math.min(...w) * 100).toFixed(1)}, max ${(Math.max(...w) * 100).toFixed(1)}`);
}
main().finally(() => prisma.$disconnect());
