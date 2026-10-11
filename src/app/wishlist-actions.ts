"use server";

import { revalidatePath } from "next/cache";
import type { Finish } from "@/generated/prisma/enums";
import { getSessionUser } from "@/lib/session";
import { addWish, removeWish, WishlistError } from "@/lib/wishlist";
import type { ActionResult } from "./economy-actions";

async function run(fn: (userId: string) => Promise<void>): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    await fn(user.id);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof WishlistError) return { ok: false, error: err.message };
    console.error("Échec de l'action de liste de souhaits :", err);
    return { ok: false, error: "L'opération a échoué, réessaie." };
  }
}

export async function addWishAction(characterId: number, finish: string | null) {
  return run((id) => addWish(id, Math.floor(Number(characterId)), finish ? (String(finish) as Finish) : null));
}
export async function removeWishAction(wishId: string) {
  return run((id) => removeWish(id, String(wishId)));
}
