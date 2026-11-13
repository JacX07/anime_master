import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { PageHeading } from "@/components/mq/PageHeading";
import { getAdventure } from "@/lib/adventure-state";
import type { AdventureMode } from "@/lib/adventure";
import { PVP_AVAILABLE, PVP_UNAVAILABLE_MESSAGE } from "@/lib/feature-flags";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Jouer — Anima Clash", robots: { index: false } };

const MODES: { href: string; title: string; icon: string; description: string; mode?: AdventureMode; quiz?: boolean }[] = [
  { href: "/donjons", title: "Donjons", icon: "equipement", description: "Affronte les gardiens et récupère les artefacts de chaque univers.", mode: "dungeon" },
  { href: "/raid/empereurs", title: "Défi des empereurs", icon: "ultime", description: "Traverse les vagues d’équipage, gagne les clés et ouvre le Hardcore.", mode: "raid" },
  { href: "/tour", title: "Tour multiverselle", icon: "puissance", description: "Gravis les étages et affronte des équipes toujours plus puissantes.", mode: "tower" },
  { href: "/expeditions", title: "Expéditions", icon: "aventure", description: "Envoie tes compagnons explorer et récupère leurs récompenses.", mode: "expeditions" },
  { href: "/arene", title: "Arène live", icon: "combat", description: "Combat classé à quatre contre quatre : choisis tes sorts et tes cibles." },
  { href: "/duels", title: "Duels quiz", icon: "duel", description: "Défie un joueur avec trois cartes et réponds au quiz à ton rythme.", quiz: true },
];

export default function PlayPage() {
  return <main className="vt"><Suspense fallback={<p className="vt-inner vt-muted" role="status">Chargement des modes…</p>}><PlayHub /></Suspense></main>;
}

async function PlayHub() {
  const user = await requireUser();
  const adventure = await getAdventure(user.id);
  const next = adventure.quests.find((quest) => quest.group === "Histoire" && quest.available && !quest.done);
  return <div className="vt-inner mobile-hub">
    <PageHeading eyebrow={`ARPENTEUR · NIVEAU ${adventure.level}`} title="Jouer" description="Choisis ton prochain défi. Prépare ton équipe avant d’entrer au combat." />
    <Link href="/histoire" className="mobile-mode mobile-mode-story">
      <Icon name="aventure" />
      <span className="mobile-mode-copy"><small>Campagne</small><h2>Mode histoire</h2><p>{next ? next.title : "Explore les univers, rejoue les combats et complète tes étoiles."}</p></span>
      <span className="mobile-mode-status">{next ? "Continuer" : "Explorer"} ›</span>
    </Link>
    <section aria-labelledby="mobile-modes-title">
      <h2 id="mobile-modes-title">Autres aventures</h2>
      <div className="mobile-mode-grid">{MODES.map((entry) => {
        const mode = adventure.modes.find((mode) => mode.key === entry.mode);
        const lock = entry.quiz && !PVP_AVAILABLE ? PVP_UNAVAILABLE_MESSAGE : mode && !mode.unlocked
          ? `Niveau ${mode.level} et ${mode.worlds === 2 ? "deuxième univers terminé" : mode.storyLevel === 15 ? "premier univers terminé" : `combat ${mode.storyLevel} de One Piece remporté`}.`
          : null;
        return <Link key={entry.href} href={entry.href} className="mobile-mode" data-mobile-mode={entry.mode ?? (entry.quiz ? "pvp" : "live")} data-locked={lock ? true : undefined}>
          <Icon name={lock ? "lock" : entry.icon} />
          <span className="mobile-mode-copy"><h2>{entry.title}</h2><p>{entry.description}</p>{lock && <small>{lock}</small>}</span>
          <span className="mobile-mode-status">{lock ? "Conditions" : "Ouvrir"} ›</span>
        </Link>;
      })}</div>
    </section>
    <Link href="/quetes" className="ui-button">Voir les objectifs et les déblocages</Link>
  </div>;
}
