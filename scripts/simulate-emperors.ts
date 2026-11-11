// Simulation du Défi des empereurs : taux de victoire d'équipes types par empereur et par difficulté, ennemis réels (`emperorFoes`).
// Usage : npx tsx scripts/simulate-emperors.ts [--games 150] [--seed 42] [--hardcore]
// Équipement supposé : « moyen » = moyenne de 4 pièces UR non améliorées ; « fort » = pièces améliorées (hypothèse, à recaler sur le jeu réel).

import type { Rarity } from "../src/generated/prisma/enums";
import { battle, seededRandom, type BattleCard, type Weapon } from "../src/lib/battle";
import { emperorFoes } from "../src/lib/battles";
import { prisma } from "../src/lib/db";
import { DIFFICULTIES } from "../src/lib/raid";
import { EMPEROR_TUNING, EMPERORS, HARDCORE_KEY, parseEmperorKey } from "../src/lib/emperors";
import { WEAPON_STAT } from "../src/lib/weapons";

const arg = (name: string, d: number) => { const i = process.argv.indexOf(name); return i < 0 ? d : Number(process.argv[i + 1]); };
const GAMES = arg("--games", 150);
// Réglages à essayer sans toucher au code : --scale 2,2.6,3.4 --crew1 0.9 --crew2 1 --boss 1.76 --teams fort,moyen
const list = (name: string) => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1].split(","); };
const scales = list("--scale");
if (scales) for (const [i, k] of ["normal", "difficile", "cauchemar"].entries()) EMPEROR_TUNING.scale[k] = Number(scales[i]);
EMPEROR_TUNING.crew1 = arg("--crew1", EMPEROR_TUNING.crew1); EMPEROR_TUNING.crew2 = arg("--crew2", EMPEROR_TUNING.crew2); EMPEROR_TUNING.boss = arg("--boss", EMPEROR_TUNING.boss); EMPEROR_TUNING.hardcore = arg("--hardcore-scale", EMPEROR_TUNING.hardcore);
const per = list("--per");
if (per) for (const [i, k] of ["shanks", "big-mom", "kaido", "barbe-blanche"].entries()) EMPEROR_TUNING.emperor[k] = Number(per[i]);
const only = list("--teams"); const bosses = list("--bosses");
const rng = seededRandom(arg("--seed", 42));
const any = <T>(l: T[]) => l[Math.floor(rng() * l.length)];

const GEAR_MID = { attack: 0.18, defense: 0.08, hp: 0.07, speed: 6, crit: 0.21, critDamage: 0.14, dodge: 0, flatAttack: 75, flatDefense: 58, flatHp: 320 };
const GEAR_MAX = { attack: 0.35, defense: 0.25, hp: 0.25, speed: 16, crit: 0.33, critDamage: 0.6, dodge: 0, flatAttack: 300, flatDefense: 220, flatHp: 1300 };

async function main() {
  const excluded = new Set([...EMPERORS.map((e) => e.characterId), ...EMPERORS.flatMap((e) => e.crew.flat())]);
  const rows = await prisma.character.findMany({ where: { disabled: false }, select: { id: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } } });
  const pool = rows.filter((r) => !excluded.has(r.id)).map((r): BattleCard => ({ characterId: r.id, rarity: r.rarity, type: r.type, attack: r.attack, defense: r.defense, power: r.power, speed: 100, franchiseId: r.mainMedia?.franchiseId ?? r.mainMediaId }));
  const by = (r: Rarity) => pool.filter((c) => c.rarity === r);
  const weapon: Weapon = { stat: WEAPON_STAT, passive: null };
  const mk = (rarities: Rarity[], gear: typeof GEAR_MID | null) => (): BattleCard[] =>
    rarities.map((r) => ({ ...any(by(r)), stars: 5, weapon, ...(gear ? { artifactStats: gear } : {}) }));
  const teams: Record<string, () => BattleCard[]> = {
    "4 SSR 5★ arme": mk(["SSR", "SSR", "SSR", "SSR"], null),
    "4 UR 5★ arme": mk(["UR", "UR", "UR", "UR"], null),
    "4 UR 5★ + équip. moyen": mk(["UR", "UR", "UR", "UR"], GEAR_MID),
    "4 UR 5★ + équip. fort": mk(["UR", "UR", "UR", "UR"], GEAR_MAX),
  };
  const targets = [...EMPERORS.map((e) => e.key).filter((k) => !bosses || bosses.includes(k)), ...(process.argv.includes("--hardcore") ? [HARDCORE_KEY] : [])];
  console.log(`${GAMES} combats par case : victoires %, tours médians (vague 3 atteinte %)\n`);
  for (const boss of targets) {
    console.log(`── ${boss}`);
    console.log("équipe".padEnd(26) + DIFFICULTIES.map((d) => d.name.padStart(26)).join(""));
    for (const [name, make] of Object.entries(teams).filter(([n]) => !only || only.some((o) => n.includes(o)))) {
      const cells: string[] = [];
      for (const d of DIFFICULTIES) {
        const target = parseEmperorKey(`emperor:${boss}:${d.key}`)!;
        const foes = await emperorFoes(target);
        let wins = 0, reached = 0;
        const rounds: number[] = [];
        for (let i = 0; i < GAMES; i++) {
          const r = battle(make(), foes.first, seededRandom(Math.floor(rng() * 2 ** 31)), { gauge: true, timeoutLoser: "A", ...(foes.waves.length ? { waves: foes.waves, maxRounds: 90 } : {}) });
          if (r.winner === "A") wins++;
          if (r.log.filter((e) => e.kind === "wave").length >= 2) reached++;
          rounds.push(r.rounds);
        }
        rounds.sort((a, b) => a - b);
        cells.push(`${Math.round((wins / GAMES) * 100)} % (t${rounds[Math.floor(rounds.length / 2)]}, ${Math.round((reached / GAMES) * 100)} %)`.padStart(26));
      }
      console.log(name.padEnd(26) + cells.join(""));
    }
    console.log();
  }
  await prisma.$disconnect();
}
main();
