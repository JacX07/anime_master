// Succès (SPEC étape 4, §6) : définis dans le code, vérifiés après chaque événement. Chacun ne se débloque qu'une fois
// (clé primaire userId + key) et crédite ses Ryō dans le journal (reason ACHIEVEMENT), dans la même transaction.

import { prisma } from "./db";
import { notify } from "./notifications";

export interface AchievementDef {
  key: string;
  label: string;
  description: string;
  reward: number;
  /** Cristaux spéciaux offerts (≈ 100 au total sur la vie d'un compte, SPEC étape 4 bis §6) */
  special?: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_pack", label: "Premier paquet", description: "Ouvrir ton premier paquet.", reward: 20 },
  { key: "first_ssr", label: "Éclat doré", description: "Obtenir une première carte SSR.", reward: 50, special: 5 },
  { key: "first_ur", label: "Rouge légendaire", description: "Obtenir une première carte UR.", reward: 200, special: 10 },
  { key: "first_holo", label: "Reflets", description: "Obtenir une première Holo.", reward: 30 },
  { key: "first_gold", label: "Pur or", description: "Obtenir une première Gold.", reward: 300, special: 10 },
  { key: "unique_100", label: "Collectionneur", description: "Posséder 100 personnages différents.", reward: 100, special: 5 },
  { key: "unique_500", label: "Archiviste", description: "Posséder 500 personnages différents.", reward: 300, special: 10 },
  { key: "unique_1000", label: "Conservateur", description: "Posséder 1 000 personnages différents.", reward: 800, special: 15 },
  { key: "unique_2500", label: "Maître des cartes", description: "Posséder 2 500 personnages différents.", reward: 2000, special: 25 },
  { key: "series_complete", label: "Série complète", description: `Posséder tous les personnages d'une série (au moins ${3}).`, reward: 150, special: 5 },
  { key: "all_types", label: "Tous les types", description: "Posséder au moins un personnage de chaque type.", reward: 50, special: 5 },
  { key: "duel_win_1", label: "Premier duel", description: "Gagner un duel.", reward: 30 },
  { key: "duel_win_10", label: "Duelliste", description: "Gagner 10 duels.", reward: 150 },
  { key: "duel_win_50", label: "Champion", description: "Gagner 50 duels.", reward: 500, special: 5 },
  { key: "first_auction_sale", label: "Première vente", description: "Vendre une carte aux enchères.", reward: 30 },
  { key: "first_trade", label: "Premier échange", description: "Conclure un échange avec un joueur.", reward: 30, special: 5 },
];

const MIN_SERIES_SIZE = 3;

/** État du joueur dont dépendent les succès. */
export interface AchievementFacts {
  openings: number;
  hasSSR: boolean;
  hasUR: boolean;
  hasHolo: boolean;
  hasGold: boolean;
  unique: number;
  completedSeries: boolean;
  types: number;
  auctionSales: number;
  trades: number;
  duelWins: number;
}

/** Condition de chaque succès : pure, testable sans base. */
export function earned(f: AchievementFacts): string[] {
  const ok: Record<string, boolean> = {
    first_pack: f.openings >= 1,
    first_ssr: f.hasSSR,
    first_ur: f.hasUR,
    first_holo: f.hasHolo,
    first_gold: f.hasGold,
    unique_100: f.unique >= 100,
    unique_500: f.unique >= 500,
    unique_1000: f.unique >= 1000,
    unique_2500: f.unique >= 2500,
    series_complete: f.completedSeries,
    all_types: f.types >= 5,
    first_auction_sale: f.auctionSales >= 1,
    first_trade: f.trades >= 1,
    duel_win_1: f.duelWins >= 1,
    duel_win_10: f.duelWins >= 10,
    duel_win_50: f.duelWins >= 50,
  };
  return ACHIEVEMENTS.filter((a) => ok[a.key]).map((a) => a.key);
}

async function gather(userId: string): Promise<AchievementFacts> {
  const [openings, owned, auctionSales, trades, duelWins] = await Promise.all([
    prisma.packOpening.count({ where: { userId } }),
    prisma.card.findMany({ where: { ownerId: userId }, select: { characterId: true, finish: true, rarityAtPull: true, character: { select: { rarity: true, type: true } } } }),
    prisma.auction.count({ where: { sellerId: userId, status: "SOLD" } }),
    prisma.trade.count({ where: { status: "ACCEPTED", OR: [{ fromId: userId }, { toId: userId }] } }),
    prisma.duel.count({ where: { winnerId: userId, status: { in: ["DONE", "FORFEIT"] } } }),
  ]);
  const ids = new Set(owned.map((c) => c.characterId));
  const rarities = new Set(owned.flatMap((c) => [c.rarityAtPull, c.character.rarity]));
  // Série complète : parmi les séries des personnages possédés, une dont tous les personnages sont possédés
  let completedSeries = false;
  if (ids.size >= MIN_SERIES_SIZE) {
    const mine = await prisma.characterMedia.findMany({ where: { characterId: { in: [...ids] } }, select: { mediaId: true } });
    const ownedPerMedia = new Map<number, number>();
    for (const m of mine) ownedPerMedia.set(m.mediaId, (ownedPerMedia.get(m.mediaId) ?? 0) + 1);
    const candidates = [...ownedPerMedia].filter(([, n]) => n >= MIN_SERIES_SIZE).map(([id]) => id);
    if (candidates.length > 0) {
      const totals = await prisma.characterMedia.groupBy({ by: ["mediaId"], where: { mediaId: { in: candidates }, character: { disabled: false } }, _count: { _all: true } });
      completedSeries = totals.some((t) => t._count._all === ownedPerMedia.get(t.mediaId));
    }
  }
  return {
    openings,
    hasSSR: rarities.has("SSR"),
    hasUR: rarities.has("UR"),
    hasHolo: owned.some((c) => c.finish === "HOLO"),
    hasGold: owned.some((c) => c.finish === "GOLD"),
    unique: ids.size,
    completedSeries,
    types: new Set(owned.map((c) => c.character.type)).size,
    auctionSales,
    trades,
    duelWins,
  };
}

/**
 * Débloque les succès atteints par ce joueur et renvoie ceux qui viennent de l'être.
 * Chaque déblocage a sa propre transaction : si deux vérifications se croisent, la clé primaire n'en laisse passer qu'une.
 */
export async function checkAchievements(userId: string): Promise<AchievementDef[]> {
  const [facts, have] = await Promise.all([gather(userId), prisma.userAchievement.findMany({ where: { userId }, select: { key: true } })]);
  const owned = new Set(have.map((h) => h.key));
  const unlocked: AchievementDef[] = [];
  for (const key of earned(facts)) {
    if (owned.has(key)) continue;
    const def = ACHIEVEMENTS.find((a) => a.key === key)!;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.userAchievement.create({ data: { userId, key } });
        await tx.user.update({ where: { id: userId }, data: { balance: { increment: def.reward } } });
        await tx.currencyLedger.create({ data: { userId, amount: def.reward, reason: "ACHIEVEMENT", refId: key } });
        if (def.special) {
          await tx.user.update({ where: { id: userId }, data: { specialCrystals: { increment: def.special } } });
          await tx.specialCrystalLedger.create({ data: { userId, amount: def.special, reason: "ACHIEVEMENT", refId: key } });
        }
        await notify(tx, userId, "ACHIEVEMENT", { label: def.label, amount: def.reward, special: def.special ?? 0 });
      });
      unlocked.push(def);
    } catch (err) {
      // Clé déjà prise par une vérification concurrente : rien à faire
      if (!(err instanceof Error && /Unique constraint|P2002/.test(err.message))) throw err;
    }
  }
  return unlocked;
}

/** Vérification sans jamais faire échouer l'action qui l'a provoquée. */
export async function checkAchievementsSafe(...userIds: string[]) {
  for (const id of userIds) {
    try {
      await checkAchievements(id);
    } catch (err) {
      console.error("Échec de la vérification des succès :", err);
    }
  }
}

export async function listAchievements(userId: string) {
  const rows = await prisma.userAchievement.findMany({ where: { userId }, select: { key: true, unlockedAt: true } });
  const at = new Map(rows.map((r) => [r.key, r.unlockedAt]));
  return ACHIEVEMENTS.map((a) => ({ ...a, unlockedAt: at.get(a.key) ?? null }));
}
