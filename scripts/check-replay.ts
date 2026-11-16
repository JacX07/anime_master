// Vérifie que le journal de combat suffit à l'affichage : l'état rejoué (src/lib/battle-replay.ts) doit égaler l'état final du moteur.
// Usage : npm run check:replay

import { applyAction, autoAction, createBattle, currentActor, type BattleCard, type Random } from "../src/lib/battle";
import { holdFor, replayAll, replayCurrentAction, replayStart, replayStep } from "../src/lib/battle-replay";
import { attackVisual, ATTACK_VISUALS, attackWeapon } from "../src/lib/attack-visual";
import { BASIC_ATTACK_ROSTER } from "../src/lib/basic-attack-roster";
import { strict as assert } from "node:assert";

assert.equal(attackVisual(127212), "melee");
assert.equal(attackVisual(246), "melee");
assert.equal(attackVisual(176754), "magic");
assert.equal(attackVisual(183965), "magic");
assert.equal(attackVisual(422), "slash");
assert.equal(attackVisual(62), "slash");
assert.equal(attackVisual(458), "gun");
assert.equal(attackVisual(-1), "melee");
assert.deepEqual(Object.keys(ATTACK_VISUALS).sort(), Object.keys(BASIC_ATTACK_ROSTER).sort(), "Every SSR/UR needs an explicit visual style");
assert.equal(attackVisual(305), "melee");
assert.equal(attackVisual(12), "melee");
assert.equal(attackWeapon(422), "greatsword");
assert.equal(attackWeapon(62), "iai");
assert.equal(attackWeapon(909), "iai");
assert.equal(attackVisual(909), "slash");
assert.equal(attackWeapon(5), "katana");

function seeded(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gen = seeded(7);
const TYPES = ["COMBAT", "MYSTERE", "MAGIE", "COEUR", "AVENTURE"] as const;
const RARITIES = ["N", "R", "SR", "SSR", "UR"] as const;
const pick = <T>(l: readonly T[]) => l[Math.floor(gen() * l.length)];
function card(): BattleCard {
  const total = 1000 + gen() * 7000;
  const attack = Math.round(total * (0.35 + gen() * 0.3));
  return {
    characterId: Math.floor(gen() * 1e6), rarity: pick(RARITIES), type: pick(TYPES),
    attack, defense: Math.round(total - attack), power: Math.floor(gen() * 1e5), franchiseId: Math.floor(gen() * 6),
  };
}

let failures = 0;
const near = (x: number, y: number) => Math.abs(x - y) < 1e-6;
const GAMES = 300;
let events = 0;
let longest = 0;
for (let g = 0; g < GAMES; g++) {
  const st = createBattle([card(), card(), card(), card()], [card(), card(), card(), card()], gen);
  while (currentActor(st)) applyAction(st, autoAction(st));
  const log = st.result!.log;
  events += log.length;
  longest = Math.max(longest, log.reduce((ms, _, i) => ms + holdFor(log, i), 0));
  // Skip ne doit franchir aucune action suivante, même si plusieurs sont déjà reçues du serveur.
  const firstAction = log.findIndex((event) => event.kind === "action");
  let cursor = replayStart(log);
  while (cursor.idx <= firstAction) cursor = replayStep(cursor, log);
  const nextAction = log.findIndex((event, i) => i >= cursor.idx && event.kind === "action");
  const skipped = replayCurrentAction(cursor, log);
  assert.equal(skipped.idx, nextAction === -1 ? log.length : nextAction);
  let expected = cursor;
  while (expected.idx < skipped.idx) expected = replayStep(expected, log);
  assert.deepEqual(skipped.units, expected.units);
  assert.deepEqual(skipped.cur, cursor.cur, "Skip garde l’action affichée");
  assert.deepEqual(replayCurrentAction(skipped, log), skipped, "Skip répété ne joue pas l’action suivante");
  const r = replayAll(log);
  const bad: string[] = [];
  if (r.end?.kind !== "end") bad.push("pas de « end »");
  for (const side of ["A", "B"] as const) {
    for (const u of st.teams[side]) {
      const v = r.units[u.id];
      if (!near(v.hp, u.hp)) bad.push(`${u.id} PV ${v.hp} ≠ ${u.hp}`);
      if (!near(v.shield, u.shield)) bad.push(`${u.id} bouclier ${v.shield} ≠ ${u.shield}`);
      if (v.ko !== (u.hp <= 0)) bad.push(`${u.id} K.O.`);
      // Les états d'une carte tombée sont retirés à l'affichage : on ne compare que les cartes vivantes
      if (u.hp > 0 && (v.exposed !== u.exposed || v.weaken !== u.weaken > 0 || v.elan !== u.elan > 0)) bad.push(`${u.id} états`);
    }
  }
  if (bad.length) {
    failures++;
    if (failures <= 5) console.log(`✗ combat ${g} : ${bad.slice(0, 4).join(" ; ")}`);
  }
}
console.log(`${failures ? "✗" : "✓"} ${GAMES} combats rejoués (${(events / GAMES).toFixed(0)} événements en moyenne), ${failures} écart(s)`);
console.log(`  durée la plus longue à vitesse ×1 : ${(longest / 1000).toFixed(0)} s`);
process.exit(failures ? 1 : 0);
