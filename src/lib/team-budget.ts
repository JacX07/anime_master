import type { Rarity } from "@/generated/prisma/enums";

/** Budget d'équipe 4v4 (v0.3.0) : la rareté ne décide pas tout. Hors raids. */
export const TEAM_BUDGET = 24;
export const RARITY_COST: Record<Rarity, number> = { N: 1, R: 2, SR: 3, SSR: 5, UR: 8 };
export const teamCost = (rarities: readonly Rarity[]) => rarities.reduce((sum, r) => sum + RARITY_COST[r], 0);
export const overBudget = (rarities: readonly Rarity[]) => rarities.length > 2 && teamCost(rarities) > TEAM_BUDGET;
export const budgetMessage = (rarities: readonly Rarity[]) => `Budget d'équipe dépassé : ${teamCost(rarities)}/${TEAM_BUDGET} (UR 8, SSR 5, SR 3, R 2, N 1).`;
