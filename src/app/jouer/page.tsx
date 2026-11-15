import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeading } from "@/components/mq/PageHeading";
import { ModeBoard } from "@/components/mq/PlayMenu";
import { getAdventure } from "@/lib/adventure-state";
import { playModeState } from "@/lib/play-modes";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Jouer — Anima Clash", robots: { index: false } };

export default function PlayPage() {
  return <main className="vt"><Suspense fallback={<p className="vt-inner vt-muted" role="status">Chargement des modes…</p>}><PlayHub /></Suspense></main>;
}

/** Mêmes panneaux que le menu JOUER (PvM | PvP), validés le 2026-11-16. */
async function PlayHub() {
  const user = await requireUser();
  const [adventure, { locks, info }] = await Promise.all([getAdventure(user.id), playModeState(user.id)]);
  return <div className="vt-inner play-page">
    <PageHeading eyebrow={`ARPENTEUR · NIVEAU ${adventure.level}`} title="Jouer" description="Choisis ton prochain défi. Prépare ton équipe avant d’entrer au combat." />
    <ModeBoard locks={locks} info={info} />
    <Link href="/quetes" className="ui-button play-page-goals">Voir les objectifs et les déblocages</Link>
  </div>;
}
