"use server";

import { revalidatePath } from "next/cache";
import { claimExpedition, ExpeditionError, startExpedition } from "@/lib/expeditions";
import { getSessionUser } from "@/lib/session";
import type { ActionResult } from "./economy-actions";

async function run<T extends object>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    const result = await fn(user.id);
    revalidatePath("/", "layout"); // solde, cristaux et pastille du menu
    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof ExpeditionError) return { ok: false, error: err.message };
    console.error("Échec de l'action d'expédition :", err);
    return { ok: false, error: "L'opération a échoué, réessaie." };
  }
}

export async function startExpeditionAction(breachId: string, cardIds: string[]) {
  return run(async (id) => (await startExpedition(id, String(breachId), Array.isArray(cardIds) ? cardIds.map(String) : []), {}));
}
export async function claimExpeditionAction(expeditionId: string) {
  return run(async (id) => {
    const r = await claimExpedition(id, String(expeditionId));
    return { outcome: r.outcome, ryo: r.ryo, crystals: r.crystals, special: r.special, breach: r.breach.name };
  });
}
