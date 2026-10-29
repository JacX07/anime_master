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
  strong: 1.15,
  weak: 0.9,
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
  franchiseBonus: [0, 0, 0.05, 0.1, 0.15],
  /** Combos : coup puissant sur cible marquée, bouclier du soin, Aventure protégée, drain partagé */
  comboMarked: 1.5,
  comboHealShield: 0.1,
  comboShielded: 1.2,
  /** Formation : les `frontSize` premières positions encaissent les attaques ciblées tant qu'elles tiennent */
  frontSize: 2,
};

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
  /** Marque de Mystère : dégâts reçus augmentés pendant `markHits` coups */
  mark: number;
  markHits: number;
}

export interface BattleOptions {
  ultimates?: boolean;
  passive?: boolean;
  franchise?: boolean;
  combos?: boolean;
  formation?: boolean;
}

export interface BattleResult {
  winner: Side | null;
  first: Side;
  rounds: number;
  timeout: boolean;
  hpLeft: Record<Side, number>;
}

/** Bonus de stats de chaque carte : passif UR et synergie de franchise. */
function statBonus(team: BattleCard[], opts: Required<BattleOptions>) {
  return team.map((c, i) => {
    const same = team.filter((o) => c.franchiseId != null && o.franchiseId === c.franchiseId);
    const urs = same.filter((o) => o !== team[i] && o.rarity === "UR").length;
    const passive = opts.passive ? Math.min(BATTLE.passiveCap, urs * BATTLE.passivePerUr) : 0;
    const franchise = opts.franchise ? BATTLE.franchiseBonus[same.length] ?? 0 : 0;
    return passive + franchise;
  });
}

function makeUnits(team: BattleCard[], side: Side, opts: Required<BattleOptions>): Unit[] {
  const bonus = statBonus(team, opts);
  return team.map((card, i) => {
    const def = card.defense * (1 + bonus[i]);
    const maxHp = BATTLE.hp(card.attack, card.defense) * (1 + bonus[i]);
    return {
      card, side, def, maxHp, hp: maxHp, shield: 0,
      atk: card.attack * (1 + bonus[i]),
      spellIn: 2,
      gauge: 0,
      hasUltimate: opts.ultimates && BATTLE.ultimateRarities.includes(card.rarity),
      mark: 0,
      markHits: 0,
    };
  });
}

export function battle(a: BattleCard[], b: BattleCard[], rng: Random, options: BattleOptions = {}): BattleResult {
  const opts = { ultimates: true, passive: true, franchise: true, combos: true, formation: true, ...options };
  const teams: Record<Side, Unit[]> = { A: makeUnits(a, "A", opts), B: makeUnits(b, "B", opts) };
  const maxPower = (t: BattleCard[]) => Math.max(...t.map((c) => c.power));
  const first: Side = maxPower(b) > maxPower(a) ? "B" : "A";
  const order: Side[] = first === "A" ? ["A", "B"] : ["B", "A"];
  const alive = (s: Side) => teams[s].filter((u) => u.hp > 0);
  const enemy = (s: Side): Side => (s === "A" ? "B" : "A");
  /** Cibles d'une attaque ciblée : la première ligne d'abord si la formation est active. */
  const targetable = (s: Side) => {
    const front = teams[s].slice(0, BATTLE.frontSize).filter((u) => u.hp > 0);
    return opts.formation && front.length ? front : alive(s);
  };

  const hit = (u: Unit, t: Unit, mult: number, ignoreDef = 0) => {
    const def = t.def * (1 - ignoreDef);
    let dmg = u.atk * affinity(u.card.type, t.card.type) * mult * Math.max(BATTLE.floor, BATTLE.defK / (BATTLE.defK + def));
    if (rng() < BATTLE.critRate) dmg *= BATTLE.critDamage;
    if (opts.combos && u.card.type === "AVENTURE" && u.shield > 0) dmg *= BATTLE.comboShielded;
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
  const heal = (t: Unit, part: number) => {
    t.hp = Math.min(t.maxHp, t.hp + t.maxHp * part);
    if (opts.combos) t.shield += t.maxHp * BATTLE.comboHealShield;
  };

  /** Sort affilié (power 1) ou ultime (power 2, version renforcée en attendant les gabarits d'ultimes). */
  const cast = (u: Unit, power: number) => {
    const foes = alive(enemy(u.side));
    const targets = targetable(enemy(u.side));
    const target = weakest(targets);
    switch (u.card.type) {
      case "COMBAT": {
        const marked = opts.combos ? targets.filter((f) => f.markHits > 0) : [];
        if (marked.length) {
          const t = weakest(marked);
          hit(u, t, 2 * power * BATTLE.comboMarked, 0.5);
          t.markHits = 0;
        } else hit(u, target, 2 * power, 0.5);
        break;
      }
      case "MYSTERE":
        hit(u, target, power);
        for (const f of power > 1 ? foes : [target]) {
          if (f.hp > 0) Object.assign(f, { mark: 0.3 * power, markHits: 3 });
        }
        break;
      case "MAGIE": {
        const drained = hit(u, target, 1.3 * power) * 0.5;
        u.hp = Math.min(u.maxHp, u.hp + drained);
        if (opts.combos) for (const x of alive(u.side)) if (x.card.type === "COEUR") x.hp = Math.min(x.maxHp, x.hp + drained);
        break;
      }
      case "COEUR": {
        const allies = alive(u.side);
        if (power > 1) for (const x of allies) heal(x, 0.25);
        else heal(allies.reduce((m, x) => (x.hp / x.maxHp < m.hp / m.maxHp ? x : m)), 0.25);
        break;
      }
      case "AVENTURE":
        for (const f of foes) hit(u, f, 0.5 * power);
        break;
    }
  };

  const act = (u: Unit) => {
    if (u.spellIn > 0) u.spellIn--;
    const hurtAlly = alive(u.side).some((x) => x.hp < x.maxHp * 0.7);
    if (u.hasUltimate && u.gauge >= BATTLE.gaugeMax) {
      u.gauge = 0;
      cast(u, 2);
      return;
    }
    if (u.spellIn === 0 && (u.card.type !== "COEUR" || hurtAlly)) {
      u.spellIn = BATTLE.spellCooldown;
      cast(u, 1);
    } else {
      hit(u, weakest(targetable(enemy(u.side))), 1);
    }
    if (u.hasUltimate) u.gauge += BATTLE.gaugePerAction;
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
    if (rounds === 1) for (const u of teams[order[1]]) u.shield = Math.max(0, u.shield - u.maxHp * BATTLE.secondShield);
  }

  const hpLeft = (s: Side) => teams[s].reduce((n, u) => n + u.hp, 0) / teams[s].reduce((n, u) => n + u.maxHp, 0);
  const left = { A: hpLeft("A"), B: hpLeft("B") };
  const winner: Side | null = left.A === left.B ? null : left.A > left.B ? "A" : "B";
  return { winner, first, rounds, timeout: alive("A").length > 0 && alive("B").length > 0, hpLeft: left };
}
