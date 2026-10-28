// Profil public (SPEC étape 5, §1) : pseudo, titre, statistiques, succès et vitrine de 6 personnages au plus.

import { ACHIEVEMENTS, titleOf } from "./achievements";
import { loadAnimeIndex } from "./anime";
import { entriesFor, RARITY_ORDER, type AlbumEntry } from "./album";
import { getCollectionPower } from "./collection";
import { prisma } from "./db";

export const SHOWCASE_MAX = 6;

export class ProfileError extends Error {}

export interface Profile {
  id: string;
  username: string;
  title: string | null;
  titleKey: string | null;
  since: Date;
  unique: number;
  power: number;
  expeditions: number;
  duelWins: number;
  completedAnime: string[];
  achievements: { key: string; label: string; description: string; title: string; unlockedAt: Date | null }[];
  showcase: AlbumEntry[];
}

/** Profil d'un joueur par son pseudo (stocké en minuscules), ou null s'il n'existe pas. */
export async function getProfile(username: string): Promise<Profile | null> {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, username: true, title: true, createdAt: true, expeditionsDone: true },
  });
  if (!user) return null;
  const [cards, power, duelWins, unlocked, pinned, anime] = await Promise.all([
    prisma.card.findMany({ where: { ownerId: user.id }, select: { characterId: true }, distinct: ["characterId"] }),
    getCollectionPower(user.id),
    prisma.duel.count({ where: { winnerId: user.id, status: { in: ["DONE", "FORFEIT"] } } }),
    prisma.userAchievement.findMany({ where: { userId: user.id }, select: { key: true, unlockedAt: true } }),
    prisma.showcaseCharacter.findMany({ where: { userId: user.id }, orderBy: { position: "asc" }, select: { characterId: true } }),
    loadAnimeIndex(),
  ]);
  const owned = new Set(cards.map((c) => c.characterId));
  const at = new Map(unlocked.map((u) => [u.key, u.unlockedAt]));
  // Une carte vendue ou échangée disparaît de la vitrine : on ne garde que ce que le joueur possède encore
  const showcase = (await entriesFor(user.id, pinned.map((p) => p.characterId).filter((id) => owned.has(id)))).slice(0, SHOWCASE_MAX);
  const titleKey = user.title && at.has(user.title) ? user.title : null;
  return {
    id: user.id,
    username: user.username,
    title: titleOf(titleKey),
    titleKey,
    since: user.createdAt,
    unique: owned.size,
    power,
    expeditions: user.expeditionsDone,
    duelWins,
    completedAnime: anime.listed.filter((a) => a.characterIds.every((id) => owned.has(id))).map((a) => a.title).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })),
    achievements: ACHIEVEMENTS.map((a) => ({ key: a.key, label: a.label, description: a.description, title: a.title, unlockedAt: at.get(a.key) ?? null })),
    showcase,
  };
}

/** Équipe le titre d'un succès débloqué (null : aucun titre). */
export async function setTitle(userId: string, key: string | null) {
  if (key !== null) {
    const have = await prisma.userAchievement.findUnique({ where: { userId_key: { userId, key } }, select: { key: true } });
    if (!have || !titleOf(key)) throw new ProfileError("Ce titre n'est pas débloqué.");
  }
  await prisma.user.update({ where: { id: userId }, data: { title: key } });
}

/** Remplace la vitrine : jusqu'à 6 personnages que le joueur possède, dans l'ordre donné. */
export async function setShowcase(userId: string, ids: number[]) {
  const unique = [...new Set(ids.filter((n) => Number.isInteger(n)))];
  if (unique.length > SHOWCASE_MAX) throw new ProfileError(`${SHOWCASE_MAX} personnages au plus.`);
  const mine = await prisma.card.findMany({ where: { ownerId: userId, characterId: { in: unique } }, select: { characterId: true }, distinct: ["characterId"] });
  if (mine.length !== unique.length) throw new ProfileError("Tu ne possèdes pas l'un de ces personnages.");
  await prisma.$transaction([
    prisma.showcaseCharacter.deleteMany({ where: { userId } }),
    prisma.showcaseCharacter.createMany({ data: unique.map((characterId, position) => ({ userId, characterId, position })) }),
  ]);
}

/** Personnages que le joueur peut épingler, les plus rares et les plus puissants d'abord. */
export async function pinnable(userId: string) {
  const rows = await prisma.card.findMany({
    where: { ownerId: userId },
    distinct: ["characterId"],
    select: { character: { select: { id: true, name: true, imageUrl: true, rarity: true, power: true } } },
  });
  return rows
    .map((r) => r.character)
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || b.power - a.power || a.id - b.id)
    .slice(0, 150);
}
