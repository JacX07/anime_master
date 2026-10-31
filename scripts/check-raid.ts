// Vérification du raid côté serveur (docs/specs/pvm.md, « Raid ») sur la vraie base : accès, butin selon la part de PV retirée,
// défaite payante, plafond quotidien, meilleur résultat, mode manuel. Joueur jetable, supprimé à la fin.
// Usage : npm run check:raid

import { startOfDay } from "../src/lib/economy";
import { BattleError, getRaidState, playAction, raidUnlocked, setAttackTeam, startBattle } from "../src/lib/battles";
import { prisma } from "../src/lib/db";
import { baseHearts, bossOfWeek, DAILY_FULL_HEARTS, DIFFICULTIES, parseRaidKey, RAID_BOSSES, RAID_RESOURCE, raidHearts, raidKey } from "../src/lib/raid";
import { LEVELS, UNIVERSES } from "../src/lib/story";
import type { Rarity } from "../src/generated/prisma/enums";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}
const rejects = (p: Promise<unknown>) => p.then(() => false, (e) => e instanceof BattleError);
const hearts = (r: Record<string, number> | undefined) => r?.[RAID_RESOURCE] ?? 0;

async function main() {
  // Calculs purs
  check("Paliers : 0 / 1 / 2 / 3 / 5 cœurs", [0.1, 0.25, 0.5, 0.75].map((s) => baseHearts(s, false)).join() === "0,1,2,3" && baseHearts(0.2, true) === 5);
  const normal = DIFFICULTIES[0], night = DIFFICULTIES[2];
  check("Cauchemar ×4, plein taux", raidHearts(1, true, night, 100, () => 0.5).hearts === 20);
  check("Au-delà du plafond : 25 % (fraction tirée au sort)", raidHearts(1, true, normal, 0, () => 0.9).hearts === 1 && raidHearts(1, true, normal, 0, () => 0.1).hearts === 2);
  check("Plafond partiel : 3 au plein taux + 25 % du reste", raidHearts(1, true, normal, 3, () => 0.9).full === 3);
  check("Clé de raid : aller-retour et rejet", parseRaidKey(raidKey("titan", "cauchemar"))?.boss.key === "titan" && parseRaidKey("raid:nope:normal") === null);
  check("Un boss par semaine, tous différents de type", new Set(RAID_BOSSES.map((b) => b.type)).size === RAID_BOSSES.length);

  const uid = `rd-${Date.now()}`;
  await prisma.user.create({ data: { id: uid, name: uid, username: uid, email: `${uid}@test.local` } });
  try {
    const opening = await prisma.packOpening.create({ data: { userId: uid, lotSize: 5, pityTriggered: "NONE" } });
    let serial = 800000 + Math.floor(Math.random() * 100000);
    const team = async (rarity: Rarity) => {
      const chars = await prisma.character.findMany({ where: { disabled: false, rarity }, take: 4, orderBy: { id: "asc" }, select: { id: true } });
      const ids: string[] = [];
      for (const c of chars) ids.push((await prisma.card.create({ data: { ownerId: uid, characterId: c.id, finish: "NORMAL", serial: serial++, rarityAtPull: rarity, packOpeningId: opening.id } })).id);
      await setAttackTeam(uid, ids);
    };
    const boss = bossOfWeek(new Date());
    const key = (d = "normal", b = boss.key) => raidKey(b, d);
    const stock = async () => (await prisma.resourceStock.findUnique({ where: { userId_key: { userId: uid, key: RAID_RESOURCE } } }))?.quantity ?? 0;
    const daily = async () => (await prisma.dailyGain.findUnique({ where: { userId_day_source: { userId: uid, day: startOfDay(new Date()), source: "RAID" } } }))?.units ?? 0;

    await team("UR");
    check("Raid verrouillé avant la fin du tutoriel", (await rejects(startBattle(uid, key(), false))) && !(await raidUnlocked(uid)).tutorial);
    await prisma.storyProgress.create({ data: { userId: uid, universe: UNIVERSES[0].key, maxLevel: LEVELS } });
    check("Tutoriel fini : seul le Normal est ouvert", (await raidUnlocked(uid)).open.join() === "normal");
    check("Difficile refusé avant d'avoir battu le Normal", await rejects(startBattle(uid, key("difficile"), false)));
    const other = RAID_BOSSES.find((b) => b.key !== boss.key)!;
    check("Boss d'une autre semaine refusé", await rejects(startBattle(uid, key("normal", other.key), false)));
    check("Raid inconnu refusé", await rejects(startBattle(uid, "raid:nope:normal", false)));

    // Défaite payante : équipe faible, on est payé selon la part de PV retirée
    await team("SR");
    const lost = await startBattle(uid, key(), false);
    const share = lost.loot?.share ?? -1;
    check("Défaite : enregistrée avec la part de PV retirée", lost.winner !== "A" && share >= 0 && share < 1, `${Math.round(share * 100)} % retirés`);
    check("Défaite : cœurs selon le palier, rien de plus", hearts(lost.loot?.resources) === baseHearts(share, false) && (await stock()) === baseHearts(share, false), `${hearts(lost.loot?.resources)} cœur(s)`);
    const best = await prisma.raidBest.findUniqueOrThrow({ where: { userId_boss_difficulty: { userId: uid, boss: boss.key, difficulty: "normal" } } });
    check("Meilleur résultat enregistré, pas de victoire", Math.abs(best.bestShare - share) < 1e-9 && !best.won);
    check("Plafond quotidien : seuls les cœurs au taux plein sont comptés", (await daily()) === baseHearts(share, false));

    // Victoire : 4 UR au Normal
    await team("UR");
    const before = await stock(), usedBefore = await daily();
    const win = await startBattle(uid, key(), false);
    check("4 UR battent le boss Normal", win.winner === "A");
    check("Victoire : 5 cœurs au taux plein", hearts(win.loot?.resources) === Math.min(5, DAILY_FULL_HEARTS - usedBefore) + (usedBefore + 5 > DAILY_FULL_HEARTS ? hearts(win.loot?.resources) - Math.min(5, DAILY_FULL_HEARTS - usedBefore) : 0) && hearts(win.loot?.resources) >= 1, `${hearts(win.loot?.resources)} cœur(s)`);
    check("Cœurs versés en stock", (await stock()) === before + hearts(win.loot?.resources));
    const best2 = await prisma.raidBest.findUniqueOrThrow({ where: { userId_boss_difficulty: { userId: uid, boss: boss.key, difficulty: "normal" } } });
    check("Victoire enregistrée, meilleure part conservée", best2.won && best2.bestShare >= best.bestShare);
    check("Difficile ouvert après la victoire au Normal", (await raidUnlocked(uid)).open.join() === "normal,difficile");
    check("Cauchemar encore fermé", await rejects(startBattle(uid, key("cauchemar"), false)));

    // Plafond quotidien : au-delà de 15 cœurs, 25 %
    await prisma.dailyGain.upsert({
      where: { userId_day_source: { userId: uid, day: startOfDay(new Date()), source: "RAID" } },
      create: { userId: uid, day: startOfDay(new Date()), source: "RAID", units: DAILY_FULL_HEARTS },
      update: { units: DAILY_FULL_HEARTS },
    });
    const capped = await startBattle(uid, key(), false);
    check("Plafond atteint : taux réduit (1 ou 2 cœurs au lieu de 5)", capped.winner === "A" && hearts(capped.loot?.resources) >= 1 && hearts(capped.loot?.resources) <= 2, `${hearts(capped.loot?.resources)} cœur(s)`);
    check("Plafond atteint : le compteur du jour ne bouge plus", (await daily()) === DAILY_FULL_HEARTS);
    const state = await getRaidState(uid);
    check("État de la page : boss, cœurs, plus de plein taux", state.boss.key === boss.key && state.hearts === (await stock()) && state.fullHeartsLeft === 0);

    // Manuel : butin versé une fois à la fin
    const m0 = await stock();
    let view = await startBattle(uid, key(), true);
    check("Manuel : pas de butin avant la fin", view.loot === null && (await stock()) === m0);
    for (let i = 0; i < 300 && view.status === "RUNNING"; i++) {
      const choice = view.choices[0];
      view = await playAction(uid, view.id, { spell: choice.spell, target: choice.targets[0] });
    }
    check("Manuel : combat terminé et butin versé une fois", view.status === "DONE" && view.loot !== null && (await stock()) === m0 + hearts(view.loot.resources), `${hearts(view.loot?.resources)} cœur(s)`);
  } finally {
    await prisma.user.deleteMany({ where: { id: uid } });
  }
  console.log(failures === 0 ? "\nRaid conforme." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}
main().finally(() => prisma.$disconnect());
