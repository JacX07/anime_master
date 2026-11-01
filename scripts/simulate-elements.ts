// Mesure l'effet d'élément du sort secondaire (attack-element.ts) : chaque perso élémentaire, dans une équipe de sa rareté,
// contre la même équipe sans l'effet (graines appariées, camp de départ inversé, ordonnanceur à jauge).
// Usage : npx tsx scripts/simulate-elements.ts [--games 300] [--seed 42]
import type { Rarity } from "../src/generated/prisma/enums";
import { battle, seededRandom, type BattleCard, type BattleResult, type Random } from "../src/lib/battle";
import { attackElement, type AttackElement } from "../src/lib/attack-element";
import { prisma } from "../src/lib/db";

const arg = (name: string, fallback: number) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : Number(process.argv[index + 1]);
};
const GAMES = arg("--games", 300);
const SEED = arg("--seed", 42);
const SCORE = (r: BattleResult) => (r.winner === "A" ? 1 : r.winner === null ? 0.5 : 0);
const pick = <T>(list: T[], rng: Random) => list[Math.floor(rng() * list.length)];
const seedFor = (...parts: number[]) => parts.reduce((v, p) => (Math.imul(v ^ p, 1664525) + 1013904223) | 0, SEED | 0) >>> 0;
const meanCI = (values: number[]) => {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, values.length - 1);
  return { mean, ci: 1.96 * Math.sqrt(variance / values.length) };
};
const pp = (n: number) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)} pp`;

/** Écart de score (−1 à 1) entre l'équipe avec et sans l'effet, sur deux combats (chaque camp commence une fois). */
function paired(team: BattleCard[], foes: BattleCard[], seed: number) {
  let diff = 0;
  const plain = team.map((c) => ({ ...c, noElement: true }));
  for (const startingSide of ["A", "B"] as const) {
    diff += SCORE(battle(team, foes, seededRandom(seed), { gauge: true, startingSide }));
    diff -= SCORE(battle(plain, foes, seededRandom(seed), { gauge: true, startingSide }));
  }
  return diff / 2;
}

async function main() {
  const rows = await prisma.character.findMany({
    where: { disabled: false, rarity: { in: ["SSR", "UR"] } },
    select: { id: true, name: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } },
  });
  const cards = rows.map((r) => ({ name: r.name, card: { characterId: r.id, rarity: r.rarity, type: r.type, attack: r.attack, defense: r.defense, power: r.power, franchiseId: r.mainMedia?.franchiseId ?? r.mainMediaId } satisfies BattleCard }));
  // Coéquipiers et adversaires sans élément, pour isoler l'effet du perso testé
  const neutral = (rarity: Rarity) => cards.filter((c) => c.card.rarity === rarity && !attackElement(c.card.characterId)).map((c) => c.card);
  const elemental = cards.filter((c) => attackElement(c.card.characterId));

  const perElement = new Map<AttackElement, number[]>();
  const lines: string[] = [];
  for (const { name, card } of elemental) {
    const element = attackElement(card.characterId)!;
    const pool = neutral(card.rarity);
    const diffs: number[] = [];
    for (let g = 0; g < GAMES; g++) {
      const rng = seededRandom(seedFor(card.characterId, g, 7));
      const team = [card, pick(pool, rng), pick(pool, rng), pick(pool, rng)];
      const foes = [0, 1, 2, 3].map(() => pick(pool, rng));
      diffs.push(paired(team, foes, seedFor(card.characterId, g, 29)));
    }
    const { mean, ci } = meanCI(diffs);
    perElement.set(element, [...(perElement.get(element) ?? []), ...diffs]);
    lines.push(`${element.padEnd(6)} ${card.rarity.padEnd(3)} ${name.padEnd(24)} ${pp(mean).padStart(9)} ±${(ci * 100).toFixed(1)}`);
  }
  console.log(lines.sort().join("\n"));
  console.log("\nMoyenne par élément (victoires en plus contre la même équipe sans effet) :");
  for (const [element, diffs] of perElement) { const { mean, ci } = meanCI(diffs); console.log(`  ${element.padEnd(6)} ${pp(mean).padStart(9)} ±${(ci * 100).toFixed(1)}`); }

  // Combo eau + foudre dans la même équipe
  const water = elemental.filter((c) => attackElement(c.card.characterId) === "eau").map((c) => c.card);
  const bolt = elemental.filter((c) => attackElement(c.card.characterId) === "foudre").map((c) => c.card);
  const diffs: number[] = [];
  for (let g = 0; g < GAMES * 2; g++) {
    const rng = seededRandom(seedFor(g, 99));
    const w = pick(water, rng), b = pick(bolt, rng), pool = neutral("SSR");
    diffs.push(paired([w, b, pick(pool, rng), pick(pool, rng)], [0, 1, 2, 3].map(() => pick(pool, rng)), seedFor(g, 101)));
  }
  const combo = meanCI(diffs);
  console.log(`  eau + foudre dans la même équipe : ${pp(combo.mean)} ±${(combo.ci * 100).toFixed(1)}`);
  await prisma.$disconnect();
}
main().catch((error) => { console.error(error); process.exit(1); });
