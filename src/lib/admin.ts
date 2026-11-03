// Administration (SPEC admin §2) : le rôle est relu en base à chaque appel, jamais depuis un cookie ni le client.

import "server-only";
import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { getSessionUser } from "./session";

export type Role = "player" | "moderator" | "admin";
const LEVEL: Record<Role, number> = { player: 0, moderator: 1, admin: 2 };

export function hasRole(role: Role, needed: "moderator" | "admin"): boolean {
  return LEVEL[role] >= LEVEL[needed];
}

export interface Staff {
  id: string;
  username: string;
  role: Role;
}

/** Rôle du joueur connecté (`player` si visiteur). */
export async function getRole(): Promise<Role> {
  const user = await getSessionUser();
  if (!user) return "player";
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
  return row?.role ?? "player";
}

/** Membre de l'équipe ayant au moins le rôle demandé ; sinon 404, comme si la page n'existait pas. */
export async function requireRole(needed: "moderator" | "admin"): Promise<Staff> {
  const user = await getSessionUser();
  if (!user) notFound();
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
  if (!row || !hasRole(row.role, needed)) notFound();
  return { id: user.id, username: user.username, role: row.role };
}

/** Écrit une ligne du journal d'audit (ajout seul). */
export async function audit(
  actor: Staff,
  action: string,
  details: { targetId?: string; reason?: string; data?: Prisma.InputJsonValue } = {},
) {
  await prisma.adminAudit.create({
    data: { actorId: actor.id, actorName: actor.username, action, targetId: details.targetId, reason: details.reason, data: details.data },
  });
}
