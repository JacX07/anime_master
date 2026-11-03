// Statistiques d'administration (SPEC admin §4), calculées à la demande sur les tables existantes.
// Aucune donnée personnelle : seulement des comptes, des pseudos de classement et des clés de jeu.

import "server-only";
import { prisma } from "./db";
import { RARITY_RATES, FINISH_RATES } from "./pull";

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export function parsePeriod(raw: string | string[] | undefined): Period {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : 30;
}

const sinceOf = (days: number) => new Date(Date.now() - days * 86_400_000);
const num = (v: bigint | number | null | undefined) => Number(v ?? 0);

export interface Series { labels: string[]; values: number[] }

/** Complète les jours sans événement par 0, du plus ancien au plus récent (jour UTC, `YYYY-MM-DD`). */
function fillDays(rows: { day: Date; n: bigint | number }[], days: number): Series {
  const map = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), num(r.n)]));
  const labels: string[] = [];
  const values: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    labels.push(key.slice(5));
    values.push(map.get(key) ?? 0);
  }
  return { labels, values };
}

/** Activité d'un joueur = ouverture, combat, mouvement de Ryō ou session renouvelée. */
const ACTIVITY = `
  SELECT "userId", "openedAt" AS ts FROM "PackOpening"
  UNION ALL SELECT "userId", "createdAt" FROM "Battle"
  UNION ALL SELECT "userId", "createdAt" FROM "CurrencyLedger"
  UNION ALL SELECT "userId", "updatedAt" FROM "Session"`;

export async function dashboardStats(days: Period) {
  const since = sinceOf(days);
  const [users, newUsers, active, signups, openings, battles, activeDaily, retention] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.$queryRawUnsafe<{ d1: bigint; d7: bigint; d30: bigint }[]>(`
      WITH a AS (${ACTIVITY})
      SELECT COUNT(DISTINCT "userId") FILTER (WHERE ts >= now() - interval '1 day') AS d1,
             COUNT(DISTINCT "userId") FILTER (WHERE ts >= now() - interval '7 days') AS d7,
             COUNT(DISTINCT "userId") FILTER (WHERE ts >= now() - interval '30 days') AS d30 FROM a`),
    prisma.$queryRaw<{ day: Date; n: bigint }[]>`SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS n FROM "User" WHERE "createdAt" >= ${since} GROUP BY 1`,
    prisma.$queryRaw<{ day: Date; n: bigint }[]>`SELECT date_trunc('day', "openedAt") AS day, COUNT(*) AS n FROM "PackOpening" WHERE "openedAt" >= ${since} GROUP BY 1`,
    prisma.$queryRaw<{ day: Date; n: bigint }[]>`SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS n FROM "Battle" WHERE "createdAt" >= ${since} GROUP BY 1`,
    prisma.$queryRawUnsafe<{ day: Date; n: bigint }[]>(`
      WITH a AS (${ACTIVITY})
      SELECT date_trunc('day', ts) AS day, COUNT(DISTINCT "userId") AS n FROM a WHERE ts >= $1 GROUP BY 1`, since),
    // Rétention Dn : part des comptes (créés il y a plus de n+1 jours, sur 90 jours) actifs le jour n après l'inscription.
    prisma.$queryRawUnsafe<{ n: number; eligible: bigint; kept: bigint }[]>(`
      WITH a AS (${ACTIVITY}), steps(n) AS (VALUES (1), (7), (30))
      SELECT steps.n, COUNT(u.id) AS eligible,
        COUNT(u.id) FILTER (WHERE EXISTS (SELECT 1 FROM a WHERE a."userId" = u.id
          AND a.ts >= u."createdAt" + steps.n * interval '1 day' AND a.ts < u."createdAt" + (steps.n + 1) * interval '1 day')) AS kept
      FROM steps LEFT JOIN "User" u ON u."createdAt" < now() - (steps.n + 1) * interval '1 day' AND u."createdAt" >= now() - interval '90 days'
      GROUP BY steps.n ORDER BY steps.n`),
  ]);
  return {
    users, newUsers,
    active: { d1: num(active[0]?.d1), d7: num(active[0]?.d7), d30: num(active[0]?.d30) },
    signups: fillDays(signups, days), openings: fillDays(openings, days), battles: fillDays(battles, days), activeDaily: fillDays(activeDaily, days),
    retention: retention.map((r) => ({ day: r.n, eligible: num(r.eligible), kept: num(r.kept) })),
  };
}

export async function boosterStats(days: Period) {
  const since = sinceOf(days);
  const [rarity, finish, pity, lots, banners, top, drawn, total] = await Promise.all([
    prisma.$queryRaw<{ k: string; n: bigint }[]>`
      SELECT c."rarityAtPull"::text AS k, COUNT(*) AS n FROM "Card" c JOIN "PackOpening" p ON p.id = c."packOpeningId"
      WHERE p."openedAt" >= ${since} GROUP BY 1`,
    prisma.$queryRaw<{ k: string; n: bigint }[]>`
      SELECT c.finish::text AS k, COUNT(*) AS n FROM "Card" c JOIN "PackOpening" p ON p.id = c."packOpeningId"
      WHERE p."openedAt" >= ${since} GROUP BY 1`,
    prisma.$queryRaw<{ k: string; n: bigint }[]>`SELECT "pityTriggered"::text AS k, COUNT(*) AS n FROM "PackOpening" WHERE "openedAt" >= ${since} GROUP BY 1`,
    prisma.$queryRaw<{ k: number; n: bigint }[]>`SELECT "lotSize" AS k, COUNT(*) AS n FROM "PackOpening" WHERE "openedAt" >= ${since} GROUP BY 1`,
    prisma.$queryRaw<{ name: string | null; openings: bigint; cards: bigint; top: bigint }[]>`
      SELECT COALESCE(b.name, 'Tirage standard') AS name, COUNT(DISTINCT p.id) AS openings, COUNT(c.id) AS cards,
             COUNT(c.id) FILTER (WHERE c."rarityAtPull" IN ('SSR', 'UR')) AS top
      FROM "PackOpening" p LEFT JOIN "Banner" b ON b.id = p."bannerId" LEFT JOIN "Card" c ON c."packOpeningId" = p.id
      WHERE p."openedAt" >= ${since} GROUP BY 1 ORDER BY openings DESC LIMIT 15`,
    prisma.$queryRaw<{ name: string; rarity: string; n: bigint }[]>`
      SELECT ch.name, c."rarityAtPull"::text AS rarity, COUNT(*) AS n FROM "Card" c
      JOIN "Character" ch ON ch.id = c."characterId" JOIN "PackOpening" p ON p.id = c."packOpeningId"
      WHERE p."openedAt" >= ${since} GROUP BY ch.name, c."rarityAtPull" ORDER BY n DESC LIMIT 10`,
    prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(DISTINCT "characterId") AS n FROM "Card"`,
    prisma.character.count(),
  ]);
  const cards = rarity.reduce((s, r) => s + num(r.n), 0);
  const count = (rows: { k: string | number; n: bigint }[], key: string | number) => num(rows.find((r) => r.k === key)?.n);
  return {
    openings: lots.reduce((s, r) => s + num(r.n), 0), cards,
    rarity: RARITY_RATES.map(([k, rate]) => ({ key: k, theory: rate, seen: count(rarity, k), share: cards ? count(rarity, k) / cards : 0 })),
    finish: FINISH_RATES.map(([k, rate]) => ({ key: k, theory: rate, seen: count(finish, k), share: cards ? count(finish, k) / cards : 0 })),
    pity: { ssr: count(pity, "SSR"), ur: count(pity, "UR") },
    lots: lots.map((r) => ({ size: Number(r.k), n: num(r.n) })),
    banners: banners.map((b) => ({ name: b.name ?? "—", openings: num(b.openings), cards: num(b.cards), top: num(b.top) })),
    top: top.map((t) => ({ name: t.name, rarity: t.rarity, n: num(t.n) })),
    neverDrawn: Math.max(0, total - num(drawn[0]?.n)), totalCharacters: total,
  };
}

const MIN_GAMES = 20;

export async function combatStats(days: Period) {
  const since = sinceOf(days);
  const [modes, daily, opponents, chars] = await Promise.all([
    prisma.$queryRaw<{ mode: string; total: bigint; done: bigint; wins: bigint; draws: bigint; abandoned: bigint; running: bigint; manual: bigint }[]>`
      SELECT mode::text AS mode, COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'DONE') AS done,
        COUNT(*) FILTER (WHERE status = 'DONE' AND winner = 'A') AS wins,
        COUNT(*) FILTER (WHERE status = 'DONE' AND winner IS NULL) AS draws,
        COUNT(*) FILTER (WHERE status = 'ABANDONED') AS abandoned,
        COUNT(*) FILTER (WHERE status = 'RUNNING') AS running,
        COUNT(*) FILTER (WHERE manual) AS manual
      FROM "Battle" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY total DESC`,
    prisma.$queryRaw<{ day: Date; mode: string; n: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, mode::text AS mode, COUNT(*) AS n FROM "Battle" WHERE "createdAt" >= ${since} GROUP BY 1, 2`,
    prisma.$queryRaw<{ mode: string; opponent: string; done: bigint; wins: bigint }[]>`
      SELECT mode::text AS mode, opponent, COUNT(*) AS done, COUNT(*) FILTER (WHERE winner = 'A') AS wins FROM "Battle"
      WHERE "createdAt" >= ${since} AND status = 'DONE' AND mode IN ('STORY', 'RAID', 'TOWER', 'DUNGEON')
      GROUP BY 1, 2 HAVING COUNT(*) >= 5 ORDER BY done DESC LIMIT 20`,
    // Équipe A = équipe du joueur ; chaque personnage compte une fois par combat terminé.
    prisma.$queryRaw<{ name: string; games: bigint; wins: bigint }[]>`
      SELECT ch.name, COUNT(*) AS games, COUNT(*) FILTER (WHERE b.winner = 'A') AS wins
      FROM "Battle" b, LATERAL (SELECT DISTINCT (e->>'characterId')::int AS id FROM jsonb_array_elements(b.teams->'A') e) t
      JOIN "Character" ch ON ch.id = t.id
      WHERE b."createdAt" >= ${since} AND b.status = 'DONE' AND b.mode <> 'TEST'
      GROUP BY ch.name HAVING COUNT(*) >= ${MIN_GAMES} ORDER BY COUNT(*) FILTER (WHERE b.winner = 'A')::float / COUNT(*) DESC`,
  ]);
  const modeNames = [...new Set(daily.map((d) => d.mode))];
  const days_ = fillDays([], days);
  const byMode = modeNames.map((mode) => ({ mode, values: fillDays(daily.filter((d) => d.mode === mode).map((d) => ({ day: d.day, n: d.n })), days).values }));
  const rate = (w: number, n: number) => (n ? w / n : 0);
  const rated = chars.map((c) => ({ name: c.name, games: num(c.games), rate: rate(num(c.wins), num(c.games)) }));
  return {
    modes: modes.map((m) => ({ mode: m.mode, total: num(m.total), done: num(m.done), rate: rate(num(m.wins), num(m.done)), draws: num(m.draws), abandoned: num(m.abandoned), running: num(m.running), manual: num(m.manual) })),
    labels: days_.labels, byMode,
    opponents: opponents.map((o) => ({ mode: o.mode, opponent: o.opponent, done: num(o.done), rate: rate(num(o.wins), num(o.done)) })),
    best: rated.slice(0, 10), worst: rated.slice(-10).reverse(), minGames: MIN_GAMES, ratedCount: rated.length,
  };
}

export async function economyStats(days: Period) {
  const since = sinceOf(days);
  const [reasons, daily, totals, top] = await Promise.all([
    prisma.$queryRaw<{ reason: string; created: bigint; spent: bigint; n: bigint }[]>`
      SELECT reason::text AS reason, COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0) AS created,
             COALESCE(-SUM(amount) FILTER (WHERE amount < 0), 0) AS spent, COUNT(*) AS n
      FROM "CurrencyLedger" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY created DESC, spent DESC`,
    prisma.$queryRaw<{ day: Date; created: bigint; spent: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0) AS created,
             COALESCE(-SUM(amount) FILTER (WHERE amount < 0), 0) AS spent
      FROM "CurrencyLedger" WHERE "createdAt" >= ${since} GROUP BY 1`,
    prisma.$queryRaw<{ supply: bigint; avg: number; median: number; players: bigint }[]>`
      SELECT COALESCE(SUM(balance), 0) AS supply, COALESCE(AVG(balance), 0)::float AS avg,
             COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY balance), 0)::float AS median, COUNT(*) AS players FROM "User"`,
    prisma.user.findMany({ orderBy: { balance: "desc" }, take: 10, select: { username: true, balance: true } }),
  ]);
  return {
    reasons: reasons.map((r) => ({ reason: r.reason, created: num(r.created), spent: num(r.spent), n: num(r.n) })),
    created: fillDays(daily.map((d) => ({ day: d.day, n: d.created })), days),
    spent: fillDays(daily.map((d) => ({ day: d.day, n: d.spent })), days),
    supply: num(totals[0]?.supply), avg: Math.round(totals[0]?.avg ?? 0), median: Math.round(totals[0]?.median ?? 0), players: num(totals[0]?.players),
    top,
  };
}

export async function eventStats(days: Period) {
  const since = sinceOf(days);
  const [byType, daily, recent, fights] = await Promise.all([
    prisma.$queryRaw<{ type: string; n: bigint; players: bigint }[]>`
      SELECT type, COUNT(*) AS n, COUNT(DISTINCT "userId") AS players FROM "GameEvent" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY n DESC`,
    prisma.$queryRaw<{ day: Date; type: string; n: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, type, COUNT(*) AS n FROM "GameEvent" WHERE "createdAt" >= ${since} GROUP BY 1, 2`,
    prisma.$queryRaw<{ createdAt: Date; type: string; username: string | null; data: unknown }[]>`
      SELECT e."createdAt", e.type, u.username, e.data FROM "GameEvent" e LEFT JOIN "User" u ON u.id = e."userId" ORDER BY e."createdAt" DESC LIMIT 40`,
    prisma.$queryRaw<{ mode: string; manual: boolean; n: bigint; wins: bigint; events: number; steps: number | null; seconds: number | null }[]>`
      SELECT data->>'mode' AS mode, (data->>'manual')::boolean AS manual, COUNT(*) AS n,
             COUNT(*) FILTER (WHERE data->>'winner' = 'A') AS wins,
             COALESCE(AVG((data->>'events')::float), 0) AS events, AVG((data->>'steps')::float) AS steps,
             AVG((data->>'durationMs')::float) / 1000 AS seconds
      FROM "GameEvent" WHERE type = 'battle_end' AND "createdAt" >= ${since} GROUP BY 1, 2 ORDER BY n DESC`,
  ]);
  const types = [...new Set(daily.map((d) => d.type))];
  const labels = fillDays([], days).labels;
  return {
    total: byType.reduce((s, r) => s + num(r.n), 0),
    byType: byType.map((r) => ({ type: r.type, n: num(r.n), players: num(r.players) })),
    labels,
    series: types.map((type) => ({ label: type, values: fillDays(daily.filter((d) => d.type === type).map((d) => ({ day: d.day, n: d.n })), days).values })),
    recent: recent.map((r) => ({ at: r.createdAt, type: r.type, username: r.username, data: JSON.stringify(r.data ?? {}) })),
    fights: fights.map((f) => ({ mode: f.mode, manual: f.manual, n: num(f.n), rate: num(f.n) ? num(f.wins) / num(f.n) : 0, events: Math.round(f.events), steps: f.steps === null ? null : Math.round(f.steps), seconds: f.seconds === null ? null : Math.round(f.seconds) })),
  };
}
