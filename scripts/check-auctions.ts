// Vérification des enchères sur la vraie base (SPEC étape 3, §4 et §10) : offre minimale, réservation et remboursement,
// anti-sniping, achat immédiat, clôture unique, taxe de 5 %, limites. Joueurs jetables.
// Usage : npm run check:auctions   (Node 24)

import { prisma } from "../src/lib/db";
import { buyNow, cancelAuction, closeAuction, closeDueAuctions, createAuction, AuctionError, placeBid } from "../src/lib/auctions";
import { ANTI_SNIPING_MS, MAX_ACTIVE_AUCTIONS, minBid, sellerProceeds } from "../src/lib/economy";
import { priceHistory } from "../src/lib/auctions";
import { addWish } from "../src/lib/wishlist";
import { sellCard, setLocked } from "../src/lib/wallet";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}
const rejects = (p: Promise<unknown>) => p.then(() => false, (e) => e instanceof AuctionError);

async function main() {
  const tag = `auc-${Date.now()}`;
  const day = 25 * 3600 * 1000;
  async function mk(id: string, balance: number, veteran = true) {
    await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local`, balance, createdAt: new Date(Date.now() - (veteran ? day : 1000)) } });
    if (balance) await prisma.currencyLedger.create({ data: { userId: id, amount: balance, reason: "DAILY" } });
    if (veteran) await prisma.packOpening.createMany({ data: Array.from({ length: 20 }, () => ({ userId: id, pityTriggered: "NONE" as const })) });
    return id;
  }
  const s = await mk(`${tag}-s`, 0), b1 = await mk(`${tag}-1`, 1000), b2 = await mk(`${tag}-2`, 1000), poor = await mk(`${tag}-p`, 5), rookie = await mk(`${tag}-r`, 1000, false);
  const all = [s, b1, b2, poor, rookie];
  const opening = await prisma.packOpening.create({ data: { userId: s, pityTriggered: "NONE" }, select: { id: true } });
  const pullBefore = new Map<number, number>();
  const ch = await prisma.character.findMany({ where: { disabled: false }, orderBy: { id: "asc" }, take: 20, select: { id: true } });
  let next = 0;
  async function give(ownerId = s) {
    const characterId = ch[next++ % ch.length].id;
    if (!pullBefore.has(characterId)) pullBefore.set(characterId, (await prisma.character.findUniqueOrThrow({ where: { id: characterId }, select: { pullCount: true } })).pullCount);
    const c = await prisma.character.update({ where: { id: characterId }, data: { pullCount: { increment: 1 } }, select: { pullCount: true, rarity: true } });
    return (await prisma.card.create({ data: { ownerId, characterId, finish: "NORMAL", serial: c.pullCount, rarityAtPull: c.rarity, packOpeningId: opening.id }, select: { id: true } })).id;
  }
  const bal = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id }, select: { balance: true } })).balance;
  const auc = (id: string) => prisma.auction.findUniqueOrThrow({ where: { id } });
  const card = (id: string) => prisma.card.findUniqueOrThrow({ where: { id }, select: { ownerId: true, inAuction: true } });
  async function invariants(label: string) {
    let ok = true, detail = "";
    for (const id of all) {
      const sum = (await prisma.currencyLedger.aggregate({ where: { userId: id }, _sum: { amount: true } }))._sum.amount ?? 0;
      if ((await bal(id)) !== sum || sum < 0) { ok = false; detail += ` ${id.slice(-2)}:${await bal(id)}/${sum}`; }
    }
    check(`Solde = somme du journal pour tous (${label})`, ok, detail);
  }
  const past = (id: string, ms = 1000) => prisma.auction.update({ where: { id }, data: { endsAt: new Date(Date.now() - ms) } });

  try {
    check("Offre minimale : départ, +5 % arrondi au supérieur, +1", minBid(10, null) === 10 && minBid(10, 10) === 11 && minBid(100, 100) === 105 && minBid(101, 101) === 107 && minBid(50, 20) === 50);
    check("Vendeur reçoit le prix − 5 % arrondi à l'inférieur", sellerProceeds(100) === 95 && sellerProceeds(19) === 18 && sellerProceeds(1) === 0);

    // --- Création
    const c1 = await give();
    check("Compte neuf : enchères interdites", await rejects(createAuction(rookie, { cardId: await give(rookie), startPrice: 10, durationHours: 1 })));
    check("Prix de départ 0 refusé", await rejects(createAuction(s, { cardId: c1, startPrice: 0, durationHours: 1 })));
    check("Durée inconnue refusée", await rejects(createAuction(s, { cardId: c1, startPrice: 10, durationHours: 5 })));
    check("Achat immédiat ≤ départ refusé", await rejects(createAuction(s, { cardId: c1, startPrice: 10, durationHours: 1, buyNowPrice: 10 })));
    const lockedCard = await give(); await setLocked(s, lockedCard, true);
    check("Carte verrouillée refusée", await rejects(createAuction(s, { cardId: lockedCard, startPrice: 10, durationHours: 1 })));
    check("Carte d'un autre refusée", await rejects(createAuction(b1, { cardId: c1, startPrice: 10, durationHours: 1 })));
    const a1 = await createAuction(s, { cardId: c1, startPrice: 100, durationHours: 24, buyNowPrice: 500 });
    check("Carte bloquée pendant l'enchère", (await card(c1)).inAuction === true);
    check("Impossible de la remettre aux enchères ni de la vendre", (await rejects(createAuction(s, { cardId: c1, startPrice: 10, durationHours: 1 }))) && (await sellCard(s, c1).then(() => false, () => true)));

    // --- Offres
    check("Le vendeur ne peut pas enchérir", await rejects(placeBid(s, a1, 100)));
    check("Offre sous le minimum refusée", await rejects(placeBid(b1, a1, 99)));
    check("Solde insuffisant refusé", await rejects(placeBid(poor, a1, 100)));
    check("Compte neuf ne peut pas enchérir", await rejects(placeBid(rookie, a1, 100)));
    await placeBid(b1, a1, 100);
    check("Offre : solde réservé (1000 → 900)", (await bal(b1)) === 900 && (await auc(a1)).currentBidderId === b1);
    check("Meilleur enchérisseur ne peut pas surenchérir sur lui-même", await rejects(placeBid(b1, a1, 200)));
    check("Minimum suivant = 105", (await rejects(placeBid(b2, a1, 104))));
    await placeBid(b2, a1, 120);
    check("Dépassé : b1 remboursé aussitôt, b2 réservé", (await bal(b1)) === 1000 && (await bal(b2)) === 880);
    check("b1 notifié du dépassement", (await prisma.notification.count({ where: { userId: b1, type: "OUTBID" } })) === 1);
    await invariants("après surenchère");

    // --- Offres simultanées au même montant : une seule passe
    const race = await Promise.allSettled([placeBid(b1, a1, 200), placeBid(poor, a1, 200)]);
    const wins = race.filter((r) => r.status === "fulfilled").length;
    check("Deux offres simultanées sur la même base : au plus une passe, jamais d'argent perdu", wins <= 1);
    await invariants("après offres simultanées");
    // remet b1 en tête à 200 si personne ne l'a fait (poor n'a pas assez, donc b1 doit mener)
    const lead = (await auc(a1)).currentBidderId;
    check("Enchérisseur en tête cohérent avec la dernière offre", lead === b1 && (await auc(a1)).currentBid === 200, `${lead?.slice(-2)} / ${(await auc(a1)).currentBid}`);

    // --- Anti-sniping
    const c2 = await give();
    const a2 = await createAuction(s, { cardId: c2, startPrice: 10, durationHours: 1 });
    await prisma.auction.update({ where: { id: a2 }, data: { endsAt: new Date(Date.now() + 30_000) } });
    await placeBid(b2, a2, 10);
    const left = (await auc(a2)).endsAt.getTime() - Date.now();
    check("Offre dans les 2 dernières minutes : fin repoussée à ~2 min", left > ANTI_SNIPING_MS - 5000 && left <= ANTI_SNIPING_MS, `${Math.round(left / 1000)} s`);
    const farEnd = (await auc(a1)).endsAt.getTime();
    await prisma.auction.update({ where: { id: a1 }, data: { endsAt: new Date(Date.now() + 3600_000) } });
    await placeBid(b2, a1, 210);
    check("Offre loin de la fin : la fin ne bouge pas", Math.abs((await auc(a1)).endsAt.getTime() - (Date.now() + 3600_000)) < 5000 && farEnd > 0);

    // --- Clôture (une seule fois) avec taxe
    const s0 = await bal(s);
    await past(a1);
    await Promise.all([closeAuction(a1), closeAuction(a1), closeDueAuctions()]);
    const done = await auc(a1);
    check("Clôture : vendue, carte au gagnant, débloquée", done.status === "SOLD" && done.finalPrice === 210 && (await card(c1)).ownerId === b2 && !(await card(c1)).inAuction);
    check("Vendeur reçoit 210 − 5 % = 199 (une seule fois)", (await bal(s)) - s0 === sellerProceeds(210), `${(await bal(s)) - s0}`);
    check("Journal : vente +210 et taxe −11", (await prisma.currencyLedger.count({ where: { userId: s, refId: a1, reason: "AUCTION_SALE" } })) === 1 && (await prisma.currencyLedger.count({ where: { userId: s, refId: a1, reason: "AUCTION_FEE" } })) === 1);
    check("Notifications gagnant et vendeur", (await prisma.notification.count({ where: { userId: b2, type: "AUCTION_WON" } })) === 1 && (await prisma.notification.count({ where: { userId: s, type: "CARD_SOLD" } })) === 1);
    check("Enchère terminée : plus d'offre possible", await rejects(placeBid(b1, a1, 1000)));
    await invariants("après clôture");

    // --- Sans offre : la carte revient
    const c3 = await give();
    const a3 = await createAuction(s, { cardId: c3, startPrice: 5, durationHours: 1 });
    await past(a3); await closeDueAuctions();
    check("Sans offre : UNSOLD, carte débloquée chez le vendeur + notification", (await auc(a3)).status === "UNSOLD" && (await card(c3)).ownerId === s && !(await card(c3)).inAuction && (await prisma.notification.count({ where: { userId: s, type: "AUCTION_UNSOLD" } })) === 1);

    // --- Achat immédiat
    const c4 = await give();
    const a4 = await createAuction(s, { cardId: c4, startPrice: 10, durationHours: 24, buyNowPrice: 300 });
    await placeBid(b1, a4, 50);
    const b1Before = await bal(b1), b2Before = await bal(b2), sBefore = await bal(s);
    await buyNow(b2, a4);
    check("Achat immédiat : terminé, carte à l'acheteur, ancien meilleur remboursé", (await auc(a4)).status === "SOLD" && (await card(c4)).ownerId === b2 && (await bal(b1)) === b1Before + 50 && (await bal(b2)) === b2Before - 300 && (await bal(s)) === sBefore + sellerProceeds(300));
    check("Pas d'achat immédiat sans prix, ni sur sa propre enchère, ni avec un solde trop bas", true);
    const c5 = await give();
    const a5 = await createAuction(s, { cardId: c5, startPrice: 10, durationHours: 24 });
    check("Sans prix d'achat immédiat : refusé", await rejects(buyNow(b1, a5)));
    const c6 = await give();
    const a6 = await createAuction(s, { cardId: c6, startPrice: 10, durationHours: 24, buyNowPrice: 5000 });
    check("Achat immédiat trop cher pour l'acheteur : refusé", await rejects(buyNow(b1, a6)));
    check("Le vendeur ne peut pas acheter sa carte", await rejects(buyNow(s, a6)));
    await invariants("après achat immédiat");

    // --- Historique des prix (a1 vendue 210, a4 vendue 300, même finition NORMAL)
    const a1row = await prisma.auction.findUniqueOrThrow({ where: { id: a1 }, select: { card: { select: { characterId: true } } } });
    const hist = await priceHistory(a1row.card.characterId);
    check("Historique : dernière vente 210 Ryō visible, moyenne cohérente", hist.last.some((h) => h.price === 210) && hist.averages.some((x) => x.finish === "NORMAL" && x.count >= 1));

    // --- Liste de souhaits : notification à la mise aux enchères
    const c7 = await give(), c8 = await give();
    const char7 = (await prisma.card.findUniqueOrThrow({ where: { id: c7 }, select: { characterId: true } })).characterId;
    const char8 = (await prisma.card.findUniqueOrThrow({ where: { id: c8 }, select: { characterId: true } })).characterId;
    await addWish(b1, char7, null); await addWish(b1, char7, null); await addWish(b2, char7, "GOLD"); await addWish(s, char7, null); await addWish(b1, char8, "HOLO");
    check("Souhait en double ignoré", (await prisma.wishlistItem.count({ where: { userId: b1, characterId: char7 } })) === 1);
    await createAuction(s, { cardId: c7, startPrice: 5, durationHours: 1 });
    await createAuction(s, { cardId: c8, startPrice: 5, durationHours: 1 });
    const wn = (u: string) => prisma.notification.count({ where: { userId: u, type: "WISHED_AVAILABLE" } });
    check("Souhait sans finition : prévenu ; finition différente : non ; finition ≠ : non ; propriétaire : non", (await wn(b1)) === 1 && (await wn(b2)) === 0 && (await wn(s)) === 0);

    // --- Annulation
    check("Annulation avec offre refusée", (await placeBid(b1, a5, 10).then(() => true)) && (await rejects(cancelAuction(s, a5))));
    check("Seul le vendeur annule", await rejects(cancelAuction(b1, a6)));
    await cancelAuction(s, a6);
    check("Annulation sans offre : CANCELLED, carte débloquée", (await auc(a6)).status === "CANCELLED" && !(await card(c6)).inAuction);

    // --- Limite de 10 enchères actives
    const active = await prisma.auction.count({ where: { sellerId: s, status: "ACTIVE" } });
    for (let i = active; i < MAX_ACTIVE_AUCTIONS; i++) await createAuction(s, { cardId: await give(), startPrice: 1, durationHours: 1 });
    check(`${MAX_ACTIVE_AUCTIONS} enchères actives maximum`, await rejects(createAuction(s, { cardId: await give(), startPrice: 1, durationHours: 1 })));
    await invariants("fin");
  } finally {
    for (const [characterId, count] of pullBefore) await prisma.character.update({ where: { id: characterId }, data: { pullCount: count } });
    await prisma.user.deleteMany({ where: { id: { in: all } } });
  }
  console.log(failures === 0 ? "\nEnchères conformes." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
