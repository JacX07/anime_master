import { prisma } from "./db";
import { inventoryResources, type InventoryItem } from "./inventory";
import { weaponDef } from "./weapons";
import { getArtifactInventory } from "./battles";
import { SLOT_NAMES, type ArtifactSlot } from "./dungeons";

export async function getPlayerInventory(userId: string) {
  const [stock, armed, artifactInventory] = await Promise.all([
    prisma.resourceStock.findMany({ where: { userId: userId } }),
    prisma.card.findMany({ where: { ownerId: userId, weaponKey: { not: null } }, select: { id: true, serial: true, weaponKey: true, character: { select: { name: true } } } }),
    getArtifactInventory(userId),
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
  return { items: [...inventoryResources(stock), ...equipment, ...artifacts], cards: artifactInventory.cards };
}
