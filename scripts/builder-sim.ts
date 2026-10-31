// Simule un sort écrit dans un fichier JSON (brouillon d'un agent du Spell Builder).
// Usage : npx tsx scripts/builder-sim.ts <characterId> <spell.json> [games] [slot]

import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/db";
import { isBuilderSlot } from "../src/lib/builder-slots";
import { simulateSpell } from "../src/lib/spell-sim";

const [id, file, games, slot] = process.argv.slice(2);
simulateSpell(Number(id), JSON.parse(readFileSync(file, "utf8")), Number(games) || 2000, () => {}, 42, isBuilderSlot(slot) ? slot : "secondary")
  .then((r) => console.log(JSON.stringify(r)))
  .finally(() => prisma.$disconnect());
