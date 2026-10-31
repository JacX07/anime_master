"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CharacterCard, type CharacterCardProps } from "@/components/CharacterCard";
import { BATTLE } from "@/lib/battle";
import { awakenCardAction } from "../awaken-actions";

export type AwakenRow = Omit<CharacterCardProps, "stars" | "serial" | "count" | "isNew" | "missing"> & {
  id: string;
  stars: number;
  cost: { name: string; quantity: number; have: number }[];
};

const pct = (n: number) => `+${Math.round(n * 100)} %`;

export function AwakenList({ rows }: { rows: AwakenRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  if (!rows.length) return <p className="vt-muted">Aucune carte à éveiller pour le moment.</p>;
  const awaken = (id: string) =>
    start(async () => {
      const res = await awakenCardAction(id);
      setMessage(res.ok ? null : res.error);
      if (res.ok) router.refresh();
    });
  return (
    <div>
      {message && <p role="alert" className="vt-muted">{message}</p>}
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.5rem", listStyle: "none", padding: 0 }}>
        {rows.map(({ id, cost, stars, ...card }) => {
          const affordable = cost.every((c) => c.have >= c.quantity);
          return (
            <li key={id} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <CharacterCard {...card} stars={stars} />
              <small>
                {stars}★ → {stars + 1}★ : {pct(stars * BATTLE.starBonus)} → {pct((stars + 1) * BATTLE.starBonus)} ATK, DEF, PV
                {stars + 1 === BATTLE.secondaryCdStar ? " · sort secondaire plus rapide" : ""}
              </small>
              <small className="vt-muted">{cost.map((c) => `${c.quantity} ${c.name} (${c.have})`).join(" + ")}</small>
              <button type="button" disabled={!affordable || pending} onClick={() => awaken(id)}>
                {affordable ? "Éveiller" : "Ressources insuffisantes"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
