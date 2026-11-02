// Synchronise la base de jeu (data/play.db) avec la base de dev (data/app.db) sans toucher aux données joueurs.
// 1. sauvegarde horodatée de play.db ; 2. `prisma migrate deploy` sur play.db ;
// 3. ajout / mise à jour du contenu (personnages, séries, sorts) depuis app.db, jamais de suppression.
// Les bannières ne sont pas copiées : le code les crée dans chaque base (`ensureBanners`) et app.db contient des bannières de test.
// Usage : npm run play:sync (chemins modifiables : APP_DB=… PLAY_DB=…)

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP = path.resolve(ROOT, process.env.APP_DB ?? "data/app.db");
const PLAY = path.resolve(ROOT, process.env.PLAY_DB ?? "data/play.db");
const BACKUPS = path.join(path.dirname(PLAY), "backups");

// Tables de contenu, dans l'ordre des clés étrangères. `keep` : colonnes propres à chaque base, jamais écrasées.
const TABLES: { name: string; keep?: string[] }[] = [
  { name: "Media" },
  { name: "Character", keep: ["pullCount", "createdAt"] },
  { name: "CharacterMedia" },
  { name: "SpellOverride" },
];

async function main() {
  for (const f of [APP, PLAY]) if (!existsSync(f)) throw new Error(`Base introuvable : ${f}`);

  // 1. Sauvegarde (API de backup SQLite : cohérente même si le serveur de jeu tourne)
  mkdirSync(BACKUPS, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backup = path.join(BACKUPS, `play-${stamp}.db`);
  const pre = new Database(PLAY);
  await pre.backup(backup);
  pre.close();
  console.log(`✓ Sauvegarde : ${path.relative(ROOT, backup)}`);

  // 2. Migrations (seulement celles qui manquent)
  console.log("… prisma migrate deploy sur play.db");
  execFileSync("npx", ["prisma", "migrate", "deploy", "--config", "prisma.sqlite.config.ts"], {
    cwd: ROOT, stdio: "inherit", env: { ...process.env, DATABASE_URL: `file:${PLAY}` },
  });

  // 3. Contenu : INSERT … ON CONFLICT DO UPDATE (ajout ou mise à jour, aucune suppression)
  const db = new Database(PLAY);
  db.pragma("foreign_keys = ON");
  db.prepare("ATTACH DATABASE ? AS app").run(APP);
  const cols = (schema: string, t: string) =>
    db.prepare(`PRAGMA ${schema}.table_info("${t}")`).all() as { name: string; pk: number }[];

  const sync = db.transaction(() => {
    for (const { name, keep = [] } of TABLES) {
      const playCols = cols("main", name);
      const appNames = new Set(cols("app", name).map((c) => c.name));
      if (!playCols.length || !appNames.size) { console.log(`- ${name} : table absente, ignorée`); continue; }
      const shared = playCols.filter((c) => appNames.has(c.name));
      const pk = shared.filter((c) => c.pk > 0).map((c) => `"${c.name}"`);
      const list = shared.map((c) => `"${c.name}"`).join(", ");
      // Nouvelles lignes : pullCount repart de 0 dans play.db
      const select = shared.map((c) => (c.name === "pullCount" ? "0" : `"${c.name}"`)).join(", ");
      const upd = shared.filter((c) => c.pk === 0 && !keep.includes(c.name) && c.name !== "updatedAt").map((c) => c.name);
      // Ne réécrit que les lignes qui ont réellement changé (updatedAt suit alors la valeur de app.db)
      const updates = upd.length ? [...upd, ...(appNames.has("updatedAt") ? ["updatedAt"] : [])].map((c) => `"${c}" = excluded."${c}"`) : [];
      const changed = upd.map((c) => `"${name}"."${c}" IS NOT excluded."${c}"`).join(" OR ");
      const before = (db.prepare(`SELECT COUNT(*) n FROM main."${name}"`).get() as { n: number }).n;
      const res = db.prepare(
        `INSERT INTO main."${name}" (${list}) SELECT ${select} FROM app."${name}" WHERE true
         ON CONFLICT (${pk.join(", ")}) DO ${updates.length ? `UPDATE SET ${updates.join(", ")} WHERE ${changed}` : "NOTHING"}`,
      ).run();
      const added = (db.prepare(`SELECT COUNT(*) n FROM main."${name}"`).get() as { n: number }).n - before;
      console.log(`✓ ${name} : ${added} ajoutée(s), ${res.changes - added} mise(s) à jour`);
    }
  });
  sync();
  db.close();
  console.log("Terminé. Bases SQLite synchronisées pour le serveur historique. Le transfert vers Postgres utilise un outil distinct.");
}

main().catch((e) => { console.error("✗", e instanceof Error ? e.message : e); process.exit(1); });
