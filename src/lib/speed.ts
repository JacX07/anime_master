// Vitesse de base des SSR/UR (90 à 110, 100 par défaut), choisie d'après l'impression de rapidité dans le lore.
// Voir docs/specs/combat.md « Vitesse et ordre de jeu ». Pas encore utilisée par le moteur.
import raw from "./speed-data.json";

const DATA = raw as Record<string, number>;
export const BASE_SPEED = 100;
export const speedOf = (characterId: number): number => DATA[characterId] ?? BASE_SPEED;
