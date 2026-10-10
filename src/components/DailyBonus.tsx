"use client";

import { useState, useTransition } from "react";
import { claimDailyBonusAction } from "@/app/economy-actions";
import { DAILY_BONUS } from "@/lib/economy";
import { Icon } from "./icons";

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
      className="daily-bonus"
    >
      <Icon name="bonus" style={{ "--acc": "#f2a516" } as React.CSSProperties} />
      {error ? "Réessayer" : `Bonus +${DAILY_BONUS}`}
    </button>
  );
}
