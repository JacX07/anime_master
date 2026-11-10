import { prisma } from "./db";
import { BattleError } from "./battles";
import { ARTIFACT_MAX_LEVEL, artifactRecycleValue, artifactUpgradeCost, upgradedMainValue, upgradedSubStats } from "./artifact-upgrade";

/** Améliore d'un niveau, ou directement jusqu'à `targetLevel` (paliers +4, +8, +12, max) : tout ou rien, dans une transaction. */
export async function upgradeArtifact(userId: string, artifactId: string, expectedLevel: number, targetLevel = expectedLevel + 1) {
  if (!Number.isInteger(expectedLevel) || expectedLevel < 0 || expectedLevel >= ARTIFACT_MAX_LEVEL) throw new BattleError("Niveau d’amélioration invalide ou maximum atteint.");
  if (!Number.isInteger(targetLevel) || targetLevel <= expectedLevel || targetLevel > ARTIFACT_MAX_LEVEL) throw new BattleError("Niveau visé invalide.");
  return prisma.$transaction(async (tx) => {
    const artifact = await tx.artifact.findFirst({ where: { id: artifactId, userId } });
    if (!artifact) throw new BattleError("Artefact introuvable.");
    if (artifact.level !== expectedLevel) throw new BattleError("Cet objet a changé. Actualise avant de l’améliorer.");
    let mainValue = artifact.mainValue;
    let subStats = artifact.subStats as { stat: string; value: number }[];
    const steps: { level: number; cost: number }[] = [];
    for (let l = expectedLevel; l < targetLevel; l++) {
      mainValue = upgradedMainValue(mainValue, l);
      subStats = upgradedSubStats(subStats, l + 1, artifact.mainStat);
      steps.push({ level: l + 1, cost: artifactUpgradeCost(artifact.rarity, l) });
    }
    const cost = steps.reduce((s, x) => s + x.cost, 0);
    const changed = await tx.artifact.updateMany({ where: { id: artifactId, userId, level: expectedLevel }, data: { level: targetLevel, mainValue, subStats } });
    if (changed.count !== 1) throw new BattleError("Cet objet a déjà été amélioré.");
    const paid = await tx.user.updateMany({ where: { id: userId, balance: { gte: cost } }, data: { balance: { decrement: cost } } });
    if (paid.count !== 1) throw new BattleError(`Ryō insuffisants (${cost.toLocaleString("fr-FR")} nécessaires).`);
    await tx.currencyLedger.createMany({ data: steps.map((s) => ({ userId, amount: -s.cost, reason: "ARTIFACT_UPGRADE" as const, refId: `${artifactId}:${s.level}` })) });
    return { level: targetLevel, cost };
  });
}

/** Recycle des artefacts non équipés contre des Ryō (tout ou rien) ; renvoie le nombre et les Ryō gagnés. */
export async function recycleArtifacts(userId: string, artifactIds: string[]) {
  const ids = [...new Set(artifactIds.map(String))];
  if (!ids.length || ids.length > 500) throw new BattleError("Sélection d’artefacts invalide.");
  return prisma.$transaction(async (tx) => {
    const rows = await tx.artifact.findMany({ where: { id: { in: ids }, userId }, select: { id: true, rarity: true, level: true, equippedCardId: true } });
    if (rows.length !== ids.length) throw new BattleError("Un des artefacts est introuvable.");
    if (rows.some((a) => a.equippedCardId)) throw new BattleError("Retire d’abord les artefacts équipés.");
    const gone = await tx.artifact.deleteMany({ where: { id: { in: ids }, userId, equippedCardId: null } });
    if (gone.count !== ids.length) throw new BattleError("Un des artefacts vient de changer, réessaie.");
    const values = rows.map((a) => ({ id: a.id, ryo: artifactRecycleValue(a.rarity, a.level) }));
    const ryo = values.reduce((s, v) => s + v.ryo, 0);
    await tx.user.update({ where: { id: userId }, data: { balance: { increment: ryo } } });
    await tx.currencyLedger.createMany({ data: values.map((v) => ({ userId, amount: v.ryo, reason: "ARTIFACT_RECYCLE" as const, refId: v.id })) });
    return { count: ids.length, ryo };
  });
}
