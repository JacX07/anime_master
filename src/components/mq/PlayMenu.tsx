"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../icons";

/** Les sept destinations de l'écran « Comment voulez-vous jouer ? » (maquette). */
const MODES = [
  { id: "story", href: "/histoire", title: "Mode histoire", tag: "Campagne", description: "Traversez les royaumes et dévoilez les origines de la Faille.", symbol: "◇" },
  { id: "dungeons", href: "/donjons", title: "Donjons", tag: "1–3 joueurs", description: "Affrontez des gardiens et récupérez des reliques rares.", symbol: "⌁" },
  { id: "raids", href: "/raid", title: "Raids", tag: "Coopération", description: "Défi des empereurs : Shanks, Big Mom, Kaido, Barbe Blanche.", symbol: "△" },
  { id: "expeditions", href: "/expeditions", title: "Expéditions", tag: "Exploration", description: "Envoyez vos squads à la recherche de ressources.", symbol: "✦" },
  { id: "pvp", href: "/duels", title: "Arène PvP", tag: "Classé", description: "Mesurez votre deck aux invocateurs du monde entier.", symbol: "×" },
  { id: "live", href: "/arene", title: "Arène Live", tag: "Temps réel", description: "Des duels directs où chaque décision compte.", symbol: "◉" },
  { id: "tower", href: "/tour", title: "Tour universelle", tag: "Endgame", description: "Gravissez cent étages aux règles changeantes.", symbol: "▥" },
] as const;

/** Bouton central « JOUER » de la barre et son écran de destinations. */
export function PlayMenu({ locks = {} }: { locks?: Record<string, string> }) {
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
          <div className="mq-play-menu" role="dialog" aria-label="Choisir un mode de jeu" onClick={(e) => e.stopPropagation()}>
            <div className="mq-play-heading">
              <div>
                <p className="mq-eyebrow">CHOISISSEZ VOTRE DESTINATION</p>
                <h2>Comment voulez-vous jouer ?</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)}>Fermer ×</button>
            </div>
            <div className="mq-mode-grid">
              {MODES.map((mode) => (
                <Link href={mode.href} className={`mq-mode-card mq-mode-${mode.id}${locks[mode.id] ? " mq-mode-locked" : ""}`} key={mode.id} aria-disabled={locks[mode.id] ? true : undefined}>
                  <span className="mq-mode-symbol">{mode.symbol}</span>
                  <small>{mode.tag}</small>
                  <h3>{mode.title}</h3>
                  <p>{mode.description}</p>
                  {locks[mode.id] ? <i className="mq-mode-lock"><Icon name="lock" />{locks[mode.id]}</i> : <i>Explorer →</i>}
                </Link>
              ))}
            </div>
          </div>
        </div></div>,
        document.body,
      )}
    </>
  );
}
