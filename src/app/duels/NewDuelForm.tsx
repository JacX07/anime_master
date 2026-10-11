"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Point d'entrée : on saisit le pseudo de l'adversaire, puis on choisit son équipe. */
export function NewDuelForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [to, setTo] = useState("");
  return (
    <form
      className="trade-new"
      onSubmit={(e) => {
        e.preventDefault();
        const name = to.trim();
        if (name) router.push(`/duels/new?to=${encodeURIComponent(name)}`);
      }}
    >
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Pseudo de l'adversaire" aria-label="Pseudo de l'adversaire" maxLength={40} />
      <button type="submit" className="vt-btn" disabled={disabled}>
        {disabled ? "Plus de duel aujourd'hui" : "Défier"}
      </button>
    </form>
  );
}
