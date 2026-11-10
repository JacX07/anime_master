import assert from "node:assert/strict";
import { artifactSubstatUpgrades } from "../src/lib/artifact-display";
import { artifactSubStats, ARTIFACT_SUBSTAT_BASE } from "../src/lib/dungeons";
import { prisma } from "../src/lib/db";
import { upgradeArtifact } from "../src/lib/upgrade-artifact";
import { artifactUpgradeCost, upgradedSubStats } from "../src/lib/artifact-upgrade";

async function main() {
  for (const [stat, base] of Object.entries(ARTIFACT_SUBSTAT_BASE)) {
    for (const quality of [0.8, 0.9, 1]) {
      for (let upgrades = 0; upgrades <= 4; upgrades++) {
        assert.equal(artifactSubstatUpgrades({ stat, value: base * quality * 2 ** upgrades }), upgrades);
      }
    }
  }
  for (const rarity of ["N", "R", "SR", "SSR", "UR"] as const) {
    let stats = artifactSubStats("CASQUE", rarity, 42, "attack");
    const initial = stats.length;
    for (let level = 1; level <= 16; level++) {
      const before = stats;
      stats = upgradedSubStats(stats, level, "attack", () => 0.5);
      assert.equal(stats.length, Math.min(4, initial + Math.floor(level / 4)));
      assert.equal(new Set(stats.map((sub) => sub.stat)).size, stats.length);
      assert(stats.every((sub) => sub.stat !== "attack"));
      if (level % 4 !== 0) assert.deepEqual(stats, before);
      else if (before.length < 4) assert.deepEqual(stats.slice(0, before.length), before);
      else assert.equal(stats.filter((sub, i) => sub.value === before[i].value * 2).length, 1);
    }
  }
  const id = `upgrade-${Date.now()}`;
  await prisma.user.create({ data: { id, name: id, username: id, email: `${id}@test.local` } });
  try {
    const artifact = await prisma.artifact.create({ data: { userId: id, setKey: "one-piece", slot: "CASQUE", rarity: "SR", mainStat: "attack", mainValue: 0.08, subStats: [] } });
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
    for (let level = 1; level < 16; level++) await upgradeArtifact(id, artifact.id, level);
    const upgraded = await prisma.artifact.findUniqueOrThrow({ where: { id: artifact.id } });
    assert.equal(upgraded.level, 16);
    assert(Math.abs(upgraded.mainValue - 0.36) < 0.00001, "ATK % : 4 % + 2 % par niveau = 36 % à +16 (v0.3.0)");
    assert.equal((upgraded.subStats as unknown[]).length, 4);
    await assert.rejects(upgradeArtifact(id, artifact.id, 16));
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    const ledger = await prisma.currencyLedger.aggregate({ where: { userId: id }, _sum: { amount: true } });
    assert.equal(user.balance, ledger._sum.amount);
    assert.equal(await prisma.currencyLedger.count({ where: { userId: id, reason: "ARTIFACT_UPGRADE" } }), 16);
    console.log("Améliorations conformes : propriété, fonds, rollback, double clic, plafond, statistiques et journal Ryō.");
  } finally { await prisma.user.delete({ where: { id } }); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
