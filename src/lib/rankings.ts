// Classements individuels : Puissance, Histoire, Tour, et nombre de personnages par rareté (docs/specs/social.md, maquette du 2026-11-04).

import { titleOf } from "./achievements";
import { prisma } from "./db";

export const RARITIES = ["N", "R", "SR", "SSR", "UR"] as const;
export type RarityCounts = Record<(typeof RARITIES)[number], number>;

/** Une ligne de classement affichable (podium, liste, barre « ton rang »). */
export interface BoardRow {
  userId: string;
  username: string;
  title: string | null;
  guildTag: string | null;
  rank: number;
  /** Valeur classante */
  score: number;
  /** Ligne de détail (texte) */
  detail?: string;
  rarities?: RarityCounts;
  /** Photo de profil (v0.3.0) */
  avatarUrl?: string | null;
}
export interface Board {
  top: BoardRow[];
  me: BoardRow | null;
  players: number;
  /** Score de la dernière place du top (pour « il te manque X points ») */
  cutoff: number | null;
}

const TOP = 100;

/** Personnages uniques possédés, par rareté. */
export async function rarityCounts(): Promise<Map<string, RarityCounts>> {
  const rows = await prisma.$queryRaw<{ userId: string; rarity: string; n: bigint }[]>`
    SELECT g."ownerId" AS "userId", ch.rarity::text AS rarity, COUNT(*) AS n
    FROM (SELECT DISTINCT "ownerId", "characterId" FROM "Card") g
    JOIN "Character" ch ON ch.id = g."characterId"
    GROUP BY g."ownerId", ch.rarity`;
  const out = new Map<string, RarityCounts>();
  for (const r of rows) {
    const c = out.get(r.userId) ?? { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 };
    if (r.rarity in c) c[r.rarity as keyof RarityCounts] = Number(r.n);
    out.set(r.userId, c);
  }
  return out;
}

/** Trie, numérote et décore avec pseudo, titre et tag de guilde. */
export async function buildBoard(entries: { userId: string; score: number; tie?: number; detail?: string }[], me: string | null, rarities?: Map<string, RarityCounts>, top = TOP): Promise<Board> {
  const sorted = [...entries].sort((a, b) => b.score - a.score || (a.tie ?? 0) - (b.tie ?? 0) || a.userId.localeCompare(b.userId));
  const users = await prisma.user.findMany({ where: { id: { in: sorted.map((e) => e.userId) } }, select: { id: true, username: true, title: true, guild: { select: { tag: true } } } });
  const who = new Map(users.map((u) => [u.id, u]));
  const rows: BoardRow[] = sorted.filter((e) => who.has(e.userId)).map((e, i) => ({
    userId: e.userId, username: who.get(e.userId)!.username, title: titleOf(who.get(e.userId)!.title), guildTag: who.get(e.userId)!.guild?.tag ?? null,
    rank: i + 1, score: e.score, detail: e.detail, rarities: rarities?.get(e.userId),
  }));
  const { avatarsFor } = await import("./profile");
  const shown = [...rows.slice(0, top), ...(me ? rows.filter((r) => r.userId === me) : [])];
  const avatars = await avatarsFor(shown.map((r) => r.userId));
  for (const r of shown) r.avatarUrl = avatars.get(r.userId) ?? null;
  return { top: rows.slice(0, top), me: me ? rows.find((r) => r.userId === me) ?? null : null, players: rows.length, cutoff: rows.length >= top ? rows[top - 1].score : null };
}

/** Puissance de collection : somme des puissances de base de toutes les cartes, doublons compris, plus l'apport de l'équipement. */
export async function powerBoard(me: string | null) {
  const { gearPowerBonus } = await import("./gear-power");
  const gear = await gearPowerBonus();
  const rows = await prisma.$queryRaw<{ userId: string; power: bigint; cards: bigint }[]>`
    SELECT c."ownerId" AS "userId", SUM(ch.power) AS power, COUNT(*) AS cards
    FROM "Card" c JOIN "Character" ch ON ch.id = c."characterId" GROUP BY c."ownerId"`;
  return buildBoard(rows.map((r) => ({ userId: r.userId, score: Number(r.power) + (gear.get(r.userId) ?? 0), detail: `${Number(r.cards)} cartes${gear.get(r.userId) ? ` · équipement +${new Intl.NumberFormat("fr-FR").format(gear.get(r.userId)!)}` : ""}` })), me, await rarityCounts());
}

/** Histoire : étoiles obtenues (un combat gagné vaut au moins 1 étoile), puis nombre de combats gagnés. */
export async function storyBoard(me: string | null) {
  const rows = await prisma.$queryRaw<{ userId: string; stars: bigint; fights: bigint }[]>`
    SELECT p."userId", SUM(GREATEST(COALESCE(s.stars, 0), 1)) AS stars, COUNT(*) AS fights
    FROM "StoryProgress" p
    CROSS JOIN LATERAL generate_series(1, p."maxLevel") AS lv(level)
    LEFT JOIN "StoryStageStar" s ON s."userId" = p."userId" AND s.universe = p.universe AND s.level = lv.level
    GROUP BY p."userId"`;
  return buildBoard(rows.map((r) => ({ userId: r.userId, score: Number(r.stars), tie: -Number(r.fights), detail: `${Number(r.fights)} combats gagnés` })), me);
}

/** Tour : étage maximal ; à égalité, celui qui y est arrivé le premier. */
export async function towerBoard(me: string | null) {
  const rows = await prisma.towerProgress.findMany({ where: { maxFloor: { gt: 0 } }, select: { userId: true, maxFloor: true, reachedAt: true } });
  return buildBoard(rows.map((r) => ({ userId: r.userId, score: r.maxFloor, tie: r.reachedAt.getTime() })), me);
}

/** Collection : score de collection (N 1 · R 3 · SR 10 · SSR 40 · UR 200, +50 % Holo, +100 % Gold) ; départage par personnages uniques. */
export async function collectionBoard(me: string | null) {
  const { collectionScores } = await import("./leaderboard");
  const rows = await collectionScores();
  return buildBoard(rows.map((r) => ({ userId: r.userId, score: Math.floor(Number(r.score)), tie: -Number(r.uniq), detail: `${Number(r.uniq)} personnages` })), me, await rarityCounts());
}
