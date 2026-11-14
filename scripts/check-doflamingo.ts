import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { applyAction, autoAction, BATTLE, createBattle, currentActor, legalActions, seededRandom, type BattleCard, type BattleState } from "../src/lib/battle";
import { replayAll, replayStart } from "../src/lib/battle-replay";
import { SpellsPanel } from "../src/components/battle/BattlePanels";

const card = (id: number, o: Partial<BattleCard> = {}): BattleCard => ({ characterId: id, rarity: "UR", type: "COMBAT", attack: 1000, defense: 10000, power: 100, franchiseId: null, ...o });
function start(boss = true) {
  return createBattle([card(2754, { boss })], [300, 100, 400, 200].map((attack, i) => card(900000 + i, { attack, power: 1, rarity: "N" })), seededRandom(4), { passive: false, franchise: false, combos: false });
}
function nextDoff(st: BattleState) {
  for (let i = 0; currentActor(st)?.id !== "A1" && i < 20; i++) {
    const action = legalActions(st).find((a) => a.spell === "base")!;
    applyAction(st, { spell: "base", target: action.targets[0] });
  }
  assert.equal(currentActor(st)?.id, "A1");
}
{
  const st = start();
  applyAction(st, { spell: "base", target: "B1" });
  assert.ok(st.log.some((e) => e.kind === "action" && e.name === "Goshikito"));
  const normal = start(false);
  applyAction(normal, { spell: "base", target: "B1" });
  const damage = (s: BattleState) => s.log.find((e) => e.kind === "damage")! as Extract<(typeof s.log)[number], { kind: "damage" }>;
  assert.ok(damage(st).amount > damage(normal).amount, "Perforation dès le premier coup");
  assert.ok(!st.teams.A[0].fx.some((fx) => fx.key === "ignoreDef"), "Pas de perforation reportée ni cumulée");
  assert.notEqual(normal.teams.A[0].spell?.name, "Parasite", "Les cartes de collection ne reçoivent pas le kit boss");
}
{
  const st = start();
  assert.equal(autoAction(st).spell, "special");
  applyAction(st, { spell: "special", target: null });
  const slowed = st.teams.B.flatMap((u) => u.fx.some((f) => f.key === "speedDown") ? [u.id] : []);
  assert.deepEqual(slowed, ["B1", "B3"]);
  for (const target of [st.teams.B[0], st.teams.B[2]]) {
    assert.equal(target.fx.find((f) => f.key === "speedDown")?.amount, -.25);
    assert.equal(target.fx.find((f) => f.key === "speedDown")?.turns, 2);
  }
  assert.equal(st.teams.A[0].pIn, 5);
  nextDoff(st);
  assert.ok(!legalActions(st).some((a) => a.spell === "special"), "Pas de relance au tour suivant");
  applyAction(st, { spell: "base", target: "B1" });
  nextDoff(st);
  assert.ok(st.teams.B.every((u) => !u.fx.some((f) => f.key === "speedDown")), "Ralentissement expiré après deux actions de la cible");
}
{
  const st = start();
  st.teams.B[2].hp = 0;
  st.teams.B[0].fx.push({ key: "immune", amount: 0, turns: 3, fresh: false });
  applyAction(st, { spell: "special", target: null });
  assert.ok(st.log.some((e) => e.kind === "resist" && e.target === "B1"));
  assert.ok(st.teams.B[3].fx.some((e) => e.key === "speedDown"));
  assert.ok(!st.teams.B[1].fx.some((e) => e.key === "speedDown"), "Aucun report vers une cible plus faible après résistance");
}
{
  const st = start();
  assert.ok(!legalActions(st).some((a) => a.spell === "ultimate"));
  st.teams.A[0].ultimateGauge = BATTLE.ultimateGaugeMax;
  assert.equal(autoAction(st).spell, "ultimate");
  applyAction(st, { spell: "ultimate", target: null });
  assert.ok(st.log.some((e) => e.kind === "action" && e.name === "Birdcage"));
  assert.equal(st.log.filter((e) => e.kind === "damage").length, 4);
  assert.ok(st.teams.B.every((u) => u.fx.some((f) => f.key === "poison" && f.amount === .04 && f.turns === 2)));
  assert.equal(st.teams.A[0].ultimateGauge, 0);
  nextDoff(st);
  assert.equal(st.log.filter((e) => e.kind === "poison").length, 4);
  applyAction(st, { spell: "base", target: "B1" });
  nextDoff(st);
  assert.equal(st.log.filter((e) => e.kind === "poison").length, 8);
  assert.ok(st.teams.B.every((u) => !u.fx.some((f) => f.key === "poison")));
  const replay = replayAll(st.log);
  for (const u of [...st.teams.A, ...st.teams.B]) assert.equal(replay.units[u.id].hp, u.hp);
}
{
  const st = start();
  const unit = replayStart(st.log).info.A1;
  const html = renderToStaticMarkup(createElement(SpellsPanel, { unit }));
  for (const name of ["Goshikito", "Parasite", "Birdcage"]) assert.ok(html.includes(name));
  assert.match(html, /les 2 ennemis vivants à l’ATK la plus élevée/);
  assert.match(html, /sur cette attaque/);
}
console.log("✓ Doflamingo : perforation immédiate, 2 cibles, durée, recharge, immunité, ultime/jauge, dégâts périodiques et descriptions.");
