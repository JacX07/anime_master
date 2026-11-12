"use client";
import { useRef, useState, useTransition } from "react";
import { fxReward } from "@/lib/fx";
import { useRouter } from "next/navigation";
import { claimAchievementAction } from "./actions";

/** « Récupérer » (un succès) ou « Tout récupérer » (plusieurs). Relance l'affichage une fois la récompense versée. */
export function ClaimButton({ keys, label = "Récupérer" }: { keys: string[]; label?: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const claim = () => start(async () => {
    setError(null);
    const at = button.current?.getBoundingClientRect();
    let got = 0;
    for (const key of keys) {
      const r = await claimAchievementAction(key);
      if (!r.ok) { setError(r.error); break; }
      got++;
    }
    if (got) fxReward(at, got > 1 ? `${got} récompenses récupérées` : "Récompense récupérée", "Ryō et cristaux ajoutés.");
    router.refresh();
  });
  return (
    <>
      <button ref={button} type="button" className="claim-button" disabled={busy} onClick={claim}><span aria-hidden="true" className="claim-dot" />{label}</button>
      {error && <span role="alert" className="vt-muted">{error}</span>}
    </>
  );
}
