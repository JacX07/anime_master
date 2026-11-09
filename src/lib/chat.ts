// Chat : général, guilde, messages privés entre amis (docs/specs/social.md §4).

import { prisma } from "./db";
import { getAdventure } from "./adventure-state";
import { assertNotBlocked, FriendError } from "./friends";
import { CHAT_MIN_INTERVAL_MS, CHAT_PAGE, CHAT_RETENTION_DAYS, cleanMessage, dmChannel, GENERAL, GENERAL_MIN_LEVEL, guildChannel, parseChannel } from "./chat-rules";

export class ChatError extends Error {}

export interface ChatMessageView {
  id: string;
  channel: string;
  authorId: string;
  author: string;
  guildTag: string | null;
  content: string;
  createdAt: string;
  mine: boolean;
}

/** Vérifie que le joueur peut lire le canal ; renvoie s'il peut y écrire. */
async function access(userId: string, channel: string) {
  const parsed = parseChannel(channel);
  if (!parsed) throw new ChatError("Conversation introuvable.");
  if (parsed.kind === "general") return { write: true, kind: "general" as const };
  if (parsed.kind === "guild") {
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { guildId: true } });
    if (me?.guildId !== parsed.guildId) throw new ChatError("Tu n'es pas membre de cette guilde.");
    return { write: true, kind: "guild" as const, guildId: parsed.guildId };
  }
  if (parsed.a !== userId && parsed.b !== userId) throw new ChatError("Conversation introuvable.");
  const other = parsed.a === userId ? parsed.b : parsed.a;
  const friend = await prisma.friendship.findFirst({ where: { status: "ACCEPTED", OR: [{ requesterId: userId, addresseeId: other }, { requesterId: other, addresseeId: userId }] }, select: { id: true } });
  if (!friend) throw new ChatError("Tu ne peux écrire qu'à tes amis.");
  return { write: true, kind: "dm" as const, other };
}

export async function canWriteGeneral(userId: string) {
  return (await getAdventure(userId)).level >= GENERAL_MIN_LEVEL;
}

const toView = (m: { id: string; channel: string; authorId: string; content: string; createdAt: Date; author: { username: string; guild: { tag: string } | null } }, userId: string): ChatMessageView => ({
  id: m.id, channel: m.channel, authorId: m.authorId, author: m.author.username, guildTag: m.author.guild?.tag ?? null,
  content: m.content, createdAt: m.createdAt.toISOString(), mine: m.authorId === userId,
});
const include = { author: { select: { username: true, guild: { select: { tag: true } } } } } as const;

/** Derniers messages d'un canal (ou ceux postés après `after`) ; marque le canal comme lu. */
export async function getMessages(userId: string, channel: string, after?: string | null, markRead = true) {
  await access(userId, channel);
  const since = after ? new Date(after) : null;
  const rows = since && !Number.isNaN(since.getTime())
    ? await prisma.chatMessage.findMany({ where: { channel, deletedAt: null, createdAt: { gt: since } }, orderBy: { createdAt: "asc" }, take: 100, include })
    : (await prisma.chatMessage.findMany({ where: { channel, deletedAt: null }, orderBy: { createdAt: "desc" }, take: CHAT_PAGE, include })).reverse();
  if (markRead) await prisma.chatRead.upsert({ where: { channel_userId: { channel, userId } }, create: { channel, userId }, update: { lastReadAt: new Date() } });
  return rows.map((m) => toView(m, userId));
}

export async function sendMessage(userId: string, channel: string, text: string, now = new Date()) {
  const acc = await access(userId, channel);
  let content: string | null;
  try { content = cleanMessage(text); } catch (e) { throw new ChatError((e as Error).message); }
  if (!content) throw new ChatError("Message vide.");
  if (acc.kind === "general" && !(await canWriteGeneral(userId))) throw new ChatError(`Le chat général s'ouvre au niveau d'Arpenteur ${GENERAL_MIN_LEVEL}.`);
  if (acc.kind === "dm") await assertNotBlocked(userId, acc.other).catch((e: FriendError) => { throw new ChatError(e.message); });
  const last = await prisma.chatMessage.findFirst({ where: { authorId: userId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  if (last && now.getTime() - last.createdAt.getTime() < CHAT_MIN_INTERVAL_MS) throw new ChatError("Doucement : un message par seconde.");
  const message = await prisma.chatMessage.create({ data: { channel, authorId: userId, content, createdAt: now }, include });
  await prisma.chatRead.upsert({ where: { channel_userId: { channel, userId } }, create: { channel, userId, lastReadAt: now }, update: { lastReadAt: now } });
  // Nettoyage des vieux messages, de temps en temps
  if (Math.random() < 0.02) await prisma.chatMessage.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - CHAT_RETENTION_DAYS * 86_400_000) } } });
  return toView(message, userId);
}

/** Les trois onglets : non-lus, guilde du joueur, amis avec leurs derniers échanges. */
export async function getChatState(userId: string) {
  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { guildId: true, guildRole: true, role: true, guild: { select: { tag: true, name: true } } } });
  const friends = await prisma.friendship.findMany({ where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] }, include: { requester: { select: { id: true, username: true, lastSeenAt: true } }, addressee: { select: { id: true, username: true, lastSeenAt: true } } } });
  const peers = friends.map((f) => (f.requesterId === userId ? f.addressee : f.requester));
  const channels = [GENERAL, ...(me.guildId ? [guildChannel(me.guildId)] : []), ...peers.map((p) => dmChannel(userId, p.id))];
  const [reads, lastMessages] = await Promise.all([
    prisma.chatRead.findMany({ where: { userId, channel: { in: channels } } }),
    prisma.chatMessage.groupBy({ by: ["channel"], where: { channel: { in: channels }, deletedAt: null }, _max: { createdAt: true } }),
  ]);
  const readAt = new Map(reads.map((r) => [r.channel, r.lastReadAt]));
  const lastAt = new Map(lastMessages.map((m) => [m.channel, m._max.createdAt]));
  const unreadOf = async (channel: string, general = false) => {
    const read = readAt.get(channel);
    if (general && !read) return 0; // jamais ouvert : pas de pastille pour le général
    return prisma.chatMessage.count({ where: { channel, deletedAt: null, authorId: { not: userId }, ...(read ? { createdAt: { gt: read } } : {}) } });
  };
  const [general, guild, ...dm] = await Promise.all([unreadOf(GENERAL, true), me.guildId ? unreadOf(guildChannel(me.guildId)) : Promise.resolve(0), ...peers.map((p) => unreadOf(dmChannel(userId, p.id)))]);
  const conversations = peers.map((p, i) => ({ channel: dmChannel(userId, p.id), userId: p.id, username: p.username, lastSeenAt: p.lastSeenAt?.toISOString() ?? null, unread: dm[i], lastAt: lastAt.get(dmChannel(userId, p.id))?.toISOString() ?? null }))
    .sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? "") || a.username.localeCompare(b.username));
  return {
    general: { channel: GENERAL, unread: general, canWrite: await canWriteGeneral(userId) },
    guild: me.guildId ? { channel: guildChannel(me.guildId), tag: me.guild!.tag, name: me.guild!.name, unread: guild } : null,
    dms: conversations,
    unread: general + guild + dm.reduce((n, x) => n + x, 0),
    /** Droits de suppression : administration partout, chef dans sa guilde */
    staff: me.role === "moderator" || me.role === "admin",
    guildOwner: !!me.guildId && me.guildRole === "OWNER",
  };
}

export async function reportMessage(userId: string, messageId: string, reason = "") {
  const message = await prisma.chatMessage.findFirst({ where: { id: messageId, deletedAt: null } });
  if (!message) throw new ChatError("Message introuvable.");
  await access(userId, message.channel);
  if (message.authorId === userId) throw new ChatError("Tu ne peux pas signaler ton propre message.");
  await prisma.chatReport.upsert({ where: { reporterId_messageId: { reporterId: userId, messageId } }, create: { reporterId: userId, messageId, reason: String(reason).slice(0, 200) }, update: {} });
}

/** Suppression : le chef dans le chat de sa guilde, l'administration partout (seule voie dans le général). */
export async function deleteMessage(userId: string, messageId: string) {
  const message = await prisma.chatMessage.findFirst({ where: { id: messageId, deletedAt: null } });
  if (!message) throw new ChatError("Message introuvable.");
  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true, guildId: true, guildRole: true } });
  const parsed = parseChannel(message.channel);
  const staff = me.role === "moderator" || me.role === "admin";
  const owner = parsed?.kind === "guild" && me.guildId === parsed.guildId && me.guildRole === "OWNER";
  if (!staff && !owner) throw new ChatError("Tu ne peux pas supprimer ce message.");
  await prisma.chatMessage.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
}

const ONLINE_WINDOW_MS = 5 * 60_000;
const ONLINE_LIST_MAX = 60;

export interface OnlinePlayerView { id: string; username: string; guildTag: string | null; friend: boolean; sameGuild: boolean }

/** Joueurs vus depuis moins de 5 minutes (liste de l'onglet « En ligne ») : amis, puis guilde, puis les autres ; blocages exclus. */
export async function getOnlinePlayers(userId: string, now = new Date()) {
  const since = new Date(now.getTime() - ONLINE_WINDOW_MS);
  const [me, friendships, blocks] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { guildId: true } }),
    prisma.friendship.findMany({ where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] }, select: { requesterId: true, addresseeId: true } }),
    prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] }, select: { blockerId: true, blockedId: true } }),
  ]);
  const friendIds = new Set(friendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId)));
  const hidden = [userId, ...blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId))];
  const where = { lastSeenAt: { gt: since }, bannedAt: null, id: { notIn: hidden } };
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: { username: "asc" }, take: ONLINE_LIST_MAX, select: { id: true, username: true, guildId: true, guild: { select: { tag: true } } } }),
  ]);
  const players: OnlinePlayerView[] = rows.map((u) => ({ id: u.id, username: u.username, guildTag: u.guild?.tag ?? null, friend: friendIds.has(u.id), sameGuild: !!me.guildId && u.guildId === me.guildId }))
    .sort((a, b) => Number(b.friend) - Number(a.friend) || Number(b.sameGuild) - Number(a.sameGuild) || a.username.localeCompare(b.username));
  return { total, players };
}
