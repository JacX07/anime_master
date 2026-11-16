import assert from "node:assert/strict";
import { assignRarities, computeStats, RARITY_MIDDLE, RARITY_OVERRIDES } from "../src/lib/stats";

const yhwach = { id: 68537, favourites: 1, rarity: "UR" as const, role: "SUPPORTING" as const };
assert.equal(RARITY_OVERRIDES[yhwach.id], "UR");
assert.equal(assignRarities([{ id: 1, favourites: 999999 }, yhwach]).get(yhwach.id), "UR", "La popularité ne peut annuler sa promotion");
assert(RARITY_MIDDLE.has(yhwach.id));
const stats = computeStats(yhwach, new Map([["UR", { min: 0, max: 999999 }]]));
assert.equal(stats.attack + stats.defense, 7100, "Promotion au milieu de la plage UR");
assert.deepEqual(computeStats({ ...yhwach, favourites: 999999 }, new Map()), stats, "Stats stables après réimport");
console.log("Raretés imposées : Yhwach UR et statistiques stables conformes.");
