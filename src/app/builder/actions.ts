"use server";

import { revalidatePath } from "next/cache";
import { builderAllowed, writeSlotDraft } from "@/lib/builder";
import { prisma } from "@/lib/db";
import { discardMechanic, mergeMechanic, startMechanic } from "@/lib/mechanic";
import { isBuilderSlot, parseBuilderValue, type BuilderSlot } from "@/lib/builder-slots";

export async function saveSpellAction(characterId: number, spell: unknown, slot: BuilderSlot = "secondary") {
  if (!(await builderAllowed())) return { ok: false as const, error: "Accès refusé" };
  if (!isBuilderSlot(slot)) return { ok: false as const, error: "Emplacement invalide" };
  const parsed = parseBuilderValue(slot, spell);
  if (!parsed) return { ok: false as const, error: "Sort invalide" };
  const ch = await prisma.character.findUnique({ where: { id: characterId }, select: { rarity: true } });
  if (!ch || (ch.rarity !== "SSR" && ch.rarity !== "UR")) return { ok: false as const, error: "Seuls les SSR et UR ont un sort" };
  await writeSlotDraft(characterId, slot, parsed);
  revalidatePath("/builder");
  return { ok: true as const };
}

export async function resetSpellAction(characterId: number, slot: BuilderSlot = "secondary") {
  if (!(await builderAllowed())) return { ok: false as const, error: "Accès refusé" };
  if (!isBuilderSlot(slot)) return { ok: false as const, error: "Emplacement invalide" };
  await writeSlotDraft(characterId, slot, null);
  revalidatePath("/builder");
  return { ok: true as const };
}

export async function startMechanicAction(characterId: number, wish: string) {
  if (!(await builderAllowed())) return { ok: false as const, error: "Accès refusé" };
  const text = wish.trim().slice(0, 1000);
  if (text.length < 10) return { ok: false as const, error: "Décris le sort en une phrase au moins" };
  await startMechanic(characterId, text);
  return { ok: true as const };
}

export async function mergeMechanicAction(jobId: string) {
  if (!(await builderAllowed())) return { ok: false as const, error: "Accès refusé" };
  const r = await mergeMechanic(jobId);
  revalidatePath("/builder");
  return r;
}

export async function discardMechanicAction(jobId: string) {
  if (!(await builderAllowed())) return { ok: false as const, error: "Accès refusé" };
  await discardMechanic(jobId);
  return { ok: true as const };
}
