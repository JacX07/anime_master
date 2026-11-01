// Effets élémentaires des attaques (feu, eau, foudre, air, terre), dessinés sur un canvas posé sur la scène.
// Portage de public/mockups/elements.html : chaque effet vit dans le repère de sa cible (centre de la carte = 0,0),
// à l'échelle d'une carte de 96 px de large ; le sol est le bas de la carte ciblée.
import type { AttackElement } from "@/lib/attack-element";

type Pal = readonly [string, string, string, string];
const PALETTES: Record<AttackElement, Pal> = {
  feu: ["#fff6cf", "#ffb63d", "#ec4a1f", "#6e170c"],
  eau: ["#effcff", "#77d8ff", "#2b82dc", "#123a7a"],
  foudre: ["#ffffff", "#fff07a", "#ffc21f", "#4b2f8f"],
  air: ["#ffffff", "#d6fff0", "#86e2c0", "#2a6e5e"],
  terre: ["#f3dcaa", "#bb8b52", "#7a5530", "#33220f"],
};
const INK = "#151a36";

type Kind = "glow" | "ember" | "flame" | "tongue" | "flash" | "ring" | "drop" | "bubble" | "spark" | "converge" | "streak" | "smoke" | "chunk" | "leaf" | "crackle" | "windcut" | "pressure";
interface Particle {
  k: Kind; x: number; y: number; vx: number; vy: number; g: number; drag: number; life: number; max: number; s: number; rot: number; vr: number;
  col: string; a0: number; grow: number; flat: number; ground: number; curl: number; tx: number; ty: number;
}
interface Decal { k: "scorch" | "puddle" | "burn" | "crater"; x: number; s: number; life: number; max: number; seed: number[] }
interface Slab { dx: number; h: number; w: number; tilt: number; delay: number; pts: number[][]; crack: number[][] }
interface Effect {
  element: AttackElement; style: "magic" | "slash" | "melee"; c: Pal;
  ox: number; oy: number; k: number; ax: number; ay: number; gy: number; cw: number; ch: number;
  start: number; T: number; power: number; dodge: boolean;
  P: Particle[]; D: Decal[]; trail: number[][]; hit: boolean; bolt: number[][] | null; slabs: Slab[] | null; crumbled: boolean;
}
export interface ElementHit {
  element: AttackElement;
  style: "magic" | "slash" | "melee";
  /** Centres des cartes, dans le repère de la scène. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Taille de la carte ciblée en px. */
  card: { w: number; h: number };
  /** Millisecondes de replay avant l'impact. */
  impactAt: number;
  intensity?: number;
  dodge?: boolean;
}

const seg = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const eo = (v: number) => 1 - (1 - v) ** 3;
const R = (a: number, b: number) => a + Math.random() * (b - a);

const clouds = new Map<string, HTMLCanvasElement>();
/** Nuage bruité (fumée, poussière, brume), pré-rendu une fois par couleur. */
function cloud(col: string) {
  let c = clouds.get(col);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = c.height = 96;
  const g = c.getContext("2d")!;
  for (let i = 0; i < 34; i++) {
    const r = R(8, 26), px = 48 + R(-24, 24), py = 48 + R(-24, 24), gr = g.createRadialGradient(px, py, 0, px, py, r);
    gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = R(.12, .35); g.fillStyle = gr; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill();
  }
  clouds.set(col, c);
  return c;
}

export class ElementVfx {
  private canvas: HTMLCanvasElement;
  private x: CanvasRenderingContext2D;
  private effects: Effect[] = [];
  private speed = 1;
  private paused = false;
  private clock = 0;
  private last = 0;
  private raf = 0;
  private dpr = 1;
  private e!: Effect;

  constructor(private root: HTMLElement, private shake: (px: number, delay: number) => void) {
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;z-index:21;";
    root.append(this.canvas);
    this.x = this.canvas.getContext("2d")!;
  }

  setPlayback(speed: number, playing: boolean) { this.speed = speed; this.paused = !playing; }

  play(hit: ElementHit) {
    const k = hit.card.w / 96;
    const T = hit.impactAt / 1000;
    this.effects.push({
      element: hit.element, style: hit.style, c: PALETTES[hit.element],
      ox: hit.to.x, oy: hit.to.y, k, ax: (hit.from.x - hit.to.x) / k, ay: (hit.from.y - hit.to.y) / k,
      gy: hit.card.h / k / 2 + 4, cw: hit.card.w / k, ch: hit.card.h / k,
      start: this.clock, T, power: (hit.style === "magic" ? 1 : .7) * Math.min(1.35, hit.intensity ?? 1), dodge: !!hit.dodge,
      P: [], D: [], trail: [], hit: false, bolt: null, slabs: null, crumbled: false,
    });
    if (!hit.dodge && (hit.element === "terre" || hit.element === "foudre")) this.shake(hit.element === "terre" ? 7 : 4, hit.impactAt);
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  }

  clear() {
    this.effects = [];
    cancelAnimationFrame(this.raf); this.raf = 0;
    this.x.setTransform(1, 0, 0, 1, 0, 0);
    this.x.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  destroy() { this.clear(); this.canvas.remove(); }

  private frame = (now: number) => {
    const real = Math.min(.05, (now - this.last) / 1000);
    this.last = now;
    const dt = this.paused ? 0 : real * this.speed;
    this.clock += dt;
    const w = this.root.scrollWidth, h = this.root.scrollHeight, dpr = window.devicePixelRatio || 1;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = `${w}px`; this.canvas.style.height = `${h}px`;
    }
    this.dpr = dpr;
    const x = this.x;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.effects = this.effects.filter((e) => {
      const t = this.clock - e.start;
      if (t > e.T + 2.6 && !e.P.length) return false;
      this.e = e;
      x.setTransform(dpr * e.k, 0, 0, dpr * e.k, dpr * e.ox, dpr * e.oy);
      this.decals(dt);
      this.attack(t);
      e.P = e.P.filter((p) => this.particle(p, dt));
      x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
      return true;
    });
    this.raf = this.effects.length ? requestAnimationFrame(this.frame) : 0;
    if (!this.raf) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, this.canvas.width, this.canvas.height); }
  };

  // ---------- primitives (repère local de l'effet courant)
  private add(p: Partial<Particle> & { k: Kind; x: number; y: number }) {
    this.e.P.push({ vx: 0, vy: 0, g: 0, drag: 1, life: 0, max: .6, s: 4, rot: R(0, 6), vr: 0, col: "#fff", a0: .6, grow: 0, flat: 1, ground: 0, curl: 0, tx: 0, ty: 0, ...p });
  }
  private glow(px: number, py: number, r: number, col: string, a = 1) {
    if (r <= 0 || a <= 0) return;
    const x = this.x, g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
    x.globalAlpha = Math.min(1, a); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); x.globalAlpha = 1;
  }
  private additive(fn: () => void) { this.x.globalCompositeOperation = "lighter"; fn(); this.x.globalCompositeOperation = "source-over"; }
  private stroke(pts: number[][], w: number, col: string) {
    const x = this.x;
    x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]));
    x.lineWidth = w; x.strokeStyle = col; x.lineJoin = "round"; x.lineCap = "round"; x.stroke();
  }
  private bolt(x1: number, y1: number, x2: number, y2: number, j: number, n = 12) {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, pts = [[x1, y1]];
    for (let i = 1; i < n; i++) { const t = i / n, o = R(-j, j), a = R(-j, j) * .3; pts.push([x1 + dx * t + nx * o + dx / l * a, y1 + dy * t + ny * o + dy / l * a]); }
    pts.push([x2, y2]);
    return pts;
  }
  private crescent(cx: number, cy: number, r: number, a0: number, a1: number, w: number, c: string) {
    const x = this.x;
    x.beginPath(); x.arc(cx, cy, r, a0, a1); x.arc(cx + w * .5, cy - w * .2, r - w, a1, a0, true); x.closePath(); x.fillStyle = c; x.fill();
  }
  /** Lumière : halo diffus et flaque aplatie au pied de la cible. */
  private lamp(px: number, py: number, r: number, col: string, a: number) {
    this.additive(() => {
      this.glow(px, py, r, col, a * .3);
      const x = this.x; x.save(); x.translate(px, this.e.gy + 2); x.scale(1, .22); this.glow(0, 0, r * 1.1, col, a * .5); x.restore();
    });
  }
  private decal(k: Decal["k"], px: number, s: number, max = 2) {
    this.e.D.push({ k, x: px, s, life: 0, max, seed: Array.from({ length: 12 }, () => Math.random()) });
  }

  // ---------- marques au sol
  private decals(dt: number) {
    const x = this.x, c = this.e.c;
    this.e.D = this.e.D.filter((d) => {
      d.life += dt;
      if (d.life > d.max) return false;
      const a = Math.min(1, d.life * 8) * (1 - seg(d.life, d.max * .6, d.max));
      x.save(); x.translate(d.x, this.e.gy + 2);
      if (d.k === "scorch" || d.k === "burn" || d.k === "crater") {
        x.save(); x.scale(1, .22);
        const g = x.createRadialGradient(0, 0, 0, 0, 0, d.s);
        g.addColorStop(0, "rgba(10,5,5,.75)"); g.addColorStop(.7, "rgba(30,15,10,.4)"); g.addColorStop(1, "rgba(0,0,0,0)");
        x.globalAlpha = a; x.fillStyle = g; x.beginPath(); x.arc(0, 0, d.s, 0, 7); x.fill(); x.restore();
      }
      if (d.k === "burn") this.additive(() => {
        for (let i = 0; i < 12; i++) {
          const ang = d.seed[i] * 6.28, r = d.s * .8 * d.seed[(i + 3) % 12], fl = .5 + .5 * Math.sin(d.life * 30 + i * 7);
          x.globalAlpha = a * fl * (1 - seg(d.life, .1, .9));
          this.stroke([[0, 0], [Math.cos(ang) * r, Math.sin(ang) * r * .22]], 1.5, c[1]);
        }
      });
      if (d.k === "puddle") {
        x.scale(1, .2); x.globalAlpha = a * .75;
        const g = x.createRadialGradient(0, 0, 0, 0, 0, d.s); g.addColorStop(0, c[2]); g.addColorStop(1, "rgba(40,120,220,0)");
        x.fillStyle = g; x.beginPath(); x.arc(0, 0, d.s, 0, 7); x.fill();
        for (let i = 0; i < 3; i++) { const k = (d.life * 1.4 + i / 3) % 1; x.globalAlpha = a * (1 - k) * .8; x.strokeStyle = c[0]; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, d.s * .2 + d.s * .8 * k, 0, 7); x.stroke(); }
      }
      if (d.k === "crater") {
        x.globalAlpha = a;
        for (let i = 0; i < 9; i++) {
          const ang = d.seed[i] * 6.28, r = d.s * (.6 + .6 * d.seed[(i + 1) % 12]), pts = [[0, 0]];
          for (let j = 1; j <= 4; j++) pts.push([Math.cos(ang) * r * j / 4 + (d.seed[(i + j) % 12] - .5) * 10, Math.sin(ang) * r * j / 4 * .22 + (d.seed[(i + j + 2) % 12] - .5) * 2]);
          this.stroke(pts, 2, "rgba(0,0,0,.8)"); x.globalAlpha = a * .5; this.stroke(pts.map((p) => [p[0], p[1] - 1.5]), 1, c[0]); x.globalAlpha = a;
        }
      }
      x.restore(); x.globalAlpha = 1;
      return true;
    });
  }

  // ---------- impact
  private burst(px: number, py: number) {
    const e = this.e, c = e.c, power = e.power, gy = e.gy, add = this.add.bind(this);
    const compact = e.element === "feu" || e.element === "eau";
    add({ k: "ring", x: px, y: py, max: .3, s: 10, grow: compact ? 50 : 100, col: c[1] });
    add({ k: "flash", x: px, y: py, max: .2, s: compact ? 70 : 110, col: c[0] });
    if (e.element === "feu") {
      // Compact : trois langues de feu au pied de la carte, rien qui déborde
      for (let i = 0; i < 3; i++) add({ k: "tongue", x: (i - 1) * e.cw * .28, y: e.ch * .47 - 6, vy: -90, vx: 0, life: -i * .05, max: .45, s: R(10, 14) });
    }
    if (e.element === "eau") {
      // Compact : couronne de gouttes à ±50 px et anneau plat au sol, sans nappe ni brume
      for (let i = 0; i < 22 * power; i++) { const a = R(-2.6, -.55), v = R(110, 230); add({ k: "drop", x: px, y: py + e.ch * .5 - 18, vx: Math.cos(a) * v * .6, vy: Math.sin(a) * v, g: 700, drag: .99, max: R(.35, .5), s: R(2, 4), col: i % 3 ? c[1] : c[0], ground: 1 }); }
      add({ k: "ring", x: px, y: gy - 4, max: .45, s: 10, grow: 52, col: c[0], flat: .3 });
    }
    if (e.element === "foudre") {
      this.decal("burn", px, 80, 1.8);
      for (let i = 0; i < 44 * power; i++) { const a = R(0, 6.28), v = R(200, 650); add({ k: "spark", x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 500, drag: .9, max: R(.3, .8), s: 2, col: i % 2 ? c[0] : c[1], ground: 2 }); }
      add({ k: "crackle", x: px, y: py, max: .8, s: 70 });
      for (let i = 0; i < 6; i++) add({ k: "smoke", x: px + R(-30, 30), y: py + R(-20, 40), vy: R(-50, -20), drag: .98, vr: R(-1, 1), max: R(1, 1.5), s: R(24, 40), col: "#4a4560", a0: .7 });
    }
    if (e.element === "air") {
      for (let i = 0; i < 5; i++) add({ k: "windcut", x: px + R(-14, 14), y: py + R(-20, 20), rot: (i % 2 ? .6 : -.6) + R(-.5, .5) + (i > 2 ? Math.PI : 0), life: -i * .06, max: .32, s: R(58, 80) });
      add({ k: "pressure", x: px, y: py, max: .45, s: 150, life: -.12 });
      add({ k: "pressure", x: px, y: py, max: .5, s: 110, life: -.24 });
      for (let i = 0; i < 40 * power; i++) { const a = R(0, 6.28), v = R(260, 520); add({ k: "streak", x: px + Math.cos(a) * 20, y: py + Math.sin(a) * 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .7, curl: (i % 2 ? 1 : -1) * R(2, 5), drag: .93, life: -R(.1, .3), max: R(.3, .55), s: R(14, 30), col: i % 3 ? c[0] : c[1] }); }
      for (let i = 0; i < 14; i++) add({ k: "leaf", x: px + R(-30, 30), y: py + R(-20, 30), vx: R(-180, 180), vy: R(-280, -80), g: 220, drag: .97, vr: R(-12, 12), max: R(1, 1.6), s: R(4, 7), col: i % 2 ? c[2] : "#c9b26a" });
      for (let i = 0; i < 10; i++) add({ k: "smoke", x: px + R(-70, 70), y: gy - R(0, 20), vx: R(-120, 120), vy: R(-40, -5), drag: .95, vr: R(-3, 3), max: R(.8, 1.3), s: R(26, 44), col: "#b8ab95", a0: .45 });
    }
    if (e.element === "terre") {
      this.decal("crater", px, 110, 2.4);
      for (let i = 0; i < 26 * power; i++) { const a = R(-2.9, -.25), v = R(160, 480); add({ k: "chunk", x: px + R(-30, 30), y: gy - 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1100, max: R(.9, 1.5), s: R(4, 12), vr: R(-10, 10), col: c[i % 3 + 1], ground: 3 }); }
      for (let i = 0; i < 16; i++) add({ k: "smoke", x: px + R(-90, 90), y: gy - R(0, 30), vx: R(-90, 90), vy: R(-50, -10), drag: .96, vr: R(-1, 1), max: R(1.1, 1.8), s: R(36, 64), col: "#a88a62", a0: .7 });
    }
  }

  // ---------- particules
  private particle(p: Particle, dt: number): boolean {
    const x = this.x, c = this.e.c, gy = this.e.gy + 4;
    p.life += dt;
    if (p.life < 0) return true;
    if (p.curl) { const a = p.curl * dt, cs = Math.cos(a), sn = Math.sin(a), vx = p.vx; p.vx = vx * cs - p.vy * sn; p.vy = vx * sn + p.vy * cs; }
    p.vx *= p.drag; p.vy = p.vy * p.drag + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    const k = p.life / p.max, a = 1 - k;
    if (k >= 1) return false;
    if (p.ground && p.y > gy) {
      if (p.ground === 1) { this.add({ k: "ring", x: p.x, y: gy, max: .35, s: 2, grow: 14, col: c[0], flat: .25 }); return false; }
      p.y = gy; p.vy *= p.ground === 2 ? -.4 : -.3; p.vx *= p.ground === 2 ? .7 : .6; if (p.ground === 3) p.vr *= .5;
    }
    switch (p.k) {
      case "glow": this.additive(() => this.glow(p.x, p.y, p.s * (1 - k * .5), p.col, a)); break;
      case "ember": this.additive(() => { const f = .55 + .45 * Math.sin(p.life * 40 + p.rot * 9); x.globalAlpha = a * f; this.stroke([[p.x, p.y], [p.x - p.vx * .02, p.y - p.vy * .02]], p.s, p.col); this.glow(p.x, p.y, p.s * 3, p.col, a * f * .6); }); break;
      case "flame": this.additive(() => { x.save(); x.translate(p.x, p.y); x.scale(1, 1.6); this.glow(0, 0, p.s * (1 - k * .6), k < .3 ? c[0] : k < .6 ? c[1] : c[2], a * .9); x.restore(); }); break;
      case "tongue": {
        const h = p.s * 2.6 * Math.sin(Math.PI * Math.min(1, k * 1.3)) * (.85 + .15 * Math.sin(p.life * 30 + p.rot)), w = p.s * .5, sw = Math.sin(p.life * 14 + p.rot * 3) * p.s * .4;
        if (h > 1) this.additive(() => {
          const f = (ww: number, c0: string, c1: string, al: number) => {
            const g = x.createLinearGradient(p.x, p.y, p.x, p.y - h); g.addColorStop(0, c0); g.addColorStop(.55, c1); g.addColorStop(1, "rgba(0,0,0,0)");
            x.globalAlpha = al; x.fillStyle = g; x.beginPath(); x.moveTo(p.x - ww, p.y);
            x.bezierCurveTo(p.x - ww, p.y - h * .45, p.x + sw - ww * .4, p.y - h * .7, p.x + sw, p.y - h);
            x.bezierCurveTo(p.x + sw + ww * .4, p.y - h * .7, p.x + ww, p.y - h * .45, p.x + ww, p.y);
            x.quadraticCurveTo(p.x, p.y + ww * .7, p.x - ww, p.y); x.fill();
          };
          f(w, c[1], c[2], a * .8); f(w * .45, c[0], c[1], a * .9);
        });
        break;
      }
      case "flash": this.additive(() => this.glow(p.x, p.y, p.s * (1 + k), p.col, a)); break;
      case "ring": { const r = p.s + p.grow * eo(k); x.globalAlpha = a * .8; x.strokeStyle = p.col; x.lineWidth = 3 * a + 1; x.beginPath(); x.ellipse(p.x, p.y, r, r * p.flat, 0, 0, 7); x.stroke(); break; }
      case "drop": x.globalAlpha = a; x.strokeStyle = p.col; x.lineWidth = p.s; x.lineCap = "round"; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - p.vx * .025, p.y - p.vy * .025); x.stroke(); x.fillStyle = "#fff"; x.globalAlpha = a * .8; x.fillRect(p.x - 1, p.y - 1, 1.5, 1.5); break;
      case "bubble": x.globalAlpha = a; x.strokeStyle = p.col; x.lineWidth = 1.2; x.beginPath(); x.arc(p.x + Math.sin(p.life * 12 + p.rot) * 3, p.y, p.s, 0, 7); x.stroke(); x.fillStyle = "#fff"; x.fillRect(p.x - p.s * .4, p.y - p.s * .5, 1.5, 1.5); break;
      case "spark": this.additive(() => { x.globalAlpha = a; this.stroke([[p.x, p.y], [p.x - p.vx * .03, p.y - p.vy * .03]], 2, p.col); }); break;
      case "converge": { const e = eo(k), px = p.x + (p.tx - p.x) * e, py = p.y + (p.ty - p.y) * e; this.additive(() => { x.globalAlpha = k; this.stroke([[px, py], [px + (p.x - p.tx) * .08, py + (p.y - p.ty) * .08]], 1.6, p.col); }); break; }
      case "streak": { x.globalAlpha = a * .8; const l = p.curl ? .045 : .06; this.stroke([[p.x, p.y], [p.x - p.vx * l, p.y - p.vy * l]], p.curl ? 1.6 : 2, p.col); break; }
      case "smoke": { const s = p.s * (.6 + k * .9); x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.globalAlpha = p.a0 * Math.sin(Math.PI * Math.min(1, k * 1.3 + .1)); x.drawImage(cloud(p.col), -s, -s, s * 2, s * 2); x.restore(); break; }
      case "chunk": case "leaf": {
        x.save(); x.globalAlpha = Math.min(1, a * 2); x.translate(p.x, p.y); x.rotate(p.rot); x.fillStyle = p.col; x.strokeStyle = INK; x.lineWidth = 1.5; x.beginPath();
        if (p.k === "leaf") { x.scale(1, Math.cos(p.life * 9) || .01); x.ellipse(0, 0, p.s, p.s * .4, 0, 0, 7); x.closePath(); x.fill(); x.stroke(); }
        else {
          const s = p.s; x.moveTo(-s, -s * .4); x.lineTo(s * .2, -s); x.lineTo(s, s * .1); x.lineTo(-s * .1, s * .8); x.closePath(); x.fill(); x.stroke();
          x.fillStyle = "rgba(255,255,255,.3)"; x.beginPath(); x.moveTo(-s, -s * .4); x.lineTo(s * .2, -s); x.lineTo(0, 0); x.closePath(); x.fill();
          x.fillStyle = "rgba(0,0,0,.3)"; x.beginPath(); x.moveTo(s, s * .1); x.lineTo(-s * .1, s * .8); x.lineTo(0, 0); x.closePath(); x.fill();
        }
        x.restore(); break;
      }
      case "crackle": this.additive(() => {
        if (Math.random() < .55 * a + .1) for (let i = 0; i < 2; i++) {
          const a2 = R(0, 6.28), r = R(30, p.s), hw = this.e.cw / 2, hh = this.e.ch / 2; x.globalAlpha = a;
          this.stroke(this.bolt(p.x, p.y, p.x + Math.cos(a2) * r, p.y + Math.sin(a2) * r, 8, 6), 2, c[1]);
          this.stroke(this.bolt(p.x + R(-hw, hw), p.y - hh, p.x + R(-hw, hw), p.y + R(-20, hh), 6, 5), 1.2, "#fff");
        }
      }); break;
      case "windcut": { const e = eo(Math.min(1, k * 2.6)); x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.globalAlpha = Math.min(1, a * 1.6); this.crescent(0, 0, p.s, -1.15, -1.15 + 2.3 * e, 9, c[2]); this.crescent(0, 0, p.s - 1, -1.1, -1.1 + 2.2 * e, 5, c[0]); this.crescent(0, 0, p.s - 2, -1, -1 + 2 * e, 2, "#fff"); x.restore(); break; }
      case "pressure": {
        const r = 20 + p.s * eo(k), g = x.createRadialGradient(p.x, p.y, r * .55, p.x, p.y, r);
        g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.85, "rgba(220,255,240,.22)"); g.addColorStop(1, "rgba(255,255,255,0)");
        x.globalAlpha = a; x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, r, 0, 7); x.fill();
        x.strokeStyle = c[0]; x.lineWidth = 2 * a + .5; x.beginPath(); x.arc(p.x, p.y, r * .97, 0, 7); x.stroke();
        x.globalAlpha = a * .5; x.lineWidth = 1; x.beginPath(); x.arc(p.x, p.y, r * .82, 0, 7); x.stroke(); break;
      }
    }
    x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
    return true;
  }

  // ---------- déroulé d'une attaque (t en secondes depuis le lancement, impact à e.T)
  private attack(t: number) {
    const e = this.e, x = this.x, c = e.c, T = e.T, add = this.add.bind(this);
    // Direction attaquant → cible, et sa normale tournée vers le haut (l'arc des projectiles)
    const dl = Math.hypot(e.ax, e.ay) || 1, dx = -e.ax / dl, dy = -e.ay / dl;
    let nx = -dy, ny = dx; if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }
    const sx = e.ax + dx * 70, sy = e.ay + dy * 70, travel = Math.max(0, dl - 70), angle = Math.atan2(dy, dx);
    if (e.style === "magic") {
      const cast = Math.max(0, T - .5);
      const ca = seg(t, cast, cast + .2) * (1 - seg(t, T - .15, T));
      if (ca > 0) {
        x.save(); x.translate(sx, sy); x.rotate(t * 3); x.globalAlpha = ca; x.strokeStyle = c[1]; x.lineWidth = 2;
        x.beginPath(); x.ellipse(0, 0, 14, 34, 0, 0, 7); x.stroke(); x.beginPath(); x.ellipse(0, 0, 9, 24, 0, 0, 7); x.stroke();
        for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; x.fillStyle = c[0]; x.fillRect(Math.cos(a) * 12 - 1.5, Math.sin(a) * 30 - 1.5, 3, 3); }
        x.restore(); this.additive(() => this.glow(sx, sy, 46, c[1], ca * .5));
        if (Math.random() < .6) { const a = R(0, 6.28), r = R(50, 80); add({ k: "converge", x: sx + Math.cos(a) * r, y: sy + Math.sin(a) * r, tx: sx, ty: sy, max: .3, col: c[0] }); }
      }
      if (e.element === "foudre") {
        const dim = seg(t, cast, T - .05) * (1 - seg(t, T + .15, T + .6));
        if (dim > 0) { x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = `rgba(5,4,15,${.3 * dim})`; x.fillRect(0, 0, this.canvas.width, this.canvas.height); x.restore(); }
        if (t > T - .2 && t < T) this.additive(() => { this.glow(sx, sy, 40 + Math.random() * 25, c[1], .8); for (let i = 0; i < 2; i++) this.stroke(this.bolt(sx, sy, sx + R(-40, 40), sy + R(-40, 40), 8, 4), 1.5, "#fff"); });
        if (!e.dodge || t < T) {
          if (t > T - .02 && t < T + .22) {
            const pts = this.bolt(sx, sy, 0, 0, 40); e.bolt = pts;
            this.additive(() => {
              this.stroke(pts, 22, "rgba(255,220,90,.18)"); this.stroke(pts, 10, "rgba(255,230,120,.45)"); this.stroke(pts, 5, c[1]); this.stroke(pts, 2, "#fff");
              for (let i = 0; i < 4; i++) { const s = pts[2 + i * 2]; this.stroke(this.bolt(s[0], s[1], s[0] + nx * R(-70, 70) + dx * R(30, 90), s[1] + ny * R(-70, 70) + dy * R(30, 90), 16, 6), 2, c[2]); }
              this.stroke(this.bolt(0, 0, R(-30, 30), e.gy, 12, 6), 3, c[1]);
            });
            this.lamp(sx / 2, sy / 2, 300, c[1], 1);
          } else if (e.bolt && t > T && t < T + .55) this.additive(() => { x.globalAlpha = .35 * (1 - seg(t, T + .22, T + .55)); this.stroke(e.bolt!, 3, c[2]); x.globalAlpha = 1; });
        }
      } else if (e.element === "terre") {
        // Fissure qui court du pied de l'attaquant au pied de la cible
        const k = seg(t, T - .4, T);
        if (k > 0 && k < 1) {
          const x0 = e.ax, y0 = e.ay + e.gy, fx = x0 + (0 - x0) * eo(k), fy = y0 + (e.gy - y0) * eo(k), pts: number[][] = [[x0, y0]];
          for (let i = 1; i <= 14; i++) { const q = i / 14 * eo(k); pts.push([x0 + (0 - x0) * q + nx * R(-4, 4), y0 + (e.gy - y0) * q + ny * R(-4, 4)]); }
          this.stroke(pts, 4, "rgba(0,0,0,.85)"); x.globalAlpha = .7; this.stroke(pts.map((p) => [p[0], p[1] - 2]), 1.2, c[1]); x.globalAlpha = 1;
          this.additive(() => this.glow(fx, fy, 30, c[1], .5));
          if (Math.random() < .7) add({ k: "chunk", x: fx, y: fy - 4, vx: R(-40, 40), vy: R(-240, -120), g: 1100, max: .6, s: R(3, 6), vr: 5, col: c[2] });
          if (Math.random() < .5) add({ k: "smoke", x: fx, y: fy - 8, vy: -25, vx: R(-20, 20), max: .8, s: R(16, 26), col: "#a88a62", a0: .5 });
        }
        if (t > T - .02 && !e.dodge) this.slabs(t);
      } else if (!e.dodge || t < T) {
        const k = seg(t, T - .45, T);
        if (k > 0 && k < 1) {
          const q = (u: number) => { const ee = u ** 3 * .35 + u * .65, arc = -40 * Math.sin(Math.PI * ee) * (e.element === "eau" ? .9 : .6); return [sx + dx * travel * ee + nx * arc * -1, sy + dy * travel * ee + ny * arc * -1]; };
          const [px, py] = q(k);
          e.trail.push([px, py]); if (e.trail.length > (e.element === "eau" ? 34 : 14)) e.trail.shift();
          if (e.element === "feu") {
            this.lamp(px, py, 90, c[1], .9);
            for (let i = 0; i < 3; i++) add({ k: "ember", x: px + R(-8, 8), y: py + R(-8, 8), vx: -dx * R(20, 90), vy: -dy * R(20, 90) - R(10, 60), g: -60, max: R(.3, .7), s: R(1.5, 3), col: i ? c[1] : c[0] });
            if (Math.random() < .5) add({ k: "smoke", x: px - dx * 20, y: py - dy * 20, vx: -dx * R(10, 40), vy: -dy * R(10, 40) - 15, vr: R(-1, 1), max: .9, s: R(14, 22), col: "#2a1d1d", a0: .5 });
            this.additive(() => {
              e.trail.forEach((p, i) => { const f = i / e.trail.length; this.glow(p[0] + R(-3, 3), p[1] + R(-4, 4), 18 * f + 4, f > .6 ? c[1] : c[2], f * .7); });
              for (let i = 0; i < 6; i++) { const l = R(20, 46); x.save(); x.translate(px, py); x.rotate(angle + Math.PI + R(-.5, .5)); x.scale(1, .45); this.glow(l * .5, 0, l * .6, c[2], .6); x.restore(); }
              this.glow(px, py, 48, c[2], .7); this.glow(px, py, 30, c[1]); this.glow(px, py, 15, c[0]); this.glow(px, py, 7, "#fff");
            });
          }
          if (e.element === "eau") {
            this.lamp(px, py, 70, c[1], .5);
            if (Math.random() < .9) add({ k: "drop", x: px + R(-10, 10), y: py + R(-10, 10), vx: -dx * R(0, 90), vy: -dy * R(0, 90) + R(-60, 40), g: 700, max: .7, s: R(2, 3.5), col: c[0], ground: 1 });
            // Jet d'eau : tête arrondie et traîne effilée qui ondule
            const n = e.trail.length;
            for (const [w, col] of [[1, c[3]], [.82, c[2]], [.5, c[1]]] as const) {
              const edge = (i: number, sign: number) => { const f = (i + 1) / n, o = (1 + 11 * f ** .6) * w * sign + Math.sin(i * .9 + t * 40) * 1.5; return [e.trail[i][0] + nx * o, e.trail[i][1] + ny * o]; };
              x.fillStyle = col; x.beginPath();
              for (let i = 0; i < n; i++) { const q2 = edge(i, -1); x.lineTo(q2[0], q2[1]); }
              for (let i = n - 1; i >= 0; i--) { const q2 = edge(i, 1); x.lineTo(q2[0], q2[1]); }
              x.closePath(); x.fill();
              x.beginPath(); x.ellipse(px, py, 12 * w, 11 * w, 0, 0, 7); x.fill();
            }
            x.fillStyle = c[0]; x.globalAlpha = .8; x.beginPath(); x.ellipse(px - 3, py - 5, 9, 2.5, 0, 0, 7); x.fill(); x.globalAlpha = 1;
          }
          if (e.element === "air") for (let j = 0; j < 3; j++) {
            const kk = seg(t, T - .45 + j * .05, T + j * .03); if (kk <= 0 || kk >= 1) continue;
            const off = (j - 1) * 34 * (1 - kk * .7) + Math.sin(kk * 9 + j) * 8, qx = sx + dx * travel * kk + nx * off, qy = sy + dy * travel * kk + ny * off;
            x.save(); x.translate(qx, qy); x.rotate(angle);
            for (let g = 3; g >= 0; g--) { x.globalAlpha = g ? .18 * (4 - g) : .95; this.crescent(-g * 16, 0, 26, -1.2, 1.2, 8, g ? c[0] : c[1]); }
            x.globalAlpha = .9; this.crescent(2, 0, 24, -1, 1, 3, "#fff");
            x.globalAlpha = .55; for (let s = 0; s < 3; s++) this.stroke([[-110 - s * 20, (s - 1) * 10], [-34, (s - 1) * 8]], 1.5, c[0]);
            x.restore(); x.globalAlpha = 1;
          }
        }
      }
    }
    if (e.dodge) return;
    const hit = t - T;
    if (hit > 0 && hit < .6) {
      this.lamp(0, 0, 140, c[1], (1 - hit / .6) * .9);
      // Teinte élémentaire sur la carte touchée
      this.additive(() => { x.globalAlpha = .35 * (1 - hit / .6); x.fillStyle = c[1]; x.beginPath(); x.roundRect(-e.cw / 2, -e.ch / 2, e.cw, e.ch, 8); x.fill(); x.globalAlpha = 1; });
    }
    if (t >= T && !e.hit) { e.hit = true; this.burst(0, e.element === "terre" && e.style === "magic" ? e.ch * .3 : 0); }
  }

  /** Dalles de roche qui jaillissent sous la cible, tremblent puis s'effondrent en éboulis. */
  private slabs(t: number) {
    const e = this.e, x = this.x, c = e.c, T = e.T, gy = e.gy;
    if (!e.slabs) e.slabs = ([[-74, 48, 42, -.32], [-30, 112, 60, -.1], [22, 132, 64, .08], [68, 78, 48, .28], [104, 40, 32, .5]] as const).map(([dx, h, w, tilt], j) => ({
      dx, h, w, tilt: tilt + R(-.06, .06), delay: j % 2 * .04 + R(0, .03),
      pts: [[-w / 2, 0], [-w / 2 + R(0, 6), -h * R(.55, .75)], [-w * R(.1, .25), -h], [w * R(.15, .3), -h * R(.82, .95)], [w / 2 - R(0, 5), -h * R(.35, .55)], [w / 2, 0]],
      crack: [[R(-w * .2, w * .1), -h * .7], [R(-w * .1, w * .2), -h * .45], [R(-w * .25, w * .05), -h * .2]],
    }));
    const crumble = T + .6;
    if (t < crumble) {
      for (const sl of e.slabs) {
        const k = seg(t, T - .02 + sl.delay, T + .14 + sl.delay); if (k <= 0) continue;
        const ease = 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2, Q = sl.pts, tr = t > crumble - .14 ? R(-1.5, 1.5) : 0;
        x.save(); x.translate(sl.dx + tr, gy); x.rotate(sl.tilt * Math.min(1, ease)); x.scale(1, Math.max(.01, ease));
        const outline = () => { x.beginPath(); Q.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.closePath(); };
        outline(); x.fillStyle = c[2]; x.fill(); x.save(); x.clip();
        x.fillStyle = c[1]; x.beginPath(); x.moveTo(Q[0][0], 0); x.lineTo(Q[1][0], Q[1][1]); x.lineTo(Q[2][0], Q[2][1]); x.lineTo(Q[2][0] + sl.w * .12, -sl.h * .45); x.lineTo(-sl.w * .1, 0); x.fill();
        x.fillStyle = "rgba(25,12,0,.5)"; x.beginPath(); x.moveTo(Q[3][0], Q[3][1]); x.lineTo(Q[4][0], Q[4][1]); x.lineTo(Q[5][0], 0); x.lineTo(sl.w * .16, 0); x.lineTo(Q[3][0] - sl.w * .06, -sl.h * .5); x.fill();
        x.strokeStyle = "rgba(40,22,8,.45)"; x.lineWidth = 1.5;
        for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(-sl.w, -sl.h * i / 5 + 3); x.lineTo(sl.w, -sl.h * i / 5 - 3); x.stroke(); }
        for (let i = 0; i < 10; i++) { x.fillStyle = i % 2 ? "rgba(0,0,0,.25)" : "rgba(255,240,210,.25)"; x.fillRect(((i * 37) % sl.w) - sl.w / 2, -((i * 53) % sl.h), 2, 2); }
        const sh = x.createLinearGradient(0, 0, 0, -sl.h); sh.addColorStop(0, "rgba(0,0,0,.55)"); sh.addColorStop(.35, "rgba(0,0,0,0)"); x.fillStyle = sh; x.fillRect(-sl.w, -sl.h, sl.w * 2, sl.h);
        x.restore();
        outline(); x.lineWidth = 3; x.strokeStyle = INK; x.stroke();
        x.strokeStyle = c[0]; x.lineWidth = 2; x.beginPath(); x.moveTo(Q[1][0] + 2, Q[1][1] + 2); x.lineTo(Q[2][0], Q[2][1] + 2); x.lineTo(Q[3][0] - 1, Q[3][1] + 2); x.stroke();
        this.stroke([[Q[2][0], Q[2][1] + 2], ...sl.crack], 1.5, INK);
        x.restore();
        x.fillStyle = "#2c2015"; x.beginPath(); x.ellipse(sl.dx, gy - 1, sl.w * .8, 6, 0, 0, 7); x.fill();
      }
    } else if (!e.crumbled) {
      e.crumbled = true;
      for (const sl of e.slabs) {
        for (let i = 0; i < 16; i++) { const hy = R(.05, .95) * sl.h; this.add({ k: "chunk", x: sl.dx + R(-sl.w / 2, sl.w / 2) * (1 - hy / sl.h) + Math.sin(sl.tilt) * hy, y: gy - hy, vx: R(-90, 90), vy: R(-160, 10), g: 1100, max: R(.8, 1.4), s: R(4, 10) * (1 + sl.w / 80), vr: R(-8, 8), col: c[1 + (i % 3)], ground: 3 }); }
        for (let i = 0; i < 3; i++) this.add({ k: "smoke", x: sl.dx + R(-20, 20), y: gy - R(10, sl.h * .6), vx: R(-40, 40), vy: R(-40, -10), drag: .96, vr: R(-1, 1), max: R(1, 1.6), s: R(30, 50), col: "#a88a62", a0: .6 });
      }
    }
  }
}
