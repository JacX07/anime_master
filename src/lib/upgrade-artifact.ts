import { prisma } from "./db";
import { BattleError } from "./battles";
import { ARTIFACT_MAX_LEVEL, artifactUpgradeCost, upgradedMainValue, upgradedSubStats } from "./artifact-upgrade";

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
