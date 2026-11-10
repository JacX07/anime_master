// Personnages favoris (v0.3.0) : filtre « Favoris » et tri favoris en premier.
import { prisma } from "./db";

export async function getFavoriteIds(userId: string) {
  return (await prisma.favoriteCharacter.findMany({ where: { userId }, select: { characterId: true } })).map((f) => f.characterId);
}

/** Bascule un favori ; seul un personnage possédé peut être ajouté. */
export async function toggleFavorite(userId: string, characterId: number, on: boolean) {
  if (!Number.isSafeInteger(characterId)) throw new Error("Personnage invalide.");
  if (!on) {
    await prisma.favoriteCharacter.deleteMany({ where: { userId, characterId } });
    return false;
  }
  const owned = await prisma.card.count({ where: { ownerId: userId, characterId } });
  if (!owned) throw new Error("Tu ne possèdes pas ce personnage.");
  await prisma.favoriteCharacter.createMany({ data: [{ userId, characterId }], skipDuplicates: true });
  return true;
}
