// Deux bases jetables ; DATABASE_URL doit désigner un serveur de test autorisant CREATE DATABASE.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { client, readPostgres, readSqlite, syncContent } from "./content-sync";

async function main() {
  assert(process.env.NODE_ENV !== "production", "Check réservé aux tests");
  assert(process.env.DATABASE_URL, "DATABASE_URL de test obligatoire");
  const admin = client(process.env.DATABASE_URL);
  const prefix = process.env.CHECK_RUN_PREFIX;
  assert(!prefix || /^am_check_[a-f0-9]{32}$/.test(prefix), "Préfixe de test invalide");
  const names = [0, 1].map(() => prefix ? `${prefix}_sync_${randomUUID().replaceAll("-", "").slice(0, 8)}` : `content_test_${randomUUID().replaceAll("-", "")}`);
  const clients = names.map((name) => {
    const url = new URL(process.env.DATABASE_URL!); url.pathname = `/${name}`;
    return client(url.toString());
  });
  const folder = mkdtempSync(path.join(tmpdir(), "content-sync-"));
  const filename = path.join(folder, "source.db");
  const stamp = "2026-01-01T00:00:00.000Z";
  const catalogue = {
    Media: [{ id: 1, titleRomaji: "Série test", titleEnglish: null, titleNative: null, format: "TV", year: 2026, coverUrl: null, popularity: 10, genres: ["Action"], tags: null, studio: null, franchiseId: 1, updatedAt: stamp }],
    Character: [{ id: 1, name: "Personnage test", nameNative: null, imageUrl: "/test.png", descriptionRaw: null, description: null, gender: null, age: null, birthMonth: null, birthDay: null, favourites: 10, rarity: "SSR", type: "COMBAT", attack: 100, defense: 100, power: 100, mainMediaId: 1, mainRole: "MAIN", disabled: false, createdAt: stamp, updatedAt: stamp }],
    CharacterMedia: [{ characterId: 1, mediaId: 1, role: "MAIN" }],
    SpellOverride: [{ characterId: 1, spell: { name: "Sort test", slots: [1, 2] }, status: "ready", wish: null, updatedAt: stamp }],
  };
  try {
    for (let i = 0; i < names.length; i++) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${names[i]}"`);
      // Le SQL versionné contient plusieurs instructions ; les exécuter séparément.
      const sql = readFileSync(path.resolve(import.meta.dirname, "../prisma/migrations/20261102160000_init_postgres/migration.sql"), "utf8");
      for (const statement of sql.split(";").filter((s) => s.trim())) await clients[i].$executeRawUnsafe(statement);
    }
    const sqlite = new Database(filename);
    try {
      for (const [table, rows] of Object.entries(catalogue)) {
        const fields = Object.keys(rows[0]);
        sqlite.exec(`CREATE TABLE "${table}" (${fields.map((key) => `"${key}"`).join(",")})`);
        sqlite.prepare(`INSERT INTO "${table}" VALUES (${fields.map(() => "?").join(",")})`).run(...Object.values(rows[0]).map((v) => {
          if (typeof v === "boolean") return Number(v);
          if (typeof v === "object" && v !== null) return JSON.stringify(v);
          if (typeof v === "string" && v === stamp) return Date.parse(v);
          return v;
        }));
      }
    } finally { sqlite.close(); }
    const source = readSqlite(filename);
    assert.deepEqual(source, catalogue, "Conversion JSON, dates, booléens SQLite");
    const [dev, prod] = clients;
    assert.equal((await syncContent(dev, source, false)).reduce((n, r) => n + r.written, 0), 4);
    assert.equal(await dev.character.count(), 0, "Aperçu annulé");
    await syncContent(dev, source, true);
    assert.equal(await dev.character.count(), 1);
    assert.equal(await dev.character.findUniqueOrThrow({ where: { id: 1 } }).then((r) => r.pullCount), 0);
    assert((await syncContent(dev, source, true)).every((r) => r.written === 0), "Rejeu sans écriture");
    await dev.character.update({ where: { id: 1 }, data: { pullCount: 99 } });
    await dev.user.create({ data: { id: "dev-only", name: "Test dev", username: "devonly", email: "dev@test.local" } });
    await syncContent(prod, await readPostgres(dev), true);
    assert.equal(await prod.user.count(), 0, "Aucun joueur dev copié");
    assert.equal((await prod.character.findUniqueOrThrow({ where: { id: 1 } })).pullCount, 0, "Compteur source exclu des insertions");
    await prod.user.create({ data: { id: "player", name: "Joueur", username: "player", email: "player@test.local", crystals: 17 } });
    await prod.character.update({ where: { id: 1 }, data: { pullCount: 7, createdAt: new Date("2025-01-01"), name: "Ancien nom" } });
    await prod.packOpening.create({ data: { id: "pack", userId: "player", pityTriggered: "NONE" } });
    await prod.card.create({ data: { id: "owned", ownerId: "player", characterId: 1, serial: 7, rarityAtPull: "SSR", finish: "NORMAL", packOpeningId: "pack" } });
    const playerBefore = await prod.user.findMany();
    const cardsBefore = await prod.card.findMany();
    const createdAt = (await prod.character.findUniqueOrThrow({ where: { id: 1 } })).createdAt;
    await prod.media.create({ data: { id: 2, titleRomaji: "Exclusivité prod", popularity: 1, genres: [] } });
    const result = await syncContent(prod, await readPostgres(dev), true);
    assert.equal(result.find((r) => r.table === "Character")?.written, 1);
    const character = await prod.character.findUniqueOrThrow({ where: { id: 1 } });
    assert.equal(character.name, "Personnage test");
    assert.equal(character.pullCount, 7);
    assert.deepEqual(character.createdAt, createdAt);
    assert.deepEqual(await prod.user.findMany(), playerBefore);
    assert.deepEqual(await prod.card.findMany(), cardsBefore);
    assert.equal(await prod.media.count(), 2, "Aucune suppression");
    assert((await syncContent(prod, await readPostgres(dev), true)).every((r) => r.written === 0));
    const invalid = structuredClone(source);
    invalid.Media[0].titleRomaji = "Ne doit pas persister";
    invalid.CharacterMedia.push({ characterId: 999, mediaId: 1, role: "MAIN" });
    await assert.rejects(syncContent(prod, invalid, true));
    assert.equal((await prod.media.findUniqueOrThrow({ where: { id: 1 } })).titleRomaji, "Série test", "Annulation intégrale sur erreur");
    console.log("SQLite → Postgres et dev → prod : aperçu, rejouabilité, JSON/dates/booléens, compteurs/cartes/joueurs préservés, aucune suppression, annulation sur erreur OK.");
  } finally {
    await Promise.all(clients.map((db) => db.$disconnect()));
    try { for (const name of names) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`); }
    finally { await admin.$disconnect(); rmSync(folder, { recursive: true, force: true }); }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
