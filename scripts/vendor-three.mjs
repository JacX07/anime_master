// Copie three.js (paquet npm, version figée) dans public/vendor/three : les scènes 3D le chargent depuis notre domaine
// au lieu du CDN jsdelivr (une connexion DNS/TLS de moins au premier chargement, et pas de dépendance à un tiers).
import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";

// La version est dans le chemin : next.config.ts peut alors servir ces fichiers en cache « immutable » d'un an
const src = "node_modules/three", { version } = JSON.parse(readFileSync(`${src}/package.json`, "utf8"));
const out = `public/vendor/three@${version}`;
rmSync("public/vendor", { recursive: true, force: true });
mkdirSync(`${out}/build`, { recursive: true });
for (const f of ["three.module.js", "three.core.js"]) cpSync(`${src}/build/${f}`, `${out}/build/${f}`);
// Seuls les dossiers d'extensions utilisés par public/pack-opening (et ce qu'ils importent)
for (const d of ["postprocessing", "shaders", "environments", "geometries", "objects", "utils"]) cpSync(`${src}/examples/jsm/${d}`, `${out}/addons/${d}`, { recursive: true });
