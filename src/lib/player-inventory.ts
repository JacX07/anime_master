import { artifactRarity, ONE_PIECE_ARTIFACT_NAMES } from "./artifact-display";
import { prisma } from "./db";
import { inventoryResources, type InventoryItem } from "./inventory";
import { weaponDef } from "./weapons";
import { getArtifactInventory } from "./battles";
import { dungeonOf, SLOT_NAMES, type ArtifactSlot } from "./dungeons";

export async function getPlayerInventory(userId: string) {
  const [stock, armed, artifactInventory, wallet] = await Promise.all([
    prisma.resourceStock.findMany({ where: { userId: userId } }),
    prisma.card.findMany({ where: { ownerId: userId, weaponKey: { not: null } }, select: { id: true, serial: true, weaponKey: true, character: { select: { name: true } } } }),
    getArtifactInventory(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true } }),
  ]);
  const equipment: InventoryItem[] = armed.flatMap((card) => {
    const weapon = weaponDef(card.weaponKey!);
    return weapon ? [{
      key: `weapon:${card.id}`, equippedBy: { id: card.id, name: card.character.name }, name: weapon.name, quantity: 1, categories: ["Équipement"], universe: "common",
      source: "Forge légendaire", description: `Équipée sur ${card.character.name} #${card.serial}. +10 % d’ATK, de DEF et de PV. ${weapon.passive} Cette arme reste liée à cet exemplaire.`,
      icon: "weapon", tone: "gold", links: [{ href: "/forge", label: "Voir à la forge" }],
    }] : [];
  });
  const artifacts: InventoryItem[] = artifactInventory.artifacts.map((artifact) => {
    const dungeon = dungeonOf(artifact.setKey);
    const universe = dungeon?.universe ?? artifact.setKey;
    const slot = SLOT_NAMES[artifact.slot as ArtifactSlot] ?? artifact.slot;
    const file = ({ CASQUE: "helmet", PLASTRON: "breastplate", GANTS: "gauntlets", BOTTES: "boots" } as const)[artifact.slot as ArtifactSlot];
    return {
      key: `artifact:${artifact.id}`, equippedBy: artifact.equippedCard ? { id: artifact.equippedCard.id, name: artifact.equippedCard.character.name } : undefined, name: artifact.setKey === "one-piece" ? ONE_PIECE_ARTIFACT_NAMES[artifact.slot] ?? `${slot} des profondeurs` : `${slot} · ${universe}`, quantity: 1, categories: ["Équipement"], universe: artifact.setKey,
      source: `Donjon ${universe}`, description: `Artefact ${slot.toLocaleLowerCase("fr")} du set ${universe}. Niveau ${artifact.level}. ${artifact.equippedCard ? `Équipé sur ${artifact.equippedCard.character.name}.` : "À équiper sur une carte."}`,
      icon: "artifact", tone: artifactRarity(artifact.rarity).tone, image: artifact.setKey === "one-piece" ? `/images/artifacts/one-piece-${file ?? "helmet"}-anime.png` : undefined, links: [{ href: `/donjons?set=${artifact.setKey}`, label: `Donjon ${universe}` }],
      artifact: { setKey: artifact.setKey, id: artifact.id, slot: artifact.slot, rarity: artifact.rarity, mainStat: artifact.mainStat, mainValue: artifact.mainValue, subStats: artifact.subStats as { stat: string; value: number }[], level: artifact.level, equippedCard: artifact.equippedCard },
    };
  });
  return { items: [...inventoryResources(stock), ...equipment, ...artifacts], cards: artifactInventory.cards, balance: wallet.balance };
}
