import "server-only";
import type { Rarity } from "@/generated/prisma/enums";
import { MAX_ADVENTURE_LEVEL, xpForLevel } from "./adventure";
import { getAdventure } from "./adventure-state";
import { afterGain } from "./crystal-stock";
import { prisma } from "./db";
import { ARTIFACT_SLOTS, DUNGEONS, artifactMainStat, artifactSubStats, type ArtifactSlot } from "./dungeons";
import { ARTIFACT_MAX_LEVEL, upgradedMainValue, upgradedSubStats } from "./artifact-upgrade";
import { DIFFICULTIES, RAID_BOSSES, RAID_RESOURCE } from "./raid";
import { LEVELS, RESOURCE_NAMES, UNIVERSES } from "./story";
import { MAX_FLOOR } from "./tower";

/** Outils de test sur la base de dev : jamais disponibles en production (build Vercel compris). */
export const devToolsEnabled = () => process.env.NODE_ENV !== "production";

export class DevToolError extends Error {}

function guard() {
  if (!devToolsEnabled()) throw new DevToolError("Indisponible en production.");
}
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.trunc(Number.isFinite(n) ? n : min)));

/** Clé d'objectif qui porte l'XP ajoutée à la main ; le reste vient des vrais objectifs. */
const DEV_XP_KEY = "dev:xp";

export const materialKeys = () => [...new Set([...Object.keys(RESOURCE_NAMES), RAID_RESOURCE])];

export function searchCharacters(q: string) {
  guard();
  return prisma.character.findMany({
    where: { name: { contains: q.trim(), mode: "insensitive" } },
    orderBy: { favourites: "desc" },
    take: 12,
    select: { id: true, name: true, rarity: true, imageUrl: true },
  });
}

/** Crée des cartes rattachées à un « tirage » vide (lotSize 0) que les statistiques ignorent, comme les dons admin. */
async function createCards(userId: string, characterIds: number[], stars: number) {
  const s = clamp(stars, 0, 5);
  return prisma.$transaction(async (tx) => {
    const opening = await tx.packOpening.create({ data: { userId, lotSize: 0, pityTriggered: "NONE" } });
    const chars = await tx.character.findMany({ where: { id: { in: [...new Set(characterIds)] } }, select: { id: true, rarity: true } });
    const rarity = new Map(chars.map((c) => [c.id, c.rarity as Rarity]));
    let created = 0;
    for (const id of characterIds) {
      const r = rarity.get(id);
      if (!r) continue;
      // Le verrou du compteur sérialise aussi les dons concurrents avec les vrais boosters.
      const character = await tx.character.update({ where: { id }, data: { pullCount: { increment: 1 } }, select: { pullCount: true } });
      const last = await tx.card.aggregate({ where: { characterId: id }, _max: { serial: true } });
      const serial = Math.max(character.pullCount, (last._max.serial ?? 0) + 1);
      if (serial !== character.pullCount) await tx.character.update({ where: { id }, data: { pullCount: serial } });
      await tx.card.create({ data: { ownerId: userId, characterId: id, serial, rarityAtPull: r, finish: "NORMAL", packOpeningId: opening.id, stars: s } });
      created++;
    }
    return created;
  }, { timeout: 30_000 });
}

export async function giveCharacter(userId: string, characterId: number, copies: number, stars: number) {
  guard();
  const n = await createCards(userId, Array(clamp(copies, 1, 50)).fill(characterId), stars);
  if (!n) throw new DevToolError("Personnage introuvable.");
  return n;
}

/** Lot au hasard parmi les personnages d'une rareté (sans doublon dans le lot si possible). */
export async function giveRandom(userId: string, rarity: Rarity, count: number, stars: number) {
  guard();
  const n = clamp(count, 1, 100);
  const ids = (await prisma.character.findMany({ where: { rarity }, select: { id: true } })).map((c) => c.id);
  if (!ids.length) throw new DevToolError("Aucun personnage de cette rareté.");
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const picked = Array.from({ length: n }, (_, i) => ids[i % ids.length]);
  return createCards(userId, picked, stars);
}

/** Éveil de toutes les cartes, ou de celles d'une rareté. */
export async function setStars(userId: string, stars: number, rarity: Rarity | "ALL") {
  guard();
  const r = await prisma.card.updateMany({ where: { ownerId: userId, ...(rarity === "ALL" ? {} : { character: { rarity } }) }, data: { stars: clamp(stars, 0, 5) } });
  return r.count;
}

/** Niveau voulu, mémorisé dans une clé sans XP pour être réappliqué après les autres outils. */
const TARGET_PREFIX = "dev:target:";

async function applyLevel(userId: string, target: number) {
  await getAdventure(userId); // enregistre d'abord l'XP des objectifs déjà remplis
  const records = await prisma.adventureRecord.findMany({ where: { userId, NOT: { key: { startsWith: "dev:" } } }, select: { xp: true } });
  const real = records.reduce((n, r) => n + r.xp, 0);
  const xp = Math.max(0, xpForLevel(target) - real);
  await prisma.$transaction([
    prisma.adventureRecord.upsert({ where: { userId_key: { userId, key: DEV_XP_KEY } }, create: { userId, key: DEV_XP_KEY, xp }, update: { xp } }),
    prisma.adventureRecord.deleteMany({ where: { userId, key: { startsWith: TARGET_PREFIX } } }),
    prisma.adventureRecord.create({ data: { userId, key: `${TARGET_PREFIX}${target}`, xp: 0 } }),
  ]);
  return { target, floorFromQuests: real > xpForLevel(target) };
}

/** Fixe le niveau d'Arpenteur : l'XP manquante est portée par un objectif « dev », les vrais objectifs restent intacts.
 *  Les récompenses de niveau (Ryō) sont versées au prochain affichage, comme en jeu. */
export async function setAdventureLevel(userId: string, level: number) {
  guard();
  return applyLevel(userId, clamp(level, 1, MAX_ADVENTURE_LEVEL));
}

/** Après un autre outil (histoire, Tour, cartes…), de nouveaux objectifs ont pu rapporter de l'XP : on revient au niveau voulu. */
export async function keepAdventureLevel(userId: string) {
  guard();
  const t = await prisma.adventureRecord.findFirst({ where: { userId, key: { startsWith: TARGET_PREFIX } }, select: { key: true } });
  if (t) await applyLevel(userId, Number(t.key.slice(TARGET_PREFIX.length)));
}

/** Histoire : tous les univers avant `universe` terminés (15 combats, 3 étoiles), puis `level` combats gagnés dans celui-ci. */
export async function setStory(userId: string, universe: string, level: number) {
  guard();
  const index = UNIVERSES.findIndex((u) => u.key === universe);
  if (index < 0) throw new DevToolError("Univers inconnu.");
  const lv = clamp(level, 0, LEVELS);
  const plan = UNIVERSES.slice(0, index + 1).map((u, i) => ({ universe: u.key, maxLevel: i < index ? LEVELS : lv }));
  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      await tx.storyProgress.upsert({ where: { userId_universe: { userId, universe: p.universe } }, create: { userId, ...p }, update: { maxLevel: p.maxLevel } });
      await tx.storyStageStar.deleteMany({ where: { userId, universe: p.universe, level: { gt: p.maxLevel } } });
      for (let l = 1; l <= p.maxLevel; l++) {
        await tx.storyStageStar.upsert({ where: { userId_universe_level: { userId, universe: p.universe, level: l } }, create: { userId, universe: p.universe, level: l, stars: 3 }, update: { stars: 3 } });
      }
    }
  }, { timeout: 30_000 });
  return plan.length;
}

export async function setTower(userId: string, floor: number) {
  guard();
  const f = clamp(floor, 0, MAX_FLOOR);
  await prisma.towerProgress.upsert({ where: { userId }, create: { userId, maxFloor: f }, update: { maxFloor: f, reachedAt: new Date() } });
  return f;
}

export async function setDungeon(userId: string, dungeon: string, level: number) {
  guard();
  if (!DUNGEONS.some((d) => d.key === dungeon)) throw new DevToolError("Donjon inconnu.");
  const l = clamp(level, 0, 10);
  await prisma.dungeonProgress.upsert({ where: { userId_dungeon: { userId, dungeon } }, create: { userId, dungeon, maxLevel: l }, update: { maxLevel: l } });
  return l;
}

/** Ryō par le journal comptable (le solde reste égal à la somme du journal). */
export async function addRyo(userId: string, amount: number) {
  guard();
  const d = clamp(amount, -1_000_000, 1_000_000);
  await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true } });
    if (u.balance + d < 0) throw new DevToolError(`Solde insuffisant (${u.balance} Ryō).`);
    await tx.user.update({ where: { id: userId }, data: { balance: { increment: d } } });
    await tx.currencyLedger.create({ data: { userId, amount: d, reason: "ADMIN", refId: "dev-tools" } });
  });
  return d;
}

export async function addCrystals(userId: string, amount: number) {
  guard();
  const d = clamp(amount, -100_000, 100_000);
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { crystals: true, crystalsUpdatedAt: true } });
  const next = afterGain(u.crystals, u.crystalsUpdatedAt, new Date(), d);
  if (next.crystals < 0) throw new DevToolError("Pas assez de cristaux à retirer.");
  await prisma.user.update({ where: { id: userId }, data: next });
  return next.crystals;
}

/** Matériaux : une clé précise, ou tous d'un coup. */
export async function addMaterials(userId: string, key: string | "ALL", amount: number) {
  guard();
  const all = materialKeys();
  const keys = key === "ALL" ? all : all.includes(key) ? [key] : [];
  if (!keys.length) throw new DevToolError("Matériau inconnu.");
  const q = clamp(amount, 1, 100_000);
  await prisma.$transaction(keys.map((k) => prisma.resourceStock.upsert({ where: { userId_key: { userId, key: k } }, create: { userId, key: k, quantity: q }, update: { quantity: { increment: q } } })));
  return keys.length;
}

/** Artefacts tirés comme en donjon (emplacement, stat principale, sous-stats), puis montés au niveau voulu. */
export async function giveArtifacts(userId: string, setKey: string | "ALL", rarity: Rarity, level: number, count: number) {
  guard();
  const sets = setKey === "ALL" ? DUNGEONS.map((d) => d.key) : DUNGEONS.some((d) => d.key === setKey) ? [setKey] : [];
  if (!sets.length) throw new DevToolError("Set inconnu.");
  const lv = clamp(level, 0, ARTIFACT_MAX_LEVEL);
  const n = clamp(count, 1, 50);
  const rows = [];
  for (const set of sets) for (let i = 0; i < n; i++) {
    // Un set complet par lot de 4 : chaque emplacement à tour de rôle.
    const slot: ArtifactSlot = ARTIFACT_SLOTS[i % ARTIFACT_SLOTS.length];
    const seed = Math.floor(Math.random() * 2 ** 31);
    const main = artifactMainStat(slot, rarity, seed);
    let value = main.value, subs = artifactSubStats(slot, rarity, seed ^ 0x7f4a7c15, main.stat);
    for (let l = 0; l < lv; l++) { value = upgradedMainValue(value, l); subs = upgradedSubStats(subs, l + 1, main.stat); }
    rows.push({ userId, setKey: set, slot, rarity, level: lv, mainStat: main.stat, mainValue: value, subStats: subs as unknown as object });
  }
  await prisma.artifact.createMany({ data: rows });
  return rows.length;
}

/** Tout le contenu ouvert : histoire terminée partout à 3 étoiles, Tour au sommet, donjons à 10, raids gagnés, niveau max. */
export async function unlockAll(userId: string) {
  guard();
  await setStory(userId, UNIVERSES[UNIVERSES.length - 1].key, LEVELS);
  await setTower(userId, MAX_FLOOR);
  for (const d of DUNGEONS) await setDungeon(userId, d.key, 10);
  await prisma.$transaction(RAID_BOSSES.flatMap((b) => DIFFICULTIES.map((d) => prisma.raidBest.upsert({
    where: { userId_boss_difficulty: { userId, boss: b.key, difficulty: d.key } },
    create: { userId, boss: b.key, difficulty: d.key, won: true, bestShare: 1 },
    update: { won: true, bestShare: 1 },
  }))));
  await setAdventureLevel(userId, MAX_ADVENTURE_LEVEL);
}
