// Achat de cristaux avec des Ryō (SPEC étape 4 bis, §2) : 20 Ryō le cristal, 25 par jour maximum, remise à zéro à minuit (heure du serveur).
// Les cristaux achetés s'ajoutent au stock et peuvent dépasser la limite de 50 (la limite ne concerne que la recharge automatique).

import { CRYSTAL_BUY_SIZES, CRYSTAL_PRICE, crystalsLeft, startOfDay } from "./economy";
import { prisma } from "./db";
import { afterGain } from "./crystal-stock";
import { SaleError } from "./wallet";

/** Achète `count` cristaux (5 ou 25). Mise à jour conditionnelle sur tout ce qui a été lu : deux achats simultanés ne passent jamais tous les deux. */
export async function buyCrystals(userId: string, count: number, now = new Date()): Promise<void> {
  if (!(CRYSTAL_BUY_SIZES as readonly number[]).includes(count)) throw new SaleError("Quantité invalide.");
  const cost = count * CRYSTAL_PRICE;
  await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { balance: true, crystals: true, crystalsUpdatedAt: true, crystalsBoughtToday: true, crystalsBoughtDate: true },
    });
    const left = crystalsLeft(u.crystalsBoughtToday, u.crystalsBoughtDate, now);
    if (left < count) throw new SaleError(left === 0 ? "Limite de cristaux achetés aujourd'hui atteinte." : `Plus que ${left} cristaux achetables aujourd'hui.`);
    if (u.balance < cost) throw new SaleError(`Il te faut ${cost} Ryō pour acheter ${count} cristaux.`);

    const today = startOfDay(now);
    const boughtBefore = u.crystalsBoughtDate && u.crystalsBoughtDate >= today ? u.crystalsBoughtToday : 0;
    const next = afterGain(u.crystals, u.crystalsUpdatedAt, now, count);
    const updated = await tx.user.updateMany({
      where: {
        id: userId,
        balance: u.balance, // exactement ce qui a été lu : si quelqu'un d'autre a modifié le solde ou le stock entre-temps, rien ne correspond
        crystals: u.crystals,
        crystalsUpdatedAt: u.crystalsUpdatedAt,
        crystalsBoughtToday: u.crystalsBoughtToday,
        crystalsBoughtDate: u.crystalsBoughtDate,
      },
      data: { ...next, balance: { decrement: cost }, crystalsBoughtToday: boughtBefore + count, crystalsBoughtDate: today },
    });
    if (updated.count !== 1) throw new SaleError("Une autre opération est en cours, réessaie.");
    await tx.currencyLedger.create({ data: { userId, amount: -cost, reason: "CRYSTAL_BUY" } });
  });
}
