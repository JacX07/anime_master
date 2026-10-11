"use server";

import { revalidatePath } from "next/cache";
import { AuctionError, buyNow, cancelAuction, createAuction, placeBid } from "@/lib/auctions";
import { getSessionUser } from "@/lib/session";
import type { ActionResult } from "./economy-actions";

async function run<T extends object>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    const result = await fn(user.id);
    revalidatePath("/", "layout");
    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof AuctionError) return { ok: false, error: err.message };
    console.error("Échec de l'action d'enchère :", err);
    return { ok: false, error: "L'opération a échoué, réessaie." };
  }
}

const int = (v: unknown) => Math.floor(Number(v));

export async function createAuctionAction(input: { cardId: string; startPrice: number; durationHours: number; buyNowPrice: number | null }) {
  return run(async (id) => ({
    auctionId: await createAuction(id, {
      cardId: String(input.cardId),
      startPrice: int(input.startPrice),
      durationHours: int(input.durationHours),
      buyNowPrice: input.buyNowPrice ? int(input.buyNowPrice) : null,
    }),
  }));
}
export async function placeBidAction(auctionId: string, amount: number) {
  return run(async (id) => (await placeBid(id, String(auctionId), int(amount)), {}));
}
export async function buyNowAction(auctionId: string) {
  return run(async (id) => (await buyNow(id, String(auctionId)), {}));
}
export async function cancelAuctionAction(auctionId: string) {
  return run(async (id) => (await cancelAuction(id, String(auctionId)), {}));
}
