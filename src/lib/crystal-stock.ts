// Stock de cristaux à recharge paresseuse (SPEC étape 4 bis, §1).
// Pur et sans dépendance : utilisable côté serveur et dans le navigateur (compte à rebours).

export const CRYSTAL_INTERVAL_MS = 2 * 60 * 1000;
export const MAX_CRYSTALS = 50;
/** Cadeau de bienvenue : 50 cartes en tout (SPEC §8) = 30 cristaux normaux + 20 tirages sur une bannière de catégorie au choix. */
export const WELCOME_CRYSTALS = 30;
export const WELCOME_DRAWS = 20;

export interface CrystalStock {
  /** Cristaux utilisables maintenant */
  available: number;
  /** Cristaux rechargés depuis `crystalsUpdatedAt` */
  elapsed: number;
  /** Arrivée du prochain cristal, ou null si le stock est plein */
  nextCrystalAt: Date | null;
}

export function crystalStock(crystals: number, updatedAt: Date, now: Date): CrystalStock {
  // Réserve pleine (ou dépassée par des achats) : plus de recharge automatique
  if (crystals >= MAX_CRYSTALS) return { available: crystals, elapsed: 0, nextCrystalAt: null };
  const since = Math.max(0, now.getTime() - updatedAt.getTime());
  const elapsed = Math.floor(since / CRYSTAL_INTERVAL_MS);
  const available = Math.min(MAX_CRYSTALS, crystals + elapsed);
  const nextCrystalAt = available >= MAX_CRYSTALS ? null : new Date(updatedAt.getTime() + (elapsed + 1) * CRYSTAL_INTERVAL_MS);
  return { available, elapsed, nextCrystalAt };
}

/**
 * Nouvel état après une dépense de `n` cristaux. On garde la progression vers le cristal suivant,
 * sauf si le stock était plein : la recharge repart alors de maintenant.
 */
export function afterSpend(crystals: number, updatedAt: Date, now: Date, n: number) {
  const stock = crystalStock(crystals, updatedAt, now);
  if (stock.available < n) throw new Error("Pas assez de cristaux");
  return {
    crystals: stock.available - n,
    crystalsUpdatedAt: stock.available >= MAX_CRYSTALS ? now : new Date(updatedAt.getTime() + stock.elapsed * CRYSTAL_INTERVAL_MS),
  };
}

/** Nouvel état après un gain de `n` cristaux (achat, succès) : le stock peut dépasser la limite sans perdre la progression de la recharge. */
export function afterGain(crystals: number, updatedAt: Date, now: Date, n: number) {
  const stock = crystalStock(crystals, updatedAt, now);
  return {
    crystals: stock.available + n,
    crystalsUpdatedAt: stock.available >= MAX_CRYSTALS ? now : new Date(updatedAt.getTime() + stock.elapsed * CRYSTAL_INTERVAL_MS),
  };
}
