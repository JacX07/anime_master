// La Tour (docs/specs/pvm.md) : à chaque étage, 4 personnages tirés au hasard. Pur : aucune lecture en base.
// Les chiffres sont des valeurs de départ, à fixer au simulateur.

import type { Rarity } from "../generated/prisma/enums";

export const MAX_FLOOR = 500;
export const TOWER_PREFIX = "tower:";
export const towerKey = (floor: number) => `${TOWER_PREFIX}${floor}`;

const ORDER: Rarity[] = ["N", "R", "SR", "SSR", "UR"];
/** Écart de rareté des 4 ennemis (le dernier est le plus fort) */
/** Étages entre deux crans de rareté, et échelle des stats (valeurs de départ, voir `npm run simulate:tower`) */
const RARITY_EVERY = 30;
const SCALE_BASE = 0.5;
const SCALE_PER_FLOOR = 0.005;
const SPREAD = [-0.5, 0, 0, 0.5];

/** Raretés des 4 ennemis : montent d'un cran tous les 50 étages, jusqu'à UR à l'étage 200 */
export function floorRarities(floor: number): Rarity[] {
  const t = Math.min(4, (floor - 1) / RARITY_EVERY);
  return SPREAD.map((d) => ORDER[Math.max(0, Math.min(4, Math.floor(t + d + 0.5)))]);
}

/** Multiplicateur appliqué aux stats moyennes de la rareté de l'ennemi */
export const floorScale = (floor: number) => SCALE_BASE + SCALE_PER_FLOOR * (floor - 1);

/** Ryō du premier passage d'un étage (pas de gain en rejouant) */
export const towerRyo = (floor: number) => 20 + 3 * floor + (floor % 10 === 0 ? 100 : 0);
