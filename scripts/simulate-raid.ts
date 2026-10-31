// Simulation du raid (docs/specs/pvm.md) : part de PV adverses retirée et taux de victoire d'équipes types, par difficulté.
// Ennemis : 1 boss UR géant + 3 sbires SSR ; stats = moyenne de la rareté × échelle de la difficulté, boss × bonus.
// Usage : npx tsx scripts/simulate-raid.ts [--games 1000] [--seed 42] [--boss 1.6] [--normal 0.85] [--hard 1.15] [--night 1.5]

import type { Rarity } from "../src/generated/prisma/enums";
import { battle, type BattleCard, type Random, type Weapon } from "../src/lib/battle";
import { prisma } from "../src/lib/db";

const arg = (name: string, d: number) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? d : Number(process.argv[i + 1]);
};
const GAMES = arg("--games", 1000), BOSS = arg("--boss", 1.6);
const DIFFS: [string, number][] = [["Normal", arg("--normal", 0.85)], ["Difficile", arg("--hard", 1.15)], ["Cauchemar", arg("--night", 1.5)]];

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
  const enemy = (scale: number): BattleCard[] =>
    (["SSR", "SSR", "SSR", "UR"] as Rarity[]).map((r, i) => {
      const k = scale * (i === 3 ? BOSS : 1);
      return { ...any(by[r]), attack: Math.round(mean[r].a * k), defense: Math.round(mean[r].d * k), stars: 0, weapon: null };
    });
  const weapon: Weapon = { stat: 0.05, passive: null };
  const mk = (rarities: Rarity[], stars: number, w = false) => () =>
    rarities.map((r) => ({ ...any(by[r]), stars, weapon: w && stars === 5 ? weapon : null }));
  const teams: Record<string, () => BattleCard[]> = {
    "4 SR": mk(["SR", "SR", "SR", "SR"], 0),
    "4 SSR": mk(["SSR", "SSR", "SSR", "SSR"], 0),
    "4 SSR 3★": mk(["SSR", "SSR", "SSR", "SSR"], 3),
    "UR+3 SSR 3★": mk(["UR", "SSR", "SSR", "SSR"], 3),
    "4 SSR 5★ arme": mk(["SSR", "SSR", "SSR", "SSR"], 5, true),
    "4 UR": mk(["UR", "UR", "UR", "UR"], 0),
    "4 UR 5★ arme": mk(["UR", "UR", "UR", "UR"], 5, true),
  };
  console.log(`boss × ${BOSS}, ${GAMES} combats par case : part de PV adverses retirée en moyenne (victoire %)\n`);
  console.log("équipe".padEnd(16) + DIFFS.map(([n]) => n.padStart(16)).join(""));
  for (const [name, make] of Object.entries(teams)) {
    let line = name.padEnd(16);
    for (const [, scale] of DIFFS) {
      let dmg = 0, wins = 0;
      for (let g = 0; g < GAMES; g++) {
        const r = battle(make(), enemy(scale), rng);
        const end = r.log[r.log.length - 1];
        dmg += end.kind === "end" ? 1 - end.hpLeft.B : 0;
        if (r.winner === "A") wins++;
      }
      line += `${Math.round((dmg / GAMES) * 100)} % (${Math.round((wins / GAMES) * 100)})`.padStart(16);
    }
    console.log(line);
  }
}
main().finally(() => prisma.$disconnect());
