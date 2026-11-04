import { getSessionUser } from "@/lib/session";
import { ChatDock } from "./ChatDock";

/** Widget de chat de toutes les pages pour les joueurs connectés. Lit la session : derrière un Suspense. */
export async function ChatDockMount() {
  const user = await getSessionUser();
  return user ? <ChatDock userId={user.id} /> : null;
}
