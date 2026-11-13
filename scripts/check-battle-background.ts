import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { battleBackground } from "../src/lib/battle-background";
import { artifactImage } from "../src/lib/artifact-display";

for (const [mode, levels] of [["story", [1, 5, 6, 10, 11, 15]], ["dungeon", [1, 3, 4, 6, 7, 10]]] as const) {
  for (const [index, level] of levels.entries()) {
    const name = ["tournoi", "namek", "enfer"][Math.floor(index / 2)];
    const url = battleBackground(`${mode}:dragon-ball:${level}`);
    assert.equal(url, `/images/battle/dragon-ball/${name}.webp`);
    assert.equal(readFileSync(`public${url}`).toString("ascii", 8, 12), "WEBP");
  }
}
for (const key of ["story:naruto:1", "dungeon:bleach:1", "raid:dragon-ball:1", "story:dragon-ball:0", "story:dragon-ball:16", "dungeon:dragon-ball:11", "story:dragon-ball:1:extra", "story:dragon-ball:../secret"]) {
  assert.equal(battleBackground(key), undefined, key);
}
for (const set of ["fairy-tail", "bleach"]) {
  for (const slot of ["CASQUE", "PLASTRON", "GANTS", "BOTTES"]) {
    const url = artifactImage(set, slot);
    assert.ok(url);
    assert.equal(readFileSync(`public${url}`).toString("ascii", 8, 12), "WEBP");
  }
}
assert.equal(artifactImage("unknown", "CASQUE"), undefined);
assert.equal(artifactImage("bleach", "unknown"), undefined);
console.log("Décors DBZ : paliers, limites, autres univers et huit illustrations de set OK.");
