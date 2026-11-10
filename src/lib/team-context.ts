// Données de l'écran de préparation commun (histoire, Tour, donjons, raids) : cartes jouables, équipe d'attaque, squads nommées.

import { getAttackTeam, getStoryRoster } from "./battles";
import { prisma } from "./db";
import type { SavedSquad } from "./squads";

export async function getTeamContext(userId: string) {
  const [ownedCards, attack, squads] = await Promise.all([
    getStoryRoster(userId),
    getAttackTeam(userId),
    prisma.squad.findMany({ where: { userId }, orderBy: { id: "asc" }, select: { id: true, name: true, cardIds: true } }),
  ]);
  return {
    ownedCards,
    attackIds: attack.map((c) => c?.id ?? null),
    squads: squads.map((s): SavedSquad => ({ id: s.id, name: s.name, slots: Array.from({ length: 4 }, (_, i) => { const id = Array.isArray(s.cardIds) ? s.cardIds[i] : null; return typeof id === "string" ? id : null; }) })),
  };
}
export type TeamContext = Awaited<ReturnType<typeof getTeamContext>>;
