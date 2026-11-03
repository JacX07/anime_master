// Actions d'écriture de l'équipe (SPEC admin §5). Sans dépendance à Next : testable par script.
// Chaque action vérifie les droits, écrit dans la même transaction le changement et la ligne d'audit.

import type { Prisma } from "../generated/prisma/client";
import type { Rarity } from "../generated/prisma/enums";
import { afterGain } from "./crystal-stock";
import { prisma } from "./db";

export class AdminError extends Error {}

export type Role = "player" | "moderator" | "admin";
export interface Actor { id: string; username: string; role: Role }
export type StaffAction = "ban" | "unban" | "ryo" | "crystals" | "special" | "card_give" | "card_remove" | "pity_reset" | "role";

const SANCTIONS: StaffAction[] = ["ban", "unban"];
export const MAX_ADJUST = 1_000_000;
export const RATE_LIMIT = { perMinute: 30 };

/** Message d'erreur si l'acteur n'a pas le droit d'agir sur la cible, sinon null (SPEC §2, tableau des rôles). */
export function denied(actor: { id: string; role: Role }, target: { id: string; role: Role }, action: StaffAction): string | null {
  if (actor.role === "player") return "Réservé à l'équipe.";
  if (actor.id === target.id) return "Tu ne peux pas agir sur ton propre compte (utilise le script en ligne de commande).";
  if (SANCTIONS.includes(action)) {
    if (target.role === "admin") return "Un administrateur ne peut pas être sanctionné.";
    if (target.role === "moderator" && actor.role !== "admin") return "Seul un administrateur peut sanctionner un modérateur.";
    return null;
  }
  return actor.role === "admin" ? null : "Réservé aux administrateurs.";
}

const cleanReason = (reason: string) => {
  const r = reason.trim();
  if (r.length < 5) throw new AdminError("Le motif est obligatoire (5 caractères au moins).");
  if (r.length > 300) throw new AdminError("Motif trop long (300 caractères au plus).");
  return r;
};

const amount = (n: number) => {
  if (!Number.isInteger(n) || n === 0 || Math.abs(n) > MAX_ADJUST) throw new AdminError(`Quantité invalide (entier non nul, ${MAX_ADJUST.toLocaleString("fr-FR")} au plus).`);
  return n;
};

/** Trop d'actions en peu de temps : refus (SPEC §2.6). */
export async function assertRate(actorId: string, now = new Date()) {
  const n = await prisma.adminAudit.count({ where: { actorId, createdAt: { gt: new Date(now.getTime() - 60_000) } } });
  if (n >= RATE_LIMIT.perMinute) throw new AdminError("Trop d'actions à la suite, attends une minute.");
}

type Tx = Prisma.TransactionClient;

/** Cadre commun : cible relue en base, droits, motif, transaction, audit. */
async function act<T>(
  actor: Actor,
  action: StaffAction,
  targetId: string,
  reasonRaw: string,
  body: (tx: Tx, target: { id: string; username: string; role: Role }) => Promise<{ data: Prisma.InputJsonValue; result: T }>,
): Promise<T> {
  const reason = cleanReason(reasonRaw);
  await assertRate(actor.id);
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: targetId }, select: { id: true, username: true, role: true } });
    if (!target) throw new AdminError("Joueur introuvable.");
    const refusal = denied(actor, target, action);
    if (refusal) throw new AdminError(refusal);
    const { data, result } = await body(tx, target);
    await tx.adminAudit.create({ data: { actorId: actor.id, actorName: actor.username, action, targetId, reason, data: { target: target.username, ...(data as object) } } });
    return result;
  });
}

/** Ajuste les Ryō par le journal comptable : le solde reste égal à la somme du journal. */
export function adjustRyo(actor: Actor, targetId: string, delta: number, reason: string) {
  return act(actor, "ryo", targetId, reason, async (tx, t) => {
    const d = amount(delta);
    const u = await tx.user.findUniqueOrThrow({ where: { id: t.id }, select: { balance: true } });
    if (u.balance + d < 0) throw new AdminError(`Solde insuffisant (${u.balance} Ryō).`);
    await tx.user.update({ where: { id: t.id }, data: { balance: { increment: d } } });
    await tx.currencyLedger.create({ data: { userId: t.id, amount: d, reason: "ADMIN", refId: actor.id } });
    return { data: { delta: d, before: u.balance, after: u.balance + d }, result: undefined };
  });
}

/** Cristaux normaux : conserve la progression de recharge (voir crystal-stock). Pas de journal dédié, l'audit garde avant et après. */
export function adjustCrystals(actor: Actor, targetId: string, delta: number, reason: string) {
  return act(actor, "crystals", targetId, reason, async (tx, t) => {
    const d = amount(delta);
    const u = await tx.user.findUniqueOrThrow({ where: { id: t.id }, select: { crystals: true, crystalsUpdatedAt: true } });
    const now = new Date();
    const next = afterGain(u.crystals, u.crystalsUpdatedAt, now, d);
    if (next.crystals < 0) throw new AdminError("Pas assez de cristaux à retirer.");
    await tx.user.update({ where: { id: t.id }, data: next });
    return { data: { delta: d, before: u.crystals, after: next.crystals }, result: undefined };
  });
}

export function adjustSpecialCrystals(actor: Actor, targetId: string, delta: number, reason: string) {
  return act(actor, "special", targetId, reason, async (tx, t) => {
    const d = amount(delta);
    const u = await tx.user.findUniqueOrThrow({ where: { id: t.id }, select: { specialCrystals: true } });
    if (u.specialCrystals + d < 0) throw new AdminError(`Solde insuffisant (${u.specialCrystals} cristaux spéciaux).`);
    await tx.user.update({ where: { id: t.id }, data: { specialCrystals: { increment: d } } });
    await tx.specialCrystalLedger.create({ data: { userId: t.id, amount: d, reason: "ADMIN", refId: actor.id } });
    return { data: { delta: d, before: u.specialCrystals, after: u.specialCrystals + d }, result: undefined };
  });
}

export function resetPity(actor: Actor, targetId: string, reason: string) {
  return act(actor, "pity_reset", targetId, reason, async (tx, t) => {
    const u = await tx.user.findUniqueOrThrow({ where: { id: t.id }, select: { cardsSinceSSR: true, cardsSinceUR: true } });
    await tx.user.update({ where: { id: t.id }, data: { cardsSinceSSR: 0, cardsSinceUR: 0 } });
    return { data: { before: { ssr: u.cardsSinceSSR, ur: u.cardsSinceUR } }, result: undefined };
  });
}

/** Offre une carte. Elle est rattachée à un « tirage » vide (lotSize 0) que les statistiques ignorent. */
export function giveCard(actor: Actor, targetId: string, characterId: number, reason: string) {
  return act(actor, "card_give", targetId, reason, async (tx, t) => {
    const ch = await tx.character.findUnique({ where: { id: characterId }, select: { id: true, name: true, rarity: true } });
    if (!ch) throw new AdminError("Personnage introuvable.");
    const last = await tx.card.aggregate({ where: { characterId }, _max: { serial: true } });
    const opening = await tx.packOpening.create({ data: { userId: t.id, lotSize: 0, pityTriggered: "NONE" } });
    const card = await tx.card.create({ data: { ownerId: t.id, characterId, serial: (last._max.serial ?? 0) + 1, rarityAtPull: ch.rarity as Rarity, finish: "NORMAL", packOpeningId: opening.id } });
    return { data: { cardId: card.id, character: ch.name, serial: card.serial }, result: card.id };
  });
}

/** Retire une carte du joueur, sauf si elle est engagée (enchère, expédition, échange en attente). */
export function removeCard(actor: Actor, targetId: string, cardId: string, reason: string) {
  return act(actor, "card_remove", targetId, reason, async (tx, t) => {
    const card = await tx.card.findFirst({ where: { id: cardId, ownerId: t.id }, select: { id: true, serial: true, inAuction: true, inExpedition: true, character: { select: { name: true } } } });
    if (!card) throw new AdminError("Carte introuvable chez ce joueur.");
    if (card.inAuction || card.inExpedition) throw new AdminError("Carte engagée (enchère ou expédition) : attends la fin.");
    const pending = await tx.tradeItem.count({ where: { cardId, trade: { status: "PENDING" } } });
    if (pending) throw new AdminError("Carte dans un échange en attente.");
    await tx.card.delete({ where: { id: cardId } });
    return { data: { cardId, character: card.character.name, serial: card.serial }, result: undefined };
  });
}

/** Suspend le compte : motif conservé, sessions supprimées (le cache de cookie peut tenir jusqu'à 5 minutes). */
export function banUser(actor: Actor, targetId: string, reason: string) {
  return act(actor, "ban", targetId, reason, async (tx, t) => {
    await tx.user.update({ where: { id: t.id }, data: { bannedAt: new Date(), banReason: reason.trim() } });
    const sessions = await tx.session.deleteMany({ where: { userId: t.id } });
    return { data: { sessionsDeleted: sessions.count }, result: undefined };
  });
}

export function unbanUser(actor: Actor, targetId: string, reason: string) {
  return act(actor, "unban", targetId, reason, async (tx, t) => {
    await tx.user.update({ where: { id: t.id }, data: { bannedAt: null, banReason: null } });
    return { data: {}, result: undefined };
  });
}

export function changeRole(actor: Actor, targetId: string, role: Role, reason: string) {
  return act(actor, "role", targetId, reason, async (tx, t) => {
    if (!["player", "moderator", "admin"].includes(role)) throw new AdminError("Rôle inconnu.");
    await tx.user.update({ where: { id: t.id }, data: { role } });
    return { data: { before: t.role, after: role }, result: undefined };
  });
}
