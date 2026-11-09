import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StoryDrops } from "../src/app/histoire/StoryDrops";
import { COMMON_RESOURCE, DAILY_FULL_UNITS, LEVELS, UNIVERSES, lootUnits, storyLoot, storyLootPreview } from "../src/lib/story";

for (const u of UNIVERSES) for (let level = 1; level <= LEVELS; level++) for (const first of [true, false]) {
  const preview = storyLootPreview(u, level, first);
  for (const [quota, units] of [[DAILY_FULL_UNITS, preview.units], [0, preview.minUnits]]) {
    const loot = storyLoot(u, level, first, quota, () => .25);
    assert.equal(units, lootUnits(loot, u));
    assert.equal(preview.ryo, loot.ryo);
    assert.equal(preview.crystals, loot.crystals);
    assert.equal(preview.weapon, loot.resources[u.weaponResource] ?? 0);
  }
  assert.equal(preview.weapon, level === LEVELS ? 1 : 0);
}
const op = UNIVERSES[0];
assert.deepEqual(storyLootPreview(op, 1, true), { units: 12, minUnits: 12, ryo: 55, crystals: 1, weapon: 0 });
assert.deepEqual(storyLootPreview(op, 15, false), { units: 11, minUnits: 3, ryo: 38, crystals: 0, weapon: 1 });
const split = storyLoot(op, 1, false, 500, (() => { let i = 0; return () => i++ % 2 ? .5 : .499; })());
assert.equal(split.resources[op.resource], 2);
assert.equal(split.resources[COMMON_RESOURCE], 2);
const regular = renderToStaticMarkup(createElement(StoryDrops, { universeKey: op.key, level: 1, cleared: false }));
assert.match(regular, /Fruit du démon/);
assert.match(regular, /Fragment de signature/);
assert.match(regular, /12 unités/);
assert.equal((regular.match(/50 % par unité/g) ?? []).length, 2);
assert.doesNotMatch(regular, /Kairoseki/);
const boss = renderToStaticMarkup(createElement(StoryDrops, { universeKey: op.key, level: 15, cleared: true }));
assert.match(boss, /Kairoseki/);
assert.match(boss, /100 %/);
assert.match(boss, /3 à 11 unités/);
assert.match(boss, /Ryō<small>×38</);
assert.doesNotMatch(boss, />Cristaux</);
console.log("✓ Butin : 225 combats, première victoire/rejeu, plafond, boss, tirage 50/50 et affichage des taux.");
