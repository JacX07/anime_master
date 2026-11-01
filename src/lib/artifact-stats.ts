import type { BattleCard } from "./battle";
import { DUNGEON_KEY, setBonus } from "./dungeons";

export type ArtifactStats = NonNullable<BattleCard["artifactStats"]>;
/** Le moteur et la fiche du personnage additionnent exactement les mêmes bonus d’équipement. */
export function sumArtifactStats(artifacts: { setKey?: string; mainStat: string; mainValue: number; subStats: unknown }[]): ArtifactStats {
  const worn = artifacts.filter((a) => (a.setKey ?? DUNGEON_KEY) === DUNGEON_KEY);
  const bonus = setBonus(worn.length);
  const stats: Required<ArtifactStats> = { magicSkill: 0, attack: bonus.attack, defense: 0, hp: 0, speed: 0, crit: 0, critDamage: bonus.critDamage, dodge: 0, flatAttack: 0, flatDefense: 0, flatHp: 0 };
  const add = (stat: string, value: unknown) => {
    if (Object.hasOwn(stats, stat) && typeof value === "number" && Number.isFinite(value)) stats[stat as keyof ArtifactStats] += value;
  };
  for (const artifact of worn) {
    add(artifact.mainStat, artifact.mainValue);
    if (Array.isArray(artifact.subStats)) for (const sub of artifact.subStats) {
      if (sub && typeof sub === "object" && typeof sub.stat === "string") add(sub.stat, sub.value);
    }
  }
  return stats;
}
