// Quêtes quotidiennes et hebdomadaires sur la vraie base : progression, récupération unique, remise à zéro.
// Joueur jetable, supprimé à la fin. Usage : npm run check:quests   (Node 24)

import { prisma } from "../src/lib/db";
import { startOfDay } from "../src/lib/economy";
import { PERIODIC_QUESTS, PeriodicQuestError, claimPeriodicQuest, getPeriodicQuests, periodWindow } from "../src/lib/periodic-quests";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

const DAY = 86_400_000;

async function main() {
  const tag = `quest-${Date.now()}`;
  await prisma.user.create({ data: { id: tag, name: tag, username: tag, email: `${tag}@test.local`, crystals: 50, crystalsUpdatedAt: new Date() } });
  const now = new Date();
  const yesterday = new Date(startOfDay(now).getTime() - 3_600_000); // hier, 23 h : toujours avant le début du jour
  const weekStart = periodWindow("weekly", now).start;
  const yesterdayInWeek = yesterday >= weekStart;
  const battle = (endedAt: Date, winner: "A" | "B", mode: "STORY" | "TEST" = "STORY") =>
    prisma.battle.create({ data: { userId: tag, mode, opponent: "test-enemy", manual: false, seed: 1, teams: {}, status: "DONE", winner, endedAt } });

  try {
    // Données : 3 victoires aujourd'hui (+1 défaite, +1 combat test non comptés), 2 victoires hier, 3 paquets aujourd'hui, 1 hier.
    for (let i = 0; i < 3; i++) await battle(now, "A");
    await battle(now, "B");
    await battle(now, "A", "TEST");
    for (let i = 0; i < 2; i++) await battle(yesterday, "A");
    for (let i = 0; i < 3; i++) await prisma.packOpening.create({ data: { userId: tag, pityTriggered: "NONE" } });
    await prisma.packOpening.create({ data: { userId: tag, pityTriggered: "NONE", openedAt: yesterday } });
    await prisma.expedition.create({ data: { userId: tag, breachId: "test-breach", endsAt: now, seed: 1, startedAt: now } });
    await prisma.expedition.create({ data: { userId: tag, breachId: "test-breach", endsAt: yesterday, seed: 2, startedAt: yesterday, status: "CLAIMED", outcome: "SUCCESS", claimedAt: yesterday } });

    // --- Progression, au moment « maintenant »
    let q = Object.fromEntries((await getPeriodicQuests(tag, now)).map((x) => [x.key, x]));
    check("Quotidienne : 3 victoires aujourd'hui (défaite, combat test et hier exclus)", q.daily_wins.progress === 3, `${q.daily_wins.progress}`);
    check("Quotidienne : 3 paquets aujourd'hui", q.daily_pulls.progress === 3, `${q.daily_pulls.progress}`);
    check("Quotidienne : expédition lancée aujourd'hui", q.daily_expedition.progress === 1);
    check("Hebdomadaire : victoires de la semaine (hier compté si dans la semaine)", q.weekly_wins.progress === 3 + (yesterdayInWeek ? 2 : 0), `${q.weekly_wins.progress}`);
    check("Hebdomadaire : paquets de la semaine", q.weekly_pulls.progress === 3 + (yesterdayInWeek ? 1 : 0), `${q.weekly_pulls.progress}`);
    check("Hebdomadaire : expéditions récupérées (hier, si dans la semaine)", q.weekly_expeditions.progress === (yesterdayInWeek ? 1 : 0));
    check("Objectif atteint : récupérable, pas encore récupérée", q.daily_wins.claimable === true && q.daily_wins.claimed === false);
    check("Objectif non atteint : pas récupérable", q.weekly_duels.claimable === false && q.weekly_duels.progress === 0);

    // --- Récupération : refus sous l'objectif, puis une seule fois, même en double clic
    await claimPeriodicQuest(tag, "weekly_duels", now).then(() => check("Quête non atteinte : refusée", false), (err) => check("Quête non atteinte : refusée", err instanceof PeriodicQuestError));
    const expeditionClaim = await claimPeriodicQuest(tag, "daily_expedition", now);
    check("Récupération : 2 cristaux", expeditionClaim.claimed === true && expeditionClaim.crystals === 2);
    check("Récupérer deux fois : rien de plus", (await claimPeriodicQuest(tag, "daily_expedition", now)).claimed === false);
    const doubled = await Promise.all([claimPeriodicQuest(tag, "daily_wins", now), claimPeriodicQuest(tag, "daily_wins", now)]);
    check("Double clic sur une quête : une seule récupération", doubled.filter((c) => c.claimed).length === 1, `${doubled.map((c) => c.claimed)}`);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: tag }, select: { crystals: true, specialCrystals: true, balance: true } });
    check("Cristaux : 50 + 2 + 2 = 54, sans cristal spécial ni Ryō", u.crystals === 54 && u.specialCrystals === 0 && u.balance === 0, `${u.crystals} cristaux, ${u.balance} Ryō`);
    q = Object.fromEntries((await getPeriodicQuests(tag, now)).map((x) => [x.key, x]));
    check("Liste : quête récupérée affichée comme telle", q.daily_wins.claimed === true && q.daily_wins.claimable === false && q.daily_expedition.claimed === true);

    // --- Remise à zéro quotidienne : demain, rien d'acquis aujourd'hui ne compte
    const tomorrow = new Date(startOfDay(now).getTime() + DAY + 3_600_000); // demain, 1 h
    const qt = Object.fromEntries((await getPeriodicQuests(tag, tomorrow)).map((x) => [x.key, x]));
    check("Lendemain : victoires quotidiennes remises à zéro", qt.daily_wins.progress === 0 && qt.daily_wins.claimed === false);
    check("Lendemain : expédition quotidienne remise à zéro", qt.daily_expedition.progress === 0 && qt.daily_expedition.claimed === false);
    await claimPeriodicQuest(tag, "daily_wins", tomorrow).then(() => check("Lendemain : pas de récupération sans nouvel objectif", false), (err) => check("Lendemain : pas de récupération sans nouvel objectif", err instanceof PeriodicQuestError));
    for (let i = 0; i < 3; i++) await battle(new Date(tomorrow.getTime() + 60_000), "A");
    const again = await claimPeriodicQuest(tag, "daily_wins", tomorrow);
    check("Lendemain : nouvel objectif, nouvelle récupération (+2)", again.claimed === true && again.crystals === 2);

    // --- Remise à zéro hebdomadaire : la semaine suivante repart de zéro
    const nextWeek = new Date(periodWindow("weekly", now).end.getTime() + 3_600_000);
    const qw = Object.fromEntries((await getPeriodicQuests(tag, nextWeek)).map((x) => [x.key, x]));
    check("Semaine suivante : progression hebdomadaire à zéro", qw.weekly_wins.progress === 0 && qw.weekly_expeditions.progress === 0 && qw.weekly_pulls.progress === 0);
    check("Semaine suivante : rien de récupéré", qw.weekly_wins.claimed === false);
    check("Semaine : lundi 0 h (fenêtre hebdomadaire commence un lundi)", periodWindow("weekly", now).start.getDay() === 1);
    check("Catalogue : 3 quotidiennes et 4 hebdomadaires", PERIODIC_QUESTS.filter((d) => d.period === "daily").length === 3 && PERIODIC_QUESTS.filter((d) => d.period === "weekly").length === 4);
  } finally {
    await prisma.user.delete({ where: { id: tag } });
  }
  console.log(failures === 0 ? "\nQuêtes quotidiennes et hebdomadaires conformes." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().finally(() => prisma.$disconnect());
