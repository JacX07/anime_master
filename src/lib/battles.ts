// Combats 4 contre 4 côté serveur (docs/specs/combat.md §10) : équipe d'attaque enregistrée, lancement, mode manuel, abandon.
// Le moteur (battle.ts) est pur ; ici on lit les cartes, on enregistre le combat et on rejoue l'état à chaque action.
// Mode manuel : seul le camp A (le joueur) est choisi ; le camp B joue avec la stratégie automatique. L'état n'est jamais
// gardé en mémoire : il se recalcule depuis la copie des cartes, la graine et les choix enregistrés.

import type { BattleMode, CardType, Rarity } from "../generated/prisma/enums";
import type { Prisma } from "../generated/prisma/client";
import {
  applyAction, autoAction, battle, createBattle, currentActor, legalActions, seededRandom,
  type Action, type BattleCard, type BattleEvent, type BattleState, type Side, type Spell, type UnitId,
} from "./battle";
import { prisma } from "./db";

export class BattleError extends Error {}

/** Un combat manuel resté ouvert plus longtemps est abandonné (compté comme perdu). */
export const ABANDON_AFTER_MS = 24 * 60 * 60 * 1000;

/** Ennemis PvM définis dans le code. Chaque carte est le personnage le plus aimé de cette rareté et de ce type. */
export const PVM_OPPONENTS: Record<string, { name: string; cards: { rarity: Rarity; type: CardType }[] }> = {
  test: {
    name: "Équipe d'essai",
    cards: [
      { rarity: "SR", type: "COMBAT" },
      { rarity: "SR", type: "MYSTERE" },
      { rarity: "SR", type: "MAGIE" },
      { rarity: "SR", type: "COEUR" },
    ],
  },
};

const CHARACTER_SELECT = {
  id: true, rarity: true, type: true, attack: true, defense: true, power: true, mainMediaId: true,
  mainMedia: { select: { franchiseId: true } },
} as const;
type CharacterRow = Prisma.CharacterGetPayload<{ select: typeof CHARACTER_SELECT }>;

const toBattleCard = (c: CharacterRow, stars = 0): BattleCard => ({
  characterId: c.id, rarity: c.rarity, type: c.type, attack: c.attack, defense: c.defense, power: c.power,
  franchiseId: c.mainMedia?.franchiseId ?? c.mainMediaId, stars, weapon: null,
});

async function opponentCards(key: string): Promise<BattleCard[]> {
  const def = PVM_OPPONENTS[key];
  if (!def) throw new BattleError("Adversaire inconnu.");
  const cards: BattleCard[] = [];
  for (const spec of def.cards) {
    const c = await prisma.character.findFirst({
      where: { ...spec, disabled: false, id: { notIn: cards.map((x) => x.characterId) } },
      orderBy: [{ favourites: "desc" }, { id: "asc" }],
      select: CHARACTER_SELECT,
    });
    if (!c) throw new BattleError("Adversaire introuvable.");
    cards.push(toBattleCard(c));
  }
  return cards;
}

// ── Équipe d'attaque ────────────────────────────────────────────────────────

/** Enregistre l'équipe d'attaque : 4 cartes différentes du joueur, dans l'ordre des positions. */
export async function setAttackTeam(userId: string, cardIds: string[]) {
  const ids = [...new Set(cardIds)];
  if (ids.length !== 4 || cardIds.length !== 4) throw new BattleError("Choisis 4 cartes différentes.");
  const owned = await prisma.card.count({ where: { id: { in: ids }, ownerId: userId } });
  if (owned !== 4) throw new BattleError("Une des cartes ne t'appartient pas.");
  await prisma.$transaction(async (tx) => {
    const team = await tx.battleTeam.upsert({
      where: { userId_kind: { userId, kind: "ATTACK" } },
      create: { userId, kind: "ATTACK" },
      update: {},
      select: { id: true },
    });
    await tx.battleTeamSlot.deleteMany({ where: { teamId: team.id } });
    await tx.battleTeamSlot.createMany({ data: ids.map((cardId, i) => ({ teamId: team.id, position: i + 1, cardId })) });
  });
}

/** Équipe d'attaque, positions 1 à 4 (null = vide). Les cartes qui ont changé de main sont retirées. */
export async function getAttackTeam(userId: string) {
  const team = await prisma.battleTeam.findUnique({
    where: { userId_kind: { userId, kind: "ATTACK" } },
    select: {
      id: true,
      slots: {
        orderBy: { position: "asc" },
        select: { position: true, card: { select: { id: true, ownerId: true, stars: true, finish: true, character: { select: { ...CHARACTER_SELECT, name: true, imageUrl: true } } } } },
      },
    },
  });
  if (!team) return [null, null, null, null];
  const gone = team.slots.filter((s) => s.card.ownerId !== userId);
  if (gone.length) await prisma.battleTeamSlot.deleteMany({ where: { teamId: team.id, position: { in: gone.map((s) => s.position) } } });
  const slots: ((typeof team.slots)[number]["card"] | null)[] = [null, null, null, null];
  for (const s of team.slots) if (s.card.ownerId === userId) slots[s.position - 1] = s.card;
  return slots;
}

// ── Combats ─────────────────────────────────────────────────────────────────

export interface BattleTeams {
  A: BattleCard[];
  B: BattleCard[];
}

/** Ce que le navigateur reçoit : le journal (complet ou depuis le dernier envoi) et, en manuel, les choix possibles. */
export interface BattleView {
  id: string;
  mode: BattleMode;
  opponent: string;
  manual: boolean;
  status: "RUNNING" | "DONE" | "ABANDONED";
  winner: Side | null;
  log: BattleEvent[];
  /** Carte du joueur qui doit agir (mode manuel, combat en cours) */
  actor: UnitId | null;
  choices: { spell: Spell; targets: (UnitId | null)[] }[];
  /** Nom et image des 8 personnages, pour l'affichage */
  characters: Record<number, { name: string; imageUrl: string }>;
}

/** Rejoue un combat manuel : choix enregistrés pour A, stratégie automatique pour B, jusqu'au prochain choix de A. */
function replay(teams: BattleTeams, seed: number, actions: Action[]): BattleState {
  const st = createBattle(teams.A, teams.B, seededRandom(seed));
  let next = 0;
  for (let actor = currentActor(st); actor; actor = currentActor(st)) {
    if (actor.id.startsWith("A")) {
      if (next >= actions.length) break;
      applyAction(st, actions[next++]);
    } else applyAction(st, autoAction(st));
  }
  if (next !== actions.length) throw new Error("Combat enregistré incohérent");
  return st;
}

async function charactersOf(teams: BattleTeams) {
  const ids = [...teams.A, ...teams.B].map((c) => c.characterId);
  const rows = await prisma.character.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, imageUrl: true } });
  return Object.fromEntries(rows.map((r) => [r.id, { name: r.name, imageUrl: r.imageUrl }]));
}

type BattleRow = Prisma.BattleGetPayload<object>;

async function toView(row: BattleRow, st: BattleState | null, from = 0): Promise<BattleView> {
  const teams = row.teams as unknown as BattleTeams;
  const log = st ? st.log : ((row.log ?? []) as unknown as BattleEvent[]);
  const running = row.status === "RUNNING" && st && !st.result;
  return {
    id: row.id, mode: row.mode, opponent: row.opponent, manual: row.manual, status: st?.result ? "DONE" : row.status,
    winner: (st?.result ? st.result.winner : (row.winner as Side | null)) ?? null,
    log: log.slice(from),
    actor: running ? currentActor(st)!.id : null,
    choices: running ? legalActions(st) : [],
    characters: await charactersOf(teams),
  };
}

/** Abandonne les combats manuels restés ouverts trop longtemps (balayage paresseux). */
export async function sweepBattles(now = new Date()) {
  await prisma.battle.updateMany({
    where: { status: "RUNNING", createdAt: { lt: new Date(now.getTime() - ABANDON_AFTER_MS) } },
    data: { status: "ABANDONED", winner: "B", endedAt: now },
  });
}

/** Lance un combat avec l'équipe d'attaque du joueur. Automatique : calculé en entier. Manuel : un seul en cours à la fois. */
export async function startBattle(userId: string, opponent: string, manual: boolean, now = new Date()): Promise<BattleView> {
  await sweepBattles(now);
  const slots = await getAttackTeam(userId);
  if (slots.some((s) => !s)) throw new BattleError("Ton équipe d'attaque doit compter 4 cartes.");
  if (manual && (await prisma.battle.count({ where: { userId, manual: true, status: "RUNNING" } })))
    throw new BattleError("Tu as déjà un combat en cours : termine-le ou abandonne-le.");
  const teams: BattleTeams = { A: slots.map((s) => toBattleCard(s!.character, s!.stars)), B: await opponentCards(opponent) };
  const seed = Math.floor(Math.random() * 2 ** 31);
  if (!manual) {
    const result = battle(teams.A, teams.B, seededRandom(seed));
    const row = await prisma.battle.create({
      data: {
        userId, mode: "TEST", opponent, manual, seed, teams: teams as unknown as Prisma.InputJsonValue,
        status: "DONE", winner: result.winner, log: result.log as unknown as Prisma.InputJsonValue, endedAt: now,
      },
    });
    return toView(row, null);
  }
  const row = await prisma.battle.create({ data: { userId, mode: "TEST", opponent, manual, seed, teams: teams as unknown as Prisma.InputJsonValue } });
  return toView(row, replay(teams, seed, []));
}

/** Combat du joueur, pour l'affichage ou le replay. */
export async function getBattle(userId: string, battleId: string): Promise<BattleView> {
  await sweepBattles();
  const row = await prisma.battle.findFirst({ where: { id: battleId, userId } });
  if (!row) throw new BattleError("Combat introuvable.");
  if (row.status !== "RUNNING") return toView(row, null);
  return toView(row, replay(row.teams as unknown as BattleTeams, row.seed, row.actions as unknown as Action[]));
}

const isSpell = (x: unknown): x is Spell => x === "base" || x === "affinity";

/** Mode manuel : joue le choix du joueur, puis les cartes adverses, jusqu'au prochain choix. Renvoie les nouveaux événements. */
export async function playAction(userId: string, battleId: string, action: Action, now = new Date()): Promise<BattleView> {
  if (!isSpell(action?.spell) || (action.target !== null && typeof action.target !== "string")) throw new BattleError("Action invalide.");
  await sweepBattles(now);
  const row = await prisma.battle.findFirst({ where: { id: battleId, userId, manual: true } });
  if (!row) throw new BattleError("Combat introuvable.");
  if (row.status !== "RUNNING") throw new BattleError("Ce combat est terminé.");
  const teams = row.teams as unknown as BattleTeams;
  const actions = row.actions as unknown as Action[];
  const st = replay(teams, row.seed, actions);
  const from = st.log.length;
  try {
    applyAction(st, { spell: action.spell, target: action.target });
  } catch {
    throw new BattleError("Action impossible.");
  }
  for (let actor = currentActor(st); actor && actor.id.startsWith("B"); actor = currentActor(st)) applyAction(st, autoAction(st));
  const done = st.result;
  // Verrou : l'écriture n'a lieu que si personne n'a joué entre-temps
  const saved = await prisma.battle.updateMany({
    where: { id: row.id, status: "RUNNING", steps: row.steps },
    data: {
      actions: [...actions, { spell: action.spell, target: action.target }] as unknown as Prisma.InputJsonValue,
      steps: row.steps + 1,
      ...(done ? { status: "DONE", winner: done.winner, log: done.log as unknown as Prisma.InputJsonValue, endedAt: now } : {}),
    },
  });
  if (saved.count !== 1) throw new BattleError("Action déjà jouée, recharge le combat.");
  return toView({ ...row, status: done ? "DONE" : "RUNNING" }, st, from);
}

/** Abandon d'un combat manuel en cours : compté comme perdu. */
export async function abandonBattle(userId: string, battleId: string, now = new Date()) {
  const res = await prisma.battle.updateMany({
    where: { id: battleId, userId, status: "RUNNING" },
    data: { status: "ABANDONED", winner: "B", endedAt: now },
  });
  if (res.count !== 1) throw new BattleError("Combat introuvable ou déjà terminé.");
}
