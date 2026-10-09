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

// ---------- Type (tags et genres de la série principale) ----------

/**
 * Tags AniList → type. Chaque tag ajoute (rang / 100) × poids au score du type.
 * Poids 1 par défaut ; 0,5 pour les tags très répandus et peu caractéristiques.
 * Les tags purement descriptifs (Male Protagonist, Shounen…) sont ignorés.
 */
const TYPE_TAGS: Record<CardType, (string | [string, number])[]> = {
  COMBAT: [
    "Super Power", "Swordplay", "Martial Arts", "Guns", "War", "Military", "Battle Royale",
    "Samurai", "Ninja", "Spearplay", "Archery", "Assassins", "Superhero", "Henshin", "Tokusatsu",
    "Kaiju", "Super Robot", "Real Robot", "Cultivation", "Proxy Battle", "Delinquents", "Gangs",
    "Yakuza", "Athletics", "Football", "Volleyball", "Baseball", "Basketball", "Boxing",
    "Tennis", "Table Tennis", "Swimming", "Cycling", "Wrestling", "Fitness", "Motorcycles",
  ],
  MYSTERE: [
    "Detective", "Crime", "Conspiracy", "Police", "Death Game", "Body Horror", "Cosmic Horror",
    "Psychosexual", "Time Manipulation", "Time Loop", "Amnesia", "Dissociative Identities",
    "Memory Manipulation", "Espionage", "Terrorism", "Criminal Organization", "Mafia", "Noir",
    "Cult", "Revenge", "Gambling", "Prison", "Suicide", "Zombie", "Yandere", "Torture",
    ["Politics", 0.7], ["Tragedy", 0.5], ["Gore", 0.5], ["Anti-Hero", 0.5], ["Philosophy", 0.3],
  ],
  MAGIE: [
    "Magic", "Demons", "Curses", "Youkai", "Exorcism", "Gods", "Mythology", "Witch", "Vampire",
    "Shapeshifting", "Elf", "Dragons", "Fairy", "Angels", "Afterlife", "Ghost", "Necromancy",
    "Alchemy", "Succubus", "Shrine Maiden", "Prophecy", "Monster Girl", "Skeleton", "Goblin",
    "Fairy Tale", ["Urban Fantasy", 0.5], ["Reincarnation", 0.5],
  ],
  COEUR: [
    "Love Triangle", "Unrequited Love", "Yuri", "Boys' Love", "Female Harem",
    "Male Harem", "Cohabitation", "Fake Relationship", "Arranged Marriage", "Marriage",
    "Age Gap", "Cute Girls Doing Cute Things", "Cute Boys Doing Cute Things", "Iyashikei",
    "Family Life", "Parenthood", "Idol", "Band", "Rock Music", "Hip-hop Music", "Dancing",
    "Acting", "Food", "Restaurant", "Work", "Office Lady", "Maids", "Drawing", "Otaku Culture",
    "Chuunibyou", "School Club", "Rural", "Outdoor Activities", ["Heterosexual", 0.5],
    ["Slapstick", 0.5], ["Parody", 0.5], ["Surreal Comedy", 0.5], ["Found Family", 0.5],
    ["School", 0.3], ["Coming of Age", 0.3],
  ],
  AVENTURE: [
    "Travel", "Isekai", "Reverse Isekai", "Pirates", "Ships", "Space", "Space Opera",
    "Post-Apocalyptic", "Dystopian", "Survival", "Lost Civilization", "Dungeon", "Video Games",
    "Virtual World", "Aliens", "Robots", "Cyborg", "Artificial Intelligence", "Cyberpunk",
    "Steampunk", "Desert", "Wilderness", "Snowscape", "Fugitive", "Rescue", "Creature Taming",
    ["Medieval", 0.5],
  ],
};

/** Genres : signal secondaire (départage et repli quand aucun tag ne correspond). */
const TYPE_GENRES: Record<CardType, string[]> = {
  COMBAT: ["Action", "Sports", "Mecha"],
  MYSTERE: ["Mystery", "Psychological", "Thriller", "Horror"],
  MAGIE: ["Fantasy", "Supernatural", "Mahou Shoujo"],
  COEUR: ["Romance", "Drama", "Slice of Life", "Music", "Comedy", "Ecchi"],
  AVENTURE: ["Adventure", "Sci-Fi"],
};
const GENRE_WEIGHT = 0.2;

/**
 * Coefficient par type, appliqué au score final pour équilibrer la répartition :
 * sans lui, Cœur dépasse 40 % (romcoms, idols, tranches de vie très représentées).
 */
const TYPE_BIAS: Record<CardType, number> = { COMBAT: 1, MYSTERE: 1.5, MAGIE: 1, COEUR: 0.6, AVENTURE: 1.5 };

/** Ordre de priorité en cas d'égalité parfaite. */
const TYPE_PRIORITY: CardType[] = ["AVENTURE", "MYSTERE", "MAGIE", "COEUR", "COMBAT"];

const TAG_WEIGHTS = new Map<string, { type: CardType; weight: number }>();
for (const type of TYPE_PRIORITY) {
  for (const entry of TYPE_TAGS[type]) {
    const [name, weight] = typeof entry === "string" ? [entry, 1] : entry;
    TAG_WEIGHTS.set(name, { type, weight });
  }
}

export interface MediaTag {
  name: string;
  rank: number;
}

export function typeScores(genres: string[], tags: MediaTag[]): Record<CardType, number> {
  const scores: Record<CardType, number> = { COMBAT: 0, MYSTERE: 0, MAGIE: 0, COEUR: 0, AVENTURE: 0 };
  for (const t of tags) {
    const w = TAG_WEIGHTS.get(t.name);
    if (w) scores[w.type] += (t.rank / 100) * w.weight;
  }
  for (const type of TYPE_PRIORITY) {
    scores[type] += genres.filter((g) => TYPE_GENRES[type].includes(g)).length * GENRE_WEIGHT;
    scores[type] *= TYPE_BIAS[type];
  }
  return scores;
}

/** Type au score le plus élevé ; Cœur si aucun signal. */
export function assignType(genres: string[], tags: MediaTag[] = []): CardType {
  const scores = typeScores(genres, tags);
  let best: CardType = "COEUR";
  let bestScore = 0;
  for (const type of TYPE_PRIORITY) {
    if (scores[type] > bestScore) {
      best = type;
      bestScore = scores[type];
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
