// Mode histoire (docs/specs/pvm.md) : définitions des univers, difficulté par niveau, butin. Pur : aucune lecture en base.

import type { Rarity } from "../generated/prisma/enums";

export const LEVELS = 15;
export const COMMON_RESOURCE = "fragment-de-signature";

export interface Universe {
  key: string;
  name: string;
  /** Franchise AniList dont les personnages peuplent l'univers */
  franchiseId: number;
  /** Ressource d'éveil de l'univers */
  resource: string;
  /** Ressource d'arme légendaire (boss final) */
  weaponResource: string;
}

/** Le premier univers est le tutoriel : il débloque tous les autres. */
export const UNIVERSES: Universe[] = [
  { key: "one-piece", name: "One Piece", franchiseId: 21, resource: "fruit-du-demon", weaponResource: "kairoseki" },
  { key: "naruto", name: "Naruto", franchiseId: 20, resource: "parchemin-de-jutsu", weaponResource: "metal-a-chakra" },
  { key: "jujutsu-kaisen", name: "Jujutsu Kaisen", franchiseId: 113415, resource: "doigt-maudit", weaponResource: "outil-maudit" },
];

export const RESOURCE_NAMES: Record<string, string> = {
  [COMMON_RESOURCE]: "Fragment de signature",
  "fruit-du-demon": "Fruit du démon", kairoseki: "Kairoseki",
  "parchemin-de-jutsu": "Parchemin de jutsu", "metal-a-chakra": "Métal à chakra",
  "doigt-maudit": "Doigt maudit", "outil-maudit": "Outil maudit",
};

export const universeOf = (key: string) => UNIVERSES.find((u) => u.key === key);
export const isUnlocked = (universe: Universe, tutorialLevel: number) => universe === UNIVERSES[0] || tutorialLevel >= LEVELS;

/** Rareté des 4 ennemis de chaque niveau (le dernier est le boss aux niveaux 5, 10 et 15) : montée progressive. */
export const MIX: Rarity[][] = [
  ["N", "N", "N", "R"], ["N", "N", "R", "R"], ["N", "R", "R", "R"], ["R", "R", "R", "SR"], ["R", "R", "SR", "SR"],
  ["R", "SR", "SR", "SR"], ["R", "SR", "SR", "SR"], ["SR", "SR", "SR", "SSR"], ["SR", "SR", "SSR", "SSR"], ["SR", "SSR", "SSR", "SSR"],
  ["SR", "SSR", "SSR", "SSR"], ["SSR", "SSR", "SSR", "SSR"], ["SSR", "SSR", "SSR", "SSR"], ["SSR", "SSR", "SSR", "UR"], ["SSR", "SSR", "SSR", "UR"],
];

/** Échelle des stats : 0,3 au niveau 1, 1,0 au niveau 15, en ligne droite. */
export const levelScale = (level: number) => 0.3 + (0.7 * (level - 1)) / (LEVELS - 1);
/** Bonus du boss sur l'ATK et la DEF. */
export const BOSS_BONUS = 1.25;
export const isBoss = (level: number) => level % 5 === 0;
export const isFinalBoss = (level: number) => level === LEVELS;

/** Plafond quotidien des combats rejoués : unités au taux plein, puis taux réduit. */
export const DAILY_FULL_UNITS = 500;
export const REDUCED_RATE = 0.25;

/** Unités de ressource d'un combat gagné, avant bonus de premier passage. */
export const baseUnits = (level: number) => 4 + Math.floor(level / 2);

export interface Loot {
  ryo: number;
  crystals: number;
  resources: Record<string, number>;
}

/** Butin d'une victoire. `rand` tire les unités entre ressource d'univers et commune (50 / 50). `fullUnits` : unités encore au taux plein aujourd'hui (rejeu). */
export function storyLoot(universe: Universe, level: number, firstClear: boolean, fullUnits: number, rand: () => number): Loot {
  let units = baseUnits(level);
  if (firstClear) units *= isFinalBoss(level) ? 10 : 3;
  else units = Math.min(units, fullUnits) + Math.round(Math.max(0, units - fullUnits) * REDUCED_RATE);
  const resources: Record<string, number> = {};
  for (let i = 0; i < units; i++) {
    const key = rand() < 0.5 ? universe.resource : COMMON_RESOURCE;
    resources[key] = (resources[key] ?? 0) + 1;
  }
  if (isFinalBoss(level)) resources[universe.weaponResource] = (resources[universe.weaponResource] ?? 0) + 1;
  // Ryō et cristaux : premier passage seulement (valeurs de départ, à équilibrer)
  return {
    ryo: firstClear ? 10 + 5 * level + (isFinalBoss(level) ? 300 : 0) : 0,
    crystals: firstClear ? (isFinalBoss(level) ? 5 : isBoss(level) ? 2 : 1) : 0,
    resources,
  };
}

/** Unités de ressource d'éveil d'un butin (celles qui comptent pour le plafond quotidien : les armes n'en font pas partie). */
export const lootUnits = (loot: Loot, universe: Universe) =>
  Object.entries(loot.resources).reduce((s, [k, n]) => s + (k === universe.weaponResource ? 0 : n), 0);
