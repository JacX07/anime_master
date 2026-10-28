// Succès (SPEC étape 4, §6) : définis dans le code, vérifiés après chaque événement. Chacun ne se débloque qu'une fois
// (clé primaire userId + key) et crédite ses Ryō dans le journal (reason ACHIEVEMENT), dans la même transaction.

import { loadAnimeIndex } from "./anime";
import { prisma } from "./db";
import { notify } from "./notifications";

export interface AchievementDef {
  key: string;
  label: string;
  description: string;
  reward: number;
  /** Titre débloqué avec ce succès : on en équipe un seul, affiché à côté du pseudo */
  title: string;
  /** Cristaux spéciaux offerts (≈ 100 au total sur la vie d'un compte, SPEC étape 4 bis §6) */
  special?: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_pack", label: "Premier paquet", title: "Recrue", description: "Ouvrir ton premier paquet.", reward: 20 },
  { key: "first_ssr", label: "Éclat doré", title: "Étoile montante", description: "Obtenir une première carte SSR.", reward: 50, special: 5 },
  { key: "first_ur", label: "Rouge légendaire", title: "Rouge légendaire", description: "Obtenir une première carte UR.", reward: 200, special: 10 },
  { key: "first_holo", label: "Reflets", title: "Prisme", description: "Obtenir une première Holo.", reward: 30 },
  { key: "first_gold", label: "Pur or", title: "Main d'or", description: "Obtenir une première Gold.", reward: 300, special: 10 },
  { key: "unique_100", label: "Collectionneur", title: "Collectionneur", description: "Posséder 100 personnages différents.", reward: 100, special: 5 },
  { key: "unique_500", label: "Archiviste", title: "Archiviste", description: "Posséder 500 personnages différents.", reward: 300, special: 10 },
  { key: "unique_1000", label: "Conservateur", title: "Conservateur", description: "Posséder 1 000 personnages différents.", reward: 800, special: 15 },
  { key: "unique_2500", label: "Maître des cartes", title: "Maître des cartes", description: "Posséder 2 500 personnages différents.", reward: 2000, special: 25 },
  // Récompenses provisoires, à équilibrer (SPEC §6). Seuls comptent les anime listés dans l'album (au moins 5 personnages).
  { key: "series_complete_1", label: "Anime complet", title: "Fan", description: "Compléter un anime : posséder tous ses personnages (au moins 5).", reward: 150, special: 3 },
  { key: "series_complete_5", label: "Cinq collections", title: "Otaku", description: "Compléter 5 anime.", reward: 500, special: 1 },
  { key: "series_complete_10", label: "Bibliothécaire", title: "Sage des anime", description: "Compléter 10 anime.", reward: 1500, special: 1 },
  { key: "all_types", label: "Tous les types", title: "Polyvalent", description: "Posséder au moins un personnage de chaque type.", reward: 50, special: 5 },
  { key: "duel_win_1", label: "Premier duel", title: "Rival", description: "Gagner un duel.", reward: 30 },
  { key: "duel_win_10", label: "Duelliste", title: "Duelliste", description: "Gagner 10 duels.", reward: 150 },
  { key: "duel_win_50", label: "Champion", title: "Champion", description: "Gagner 50 duels.", reward: 500, special: 5 },
  { key: "first_auction_sale", label: "Première vente", title: "Marchand", description: "Vendre une carte aux enchères.", reward: 30 },
  { key: "first_expedition", label: "Première expédition", title: "Éclaireur", description: "Récupérer le butin d'une première expédition.", reward: 20 },
  { key: "expeditions_5", label: "Explorateur", title: "Explorateur", description: "Récupérer 5 expéditions (débloque un 2ᵉ emplacement).", reward: 100 },
  { key: "expeditions_20", label: "Chef d'expédition", title: "Chef d'expédition", description: "Récupérer 20 expéditions (débloque un 3ᵉ emplacement).", reward: 300 },
  { key: "first_triumph", label: "Triomphe", title: "Héros de l'arc", description: "Réussir une expédition en triomphe.", reward: 50 },
  { key: "first_trade", label: "Premier échange", title: "Négociant", description: "Conclure un échange avec un joueur.", reward: 30, special: 5 },
];

/** État du joueur dont dépendent les succès. */
export interface AchievementFacts {
  openings: number;
  hasSSR: boolean;
  hasUR: boolean;
  hasHolo: boolean;
  hasGold: boolean;
  unique: number;
  /** Nombre d'anime de l'album dont tous les personnages sont possédés */
  completedAnime: number;
  types: number;
  auctionSales: number;
  trades: number;
  duelWins: number;
  expeditions: number;
  triumphs: number;
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
    series_complete_1: f.completedAnime >= 1,
    series_complete_5: f.completedAnime >= 5,
    series_complete_10: f.completedAnime >= 10,
    all_types: f.types >= 5,
    first_auction_sale: f.auctionSales >= 1,
    first_trade: f.trades >= 1,
    duel_win_1: f.duelWins >= 1,
    duel_win_10: f.duelWins >= 10,
    duel_win_50: f.duelWins >= 50,
    first_expedition: f.expeditions >= 1,
    expeditions_5: f.expeditions >= 5,
    expeditions_20: f.expeditions >= 20,
    first_triumph: f.triumphs >= 1,
  };
  return ACHIEVEMENTS.filter((a) => ok[a.key]).map((a) => a.key);
}

async function gather(userId: string): Promise<AchievementFacts> {
  const [openings, owned, auctionSales, trades, duelWins, expeditions, triumphs] = await Promise.all([
    prisma.packOpening.count({ where: { userId } }),
    prisma.card.findMany({ where: { ownerId: userId }, select: { characterId: true, finish: true, rarityAtPull: true, character: { select: { rarity: true, type: true } } } }),
    prisma.auction.count({ where: { sellerId: userId, status: "SOLD" } }),
    prisma.trade.count({ where: { status: "ACCEPTED", OR: [{ fromId: userId }, { toId: userId }] } }),
    prisma.duel.count({ where: { winnerId: userId, status: { in: ["DONE", "FORFEIT"] } } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { expeditionsDone: true } }).then((u) => u.expeditionsDone),
    prisma.expedition.count({ where: { userId, outcome: "TRIUMPH" } }),
  ]);
  const ids = new Set(owned.map((c) => c.characterId));
  const rarities = new Set(owned.flatMap((c) => [c.rarityAtPull, c.character.rarity]));
  // Anime complets : les anime de l'album (src/lib/anime.ts) dont tous les personnages sont possédés
  const anime = await loadAnimeIndex();
  const completedAnime = anime.listed.filter((a) => a.characterIds.every((id) => ids.has(id))).length;
  return {
    openings,
    hasSSR: rarities.has("SSR"),
    hasUR: rarities.has("UR"),
    hasHolo: owned.some((c) => c.finish === "HOLO"),
    hasGold: owned.some((c) => c.finish === "GOLD"),
    unique: ids.size,
    completedAnime,
    types: new Set(owned.map((c) => c.character.type)).size,
    auctionSales,
    trades,
    duelWins,
    expeditions,
    triumphs,
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

/** Titre associé à une clé de succès (null si la clé est inconnue). */
export const titleOf = (key: string | null | undefined) => ACHIEVEMENTS.find((a) => a.key === key)?.title ?? null;
