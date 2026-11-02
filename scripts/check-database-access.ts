// Vérifie la confidentialité des tables du jeu sans modifier les rôles du serveur de test.
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 }) });
  try {
    const tables = await db.$queryRaw<{ name: string; protected: boolean }[]>`
      SELECT c.relname AS name, c.relrowsecurity AS protected
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'`;
    for (const name of ["User", "Account", "Session", "Card", "Character", "Media"]) {
      assert.equal(tables.find((table) => table.name === name)?.protected, true, `${name} : RLS requis`);
    }
    const roles = await db.$queryRaw<{ name: string }[]>`SELECT rolname AS name FROM pg_roles WHERE rolname IN ('anon', 'authenticated')`;
    for (const role of roles) {
      const access = await db.$queryRaw<{ name: string; exposed: boolean }[]>`
        SELECT c.relname AS name,
          has_table_privilege(${role.name}, c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS exposed
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'`;
      assert.deepEqual(access.filter((table) => table.exposed), [], `${role.name} : aucun accès direct aux tables`);
    }
    // Le serveur Prisma doit continuer à lire le catalogue malgré la protection API.
    assert.ok(await db.character.count() > 0);
    console.log("Tables protégées par RLS, rôles API sans accès et lecture Prisma fonctionnelle.");
  } finally { await db.$disconnect(); }
}
main().catch((error: unknown) => {
  console.error(error instanceof assert.AssertionError ? error.message : "Contrôle des permissions échoué (détails de connexion masqués).");
  process.exitCode = 1;
});
