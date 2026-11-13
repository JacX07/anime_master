import { COMMON_RESOURCE, RESOURCE_NAMES, UNIVERSES } from "./story";
import { RAID_RESOURCE } from "./raid";
import type { Rarity } from "@/generated/prisma/enums";
import { artifactRarity, artifactStatLabel, artifactStatValue } from "./artifact-display";
import { RARITY_NAMES } from "./labels";
import { CHEST_ITEMS, CHEST_NAMES, FREE_BOOSTER, parseChestKey } from "./chests";

export const INVENTORY_CATEGORIES = ["Tout", "Éveil", "Forge", "Équipement", "Consommables"] as const;
export type InventoryCategory = typeof INVENTORY_CATEGORIES[number];
export type InventoryItem = {
  key: string;
  resource?: string;
  equippedBy?: { id: string; name: string };
  name: string;
  quantity: number;
  categories: InventoryCategory[];
  universe: string;
  source: string;
  description: string;
  icon: "crystal" | "heart" | "ore" | "weapon" | "artifact";
  tone: "gray" | "blue" | "violet" | "gold";
  links: { href: string; label: string }[];
  image?: string;
  artifact?: {
    setKey?: string;
    id: string;
    slot: string;
    rarity: Rarity;
    mainStat: string;
    mainValue: number;
    subStats: { stat: string; value: number }[];
    level: number;
    equippedCard: { id: string; character: { name: string; imageUrl: string; rarity: Rarity } } | null;
  };
};

export function inventoryResources(stock: { key: string; quantity: number }[]): InventoryItem[] {
  const quantities = new Map(stock.map((row) => [row.key, row.quantity]));
  const keys = new Set([COMMON_RESOURCE, RAID_RESOURCE, ...UNIVERSES.flatMap((u) => [u.resource, u.weaponResource]), ...quantities.keys()]);
  return [...keys].map((key): InventoryItem => {
    // Coffres d'expédition et cartes offertes : des consommables
    const chest = parseChestKey(key);
    if (chest) {
      const from = UNIVERSES.find((u) => u.key === chest.universe);
      return { key, resource: key, name: `Coffre ${CHEST_NAMES[chest.tier]}${from ? ` · ${from.name}` : ""}`, quantity: quantities.get(key) ?? 0, categories: ["Consommables"], universe: from?.key ?? "common",
        source: "Expéditions", description: `${CHEST_ITEMS[chest.tier]} objets au hasard : Ryō, cristaux, boosters, matériaux, artefacts, cartes… Les matériaux viennent de ${from?.name ?? "son univers"}.`,
        icon: "crystal", tone: chest.tier === "legendaire" ? "violet" : chest.tier === "or" ? "gold" : chest.tier === "argent" ? "blue" : "gray", links: [{ href: "/expeditions", label: "Ouvrir aux expéditions" }] };
    }
    if (key === FREE_BOOSTER) {
      return { key, resource: key, name: "Cartes offertes", quantity: quantities.get(key) ?? 0, categories: ["Consommables"], universe: "common", source: "Coffres d'expédition",
        description: "Cartes gratuites : utilisées automatiquement avant les cristaux à l'invocation.", icon: "crystal", tone: "gold", links: [{ href: "/", label: "Invoquer" }] };
    }
    const universe = UNIVERSES.find((u) => u.resource === key || u.weaponResource === key);
    const heart = key === RAID_RESOURCE;
    const forge = universe?.weaponResource === key;
    const awakening = key === COMMON_RESOURCE || universe?.resource === key;
    return {
      key, resource: key, name: RESOURCE_NAMES[key] ?? key, quantity: quantities.get(key) ?? 0,
      categories: heart ? ["Éveil", "Forge"] : forge ? ["Forge"] : awakening ? ["Éveil"] : [],
      universe: universe?.key ?? "common",
      source: heart ? "Raid hebdomadaire" : universe ? `${universe.name} · ${forge ? "boss final de l’histoire" : "combats de l’histoire"}` : key === COMMON_RESOURCE ? "Combats de l’histoire, tous univers" : "Récompenses en jeu",
      description: heart ? "Éveille tes SSR et UR aux étoiles 4 et 5, ou fabrique une arme légendaire." : forge ? "Matériau de fabrication d’une arme légendaire. Les ressources de boss finaux de tous les univers peuvent être combinées à la forge." : awakening ? universe ? `Ressource d’éveil des cartes de ${universe.name}. À combiner avec les fragments de signature pour les trois premières étoiles.` : "Ressource commune pour les trois premières étoiles de tes cartes. Les cartes d’un univers utilisent aussi la ressource de leur histoire." : "Une ressource conservée dans ton inventaire.",
      icon: heart ? "heart" : forge ? "ore" : "crystal",
      tone: heart ? "violet" : forge ? "gold" : "blue",
      links: heart ? [{ href: "/eveil", label: "Éveiller une carte" }, { href: "/forge", label: "Aller à la forge" }] : forge ? [{ href: "/forge", label: "Aller à la forge" }] : awakening ? [{ href: "/eveil", label: "Éveiller une carte" }] : [],
    };
  });
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/œ/g, "oe");
export function filterInventory(items: InventoryItem[], category: InventoryCategory, query: string, universe: string, showEmpty: boolean, sort: string) {
  const search = normalize(query.trim());
  return items.filter((item) => {
    const artifactSearch = item.artifact ? [artifactRarity(item.artifact.rarity).label, RARITY_NAMES[item.artifact.rarity], item.artifact.rarity, `niveau ${item.artifact.level}`, artifactStatLabel(item.artifact.mainStat), artifactStatValue(item.artifact.mainStat, item.artifact.mainValue), ...item.artifact.subStats.flatMap((stat) => [artifactStatLabel(stat.stat), artifactStatValue(stat.stat, stat.value)])].join(" ") : "";
    return (showEmpty || item.quantity > 0)
    && (category === "Tout" || item.categories.includes(category))
    && (!universe || item.universe === universe)
    && normalize(`${item.name} ${item.source} ${item.description} ${item.equippedBy?.name ?? ""} ${artifactSearch}`).includes(search);
  }).sort((a, b) => (sort === "quantity" ? b.quantity - a.quantity : 0) || a.name.localeCompare(b.name, "fr") || a.key.localeCompare(b.key));
}
