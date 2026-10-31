"use server";

import { revalidatePath } from "next/cache";
import { awakenCard } from "@/lib/awaken";
import { BattleError } from "@/lib/battles";
import { getSessionUser } from "@/lib/session";
import type { ActionResult } from "./economy-actions";

export async function awakenCardAction(cardId: string): Promise<ActionResult<{ stars: number }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    const { stars } = await awakenCard(user.id, String(cardId));
    revalidatePath("/eveil");
    revalidatePath("/inventaire");
    return { ok: true, stars };
  } catch (err) {
    if (err instanceof BattleError) return { ok: false, error: err.message };
    console.error("Échec de l'éveil :", err);
    return { ok: false, error: "L'opération a échoué, réessaie." };
  }
}
