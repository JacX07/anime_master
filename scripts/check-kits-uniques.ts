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
const SAITAMA = 73935, DIO = 4004, YUUTA = 129571, JOHAN = 719, GRIFFITH = 424;
// Saitama : un seul sort, K.O. en un coup, puis il sort sans être K.O. ; boss : 30 % des PV max
{
  assert.equal(TERTIARY_SPELLS[SAITAMA], undefined);
  assert.equal(ULTIMATE_CATALOG[SAITAMA], undefined);
  const s = createBattle([card(SAITAMA), dummy({ defense: 1e9 })], [dummy({ defense: 1e9 }), dummy({ defense: 1e9 })], () => 0.5, { startingSide: "A" });
  until(s, "A1");
  assert.deepEqual(legalActions(s).map((a) => a.spell), ["special"], "pas d'attaque de base");
  applyAction(s, { spell: "special", target: "B1" });
  assert.equal(s.teams.B[0].hp, 0, "cible K.O.");
  assert(s.teams.A[0].hp > 0 && s.teams.A[0].out, "Saitama sort sans être K.O.");
  assert(!evs(s).some((e) => e.kind === "ko" && e.target === "A1"));
  for (let i = 0; i < 6; i++) { const a = currentActor(s); assert(a && a.id !== "A1", "Saitama ne joue plus"); applyAction(s, autoAction(s)); }
  const b = createBattle([card(SAITAMA)], [dummy({ boss: true, defense: 1e9 })], () => 0.5, { startingSide: "A" });
  until(b, "A1");
  const max = b.teams.B[0].maxHp, shield = b.teams.B[0].shield;
  applyAction(b, { spell: "special", target: "B1" });
  assert(Math.abs(max - b.teams.B[0].hp - (max * 0.3 - shield)) < 1, "boss : 30 % des PV max");
  assert.equal(b.result?.winner, "B", "seul et sorti, Saitama perd");
}
// Dio : Za Warudo étourdit tous les ennemis, sauf les boss
{
  const s = createBattle([card(DIO, { startGauge: 100 })], [dummy(), dummy(), dummy({ boss: true })], () => 0.5, { startingSide: "A" });
  until(s, "A1");
  applyAction(s, { spell: "ultimate", target: null });
  assert.equal(new Set(evs(s).filter((e) => e.kind === "status" && e.status === "stun" && e.on).map((e) => e.kind === "status" && e.target)).size, 2, "deux étourdis");
  assert(evs(s).some((e) => e.kind === "resist" && e.target === "B3"), "le boss résiste");
}
// Yuuta : copie le dernier sort lancé par n'importe qui, à 80 %
{
  const s = createBattle([card(YUUTA), card(NETERO)], [dummy({ defense: 1e9 }), dummy({ defense: 1e9 })], () => 0.5, { startingSide: "A" });
  until(s, "A1");
  applyAction(s, { spell: "base", target: "B1" });
  until(s, "A2");
  applyAction(s, { spell: "special", target: "B1" });
  until(s, "A1");
  applyAction(s, { spell: "special", target: "B1" });
  const act = [...evs(s)].reverse().find((e) => e.kind === "action" && e.actor === "A1");
  assert(act?.kind === "action" && act.name === "Copie : Paumes", `Yuuta copie un allié (${act?.kind === "action" ? act.name : ""})`);
}
// Johan : peur sur tous, manipulation, élimination ciblée
{
  const s = createBattle([card(JOHAN, { startGauge: 100 })], [dummy(), dummy()], () => 0.5, { startingSide: "A" });
  until(s, "A1");
  applyAction(s, { spell: "special", target: null });
  assert.equal(s.teams.B.filter((x) => x.fx.some((f) => f.key === "dread")).length, 2, "peur sur tous");
  until(s, "A1");
  applyAction(s, { spell: "ultimate", target: "B1" });
  assert(s.teams.B[0].fx.some((f) => f.key === "vulnerable" && f.amount === 0.25 && f.turns === 3));
  let skipped = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const d = createBattle([card(NETERO)], [card(JOHAN)], seededRandom(seed), { startingSide: "A" });
    d.teams.A[0].fx.push({ key: "dread", amount: 0.5, turns: 2, fresh: false });
    until(d, "A1");
    applyAction(d, { spell: "special", target: "B1" });
    if (d.teams.A[0].palms === 0) skipped++;
  }
  assert(skipped > 70 && skipped < 130, `peur : ${skipped}/200 tours perdus`);
  // Manipulé : son buff d'équipe profite aux ennemis
  const m = createBattle([card(NETERO), dummy()], [card(JOHAN), dummy()], () => 0.5, { startingSide: "A" });
  m.teams.A[0].fx.push({ key: "puppet", amount: 0, turns: 2, fresh: false });
  until(m, "A1");
  applyAction(m, { spell: "tertiary", target: null });
  assert(m.teams.A[0].fx.every((f) => f.key !== "critDamageUp"), "le manipulé ne garde pas son buff");
  assert(m.teams.B.some((x) => x.fx.some((f) => f.key === "critDamageUp")), "le buff part chez l'ennemi");
}
// Griffith : leader +15 % ATK, saignement, Éclipse
{
  const lead = createBattle([card(GRIFFITH), dummy()], [dummy()], () => 0.5);
  const tail = createBattle([dummy(), card(GRIFFITH)], [dummy()], () => 0.5);
  assert(Math.abs(lead.teams.A[1].atk / tail.teams.A[0].atk - 1.15) < 1e-6, "+15 % en première position");
  const s = createBattle([card(GRIFFITH, { startGauge: 100 }), dummy(), dummy()], [dummy({ defense: 1e9 }), dummy({ defense: 1e9 })], () => 0.5, { startingSide: "A" });
  until(s, "A1");
  applyAction(s, { spell: "special", target: "B1" });
  assert.equal(s.teams.B[0].fx.find((f) => f.key === "bleed")?.stacks, 1, "saignement");
  until(s, "A1");
  const hp = s.teams.A[0].hp, allies = s.teams.A[1].hp + s.teams.A[2].hp;
  applyAction(s, { spell: "ultimate", target: null });
  assert.equal(s.teams.A[1].hp + s.teams.A[2].hp, 0, "alliés sacrifiés");
  assert(Math.abs(s.teams.A[0].hp - hp - allies) < 1, "PV restants récupérés");
  until(s, "A1");
  const before = evs(s).length;
  applyAction(s, { spell: "base", target: "B1" });
  assert.equal(new Set(evs(s).slice(before).filter((e) => e.kind === "damage" && e.source === "A1").map((e) => e.kind === "damage" && e.target)).size, 2, "Main de Dieu : la base touche tout le monde");
}
// Combats complets sans erreur
for (let seed = 1; seed <= 200; seed++) {
  const ids = [MADARA, NETERO, ANTI, MERUEM, SAITAMA, DIO, YUUTA, JOHAN, GRIFFITH, 5, 62, 1086];
  const pick = (n: number) => ids[(seed * 7 + n * 3) % ids.length];
  battle([card(pick(0)), card(pick(1)), card(pick(2)), card(pick(3))], [card(pick(4)), card(pick(5)), card(pick(6)), card(pick(7))], seededRandom(seed), { gauge: seed % 2 === 0 });
}

// Lot du 2026-11-16 : Levi, Gojo, Cid, Maomao, Madara
{
  const LEVI = 45627, GOJO = 127691, CID = 136837, MAOMAO = 126824;
  const foes = () => [1, 2, 3, 4].map(() => dummy({ defense: 1000000, attack: 1 }));
  const ultimate = (id: number, rng: number, target: string | null = "B1") => {
    const s = createBattle([card(id, { startGauge: 100 })], foes(), () => rng, { startingSide: "A" });
    until(s, "A1");
    applyAction(s, { spell: "ultimate", target });
    return s.log;
  };
  // Levi (skill-overrides.json) : +50 points de critique (15 % de base → 65 %), +20 % des PV max de la cible
  const leviHit = (rng: number) => ultimate(LEVI, rng).find((e) => e.kind === "damage" && e.source === "A1");
  assert(leviHit(0.6)?.kind === "damage" && leviHit(0.6)!.crit, "Levi : critique à 60 % de tirage");
  assert(leviHit(0.7)?.kind === "damage" && !leviHit(0.7)!.crit, "Levi : plus de critique assuré");
  // Gojo : les quatre ennemis étourdis
  assert.equal(ultimate(GOJO, 0.5, null).filter((e) => e.kind === "status" && e.status === "stun" && e.on).length, 4, "Gojo étourdit tout le monde");
  // Cid : I am Atomic frappe les quatre ennemis
  assert.equal(new Set(ultimate(CID, 0.5, null).filter((e) => e.kind === "damage" && e.source === "A1").map((e) => e.kind === "damage" && e.target)).size, 4, "Cid frappe tout le monde");
  // Maomao : immunisée contre poison et brûlure
  for (const burn of [false, true]) {
    const s = createBattle([card(999003, { startGauge: 100, ultimate: { name: "Nuage", target: null, effects: [{ k: "poison", pct: 0.1, turns: 2, to: "foes", burn }] } })], [card(MAOMAO, { defense: 1000000, attack: 1 })], () => 0.5, { startingSide: "A" });
    until(s, "A1");
    applyAction(s, { spell: "ultimate", target: null });
    assert(s.log.some((e) => e.kind === "resist" && e.target === "B1"), `Maomao résiste (${burn ? "brûlure" : "poison"})`);
    assert(!s.teams.B[0].fx.some((f) => f.key === "poison" || f.key === "burn"), "aucun effet sur la durée");
  }
  // Madara : Katon pose une brûlure, ×2,1 ATK
  {
    const s = createBattle([card(MADARA)], foes(), () => 0.5, { startingSide: "A" });
    until(s, "A1");
    applyAction(s, { spell: "tertiary", target: null });
    assert(s.log.some((e) => e.kind === "status" && e.status === "burn" && e.on), "Katon brûle");
    assert(!s.log.some((e) => e.kind === "status" && e.status === "poison" && e.on), "Katon n'empoisonne plus");
  }
}
console.log("check-kits ok");
