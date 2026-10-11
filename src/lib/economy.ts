// Règles de l'économie (SPEC étape 3, §2) : pures, sans accès à la base.

import type { Rarity } from "../generated/prisma/enums";
import type { Finish } from "./pull";

export const DAILY_BONUS = 50;
export const PACK_PRICE = 100;
export const MAX_PACK_PURCHASES_PER_DAY = 5;

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

/** Achats restants aujourd'hui, sachant combien en ont été faits le jour `boughtDate`. */
export function purchasesLeft(boughtToday: number, boughtDate: Date | null, now: Date) {
  const done = boughtDate && boughtDate >= startOfDay(now) ? boughtToday : 0;
  return Math.max(0, MAX_PACK_PURCHASES_PER_DAY - done);
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

// ---------- Échanges (SPEC étape 3, §3 et §7) ----------

export const TRADE_MIN_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000;
export const TRADE_MIN_OPENINGS = 20;
export const TRADE_LIFETIME_MS = 48 * 60 * 60 * 1000;
export const MAX_PENDING_TRADES = 10;

/** Échanges et enchères : compte de plus de 24 h et au moins 20 paquets ouverts. */
export function tradeEligibility(createdAt: Date, openings: number, now: Date): { ok: true } | { ok: false; reason: string } {
  if (now.getTime() - createdAt.getTime() < TRADE_MIN_ACCOUNT_AGE_MS) return { ok: false, reason: "le compte a moins de 24 h" };
  if (openings < TRADE_MIN_OPENINGS) return { ok: false, reason: `il faut au moins ${TRADE_MIN_OPENINGS} paquets ouverts (${openings} pour l'instant)` };
  return { ok: true };
}

// ---------- Enchères (SPEC étape 3, §4) ----------

export const AUCTION_DURATIONS_H = [1, 6, 24, 72] as const;
export const AUCTION_FEE_RATE = 0.05;
export const ANTI_SNIPING_MS = 2 * 60 * 1000;
export const MAX_ACTIVE_AUCTIONS = 10;

/** Offre minimale : max(prix de départ, offre actuelle × 1,05 arrondi au supérieur, offre actuelle + 1). */
export function minBid(startPrice: number, currentBid: number | null): number {
  if (currentBid === null) return startPrice;
  return Math.max(startPrice, Math.ceil(currentBid * 1.05), currentBid + 1);
}

/** Montant reçu par le vendeur : prix moins 5 %, arrondi à l'inférieur (la taxe est détruite). */
export const sellerProceeds = (price: number) => Math.floor(price * (1 - AUCTION_FEE_RATE));

/** Fin de l'enchère après une offre à `now` : repoussée à now + 2 min si elle tombe dans les 2 dernières minutes. */
export function endAfterBid(endsAt: Date, now: Date): Date {
  return endsAt.getTime() - now.getTime() <= ANTI_SNIPING_MS ? new Date(now.getTime() + ANTI_SNIPING_MS) : endsAt;
}

// ---------- Classement Collection (SPEC étape 4, §5) ----------

export const COLLECTION_POINTS: Record<Rarity, number> = { N: 1, R: 3, SR: 10, SSR: 40, UR: 200 };

/** Valeur d'un personnage unique : sa rareté actuelle, +50 % si on a la Holo, +100 % si on a la Gold. */
export const collectionValue = (rarity: Rarity, hasHolo: boolean, hasGold: boolean) =>
  COLLECTION_POINTS[rarity] * (1 + (hasHolo ? 0.5 : 0) + (hasGold ? 1 : 0));
