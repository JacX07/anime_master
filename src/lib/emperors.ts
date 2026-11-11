// Défi des empereurs (docs/specs/raid-empereurs.md). Pur : empereurs, équipages, ressources légendaires, clés, drops et recette.

import { EMPEROR_IDS } from "./boss-skills";
import { DIFFICULTIES, difficultyOf, type RaidDifficulty } from "./raid";

export const EMPEROR_PREFIX = "emperor:";
export const HARDCORE_KEY = "hardcore";

export interface Emperor {
  key: string;
  name: string;
  characterId: number;
  /** Ressource légendaire laissée par l'empereur (noms provisoires) */
  resource: string;
  resourceName: string;
  /** Clé gagnée en le battant, requise pour le Hardcore */
  keyResource: string;
  keyName: string;
  /** Arme fabriquée avec sa ressource (clé de `weapons.ts`) */
  weapon: string;
  /** Deux vagues d'équipage avant l'empereur (identifiants AniList) */
  crew: [number[], number[]];
  blurb: string;
}

export const EMPERORS: Emperor[] = [
  {
    key: "shanks", name: "Shanks", characterId: EMPEROR_IDS.shanks, resource: "cheveux-roux-de-shanks", resourceName: "Cheveux roux de Shanks",
    keyResource: "cle-shanks", keyName: "Clé de Shanks", weapon: "griffon",
    crew: [[4882, 270493, 725, 8064], [4883, 17142, 149797, 2064]],
    blurb: "Son Haki endort quiconque est plus faible que lui.",
  },
  {
    key: "big-mom", name: "Big Mom", characterId: EMPEROR_IDS.bigMom, resource: "meche-de-big-mom", resourceName: "Mèche de Big Mom",
    keyResource: "cle-big-mom", keyName: "Clé de Big Mom", weapon: "napoleon",
    crew: [[134006, 7467, 85651, 40273], [124077, 4875, 1541, 5677]],
    blurb: "Elle dévore ceux qu'on ne sait pas défendre.",
  },
  {
    key: "kaido", name: "Kaido", characterId: EMPEROR_IDS.kaido, resource: "ecaille-de-kaido", resourceName: "Écaille de Kaido",
    keyResource: "cle-kaido", keyName: "Clé de Kaido", weapon: "hassaikai",
    crew: [[172135, 176840, 18827, 14989], [5677, 2749, 7453, 2754]],
    blurb: "Bête invincible, puis dragon.",
  },
  {
    key: "barbe-blanche", name: "Barbe Blanche", characterId: EMPEROR_IDS.whitebeard, resource: "moustache-de-barbe-blanche", resourceName: "Moustache de Barbe Blanche",
    keyResource: "cle-barbe-blanche", keyName: "Clé de Barbe Blanche", weapon: "murakumogiri",
    crew: [[9323, 2072, 3331, 18938], [2752, 21093, 22687, 2749]],
    blurb: "Le séisme d'un homme que rien n'arrête.",
  },
];
export const emperorOf = (key: string) => EMPERORS.find((e) => e.key === key);

/** Recette de chaque arme légendaire : ressource de l'empereur + ressource du donjon One Piece (niveau 10). */
export const EMPEROR_RECIPE = { legendary: 3, dungeon: 5 };
/** Chance qu'une victoire au niveau 10 du donjon One Piece laisse sa ressource de fabrication. */
export const DUNGEON_MATERIAL_CHANCE = 0.1;
export const DUNGEON_MATERIAL_LEVEL = 10;

/** Le Hardcore affronte les quatre empereurs ensemble ; leurs stats sont réduites pour rester jouables. */
export const HARDCORE_SCALE = 0.55;

export type EmperorTarget = { kind: "emperor"; emperor: Emperor; difficulty: RaidDifficulty } | { kind: "hardcore"; difficulty: RaidDifficulty };

export const emperorKey = (boss: string, difficulty: string) => `${EMPEROR_PREFIX}${boss}:${difficulty}`;
export function parseEmperorKey(key: string): EmperorTarget | null {
  if (!key.startsWith(EMPEROR_PREFIX)) return null;
  const [boss, diff] = key.slice(EMPEROR_PREFIX.length).split(":");
  const difficulty = difficultyOf(diff);
  if (!difficulty) return null;
  if (boss === HARDCORE_KEY) return { kind: "hardcore", difficulty };
  const emperor = emperorOf(boss);
  return emperor ? { kind: "emperor", emperor, difficulty } : null;
}

/** Quantité de ressource légendaire d'un passage : Normal 1, Difficile 1 à 2, Cauchemar 2 à 3. */
export function legendaryAmount(difficulty: string, rand: () => number): number {
  if (difficulty === "difficile") return 1 + (rand() < 0.5 ? 1 : 0);
  if (difficulty === "cauchemar") return 2 + (rand() < 0.5 ? 1 : 0);
  return 1;
}

/** Hardcore : une ressource de deux empereurs différents, tirés au sort. */
export function hardcoreDrops(rand: () => number): string[] {
  const pool = EMPERORS.map((e) => e.resource);
  const picked: string[] = [];
  while (picked.length < 2) picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return picked;
}

/** Une seule victoire par jour et par empereur (et pour le Hardcore) : clé du jour, heure du serveur. */
export const clearRecordKey = (boss: string, day: Date) => `emperor-clear:${boss}:${day.toISOString().slice(0, 10)}`;

export const EMPEROR_DIFFICULTIES = DIFFICULTIES;
export const ALL_LEGENDARY_RESOURCES = EMPERORS.map((e) => e.resource);
export const ALL_KEYS = EMPERORS.map((e) => e.keyResource);
