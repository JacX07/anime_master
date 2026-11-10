"use server";

import { refresh } from "next/cache";
import { awakenCard, duplicateWhere } from "@/lib/awaken";
import { awakenCost, canAwaken, duplicateHelps, universeOfFranchise } from "@/lib/awakening";
import { prisma } from "@/lib/db";
import { RESOURCE_NAMES } from "@/lib/story";
import { BattleError } from "@/lib/battles";
import { getSessionUser } from "@/lib/session";
import type { ActionResult } from "./economy-actions";

export async function awakenCardAction(cardId: string, expectedStars?: number, useDuplicate = false): Promise<ActionResult<{ stars: number }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    const { stars } = await awakenCard(user.id, String(cardId), Number.isInteger(expectedStars) ? Number(expectedStars) : undefined, Boolean(useDuplicate));
    refresh();
    return { ok: true, stars };
  } catch (err) {
    if (err instanceof BattleError) return { ok: false, error: err.message };
    console.error("Échec de l'éveil :", err);
    return { ok: false, error: "L'opération a échoué, réessaie." };
  }
}

export type AwakenInfo = { maxed: boolean; cost: { key: string; name: string; quantity: number; have: number }[]; duplicate: number | null; /** Coût avec un doublon (étoiles 4 et 5), sinon null */ discounted: { key: string; quantity: number }[] | null };

/** Coût du prochain éveil d'une carte, pour la fiche du personnage. */
export async function awakenInfoAction(cardId: string): Promise<AwakenInfo | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const card = await prisma.card.findUnique({ where: { id: String(cardId) }, select: { ownerId: true, characterId: true, stars: true, character: { select: { rarity: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } } } } });
  if (!card || card.ownerId !== user.id) return null;
  const to = card.stars + 1;
  if (!canAwaken(card.character.rarity, to)) return { maxed: true, cost: [], duplicate: null, discounted: null };
  const universe = universeOfFranchise(card.character.mainMedia?.franchiseId ?? card.character.mainMediaId);
  const cost = awakenCost(card.character.rarity, to, universe);
  const discounted = duplicateHelps(to) ? awakenCost(card.character.rarity, to, universe, true) : null;
  const stock = await prisma.resourceStock.findMany({ where: { userId: user.id, key: { in: cost.map((c) => c.key) } } });
  const duplicate = duplicateHelps(to) ? await prisma.card.count({ where: duplicateWhere(user.id, card.characterId, String(cardId)) }) : null;
  return { maxed: false, duplicate, discounted, cost: cost.map((c) => ({ key: c.key, name: RESOURCE_NAMES[c.key] ?? c.key, quantity: c.quantity, have: stock.find((s) => s.key === c.key)?.quantity ?? 0 })) };
}
