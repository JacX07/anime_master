// Simulation du combat 4 contre 4 (src/lib/battle.ts) sur le vrai pool de personnages. Lecture seule.
// Critères fixés avant lancement : aucun type au-delà de 40–60 % de victoires, combats de moins de 15 tours.
// Usage : npx tsx scripts/simulate-battle.ts [--games 10000] [--seed 42]

import type { CardType, Rarity } from "../src/generated/prisma/enums";
import { battle, type BattleCard, type BattleOptions, type Random } from "../src/lib/battle";
import { prisma } from "../src/lib/db";

const arg = (name: string, d: number) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? d : Number(process.argv[i + 1]);
};
const GAMES = arg("--games", 10_000);
const SEED = arg("--seed", 42);

function seeded(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = seeded(SEED);
const any = <T>(list: T[]) => list[Math.floor(rng() * list.length)];

const RARITIES: Rarity[] = ["N", "R", "SR", "SSR", "UR"];
const TYPES: CardType[] = ["COMBAT", "MYSTERE", "MAGIE", "COEUR", "AVENTURE"];
const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
const flag = (ok: boolean) => (ok ? "✅" : "❌");

async function main() {
const rows = await prisma.character.findMany({
  where: { disabled: false },
  select: { id: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } },
});
const pool: BattleCard[] = rows.map((r) => ({
  characterId: r.id, rarity: r.rarity, type: r.type, attack: r.attack, defense: r.defense, power: r.power,
  franchiseId: r.mainMedia?.franchiseId ?? r.mainMediaId,
}));
const byRarity = Object.fromEntries(RARITIES.map((r) => [r, pool.filter((c) => c.rarity === r)])) as Record<Rarity, BattleCard[]>;
const team = (rarities: Rarity[]) => rarities.map((r) => any(byRarity[r]));
const four = (r: Rarity) => team([r, r, r, r]);
console.log(`Pool : ${pool.length} personnages, ${GAMES} combats par scénario, graine ${SEED}\n`);

const durations: number[] = [];
let timeouts = 0;
function play(a: BattleCard[], b: BattleCard[], opts?: BattleOptions) {
  const r = battle(a, b, rng, opts);
  durations.push(r.rounds);
  if (r.timeout) timeouts++;
  return r;
}
/** Taux de victoire de A (nul = ½). */
function rate(make: () => [BattleCard[], BattleCard[]], opts?: BattleOptions) {
  let score = 0;
  for (let i = 0; i < GAMES; i++) {
    const [a, b] = make();
    const r = play(a, b, opts);
    score += r.winner === "A" ? 1 : r.winner === null ? 0.5 : 0;
  }
  return score / GAMES;
}

// 1. Types : équipes aléatoires de même rareté, victoires comptées par carte.
console.log("1. Taux de victoire par type (équipes aléatoires de même rareté)");
const typeTable: Record<string, string>[] = [];
let typeOk = true;
for (const rarity of RARITIES) {
  const wins = Object.fromEntries(TYPES.map((t) => [t, [0, 0]])) as Record<CardType, number[]>;
  for (let i = 0; i < GAMES; i++) {
    const a = four(rarity), b = four(rarity);
    const r = play(a, b);
    for (const [side, cards] of [["A", a], ["B", b]] as const) {
      const s = r.winner === side ? 1 : r.winner === null ? 0.5 : 0;
      for (const c of cards) {
        wins[c.type][0] += s;
        wins[c.type][1]++;
      }
    }
  }
  const row: Record<string, string> = { rareté: rarity };
  for (const t of TYPES) {
    const w = wins[t][0] / wins[t][1];
    if (w < 0.4 || w > 0.6) typeOk = false;
    row[t] = pct(w);
  }
  typeTable.push(row);
}
console.table(typeTable);
console.log(`${flag(typeOk)} tous les types entre 40 et 60 %\n`);

// 2. Équipes mono-type (SR) : ligne contre colonne.
console.log("2. Mono-type SR : taux de victoire de la ligne contre la colonne");
const mono = (t: CardType) => {
  const list = byRarity.SR.filter((c) => c.type === t);
  return () => [any(list), any(list), any(list), any(list)];
};
const monoTable: Record<string, string>[] = [];
for (const t of TYPES) {
  const row: Record<string, string> = { type: t };
  for (const u of TYPES) row[u] = pct(rate(() => [mono(t)(), mono(u)()]));
  monoTable.push(row);
}
console.table(monoTable);

// 3. Écart de rareté.
console.log("\n3. Écart de rareté : taux de victoire de l'équipe la plus rare");
const gapTable = [
  ["4 R contre 4 N", ["R", "R", "R", "R"], ["N", "N", "N", "N"]],
  ["4 SR contre 4 R", ["SR", "SR", "SR", "SR"], ["R", "R", "R", "R"]],
  ["4 SSR contre 4 SR", ["SSR", "SSR", "SSR", "SSR"], ["SR", "SR", "SR", "SR"]],
  ["4 UR contre 4 SSR", ["UR", "UR", "UR", "UR"], ["SSR", "SSR", "SSR", "SSR"]],
  ["1 UR + 3 N contre 4 R", ["UR", "N", "N", "N"], ["R", "R", "R", "R"]],
  ["1 SSR + 3 SR contre 4 SR", ["SSR", "SR", "SR", "SR"], ["SR", "SR", "SR", "SR"]],
  ["1 UR + 3 SR contre 4 SSR", ["UR", "SR", "SR", "SR"], ["SSR", "SSR", "SSR", "SSR"]],
] as [string, Rarity[], Rarity[]][];
console.table(gapTable.map(([label, a, b]) => ({ match: label, victoire: pct(rate(() => [team(a), team(b)])) })));

// 4. Ultimes : même équipe SSR avec ou sans ultimes (l'adversaire n'en a pas).
console.log("\n4. Poids des ultimes");
let withUlt = 0;
for (let i = 0; i < GAMES; i++) {
  const a = four("SSR"), b = four("SSR");
  // B est la même rareté, privée d'ultimes : on lui donne une rareté SR fictive.
  const bNoUlt = b.map((c) => ({ ...c, rarity: "SR" as Rarity }));
  const r = play(a, bNoUlt, { passive: false });
  withUlt += r.winner === "A" ? 1 : r.winner === null ? 0.5 : 0;
}
console.log(`4 SSR avec ultimes contre 4 SSR sans ultimes : ${pct(withUlt / GAMES)}`);

// 5. Passif UR : UR + 3 alliés de sa franchise, contre le même UR + 3 cartes de mêmes raretés hors franchise.
console.log("\n5. Passif UR (franchise)");
const franchiseOf = new Map<number, BattleCard[]>();
for (const c of pool) if (c.franchiseId != null) franchiseOf.set(c.franchiseId, [...(franchiseOf.get(c.franchiseId) ?? []), c]);
const urWithMates = byRarity.UR.filter((u) => (franchiseOf.get(u.franchiseId!)?.length ?? 0) >= 4);
console.log(`${urWithMates.length} UR sur ${byRarity.UR.length} ont au moins 3 alliés de leur franchise`);
const passiveMatch = (opts: BattleOptions) =>
  rate(() => {
    const ur = any(urWithMates);
    const mates = franchiseOf.get(ur.franchiseId!)!.filter((c) => c !== ur);
    const picked = [any(mates), any(mates), any(mates)];
    const others = picked.map((m) => any(byRarity[m.rarity].filter((c) => c.franchiseId !== ur.franchiseId)));
    return [[ur, ...picked], [ur, ...others]];
  }, opts);
console.log(`Avec passif : ${pct(passiveMatch({}))} · sans passif (témoin) : ${pct(passiveMatch({ passive: false }))}`);

// 6. Avantage du premier joueur : équipes miroir, A commence.
console.log("\n6. Avantage du premier joueur (équipes miroir)");
const mirror: Record<string, string>[] = [];
for (const rarity of RARITIES) {
  const w = rate(() => {
    const t = four(rarity);
    return [t, t];
  });
  mirror.push({ rareté: rarity, "victoire de celui qui commence": pct(w) });
}
console.table(mirror);

// 7. Durée.
durations.sort((x, y) => x - y);
const mean = durations.reduce((s, d) => s + d, 0) / durations.length;
const p95 = durations[Math.floor(durations.length * 0.95)];
const over15 = durations.filter((d) => d > 15).length / durations.length;
console.log(`\n7. Durée sur ${durations.length} combats : moyenne ${mean.toFixed(1)} tours, p95 ${p95}, > 15 tours ${pct(over15)}, au plafond ${pct(timeouts / durations.length)}`);
console.log(`${flag(p95 <= 15)} 95 % des combats en 15 tours ou moins`);

await prisma.$disconnect();
}

main();
