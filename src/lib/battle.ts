import { isMagicalSpell, magicSkillMultiplier } from "./magic-skill";
// Combat 4 contre 4 à sorts (docs/specs/combat.md) : moteur pur, sans accès à la base.
// Le combat avance action par action (createBattle → currentActor → applyAction), ce qui sert au mode manuel ;
// battle() le joue en entier avec la stratégie automatique. Chaque étape est inscrite dans un journal (BattleEvent)
// que l'affichage rejoue. Mêmes cartes, même graine et mêmes actions = même journal.
// Toutes les valeurs sont provisoires et regroupées dans BATTLE pour l'équilibrage (npm run simulate:battle).

import type { CardType, Rarity } from "../generated/prisma/enums";

import { effectElement, ELEMENT_RIDER } from "./attack-element";
import { BLADE_USERS } from "./blade-users";
import { damageKind } from "./damage-kind";
import { BOSS_SKILLS } from "./boss-skills";
import { basicAttackOf, type BasicAttack, type BasicRider } from "./basic-attacks";
import { isSoloBuff, spellOf, SPELL_COOLDOWN, SPELL_FIRST, type CharacterSpell, type Effect, type ModStat, type Scope } from "./spells";
import { balanceSecondary, powerTertiaryDamage } from "./character-skills";
import { TERTIARY_SPELLS } from "./tertiary-catalog";
import { ULTIMATE_CATALOG } from "./ultimate-catalog";

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
  /** Vitesse de combat ; 100 par défaut. */
  speed?: number;
  franchiseId: number | null;
  /** Éveil, 0 à 5 étoiles (0 par défaut) */
  stars?: number;
  /** Arme légendaire, équipable à 5 étoiles seulement */
  weapon?: Weapon | null;
  /** Bonus d'artefacts et de set, calculés côté serveur avant la copie du combat. */
  artifactStats?: {
    attack: number; defense: number; hp: number; speed: number; crit: number; critDamage: number; dodge: number; flatAttack: number; flatDefense: number; flatHp: number;
    /** Bonus de set (absents des combats enregistrés avant eux) : vitesse %, dégâts physiques / magiques, jauge par sort, saignement, précision */
    magicSkill?: number;
    speedPct?: number; physDamage?: number; magicDamage?: number; gaugePerSpell?: number; bleedBonus?: number; precision?: number;
    ignoreDef?: number; elementalDamage?: number; titanGuard?: number;
  };
  /** Boss d'histoire ou de raid : résiste au silence */
  boss?: boolean;
  /** Retire le sort de personnage de cette carte (simulations d'équilibre) */
  noSpell?: boolean;
  /** Sans l'effet d'élément du sort secondaire (simulation) */
  noElement?: boolean;
  /** Désactive seulement l'effet de l'attaque de base (simulations d'équilibre) */
  noBasicAttack?: boolean;
  /** Désactive l'ultime ou le sort tertiaire (simulations d'équilibre) */
  noUltimate?: boolean;
  noTertiary?: boolean;
  /** Sort de personnage imposé (Spell Builder) : prioritaire sur celui de spells.ts */
  spell?: CharacterSpell;
  ultimate?: CharacterSpell;
  tertiary?: CharacterSpell;
  /** Attaque de base imposée pour le Spell Builder. */
  basicAttack?: BasicAttack;
  /** Boss : jauge d'ultime au départ (lancer le premier sort dès la première action) */
  startGauge?: number;
  /** Passif de réduction des dégâts reçus tant que les PV sont au-dessus (`above`) ou au-dessous (`below`) du seuil `at` (part des PV max) */
  guard?: { when: "above" | "below"; at: number; reduce: number };
  /** Barbe Blanche : bouclier (part de ses PV max) à chaque mort d'un allié */
  allyDeathShield?: number;
  /** Big Mom : chaque mort d'un ennemi donne une âme (PV max et dégâts finaux) */
  soulPocket?: { hp: number; dmg: number };
  /** Kaido : changement de mode quand les PV tombent sous `at` (part des PV max) */
  phase?: { at: number; atk: number; speed: number; name: string; basicAttack?: BasicAttack; spell?: CharacterSpell; tertiary?: CharacterSpell; ultimate?: CharacterSpell };
}

/** Passif d'arme : esquive des sorts affiliés adverses, ou renfort de l'ATK des alliés d'un type (porteur compris). */
export type WeaponPassive =
  | { kind: "dodge"; chance: number }
  | { kind: "typeAura"; type: CardType; bonus: number }
  /** Griffon : chaque adversaire touché reçoit Peur 1 tour (`missChance` de rater son coup) */
  | { kind: "fear"; missChance: number }
  /** Murakumogiri : un coup physique est doublé avec cette chance */
  | { kind: "doubleStrike"; chance: number }
  /** Hassaikai : chaque attaque de base reçue réduit les dégâts reçus de `step`, jusqu'à `max` */
  | { kind: "guardStack"; step: number; max: number }
  /** Napoléon : sorts de foudre et de feu doublés ; les autres éléments appliquent aussi foudre et feu */
  | { kind: "stormFire" };

export interface Weapon {
  /** Bonus d'ATK, de DEF et de PV (0,05 = +5 %) */
  stat: number;
  /** Armes dédiées : bonus sur des statistiques précises, à la place de `stat` */
  stats?: { attack?: number; defense?: number; speed?: number; physDamage?: number; magicDamage?: number; reduce?: number };
  passive: WeaponPassive | null;
}

export const BATTLE = {
  teamSize: 4,
  /** PV à partir des stats de base ; la DEF ne sert qu'à réduire les dégâts */
  hp: (attack: number, defense: number) => 2.8 * (attack + defense),
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
  /** Rechargement du sort tertiaire, en actions du lanceur. */
  tertiaryCooldown: 7,
  /** Coefficient de balance des effets secondaires (les effets légers gardent leur identité). */
  secondaryEffectScale: 0.6,
  /** Le tertiaire doit au moins rivaliser avec une frappe de base. */
  tertiaryDamageScale: 1.7,
  /** Jauge personnelle d'ultime : trois actions offensives réussies la chargent presque entièrement. */
  ultimateGaugeMax: 100,
  ultimateGaugePerHit: 34,
  /** Jauge gagnée par une attaque de base qui touche (les SSR/UR n'ont plus de sort de type : la base est leur coup régulier) */
  ultimateGaugeBase: 50,
  /** Passif UR : bonus ATK/DEF donné à chaque allié de la même franchise, cumulable entre UR, plafonné */
  passivePerUr: 0.1,
  passiveCap: 0.3,
  /** Synergie de franchise : bonus ATK/DEF/PV selon le nombre de cartes de la même franchise (indice = nombre) */
  franchiseBonus: [0, 0, 0.03, 0.06, 0.1],
  /** Éveil : bonus d'ATK, de DEF et de PV par étoile (0,04 → 0,06 en v0.3.0) */
  starBonus: 0.06,
  /** Éveil (v0.3.0) : jauge d'ultime de départ à 2★, critique et dégâts critiques à 4★, bouclier de départ à 5★ */
  starGaugeStart: 25,
  starCrit: 0.1,
  starCritDamage: 0.2,
  starShield: 0.1,
  /** Éveil : à partir de ce nombre d'étoiles, le cooldown du sort secondaire (affilié pour N/R/SR) baisse d'une action */
  secondaryCdStar: 3,
  /** Éveil : à partir de ce nombre d'étoiles, le cooldown du sort tertiaire baisse d'une action */
  tertiaryCdStar: 5,
  /** Plafond du total des bonus ou malus d'ATK, DEF et vitesse (±), du critique et de l'esquive (0 à 100 %) */
  statCap: 0.6,
  /** Plafond de la réduction de dégâts subis */
  reduceCap: 0.7,
  critCap: 1,
  /** Plafond de l'esquive totale (cartes, sorts et sets) */
  dodgeCap: 0.6,
  /** Durée d'Affaibli et d'Élan, en actions de la carte qui les porte */
  statusTurns: 2,
  /** En automatique, Cœur ne lance son sort que si un allié est sous cette part de ses PV */
  healBelow: 0.7,
  /** En automatique, Combat garde son sort au plus N actions en attendant une cible exposée (si un allié Mystère est en vie) */
  comboHold: 2,
  /** Un bouclier léger ne déclenche pas le bonus offensif du duo Cœur. */
  comboShieldThreshold: 0.1,
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
  /** Vagues suivantes du camp B : quand le camp B est vaincu, la vague suivante entre en scène (raids à vagues) */
  waves?: BattleCard[][];
  /** Nombre de tours avant la fin du combat (30 par défaut ; plus pour les combats à vagues) */
  maxRounds?: number;
  passive?: boolean;
  franchise?: boolean;
  combos?: boolean;
  /** Sorts de personnage des SSR et UR (par défaut : oui) */
  spells?: boolean;
  /** Force le premier camp (simulation uniquement ; le jeu réel choisit selon Puissance). */
  startingSide?: Side | null;
  /** Active l'ordonnanceur à jauge (désactivé pour préserver les combats existants). */
  gauge?: boolean;
  /** Effets d'élément du sort secondaire (par défaut : oui ; désactivé pour rejouer les combats enregistrés avant eux). */
  elements?: boolean;
  /** Camp déclaré perdant si le combat atteint `maxRounds` (PvE : le joueur doit vaincre toute l'équipe adverse). */
  timeoutLoser?: Side;
}

export type Spell = "base" | "affinity" | "special" | "tertiary" | "ultimate";
/** Effets durables des sorts de personnage et des attaques de base personnalisées. */
export type FxKey = `${ModStat}${"Up" | "Down"}` | "silence" | "immune" | "poison" | "regen" | "ignoreDef" | "taunt" | "reduce" | "stun" | "burn" | "wet" | "counter" | "zombie" | "seal" | "controlled" | "bloodlust" | "bleed" | "earth" | "swept" | "broken" | "vulnerable" | "titan" | "fear" | "sleep" | "devour" | "duel";
export type Status = "exposed" | "weaken" | "elan" | FxKey;

/** Choix d'une carte : son sort et sa cible (ennemi, ou allié pour le soin de Cœur ; null pour la zone d'Aventure). */
export interface Action {
  spell: Spell;
  target: UnitId | null;
}

/** Une carte en combat, telle que l'affichage la voit. */
export interface UnitView {
  /** Optionnel pour conserver la lecture des anciens journaux. */
  boss?: boolean;
  id: UnitId;
  characterId: number;
  rarity: Rarity;
  type: CardType;
  atk: number;
  def: number;
  speed: number;
  maxHp: number;
  hp: number;
  shield: number;
  ultimateGauge: number;
  ultimateGaugeMax: number;
}

/**
 * Journal du combat, dans l'ordre où l'affichage doit le rejouer.
 * Les événements qui changent des PV ou un bouclier portent la nouvelle valeur (hp, shield) : rien à recalculer.
 */
export type BattleEvent =
  | { kind: "start"; first: Side; units: UnitView[] }
  /** Le camp B est remplacé par la vague suivante (même identifiants B1 à B4) */
  | { kind: "wave"; index: number; total: number; units: UnitView[] }
  | { kind: "round"; round: number }
  /** Une carte agit ; target = null pour la zone d'Aventure. name personnalise le sort spécial ou l'attaque de base. */
  | { kind: "action"; actor: UnitId; spell: Spell; target: UnitId | null; name?: string; turnOrder?: UnitId[] }
  | { kind: "skip"; actor: UnitId; reason: "stun" }
  | { kind: "ultimateGauge"; target: UnitId; amount: number; current: number; max: number }
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
      /** Riposte d'une ombre (Domaine du monarque) */
      shadow?: boolean;
    }
  /** Le coup d'un sort affilié est esquivé (passif d'arme) : aucun dégât */
  | { kind: "dodge"; source: UnitId; target: UnitId }
  | { kind: "heal"; source: UnitId; target: UnitId; amount: number; hp: number }
  /** source = null et amount < 0 : le bouclier du second joueur disparaît à la fin du 1er tour */
  | { kind: "shield"; source: UnitId | null; target: UnitId; amount: number; shield: number }
  | { kind: "status"; target: UnitId; status: Status; on: boolean; /** v0.3.0 : valeur, durée (actions du porteur), lanceur et stat touchée, pour le panneau des effets */ amount?: number; turns?: number; source?: UnitId; stat?: ModStat }
  /** v0.3.0 : tours restants des effets d'une carte, après son action */
  | { kind: "fxTurns"; target: UnitId; turns: Partial<Record<Status, number>> }
  /** Perte de PV du poison, à la fin de l'action du porteur */
  | { kind: "poison"; source?: UnitId; target: UnitId; amount: number; hp: number; burn?: boolean; bleed?: boolean }
  /** Une carte morte revient au combat */
  | { kind: "revive"; source: UnitId; target: UnitId; hp: number; zombie?: boolean }
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
  speed: number;
  gauge: number;
  atk: number;
  def: number;
  maxHp: number;
  hp: number;
  shield: number;
  /** Cooldowns du sort affilié (N/R/SR), du secondaire et du tertiaire (SSR/UR), réduits par l'éveil */
  cooldown: number;
  specialCd: number;
  tertiaryCd: number;
  /** Esquive des sorts affiliés adverses (arme) */
  dodge: number;
  /** Actions avant que le sort affilié soit prêt : il l'est quand spellIn ≤ 1 au début de l'action */
  spellIn: number;
  /** Actions pendant lesquelles Combat a gardé son sort prêt */
  held: number;
  /** Hassaikai : réduction de dégâts accumulée */
  guard: number;
  /** Big Mom : âmes récupérées et bonus de dégâts finaux */
  souls: number;
  finalBonus: number;
  /** Âme déjà comptée / avalé par une marque / mode de phase atteint */
  soulTaken: boolean;
  shieldTaken: boolean;
  devoured: boolean;
  phased: boolean;
  /** Exposé par Mystère : le prochain sort de Combat sur cette cible est renforcé, puis l'exposition disparaît */
  exposed: boolean;
  /** Affaibli : ATK −20 % ; Élan : ATK +10 % (actions restantes) */
  weaken: number;
  elan: number;
  /** Sort de personnage, actions avant qu'il soit prêt (prêt quand pIn ≤ 1), et résurrection déjà utilisée */
  spell: CharacterSpell | null;
  pIn: number;
  tertiary: CharacterSpell | null;
  tIn: number;
  ultimate: CharacterSpell | null;
  ultimateGauge: number;
  revived: boolean;
  /** Maître d'un zombie (Arise) : le zombie disparaît quand son maître tombe */
  master: UnitId | null;
  /** Passif de mort (ultime lancé automatiquement) déjà utilisé */
  deathCast: boolean;
  continuingTurn: boolean;
  titanTriggered: boolean;
  /** Part restante du bouclier temporaire, consommée avant les autres boucliers. */
  titanShield: number;
  fx: Fx[];
}

interface Fx {
  /** Lanceur de l’effet, pour le bilan de dégâts périodiques et soins. */
  source?: UnitId;
  key: FxKey;
  stat?: ModStat;
  amount: number;
  /** Actions du porteur restantes ; `fresh` : posé pendant l'action en cours, ne compte pas encore */
  turns: number;
  fresh: boolean;
  stacks?: number;
  /** Duel : le seul ennemi qui peut encore atteindre le porteur */
  foe?: UnitId;
}
const MALUS = new Set<string>(["sleep", "fear", "earth", "swept", "broken", "vulnerable", "bleed", "seal", "atkDown", "defDown", "critDown", "dodgeDown", "speedDown", "silence", "poison", "stun", "burn", "wet"]);
const fxSum = (u: Unit, stat: ModStat) => u.fx.reduce((n, f) => (f.stat === stat ? n + f.amount : n), 0);
const fxKeySum = (u: Unit, key: FxKey) => u.fx.reduce((n, f) => (f.key === key ? n + f.amount : n), 0);
const hasFx = (u: Unit, key: FxKey) => u.fx.some((f) => f.key === key);
/** Ennemis vivants que `u` peut atteindre : une carte en duel n'est atteignable que par son adversaire désigné. */
const reachableFoes = (st: BattleState, u: Unit): Unit[] =>
  alive(st, enemy(u.side)).filter((f) => !f.fx.some((x) => x.key === "duel" && x.foe && x.foe !== u.id));
/** Tous les ennemis vivants sont en duel avec un autre : la carte ne peut atteindre personne et passe son tour. */
const cutOffByDuel = (st: BattleState, u: Unit) => alive(st, enemy(u.side)).length > 0 && reachableFoes(st, u).length === 0;
/** Ennemis qu'une attaque à cible unique peut viser : seuls les provocateurs vivants s'il y en a */
const foesFor = (st: BattleState, u: Unit): Unit[] => {
  const foes = reachableFoes(st, u);
  const taunters = foes.filter((f) => hasFx(f, "taunt"));
  return taunters.length ? taunters : foes;
};
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export interface BattleState {
  rng: Random;
  opts: Required<Omit<BattleOptions, "timeoutLoser">> & Pick<BattleOptions, "timeoutLoser">;
  teams: Record<Side, Unit[]>;
  first: Side;
  /** Ordre de jeu dans chaque position : celui qui commence, puis l'autre */
  order: [Side, Side];
  round: number;
  /** Prochain emplacement du tour : position × 2 + rang dans order */
  slot: number;
  roundOpen: boolean;
  gaugeTicks: number;
  gaugeActor: UnitId | null;
  /** Vagues du camp B encore à venir, et numéro de la vague en cours (1 = première) */
  waves: BattleCard[][];
  waveIndex: number;
  waveTotal: number;
  /** Cartes actuellement volées (Makima) : active le calcul des camps par carte */
  stolen: number;
  log: BattleEvent[];
  result: BattleResult | null;
}

const starsOf = (c: BattleCard) => Math.max(0, Math.min(5, c.stars ?? 0));
/** Critique et dégâts critiques d'éveil (4★ et plus, v0.3.0). */
export const starCrit = (c: BattleCard) => (starsOf(c) >= 4 ? BATTLE.starCrit : 0);
export const starCritDamage = (c: BattleCard) => (starsOf(c) >= 4 ? BATTLE.starCritDamage : 0);
/** L'arme ne compte que sur une carte éveillée 5 étoiles. */
const weaponOf = (c: BattleCard) => (starsOf(c) === 5 ? c.weapon ?? null : null);

/** Bonus de stats de chaque carte : passif UR, synergie de franchise, éveil, arme. */
function statBonus(team: BattleCard[], opts: BattleState["opts"]) {
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

function makeUnits(team: BattleCard[], side: Side, opts: BattleState["opts"]): Unit[] {
  const bonus = statBonus(team, opts);
  const aura = auraBonus(team);
  return team.map((card, i) => {
    if (card.boss && BOSS_SKILLS[card.characterId]) card = { ...card, ...BOSS_SKILLS[card.characterId] };
    const maxHp = BATTLE.hp(card.attack, card.defense) * (1 + bonus[i] + (card.artifactStats?.hp ?? 0)) + (card.artifactStats?.flatHp ?? 0);
    const w = weaponOf(card);
    const p = w?.passive;
    const rawSecondary = opts.spells && !card.noSpell ? card.spell ?? spellOf(card.characterId, card.rarity, card.type) : null;
    const rawTertiary = opts.spells && !card.noTertiary ? card.tertiary ?? TERTIARY_SPELLS[card.characterId] ?? null : null;
    return {
      id: `${side}${i + 1}` as UnitId,
      card, side, speed: Math.max(1, ((card.speed ?? 100) + (card.artifactStats?.speed ?? 0)) * (1 + (card.artifactStats?.speedPct ?? 0) + (w?.stats?.speed ?? 0))), gauge: 0, maxHp, hp: maxHp, shield: starsOf(card) >= 5 ? maxHp * BATTLE.starShield : 0,
      atk: card.attack * (1 + bonus[i] + aura[i] + (card.artifactStats?.attack ?? 0) + (w?.stats?.attack ?? 0)) + (card.artifactStats?.flatAttack ?? 0),
      def: card.defense * (1 + bonus[i] + (card.artifactStats?.defense ?? 0) + (w?.stats?.defense ?? 0)) + (card.artifactStats?.flatDefense ?? 0),
      cooldown: BATTLE.spellCooldown - (starsOf(card) >= BATTLE.secondaryCdStar ? 1 : 0),
      specialCd: SPELL_COOLDOWN - (starsOf(card) >= BATTLE.secondaryCdStar ? 1 : 0),
      tertiaryCd: BATTLE.tertiaryCooldown - (starsOf(card) >= BATTLE.tertiaryCdStar ? 1 : 0),
      dodge: p?.kind === "dodge" ? p.chance : 0,
      spellIn: 2, held: 0, guard: 0, souls: 0, finalBonus: 0, soulTaken: false, shieldTaken: false, devoured: false, phased: false, exposed: false, weaken: 0, elan: 0,
      spell: rawSecondary ? (card.spell ? card.spell : balanceSecondary(rawSecondary, BATTLE.secondaryEffectScale)) : null,
      pIn: SPELL_FIRST,
      tertiary: rawTertiary ? (card.tertiary ? card.tertiary : powerTertiaryDamage(rawTertiary, BATTLE.tertiaryDamageScale)) : null,
      tIn: SPELL_FIRST,
      ultimate: opts.spells && !card.noUltimate ? card.ultimate ?? ULTIMATE_CATALOG[card.characterId] ?? null : null,
      ultimateGauge: (starsOf(card) >= 2 ? BATTLE.starGaugeStart : 0) + (card.startGauge ?? 0),
      revived: false, master: null, deathCast: false, continuingTurn: false, titanTriggered: false, titanShield: 0, fx: [],
    };
  });
}

const view = (u: Unit): UnitView => ({
  ...(u.card.boss ? { boss: true } : {}),
  id: u.id, characterId: u.card.characterId, rarity: u.card.rarity, type: u.card.type,
  atk: u.atk, def: u.def, speed: u.speed, maxHp: u.maxHp, hp: u.hp, shield: u.shield,
  ultimateGauge: u.ultimateGauge, ultimateGaugeMax: BATTLE.ultimateGaugeMax,
});
const enemy = (s: Side): Side => (s === "A" ? "B" : "A");
/** Le camp d'une carte est `u.side` : il change quand elle est volée (Makima) ; sa position et son id restent ceux de son camp d'origine. */
const alive = (st: BattleState, s: Side) => (st.stolen ? [...st.teams.A, ...st.teams.B].filter((u) => u.side === s && u.hp > 0) : st.teams[s].filter((u) => u.hp > 0));
const fallen = (st: BattleState, s: Side) => (st.stolen ? [...st.teams.A, ...st.teams.B] : st.teams[s]).filter((u) => u.side === s && u.hp <= 0);
/** Passifs : insensible aux dégâts sur la durée (Momo Ayase) ; lance son ultime en mourant (Emilia) */
const DOT_IMMUNE = new Set([222594]);
const DEATH_CAST = new Set([88572]);
const unit = (st: BattleState, id: UnitId) => st.teams[id[0] as Side][Number(id.slice(1)) - 1];
const weakest = (units: Unit[]) => units.reduce((m, x) => (x.hp < m.hp ? x : m));
const mostHurt = (units: Unit[]) => units.reduce((m, x) => (x.hp / x.maxHp < m.hp / m.maxHp ? x : m));
const strongestFoes = (st: BattleState, u: Unit, count: number) => reachableFoes(st, u).sort((first, second) => second.atk - first.atk).slice(0, count);

export function createBattle(a: BattleCard[], b: BattleCard[], rng: Random, options: BattleOptions = {}): BattleState {
  const opts = { passive: true, franchise: true, combos: true, spells: true, gauge: false, elements: true, waves: [] as BattleCard[][], maxRounds: BATTLE.maxRounds, ...options, startingSide: options.startingSide ?? null };
  const teams: Record<Side, Unit[]> = { A: makeUnits(a, "A", opts), B: makeUnits(b, "B", opts) };
  const maxPower = (t: BattleCard[]) => Math.max(...t.map((c) => c.power));
  const first: Side = opts.startingSide ?? (maxPower(b) > maxPower(a) ? "B" : "A");
  const st: BattleState = {
    rng, opts, teams, first, order: [first, enemy(first)], round: 0, slot: 0, roundOpen: false, gaugeTicks: 0, gaugeActor: null, waves: opts.waves.map((w) => [...w]), waveIndex: 1, waveTotal: opts.waves.length + 1, stolen: 0, log: [], result: null,
  };
  st.log.push({ kind: "start", first, units: [...teams.A, ...teams.B].map(view) });
  for (const u of teams[enemy(first)]) {
    const added = u.maxHp * BATTLE.secondShield;
    u.shield += added;
    st.log.push({ kind: "shield", source: null, target: u.id, amount: added, shield: u.shield });
  }
  return st;
}

function finish(st: BattleState, timeout: boolean) {
  const hpLeft = (s: Side) => st.teams[s].reduce((n, u) => n + u.hp, 0) / st.teams[s].reduce((n, u) => n + u.maxHp, 0);
  const left = { A: hpLeft("A"), B: hpLeft("B") };
  const loser = timeout ? st.opts.timeoutLoser : undefined;
  const winner: Side | null = loser ? enemy(loser) : left.A === left.B ? null : left.A > left.B ? "A" : "B";
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
    const lost = Math.min(Math.max(0, u.shield - u.titanShield), u.maxHp * BATTLE.secondShield);
    if (u.hp <= 0 || lost <= 0) continue;
    u.shield -= lost;
    st.log.push({ kind: "shield", source: null, target: u.id, amount: -lost, shield: u.shield });
  }
}

function removeSecondShield(st: BattleState) {
  for (const u of st.teams[st.order[1]]) {
    const lost = Math.min(Math.max(0, u.shield - u.titanShield), u.maxHp * BATTLE.secondShield);
    if (u.hp <= 0 || lost <= 0) continue;
    u.shield -= lost;
    st.log.push({ kind: "shield", source: null, target: u.id, amount: -lost, shield: u.shield });
  }
}

const GAUGE_THRESHOLD = 10_000;
const GAUGE_TICKS_PER_ROUND = 100;
const effectiveSpeed = (u: Unit) => Math.max(20, u.speed * (1 + clamp(fxSum(u, "speed"), -BATTLE.statCap, BATTLE.statCap)));

/** Prochains acteurs selon l'ordonnanceur à jauge, sans modifier le combat. */
export function timeline(st: BattleState, n: number): UnitId[] {
  if (st.result || !Number.isInteger(n) || n <= 0) return [];
  if (!st.opts.gauge) {
    // Projection des tours alternés, sans appliquer de dégâts ni modifier le combat.
    const units = Object.fromEntries([...st.teams.A, ...st.teams.B].map(u => [u.id, { hp: u.hp, stun: u.fx.filter(f => f.key === "stun" || f.key === "sleep").map(f => f.turns + (f.fresh ? 1 : 0)) }]));
    const actors: UnitId[] = [];
    const slots = BATTLE.teamSize * 2;
    for (let offset = 0; actors.length < n && offset < slots * (n + 100); offset++) {
      const slot = (st.slot + offset) % slots;
      const id = `${st.order[slot % 2]}${Math.floor(slot / 2) + 1}` as UnitId;
      const unit = units[id];
      if (!unit || unit.hp <= 0) continue;
      if (!unit.stun.some(turns => turns > 0)) actors.push(id);
      unit.stun = unit.stun.map(turns => turns - 1);
    }
    return actors;
  }
  const units = [...st.teams.A, ...st.teams.B].map((u) => ({
    id: u.id, side: u.side, gauge: u.gauge, hp: u.hp, baseSpeed: u.speed,
    fx: u.fx.map((f) => ({ key: f.key, stat: f.stat, amount: f.amount, turns: f.turns, fresh: f.fresh })),
  }));
  const order = [...st.order];
  const actors: UnitId[] = [];
  let gaugeTicks = st.gaugeTicks;
  const speed = (u: typeof units[number]) => Math.max(20, u.baseSpeed * (1 + clamp(u.fx.reduce((sum, f) => sum + (f.stat === "speed" ? f.amount : 0), 0), -BATTLE.statCap, BATTLE.statCap)));
  const consume = (u: typeof units[number]) => {
    for (const fx of [...u.fx]) {
      if (fx.key === "ignoreDef") continue;
      if (fx.fresh) fx.fresh = false;
      else if (--fx.turns <= 0) u.fx = u.fx.filter((x) => x !== fx);
    }
  };
  if (st.gaugeActor && n > 0) {
    const actor = units.find((u) => u.id === st.gaugeActor);
    if (actor) { actors.push(actor.id); consume(actor); }
  }
  while (actors.length < n) {
    const living = units.filter((u) => u.hp > 0);
    if (!living.length) break;
    let ready = living.filter((u) => u.gauge >= GAUGE_THRESHOLD);
    if (!ready.length) {
      const ticks = Math.min(...living.map((u) => Math.ceil((GAUGE_THRESHOLD - u.gauge) / speed(u))));
      gaugeTicks += ticks;
      if (gaugeTicks > st.opts.maxRounds * GAUGE_TICKS_PER_ROUND) break;
      for (const u of living) u.gauge += ticks * speed(u);
      ready = living.filter((u) => u.gauge >= GAUGE_THRESHOLD);
    }
    const slotOf = (u: typeof units[number]) => (Number(u.id.slice(1)) - 1) * 2 + order.indexOf(u.side);
    ready.sort((a, b) => b.gauge - a.gauge || slotOf(a) - slotOf(b));
    const actor = ready[0];
    actor.gauge -= GAUGE_THRESHOLD;
    if (actor.fx.some((fx) => fx.key === "stun" || fx.key === "sleep")) { consume(actor); continue; }
    actors.push(actor.id);
    consume(actor);
  }
  return actors;
}

/** Le camp B est vaincu mais il reste des vagues : la suivante entre en scène (mêmes emplacements B1 à B4, jauges à zéro). */
function spawnWave(st: BattleState) {
  const next = st.waves.shift()!;
  st.waveIndex++;
  st.teams.B = makeUnits(next, "B", st.opts);
  st.log.push({ kind: "wave", index: st.waveIndex, total: st.waveTotal, units: st.teams.B.map(view) });
}

function gaugeActor(st: BattleState): Unit | null {
  while (!st.result) {
    processDeaths(st);
    if (!alive(st, "B").length && alive(st, "A").length && st.waves.length) { spawnWave(st); continue; }
    if (!alive(st, "A").length || !alive(st, "B").length) {
      finish(st, false);
      return null;
    }
    if (st.gaugeActor) return unit(st, st.gaugeActor);
    const ready = [...st.teams.A, ...st.teams.B].filter((u) => u.hp > 0 && u.gauge >= GAUGE_THRESHOLD);
    if (ready.length) {
      const slotOf = (u: Unit) => (Number(u.id.slice(1)) - 1) * 2 + st.order.indexOf(u.side);
      ready.sort((a, b) => b.gauge - a.gauge || slotOf(a) - slotOf(b));
      const u = ready[0];
      u.gauge -= GAUGE_THRESHOLD;
      st.gaugeActor = u.id;
      if (hasFx(u, "stun") || hasFx(u, "sleep") || cutOffByDuel(st, u)) {
        st.log.push({ kind: "skip", actor: u.id, reason: "stun" });
        advanceCooldowns(u);
        finishUnitTurn(st, u);
        st.gaugeActor = null;
        continue;
      }
      return u;
    }
    const living = [...alive(st, "A"), ...alive(st, "B")];
    const ticks = Math.min(...living.map((u) => Math.ceil((GAUGE_THRESHOLD - u.gauge) / effectiveSpeed(u))));
    for (const u of [...st.teams.A, ...st.teams.B]) if (u.hp > 0) u.gauge += ticks * effectiveSpeed(u);
    const nextTick = st.gaugeTicks + ticks;
    while (Math.floor(nextTick / GAUGE_TICKS_PER_ROUND) > st.round) {
      if (st.round >= st.opts.maxRounds) {
        finish(st, true);
        return null;
      }
      if (st.round === 1) removeSecondShield(st);
      st.round++;
      st.log.push({ kind: "round", round: st.round });
    }
    st.gaugeTicks = nextTick;
    if (st.round >= st.opts.maxRounds && st.gaugeTicks >= st.opts.maxRounds * GAUGE_TICKS_PER_ROUND && ![...st.teams.A, ...st.teams.B].some((u) => u.hp > 0 && u.gauge >= GAUGE_THRESHOLD)) {
      finish(st, true);
      return null;
    }
  }
  return null;
}

function advanceCooldowns(u: Unit) {
  if (u.spellIn > 0) u.spellIn--;
  if (u.pIn > 0) u.pIn--;
  if (u.tIn > 0) u.tIn--;
}

function clearBleed(st: BattleState, u: Unit) {
  if (!hasFx(u, "bleed")) return;
  u.fx = u.fx.filter((f) => f.key !== "bleed");
  st.log.push({ kind: "status", target: u.id, status: "bleed", on: false });
}

/** Le coup déclencheur est payé avant le bouclier ; un porteur mort n'est jamais sauvé. */
function triggerTitan(st: BattleState, u: Unit, fresh: boolean) {
  if (!u.card.artifactStats?.titanGuard || u.titanTriggered || u.hp <= 0 || u.hp > u.maxHp * 0.5) return;
  u.titanTriggered = true;
  u.titanShield = u.maxHp * 0.5;
  u.shield += u.titanShield;
  u.fx.push({ key: "titan", amount: 0.5, turns: 2, fresh, source: u.id });
  st.log.push({ kind: "shield", source: u.id, target: u.id, amount: u.titanShield, shield: u.shield });
  st.log.push({ kind: "status", target: u.id, status: "titan", on: true, amount: 0.5, turns: 2, source: u.id });
}

function finishUnitTurn(st: BattleState, u: Unit) {
  u.continuingTurn = false;
  for (const status of ["elan", "weaken"] as const) {
    if (u[status] <= 0 || (status === "weaken" && u[status] > 1 && hasFx(u, "immune"))) continue;
    if (--u[status] === 0) st.log.push({ kind: "status", target: u.id, status, on: false });
  }
  for (const effect of [...u.fx]) {
    if (!u.fx.includes(effect)) continue;
    if (effect.key === "ignoreDef") continue;
    if (effect.fresh) {
      effect.fresh = false;
      continue;
    }
    if (u.hp > 0 && (effect.key === "poison" || effect.key === "burn" || effect.key === "bleed")) {
      const amount = Math.min(u.hp, (effect.key === "bleed" ? Math.ceil(u.hp * effect.amount) : u.maxHp * effect.amount) * (1 - fxKeySum(u, "titan")));
      u.hp -= amount;
      st.log.push({ kind: "poison", target: u.id, amount, hp: u.hp, ...(effect.source ? { source: effect.source } : {}), ...(effect.key === "burn" ? { burn: true } : {}), ...(effect.key === "bleed" ? { bleed: true } : {}) });
      triggerTitan(st, u, false);
      if (u.hp <= 0) st.log.push({ kind: "ko", target: u.id });
    }
    if (u.hp > 0 && effect.key === "regen") {
      if (effect.amount > 0) clearBleed(st, u);
      const before = u.hp;
      u.hp = Math.min(u.maxHp, u.hp + u.maxHp * effect.amount);
      if (u.hp > before) st.log.push({ kind: "heal", source: effect.source ?? u.id, target: u.id, amount: u.hp - before, hp: u.hp });
    }
    if (effect.key === "bleed") continue;
    if (effect.key === "devour" && effect.turns <= 1) {
      // Échéance de la marque : sans assez de dégâts, la cible est avalée et le lanceur gagne un de ses sorts
      u.fx = u.fx.filter((fx) => fx !== effect);
      st.log.push({ kind: "status", target: u.id, status: "devour", on: false });
      if (u.hp > 0 && effect.amount > 0) {
        u.hp = 0; u.shield = 0; u.titanShield = 0; u.devoured = true;
        st.log.push({ kind: "ko", target: u.id });
        const eater = effect.source ? unit(st, effect.source) : null;
        const stolen = u.spell ?? u.tertiary;
        if (eater && eater.hp > 0 && stolen) { eater.tertiary = stolen; eater.tIn = 1; }
      }
      continue;
    }
    if (--effect.turns <= 0) {
      if (effect.key === "titan") {
        const lost = Math.min(u.shield, u.titanShield);
        u.shield -= lost;
        u.titanShield = 0;
        if (lost > 0) st.log.push({ kind: "shield", source: u.id, target: u.id, amount: -lost, shield: u.shield });
      }
      u.fx = u.fx.filter((fx) => fx !== effect);
      st.log.push({ kind: "status", target: u.id, status: effect.key, on: false });
    }
  }
  // Tours restants (après décompte), pour le panneau des effets
  const turns: Partial<Record<Status, number>> = {};
  for (const f of u.fx) if (f.key !== "ignoreDef" && f.key !== "bleed") turns[f.key] = f.turns + (f.fresh ? 1 : 0);
  if (u.weaken > 0) turns.weaken = u.weaken;
  if (u.elan > 0) turns.elan = u.elan;
  if (Object.keys(turns).length) st.log.push({ kind: "fxTurns", target: u.id, turns });
}

/** Conséquences d'une mort, avant que la carte suivante agisse : disparition des zombies, retour ou exécution des cartes volées, ultime automatique d'Emilia. */
function processDeaths(st: BattleState) {
  const all = () => [...st.teams.A, ...st.teams.B];
  for (let changed = true; changed; ) {
    changed = false;
    for (const x of all()) {
      // Big Mom : l'âme d'un ennemi mort (hors avalé) agrandit ses PV max et ses dégâts finaux
      if (x.hp <= 0 && !x.soulTaken && !x.devoured) {
        x.soulTaken = true;
        for (const y of alive(st, enemy(x.side))) {
          const pocket = y.card.soulPocket;
          if (!pocket) continue;
          y.souls++;
          y.finalBonus += pocket.dmg;
          const gain = y.maxHp * pocket.hp;
          y.maxHp += gain;
          y.hp += gain;
          st.log.push({ kind: "heal", source: y.id, target: y.id, amount: gain, hp: y.hp });
        }
      }
      // Fin du duel quand l'adversaire désigné tombe
      for (const d of x.fx.filter((f) => f.key === "duel" && f.foe && unit(st, f.foe).hp <= 0)) {
        x.fx = x.fx.filter((f) => f !== d);
        st.log.push({ kind: "status", target: x.id, status: "duel", on: false });
        changed = true;
      }
      // Barbe Blanche : un allié qui tombe lui donne un bouclier
      if (x.hp <= 0 && !x.shieldTaken) {
        x.shieldTaken = true;
        for (const y of alive(st, x.side)) {
          if (y === x || !y.card.allyDeathShield) continue;
          const added = y.maxHp * y.card.allyDeathShield;
          y.shield += added;
          st.log.push({ kind: "shield", source: y.id, target: y.id, amount: added, shield: y.shield });
        }
      }
      // Kaido : changement de mode sous le seuil de PV
      const phase = x.card.phase;
      if (phase && !x.phased && x.hp > 0 && x.hp <= x.maxHp * phase.at) {
        x.phased = true;
        x.fx.push({ key: "atkUp", stat: "atk", amount: phase.atk, turns: 99, fresh: false, source: x.id });
        st.log.push({ kind: "status", target: x.id, status: "atkUp", on: true, amount: phase.atk, turns: 99, source: x.id, stat: "atk" });
        x.fx.push({ key: "speedUp", stat: "speed", amount: phase.speed, turns: 99, fresh: false, source: x.id });
        st.log.push({ kind: "status", target: x.id, status: "speedUp", on: true, amount: phase.speed, turns: 99, source: x.id, stat: "speed" });
        if (phase.basicAttack) x.card = { ...x.card, basicAttack: phase.basicAttack };
        if (phase.spell) { x.spell = phase.spell; x.pIn = 1; }
        if (phase.tertiary) { x.tertiary = phase.tertiary; x.tIn = 1; }
        if (phase.ultimate) { x.ultimate = phase.ultimate; x.ultimateGauge = BATTLE.ultimateGaugeMax; st.log.push({ kind: "ultimateGauge", target: x.id, amount: BATTLE.ultimateGaugeMax, current: BATTLE.ultimateGaugeMax, max: BATTLE.ultimateGaugeMax }); }
        changed = true;
      }
    }
    for (const x of all()) {
      if (x.hp > 0 && x.master && unit(st, x.master).hp <= 0) {
        x.hp = 0;
        x.shield = 0;
        x.titanShield = 0;
        st.log.push({ kind: "ko", target: x.id });
        changed = true;
      }
      const home = x.id[0] as Side;
      if (x.side !== home) {
        // Carte volée : elle revient à la fin du contrôle ou à sa mort ; dernier survivant de son camp d'origine, elle est exécutée
        const lastOfHome = x.hp > 0 && !all().some((o) => o !== x && o.id[0] === home && o.hp > 0);
        if (lastOfHome) {
          x.hp = 0;
          x.shield = 0;
          x.titanShield = 0;
          st.log.push({ kind: "ko", target: x.id });
          changed = true;
        }
        if (x.hp <= 0 || !hasFx(x, "controlled")) {
          x.side = home;
          st.stolen--;
          changed = true;
        }
      }
      if (x.hp <= 0 && !x.deathCast && DEATH_CAST.has(x.card.characterId) && x.ultimate) {
        x.deathCast = true;
        const spell = x.ultimate;
        const foes = alive(st, enemy(x.side));
        if (foes.length && (spell.target === null || spell.target === "foe")) {
          resolveAction(st, x, { spell: "ultimate", target: spell.target === "foe" ? weakest(foes).id : null }, true);
          changed = true;
        }
      }
    }
  }
}

/** Carte qui doit agir maintenant, ou null si le combat est fini. Saute les cartes à 0 PV ou étourdies et ouvre les tours. */
export function currentActor(st: BattleState): UnitView | null {
  if (st.opts.gauge) {
    const u = gaugeActor(st);
    return u ? view(u) : null;
  }
  while (!st.result) {
    processDeaths(st);
    if (!alive(st, "A").length || !alive(st, "B").length) {
      finish(st, false);
      break;
    }
    if (!st.roundOpen) {
      if (st.round >= st.opts.maxRounds) {
        finish(st, true);
        break;
      }
      st.round++;
      st.roundOpen = true;
      st.log.push({ kind: "round", round: st.round });
    }
    const u = st.teams[st.order[st.slot % 2]][Math.floor(st.slot / 2)];
    if (u && u.hp > 0) {
      if (!hasFx(u, "stun") && !hasFx(u, "sleep") && !cutOffByDuel(st, u)) return view(u);
      st.log.push({ kind: "skip", actor: u.id, reason: "stun" });
      advanceCooldowns(u);
      finishUnitTurn(st, u);
    }
    nextSlot(st);
  }
  return null;
}

/** Sort personnel associé à une action spéciale. */
function spellFor(u: Unit, slot: "special" | "tertiary" | "ultimate"): CharacterSpell | null {
  return slot === "special" ? u.spell : slot === "tertiary" ? u.tertiary : u.ultimate;
}

/** Cibles possibles d'un sort personnel donné. */
function targetsForSpell(st: BattleState, u: Unit, spell: CharacterSpell): (UnitId | null)[] {
  switch (spell.target) {
    case "foe": {
      // Sceau et vol : sans effet sur les boss, inutiles sur une carte déjà scellée ou volée
      const needsMortal = spell.effects.some((e) => e.k === "seal" || e.k === "steal");
      return foesFor(st, u).filter((x) => !needsMortal || (!x.card.boss && !hasFx(x, "seal") && !hasFx(x, "controlled"))).map((x) => x.id);
    }
    case "ally": return alive(st, u.side).map((x) => x.id);
    case "deadAlly": return u.revived ? [] : fallen(st, u.side).map((x) => x.id);
    default:
      // Arise : une fois par combat, et seulement s'il y a un mort à relever
      if (spell.effects.some((e) => e.k === "arise")) return u.revived || !fallen(st, u.side).length ? [] : [null];
      return [null];
  }
}

/** Les SSR et UR ont 4 emplacements personnalisés (base, secondaire, tertiaire, ultime) : ils n'ont pas de sort de type. */
export const hasCharacterSlots = (rarity: string) => rarity === "SSR" || rarity === "UR";
const cooldownReady = (actor: Unit, remaining: number) => remaining <= (actor.continuingTurn ? 0 : 1);

/** Ce que la carte courante peut faire : attaque de base, sorts prêts et ultime chargé. */
export function legalActions(st: BattleState): { spell: Spell; targets: (UnitId | null)[] }[] {
  const id = currentActor(st)?.id;
  if (!id) return [];
  const u = unit(st, id);
  const foes = foesFor(st, u).map((f) => f.id);
  const list: { spell: Spell; targets: (UnitId | null)[] }[] = [{ spell: "base", targets: foes }];
  if (hasFx(u, "silence")) return list;
  if (cooldownReady(u, u.spellIn) && !hasCharacterSlots(u.card.rarity)) {
    const t = u.card.type;
    const targets = t === "AVENTURE" ? [null] : t === "COEUR" ? alive(st, u.side).map((x) => x.id) : foes;
    list.push({ spell: "affinity", targets });
  }
  for (const slot of ["special", "tertiary", "ultimate"] as const) {
    const spell = spellFor(u, slot);
    const ready = slot === "special" ? cooldownReady(u, u.pIn) : slot === "tertiary" ? cooldownReady(u, u.tIn) : u.ultimateGauge >= BATTLE.ultimateGaugeMax;
    if (!spell || !ready) continue;
    const targets = targetsForSpell(st, u, spell);
    if (targets.length) list.push({ spell: slot, targets });
  }
  return list;
}

/** Mode auto : lance un sort personnel prêt si sa cible et son effet sont utiles. */
function autoSpecial(st: BattleState, u: Unit, slot: "special" | "tertiary" | "ultimate"): Action | null {
  const spell = spellFor(u, slot);
  const ready = slot === "special" ? cooldownReady(u, u.pIn) : slot === "tertiary" ? cooldownReady(u, u.tIn) : u.ultimateGauge >= BATTLE.ultimateGaugeMax;
  if (!spell || !ready) return null;
  const targets = targetsForSpell(st, u, spell);
  if (!targets.length) return null;
  const allies = alive(st, u.side), foes = foesFor(st, u);
  const fx = spell.effects;
  const only = (k: Effect["k"]) => fx.every((e) => e.k === k);
  if (only("stun") && !fx.some((effect) => effect.k === "stun" && strongestFoes(st, u, effect.count).some((foe) => !foe.card.boss && !hasFx(foe, "immune")))) return null;
  if (spell.target === "deadAlly") return { spell: slot, target: targets[0] };
  if (fx.some((e) => e.k === "heal" || e.k === "purge") && fx.every((e) => e.k === "heal" || e.k === "purge")) {
    const hurt = allies.some((x) => x.hp < x.maxHp * BATTLE.healBelow);
    const dirty = fx.some((e) => e.k === "purge") && allies.some((x) => x.fx.some((f) => MALUS.has(f.key)) || x.exposed || x.weaken > 0);
    if (!hurt && !dirty) return null;
  }
  if (only("shield") && allies.every((x) => x.shield > x.maxHp * 0.05)) return null;
  if (spell.target === "ally") return { spell: slot, target: mostHurt(allies).id };
  if (spell.target === "foe") {
    const control = fx.some((e) => e.k === "silence" || e.k === "seal" || e.k === "steal");
    const pool = foes.filter((f) => targets.includes(f.id));
    const pick = control ? pool.reduce((m, x) => (x.atk > m.atk ? x : m)) : weakest(pool);
    return { spell: slot, target: pick.id };
  }
  return { spell: slot, target: null };
}

/** Stratégie automatique (mode auto et PvM en arrière-plan) : vise l'ennemi qui a le moins de PV. */
export function autoAction(st: BattleState): Action {
  const id = currentActor(st)?.id;
  if (!id) throw new Error("Combat terminé");
  const u = unit(st, id);
  const foes = foesFor(st, u);
  const allies = alive(st, u.side);
  const base: Action = { spell: "base", target: weakest(foes).id };
  if (hasFx(u, "silence") || hasFx(u, "seal")) return base;
  const ultimate = autoSpecial(st, u, "ultimate");
  if (ultimate) return ultimate;
  const special = autoSpecial(st, u, "special");
  if (special) return special;
  const tertiary = autoSpecial(st, u, "tertiary");
  if (tertiary) return tertiary;
  if (!cooldownReady(u, u.spellIn) || hasCharacterSlots(u.card.rarity)) return base;
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
  resolveAction(st, unit(st, id), action, false);
}

/** Résout une action de `u`. `reaction` : lancée hors de son tour (ultime à la mort) : ni recharge, ni jauge, ni fin de tour. */
function resolveAction(st: BattleState, u: Unit, action: Action, reaction: boolean) {
  const { rng, opts, log } = st;
  if (!reaction && action.spell !== "base" && hasFx(u, "seal")) {
    // Sceau (Kurapika) : lancer un sort scellé est fatal
    log.push({ kind: "action", actor: u.id, spell: action.spell, target: action.target, turnOrder: timeline(st, 8) });
    u.hp = 0;
    u.shield = 0;
    log.push({ kind: "ko", target: u.id });
    finishUnitTurn(st, u);
    if (st.opts.gauge) st.gaugeActor = null;
    else nextSlot(st);
    currentActor(st);
    return;
  }
  if (!reaction && !u.continuingTurn) advanceCooldowns(u);

  // Un bonus ignore-DEF reste applicable à tous les coups d'une même action (par exemple une zone).
  const pendingIgnoreFx = u.fx.find((f) => f.key === "ignoreDef");
  const pendingIgnoreDef = pendingIgnoreFx?.amount ?? 0;
  let consumedIgnoreFx = false;
  let landedHit = false;
  /** Cibles réellement touchées par l'action (pour l'effet d'élément) */
  const struck = new Set<Unit>();
  /** Cartes frappées qui ripostent (Domaine du monarque), une ombre par action */
  const shadows = new Set<Unit>();
  const hit = (t: Unit, mult: number, ignoreDef = 0, exposedBonus = false, pierce = false, critSure = false) => {
    // L'ignore-DEF accordé par une attaque de base est consommé sur la prochaine action offensive.
    if (pendingIgnoreFx && !consumedIgnoreFx) {
      consumedIgnoreFx = true;
      dropFx(u, pendingIgnoreFx);
    }
    ignoreDef = Math.min(0.95, ignoreDef + pendingIgnoreDef + (u.card.artifactStats?.ignoreDef ?? 0));
    // Esquive : arme (sorts affiliés seulement) ou effet d'un sort ; un coup qui traverse ne s'esquive pas
    const dodge = pierce || u.card.artifactStats?.precision ? 0 : clamp((action.spell === "affinity" ? t.dodge : 0) + (t.card.artifactStats?.dodge ?? 0) + fxSum(t, "dodge"), 0, BATTLE.dodgeCap);
    if (dodge > 0 && rng() < dodge) {
      log.push({ kind: "dodge", source: u.id, target: t.id });
      return 0;
    }
    // Peur (Griffon) : l'attaquant effrayé peut rater son coup
    const fear = fxKeySum(u, "fear");
    if (fear > 0 && rng() < fear) {
      log.push({ kind: "dodge", source: u.id, target: t.id });
      return 0;
    }
    const def = t.def * (1 + clamp(fxSum(t, "def"), -BATTLE.statCap, BATTLE.statCap)) * (1 - ignoreDef);
    let atk = u.atk * (1 + (u.elan > 0 ? 0.1 : 0) - (u.weaken > 0 ? 0.2 : 0) + clamp(fxSum(u, "atk"), -BATTLE.statCap, BATTLE.statCap));
    // Combo Cœur : un bouclier couvrant au moins 10 % des PV max renforce les attaques.
    if (opts.combos && u.shield >= u.maxHp * BATTLE.comboShieldThreshold) atk *= 1.15;
    const aff = affinity(u.card.type, t.card.type);
    let dmg = atk * aff * mult * Math.max(BATTLE.floor, BATTLE.defK / (BATTLE.defK + def));
    const crit = critSure || rng() < clamp(BATTLE.critRate + (u.card.artifactStats?.crit ?? 0) + starCrit(u.card) + fxSum(u, "crit"), 0, BATTLE.critCap);
    if (crit) dmg *= BATTLE.critDamage + (u.card.artifactStats?.critDamage ?? 0) + starCritDamage(u.card) + fxSum(u, "critDamage");
    dmg *= 1 + ((damageKind(u.card) === "magic" ? u.card.artifactStats?.magicDamage : u.card.artifactStats?.physDamage) ?? 0)
      + ((damageKind(u.card) === "magic" ? weaponOf(u.card)?.stats?.magicDamage : weaponOf(u.card)?.stats?.physDamage) ?? 0);
    const wp = weaponOf(u.card)?.passive;
    // Murakumogiri : un coup physique peut être doublé
    if (wp?.kind === "doubleStrike" && damageKind(u.card) === "physical" && rng() < wp.chance) dmg *= 2;
    // Napoléon : les sorts de foudre et de feu sont doublés
    if (wp?.kind === "stormFire" && action.spell === "special" && opts.elements && !u.card.noElement) {
      const el = effectElement(u.card.characterId);
      if (el === "foudre" || el === "feu") dmg *= 2;
    }
    if (action.spell === "special" && opts.elements && !u.card.noElement && effectElement(u.card.characterId)) dmg *= 1 + (u.card.artifactStats?.elementalDamage ?? 0);
    const markedSpell = action.spell === "special" ? u.spell : action.spell === "tertiary" ? u.tertiary : action.spell === "ultimate" ? u.ultimate : null;
    if (isMagicalSpell(u.card, action.spell, markedSpell)) dmg *= magicSkillMultiplier(u.card.artifactStats?.magicSkill ?? 0);
    dmg *= 1 + (rng() * 2 - 1) * BATTLE.variance;
    dmg *= 1 + u.finalBonus;
    // Réduction des dégâts subis (sorts de tank), plafonnée
    dmg *= 1 + fxKeySum(t, "vulnerable");
    const g = t.card.guard;
    const passiveGuard = g && (g.when === "above" ? t.hp > t.maxHp * g.at : t.hp <= t.maxHp * g.at) ? g.reduce : 0;
    dmg *= 1 - clamp(fxKeySum(t, "reduce") + fxKeySum(t, "titan") + (weaponOf(t.card)?.stats?.reduce ?? 0) + t.guard + passiveGuard, 0, BATTLE.reduceCap);
    const absorbed = pierce ? 0 : Math.min(t.shield, dmg);
    t.shield -= absorbed;
    t.titanShield = Math.max(0, t.titanShield - absorbed);
    t.hp = Math.max(0, t.hp - (dmg - absorbed));
    log.push({
      kind: "damage", source: u.id, target: t.id, amount: dmg, absorbed, crit,
      affinity: aff > 1 ? "strong" : aff < 1 ? "weak" : null, exposedBonus, hp: t.hp, shield: t.shield,
    });
    if (dmg > 0) { landedHit = true; struck.add(t); }
    // Un coup réveille l'endormi
    if (dmg > 0) {
      const sleep = t.fx.find((f) => f.key === "sleep");
      if (sleep) dropFx(t, sleep);
      // Big Mom : les dégâts qu'elle subit libèrent ses marques (seuil atteint, ou elle meurt)
      for (const y of [...st.teams.A, ...st.teams.B]) {
        const mark = y.fx.find((f) => f.key === "devour" && f.source === t.id);
        if (!mark) continue;
        mark.amount -= dmg - absorbed;
        if (mark.amount <= 0 || t.hp <= 0) dropFx(y, mark);
      }
    }
    // Griffon : Peur sur l'adversaire touché ; Hassaikai : la garde du porteur grandit à chaque attaque de base reçue
    if (dmg > 0 && t.hp > 0 && wp?.kind === "fear") addFx(t, "fear", wp.missChance, 1);
    const wt = weaponOf(t.card)?.passive;
    if (dmg > 0 && wt?.kind === "guardStack" && action.spell === "base") t.guard = Math.min(wt.max, t.guard + wt.step);
    triggerTitan(st, t, t === u);
    if (t.hp === 0) log.push({ kind: "ko", target: t.id });
    else if (t.side !== u.side) {
      if (hasFx(t, "counter")) shadows.add(t);
      // Soif de sang (Denji) : soigné d'une part des dégâts reçus
      const lust = fxKeySum(t, "bloodlust");
      const back = Math.min(t.maxHp - t.hp, (dmg - absorbed) * lust);
      if (lust > 0 && back > 0) {
        t.hp += back;
        clearBleed(st, t);
        log.push({ kind: "heal", source: t.id, target: t.id, amount: back, hp: t.hp });
      }
    }
    return dmg;
  };
  const heal = (t: Unit, amount: number) => {
    if (t.hp > 0 && amount > 0) clearBleed(st, t);
    const before = t.hp;
    t.hp = Math.min(t.maxHp, t.hp + amount);
    if (t.hp > before) log.push({ kind: "heal", source: u.id, target: t.id, amount: t.hp - before, hp: t.hp });
  };
  /** Pose un effet durable ; un malus est refusé par l'immunité, et le silence par les boss. L'effet de même nature se renouvelle (le plus fort reste). */
  const addFx = (t: Unit, key: FxKey, amount: number, turns: number, stat?: ModStat) => {
    if (t.hp <= 0) return;
    if ((key === "poison" || key === "burn") && DOT_IMMUNE.has(t.card.characterId)) {
      log.push({ kind: "resist", target: t.id });
      return;
    }
    if (MALUS.has(key) && (hasFx(t, "immune") || ((key === "silence" || key === "stun" || key === "seal" || key === "sleep") && t.card.boss))) {
      log.push({ kind: "resist", target: t.id });
      return;
    }
    const old = t.fx.find((f) => f.key === key);
    if (old) {
      if (key === "stun" || key === "sleep") old.turns = Math.max(old.turns, turns);
      else if (Math.abs(amount) >= Math.abs(old.amount)) Object.assign(old, { amount, turns, fresh: t === u, source: u.id });
      else old.turns = Math.max(old.turns, turns);
      // Renouvellement : l'écran met à jour la valeur et la durée affichées
      log.push({ kind: "status", target: t.id, status: key, on: true, amount: old.amount, turns: old.turns, source: old.source, ...(old.stat ? { stat: old.stat } : {}) });
      return;
    }
    t.fx.push({ key, stat, amount, turns, fresh: t === u, source: u.id });
    log.push({ kind: "status", target: t.id, status: key, on: true, amount, turns, source: u.id, ...(stat ? { stat } : {}) });
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

  /** Effet d'élément du sort secondaire (attack-element.ts) : sur les cibles touchées, ou sur le lanceur et ses alliés. */
  const applyElement = () => {
    const own = opts.elements && !u.card.noElement ? effectElement(u.card.characterId) : null;
    if (!own) return;
    // Napoléon : les autres éléments appliquent à la fois foudre et feu
    const stormFire = weaponOf(u.card)?.passive?.kind === "stormFire" && own !== "foudre" && own !== "feu";
    for (const element of stormFire ? (["foudre", "feu"] as const) : [own]) applyOneElement(element);
  };
  const applyOneElement = (element: NonNullable<ReturnType<typeof effectElement>>) => {
    const r = ELEMENT_RIDER;
    const hitFoes = [...struck].filter((t) => t.hp > 0 && t.side !== u.side);
    const consumed = new Set<Unit>();
    if (opts.combos) for (const t of hitFoes) {
      if (hasFx(t, "immune")) continue;
      const earthFire = element === "terre" ? "burn" : element === "feu" ? "earth" : null;
      const airWater = element === "air" ? "wet" : element === "eau" ? "swept" : null;
      const mark = t.fx.find((f) => f.key === (earthFire ?? airWater));
      const result = earthFire ? "broken" : "vulnerable";
      if (!mark || hasFx(t, result)) continue;
      dropFx(t, mark);
      addFx(t, result, earthFire ? (t.card.boss ? -0.2 : -0.4) : 0.25, 2, earthFire ? "def" : undefined);
      consumed.add(t);
    }
    switch (element) {
      case "eau": {
        for (const t of hitFoes) if (!consumed.has(t)) addFx(t, "wet", 0, r.wetTurns);
        const allies = alive(st, u.side);
        const others = allies.filter((a) => a !== u);
        const pool = others.length ? others : allies;
        if (pool.length) { const ally = pool[Math.floor(rng() * pool.length)]; heal(ally, ally.maxHp * r.healPct); }
        break;
      }
      case "foudre":
        for (const t of hitFoes) {
          const wet = t.fx.find((f) => f.key === "wet");
          if (!wet) continue;
          dropFx(t, wet);
          addFx(t, "stun", 0, r.stunTurns);
        }
        break;
      case "terre":
        for (const t of hitFoes) {
          addFx(t, "speedDown", r.slow, r.slowTurns, "speed");
          if (!consumed.has(t)) addFx(t, "earth", 0, r.slowTurns);
        }
        break;
      case "feu":
        // Une zone brûle moins fort chaque cible (calibrage : sinon +12 pp pour Mustang et Megumin)
        for (const t of hitFoes) if (!consumed.has(t)) addFx(t, "burn", (hitFoes.length > 1 ? r.burnPct * r.burnZoneScale : r.burnPct) * (1 + (u.card.artifactStats?.elementalDamage ?? 0)), r.burnTurns);
        break;
      case "air":
        for (const t of hitFoes) if (!consumed.has(t)) addFx(t, "swept", 0, r.dodgeTurns);
        addFx(u, "dodgeUp", r.dodge, r.dodgeTurns, "dodge");
        break;
    }
  };

  const basic = action.spell === "base" && !u.card.noBasicAttack ? u.card.basicAttack ?? basicAttackOf(u.card.characterId, u.card.rarity, u.card.type) : null;
  const activeSpell = action.spell === "special" ? u.spell : action.spell === "tertiary" ? u.tertiary : action.spell === "ultimate" ? u.ultimate : null;
  const actionName = action.spell === "base" ? basic?.name : action.spell === "affinity" ? undefined : activeSpell?.name;
  log.push({ kind: "action", actor: u.id, spell: action.spell, target: action.target, ...(actionName ? { name: actionName } : {}), ...(!reaction ? { turnOrder: timeline(st, 8) } : {}) });
  const target = action.target ? unit(st, action.target) : null;
  if (action.spell === "ultimate" && !reaction) {
    const spent = u.ultimateGauge;
    u.ultimateGauge = 0;
    log.push({ kind: "ultimateGauge", target: u.id, amount: -spent, current: 0, max: BATTLE.ultimateGaugeMax });
  }
  if (action.spell === "base") {
    if (u.spellIn === 0) u.held++;
    const amount = hit(target!, 1, basic?.rider.kind === "ignoreDef" && basic.rider.immediate ? basic.rider.pct : 0);
    if (amount > 0 && basic) {
      const applyRider = (rider: BasicRider) => {
        switch (rider.kind) {
          case "mod": {
            const recipient = rider.to === "self" ? u : target!;
            addFx(recipient, `${rider.stat}${rider.amount > 0 ? "Up" : "Down"}`, rider.amount, 1, rider.stat);
            break;
          }
          case "heal":
            heal(u, u.maxHp * rider.pct);
            break;
          case "shield": {
            const add = Math.min(u.maxHp * rider.pct, Math.max(0, u.maxHp * 0.3 - u.shield));
            if (add > 0) {
              u.shield += add;
              log.push({ kind: "shield", source: u.id, target: u.id, amount: add, shield: u.shield });
            }
            break;
          }
          case "poison":
            addFx(target!, "poison", rider.pct, 1);
            break;
          case "drain":
            heal(u, amount * rider.pct);
            break;
          case "ignoreDef":
            if (!rider.immediate) addFx(u, "ignoreDef", rider.pct, 1);
            break;
        }
      };
      applyRider(basic.rider);
    }
  } else if (action.spell === "special" || action.spell === "tertiary" || action.spell === "ultimate") {
    if (action.spell === "special") u.pIn = u.specialCd;
    if (action.spell === "tertiary") u.tIn = u.tertiaryCd;
    const who = (scope: Scope): Unit[] =>
      scope === "self" ? [u] : scope === "team" ? alive(st, u.side) : scope === "foes" ? reachableFoes(st, u) : target && target.hp > 0 ? [target] : [];
    for (const e of activeSpell!.effects) {
      switch (e.k) {
        case "damage": {
          const foes = reachableFoes(st, u);
          // Chaîne (Kanmuru) : la cible choisie d'abord, puis tous les autres ennemis
          const targets = e.zone ? (e.ramp && target && target.hp > 0 ? [target, ...foes.filter((f) => f !== target)] : foes) : target ? [target] : [];
          let total = 0;
          // L'ignore-DEF peut grandir avec les PV manquants du lanceur (part de PV max manquants × ignoreMissing)
          const ignore = (e.ignoreDef ?? 0) + (e.ignoreMissing ?? 0) * (1 - u.hp / u.maxHp);
          for (const [i, t] of targets.entries()) {
            const strikes = (e.hits ?? 1) + (e.extraHit && fxSum(t, "def") < 0 ? 1 : 0);
            for (let n = 0; n < strikes && t.hp > 0; n++) total += hit(t, e.mult * (1 + (e.ramp ?? 0) * i), ignore, false, e.pierce, e.critSure);
          }
          if (e.drain) heal(u, total * e.drain);
          break;
        }
        case "mod":
          for (const t of e.to === "foes" && e.count ? strongestFoes(st, u, e.count) : who(e.to)) addFx(t, `${e.stat}${e.amount > 0 ? "Up" : "Down"}`, e.amount, e.turns, e.stat);
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
          for (const t of e.to === "foes" && e.count ? strongestFoes(st, u, e.count) : who(e.to)) addFx(t, "silence", 0, e.turns);
          break;
        case "sleep":
          // Haki des rois : seuls les ennemis à l'ATK plus faible que celle du lanceur s'endorment
          for (const foe of alive(st, enemy(u.side))) if (!e.weaker || foe.atk < u.atk) addFx(foe, "sleep", 0, e.turns);
          break;
        case "duel": {
          // Duel : la cible choisie est la seule à pouvoir atteindre le lanceur
          if (!target || target.hp <= 0) break;
          addFx(u, "duel", 0, e.turns);
          const duel = u.fx.find((f) => f.key === "duel");
          if (duel) duel.foe = target.id;
          break;
        }
        case "devour": {
          const foes = alive(st, enemy(u.side));
          if (!foes.length) break;
          const victim = foes[Math.floor(rng() * foes.length)];
          addFx(victim, "devour", victim.maxHp * e.threshold, e.turns);
          break;
        }
        case "stun": {
          const targets = strongestFoes(st, u, e.count);
          for (const foe of targets) addFx(foe, "stun", 0, e.turns);
          break;
        }
        case "immune":
          for (const t of who(e.to)) addFx(t, "immune", 0, e.turns);
          break;
        case "taunt":
          addFx(u, "taunt", 0, e.turns);
          break;
        case "reduce":
          for (const t of who(e.to)) addFx(t, "reduce", e.pct, e.turns);
          break;
        case "counter":
          addFx(u, "counter", e.mult, e.turns);
          break;
        case "bloodlust":
          addFx(u, "bloodlust", e.pct, e.turns);
          break;
        case "resetCd":
          for (const t of alive(st, u.side)) {
            t.spellIn = Math.min(t.spellIn, SPELL_FIRST);
            t.pIn = Math.min(t.pIn, SPELL_FIRST);
            t.tIn = Math.min(t.tIn, SPELL_FIRST);
          }
          break;
        case "seal":
          for (const t of who("target")) addFx(t, "seal", 0, e.turns);
          break;
        case "steal":
          for (const t of who("target")) {
            if (t.card.boss || hasFx(t, "immune")) {
              log.push({ kind: "resist", target: t.id });
              continue;
            }
            t.side = u.side;
            st.stolen++;
            addFx(t, "controlled", 0, e.turns);
          }
          break;
        case "arise":
          for (const dead of fallen(st, u.side)) {
            u.revived = true;
            dead.hp = dead.maxHp * e.pct;
            dead.shield = 0;
            dead.titanShield = 0;
            dead.fx = [];
            Object.assign(dead, { exposed: false, weaken: 0, elan: 0, spellIn: 2, pIn: SPELL_FIRST, tIn: SPELL_FIRST, held: 0, master: u.id });
            log.push({ kind: "revive", source: u.id, target: dead.id, hp: dead.hp, zombie: true });
            addFx(dead, "zombie", 0, 999);
          }
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
            target.titanShield = 0;
            target.fx = [];
            Object.assign(target, { exposed: false, weaken: 0, elan: 0, spellIn: 2, pIn: SPELL_FIRST, tIn: SPELL_FIRST, held: 0 });
            log.push({ kind: "revive", source: u.id, target: target.id, hp: target.hp });
          }
          break;
      }
    }
    if (action.spell === "special") applyElement();
  } else {
    u.spellIn = u.cooldown;
    u.held = 0;
    const foes = reachableFoes(st, u);
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
  if (BLADE_USERS.has(u.card.characterId) && !u.phased) {
    for (const t of struck) {
      if (t.side === u.side || t.hp <= 0 || hasFx(t, "immune")) continue;
      const stacks = Math.min(5, (t.fx.find((f) => f.key === "bleed")?.stacks ?? 0) + 1);
      addFx(t, "bleed", stacks * 0.02 * (1 + (u.card.artifactStats?.bleedBonus ?? 0)), Infinity);
      const bleed = t.fx.find((f) => f.key === "bleed");
      if (bleed) Object.assign(bleed, { stacks, amount: stacks * 0.02 * (1 + (u.card.artifactStats?.bleedBonus ?? 0)) });
    }
  }
  // Domaine du monarque : l'ombre de chaque carte frappée riposte à l'attaquant s'il est encore debout
  for (const owner of shadows) {
    if (owner.hp <= 0 || u.hp <= 0) continue;
    const def = u.def * (1 + clamp(fxSum(u, "def"), -BATTLE.statCap, BATTLE.statCap));
    const aff = affinity(owner.card.type, u.card.type);
    let dmg = owner.atk * aff * fxKeySum(owner, "counter") * Math.max(BATTLE.floor, BATTLE.defK / (BATTLE.defK + def));
    dmg *= 1 + (rng() * 2 - 1) * BATTLE.variance;
    dmg *= 1 - clamp(fxKeySum(u, "reduce") + fxKeySum(u, "titan"), 0, BATTLE.reduceCap);
    const absorbed = Math.min(u.shield, dmg);
    u.shield -= absorbed;
    u.titanShield = Math.max(0, u.titanShield - absorbed);
    u.hp = Math.max(0, u.hp - (dmg - absorbed));
    log.push({
      kind: "damage", source: owner.id, target: u.id, amount: dmg, absorbed, crit: false,
      affinity: aff > 1 ? "strong" : aff < 1 ? "weak" : null, exposedBonus: false, hp: u.hp, shield: u.shield, shadow: true,
    });
    triggerTitan(st, u, true);
    if (u.hp === 0) log.push({ kind: "ko", target: u.id });
  }
  // Un sort actif (même sans dégât : buff, soin, debuff) charge la jauge comme une attaque qui touche
  if ((landedHit || activeSpell) && action.spell !== "ultimate" && u.ultimate && u.ultimateGauge < BATTLE.ultimateGaugeMax) {
    const old = u.ultimateGauge;
    u.ultimateGauge = Math.min(BATTLE.ultimateGaugeMax, old + (action.spell === "base" ? BATTLE.ultimateGaugeBase : u.card.artifactStats?.gaugePerSpell || BATTLE.ultimateGaugePerHit));
    log.push({ kind: "ultimateGauge", target: u.id, amount: u.ultimateGauge - old, current: u.ultimateGauge, max: BATTLE.ultimateGaugeMax });
  }
  if (reaction) return;
  if (activeSpell && hasCharacterSlots(u.card.rarity) && isSoloBuff(activeSpell)) {
    u.continuingTurn = true;
    // La provocation garde son tour : sinon le tour immédiat la consommerait avant que les ennemis jouent (v0.3.0)
    for (const effect of u.fx) if (effect.key !== "taunt") effect.fresh = false;
    return;
  }
  finishUnitTurn(st, u);

  if (st.opts.gauge) st.gaugeActor = null;
  else nextSlot(st);
  currentActor(st);
}

/** Combat complet avec la stratégie automatique. */
export function battle(a: BattleCard[], b: BattleCard[], rng: Random, options: BattleOptions = {}): BattleResult {
  const st = createBattle(a, b, rng, options);
  while (currentActor(st)) applyAction(st, autoAction(st));
  return st.result!;
}
