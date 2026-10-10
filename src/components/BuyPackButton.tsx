"use client";

import { useState, useTransition } from "react";
import { buyPackAction } from "@/app/packs/actions";

interface Props {
  price: number;
  /** Achats restants aujourd'hui */
  left: number;
  balance: number;
  /** Paquets en réserve */
  available: number;
}

const num = new Intl.NumberFormat("fr-FR");

/** Achat d'un paquet avec des Ryō ; la page se rafraîchit toute seule avec le nouveau solde. */
export function BuyPackButton({ price, left, balance, available }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const blocked = left < 1 ? "Limite d'achats atteinte pour aujourd'hui" : balance < price ? "Pas assez de Ryō" : null;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending || blocked !== null}
        onClick={() =>
          start(async () => {
            const r = await buyPackAction();
            setError(r.ok ? null : r.error);
          })
        }
        className="rounded-xl bg-amber-400/90 px-4 py-2 text-sm font-bold text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {pending ? "Achat…" : `Acheter un paquet · ${num.format(price)} 両`}
      </button>
      <p className="text-xs text-muted" role={error ? "alert" : undefined}>
        {error ?? blocked ?? `${left} achat${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""} aujourd'hui`} · {available} paquet{available > 1 ? "s" : ""} en réserve
      </p>
    </div>
  );
}
