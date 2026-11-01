import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { inventoryResources, type InventoryItem } from "@/lib/inventory";
import { weaponDef } from "@/lib/weapons";
import { InventoryGrid } from "./InventoryGrid";
import "./inventory-grid.css";
import { getArtifactInventory } from "@/lib/battles";
import { ArtifactArmory } from "./ArtifactArmory";
import "../donjons/donjons.css";

export const metadata: Metadata = { title: "Inventaire — Anime Masters", robots: { index: false } };

export default function InventoryPage() {
  return <main className="vt inventory-page"><div className="vt-inner">
    <header className="pg-head"><h1 className="inventory-title">Inventaire</h1>
      <p className="vt-sub">Tes trouvailles, tes matériaux et tes prochaines évolutions.</p>
    </header>
    <Suspense fallback={<p className="vt-muted">Ouverture de l’inventaire…</p>}><Items /></Suspense>
    <Suspense fallback={<p className="vt-muted">Chargement des artefacts…</p>}><Artifacts /></Suspense>
  </div></main>;
}

async function Artifacts() {
  const user = await requireUser();
  const { artifacts, cards } = await getArtifactInventory(user.id);
  return <ArtifactArmory artifacts={artifacts.map((a) => ({ id: a.id, slot: a.slot, rarity: a.rarity, mainStat: a.mainStat, mainValue: a.mainValue, subStats: a.subStats as { stat: string; value: number }[], level: a.level, equippedCard: a.equippedCard }))} cards={cards} />;
}

async function Items() {
  const user = await requireUser();
  const [stock, armed] = await Promise.all([
    prisma.resourceStock.findMany({ where: { userId: user.id } }),
    prisma.card.findMany({ where: { ownerId: user.id, weaponKey: { not: null } }, select: { id: true, serial: true, weaponKey: true, character: { select: { name: true } } } }),
  ]);
  const equipment: InventoryItem[] = armed.flatMap((card) => {
    const weapon = weaponDef(card.weaponKey!);
    return weapon ? [{
      key: `weapon:${card.id}`, name: weapon.name, quantity: 1, categories: ["Équipement"], universe: "common",
      source: "Forge légendaire", description: `Équipée sur ${card.character.name} #${card.serial}. +10 % d’ATK, de DEF et de PV. ${weapon.passive} Cette arme reste liée à cet exemplaire.`,
      icon: "weapon", tone: "gold", links: [{ href: "/forge", label: "Voir à la forge" }],
    }] : [];
  });
  return <InventoryGrid items={[...inventoryResources(stock), ...equipment]} />;
}
