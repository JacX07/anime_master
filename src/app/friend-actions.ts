"use server";

import { revalidatePath } from "next/cache";
import { acceptFriendRequest, blockUser, FriendError, removeFriendship, sendFriendRequest, unblockUser } from "@/lib/friends";
import { getSessionUser } from "@/lib/session";
import type { ActionResult } from "./economy-actions";

async function run(fn: (userId: string) => Promise<unknown>): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    await fn(user.id);
    revalidatePath("/friends");
    revalidatePath("/u/[pseudo]", "page");
    return { ok: true };
  } catch (err) {
    if (err instanceof FriendError) return { ok: false, error: err.message };
    console.error("Échec de l'action d'amitié :", err);
    return { ok: false, error: "L'opération a échoué, réessaie." };
  }
}

export async function sendFriendRequestAction(username: string) {
  return run((id) => sendFriendRequest(id, String(username)));
}
export async function acceptFriendRequestAction(friendshipId: string) {
  return run((id) => acceptFriendRequest(id, String(friendshipId)));
}
export async function removeFriendshipAction(friendshipId: string) {
  return run((id) => removeFriendship(id, String(friendshipId)));
}
export async function blockUserAction(username: string) {
  return run((id) => blockUser(id, String(username)));
}
export async function unblockUserAction(blockedId: string) {
  return run((id) => unblockUser(id, String(blockedId)));
}
