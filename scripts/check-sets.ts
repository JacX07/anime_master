import assert from "node:assert/strict";
import { applyAction, autoAction, battle, createBattle, type BattleCard } from "../src/lib/battle";
import { sumArtifactStats } from "../src/lib/artifact-stats";
import { replayAll } from "../src/lib/battle-replay";
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

// Lot 6 : les paliers remplacent les précédents, ils ne s'additionnent pas.
near(wear("attack-on-titan", 2).hp, 0.15); near(wear("attack-on-titan", 4).defense, 0.15);
near(wear("attack-on-titan", 2).titanGuard, 0); near(wear("attack-on-titan", 4).titanGuard, 1);
near(wear("demon-slayer", 2).crit, 0.1); near(wear("demon-slayer", 4).crit, 0.15);
near(wear("fairy-tail", 2).elementalDamage, 0.15); near(wear("fairy-tail", 4).elementalDamage, 0.3);
near(firstHit({ artifactStats: { ...wear("demon-slayer", 4), crit: 0 } }).amount / plain, 2500 / 2375);

const elementalHit = (id: number, pieces: number, spell: "base" | "special" = "special", noElement = false) => {
  const st = createBattle([{ ...base, characterId: id, noSpell: false, noElement, noBasicAttack: true,
    spell: { name: "Élément test", target: "foe", effects: [{ k: "damage", mult: 1 }] }, artifactStats: wear("fairy-tail", pieces) }], [dummy], () => 0.99, { startingSide: "A", combos: false });
  st.teams.B[0].shield = 0;
  st.teams.A[0].pIn = 0;
  applyAction(st, { spell, target: "B1" });
  return { amount: (st.log.find((e) => e.kind === "damage") as { amount: number }).amount, st };
};
for (const id of [68, 6, 13, 17, 11]) { // Feu, eau, foudre, air, terre
  near(elementalHit(id, 4).amount / elementalHit(id, 0).amount, 1.3);
  near(elementalHit(id, 2).amount / elementalHit(id, 0).amount, 1.15);
  near(elementalHit(id, 4, "base").amount / elementalHit(id, 0, "base").amount, 1);
}
near(elementalHit(999999, 4).amount / elementalHit(999999, 0).amount, 1);
near(elementalHit(68, 4, "special", true).amount / elementalHit(68, 0, "special", true).amount, 1);
near(elementalHit(68, 4).st.teams.B[0].fx.find((f) => f.key === "burn")?.amount, 0.065);

// Le Titan réagit après le coup, indépendamment des autres effets de réduction.
const titanBattle = (lethal = false) => {
  const st = createBattle([{ ...base, noBasicAttack: true, attack: lethal ? 100000 : 800 }], [{ ...dummy, artifactStats: wear("attack-on-titan", 4) }], () => 0.99, { startingSide: "A", spells: false, combos: false });
  const t = st.teams.B[0];
  t.hp = t.maxHp * 0.51; t.shield = 0;
  applyAction(st, { spell: "base", target: "B1" });
  return st;
};
{
  const st = titanBattle(); const t = st.teams.B[0];
  assert(t.hp > 0 && t.hp < t.maxHp * 0.5);
  near(t.shield, t.maxHp * 0.5); assert(t.titanTriggered);
  assert.equal(t.fx.find((f) => f.key === "titan")?.turns, 2);
  // Un autre bouclier posé après celui du Titan doit survivre à son expiration.
  st.round = 2; // Isoler l’expiration du Titan de celle du bouclier du second camp.
  t.shield += 123;
  t.fx.push({ key: "reduce", amount: 0.2, turns: 5, fresh: false });
  for (let i = 0; i < 2; i++) { st.slot = 1; applyAction(st, { spell: "base", target: "A1" }); }
  assert(!t.fx.some((f) => f.key === "titan")); near(t.shield, 123);
  assert(t.fx.some((f) => f.key === "reduce"));
  t.hp = t.maxHp * 0.51; st.slot = 0; applyAction(st, { spell: "base", target: "B1" });
  assert.equal(st.log.filter((e) => e.kind === "status" && e.status === "titan" && e.on).length, 1, "pas de réarmement après soin");
}
{
  const st = titanBattle(true); const t = st.teams.B[0];
  assert.equal(t.hp, 0); assert(!t.titanTriggered); assert.equal(t.shield, 0);
}
{
  // DoT : déclenchement dans finishUnitTurn, puis exactement deux actions protégées.
  const st = createBattle([base], [{ ...dummy, artifactStats: wear("attack-on-titan", 4) }], () => 0.99, { startingSide: "A", spells: false, combos: false });
  const t = st.teams.B[0]; t.hp = t.maxHp * 0.51; t.shield = 0;
  t.fx.push({ key: "poison", amount: 0.02, turns: 5, fresh: false });
  st.slot = 1; applyAction(st, { spell: "base", target: "A1" });
  assert.equal(t.fx.find((f) => f.key === "titan")?.turns, 2);
  const hp = t.hp; st.slot = 1; applyAction(st, { spell: "base", target: "A1" });
  near(hp - t.hp, t.maxHp * 0.01);
  assert.equal(t.fx.find((f) => f.key === "titan")?.turns, 1);
  st.slot = 1; applyAction(st, { spell: "base", target: "A1" });
  assert(!t.fx.some((f) => f.key === "titan"));
}
console.log("check-sets lot 6 ok");

// La réduction s'applique au coup suivant, puis seule la part Titan restante expire.
{
  const st = titanBattle(); const t = st.teams.B[0]; st.round = 2;
  const first = st.log.find((e) => e.kind === "damage") as { amount: number };
  const shield = t.shield;
  st.slot = 0; applyAction(st, { spell: "base", target: "B1" });
  const second = st.log.filter((e) => e.kind === "damage").at(-1) as { amount: number; absorbed: number };
  near(second.amount, first.amount * 0.5); near(t.titanShield, shield - second.absorbed);
  t.fx.push({ key: "reduce", amount: 0.4, turns: 5, fresh: false });
  st.slot = 0; applyAction(st, { spell: "base", target: "B1" });
  const capped = st.log.filter((e) => e.kind === "damage").at(-1) as { amount: number };
  near(capped.amount, first.amount * 0.3); // plafond commun 70 %
}

// Journal du nouveau statut : même état final dans le moteur et le lecteur.
for (const gauge of [false, true]) {
  const st = createBattle([{ ...base, artifactStats: wear("attack-on-titan", 4) }], [{ ...dummy, attack: 1300 }], () => 0.99, { gauge, spells: false, combos: false, startingSide: "A" });
  for (let i = 0; i < 300 && !st.result; i++) applyAction(st, autoAction(st));
  assert(st.result);
  assert(st.log.some((e) => e.kind === "status" && e.status === "titan" && e.on));
  const rp = replayAll(st.log);
  for (const u of [...st.teams.A, ...st.teams.B]) { near(rp.units[u.id].hp, u.hp); near(rp.units[u.id].shield, u.shield); }
}
console.log("Titan : réduction, plafond commun, absorption et replay conformes sur les deux ordonnanceurs.");
