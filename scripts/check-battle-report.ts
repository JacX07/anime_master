import assert from "node:assert/strict";
import { applyAction, createBattle, type BattleCard, type BattleEvent, type UnitView } from "../src/lib/battle";
import { battleReport } from "../src/lib/battle-report";
const unit = (id: UnitView["id"]): UnitView => ({ id, characterId: id === "A1" ? 1 : 2, rarity: "SSR", type: "COMBAT", atk: 100, def: 100, speed: 100, maxHp: 1000, hp: 1000, shield: 0, ultimateGauge: 0, ultimateGaugeMax: 100 });
const log: BattleEvent[] = [
  { kind: "start", first: "A", units: [unit("A1"), unit("B1")] },
  { kind: "shield", source: null, target: "B1", amount: 150, shield: 150 },
  { kind: "action", actor: "A1", spell: "base", target: "B1" },
  { kind: "damage", source: "A1", target: "B1", amount: 200, absorbed: 50, crit: false, affinity: null, exposedBonus: false, hp: 850, shield: 100 },
  { kind: "heal", source: "B1", target: "B1", amount: 999, hp: 950 },
  { kind: "poison", source: "B1", target: "A1", amount: 100, hp: 900 },
  { kind: "poison", target: "A1", amount: 50, hp: 850 },
  { kind: "action", actor: "A1", spell: "special", target: "B1" },
  { kind: "damage", source: "A1", target: "B1", amount: 9999, absorbed: 0, crit: true, affinity: null, exposedBonus: false, hp: 0, shield: 0 },
  { kind: "ko", target: "B1" },
  { kind: "revive", source: "B1", target: "B1", hp: 400 },
  { kind: "damage", source: "A1", target: "B1", amount: 999, absorbed: 0, crit: false, affinity: null, exposedBonus: false, hp: 0, shield: 0 },
  { kind: "ko", target: "B1" },
  { kind: "shield", source: "A1", target: "A1", amount: 120, shield: 120 },
];
const report = battleReport(log);
const a = report.rows.find((r) => r.id === "A1")!, b = report.rows.find((r) => r.id === "B1")!;
assert.equal(a.dealt, 1550); assert.equal(a.kos, 2); assert.equal(a.actions, 2); assert.equal(a.taken, 150); assert.equal(a.shields, 120);
assert.equal(b.dealt, 100); assert.equal(b.taken, 1500); assert.equal(b.absorbed, 50); assert.equal(b.healing, 100); assert.equal(b.shields, 0); assert.equal(report.unattributed, 50);
assert.deepEqual(battleReport([]).rows, []);
const card: BattleCard = { characterId: 999991, rarity: "SSR", type: "COMBAT", power: 10000, attack: 1000, defense: 1000, franchiseId: null, noElement: true, noBasicAttack: true,
  spell: { name: "Poison de vérification", target: "foe", final: true, effects: [{ k: "poison", pct: .1, turns: 2, to: "target" }] } };
const state = createBattle([card], [{ ...card, characterId: 999992, power: 1 }], () => .5, { combos: false });
state.teams.A[0].pIn = 0;
applyAction(state, { spell: "special", target: "B1" });
applyAction(state, { spell: "base", target: "A1" });
assert(state.log.some((event) => event.kind === "poison" && event.source === "A1" && event.target === "B1"));
console.log("Bilan conforme : sur-dégâts, absorption, soins effectifs, KO, résurrection, anciens DoT et source du poison.");
