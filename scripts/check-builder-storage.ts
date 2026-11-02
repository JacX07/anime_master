// Exécuter sous Node 24 ; schéma Postgres temporaire, indépendant des données locales.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { builderEntries } from "../src/lib/builder-catalog";
import { readSlotDrafts } from "../src/lib/builder-slots";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Check réservé au développement et aux tests");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL manquant");
  const schema = `builder_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }, { schema }) });
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
  globalForPrisma.prisma = prisma;
  try {
    await admin.$executeRawUnsafe(`CREATE TABLE "${schema}"."SpellOverride" ("characterId" INTEGER PRIMARY KEY, spell JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'ready', wish TEXT, "updatedAt" TIMESTAMP(3) NOT NULL)`);
    const { writeSlotDraft } = await import("../src/lib/builder-drafts");
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
    console.log("Sauvegarde et remise à zéro indépendantes des quatre emplacements OK (schéma Postgres temporaire).");
  } finally {
    await prisma.$disconnect();
    delete globalForPrisma.prisma;
    try {
      await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
      await admin.$disconnect();
    }
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
