import assert from "node:assert/strict";
import { applyAction, autoAction, battle, createBattle, type BattleCard } from "../src/lib/battle";
import { sumArtifactStats } from "../src/lib/artifact-stats";
import { damageKind } from "../src/lib/damage-kind";

const piece = (setKey: string) => ({ setKey, mainStat: "none", mainValue: 0, subStats: [] });
const wear = (setKey: string, n: number) => sumArtifactStats(Array.from({ length: n }, () => piece(setKey)));
const near = (a: number | undefined, b: number) => assert(Math.abs((a ?? 0) - b) < 1e-9, `${a} ≠ ${b}`);

// Barème par univers ; le bonus à 4 pièces remplace celui à 2 pièces
near(wear("one-piece", 1).attack, 0);
near(wear("one-piece", 2).attack, 0.05);
near(wear("one-piece", 4).attack, 0.1); near(wear("one-piece", 4).crit, 0.15); near(wear("one-piece", 4).critDamage, 0);
near(wear("naruto", 2).dodge, 0.05); near(wear("naruto", 4).dodge, 0.1); near(wear("naruto", 4).speedPct, 0.15);
near(wear("jujutsu-kaisen", 2).magicDamage, 0.05); near(wear("jujutsu-kaisen", 4).magicDamage, 0.15); near(wear("jujutsu-kaisen", 4).gaugePerSpell, 50);
near(wear("dragon-ball", 2).physDamage, 0.1); near(wear("dragon-ball", 2).defense, 0.1); near(wear("dragon-ball", 4).physDamage, 0.2); near(wear("dragon-ball", 4).defense, 0.2);
near(wear("bleach", 2).bleedBonus, 0.25); near(wear("bleach", 4).bleedBonus, 0.4); near(wear("bleach", 4).precision, 1);
// Deux sets différents s'additionnent chacun pour leurs propres pièces
const mixed = sumArtifactStats([...Array(2).fill(piece("naruto")), ...Array(2).fill(piece("bleach"))]);
near(mixed.dodge, 0.05); near(mixed.bleedBonus, 0.25);
// Set inconnu : ignoré
near(sumArtifactStats([piece("inconnu"), piece("inconnu")]).attack, 0);

// Type de dégâts : physique par défaut
assert.equal(damageKind({ characterId: 1, type: "COMBAT", franchiseId: null }), "physical");
assert.equal(damageKind({ characterId: 1, type: "MAGIE", franchiseId: null }), "magic");
assert.equal(damageKind({ characterId: 1, type: "COMBAT", franchiseId: 113415 }), "magic");
assert.equal(damageKind({ characterId: 68, type: "COMBAT", franchiseId: null }), "physical", "un élément ne change pas le type de dégâts");

// Moteur
const base: BattleCard = { characterId: 999999, attack: 1000, defense: 500, rarity: "SSR", type: "COMBAT", power: 1, franchiseId: null, noSpell: true };
const dummy: BattleCard = { ...base, characterId: 999998 };
const unit = (card: Partial<BattleCard>) => createBattle([{ ...base, ...card }], [dummy], () => 0.5, { spells: false }).teams.A[0];
assert.equal(unit({}).speed, 100);
near(unit({ artifactStats: wear("naruto", 4) }).speed, 115);
near(unit({ artifactStats: wear("dragon-ball", 4) }).def, 600);

const firstHit = (attacker: Partial<BattleCard>, target: Partial<BattleCard> = {}) => {
  const st = createBattle([{ ...base, ...attacker }], [{ ...dummy, ...target }], () => 0.99, { spells: false, startingSide: "A" });
  applyAction(st, autoAction(st));
  return st.log.filter((e) => e.kind === "damage")[0] as { amount: number };
};
const plain = firstHit({}).amount;
near(firstHit({ artifactStats: wear("dragon-ball", 4) }).amount / plain, 1.2);
near(firstHit({ artifactStats: wear("jujutsu-kaisen", 4) }).amount / plain, 1 ); // physique : pas de bonus magique
near(firstHit({ type: "MAGIE", artifactStats: wear("jujutsu-kaisen", 4) }).amount / firstHit({ type: "MAGIE" }).amount, 1.15);

// Esquive plafonnée à 60 % ; la précision l'ignore
const precise = battle([{ ...base, artifactStats: wear("bleach", 4) }], [{ ...dummy, artifactStats: { ...wear("naruto", 4), dodge: 5 } }], () => 0.1, { spells: false, startingSide: "A" });
assert.equal(precise.log.filter((e) => e.kind === "dodge").length, 0, "précision : aucune esquive");
const evasive = battle([{ ...base }], [{ ...dummy, artifactStats: { ...wear("naruto", 4), dodge: 5 } }], () => 0.1, { spells: false, startingSide: "A" });
assert(evasive.log.some((e) => e.kind === "dodge"), "sans précision, rng bas esquive toujours (0,1 < 0,6)");
const capped = battle([{ ...base }], [{ ...dummy, artifactStats: { ...wear("naruto", 4), dodge: 5 } }], () => 0.7, { spells: false, startingSide: "A" });
assert.equal(capped.log.filter((e) => e.kind === "dodge").length, 0, "au-delà de 60 % jamais esquivé");
console.log("check-sets ok");

// JJK : un sort actif gagne 50 points de jauge, sans modifier la charge de base.
{
  const st = createBattle([{ ...base, noSpell: false, spell: { name: "Test", target: "foe", effects: [{ k: "damage", mult: 1 }] }, ultimate: { name: "Ultime", target: "foe", effects: [{ k: "damage", mult: 1 }] }, artifactStats: wear("jujutsu-kaisen", 4) }], [dummy], () => 0.99, { startingSide: "A" });
  st.teams.A[0].pIn = 0;
  applyAction(st, { spell: "special", target: "B1" });
  assert.equal(st.teams.A[0].ultimateGauge, 50);
}
