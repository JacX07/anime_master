// Règles de l'économie (SPEC étape 3, §2) : pures, sans accès à la base.

import type { Rarity } from "../generated/prisma/enums";
import type { Finish } from "./pull";

export const DAILY_BONUS = 50;

export const QUICK_SELL_PRICES: Record<Rarity, number> = { N: 1, R: 3, SR: 10, SSR: 40, UR: 200 };
export const FINISH_MULTIPLIER: Record<Finish, number> = { NORMAL: 1, HOLO: 3, GOLD: 10 };

/** Prix de vente rapide : rareté *actuelle* du personnage × multiplicateur de finition. */
export const quickSellPrice = (rarity: Rarity, finish: Finish) => QUICK_SELL_PRICES[rarity] * FINISH_MULTIPLIER[finish];

/** Début de la journée (minuit, heure du serveur) : le bonus quotidien se réclame une fois par jour. */
export function startOfDay(now: Date) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const canClaimDailyBonus = (lastClaim: Date | null, now: Date) => lastClaim === null || lastClaim < startOfDay(now);

const FINISH_RANK: Record<Finish, number> = { GOLD: 0, HOLO: 1, NORMAL: 2 };

export interface SellableCopy {
  id: string;
  characterId: number;
  finish: Finish;
  serial: number;
  locked: boolean;
}

/**
 * Doublons à vendre en groupe : pour chaque personnage on garde l'exemplaire de meilleure finition
 * (à finition égale, le plus petit numéro d'exemplaire) ; les cartes verrouillées ne sont jamais vendues.
 */
export function pickDuplicates<T extends SellableCopy>(copies: T[]): T[] {
  const byCharacter = new Map<number, T[]>();
  for (const c of copies) byCharacter.set(c.characterId, [...(byCharacter.get(c.characterId) ?? []), c]);
  const sold: T[] = [];
  for (const group of byCharacter.values()) {
    if (group.length < 2) continue;
    const [best, ...others] = [...group].sort((a, b) => FINISH_RANK[a.finish] - FINISH_RANK[b.finish] || a.serial - b.serial);
    void best;
    sold.push(...others.filter((c) => !c.locked));
  }
  return sold;
}
