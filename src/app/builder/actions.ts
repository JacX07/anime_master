"use server";

import { revalidatePath } from "next/cache";
import { builderAllowed } from "@/lib/builder";
import { prisma } from "@/lib/db";
import { parseSpell } from "@/lib/spell-schema";

export async function saveSpellAction(characterId: number, spell: unknown) {
  if (!(await builderAllowed())) return { ok: false as const, error: "Accès refusé" };
  const parsed = parseSpell(spell);
  if (!parsed) return { ok: false as const, error: "Sort invalide" };
  const ch = await prisma.character.findUnique({ where: { id: characterId }, select: { rarity: true } });
  if (!ch || (ch.rarity !== "SSR" && ch.rarity !== "UR")) return { ok: false as const, error: "Seuls les SSR et UR ont un sort" };
  await prisma.spellOverride.upsert({
    where: { characterId },
    create: { characterId, spell: parsed as object, status: "ready" },
    update: { spell: parsed as object, status: "ready" },
  });
  revalidatePath("/builder");
  return { ok: true as const };
}

export async function resetSpellAction(characterId: number) {
  if (!(await builderAllowed())) return { ok: false as const, error: "Accès refusé" };
  await prisma.spellOverride.deleteMany({ where: { characterId } });
  revalidatePath("/builder");
  return { ok: true as const };
}
