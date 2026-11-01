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

  // Killua : Godspeed +vitesse ; Kanmuru touche tout le monde, cible choisie d'abord
  const kg = first(IDS.killua, "Godspeed");
  check("Killua : Godspeed donne Vitesse +", !!kg?.seg.some((e) => e.kind === "status" && e.status === "speedUp" && e.on));
  const kk = first(IDS.killua, "Foudre divine Kanmuru");
  const kd = kk?.seg.filter((e): e is Extract<BattleEvent, { kind: "damage" }> => e.kind === "damage") ?? [];
  const act = kk?.seg[0] as Extract<BattleEvent, { kind: "action" }> | undefined;
  check("Killua : Kanmuru frappe la cible choisie puis tous les autres + Vitesse +", kd.length >= 2 && kd[0].target === act?.target && new Set(kd.map((e) => e.target)).size === kd.length && !!kk?.seg.some((e) => e.kind === "status" && e.status === "speedUp"), `${kd.length} cibles`);

  // Eren : soin total, ATK/DEF +, DEF ennemie −, zone (état du moteur juste après l'ultime)
  {
    let n = 0, ok = 0, full = 0;
    for (let sd = 1; sd <= 30 && n < 5; sd++) {
      const st = createBattle([card(IDS.eren), ...FOES.slice(4, 7).map((m) => card(m))], foes(), seededRandom(sd), { gauge: true });
      while (currentActor(st)) {
        const a = autoAction(st);
        const actor = currentActor(st)!.id;
        if (a.spell === "ultimate" && actor === "A1") st.teams.A[0].hp = st.teams.A[0].maxHp * 0.3;
        applyAction(st, a);
        if (a.spell === "ultimate" && actor === "A1") {
          n++;
          const eren = st.teams.A[0];
          if (eren.fx.some((f) => f.key === "atkUp") && eren.fx.some((f) => f.key === "defUp") && st.teams.B.filter((u) => u.hp > 0).every((u) => u.fx.some((f) => f.key === "defDown"))) ok++;
          if (eren.hp >= eren.maxHp * 0.99 || eren.hp > 0.9 * eren.maxHp) full++;
          break;
        }
      }
    }
    check("Eren : transformation (ATK+, DEF+, DEF ennemie −)", n > 0 && ok === n, `${ok}/${n}`);
    check("Eren : récupère tous ses PV (30 % → plein, moins les coups de sa zone)", n > 0 && full === n, `${full}/${n}`);
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
  // Exécution : 1 seul ennemi à voler
  let exec1 = 0;
  for (let s = 1; s <= 30; s++) {
    const log = battle([card(IDS.makima), card(FOES[4]), card(FOES[5]), card(FOES[6])], [card(13)], seededRandom(s), { gauge: true }).log;
    const win = log.find((e) => e.kind === "end") as Extract<BattleEvent, { kind: "end" }>;
    if (log.some((e) => e.kind === "status" && e.status === "controlled" && e.on) && win.winner === "A") exec1++;
  }
  check("Makima : le dernier survivant volé est exécuté (victoire)", exec1 > 0, `${exec1} cas`);
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
    for (const debuff of [false, true]) {
      for (let sd = 1; sd <= 20; sd++) {
        const st = createBattle([card(IDS.yuuji), ...FOES.slice(4, 7).map((m) => card(m))], foes(4, { defense: 6000, attack: 1500 }), seededRandom(sd), { gauge: true });
        while (currentActor(st)) {
          const a = autoAction(st);
          const actor = currentActor(st)!.id;
          if (a.spell === "ultimate" && actor === "A1") {
            for (const u of st.teams.B) u.fx = [];
            if (debuff) for (const u of st.teams.B) u.fx.push({ key: "defDown", stat: "def", amount: -0.2, turns: 2, fresh: false });
            const before = st.log.length;
            applyAction(st, a);
            counts[debuff ? "debuffed" : "plain"].add(st.log.slice(before).filter((e) => e.kind === "damage" || e.kind === "dodge").length);
            break;
          }
          applyAction(st, a);
        }
      }
    }
    check("Yuuji : 3 frappes, 4 si la cible a de la DEF en moins", [...counts.plain].every((n) => n === 3) && [...counts.debuffed].every((n) => n === 4), `sans [${[...counts.plain]}], avec [${[...counts.debuffed]}]`);
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

  // Mob : 3 frappes de zone avec DEF −, ATK −, puis Esquive/Vitesse −
  {
    let ok = 0, n = 0, hits = 0;
    for (let sd = 1; sd <= 30 && n < 5; sd++) {
      const st = createBattle([card(IDS.mob), ...FOES.slice(4, 7).map((m) => card(m))], foes(4, { defense: 6000, attack: 1500 }), seededRandom(sd), { gauge: true });
      while (currentActor(st)) {
        const a = autoAction(st);
        const actor = currentActor(st)!.id;
        const before = st.log.length;
        applyAction(st, a);
        if (a.spell === "ultimate" && actor === "A1") {
          n++;
          hits = st.log.slice(before).filter((e) => e.kind === "damage").length;
          if (st.teams.B.filter((u) => u.hp > 0).every((u) => ["defDown", "atkDown", "dodgeDown", "speedDown"].every((k) => u.fx.some((f) => f.key === k)))) ok++;
          break;
        }
      }
    }
    check("Mob : 3 zones, puis DEF −, ATK −, Esquive −, Vitesse − sur tous", n > 0 && ok === n && hits >= 6, `${ok}/${n}, ${hits} coups`);
  }

  console.log(failures ? `\n${failures} échec(s)` : "\nTout est bon.");
  await prisma.$disconnect();
  process.exit(failures ? 1 : 0);
}
main();
