"use server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { upgradeArtifact } from "@/lib/upgrade-artifact";
import { BattleError } from "@/lib/battles";

export async function upgradeArtifactAction(artifactId: string, level: number) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Ta session a expiré." };
  try {
    await upgradeArtifact(user.id, String(artifactId), level);
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch (error) {
    if (error instanceof BattleError) return { ok: false as const, error: error.message };
    console.error("Amélioration d’artefact :", error);
    return { ok: false as const, error: "L’amélioration a échoué, réessaie." };
  }
}
