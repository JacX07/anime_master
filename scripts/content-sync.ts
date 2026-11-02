// Catalogue uniquement. Aucune migration, suppression ou table joueur.
import Database from "better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

const TABLES = [
  { name: "Media", keys: ["id"], columns: "id titleRomaji titleEnglish titleNative format year coverUrl popularity genres tags studio franchiseId updatedAt" },
  { name: "Character", keys: ["id"], columns: "id name nameNative imageUrl descriptionRaw description gender age birthMonth birthDay favourites rarity type attack defense power mainMediaId mainRole disabled createdAt updatedAt" },
  { name: "CharacterMedia", keys: ["characterId", "mediaId"], columns: "characterId mediaId role" },
  { name: "SpellOverride", keys: ["characterId"], columns: "characterId spell status wish updatedAt" },
] as const;

type Catalogue = Record<string, Record<string, unknown>[]>;
export type SyncResult = { table: string; source: number; written: number }[];

export function client(url: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 1, connectionTimeoutMillis: 10_000 }) });
}

export function readSqlite(filename: string): Catalogue {
  const db = new Database(filename, { readonly: true, fileMustExist: true });
  try {
    return db.transaction(() => Object.fromEntries(TABLES.map(({ name, columns }) => {
      const rows = db.prepare(`SELECT ${columns.split(" ").map(quote).join(",")} FROM "${name}"`).all() as Record<string, unknown>[];
      for (const row of rows) {
        for (const key of ["genres", "tags", "spell"]) {
          if (typeof row[key] === "string") row[key] = JSON.parse(row[key] as string);
        }
        for (const key of ["createdAt", "updatedAt"]) {
          if (row[key] != null) row[key] = new Date(row[key] as string | number).toISOString();
        }
        if (name === "Character") row.disabled = Boolean(row.disabled);
      }
      return [name, rows];
    })))();
  } finally { db.close(); }
}

export async function readPostgres(db: PrismaClient): Promise<Catalogue> {
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    return Object.fromEntries(await Promise.all(TABLES.map(async ({ name, columns }) => [
    name,
    await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT ${columns.split(" ").map(quote).join(",")} FROM "${name}"`),
    ])));
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 60_000 });
}

function quote(value: string) { return `"${value}"`; }

export async function syncContent(db: PrismaClient, catalogue: Catalogue, apply: boolean): Promise<SyncResult> {
  const result: SyncResult = [];
  const rollback = new Error("Aperçu terminé");
  try {
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '10s'");
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '30s'");
      // Sérialise les synchronisations de contenu concurrentes sur cette base.
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(684321091)");
      for (const { name, keys, columns } of TABLES) {
        const rows = catalogue[name];
        if (!Array.isArray(rows)) throw new Error(`Table source manquante : ${name}`);
        const fields = columns.split(" ");
        const changed = fields.filter((key) => !(keys as readonly string[]).includes(key) && key !== "createdAt" && key !== "updatedAt");
        const updated = fields.filter((key) => changed.includes(key) || key === "updatedAt");
        let written = 0;
        for (let offset = 0; offset < rows.length; offset += 500) {
          // pullCount est absent : valeur par défaut 0 à l'insertion, jamais modifiée ensuite.
          written += await tx.$executeRawUnsafe(
            `INSERT INTO "${name}" (${fields.map(quote).join(",")})
             SELECT ${fields.map(quote).join(",")} FROM json_populate_recordset(NULL::"${name}", $1::json)
             ON CONFLICT (${keys.map(quote).join(",")}) DO UPDATE SET
             ${updated.map((key) => `${quote(key)} = excluded.${quote(key)}`).join(",")}
             WHERE ${changed.map((key) => `"${name}".${quote(key)} IS DISTINCT FROM excluded.${quote(key)}`).join(" OR ")}`,
            JSON.stringify(rows.slice(offset, offset + 500)),
          );
        }
        result.push({ table: name, source: rows.length, written });
      }
      if (!apply) throw rollback;
    }, { timeout: 60_000 });
  } catch (error) { if (error !== rollback) throw error; }
  return result;
}

async function main() {
  const { values } = parseArgs({ options: { sqlite: { type: "string" }, postgres: { type: "boolean" }, apply: { type: "boolean" }, help: { type: "boolean" } } });
  if (values.help) {
    console.log("content:sync (--sqlite chemin.db | --postgres) [--apply]\nTARGET_DATABASE_URL obligatoire ; SOURCE_DATABASE_URL pour --postgres. Sans --apply : transaction annulée.");
    return;
  }
  if (Boolean(values.sqlite) === Boolean(values.postgres)) throw new Error("Choisir --sqlite chemin.db ou --postgres");
  const targetUrl = process.env.TARGET_DATABASE_URL;
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  if (!targetUrl || (values.postgres && !sourceUrl)) throw new Error("TARGET_DATABASE_URL et, pour --postgres, SOURCE_DATABASE_URL sont obligatoires");
  if (values.postgres && sourceUrl === targetUrl) throw new Error("Source et cible identiques");
  const target = client(targetUrl);
  const source = values.postgres ? client(sourceUrl!) : undefined;
  try {
    const catalogue = source ? await readPostgres(source) : readSqlite(values.sqlite!);
    const result = await syncContent(target, catalogue, values.apply ?? false);
    console.table(result);
    console.log(values.apply ? "Contenu appliqué. Aucune suppression ni donnée joueur copiée." : "Aperçu : toutes les écritures ont été annulées. Ajouter --apply pour appliquer.");
  } finally { await Promise.all([target.$disconnect(), source?.$disconnect()]); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    // Les erreurs des connecteurs peuvent inclure les paramètres de connexion.
    console.error("Échec du transfert : transaction annulée. Vérifier connexion, schéma migré et contenu source. Aucun secret affiché.");
    if (error instanceof Prisma.PrismaClientKnownRequestError) console.error(`Code Prisma : ${error.code}`);
    process.exitCode = 1;
  });
}
