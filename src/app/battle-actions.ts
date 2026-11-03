"use server";

import { revalidatePath } from "next/cache";

import { abandonBattle, autoTeam, BattleError, equipArtifact, getBattle, getStoryProgress, getStoryPreview, playAction, setAttackTeam, setTeam, startBattle } from "@/lib/battles";
import type { Action } from "@/lib/battle";
import { getSessionUser } from "@/lib/session";
import type { ActionResult } from "./economy-actions";

async function run<T extends object>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    const result = await fn(user.id);
    if ("battle" in result && result.battle && typeof result.battle === "object" && "status" in result.battle && result.battle.status !== "RUNNING") revalidatePath("/", "layout");
    return { ok: true, ...result };
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
export async function startBattleAction(opponent: string, manual: boolean, storyCardIds?: string[]) {
  return run(async (id) => ({ battle: await startBattle(id, String(opponent), Boolean(manual), new Date(), storyCardIds) }));
}
export async function getStoryProgressAction() {
  return run(async (id) => ({ progress: await getStoryProgress(id) }));
}
export async function getStoryPreviewAction(universe: string, level: number) {
  return run(async (id) => ({ cards: await getStoryPreview(id, String(universe), Number(level)) }));
}
export async function getBattleAction(battleId: string) {
  return run(async (id) => ({ battle: await getBattle(id, String(battleId)) }));
}
export async function playActionAction(battleId: string, action: Action, steps: number) {
  if (!Number.isSafeInteger(steps) || steps < 0) return { ok: false as const, error: "Version du combat invalide." };
  return run(async (id) => ({ battle: await playAction(id, String(battleId), action, new Date(), steps) }));
}
/** La stratégie automatique joue l'action du joueur (bouton Auto) */
export async function playAutoAction(battleId: string, steps: number) {
  if (!Number.isSafeInteger(steps) || steps < 0) return { ok: false as const, error: "Version du combat invalide." };
  return run(async (id) => ({ battle: await playAction(id, String(battleId), null, new Date(), steps) }));
}
export async function abandonBattleAction(battleId: string) {
  return run(async (id) => (await abandonBattle(id, String(battleId)), {}));
}
export async function equipArtifactAction(artifactId: string, cardId: string | null) {
  return run(async (id) => (await equipArtifact(id, String(artifactId), cardId === null ? null : String(cardId)), {}));
}
