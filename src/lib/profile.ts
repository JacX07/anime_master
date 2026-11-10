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
  guild: { tag: string; name: string } | null;
  since: Date;
  /** Photo de profil (image d'un personnage), sinon null */
  avatarUrl: string | null;
  avatarCharacterId: number | null;
  unique: number;
  power: number;
  expeditions: number;
  duelWins: number;
  completedAnime: string[];
  /** Boosters ouverts (hors dons de test) */
  packsOpened: number;
  /** Étoiles de l'histoire : un combat gagné vaut au moins 1 étoile */
  storyStars: number;
  /** Étage le plus haut atteint dans la Tour universelle */
  towerFloor: number;
  achievements: { key: string; label: string; description: string; title: string; unlockedAt: Date | null }[];
  showcase: AlbumEntry[];
}

/** Profil d'un joueur par son pseudo (stocké en minuscules), ou null s'il n'existe pas. */
export async function getProfile(username: string): Promise<Profile | null> {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, username: true, title: true, createdAt: true, expeditionsDone: true, avatarCharacterId: true, guild: { select: { tag: true, name: true } } },
  });
  if (!user) return null;
  const [cards, power, duelWins, unlocked, pinned, anime, packsOpened, stars, tower] = await Promise.all([
    prisma.card.findMany({ where: { ownerId: user.id }, select: { characterId: true }, distinct: ["characterId"] }),
    getCollectionPower(user.id),
    prisma.duel.count({ where: { winnerId: user.id, status: { in: ["DONE", "FORFEIT"] } } }),
    prisma.userAchievement.findMany({ where: { userId: user.id }, select: { key: true, unlockedAt: true } }),
    prisma.showcaseCharacter.findMany({ where: { userId: user.id }, orderBy: { position: "asc" }, select: { characterId: true } }),
    loadAnimeIndex(),
    prisma.packOpening.count({ where: { userId: user.id, lotSize: { gt: 0 } } }),
    prisma.$queryRaw<{ stars: bigint | null }[]>`
      SELECT SUM(GREATEST(COALESCE(s.stars, 0), 1)) AS stars
      FROM "StoryProgress" p
      CROSS JOIN LATERAL generate_series(1, p."maxLevel") AS lv(level)
      LEFT JOIN "StoryStageStar" s ON s."userId" = p."userId" AND s.universe = p.universe AND s.level = lv.level
      WHERE p."userId" = ${user.id}`,
    prisma.towerProgress.findUnique({ where: { userId: user.id }, select: { maxFloor: true } }),
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
    guild: user.guild,
    since: user.createdAt,
    avatarCharacterId: user.avatarCharacterId,
    avatarUrl: (await avatarsFor([user.id])).get(user.id) ?? null,
    unique: owned.size,
    power,
    expeditions: user.expeditionsDone,
    duelWins,
    completedAnime: anime.listed.filter((a) => a.characterIds.every((id) => owned.has(id))).map((a) => a.title).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })),
    packsOpened,
    storyStars: Number(stars[0]?.stars ?? 0),
    towerFloor: tower?.maxFloor ?? 0,
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
}

/** Photo de profil (v0.3.0) : image d'un personnage possédé, ou null pour revenir aux initiales. */
export async function setAvatar(userId: string, characterId: number | null) {
  if (characterId !== null) {
    if (!Number.isSafeInteger(characterId)) throw new ProfileError("Personnage invalide.");
    if (!(await prisma.card.count({ where: { ownerId: userId, characterId } }))) throw new ProfileError("Tu ne possèdes pas ce personnage.");
  }
  await prisma.user.update({ where: { id: userId }, data: { avatarCharacterId: characterId } });
}

/** Images d'avatar de plusieurs joueurs (classements, en-tête). */
export async function avatarsFor(userIds: string[]): Promise<Map<string, string>> {
  const users = await prisma.user.findMany({ where: { id: { in: userIds }, avatarCharacterId: { not: null } }, select: { id: true, avatarCharacterId: true } });
  const chars = await prisma.character.findMany({ where: { id: { in: users.map((u) => u.avatarCharacterId!) } }, select: { id: true, imageUrl: true } });
  const img = new Map(chars.map((c) => [c.id, c.imageUrl]));
  return new Map(users.flatMap((u) => img.has(u.avatarCharacterId!) ? [[u.id, img.get(u.avatarCharacterId!)!] as [string, string]] : []));
}
