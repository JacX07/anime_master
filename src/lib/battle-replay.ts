// Rejeu d'un journal de combat (docs/specs/combat.md §9) : pur, sans React ni base.
// replayStep() applique un événement à l'état affiché ; holdFor() dit combien de temps l'afficher avant le suivant.
// L'état ne contient que ce que l'écran montre (PV, boucliers, états, K.O.) et la liste des « pops » (nombres, effets) à animer.

import type { CardType } from "../generated/prisma/enums";
import type { BattleEvent, FxKey, Side, Spell, Status, UnitId, UnitView } from "./battle";
import { attackVisual } from "./attack-visual";

export interface UnitState {
  hp: number;
  shield: number;
  ko: boolean;
  exposed: boolean;
  weaken: boolean;
  elan: boolean;
  /** Effets durables des sorts de personnage (bonus, malus, silence, poison…) */
  fx: FxKey[];
}

/** Élément éphémère posé sur une carte : nombre flottant, effet de type, étiquette d'état. */
export type Pop =
  | { id: number; unit: UnitId; kind: "damage"; amount: number; absorbed: number; crit: boolean; affinity: "strong" | "weak" | null; exposedBonus: boolean }
  | { id: number; unit: UnitId; kind: "dodge" }
  | { id: number; unit: UnitId; kind: "heal"; amount: number }
  | { id: number; unit: UnitId; kind: "shield"; amount: number }
  | { id: number; unit: UnitId; kind: "status"; status: Status; on: boolean }
  | { id: number; unit: UnitId; kind: "poison"; amount: number; burn?: boolean; bleed?: boolean }
  | { id: number; unit: UnitId; kind: "revive" }
  | { id: number; unit: UnitId; kind: "resist" }
  /** Effet visuel d'un sort sur sa cible : `fx` est le type du lanceur, ou "base" pour le sort de base */
  | { id: number; unit: UnitId; kind: "fx"; fx: CardType | "base"; big: boolean };

/** Un pop avant numérotation */
type NewPop = Pop extends infer P ? (P extends { id: number } ? Omit<P, "id"> : never) : never;

export interface Replay {
  /** Nombre d'événements déjà appliqués */
  idx: number;
  info: Record<UnitId, UnitView>;
  units: Record<UnitId, UnitState>;
  first: Side;
  round: number;
  /** Sort en cours (n = numéro de l'action) : sert aux effets des événements qui suivent l'action */
  cur: { n: number; actor: UnitId; spell: Spell; target: UnitId | null; type: CardType; name?: string } | null;
  pops: Pop[];
  popSeq: number;
  end: Extract<BattleEvent, { kind: "end" }> | null;
}

/** Nom du sort affiché : sort de base, ou rôle du sort affilié du type (docs/specs/combat.md §4). */
export const SPELL_NAMES: Record<CardType, string> = {
  COMBAT: "Frappe",
  MYSTERE: "Ouverture",
  MAGIE: "Vampire",
  COEUR: "Soutien",
  AVENTURE: "Zone",
};

/** Nom, pastille et aide de chaque état affiché sur une carte. */
export const STATUS_INFO: Record<Status, { label: string; glyph: string; help: string; bad: boolean }> = {
  exposed: { label: "Exposé", glyph: "◎", help: "Le prochain sort de Combat sur cette carte fait ×1,7. L'exposition disparaît ensuite.", bad: true },
  weaken: { label: "Affaibli", glyph: "▼", help: "ATK −20 % pendant 2 tours de cette carte.", bad: true },
  elan: { label: "Élan", glyph: "▲", help: "ATK +10 % pendant 2 tours de cette carte.", bad: false },
  atkUp: { label: "ATK +", glyph: "⚔", help: "Son ATK est augmentée.", bad: false },
  atkDown: { label: "ATK −", glyph: "⚔", help: "Son ATK est réduite.", bad: true },
  defUp: { label: "DEF +", glyph: "⛨", help: "Sa DEF est augmentée.", bad: false },
  defDown: { label: "DEF −", glyph: "⛨", help: "Sa DEF est réduite.", bad: true },
  critUp: { label: "Critique +", glyph: "✦", help: "Sa chance de coup critique est augmentée.", bad: false },
  critDown: { label: "Critique −", glyph: "✦", help: "Sa chance de coup critique est réduite.", bad: true },
  dodgeUp: { label: "Esquive", glyph: "≈", help: "Elle a une chance d'esquiver les coups.", bad: false },
  dodgeDown: { label: "Esquive −", glyph: "≈", help: "Sa chance d'esquiver est réduite.", bad: true },
  speedUp: { label: "Vitesse +", glyph: "↟", help: "Sa jauge se remplit plus vite, jusqu'à +60 %.", bad: false },
  speedDown: { label: "Vitesse −", glyph: "↡", help: "Sa jauge se remplit moins vite, jusqu'à −60 %.", bad: true },
  silence: { label: "Silence", glyph: "✕", help: "Ne peut lancer que son sort de base.", bad: true },
  stun: { label: "Étourdi", glyph: "✹", help: "Ne peut pas agir pendant l'étourdissement ; les effets durables continuent.", bad: true },
  immune: { label: "Immunisé", glyph: "◈", help: "Aucun nouveau malus ne peut la toucher.", bad: false },
  earth: { label: "Terre", glyph: "◆", help: "Un sort de feu brisera sa défense.", bad: true },
  swept: { label: "Balayé", glyph: "≈", help: "Un sort d’eau appliquera Affaiblissement.", bad: true },
  broken: { label: "Brisé", glyph: "⛨", help: "DEF −40 % (−20 % sur les boss), pendant 2 actions.", bad: true },
  vulnerable: { label: "Affaiblissement", glyph: "▼", help: "Subit 25 % de dégâts supplémentaires pendant 2 actions.", bad: true },
  bleed: { label: "Saignement", glyph: "♦", help: "Perd 2 % de ses PV actuels par cumul (5 maximum), à chaque action. Un soin ou une purge l’efface.", bad: true },
  poison: { label: "Poison", glyph: "☠", help: "Perd des PV à la fin de chacun de ses tours.", bad: true },
  taunt: { label: "Provocation", glyph: "⚑", help: "Les ennemis ne peuvent viser que cette carte avec leurs attaques à cible unique.", bad: false },
  counter: { label: "Domaine du monarque", glyph: "☾", help: "Quand cette carte est frappée et survit, une ombre sort de ses pieds et riposte.", bad: false },
  seal: { label: "Scellé", glyph: "⛓", help: "S'il lance un sort (hors attaque de base) avant la fin du sceau, il meurt.", bad: true },
  controlled: { label: "Contrôlé", glyph: "☍", help: "Joue pour le camp adverse ; exécuté s'il est le dernier survivant de son camp.", bad: true },
  bloodlust: { label: "Soif de sang", glyph: "♥", help: "Récupère des PV à chaque coup reçu d'un ennemi.", bad: false },
  zombie: { label: "Zombie", glyph: "✝", help: "Ressuscité par Arise. Disparaît si son maître tombe.", bad: false },
  reduce: { label: "Dégâts réduits", glyph: "⛉", help: "Subit moins de dégâts.", bad: false },
  regen: { label: "Régénération", glyph: "✚", help: "Récupère des PV à la fin de chacun de ses tours.", bad: false },
  burn: { label: "Brûlure", glyph: "♨", help: "Perd 5 % de ses PV max à la fin de chacun de ses tours.", bad: true },
  wet: { label: "Trempé", glyph: "≋", help: "Un sort de foudre l'étourdira (son prochain tour).", bad: true },
  ignoreDef: { label: "Ignore DEF", glyph: "◉", help: "Sa prochaine attaque ignore une partie de la DEF de sa cible.", bad: false },
};

/** Nom du sort joué : attaque, affinité, secondaire, tertiaire ou ultime. */
export const spellLabel = (spell: Spell, type: CardType, name?: string) => {
  if (spell === "base") return name ?? "Attaque";
  if (spell === "affinity") return SPELL_NAMES[type];
  return name ?? (spell === "special" ? "Sort secondaire" : spell === "tertiary" ? "Sort tertiaire" : "Ultime");
};

/** Texte des sorts affichés sous le plateau (docs/specs/combat.md §4). */
export const SPELL_INFO: Record<CardType, { target: string; text: string; details: string }> = {
  COMBAT: { target: "1 ennemi", text: "Ignore 40 % de la DEF ; frappe plus fort une cible exposée (l'exposition est consommée).", details: "1,5× ATK, ignore 40 % de la DEF ; ×1,7 sur une cible exposée (l'exposition est consommée)." },
  MYSTERE: { target: "1 ennemi", text: "Expose et affaiblit la cible (ATK −20 % pendant 2 tours).", details: "0,8× ATK (1,2× sans allié Combat en vie). La cible devient exposée et affaiblie (ATK −20 % pendant 2 tours)." },
  MAGIE: { target: "1 ennemi", text: "Soigne de 50 % des dégâts le lanceur et chaque allié Cœur.", details: "1,2× ATK. Soigne de 50 % des dégâts le lanceur et chaque allié Cœur." },
  COEUR: { target: "1 allié", text: "Soigne l'allié de 30 % de ses PV max, puis donne à l'équipe un bouclier de 10 % des PV max du lanceur.", details: "Soigne l'allié de 30 % de ses PV max, puis donne à l'équipe un bouclier de 10 % des PV max du lanceur." },
  AVENTURE: { target: "Tous les ennemis", text: "Frappe tous les ennemis. Toute l'équipe gagne l'élan (ATK +10 % pendant 2 tours).", details: "0,6× ATK sur chaque ennemi. Toute l'équipe gagne l'élan (ATK +10 % pendant 2 tours)." },
};
export const BASE_SPELL = { name: "Attaque", target: "1 ennemi", text: "Frappe la cible (1× ATK).", details: "1× ATK." };
export const AFFINITY_COOLDOWN = "Rechargement : 3 tours ; premier lancer au 2ᵉ tour de la carte.";

/** Une action du journal et ses effets, pour l'historique. */
export interface HistoryEntry {
  /** Numéro de l'action, à partir de 1 */
  n: number;
  round: number;
  actor: UnitId;
  spell: Spell;
  /** Nom du sort de personnage */
  name?: string;
  target: UnitId | null;
  effects: Exclude<BattleEvent, { kind: "start" | "round" | "action" | "skip" | "ultimateGauge" | "end" }>[];
}

/** Historique des actions déjà jouées (événements `log[0..upto[`). */
export function historyOf(log: BattleEvent[], upto: number): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  let round = 0;
  for (const ev of log.slice(0, upto)) {
    if (ev.kind === "round") round = ev.round;
    else if (ev.kind === "action") out.push({ n: out.length + 1, round, actor: ev.actor, spell: ev.spell, name: ev.name, target: ev.target, effects: [] });
    else if (ev.kind === "skip") out.push({ n: out.length + 1, round, actor: ev.actor, spell: "base", name: "Étourdissement : tour passé", target: null, effects: [] });
    else if (ev.kind !== "start" && ev.kind !== "end" && ev.kind !== "ultimateGauge" && out.length && !(ev.kind === "shield" && ev.source === null)) out[out.length - 1].effects.push(ev);
  }
  return out;
}

const MAX_POPS = 40;

export function replayStart(log: BattleEvent[]): Replay {
  const start = log[0];
  if (start?.kind !== "start") throw new Error("Le journal doit commencer par « start »");
  const info = {} as Record<UnitId, UnitView>;
  const units = {} as Record<UnitId, UnitState>;
  for (const u of start.units) {
    info[u.id] = u;
    units[u.id] = { hp: u.hp, shield: u.shield, ko: false, exposed: false, weaken: false, elan: false, fx: [] };
  }
  return { idx: 1, info, units, first: start.first, round: 0, cur: null, pops: [], popSeq: 0, end: null };
}

/** Applique l'événement `log[state.idx]` et renvoie le nouvel état. */
export function replayStep(state: Replay, log: BattleEvent[]): Replay {
  const ev = log[state.idx];
  if (!ev) return state;
  const units = { ...state.units };
  let info = state.info;
  const patch = (id: UnitId, p: Partial<UnitState>) => (units[id] = { ...units[id], ...p });
  let { cur, round, end, popSeq } = state;
  const add: Pop[] = [];
  const pop = (p: NewPop) => add.push({ ...p, id: ++popSeq } as Pop);

  switch (ev.kind) {
    case "round":
      round = ev.round;
      break;
    case "action":
      cur = { n: (state.cur?.n ?? 0) + 1, actor: ev.actor, spell: ev.spell, target: ev.target, type: state.info[ev.actor].type, name: ev.name };
      break;
    case "skip":
      cur = { n: (state.cur?.n ?? 0) + 1, actor: ev.actor, spell: "base", target: null, type: state.info[ev.actor].type, name: "Étourdissement : tour passé" };
      pop({ unit: ev.actor, kind: "status", status: "stun", on: true });
      break;
    case "ultimateGauge":
      info = { ...state.info, [ev.target]: { ...state.info[ev.target], ultimateGauge: ev.current } };
      break;
    case "damage":
      patch(ev.target, { hp: ev.hp, shield: ev.shield });
      if (!cur || attackVisual(state.info[cur.actor].characterId) === "melee") {
        pop({ unit: ev.target, kind: "fx", fx: cur && cur.spell !== "base" ? cur.type : "base", big: !!cur && cur.spell !== "base" });
      }
      pop({ unit: ev.target, kind: "damage", amount: ev.amount, absorbed: ev.absorbed, crit: ev.crit, affinity: ev.affinity, exposedBonus: ev.exposedBonus });
      break;
    case "dodge":
      pop({ unit: ev.target, kind: "dodge" });
      break;
    case "heal":
      patch(ev.target, { hp: ev.hp });
      pop({ unit: ev.target, kind: "heal", amount: ev.amount });
      break;
    case "shield":
      patch(ev.target, { shield: ev.shield });
      pop({ unit: ev.target, kind: "shield", amount: ev.amount });
      break;
    case "status":
      if (ev.status === "exposed" || ev.status === "weaken" || ev.status === "elan") patch(ev.target, { [ev.status]: ev.on });
      else patch(ev.target, { fx: ev.on ? [...units[ev.target].fx, ev.status] : units[ev.target].fx.filter((k) => k !== ev.status) });
      pop({ unit: ev.target, kind: "status", status: ev.status, on: ev.on });
      break;
    case "poison":
      patch(ev.target, { hp: ev.hp });
      pop({ unit: ev.target, kind: "poison", amount: ev.amount, ...(ev.burn ? { burn: true } : {}), ...(ev.bleed ? { bleed: true } : {}) });
      break;
    case "revive":
      patch(ev.target, { hp: ev.hp, shield: 0, ko: false });
      pop({ unit: ev.target, kind: "revive" });
      break;
    case "resist":
      pop({ unit: ev.target, kind: "resist" });
      break;
    case "ko":
      // Une carte tombée perd ses états : le moteur ne les retire pas du journal
      patch(ev.target, { hp: 0, ko: true, exposed: false, weaken: false, elan: false, fx: [] });
      break;
    case "end":
      end = ev;
      break;
  }
  const pops = add.length ? [...state.pops, ...add].slice(-MAX_POPS) : state.pops;
  return { ...state, idx: state.idx + 1, info, units, cur, round, end, pops, popSeq };
}

/** Rejoue tout le journal d'un coup (bouton « fin », vérifications). */
export function replayAll(log: BattleEvent[]): Replay {
  let s = replayStart(log);
  while (s.idx < log.length) s = replayStep(s, log);
  return s;
}

/** Durée (ms, à vitesse ×1) pendant laquelle l'événement `log[i]` reste à l'écran avant le suivant. */
export function holdFor(log: BattleEvent[], i: number): number {
  const ev = log[i];
  const next = log[i + 1];
  switch (ev.kind) {
    case "start":
      return 900;
    case "round":
      return 450;
    case "action":
      // Le temps de l'élan vers la cible, avant l'impact
      return 480;
    case "ultimateGauge":
      return 30;
    case "skip":
      return 650;
    case "damage":
      if (next?.kind === "ko") return 150;
      // Zone : les coups s'enchaînent
      if (next?.kind === "damage") return 170;
      return ev.crit ? 520 : 400;
    case "dodge":
      return next?.kind === "damage" || next?.kind === "dodge" ? 170 : 400;
    case "heal":
      return next?.kind === "shield" ? 180 : 340;
    case "shield":
      // Bouclier du second joueur au départ, ou distribué à l'équipe par Cœur : tous d'un coup
      return next?.kind === "shield" ? 70 : 280;
    case "status":
      return 90;
    case "poison":
      return next?.kind === "ko" ? 150 : 340;
    case "revive":
      return 600;
    case "resist":
      return 300;
    case "ko":
      return 650;
    case "end":
      return 0;
  }
}
