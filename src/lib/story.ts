// Mode histoire (docs/specs/pvm.md) : définitions des univers, difficulté par niveau, butin. Pur : aucune lecture en base.

import type { Rarity } from "../generated/prisma/enums";

export const LEVELS = 15;
/** Boss imposés par le scénario ; leurs stats restent celles du combat. */
export const STORY_BOSSES: Record<string, Record<number, { characterId: number; name: string }>> = {
  "one-piece": {
    10: { characterId: 5677, name: "Rob Lucci" },
    15: { characterId: 2754, name: "Donquixote Doflamingo" },
  },
};

export const COMMON_RESOURCE = "fragment-de-signature";

export interface Universe {
  key: string;
  name: string;
  /** Univers d'anime (une franchise) ou de collision (plusieurs anime mêlés) */
  kind: "anime" | "collision";
  /** Franchises AniList dont les personnages peuplent l'univers */
  franchiseIds: number[];
  /** Ressource d'éveil de l'univers */
  resource: string;
  /** Ressource d'arme légendaire (boss final) */
  weaponResource: string;
  /** Rang dans la progression, de 1 (tutoriel) à 15 */
  rank: number;
  /** Échelle des stats ennemies au dernier combat de l'univers (le boss final) : monte d'un univers à l'autre */
  difficulty: number;
  /** Échelle au 1er combat : monte aussi, les univers avancés n'ont plus de combats faciles */
  startScale: number;
  /** Décalage du mélange de raretés : les univers avancés commencent plus haut dans l'échelle des raretés */
  mixShift: number;
  /** Multiplicateur des unités de ressource : les univers difficiles paient plus */
  rewardFactor: number;
}

/** Courbe continue sur les 225 combats : mêmes bornes que l’ancienne progression, sans retour à un départ facile. */
const progressionScale = (index: number) => 0.3 * (1.55 / 0.3) ** (index / (15 * LEVELS - 1));
const DIFFICULTY = Array.from({ length: 15 }, (_, i) => progressionScale((i + 1) * LEVELS - 1));
const START_SCALE = Array.from({ length: 15 }, (_, i) => progressionScale(i * LEVELS));
/** Cases de décalage du mélange de raretés : 0 pour le tutoriel, 7 pour le dernier univers. */
const MIX_SHIFT = Array.from({ length: 15 }, (_, i) => Math.round((7 * i) / 14));
/** Butin du dernier univers par rapport au premier. */
export const REWARD_MAX = 2.4;

type Def = Omit<Universe, "rank" | "difficulty" | "startScale" | "mixShift" | "rewardFactor">;
/**
 * Dans l'ordre de la progression : un univers de collision tous les 3 univers. Chaque univers s'ouvre en finissant le précédent
 * et est plus difficile que lui. Le premier sert de tutoriel.
 */
const DEFS: Def[] = [
  { key: "one-piece", name: "One Piece", kind: "anime", franchiseIds: [21], resource: "fruit-du-demon", weaponResource: "kairoseki" },
  { key: "naruto", name: "Naruto", kind: "anime", franchiseIds: [20], resource: "parchemin-de-jutsu", weaponResource: "metal-a-chakra" },
  { key: "grand-concert", name: "Le Grand Concert", kind: "collision", franchiseIds: [15051, 87435, 98514, 118123, 179878, 105334, 124080, 101921, 103572], resource: "baton-lumineux", weaponResource: "instrument-d-or" },
  { key: "jujutsu-kaisen", name: "Jujutsu Kaisen", kind: "anime", franchiseIds: [113415], resource: "doigt-maudit", weaponResource: "outil-maudit" },
  { key: "demon-slayer", name: "Demon Slayer", kind: "anime", franchiseIds: [101922], resource: "fleur-de-glycine", weaponResource: "acier-ecarlate" },
  { key: "ligue-des-terrains", name: "La Ligue des Terrains", kind: "collision", franchiseIds: [20464, 137822, 11771, 18507, 18689], resource: "trophee", weaponResource: "equipement-de-legende" },
  { key: "my-hero-academia", name: "My Hero Academia", kind: "anime", franchiseIds: [21459], resource: "fragment-d-alter", weaponResource: "costume-de-heros" },
  { key: "bleach", name: "Bleach", kind: "anime", franchiseIds: [269], resource: "cristal-de-reiatsu", weaponResource: "fragment-de-zanpakuto" },
  { key: "royaumes-echoues", name: "Les Royaumes Échoués", kind: "collision", franchiseIds: [21355, 101280, 108465, 20832, 130298, 151807, 11757, 21202], resource: "pierre-de-convocation", weaponResource: "fragment-de-grimoire" },
  { key: "attack-on-titan", name: "Attack on Titan", kind: "anime", franchiseIds: [16498], resource: "eclat-de-titan", weaponResource: "lame-ultra-dure" },
  { key: "hunter-x-hunter", name: "Hunter x Hunter", kind: "anime", franchiseIds: [11061], resource: "licence-de-hunter", weaponResource: "carte-de-greed-island" },
  { key: "grande-alchimie", name: "La Grande Alchimie", kind: "collision", franchiseIds: [6702, 97940, 20789, 105310, 5114, 154587, 105333], resource: "pierre-philosophale", weaponResource: "cristal-de-magie" },
  { key: "jojo", name: "JoJo's Bizarre Adventure", kind: "anime", franchiseIds: [14719], resource: "fleche-du-stand", weaponResource: "masque-de-pierre" },
  { key: "dragon-ball", name: "Dragon Ball", kind: "anime", franchiseIds: [813], resource: "graine-de-senzu", weaponResource: "armure-saiyan" },
  { key: "nuit-des-maudits", name: "La Nuit des Maudits", kind: "collision", franchiseIds: [20605, 127230, 33, 3588, 4898, 108463, 20613, 16592, 934], resource: "larme-d-ombre", weaponResource: "lame-maudite" },
];

/** Les 15 univers, du plus simple au plus difficile : difficulté et butin montent de façon continue. */
export const UNIVERSES: Universe[] = DEFS.map((d, i) => ({
  ...d,
  rank: i + 1,
  difficulty: DIFFICULTY[i],
  startScale: START_SCALE[i],
  mixShift: MIX_SHIFT[i],
  rewardFactor: 1 + ((REWARD_MAX - 1) * i) / (DEFS.length - 1),
}));

export const RESOURCE_NAMES: Record<string, string> = {
  [COMMON_RESOURCE]: "Fragment de signature",
  "fruit-du-demon": "Fruit du démon", kairoseki: "Kairoseki",
  "parchemin-de-jutsu": "Parchemin de jutsu", "metal-a-chakra": "Métal à chakra",
  "baton-lumineux": "Bâton lumineux", "instrument-d-or": "Instrument d'or",
  "doigt-maudit": "Doigt maudit", "outil-maudit": "Outil maudit",
  "fleur-de-glycine": "Fleur de glycine", "acier-ecarlate": "Acier écarlate",
  trophee: "Trophée", "equipement-de-legende": "Équipement de légende",
  "fragment-d-alter": "Fragment d'Alter", "costume-de-heros": "Costume de héros",
  "cristal-de-reiatsu": "Cristal de reiatsu", "fragment-de-zanpakuto": "Fragment de zanpakutō",
  "pierre-de-convocation": "Pierre de convocation", "fragment-de-grimoire": "Fragment de grimoire",
  "eclat-de-titan": "Éclat de titan", "lame-ultra-dure": "Lame ultra-dure",
  "licence-de-hunter": "Licence de Hunter", "carte-de-greed-island": "Carte de Greed Island",
  "pierre-philosophale": "Pierre philosophale", "cristal-de-magie": "Cristal de magie",
  "fleche-du-stand": "Flèche du Stand", "masque-de-pierre": "Masque de pierre",
  "graine-de-senzu": "Graine de Senzu", "armure-saiyan": "Armure saiyan",
  "larme-d-ombre": "Larme d'ombre", "lame-maudite": "Lame maudite",
  "coeur-de-breche": "Cœur de brèche",
  "materiau-donjon-one-piece": "Éclat du Trône",
};

export const universeOf = (key: string) => UNIVERSES.find((u) => u.key === key);
/** Un univers s'ouvre quand le précédent est fini (ses 15 combats gagnés) ; le premier est toujours ouvert. */
export const isUnlocked = (universe: Universe, previousMaxLevel: number) => universe.rank === 1 || previousMaxLevel >= LEVELS;

/** Rareté des 4 ennemis de chaque niveau (le dernier est le boss aux niveaux 5, 10 et 15) : montée progressive. */
export const MIX: Rarity[][] = [
  ["N", "N", "N", "R"], ["N", "N", "R", "R"], ["N", "R", "R", "R"], ["R", "R", "R", "SR"], ["R", "R", "SR", "SR"],
  ["R", "SR", "SR", "SR"], ["R", "SR", "SR", "SR"], ["SR", "SR", "SR", "SSR"], ["SR", "SR", "SSR", "SSR"], ["SR", "SSR", "SSR", "SSR"],
  ["SR", "SSR", "SSR", "SSR"], ["SSR", "SSR", "SSR", "SSR"], ["SSR", "SSR", "SSR", "SSR"], ["SSR", "SSR", "SSR", "UR"], ["SSR", "SSR", "SSR", "UR"],
];

/** Échelle des stats d'un combat : de l'échelle de départ de l'univers (niveau 1) à sa difficulté (niveau 15), de façon continue. */
export const levelScale = (universe: Universe, level: number) => universe.startScale + ((universe.difficulty - universe.startScale) * (level - 1)) / (LEVELS - 1);
/** Rareté des 4 ennemis d'un combat : le mélange du niveau, décalé vers le haut dans les univers avancés (sans dépasser le dernier mélange). */
export const mixFor = (universe: Universe, level: number) => MIX[Math.min(LEVELS - 1, level - 1 + universe.mixShift)];
/** Bonus du boss sur l'ATK et la DEF. */
export const BOSS_BONUS = 1.25;
export const isBoss = (level: number) => level % 5 === 0;
export const isFinalBoss = (level: number) => level === LEVELS;

/** Plafond quotidien des combats rejoués : unités au taux plein, puis taux réduit. */
export const DAILY_FULL_UNITS = 500;
export const REDUCED_RATE = 0.25;

/** Unités de ressource d'un combat gagné, avant bonus de premier passage. */
export const baseUnits = (level: number, universe?: Universe) => Math.round((4 + Math.floor(level / 2)) * (universe?.rewardFactor ?? 1));

export const storyFirstRyo = (level: number) => 40 + 15 * level + (isFinalBoss(level) ? 500 : 0);
export const storyReplayRyo = (level: number) => 8 + 2 * level;

export interface Loot {
  ryo: number;
  crystals: number;
  resources: Record<string, number>;
  /** Raid : part des PV du boss retirée (0 à 1) */
  share?: number;
  /** Première pièce, conservée pour les anciens lecteurs de butin. */
  artifact?: { slot: string; rarity: Rarity; mainStat: string; mainValue: number; subStats: { stat: string; value: number }[] };
  /** Toutes les pièces gagnées (absent des anciens combats à une pièce). */
  artifacts?: NonNullable<Loot["artifact"]>[];
}

/** Butin d'une victoire. `rand` tire les unités entre ressource d'univers et commune (50 / 50). `fullUnits` : unités encore au taux plein aujourd'hui (rejeu). */
export function storyLoot(universe: Universe, level: number, firstClear: boolean, fullUnits: number, rand: () => number): Loot {
  let units = baseUnits(level, universe);
  if (firstClear) units *= isFinalBoss(level) ? 10 : 3;
  else units = Math.min(units, fullUnits) + Math.round(Math.max(0, units - fullUnits) * REDUCED_RATE);
  const resources: Record<string, number> = {};
  for (let i = 0; i < units; i++) {
    const key = rand() < 0.5 ? universe.resource : COMMON_RESOURCE;
    resources[key] = (resources[key] ?? 0) + 1;
  }
  if (isFinalBoss(level)) resources[universe.weaponResource] = (resources[universe.weaponResource] ?? 0) + 1;
  // Ryō : gros gain au premier passage, petit gain à chaque rejeu (v0.3.0). Cristaux : premier passage seulement.
  return {
    ryo: firstClear ? storyFirstRyo(level) : storyReplayRyo(level),
    crystals: firstClear ? (isFinalBoss(level) ? 5 : isBoss(level) ? 2 : 1) : 0,
    resources,
  };
}

/** Unités de ressource d'éveil d'un butin (celles qui comptent pour le plafond quotidien : les armes n'en font pas partie). */
export const lootUnits = (loot: Loot, universe: Universe) =>
  Object.entries(loot.resources).reduce((s, [k, n]) => s + (k === universe.weaponResource ? 0 : n), 0);

/** Aperçu calculé avec les mêmes règles que le butin versé ; le quota de rejeu peut réduire les quantités. */
export function storyLootPreview(universe: Universe, level: number, firstClear: boolean) {
  const full = storyLoot(universe, level, firstClear, DAILY_FULL_UNITS, () => 0.5);
  const reduced = storyLoot(universe, level, firstClear, 0, () => 0.5);
  return {
    units: lootUnits(full, universe),
    minUnits: lootUnits(reduced, universe),
    ryo: full.ryo,
    crystals: full.crystals,
    weapon: full.resources[universe.weaponResource] ?? 0,
  };
}
