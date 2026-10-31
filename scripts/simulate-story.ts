// Simulation du mode histoire (docs/specs/pvm.md) : taux de victoire d'équipes types contre les 15 combats d'un univers.
// Ennemis : sorts du personnage, stats = moyenne de sa rareté × échelle du niveau ; boss = bonus de stats.
// Usage : npx tsx scripts/simulate-story.ts [--games 2000] [--seed 42] [--lo 0.3] [--hi 1.0] [--boss 1.25]

import type { Rarity } from "../src/generated/prisma/enums";
import { battle, type BattleCard, type Random, type Weapon } from "../src/lib/battle";
import { prisma } from "../src/lib/db";

const arg = (name: string, d: number) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? d : Number(process.argv[i + 1]);
};
const GAMES = arg("--games", 2000);
const LO = arg("--lo", 0.3), HI = arg("--hi", 1.0), BOSS = arg("--boss", 1.25);

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
const RARITIES: Rarity[] = ["N", "R", "SR", "SSR", "UR"];

/** Rareté des 4 ennemis par niveau (le dernier est le boss aux niveaux 5, 10, 15) : montée progressive, pas par paliers. */
const MIX: Rarity[][] = [
  ["N", "N", "N", "R"], ["N", "N", "R", "R"], ["N", "R", "R", "R"], ["R", "R", "R", "SR"], ["R", "R", "SR", "SR"],
  ["R", "SR", "SR", "SR"], ["R", "SR", "SR", "SR"], ["SR", "SR", "SR", "SSR"], ["SR", "SR", "SSR", "SSR"], ["SR", "SSR", "SSR", "SSR"],
  ["SR", "SSR", "SSR", "SSR"], ["SSR", "SSR", "SSR", "SSR"], ["SSR", "SSR", "SSR", "SSR"], ["SSR", "SSR", "SSR", "UR"], ["SSR", "SSR", "SSR", "UR"],
];
const scale = (level: number) => LO + ((HI - LO) * (level - 1)) / 14;

async function main() {
  const rows = await prisma.character.findMany({
    where: { disabled: false },
    select: { id: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } },
  });
  const pool: BattleCard[] = rows.map((r) => ({
    characterId: r.id, rarity: r.rarity, type: r.type, attack: r.attack, defense: r.defense, power: r.power,
    franchiseId: r.mainMedia?.franchiseId ?? r.mainMediaId,
  }));
  const by = Object.fromEntries(RARITIES.map((r) => [r, pool.filter((c) => c.rarity === r)])) as Record<Rarity, BattleCard[]>;
  const mean = Object.fromEntries(RARITIES.map((r) => [r, { a: by[r].reduce((s, c) => s + c.attack, 0) / by[r].length, d: by[r].reduce((s, c) => s + c.defense, 0) / by[r].length }]));

  const enemy = (level: number): BattleCard[] =>
    MIX[level - 1].map((r, i) => {
      const boss = level % 5 === 0 && i === 3;
      const k = scale(level) * (boss ? BOSS : 1);
      const base = any(by[r]);
      return { ...base, attack: Math.round(mean[r].a * k), defense: Math.round(mean[r].d * k), stars: 0, weapon: null };
    });

  const weapon: Weapon = { stat: 0.05, passive: null };
  const mk = (rarities: Rarity[], stars: number, w = false) => () =>
    rarities.map((r) => ({ ...any(by[r]), stars, weapon: w && stars === 5 ? weapon : null }));
  const teams: Record<string, () => BattleCard[]> = {
    "4 R": mk(["R", "R", "R", "R"], 0),
    "4 SR": mk(["SR", "SR", "SR", "SR"], 0),
    "SSR+3 SR": mk(["SSR", "SR", "SR", "SR"], 0),
    "4 SSR": mk(["SSR", "SSR", "SSR", "SSR"], 0),
    "4 SSR 3★": mk(["SSR", "SSR", "SSR", "SSR"], 3),
    "UR+3 SSR": mk(["UR", "SSR", "SSR", "SSR"], 0),
    "4 UR": mk(["UR", "UR", "UR", "UR"], 0),
    "4 SSR 5★ arme": mk(["SSR", "SSR", "SSR", "SSR"], 5, true),
    "2 UR+2 SSR": mk(["UR", "UR", "SSR", "SSR"], 0),
    "UR+3 SSR 5★": mk(["UR", "SSR", "SSR", "SSR"], 5, true),
  };

  console.log(`échelle ${LO} → ${HI}, bonus boss × ${BOSS}, ${GAMES} combats par case, taux de victoire (%) par niveau\n`);
  console.log("équipe".padEnd(14) + MIX.map((_, i) => String(i + 1).padStart(4)).join(""));
  for (const [name, make] of Object.entries(teams)) {
    let line = name.padEnd(14);
    for (let lv = 1; lv <= 15; lv++) {
      let w = 0;
      for (let g = 0; g < GAMES; g++) {
        const r = battle(make(), enemy(lv), rng);
        w += r.winner === "A" ? 1 : r.winner === null ? 0.5 : 0;
      }
      line += String(Math.round((w / GAMES) * 100)).padStart(4);
    }
    console.log(line);
  }
}
main().finally(() => prisma.$disconnect());
