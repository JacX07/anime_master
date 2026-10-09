// Stock de paquets à recharge paresseuse (SPEC étape 2, §3).
// Pur et sans dépendance : utilisable côté serveur et dans le navigateur (compte à rebours).

export const PACK_INTERVAL_MS = 10 * 60 * 1000;
export const MAX_PACKS = 10;
export const WELCOME_PACKS = 10;

export interface PackStock {
  /** Paquets ouvrables maintenant */
  available: number;
  /** Paquets rechargés depuis `lastPackAt` */
  elapsed: number;
  /** Arrivée du prochain paquet, ou null si le stock est plein */
  nextPackAt: Date | null;
}

export function packStock(packsStored: number, lastPackAt: Date, now: Date): PackStock {
  const since = Math.max(0, now.getTime() - lastPackAt.getTime());
  const elapsed = Math.floor(since / PACK_INTERVAL_MS);
  const available = Math.min(MAX_PACKS, packsStored + elapsed);
  const nextPackAt =
    available >= MAX_PACKS ? null : new Date(lastPackAt.getTime() + (elapsed + 1) * PACK_INTERVAL_MS);
  return { available, elapsed, nextPackAt };
}

/**
 * Nouvel état après l'ouverture d'un paquet. On garde la progression vers le paquet suivant,
 * sauf si le stock était plein : la recharge repart alors de maintenant.
 */
export function afterOpening(packsStored: number, lastPackAt: Date, now: Date) {
  const stock = packStock(packsStored, lastPackAt, now);
  if (stock.available < 1) throw new Error("Aucun paquet disponible");
  return {
    packsStored: stock.available - 1,
    lastPackAt:
      stock.available >= MAX_PACKS ? now : new Date(lastPackAt.getTime() + stock.elapsed * PACK_INTERVAL_MS),
  };
}
