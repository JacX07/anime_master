import assert from "node:assert/strict";
import { applyAction, createBattle, type BattleCard } from "../src/lib/battle";
import { isMagicalSpell } from "../src/lib/magic-skill";
import { sumArtifactStats } from "../src/lib/artifact-stats";
import type { CharacterSpell } from "../src/lib/spells";

const card: BattleCard = { characterId: 999999, rarity: "SSR", type: "COMBAT", power: 10000, attack: 1000, defense: 1000, franchiseId: null, noElement: true, noBasicAttack: true };
const foe: BattleCard = { ...card, power: 1, characterId: 999998, attack: 100, defense: 10000 };
const spell = (kind?: "physical" | "magic"): CharacterSpell => ({ name: "Sort de vérification", damageKind: kind, target: "foe", final: true, effects: [{ k: "damage", mult: 1 }] });
function damage(skill: number, kind?: "physical" | "magic", type: BattleCard["type"] = "COMBAT", slot: "special" | "base" = "special") {
  const st = createBattle([{ ...card, type, spell: spell(kind), artifactStats: { ...sumArtifactStats([]), magicSkill: skill } }], [foe], () => .5, { combos: false, franchise: false, passive: false, elements: false });
  st.teams.A[0].pIn = 0;
  applyAction(st, { spell: slot, target: "B1" });
  return st.log.filter((event) => event.kind === "damage").reduce((sum, event) => sum + event.amount, 0);
}
assert(Math.abs(damage(.5, "magic") / damage(0, "magic") - 1.5) < 1e-8, "Un sort explicitement magique profite du bonus même sur COMBAT");
assert.equal(damage(.5, "physical", "MAGIE"), damage(0, "physical", "MAGIE"), "Le type MAGIE ne transforme pas un sort physique");
assert.equal(damage(.5, undefined, "MAGIE"), damage(0, undefined, "MAGIE"), "Un sort non marqué ne reçoit pas le bonus");
assert.equal(damage(.5, "magic", "COMBAT", "base"), damage(0, "magic", "COMBAT", "base"));
assert(isMagicalSpell({ characterId: 68, type: "AVENTURE" }, "special"));
assert(!isMagicalSpell({ characterId: 68, type: "AVENTURE" }, "base"));
assert(!isMagicalSpell({ characterId: 68, type: "AVENTURE" }, "special", spell("physical")));
assert.equal(sumArtifactStats([{ mainStat: "magicSkill", mainValue: .2, subStats: [{ stat: "magicSkill", value: .02 }] }]).magicSkill, .22);
console.log("Compétence magique conforme : marquage par sort, tous types, attaques physiques et de base inchangées, bonus d’équipement additionnés.");
