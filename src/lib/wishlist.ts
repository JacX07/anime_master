// Liste de souhaits (SPEC étape 3, §5) : notification quand un personnage souhaité est mis aux enchères ou tagué « À échanger ».

import type { Finish } from "../generated/prisma/enums";
import { prisma } from "./db";
import { notify } from "./notifications";

export class WishlistError extends Error {}

const FINISHES: readonly string[] = ["NORMAL", "HOLO", "GOLD"];
export const MAX_WISHES = 200;

export async function addWish(userId: string, characterId: number, finish: Finish | null) {
  if (!Number.isInteger(characterId)) throw new WishlistError("Personnage invalide.");
  if (finish !== null && !FINISHES.includes(finish)) throw new WishlistError("Finition invalide.");
  const character = await prisma.character.findUnique({ where: { id: characterId }, select: { id: true } });
  if (!character) throw new WishlistError("Personnage introuvable.");
  if ((await prisma.wishlistItem.count({ where: { userId } })) >= MAX_WISHES) throw new WishlistError(`${MAX_WISHES} souhaits maximum.`);
  // SQLite considère deux NULL comme distincts : pas de contrainte d'unicité, on vérifie à la main
  const exists = await prisma.wishlistItem.findFirst({ where: { userId, characterId, finish }, select: { id: true } });
  if (!exists) await prisma.wishlistItem.create({ data: { userId, characterId, finish } });
}

export async function removeWish(userId: string, wishId: string) {
  await prisma.wishlistItem.deleteMany({ where: { id: wishId, userId } });
}

export async function listWishes(userId: string) {
  const rows = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, finish: true, character: { select: { id: true, name: true, rarity: true, imageUrl: true } } },
  });
  const owned = await prisma.card.findMany({ where: { ownerId: userId, characterId: { in: rows.map((r) => r.character.id) } }, select: { characterId: true, finish: true } });
  return rows.map((r) => ({ ...r, owned: owned.some((c) => c.characterId === r.character.id && (r.finish === null || c.finish === r.finish)) }));
}

export async function wishesFor(userId: string, characterId: number) {
  return prisma.wishlistItem.findMany({ where: { userId, characterId }, select: { id: true, finish: true } });
}

/** Prévient les joueurs qui souhaitent ce personnage (avec cette finition ou n'importe laquelle), sauf le propriétaire de la carte. */
export async function notifyWishers(args: { characterId: number; finish: Finish; ownerId: string; characterName: string; source: "auction" | "trade"; auctionId?: string; username?: string }) {
  const wishers = await prisma.wishlistItem.findMany({
    where: { characterId: args.characterId, userId: { not: args.ownerId }, OR: [{ finish: null }, { finish: args.finish }] },
    select: { userId: true },
    distinct: ["userId"],
  });
  for (const w of wishers) await notify(prisma, w.userId, "WISHED_AVAILABLE", { auctionId: args.auctionId, character: args.characterName, username: args.username, source: args.source, characterId: args.characterId });
}
