"use server";

import { abandonBattle, autoTeam, BattleError, getBattle, getStoryProgress, playAction, setAttackTeam, setTeam, startBattle } from "@/lib/battles";
import type { Action } from "@/lib/battle";
import { getSessionUser } from "@/lib/session";
import type { ActionResult } from "./economy-actions";

async function run<T extends object>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    return { ok: true, ...(await fn(user.id)) };
  } catch (err) {
    if (err instanceof BattleError) return { ok: false, error: err.message };
    console.error("Échec de l'action de combat :", err);
    return { ok: false, error: "L'opération a échoué, réessaie." };
  }
}

export async function setAttackTeamAction(cardIds: string[]) {
  return run(async (id) => (await setAttackTeam(id, (cardIds ?? []).map(String)), {}));
}
export async function autoAttackTeamAction() {
  return run(async (id) => ({ cardIds: await autoTeam(id, "ATTACK") }));
}
export async function setDefenseTeamAction(cardIds: string[]) {
  return run(async (id) => (await setTeam(id, "DEFENSE", (cardIds ?? []).map(String)), {}));
}
export async function autoDefenseTeamAction() {
  return run(async (id) => ({ cardIds: await autoTeam(id, "DEFENSE") }));
}
export async function startBattleAction(opponent: string, manual: boolean) {
  return run(async (id) => ({ battle: await startBattle(id, String(opponent), Boolean(manual)) }));
}
export async function getStoryProgressAction() {
  return run(async (id) => ({ progress: await getStoryProgress(id) }));
}
export async function getBattleAction(battleId: string) {
  return run(async (id) => ({ battle: await getBattle(id, String(battleId)) }));
}
export async function playActionAction(battleId: string, action: Action) {
  return run(async (id) => ({ battle: await playAction(id, String(battleId), action) }));
}
/** La stratégie automatique joue l'action du joueur (bouton Auto) */
export async function playAutoAction(battleId: string) {
  return run(async (id) => ({ battle: await playAction(id, String(battleId), null) }));
}
export async function abandonBattleAction(battleId: string) {
  return run(async (id) => (await abandonBattle(id, String(battleId)), {}));
}
