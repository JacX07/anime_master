// Décor cyber futuriste : atrium circulaire immaculé, gyroscope d'anneaux, écrans holographiques, drones.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { canvasTex, softDot, rng, GLSL_NOISE } from "../opening/core.js";

export const BLUE = "#2b6cff", MINT = "#00c8b4";
const hdr = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

export function buildDecor({ scene, renderer }) {
  const R = rng(77);
  const updaters = [];

  // Éclairage : environnement de studio pour des reflets réalistes, une lumière clé qui projette des ombres douces
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  scene.fog = new THREE.Fog("#e6edf5", 34, 140);
  scene.add(new THREE.HemisphereLight("#f4f6f9", "#b9c3cf", 0.35));
  const key = new THREE.DirectionalLight("#fffaf2", 1.2);
  key.position.set(-6, 14, 9); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -14; key.shadow.camera.right = 14; key.shadow.camera.top = 14; key.shadow.camera.bottom = -14; key.shadow.camera.far = 40; key.shadow.radius = 6; key.shadow.bias = -0.0005;
  scene.add(key);

  // Ciel au-delà des verrières : bleu pâle et voiles de nuages
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; varying vec3 vDir; ${GLSL_NOISE}
      void main() { vec3 d = normalize(vDir);
        vec3 col = mix(vec3(0.86, 0.88, 0.91), vec3(0.66, 0.72, 0.8), smoothstep(0.0, 0.6, d.y));
        if (d.y > 0.0) { vec2 p = d.xz / (d.y + 0.25) + vec2(uTime * 0.004, 0.0); col = mix(col, vec3(0.97, 0.98, 1.0), smoothstep(0.55, 0.85, fbm(vec3(p * 1.5, 0.0))) * 0.6); }
        gl_FragColor = vec4(srgb(col), 1.0); }`,
  }));
  scene.add(sky);
  updaters.push((dt, t) => (sky.material.uniforms.uTime.value = t));

  // Matériaux : céramique laquée, chrome, verre
  const ceramic = new THREE.MeshPhysicalMaterial({ color: "#f3f6fa", roughness: 0.28, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 });
  const satin = new THREE.MeshPhysicalMaterial({ color: "#dfe6ef", roughness: 0.45, metalness: 0.2, clearcoat: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.08, metalness: 1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#cfe0f2", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  const glowBlue = new THREE.MeshBasicMaterial({ color: hdr(BLUE, 1.7), fog: false });
  const glowMint = new THREE.MeshBasicMaterial({ color: hdr(MINT, 1.5), fog: false });
  const glowWhite = new THREE.MeshBasicMaterial({ color: hdr("#dfeaff", 1.3) });

  // Sol : miroir sous une dalle laquée semi-transparente, joints en anneaux et rayons
  const mirror = new Reflector(new THREE.CircleGeometry(30, 96), { textureWidth: innerWidth * 0.4, textureHeight: innerHeight * 0.4, color: "#b9c3cf" });
  mirror.rotation.x = -Math.PI / 2; mirror.position.y = -0.62; scene.add(mirror);
  if (new URLSearchParams(location.search).has("test")) mirror.visible = false; // ?test : rendu logiciel, le miroir double le coût de chaque image
  const floorMap = canvasTex(2048, 2048, (g, w) => {
    const c = w / 2, px = c / 30;
    g.fillStyle = "#f2f5f9"; g.fillRect(0, 0, w, w);
    for (let r = 4; r < 30; r += 2.6) { g.strokeStyle = "#c3cedb"; g.lineWidth = 3; g.beginPath(); g.arc(c, c, r * px, 0, Math.PI * 2); g.stroke(); }
    for (let k = 0; k < 64; k++) { const a = (k / 64) * Math.PI * 2, r0 = k % 2 ? 9.2 : 4; g.beginPath(); g.moveTo(c + Math.cos(a) * r0 * px, c + Math.sin(a) * r0 * px); g.lineTo(c + Math.cos(a) * 30 * px, c + Math.sin(a) * 30 * px); g.stroke(); }
    // dalles légèrement différentes, comme de vraies plaques
    for (let i = 0; i < 900; i++) { const a = R() * Math.PI * 2, r = 4 + R() * 26; g.fillStyle = R() < 0.5 ? "#ffffff30" : "#00000008"; g.beginPath(); g.arc(c + Math.cos(a) * r * px, c + Math.sin(a) * r * px, 18 + R() * 30, 0, Math.PI * 2); g.fill(); }
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 96), new THREE.MeshPhysicalMaterial({ map: floorMap, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, transparent: true, opacity: 0.86 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.6; scene.add(floor);
  const shadowCatcher = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.ShadowMaterial({ color: "#2a3a55", opacity: 0.16 }));
  shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = -0.595; shadowCatcher.receiveShadow = true; scene.add(shadowCatcher);
  // Bandes lumineuses incrustées : anneaux, rayons courts et balises qui défilent
  [[3.1, glowBlue, 0.035], [9.2, glowBlue, 0.03], [15.4, glowMint, 0.025]].forEach(([r, m, wd]) => { const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + wd, 192), m); ring.rotation.x = -Math.PI / 2; ring.position.y = -0.59; scene.add(ring); });
  const beacons = new THREE.InstancedMesh(new THREE.CircleGeometry(0.05, 12), new THREE.MeshBasicMaterial({ color: hdr(BLUE, 1.9) }), 48);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), one = new THREE.Vector3(1, 1, 1);
  const bp = new THREE.Vector3(), bs = new THREE.Vector3(); // réutilisés : pas d'allocation à chaque image (ramasse-miettes)
  updaters.push((dt, t) => { for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2 + t * 0.08, k = 0.5 + 0.5 * Math.sin(t * 2 - i * 0.6); m4.compose(bp.set(Math.cos(a) * 6.2, -0.588, Math.sin(a) * 6.2), q, bs.copy(one).multiplyScalar(0.4 + k)); beacons.setMatrixAt(i, m4); } beacons.instanceMatrix.needsUpdate = true; });
  scene.add(beacons);

  // Colonnade : piliers arrondis, verrières, bandeau lumineux et poutre circulaire
  const RAD = 24, N = 28;
  const pillarGeo = new RoundedBoxGeometry(1.1, 15, 1.8, 4, 0.35);
  const finGeo = new RoundedBoxGeometry(0.18, 13.6, 0.5, 2, 0.08);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, x = Math.sin(a) * RAD, z = -Math.cos(a) * RAD;
    const p = new THREE.Mesh(pillarGeo, ceramic); p.position.set(x, 6.9, z); p.rotation.y = -a; p.castShadow = true; scene.add(p);
    const fin = new THREE.Mesh(finGeo, glowWhite); fin.position.set(x * 0.985, 6.9, z * 0.985); fin.rotation.y = -a; scene.add(fin);
    const a2 = a + Math.PI / N, w = 2 * RAD * Math.sin(Math.PI / N) - 1.2;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, 14.6), glass); pane.position.set(Math.sin(a2) * RAD, 6.9, -Math.cos(a2) * RAD); pane.rotation.y = -a2; scene.add(pane);
    // traverses fines dans les verrières
    [2.2, 7.5, 12.4].forEach((y) => { const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.06), satin); bar.position.set(Math.sin(a2) * RAD, y, -Math.cos(a2) * RAD); bar.rotation.y = -a2; scene.add(bar); });
  }
  const beam = new THREE.Mesh(new THREE.TorusGeometry(RAD, 0.7, 24, 192), ceramic); beam.rotation.x = Math.PI / 2; beam.position.y = 14.2; scene.add(beam);
  const beamGlow = new THREE.Mesh(new THREE.TorusGeometry(RAD - 0.75, 0.05, 8, 192), glowBlue); beamGlow.rotation.x = Math.PI / 2; beamGlow.position.y = 13.7; scene.add(beamGlow);
  const plinth = new THREE.Mesh(new THREE.TorusGeometry(RAD, 0.5, 16, 192), satin); plinth.rotation.x = Math.PI / 2; plinth.position.y = -0.55; scene.add(plinth);

  // Ville lointaine derrière les verrières : flèches profilées
  const spireMat = new THREE.MeshPhysicalMaterial({ color: "#eef3f9", roughness: 0.3, clearcoat: 1 });
  for (let i = 0; i < 14; i++) {
    const hgt = 25 + R() * 55, base = 2 + R() * 3, pts = [];
    for (let k = 0; k <= 12; k++) { const y = (k / 12) * hgt; pts.push(new THREE.Vector2(base * (1 - Math.pow(k / 12, 1.6)) * (k === 12 ? 0 : 1) + 0.15, y)); }
    const sp = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), spireMat), a = -1.3 + (i / 13) * 2.6, d = 55 + R() * 45;
    sp.position.set(Math.sin(a) * d, -0.6, -Math.cos(a) * d); scene.add(sp);
    const band = new THREE.Mesh(new THREE.TorusGeometry(base * 0.7, 0.08, 6, 32), glowBlue); band.rotation.x = Math.PI / 2; band.position.set(sp.position.x, hgt * 0.35, sp.position.z); scene.add(band);
  }

  // Gyroscope : trois anneaux imbriqués qui tournent sur des axes différents
  const gyro = new THREE.Group(); gyro.position.set(0, 6.4, -15); scene.add(gyro);
  const outer = new THREE.Group(), middle = new THREE.Group(), inner = new THREE.Group(); gyro.add(outer, middle, inner);
  const o1 = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.36, 32, 256), ceramic); o1.castShadow = true; outer.add(o1);
  outer.add(new THREE.Mesh(new THREE.TorusGeometry(6.78, 0.07, 12, 256), chrome));
  outer.add(new THREE.Mesh(new THREE.TorusGeometry(7.62, 0.05, 12, 256), chrome));
  for (let i = 0; i < 24; i++) { const arc = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.045, 6, 12, (Math.PI / 12) * 0.62), i % 6 ? glowBlue : glowMint); arc.position.z = 0.34; arc.rotation.z = (i / 24) * Math.PI * 2; outer.add(arc); }
  const ticks = new THREE.InstancedMesh(new RoundedBoxGeometry(0.1, 0.55, 0.22, 1, 0.03), satin, 120);
  for (let i = 0; i < 120; i++) { const a = (i / 120) * Math.PI * 2, long = i % 5 === 0; m4.compose(new THREE.Vector3(Math.cos(a) * (long ? 8.05 : 7.95), Math.sin(a) * (long ? 8.05 : 7.95), 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, a - Math.PI / 2)), new THREE.Vector3(1, long ? 1.6 : 1, 1)); ticks.setMatrixAt(i, m4); }
  outer.add(ticks);
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Group(); seg.rotation.z = (i / 6) * Math.PI * 2; middle.add(seg);
    const arcLen = (Math.PI / 3) * 0.8;
    const s = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.24, 24, 64, arcLen), ceramic); s.castShadow = true; seg.add(s);
    const strip = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.05, 6, 48, arcLen), glowBlue); strip.position.z = 0.24; seg.add(strip);
    [0, arcLen].forEach((a) => { const node = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.62, 24), chrome); node.position.set(Math.cos(a) * 5.6, Math.sin(a) * 5.6, 0); node.rotation.x = Math.PI / 2; seg.add(node); const cap = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), glowMint); cap.position.set(node.position.x, node.position.y, 0.32); seg.add(cap); });
  }
  inner.add(new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.12, 16, 200), chrome));
  const innerArc = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.13, 8, 64, 1.3), glowWhite); inner.add(innerArc);
  const innerArc2 = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.13, 8, 64, 0.5), glowMint); innerArc2.rotation.z = Math.PI; inner.add(innerArc2);
  // Disque du portail (utilisé par la variante Portail)
  const portalMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, uniforms: { uTime: { value: 0 }, uK: { value: 0 }, uColor: { value: new THREE.Color(BLUE) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; uniform float uK; uniform vec3 uColor; varying vec2 vUv; ${GLSL_NOISE}
      void main() { vec2 p = vUv - 0.5; float r = length(p) * 2.0, a = atan(p.y, p.x);
        float swirl = fbm(vec3(cos(a) * 2.0 + r * 3.0 - uTime * 0.8, sin(a) * 2.0 + r * 3.0, uTime * 0.3 + r * 2.0));
        float rings = 0.5 + 0.5 * sin(r * 26.0 - uTime * 6.0);
        float core = exp(-r * 3.0);
        vec3 col = mix(uColor, vec3(1.0), core) * (0.4 + swirl * 1.4 + rings * 0.3) * (1.5 + uK * 3.0);
        float alpha = smoothstep(1.0, 0.85, r) * (0.15 + 0.85 * uK) * (0.5 + swirl);
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0)); }`,
  });
  const portal = new THREE.Mesh(new THREE.CircleGeometry(4.1, 96), portalMat); inner.add(portal);
  let spin = 1;
  updaters.push((dt, t) => {
    outer.rotation.z += dt * 0.03 * spin; middle.rotation.y = Math.sin(t * 0.15) * 0.5; middle.rotation.z -= dt * 0.08 * spin;
    inner.rotation.x = Math.sin(t * 0.2 + 1) * 0.6; innerArc.rotation.z += dt * 0.9 * spin; innerArc2.rotation.z -= dt * 1.3 * spin;
    gyro.position.y = 6.4 + Math.sin(t * 0.4) * 0.12; portalMat.uniforms.uTime.value = t;
  });

  // Écrans holographiques flottants
  const panelTex = (title, seed) => { const r = rng(seed); return canvasTex(512, 320, (g, w, h) => {
    g.fillStyle = "#2b6cff14"; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 18); g.fill();
    g.strokeStyle = "#2b6cffcc"; g.lineWidth = 3; g.stroke();
    g.fillStyle = "#2b6cff"; g.font = '400 22px "Michroma", sans-serif'; g.fillText(title, 26, 48);
    g.fillRect(26, 62, 120, 3);
    for (let i = 0; i < 12; i++) { const bh = 20 + r() * 120; g.fillStyle = i % 4 ? "#2b6cffaa" : "#00c8b4cc"; g.fillRect(30 + i * 22, h - 40 - bh, 14, bh); }
    g.strokeStyle = "#00c8b4"; g.lineWidth = 6; g.beginPath(); g.arc(w - 100, h / 2 + 20, 62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (0.4 + r() * 0.5)); g.stroke();
    g.strokeStyle = "#2b6cff44"; g.lineWidth = 6; g.beginPath(); g.arc(w - 100, h / 2 + 20, 62, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#2b6cff66"; for (let i = 0; i < 4; i++) g.fillRect(170, 86 + i * 16, 60 + r() * 80, 6);
  }); };
  const panels = [["Flux de cartes", -8.2, 3.6, -5, 0.55, 1], ["Taux de rareté", 8.4, 4.2, -6, -0.55, 2], ["Séries actives", -10.5, 6.2, -11, 0.4, 3], ["Collection", 10.8, 6.8, -12, -0.4, 4]].map(([t, x, y, z, ry, sd]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.1), new THREE.MeshBasicMaterial({ map: panelTex(t, sd), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
    const frame = new THREE.Mesh(new RoundedBoxGeometry(0.06, 1.2, 0.06, 1, 0.02), chrome); frame.position.set(x, y - 1.65, z); scene.add(frame);
    return { m, y, seed: sd };
  });
  updaters.push((dt, t) => panels.forEach((p) => { p.m.position.y = p.y + Math.sin(t * 0.6 + p.seed) * 0.08; p.m.material.opacity = 0.85 + Math.sin(t * 3 + p.seed * 2) * 0.05 + (Math.sin(t * 17 + p.seed) > 0.98 ? -0.4 : 0); }));

  // Drones de maintenance qui patrouillent lentement
  const drones = [0, 1, 2].map((i) => {
    const g = new THREE.Group(); scene.add(g);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 16), ceramic); body.scale.set(1, 0.62, 1); body.castShadow = true; g.add(body);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 48), chrome); ring.rotation.x = Math.PI / 2; g.add(ring);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 8), glowBlue); eye.position.set(0, -0.05, 0.25); g.add(eye);
    return { g, eye, r: 9 + i * 2.5, h: 4.2 + i * 0.9, s: 0.12 + i * 0.04, o: i * 2.1 };
  });
  updaters.push((dt, t) => drones.forEach((d) => { const a = t * d.s + d.o; d.g.position.set(Math.sin(a) * d.r, d.h + Math.sin(t * 1.3 + d.o) * 0.2, -6 - Math.cos(a) * d.r * 0.5); d.g.rotation.y = a + Math.PI / 2; d.g.rotation.z = Math.sin(t + d.o) * 0.1; d.eye.material.color.copy(hdr(Math.sin(t * 3 + d.o) > 0.9 ? MINT : BLUE, 1.8)); }));

  // Rais de lumière tombant des verrières, poussière dorée
  const shaftTex = canvasTex(64, 256, (g, w, h) => { const l = g.createLinearGradient(0, 0, 0, h); l.addColorStop(0, "#ffffff"); l.addColorStop(1, "#ffffff00"); g.fillStyle = l; g.fillRect(0, 0, w, h); const s = g.createLinearGradient(0, 0, w, 0); s.addColorStop(0, "#000"); s.addColorStop(0.5, "#fff"); s.addColorStop(1, "#000"); g.globalCompositeOperation = "multiply"; g.fillStyle = s; g.fillRect(0, 0, w, h); });
  [[-6, -9, 0.35], [5, -11, -0.3], [-1, -13, 0.1]].forEach(([x, z, rz]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 16), new THREE.MeshBasicMaterial({ map: shaftTex, color: "#ffffff", transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); m.position.set(x, 7, z); m.rotation.z = rz; scene.add(m); });
  const D = 200, dp = new Float32Array(D * 3); for (let i = 0; i < D; i++) dp.set([(R() - 0.5) * 18, R() * 9 - 0.5, -12 + R() * 15], i * 3);
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  scene.add(new THREE.Points(dGeo, new THREE.PointsMaterial({ size: 0.04, map: softDot, color: "#9fb8ff", transparent: true, opacity: 0.7, depthWrite: false })));
  updaters.push((dt, t) => { const a = dGeo.attributes.position.array; for (let i = 0; i < D; i++) { a[i * 3 + 1] += dt * 0.08; a[i * 3] += Math.sin(t * 0.3 + i) * 0.002; if (a[i * 3 + 1] > 8.5) a[i * 3 + 1] = -0.5; } dGeo.attributes.position.needsUpdate = true; });

  return {
    gyro, portal, portalMat,
    setSpin: (v) => (spin = v),
    materials: { ceramic, satin, chrome, glass, glowBlue, glowMint, glowWhite },
    update: (dt, t) => updaters.forEach((u) => u(dt, t)),
  };
}
