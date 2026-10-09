// Tirage des paquets (SPEC étape 2, §4).
// Logique pure : le hasard est injecté. Le serveur utilise `secureRandom` (crypto),
// la simulation peut utiliser un générateur à graine pour être reproductible.

import type { Rarity } from "../generated/prisma/enums";

export const CARDS_PER_PACK = 5;
/** Le 15ᵉ paquet sans SSR ou mieux en contient forcément un. */
export const SSR_PITY = 15;
/** Le 100ᵉ paquet sans UR en contient forcément un. */
export const UR_PITY = 100;

export const RARITY_RATES: [Rarity, number][] = [
  ["N", 0.65],
  ["R", 0.24],
  ["SR", 0.08],
  ["SSR", 0.025],
  ["UR", 0.005],
];

export type Finish = "NORMAL" | "HOLO" | "GOLD";

export const FINISH_RATES: [Finish, number][] = [
  ["NORMAL", 0.9],
  ["HOLO", 0.09],
  ["GOLD", 0.01],
];

export type PityTrigger = "NONE" | "SSR" | "UR";

/** Renvoie un nombre dans [0, 1). */
export type Random = () => number;

export interface PityState {
  packsSinceSSR: number;
  packsSinceUR: number;
}

export interface PulledCard {
  rarity: Rarity;
  finish: Finish;
}

export interface PackRoll {
  cards: PulledCard[];
  pity: PityTrigger;
  /** Compteurs de pity après ce paquet */
  next: PityState;
}

const R_OR_BETTER: Rarity[] = ["R", "SR", "SSR", "UR"];
const SSR_OR_BETTER: Rarity[] = ["SSR", "UR"];

/** Générateur sécurisé (Web Crypto, 53 bits) : à utiliser côté serveur pour les tirages. */
export function secureRandom(): number {
  const [hi, lo] = crypto.getRandomValues(new Uint32Array(2));
  return ((hi >>> 5) * 67108864 + (lo >>> 6)) / 9007199254740992;
}

function weightedPick<T>(entries: [T, number][], rng: Random): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let x = rng() * total;
  for (const [value, weight] of entries) {
    x -= weight;
    if (x < 0) return value;
  }
  return entries[entries.length - 1][0];
}

/** Taux relatifs restreints à certaines raretés (ex. R+ : R 24 / SR 8 / SSR 2,5 / UR 0,5). */
const ratesAmong = (rarities: Rarity[]) => RARITY_RATES.filter(([r]) => rarities.includes(r));

/** Tire les raretés et finitions d'un paquet, en appliquant les garanties dans l'ordre de la spec. */
export function rollPack(state: PityState, rng: Random = secureRandom): PackRoll {
  const rarities = Array.from({ length: CARDS_PER_PACK }, () => weightedPick(RARITY_RATES, rng));
  const has = (set: Rarity[]) => rarities.some((r) => set.includes(r));
  const last = CARDS_PER_PACK - 1;
  let pity: PityTrigger = "NONE";

  // 1. Pity UR : 100ᵉ paquet sans UR
  if (state.packsSinceUR >= UR_PITY - 1 && !has(["UR"])) {
    rarities[last] = "UR";
    pity = "UR";
  }
  // 2. Pity SSR : 15ᵉ paquet sans SSR ni UR
  if (state.packsSinceSSR >= SSR_PITY - 1 && !has(SSR_OR_BETTER)) {
    rarities[last] = weightedPick(ratesAmong(SSR_OR_BETTER), rng);
    pity = "SSR";
  }
  // 3. Carte garantie : au moins une R ou mieux
  if (!has(R_OR_BETTER)) {
    rarities[last] = weightedPick(ratesAmong(R_OR_BETTER), rng);
  }

  const cards = rarities.map((rarity) => ({ rarity, finish: weightedPick(FINISH_RATES, rng) }));
  return {
    cards,
    pity,
    next: {
      packsSinceSSR: has(SSR_OR_BETTER) ? 0 : state.packsSinceSSR + 1,
      packsSinceUR: has(["UR"]) ? 0 : state.packsSinceUR + 1,
    },
  };
}

/** Choisit un élément uniformément (un personnage parmi ceux de la rareté tirée). */
export function pickUniform<T>(pool: T[], rng: Random = secureRandom): T {
  if (pool.length === 0) throw new Error("Aucun personnage disponible pour cette rareté");
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
