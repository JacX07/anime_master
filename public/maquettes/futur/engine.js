// Moteur de la DA cyber futuriste : décor, HUD, son, cinématique UR, ligne de cartes.
// Chaque variante (capsules, noyaux, portail) ne décrit que l'apparition et l'ouverture de ses objets.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { Sound as S, CHARS, RANK, canvasTex, softDot, rng, GLSL_NOISE, cardPainter, vary } from "../opening/core.js";
import THEME from "../opening/themes/futur.js";
import { buildDecor, BLUE, MINT } from "./decor.js";
import { futurAudio } from "./audio.js";

export const MODES = [
  { id: "capsules", name: "Capsules de stase" },
  { id: "noyaux", name: "Noyaux de données" },
  { id: "portail", name: "Portail" },
];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const CARD_W = 1.4, CARD_H = 1.96;
export const FOCUS = new THREE.Vector3(0, 2.05, 5.0);

export async function start(modeId) {
  const mode = (await import(`./${modeId}.js`)).default;
  const T = { ...THEME, ambienceDb: -13 }, RC = T.rarity;
  // Habillage du thème futuriste
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = T.fonts; document.head.append(l);
  document.getElementById("theme-css").textContent = T.css + (mode.css ?? "");
  const txt = { open: "Touche la capsule pour l'ouvrir", reveal: "Clique (ou Espace) pour révéler", done: T.text.done, ur: "Ultra<br />rare", ...mode.text };
  const ui = { booster: document.getElementById("booster"), hint: document.getElementById("hint"), all: document.getElementById("all"), next: document.getElementById("next"),
    flash: document.getElementById("flash"), vignette: document.getElementById("vignette"), ur: document.getElementById("urScreen"), snd: document.getElementById("snd") };
  document.getElementById("urLabel").innerHTML = txt.ur;
  ui.hint.textContent = txt.open; ui.booster.innerHTML = T.booster;

  S.sounds = { ...T.sounds(S), ...futurAudio(S), ...(mode.sounds?.(S) ?? {}) };
  const Sfx = S.sounds;
  ui.snd.addEventListener("click", () => { S.init(T); S.setOn(!S.on); ui.snd.textContent = S.on ? "Son activé" : "Son coupé"; ui.snd.setAttribute("aria-pressed", String(S.on)); });

  // Rendu : tons neutres (les couleurs des cartes restent fidèles), ombres douces, MSAA
  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  // ?test : résolution réduite pour les captures automatiques en rendu logiciel
  const TEST = new URLSearchParams(location.search).has("test");
  renderer.setPixelRatio(TEST ? 0.5 : Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.88;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  const LOOK = new THREE.Vector3(0, 1.45, 0);
  let camDist = 8.5;
  const decor = buildDecor({ scene, renderer });
  const fxLight = new THREE.PointLight("#ffffff", 0, 9, 1.5); scene.add(fxLight);

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: TEST ? 0 : 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.4, 0.4, 1.5);
  composer.addPass(bloom);
  // Étalonnage : couleurs un peu désaturées et hautes lumières retenues, pour un rendu plus feutré
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uSat: { value: 0.8 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat; varying vec2 vUv;
      void main() { vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
        c.rgb = mix(vec3(l), c.rgb, uSat); c.rgb = c.rgb / (1.0 + max(c.rgb - 0.85, 0.0) * 0.6); gl_FragColor = c; }`,
  }));
  composer.addPass(new OutputPass());
  const resize = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); camDist = 8.5 * Math.max(1, 1.55 / camera.aspect); };
  addEventListener("resize", resize); resize();

  // Cartes
  const images = {};
  const painter = cardPainter(T, images);
  const glowTex = canvasTex(512, 640, (g, w, h) => { g.shadowColor = "#fff"; g.shadowBlur = 60; g.fillStyle = "#fff"; g.beginPath(); g.roundRect(130, 140, w - 260, h - 280, 30); g.fill(); g.fill(); });
  const holoTex = canvasTex(512, 512, (g, w, h) => { const hues = ["#ff5fd8", "#ffd84a", "#5ff2c8", "#5fb8ff", "#a77dff"]; g.lineWidth = 7; for (let i = -h; i < w + h; i += 46) { const gr = g.createLinearGradient(i, 0, i + h, h); hues.forEach((c, k) => gr.addColorStop(k / 4, c)); g.strokeStyle = gr; g.globalAlpha = 0.55; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); } });
  holoTex.wrapS = holoTex.wrapT = THREE.RepeatWrapping;
  let backTex = null;
  const scanMat = (map, color) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { map: { value: map }, uProg: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D map; uniform float uProg; uniform vec3 uColor; varying vec2 vUv;
      void main() { vec4 tex = texture2D(map, vUv); float d = vUv.y - (uProg * 1.25 - 0.12);
        if (d > 0.0) { float lines = step(0.5, fract(vUv.y * 150.0)); gl_FragColor = vec4(uColor * 1.8, tex.a * (1.0 - smoothstep(0.0, 0.22, d)) * 0.45 * lines); }
        else { float glow = exp(d * 38.0); gl_FragColor = vec4(tex.rgb + uColor * glow * 2.2, tex.a); } }`,
  });
  function makeCard(c) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);
    const map = painter.drawFront(c);
    const basic = new THREE.MeshBasicMaterial({ map, transparent: true });
    const front = new THREE.Mesh(geo, basic); body.add(front);
    const back = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: backTex, transparent: true })); back.rotation.y = Math.PI; body.add(back);
    let holo = null;
    if (c.holo) { holo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: holoTex.clone(), transparent: true, opacity: 0.28, color: new THREE.Color(0.6, 0.6, 0.6), blending: THREE.AdditiveBlending, depthWrite: false })); holo.position.z = 0.003; holo.material.map.wrapS = holo.material.map.wrapT = THREE.RepeatWrapping; holo.visible = false; body.add(holo); }
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * 2, CARD_H * 1.78), new THREE.MeshBasicMaterial({ map: glowTex, color: RC[c.rarity], transparent: true, opacity: 0, depthWrite: false })); halo.position.z = -0.02; body.add(halo);
    root.userData = { c, body, front, basic, map, holo, halo, hoverK: 0, state: "focus" };
    front.userData.card = root;
    return root;
  }
  async function materialize(card, dur = 0.9) {
    const u = card.userData, mat = scanMat(u.map, RC[u.c.rarity]);
    u.front.material = mat; card.visible = true;
    await tween(dur, (k) => (mat.uniforms.uProg.value = k), (k) => k);
    u.front.material = u.basic; mat.dispose(); if (u.holo) u.holo.visible = true;
  }

  // Animation et effets
  const tweens = new Set();
  const ease = { out: (k) => 1 - Math.pow(1 - k, 3), inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2), back: (k) => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2), in: (k) => k * k * k };
  const tween = (dur, fn, e = ease.out) => new Promise((res) => tweens.add({ t: 0, dur: reduced ? Math.min(dur, 0.15) : dur, fn, e, res }));
  const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const moveTo = (obj, { pos, rotY, scale }, dur, e) => { const p0 = obj.position.clone(), r0 = obj.rotation.y, s0 = obj.scale.x; return tween(dur, (k) => { if (pos) obj.position.lerpVectors(p0, pos, k); if (rotY !== undefined) obj.rotation.y = r0 + (rotY - r0) * k; if (scale !== undefined) obj.scale.setScalar(s0 + (scale - s0) * k); }, e); };
  const bursts = new Set();
  function burst(pos, colors, { n = 200, speed = 3, size = 0.07, gravity = 0.4, life = 1.6, rise = 0, tex = softDot, additive = false } = {}) {
    const p = new Float32Array(n * 3), v = new Float32Array(n * 3), col = new Float32Array(n * 3), tmp = new THREE.Color();
    for (let i = 0; i < n; i++) { p.set([pos.x, pos.y, pos.z], i * 3); const d = new THREE.Vector3().randomDirection().multiplyScalar(speed * (0.3 + Math.random())); d.y += rise; v.set([d.x, d.y, d.z], i * 3); tmp.set(colors[i % colors.length]); col.set([tmp.r, tmp.g, tmp.b], i * 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(p, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    scene.add(pts); bursts.add({ pts, v, life: 0, max: life, gravity });
  }
  const fxPulse = (color, intensity, pos = FOCUS) => { fxLight.color.set(color); fxLight.intensity = intensity; fxLight.position.set(pos.x, pos.y + 0.3, pos.z + 0.8); };
  let stopUntil = 0, punch = 0;
  const hitStop = (s) => { if (!reduced) stopUntil = performance.now() + s * 1000; };
  const zoomPunch = (a) => { if (!reduced) punch = Math.max(punch, a); };
  const flash = () => { if (reduced) return; ui.flash.classList.remove("go"); void ui.flash.offsetWidth; ui.flash.classList.add("go"); };
  const TIER = { N: [0, 0], R: [0, 0.15], SR: [0.05, 0.35], SSR: [0.12, 1], UR: [0.16, 1.3] };

  // Moments clés partagés par les variantes
  async function charge(c, onK) {
    if (c.rarity !== "UR") { await tween(0.3, (k) => onK?.(k * 0.3), ease.in); return; }
    Sfx.urCharge(); ui.vignette.classList.add("on"); decor.setSpin(4);
    await tween(1.2, (k) => { onK?.(k); fxPulse(RC.UR, 30 * k); });
  }
  async function impact(c, pos) {
    const [stop, zoom] = TIER[c.rarity];
    Sfx.flip(c.rarity); hitStop(stop); zoomPunch(zoom);
    if (c.rarity === "UR") {
      S.duck(-24, 4.2); await urCinematic(c); ui.vignette.classList.remove("on"); decor.setSpin(1);
      burst(pos, [RC.UR, BLUE, "#f2a516", "#ffffff"], { n: 420, speed: 4.5 }); fxPulse(RC.UR, 25, pos);
    } else if (c.rarity === "SSR") {
      Sfx.ssr(); S.duck(-14, 1.6); flash();
      burst(pos, ["#f2a516", "#ffd36b", "#ffffff"], { n: 360, speed: 4 }); fxPulse(RC.SSR, 35, pos);
    } else {
      fxPulse(RC[c.rarity], 6 + RANK[c.rarity] * 7, pos);
      if (RANK[c.rarity] >= 1) burst(pos, [RC[c.rarity], "#ffffff"], { n: 60 + RANK[c.rarity] * 70, speed: 2.2 });
    }
  }
  function urCinematic(c) {
    return new Promise((resolve) => {
      document.getElementById("urImg").src = c.img; document.getElementById("urName").textContent = c.name;
      document.getElementById("urSeries").textContent = `${c.type} · ${c.series}`; document.getElementById("urSerial").textContent = `Exemplaire #${c.serial}`;
      const el = ui.ur; el.querySelectorAll(".star").forEach((s) => s.remove());
      for (let i = 0; i < 30; i++) { const s = document.createElement("span"); s.className = "star"; s.textContent = T.urStar; s.style.left = Math.random() * 100 + "%"; s.style.top = Math.random() * 100 + "%"; s.style.fontSize = 8 + Math.random() * 22 + "px"; s.style.animationDelay = Math.random() * 1.6 + "s"; el.appendChild(s); }
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

  const ctx = { THREE, scene, camera, renderer, decor, S, Sfx, RC, RANK, canvasTex, softDot, rng, GLSL_NOISE, vary, reduced, BLUE, MINT,
    tween, wait, ease, moveTo, burst, fxPulse, hitStop, zoomPunch, flash, makeCard, materialize, charge, impact, FOCUS, CARD_W, CARD_H,
    setHint: (t) => (ui.hint.textContent = t) };

  // Déroulé
  let modeReady = false, busy = false, phase = "idle", count = 9, items = [], line = [];
  const bar = (id, n, on) => (document.getElementById(id).innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < on ? "on" : ""}"></i>`).join(""));
  const stock = () => { bar("stock", 10, count); document.getElementById("count").textContent = count; };
  bar("ssr", 15, 9); bar("ur", 15, 4); stock();
  const linePos = (i) => new THREE.Vector3((i - 2) * 1.35, 0.85, 3.2);

  async function openBooster() {
    if (busy || phase !== "idle") return;
    S.init(T); busy = true; Sfx.tear();
    ui.booster.classList.add("tear"); count = Math.max(0, count - 1); stock();
    await wait(0.45);
    ui.booster.blur(); ui.booster.hidden = true; ui.booster.classList.remove("tear");
    line.forEach((c) => scene.remove(c)); line = [];
    items = await mode.open(ctx, [...CHARS].sort(() => Math.random() - 0.5));
    while (items.some((i) => i.state === "spawn")) await wait(0.05);
    phase = "ready"; busy = false; S.music?.setLevel(1);
    ui.hint.textContent = txt.reveal; ui.all.hidden = false;
  }
  async function reveal(item, quick = false) {
    if (busy || phase !== "ready" || item.state !== "ready") return;
    busy = true; item.state = "opening"; S.music?.setLevel(2);
    const card = await mode.reveal(ctx, item, quick);
    item.state = "done";
    await wait(quick ? 0.5 : 1.0);
    const slot = line.length; line.push(card);
    card.userData.state = "moving";
    await moveTo(card, { pos: linePos(slot), rotY: 0, scale: 0.62 }, 0.6, ease.inOut);
    card.userData.state = "line"; card.userData.landT = 0; Sfx.settle(); S.music?.setLevel(1);
    busy = false;
    mode.afterReveal?.(ctx, items);
    if (line.length === items.length) finish();
  }
  async function finish() {
    phase = "done"; ui.all.hidden = true; S.music?.setLevel(0);
    await Promise.all(line.map((card, i) => moveTo(card, { pos: new THREE.Vector3((i - 2) * 1.45, 1.45, 3.2), scale: 0.74 }, 0.7, ease.back)));
    ui.hint.textContent = txt.done; ui.next.hidden = count === 0;
    if (!ui.next.hidden) ui.next.focus({ preventScroll: true });
  }
  async function revealAll() {
    if (phase !== "ready") return;
    ui.all.hidden = true;
    for (;;) { while (busy) await wait(0.1); const it = mode.nextItem(items); if (!it) break; await reveal(it, true); }
  }
  ui.booster.addEventListener("click", openBooster);
  ui.all.addEventListener("click", revealAll);
  ui.next.addEventListener("click", async () => {
    ui.next.hidden = true;
    await Promise.all(line.map((card) => moveTo(card, { pos: card.position.clone().add(new THREE.Vector3(0, -1.2, -1)), scale: 0.01 }, 0.4, ease.inOut)));
    line.forEach((c) => scene.remove(c)); line = [];
    mode.clear?.(ctx); items = [];
    phase = "idle"; ui.booster.hidden = false; ui.hint.textContent = txt.open; ui.booster.focus({ preventScroll: true });
  });

  // Pointeur et clavier
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(-9, -9), mouseSmooth = new THREE.Vector2();
  let hoverItem = null, hoverCard = null;
  const pick = () => {
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects([...mode.pickables(items), ...line.map((c) => c.userData.front)], false);
    for (const h of hits) { if (h.object.userData.card) return { card: h.object.userData.card }; if (h.object.userData.item) return { item: h.object.userData.item }; }
    return {};
  };
  canvas.addEventListener("pointermove", (e) => {
    mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    const p = pick(), it = p.item && p.item.state === "ready" && phase === "ready" ? p.item : null, cd = p.card?.userData.state === "line" ? p.card : null;
    if ((it && it !== hoverItem) || (cd && cd !== hoverCard)) Sfx.hover();
    hoverItem = it; hoverCard = cd;
    canvas.style.cursor = it && !busy ? "pointer" : "default";
  });
  canvas.addEventListener("click", () => { const p = pick(); if (p.item) reveal(p.item); });
  addEventListener("keydown", (e) => {
    if (!["Enter", " "].includes(e.key) || e.target.closest?.("button, a") || phase !== "ready" || busy) return;
    const it = mode.nextItem(items, camera); if (it) { e.preventDefault(); reveal(it); }
  });

  // Boucle
  let last = performance.now(), time = 0;
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    const sdt = now < stopUntil ? dt * 0.04 : dt;
    for (const tw of [...tweens]) { tw.t += sdt; const k = Math.min(1, tw.t / tw.dur); tw.fn(tw.e(k)); if (k >= 1) { tweens.delete(tw); tw.res(); } }
    decor.update(sdt, time);
    if (modeReady) mode.update?.(ctx, items, sdt, time, hoverItem);
    for (const b of [...bursts]) {
      b.life += sdt; const a = b.pts.geometry.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) { a[i] += b.v[i] * sdt; a[i + 1] += b.v[i + 1] * sdt; a[i + 2] += b.v[i + 2] * sdt; b.v[i + 1] -= b.gravity * sdt; b.v[i] *= 0.98; b.v[i + 2] *= 0.98; }
      b.pts.geometry.attributes.position.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.life / b.max);
      if (b.life > b.max) { scene.remove(b.pts); b.pts.geometry.dispose(); bursts.delete(b); }
    }
    fxLight.intensity *= Math.pow(0.08, dt);
    for (const card of line) {
      const u = card.userData; u.hoverK += ((card === hoverCard ? 1 : 0) - u.hoverK) * Math.min(1, dt * 10);
      if (u.state === "line") {
        u.body.scale.setScalar(1 + u.hoverK * 0.12);
        if (u.landT !== undefined && u.landT < 0.6) { u.landT += sdt; const sq = 0.16 * Math.exp(-u.landT * 9) * Math.cos(u.landT * 26); u.body.scale.x *= 1 + sq; u.body.scale.y *= 1 - sq * 0.7; }
        u.body.position.y = u.hoverK * 0.25; u.body.rotation.x = u.hoverK * -mouse.y * 0.25; u.body.rotation.y = u.hoverK * mouse.x * 0.35;
        u.halo.material.opacity = 0.12 + u.hoverK * 0.5;
      }
      if (u.holo) u.holo.material.map.offset.set(time * 0.15 + mouse.x * 0.3, mouse.y * 0.3);
    }
    mouseSmooth.lerp(mouse.x < -5 ? new THREE.Vector2() : mouse, Math.min(1, dt * 3));
    punch *= Math.pow(0.015, dt); camera.fov = 45 - punch * 3.5; camera.updateProjectionMatrix();
    camera.position.set(mouseSmooth.x * 0.5, 2.5 + mouseSmooth.y * 0.25, camDist); camera.lookAt(LOOK);
    composer.render(dt);
  });

  ui.booster.disabled = true;
  await Promise.all([...CHARS.map(async (c) => (images[c.img] = await painter.loadImg(c.img))), document.fonts.load('400 44px "Michroma"'), document.fonts.load('400 26px "Sora"')]);
  backTex = painter.makeBack();
  mode.init?.(ctx); modeReady = true;
  ui.booster.disabled = false;
  // Accès en lecture pour les tests automatisés de la maquette
  window.__scene = { three: { scene, camera }, get phase() { return phase === "ready" ? "ring" : phase; }, get busy() { return busy; }, get states() { return items.map((i) => (i.state === "ready" ? "ring" : i.state)); }, get ur() { return !ui.ur.hidden; } };
}
