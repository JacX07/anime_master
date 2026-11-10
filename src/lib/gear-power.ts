// Puissance apportée par l'équipement (artefacts et arme) : comptée dans le classement et la puissance affichée (v0.3.0).

import { combatPowers } from "./combat-power";
import { sumArtifactStats } from "./artifact-stats";
import { prisma } from "./db";
import { speedOf } from "./speed";
import { weaponDef } from "./weapons";
import type { BattleCard } from "./battle";

type Db = Pick<typeof prisma, "card">;

/** Bonus par joueur : puissance de la carte équipée moins la même carte sans équipement (éveil identique, sans synergie d'équipe). */
export async function gearPowerBonus(userId?: string, db: Db = prisma): Promise<Map<string, number>> {
  const cards = await db.card.findMany({
    where: { ...(userId ? { ownerId: userId } : {}), OR: [{ artifacts: { some: {} } }, { weaponKey: { not: null }, stars: 5 }] },
    select: {
      ownerId: true, stars: true, weaponKey: true,
      artifacts: { select: { setKey: true, mainStat: true, mainValue: true, subStats: true } },
      character: { select: { id: true, rarity: true, type: true, attack: true, defense: true, mainMediaId: true, mainMedia: { select: { franchiseId: true } } } },
    },
  });
  const out = new Map<string, number>();
  for (const card of cards) {
    const c = card.character;
    const bare: BattleCard = { characterId: c.id, rarity: c.rarity, type: c.type, attack: c.attack, defense: c.defense, power: 0, speed: speedOf(c.id), franchiseId: c.mainMedia?.franchiseId ?? c.mainMediaId, stars: card.stars, weapon: null };
    const geared: BattleCard = { ...bare, weapon: card.stars === 5 ? weaponDef(card.weaponKey ?? "")?.weapon ?? null : null, artifactStats: sumArtifactStats(card.artifacts) };
    const [without] = combatPowers([bare]);
    const [withGear] = combatPowers([geared]);
    out.set(card.ownerId, (out.get(card.ownerId) ?? 0) + Math.max(0, Math.round(withGear - without)));
  }
  return out;
}
