import assert from "node:assert/strict";
import { applyAction, autoAction, battle, createBattle, currentActor, seededRandom, type BattleCard, type BattleState } from "../src/lib/battle";
import { ULTIMATE_CATALOG } from "../src/lib/ultimate-catalog";

/** Passifs du 2026-11-16 : Emilia, Momo, Gojo, Aizen, Toji ; ultime de Sukuna. */
const card = (characterId: number, extra: Partial<BattleCard> = {}): BattleCard => ({ characterId, rarity: "SSR", type: "COMBAT", attack: 100, defense: 1000, power: 1, franchiseId: null, noBasicAttack: true, noUltimate: true, noTertiary: true, ...extra });
const life = (s: BattleState, side: "A" | "B", i: number) => s.teams[side][i].hp + s.teams[side][i].shield;
const until = (s: BattleState, id: string) => { for (let i = 0; currentActor(s)?.id !== id; i++) { assert(i < 40); applyAction(s, autoAction(s)); } };

// Toji : aucun dégât d'un attaquant magique, dégâts normaux d'un attaquant physique
{
  const s = createBattle([card(999001, { type: "MAGIE" })], [card(162722)], () => 0.99, { startingSide: "A" });
  const before = life(s, "B", 0);
  until(s, "A1"); applyAction(s, { spell: "base", target: "B1" });
  assert.equal(life(s, "B", 0), before, "Toji ignore la magie");
  const p = createBattle([card(999001)], [card(162722)], () => 0.99, { startingSide: "A" });
  const hp = life(p, "B", 0);
  until(p, "A1"); applyAction(p, { spell: "base", target: "B1" });
  assert(life(p, "B", 0) < hp, "Toji subit le physique");
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
