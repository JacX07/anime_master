"use server";
import { refresh } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { recycleArtifacts, upgradeArtifact } from "@/lib/upgrade-artifact";
import { BattleError } from "@/lib/battles";

export async function upgradeArtifactAction(artifactId: string, level: number, target?: number) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Ta session a expiré." };
  try {
    await upgradeArtifact(user.id, String(artifactId), level, target === undefined ? undefined : Number(target));
    refresh();
    return { ok: true as const };
  } catch (error) {
    if (error instanceof BattleError) return { ok: false as const, error: error.message };
    console.error("Amélioration d’artefact :", error);
    return { ok: false as const, error: "L’amélioration a échoué, réessaie." };
  }
}

export async function recycleArtifactsAction(artifactIds: string[]) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Ta session a expiré." };
  try {
    const result = await recycleArtifacts(user.id, Array.isArray(artifactIds) ? artifactIds : []);
    refresh();
    return { ok: true as const, ...result };
  } catch (error) {
    if (error instanceof BattleError) return { ok: false as const, error: error.message };
    console.error("Recyclage d’artefacts :", error);
    return { ok: false as const, error: "Le recyclage a échoué, réessaie." };
  }
}
