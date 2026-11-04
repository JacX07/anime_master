"use client";

import { useState } from "react";
import { restartTutorial } from "@/app/tutorial-actions";

/** Relance le tutoriel en infobulles ; les actions déjà faites sont passées automatiquement. */
export function RestartTutorial() {
  const [pending, setPending] = useState(false);
  return <button type="button" className="ui-button text-action" disabled={pending} onClick={async () => {
    setPending(true);
    try { await restartTutorial(); window.dispatchEvent(new Event("tutorial:refresh")); } catch { /* base indisponible : le bouton redevient actif, le joueur peut réessayer */ } finally { setPending(false); }
  }}>{pending ? "Lancement…" : "Relancer le tutoriel"}</button>;
}
