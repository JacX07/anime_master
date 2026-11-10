import { Prisma } from "../generated/prisma/client";
import { afterGain } from "./crystal-stock";
import { prisma } from "./db";
import { BattleError, getStoryProgress } from "./battles";
import { starTier, starTierLoot } from "./story-star-rewards";
import { universeOf } from "./story";

/** Étoiles de chaque univers, d'après le meilleur score de chaque combat. */
export const sumStars = (stars: Record<number, number>) => Object.values(stars).reduce((n, s) => n + s, 0);

/** Paliers déjà réclamés, par univers. */
export async function getStarClaims(userId: string) {
  const rows = await prisma.storyStarClaim.findMany({ where: { userId } });
  const out: Record<string, number[]> = {};
  for (const r of rows) (out[r.universe] ??= []).push(r.tier);
  return out;
}

/** Réclame un palier : verse le butin et note la réclamation dans la même transaction (jamais deux fois). */
export async function claimStarTier(userId: string, universeKey: string, tierNumber: number, now = new Date()) {
  const universe = universeOf(universeKey);
  const tier = starTier(tierNumber);
  if (!universe || !tier) throw new BattleError("Palier inconnu.");
  const progress = (await getStoryProgress(userId)).find((p) => p.universe === universe);
  const have = tier.duo ? progress?.duo.length ?? 0 : progress ? sumStars(progress.stars) : 0;
  if (!progress?.unlocked || have < tier.stars) throw new BattleError(tier.duo ? "Il te manque des étoiles bonus (victoires en duo)." : "Il te manque des étoiles pour ce palier.");
  const loot = starTierLoot(universe, tier);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.storyStarClaim.create({ data: { userId, universe: universe.key, tier: tier.tier } });
      for (const [key, quantity] of Object.entries(loot.resources)) {
        await tx.resourceStock.upsert({ where: { userId_key: { userId, key } }, create: { userId, key, quantity }, update: { quantity: { increment: quantity } } });
      }
      const u = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { crystals: true, crystalsUpdatedAt: true } });
      await tx.user.update({ where: { id: userId }, data: { balance: { increment: loot.ryo }, ...afterGain(u.crystals, u.crystalsUpdatedAt, now, loot.crystals) } });
      await tx.currencyLedger.create({ data: { userId, amount: loot.ryo, reason: "STORY", refId: `stars:${universe.key}:${tier.tier}` } });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new BattleError("Palier déjà réclamé.");
    throw e;
  }
  return loot;
}
