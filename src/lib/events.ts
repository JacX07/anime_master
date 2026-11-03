// Événements de jeu pour les statistiques d'administration (SPEC admin §3).
// `track` ne lève jamais : un échec de collecte ne doit pas faire échouer l'action du joueur.
// Pas de donnée personnelle dans `data` : seulement des clés de jeu, des compteurs et des durées.

import type { Prisma } from "../generated/prisma/client";
import { prisma } from "./db";

export type EventType = "login" | "signup" | "pack_open" | "battle_end" | "battle_abandon" | "purchase" | "trade" | "auction_end" | "achievement";

/** Durée de conservation des événements bruts (SPEC admin §3). */
export const EVENT_RETENTION_DAYS = 180;

export async function track(type: EventType, userId: string | null, data?: Prisma.InputJsonValue): Promise<void> {
  try {
    await prisma.gameEvent.create({ data: { type, userId, data } });
  } catch (error) {
    console.error(`Événement « ${type} » non enregistré :`, error instanceof Error ? error.message : error);
  }
}

/** Supprime les événements plus vieux que la durée de conservation ; renvoie le nombre supprimé. */
export async function purgeOldEvents(now = new Date()): Promise<number> {
  const limit = new Date(now.getTime() - EVENT_RETENTION_DAYS * 86_400_000);
  return (await prisma.gameEvent.deleteMany({ where: { createdAt: { lt: limit } } })).count;
}
