import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { upgradeArtifact } from "../src/lib/upgrade-artifact";
import { artifactUpgradeCost } from "../src/lib/artifact-upgrade";

async function main() {
  const id = `upgrade-${Date.now()}`;
  await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local` } });
  try {
    const artifact = await prisma.artifact.create({ data: { userId: id, setKey: "one-piece", slot: "CASQUE", rarity: "SR", mainStat: "attack", mainValue: 0.08, subStats: [{ stat: "crit", value: 0.02 }] } });
    await assert.rejects(upgradeArtifact("foreign", artifact.id, 0));
    await assert.rejects(upgradeArtifact(id, artifact.id, -1));
    await assert.rejects(upgradeArtifact(id, artifact.id, 0), /Ryō/);
    assert.equal((await prisma.artifact.findUniqueOrThrow({ where: { id: artifact.id } })).level, 0);
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { balance: 100000 } }),
      prisma.currencyLedger.create({ data: { userId: id, amount: 100000, reason: "DAILY" } }),
    ]);
    const results = await Promise.allSettled([upgradeArtifact(id, artifact.id, 0), upgradeArtifact(id, artifact.id, 0)]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id } })).balance, 100000 - artifactUpgradeCost("SR", 0));
    await assert.rejects(upgradeArtifact(id, artifact.id, 0));
    for (let level = 1; level < 10; level++) await upgradeArtifact(id, artifact.id, level);
    const upgraded = await prisma.artifact.findUniqueOrThrow({ where: { id: artifact.id } });
    assert.equal(upgraded.level, 10);
    assert(Math.abs(upgraded.mainValue - 0.12) < 0.00001, "+50 % de la valeur de départ à +10");
    assert.deepEqual(upgraded.subStats, artifact.subStats);
    await assert.rejects(upgradeArtifact(id, artifact.id, 10));
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    const ledger = await prisma.currencyLedger.aggregate({ where: { userId: id }, _sum: { amount: true } });
    assert.equal(user.balance, ledger._sum.amount);
    assert.equal(await prisma.currencyLedger.count({ where: { userId: id, reason: "ARTIFACT_UPGRADE" } }), 10);
    console.log("Améliorations conformes : propriété, fonds, rollback, double clic, plafond, statistiques et journal Ryō.");
  } finally { await prisma.user.delete({ where: { id } }); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
