import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SceneBody } from "@/components/SceneBody";
import { PageHeading } from "@/components/mq/PageHeading";
import { devToolsEnabled } from "@/lib/dev-tools";
import { requireUser } from "@/lib/session";
import "./outils.css";

export const metadata: Metadata = { title: "Outils — Anime Masters", robots: { index: false } };

const TOOLS = [
  { href: "/admin", title: "Administration", text: "Joueurs, économie, statistiques et journal des événements. Réservé aux modérateurs et administrateurs." },
  { href: "/dev", title: "Outils de test", text: "Dons de cartes, niveaux, ressources et progression sur ton compte, en base de dev." },
  { href: "/builder", title: "Spell Builder", text: "Écrire et simuler les sorts des personnages SSR et UR. Écrit sur le disque." },
  { href: "/illustrations", title: "Illustrations", text: "Donner à chaque carte, ressource et arme son illustration. Écrit sur le disque." },
];

/** Outils de développement : 404 en production (même garde que /dev et le Spell Builder). */
export default function ToolsPage() {
  if (!devToolsEnabled()) notFound();
  return (
    <main className="vt">
      <SceneBody night scroll />
      <Suspense fallback={<p className="vt-inner vt-muted">Chargement…</p>}>
        <Tools />
      </Suspense>
    </main>
  );
}

async function Tools() {
  await requireUser();
  return (
    <div className="vt-inner">
      <PageHeading eyebrow="ATELIER" title="Outils" description="Outils de développement : disponibles seulement en local, absents de la production." />
      <ul className="tools-list">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <div><h2>{t.title}</h2><p>{t.text}</p></div>
            <Link className="ui-button" href={t.href}>Ouvrir</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
