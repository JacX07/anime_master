"use server";

import { refresh } from "next/cache";
import { builderAllowed, writeSlotDraft } from "@/lib/builder";
import { prisma } from "@/lib/db";
import { applyToGame } from "@/lib/builder-apply";
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
  refresh();
  return { ok: true as const };
}

export async function resetSpellAction(characterId: number, slot: BuilderSlot = "secondary") {
  if (!(await builderAllowed())) return { ok: false as const, error: "Accès refusé" };
  if (!isBuilderSlot(slot)) return { ok: false as const, error: "Emplacement invalide" };
  await writeSlotDraft(characterId, slot, null);
  refresh();
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
  refresh();
  return r;
}

export async function discardMechanicAction(jobId: string) {
  if (!(await builderAllowed())) return { ok: false as const, error: "Accès refusé" };
  await discardMechanic(jobId);
  return { ok: true as const };
}

/** Écrit le sort dans le jeu (skill-overrides.json), puis efface le brouillon : l'éditeur affiche alors ce sort comme celui d'origine. */
export async function applyToGameAction(characterId: number, spell: unknown, slot: BuilderSlot = "secondary") {
  if (!(await builderAllowed())) return { ok: false as const, error: "Accès refusé" };
  if (!isBuilderSlot(slot)) return { ok: false as const, error: "Emplacement invalide" };
  const parsed = parseBuilderValue(slot, spell);
  if (!parsed) return { ok: false as const, error: "Sort invalide" };
  const ch = await prisma.character.findUnique({ where: { id: characterId }, select: { rarity: true } });
  if (!ch || (ch.rarity !== "SSR" && ch.rarity !== "UR")) return { ok: false as const, error: "Seuls les SSR et UR ont un sort" };
  await applyToGame(characterId, slot, parsed);
  refresh();
  return { ok: true as const };
}
