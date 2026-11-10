"use server";
import { getSessionUser } from "@/lib/session";
import { toggleFavorite } from "@/lib/favorites";

export async function toggleFavoriteAction(characterId: number, on: boolean) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Ta session a expiré." };
  try {
    return { ok: true as const, on: await toggleFavorite(user.id, Number(characterId), Boolean(on)) };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Action impossible." };
  }
}
