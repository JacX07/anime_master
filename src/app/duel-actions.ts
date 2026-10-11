"use server";

import { revalidatePath } from "next/cache";
import { acceptDuel, answerQuestion, createDuel, currentQuestion, declineDuel, DuelError, startDefense } from "@/lib/duels";
import { getSessionUser } from "@/lib/session";
import type { ActionResult } from "./economy-actions";

async function run<T extends object>(fn: (userId: string) => Promise<T>, revalidate = true): Promise<ActionResult<T>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    const result = await fn(user.id);
    if (revalidate) revalidatePath("/", "layout");
    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof DuelError) return { ok: false, error: err.message };
    console.error("Échec de l'action de duel :", err);
    return { ok: false, error: "L'opération a échoué, réessaie." };
  }
}

const ids = (raw: unknown) => (Array.isArray(raw) ? raw.map(String) : []);

export async function createDuelAction(to: string, cardIds: string[]) {
  return run(async (id) => ({ duelId: await createDuel(id, String(to), ids(cardIds)) }));
}
export async function acceptDuelAction(duelId: string, cardIds: string[]) {
  return run(async (id) => (await acceptDuel(id, String(duelId), ids(cardIds)), {}));
}
export async function declineDuelAction(duelId: string) {
  return run(async (id) => (await declineDuel(id, String(duelId)), {}));
}

// Session de défense : pas de revalidation à chaque question (la page se rafraîchit à la fin)
export async function nextQuestionAction(duelId: string) {
  return run(async (id) => {
    await startDefense(id, String(duelId));
    return { question: await currentQuestion(id, String(duelId)) };
  }, false);
}
export async function answerAction(questionId: string, answerIndex: number) {
  return run(async (id) => ({ answer: await answerQuestion(id, String(questionId), Math.floor(Number(answerIndex))) }), false);
}
