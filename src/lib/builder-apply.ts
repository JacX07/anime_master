// « Appliquer au jeu » (docs/specs/combat.md §12) : écrit le sort dans src/lib/skill-overrides.json, que le jeu lit avant ses catalogues.

import "server-only";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SkillOverride } from "./skill-overrides";
import { writeSlotDraft } from "./builder-drafts";
import type { BuilderSlot, BuilderValue } from "./builder-slots";

const FILE = join(process.cwd(), "src", "lib", "skill-overrides.json");

export async function applyToGame(characterId: number, slot: BuilderSlot, value: BuilderValue) {
  const all = JSON.parse(readFileSync(FILE, "utf8")) as Record<string, SkillOverride>;
  const entry = (all[characterId] ??= {});
  (entry as Record<string, BuilderValue>)[slot] = value;
  const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => Number(a) - Number(b)));
  writeFileSync(FILE, JSON.stringify(sorted, null, 2) + "\n");
  // Le brouillon devient le sort du jeu : il n'y a plus d'écart à garder.
  await writeSlotDraft(characterId, slot, null);
}
