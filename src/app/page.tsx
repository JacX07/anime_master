import { Suspense } from "react";
import { getSessionUser } from "@/lib/session";
import { getPlayerSummary } from "@/lib/summary";
import { readyCount } from "@/lib/expeditions";
import { MobileHome } from "@/components/mq/MobileHome";
import "./home-hub.css";

export const maxDuration = 60;

export default function Home() {
  return <main className="mq-main mq-home-main">
    <Suspense fallback={<p className="vt-inner vt-muted" role="status">Chargement de la Faille…</p>}><Content /></Suspense>
  </main>;
}

async function Content() {
  const user = await getSessionUser();
  if (!user) return <MobileHome user={null} />;
  const [summary, ready] = await Promise.all([getPlayerSummary(user.id), readyCount(user.id)]);
  return <MobileHome user={user} summary={summary} available={summary.packs.available} expeditionsReady={ready} />;
}
