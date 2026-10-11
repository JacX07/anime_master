// Vérification des échanges sur la vraie base (SPEC étape 3, §3, §7 et §10) : tout ou rien, offre invalide,
// expiration, double acceptation, limites, ancienneté du compte, journal des Ryō. Joueurs jetables.
// Usage : npm run check:trades

import { prisma } from "../src/lib/db";
import { MAX_PENDING_TRADES } from "../src/lib/economy";
import { acceptTrade, cancelTrade, createTrade, refuseTrade, TradeError, traders, setForTrade } from "../src/lib/trades";
import { setLocked } from "../src/lib/wallet";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}
const rejects = (p: Promise<unknown>) => p.then(() => false, (e) => e instanceof TradeError);

async function main() {
  const tag = `trd-${Date.now()}`;
  const day = 25 * 3600 * 1000;
  // Joueurs « anciens » (créés il y a 25 h, 20 paquets ouverts) sauf `rookie`
  async function mk(id: string, veteran: boolean, balance = 0) {
    const u = await prisma.user.create({
      data: { id, name: id, username: id, email: `${id}@test.local`, balance, createdAt: new Date(Date.now() - (veteran ? day : 1000)) },
      select: { id: true },
    });
    if (balance) await prisma.currencyLedger.create({ data: { userId: id, amount: balance, reason: "DAILY" } });
    if (veteran) await prisma.packOpening.createMany({ data: Array.from({ length: 20 }, () => ({ userId: id, pityTriggered: "NONE" as const })) });
    return u.id;
  }
  const a = await mk(`${tag}-a`, true, 500), b = await mk(`${tag}-b`, true, 300), c = await mk(`${tag}-c`, true), rookie = await mk(`${tag}-r`, false);
  const names = { a: `${tag}-a`, b: `${tag}-b`, c: `${tag}-c`, r: `${tag}-r` };
  const opening = await prisma.packOpening.create({ data: { userId: a, pityTriggered: "NONE" }, select: { id: true } });
  const pullBefore = new Map<number, number>();

  async function give(characterId: number, ownerId: string) {
    if (!pullBefore.has(characterId)) pullBefore.set(characterId, (await prisma.character.findUniqueOrThrow({ where: { id: characterId }, select: { pullCount: true } })).pullCount);
    const ch = await prisma.character.update({ where: { id: characterId }, data: { pullCount: { increment: 1 } }, select: { pullCount: true, rarity: true } });
    return (await prisma.card.create({ data: { ownerId, characterId, finish: "NORMAL", serial: ch.pullCount, rarityAtPull: ch.rarity, packOpeningId: opening.id }, select: { id: true } })).id;
  }
  const chars = await prisma.character.findMany({ where: { disabled: false }, orderBy: { id: "asc" }, take: 6, select: { id: true } });
  const owner = async (id: string) => (await prisma.card.findUniqueOrThrow({ where: { id }, select: { ownerId: true } })).ownerId;
  const bal = async (id: string) => (await prisma.user.findUniqueOrThrow({ where: { id }, select: { balance: true } })).balance;
  async function invariant(id: string, label: string) {
    const sum = (await prisma.currencyLedger.aggregate({ where: { userId: id }, _sum: { amount: true } }))._sum.amount ?? 0;
    check(`Solde = somme du journal (${label})`, (await bal(id)) === sum && sum >= 0, `${await bal(id)} / ${sum}`);
  }
  const draft = (to: string, give: string[], giveRyo: number, ask: string[], askRyo: number) => ({ toUsername: to, giveCardIds: give, giveRyo, askCardIds: ask, askRyo });

  try {
    const ca = await give(chars[0].id, a), cb = await give(chars[1].id, b), cc = await give(chars[2].id, a);

    // --- Règles d'accès
    check("Compte neuf : offre refusée", await rejects(createTrade(rookie, draft(names.a, [], 10, [ca], 0))));
    check("Destinataire neuf : offre refusée", await rejects(createTrade(a, draft(names.r, [ca], 0, [], 0))));
    check("Offre à soi-même refusée", await rejects(createTrade(a, draft(names.a, [ca], 0, [], 0))));
    check("Offre vide refusée", await rejects(createTrade(a, draft(names.b, [], 0, [], 0))));
    check("Carte d'un autre refusée", await rejects(createTrade(a, draft(names.b, [cb], 0, [], 0))));
    check("Solde insuffisant refusé", await rejects(createTrade(a, draft(names.b, [ca], 501, [], 0))));

    // --- Échange cartes + Ryō accepté
    const t1 = await createTrade(a, draft(names.b, [ca], 100, [cb], 20));
    check("Offre créée en attente + notification au destinataire", (await prisma.trade.findUniqueOrThrow({ where: { id: t1 } })).status === "PENDING" && (await prisma.notification.count({ where: { userId: b, type: "TRADE_RECEIVED" } })) === 1);
    check("Les cartes ne sont pas bloquées pendant l'attente", (await owner(ca)) === a && (await owner(cb)) === b);
    check("Seul le destinataire peut accepter", await rejects(acceptTrade(a, t1)));
    const both = await Promise.allSettled([acceptTrade(b, t1), acceptTrade(b, t1)]);
    check("Double acceptation : une seule passe", both.filter((r) => r.status === "fulfilled").length === 1);
    check("Cartes échangées", (await owner(ca)) === b && (await owner(cb)) === a);
    check("Ryō : A 500-100+20 = 420, B 300+100-20 = 380", (await bal(a)) === 420 && (await bal(b)) === 380, `${await bal(a)} / ${await bal(b)}`);
    await invariant(a, "A après échange"); await invariant(b, "B après échange");
    check("Notification d'acceptation envoyée à A", (await prisma.notification.count({ where: { userId: a, type: "TRADE_ACCEPTED" } })) === 1);

    // --- Invalide : une carte devient verrouillée avant l'acceptation ; tout est annulé
    const t2 = await createTrade(a, draft(names.b, [cb, cc], 50, [ca], 0)); // cb est à A, cc à A, ca à B
    await setLocked(a, cc, true);
    const aBefore = await bal(a), bBefore = await bal(b);
    check("Carte verrouillée entre-temps : acceptation refusée", await rejects(acceptTrade(b, t2)));
    check("Offre passée en INVALID, rien n'a bougé", (await prisma.trade.findUniqueOrThrow({ where: { id: t2 } })).status === "INVALID" && (await owner(cb)) === a && (await owner(ca)) === b && (await bal(a)) === aBefore && (await bal(b)) === bBefore);
    check("A est prévenu (offre invalide)", (await prisma.notification.count({ where: { userId: a, type: "TRADE_INVALID" } })) === 1);
    await setLocked(a, cc, false);

    // --- Invalide : solde insuffisant au moment de l'acceptation
    const t3 = await createTrade(b, draft(names.a, [ca], 0, [], 400)); // B demande 400 à A (A en a 420)
    await prisma.user.update({ where: { id: a }, data: { balance: { decrement: 100 } } });
    await prisma.currencyLedger.create({ data: { userId: a, amount: -100, reason: "PACK_BUY" } });
    check("Solde insuffisant à l'acceptation : refusé et invalide", (await rejects(acceptTrade(a, t3))) && (await prisma.trade.findUniqueOrThrow({ where: { id: t3 } })).status === "INVALID");
    await invariant(a, "A après refus pour solde");

    // --- Refus, annulation, expiration
    const t4 = await createTrade(a, draft(names.c, [cb], 0, [], 0));
    await refuseTrade(c, t4);
    check("Refus : statut REFUSED + notification", (await prisma.trade.findUniqueOrThrow({ where: { id: t4 } })).status === "REFUSED" && (await prisma.notification.count({ where: { userId: a, type: "TRADE_REFUSED" } })) === 1);
    const t5 = await createTrade(a, draft(names.c, [cb], 0, [], 0));
    check("Seul l'expéditeur annule", await rejects(cancelTrade(c, t5)));
    await cancelTrade(a, t5);
    check("Annulation : CANCELLED, impossible d'accepter ensuite", (await prisma.trade.findUniqueOrThrow({ where: { id: t5 } })).status === "CANCELLED" && (await rejects(acceptTrade(c, t5))));
    const t6 = await createTrade(a, draft(names.c, [cb], 0, [], 0));
    await prisma.trade.update({ where: { id: t6 }, data: { expiresAt: new Date(Date.now() - 1000) } });
    check("Offre expirée : acceptation refusée, statut EXPIRED", (await rejects(acceptTrade(c, t6))) && (await prisma.trade.findUniqueOrThrow({ where: { id: t6 } })).status === "EXPIRED");
    check("A est prévenu de l'expiration", (await prisma.notification.count({ where: { userId: a, type: "TRADE_EXPIRED" } })) === 1);

    // --- Limite de 10 offres en attente
    const ids: string[] = [];
    for (let i = 0; i < MAX_PENDING_TRADES; i++) ids.push(await createTrade(a, draft(names.c, [cb], 0, [], 0)));
    check(`${MAX_PENDING_TRADES} offres en attente maximum`, await rejects(createTrade(a, draft(names.c, [cb], 0, [], 0))));
    await prisma.trade.deleteMany({ where: { id: { in: ids } } });

    // --- Tag « À échanger »
    await setForTrade(a, cb, true);
    check("« À échanger » : le personnage liste le joueur", (await traders(chars[1].id)).some((t) => t.username === names.a));
    await setLocked(a, cb, true);
    check("Une carte verrouillée n'est plus proposée", !(await traders(chars[1].id)).some((t) => t.username === names.a));
    await setLocked(a, cb, false);
    await setForTrade(a, cb, true);
    check("Il faut proposer quelque chose en échange", await rejects(createTrade(c, draft(names.a, [], 0, [cb], 0))));
  } finally {
    for (const [characterId, count] of pullBefore) await prisma.character.update({ where: { id: characterId }, data: { pullCount: count } });
    await prisma.user.deleteMany({ where: { id: { in: [a, b, c, rookie] } } });
  }
  console.log(failures === 0 ? "\nÉchanges conformes." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
