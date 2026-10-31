// Vérification des sorts de personnage SSR/UR (docs/specs/combat.md §4 bis) : cooldown, poison mortel, silence, boss, immunité,
// purge, réanimation unique, coup qui traverse les boucliers, journal rejouable. Pur (aucune base).
// Usage : npm run check:spells

import { applyAction, autoAction, createBattle, currentActor, legalActions, seededRandom, type BattleCard, type BattleEvent, type BattleState } from "../src/lib/battle";
import { replayAll } from "../src/lib/battle-replay";
import { CHARACTER_SPELLS } from "../src/lib/spells";

const fx = <K extends string>(id: number, k: K) => CHARACTER_SPELLS[id].effects.find((e) => e.k === k) as Extract<(typeof CHARACTER_SPELLS)[number]["effects"][number], { k: K }>;

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

const SASUKE = 13, ITACHI = 14, KAKASHI = 85, CHOPPER = 309, YUTA = 129571, MEGUMI = 126635, GAARA = 1662;
const card = (characterId: number, o: Partial<BattleCard> = {}): BattleCard => ({
  characterId, rarity: "SSR", type: "MAGIE", attack: 1000, defense: 100000, power: 10, franchiseId: null, ...o,
});
const dummy = (i: number, o: Partial<BattleCard> = {}) => card(900000 + i, { rarity: "N", power: 1, attack: 10, ...o });
const start = (a: BattleCard[], b: BattleCard[]) => createBattle(a, b, seededRandom(7), { passive: false, franchise: false });
const evs = <K extends BattleEvent["kind"]>(st: BattleState, kind: K) => st.log.filter((e): e is Extract<BattleEvent, { kind: K }> => e.kind === kind);
const play = (st: BattleState, spell: "base" | "affinity" | "special", target: Parameters<typeof applyAction>[1]["target"]) => applyAction(st, { spell, target });
/** Fait jouer les cartes jusqu'à ce que ce soit au tour de `id`, en stratégie auto (sauf sorts de personnage, qu'on veut contrôler) */
function until(st: BattleState, id: string) {
  while (currentActor(st)?.id !== id) {
    const a = autoAction(st);
    play(st, "base", a.spell === "base" ? a.target : legalActions(st)[0].targets[0]);
  }
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
  check("Cooldown : prêt dès la 1re action puis toutes les 5", ready.join() === "true,false,false,false,false,true,false,false", ready.map(Number).join(""));
  check("N, R et SR n'ont pas de sort de personnage", !legalActions(start([dummy(1), dummy(2), dummy(3), dummy(4)], [dummy(5), dummy(6), dummy(7), dummy(8)])).some((x) => x.spell === "special"));
}

// Poison : % des PV max à chaque action du porteur, mortel
{
  const st = start([card(SASUKE), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "special", "B1");
  const maxHp = st.log.find((e) => e.kind === "start") && (st.log[0] as Extract<BattleEvent, { kind: "start" }>).units.find((u) => u.id === "B1")!.maxHp;
  for (let i = 0; i < 12 && evs(st, "poison").length < 3; i++) {
    until(st, "A1");
    play(st, "base", "B2");
  }
  const ticks = evs(st, "poison").filter((e) => e.target === "B1");
  check("Poison : % des PV max du sort par action, 3 actions", ticks.length === 3 && ticks.every((t) => Math.abs(t.amount - maxHp! * fx(SASUKE, "poison").pct) < 1e-6 || t.hp === 0), `${ticks.length} tic(s)`);
}
{
  const st = start([card(SASUKE), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "special", "B1");
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
  until(st, "A1"); play(st, "special", null);
  check("Purge : malus de l'équipe retirés", st.teams.A[1].fx.length === 0);
}

// Réanimation : une seule fois par combat
{
  const st = start([card(YUTA), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  st.teams.A[1].hp = 0;
  st.teams.A[2].hp = 0;
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1");
  const t = legalActions(st).find((x) => x.spell === "special")!.targets;
  check("Réanimation : seuls les alliés morts sont ciblables", t.length === 2 && t.includes("A2") && t.includes("A3"));
  play(st, "special", "A2");
  const a2 = st.teams.A[1];
  check("Réanimation : revient avec la part de PV max du sort", Math.abs(a2.hp - a2.maxHp * fx(YUTA, "revive").pct) < 1e-6 && evs(st, "revive").length === 1);
  for (let i = 0; i < 6; i++) { until(st, "A1"); play(st, "base", "B1"); }
  until(st, "A1");
  check("Réanimation : pas une deuxième fois", !legalActions(st).some((x) => x.spell === "special"));
}

// Coup qui traverse les boucliers
{
  const st = start([card(KAKASHI, { rarity: "UR" }), dummy(1), dummy(2), dummy(3)], [dummy(4), dummy(5), dummy(6), dummy(7)]);
  st.teams.B[0].shield = 99999;
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "base", "B1");
  until(st, "A1"); play(st, "special", "B1");
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
  check("Bouclier d'équipe : 15 % des PV max pour chaque allié", st.teams.A.every((u) => Math.abs(u.shield - u.maxHp * 0.15) < 1e-6 || u.shield >= u.maxHp * 0.15));
}

// Combats complets : équipes de SSR/UR écrits, journal rejouable, pas d'erreur
{
  const ids = Object.keys(CHARACTER_SPELLS).map(Number);
  const rng = seededRandom(99);
  const pick = () => card(ids[Math.floor(rng() * ids.length)], { rarity: rng() < 0.3 ? "UR" : "SSR", power: Math.floor(rng() * 100) });
  let bad = 0, specials = 0, revives = 0;
  const kinds = new Set<string>();
  for (let g = 0; g < 1500; g++) {
    const st = createBattle([pick(), pick(), pick(), pick()], [pick(), pick(), pick(), pick()], seededRandom(g));
    try {
      while (currentActor(st)) applyAction(st, autoAction(st));
    } catch (e) {
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
