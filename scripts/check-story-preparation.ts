// Joueur jetable : aperçu en lecture seule, verrous et parité avec le lancement réel.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { BattleError, getStoryPreview, getStoryRoster, setAttackTeam, startBattle, type BattleTeams } from "../src/lib/battles";
import { combatPowers } from "../src/lib/combat-power";

async function main() {
  const id = `story-prep-${randomUUID()}`;
  await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local` } });
  try {
    const before = await prisma.user.findUniqueOrThrow({ where: { id } });
    const preview = await getStoryPreview(id, "one-piece", 1);
    assert.equal(preview.length, 4);
    assert.equal(await prisma.battle.count({ where: { userId: id } }), 0);
    assert.deepEqual(await prisma.user.findUniqueOrThrow({ where: { id } }), before);
    await assert.rejects(getStoryPreview(id, "one-piece", 2), BattleError);
    await assert.rejects(getStoryPreview(id, "naruto", 1), BattleError);
    await assert.rejects(getStoryPreview(id, "one-piece", NaN), BattleError);
    const chars = await prisma.character.findMany({ where: { disabled: false, rarity: "SSR" }, orderBy: { id: "asc" }, take: 4 });
    assert.equal(chars.length, 4);
    const opening = await prisma.packOpening.create({ data: { userId: id, lotSize: 5, pityTriggered: "NONE" } });
    const ids: string[] = [];
    for (const c of chars) {
      const next = await prisma.character.update({ where: { id: c.id }, data: { pullCount: { increment: 1 } } });
      const card = await prisma.card.create({ data: { ownerId: id, characterId: c.id, serial: next.pullCount, finish: "NORMAL", rarityAtPull: c.rarity, packOpeningId: opening.id, stars: 2 } });
      ids.push(card.id);
    }
    await prisma.artifact.create({ data: { userId: id, equippedCardId: ids[0], setKey: "one-piece", slot: "CASQUE", rarity: "SSR", mainStat: "attack", mainValue: .1 } });
    await setAttackTeam(id, ids);
    const roster = await getStoryRoster(id);
    const mine = ids.map((key) => roster.find((c) => c.id === key)!.combat);
    const launched = await startBattle(id, "story:one-piece:1", true, new Date(), ids);
    const row = await prisma.battle.findUniqueOrThrow({ where: { id: launched.id } });
    const teams = row.teams as unknown as BattleTeams;
    assert.deepEqual(teams.B, preview.map((c) => c.combat));
    assert.deepEqual(combatPowers(teams.A), combatPowers(mine));
    const duo = await startBattle(id, "story:one-piece:1", true, new Date(), ids.slice(0, 2));
    const duoRow = await prisma.battle.findUniqueOrThrow({ where: { id: duo.id } });
    assert.deepEqual(combatPowers((duoRow.teams as unknown as BattleTeams).A), combatPowers(mine.slice(0, 2)));
    console.log("✓ Aperçu sans écriture, verrous et parité des ennemis/puissances avec le combat réel (4 cartes et duo).");
  } finally {
    await prisma.user.delete({ where: { id } });
  }
}
main().finally(() => prisma.$disconnect()).catch((error) => { console.error(error); process.exitCode = 1; });
