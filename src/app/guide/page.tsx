import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getAdventure } from "@/lib/adventure-state";
import { prisma } from "@/lib/db";
import { guideSteps } from "@/lib/guide";
import { PageHeading } from "@/components/mq/PageHeading";
import "./guide.css";

export const metadata = { title: "Guide — Anime Masters", robots: { index: false } };

export default function GuidePage() {
  return <main className="vt"><div className="vt-inner guide-page">
    <PageHeading eyebrow="TUTORIEL" title="Guide" description="Toutes les étapes du jeu, dans l’ordre. Chaque étape indique où la trouver dans le menu." />
    <Suspense fallback={<p>Chargement du guide…</p>}><Steps /></Suspense>
  </div></main>;
}

async function Steps() {
  const user = await requireUser();
  const [adventure, cards] = await Promise.all([getAdventure(user.id), prisma.card.count({ where: { ownerId: user.id } })]);
  const steps = guideSteps({ adventure, cards });
  const tracked = steps.filter((s) => s.done !== null);
  const doneCount = tracked.filter((s) => s.done).length;
  const next = steps.find((s) => s.done === false && !s.locked);
  return <>
    <section className="guide-progress" aria-label="Progression du tutoriel">
      <div><b>{doneCount} / {tracked.length}</b> étapes accomplies<progress value={doneCount} max={tracked.length} aria-label="Étapes accomplies" /></div>
      {next && <p>Prochaine étape : <Link href={`#etape-${next.n}`}>{next.n}. {next.title}</Link></p>}
    </section>
    <ol className="guide-steps">
      {steps.map((s) => <li key={s.n} id={`etape-${s.n}`} data-state={s.done ? "done" : s.locked ? "locked" : s === next ? "next" : "todo"}>
        <span className="guide-num" aria-hidden="true">{s.n}</span>
        <div className="guide-body">
          <h2>{s.title}</h2>
          <p className="guide-where">Où : <b>{s.where}</b></p>
          <p>{s.what}</p>
          {s.locked && <p className="guide-lock">{s.locked}</p>}
        </div>
        <div className="guide-side">
          <small>{s.done ? "Fait ✓" : s.locked ? "Verrouillé" : s.done === false ? "À faire" : "À découvrir"}</small>
          {!s.locked && <Link className="ui-button" href={s.href}>Y aller</Link>}
        </div>
      </li>)}
    </ol>
  </>;
}
