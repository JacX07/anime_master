// Simulation du mode histoire (docs/specs/pvm.md) : taux de victoire d'équipes types contre les 15 univers (ennemis réels de
// `storyEnemies`, y compris la difficulté de l'univers). Une ligne par équipe, une colonne par univers : combats 1, 8 et 15 (boss final).
// Usage : npx tsx scripts/simulate-story.ts [--games 300] [--seed 42] [--max 1.5]   (--max : difficulté du dernier univers)

import type { Rarity } from "../src/generated/prisma/enums";
import { battle, type BattleCard, type Random, type Weapon } from "../src/lib/battle";
import { storyEnemies } from "../src/lib/battles";
import { prisma } from "../src/lib/db";
import { UNIVERSES } from "../src/lib/story";

const arg = (name: string, d: number) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? d : Number(process.argv[i + 1]);
};
const GAMES = arg("--games", 300);
const MAX = arg("--max", UNIVERSES[14].difficulty);
UNIVERSES.forEach((u, i) => (u.difficulty = 1 + ((MAX - 1) * i) / (UNIVERSES.length - 1)));

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

  const weapon: Weapon = { stat: 0.05, passive: null };
  const mk = (rarities: Rarity[], stars: number, w = false) => () =>
    rarities.map((r) => ({ ...any(by[r]), stars, weapon: w && stars === 5 ? weapon : null }));
  const teams: Record<string, () => BattleCard[]> = {
    "4 R": mk(["R", "R", "R", "R"], 0),
    "4 SR": mk(["SR", "SR", "SR", "SR"], 0),
    "4 SSR": mk(["SSR", "SSR", "SSR", "SSR"], 0),
    "4 SSR 3★": mk(["SSR", "SSR", "SSR", "SSR"], 3),
    "4 SSR 5★ arme": mk(["SSR", "SSR", "SSR", "SSR"], 5, true),
    "UR+3 SSR 3★": mk(["UR", "SSR", "SSR", "SSR"], 3),
    "UR+3 SSR 5★": mk(["UR", "SSR", "SSR", "SSR"], 5, true),
    "4 UR": mk(["UR", "UR", "UR", "UR"], 0),
    "4 UR 3★": mk(["UR", "UR", "UR", "UR"], 3),
    "4 UR 5★ arme": mk(["UR", "UR", "UR", "UR"], 5, true),
  };
  const LEVELS_SHOWN = [1, 8, 15];
  const enemies = new Map<string, BattleCard[]>();
  for (const u of UNIVERSES) for (const lv of LEVELS_SHOWN) enemies.set(`${u.key}:${lv}`, await storyEnemies(u, lv));

  console.log(`Difficulté du dernier univers ×${MAX.toFixed(2)}, ${GAMES} combats par case, victoire (%) aux combats 1 / 8 / 15 (boss final)\n`);
  console.log("équipe".padEnd(15) + UNIVERSES.map((u) => String(u.rank).padStart(3 * 3 + 1)).join(""));
  console.log(" ".repeat(15) + UNIVERSES.map(() => "   1  8 15").join(""));
  for (const [name, make] of Object.entries(teams)) {
    let line = name.padEnd(15);
    for (const u of UNIVERSES) {
      line += " ";
      for (const lv of LEVELS_SHOWN) {
        let w = 0;
        for (let g = 0; g < GAMES; g++) {
          const r = battle(make(), enemies.get(`${u.key}:${lv}`)!.map((c) => ({ ...c })), rng);
          w += r.winner === "A" ? 1 : r.winner === null ? 0.5 : 0;
        }
        line += String(Math.round((w / GAMES) * 100)).padStart(3);
      }
    }
    console.log(line);
  }
  console.log("\nUnivers : " + UNIVERSES.map((u) => `${u.rank}=${u.name}${u.kind === "collision" ? " (collision)" : ""}`).join(" · "));
}
main().finally(() => prisma.$disconnect());
