// Vérifie le ciblage VFX et la synchronisation des impacts avec le journal.
import { strict as assert } from "node:assert";
import type { BattleEvent, UnitId } from "../src/lib/battle";
import { ATTACK_VISUALS } from "../src/lib/attack-visual";
import { BASIC_ATTACK_ROSTER } from "../src/lib/basic-attack-roster";
import { actionVisualTargets } from "../src/lib/combat-vfx-events";

const action = (target: UnitId | null = "B1"): BattleEvent => ({ kind: "action", actor: "A1", spell: "ultimate", target });
const damage = (target: UnitId): BattleEvent => ({ kind: "damage", source: "A1", target, amount: 10, absorbed: 0, crit: false, affinity: null, exposedBonus: false, hp: 90, shield: 0 });
const dodge = (target: UnitId): BattleEvent => ({ kind: "dodge", source: "A1", target });
const targetIds = (events: BattleEvent[]) => actionVisualTargets(events, 0).map(({ target }) => target);

// Une cible explicite et une zone (target null) suivent les impacts réellement journalisés.
assert.deepEqual(targetIds([action(), damage("B1")]), ["B1"]);
assert.deepEqual(targetIds([action(null), damage("B1"), damage("B2"), damage("B1")]), ["B1", "B2"]);

// Les événements de soutien d'un sort mixte ne deviennent pas des cibles d'attaque.
const mixed: BattleEvent[] = [action("A2"), damage("B1"), { kind: "heal", source: "A1", target: "A2", amount: 5, hp: 85 }, { kind: "shield", source: "A1", target: "A2", amount: 5, shield: 5 }];
assert.deepEqual(targetIds(mixed), ["B1"]);
assert.deepEqual(targetIds([action("A2"), { kind: "heal", source: "A1", target: "A2", amount: 5, hp: 85 }, { kind: "status", target: "A2", status: "elan", on: true }]), []);
assert.deepEqual(actionVisualTargets([action(), dodge("B1")], 0), [{ target: "B1", at: 480, dodge: true }]);

// La jauge consommée par l'ultime précède son impact dans le temps de rejeu.
const ultimate: BattleEvent[] = [action(), { kind: "ultimateGauge", target: "A1", amount: -100, current: 0, max: 100 }, damage("B1")];
assert.deepEqual(actionVisualTargets(ultimate, 0), [{ target: "B1", at: 510, dodge: false }]);

// Une action visuelle ne capture jamais les événements de l'action/round/fin suivant.
for (const boundary of [
  action(),
  { kind: "skip", actor: "A2", reason: "stun" } as const,
  { kind: "round", round: 2 } as const,
  { kind: "end", winner: "A", reason: "ko", rounds: 1, hpLeft: { A: 1, B: 0 } } as const,
]) {
  assert.deepEqual(targetIds([action(), boundary, damage("B2")]), []);
}
assert.deepEqual(actionVisualTargets([damage("B1"), action(), damage("B2")], 0), []);

// Chaque personnage de base roster a un style d'attaque explicite.
assert.equal(Object.keys(BASIC_ATTACK_ROSTER).length, 236);
assert.deepEqual(Object.keys(ATTACK_VISUALS).sort(), Object.keys(BASIC_ATTACK_ROSTER).sort());
console.log("✓ combat VFX : cibles, frontières d'action, délais et styles (236 personnages)");
