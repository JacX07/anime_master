// Expéditions (SPEC étape 4 ter) : une équipe de 1 à 3 cartes explore une brèche pendant 1, 6 ou 24 h, puis le joueur récupère le butin.
// Le résultat se calcule à la récupération depuis une graine tirée au lancement (recharger ne change rien). Les passages d'état sont
// conditionnels (updateMany) : un double clic ne paie jamais deux fois.

import type { Prisma } from "../generated/prisma/client";
import type { CardType } from "../generated/prisma/enums";
import { checkAchievementsSafe } from "./achievements";
import { afterGain } from "./crystal-stock";
import { prisma } from "./db";
import { startOfDay } from "./economy";
import { weekBounds } from "./banners";
import { notify } from "./notifications";

export class ExpeditionError extends Error {}

const HOUR = 3_600_000;

export interface Breach {
  id: string;
  name: string;
  lore: string;
  tier: "Faille" | "Brèche" | "Gouffre";
  hours: number;
  /** Puissance d'équipe demandée */
  threshold: number;
  favored: CardType[];
  ryo: number;
  crystals: number;
  /** Chance de base d'un cristal spécial (réussite) */
  special: number;
}

// Valeurs de départ à équilibrer (scripts/check-expeditions.ts). Repères de puissance : R ≈ 1 100, SR ≈ 4 500, SSR ≈ 16 000, UR ≈ 49 000.
export const BREACHES: Breach[] = [
  { id: "faille-echo", name: "Faille de l'Écho", tier: "Faille", hours: 1, threshold: 1500, favored: ["MAGIE"], ryo: 10, crystals: 0, special: 0,
    lore: "Une fissure minuscule qui répète les voix de mondes voisins. Idéale pour s'échauffer." },
  { id: "faille-neon", name: "Faille Néon", tier: "Faille", hours: 1, threshold: 1500, favored: ["COMBAT"], ryo: 10, crystals: 0, special: 0,
    lore: "Des rues lumineuses apparaissent de l'autre côté ; quelqu'un s'y bat toujours." },
  { id: "breche-archives", name: "Brèche des Archives", tier: "Brèche", hours: 6, threshold: 8000, favored: ["MYSTERE", "MAGIE"], ryo: 60, crystals: 1, special: 0.05,
    lore: "Une bibliothèque sans fin dont les rayons mènent chacun vers un autre univers." },
  { id: "breche-horizon", name: "Brèche de l'Horizon", tier: "Brèche", hours: 6, threshold: 8000, favored: ["AVENTURE", "COEUR"], ryo: 60, crystals: 1, special: 0.05,
    lore: "Un ciel d'un autre monde, des routes ouvertes et des rencontres qui ne devaient pas avoir lieu." },
  { id: "gouffre-signal", name: "Gouffre du Signal", tier: "Gouffre", hours: 24, threshold: 30000, favored: ["COMBAT", "AVENTURE"], ryo: 140, crystals: 3, special: 0.2,
    lore: "Un puits sans fond d'où remonte un signal puissant, plein de signatures qui ne sont pas d'ici." },
  { id: "gouffre-nexus", name: "Gouffre du Nexus", tier: "Gouffre", hours: 24, threshold: 30000, favored: ["MYSTERE", "COEUR"], ryo: 140, crystals: 3, special: 0.2,
    lore: "Là où les brèches se croisent. On dit qu'il touche le cœur de la Tour." },
];
export const breachById = (id: string) => BREACHES.find((b) => b.id === id);

export const SLOTS = [0, 5, 20]; // expéditions récupérées nécessaires pour avoir 1, 2, 3 emplacements
export const slotsFor = (done: number) => SLOTS.filter((n) => done >= n).length;
export const MAX_TEAM = 3;
export const FAVORED_BONUS = 1.25;
export const FAIL_SHARE = 0.25;
export const DAILY_RYO_CAP = 600; // SPEC §4 : ~600 Ryō par jour d'expéditions
export const DAILY_CRYSTAL_CAP = 10;
export const WEEKLY_SPECIAL_CAP = 10;

/** Générateur déterministe (mulberry32) : la graine du lancement suffit à rejouer le résultat. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Loot { outcome: "FAIL" | "SUCCESS" | "TRIUMPH"; ratio: number; ryo: number; crystals: number; special: number }

/** Résultat brut d'une expédition (avant les plafonds quotidiens et hebdomadaires). Pur : testable sans base. */
export function resolve(breach: Breach, team: { type: CardType; power: number }[], seed: number): Loot {
  const rand = seeded(seed);
  const score = team.reduce((n, c) => n + c.power * (breach.favored.includes(c.type) ? FAVORED_BONUS : 1) * (0.85 + 0.3 * rand()), 0);
  const ratio = score / breach.threshold;
  if (ratio < 1) return { outcome: "FAIL", ratio, ryo: Math.round(breach.ryo * FAIL_SHARE), crystals: 0, special: 0 };
  const m = Math.min(3, ratio);
  const crystals = breach.crystals + (breach.crystals > 0 && rand() < (m - 1) / 2 ? 1 : 0);
  const special = rand() < Math.min(1, breach.special * m) ? 1 : 0;
  return { outcome: ratio >= 1.5 ? "TRIUMPH" : "SUCCESS", ratio, ryo: Math.round(breach.ryo * (1 + 0.25 * (m - 1))), crystals, special };
}

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
