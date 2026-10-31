// Éveil des étoiles 1 à 3 (docs/specs/pvm.md, « Ressources d'éveil »). Pur : coûts seulement.
// Étoiles 4 et 5 : cœurs de brèche du raid et un doublon du personnage (SSR et UR seulement).

import type { Rarity } from "../generated/prisma/enums";
import { RAID_RESOURCE } from "./raid";
import { COMMON_RESOURCE, UNIVERSES, type Universe } from "./story";

export const STORY_MAX_STARS = 3;
export const MAX_STARS = 5;

/** Cœurs de brèche pour l'étoile 4 puis 5 d'un SSR ; l'UR paie le double. N, R et SR s'arrêtent à 3★. */
const RAID_HEARTS: Partial<Record<Rarity, [number, number]>> = { SSR: [60, 120], UR: [120, 240] };
/** Peut-on viser cette étoile ? (1 à 3 pour tous, 4 et 5 pour SSR et UR) */
export const canAwaken = (rarity: Rarity, toStar: number) => toStar >= 1 && (toStar <= STORY_MAX_STARS || (toStar <= MAX_STARS && !!RAID_HEARTS[rarity]));
/** Les étoiles 4 et 5 consomment aussi un doublon. */
export const needsDuplicate = (toStar: number) => toStar > STORY_MAX_STARS;

/** Coût total (ressources confondues) pour passer de 0 à 3★. */
export const AWAKEN_TOTAL: Record<Rarity, number> = { N: 25, R: 50, SR: 100, SSR: 200, UR: 400 };

/** Part cumulée du coût total après chaque étoile : 1★ 20 %, 2★ 30 %, 3★ 50 %. */
const CUMULATIVE = [0.2, 0.5, 1];
/** Une carte d'un anime sans univers paie 60 % du total, en ressource commune seulement. */
const NO_UNIVERSE_FACTOR = 0.6;

export type Cost = { key: string; quantity: number }[];

/** Univers dont fait partie une franchise (le premier de la liste si plusieurs), ou null. */
export const universeOfFranchise = (franchiseId: number | null): Universe | null =>
  franchiseId == null ? null : UNIVERSES.find((u) => u.franchiseIds.includes(franchiseId)) ?? null;

/** Coût pour passer à l'étoile `toStar` (1 à 3). Arrondi cumulé : la somme des trois étapes donne exactement le total. */
export function awakenCost(rarity: Rarity, toStar: number, universe: Universe | null): Cost {
  if (!Number.isInteger(toStar) || !canAwaken(rarity, toStar)) throw new RangeError("Étoile impossible pour cette rareté");
  if (toStar > STORY_MAX_STARS) return [{ key: RAID_RESOURCE, quantity: RAID_HEARTS[rarity]![toStar - 4] }];
  const total = Math.round(AWAKEN_TOTAL[rarity] * (universe ? 1 : NO_UNIVERSE_FACTOR));
  const upTo = (star: number) => Math.round(total * CUMULATIVE[star - 1]);
  const step = upTo(toStar) - (toStar > 1 ? upTo(toStar - 1) : 0);
  if (!universe) return [{ key: COMMON_RESOURCE, quantity: step }];
  const own = Math.floor(step / 2);
  return [{ key: COMMON_RESOURCE, quantity: step - own }, { key: universe.resource, quantity: own }].filter((c) => c.quantity > 0);
}
