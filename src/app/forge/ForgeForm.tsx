"use client";
import { useActionState } from "react";
import { forgeAction } from "./actions";

export function ForgeForm({ cardId, disabled }: { cardId: string; disabled: boolean }) {
  const [message, action, pending] = useActionState(forgeAction, "");
  return <form action={action}>
    <input type="hidden" name="cardId" value={cardId} />
    <button className="ui-button" disabled={disabled || pending}>{pending ? "Forge…" : "Forger et équiper"}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
