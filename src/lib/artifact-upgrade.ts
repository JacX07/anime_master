import type { Rarity } from "../generated/prisma/enums";

export const ARTIFACT_MAX_LEVEL = 16;
/** Coût réduit pour rendre la progression jusqu’à +16 accessible. */
export const artifactUpgradeCost = (rarity: Rarity, level: number) => ({ N: 25, R: 35, SR: 50, SSR: 75, UR: 100 }[rarity]) * (level + 1);
export const upgradedMainValue = (value: number, level: number) => Math.round(value / (1 + level * 0.05) * (1 + (level + 1) * 0.05) * 1e6) / 1e6;

/** Un seul tirage par palier ; une même sous-stat peut être doublée plusieurs fois. */
export function upgradedSubStats(stats: { stat: string; value: number }[], nextLevel: number, random = Math.random) {
  if (nextLevel % 4 !== 0 || stats.length === 0) return stats;
  const index = Math.floor(random() * stats.length);
  return stats.map((sub, i) => i === index ? { ...sub, value: Math.round(sub.value * 2 * 1e6) / 1e6 } : sub);
}
