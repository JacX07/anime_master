// Succès (SPEC étape 4, §6) : définis dans le code, vérifiés après chaque événement. Chacun ne se débloque qu'une fois
// (clé primaire userId + key). Le déblocage n'attribue rien : la récompense (Ryō + cristaux normaux selon le palier) se
// récupère une seule fois par `claimAchievement`, dans une transaction verrouillée (docs/specs/economie.md).

import { afterGain } from "./crystal-stock";
import { loadAnimeIndex } from "./anime";
import { prisma } from "./db";
import { track } from "./events";
import { notify } from "./notifications";

export type Tier = "facile" | "moyen" | "difficile" | "légendaire";

/** Cristaux normaux offerts à la récupération, selon la difficulté (docs/specs/economie.md, « Succès et quêtes périodiques »). */
export const CRYSTALS_BY_TIER: Record<Tier, number> = { facile: 5, moyen: 10, difficile: 25, légendaire: 50 };

export interface AchievementDef {
  key: string;
  label: string;
  description: string;
  /** Ryō versés à la récupération */
  reward: number;
  tier: Tier;
  /** Titre débloqué avec ce succès : on en équipe un seul, affiché à côté du pseudo */
  title: string;
  /** Seuil de puissance de collection, doublons compris. */
  powerRequired?: number;
}

export const crystalsOf = (def: AchievementDef) => CRYSTALS_BY_TIER[def.tier];

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "power_100k", label: "L’éveil de la puissance", title: "Aura naissante", description: "Atteindre 100 000 de puissance de collection (doublons compris).", powerRequired: 100_000, reward: 100, tier: "facile" },
  { key: "power_500k", label: "Une force qui compte", title: "Force montante", description: "Atteindre 500 000 de puissance de collection (doublons compris).", powerRequired: 500_000, reward: 250, tier: "moyen" },
  { key: "power_1m", label: "Le cap du million", title: "Puissance déchaînée", description: "Atteindre 1 000 000 de puissance de collection (doublons compris).", powerRequired: 1_000_000, reward: 500, tier: "moyen" },
  { key: "power_5m", label: "Au-delà des limites", title: "Briseur de limites", description: "Atteindre 5 000 000 de puissance de collection (doublons compris).", powerRequired: 5_000_000, reward: 1000, tier: "difficile" },
  { key: "power_10m", label: "Force colossale", title: "Colosse", description: "Atteindre 10 000 000 de puissance de collection (doublons compris).", powerRequired: 10_000_000, reward: 2000, tier: "difficile" },
  { key: "power_50m", label: "Domination absolue", title: "Souverain de puissance", description: "Atteindre 50 000 000 de puissance de collection (doublons compris).", powerRequired: 50_000_000, reward: 5000, tier: "légendaire" },
  { key: "power_100m", label: "Une puissance mythique", title: "Force de la nature", description: "Atteindre 100 000 000 de puissance de collection (doublons compris).", powerRequired: 100_000_000, reward: 10000, tier: "légendaire" },
  { key: "first_pack", label: "Premier paquet", title: "Recrue", description: "Ouvrir ton premier paquet.", reward: 20, tier: "facile" },
  { key: "first_ssr", label: "Éclat doré", title: "Étoile montante", description: "Obtenir une première carte SSR.", reward: 50, tier: "moyen" },
  { key: "first_ur", label: "Rouge légendaire", title: "Rouge légendaire", description: "Obtenir une première carte UR.", reward: 200, tier: "difficile" },
  { key: "first_holo", label: "Reflets", title: "Prisme", description: "Obtenir une première Holo.", reward: 30, tier: "facile" },
  { key: "first_gold", label: "Pur or", title: "Main d'or", description: "Obtenir une première Gold.", reward: 300, tier: "difficile" },
  { key: "unique_100", label: "Collectionneur", title: "Collectionneur", description: "Posséder 100 personnages différents.", reward: 100, tier: "moyen" },
  { key: "unique_500", label: "Archiviste", title: "Archiviste", description: "Posséder 500 personnages différents.", reward: 300, tier: "difficile" },
  { key: "unique_1000", label: "Conservateur", title: "Conservateur", description: "Posséder 1 000 personnages différents.", reward: 800, tier: "difficile" },
  { key: "unique_2500", label: "Maître des cartes", title: "Maître des cartes", description: "Posséder 2 500 personnages différents.", reward: 2000, tier: "légendaire" },
  // Récompenses provisoires, à équilibrer (SPEC §6). Seuls comptent les anime listés dans l'album (au moins 5 personnages).
  { key: "series_complete_1", label: "Anime complet", title: "Fan", description: "Compléter un anime : posséder tous ses personnages (au moins 5).", reward: 150, tier: "moyen" },
  { key: "series_complete_5", label: "Cinq collections", title: "Otaku", description: "Compléter 5 anime.", reward: 500, tier: "difficile" },
  { key: "series_complete_10", label: "Bibliothécaire", title: "Sage des anime", description: "Compléter 10 anime.", reward: 1500, tier: "légendaire" },
  { key: "all_types", label: "Tous les types", title: "Polyvalent", description: "Posséder au moins un personnage de chaque type.", reward: 50, tier: "moyen" },
  { key: "duel_win_1", label: "Premier duel", title: "Rival", description: "Gagner un duel.", reward: 30, tier: "facile" },
  { key: "duel_win_10", label: "Duelliste", title: "Duelliste", description: "Gagner 10 duels.", reward: 150, tier: "moyen" },
  { key: "duel_win_50", label: "Champion", title: "Champion", description: "Gagner 50 duels.", reward: 500, tier: "difficile" },
  { key: "first_auction_sale", label: "Première vente", title: "Marchand", description: "Vendre une carte aux enchères.", reward: 30, tier: "facile" },
  { key: "first_expedition", label: "Première expédition", title: "Éclaireur", description: "Récupérer le butin d'une première expédition.", reward: 20, tier: "facile" },
  { key: "expeditions_5", label: "Explorateur", title: "Explorateur", description: "Récupérer 5 expéditions (débloque un 2ᵉ emplacement).", reward: 100, tier: "moyen" },
  { key: "expeditions_20", label: "Chef d'expédition", title: "Chef d'expédition", description: "Récupérer 20 expéditions (débloque un 3ᵉ emplacement).", reward: 300, tier: "difficile" },
  { key: "first_triumph", label: "Triomphe", title: "Héros de l'arc", description: "Réussir une expédition en triomphe.", reward: 50, tier: "moyen" },
  { key: "first_trade", label: "Premier échange", title: "Négociant", description: "Conclure un échange avec un joueur.", reward: 30, tier: "facile" },
];

/** État du joueur dont dépendent les succès. */
export interface AchievementFacts {
  collectionPower: number;
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
  return ACHIEVEMENTS.filter((a) => a.powerRequired !== undefined ? f.collectionPower >= a.powerRequired : ok[a.key]).map((a) => a.key);
}

async function gather(userId: string): Promise<AchievementFacts> {
  const [openings, owned, auctionSales, trades, duelWins, expeditions, triumphs] = await Promise.all([
    prisma.packOpening.count({ where: { userId } }),
    prisma.card.findMany({ where: { ownerId: userId }, select: { characterId: true, finish: true, rarityAtPull: true, character: { select: { rarity: true, type: true, power: true } } } }),
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
    collectionPower: owned.reduce((total, card) => total + card.character.power, 0),
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
 * Débloque les succès atteints par ce joueur et renvoie ceux qui viennent de l'être. Aucune récompense ici : elle se
 * récupère ensuite (`claimAchievement`). Chaque déblocage a sa propre transaction : si deux vérifications se croisent,
 * la clé primaire n'en laisse passer qu'une.
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
        await notify(tx, userId, "ACHIEVEMENT", { label: def.label, amount: def.reward, crystals: crystalsOf(def) });
      });
      unlocked.push(def);
      await track("achievement", userId, { key });
    } catch (err) {
      // Clé déjà prise par une vérification concurrente : rien à faire
      if (!(err instanceof Error && /Unique constraint|P2002/.test(err.message))) throw err;
    }
  }
  return unlocked;
}

export class AchievementError extends Error {}

/**
 * Récupère une seule fois la récompense d'un succès débloqué. Le verrou sur le joueur sérialise les demandes simultanées
 * (double clic) ; le journal (`reason = ACHIEVEMENT`, `refId` = clé) fait foi : un succès déjà payé renvoie `claimed: false`,
 * y compris ceux payés avant ce changement.
 */
export async function claimAchievement(userId: string, key: string, now = new Date()) {
  const def = ACHIEVEMENTS.find((a) => a.key === key);
  if (!def) throw new AchievementError("Succès inconnu.");
  return prisma.$transaction(async (tx) => {
    // Postgres : sérialise les demandes concurrentes de ce joueur.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const unlocked = await tx.userAchievement.findUnique({ where: { userId_key: { userId, key } }, select: { key: true } });
    if (!unlocked) throw new AchievementError("Ce succès n’est pas encore débloqué.");
    const paid = await tx.currencyLedger.findFirst({ where: { userId, reason: "ACHIEVEMENT", refId: key }, select: { id: true } });
    if (paid) return { claimed: false as const, ryo: 0, crystals: 0 };
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { crystals: true, crystalsUpdatedAt: true } });
    const crystals = crystalsOf(def);
    await tx.user.update({ where: { id: userId }, data: { balance: { increment: def.reward }, ...afterGain(user.crystals, user.crystalsUpdatedAt, now, crystals) } });
    await tx.currencyLedger.create({ data: { userId, amount: def.reward, reason: "ACHIEVEMENT", refId: key } });
    return { claimed: true as const, ryo: def.reward, crystals };
  });
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
  const [rows, paid] = await Promise.all([
    prisma.userAchievement.findMany({ where: { userId }, select: { key: true, unlockedAt: true } }),
    prisma.currencyLedger.findMany({ where: { userId, reason: "ACHIEVEMENT", refId: { in: ACHIEVEMENTS.map((a) => a.key) } }, select: { refId: true } }),
  ]);
  const at = new Map(rows.map((r) => [r.key, r.unlockedAt]));
  const claimed = new Set(paid.map((p) => p.refId));
  return ACHIEVEMENTS.map((a) => ({ ...a, crystals: crystalsOf(a), unlockedAt: at.get(a.key) ?? null, claimed: claimed.has(a.key) }));
}

/** Titre associé à une clé de succès (null si la clé est inconnue). */
export const titleOf = (key: string | null | undefined) => ACHIEVEMENTS.find((a) => a.key === key)?.title ?? null;
