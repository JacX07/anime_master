// Vérifie les effets d'élément portés par le sort secondaire (attack-element.ts) : brûlure, trempé + soin, combo foudre,
// ralentissement, esquive ; résistance des boss à l'étourdissement ; journal rejouable. Pur (aucune base).
// Usage : npx tsx scripts/check-elements.ts

import { applyAction, autoAction, createBattle, currentActor, legalActions, seededRandom, type BattleCard, type BattleEvent, type BattleState } from "../src/lib/battle";
import { replayAll } from "../src/lib/battle-replay";
import { attackElement, effectElement, ELEMENT_RIDER, type AttackElement } from "../src/lib/attack-element";
import { spellOf } from "../src/lib/spells";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

const card = (characterId: number, o: Partial<BattleCard> = {}): BattleCard => ({
  characterId, rarity: "SSR", type: "MAGIE", attack: 1000, defense: 100000, power: 10, franchiseId: null, ...o,
});
const dummy = (i: number, o: Partial<BattleCard> = {}) => card(900000 + i, { rarity: "N", power: 1, attack: 10, ...o });
const start = (a: BattleCard[], b: BattleCard[], seed = 7) => createBattle(a, b, seededRandom(seed), { passive: false, franchise: false });
const evs = <K extends BattleEvent["kind"]>(st: BattleState, kind: K) => st.log.filter((e): e is Extract<BattleEvent, { kind: K }> => e.kind === kind);

/** Fait jouer l'attaque de base jusqu'au tour de `id`, puis lui donne son sort secondaire prêt. */
function until(st: BattleState, id: string) {
  while (currentActor(st)?.id !== id) {
    const a = autoAction(st);
    applyAction(st, { spell: "base", target: a.spell === "base" ? a.target : legalActions(st)[0].targets[0] });
  }
  const u = [...st.teams.A, ...st.teams.B].find((x) => x.id === id)!;
  u.pIn = 0;
}
const special = (st: BattleState, target: string) => applyAction(st, { spell: "special", target: target as never });

/** Un personnage de l'élément dont le sort secondaire frappe un seul ennemi. */
const ID: Record<AttackElement, number> = { feu: 0, eau: 0, foudre: 0, air: 0, terre: 0 };
for (let id = 1; id < 400000 && Object.values(ID).includes(0); id++) {
  const element = attackElement(id);
  if (!element || ID[element]) continue;
  const s = spellOf(id, "SSR", "MAGIE");
  if (s?.target === "foe" && s.effects.some((e) => e.k === "damage" && !e.zone)) ID[element] = id;
}
check("un perso testable par élément", Object.values(ID).every(Boolean), JSON.stringify(ID));

const statusOn = (st: BattleState, target: string, status: string) => st.log.some((e) => e.kind === "status" && e.target === target && e.status === status && e.on);

// Feu : brûlure posée, puis dégâts de brûlure à la fin de l'action de la cible
{
  const st = start([card(ID.feu)], [dummy(1)]);
  until(st, "A1");
  special(st, "B1");
  check("feu : brûlure posée", statusOn(st, "B1", "burn"));
  until(st, "B1");
  applyAction(st, autoAction(st));
  const tick = evs(st, "poison").find((e) => e.target === "B1" && e.burn);
  const maxHp = st.teams.B[0].maxHp;
  check("feu : 5 % des PV max par action", !!tick && Math.abs(tick.amount - maxHp * ELEMENT_RIDER.burnPct) < 1e-6, `${tick?.amount}`);
}

// Eau : cible trempée et un allié soigné de 10 % de ses PV max
{
  const st = start([card(ID.eau), dummy(2, { rarity: "SSR" })], [dummy(1)]);
  const ally = st.teams.A[1];
  ally.hp = ally.maxHp * 0.5;
  until(st, "A1");
  special(st, "B1");
  check("eau : cible trempée", statusOn(st, "B1", "wet"));
  const heal = evs(st, "heal").find((e) => e.target === "A2");
  check("eau : soigne un autre allié de 10 %", !!heal && Math.abs(heal.amount - ally.maxHp * ELEMENT_RIDER.healPct) < 1e-6, `${heal?.amount}`);
}

// Combo eau → foudre : la cible trempée est étourdie et séchée ; sans eau, pas d'étourdissement ; un boss résiste
for (const [label, wetFirst, boss] of [["combo", true, false], ["sans eau", false, false], ["boss", true, true]] as const) {
  const st = start([card(ID.eau), card(ID.foudre)], [dummy(1, { boss })]);
  if (wetFirst) { until(st, "A1"); special(st, "B1"); }
  until(st, "A2");
  const before = st.log.length;
  special(st, "B1");
  const after = st.log.slice(before);
  const stunned = after.some((e) => e.kind === "status" && e.target === "B1" && e.status === "stun" && e.on);
  const dried = after.some((e) => e.kind === "status" && e.target === "B1" && e.status === "wet" && !e.on);
  if (label === "combo") check("foudre : étourdit une cible trempée et la sèche", stunned && dried);
  if (label === "sans eau") check("foudre : rien sans cible trempée", !stunned);
  if (label === "boss") check("foudre : un boss résiste à l'étourdissement", !stunned && after.some((e) => e.kind === "resist"));
}

// Terre : vitesse −25 %
{
  const st = start([card(ID.terre)], [dummy(1)]);
  until(st, "A1");
  special(st, "B1");
  const fx = st.teams.B[0].fx.find((f) => f.key === "speedDown");
  check("terre : vitesse −25 %, 2 actions", fx?.amount === ELEMENT_RIDER.slow && fx.turns === ELEMENT_RIDER.slowTurns);
}

// Air : esquive +20 points pour le lanceur
{
  const st = start([card(ID.air)], [dummy(1)]);
  until(st, "A1");
  special(st, "B1");
  const fx = st.teams.A[0].fx.find((f) => f.key === "dodgeUp");
  check("air : esquive +20 points pour le lanceur", !!fx && fx.amount >= ELEMENT_RIDER.dodge);
}

// Un perso sans élément ne pose aucun de ces effets, et le journal se rejoue
{
  const st = start([card(62)], [dummy(1)]);
  until(st, "A1");
  if (legalActions(st).some((a) => a.spell === "special")) special(st, "B1");
  check("sans élément : aucun effet d'élément", !["burn", "wet"].some((s) => statusOn(st, "B1", s)));
  const st2 = start([card(ID.eau), card(ID.foudre)], [dummy(1), dummy(3)]);
  while (currentActor(st2)) applyAction(st2, autoAction(st2));
  const end = replayAll(st2.log);
  check("journal rejouable", !!end.end);
  check("7 persos sans cible : élément visuel seulement", [14, 127518, 129133, 12, 1662, 46484, 89243].every((id) => attackElement(id) && !effectElement(id)));
}

if (failures) { console.log(`\n${failures} échec(s).`); process.exit(1); }
console.log("\nÉléments conformes.");
