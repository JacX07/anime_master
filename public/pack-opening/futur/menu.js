// Décor du menu d'accueil : le même laboratoire que la scène d'ouverture, avec la capsule qui tourne lentement.
// Pas d'interaction ici : la page hôte superpose le menu (HTML) à ce fond.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { cardPainter } from "../opening/core.js";
import THEME from "../opening/themes/futur.js";
import { buildDecor, BLUE, MINT } from "./decor.js";
import { buildCapsule } from "./capsule.js";
import { createPerf } from "./perf.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TEST = new URLSearchParams(location.search).has("test");
const PERF = new URLSearchParams(location.search).has("perf");

export async function start() {
  // Polices du dos de carte (Michroma / Sora), chargées avant de le peindre
  const link = document.createElement("link"); link.rel = "stylesheet"; link.href = THEME.fonts; document.head.append(link);
  await Promise.all([document.fonts.load('400 44px "Michroma"'), document.fonts.load('400 26px "Sora"')]);

  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(TEST ? 0.5 : Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.38; // crépuscule : le décor est volontairement sombre
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  const decor = buildDecor({ scene, renderer });

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: TEST ? 0 : 2 }));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.4, 0.4, 1.5);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Mise en page : la capsule se place à droite sur grand écran (le menu occupe la gauche), au centre sur mobile
  let side = 1;
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    side = w > 900 ? 1 : 0;
  };
  addEventListener("resize", resize); resize();

  // Petit moteur d'interpolation pour l'entrée de la capsule
  const tweens = new Set();
  const ease = { out: (k) => 1 - Math.pow(1 - k, 3), in: (k) => k * k * k, back: (k) => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2) };
  const tween = (dur, fn, e = ease.out) => new Promise((res) => tweens.add({ t: 0, dur, fn, e, res }));

  const backTex = cardPainter(THEME, {}).makeBack();
  const capsule = buildCapsule({ decor, ctx: { tween, ease }, backTex, BLUE, MINT });
  scene.add(capsule.group); capsule.show();

  // ?perf : affichage de mesure et interrupteurs (voir perf.js)
  const perf = PERF ? createPerf({
    renderer,
    toggles: {
      halo: { key: "b", set: (v) => (bloom.enabled = v) },
      miroir: { key: "m", set: (v) => (decor.mirror.visible = v) },
      ombres: { key: "s", set: (v) => (decor.key.castShadow = v) },
      ciel: { key: "k", set: (v) => (decor.sky.visible = v) },
    },
    setPixelRatio: (r) => { pixelRatio = r; renderer.setPixelRatio(r); composer.setPixelRatio(r); resize(); },
  }) : null;

  // Résolution adaptative : si la machine ne tient pas ~45 images/s, on baisse le ratio de pixels par paliers (sans jamais remonter, pour éviter les oscillations)
  let pixelRatio = renderer.getPixelRatio();
  const ad = { n: 0, acc: 0, skip: 120 };
  const adapt = (ms) => {
    if (TEST || PERF || ad.skip-- > 0) return;
    ad.acc += Math.min(ms, 100);
    if (++ad.n < 90) return;
    const avg = ad.acc / ad.n; ad.n = 0; ad.acc = 0;
    if (avg > 22 && pixelRatio > 0.75) { pixelRatio = Math.max(0.75, pixelRatio * 0.85); renderer.setPixelRatio(pixelRatio); composer.setPixelRatio(pixelRatio); resize(); }
  };

  const still = new THREE.Vector2();
  let last = performance.now(), time = 0;
  renderer.setAnimationLoop((now) => {
    perf?.begin();
    adapt(now - last);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += reduced ? 0 : dt;
    for (const tw of [...tweens]) { tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(tw.e(k)); if (k >= 1) { tweens.delete(tw); tw.res(); } }
    decor.update(dt, time);
    capsule.update(dt, time, still);
    capsule.group.position.x = side * 2.6 * Math.min(1, capsule.group.scale.x); // glisse à sa place pendant l'entrée
    const sway = Math.sin(time * 0.15);
    camera.position.set(sway * 0.8, 2.4, 8.5); camera.lookAt(side * 0.9, 1.45, 0);
    composer.render(dt);
    perf?.end(now);
  });
  // Préchauffage : shaders compilés et deux images rendues avant d'annoncer que la scène est prête
  await renderer.compileAsync(scene, camera);
  for (let i = 0; i < 2; i++) await new Promise((r) => requestAnimationFrame(r));
  window.__menu = { ready: true };
  // La page hôte peut ne pas être encore à l'écoute : on répète jusqu'à son accusé de réception
  if (parent !== window) {
    let acked = false;
    addEventListener("message", (e) => { if (e.source === parent && e.origin === location.origin && e.data?.type === "scene-ack") acked = true; });
    const ping = setInterval(() => (acked ? clearInterval(ping) : parent.postMessage({ type: "scene-ready" }, location.origin)), 300);
    parent.postMessage({ type: "scene-ready" }, location.origin);
  }
}
