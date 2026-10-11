// Maquette d'ouverture : deux façons de faire arriver les cinq noyaux, à comparer sans serveur ni compte.
//   A · Portail : le grand portail du fond s'embrase et les noyaux en jaillissent jusqu'à leur place.
//   B · Capsule : un reliquaire de verre à facettes ; au « bop », le couvercle saute et les noyaux en sortent.
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
  portail: ["A · Portail", "Le portail géant du fond s'allume, tourne plus vite, et les cinq noyaux en sortent en arc, laissent une traînée de lumière et se posent à leur place. Pas d'objet au premier plan : tout vient du décor."],
  capsule: ["B · Capsule", "Un reliquaire de verre à facettes, arêtes lumineuses, cœur qui brille et noyaux qui tournent à l'intérieur. À l'ouverture : écrasement, « bop », le couvercle saute, les noyaux jaillissent."],
};

// ---------- Son : un « bop » rond et bref, des « pip » qui montent, un petit choc à l'atterrissage ----------
const A = {
  ctx: null,
  init() { this.ctx ||= new (window.AudioContext || window.webkitAudioContext)(); this.ctx.resume(); },
  tone(f0, f1, dur, { type = "sine", gain = 0.2, at = 0 } = {}) {
    const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, { from = 2000, to = 600, gain = 0.08, at = 0 } = {}) {
    const c = this.ctx, t = c.currentTime + at, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(c.destination); s.start(t);
  },
  bop(i = 0) { const k = 2 ** (i / 6); this.tone(680 * k, 150 * k, 0.13, { gain: 0.34 }); this.tone(1360 * k, 300 * k, 0.07, { type: "triangle", gain: 0.1 }); this.noise(0.03, { from: 4000, to: 1500, gain: 0.07 }); },
  pip(i) { this.tone(880 * 2 ** (i / 5), 1200 * 2 ** (i / 5), 0.12, { type: "triangle", gain: 0.08 }); },
  land() { this.tone(260, 80, 0.12, { gain: 0.14 }); },
  hum() { this.tone(70, 260, 1.0, { type: "sawtooth", gain: 0.035 }); this.noise(0.9, { from: 300, to: 2500, gain: 0.04 }); },
};

export async function start() {
  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(TEST ? 0.5 : Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.7; renderer.shadowMap.enabled = true;
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

  // ---------- Interpolations, attente, étincelles ----------
  const tweens = new Set();
  const ease = { out: (k) => 1 - (1 - k) ** 3, in: (k) => k * k * k, inOut: (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2), back: (k) => 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2 };
  const tween = (dur, fn, e = ease.out) => new Promise((res) => tweens.add({ t: 0, dur, fn, e, res }));
  const wait = (s) => tween(s, () => {}, (k) => k); // attente en temps simulé : avance avec les interpolations (et avec __lab.skip)
  const MAX = 1500, sp = { pos: new Float32Array(MAX * 3), col: new Float32Array(MAX * 3), vel: new Float32Array(MAX * 3), life: new Float32Array(MAX), max: new Float32Array(MAX), base: new Float32Array(MAX * 3), head: 0 };
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute("position", new THREE.BufferAttribute(sp.pos, 3)); sGeo.setAttribute("color", new THREE.BufferAttribute(sp.col, 3));
  const sparks = new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 0.11, map: softDot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sparks.frustumCulled = false; scene.add(sparks);
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

  // Anneau d'onde de choc (capsule)
  const shock = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  shock.rotation.x = -Math.PI / 2; scene.add(shock);

  // ---------- État ----------
  let variant = "portail", items = [], busy = false, opening = false, time = 0;
  const hint = document.getElementById("hint"), desc = document.getElementById("desc");
  const bounce = (item) => tween(0.4, (k) => { const s = 1 + 0.18 * Math.sin(k * Math.PI * 3) * (1 - k); item.root.scale.set(1 + (s - 1) * -0.6, s, 1 + (s - 1) * -0.6); }, (k) => k);
  const land = (item, i) => { A.land(); emit(slot(i).clone().add(new THREE.Vector3(0, -0.5, 0)), 14, { speed: 1.2, life: 0.5 }); item.state = "ready"; item.beam.visible = true; return bounce(item); };

  function reset() {
    tweens.clear(); items.forEach((i) => i.root.removeFromParent()); noyaux.clear(); items = []; opening = false;
    pm.uK.value = 0.2; decor.setSpin(1); shock.material.opacity = 0;
    pod.group.visible = variant === "capsule"; pod.group.position.copy(HOME); pod.group.scale.setScalar(1);
    pod.body.scale.set(1, 1, 1); pod.body.position.set(0, 0, 0); pod.body.visible = true; pod.top.position.set(0, 0, 0); pod.top.rotation.set(0, 0, 0); pod.top.visible = true; pod.bottom.visible = true;
    pod.glass.opacity = 0.42; pod.glow.material.opacity = 0.85; pod.edgeMat.opacity = 0.95; pod.coreMat.color.set(BLUE).multiplyScalar(3); pod.core.scale.set(1, 1.5, 1); pod.core.visible = true; pod.energy.visible = true;
    if (variant === "capsule") {
      items = CHARS.map((c) => { const it = noyaux.buildItem(BLUE, c, 0, 0, 0); pod.inner.add(it.root); it.root.scale.setScalar(0.4); it.beam.visible = false; it.state = "inside"; return it; });
    }
    document.getElementById("replay").textContent = "Ouvrir"; hint.textContent = "Clique, ou appuie sur Espace, pour ouvrir";
    [desc.innerHTML] = [`<b>${DESC[variant][0]}</b>${DESC[variant][1]}`];
  }

  // ---------- A · Portail ----------
  async function playPortal() {
    const from = decor.portal.getWorldPosition(new THREE.Vector3());
    A.hum(); decor.setSpin(3);
    tween(0.8, (k) => (pm.uK.value = 0.2 + 0.9 * k));
    await wait(0.7);
    items = CHARS.map((c) => { const it = noyaux.buildItem(BLUE, c, from.x, from.y, from.z); it.root.scale.setScalar(0.01); it.beam.visible = false; it.state = "flying"; return it; });
    await Promise.all(items.map((item, i) => wait(i * 0.17).then(async () => {
      A.bop(i); emit(from, 40, { speed: 2.5, life: 0.7, colors: [BLUE, "#ffffff", MINT] }); pm.uK.value = Math.min(1.5, pm.uK.value + 0.15);
      const to = slot(i), curve = new THREE.QuadraticBezierCurve3(from.clone(), from.clone().lerp(to, 0.45).add(new THREE.Vector3((i - 2) * 1.2, 2.6, 0)), to);
      let last = 0;
      await tween(1.1, (k) => { item.root.position.copy(curve.getPoint(k)); item.root.scale.setScalar(0.12 + 0.88 * k); item.body.rotation.y = (1 - k) * 9; if (k - last > 0.03) { last = k; emit(item.root.position, 3, { speed: 0.35, life: 0.6 }); } }, ease.out);
      item.root.position.copy(to); await land(item, i);
    })));
    await tween(1.0, (k) => (pm.uK.value = 1.1 - 0.9 * k)); decor.setSpin(1);
  }

  // ---------- B · Capsule ----------
  async function playCapsule() {
    opening = true;
    // Écrasement : la capsule se tasse et s'embrase avant de rebondir
    await tween(0.24, (k) => { pod.body.scale.set(1 + 0.1 * k, 1 - 0.14 * k, 1 + 0.1 * k); pod.coreMat.color.set(BLUE).multiplyScalar(3 + 4 * k); pod.core.scale.setScalar(1 + k * 0.6); }, ease.in);
    A.bop(0);
    const center = pod.group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.2, 0));
    emit(center.clone().add(new THREE.Vector3(0, 1, 0)), 90, { speed: 3, life: 0.9, colors: [BLUE, "#ffffff", MINT] });
    shock.position.set(center.x, pod.group.position.y + pod.pedY, center.z); shock.material.opacity = 0.9;
    tween(0.7, (k) => { shock.scale.setScalar(0.5 + k * 4); shock.material.opacity = 0.9 * (1 - k); });
    // Le couvercle saute et retombe en tournant ; la capsule s'étire puis se redresse
    tween(0.75, (k) => { pod.top.position.y = 2.2 * Math.sin(k * Math.PI * 0.55) - 0.3 * k * k; pod.top.rotation.z = 0.9 * k; pod.top.rotation.x = 0.4 * k; }, ease.out).then(() => { pod.top.visible = false; });
    tween(0.4, (k) => { const o = Math.sin(k * Math.PI); pod.body.scale.set(1.1 - 0.1 * k - 0.06 * o, 0.86 + 0.14 * k + 0.18 * o, 1.1 - 0.1 * k - 0.06 * o); }, ease.out);
    // Les noyaux jaillissent un à un
    const pending = items.map((item, i) => wait(0.12 + i * 0.1).then(async () => {
      A.pip(i);
      scene.attach(item.root); const from = item.root.position.clone(), to = slot(i);
      const curve = new THREE.QuadraticBezierCurve3(from, from.clone().lerp(to, 0.5).add(new THREE.Vector3((i - 2) * 0.5, 2.8, 0.3)), to);
      let last = 0;
      await tween(0.95, (k) => { item.root.position.copy(curve.getPoint(k)); item.root.scale.setScalar(0.4 + 0.6 * ease.out(k)); item.body.rotation.y = (1 - k) * 8; if (k - last > 0.04) { last = k; emit(item.root.position, 2, { speed: 0.3, life: 0.5 }); } }, ease.inOut);
      item.root.position.copy(to); await land(item, i);
    }));
    await Promise.all(pending);
    // Le cœur s'éteint doucement
    await tween(0.8, (k) => { pod.coreMat.color.set(BLUE).multiplyScalar(7 * (1 - k) + 0.6); pod.core.scale.setScalar(1.6 - 0.6 * k); pod.edgeMat.opacity = 0.95 - 0.5 * k; pod.glow.material.opacity = 0.85 * (1 - k); }, ease.out);
    // L'étui se replie et disparaît pour dégager les noyaux
    await tween(0.6, (k) => { pod.body.scale.setScalar(Math.max(0.001, 1 - k)); pod.body.position.y = -0.4 * k; }, ease.in); pod.body.visible = false;
  }

  async function play() {
    if (busy) return; busy = true; A.init(); hint.textContent = "";
    if (variant === "portail") await playPortal(); else await playCapsule();
    busy = false; hint.textContent = "Clique « Ouvrir » pour rejouer";
  }
  const setVariant = (v) => { if (busy) return; variant = v; document.getElementById("v-portail").setAttribute("aria-pressed", String(v === "portail")); document.getElementById("v-capsule").setAttribute("aria-pressed", String(v === "capsule")); reset(); };
  document.getElementById("v-portail").addEventListener("click", () => setVariant("portail"));
  document.getElementById("v-capsule").addEventListener("click", () => setVariant("capsule"));
  document.getElementById("replay").addEventListener("click", (e) => { e.stopPropagation(); if (busy) return; if (items.some((i) => i.state === "ready")) reset(); play(); });
  canvas.addEventListener("click", () => { if (!busy && !items.some((i) => i.state === "ready")) play(); });
  addEventListener("keydown", (e) => { if (e.key === " " && !busy) { e.preventDefault(); if (items.some((i) => i.state === "ready")) reset(); play(); } });
  reset();

  // ---------- Boucle ----------
  let last = performance.now();
  const tick = (dt) => {
    time += dt;
    for (const tw of [...tweens]) { tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(tw.e(k)); if (k >= 1) { tweens.delete(tw); tw.res(); } }
    decor.update(dt, time); updateSparks(dt);
    if (variant === "capsule" && pod.group.visible && !opening) {
      pod.group.position.y = HOME.y + Math.sin(time * 1.3) * 0.08; pod.body.rotation.y = time * 0.4;
      pod.core.rotation.y = time * 2; pod.core.scale.setScalar(1 + Math.sin(time * 3) * 0.08);
      items.forEach((it, i) => { const a = time * 0.9 + (i / 5) * Math.PI * 2; it.root.position.set(Math.cos(a) * 0.5, Math.sin(time * 1.4 + i) * 0.22 + (i - 2) * 0.14, Math.sin(a) * 0.5); });
    }
    noyaux.update(ctx, items, dt, time, null);
    camera.position.set(Math.sin(time * 0.15) * 0.5, 2.4, 8.5); camera.lookAt(0, 1.45, 0);
  };
  renderer.setAnimationLoop((now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; tick(dt); composer.render(dt); });
  // Pour les tests automatisés : avance le temps simulé sans rendre chaque image
  window.__lab = { ready: true, skip: async (sec) => { for (let t = 0; t < sec; t += 0.05) { tick(0.05); if (t % 0.5 < 0.05) await Promise.resolve(); } }, play, setVariant, get items() { return items.map((i) => i.state); } };
}
