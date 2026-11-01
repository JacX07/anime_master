// Répare les anciens objets une seule fois, avec sauvegarde transactionnelle des sous-stats.
// Usage : npx tsx scripts/migrate-artifact-substats.ts
import { prisma } from "../src/lib/db";
import { artifactSubStats, type ArtifactSlot } from "../src/lib/dungeons";
import { upgradedSubStats } from "../src/lib/artifact-upgrade";

async function main() {
  const count = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS ArtifactSubstatsV2Backup (artifactId TEXT PRIMARY KEY, subStats TEXT NOT NULL)');
    const done = await tx.$queryRawUnsafe<{ artifactId: string }[]>('SELECT artifactId FROM ArtifactSubstatsV2Backup');
    const ids = new Set(done.map((row) => row.artifactId));
    if (ids.has("__complete__")) return 0;
    const artifacts = await tx.artifact.findMany();
    let changed = 0;
    for (const artifact of artifacts) {
      if (ids.has(artifact.id)) continue;
      let stats = artifactSubStats(artifact.slot as ArtifactSlot, artifact.rarity, Math.floor(Math.random() * 4294967296), artifact.mainStat);
      for (let level = 4; level <= artifact.level; level += 4) stats = upgradedSubStats(stats, level, artifact.mainStat);
      await tx.$executeRaw`INSERT INTO ArtifactSubstatsV2Backup (artifactId, subStats) VALUES (${artifact.id}, ${JSON.stringify(artifact.subStats)})`;
      await tx.artifact.update({ where: { id: artifact.id }, data: { subStats: stats } });
      changed++;
    }
    await tx.$executeRaw`INSERT INTO ArtifactSubstatsV2Backup (artifactId, subStats) VALUES (${"__complete__"}, ${"[]"})`;
    return changed;
  }, { timeout: 60000 });
  console.log(`${count} artefacts corrigés ; anciennes sous-stats sauvegardées. Niveaux et stats principales conservés.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
