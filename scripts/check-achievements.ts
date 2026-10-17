// Vérification des succès et du classement Collection sur la vraie base (SPEC étape 4, §5 et §6). Joueurs jetables.
// Usage : npm run check:achievements   (Node 24)

import { prisma } from "../src/lib/db";
import { ACHIEVEMENTS, checkAchievements, earned } from "../src/lib/achievements";
import { collectionValue } from "../src/lib/economy";
import { collectionLeaderboard } from "../src/lib/leaderboard";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const tag = `ach-${Date.now()}`;
  await prisma.user.create({ data: { id: tag, name: tag, username: tag, email: `${tag}@test.local` } });
  const opening = await prisma.packOpening.create({ data: { userId: tag, pityTriggered: "NONE" }, select: { id: true } });
  const pullBefore = new Map<number, number>();
  async function give(characterId: number, finish: "NORMAL" | "HOLO" | "GOLD") {
    if (!pullBefore.has(characterId)) pullBefore.set(characterId, (await prisma.character.findUniqueOrThrow({ where: { id: characterId }, select: { pullCount: true } })).pullCount);
    const c = await prisma.character.update({ where: { id: characterId }, data: { pullCount: { increment: 1 } }, select: { pullCount: true, rarity: true } });
    await prisma.card.create({ data: { ownerId: tag, characterId, finish, serial: c.pullCount, rarityAtPull: c.rarity, packOpeningId: opening.id } });
  }
  const bal = async () => (await prisma.user.findUniqueOrThrow({ where: { id: tag }, select: { balance: true } })).balance;
  const keys = async () => (await prisma.userAchievement.findMany({ where: { userId: tag }, select: { key: true } })).map((k) => k.key).sort();

  try {
    // --- Règles pures
    const none = { openings: 0, hasSSR: false, hasUR: false, hasHolo: false, hasGold: false, unique: 0, completedAnime: 0, types: 0, auctionSales: 0, trades: 0, duelWins: 0, expeditions: 0, triumphs: 0 };
    check("Rien de fait : aucun succès", earned(none).length === 0);
    check("99 uniques : pas unique_100 ; 100 : oui", !earned({ ...none, unique: 99 }).includes("unique_100") && earned({ ...none, unique: 100 }).includes("unique_100"));
    check("2 500 uniques débloque les 4 paliers", ["unique_100", "unique_500", "unique_1000", "unique_2500"].every((k) => earned({ ...none, unique: 2500 }).includes(k)));
    check("Il y a un succès par clé de la spec (22)", ACHIEVEMENTS.length === 22 && new Set(ACHIEVEMENTS.map((a) => a.key)).size === 22);

    // --- Valeur de collection
    check("Valeur : UR = 200, UR Holo = 300, UR Holo + Gold = 500, N Gold = 2", collectionValue("UR", false, false) === 200 && collectionValue("UR", true, false) === 300 && collectionValue("UR", true, true) === 500 && collectionValue("N", false, true) === 2);

    // --- Déblocage
    const [n, ur, ssr] = await Promise.all(["N", "UR", "SSR"].map((r) => prisma.character.findFirstOrThrow({ where: { rarity: r as "N", disabled: false }, orderBy: { id: "asc" }, select: { id: true } })));
    await give(n.id, "NORMAL");
    const u1 = await checkAchievements(tag);
    check("Premier paquet : +20 Ryō", u1.map((a) => a.key).sort().join() === "first_pack" && (await bal()) === 20, `${u1.map((a) => a.key)} ${await bal()}`);
    check("Deuxième vérification : rien de plus (une seule fois)", (await checkAchievements(tag)).length === 0 && (await bal()) === 20);
    const both = await Promise.all([checkAchievements(tag), checkAchievements(tag)]);
    check("Vérifications simultanées : aucun doublon", both.flat().length === 0 && (await bal()) === 20);

    await give(ur.id, "GOLD"); await give(ssr.id, "HOLO");
    const u2 = (await Promise.all([checkAchievements(tag), checkAchievements(tag)])).flat();
    check("UR + SSR + Holo + Gold débloqués une seule fois malgré deux vérifications simultanées", u2.map((a) => a.key).sort().join() === "first_gold,first_holo,first_ssr,first_ur", u2.map((a) => a.key).join());
    check("Ryō : 20 + 50 + 200 + 30 + 300 = 600", (await bal()) === 600, `${await bal()}`);
    check("Une ligne de journal ACHIEVEMENT par succès", (await prisma.currencyLedger.count({ where: { userId: tag, reason: "ACHIEVEMENT" } })) === (await keys()).length);
    const sum = (await prisma.currencyLedger.aggregate({ where: { userId: tag }, _sum: { amount: true } }))._sum.amount ?? 0;
    check("Solde = somme du journal", sum === (await bal()));
    check("Notification par succès", (await prisma.notification.count({ where: { userId: tag, type: "ACHIEVEMENT" } })) === (await keys()).length);

    // --- Classement : N normal (1) + UR Gold (200 × 2 = 400) + SSR Holo (40 × 1,5 = 60) = 461
    const lb = await collectionLeaderboard(tag);
    check("Score Collection = 1 + 400 + 60 = 461, 3 uniques", lb.me?.score === 461 && lb.me.unique === 3, `${lb.me?.score}/${lb.me?.unique}`);
    // un doublon ne change rien
    await give(n.id, "NORMAL");
    check("Un doublon n'ajoute pas de points", (await collectionLeaderboard(tag)).me?.score === 461);
    // la Holo en plus d'une Normale ajoute 50 %
    await give(n.id, "HOLO");
    check("Normale + Holo du même personnage : 1 × 1,5 → 1 (arrondi bas du total 461,5)", (await collectionLeaderboard(tag)).me?.score === 461);
    check("Le classement est trié par score décroissant", (await collectionLeaderboard(null)).top.every((r, i, a) => i === 0 || a[i - 1].score >= r.score));
  } finally {
    for (const [characterId, count] of pullBefore) await prisma.character.update({ where: { id: characterId }, data: { pullCount: count } });
    await prisma.user.delete({ where: { id: tag } });
  }
  console.log(failures === 0 ? "\nSuccès et classement conformes." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
