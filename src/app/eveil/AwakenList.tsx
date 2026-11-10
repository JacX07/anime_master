"use client";

import { ResourceArt } from "@/components/ResourceArt";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CharacterCard, type CharacterCardProps } from "@/components/CharacterCard";
import { STAR_PERK } from "@/lib/awakening";
import { BATTLE } from "@/lib/battle";
import { awakenCardAction } from "../awaken-actions";
import styles from "./AwakenList.module.css";

export type AwakenRow = Omit<CharacterCardProps, "stars" | "serial" | "count" | "isNew" | "missing"> & {
  id: string;
  stars: number;
  cost: { key: string; name: string; quantity: number; have: number }[];
  /** Étoiles 4 et 5 : un doublon libre peut être consommé pour diviser le coût par 2 (`cost` = coût réduit) */
  duplicate: { available: number; cost: { key: string; name: string; quantity: number; have: number }[] } | null;
};

const pct = (n: number) => `+${Math.round(n * 100)} %`;
export function AwakenList({ rows }: { rows: AwakenRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  // Cartes pour lesquelles le joueur choisit de consommer un doublon
  const [useDup, setUseDup] = useState<Set<string>>(new Set());
  if (!rows.length) return <p className="vt-muted">Aucune carte à éveiller pour le moment.</p>;
  const awaken = (id: string, stars: number) =>
    start(async () => {
      const res = await awakenCardAction(id, stars, useDup.has(id));
      setMessage(res.ok ? null : res.error);
      router.refresh();
    });
  return (
    <div>
      {message && <p role="alert" className="vt-muted">{message}</p>}
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.5rem", listStyle: "none", padding: 0 }}>
        {rows.map(({ id, cost: fullCost, stars, duplicate, ...card }) => {
          const withDup = !!duplicate && duplicate.available > 0 && useDup.has(id);
          const cost = withDup ? duplicate!.cost : fullCost;
          const affordable = cost.every((c) => c.have >= c.quantity);
          return (
            <li key={id} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <CharacterCard {...card} stars={stars} />
              <small>
                {stars}★ → {stars + 1}★ : {pct(stars * BATTLE.starBonus)} → {pct((stars + 1) * BATTLE.starBonus)} ATK, DEF, PV
                {STAR_PERK[stars + 1] ? ` · ${STAR_PERK[stars + 1]}` : ""}
              </small>
              <small className="vt-muted">
                {cost.map((c) => <span key={c.key}><ResourceArt resource={c.key} size={24} />{c.quantity} {c.name} ({c.have}) </span>)}
              </small>
              {duplicate && <label className="awaken-dup"><input type="checkbox" disabled={!duplicate.available} checked={withDup} onChange={(e) => setUseDup((s) => { const n = new Set(s); if (e.target.checked) n.add(id); else n.delete(id); return n; })} /> Utiliser un doublon : cœurs −50 % ({duplicate.available} libre{duplicate.available > 1 ? "s" : ""})</label>}
              <button className={`${styles.awakenButton} ui-button`} type="button" disabled={!affordable || pending} onClick={() => awaken(id, stars)}>

                {affordable ? "Éveiller" : "Ressources insuffisantes"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
