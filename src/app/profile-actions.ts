"use server";

import { refresh } from "next/cache";
import { ProfileError, setAvatar, setShowcase, setTitle } from "@/lib/profile";
import { getSessionUser } from "@/lib/session";
import type { ActionResult } from "./economy-actions";

async function run(fn: (userId: string) => Promise<void>): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    await fn(user.id);
    refresh();
    return { ok: true };
  } catch (err) {
    if (err instanceof ProfileError) return { ok: false, error: err.message };
    console.error("Échec de la mise à jour du profil :", err);
    return { ok: false, error: "L'opération a échoué, réessaie." };
  }
}

export async function setTitleAction(key: string | null) {
  return run((id) => setTitle(id, key ? String(key) : null));
}
export async function setShowcaseAction(ids: number[]) {
  return run((id) => setShowcase(id, Array.isArray(ids) ? ids.map(Number) : []));
}
export async function setAvatarAction(characterId: number | null) {
  return run((id) => setAvatar(id, characterId === null ? null : Number(characterId)));
}
