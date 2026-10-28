// Échanges directs entre joueurs (SPEC étape 3, §3). Les cartes ne sont pas bloquées pendant l'attente :
// tout est revérifié à l'acceptation, puis exécuté dans une seule transaction (tout ou rien).

import { prisma } from "./db";
import { MAX_PENDING_TRADES, TRADE_LIFETIME_MS, tradeEligibility } from "./economy";
import { checkAchievementsSafe } from "./achievements";
import { notify } from "./notifications";
import { notifyWishers } from "./wishlist";

export class TradeError extends Error {}
/** L'offre n'est plus exécutable (carte vendue, solde insuffisant…) : elle passe en INVALID. */
class InvalidTrade extends Error {}

export interface TradeDraft {
  toUsername: string;
  giveCardIds: string[];
  giveRyo: number;
  askCardIds: string[];
  askRyo: number;
}

async function eligibility(userId: string, now: Date) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { createdAt: true, _count: { select: { packOpenings: true } } } });
  return tradeEligibility(u.createdAt, u._count.packOpenings, now);
}

const isCount = (n: number) => Number.isInteger(n) && n >= 0 && n <= 1_000_000_000;

/** Cartes qui doivent appartenir à `ownerId`, non verrouillées et pas aux enchères. */
async function assertCards(ownerId: string, ids: string[], who: string) {
  if (new Set(ids).size !== ids.length) throw new TradeError("Une carte est indiquée deux fois.");
  if (ids.length === 0) return;
  const ok = await prisma.card.count({ where: { id: { in: ids }, ownerId, locked: false, inAuction: false, inExpedition: false } });
  if (ok !== ids.length) throw new TradeError(`Une des cartes de ${who} n'est plus disponible (verrouillée, aux enchères ou déjà échangée).`);
}

export async function createTrade(fromId: string, d: TradeDraft, now = new Date()) {
  if (!isCount(d.giveRyo) || !isCount(d.askRyo)) throw new TradeError("Montant de Ryō invalide.");
  if (d.giveCardIds.length + d.askCardIds.length + d.giveRyo + d.askRyo === 0) throw new TradeError("L'offre est vide.");
  if (d.giveCardIds.length + d.giveRyo === 0) throw new TradeError("Tu dois proposer au moins une carte ou des Ryō.");
  if (d.giveCardIds.length > 30 || d.askCardIds.length > 30) throw new TradeError("30 cartes maximum de chaque côté.");

  const to = await prisma.user.findUnique({ where: { username: d.toUsername.trim().toLowerCase() }, select: { id: true, username: true } });
  if (!to) throw new TradeError("Joueur introuvable.");
  if (to.id === fromId) throw new TradeError("Tu ne peux pas t'envoyer une offre à toi-même.");

  const [mine, theirs] = await Promise.all([eligibility(fromId, now), eligibility(to.id, now)]);
  if (!mine.ok) throw new TradeError(`Tu ne peux pas encore échanger : ${mine.reason}.`);
  if (!theirs.ok) throw new TradeError(`${to.username} ne peut pas encore échanger : ${theirs.reason}.`);

  const me = await prisma.user.findUniqueOrThrow({ where: { id: fromId }, select: { username: true, balance: true } });
  if (me.balance < d.giveRyo) throw new TradeError("Solde insuffisant pour cette offre.");
  await assertCards(fromId, d.giveCardIds, "ton côté");
  await assertCards(to.id, d.askCardIds, `${to.username}`);

  return prisma.$transaction(async (tx) => {
    const pending = await tx.trade.count({ where: { fromId, status: "PENDING" } });
    if (pending >= MAX_PENDING_TRADES) throw new TradeError(`Tu as déjà ${MAX_PENDING_TRADES} offres en attente.`);
    const trade = await tx.trade.create({
      data: {
        fromId,
        toId: to.id,
        fromCurrency: d.giveRyo,
        toCurrency: d.askRyo,
        expiresAt: new Date(now.getTime() + TRADE_LIFETIME_MS),
        items: { create: [...d.giveCardIds.map((cardId) => ({ cardId, side: "FROM" as const })), ...d.askCardIds.map((cardId) => ({ cardId, side: "TO" as const }))] },
      },
      select: { id: true },
    });
    await notify(tx, to.id, "TRADE_RECEIVED", { tradeId: trade.id, username: me.username });
    return trade.id;
  });
}

/** Passe en EXPIRED les offres en attente dont la date est dépassée (paresseux : à chaque consultation). */
export async function expireTrades(now = new Date()) {
  const late = await prisma.trade.findMany({ where: { status: "PENDING", expiresAt: { lte: now } }, select: { id: true, fromId: true, to: { select: { username: true } } } });
  for (const t of late) {
    await prisma.$transaction(async (tx) => {
      const r = await tx.trade.updateMany({ where: { id: t.id, status: "PENDING" }, data: { status: "EXPIRED", resolvedAt: now } });
      if (r.count === 1) await notify(tx, t.fromId, "TRADE_EXPIRED", { tradeId: t.id, username: t.to.username });
    });
  }
}

export async function acceptTrade(userId: string, tradeId: string, now = new Date()) {
  await expireTrades(now);
  let parties: string[] = [];
  try {
    await prisma.$transaction(async (tx) => {
      // Le passage conditionnel PENDING → ACCEPTED garantit une seule exécution, même en cas de double clic
      const claimed = await tx.trade.updateMany({ where: { id: tradeId, toId: userId, status: "PENDING", expiresAt: { gt: now } }, data: { status: "ACCEPTED", resolvedAt: now } });
      if (claimed.count !== 1) throw new TradeError("Cette offre n'est plus disponible.");
      const t = await tx.trade.findUniqueOrThrow({ where: { id: tradeId }, include: { items: true, from: { select: { username: true } }, to: { select: { username: true } } } });
      const fromCards = t.items.filter((i) => i.side === "FROM").map((i) => i.cardId);
      const toCards = t.items.filter((i) => i.side === "TO").map((i) => i.cardId);

      for (const [ownerId, ids] of [[t.fromId, fromCards], [t.toId, toCards]] as const) {
        if (ids.length === 0) continue;
        const ok = await tx.card.count({ where: { id: { in: ids }, ownerId, locked: false, inAuction: false, inExpedition: false } });
        if (ok !== ids.length) throw new InvalidTrade("une des cartes n'est plus disponible");
      }
      if (fromCards.length) await tx.card.updateMany({ where: { id: { in: fromCards } }, data: { ownerId: t.toId, forTrade: false } });
      if (toCards.length) await tx.card.updateMany({ where: { id: { in: toCards } }, data: { ownerId: t.fromId, forTrade: false } });
      // Ryō : retrait conditionnel (le solde ne devient jamais négatif), crédit, et une ligne de journal par mouvement
      for (const [payer, receiver, amount] of [[t.fromId, t.toId, t.fromCurrency], [t.toId, t.fromId, t.toCurrency]] as const) {
        if (amount === 0) continue;
        const r = await tx.user.updateMany({ where: { id: payer, balance: { gte: amount } }, data: { balance: { decrement: amount } } });
        if (r.count !== 1) throw new InvalidTrade("solde insuffisant");
        await tx.user.update({ where: { id: receiver }, data: { balance: { increment: amount } } });
        await tx.currencyLedger.create({ data: { userId: payer, amount: -amount, reason: "TRADE_OUT", refId: tradeId } });
        await tx.currencyLedger.create({ data: { userId: receiver, amount, reason: "TRADE_IN", refId: tradeId } });
      }
      await notify(tx, t.fromId, "TRADE_ACCEPTED", { tradeId, username: t.to.username });
      parties = [t.fromId, t.toId];
    });
    await checkAchievementsSafe(...parties);
  } catch (err) {
    if (err instanceof InvalidTrade) {
      // La transaction est annulée : on marque l'offre invalide à part
      const t = await prisma.trade.findUnique({ where: { id: tradeId }, select: { fromId: true, toId: true, from: { select: { username: true } }, to: { select: { username: true } } } });
      const r = await prisma.trade.updateMany({ where: { id: tradeId, status: "PENDING" }, data: { status: "INVALID", resolvedAt: now } });
      if (r.count === 1 && t) {
        await notify(prisma, t.fromId, "TRADE_INVALID", { tradeId, username: t.to.username, reason: err.message });
      }
      throw new TradeError(`Échange impossible : ${err.message}. L'offre est annulée.`);
    }
    throw err;
  }
}

export async function refuseTrade(userId: string, tradeId: string, now = new Date()) {
  await prisma.$transaction(async (tx) => {
    const t = await tx.trade.findFirst({ where: { id: tradeId, toId: userId, status: "PENDING" }, select: { fromId: true, to: { select: { username: true } } } });
    const r = await tx.trade.updateMany({ where: { id: tradeId, toId: userId, status: "PENDING" }, data: { status: "REFUSED", resolvedAt: now } });
    if (r.count !== 1 || !t) throw new TradeError("Cette offre n'est plus disponible.");
    await notify(tx, t.fromId, "TRADE_REFUSED", { tradeId, username: t.to.username });
  });
}

export async function cancelTrade(userId: string, tradeId: string, now = new Date()) {
  const r = await prisma.trade.updateMany({ where: { id: tradeId, fromId: userId, status: "PENDING" }, data: { status: "CANCELLED", resolvedAt: now } });
  if (r.count !== 1) throw new TradeError("Cette offre n'est plus disponible.");
}

const CARD_SELECT = { select: { id: true, serial: true, finish: true, character: { select: { id: true, name: true, rarity: true, imageUrl: true } } } } as const;

export async function listTrades(userId: string, now = new Date()) {
  await expireTrades(now);
  const rows = await prisma.trade.findMany({
    where: { OR: [{ fromId: userId }, { toId: userId }] },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { from: { select: { username: true } }, to: { select: { username: true } }, items: { include: { card: CARD_SELECT } } },
  });
  return rows.map((t) => ({
    id: t.id,
    status: t.status,
    mine: t.fromId === userId,
    other: t.fromId === userId ? t.to.username : t.from.username,
    /// Ce que JE donne / reçois
    give: t.items.filter((i) => i.side === (t.fromId === userId ? "FROM" : "TO")).map((i) => i.card),
    get: t.items.filter((i) => i.side === (t.fromId === userId ? "TO" : "FROM")).map((i) => i.card),
    giveRyo: t.fromId === userId ? t.fromCurrency : t.toCurrency,
    getRyo: t.fromId === userId ? t.toCurrency : t.fromCurrency,
    createdAt: t.createdAt,
    expiresAt: t.expiresAt,
  }));
}

export type TradeRow = Awaited<ReturnType<typeof listTrades>>[number];

/** Cartes proposables à l'échange (pour composer une offre). */
export async function tradableCards(userId: string) {
  const rows = await prisma.card.findMany({
    where: { ownerId: userId, locked: false, inAuction: false, inExpedition: false },
    select: { id: true, serial: true, finish: true, forTrade: true, character: { select: { name: true, rarity: true } } },
    orderBy: [{ character: { favourites: "desc" } }, { serial: "asc" }],
  });
  return rows.map((c) => ({ id: c.id, serial: c.serial, finish: c.finish, forTrade: c.forTrade, name: c.character.name, rarity: c.character.rarity }));
}

export async function setForTrade(userId: string, cardId: string, forTrade: boolean) {
  const r = await prisma.card.updateMany({ where: { id: cardId, ownerId: userId, ...(forTrade ? { locked: false, inAuction: false, inExpedition: false } : {}) }, data: { forTrade } });
  if (r.count !== 1) throw new TradeError("Carte introuvable ou indisponible.");
  if (forTrade) {
    const c = await prisma.card.findUniqueOrThrow({ where: { id: cardId }, select: { finish: true, characterId: true, owner: { select: { username: true } }, character: { select: { name: true } } } });
    await notifyWishers({ characterId: c.characterId, finish: c.finish, ownerId: userId, characterName: c.character.name, source: "trade", username: c.owner.username });
  }
}

/** Joueurs qui proposent ce personnage à l'échange. */
export async function traders(characterId: number) {
  const cards = await prisma.card.findMany({
    where: { characterId, forTrade: true, locked: false, inAuction: false, inExpedition: false },
    select: { id: true, serial: true, finish: true, owner: { select: { username: true } } },
    orderBy: { serial: "asc" },
    take: 30,
  });
  return cards.map((c) => ({ id: c.id, serial: c.serial, finish: c.finish, username: c.owner.username }));
}
