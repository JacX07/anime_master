// Copie PixiJS (paquet npm, version figée) dans public/vendor/pixi.js : les effets 2D du combat le chargent depuis notre domaine
// au lieu d'un CDN. La version est dans le chemin : next.config.ts peut alors servir ces fichiers en cache « immutable » d'un an.
import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";

rmSync("public/vendor", { recursive: true, force: true });

// Un seul module ESM minifié
const pixi = JSON.parse(readFileSync("node_modules/pixi.js/package.json", "utf8")).version;
mkdirSync(`public/vendor/pixi.js@${pixi}`, { recursive: true });
cpSync("node_modules/pixi.js/dist/pixi.min.mjs", `public/vendor/pixi.js@${pixi}/pixi.min.mjs`);
