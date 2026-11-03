import Link from "next/link";
import type { AdventureMode } from "@/lib/adventure";
import { adventureLock } from "@/lib/adventure-state";
import { PVP_AVAILABLE, PVP_UNAVAILABLE_MESSAGE } from "@/lib/feature-flags";

export async function modeLockPanel(userId: string, mode: AdventureMode) {
  const message = await adventureLock(userId, mode);
  return message ? <div className="vt-inner"><header className="pg-head"><h1 className="vt-title">Un passage encore instable</h1><p className="vt-sub">{message}</p></header><p>Ton empreinte se renforce à chaque nouvelle étape de l’histoire. Le carnet t’indique le chemin.</p><Link href="/quetes" className="site-cta">Ouvrir les Quêtes</Link></div> : null;
}

/** Arène PvP et Arène live : panneau « pas encore disponible » tant que le contenu est fermé. */
export function pvpClosedPanel() {
  return PVP_AVAILABLE ? null : <div className="vt-inner"><header className="pg-head"><h1 className="vt-title">Pas encore disponible</h1><p className="vt-sub">{PVP_UNAVAILABLE_MESSAGE}</p></header><Link href="/" className="site-cta">Retour à l’accueil</Link></div>;
}
