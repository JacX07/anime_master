"use client";
import { useActionState, useEffect, useRef } from "react";
import { fxBurst, fxFlash, fxShake, fxToast } from "@/lib/fx";
import { forgeAction } from "./actions";

const FORGED = "Arme forgée et équipée.";

export function ForgeForm({ cardId, disabled, weapon, label, weaponName }: { cardId: string; disabled: boolean; weapon?: string; label?: string; weaponName?: string }) {
  const [message, action, pending] = useActionState(forgeAction, "");
  const button = useRef<HTMLButtonElement>(null);
  // Arme forgée : flash, secousse, étincelles depuis l'arme affichée et notification (lot 4)
  useEffect(() => {
    if (message !== FORGED) return;
    fxFlash();
    fxShake();
    fxBurst(document.querySelector(".fg-art img") ?? button.current, 90);
    fxToast(weaponName ? `${weaponName} forgée` : "Arme forgée", "Équipée sur la carte choisie.", weapon ? `/images/weapons/${weapon}.webp` : undefined);
  }, [message, weapon, weaponName]);
  return <form action={action}>
    <input type="hidden" name="cardId" value={cardId} />
    {weapon && <input type="hidden" name="weapon" value={weapon} />}
    <button ref={button} className="ui-button" disabled={disabled || pending}>{pending ? "Forge…" : label ?? "Forger et équiper"}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
