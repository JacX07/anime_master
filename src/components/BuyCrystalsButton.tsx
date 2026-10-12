"use client";

import { useState, useTransition } from "react";
import { buyCrystalsAction } from "@/app/packs/actions";
import { Money } from "./icons";

const LOT = 5;

interface Props {
  /** Prix d'un cristal */
  price: number;
  /** Cristaux encore achetables aujourd'hui */
  left: number;
  balance: number;
  /** Cristaux en réserve */
  available: number;
}

/** Achat de 5 cristaux avec des Ryō ; la page se rafraîchit toute seule avec le nouveau solde. */
export function BuyCrystalsButton({ price, left, balance, available }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const cost = price * LOT;
  const blocked = left < LOT ? "Limite d'achats atteinte pour aujourd'hui" : balance < cost ? "Pas assez de Ryō" : null;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending || blocked !== null}
        onClick={() =>
          start(async () => {
            const r = await buyCrystalsAction(LOT);
            setError(r.ok ? null : r.error);
          })
        }
        className="rounded-xl bg-amber-400/90 px-4 py-2 text-sm font-bold text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {pending ? "Achat…" : (<>Acheter {LOT} cristaux · <Money n={cost} /></>)}
      </button>
      <p className="text-xs text-muted" role={error ? "alert" : undefined}>
        {error ?? blocked ?? `${left} cristal${left > 1 ? "ux" : ""} achetable${left > 1 ? "s" : ""} aujourd'hui`} · {available} cristal{available > 1 ? "ux" : ""} en réserve
      </p>
    </div>
  );
}
