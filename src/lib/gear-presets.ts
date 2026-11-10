// Sauvegardes d'équipement (v0.3.0) : l'équipement d'un personnage enregistré sous un nom, à appliquer d'un coup sur un autre.
import { prisma } from "./db";

import { GEAR_PRESET_MAX } from "./gear-presets-shared";
export { GEAR_PRESET_MAX };
export class GearPresetError extends Error {}

export async function listGearPresets(userId: string) {
  const rows = await prisma.gearPreset.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, artifactIds: true } });
  return rows.map((r) => ({ id: r.id, name: r.name, count: Array.isArray(r.artifactIds) ? r.artifactIds.length : 0 }));
}

/** Enregistre ce que porte la carte (artefacts) sous un nom. */
export async function saveGearPreset(userId: string, cardId: string, name: string) {
  const label = String(name ?? "").trim().slice(0, 40);
  if (!label) throw new GearPresetError("Donne un nom à la sauvegarde.");
  if ((await prisma.gearPreset.count({ where: { userId } })) >= GEAR_PRESET_MAX) throw new GearPresetError(`${GEAR_PRESET_MAX} sauvegardes au plus : supprimes-en une.`);
  const worn = await prisma.artifact.findMany({ where: { userId, equippedCardId: cardId }, select: { id: true } });
  if (!worn.length) throw new GearPresetError("Ce personnage ne porte aucun artefact.");
  await prisma.gearPreset.create({ data: { userId, name: label, artifactIds: worn.map((a) => a.id) } });
}

/** Équipe la carte avec les artefacts de la sauvegarde ; ils quittent leur ancien porteur. Les objets recyclés sont ignorés. */
export async function applyGearPreset(userId: string, presetId: string, cardId: string) {
  return prisma.$transaction(async (tx) => {
    const preset = await tx.gearPreset.findFirst({ where: { id: presetId, userId } });
    if (!preset) throw new GearPresetError("Sauvegarde introuvable.");
    if (!(await tx.card.count({ where: { id: cardId, ownerId: userId } }))) throw new GearPresetError("Cette carte ne t'appartient pas.");
    const ids = Array.isArray(preset.artifactIds) ? preset.artifactIds.filter((v): v is string => typeof v === "string") : [];
    const artifacts = await tx.artifact.findMany({ where: { id: { in: ids }, userId }, select: { id: true, slot: true } });
    for (const a of artifacts) {
      await tx.artifact.updateMany({ where: { userId, equippedCardId: cardId, slot: a.slot, id: { not: a.id } }, data: { equippedCardId: null } });
      await tx.artifact.update({ where: { id: a.id }, data: { equippedCardId: cardId } });
    }
    return { applied: artifacts.length, missing: ids.length - artifacts.length };
  });
}

export async function deleteGearPreset(userId: string, presetId: string) {
  await prisma.gearPreset.deleteMany({ where: { id: presetId, userId } });
}
