// Calibre la difficulté de chaque univers de l'histoire (docs/specs/pvm.md) : par dichotomie, jusqu'à ce qu'une équipe de référence
// (1 UR + 3 SSR, 5 étoiles, arme) batte le boss final avec un taux cible qui descend de 95 % (univers 1) à 20 % (univers 15).
// Écrit les valeurs dans /tmp/story-difficulty.txt, à reporter dans `DIFFICULTY` de src/lib/story.ts.
// Usage : npx tsx scripts/calibrate-story.ts [--games 400] [--first 0.95] [--last 0.2]

import { writeFileSync } from "node:fs";
import type { Rarity } from "../src/generated/prisma/enums";
import { battle, type BattleCard, type Random, type Weapon } from "../src/lib/battle";
import { storyEnemies } from "../src/lib/battles";
import { prisma } from "../src/lib/db";
import { UNIVERSES } from "../src/lib/story";

const arg = (name: string, d: number) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? d : Number(process.argv[i + 1]);
};
const GAMES = arg("--games", 400), FIRST = arg("--first", 0.95), LAST = arg("--last", 0.2);
function seeded(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = seeded(11);
const any = <T>(l: T[]) => l[Math.floor(rng() * l.length)];

async function main() {
  const rows = await prisma.character.findMany({
    where: { disabled: false, rarity: { in: ["SSR", "UR"] } },
    select: { id: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } },
  });
  const pool: BattleCard[] = rows.map((r) => ({ characterId: r.id, rarity: r.rarity, type: r.type, attack: r.attack, defense: r.defense, power: r.power, franchiseId: r.mainMedia?.franchiseId ?? r.mainMediaId }));
  const by = (r: Rarity) => pool.filter((c) => c.rarity === r);
  const weapon: Weapon = { stat: 0.05, passive: null };
  const team = () => ["UR", "SSR", "SSR", "SSR"].map((r) => ({ ...any(by(r as Rarity)), stars: 5, weapon }));

  const out: number[] = [];
  for (const u of UNIVERSES) {
    const target = FIRST + ((LAST - FIRST) * (u.rank - 1)) / (UNIVERSES.length - 1);
    let lo = 0.6, hi = 3;
    for (let i = 0; i < 9; i++) {
      u.difficulty = (lo + hi) / 2;
      const enemy = await storyEnemies(u, 15);
      let w = 0;
      for (let g = 0; g < GAMES; g++) {
        const r = battle(team(), enemy.map((c) => ({ ...c })), rng);
        w += r.winner === "A" ? 1 : r.winner === null ? 0.5 : 0;
      }
      if (w / GAMES > target) lo = u.difficulty; else hi = u.difficulty;
    }
    u.difficulty = +((lo + hi) / 2).toFixed(2);
    out.push(u.difficulty);
    console.log(`${String(u.rank).padStart(2)}. ${u.name.padEnd(28)} cible ${(target * 100).toFixed(0).padStart(3)} %  difficulté ×${u.difficulty}`);
  }
  writeFileSync("/tmp/story-difficulty.txt", `[${out.join(", ")}]`);
  console.log("Écrit : /tmp/story-difficulty.txt");
}
main().finally(() => prisma.$disconnect());
