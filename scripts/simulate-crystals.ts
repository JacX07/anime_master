// Simulation comparée : tirage actuel (paquets de 5) contre tirage « cristaux » (1 cristal = 1 carte, lots ×5 / ×10).
// Ne touche ni à la base ni au code de production : les règles du système proposé sont recodées ici, à partir du conseil.
// Usage : npx tsx scripts/simulate-crystals.ts [--cards 2000000] [--seed 42] [--players 20000]

import type { Rarity } from "../src/generated/prisma/enums";
import { RARITY_RATES, rollPack, type PityState, type Random } from "../src/lib/pull";

const RARITIES: Rarity[] = ["N", "R", "SR", "SSR", "UR"];
const BASE = Object.fromEntries(RARITY_RATES) as Record<Rarity, number>;
const arg = (name: string, d: number) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? d : Number(process.argv[i + 1]);
};
const CARDS = arg("--cards", 2_000_000);
const PLAYERS = arg("--players", 20_000);
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

type Table = Record<Rarity, number>;
const pick = (t: Table): Rarity => {
  let x = rng();
  for (const r of RARITIES) {
    x -= t[r];
    if (x < 0) return r;
  }
  return "UR";
};
const among = (set: Rarity[]): Table => {
  const total = set.reduce((s, r) => s + BASE[r], 0);
  return Object.fromEntries(RARITIES.map((r) => [r, set.includes(r) ? BASE[r] / total : 0])) as Table;
};
const R_PLUS = among(["R", "SR", "SSR", "UR"]);
const SSR_PLUS = among(["SSR", "UR"]);

// 10e carte du conseil : N 0 / R 68,75 / SR 24 / SSR 6,25 / UR 1
const TENTH: Table = { N: 0, R: 0.6875, SR: 0.24, SSR: 0.0625, UR: 0.01 };

interface Rules {
  name: string;
  /** garantie R+ sur la dernière carte de chaque lot de 5 (comme aujourd'hui) */
  rPlusPerFive: boolean;
  /** 10e carte du ×10 boostée */
  tenth: boolean;
  ssrPity: number; // en cartes
  urPity: number;
}

interface Counters {
  s: number;
  u: number;
}

/** Une carte, pity compris. `table` = loi de la carte (base, R+ ou 10e). */
function drawCard(c: Counters, table: Table, r: Rules): Rarity {
  let card: Rarity;
  if (c.u >= r.urPity - 1) card = "UR";
  else if (c.s >= r.ssrPity - 1) {
    const base = pick(table);
    card = base === "SSR" || base === "UR" ? base : pick(SSR_PLUS);
  } else card = pick(table);
  c.s = card === "SSR" || card === "UR" ? 0 : c.s + 1;
  c.u = card === "UR" ? 0 : c.u + 1;
  return card;
}

/** Un lot de n cartes (5 ou 10). */
function drawLot(n: 5 | 10, c: Counters, r: Rules): Rarity[] {
  const out: Rarity[] = [];
  for (let i = 0; i < n; i++) {
    const last5 = (i + 1) % 5 === 0;
    const isTenth = n === 10 && i === 9;
    let table = BASE as Table;
    if (isTenth && r.tenth) table = TENTH;
    else if (last5 && r.rPlusPerFive && !out.slice(i - 4 < 0 ? 0 : i - 4).some((x) => x !== "N")) table = R_PLUS;
    out.push(drawCard(c, table, r));
  }
  return out;
}

const zero = (): Record<Rarity, number> => ({ N: 0, R: 0, SR: 0, SSR: 0, UR: 0 });

function run(r: Rules, n: 5 | 10, cards: number) {
  const counts = zero();
  const c: Counters = { s: 0, u: 0 };
  let drawn = 0;
  while (drawn < cards) {
    for (const x of drawLot(n, c, r)) counts[x]++;
    drawn += n;
  }
  return { counts, drawn };
}

/** Cartes nécessaires pour le premier SSR+/UR d'un nouveau joueur. */
function firstOf(r: Rules, n: 5 | 10, what: "SSR" | "UR") {
  const res: number[] = [];
  for (let p = 0; p < PLAYERS; p++) {
    const c: Counters = { s: 0, u: 0 };
    let drawn = 0;
    let done = false;
    while (!done) {
      for (const x of drawLot(n, c, r)) {
        drawn++;
        if (what === "UR" ? x === "UR" : x === "SSR" || x === "UR") {
          done = true;
          break;
        }
      }
    }
    res.push(drawn);
  }
  res.sort((a, b) => a - b);
  const q = (x: number) => res[Math.min(res.length - 1, Math.floor(x * res.length))];
  return { mean: res.reduce((a, b) => a + b, 0) / res.length, median: q(0.5), p90: q(0.9), max: res[res.length - 1] };
}

// ---------- Système actuel (code de production) ----------

function runCurrent(cards: number) {
  const counts = zero();
  let state: PityState = { packsSinceSSR: 0, packsSinceUR: 0 };
  for (let i = 0; i < cards / 5; i++) {
    const roll = rollPack(state, rng);
    for (const x of roll.cards) counts[x.rarity]++;
    state = roll.next;
  }
  return counts;
}
function firstCurrent(what: "SSR" | "UR") {
  const res: number[] = [];
  for (let p = 0; p < PLAYERS; p++) {
    let s: PityState = { packsSinceSSR: 0, packsSinceUR: 0 };
    for (let n = 1; ; n++) {
      const roll = rollPack(s, rng);
      const hit = roll.cards.findIndex((x) => (what === "UR" ? x.rarity === "UR" : x.rarity === "SSR" || x.rarity === "UR"));
      if (hit >= 0) {
        res.push((n - 1) * 5 + hit + 1);
        break;
      }
      s = roll.next;
    }
  }
  res.sort((a, b) => a - b);
  const q = (x: number) => res[Math.min(res.length - 1, Math.floor(x * res.length))];
  return { mean: res.reduce((a, b) => a + b, 0) / res.length, median: q(0.5), p90: q(0.9), max: res[res.length - 1] };
}

// ---------- Affichage ----------

const per10k = (counts: Record<Rarity, number>, total: number) => RARITIES.map((r) => ((counts[r] / total) * 10_000).toFixed(0).padStart(6)).join(" ");
const perLot = (counts: Record<Rarity, number>, total: number, n: number) => (r: Rarity) => ((counts[r] / total) * n).toFixed(3);
const f = (x: { mean: number; median: number; p90: number; max: number }) => `moy ${x.mean.toFixed(0)} · méd ${x.median} · 90 % avant ${x.p90} · max ${x.max}`;

const CURRENT_RULES: Rules = { name: "", rPlusPerFive: true, tenth: false, ssrPity: 75, urPity: 500 };
const VARIANTS: Rules[] = [
  { name: "B  Conseil tel quel : cartes indépendantes, pas de R garantie, 10e boostée (×10 seulement)", rPlusPerFive: false, tenth: true, ssrPity: 75, urPity: 500 },
  { name: "C  Comme B + R ou mieux garantie sur la 5e carte de chaque lot de 5 (comme aujourd'hui)", rPlusPerFive: true, tenth: true, ssrPity: 75, urPity: 500 },
  { name: "D  Sans bonus de 10e carte, avec R garantie par lot de 5 (= actuel, pity en cartes)", rPlusPerFive: true, tenth: false, ssrPity: 75, urPity: 500 },
];

console.log(`Simulation : ${CARDS.toLocaleString("fr-FR")} cartes par ligne, ${PLAYERS.toLocaleString("fr-FR")} nouveaux joueurs pour les délais, graine ${SEED}\n`);
console.log("Cartes obtenues pour 10 000 cartes tirées");
console.log("                                                                   N      R     SR    SSR     UR");
const cur = runCurrent(CARDS);
console.log(`A  Actuel (paquets de 5, R+ garantie, pity 15/100 paquets)${"".padEnd(11)}${per10k(cur, CARDS)}`);
const results = new Map<string, ReturnType<typeof run>>();
for (const v of VARIANTS) {
  for (const n of [5, 10] as const) {
    const res = run(v, n, CARDS);
    results.set(`${v.name[0]}${n}`, res);
    console.log(`${v.name[0]}  ×${String(n).padEnd(2)} ${v.name.slice(3, 60).padEnd(57)}${per10k(res.counts, res.drawn)}`);
  }
}

console.log("\nPar lot de 10 cartes, relatif à l'actuel (attendu par lot = 10 × part)");
console.log("                       SR            SSR           UR");
const base = (r: Rarity) => (cur[r] / CARDS) * 10;
console.log(`A  actuel          ${["SR", "SSR", "UR"].map((r) => base(r as Rarity).toFixed(3).padEnd(14)).join("")}`);
for (const v of VARIANTS) {
  for (const n of [5, 10] as const) {
    const res = results.get(`${v.name[0]}${n}`)!;
    const cells = (["SR", "SSR", "UR"] as Rarity[]).map((r) => {
      const x = (res.counts[r] / res.drawn) * 10;
      return `${x.toFixed(3)} (${x >= base(r) ? "+" : ""}${(((x - base(r)) / base(r)) * 100).toFixed(0)} %)`.padEnd(14);
    });
    console.log(`${v.name[0]}  ×${String(n).padEnd(2)}             ${cells.join("")}`);
  }
}

console.log("\nCartes avant le premier SSR ou mieux / le premier UR (nouveau joueur)");
console.log(`A  actuel                SSR+ : ${f(firstCurrent("SSR"))}`);
console.log(`                         UR   : ${f(firstCurrent("UR"))}`);
for (const v of VARIANTS.slice(0, 2)) {
  for (const n of [5, 10] as const) {
    console.log(`${v.name[0]}  ×${n}                    SSR+ : ${f(firstOf(v, n, "SSR"))}`);
    console.log(`                         UR   : ${f(firstOf(v, n, "UR"))}`);
  }
}
void CURRENT_RULES;
