// Sans base : reprise après victoire, changement d'acte/univers et fin du parcours.
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StoryMap } from "../src/app/histoire/StoryMap";
import { storyResume } from "../src/lib/story-map";
import { UNIVERSES, LEVELS } from "../src/lib/story";
import { existsSync } from "node:fs";

const progress = (levels: number[]) => UNIVERSES.map((u, i) => ({
  key: u.key, maxLevel: levels[i] ?? 0, unlocked: i === 0 || (levels[i - 1] ?? 0) >= LEVELS,
}));
assert.deepEqual(storyResume(progress([])), { key: "one-piece", level: 1 });
assert.deepEqual(storyResume(progress([6])), { key: "one-piece", level: 7 });
assert.deepEqual(storyResume(progress([5])), { key: "one-piece", level: 6 });
assert.deepEqual(storyResume(progress([14])), { key: "one-piece", level: 15 });
assert.deepEqual(storyResume(progress([15])), { key: "naruto", level: 1 });
assert.deepEqual(storyResume(progress([15, 15, 8])), { key: "grand-concert", level: 9 });
assert.deepEqual(storyResume(progress(UNIVERSES.map(() => 15))), { key: UNIVERSES.at(-1)!.key, level: 15 });
assert.equal(storyResume([]), null);
assert.equal(storyResume([{ key: "locked", maxLevel: 0, unlocked: false }]), null);
for (const u of UNIVERSES) {
  assert.ok(existsSync(`public/story-map/${u.key}.svg`), `Décor manquant : ${u.key}`);
  assert.ok(existsSync(`public/story-map/${u.key}-boss.svg`), `Boss manquant : ${u.key}`);
}
console.log("✓ Reprise : nouveau joueur, victoire, actes, univers, parcours terminé et 15 décors/boss.");

const universes = UNIVERSES.map((u, i) => ({ ...u, ...progress([15, 5])[i], mixes: Array.from({ length: 15 }, () => ["R", "R", "SR", "SR"]) }));
const html = renderToStaticMarkup(createElement(StoryMap, { universes, stock: {}, ready: true, pending: false, onFight() {} }));
assert.equal((html.match(/data-level=/g) ?? []).length, 225);
assert.equal((html.match(/class="hs-map-act"/g) ?? []).length, 45);
assert.equal((html.match(/aria-current="step"/g) ?? []).length, 1);
assert.match(html, /data-universe="naruto" data-level="6"[^>]+aria-current="step"[^>]+aria-pressed="true"/);
assert.match(html, /Univers 2 · Acte 2 · Combat 6/);
assert.match(html, /La Nuit des Maudits/);
console.log("✓ Carte rendue : 225 jalons, 45 actes et combat de reprise sélectionné dans le bon univers.");
