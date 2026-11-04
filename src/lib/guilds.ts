import { prisma } from "./db";
import type { Prisma } from "../generated/prisma/client";
import type { GuildRole } from "../generated/prisma/enums";
import { GUILD_COOLDOWN_MS, GUILD_COST, GUILD_ICONS, GUILD_MAX, type GuildInput } from "./guild-rules";
import { collectionScores } from "./leaderboard";

type Tx = Prisma.TransactionClient;
export class GuildError extends Error {}
const userSelect = { id: true, username: true, guildId: true, guildRole: true, guildLeftAt: true } as const;

function fields(input: GuildInput) {
  if (!input || typeof input.name !== "string" || typeof input.tag !== "string" || typeof input.description !== "string") throw new GuildError("Informations de guilde invalides.");
  const name = input.name.trim().replace(/\s+/g, " ");
  const tag = input.tag.trim().toUpperCase();
  if (name.length < 3 || name.length > 40 || /[\p{C}]/u.test(name)) throw new GuildError("Le nom doit compter de 3 à 40 caractères lisibles.");
  if (!/^[A-Z0-9]{2,4}$/.test(tag)) throw new GuildError("Le tag doit compter de 2 à 4 lettres ou chiffres.");
  if (input.description.length > 500) throw new GuildError("La description est limitée à 500 caractères.");
  if (!(GUILD_ICONS as readonly string[]).includes(input.icon) || !["OPEN", "REQUEST"].includes(input.joinMode)) throw new GuildError("Emblème ou mode d’entrée invalide.");
  return { name, nameKey: name.toLocaleLowerCase("fr"), tag, description: input.description.trim(), icon: input.icon, joinMode: input.joinMode };
}

async function lockUser(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;
  const user = await tx.user.findUnique({ where: { id }, select: userSelect });
  if (!user) throw new GuildError("Joueur introuvable.");
  return user;
}
async function lockGuild(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM "Guild" WHERE id = ${id} FOR UPDATE`;
  const guild = await tx.guild.findUnique({ where: { id } });
  if (!guild) throw new GuildError("Guilde introuvable.");
  return guild;
}
function canJoin(user: { guildId: string | null; guildLeftAt: Date | null }, now: Date) {
  if (user.guildId) throw new GuildError("Tu appartiens déjà à une guilde.");
  if (user.guildLeftAt && now.getTime() - user.guildLeftAt.getTime() < GUILD_COOLDOWN_MS) throw new GuildError("Attends 24 h après ton départ avant de créer ou rejoindre une guilde.");
}
function requireRole(user: { guildId: string | null; guildRole: GuildRole }, guildId: string, owner = false) {
  if (user.guildId !== guildId || (owner ? user.guildRole !== "OWNER" : user.guildRole === "MEMBER")) throw new GuildError("Tu n’as pas les droits pour cette action.");
}
async function addMember(tx: Tx, guildId: string, userId: string, now: Date) {
  const user = await lockUser(tx, userId);
  canJoin(user, now);
  if (await tx.user.count({ where: { guildId } }) >= GUILD_MAX) throw new GuildError("Cette guilde compte déjà 20 membres.");
  await tx.user.update({ where: { id: userId }, data: { guildId, guildRole: "MEMBER" } });
  await tx.guildJoinRequest.deleteMany({ where: { userId } });
}

export async function createGuild(userId: string, input: GuildInput, now = new Date()) {
  const data = fields(input);
  return prisma.$transaction(async (tx) => {
    const user = await lockUser(tx, userId);
    canJoin(user, now);
    const paid = await tx.user.updateMany({ where: { id: userId, balance: { gte: GUILD_COST } }, data: { balance: { decrement: GUILD_COST } } });
    if (paid.count !== 1) throw new GuildError("Il te faut 1 000 Ryō pour créer une guilde.");
    const guild = await tx.guild.create({ data: { ...data, ownerId: userId } });
    await tx.user.update({ where: { id: userId }, data: { guildId: guild.id, guildRole: "OWNER" } });
    await tx.currencyLedger.create({ data: { userId, amount: -GUILD_COST, reason: "GUILD_CREATE", refId: guild.id } });
    await tx.guildJoinRequest.deleteMany({ where: { userId } });
    return guild;
  });
}
export async function updateGuild(userId: string, guildId: string, input: GuildInput) {
  const data = fields(input);
  return prisma.$transaction(async (tx) => {
    await lockGuild(tx, guildId);
    requireRole(await lockUser(tx, userId), guildId, true);
    return tx.guild.update({ where: { id: guildId }, data });
  });
}
export async function joinGuild(userId: string, guildId: string, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const guild = await lockGuild(tx, guildId);
    const user = await lockUser(tx, userId);
    canJoin(user, now);
    if (await tx.user.count({ where: { guildId } }) >= GUILD_MAX) throw new GuildError("Cette guilde compte déjà 20 membres.");
    if (guild.joinMode === "OPEN") {
      await addMember(tx, guildId, userId, now);
      return { joined: true, tag: guild.tag };
    }
    const existing = await tx.guildJoinRequest.findUnique({ where: { guildId_userId: { guildId, userId } } });
    if (existing?.status === "PENDING") throw new GuildError("Ta demande est déjà en attente.");
    await tx.guildJoinRequest.upsert({ where: { guildId_userId: { guildId, userId } }, create: { guildId, userId }, update: { status: "PENDING", createdAt: now } });
    return { joined: false, tag: guild.tag };
  });
}
export async function cancelGuildRequest(userId: string, guildId: string) {
  await prisma.$transaction(async (tx) => {
    await lockGuild(tx, guildId);
    await lockUser(tx, userId);
    await tx.guildJoinRequest.deleteMany({ where: { guildId, userId, status: "PENDING" } });
  });
}
export async function reviewGuildRequest(userId: string, guildId: string, requestId: string, accept: boolean, now = new Date()) {
  if (typeof accept !== "boolean") throw new GuildError("Décision invalide.");
  await prisma.$transaction(async (tx) => {
    await lockGuild(tx, guildId);
    requireRole(await lockUser(tx, userId), guildId);
    const request = await tx.guildJoinRequest.findFirst({ where: { id: requestId, guildId, status: "PENDING" } });
    if (!request) throw new GuildError("Cette demande n’est plus en attente.");
    if (accept) await addMember(tx, guildId, request.userId, now);
    else await tx.guildJoinRequest.update({ where: { id: request.id }, data: { status: "REFUSED" } });
  });
}
export async function changeGuildRole(userId: string, guildId: string, targetId: string, role: "OFFICER" | "MEMBER") {
  if (!["OFFICER", "MEMBER"].includes(role)) throw new GuildError("Rôle invalide.");
  await prisma.$transaction(async (tx) => {
    await lockGuild(tx, guildId);
    requireRole(await lockUser(tx, userId), guildId, true);
    const target = await lockUser(tx, targetId);
    if (target.guildId !== guildId || target.guildRole === "OWNER") throw new GuildError("Ce membre ne peut pas changer de rôle.");
    await tx.user.update({ where: { id: targetId }, data: { guildRole: role } });
  });
}
export async function transferGuild(userId: string, guildId: string, targetId: string) {
  await prisma.$transaction(async (tx) => {
    await lockGuild(tx, guildId);
    requireRole(await lockUser(tx, userId), guildId, true);
    const target = await lockUser(tx, targetId);
    if (target.guildId !== guildId || target.id === userId) throw new GuildError("Choisis un autre membre de la guilde.");
    await tx.guild.update({ where: { id: guildId }, data: { ownerId: targetId } });
    await tx.user.update({ where: { id: userId }, data: { guildRole: "MEMBER" } });
    await tx.user.update({ where: { id: targetId }, data: { guildRole: "OWNER" } });
  });
}
export async function kickGuildMember(userId: string, guildId: string, targetId: string, now = new Date()) {
  await prisma.$transaction(async (tx) => {
    await lockGuild(tx, guildId);
    const actor = await lockUser(tx, userId);
    requireRole(actor, guildId);
    const target = await lockUser(tx, targetId);
    if (target.guildId !== guildId || target.guildRole === "OWNER" || (actor.guildRole === "OFFICER" && target.guildRole !== "MEMBER")) throw new GuildError("Tu ne peux pas expulser ce joueur.");
    await tx.user.update({ where: { id: targetId }, data: { guildId: null, guildRole: "MEMBER", guildLeftAt: now } });
  });
}
export async function leaveGuild(userId: string, guildId: string, now = new Date()) {
  await prisma.$transaction(async (tx) => {
    await lockGuild(tx, guildId);
    const user = await lockUser(tx, userId);
    if (user.guildId !== guildId) throw new GuildError("Tu n’appartiens pas à cette guilde.");
    if (user.guildRole === "OWNER") {
      if (await tx.user.count({ where: { guildId } }) !== 1) throw new GuildError("Transmets ton rôle de chef avant de partir.");
      await tx.guild.delete({ where: { id: guildId } });
    }
    await tx.user.update({ where: { id: userId }, data: { guildId: null, guildRole: "MEMBER", guildLeftAt: now } });
  });
}
export async function dissolveGuild(userId: string, guildId: string, now = new Date()) {
  await prisma.$transaction(async (tx) => {
    await lockGuild(tx, guildId);
    requireRole(await lockUser(tx, userId), guildId, true);
    await tx.user.updateMany({ where: { guildId }, data: { guildId: null, guildRole: "MEMBER", guildLeftAt: now } });
    await tx.guild.delete({ where: { id: guildId } });
  });
}

export async function listGuilds(userId: string, search = "", now = new Date()) {
  const [me, guilds, requests] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { ...userSelect, balance: true, guild: { select: { tag: true, name: true } } } }),
    prisma.guild.findMany({ where: search.trim() ? { OR: [{ name: { contains: search.trim().slice(0, 40), mode: "insensitive" } }, { tag: { contains: search.trim().slice(0, 40), mode: "insensitive" } }] } : {}, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 50, select: { id: true, name: true, tag: true, icon: true, description: true, joinMode: true, _count: { select: { members: true } } } }),
    prisma.guildJoinRequest.findMany({ where: { userId, status: "PENDING" }, select: { guildId: true } }),
  ]);
  return { me, guilds, cooldown: !!me.guildLeftAt && now.getTime() - me.guildLeftAt.getTime() < GUILD_COOLDOWN_MS, requested: requests.map((r) => r.guildId) };
}
export async function getGuild(userId: string, tag: string, now = new Date()) {
  const guild = await prisma.guild.findUnique({ where: { tag: tag.toUpperCase() }, include: { members: { select: { id: true, username: true, guildRole: true, lastSeenAt: true }, orderBy: { username: "asc" } } } });
  if (!guild) return null;
  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: userSelect });
  const manager = me.guildId === guild.id && me.guildRole !== "MEMBER";
  const [requests, mine] = await Promise.all([
    manager ? prisma.guildJoinRequest.findMany({ where: { guildId: guild.id, status: "PENDING" }, orderBy: { createdAt: "asc" }, select: { id: true, user: { select: { username: true } } } }) : [],
    prisma.guildJoinRequest.findUnique({ where: { guildId_userId: { guildId: guild.id, userId } }, select: { status: true } }),
  ]);
  return { guild, me, requests, cooldown: !!me.guildLeftAt && now.getTime() - me.guildLeftAt.getTime() < GUILD_COOLDOWN_MS, requested: mine?.status === "PENDING" };
}

/** La semaine civile à Paris, y compris lors des changements d’heure. */
export function guildWeekStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (key: string) => Number(parts.find((p) => p.type === key)!.value);
  const date = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  const parisHour = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" });
  const noon = new Date(date.getTime() + 12 * 3600_000);
  const offset = Number(parisHour.format(noon)) - 12;
  return new Date(date.getTime() - offset * 3600_000);
}
export async function guildLeaderboard(kind: "collection" | "duels", now = new Date()) {
  const [guilds, scores] = await Promise.all([
    prisma.guild.findMany({ select: { id: true, name: true, tag: true, icon: true, members: { select: { id: true } } } }),
    kind === "collection" ? collectionScores() : prisma.duel.groupBy({ by: ["winnerId"], where: { winnerId: { not: null }, status: { in: ["DONE", "FORFEIT"] }, resolvedAt: { gte: guildWeekStart(now), lte: now } }, _count: true }),
  ]);
  const values = new Map(scores.map((r) => "userId" in r ? [r.userId, Math.floor(Number(r.score))] as const : [r.winnerId!, r._count] as const));
  return guilds.map((g) => ({ id: g.id, name: g.name, tag: g.tag, icon: g.icon, members: g.members.length, score: g.members.reduce((sum, u) => sum + (values.get(u.id) ?? 0), 0) }))
    .sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag)).slice(0, 100).map((g, i) => ({ ...g, rank: i + 1 }));
}
