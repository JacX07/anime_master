import { createBattle, type BattleCard } from "./battle";
import { computePower } from "./stats";
import { isMagicalSpell } from "./magic-skill";

/** Même préparation que le moteur ; aucun effet temporaire ni bonus du second camp. */
export function combatPowers(cards: BattleCard[]): number[] {
  const units = createBattle(cards, [], () => 0.5, { combos: false }).teams.A;
  return units.map((unit) => {
    const card = unit.card;
    const gear = card.artifactStats;
    const magical = isMagicalSpell(card, "special", unit.spell)
      || isMagicalSpell(card, "tertiary", unit.tertiary)
      || isMagicalSpell(card, "ultimate", unit.ultimate);
    return computePower({
      attack: unit.atk, defense: unit.def, hp: unit.maxHp, speed: unit.speed,
      crit: 0.15 + (gear?.crit ?? 0), critDamage: 1.5 + (gear?.critDamage ?? 0),
      dodge: unit.dodge + (gear?.dodge ?? 0),
      damageBonus: (card.type === "MAGIE" || card.franchiseId === 113415) ? gear?.magicDamage : gear?.physDamage,
      magicSkill: magical ? gear?.magicSkill : 0,
      precision: gear?.precision, gaugePerSpell: gear?.gaugePerSpell, bleedBonus: gear?.bleedBonus,
    });
  });
}
