"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const LABELS: Record<string, string> = {
  "": "Accueil", album: "Collection", wishlist: "Souhaits", character: "Personnage", packs: "Invocation", inventaire: "Inventaire", eveil: "Éveil", forge: "Forge",
  equipe: "Squads", quetes: "Quêtes", guide: "Guide", market: "Bourse", trades: "Échanges", friends: "Amis", guilds: "Guildes", leaderboard: "Classement",
  achievements: "Succès", histoire: "Histoire", donjons: "Donjons", raid: "Raid", expeditions: "Expéditions", arene: "Arène", duels: "Arène", tour: "Tour",
  u: "Profil", parametres: "Paramètres", notifications: "Notifications", combat: "Combat", changelog: "Mises à jour",
};

/**
 * Mini-barre (≥ 1500 px, validée le 2026-11-13, maquette public/mockups/barre-nav-auto.html) : toujours visible,
 * elle garde l'essentiel ; la barre complète se déploie par-dessus au survol (CSS, `.mq-minibar:hover ~ .mq-topbar`).
 */
export function MiniBar({ account }: { account: ReactNode }) {
  const segment = usePathname().split("/")[1] ?? "";
  // JOUER : le vrai bouton de la barre complète garde l'état du menu (tutoriel compris)
  const play = () => document.querySelector<HTMLButtonElement>(".mq-topbar .mq-play-button")?.click();
  return (
    <div className="mq-minibar">
      <span className="mq-mini-page">{LABELS[segment] ?? ""}</span>
      <span className="mq-mini-hint" aria-hidden="true">◆ Menu</span>
      <button type="button" className="mq-mini-play" onClick={play}>JOUER</button>
      {account}
    </div>
  );
}
