// Rejeu d'un journal de combat (docs/specs/combat.md §9) : pur, sans React ni base.
// replayStep() applique un événement à l'état affiché ; holdFor() dit combien de temps l'afficher avant le suivant.
// L'état ne contient que ce que l'écran montre (PV, boucliers, états, K.O.) et la liste des « pops » (nombres, effets) à animer.

import type { CardType } from "../generated/prisma/enums";
import type { BattleEvent, Side, Spell, UnitId, UnitView } from "./battle";

export interface UnitState {
  hp: number;
  shield: number;
  ko: boolean;
  exposed: boolean;
  weaken: boolean;
  elan: boolean;
}

/** Élément éphémère posé sur une carte : nombre flottant, effet de type, étiquette d'état. */
export type Pop =
  | { id: number; unit: UnitId; kind: "damage"; amount: number; absorbed: number; crit: boolean; affinity: "strong" | "weak" | null; exposedBonus: boolean }
  | { id: number; unit: UnitId; kind: "dodge" }
  | { id: number; unit: UnitId; kind: "heal"; amount: number }
  | { id: number; unit: UnitId; kind: "shield"; amount: number }
  | { id: number; unit: UnitId; kind: "status"; status: "exposed" | "weaken" | "elan"; on: boolean }
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
  cur: { n: number; actor: UnitId; spell: Spell; target: UnitId | null; type: CardType } | null;
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

const MAX_POPS = 40;

export function replayStart(log: BattleEvent[]): Replay {
  const start = log[0];
  if (start?.kind !== "start") throw new Error("Le journal doit commencer par « start »");
  const info = {} as Record<UnitId, UnitView>;
  const units = {} as Record<UnitId, UnitState>;
  for (const u of start.units) {
    info[u.id] = u;
    units[u.id] = { hp: u.hp, shield: u.shield, ko: false, exposed: false, weaken: false, elan: false };
  }
  return { idx: 1, info, units, first: start.first, round: 0, cur: null, pops: [], popSeq: 0, end: null };
}

/** Applique l'événement `log[state.idx]` et renvoie le nouvel état. */
export function replayStep(state: Replay, log: BattleEvent[]): Replay {
  const ev = log[state.idx];
  if (!ev) return state;
  const units = { ...state.units };
  const patch = (id: UnitId, p: Partial<UnitState>) => (units[id] = { ...units[id], ...p });
  let { cur, round, end, popSeq } = state;
  const add: Pop[] = [];
  const pop = (p: NewPop) => add.push({ ...p, id: ++popSeq } as Pop);

  switch (ev.kind) {
    case "round":
      round = ev.round;
      break;
    case "action":
      cur = { n: (state.cur?.n ?? 0) + 1, actor: ev.actor, spell: ev.spell, target: ev.target, type: state.info[ev.actor].type };
      break;
    case "damage":
      patch(ev.target, { hp: ev.hp, shield: ev.shield });
      pop({ unit: ev.target, kind: "fx", fx: cur?.spell === "affinity" ? cur.type : "base", big: cur?.spell === "affinity" });
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
      patch(ev.target, { [ev.status]: ev.on });
      pop({ unit: ev.target, kind: "status", status: ev.status, on: ev.on });
      break;
    case "ko":
      // Une carte tombée perd ses états : le moteur ne les retire pas du journal
      patch(ev.target, { hp: 0, ko: true, exposed: false, weaken: false, elan: false });
      break;
    case "end":
      end = ev;
      break;
  }
  const pops = add.length ? [...state.pops, ...add].slice(-MAX_POPS) : state.pops;
  return { ...state, idx: state.idx + 1, units, cur, round, end, pops, popSeq };
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
    case "ko":
      return 650;
    case "end":
      return 0;
  }
}
