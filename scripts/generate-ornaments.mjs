// Génère les ornements « horlogerie brisée » (docs/direction-artistique.md §4.13) en SVG statiques.
// Traits noirs : les fichiers servent de masques CSS, la couleur vient de `background-color`.
// Usage : node scripts/generate-ornaments.mjs
import { writeFileSync } from "node:fs";

const TAU = Math.PI * 2;
const P = (r, a) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
const S = (w) => `fill="none" stroke="#000" stroke-width="${w}" stroke-linejoin="miter"`;

function gear({ n, r, h, missing = [], spokes = 5, brokenSpoke = -1, crack = null, cut = null, w = 1.2 }) {
  const s = TAU / n;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i * s - Math.PI / 2;
    if (cut && i >= cut[0] && i <= cut[1]) { pts.push(P(r * (0.62 + 0.1 * ((i * 7) % 3)), a), P(r * (0.5 + 0.08 * ((i * 5) % 3)), a + s * 0.5)); continue; }
    if (missing.includes(i)) { pts.push(P(r, a), P(r + h * 0.35, a + s * 0.18), P(r - h * 0.2, a + s * 0.32), P(r, a + s * 0.52)); continue; }
    pts.push(P(r, a), P(r + h, a + s * 0.2), P(r + h, a + s * 0.3), P(r, a + s * 0.52));
  }
  const R = r + h + 3;
  let o = `<path ${S(w)} d="M${pts.join("L")}Z"/>`;
  o += `<circle ${S(w * 0.7)} r="${(r * 0.78).toFixed(1)}"/><circle ${S(w)} r="${(r * 0.2).toFixed(1)}"/><circle ${S(w * 0.7)} r="${(r * 0.08).toFixed(1)}"/>`;
  for (let k = 0; k < spokes; k++) {
    const a = (k * TAU) / spokes - Math.PI / 2;
    const end = k === brokenSpoke ? r * 0.48 : r * 0.78;
    o += `<path ${S(w)} d="M${P(r * 0.2, a)}L${P(end, a)}"/>`;
    if (k === brokenSpoke) o += `<path ${S(w)} d="M${P(end, a)}L${P(r * 0.53, a + 0.06)}M${P(r * 0.6, a - 0.03)}L${P(r * 0.78, a)}"/>`;
  }
  if (crack !== null) {
    let d = `M${P(r + h * 0.5, crack)}`;
    [0.9, 0.78, 0.66, 0.55, 0.42].forEach((f, j) => { d += `L${P(r * f, crack + (j % 2 ? 0.07 : -0.05))}`; });
    d += `M${P(r * 0.66, crack - 0.05)}L${P(r * 0.6, crack - 0.16)}`;
    o += `<path ${S(w * 0.85)} d="${d}"/>`;
  }
  return svg(R, o);
}

function dial({ r = 100, gap = [0.62, 0.7], w = 1.2 }) {
  const R = r + 8;
  const a0 = TAU * gap[1] - Math.PI / 2, a1 = TAU * (1 + gap[0]) - Math.PI / 2;
  let o = `<path ${S(w)} d="M${P(r, a0)}A${r} ${r} 0 1 1 ${P(r, a1)}"/>`;
  o += `<circle ${S(w * 0.7)} r="${r * 0.9}" stroke-dasharray="1 4"/><circle ${S(w * 0.7)} r="${r * 0.62}"/><circle ${S(w * 0.7)} r="${r * 0.3}"/>`;
  for (let i = 0; i < 60; i++) {
    const f = i / 60;
    if (f > gap[0] && f < gap[1]) continue;
    const a = (i * TAU) / 60 - Math.PI / 2;
    o += `<path ${S(i % 5 ? w * 0.7 : w)} d="M${P(r, a)}L${P(i % 5 ? r * 0.95 : r * 0.86, a)}"/>`;
  }
  for (const f of [0, 0.25, 0.5, 0.75]) {
    if (f > gap[0] && f < gap[1]) continue;
    const a = f * TAU - Math.PI / 2, x = r * 0.62 * Math.cos(a), y = r * 0.62 * Math.sin(a);
    o += `<path fill="#000" d="M${x.toFixed(2)} ${(y - 5).toFixed(2)}L${(x + 4).toFixed(2)} ${y.toFixed(2)}L${x.toFixed(2)} ${(y + 5).toFixed(2)}L${(x - 4).toFixed(2)} ${y.toFixed(2)}Z"/>`;
  }
  o += `<path ${S(w * 0.85)} d="M${P(r * 0.32, -0.6)}L${P(r * 0.45, -0.48)}L${P(r * 0.52, -0.58)}L${P(r * 0.7, -0.42)}L${P(r * 0.78, -0.5)}L${P(r * 1.02, -0.38)}M${P(r * 0.52, -0.58)}L${P(r * 0.6, -0.75)}"/>`;
  o += `<path ${S(w * 0.85)} d="M${P(r * 0.3, 2.3)}L${P(r * 0.42, 2.42)}L${P(r * 0.55, 2.33)}L${P(r * 0.66, 2.45)}"/>`;
  return svg(R, o);
}

function svg(R, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-R} ${-R} ${2 * R} ${2 * R}" width="${2 * R}" height="${2 * R}">${body}</svg>\n`;
}

function rack() {
  let d = "M0 15H94";
  for (let x = 2; x < 94; x += 8) d += `M${x} 15L${x + 2} 7L${x + 4} 7L${x + 6} 15`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 18" width="96" height="18"><path ${S(1.2)} d="${d}"/></svg>\n`;
}

const out = "public/ornaments/";
const files = {
  "gear-broken.svg": gear({ n: 28, r: 150, h: 14, missing: [3, 4, 17], spokes: 6, brokenSpoke: 2, crack: 2.2 }),
  "pinion-broken.svg": gear({ n: 12, r: 58, h: 12, missing: [7], spokes: 4 }),
  "gear-ruin.svg": gear({ n: 20, r: 100, h: 12, cut: [9, 15], spokes: 5, brokenSpoke: 3, crack: 0.4 }),
  "dial-cracked.svg": dial({ r: 100, gap: [0.3, 0.42] }),
  "dial-open.svg": dial({ r: 90, gap: [0.1, 0.24] }),
  "summon-dial.svg": dial({ r: 100, gap: [0.36, 0.44], w: 1.4 }),
  "summon-gear.svg": gear({ n: 16, r: 44, h: 8, missing: [5], spokes: 4, brokenSpoke: 1, crack: 1.2, w: 1.4 }),
  "summon-pinion.svg": gear({ n: 10, r: 32, h: 7, spokes: 3, w: 1.4 }),
  "pinion-small.svg": gear({ n: 8, r: 7, h: 3, spokes: 0, w: 1.1 }),
  "rack.svg": rack(),
};
for (const [name, content] of Object.entries(files)) writeFileSync(out + name, content);
console.log(Object.keys(files).join(", "));
