"use server";

import { refresh } from "next/cache";
import { AchievementError, claimAchievement } from "@/lib/achievements";
import { getSessionUser } from "@/lib/session";

export type ClaimAchievementResult = { ok: true; claimed: boolean; ryo: number; crystals: number } | { ok: false; error: string };

/** Récupère la récompense d'un succès débloqué. Idempotent : un second appel (double clic) ne verse rien. */
export async function claimAchievementAction(key: string): Promise<ClaimAchievementResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    const result = await claimAchievement(user.id, key);
    refresh();
    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof AchievementError) return { ok: false, error: err.message };
    console.error("Échec de la récupération du succès :", err);
    return { ok: false, error: "La récupération a échoué, réessaie." };
  }
}
