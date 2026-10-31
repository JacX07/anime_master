"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { awakenCardAction } from "../awaken-actions";

export type AwakenRow = {
  id: string; name: string; imageUrl: string | null; rarity: string; stars: number;
  cost: { name: string; quantity: number; have: number }[];
};

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
    <div className="inv">
      {message && <p role="alert" className="vt-muted">{message}</p>}
      <ul className="inv-list">
        {rows.map((r) => {
          const affordable = r.cost.every((c) => c.have >= c.quantity);
          return (
            <li key={r.id} className="inv-item" data-empty={!affordable || undefined}>
              <b>{r.name} <small>{r.rarity} · {r.stars}★ → {r.stars + 1}★</small></b>
              <span className="inv-n">{r.cost.map((c) => `${c.quantity} ${c.name}`).join(" + ")}</span>
              <button type="button" disabled={!affordable || pending} onClick={() => awaken(r.id)}>
                {affordable ? "Éveiller" : "Ressources insuffisantes"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
