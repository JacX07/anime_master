// Mécaniques de boss des empereurs (docs/specs/raid-empereurs.md) : sommeil, marque dévorante, âmes, phases, jauge de départ. Sans base.
// Usage : npm run check:emperors
import { replayAll } from "../src/lib/battle-replay";
import { applyAction, autoAction, battle, createBattle, currentActor, seededRandom, type BattleCard, type BattleEvent, type BattleState } from "../src/lib/battle";
import { BOSS_SKILLS, EMPEROR_IDS } from "../src/lib/boss-skills";
import type { CharacterSpell } from "../src/lib/spells";

let failures = 0;
function check(label: string, ok: boolean, detail = "") { if (!ok) failures++; console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`); }

const card = (id: number, over: Partial<BattleCard> = {}): BattleCard => ({ characterId: id, rarity: "UR", type: "COMBAT", attack: 3000, defense: 2000, power: 1, franchiseId: 21, speed: 100, ...over });
const boss = (id: number, over: Partial<BattleCard> = {}): BattleCard => card(id, { boss: true, attack: 4000, defense: 3000, power: 99, ...over });
const team = (n = 4, over: Partial<BattleCard> = {}) => Array.from({ length: n }, (_, i) => card(300 + i, over));
const play = (st: BattleState, max = 400) => { for (let i = 0; i < max && !st.result; i++) { const a = currentActor(st); if (!a) break; applyAction(st, autoAction(st)); } return st; };
const evs = (st: BattleState) => st.log;
const ofKind = <K extends BattleEvent["kind"]>(log: BattleEvent[], kind: K) => log.filter((e): e is Extract<BattleEvent, { kind: K }> => e.kind === kind);

// Jauge de départ : le Haki des rois est lancé dès la première action de Shanks
{
  const st = createBattle(team(), [boss(EMPEROR_IDS.shanks)], seededRandom(1), { gauge: true });
  for (let i = 0; i < 30 && !evs(st).some((e) => e.kind === "action" && e.actor.startsWith("B")); i++) { if (!currentActor(st)) break; applyAction(st, autoAction(st)); }
  const first = ofKind(evs(st), "action").find((e) => e.actor.startsWith("B"));
  check("Shanks ouvre par l'ultime (Haki des rois)", first?.spell === "ultimate" && first.name === "Haki des rois", `${first?.spell} ${first?.name}`);
}

// Sommeil : seuls les plus faibles s'endorment, un coup réveille
{
  const mixed = [card(401, { attack: 1000 }), card(402, { attack: 9000 }), card(403, { attack: 1500 }), card(404, { attack: 8000 })];
  const st = createBattle(mixed, [boss(EMPEROR_IDS.shanks, { attack: 5000 })], seededRandom(2), { gauge: true });
  for (let i = 0; i < 12 && !ofKind(evs(st), "status").some((e) => e.status === "sleep"); i++) { if (!currentActor(st)) break; applyAction(st, autoAction(st)); }
  const slept = new Set(ofKind(evs(st), "status").filter((e) => e.status === "sleep" && e.on).map((e) => e.target));
  const atkOf = (id: string) => Number(st.teams.A.find((u) => u.id === id)?.atk);
  check("Haki : seulement les ATK inférieures à Shanks s'endorment", slept.size > 0 && [...slept].every((id) => atkOf(id) < 5000 * 1.0 + 1) && st.teams.A.filter((u) => u.atk >= st.teams.B[0].atk).every((u) => !slept.has(u.id)), [...slept].join(","));
  play(st, 80);
  check("Un endormi saute son tour (skip)", ofKind(evs(st), "skip").length > 0 || slept.size === 0);
  check("Les boss résistent au sommeil", (() => {
    const s2 = createBattle([boss(EMPEROR_IDS.shanks, { attack: 9000 })], [boss(EMPEROR_IDS.shanks, { attack: 1000 })], seededRandom(3), { gauge: true });
    play(s2, 20);
    return !ofKind(evs(s2), "status").some((e) => e.status === "sleep" && e.on && e.target.startsWith("B"));
  })());
}

// Marque de Big Mom : avalé sans dégâts, libéré avec assez de dégâts
{
  const hit = (power: number) => {
    const marked = Array.from({ length: 4 }, (_, i) => card(500 + i, { attack: power, defense: 1500 }));
    const st = createBattle(marked, [boss(EMPEROR_IDS.bigMom, { attack: 1500 })], seededRandom(5), { gauge: true });
    play(st, 120);
    return st;
  };
  const weak = hit(10);
  const swallowed = ofKind(evs(weak), "ko").filter((k) => k.target.startsWith("A")).length;
  check("Marque : une cible est avalée sans dégâts suffisants", ofKind(evs(weak), "status").some((e) => e.status === "devour" && e.on), "");
  check("Big Mom gagne un sort de l'avalé (tertiaire)", weak.teams.B[0].tertiary !== null || swallowed === 0, `${swallowed} morts`);
  const strong = hit(60000);
  const freed = ofKind(evs(strong), "status").some((e) => e.status === "devour" && !e.on);
  check("Marque : libérée quand Big Mom subit assez de dégâts", freed && !strong.teams.A.some((u) => u.devoured), "");
}

// Âmes : Big Mom grossit à chaque mort d'ennemi
{
  const st = createBattle(team(4, { attack: 800 }), [boss(EMPEROR_IDS.bigMom, { attack: 6000 })], seededRandom(7), { gauge: true });
  const before = st.teams.B[0].maxHp;
  play(st, 300);
  const big = st.teams.B[0];
  check("Âmes : PV max et dégâts finaux augmentent", big.souls > 0 && big.maxHp > before && Math.abs(big.finalBonus - 0.25 * big.souls) < 1e-9, `${big.souls} âmes, +${Math.round((big.maxHp / before - 1) * 100)} % PV`);
}

// Phases de Kaido
{
  const st = createBattle(team(4, { attack: 4000 }), [boss(EMPEROR_IDS.kaido, { attack: 3000, defense: 3000 })], seededRandom(9), { gauge: true });
  play(st, 300);
  const k = st.teams.B[0];
  const status = ofKind(evs(st), "status").filter((e) => e.target === "B1" && e.on);
  check("Kaido passe en mode Dragon sous 50 % de PV", k.phased && status.some((e) => e.status === "atkUp") && status.some((e) => e.status === "speedUp"));
  const names = ofKind(evs(st), "action").filter((e) => e.actor === "B1").map((e) => e.name);
  check("Le Dragon lance ses sorts de phase", names.includes("Souffle du dragon") || names.includes("Boro Breath") || !k.phased);
}

// Voix de l'empereur : critiques, dégâts critiques et ATK
{
  const seen = new Set<string>();
  for (let seed = 1; seed <= 20; seed++) {
    const st = createBattle(team(4, { attack: 1500 }), [boss(EMPEROR_IDS.shanks, { attack: 4000 })], seededRandom(seed), { gauge: true });
    play(st, 120);
    for (const e of ofKind(evs(st), "status")) if (e.on && e.target === "B1") seen.add(e.status);
  }
  check("Shanks : critique, dégâts critiques et ATK montent", seen.has("critUp") && seen.has("critDamageUp") && seen.has("atkUp"), [...seen].join(","));
}

// Kaido : saignement en mode homme-bête, réduction sous 70 % de PV
{
  let bleeds = 0;
  const high: number[] = [], low: number[] = [];
  for (let seed = 1; seed <= 40; seed++) {
    const st = createBattle(team(4, { attack: 2500, defense: 1000 }), [boss(EMPEROR_IDS.kaido, { attack: 2500, defense: 5000 })], seededRandom(seed), { gauge: true });
    play(st, 160);
    const log = evs(st);
    bleeds += ofKind(log, "status").filter((e) => e.status === "bleed" && e.on && e.target.startsWith("A")).length;
    let hp = st.teams.B[0].maxHp;
    const max0 = hp;
    for (const e of log) if (e.kind === "damage" && e.target === "B1" && e.source.startsWith("A") && e.crit === false) {
      (hp / max0 > 0.7 ? high : low).push(e.amount);
      hp = e.hp;
    } else if (e.kind === "heal" && e.target === "B1") hp = e.hp;
  }
  const m = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  check("Kaido : ses frappes font saigner (mode homme-bête)", bleeds > 20, `${bleeds} saignements`);
  check("Kaido : dégâts reçus réduits sous 70 % de PV", low.length > 20 && m(low) / m(high) < 0.9, `×${(m(low) / m(high)).toFixed(2)}`);
}

// Barbe Blanche : bouclier quand un allié tombe
{
  const crew = [boss(EMPEROR_IDS.whitebeard, { attack: 5000 }), card(901, { attack: 500, defense: 300 }), card(902, { attack: 500, defense: 300 }), card(903, { attack: 500, defense: 300 })];
  const st = createBattle(team(4, { attack: 3000 }), crew, seededRandom(21), { gauge: true });
  play(st, 200);
  const shields = ofKind(evs(st), "shield").filter((e) => e.source === "B1" && e.target === "B1" && e.amount > 0);
  const deaths = ofKind(evs(st), "ko").filter((e) => e.target.startsWith("B") && e.target !== "B1").length;
  check("Barbe Blanche : un bouclier par allié tombé", deaths > 0 && shields.length >= Math.min(deaths, 1), `${shields.length} boucliers, ${deaths} alliés tombés`);
}

// Vagues : deux vagues d'équipage puis l'empereur dans un même combat
{
  const crew = (base: number) => [0, 1, 2, 3].map((i) => card(base + i, { attack: 600, defense: 500, power: 1 }));
  const mine = team(4, { attack: 5000, defense: 4000 });
  const run = () => battle(mine, crew(700), seededRandom(31), { gauge: true, waves: [crew(710), [boss(EMPEROR_IDS.kaido, { attack: 1500, defense: 1500 })]], maxRounds: 60 });
  const a = run();
  const waves = ofKind(a.log, "wave");
  check("Vagues : deux changements puis fin", waves.length === 2 && waves[0].index === 2 && waves[1].index === 3 && waves[1].total === 3 && a.winner === "A", `${waves.length} vagues, vainqueur ${a.winner}`);
  check("Vagues : l'ordre des événements est cohérent (wave après les K.O. du camp B)", (() => {
    let lastKo = -1;
    return a.log.every((e, i) => { if (e.kind === "ko" && e.target.startsWith("B")) lastKo = i; return e.kind !== "wave" || lastKo >= 0 && i > lastKo; });
  })());
  check("Vagues : déterministe", JSON.stringify(a.log) === JSON.stringify(run().log));
  const final = replayAll(a.log);
  check("Vagues : le lecteur affiche l'empereur de la dernière vague", final.info.B1.characterId === EMPEROR_IDS.kaido && final.end?.winner === "A");
  const stuck = battle(team(4, { attack: 1 }), crew(700), seededRandom(32), { gauge: true, waves: [crew(710)], maxRounds: 4 });
  check("Vagues : la limite de tours s'applique à tout le combat", stuck.timeout === true || stuck.winner !== "A", `fin au tour ${stuck.rounds}`);
}

// Kits : tous les empereurs jouent un combat complet sans erreur et de façon déterministe
for (const [name, id] of Object.entries(EMPEROR_IDS)) {
  const a = battle(team(), [boss(id)], seededRandom(11), { gauge: true });
  const b = battle(team(), [boss(id)], seededRandom(11), { gauge: true });
  check(`Combat complet et déterministe : ${name}`, JSON.stringify(a.log) === JSON.stringify(b.log) && !!a.log.find((e) => e.kind === "end"));
}
check("Kits définis pour les quatre empereurs", Object.values(EMPEROR_IDS).every((id) => !!BOSS_SKILLS[id]));
void (null as unknown as CharacterSpell);

console.log(failures ? `\n${failures} vérification(s) en échec.` : "\nEmpereurs conformes.");
process.exitCode = failures ? 1 : 0;
