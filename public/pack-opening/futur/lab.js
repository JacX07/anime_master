// Maquettes d'ouverture : quatre façons de faire apparaître la capsule et de lâcher les cinq noyaux, à comparer sans serveur ni compte.
//   1 · Portail + capsule : « Ouvrir » embrase le portail (anneaux, son), la capsule se matérialise, puis s'ouvre.
//   2 · Capsule sortie du portail : le portail la dépose, on clique ensuite sur la capsule pour l'ouvrir.
//   3 · Portail seul : les noyaux jaillissent directement du portail.
//   4 · Machine à tisser : un anneau à six têtes, suspendu à un rail, tisse la capsule, puis elle s'ouvre.
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
  tisserand: ["4 · Machine à tisser", "Une machine-araignée reste suspendue haut au-dessus de la capsule, à son rail : carapace sombre, quatre yeux, huit pattes articulées. Deux s'agrippent au rail et se raccrochent plus haut ; les six autres descendent tisser la capsule de la pointe du haut à celle du bas, chacune à son rythme, avec ses retards et ses tapotements. Puis elle remonte, le verre se forme, la capsule s'ouvre."],
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
  // Moteur : grondement qui monte, avec un souffle de mécanisme ; tic sec à chaque niveau tissé ; scintillement quand le verre se forme
  motor(dur) { this.tone(62, 118, dur, { type: "sawtooth", gain: 0.05, a: 0.9, cutoff: 520, wet: 0.2 }); this.noise(dur, { from: 700, to: 1500, gain: 0.014, q: 3, wet: 0.2 }); },
  tick() { this.noise(0.012, { type: "highpass", from: 4600, to: 4500, gain: 0.03, wet: 0.15 }); this.sub(320, 230, 0.025, 0.05); },
  skitter() { for (let i = 0; i < 14; i++) this.noise(0.01, { type: "highpass", from: 3800 + Math.random() * 1500, to: 3700, gain: 0.025, at: Math.random() * 0.9, wet: 0.2 }); },
  shimmer() { [0, 1, 2, 3, 4].forEach((i) => this.bell(1568 * 1.19 ** i, 1.2, 0.02, i * 0.07)); },
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
  let camLift = 0, variant = "fusion", stage = "idle", items = [], busy = false, opening = false, time = 0, spinStart = 0, threads = null;
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
    tweens.clear(); camLift = 0; items.forEach((i) => i.root.removeFromParent()); noyaux.clear(); items = []; opening = false; stage = "idle";
    if (threads) { threads.removeFromParent(); threads = null; }
    if (machine) machine.group.visible = false;
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

  // ---------- Machine à tisser : un rail descend du plafond, un anneau à six têtes trace les arêtes de la capsule ----------
  let machine = null;
  const LEG_A = 1.95, LEG_B = 2.1, BODY_H = 3.2; // longueurs des deux segments d'une patte ; le corps reste haut au-dessus de la capsule, il ne la touche jamais
  const rnd = (a, b) => a + Math.random() * (b - a);
  function ensureMachine() {
    if (machine) return machine;
    // Métal sombre et lustré : il ressort sur le labo clair, les yeux et les pointes sont les seules lumières
    const dark = new THREE.MeshStandardMaterial({ color: "#16213a", metalness: 0.92, roughness: 0.28 });
    const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(3) });
    const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(MINT).multiplyScalar(3) });
    const group = new THREE.Group(); scene.add(group);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 14, 6), dark); group.add(rail);
    // Corps : une carapace ovale, une crête, quatre yeux
    const body = new THREE.Group(); group.add(body);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), dark); shell.scale.set(1, 0.62, 1); shell.castShadow = true; body.add(shell);
    const crest = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 8, 6), dark); crest.rotation.x = Math.PI / 2; crest.position.y = 0.19; body.add(crest);
    const eyes = [[-0.15, 0.04, 0.45, 0.055], [0.15, 0.04, 0.45, 0.055], [-0.28, 0.09, 0.37, 0.038], [0.28, 0.09, 0.37, 0.038]].map(([x, y, z, r]) => { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), eyeMat); e.position.set(x, y, z); body.add(e); return e; });
    // Pattes : deux segments effilés, un genou, une pointe. Chacune a ses propres fréquences, son retard et ses « tapotements ».
    const legs = [];
    for (let i = 0; i < 8; i++) {
      const seg = (r0, r1) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 1, 6), dark); m.castShadow = true; group.add(m); return m; };
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), dark); group.add(knee);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 6), i < 6 ? glowMat : dark); tip.geometry.translate(0, -0.12, 0); group.add(tip);
      legs.push({ femur: seg(0.075, 0.05), tibia: seg(0.05, 0.02), knee, tip, s: { f1: rnd(2.2, 4.6), f2: rnd(1.4, 3.2), f3: rnd(5, 9), ph: rnd(0, 6.28), next: rnd(0.2, 1.4), dab: null } });
    }
    machine = { group, body, rail, eyes, legs, heads: legs.slice(0, 6).map((l) => l.tip) };
    return machine;
  }
  const UP = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3(), _p = new THREE.Vector3(), _n = new THREE.Vector3();
  const setSeg = (mesh, p0, p1) => { _d.subVectors(p1, p0); const len = _d.length(); mesh.position.addVectors(p0, p1).multiplyScalar(0.5); mesh.scale.set(1, Math.max(0.001, len), 1); mesh.quaternion.setFromUnitVectors(UP, _d.normalize()); };
  // Cinématique inverse à deux segments : le genou se place dans le plan défini par la direction origine → pointe et un vecteur « vers le haut et vers l'extérieur »
  function solveLeg(origin, target, pole, knee) {
    _d.subVectors(target, origin); let dist = _d.length(); const dir = _d.clone().divideScalar(dist || 1);
    dist = Math.min(LEG_A + LEG_B - 0.01, Math.max(Math.abs(LEG_A - LEG_B) + 0.01, dist));
    const x = (dist * dist + LEG_A * LEG_A - LEG_B * LEG_B) / (2 * dist), h = Math.sqrt(Math.max(0, LEG_A * LEG_A - x * x));
    _p.copy(pole).addScaledVector(dir, -pole.dot(dir)).normalize();
    knee.copy(origin).addScaledVector(dir, x).addScaledVector(_p, h);
  }
  // Pose la machine (repère de la capsule) : corps à la hauteur bodyY, pointe de chaque patte de tissage sur tips[i]. Tout bouge en continu, patte par patte.
  function placeMachine(m, bodyY, tips) {
    m.group.position.set(HOME.x, HOME.y, HOME.z);
    m.body.position.set(Math.sin(time * 0.9) * 0.1, bodyY + Math.sin(time * 1.3) * 0.07, Math.cos(time * 0.7) * 0.08);
    m.body.rotation.set(Math.sin(time * 0.8) * 0.06, Math.sin(time * 0.6) * 0.2, Math.sin(time * 1.1) * 0.05);
    m.body.scale.setScalar(1 + Math.sin(time * 2.2) * 0.02); m.body.updateMatrix();
    m.rail.position.set(m.body.position.x, m.body.position.y + 7.4, m.body.position.z);
    const origin = new THREE.Vector3(), target = new THREE.Vector3(), pole = new THREE.Vector3(), knee = new THREE.Vector3(), t = time;
    m.legs.forEach((l, i) => {
      const s = l.s, th = ((i < 6 ? i : i - 6 + 0.5) * Math.PI) / 3;
      if (i < 6) {
        origin.set(Math.sin(th) * 0.36, -0.14, Math.cos(th) * 0.36).applyMatrix4(m.body.matrix);
        target.copy(tips[i]);
        // Le genou monte, se balance de côté et se plie à son propre rythme
        const sw = Math.sin(t * s.f1 + s.ph) * 0.9;
        pole.set(Math.sin(th) + Math.cos(th) * sw, 1.3 + 0.7 * Math.sin(t * s.f2 + s.ph * 1.7), Math.cos(th) - Math.sin(th) * sw);
      } else { // deux pattes qui s'agrippent au rail, se décrochent et se raccrochent plus haut
        const sx = i === 6 ? -1 : 1, g = (t * 0.7 + (i - 6) * 0.5) % 1, climb = g < 0.8 ? g / 0.8 : 1 - (g - 0.8) / 0.2, lift = g >= 0.8 ? 0.35 * Math.sin((Math.PI * (g - 0.8)) / 0.2) : 0;
        origin.set(sx * 0.24, 0.16, 0).applyMatrix4(m.body.matrix);
        target.set(m.rail.position.x + sx * 0.06, m.body.position.y + 1.2 + 1.0 * climb + lift, m.rail.position.z + 0.04); pole.set(sx, 0.4, 0.9);
      }
      solveLeg(origin, target, pole, knee);
      _n.subVectors(target, knee).normalize();
      l.tip.position.copy(target); l.tip.quaternion.setFromUnitVectors(UP, _n);
      l.knee.position.copy(knee); setSeg(l.femur, origin, knee); setSeg(l.tibia, knee, target);
    });
    m.eyes.forEach((e, i) => e.scale.setScalar(1 + Math.sin(time * 4 + i * 1.3) * 0.18));
  }
  let lastTick = -1;
  // Cible d'une patte de tissage : le point du fil + un petit mouvement propre + de temps en temps un tapotement (la patte se lève, se pose à côté, revient)
  function legTarget(l, i, base, wob) {
    const s = l.s, th = (i * Math.PI) / 3, out = base.clone();
    out.x += Math.cos(th) * Math.sin(time * s.f1 + s.ph) * 0.05 * wob; out.z -= Math.sin(th) * Math.sin(time * s.f1 + s.ph) * 0.05 * wob; out.y += Math.cos(time * s.f3 + s.ph) * 0.04 * wob;
    if (!s.dab && time > s.next) s.dab = { t0: time, dur: rnd(0.3, 0.6), side: rnd(-0.28, 0.28), up: rnd(0.12, 0.34) };
    if (s.dab) {
      const p = (time - s.dab.t0) / s.dab.dur;
      if (p >= 1) { s.dab = null; s.next = time + rnd(0.4, 1.6); if (time - lastTick > 0.05 && Math.random() < 0.6) { A.tick(); lastTick = time; } }
      else { const w = Math.sin(Math.PI * p); out.y += s.dab.up * w; out.x += Math.cos(th) * s.dab.side * w; out.z -= Math.sin(th) * s.dab.side * w; }
    }
    return out;
  }

  async function weave() {
    resetPod(true); pod.body.visible = false; fillPod(); items.forEach((i) => i.root.scale.setScalar(0.001)); opening = true;
    const m = ensureMachine(); m.group.visible = true; m.legs.forEach((l) => { l.s.dab = null; l.s.next = time + rnd(0.2, 1.4); });
    const { R, L, H } = pod, yTop = L / 2 + H;
    // Chemin des pointes : pointe du haut → épaule → ventre → épaule → pointe du bas (rayon et hauteur dans le repère de la capsule)
    const path = (u) => { const d = Math.min(1, Math.max(0, u)) * (2 * H + L); if (d < H) return { y: yTop - d, r: (d / H) * R }; if (d < H + L) return { y: L / 2 - (d - H), r: R }; const e = (d - H - L) / H; return { y: -L / 2 - e * H, r: R * (1 - e) }; };
    const K = 90, M = 36, vert = (i, r, y) => { const th = (i * Math.PI) / 3; return [Math.sin(th) * r, y, Math.cos(th) * r]; };
    // Chaîne : une ligne par patte, révélée au rythme de CETTE patte (elles n'avancent pas toutes pareil). Trame : un hexagone par niveau.
    const lines = new THREE.Group(); pod.group.add(lines); threads = lines;
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2.6), transparent: true, opacity: 1 });
    const warp = [];
    for (let i = 0; i < 6; i++) {
      const arr = new Float32Array(K * 3); for (let k = 0; k < K; k++) { const { y, r } = path(k / (K - 1)); arr.set(vert(i, r, y), k * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(arr, 3)); g.setDrawRange(0, 0);
      const line = new THREE.Line(g, mat); line.frustumCulled = false; lines.add(line); warp.push(g);
    }
    const weftArr = new Float32Array(M * 12 * 3);
    for (let k = 0; k < M; k++) { const { y, r } = path((k + 0.5) / M); for (let i = 0; i < 6; i++) weftArr.set([...vert(i, r, y), ...vert((i + 1) % 6, r, y)], (k * 12 + i * 2) * 3); }
    const wg = new THREE.BufferGeometry(); wg.setAttribute("position", new THREE.BufferAttribute(weftArr, 3)); wg.setDrawRange(0, 0);
    const weft = new THREE.LineSegments(wg, mat); weft.frustumCulled = false; lines.add(weft);
    const lag = [-0.035, 0.02, -0.015, 0.035, -0.025, 0.01], speedJitter = m.legs.map(() => rnd(0.9, 1.1));
    const apex = (i, y, spread) => { const th = (i * Math.PI) / 3 + time * 0.6; return new THREE.Vector3(Math.sin(th) * spread, y, Math.cos(th) * spread); };

    // 1 · l'araignée descend du plafond en tâtant l'air avec ses pattes, jusqu'au-dessus de la pointe de la capsule
    A.motor(5.4); A.riser(1.0, 0.03); A.skitter();
    tween(1.4, (k) => (camLift = 1.3 * k), ease.inOut); // la caméra se lève pour suivre l'araignée
    await tween(1.1, (k) => { const ty = 6.2 + (yTop - 6.2) * k; placeMachine(m, ty + BODY_H, m.legs.slice(0, 6).map((l, i) => legTarget(l, i, apex(i, ty, 0.35 + 0.25 * Math.sin(time * 3 + i)), 4))); }, ease.inOut);
    // 2 · elle tisse : chaque patte suit son fil avec son propre retard et ses propres gestes
    let lastLevel = -1;
    await tween(3.4, (u0) => {
      const u = -0.05 + u0 * 1.1; // les pattes en retard finissent après les autres
      let avgY = 0;
      const tips = m.legs.slice(0, 6).map((l, i) => { const ui = Math.min(1, Math.max(0, u * speedJitter[i] + lag[i])), { y, r } = path(ui); avgY += y / 6; warp[i].setDrawRange(0, Math.max(0, Math.round(ui * (K - 1)) + 1)); return legTarget(l, i, new THREE.Vector3(...vert(i, r, y)), 1); });
      placeMachine(m, avgY + BODY_H, tips);
      const level = Math.floor(Math.min(1, Math.max(0, u)) * M); if (level !== lastLevel) { lastLevel = level; wg.setDrawRange(0, Math.min(M, level) * 12); }
      if (Math.random() < 0.4) tips.forEach((tp, i) => { if (Math.random() < 0.3) emit(pod.group.localToWorld(tp.clone()), 1, { speed: 0.3, life: 0.35 }); });
    }, ease.lin);
    wg.setDrawRange(0, M * 12); warp.forEach((g) => g.setDrawRange(0, K));
    // 3 · elle remonte en repliant ses pattes, le verre se forme, les fils s'éteignent
    pod.body.visible = true; pod.glass.opacity = 0; pod.edgeMat.opacity = 0; A.latch(); A.shimmer(); A.skitter();
    tween(1.3, (k) => { const by = -yTop + BODY_H + (14 + yTop) * ease.in(k); placeMachine(m, by, m.legs.slice(0, 6).map((l, i) => legTarget(l, i, apex(i, by - BODY_H, 0.3 * (1 - k * 0.5)), 3))); }, ease.in).then(() => { m.group.visible = false; });
    await tween(0.8, (k) => { pod.glass.opacity = 0.42 * k; pod.edgeMat.opacity = 0.95 * k; mat.opacity = 1 - k; items.forEach((it) => it.root.scale.setScalar(0.4 * k)); }, ease.out);
    tween(1.4, (k) => (camLift = 1.3 * (1 - k)), ease.inOut);
    threads.removeFromParent(); threads = null; spinStart = time; opening = false;
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
    camera.position.set(Math.sin(time * 0.15) * 0.5, 2.4 + camLift * 0.5, 8.5); camera.lookAt(0, 1.45 + camLift, 0);
  };
  renderer.setAnimationLoop((now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; tick(dt); composer.render(dt); });
  // Pour les tests automatisés : avance le temps simulé sans rendre chaque image
  window.__lab = { ready: true, skip: async (sec) => { for (let t = 0; t < sec; t += 0.05) { tick(0.05); if (t % 0.5 < 0.05) await Promise.resolve(); } }, play: again, setVariant, get items() { return items.map((i) => i.state); }, get stage() { return stage; } };
}
