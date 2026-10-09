// Cyberpunk : une rue de mégapole la nuit, sous la pluie. Néons, sol détrempé qui reflète tout, voitures volantes.
import { vary } from "../core.js";
import { Reflector } from "three/addons/objects/Reflector.js";

const MINOR = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];

export default {
  id: "cyberpunk", name: "Cyberpunk",
  fonts: "https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;700&display=swap",
  css: `
    :root { --bg: #07040d; --ink: #e9f6ff; --muted: #e9f6ffa8; --accent: #05d9e8; --accent2: #ff2a6d; --hl: #f9f871;
      --font-display: "Chakra Petch"; --font-body: "Chakra Petch"; --display-weight: 700;
      --panel: #0b0716c8; --panel-line: #05d9e855; --radius: 0px;
      --logo: #ff2a6d; --logo-glow: 2px 0 #05d9e8, -2px 0 #ff2a6d88, 0 0 18px #ff2a6d88; --header-fade: #07040dcc;
      --btn: #0b0716cc; --btn-line: #05d9e866; --btn-primary: #f9f871; --btn-primary-ink: #07040d;
      --hint: #05d9e8; --hint-glow: 0 0 10px #05d9e8aa;
      --SSR: #ffc93c; --UR: #ff2a6d;
      --flash: radial-gradient(circle at 50% 45%, #fffbd0 0%, #ffc93caa 30%, transparent 65%);
      --vig: radial-gradient(ellipse at 50% 45%, transparent 45%, #000000b0 100%);
      --ur-bg: repeating-linear-gradient(0deg, #ffffff06 0 2px, transparent 2px 4px), radial-gradient(circle, #3a0a2a, #07040d 70%);
      --ur-rays: repeating-conic-gradient(#ff2a6d44 0 3deg, transparent 3deg 10deg, #05d9e844 10deg 13deg, transparent 13deg 22deg);
      --ur-frame: conic-gradient(from var(--a), #ff2a6d, #f9f871, #05d9e8, #b967ff, #ff2a6d);
      --ur-label: linear-gradient(90deg, #ff2a6d, #f9f871, #05d9e8, #ff2a6d);
      --ur-glow: #ff2a6daa; --ur-ink: #e9f6ff; }
    .hud, .btn { clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px)); }
    .hud { border: 0; box-shadow: inset 0 0 0 1px #05d9e855; }
    .hud::before { content: "SYS//STOCK"; position: absolute; top: 6px; right: 18px; font-size: 10px; letter-spacing: .2em; color: #05d9e888; }
    .btn.primary { font-weight: 700; letter-spacing: .06em; }
    .ur .label { text-shadow: 3px 0 #05d9e8aa, -3px 0 #ff2a6daa; }
    .booster { width: 210px; }
    .booster .pack { position: absolute; inset: 0; clip-path: polygon(0 4%, 6% 0, 94% 0, 100% 4%, 100% 96%, 94% 100%, 6% 100%, 0 96%); background: linear-gradient(160deg, #1b1426, #07040d 60%, #1b1426); box-shadow: 0 0 40px #ff2a6d55; }
    .booster .pack::before { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(115deg, transparent 0 40px, #ffffff08 40px 44px); }
    .booster .holo { position: absolute; left: 14%; right: 14%; top: 24%; height: 34%; background: conic-gradient(from var(--a), #ff2a6d, #f9f871, #05d9e8, #b967ff, #ff2a6d); animation: hue 4s linear infinite; mix-blend-mode: screen; opacity: .85; clip-path: polygon(0 0, 100% 0, 100% 80%, 85% 100%, 0 100%); }
    .booster .name { position: absolute; left: 0; right: 0; top: 30%; text-align: center; font: 700 30px "Chakra Petch"; color: #07040d; letter-spacing: .04em; }
    .booster .hazard { position: absolute; left: 0; right: 0; top: 8%; height: 14px; background: repeating-linear-gradient(135deg, #f9f871 0 10px, #07040d 10px 20px); }
    .booster .code { position: absolute; left: 14%; right: 14%; bottom: 14%; height: 34px; background: repeating-linear-gradient(90deg, #e9f6ff 0 2px, transparent 2px 4px, #e9f6ff 4px 7px, transparent 7px 9px, #e9f6ff 9px 10px, transparent 10px 13px); opacity: .8; }
    .booster .meta { position: absolute; left: 14%; bottom: 6%; font: 500 12px "Chakra Petch"; color: #05d9e8; letter-spacing: .1em; }
  `,
  booster: `<span class="pack"></span><span class="hazard"></span><span class="holo"></span><span class="name">GACHA<br>PACK</span><span class="code"></span><span class="meta">5 CARTES · LOT 0x2F</span>`,
  text: { open: "Déchire le pack pour lancer le tirage", done: "Tirage terminé. Survole tes cartes pour les admirer" },
  rarity: { N: "#8a8fa3", R: "#05d9e8", SR: "#b967ff", SSR: "#ffc93c", UR: "#ff2a6d" },
  urFrame: ["#ff2a6d", "#f9f871", "#05d9e8", "#b967ff", "#ff2a6d"], urInk: "#ffd0de", urStar: "◆",
  card: {
    display: "Chakra Petch", body: "Chakra Petch", ink: "#e9f6ff", sub: "#9fd8e8", panel: "#0b0716", shade: "#07040d", badge: "#07040dd0", radius: 10, tint: 0.88,
    ornament(g, c, w, h, col) { g.fillStyle = col; g.fillRect(14, h * 0.62, 6, 70); g.fillRect(w - 20, 120, 6, 50); },
    back(g, w, h) {
      g.fillStyle = "#0b0716"; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4) { g.fillStyle = y % 8 ? "#ffffff05" : "#00000020"; g.fillRect(0, y, w, 2); }
      g.strokeStyle = "#05d9e8"; g.lineWidth = 4; g.beginPath(); g.moveTo(30, 60); g.lineTo(60, 30); g.lineTo(w - 30, 30); g.lineTo(w - 30, h - 60); g.lineTo(w - 60, h - 30); g.lineTo(30, h - 30); g.closePath(); g.stroke();
      g.fillStyle = "#f9f871"; for (let x = 40; x < w - 40; x += 24) { g.beginPath(); g.moveTo(x, 48); g.lineTo(x + 12, 48); g.lineTo(x + 4, 60); g.lineTo(x - 8, 60); g.fill(); }
      // logo avec décalage RVB façon glitch
      g.font = '700 150px "Chakra Petch"'; g.textAlign = "center";
      g.fillStyle = "#05d9e8cc"; g.fillText("AM", w / 2 - 6, h / 2 + 50); g.fillStyle = "#ff2a6dcc"; g.fillText("AM", w / 2 + 6, h / 2 + 50); g.fillStyle = "#e9f6ff"; g.fillText("AM", w / 2, h / 2 + 50);
      for (let i = 0; i < 6; i++) { const y = h / 2 - 60 + Math.random() * 130; g.drawImage(g.canvas, 0, y, w, 8, (Math.random() - 0.5) * 30, y, w, 8); }
      g.font = '500 30px "Chakra Petch"'; g.fillStyle = "#ff2a6d"; g.fillText("アニメマスターズ", w / 2, h / 2 + 110);
      g.fillStyle = "#e9f6ff"; for (let x = 70; x < w - 70; x += 5) if (Math.random() < 0.6) g.fillRect(x, h - 120, Math.random() < 0.3 ? 4 : 2, 50);
      g.font = '500 18px "Chakra Petch"'; g.fillStyle = "#05d9e8"; g.textAlign = "left"; g.fillText("ID//ANM-2F07 · CLASS ???", 70, h - 50);
    },
  },
  render: { exposure: 1, bloom: [0.85, 0.55, 1.0] },
  camera: { y: 2.4, look: [0, 1.5, 0] },
  fx: { ring: "#05d9e8", spawn: ["#05d9e8", "#ff2a6d", "#ffffff"], ssr: ["#ffc93c", "#f9f871", "#ffffff"], ur: ["#ff2a6d", "#05d9e8", "#f9f871", "#b967ff"], gravity: 3 },
  ambienceDb: -15, reverb: { seconds: 1.8, wet: 0.3 },

  env({ THREE, scene, camera, canvasTex, softDot, rng }) {
    const R = rng(13);
    scene.background = new THREE.Color("#0a0614");
    scene.fog = new THREE.FogExp2("#1a0b26", 0.035);
    scene.add(new THREE.HemisphereLight("#5a3a8a", "#0a0614", 0.6));

    // Façades : fenêtres allumées au hasard, quelques étages éteints
    const facade = (seed, hue, wid, hgt) => {
      const r = rng(seed);
      const map = canvasTex(512, 1024, (g, w, h) => {
        g.fillStyle = "#0c0912"; g.fillRect(0, 0, w, h);
        const warm = r() < 0.3, base = warm ? 30 : hue;
        for (let y = 12, floor = 0; y < h; y += 46, floor++) {
          g.fillStyle = "#16121e"; g.fillRect(0, y + 30, w, 6); // dalle d'étage
          const lit = r() < 0.45;
          for (let x = 10; x < w - 10; x += 36) {
            const on = lit && r() < 0.55;
            g.fillStyle = on ? `hsl(${base + r() * 20} ${warm ? 85 : 80}% ${45 + r() * 20}%)` : "#120e18";
            g.globalAlpha = on ? 0.3 + r() * 0.5 : 1; g.fillRect(x, y, 28, 26); g.globalAlpha = 1;
            if (on && r() < 0.3) { g.fillStyle = "#00000088"; g.fillRect(x, y, 28 * r(), 26); } // store à moitié tiré
          }
        }
        for (let x = 0; x < w; x += 144) { g.fillStyle = "#08060c"; g.fillRect(x, 0, 6, h); }
      });
      const emi = canvasTex(512, 1024, (g, w, h) => { g.drawImage(map.image, 0, 0); });
      [map, emi].forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, wid / 6), Math.max(1, hgt / 12)); });
      return new THREE.MeshStandardMaterial({ color: "#1a1622", map, emissive: "#ffffff", emissiveMap: emi, emissiveIntensity: 1.4, roughness: 0.8 });
    };
    const blocks = [];
    for (let side of [-1, 1]) for (let i = 0; i < 7; i++) {
      const hgt = 10 + R() * 22, wid = 4 + R() * 3, dep = 4 + R() * 2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(wid, hgt, dep), facade(20 + i * 3 + side, side < 0 ? 280 : 190, dep, hgt));
      b.position.set(side * (9.5 + wid / 2 + R() * 1.5), hgt / 2 - 0.6, -2 - i * 6 - R() * 2); scene.add(b); blocks.push(b);
    }
    // Tours lointaines en silhouette
    for (let i = 0; i < 14; i++) { const hgt = 25 + R() * 50; const wd = 5 + R() * 6, b = new THREE.Mesh(new THREE.BoxGeometry(wd, hgt, 5), facade(80 + i, 200 + R() * 120, wd, hgt)); b.position.set((R() - 0.5) * 60, hgt / 2 - 0.6, -60 - R() * 30); scene.add(b); }

    // Enseignes néon verticales et horizontales
    const neon = (text, color, vertical, size = 90) => canvasTex(vertical ? 160 : 512, vertical ? 640 : 160, (g, w, h) => {
      g.fillStyle = "#07040dd8"; g.fillRect(0, 0, w, h);
      g.strokeStyle = color; g.lineWidth = 6; g.shadowColor = color; g.shadowBlur = 24; g.strokeRect(10, 10, w - 20, h - 20);
      g.font = `700 ${size}px "Chakra Petch", sans-serif`; g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
      if (vertical) [...text].forEach((ch, i, a) => g.fillText(ch, w / 2, (h / (a.length + 1)) * (i + 1))); else g.fillText(text, w / 2, h / 2 + 4);
    });
    const signs = [];
    const addSign = (text, color, vertical, x, y, z, ry, s = 1) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(vertical ? 1.2 * s : 3.6 * s, vertical ? 4.8 * s : 1.1 * s), new THREE.MeshBasicMaterial({ map: neon(text, color, vertical), color: new THREE.Color(color).multiplyScalar(2.2), transparent: true, side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); signs.push({ m, base: m.material.color.clone(), seed: R() * 10, flicker: R() < 0.35 });
    };
    addSign("ラーメン", "#ff2a6d", true, -9.1, 4.5, -4, Math.PI / 2);
    addSign("ガチャ", "#05d9e8", true, 9.1, 5, -7, -Math.PI / 2);
    addSign("夜市", "#f9f871", true, -9.1, 5.5, -14, Math.PI / 2, 0.8);
    addSign("NEO//TOKYO", "#b967ff", false, 9.1, 2.8, -3, -Math.PI / 2, 0.9);
    addSign("24H", "#05d9e8", false, -9.1, 2.4, -9, Math.PI / 2, 0.6);
    addSign("酒", "#ff2a6d", true, 9.1, 6.5, -16, -Math.PI / 2, 0.6);
    // Grand panneau holographique au fond de la rue
    const holo = new THREE.Mesh(new THREE.PlaneGeometry(12, 6.5), new THREE.ShaderMaterial({
      transparent: true, side: THREE.DoubleSide, uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv;
        void main() {
          vec2 p = vUv - 0.5; float t = uTime;
          float wave = sin(p.x * 10.0 + t * 2.0) * 0.5 + 0.5;
          vec3 a = vec3(1.0, 0.16, 0.43), b = vec3(0.02, 0.85, 0.91);
          vec3 col = mix(a, b, smoothstep(-0.3, 0.3, p.x + sin(t * 0.7) * 0.2));
          float ring = smoothstep(0.02, 0.0, abs(length(p * vec2(1.6, 1.0)) - 0.22 - 0.03 * sin(t * 3.0)));
          float lines = step(0.5, fract(vUv.y * 90.0 - t * 2.0));
          float glitch = step(0.97, fract(sin(floor(vUv.y * 20.0 + floor(t * 6.0)) * 91.7) * 43758.5));
          float a2 = (0.25 + 0.75 * ring + 0.3 * wave * (1.0 - smoothstep(0.0, 0.5, length(p)))) * (0.6 + 0.4 * lines);
          gl_FragColor = vec4(col * 2.0 * a2 + glitch * 0.6, (a2 * 0.7 + glitch * 0.5) * smoothstep(0.5, 0.42, max(abs(p.x), abs(p.y))));
        }`,
    }));
    holo.position.set(0, 6.2, -30); holo.scale.setScalar(1.3); scene.add(holo);

    // Chaussée détrempée : un miroir sous un bitume troué de flaques
    const mirror = new Reflector(new THREE.PlaneGeometry(40, 60), { textureWidth: innerWidth * 0.5, textureHeight: innerHeight * 0.5, color: "#6b6b7a" });
    mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, -0.62, -15); scene.add(mirror);
    const asphalt = canvasTex(1024, 1024, (g, w, h) => {
      g.fillStyle = "#0c0a10"; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = "destination-out";
      for (let i = 0; i < 70; i++) { const x = R() * w, y = R() * h, rx = 30 + R() * 120, ry = rx * (0.3 + R() * 0.5); const gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, "#000f"); gr.addColorStop(0.7, "#000c"); gr.addColorStop(1, "#0000"); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, R() * 3, 0, Math.PI * 2); g.fill(); }
      g.globalCompositeOperation = "source-over";
      for (let i = 0; i < 9000; i++) { g.fillStyle = R() < 0.5 ? "#ffffff08" : "#00000030"; g.fillRect(R() * w, R() * h, 2, 2); }
      g.fillStyle = "#e9e3c855"; for (let y = 0; y < h; y += 160) g.fillRect(w / 2 - 6, y, 12, 90);
    });
    asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping; asphalt.repeat.set(2, 3);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), new THREE.MeshStandardMaterial({ map: asphalt, transparent: true, roughness: 0.9 }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, -0.6, -15); scene.add(road);

    // Pluie : traits qui tombent en biais
    const RN = 2600, rp = new Float32Array(RN * 6);
    const resetDrop = (i, top) => { const x = (R() - 0.5) * 26, y = top ? 12 + R() * 4 : R() * 16 - 0.6, z = -22 + R() * 30; rp.set([x, y, z, x + 0.05, y - 0.45, z], i * 6); };
    for (let i = 0; i < RN; i++) resetDrop(i, false);
    const rGeo = new THREE.BufferGeometry(); rGeo.setAttribute("position", new THREE.BufferAttribute(rp, 3));
    const rain = new THREE.LineSegments(rGeo, new THREE.LineBasicMaterial({ color: "#9fb8e8", transparent: true, opacity: 0.35, depthWrite: false }));
    scene.add(rain);

    // Vapeur qui s'échappe des bouches d'aération
    const steamTex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "#ffffff55"); r.addColorStop(1, "#fff0"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
    const steam = Array.from({ length: 18 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, color: "#c9a0ff", transparent: true, opacity: 0, depthWrite: false })); s.userData = { x: i < 9 ? -4.6 : 4.4, z: i < 9 ? -4 : -9, life: (i % 9) / 9 }; scene.add(s); return s; });

    // Voitures volantes : traînées lumineuses au loin
    const carTex = canvasTex(128, 16, (g, w, h) => { const l = g.createLinearGradient(0, 0, w, 0); l.addColorStop(0, "#0000"); l.addColorStop(1, "#fff"); g.fillStyle = l; g.fillRect(0, 4, w, 8); });
    const cars = Array.from({ length: 8 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.12), new THREE.MeshBasicMaterial({ map: carTex, color: new THREE.Color(i % 2 ? "#ff2a6d" : "#f9f871").multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.userData = { lane: 8 + (i % 4) * 2.5, z: -18 - (i % 3) * 8, speed: (i % 2 ? 1 : -1) * (6 + R() * 6), x: (R() - 0.5) * 50 }; if (m.userData.speed < 0) m.rotation.y = Math.PI; scene.add(m); return m; });

    // Lumière néon d'ambiance, rose d'un côté et cyan de l'autre
    const pinkL = new THREE.PointLight("#ff2a6d", 40, 18, 1.6); pinkL.position.set(-7, 4, -3); scene.add(pinkL);
    const cyanL = new THREE.PointLight("#05d9e8", 40, 18, 1.6); cyanL.position.set(7, 4, -6); scene.add(cyanL);

    return {
      update(dt, t) {
        holo.material.uniforms.uTime.value = t;
        const p = rGeo.attributes.position.array;
        for (let i = 0; i < RN; i++) { const o = i * 6; p[o + 1] -= 22 * dt; p[o + 4] -= 22 * dt; p[o] += 1.2 * dt; p[o + 3] += 1.2 * dt; if (p[o + 4] < -0.6) resetDrop(i, true); }
        rGeo.attributes.position.needsUpdate = true;
        for (const s of signs) if (s.flicker) { const off = Math.sin(t * 9 + s.seed) > 0.96 || (Math.sin(t * 0.7 + s.seed) > 0.97 && Math.sin(t * 40) > 0); s.m.material.color.copy(s.base).multiplyScalar(off ? 0.15 : 1); }
        for (const s of steam) { const u = s.userData; u.life += dt * 0.25; if (u.life > 1) u.life -= 1; s.position.set(u.x + Math.sin(u.life * 6) * 0.3, -0.6 + u.life * 3.5, u.z); s.scale.setScalar(0.8 + u.life * 3); s.material.opacity = Math.sin(u.life * Math.PI) * 0.35; }
        for (const c of cars) { const u = c.userData; u.x += u.speed * dt; if (u.x > 30) u.x = -30; if (u.x < -30) u.x = 30; c.position.set(u.x, u.lane, u.z); }
        pinkL.intensity = 40 + Math.sin(t * 2.3) * 6; cyanL.intensity = 40 + Math.sin(t * 1.7 + 1) * 6;
      },
      onReveal(r) { if (r === "SSR" || r === "UR") signs.forEach((s) => s.m.material.color.copy(s.base).multiplyScalar(3)); },
    };
  },

  sounds(s) {
    const synth = (f, at = 0, gain = 0.06, dur = 0.35) => { s.tone(f, dur, { type: "sawtooth", gain, at, cutoff: 2200, wet: 0.25 }); s.tone(f * 1.005, dur, { type: "square", gain: gain * 0.5, at, cutoff: 1600, wet: 0.25 }); };
    return {
      ambience() {
        s.loopNoise({ type: "highpass", freq: 1400, gain: 0.55, brown: false });
        s.loopNoise({ type: "lowpass", freq: 500, gain: 0.5 });
        s.drone([48, 96.3], 0.08, "sawtooth");
        s.every(6, 14, () => s.tone(vary(700, 0.1), 2.5, { type: "sine", gain: 0.012, slide: 1.4, bus: "amb", wet: 0.6, attack: 0.6 }));
      },
      hover: () => s.tone(vary(2400, 0.02), 0.04, { type: "square", gain: 0.025, bus: "ui", wet: 0 }),
      tear: () => { for (let i = 0; i < 9; i++) s.tone(vary(300 + i * 220, 0.1), 0.03, { type: "square", gain: 0.05, at: i * 0.03, wet: 0.1 }); s.noise(0.3, { from: 6000, to: 800, gain: 0.08, at: 0.25 }); },
      spawn: (i) => synth(MINOR[i + 2] * 2, i * 0.12 + 0.06, 0.04, 0.2),
      select: () => { s.noise(0.35, { from: 200, to: 4000, gain: 0.08, attack: 0.25 }); s.tone(55, 0.5, { gain: 0.25, at: 0.25, slide: 0.7 }); },
      flip: (r) => { const n = { N: 2, R: 3, SR: 4, SSR: 5, UR: 6 }[r]; for (let i = 0; i < n; i++) synth(MINOR[i + 1] * 2, 0.03 + i * 0.06, 0.05, 0.25); },
      ssr: () => { s.tone(60, 0.8, { gain: 0.45, slide: 0.5, wet: 0 }); [440, 523.25, 659.25, 880].forEach((f) => [-12, -4, 4, 12].forEach((c) => s.tone(f * Math.pow(2, c / 1200), 1.6, { type: "sawtooth", gain: 0.012, attack: 0.02, cutoff: 4000, wet: 0.4 }))); },
      urCharge: () => { s.noise(1.2, { from: 80, to: 6000, gain: 0.12, attack: 1.1 }); for (let i = 0; i < 12; i++) s.tone(110 * (1 + i / 12), 0.06, { type: "square", gain: 0.03, at: i * 0.09, wet: 0 }); },
      urImpact: () => {
        s.tone(70, 1.6, { gain: 0.65, slide: 0.4, wet: 0 }); s.noise(0.6, { from: 5000, to: 100, gain: 0.25 });
        const arp = [440, 523.25, 659.25, 880, 1046.5, 880, 659.25, 523.25];
        for (let i = 0; i < 24; i++) synth(arp[i % 8], 0.4 + i * 0.11, 0.035, 0.15);
        s.pad([220, 261.63, 329.63, 440], 3.5, { gain: 0.02, at: 0.4, cutoff: 2500 });
      },
      settle: () => { s.tone(vary(1200), 0.03, { type: "square", gain: 0.03, bus: "ui", wet: 0 }); s.tone(vary(600), 0.05, { type: "square", gain: 0.02, at: 0.04, bus: "ui", wet: 0 }); },
    };
  },
};
