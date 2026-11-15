"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icons";

/** JOUER de la barre fine : ouvre le menu des modes de la barre complète (un seul menu, que le tutoriel pilote aussi). */
export function SlimPlay() {
  return <button type="button" className="mq-slim-play" onClick={() => document.querySelector<HTMLButtonElement>(".mq-topbar .mq-play-button")?.click()}>JOUER</button>;
}

type Entry = { href: string; icon: string; label: string; match?: string[]; badge?: number; info?: string };

/** Panneau « Menu » de la barre fine : toutes les pages du jeu, par groupes (maquette barre-fine, variante B, 2026-11-15). */
export function MenuPanel({ quests = 0, achievements = 0, expeditions = 0 }: { quests?: number; achievements?: number; expeditions?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prev, setPrev] = useState(pathname);
  if (pathname !== prev) { setPrev(pathname); setOpen(false); }
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  const groups: { title: string; items: Entry[] }[] = [
    { title: "Jouer", items: [
      { href: "/histoire", icon: "combat", label: "Histoire" },
      { href: "/donjons", icon: "broken-shield", label: "Donjons" },
      { href: "/raid", icon: "ultime", label: "Raids" },
      { href: "/tour", icon: "classement", label: "Tour" },
      { href: "/arene", icon: "duel", label: "Arène" },
      { href: "/expeditions", icon: "aventure", label: "Expéditions", info: expeditions ? `${expeditions} prête${expeditions > 1 ? "s" : ""}` : undefined },
    ] },
    { title: "Cartes", items: [
      { href: "/album", icon: "collection", label: "Collection", match: ["/character"] },
      { href: "/wishlist", icon: "souhait", label: "Souhaits" },
      { href: "/packs", icon: "paquet", label: "Invocation" },
      { href: "/equipe", icon: "squads", label: "Squads", match: ["/builder"] },
    ] },
    { title: "Progression", items: [
      { href: "/inventaire", icon: "equipement", label: "Inventaire" },
      { href: "/eveil", icon: "eveil", label: "Éveil" },
      { href: "/forge", icon: "forge", label: "Forge" },
      { href: "/quetes", icon: "quetes", label: "Quêtes", badge: quests },
      { href: "/achievements", icon: "etoile", label: "Succès", badge: achievements },
    ] },
    { title: "Échanges et social", items: [
      { href: "/market", icon: "nav-marche", label: "Marché" },
      { href: "/trades", icon: "echange", label: "Échanges" },
      { href: "/friends", icon: "coeur", label: "Amis" },
      { href: "/guilds", icon: "squads", label: "Guildes" },
      { href: "/leaderboard", icon: "nav-classement", label: "Classement" },
    ] },
    { title: "Aide", items: [
      { href: "/guide", icon: "lecture", label: "Guide du jeu" },
      { href: "/changelog", icon: "cloche", label: "Mises à jour" },
      { href: "/parametres", icon: "parametres", label: "Paramètres" },
    ] },
  ];
  const total = quests + achievements;
  const current = (entry: Entry) => [entry.href, ...(entry.match ?? [])].some((m) => pathname === m || pathname.startsWith(`${m}/`));
  return <>
    <button ref={button} type="button" className="mq-slim-menu" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
      <span aria-hidden="true">◆</span>Menu{total > 0 && <span className="mq-slim-badge" aria-label={`${total} récompense${total > 1 ? "s" : ""} à récupérer`}>{total}</span>}
    </button>
    <div className="mq-menu-veil" data-open={open || undefined} aria-hidden="true" onClick={() => setOpen(false)} />
    <div className="mq-menu-panel" id={panelId} data-open={open || undefined} hidden={!open} role="dialog" aria-label="Menu">
      {groups.map((group) => <div className="mq-menu-group" key={group.title}>
        <h3>{group.title}</h3>
        {group.items.map((entry) => <Link key={entry.href} href={entry.href} aria-current={current(entry) ? "page" : undefined} onClick={() => setOpen(false)}>
          <Icon name={entry.icon} />{entry.label}
          {!!entry.badge && <span className="mq-slim-badge">{entry.badge}</span>}
          {entry.info && <span className="mq-menu-info">{entry.info}</span>}
        </Link>)}
      </div>)}
      <p className="mq-menu-foot"><span>Toutes les pages du jeu</span><span>Fermer : Échap ou clic à côté</span></p>
    </div>
  </>;
}
