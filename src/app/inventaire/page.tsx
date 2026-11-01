import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { inventoryResources, type InventoryItem } from "@/lib/inventory";
import { weaponDef } from "@/lib/weapons";
import { InventoryGrid } from "./InventoryGrid";
import "./inventory-grid.css";
import { getArtifactInventory } from "@/lib/battles";
import { SLOT_NAMES, type ArtifactSlot } from "@/lib/dungeons";

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
  const [stock, armed, artifactInventory] = await Promise.all([
    prisma.resourceStock.findMany({ where: { userId: user.id } }),
    prisma.card.findMany({ where: { ownerId: user.id, weaponKey: { not: null } }, select: { id: true, serial: true, weaponKey: true, character: { select: { name: true } } } }),
    getArtifactInventory(user.id),
  ]);
  const equipment: InventoryItem[] = armed.flatMap((card) => {
    const weapon = weaponDef(card.weaponKey!);
    return weapon ? [{
      key: `weapon:${card.id}`, name: weapon.name, quantity: 1, categories: ["Équipement"], universe: "common",
      source: "Forge légendaire", description: `Équipée sur ${card.character.name} #${card.serial}. +10 % d’ATK, de DEF et de PV. ${weapon.passive} Cette arme reste liée à cet exemplaire.`,
      icon: "weapon", tone: "gold", links: [{ href: "/forge", label: "Voir à la forge" }],
    }] : [];
  });
  const artifacts: InventoryItem[] = artifactInventory.artifacts.map((artifact) => {
    const slot = SLOT_NAMES[artifact.slot as ArtifactSlot] ?? artifact.slot;
    const file = ({ CASQUE: "helmet", PLASTRON: "breastplate", GANTS: "gauntlets", BOTTES: "boots" } as const)[artifact.slot as ArtifactSlot];
    return {
      key: `artifact:${artifact.id}`, name: `${slot} des profondeurs`, quantity: 1, categories: ["Équipement"], universe: "one-piece",
      source: "Donjon One Piece", description: `Artefact ${slot.toLocaleLowerCase("fr")} du set marin. Niveau ${artifact.level}. ${artifact.equippedCard ? `Équipé sur ${artifact.equippedCard.character.name}.` : "À équiper sur une carte."}`,
      icon: "artifact", tone: "gold", image: `/images/artifacts/one-piece-${file ?? "helmet"}.webp`, links: [{ href: "/donjons", label: "Donjon One Piece" }],
      artifact: { id: artifact.id, slot: artifact.slot, rarity: artifact.rarity, mainStat: artifact.mainStat, mainValue: artifact.mainValue, subStats: artifact.subStats as { stat: string; value: number }[], level: artifact.level, equippedCard: artifact.equippedCard },
    };
  });
  return <InventoryGrid items={[...inventoryResources(stock), ...equipment, ...artifacts]} cards={artifactInventory.cards} />;
}
