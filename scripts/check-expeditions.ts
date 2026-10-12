// Vérification des expéditions (SPEC étape 4 ter) : règles pures, plafonds, double récupération, blocage des cartes, équilibrage.
// Usage : npm run check:expeditions   (Node 24)

import { prisma } from "../src/lib/db";
import { BREACHES, claimExpedition, DAILY_CRYSTAL_CAP, DAILY_RYO_CAP, ExpeditionError, resolve, slotsFor, startExpedition, WEEKLY_SPECIAL_CAP, readyCount, breachById } from "../src/lib/expeditions";
import { sellCard, SaleError } from "../src/lib/wallet";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}
const rejects = (fn: () => Promise<unknown>, kind: new (...a: never[]) => Error) => fn().then(() => false, (e) => e instanceof kind);

async function main() {
  // --- Règles pures
  const gouffre = breachById("gouffre-signal")!, faille = breachById("faille-echo")!;
  const strong = [{ type: "COMBAT" as const, power: 40000 }, { type: "AVENTURE" as const, power: 40000 }];
  check("Même graine = même résultat", JSON.stringify(resolve(gouffre, strong, 42)) === JSON.stringify(resolve(gouffre, strong, 42)));
  check("Équipe faible : échec, 25 % des Ryō, rien d'autre", (() => { const r = resolve(gouffre, [{ type: "COMBAT", power: 100 }], 7); return r.outcome === "FAIL" && r.ryo === Math.round(gouffre.ryo * 0.25) && r.crystals === 0 && r.special === 0; })());
  check("Équipe très forte : triomphe, Ryō × 1,5 au plus", (() => { const r = resolve(faille, [{ type: "MAGIE", power: 100000 }], 3); return r.outcome === "TRIUMPH" && r.ryo === Math.round(faille.ryo * 1.5); })());
  check("Emplacements : 1 au début, 2 à 5 expéditions, 3 à 20", slotsFor(0) === 1 && slotsFor(4) === 1 && slotsFor(5) === 2 && slotsFor(19) === 2 && slotsFor(20) === 3);
  for (const b of BREACHES) {
    // Équilibrage : taux de réussite d'une équipe d'un rang donné (3 cartes de puissance moyenne)
    const rate = (power: number) => { let ok = 0; for (let s = 0; s < 2000; s++) if (resolve(b, [{ type: b.favored[0], power }, { type: "COMBAT", power }, { type: "COEUR", power }], s).outcome !== "FAIL") ok++; return ok / 2000; };
    console.log(`  ${b.tier.padEnd(8)} ${b.name.padEnd(24)} 3×N(230) ${(rate(230) * 100).toFixed(0)} %  3×R(1100) ${(rate(1100) * 100).toFixed(0)} %  3×SR(4500) ${(rate(4500) * 100).toFixed(0)} %  3×SSR(16000) ${(rate(16000) * 100).toFixed(0)} %`);
  }

  // --- Base
  const stamp = Date.now(), uid = `exp-${stamp}`;
  const pulls = new Map<number, number>();
  const user = await prisma.user.create({ data: { id: uid, name: uid, username: uid, email: `${uid}@test.local` } });
  try {
    const chars = await prisma.character.findMany({ where: { disabled: false, rarity: "SR" }, take: 12, select: { id: true, pullCount: true } });
    const opening = await prisma.packOpening.create({ data: { userId: uid, lotSize: 5, pityTriggered: "NONE" } });
    const cards: string[] = [];
    for (const [i, c] of chars.entries()) {
      pulls.set(c.id, c.pullCount);
      const k = await prisma.character.update({ where: { id: c.id }, data: { pullCount: { increment: 1 } }, select: { pullCount: true } });
      cards.push((await prisma.card.create({ data: { ownerId: uid, characterId: c.id, finish: "NORMAL", serial: k.pullCount, rarityAtPull: "SR", packOpeningId: opening.id } })).id);
      void i;
    }
    const urs = await prisma.character.findMany({ where: { disabled: false, rarity: "UR" }, take: 3, select: { id: true, pullCount: true } });
    const urCards: string[] = [];
    for (const c of urs) {
      pulls.set(c.id, c.pullCount);
      const k = await prisma.character.update({ where: { id: c.id }, data: { pullCount: { increment: 1 } }, select: { pullCount: true } });
      urCards.push((await prisma.card.create({ data: { ownerId: uid, characterId: c.id, finish: "NORMAL", serial: k.pullCount, rarityAtPull: "UR", packOpeningId: opening.id } })).id);
    }
    const sync = async () => prisma.user.findUniqueOrThrow({ where: { id: uid } });

    const e1 = await startExpedition(uid, "faille-echo", cards.slice(0, 2));
    check("Les cartes envoyées sont bloquées", (await prisma.card.count({ where: { id: { in: cards.slice(0, 2) }, inExpedition: true } })) === 2);
    check("Vente d'une carte en expédition refusée", await rejects(() => sellCard(uid, cards[0]), SaleError));
    check("Une carte en expédition ne repart pas en expédition", await rejects(() => startExpedition(uid, "faille-echo", [cards[0]]), ExpeditionError));
    check("1 seul emplacement : un second lancement est refusé", await rejects(() => startExpedition(uid, "faille-echo", [cards[5]]), ExpeditionError));
    check("Récupérer avant la fin est refusé", await rejects(() => claimExpedition(uid, e1.id), ExpeditionError));
    check("Plus de 3 cartes ou aucune carte : refusé", (await rejects(() => startExpedition(uid, "faille-echo", cards.slice(0, 4)), ExpeditionError)) && (await rejects(() => startExpedition(uid, "faille-echo", []), ExpeditionError)));

    await prisma.expedition.update({ where: { id: e1.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    check("Terminée : comptée dans « à récupérer »", (await readyCount(uid)) === 1);
    const before = await sync();
    const [r1, r2] = await Promise.allSettled([claimExpedition(uid, e1.id), claimExpedition(uid, e1.id)]);
    const after = await sync();
    check("Double récupération : un seul paiement", [r1, r2].filter((r) => r.status === "fulfilled").length === 1);
    const exp = await prisma.expedition.findUniqueOrThrow({ where: { id: e1.id } });
    check("Le butin est crédité une fois, au journal", after.balance - before.balance >= exp.ryo && (await prisma.currencyLedger.count({ where: { userId: uid, reason: "EXPEDITION" } })) === (exp.ryo > 0 ? 1 : 0), `+${exp.ryo} Ryō, ${exp.outcome}`);
    check("Les cartes sont libérées et le compteur avance", (await prisma.card.count({ where: { id: { in: cards.slice(0, 2) }, inExpedition: false } })) === 2 && after.expeditionsDone === 1);

    // Plafonds : on force des butins énormes
    const big = async () => {
      const e = await startExpedition(uid, "gouffre-nexus", urCards);
      await prisma.expedition.update({ where: { id: e.id }, data: { endsAt: new Date(Date.now() - 1000) } });
      return claimExpedition(uid, e.id);
    };
    await prisma.user.update({ where: { id: uid }, data: { expeditionsDone: 20 } });
    let ryo = exp.ryo, crystals = exp.crystals, special = exp.special;
    for (let i = 0; i < 12; i++) { const r = await big(); ryo += r.ryo; crystals += r.crystals; special += r.special; }
    check(`Plafonds respectés sur 12 gouffres (Ryō ≤ ${DAILY_RYO_CAP}, cristaux ≤ ${DAILY_CRYSTAL_CAP}, spéciaux ≤ ${WEEKLY_SPECIAL_CAP})`, ryo <= DAILY_RYO_CAP && crystals <= DAILY_CRYSTAL_CAP && special <= WEEKLY_SPECIAL_CAP, `${ryo} Ryō, ${crystals} cristaux, ${special} spéciaux`);
    const ledgerSpecial = (await prisma.specialCrystalLedger.aggregate({ where: { userId: uid, reason: "EXPEDITION" }, _sum: { amount: true } }))._sum.amount ?? 0;
    check("Journal des cristaux spéciaux cohérent", ledgerSpecial === special);
    const ach = (await prisma.userAchievement.findMany({ where: { userId: uid }, select: { key: true } })).map((a) => a.key);
    check("Succès d'expédition débloqués", ["first_expedition", "expeditions_5", "expeditions_20"].every((k) => ach.includes(k)), ach.filter((k) => k.includes("exped")).join(", "));
    void user;
  } finally {
    for (const [characterId, count] of pulls) await prisma.character.update({ where: { id: characterId }, data: { pullCount: count } });
    await prisma.user.deleteMany({ where: { id: uid } });
  }
  console.log(failures === 0 ? "\nExpéditions conformes." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}
main().finally(() => prisma.$disconnect());
