// Combat 4 contre 4 à sorts (docs/specs/combat.md) : moteur pur, sans accès à la base.
// Le combat avance action par action (createBattle → currentActor → applyAction), ce qui sert au mode manuel ;
// battle() le joue en entier avec la stratégie automatique. Chaque étape est inscrite dans un journal (BattleEvent)
// que l'affichage rejoue. Mêmes cartes, même graine et mêmes actions = même journal.
// Toutes les valeurs sont provisoires et regroupées dans BATTLE pour l'équilibrage (npm run simulate:battle).

import type { CardType, Rarity } from "../generated/prisma/enums";

import { spellOf, SPELL_COOLDOWN, SPELL_FIRST, type CharacterSpell, type Effect, type ModStat, type Scope } from "./spells";

export type Random = () => number;

/** Générateur aléatoire à graine (mulberry32) : même graine, même suite de tirages, côté serveur comme dans le navigateur. */
export function seededRandom(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Side = "A" | "B";
/** Côté + position 1 à 4, par exemple "A1" ou "B4". */
export type UnitId = `${Side}${number}`;

export interface BattleCard {
  characterId: number;
  rarity: Rarity;
  type: CardType;
  attack: number;
  defense: number;
  /** Stat Puissance (popularité) : décide quelle équipe commence. */
  power: number;
  franchiseId: number | null;
  /** Éveil, 0 à 5 étoiles (0 par défaut) */
  stars?: number;
  /** Arme légendaire, équipable à 5 étoiles seulement */
  weapon?: Weapon | null;
  /** Boss d'histoire ou de raid : résiste au silence */
  boss?: boolean;
  /** Retire le sort de personnage de cette carte (simulations d'équilibre) */
  noSpell?: boolean;
  /** Sort de personnage imposé (Spell Builder) : prioritaire sur celui de spells.ts */
  spell?: CharacterSpell;
}

/** Passif d'arme : esquive des sorts affiliés adverses, ou renfort de l'ATK des alliés d'un type (porteur compris). */
export type WeaponPassive = { kind: "dodge"; chance: number } | { kind: "typeAura"; type: CardType; bonus: number };

export interface Weapon {
  /** Bonus d'ATK, de DEF et de PV (0,05 = +5 %) */
  stat: number;
  passive: WeaponPassive | null;
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
  /** Passif UR : bonus ATK/DEF donné à chaque allié de la même franchise, cumulable entre UR, plafonné */
  passivePerUr: 0.1,
  passiveCap: 0.3,
  /** Synergie de franchise : bonus ATK/DEF/PV selon le nombre de cartes de la même franchise (indice = nombre) */
  franchiseBonus: [0, 0, 0.03, 0.06, 0.1],
  /** Éveil : bonus d'ATK, de DEF et de PV par étoile (à fixer au simulateur) */
  starBonus: 0.02,
  /** Éveil : à partir de ce nombre d'étoiles, le cooldown du sort affilié baisse d'une action */
  cooldownStar: 5,
  /** Plafond du total des bonus ou malus d'ATK et de DEF (±), du critique (0 à critCap) et de l'esquive des effets */
  statCap: 0.4,
  critCap: 0.75,
  dodgeCap: 0.5,
  /** Durée d'Affaibli et d'Élan, en actions de la carte qui les porte */
  statusTurns: 2,
  /** En automatique, Cœur ne lance son sort que si un allié est sous cette part de ses PV */
  healBelow: 0.7,
  /** En automatique, Combat garde son sort au plus N actions en attendant une cible exposée (si un allié Mystère est en vie) */
  comboHold: 2,
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

export interface BattleOptions {
  passive?: boolean;
  franchise?: boolean;
  combos?: boolean;
  /** Sorts de personnage des SSR et UR (par défaut : oui) */
  spells?: boolean;
}

export type Spell = "base" | "affinity" | "special";
/** Effets durables des sorts de personnage : bonus et malus de stat (Up / Down), silence, immunité, poison, soin sur la durée */
export type FxKey = `${ModStat}${"Up" | "Down"}` | "silence" | "immune" | "poison" | "regen";
export type Status = "exposed" | "weaken" | "elan" | FxKey;

/** Choix d'une carte : son sort et sa cible (ennemi, ou allié pour le soin de Cœur ; null pour la zone d'Aventure). */
export interface Action {
  spell: Spell;
  target: UnitId | null;
}

/** Une carte en combat, telle que l'affichage la voit. */
export interface UnitView {
  id: UnitId;
  characterId: number;
  rarity: Rarity;
  type: CardType;
  atk: number;
  def: number;
  maxHp: number;
  hp: number;
  shield: number;
}

/**
 * Journal du combat, dans l'ordre où l'affichage doit le rejouer.
 * Les événements qui changent des PV ou un bouclier portent la nouvelle valeur (hp, shield) : rien à recalculer.
 */
export type BattleEvent =
  | { kind: "start"; first: Side; units: UnitView[] }
  | { kind: "round"; round: number }
  /** Une carte agit ; target = null pour la zone d'Aventure. Les effets suivent jusqu'à la prochaine action. */
  | { kind: "action"; actor: UnitId; spell: Spell; target: UnitId | null; /** Nom du sort de personnage */ name?: string }
  | {
      kind: "damage";
      source: UnitId;
      target: UnitId;
      /** Dégâts du coup, avant le bouclier */
      amount: number;
      /** Part absorbée par le bouclier */
      absorbed: number;
      crit: boolean;
      affinity: "strong" | "weak" | null;
      /** Combat frappe une cible exposée */
      exposedBonus: boolean;
      hp: number;
      shield: number;
    }
  /** Le coup d'un sort affilié est esquivé (passif d'arme) : aucun dégât */
  | { kind: "dodge"; source: UnitId; target: UnitId }
  | { kind: "heal"; source: UnitId; target: UnitId; amount: number; hp: number }
  /** source = null et amount < 0 : le bouclier du second joueur disparaît à la fin du 1er tour */
  | { kind: "shield"; source: UnitId | null; target: UnitId; amount: number; shield: number }
  | { kind: "status"; target: UnitId; status: Status; on: boolean }
  /** Perte de PV du poison, à la fin de l'action du porteur */
  | { kind: "poison"; target: UnitId; amount: number; hp: number }
  /** Une carte morte revient au combat */
  | { kind: "revive"; source: UnitId; target: UnitId; hp: number }
  /** Un malus est refusé (immunité, ou boss contre le silence) */
  | { kind: "resist"; target: UnitId }
  | { kind: "ko"; target: UnitId }
  | { kind: "end"; winner: Side | null; reason: "ko" | "timeout"; rounds: number; hpLeft: Record<Side, number> };

export interface BattleResult {
  winner: Side | null;
  first: Side;
  rounds: number;
  timeout: boolean;
  /** Part des PV max restants de chaque équipe */
  hpLeft: Record<Side, number>;
  log: BattleEvent[];
}

interface Unit {
  id: UnitId;
  card: BattleCard;
  side: Side;
  atk: number;
  def: number;
  maxHp: number;
  hp: number;
  shield: number;
  /** Cooldown du sort affilié (réduit par l'éveil) */
  cooldown: number;
  /** Esquive des sorts affiliés adverses (arme) */
  dodge: number;
  /** Actions avant que le sort affilié soit prêt : il l'est quand spellIn ≤ 1 au début de l'action */
  spellIn: number;
  /** Actions pendant lesquelles Combat a gardé son sort prêt */
  held: number;
  /** Exposé par Mystère : le prochain sort de Combat sur cette cible est renforcé, puis l'exposition disparaît */
  exposed: boolean;
  /** Affaibli : ATK −20 % ; Élan : ATK +10 % (actions restantes) */
  weaken: number;
  elan: number;
  /** Sort de personnage, actions avant qu'il soit prêt (prêt quand pIn ≤ 1), et résurrection déjà utilisée */
  spell: CharacterSpell | null;
  pIn: number;
  revived: boolean;
  fx: Fx[];
}

interface Fx {
  key: FxKey;
  stat?: ModStat;
  amount: number;
  /** Actions du porteur restantes ; `fresh` : posé pendant l'action en cours, ne compte pas encore */
  turns: number;
  fresh: boolean;
}
const MALUS = new Set<string>(["atkDown", "defDown", "critDown", "dodgeDown", "silence", "poison"]);
const fxSum = (u: Unit, stat: ModStat) => u.fx.reduce((n, f) => (f.stat === stat ? n + f.amount : n), 0);
const hasFx = (u: Unit, key: FxKey) => u.fx.some((f) => f.key === key);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export interface BattleState {
  rng: Random;
  opts: Required<BattleOptions>;
  teams: Record<Side, Unit[]>;
  first: Side;
  /** Ordre de jeu dans chaque position : celui qui commence, puis l'autre */
  order: [Side, Side];
  round: number;
  /** Prochain emplacement du tour : position × 2 + rang dans order */
  slot: number;
  roundOpen: boolean;
  log: BattleEvent[];
  result: BattleResult | null;
}

const starsOf = (c: BattleCard) => Math.max(0, Math.min(5, c.stars ?? 0));
/** L'arme ne compte que sur une carte éveillée 5 étoiles. */
const weaponOf = (c: BattleCard) => (starsOf(c) === 5 ? c.weapon ?? null : null);

/** Bonus de stats de chaque carte : passif UR, synergie de franchise, éveil, arme. */
function statBonus(team: BattleCard[], opts: Required<BattleOptions>) {
  return team.map((c) => {
    const same = team.filter((o) => c.franchiseId != null && o.franchiseId === c.franchiseId);
    const urs = same.filter((o) => o !== c && o.rarity === "UR").length;
    const passive = opts.passive ? Math.min(BATTLE.passiveCap, urs * BATTLE.passivePerUr) : 0;
    const franchise = opts.franchise ? BATTLE.franchiseBonus[same.length] ?? 0 : 0;
    return passive + franchise + starsOf(c) * BATTLE.starBonus + (weaponOf(c)?.stat ?? 0);
  });
}

/** Renfort d'ATK donné par les armes « typeAura » de l'équipe aux cartes de leur type. */
function auraBonus(team: BattleCard[]) {
  return team.map((c) =>
    team.reduce((n, o) => {
      const p = weaponOf(o)?.passive;
      return p?.kind === "typeAura" && p.type === c.type ? n + p.bonus : n;
    }, 0),
  );
}

function makeUnits(team: BattleCard[], side: Side, opts: Required<BattleOptions>): Unit[] {
  const bonus = statBonus(team, opts);
  const aura = auraBonus(team);
  return team.map((card, i) => {
    const maxHp = BATTLE.hp(card.attack, card.defense) * (1 + bonus[i]);
    const p = weaponOf(card)?.passive;
    return {
      id: `${side}${i + 1}` as UnitId,
      card, side, maxHp, hp: maxHp, shield: 0,
      atk: card.attack * (1 + bonus[i] + aura[i]),
      def: card.defense * (1 + bonus[i]),
      cooldown: BATTLE.spellCooldown - (starsOf(card) >= BATTLE.cooldownStar ? 1 : 0),
      dodge: p?.kind === "dodge" ? p.chance : 0,
      spellIn: 2, held: 0, exposed: false, weaken: 0, elan: 0,
      spell: opts.spells && !card.noSpell ? card.spell ?? spellOf(card.characterId, card.rarity, card.type) : null,
      pIn: SPELL_FIRST, revived: false, fx: [],
    };
  });
}

const view = (u: Unit): UnitView => ({
  id: u.id, characterId: u.card.characterId, rarity: u.card.rarity, type: u.card.type,
  atk: u.atk, def: u.def, maxHp: u.maxHp, hp: u.hp, shield: u.shield,
});
const enemy = (s: Side): Side => (s === "A" ? "B" : "A");
const alive = (st: BattleState, s: Side) => st.teams[s].filter((u) => u.hp > 0);
const unit = (st: BattleState, id: UnitId) => st.teams[id[0] as Side][Number(id.slice(1)) - 1];
const weakest = (units: Unit[]) => units.reduce((m, x) => (x.hp < m.hp ? x : m));
const mostHurt = (units: Unit[]) => units.reduce((m, x) => (x.hp / x.maxHp < m.hp / m.maxHp ? x : m));

export function createBattle(a: BattleCard[], b: BattleCard[], rng: Random, options: BattleOptions = {}): BattleState {
  const opts = { passive: true, franchise: true, combos: true, spells: true, ...options };
  const teams: Record<Side, Unit[]> = { A: makeUnits(a, "A", opts), B: makeUnits(b, "B", opts) };
  const maxPower = (t: BattleCard[]) => Math.max(...t.map((c) => c.power));
  const first: Side = maxPower(b) > maxPower(a) ? "B" : "A";
  const st: BattleState = {
    rng, opts, teams, first, order: [first, enemy(first)], round: 0, slot: 0, roundOpen: false, log: [], result: null,
  };
  st.log.push({ kind: "start", first, units: [...teams.A, ...teams.B].map(view) });
  for (const u of teams[enemy(first)]) {
    u.shield = u.maxHp * BATTLE.secondShield;
    st.log.push({ kind: "shield", source: null, target: u.id, amount: u.shield, shield: u.shield });
  }
  return st;
}

function finish(st: BattleState, timeout: boolean) {
  const hpLeft = (s: Side) => st.teams[s].reduce((n, u) => n + u.hp, 0) / st.teams[s].reduce((n, u) => n + u.maxHp, 0);
  const left = { A: hpLeft("A"), B: hpLeft("B") };
  const winner: Side | null = left.A === left.B ? null : left.A > left.B ? "A" : "B";
  st.log.push({ kind: "end", winner, reason: timeout ? "timeout" : "ko", rounds: st.round, hpLeft: left });
  st.result = { winner, first: st.first, rounds: st.round, timeout, hpLeft: left, log: st.log };
}

/** Passe à l'emplacement suivant ; en fin de tour, le bouclier du second joueur disparaît (1er tour seulement). */
function nextSlot(st: BattleState) {
  if (++st.slot < BATTLE.teamSize * 2) return;
  st.slot = 0;
  st.roundOpen = false;
  if (st.round !== 1) return;
  for (const u of st.teams[st.order[1]]) {
    const lost = Math.min(u.shield, u.maxHp * BATTLE.secondShield);
    if (u.hp <= 0 || lost <= 0) continue;
    u.shield -= lost;
    st.log.push({ kind: "shield", source: null, target: u.id, amount: -lost, shield: u.shield });
  }
}

/** Carte qui doit agir maintenant, ou null si le combat est fini. Saute les cartes à 0 PV et ouvre les tours. */
export function currentActor(st: BattleState): UnitView | null {
  while (!st.result) {
    if (!alive(st, "A").length || !alive(st, "B").length) {
      finish(st, false);
      break;
    }
    if (!st.roundOpen) {
      if (st.round >= BATTLE.maxRounds) {
        finish(st, true);
        break;
      }
      st.round++;
      st.roundOpen = true;
      st.log.push({ kind: "round", round: st.round });
    }
    const u = st.teams[st.order[st.slot % 2]][Math.floor(st.slot / 2)];
    if (u && u.hp > 0) return view(u);
    nextSlot(st);
  }
  return null;
}

/** Ce que la carte courante peut faire : le sort de base sur un ennemi, et le sort affilié s'il est prêt. */
export function legalActions(st: BattleState): { spell: Spell; targets: (UnitId | null)[] }[] {
  const id = currentActor(st)?.id;
  if (!id) return [];
  const u = unit(st, id);
  const foes = alive(st, enemy(u.side)).map((f) => f.id);
  const list: { spell: Spell; targets: (UnitId | null)[] }[] = [{ spell: "base", targets: foes }];
  if (hasFx(u, "silence")) return list;
  if (u.spellIn <= 1) {
    const t = u.card.type;
    const targets = t === "AVENTURE" ? [null] : t === "COEUR" ? alive(st, u.side).map((x) => x.id) : foes;
    list.push({ spell: "affinity", targets });
  }
  if (u.spell && u.pIn <= 1) {
    const targets = specialTargets(st, u);
    if (targets.length) list.push({ spell: "special", targets });
  }
  return list;
}

/** Cibles possibles du sort de personnage (vide : pas lançable maintenant, par exemple sans allié mort à réanimer). */
function specialTargets(st: BattleState, u: Unit): (UnitId | null)[] {
  switch (u.spell!.target) {
    case "foe": return alive(st, enemy(u.side)).map((x) => x.id);
    case "ally": return alive(st, u.side).map((x) => x.id);
    case "deadAlly": return u.revived ? [] : st.teams[u.side].filter((x) => x.hp <= 0).map((x) => x.id);
    default: return [null];
  }
}

/** Mode auto : le sort de personnage part dès qu'il est prêt, sauf soin, bouclier, purge ou réanimation sans besoin. */
function autoSpecial(st: BattleState, u: Unit): Action | null {
  if (!u.spell || u.pIn > 1) return null;
  const targets = specialTargets(st, u);
  if (!targets.length) return null;
  const allies = alive(st, u.side), foes = alive(st, enemy(u.side));
  const fx = u.spell.effects;
  const only = (k: Effect["k"]) => fx.every((e) => e.k === k);
  if (u.spell.target === "deadAlly") return { spell: "special", target: targets[0] };
  if (fx.some((e) => e.k === "heal" || e.k === "purge") && fx.every((e) => e.k === "heal" || e.k === "purge")) {
    const hurt = allies.some((x) => x.hp < x.maxHp * BATTLE.healBelow);
    const dirty = fx.some((e) => e.k === "purge") && allies.some((x) => x.fx.some((f) => MALUS.has(f.key)) || x.exposed || x.weaken > 0);
    if (!hurt && !dirty) return null;
  }
  if (only("shield") && allies.every((x) => x.shield > x.maxHp * 0.05)) return null;
  if (u.spell.target === "ally") return { spell: "special", target: mostHurt(allies).id };
  if (u.spell.target === "foe") {
    const control = fx.some((e) => e.k === "silence");
    const pick = control ? foes.reduce((m, x) => (x.atk > m.atk ? x : m)) : weakest(foes);
    return { spell: "special", target: pick.id };
  }
  return { spell: "special", target: null };
}

/** Stratégie automatique (mode auto et PvM en arrière-plan) : vise l'ennemi qui a le moins de PV. */
export function autoAction(st: BattleState): Action {
  const id = currentActor(st)?.id;
  if (!id) throw new Error("Combat terminé");
  const u = unit(st, id);
  const foes = alive(st, enemy(u.side));
  const allies = alive(st, u.side);
  const base: Action = { spell: "base", target: weakest(foes).id };
  if (hasFx(u, "silence")) return base;
  const special = autoSpecial(st, u);
  if (special) return special;
  if (u.spellIn > 1) return base;
  const t = u.card.type;
  if (t === "COMBAT") {
    const exposed = st.opts.combos ? foes.filter((f) => f.exposed) : [];
    const wait = st.opts.combos && !exposed.length && u.held < BATTLE.comboHold && allies.some((x) => x.card.type === "MYSTERE");
    return wait ? base : { spell: "affinity", target: weakest(exposed.length ? exposed : foes).id };
  }
  if (t === "COEUR") {
    const hurt = allies.some((x) => x.hp < x.maxHp * BATTLE.healBelow);
    return hurt ? { spell: "affinity", target: mostHurt(allies).id } : base;
  }
  if (t === "AVENTURE") return { spell: "affinity", target: null };
  return { spell: "affinity", target: weakest(foes).id };
}

/** Joue l'action de la carte courante, puis passe à la suivante (ou termine le combat). */
export function applyAction(st: BattleState, action: Action) {
  const id = currentActor(st)?.id;
  if (!id) throw new Error("Combat terminé");
  const allowed = legalActions(st).find((x) => x.spell === action.spell);
  if (!allowed?.targets.includes(action.target)) throw new Error("Action impossible");
  const u = unit(st, id);
  const { rng, opts, log } = st;
  if (u.spellIn > 0) u.spellIn--;
  if (u.pIn > 0) u.pIn--;

  const hit = (t: Unit, mult: number, ignoreDef = 0, exposedBonus = false, pierce = false, critSure = false) => {
    // Esquive : arme (sorts affiliés seulement) ou effet d'un sort ; un coup qui traverse ne s'esquive pas
    const dodge = pierce ? 0 : (action.spell === "affinity" ? t.dodge : 0) + clamp(fxSum(t, "dodge"), 0, BATTLE.dodgeCap);
    if (dodge > 0 && rng() < dodge) {
      log.push({ kind: "dodge", source: u.id, target: t.id });
      return 0;
    }
    const def = t.def * (1 + clamp(fxSum(t, "def"), -BATTLE.statCap, BATTLE.statCap)) * (1 - ignoreDef);
    let atk = u.atk * (1 + (u.elan > 0 ? 0.1 : 0) - (u.weaken > 0 ? 0.2 : 0) + clamp(fxSum(u, "atk"), -BATTLE.statCap, BATTLE.statCap));
    // Combo Cœur : une carte protégée par un bouclier tape plus fort
    if (opts.combos && u.shield > 0) atk *= 1.15;
    const aff = affinity(u.card.type, t.card.type);
    let dmg = atk * aff * mult * Math.max(BATTLE.floor, BATTLE.defK / (BATTLE.defK + def));
    const crit = critSure || rng() < clamp(BATTLE.critRate + fxSum(u, "crit"), 0, BATTLE.critCap);
    if (crit) dmg *= BATTLE.critDamage;
    dmg *= 1 + (rng() * 2 - 1) * BATTLE.variance;
    const absorbed = pierce ? 0 : Math.min(t.shield, dmg);
    t.shield -= absorbed;
    t.hp = Math.max(0, t.hp - (dmg - absorbed));
    log.push({
      kind: "damage", source: u.id, target: t.id, amount: dmg, absorbed, crit,
      affinity: aff > 1 ? "strong" : aff < 1 ? "weak" : null, exposedBonus, hp: t.hp, shield: t.shield,
    });
    if (t.hp === 0) log.push({ kind: "ko", target: t.id });
    return dmg;
  };
  const heal = (t: Unit, amount: number) => {
    const before = t.hp;
    t.hp = Math.min(t.maxHp, t.hp + amount);
    if (t.hp > before) log.push({ kind: "heal", source: u.id, target: t.id, amount: t.hp - before, hp: t.hp });
  };
  /** Pose un effet durable ; un malus est refusé par l'immunité, et le silence par les boss. L'effet de même nature se renouvelle (le plus fort reste). */
  const addFx = (t: Unit, key: FxKey, amount: number, turns: number, stat?: ModStat) => {
    if (t.hp <= 0) return;
    if (MALUS.has(key) && (hasFx(t, "immune") || (key === "silence" && t.card.boss))) {
      log.push({ kind: "resist", target: t.id });
      return;
    }
    const old = t.fx.find((f) => f.key === key);
    if (old) {
      if (Math.abs(amount) >= Math.abs(old.amount)) Object.assign(old, { amount, turns, fresh: t === u });
      else old.turns = Math.max(old.turns, turns);
      return;
    }
    t.fx.push({ key, stat, amount, turns, fresh: t === u });
    log.push({ kind: "status", target: t.id, status: key, on: true });
  };
  const dropFx = (t: Unit, f: Fx) => {
    t.fx = t.fx.filter((x) => x !== f);
    log.push({ kind: "status", target: t.id, status: f.key, on: false });
  };
  const setStatus = (t: Unit, status: "exposed" | "weaken" | "elan", turns: number) => {
    if (turns > 0 && (status === "exposed" || status === "weaken") && hasFx(t, "immune")) {
      log.push({ kind: "resist", target: t.id });
      return;
    }
    const was = status === "exposed" ? t.exposed : t[status] > 0;
    if (status === "exposed") t.exposed = turns > 0;
    else t[status] = turns;
    if (was !== turns > 0) log.push({ kind: "status", target: t.id, status, on: turns > 0 });
  };

  log.push({ kind: "action", actor: u.id, spell: action.spell, target: action.target, ...(action.spell === "special" ? { name: u.spell!.name } : {}) });
  const target = action.target ? unit(st, action.target) : null;
  if (action.spell === "base") {
    if (u.spellIn === 0) u.held++;
    hit(target!, 1);
  } else if (action.spell === "special") {
    u.pIn = SPELL_COOLDOWN;
    const who = (scope: Scope): Unit[] =>
      scope === "self" ? [u] : scope === "team" ? alive(st, u.side) : scope === "foes" ? alive(st, enemy(u.side)) : target && target.hp > 0 ? [target] : [];
    for (const e of u.spell!.effects) {
      switch (e.k) {
        case "damage": {
          const targets = e.zone ? alive(st, enemy(u.side)) : target ? [target] : [];
          let total = 0;
          for (const t of targets) total += hit(t, e.mult, e.ignoreDef ?? 0, false, e.pierce, e.critSure);
          if (e.drain) heal(u, total * e.drain);
          break;
        }
        case "mod":
          for (const t of who(e.to)) addFx(t, `${e.stat}${e.amount > 0 ? "Up" : "Down"}`, e.amount, e.turns, e.stat);
          break;
        case "heal":
          for (const t of who(e.to)) heal(t, t.maxHp * e.pct);
          break;
        case "regen":
          for (const t of who(e.to)) addFx(t, "regen", e.pct, e.turns);
          break;
        case "shield":
          for (const t of who(e.to)) {
            const add = Math.min(t.maxHp * e.pct, Math.max(0, t.maxHp * 0.3 - t.shield));
            t.shield += add;
            log.push({ kind: "shield", source: u.id, target: t.id, amount: add, shield: t.shield });
          }
          break;
        case "poison":
          for (const t of who(e.to)) addFx(t, "poison", e.pct, e.turns);
          break;
        case "silence":
          for (const t of who(e.to)) addFx(t, "silence", 0, e.turns);
          break;
        case "immune":
          for (const t of who(e.to)) addFx(t, "immune", 0, e.turns);
          break;
        case "purge":
          for (const t of who(e.to)) {
            for (const f of t.fx.filter((x) => MALUS.has(x.key))) dropFx(t, f);
            if (t.exposed) setStatus(t, "exposed", 0);
            if (t.weaken > 0) setStatus(t, "weaken", 0);
          }
          break;
        case "revive":
          if (target && target.hp <= 0) {
            u.revived = true;
            target.hp = target.maxHp * e.pct;
            target.shield = 0;
            target.fx = [];
            Object.assign(target, { exposed: false, weaken: 0, elan: 0, spellIn: 2, pIn: SPELL_FIRST, held: 0 });
            log.push({ kind: "revive", source: u.id, target: target.id, hp: target.hp });
          }
          break;
      }
    }
  } else {
    u.spellIn = u.cooldown;
    u.held = 0;
    const foes = alive(st, enemy(u.side));
    const allies = alive(st, u.side);
    const t = u.card.type;
    if (t === "COMBAT") {
      const bonus = opts.combos && target!.exposed;
      hit(target!, 1.5 * (bonus ? 1.7 : 1), 0.4, bonus);
      setStatus(target!, "exposed", 0);
    } else if (t === "MYSTERE") {
      // Sans allié Combat pour exploiter l'exposition, Mystère tape plus fort lui-même
      hit(target!, allies.some((x) => x.card.type === "COMBAT") ? 0.8 : 1.2);
      if (target!.hp > 0) {
        if (opts.combos) setStatus(target!, "exposed", 1);
        setStatus(target!, "weaken", BATTLE.statusTurns);
      }
    } else if (t === "MAGIE") {
      // Drain : 50 % des dégâts rendus au lanceur, et à chaque allié Cœur (combo)
      const hearts = opts.combos ? allies.filter((x) => x.card.type === "COEUR") : [];
      const d = hit(target!, 1.2) * 0.5;
      for (const x of [u, ...hearts]) heal(x, d);
    } else if (t === "COEUR") {
      heal(target!, target!.maxHp * 0.3);
      for (const x of allies) {
        const add = x.maxHp * 0.1;
        x.shield += add;
        log.push({ kind: "shield", source: u.id, target: x.id, amount: add, shield: x.shield });
      }
    } else {
      for (const f of foes) hit(f, 0.6);
      for (const x of allies) setStatus(x, "elan", BATTLE.statusTurns);
    }
  }
  if (u.elan > 0) setStatus(u, "elan", u.elan - 1);
  if (u.weaken > 0) setStatus(u, "weaken", u.weaken - 1);
  // Fin de l'action du porteur : poison et soin sur la durée, puis les effets durables comptent un tour (sauf ceux posés pendant cette action)
  for (const f of [...u.fx]) {
    if (f.fresh) {
      f.fresh = false;
      continue;
    }
    if (u.hp > 0 && f.key === "poison") {
      const amount = Math.min(u.hp, u.maxHp * f.amount);
      u.hp -= amount;
      log.push({ kind: "poison", target: u.id, amount, hp: u.hp });
      if (u.hp <= 0) log.push({ kind: "ko", target: u.id });
    }
    if (u.hp > 0 && f.key === "regen") heal(u, u.maxHp * f.amount);
    if (--f.turns <= 0) dropFx(u, f);
  }

  nextSlot(st);
  currentActor(st);
}

/** Combat complet avec la stratégie automatique. */
export function battle(a: BattleCard[], b: BattleCard[], rng: Random, options: BattleOptions = {}): BattleResult {
  const st = createBattle(a, b, rng, options);
  while (currentActor(st)) applyAction(st, autoAction(st));
  return st.result!;
}
