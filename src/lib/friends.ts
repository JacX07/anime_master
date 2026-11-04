// Amis et blocage (docs/specs/social.md §2).

import { prisma } from "./db";
import { notify } from "./notifications";

export const FRIEND_MAX = 100;
const ONLINE_MS = 5 * 60_000;
const TOUCH_MS = 60_000;

export class FriendError extends Error {}

/** Marque le joueur actif, au plus une fois par minute. */
export async function touchLastSeen(userId: string, now = new Date()) {
  await prisma.user.updateMany({ where: { id: userId, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(now.getTime() - TOUCH_MS) } }] }, data: { lastSeenAt: now } });
}

/** « en ligne » dans les 5 dernières minutes, sinon « vu il y a X ». */
export function seenLabel(lastSeenAt: Date | null, now = new Date()) {
  if (!lastSeenAt) return "jamais vu";
  const ms = now.getTime() - lastSeenAt.getTime();
  if (ms < ONLINE_MS) return "en ligne";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `vu il y a ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `vu il y a ${h} h` : `vu il y a ${Math.floor(h / 24)} j`;
}
export const isOnline = (lastSeenAt: Date | null, now = new Date()) => !!lastSeenAt && now.getTime() - lastSeenAt.getTime() < ONLINE_MS;

/** Refuse une action (message, défi, échange, demande) si le destinataire a bloqué l'expéditeur. */
export async function assertNotBlocked(fromId: string, toId: string) {
  const block = await prisma.block.findFirst({ where: { OR: [{ blockerId: toId, blockedId: fromId }, { blockerId: fromId, blockedId: toId }] }, select: { blockerId: true } });
  if (block) throw new FriendError(block.blockerId === fromId ? "Tu as bloqué ce joueur : débloque-le d'abord." : "Ce joueur ne peut pas être contacté.");
}

const pair = (a: string, b: string) => ({ OR: [{ requesterId: a, addresseeId: b }, { requesterId: b, addresseeId: a }] });
const friendCount = (id: string) => prisma.friendship.count({ where: { status: "ACCEPTED", OR: [{ requesterId: id }, { addresseeId: id }] } });

async function findUser(username: string) {
  const user = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() }, select: { id: true, username: true } });
  if (!user) throw new FriendError("Joueur introuvable.");
  return user;
}

export async function sendFriendRequest(userId: string, username: string) {
  const to = await findUser(username);
  if (to.id === userId) throw new FriendError("Tu ne peux pas t'ajouter toi-même.");
  await assertNotBlocked(userId, to.id);
  const existing = await prisma.friendship.findFirst({ where: pair(userId, to.id) });
  if (existing?.status === "ACCEPTED") throw new FriendError("Vous êtes déjà amis.");
  if (existing && existing.requesterId === userId) throw new FriendError("Demande déjà envoyée.");
  if (existing) return acceptFriendRequest(userId, existing.id); // il avait déjà demandé : on accepte
  if ((await friendCount(userId)) >= FRIEND_MAX) throw new FriendError(`Tu as atteint la limite de ${FRIEND_MAX} amis.`);
  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { username: true } });
  await prisma.$transaction(async (tx) => {
    await tx.friendship.create({ data: { requesterId: userId, addresseeId: to.id } });
    await notify(tx, to.id, "FRIEND_REQUEST", { username: me.username });
  });
}

export async function acceptFriendRequest(userId: string, friendshipId: string) {
  const row = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!row || row.addresseeId !== userId || row.status !== "PENDING") throw new FriendError("Demande introuvable.");
  if ((await friendCount(userId)) >= FRIEND_MAX) throw new FriendError(`Tu as atteint la limite de ${FRIEND_MAX} amis.`);
  if ((await friendCount(row.requesterId)) >= FRIEND_MAX) throw new FriendError("Ce joueur a atteint la limite d'amis.");
  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { username: true } });
  await prisma.$transaction(async (tx) => {
    const done = await tx.friendship.updateMany({ where: { id: row.id, status: "PENDING" }, data: { status: "ACCEPTED" } });
    if (done.count !== 1) throw new FriendError("Demande introuvable.");
    await notify(tx, row.requesterId, "FRIEND_ACCEPTED", { username: me.username });
  });
}

/** Refuser une demande reçue, annuler une demande envoyée ou retirer un ami : la ligne disparaît des deux côtés. */
export async function removeFriendship(userId: string, friendshipId: string) {
  const done = await prisma.friendship.deleteMany({ where: { id: friendshipId, OR: [{ requesterId: userId }, { addresseeId: userId }] } });
  if (done.count !== 1) throw new FriendError("Relation introuvable.");
}

/** Bloquer supprime l'amitié ou la demande existante. */
export async function blockUser(userId: string, username: string) {
  const target = await findUser(username);
  if (target.id === userId) throw new FriendError("Tu ne peux pas te bloquer toi-même.");
  await prisma.$transaction([
    prisma.friendship.deleteMany({ where: pair(userId, target.id) }),
    prisma.block.upsert({ where: { blockerId_blockedId: { blockerId: userId, blockedId: target.id } }, create: { blockerId: userId, blockedId: target.id }, update: {} }),
  ]);
}

export async function unblockUser(userId: string, blockedId: string) {
  await prisma.block.deleteMany({ where: { blockerId: userId, blockedId } });
}

export async function getFriendsState(userId: string, now = new Date()) {
  const [rows, blocks] = await Promise.all([
    prisma.friendship.findMany({ where: { OR: [{ requesterId: userId }, { addresseeId: userId }] }, orderBy: { createdAt: "desc" }, include: { requester: { select: { id: true, username: true, lastSeenAt: true } }, addressee: { select: { id: true, username: true, lastSeenAt: true } } } }),
    prisma.block.findMany({ where: { blockerId: userId }, orderBy: { createdAt: "desc" }, include: { blocked: { select: { id: true, username: true } } } }),
  ]);
  const other = (r: (typeof rows)[number]) => (r.requesterId === userId ? r.addressee : r.requester);
  const friends = rows.filter((r) => r.status === "ACCEPTED").map((r) => ({ friendshipId: r.id, ...other(r), online: isOnline(other(r).lastSeenAt, now), seen: seenLabel(other(r).lastSeenAt, now) }))
    .sort((a, b) => Number(b.online) - Number(a.online) || a.username.localeCompare(b.username));
  const received = rows.filter((r) => r.status === "PENDING" && r.addresseeId === userId).map((r) => ({ friendshipId: r.id, ...other(r) }));
  const sent = rows.filter((r) => r.status === "PENDING" && r.requesterId === userId).map((r) => ({ friendshipId: r.id, ...other(r) }));
  return { friends, received, sent, blocked: blocks.map((b) => ({ blockId: b.id, userId: b.blocked.id, username: b.blocked.username })) };
}

/** Relation entre le joueur et un autre (profil public). */
export async function relationWith(userId: string, otherId: string) {
  const [row, blocked] = await Promise.all([prisma.friendship.findFirst({ where: pair(userId, otherId) }), prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: userId, blockedId: otherId } } })]);
  if (blocked) return { kind: "blocked" as const };
  if (!row) return { kind: "none" as const };
  if (row.status === "ACCEPTED") return { kind: "friends" as const, friendshipId: row.id };
  return row.requesterId === userId ? { kind: "sent" as const, friendshipId: row.id } : { kind: "received" as const, friendshipId: row.id };
}
