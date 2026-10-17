// Moteur de la DA cyber futuriste : décor, HUD, son, cinématique UR, ligne de cartes.
// La variante retenue (noyaux de données) décrit l'apparition et l'ouverture des objets ; le moteur gère le reste.
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
import { buildCapsule } from "./capsule.js";
import { buildBreche } from "./breche.js";
import { createReveals } from "./reveals.js";
import { createPerf } from "./perf.js";
import { icon, installSprite, loadIcons } from "../opening/icons.js";

export const MODES = [
  { id: "noyaux", name: "Noyaux de données" },
];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const PERF = new URLSearchParams(location.search).has("perf");
// ?lite : décor, reflets, halo et ombres coupés (fond uni) pour visualiser une fonctionnalité vite ; window.__scene.demoBulk(n, ["UR","SSR",…]) joue un lot sans serveur
const LAB = new URLSearchParams(location.search).has("lab"); // ?lab : maquettes des animations SSR / UR (reveals.js), implique ?lite
const LITE = LAB || new URLSearchParams(location.search).has("lite");
// Intégré dans /packs (?embed) : la page hôte détient la session et appelle le serveur ; on lui parle par postMessage.
// Hors iframe, la maquette tourne seule avec des cartes d'exemple.
const EMBED = new URLSearchParams(location.search).has("embed") && parent !== window;
const post = (msg) => parent.postMessage(msg, location.origin);
const CARD_W = 1.4, CARD_H = 1.96;
export const FOCUS = new THREE.Vector3(0, 2.05, 5.0);

export async function start(modeId) {
  const mode = (await import(`./${modeId}.js`)).default;
  await loadIcons(); installSprite(); // icônes du HUD et des cartes (même jeu que le site)
  const T = { ...THEME, ambienceDb: -13 }, RC = T.rarity;
  // Habillage du thème futuriste
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = T.fonts; document.head.append(l);
  document.getElementById("theme-css").textContent = T.css + (mode.css ?? "");
  const txt = { open: "Touche la capsule pour l'ouvrir", reveal: "Clique (ou Espace) pour révéler", done: T.text.done, ur: "Ultra<br />rare", ...mode.text };
  const ui = { booster: document.getElementById("booster"), hint: document.getElementById("hint"), all: document.getElementById("all"), next: document.getElementById("next"),
    flash: document.getElementById("flash"), vignette: document.getElementById("vignette"), ur: document.getElementById("urScreen"), snd: document.getElementById("snd") };
  txt.done = "Clique une carte pour la ranger dans l'album, sinon elles partent toutes seules";
  txt.stored = "Cartes rangées dans l'album";
  txt.empty = "Il te faut 5 cristaux pour ouvrir le booster, le prochain arrive bientôt";
  document.getElementById("urLabel").innerHTML = txt.ur;
  // La capsule est un objet 3D : le bouton ne sert plus qu'à l'accessibilité clavier (invisible, ne capte pas la souris)
  ui.hint.textContent = txt.open; ui.booster.innerHTML = ""; ui.booster.style.cssText = "opacity:0;pointer-events:none;animation:none";
  const albumEl = document.getElementById("albumLink"), albumBadge = document.getElementById("albumBadge");
  let capsule = null, breche = null, stored = 0;
  // Stock et pity : fournis par le serveur (init / réponse d'ouverture), valeurs d'exemple hors iframe
  let cfg = { interval: 600000, max: 10, ssrPity: 15, urPity: 100 };
  let pack = { available: 45, nextCrystalAt: null, cardsSinceSSR: 45, cardsSinceUR: 20, collectionPower: 123456, balance: 650, crystalPrice: 20, crystalsLeft: 25, specialCrystals: 0, welcomeDraws: 0, welcomeBannerId: null }, hostAlbum = null, banners = [], bannerId = "";
  const liveStock = () => {
    const next = pack.nextCrystalAt ? new Date(pack.nextCrystalAt).getTime() : null, now = Date.now();
    if (next === null || now < next) return { available: pack.available, msLeft: next === null ? null : next - now };
    const gained = 1 + Math.floor((now - next) / cfg.interval), available = Math.min(cfg.max, pack.available + gained);
    return { available, msLeft: available >= cfg.max ? null : next + gained * cfg.interval - now };
  };
  const mmss = (ms) => { const t = Math.ceil(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };

  S.sounds = { ...T.sounds(S), ...futurAudio(S), ...(mode.sounds?.(S) ?? {}) };
  const Sfx = S.sounds;
  ui.snd.addEventListener("click", () => { S.init(T); S.setOn(!S.on); ui.snd.textContent = S.on ? "Son activé" : "Son coupé"; ui.snd.setAttribute("aria-pressed", String(S.on)); });

  // Rendu : tons neutres (les couleurs des cartes restent fidèles), ombres douces, MSAA
  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" }); // l'anticrénelage est fait dans la cible du compositeur (samples 2) : celui du canevas serait payé pour rien
  // ?test : résolution réduite pour les captures automatiques en rendu logiciel
  const TEST = new URLSearchParams(location.search).has("test");
  renderer.setPixelRatio(TEST ? 0.5 : Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.7;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoft n'existe plus en r186 (three retombait dessus avec un avertissement)
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  const LOOK = new THREE.Vector3(0, 1.45, 0);
  let camDist = 8.5;
  const decor = buildDecor({ scene, renderer });
  const decorKids = [...scene.children];
  const fxLight = new THREE.PointLight("#ffffff", 0, 9, 1.5); scene.add(fxLight);

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: TEST ? 0 : 2 }));
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
  const reflectMat = (map) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { map: { value: map }, uOpacity: { value: 0.25 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D map; uniform float uOpacity; varying vec2 vUv;
      void main() { vec4 t = texture2D(map, vUv); gl_FragColor = vec4(t.rgb, t.a * uOpacity * clamp(1.0 - vUv.y * 1.7, 0.0, 1.0)); }`,
  });
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
    // Reflet au sol : copie retournée sous la carte, qui s'estompe vers le bas (affichée une fois la carte matérialisée)
    const reflection = new THREE.Mesh(geo, reflectMat(map)); reflection.scale.y = -1; reflection.position.y = -CARD_H - 0.1; reflection.visible = false; body.add(reflection);
    const back = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: backTex, transparent: true })); back.rotation.y = Math.PI; body.add(back);
    let holo = null;
    if (c.holo) { holo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: holoTex.clone(), transparent: true, opacity: 0.28, color: c.finish === "GOLD" ? new THREE.Color(0.85, 0.62, 0.1) : new THREE.Color(0.6, 0.6, 0.6), blending: THREE.AdditiveBlending, depthWrite: false })); holo.position.z = 0.003; holo.material.map.wrapS = holo.material.map.wrapT = THREE.RepeatWrapping; holo.visible = false; body.add(holo); }
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * 2, CARD_H * 1.78), new THREE.MeshBasicMaterial({ map: glowTex, color: RC[c.rarity], transparent: true, opacity: 0, depthWrite: false })); halo.position.z = -0.02; body.add(halo);
    root.userData = { c, body, front, basic, map, holo, halo, reflection, hoverK: 0, state: "focus" };
    front.userData.card = root;
    return root;
  }
  async function materialize(card, dur = 0.9) {
    const u = card.userData, mat = scanMat(u.map, RC[u.c.rarity]);
    u.front.material = mat; card.visible = true;
    await tween(dur, (k) => (mat.uniforms.uProg.value = k), (k) => k);
    u.front.material = u.basic; mat.dispose(); if (u.holo) u.holo.visible = true; u.reflection.visible = true;
  }

  // Animation et effets
  const tweens = new Set();
  const ease = { out: (k) => 1 - Math.pow(1 - k, 3), inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2), back: (k) => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2), in: (k) => k * k * k };
  // Saut d'animation : les interpolations en cours se terminent aussitôt et les attentes sont levées
  let skip = false; const waiters = new Set();
  const tween = (dur, fn, e = ease.out) => new Promise((res) => tweens.add({ t: 0, dur: skip ? 0.001 : reduced ? Math.min(dur, 0.15) : dur, fn, e, res }));
  const wait = (s) => new Promise((r) => {
    if (skip) return requestAnimationFrame(() => r()); // une image d'attente : sinon les boucles « while (…) await wait() » gèleraient la page
    const done = () => { clearTimeout(id); waiters.delete(done); r(); }, id = setTimeout(done, s * 1000); waiters.add(done);
  });
  const moveTo = (obj, { pos, rotY, scale }, dur, e) => { const p0 = obj.position.clone(), r0 = obj.rotation.y, s0 = obj.scale.x; return tween(dur, (k) => { if (pos) obj.position.lerpVectors(p0, pos, k); if (rotY !== undefined) obj.rotation.y = r0 + (rotY - r0) * k; if (scale !== undefined) obj.scale.setScalar(s0 + (scale - s0) * k); }, e); };
  const bursts = new Set();
  // Les gerbes mortes sont gardées et réutilisées (même nombre de particules, même texture) : les étincelles des cartes rangées
  // en lançaient une dizaine par seconde, chacune avec sa géométrie et son matériau neufs à envoyer au GPU
  const burstPool = new Map();
  const tmpCol = new THREE.Color(), tmpDir = new THREE.Vector3();
  function burst(pos, colors, { n = 200, speed = 3, size = 0.07, gravity = 0.4, life = 1.6, rise = 0, tex = softDot, additive = false } = {}) {
    const key = `${n}|${tex.uuid}|${additive}`;
    let b = burstPool.get(key)?.pop();
    if (!b) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
      pts.frustumCulled = false; // les particules s'éloignent de leur boîte d'origine
      b = { pts, v: new Float32Array(n * 3), key };
    }
    const p = b.pts.geometry.attributes.position, col = b.pts.geometry.attributes.color;
    for (let i = 0; i < n; i++) {
      p.setXYZ(i, pos.x, pos.y, pos.z);
      tmpDir.randomDirection().multiplyScalar(speed * (0.3 + Math.random())); b.v[i * 3] = tmpDir.x; b.v[i * 3 + 1] = tmpDir.y + rise; b.v[i * 3 + 2] = tmpDir.z;
      tmpCol.set(colors[i % colors.length]); col.setXYZ(i, tmpCol.r, tmpCol.g, tmpCol.b);
    }
    p.needsUpdate = col.needsUpdate = true;
    b.pts.material.size = size; b.pts.material.opacity = 1; b.life = 0; b.max = life; b.gravity = gravity;
    scene.add(b.pts); bursts.add(b);
  }
  const retire = (b) => { scene.remove(b.pts); bursts.delete(b); if (!burstPool.has(b.key)) burstPool.set(b.key, []); burstPool.get(b.key).push(b); };
  const fxPulse = (color, intensity, pos = FOCUS) => { fxLight.color.set(color); fxLight.intensity = intensity; fxLight.position.set(pos.x, pos.y + 0.3, pos.z + 0.8); };
  let stopUntil = 0, punch = 0;
  const hitStop = (s) => { if (!reduced && !skip) stopUntil = performance.now() + s * 1000; };
  const requestSkip = () => { if (skip) return; skip = true; stopUntil = 0; for (const tw of tweens) tw.dur = 0.001; [...waiters].forEach((f) => f()); };
  const zoomPunch = (a) => { if (!reduced) punch = Math.max(punch, a); };
  const flash = () => { if (reduced) return; ui.flash.classList.remove("go"); void ui.flash.offsetWidth; ui.flash.classList.add("go"); };
  const HALO = { N: 0, R: 0.4, SR: 0.6, SSR: 0.85, UR: 1 }; // lueur permanente des cartes rangées en ligne : la rareté se voit de loin
  const TIER = { N: [0, 0], R: [0, 0.15], SR: [0.05, 0.35], SSR: [0.12, 1], UR: [0.16, 1.3] };

  // Moments clés partagés par les variantes
  async function charge(c, onK) {
    if (c.rarity !== "UR") { await tween(0.15, (k) => onK?.(k * 0.3), ease.in); return; }
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

  // « Théâtre » : pour les révélations SSR / UR, le décor s'efface (fondu au noir) afin que les lueurs ressortent
  const theatreEl = document.createElement("div"); theatreEl.style.cssText = "position:fixed;inset:0;background:#05070d;opacity:0;pointer-events:none;transition:opacity .35s"; canvas.after(theatreEl);
  const hiddenByTheatre = [];
  ctx.theatre = async (on) => {
    if (LITE || on === (hiddenByTheatre.length > 0)) return;
    theatreEl.style.opacity = "1"; await wait(0.4);
    if (on) { decorKids.forEach((o) => { if (!o.isLight && o.visible) { o.visible = false; hiddenByTheatre.push(o); } }); scene.background = new THREE.Color("#070a14"); }
    else { hiddenByTheatre.splice(0).forEach((o) => (o.visible = true)); scene.background = null; }
    theatreEl.style.opacity = "0";
  };
  const reveals = createReveals(ctx, { loadCard: async (c) => { images[c.img] ??= await painter.loadImg(c.img); return c; } });
  ctx.reveals = reveals;

  // Déroulé
  let modeReady = false, busy = false, phase = "idle", items = [], line = [], autoTimer = 0, capsuleHover = false;
  const bar = (id, n, on) => (document.getElementById(id).innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < on ? "on" : ""}"></i>`).join(""));
  const el = (id) => document.getElementById(id);
  // Bannières : le coût se paie en cristaux normaux, spéciaux ou en tirages de bienvenue
  const currentBanner = () => banners.find((b) => b.id === bannerId) ?? null;
  const budgetOf = (b) => (b?.costKind === "SPECIAL" ? pack.specialCrystals : b?.costKind === "WELCOME" ? pack.welcomeDraws : liveStock().available);
  const unitOf = (b) => (b?.costKind === "SPECIAL" ? "cristaux spéciaux" : b?.costKind === "WELCOME" ? "tirages de bienvenue" : "cristaux");
  const visibleBanners = () => banners.filter((b) => b.costKind !== "WELCOME" || (pack.welcomeDraws > 0 && (!pack.welcomeBannerId || pack.welcomeBannerId === b.id)));
  const CAT_ICON = { sport: "t-combat", shonen: "t-aventure", isekai: "t-magie", waifu: "t-coeur", husbando: "t-mystere" };
  const CAT_COLOR = { sport: "#2fbf71", shonen: "#ff7a2f", isekai: "#7a5cff", waifu: "#ff5fa8", husbando: "#2b9bff" };
  const leftLabel = (b) => { const ms = new Date(b.endsAt) - Date.now(), d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5); return d >= 1 ? `${d} j restant${d > 1 ? "s" : ""}` : `${Math.max(1, h)} h restante${h > 1 ? "s" : ""}`; };
  function syncBanners() {
    const box = el("bannerBox"), vis = visibleBanners();
    box.hidden = vis.length === 0;
    const calm = !busy && !bulking && (phase === "idle" || phase === "stored");
    box.toggleAttribute("data-dim", !calm); el("gate").toggleAttribute("data-dim", !calm);
    if (!vis.some((b) => b.id === bannerId)) bannerId = vis.find((b) => b.costKind === "WELCOME")?.id ?? "";
    const entries = [{ id: "", name: "Standard", sub: `${liveStock().available} cristaux`, color: "#7f9fff", icon: "paquet", tag: "Tous les persos", title: "Tirage dans tous les personnages." },
      ...vis.map((b) => ({ id: b.id, name: b.name, color: CAT_COLOR[b.category] ?? "#7f9fff", icon: b.costKind === "WELCOME" ? "bonus" : b.costKind === "SPECIAL" ? "r-SSR" : CAT_ICON[b.category] ?? "paquet",
        tag: b.costKind === "SPECIAL" ? "✦ Spécial" : b.costKind === "WELCOME" ? "Bienvenue" : "Semaine",
        sub: `${budgetOf(b)} ${b.costKind === "SPECIAL" ? "spéciaux" : b.costKind === "WELCOME" ? "tirages" : "cristaux"}${b.endsAt ? " · " + leftLabel(b) : ""}`,
        title: `${b.description} ${b.weightPercent} % des cartes viennent de cette bannière ; les taux de rareté ne changent pas.` }))];
    const key = entries.map((e) => e.id + e.sub).join("|") + "#" + bannerId;
    if (box.dataset.key === key) return;
    box.dataset.key = key;
    box.innerHTML = entries.map((e) => `<button class="bn" type="button" role="radio" aria-checked="${e.id === bannerId}" data-id="${e.id}" style="--c:${e.color}" title="${e.title.replace(/"/g, "&quot;")}"><span class="ic">${icon(e.icon, "--acc:currentColor")}</span><b>${e.name}</b><small>${e.sub}</small><span class="tag">${e.tag}</span></button>`).join("");
  }
  el("bannerBox").addEventListener("click", (e) => { const b = e.target.closest(".bn"); if (!b) return; bannerId = b.dataset.id; hud(); });
  function hud() {
    syncBanners();
    const { available, msLeft } = liveStock();
    const budget = budgetOf(currentBanner());
    bar("stock", cfg.max, Math.min(available, cfg.max)); el("count").textContent = available;
    el("maxPacks").textContent = available > cfg.max ? " cristaux" : ` / ${cfg.max} cristaux`; // au-delà de la réserve : cristaux achetés
    // Boutique : le message d'erreur d'un achat reste affiché quelques secondes, puis les conditions reprennent la main
    const free = !busy && (phase === "idle" || phase === "stored");
    for (const n of [5, 10]) el("bulk" + n).disabled = bulking || !free || budget < n;
    // Pourquoi les boutons sont grisés (affiché sous eux et en infobulle)
    const b = currentBanner();
    const why = bulking ? "Ouverture en cours…"
      : !free ? "Termine l'ouverture en cours : révèle les cartes (clic ou « Tout révéler »)."
      : budget < 5 ? `Il te faut 5 ${unitOf(b)} pour ouvrir (tu en as ${budget}).${b ? " Change de bannière ou choisis « Standard »." : ""}`
      : budget < 10 ? `Il te faut 10 ${unitOf(b)} pour le ×10 (tu en as ${budget}).` : "";
    el("bulkWhy").textContent = why; el("bulkWhy").hidden = !why;
    for (const n of [5, 10]) el("bulk" + n).title = budget >= n && !why ? `Tire ${n} cartes d'un coup` : why;
    el("buy").disabled = buying || pack.crystalsLeft < 5 || pack.balance < pack.crystalPrice * 5;
    if (!buyMsg) el("buyInfo").innerHTML = `${pack.crystalPrice * 5}${icon("ryo", "--acc:#f2a516")} les 5 · ${pack.crystalsLeft} cristal${pack.crystalsLeft > 1 ? "ux" : ""} achetable${pack.crystalsLeft > 1 ? "s" : ""} aujourd'hui · solde ${pack.balance.toLocaleString("fr-FR")}${icon("ryo", "--acc:#f2a516")}`;
    el("nextIn").textContent = msLeft === null ? "Stock plein" : `Prochain cristal dans ${mmss(msLeft)}`;
    el("totalPower").innerHTML = `${icon("puissance", "--acc:currentColor")}${(pack.collectionPower ?? 0).toLocaleString("fr-FR")}`;
    el("ssrLeft").textContent = cfg.ssrPity - pack.cardsSinceSSR; el("urLeft").textContent = cfg.urPity - pack.cardsSinceUR;
    bar("ssr", 15, Math.round((15 * pack.cardsSinceSSR) / cfg.ssrPity)); bar("ur", 15, Math.round((15 * pack.cardsSinceUR) / cfg.urPity));
  }
  const setPack = (state) => { pack = state; hud(); };
  let buying = false, buyMsg = "";
  el("buy").addEventListener("click", async () => {
    if (buying) return;
    buying = true; hud();
    const res = await requestBuy();
    buying = false;
    if (res.ok) setPack(res.state);
    else { buyMsg = res.error; el("buyInfo").textContent = buyMsg; hud(); setTimeout(() => { buyMsg = ""; hud(); }, 4000); }
    hud();
  });
  // Ouverture groupée : sans animation, la page hôte affiche le résumé des cartes
  let bulking = false;
  document.querySelector(".bulk-row").toggleAttribute("data-embed", EMBED); // hors page hôte il n'y a personne pour afficher le résumé
  let bulkReply = null;
  for (const n of [5, 10]) el("bulk" + n).addEventListener("click", () => {
    if (!EMBED || bulking || busy || (phase !== "idle" && phase !== "stored") || budgetOf(currentBanner()) < n) return;
    if (phase === "stored") backToIdle();
    bulking = true; S.init(T); ui.booster.blur(); ui.booster.hidden = true; capsuleHover = false; ui.hint.textContent = `Ouverture de ${n} cartes…`; hud();
    const reply = new Promise((resolve) => { bulkReply = resolve; setTimeout(() => resolve({ ok: false, error: "Le serveur ne répond pas, réessaie." }), 20000); });
    post({ type: "bulk-request", count: n, bannerId: bannerId || null });
    bulkAnimation(n, reply);
  });
  // La capsule s'ouvre pendant que le serveur tire les cartes ; le ×10 double l'explosion, teintée par la meilleure rareté.
  // Les cartes éclosent ensuite une à une (la plus rare en dernier), puis filent vers l'album comme pour une ouverture normale.
  let bulkMode = false;
  async function bulkAnimation(n, reply) {
    let m = { ok: false, error: "L'ouverture a échoué." };
    try {
      Sfx.tear();
      const opening = capsule.open(ctx);
      [m] = await Promise.all([reply, opening]);
      if (m.ok) {
        if (m.state) setPack(m.state); // stock, pity et puissance à jour dès le tirage
        const best = m.best ?? "N", color = RC[best] ?? BLUE, rank = RANK[best] ?? 0, at = new THREE.Vector3(0, 1.5, 2.6);
        Sfx.flip(best); zoomPunch(0.1 + rank * 0.05);
        burst(at, [color, "#ffffff", BLUE], { n: 200 + rank * 70, speed: 3.6, additive: true }); fxPulse(color, 12 + rank * 6, at);
        if (best === "SSR" || best === "UR") { Sfx.ssr(); flash(); }
        if (n === 10) { await wait(0.22); Sfx.flip(best); burst(at, [color, "#ffffff", MINT], { n: 260, speed: 4.4, additive: true }); fxPulse(color, 18, at); zoomPunch(0.2); }
        await wait(0.3);
        await popCards(n, m.cards);
        return; // la suite (résumé, retour à la capsule) se joue quand les cartes sont rangées : checkStored()
      }
    } catch (err) {
      console.error("Animation de l'ouverture groupée interrompue :", err);
      if (!m.error) m = { ok: false, error: "L'animation a échoué : les cartes sont dans ton album." };
      if (m.ok) { endBulk(true); return; }
    }
    endBulk(false);
    ui.hint.textContent = m.error ?? "L'ouverture a échoué."; setTimeout(() => phase === "idle" && !busy && (ui.hint.textContent = txt.open), 3500);
  }
  function endBulk(ok) {
    bulkMode = false; bulkReply = null; bulking = false; busy = false; skip = false;
    line.forEach(dropCard); line = []; clearTimeout(autoTimer);
    if (ok) post({ type: "bulk-reveal" });
    backToIdle(); hud();
  }
  async function popCards(n, cards) {
    await Promise.all(cards.map(async (c) => { images[c.img] ??= await painter.loadImg(c.img); }));
    line.forEach(dropCard); line = [];
    busy = true; skip = false; bulkMode = true; phase = "popping"; hud();
    const small = n > 5, sc = small ? 0.6 : 0.7, dx = 1.04, shift = -0.83, rows = small ? [2.15, 0.8] : [1.45]; // décalé à gauche : le panneau de droite masque le reste
    const order = [...cards].sort((a, b) => (RANK[a.rarity] ?? 0) - (RANK[b.rarity] ?? 0));
    const pops = [];
    for (let i = 0; i < order.length; i++) {
      const c = order[i], row = Math.floor(i / 5), inRow = Math.min(5, order.length - row * 5), rank = RANK[c.rarity] ?? 0;
      const pos = new THREE.Vector3((i % 5 - (inRow - 1) / 2) * dx + shift, rows[row] ?? rows[0], 3.2);
      const card = makeCard(c); card.position.copy(pos).add(new THREE.Vector3(0, 0.5, 0)); card.scale.setScalar(sc * 0.3); card.visible = false; card.userData.state = "moving";
      scene.add(card); line.push(card);
      if (rank >= 3) { // SSR : sceau doré ; UR : convergence. La carte est révélée au centre, puis rejoint sa place.
        await reveals.run(rank === 4 ? "urB" : "ssrC", c, card);
        pops.push(moveTo(card, { pos, scale: sc }, 0.7, ease.inOut).then(() => { card.userData.state = "line"; card.userData.landT = 0; }));
        await wait(0.6);
        continue;
      }
      Sfx.flip(c.rarity); fxPulse(RC[c.rarity], 5 + rank * 5, pos);
      burst(pos, [RC[c.rarity], "#ffffff"], { n: 50 + rank * 60, speed: 2.1 + rank * 0.3, additive: true });
      pops.push(Promise.all([materialize(card, 0.95), moveTo(card, { pos, scale: sc }, 0.65, ease.back)]).then(() => { card.userData.state = "line"; card.userData.landT = 0; }));
      await wait(small ? 0.6 : 0.85);
    }
    await Promise.all(pops);
    skip = false; busy = false; phase = "done"; S.music?.setLevel(0);
    ui.hint.textContent = txt.done; autoTimer = setTimeout(sendAll, 8000);
  }
  // Brèche des expéditions : l'objet 3D et le bouton mènent à la même page (la page hôte navigue)
  const openGate = () => { Sfx.select?.(); if (EMBED) post({ type: "open-expeditions" }); };
  el("gate").addEventListener("click", openGate);
  el("devGrant").addEventListener("click", () => post({ type: "dev-grant" })); // TEMPORAIRE : bouton de test, visible seulement hors production
  setInterval(hud, 1000); hud();

  // Dialogue avec la page hôte
  const waiting = new Map(); let reqId = 0, inited = false;
  addEventListener("message", (e) => {
    if (!EMBED || e.source !== parent || e.origin !== location.origin) return;
    const m = e.data ?? {};
    if (m.type === "init") { inited = true; cfg = m.config; hostAlbum = m.albumRect; banners = m.banners ?? []; el("devGrant").hidden = !m.dev; el("gateBadge").textContent = m.expeditionsReady || ""; el("gateBadge").hidden = !m.expeditionsReady; setPack(m.state); }
    else if (m.type === "album-rect") hostAlbum = m.albumRect;
    else if (m.type === "bulk-done") bulkReply?.(m);
    else if (m.type === "buy-result" && m.id === -1) setPack(m.state); // cadeau de test
    else if (m.type === "pack-result" || m.type === "buy-result") { waiting.get(m.id)?.(m); waiting.delete(m.id); }
  });
  // Achat de 5 cristaux (même circuit que l'ouverture ; hors iframe, simulé localement)
  function requestBuy() {
    if (!EMBED) {
      if (pack.balance < pack.crystalPrice * 5) return Promise.resolve({ ok: false, error: "Pas assez de Ryō." });
      return Promise.resolve({ ok: true, state: { ...pack, available: liveStock().available + 5, balance: pack.balance - pack.crystalPrice * 5, crystalsLeft: pack.crystalsLeft - 5 } });
    }
    return new Promise((resolve) => {
      const id = ++reqId; waiting.set(id, resolve); post({ type: "buy-request", id, count: 5 });
      setTimeout(() => { if (waiting.delete(id)) resolve({ ok: false, error: "Le serveur ne répond pas, réessaie." }); }, 20000);
    });
  }
  // Demande un paquet au serveur (ou en tire un d'exemple hors iframe)
  function requestPack() {
    if (!EMBED) {
      const state = { ...pack, available: liveStock().available - 5, nextCrystalAt: new Date(Date.now() + cfg.interval).toISOString() };
      return Promise.resolve({ ok: true, cards: [...CHARS], state, pity: null });
    }
    return new Promise((resolve) => {
      const id = ++reqId; waiting.set(id, resolve); post({ type: "open-request", id, bannerId: bannerId || null });
      setTimeout(() => { if (waiting.delete(id)) resolve({ ok: false, error: "Le serveur ne répond pas, réessaie." }); }, 20000);
    });
  }
  const linePos = (i) => new THREE.Vector3((i - 2) * 1.35, 0.85, 3.2);

  // Si l'animation plante, on ne laisse pas la scène bloquée (boutons grisés) : les cartes sont déjà dans l'album
  async function openBooster() {
    try { await openBoosterFlow(); } catch (err) {
      console.error("Ouverture animée interrompue :", err);
      mode.clear?.(ctx); items = []; line.forEach(dropCard); line = [];
      busy = false; phase = "idle"; ui.all.hidden = true; ui.next.hidden = true; ui.booster.hidden = false; capsule.show();
      ui.hint.textContent = "L'animation a échoué : les cartes sont dans ton album.";
    }
  }
  async function openBoosterFlow() {
    if (busy || bulking || phase !== "idle") return;
    if (budgetOf(currentBanner()) < 5) { ui.hint.textContent = currentBanner() ? `Il te faut 5 ${unitOf(currentBanner())}.` : txt.empty; return; }
    S.init(T); busy = true; skip = false; ui.hint.textContent = "Ouverture…";
    const res = await requestPack();
    if (!res.ok) { ui.hint.textContent = res.error; busy = false; setTimeout(() => phase === "idle" && !busy && (ui.hint.textContent = txt.open), 3500); return; }
    setPack(res.state);
    // Les images du paquet doivent être chargées avant de peindre les cartes
    await Promise.all(res.cards.map(async (c) => { images[c.img] ??= await painter.loadImg(c.img); }));
    Sfx.tear(); ui.booster.blur(); ui.booster.hidden = true; capsuleHover = false;
    await capsule.open(ctx);
    line.forEach(dropCard); line = [];
    items = await mode.open(ctx, [...res.cards].sort(() => Math.random() - 0.5));
    while (items.some((i) => i.state === "spawn")) await wait(0.05);
    phase = "ready"; busy = false; S.music?.setLevel(1);
    skip = false; ui.hint.textContent = (res.pity ? `Pity ${res.pity} déclenché ! ` : "") + txt.reveal; ui.all.hidden = false;
  }
  async function reveal(item, quick = false) {
    if (busy || phase !== "ready" || item.state !== "ready") return;
    busy = true; item.state = "opening"; S.music?.setLevel(2);
    if (!quick) skip = false;
    ui.hint.textContent = "Clique pour passer l'animation";
    const card = await mode.reveal(ctx, item, quick);
    item.state = "done";
    await wait(quick ? 0.25 : 0.5);
    const slot = line.length; line.push(card);
    card.userData.state = "moving";
    await moveTo(card, { pos: linePos(slot), rotY: 0, scale: 0.62 }, 0.3, ease.inOut);
    card.userData.state = "line"; card.userData.landT = 0; Sfx.settle(); S.music?.setLevel(1);
    if (!quick) skip = false;
    ui.hint.textContent = txt.reveal; busy = false;
    mode.afterReveal?.(ctx, items);
    if (line.length === items.length) finish();
  }
  async function finish() {
    phase = "done"; ui.all.hidden = true; S.music?.setLevel(0);
    await Promise.all(line.map((card, i) => moveTo(card, { pos: new THREE.Vector3((i - 2) * 1.45, 1.45, 3.2), scale: 0.74 }, 0.7, ease.back)));
    ui.hint.textContent = txt.done;
    autoTimer = setTimeout(sendAll, 5000); // sans clic, les cartes partent seules vers l'album
  }

  // Rangement : la carte se dissout du haut vers le bas (comme elle s'était formée) et ses particules filent vers « Album »
  const dropCard = (c) => scene.remove(c);
  const albumWorld = () => {
    const r = EMBED ? (hostAlbum ?? { left: 0, top: -40, width: 0, height: 0 }) : albumEl.getBoundingClientRect();
    const v = new THREE.Vector3(((r.left + r.width / 2) / innerWidth) * 2 - 1, -((r.top + r.height / 2) / innerHeight) * 2 + 1, 0.5).unproject(camera);
    return camera.position.clone().add(v.sub(camera.position).normalize().multiplyScalar(5.5));
  };
  const albumBump = () => { if (EMBED) return post({ type: "album-bump" }); albumEl.classList.remove("bump"); void albumEl.offsetWidth; albumEl.classList.add("bump"); };
  async function toAlbum(card) {
    const u = card.userData; if (u.state !== "line") return;
    u.state = "leaving"; Sfx.gather();
    const N = 150, DUR = 1.6, W = CARD_W * card.scale.x, H = CARD_H * card.scale.x, tint = new THREE.Color(RC[u.c.rarity]);
    const start = [], mid = [], delay = [], pos = new Float32Array(N * 3), col = new Float32Array(N * 3), tmp = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const sx = (Math.random() - 0.5) * W, sy = (Math.random() - 0.5) * H;
      start.push(card.position.clone().add(new THREE.Vector3(sx, sy, 0.03)));
      mid.push(start[i].clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.8, 0.6 + Math.random() * 1.2, (Math.random() - 0.2) * 1.2)));
      delay.push((0.5 - sy / H) * 0.55 + Math.random() * 0.1); // le haut part en premier
      tmp.copy(tint).lerp(new THREE.Color("#ffffff"), Math.random() * 0.6); col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.09, map: softDot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; scene.add(pts);
    // La carte se « dé-scanne » : le motif de matérialisation à l'envers
    const mat = scanMat(u.map, RC[u.c.rarity]); mat.uniforms.uProg.value = 1; u.front.material = mat;
    u.halo.visible = false; if (u.holo) u.holo.visible = false; u.reflection.visible = false;
    const arrived = new Set(); let first = true;
    await tween(DUR, (k) => {
      const t = k * DUR, target = albumWorld();
      mat.uniforms.uProg.value = Math.max(-0.2, 1 - (t / 0.7) * 1.2);
      for (let i = 0; i < N; i++) {
        const q = Math.min(1, Math.max(0, (t - delay[i]) / 0.8)), e = q * q * (3 - 2 * q), a = 1 - e;
        const x = a * a * start[i].x + 2 * a * e * mid[i].x + e * e * target.x, y = a * a * start[i].y + 2 * a * e * mid[i].y + e * e * target.y, z = a * a * start[i].z + 2 * a * e * mid[i].z + e * e * target.z;
        pos.set([x, y, z], i * 3);
        if (q >= 1 && !arrived.has(i)) { arrived.add(i); if (first) { first = false; Sfx.collect(); albumBump(); } }
      }
      geo.attributes.position.needsUpdate = true; pts.material.opacity = Math.min(1, (DUR - t) / 0.3);
    }, (k) => k);
    scene.remove(pts); geo.dispose(); pts.material.dispose(); mat.dispose();
    dropCard(card); line = line.filter((c) => c !== card);
    if (EMBED) post({ type: "album-stored" }); else { albumBadge.textContent = `+${++stored}`; albumBadge.hidden = false; albumBump(); }
    checkStored();
  }
  async function sendAll() {
    clearTimeout(autoTimer);
    for (const card of [...line]) { toAlbum(card); await wait(0.28); }
  }
  function checkStored() {
    if (phase !== "done" || line.length) return;
    if (bulkMode) return endBulk(true);
    phase = "stored"; clearTimeout(autoTimer); ui.hint.textContent = txt.stored; ui.next.hidden = liveStock().available < 5;
    if (!ui.next.hidden) ui.next.focus({ preventScroll: true });
  }
  async function revealAll() {
    if (phase !== "ready") return;
    ui.all.hidden = true;
    skip = false;
    for (;;) { while (busy) await wait(0.1); const it = mode.nextItem(items); if (!it) break; await reveal(it, true); }
    skip = false;
  }
  ui.booster.addEventListener("click", openBooster);
  ui.all.addEventListener("click", revealAll);
  function backToIdle() {
    ui.next.hidden = true;
    mode.clear?.(ctx); items = [];
    phase = "idle"; ui.booster.hidden = false; ui.hint.textContent = txt.open; ui.booster.focus({ preventScroll: true });
    capsule.show();
  }
  ui.next.addEventListener("click", backToIdle);

  // Pointeur et clavier
  const ZERO2 = new THREE.Vector2();
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(-9, -9), mouseSmooth = new THREE.Vector2();
  let hoverItem = null, hoverCard = null;
  const pick = () => {
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects([...(phase === "idle" && capsule?.group.visible ? [capsule.hit] : []), ...(breche?.group.visible ? [breche.hit] : []), ...mode.pickables(items), ...line.map((c) => c.userData.front)], false);
    for (const h of hits) { if (h.object === capsule?.hit) return { capsule: true }; if (h.object === breche?.hit) return { breche: true }; if (h.object.userData.card) return { card: h.object.userData.card }; if (h.object.userData.item) return { item: h.object.userData.item }; }
    return {};
  };
  canvas.addEventListener("pointermove", (e) => {
    mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    const p = pick(), it = p.item && p.item.state === "ready" && phase === "ready" ? p.item : null, cd = p.card?.userData.state === "line" ? p.card : null;
    if ((it && it !== hoverItem) || (cd && cd !== hoverCard)) Sfx.hover();
    hoverItem = it; hoverCard = cd; capsuleHover = !!p.capsule && !busy; capsule?.set(capsuleHover); breche?.set(!!p.breche);
    canvas.style.cursor = (it && !busy) || capsuleHover || p.breche || (cd && phase === "done") ? "pointer" : "default";
  });
  canvas.addEventListener("click", () => {
    if (busy) return requestSkip();
    const p = pick();
    if (p.breche) openGate(); else if (p.capsule) openBooster(); else if (p.item) reveal(p.item); else if (p.card && phase === "done") toAlbum(p.card);
  });
  addEventListener("keydown", (e) => {
    if (busy && ["Enter", " ", "Escape"].includes(e.key) && !e.target.closest?.("button, a")) { e.preventDefault(); return requestSkip(); }
    if (!["Enter", " "].includes(e.key) || e.target.closest?.("button, a")) return;
    if (phase === "done") { const c = line.find((x) => x.userData.state === "line"); if (c) { e.preventDefault(); toAlbum(c); } return; }
    if (phase !== "ready" || busy) return;
    const it = mode.nextItem(items, camera); if (it) { e.preventDefault(); reveal(it); }
  });

  if (LITE) {
    decorKids.forEach((o) => { if (!o.isLight) o.visible = false; });
    scene.background = new THREE.Color("#dfe6ee"); scene.environment = null; bloom.enabled = false; decor.key.castShadow = false;
  }
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

  // Boucle
  let last = performance.now(), time = 0;
  renderer.setAnimationLoop((now) => {
    perf?.begin();
    adapt(now - last);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    const sdt = now < stopUntil ? dt * 0.04 : dt;
    for (const tw of [...tweens]) { tw.t += sdt; const k = Math.min(1, tw.t / tw.dur); tw.fn(tw.e(k)); if (k >= 1) { tweens.delete(tw); tw.res(); } }
    decor.update(sdt, time);
    if (modeReady) mode.update?.(ctx, items, sdt, time, hoverItem);
    for (const b of [...bursts]) {
      b.life += sdt; const a = b.pts.geometry.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) { a[i] += b.v[i] * sdt; a[i + 1] += b.v[i + 1] * sdt; a[i + 2] += b.v[i + 2] * sdt; b.v[i + 1] -= b.gravity * sdt; b.v[i] *= 0.98; b.v[i + 2] *= 0.98; }
      b.pts.geometry.attributes.position.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.life / b.max);
      if (b.life > b.max) retire(b);
    }
    fxLight.intensity *= Math.pow(0.08, dt);
    capsule?.update(dt, time, mouseSmooth);
    if (breche) { breche.group.visible = !LAB && !bulking && !busy && (phase === "idle" || phase === "stored"); breche.update(dt, time); }
    for (const card of line) {
      const u = card.userData; if (u.state === "leaving") continue;
      u.hoverK += ((card === hoverCard ? 1 : 0) - u.hoverK) * Math.min(1, dt * 10);
      if (u.state === "line") {
        u.body.scale.setScalar(1 + u.hoverK * 0.12);
        if (u.landT !== undefined && u.landT < 0.6) { u.landT += sdt; const sq = 0.16 * Math.exp(-u.landT * 9) * Math.cos(u.landT * 26); u.body.scale.x *= 1 + sq; u.body.scale.y *= 1 - sq * 0.7; }
        u.body.position.y = u.hoverK * 0.25; u.body.rotation.x = u.hoverK * -mouse.y * 0.25; u.body.rotation.y = u.hoverK * mouse.x * 0.35;
        const rk = RANK[u.c.rarity] ?? 0;
        u.halo.material.opacity = Math.min(1, (HALO[u.c.rarity] ?? 0.12) * (rk >= 3 ? 1 + Math.sin(time * 2.2 + u.c.serial) * 0.2 : 1) + u.hoverK * 0.3);
        u.halo.scale.setScalar(1 + rk * 0.1 + (rk >= 3 ? Math.sin(time * 2.2 + u.c.serial) * 0.03 : 0));
        if (rk === 4) u.halo.material.color.setHSL((time * 0.12 + u.c.serial * 0.07) % 1, 0.95, 0.55); // UR : lueur arc-en-ciel qui tourne
        if (rk >= 3 && !reduced) { // SSR / UR : étincelles qui s'échappent en continu
          u.sparkT = (u.sparkT ?? 0) - sdt;
          if (u.sparkT < 0) {
            u.sparkT = rk === 4 ? 0.12 : 0.3;
            const sp = card.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * CARD_W * card.scale.x * 1.1, (Math.random() - 0.5) * CARD_H * card.scale.x * 1.1, 0.1));
            burst(sp, rk === 4 ? [RC.UR, "#f2a516", "#2b6cff", "#00c8b4"] : ["#f2a516", "#ffd36b"], { n: rk === 4 ? 9 : 5, speed: 0.7, size: 0.075, gravity: -0.25, life: 1.2 });
          }
        }
      }
      if (u.holo) u.holo.material.map.offset.set(time * 0.15 + mouse.x * 0.3, mouse.y * 0.3);
    }
    mouseSmooth.lerp(mouse.x < -5 ? ZERO2 : mouse, Math.min(1, dt * 3));
    punch *= Math.pow(0.015, dt); camera.fov = 45 - punch * 3.5; camera.updateProjectionMatrix();
    camera.position.set(mouseSmooth.x * 0.5, 2.5 + mouseSmooth.y * 0.25, camDist); camera.lookAt(LOOK);
    composer.render(dt);
    perf?.end(now);
  });

  // Préchauffage : compile les shaders et envoie les textures au GPU pendant le chargement, pas au premier effet
  async function warmUp() {
    const mk = (extra) => makeCard({ name: "", series: "", img: "", rarity: "UR", type: "", atk: 0, def: 0, power: 0, serial: 1, holo: true, finish: "GOLD", isNew: true, ...extra });
    const a = mk(), b = mk(); // b garde le matériau normal, a prend celui de la matérialisation
    for (const c of [a, b]) { c.position.set(0, -60, 0); c.userData.holo.visible = c.userData.reflection.visible = true; scene.add(c); }
    a.userData.front.material = scanMat(a.userData.map, RC.UR);
    mode.warm?.(ctx);
    const far = new THREE.Vector3(0, -60, 0);
    burst(far, ["#ffffff"], { n: 1, life: 0.01, additive: true }); burst(far, ["#ffffff"], { n: 1, life: 0.01 });
    for (const t of [a.userData.map, b.userData.map, holoTex, glowTex, backTex, softDot]) renderer.initTexture(t);
    await renderer.compileAsync(scene, camera);
    for (let i = 0; i < 2; i++) { composer.render(0); await new Promise((r) => requestAnimationFrame(r)); }
    for (const c of [a, b]) dropCard(c);
    a.userData.front.material.dispose(); mode.clear?.(ctx);
  }

  ui.booster.disabled = true;
  await Promise.all([...(EMBED ? [] : CHARS).map(async (c) => (images[c.img] = await painter.loadImg(c.img))), document.fonts.load('400 44px "Michroma"'), document.fonts.load('400 26px "Sora"')]);
  backTex = painter.makeBack();
  mode.init?.(ctx); modeReady = true;
  capsule = buildCapsule({ decor, ctx, backTex, BLUE, MINT }); scene.add(capsule.group); capsule.show();
  breche = buildBreche({ GLSL_NOISE, BLUE, MINT }); scene.add(breche.group);
  await warmUp();
  ui.booster.disabled = false;
  // La page hôte peut ne pas être encore à l'écoute : on se signale jusqu'à recevoir l'init
  if (EMBED) { const ping = setInterval(() => (inited ? clearInterval(ping) : post({ type: "ready" })), 400); post({ type: "ready" }); }
  // Accès en lecture pour les tests automatisés de la maquette
  const demoBulk = (n = 5, rarities = []) => {
    const base = { series: "Démo", type: "Magie", typeId: "MAGIE", atk: 3000, def: 2000, power: 5000, finish: "NORMAL", holo: false, isNew: true, img: "" };
    const order = ["N", "R", "SR", "SSR", "UR"];
    const cards = Array.from({ length: n }, (_, i) => { const rarity = rarities[i] ?? "N"; return { ...base, rarity, name: `${rarity} ${i + 1}`, serial: i + 1 }; });
    const best = order[Math.max(...cards.map((c) => order.indexOf(c.rarity)))];
    S.init(T); bulking = true; ui.booster.hidden = true; capsule.show();
    return bulkAnimation(n, Promise.resolve({ ok: true, best, cards }));
  };
  if (LAB) {
    const rv = reveals;
    scene.background = new THREE.Color("#070a14");
    capsule.group.visible = false; breche.group.visible = false;
    const st = document.createElement("style"); st.textContent = ".hud,.banners,.gate,.bottom,header{display:none!important} .labbar{position:fixed;top:14px;left:14px;z-index:40;display:flex;flex-wrap:wrap;gap:8px;max-width:760px;font:600 13px Sora,sans-serif} .labbar b{width:100%;color:#fff} .labbar button{padding:8px 14px;border-radius:10px;border:1.5px solid #ffffff55;background:#10182cdd;color:#fff;cursor:pointer;font:inherit} .labbar button:hover{border-color:#7fb0ff}";
    document.head.append(st);
    const bar = document.createElement("div"); bar.className = "labbar";
    const NAMES = { ssrA: "SSR A · Éclair doré", ssrB: "SSR B · Pluie d'étoiles", ssrC: "SSR C · Sceau doré", urA: "UR A · Fissure du multivers", urB: "UR B · Convergence", urC: "UR C · Ascension" };
    bar.innerHTML = "<b>Maquettes de révélation (clique pour jouer)</b>";
    for (const n of rv.names) { const b = document.createElement("button"); b.textContent = NAMES[n] ?? n; b.addEventListener("click", () => { S.init(T); rv.play(n, { ...CHARS[n.startsWith("ur") ? 0 : 1], isNew: true }); }); bar.append(b); }
    document.body.append(bar);
    window.__reveal = rv;
    // Palettes sonores : on choisit une palette, ses sons remplacent ceux de la scène (animations incluses)
    const { createPalettes, PALETTE_ORDER } = await import("./sounds-lab.js");
    let pal = null;
    const sbar = document.createElement("div"); sbar.className = "labbar"; sbar.style.top = "auto"; sbar.style.bottom = "14px";
    const row = (html) => { const d = document.createElement("div"); d.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;width:100%"; d.innerHTML = html; sbar.append(d); return d; };
    const SOUNDS = [["Ouverture", "tear"], ["Carte N", "flip", "N"], ["Carte R", "flip", "R"], ["Carte SR", "flip", "SR"], ["SSR", "ssr"], ["UR : montée", "urCharge"], ["UR : impact", "urImpact"], ["Rangement", "collect"]];
    const info = row("<b>Palettes sonores : choisis-en une, teste ses sons, puis lance une animation au-dessus</b>");
    const palRow = row(""), testRow = row(""), note = document.createElement("div"); note.style.cssText = "width:100%;color:#cfe0ff;font-weight:400"; sbar.append(note);
    const select = (key) => {
      S.init(T); const P = createPalettes(S); pal = P[key];
      Object.assign(Sfx, { tear: () => pal.tear(), flip: (r) => pal.flip(r), ssr: () => pal.ssr(), urCharge: () => pal.urCharge(), urImpact: () => pal.urImpact(), gather: () => pal.gather(), collect: () => pal.collect() });
      note.textContent = `${pal.name} : ${pal.blurb}`;
      testRow.innerHTML = ""; for (const [label, fn, arg] of SOUNDS) { const b = document.createElement("button"); b.textContent = label; b.addEventListener("click", () => { S.init(T); pal[fn](arg); }); testRow.append(b); }
      palRow.querySelectorAll("button").forEach((b) => (b.style.borderColor = b.dataset.k === key ? "#7fb0ff" : ""));
    };
    for (const k of PALETTE_ORDER) { const b = document.createElement("button"); b.dataset.k = k; b.textContent = { orchestre: "A · Orchestre shonen", wa: "B · Japonais", feerique: "C · Féérique", piano: "D · Piano émotionnel" }[k]; b.addEventListener("click", () => select(k)); palRow.append(b); }
    const mute = document.createElement("button"); mute.textContent = "Couper / remettre la musique de fond"; let muted = false;
    mute.addEventListener("click", () => { S.init(T); muted = !muted; S.bus.amb.gain.setTargetAtTime(muted ? 0.0001 : Math.pow(10, S.ambDb / 20), S.ctx.currentTime, 0.05); }); palRow.append(mute);
    document.body.append(sbar);
  }
  window.__scene = { demoBulk, three: { scene, camera }, get phase() { return phase === "ready" ? "ring" : phase; }, get busy() { return busy; }, get states() { return items.map((i) => (i.state === "ready" ? "ring" : i.state)); }, get ur() { return !ui.ur.hidden; } };
}
