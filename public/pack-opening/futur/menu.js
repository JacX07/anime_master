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

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TEST = new URLSearchParams(location.search).has("test");

export async function start() {
  // Polices du dos de carte (Michroma / Sora), chargées avant de le peindre
  const link = document.createElement("link"); link.rel = "stylesheet"; link.href = THEME.fonts; document.head.append(link);
  await Promise.all([document.fonts.load('400 44px "Michroma"'), document.fonts.load('400 26px "Sora"')]);

  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(TEST ? 0.5 : Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.7;
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  const decor = buildDecor({ scene, renderer });

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: TEST ? 0 : 4 }));
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.4, 0.4, 1.5));
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

  const still = new THREE.Vector2();
  let last = performance.now(), time = 0;
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += reduced ? 0 : dt;
    for (const tw of [...tweens]) { tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(tw.e(k)); if (k >= 1) { tweens.delete(tw); tw.res(); } }
    decor.update(dt, time);
    capsule.update(dt, time, still);
    capsule.group.position.x = side * 2.6 * Math.min(1, capsule.group.scale.x); // glisse à sa place pendant l'entrée
    const sway = Math.sin(time * 0.15);
    camera.position.set(sway * 0.8, 2.4, 8.5); camera.lookAt(side * 0.9, 1.45, 0);
    composer.render(dt);
  });
  window.__menu = { ready: true };
}
