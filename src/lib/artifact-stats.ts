import type { BattleCard } from "./battle";
import { DUNGEON_KEY, SET_KEYS, setBonus } from "./dungeons";

export type ArtifactStats = NonNullable<BattleCard["artifactStats"]>;
type Totals = Required<ArtifactStats>;
/** Le moteur et la fiche du personnage additionnent exactement les mêmes bonus d’équipement. */
export function sumArtifactStats(artifacts: { setKey?: string; mainStat: string; mainValue: number; subStats: unknown }[]): ArtifactStats {
  const worn = artifacts.filter((a) => SET_KEYS.includes(a.setKey ?? DUNGEON_KEY));
  const stats: Totals = {
    attack: 0, defense: 0, hp: 0, speed: 0, crit: 0, critDamage: 0, dodge: 0, flatAttack: 0, flatDefense: 0, flatHp: 0,
    magicSkill: 0, speedPct: 0, physDamage: 0, magicDamage: 0, gaugePerSpell: 0, bleedBonus: 0, precision: 0, ignoreDef: 0, elementalDamage: 0, titanGuard: 0,
  };
  const pieces = new Map<string, number>();
  for (const a of worn) pieces.set(a.setKey ?? DUNGEON_KEY, (pieces.get(a.setKey ?? DUNGEON_KEY) ?? 0) + 1);
  for (const [key, count] of pieces) {
    for (const [stat, value] of Object.entries(setBonus(key, count))) stats[stat as keyof Totals] += value;
  }
  const add = (stat: string, value: unknown) => {
    if (Object.hasOwn(stats, stat) && typeof value === "number" && Number.isFinite(value)) stats[stat as keyof Totals] += value;
  };
  for (const artifact of worn) {
    add(artifact.mainStat, artifact.mainValue);
    if (Array.isArray(artifact.subStats)) for (const sub of artifact.subStats) {
      if (sub && typeof sub === "object" && typeof sub.stat === "string") add(sub.stat, sub.value);
    }
  }
  return stats;
}
