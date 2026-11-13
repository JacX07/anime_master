// Vérifie les kits spéciaux : Luffy, Killua, Eren, Emilia, Momo, Makima, Okabe, Yuuji, Denji, Kurapika, Mob.
// Usage : npm run check:kits
import { prisma } from "../src/lib/db";
import { applyAction, autoAction, battle, createBattle, currentActor, legalActions, seededRandom, type BattleCard, type BattleEvent } from "../src/lib/battle";
import { speedOf } from "../src/lib/speed";

let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const IDS = { luffy: 40, killua: 27, eren: 40882, emilia: 88572, momo: 222594, makima: 137080, okabe: 35252, yuuji: 127212, denji: 130102, kurapika: 28, mob: 89616 };
const FOES = [17, 13, 14, 61, 309, 126635, 133700, 157115, 133699]; // Naruto, Sasuke, Itachi, Robin, Chopper, Megumi, Nobara, Inumaki

async function main() {
  const rows = await prisma.character.findMany({ where: { id: { in: [...Object.values(IDS), ...FOES, 133699] } }, select: { id: true, rarity: true, type: true, attack: true, defense: true, power: true } });
  const card = (id: number, over: Partial<BattleCard> = {}): BattleCard => {
    const r = rows.find((x) => x.id === id)!;
    return { characterId: id, rarity: r.rarity, type: r.type, attack: r.attack, defense: r.defense, power: r.power, speed: speedOf(id), franchiseId: null, ...over };
  };
  const foes = (n = 4, over: Partial<BattleCard> = {}) => FOES.slice(0, n).map((id) => card(id, over));
  const run = (hero: number, seed: number, mates = FOES.slice(4, 7), opp = foes(), opts = {}) => battle([card(hero), ...mates.map((m) => card(m))], opp, seededRandom(seed), { gauge: true, ...opts }).log;
  const ofAction = (log: BattleEvent[], actor: string, name: string) => {
    const i = log.findIndex((e) => e.kind === "action" && e.actor === actor && e.name === name);
    if (i < 0) return null;
    const j = log.findIndex((e, k) => k > i && e.kind === "action");
    return log.slice(i, j < 0 ? undefined : j);
  };
  const first = (hero: number, name: string, tries = 40, mates?: number[], opp?: BattleCard[]) => {
    for (let s = 1; s <= tries; s++) {
      const log = run(hero, s, mates, opp);
      const seg = ofAction(log, "A1", name);
      if (seg) return { log, seg };
    }
    return null;
  };

  // Luffy : 3 frappes, DEF −10 / −20 / −30 %
  const luffy = first(IDS.luffy, "Gomu Gomu no Gatling");
  const lf = luffy?.seg.filter((e) => e.kind === "damage") ?? [];
  const ld = luffy?.seg.filter((e) => e.kind === "status" && e.status === "defDown" && e.on) ?? [];
  check("Luffy : Gatling frappe 3 fois la cible et pose DEF −", lf.length === 3 && ld.length >= 1, `${lf.length} coups, ${ld.length} malus`);

  // Killua : Godspeed +vitesse ; Éclair en chaîne touche tout le monde, cible choisie d'abord
  const kg = first(IDS.killua, "Godspeed");
  check("Killua : Godspeed donne Vitesse +", !!kg?.seg.some((e) => e.kind === "status" && e.status === "speedUp" && e.on));
  {
    const st = createBattle([card(IDS.killua)], foes(4, { characterId: 999999, type: "COMBAT", attack: 1500, defense: 6000, noSpell: true, noBasicAttack: true }), () => 0.99, { startingSide: "A", passive: false, franchise: false, combos: false, elements: false });
    for (const u of st.teams.B) { u.maxHp = 1000000; u.hp = u.maxHp; u.shield = 0; }
    st.teams.A[0].ultimateGauge = 100;
    applyAction(st, { spell: "ultimate", target: "B3" });
    const kd = st.log.filter((e): e is Extract<BattleEvent, { kind: "damage" }> => e.kind === "damage");
    check("Killua : Éclair en chaîne commence par la cible choisie, puis frappe chaque autre ennemi", kd.map((e) => e.target).join() === "B3,B1,B2,B4");
    check("Killua : dégâts croissants dans la chaîne (+25 % par cible)", kd.length === 4 && kd.every((e, i) => Math.abs(e.amount / kd[0].amount - (1 + 0.25 * i)) < 1e-9));
  }

  // Eren : soin plafonné à 35 %, ATK/DEF +, DEF ennemie −, zone (état du moteur juste après l'ultime)
  {
    let n = 0, ok = 0, healed = 0;
    for (let sd = 1; sd <= 30 && n < 5; sd++) {
      const st = createBattle([card(IDS.eren), ...FOES.slice(4, 7).map((m) => card(m))], foes(), seededRandom(sd), { gauge: true });
      while (currentActor(st)) {
        const a = autoAction(st);
        const actor = currentActor(st)!.id;
        if (a.spell === "ultimate" && actor === "A1") st.teams.A[0].hp = st.teams.A[0].maxHp * 0.3;
        const before = st.log.length;
        applyAction(st, a);
        if (a.spell === "ultimate" && actor === "A1") {
          n++;
          const eren = st.teams.A[0];
          if (eren.fx.some((f) => f.key === "atkUp") && eren.fx.some((f) => f.key === "defUp") && st.teams.B.filter((u) => u.hp > 0).every((u) => u.fx.some((f) => f.key === "defDown"))) ok++;
          if (st.log.slice(before).some((e) => e.kind === "heal" && e.target === "A1" && Math.abs(e.amount - eren.maxHp * 0.35) < 1e-8)) healed++;
          break;
        }
      }
    }
    check("Eren : transformation (ATK+, DEF+, DEF ennemie −)", n > 0 && ok === n, `${ok}/${n}`);
    check("Eren : soigne 35 % des PV max après la mise à 30 %", n > 0 && healed === n, `${healed}/${n}`);
  }

  // Emilia : ultime automatique à sa mort, une seule fois
  let deathCasts = 0, deaths = 0, extra = 0;
  for (let s = 1; s <= 60; s++) {
    const log = battle([card(IDS.emilia, { defense: 300 }), ...FOES.slice(4, 7).map((m) => card(m))], foes(), seededRandom(s), { gauge: true }).log;
    const ko = log.findIndex((e) => e.kind === "ko" && e.target === "A1");
    if (ko < 0) continue;
    deaths++;
    const next = log.findIndex((e, k) => k > ko && e.kind === "action" && e.actor === "A1" && e.spell === "ultimate");
    const revive = log.findIndex((e, k) => k > ko && e.kind === "revive" && e.target === "A1");
    if (next >= 0 && (revive < 0 || next < revive)) deathCasts++;
    if (next >= 0 && log.slice(ko, next).some((e) => e.kind === "action" && e.actor !== "A1")) extra++;
  }
  check("Emilia : lance son ultime en mourant, une fois", deaths > 0 && deathCasts === deaths && extra === 0, `${deathCasts}/${deaths}`);

  // Momo : jamais de poison ni de brûlure
  let momoDot = 0, othersDot = 0;
  for (let s = 1; s <= 40; s++) {
    const log = battle([card(IDS.momo), card(IDS.emilia), card(IDS.mob), card(IDS.okabe)], [13, 133700, 133699, 17].map((id) => card(id)), seededRandom(s), { gauge: true }).log;
    momoDot += log.filter((e) => e.kind === "poison" && e.target === "A1").length;
    othersDot += log.filter((e) => e.kind === "poison" && e.target !== "A1" && e.target[0] === "A").length;
  }
  check("Momo : immunisée aux dégâts sur la durée", momoDot === 0 && othersDot > 0, `Momo ${momoDot}, alliés ${othersDot}`);

  // Makima : vole un ennemi qui attaque son propre camp, puis revient ; exécuté s'il est le dernier
  let friendly = 0, back = 0, executed = 0, stolenSeen = 0;
  for (let s = 1; s <= 80; s++) {
    const log = run(IDS.makima, s, FOES.slice(4, 7), foes(), {});
    const st = log.findIndex((e) => e.kind === "status" && e.status === "controlled" && e.on);
    if (st < 0) continue;
    stolenSeen++;
    const who = (log[st] as Extract<BattleEvent, { kind: "status" }>).target;
    for (const e of log.slice(st)) if (e.kind === "damage" && e.source === who && e.target[0] === who[0]) friendly++;
    if (log.slice(st).some((e) => e.kind === "status" && e.status === "controlled" && !e.on && e.target === who)) back++;
    if (log.slice(st).some((e) => e.kind === "ko" && e.target === who)) executed++;
  }
  check("Makima : l'ennemi volé attaque son propre camp", stolenSeen > 0 && friendly > 0, `${stolenSeen} vols, ${friendly} coups contre son camp`);
  check("Makima : le contrôle prend fin", back > 0, `${back} fins`);
  // Exécution : atteindre explicitement l'ultime avant de contrôler le dernier ennemi.
  // Une bataille automatique contre un seul ennemi peut le tuer avant que la jauge soit chargée.
  {
    const st = createBattle([card(IDS.makima, { speed: 1000 })], [card(13)], seededRandom(1), { gauge: true, startingSide: "A" });
    check("Makima : agit avant le dernier ennemi", currentActor(st)?.id === "A1");
    st.teams.A[0].ultimateGauge = 100;
    applyAction(st, { spell: "ultimate", target: "B1" });
    const controlled = st.log.findIndex((e) => e.kind === "status" && e.target === "B1" && e.status === "controlled" && e.on);
    const executed = st.log.findIndex((e) => e.kind === "ko" && e.target === "B1");
    const end = st.log.find((e) => e.kind === "end");
    check("Makima : le dernier survivant volé est exécuté (victoire)", controlled >= 0 && executed > controlled && end?.kind === "end" && end.winner === "A" && st.teams.B[0].hp === 0);
  }
  void executed;

  // Okabe : les recharges de l'équipe sont remises à zéro
  {
    let ok = 0, n = 0;
    for (let s = 1; s <= 30 && n < 5; s++) {
      const st = createBattle([card(IDS.okabe), ...FOES.slice(4, 7).map((m) => card(m))], foes(), seededRandom(s), { gauge: true });
      while (currentActor(st)) {
        const a = autoAction(st);
        const actor = currentActor(st)!.id;
        applyAction(st, a);
        if (a.spell === "ultimate" && actor === "A1") {
          n++;
          if (st.teams.A.filter((u) => u.hp > 0).every((u) => u.pIn <= 1 && u.tIn <= 1)) ok++;
          break;
        }
      }
    }
    check("Okabe : Time Leap remet les recharges à zéro", n > 0 && ok === n, `${ok}/${n}`);
  }

  // Yuuji : 3 frappes, 4 si la cible a de la DEF en moins
  {
    const counts = { plain: new Set<number>(), debuffed: new Set<number>() };
    for (const debuff of [false, true]) for (let sd = 1; sd <= 20; sd++) {
      const st = createBattle([card(IDS.yuuji)], [card(17, { characterId: 999999, defense: 6000, attack: 1500, noSpell: true, noBasicAttack: true })], seededRandom(sd), { startingSide: "A", passive: false, combos: false, elements: false });
      const target = st.teams.B[0]; target.maxHp = 1000000; target.hp = target.maxHp; target.shield = 0;
      if (debuff) target.fx.push({ key: "defDown", stat: "def", amount: -0.2, turns: 2, fresh: false });
      st.teams.A[0].ultimateGauge = 100;
      applyAction(st, { spell: "ultimate", target: "B1" });
      counts[debuff ? "debuffed" : "plain"].add(st.log.filter((e) => e.kind === "damage" || e.kind === "dodge").length);
    }
    check("Yuuji : 3 frappes, 4 si la cible a de la DEF en moins", counts.plain.size === 1 && counts.plain.has(3) && counts.debuffed.size === 1 && counts.debuffed.has(4), `sans [${[...counts.plain]}], avec [${[...counts.debuffed]}]`);
  }

  // Denji : soigné quand on le frappe
  let lust = 0;
  for (let s = 1; s <= 40; s++) lust += run(IDS.denji, s).filter((e) => e.kind === "heal" && e.source === "A1" && e.target === "A1").length;
  check("Denji : Chainsaw Man soigne quand on le frappe", lust > 0, `${lust} soins`);

  // Kurapika : un sort lancé sous sceau tue ; l'IA ne lance pas de sort sous sceau
  let sealed = 0, killed = 0, aiCasts = 0;
  for (let s = 1; s <= 40; s++) {
    const st = createBattle([card(IDS.kurapika), ...FOES.slice(4, 7).map((m) => card(m))], foes(), seededRandom(s), { gauge: true });
    while (currentActor(st)) {
      const who = currentActor(st)!.id;
      let a = autoAction(st);
      const sealedNow = st.teams.B.find((u) => u.id === who)?.fx.some((f) => f.key === "seal");
      if (sealedNow) {
        sealed++;
        if (a.spell !== "base") aiCasts++;
        const spell = legalActions(st).find((x) => x.spell !== "base");
        if (spell) a = { spell: spell.spell, target: spell.targets[0] };
        const before = st.log.length;
        applyAction(st, a);
        if (a.spell !== "base" && st.log.slice(before).some((e) => e.kind === "ko" && e.target === who)) killed++;
      } else applyAction(st, a);
    }
  }
  check("Kurapika : lancer un sort sous sceau tue, l'IA s'en abstient", sealed > 0 && killed > 0 && aiCasts === 0, `${sealed} tours scellés, ${killed} morts, ${aiCasts} sorts de l'IA`);

  // Mob : l'ultime frappe une cible et grandit avec les coups reçus (30 coups au plus).
  {
    const hit = (hitsTaken: number) => {
      const st = createBattle([card(IDS.mob)], [card(17, { characterId: 999999, defense: 6000, attack: 1500, noSpell: true, noBasicAttack: true })], () => 0.99, { startingSide: "A", passive: false, combos: false, elements: false });
      st.teams.B[0].maxHp = 1000000; st.teams.B[0].hp = 1000000; st.teams.B[0].shield = 0;
      st.teams.A[0].hitsTaken = hitsTaken; st.teams.A[0].ultimateGauge = 100;
      applyAction(st, { spell: "ultimate", target: "B1" });
      return st.log.filter((e): e is Extract<BattleEvent, { kind: "damage" }> => e.kind === "damage");
    };
    const plain = hit(0), charged = hit(3), capped = hit(30), excess = hit(50);
    check("Mob : Explosion frappe une seule cible", [plain, charged, capped, excess].every((hits) => hits.length === 1 && hits[0].target === "B1"));
    check("Mob : +10 % par coup reçu, plafonné à 30 coups", Math.abs(charged[0].amount / plain[0].amount - 1.3) < 1e-9 && Math.abs(capped[0].amount / plain[0].amount - 4) < 1e-9 && capped[0].amount === excess[0].amount);
  }

  console.log(failures ? `\n${failures} échec(s)` : "\nTout est bon.");
  await prisma.$disconnect();
  process.exit(failures ? 1 : 0);
}
main();
