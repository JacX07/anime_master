import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { forgeWeapon } from "../src/lib/forge";
import { getAttackTeam, startBattle } from "../src/lib/battles";
import { WEAPONS, WEAPON_RECIPE, WEAPON_RESOURCE_KEYS, RAID_RESOURCE } from "../src/lib/weapons";

async function main() {
  const uid = `forge-${Date.now()}`;
  await prisma.user.create({ data: { id: uid, name: uid, username: uid, email: `${uid}@test.local` } });
  try {
    const opening = await prisma.packOpening.create({ data: { userId: uid, lotSize: 5, pityTriggered: "NONE" } });
    const chars = await prisma.character.findMany({ where: { rarity: "SSR", disabled: false }, take: 4 });
    const cards = [];
    for (const ch of chars) cards.push(await prisma.card.create({ data: { ownerId: uid, characterId: ch.id, serial: (await prisma.character.update({ where: { id: ch.id }, data: { pullCount: { increment: 1 } } })).pullCount, finish: "NORMAL", rarityAtPull: "SSR", packOpeningId: opening.id, stars: 5 } }));
    const card = cards[0];
    await assert.rejects(forgeWeapon("foreign", card.id));
    await assert.rejects(forgeWeapon(uid, card.id));
    assert.equal((await prisma.card.findUniqueOrThrow({ where: { id: card.id } })).weaponKey, null);
    await prisma.resourceStock.createMany({ data: [
      { userId: uid, key: RAID_RESOURCE, quantity: 100 },
      { userId: uid, key: WEAPON_RESOURCE_KEYS[0], quantity: 7 },
      { userId: uid, key: WEAPON_RESOURCE_KEYS[1], quantity: 13 },
    ] });
    await prisma.card.update({ where: { id: card.id }, data: { stars: 4 } });
    await assert.rejects(forgeWeapon(uid, card.id));
    await prisma.card.update({ where: { id: card.id }, data: { stars: 5, inAuction: true } });
    await assert.rejects(forgeWeapon(uid, card.id));
    await prisma.card.update({ where: { id: card.id }, data: { inAuction: false } });
    await prisma.card.update({ where: { id: card.id }, data: { inExpedition: true } });
    await assert.rejects(forgeWeapon(uid, card.id));
    await prisma.card.update({ where: { id: card.id }, data: { inExpedition: false } });
    // A failed material payment must also roll back the hearts and weapon.
    await prisma.resourceStock.update({ where: { userId_key: { userId: uid, key: WEAPON_RESOURCE_KEYS[1] } }, data: { quantity: 12 } });
    await assert.rejects(forgeWeapon(uid, card.id));
    assert.equal((await prisma.resourceStock.findUniqueOrThrow({ where: { userId_key: { userId: uid, key: RAID_RESOURCE } } })).quantity, 100);
    await prisma.resourceStock.update({ where: { userId_key: { userId: uid, key: WEAPON_RESOURCE_KEYS[1] } }, data: { quantity: 13 } });
    const results = await Promise.allSettled([forgeWeapon(uid, card.id), forgeWeapon(uid, card.id)]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await prisma.resourceStock.findUniqueOrThrow({ where: { userId_key: { userId: uid, key: RAID_RESOURCE } } })).quantity, 100 - WEAPON_RECIPE.hearts);
    assert.equal((await prisma.resourceStock.findMany({ where: { userId: uid, key: { in: WEAPON_RESOURCE_KEYS } } })).reduce((n, s) => n + s.quantity, 0), 0);
    await prisma.battleTeam.create({ data: { userId: uid, kind: "ATTACK", slots: { create: cards.map((c, i) => ({ position: i + 1, cardId: c.id })) } } });
    const team = await getAttackTeam(uid);
    assert.equal(team[0]?.weaponKey, WEAPONS.find((w) => w.type === chars[0].type)!.key);
    await startBattle(uid, "test", false);
    const saved = await prisma.battle.findFirstOrThrow({ where: { userId: uid } });
    const teams = saved.teams as unknown as { A: { weapon: unknown }[] };
    assert.deepEqual(teams.A[0].weapon, WEAPONS.find((w) => w.type === chars[0].type)!.weapon);
    console.log("Armes : propriété, étoiles, indisponibilité, rollback, matériaux mixtes, double clic et copie combat conformes.");
  } finally {
    await prisma.user.delete({ where: { id: uid } });
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
