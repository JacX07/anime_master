"use client";
import { useActionState } from "react";
import { forgeAction } from "./actions";

export function ForgeForm({ cardId, disabled, weapon, label }: { cardId: string; disabled: boolean; weapon?: string; label?: string }) {
  const [message, action, pending] = useActionState(forgeAction, "");
  return <form action={action}>
    <input type="hidden" name="cardId" value={cardId} />
    {weapon && <input type="hidden" name="weapon" value={weapon} />}
    <button className="ui-button" disabled={disabled || pending}>{pending ? "Forge…" : label ?? "Forger et équiper"}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
