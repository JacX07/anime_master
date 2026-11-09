"use server";

import { ChatError, deleteMessage, getChatState, getMessages, getOnlinePlayers, reportMessage, sendMessage, type ChatMessageView } from "@/lib/chat";
import { getSessionUser } from "@/lib/session";

type State = Awaited<ReturnType<typeof getChatState>>;
type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

async function run<T extends object>(fn: (userId: string) => Promise<T>): Promise<Result<T>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Ta session a expiré, reconnecte-toi." };
  try {
    return { ok: true, ...(await fn(user.id)) };
  } catch (err) {
    if (err instanceof ChatError) return { ok: false, error: err.message };
    console.error("Échec du chat :", err);
    return { ok: false, error: "L'opération a échoué, réessaie." };
  }
}

/** Sondage (5 s chat ouvert, 60 s fermé) : nouveaux messages du canal ouvert et compteurs de non-lus. */
export async function pollChatAction(channel: string | null, after: string | null, markRead: boolean): Promise<Result<{ messages: ChatMessageView[]; state: State }>> {
  return run(async (id) => {
    const messages = channel ? await getMessages(id, String(channel), after ? String(after) : null, !!markRead) : [];
    return { messages, state: await getChatState(id) };
  });
}
export async function sendChatAction(channel: string, text: string): Promise<Result<{ message: ChatMessageView }>> {
  return run(async (id) => ({ message: await sendMessage(id, String(channel), String(text)) }));
}
export async function reportChatAction(messageId: string): Promise<Result<object>> {
  return run(async (id) => { await reportMessage(id, String(messageId)); return {}; });
}
export async function deleteChatAction(messageId: string): Promise<Result<object>> {
  return run(async (id) => { await deleteMessage(id, String(messageId)); return {}; });
}

/** Onglet « En ligne » : joueurs vus depuis moins de 5 minutes (sondé toutes les 60 s, seulement onglet ouvert). */
export async function onlinePlayersAction(): Promise<Result<Awaited<ReturnType<typeof getOnlinePlayers>>>> {
  return run((id) => getOnlinePlayers(id));
}
