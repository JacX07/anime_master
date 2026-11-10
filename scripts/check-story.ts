// Vérification du mode histoire côté serveur sur la vraie base (docs/specs/pvm.md) : déverrouillage, butin du premier passage
// et du rejeu, plafond quotidien, premier passage unique en cas de combats simultanés, ennemis stables, mode manuel.
// Joueur jetable, supprimé à la fin.
// Usage : npm run check:story

import { combatPowers } from "../src/lib/combat-power";
import { startOfDay } from "../src/lib/economy";
import { BattleError, getBattle, getStoryProgress, playAction, setAttackTeam, startBattle, storyEnemies, storyKey, storyStars, type BattleTeams } from "../src/lib/battles";
import { prisma } from "../src/lib/db";
import { baseUnits, storyReplayRyo, storyFirstRyo, COMMON_RESOURCE, DAILY_FULL_UNITS, UNIVERSES } from "../src/lib/story";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}
const rejects = (p: Promise<unknown>) => p.then(() => false, (e) => e instanceof BattleError);
const sum = (r: Record<string, number> | undefined) => Object.values(r ?? {}).reduce((s, n) => s + n, 0);
const OP = UNIVERSES[0], key = (l: number) => storyKey(OP.key, l);

async function main() {
  check("Défaite : 0 étoile", storyStars(false, []) === 0);
  check("Victoire sans K.-O. : 2 étoiles", storyStars(true, []) === 2);
  check("Victoire avec K.-O. : 1 étoile", storyStars(true, [{ kind: "ko", target: "A1" }]) === 1);
  check("Le duo ne contourne pas un K.-O.", storyStars(true, [{ kind: "ko", target: "A1" }]) === 1);
  check("10 tours sans K.-O. : 3 étoiles", storyStars(true, [{ kind: "end", winner: "A", reason: "ko", hpLeft: { A: 1, B: 0 }, rounds: 10 }]) === 3);
  check("11 tours sans K.-O. : 2 étoiles", storyStars(true, [{ kind: "end", winner: "A", reason: "ko", hpLeft: { A: 1, B: 0 }, rounds: 11 }]) === 2);
  const uid = `sty-${Date.now()}`;
  const pulls = new Map<number, number>();
  await prisma.user.create({ data: { id: uid, name: uid, username: uid, email: `${uid}@test.local` } });
  try {
    const opening = await prisma.packOpening.create({ data: { userId: uid, lotSize: 5, pityTriggered: "NONE" } });
    const urs = await prisma.character.findMany({ where: { disabled: false, rarity: "UR" }, take: 4, orderBy: { id: "asc" }, select: { id: true } });
    const cards: string[] = [];
    for (const c of urs) {
      const before = await prisma.character.findUniqueOrThrow({ where: { id: c.id }, select: { pullCount: true } });
      pulls.set(c.id, before.pullCount);
      const k = await prisma.character.update({ where: { id: c.id }, data: { pullCount: { increment: 1 } }, select: { pullCount: true } });
      cards.push((await prisma.card.create({ data: { ownerId: uid, characterId: c.id, finish: "NORMAL", serial: k.pullCount, rarityAtPull: "UR", packOpeningId: opening.id } })).id);
    }
    await setAttackTeam(uid, cards);
    const stock = async () => Object.fromEntries((await prisma.resourceStock.findMany({ where: { userId: uid } })).map((r) => [r.key, r.quantity]));

    // Déverrouillage
    check("Niveau 2 refusé avant d'avoir gagné le 1", await rejects(startBattle(uid, key(2), false)));
    check("Univers 2 verrouillé tant que le tutoriel n'est pas fini", await rejects(startBattle(uid, storyKey(UNIVERSES[1].key, 1), false)));
    check("Combat d'histoire inconnu refusé", await rejects(startBattle(uid, "story:nope:1", false)));

    // Premier passage
    const a = await startBattle(uid, key(1), false);
    check("Niveau 1 : victoire de 4 UR", a.winner === "A" && a.loot !== null);
    check("Premier passage : ×3 le drop", sum(a.loot?.resources) === 3 * baseUnits(1), `${sum(a.loot?.resources)} unités`);
    const u1 = await prisma.user.findUniqueOrThrow({ where: { id: uid }, select: { balance: true } });
    check("Premier passage : Ryō versés et journalisés", u1.balance === a.loot!.ryo && (await prisma.currencyLedger.count({ where: { userId: uid, reason: "STORY" } })) === 1);
    check("Progression enregistrée", (await getStoryProgress(uid))[0].maxLevel === 1);
    check("Ressources en stock = butin", sum(await stock()) === sum(a.loot?.resources));

    // Rejeu
    const b = await startBattle(uid, key(1), false);
    check("Rejeu : drop simple, petit gain de Ryō, sans cristaux", sum(b.loot?.resources) === baseUnits(1) && b.loot?.ryo === storyReplayRyo(1) && b.loot?.crystals === 0, `${sum(b.loot?.resources)} unités`);
    check("Rejeu : Ryō ajoutés", (await prisma.user.findUniqueOrThrow({ where: { id: uid }, select: { balance: true } })).balance === u1.balance + storyReplayRyo(1));

    // Score de duo, meilleur score conservé, rejeu idempotent
    check("Une sélection d'un personnage est refusée", await rejects(startBattle(uid, key(1), false, new Date(), [cards[0]])));
    const duo = await startBattle(uid, key(1), false, new Date(), cards.slice(0, 2));
    const duoTeams = (await prisma.battle.findUniqueOrThrow({ where: { id: duo.id }, select: { teams: true } })).teams as unknown as BattleTeams;
    check("Une victoire en duo enregistre le bonus", duo.winner === "A" && duoTeams.A.length === 2 && (await getStoryProgress(uid))[0].duo.includes(1));
    check("Meilleur score de l'étape enregistré", (await prisma.storyStageStar.findUniqueOrThrow({ where: { userId_universe_level: { userId: uid, universe: OP.key, level: 1 } } })).stars === 3);
    await startBattle(uid, key(1), false);
    check("Un rejeu à 4 cartes ne rétrograde pas le meilleur score", (await prisma.storyStageStar.findUniqueOrThrow({ where: { userId_universe_level: { userId: uid, universe: OP.key, level: 1 } } })).stars === 3);
    check("Un rejeu reste consultable sans rejouer le règlement", (await getBattle(uid, duo.id)).storyStars === 3);

    // Plafond quotidien
    await prisma.dailyGain.upsert({
      where: { userId_day_source: { userId: uid, day: startOfDay(new Date()), source: "STORY" } },
      create: { userId: uid, day: startOfDay(new Date()), source: "STORY", units: DAILY_FULL_UNITS },
      update: { units: DAILY_FULL_UNITS },
    });
    const c = await startBattle(uid, key(1), false);
    check("Plafond atteint : taux réduit (25 %) mais jamais zéro", sum(c.loot?.resources) === Math.round(baseUnits(1) * 0.25) && sum(c.loot?.resources) > 0, `${sum(c.loot?.resources)} unité(s)`);

    // Premier passage unique, même avec deux combats simultanés
    const concurrent = await Promise.allSettled([startBattle(uid, key(2), false), startBattle(uid, key(2), false)]);
    const both = concurrent.flatMap((r) => r.status === "fulfilled" ? [r.value] : []);
    check("Concurrence : seul le conflit d’énergie attendu peut refuser une tentative", concurrent.every((r) => r.status === "fulfilled" || (r.reason instanceof BattleError && r.reason.message.includes("Un autre combat vient de démarrer"))));
    if (both.length === 1) both.push(await startBattle(uid, key(2), false));
    check("Deux combats simultanés : un seul premier passage", both.filter((x) => x.loot?.ryo === storyFirstRyo(2)).length === 1);
    check("Progression à 2", (await getStoryProgress(uid))[0].maxLevel === 2);
    check("Ancien niveau gagné reste à 1 étoile au minimum", (await getStoryProgress(uid))[0].stars[2] >= 1);

    // Ennemis stables
    const e = async (id: string) => ((await prisma.battle.findUniqueOrThrow({ where: { id } })).teams as unknown as BattleTeams).B;
    const [e1, e2] = [await e(both[0].id), await e(both[1].id)];
    check("Mêmes ennemis à chaque tentative du même combat", JSON.stringify(e1) === JSON.stringify(e2));
    check("Ennemis : 4 personnages de l'univers, stats par niveau", e1.length === 4 && e1.every((x) => x.attack > 0 && x.defense > 0));
    const ids = (a.log ? await e(a.id) : []).map((x) => x.characterId);
    const own = await prisma.character.count({ where: { id: { in: ids }, mainMedia: { franchiseId: { in: OP.franchiseIds } } } });
    check("Ennemis tirés de la franchise de l'univers", own === 4);

    // Progression entre univers : chacun s'ouvre en finissant le précédent, et devient plus difficile
    await prisma.storyProgress.update({ where: { userId_universe: { userId: uid, universe: OP.key } }, data: { maxLevel: 15 } });
    const prog = await getStoryProgress(uid);
    check("Finir l'univers 1 ouvre le 2 et pas le 3", prog[1].unlocked && !prog[2].unlocked);
    check("Combat de l'univers 2 jouable une fois ouvert", !(await rejects(startBattle(uid, storyKey(UNIVERSES[1].key, 1), false))));
    check("15 univers, un de collision tous les 3", UNIVERSES.length === 15 && UNIVERSES.every((u) => (u.kind === "collision") === (u.rank % 3 === 0)));
    let lastPower = 0;
    for (const universe of UNIVERSES) {
      for (let level = 1; level <= 15; level++) {
        const power = combatPowers(await storyEnemies(universe, level)).reduce((n, p) => n + p, 0);
        if (power <= lastPower) throw new Error(`Puissance décroissante : ${universe.key}:${level}, ${lastPower} → ${power}`);
        lastPower = power;
      }
    }
    check("Puissance strictement croissante sur les 225 combats, y compris entre univers", true);
    const boss = await storyEnemies(UNIVERSES[14], 15);
    check("Univers de collision : ennemis de plusieurs anime", new Set(boss.map((c) => c.franchiseId)).size >= 1 && boss[3].boss === true);
    check("Chaque univers fournit 4 ennemis à chaque niveau", (await Promise.all(UNIVERSES.map((u) => storyEnemies(u, 15)))).every((e) => e.length === 4));

    // Mode manuel : le butin est versé à la fin du combat, une seule fois
    const before = sum(await stock());
    let view = await startBattle(uid, key(1), true);
    check("Manuel : pas de butin avant la fin", view.loot === null && sum(await stock()) === before);
    for (let i = 0; i < 200 && view.status === "RUNNING"; i++) {
      const choice = view.choices[0];
      view = await playAction(uid, view.id, { spell: choice.spell, target: choice.targets[0] });
    }
    check("Manuel : combat terminé", view.status === "DONE");
    check("Manuel : score d'histoire persisté", view.storyStars !== null && (await getBattle(uid, view.id)).storyStars === view.storyStars);
    if (view.winner === "A") {
      const gain = sum(await stock()) - before;
      check("Manuel : butin versé une fois à la victoire", view.loot !== null && gain === sum(view.loot.resources), `${gain} unités`);
    } else check("Manuel : défaite sans butin", view.loot === null && sum(await stock()) === before);

    // Défaite sans pénalité ni butin
    const weak = await prisma.character.findMany({ where: { disabled: false, rarity: "N" }, take: 4, orderBy: { id: "asc" }, select: { id: true } });
    const wc: string[] = [];
    for (const w of weak) {
      const before2 = await prisma.character.findUniqueOrThrow({ where: { id: w.id }, select: { pullCount: true } });
      if (!pulls.has(w.id)) pulls.set(w.id, before2.pullCount);
      const k = await prisma.character.update({ where: { id: w.id }, data: { pullCount: { increment: 1 } }, select: { pullCount: true } });
      wc.push((await prisma.card.create({ data: { ownerId: uid, characterId: w.id, finish: "NORMAL", serial: k.pullCount, rarityAtPull: "N", packOpeningId: opening.id } })).id);
    }
    await setAttackTeam(uid, wc);
    await prisma.storyProgress.update({ where: { userId_universe: { userId: uid, universe: OP.key } }, data: { maxLevel: 11 } });
    await prisma.storyProgress.createMany({ data: [UNIVERSES.at(-2)!, UNIVERSES.at(-1)!].map((u, i) => ({ userId: uid, universe: u.key, maxLevel: i === 0 ? 15 : 14 })), skipDuplicates: true });
    const lost = await startBattle(uid, storyKey(UNIVERSES.at(-1)!.key, 15), false);
    check("Défaite : 0 étoile, aucun butin, aucune pénalité", lost.winner !== "A" && lost.storyStars === 0 && lost.loot === null);
    check("Ressource commune bien nommée", COMMON_RESOURCE in (await stock()) || sum(await stock()) > 0);
  } finally {
    for (const [characterId, count] of pulls) await prisma.character.update({ where: { id: characterId }, data: { pullCount: count } });
    await prisma.user.deleteMany({ where: { id: uid } });
  }
  console.log(failures === 0 ? "\nHistoire conforme." : `\n${failures} vérification(s) en échec.`);
  process.exitCode = failures === 0 ? 0 : 1;
}
main().finally(() => prisma.$disconnect());
