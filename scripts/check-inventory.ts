import { artifactRarity } from "../src/lib/artifact-display";
import assert from "node:assert/strict";
import { filterInventory, inventoryResources, type InventoryItem } from "../src/lib/inventory";
import { COMMON_RESOURCE, UNIVERSES } from "../src/lib/story";
import { RAID_RESOURCE } from "../src/lib/raid";

const universe = UNIVERSES[0];
const items = inventoryResources([{ key: COMMON_RESOURCE, quantity: 1200 }, { key: RAID_RESOURCE, quantity: 50 }, { key: universe.weaponResource, quantity: 20 }, { key: "future-material", quantity: 3 }]);
assert.equal(items.filter((item) => item.key === RAID_RESOURCE).length, 1);
for (const category of ["Éveil", "Forge"] as const) assert(filterInventory(items, category, "", "", false, "quantity").some((item) => item.key === RAID_RESOURCE));
assert.equal(filterInventory(items, "Tout", "coeur", "", false, "quantity")[0].key, RAID_RESOURCE);
assert.deepEqual(filterInventory(items, "Forge", "", universe.key, false, "name").map((item) => item.key), [universe.weaponResource]);
assert.equal(filterInventory(items, "Tout", "", "", false, "quantity").length, 4);
assert.equal(filterInventory(items, "Tout", "", "", false, "quantity")[0].quantity, 1200);
assert(filterInventory(items, "Tout", "", "", true, "name").length > 4);
assert.equal(filterInventory(items, "Consommables", "", "", true, "name").length, 0);
assert.equal(items.find((item) => item.key === "future-material")?.quantity, 3);
assert.equal(items.find((item) => item.key === COMMON_RESOURCE)?.links[0].href, "/eveil");
assert.equal(items.find((item) => item.key === universe.weaponResource)?.links[0].href, "/forge");
const artifact: InventoryItem = {
  ...items[0]!, key: "artifact:helmet-1", name: "Casque des profondeurs", quantity: 1, categories: ["Équipement"], universe: "one-piece",
  source: "Donjon One Piece", description: "Casque du set marin.", icon: "artifact", tone: "gold", image: "/images/artifacts/one-piece-helmet.webp", links: [],
  artifact: { id: "helmet-1", slot: "CASQUE", rarity: "UR", mainStat: "defense", mainValue: 0.16, subStats: [{ stat: "flatAttack", value: 653 }], level: 5, equippedCard: null },
};
const withArtifact = [...items, artifact];
assert.deepEqual(filterInventory(withArtifact, "Équipement", "", "", false, "name").map((item) => item.key), [artifact.key]);
assert.deepEqual(filterInventory(withArtifact, "Tout", "Casque", "", false, "name").map((item) => item.key), [artifact.key]);
assert.deepEqual(filterInventory(withArtifact, "Tout", "ATK", "", false, "name").map((item) => item.key), [artifact.key]);
assert.deepEqual(filterInventory(withArtifact, "Tout", "16 %", "", false, "name").map((item) => item.key), [artifact.key]);
assert.equal(filterInventory(withArtifact, "Tout", "Ultra Rare", "", false, "name").length, 1);
console.log("Inventaire conforme : catégories partagées, recherche sans accents, univers, tri, stocks vides et ressources futures.");

assert.equal(new Set((["N", "R", "SR", "SSR", "UR"] as const).map((r) => artifactRarity(r).label)).size, 4);
