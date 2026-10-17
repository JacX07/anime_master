// Dessine l'illustration de l'écran de chargement (public/loading/breche.svg) : l'atrium futuriste, la brèche au centre,
// des éclats de cristal et des cartes qui s'en échappent. Tout est vectoriel (net à toute résolution) et original.
// Écrit aussi deux couches séparées pour la maquette 2D (public/pack-opening/maquette-2d) : le décor seul et la brèche seule,
// que la page anime indépendamment.
// Relancer après modification : node scripts/draw-loading-art.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const W = 1920, H = 1080, CX = 960, HY = 700; // HY : ligne d'horizon (pied des verrières)
let seed = 7;
const R = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = (a, b) => a + R() * (b - a);
const pick = (a) => a[Math.floor(R() * a.length)];
const f = (n) => Math.round(n * 10) / 10;

// Forme de la brèche : une lentille verticale
const RIFT = { top: 70, bottom: 720, w: 190 };
const lens = (k = 1, cy = (RIFT.top + RIFT.bottom) / 2) => {
  const h = ((RIFT.bottom - RIFT.top) / 2) * k, w = RIFT.w * k;
  return `M${CX},${f(cy - h)} C${f(CX + w)},${f(cy - h * 0.45)} ${f(CX + w)},${f(cy + h * 0.45)} ${CX},${f(cy + h)} C${f(CX - w)},${f(cy + h * 0.45)} ${f(CX - w)},${f(cy - h * 0.45)} ${CX},${f(cy - h)}Z`;
};

// Contour irrégulier de la brèche : la lentille échantillonnée, avec un bord déchiqueté (plus marqué au milieu)
const jagged = (() => {
  const h = (RIFT.bottom - RIFT.top) / 2, cy = (RIFT.top + RIFT.bottom) / 2, pts = [];
  for (const side of [1, -1]) {
    for (let i = 0; i <= 60; i++) {
      const t = side === 1 ? i / 60 : 1 - i / 60, y = cy - h + t * 2 * h;
      const bulge = Math.pow(Math.sin(Math.PI * t), 0.85), jag = (R() - 0.5) * 26 * Math.sin(Math.PI * t);
      pts.push(`${f(CX + side * (RIFT.w * 0.76 * bulge + jag))},${f(y)}`);
    }
  }
  return `M${pts.join(" L")}Z`;
})();
// Fissures d'énergie : lignes brisées qui partent des pointes et des flancs
const crack = (x, y, ang, len) => {
  let d = `M${f(x)},${f(y)}`, a = ang;
  for (let i = 0; i < 6; i++) { a += rnd(-0.6, 0.6); x += Math.cos(a) * len / 6; y += Math.sin(a) * len / 6; d += ` L${f(x)},${f(y)}`; }
  return d;
};

// Chaque morceau est rangé dans une couche : decor (fond fixe), rift (la brèche), fx (éclats, cartes, étincelles),
// reflect (reflet de la brèche au sol), all (en-tête et définitions communes)
const out = [];
let layer = "all";
const add = (s) => out.push({ layer, s });

add(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">`);
add(`<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1a38"/><stop offset=".45" stop-color="#2f4f8c"/><stop offset=".8" stop-color="#8fb2e6"/><stop offset="1" stop-color="#c9dcf6"/></linearGradient>
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22355e"/><stop offset=".35" stop-color="#121f3d"/><stop offset="1" stop-color="#070d1a"/></linearGradient>
  <linearGradient id="pillar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7f93b8"/><stop offset=".35" stop-color="#eef3fb"/><stop offset=".6" stop-color="#c3d0e6"/><stop offset="1" stop-color="#5d7098"/></linearGradient>
  <linearGradient id="pillarFront" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0d1730"/><stop offset=".55" stop-color="#1f3158"/><stop offset=".85" stop-color="#8aa3cf"/><stop offset="1" stop-color="#2a3d66"/></linearGradient>
  <linearGradient id="spire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f8ff"/><stop offset="1" stop-color="#9db6dc"/></linearGradient>
  <linearGradient id="riftFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b3cff"/><stop offset=".35" stop-color="#1d3fd1"/><stop offset=".6" stop-color="#0b8fb0"/><stop offset=".85" stop-color="#3b2a9e"/><stop offset="1" stop-color="#a77dff"/></linearGradient>
  <radialGradient id="riftCore" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".25" stop-color="#bff6ff" stop-opacity=".7"/><stop offset=".6" stop-color="#4d7dff" stop-opacity=".25"/><stop offset="1" stop-color="#2b1a7a" stop-opacity="0"/></radialGradient>
  <radialGradient id="riftGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8fb4ff" stop-opacity=".9"/><stop offset=".45" stop-color="#6b3cff" stop-opacity=".45"/><stop offset="1" stop-color="#2b6cff" stop-opacity="0"/></radialGradient>
  <linearGradient id="riftEdge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9dcff"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#9ff7e6"/></linearGradient>
  <linearGradient id="shard" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#bfeaff"/><stop offset="1" stop-color="#7f8dff"/></linearGradient>
  <linearGradient id="holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7ad9"/><stop offset=".3" stop-color="#ffe27a"/><stop offset=".55" stop-color="#6ff2cf"/><stop offset=".8" stop-color="#6fb6ff"/><stop offset="1" stop-color="#b08cff"/></linearGradient>
  <linearGradient id="cardBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2f66"/><stop offset="1" stop-color="#0c1736"/></linearGradient>
  <linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".22"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  <radialGradient id="vignette" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#050a16" stop-opacity="0"/><stop offset="1" stop-color="#050a16" stop-opacity=".75"/></radialGradient>
  <radialGradient id="floorShine" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#9fc2ff" stop-opacity=".55"/><stop offset="1" stop-color="#9fc2ff" stop-opacity="0"/></radialGradient>
  <clipPath id="riftClip"><path d="${jagged}"/></clipPath>
  <clipPath id="aboveFloor"><rect width="${W}" height="${HY}"/></clipPath>
  <filter id="blur40" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
  <filter id="blur12" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="12"/></filter>
  <filter id="blur4" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="blur2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter>
  <filter id="reflect" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7 2"/></filter>
</defs>`);

layer = "decor";
// Ciel et ville lointaine vus à travers les verrières
add(`<rect width="${W}" height="${HY}" fill="url(#sky)"/>`);
for (let i = 0; i < 46; i++) { // étoiles discrètes en haut du ciel
  add(`<circle cx="${f(rnd(0, W))}" cy="${f(rnd(0, 260))}" r="${f(rnd(0.6, 1.8))}" fill="#fff" opacity="${f(rnd(0.2, 0.7))}"/>`);
}
add(`<g opacity=".55">`);
for (let i = 0; i < 34; i++) {
  const x = rnd(40, W - 40), h = rnd(70, 300), w = rnd(12, 38);
  add(`<path d="M${f(x - w / 2)},${HY} L${f(x - w * 0.3)},${f(HY - h * 0.8)} L${f(x)},${f(HY - h)} L${f(x + w * 0.3)},${f(HY - h * 0.8)} L${f(x + w / 2)},${HY}Z" fill="url(#spire)" opacity="${f(rnd(0.35, 0.9))}"/>`);
  if (R() < 0.5) add(`<rect x="${f(x - w * 0.42)}" y="${f(HY - h * rnd(0.3, 0.6))}" width="${f(w * 0.84)}" height="2" fill="#7fd8ff" opacity=".8"/>`);
}
add(`</g>`);
// Îles flottantes
[[300, 300, 1.1], [1610, 250, 1.3], [520, 470, 0.6], [1430, 450, 0.7], [180, 520, 0.5], [1760, 520, 0.55]].forEach(([x, y, s]) => {
  const w = 130 * s, d = 90 * s;
  add(`<g opacity=".7"><path d="M${f(x - w)},${y} Q${x},${f(y - 22 * s)} ${f(x + w)},${y} L${f(x + w * 0.5)},${f(y + d * 0.45)} L${f(x + w * 0.15)},${f(y + d)} L${f(x - w * 0.25)},${f(y + d * 0.6)} L${f(x - w * 0.6)},${f(y + d * 0.35)}Z" fill="#5b729f"/>`);
  add(`<path d="M${f(x - w)},${y} Q${x},${f(y - 22 * s)} ${f(x + w)},${y} Q${x},${f(y + 10 * s)} ${f(x - w)},${y}Z" fill="#9fe3cf"/>`);
  add(`<path d="M${f(x - w * 0.3)},${f(y - 8 * s)} l${f(6 * s)},${f(-60 * s)} l${f(6 * s)},${f(60 * s)}Z" fill="#eef4ff"/></g>`);
});
// Rais de lumière
add(`<g style="mix-blend-mode:screen">`);
[[1250, 160], [1420, 120], [1580, 200]].forEach(([x, w]) => add(`<path d="M${x},0 L${x + w},0 L${x + w - 520},${HY} L${x - 520},${HY}Z" fill="url(#shaft)" opacity=".7"/>`));
add(`</g>`);

// Verrières : traverses horizontales et montants fins
add(`<g stroke="#e8f0ff" opacity=".22">`);
[250, 470].forEach((y) => add(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke-width="3"/>`));
add(`</g>`);
// Piliers du fond, disposés sur le cercle de l'atrium
for (let a = -78; a <= 78; a += 13) {
  const r = (a * Math.PI) / 180, x = CX + 1020 * Math.sin(r), w = 18 + 52 * Math.cos(r) * Math.cos(r);
  if (Math.abs(a) < 20) continue; // cachés derrière la brèche
  add(`<rect x="${f(x - w / 2)}" y="105" width="${f(w)}" height="${HY - 95}" rx="${f(w / 2.6)}" fill="url(#pillar)"/>`);
  add(`<rect x="${f(x - w * 0.06)}" y="130" width="${f(Math.max(2, w * 0.12))}" height="${HY - 150}" fill="#9fd0ff" opacity=".55"/>`);
}
// Poutre circulaire du plafond avec sa ligne lumineuse
add(`<path d="M-80,170 Q${CX},-40 ${W + 80},170" fill="none" stroke="#e9f0fb" stroke-width="54"/>`);
add(`<path d="M-80,200 Q${CX},-8 ${W + 80},200" fill="none" stroke="#2b6cff" stroke-width="5" opacity=".9"/>`);
add(`<path d="M-80,200 Q${CX},-8 ${W + 80},200" fill="none" stroke="#7fb0ff" stroke-width="16" opacity=".35" filter="url(#blur12)"/>`);

layer = "rift";
// La brèche : halo, corps, tourbillons, bord lumineux, cœur
add(`<ellipse cx="${CX}" cy="400" rx="520" ry="470" fill="url(#riftGlow)" filter="url(#blur40)" opacity=".9"/>`);
add(`<path d="${lens(1.18)}" fill="#8f6bff" opacity=".45" filter="url(#blur12)"/>`);
add(`<path d="${jagged}" fill="url(#riftFill)"/>`);
add(`<g clip-path="url(#riftClip)" style="mix-blend-mode:screen">`);
const swirl = ["#6ff2cf", "#a77dff", "#5fb8ff", "#ffffff", "#2b6cff", "#00c8b4", "#d9b8ff"];
for (let i = 0; i < 70; i++) {
  const x0 = CX + rnd(-200, 200), y0 = rnd(RIFT.top, RIFT.bottom), len = rnd(120, 420), bend = rnd(-160, 160);
  add(`<path d="M${f(x0)},${f(y0)} q${f(bend)},${f(len * 0.5)} ${f(rnd(-60, 60))},${f(len)}" fill="none" stroke="${pick(swirl)}" stroke-width="${f(rnd(1.5, 9))}" stroke-linecap="round" opacity="${f(rnd(0.15, 0.7))}"${R() < 0.35 ? ' filter="url(#blur4)"' : ""}/>`);
}
for (let i = 0; i < 90; i++) add(`<circle cx="${f(CX + rnd(-170, 170))}" cy="${f(rnd(RIFT.top, RIFT.bottom))}" r="${f(rnd(0.8, 3))}" fill="#fff" opacity="${f(rnd(0.3, 1))}"/>`);
add(`<ellipse cx="${CX}" cy="395" rx="150" ry="300" fill="url(#riftCore)"/>`);
add(`<rect x="${CX - 3}" y="${RIFT.top + 40}" width="6" height="${RIFT.bottom - RIFT.top - 80}" fill="#fff" filter="url(#blur4)" opacity=".9"/>`);
add(`</g>`);
add(`<path d="${jagged}" fill="none" stroke="url(#riftEdge)" stroke-width="14" opacity=".55" filter="url(#blur12)"/>`);
add(`<path d="${jagged}" fill="none" stroke="url(#riftEdge)" stroke-width="3" stroke-linejoin="round"/>`);
const cracks = [
  ...[0, 1, 2].map(() => crack(CX, RIFT.top + 6, -Math.PI / 2 + rnd(-0.9, 0.9), rnd(60, 130))),
  ...[0, 1].map(() => crack(CX, RIFT.bottom - 6, Math.PI / 2 + rnd(-0.7, 0.7), rnd(40, 80))),
  ...[0, 1, 2, 3].map((i) => crack(CX + (i % 2 ? 1 : -1) * 140, rnd(260, 540), (i % 2 ? 0 : Math.PI) + rnd(-0.5, 0.5), rnd(70, 150))),
];
add(`<g fill="none" stroke-linecap="round" stroke-linejoin="round">${cracks.map((d) => `<path d="${d}" stroke="#b9a8ff" stroke-width="7" opacity=".35" filter="url(#blur4)"/><path d="${d}" stroke="#ffffff" stroke-width="1.6" opacity=".9"/>`).join("")}</g>`);

layer = "fx";
// Éclats de cristal qui s'échappent de la brèche
const shards = [];
for (let i = 0; i < 70; i++) {
  const ang = rnd(0, Math.PI * 2), dist = rnd(220, 760), x = CX + Math.cos(ang) * dist * 1.25, y = 400 + Math.sin(ang) * dist * 0.62;
  if (y > HY - 10 || y < 40) continue;
  const s = rnd(6, 34) * (dist < 400 ? 1 : 0.8), rot = rnd(0, 360);
  shards.push(`<path transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})" d="M0,${f(-s)} L${f(s * 0.45)},${f(-s * 0.1)} L${f(s * 0.12)},${f(s)} L${f(-s * 0.4)},${f(s * 0.2)}Z" fill="url(#shard)" opacity="${f(rnd(0.45, 0.95))}"${s < 12 ? ' filter="url(#blur2)"' : ""}/>`);
}
add(`<g>${shards.join("")}</g>`);

// Cartes qui jaillissent de la brèche (dos holographique, quelques-unes face visible)
const card = (x, y, s, rot, face) => {
  const w = 52 * s, h = 74 * s;
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})" opacity="${f(Math.min(1, 0.55 + s * 0.3))}">
    <rect x="${f(-w / 2 - 6 * s)}" y="${f(-h / 2 - 6 * s)}" width="${f(w + 12 * s)}" height="${f(h + 12 * s)}" rx="${f(8 * s)}" fill="#9fd8ff" opacity=".35" filter="url(#blur4)"/>
    <rect x="${f(-w / 2)}" y="${f(-h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(5 * s)}" fill="${face ? "url(#holo)" : "url(#cardBack)"}" stroke="#f2f7ff" stroke-width="${f(1.6 * s)}"/>
    ${face
      ? `<rect x="${f(-w / 2 + 5 * s)}" y="${f(-h / 2 + 5 * s)}" width="${f(w - 10 * s)}" height="${f(h * 0.58)}" rx="${f(3 * s)}" fill="#ffffff" opacity=".55"/><rect x="${f(-w / 2 + 5 * s)}" y="${f(h * 0.18)}" width="${f(w - 10 * s)}" height="${f(3 * s)}" fill="#fff" opacity=".8"/>`
      : `<path d="M0,${f(-h * 0.22)} L${f(w * 0.22)},0 L0,${f(h * 0.22)} L${f(-w * 0.22)},0Z" fill="none" stroke="#6fd8ff" stroke-width="${f(1.6 * s)}"/><circle r="${f(3 * s)}" fill="#6ff2cf"/>`}
  </g>`;
};
const cards = [
  [690, 210, 1.1, -24, true], [1235, 180, 1.25, 18, false], [560, 420, 1.6, -12, false], [1390, 380, 1.7, 14, true],
  [800, 560, 0.9, -38, false], [1120, 590, 1.0, 30, true], [430, 250, 0.8, -40, true], [1520, 230, 0.85, 36, false],
  [330, 520, 1.25, -8, true], [1640, 560, 1.35, 10, false], [880, 130, 0.6, -15, false], [1060, 120, 0.65, 22, true],
  [610, 640, 0.7, -50, true], [1300, 650, 0.75, 44, false], [220, 360, 0.6, -28, false], [1730, 380, 0.65, 25, true],
];
add(`<g>${cards.map((c) => card(...c)).join("")}</g>`);

// Étincelles
for (let i = 0; i < 140; i++) {
  const ang = rnd(0, Math.PI * 2), dist = rnd(120, 820);
  const x = CX + Math.cos(ang) * dist * 1.2, y = 400 + Math.sin(ang) * dist * 0.6;
  if (y > HY || y < 20) continue;
  add(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(rnd(0.8, 2.6))}" fill="${pick(["#ffffff", "#bff6ff", "#d9c8ff"])}" opacity="${f(rnd(0.35, 1))}"/>`);
}

layer = "decor";
// Sol réfléchissant : fond, plinthe lumineuse, reflet de la brèche, anneaux lumineux
add(`<rect y="${HY}" width="${W}" height="${H - HY}" fill="url(#floor)"/>`);
add(`<rect y="${HY - 14}" width="${W}" height="16" fill="#cfdcf0"/><rect y="${HY + 1}" width="${W}" height="3" fill="#2b6cff"/><rect y="${HY - 4}" width="${W}" height="14" fill="#2b6cff" opacity=".35" filter="url(#blur4)"/>`);
layer = "reflect";
add(`<g transform="translate(0 ${2 * HY}) scale(1 -1)" opacity=".42" filter="url(#reflect)" clip-path="url(#aboveFloor)">
  <ellipse cx="${CX}" cy="400" rx="420" ry="380" fill="url(#riftGlow)" opacity=".8"/>
  <path d="${jagged}" fill="url(#riftFill)"/>
  <ellipse cx="${CX}" cy="395" rx="150" ry="300" fill="url(#riftCore)"/>
</g>`);
add(`<ellipse cx="${CX}" cy="${HY + 60}" rx="560" ry="70" fill="url(#floorShine)"/>`);
layer = "decor";
[[1280, 190, "#2b6cff", 3, 0.55], [900, 130, "#2b6cff", 4, 0.8], [560, 78, "#00c8b4", 3, 0.85], [300, 40, "#9fd0ff", 2, 0.6]].forEach(([rx, ry, c, sw, o]) => {
  const cy = HY + 150;
  add(`<ellipse cx="${CX}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${c}" stroke-width="${sw * 4}" opacity="${f(o * 0.35)}" filter="url(#blur4)"/>`);
  add(`<ellipse cx="${CX}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${c}" stroke-width="${sw}" opacity="${o}"/>`);
});
// Rayons du sol, en perspective vers le centre
add(`<g stroke="#8fb4ff" stroke-width="1.5" opacity=".18">`);
for (let i = -9; i <= 9; i++) add(`<line x1="${CX + i * 40}" y1="${HY}" x2="${CX + i * 260}" y2="${H}"/>`);
add(`</g>`);

// Piliers du premier plan qui cadrent la scène
add(`<rect x="-40" y="0" width="230" height="${H}" fill="url(#pillarFront)"/>`);
add(`<rect x="196" y="0" width="12" height="${H}" fill="#2b6cff" opacity=".7"/><rect x="190" y="0" width="24" height="${H}" fill="#2b6cff" opacity=".25" filter="url(#blur12)"/>`);
add(`<g transform="translate(${W} 0) scale(-1 1)"><rect x="-40" y="0" width="230" height="${H}" fill="url(#pillarFront)"/><rect x="196" y="0" width="12" height="${H}" fill="#00c8b4" opacity=".7"/><rect x="190" y="0" width="24" height="${H}" fill="#00c8b4" opacity=".25" filter="url(#blur12)"/></g>`);

add(`<rect width="${W}" height="${H}" fill="url(#vignette)"/>`);
layer = "all";
add(`</svg>`);

const write = (file, layers, viewBox) => {
  let svg = out.filter((o) => layers.includes(o.layer)).map((o) => o.s).join("\n");
  if (viewBox) svg = svg.replace(/viewBox="[^"]*" preserveAspectRatio="[^"]*"/, `viewBox="${viewBox}"`);
  writeFileSync(file, svg);
  console.log(file, Math.round(svg.length / 1024), "Ko");
};
write("public/loading/breche.svg", ["all", "decor", "rift", "fx", "reflect"]);
mkdirSync("public/pack-opening/maquette-2d", { recursive: true });
write("public/pack-opening/maquette-2d/decor.svg", ["all", "decor"]);
// La brèche seule, recadrée autour d'elle (le halo déborde largement) : la page la place au centre du décor
write("public/pack-opening/maquette-2d/rift.svg", ["all", "rift"], `${CX - 560} -100 1120 960`);
