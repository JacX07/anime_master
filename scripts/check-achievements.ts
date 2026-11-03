// Vérification des succès et du classement Collection sur la vraie base (SPEC étape 4, §5 et §6). Joueurs jetables.
// Le déblocage ne verse rien ; la récupération (claimAchievement) verse une seule fois (docs/specs/economie.md).
// Usage : npm run check:achievements   (Node 24)

import { prisma } from "../src/lib/db";
import { ACHIEVEMENTS, checkAchievements, claimAchievement, earned, listAchievements, titleOf } from "../src/lib/achievements";
import { getCollectionPower } from "../src/lib/collection";
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
  const user = () => prisma.user.findUniqueOrThrow({ where: { id: tag }, select: { crystals: true } });
  const keys = async () => (await prisma.userAchievement.findMany({ where: { userId: tag }, select: { key: true } })).map((k) => k.key).sort();

  try {
    // --- Règles pures
    const none = { collectionPower: 0, openings: 0, hasSSR: false, hasUR: false, hasHolo: false, hasGold: false, unique: 0, completedAnime: 0, types: 0, auctionSales: 0, trades: 0, duelWins: 0, expeditions: 0, triumphs: 0 };
    check("Rien de fait : aucun succès", earned(none).length === 0);
    check("99 uniques : pas unique_100 ; 100 : oui", !earned({ ...none, unique: 99 }).includes("unique_100") && earned({ ...none, unique: 100 }).includes("unique_100"));
    check("2 500 uniques débloque les 4 paliers", ["unique_100", "unique_500", "unique_1000", "unique_2500"].every((k) => earned({ ...none, unique: 2500 }).includes(k)));
    check("Chaque succès possède une clé unique", new Set(ACHIEVEMENTS.map((a) => a.key)).size === ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS.filter((a) => a.powerRequired !== undefined)) {
      check(a.key + " : seuil exact", !earned({ ...none, collectionPower: a.powerRequired! - 1 }).includes(a.key) && earned({ ...none, collectionPower: a.powerRequired! }).includes(a.key));
    }
    check("100 millions débloquent les 7 paliers de puissance", earned({ ...none, collectionPower: 100_000_000 }).filter((key) => key.startsWith("power_")).length === 7);
    check("Paliers de cristaux : facile 5, moyen 10, difficile 25, légendaire 50", ACHIEVEMENTS.every((a) => ({ facile: 5, moyen: 10, difficile: 25, légendaire: 50 })[a.tier] > 0) && ACHIEVEMENTS.reduce((n, a) => n + ({ facile: 5, moyen: 10, difficile: 25, légendaire: 50 })[a.tier], 0) === 550);

    // --- Valeur de collection
    check("Valeur : UR = 200, UR Holo = 300, UR Holo + Gold = 500, N Gold = 2", collectionValue("UR", false, false) === 200 && collectionValue("UR", true, false) === 300 && collectionValue("UR", true, true) === 500 && collectionValue("N", false, true) === 2);

    // --- Déblocage sans récompense, puis récupération unique
    const [n, ur, ssr] = await Promise.all(["N", "UR", "SSR"].map((r) => prisma.character.findFirstOrThrow({ where: { rarity: r as "N", disabled: false }, orderBy: { id: "asc" }, select: { id: true } })));
    await give(n.id, "NORMAL");
    const u1 = await checkAchievements(tag);
    check("Premier paquet débloqué, sans rien verser", u1.map((a) => a.key).sort().join() === "first_pack" && (await bal()) === 0, `${u1.map((a) => a.key)} ${await bal()}`);
    check("Liste : débloqué mais pas encore récupéré", (await listAchievements(tag)).find((a) => a.key === "first_pack")?.claimed === false);
    check("Récupérer avant déblocage : refusé", await claimAchievement(tag, "first_ssr").then(() => false, () => true));
    check("Deuxième vérification : rien de plus (une seule fois)", (await checkAchievements(tag)).length === 0 && (await bal()) === 0);
    const both = await Promise.all([checkAchievements(tag), checkAchievements(tag)]);
    check("Vérifications simultanées : aucun doublon", both.flat().length === 0 && (await bal()) === 0);
    const crystalsBefore = (await user()).crystals;
    const firstClaims = await Promise.all([claimAchievement(tag, "first_pack"), claimAchievement(tag, "first_pack")]);
    check("Double récupération : une seule fois (+20 Ryō)", firstClaims.filter((c) => c.claimed).length === 1 && (await bal()) === 20, `${firstClaims.map((c) => c.claimed)} ${await bal()}`);
    check("Récupérer encore : rien de plus", !(await claimAchievement(tag, "first_pack")).claimed && (await bal()) === 20);
    check("Palier facile : +5 cristaux normaux", (await user()).crystals >= crystalsBefore + 5, `${crystalsBefore} → ${(await user()).crystals}`);
    check("Liste : récupéré après réclamation", (await listAchievements(tag)).find((a) => a.key === "first_pack")?.claimed === true);

    await give(ur.id, "GOLD"); await give(ssr.id, "HOLO");
    const u2 = (await Promise.all([checkAchievements(tag), checkAchievements(tag)])).flat();
    check("UR + SSR + Holo + Gold débloqués une seule fois malgré deux vérifications simultanées", u2.map((a) => a.key).sort().join() === "first_gold,first_holo,first_ssr,first_ur", u2.map((a) => a.key).join());
    check("Déblocage seul : toujours 20 Ryō", (await bal()) === 20);
    const claims = await Promise.all(["first_gold", "first_holo", "first_ssr", "first_ur"].flatMap((k) => [claimAchievement(tag, k), claimAchievement(tag, k)]));
    check("Quatre succès, deux récupérations chacun : une seule par succès", claims.filter((c) => c.claimed).length === 4, `${claims.filter((c) => c.claimed).length} récupérations`);
    check("Ryō : 20 + 50 + 200 + 30 + 300 = 600", (await bal()) === 600, `${await bal()}`);
    check("Une ligne de journal ACHIEVEMENT par succès récupéré", (await prisma.currencyLedger.count({ where: { userId: tag, reason: "ACHIEVEMENT" } })) === (await keys()).length);
    const sum = (await prisma.currencyLedger.aggregate({ where: { userId: tag }, _sum: { amount: true } }))._sum.amount ?? 0;
    check("Solde = somme du journal", sum === (await bal()));
    check("Notification par succès débloqué", (await prisma.notification.count({ where: { userId: tag, type: "ACHIEVEMENT" } })) === (await keys()).length);

    // Succès payé avant ce changement (journal déjà présent) : compté comme récupéré, jamais repayé.
    await prisma.userAchievement.create({ data: { userId: tag, key: "first_trade" } });
    await prisma.currencyLedger.create({ data: { userId: tag, amount: 30, reason: "ACHIEVEMENT", refId: "first_trade" } });
    await prisma.user.update({ where: { id: tag }, data: { balance: { increment: 30 } } });
    const legacyBefore = await bal();
    check("Succès ancien déjà payé : récupération refusée, rien de doublé", !(await claimAchievement(tag, "first_trade")).claimed && (await bal()) === legacyBefore);

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
    // Puissance : doublons, titre, récompense unique et conservation après vente.
    while (await getCollectionPower(tag) < 100_000) await give(ur.id, "NORMAL");
    const beforePowerReward = await bal();
    const powerUnlocks = (await Promise.all([checkAchievements(tag), checkAchievements(tag)])).flat().filter((a) => a.key.startsWith("power_"));
    check("Doublons : premier palier de puissance débloqué une seule fois", powerUnlocks.map((a) => a.key).join() === "power_100k");
    check("Puissance : le déblocage ne verse rien", (await bal()) === beforePowerReward);
    const powerClaims = await Promise.all([claimAchievement(tag, "power_100k"), claimAchievement(tag, "power_100k")]);
    check("Puissance : récompense récupérée une seule fois (+100)", powerClaims.filter((c) => c.claimed).length === 1 && (await bal()) === beforePowerReward + 100);
    check("Titre associé au palier", titleOf("power_100k") === "Aura naissante");
    await prisma.card.deleteMany({ where: { ownerId: tag } });
    check("Perte de puissance : le succès reste acquis", (await checkAchievements(tag)).length === 0 && (await keys()).includes("power_100k"));

  } finally {
    for (const [characterId, count] of pullBefore) await prisma.character.update({ where: { id: characterId }, data: { pullCount: count } });
    await prisma.user.delete({ where: { id: tag } });
  }
  console.log(failures === 0 ? "\nSuccès et classement conformes." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
