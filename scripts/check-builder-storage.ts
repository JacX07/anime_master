// Exécuter sous Node 24 ; base SQLite temporaire, indépendante des données locales.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
const Database = createRequire(import.meta.url)("better-sqlite3");
import { builderEntries } from "../src/lib/builder-catalog";
import { readSlotDrafts } from "../src/lib/builder-slots";

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "builder-slots-"));
  const file = join(dir, "test.db");
  const sqlite = new Database(file);
  sqlite.exec('CREATE TABLE SpellOverride (characterId INTEGER PRIMARY KEY, spell JSONB NOT NULL, status TEXT NOT NULL DEFAULT \'ready\', wish TEXT, updatedAt DATETIME NOT NULL)');
  sqlite.close();
  process.env.DATABASE_URL = `file:${file}`;
  const { writeSlotDraft } = await import("../src/lib/builder-drafts");
  const { prisma } = await import("../src/lib/db");
  try {
    const entries = builderEntries(13, "SSR", "COMBAT");
    // Ancien format : sauvegarder un autre emplacement conserve le secondaire.
    await prisma.spellOverride.create({ data: { characterId: 13, spell: entries[1].original as object } });
    for (const entry of entries.filter((e) => e.slot !== "secondary")) await writeSlotDraft(13, entry.slot, entry.original);
    let row = await prisma.spellOverride.findUniqueOrThrow({ where: { characterId: 13 } });
    assert.equal(Object.keys(readSlotDrafts(row.spell)).length, 4);
    assert.deepEqual(readSlotDrafts(row.spell).secondary, entries[1].original);
    await writeSlotDraft(13, "tertiary", null);
    row = await prisma.spellOverride.findUniqueOrThrow({ where: { characterId: 13 } });
    assert.deepEqual(Object.keys(readSlotDrafts(row.spell)).sort(), ["base", "secondary", "ultimate"]);
    for (const slot of ["base", "secondary", "ultimate"] as const) await writeSlotDraft(13, slot, null);
    assert.equal(await prisma.spellOverride.count(), 0);
    console.log("Sauvegarde et remise à zéro indépendantes des quatre emplacements OK (base SQLite temporaire).");
  } finally {
    await prisma.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
