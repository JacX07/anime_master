"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../icons";
import "./play-menu.css";

/** Destinations du menu « JOUER » (maquette « modes côte à côte » validée le 2026-11-16) : PvM à gauche, PvP à droite.
 *  Illustrations provisoires, faute d'image dédiée par mode. */
type Mode = { id: string; href: string; title: string; tag: string; description: string; icon: string; image: string; position?: string; main?: boolean };
const PVM: Mode[] = [
  { id: "story", href: "/histoire", title: "Mode histoire", tag: "Campagne", description: "Traverse les univers, dévoile les origines de la Faille et complète tes étoiles.", icon: "aventure", image: "/story-map/one-piece.png", position: "50% 30%", main: true },
  { id: "dungeons", href: "/donjons", title: "Donjons", tag: "Artefacts", description: "Affronte les gardiens et récupère les artefacts de chaque univers.", icon: "equipement", image: "/images/battle/citadelle.webp" },
  { id: "raids", href: "/raid", title: "Défi des empereurs", tag: "Coopération", description: "Traverse les vagues d’équipage, gagne les clés et ouvre le Hardcore.", icon: "ultime", image: "/api/illustrations/character-422", position: "50% 20%" },
  { id: "tower", href: "/tour", title: "Tour universelle", tag: "Endgame", description: "Gravis les étages et affronte des équipes toujours plus puissantes.", icon: "puissance", image: "/tower/scene.svg" },
  { id: "expeditions", href: "/expeditions", title: "Expéditions", tag: "Exploration", description: "Envoie tes compagnons explorer et récupère leurs récompenses.", icon: "aventure", image: "/images/backgrounds/accueil.webp" },
];
const PVP: Mode[] = [
  { id: "live", href: "/arene", title: "Arène live", tag: "Temps réel · classé", description: "Combat classé à quatre contre quatre : choisis tes sorts et tes cibles.", icon: "combat", image: "/api/illustrations/character-27", position: "50% 25%" },
];

/** Un panneau vertical : illustration, icône, catégorie, titre, description au survol, état et action. */
function ModePanel({ mode, lock, info, onPick }: { mode: Mode; lock?: string; info?: string; onPick?: () => void }) {
  return <Link href={mode.href} onClick={onPick} className={`pm-mode pm-mode-${mode.id}${mode.main ? " pm-main" : ""}`} data-locked={lock ? true : undefined} aria-disabled={lock ? true : undefined}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="pm-art" src={mode.image} alt="" loading="lazy" style={mode.position ? { objectPosition: mode.position } : undefined} />
    <Icon name={lock ? "lock" : mode.icon} className="pm-icon" />
    <small className="pm-tag">{mode.tag}</small>
    <h3>{mode.title}</h3>
    <p>{mode.description}</p>
    <span className="pm-state">
      <b>{lock ?? info ?? "Disponible"}</b>
      <em>{lock ? "Conditions ›" : mode.main ? "Continuer ›" : "Ouvrir ›"}</em>
    </span>
  </Link>;
}

/** Les modes côte à côte (PvM | PvP) : menu JOUER et page /jouer. */
export function ModeBoard({ locks = {}, info = {}, onPick }: { locks?: Record<string, string>; info?: Record<string, string>; onPick?: () => void }) {
  return <div className="pm-groups">
    <section className="pm-group pm-pvm" aria-label="PvM, contre le jeu">
      <h3 className="pm-group-title">PvM <small>Contre le jeu</small></h3>
      <div className="pm-row">{PVM.map((mode) => <ModePanel key={mode.id} mode={mode} lock={locks[mode.id]} info={info[mode.id]} onPick={onPick} />)}</div>
    </section>
    <section className="pm-group pm-pvp" aria-label="PvP, contre les joueurs">
      <h3 className="pm-group-title">PvP <small>Contre les joueurs</small></h3>
      <div className="pm-row">{PVP.map((mode) => <ModePanel key={mode.id} mode={mode} lock={locks[mode.id]} info={info[mode.id]} onPick={onPick} />)}</div>
    </section>
  </div>;
}

/** Bouton central « JOUER » de la barre et son écran de destinations. */
export function PlayMenu({ locks = {}, info = {} }: { locks?: Record<string, string>; info?: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [prev, setPrev] = useState(pathname);
  if (pathname !== prev) {
    setPrev(pathname);
    setOpen(false);
  }

  // Le tutoriel ouvre et referme ce menu pour présenter les modes.
  useEffect(() => {
    const onTutorial = (e: Event) => setOpen(!!(e as CustomEvent<{ open: boolean }>).detail?.open);
    window.addEventListener("tutorial:play", onTutorial);
    return () => window.removeEventListener("tutorial:play", onTutorial);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" className={`mq-play-button ${open ? "mq-active" : ""}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
        <i />
        <span>JOUER</span>
      </button>
      {open && createPortal(
        <div className="mq-app-shell mq-play-root"><div className="mq-play-overlay" onClick={() => setOpen(false)}>
          <div className="mq-play-menu pm-menu" role="dialog" aria-label="Choisir un mode de jeu" onClick={(e) => e.stopPropagation()}>
            <div className="mq-play-heading">
              <div>
                <p className="mq-eyebrow">CHOISISSEZ VOTRE DESTINATION</p>
                <h2>Comment voulez-vous jouer ?</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)}>Fermer ×</button>
            </div>
            <ModeBoard locks={locks} info={info} onPick={() => setOpen(false)} />
          </div>
        </div></div>,
        document.body,
      )}
    </>
  );
}
