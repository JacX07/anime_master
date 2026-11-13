"use client";

/**
 * Retours d'action de la refonte (lot 4, docs/direction-artistique.md §4.22) : étincelles dorées, flash,
 * secousse de la page et notifications qui glissent. Tout se dessine dans le calque `.fx-layer` de FxRuntime.
 */
const reduce = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
// Le combat est un calque à part (z-index 1000) : il a son propre calque d'effets, sinon on prend celui du site
const layer = () => document.querySelector<HTMLElement>(".mq-battle-overlay .fx-layer") ?? document.querySelector<HTMLElement>(".fx-layer");

type Spark = { x: number; y: number; vx: number; vy: number; life: number; r: number; color?: string; decay?: number; to?: { x: number; y: number }; pull?: number };
let sparks: Spark[] = [];
let canvas: HTMLCanvasElement | null = null;
let sparkFrame: number | null = null;
const startSparks = () => { if (sparkFrame === null) sparkFrame = requestAnimationFrame(loop); };

function ensureCanvas() {
  const root = layer();
  if (!root) return null;
  if (!canvas || !canvas.isConnected) {
    canvas = document.createElement("canvas");
    canvas.className = "fx-sparks";
    root.appendChild(canvas);
  } else if (canvas.parentElement !== root) root.appendChild(canvas); // le combat a son propre calque
  const dpr = Math.min(2, devicePixelRatio || 1);
  if (canvas.width !== innerWidth * dpr || canvas.height !== innerHeight * dpr) { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; }
  return canvas;
}

function loop() {
  sparkFrame = null;
  const c = canvas;
  const ctx = c?.getContext("2d");
  if (!c || !ctx || !c.isConnected) { sparks = []; return; }
  const dpr = c.width / innerWidth;
  ctx.clearRect(0, 0, c.width, c.height);
  for (const s of sparks) {
    if (s.to) { s.vx += (s.to.x - s.x) * 0.0045 * (s.pull ?? 1); s.vy += (s.to.y - s.y) * 0.0045 * (s.pull ?? 1); s.vx *= 0.9; s.vy *= 0.9; }
    else { s.vy += 0.18 * dpr; s.vx *= 0.98; }
    s.x += s.vx; s.y += s.vy; s.life -= s.decay ?? 0.018;
    ctx.globalAlpha = Math.max(0, Math.min(1, s.life));
    ctx.fillStyle = s.color ?? (s.life > 0.6 ? "#fff3c4" : "#d5a640");
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  sparks = sparks.filter((s) => s.life > 0);
  if (sparks.length) startSparks(); else ctx.clearRect(0, 0, c.width, c.height);
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
  if (idle) startSparks();
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

const pointOf = (t: Element | DOMRect | { x: number; y: number }) => {
  if (t instanceof Element) { const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  if (t instanceof DOMRect) return { x: t.left + t.width / 2, y: t.top + t.height / 2 };
  return t;
};

/**
 * Désagrégation d'une carte en particules (sorts du combat) : elles naissent sur toute la surface de `from`, s'élèvent un instant,
 * puis filent vers `to` (le lanceur, qui « consomme » la carte). Renvoie la durée et le nettoyage de la séquence (null si les animations sont réduites).
 */
export function fxStream(from: Element | DOMRect, to: Element | { x: number; y: number }, colors: string[], count = 480, speed = 1): { duration: number; cancel: () => void } | null {
  if (reduce()) return null;
  const c = ensureCanvas();
  if (!c) return null;
  const r = from instanceof Element ? from.getBoundingClientRect() : from;
  const dpr = c.width / innerWidth;
  const idle = sparks.length === 0;
  const batch: Spark[] = [];
  for (let i = 0; i < count; i++) {
    batch.push({
      x: (r.left + Math.random() * r.width) * dpr, y: (r.top + Math.random() * r.height) * dpr,
      vx: (Math.random() - 0.5) * 3.2 * dpr, vy: (-Math.random() * 3.4 - 0.8) * dpr,
      life: 1.6, decay: (0.011 + Math.random() * 0.005) * speed, r: (Math.random() * 2.2 + 0.8) * dpr,
      color: Math.random() < 0.35 ? "#fff8dc" : colors[i % colors.length], pull: (0.7 + Math.random() * 0.9) * speed * speed,
    });
  }
  sparks.push(...batch);
  const timer = setTimeout(() => { const p = pointOf(to); for (const s of batch) s.to = { x: p.x * dpr, y: p.y * dpr }; }, 300 / speed);
  const members = new Set(batch);
  const duration = 800 / speed;
  const cancel = () => {
    clearTimeout(timer); sparks = sparks.filter((spark) => !members.has(spark));
    if (!sparks.length) {
      if (sparkFrame !== null) cancelAnimationFrame(sparkFrame);
      sparkFrame = null;
      canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      if (canvas?.closest(".mq-battle-overlay")) { canvas.remove(); canvas = null; }
    }
  };
  if (idle) startSparks();
  return { duration, cancel };
}
