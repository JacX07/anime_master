// Calibre les sorts de personnage SSR/UR (docs/specs/combat.md §4 bis) : règle un multiplicateur par sort, par dichotomie,
// jusqu'à ce que le sort pèse environ +TARGET points (même équipe avec et sans le sort de la carte, camps alternés).
// Écrit le résultat dans /tmp/spells-calibrated.txt (code prêt à coller dans src/lib/spells.ts). Lecture seule sur la base.
// Usage : npx tsx scripts/calibrate-spells.ts [--games 3000] [--target 0.04] [--seed 7]

import { writeFileSync } from "node:fs";
import type { Rarity } from "../src/generated/prisma/enums";
import { battle, type BattleCard, type Random } from "../src/lib/battle";
import { prisma } from "../src/lib/db";
import { CHARACTER_SPELLS, GENERIC, type CharacterSpell, type Effect } from "../src/lib/spells";

const arg = (name: string, d: number) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? d : Number(process.argv[i + 1]);
};
const GAMES = arg("--games", 3000), TARGET = arg("--target", 0.04);
function seeded(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = seeded(arg("--seed", 7));
const any = <T>(l: T[]) => l[Math.floor(rng() * l.length)];

/** Réglage d'un sort : le multiplicateur du premier effet de dégâts (ajouté s'il manque), ou la part de réanimation. */
function knob(sp: CharacterSpell): { get: () => number; set: (v: number) => void; min: number; max: number } {
  const rev = sp.effects.find((e): e is Extract<Effect, { k: "revive" }> => e.k === "revive");
  if (rev) return { get: () => rev.pct, set: (v) => (rev.pct = v), min: 0.1, max: 1 };
  let d = sp.effects.find((e): e is Extract<Effect, { k: "damage" }> => e.k === "damage");
  if (!d) {
    d = sp.target === null ? { k: "damage", mult: 0.3, zone: true } : { k: "damage", mult: 0.5 };
    sp.effects.unshift(d);
  }
  const dd = d;
  return { get: () => dd.mult, set: (v) => (dd.mult = v), min: 0.1, max: 3.5 };
}

const num = (x: number) => String(+x.toFixed(2));
function effectSrc(e: Effect): string {
  switch (e.k) {
    case "damage": {
      const o = [e.zone && "zone: true", e.ignoreDef && `ignoreDef: ${e.ignoreDef}`, e.pierce && "pierce: true", e.drain && `drain: ${e.drain}`, e.critSure && "critSure: true"].filter(Boolean);
      return `dmg(${num(e.mult)}${o.length ? `, { ${o.join(", ")} }` : ""})`;
    }
    case "mod": return `mod("${e.stat}", ${e.amount}, ${e.turns}, "${e.to}")`;
    default: return JSON.stringify(e).replace(/"(\w+)":/g, "$1: ").replace(/,/g, ", ").replace(/^\{/, "{ ").replace(/\}$/, " }");
  }
}
const spellSrc = (sp: CharacterSpell) => `S(${JSON.stringify(sp.name)}, ${sp.target === null ? "null" : `"${sp.target}"`}, ${sp.effects.map(effectSrc).join(", ")})`;

async function main() {
  const rows = await prisma.character.findMany({
    where: { disabled: false },
    select: { id: true, name: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } },
  });
  const cards = rows.map((r) => ({ name: r.name, card: { characterId: r.id, rarity: r.rarity, type: r.type, attack: r.attack, defense: r.defense, power: r.power, franchiseId: r.mainMedia?.franchiseId ?? r.mainMediaId } as BattleCard }));
  const by = (r: Rarity) => cards.filter((c) => c.card.rarity === r).map((c) => c.card);
  const weight = (c: BattleCard) => {
    let w = 0;
    for (let g = 0; g < GAMES; g++) {
      const mates = [0, 1, 2].map(() => ({ ...any(by(c.rarity)), noSpell: true }));
      const withSpell = [c, ...mates], without = [{ ...c, noSpell: true }, ...mates.map((m) => ({ ...m }))];
      const swap = g % 2 === 1;
      const r = swap ? battle(without, withSpell, rng) : battle(withSpell, without, rng);
      const win = swap ? r.winner === "B" : r.winner === "A";
      w += win ? 1 : r.winner === null ? 0.5 : 0;
    }
    return w / GAMES - 0.5;
  };
  const tune = (label: string, c: BattleCard, sp: CharacterSpell) => {
    const k = knob(sp);
    let lo = k.min, hi = k.max;
    const start = weight(c);
    for (let i = 0; i < 7; i++) {
      const mid = +((lo + hi) / 2).toFixed(2);
      k.set(mid);
      const w = weight(c);
      if (w > TARGET) hi = mid; else lo = mid;
    }
    const v = +((lo + hi) / 2).toFixed(2);
    k.set(v);
    const end = weight(c);
    console.log(`${label.padEnd(50)} ${(start * 100).toFixed(1).padStart(6)} → ${(end * 100).toFixed(1).padStart(5)} pts   mult ${v}${v <= k.min + 0.01 || v >= k.max - 0.01 ? "  ⚠ bord" : ""}`);
    return end;
  };

  const ends: number[] = [];
  for (const [id, sp] of Object.entries(CHARACTER_SPELLS)) {
    const row = cards.find((c) => c.card.characterId === Number(id));
    if (row) ends.push(tune(`${row.name} (${sp.name})`, row.card, sp));
  }
  for (const t of ["COMBAT", "MYSTERE", "MAGIE", "COEUR", "AVENTURE"] as const) {
    const g = cards.filter((c) => c.card.rarity === "SSR" && c.card.type === t && !(c.card.characterId in CHARACTER_SPELLS)).slice(0, 1)[0];
    if (g) ends.push(tune(`Générique ${t} (${g.name})`, g.card, GENERIC[t]));
  }
  console.log(`\nPoids final : moyenne ${(ends.reduce((a, b) => a + b, 0) / ends.length * 100).toFixed(1)} pts, min ${(Math.min(...ends) * 100).toFixed(1)}, max ${(Math.max(...ends) * 100).toFixed(1)}`);

  const names = new Map(cards.map((c) => [c.card.characterId, c.name]));
  const out = [
    "export const CHARACTER_SPELLS: Record<number, CharacterSpell> = {",
    ...Object.entries(CHARACTER_SPELLS).map(([id, sp]) => `  ${id}: ${spellSrc(sp)}, // ${names.get(Number(id))}`),
    "};",
    "",
    "export const GENERIC: Record<CardType, CharacterSpell> = {",
    ...Object.entries(GENERIC).map(([t, sp]) => `  ${t}: ${spellSrc(sp)},`),
    "};",
  ].join("\n");
  writeFileSync("/tmp/spells-calibrated.txt", out);
  console.log("Écrit : /tmp/spells-calibrated.txt");
}
main().finally(() => prisma.$disconnect());
