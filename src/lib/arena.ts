// Arène live 4v4 (v0.3.0, docs/specs/pvp.md « Arène live ») : file d'attente par Elo, équipe fantôme après 30 s,
// chrono de 20 s par action, l'automatique joue à la place d'un joueur absent. Le serveur reste la seule source de vérité :
// graine + liste des actions des deux camps, comme le mode manuel du PvE.

import { prisma } from "./db";
import { eloChange } from "./duel-rules";
import { overBudget, budgetMessage } from "./team-budget";
import { charactersOf, teamSnapshot } from "./battles";
import {
  applyAction, autoAction, BATTLE, createBattle, currentActor, legalActions, seededRandom, timeline,
  type Action, type BattleCard, type BattleEvent, type BattleState, type Side, type Spell, type UnitId,
} from "./battle";
import type { Prisma } from "../generated/prisma/client";
import type { Rarity, CardType } from "../generated/prisma/enums";

export const ARENA_ACTION_MS = 20_000;
export const ARENA_GHOST_AFTER_MS = 30_000;
/** Un joueur absent n'est jamais déclaré forfait : l'automatique joue pour lui. Après 2 expirations de suite, son chrono tombe à 4 s pour ne pas faire attendre l'adversaire. */
export const ARENA_AWAY_AFTER = 2;
export const ARENA_AWAY_MS = 4_000;
const ELO_WINDOW = 150;
const ELO_WINDOW_STEP = 50;
const ELO_WINDOW_STEP_MS = 10_000;
const GHOST_LOSS_CAP = -16;
const REPEAT_WINDOW_MS = 24 * 60 * 60 * 1000;

export class ArenaError extends Error {}

const toJson = (x: unknown) => x as Prisma.InputJsonValue;
const isSpell = (x: unknown): x is Spell => x === "base" || x === "affinity" || x === "special" || x === "tertiary" || x === "ultimate";
const other = (s: Side): Side => (s === "A" ? "B" : "A");

/** Inverse les camps A et B d'un journal, d'un identifiant ou d'une table indexée par identifiant (vue du joueur B). */
export function swapSides<T>(value: T): T {
  const id = (s: string) => (s === "A" ? "B" : s === "B" ? "A" : /^[AB]\d/.test(s) ? (s[0] === "A" ? "B" : "A") + s.slice(1) : s);
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return id(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [id(k), walk(x)]));
    return v;
  };
  return walk(value) as T;
}

type Row = Prisma.ArenaMatchGetPayload<object>;

function buildState(row: Row): BattleState {
  const st = createBattle(row.teamA as unknown as BattleCard[], row.teamB as unknown as BattleCard[], seededRandom(row.seed), { gauge: true, elements: true });
  for (const action of row.actions as unknown as Action[]) applyAction(st, action);
  return st;
}

export function arenaMatchWindow(waitedMs: number) {
  return ELO_WINDOW + ELO_WINDOW_STEP * Math.floor(Math.max(0, waitedMs) / ELO_WINDOW_STEP_MS);
}

async function activeMatch(userId: string) {
  return prisma.arenaMatch.findFirst({
    where: { status: { in: ["QUEUED", "RUNNING"] }, OR: [{ playerAId: userId }, { playerBId: userId, ghost: false }] },
    orderBy: { createdAt: "desc" },
  });
}

/** Met le joueur en file avec son équipe d'attaque figée (ou renvoie son match en cours). */
export async function arenaEnqueue(userId: string, now = new Date()) {
  const current = await activeMatch(userId);
  if (current) return current.id;
  const team = await teamSnapshot(userId, "ATTACK");
  if (!team) throw new ArenaError("Ton équipe d'attaque doit compter 4 cartes.");
  const rarities = team.map((c) => c.rarity);
  if (overBudget(rarities)) throw new ArenaError(budgetMessage(rarities));
  const row = await prisma.arenaMatch.create({ data: { playerAId: userId, teamA: toJson(team), seed: Math.floor(Math.random() * 2 ** 31), createdAt: now } });
  return (await tryPair(row, now)) ?? row.id;
}

/** Cherche un adversaire en file dans la fenêtre d'Elo ; le premier trouvé est apparié (verrou : la ligne de l'autre doit être encore en file). */
async function tryPair(mine: Row, now: Date) {
  const me = await prisma.user.findUniqueOrThrow({ where: { id: mine.playerAId }, select: { elo: true } });
  const queued = await prisma.arenaMatch.findMany({
    where: { status: "QUEUED", id: { not: mine.id }, playerAId: { not: mine.playerAId } },
    orderBy: { createdAt: "asc" },
    take: 30,
    include: { playerA: { select: { elo: true } } },
  });
  for (const theirs of queued) {
    const waited = Math.max(now.getTime() - mine.createdAt.getTime(), now.getTime() - theirs.createdAt.getTime());
    if (Math.abs(theirs.playerA.elo - me.elo) > arenaMatchWindow(waited)) continue;
    try {
      await prisma.$transaction(async (tx) => {
        // Les deux lignes en file se réunissent en une seule : la mienne disparaît, la leur devient le match.
        const gone = await tx.arenaMatch.deleteMany({ where: { id: mine.id, status: "QUEUED" } });
        if (gone.count !== 1) throw new ArenaError("déjà apparié");
        const claimed = await tx.arenaMatch.updateMany({
          where: { id: theirs.id, status: "QUEUED" },
          data: { playerBId: mine.playerAId, teamB: mine.teamA as Prisma.InputJsonValue, status: "RUNNING", startedAt: now, deadline: new Date(now.getTime() + ARENA_ACTION_MS) },
        });
        if (claimed.count !== 1) throw new ArenaError("adversaire déjà pris");
      });
      return theirs.id;
    } catch (e) {
      if (e instanceof ArenaError) { if (e.message === "déjà apparié") return null; continue; }
      throw e;
    }
  }
  return null;
}

/** Équipe fantôme : défense d'un autre joueur proche en Elo, sinon son équipe d'attaque. */
async function pickGhost(mine: Row) {
  const me = await prisma.user.findUniqueOrThrow({ where: { id: mine.playerAId }, select: { elo: true } });
  for (const kind of ["DEFENSE", "ATTACK"] as const) {
    const candidates = await prisma.battleTeam.findMany({
      where: { kind, userId: { not: mine.playerAId } },
      select: { userId: true, user: { select: { elo: true } } },
      take: 200,
    });
    candidates.sort((a, b) => Math.abs(a.user.elo - me.elo) - Math.abs(b.user.elo - me.elo));
    for (const c of candidates.slice(0, 10)) {
      const team = await teamSnapshot(c.userId, kind);
      if (team && !overBudget(team.map((x) => x.rarity))) return { userId: c.userId, team };
    }
  }
  return null;
}

async function startGhost(mine: Row, now: Date) {
  const ghost = await pickGhost(mine);
  if (!ghost) return false;
  const res = await prisma.arenaMatch.updateMany({
    where: { id: mine.id, status: "QUEUED" },
    data: { ghost: true, playerBId: ghost.userId, teamB: toJson(ghost.team), status: "RUNNING", startedAt: now, deadline: new Date(now.getTime() + ARENA_ACTION_MS) },
  });
  return res.count === 1;
}

export async function arenaLeaveQueue(userId: string) {
  await prisma.arenaMatch.deleteMany({ where: { playerAId: userId, status: "QUEUED" } });
}

/** Joue les actions que personne ne choisira : fantôme, chrono expiré. Renvoie ce qui a été joué et l'éventuel forfait. */
function advance(st: BattleState, row: Row, now: Date) {
  const played: Action[] = [];
  const missed = { A: row.missedA, B: row.missedB };
  let deadline = row.deadline;
  const forfeit: Side | null = null;
  for (let actor = currentActor(st); actor && !st.result; actor = currentActor(st)) {
    const side = actor.id[0] as Side;
    if (row.ghost && side === "B") { const a = autoAction(st); applyAction(st, a); played.push(a); continue; }
    if (!deadline || deadline.getTime() > now.getTime()) break;
    missed[side]++;
    const a = autoAction(st);
    applyAction(st, a);
    played.push(a);
    deadline = new Date(now.getTime() + (missed[side] >= ARENA_AWAY_AFTER ? ARENA_AWAY_MS : ARENA_ACTION_MS));
  }
  return { played, missed, forfeit, deadline };
}

/** Chrono de la prochaine carte : 20 s, ou 4 s si son joueur est absent depuis deux actions. */
function nextDeadline(st: BattleState, missed: { A: number; B: number }, now: Date) {
  const next = currentActor(st);
  const away = next && missed[next.id[0] as Side] >= ARENA_AWAY_AFTER;
  return new Date(now.getTime() + (away ? ARENA_AWAY_MS : ARENA_ACTION_MS));
}

/** Écrit l'avancement (verrou sur `steps`) et, à la fin, le résultat et l'Elo dans la même transaction. */
async function commit(row: Row, st: BattleState, played: Action[], missed: { A: number; B: number }, forfeit: Side | null, now: Date) {
  const winner: Side | null | undefined = forfeit ? other(forfeit) : st.result ? st.result.winner : undefined;
  const finished = winner !== undefined;
  const turnChanged = played.length > 0;
  return prisma.$transaction(async (tx) => {
    const saved = await tx.arenaMatch.updateMany({
      where: { id: row.id, status: "RUNNING", steps: row.steps },
      data: {
        actions: toJson([...(row.actions as unknown as Action[]), ...played]),
        steps: row.steps + played.length,
        missedA: missed.A,
        missedB: missed.B,
        deadline: finished ? null : turnChanged ? nextDeadline(st, missed, now) : row.deadline,
        ...(finished ? { status: "DONE" as const, winner, endedAt: now } : {}),
      },
    });
    if (saved.count !== 1) return false;
    if (finished) await settleElo(tx, row, winner, now);
    return true;
  });
}

async function settleElo(tx: Prisma.TransactionClient, row: Row, winner: Side | null, now: Date) {
  const a = await tx.user.findUniqueOrThrow({ where: { id: row.playerAId }, select: { elo: true } });
  const b = row.playerBId ? await tx.user.findUnique({ where: { id: row.playerBId }, select: { elo: true } }) : null;
  const scoreA: 0 | 0.5 | 1 = winner === "A" ? 1 : winner === "B" ? 0 : 0.5;
  const bElo = b?.elo ?? a.elo;
  let dA = eloChange(a.elo, bElo, scoreA);
  let dB = eloChange(bElo, a.elo, (1 - scoreA) as 0 | 0.5 | 1);
  if (row.ghost) {
    dA = Math.round(dA / 2);
    if (dA < GHOST_LOSS_CAP) dA = GHOST_LOSS_CAP;
    dB = 0;
  } else if (row.playerBId) {
    const repeats = await tx.arenaMatch.count({
      where: {
        id: { not: row.id }, status: "DONE", endedAt: { gt: new Date(now.getTime() - REPEAT_WINDOW_MS) }, ghost: false,
        OR: [{ playerAId: row.playerAId, playerBId: row.playerBId }, { playerAId: row.playerBId, playerBId: row.playerAId }],
      },
    });
    if (repeats > 0) { if (dA > 0) dA = Math.round(dA / 2); if (dB > 0) dB = Math.round(dB / 2); }
  }
  await tx.arenaMatch.update({ where: { id: row.id }, data: { eloA: a.elo, eloB: b?.elo ?? null, eloChangeA: dA, eloChangeB: row.ghost ? null : b ? dB : null } });
  if (dA) await tx.user.update({ where: { id: row.playerAId }, data: { elo: { increment: dA } } });
  if (b && !row.ghost && dB) await tx.user.update({ where: { id: row.playerBId! }, data: { elo: { increment: dB } } });
}

/** Fait avancer un match en cours (fantôme, expirations) jusqu'à un état stable. Recharge la ligne si un autre appel a joué entre-temps. */
async function settle(matchId: string, now: Date): Promise<Row> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await prisma.arenaMatch.findUniqueOrThrow({ where: { id: matchId } });
    if (row.status === "QUEUED") {
      if (now.getTime() - row.createdAt.getTime() >= ARENA_GHOST_AFTER_MS) await startGhost(row, now);
      else await tryPair(row, now);
      return prisma.arenaMatch.findUniqueOrThrow({ where: { id: matchId } });
    }
    if (row.status !== "RUNNING") return row;
    const st = buildState(row);
    const { played, missed, forfeit } = advance(st, row, now);
    if (!played.length && !forfeit && !st.result) return row;
    if (await commit(row, st, played, missed, forfeit, now)) return prisma.arenaMatch.findUniqueOrThrow({ where: { id: matchId } });
  }
  return prisma.arenaMatch.findUniqueOrThrow({ where: { id: matchId } });
}

export interface ArenaView {
  id: string;
  status: "QUEUED" | "RUNNING" | "DONE" | "ABANDONED";
  /** Actions enregistrées : sert de verrou et de version du choix affiché. */
  steps: number;
  /** Début de la recherche, pour afficher l'attente */
  queuedAt: string;
  /** Fin du chrono de l'action en cours, et heure du serveur pour corriger l'écart d'horloge */
  deadline: string | null;
  serverNow: string;
  me: { name: string; elo: number };
  opponent: { name: string; elo: number } | null;
  /** Vu du joueur : A est toujours lui */
  winner: Side | null;
  /** Variation d'Elo du joueur à la fin du match */
  eloChange: number | null;
  log: BattleEvent[];
  actor: UnitId | null;
  /** Vrai quand c'est à ce joueur de choisir */
  myTurn: boolean;
  choices: { spell: Spell; targets: (UnitId | null)[] }[];
  wait: Record<string, number>;
  timeline: UnitId[];
  characters: Record<number, { name: string; imageUrl: string; rarity: Rarity; type: CardType }>;
}

async function viewOf(row: Row, userId: string, from: number, now: Date): Promise<ArenaView> {
  const mySide: Side = row.playerAId === userId ? "A" : "B";
  const flip = mySide === "B";
  const mine = <T,>(x: T): T => (flip ? swapSides(x) : x);
  const names = await prisma.user.findMany({ where: { id: { in: [row.playerAId, ...(row.playerBId ? [row.playerBId] : [])] } }, select: { id: true, username: true, name: true, elo: true } });
  const who = (id: string | null, elo: number | null) => {
    const u = names.find((n) => n.id === id);
    return u ? { name: u.username ?? u.name, elo: elo ?? u.elo } : null;
  };
  const meUser = who(userId, mySide === "A" ? row.eloA : row.eloB) ?? { name: "Toi", elo: 1000 };
  const opId = mySide === "A" ? row.playerBId : row.playerAId;
  const opponent = row.status === "QUEUED" ? null : who(opId, mySide === "A" ? row.eloB : row.eloA);
  const base = { id: row.id, status: row.status, steps: row.steps, queuedAt: row.createdAt.toISOString(), serverNow: now.toISOString(), me: meUser, opponent };
  if (row.status === "QUEUED") return { ...base, deadline: null, winner: null, eloChange: null, log: [], actor: null, myTurn: false, choices: [], wait: {}, timeline: [], characters: {} };
  const st = buildState(row);
  // Forfait ou abandon : le moteur n'a pas écrit de fin, on l'ajoute pour que l'écran affiche le résultat
  let fullLog: BattleEvent[] = st.log;
  if (row.status === "DONE" && !st.result) {
    const hp = (side: Side) => st.teams[side].reduce((n, u) => n + u.hp, 0) / st.teams[side].reduce((n, u) => n + u.maxHp, 0);
    fullLog = [...st.log, { kind: "end", winner: (row.winner as Side | null) ?? null, reason: "ko", rounds: st.round, hpLeft: { A: hp("A"), B: hp("B") } }];
  }
  const running = row.status === "RUNNING" && !st.result;
  const actor = running ? currentActor(st) : null;
  const myTurn = !!actor && actor.id[0] === mySide;
  const winnerEngine = (row.winner as Side | null) ?? null;
  const waitAll = running
    ? Object.fromEntries((["A", "B"] as const).flatMap((side) => st.teams[side].flatMap((u) => [
        [u.id, Math.max(0, u.spellIn - (u.continuingTurn ? 0 : 1))],
        [`${u.id}:special`, Math.max(0, u.pIn - (u.continuingTurn ? 0 : 1))],
        [`${u.id}:tertiary`, Math.max(0, u.tIn - (u.continuingTurn ? 0 : 1))],
        [`${u.id}:ultimate`, Math.max(0, BATTLE.ultimateGaugeMax - u.ultimateGauge)],
      ])))
    : {};
  return {
    ...base,
    deadline: running && row.deadline ? row.deadline.toISOString() : null,
    winner: row.status === "DONE" ? mine(winnerEngine) : null,
    eloChange: row.status === "DONE" ? (mySide === "A" ? row.eloChangeA : row.eloChangeB) : null,
    log: mine(fullLog.slice(from)),
    actor: actor ? mine(actor.id) : null,
    myTurn,
    choices: myTurn ? mine(legalActions(st)) : [],
    wait: mine(waitAll),
    timeline: running ? mine(timeline(st, 5)) : [],
    characters: await charactersOf({ A: row.teamA as unknown as BattleCard[], B: (row.teamB ?? []) as unknown as BattleCard[] }),
  };
}

/** État du match du joueur (le fait avancer si besoin). `from` : nombre d'événements du journal déjà reçus. */
export async function arenaState(userId: string, from = 0, now = new Date()): Promise<ArenaView | null> {
  const current = await activeMatch(userId);
  if (!current) return null;
  const row = await settle(current.id, now);
  return viewOf(row, userId, row.status === "QUEUED" ? 0 : from, now);
}

export async function arenaView(userId: string, matchId: string, from = 0, now = new Date()): Promise<ArenaView> {
  const found = await prisma.arenaMatch.findFirst({ where: { id: matchId, OR: [{ playerAId: userId }, { playerBId: userId, ghost: false }] } });
  if (!found) throw new ArenaError("Match introuvable.");
  const row = await settle(found.id, now);
  return viewOf(row, userId, row.status === "QUEUED" ? 0 : from, now);
}

/** Le joueur choisit sort et cible pour la carte qui agit. Les identifiants sont ceux de sa vue (lui en A). */
export async function arenaPlay(userId: string, matchId: string, action: { spell: Spell; target: UnitId | null }, expectedSteps: number, from = 0, now = new Date()): Promise<ArenaView> {
  if (!isSpell(action?.spell) || (action.target !== null && typeof action.target !== "string")) throw new ArenaError("Action invalide.");
  const found = await prisma.arenaMatch.findFirst({ where: { id: matchId, OR: [{ playerAId: userId }, { playerBId: userId, ghost: false }] } });
  if (!found) throw new ArenaError("Match introuvable.");
  const mySide: Side = found.playerAId === userId ? "A" : "B";
  const row = await settle(found.id, now);
  if (row.status !== "RUNNING") throw new ArenaError("Ce match est terminé.");
  if (!Number.isSafeInteger(expectedSteps) || row.steps !== expectedSteps) throw new ArenaError("Action déjà jouée, recharge le match.");
  const st = buildState(row);
  const actor = currentActor(st);
  if (!actor || actor.id[0] !== mySide) throw new ArenaError("Ce n'est pas ton tour.");
  const chosen: Action = mySide === "B"
    ? { spell: action.spell, target: action.target === null ? null : (swapSides(action.target) as UnitId) }
    : { spell: action.spell, target: action.target };
  try { applyAction(st, chosen); } catch { throw new ArenaError("Action impossible."); }
  const played = [chosen];
  // Les actions du fantôme suivent immédiatement ; un nouveau chrono démarre pour la carte suivante
  const missed = { ...{ A: row.missedA, B: row.missedB }, [mySide]: 0 };
  const follow = advance(st, { ...row, missedA: missed.A, missedB: missed.B, deadline: new Date(now.getTime() + ARENA_ACTION_MS) }, now);
  played.push(...follow.played);
  const forfeit = follow.forfeit;
  if (!(await commit(row, st, played, follow.missed, forfeit, now))) throw new ArenaError("Action déjà jouée, recharge le match.");
  return arenaView(userId, matchId, from, now);
}

/** Abandon : défaite immédiate. */
export async function arenaForfeit(userId: string, matchId: string, now = new Date()) {
  const found = await prisma.arenaMatch.findFirst({ where: { id: matchId, OR: [{ playerAId: userId }, { playerBId: userId, ghost: false }] } });
  if (!found) throw new ArenaError("Match introuvable.");
  if (found.status === "QUEUED") { await arenaLeaveQueue(userId); return; }
  const row = await settle(found.id, now);
  if (row.status !== "RUNNING") return;
  const mySide: Side = row.playerAId === userId ? "A" : "B";
  const st = buildState(row);
  if (!(await commit(row, st, [], { A: row.missedA, B: row.missedB }, mySide, now))) throw new ArenaError("Le match vient de changer, réessaie.");
}
