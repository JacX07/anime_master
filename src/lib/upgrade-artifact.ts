import { prisma } from "./db";
import { BattleError } from "./battles";
import { ARTIFACT_MAX_LEVEL, artifactUpgradeCost, upgradedMainValue } from "./artifact-upgrade";

export async function upgradeArtifact(userId: string, artifactId: string, expectedLevel: number) {
  if (!Number.isInteger(expectedLevel) || expectedLevel < 0 || expectedLevel >= ARTIFACT_MAX_LEVEL) throw new BattleError("Niveau d’amélioration invalide ou maximum atteint.");
  return prisma.$transaction(async (tx) => {
    const artifact = await tx.artifact.findFirst({ where: { id: artifactId, userId } });
    if (!artifact) throw new BattleError("Artefact introuvable.");
    if (artifact.level !== expectedLevel) throw new BattleError("Cet objet a changé. Actualise avant de l’améliorer.");
    const cost = artifactUpgradeCost(artifact.rarity, artifact.level);
    const changed = await tx.artifact.updateMany({ where: { id: artifactId, userId, level: expectedLevel }, data: { level: { increment: 1 }, mainValue: upgradedMainValue(artifact.mainValue, expectedLevel) } });
    if (changed.count !== 1) throw new BattleError("Cet objet a déjà été amélioré.");
    const paid = await tx.user.updateMany({ where: { id: userId, balance: { gte: cost } }, data: { balance: { decrement: cost } } });
    if (paid.count !== 1) throw new BattleError("Ryō insuffisants.");
    await tx.currencyLedger.create({ data: { userId, amount: -cost, reason: "ARTIFACT_UPGRADE", refId: `${artifactId}:${expectedLevel + 1}` } });
    return { level: expectedLevel + 1, cost };
  });
}
