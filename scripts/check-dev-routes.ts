// Les outils de développement ne doivent jamais fonctionner en production : chaque page, action serveur et route d'API qui les concerne
// appelle la garde commune (src/lib/dev-tools.ts, src/lib/builder.ts, src/lib/art-editor.ts), et cette garde refuse la production.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const check = (label: string, ok: boolean) => { assert.ok(ok, label); console.log(`✓ ${label}`); };
const root = path.resolve(import.meta.dirname, "..");
const app = path.join(root, "src/app");
const read = (f: string) => readFileSync(f, "utf8");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => { const p = path.join(dir, name); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = (sub: string) => { try { return walk(path.join(app, sub)); } catch { return []; } };
const rel = (f: string) => path.relative(root, f);
const GUARD = /devToolsEnabled|requireBuilder|builderAllowed|canEditArt|guard\(\)/;

// Les gardes eux-mêmes refusent la production.
check("Garde commune : refuse la production", /devToolsEnabled\s*=\s*\(\)\s*=>\s*process\.env\.NODE_ENV\s*!==\s*"production"/.test(read(path.join(root, "src/lib/dev-tools.ts"))));
check("Garde du Spell Builder : refuse la production", /NODE_ENV\s*!==\s*"production"|NODE_ENV\s*===\s*"production"/.test(read(path.join(root, "src/lib/builder.ts"))));
check("Garde des illustrations : développement seulement", /NODE_ENV\s*!==\s*"development"/.test(read(path.join(root, "src/lib/art-editor.ts"))));

// Dossiers entièrement réservés : page.tsx, actions et routes doivent tous appeler une garde.
const guarded: string[] = [];
for (const dir of ["dev", "outils", "builder", "illustrations", "api/builder"]) {
  for (const f of files(dir)) {
    if (!/^(page\.tsx|route\.ts|actions\.ts)$/.test(path.basename(f))) continue;
    guarded.push(f);
    assert.match(read(f), GUARD, `${rel(f)} doit appeler la garde des outils de développement`);
  }
}
check(`${guarded.length} pages, actions et routes d'outils appellent une garde`, guarded.length >= 7);

// Routes mixtes : lecture publique des images, mais toute écriture est gardée.
for (const f of files("api/illustrations").filter((x) => path.basename(x) === "route.ts")) {
  const src = read(f);
  if (/export\s+(async\s+function|const)\s+(POST|PUT|PATCH|DELETE)\b/.test(src)) assert.match(src, GUARD, `${rel(f)} écrit sur le disque : garde requise`);
}
check("Les routes d'illustrations qui écrivent sont gardées", true);

// Aucun autre fichier de l'application ne doit écrire sur le disque sans garde.
const writers = walk(app).filter((f) => /\.(ts|tsx)$/.test(f) && /from "node:fs(\/promises)?"/.test(read(f)) && /\b(writeFile|rm|mkdir|rename|unlink)\s*\(/.test(read(f)));
for (const f of writers) assert.match(read(f), GUARD, `${rel(f)} écrit sur le disque sans garde d'outils de développement`);
check(`${writers.length} fichiers de l'application qui écrivent sur le disque sont gardés`, true);
console.log("\nRoutes d'outils de développement conformes.");
