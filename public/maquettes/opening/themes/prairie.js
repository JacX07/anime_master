// Prairie : fin d'après-midi sur une plaine fleurie, à la Frieren. Doux, lumineux, calme.
import { vary } from "../core.js";

const PAL = { sky: "#a9c8e6", haze: "#f3e7cf", sage: "#7fa27a", deep: "#4f7461", blue: "#6d9fd6", lav: "#a99bdc", honey: "#e8b45c", ink: "#2b3a36" };
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];

export default {
  id: "prairie", name: "Prairie",
  fonts: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Nunito:wght@500;700&display=swap",
  css: `
    :root { --bg: ${PAL.sky}; --ink: ${PAL.ink}; --muted: #2b3a36b0; --accent: #4d7fb8; --accent2: ${PAL.lav}; --hl: #b06f17;
      --font-display: "Cormorant Garamond"; --font-body: "Nunito"; --display-weight: 700;
      --panel: #fffaf0b8; --panel-line: #ffffffcc; --radius: 22px;
      --logo: #2f4f6e; --logo-glow: 0 1px 0 #fff8; --header-fade: #fffaf066;
      --btn: #fffaf0b0; --btn-line: #ffffffdd; --btn-primary: linear-gradient(135deg, #5b8fc8, #9b86d6); --btn-primary-ink: #fff;
      --hint: #2f4f6e; --hint-glow: 0 1px 8px #fff;
      --SSR: #d99a2b; --UR: #a77fe0;
      --flash: radial-gradient(circle at 50% 45%, #fffbe8 0%, #ffe3a0aa 30%, transparent 65%);
      --vig: radial-gradient(ellipse at 50% 45%, transparent 55%, #4a5d6e55 100%);
      --ur-bg: radial-gradient(circle, #fffaf0, #cfe0f2 60%, #a9c8e6);
      --ur-rays: repeating-conic-gradient(#ffffffaa 0 6deg, transparent 6deg 14deg, #e9d8ff88 14deg 19deg, transparent 19deg 26deg);
      --ur-frame: conic-gradient(from var(--a), #f7d78b, #b9a5f0, #9cd0f0, #c6e8b0, #f7d78b);
      --ur-label: linear-gradient(90deg, #c98a2b, #a77fe0, #4d7fb8, #6aa36a, #c98a2b);
      --ur-glow: #ffffffcc; --ur-ink: ${PAL.ink}; }
    .ur .label { font-style: italic; }
    .ur .star { color: #fff; text-shadow: 0 0 8px #a77fe0; }
    .hud .big { font-size: 40px; }
    .booster { width: 230px; aspect-ratio: 4/3; }
    .booster .env { position: absolute; inset: 0; border-radius: 10px; background: linear-gradient(160deg, #fffaf0, #f1e6cf); box-shadow: 0 18px 40px #3b4d5a55, inset 0 0 0 1px #d9c9a8; overflow: hidden; }
    .booster .env::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 58%; background: linear-gradient(160deg, #fbf4e3, #ead9b8); clip-path: polygon(0 0, 100% 0, 50% 100%); filter: drop-shadow(0 2px 2px #0002); }
    .booster .seal { position: absolute; left: 50%; top: 50%; translate: -50% -38%; width: 64px; height: 64px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #8fb6e6, #4d7fb8 70%); box-shadow: 0 3px 8px #2b3a3655, inset 0 -3px 6px #0003; display: grid; place-items: center; color: #fff; font: italic 700 26px "Cormorant Garamond"; }
    .booster .lbl { position: absolute; bottom: 12px; left: 0; right: 0; text-align: center; font: italic 600 18px "Cormorant Garamond"; color: #6b5a3a; }
  `,
  booster: `<span class="env"></span><span class="seal">❀</span><span class="lbl">Une lettre de 5 cartes</span>`,
  text: { open: "Ouvre la lettre pour découvrir tes cartes", done: "Quelle jolie cueillette. Survole tes cartes pour les admirer" },
  rarity: { N: "#a9b4a2", R: "#6d9fd6", SR: "#a48be0", SSR: "#e0a93a", UR: "#b48ae8" },
  urFrame: ["#f7d78b", "#b9a5f0", "#9cd0f0", "#c6e8b0", "#f7d78b"], urInk: "#fff", urStar: "❀",
  card: {
    display: "Cormorant Garamond", body: "Nunito", ink: "#fffaf0", sub: "#e9e2d0", panel: "#efe7d6", shade: "#26323a", badge: "#26323ab0", radius: 30, tint: 0.97,
    back(g, w, h) {
      g.fillStyle = "#f5eedf"; g.fillRect(0, 0, w, h);
      // grain de papier aquarelle
      for (let i = 0; i < 2600; i++) { g.fillStyle = Math.random() < 0.5 ? "#00000008" : "#ffffff20"; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      const wash = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, h * 0.65); wash.addColorStop(0, "#cfe0f288"); wash.addColorStop(1, "#cfe0f200"); g.fillStyle = wash; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#6d9fd6"; g.lineWidth = 4; g.beginPath(); g.roundRect(22, 22, w - 44, h - 44, 20); g.stroke();
      g.lineWidth = 1.5; g.beginPath(); g.roundRect(34, 34, w - 68, h - 68, 14); g.stroke();
      // branches botaniques au trait dans les coins
      const sprig = (x, y, a, s) => {
        g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s); g.strokeStyle = "#5f8a6a"; g.fillStyle = "#8fb58f66"; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(40, -30, 110, -20); g.stroke();
        for (let k = 0; k < 6; k++) { const t = 15 + k * 16, side = k % 2 ? 1 : -1; g.beginPath(); g.ellipse(t, -t * 0.22 + side * 9, 11, 5, side * 0.6, 0, Math.PI * 2); g.fill(); g.stroke(); }
        g.restore();
      };
      sprig(48, 120, -0.5, 1); sprig(w - 48, h - 120, Math.PI - 0.5, 1); sprig(w - 60, 90, Math.PI + 0.6, 0.8); sprig(60, h - 90, 0.6, 0.8);
      // fleur centrale
      g.save(); g.translate(w / 2, h / 2);
      for (let k = 0; k < 5; k++) { g.rotate((Math.PI * 2) / 5); g.fillStyle = "#8fb6e6cc"; g.beginPath(); g.ellipse(0, -38, 20, 36, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#4d7fb8"; g.lineWidth = 2; g.stroke(); }
      g.fillStyle = "#e8b45c"; g.beginPath(); g.arc(0, 0, 14, 0, Math.PI * 2); g.fill(); g.restore();
      g.fillStyle = "#4d6f8f"; g.font = 'italic 700 40px "Cormorant Garamond"'; g.textAlign = "center"; g.fillText("Anime Masters", w / 2, h - 70);
    },
  },
  render: { toneMapping: "none", bloom: [0.3, 0.5, 1.05] },
  camera: { y: 2.4, look: [0, 1.3, 0] },
  fx: { ring: "#fff6dc", blend: "normal", spawn: ["#ffffff", "#cfe0ff", "#ffd7e6"], ssr: ["#ffe7a3", "#ffffff", "#f4c25e"], ur: ["#ffffff", "#d7c4ff", "#a9d8ff", "#ffe7a3"], gravity: 0.5, burstSize: 0.12, lineGlow: 0.1 },
  ambienceDb: -16, reverb: { seconds: 2.8, wet: 0.35 },

  env({ THREE, scene, canvasTex, softDot, rng, GLSL_NOISE }) {
    const SUN = new THREE.Vector3(-0.55, 0.22, -0.8).normalize();
    // Ciel : dégradé, halo du soleil bas, nuages cotonneux
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, toneMapped: false, uniforms: { uTime: { value: 0 }, uSun: { value: SUN } },
      vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; uniform vec3 uSun; varying vec3 vDir; ${GLSL_NOISE}
        void main() {
          vec3 d = normalize(vDir);
          vec3 top = vec3(0.28, 0.52, 0.86), hor = vec3(0.86, 0.9, 0.88);
          vec3 col = mix(hor, top, smoothstep(-0.02, 0.45, d.y));
          float s = max(dot(d, uSun), 0.0);
          col += vec3(1.0, 0.85, 0.6) * (pow(s, 6.0) * 0.35 + pow(s, 400.0) * 1.2);
          if (d.y > 0.0) {
            vec2 p = d.xz / (d.y + 0.15) * 1.3 + vec2(uTime * 0.008, 0.0);
            float c = smoothstep(0.5, 0.78, fbm(vec3(p, uTime * 0.004)));
            vec3 cloud = mix(vec3(1.0, 0.97, 0.92), vec3(0.82, 0.86, 0.94), smoothstep(0.6, 1.0, fbm(vec3(p * 2.0, 1.0))));
            col = mix(col, cloud + vec3(1.0, 0.8, 0.55) * pow(s, 4.0) * 0.4, c * smoothstep(0.0, 0.25, d.y) * 0.9);
          }
          gl_FragColor = vec4(srgb(col), 1.0);
        }`,
    }));
    scene.add(sky);

    // Collines peintes en couches, de plus en plus pâles avec la distance (perspective atmosphérique)
    const hill = (seed, z, y, wWorld, hWorld, colTop, colBot, extras) => {
      const R = rng(seed);
      const tex = canvasTex(2048, 512, (g, w, h) => {
        const ph = [R() * 6, R() * 6, R() * 6];
        const top = (x) => h * 0.45 - Math.sin(x / w * Math.PI * 2 * 1.3 + ph[0]) * h * 0.12 - Math.sin(x / w * Math.PI * 2 * 3.1 + ph[1]) * h * 0.05 - Math.sin(x / w * Math.PI * 2 * 7 + ph[2]) * h * 0.015;
        const gr = g.createLinearGradient(0, h * 0.25, 0, h); gr.addColorStop(0, colTop); gr.addColorStop(1, colBot);
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 8) g.lineTo(x, top(x)); g.lineTo(w, h); g.closePath(); g.fill();
        extras?.(g, w, h, top, R);
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wWorld, hWorld), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
      m.position.set(0, y, z); scene.add(m); return m;
    };
    const tree = (g, x, base, s) => {
      g.fillStyle = "#56766b"; g.fillRect(x - 5 * s, base - 70 * s, 10 * s, 70 * s);
      [[0, -110, 60], [-38, -88, 42], [40, -86, 44], [-14, -140, 40], [22, -128, 38]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * s, base + dy * s, r * s, 0, Math.PI * 2); g.fill(); });
    };
    hill(3, -150, 6, 520, 130, "#a3bdd8", "#b9cddc");
    hill(7, -95, 2, 340, 85, "#86aab0", "#9cb9b4", (g, w, h, top) => { g.fillStyle = "#7d9fa4"; tree(g, w * 0.7, top(w * 0.7) + 6, 0.9); });
    hill(11, -60, 0, 220, 55, "#6f9f78", "#82ad80", (g, w, h, top) => {
      // ruines d'un ancien portique de pierre
      const x = w * 0.28, b = top(x) + 10; g.fillStyle = "#8e9f9a";
      g.fillRect(x - 60, b - 120, 22, 120); g.fillRect(x + 40, b - 95, 22, 95); g.fillRect(x - 68, b - 132, 90, 18);
      g.fillStyle = "#5d8a68"; tree(g, w * 0.8, top(w * 0.8) + 8, 1.3);
    });
    hill(19, -32, -0.6, 130, 30, "#5e9458", "#6fa25e");

    // Sol : herbe douce avec variations de teinte
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 120), new THREE.ShaderMaterial({
      toneMapped: false,
      vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `varying vec3 vW; ${GLSL_NOISE}
        void main() {
          float n = fbm(vec3(vW.xz * 0.25, 0.0)), m = fbm(vec3(vW.xz * 1.5, 3.0));
          vec3 col = mix(vec3(0.27, 0.48, 0.24), vec3(0.47, 0.66, 0.3), n);
          col = mix(col, vec3(0.58, 0.72, 0.36), m * 0.3);
          float far = smoothstep(8.0, 30.0, -vW.z);
          col = mix(col, vec3(0.42, 0.62, 0.38), far * 0.6);
          gl_FragColor = vec4(srgb(col), 1.0);
        }`,
    }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.6, -20); scene.add(ground);

    // Brins d'herbe instanciés qui ondulent au vent
    const BL = 9000, R = rng(42);
    const bladeGeo = new THREE.BufferGeometry();
    bladeGeo.setAttribute("position", new THREE.Float32BufferAttribute([-0.025, 0, 0, 0.025, 0, 0, 0, 1, 0], 3));
    const grassMat = new THREE.ShaderMaterial({
      toneMapped: false, side: THREE.DoubleSide, uniforms: { uTime: { value: 0 } },
      vertexShader: `uniform float uTime; varying float vH; varying float vTone;
        void main() {
          vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vec3 p = position; vH = p.y;
          float wind = sin(uTime * 1.3 + base.x * 0.35 + base.z * 0.2) * 0.5 + sin(uTime * 2.7 + base.x * 1.1) * 0.2;
          vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
          w.x += wind * 0.16 * p.y * p.y; w.z += wind * 0.06 * p.y * p.y;
          vTone = fract(sin(dot(base.xz, vec2(12.9898, 78.233))) * 43758.5453);
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `varying float vH; varying float vTone; vec3 srgb(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
        void main() { vec3 root = vec3(0.17, 0.36, 0.17), tip = mix(vec3(0.5, 0.72, 0.3), vec3(0.7, 0.8, 0.38), vTone);
          gl_FragColor = vec4(srgb(mix(root, tip, vH)), 1.0); }`,
    });
    const grass = new THREE.InstancedMesh(bladeGeo, grassMat, BL);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < BL; i++) {
      const x = (R() - 0.5) * 30, z = -16 + R() * 21;
      e.set((R() - 0.5) * 0.3, R() * Math.PI, (R() - 0.5) * 0.3); q.setFromEuler(e);
      const s = (0.25 + R() * 0.45) * (z > 1 ? 0.55 : 1);
      m4.compose(new THREE.Vector3(x, -0.6, z), q, new THREE.Vector3(1 + R(), s, 1)); grass.setMatrixAt(i, m4);
    }
    scene.add(grass);

    // Fleurs bleues de Frieren, blanches et lavande
    const flowerTex = canvasTex(64, 64, (g) => {
      g.translate(32, 32); g.fillStyle = "#fff";
      for (let k = 0; k < 5; k++) { g.rotate((Math.PI * 2) / 5); g.beginPath(); g.ellipse(0, -13, 8, 13, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#ffd36b"; g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.fill();
    });
    const FL = 2600, fp = new Float32Array(FL * 3), fc = new Float32Array(FL * 3), cols = [new THREE.Color("#7fb0ee"), new THREE.Color("#a4c8f5"), new THREE.Color("#ffffff"), new THREE.Color("#c3b4f0")];
    for (let i = 0; i < FL; i++) {
      // en nappes, plus denses par endroits
      const cx = Math.sin(i * 0.37) * 9, x = cx + (R() - 0.5) * 12, z = -12 + R() * 16;
      fp.set([x, -0.6 + 0.2 + R() * 0.25, z], i * 3); const c = cols[i % 7 < 4 ? 0 : i % 7 < 5 ? 1 : i % 7 < 6 ? 2 : 3]; fc.set([c.r, c.g, c.b], i * 3);
    }
    const fGeo = new THREE.BufferGeometry(); fGeo.setAttribute("position", new THREE.BufferAttribute(fp, 3)); fGeo.setAttribute("color", new THREE.BufferAttribute(fc, 3));
    scene.add(new THREE.Points(fGeo, new THREE.PointsMaterial({ size: 0.24, map: flowerTex, vertexColors: true, transparent: true, alphaTest: 0.4, toneMapped: false })));

    // Pétales et graines portés par le vent, lucioles dorées
    const petalTex = canvasTex(32, 32, (g) => { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(16, 16, 7, 13, 0.5, 0, Math.PI * 2); g.fill(); });
    const PT = 220, pp = new Float32Array(PT * 3), pv = [];
    for (let i = 0; i < PT; i++) { pp.set([(R() - 0.5) * 24, R() * 7 - 0.4, -14 + R() * 20], i * 3); pv.push(0.3 + R() * 0.6, R() * 6); }
    const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pp, 3));
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.09, map: petalTex, color: "#fff4f8", transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false })));
    const MO = 70, mp = new Float32Array(MO * 3); for (let i = 0; i < MO; i++) mp.set([(R() - 0.5) * 14, R() * 3.5 - 0.3, -6 + R() * 10], i * 3);
    const mGeo = new THREE.BufferGeometry(); mGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3));
    const motes = new THREE.Points(mGeo, new THREE.PointsMaterial({ size: 0.12, map: softDot, color: new THREE.Color(1.6, 1.3, 0.7), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    scene.add(motes);

    // Ombre douce sous le cercle de cartes pour les ancrer dans la prairie
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(7, 5), new THREE.MeshBasicMaterial({ map: softDot, color: "#1f3a1c", transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, -0.55, 0); scene.add(pool);

    return {
      update(dt, t) {
        sky.material.uniforms.uTime.value = t; grassMat.uniforms.uTime.value = t;
        const a = pGeo.attributes.position.array;
        for (let i = 0; i < PT; i++) {
          a[i * 3] += (0.5 + Math.sin(t * 0.7 + pv[i * 2 + 1]) * 0.3) * pv[i * 2] * dt;
          a[i * 3 + 1] += Math.sin(t * 1.3 + pv[i * 2 + 1]) * 0.15 * dt - 0.05 * dt;
          if (a[i * 3] > 12) { a[i * 3] = -12; a[i * 3 + 1] = Math.random() * 7 - 0.4; }
          if (a[i * 3 + 1] < -0.5) a[i * 3 + 1] = 6.5;
        }
        pGeo.attributes.position.needsUpdate = true;
        motes.material.opacity = 0.5 + Math.sin(t * 2) * 0.2;
        motes.position.y = Math.sin(t * 0.4) * 0.15;
      },
    };
  },

  sounds(s) {
    const harp = (f, at = 0, gain = 0.16) => s.pluck(f, 2.2, { gain, at, damp: 0.998, bright: 0.35, wet: 0.5 });
    return {
      ambience() {
        s.loopNoise({ type: "bandpass", freq: 420, q: 0.5, gain: 0.7, lfo: 0.08, lfoDepth: 0.4 });
        s.every(4, 11, () => { const f = vary(3200, 0.2); [0, 0.11, 0.2].forEach((at) => s.tone(f * (1 + at), 0.09, { gain: 0.02, at, slide: 1.3, bus: "amb", wet: 0.6 })); });
      },
      hover: () => s.pluck(vary(1567.98, 0.01), 0.6, { gain: 0.05, bright: 0.3, bus: "ui", wet: 0.3 }),
      tear: () => { s.noise(0.45, { from: 2500, to: 6000, gain: 0.08, type: "highpass", attack: 0.05 }); s.noise(0.2, { from: 900, to: 1800, gain: 0.06, at: 0.25 }); },
      spawn: (i) => harp(PENTA[i], i * 0.12 + 0.08, 0.12),
      select: () => { s.noise(0.5, { from: 300, to: 1200, gain: 0.05, type: "lowpass", attack: 0.1 }); harp(392, 0.05, 0.08); },
      flip: (r) => { const n = { N: 2, R: 3, SR: 4, SSR: 5, UR: 6 }[r]; for (let i = 0; i < n; i++) harp(PENTA[i + 1], 0.04 + i * 0.07, 0.12); },
      ssr: () => { for (let i = 0; i < 8; i++) harp(PENTA[i] * 2, i * 0.045, 0.08); s.bell(1046.5, 3, { gain: 0.06, at: 0.4 }); s.pad([523.25, 659.25, 783.99], 2.6, { type: "triangle", gain: 0.03, attack: 0.3, cutoff: 2500 }); },
      urCharge: () => { s.pad([261.63, 392], 1.4, { type: "triangle", gain: 0.035, attack: 1, cutoff: 1500 }); s.noise(1.3, { from: 300, to: 2400, gain: 0.05, type: "bandpass", attack: 1 }); },
      urImpact: () => {
        [0, 0.5, 1].forEach((at) => s.bell([1046.5, 1318.5, 1567.98][at * 2], 4, { gain: 0.07, at }));
        s.pad([261.63, 329.63, 392, 523.25, 659.25], 4, { type: "triangle", gain: 0.03, attack: 0.5, cutoff: 3000 });
        for (let i = 0; i < 12; i++) harp(PENTA[i % 8] * (i < 8 ? 1 : 2), 0.2 + i * 0.06, 0.07);
      },
      settle: () => s.pluck(vary(196, 0.02), 0.4, { gain: 0.12, damp: 0.97, bright: 0.2, bus: "ui", wet: 0.1 }),
    };
  },
};
