// Vérification de l'économie sur la vraie base (SPEC étape 3, §10) : prix, cadenas, vente groupée, bonus quotidien,
// double clic, et surtout « solde = somme du journal ». Joueur jetable, supprimé à la fin.
// Usage : npm run check:economy

import { prisma } from "../src/lib/db";
import { getPackState, openPack } from "../src/lib/packs";
import { buyPack } from "../src/lib/shop";
import { DAILY_BONUS, MAX_PACK_PURCHASES_PER_DAY, PACK_PRICE, quickSellPrice } from "../src/lib/economy";
import { claimDailyBonus, getWallet, previewDuplicateSale, sellCard, sellDuplicates, SaleError, setLocked } from "../src/lib/wallet";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}
const rejects = (p: Promise<unknown>) => p.then(() => false, (e) => e instanceof SaleError);

async function invariant(userId: string, label: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true } });
  const sum = (await prisma.currencyLedger.aggregate({ where: { userId }, _sum: { amount: true } }))._sum.amount ?? 0;
  check(`Solde = somme du journal (${label})`, u.balance === sum && u.balance >= 0, `solde ${u.balance}, journal ${sum}`);
}

async function main() {
  const tag = `eco-${Date.now()}`;
  const mk = (id: string) => prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local` }, select: { id: true } });
  const user = await mk(tag), other = await mk(`${tag}-b`);
  const shoppers: string[] = [], openedBy: number[] = [];
  const opening = await prisma.packOpening.create({ data: { userId: user.id, pityTriggered: "NONE" }, select: { id: true } });
  const pullCountBefore = new Map<number, number>();

  // Un exemplaire de plus pour un personnage de la rareté demandée
  async function give(characterId: number, finish: "NORMAL" | "HOLO" | "GOLD", ownerId = user.id) {
    if (!pullCountBefore.has(characterId)) pullCountBefore.set(characterId, (await prisma.character.findUniqueOrThrow({ where: { id: characterId }, select: { pullCount: true } })).pullCount);
    const c = await prisma.character.update({ where: { id: characterId }, data: { pullCount: { increment: 1 } }, select: { pullCount: true, rarity: true } });
    return prisma.card.create({ data: { ownerId, characterId, finish, serial: c.pullCount, rarityAtPull: c.rarity, packOpeningId: opening.id }, select: { id: true, serial: true } });
  }
  const pickChar = async (rarity: "N" | "R" | "SR" | "SSR" | "UR", skip = 0) => prisma.character.findFirstOrThrow({ where: { rarity, disabled: false }, orderBy: { id: "asc" }, skip, select: { id: true } });

  try {
    const [n1, n2, r1, ur] = await Promise.all([pickChar("N", 0), pickChar("N", 1), pickChar("R", 0), pickChar("UR", 0)]);

    // --- Prix
    const hn = await give(n1.id, "HOLO");
    const before = (await getWallet(user.id)).balance;
    const gain = await sellCard(user.id, hn.id);
    check("Vente rapide N Holo = 1 × 3 = 3 Ryō", gain === quickSellPrice("N", "HOLO") && gain === 3 && (await getWallet(user.id)).balance === before + 3);
    check("La carte vendue a disparu", (await prisma.card.count({ where: { id: hn.id } })) === 0);
    check("Prix : UR Gold = 2000, R Normal = 3", quickSellPrice("UR", "GOLD") === 2000 && quickSellPrice("R", "NORMAL") === 3);
    await invariant(user.id, "après une vente");

    // --- Protections
    const locked = await give(ur.id, "NORMAL");
    await setLocked(user.id, locked.id, true);
    check("Une carte verrouillée ne se vend pas", await rejects(sellCard(user.id, locked.id)));
    const foreign = await give(n2.id, "NORMAL", other.id);
    check("On ne peut pas vendre la carte d'un autre joueur", await rejects(sellCard(user.id, foreign.id)));
    check("La carte de l'autre joueur est intacte", (await prisma.card.count({ where: { id: foreign.id } })) === 1);
    await setLocked(user.id, locked.id, false);

    // --- Double clic
    const dc = await give(n2.id, "NORMAL");
    const b0 = (await getWallet(user.id)).balance;
    const res = await Promise.allSettled([sellCard(user.id, dc.id), sellCard(user.id, dc.id)]);
    const won = res.filter((r) => r.status === "fulfilled").length;
    check("Deux ventes simultanées de la même carte : une seule passe", won === 1 && (await getWallet(user.id)).balance === b0 + 1, `${won} réussie(s)`);
    await invariant(user.id, "après un double clic");

    // --- Vente groupée : R × 4 (Normal, Holo, Gold, Normal verrouillé) + N × 3
    const g = await give(r1.id, "GOLD"), h = await give(r1.id, "HOLO"), nn = await give(r1.id, "NORMAL"), lk = await give(r1.id, "NORMAL");
    await setLocked(user.id, lk.id, true);
    const a = await give(n1.id, "NORMAL"), b = await give(n1.id, "NORMAL"); // même personnage N : on garde le plus petit numéro
    void h; void nn; void a; void b;
    const preview = await previewDuplicateSale(user.id, ["R"]);
    check("Aperçu R : Holo (3×3=9) + Normal (3) = 12 Ryō, 2 cartes", preview.count === 2 && preview.total === 12, `${preview.count} cartes, ${preview.total} Ryō`);
    const sold = await sellDuplicates(user.id, ["R"]);
    const left = await prisma.card.findMany({ where: { ownerId: user.id, characterId: r1.id }, select: { id: true } });
    check("Vente groupée : meilleur (Gold) et verrouillée conservés", sold.count === 2 && sold.total === 12 && left.length === 2 && left.some((c) => c.id === g.id) && left.some((c) => c.id === lk.id));
    const soldN = await sellDuplicates(user.id, ["N"]);
    const keptN = await prisma.card.findMany({ where: { ownerId: user.id, characterId: n1.id }, select: { serial: true } });
    check("Doublon N : le plus petit numéro d'exemplaire est gardé", soldN.count === 1 && keptN.length === 1 && keptN[0].serial === Math.min(a.serial, b.serial));
    check("Les raretés non choisies ne sont pas touchées", (await prisma.card.count({ where: { id: locked.id } })) === 1);
    check("Rien à vendre : refusé proprement", await rejects(sellDuplicates(user.id, ["SSR"])));
    await invariant(user.id, "après les ventes groupées");

    // --- Bonus quotidien
    const w0 = await getWallet(user.id);
    check("Bonus disponible pour un joueur qui n'a rien réclamé", w0.canClaimBonus);
    const [c1, c2] = await Promise.allSettled([claimDailyBonus(user.id), claimDailyBonus(user.id)]);
    const claims = [c1, c2].filter((r) => r.status === "fulfilled").length;
    const w1 = await getWallet(user.id);
    check(`Deux réclamations simultanées : une seule (+${DAILY_BONUS})`, claims === 1 && w1.balance === w0.balance + DAILY_BONUS && !w1.canClaimBonus, `${claims} réussie(s)`);
    check("Réclamer deux fois le même jour est refusé", await rejects(claimDailyBonus(user.id)));
    await prisma.user.update({ where: { id: user.id }, data: { lastDailyBonusAt: new Date(Date.now() - 24 * 3600 * 1000) } });
    check("Le lendemain, le bonus est de nouveau disponible", (await getWallet(user.id)).canClaimBonus && (await claimDailyBonus(user.id)) === DAILY_BONUS);
    await invariant(user.id, "après les bonus");
    await invariant(other.id, "autre joueur, sans mouvement");

    // --- Achat de paquets
    const credit = async (userId: string, n: number) => {
      await prisma.user.update({ where: { id: userId }, data: { balance: { increment: n } } });
      await prisma.currencyLedger.create({ data: { userId, amount: n, reason: n >= 0 ? "DAILY" : "TRADE_OUT" } });
    };
    const shopper = (await mk(`${tag}-s`)).id;
    shoppers.push(shopper);
    check("Achat sans Ryō : refusé", await rejects(buyPack(shopper)));
    await credit(shopper, 1000);
    await buyPack(shopper);
    let st = await getPackState(shopper);
    check("Achat : 10 → 11 paquets (au-delà de la réserve), -100 Ryō, 4 achats restants", st.available === 11 && st.balance === 900 && st.purchasesLeft === MAX_PACK_PURCHASES_PER_DAY - 1, `${st.available} paquets, ${st.balance} Ryō, ${st.purchasesLeft} restants`);
    await invariant(shopper, "après un achat");
    await prisma.user.update({ where: { id: shopper }, data: { lastPackAt: new Date(Date.now() - 3 * 3600 * 1000) } });
    check("Au-delà de 10, pas de recharge automatique", (await getPackState(shopper)).available === 11);
    let op = await openPack(shopper); openedBy.push(...op.cards.map((c) => c.characterId));
    check("Ouvrir depuis 11 paquets : 10 restants, réserve pleine", op.state.available === 10 && op.state.nextPackAt === null, `${op.state.available}`);
    op = await openPack(shopper); openedBy.push(...op.cards.map((c) => c.characterId));
    check("Puis 9 restants, la recharge repart (prochain dans ~10 min)", op.state.available === 9 && op.state.nextPackAt !== null && Math.abs(new Date(op.state.nextPackAt).getTime() - (Date.now() + 600_000)) < 5000);
    for (let i = 0; i < MAX_PACK_PURCHASES_PER_DAY - 1; i++) await buyPack(shopper);
    check(`${MAX_PACK_PURCHASES_PER_DAY} achats autorisés, le suivant refusé même avec assez de Ryō`, (await getPackState(shopper)).purchasesLeft === 0 && (await getPackState(shopper)).balance >= PACK_PRICE && (await rejects(buyPack(shopper))));
    await invariant(shopper, "après 5 achats");
    await prisma.user.update({ where: { id: shopper }, data: { packsBoughtDate: new Date(Date.now() - 24 * 3600 * 1000) } });
    check("Le lendemain, les achats sont remis à zéro", (await getPackState(shopper)).purchasesLeft === MAX_PACK_PURCHASES_PER_DAY);
    // Deux achats simultanés avec un solde de 100 Ryō exactement : un seul passe
    const bal = (await getWallet(shopper)).balance;
    await credit(shopper, -(bal - PACK_PRICE));
    const before2 = (await getPackState(shopper)).available;
    const both = await Promise.allSettled([buyPack(shopper), buyPack(shopper)]);
    const bought = both.filter((r) => r.status === "fulfilled").length;
    st = await getPackState(shopper);
    check("Deux achats simultanés avec 100 Ryō : un seul passe, solde à 0", bought === 1 && st.balance === 0 && st.available === before2 + 1, `${bought} réussi(s), solde ${st.balance}`);
    await invariant(shopper, "après un double achat");
  } finally {
    // Rend les numéros d'exemplaire consommés, puis supprime les joueurs jetables (cartes et journal en cascade)
    const used = await prisma.card.findMany({ where: { ownerId: { in: [user.id, other.id] } }, select: { characterId: true } });
    for (const [characterId, count] of pullCountBefore) await prisma.character.update({ where: { id: characterId }, data: { pullCount: count } });
    void used;
    for (const characterId of openedBy) await prisma.character.update({ where: { id: characterId }, data: { pullCount: { decrement: 1 } } });
    await prisma.user.deleteMany({ where: { id: { in: [user.id, other.id, ...shoppers] } } });
  }
  console.log(failures === 0 ? "\nÉconomie conforme." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
