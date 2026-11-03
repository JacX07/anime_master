"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Page de la maquette correspondant à l'URL : pilote les décors par page (`.mq-app-shell[data-page]`). */
export function pageKey(path: string) {
  const p = path.split("/")[1] ?? "";
  if (p === "") return "home";
  if (["album", "packs", "wishlist", "character"].includes(p)) return "collection";
  if (["inventaire", "forge", "eveil"].includes(p)) return "inventory";
  if (["equipe", "builder"].includes(p)) return "team";
  if (["market", "trades"].includes(p)) return "market";
  if (["u", "profil", "achievements"].includes(p)) return "profile";
  if (p === "quetes" || p === "guide") return "quests";
  if (p === "leaderboard") return "ranking";
  if (p === "histoire") return "story";
  if (p === "donjons") return "dungeons";
  if (p === "raid") return "raids";
  if (p === "expeditions") return "expeditions";
  if (p === "duels") return "pvp";
  if (p === "tour") return "tower";
  return p;
}

/** Enveloppe de toutes les pages : fond, ambiance et décor mythologique de la maquette, puis la barre du haut et la page. */
export function AppShell({ header, children }: { header: ReactNode; children: ReactNode }) {
  const page = pageKey(usePathname());
  return (
    <div className="mq-app-shell" data-page={page}>
      <div className="mq-ambient-fx" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => <i key={index} />)}
      </div>
      <div className="mq-page-mythology" aria-hidden="true">
        <div className="mq-lore-system">
          <div className="mq-lore-ring mq-lore-ring-a">
            {Array.from({ length: 20 }, (_, index) => <i key={index} style={{ "--lore-tick": `${index * 18}deg` } as React.CSSProperties} />)}
          </div>
          <div className="mq-lore-ring mq-lore-ring-b" />
          <div className="mq-lore-ring mq-lore-ring-c" />
          <span className="mq-lore-axis mq-lore-axis-x" />
          <span className="mq-lore-axis mq-lore-axis-y" />
          <div className="mq-lore-shape" />
          <div className="mq-lore-glyph" />
          <small className="mq-lore-name" />
          <small className="mq-lore-code" />
          <div className="mq-lore-nodes">
            {Array.from({ length: 7 }, (_, index) => <b key={index} />)}
          </div>
        </div>
      </div>
      {header}
      <div className="mq-page">{children}</div>
    </div>
  );
}
