import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { prisma } from "../src/lib/db";
async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  assert.ok(url.hostname === "127.0.0.1" && url.pathname.startsWith("/am_pentest"));
  const sql = (query: string) => prisma.$executeRawUnsafe(query);
  const check = () => spawnSync(process.execPath, ["--import", "tsx", "scripts/check-database-access.ts"], { timeout: 10000, env: process.env, stdio: "pipe" }).status;
  try {
    await sql(`DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await sql(`DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    assert.equal(check(), 0, "baseline");
    const cases = [
      ['GRANT TRUNCATE ON "User" TO anon', 'REVOKE TRUNCATE ON "User" FROM anon'],
      ['GRANT SELECT (email) ON "User" TO authenticated', 'REVOKE SELECT (email) ON "User" FROM authenticated'],
      ['GRANT SELECT ON "User" TO PUBLIC', 'REVOKE SELECT ON "User" FROM PUBLIC'],
      ['CREATE SEQUENCE audit_sequence; GRANT USAGE ON SEQUENCE audit_sequence TO anon', 'DROP SEQUENCE audit_sequence'],
      ['CREATE FUNCTION audit_exposed() RETURNS int LANGUAGE sql SECURITY DEFINER AS $$ SELECT 1 $$', 'DROP FUNCTION audit_exposed()'],
      ['CREATE VIEW audit_view AS SELECT email FROM "User"; GRANT SELECT ON audit_view TO anon', 'DROP VIEW audit_view'],
      ['CREATE ROLE audit_reader; GRANT SELECT ON "User" TO audit_reader; GRANT audit_reader TO anon', 'REVOKE audit_reader FROM anon; REVOKE SELECT ON "User" FROM audit_reader; DROP ROLE audit_reader'],
      ['ALTER ROLE anon BYPASSRLS', 'ALTER ROLE anon NOBYPASSRLS'],
      ['ALTER TABLE "AuthThrottle" DISABLE ROW LEVEL SECURITY', 'ALTER TABLE "AuthThrottle" ENABLE ROW LEVEL SECURITY'],
    ];
    for (const [expose, restore] of cases) {
      // Requêtes fixes du test, jamais issues d'une requête utilisateur.
      for (const statement of expose.split('; ')) await sql(statement);
      try { assert.equal(check(), 1, "exposition détectée"); }
      finally { for (const statement of restore.split('; ')) await sql(statement); }
      assert.equal(check(), 0, "protection restaurée");
    }
    console.log("PASS : droits PUBLIC, colonne, TRUNCATE, séquence, fonction SECURITY DEFINER, vue, héritage de rôle, BYPASSRLS et nouvelle table non protégée détectés.");
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error instanceof assert.AssertionError ? error.message : "Audit des droits échoué (détails masqués)."); process.exitCode = 1; });
