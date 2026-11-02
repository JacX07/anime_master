import assert from "node:assert/strict";
import { validateSquad } from "../src/lib/squads";

assert.deepEqual(validateSquad("  Alpha  ", ["a", null, "b", null]), { name: "Alpha", slots: ["a", null, "b", null], ids: ["a", "b"] });
for (const [name, slots] of [
  ["", [null, null, null, null]],
  [" ", [null, null, null, null]],
  ["x".repeat(61), [null, null, null, null]],
  ["Alpha", ["a", "a", null, null]],
  ["Alpha", ["a", null]],
  ["Alpha", [1, null, null, null]],
  ["Alpha", ["", null, null, null]],
  ["Alpha", null],
] as const) assert.throws(() => validateSquad(name, slots));
assert.equal(validateSquad("Draft", [null, null, null, null]).ids.length, 0);
assert.equal(validateSquad("Complete", ["a", "b", "c", "d"]).ids.length, 4);
console.log("Squads : noms, 4 emplacements, brouillons, doublons et entrées invalides vérifiés.");
