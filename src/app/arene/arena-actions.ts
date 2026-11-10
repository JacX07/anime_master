"use server";

import { ArenaError, arenaEnqueue, arenaForfeit, arenaPlay, arenaState, arenaView, type ArenaView } from "@/lib/arena";
import type { Spell, UnitId } from "@/lib/battle";
import { getSessionUser } from "@/lib/session";
import type { ActionResult } from "../economy-actions";

async function run<T extends object>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    return { ok: true, ...(await fn(user.id)) };
  } catch (err) {
    if (err instanceof ArenaError) return { ok: false, error: err.message };
    console.error("Échec de l'action d'arène :", err);
    return { ok: false, error: "L'opération a échoué, réessaie." };
  }
}

/** Entre en file et renvoie l'état du match (en file, ou déjà apparié). */
export async function arenaJoinAction(): Promise<ActionResult<{ view: ArenaView | null }>> {
  return run(async (id) => { await arenaEnqueue(id); return { view: await arenaState(id, 0) }; });
}
/** Sonde : état du match en cours, journal depuis `from`. Aucun match : view = null. */
export async function arenaPollAction(matchId: string | null, from: number): Promise<ActionResult<{ view: ArenaView | null }>> {
  const offset = Number.isSafeInteger(from) && from >= 0 ? from : 0;
  // Avec l'identifiant, on suit aussi un match qui vient de se terminer (le résultat reste lisible)
  return run(async (id) => ({ view: matchId ? await arenaView(id, String(matchId), offset) : await arenaState(id, offset) }));
}
export async function arenaPlayAction(matchId: string, spell: Spell, target: UnitId | null, steps: number, from: number): Promise<ActionResult<{ view: ArenaView }>> {
  return run(async (id) => ({ view: await arenaPlay(id, String(matchId), { spell, target }, steps, Number.isSafeInteger(from) && from >= 0 ? from : 0) }));
}
/** File : quitter ; match : abandon (défaite). */
export async function arenaLeaveAction(matchId: string): Promise<ActionResult<object>> {
  return run(async (id) => { await arenaForfeit(id, String(matchId)); return {}; });
}
export async function arenaResultAction(matchId: string): Promise<ActionResult<{ view: ArenaView }>> {
  return run(async (id) => ({ view: await arenaView(id, String(matchId), 0) }));
}
