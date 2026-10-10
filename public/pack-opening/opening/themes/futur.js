// Cyber futuriste : un laboratoire immaculé, lumineux et calme. Blanc nacré, bleu signal, anneaux en lévitation.
import { vary } from "../core.js";

const LYDIAN = [523.25, 587.33, 659.25, 739.99, 783.99, 880, 987.77, 1046.5];

export default {
  id: "futur", name: "Cyber futuriste",
  fonts: "https://fonts.googleapis.com/css2?family=Michroma&family=Sora:wght@400;600&display=swap",
  css: `
    :root { --bg: #e9eff6; --ink: #0d1b2a; --muted: #0d1b2a99; --accent: #2b6cff; --accent2: #00c8b4; --hl: #2b6cff;
      --font-display: "Michroma"; --font-body: "Sora"; --display-weight: 400;
      --panel: #ffffffa8; --panel-line: #ffffff; --radius: 20px;
      --logo: #0d1b2a; --logo-glow: none; --header-fade: #f4f7fb99;
      --btn: #ffffffb0; --btn-line: #ffffff; --btn-primary: #0d1b2a; --btn-primary-ink: #fff;
      --hint: #0d1b2a; --hint-glow: none;
      --SSR: #f2a516; --UR: #ff3b4a;
      --flash: radial-gradient(circle at 50% 45%, #ffffff 0%, #fff4d6aa 30%, transparent 65%);
      --vig: radial-gradient(ellipse at 50% 45%, transparent 60%, #8aa0b833 100%);
      --ur-bg: radial-gradient(circle, #ffffff, #dfe8f3 60%, #c3d3e6);
      --ur-rays: repeating-conic-gradient(#2b6cff1a 0 2deg, transparent 2deg 9deg);
      --ur-frame: conic-gradient(from var(--a), #2b6cff, #00c8b4, #f2a516, #7a5cff, #2b6cff);
      --ur-label: linear-gradient(90deg, #0d1b2a, #2b6cff, #00c8b4, #0d1b2a);
      --ur-glow: #2b6cff55; --ur-ink: #0d1b2a; }
    .logo { font-size: 18px; letter-spacing: .08em; }
    .hud { box-shadow: 0 20px 50px #5a789a33; }
    .hud .big { font-size: 30px; }
    .stock i { height: 6px; border-radius: 3px; } .stock i.on { box-shadow: none; }
    .bar i { height: 4px; } .bar i.on { box-shadow: none; }
    .btn { border-width: 1px; box-shadow: 0 8px 24px #5a789a22; }
    .ur .label { font-size: clamp(36px, 6vw, 84px); letter-spacing: .04em; }
    .booster { width: 170px; aspect-ratio: 1/1.7; }
    .booster .cap { position: absolute; inset: 0; border-radius: 90px; background: linear-gradient(120deg, #ffffffee, #dfe9f5cc 45%, #ffffffee); box-shadow: 0 30px 60px #5a789a55, inset 0 0 0 1px #fff, inset 0 -30px 60px #2b6cff22; backdrop-filter: blur(6px); overflow: hidden; }
    .booster .cap::before { content: ""; position: absolute; left: 50%; top: 50%; width: 60%; aspect-ratio: 1; translate: -50% -50%; border-radius: 50%; border: 2px solid #2b6cff; box-shadow: 0 0 30px #2b6cff66, inset 0 0 20px #2b6cff44; animation: pulse 2.4s ease-in-out infinite; }
    .booster .cap::after { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: #2b6cff66; }
    @keyframes pulse { 50% { scale: 1.08; opacity: .7; } }
    .booster .lbl { position: absolute; bottom: 14%; left: 0; right: 0; text-align: center; font: 400 11px "Michroma"; letter-spacing: .12em; color: #0d1b2a; }
    .booster .num { position: absolute; top: 14%; left: 0; right: 0; text-align: center; font: 400 22px "Michroma"; color: #2b6cff; }
  `,
  booster: `<span class="cap"></span><span class="num">05</span><span class="lbl">Capsule de cartes</span>`,
  text: { open: "Touche la capsule pour l'ouvrir", done: "Synchronisation terminée. Survole tes cartes pour les admirer" },
  rarity: { N: "#9aa8b8", R: "#2b9bff", SR: "#7a5cff", SSR: "#f2a516", UR: "#ff3b4a" },
  urFrame: ["#2b6cff", "#00c8b4", "#f2a516", "#7a5cff", "#2b6cff"], urInk: "#ffd2d6", urStar: "+",
  card: {
    display: "Michroma", body: "Sora", ink: "#ffffff", sub: "#c6d5e6", panel: "#eef3f8", shade: "#0d1b2a", badge: "#0d1b2ac0", radius: 28, tint: 0.98,
    back(g, w, h) {
      // verre bleu nuit : contraste net avec le décor clair
      const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, "#1d3557"); bg.addColorStop(1, "#0d1b2a"); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      const sheen = g.createLinearGradient(0, 0, w, h * 0.6); sheen.addColorStop(0, "#ffffff22"); sheen.addColorStop(0.5, "#ffffff00"); g.fillStyle = sheen; g.fillRect(0, 0, w, h);
      // pistes de circuit fines
      g.strokeStyle = "#5b8cff66"; g.lineWidth = 2;
      const r = (() => { let s = 5; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
      for (let i = 0; i < 26; i++) { let x = 40 + r() * (w - 80), y = 40 + r() * (h - 80); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) { if (r() < 0.5) x += (r() - 0.5) * 160; else y += (r() - 0.5) * 160; g.lineTo(x, y); } g.stroke(); g.fillStyle = "#2b6cff88"; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#0d1b2acc"; g.beginPath(); g.arc(w / 2, h / 2, 120, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#5b8cff"; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h / 2, 120, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = "#00c8b4"; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h / 2, 136, -0.6, 0.9); g.stroke();
      g.fillStyle = "#ffffff"; g.font = '400 64px "Michroma"'; g.textAlign = "center"; g.fillText("AM", w / 2, h / 2 + 24);
      g.font = '400 14px "Michroma"'; g.fillStyle = "#8fb0ff"; g.fillText("ANIME MASTERS · SERIES 01", w / 2, h - 50);
      g.strokeStyle = "#ffffff33"; g.lineWidth = 2; g.beginPath(); g.roundRect(20, 20, w - 40, h - 40, 20); g.stroke();
    },
  },
  render: { toneMapping: "none", bloom: [0.4, 0.4, 1.15] },
  camera: { y: 2.5 },
  fx: { ring: "#2b6cff", blend: "normal", spawn: ["#2b6cff", "#00c8b4", "#ffffff"], ssr: ["#f2a516", "#ffd36b", "#ffffff"], ur: ["#2b6cff", "#00c8b4", "#7a5cff", "#f2a516"], gravity: 0.3, burstSize: 0.08, lineGlow: 0.12 },
  ambienceDb: -18, reverb: { seconds: 3.2, wet: 0.4 },

  env({ THREE, scene, canvasTex, softDot, rng, GLSL_NOISE }) {
    const R = rng(21);
    // Cyclorama : fond infini, dégradé nacré qui se fond dans le sol
    const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; varying vec3 vDir; ${GLSL_NOISE}
        void main() { vec3 d = normalize(vDir);
          vec3 col = mix(vec3(0.96, 0.975, 0.99), vec3(0.74, 0.81, 0.9), smoothstep(0.0, 0.7, d.y));
          col += vec3(0.4, 0.6, 1.0) * 0.06 * smoothstep(0.3, 0.0, abs(d.y - 0.05));
          gl_FragColor = vec4(srgb(col), 1.0); }`,
    }));
    scene.add(sky);
    scene.fog = new THREE.Fog("#eef3f8", 18, 70);
    scene.add(new THREE.HemisphereLight("#ffffff", "#b9c8da", 1.2));
    const sun = new THREE.DirectionalLight("#ffffff", 0.9); sun.position.set(-4, 10, 6); scene.add(sun);

    // Sol laqué : reflet discret sous un voile blanc
    const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshStandardMaterial({ color: "#eef3f8", roughness: 0.3, metalness: 0.05, emissive: "#dbe4ee", emissiveIntensity: 0.75 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.6; scene.add(floor);
    // Ombre de contact sous les cartes
    const shadowTex = canvasTex(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, "#1b2c4433"); r.addColorStop(1, "#1b2c4400"); g.fillStyle = r; g.fillRect(0, 0, 256, 256); });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.59; scene.add(shadow);
    // Lignes lumineuses au sol qui convergent vers le centre
    const lineMat = new THREE.MeshBasicMaterial({ color: "#2b6cff", transparent: true, opacity: 0.5 });
    for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.RingGeometry(3.4 + i * 1.6, 3.42 + i * 1.6, 128), lineMat.clone()); ring.rotation.x = -Math.PI / 2; ring.position.y = -0.585; ring.material.opacity = 0.35 - i * 0.09; scene.add(ring); }

    // Anneaux géants en lévitation derrière la scène
    const white = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.35, metalness: 0.1, emissive: "#e6edf5", emissiveIntensity: 0.45 });
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color("#2b6cff").multiplyScalar(1.6) });
    const rings = [];
    [[10, 0.3, -26, 6], [15, 0.22, -34, 7], [6.5, 0.18, -20, 5]].forEach(([rad, tube, z, y], i) => {
      const g = new THREE.Group(); g.position.set(0, y, z); scene.add(g);
      g.add(new THREE.Mesh(new THREE.TorusGeometry(rad, tube, 24, 160), white));
      const line = new THREE.Mesh(new THREE.TorusGeometry(rad - tube * 1.1, 0.025, 8, 160), glow); g.add(line);
      // segments lumineux qui tournent le long de l'anneau
      const arc = new THREE.Mesh(new THREE.TorusGeometry(rad + tube * 1.15, 0.04, 8, 64, 0.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(i === 1 ? "#00c8b4" : "#2b6cff").multiplyScalar(1.8) })); g.add(arc);
      g.rotation.x = 0.15 + i * 0.12; rings.push({ g, arc, speed: (i % 2 ? -1 : 1) * (0.25 + i * 0.1) });
    });
    // Monolithes au loin
    for (let i = 0; i < 9; i++) { const hgt = 6 + R() * 16; const m = new THREE.Mesh(new THREE.BoxGeometry(1.2 + R() * 2, hgt, 1.2 + R() * 2), white); const a = -1.2 + (i / 8) * 2.4; m.position.set(Math.sin(a) * (42 + R() * 12), hgt / 2 - 0.6, -Math.cos(a) * (42 + R() * 12)); scene.add(m); }

    // Anneaux holographiques fins autour du cercle de cartes
    const holoRings = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(2.9 + i * 0.18, 0.008, 6, 160), new THREE.MeshBasicMaterial({ color: i === 1 ? "#00c8b4" : "#2b6cff", transparent: true, opacity: 0.55 })); m.rotation.x = Math.PI / 2 + (i - 1) * 0.12; m.position.y = 1.55 + (i - 1) * 0.5; scene.add(m); return m; });

    // Particules de données qui s'élèvent lentement
    const P = 160, pp = new Float32Array(P * 3); for (let i = 0; i < P; i++) pp.set([(R() - 0.5) * 16, R() * 8 - 0.6, -10 + R() * 14], i * 3);
    const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pp, 3));
    const sq = canvasTex(32, 32, (g) => { g.fillStyle = "#fff"; g.fillRect(8, 8, 16, 16); });
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.06, map: sq, color: "#2b6cff", transparent: true, opacity: 0.6, depthWrite: false })));

    return {
      update(dt, t) {
        for (const r of rings) { r.g.rotation.z += dt * 0.02 * Math.sign(r.speed); r.arc.rotation.z += dt * r.speed; r.g.position.y += Math.sin(t * 0.5 + r.speed) * 0.002; }
        holoRings.forEach((m, i) => { m.rotation.z += dt * (i % 2 ? -0.3 : 0.2); m.material.opacity = 0.4 + Math.sin(t * 1.5 + i) * 0.15; });
        const a = pGeo.attributes.position.array; for (let i = 0; i < P; i++) { a[i * 3 + 1] += dt * (0.15 + (i % 7) * 0.03); if (a[i * 3 + 1] > 7.5) a[i * 3 + 1] = -0.6; }
        pGeo.attributes.position.needsUpdate = true;
      },
    };
  },

  sounds(s) {
    const ping = (f, at = 0, gain = 0.05, dur = 0.9) => { s.tone(f, dur, { gain, at, attack: 0.004, wet: 0.5 }); s.tone(f * 2, dur * 0.5, { gain: gain * 0.3, at, attack: 0.004, wet: 0.5 }); };
    return {
      ambience() { s.loopNoise({ type: "bandpass", freq: 1800, q: 0.4, gain: 0.25, brown: false, lfo: 0.06, lfoDepth: 0.12 }); s.drone([220, 329.63, 440.5], 0.035); },
      hover: () => s.tone(vary(2637, 0.01), 0.12, { gain: 0.03, bus: "ui", wet: 0.4 }),
      tear: () => { s.noise(0.6, { from: 6000, to: 1200, gain: 0.08, type: "highpass" }); s.tone(1400, 0.05, { type: "square", gain: 0.03, wet: 0.2 }); s.tone(880, 0.6, { gain: 0.05, at: 0.1, slide: 1.5, wet: 0.5 }); },
      spawn: (i) => ping(LYDIAN[i + 1], i * 0.12 + 0.05, 0.05),
      select: () => { s.tone(330, 0.5, { gain: 0.06, slide: 2, attack: 0.05, wet: 0.5 }); s.noise(0.4, { from: 800, to: 4000, gain: 0.03, attack: 0.2 }); },
      flip: (r) => { const n = { N: 2, R: 3, SR: 4, SSR: 5, UR: 6 }[r]; for (let i = 0; i < n; i++) ping(LYDIAN[i] * 2, 0.03 + i * 0.06, 0.045, 0.7); },
      ssr: () => { [1046.5, 1318.5, 1479.98, 1975.5].forEach((f, i) => s.bell(f, 3, { gain: 0.05, at: i * 0.05 })); s.pad([523.25, 659.25, 739.99, 987.77], 2.5, { type: "sine", gain: 0.04, attack: 0.2, wet: 0.7 }); },
      urCharge: () => { s.tone(220, 1.2, { gain: 0.08, slide: 4, attack: 1, wet: 0.5 }); s.noise(1.2, { from: 500, to: 9000, gain: 0.05, attack: 1.1, type: "highpass" }); },
      urImpact: () => {
        s.tone(110, 1.5, { gain: 0.3, slide: 0.5, wet: 0.3 });
        s.pad([261.63, 369.99, 392, 493.88, 587.33, 739.99], 4.2, { type: "sine", gain: 0.035, attack: 0.3, wet: 0.8 });
        for (let i = 0; i < 16; i++) ping(LYDIAN[i % 8] * (i < 8 ? 2 : 4), 0.3 + i * 0.07, 0.03, 0.8);
      },
      settle: () => s.tone(vary(1318.5, 0.01), 0.15, { gain: 0.04, bus: "ui", wet: 0.3 }),
    };
  },
};
