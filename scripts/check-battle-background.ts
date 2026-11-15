import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { artifactImage } from "../src/lib/artifact-display";

assert.equal(readFileSync("public/images/battle/citadelle.webp").toString("ascii", 8, 12), "WEBP");
for (const set of ["fairy-tail", "bleach", "attack-on-titan", "demon-slayer"]) {
  for (const slot of ["CASQUE", "PLASTRON", "GANTS", "BOTTES"]) {
    const url = artifactImage(set, slot);
    assert.ok(url);
    assert.equal(readFileSync(`public${url}`).toString("ascii", 8, 12), "WEBP");
  }
}
assert.equal(artifactImage("unknown", "CASQUE"), undefined);
assert.equal(artifactImage("bleach", "unknown"), undefined);
console.log("Fond commun des combats et seize illustrations de set disponibles en WebP.");
