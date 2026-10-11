// Maquettes d'ouverture : quatre façons de faire apparaître la capsule et de lâcher les cinq noyaux, à comparer sans serveur ni compte.
//   1 · Portail + capsule : « Ouvrir » embrase le portail (anneaux, son), la capsule se matérialise, puis s'ouvre.
//   2 · Capsule sortie du portail : le portail la dépose, on clique ensuite sur la capsule pour l'ouvrir.
//   3 · Portail seul : les noyaux jaillissent directement du portail.
//   4 · Tisserand : des fils de lumière tissent la capsule, puis elle s'ouvre.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { softDot } from "../opening/core.js";
import { buildDecor, BLUE, MINT } from "./decor.js";
import noyaux from "./noyaux.js";
import { buildPod } from "./pod.js";

const TEST = new URLSearchParams(location.search).has("test");
const CHARS = ["N", "R", "SR", "SSR", "UR"].map((rarity) => ({ rarity }));
const slot = (i) => new THREE.Vector3((i - 2) * 1.3, 1.7, 2.3 - (i - 2) ** 2 * 0.18);
const HOME = new THREE.Vector3(0, 1.55, 2.6);
const DESC = {
  fusion: ["1 · Portail + capsule", "« Ouvrir » : le portail s'embrase, ses anneaux s'emballent avec une montée sonore, puis la capsule se matérialise du socle vers le haut, en une ligne de scan. Elle s'ouvre ensuite toute seule."],
  sortie: ["2 · Capsule sortie du portail", "Deux temps. « Invoquer » : le portail s'embrase et dépose la capsule, qui descend en arc jusqu'à son socle. Puis on clique sur la capsule (ou « Ouvrir ») pour l'ouvrir."],
  portail: ["3 · Portail seul", "Pas de capsule : les noyaux jaillissent du portail en arc, avec une traînée de lumière, et se posent à leur place. Son plus grave et plus sérieux que la première maquette."],
  tisserand: ["4 · Tisserand", "Des fils de lumière arrivent de partout, se tendent et tissent les arêtes de la capsule du bas vers le haut ; le verre apparaît quand le dernier fil est tendu. Puis elle s'ouvre."],
};

// ---------- Son : basses, cloches de verre, réverbération. Rien de cartoon. ----------
const A = {
  ctx: null,
  init() {
    if (this.ctx) return this.ctx.resume();
    const c = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = c.createGain(); this.master.gain.value = 0.85;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; this.master.connect(comp).connect(c.destination);
    const len = Math.floor(c.sampleRate * 2.4), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.8; }
    this.rev = c.createConvolver(); this.rev.buffer = ir; const wet = c.createGain(); wet.gain.value = 0.5; this.rev.connect(wet).connect(this.master);
  },
  out(node, wet = 0.3) { node.connect(this.master); const s = this.ctx.createGain(); s.gain.value = wet; node.connect(s).connect(this.rev); },
  env(g, t, peak, a, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
  tone(f0, f1, dur, { type = "sine", gain = 0.2, at = 0, a = 0.008, wet = 0.3, cutoff = 0 } = {}) {
    const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    this.env(g, t, gain, a, dur); let n = o; if (cutoff) { const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = cutoff; o.connect(lp); n = lp; }
    n.connect(g); this.out(g, wet); o.start(t); o.stop(t + a + dur + 0.05);
  },
  noise(dur, { type = "bandpass", from = 2000, to = 600, gain = 0.08, at = 0, q = 1.2, wet = 0.25 } = {}) {
    const c = this.ctx, t = c.currentTime + at, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = buf; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f).connect(g); this.out(g, wet); s.start(t);
  },
  // Cloche de verre ou de métal : partiels inharmoniques, attaque nette, longue extinction
  bell(f, dur = 1.4, gain = 0.06, at = 0) { [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.9, 0.12]].filter(([m]) => f * m < 14000).forEach(([m, k]) => this.tone(f * m, f * m, dur / m ** 0.5, { gain: gain * k, at, a: 0.003, wet: 0.6 })); },
  sub(f0, f1, dur, gain = 0.4, at = 0) { this.tone(f0, f1, dur, { gain, at, a: 0.004, wet: 0.1 }); },
  // Montée : deux scies désaccordées dont le filtre s'ouvre, sur un souffle qui s'élève
  riser(dur = 1.2, gain = 0.05) {
    const c = this.ctx, t = c.currentTime, lp = c.createBiquadFilter(), g = c.createGain(); lp.type = "lowpass"; lp.Q.value = 4; lp.frequency.setValueAtTime(180, t); lp.frequency.exponentialRampToValueAtTime(3800, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    [-9, 9].forEach((cents) => { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(55 * 2 ** (cents / 1200), t); o.frequency.exponentialRampToValueAtTime(220 * 2 ** (cents / 1200), t + dur); o.connect(lp); o.start(t); o.stop(t + dur + 0.3); });
    lp.connect(g); this.out(g, 0.45); this.noise(dur, { from: 300, to: 5000, gain: 0.03, wet: 0.4 });
  },
  whoosh() { this.noise(0.55, { from: 250, to: 3800, gain: 0.07, q: 0.8, wet: 0.45 }); },
  thump() { this.sub(98, 38, 0.38, 0.55); this.noise(0.09, { type: "lowpass", from: 700, to: 180, gain: 0.12, wet: 0.1 }); },
  // Verrou : deux claquements secs, le second plus grave
  latch() { this.noise(0.012, { type: "highpass", from: 5200, to: 5000, gain: 0.1, wet: 0.05 }); this.sub(210, 130, 0.06, 0.25); this.noise(0.012, { type: "highpass", from: 3600, to: 3500, gain: 0.08, at: 0.09, wet: 0.05 }); this.sub(150, 90, 0.08, 0.25, 0.09); },
  chime(i) { this.bell([392, 440, 523.25, 587.33, 659.25][i] * 1.5, 1.8, 0.05); },
  land() { this.sub(120, 52, 0.22, 0.2); this.bell(1760, 0.9, 0.018); },
  scan() { this.noise(1.7, { from: 400, to: 6500, gain: 0.05, q: 6, wet: 0.5 }); this.tone(110, 330, 1.7, { type: "triangle", gain: 0.05, a: 0.8, wet: 0.5 }); },
  ring(i) { this.bell(520 * 1.26 ** i, 1.6, 0.035); },
};

export async function start() {
  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(TEST ? 0.5 : Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.7; renderer.shadowMap.enabled = true; renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  const decor = buildDecor({ scene, renderer });
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: TEST ? 0 : 2 }));
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.4, 0.4, 1.5));
  composer.addPass(new OutputPass());
  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  addEventListener("resize", resize); resize();

  noyaux.init({ scene, decor, BLUE });
  const ctx = { BLUE, MINT };
  const pod = buildPod({ decor, BLUE, MINT }); scene.add(pod.group);
  const pm = decor.portalMat.uniforms;

  // Plan de coupe : la capsule se dévoile du socle vers le haut (matérialisation)
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e4);
  const mats = new Set(); pod.group.traverse((o) => { if (o.material) mats.add(o.material); });
  mats.forEach((m) => { if (m.type !== "SpriteMaterial") m.clippingPlanes = [clip]; });
  const scanRing = new THREE.Mesh(new THREE.TorusGeometry(pod.R + 0.25, 0.03, 6, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(3.2) }));
  scanRing.rotation.x = Math.PI / 2; scanRing.visible = false; scene.add(scanRing);

  // ---------- Interpolations et étincelles ----------
  const tweens = new Set();
  const ease = { out: (k) => 1 - (1 - k) ** 3, in: (k) => k * k * k, inOut: (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2), lin: (k) => k };
  const tween = (dur, fn, e = ease.out) => new Promise((res) => tweens.add({ t: 0, dur, fn, e, res }));
  const wait = (s) => tween(s, () => {}, ease.lin); // temps simulé : avance avec les interpolations (et avec __lab.skip)
  const MAX = 1800, sp = { pos: new Float32Array(MAX * 3), col: new Float32Array(MAX * 3), vel: new Float32Array(MAX * 3), life: new Float32Array(MAX), max: new Float32Array(MAX), base: new Float32Array(MAX * 3), head: 0 };
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute("position", new THREE.BufferAttribute(sp.pos, 3)); sGeo.setAttribute("color", new THREE.BufferAttribute(sp.col, 3));
  const sparks = new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 0.1, map: softDot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sparks.frustumCulled = false; scene.add(sparks);
  const tmp = new THREE.Color();
  function emit(p, n, { speed = 1, life = 0.8, colors = [BLUE, "#ffffff"] } = {}) {
    for (let k = 0; k < n; k++) {
      const i = sp.head++ % MAX, v = new THREE.Vector3().randomDirection().multiplyScalar(speed * (0.3 + Math.random()));
      sp.pos.set([p.x, p.y, p.z], i * 3); sp.vel.set([v.x, v.y, v.z], i * 3); sp.life[i] = sp.max[i] = life * (0.6 + Math.random() * 0.6);
      tmp.set(colors[k % colors.length]); sp.base.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
  }
  function updateSparks(dt) {
    for (let i = 0; i < MAX; i++) {
      if (sp.life[i] <= 0) { sp.col.set([0, 0, 0], i * 3); continue; }
      sp.life[i] -= dt; const f = Math.max(0, sp.life[i] / sp.max[i]);
      for (let a = 0; a < 3; a++) { sp.pos[i * 3 + a] += sp.vel[i * 3 + a] * dt; sp.col[i * 3 + a] = sp.base[i * 3 + a] * f * 1.6; sp.vel[i * 3 + a] *= 0.97; }
    }
    sGeo.attributes.position.needsUpdate = true; sGeo.attributes.color.needsUpdate = true;
  }
  const shock = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  shock.rotation.x = -Math.PI / 2; scene.add(shock);

  // ---------- État ----------
  let variant = "fusion", stage = "idle", items = [], busy = false, opening = false, time = 0, spinStart = 0, threads = null;
  const hint = document.getElementById("hint"), desc = document.getElementById("desc"), btn = document.getElementById("replay");
  const bounce = (item) => tween(0.4, (k) => { const s = 1 + 0.16 * Math.sin(k * Math.PI * 3) * (1 - k); item.root.scale.set(1 - (s - 1) * 0.6, s, 1 - (s - 1) * 0.6); }, ease.lin);
  const land = (item, i) => { A.land(); emit(slot(i).clone().add(new THREE.Vector3(0, -0.5, 0)), 14, { speed: 1.2, life: 0.5 }); item.state = "ready"; item.beam.visible = true; return bounce(item); };
  const portalPos = () => decor.portal.getWorldPosition(new THREE.Vector3());
  const bottomY = () => pod.group.position.y + pod.pedY - 0.2, topY = () => pod.group.position.y + pod.L / 2 + pod.H + 0.4;
  const setLabel = (label, text) => { btn.textContent = label; hint.textContent = text; };

  function fillPod() {
    items = CHARS.map((c) => { const it = noyaux.buildItem(BLUE, c, 0, 0, 0); pod.inner.add(it.root); it.root.scale.setScalar(0.4); it.beam.visible = false; it.state = "inside"; return it; });
  }
  function resetPod(visible) {
    pod.group.visible = visible; pod.group.position.copy(HOME); pod.group.scale.setScalar(1);
    pod.body.visible = true; pod.body.scale.set(1, 1, 1); pod.body.position.set(0, 0, 0); pod.body.rotation.set(0, 0, 0); pod.glow.visible = true; pod.top.position.set(0, 0, 0); pod.top.rotation.set(0, 0, 0); pod.top.visible = true;
    pod.glass.opacity = 0.42; pod.glow.material.opacity = 0.85; pod.edgeMat.opacity = 0.95; pod.coreMat.color.set(BLUE).multiplyScalar(3); pod.core.scale.set(1, 1.5, 1);
    clip.constant = 1e4; scanRing.visible = false; spinStart = time;
  }
  function reset() {
    tweens.clear(); items.forEach((i) => i.root.removeFromParent()); noyaux.clear(); items = []; opening = false; stage = "idle";
    if (threads) { threads.removeFromParent(); threads = null; }
    pm.uK.value = 0.2; decor.setSpin(1); shock.material.opacity = 0;
    resetPod(false);
    if (variant === "sortie") setLabel("Invoquer", "Clique « Invoquer » pour faire sortir la capsule du portail");
    else setLabel("Ouvrir", "Clique, ou appuie sur Espace, pour ouvrir");
    desc.innerHTML = `<b>${DESC[variant][0]}</b>${DESC[variant][1]}`;
  }

  // ---------- Briques communes ----------
  // Le portail s'embrase : anneaux qui s'emballent, cloches qui montent, montée sonore
  async function ignite(riser = true) {
    if (riser) A.riser(1.3);
    decor.setSpin(4); [0, 1, 2, 3].forEach((i) => wait(0.2 + i * 0.22).then(() => A.ring(i)));
    await tween(1.0, (k) => (pm.uK.value = 0.2 + 1.0 * k), ease.inOut);
  }
  const calm = () => tween(1.2, (k) => (pm.uK.value = 1.2 - 1.0 * k)).then(() => decor.setSpin(1));

  // Ouverture de la capsule : verrou, écrasement, le couvercle saute, les noyaux jaillissent
  async function openPod() {
    opening = true; A.latch();
    await tween(0.26, (k) => { pod.body.scale.set(1 + 0.08 * k, 1 - 0.12 * k, 1 + 0.08 * k); pod.coreMat.color.set(BLUE).multiplyScalar(3 + 4 * k); pod.core.scale.setScalar(1 + k * 0.6); }, ease.in);
    A.thump(); A.whoosh();
    const center = pod.group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.2, 0));
    emit(center.clone().add(new THREE.Vector3(0, 1, 0)), 90, { speed: 3, life: 0.9, colors: [BLUE, "#ffffff", MINT] });
    shock.position.set(center.x, pod.group.position.y + pod.pedY, center.z); shock.material.opacity = 0.9;
    tween(0.7, (k) => { shock.scale.setScalar(0.5 + k * 4); shock.material.opacity = 0.9 * (1 - k); });
    tween(0.75, (k) => { pod.top.position.y = 2.2 * Math.sin(k * Math.PI * 0.55) - 0.3 * k * k; pod.top.rotation.z = 0.9 * k; pod.top.rotation.x = 0.4 * k; }, ease.out).then(() => { pod.top.visible = false; });
    tween(0.4, (k) => { const o = Math.sin(k * Math.PI); pod.body.scale.set(1.08 - 0.08 * k - 0.05 * o, 0.88 + 0.12 * k + 0.16 * o, 1.08 - 0.08 * k - 0.05 * o); }, ease.out);
    await Promise.all(items.map((item, i) => wait(0.14 + i * 0.1).then(async () => {
      A.chime(i);
      scene.attach(item.root); const from = item.root.position.clone(), to = slot(i);
      const curve = new THREE.QuadraticBezierCurve3(from, from.clone().lerp(to, 0.5).add(new THREE.Vector3((i - 2) * 0.5, 2.8, 0.3)), to);
      let last = 0;
      await tween(0.95, (k) => { item.root.position.copy(curve.getPoint(k)); item.root.scale.setScalar(0.4 + 0.6 * ease.out(k)); item.body.rotation.y = (1 - k) * 8; if (k - last > 0.04) { last = k; emit(item.root.position, 2, { speed: 0.3, life: 0.5 }); } }, ease.inOut);
      item.root.position.copy(to); await land(item, i);
    })));
    await tween(0.8, (k) => { pod.coreMat.color.set(BLUE).multiplyScalar(7 * (1 - k) + 0.6); pod.core.scale.setScalar(1.6 - 0.6 * k); pod.edgeMat.opacity = 0.95 - 0.5 * k; pod.glow.material.opacity = 0.85 * (1 - k); }, ease.out);
    await tween(0.6, (k) => { pod.body.scale.setScalar(Math.max(0.001, 1 - k)); pod.body.position.y = -0.4 * k; }, ease.in); pod.body.visible = false;
  }

  // Matérialisation : une ligne de scan monte du socle et dévoile la capsule
  async function materialize() {
    resetPod(true); pod.glow.visible = false; fillPod(); items.forEach((i) => i.root.scale.setScalar(0.001));
    clip.constant = bottomY(); scanRing.visible = true; A.scan();
    await tween(1.7, (k) => { const h = bottomY() + (topY() - bottomY()) * k; clip.constant = h; scanRing.position.set(pod.group.position.x, h, pod.group.position.z); if (k > 0.02) emit(new THREE.Vector3(pod.group.position.x + (Math.random() - 0.5) * 1.6, h, pod.group.position.z + (Math.random() - 0.5) * 1.6), 2, { speed: 0.4, life: 0.5 }); }, ease.inOut);
    clip.constant = 1e4; scanRing.visible = false; pod.glow.visible = true; A.latch();
    await tween(0.5, (k) => items.forEach((it) => it.root.scale.setScalar(0.4 * k)), ease.out);
  }

  // Tissage : des fils arrivent de partout, se tendent sur les arêtes de la capsule (du bas vers le haut), puis le verre apparaît
  async function weave() {
    resetPod(true); pod.body.visible = false; fillPod(); items.forEach((i) => i.root.scale.setScalar(0.001));
    pod.group.updateMatrixWorld(true);
    const segs = [];
    pod.body.updateMatrixWorld(true);
    pod.body.traverse((o) => { if (o.isLineSegments) { const pos = o.geometry.attributes.position; for (let i = 0; i < pos.count; i += 2) { const a = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld), b = new THREE.Vector3().fromBufferAttribute(pos, i + 1).applyMatrix4(o.matrixWorld); pod.group.worldToLocal(a); pod.group.worldToLocal(b); segs.push([a, b]); } } });
    const n = segs.length, arr = new Float32Array(n * 6);
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2.6), transparent: true, opacity: 1 });
    threads = new THREE.LineSegments(geo, mat); threads.frustumCulled = false; pod.group.add(threads);
    let minY = 1e9, maxY = -1e9; segs.forEach(([a, b]) => { minY = Math.min(minY, a.y, b.y); maxY = Math.max(maxY, a.y, b.y); });
    const away = () => new THREE.Vector3().randomDirection().multiplyScalar(3 + Math.random() * 3).add(new THREE.Vector3(0, 1.5, 0));
    const plan = segs.map(([a, b]) => ({ a, b, sa: away(), sb: away(), delay: 0.65 * ((a.y + b.y) / 2 - minY) / (maxY - minY || 1) }));
    A.scan(); [0, 1, 2, 3, 4, 5].forEach((i) => wait(0.15 + i * 0.28).then(() => A.bell(1800 + i * 320, 0.9, 0.025)));
    const p = new THREE.Vector3(), q = new THREE.Vector3(), mid = new THREE.Vector3();
    await tween(2.0, (k) => {
      plan.forEach((s, i) => {
        const t = Math.min(1, Math.max(0, (k - s.delay) / 0.35)), e = ease.out(t), swirl = (1 - e) * Math.PI * 1.2, cs = Math.cos(swirl), sn = Math.sin(swirl);
        const rot = (v, out) => out.set(v.x * cs - v.z * sn, v.y, v.x * sn + v.z * cs);
        p.copy(s.sa); rot(p, p); p.lerp(s.a, e); q.copy(s.sb); rot(q, q); q.lerp(s.b, e);
        arr.set([p.x, p.y, p.z, q.x, q.y, q.z], i * 6);
        if (t > 0 && t < 1 && Math.random() < 0.15) { mid.copy(p).lerp(q, Math.random()); emit(pod.group.localToWorld(mid.clone()), 1, { speed: 0.3, life: 0.4 }); }
      });
      geo.attributes.position.needsUpdate = true;
    }, ease.lin);
    // Le dernier fil est tendu : le verre se forme et les fils s'éteignent
    pod.body.visible = true; pod.glass.opacity = 0; pod.edgeMat.opacity = 0; A.latch();
    await tween(0.7, (k) => { pod.glass.opacity = 0.42 * k; pod.edgeMat.opacity = 0.95 * k; mat.opacity = 1 - k; items.forEach((it) => it.root.scale.setScalar(0.4 * k)); }, ease.out);
    threads.removeFromParent(); threads = null; spinStart = time;
  }

  // Sortie du portail : la capsule descend en arc jusqu'à son socle
  async function emerge() {
    resetPod(true); fillPod(); const from = portalPos(), to = HOME.clone();
    pod.group.position.copy(from); pod.group.scale.setScalar(0.05); opening = true;
    const curve = new THREE.QuadraticBezierCurve3(from.clone(), from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 2.2, 3)), to);
    emit(from, 60, { speed: 2.5, life: 0.8, colors: [BLUE, "#ffffff", MINT] }); A.whoosh();
    let last = 0;
    await tween(1.7, (k) => { pod.group.position.copy(curve.getPoint(k)); pod.group.scale.setScalar(0.05 + 0.95 * k); pod.body.rotation.y = (1 - k) * 6; if (k - last > 0.03) { last = k; emit(pod.group.position, 3, { speed: 0.3, life: 0.6 }); } }, ease.inOut);
    pod.group.position.copy(to); A.thump(); A.bell(880, 1.6, 0.04); emit(to.clone().add(new THREE.Vector3(0, pod.pedY, 0)), 30, { speed: 1.4, life: 0.6 });
    shock.position.set(to.x, to.y + pod.pedY, to.z); shock.material.opacity = 0.7; tween(0.6, (k) => { shock.scale.setScalar(0.5 + k * 3); shock.material.opacity = 0.7 * (1 - k); });
    opening = false; spinStart = time;
  }

  // Les noyaux sortent directement du portail
  async function portalOnly() {
    const from = portalPos();
    await ignite();
    items = CHARS.map((c) => { const it = noyaux.buildItem(BLUE, c, from.x, from.y, from.z); it.root.scale.setScalar(0.01); it.beam.visible = false; it.state = "flying"; return it; });
    await Promise.all(items.map((item, i) => wait(i * 0.17).then(async () => {
      A.whoosh(); A.chime(i); emit(from, 40, { speed: 2.5, life: 0.7, colors: [BLUE, "#ffffff", MINT] }); pm.uK.value = Math.min(1.5, pm.uK.value + 0.12);
      const to = slot(i), curve = new THREE.QuadraticBezierCurve3(from.clone(), from.clone().lerp(to, 0.45).add(new THREE.Vector3((i - 2) * 1.2, 2.6, 0)), to);
      let last = 0;
      await tween(1.1, (k) => { item.root.position.copy(curve.getPoint(k)); item.root.scale.setScalar(0.12 + 0.88 * k); item.body.rotation.y = (1 - k) * 9; if (k - last > 0.03) { last = k; emit(item.root.position, 3, { speed: 0.35, life: 0.6 }); } }, ease.out);
      item.root.position.copy(to); await land(item, i);
    })));
    await calm();
  }

  async function play() {
    if (busy) return; busy = true; A.init(); hint.textContent = "";
    if (variant === "fusion") { await ignite(); await materialize(); await wait(0.45); await openPod(); await calm(); }
    else if (variant === "sortie") {
      if (stage === "idle") { await ignite(); await emerge(); await calm(); stage = "summoned"; setLabel("Ouvrir la capsule", "Clique sur la capsule (ou « Ouvrir la capsule ») pour l'ouvrir"); busy = false; return; }
      await openPod();
    } else if (variant === "portail") await portalOnly();
    else await weave().then(() => wait(0.4)).then(openPod);
    busy = false; stage = "done"; setLabel("Rejouer", "Clique « Rejouer » pour recommencer");
  }
  const again = () => { if (busy) return; if (stage === "done") reset(); play(); };
  const setVariant = (v) => { if (busy) return; variant = v; document.querySelectorAll("[data-v]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v))); reset(); };
  document.querySelectorAll("[data-v]").forEach((b) => b.addEventListener("click", () => setVariant(b.dataset.v)));
  btn.addEventListener("click", (e) => { e.stopPropagation(); again(); });
  canvas.addEventListener("click", () => { if (stage !== "done") again(); });
  addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); again(); } });
  reset();

  // ---------- Boucle ----------
  let last = performance.now();
  const tick = (dt) => {
    time += dt;
    for (const tw of [...tweens]) { tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(tw.e(k)); if (k >= 1) { tweens.delete(tw); tw.res(); } }
    decor.update(dt, time); updateSparks(dt);
    if (pod.group.visible && !opening && pod.body.visible) {
      pod.group.position.y = HOME.y + Math.sin(time * 1.3) * 0.08; pod.body.rotation.y = (time - spinStart) * 0.4;
      pod.core.rotation.y = time * 2; pod.core.scale.setScalar(1 + Math.sin(time * 3) * 0.08);
      items.forEach((it, i) => { if (it.state !== "inside") return; const a = time * 0.9 + (i / 5) * Math.PI * 2; it.root.position.set(Math.cos(a) * 0.5, Math.sin(time * 1.4 + i) * 0.22 + (i - 2) * 0.14, Math.sin(a) * 0.5); });
    }
    noyaux.update(ctx, items, dt, time, null);
    camera.position.set(Math.sin(time * 0.15) * 0.5, 2.4, 8.5); camera.lookAt(0, 1.45, 0);
  };
  renderer.setAnimationLoop((now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; tick(dt); composer.render(dt); });
  // Pour les tests automatisés : avance le temps simulé sans rendre chaque image
  window.__lab = { ready: true, skip: async (sec) => { for (let t = 0; t < sec; t += 0.05) { tick(0.05); if (t % 0.5 < 0.05) await Promise.resolve(); } }, play: again, setVariant, get items() { return items.map((i) => i.state); }, get stage() { return stage; } };
}
