"use server";

import { refresh } from "next/cache";
import { BattleError } from "@/lib/battles";
import { getSessionUser } from "@/lib/session";
import { claimStarTier } from "@/lib/story-star-claims";
import type { ActionResult } from "./economy-actions";

export async function claimStarTierAction(universe: string, tier: number): Promise<ActionResult<{ ryo: number; crystals: number }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    const loot = await claimStarTier(user.id, String(universe), Number(tier));
    refresh();
    return { ok: true, ryo: loot.ryo, crystals: loot.crystals };
  } catch (err) {
    if (err instanceof BattleError) return { ok: false, error: err.message };
    console.error("Palier d'étoiles :", err);
    return { ok: false, error: "L'opération a échoué, réessaie." };
  }
}
