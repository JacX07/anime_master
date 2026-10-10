"use client";

import { useState, useTransition } from "react";
import { claimDailyBonusAction } from "@/app/economy-actions";
import { DAILY_BONUS } from "@/lib/economy";

/** Bouton du bonus quotidien dans le menu : disparaît une fois réclamé (la page se rafraîchit avec le nouveau solde). */
export function DailyBonus() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <button
      type="button"
      disabled={pending}
      title={error ?? "Réclame ton bonus du jour"}
      onClick={() =>
        start(async () => {
          const r = await claimDailyBonusAction();
          setError(r.ok ? null : r.error);
        })
      }
      className="daily-bonus rounded-full bg-amber-400/90 px-3 py-1 text-xs font-bold text-black hover:bg-amber-300 disabled:opacity-60"
    >
      {error ? "Réessayer" : `Bonus du jour +${DAILY_BONUS}`}
    </button>
  );
}
