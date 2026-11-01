import type { Rarity } from "../generated/prisma/enums";

export const ARTIFACT_MAX_LEVEL = 10;
/** Prix provisoires : une amélioration garantie augmente uniquement la stat principale. */
export const artifactUpgradeCost = (rarity: Rarity, level: number) => ({ N: 100, R: 150, SR: 200, SSR: 300, UR: 400 }[rarity]) * (level + 1);
export const upgradedMainValue = (value: number, level: number) => Math.round(value / (1 + level * 0.05) * (1 + (level + 1) * 0.05) * 1e6) / 1e6;
