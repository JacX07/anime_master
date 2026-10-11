import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { listNotifications, type NotificationType } from "@/lib/notifications";
import { requireUser } from "@/lib/session";
import { MarkRead } from "./MarkRead";

export const metadata: Metadata = { title: "Notifications — Anime Masters" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

const TEXT: Record<NotificationType, (who: string, reason?: string) => string> = {
  TRADE_RECEIVED: (who) => `${who} t'a envoyé une offre d'échange.`,
  TRADE_ACCEPTED: (who) => `${who} a accepté ton offre d'échange.`,
  TRADE_REFUSED: (who) => `${who} a refusé ton offre d'échange.`,
  TRADE_INVALID: (who, reason) => `Ton offre à ${who} est devenue invalide${reason ? ` (${reason})` : ""}.`,
  TRADE_EXPIRED: (who) => `Ton offre à ${who} a expiré sans réponse.`,
};

export default function NotificationsPage() {
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Notifications />
      </Suspense>
    </main>
  );
}

async function Notifications() {
  const user = await requireUser();
  const list = await listNotifications(user.id);
  return (
    <div className="vt-inner">
      <header>
        <h1 className="vt-title">Notifications</h1>
      </header>
      {list.some((n) => !n.read) && <MarkRead />}
      {list.length === 0 ? (
        <p className="vt-empty">Rien pour l&apos;instant.</p>
      ) : (
        <ul className="notif-list">
          {list.map((n) => (
            <li key={n.id} className={n.read ? "" : "unread"}>
              <Link href="/trades">{(TEXT[n.type] ?? (() => "Notification"))(n.payload.username ?? "Un joueur", n.payload.reason)}</Link>
              <time className="vt-muted">{dateFmt.format(n.createdAt)}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
