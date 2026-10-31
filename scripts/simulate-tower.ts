// Simulation de la Tour (docs/specs/pvm.md) : taux de victoire d'équipes types (personnages tirés au hasard dans leur rareté,
// donc stats moyennes) contre les étages. Ennemis : même formule que le serveur (src/lib/tower.ts).
// Usage : npm run simulate:tower -- [--games 200] [--seed 42] [--step 25] [--max 500]

import type { Rarity } from "../src/generated/prisma/enums";
import { battle, type BattleCard, type Random, type Weapon } from "../src/lib/battle";
import { prisma } from "../src/lib/db";
import { floorRarities, floorScale, MAX_FLOOR } from "../src/lib/tower";

const arg = (name: string, d: number) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? d : Number(process.argv[i + 1]);
};
const GAMES = arg("--games", 200), STEP = arg("--step", 25), MAX = arg("--max", MAX_FLOOR);

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

  const enemy = (floor: number): BattleCard[] =>
    floorRarities(floor).map((r) => ({
      ...any(by[r]), attack: Math.round(mean[r].a * floorScale(floor)), defense: Math.round(mean[r].d * floorScale(floor)), stars: 0, weapon: null,
    }));

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
    "UR+3 SSR 5★": mk(["UR", "SSR", "SSR", "SSR"], 5, true),
    "4 UR 5★ arme": mk(["UR", "UR", "UR", "UR"], 5, true),
  };

  const floors = [1, ...Array.from({ length: MAX / STEP }, (_, i) => (i + 1) * STEP)];
  console.log(`${GAMES} combats par case, taux de victoire (%) par étage\n`);
  console.log("équipe".padEnd(15) + floors.map((f) => String(f).padStart(4)).join("") + "   50 % à l'étage");
  for (const [name, make] of Object.entries(teams)) {
    let line = name.padEnd(15), half = 0, lost = false;
    for (const f of floors) {
      let w = 0;
      for (let g = 0; g < GAMES; g++) {
        const r = battle(make(), enemy(f), rng);
        w += r.winner === "A" ? 1 : r.winner === null ? 0.5 : 0;
      }
      const rate = w / GAMES;
      if (!lost && rate >= 0.5) half = f;
      else lost = true;
      line += String(Math.round(rate * 100)).padStart(4);
    }
    console.log(line + `   ${half >= floors[floors.length - 1] ? "500+" : half}`);
  }
}
main().finally(() => prisma.$disconnect());
