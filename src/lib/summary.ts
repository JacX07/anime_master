// Résumé du joueur pour le menu d'accueil.

import { getCollectionPower } from "./collection";
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
  const [packs, wallet, cards, ownedGroups, total, power] = await Promise.all([
    getPackState(userId),
    getWallet(userId),
    prisma.card.count({ where: { ownerId: userId } }),
    prisma.card.groupBy({ by: ["characterId"], where: { ownerId: userId } }),
    prisma.character.count({ where: { disabled: false } }),
    getCollectionPower(userId),
  ]);
  return { packs, wallet, cards, owned: ownedGroups.length, total, power };
}
