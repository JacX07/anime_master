// Duels asynchrones (SPEC étape 4, §1 à §4). Les délais sont appliqués paresseusement (`sweepDuels`, à chaque consultation).
// Chaque changement d'état est un passage conditionnel (updateMany sur le statut) : un double clic ne l'exécute jamais deux fois.

import type { Prisma } from "../generated/prisma/client";
import type { CardType, Rarity } from "../generated/prisma/enums";
import { checkAchievementsSafe } from "./achievements";
import { prisma } from "./db";
import { generateQuestions, type QuestionPrompt } from "./duel-quiz";
import {
  ANSWER_GRACE_MS,
  DUEL_ACCEPT_MS,
  DUEL_PLAY_MS,
  DUEL_REWARDS,
  DUELS_PER_DAY,
  eloChange,
  QUESTIONS_PER_CARD,
  quizFormat,
  resolveCombat,
  REWARDED_DUELS_PER_OPPONENT,
  TEAM_SIZE,
  type CombatResult,
} from "./duel-rules";
import { startOfDay, tradeEligibility } from "./economy";
import { notify } from "./notifications";

export class DuelError extends Error {}

type Tx = Prisma.TransactionClient;

export const duelsLeft = (startedToday: number, startedDate: Date | null, now: Date) =>
  Math.max(0, DUELS_PER_DAY - (startedDate && startedDate >= startOfDay(now) ? startedToday : 0));

async function eligibility(userId: string, now: Date) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { createdAt: true, _count: { select: { packOpenings: true } } } });
  return tradeEligibility(u.createdAt, u._count.packOpenings, now);
}

/** 3 cartes distinctes du joueur, dans l'ordre d'attaque, avec l'instantané de leurs stats. */
async function teamSnapshot(userId: string, cardIds: string[]) {
  if (cardIds.length !== TEAM_SIZE) throw new DuelError(`Choisis exactement ${TEAM_SIZE} cartes.`);
  if (new Set(cardIds).size !== TEAM_SIZE) throw new DuelError("Une même carte ne peut pas apparaître deux fois.");
  const cards = await prisma.card.findMany({ where: { id: { in: cardIds }, ownerId: userId }, select: { id: true, character: { select: { id: true, type: true, attack: true, defense: true } } } });
  if (cards.length !== TEAM_SIZE) throw new DuelError("Une des cartes choisies ne t'appartient plus.");
  return cardIds.map((id, i) => {
    const c = cards.find((x) => x.id === id)!.character;
    return { userId, position: i + 1, cardId: id, characterId: c.id, type: c.type, attack: c.attack, defense: c.defense };
  });
}

// ---------- Défi, acceptation, refus ----------

export async function createDuel(challengerId: string, opponentUsername: string, cardIds: string[], now = new Date()) {
  const opponent = await prisma.user.findUnique({ where: { username: opponentUsername.trim().toLowerCase() }, select: { id: true } });
  if (!opponent) throw new DuelError("Joueur introuvable.");
  if (opponent.id === challengerId) throw new DuelError("Tu ne peux pas te défier toi-même.");
  const [mine, theirs] = await Promise.all([eligibility(challengerId, now), eligibility(opponent.id, now)]);
  if (!mine.ok) throw new DuelError(`Tu ne peux pas encore jouer en duel : ${mine.reason}.`);
  if (!theirs.ok) throw new DuelError(`${opponentUsername} ne peut pas encore jouer en duel : ${theirs.reason}.`);
  const slots = await teamSnapshot(challengerId, cardIds);

  return prisma.$transaction(async (tx) => {
    const me = await tx.user.findUniqueOrThrow({ where: { id: challengerId }, select: { username: true, duelsStartedToday: true, duelsStartedDate: true } });
    const today = startOfDay(now);
    const sameDay = me.duelsStartedDate !== null && me.duelsStartedDate >= today;
    if (duelsLeft(me.duelsStartedToday, me.duelsStartedDate, now) === 0) throw new DuelError(`Tu as déjà lancé ${DUELS_PER_DAY} duels aujourd'hui.`);
    // Compteur conditionnel : deux défis simultanés ne dépassent jamais la limite
    const r = await tx.user.updateMany({
      where: sameDay ? { id: challengerId, duelsStartedToday: me.duelsStartedToday } : { id: challengerId },
      data: { duelsStartedToday: sameDay ? { increment: 1 } : 1, duelsStartedDate: now },
    });
    if (r.count !== 1) throw new DuelError("Réessaie dans un instant.");
    const duel = await tx.duel.create({
      data: { challengerId, opponentId: opponent.id, acceptDeadline: new Date(now.getTime() + DUEL_ACCEPT_MS), slots: { create: slots } },
      select: { id: true },
    });
    await notify(tx, opponent.id, "DUEL_RECEIVED", { duelId: duel.id, username: me.username });
    return duel.id;
  });
}

export async function acceptDuel(userId: string, duelId: string, cardIds: string[], now = new Date()) {
  await sweepDuels(now);
  const slots = await teamSnapshot(userId, cardIds);
  await prisma.$transaction(async (tx) => {
    const r = await tx.duel.updateMany({
      where: { id: duelId, opponentId: userId, status: "PENDING", acceptDeadline: { gt: now } },
      data: { status: "ACCEPTED", playDeadline: new Date(now.getTime() + DUEL_PLAY_MS) },
    });
    if (r.count !== 1) throw new DuelError("Ce défi n'est plus disponible.");
    await tx.duelSlot.createMany({ data: slots.map((s) => ({ ...s, duelId })) });
    const d = await tx.duel.findUniqueOrThrow({ where: { id: duelId }, select: { challengerId: true, opponent: { select: { username: true } } } });
    await notify(tx, d.challengerId, "DUEL_ACCEPTED", { duelId, username: d.opponent.username });
  });
}

export async function declineDuel(userId: string, duelId: string, now = new Date()) {
  await prisma.$transaction(async (tx) => {
    const r = await tx.duel.updateMany({ where: { id: duelId, opponentId: userId, status: "PENDING" }, data: { status: "DECLINED", resolvedAt: now } });
    if (r.count !== 1) throw new DuelError("Ce défi n'est plus disponible.");
    const d = await tx.duel.findUniqueOrThrow({ where: { id: duelId }, select: { challengerId: true, opponent: { select: { username: true } } } });
    await notify(tx, d.challengerId, "DUEL_DECLINED", { duelId, username: d.opponent.username });
  });
}

// ---------- Session de défense ----------

async function activeDuel(userId: string, duelId: string, now: Date) {
  const d = await prisma.duel.findUnique({ where: { id: duelId }, select: { challengerId: true, opponentId: true, status: true, playDeadline: true } });
  if (!d || (d.challengerId !== userId && d.opponentId !== userId)) throw new DuelError("Duel introuvable.");
  if (d.status !== "ACCEPTED" || !d.playDeadline || d.playDeadline <= now) throw new DuelError("Ce duel ne se joue plus.");
  return { ...d, attackerId: d.challengerId === userId ? d.opponentId : d.challengerId };
}

/** Commence la défense : génère les 12 questions sur les cartes adverses (une seule fois, même en cas de double clic). */
export async function startDefense(userId: string, duelId: string, now = new Date()) {
  const d = await activeDuel(userId, duelId, now);
  if (await prisma.duelDefense.findUnique({ where: { duelId_userId: { duelId, userId } } })) return;
  const slots = await prisma.duelSlot.findMany({ where: { duelId, userId: d.attackerId }, orderBy: { position: "asc" } });
  const questions: Prisma.DuelQuestionCreateManyInput[] = [];
  for (const s of slots) {
    const qs = await generateQuestions(s.characterId, s.type);
    questions.push(...qs.map((q, index) => ({ duelId, defenderId: userId, slotPosition: s.position, index, kind: q.kind, prompt: q.prompt as unknown as Prisma.InputJsonObject, choices: q.choices, correctIndex: q.correctIndex })));
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.duelDefense.create({ data: { duelId, userId, startedAt: now } });
      await tx.duelQuestion.createMany({ data: questions });
    });
  } catch (err) {
    // Session déjà créée par une requête concurrente
    if (!(err instanceof Error && /Unique constraint|P2002/.test(err.message))) throw err;
  }
}

export interface ServedQuestion {
  id: string;
  slotPosition: number;
  index: number;
  prompt: QuestionPrompt;
  choices: string[];
  remainingMs: number;
  seconds: number;
  /** Carte attaquante : type, rareté et ATK toujours visibles ; image seulement si ce n'est pas une Mystère */
  card: { type: CardType; rarity: Rarity; attack: number; defense: number | null; imageUrl: string | null };
}

const timeLimitMs = (type: CardType) => quizFormat(type).seconds * 1000;

/**
 * Question en cours (déjà servie et encore dans le temps) ou suivante. Les questions servies dont le temps est écoulé
 * sont comptées fausses au passage. Renvoie null quand la défense est terminée. Jamais la bonne réponse.
 */
export async function currentQuestion(userId: string, duelId: string, now = new Date()): Promise<ServedQuestion | null> {
  const def = await prisma.duelDefense.findUnique({ where: { duelId_userId: { duelId, userId } } });
  if (!def || def.finishedAt) return null;
  const d = await activeDuel(userId, duelId, now);
  const slots = await prisma.duelSlot.findMany({ where: { duelId, userId: d.attackerId }, select: { position: true, type: true, attack: true, defense: true, characterId: true } });
  const pending = await prisma.duelQuestion.findMany({ where: { duelId, defenderId: userId, answeredAt: null }, orderBy: [{ slotPosition: "asc" }, { index: "asc" }] });
  for (const q of pending) {
    const slot = slots.find((s) => s.position === q.slotPosition)!;
    const limit = timeLimitMs(slot.type);
    if (q.servedAt && now.getTime() - q.servedAt.getTime() > limit + ANSWER_GRACE_MS) {
      await prisma.duelQuestion.updateMany({ where: { id: q.id, answeredAt: null }, data: { answeredAt: now } });
      continue;
    }
    let servedAt = q.servedAt;
    if (!servedAt) {
      await prisma.duelQuestion.updateMany({ where: { id: q.id, servedAt: null }, data: { servedAt: now } });
      servedAt = (await prisma.duelQuestion.findUniqueOrThrow({ where: { id: q.id }, select: { servedAt: true } })).servedAt!;
    }
    const ch = await prisma.character.findUniqueOrThrow({ where: { id: slot.characterId }, select: { rarity: true, imageUrl: true } });
    const mystery = slot.type === "MYSTERE";
    return {
      id: q.id,
      slotPosition: q.slotPosition,
      index: q.index,
      prompt: q.prompt as unknown as QuestionPrompt,
      choices: q.choices as string[],
      remainingMs: Math.max(0, limit - (now.getTime() - servedAt.getTime())),
      seconds: limit / 1000,
      card: { type: slot.type, rarity: ch.rarity, attack: slot.attack, defense: mystery ? null : slot.defense, imageUrl: mystery ? null : ch.imageUrl },
    };
  }
  await finishDefense(duelId, userId, now);
  return null;
}

export interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  /** Fin du quiz sur cette carte : le personnage est révélé */
  reveal: { characterId: number; name: string; imageUrl: string } | null;
}

export async function answerQuestion(userId: string, questionId: string, answerIndex: number, now = new Date()): Promise<AnswerResult> {
  const q = await prisma.duelQuestion.findUnique({ where: { id: questionId } });
  if (!q || q.defenderId !== userId || !q.servedAt) throw new DuelError("Question introuvable.");
  const d = await activeDuel(userId, q.duelId, now);
  const slot = await prisma.duelSlot.findUniqueOrThrow({ where: { duelId_userId_position: { duelId: q.duelId, userId: d.attackerId, position: q.slotPosition } } });
  const onTime = now.getTime() - q.servedAt.getTime() <= timeLimitMs(slot.type) + ANSWER_GRACE_MS;
  const choices = q.choices as string[];
  const valid = Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < choices.length;
  // Une seule réponse par question : le passage conditionnel écarte la seconde
  const r = await prisma.duelQuestion.updateMany({ where: { id: q.id, answeredAt: null }, data: { answeredAt: now, answerIndex: onTime && valid ? answerIndex : null } });
  if (r.count !== 1) throw new DuelError("Tu as déjà répondu à cette question.");
  let reveal: AnswerResult["reveal"] = null;
  if (q.index === QUESTIONS_PER_CARD - 1) {
    const c = await prisma.character.findUniqueOrThrow({ where: { id: slot.characterId }, select: { id: true, name: true, imageUrl: true } });
    reveal = { characterId: c.id, name: c.name, imageUrl: c.imageUrl };
  }
  if ((await prisma.duelQuestion.count({ where: { duelId: q.duelId, defenderId: userId, answeredAt: null } })) === 0) await finishDefense(q.duelId, userId, now);
  return { correct: onTime && answerIndex === q.correctIndex, correctIndex: q.correctIndex, reveal };
}

async function finishDefense(duelId: string, userId: string, now: Date) {
  await prisma.duelDefense.updateMany({ where: { duelId, userId, finishedAt: null }, data: { finishedAt: now } });
  const done = await prisma.duelDefense.count({ where: { duelId, finishedAt: { not: null } } });
  if (done === 2) await resolveDuel(duelId, now);
}

// ---------- Résolution, forfait, expiration ----------

export interface StoredResult extends CombatResult {
  forfeit?: boolean;
}

/** Les deux joueurs ont-ils déjà eu 2 duels récompensés aujourd'hui l'un contre l'autre ? */
async function canReward(tx: Tx, a: string, b: string, now: Date) {
  const n = await tx.duel.count({
    where: { rewarded: true, resolvedAt: { gte: startOfDay(now) }, OR: [{ challengerId: a, opponentId: b }, { challengerId: b, opponentId: a }] },
  });
  return n < REWARDED_DUELS_PER_OPPONENT;
}

async function pay(tx: Tx, userId: string, amount: number, duelId: string) {
  if (amount <= 0) return;
  await tx.user.update({ where: { id: userId }, data: { balance: { increment: amount } } });
  await tx.currencyLedger.create({ data: { userId, amount, reason: "DUEL_REWARD", refId: duelId } });
}

/** Elo, récompenses et notifications d'un duel terminé (score du challenger : 1, 0,5 ou 0). */
async function settle(tx: Tx, duelId: string, challengerId: string, opponentId: string, score: 0 | 0.5 | 1, forfeit: boolean, now: Date) {
  const [c, o] = await Promise.all([
    tx.user.findUniqueOrThrow({ where: { id: challengerId }, select: { elo: true, username: true } }),
    tx.user.findUniqueOrThrow({ where: { id: opponentId }, select: { elo: true, username: true } }),
  ]);
  const dc = eloChange(c.elo, o.elo, score);
  const dop = eloChange(o.elo, c.elo, (1 - score) as 0 | 0.5 | 1);
  await tx.user.update({ where: { id: challengerId }, data: { elo: { increment: dc } } });
  await tx.user.update({ where: { id: opponentId }, data: { elo: { increment: dop } } });
  const rewarded = await canReward(tx, challengerId, opponentId, now);
  const R = DUEL_REWARDS;
  const gain = (s: number) => (!rewarded ? 0 : s === 0.5 ? R.draw : forfeit ? (s === 1 ? R.forfeitWin : R.forfeitLoss) : s === 1 ? R.win : R.loss);
  await pay(tx, challengerId, gain(score), duelId);
  await pay(tx, opponentId, gain(1 - score), duelId);
  const winnerId = score === 1 ? challengerId : score === 0 ? opponentId : null;
  await tx.duel.update({ where: { id: duelId }, data: { winnerId, eloChangeChallenger: dc, eloChangeOpponent: dop, rewarded, resolvedAt: now } });
  const outcome = (s: number) => (s === 0.5 ? "draw" : s === 1 ? "win" : "loss");
  await notify(tx, challengerId, "DUEL_RESULT", { duelId, username: o.username, outcome: outcome(score), forfeit, amount: gain(score) });
  await notify(tx, opponentId, "DUEL_RESULT", { duelId, username: c.username, outcome: outcome(1 - score), forfeit, amount: gain(1 - score) });
}

/** Erreurs d'un défenseur sur chacune des 3 cartes adverses (question sans réponse = erreur). */
async function errorsBy(tx: Tx, duelId: string, defenderId: string) {
  const qs = await tx.duelQuestion.findMany({ where: { duelId, defenderId }, select: { slotPosition: true, answerIndex: true, correctIndex: true } });
  return [1, 2, 3].map((p) => qs.filter((q) => q.slotPosition === p && q.answerIndex !== q.correctIndex).length);
}

export async function resolveDuel(duelId: string, now = new Date()) {
  const parties = await prisma.$transaction(async (tx) => {
    const claimed = await tx.duel.updateMany({ where: { id: duelId, status: "ACCEPTED" }, data: { status: "DONE" } });
    if (claimed.count !== 1) return null;
    const d = await tx.duel.findUniqueOrThrow({ where: { id: duelId }, include: { slots: { orderBy: { position: "asc" } } } });
    const team = (id: string) => d.slots.filter((s) => s.userId === id);
    // Erreurs sur les cartes de A = celles de B en défense, et inversement
    const combat = resolveCombat(team(d.challengerId), team(d.opponentId), await errorsBy(tx, duelId, d.opponentId), await errorsBy(tx, duelId, d.challengerId));
    await tx.duel.update({ where: { id: duelId }, data: { result: combat as unknown as Prisma.InputJsonObject } });
    await settle(tx, duelId, d.challengerId, d.opponentId, combat.winner === "A" ? 1 : combat.winner === "B" ? 0 : 0.5, false, now);
    return [d.challengerId, d.opponentId];
  });
  if (parties) await checkAchievementsSafe(...parties);
}

/** Délais dépassés : défis sans réponse expirés ; duels non joués à temps → forfait du retardataire, ou expiration si personne n'a joué. */
export async function sweepDuels(now = new Date()) {
  const unanswered = await prisma.duel.findMany({ where: { status: "PENDING", acceptDeadline: { lte: now } }, select: { id: true, challengerId: true, opponent: { select: { username: true } } } });
  for (const d of unanswered) {
    await prisma.$transaction(async (tx) => {
      const r = await tx.duel.updateMany({ where: { id: d.id, status: "PENDING" }, data: { status: "EXPIRED", resolvedAt: now } });
      if (r.count === 1) await notify(tx, d.challengerId, "DUEL_EXPIRED", { duelId: d.id, username: d.opponent.username });
    });
  }
  const late = await prisma.duel.findMany({ where: { status: "ACCEPTED", playDeadline: { lte: now } }, select: { id: true, challengerId: true, opponentId: true, defenses: { select: { userId: true, finishedAt: true } } } });
  for (const d of late) {
    const done = (id: string) => d.defenses.some((x) => x.userId === id && x.finishedAt !== null);
    const [c, o] = [done(d.challengerId), done(d.opponentId)];
    if (c && o) {
      await resolveDuel(d.id, now);
    } else if (c || o) {
      const parties = await prisma.$transaction(async (tx) => {
        const r = await tx.duel.updateMany({ where: { id: d.id, status: "ACCEPTED" }, data: { status: "FORFEIT" } });
        if (r.count !== 1) return null;
        await tx.duel.update({ where: { id: d.id }, data: { result: { forfeit: true } } });
        await settle(tx, d.id, d.challengerId, d.opponentId, c ? 1 : 0, true, now);
        return [d.challengerId, d.opponentId];
      });
      if (parties) await checkAchievementsSafe(...parties);
    } else {
      await prisma.$transaction(async (tx) => {
        const r = await tx.duel.updateMany({ where: { id: d.id, status: "ACCEPTED" }, data: { status: "EXPIRED", resolvedAt: now } });
        if (r.count !== 1) return;
        for (const id of [d.challengerId, d.opponentId]) await notify(tx, id, "DUEL_EXPIRED", { duelId: d.id });
      });
    }
  }
}

// ---------- Lecture ----------

const USER = { select: { id: true, username: true } } as const;

export async function listDuels(userId: string, now = new Date()) {
  await sweepDuels(now);
  const rows = await prisma.duel.findMany({
    where: { OR: [{ challengerId: userId }, { opponentId: userId }] },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { challenger: USER, opponent: USER, defenses: { select: { userId: true, finishedAt: true } } },
  });
  return rows.map((d) => {
    const mine = d.challengerId === userId;
    const myDefense = d.defenses.find((x) => x.userId === userId);
    const theirDefense = d.defenses.find((x) => x.userId !== userId);
    return {
      id: d.id,
      status: d.status,
      mine,
      other: mine ? d.opponent.username : d.challenger.username,
      createdAt: d.createdAt,
      acceptDeadline: d.acceptDeadline,
      playDeadline: d.playDeadline,
      iPlayed: !!myDefense?.finishedAt,
      theyPlayed: !!theirDefense?.finishedAt,
      outcome: d.status === "DONE" || d.status === "FORFEIT" ? (d.winnerId === null ? "draw" : d.winnerId === userId ? "win" : "loss") : null,
      eloChange: mine ? d.eloChangeChallenger : d.eloChangeOpponent,
    };
  });
}

export type DuelRow = Awaited<ReturnType<typeof listDuels>>[number];

/** Cartes utilisables en duel, les plus fortes d'abord. */
export async function duelCards(userId: string) {
  const rows = await prisma.card.findMany({
    where: { ownerId: userId },
    select: { id: true, serial: true, finish: true, character: { select: { id: true, name: true, rarity: true, type: true, attack: true, defense: true, imageUrl: true } } },
  });
  return rows
    .map((c) => ({ ...c.character, characterId: c.character.id, id: c.id, serial: c.serial, finish: c.finish }))
    .sort((a, b) => b.attack + b.defense - (a.attack + a.defense));
}

export type DuelCard = Awaited<ReturnType<typeof duelCards>>[number];

export async function duelView(userId: string, duelId: string, now = new Date()) {
  await sweepDuels(now);
  const d = await prisma.duel.findUnique({
    where: { id: duelId },
    include: { challenger: USER, opponent: USER, slots: { orderBy: { position: "asc" } }, defenses: true },
  });
  if (!d || (d.challengerId !== userId && d.opponentId !== userId)) return null;
  const chars = await prisma.character.findMany({ where: { id: { in: d.slots.map((s) => s.characterId) } }, select: { id: true, name: true, imageUrl: true, rarity: true } });
  const ch = new Map(chars.map((c) => [c.id, c]));
  const finished = d.status === "DONE" || d.status === "FORFEIT";
  const myDefense = d.defenses.find((x) => x.userId === userId);
  // Cartes adverses : visibles seulement une fois le duel terminé ou ma défense finie
  const showTheirs = finished || !!myDefense?.finishedAt;
  const team = (id: string, visible: boolean) =>
    d.slots.filter((s) => s.userId === id).map((s) => ({ position: s.position, type: s.type, attack: s.attack, defense: s.defense, ...(visible ? { character: ch.get(s.characterId)! } : { character: null }) }));
  const mine = d.challengerId === userId;
  return {
    id: d.id,
    status: d.status,
    mine,
    challenger: d.challenger.username,
    opponent: d.opponent.username,
    me: mine ? d.challenger.username : d.opponent.username,
    other: mine ? d.opponent.username : d.challenger.username,
    acceptDeadline: d.acceptDeadline,
    playDeadline: d.playDeadline,
    myTeam: team(userId, true),
    theirTeam: team(mine ? d.opponentId : d.challengerId, showTheirs),
    defenseStarted: !!myDefense,
    defenseFinished: !!myDefense?.finishedAt,
    theyFinished: !!d.defenses.find((x) => x.userId !== userId)?.finishedAt,
    result: finished ? (d.result as unknown as StoredResult | null) : null,
    characters: finished ? Object.fromEntries(chars.map((c) => [c.id, c])) : {},
    winner: finished ? (d.winnerId === null ? null : d.winnerId === d.challengerId ? d.challenger.username : d.opponent.username) : null,
    eloChange: mine ? d.eloChangeChallenger : d.eloChangeOpponent,
    rewarded: d.rewarded,
  };
}

export type DuelView = NonNullable<Awaited<ReturnType<typeof duelView>>>;

export async function duelQuota(userId: string, now = new Date()) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { elo: true, duelsStartedToday: true, duelsStartedDate: true } });
  return { elo: u.elo, left: duelsLeft(u.duelsStartedToday, u.duelsStartedDate, now) };
}

/** Classement Duel : joueurs ayant terminé au moins un duel, par Elo. */
export async function eloLeaderboard(me: string | null, top = 100) {
  const played = await prisma.duel.findMany({ where: { status: { in: ["DONE", "FORFEIT"] } }, select: { challengerId: true, opponentId: true, winnerId: true } });
  const stats = new Map<string, { played: number; wins: number }>();
  for (const d of played) {
    for (const id of [d.challengerId, d.opponentId]) {
      const s = stats.get(id) ?? { played: 0, wins: 0 };
      s.played++;
      if (d.winnerId === id) s.wins++;
      stats.set(id, s);
    }
  }
  const users = await prisma.user.findMany({ where: { id: { in: [...stats.keys()] } }, select: { id: true, username: true, elo: true } });
  const ranked = users
    .sort((a, b) => b.elo - a.elo || a.username.localeCompare(b.username))
    .map((u, i) => ({ userId: u.id, username: u.username, elo: u.elo, ...stats.get(u.id)!, rank: i + 1 }));
  return { top: ranked.slice(0, top), me: me ? (ranked.find((r) => r.userId === me) ?? null) : null, players: ranked.length };
}
