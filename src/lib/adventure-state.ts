import { cache } from "react";
import { prisma } from "./db";
import { ACHIEVEMENTS } from "./achievements";
import { ADVENTURE_MODES, adventureLevel, adventureQuests, modeUnlocked, rankForLevel, xpForLevel, type AdventureMode } from "./adventure";

/** Reconstitue les objectifs depuis les données réelles, puis conserve définitivement XP et récompenses. */
async function loadAdventure(userId: string) {
  const [story, achievements, team, awakened, equipped, user, expedition, tower, dungeon, raid, battles] = await Promise.all([
    prisma.storyProgress.findMany({ where: { userId } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { key: true } }),
    prisma.battleTeam.findUnique({ where: { userId_kind: { userId, kind: "ATTACK" } }, include: { slots: { include: { card: { select: { ownerId: true } } } } } }),
    prisma.card.count({ where: { ownerId: userId, stars: { gt: 0 } } }),
    prisma.card.count({ where: { ownerId: userId, OR: [{ weaponKey: { not: null } }, { artifacts: { some: {} } }] } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { expeditionsDone: true } }),
    prisma.expedition.count({ where: { userId } }),
    prisma.towerProgress.findUnique({ where: { userId } }),
    prisma.dungeonProgress.findMany({ where: { userId } }),
    prisma.raidBest.findMany({ where: { userId } }),
    prisma.battle.findMany({ where: { userId, mode: { in: ["RAID", "TOWER", "DUNGEON"] } }, distinct: ["mode"], select: { mode: true } }),
  ]);
  const earned = new Set(achievements.map((a) => a.key));
  const quests = adventureQuests({ story, achievements: ACHIEVEMENTS.map((a) => ({ ...a, done: earned.has(a.key) })), team: team?.slots.filter((s) => s.card.ownerId === userId).length === 4,
    awakened: awakened > 0, equipped: equipped > 0, expedition: user.expeditionsDone > 0, towerFloor: tower?.maxFloor ?? 0,
    dungeonLevel: Math.max(0, ...dungeon.map((d) => d.maxLevel)), raidWon: raid.some((r) => r.won) });
  const legacy = new Set<AdventureMode>();
  if (expedition > 0) legacy.add("expeditions");
  if (tower || battles.some((b) => b.mode === "TOWER")) legacy.add("tower");
  if (dungeon.length || battles.some((b) => b.mode === "DUNGEON")) legacy.add("dungeon");
  if (raid.length || battles.some((b) => b.mode === "RAID")) legacy.add("raid");
  const records = await prisma.$transaction(async (tx) => {
    // Postgres : sérialise les décisions concurrentes pour ce joueur.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const saved = await tx.adventureRecord.findMany({ where: { userId } });
    const known = new Set(saved.map((r) => r.key));
    const fresh = [...quests.filter((q) => q.done).map((q) => ({ key: q.key, xp: q.xp })), ...[...legacy].map((key) => ({ key: `access:${key}`, xp: 0 }))].filter((q) => !known.has(q.key));
    if (fresh.length) await tx.adventureRecord.createMany({ data: fresh.map((r) => ({ userId, ...r })) });
    const xp = saved.reduce((n, r) => n + r.xp, 0) + fresh.reduce((n, r) => n + r.xp, 0);
    const level = adventureLevel(xp);
    for (let n = 2; n <= level; n++) {
      const key = `level:${n}`;
      if (known.has(key)) continue;
      await tx.adventureRecord.create({ data: { userId, key } });
      const reward = 25 + (n % 10 === 0 ? 100 : 0);
      await tx.user.update({ where: { id: userId }, data: { balance: { increment: reward } } });
      await tx.currencyLedger.create({ data: { userId, amount: reward, reason: "ACHIEVEMENT", refId: `adventure:${key}` } });
    }
    return [...saved, ...fresh];
  });
  const completed = new Set(records.map((r) => r.key));
  const xp = records.reduce((n, r) => n + r.xp, 0), level = adventureLevel(xp);
  const modes = ADVENTURE_MODES.map((mode) => ({ ...mode, unlocked: modeUnlocked(mode, level, story, completed.has(`access:${mode.key}`)), legacy: completed.has(`access:${mode.key}`) }));
  return { xp, level, rank: rankForLevel(level), floor: xpForLevel(level), next: level === 50 ? null : xpForLevel(level + 1), modes,
    quests: quests.map((q) => ({ ...q, done: completed.has(q.key), available: q.available && (q.href === "/equipe" || q.href === "/eveil" || q.href === "/inventaire" || q.href === "/histoire" || q.href === "/achievements" || modes.some((m) => m.href === q.href && m.unlocked)) })) };
}
export const getAdventure = cache(loadAdventure);

export async function adventureLock(userId: string, mode: AdventureMode) {
  const state = await getAdventure(userId);
  const entry = state.modes.find((m) => m.key === mode)!;
  return entry.unlocked ? null : `${entry.label} : niveau d’Arpenteur ${entry.level} et ${entry.worlds === 2 ? "deuxième univers terminé" : entry.storyLevel === 15 ? "premier univers terminé" : `combat ${entry.storyLevel} de One Piece remporté`}. Consulte les Quêtes.`;
}
