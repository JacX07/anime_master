// Éveil d'une carte (étoiles 1 à 3) : débit des ressources et gain d'une étoile dans une seule transaction.

import { awakenCost, STORY_MAX_STARS, universeOfFranchise, type Cost } from "./awakening";
import { BattleError } from "./battles";
import { prisma } from "./db";

export async function awakenCard(userId: string, cardId: string): Promise<{ stars: number; cost: Cost }> {
  return prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({
      where: { id: cardId },
      select: { ownerId: true, stars: true, inAuction: true, character: { select: { rarity: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } } } },
    });
    if (!card || card.ownerId !== userId) throw new BattleError("Carte introuvable.");
    if (card.inAuction) throw new BattleError("Cette carte est en vente aux enchères.");
    if (card.stars >= STORY_MAX_STARS) {
      throw new BattleError(card.stars >= 5 ? "Cette carte est déjà à 5 étoiles." : "Les étoiles 4 et 5 demanderont la ressource rare du raid, pas encore disponible.");
    }
    const universe = universeOfFranchise(card.character.mainMedia?.franchiseId ?? card.character.mainMediaId);
    const cost = awakenCost(card.character.rarity, card.stars + 1, universe);
    // Étoile d'abord, avec le niveau attendu : deux clics simultanés ne paient qu'une fois.
    const up = await tx.card.updateMany({ where: { id: cardId, ownerId: userId, stars: card.stars }, data: { stars: { increment: 1 } } });
    if (up.count !== 1) throw new BattleError("La carte a changé, réessaie.");
    for (const c of cost) {
      const paid = await tx.resourceStock.updateMany({ where: { userId, key: c.key, quantity: { gte: c.quantity } }, data: { quantity: { decrement: c.quantity } } });
      if (paid.count !== 1) throw new BattleError("Ressources insuffisantes.");
    }
    return { stars: card.stars + 1, cost };
  });
}
