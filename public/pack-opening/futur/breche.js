// Brèche des expéditions, sur le côté gauche de la scène : une déchirure lumineuse dans un cadre elliptique flottant,
// avec deux anneaux d'énergie et des étincelles qui montent le long de la déchirure. Cliquable : mène à /expeditions.
// Les étincelles sont animées dans le shader (position calculée à partir du temps) : aucune mise à jour côté JS.
import * as THREE from "three";

const H = 3.6, W = 1.7;  // taille de la déchirure (repère local)

export function buildBreche({ GLSL_NOISE, BLUE, MINT, materials }) {
  const group = new THREE.Group(); group.position.set(-2.9, 2.1, 2.2); group.rotation.y = 0.4; group.scale.setScalar(0.78);
  const floating = new THREE.Group(); group.add(floating); // tout ce qui flotte doucement

  // Déchirure : bord irrégulier qui crépite, tourbillon en spirale, étoiles, cœur lumineux ; uHover au survol, uOpen à l'ouverture
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uHover: { value: 0 }, uOpen: { value: 0 }, uBlue: { value: new THREE.Color(BLUE) }, uMint: { value: new THREE.Color(MINT) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime, uHover, uOpen; uniform vec3 uBlue, uMint; varying vec2 vUv; ${GLSL_NOISE}
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float open = 1.0 + uOpen * 0.35 + uHover * 0.06;
        // largeur : lentille + bord déchiqueté qui bouge lentement
        float jag = (fbm(vec3(p.y * 6.0, uTime * 0.7, 1.0)) - 0.5) * 0.22 + (hash(vec2(floor(p.y * 40.0), floor(uTime * 8.0))) - 0.5) * 0.012;
        float w = (0.6 * pow(max(1.0 - abs(p.y), 0.0), 0.75) + jag * (1.0 - abs(p.y))) * open;
        float d = abs(p.x) / max(w, 0.001);
        float inside = 1.0 - smoothstep(0.92, 1.0, d);
        // bord : liseré blanc + crépitement électrique
        float rim = exp(-pow((d - 1.0) * 9.0, 2.0)) * step(abs(p.y), 0.985);
        float crackle = step(0.82, fbm(vec3(p * 9.0, uTime * 3.0))) * exp(-pow((d - 1.05) * 4.0, 2.0));
        // tourbillon : bruit en coordonnées polaires qui tourne
        float r = length(p * vec2(1.6, 0.8)), a = atan(p.y, p.x);
        float sw = fbm(vec3(cos(a) * 1.5 + r * 3.0 - uTime * 0.9, sin(a) * 1.5 + r * 2.0, uTime * 0.3));
        float spiral = 0.5 + 0.5 * sin(a * 3.0 + r * 10.0 - uTime * 2.4);
        vec3 deep = mix(vec3(0.05, 0.03, 0.2), vec3(0.32, 0.14, 0.72), sw);
        vec3 energy = mix(uBlue, uMint, sw) * (1.4 + spiral * 0.6);
        vec3 col = mix(deep, energy, smoothstep(0.75, 0.0, d) * (0.45 + sw * 0.8));
        // étoiles qui scintillent à l'intérieur
        vec2 cell = floor(vUv * vec2(40.0, 80.0));
        float star = step(0.985, hash(cell)) * (0.5 + 0.5 * sin(uTime * 4.0 + hash(cell + 1.0) * 30.0));
        // cœur : fine ligne verticale très lumineuse
        float core = exp(-abs(p.x) * 28.0 / open) * (1.0 - abs(p.y)) * (1.2 + uHover * 0.8 + uOpen * 3.0);
        col += star * 1.4 + core * vec3(0.85, 0.95, 1.0) + rim * vec3(0.8, 0.95, 1.0) * (1.4 + uHover * 1.2) + crackle * vec3(0.75, 0.7, 1.0) * 2.2;
        col += uOpen * vec3(0.6, 0.7, 1.0) * inside;
        float alpha = clamp(inside * 0.97 + rim + crackle, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }`,
  });
  const rift = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); floating.add(rift);

  // Halo doux derrière la déchirure
  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "#ffffff"); r.addColorStop(0.35, "#ffffff66"); r.addColorStop(1, "#ffffff00");
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color("#7b5cff").multiplyScalar(1.3), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.4, H * 1.35), glowMat); glow.position.z = -0.05; floating.add(glow);

  // Deux anneaux d'énergie inclinés qui tournent autour
  const ringMat = (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  const rings = [[BLUE, 1.15, 0.9], [MINT, 1.0, -1.3]].map(([c, r, speed]) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 96, Math.PI * 1.6), ringMat(c));
    m.scale.y = 1.75; m.userData.speed = speed; floating.add(m); return m;
  });

  // Cadre : anneau elliptique en céramique qui flotte autour de la déchirure (liseré lumineux, quatre nœuds chromés, clé de voûte)
  const frame = new THREE.Group(); floating.add(frame);
  const ceramic = materials?.ceramic ?? new THREE.MeshStandardMaterial({ color: "#f3f6fa", roughness: 0.3 });
  const chrome = materials?.chrome ?? new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.1, metalness: 1 });
  const glowBlue = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2.2) });
  const glowMint = new THREE.MeshBasicMaterial({ color: new THREE.Color(MINT).multiplyScalar(2) });
  const RX = 1.12, SY = 1.68; // rayon horizontal du cadre, étirement vertical
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RX, 0.065, 12, 96), ceramic); ring.scale.y = SY; frame.add(ring);
  const ringGlow = new THREE.Mesh(new THREE.TorusGeometry(RX - 0.09, 0.016, 6, 96), glowBlue); ringGlow.scale.y = SY; ringGlow.position.z = 0.04; frame.add(ringGlow);
  const nodeGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.16, 16);
  [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].forEach((a) => {
    const n = new THREE.Mesh(nodeGeo, chrome); n.position.set(Math.cos(a) * RX, Math.sin(a) * RX * SY, 0); n.rotation.x = Math.PI / 2; frame.add(n);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), glowMint); cap.position.set(n.position.x, n.position.y, 0.085); frame.add(cap);
  });
  const keystone = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), glowMint); keystone.position.y = RX * SY + 0.2; frame.add(keystone);

  // Étincelles qui montent du bas de la déchirure vers le haut, en boucle (animées dans le shader)
  const N = 70, seeds = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) seeds.set([Math.random(), Math.random(), Math.random()], i * 3);
  const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3)); sparkGeo.setAttribute("seed", new THREE.BufferAttribute(seeds, 3));
  const sparkMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uHover: { value: 0 }, uMint: { value: new THREE.Color(MINT) }, uBlue: { value: new THREE.Color("#a98bff") } },
    vertexShader: `attribute vec3 seed; uniform float uTime, uHover; varying float vLife; varying float vMix;
      void main() {
        float speed = 0.35 + seed.y * 0.5 + uHover * 0.4;
        float t = fract(seed.x + uTime * speed * 0.18);
        float a = seed.z * 6.2831 + uTime * (0.4 + seed.y);
        float rad = 0.15 + seed.y * 0.6;
        vec3 pos = vec3(cos(a) * rad, -2.1 + t * 4.4, sin(a) * rad * 0.4);
        vLife = sin(t * 3.14159); vMix = seed.z;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = (2.0 + seed.x * 3.0) * (10.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uMint, uBlue; varying float vLife; varying float vMix;
      void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = smoothstep(0.5, 0.0, d) * vLife;
        gl_FragColor = vec4(mix(uMint, uBlue, vMix) * 2.0, a); }`,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat); sparks.frustumCulled = false; floating.add(sparks);

  const hit = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.6, H * 1.25), new THREE.MeshBasicMaterial({ visible: false })); floating.add(hit);

  let hover = 0, hovering = false, openK = 0;
  return {
    group, hit,
    set: (v) => (hovering = v),
    /** Éclat d'ouverture, joué au clic juste avant d'aller aux expéditions */
    burst: () => (openK = 1),
    update(dt, t) {
      if (!group.visible) return;
      hover += ((hovering ? 1 : 0) - hover) * Math.min(1, dt * 8);
      openK = Math.max(0, openK - dt * 2.2);
      mat.uniforms.uTime.value = t; mat.uniforms.uHover.value = hover; mat.uniforms.uOpen.value = openK;
      sparkMat.uniforms.uTime.value = t; sparkMat.uniforms.uHover.value = hover;
      floating.position.y = Math.sin(t * 0.9) * 0.06;
      floating.scale.setScalar(1 + hover * 0.06 + openK * 0.12);
      glowMat.opacity = 0.45 + hover * 0.3 + openK * 0.6 + Math.sin(t * 1.7) * 0.05;
      rings.forEach((m, i) => { m.rotation.y = t * m.userData.speed; m.rotation.z = 0.3 * (i ? -1 : 1) + Math.sin(t * 0.5 + i) * 0.1; m.material.opacity = 0.55 + hover * 0.35; });
      keystone.rotation.y = t * 1.5;
    },
  };
}
