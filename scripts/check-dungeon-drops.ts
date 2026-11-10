import assert from "node:assert/strict";
import { artifactSlot, dungeonArtifactRarities, DIFFICULTY_RARITY } from "../src/lib/dungeons";

for (let level = 1; level <= 10; level++) {
  let bonus = 0;
  const bySlot = new Map<string, [number, number]>();
  for (let seed = 0; seed < 20000; seed++) {
    const drops = dungeonArtifactRarities(level, seed);
    assert.deepEqual(drops, dungeonArtifactRarities(level, seed), "tirage stable pour le replay");
    assert.equal(drops[0], DIFFICULTY_RARITY(level));
    if (level % 2) assert.deepEqual(drops, level === 1 ? ["N"] : [DIFFICULTY_RARITY(level), DIFFICULTY_RARITY(level - 2)]);
    else {
      assert(drops.length === 1 || drops.length === 2);
      if (drops.length === 2) { bonus++; assert.equal(drops[1], drops[0]); }
      const slot = artifactSlot(seed), n = bySlot.get(slot) ?? [0, 0];
      n[0]++; if (drops.length === 2) n[1]++; bySlot.set(slot, n);
    }
  }
  if (level % 2 === 0) {
    assert(Math.abs(bonus / 20000 - 0.5) < 0.02);
    for (const [n, b] of bySlot.values()) assert(Math.abs(b / n - 0.5) < 0.035, "50 % quel que soit le premier emplacement");
  }
}
console.log("check-dungeon-drops ok : 10 difficultés, 20 000 graines chacune, 50 % indépendant du premier emplacement");
