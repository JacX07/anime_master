// Puissance totale d'une collection : somme de la puissance de chaque carte possédée (doublons compris).

import { prisma } from "./db";

type CardDb = { card: typeof prisma.card };

export async function getCollectionPower(userId: string, db: CardDb = prisma): Promise<number> {
  const cards = await db.card.findMany({ where: { ownerId: userId }, select: { character: { select: { power: true } } } });
  return cards.reduce((sum, c) => sum + c.character.power, 0);
}
