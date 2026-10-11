"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Point d'entrée : on saisit le pseudo du joueur, puis on compose l'offre. */
export function NewTradeForm() {
  const router = useRouter();
  const [to, setTo] = useState("");
  return (
    <form
      className="trade-new"
      onSubmit={(e) => {
        e.preventDefault();
        const name = to.trim();
        if (name) router.push(`/trades/new?to=${encodeURIComponent(name)}`);
      }}
    >
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Pseudo du joueur" aria-label="Pseudo du joueur" maxLength={40} />
      <button type="submit" className="vt-btn">
        Proposer un échange
      </button>
    </form>
  );
}
