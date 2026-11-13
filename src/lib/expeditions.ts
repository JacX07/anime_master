import { adventureLock } from "./adventure-state";
// Expéditions (SPEC étape 4 ter) : une équipe de 1 à 3 cartes explore une brèche pendant 1, 6 ou 24 h, puis le joueur récupère le butin.
// Le résultat se calcule à la récupération depuis une graine tirée au lancement (recharger ne change rien). Les passages d'état sont
// conditionnels (updateMany) : un double clic ne paie jamais deux fois.

import type { Prisma } from "../generated/prisma/client";
import { checkAchievementsSafe } from "./achievements";
import { afterGain } from "./crystal-stock";
import { prisma } from "./db";
import { startOfDay } from "./economy";
import { notify } from "./notifications";
import { breachById, DAILY_CRYSTAL_CAP, DAILY_RYO_CAP, HOUR, isChestExpedition, MAX_TEAM, resolve, seeded, SLOTS, slotsFor } from "./expedition-rules";
import { CHEST_NAMES, chestKey, expeditionChests, FREE_BOOSTER, itemRarity, parseChestKey, rollChest, type ChestItem, type ChestTier } from "./chests";
import { energyAfter } from "./energy";
import { secureRandom } from "./pull";
import { COMMON_RESOURCE, RESOURCE_NAMES, universeOf } from "./story";
import { RAID_RESOURCE } from "./raid";
import { EMPERORS } from "./emperors";
import { artifactMainStat, artifactSlot, artifactSubStats, DUNGEONS } from "./dungeons";
import { artifactImage } from "./artifact-display";

export class ExpeditionError extends Error {}

export * from "./expedition-rules";

type Tx = Prisma.TransactionClient;

/** Emplacements occupés : expéditions non récupérées (en cours ou terminées). */
export const usedSlots = (userId: string, db: Tx | typeof prisma = prisma) => db.expedition.count({ where: { userId, status: "RUNNING" } });

export async function startExpedition(userId: string, breachId: string, cardIds: string[], now = new Date()) {
  const locked = await adventureLock(userId, "expeditions");
  if (locked) throw new ExpeditionError(locked);
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
        userId, breachId, endsAt: new Date(now.getTime() + breach.hours * HOUR), seed: -1 - Math.floor(Math.random() * (2 ** 31 - 1)), // négative : expédition à coffres
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

    if (isChestExpedition(exp.seed)) {
      // Coffres : plus de Ryō ni de cristaux en direct, ni de plafond quotidien
      const loot = resolve(breach, exp.cards, exp.seed);
      const chests = expeditionChests(breach.tier, loot.outcome, seeded(exp.seed ^ 0x5bd1e995));
      for (const tier of chests) {
        const key = chestKey(tier, breach.universe);
        await tx.resourceStock.upsert({ where: { userId_key: { userId, key } }, create: { userId, key, quantity: 1 }, update: { quantity: { increment: 1 } } });
      }
      await tx.user.update({ where: { id: userId }, data: { expeditionsDone: { increment: 1 } } });
      await tx.expedition.update({ where: { id: exp.id }, data: { outcome: loot.outcome, ryo: 0, crystals: 0 } });
      await tx.card.updateMany({ where: { id: { in: exp.cards.map((c) => c.cardId) } }, data: { inExpedition: false } });
      return { outcome: loot.outcome, ryo: 0, crystals: 0, ratio: loot.ratio, breach, chests };
    }

    const loot = resolve({ ...breach, threshold: breach.legacyThreshold }, exp.cards, exp.seed);
    // Plafonds : Ryō et cristaux par jour (ce qui est déjà récupéré compte)
    const day = startOfDay(now);
    const today = await tx.expedition.aggregate({ where: { userId, status: "CLAIMED", claimedAt: { gte: day }, id: { not: exp.id } }, _sum: { ryo: true, crystals: true } });
    const ryo = Math.max(0, Math.min(loot.ryo, DAILY_RYO_CAP - (today._sum.ryo ?? 0)));
    const crystals = Math.max(0, Math.min(loot.crystals, DAILY_CRYSTAL_CAP - (today._sum.crystals ?? 0)));

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { crystals: true, crystalsUpdatedAt: true } });
    await tx.user.update({
      where: { id: userId },
      data: {
        balance: { increment: ryo }, expeditionsDone: { increment: 1 },
        ...(crystals > 0 ? afterGain(user.crystals, user.crystalsUpdatedAt, now, crystals) : {}),
      },
    });
    if (ryo > 0) await tx.currencyLedger.create({ data: { userId, amount: ryo, reason: "EXPEDITION", refId: exp.id } });
    await tx.expedition.update({ where: { id: exp.id }, data: { outcome: loot.outcome, ryo, crystals } });
    await tx.card.updateMany({ where: { id: { in: exp.cards.map((c) => c.cardId) } }, data: { inExpedition: false } });
    return { outcome: loot.outcome, ryo, crystals, ratio: loot.ratio, breach, chests: [] as ChestTier[] };
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

/** Coffres en stock du joueur, du meilleur au moins bon. */
export async function chestStock(userId: string) {
  const rows = await prisma.resourceStock.findMany({ where: { userId, key: { startsWith: "coffre-" }, quantity: { gt: 0 } } });
  const order = ["legendaire", "or", "argent", "bronze"];
  return rows.flatMap((r) => {
    const c = parseChestKey(r.key);
    return c ? [{ key: r.key, tier: c.tier, universe: c.universe, universeName: universeOf(c.universe)?.name ?? c.universe, quantity: r.quantity }] : [];
  }).sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier) || a.universeName.localeCompare(b.universeName));
}

/** Ce qu'un objet de coffre affiche à l'ouverture. */
export type OpenedItem = { kind: ChestItem["kind"]; name: string; amount: string; rarity: "N" | "R" | "SR" | "SSR" | "UR"; image?: string; resource?: string; jackpot?: boolean };

const add = (tx: Tx, userId: string, key: string, n: number) =>
  tx.resourceStock.upsert({ where: { userId_key: { userId, key } }, create: { userId, key, quantity: n }, update: { quantity: { increment: n } } });

/** Ouvre un coffre : il est retiré du stock et chaque objet est crédité dans la même transaction. */
export async function openChest(userId: string, key: string, rng: () => number = secureRandom): Promise<{ tier: ChestTier; items: OpenedItem[] }> {
  const chest = parseChestKey(key);
  if (!chest) throw new ExpeditionError("Coffre inconnu.");
  const universe = universeOf(chest.universe);
  const result = await prisma.$transaction(async (tx) => {
    const taken = await tx.resourceStock.updateMany({ where: { userId, key, quantity: { gte: 1 } }, data: { quantity: { decrement: 1 } } });
    if (taken.count !== 1) throw new ExpeditionError("Tu n'as plus ce coffre.");
    const items: OpenedItem[] = [];
    const num = new Intl.NumberFormat("fr-FR");
    for (const item of rollChest(chest.tier, rng)) {
      const rarity = itemRarity(item, chest.tier);
      const jackpot = "jackpot" in item ? true : undefined;
      switch (item.kind) {
        case "ryo": {
          await tx.user.update({ where: { id: userId }, data: { balance: { increment: item.amount } } });
          await tx.currencyLedger.create({ data: { userId, amount: item.amount, reason: "EXPEDITION", refId: key } });
          items.push({ kind: item.kind, name: "Ryō", amount: num.format(item.amount), rarity, jackpot });
          break;
        }
        case "crystals": {
          const u = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { crystals: true, crystalsUpdatedAt: true } });
          await tx.user.update({ where: { id: userId }, data: afterGain(u.crystals, u.crystalsUpdatedAt, new Date(), item.amount) });
          items.push({ kind: item.kind, name: "Cristaux", amount: `+${item.amount}`, rarity, jackpot });
          break;
        }
        case "energy": {
          const u = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { energy: true, energyUpdatedAt: true } });
          await tx.user.update({ where: { id: userId }, data: energyAfter(u.energy, u.energyUpdatedAt, new Date(), item.amount)! });
          items.push({ kind: item.kind, name: "Énergie", amount: `+${item.amount}`, rarity, jackpot });
          break;
        }
        case "booster": {
          await add(tx, userId, FREE_BOOSTER, item.cards);
          items.push({ kind: item.kind, name: "Booster offert", amount: `×${item.cards}`, rarity, image: "/images/boosters/standard.png", jackpot });
          break;
        }
        case "awakening": case "signature": case "weapon": case "hearts": {
          const res = item.kind === "awakening" ? universe?.resource ?? COMMON_RESOURCE : item.kind === "weapon" ? universe?.weaponResource ?? COMMON_RESOURCE : item.kind === "hearts" ? RAID_RESOURCE : COMMON_RESOURCE;
          await add(tx, userId, res, item.amount);
          items.push({ kind: item.kind, name: RESOURCE_NAMES[res] ?? res, amount: `×${item.amount}`, rarity, resource: res, jackpot });
          break;
        }
        case "emperor": {
          for (let i = 0; i < item.amount; i++) {
            const e = EMPERORS[Math.floor(rng() * EMPERORS.length)];
            await add(tx, userId, e.resource, 1);
            items.push({ kind: item.kind, name: e.resourceName, amount: "×1", rarity, resource: e.resource, jackpot });
          }
          break;
        }
        case "artifact": {
          const set = DUNGEONS[Math.floor(rng() * DUNGEONS.length)];
          const seed = Math.floor(rng() * 2 ** 31);
          const slot = artifactSlot(seed);
          const main = artifactMainStat(slot, item.rarity, seed ^ 0x4d3c2b1a);
          const subStats = artifactSubStats(slot, item.rarity, seed ^ 0x7f4a7c15, main.stat);
          await tx.artifact.create({ data: { userId, setKey: set.key, slot, rarity: item.rarity, mainStat: main.stat, mainValue: main.value, subStats: JSON.parse(JSON.stringify(subStats)) } });
          items.push({ kind: item.kind, name: `Artefact ${set.universe}`, amount: item.rarity, rarity, image: artifactImage(set.key, slot), jackpot });
          break;
        }
        case "card": {
          // Un personnage de l'univers de la brèche (à défaut, du catalogue) de la rareté tirée
          let where: Prisma.CharacterWhereInput = { disabled: false, rarity: item.rarity, mainMedia: { franchiseId: { in: universe?.franchiseIds ?? [] } } };
          let count = await tx.character.count({ where });
          if (count === 0) { where = { disabled: false, rarity: item.rarity }; count = await tx.character.count({ where }); }
          const picked = await tx.character.findFirstOrThrow({ where, orderBy: { id: "asc" }, skip: Math.floor(rng() * count), select: { id: true } });
          const character = await tx.character.update({ where: { id: picked.id }, data: { pullCount: { increment: 1 } }, select: { id: true, name: true, imageUrl: true, rarity: true, pullCount: true } });
          const opening = await tx.packOpening.create({ data: { userId, pityTriggered: "NONE", lotSize: 1 }, select: { id: true } });
          await tx.card.create({ data: { ownerId: userId, characterId: character.id, finish: "NORMAL", serial: character.pullCount, rarityAtPull: character.rarity, packOpeningId: opening.id } });
          items.push({ kind: item.kind, name: character.name, amount: `Carte ${character.rarity}`, rarity, image: character.imageUrl, jackpot });
          break;
        }
      }
    }
    return { tier: chest.tier, items };
  });
  await checkAchievementsSafe(userId);
  return result;
}

export { CHEST_NAMES };
