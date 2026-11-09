// Résumé du joueur pour le menu d'accueil.

import { prisma } from "./db";
import { getPackState, type PlayerPackState } from "./packs";
import { getWallet, type Wallet } from "./wallet";

export interface PlayerSummary {
  packs: PlayerPackState;
  wallet: Wallet;
  /** Cartes possédées, doublons compris */
  cards: number;
  /** Personnages différents possédés / total */
  owned: number;
  total: number;
  power: number;
}

export async function getPlayerSummary(userId: string): Promise<PlayerSummary> {
  const [packs, wallet, [counts], total] = await Promise.all([
    getPackState(userId),
    getWallet(userId),
    // Comptés par Postgres : une ligne au lieu d'une par personnage possédé (egress Supabase)
    prisma.$queryRaw<{ cards: bigint; owned: bigint }[]>`SELECT COUNT(*) AS cards, COUNT(DISTINCT "characterId") AS owned FROM "Card" WHERE "ownerId" = ${userId}`,
    prisma.character.count({ where: { disabled: false } }),
  ]);
  return { packs, wallet, cards: Number(counts.cards), owned: Number(counts.owned), total, power: packs.collectionPower };
}
