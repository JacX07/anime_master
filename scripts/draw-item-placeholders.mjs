// Visuels temporaires des objets et ressources (SVG dans public/items/), en attendant de vraies illustrations.
// Usage : node scripts/draw-item-placeholders.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "public", "items");

// Formes dessinées dans un carré 128 × 128 ; `F` = remplissage dégradé, `L` = clair, `D` = sombre.
const SHAPES = {
  crystal: `<path d="M64 12 92 40 82 98 64 116 46 98 36 40Z" fill="F" stroke="L" stroke-width="2"/><path d="M64 12 56 48 64 116 72 48Z" fill="L" opacity=".55"/><path d="M36 40h56M56 48 36 40m36 8 20-8" stroke="D" stroke-width="2" fill="none"/>`,
  shards: `<path d="M50 20 70 46 60 104 40 92 34 50Z" fill="F" stroke="L" stroke-width="2"/><path d="m84 40 14 20-8 34-14-6 0-34Z" fill="F" stroke="L" stroke-width="2"/><path d="m50 20-4 40 14 44" stroke="L" stroke-width="2" fill="none" opacity=".7"/>`,
  gem: `<path d="M36 44 50 26h28l14 18-28 60Z" fill="F" stroke="L" stroke-width="2"/><path d="M36 44h56M50 26l-4 18 18 60 18-60-4-18M46 44l18-18 18 18" stroke="D" stroke-width="2" fill="none"/><path d="m54 30-6 12h12Z" fill="L" opacity=".7"/>`,
  drop: `<path d="M64 14C80 40 94 58 94 78a30 30 0 0 1-60 0c0-20 14-38 30-64Z" fill="F" stroke="L" stroke-width="2"/><path d="M52 66c-4 8-4 18 2 24" stroke="L" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/>`,
  fruit: `<circle cx="64" cy="72" r="38" fill="F" stroke="L" stroke-width="2"/><path d="M38 60c10 6 18-4 26 2s18 4 26-2M34 78c10 6 20-4 30 2s20 4 30-2M42 96c8 4 16-4 22 0s14 4 22 0" stroke="D" stroke-width="3" fill="none"/><path d="M64 34c-2-10 2-18 10-22" stroke="D" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M68 28c10-8 22-6 28 0-10 8-20 8-28 0Z" fill="#6fcf73"/>`,
  bean: `<path d="M40 40c18-22 58-10 52 30s-50 52-60 22c-6-18 2-38 8-52Z" fill="F" stroke="L" stroke-width="2"/><path d="M56 48c-8 10-10 26-4 38" stroke="D" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="72" cy="48" rx="8" ry="5" fill="L" opacity=".6"/>`,
  scroll: `<rect x="34" y="30" width="60" height="68" rx="4" fill="#f1e2c0" stroke="#8a6a3b" stroke-width="2"/><rect x="26" y="20" width="76" height="14" rx="7" fill="F" stroke="L" stroke-width="2"/><rect x="26" y="94" width="76" height="14" rx="7" fill="F" stroke="L" stroke-width="2"/><path d="M48 46h32M48 58h26M48 70h32M48 82h20" stroke="#8a6a3b" stroke-width="3"/><circle cx="80" cy="80" r="7" fill="#c8402f"/>`,
  book: `<path d="M24 34c14-6 28-6 40 4v70c-12-10-26-10-40-4Z" fill="F" stroke="L" stroke-width="2"/><path d="M104 34c-14-6-28-6-40 4v70c12-10 26-10 40-4Z" fill="F" stroke="L" stroke-width="2"/><path d="M34 52c8-2 16-2 22 2M34 66c8-2 16-2 22 2M72 54c6-4 14-4 22-2M72 68c6-4 14-4 22-2" stroke="L" stroke-width="2" fill="none" opacity=".8"/><circle cx="64" cy="26" r="6" fill="L"/>`,
  card: `<rect x="30" y="18" width="68" height="92" rx="8" fill="F" stroke="L" stroke-width="3"/><rect x="40" y="28" width="48" height="46" rx="4" fill="D" opacity=".45"/><path d="m64 34 8 14 14 2-10 10 2 14-14-7-14 7 2-14-10-10 14-2Z" fill="L"/><path d="M42 86h44M42 96h30" stroke="L" stroke-width="3"/>`,
  ingot: `<path d="M22 84 38 50h52l16 34Z" fill="F" stroke="L" stroke-width="2"/><path d="M22 84h84l-6 14H28Z" fill="D"/><path d="M38 50h52l-8 10H46Z" fill="L" opacity=".6"/><path d="M48 70h20" stroke="L" stroke-width="3" stroke-linecap="round"/>`,
  ore: `<path d="M18 88 30 48l32-20 36 22 12 38-44 18Z" fill="F" stroke="L" stroke-width="2"/><path d="m30 48 32 14 36-12M62 62l4 44" stroke="D" stroke-width="2" fill="none"/><path d="m70 40 14 8-10 10-6-8Z M40 70l10 4-6 10-8-4Z" fill="L"/>`,
  blade: `<path d="M94 14h20v20L58 90 38 70Z" fill="F" stroke="L" stroke-width="2"/><path d="M106 22 50 80" stroke="L" stroke-width="3" opacity=".8"/><path d="m28 62 38 38-8 8-38-38Z" fill="#d8b46a" stroke="#fff1c8" stroke-width="1.5"/><path d="m18 100 16-16 10 10-16 16Z" fill="D" stroke="L" stroke-width="1.5"/><circle cx="20" cy="108" r="6" fill="#d8b46a"/>`,
  brokenBlade: `<path d="M88 20 108 30 66 82 48 72Z" fill="F" stroke="L" stroke-width="2"/><path d="m88 20 4 18-10 8 12 4" stroke="D" stroke-width="2" fill="none"/><path d="m36 64 34 26-8 8-34-26Z" fill="#d8b46a"/><path d="m22 96 12-14 12 8-12 16Z" fill="D" stroke="L" stroke-width="1.5"/><rect x="22" y="84" width="22" height="22" rx="11" fill="none" stroke="L" stroke-width="2" opacity=".5"/>`,
  flower: `<g fill="F" stroke="L" stroke-width="1.5"><circle cx="64" cy="26" r="11"/><circle cx="50" cy="42" r="11"/><circle cx="78" cy="42" r="11"/><circle cx="56" cy="60" r="10"/><circle cx="74" cy="60" r="10"/><circle cx="64" cy="76" r="9"/><circle cx="64" cy="92" r="7"/></g><path d="M64 14V112" stroke="#5f9c54" stroke-width="3"/><path d="M64 100c-14-2-22 4-26 12 12 0 20-4 26-12Z" fill="#6fcf73"/>`,
  trophy: `<path d="M40 22h48v26a24 24 0 0 1-48 0Z" fill="F" stroke="L" stroke-width="2"/><path d="M40 30H26c0 16 6 22 16 24M88 30h14c0 16-6 22-16 24" stroke="L" stroke-width="4" fill="none"/><path d="M58 72h12v16H58Z" fill="F"/><path d="M42 88h44v10H42ZM36 98h56v10H36Z" fill="D" stroke="L" stroke-width="1.5"/><path d="M52 30v20" stroke="L" stroke-width="4" stroke-linecap="round" opacity=".7"/>`,
  finger: `<path d="M50 112V44c0-14 28-14 28 0v68Z" fill="F" stroke="L" stroke-width="2"/><path d="M52 34c0-12 24-12 24 0v6H52Z" fill="#e8d5b8"/><path d="M48 62h32M48 72h32M48 82h32" stroke="#efe0b4" stroke-width="5"/><path d="M52 68h24M52 78h24" stroke="#b33a2e" stroke-width="2"/><path d="M58 92h12M58 100h12" stroke="D" stroke-width="2"/>`,
  glowstick: `<rect x="56" y="12" width="16" height="74" rx="8" fill="F" stroke="L" stroke-width="3"/><rect x="60" y="18" width="4" height="60" rx="2" fill="#fff" opacity=".8"/><rect x="52" y="84" width="24" height="30" rx="6" fill="#2d2d3a" stroke="#8a8aa6" stroke-width="2"/><path d="M40 28 30 18M88 28l10-10M36 54H22M92 54h14" stroke="L" stroke-width="4" stroke-linecap="round"/>`,
  note: `<path d="M50 30 98 18v62" stroke="F" stroke-width="10" fill="none" stroke-linejoin="round"/><path d="M50 30v62" stroke="F" stroke-width="10"/><ellipse cx="38" cy="94" rx="16" ry="12" fill="F" stroke="L" stroke-width="2"/><ellipse cx="86" cy="82" rx="16" ry="12" fill="F" stroke="L" stroke-width="2"/><path d="M50 40 98 28" stroke="L" stroke-width="3" opacity=".7"/>`,
  armor: `<path d="M64 16 98 28v34c0 26-16 42-34 50-18-8-34-24-34-50V28Z" fill="F" stroke="L" stroke-width="2"/><path d="M64 26 88 34v26c0 18-10 30-24 38-14-8-24-20-24-38V34Z" fill="D" opacity=".35"/><path d="M30 34 14 44v16l16-6M98 34l16 10v16l-16-6" fill="F" stroke="L" stroke-width="2"/><path d="M64 26v72" stroke="L" stroke-width="2" opacity=".6"/>`,
  suit: `<path d="M40 22 64 30l24-8 18 22-12 10v58H34V54L22 44Z" fill="F" stroke="L" stroke-width="2"/><path d="M52 26 64 46l12-20" stroke="L" stroke-width="3" fill="none"/><path d="M48 66h32l-6 16H54Z" fill="L" opacity=".8"/><path d="M34 90h60" stroke="D" stroke-width="4"/>`,
  arrow: `<path d="M24 104 94 34" stroke="#c9a258" stroke-width="7" stroke-linecap="round"/><path d="m82 18 30-4-4 30-10 4-20-20Z" fill="F" stroke="L" stroke-width="2"/><path d="m24 104-6-18 10 8M24 104l18 6-8-10" fill="#d4485a" stroke="#d4485a" stroke-width="5" stroke-linejoin="round"/><circle cx="96" cy="30" r="4" fill="L"/>`,
  mask: `<path d="M64 14c26 0 40 22 40 48 0 30-20 52-40 52S24 92 24 62c0-26 14-48 40-48Z" fill="F" stroke="L" stroke-width="2"/><path d="M40 56c6-6 16-6 20 2-6 6-16 6-20-2ZM68 58c4-8 14-8 20-2-4 8-14 8-20 2Z" fill="#1a1520"/><path d="M50 90c10 6 18 6 28 0" stroke="D" stroke-width="3" fill="none"/><path d="M28 40 14 30M100 40l14-10M40 22l-6-12M88 22l6-12M64 14V4" stroke="L" stroke-width="5" stroke-linecap="round"/>`,
  heart: `<path d="M64 112 20 64c-14-16-6-42 16-44 12-1 22 6 28 16 6-10 16-17 28-16 22 2 30 28 16 44Z" fill="F" stroke="L" stroke-width="2"/><path d="m64 36-8 22 12 10-10 24" stroke="L" stroke-width="3" fill="none" stroke-linejoin="round"/><path d="M36 38c-6 4-8 12-4 18" stroke="L" stroke-width="5" stroke-linecap="round" fill="none" opacity=".6"/>`,
  coin: `<circle cx="64" cy="64" r="44" fill="F" stroke="L" stroke-width="3"/><circle cx="64" cy="64" r="34" fill="none" stroke="D" stroke-width="3"/><rect x="54" y="54" width="20" height="20" fill="D" stroke="L" stroke-width="2"/><path d="M36 44c6-10 14-16 24-18" stroke="L" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/>`,
  veil: `<path d="M30 20c20 10 48 10 68 0-4 30 8 60 4 88-10-8-18-4-26 4-6-8-14-8-20 0-8-8-16-12-26-4-4-28 8-58 0-88Z" fill="F" stroke="L" stroke-width="2"/><path d="M44 34c0 24-4 46-2 68M64 32v76M84 34c0 24 4 46 2 68" stroke="D" stroke-width="2" fill="none" opacity=".6"/>`,
  talisman: `<rect x="40" y="20" width="48" height="84" rx="3" fill="#f2e6c4" stroke="F" stroke-width="5"/><path d="M64 34v56M52 46h24M50 62c8 6 20 6 28 0M54 78h20" stroke="F" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M64 104v16" stroke="F" stroke-width="3"/><circle cx="64" cy="14" r="6" fill="F"/>`,
  compass: `<circle cx="64" cy="66" r="42" fill="F" stroke="L" stroke-width="3"/><circle cx="64" cy="66" r="32" fill="#1c2233" stroke="D" stroke-width="2"/><path d="m64 38 10 28-10 28-10-28Z" fill="L"/><path d="m64 38 10 28H54Z" fill="#e0525c"/><circle cx="64" cy="66" r="4" fill="#fff"/><rect x="58" y="14" width="12" height="12" rx="3" fill="F" stroke="L" stroke-width="2"/>`,
};

// [forme, couleur claire, couleur moyenne, couleur sombre]
const ITEMS = {
  "fragment-de-signature": ["shards", "#d8f4ff", "#6cc4ee", "#215a86"],
  "coeur-de-breche": ["heart", "#f2dcff", "#a370f0", "#4a2490"],
  cristal: ["crystal", "#e4f8ff", "#7ad6f7", "#2b6fa2"],
  ryo: ["coin", "#fff1c2", "#e0b453", "#7a5418"],
  "fruit-du-demon": ["fruit", "#f2d7ff", "#9b4fd0", "#4a1a72"],
  kairoseki: ["ore", "#e3eef6", "#8fa7bb", "#3a4c5e"],
  "parchemin-de-jutsu": ["scroll", "#ffd9a8", "#e0762c", "#7a3510"],
  "metal-a-chakra": ["ingot", "#dff3ff", "#6aa8d8", "#24527c"],
  "baton-lumineux": ["glowstick", "#ffe0f4", "#ff5cb8", "#8a1d5e"],
  "instrument-d-or": ["note", "#fff2c4", "#e6b84a", "#7a5612"],
  "doigt-maudit": ["finger", "#ead0d0", "#7a3a46", "#2e1018"],
  "outil-maudit": ["blade", "#e6dcff", "#6d5aa8", "#2a1f4e"],
  "fleur-de-glycine": ["flower", "#f0e0ff", "#b38be6", "#5a3a8c"],
  "acier-ecarlate": ["ingot", "#ffd6d0", "#d8453a", "#6e1410"],
  trophee: ["trophy", "#fff3c8", "#e8b93e", "#7a5810"],
  "equipement-de-legende": ["armor", "#d8f6e4", "#3fb877", "#145a36"],
  "fragment-d-alter": ["shards", "#d4ffe8", "#3ed69a", "#106a46"],
  "costume-de-heros": ["suit", "#d6e6ff", "#3f74e0", "#14306e"],
  "cristal-de-reiatsu": ["crystal", "#dcf2ff", "#4aa6f0", "#163f7a"],
  "fragment-de-zanpakuto": ["brokenBlade", "#eef4fa", "#9fb4c8", "#3a4a5c"],
  "pierre-de-convocation": ["gem", "#e6f0ff", "#6c8cf4", "#2a3a8a"],
  "fragment-de-grimoire": ["book", "#e9dcff", "#7a52c4", "#331a6a"],
  "eclat-de-titan": ["shards", "#ffe6d4", "#d88a5a", "#6e3418"],
  "lame-ultra-dure": ["blade", "#eef6fa", "#a8bccc", "#3a4c5a"],
  "licence-de-hunter": ["card", "#e6f0f8", "#52606e", "#1a2028"],
  "carte-de-greed-island": ["card", "#fff0c8", "#d8a03a", "#6a4a10"],
  "pierre-philosophale": ["gem", "#ffd4d8", "#e0323e", "#6a0a14"],
  "cristal-de-magie": ["crystal", "#f4dcff", "#c060f0", "#5a1a80"],
  "fleche-du-stand": ["arrow", "#fff0c4", "#d8b048", "#6a5010"],
  "masque-de-pierre": ["mask", "#ece4d4", "#a89878", "#4a3e28"],
  "graine-de-senzu": ["bean", "#e4ffd0", "#6cc84a", "#2a6418"],
  "armure-saiyan": ["armor", "#f4f6fa", "#c8ccd6", "#3a5a8a"],
  "larme-d-ombre": ["drop", "#dcd4f0", "#4a3a7a", "#140e28"],
  "lame-maudite": ["blade", "#ffd8e0", "#a02a48", "#3a0816"],
  // Armes légendaires
  "lame-de-la-breche": ["blade", "#f0e6ff", "#9a6af0", "#3a1a80"],
  "voile-d-ombre": ["veil", "#d8d4ee", "#3e3868", "#120e24"],
  "grimoire-des-eclats": ["book", "#dcf4ff", "#3e9ad8", "#123a66"],
  "talisman-des-signatures": ["talisman", "#ffd4dc", "#c8324a", "#5a0a18"],
  "boussole-des-horizons": ["compass", "#fff0c8", "#d8a440", "#5a3e10"],
};

const svg = (key, [shape, light, mid, dark]) => {
  const body = SHAPES[shape].replaceAll('"F"', `"url(#f)"`).replaceAll('"L"', `"${light}"`).replaceAll('"D"', `"${dark}"`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128"><title>${key} (visuel temporaire)</title>
<defs><radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${mid}" stop-opacity=".45"/><stop offset="1" stop-color="${mid}" stop-opacity="0"/></radialGradient>
<linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset=".45" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>
<circle cx="64" cy="64" r="62" fill="url(#g)"/>${body}</svg>\n`;
};

mkdirSync(OUT, { recursive: true });
for (const [key, spec] of Object.entries(ITEMS)) writeFileSync(join(OUT, `${key}.svg`), svg(key, spec));
console.log(`${Object.keys(ITEMS).length} visuels écrits dans public/items/`);
