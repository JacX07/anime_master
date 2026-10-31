import { prisma } from "./db";
import { readSlotDrafts, type BuilderSlot, type BuilderValue } from "./builder-slots";

/** Mise à jour d'un seul emplacement, sans écraser les autres brouillons. */
export async function writeSlotDraft(characterId: number, slot: BuilderSlot, value: BuilderValue | null) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.spellOverride.findUnique({ where: { characterId } });
    const slots = { ...readSlotDrafts(existing?.spell) };
    if (value) slots[slot] = value;
    else delete slots[slot];
    if (!Object.keys(slots).length) {
      await tx.spellOverride.deleteMany({ where: { characterId } });
      return;
    }
    const spell = { slots } as object;
    await tx.spellOverride.upsert({ where: { characterId }, create: { characterId, spell }, update: { spell, status: "ready" } });
  });
}
