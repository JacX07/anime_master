// Lecture seule sur la base : boss scénarisés, stats calibrées et propagation jusqu'au rejeu.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { prisma } from "../src/lib/db";
import { storyEnemies } from "../src/lib/battles";
import { BOSS_BONUS, levelScale, mixFor, UNIVERSES } from "../src/lib/story";
import { createBattle, seededRandom } from "../src/lib/battle";
import { replayStart } from "../src/lib/battle-replay";
import { STORY_ART } from "../src/app/histoire/story-art";

async function main() {
  const u = UNIVERSES[0];
  for (const [level, characterId] of [[10, 5677], [15, 2754]]) {
    const cards = await storyEnemies(u, level);
    assert.equal(cards[3].characterId, characterId);
    assert.equal(cards[3].boss, true);
    assert.equal(cards.filter((c) => c.boss).length, 1);
    assert.equal(new Set(cards.map((c) => c.characterId)).size, 4);
    assert.deepEqual(cards, await storyEnemies(u, level));
    const mix = mixFor(u, level);
    const means = await prisma.character.groupBy({ by: ["rarity"], where: { disabled: false }, _avg: { attack: true, defense: true } });
    const raw = (i: number, stat: "attack" | "defense") => Math.round(means.find((m) => m.rarity === mix[i])!._avg[stat]! * levelScale(u, level) * (i === 3 ? BOSS_BONUS : 1));
    const factor = cards[0].attack / raw(0, "attack");
    for (let i = 0; i < 4; i++) for (const stat of ["attack", "defense"] as const) {
      assert.ok(Math.abs(cards[i][stat] - raw(i, stat) * factor) < 3, "Le budget conserve les rapports de stats et l’avantage du boss");
    }
    const battle = createBattle(cards.map((c) => ({ ...c, boss: false })), cards, seededRandom(19));
    const replay = replayStart(battle.log);
    assert.equal(replay.info.B4.boss, true);
    assert.equal(replay.info.B4.characterId, characterId);
    assert.equal(replay.info.B1.boss, undefined);
  }
  for (const act of [2, 3]) assert.ok(existsSync(`public${STORY_ART["one-piece"].acts![act].background}`));
  assert.equal(STORY_ART["one-piece"].background, "/story-map/one-piece.png");
  console.log("✓ Lucci (10), Doflamingo (15), boss réservés, budget de stats et avantage relatif du boss, marqueur du rejeu et fonds des actes.");
}
main().finally(() => prisma.$disconnect());
