// Calibre les archétypes de sorts des SSR et UR (src/lib/spells.ts, ARCH_MULT) : pour chaque archétype et chaque rareté, règle le
// multiplicateur par dichotomie jusqu'à ce que le sort pèse environ +TARGET points de victoire (même équipe avec et sans le sort,
// camps alternés, personnage tiré au hasard à chaque combat). Écrit /tmp/arch-mult.txt, à coller dans ARCH_MULT.
// Usage : npx tsx scripts/calibrate-archetypes.ts [--games 2500] [--target 0.04] [--seed 5] [--only veil,ward]

import { writeFileSync } from "node:fs";
import type { Rarity } from "../src/generated/prisma/enums";
import { battle, type BattleCard, type Random } from "../src/lib/battle";
import { prisma } from "../src/lib/db";
import { ARCHETYPES, CHARACTER_SPELLS, ARCH_SPELLS, type Arch, type CharacterSpell } from "../src/lib/spells";

const arg = (name: string, d: number) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? d : Number(process.argv[i + 1]);
};
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1].split(",") : null;
const GAMES = arg("--games", 2500), TARGET = arg("--target", 0.04);
function seeded(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = seeded(arg("--seed", 5));
const any = <T>(l: T[]) => l[Math.floor(rng() * l.length)];

async function main() {
  const rows = await prisma.character.findMany({
    where: { disabled: false, rarity: { in: ["SSR", "UR"] } },
    select: { id: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } },
  });
  const pool: BattleCard[] = rows.map((r) => ({ characterId: r.id, rarity: r.rarity, type: r.type, attack: r.attack, defense: r.defense, power: r.power, franchiseId: r.mainMedia?.franchiseId ?? r.mainMediaId }));
  const by = (r: Rarity) => pool.filter((c) => c.rarity === r);
  /** Poids d'un archétype au multiplicateur m : victoires de l'équipe avec le sort moins 50 % */
  const weight = (arch: Arch, rarity: "SSR" | "UR", m: number) => {
    const d = ARCHETYPES[arch];
    const spell: CharacterSpell = { name: arch, target: d.target, effects: d.effects(m) };
    let w = 0;
    for (let g = 0; g < GAMES; g++) {
      const c = any(by(rarity));
      const mates = [0, 1, 2].map(() => ({ ...any(by(rarity)), noSpell: true }));
      const withSpell = [{ ...c, spell }, ...mates], without = [{ ...c, noSpell: true }, ...mates.map((x) => ({ ...x }))];
      const swap = g % 2 === 1;
      const r = swap ? battle(without, withSpell, rng) : battle(withSpell, without, rng);
      const win = swap ? r.winner === "B" : r.winner === "A";
      w += win ? 1 : r.winner === null ? 0.5 : 0;
    }
    return w / GAMES - 0.5;
  };

  const out: Record<string, { SSR: number; UR: number }> = {};
  for (const arch of (Object.keys(ARCHETYPES) as Arch[]).filter((a) => !ONLY || ONLY.includes(a))) {
    out[arch] = { SSR: 0, UR: 0 };
    for (const rarity of ["SSR", "UR"] as const) {
      const rev = arch === "revive";
      let lo = rev ? 0.1 : 0.05, hi = rev ? 1 : 3.5;
      for (let i = 0; i < 7; i++) {
        const mid = +((lo + hi) / 2).toFixed(2);
        if (weight(arch, rarity, mid) > TARGET) hi = mid; else lo = mid;
      }
      const v = +((lo + hi) / 2).toFixed(2);
      out[arch][rarity] = v;
      const end = weight(arch, rarity, v);
      console.log(`${arch.padEnd(8)} ${rarity.padEnd(3)} ${rev ? "PV" : "mult"} ${String(v).padEnd(5)} → ${(end * 100).toFixed(1).padStart(5)} pts${v <= 0.11 || v >= (rev ? 0.99 : 3.49) ? "  ⚠ bord" : ""}`);
    }
  }
  const used = new Set(Object.values(ARCH_SPELLS).map((x) => x[0]));
  console.log(`\nArchétypes utilisés : ${used.size}/${Object.keys(ARCHETYPES).length} ; sorts écrits à la main : ${Object.keys(CHARACTER_SPELLS).length}`);
  writeFileSync("/tmp/arch-mult.txt", Object.entries(out).map(([k, v]) => `  ${k}: { SSR: ${v.SSR}, UR: ${v.UR} },`).join("\n"));
  console.log("Écrit : /tmp/arch-mult.txt");
}
main().finally(() => prisma.$disconnect());
