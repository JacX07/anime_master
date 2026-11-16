import assert from "node:assert/strict";
import { applyAction, autoAction, battle, createBattle, currentActor, decisionOf, legalActions, seededRandom, type BattleCard, type BattleState } from "../src/lib/battle";
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

// Anti-Spirale : intouchable, aucun buff, défaite quand ses alliés tombent, ultime relançable (2026-11-16 : plus de limite par combat)
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
  assert(legalActions(s).some((a) => a.spell === "ultimate"), "Big Bang relançable une fois la jauge pleine");
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
// Lot 3 : Yuuta apprend (ou non) un sort lancé par un ennemi, même hors de son tour ; copie à 80 %
{
  const setup = () => {
    const s = createBattle([card(YUUTA), dummy({ defense: 1e9 })], [card(NETERO, { defense: 1e9 }), dummy({ defense: 1e9 })], () => 0.5, { startingSide: "B" });
    until(s, "B1");
    applyAction(s, { spell: "special", target: "A2" });
    return s;
  };
  const s = setup();
  assert.equal(currentActor(s)?.id, "A1", "Yuuta décide aussitôt");
  assert.deepEqual(legalActions(s), [{ spell: "decide", targets: [null], choices: ["learn", "ignore"] }]);
  applyAction(s, { spell: "decide", target: null, choice: "learn" });
  const copy = s.teams.A[0].spell!;
  assert.equal(copy.name, "Copie : Paumes");
  const dmg = copy.effects.find((e) => e.k === "damage");
  assert(dmg?.k === "damage" && Math.abs(dmg.mult - 1.2 * 0.8) < 1e-9, "copie à 80 %");
  assert(evs(s).some((e) => e.kind === "kit" && e.target === "A1" && e.source === "B1"), "événement de kit");
  const ignored = setup();
  const before = ignored.teams.A[0].spell?.name;
  applyAction(ignored, { spell: "decide", target: null, choice: "ignore" });
  assert.equal(ignored.teams.A[0].spell?.name, before, "ignorer garde le sort");
  assert.deepEqual(autoAction(setup()), { spell: "decide", target: null, choice: "learn" }, "Auto : apprend");
  // Un allié ne déclenche pas de copie
  const ally = createBattle([card(YUUTA), card(NETERO)], [dummy({ defense: 1e9 })], () => 0.5, { startingSide: "A" });
  until(ally, "A2");
  applyAction(ally, { spell: "special", target: "B1" });
  assert(!ally.pending?.length, "pas de copie d'un allié");
}
// Lot 3 : Chrollo vole les sorts ennemis dans un livre de 2 pages ; livre plein : remplacer une page ou garder
{
  const CHROLLO = 58;
  const s = createBattle([card(CHROLLO), dummy({ defense: 1e9 })], [card(NETERO, { defense: 1e9 }), card(SAITAMA, { defense: 1e9 })], () => 0.5, { startingSide: "B" });
  const page = (k: "spell" | "tertiary") => (s.teams.A[0] as { spell: { name: string } | null; tertiary: { name: string } | null })[k]?.name ?? null;
  assert.equal(page("spell"), null, "livre vide");
  assert.equal(s.teams.A[0].ultimate, null, "pas d'ultime");
  until(s, "B1");
  applyAction(s, { spell: "special", target: "A2" });
  applyAction(s, { spell: "decide", target: null, choice: "learn" });
  assert.equal(page("spell"), "Copie : Paumes", "page 1");
  s.pending = [{ unit: "A1", kind: "steal", spell: { name: "Bleu", target: "foe", effects: [{ k: "damage", mult: 1 }] }, source: "B1" }];
  applyAction(s, { spell: "decide", target: null, choice: "learn" });
  assert.equal(page("tertiary"), "Copie : Bleu", "page 2");
  s.pending = [{ unit: "A1", kind: "steal", spell: { name: "Rouge", target: "foe", effects: [{ k: "damage", mult: 1 }] }, source: "B1" }];
  assert.deepEqual(legalActions(s)[0].choices, ["page:0", "page:1", "ignore"], "livre plein");
  applyAction(s, { spell: "decide", target: null, choice: "page:0" });
  assert.equal(page("spell"), "Copie : Rouge", "page 1 remplacée");
}
// Lot 3 : Madara n'apprend que sous Susanoo, à 100 %
{
  const s = createBattle([card(MADARA), dummy({ defense: 1e9 })], [card(NETERO, { defense: 1e9 })], () => 0.5, { startingSide: "B" });
  until(s, "B1");
  applyAction(s, { spell: "special", target: "A2" });
  assert(!s.pending?.length, "pas de copie hors Susanoo");
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
  assert(s.teams.A[0].maxHp >= hp + allies - 1, "PV max augmentés des PV récupérés");
  // Renfort du 2026-11-16 : ignore toute la DEF (DEF 1e9 ignorée) et 50 % de vol de vie sur ses sorts
  const dealt = evs(s).slice(before).find((e) => e.kind === "damage" && e.source === "A1" && e.target === "B1");
  assert(dealt?.kind === "damage" && dealt.amount + dealt.absorbed > 1000, "Main de Dieu : DEF entièrement ignorée");
  until(s, "A1");
  const g = s.teams.A[0];
  g.hp = g.maxHp * 0.2;
  g.pIn = 0;
  const low = g.hp, from = evs(s).length;
  applyAction(s, { spell: "special", target: "B1" });
  const spellDmg = evs(s).slice(from).reduce((n, e) => n + (e.kind === "damage" && e.source === "A1" ? e.amount + e.absorbed : 0), 0);
  assert(spellDmg > 0 && Math.abs(g.hp - low - spellDmg * 0.5) < 1, "Main de Dieu : sorts rendent 50 % des dégâts");
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
  const ultimate = (id: number, rng: number, target: `B${number}` | null = "B1") => {
    const s = createBattle([card(id, { startGauge: 100 })], foes(), () => rng, { startingSide: "A" });
    until(s, "A1");
    applyAction(s, { spell: "ultimate", target });
    return s.log;
  };
  // Levi (skill-overrides.json) : +50 points de critique (15 % de base → 65 %), +20 % des PV max de la cible
  const leviCrit = (rng: number) => ultimate(LEVI, rng).some((e) => e.kind === "damage" && e.source === "A1" && e.crit);
  assert(leviCrit(0.6), "Levi : critique à 60 % de tirage");
  assert(!leviCrit(0.7), "Levi : plus de critique assuré");
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

// Lot 2 du 2026-11-16 : Sukuna, Netero, Gilgamesh, Saitama
{
  const SUKUNA = 133701, GILGAMESH = 2514, SAITAMA = 73935, ICHIGO = 5;
  // Sukuna : entaille sur tous les ennemis, aucun soin reçu pendant qu'elle dure
  {
    const s = createBattle([card(SUKUNA, { startGauge: 100 })], [1, 2].map(() => dummy({ defense: 1000000, attack: 1 })), () => 0.5, { startingSide: "A" });
    until(s, "A1");
    applyAction(s, { spell: "ultimate", target: null });
    assert.equal(s.teams.B.filter((b) => b.fx.some((f) => f.key === "gash")).length, 2, "entaille sur tous les ennemis");
    assert(!s.log.some((e) => e.kind === "status" && e.status === "poison" && e.on), "plus de poison");
    const foe = s.teams.B[0];
    foe.hp = foe.maxHp / 2;
    const healer = createBattle([card(999004, { startGauge: 100, ultimate: { name: "Soin", target: null, effects: [{ k: "heal", pct: 0.5, to: "team" }] } })], [dummy()], () => 0.5, { startingSide: "A" });
    healer.teams.A[0].fx.push({ key: "gash", amount: 0.08, turns: 2, fresh: false });
    healer.teams.A[0].hp = healer.teams.A[0].maxHp / 2;
    until(healer, "A1");
    const hp = healer.teams.A[0].hp;
    applyAction(healer, { spell: "ultimate", target: null });
    assert(healer.teams.A[0].hp <= hp, "pas de soin sous entaille");
  }
  // Netero : Kannon 4 tours, puis il rejoue aussitôt ; une paume à chaque action
  {
    const s = createBattle([card(NETERO, { startGauge: 100 })], [dummy({ defense: 1000000, attack: 1 })], () => 0.5, { startingSide: "A" });
    until(s, "A1");
    applyAction(s, { spell: "ultimate", target: "B1" });
    assert.equal(s.teams.A[0].fx.find((f) => f.key === "kannon")?.turns, 4, "Kannon 4 tours");
    assert(legalActions(s).some((a) => a.spell === "special"), "paume dès le tour rejoué");
    applyAction(s, { spell: "special", target: "B1" });
    until(s, "A1");
    assert(legalActions(s).some((a) => a.spell === "special"), "paume de nouveau à l'action suivante");
    assert.equal(currentActor(s)?.id, "A1", "Netero rejoue aussitôt");
    // Seul ennemi restant intouchable : pas de tour rejoué sans cible (plantait dans autoAction)
    const u = createBattle([card(NETERO, { startGauge: 100 })], [dummy({ defense: 1000000, attack: 1 })], () => 0.5, { startingSide: "A", gauge: true });
    until(u, "A1");
    u.teams.B[0].fx.push({ key: "intangible", amount: 0, turns: 1, fresh: false });
    u.teams.B.push({ ...u.teams.B[0], id: "B2", fx: [] });
    u.teams.B[1].hp = 1;
    u.teams.B[1].shield = 0;
    applyAction(u, { spell: "ultimate", target: "B2" });
    assert.notEqual(currentActor(u)?.id, "A1", "pas de tour rejoué quand plus aucun ennemi n'est atteignable");
  }
  // Susanoo dissipé : le kit d'origine revient avant le choix de l'action (Meruem sans sort d'origine plantait)
  {
    const s = createBattle([card(MERUEM)], [dummy({ defense: 1000000, attack: 1 })], () => 0.5, { startingSide: "A" });
    const m = s.teams.A[0];
    m.kitBackup = { spell: null, tertiary: null };
    m.spell = spellOf(MADARA, "UR", "COMBAT");
    until(s, "A1");
    assert.equal(s.teams.A[0].spell, null, "kit d'origine rendu dès que Meruem est l'acteur");
    assert(!legalActions(s).some((a) => a.spell === "special"), "plus de sort Susanoo à lancer");
  }
  // Gilgamesh : désarme les porteurs d'épée, +25 % par désarmé ; un désarmé sans autre sort passe son tour
  {
    const run = (foes: BattleCard[]) => {
      const s = createBattle([card(GILGAMESH, { startGauge: 100 })], foes, () => 0.5, { startingSide: "A" });
      until(s, "A1");
      applyAction(s, { spell: "ultimate", target: null });
      return s;
    };
    const swords = run([card(ICHIGO, { defense: 1000000, attack: 1, noSpell: true }), dummy({ defense: 1000000, attack: 1 })]);
    assert(swords.teams.B[0].fx.some((f) => f.key === "disarm"), "Ichigo désarmé");
    assert(!swords.teams.B[1].fx.some((f) => f.key === "disarm"), "sans épée : pas désarmé");
    const none = run([dummy({ defense: 1000000, attack: 1 }), dummy({ defense: 1000000, attack: 1 })]);
    const dmg = (st: BattleState, id: string) => st.log.find((e) => e.kind === "damage" && e.source === "A1" && e.target === id);
    const a = dmg(swords, "B2"), b = dmg(none, "B2");
    assert(a?.kind === "damage" && b?.kind === "damage" && Math.abs(a.amount / b.amount - 1.25) < 1e-6, "+25 % par ennemi désarmé");
    until(swords, "A1");
    assert(swords.log.some((e) => e.kind === "skip" && e.actor === "B1"), "Ichigo désarmé passe son tour");
  }
  // Saitama : jamais d'attaque de base, son coup est prêt dès le premier tour
  {
    const s = createBattle([card(SAITAMA)], [dummy({ defense: 1000000, attack: 1 })], () => 0.5, { startingSide: "A" });
    until(s, "A1");
    assert.deepEqual(legalActions(s).map((a) => a.spell), ["special"], "Saitama : un seul sort");
  }
}
// Lot 3 — Yhwach : Auswählen sur les alliés choisis, retrait du pouvoir, The Almighty
{
  const YHWACH = 68537;
  assert.equal(spellOf(YHWACH, "UR", "COMBAT")?.name, "Auswählen");
  assert.equal(TERTIARY_SPELLS[YHWACH], undefined, "ni tertiaire");
  assert.equal(ULTIMATE_CATALOG[YHWACH], undefined, "ni ultime");
  const s = createBattle([card(YHWACH), card(5, { rarity: "UR" }), dummy({ defense: 1000000 })], [dummy({ defense: 1000000, attack: 1 })], () => 0.5, { startingSide: "A", gauge: true });
  until(s, "A1");
  const aus = legalActions(s).find((a) => a.spell === "special");
  assert.deepEqual(aus?.choices, ["A2", "A3"], "Auswählen : les alliés vivants au choix");
  assert(!legalActions(s).some((a) => a.spell === "withdraw"), "rien à retirer avant la bénédiction");
  assert.throws(() => applyAction(s, { spell: "special", target: null, choice: "A1" }), "Yhwach ne se bénit pas");
  s.teams.A[1].hp = s.teams.A[1].maxHp * 0.5;
  const hp = s.teams.A[1].hp;
  applyAction(s, { spell: "special", target: null, choice: "A2" });
  assert.equal(s.teams.A[1].fx.find((f) => f.key === "blessed")?.amount, 0.5, "+50 % de dégâts finaux");
  assert(!s.teams.A[2].fx.some((f) => f.key === "blessed"), "seulement les alliés choisis");
  assert(Math.abs(s.teams.A[1].hp - hp - s.teams.A[1].maxHp * 0.3) < 1, "soin de 30 % des PV max");
  until(s, "A1");
  const w = legalActions(s).find((a) => a.spell === "withdraw");
  assert.deepEqual(w?.targets, ["A2"], "retrait possible sur l'allié béni");
  const ichigo = s.teams.A[1];
  applyAction(s, { spell: "withdraw", target: "A2" });
  assert.equal(ichigo.hp, 0, "l'allié meurt");
  assert.equal(currentActor(s)?.id, "A1", "la fenêtre s'ouvre pour Yhwach");
  const d = decisionOf(s);
  assert(d?.kind === "absorb" && d.offer?.some((o) => o.slot === "ultimate"), "compétences de l'allié proposées");
  applyAction(s, { spell: "decide", target: null, choice: "take:ultimate" });
  assert.equal(s.teams.A[0].ultimate?.name, ichigo.ultimate?.name, "ultime pris");
  assert.equal(currentActor(s)?.id, "A1", "le retrait ne coûte pas son tour");
  assert(legalActions(s).some((a) => a.spell === "base"), "Yhwach joue encore");
  // Auto : Yhwach seul ne tente pas Auswählen (plantait avec « Action impossible »)
  {
    const solo = createBattle([card(YHWACH)], [dummy({ defense: 1000000, attack: 1 })], () => 0.5, { startingSide: "A", gauge: true });
    until(solo, "A1");
    assert.notEqual(autoAction(solo).spell, "special", "pas d'Auswählen sans allié");
    applyAction(solo, autoAction(solo));
  }
  // Auto : jamais de retrait
  for (let g = 0; g < 30; g++) {
    const r = battle([card(YHWACH), card(5, { rarity: "UR" }), card(40, { rarity: "UR" })], [card(27, { rarity: "UR" }), card(62, { rarity: "UR" })], seededRandom(g), { gauge: true });
    assert(!r.log.some((e) => e.kind === "kit" && e.target === "A1"), "Auto : aucun sacrifice");
  }
}
// The Almighty : un coup fatal le laisse à 1 PV, il joue aussitôt ; une seule fois
{
  const s = createBattle([card(68537, { defense: 1 }), dummy({ defense: 1000000 })], [card(999003, { rarity: "N", attack: 1000000 })], () => 0.5, { startingSide: "B", gauge: true });
  until(s, "B1");
  applyAction(s, { spell: "base", target: "A1" });
  assert.equal(s.teams.A[0].hp, 1, "reste à 1 PV");
  assert.equal(currentActor(s)?.id, "A1", "joue aussitôt");
  applyAction(s, { spell: "base", target: "B1" });
  until(s, "B1");
  applyAction(s, { spell: "base", target: "A1" });
  assert.equal(s.teams.A[0].hp, 0, "une seule fois par combat");
}
// ── Lot 4 (2026-11-17) ───────────────────────────────────────────────────────────
const MAOMAO = 126824, DAZAI = 89198, FRIEREN = 176754, VIOLET = 90169, LIGHT = 80, MARIN = 133676, ASKELADD = 13020, CHIKA = 121103;
const fxOf = (s: BattleState, id: string, key: string) => s.teams[id[0] as "A" | "B"][Number(id.slice(1)) - 1].fx.filter((f) => f.key === key);
// Poison cumulable, 10 malus au plus
{
  const s = createBattle([card(MAOMAO, { attack: 1 })], [dummy({ defense: 1e9, attack: 1 })], () => 0.1, { startingSide: "A" });
  for (let i = 0; i < 14; i++) { until(s, "A1"); applyAction(s, { spell: "base", target: "B1" }); }
  const stacks = fxOf(s, "B1", "poison").length;
  assert(stacks >= 2, `le poison se cumule (${stacks})`);
  const malus = s.teams.B[0].fx.length;
  assert(malus <= 10, `10 malus au plus (${malus})`);
  // Un tour de poison retire bien des PV pour chaque cumul
  const b = s.teams.B[0];
  b.fx = [];
  for (let i = 0; i < 12; i++) b.fx.push({ key: "poison", amount: 0.01, turns: 5, fresh: false, source: "A1" });
  assert.equal(b.fx.length, 12);
}
{
  const s = createBattle([card(MAOMAO, { attack: 1 })], [dummy({ defense: 1e9, attack: 1 })], () => 0.1, { startingSide: "A" });
  const b = s.teams.B[0];
  for (let i = 0; i < 9; i++) b.fx.push({ key: "atkDown", stat: "atk", amount: -0.01 * (i + 1), turns: 5, fresh: false, source: "A1" });
  until(s, "A1");
  applyAction(s, { spell: "base", target: "B1" });
  assert.equal(fxOf(s, "B1", "poison").length, 1, "10e malus accepté");
  until(s, "A1");
  applyAction(s, { spell: "base", target: "B1" });
  assert(b.fx.filter((f) => f.key !== "atkDown").length <= 1 && b.fx.length <= 10, "11e malus refusé");
}
// Maomao : secondaire (poison de zone + poison renforcé), ultime (explosion), tertiaire (purge et soin)
{
  const s = createBattle([card(MAOMAO, { startGauge: 100 }), dummy({ defense: 1e9 })], [dummy({ defense: 1e9, attack: 1 }), dummy({ defense: 1e9, attack: 1 })], () => 0.5, { startingSide: "A" });
  until(s, "A1");
  applyAction(s, { spell: "special", target: null });
  assert(fxOf(s, "B1", "poison").length === 1 && fxOf(s, "B2", "poison").length === 1 && fxOf(s, "B1", "toxic").length === 1, "poison et poison renforcé sur tous les ennemis");
  const b = s.teams.B[0];
  b.fx.push({ key: "poison", amount: 0.05, turns: 3, fresh: false, source: "A1" });
  until(s, "A1");
  const before = b.hp;
  applyAction(s, { spell: "ultimate", target: null });
  const boom = [...s.log].reverse().find((e) => e.kind === "poison" && e.target === "B1");
  assert(boom && boom.kind === "poison" && Math.abs(boom.amount - b.maxHp * 0.1 * 1.25) < 1, "explosion : 2 cumuls × 5 % × 1,25");
  assert(b.hp < before);
  const m = s.teams.A[0];
  m.fx.push({ key: "atkDown", stat: "atk", amount: -0.2, turns: 3, fresh: false }, { key: "defDown", stat: "def", amount: -0.2, turns: 3, fresh: false });
  m.hp = m.maxHp * 0.3;
  m.tIn = 0;
  until(s, "A1");
  const hp = m.hp;
  applyAction(s, { spell: "tertiary", target: null });
  assert.equal(m.fx.filter((f) => f.key === "atkDown" || f.key === "defDown").length, 0, "malus retirés");
  assert(Math.abs(m.hp - hp - m.maxHp * 0.25) < 1, "soin 15 % + 2 × 5 %");
}
// Dazai : Contact dissipe les buffs ; Plan de secours ; immunité magique ; passif −30 % magique
{
  const s = createBattle([card(DAZAI, { startGauge: 100 })], [card(5, { rarity: "UR", attack: 1 }), dummy({ defense: 1e9, attack: 1 })], () => 0.5, { startingSide: "A" });
  s.teams.B[0].fx.push({ key: "atkUp", stat: "atk", amount: 0.3, turns: 3, fresh: false });
  until(s, "A1");
  applyAction(s, { spell: "special", target: "B1" });
  assert.equal(fxOf(s, "B1", "atkUp").length, 0, "Contact dissipe les buffs");
  assert.equal(s.teams.A[0].specialCd, 2, "recharge courte");
  until(s, "A1");
  applyAction(s, { spell: "tertiary", target: null });
  assert(fxOf(s, "B1", "noCrit").length && fxOf(s, "B2", "vulnerable")[0]?.amount === 0.25, "Plan de secours sur tous les ennemis");
  until(s, "A1");
  applyAction(s, { spell: "ultimate", target: null });
  assert(fxOf(s, "A1", "antiMagic").length, "immunité magique");
}
{
  // Un sort magique ne touche pas une carte sous immunité magique
  const s = createBattle([card(DAZAI)], [card(89361, { rarity: "UR", type: "MAGIE", startGauge: 100 })], () => 0.5, { startingSide: "B" });
  s.teams.A[0].fx.push({ key: "antiMagic", amount: 0, turns: 3, fresh: false });
  until(s, "B1");
  const hp = s.teams.A[0].hp;
  applyAction(s, autoAction(s).spell === "ultimate" ? { spell: "ultimate", target: legalActions(s).find((a) => a.spell === "ultimate")!.targets[0] } : autoAction(s));
  assert.equal(s.teams.A[0].hp, hp, "aucun dégât magique");
}
// Frieren : soin de 25 % de SES PV max ; ultime ×3,1
{
  assert.equal(ULTIMATE_CATALOG[FRIEREN]?.effects.find((e) => e.k === "damage")?.k === "damage" && (ULTIMATE_CATALOG[FRIEREN]!.effects.find((e) => e.k === "damage") as { mult: number }).mult, 3.1);
  const s = createBattle([card(FRIEREN, { attack: 3000 }), dummy({ attack: 10, defense: 10000 })], [dummy({ defense: 1e9, attack: 1 })], () => 0.5, { startingSide: "A" });
  const ally = s.teams.A[1];
  ally.hp = 1;
  until(s, "A1");
  applyAction(s, { spell: "special", target: null });
  assert(Math.abs(ally.hp - 1 - s.teams.A[0].maxHp * 0.25) < 1, "25 % des PV max de Frieren");
}
// Violet : tir ×2, Poing mécanique étourdit, Lettre, Poupée de souvenirs
{
  const s = createBattle([card(VIOLET, { startGauge: 100 }), dummy({ defense: 1e9 })], [dummy({ defense: 1e9, attack: 1 }), dummy({ defense: 1e9, attack: 1 })], () => 0.5, { startingSide: "A" });
  until(s, "A1");
  applyAction(s, { spell: "special", target: "B2" });
  assert(s.log.some((e) => e.kind === "status" && e.target === "B2" && e.status === "stun" && e.on), "la cible choisie est étourdie");
  until(s, "A1");
  applyAction(s, { spell: "tertiary", target: null });
  assert.equal(fxOf(s, "A2", "critDamageUp")[0]?.amount, 0.5, "équipe +50 % de dégâts critiques");
  until(s, "A1");
  const turns = fxOf(s, "A2", "critUp")[0].turns;
  applyAction(s, { spell: "ultimate", target: null });
  assert.equal(fxOf(s, "A2", "critUp")[0].turns, turns + 2, "buffs prolongés de 2 tours");
  const sh = [...s.log].reverse().find((e) => e.kind === "shield" && e.target === "A2");
  assert(sh?.kind === "shield" && Math.abs(sh.amount - s.teams.A[0].maxHp * 0.25) < 1, "bouclier 15 % + 2 buffs × 5 %");
}
// Light : Marquer un nom (rampe), Death Note (exécution sous 30 %), Contrôle
{
  const s = createBattle([card(LIGHT, { startGauge: 100 }), card(999004, { rarity: "N", attack: 300 })], [dummy({ defense: 1, attack: 1 }), dummy({ defense: 1, attack: 1 })], () => 0.5, { startingSide: "A" });
  until(s, "A1");
  applyAction(s, { spell: "ultimate", target: null });
  assert(fxOf(s, "B1", "deathNote").length, "marque");
  const b = s.teams.B[0];
  b.hp = b.maxHp * 0.31;
  until(s, "A2");
  applyAction(s, { spell: "base", target: "B1" });
  assert.equal(b.hp, 0, "exécuté sous 30 %");
}
{
  const s = createBattle([card(LIGHT), dummy({ attack: 1000, defense: 1e9 })], [dummy({ defense: 1e9, attack: 1 })], () => 0.5, { startingSide: "A" });
  until(s, "A1");
  applyAction(s, { spell: "special", target: "B1" });
  const mark = s.log.length;
  for (let i = 0; i < 3; i++) { until(s, "A2"); applyAction(s, { spell: "base", target: "B1" }); }
  // Light et l'allié ont la même ATK : les coups successifs valent 100 %, 125 %, 150 %…
  const hits = s.log.slice(mark).filter((e) => e.kind === "damage" && e.target === "B1").map((e) => (e.kind === "damage" ? e.amount : 0));
  assert(hits.length >= 3 && hits.slice(0, 3).every((h, k) => Math.abs(h / hits[0] - (1 + 0.25 * k)) < 0.01), `+25 % de plus à chaque coup (${hits.join(", ")})`);
}
{
  // Contrôle : avec un sort prêt, la cible joue pour Light ; sans, elle est étourdie
  const s = createBattle([card(LIGHT), dummy({ defense: 1e9 })], [card(5, { rarity: "UR", attack: 1 }), dummy({ defense: 1e9, attack: 1 })], () => 0.5, { startingSide: "A" });
  until(s, "A1");
  s.teams.B[0].pIn = 0;
  applyAction(s, { spell: "tertiary", target: "B1" });
  assert.equal(s.teams.B[0].side, "A", "la cible passe dans le camp de Light");
  const t = createBattle([card(LIGHT), dummy({ defense: 1e9 })], [card(5, { rarity: "UR", attack: 1 }), dummy({ defense: 1e9, attack: 1 })], () => 0.5, { startingSide: "A" });
  until(t, "A1");
  t.teams.B[0].pIn = 3; t.teams.B[0].tIn = 3;
  applyAction(t, { spell: "tertiary", target: "B1" });
  assert(t.log.some((e) => e.kind === "status" && e.target === "B1" && e.status === "stun" && e.on), "sans sort prêt : étourdie");
}
// Marin : Cosplay parfait, Couture (recharge 7), Shizuku-tan (immunité, −3 recharges des alliés)
{
  const s = createBattle([card(MARIN, { startGauge: 100 }), card(5, { rarity: "UR" })], [dummy({ defense: 1e9, attack: 1 })], () => 0.5, { startingSide: "A" });
  assert.equal(s.teams.A[0].tertiaryCd, 7, "Couture : 7 tours");
  until(s, "A1");
  applyAction(s, { spell: "special", target: null });
  assert(fxOf(s, "A2", "atkUp")[0]?.amount === 0.5 && fxOf(s, "A2", "auraPierce")[0]?.amount === 0.3, "ATK +50 % et 30 % d'ignore-DEF");
  s.teams.A[1].pIn = 3; s.teams.A[1].tIn = 3;
  until(s, "A1");
  applyAction(s, { spell: "ultimate", target: null });
  assert(fxOf(s, "A2", "immune").length && s.teams.A[1].pIn === 0 && s.teams.A[1].tIn === 0, "immunité et −3 tours de recharge");
}
// Askeladd : Duel (verrou mutuel, base seulement), Stratège, saignements doublés en tête
{
  const s = createBattle([card(ASKELADD, { startGauge: 100 }), card(5, { rarity: "UR" })], [card(40, { rarity: "UR", attack: 1, defense: 1e9 }), card(62, { rarity: "UR", attack: 1, defense: 1e9 })], () => 0.5, { startingSide: "A" });
  until(s, "A1");
  applyAction(s, { spell: "ultimate", target: "B1" });
  assert(fxOf(s, "A1", "critUp").length && fxOf(s, "A1", "auraPierce")[0]?.amount === 0.3, "Askeladd renforcé");
  until(s, "A2");
  assert(!legalActions(s).find((a) => a.spell === "base")?.targets.includes("B1"), "personne d'autre n'atteint l'ennemi en duel");
  applyAction(s, autoAction(s));
  until(s, "B1");
  assert.deepEqual(legalActions(s).map((a) => a.spell), ["base"], "l'ennemi n'a que son attaque de base");
  assert.deepEqual(legalActions(s)[0].targets, ["A1"], "il ne peut viser qu'Askeladd");
  assert.equal(autoAction(s).spell, "base");
}
{
  const s = createBattle([card(ASKELADD), card(5, { rarity: "UR" })], [dummy({ defense: 1e9, attack: 1 })], () => 0.5, { startingSide: "A" });
  s.teams.A[1].pIn = 3; s.teams.A[1].tIn = 3;
  until(s, "A1");
  applyAction(s, { spell: "special", target: null });
  assert(s.teams.A[1].pIn === 1 && s.teams.A[1].tIn === 1, "Stratège : −2 tours");
  // Saignement doublé : même saignement, Askeladd en tête ou non
  const tick = (lead: boolean) => {
    const team = lead ? [card(ASKELADD, { noSpell: true, noTertiary: true }), card(422, { rarity: "UR" })] : [card(422, { rarity: "UR" }), card(ASKELADD, { noSpell: true, noTertiary: true })];
    const t = createBattle(team, [dummy({ defense: 1e9, attack: 1 })], () => 0.5, { startingSide: "B" });
    t.teams.B[0].fx.push({ key: "bleed", amount: 0.02, turns: Infinity, fresh: false, stacks: 1, source: lead ? "A2" : "A1" });
    until(t, "B1");
    applyAction(t, { spell: "base", target: "A1" });
    const e = t.log.find((x) => x.kind === "poison" && x.target === "B1");
    return e?.kind === "poison" ? e.amount : 0;
  };
  assert.equal(tick(true), tick(false) * 2, "saignement doublé avec Askeladd en tête");
}
// Chika : ATK et DEF +40 %, vitesse et jauge de tour, provocation
{
  const s = createBattle([card(CHIKA, { startGauge: 100 }), card(5, { rarity: "UR" })], [dummy({ defense: 1e9, attack: 1 })], () => 0.5, { startingSide: "A", gauge: true });
  until(s, "A1");
  applyAction(s, { spell: "special", target: null });
  assert(fxOf(s, "A2", "atkUp")[0]?.amount === 0.4 && fxOf(s, "A2", "defUp")[0]?.amount === 0.4, "ATK et DEF +40 %");
  until(s, "A1");
  s.teams.A[1].gauge = 0;
  applyAction(s, { spell: "tertiary", target: null });
  assert(fxOf(s, "A2", "speedUp").length && s.teams.A[1].gauge >= 3000, "vitesse et +30 % de jauge");
  until(s, "A1");
  applyAction(s, { spell: "ultimate", target: null });
  assert(fxOf(s, "A1", "taunt").length, "provocation");
}
// Robustesse : 3 000 combats au hasard avec les kits du lot 4
{
  const pool = [MAOMAO, DAZAI, FRIEREN, VIOLET, LIGHT, MARIN, ASKELADD, CHIKA, 5, 40, 62, 422, 89361, 53901, 14489, 68537, 58, 129571];
  const rng = seededRandom(404);
  for (let g = 0; g < 3000; g++) {
    const pick = () => Array.from({ length: 4 }, () => card(pool[Math.floor(rng() * pool.length)], { type: (["COMBAT", "MAGIE", "MYSTERE", "COEUR", "AVENTURE"] as const)[Math.floor(rng() * 5)] }));
    battle(pick(), pick(), seededRandom(g), { gauge: g % 2 === 0 });
  }
}
console.log("check-kits ok");
