import { ARTIFACT_SUBSTAT_BASE } from "./dungeons";
import type { Rarity } from "../generated/prisma/enums";
const labels: Record<string, string> = {
  magicSkill: "Compétence magique", hp: "PV", attack: "ATK", defense: "DEF", flatHp: "PV", flatAttack: "ATK", flatDefense: "DEF",
  crit: "Chance de critique", critDamage: "Dégâts critiques", speed: "Vitesse", dodge: "Esquive",
};
const percentStats = new Set(["magicSkill", "hp", "attack", "defense", "crit", "critDamage", "dodge"]);
const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export const artifactStatLabel = (stat: string) => labels[stat] ?? stat;
export const artifactStatValue = (stat: string, value: number) =>
  `+${number.format(percentStats.has(stat) ? value * 100 : value)}${percentStats.has(stat) ? " %" : ""}`;

/** Quatre familles visuelles ; les valeurs des anciens grades SSR/UR restent intactes. */
export const artifactRarity = (rarity: Rarity) => ({
  N: { label: "Commun", tone: "gray" as const, color: "#a7b4c9" },
  R: { label: "Rare", tone: "blue" as const, color: "#65b9ff" },
  SR: { label: "Épique", tone: "violet" as const, color: "#b68bff" },
  SSR: { label: "Légendaire", tone: "gold" as const, color: "#ffc45c" },
  UR: { label: "Légendaire", tone: "gold" as const, color: "#ffc45c" },
}[rarity]);

export const ONE_PIECE_ARTIFACT_NAMES: Record<string, string> = {
  CASQUE: "Chapeau de paille de Luffy",
  PLASTRON: "Gilet rouge de Luffy",
  GANTS: "Mitaines du Thousand Sunny",
  BOTTES: "Bottes de Grand Line",
};

/** Les tirages valent 80–100 % de la base ; chaque amélioration double cette valeur. */
export function artifactSubstatUpgrades(sub: { stat: string; value: number }) {
  const base = ARTIFACT_SUBSTAT_BASE[sub.stat];
  return base && sub.value > 0 ? Math.max(0, Math.ceil(Math.log2(sub.value / base) - 1e-8)) : 0;
}

export const artifactStatIcon = (stat: string) => ({ speed: "speed", crit: "eveil", critDamage: "eveil", defense: "def", flatDefense: "def", hp: "hp", flatHp: "hp", attack: "atk", flatAttack: "atk", magicSkill: "magie", dodge: "aventure" }[stat] ?? "puissance");
