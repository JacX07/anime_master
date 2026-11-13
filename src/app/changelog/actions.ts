"use server";

import { getSessionUser } from "@/lib/session";
import { getReleases } from "@/lib/releases";
import { acknowledgeRelease } from "@/lib/changelog-read";

export async function readReleaseAction(version: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Reconnecte-toi pour enregistrer la lecture." };
  const releases = await getReleases();
  if (typeof version !== "string" || version !== releases[0]?.version) {
    return { ok: false as const, error: "Une nouvelle version est disponible. Recharge la page." };
  }
  try {
    await acknowledgeRelease(user.id, releases.map((r) => r.version));
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Impossible d'enregistrer la lecture. Réessaie." };
  }
}
