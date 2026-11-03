// Quêtes quotidiennes et hebdomadaires (docs/specs/economie.md, « Succès et quêtes périodiques »).
// La progression se calcule depuis les actions existantes, sur la période en cours (aucun compteur séparé).
// La récupération est une action idempotente : une fois par quête et par période. Le marqueur est une ligne
// `AdventureRecord` de clé `quest:<quête>:<période>` (xp 0) : pas de table dédiée pour l'instant.

import type { Prisma } from "../generated/prisma/client";
import { prisma } from "./db";
import { afterGain } from "./crystal-stock";
import { startOfDay } from "./economy";

type Db = Prisma.TransactionClient | typeof prisma;
export type Period = "daily" | "weekly";
type Metric = "pulls" | "wins" | "expeditionsStarted" | "expeditionsClaimed" | "duelWins";

export interface PeriodicQuestDef {
  key: string;
  period: Period;
  title: string;
  description: string;
  target: number;
  metric: Metric;
  /** Cristaux normaux versés à la récupération (pas de Ryō : le journal n'a pas de motif « quête ») */
  crystals: number;
}

export const PERIODIC_QUESTS: PeriodicQuestDef[] = [
  { key: "daily_pulls", period: "daily", title: "Invoque 3 paquets", description: "Ouvre 3 paquets aujourd’hui.", target: 3, metric: "pulls", crystals: 2 },
  { key: "daily_wins", period: "daily", title: "Remporte 3 combats", description: "Gagne 3 combats aujourd’hui.", target: 3, metric: "wins", crystals: 2 },
  { key: "daily_expedition", period: "daily", title: "Envoie une expédition", description: "Lance une expédition aujourd’hui.", target: 1, metric: "expeditionsStarted", crystals: 2 },
  { key: "weekly_pulls", period: "weekly", title: "Invoque 20 paquets", description: "Ouvre 20 paquets cette semaine.", target: 20, metric: "pulls", crystals: 10 },
  { key: "weekly_wins", period: "weekly", title: "Remporte 25 combats", description: "Gagne 25 combats cette semaine.", target: 25, metric: "wins", crystals: 10 },
  { key: "weekly_expeditions", period: "weekly", title: "Récupère 3 expéditions", description: "Récupère 3 expéditions cette semaine.", target: 3, metric: "expeditionsClaimed", crystals: 10 },
  { key: "weekly_duels", period: "weekly", title: "Gagne 2 duels", description: "Remporte 2 duels cette semaine.", target: 2, metric: "duelWins", crystals: 10 },
];

export interface PeriodWindow { id: string; start: Date; end: Date }

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Période en cours : la journée (minuit) ou la semaine (lundi 0 h), heure du serveur. */
export function periodWindow(period: Period, now: Date): PeriodWindow {
  const start = startOfDay(now);
  if (period === "weekly") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + (period === "weekly" ? 7 : 1));
  return { id: `${period === "weekly" ? "w" : "d"}${localDate(start)}`, start, end };
}

const recordKey = (def: PeriodicQuestDef, w: PeriodWindow) => `quest:${def.key}:${w.id}`;

/** Progression brute depuis la période (sans plafond). Ne compte que les actions faites à partir du début de la période. */
async function progressOf(db: Db, userId: string, def: PeriodicQuestDef, w: PeriodWindow): Promise<number> {
  const since = { gte: w.start };
  switch (def.metric) {
    case "pulls":
      return db.packOpening.count({ where: { userId, openedAt: since } });
    case "wins":
      return db.battle.count({ where: { userId, status: "DONE", winner: "A", mode: { not: "TEST" }, endedAt: since } });
    case "expeditionsStarted":
      return db.expedition.count({ where: { userId, startedAt: since } });
    case "expeditionsClaimed":
      return db.expedition.count({ where: { userId, status: "CLAIMED", claimedAt: since } });
    case "duelWins":
      return db.duel.count({ where: { winnerId: userId, status: { in: ["DONE", "FORFEIT"] }, resolvedAt: since } });
  }
}

export async function getPeriodicQuests(userId: string, now = new Date()) {
  const windows = { daily: periodWindow("daily", now), weekly: periodWindow("weekly", now) };
  const [claims, progress] = await Promise.all([
    prisma.adventureRecord.findMany({ where: { userId, key: { in: PERIODIC_QUESTS.map((def) => recordKey(def, windows[def.period])) } }, select: { key: true } }),
    Promise.all(PERIODIC_QUESTS.map((def) => progressOf(prisma, userId, def, windows[def.period]))),
  ]);
  const got = new Set(claims.map((c) => c.key));
  return PERIODIC_QUESTS.map((def, i) => {
    const w = windows[def.period];
    const value = Math.min(progress[i], def.target);
    const claimed = got.has(recordKey(def, w));
    return { ...def, progress: value, claimed, claimable: value >= def.target && !claimed, resetsAt: w.end };
  });
}

export class PeriodicQuestError extends Error {}

/**
 * Récupère une quête périodique atteinte. Une seule fois par période : le verrou sur le joueur sérialise les demandes
 * simultanées, et le marqueur `AdventureRecord` fait foi. Renvoie `claimed: false` si elle a déjà été récupérée.
 */
export async function claimPeriodicQuest(userId: string, key: string, now = new Date()) {
  const def = PERIODIC_QUESTS.find((q) => q.key === key);
  if (!def) throw new PeriodicQuestError("Quête inconnue.");
  const w = periodWindow(def.period, now);
  const marker = recordKey(def, w);
  return prisma.$transaction(async (tx) => {
    // Postgres : sérialise les demandes concurrentes de ce joueur (double clic).
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    if (await tx.adventureRecord.findUnique({ where: { userId_key: { userId, key: marker } }, select: { key: true } })) return { claimed: false as const, crystals: 0 };
    if (Math.min(await progressOf(tx, userId, def, w), def.target) < def.target) throw new PeriodicQuestError("Objectif pas encore atteint.");
    await tx.adventureRecord.create({ data: { userId, key: marker, xp: 0 } });
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { crystals: true, crystalsUpdatedAt: true } });
    await tx.user.update({ where: { id: userId }, data: afterGain(user.crystals, user.crystalsUpdatedAt, now, def.crystals) });
    return { claimed: true as const, crystals: def.crystals };
  });
}
