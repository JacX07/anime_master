import { combatPowers } from "./combat-power";
import { track } from "./events";
import { sumArtifactStats } from "./artifact-stats";
import { adventureLock } from "./adventure-state";
// Combats 4 contre 4 côté serveur (docs/specs/combat.md §10) : équipe d'attaque enregistrée, lancement, mode manuel, abandon.
// Le moteur (battle.ts) est pur ; ici on lit les cartes, on enregistre le combat et on rejoue l'état à chaque action.
// Mode manuel : seul le camp A (le joueur) est choisi ; le camp B joue avec la stratégie automatique. L'état n'est jamais
// gardé en mémoire : il se recalcule depuis la copie des cartes, la graine et les choix enregistrés.

import type { BattleMode, CardType, Rarity, TeamKind } from "../generated/prisma/enums";
import type { Prisma } from "../generated/prisma/client";
import {
  BATTLE, applyAction, autoAction, battle, createBattle, currentActor, legalActions, seededRandom,
  type Action, type BattleCard, type BattleEvent, type BattleState, type Side, type Spell, type UnitId, timeline,
} from "./battle";
import { prisma } from "./db";
import { afterGain } from "./crystal-stock";
import { startOfDay } from "./economy";
import {
  baseUnits, BOSS_BONUS, DAILY_FULL_UNITS, isBoss, isFinalBoss, isUnlocked, levelScale, LEVELS, mixFor, storyLoot,
  universeOf, UNIVERSES, STORY_BOSSES, type Loot, type Universe,
} from "./story";
import { bossOfWeek, DAILY_FULL_HEARTS, DIFFICULTIES, parseRaidKey, RAID_BOSS_BONUS, RAID_PREFIX, RAID_RESOURCE, raidHearts, type RaidBoss, type RaidDifficulty } from "./raid";
import { floorRarities, floorScale, MAX_FLOOR, TOWER_PREFIX, towerRyo } from "./tower";

import { weaponDef } from "./weapons";
import { speedOf } from "./speed";
import { artifactMainStat, artifactSlot, artifactSubStats, ARTIFACT_SLOTS, DUNGEON_KEY, SET_KEYS, DUNGEON_PREFIX, dungeonOf, dungeonOfKey, type Dungeon, levelReward, parseDungeonKey, type ArtifactSlot } from "./dungeons";
import type { CharacterSpell } from "./spells";

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

const toBattleCard = (c: CharacterRow, stars = 0, weaponKey: string | null = null): BattleCard => ({
  characterId: c.id, rarity: c.rarity, type: c.type, attack: c.attack, defense: c.defense, power: c.power,
  speed: speedOf(c.id),
  franchiseId: c.mainMedia?.franchiseId ?? c.mainMediaId, stars, weapon: stars === 5 ? weaponDef(weaponKey ?? "")?.weapon ?? null : null,
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

/** Les 4 ennemis d'un combat d'histoire : personnages de l'univers (même combat, mêmes ennemis), stats = moyenne de la rareté de la case × échelle du niveau × difficulté de l'univers. */
export async function storyEnemies(universe: Universe, level: number): Promise<BattleCard[]> {
  const rows = await prisma.character.findMany({
    where: { disabled: false, mainMedia: { franchiseId: { in: universe.franchiseIds } } },
    orderBy: [{ favourites: "desc" }, { id: "asc" }],
    select: CHARACTER_SELECT,
  });
  if (rows.length < 4) throw new BattleError("Univers incomplet.");
  const means = await meanStats();
  const fixed = STORY_BOSSES[universe.key]?.[level];
  const fixedBoss = fixed ? rows.find((c) => c.id === fixed.characterId) : undefined;
  if (fixed && !fixedBoss) throw new BattleError(`Boss indisponible : ${fixed.name}.`);
  const rng = seededRandom(universe.rank * 1000 + level);
  const used = new Set<number>();
  // Rareté demandée, à défaut la plus proche (d'abord plus basse)
  const pick = (want: Rarity, popular: boolean) => {
    const w = RARITY_ORDER.indexOf(want);
    const order = RARITY_ORDER.map((r, i) => ({ r, d: Math.abs(i - w) + (i > w ? 0.5 : 0) })).sort((a, b) => a.d - b.d);
    for (const { r } of order) {
      const pool = rows.filter((c) => c.rarity === r && !used.has(c.id) && c.id !== fixedBoss?.id);
      if (pool.length) return pool[popular ? 0 : Math.floor(rng() * pool.length)];
    }
    return rows.find((c) => !used.has(c.id) && c.id !== fixedBoss?.id)!;
  };
  return mixFor(universe, level).map((want, i) => {
    const boss = isBoss(level) && i === 3;
    let c: CharacterRow;
    if (boss && fixedBoss) c = fixedBoss;
    else if (boss && isFinalBoss(level)) {
      // Boss final : le SSR ou UR le plus aimé, à défaut un SR
      c = rows.filter((x) => !used.has(x.id) && (x.rarity === "SSR" || x.rarity === "UR"))[0] ?? pick("SR", true);
    } else c = pick(want, boss);
    used.add(c.id);
    // La rareté de la case (pas celle du personnage tiré) fixe les stats : un univers sans SSR reste aussi dur qu'un autre
    const m = means[want], k = levelScale(universe, level) * (boss ? BOSS_BONUS : 1);
    // Pas de synergie de franchise pour les ennemis : la difficulté vient du niveau et de l'univers (valeurs calibrées sans synergie)
    return { ...toBattleCard(c), franchiseId: null, rarity: want, attack: Math.round(m.attack * k), defense: Math.round(m.defense * k), boss, ...(boss ? { speed: 100 } : {}) };
  });
}

/** Butin d'une victoire, versé dans la transaction qui enregistre la fin du combat : un combat ne paie qu'une fois. */
async function settleStory(tx: Prisma.TransactionClient, userId: string, opponent: string, seed: number, stars: number, now: Date): Promise<Loot> {
  const { universe, level } = parseStory(opponent)!;
  if (stars > 0) {
    await tx.storyStageStar.createMany({ data: [{ userId, universe: universe.key, level, stars }], skipDuplicates: true });
    await tx.storyStageStar.updateMany({ where: { userId, universe: universe.key, level, stars: { lt: stars } }, data: { stars } });
  }
  // Premier passage : le `updateMany` conditionnel désigne un seul gagnant, même avec deux combats simultanés
  await tx.storyProgress.createMany({ data: [{ userId, universe: universe.key }], skipDuplicates: true });
  const first = (await tx.storyProgress.updateMany({ where: { userId, universe: universe.key, maxLevel: { lt: level } }, data: { maxLevel: level } })).count === 1;
  const day = startOfDay(now);
  const daily = await tx.dailyGain.findUnique({ where: { userId_day_source: { userId, day, source: "STORY" } } });
  const fullUnits = Math.max(0, DAILY_FULL_UNITS - (daily?.units ?? 0));
  const loot = storyLoot(universe, level, first, fullUnits, seededRandom(seed ^ 0x5eed));
  if (!first) {
    await tx.dailyGain.upsert({
      where: { userId_day_source: { userId, day, source: "STORY" } },
      create: { userId, day, source: "STORY", units: Math.min(baseUnits(level, universe), fullUnits) },
      update: { units: { increment: Math.min(baseUnits(level, universe), fullUnits) } },
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

// ── Raid : ennemis, accès et butin ──────────────────────────────────────────

function parseRaid(key: string): { boss: RaidBoss; difficulty: RaidDifficulty } | null {
  if (!key.startsWith(RAID_PREFIX)) return null;
  const raid = parseRaidKey(key);
  if (!raid) throw new BattleError("Raid inconnu.");
  return raid;
}

/** Part des PV adverses retirée, lue dans l'événement de fin du combat. */
const shareOf = (log: BattleEvent[]) => {
  const end = log[log.length - 1];
  return end?.kind === "end" ? Math.min(1, Math.max(0, 1 - end.hpLeft.B)) : 0;
};

/** Le boss (UR le plus aimé de son type) et 3 sbires SSR du même type, stats = moyenne de la rareté × échelle de la difficulté, boss × bonus. */
async function raidEnemies(boss: RaidBoss, difficulty: RaidDifficulty): Promise<BattleCard[]> {
  const rows = await prisma.character.findMany({
    where: { disabled: false, type: boss.type, rarity: { in: ["SSR", "UR"] } },
    orderBy: [{ favourites: "desc" }, { id: "asc" }],
    select: CHARACTER_SELECT,
  });
  const leader = rows.find((c) => c.rarity === "UR");
  const minionPool = rows.filter((c) => c.rarity === "SSR");
  if (!leader || minionPool.length < 3) throw new BattleError("Boss indisponible.");
  const rng = seededRandom(boss.key.length * 7919 + boss.key.charCodeAt(0));
  const minions: CharacterRow[] = [];
  while (minions.length < 3) minions.push(minionPool.splice(Math.floor(rng() * minionPool.length), 1)[0]);
  const means = await meanStats();
  const mk = (c: CharacterRow, k: number, isBoss: boolean): BattleCard => {
    const m = means[c.rarity];
    // Pas de synergie de franchise pour les ennemis (comme l'histoire)
    return { ...toBattleCard(c), franchiseId: null, attack: Math.round(m.attack * k), defense: Math.round(m.defense * k), ...(isBoss ? { boss: true, speed: 100 } : {}) };
  };
  return [...minions.map((c) => mk(c, difficulty.scale, false)), mk(leader, difficulty.scale * RAID_BOSS_BONUS, true)];
}

const dungeonMechanic = (level: number, dungeon: Dungeon): CharacterSpell | undefined => level < 4 ? undefined : level < 7
  ? { name: dungeon.mechanics[0], target: null, effects: [{ k: "damage", mult: 0.28, zone: true }, { k: "shield", pct: 0.12, to: "self" }] }
  : level < 10
    ? { name: dungeon.mechanics[1], target: null, effects: [{ k: "damage", mult: 0.48, zone: true }, { k: "mod", stat: "atk", amount: -0.12, turns: 2, to: "foes" }] }
    : { name: dungeon.mechanics[2], target: null, effects: [{ k: "damage", mult: 0.65, zone: true }, { k: "mod", stat: "def", amount: 0.2, turns: 2, to: "team" }] };

async function dungeonEnemies(level: number, dungeon: Dungeon): Promise<BattleCard[]> {
  const rows = await prisma.character.findMany({ where: { disabled: false, mainMedia: { franchiseId: dungeon.franchiseId } }, orderBy: [{ favourites: "desc" }, { id: "asc" }], select: CHARACTER_SELECT });
  if (rows.length < 4) throw new BattleError(`Le donjon ${dungeon.universe} est indisponible : il manque des personnages.`);
  const boss = rows.find((c) => c.id === dungeon.bossId);
  if (!boss) throw new BattleError(`Le gardien de ${dungeon.universe} est indisponible.`);
  const minions = rows.filter((c) => c.id !== boss.id).slice(0, 3);
  const means = await meanStats();
  const scale = 0.72 + (level - 1) * 0.115;
  const minionRarity = levelReward(level).rarity;
  return [...minions.map((c) => ({ ...toBattleCard(c), franchiseId: null, attack: Math.round(means[minionRarity].attack * scale), defense: Math.round(means[minionRarity].defense * scale), rarity: minionRarity })), {
    ...toBattleCard(boss), ...(dungeon.key !== DUNGEON_KEY ? { rarity: "UR" as const } : {}), franchiseId: null, attack: Math.round(means[dungeon.key === DUNGEON_KEY ? boss.rarity : "UR"].attack * scale * 1.7), defense: Math.round(means[dungeon.key === DUNGEON_KEY ? boss.rarity : "UR"].defense * scale * 1.7), boss: true, speed: 100 + level * 2, spell: dungeonMechanic(level, dungeon),
  }];
}

async function settleDungeon(tx: Prisma.TransactionClient, userId: string, opponent: string, seed: number): Promise<Loot> {
  const level = parseDungeonKey(opponent)!;
  const dungeon = dungeonOfKey(opponent)!;
  await tx.dungeonProgress.createMany({ data: [{ userId, dungeon: dungeon.key }], skipDuplicates: true });
  await tx.dungeonProgress.updateMany({ where: { userId, dungeon: dungeon.key, maxLevel: { lt: level } }, data: { maxLevel: level } });
  const slot = artifactSlot(seed);
  const rarity = levelReward(level).rarity;
  const main = artifactMainStat(slot, rarity, seed ^ 0x4d3c2b1a);
  const subStats = artifactSubStats(slot, rarity, seed ^ 0x7f4a7c15, main.stat);
  await tx.artifact.create({ data: { userId, setKey: dungeon.key, slot, rarity, mainStat: main.stat, mainValue: main.value, subStats: toJson(subStats) } });
  const material = levelReward(level).resource;
  if (material) await tx.resourceStock.upsert({ where: { userId_key: { userId, key: dungeon.resource } }, create: { userId, key: dungeon.resource, quantity: material }, update: { quantity: { increment: material } } });
  return { ryo: 0, crystals: 0, resources: material ? { [dungeon.resource]: material } : {}, artifact: { slot, rarity, mainStat: main.stat, mainValue: main.value, subStats } };
}

/** Difficultés ouvertes pour ce joueur : le Normal après le tutoriel, puis chaque niveau en battant le précédent (sur n'importe quel boss). */
export async function raidUnlocked(userId: string): Promise<{ tutorial: boolean; open: string[] }> {
  const [tuto, wins] = await Promise.all([
    prisma.storyProgress.findUnique({ where: { userId_universe: { userId, universe: UNIVERSES[0].key } }, select: { maxLevel: true } }),
    prisma.raidBest.findMany({ where: { userId, won: true }, select: { difficulty: true } }),
  ]);
  const tutorial = (tuto?.maxLevel ?? 0) >= LEVELS;
  const won = new Set(wins.map((w) => w.difficulty));
  const open = tutorial ? DIFFICULTIES.filter((d, i) => i === 0 || won.has(DIFFICULTIES[i - 1].key)).map((d) => d.key) : [];
  return { tutorial, open };
}

async function checkRaidAccess(userId: string, boss: RaidBoss, difficulty: RaidDifficulty, now: Date) {
  if (boss.key !== bossOfWeek(now).key) throw new BattleError("Ce boss n'est plus là cette semaine.");
  const { tutorial, open } = await raidUnlocked(userId);
  if (!tutorial) throw new BattleError("Raid verrouillé : termine d'abord le tutoriel de l'histoire.");
  if (!open.includes(difficulty.key)) throw new BattleError("Difficulté verrouillée : bats la précédente.");
}

/** Cœurs de brèche versés à la fin d'un combat de raid, qu'il soit gagné ou perdu (la part de PV retirée compte). Une seule fois par combat. */
async function settleRaid(tx: Prisma.TransactionClient, userId: string, opponent: string, seed: number, share: number, won: boolean, now: Date): Promise<Loot> {
  const { boss, difficulty } = parseRaid(opponent)!;
  const day = startOfDay(now);
  const daily = await tx.dailyGain.findUnique({ where: { userId_day_source: { userId, day, source: "RAID" } } });
  const { hearts, full } = raidHearts(share, won, difficulty, DAILY_FULL_HEARTS - (daily?.units ?? 0), seededRandom(seed ^ 0xbea7));
  if (full) {
    await tx.dailyGain.upsert({
      where: { userId_day_source: { userId, day, source: "RAID" } },
      create: { userId, day, source: "RAID", units: full },
      update: { units: { increment: full } },
    });
  }
  await tx.raidBest.createMany({ data: [{ userId, boss: boss.key, difficulty: difficulty.key }], skipDuplicates: true });
  await tx.raidBest.updateMany({ where: { userId, boss: boss.key, difficulty: difficulty.key, bestShare: { lt: share } }, data: { bestShare: share, updatedAt: now } });
  if (won) await tx.raidBest.updateMany({ where: { userId, boss: boss.key, difficulty: difficulty.key, won: false }, data: { won: true, updatedAt: now } });
  if (hearts) await tx.resourceStock.upsert({ where: { userId_key: { userId, key: RAID_RESOURCE } }, create: { userId, key: RAID_RESOURCE, quantity: hearts }, update: { quantity: { increment: hearts } } });
  return { ryo: 0, crystals: 0, resources: hearts ? { [RAID_RESOURCE]: hearts } : {}, share };
}

/** État du raid pour la page : boss de la semaine, difficultés ouvertes, meilleurs résultats, cœurs au taux plein restants. */
export async function getRaidState(userId: string, now = new Date()) {
  const boss = bossOfWeek(now);
  const [{ tutorial, open }, bests, daily, stock] = await Promise.all([
    raidUnlocked(userId),
    prisma.raidBest.findMany({ where: { userId, boss: boss.key } }),
    prisma.dailyGain.findUnique({ where: { userId_day_source: { userId, day: startOfDay(now), source: "RAID" } } }),
    prisma.resourceStock.findUnique({ where: { userId_key: { userId, key: RAID_RESOURCE } } }),
  ]);
  return {
    boss, tutorial,
    difficulties: DIFFICULTIES.map((d) => ({ ...d, unlocked: open.includes(d.key), bestShare: bests.find((b) => b.difficulty === d.key)?.bestShare ?? 0, won: bests.find((b) => b.difficulty === d.key)?.won ?? false })),
    fullHeartsLeft: Math.max(0, DAILY_FULL_HEARTS - (daily?.units ?? 0)),
    hearts: stock?.quantity ?? 0,
  };
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
  await tx.towerProgress.createMany({ data: [{ userId }], skipDuplicates: true });
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
  const best = await prisma.storyStageStar.findMany({ where: { userId } });
  const max = (key: string) => rows.find((r) => r.universe === key)?.maxLevel ?? 0;
  return UNIVERSES.map((u, i) => ({ universe: u, maxLevel: max(u.key), unlocked: isUnlocked(u, i === 0 ? 0 : max(UNIVERSES[i - 1].key)), stars: Object.fromEntries(Array.from({ length: LEVELS }, (_, j) => { const level = j + 1; return [level, Math.max(best.find((r) => r.universe === u.key && r.level === level)?.stars ?? 0, level <= max(u.key) ? 1 : 0)]; })) }));
}

export function storyStars(won: boolean, events: readonly BattleEvent[], teamSize: number) {
  if (!won) return 0;
  if (teamSize === 2) return 3;
  if (!events.some((event) => event.kind === "ko" && event.target.startsWith("A"))) return 2;
  return 1;
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
  const raid = parseRaid(key);
  if (raid) return raidEnemies(raid.boss, raid.difficulty);
  const floor = parseTower(key);
  if (floor) return towerEnemies(floor);
  const dungeon = parseDungeonKey(key);
  if (dungeon) return dungeonEnemies(dungeon, dungeonOfKey(key)!);
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
        select: { position: true, card: { select: { id: true, ownerId: true, stars: true, weaponKey: true, finish: true, character: { select: { ...CHARACTER_SELECT, name: true, imageUrl: true } } } } },
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

async function equippedCards(userId: string, slots: NonNullable<Awaited<ReturnType<typeof getAttackTeam>>[number]>[]) {
  const artifacts = await prisma.artifact.findMany({ where: { userId, equippedCardId: { in: slots.map((s) => s.id) } } });
  const fitted = slots.map((card) => {
    const worn = artifacts.filter((a) => a.equippedCardId === card.id && SET_KEYS.includes(a.setKey));
    const stats = sumArtifactStats(worn);
    return { ...card, artifactStats: stats };
  });
  const powers = combatPowers(fitted.map((c) => ({ ...toBattleCard(c.character, c.stars, c.weaponKey), artifactStats: c.artifactStats })));
  return fitted.map((c, index) => ({ ...c, character: { ...c.character, power: powers[index] } }));
}

export async function equipArtifact(userId: string, artifactId: string, cardId: string | null) {
  const artifact = await prisma.artifact.findFirst({ where: { id: artifactId, userId }, select: { id: true, slot: true } });
  if (!artifact || !ARTIFACT_SLOTS.includes(artifact.slot as ArtifactSlot)) throw new BattleError("Artefact introuvable.");
  if (cardId !== null && !(await prisma.card.findFirst({ where: { id: cardId, ownerId: userId }, select: { id: true } }))) throw new BattleError("Cette carte ne t'appartient pas.");
  await prisma.$transaction(async (tx) => {
    if (cardId) await tx.artifact.updateMany({ where: { userId, equippedCardId: cardId, slot: artifact.slot }, data: { equippedCardId: null } });
    const changed = await tx.artifact.updateMany({ where: { id: artifact.id, userId }, data: { equippedCardId: cardId } });
    if (changed.count !== 1) throw new BattleError("Artefact introuvable.");
  });
}

export async function getDungeonState(userId: string, setKey = DUNGEON_KEY) {
  if (!dungeonOf(setKey)) throw new BattleError("Donjon inconnu.");
  const [progress, artifacts, team] = await Promise.all([
    prisma.dungeonProgress.findUnique({ where: { userId_dungeon: { userId, dungeon: setKey } } }),
    prisma.artifact.findMany({ where: { userId, setKey }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { equippedCard: { select: { character: { select: { name: true } } } } } }),
    getAttackTeam(userId),
  ]);
  return { maxLevel: progress?.maxLevel ?? 0, artifacts, team };
}

export async function getArtifactInventory(userId: string) {
  const [artifacts, cards] = await Promise.all([
    prisma.artifact.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: { equippedCard: { select: { id: true, character: { select: { name: true, imageUrl: true, rarity: true } } } } } }),
    prisma.card.findMany({ where: { ownerId: userId }, orderBy: [{ character: { rarity: "desc" } }, { serial: "desc" }], select: { id: true, serial: true, character: { select: { name: true } } } }),
  ]);
  return { artifacts, cards };
}

// ── Combats ─────────────────────────────────────────────────────────────────

export interface BattleTeams {
  A: BattleCard[];
  B: BattleCard[];
  /** Absent in persisted battles created before the gauge scheduler. */
  scheduler?: "gauge-v1";
  /** Absent dans les combats enregistrés avant les effets d'élément : ils se rejouent sans. */
  elements?: "elements-v1";
}

/** Ce que le navigateur reçoit : le journal (complet ou depuis le dernier envoi) et, en manuel, les choix possibles. */
export interface BattleView {
  id: string;
  /** Version du choix affiché, refusée si une autre requête a déjà joué. */
  steps: number;
  mode: BattleMode;
  opponent: string;
  manual: boolean;
  status: "RUNNING" | "DONE" | "ABANDONED";
  winner: Side | null;
  /** Butin d'une victoire d'histoire */
  loot: Loot | null;
  storyStars: number | null;
  log: BattleEvent[];
  /** Carte du joueur qui doit agir (mode manuel, combat en cours) */
  actor: UnitId | null;
  choices: { spell: Spell; targets: (UnitId | null)[] }[];
  /** Actions que chaque carte doit encore attendre avant son sort affilié (0 = prêt), combat en cours */
  wait: Record<string, number>;
  /** Prochains acteurs projetés par l'ordonnanceur à jauge. */
  timeline: UnitId[];
  /** Nom et image des 8 personnages, pour l'affichage */
  characters: Record<number, { name: string; imageUrl: string; rarity: Rarity; type: CardType }>;
}

/** Rejoue un combat manuel : choix enregistrés pour A, stratégie automatique pour B, jusqu'au prochain choix de A. */
function replay(teams: BattleTeams, seed: number, actions: Action[]): BattleState {
  const st = createBattle(teams.A, teams.B, seededRandom(seed), { gauge: teams.scheduler === "gauge-v1", elements: teams.elements === "elements-v1" });
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
    id: row.id, steps: row.steps, mode: row.mode, opponent: row.opponent, manual: row.manual, status: st?.result ? "DONE" : row.status,
    winner: (st?.result ? st.result.winner : (row.winner as Side | null)) ?? null,
    loot: (row.loot as unknown as Loot | null) ?? null,
    storyStars: row.storyStars,
    log: log.slice(from),
    actor: running ? currentActor(st)!.id : null,
    choices: running ? legalActions(st) : [],
    // Le compteur avance une fois par tour, même après un buff instantané.
    wait: running
      ? Object.fromEntries((["A", "B"] as const).flatMap((side) => st.teams[side].flatMap((u) => [
          [u.id, Math.max(0, u.spellIn - (u.continuingTurn ? 0 : 1))],
          [`${u.id}:special`, Math.max(0, u.pIn - (u.continuingTurn ? 0 : 1))],
          [`${u.id}:tertiary`, Math.max(0, u.tIn - (u.continuingTurn ? 0 : 1))],
          [`${u.id}:ultimate`, Math.max(0, BATTLE.ultimateGaugeMax - u.ultimateGauge)],
        ])))
      : {},
    timeline: running ? timeline(st, 5) : [],
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
export async function startBattle(userId: string, opponent: string, manual: boolean, now = new Date(), storyCardIds?: string[]): Promise<BattleView> {
  const adventureMode = opponent.startsWith("dungeon:") ? "dungeon" : opponent.startsWith("raid:") ? "raid" : opponent.startsWith("tower:") ? "tower" : null;
  if (adventureMode) {
    const locked = await adventureLock(userId, adventureMode);
    if (locked) throw new BattleError(locked);
  }
  await sweepBattles(now);
  const story = parseStory(opponent);
  const slots = await getAttackTeam(userId);
  let storyCards: NonNullable<typeof slots[number]>[] | null = null;
  if (storyCardIds !== undefined) {
    if (!story || !Array.isArray(storyCardIds) || ![2, 4].includes(storyCardIds.length) || storyCardIds.some((id) => typeof id !== "string") || new Set(storyCardIds).size !== storyCardIds.length) throw new BattleError("Choisis 2 ou 4 cartes différentes pour l'histoire.");
    const owned = await prisma.card.findMany({ where: { id: { in: storyCardIds }, ownerId: userId, inAuction: false }, select: { id: true, ownerId: true, stars: true, weaponKey: true, finish: true, character: { select: { ...CHARACTER_SELECT, name: true, imageUrl: true } } } });
    const byId = new Map(owned.map((card) => [card.id, card]));
    storyCards = storyCardIds.map((id) => byId.get(id)).filter((card): card is (typeof owned)[number] => !!card);
    if (storyCards.length !== storyCardIds.length || new Set(storyCards.map((card) => card.character.id)).size !== storyCards.length) throw new BattleError("Choisis deux personnages différents qui t'appartiennent.");
  } else if (slots.some((s) => !s)) throw new BattleError("Ton équipe d'attaque doit compter 4 cartes.");
  const dungeonLevel = opponent.startsWith(DUNGEON_PREFIX) ? parseDungeonKey(opponent) : null;
  if (opponent.startsWith(DUNGEON_PREFIX) && dungeonLevel === null) throw new BattleError("Difficulté de donjon inconnue.");
  if (story) await checkStoryAccess(userId, story.universe, story.level);
  if (dungeonLevel) {
    const dungeon = dungeonOfKey(opponent)!;
    const progress = await prisma.dungeonProgress.findUnique({ where: { userId_dungeon: { userId, dungeon: dungeon.key } }, select: { maxLevel: true } });
    if (dungeonLevel > (progress?.maxLevel ?? 0) + 1) throw new BattleError("Difficulté verrouillée : gagne la précédente.");
  }
  const raid = parseRaid(opponent);
  if (raid) await checkRaidAccess(userId, raid.boss, raid.difficulty, now);
  const floor = parseTower(opponent);
  if (floor && floor > (await getTowerFloor(userId)) + 1) throw new BattleError("Étage verrouillé : gagne le précédent.");
  const mode: BattleMode = story ? "STORY" : raid ? "RAID" : floor ? "TOWER" : dungeonLevel ? "DUNGEON" : "TEST";
  // Un combat suivi à la fois et par mode. En histoire et dans la Tour, une défaite ne coûte rien : un combat laissé ouvert est abandonné pour en lancer un autre.
  if (manual && (story || floor || raid || dungeonLevel)) await prisma.battle.updateMany({ where: { userId, manual: true, status: "RUNNING", mode }, data: { status: "ABANDONED", winner: "B", endedAt: now } });
  if (manual && (await prisma.battle.count({ where: { userId, manual: true, status: "RUNNING", mode } })))
    throw new BattleError("Tu as déjà un combat en cours : termine-le ou abandonne-le.");
  const fitted = await equippedCards(userId, storyCards ?? slots as NonNullable<typeof slots[number]>[]);
  const mine = fitted.map((s) => ({ ...toBattleCard(s.character, s.stars, s.weaponKey), artifactStats: s.artifactStats }));
  const teams: BattleTeams = { A: mine, B: await opponentCards(opponent), scheduler: "gauge-v1", elements: "elements-v1" };
  const seed = Math.floor(Math.random() * 2 ** 31);
  if (!manual) {
    const result = battle(teams.A, teams.B, seededRandom(seed), { gauge: true });
    const row = await prisma.$transaction(async (tx) => {
      const won = result.winner === "A";
      const stars = story ? storyStars(won, result.log, teams.A.length) : null;
      const loot = story && won ? await settleStory(tx, userId, opponent, seed, stars!, now) : raid ? await settleRaid(tx, userId, opponent, seed, shareOf(result.log), won, now) : floor && won ? await settleTower(tx, userId, opponent, now) : dungeonLevel && won ? await settleDungeon(tx, userId, opponent, seed) : null;
      return tx.battle.create({
        data: {
          userId, mode, opponent, manual, seed, teams: toJson(teams), status: "DONE", winner: result.winner,
          log: toJson(result.log), loot: loot ? toJson(loot) : undefined, storyStars: stars, endedAt: now,
        },
      });
    });
    await track("battle_end", userId, { mode, opponent, manual: false, winner: result.winner, stars: row.storyStars, events: result.log.length, ryo: (row.loot as { ryo?: number } | null)?.ryo ?? 0 });
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

const isSpell = (x: unknown): x is Spell => x === "base" || x === "affinity" || x === "special" || x === "tertiary" || x === "ultimate";

/** Mode manuel : joue le choix du joueur, puis les cartes adverses, jusqu'au prochain choix. Renvoie les nouveaux événements. */
export async function playAction(userId: string, battleId: string, action: Action | null, now = new Date(), expectedSteps?: number): Promise<BattleView> {
  // action = null : la stratégie automatique joue à la place du joueur (bouton Auto) ; elle est enregistrée comme un choix du joueur
  if (action && (!isSpell(action.spell) || (action.target !== null && typeof action.target !== "string"))) throw new BattleError("Action invalide.");
  await sweepBattles(now);
  const row = await prisma.battle.findFirst({ where: { id: battleId, userId, manual: true } });
  if (!row) throw new BattleError("Combat introuvable.");
  if (row.status !== "RUNNING") throw new BattleError("Ce combat est terminé.");
  if (expectedSteps !== undefined && (!Number.isSafeInteger(expectedSteps) || expectedSteps < 0 || row.steps !== expectedSteps)) throw new BattleError("Action déjà jouée, recharge le combat.");
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
  let score: number | null = null;
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
    if (done && row.mode === "RAID") {
      loot = await settleRaid(tx, userId, row.opponent, row.seed, shareOf(done.log), done.winner === "A", now);
      await tx.battle.update({ where: { id: row.id }, data: { loot: toJson(loot) } });
    } else if (done?.winner === "A" && (row.mode === "STORY" || row.mode === "TOWER" || row.mode === "DUNGEON")) {
      score = row.mode === "STORY" ? storyStars(true, done.log, teams.A.length) : null;
      loot = row.mode === "STORY" ? await settleStory(tx, userId, row.opponent, row.seed, score!, now) : row.mode === "TOWER" ? await settleTower(tx, userId, row.opponent, now) : await settleDungeon(tx, userId, row.opponent, row.seed);
      await tx.battle.update({ where: { id: row.id }, data: { loot: toJson(loot), ...(score !== null ? { storyStars: score } : {}) } });
    } else if (done && row.mode === "STORY") {
      score = 0;
      await tx.battle.update({ where: { id: row.id }, data: { storyStars: 0 } });
    }
    });
  if (done) await track("battle_end", userId, { mode: row.mode, opponent: row.opponent, manual: true, winner: done.winner, stars: score, events: done.log.length, steps: row.steps + 1, durationMs: now.getTime() - row.createdAt.getTime(), ryo: (loot as { ryo?: number } | null)?.ryo ?? 0 });
  return toView({ ...row, steps: row.steps + 1, status: done ? "DONE" : "RUNNING", loot, storyStars: score ?? row.storyStars }, st, from);
}

/** Abandon d'un combat manuel en cours : compté comme perdu. */
export async function abandonBattle(userId: string, battleId: string, now = new Date()) {
  const res = await prisma.battle.updateMany({
    where: { id: battleId, userId, status: "RUNNING" },
    data: { status: "ABANDONED", winner: "B", endedAt: now },
  });
  if (res.count !== 1) throw new BattleError("Combat introuvable ou déjà terminé.");
  await track("battle_abandon", userId, { battleId });
}
