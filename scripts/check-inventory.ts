import assert from "node:assert/strict";
import { filterInventory, inventoryResources } from "../src/lib/inventory";
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
console.log("Inventaire conforme : catégories partagées, recherche sans accents, univers, tri, stocks vides et ressources futures.");
