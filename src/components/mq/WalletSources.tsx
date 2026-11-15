"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { CRYSTAL_INTERVAL_MS, MAX_CRYSTALS } from "@/lib/crystal-stock";

type Source = { href: string; icon: string; label: string; detail: string };

// Sources réelles des gains (journal Ryō `LedgerReason`, appels à `afterGain` pour les cristaux).
const SOURCES: Record<"ryo" | "crystals", { title: string; note?: string; items: Source[] }> = {
  ryo: {
    title: "Gagner des Ryō",
    items: [
      { href: "/histoire", icon: "combat", label: "Histoire et Tour", detail: "Récompenses de combat" },
      { href: "/expeditions", icon: "aventure", label: "Expéditions", detail: "Butin au retour" },
      { href: "/duels", icon: "duel", label: "Duels", detail: "Victoires contre d’autres joueurs" },
      { href: "/market", icon: "nav-marche", label: "Marché", detail: "Vends tes cartes aux enchères" },
      { href: "/album", icon: "vendre", label: "Vente rapide", detail: "Revends tes doublons" },
      { href: "/achievements", icon: "classement", label: "Succès", detail: "Récompenses de progression" },
    ],
  },
  crystals: {
    title: "Obtenir des cristaux",
    note: `+1 toutes les ${CRYSTAL_INTERVAL_MS / 60000} minutes, jusqu’à ${MAX_CRYSTALS}.`,
    items: [
      { href: "/album", icon: "ryo", label: "Achat contre des Ryō", detail: "Depuis ta collection" },
      { href: "/quetes", icon: "quetes", label: "Quêtes", detail: "Du jour et de la semaine" },
      { href: "/achievements", icon: "classement", label: "Succès", detail: "Selon leur palier" },
      { href: "/expeditions", icon: "aventure", label: "Expéditions", detail: "Butin au retour" },
      { href: "/histoire", icon: "etoile", label: "Étoiles de l’Histoire", detail: "Paliers d’étoiles des univers" },
    ],
  },
};

/** Bouton « + » d'une ressource : liste les endroits où l'obtenir. */
export function WalletSources({ kind }: { kind: "ryo" | "crystals" }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const source = SOURCES[kind];
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key); };
  }, [open]);
  return <span className="wallet-sources" ref={root}>
    <button ref={button} type="button" aria-label={source.title} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>+</button>
    {open && <span className="wallet-sources-panel" id={panelId} role="group" aria-label={source.title}>
      <span className="wallet-sources-title">{source.title}</span>
      {source.note && <span className="wallet-sources-note">{source.note}</span>}
      {source.items.map((item) => <Link key={item.label} href={item.href} onClick={() => setOpen(false)}><Icon name={item.icon} /><span><strong>{item.label}</strong><em>{item.detail}</em></span></Link>)}
    </span>}
  </span>;
}
