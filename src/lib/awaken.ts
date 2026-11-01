// Éveil d'une carte : débit des ressources et gain d'une étoile dans une seule transaction.
// Étoiles 1 à 3 : ressources de l'histoire. Étoiles 4 et 5 (SSR, UR) : cœurs de brèche et un doublon consommé.

import type { Prisma } from "../generated/prisma/client";
import { awakenCost, canAwaken, MAX_STARS, needsDuplicate, universeOfFranchise, type Cost } from "./awakening";
import { BattleError } from "./battles";
import { prisma } from "./db";

/** Un exemplaire peut être consommé comme doublon : ni verrouillé, ni en vente, ni en expédition, ni dans une équipe, ni dans un échange en attente. */
export const duplicateWhere = (userId: string, characterId: number, exceptCardId: string): Prisma.CardWhereInput => ({
  ownerId: userId, characterId, id: { not: exceptCardId },
  locked: false, inAuction: false, inExpedition: false, weaponKey: null,
  teamSlots: { none: {} },
  tradeItems: { none: { trade: { status: "PENDING" } } },
});

export async function awakenCard(userId: string, cardId: string): Promise<{ stars: number; cost: Cost; consumed: boolean }> {
  return prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({
      where: { id: cardId },
      select: { ownerId: true, characterId: true, stars: true, inAuction: true, character: { select: { rarity: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } } } },
    });
    if (!card || card.ownerId !== userId) throw new BattleError("Carte introuvable.");
    if (card.inAuction) throw new BattleError("Cette carte est en vente aux enchères.");
    const to = card.stars + 1, rarity = card.character.rarity;
    if (card.stars >= MAX_STARS) throw new BattleError("Cette carte est déjà à 5 étoiles.");
    if (!canAwaken(rarity, to)) throw new BattleError("Les cartes N, R et SR s'arrêtent à 3 étoiles.");
    const universe = universeOfFranchise(card.character.mainMedia?.franchiseId ?? card.character.mainMediaId);
    const cost = awakenCost(rarity, to, universe);
    // Doublon : le moins avancé, puis le moins précieux (finition normale d'abord), puis le plus récent
    let duplicate: string | null = null;
    if (needsDuplicate(to)) {
      const dup = await tx.card.findMany({ where: duplicateWhere(userId, card.characterId, cardId), select: { id: true, stars: true, finish: true, serial: true } });
      const rank = { NORMAL: 0, HOLO: 1, GOLD: 2 } as Record<string, number>;
      dup.sort((a, b) => a.stars - b.stars || (rank[a.finish] ?? 0) - (rank[b.finish] ?? 0) || b.serial - a.serial);
      duplicate = dup[0]?.id ?? null;
      if (!duplicate) throw new BattleError("Il te faut un doublon libre de ce personnage (ni verrouillé, ni en équipe, ni en vente ou en échange).");
    }
    // Étoile d'abord, avec le niveau attendu : deux clics simultanés ne paient qu'une fois.
    const up = await tx.card.updateMany({ where: { id: cardId, ownerId: userId, stars: card.stars }, data: { stars: { increment: 1 } } });
    if (up.count !== 1) throw new BattleError("La carte a changé, réessaie.");
    for (const c of cost) {
      const paid = await tx.resourceStock.updateMany({ where: { userId, key: c.key, quantity: { gte: c.quantity } }, data: { quantity: { decrement: c.quantity } } });
      if (paid.count !== 1) throw new BattleError("Ressources insuffisantes.");
    }
    if (duplicate) {
      const gone = await tx.card.deleteMany({ where: { id: duplicate, ...duplicateWhere(userId, card.characterId, cardId) } });
      if (gone.count !== 1) throw new BattleError("Le doublon n'est plus disponible, réessaie.");
    }
    return { stars: to, cost, consumed: !!duplicate };
  });
}
