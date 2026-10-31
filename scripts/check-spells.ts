// Vérification des sorts de personnage SSR/UR (docs/specs/combat.md §4 bis) : cooldown, poison mortel, silence, boss, immunité,
// purge, réanimation unique, coup qui traverse les boucliers, journal rejouable. Pur (aucune base).
// Usage : npm run check:spells

import { applyAction, autoAction, createBattle, currentActor, legalActions, seededRandom, type BattleCard, type BattleEvent, type BattleState } from "../src/lib/battle";
import { historyOf, replayAll } from "../src/lib/battle-replay";
import { SECONDARY_DATA, TERTIARY_DATA, ULTIMATE_DATA } from "../src/lib/skill-data";
import { BATTLE } from "../src/lib/battle";
import { describeSpell, isSoloBuff, type CharacterSpell } from "../src/lib/spells";

const CATALOGS = { special: SECONDARY_DATA, tertiary: TERTIARY_DATA, ultimate: ULTIMATE_DATA } as const;
const fx = <K extends string>(id: number, slot: keyof typeof CATALOGS, k: K) =>
  CATALOGS[slot][id]?.effects.find((e) => e.k === k) as { k: K; pct: number; turns: number } | undefined;

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

const SASUKE = 13, ITACHI = 14, KAKASHI = 85, CHOPPER = 309, MEGUMI = 126635, GAARA = 1662;
const GOJO = 127691;
const card = (characterId: number, o: Partial<BattleCard> = {}): BattleCard => ({
  characterId, rarity: "SSR", type: "MAGIE", attack: 1000, defense: 100000, power: 10, franchiseId: null, ...o,
});
const dummy = (i: number, o: Partial<BattleCard> = {}) => card(900000 + i, { rarity: "N", power: 1, attack: 10, ...o });
const start = (a: BattleCard[], b: BattleCard[]) => createBattle(a, b, seededRandom(7), { passive: false, franchise: false });
const evs = <K extends BattleEvent["kind"]>(st: BattleState, kind: K) => st.log.filter((e): e is Extract<BattleEvent, { kind: K }> => e.kind === kind);
const play = (st: BattleState, spell: "base" | "affinity" | "special" | "tertiary" | "ultimate", target: Parameters<typeof applyAction>[1]["target"]) => applyAction(st, { spell, target });
/** Fait jouer les cartes jusqu'à ce que ce soit au tour de `id`, en stratégie auto (sauf sorts de personnage, qu'on veut contrôler) */
function until(st: BattleState, id: string) {
  while (currentActor(st)?.id !== id) {
    const a = autoAction(st);
    play(st, "base", a.spell === "base" ? a.target : legalActions(st)[0].targets[0]);
  }
}

// Les catalogues réécrits alimentent bien les trois emplacements SSR/UR.
check("Catalogues runtime : 236 personnages dans les trois emplacements", Object.keys(SECONDARY_DATA).length === 236 && Object.keys(TERTIARY_DATA).length === 236 && Object.keys(ULTIMATE_DATA).length === 236);
{
  const spell: CharacterSpell = { name: "Lisibilité", target: "foe", effects: [{ k: "damage", mult: 4 }, { k: "mod", stat: "crit", amount: 0.25, turns: 2, to: "self" }] };
  check("Descriptions : multiplicateur réservé au détail, critique en points et durées en tours", !describeSpell(spell).includes("4×") && describeSpell(spell, true).includes("4× ATK") && describeSpell(spell).includes("+25 points") && describeSpell(spell).includes("2 tours"));
}

// Cooldown : prêt dès la 1re action, puis toutes les 5 actions
{
  const st = start([card(SASUKE), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  const ready: boolean[] = [];
  for (let i = 0; i < 8; i++) {
    until(st, "A1");
    const can = legalActions(st).some((x) => x.spell === "special");
    ready.push(can);
    play(st, can ? "special" : "base", "B1");
  }
  check("Cooldown secondaire : prêt dès la 1re action puis après 5 actions", ready.join() === "true,false,false,false,false,true,false,false", ready.map(Number).join(""));
  check("N, R et SR n'ont pas de sort de personnage", !legalActions(start([dummy(1), dummy(2), dummy(3), dummy(4)], [dummy(5), dummy(6), dummy(7), dummy(8)])).some((x) => x.spell === "special"));
}

// Poison : valeurs du tertiaire runtime de Sasuke
{
  const st = start([card(SASUKE), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "tertiary", "B1");
  const maxHp = st.log.find((e) => e.kind === "start") && (st.log[0] as Extract<BattleEvent, { kind: "start" }>).units.find((u) => u.id === "B1")!.maxHp;
  const poison = fx(SASUKE, "tertiary", "poison")!;
  for (let i = 0; i < 12 && evs(st, "poison").length < poison.turns; i++) {
    until(st, "A1");
    play(st, "base", "B2");
  }
  const ticks = evs(st, "poison").filter((e) => e.target === "B1");
  check("Poison : % des PV max par tour pendant la durée runtime", ticks.length === poison.turns && ticks.every((t) => Math.abs(t.amount - maxHp! * poison.pct) < 1e-6 || t.hp === 0), `${ticks.length} tic(s)`);
}
{
  const st = start([card(SASUKE), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "tertiary", "B1");
  const b1 = st.teams.B[0];
  b1.hp = b1.maxHp * 0.02;
  until(st, "B1");
  if (currentActor(st)?.id === "B1") play(st, "base", "A2");
  check("Poison mortel : la carte tombe", b1.hp === 0 && evs(st, "ko").some((e) => e.target === "B1"));
}

// Silence : bloque le sort affilié et le sort de personnage ; sans effet sur un boss ; immunité
{
  const st = start([card(ITACHI), dummy(1), dummy(2), dummy(3)], [dummy(4, { type: "COMBAT" }), dummy(5, { boss: true }), dummy(6), dummy(7)]);
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "special", "B1");
  check("Silence posé sur une carte ordinaire", evs(st, "status").some((e) => e.target === "B1" && e.status === "silence" && e.on));
  until(st, "B1");
  check("Silence : seul le sort de base est permis", legalActions(st).length === 1 && legalActions(st)[0].spell === "base");
}
{
  const st = start([card(ITACHI), dummy(1), dummy(2), dummy(3)], [dummy(4, { boss: true }), dummy(5), dummy(6), dummy(7)]);
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "special", "B1");
  check("Boss : le silence est refusé", !evs(st, "status").some((e) => e.status === "silence") && evs(st, "resist").some((e) => e.target === "B1"));
}
{
  const st = start([card(ITACHI), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  st.teams.B[0].fx.push({ key: "immune", amount: 0, turns: 5, fresh: false });
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "special", "B1");
  check("Immunité : silence et ATK − refusés", !evs(st, "status").some((e) => e.target === "B1" && (e.status === "silence" || e.status === "atkDown")) && evs(st, "resist").length >= 2);
}

// Purge : retire les malus de l'équipe
{
  const st = start([card(CHOPPER), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  st.teams.A[1].fx.push({ key: "silence", amount: 0, turns: 5, fresh: false }, { key: "poison", amount: 0.05, turns: 5, fresh: false });
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "tertiary", null);
  check("Purge : malus de l'équipe retirés", st.teams.A[1].fx.length === 0);
}

// Réanimation : une seule fois par combat
{
  const st = start([card(CHOPPER), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  st.teams.A[1].hp = 0;
  st.teams.A[2].hp = 0;
  st.teams.A[0].ultimateGauge = BATTLE.ultimateGaugeMax;
  until(st, "A1");
  const t = legalActions(st).find((x) => x.spell === "ultimate")!.targets;
  check("Réanimation : seuls les alliés morts sont ciblables", t.length === 2 && t.includes("A2") && t.includes("A3"));
  play(st, "ultimate", "A2");
  const a2 = st.teams.A[1];
  const revive = evs(st, "revive")[0];
  check("Réanimation : revient avec la part de PV max du sort puis reçoit le soin d'équipe", Math.abs(revive.hp - a2.maxHp * fx(CHOPPER, "ultimate", "revive")!.pct) < 1e-6 && a2.hp > revive.hp && evs(st, "revive").length === 1);
  for (let i = 0; i < 6; i++) { until(st, "A1"); play(st, "base", "B1"); }
  until(st, "A1");
  check("Réanimation : pas une deuxième fois", !legalActions(st).some((x) => x.spell === "ultimate"));
}

// Coup qui traverse les boucliers
{
  const st = start([card(KAKASHI, { rarity: "UR" }), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  st.teams.B[0].shield = 99999;
  st.teams.A[0].ultimateGauge = BATTLE.ultimateGaugeMax;
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "ultimate", "B1");
  const hits = evs(st, "damage").filter((e) => e.target === "B1");
  const last = hits[hits.length - 1];
  check("Traverse : le bouclier n'absorbe rien", last.source === "A1" && last.absorbed === 0 && last.shield > 0);
}

// Bouclier d'équipe plafonné, esquive d'effet
{
  const st = start([card(GAARA), card(MEGUMI, { rarity: "UR" }), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "special", null);
  const shieldPct = fx(GAARA, "special", "shield")!.pct;
  check("Bouclier personnel : part des PV max du sort", st.teams.A[0].shield >= st.teams.A[0].maxHp * shieldPct - 1e-6);
}

{
  const st = start([card(MEGUMI), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  play(st, "tertiary", null);
  until(st, "B1");
  check("Provocation : toutes les attaques ciblées visent le protecteur", legalActions(st).every((action) => action.targets.every((target) => target === "A1" || target === null || target.startsWith("B"))));
  check("Provocation : une autre cible est refusée", (() => {
    try { play(st, "base", "A2"); return false; } catch { return true; }
  })());
  st.teams.A[0].hp = 0;
  check("Provocateur mort : les autres ennemis redeviennent ciblables", legalActions(st)[0].targets.length === 3 && !legalActions(st)[0].targets.includes("A1"));
}
{
  const st = start([card(MEGUMI), dummy(1), dummy(2), dummy(3)], [card(SASUKE, { spell: { name: "Zone", target: null, effects: [{ k: "damage", mult: 0.5, zone: true }] } }), dummy(4), dummy(5), dummy(6)]);
  play(st, "tertiary", null);
  until(st, "B1");
  play(st, "special", null);
  check("Provocation : les dégâts de zone atteignent toujours les quatre alliés", new Set(evs(st, "damage").filter((event) => event.source === "B1").map((event) => event.target)).size === 4);
}
{
  const hit = (reduction: number) => {
    const st = start([dummy(1, { attack: 1000, power: 20, noBasicAttack: true }), dummy(2), dummy(3), dummy(4)], [dummy(5), dummy(6), dummy(7), dummy(8)]);
    st.teams.B[0].fx.push({ key: "reduce", amount: reduction, turns: 2, fresh: false });
    play(st, "base", "B1");
    return evs(st, "damage")[0].amount;
  };
  check("Réduction : −40 % de dégâts, cumul plafonné à −70 %", Math.abs(hit(0.4) / hit(0) - 0.6) < 1e-6 && Math.abs(hit(1.5) / hit(0) - 0.3) < 1e-6);
}
{
  const attempt = (crit: number, dodge: number, random: number) => {
    const st = start([dummy(1, { attack: 1000, power: 20, noBasicAttack: true }), dummy(2), dummy(3), dummy(4)], [dummy(5), dummy(6), dummy(7), dummy(8)]);
    st.rng = () => random;
    st.teams.A[0].fx.push({ key: crit > 0 ? "critUp" : "critDown", stat: "crit", amount: crit, turns: 2, fresh: false });
    st.teams.B[0].fx.push({ key: dodge > 0 ? "dodgeUp" : "dodgeDown", stat: "dodge", amount: dodge, turns: 2, fresh: false });
    play(st, "base", "B1");
    return st;
  };
  check("Critique : +85 points sur la base de 15 % atteint 100 %", evs(attempt(0.85, 0, 0.999), "damage")[0]?.crit === true);
  check("Critique : un malus ne descend pas sous 0 %", evs(attempt(-2, 0, 0), "damage")[0]?.crit === false);
  check("Esquive : 100 % permet d'esquiver un coup ordinaire", evs(attempt(0, 1, 0.999), "dodge").length === 1);
  check("Esquive : un malus ne descend pas sous 0 %", evs(attempt(0, -2, 0), "damage").length === 1);
}

{
  const st = start([card(GOJO, { rarity: "UR" }), dummy(1), dummy(2), dummy(3)], [dummy(4, { attack: 200 }), dummy(5, { attack: 150 }), dummy(6, { attack: 100 }), dummy(7, { attack: 50 })]);
  st.teams.A[0].ultimateGauge = BATTLE.ultimateGaugeMax;
  play(st, "ultimate", null);
  const stunned = evs(st, "status").filter((event) => event.status === "stun" && event.on).map((event) => event.target);
  check("Gojo : Extension du territoire étourdit exactement les deux ennemis à l'ATK la plus élevée", ULTIMATE_DATA[GOJO].name === "Extension du territoire" && stunned.join() === "B1,B2" && st.teams.A[0].ultimateGauge === 0);
  currentActor(st); currentActor(st);
  check("Étourdissement : un tour sauté immédiatement, sans rejouer l'événement à la lecture de l'état", currentActor(st)?.id === "A2" && evs(st, "skip").length === 1 && !evs(st, "action").some((event) => event.actor === "B1"));
  until(st, "A1");
  check("Étourdissement : chacun passe exactement un tour", evs(st, "skip").map((event) => event.actor).join() === "B1,B2");
  play(st, "base", "B3");
  check("Étourdissement : la cible peut rejouer au tour suivant", currentActor(st)?.id === "B1" && !st.teams.B[0].fx.some((effect) => effect.key === "stun"));
  const replay = replayAll(st.log);
  check("Étourdissement : rejeu et historique annoncent les tours passés", historyOf(st.log, st.log.length).filter((entry) => entry.name === "Étourdissement : tour passé").length === 2 && !replay.units.B1.fx.includes("stun"));
}
{
  const st = start([card(GOJO, { rarity: "UR", ultimate: { name: "Deux tours", target: null, effects: [{ k: "stun", turns: 2, count: 2 }] } }), dummy(1), dummy(2), dummy(3)], [dummy(4, { attack: 200 }), dummy(5, { attack: 150 }), dummy(6), dummy(7)]);
  st.teams.A[0].ultimateGauge = BATTLE.ultimateGaugeMax;
  play(st, "ultimate", null);
  const loaded: BattleState = { ...JSON.parse(JSON.stringify(st)), rng: seededRandom(7) };
  until(loaded, "A1");
  play(loaded, "base", "B3");
  until(loaded, "A1");
  check("Étourdissement : durée de deux tours préservée après sérialisation serveur", evs(loaded, "skip").map((event) => event.actor).join() === "B1,B2,B1,B2");
  play(loaded, "base", "B3");
  check("Étourdissement : pas de troisième tour perdu", currentActor(loaded)?.id === "B1");
}
{
  const st = start([card(GOJO, { rarity: "UR" }), dummy(1), dummy(2), dummy(3)], [dummy(4, { attack: 200 }), dummy(5, { attack: 150 }), dummy(6), dummy(7)]);
  st.teams.B[0].hp = 0;
  st.teams.B[2].hp = 0;
  st.teams.B[3].hp = 0;
  st.teams.A[0].ultimateGauge = BATTLE.ultimateGaugeMax;
  play(st, "ultimate", null);
  check("Gojo : un seul ennemi vivant ne reçoit qu'un étourdissement", evs(st, "status").filter((event) => event.status === "stun" && event.on).map((event) => event.target).join() === "B2");
}
{
  const st = start([card(GOJO, { rarity: "UR" }), dummy(1), dummy(2), dummy(3)], [dummy(4, { attack: 200 }), dummy(5, { attack: 150 }), dummy(6), dummy(7)]);
  const target = st.teams.B[0];
  st.teams.B[1].fx.push({ key: "stun", amount: 0, turns: 2, fresh: false });
  target.hp = target.maxHp / 2;
  target.pIn = 5;
  target.fx.push({ key: "poison", amount: 0.01, turns: 2, fresh: false }, { key: "regen", amount: 0.02, turns: 2, fresh: false });
  st.teams.A[0].ultimateGauge = BATTLE.ultimateGaugeMax;
  play(st, "ultimate", null);
  check("Tour passé : poison, régénération et recharges avancent", Math.abs(target.hp - target.maxHp * 0.51) < 1e-6 && target.pIn === 4 && evs(st, "poison").length === 1 && evs(st, "heal").length === 1);
  check("Étourdissement : une nouvelle application ne raccourcit pas une durée plus longue", st.teams.B[1].fx.find((effect) => effect.key === "stun")?.turns === 2);
}
{
  const st = start([card(GOJO, { rarity: "UR" }), dummy(1), dummy(2), dummy(3)], [dummy(4, { attack: 200, boss: true }), dummy(5, { attack: 150 }), dummy(6), dummy(7)]);
  st.teams.B[1].fx.push({ key: "immune", amount: 0, turns: 2, fresh: false });
  st.teams.A[0].ultimateGauge = BATTLE.ultimateGaugeMax;
  check("Gojo en auto : conserve l'ultime si ses deux cibles sont protégées", autoAction(st).spell !== "ultimate");
  play(st, "ultimate", null);
  check("Étourdissement : boss et immunité résistent, sans transfert vers une troisième cible", evs(st, "resist").length === 2 && !evs(st, "status").some((event) => event.status === "stun") && evs(st, "skip").length === 0);
}
{
  const st = start([card(CHOPPER), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  st.teams.A[1].fx.push({ key: "stun", amount: 0, turns: 1, fresh: false });
  play(st, "tertiary", null);
  until(st, "A2");
  check("Purge : retire l'étourdissement avant le tour de l'allié", !st.teams.A[1].fx.some((effect) => effect.key === "stun") && evs(st, "skip").length === 0);
}

{
  const buff: CharacterSpell = { name: "Renfort personnel", target: null, effects: [{ k: "mod", stat: "atk", amount: 0.25, turns: 1, to: "self" }] };
  const st = start([card(SASUKE, { spell: buff, noBasicAttack: true }), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  const actor = st.teams.A[0];
  actor.tIn = 2;
  actor.fx.push({ key: "poison", amount: 0.01, turns: 3, fresh: false });
  const hp = actor.hp;
  play(st, "special", null);
  check("Buff solo SSR : le lanceur conserve immédiatement la main", isSoloBuff(buff) && currentActor(st)?.id === "A1" && actor.continuingTurn && describeSpell(buff).includes("Tour immédiat"));
  check("Buff instantané : ni poison ni expiration avant l'action suivante", actor.hp === hp && evs(st, "poison").length === 0 && actor.fx.find((effect) => effect.stat === "atk")?.turns === 1);
  check("Buff instantané : impossible de relancer le même sort", !legalActions(st).some((action) => action.spell === "special"));
  check("Buff instantané : ne débloque pas un autre sort un tour trop tôt", !legalActions(st).some((action) => action.spell === "tertiary"));
  const loaded: BattleState = { ...JSON.parse(JSON.stringify(st)), rng: seededRandom(7) };
  play(loaded, "base", "B1");
  check("Buff instantané : sauvegarde et action suivante restent dans un seul tour", currentActor(loaded)?.id === "B1" && loaded.teams.A[0].tIn === 1 && loaded.teams.A[0].pIn === 5 && !loaded.teams.A[0].continuingTurn);
  check("Buff instantané : un seul tic de poison et le bonus d'un tour est consommé", evs(loaded, "poison").length === 1 && !loaded.teams.A[0].fx.some((effect) => effect.stat === "atk"));
  const control = start([card(SASUKE, { noBasicAttack: true }), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  play(control, "base", "B1");
  check("Buff instantané : le bonus renforce bien l'attaque qui suit", Math.abs(evs(loaded, "damage")[0].amount / evs(control, "damage")[0].amount - 1.25) < 1e-6);
}
{
  const self: CharacterSpell = { name: "Protection", target: null, effects: [{ k: "shield", pct: 0.1, to: "self" }] };
  const st = start([card(SASUKE, { rarity: "UR", spell: self, tertiary: self, ultimate: self }), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  st.teams.A[0].ultimateGauge = BATTLE.ultimateGaugeMax;
  play(st, "ultimate", null); play(st, "special", null); play(st, "tertiary", null);
  check("Buffs solo UR : l'enchaînement des trois slots est borné par leurs recharges", currentActor(st)?.id === "A1" && legalActions(st).map((action) => action.spell).join() === "base" && st.teams.A[0].ultimateGauge === 0);
  play(st, "base", "B1");
  check("Buffs solo UR : l'attaque termine le tour et charge normalement la jauge", currentActor(st)?.id === "B1" && st.teams.A[0].ultimateGauge === BATTLE.ultimateGaugeBase);
}
{
  const mixed: CharacterSpell = { name: "Frappe protégée", target: "foe", effects: [{ k: "damage", mult: 1 }, { k: "shield", pct: 0.1, to: "self" }] };
  const group: CharacterSpell = { name: "Renfort d'équipe", target: null, effects: [{ k: "mod", stat: "atk", amount: 0.25, turns: 2, to: "team" }] };
  for (const spell of [mixed, group]) {
    const st = start([card(SASUKE, { spell }), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
    play(st, "special", spell.target ? "B1" : null);
    check(`${spell.name} : conserve son coût d'un tour`, !isSoloBuff(spell) && currentActor(st)?.id === "B1");
  }
}

// Combats complets : équipes de SSR/UR écrits, journal rejouable, pas d'erreur
{
  const ids = Object.keys(SECONDARY_DATA).map(Number);
  const rng = seededRandom(99);
  const pick = () => card(ids[Math.floor(rng() * ids.length)], { rarity: rng() < 0.3 ? "UR" : "SSR", power: Math.floor(rng() * 100) });
  let bad = 0, specials = 0, revives = 0;
  const kinds = new Set<string>();
  for (let g = 0; g < 1500; g++) {
    const st = createBattle([pick(), pick(), pick(), pick()], [pick(), pick(), pick(), pick()], seededRandom(g));
    try {
      while (currentActor(st)) applyAction(st, autoAction(st));
    } catch {
      bad++;
      continue;
    }
    for (const e of st.log) {
      kinds.add(e.kind);
      if (e.kind === "action" && e.spell === "special") specials++;
      if (e.kind === "revive") revives++;
    }
    const rp = replayAll(st.log);
    // Le rejeu final reflète les PV du moteur
    const ok = (["A", "B"] as const).every((s) => st.teams[s].every((u, i) => Math.abs(rp.units[`${s}${i + 1}` as `A${number}`].hp - u.hp) < 1e-6));
    if (!ok) bad++;
  }
  check("1 500 combats de SSR/UR avec sorts : aucune erreur, rejeu fidèle", bad === 0, `${bad} écart(s), ${specials} sorts lancés`);
  check("Tous les nouveaux événements apparaissent", ["poison", "revive", "resist", "status", "heal", "shield"].every((k) => kinds.has(k)), `${revives} réanimation(s) ; ${[...kinds].join(", ")}`);
}

console.log(failures === 0 ? "\nSorts conformes." : `\n${failures} vérification(s) en échec.`);
process.exitCode = failures === 0 ? 0 : 1;
