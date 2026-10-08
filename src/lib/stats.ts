// Rareté, type et stats des personnages (SPEC §5, §5 ter, §6).
// Tout est déterministe : même entrée → même résultat d'un import à l'autre.

import type { CardType, CharacterRole, Rarity } from "../generated/prisma/enums";

// ---------- Rareté (percentiles de favoris) ----------

/** Seuils cumulés : top 1 % UR, 4 % suivants SSR, 10 % SR, 25 % R, reste N. */
const RARITY_CUTOFFS: [Rarity, number][] = [
  ["UR", 0.01],
  ["SSR", 0.05],
  ["SR", 0.15],
  ["R", 0.4],
  ["N", 1],
];

export const RARITIES: Rarity[] = ["N", "R", "SR", "SSR", "UR"];

/** Classe par favoris décroissants (égalité : plus petit id d'abord) et attribue les raretés. */
export function assignRarities<T extends { id: number; favourites: number }>(
  characters: T[],
): Map<number, Rarity> {
  const sorted = [...characters].sort((a, b) => b.favourites - a.favourites || a.id - b.id);
  const total = sorted.length;
  const result = new Map<number, Rarity>();
  sorted.forEach((c, index) => {
    const rarity = RARITY_CUTOFFS.find(([, cutoff]) => index < Math.round(cutoff * total))?.[0] ?? "N";
    result.set(c.id, rarity);
  });
  return result;
}

// ---------- Type (genres de la série principale) ----------

const TYPE_GENRES: Record<CardType, string[]> = {
  COMBAT: ["Action", "Sports", "Mecha"],
  MYSTERE: ["Mystery", "Psychological", "Thriller", "Horror"],
  MAGIE: ["Fantasy", "Supernatural", "Mahou Shoujo"],
  COEUR: ["Romance", "Drama", "Slice of Life", "Music", "Comedy", "Ecchi"],
  AVENTURE: ["Adventure", "Sci-Fi"],
};

/** Ordre de priorité en cas d'égalité (genres les plus spécifiques d'abord). */
const TYPE_PRIORITY: CardType[] = ["AVENTURE", "MYSTERE", "MAGIE", "COEUR", "COMBAT"];

export interface MediaTag {
  name: string;
  rank: number;
}

export function assignType(genres: string[], _tags: MediaTag[] = []): CardType {
  let best: CardType = "COEUR";
  let bestCount = 0;
  for (const type of TYPE_PRIORITY) {
    const count = genres.filter((g) => TYPE_GENRES[type].includes(g)).length;
    if (count > bestCount) {
      best = type;
      bestCount = count;
    }
  }
  return best;
}

// ---------- Stats ----------

const POWER_RANGES: Record<Rarity, [number, number]> = {
  N: [1000, 2000],
  R: [2000, 3200],
  SR: [3200, 4600],
  SSR: [4600, 6200],
  UR: [6200, 8000],
};

/** Valeur pseudo-aléatoire stable dans [0, 1) dérivée d'un entier (hash de type mulberry32). */
function stableRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export interface StatsInput {
  id: number;
  favourites: number;
  rarity: Rarity;
  role: CharacterRole;
}

/** favMin / favMax par rareté, pour placer chaque personnage dans sa plage. */
export function favouriteBounds(characters: { favourites: number; rarity: Rarity }[]) {
  const bounds = new Map<Rarity, { min: number; max: number }>();
  for (const c of characters) {
    const b = bounds.get(c.rarity);
    if (!b) bounds.set(c.rarity, { min: c.favourites, max: c.favourites });
    else {
      b.min = Math.min(b.min, c.favourites);
      b.max = Math.max(b.max, c.favourites);
    }
  }
  return bounds;
}

export function computeStats(
  c: StatsInput,
  bounds: Map<Rarity, { min: number; max: number }>,
): { attack: number; defense: number } {
  const [lo, hi] = POWER_RANGES[c.rarity];
  const b = bounds.get(c.rarity) ?? { min: c.favourites, max: c.favourites };

  const logMin = Math.log(b.min + 1);
  const logMax = Math.log(b.max + 1);
  const t = logMax > logMin ? (Math.log(c.favourites + 1) - logMin) / (logMax - logMin) : 0.5;
  const power = Math.round(lo + Math.min(1, Math.max(0, t)) * (hi - lo));

  const baseShare = c.role === "MAIN" ? 0.6 : 0.45;
  const share = baseShare + (stableRandom(c.id) * 0.1 - 0.05); // ±5 points
  const attack = Math.round((power * share) / 10) * 10;
  return { attack, defense: power - attack };
}
