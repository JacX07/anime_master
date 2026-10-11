import Link from "next/link";
import { unreadCount } from "@/lib/notifications";
import { Icon } from "./icons";

/** Cloche du menu : lien vers les notifications, avec le nombre de non lues. Lit la base : derrière un <Suspense>. */
export async function NotificationBell({ userId }: { userId: string }) {
  const n = await unreadCount(userId);
  return (
    <Link href="/notifications" className="res-item bell" title={n ? `${n} notification${n > 1 ? "s" : ""} non lue${n > 1 ? "s" : ""}` : "Notifications"}>
      <Icon name="cloche" />
      {n > 0 && <span className="album-badge">{n > 99 ? "99+" : n}</span>}
    </Link>
  );
}
