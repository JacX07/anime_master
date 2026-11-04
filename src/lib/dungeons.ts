import type { Rarity } from "../generated/prisma/enums";

export const DUNGEON_KEY = "one-piece";
export const DUNGEON_NAME = "Le Trône des profondeurs";
export const DUNGEON_PREFIX = "dungeon:";
export const DUNGEON_RESOURCE = "materiau-donjon-one-piece";
/** Un donjon par set, avec une progression indépendante. Les matériaux servent à la forge de son univers. */
export const DUNGEONS = [
  { key: "one-piece", universe: "One Piece", name: DUNGEON_NAME, description: "Une sentinelle des fonds garde les quatre reliques du Nouveau Monde.", franchiseId: 21, bossId: 40, resource: DUNGEON_RESOURCE, mechanics: ["Carapace abyssale", "Vague écrasante", "Marée noire"], bonus: "2 pièces : +5 % ATK. 4 pièces : +10 % ATK et +15 points de taux critique." },
  { key: "naruto", universe: "Naruto", name: "Le Sanctuaire du Sharingan", description: "Défie Madara et ses ninjas pour récupérer les reliques du shinobi.", franchiseId: 20, bossId: 53901, resource: "metal-a-chakra", mechanics: ["Armure de Susanoo", "Tempête de chakra", "Chute des météores"], bonus: "2 pièces : +5 points d’esquive. 4 pièces : +10 points d’esquive et +15 % de vitesse." },
  { key: "jujutsu-kaisen", universe: "Jujutsu Kaisen", name: "Le Sanctuaire malveillant", description: "Affronte Sukuna et ses exorcistes pour arracher les reliques maudites.", franchiseId: 113415, bossId: 133701, resource: "outil-maudit", mechanics: ["Barrière maudite", "Entaille dévastatrice", "Sanctuaire malveillant"], bonus: "2 pièces : +5 % de dégâts magiques. 4 pièces : +15 % de dégâts magiques et 50 points de jauge d’ultime par sort." },
  { key: "dragon-ball", universe: "Dragon Ball", name: "La Forteresse de Freeza", description: "Brise les défenses de Freeza et de sa garde pour gagner les reliques saiyan.", franchiseId: 813, bossId: 3694, resource: "armure-saiyan", mechanics: ["Barrière de ki", "Vague destructrice", "Supernova"], bonus: "2 pièces : +10 % de dégâts physiques et de DEF. 4 pièces : +20 % de dégâts physiques et de DEF." },
  { key: "bleach", universe: "Bleach", name: "Le Palais du Hueco Mundo", description: "Défie Aizen et ses gardiens pour récupérer les reliques du shinigami.", franchiseId: 269, bossId: 1086, resource: "fragment-de-zanpakuto", mechanics: ["Barrière spirituelle", "Pression spirituelle", "Éveil du Hōgyoku"], bonus: "2 pièces : +25 % de dégâts de saignement. 4 pièces : +40 % de dégâts de saignement et précision : les coups ne peuvent plus être esquivés." },
];
/** Un donjon s'ouvre quand le combat 10 de l'histoire du même univers est gagné ; un joueur qui y a déjà progressé le garde. */
export const DUNGEON_UNLOCK_LEVEL = 10;
export const dungeonUnlocked = (storyMaxLevel: number, dungeonMaxLevel: number) => storyMaxLevel >= DUNGEON_UNLOCK_LEVEL || dungeonMaxLevel > 0;
export type Dungeon = (typeof DUNGEONS)[number];
export const dungeonOf = (key: string) => DUNGEONS.find((d) => d.key === key);
export const dungeonOfKey = (key: string) => dungeonOf(key.split(":")[1]);
export const ARTIFACT_SLOTS = ["CASQUE", "PLASTRON", "GANTS", "BOTTES"] as const;
export type ArtifactSlot = (typeof ARTIFACT_SLOTS)[number];
export const SLOT_NAMES: Record<ArtifactSlot, string> = { CASQUE: "Casque", PLASTRON: "Plastron", GANTS: "Gants", BOTTES: "Bottes" };
export const RARITIES: Rarity[] = ["N", "R", "SR", "SSR", "UR"];
export const DIFFICULTY_RARITY = (level: number): Rarity => RARITIES[Math.min(4, Math.floor((level - 1) / 2))];
export const dungeonKey = (level: number, setKey = DUNGEON_KEY) => `${DUNGEON_PREFIX}${setKey}:${level}`;
const randomFor = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};
export const artifactSlot = (seed: number): ArtifactSlot => ARTIFACT_SLOTS[Math.floor(randomFor(seed ^ 0x51ed270b)() * ARTIFACT_SLOTS.length)];
export const parseDungeonKey = (key: string) => {
  const match = /^dungeon:([a-z-]+):(\d{1,2})$/.exec(key);
  if (!match || !dungeonOf(match[1])) return null;
  const level = Number(match[2]);
  if (level < 1 || level > 10) return null;
  return level;
};
export const artifactMainStat = (slot: ArtifactSlot, rarity: Rarity, seed: number) => {
  const tier = RARITIES.indexOf(rarity);
  const flatMainValues = { flatAttack: [20, 57, 140, 333, 653], flatDefense: [16, 45, 107, 249, 436], flatHp: [101, 285, 692, 1628, 3049] };
  const options: Record<string, number> = {
    flatAttack: flatMainValues.flatAttack[tier], flatDefense: flatMainValues.flatDefense[tier], flatHp: flatMainValues.flatHp[tier],
    attack: [0.025, 0.04, 0.065, 0.11, 0.16][tier], defense: [0.025, 0.04, 0.065, 0.11, 0.16][tier], hp: [0.025, 0.04, 0.065, 0.11, 0.16][tier],
    speed: [4, 6, 9, 13, 18][tier], magicSkill: [0.025, 0.04, 0.065, 0.11, 0.16][tier],
    crit: [0.03, 0.05, 0.08, 0.12, 0.16][tier], critDamage: [0.05, 0.1, 0.17, 0.26, 0.36][tier],
  };
  const stats = slot === "GANTS" ? ["flatAttack", "attack", "crit", "magicSkill", "critDamage"]
    : slot === "BOTTES" ? ["speed", "flatAttack", "flatDefense", "flatHp", "attack", "defense", "hp"]
    : ["flatHp", "flatDefense", "flatAttack", "hp", "defense", "attack"];
  const stat = stats[Math.floor(randomFor(seed ^ 0xa271)() * stats.length)];
  return { stat, value: options[stat] };
};
export const ARTIFACT_SUBSTAT_BASE: Record<string, number> = { magicSkill: 0.025, hp: 0.025, attack: 0.025, defense: 0.03, flatHp: 90, flatAttack: 18, flatDefense: 18, speed: 2, crit: 0.025, critDamage: 0.05 };
export type ArtifactSubStat = { stat: string; value: number };
export const artifactSubStats = (slot: ArtifactSlot, rarity: Rarity, seed: number, mainStat = artifactMainStat(slot, rarity, seed).stat, count = [0, 1, 2, 3, 3][RARITIES.indexOf(rarity)]): ArtifactSubStat[] => {
  const random = randomFor(seed);
  const choices = ["magicSkill", "hp", "attack", "defense", "flatHp", "flatAttack", "flatDefense", "speed", "crit", "critDamage"].filter((stat) => stat !== mainStat);

  const result: ArtifactSubStat[] = [];
  while (result.length < count && choices.length) {
    const stat = choices.splice(Math.floor(random() * choices.length), 1)[0];
    const quality = [0.8, 0.9, 1][Math.floor(random() * 3)];
    result.push({ stat, value: Math.round(ARTIFACT_SUBSTAT_BASE[stat] * quality * 10000) / 10000 });
  }
  return result;
};
/** Bonus de set par univers (docs/specs/donjons.md, « Sets »). Le bonus à 4 pièces remplace celui à 2 pièces. */
export interface SetBonus {
  attack?: number; defense?: number; crit?: number; dodge?: number; speedPct?: number;
  physDamage?: number; magicDamage?: number;
  /** Jauge d'ultime gagnée par sort actif (34 par défaut) */
  gaugePerSpell?: number;
  /** Multiplicateur des dégâts de saignement infligés (0,25 = +25 %) */
  bleedBonus?: number;
  /** 1 : les attaques ne peuvent plus être esquivées */
  precision?: number;
}
const SET_BONUSES: Record<string, [SetBonus, SetBonus]> = {
  "one-piece": [{ attack: 0.05 }, { attack: 0.1, crit: 0.15 }],
  naruto: [{ dodge: 0.05 }, { dodge: 0.1, speedPct: 0.15 }],
  "jujutsu-kaisen": [{ magicDamage: 0.05 }, { magicDamage: 0.15, gaugePerSpell: 50 }],
  "dragon-ball": [{ physDamage: 0.1, defense: 0.1 }, { physDamage: 0.2, defense: 0.2 }],
  bleach: [{ bleedBonus: 0.25 }, { bleedBonus: 0.4, precision: 1 }],
};
export const SET_KEYS = Object.keys(SET_BONUSES);
export const setBonus = (setKey: string, pieces: number): SetBonus => {
  const tiers = SET_BONUSES[setKey];
  return !tiers ? {} : pieces >= 4 ? tiers[1] : pieces >= 2 ? tiers[0] : {};
};
export const levelReward = (level: number, dungeon = DUNGEONS[0]) => ({
  rarity: DIFFICULTY_RARITY(level),
  resource: level >= 7 ? 1 + Math.floor((level - 7) / 2) : 0,
  mechanic: level >= 10 ? `${dungeon.mechanics[2]} : le boss frappe toute l’équipe et renforce sa défense.` : level >= 7 ? `${dungeon.mechanics[1]} : attaque de zone et affaiblissement.` : level >= 4 ? `${dungeon.mechanics[0]} : dégâts de zone et bouclier.` : "Aucune mécanique spéciale.",
});
