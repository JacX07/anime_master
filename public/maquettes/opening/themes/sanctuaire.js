// Sanctuaire : un temple shinto au clair de lune. Allée de torii, lanternes, cerisiers, étang qui reflète les cartes.
import { vary } from "../core.js";
import { Reflector } from "three/addons/objects/Reflector.js";

// Gamme hirajoshi : la couleur du koto
const HIRA = [293.66, 329.63, 349.23, 440, 466.16, 587.33, 659.25, 698.46, 880, 932.33];

export default {
  id: "sanctuaire", name: "Sanctuaire",
  fonts: "https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@600;800&family=Zen+Kaku+Gothic+New:wght@500;700&display=swap",
  css: `
    :root { --bg: #0e1530; --ink: #f6eedd; --muted: #f6eeddaa; --accent: #e34234; --accent2: #f7c6d0; --hl: #f3d27a;
      --font-display: "Shippori Mincho"; --font-body: "Zen Kaku Gothic New"; --display-weight: 800;
      --panel: #0e1530c8; --panel-line: #f3d27a44; --radius: 4px;
      --logo: #f6eedd; --logo-glow: 0 0 14px #f3d27a55; --header-fade: #0a0f24cc;
      --btn: #0e1530cc; --btn-line: #f3d27a55; --btn-primary: #e34234; --btn-primary-ink: #fff6e6;
      --hint: #f6eedd; --hint-glow: 0 0 10px #0e1530;
      --SSR: #f3d27a; --UR: #e34234;
      --flash: radial-gradient(circle at 50% 45%, #fffbe6 0%, #f3d27aaa 30%, transparent 65%);
      --vig: radial-gradient(ellipse at 50% 45%, transparent 45%, #050816c0 100%);
      --ur-bg: radial-gradient(circle, #3a1020, #0e1530 70%);
      --ur-rays: repeating-conic-gradient(#e3423444 0 4deg, transparent 4deg 15deg, #f3d27a33 15deg 18deg, transparent 18deg 30deg);
      --ur-frame: conic-gradient(from var(--a), #e34234, #f3d27a, #f7c6d0, #7fb6d9, #e34234);
      --ur-label: linear-gradient(90deg, #f3d27a, #fff6e6, #f7c6d0, #f3d27a);
      --ur-glow: #e3423499; --ur-ink: #fff6e6; }
    .hud { border-top: 3px solid #e34234; }
    .booster { width: 170px; aspect-ratio: 1/1.55; }
    .booster .pouch { position: absolute; inset: 14% 0 0; border-radius: 40% 40% 8px 8px / 22% 22% 8px 8px; background: radial-gradient(circle at 50% 30%, #f05a48, #b42a1e 70%); box-shadow: 0 20px 40px #000a, inset 0 0 0 6px #f3d27a55, inset 0 0 0 9px #b42a1e, inset 0 0 0 10px #f3d27a88; }
    .booster .pouch::before { content: ""; position: absolute; inset: 12%; background: repeating-radial-gradient(circle at 50% 120%, transparent 0 10px, #f3d27a33 10px 12px); border-radius: inherit; }
    .booster .cord { position: absolute; left: 50%; top: 0; translate: -50% 0; width: 40px; height: 34%; border: 4px solid #f3d27a; border-radius: 50% 50% 0 0; border-bottom: 0; }
    .booster .knot { position: absolute; left: 50%; top: 18%; translate: -50% 0; width: 26px; height: 26px; border-radius: 50%; background: #f3d27a; box-shadow: 0 2px 4px #0006; }
    .booster .kanji { position: absolute; left: 0; right: 0; top: 40%; text-align: center; font: 800 44px "Shippori Mincho"; color: #fff1d6; text-shadow: 0 2px 0 #0005; writing-mode: vertical-rl; height: 46%; }
  `,
  booster: `<span class="cord"></span><span class="pouch"></span><span class="knot"></span><span class="kanji">御守</span>`,
  text: { open: "Ouvre l'omamori pour recevoir tes cartes", done: "Les esprits ont parlé. Survole tes cartes pour les admirer" },
  rarity: { N: "#a7a3b8", R: "#7fb6d9", SR: "#b48fd6", SSR: "#f3d27a", UR: "#ef5a4a" },
  urFrame: ["#e34234", "#f3d27a", "#fff6e6", "#f7c6d0", "#e34234"], urInk: "#ffd7cf", urStar: "✿",
  card: {
    display: "Shippori Mincho", body: "Zen Kaku Gothic New", ink: "#fff6e6", sub: "#d9cfe0", panel: "#141c3c", shade: "#0b1028", badge: "#0b1028c8", radius: 14, tint: 0.92,
    back(g, w, h) {
      g.fillStyle = "#18224a"; g.fillRect(0, 0, w, h);
      // vagues seigaiha en fils d'or
      g.strokeStyle = "#f3d27a55"; g.lineWidth = 2;
      for (let row = 0, y = 0; y < h + 40; y += 22, row++) for (let x = (row % 2) * 28; x < w + 56; x += 56) for (let r = 28; r > 4; r -= 8) { g.beginPath(); g.arc(x, y, r, Math.PI, 0); g.stroke(); }
      g.fillStyle = "#18224acc"; g.fillRect(70, 70, w - 140, h - 140);
      g.strokeStyle = "#f3d27a"; g.lineWidth = 3; g.strokeRect(70, 70, w - 140, h - 140); g.strokeRect(80, 80, w - 160, h - 160);
      // sceau vermillon
      g.fillStyle = "#e34234"; g.beginPath(); g.arc(w / 2, h / 2 - 30, 92, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff6e6"; g.font = '800 92px "Shippori Mincho"'; g.textAlign = "center"; g.fillText("札", w / 2, h / 2 + 2);
      g.fillStyle = "#f3d27a"; g.font = '800 30px "Shippori Mincho"'; g.fillText("Anime Masters", w / 2, h / 2 + 120);
      g.font = '600 22px "Shippori Mincho"'; g.fillText("ア ニ メ  マ ス タ ー ズ", w / 2, h / 2 + 160);
    },
  },
  render: { exposure: 1.05, bloom: [0.7, 0.6, 1.0] },
  camera: { y: 2.5 },
  fx: { ring: "#f3d27a", spawn: ["#f7c6d0", "#fff6e6", "#f3d27a"], ssr: ["#f3d27a", "#fff6e6", "#ffd98a"], ur: ["#e34234", "#f3d27a", "#f7c6d0", "#ffffff"], gravity: 0.8 },
  ambienceDb: -16, reverb: { seconds: 3, wet: 0.4 },

  env({ THREE, scene, canvasTex, softDot, rng, GLSL_NOISE }) {
    const R = rng(33);
    const MOON = new THREE.Vector3(-0.18, 0.33, -0.93).normalize();
    const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, toneMapped: false, uniforms: { uTime: { value: 0 }, uMoon: { value: MOON } },
      vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; uniform vec3 uMoon; varying vec3 vDir; ${GLSL_NOISE}
        void main() { vec3 d = normalize(vDir);
          vec3 col = mix(vec3(0.17, 0.2, 0.38), vec3(0.04, 0.06, 0.16), smoothstep(-0.05, 0.6, d.y));
          float m = dot(d, uMoon);
          col += vec3(0.6, 0.62, 0.8) * pow(max(m, 0.0), 30.0) * 0.35;
          col = mix(col, vec3(1.0, 0.97, 0.88) * 0.85, smoothstep(0.9988, 0.9991, m));
          if (d.y > 0.0) { vec2 p = d.xz / (d.y + 0.2) * 1.2 + vec2(uTime * 0.006, 0.0); float c = smoothstep(0.55, 0.85, fbm(vec3(p * vec2(1.0, 3.0), 0.0))); col = mix(col, vec3(0.32, 0.34, 0.52) + vec3(0.4) * pow(max(m, 0.0), 8.0), c * 0.55); }
          float s = hash(floor(d * 500.0)); col += vec3(step(0.997, s)) * 0.7 * smoothstep(0.0, 0.3, d.y);
          gl_FragColor = vec4(srgb(col), 1.0); }`,
    }));
    scene.add(sky);
    scene.fog = new THREE.FogExp2("#141a3a", 0.03);
    scene.add(new THREE.HemisphereLight("#6f7fc0", "#0b0f20", 0.7));
    const moonL = new THREE.DirectionalLight("#b9c4ff", 0.8); moonL.position.copy(MOON).multiplyScalar(20); scene.add(moonL);

    // Étang : les cartes et les torii se reflètent dans l'eau
    const water = new Reflector(new THREE.CircleGeometry(30, 64), { textureWidth: innerWidth * 0.5, textureHeight: innerHeight * 0.5, color: "#55607e" });
    water.rotation.x = -Math.PI / 2; water.position.y = -0.62; scene.add(water);
    const ripples = canvasTex(1024, 1024, (g, w, h) => { for (let i = 0; i < 300; i++) { g.strokeStyle = `rgba(160,180,255,${0.03 + R() * 0.06})`; g.lineWidth = 1 + R() * 2; g.beginPath(); g.ellipse(R() * w, R() * h, 20 + R() * 80, 4 + R() * 10, 0, 0, Math.PI * 2); g.stroke(); } });
    ripples.wrapS = ripples.wrapT = THREE.RepeatWrapping; ripples.repeat.set(4, 4);
    const film = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshBasicMaterial({ map: ripples, transparent: true, color: "#0b1028", opacity: 0.62, depthWrite: false })); film.rotation.x = -Math.PI / 2; film.position.y = -0.6; scene.add(film);
    // Berges de pierre et de mousse sur les côtés
    const bankMat = new THREE.MeshStandardMaterial({ color: "#0f1320", roughness: 1 });
    [-1, 1].forEach((s) => { const b = new THREE.Mesh(new THREE.BoxGeometry(14, 1, 60), bankMat); b.position.set(s * 14, -0.3, -12); scene.add(b); });

    // Allée de torii vermillon qui s'enfonce dans la brume
    const verm = new THREE.MeshStandardMaterial({ color: "#d4382a", roughness: 0.6, emissive: "#5a0e08", emissiveIntensity: 0.6 });
    const black = new THREE.MeshStandardMaterial({ color: "#14121a", roughness: 0.7 });
    const torii = (z, s) => {
      const g = new THREE.Group(); g.position.set(0, -0.62, z); g.scale.setScalar(s); scene.add(g);
      [-2.3, 2.3].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 6.2, 16), verm); p.position.set(x, 3.1, 0); g.add(p); const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.5, 16), black); base.position.set(x, 0.25, 0); g.add(base); });
      const nuki = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.32, 0.3), verm); nuki.position.y = 4.8; g.add(nuki);
      const shimaki = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.36, 0.5), verm); shimaki.position.y = 5.75; g.add(shimaki);
      // linteau supérieur aux extrémités relevées
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-3.9, 6.55, 0), new THREE.Vector3(-1.6, 6.15, 0), new THREE.Vector3(0, 6.1, 0), new THREE.Vector3(1.6, 6.15, 0), new THREE.Vector3(3.9, 6.55, 0)]);
      const kasagi = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.24, 8), black); g.add(kasagi);
      const gakuzuka = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.2), verm); gakuzuka.position.y = 5.25; g.add(gakuzuka);
    };
    torii(-7, 1); torii(-13, 1); torii(-19, 1); torii(-25, 1); torii(-31, 1);

    // Lanternes de pierre allumées
    const stone = new THREE.MeshStandardMaterial({ color: "#5a5f6e", roughness: 0.95 });
    const lanterns = [];
    [[-3.6, -2.5], [3.6, -2.5], [-3.6, -9.5], [3.6, -9.5]].forEach(([x, z]) => {
      const g = new THREE.Group(); g.position.set(x, -0.62, z); scene.add(g);
      const add = (geo, y) => { const m = new THREE.Mesh(geo, stone); m.position.y = y; g.add(m); return m; };
      add(new THREE.CylinderGeometry(0.42, 0.5, 0.3, 6), 0.15); add(new THREE.CylinderGeometry(0.14, 0.16, 1.2, 8), 0.9);
      add(new THREE.CylinderGeometry(0.45, 0.3, 0.2, 6), 1.6);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 0.72, 0.28) })); box.position.y = 1.95; g.add(box);
      add(new THREE.ConeGeometry(0.62, 0.45, 6), 2.43); add(new THREE.SphereGeometry(0.1, 8, 8), 2.72);
      const l = new THREE.PointLight("#ffb766", 10, 9, 1.8); l.position.y = 1.95; g.add(l); lanterns.push({ l, seed: R() * 10 });
    });

    // Cerisiers en fleur peints de part et d'autre
    const blossom = canvasTex(1024, 1024, (g, w, h) => {
      g.strokeStyle = "#2a1c22"; g.lineCap = "round";
      const branch = (x, y, a, len, wd, d) => { if (d > 7 || len < 8) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; g.lineWidth = wd; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); if (d > 3) for (let k = 0; k < 6; k++) { g.fillStyle = `hsla(${340 + R() * 15} 70% ${78 + R() * 12}% / ${0.5 + R() * 0.4})`; g.beginPath(); g.arc(x2 + (R() - 0.5) * 60, y2 + (R() - 0.5) * 50, 10 + R() * 22, 0, Math.PI * 2); g.fill(); } branch(x2, y2, a - 0.3 - R() * 0.4, len * 0.75, wd * 0.7, d + 1); branch(x2, y2, a + 0.3 + R() * 0.4, len * 0.72, wd * 0.7, d + 1); };
      branch(w * 0.5, h, -Math.PI / 2, 230, 34, 0);
    });
    [[-8, -4, 9], [8.5, -8, 10], [-9, -16, 11], [9, -20, 12]].forEach(([x, z, s]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshStandardMaterial({ map: blossom, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, emissive: "#ffc0d0", emissiveMap: blossom, emissiveIntensity: 0.35 })); m.position.set(x, s / 2 - 0.65, z); m.rotation.y = -Math.sign(x) * 0.5; scene.add(m); });

    // Pétales de sakura qui tombent en tournoyant, lucioles
    const petal = canvasTex(32, 32, (g) => { g.fillStyle = "#ffd3df"; g.beginPath(); g.moveTo(16, 4); g.bezierCurveTo(30, 10, 26, 28, 16, 28); g.bezierCurveTo(6, 28, 2, 10, 16, 4); g.fill(); });
    const P = 320, pp = new Float32Array(P * 3), seeds = []; for (let i = 0; i < P; i++) { pp.set([(R() - 0.5) * 22, R() * 9 - 0.5, -14 + R() * 20], i * 3); seeds.push(R() * 10); }
    const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pp, 3));
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.11, map: petal, transparent: true, depthWrite: false, alphaTest: 0.2 })));
    const F = 50, fp = new Float32Array(F * 3); for (let i = 0; i < F; i++) fp.set([(R() - 0.5) * 14, R() * 2.5 - 0.4, -6 + R() * 9], i * 3);
    const fGeo = new THREE.BufferGeometry(); fGeo.setAttribute("position", new THREE.BufferAttribute(fp, 3));
    const flies = new THREE.Points(fGeo, new THREE.PointsMaterial({ size: 0.1, map: softDot, color: new THREE.Color(1.4, 1.6, 0.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(flies);

    // Lanternes flottantes qui dérivent sur l'étang
    const floatMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.62, 0.24) });
    const floats = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), floatMat); m.userData = { x: (R() - 0.5) * 9, z: -3 - R() * 10, v: 0.08 + R() * 0.1, s: R() * 6 }; scene.add(m); return m; });

    return {
      update(dt, t) {
        sky.material.uniforms.uTime.value = t;
        ripples.offset.set(t * 0.004, t * 0.01);
        const a = pGeo.attributes.position.array;
        for (let i = 0; i < P; i++) { const s = seeds[i]; a[i * 3] += (Math.sin(t * 0.8 + s) * 0.4 + 0.25) * dt; a[i * 3 + 1] -= (0.35 + (s % 1) * 0.3) * dt; a[i * 3 + 2] += Math.cos(t * 0.6 + s) * 0.2 * dt; if (a[i * 3 + 1] < -0.6) { a[i * 3 + 1] = 8.5; a[i * 3] = (Math.random() - 0.5) * 22; } }
        pGeo.attributes.position.needsUpdate = true;
        const f = fGeo.attributes.position.array; for (let i = 0; i < F; i++) { f[i * 3] += Math.sin(t * 0.7 + i) * 0.004; f[i * 3 + 1] += Math.cos(t * 0.9 + i * 1.3) * 0.003; }
        fGeo.attributes.position.needsUpdate = true; flies.material.opacity = 0.6 + Math.sin(t * 3) * 0.3;
        for (const l of lanterns) l.l.intensity = 10 + Math.sin(t * 5 + l.seed) * 1.2 + Math.sin(t * 11 + l.seed) * 0.6;
        for (const m of floats) { const u = m.userData; u.x += u.v * dt; if (u.x > 6) u.x = -6; m.position.set(u.x, -0.5 + Math.sin(t * 1.2 + u.s) * 0.02, u.z); m.rotation.y = Math.sin(t * 0.4 + u.s) * 0.4; }
      },
    };
  },

  sounds(s) {
    const koto = (f, at = 0, gain = 0.17) => s.pluck(f, 2, { gain, at, damp: 0.995, bright: 0.75, wet: 0.45 });
    const taiko = (at = 0, gain = 0.5) => { s.tone(85, 0.7, { gain, at, slide: 0.6, wet: 0.4 }); s.noise(0.15, { from: 500, to: 120, gain: gain * 0.4, at, type: "lowpass", wet: 0.4 }); };
    return {
      ambience() {
        s.loopNoise({ type: "lowpass", freq: 350, gain: 0.5, lfo: 0.1, lfoDepth: 0.2 });
        // grillons : trilles aiguës par rafales
        s.every(0.6, 2.2, () => { const f = vary(4400, 0.05); for (let k = 0; k < 4; k++) s.tone(f, 0.03, { gain: 0.012, at: k * 0.05, bus: "amb", wet: 0.3 }); });
        // carillon à vent (fūrin)
        s.every(7, 16, () => s.bell(vary(2093, 0.02), 2.5, { gain: 0.02, bus: "amb", partials: [1, 2.4, 4.1] }));
      },
      hover: () => s.pluck(vary(1760, 0.01), 0.5, { gain: 0.05, bright: 0.8, damp: 0.99, bus: "ui", wet: 0.3 }),
      tear: () => { s.noise(0.4, { from: 1200, to: 3000, gain: 0.07, attack: 0.08 }); s.bell(2637, 1.4, { gain: 0.02, at: 0.2 }); },
      spawn: (i) => koto(HIRA[i * 2], i * 0.12 + 0.05),
      // souffle de shakuhachi
      select: () => { s.noise(0.7, { from: 700, to: 900, gain: 0.05, q: 6, attack: 0.15 }); s.tone(vary(587.33, 0.01), 0.7, { gain: 0.04, attack: 0.15, wet: 0.5 }); },
      flip: (r) => { const n = { N: 2, R: 3, SR: 4, SSR: 5, UR: 6 }[r]; for (let i = 0; i < n; i++) koto(HIRA[i + 2], 0.03 + i * 0.07, 0.14); },
      ssr: () => { taiko(0, 0.55); taiko(0.18, 0.35); for (let i = 0; i < 10; i++) koto(HIRA[i], 0.25 + i * 0.04, 0.1); },
      urCharge: () => { for (let i = 0; i < 8; i++) taiko(i * (0.18 - i * 0.012), 0.2 + i * 0.05); },
      // gong, taiko et nappe
      urImpact: () => {
        s.bell(110, 5, { gain: 0.2, partials: [1, 1.48, 2.1, 2.78, 3.6, 4.9] }); taiko(0, 0.7);
        s.pad([146.83, 220, 293.66, 349.23], 4.2, { type: "triangle", gain: 0.04, attack: 0.6, cutoff: 1200, at: 0.3 });
        for (let i = 0; i < 10; i++) koto(HIRA[9 - i], 0.6 + i * 0.09, 0.09);
      },
      settle: () => s.pluck(vary(220, 0.02), 0.4, { gain: 0.1, damp: 0.96, bright: 0.4, bus: "ui", wet: 0.1 }),
    };
  },
};
