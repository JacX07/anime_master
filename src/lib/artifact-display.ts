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
  // Mêmes couleurs que les raretés des personnages (--rarity-*) ; l'UR a son propre nom (v0.3.0)
  N: { label: "Commun", tone: "gray" as const, color: "#94a3b8" },
  R: { label: "Rare", tone: "blue" as const, color: "#38bdf8" },
  SR: { label: "Épique", tone: "violet" as const, color: "#a855f7" },
  SSR: { label: "Légendaire", tone: "gold" as const, color: "#f59e0b" },
  UR: { label: "Mythique", tone: "gold" as const, color: "#ff3b4a" },
}[rarity]);

export const ONE_PIECE_ARTIFACT_NAMES: Record<string, string> = {
  CASQUE: "Chapeau de paille de Luffy",
  PLASTRON: "Gilet rouge de Luffy",
  GANTS: "Mitaines du Thousand Sunny",
  BOTTES: "Bottes de Grand Line",
};

/** Noms et illustrations des pièces de set (public/images/artifacts/sets/<set>/<emplacement>.webp) ; les sets sans entrée gardent un nom générique et aucune image. */
export const SET_ARTIFACTS: Record<string, Record<string, string>> = {
  "one-piece": ONE_PIECE_ARTIFACT_NAMES,
  naruto: { CASQUE: "Bandeau de Konoha", PLASTRON: "Veste de shinobi", GANTS: "Gants de shinobi", BOTTES: "Sandales de ninja" },
  "jujutsu-kaisen": { CASQUE: "Bandeau de l'Infini", PLASTRON: "Veste de sorcier", GANTS: "Gants de l'Infini", BOTTES: "Bottes de sorcier" },
  "dragon-ball": { CASQUE: "Scouter saiyan", PLASTRON: "Kimono de combat", GANTS: "Poignets d'entraînement", BOTTES: "Bottes saiyan" },
};
const SLOT_FILES: Record<string, string> = { CASQUE: "helmet", PLASTRON: "breastplate", GANTS: "gauntlets", BOTTES: "boots" };
export const artifactImage = (setKey: string, slot: string) => (SET_ARTIFACTS[setKey] && SLOT_FILES[slot] ? `/images/artifacts/sets/${setKey}/${SLOT_FILES[slot]}.webp` : undefined);

/** Les tirages valent 80–100 % de la base ; chaque amélioration double cette valeur. */
export function artifactSubstatUpgrades(sub: { stat: string; value: number }) {
  const base = ARTIFACT_SUBSTAT_BASE[sub.stat];
  return base && sub.value > 0 ? Math.max(0, Math.ceil(Math.log2(sub.value / base) - 1e-8)) : 0;
}

export const artifactStatIcon = (stat: string) => ({ speed: "speed", crit: "eveil", critDamage: "eveil", defense: "def", flatDefense: "def", hp: "hp", flatHp: "hp", attack: "atk", flatAttack: "atk", magicSkill: "magie", dodge: "aventure" }[stat] ?? "puissance");
