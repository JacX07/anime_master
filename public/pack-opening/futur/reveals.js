// Maquettes d'animations de révélation SSR et UR (page ?lab). Chaque variante joue sur une seule carte, sans serveur,
// et nettoie ce qu'elle ajoute à la scène. Elles réutilisent les outils du moteur (particules, flash, zoom, sons).
import * as THREE from "three";
import { buildBreche } from "./breche.js";

export function createReveals(ctx, { loadCard }) {
  const { scene, tween, wait, ease, burst, fxPulse, flash, zoomPunch, hitStop, Sfx, S, RC, BLUE, MINT, makeCard, materialize, FOCUS, CARD_W, CARD_H, canvasTex, GLSL_NOISE } = ctx;
  const theatre = ctx.theatre ?? (async () => {});
  const GOLD = "#f2a516", PALE = "#ffd36b";
  const mat = (color, opacity = 1, extra = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, ...extra });
  const raysTex = (n) => canvasTex(512, 512, (g, w, h) => {
    g.translate(w / 2, h / 2);
    for (let i = 0; i < n; i++) { g.rotate((Math.PI * 2) / n); const gr = g.createLinearGradient(0, 0, w / 2, 0); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "#fff0"); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(w / 2, -5 - (i % 3) * 6); g.lineTo(w / 2, 5 + (i % 3) * 6); g.closePath(); g.fill(); }
  });
  const sealTex = canvasTex(512, 512, (g, w, h) => {
    g.translate(w / 2, h / 2); g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineWidth = 5;
    [236, 200, 150].forEach((r, k) => { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.lineWidth = k === 1 ? 2 : 5; g.stroke(); });
    for (let i = 0; i < 72; i++) { g.rotate((Math.PI * 2) / 72); g.fillRect(-1.5, 204, 3, i % 6 === 0 ? 28 : 12); }
    g.font = '700 34px "Sora", sans-serif'; g.textAlign = "center";
    for (let i = 0; i < 12; i++) { g.rotate((Math.PI * 2) / 12); g.fillText("✦", 0, -166); }
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.lineTo(Math.cos(a) * 140, Math.sin(a) * 140); } g.closePath(); g.lineWidth = 3; g.stroke();
  });

  let objs = [];
  const track = (o) => { objs.push(o); scene.add(o); return o; };
  const cleanup = () => { objs.forEach((o) => { scene.remove(o); o.traverse?.((n) => { n.geometry?.dispose?.(); n.material?.dispose?.(); }); }); objs = []; };
  const plane = (size, color, tex, z = -0.4) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat(color, 0, tex ? { map: tex } : {})); m.position.set(FOCUS.x, FOCUS.y, FOCUS.z + z); return track(m); };
  const ring = (color, r = 1, t = 0.04) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 96), mat(color, 0)); m.position.copy(FOCUS); return track(m); };
  const newCard = async (c) => { const card = makeCard(c); card.position.copy(FOCUS); card.scale.setScalar(1.1); card.visible = false; track(card); return card; };
  // Dans le jeu on réutilise la carte déjà créée par la scène (posée au centre) ; dans le labo on en crée une
  const getCard = async (c, ex, force) => { if (!ex) return newCard(force(c)); ex.visible = false; ex.position.copy(FOCUS); ex.scale.setScalar(1.1); return ex; };
  const hue = (t) => new THREE.Color().setHSL(((t % 1) + 1) % 1, 0.95, 0.6);
  const label = (text) => {
    const d = document.createElement("div");
    d.style.cssText = "position:fixed;left:0;right:0;top:16%;text-align:center;font:400 54px Michroma,sans-serif;color:#fff;text-shadow:0 0 30px #ff4fd8,0 0 60px #3cf2ff;letter-spacing:.1em;opacity:0;pointer-events:none;z-index:30;transition:opacity .6s,letter-spacing 2.4s";
    d.textContent = text; document.body.append(d); requestAnimationFrame(() => { d.style.opacity = "1"; d.style.letterSpacing = ".42em"; });
    return () => { d.style.opacity = "0"; setTimeout(() => d.remove(), 700); };
  };
  const ur = (c) => ({ ...c, rarity: "UR" }), ssr = (c) => ({ ...c, rarity: "SSR" });

  const V = {
    // ---- SSR ----
    async ssrA(c, ex) { // Éclair doré : choc, rayons qui s'ouvrent, onde dorée, fontaine d'étincelles
      const card = await getCard(c, ex, ssr), rays = plane(11, GOLD, raysTex(28)), sh = ring(PALE, 1, 0.07);
      await theatre(true); flash(); Sfx.ssr(); zoomPunch(0.6); hitStop(0.1);
      burst(FOCUS, [GOLD, PALE, "#ffffff"], { n: 420, speed: 4.2, rise: 2.2, gravity: 0.9, size: 0.08, additive: true });
      fxPulse(GOLD, 40, FOCUS);
      const grow = tween(2.2, (k) => { rays.material.opacity = Math.min(1, k * 5) * (1 - k) * 0.95; rays.rotation.z = k * 0.9; rays.scale.setScalar(0.5 + k * 0.9); sh.scale.setScalar(0.2 + k * 7.5); sh.material.opacity = (1 - k) * 0.9; }, ease.out);
      await wait(0.35); await materialize(card, 1.2); await grow; await wait(1.3);
    },
    async ssrB(c, ex) { // Pluie d'étoiles : la scène s'assombrit, un trait d'or tombe, les étoiles pleuvent, la carte monte
      const card = await getCard(c, ex, ssr); card.position.y = FOCUS.y - 1.8;
      await theatre(true); S.duck?.(-16, 3); Sfx.gather(); await wait(0.7);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 9, 8), mat(PALE, 0)); beam.position.set(FOCUS.x, FOCUS.y + 4.5, FOCUS.z - 0.2); track(beam);
      const N = 360, pos = new Float32Array(N * 3), vy = [], geo = new THREE.BufferGeometry();
      for (let i = 0; i < N; i++) { pos.set([FOCUS.x + (Math.random() - 0.5) * 7, FOCUS.y + 2 + Math.random() * 7, FOCUS.z - 1 + Math.random() * 2], i * 3); vy.push(1.2 + Math.random() * 2.5); }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const rain = track(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.11, color: PALE, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, map: ctx.softDot })));
      rain.frustumCulled = false;
      let last = 0;
      await tween(1.4, (k) => { beam.material.opacity = k; rain.material.opacity = k; const dt = (k - last) * 1.4; last = k; for (let i = 0; i < N; i++) { pos[i * 3 + 1] -= vy[i] * dt; if (pos[i * 3 + 1] < FOCUS.y - 2.5) pos[i * 3 + 1] = FOCUS.y + 6; } geo.attributes.position.needsUpdate = true; }, (k) => k);
      Sfx.ssr(); flash(); zoomPunch(0.5); card.visible = true;
      const rise = tween(1.6, (k) => { card.position.y = FOCUS.y - 1.8 + 1.8 * k; beam.material.opacity = 1 - k * 0.7; }, ease.out);
      burst(FOCUS, [GOLD, PALE, "#ffffff"], { n: 300, speed: 3, additive: true }); fxPulse(GOLD, 30, FOCUS);
      await materialize(card, 1.3); await rise; await wait(1.6);
    },
    async ssrC(c, ex) { // Sceau doré : un cercle runique converge, se verrouille, puis explose
      const card = await getCard(c, ex, ssr), seal = plane(5.4, GOLD, sealTex, 0.1), seal2 = plane(4, PALE, sealTex, 0.12);
      await theatre(true); S.duck?.(-16, 3.5); Sfx.gather();
      await tween(1.5, (k) => { seal.material.opacity = k * 0.95; seal2.material.opacity = k * 0.7; seal.scale.setScalar(1.7 - 0.7 * k); seal2.scale.setScalar(1.2 - 0.2 * k); seal.rotation.z = k * 2.2; seal2.rotation.z = -k * 3; fxPulse(GOLD, 14 * k, FOCUS); }, ease.inOut);
      Sfx.ssr(); flash(); hitStop(0.12); zoomPunch(0.7);
      burst(FOCUS, [GOLD, PALE, "#ffffff"], { n: 500, speed: 4.5, additive: true, size: 0.08 });
      const sh = ring(PALE, 1, 0.06);
      const out = tween(1.6, (k) => { seal.scale.setScalar(1 + k * 2); seal2.scale.setScalar(1 + k * 3); seal.material.opacity = (1 - k) * 0.9; seal2.material.opacity = (1 - k) * 0.7; sh.scale.setScalar(0.3 + k * 8); sh.material.opacity = (1 - k); seal.rotation.z += 0.05; }, ease.out);
      await materialize(card, 1.1); await out; await wait(1.5);
    },
    // ---- UR ----
    async urA(c, ex) { // Fissure du multivers : une brèche s'ouvre au centre de l'écran et laisse passer la carte
      const card = await getCard(c, ex, ur), rays = plane(13, "#ffffff", raysTex(40), -0.9), b = buildBreche({ GLSL_NOISE, BLUE, MINT });
      b.group.position.set(FOCUS.x, FOCUS.y, FOCUS.z - 0.5); b.group.rotation.set(0, 0, 0); track(b.group); b.group.scale.setScalar(0.02);
      await theatre(true); S.duck?.(-26, 7); Sfx.urCharge();
      let t = 0; const upd = (dt) => b.update(dt, (t += dt));
      await tween(2.2, (k) => { upd(0.016); b.group.scale.set(0.05 + k * 1.1, 0.4 + k * 1.3, 1); b.group.position.x = FOCUS.x + (Math.random() - 0.5) * 0.05 * (1 - k); fxPulse(BLUE, 30 * k, FOCUS); }, ease.in);
      Sfx.urImpact(); flash(); hitStop(0.18); zoomPunch(1);
      burst(FOCUS, [RC.UR, GOLD, BLUE, MINT, "#ffffff"], { n: 650, speed: 5.5, size: 0.09, additive: true });
      const spill = tween(3.2, (k) => { upd(0.016); rays.material.color.copy(hue(k * 2)); rays.material.opacity = Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.8; rays.rotation.z = k * 0.6; b.group.scale.set(1.15 + k * 0.2, 1.7 + k * 0.4, 1); }, (k) => k);
      const stop = label("ULTRA RARE");
      await wait(0.5); await materialize(card, 1.8); await spill;
      await tween(0.8, (k) => { upd(0.016); b.group.scale.set(1.35 * (1 - k) + 0.01, 2.1 * (1 - k) + 0.01, 1); }, ease.in);
      await wait(1.6); stop();
    },
    async urB(c, ex) { // Convergence : la lumière afflue de partout, blanc total, onde prismatique
      const card = await getCard(c, ex, ur), rays = plane(14, "#ffffff", raysTex(36), -0.9);
      await theatre(true); S.duck?.(-26, 7); Sfx.urCharge();
      const N = 520, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), dirs = [], geo = new THREE.BufferGeometry();
      for (let i = 0; i < N; i++) { const d = new THREE.Vector3().randomDirection().multiplyScalar(5 + Math.random() * 4); dirs.push(d); const cc = hue(i / N); col.set([cc.r, cc.g, cc.b], i * 3); }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const pts = track(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, map: ctx.softDot })));
      pts.frustumCulled = false;
      await tween(3, (k) => { const e = k * k; for (let i = 0; i < N; i++) { const d = dirs[i], f = 1 - e; pos.set([FOCUS.x + d.x * f, FOCUS.y + d.y * f, FOCUS.z + d.z * f], i * 3); } geo.attributes.position.needsUpdate = true; fxPulse("#ffffff", 40 * k, FOCUS); }, (k) => k);
      pts.visible = false; Sfx.urImpact(); flash(); await wait(0.12); flash(); hitStop(0.2); zoomPunch(1.2);
      burst(FOCUS, [RC.UR, GOLD, BLUE, MINT, "#ffffff"], { n: 700, speed: 6, size: 0.1, additive: true });
      const rs = [0, 1, 2].map((i) => ring(hue(i / 3), 1, 0.08)), stop = label("ULTRA RARE");
      const wave = tween(3.4, (k) => { rs.forEach((r, i) => { const kk = Math.max(0, k - i * 0.12); r.scale.setScalar(0.2 + kk * 9); r.material.opacity = (1 - kk) * 0.9; r.material.color.copy(hue(kk + i / 3)); }); rays.material.color.copy(hue(k * 3)); rays.material.opacity = Math.sin(k * Math.PI) * 0.85; rays.rotation.z = k * 0.5; }, (k) => k);
      await materialize(card, 1.6); await wave; await wait(1.4); stop();
    },
    async urC(c, ex) { // Ascension : un pilier de lumière tombe, la carte s'élève en tournant, couronne prismatique au sommet
      const card = await getCard(c, ex, ur); card.position.y = FOCUS.y - 2.4;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 12, 32, 1, true), mat("#bcd8ff", 0)); beam.position.set(FOCUS.x, FOCUS.y, FOCUS.z - 0.3); track(beam);
      const crown = [0, 1, 2].map((i) => ring(hue(i / 3), 1.2 + i * 0.35, 0.05)); crown.forEach((r) => (r.position.y = FOCUS.y + 1.4));
      await theatre(true); S.duck?.(-28, 8); Sfx.urCharge();
      await tween(1.4, (k) => { beam.material.opacity = k * 0.5; beam.scale.x = beam.scale.z = 0.2 + k * 0.8; fxPulse(BLUE, 20 * k, FOCUS); }, ease.out);
      card.visible = true; card.userData.front.material.opacity = 1;
      const timer = setInterval(() => burst(new THREE.Vector3(FOCUS.x + (Math.random() - 0.5) * 1.4, card.position.y - 0.8, FOCUS.z), [BLUE, MINT, "#ffffff", PALE], { n: 40, speed: 0.8, rise: 2.5, gravity: -0.3, size: 0.07, additive: true }), 150);
      const stop = label("ULTRA RARE");
      await Promise.all([materialize(card, 2.6), tween(3.6, (k) => { card.position.y = FOCUS.y - 2.4 + 2.4 * k; card.rotation.y = (1 - (1 - k) ** 3) * Math.PI * 4; crown.forEach((r, i) => { r.material.opacity = Math.max(0, (k - 0.6) / 0.4) * 0.9; r.rotation.x = Math.PI / 2 + Math.sin(k * 6 + i) * 0.3; r.material.color.copy(hue(k * 2 + i / 3)); }); }, ease.inOut)]);
      clearInterval(timer);
      Sfx.urImpact(); flash(); hitStop(0.2); zoomPunch(1.1);
      burst(FOCUS, [RC.UR, GOLD, BLUE, MINT, "#ffffff"], { n: 650, speed: 5.5, size: 0.09, additive: true });
      await tween(1.8, (k) => { beam.material.opacity = 0.5 * (1 - k); crown.forEach((r, i) => { r.scale.setScalar(1 + k * 6); r.material.opacity = (1 - k) * 0.9; r.material.color.copy(hue(k + i / 3)); }); }, ease.out);
      await wait(1.5); stop();
    },
  };

  let running = false;
  // Joue une variante ; `existing` = carte déjà créée par la scène (elle reste en place à la fin)
  async function run(name, c, existing) {
    if (running || !V[name]) return;
    running = true;
    try { await V[name](c, existing); } finally { cleanup(); running = false; await theatre(false); }
  }
  async function play(name, character) { if (!running) await run(name, await loadCard(character)); }
  return { play, run, names: Object.keys(V), get running() { return running; } };
}
