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
  /** PV à partir des stats de base (provisoire : DEF × 3) */
  hp: (_attack: number, defense: number) => defense * 3,
  /** Dégâts minimum, en part de l'ATK */
  floor: 0.1,
  /** Variation aléatoire des dégâts (±) */
  variance: 0.1,
  /** Au-delà, l'équipe avec le plus de PV restants (en %) gagne */
  maxRounds: 30,
  strong: 1.25,
  weak: 0.8,
  /** Actions du lanceur entre deux sorts affiliés ; le premier sort part à sa 2e action */
  spellCooldown: 3,
  gaugeMax: 100,
  gaugePerAction: 20,
  gaugePerHit: 10,
  ultimateRarities: ["SSR", "UR"] as Rarity[],
  /** Passif UR : bonus ATK/DEF donné à chaque allié de la même franchise, cumulable entre UR, plafonné */
  passivePerUr: 0.1,
  passiveCap: 0.3,
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
}

export interface BattleResult {
  winner: Side | null;
  first: Side;
  rounds: number;
  timeout: boolean;
  hpLeft: Record<Side, number>;
}

/** Bonus du passif UR pour chaque carte de l'équipe. */
function passiveBonus(team: BattleCard[]) {
  return team.map((c, i) => {
    const urs = team.filter((o, j) => j !== i && o.rarity === "UR" && o.franchiseId != null && o.franchiseId === c.franchiseId).length;
    return Math.min(BATTLE.passiveCap, urs * BATTLE.passivePerUr);
  });
}

function makeUnits(team: BattleCard[], side: Side, opts: Required<BattleOptions>): Unit[] {
  const bonus = opts.passive ? passiveBonus(team) : team.map(() => 0);
  return team.map((card, i) => {
    const def = card.defense * (1 + bonus[i]);
    const maxHp = BATTLE.hp(card.attack, card.defense) * (1 + bonus[i]);
    return {
      card, side, def, maxHp, hp: maxHp,
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
  const opts = { ultimates: true, passive: true, ...options };
  const teams: Record<Side, Unit[]> = { A: makeUnits(a, "A", opts), B: makeUnits(b, "B", opts) };
  const maxPower = (t: BattleCard[]) => Math.max(...t.map((c) => c.power));
  const first: Side = maxPower(b) > maxPower(a) ? "B" : "A";
  const order: Side[] = first === "A" ? ["A", "B"] : ["B", "A"];
  const alive = (s: Side) => teams[s].filter((u) => u.hp > 0);
  const enemy = (s: Side): Side => (s === "A" ? "B" : "A");

  const hit = (u: Unit, t: Unit, mult: number, ignoreDef = 0) => {
    const def = t.def * (1 - ignoreDef);
    let dmg = u.atk * affinity(u.card.type, t.card.type) * mult * Math.max(BATTLE.floor, u.atk / (u.atk + def));
    if (t.markHits > 0) {
      dmg *= 1 + t.mark;
      t.markHits--;
    }
    dmg *= 1 + (rng() * 2 - 1) * BATTLE.variance;
    t.hp = Math.max(0, t.hp - dmg);
    if (t.hasUltimate) t.gauge += BATTLE.gaugePerHit;
    return dmg;
  };
  const weakest = (units: Unit[]) => units.reduce((m, x) => (x.hp < m.hp ? x : m));
  const heal = (t: Unit, part: number) => (t.hp = Math.min(t.maxHp, t.hp + t.maxHp * part));

  /** Sort affilié (power 1) ou ultime (power 2, version renforcée en attendant les gabarits d'ultimes). */
  const cast = (u: Unit, power: number) => {
    const foes = alive(enemy(u.side));
    const target = weakest(foes);
    switch (u.card.type) {
      case "COMBAT":
        hit(u, target, 2 * power, 0.5);
        break;
      case "MYSTERE":
        hit(u, target, power);
        for (const f of power > 1 ? foes : [target]) {
          if (f.hp > 0) Object.assign(f, { mark: 0.3 * power, markHits: 3 });
        }
        break;
      case "MAGIE":
        heal(u, (hit(u, target, 1.3 * power) * 0.5) / u.maxHp);
        break;
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
      hit(u, weakest(alive(enemy(u.side))), 1);
    }
    if (u.hasUltimate) u.gauge += BATTLE.gaugePerAction;
  };

  let rounds = 0;
  while (rounds < BATTLE.maxRounds && alive("A").length && alive("B").length) {
    rounds++;
    for (let pos = 0; pos < BATTLE.teamSize; pos++) {
      for (const s of order) {
        const u = teams[s][pos];
        if (u && u.hp > 0 && alive(enemy(s)).length) act(u);
      }
    }
  }

  const hpLeft = (s: Side) => teams[s].reduce((n, u) => n + u.hp, 0) / teams[s].reduce((n, u) => n + u.maxHp, 0);
  const left = { A: hpLeft("A"), B: hpLeft("B") };
  const winner: Side | null = left.A === left.B ? null : left.A > left.B ? "A" : "B";
  return { winner, first, rounds, timeout: alive("A").length > 0 && alive("B").length > 0, hpLeft: left };
}
