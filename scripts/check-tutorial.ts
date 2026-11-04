import assert from "node:assert/strict";
import { phaseProgress, settleStep, tutorialStep, TUTORIAL_LENGTH, TUTORIAL_STEPS } from "../src/lib/tutorial";

// Les présentations demandent un clic explicite, même lorsque toutes les actions sont accomplies.
for (const cards of [false, true]) for (const team of [false, true]) for (const storyWin of [false, true]) {
  const facts = { cards, team, storyWin };
  assert.equal(settleStep(1, facts), !cards ? 1 : !team ? 2 : !storyWin ? 3 : 4);
  assert.equal(settleStep(2, facts), !team ? 2 : !storyWin ? 3 : 4);
  assert.equal(settleStep(3, facts), storyWin ? 4 : 3);
  for (let n = 4; n <= TUTORIAL_LENGTH; n++) assert.equal(settleStep(n, facts), n);
  assert.equal(settleStep(0, facts), 0);
}
assert.equal(tutorialStep(0), null);
assert.equal(tutorialStep(TUTORIAL_LENGTH + 1), null);
assert.equal(new Set(TUTORIAL_STEPS.map((s) => s.key)).size, TUTORIAL_LENGTH);
assert.deepEqual(phaseProgress(1), { index: 1, total: 3 });
assert.deepEqual(phaseProgress(3), { index: 3, total: 3 });
assert.deepEqual(phaseProgress(4), { index: 1, total: 5 });
assert.deepEqual(phaseProgress(TUTORIAL_LENGTH), { index: 1, total: 1 });
console.log("Tutoriel : transitions, arrêt sur présentation et numérotation OK.");
