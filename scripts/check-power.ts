import assert from "node:assert/strict";
import { computePower } from "../src/lib/stats";
import { combatPowers } from "../src/lib/combat-power";
import { sumArtifactStats } from "../src/lib/artifact-stats";
import type { BattleCard } from "../src/lib/battle";

const stats = { attack: 1000, defense: 1000, hp: 5600, speed: 100 };
const base = computePower(stats);
for (const stat of ["attack", "defense", "hp", "speed"] as const) {
  assert(computePower({ ...stats, [stat]: stats[stat] * 1.1 }) > base, stat);
}
assert(computePower({ ...stats, speed: 110 }) - base > computePower({ ...stats, defense: 1100 }) - base);
assert(computePower({ ...stats, attack: 1100 }) - base > computePower({ ...stats, defense: 1100 }) - base);
for (const bonus of [{ crit: .25 }, { critDamage: 1.8 }, { dodge: .1 }, { damageBonus: .2 }, { magicSkill: .2 }, { precision: .1 }, { gaugePerSpell: 5 }, { bleedBonus: .2 }]) {
  assert(computePower({ ...stats, ...bonus }) > base, JSON.stringify(bonus));
}
assert.equal(computePower({ ...stats, dodge: .6 }), computePower({ ...stats, dodge: 1 }));
const card: BattleCard = { characterId: 68, type: "COMBAT", rarity: "SSR", attack: 1000, defense: 1000, power: 0, speed: 100, franchiseId: null };
const power = (c: BattleCard) => combatPowers([c])[0];
assert.equal(power(card), base);
assert.equal(power({ ...card, power: 999999 }), base, "Ancienne puissance ignorée");
assert(power({ ...card, stars: 5 }) > base);
assert(power({ ...card, artifactStats: sumArtifactStats([{ mainStat: "attack", mainValue: .2, subStats: [] }]) }) > base);
const magic = sumArtifactStats([{ mainStat: "magicSkill", mainValue: .2, subStats: [] }]);
assert(power({ ...card, artifactStats: magic }) > base);
assert.equal(power({ ...card, characterId: 999999, noSpell: true, noTertiary: true, noUltimate: true, artifactStats: magic }), base);
assert(combatPowers([{ ...card, franchiseId: 1 }, { ...card, franchiseId: 1 }])[0] > base);
console.log("Puissance : pondérations, stats secondaires, plafonds, équipement, éveil, synergie et indépendance des favoris validés.");
