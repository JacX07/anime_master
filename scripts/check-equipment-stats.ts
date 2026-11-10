import assert from "node:assert/strict";
import { createBattle, type BattleCard } from "../src/lib/battle";
import { sumArtifactStats } from "../src/lib/artifact-stats";
import { prisma } from "../src/lib/db";
import { upgradeArtifact } from "../src/lib/upgrade-artifact";
import { equipArtifact, setAttackTeam, startBattle } from "../src/lib/battles";
import { getPlayerInventory } from "../src/lib/player-inventory";

const card: BattleCard = { characterId: 999999, attack: 1000, defense: 500, rarity: "SSR", type: "COMBAT", power: 1, franchiseId: null, noSpell: true };
const unit = (stat: string, value: number) => createBattle([{ ...card, artifactStats: sumArtifactStats([{ mainStat: stat, mainValue: value, subStats: [] }]) }], [], () => 0.5, { spells: false }).teams.A[0];
const baseline = unit("attack", 0);
assert.equal(unit("attack", .2).atk, 1200);
assert.equal(unit("attack", .2).def, baseline.def, "ATK ne doit pas augmenter DEF");
assert.equal(unit("attack", .2).maxHp, baseline.maxHp, "ATK ne doit pas augmenter PV");
assert.equal(unit("defense", .2).def, 600);
assert.equal(unit("defense", .2).atk, baseline.atk);
assert.equal(unit("hp", .2).maxHp, baseline.maxHp * 1.2);
assert.equal(unit("flatAttack", 100).atk, 1100);
assert.equal(unit("flatDefense", 100).def, 600);
assert.equal(unit("flatHp", 100).maxHp, baseline.maxHp + 100);
assert.equal(unit("speed", 10).speed, 110);
const set = sumArtifactStats([{ mainStat: "attack", mainValue: .1, subStats: [{ stat: "crit", value: .02 }] }, { mainStat: "defense", mainValue: .1, subStats: [] }]);
assert(Math.abs(set.attack - .15) < 1e-8);
assert.equal(set.crit, .02);
assert.equal(sumArtifactStats([{ mainStat: "__proto__", mainValue: 999, subStats: [] }]).attack, 0);

async function main() {
  const id = `gearstats-${Date.now()}`;
  await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local` } });
  try {
    const opening = await prisma.packOpening.create({ data: { userId: id, lotSize: 5, pityTriggered: "NONE" } });
    const characters = await prisma.character.findMany({ where: { disabled: false, rarity: "SSR" }, take: 4, orderBy: { id: "asc" } });
    const cards = [];
    for (const character of characters) cards.push(await prisma.card.create({ data: { ownerId: id, characterId: character.id, serial: (await prisma.character.update({ where: { id: character.id }, data: { pullCount: { increment: 1 } } })).pullCount, rarityAtPull: "SSR", finish: "NORMAL", packOpeningId: opening.id } }));
    await setAttackTeam(id, cards.map((c) => c.id));
    await prisma.$transaction([prisma.user.update({ where: { id }, data: { balance: 10000 } }), prisma.currencyLedger.create({ data: { userId: id, reason: "DAILY", amount: 10000 } })]);
    const artifact = await prisma.artifact.create({ data: { userId: id, setKey: "one-piece", slot: "CASQUE", rarity: "SSR", mainStat: "attack", mainValue: .1 } });
    await equipArtifact(id, artifact.id, cards[0].id);
    const inventory = await getPlayerInventory(id);
    const item = inventory.items.find((i) => i.artifact?.id === artifact.id)!;
    assert.equal(item.name, "Chapeau de paille de Luffy");
    assert.equal(item.equippedBy?.id, cards[0].id);
    assert.equal(item.equippedBy?.name, characters[0].name);
    await startBattle(id, "test", false);
    const before = await prisma.battle.findFirstOrThrow({ where: { userId: id }, orderBy: { createdAt: "desc" } });
    const t0 = performance.now();
    await upgradeArtifact(id, artifact.id, 0);
    console.log(`Transaction d’amélioration : ${Math.round(performance.now() - t0)} ms`);
    await startBattle(id, "test", false);
    const after = await prisma.battle.findFirstOrThrow({ where: { userId: id }, orderBy: { createdAt: "desc" } });
    const getStart = (row: typeof before) => (row.log as unknown as { kind: string; units: { id: string; atk: number; maxHp: number; def: number }[] }[]).find((event) => event.kind === "start")!.units.find((u) => u.id === "A1")!;
    // v0.3.0 : la stat principale passe à la formule fixe du niveau 1 (4 % + 2 %), quelle que soit sa valeur de départ
    assert(Math.abs(getStart(after).atk - getStart(before).atk - characters[0].attack * (.06 - .1)) < 1e-5);
    assert.equal(getStart(after).def, getStart(before).def);
    assert.equal(getStart(after).maxHp, getStart(before).maxHp);
    console.log("Statistiques vérifiées : bonus séparés, set, valeurs fixes, porteur et effet réel d’une amélioration sur le combat.");
  } finally { await prisma.user.delete({ where: { id } }); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
