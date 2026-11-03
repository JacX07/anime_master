// Lecture des joueurs pour l'administration (SPEC admin §4.5) : liste et fiche.

import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";

export const SORTS = {
  activite: { label: "Dernière activité", sql: Prisma.sql`last_seen DESC NULLS LAST` },
  inscription: { label: "Inscription", sql: Prisma.sql`u."createdAt" DESC` },
  ryo: { label: "Ryō", sql: Prisma.sql`u.balance DESC` },
  cartes: { label: "Cartes", sql: Prisma.sql`cards DESC` },
  paquets: { label: "Paquets", sql: Prisma.sql`packs DESC` },
} as const;
export type SortKey = keyof typeof SORTS;
export const parseSort = (v: unknown): SortKey => (typeof v === "string" && v in SORTS ? (v as SortKey) : "activite");
export const PAGE_SIZE = 40;

export interface PlayerRow { id: string; username: string; role: string; banned: boolean; balance: number; createdAt: Date; lastSeen: Date | null; cards: number; packs: number }

export async function listPlayers(q: string, sort: SortKey, page: number) {
  const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const where = q ? Prisma.sql`WHERE u.username ILIKE ${like}` : Prisma.empty;
  const [rows, total] = await Promise.all([
    prisma.$queryRaw<{ id: string; username: string; role: string; banned: boolean; balance: number; createdAt: Date; last_seen: Date | null; cards: bigint; packs: bigint }[]>`
      SELECT u.id, u.username, u.role::text AS role, u."bannedAt" IS NOT NULL AS banned, u.balance, u."createdAt",
             (SELECT max(s."updatedAt") FROM "Session" s WHERE s."userId" = u.id) AS last_seen,
             (SELECT count(*) FROM "Card" c WHERE c."ownerId" = u.id) AS cards,
             (SELECT count(*) FROM "PackOpening" p WHERE p."userId" = u.id AND p."lotSize" > 0) AS packs
      FROM "User" u ${where} ORDER BY ${SORTS[sort].sql}, u.username LIMIT ${PAGE_SIZE} OFFSET ${page * PAGE_SIZE}`,
    prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "User" u ${where}`,
  ]);
  return {
    total: Number(total[0].n),
    rows: rows.map((r): PlayerRow => ({ id: r.id, username: r.username, role: r.role, banned: r.banned, balance: r.balance, createdAt: r.createdAt, lastSeen: r.last_seen, cards: Number(r.cards), packs: Number(r.packs) })),
  };
}

export async function playerSheet(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, role: true, bannedAt: true, banReason: true, balance: true, crystals: true, specialCrystals: true, cardsSinceSSR: true, cardsSinceUR: true, createdAt: true, welcomeDraws: true },
  });
  if (!user) return null;
  const [lastSeen, packs, battles, achievements, byRarity, cards, ledger, openings, recentBattles, audit] = await Promise.all([
    prisma.session.aggregate({ where: { userId: id }, _max: { updatedAt: true } }),
    prisma.packOpening.count({ where: { userId: id, lotSize: { gt: 0 } } }),
    prisma.battle.count({ where: { userId: id } }),
    prisma.userAchievement.count({ where: { userId: id } }),
    prisma.$queryRaw<{ r: string; n: bigint }[]>`SELECT ch.rarity::text AS r, count(*) AS n FROM "Card" c JOIN "Character" ch ON ch.id = c."characterId" WHERE c."ownerId" = ${id} GROUP BY 1`,
    prisma.card.findMany({ where: { ownerId: id }, orderBy: [{ character: { rarity: "desc" } }, { obtainedAt: "desc" }], take: 60, select: { id: true, serial: true, finish: true, stars: true, inAuction: true, inExpedition: true, character: { select: { name: true, rarity: true } } } }),
    prisma.currencyLedger.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.packOpening.findMany({ where: { userId: id, lotSize: { gt: 0 } }, orderBy: { openedAt: "desc" }, take: 10, select: { openedAt: true, lotSize: true, pityTriggered: true, banner: { select: { name: true } }, cards: { select: { rarityAtPull: true } } } }),
    prisma.battle.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 10, select: { createdAt: true, mode: true, winner: true } }),
    prisma.adminAudit.findMany({ where: { targetId: id }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  return { user, lastSeen: lastSeen._max.updatedAt, packs, battles, achievements, byRarity: Object.fromEntries(byRarity.map((r) => [r.r, Number(r.n)])), cards, ledger, openings, recentBattles, audit };
}

/** Personnages proposés dans le formulaire « offrir une carte » (recherche par nom). */
export const searchCharacters = (q: string) =>
  prisma.character.findMany({ where: { name: { contains: q, mode: "insensitive" } }, orderBy: { favourites: "desc" }, take: 8, select: { id: true, name: true, rarity: true } });
