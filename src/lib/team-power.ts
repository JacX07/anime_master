import { combatPowers } from "./combat-power";
import { sumArtifactStats } from "./artifact-stats";
import { weaponDef } from "./weapons";
import type { BattleCard } from "./battle";

type PowerCard = { id: string; characterId: number; attack: number; defense: number; speed: number; stars: number; weaponKey: string | null; rarity: BattleCard["rarity"]; type: BattleCard["type"]; franchiseId: number | null };
type Gear = { artifact?: { equippedCard: { id: string } | null; setKey?: string; mainStat: string; mainValue: number; subStats: unknown } };
export function teamPowers(cards: PowerCard[], items: Gear[]): number[] {
  return combatPowers(cards.map((card) => ({
    ...card, power: 0,
    weapon: weaponDef(card.weaponKey ?? "")?.weapon ?? null,
    artifactStats: sumArtifactStats(items.flatMap((item) => item.artifact?.equippedCard?.id === card.id ? [item.artifact] : [])),
  })));
}
