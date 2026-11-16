import assert from "node:assert/strict";
import { applyAction, autoAction, battle, createBattle, currentActor, seededRandom, type BattleCard, type BattleState } from "../src/lib/battle";
import type { CharacterSpell } from "../src/lib/spells";
import { parseSpell } from "../src/lib/spell-schema";
import { ULTIMATE_CATALOG } from "../src/lib/ultimate-catalog";

/** Passifs du 2026-11-16 : Emilia, Momo, Gojo, Aizen, Toji ; ultime de Sukuna. */
const card = (characterId: number, extra: Partial<BattleCard> = {}): BattleCard => ({ characterId, rarity: "SSR", type: "COMBAT", attack: 100, defense: 1000, power: 1, franchiseId: null, noBasicAttack: true, noUltimate: true, noTertiary: true, ...extra });
const life = (s: BattleState, side: "A" | "B", i: number) => s.teams[side][i].hp + s.teams[side][i].shield;
const until = (s: BattleState, id: string) => { for (let i = 0; currentActor(s)?.id !== id; i++) { assert(i < 40); applyAction(s, autoAction(s)); } };

// Toji : nature du sort lancé, indépendante du type et de la franchise du lanceur.
{
  const cast = (type: BattleCard["type"], spell: CharacterSpell | null, slot: "base" | "special" | "tertiary" | "ultimate", franchiseId: number | null = null, model?: CharacterSpell) => {
    const s = createBattle([card(999001, { type, franchiseId, spell: spell ?? undefined, tertiary: spell ?? undefined, ultimate: spell ?? undefined, noTertiary: false, noUltimate: false })], [card(162722)], () => .99, { startingSide: "A", elements: false, combos: false, franchise: false });
    until(s, "A1");
    s.teams.A[0].pIn = 0; s.teams.A[0].tIn = 0; s.teams.A[0].ultimateGauge = 100;
    s.lastAnySpell = model ?? null;
    const before = life(s, "B", 0);
    applyAction(s, { spell: slot, target: "B1" });
    return { s, damage: before - life(s, "B", 0) };
  };
  const hit = (damageKind?: CharacterSpell["damageKind"], zone = false): CharacterSpell => ({ name: "Frappe test", damageKind, target: "foe", final: true, effects: [{ k: "damage", mult: 1, zone }] });
  assert(cast("MAGIE", null, "base").damage > 0, "Une attaque de base Magie touche Toji");
  assert(cast("COMBAT", null, "base", 113415).damage > 0, "Une attaque physique JJK touche Toji");
  for (const slot of ["special", "tertiary", "ultimate"] as const) {
    assert.equal(cast("COMBAT", hit("magic"), slot).damage, 0, `Sort magique hors type Magie : ${slot}`);
    assert(cast("MAGIE", hit("physical"), slot, 113415).damage > 0, `Sort physique d'un lanceur Magie/JJK : ${slot}`);
    assert.equal(cast("MAGIE", hit(), slot).damage, 0, `Compétence Magie par défaut : ${slot}`);
  }
  assert.equal(cast("COMBAT", hit("magic", true), "special").damage, 0, "Zone magique bloquée");
  const withDot = (damageKind: "magic" | "physical"): CharacterSpell => ({ ...hit(damageKind), effects: [{ k: "poison", pct: .05, turns: 2, to: "target" }, { k: "stun", turns: 1, count: 1 }] });
  const magic = cast("COMBAT", withDot("magic"), "special").s;
  assert(!magic.teams.B[0].fx.some((f) => f.key === "poison"), "Dégâts sur la durée magiques bloqués");
  assert(magic.log.some((event) => event.kind === "status" && event.target === "B1" && event.status === "stun" && event.on), "Toji n'est pas immunisé aux contrôles");
  assert(cast("MAGIE", withDot("physical"), "special").s.teams.B[0].fx.some((f) => f.key === "poison"), "Dégâts sur la durée physiques conservés");
  const physicalModel = cast("COMBAT", hit(), "special").s.lastAnySpell!;
  const magicModel = cast("MAGIE", hit(), "special").s.lastAnySpell!;
  assert.equal(physicalModel.damageKind, "physical");
  assert.equal(magicModel.damageKind, "magic");
  const copy: CharacterSpell = { name: "Copie test", target: "foe", final: true, effects: [{ k: "copySpell", mult: .8, from: "all" }] };
  assert(cast("MAGIE", copy, "special", null, physicalModel).damage > 0, "Copie physique par un mage : touche Toji");
  assert.equal(cast("COMBAT", copy, "special", null, magicModel).damage, 0, "Copie magique par un combattant : bloquée");
  for (const kind of ["physical", "magic"] as const) assert.equal(parseSpell(hit(kind))?.damageKind, kind, "Le builder préserve la nature");
  assert.equal(parseSpell({ ...hit(), damageKind: "invalide" }), null);
  const roster = createBattle([card(162722, { type: "MAGIE", noTertiary: false, noUltimate: false })], [card(53901, { noTertiary: false })], () => .99);
  assert.equal(roster.teams.A[0].spell?.damageKind, "physical", "Lance inversée physique");
  assert.equal(roster.teams.A[0].ultimate?.damageKind, "physical", "Chaîne physique");
  assert.equal(roster.teams.B[0].tertiary?.damageKind, "magic", "Katon magique malgré le type COMBAT");
  for (const type of ["MAGIE", "COMBAT"] as const) {
    const absorbed = createBattle([card(23277, { attack: 50000, noUltimate: false })], [card(999002, { type, defense: 1, noUltimate: false, ultimate: hit() }), card(162722)], () => .99, { startingSide: "A", elements: false, combos: false, franchise: false });
    until(absorbed, "A1"); applyAction(absorbed, { spell: "base", target: "B1" });
    assert.equal(absorbed.teams.A[0].ultimate?.damageKind, type === "MAGIE" ? "magic" : "physical", "Absorption garde la nature source");
    until(absorbed, "A1"); absorbed.teams.A[0].ultimateGauge = 100;
    const before = life(absorbed, "B", 1);
    applyAction(absorbed, { spell: "ultimate", target: "B2" });
    assert.equal(life(absorbed, "B", 1) === before, type === "MAGIE", "Immunité sur le sort absorbé");
  }

}

// Aizen : sur 200 attaques, environ la moitié frappe un allié de l'attaquant
{
  let redirected = 0, total = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const s = createBattle([card(999001), card(999002, { defense: 100000 })], [card(1086, { defense: 100000 })], seededRandom(seed), { startingSide: "A" });
    until(s, "A1");
    const ally = life(s, "A", 1);
    applyAction(s, { spell: "base", target: "B1" });
    total++;
    if (life(s, "A", 1) < ally) redirected++;
  }
  assert(redirected > total * 0.35 && redirected < total * 0.65, `Aizen redirige ${redirected}/${total}`);
}

// Momo : refuse poison, brûlure et saignement
{
  const s = createBattle([card(62)], [card(222594)], () => 0.99, { startingSide: "A" });
  until(s, "A1"); applyAction(s, { spell: "base", target: "B1" });
  assert(!s.teams.B[0].fx.some((f) => f.key === "bleed"), "Momo sans saignement");
}

// Sukuna : l'ultime pose 3 tours de dégâts sur la durée
{
  const ult = ULTIMATE_CATALOG[133701];
  const dot = ult?.effects.find((e) => e.k === "poison");
  assert.equal(dot && "turns" in dot ? dot.turns : 0, 3);
}

// Emilia : à sa mort, Colère de Puck part toute seule (combat complet)
{
  let cast = 0;
  for (let seed = 1; seed <= 30 && !cast; seed++) {
    const r = battle([card(88572, { noUltimate: false, defense: 1, attack: 50 })], [card(999001, { attack: 5000 })], seededRandom(seed));
    cast += r.log.filter((e) => e.kind === "action" && e.actor === "A1" && e.spell === "ultimate").length;
  }
  assert(cast > 0, "Colère de Puck lancée à la mort d'Emilia");
}
console.log("check-passives ok");
