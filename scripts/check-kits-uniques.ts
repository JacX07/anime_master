import assert from "node:assert/strict";
import { applyAction, autoAction, battle, createBattle, currentActor, legalActions, seededRandom, type BattleCard, type BattleState } from "../src/lib/battle";
import { spellOf } from "../src/lib/spells";
import { TERTIARY_SPELLS } from "../src/lib/tertiary-catalog";
import { ULTIMATE_CATALOG } from "../src/lib/ultimate-catalog";

/** Kits du 2026-11-16 : Madara, Netero, Anti-Spirale, Meruem (docs/specs/combat.md). */
const MADARA = 53901, NETERO = 14489, ANTI = 5115, MERUEM = 23277;
const card = (characterId: number, extra: Partial<BattleCard> = {}): BattleCard => ({ characterId, rarity: "UR", type: "COMBAT", attack: 1000, defense: 1000, power: 1, franchiseId: null, ...extra });
const dummy = (extra: Partial<BattleCard> = {}) => card(999001, { rarity: "N", attack: 1, ...extra });
const until = (s: BattleState, id: string) => { for (let i = 0; currentActor(s)?.id !== id; i++) { assert(i < 60, `tour de ${id}`); applyAction(s, autoAction(s)); } };
const evs = (s: BattleState) => s.log;

// Meruem : aucun sort au départ, puis absorption du premier ennemi tombé
{
  assert.equal(spellOf(MERUEM, "UR", "COMBAT"), null);
  assert.equal(TERTIARY_SPELLS[MERUEM], undefined);
  assert.equal(ULTIMATE_CATALOG[MERUEM], undefined);
  const s = createBattle([card(MERUEM, { attack: 50000 })], [card(5, { rarity: "UR", defense: 1, attack: 10 }), dummy({ defense: 100000 })], () => 0.5, { startingSide: "A" });
  assert.equal(s.teams.A[0].spell, null);
  until(s, "A1");
  applyAction(s, { spell: "base", target: "B1" });
  const kit = evs(s).find((e) => e.kind === "kit" && e.target === "A1");
  assert(kit && kit.kind === "kit" && kit.slot === "ultimate" && kit.source === "B1", "Meruem absorbe l'ultime d'Ichigo");
  assert(s.teams.A[0].ultimate, "ultime gardé");
}

// Anti-Spirale : intouchable, aucun buff, défaite quand ses alliés tombent, ultime une fois par combat
{
  const s = createBattle([card(999002, { attack: 50000, rarity: "N" })], [card(ANTI), dummy({ defense: 1, attack: 1 })], () => 0.5, { startingSide: "A" });
  until(s, "A1");
  assert(!legalActions(s).some((a) => a.targets.includes("B1")), "Anti-Spirale n'est pas ciblable");
  applyAction(s, { spell: "base", target: "B2" });
  assert(s.result, "combat terminé");
  assert.equal(s.result!.winner, "A", "l'équipe de l'Anti-Spirale perd quand son allié tombe");
}
{
  const r = battle([card(ANTI)], [dummy({ defense: 100000, attack: 1 })], seededRandom(3), { maxRounds: 3 });
  assert.equal(r.winner, "B", "seul, l'Anti-Spirale perd aussitôt");
  const s = createBattle([card(ANTI, { startGauge: 100 }), dummy({ defense: 100000 })], [dummy({ defense: 100000, attack: 1 }), dummy({ defense: 100000, attack: 1 })], () => 0.5, { startingSide: "A" });
  until(s, "A1");
  applyAction(s, { spell: "ultimate", target: null });
  s.teams.A[0].ultimateGauge = 100;
  until(s, "A1");
  assert(!legalActions(s).some((a) => a.spell === "ultimate"), "Big Bang une seule fois");
  assert(!s.teams.A[0].fx.some((f) => f.key.endsWith("Up")), "aucun buff");
}

// Netero : paumes de plus en plus fortes, Paume zéro, Kannon double les frappes
{
  const s = createBattle([card(NETERO)], [dummy({ defense: 1e9 })], () => 0.5, { startingSide: "A" });
  const names: string[] = [];
  for (let i = 0; i < 5; i++) {
    until(s, "A1");
    if (!legalActions(s).some((a) => a.spell === "special")) { applyAction(s, { spell: "base", target: "B1" }); i--; continue; }
    applyAction(s, { spell: "special", target: "B1" });
    const last = [...evs(s)].reverse().find((e) => e.kind === "action" && e.actor === "A1");
    if (last?.kind === "action") names.push(last.name ?? "");
  }
  assert.deepEqual(names, ["Paumes : Première paume", "Paumes : Troisième paume", "Paumes : 99ᵉ paume", "Paumes : Paume zéro", "Paumes : Première paume"]);
  const k = createBattle([card(NETERO, { startGauge: 100 })], [dummy({ defense: 1e9 })], () => 0.5, { startingSide: "A" });
  until(k, "A1");
  applyAction(k, { spell: "ultimate", target: "B1" });
  until(k, "A1");
  if (!legalActions(k).some((a) => a.spell === "special")) { applyAction(k, { spell: "base", target: "B1" }); until(k, "A1"); }
  const before = evs(k).length;
  applyAction(k, { spell: "special", target: "B1" });
  const hits = evs(k).slice(before).filter((e) => (e.kind === "damage" || e.kind === "dodge") && e.source === "A1").length;
  assert.equal(hits, 2, "Kannon : la paume frappe deux fois");
}

// Madara : clones au premier Rinnegan, Susanoo (Copie, Kyūbi, immunité), retour au kit, soin
{
  const s = createBattle([card(MADARA, { startGauge: 100 })], [dummy({ defense: 1e9, attack: 1 })], () => 0.5, { startingSide: "A" });
  assert(s.teams.A[0].fx.some((f) => f.key === "regen"), "Cellules d'Hashirama");
  until(s, "A1");
  applyAction(s, { spell: "special", target: null });
  assert.equal(s.teams.A[0].clones, 2, "deux clones");
  until(s, "A1");
  applyAction(s, { spell: "ultimate", target: null });
  assert.equal(s.teams.A[0].spell?.name, "Copie");
  assert.equal(s.teams.A[0].tertiary?.name, "Kyūbi");
  assert(evs(s).some((e) => e.kind === "kit" && e.slot === "special"), "événement de kit");
  for (let i = 0; i < 4; i++) { until(s, "A1"); applyAction(s, { spell: "base", target: "B1" }); }
  assert.equal(s.teams.A[0].spell?.name, "Rinnegan : Pression gravitationnelle", "kit rendu après le Susanoo");
}
{
  // Clones : sur 300 coups ciblés, environ 2 sur 3 sont interceptés tant qu'il reste des clones
  let intercepted = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const s = createBattle([dummy({ attack: 10 })], [card(MADARA, { defense: 1e9 })], seededRandom(seed), { startingSide: "A" });
    s.teams.B[0].clones = 2;
    until(s, "A1");
    applyAction(s, { spell: "base", target: "B1" });
    if (s.teams.B[0].clones === 1) intercepted++;
  }
  assert(intercepted > 160 && intercepted < 240, `clones ${intercepted}/300`);
}
// Combats complets sans erreur
for (let seed = 1; seed <= 200; seed++) {
  const ids = [MADARA, NETERO, ANTI, MERUEM, 5, 62, 127691, 1086];
  const pick = (n: number) => ids[(seed * 7 + n * 3) % ids.length];
  battle([card(pick(0)), card(pick(1)), card(pick(2)), card(pick(3))], [card(pick(4)), card(pick(5)), card(pick(6)), card(pick(7))], seededRandom(seed), { gauge: seed % 2 === 0 });
}
console.log("check-kits ok");
