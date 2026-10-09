// Médiéval : la salle du trésor d'un château, la nuit. Braseros, vitrail sous la lune, bannières, or et cramoisi.
import { vary } from "../core.js";

// Mode dorien sur ré : sonne « ancien » sans être triste
const DORIAN = [293.66, 329.63, 349.23, 392, 440, 493.88, 523.25, 587.33, 659.25, 698.46];

export default {
  id: "medieval", name: "Médiéval",
  fonts: "https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=EB+Garamond:wght@500;700&display=swap",
  css: `
    :root { --bg: #120b07; --ink: #f1e4c6; --muted: #f1e4c6b0; --accent: #e3b04b; --accent2: #a8322d; --hl: #ffd27a;
      --font-display: "Cinzel"; --font-body: "EB Garamond"; --display-weight: 800;
      --panel: linear-gradient(#24170dd8, #170e08e0); --panel-line: #c8902e66; --radius: 6px;
      --logo: #e3b04b; --logo-glow: 0 0 12px #e3b04b66, 0 2px 0 #000; --header-fade: #0a0604cc;
      --btn: #24170dcc; --btn-line: #c8902e77; --btn-primary: linear-gradient(#b13a31, #7a1f1f); --btn-primary-ink: #ffe9b8;
      --hint: #f1e4c6; --hint-glow: 0 2px 6px #000;
      --SSR: #e3b04b; --UR: #d14a3b;
      --flash: radial-gradient(circle at 50% 45%, #fff3c4 0%, #e3b04baa 30%, transparent 65%);
      --vig: radial-gradient(ellipse at 50% 45%, transparent 40%, #000000c0 100%);
      --ur-bg: radial-gradient(circle, #5a1414, #160806 70%);
      --ur-rays: repeating-conic-gradient(#e3b04b55 0 4deg, transparent 4deg 13deg);
      --ur-frame: conic-gradient(from var(--a), #e3b04b, #fff1c0, #b8862b, #d14a3b, #e3b04b);
      --ur-label: linear-gradient(90deg, #b8862b, #fff1c0, #e3b04b, #fff1c0, #b8862b);
      --ur-glow: #e3b04baa; --ur-ink: #fff1d6; }
    .hud { border-width: 1px; box-shadow: inset 0 0 0 4px #00000055, inset 0 0 0 5px #c8902e33; }
    .hud .big, .logo { letter-spacing: .04em; }
    .btn { font-size: 15px; }
    .booster { width: 260px; aspect-ratio: 3/2.2; }
    .booster .scroll { position: absolute; inset: 12% 4%; border-radius: 4px; background: linear-gradient(90deg, #c9a66b, #f0dcae 12%, #f6e7c3 50%, #f0dcae 88%, #c9a66b); box-shadow: 0 20px 40px #000a; }
    .booster .scroll::before, .booster .scroll::after { content: ""; position: absolute; top: -9%; bottom: -9%; width: 9%; border-radius: 40px; background: linear-gradient(90deg, #8a6a3c, #e6cf9c, #8a6a3c); }
    .booster .scroll::before { left: -4%; } .booster .scroll::after { right: -4%; }
    .booster .ribbon { position: absolute; left: 0; right: 0; top: 50%; height: 16px; translate: 0 -50%; background: linear-gradient(#a8322d, #6e1a16); }
    .booster .seal { position: absolute; left: 50%; top: 50%; translate: -50% -50%; width: 74px; height: 74px; border-radius: 47% 53% 50% 50%; background: radial-gradient(circle at 38% 32%, #d6463c, #8c1d18 70%); box-shadow: 0 4px 10px #000a, inset 0 -4px 8px #0006; display: grid; place-items: center; font: 800 26px "Cinzel"; color: #f3b8a8; text-shadow: 0 -1px 0 #0008; }
    .booster .lbl { position: absolute; bottom: -4px; left: 0; right: 0; text-align: center; font: 700 18px "EB Garamond"; color: #f1e4c6; text-shadow: 0 2px 4px #000; }
  `,
  booster: `<span class="scroll"><span class="ribbon"></span></span><span class="seal">AM</span><span class="lbl">Parchemin scellé · 5 cartes</span>`,
  text: { open: "Brise le sceau pour ouvrir le parchemin", done: "Voici ton butin. Survole tes cartes pour les admirer" },
  rarity: { N: "#a39e93", R: "#6f9bd1", SR: "#a678d8", SSR: "#e3b04b", UR: "#e0574a" },
  urFrame: ["#7a1f1f", "#e3b04b", "#fff1c0", "#3d5fa8", "#2f7a4f", "#e3b04b"], urInk: "#ffe2b0", urStar: "✠",
  card: {
    display: "Cinzel", body: "EB Garamond", ink: "#f6e9cc", sub: "#d9c49a", panel: "#2a1a10", shade: "#140c07", badge: "#140c07c8", radius: 18, tint: 0.9,
    ornament(g, c, w, h, col) { g.strokeStyle = col; g.globalAlpha = 0.8; g.lineWidth = 2; g.strokeRect(24, 24, w - 48, h - 48); g.globalAlpha = 1; },
    back(g, w, h) {
      // cuir sombre, bordure d'or filigranée, blason central
      const bg = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, h * 0.7); bg.addColorStop(0, "#5a2c1c"); bg.addColorStop(1, "#24110a"); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) { g.fillStyle = Math.random() < 0.5 ? "#0000001a" : "#ffffff08"; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      const gold = g.createLinearGradient(0, 0, w, h); gold.addColorStop(0, "#f6dc93"); gold.addColorStop(0.5, "#b8862b"); gold.addColorStop(1, "#f6dc93");
      g.strokeStyle = gold; g.lineWidth = 8; g.strokeRect(26, 26, w - 52, h - 52); g.lineWidth = 2; g.strokeRect(40, 40, w - 80, h - 80);
      // volutes dans les coins
      const curl = (x, y, sx, sy) => { g.save(); g.translate(x, y); g.scale(sx, sy); g.beginPath(); g.moveTo(0, 60); g.bezierCurveTo(0, 10, 10, 0, 60, 0); g.moveTo(14, 46); g.bezierCurveTo(16, 22, 24, 16, 46, 14); g.stroke(); g.beginPath(); g.arc(24, 24, 6, 0, Math.PI * 2); g.fillStyle = gold; g.fill(); g.restore(); };
      g.lineWidth = 3; curl(48, 48, 1, 1); curl(w - 48, 48, -1, 1); curl(48, h - 48, 1, -1); curl(w - 48, h - 48, -1, -1);
      // blason
      g.save(); g.translate(w / 2, h / 2 - 10);
      g.beginPath(); g.moveTo(-90, -100); g.lineTo(90, -100); g.lineTo(90, 10); g.quadraticCurveTo(90, 90, 0, 130); g.quadraticCurveTo(-90, 90, -90, 10); g.closePath();
      const sh = g.createLinearGradient(0, -100, 0, 130); sh.addColorStop(0, "#9c2b24"); sh.addColorStop(1, "#5a1411"); g.fillStyle = sh; g.fill(); g.lineWidth = 7; g.strokeStyle = gold; g.stroke();
      g.fillStyle = gold; g.font = '800 72px "Cinzel"'; g.textAlign = "center"; g.fillText("AM", 0, 40);
      g.beginPath(); g.moveTo(-40, -128); g.lineTo(-40, -150); g.lineTo(-20, -136); g.lineTo(0, -158); g.lineTo(20, -136); g.lineTo(40, -150); g.lineTo(40, -128); g.closePath(); g.fill();
      g.restore();
    },
  },
  render: { exposure: 1.1, bloom: [0.7, 0.6, 1.0] },
  camera: { y: 2.6 },
  fx: { ring: "#ffb347", spawn: ["#ffd27a", "#ff8a3d", "#fff1c0"], ssr: ["#ffd27a", "#fff1c0", "#e3b04b", "#ffffff"], ur: ["#e0574a", "#ffd27a", "#fff1c0", "#6f9bd1"], gravity: 1.2 },
  ambienceDb: -14, reverb: { seconds: 3.6, wet: 0.45 },

  env({ THREE, scene, canvasTex, softDot, rng }) {
    const R = rng(7);
    scene.background = new THREE.Color("#070403");
    scene.add(new THREE.HemisphereLight("#4a5d8a", "#1a0f08", 0.35));

    // Pierre de taille : blocs aux teintes variées, joints sombres
    const stoneTex = (w, h, bw, bh, base, seed, window) => {
      const r = rng(seed), tex = canvasTex(w, h, (g) => {
        g.fillStyle = "#1c1612"; g.fillRect(0, 0, w, h);
        for (let y = 0, row = 0; y < h; y += bh, row++) for (let x = -(row % 2) * bw / 2; x < w; x += bw) {
          const l = base + (r() - 0.5) * 18; g.fillStyle = `hsl(28 ${10 + r() * 8}% ${l}%)`; g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
          for (let k = 0; k < 30; k++) { g.fillStyle = r() < 0.5 ? "#00000022" : "#ffffff0d"; g.fillRect(x + r() * bw, y + r() * bh, 3 + r() * 6, 2 + r() * 4); }
        }
        window?.(g, w, h);
      });
      return tex;
    };
    // Mur du fond avec un grand vitrail en ogive éclairé par la lune
    const arch = (g, cx, top, ww, hh) => { g.beginPath(); g.moveTo(cx - ww / 2, top + hh); g.lineTo(cx - ww / 2, top + ww * 0.55); g.quadraticCurveTo(cx - ww / 2, top, cx, top - ww * 0.1); g.quadraticCurveTo(cx + ww / 2, top, cx + ww / 2, top + ww * 0.55); g.lineTo(cx + ww / 2, top + hh); g.closePath(); };
    const drawWindow = (g, w, h, glowOnly) => {
      const cx = w / 2, top = h * 0.3, ww = w * 0.15, hh = h * 0.42;
      if (glowOnly) { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); }
      g.save(); arch(g, cx, top, ww, hh); g.clip();
      const sky = g.createLinearGradient(0, top, 0, top + hh); sky.addColorStop(0, "#3d5d9a"); sky.addColorStop(1, "#1a2a52"); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = "#f2f0ff"; g.beginPath(); g.arc(cx + ww * 0.15, top + hh * 0.28, ww * 0.16, 0, Math.PI * 2); g.fill();
      // vitrail : verres colorés translucides
      const glass = ["#3f6fc966", "#a8322d55", "#e3b04b55", "#2f7a4f55"];
      for (let y = top - 40; y < top + hh; y += 46) for (let x = cx - ww / 2; x < cx + ww / 2; x += 40) { g.fillStyle = glass[Math.floor(r2() * 4)]; g.fillRect(x, y, 40, 46); }
      g.strokeStyle = "#0b0806"; g.lineWidth = 6;
      for (let x = cx - ww / 2; x <= cx + ww / 2; x += 40) { g.beginPath(); g.moveTo(x, top - 40); g.lineTo(x, top + hh); g.stroke(); }
      for (let y = top; y < top + hh; y += 46) { g.beginPath(); g.moveTo(cx - ww / 2, y); g.lineTo(cx + ww / 2, y); g.stroke(); }
      g.restore();
      g.lineWidth = 18; g.strokeStyle = glowOnly ? "#000" : "#3a2e24"; arch(g, cx, top, ww, hh); g.stroke();
    };
    let r2 = rng(99);
    const backMap = stoneTex(2048, 1024, 128, 64, 30, 3, (g, w, h) => { r2 = rng(99); drawWindow(g, w, h, false); });
    const glowMap = canvasTex(2048, 1024, (g, w, h) => { r2 = rng(99); drawWindow(g, w, h, true); });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(32, 16), new THREE.MeshStandardMaterial({ map: backMap, roughness: 0.95, emissive: "#ffffff", emissiveMap: glowMap, emissiveIntensity: 1.1 }));
    back.position.set(0, 7.4, -9); scene.add(back);
    const sideMap = stoneTex(1024, 512, 128, 64, 28, 5); sideMap.wrapS = THREE.RepeatWrapping; sideMap.repeat.set(1.5, 1);
    [-1, 1].forEach((s) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), new THREE.MeshStandardMaterial({ map: sideMap, roughness: 0.95 })); m.rotation.y = -s * Math.PI / 2; m.position.set(s * 11, 7.4, 1); scene.add(m); });

    // Dallage et tapis rouge jusqu'au fond de la salle
    const floorMap = canvasTex(1024, 1024, (g, w, h) => {
      g.fillStyle = "#15100c"; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) { const l = 20 + (R() - 0.5) * 10; g.fillStyle = `hsl(30 8% ${l}%)`; g.fillRect(x + 4, y + 4, 120, 120); for (let k = 0; k < 40; k++) { g.fillStyle = R() < 0.5 ? "#0000002a" : "#ffffff08"; g.fillRect(x + R() * 128, y + R() * 128, 4, 3); } }
    });
    floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping; floorMap.repeat.set(6, 6);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.6, metalness: 0.1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.6, 0); scene.add(floor);
    const carpetMap = canvasTex(256, 1024, (g, w, h) => {
      g.fillStyle = "#6e1a16"; g.fillRect(0, 0, w, h); g.fillStyle = "#c8902e"; g.fillRect(14, 0, 10, h); g.fillRect(w - 24, 0, 10, h);
      for (let y = 40; y < h; y += 120) { g.save(); g.translate(w / 2, y); g.rotate(Math.PI / 4); g.strokeStyle = "#c8902e88"; g.lineWidth = 4; g.strokeRect(-22, -22, 44, 44); g.restore(); }
      for (let i = 0; i < 4000; i++) { g.fillStyle = R() < 0.5 ? "#00000018" : "#ffffff08"; g.fillRect(R() * w, R() * h, 2, 2); }
    });
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 16), new THREE.MeshStandardMaterial({ map: carpetMap, roughness: 1 }));
    carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, -0.59, -1); scene.add(carpet);

    // Bannières qui ondulent doucement
    const bannerMap = canvasTex(256, 768, (g, w, h) => {
      g.fillStyle = "#7a1f1f"; g.fillRect(0, 0, w, h - 60); g.beginPath(); g.moveTo(0, h - 60); g.lineTo(w / 2, h); g.lineTo(w, h - 60); g.fill();
      g.strokeStyle = "#c8902e"; g.lineWidth = 10; g.strokeRect(16, 16, w - 32, h - 110);
      g.fillStyle = "#c8902e"; g.font = '800 120px "Cinzel"'; g.textAlign = "center"; g.fillText("✠", w / 2, h / 2);
      for (let i = 0; i < 3000; i++) { g.fillStyle = "#00000014"; g.fillRect(R() * w, R() * h, 2, 3); }
    });
    const banners = [-6.2, 6.2].map((x) => {
      const geo = new THREE.PlaneGeometry(2, 6, 8, 16);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: bannerMap, roughness: 0.9, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }));
      m.position.set(x, 6.2, -8.8); scene.add(m); return { m, base: geo.attributes.position.array.slice() };
    });

    // Braseros : cuve de fer, feu en particules, lumière qui vacille
    const fireTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "#fff"); r.addColorStop(0.25, "#ffd48a"); r.addColorStop(0.6, "#ff6a1a55"); r.addColorStop(1, "#0000"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
    const iron = new THREE.MeshStandardMaterial({ color: "#2a2420", roughness: 0.5, metalness: 0.8 });
    const fires = [-3.8, 3.8].map((x) => {
      const g = new THREE.Group(); g.position.set(x, -0.6, -1.8); scene.add(g);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.32, 0.38, 24, 1, true), iron); bowl.position.y = 1.35; g.add(bowl);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 8, 32), iron); rim.rotation.x = Math.PI / 2; rim.position.y = 1.54; g.add(rim);
      for (let k = 0; k < 3; k++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.25, 8), iron); const a = (k / 3) * Math.PI * 2; leg.position.set(Math.cos(a) * 0.3, 0.62, Math.sin(a) * 0.3); leg.rotation.z = Math.cos(a) * 0.2; leg.rotation.x = -Math.sin(a) * 0.2; g.add(leg); }
      const coals = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.7, 0.15) })); coals.rotation.x = -Math.PI / 2; coals.position.y = 1.5; g.add(coals);
      const light = new THREE.PointLight("#ff9a3c", 30, 16, 1.6); light.position.set(0, 2.2, 0); g.add(light);
      const N = 90, pos = new Float32Array(N * 3), life = new Float32Array(N);
      for (let i = 0; i < N; i++) life[i] = Math.random();
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.42, map: fireTex, color: new THREE.Color(0.9, 0.38, 0.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      pts.position.y = 1.5; g.add(pts);
      return { g, light, geo, life, seed: Math.random() * 10 };
    });

    // Rayon de lune qui tombe du vitrail, poussière en suspension
    const beamTex = canvasTex(64, 256, (g, w, h) => { const l = g.createLinearGradient(0, 0, 0, h); l.addColorStop(0, "#9fb6ffaa"); l.addColorStop(1, "#9fb6ff00"); g.fillStyle = l; g.fillRect(0, 0, w, h); const s = g.createLinearGradient(0, 0, w, 0); s.addColorStop(0, "#000"); s.addColorStop(0.5, "#fff"); s.addColorStop(1, "#000"); g.globalCompositeOperation = "multiply"; g.fillStyle = s; g.fillRect(0, 0, w, h); });
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 12), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.set(0.4, 3.6, -5.6); beam.rotation.x = -0.5; scene.add(beam);
    const D = 260, dp = new Float32Array(D * 3); for (let i = 0; i < D; i++) dp.set([(R() - 0.5) * 12, R() * 7 - 0.5, -8 + R() * 12], i * 3);
    const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    scene.add(new THREE.Points(dGeo, new THREE.PointsMaterial({ size: 0.035, map: softDot, color: "#ffe2b0", transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })));

    // Halo chaud au sol sous le cercle (pas de cercle magique ni de symbole)
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: softDot, color: new THREE.Color(0.9, 0.55, 0.2), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, -0.58, 0); scene.add(pool);

    return {
      update(dt, t) {
        for (const f of fires) {
          const a = f.geo.attributes.position.array;
          for (let i = 0; i < f.life.length; i++) {
            f.life[i] += dt * (0.9 + (i % 5) * 0.12);
            if (f.life[i] > 1) f.life[i] -= 1;
            const k = f.life[i], ang = i * 2.4;
            a[i * 3] = Math.cos(ang) * 0.32 * (1 - k) + Math.sin(t * 3 + i) * 0.05 * k;
            a[i * 3 + 1] = k * 1.1;
            a[i * 3 + 2] = Math.sin(ang) * 0.32 * (1 - k);
          }
          f.geo.attributes.position.needsUpdate = true;
          f.light.intensity = 26 + Math.sin(t * 13 + f.seed) * 3 + Math.sin(t * 7.3 + f.seed * 2) * 4 + Math.sin(t * 23 + f.seed) * 2;
        }
        for (const b of banners) {
          const p = b.m.geometry.attributes.position.array;
          for (let i = 0; i < p.length; i += 3) { const y = b.base[i + 1], drop = (3 - y) / 6; p[i + 2] = Math.sin(t * 1.1 + b.base[i] * 1.5 + y * 0.8) * 0.12 * drop; }
          b.m.geometry.attributes.position.needsUpdate = true; b.m.geometry.computeVertexNormals();
        }
        const d = dGeo.attributes.position.array;
        for (let i = 0; i < D; i++) { d[i * 3 + 1] += Math.sin(t * 0.5 + i) * 0.002; d[i * 3] += Math.cos(t * 0.3 + i) * 0.002; }
        dGeo.attributes.position.needsUpdate = true;
        beam.material.opacity = 0.28 + Math.sin(t * 0.4) * 0.04;
      },
    };
  },

  sounds(s) {
    const lute = (f, at = 0, gain = 0.18) => s.pluck(f, 1.6, { gain, at, damp: 0.994, bright: 0.55, wet: 0.35 });
    return {
      ambience() {
        s.loopNoise({ type: "lowpass", freq: 260, gain: 0.8, lfo: 0.05, lfoDepth: 0.3 });
        // crépitement du feu
        s.every(0.08, 0.6, () => s.noise(0.02 + Math.random() * 0.04, { from: 1500 + Math.random() * 3000, to: 800, gain: 0.04 + Math.random() * 0.05, bus: "amb", wet: 0.2 }));
      },
      hover: () => s.tone(vary(2093, 0.01), 0.25, { type: "triangle", gain: 0.03, bus: "ui", wet: 0.3 }),
      tear: () => { s.noise(0.06, { from: 600, to: 300, gain: 0.3, type: "lowpass" }); s.noise(0.5, { from: 2000, to: 5000, gain: 0.07, at: 0.08, type: "highpass", attack: 0.05 }); },
      spawn: (i) => lute(DORIAN[i * 2], i * 0.12 + 0.05),
      // chuintement de lame qu'on tire
      select: () => { s.noise(0.45, { from: 3000, to: 9000, gain: 0.06, type: "highpass" }); s.tone(vary(1760), 0.6, { type: "triangle", gain: 0.02, slide: 1.02, wet: 0.5 }); },
      flip: (r) => { const n = { N: 2, R: 3, SR: 4, SSR: 5, UR: 6 }[r]; for (let i = 0; i < n; i++) lute(DORIAN[i * 2 % DORIAN.length], 0.03 + i * 0.08, 0.15); },
      // cloche d'église et fanfare de cuivres
      ssr: () => { s.bell(392, 4, { gain: 0.12, partials: [0.5, 1, 1.19, 1.5, 2, 2.74] }); s.pad([293.66, 440, 587.33], 1.8, { gain: 0.03, attack: 0.04, cutoff: 2400, at: 0.15 }); s.pad([349.23, 523.25, 698.46], 1.6, { gain: 0.03, attack: 0.04, cutoff: 2600, at: 0.55 }); },
      urCharge: () => { for (let i = 0; i < 6; i++) s.tone(55, 0.25, { gain: 0.25 + i * 0.05, at: i * 0.2, slide: 0.6, wet: 0.3 }); s.noise(1.2, { from: 120, to: 600, gain: 0.08, type: "lowpass", attack: 1 }); },
      // timbale, cloches et chœur
      urImpact: () => {
        s.tone(65, 1.4, { gain: 0.5, slide: 0.5 }); s.noise(0.5, { from: 400, to: 80, gain: 0.25, type: "lowpass" });
        [0, 0.35, 0.7].forEach((at, i) => s.bell([392, 523.25, 587.33][i], 4, { gain: 0.1, at, partials: [0.5, 1, 1.19, 1.5, 2, 2.74] }));
        s.pad([146.83, 220, 293.66, 349.23, 440], 4.2, { type: "triangle", gain: 0.045, attack: 0.5, cutoff: 1100, at: 0.2 });
      },
      settle: () => { s.noise(0.05, { from: 900, to: 300, gain: 0.12, type: "lowpass", bus: "ui" }); s.tone(vary(147), 0.12, { gain: 0.08, bus: "ui", wet: 0.2 }); },
    };
  },
};
