import type { Rarity } from "../generated/prisma/enums";

export const DUNGEON_KEY = "one-piece";
export const DUNGEON_NAME = "Le Trône des profondeurs";
export const DUNGEON_PREFIX = "dungeon:";
export const DUNGEON_RESOURCE = "materiau-donjon-one-piece";
export const ARTIFACT_SLOTS = ["CASQUE", "PLASTRON", "GANTS", "BOTTES"] as const;
export type ArtifactSlot = (typeof ARTIFACT_SLOTS)[number];
export const SLOT_NAMES: Record<ArtifactSlot, string> = { CASQUE: "Casque", PLASTRON: "Plastron", GANTS: "Gants", BOTTES: "Bottes" };
export const RARITIES: Rarity[] = ["N", "R", "SR", "SSR", "UR"];
export const DIFFICULTY_RARITY = (level: number): Rarity => RARITIES[Math.min(4, Math.floor((level - 1) / 2))];
export const dungeonKey = (level: number) => `${DUNGEON_PREFIX}${DUNGEON_KEY}:${level}`;
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
  const match = /^dungeon:one-piece:(\d{1,2})$/.exec(key);
  if (!match) return null;
  const level = Number(match[1]);
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
export interface ArtifactSubStat { stat: string; value: number }
export const artifactSubStats = (slot: ArtifactSlot, rarity: Rarity, seed: number, mainStat = artifactMainStat(slot, rarity, seed).stat): ArtifactSubStat[] => {
  const random = randomFor(seed);
  const base = ["N", "R", "SR", "SSR", "UR"].indexOf(rarity);
  const count = [1, 2, 3, 4, 4][base];
  const choices = ["magicSkill", "hp", "attack", "defense", "flatHp", "flatAttack", "flatDefense", "speed", "crit", "critDamage"].filter((stat) => stat !== mainStat);
  const max: Record<string, number> = { magicSkill: 0.025, hp: 0.025, attack: 0.025, defense: 0.03, flatHp: 90, flatAttack: 18, flatDefense: 18, speed: 2, crit: 0.025, critDamage: 0.05, dodge: 0.025 };
  const result: ArtifactSubStat[] = [];
  while (result.length < count && choices.length) {
    const stat = choices.splice(Math.floor(random() * choices.length), 1)[0];
    const quality = [0.8, 0.9, 1][Math.floor(random() * 3)];
    result.push({ stat, value: Math.round(max[stat] * quality * 10000) / 10000 });
  }
  return result;
};
export const setBonus = (pieces: number) => ({ attack: pieces >= 4 ? 0.1 : pieces >= 2 ? 0.05 : 0, critDamage: pieces >= 4 ? 0.15 : 0 });
export const levelReward = (level: number) => ({
  rarity: DIFFICULTY_RARITY(level),
  resource: level >= 7 ? 1 + Math.floor((level - 7) / 2) : 0,
  mechanic: level >= 10 ? "Marée noire : le boss frappe toute l’équipe et renforce sa défense." : level >= 7 ? "Vague écrasante : attaque de zone et affaiblissement." : level >= 4 ? "Carapace abyssale : dégâts de zone et bouclier." : "Aucune mécanique spéciale.",
});
