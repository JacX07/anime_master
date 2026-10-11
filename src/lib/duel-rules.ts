// Règles des duels (SPEC étape 4, §3 à §5) : pures, sans accès à la base.

import type { CardType } from "../generated/prisma/enums";

// ---------- Délais et limites ----------

/** Délais raccourcis pour les tests en local : DUEL_FAST_DELAYS=1 (5 min pour accepter, 10 min pour jouer). */
const FAST = process.env.DUEL_FAST_DELAYS === "1";
export const DUEL_ACCEPT_MS = FAST ? 5 * 60_000 : 24 * 60 * 60_000;
export const DUEL_PLAY_MS = FAST ? 10 * 60_000 : 48 * 60 * 60_000;
export const DUELS_PER_DAY = 5;
export const REWARDED_DUELS_PER_OPPONENT = 2;
export const TEAM_SIZE = 3;

export const DUEL_REWARDS = { win: 30, draw: 15, loss: 10, forfeitWin: 30, forfeitLoss: 0 } as const;

// ---------- Quiz ----------

export const QUESTIONS_PER_CARD = 4;
/** Tolérance réseau sur le chrono, vérifié côté serveur. */
export const ANSWER_GRACE_MS = 2000;
export const quizFormat = (type: CardType) => (type === "MYSTERE" ? { choices: 5, seconds: 10 } : { choices: 4, seconds: 15 });

// ---------- Combat ----------

export interface Fighter {
  characterId: number;
  type: CardType;
  attack: number;
  defense: number;
}

/** Stats après modificateurs de type et bonus Cœur, arrondies à l'entier. */
export interface Modified extends Fighter {
  atk: number;
  def: number;
}

const ATK_MOD: Record<CardType, number> = { COMBAT: 1, MYSTERE: 0.75, MAGIE: 0.85, COEUR: 0.7, AVENTURE: 1 };
const DEF_MOD: Record<CardType, number> = { COMBAT: 0.75, MYSTERE: 1, MAGIE: 1, COEUR: 1.3, AVENTURE: 1 };

/** Modificateurs de type, puis +10 % d'ATK par autre carte Cœur de l'équipe (+20 % maximum). */
export function modifyTeam(team: Fighter[]): Modified[] {
  return team.map((f, i) => {
    const otherHearts = team.filter((o, j) => j !== i && o.type === "COEUR").length;
    const bonus = Math.min(0.2, 0.1 * otherHearts);
    return { ...f, atk: Math.round(f.attack * ATK_MOD[f.type] * (1 + bonus)), def: Math.round(f.defense * DEF_MOD[f.type]) };
  });
}

/** Dégâts d'une attaque selon le nombre d'erreurs du défenseur sur cette carte. */
export function attackDamage(type: CardType, atk: number, errors: number, questions = QUESTIONS_PER_CARD) {
  let dmg = atk * (errors / questions);
  if (type === "COMBAT" && errors === questions) dmg *= 2;
  if (type === "AVENTURE") dmg = Math.min(Math.max(dmg, atk * 0.25), atk * 0.75);
  return Math.round(dmg);
}

export type Side = "A" | "B";

export interface Turn {
  side: Side;
  /** 1 à 3 */
  position: number;
  characterId: number;
  type: CardType;
  atk: number;
  errors: number;
  damage: number;
  heal: number;
  hpA: number;
  hpB: number;
}

export interface CombatResult {
  teamA: Modified[];
  teamB: Modified[];
  maxA: number;
  maxB: number;
  turns: Turn[];
  hpA: number;
  hpB: number;
  /** null = match nul */
  winner: Side | null;
}

/**
 * Combat : A1, B1, A2, B2, A3, B3 (le challenger A attaque en premier).
 * `errorsOnA[k]` = erreurs de B sur la carte k de A (et inversement).
 */
export function resolveCombat(a: Fighter[], b: Fighter[], errorsOnA: number[], errorsOnB: number[]): CombatResult {
  const teamA = modifyTeam(a);
  const teamB = modifyTeam(b);
  const maxA = teamA.reduce((s, f) => s + f.def, 0);
  const maxB = teamB.reduce((s, f) => s + f.def, 0);
  let hpA = maxA;
  let hpB = maxB;
  const turns: Turn[] = [];
  for (let k = 0; k < Math.max(teamA.length, teamB.length); k++) {
    for (const side of ["A", "B"] as const) {
      const f = (side === "A" ? teamA : teamB)[k];
      if (!f) continue;
      const errors = (side === "A" ? errorsOnA : errorsOnB)[k] ?? QUESTIONS_PER_CARD;
      const raw = attackDamage(f.type, f.atk, errors);
      const damage = Math.min(raw, side === "A" ? hpB : hpA);
      let heal = 0;
      if (side === "A") {
        hpB -= damage;
        if (f.type === "MAGIE") heal = Math.min(Math.round(damage * 0.3), maxA - hpA);
        hpA += heal;
      } else {
        hpA -= damage;
        if (f.type === "MAGIE") heal = Math.min(Math.round(damage * 0.3), maxB - hpB);
        hpB += heal;
      }
      turns.push({ side, position: k + 1, characterId: f.characterId, type: f.type, atk: f.atk, errors, damage, heal, hpA, hpB });
      if (hpA === 0 || hpB === 0) return { teamA, teamB, maxA, maxB, turns, hpA, hpB, winner: hpA === 0 ? "B" : "A" };
    }
  }
  // Pourcentages de PV restants comparés sans arrondi : hpA / maxA contre hpB / maxB
  const cmp = hpA * maxB - hpB * maxA;
  return { teamA, teamB, maxA, maxB, turns, hpA, hpB, winner: cmp === 0 ? null : cmp > 0 ? "A" : "B" };
}

// ---------- Elo ----------

export const ELO_START = 1000;
export const ELO_K = 32;

/** Variation d'Elo d'un joueur ; `score` = 1 victoire, 0,5 nul, 0 défaite (forfait compris). */
export function eloChange(elo: number, opponentElo: number, score: 0 | 0.5 | 1) {
  const expected = 1 / (1 + 10 ** ((opponentElo - elo) / 400));
  return Math.round(ELO_K * (score - expected));
}
