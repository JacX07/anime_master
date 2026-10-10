// Achat de paquets avec des Ryō (SPEC étape 3, §2) : 100 Ryō, 5 par jour maximum, remise à zéro à minuit (heure du serveur).
// Un paquet acheté s'ajoute au stock et peut dépasser la limite de 10 (la limite ne concerne que la recharge automatique).

import { PACK_PRICE, purchasesLeft, startOfDay } from "./economy";
import { prisma } from "./db";
import { afterPurchase } from "./pack-stock";
import { SaleError } from "./wallet";

/** Achète un paquet. Mise à jour conditionnelle sur tout ce qui a été lu : deux achats simultanés ne passent jamais tous les deux. */
export async function buyPack(userId: string, now = new Date()): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { balance: true, packsStored: true, lastPackAt: true, packsBoughtToday: true, packsBoughtDate: true },
    });
    if (purchasesLeft(u.packsBoughtToday, u.packsBoughtDate, now) < 1) throw new SaleError("Limite de 5 paquets achetés par jour atteinte.");
    if (u.balance < PACK_PRICE) throw new SaleError(`Il te faut ${PACK_PRICE} Ryō pour acheter un paquet.`);

    const today = startOfDay(now);
    const boughtBefore = u.packsBoughtDate && u.packsBoughtDate >= today ? u.packsBoughtToday : 0;
    const next = afterPurchase(u.packsStored, u.lastPackAt, now);
    const updated = await tx.user.updateMany({
      where: {
        id: userId,
        balance: u.balance, // exactement ce qui a été lu : si quelqu'un d'autre a modifié le solde ou le stock entre-temps, rien ne correspond
        packsStored: u.packsStored,
        lastPackAt: u.lastPackAt,
        packsBoughtToday: u.packsBoughtToday,
        packsBoughtDate: u.packsBoughtDate,
      },
      data: { ...next, balance: { decrement: PACK_PRICE }, packsBoughtToday: boughtBefore + 1, packsBoughtDate: today },
    });
    if (updated.count !== 1) throw new SaleError("Une autre opération est en cours, réessaie.");
    await tx.currencyLedger.create({ data: { userId, amount: -PACK_PRICE, reason: "PACK_BUY" } });
  });
}
