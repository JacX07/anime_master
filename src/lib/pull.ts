// Tirage des lots de cartes (SPEC étape 2 §4, refondu par l'étape 4 bis : cristaux).
// Logique pure : le hasard est injecté. Le serveur utilise `secureRandom` (crypto),
// la simulation peut utiliser un générateur à graine pour être reproductible.

import type { Rarity } from "../generated/prisma/enums";

/** Tailles de lot (SPEC étape 4 bis §3) : 1 cristal = 1 carte. */
export const LOT_SIZES = [5, 10] as const;
export type LotSize = (typeof LOT_SIZES)[number];
/** Pity en cartes (un seul compteur, SPEC étape 4 bis §4) : la 75ᵉ carte sans SSR ou mieux en est forcément un. */
export const SSR_PITY = 75;
/** La 500ᵉ carte sans UR en est forcément un. */
export const UR_PITY = 500;

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
  cardsSinceSSR: number;
  cardsSinceUR: number;
}

export interface PulledCard {
  rarity: Rarity;
  finish: Finish;
}

export interface LotRoll {
  cards: PulledCard[];
  /** Pity le plus fort déclenché pendant le lot */
  pity: PityTrigger;
  /** Compteurs de pity après ce lot */
  next: PityState;
}

const R_OR_BETTER: Rarity[] = ["R", "SR", "SSR", "UR"];
const SSR_OR_BETTER: Rarity[] = ["SSR", "UR"];

/** 10ᵉ carte du ×10 : au moins R, avec des gains dégressifs (SR ×3, SSR ×2,5, UR ×2, SPEC étape 4 bis §3). */
export const TENTH_CARD_RATES: [Rarity, number][] = [
  ["R", 0.6875],
  ["SR", 0.24],
  ["SSR", 0.0625],
  ["UR", 0.01],
];

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

/**
 * Tire un lot de 5 ou 10 cartes, carte par carte, avec les garanties de la spec dans cet ordre :
 * 1. pity UR (500ᵉ carte sans UR) ; 2. pity SSR (75ᵉ carte sans SSR ou mieux) ;
 * 3. 5ᵉ carte de chaque bloc de 5 : R ou mieux si les 4 précédentes sont toutes N ;
 * 4. 10ᵉ carte du ×10 : table dégressive, à la place de la règle 3 pour cette carte.
 */
export function rollLot(state: PityState, size: LotSize, rng: Random = secureRandom): LotRoll {
  let sinceSSR = state.cardsSinceSSR;
  let sinceUR = state.cardsSinceUR;
  let pity: PityTrigger = "NONE";
  const rarities: Rarity[] = [];

  for (let i = 0; i < size; i++) {
    const endOfBlock = (i + 1) % 5 === 0;
    const blockAllN = rarities.slice(i - 4).every((r) => r === "N");
    let table = RARITY_RATES;
    if (size === 10 && i === 9) table = TENTH_CARD_RATES;
    else if (endOfBlock && blockAllN) table = ratesAmong(R_OR_BETTER);

    let rarity: Rarity;
    if (sinceUR >= UR_PITY - 1) {
      rarity = "UR";
      pity = "UR";
    } else {
      rarity = weightedPick(table, rng);
      if (sinceSSR >= SSR_PITY - 1 && !SSR_OR_BETTER.includes(rarity)) {
        rarity = weightedPick(ratesAmong(SSR_OR_BETTER), rng);
        if (pity !== "UR") pity = "SSR";
      }
    }
    sinceSSR = SSR_OR_BETTER.includes(rarity) ? 0 : sinceSSR + 1;
    sinceUR = rarity === "UR" ? 0 : sinceUR + 1;
    rarities.push(rarity);
  }

  return {
    cards: rarities.map((rarity) => ({ rarity, finish: weightedPick(FINISH_RATES, rng) })),
    pity,
    next: { cardsSinceSSR: sinceSSR, cardsSinceUR: sinceUR },
  };
}

/** Choisit un élément uniformément (un personnage parmi ceux de la rareté tirée). */
export function pickUniform<T>(pool: T[], rng: Random = secureRandom): T {
  if (pool.length === 0) throw new Error("Aucun personnage disponible pour cette rareté");
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
