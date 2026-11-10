import { artifactSubStats, mainValueAt, type ArtifactSubStat } from "./dungeons";
import type { Rarity } from "../generated/prisma/enums";

export const ARTIFACT_MAX_LEVEL = 16;
/** Coût réduit (v0.3.0, environ ÷2) pour que les équipements du début restent utiles. */
export const artifactUpgradeCost = (rarity: Rarity, level: number) => ({ N: 10, R: 15, SR: 25, SSR: 40, UR: 55 }[rarity]) * (level + 1);
/** Coût total pour passer de `from` à `to` (niveaux successifs, chacun à son prix). */
export function artifactUpgradeTotal(rarity: Rarity, from: number, to: number) {
  let total = 0;
  for (let l = from; l < to; l++) total += artifactUpgradeCost(rarity, l);
  return total;
}
/** Recyclage (v0.3.0) : valeur de base selon la rareté, plus 70 % des Ryō dépensés pour l'améliorer. */
export const ARTIFACT_RECYCLE_BASE = { N: 10, R: 25, SR: 60, SSR: 150, UR: 300 } as const;
export const artifactRecycleValue = (rarity: Rarity, level: number) => ARTIFACT_RECYCLE_BASE[rarity] + Math.floor(artifactUpgradeTotal(rarity, 0, level) * 0.7);
/** Stat principale au niveau suivant : formule fixe par stat (v0.3.0), indépendante de la rareté. */
export const upgradedMainValue = (stat: string, level: number) => mainValueAt(stat, level + 1);

/** Chaque palier découvre une stat distincte ; à quatre stats, il double une valeur. */
export function upgradedSubStats(stats: ArtifactSubStat[], nextLevel: number, mainStat: string, random = Math.random, rarity: Rarity = "SSR") {
  if (nextLevel <= 0 || nextLevel % 4 !== 0) return stats;
  if (stats.length < 4) {
    const candidates = artifactSubStats("CASQUE", rarity, Math.floor(random() * 4294967296), mainStat, 4);
    const sub = candidates.find((candidate) => !stats.some((existing) => existing.stat === candidate.stat));
    // Quatre candidats garantissent un choix tant que moins de quatre stats sont révélées.
    return [...stats, sub!];
  }
  const index = Math.floor(random() * stats.length);
  return stats.map((sub, i) => i === index ? { ...sub, value: Math.round(sub.value * 2 * 1e6) / 1e6 } : sub);
}
