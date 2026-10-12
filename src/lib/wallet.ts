// Solde de Ryō et journal (SPEC étape 3, §1 et §2). Chaque mouvement écrit le solde et le journal
// dans la même transaction : `User.balance` est toujours égal à la somme de `CurrencyLedger`.

import type { Rarity } from "../generated/prisma/enums";
import { prisma } from "./db";
import { DAILY_BONUS, canClaimDailyBonus, pickDuplicates, quickSellPrice, startOfDay } from "./economy";
import type { Finish } from "./pull";

export class SaleError extends Error {}

export interface Wallet {
  balance: number;
  canClaimBonus: boolean;
}

export async function getWallet(userId: string, now = new Date()): Promise<Wallet> {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true, lastDailyBonusAt: true } });
  return { balance: u.balance, canClaimBonus: canClaimDailyBonus(u.lastDailyBonusAt, now) };
}

/** Bonus quotidien : le `updateMany` conditionnel garantit une seule réclamation par jour, même en cas de double clic. */
export async function claimDailyBonus(userId: string, now = new Date()): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.user.updateMany({
      where: { id: userId, OR: [{ lastDailyBonusAt: null }, { lastDailyBonusAt: { lt: startOfDay(now) } }] },
      data: { lastDailyBonusAt: now, balance: { increment: DAILY_BONUS } },
    });
    if (claimed.count !== 1) throw new SaleError("Bonus déjà réclamé aujourd'hui.");
    await tx.currencyLedger.create({ data: { userId, amount: DAILY_BONUS, reason: "DAILY" } });
    return DAILY_BONUS;
  });
}

export async function setLocked(userId: string, cardId: string, locked: boolean) {
  const res = await prisma.card.updateMany({ where: { id: cardId, ownerId: userId }, data: { locked } });
  if (res.count !== 1) throw new SaleError("Carte introuvable.");
}

const COPY_SELECT = {
  id: true,
  characterId: true,
  finish: true,
  serial: true,
  locked: true,
  inAuction: true,
  inExpedition: true,
  character: { select: { name: true, rarity: true } },
} as const;

export interface SalePreview {
  count: number;
  total: number;
  /** Personnages dont on vend un exemplaire (pour l'avertissement) */
  characters: number;
}

/** Cartes du joueur à vendre en groupe (doublons uniquement), éventuellement limitées à certaines raretés. */
async function duplicatesFor(userId: string, rarities: Rarity[]) {
  const rows = await prisma.card.findMany({ where: { ownerId: userId }, select: COPY_SELECT });
  // Une carte aux enchères est intouchable, comme une carte verrouillée
  const copies = rows.map((c) => ({ ...c, locked: c.locked || c.inAuction || c.inExpedition }));
  return pickDuplicates(copies).filter((c) => rarities.includes(c.character.rarity));
}

export async function previewDuplicateSale(userId: string, rarities: Rarity[]): Promise<SalePreview> {
  const list = await duplicatesFor(userId, rarities);
  return {
    count: list.length,
    total: list.reduce((n, c) => n + quickSellPrice(c.character.rarity, c.finish), 0),
    characters: new Set(list.map((c) => c.characterId)).size,
  };
}

/**
 * Vend des cartes au système. La liste est relue côté serveur : propriétaire, cadenas et prix ne viennent jamais du client.
 * La suppression conditionnelle (`deleteMany` sur propriétaire + non verrouillée) empêche de vendre deux fois la même carte.
 */
async function sell(userId: string, cards: { id: string; finish: Finish; character: { rarity: Rarity } }[]): Promise<number> {
  if (cards.length === 0) throw new SaleError("Aucune carte à vendre.");
  const total = cards.reduce((n, c) => n + quickSellPrice(c.character.rarity, c.finish), 0);
  await prisma.$transaction(async (tx) => {
    const removed = await tx.card.deleteMany({ where: { id: { in: cards.map((c) => c.id) }, ownerId: userId, locked: false, inAuction: false, inExpedition: false } });
    if (removed.count !== cards.length) throw new SaleError("Une des cartes n'est plus disponible à la vente.");
    await tx.user.update({ where: { id: userId }, data: { balance: { increment: total } } });
    await tx.currencyLedger.createMany({
      data: cards.map((c) => ({ userId, amount: quickSellPrice(c.character.rarity, c.finish), reason: "QUICK_SELL" as const, refId: c.id })),
    });
  });
  return total;
}

/** Vente rapide d'un exemplaire précis (n'importe lequel, s'il n'est pas verrouillé). */
export async function sellCard(userId: string, cardId: string): Promise<number> {
  const card = await prisma.card.findFirst({ where: { id: cardId, ownerId: userId }, select: COPY_SELECT });
  if (!card) throw new SaleError("Carte introuvable.");
  if (card.locked) throw new SaleError("Cette carte est verrouillée.");
  if (card.inAuction) throw new SaleError("Cette carte est aux enchères.");
  if (card.inExpedition) throw new SaleError("Cette carte est en expédition.");
  return sell(userId, [card]);
}

export async function sellDuplicates(userId: string, rarities: Rarity[]): Promise<{ count: number; total: number }> {
  const list = await duplicatesFor(userId, rarities);
  return { count: list.length, total: await sell(userId, list) };
}
