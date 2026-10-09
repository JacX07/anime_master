// Simulation des taux de tirage (SPEC étape 2, §4 et §8).
// Usage : npm run simulate                          (10 000 paquets, hasard crypto)
//         npm run simulate -- --packs 50000 --seed 42   (reproductible)
//
// Compare les taux observés aux taux attendus *exacts*, garanties comprises. Les taux attendus
// sont recalculés ici indépendamment de src/lib/pull.ts, directement à partir des règles de la spec :
// énumération des 5⁵ paquets possibles + chaîne de Markov sur les compteurs de pity.

import type { Rarity } from "../src/generated/prisma/enums";
import { prisma } from "../src/lib/db";
import {
  CARDS_PER_PACK,
  FINISH_RATES,
  RARITY_RATES,
  SSR_PITY,
  UR_PITY,
  pickUniform,
  rollPack,
  secureRandom,
  type Finish,
  type PityState,
  type Random,
} from "../src/lib/pull";

const RARITIES = RARITY_RATES.map(([r]) => r);
const Z_LIMIT = 4; // écart toléré, en écarts-types

function option(name: string, fallback?: number): number | undefined {
  const i = process.argv.indexOf(name);
  if (i < 0) return fallback;
  const n = Number(process.argv[i + 1]);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${name} doit être un entier ≥ 1`);
  return n;
}

/** Générateur à graine (mulberry32), pour des simulations reproductibles. */
function seeded(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Taux attendus exacts ----------

type Counts = Record<Rarity, number>;
const zeroCounts = (): Counts => ({ N: 0, R: 0, SR: 0, SSR: 0, UR: 0 });
const RATE = Object.fromEntries(RARITY_RATES) as Record<Rarity, number>;

/** Issue moyenne d'un paquet selon les pity actifs, regroupée par effet sur les compteurs. */
interface ModeOutcome {
  pUR: number; // le paquet contient un UR → les deux compteurs repartent à 0
  pSSR: number; // SSR mais pas d'UR → seul packsSinceSSR repart à 0
  pNone: number; // ni l'un ni l'autre
  counts: Counts; // nombre moyen de cartes par rareté
  pPitySSR: number;
  pPityUR: number;
}

function modeOutcome(urPity: boolean, ssrPity: boolean): ModeOutcome {
  const out: ModeOutcome = { pUR: 0, pSSR: 0, pNone: 0, counts: zeroCounts(), pPitySSR: 0, pPityUR: 0 };
  const among = (set: Rarity[]) => {
    const total = set.reduce((s, r) => s + RATE[r], 0);
    return set.map((r) => [r, RATE[r] / total] as const);
  };

  const record = (pack: Rarity[], p: number, pity: "NONE" | "SSR" | "UR") => {
    // Règle 3 : carte garantie R ou mieux
    if (!pack.some((r) => r !== "N")) {
      for (const [r, q] of among(["R", "SR", "SSR", "UR"])) record([...pack.slice(0, -1), r], p * q, pity);
      return;
    }
    for (const r of pack) out.counts[r] += p;
    if (pack.includes("UR")) out.pUR += p;
    else if (pack.includes("SSR")) out.pSSR += p;
    else out.pNone += p;
    if (pity === "SSR") out.pPitySSR += p;
    if (pity === "UR") out.pPityUR += p;
  };

  for (let code = 0; code < RARITIES.length ** CARDS_PER_PACK; code++) {
    const pack: Rarity[] = [];
    let p = 1;
    for (let i = 0, c = code; i < CARDS_PER_PACK; i++, c = Math.floor(c / RARITIES.length)) {
      const r = RARITIES[c % RARITIES.length];
      pack.push(r);
      p *= RATE[r];
    }
    // Règle 1 : pity UR
    if (urPity && !pack.includes("UR")) {
      record([...pack.slice(0, -1), "UR"], p, "UR");
      continue;
    }
    // Règle 2 : pity SSR
    if (ssrPity && !pack.includes("SSR") && !pack.includes("UR")) {
      for (const [r, q] of among(["SSR", "UR"])) record([...pack.slice(0, -1), r], p * q, "SSR");
      continue;
    }
    record(pack, p, "NONE");
  }
  return out;
}

/** Espérances sur `packs` paquets ouverts à la suite par un nouveau joueur. */
function expected(packs: number) {
  const modes = new Map<string, ModeOutcome>();
  const mode = (s: number, u: number) => {
    const key = `${u >= UR_PITY - 1}/${s >= SSR_PITY - 1}`;
    if (!modes.has(key)) modes.set(key, modeOutcome(u >= UR_PITY - 1, s >= SSR_PITY - 1));
    return modes.get(key)!;
  };

  // dist[s][u] : probabilité d'être dans l'état (packsSinceSSR = s, packsSinceUR = u)
  const fresh = () => Array.from({ length: SSR_PITY }, () => new Float64Array(UR_PITY));
  let dist = fresh();
  dist[0][0] = 1;
  const counts = zeroCounts();
  let pitySSR = 0;
  let pityUR = 0;

  for (let t = 0; t < packs; t++) {
    const next = fresh();
    for (let s = 0; s < SSR_PITY; s++) {
      for (let u = s; u < UR_PITY; u++) {
        const p = dist[s][u];
        if (p === 0) continue;
        const m = mode(s, u);
        for (const r of RARITIES) counts[r] += p * m.counts[r];
        pitySSR += p * m.pPitySSR;
        pityUR += p * m.pPityUR;
        next[0][0] += p * m.pUR;
        if (m.pSSR > 0) next[0][u + 1] += p * m.pSSR;
        if (m.pNone > 0) next[s + 1][u + 1] += p * m.pNone;
      }
    }
    dist = next;
  }
  return { counts, pitySSR, pityUR };
}

// ---------- Simulation ----------

const pct = (x: number) => `${(x * 100).toFixed(2)} %`;
const verdict = (ok: boolean) => (ok ? "OK" : "❌ HORS TOLÉRANCE");

async function main() {
  const packs = option("--packs", 10_000)!;
  const players = option("--players", 2_000)!;
  const seed = option("--seed");
  const rng = seed !== undefined ? seeded(seed) : secureRandom;

  const characters = await prisma.character.findMany({
    where: { disabled: false },
    select: { id: true, rarity: true },
  });
  const pools = new Map<Rarity, number[]>(RARITIES.map((r) => [r, []]));
  for (const c of characters) pools.get(c.rarity)!.push(c.id);

  console.log(
    `Simulation : ${packs} paquets ouverts à la suite par un nouveau joueur` +
      (seed !== undefined ? ` (graine ${seed})` : " (hasard crypto)") +
      ` — ${characters.length} personnages en base\n`,
  );

  const rarityCount = zeroCounts();
  const finishCount: Record<Finish, number> = { NORMAL: 0, HOLO: 0, GOLD: 0 };
  const pulled = new Map<number, number>();
  let state: PityState = { packsSinceSSR: 0, packsSinceUR: 0 };
  let pitySSR = 0;
  let pityUR = 0;
  let packsWithoutR = 0;
  let longestWithoutSSR = 0;
  let longestWithoutUR = 0;
  let counterErrors = 0;

  for (let i = 0; i < packs; i++) {
    const roll = rollPack(state, rng);
    const rarities = roll.cards.map((c) => c.rarity);
    for (const card of roll.cards) {
      rarityCount[card.rarity]++;
      finishCount[card.finish]++;
      const id = pickUniform(pools.get(card.rarity)!, rng);
      pulled.set(id, (pulled.get(id) ?? 0) + 1);
    }
    if (roll.pity === "SSR") pitySSR++;
    if (roll.pity === "UR") pityUR++;
    if (rarities.every((r) => r === "N")) packsWithoutR++;

    const hasSSR = rarities.includes("SSR") || rarities.includes("UR");
    const hasUR = rarities.includes("UR");
    const expectedNext = {
      packsSinceSSR: hasSSR ? 0 : state.packsSinceSSR + 1,
      packsSinceUR: hasUR ? 0 : state.packsSinceUR + 1,
    };
    if (
      roll.next.packsSinceSSR !== expectedNext.packsSinceSSR ||
      roll.next.packsSinceUR !== expectedNext.packsSinceUR
    ) {
      counterErrors++;
    }
    state = roll.next;
    longestWithoutSSR = Math.max(longestWithoutSSR, state.packsSinceSSR);
    longestWithoutUR = Math.max(longestWithoutUR, state.packsSinceUR);
  }

  const totalCards = packs * CARDS_PER_PACK;
  const exp = expected(packs);
  let allOk = true;

  console.log("Rareté   Obtenues   Observé    Attendu*   Taux de base   Écart");
  for (const r of RARITIES) {
    const e = exp.counts[r];
    const z = (rarityCount[r] - e) / Math.sqrt(e * (1 - e / totalCards));
    const ok = Math.abs(z) < Z_LIMIT;
    allOk &&= ok;
    console.log(
      `${r.padEnd(8)} ${String(rarityCount[r]).padStart(8)}   ${pct(rarityCount[r] / totalCards).padStart(8)}   ` +
        `${pct(e / totalCards).padStart(8)}   ${pct(RATE[r]).padStart(12)}   ${z >= 0 ? "+" : ""}${z.toFixed(1)}σ ${verdict(ok)}`,
    );
  }
  console.log("* attendu exact, carte garantie et pity compris\n");

  console.log("Finition  Obtenues   Observé    Attendu    Écart");
  for (const [f, rate] of FINISH_RATES) {
    const e = totalCards * rate;
    const z = (finishCount[f] - e) / Math.sqrt(e * (1 - rate));
    const ok = Math.abs(z) < Z_LIMIT;
    allOk &&= ok;
    console.log(
      `${f.padEnd(9)} ${String(finishCount[f]).padStart(8)}   ${pct(finishCount[f] / totalCards).padStart(8)}   ` +
        `${pct(rate).padStart(8)}   ${z >= 0 ? "+" : ""}${z.toFixed(1)}σ ${verdict(ok)}`,
    );
  }

  const checks: [string, boolean][] = [
    [`Paquets sans carte R ou mieux : ${packsWithoutR} (doit être 0)`, packsWithoutR === 0],
    [
      `Plus longue série sans SSR ou mieux : ${longestWithoutSSR} paquets (max ${SSR_PITY - 1})`,
      longestWithoutSSR <= SSR_PITY - 1,
    ],
    [`Plus longue série sans UR : ${longestWithoutUR} paquets (max ${UR_PITY - 1})`, longestWithoutUR <= UR_PITY - 1],
    [`Compteurs de pity incohérents : ${counterErrors} (doit être 0)`, counterErrors === 0],
  ];
  const pityLine = (label: string, got: number, e: number) => {
    const z = (got - e) / Math.sqrt(Math.max(e, 1));
    const ok = Math.abs(z) < Z_LIMIT;
    checks.push([`${label} : ${got} (attendu ≈ ${e.toFixed(0)}, ${z >= 0 ? "+" : ""}${z.toFixed(1)}σ)`, ok]);
  };
  pityLine("Pity SSR déclenché", pitySSR, exp.pitySSR);
  pityLine("Pity UR déclenché", pityUR, exp.pityUR);

  console.log("\nGaranties");
  for (const [label, ok] of checks) {
    allOk &&= ok;
    console.log(`  ${ok ? "OK" : "❌"}  ${label}`);
  }

  console.log("\nPersonnages (tirage uniforme dans chaque rareté)");
  for (const r of [...RARITIES].reverse()) {
    const pool = pools.get(r)!;
    const seen = pool.filter((id) => pulled.has(id)).length;
    const max = Math.max(0, ...pool.map((id) => pulled.get(id) ?? 0));
    console.log(
      `  ${r.padEnd(4)} ${String(seen).padStart(5)} / ${String(pool.length).padEnd(5)} différents obtenus, ` +
        `${(rarityCount[r] / pool.length).toFixed(1)} exemplaires en moyenne, ${max} au maximum`,
    );
  }

  // Délai avant le premier UR, sur de nombreux nouveaux joueurs
  const firstUR: number[] = [];
  for (let p = 0; p < players; p++) {
    let s: PityState = { packsSinceSSR: 0, packsSinceUR: 0 };
    for (let n = 1; ; n++) {
      const roll = rollPack(s, rng);
      if (roll.cards.some((c) => c.rarity === "UR")) {
        firstUR.push(n);
        break;
      }
      s = roll.next;
    }
  }
  firstUR.sort((a, b) => a - b);
  const at = (q: number) => firstUR[Math.min(firstUR.length - 1, Math.floor(q * firstUR.length))];
  const mean = firstUR.reduce((a, b) => a + b, 0) / firstUR.length;
  // 10 paquets de bienvenue, puis 1 toutes les 10 minutes
  const hours = (n: number) => `${(Math.max(0, n - 10) / 6).toFixed(1)} h`;
  console.log(`\nPremier UR (${players} nouveaux joueurs simulés, en paquets ; durée pour qui ouvre tout dès la recharge)`);
  console.log(`  moyenne ${mean.toFixed(1)} (${hours(mean)}) · médiane ${at(0.5)} (${hours(at(0.5))}) · ` +
    `90 % avant ${at(0.9)} (${hours(at(0.9))}) · max ${firstUR[firstUR.length - 1]}`);
  allOk &&= firstUR[firstUR.length - 1] <= UR_PITY;

  console.log(`\n${allOk ? "✅ Tous les contrôles passent." : "❌ Au moins un contrôle échoue."}`);
  if (!allOk) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("\nÉchec de la simulation :", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
