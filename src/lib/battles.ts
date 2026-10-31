// Combats 4 contre 4 côté serveur (docs/specs/combat.md §10) : équipe d'attaque enregistrée, lancement, mode manuel, abandon.
// Le moteur (battle.ts) est pur ; ici on lit les cartes, on enregistre le combat et on rejoue l'état à chaque action.
// Mode manuel : seul le camp A (le joueur) est choisi ; le camp B joue avec la stratégie automatique. L'état n'est jamais
// gardé en mémoire : il se recalcule depuis la copie des cartes, la graine et les choix enregistrés.

import type { BattleMode, CardType, Rarity, TeamKind } from "../generated/prisma/enums";
import type { Prisma } from "../generated/prisma/client";
import {
  applyAction, autoAction, battle, createBattle, currentActor, legalActions, seededRandom,
  type Action, type BattleCard, type BattleEvent, type BattleState, type Side, type Spell, type UnitId,
} from "./battle";
import { prisma } from "./db";
import { afterGain } from "./crystal-stock";
import { startOfDay } from "./economy";
import {
  baseUnits, BOSS_BONUS, DAILY_FULL_UNITS, isBoss, isFinalBoss, isUnlocked, levelScale, LEVELS, MIX, storyLoot,
  universeOf, UNIVERSES, type Loot, type Universe,
} from "./story";
import { floorRarities, floorScale, MAX_FLOOR, TOWER_PREFIX, towerRyo } from "./tower";

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

// ── Histoire : ennemis et butin ─────────────────────────────────────────────

const STORY_PREFIX = "story:";
export const storyKey = (universe: string, level: number) => `${STORY_PREFIX}${universe}:${level}`;
function parseStory(key: string): { universe: Universe; level: number } | null {
  if (!key.startsWith(STORY_PREFIX)) return null;
  const [u, l] = key.slice(STORY_PREFIX.length).split(":");
  const universe = universeOf(u), level = Number(l);
  if (!universe || !Number.isInteger(level) || level < 1 || level > LEVELS) throw new BattleError("Combat d'histoire inconnu.");
  return { universe, level };
}

const RARITY_ORDER: Rarity[] = ["N", "R", "SR", "SSR", "UR"];
let rarityMeans: Record<string, { attack: number; defense: number }> | null = null;
async function meanStats() {
  if (!rarityMeans) {
    const rows = await prisma.character.groupBy({ by: ["rarity"], where: { disabled: false }, _avg: { attack: true, defense: true } });
    rarityMeans = Object.fromEntries(rows.map((r) => [r.rarity, { attack: r._avg.attack ?? 0, defense: r._avg.defense ?? 0 }]));
  }
  return rarityMeans;
}

/** Les 4 ennemis d'un combat d'histoire : personnages de l'anime (même combat, mêmes ennemis), stats = moyenne de leur rareté × échelle du niveau. */
async function storyEnemies(universe: Universe, level: number): Promise<BattleCard[]> {
  const rows = await prisma.character.findMany({
    where: { disabled: false, mainMedia: { franchiseId: universe.franchiseId } },
    orderBy: [{ favourites: "desc" }, { id: "asc" }],
    select: CHARACTER_SELECT,
  });
  if (rows.length < 4) throw new BattleError("Univers incomplet.");
  const means = await meanStats();
  const rng = seededRandom(universe.franchiseId * 100 + level);
  const used = new Set<number>();
  // Rareté demandée, à défaut la plus proche (d'abord plus basse)
  const pick = (want: Rarity, popular: boolean) => {
    const w = RARITY_ORDER.indexOf(want);
    const order = RARITY_ORDER.map((r, i) => ({ r, d: Math.abs(i - w) + (i > w ? 0.5 : 0) })).sort((a, b) => a.d - b.d);
    for (const { r } of order) {
      const pool = rows.filter((c) => c.rarity === r && !used.has(c.id));
      if (pool.length) return pool[popular ? 0 : Math.floor(rng() * pool.length)];
    }
    return rows.find((c) => !used.has(c.id))!;
  };
  return MIX[level - 1].map((want, i) => {
    const boss = isBoss(level) && i === 3;
    let c: CharacterRow;
    if (boss && isFinalBoss(level)) {
      // Boss final : le SSR ou UR le plus aimé, à défaut un SR
      c = rows.filter((x) => !used.has(x.id) && (x.rarity === "SSR" || x.rarity === "UR"))[0] ?? pick("SR", true);
    } else c = pick(want, boss);
    used.add(c.id);
    const m = means[c.rarity], k = levelScale(level) * (boss ? BOSS_BONUS : 1);
    return { ...toBattleCard(c), attack: Math.round(m.attack * k), defense: Math.round(m.defense * k), boss };
  });
}

/** Butin d'une victoire, versé dans la transaction qui enregistre la fin du combat : un combat ne paie qu'une fois. */
async function settleStory(tx: Prisma.TransactionClient, userId: string, opponent: string, seed: number, now: Date): Promise<Loot> {
  const { universe, level } = parseStory(opponent)!;
  // Premier passage : le `updateMany` conditionnel désigne un seul gagnant, même avec deux combats simultanés
  await tx.storyProgress.upsert({ where: { userId_universe: { userId, universe: universe.key } }, create: { userId, universe: universe.key }, update: {} });
  const first = (await tx.storyProgress.updateMany({ where: { userId, universe: universe.key, maxLevel: { lt: level } }, data: { maxLevel: level } })).count === 1;
  const day = startOfDay(now);
  const daily = await tx.dailyGain.findUnique({ where: { userId_day_source: { userId, day, source: "STORY" } } });
  const fullUnits = Math.max(0, DAILY_FULL_UNITS - (daily?.units ?? 0));
  const loot = storyLoot(universe, level, first, fullUnits, seededRandom(seed ^ 0x5eed));
  if (!first) {
    await tx.dailyGain.upsert({
      where: { userId_day_source: { userId, day, source: "STORY" } },
      create: { userId, day, source: "STORY", units: Math.min(baseUnits(level), fullUnits) },
      update: { units: { increment: Math.min(baseUnits(level), fullUnits) } },
    });
  }
  for (const [key, quantity] of Object.entries(loot.resources)) {
    await tx.resourceStock.upsert({ where: { userId_key: { userId, key } }, create: { userId, key, quantity }, update: { quantity: { increment: quantity } } });
  }
  if (loot.ryo || loot.crystals) {
    const u = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { crystals: true, crystalsUpdatedAt: true } });
    await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: loot.ryo }, ...(loot.crystals ? afterGain(u.crystals, u.crystalsUpdatedAt, now, loot.crystals) : {}) },
    });
    if (loot.ryo) await tx.currencyLedger.create({ data: { userId, amount: loot.ryo, reason: "STORY", refId: opponent } });
  }
  return loot;
}

// ── Tour : ennemis et récompense ────────────────────────────────────────────

function parseTower(key: string): number | null {
  if (!key.startsWith(TOWER_PREFIX)) return null;
  const floor = Number(key.slice(TOWER_PREFIX.length));
  if (!Number.isInteger(floor) || floor < 1 || floor > MAX_FLOOR) throw new BattleError("Étage inconnu.");
  return floor;
}

let towerPool: Record<string, number[]> | null = null;
async function poolByRarity() {
  if (!towerPool) {
    const rows = await prisma.character.findMany({ where: { disabled: false }, orderBy: { id: "asc" }, select: { id: true, rarity: true } });
    towerPool = {};
    for (const r of rows) (towerPool[r.rarity] ??= []).push(r.id);
  }
  return towerPool;
}

/** Les 4 ennemis d'un étage : identiques pour tous les joueurs (graine = étage), stats = moyenne de leur rareté × échelle de l'étage. */
async function towerEnemies(floor: number): Promise<BattleCard[]> {
  const pool = await poolByRarity(), means = await meanStats();
  const rng = seededRandom(floor * 7919 + 13);
  const used = new Set<number>(), ids: number[] = [];
  for (const rarity of floorRarities(floor)) {
    const left = (pool[rarity] ?? []).filter((id) => !used.has(id));
    if (!left.length) throw new BattleError("Étage indisponible.");
    const id = left[Math.floor(rng() * left.length)];
    used.add(id);
    ids.push(id);
  }
  const rows = await prisma.character.findMany({ where: { id: { in: ids } }, select: CHARACTER_SELECT });
  const k = floorScale(floor);
  return ids.map((id) => {
    const c = rows.find((r) => r.id === id)!, m = means[c.rarity];
    return { ...toBattleCard(c), attack: Math.round(m.attack * k), defense: Math.round(m.defense * k) };
  });
}

/** Récompense d'une victoire, versée avec la fin du combat : Ryō au premier passage de l'étage seulement. */
async function settleTower(tx: Prisma.TransactionClient, userId: string, opponent: string, now: Date): Promise<Loot> {
  const floor = parseTower(opponent)!;
  await tx.towerProgress.upsert({ where: { userId }, create: { userId }, update: {} });
  const first = (await tx.towerProgress.updateMany({ where: { userId, maxFloor: { lt: floor } }, data: { maxFloor: floor, reachedAt: now } })).count === 1;
  const ryo = first ? towerRyo(floor) : 0;
  if (ryo) {
    await tx.user.update({ where: { id: userId }, data: { balance: { increment: ryo } } });
    await tx.currencyLedger.create({ data: { userId, amount: ryo, reason: "TOWER", refId: opponent } });
  }
  return { ryo, crystals: 0, resources: {} };
}

export async function getTowerFloor(userId: string) {
  return (await prisma.towerProgress.findUnique({ where: { userId }, select: { maxFloor: true } }))?.maxFloor ?? 0;
}

/** Classement : étage atteint, puis premier arrivé. */
export async function towerLeaderboard(top = 20) {
  return prisma.towerProgress.findMany({
    where: { maxFloor: { gt: 0 } }, orderBy: [{ maxFloor: "desc" }, { reachedAt: "asc" }], take: top,
    select: { userId: true, maxFloor: true, user: { select: { username: true } } },
  });
}

/** Ce que le joueur peut jouer : plus haut combat gagné par univers, univers ouverts. */
export async function getStoryProgress(userId: string) {
  const rows = await prisma.storyProgress.findMany({ where: { userId } });
  const max = (key: string) => rows.find((r) => r.universe === key)?.maxLevel ?? 0;
  return UNIVERSES.map((u) => ({ universe: u, maxLevel: max(u.key), unlocked: isUnlocked(u, max(UNIVERSES[0].key)) }));
}

async function checkStoryAccess(userId: string, universe: Universe, level: number) {
  const progress = await getStoryProgress(userId);
  const p = progress.find((x) => x.universe === universe)!;
  if (!p.unlocked) throw new BattleError("Univers verrouillé : termine d'abord le tutoriel.");
  if (level > p.maxLevel + 1) throw new BattleError("Combat verrouillé : gagne le précédent.");
}

const toJson = (x: unknown) => x as Prisma.InputJsonValue;

async function opponentCards(key: string): Promise<BattleCard[]> {
  const story = parseStory(key);
  if (story) return storyEnemies(story.universe, story.level);
  const floor = parseTower(key);
  if (floor) return towerEnemies(floor);
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

/** Enregistre une équipe (attaque ou défense) : 4 cartes différentes du joueur, dans l'ordre des positions. */
export async function setTeam(userId: string, kind: TeamKind, cardIds: string[]) {
  const ids = [...new Set(cardIds)];
  if (ids.length !== 4 || cardIds.length !== 4) throw new BattleError("Choisis 4 cartes différentes.");
  const owned = await prisma.card.count({ where: { id: { in: ids }, ownerId: userId } });
  if (owned !== 4) throw new BattleError("Une des cartes ne t'appartient pas.");
  await prisma.$transaction(async (tx) => {
    const team = await tx.battleTeam.upsert({
      where: { userId_kind: { userId, kind } },
      create: { userId, kind },
      update: {},
      select: { id: true },
    });
    await tx.battleTeamSlot.deleteMany({ where: { teamId: team.id } });
    await tx.battleTeamSlot.createMany({ data: ids.map((cardId, i) => ({ teamId: team.id, position: i + 1, cardId })) });
  });
}

export const setAttackTeam = (userId: string, cardIds: string[]) => setTeam(userId, "ATTACK", cardIds);

/** Équipe par défaut : les 4 cartes les plus rares du joueur (puis les plus populaires), hors enchères. */
export async function autoTeam(userId: string, kind: TeamKind = "ATTACK") {
  const cards = await prisma.card.findMany({
    where: { ownerId: userId, inAuction: false },
    select: { id: true, characterId: true, character: { select: { rarity: true, power: true } } },
  });
  const rank = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 } as const;
  cards.sort((a, b) => rank[b.character.rarity] - rank[a.character.rarity] || b.character.power - a.character.power);
  const picked: string[] = [], seen = new Set<number>();
  for (const c of cards) {
    if (seen.has(c.characterId) || picked.length >= 4) continue;
    seen.add(c.characterId);
    picked.push(c.id);
  }
  if (picked.length < 4) throw new BattleError("Il te faut au moins 4 personnages différents.");
  await setTeam(userId, kind, picked);
  return picked;
}
export const autoAttackTeam = (userId: string) => autoTeam(userId, "ATTACK");

/** Équipe enregistrée, positions 1 à 4 (null = vide). Les cartes qui ont changé de main sont retirées. */
export async function getTeam(userId: string, kind: TeamKind) {
  const team = await prisma.battleTeam.findUnique({
    where: { userId_kind: { userId, kind } },
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
export const getAttackTeam = (userId: string) => getTeam(userId, "ATTACK");

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
  /** Butin d'une victoire d'histoire */
  loot: Loot | null;
  log: BattleEvent[];
  /** Carte du joueur qui doit agir (mode manuel, combat en cours) */
  actor: UnitId | null;
  choices: { spell: Spell; targets: (UnitId | null)[] }[];
  /** Actions que chaque carte doit encore attendre avant son sort affilié (0 = prêt), combat en cours */
  wait: Record<string, number>;
  /** Nom et image des 8 personnages, pour l'affichage */
  characters: Record<number, { name: string; imageUrl: string; rarity: Rarity; type: CardType }>;
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
  const rows = await prisma.character.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, imageUrl: true, rarity: true, type: true } });
  return Object.fromEntries(rows.map((r) => [r.id, { name: r.name, imageUrl: r.imageUrl, rarity: r.rarity, type: r.type }]));
}

type BattleRow = Prisma.BattleGetPayload<object>;

async function toView(row: BattleRow, st: BattleState | null, from = 0): Promise<BattleView> {
  const teams = row.teams as unknown as BattleTeams;
  const log = st ? st.log : ((row.log ?? []) as unknown as BattleEvent[]);
  const running = row.status === "RUNNING" && st && !st.result;
  return {
    id: row.id, mode: row.mode, opponent: row.opponent, manual: row.manual, status: st?.result ? "DONE" : row.status,
    winner: (st?.result ? st.result.winner : (row.winner as Side | null)) ?? null,
    loot: (row.loot as unknown as Loot | null) ?? null,
    log: log.slice(from),
    actor: running ? currentActor(st)!.id : null,
    choices: running ? legalActions(st) : [],
    // Prêt quand spellIn ≤ 1 au début de l'action (voir Unit.spellIn dans battle.ts)
    wait: running
      ? Object.fromEntries((["A", "B"] as const).flatMap((side) => st.teams[side].flatMap((u) => [[u.id, Math.max(0, u.spellIn - 1)], [`${u.id}:special`, Math.max(0, u.pIn - 1)]])))
      : {},
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
  const story = parseStory(opponent);
  if (story) await checkStoryAccess(userId, story.universe, story.level);
  const floor = parseTower(opponent);
  if (floor && floor > (await getTowerFloor(userId)) + 1) throw new BattleError("Étage verrouillé : gagne le précédent.");
  const mode: BattleMode = story ? "STORY" : floor ? "TOWER" : "TEST";
  // Un combat suivi à la fois et par mode. En histoire et dans la Tour, une défaite ne coûte rien : un combat laissé ouvert est abandonné pour en lancer un autre.
  if (manual && (story || floor)) await prisma.battle.updateMany({ where: { userId, manual: true, status: "RUNNING", mode }, data: { status: "ABANDONED", winner: "B", endedAt: now } });
  if (manual && (await prisma.battle.count({ where: { userId, manual: true, status: "RUNNING", mode } })))
    throw new BattleError("Tu as déjà un combat en cours : termine-le ou abandonne-le.");
  const mine = slots.map((s) => toBattleCard(s!.character, s!.stars));
  const teams: BattleTeams = { A: mine, B: await opponentCards(opponent) };
  const seed = Math.floor(Math.random() * 2 ** 31);
  if (!manual) {
    const result = battle(teams.A, teams.B, seededRandom(seed));
    const row = await prisma.$transaction(async (tx) => {
      const won = result.winner === "A";
      const loot = story && won ? await settleStory(tx, userId, opponent, seed, now) : floor && won ? await settleTower(tx, userId, opponent, now) : null;
      return tx.battle.create({
        data: {
          userId, mode, opponent, manual, seed, teams: toJson(teams), status: "DONE", winner: result.winner,
          log: toJson(result.log), loot: loot ? toJson(loot) : undefined, endedAt: now,
        },
      });
    });
    return toView(row, null);
  }
  const row = await prisma.battle.create({ data: { userId, mode, opponent, manual, seed, teams: toJson(teams) } });
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

const isSpell = (x: unknown): x is Spell => x === "base" || x === "affinity" || x === "special";

/** Mode manuel : joue le choix du joueur, puis les cartes adverses, jusqu'au prochain choix. Renvoie les nouveaux événements. */
export async function playAction(userId: string, battleId: string, action: Action | null, now = new Date()): Promise<BattleView> {
  // action = null : la stratégie automatique joue à la place du joueur (bouton Auto) ; elle est enregistrée comme un choix du joueur
  if (action && (!isSpell(action.spell) || (action.target !== null && typeof action.target !== "string"))) throw new BattleError("Action invalide.");
  await sweepBattles(now);
  const row = await prisma.battle.findFirst({ where: { id: battleId, userId, manual: true } });
  if (!row) throw new BattleError("Combat introuvable.");
  if (row.status !== "RUNNING") throw new BattleError("Ce combat est terminé.");
  const teams = row.teams as unknown as BattleTeams;
  const actions = row.actions as unknown as Action[];
  const st = replay(teams, row.seed, actions);
  const from = st.log.length;
  if (!currentActor(st)) throw new BattleError("Ce combat est terminé.");
  const chosen: Action = action ? { spell: action.spell, target: action.target } : autoAction(st);
  try {
    applyAction(st, chosen);
  } catch {
    throw new BattleError("Action impossible.");
  }
  for (let actor = currentActor(st); actor && actor.id.startsWith("B"); actor = currentActor(st)) applyAction(st, autoAction(st));
  const done = st.result;
  // Verrou : l'écriture n'a lieu que si personne n'a joué entre-temps. Le butin est versé dans la même transaction que la fin du combat ; si le verrou échoue, rien n'est payé
  let loot: Loot | null = null;
  await prisma.$transaction(async (tx) => {
    const saved = await tx.battle.updateMany({
      where: { id: row.id, status: "RUNNING", steps: row.steps },
      data: {
        actions: toJson([...actions, chosen]),
        steps: row.steps + 1,
        ...(done ? { status: "DONE", winner: done.winner, log: toJson(done.log), endedAt: now } : {}),
      },
    });
    if (saved.count !== 1) throw new BattleError("Action déjà jouée, recharge le combat.");
    if (done?.winner === "A" && (row.mode === "STORY" || row.mode === "TOWER")) {
      loot = row.mode === "STORY" ? await settleStory(tx, userId, row.opponent, row.seed, now) : await settleTower(tx, userId, row.opponent, now);
      await tx.battle.update({ where: { id: row.id }, data: { loot: toJson(loot) } });
    }
    });
  return toView({ ...row, status: done ? "DONE" : "RUNNING", loot }, st, from);
}

/** Abandon d'un combat manuel en cours : compté comme perdu. */
export async function abandonBattle(userId: string, battleId: string, now = new Date()) {
  const res = await prisma.battle.updateMany({
    where: { id: battleId, userId, status: "RUNNING" },
    data: { status: "ABANDONED", winner: "B", endedAt: now },
  });
  if (res.count !== 1) throw new BattleError("Combat introuvable ou déjà terminé.");
}
