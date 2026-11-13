import { Suspense } from "react";
import { PageHeading } from "@/components/mq/PageHeading";
import { listBanners, poolCounts } from "@/lib/banners";
import { readyCount } from "@/lib/expeditions";
import { getPackState } from "@/lib/packs";
import { requireUser } from "@/lib/session";
import { PackOpener } from "./PackOpener";

export const metadata = { title: "Invocation — Anima Clash", robots: { index: false } };
export const maxDuration = 60;

export default function PacksPage() {
  return <main className="vt invocation-page"><div className="vt-inner">
    <PageHeading eyebrow="LA FAILLE PRIMORDIALE" title="Invocation" description="Choisis ta bannière et découvre tes prochaines légendes." />
    <Suspense fallback={<p className="vt-muted">Chargement des bannières…</p>}><Invocation /></Suspense>
  </div></main>;
}

async function Invocation() {
  const user = await requireUser();
  const state = await getPackState(user.id);
  const [banners, standardPool, ready] = await Promise.all([listBanners(state), poolCounts(), readyCount(user.id)]);
  return <PackOpener initialState={state} banners={banners} standardPool={standardPool} expeditionsReady={ready} />;
}
