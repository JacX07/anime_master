// Vérification du moteur de combat 4 contre 4 (docs/specs/combat.md), sans base : cartes générées.
// Déterminisme du journal, journal rejouable (PV et boucliers), mode manuel (actions permises et refusées), formule de dégâts.
// Usage : npm run check:battle

import {
  BATTLE, affinity, applyAction, autoAction, battle, createBattle, currentActor, legalActions,
  type BattleCard, type BattleEvent, type Random, type UnitId,
} from "../src/lib/battle";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}
const throws = (fn: () => void) => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};

function seeded(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gen = seeded(1);
const TYPES = ["COMBAT", "MYSTERE", "MAGIE", "COEUR", "AVENTURE"] as const;
const RARITIES = ["N", "R", "SR", "SSR", "UR"] as const;
const pick = <T>(l: readonly T[]) => l[Math.floor(gen() * l.length)];
function card(over: Partial<BattleCard> = {}): BattleCard {
  const total = 1000 + gen() * 7000;
  const attack = Math.round(total * (0.35 + gen() * 0.3));
  return {
    characterId: Math.floor(gen() * 1e6), rarity: pick(RARITIES), type: pick(TYPES),
    attack, defense: Math.round(total - attack), power: Math.floor(gen() * 1e5), franchiseId: Math.floor(gen() * 6), ...over,
  };
}
const team = () => [card(), card(), card(), card()];

/** Rejoue le journal et vérifie chaque PV et bouclier annoncé. Renvoie le nombre d'écarts. */
function replayErrors(log: BattleEvent[]) {
  const start = log[0];
  if (start.kind !== "start") return 1;
  const hp = new Map(start.units.map((u) => [u.id, u.hp]));
  const shield = new Map(start.units.map((u) => [u.id, u.shield]));
  const maxHp = new Map(start.units.map((u) => [u.id, u.maxHp]));
  const near = (x: number, y: number) => Math.abs(x - y) < 1e-6;
  let errors = 0;
  for (const e of log) {
    if (e.kind === "damage") {
      const s = shield.get(e.target)!;
      const absorbed = Math.min(s, e.amount);
      const left = Math.max(0, hp.get(e.target)! - (e.amount - absorbed));
      if (!near(absorbed, e.absorbed) || !near(left, e.hp) || !near(s - absorbed, e.shield)) errors++;
      hp.set(e.target, e.hp);
      shield.set(e.target, e.shield);
    } else if (e.kind === "heal") {
      if (!near(Math.min(maxHp.get(e.target)!, hp.get(e.target)! + e.amount), e.hp)) errors++;
      hp.set(e.target, e.hp);
    } else if (e.kind === "shield") {
      if (!near(shield.get(e.target)! + e.amount, e.shield)) errors++;
      shield.set(e.target, e.shield);
    } else if (e.kind === "ko") {
      if (hp.get(e.target) !== 0) errors++;
    } else if (e.kind === "end") {
      const left = (s: string) => {
        const ids = [...hp.keys()].filter((id) => id.startsWith(s));
        return ids.reduce((n, id) => n + hp.get(id)!, 0) / ids.reduce((n, id) => n + maxHp.get(id)!, 0);
      };
      if (!near(left("A"), e.hpLeft.A) || !near(left("B"), e.hpLeft.B)) errors++;
    }
  }
  return errors;
}

// 1. Déterminisme et journal rejouable, en automatique.
let sameLog = true, replayed = 0, endsWithEnd = true;
for (let i = 0; i < 2000; i++) {
  const a = team(), b = team();
  const seed = Math.floor(gen() * 1e9);
  const r1 = battle(a, b, seeded(seed));
  const r2 = battle(a, b, seeded(seed));
  if (JSON.stringify(r1.log) !== JSON.stringify(r2.log)) sameLog = false;
  replayed += replayErrors(r1.log);
  const last = r1.log[r1.log.length - 1];
  if (last.kind !== "end" || last.winner !== r1.winner || last.rounds !== r1.rounds) endsWithEnd = false;
}
check("Même graine, mêmes cartes = même journal (2 000 combats)", sameLog);
check("Le journal se rejoue : PV, boucliers et PV restants concordent", replayed === 0, `${replayed} écarts`);
check("Le journal se termine par « end », cohérent avec le résultat", endsWithEnd);

// 2. Mode manuel : actions au hasard parmi celles permises, jusqu'au bout.
let manualOk = true, manualReplay = 0, rejected = true;
for (let i = 0; i < 500; i++) {
  const st = createBattle(team(), team(), seeded(i));
  let steps = 0;
  while (currentActor(st) && steps++ < 1000) {
    const options = legalActions(st);
    const choice = pick(options);
    const actor = currentActor(st)!;
    // Actions refusées : sort affilié pas prêt, cible morte ou d'un mauvais camp
    if (!options.some((o) => o.spell === "affinity") && !throws(() => applyAction(st, { spell: "affinity", target: null }))) rejected = false;
    const ally = `${actor.id[0]}1` as UnitId;
    if (!throws(() => applyAction(st, { spell: "base", target: ally }))) rejected = false;
    applyAction(st, { spell: choice.spell, target: pick(choice.targets) });
  }
  if (!st.result) manualOk = false;
  else manualReplay += replayErrors(st.log);
  if (!throws(() => applyAction(st, { spell: "base", target: "A1" }))) rejected = false;
}
check("Mode manuel : 500 combats joués au hasard jusqu'au bout", manualOk);
check("Mode manuel : le journal se rejoue", manualReplay === 0, `${manualReplay} écarts`);
check("Actions refusées : sort pas prêt, cible alliée pour une attaque, combat terminé", rejected);

// 3. Stratégie automatique = battle()
let autoSame = true;
for (let i = 0; i < 300; i++) {
  const a = team(), b = team();
  const st = createBattle(a, b, seeded(i));
  while (currentActor(st)) applyAction(st, autoAction(st));
  if (JSON.stringify(st.result!.log) !== JSON.stringify(battle(a, b, seeded(i)).log)) autoSame = false;
}
check("Pas à pas avec autoAction = battle()", autoSame);

// 4. Formule de dégâts, sans critique ni variation (aléa fixé à 0,5).
const atk = card({ type: "COMBAT", attack: 3000, defense: 1000, power: 2, franchiseId: 1 });
const def = card({ type: "MYSTERE", attack: 2000, defense: 1500, power: 1, franchiseId: 2 });
const filler = (f: number) => card({ type: "COEUR", attack: 1000, defense: 1000, power: 0, franchiseId: f });
const st = createBattle([atk, filler(3), filler(4), filler(5)], [def, filler(6), filler(7), filler(8)], () => 0.5);
applyAction(st, { spell: "base", target: "B1" });
const hit = st.log.find((e) => e.kind === "damage");
const expected = 3000 * affinity("COMBAT", "MYSTERE") * (BATTLE.defK / (BATTLE.defK + 1500));
check("Dégâts du sort de base = ATK × affinité × defK / (defK + DEF)", hit?.kind === "damage" && Math.abs(hit.amount - expected) < 1e-6, `${hit?.kind === "damage" ? hit.amount.toFixed(1) : "?"} attendu ${expected.toFixed(1)}`);
check("Le second joueur commence avec un bouclier de 15 %", hit?.kind === "damage" && Math.abs(hit.absorbed - Math.min(expected, 3500 * BATTLE.secondShield)) < 1e-6);

console.log(failures ? `\n${failures} échec(s)` : "\nTout est bon.");
process.exit(failures ? 1 : 0);
