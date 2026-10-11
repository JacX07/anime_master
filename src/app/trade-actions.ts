"use server";

import { revalidatePath } from "next/cache";
import { markAllRead } from "@/lib/notifications";
import { getSessionUser } from "@/lib/session";
import { acceptTrade, cancelTrade, createTrade, refuseTrade, setForTrade, TradeError } from "@/lib/trades";
import type { ActionResult } from "./economy-actions";

async function run<T extends object>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    const result = await fn(user.id);
    revalidatePath("/", "layout");
    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof TradeError) return { ok: false, error: err.message };
    console.error("Échec de l'action d'échange :", err);
    return { ok: false, error: "L'opération a échoué, réessaie." };
  }
}

export interface TradeInput {
  to: string;
  giveCardIds: string[];
  giveRyo: number;
  askCardIds: string[];
  askRyo: number;
}

export async function createTradeAction(input: TradeInput) {
  return run(async (id) => ({
    tradeId: await createTrade(id, {
      toUsername: String(input.to),
      giveCardIds: (input.giveCardIds ?? []).map(String),
      giveRyo: Math.floor(Number(input.giveRyo) || 0),
      askCardIds: (input.askCardIds ?? []).map(String),
      askRyo: Math.floor(Number(input.askRyo) || 0),
    }),
  }));
}

export async function acceptTradeAction(tradeId: string) {
  return run(async (id) => (await acceptTrade(id, String(tradeId)), {}));
}
export async function refuseTradeAction(tradeId: string) {
  return run(async (id) => (await refuseTrade(id, String(tradeId)), {}));
}
export async function cancelTradeAction(tradeId: string) {
  return run(async (id) => (await cancelTrade(id, String(tradeId)), {}));
}
export async function toggleForTradeAction(cardId: string, forTrade: boolean) {
  return run(async (id) => (await setForTrade(id, String(cardId), Boolean(forTrade)), {}));
}
export async function markNotificationsReadAction() {
  return run(async (id) => (await markAllRead(id), {}));
}
