import assert from "node:assert/strict";
import { confirmationScope, confirmationTargets } from "../src/lib/combat-selection";
import { BOSS_SKILLS } from "../src/lib/boss-skills";
import { applyAction, createBattle, currentActor, legalActions, seededRandom, type BattleCard } from "../src/lib/battle";

const units = { A1: { ko: false }, A2: { ko: false }, A3: { ko: true }, B1: { ko: false }, B2: { ko: true } };
assert.deepEqual(confirmationTargets("A1", [], "team", units), []);
assert.deepEqual(confirmationTargets("A1", ["B1"], "team", units), ["B1"]);
assert.deepEqual(confirmationTargets("A1", ["A3"], "self", units), ["A3"]);
assert.deepEqual(confirmationTargets("A1", [null], "team", units), ["A1", "A2"]);
assert.deepEqual(confirmationTargets("A1", [null], "self", units), ["A1"]);
assert.deepEqual(confirmationTargets("A1", [null], "foes", units), ["B1"]);
assert.deepEqual(confirmationTargets("B1", [null], "team", units), ["B1"]);
assert.deepEqual(confirmationTargets("A1", [null], "fallen-allies", units), ["A3"]);
assert.equal(confirmationScope([{ k: "mod", stat: "atk", amount: .2, turns: 2, to: "self" }]), "self");
assert.equal(confirmationScope([{ k: "heal", pct: .1, to: "team" }]), "team");
assert.equal(confirmationScope([{ k: "arise", pct: .2 }]), "fallen-allies");
const bossSpell = BOSS_SKILLS[2754].spell;
assert.ok(bossSpell);
assert.equal(confirmationScope(bossSpell.effects), "foes");

// Confirming a team buff preserves the engine's null target and affects the whole team.
const card: BattleCard = { characterId: 900001, rarity: "SSR", type: "COEUR", attack: 100, defense: 100, power: 10, franchiseId: null };
const st = createBattle([card, card], [card, card], seededRandom(1), { passive: false, franchise: false, combos: false });
const actor = currentActor(st)!;
const caster = [...st.teams.A, ...st.teams.B].find((unit) => unit.id === actor.id)!;
caster.spell = { name: "Protection d’équipe", target: null, effects: [{ k: "mod", stat: "def", amount: .2, turns: 2, to: "team" }] };
caster.pIn = 0;
const choice = legalActions(st).find((entry) => entry.spell === "special")!;
assert.deepEqual(choice.targets, [null]);
const before = st.log.length;
const targets = confirmationTargets(actor.id, choice.targets, confirmationScope(caster.spell.effects), Object.fromEntries([...st.teams.A, ...st.teams.B].map((unit) => [unit.id, { ko: unit.hp <= 0 }])));
assert.equal(st.log.length, before, "preview must not execute the spell");
assert.equal(targets.length, 2);
applyAction(st, { spell: "special", target: choice.targets.includes(null) ? null : targets[0] });
assert.ok(st.teams[actor.id[0] as "A" | "B"].every((unit) => unit.fx.some((effect) => effect.key === "defUp")));
console.log("✓ Confirmation : aucune cible sans sélection, cibles serveur, soi, équipe, ennemis, résurrection et buff global compatible moteur.");
