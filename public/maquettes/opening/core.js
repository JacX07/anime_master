// Moteur commun de la scène d'ouverture : cercle de cartes, révélations, cinématique UR, son.
// Chaque thème (themes/*.js) fournit son décor, ses cartes, ses sons et son habillage.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export const THEMES = [
  { id: "medieval", name: "Médiéval" },
  { id: "cyberpunk", name: "Cyberpunk" },
  { id: "futur", name: "Cyber futuriste" },
  { id: "prairie", name: "Prairie (Frieren)" },
  { id: "sanctuaire", name: "Sanctuaire" },
];

const CHARS = [
  { name: "Satoru Gojou", series: "Jujutsu Kaisen", img: "https://s4.anilist.co/file/anilistcdn/character/large/b127691-9zqh1xpIubn7.png", rarity: "UR", type: "Magie", atk: 4920, def: 3080, serial: 12 },
  { name: "Anya Forger", series: "Spy × Family", img: "https://s4.anilist.co/file/anilistcdn/character/large/b138100-4Li0tWRCa5bQ.png", rarity: "SSR", type: "Mystère", atk: 3390, def: 2494, serial: 87 },
  { name: "Frieren", series: "Frieren", img: "https://s4.anilist.co/file/anilistcdn/character/large/b176754-PCnpqIOkjhFk.png", rarity: "SR", type: "Aventure", atk: 3990, def: 2913, serial: 214, holo: true },
  { name: "Kaguya Shinomiya", series: "Kaguya-sama", img: "https://s4.anilist.co/file/anilistcdn/character/large/b120649-NPaWaIpWy60E.png", rarity: "R", type: "Cœur", atk: 4270, def: 2444, serial: 431 },
  { name: "Levi", series: "L'Attaque des Titans", img: "https://s4.anilist.co/file/anilistcdn/character/large/b45627-CR68RyZmddGG.png", rarity: "N", type: "Combat", atk: 4600, def: 3347, serial: 1203 },
];
const RANK = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 };
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

export const canvasTex = (w, h, draw) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
export const softDot = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "#fff"); r.addColorStop(0.3, "#ffffffaa"); r.addColorStop(1, "#0000"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
// Bruit déterministe pour les décors peints
export function rng(seed = 1) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
export const GLSL_NOISE = `
  // Les couleurs des shaders sont pensées en sRGB : on les repasse en linéaire avant la sortie
  vec3 srgb(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }`;

// =============== Son : bus Master ← { SFX, UI, Ambiance }, gains en dB, synthèse ===============
const dB = (v) => Math.pow(10, v / 20);
export const vary = (f, pct = 0.06) => f * (1 + (Math.random() * 2 - 1) * pct);
const S = {
  ctx: null, bus: {}, on: true, ambDb: -20,
  init(theme) {
    if (!this.ctx) {
      const ctx = (this.ctx = new AudioContext());
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6; limiter.knee.value = 4; limiter.ratio.value = 12; limiter.attack.value = 0.003; limiter.release.value = 0.25;
      const master = ctx.createGain(); master.gain.value = dB(-3);
      master.connect(limiter).connect(ctx.destination);
      const mk = (db) => { const g = ctx.createGain(); g.gain.value = dB(db); g.connect(master); return g; };
      this.ambDb = theme.ambienceDb ?? -20;
      this.bus = { master, sfx: mk(0), ui: mk(-6), amb: mk(this.ambDb) };
      // Réverbe partagée : réponse impulsionnelle synthétique, envoyée depuis chaque son
      const rev = ctx.createConvolver(), len = ctx.sampleRate * (theme.reverb?.seconds ?? 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      rev.buffer = ir; this.bus.rev = ctx.createGain(); this.bus.rev.gain.value = theme.reverb?.wet ?? 0.25;
      this.bus.rev.connect(rev).connect(master);
      this.sounds.ambience?.();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  },
  setOn(on) { this.on = on; if (this.ctx) this.bus.master.gain.setTargetAtTime(on ? dB(-3) : 0, this.ctx.currentTime, 0.05); },
  duck(depthDb = -14, hold = 1.5) {
    if (!this.ctx) return;
    const g = this.bus.amb.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setTargetAtTime(dB(this.ambDb + depthDb), t, 0.02); g.setTargetAtTime(dB(this.ambDb), t + hold, 0.5);
  },
  out(node, bus = "sfx", wet = 0.4) { node.connect(this.bus[bus]); if (wet) { const s = this.ctx.createGain(); s.gain.value = wet; node.connect(s).connect(this.bus.rev); } },
  tone(f, dur, { type = "sine", gain = 0.1, at = 0, slide = 0, attack = 0.008, bus = "sfx", wet = 0.3, cutoff = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = o.connect(g);
    if (cutoff) { const f2 = this.ctx.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = cutoff; n = n.connect(f2); }
    this.out(n, bus, wet); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, { from = 800, to = 4000, gain = 0.1, at = 0, q = 1, type = "bandpass", bus = "sfx", wet = 0.2, attack = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at, len = Math.ceil(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    if (attack) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); } else g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    this.out(s.connect(f).connect(g), bus, wet); s.start(t);
  },
  // Corde pincée (Karplus-Strong) : luth, koto, harpe selon l'amortissement
  pluck(f, dur = 1.5, { gain = 0.2, at = 0, damp = 0.996, bright = 0.6, bus = "sfx", wet = 0.35 } = {}) {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate, N = Math.max(2, Math.round(sr / f)), len = Math.ceil(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), ring = new Float32Array(N);
    let prev = 0; for (let i = 0; i < N; i++) { const r = Math.random() * 2 - 1; prev = prev + bright * (r - prev); ring[i] = prev; }
    for (let i = 0; i < len; i++) { const k = i % N, v = ring[k]; d[i] = v; ring[k] = damp * 0.5 * (v + ring[(k + 1) % N]); }
    const s = this.ctx.createBufferSource(); s.buffer = buf; const g = this.ctx.createGain(); g.gain.value = gain;
    this.out(s.connect(g), bus, wet); s.start(this.ctx.currentTime + at);
  },
  // Cloche : partiels inharmoniques qui s'éteignent à des vitesses différentes
  bell(f, dur = 2.5, { gain = 0.08, at = 0, bus = "sfx", wet = 0.5, partials = [1, 2.76, 5.4, 8.93] } = {}) {
    partials.forEach((p, i) => this.tone(f * p, dur / (1 + i * 0.7), { gain: gain / (1 + i), at, attack: 0.003, bus, wet }));
  },
  // Nappe : oscillateurs désaccordés filtrés, attaque lente
  pad(freqs, dur = 3, { gain = 0.03, at = 0, attack = 0.6, type = "sawtooth", cutoff = 1800, bus = "sfx", wet = 0.6 } = {}) {
    freqs.forEach((f) => [-6, 6].forEach((cents) => this.tone(f * Math.pow(2, cents / 1200), dur, { type, gain, at, attack, cutoff, bus, wet })));
  },
  // Boucle de bruit filtré pour les ambiances (pluie, vent, feu…)
  loopNoise({ type = "lowpass", freq = 400, q = 0.7, gain = 0.5, brown = true, lfo = 0, lfoDepth = 0 } = {}) {
    const ctx = this.ctx, len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = brown ? (b + 0.02 * w) / 1.02 : w; d[i] = brown ? b * 3.5 : w; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gain;
    if (lfo) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = lfo; og.gain.value = lfoDepth; o.connect(og).connect(g.gain); o.start(); }
    src.connect(f).connect(g).connect(this.bus.amb); src.start();
    return { filter: f, gain: g };
  },
  drone(freqs, gain = 0.1, type = "sine") {
    freqs.forEach((fr, i) => {
      const o = this.ctx.createOscillator(), og = this.ctx.createGain(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      o.type = type; o.frequency.value = fr; og.gain.value = gain;
      lfo.frequency.value = 0.05 + i * 0.03; lg.gain.value = gain * 0.7; lfo.connect(lg).connect(og.gain);
      o.connect(og).connect(this.bus.amb); o.start(); lfo.start();
    });
  },
  // Planifie un son récurrent irrégulier (oiseaux, carillon, gouttes…)
  every(minS, maxS, fn) { const go = () => { if (this.on) fn(); setTimeout(go, (minS + Math.random() * (maxS - minS)) * 1000); }; setTimeout(go, minS * 1000); },
};

export { S as Sound, CHARS, RANK };

// Sons par défaut ; un thème remplace ceux qu'il veut
function defaultSounds(s) {
  return {
    hover: () => s.tone(vary(1760), 0.05, { gain: 0.05, bus: "ui", wet: 0 }),
    tear: () => { s.noise(0.5, { from: 400, to: 8000, gain: 0.18, q: 0.8 }); s.tone(220, 0.6, { type: "sawtooth", gain: 0.04, slide: 3 }); },
    spawn: (i) => { s.noise(0.35, { from: 300, to: 2500, gain: 0.05, at: i * 0.12 }); s.tone(vary(392 + i * 98, 0.02), 0.18, { type: "triangle", gain: 0.05, at: i * 0.12 + 0.1 }); },
    select: () => { s.noise(0.4, { from: 200, to: 3000, gain: 0.08 }); s.tone(vary(300), 0.4, { type: "triangle", gain: 0.05, slide: 3 }); },
    flip: (r) => { s.noise(0.15, { from: vary(1500, 0.15), to: 6000, gain: 0.06 }); [523.25, 659.25, 783.99, 1046.5].slice(0, Math.min(RANK[r], 2) + 2).forEach((f, i) => s.tone(f, 0.35, { type: "triangle", gain: 0.06, at: 0.05 + i * 0.07 })); },
    ssr: () => { s.tone(110, 0.5, { gain: 0.35, slide: 0.5 }); [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => s.tone(f, 1.6, { type: "triangle", gain: 0.05, at: 0.05 + i * 0.03 })); },
    urCharge: () => { s.tone(40, 1.2, { gain: 0.35, slide: 3, attack: 0.4 }); s.noise(1.2, { from: 100, to: 3000, gain: 0.12, type: "lowpass" }); },
    urImpact: () => { s.tone(90, 1.2, { gain: 0.6, slide: 0.35 }); s.pad([261.63, 329.63, 392, 523.25], 3, { at: 0.5, gain: 0.025 }); },
    settle: () => { s.tone(vary(880), 0.08, { type: "triangle", gain: 0.06, bus: "ui", wet: 0 }); },
  };
}

// Peintre de cartes partagé : face (illustration, rareté, stats) et dos fournis par le thème
export function cardPainter(T, images) {
  const RC = T.rarity;
  const C = { display: "serif", body: "sans-serif", ink: "#fff", sub: "#ffffffbb", panel: "#111", shade: "#0a0a14", badge: "#000000b0", radius: 36, ...T.card };
  const loadImg = (src) => new Promise((res) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = () => res(null); im.src = src + "?cors=1"; });
  const frameFill = (g, r, w, h) => {
    if (C.frame) return C.frame(g, r, w, h, RC[r]);
    if (r === "UR") { const f = g.createLinearGradient(0, 0, w, h); T.urFrame.forEach((s, i, a) => f.addColorStop(i / (a.length - 1), s)); return f; }
    if (r === "SSR") { const f = g.createLinearGradient(0, 0, w, h); ["#fff1b0", "#e0a020", "#fff6d0", "#b87a00"].forEach((s, i) => f.addColorStop(i / 3, s)); return f; }
    return RC[r];
  };
  function drawFront(c) {
    return canvasTex(512, 716, (g, w, h) => {
      const col = RC[c.rarity], rad = C.radius;
      g.save(); g.beginPath(); g.roundRect(0, 0, w, h, rad); g.clip();
      g.fillStyle = frameFill(g, c.rarity, w, h); g.fillRect(0, 0, w, h);
      g.beginPath(); g.roundRect(14, 14, w - 28, h - 28, Math.max(4, rad - 10)); g.clip();
      g.fillStyle = C.panel; g.fillRect(0, 0, w, h);
      const im = images[c.img];
      if (im) { const s = Math.max((w - 28) / im.width, (h - 28) / im.height); g.drawImage(im, 14 + ((w - 28) - im.width * s) / 2, 14, im.width * s, im.height * s); }
      const grad = g.createLinearGradient(0, h * 0.55, 0, h); grad.addColorStop(0, C.shade + "00"); grad.addColorStop(0.45, C.shade + "e0"); grad.addColorStop(1, C.shade + "f8");
      g.fillStyle = grad; g.fillRect(0, h * 0.55, w, h);
      g.restore();
      C.ornament?.(g, c, w, h, col);
      g.font = `700 40px "${C.display}"`; const rw = g.measureText(c.rarity).width + 36;
      g.fillStyle = C.badge; g.beginPath(); g.roundRect(30, 30, rw, 60, 30); g.fill();
      g.fillStyle = c.rarity === "UR" ? T.urInk ?? col : col; g.fillText(c.rarity, 48, 75);
      g.font = `700 26px "${C.body}"`; const s = `#${c.serial}`, sw = g.measureText(s).width + 28;
      g.fillStyle = C.badge; g.beginPath(); g.roundRect(w - 30 - sw, 34, sw, 50, 25); g.fill(); g.fillStyle = C.ink; g.fillText(s, w - 30 - sw + 14, 68);
      g.fillStyle = C.ink; g.font = `700 44px "${C.display}"`; g.fillText(c.name, 40, h - 124, w - 80);
      g.fillStyle = C.sub; g.font = `500 26px "${C.body}"`; g.fillText(`${c.type} · ${c.series}`, 40, h - 84, w - 80);
      g.fillStyle = C.ink; g.font = `700 30px "${C.body}"`; g.fillText(`ATK ${c.atk}`, 40, h - 38); const d = `DEF ${c.def}`; g.fillText(d, w - 40 - g.measureText(d).width, h - 38);
    });
  }
  const makeBack = () => canvasTex(512, 716, (g, w, h) => { g.beginPath(); g.roundRect(0, 0, w, h, C.radius); g.clip(); C.back(g, w, h); });
  return { C, drawFront, makeBack, loadImg };
}

// =============== Démarrage d'un thème ===============
export async function start(theme) {
  const T = theme;
  document.title = `${T.name} · Ouverture · Anime Masters`;
  if (T.fonts) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = T.fonts; document.head.append(l); }
  document.getElementById("theme-css").textContent = T.css ?? "";
  const RC = T.rarity;
  const txt = { open: "Clique sur le booster pour l'ouvrir", reveal: "Clique sur une carte (ou Espace) pour la révéler", done: "Belle pioche ! Survole tes cartes pour les admirer", ur: "Ultra<br />rare", ...T.text };
  document.getElementById("urLabel").innerHTML = txt.ur;
  document.getElementById("hint").textContent = txt.open;
  const ui = { booster: document.getElementById("booster"), hint: document.getElementById("hint"), all: document.getElementById("all"), next: document.getElementById("next"),
    flash: document.getElementById("flash"), vignette: document.getElementById("vignette"), ur: document.getElementById("urScreen"), snd: document.getElementById("snd") };
  ui.booster.innerHTML = T.booster;

  S.sounds = { ...defaultSounds(S), ...(T.sounds?.(S) ?? {}) };
  const Sfx = S.sounds;
  ui.snd.addEventListener("click", () => { S.init(T); S.setOn(!S.on); ui.snd.textContent = S.on ? "Son activé" : "Son coupé"; ui.snd.setAttribute("aria-pressed", String(S.on)); });

  // Scène
  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = T.render?.toneMapping === "none" ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = T.render?.exposure ?? 1;
  const scene = new THREE.Scene();
  const cam = { fov: 45, y: 2.6, dist: 8.5, look: [0, 1.4, 0], ...T.camera };
  const camera = new THREE.PerspectiveCamera(cam.fov, 1, 0.1, 400);
  const LOOK = new THREE.Vector3(...cam.look);
  let camDist = cam.dist;
  const fxLight = new THREE.PointLight("#ffffff", 0, 8); fxLight.position.set(0, 2, 5.6); scene.add(fxLight);

  const env = T.env({ THREE, scene, camera, renderer, canvasTex, softDot, rng, GLSL_NOISE, reduced });

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const [bs, br, bt] = T.render?.bloom ?? [0.6, 0.5, 0.98];
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), bs, br, bt);
  composer.addPass(bloom); composer.addPass(new OutputPass());
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    camDist = cam.dist * Math.max(1, 1.55 / camera.aspect);
  }
  addEventListener("resize", resize); resize();

  // =============== Cartes ===============
  const CARD_W = 1.4, CARD_H = 1.96;
  const images = {};
  const { C, drawFront, makeBack, loadImg } = cardPainter(T, images);
  let backTex = makeBack();
  const holoTex = canvasTex(512, 512, (g, w, h) => {
    const hues = ["#ff5fd8", "#ffd84a", "#5ff2c8", "#5fb8ff", "#a77dff"];
    g.lineWidth = 7;
    for (let i = -h; i < w + h; i += 46) { const gr = g.createLinearGradient(i, 0, i + h, h); hues.forEach((c, k) => gr.addColorStop(k / (hues.length - 1), c)); g.strokeStyle = gr; g.globalAlpha = 0.55; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
    for (let i = 0; i < 260; i++) { g.fillStyle = hues[i % hues.length]; g.globalAlpha = 0.4 + Math.random() * 0.6; const x = Math.random() * w, y = Math.random() * h, r = 1 + Math.random() * 2; g.fillRect(x - r, y - r, r * 2, r * 2); }
  });
  holoTex.wrapS = holoTex.wrapT = THREE.RepeatWrapping;
  const glowTex = canvasTex(512, 640, (g, w, h) => { g.shadowColor = "#fff"; g.shadowBlur = 60; g.fillStyle = "#fff"; g.beginPath(); g.roundRect(130, 140, w - 260, h - 280, 30); g.fill(); g.fill(); });
  const FX = { ring: RC.R, blend: "add", spawn: [RC.R, "#ffffff"], ...T.fx };
  const blending = FX.blend === "normal" ? THREE.NormalBlending : THREE.AdditiveBlending;
  const tint = T.card?.tint ?? 0.86;

  const RING = { y: 1.55, radius: 2.0, spin: 0.35, ...T.ring };
  const ring = new THREE.Group(); scene.add(ring);
  let cards = [];
  function makeCard(c) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);
    const back = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: backTex, toneMapped: false, color: new THREE.Color(tint, tint, tint) }));
    const front = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: drawFront(c), toneMapped: false, color: new THREE.Color(tint, tint, tint) }));
    front.rotation.y = Math.PI; front.visible = false; // surprise totale : la face n'existe qu'au retournement
    const backInner = new THREE.Mesh(geo, back.material); backInner.rotation.y = Math.PI; backInner.position.z = -0.001;
    body.add(back, front, backInner);
    if (c.holo) { const hm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: holoTex.clone(), transparent: true, opacity: 0.32, color: new THREE.Color(0.55, 0.55, 0.55), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); hm.rotation.y = Math.PI; hm.position.z = -0.003; hm.visible = false; hm.material.map.wrapS = hm.material.map.wrapT = THREE.RepeatWrapping; body.add(hm); root.userData.holo = hm; }
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * 2.0, CARD_H * 1.78), new THREE.MeshBasicMaterial({ map: glowTex, color: FX.ring, transparent: true, opacity: 0, blending, depthWrite: false, toneMapped: false }));
    halo.position.z = -0.02; body.add(halo);
    const halo2 = halo.clone(); halo2.rotation.y = Math.PI; halo2.position.z = 0.02; body.add(halo2);
    root.userData = { ...root.userData, c, body, halo, front, backInner, state: "spawn", hoverK: 0 };
    [back, front].forEach((m) => (m.userData.card = root));
    return root;
  }

  // =============== Animations ===============
  const tweens = new Set();
  const ease = { out: (k) => 1 - Math.pow(1 - k, 3), inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2), back: (k) => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2) };
  const tween = (dur, fn, e = ease.out) => new Promise((res) => tweens.add({ t: 0, dur: reduced ? Math.min(dur, 0.15) : dur, fn, e, res }));
  const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
  function moveTo(obj, { pos, rotY, scale }, dur, e) {
    const p0 = obj.position.clone(), r0 = obj.rotation.y, s0 = obj.scale.x;
    return tween(dur, (k) => { if (pos) obj.position.lerpVectors(p0, pos, k); if (rotY !== undefined) obj.rotation.y = r0 + (rotY - r0) * k; if (scale !== undefined) obj.scale.setScalar(s0 + (scale - s0) * k); }, e);
  }
  const bursts = new Set();
  function burst(pos, colors, n = 260, speed = 4) {
    const p = new Float32Array(n * 3), v = new Float32Array(n * 3), col = new Float32Array(n * 3), tmp = new THREE.Color();
    for (let i = 0; i < n; i++) {
      p.set([pos.x, pos.y, pos.z], i * 3);
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random()));
      v.set([dir.x, dir.y, dir.z], i * 3); tmp.set(colors[i % colors.length]); col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(p, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: FX.burstSize ?? 0.14, map: FX.burstTex ?? softDot, vertexColors: true, transparent: true, depthWrite: false, blending, toneMapped: false }));
    scene.add(pts); bursts.add({ pts, v, life: 0 });
  }
  function fxPulse(color, intensity) { fxLight.color.set(color); fxLight.intensity = intensity; }
  // Game feel dosé selon la rareté : micro-pause à l'impact et coup de zoom (jamais de secousse)
  let stopUntil = 0, punch = 0;
  const hitStop = (s) => { if (!reduced) stopUntil = performance.now() + s * 1000; };
  const zoomPunch = (a) => { if (!reduced) punch = Math.max(punch, a); };
  const flash = () => { if (reduced) return; ui.flash.classList.remove("go"); void ui.flash.offsetWidth; ui.flash.classList.add("go"); };
  const TIER = { N: { stop: 0, zoom: 0 }, R: { stop: 0, zoom: 0.15 }, SR: { stop: 0.05, zoom: 0.35 }, SSR: { stop: 0.12, zoom: 1 }, UR: { stop: 0.16, zoom: 1.3 } };

  let busy = false, phase = "idle", count = 9;
  const bar = (id, n, on) => (document.getElementById(id).innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < on ? "on" : ""}"></i>`).join(""));
  const stock = () => { bar("stock", 10, count); document.getElementById("count").textContent = count; };
  bar("ssr", 15, 9); bar("ur", 15, 4); stock();

  const LINE = { y: 0.85, z: 3.2, ...T.line };
  const linePos = (i) => new THREE.Vector3((i - 2) * 1.35, LINE.y, LINE.z);
  let lineCount = 0;

  async function openBooster() {
    if (busy || phase !== "idle") return;
    S.init(T); busy = true; Sfx.tear();
    ui.booster.classList.add("tear"); count = Math.max(0, count - 1); stock();
    await wait(0.45);
    ui.booster.blur(); ui.booster.hidden = true; ui.booster.classList.remove("tear");
    cards.forEach((c) => scene.remove(c)); cards = []; lineCount = 0;
    burst(new THREE.Vector3(0, RING.y - 0.9, 0), FX.spawn, 300, 3.5); fxPulse(FX.ring, 25);
    env.onOpen?.();
    const order = [...CHARS].sort(() => Math.random() - 0.5);
    ring.rotation.y = 0;
    order.forEach((c, i) => {
      const card = makeCard(c); cards.push(card); ring.add(card);
      card.position.set(0, RING.y - 1.1, 0); card.scale.setScalar(0.05);
      const a = (i / order.length) * Math.PI * 2; card.rotation.y = a;
      Sfx.spawn(i);
      setTimeout(() => moveTo(card, { pos: new THREE.Vector3(Math.sin(a) * RING.radius, RING.y, Math.cos(a) * RING.radius), scale: 1 }, 0.9, ease.back).then(() => (card.userData.state = "ring")), i * 120);
    });
    await wait(1.4);
    phase = "ring"; busy = false;
    ui.hint.textContent = txt.reveal; ui.all.hidden = false;
  }

  async function reveal(card, quick = false) {
    if (busy || card.userData.state !== "ring") return;
    busy = true; card.userData.state = "focus";
    const { c } = card.userData, u = card.userData;
    Sfx.select();
    scene.attach(card);
    // attach() peut exprimer la rotation avec des demi-tours sur X et Z : on ne garde que l'orientation verticale
    card.rotation.set(0, new THREE.Euler().setFromQuaternion(card.quaternion, "YXZ").y, 0);
    const FY = RING.y + 0.5;
    await moveTo(card, { pos: new THREE.Vector3(0, FY, 5.0), rotY: 0, scale: 1.1 }, quick ? 0.45 : 0.6, ease.inOut);
    fxLight.position.set(0, FY + 0.05, 5.8);
    env.onReveal?.(c.rarity);
    if (c.rarity === "UR") {
      Sfx.urCharge(); ui.vignette.classList.add("on");
      await tween(1.2, (k) => { u.body.scale.setScalar(1 + 0.06 * k); fxPulse(RC.UR, 40 * k); u.halo.material.color.set(RC.UR); u.halo.material.opacity = k; });
      u.body.scale.setScalar(1); card.rotation.y = Math.PI; u.front.visible = true; u.backInner.visible = false;
      hitStop(TIER.UR.stop); zoomPunch(TIER.UR.zoom); S.duck(-24, 4.2);
      await urCinematic(c);
      ui.vignette.classList.remove("on");
      burst(card.position, FX.ur, 500, 5); fxPulse(RC.UR, 30);
    } else {
      u.front.visible = true; u.backInner.visible = false; if (u.holo) u.holo.visible = true;
      // Anticipation : la carte recule un instant avant de se retourner
      await tween(0.14, (k) => { card.rotation.y = -0.22 * k; card.position.z = 5.0 - 0.25 * k; }, (k) => k * k);
      const flipDone = tween(0.7, (k) => { card.rotation.y = -0.22 + (Math.PI + 0.22) * k; card.position.y = FY + Math.sin(k * Math.PI) * 0.35; card.position.z = 4.75 + 0.25 * Math.min(1, k * 2); }, ease.back);
      await wait(0.25);
      Sfx.flip(c.rarity); hitStop(TIER[c.rarity].stop); zoomPunch(TIER[c.rarity].zoom);
      if (c.rarity === "SSR") {
        Sfx.ssr(); S.duck(-14, 1.6); flash();
        burst(card.position, FX.ssr, 420, 4.5); fxPulse(RC.SSR, 45);
        u.halo.material.color.set(RC.SSR);
        tween(0.9, (k) => { u.body.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.15); u.halo.material.opacity = Math.sin(k * Math.PI); });
      } else {
        const col = RC[c.rarity];
        fxPulse(col, 8 + RANK[c.rarity] * 8);
        if (RANK[c.rarity] >= 1) burst(card.position, [col, "#ffffff"], 80 + RANK[c.rarity] * 80, 2.5);
      }
      await flipDone;
    }
    await wait(quick ? 0.5 : 1.1);
    const slot = lineCount++;
    u.state = "moving";
    await moveTo(card, { pos: linePos(slot), rotY: Math.PI, scale: 0.62 }, 0.6, ease.inOut);
    u.state = "line"; u.halo.material.color.set(RC[c.rarity]); u.landT = 0;
    Sfx.settle();
    busy = false;
    if (lineCount === cards.length) finish();
  }

  async function finish() {
    phase = "done"; ui.all.hidden = true;
    await Promise.all(cards.map((card, i) => moveTo(card, { pos: new THREE.Vector3((i - 2) * 1.45, LINE.y + 0.6, LINE.z), scale: 0.74 }, 0.7, ease.back)));
    ui.hint.textContent = txt.done; ui.next.hidden = count === 0;
    if (!ui.next.hidden) ui.next.focus({ preventScroll: true });
  }

  function urCinematic(c) {
    return new Promise((resolve) => {
      document.getElementById("urImg").src = c.img;
      document.getElementById("urName").textContent = c.name;
      document.getElementById("urSeries").textContent = `${c.type} · ${c.series}`;
      document.getElementById("urSerial").textContent = `Exemplaire #${c.serial}`;
      const el = ui.ur;
      el.querySelectorAll(".star").forEach((s) => s.remove());
      for (let i = 0; i < 30; i++) { const s = document.createElement("span"); s.className = "star"; s.textContent = T.urStar ?? "✦"; s.style.left = Math.random() * 100 + "%"; s.style.top = Math.random() * 100 + "%"; s.style.fontSize = 8 + Math.random() * 22 + "px"; s.style.animationDelay = Math.random() * 1.6 + "s"; el.appendChild(s); }
      el.hidden = false; el.classList.remove("out");
      el.querySelectorAll(".rays, .whiteout, .art, .label, h2, .series, .serial, .skip").forEach((n) => { n.style.animation = "none"; void n.offsetWidth; n.style.animation = ""; });
      Sfx.urImpact();
      let closed = false;
      const onKey = (e) => { if (["Escape", "Enter", " "].includes(e.key)) { e.preventDefault(); e.stopPropagation(); close(); } };
      const close = () => { if (closed) return; closed = true; removeEventListener("keydown", onKey, true); el.classList.add("out"); setTimeout(() => { el.hidden = true; resolve(); }, 450); };
      setTimeout(() => { el.addEventListener("click", close, { once: true }); addEventListener("keydown", onKey, true); }, 600);
      setTimeout(close, 4500);
    });
  }

  async function revealAll() {
    if (phase !== "ring") return;
    ui.all.hidden = true;
    for (const card of cards) {
      while (busy || card.userData.state === "spawn") await wait(0.1);
      if (card.userData.state === "ring") await reveal(card, true);
    }
  }

  ui.booster.addEventListener("click", openBooster);
  ui.all.addEventListener("click", revealAll);
  ui.next.addEventListener("click", async () => {
    ui.next.hidden = true;
    await Promise.all(cards.map((card) => moveTo(card, { pos: card.position.clone().add(new THREE.Vector3(0, -1.2, -1)), scale: 0.01 }, 0.4, ease.inOut)));
    cards.forEach((c) => scene.remove(c)); cards = [];
    phase = "idle"; ui.booster.hidden = false; ui.hint.textContent = txt.open; ui.booster.focus({ preventScroll: true });
  });

  // Pointeur et clavier
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), mouseSmooth = new THREE.Vector2();
  let hovered = null;
  const pick = () => { ray.setFromCamera(mouse, camera); const hit = ray.intersectObjects(cards.flatMap((c) => c.userData.body.children.slice(0, 2)))[0]; return hit ? hit.object.userData.card : null; };
  canvas.addEventListener("pointermove", (e) => {
    mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    const h = pick(), interactive = h && (h.userData.state === "ring" || h.userData.state === "line");
    if (interactive && h !== hovered) Sfx.hover();
    hovered = interactive ? h : null;
    canvas.style.cursor = hovered && hovered.userData.state === "ring" && !busy ? "pointer" : "default";
  });
  canvas.addEventListener("click", () => { const h = pick(); if (h && h.userData.state === "ring") reveal(h); });
  addEventListener("keydown", (e) => {
    if (!["Enter", " "].includes(e.key) || e.target.closest?.("button, a") || phase !== "ring" || busy) return;
    const v = new THREE.Vector3(), front = cards.filter((c) => c.userData.state === "ring").sort((a, b) => b.getWorldPosition(v).z - a.getWorldPosition(v).z)[0];
    if (front) { e.preventDefault(); reveal(front); }
  });

  // Boucle
  let last = performance.now(), time = 0;
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    const sdt = now < stopUntil ? dt * 0.04 : dt;
    for (const tw of [...tweens]) { tw.t += sdt; const k = Math.min(1, tw.t / tw.dur); tw.fn(tw.e(k)); if (k >= 1) { tweens.delete(tw); tw.res(); } }
    if (!reduced) ring.rotation.y += sdt * RING.spin;
    env.update?.(dt, time, { mouse: mouseSmooth });
    for (const b of [...bursts]) {
      b.life += sdt; const arr = b.pts.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) { arr[i] += b.v[i] * sdt; arr[i + 1] += b.v[i + 1] * sdt; arr[i + 2] += b.v[i + 2] * sdt; b.v[i + 1] -= (FX.gravity ?? 2.5) * sdt; b.v[i] *= 0.985; b.v[i + 2] *= 0.985; }
      b.pts.geometry.attributes.position.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.life / 1.6);
      if (b.life > 1.6) { scene.remove(b.pts); b.pts.geometry.dispose(); bursts.delete(b); }
    }
    fxLight.intensity *= Math.pow(0.08, dt);
    for (const card of cards) {
      const u = card.userData, target = card === hovered ? 1 : 0;
      u.hoverK += (target - u.hoverK) * Math.min(1, dt * 10);
      if (u.state === "ring" || u.state === "line") {
        u.body.scale.setScalar(1 + u.hoverK * (u.state === "line" ? 0.12 : 0.08));
        if (u.landT !== undefined && u.landT < 0.6) { u.landT += sdt; const sq = 0.16 * Math.exp(-u.landT * 9) * Math.cos(u.landT * 26); u.body.scale.x *= 1 + sq; u.body.scale.y *= 1 - sq * 0.7; }
        u.body.position.y = u.hoverK * (u.state === "line" ? 0.25 : 0.15);
        if (u.state === "line") { u.body.rotation.x = u.hoverK * (-mouse.y * 0.25); u.body.rotation.y = u.hoverK * (mouse.x * 0.35); u.halo.material.opacity = (FX.lineGlow ?? 0.25) + u.hoverK * 0.6; }
        else { u.halo.material.color.set(FX.ring); u.halo.material.opacity = u.hoverK * 0.9; u.body.rotation.set(0, 0, 0); }
      }
      if (u.holo) u.holo.material.map.offset.set(time * 0.15 + mouse.x * 0.3, mouse.y * 0.3);
    }
    mouseSmooth.lerp(mouse, Math.min(1, dt * 3));
    punch *= Math.pow(0.015, dt); camera.fov = cam.fov - punch * 3.5; camera.updateProjectionMatrix();
    camera.position.set(mouseSmooth.x * 0.5, cam.y + mouseSmooth.y * 0.25, camDist);
    camera.lookAt(LOOK);
    composer.render(dt);
  });

  // Préchargement des images et polices avant la première ouverture
  ui.booster.disabled = true;
  await Promise.all([...CHARS.map(async (c) => (images[c.img] = await loadImg(c.img))), document.fonts.load(`700 44px "${C.display}"`), document.fonts.load(`500 26px "${C.body}"`)]);
  backTex = makeBack();
  ui.booster.disabled = false;
  // Accès en lecture pour les tests automatisés de la maquette
  window.__scene = { get phase() { return phase; }, get busy() { return busy; }, get states() { return cards.map((c) => c.userData.state); }, get ur() { return !ui.ur.hidden; } };
}
