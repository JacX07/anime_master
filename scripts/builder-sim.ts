// Simule un sort écrit dans un fichier JSON (brouillon d'un agent du Spell Builder).
// Usage : npx tsx scripts/builder-sim.ts <characterId> <spell.json> [games]

import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/db";
import { simulateSpell } from "../src/lib/spell-sim";

const [id, file, games] = process.argv.slice(2);
simulateSpell(Number(id), JSON.parse(readFileSync(file, "utf8")), Number(games) || 2000, () => {})
  .then((r) => console.log(JSON.stringify(r)))
  .finally(() => prisma.$disconnect());
