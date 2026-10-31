// Combat 4 contre 4 à sorts (refonte de l'étape 4, en discussion) : moteur pur, sans accès à la base.
// Toutes les valeurs sont provisoires et regroupées dans BATTLE pour l'équilibrage (npm run simulate:battle).

import type { CardType, Rarity } from "../generated/prisma/enums";

export type Random = () => number;
export type Side = "A" | "B";

export interface BattleCard {
  characterId: number;
  rarity: Rarity;
  type: CardType;
  attack: number;
  defense: number;
  /** Stat Puissance (popularité) : décide quelle équipe commence. */
  power: number;
  franchiseId: number | null;
}

export const BATTLE = {
  teamSize: 4,
  /** PV à partir des stats de base ; la DEF ne sert qu'à réduire les dégâts */
  hp: (attack: number, defense: number) => attack + defense,
  /** Dégâts = ATK × % du sort × defK / (defK + DEF) : la DEF réduit de moitié quand elle vaut defK */
  defK: 2000,
  /** Dégâts minimum, en part de l'ATK */
  floor: 0.1,
  critRate: 0.15,
  critDamage: 1.5,
  /** L'équipe qui joue en second reçoit un bouclier (part des PV max) qui disparaît à la fin du 1er tour */
  secondShield: 0.15,
  /** Variation aléatoire des dégâts (±) */
  variance: 0.1,
  /** Au-delà, l'équipe avec le plus de PV restants (en %) gagne */
  maxRounds: 30,
  strong: 1.1,
  weak: 0.95,
  /** Actions du lanceur entre deux sorts affiliés ; le premier sort part à sa 2e action */
  spellCooldown: 3,
  gaugeMax: 100,
  gaugePerAction: 20,
  gaugePerHit: 10,
  ultimateRarities: ["SSR", "UR"] as Rarity[],
  /** Passif UR : bonus ATK/DEF donné à chaque allié de la même franchise, cumulable entre UR, plafonné */
  passivePerUr: 0.1,
  passiveCap: 0.3,
  /** Synergie de franchise : bonus ATK/DEF/PV selon le nombre de cartes de la même franchise (indice = nombre) */
  franchiseBonus: [0, 0, 0.03, 0.06, 0.1],
  /** Jeu de sorts affiliés en test (voir SPELL_SETS) */
  spells: "roles" as SpellSet,
  /** Combat garde son sort au plus N actions en attendant une cible exposée (si un allié Mystère est en vie) */
  comboHold: 2,
};

/**
 * Jeux de sorts affiliés comparés par la simulation :
 * - current : version de départ (marque, coup puissant, drain, soin, attaque de zone) + combos ajoutés ensuite
 * - roles   : rôles de RPG, combos en duo (exposé → Combat, bouclier → +15 % de dégâts, drain partagé)
 * - ring    : anneau Mystère → Combat → Magie → Aventure → Cœur → Mystère, chaque type prépare le suivant
 * - simple  : chiffres sans états ; combo = duo de types voisins dans le cycle (+8 % de stats)
 */
export type SpellSet = "current" | "roles" | "ring" | "simple";

/** Cycle d'affinités : chaque type est fort contre le suivant et faible contre le précédent. */
const CYCLE: CardType[] = ["COMBAT", "MYSTERE", "MAGIE", "COEUR", "AVENTURE"];

export function affinity(attacker: CardType, defender: CardType) {
  const i = CYCLE.indexOf(attacker);
  const j = CYCLE.indexOf(defender);
  if ((i + 1) % CYCLE.length === j) return BATTLE.strong;
  if ((j + 1) % CYCLE.length === i) return BATTLE.weak;
  return 1;
}

interface Unit {
  card: BattleCard;
  side: Side;
  atk: number;
  def: number;
  maxHp: number;
  hp: number;
  shield: number;
  spellIn: number;
  gauge: number;
  hasUltimate: boolean;
  held: number;
  /** Marque (current) : dégâts reçus augmentés pendant `markHits` coups */
  mark: number;
  markHits: number;
  /** Exposé par Mystère : le prochain coup puissant de Combat sur cette cible est renforcé */
  exposed: boolean;
  /** Brisé : DEF −30 % pendant N coups reçus */
  brokenHits: number;
  /** Maudit : perd `curseDmg` PV à chaque fin de tour pendant N tours */
  cursed: number;
  curseDmg: number;
  /** Élan : ATK +10 % pendant N actions ; Affaibli : ATK −20 % pendant N actions */
  elan: number;
  weaken: number;
  /** Multiplicateur de DEF durable (simple : −30 % par Mystère, non cumulable) */
  defMult: number;
}

export interface BattleOptions {
  ultimates?: boolean;
  passive?: boolean;
  franchise?: boolean;
  combos?: boolean;
}

export interface BattleResult {
  winner: Side | null;
  first: Side;
  rounds: number;
  timeout: boolean;
  hpLeft: Record<Side, number>;
}

const neighbours = (t: CardType) => {
  const i = CYCLE.indexOf(t);
  return [CYCLE[(i + 1) % CYCLE.length], CYCLE[(i + CYCLE.length - 1) % CYCLE.length]];
};

/** Bonus de stats de chaque carte : passif UR, synergie de franchise, duo de types (jeu simple). */
function statBonus(team: BattleCard[], opts: Required<BattleOptions>) {
  return team.map((c, i) => {
    const same = team.filter((o) => c.franchiseId != null && o.franchiseId === c.franchiseId);
    const urs = same.filter((o) => o !== team[i] && o.rarity === "UR").length;
    const passive = opts.passive ? Math.min(BATTLE.passiveCap, urs * BATTLE.passivePerUr) : 0;
    const franchise = opts.franchise ? BATTLE.franchiseBonus[same.length] ?? 0 : 0;
    const duo = BATTLE.spells === "simple" && opts.combos && team.some((o) => neighbours(c.type).includes(o.type)) ? 0.08 : 0;
    return passive + franchise + duo;
  });
}

function makeUnits(team: BattleCard[], side: Side, opts: Required<BattleOptions>): Unit[] {
  const bonus = statBonus(team, opts);
  return team.map((card, i) => {
    const maxHp = BATTLE.hp(card.attack, card.defense) * (1 + bonus[i]);
    return {
      card, side, maxHp, hp: maxHp, shield: 0,
      atk: card.attack * (1 + bonus[i]),
      def: card.defense * (1 + bonus[i]),
      spellIn: 2,
      gauge: 0,
      hasUltimate: opts.ultimates && BATTLE.ultimateRarities.includes(card.rarity),
      held: 0, mark: 0, markHits: 0, exposed: false, brokenHits: 0, cursed: 0, curseDmg: 0, elan: 0, weaken: 0, defMult: 1,
    };
  });
}

export function battle(a: BattleCard[], b: BattleCard[], rng: Random, options: BattleOptions = {}): BattleResult {
  const opts = { ultimates: true, passive: true, franchise: true, combos: true, ...options };
  const set = BATTLE.spells;
  const teams: Record<Side, Unit[]> = { A: makeUnits(a, "A", opts), B: makeUnits(b, "B", opts) };
  const maxPower = (t: BattleCard[]) => Math.max(...t.map((c) => c.power));
  const first: Side = maxPower(b) > maxPower(a) ? "B" : "A";
  const order: Side[] = first === "A" ? ["A", "B"] : ["B", "A"];
  const alive = (s: Side) => teams[s].filter((u) => u.hp > 0);
  const enemy = (s: Side): Side => (s === "A" ? "B" : "A");

  const hit = (u: Unit, t: Unit, mult: number, ignoreDef = 0) => {
    let def = t.def * t.defMult * (1 - ignoreDef);
    if (t.brokenHits > 0) {
      def *= 0.7;
      t.brokenHits--;
    }
    let atk = u.atk * (1 + (u.elan > 0 ? 0.1 : 0) - (u.weaken > 0 ? 0.2 : 0));
    if (opts.combos && set === "roles" && u.shield > 0) atk *= 1.15;
    if (opts.combos && set === "current" && u.card.type === "AVENTURE" && u.shield > 0) atk *= 1.5;
    let dmg = atk * affinity(u.card.type, t.card.type) * mult * Math.max(BATTLE.floor, BATTLE.defK / (BATTLE.defK + def));
    if (rng() < BATTLE.critRate) dmg *= BATTLE.critDamage;
    if (t.markHits > 0) {
      dmg *= 1 + t.mark;
      t.markHits--;
    }
    dmg *= 1 + (rng() * 2 - 1) * BATTLE.variance;
    const absorbed = Math.min(t.shield, dmg);
    t.shield -= absorbed;
    t.hp = Math.max(0, t.hp - (dmg - absorbed));
    if (t.hasUltimate) t.gauge += BATTLE.gaugePerHit;
    return dmg;
  };
  const weakest = (units: Unit[]) => units.reduce((m, x) => (x.hp < m.hp ? x : m));
  const mostHurt = (units: Unit[]) => units.reduce((m, x) => (x.hp / x.maxHp < m.hp / m.maxHp ? x : m));
  const heal = (t: Unit, part: number, shield = 0) => {
    t.hp = Math.min(t.maxHp, t.hp + t.maxHp * part);
    t.shield += t.maxHp * shield;
  };
  const drain = (x: Unit, amount: number) => (x.hp = Math.min(x.maxHp, x.hp + amount));

  /** Sort affilié (p = 1) ou ultime (p = 2 : version renforcée, état appliqué à toute l'équipe adverse). */
  const cast = (u: Unit, p: number) => {
    const foes = alive(enemy(u.side));
    const allies = alive(u.side);
    const target = weakest(foes);
    const exposed = opts.combos ? foes.filter((f) => f.exposed) : [];
    const hearts = opts.combos ? allies.filter((x) => x.card.type === "COEUR") : [];
    const many = (one: Unit) => (p > 1 ? foes : [one]);
    const t = u.card.type;

    if (set === "current") {
      if (t === "COMBAT") {
        const x = exposed.length ? weakest(exposed) : target;
        hit(u, x, 2 * p * (opts.combos && x.exposed ? 2 : 1), 0.5);
        x.exposed = false;
      } else if (t === "MYSTERE") {
        hit(u, target, p);
        for (const f of many(target)) if (f.hp > 0) Object.assign(f, { mark: 0.3 * p, markHits: 3, exposed: opts.combos });
      } else if (t === "MAGIE") {
        const d = hit(u, target, 1.3 * p) * (hearts.length ? 1 : 0.5);
        for (const x of [u, ...hearts]) drain(x, d);
      } else if (t === "COEUR") {
        for (const x of p > 1 ? allies : [mostHurt(allies)]) heal(x, 0.25, opts.combos ? 0.2 : 0);
      } else for (const f of foes) hit(u, f, 0.5 * p);
      return;
    }

    if (set === "roles") {
      if (t === "COMBAT") {
        const x = exposed.length ? weakest(exposed) : target;
        hit(u, x, 1.5 * p * (opts.combos && x.exposed ? 1.7 : 1), 0.4);
        x.exposed = false;
      } else if (t === "MYSTERE") {
        // Sans allié Combat pour exploiter l'exposition, Mystère tape plus fort lui-même
        hit(u, target, (allies.some((x) => x.card.type === "COMBAT") ? 0.8 : 1.2) * p);
        for (const f of many(target)) if (f.hp > 0) Object.assign(f, { exposed: opts.combos, weaken: 2 });
      } else if (t === "MAGIE") {
        const d = hit(u, target, 1.2 * p) * 0.5;
        for (const x of [u, ...hearts]) drain(x, d);
      } else if (t === "COEUR") {
        heal(mostHurt(allies), 0.3 * p);
        for (const x of allies) x.shield += x.maxHp * 0.1 * p;
      } else {
        for (const f of foes) hit(u, f, 0.6 * p);
        for (const x of allies) x.elan = 2;
      }
      return;
    }

    if (set === "ring") {
      if (t === "MYSTERE") {
        hit(u, target, p);
        const all = p > 1 || (opts.combos && u.shield > 0);
        for (const f of all ? foes : [target]) if (f.hp > 0) f.exposed = true;
      } else if (t === "COMBAT") {
        const x = exposed.length ? weakest(exposed) : target;
        hit(u, x, 1.6 * p * (opts.combos && x.exposed ? 2 : 1));
        x.exposed = false;
        for (const f of many(x)) if (f.hp > 0) f.brokenHits = 2;
      } else if (t === "MAGIE") {
        const broken = opts.combos && target.brokenHits > 0;
        drain(u, hit(u, target, 1.1 * p) * (broken ? 1 : 0.4));
        for (const f of many(target)) if (f.hp > 0) Object.assign(f, { cursed: 3, curseDmg: f.maxHp * 0.06 });
      } else if (t === "AVENTURE") {
        for (const f of foes) hit(u, f, 0.5 * p * (opts.combos && f.cursed > 0 ? 1.5 : 1));
        for (const x of allies) x.elan = 2;
      } else {
        const team = p > 1 || (opts.combos && allies.some((x) => x.elan > 0));
        if (team) for (const x of allies) heal(x, 0.2 * p);
        heal(mostHurt(allies), 0.3, 0.15 * p);
      }
      return;
    }

    // simple
    if (t === "COMBAT") hit(u, target, 2 * p);
    else if (t === "MYSTERE") {
      hit(u, target, p);
      for (const f of many(target)) f.defMult = 0.7;
    } else if (t === "MAGIE") drain(u, hit(u, target, 1.3 * p) * 0.5);
    else if (t === "COEUR") {
      const x = mostHurt(allies);
      heal(x, 0.35 * p);
      for (const o of allies) if (o !== x) heal(o, 0.1 * p);
    } else for (const f of foes) hit(u, f, 0.7 * p);
  };

  const act = (u: Unit) => {
    if (u.spellIn > 0) u.spellIn--;
    const hurtAlly = alive(u.side).some((x) => x.hp < x.maxHp * 0.7);
    const waitForExposed =
      opts.combos && set !== "simple" && u.card.type === "COMBAT" && u.held < BATTLE.comboHold &&
      alive(u.side).some((x) => x.card.type === "MYSTERE") && !alive(enemy(u.side)).some((f) => f.exposed);
    if (u.hasUltimate && u.gauge >= BATTLE.gaugeMax) {
      u.gauge = 0;
      cast(u, 2);
    } else {
      if (u.spellIn === 0 && waitForExposed) {
        u.held++;
        hit(u, weakest(alive(enemy(u.side))), 1);
      } else if (u.spellIn === 0 && (u.card.type !== "COEUR" || hurtAlly)) {
        u.spellIn = BATTLE.spellCooldown;
        u.held = 0;
        cast(u, 1);
      } else {
        hit(u, weakest(alive(enemy(u.side))), 1);
      }
      if (u.hasUltimate) u.gauge += BATTLE.gaugePerAction;
    }
    if (u.elan > 0) u.elan--;
    if (u.weaken > 0) u.weaken--;
  };

  for (const u of teams[order[1]]) u.shield = u.maxHp * BATTLE.secondShield;
  let rounds = 0;
  while (rounds < BATTLE.maxRounds && alive("A").length && alive("B").length) {
    rounds++;
    for (let pos = 0; pos < BATTLE.teamSize; pos++) {
      for (const s of order) {
        const u = teams[s][pos];
        if (u && u.hp > 0 && alive(enemy(s)).length) act(u);
      }
    }
    for (const u of [...teams.A, ...teams.B]) {
      if (u.hp > 0 && u.cursed > 0) {
        u.hp = Math.max(0, u.hp - u.curseDmg);
        u.cursed--;
      }
    }
    if (rounds === 1) for (const u of teams[order[1]]) u.shield = Math.max(0, u.shield - u.maxHp * BATTLE.secondShield);
  }

  const hpLeft = (s: Side) => teams[s].reduce((n, u) => n + u.hp, 0) / teams[s].reduce((n, u) => n + u.maxHp, 0);
  const left = { A: hpLeft("A"), B: hpLeft("B") };
  const winner: Side | null = left.A === left.B ? null : left.A > left.B ? "A" : "B";
  return { winner, first, rounds, timeout: alive("A").length > 0 && alive("B").length > 0, hpLeft: left };
}
