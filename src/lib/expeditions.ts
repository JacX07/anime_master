// Expéditions (SPEC étape 4 ter) : une équipe de 1 à 3 cartes explore une brèche pendant 1, 6 ou 24 h, puis le joueur récupère le butin.
// Le résultat se calcule à la récupération depuis une graine tirée au lancement (recharger ne change rien). Les passages d'état sont
// conditionnels (updateMany) : un double clic ne paie jamais deux fois.

import type { Prisma } from "../generated/prisma/client";
import { checkAchievementsSafe } from "./achievements";
import { afterGain } from "./crystal-stock";
import { prisma } from "./db";
import { startOfDay } from "./economy";
import { weekBounds } from "./banners";
import { notify } from "./notifications";
import { breachById, DAILY_CRYSTAL_CAP, DAILY_RYO_CAP, HOUR, MAX_TEAM, resolve, SLOTS, slotsFor, WEEKLY_SPECIAL_CAP } from "./expedition-rules";

export class ExpeditionError extends Error {}

export * from "./expedition-rules";

type Tx = Prisma.TransactionClient;

/** Emplacements occupés : expéditions non récupérées (en cours ou terminées). */
export const usedSlots = (userId: string, db: Tx | typeof prisma = prisma) => db.expedition.count({ where: { userId, status: "RUNNING" } });

export async function startExpedition(userId: string, breachId: string, cardIds: string[], now = new Date()) {
  const breach = breachById(breachId);
  if (!breach) throw new ExpeditionError("Brèche inconnue.");
  const ids = [...new Set(cardIds)];
  if (ids.length !== cardIds.length || ids.length < 1 || ids.length > MAX_TEAM) throw new ExpeditionError(`Choisis de 1 à ${MAX_TEAM} cartes différentes.`);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { expeditionsDone: true } });
    if ((await usedSlots(userId, tx)) >= slotsFor(user.expeditionsDone)) throw new ExpeditionError("Aucun emplacement libre : récupère d'abord une expédition terminée.");
    const cards = await tx.card.findMany({ where: { id: { in: ids }, ownerId: userId, inExpedition: false, inAuction: false }, select: { id: true, characterId: true, character: { select: { type: true, power: true } } } });
    if (cards.length !== ids.length) throw new ExpeditionError("Une des cartes n'est plus disponible (enchère, expédition en cours ou carte cédée).");
    const claimed = await tx.card.updateMany({ where: { id: { in: ids }, ownerId: userId, inExpedition: false, inAuction: false }, data: { inExpedition: true } });
    if (claimed.count !== ids.length) throw new ExpeditionError("Une des cartes n'est plus disponible.");
    return tx.expedition.create({
      data: {
        userId, breachId, endsAt: new Date(now.getTime() + breach.hours * HOUR), seed: Math.floor(Math.random() * 2 ** 31),
        cards: { create: cards.map((c) => ({ cardId: c.id, characterId: c.characterId, type: c.character.type, power: c.character.power })) },
      },
      select: { id: true },
    });
  });
}

/** Prévient le joueur des expéditions arrivées à terme (balayage paresseux, une seule notification par expédition). */
export async function sweepExpeditions(now = new Date()) {
  const due = await prisma.expedition.findMany({ where: { status: "RUNNING", notifiedAt: null, endsAt: { lte: now } }, select: { id: true, userId: true, breachId: true } });
  for (const e of due) {
    await prisma.$transaction(async (tx) => {
      const mine = await tx.expedition.updateMany({ where: { id: e.id, notifiedAt: null }, data: { notifiedAt: now } });
      if (mine.count === 1) await notify(tx, e.userId, "EXPEDITION_DONE", { label: breachById(e.breachId)?.name ?? "Expédition" });
    });
  }
  return due.length;
}

/** Récupère le butin : un seul passage RUNNING → CLAIMED, puis tout est crédité dans la même transaction. */
export async function claimExpedition(userId: string, expeditionId: string, now = new Date()) {
  const result = await prisma.$transaction(async (tx) => {
    const exp = await tx.expedition.findFirst({ where: { id: expeditionId, userId }, include: { cards: true } });
    if (!exp) throw new ExpeditionError("Expédition introuvable.");
    if (exp.endsAt > now) throw new ExpeditionError("L'expédition n'est pas terminée.");
    const breach = breachById(exp.breachId);
    if (!breach) throw new ExpeditionError("Brèche inconnue.");
    const taken = await tx.expedition.updateMany({ where: { id: exp.id, userId, status: "RUNNING" }, data: { status: "CLAIMED", claimedAt: now } });
    if (taken.count !== 1) throw new ExpeditionError("Butin déjà récupéré.");

    const loot = resolve(breach, exp.cards, exp.seed);
    // Plafonds : Ryō et cristaux par jour, cristaux spéciaux par semaine (ce qui est déjà récupéré compte)
    const day = startOfDay(now), week = weekBounds(now).start;
    const [today, thisWeek] = await Promise.all([
      tx.expedition.aggregate({ where: { userId, status: "CLAIMED", claimedAt: { gte: day }, id: { not: exp.id } }, _sum: { ryo: true, crystals: true } }),
      tx.expedition.aggregate({ where: { userId, status: "CLAIMED", claimedAt: { gte: week }, id: { not: exp.id } }, _sum: { special: true } }),
    ]);
    const ryo = Math.max(0, Math.min(loot.ryo, DAILY_RYO_CAP - (today._sum.ryo ?? 0)));
    const crystals = Math.max(0, Math.min(loot.crystals, DAILY_CRYSTAL_CAP - (today._sum.crystals ?? 0)));
    const special = Math.max(0, Math.min(loot.special, WEEKLY_SPECIAL_CAP - (thisWeek._sum.special ?? 0)));

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { crystals: true, crystalsUpdatedAt: true } });
    await tx.user.update({
      where: { id: userId },
      data: {
        balance: { increment: ryo }, expeditionsDone: { increment: 1 }, specialCrystals: { increment: special },
        ...(crystals > 0 ? afterGain(user.crystals, user.crystalsUpdatedAt, now, crystals) : {}),
      },
    });
    if (ryo > 0) await tx.currencyLedger.create({ data: { userId, amount: ryo, reason: "EXPEDITION", refId: exp.id } });
    if (special > 0) await tx.specialCrystalLedger.create({ data: { userId, amount: special, reason: "EXPEDITION", refId: exp.id } });
    await tx.expedition.update({ where: { id: exp.id }, data: { outcome: loot.outcome, ryo, crystals, special } });
    await tx.card.updateMany({ where: { id: { in: exp.cards.map((c) => c.cardId) } }, data: { inExpedition: false } });
    return { outcome: loot.outcome, ryo, crystals, special, ratio: loot.ratio, breach };
  });
  await checkAchievementsSafe(userId);
  return result;
}

/** Ce que voit la page : emplacements, expéditions en cours ou à récupérer, dernier historique. */
export async function expeditionState(userId: string, now = new Date()) {
  await sweepExpeditions(now);
  const [user, open, history] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { expeditionsDone: true } }),
    prisma.expedition.findMany({ where: { userId, status: "RUNNING" }, orderBy: { endsAt: "asc" }, include: { cards: { include: { card: { select: { character: { select: { id: true, name: true, imageUrl: true, rarity: true } } } } } } } }),
    prisma.expedition.findMany({ where: { userId, status: "CLAIMED" }, orderBy: { claimedAt: "desc" }, take: 8 }),
  ]);
  return { done: user.expeditionsDone, slots: slotsFor(user.expeditionsDone), nextSlotAt: SLOTS.find((n) => n > user.expeditionsDone) ?? null, open, history };
}

/** Nombre d'expéditions terminées à récupérer (pastille du menu et de la scène). */
export const readyCount = (userId: string, now = new Date()) => prisma.expedition.count({ where: { userId, status: "RUNNING", endsAt: { lte: now } } });
