import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { adventureLevel, xpForLevel, ADVENTURE_MODES, adventureQuests, modeUnlocked } from "../src/lib/adventure";
import { getAdventure, adventureLock } from "../src/lib/adventure-state";
import { UNIVERSES } from "../src/lib/story";
import { startExpedition } from "../src/lib/expeditions";
import { startBattle } from "../src/lib/battles";

async function main() {
  for (let level = 1; level <= 50; level++) {
    assert.equal(adventureLevel(xpForLevel(level)), level);
    if (level > 1) assert.equal(adventureLevel(xpForLevel(level) - 1), level - 1);
  }
  const facts = { story: [], achievements: [], team: false, awakened: false, equipped: false, expedition: false, towerFloor: 0, dungeonLevel: 0, raidWon: false };
  for (const mode of ADVENTURE_MODES) {
    const story = UNIVERSES.slice(0, Math.max(1, mode.worlds)).map((u) => ({ universe: u.key, maxLevel: mode.storyLevel }));
    // Le niveau demandé doit être atteignable par l'histoire seule (tous les univers terminés), sans succès aléatoire
    const allStory = UNIVERSES.map((u) => ({ universe: u.key, maxLevel: 15 }));
    const xp = adventureQuests({ ...facts, story: allStory }).filter((q) => q.done).reduce((sum, q) => sum + q.xp, 0);
    assert(adventureLevel(xp) >= mode.level, `${mode.label} doit s’ouvrir sans succès aléatoire`);
    assert(modeUnlocked(mode, mode.level, story, false));
    assert(!modeUnlocked(mode, 50, [], false), "Les succès seuls ne remplacent pas l’histoire");
    assert(modeUnlocked(mode, 1, [], true), "Ancien accès conservé");
  }
  assert.equal(adventureLevel(adventureQuests({ ...facts, story: UNIVERSES.map((u) => ({ universe: u.key, maxLevel: 15 })) }).filter((q) => q.done).reduce((sum, q) => sum + q.xp, 0)), 50);
  const id = `adventure-${Date.now()}`;
  await prisma.user.create({ data: { id, username: id, name: id, email: `${id}@test.local` } });
  try {
    const first = await getAdventure(id);
    assert.equal(first.level, 1);
    assert(first.modes.every((m) => !m.unlocked));
    await assert.rejects(startExpedition(id, "faille-echo", []), /Arpenteur/);
    for (const key of ["tower:1", "dungeon:one-piece:1", "raid:fake:normal"]) await assert.rejects(startBattle(id, key, false), /Arpenteur/);
    await prisma.storyProgress.create({ data: { userId: id, universe: UNIVERSES[0].key, maxLevel: 5 } });
    assert(await adventureLock(id, "expeditions"), "Niveau d’Arpenteur 25 requis : l’histoire minimale ne suffit plus");
    // XP de test : de quoi atteindre le niveau 25 (16 200 XP) sans parcourir toute l’histoire
    await prisma.adventureRecord.create({ data: { userId: id, key: "test:xp", xp: 16200 } });
    assert.equal(await adventureLock(id, "expeditions"), null);
    assert(await adventureLock(id, "dungeon"));
    await prisma.storyProgress.update({ where: { userId_universe: { userId: id, universe: UNIVERSES[0].key } }, data: { maxLevel: 15 } });
    const states = await Promise.all([getAdventure(id), getAdventure(id)]);
    assert.equal(states[0].xp, 18300);
    assert.equal(states[1].xp, 18300);
    const balance = (await prisma.user.findUniqueOrThrow({ where: { id } })).balance;
    const ledger = await prisma.currencyLedger.aggregate({ where: { userId: id }, _sum: { amount: true } });
    assert.equal(balance, ledger._sum.amount);
    await getAdventure(id);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id } })).balance, balance);
    assert((await getAdventure(id)).modes.find((m) => m.key === "tower")!.unlocked);
    assert(!(await getAdventure(id)).modes.find((m) => m.key === "raid")!.unlocked);
    // Même une tentative historique de raid préserve l'accès, indépendamment du niveau.
    await prisma.battle.create({ data: { userId: id, mode: "RAID", opponent: "raid:legacy", manual: false, seed: 1, teams: {}, status: "DONE" } });
    assert.equal(await adventureLock(id, "raid"), null);
    await prisma.battle.deleteMany({ where: { userId: id } });
    assert.equal(await adventureLock(id, "raid"), null);
    await prisma.storyProgress.deleteMany({ where: { userId: id } });
    assert.equal((await getAdventure(id)).xp, 18300, "XP acquise conservée");
    assert.equal((await prisma.adventureRecord.count({ where: { userId: id, key: { startsWith: "story:" } } })), 15);
    console.log("Arpenteur conforme : niveaux 1–50, histoire suffisante, verrous serveur, rétroactivité, XP et récompenses uniques sous concurrence.");
  } finally { await prisma.user.delete({ where: { id } }); }
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
