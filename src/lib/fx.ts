"use client";

/**
 * Retours d'action de la refonte (lot 4, docs/direction-artistique.md §4.22) : étincelles dorées, flash,
 * secousse de la page et notifications qui glissent. Tout se dessine dans le calque `.fx-layer` de FxRuntime.
 */
const reduce = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const layer = () => document.querySelector<HTMLElement>(".fx-layer");

type Spark = { x: number; y: number; vx: number; vy: number; life: number; r: number };
let sparks: Spark[] = [];
let canvas: HTMLCanvasElement | null = null;

function ensureCanvas() {
  const root = layer();
  if (!root) return null;
  if (!canvas || !canvas.isConnected) {
    canvas = document.createElement("canvas");
    canvas.className = "fx-sparks";
    root.appendChild(canvas);
  }
  const dpr = Math.min(2, devicePixelRatio || 1);
  if (canvas.width !== innerWidth * dpr) { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; }
  return canvas;
}

function loop() {
  const c = canvas;
  const ctx = c?.getContext("2d");
  if (!c || !ctx) return;
  const dpr = c.width / innerWidth;
  ctx.clearRect(0, 0, c.width, c.height);
  for (const s of sparks) {
    s.x += s.vx; s.y += s.vy; s.vy += 0.18 * dpr; s.vx *= 0.98; s.life -= 0.018;
    ctx.globalAlpha = Math.max(0, s.life);
    ctx.fillStyle = s.life > 0.6 ? "#fff3c4" : "#d5a640";
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  sparks = sparks.filter((s) => s.life > 0);
  if (sparks.length) requestAnimationFrame(loop); else ctx.clearRect(0, 0, c.width, c.height);
}

/** Gerbe d'étincelles dorées depuis un point de l'écran ou le centre d'un élément. */
export function fxBurst(from: { x: number; y: number } | Element | DOMRect | null | undefined, count = 60) {
  if (!from || reduce()) return;
  const c = ensureCanvas();
  if (!c) return;
  const r = from instanceof Element ? from.getBoundingClientRect() : from;
  const x = r instanceof DOMRect ? r.left + r.width / 2 : r.x;
  const y = r instanceof DOMRect ? r.top + r.height / 2 : r.y;
  const dpr = c.width / innerWidth;
  const idle = sparks.length === 0;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, v = (Math.random() * 6 + 2) * dpr;
    sparks.push({ x: x * dpr, y: y * dpr, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2 * dpr, life: 1, r: (Math.random() * 2 + 1) * dpr });
  }
  if (idle) requestAnimationFrame(loop);
}

/** Flash lumineux plein écran. */
export function fxFlash() {
  const root = layer();
  if (!root || reduce()) return;
  const el = document.createElement("span");
  el.className = "fx-flash";
  root.appendChild(el);
  setTimeout(() => el.remove(), 650);
}

/** Petite secousse de la page. */
export function fxShake() {
  const page = document.querySelector<HTMLElement>(".mq-page");
  if (!page || reduce()) return;
  page.classList.remove("fx-shake");
  void page.offsetWidth;
  page.classList.add("fx-shake");
  setTimeout(() => page.classList.remove("fx-shake"), 500);
}

/** Notification qui glisse depuis la droite, puis disparaît. */
export function fxToast(title: string, text?: string, image?: string) {
  const root = layer();
  if (!root) return;
  let box = root.querySelector<HTMLElement>(".fx-toasts");
  if (!box) { box = document.createElement("div"); box.className = "fx-toasts"; root.appendChild(box); }
  const el = document.createElement("div");
  el.className = "fx-toast";
  el.setAttribute("role", "status");
  if (image) { const img = document.createElement("img"); img.src = image; img.alt = ""; el.appendChild(img); }
  const body = document.createElement("div");
  const b = document.createElement("b"); b.textContent = title; body.appendChild(b);
  if (text) { const s = document.createElement("small"); s.textContent = text; body.appendChild(s); }
  el.appendChild(body);
  box.appendChild(el);
  setTimeout(() => { el.classList.add("fx-out"); setTimeout(() => el.remove(), 420); }, 3400);
}

/** Récompense obtenue : étincelles depuis l'élément et notification. */
export function fxReward(from: Element | DOMRect | null | undefined, title: string, text?: string, image?: string) {
  fxBurst(from, 50);
  fxToast(title, text, image);
}
