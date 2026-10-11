// Classement Collection (SPEC étape 4, §5) : somme sur les personnages uniques possédés.

import { prisma } from "./db";

export interface CollectionRow {
  userId: string;
  username: string;
  score: number;
  unique: number;
  rank: number;
}

interface Raw {
  userId: string;
  score: number | bigint;
  uniq: number | bigint;
}

/** Score de chaque joueur, calculé en une requête (même formule que `collectionValue`). */
async function scores(): Promise<Raw[]> {
  return prisma.$queryRaw<Raw[]>`
    SELECT g.ownerId AS userId,
           SUM(CASE ch.rarity WHEN 'N' THEN 1 WHEN 'R' THEN 3 WHEN 'SR' THEN 10 WHEN 'SSR' THEN 40 WHEN 'UR' THEN 200 ELSE 0 END
               * (1.0 + 0.5 * g.holo + 1.0 * g.gold)) AS score,
           COUNT(*) AS uniq
    FROM (
      SELECT ownerId, characterId,
             MAX(CASE WHEN finish = 'HOLO' THEN 1 ELSE 0 END) AS holo,
             MAX(CASE WHEN finish = 'GOLD' THEN 1 ELSE 0 END) AS gold
      FROM Card GROUP BY ownerId, characterId
    ) g
    JOIN Character ch ON ch.id = g.characterId
    GROUP BY g.ownerId`;
}

export async function collectionLeaderboard(me: string | null, top = 100) {
  const raw = (await scores()).map((r) => ({ userId: r.userId, score: Math.floor(Number(r.score)), unique: Number(r.uniq) }));
  raw.sort((a, b) => b.score - a.score || b.unique - a.unique || a.userId.localeCompare(b.userId));
  const users = await prisma.user.findMany({ where: { id: { in: raw.map((r) => r.userId) } }, select: { id: true, username: true } });
  const name = new Map(users.map((u) => [u.id, u.username]));
  const ranked: CollectionRow[] = raw.map((r, i) => ({ ...r, username: name.get(r.userId) ?? "?", rank: i + 1 }));
  return { top: ranked.slice(0, top), me: me ? (ranked.find((r) => r.userId === me) ?? null) : null, players: ranked.length };
}
