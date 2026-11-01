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
    const rarity = mixFor(u, level)[3];
    const mean = await prisma.character.aggregate({ where: { disabled: false, rarity }, _avg: { attack: true, defense: true } });
    const scale = levelScale(u, level) * BOSS_BONUS;
    assert.equal(cards[3].attack, Math.round(mean._avg.attack! * scale));
    assert.equal(cards[3].defense, Math.round(mean._avg.defense! * scale));
    const battle = createBattle(cards.map((c) => ({ ...c, boss: false })), cards, seededRandom(19));
    const replay = replayStart(battle.log);
    assert.equal(replay.info.B4.boss, true);
    assert.equal(replay.info.B4.characterId, characterId);
    assert.equal(replay.info.B1.boss, undefined);
  }
  for (const act of [2, 3]) assert.ok(existsSync(`public${STORY_ART["one-piece"].acts![act].background}`));
  assert.equal(STORY_ART["one-piece"].background, "/story-map/one-piece.png");
  console.log("✓ Lucci (10), Doflamingo (15), boss réservés, stats inchangées, marqueur du rejeu et fonds des actes.");
}
main().finally(() => prisma.$disconnect());
