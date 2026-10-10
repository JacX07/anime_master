"use server";

import { revalidatePath } from "next/cache";
import type { Rarity } from "@/generated/prisma/enums";
import { RARITY_ORDER } from "@/lib/album";
import { getSessionUser } from "@/lib/session";
import {
  claimDailyBonus,
  previewDuplicateSale,
  SaleError,
  sellCard,
  sellDuplicates,
  setLocked,
  type SalePreview,
} from "@/lib/wallet";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const SESSION_EXPIRED = "Ta session a expiré, reconnecte-toi.";

async function run<T extends object>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };
  try {
    const result = await fn(user.id);
    // Solde du menu, album et fiches : tout dépend de la collection et du portefeuille
    revalidatePath("/", "layout");
    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof SaleError) return { ok: false, error: err.message };
    console.error("Échec de l'action économie :", err);
    return { ok: false, error: "L'opération a échoué, réessaie." };
  }
}

const parseRarities = (raw: unknown): Rarity[] => (Array.isArray(raw) ? RARITY_ORDER.filter((r) => raw.includes(r)) : []);

export async function claimDailyBonusAction() {
  return run(async (id) => ({ amount: await claimDailyBonus(id) }));
}

export async function toggleLockAction(cardId: string, locked: boolean) {
  return run(async (id) => {
    await setLocked(id, String(cardId), Boolean(locked));
    return {};
  });
}

export async function sellCardAction(cardId: string) {
  return run(async (id) => ({ total: await sellCard(id, String(cardId)) }));
}

export async function sellDuplicatesAction(rarities: string[]) {
  return run(async (id) => {
    const list = parseRarities(rarities);
    if (list.length === 0) throw new SaleError("Choisis au moins une rareté.");
    return sellDuplicates(id, list);
  });
}

/** Lecture seule : le résultat sert à l'avertissement avant la vente. */
export async function previewDuplicatesAction(rarities: string[]): Promise<ActionResult<{ preview: SalePreview }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };
  return { ok: true, preview: await previewDuplicateSale(user.id, parseRarities(rarities)) };
}
