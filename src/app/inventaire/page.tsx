import { getPlayerInventory } from "@/lib/player-inventory";
import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { InventoryGrid } from "./InventoryGrid";
import "./inventory-grid.css";

export const metadata: Metadata = { title: "Inventaire — Anime Masters", robots: { index: false } };

export default function InventoryPage() {
  return <main className="vt inventory-page"><div className="vt-inner">
    <header className="pg-head"><h1 className="inventory-title">Inventaire</h1>
      <p className="vt-sub">Tes trouvailles, tes matériaux et tes prochaines évolutions.</p>
    </header>
    <Suspense fallback={<p className="vt-muted">Ouverture de l’inventaire…</p>}><Items /></Suspense>
  </div></main>;
}

async function Items() {
  const user = await requireUser();
  const inventory = await getPlayerInventory(user.id);
  return <InventoryGrid {...inventory} />;
}
