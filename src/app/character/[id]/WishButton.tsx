"use client";

import { useState, useTransition } from "react";
import { addWishAction, removeWishAction } from "@/app/wishlist-actions";
import { FINISH_NAMES } from "@/lib/labels";

/** Ajout à la liste de souhaits (toute finition ou une finition précise) ; liste les souhaits existants pour ce personnage. */
export function WishButton({ characterId, wishes }: { characterId: number; wishes: { id: string; finish: string | null }[] }) {
  const [finish, setFinish] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await action();
      setError(r.ok ? null : (r.error ?? "Échec."));
    });
  return (
    <div className="sell-form">
      <select value={finish} onChange={(e) => setFinish(e.target.value)} aria-label="Finition souhaitée">
        <option value="">Toute finition</option>
        {Object.entries(FINISH_NAMES).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <button type="button" className="vt-btn" disabled={pending} onClick={() => run(() => addWishAction(characterId, finish || null))}>
        Ajouter à mes souhaits
      </button>
      {wishes.map((w) => (
        <button key={w.id} type="button" className="trade-tag" disabled={pending} onClick={() => run(() => removeWishAction(w.id))} title="Retirer">
          {w.finish ? FINISH_NAMES[w.finish as keyof typeof FINISH_NAMES] : "Toute finition"} ✕
        </button>
      ))}
      {error && <p role="alert" className="trade-error w-full">{error}</p>}
    </div>
  );
}
