// Brèche des expéditions : une déchirure verticale lumineuse sur le côté gauche de la scène. Cliquable : mène à /expeditions.
import * as THREE from "three";

export function buildBreche({ GLSL_NOISE, BLUE, MINT }) {
  const group = new THREE.Group(); group.position.set(-2.9, 2.1, 2.2); group.rotation.y = 0.4; group.scale.setScalar(0.78);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uHover: { value: 0 }, uBlue: { value: new THREE.Color(BLUE) }, uMint: { value: new THREE.Color(MINT) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime, uHover; uniform vec3 uBlue, uMint; varying vec2 vUv; ${GLSL_NOISE}
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float w = 0.62 * (1.0 - pow(abs(p.y), 1.5)) + 0.02 * sin(p.y * 9.0 + uTime * 1.5);
        float d = abs(p.x) / max(w, 0.001);
        float inside = 1.0 - smoothstep(0.9, 1.0, d);
        float rim = exp(-pow((d - 1.0) * 7.0, 2.0)) * step(abs(p.y), 0.98);
        float sw = fbm(vec3(p.x * 2.5, p.y * 2.0 - uTime * 0.6, uTime * 0.25));
        vec3 deep = mix(vec3(0.03, 0.05, 0.22), vec3(0.28, 0.12, 0.6), sw);
        vec3 col = mix(deep, mix(uBlue, uMint, sw) * 1.5, smoothstep(0.55, 0.0, d) * (0.5 + sw)) + rim * vec3(0.7, 0.95, 1.0) * (1.2 + uHover);
        float a = clamp(inside * 0.96 + rim * 0.9, 0.0, 1.0);
        gl_FragColor = vec4(col, a);
      }`,
  });
  const rift = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 3.6), mat); group.add(rift);
  // Éclats qui flottent autour de la déchirure
  const shards = new THREE.Group(); group.add(shards);
  const sg = new THREE.TetrahedronGeometry(0.06, 0), sm = new THREE.MeshBasicMaterial({ color: new THREE.Color(MINT).multiplyScalar(1.6) });
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(sg, sm); m.userData = { a: Math.random() * 6.28, r: 0.7 + Math.random() * 0.5, y: (Math.random() - 0.5) * 3.2, s: 0.4 + Math.random() }; shards.add(m); }
  const hit = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 3.6), new THREE.MeshBasicMaterial({ visible: false })); group.add(hit);
  let hover = 0, hovering = false;
  return {
    group, hit,
    set: (v) => (hovering = v),
    update(dt, t) {
      if (!group.visible) return;
      hover += ((hovering ? 1 : 0) - hover) * Math.min(1, dt * 8);
      mat.uniforms.uTime.value = t; mat.uniforms.uHover.value = hover;
      group.scale.setScalar(0.78 * (1 + hover * 0.07)); group.position.y = 2.1 + Math.sin(t * 0.9) * 0.06;
      shards.children.forEach((m) => { const u = m.userData; const a = u.a + t * u.s; m.position.set(Math.cos(a) * u.r, u.y + Math.sin(t * u.s + u.a) * 0.15, Math.sin(a) * 0.3); m.rotation.set(t * u.s, t, 0); });
    },
  };
}
