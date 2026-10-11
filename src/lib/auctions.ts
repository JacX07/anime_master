// Enchères (SPEC étape 3, §4). La carte est bloquée (`inAuction`) pendant l'enchère ; chaque offre retire le montant du solde
// (BID_HOLD) et rembourse aussitôt l'enchérisseur dépassé (BID_REFUND). Tout se fait en transaction avec des mises à jour conditionnelles.

import type { Prisma } from "../generated/prisma/client";
import type { CardType, Finish, Rarity } from "../generated/prisma/enums";
import { prisma } from "./db";
import { AUCTION_DURATIONS_H, endAfterBid, MAX_ACTIVE_AUCTIONS, minBid, sellerProceeds, tradeEligibility } from "./economy";
import { notify } from "./notifications";

export class AuctionError extends Error {}

type Tx = Prisma.TransactionClient;

async function assertEligible(userId: string, now: Date) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { createdAt: true, _count: { select: { packOpenings: true } } } });
  const e = tradeEligibility(u.createdAt, u._count.packOpenings, now);
  if (!e.ok) throw new AuctionError(`Les enchères ne sont pas encore accessibles : ${e.reason}.`);
}

const isPrice = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 1_000_000_000;

export interface AuctionDraft {
  cardId: string;
  startPrice: number;
  durationHours: number;
  buyNowPrice?: number | null;
}

export async function createAuction(sellerId: string, d: AuctionDraft, now = new Date()) {
  await assertEligible(sellerId, now);
  if (!isPrice(d.startPrice)) throw new AuctionError("Prix de départ invalide (1 Ryō minimum).");
  if (!(AUCTION_DURATIONS_H as readonly number[]).includes(d.durationHours)) throw new AuctionError("Durée invalide.");
  const buyNow = d.buyNowPrice ?? null;
  if (buyNow !== null && (!isPrice(buyNow) || buyNow <= d.startPrice)) throw new AuctionError("Le prix d'achat immédiat doit dépasser le prix de départ.");
  return prisma.$transaction(async (tx) => {
    const active = await tx.auction.count({ where: { sellerId, status: "ACTIVE" } });
    if (active >= MAX_ACTIVE_AUCTIONS) throw new AuctionError(`Tu as déjà ${MAX_ACTIVE_AUCTIONS} enchères actives.`);
    // Le blocage conditionnel de la carte empêche de la mettre deux fois aux enchères ou de la vendre en parallèle
    const claimed = await tx.card.updateMany({ where: { id: d.cardId, ownerId: sellerId, locked: false, inAuction: false }, data: { inAuction: true, forTrade: false } });
    if (claimed.count !== 1) throw new AuctionError("Cette carte n'est pas disponible (verrouillée, déjà aux enchères ou introuvable).");
    const a = await tx.auction.create({
      data: { sellerId, cardId: d.cardId, startPrice: d.startPrice, buyNowPrice: buyNow, endsAt: new Date(now.getTime() + d.durationHours * 3600_000) },
      select: { id: true },
    });
    return a.id;
  });
}

/** Transfère la carte au gagnant et paie le vendeur (moins 5 %). Le montant est déjà retiré du solde du gagnant. */
async function settle(tx: Tx, auction: { id: string; sellerId: string; cardId: string; card: { character: { name: string } } }, winnerId: string, price: number, now: Date) {
  await tx.card.update({ where: { id: auction.cardId }, data: { ownerId: winnerId, inAuction: false, forTrade: false } });
  const net = sellerProceeds(price);
  await tx.user.update({ where: { id: auction.sellerId }, data: { balance: { increment: net } } });
  await tx.currencyLedger.create({ data: { userId: auction.sellerId, amount: price, reason: "AUCTION_SALE", refId: auction.id } });
  if (price > net) await tx.currencyLedger.create({ data: { userId: auction.sellerId, amount: -(price - net), reason: "AUCTION_FEE", refId: auction.id } });
  const character = auction.card.character.name;
  await notify(tx, winnerId, "AUCTION_WON", { auctionId: auction.id, character, amount: price });
  await notify(tx, auction.sellerId, "CARD_SOLD", { auctionId: auction.id, character, amount: net });
  void now;
}

const FOR_SETTLE = { id: true, sellerId: true, cardId: true, currentBid: true, currentBidderId: true, card: { select: { character: { select: { name: true } } } } } as const;

/** Clôture une enchère échue, une seule fois même si deux déclenchements arrivent ensemble. */
export async function closeAuction(auctionId: string, now = new Date()) {
  await prisma.$transaction(async (tx) => {
    const a = await tx.auction.findFirst({ where: { id: auctionId, status: "ACTIVE", endsAt: { lte: now } }, select: FOR_SETTLE });
    if (!a) return;
    const sold = a.currentBidderId !== null && a.currentBid !== null;
    const claimed = await tx.auction.updateMany({ where: { id: a.id, status: "ACTIVE" }, data: { status: sold ? "SOLD" : "UNSOLD", closedAt: now, finalPrice: sold ? a.currentBid : null } });
    if (claimed.count !== 1) return;
    if (sold) await settle(tx, a, a.currentBidderId!, a.currentBid!, now);
    else {
      await tx.card.update({ where: { id: a.cardId }, data: { inAuction: false } });
      await notify(tx, a.sellerId, "AUCTION_UNSOLD", { auctionId: a.id, character: a.card.character.name });
    }
  });
}

/** Clôture toutes les enchères échues (appelée à chaque consultation du marché et par la tâche planifiée). */
export async function closeDueAuctions(now = new Date()) {
  const due = await prisma.auction.findMany({ where: { status: "ACTIVE", endsAt: { lte: now } }, select: { id: true }, take: 200 });
  for (const { id } of due) await closeAuction(id, now);
  return due.length;
}

/** Rembourse l'enchérisseur en tête (s'il y en a un). */
async function refundLeader(tx: Tx, a: { id: string; currentBid: number | null; currentBidderId: string | null; card: { character: { name: string } } }, notifyOutbid: boolean) {
  if (a.currentBidderId === null || a.currentBid === null) return;
  await tx.user.update({ where: { id: a.currentBidderId }, data: { balance: { increment: a.currentBid } } });
  await tx.currencyLedger.create({ data: { userId: a.currentBidderId, amount: a.currentBid, reason: "BID_REFUND", refId: a.id } });
  if (notifyOutbid) await notify(tx, a.currentBidderId, "OUTBID", { auctionId: a.id, character: a.card.character.name, amount: a.currentBid });
}

async function hold(tx: Tx, userId: string, amount: number, auctionId: string) {
  const r = await tx.user.updateMany({ where: { id: userId, balance: { gte: amount } }, data: { balance: { decrement: amount } } });
  if (r.count !== 1) throw new AuctionError("Solde insuffisant.");
  await tx.currencyLedger.create({ data: { userId, amount: -amount, reason: "BID_HOLD", refId: auctionId } });
}

export async function placeBid(bidderId: string, auctionId: string, amount: number, now = new Date()) {
  await assertEligible(bidderId, now);
  await closeAuction(auctionId, now);
  if (!isPrice(amount)) throw new AuctionError("Montant invalide.");
  await prisma.$transaction(async (tx) => {
    const a = await tx.auction.findFirst({ where: { id: auctionId, status: "ACTIVE", endsAt: { gt: now } }, select: { ...FOR_SETTLE, startPrice: true, endsAt: true, buyNowPrice: true } });
    if (!a) throw new AuctionError("Cette enchère est terminée.");
    if (a.sellerId === bidderId) throw new AuctionError("Tu ne peux pas enchérir sur ta propre enchère.");
    if (a.currentBidderId === bidderId) throw new AuctionError("Tu es déjà le meilleur enchérisseur.");
    const min = minBid(a.startPrice, a.currentBid);
    if (amount < min) throw new AuctionError(`Offre minimale : ${min} Ryō.`);
    if (a.buyNowPrice !== null && amount >= a.buyNowPrice) throw new AuctionError("Ce montant atteint le prix d'achat immédiat : utilise « Acheter maintenant ».");
    // L'offre précédente doit être inchangée : sinon quelqu'un nous a devancé
    const won = await tx.auction.updateMany({
      where: { id: a.id, status: "ACTIVE", endsAt: { gt: now }, currentBid: a.currentBid, currentBidderId: a.currentBidderId },
      data: { currentBid: amount, currentBidderId: bidderId, endsAt: endAfterBid(a.endsAt, now) },
    });
    if (won.count !== 1) throw new AuctionError("Une autre offre vient d'être placée, réessaie.");
    await hold(tx, bidderId, amount, a.id);
    await refundLeader(tx, a, true);
    await tx.bid.create({ data: { auctionId: a.id, bidderId, amount } });
  });
}

export async function buyNow(buyerId: string, auctionId: string, now = new Date()) {
  await assertEligible(buyerId, now);
  await closeAuction(auctionId, now);
  await prisma.$transaction(async (tx) => {
    const a = await tx.auction.findFirst({ where: { id: auctionId, status: "ACTIVE", endsAt: { gt: now } }, select: { ...FOR_SETTLE, buyNowPrice: true } });
    if (!a) throw new AuctionError("Cette enchère est terminée.");
    if (a.buyNowPrice === null) throw new AuctionError("Pas de prix d'achat immédiat sur cette enchère.");
    if (a.sellerId === buyerId) throw new AuctionError("Tu ne peux pas acheter ta propre carte.");
    const price = a.buyNowPrice;
    const ended = await tx.auction.updateMany({
      where: { id: a.id, status: "ACTIVE", endsAt: { gt: now }, currentBid: a.currentBid, currentBidderId: a.currentBidderId },
      data: { status: "SOLD", closedAt: now, finalPrice: price, currentBid: price, currentBidderId: buyerId },
    });
    if (ended.count !== 1) throw new AuctionError("Une autre offre vient d'être placée, réessaie.");
    // Remboursement d'abord (si l'acheteur menait déjà, sa réservation lui revient), puis paiement du prix plein
    await refundLeader(tx, a, a.currentBidderId !== buyerId);
    await hold(tx, buyerId, price, a.id);
    await tx.bid.create({ data: { auctionId: a.id, bidderId: buyerId, amount: price } });
    await settle(tx, a, buyerId, price, now);
  });
}

export async function cancelAuction(sellerId: string, auctionId: string, now = new Date()) {
  await prisma.$transaction(async (tx) => {
    const r = await tx.auction.updateMany({ where: { id: auctionId, sellerId, status: "ACTIVE", currentBidderId: null }, data: { status: "CANCELLED", closedAt: now } });
    if (r.count !== 1) throw new AuctionError("Impossible d'annuler : l'enchère a déjà une offre ou est terminée.");
    const a = await tx.auction.findUniqueOrThrow({ where: { id: auctionId }, select: { cardId: true } });
    await tx.card.update({ where: { id: a.cardId }, data: { inAuction: false } });
  });
}

// ---------- Lecture ----------

export interface MarketFilters {
  q?: string;
  rarity?: Rarity;
  type?: CardType;
  finish?: Finish;
  series?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: "ending" | "priceAsc" | "priceDesc" | "recent";
}

const LIST_SELECT = {
  id: true,
  startPrice: true,
  buyNowPrice: true,
  currentBid: true,
  endsAt: true,
  seller: { select: { username: true } },
  card: { select: { serial: true, finish: true, character: { select: { id: true, name: true, rarity: true, type: true, imageUrl: true } } } },
} satisfies Prisma.AuctionSelect;

export async function listAuctions(f: MarketFilters, now = new Date()) {
  await closeDueAuctions(now);
  const price: Prisma.AuctionWhereInput[] = [];
  // Le prix affiché est l'offre actuelle, ou le prix de départ s'il n'y en a pas
  if (f.minPrice !== undefined) price.push({ OR: [{ currentBid: { gte: f.minPrice } }, { currentBid: null, startPrice: { gte: f.minPrice } }] });
  if (f.maxPrice !== undefined) price.push({ OR: [{ currentBid: { lte: f.maxPrice } }, { currentBid: null, startPrice: { lte: f.maxPrice } }] });
  const character: Prisma.CharacterWhereInput = {
    ...(f.q ? { name: { contains: f.q } } : {}),
    ...(f.rarity ? { rarity: f.rarity } : {}),
    ...(f.type ? { type: f.type } : {}),
    ...(f.series ? { media: { some: { media: { OR: [{ titleRomaji: { contains: f.series } }, { titleEnglish: { contains: f.series } }] } } } } : {}),
  };
  const rows = await prisma.auction.findMany({
    where: { status: "ACTIVE", AND: price, card: { ...(f.finish ? { finish: f.finish } : {}), character } },
    orderBy: f.sort === "recent" ? { createdAt: "desc" } : f.sort === "priceAsc" ? [{ currentBid: "asc" }, { startPrice: "asc" }] : f.sort === "priceDesc" ? [{ currentBid: "desc" }, { startPrice: "desc" }] : { endsAt: "asc" },
    take: 60,
    select: LIST_SELECT,
  });
  return rows.map((a) => ({ ...a, price: a.currentBid ?? a.startPrice }));
}

export type AuctionListItem = Awaited<ReturnType<typeof listAuctions>>[number];

export async function getAuction(id: string, now = new Date()) {
  await closeAuction(id, now);
  const a = await prisma.auction.findUnique({
    where: { id },
    select: {
      ...LIST_SELECT,
      sellerId: true,
      status: true,
      currentBidderId: true,
      currentBidder: { select: { username: true } },
      finalPrice: true,
      closedAt: true,
      card: { select: { id: true, serial: true, finish: true, character: { select: { id: true, name: true, rarity: true, type: true, imageUrl: true, attack: true, defense: true, power: true } } } },
      bids: { orderBy: { createdAt: "desc" }, take: 20, select: { amount: true, createdAt: true, bidder: { select: { username: true } } } },
    },
  });
  if (!a) return null;
  return { ...a, minBid: minBid(a.startPrice, a.currentBid) };
}

export async function myAuctions(userId: string, now = new Date()) {
  await closeDueAuctions(now);
  return prisma.auction.findMany({
    where: { OR: [{ sellerId: userId }, { currentBidderId: userId }], status: "ACTIVE" },
    orderBy: { endsAt: "asc" },
    select: { ...LIST_SELECT, sellerId: true, currentBidderId: true },
  });
}
