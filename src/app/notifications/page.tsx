import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { listNotifications, type NotificationType } from "@/lib/notifications";
import { requireUser } from "@/lib/session";
import { MarkRead } from "./MarkRead";

export const metadata: Metadata = { title: "Notifications — Anime Masters" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

type Payload = Awaited<ReturnType<typeof listNotifications>>[number]["payload"];
const ryo = (n?: number) => `${n ?? 0} Ryō`;
const TEXT: Record<NotificationType, (p: Payload) => string> = {
  TRADE_RECEIVED: (p) => `${p.username} t'a envoyé une offre d'échange.`,
  TRADE_ACCEPTED: (p) => `${p.username} a accepté ton offre d'échange.`,
  TRADE_REFUSED: (p) => `${p.username} a refusé ton offre d'échange.`,
  TRADE_INVALID: (p) => `Ton offre à ${p.username} est devenue invalide${p.reason ? ` (${p.reason})` : ""}.`,
  TRADE_EXPIRED: (p) => `Ton offre à ${p.username} a expiré sans réponse.`,
  OUTBID: (p) => `Ton offre de ${ryo(p.amount)} sur ${p.character} a été dépassée (Ryō remboursés).`,
  AUCTION_WON: (p) => `Tu as remporté ${p.character} pour ${ryo(p.amount)}.`,
  CARD_SOLD: (p) => `${p.character} est vendu : tu reçois ${ryo(p.amount)} (taxe de 5 % déduite).`,
  WISHED_AVAILABLE: (p) => (p.source === "auction" ? `${p.character}, dans ta liste de souhaits, vient d'être mis aux enchères.` : `${p.username} propose ${p.character} (ta liste de souhaits) à l'échange.`),
  AUCTION_UNSOLD: (p) => `Ton enchère sur ${p.character} s'est terminée sans offre : la carte est revenue dans ton album.`,
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
              <Link href={n.payload.auctionId ? `/market/${n.payload.auctionId}` : n.payload.characterId ? `/character/${n.payload.characterId}` : "/trades"}>{(TEXT[n.type] ?? (() => "Notification"))(n.payload)}</Link>
              <time className="vt-muted">{dateFmt.format(n.createdAt)}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
