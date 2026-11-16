import { Suspense } from "react";
import { PageHeading } from "@/components/mq/PageHeading";
import { getReleases } from "@/lib/releases";
import { ReleaseHistory } from "./ReleaseHistory";

export const metadata = { title: "Mises à jour — Anima Clash" };

async function History() {
  return <ReleaseHistory releases={await getReleases(true)} />;
}

export default function ChangelogPage() {
  return <main className="vt"><div className="vt-inner changelog-page">
    <PageHeading eyebrow="LA CHRONIQUE D'ANIMA CLASH" title="Mises à jour" description="La prochaine mise à jour, les nouveaux sorts, l'équilibrage et l'historique du jeu." />
    <Suspense fallback={<p className="vt-muted">Chargement des mises à jour…</p>}><History /></Suspense>
    <p className="release-hint">Toutes les mises à jour restent consultables ici.</p>
  </div></main>;
}
