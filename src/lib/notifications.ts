// Notifications dans le site (SPEC étape 3, §6). Écrites dans la transaction qui les provoque.

import type { Prisma } from "../generated/prisma/client";
import { prisma } from "./db";

export type NotificationType =
  | "TRADE_RECEIVED" | "TRADE_ACCEPTED" | "TRADE_REFUSED" | "TRADE_INVALID" | "TRADE_EXPIRED"
  | "OUTBID" | "AUCTION_WON" | "CARD_SOLD" | "AUCTION_UNSOLD" | "WISHED_AVAILABLE" | "ACHIEVEMENT"
  | "DUEL_RECEIVED" | "DUEL_ACCEPTED" | "DUEL_DECLINED" | "DUEL_EXPIRED" | "DUEL_RESULT";

export interface NotificationPayload {
  tradeId?: string;
  auctionId?: string;
  /// Nom du personnage et montant (enchères)
  character?: string;
  amount?: number;
  /** Cristaux spéciaux gagnés (succès) */
  special?: number;
  characterId?: number;
  label?: string;
  source?: "auction" | "trade";
  /** L'autre joueur concerné */
  username?: string;
  reason?: string;
  duelId?: string;
  outcome?: "win" | "draw" | "loss";
  forfeit?: boolean;
}

type Db = Prisma.TransactionClient | typeof prisma;

export async function notify(db: Db, userId: string, type: NotificationType, payload: NotificationPayload) {
  await db.notification.create({ data: { userId, type, payload: payload as Prisma.InputJsonObject } });
}

export const unreadCount = (userId: string) => prisma.notification.count({ where: { userId, readAt: null } });

export async function listNotifications(userId: string, take = 50) {
  const rows = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
  return rows.map((n) => ({ id: n.id, type: n.type as NotificationType, payload: n.payload as NotificationPayload, read: n.readAt !== null, createdAt: n.createdAt }));
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
