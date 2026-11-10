// Énergie (v0.3.0, docs/specs/economie.md) : 1 par combat d'histoire ou de donjon, +1 toutes les 2 minutes jusqu'à 20.
// Même modèle que les cristaux : stock calculé à la lecture, pas de tâche planifiée. Pur : utilisable dans le navigateur.

export const MAX_ENERGY = 20;
export const ENERGY_INTERVAL_MS = 2 * 60 * 1000;
/** Modes qui consomment de l'énergie (la Tour est gratuite, les raids ont leurs propres règles). */
export const ENERGY_MODES = ["STORY", "DUNGEON"] as const;
export const ENERGY_COST = 1;

export interface EnergyStock { available: number; nextAt: Date | null }

export function energyStock(energy: number, updatedAt: Date, now: Date): EnergyStock {
  if (energy >= MAX_ENERGY) return { available: energy, nextAt: null };
  const elapsed = Math.floor(Math.max(0, now.getTime() - updatedAt.getTime()) / ENERGY_INTERVAL_MS);
  const available = Math.min(MAX_ENERGY, energy + elapsed);
  return { available, nextAt: available >= MAX_ENERGY ? null : new Date(updatedAt.getTime() + (elapsed + 1) * ENERGY_INTERVAL_MS) };
}

/** Nouvel état après une variation (dépense négative, remboursement positif) ; garde la progression vers l'unité suivante. */
export function energyAfter(energy: number, updatedAt: Date, now: Date, delta: number) {
  const elapsed = energy >= MAX_ENERGY ? 0 : Math.floor(Math.max(0, now.getTime() - updatedAt.getTime()) / ENERGY_INTERVAL_MS);
  const available = energyStock(energy, updatedAt, now).available;
  if (available + delta < 0) return null;
  return {
    energy: available + delta,
    energyUpdatedAt: available >= MAX_ENERGY ? now : new Date(updatedAt.getTime() + elapsed * ENERGY_INTERVAL_MS),
  };
}
