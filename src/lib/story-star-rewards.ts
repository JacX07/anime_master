// Paliers de récompense d'étoiles par univers (docs/specs/pvm.md, « Paliers d'étoiles »). Pur, sans base.
import { LEVELS, type Universe } from "./story";

/** Étoiles possibles dans un univers : 3 par combat. */
export const UNIVERSE_MAX_STARS = LEVELS * 3;

export interface StarTier {
  tier: number;
  /** Étoiles à avoir dans l'univers */
  stars: number;
  ryo: number;
  crystals: number;
  /** Unités de ressource d'éveil de l'univers (avant facteur de l'univers) */
  units: number;
  /** Unités de ressource d'arme légendaire */
  weapon: number;
  /** Palier bonus : compte les étoiles bonus (victoires en duo) au lieu des étoiles (v0.3.0) */
  duo?: boolean;
}

/** Valeurs de départ, à équilibrer. Le dernier palier (toutes les étoiles) est le plus généreux. */
export const STAR_TIERS: readonly StarTier[] = [
  { tier: 1, stars: 12, ryo: 150, crystals: 2, units: 20, weapon: 0 },
  { tier: 2, stars: 24, ryo: 300, crystals: 3, units: 40, weapon: 0 },
  { tier: 3, stars: 36, ryo: 500, crystals: 5, units: 60, weapon: 0 },
  { tier: 4, stars: UNIVERSE_MAX_STARS, ryo: 1000, crystals: 10, units: 100, weapon: 3 },
  // Palier bonus : les 15 combats gagnés en duo
  { tier: 5, stars: LEVELS, ryo: 500, crystals: 15, units: 0, weapon: 0, duo: true },
];
/** Paliers d'étoiles ordinaires (la barre de progression ignore le palier bonus). */
export const MAIN_STAR_TIERS = STAR_TIERS.filter((t) => !t.duo);

export const starTier = (tier: number) => STAR_TIERS.find((t) => t.tier === tier);

/** Butin d'un palier : les unités suivent le facteur de butin de l'univers, comme les drops de combat. */
export function starTierLoot(universe: Universe, t: StarTier) {
  const resources: Record<string, number> = t.units ? { [universe.resource]: Math.round(t.units * universe.rewardFactor) } : {};
  if (t.weapon) resources[universe.weaponResource] = t.weapon;
  return { ryo: t.ryo, crystals: t.crystals, resources };
}
