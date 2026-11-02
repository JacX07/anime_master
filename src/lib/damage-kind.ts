import type { CardType } from "../generated/prisma/enums";

export type DamageKind = "physical" | "magic";
const JUJUTSU_KAISEN = 113415;
/** Physique par défaut ; magique pour les cartes Magie et Jujutsu Kaisen (bonus de set, docs/specs/donjons.md). */
export function damageKind(card: { characterId: number; type: CardType; franchiseId: number | null }): DamageKind {
  return card.type === "MAGIE" || card.franchiseId === JUJUTSU_KAISEN ? "magic" : "physical";
}
