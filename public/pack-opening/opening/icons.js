// Jeu d'icônes maison (public/icons/icons.json, partagé avec le site) pour la scène 3D :
// - installSprite() : symboles SVG pour le HUD (DOM) ;
// - drawIcon() : même tracé sur un canevas, pour peindre les cartes.
let DATA = null;

export async function loadIcons() {
  DATA = await (await fetch(new URL("../../icons/icons.json", import.meta.url))).json();
  return DATA;
}

const NS = "http://www.w3.org/2000/svg";

export function installSprite() {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.setAttribute("aria-hidden", "true"); svg.style.position = "absolute";
  svg.innerHTML = '<defs><linearGradient id="am-lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b8bff"/><stop offset="1" stop-color="#00c8b4"/></linearGradient></defs>';
  for (const [id, { viewBox, shapes }] of Object.entries(DATA)) {
    const sym = document.createElementNS(NS, "symbol"); sym.id = `am-${id}`; sym.setAttribute("viewBox", viewBox);
    for (const { tag, attrs } of shapes) {
      const el = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v === "url(#lg)" ? "url(#am-lg)" : v);
      sym.append(el);
    }
    svg.append(sym);
  }
  document.body.prepend(svg);
}

/** Balise <svg> pour insérer une icône dans du HTML du HUD. */
export const icon = (name, style = "") => `<svg class="i" style="${style}" aria-hidden="true"><use href="#am-${name}"/></svg>`;

export const TYPE_ACCENT = { COMBAT: "#ff6b5e", MYSTERE: "#b48cff", MAGIE: "#5fb8ff", COEUR: "#ff7fb0", AVENTURE: "#4fd6a0" };

/** Dessine une icône sur un canevas : `color` remplace currentColor, `accent` colore les détails (classes a et f). */
export function drawIcon(g, name, x, y, size, { color = "#fff", accent = color } = {}) {
  const def = DATA?.[name]; if (!def) return;
  const vb = def.viewBox.split(" ").map(Number), s = size / vb[2];
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineCap = "round"; g.lineJoin = "round";
  for (const { tag, attrs: at } of def.shapes) {
    g.save();
    const rot = /rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)/.exec(at.transform ?? "");
    if (rot) { g.translate(+rot[2], +rot[3]); g.rotate((+rot[1] * Math.PI) / 180); g.translate(-rot[2], -rot[3]); }
    const paint = (v) => (v === "currentColor" ? color : v === "url(#lg)" ? gradient(g) : v);
    let fill = "none", stroke = color;
    if (at.class === "a") stroke = accent;
    if (at.class === "f") { fill = accent; stroke = "none"; }
    if (at.fill !== undefined) fill = paint(at.fill);
    if (at.stroke !== undefined) stroke = paint(at.stroke);
    g.lineWidth = +(at["stroke-width"] ?? 1.6);
    const path = new Path2D();
    if (tag === "path") path.addPath(new Path2D(at.d));
    else if (tag === "circle") path.arc(+at.cx, +at.cy, +at.r, 0, Math.PI * 2);
    else if (tag === "rect") path.roundRect(+at.x, +at.y, +at.width, +at.height, +(at.rx ?? 0));
    const alpha = +(at.opacity ?? 1);
    if (fill !== "none") { g.globalAlpha = alpha * +(at["fill-opacity"] ?? 1); g.fillStyle = fill; g.fill(path); }
    if (stroke !== "none") { g.globalAlpha = alpha; g.strokeStyle = stroke; g.stroke(path); }
    g.restore();
  }
  g.restore();
}

function gradient(g) {
  const gr = g.createLinearGradient(0, 0, 32, 32); gr.addColorStop(0, "#4b8bff"); gr.addColorStop(1, "#00c8b4"); return gr;
}
