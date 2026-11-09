"use server";

import { refresh } from "next/cache";
import { PeriodicQuestError, claimPeriodicQuest } from "@/lib/periodic-quests";
import { getSessionUser } from "@/lib/session";

export type ClaimQuestResult = { ok: true; claimed: boolean; crystals: number } | { ok: false; error: string };

/** Récupère une quête quotidienne ou hebdomadaire atteinte. Idempotent par période. */
export async function claimPeriodicQuestAction(key: string): Promise<ClaimQuestResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    const result = await claimPeriodicQuest(user.id, key);
    refresh();
    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof PeriodicQuestError) return { ok: false, error: err.message };
    console.error("Échec de la récupération de la quête :", err);
    return { ok: false, error: "La récupération a échoué, réessaie." };
  }
}
