import assert from "node:assert/strict";
import { inspectionPosition, spellDescriptionParts } from "../src/lib/spell-inspection";
import { CHARACTER_SPELLS, describeSpell } from "../src/lib/spells";

const text = "1× ATK. Esquive +3 points ; DEF −20 % ; poison : 8 % pendant 2 tours.";
const parts = spellDescriptionParts(text);
assert.deepEqual(parts.filter((part) => part.effect).map((part) => part.text), ["Esquive", "DEF", "poison"]);
assert.equal(parts.map((part) => part.text).join(""), text);
assert.deepEqual(spellDescriptionParts("1,5× ATK ignore 40 % de la DEF"), [{ text: "1,5× ATK ignore 40 % de la DEF", effect: false }]);
for (const spell of Object.values(CHARACTER_SPELLS)) {
  const description = describeSpell(spell, true);
  const chunks = spellDescriptionParts(description);
  assert.equal(chunks.map((part) => part.text).join(""), description, `${spell.name}: texte préservé`);
  assert.ok(chunks.filter((part) => part.effect).every((part) => !/[\d%+−]/.test(part.text)), `${spell.name}: chiffres hors couleur`);
}
assert.deepEqual(inspectionPosition({ left: 0, top: 440, width: 92 }, { width: 296, height: 140 }, 320), { left: 12, top: 288 });
assert.deepEqual(inspectionPosition({ left: 340, top: 600, width: 92 }, { width: 320, height: 200 }, 430), { left: 98, top: 388 });
assert.equal(inspectionPosition({ left: 10, top: 70, width: 84 }, { width: 296, height: 100 }, 320).top, 12);
console.log("✓ Inspection : texte conservé, noms seuls en couleur, formules intactes et encadré borné aux bords.");
