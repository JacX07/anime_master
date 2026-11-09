// Puissance totale d'une collection : somme de la puissance de chaque carte possédée (doublons compris).

import { prisma } from "./db";

type Db = Pick<typeof prisma, "$queryRaw">;

/** Somme calculée par Postgres : une ligne renvoyée au lieu de toute la collection (egress Supabase). */
export async function getCollectionPower(userId: string, db: Db = prisma): Promise<number> {
  const [row] = await db.$queryRaw<{ power: bigint | null }[]>`
    SELECT SUM(ch."power") AS power FROM "Card" c JOIN "Character" ch ON ch.id = c."characterId" WHERE c."ownerId" = ${userId}`;
  return Number(row?.power ?? 0);
}
