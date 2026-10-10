// Capsule 3D du booster : corps de verre en deux moitiés, anneau d'énergie au joint, deck de cartes qui flotte à l'intérieur.
// Elle remplace l'ancien bouton CSS : les reflets de l'environnement glissent sur le verre pendant qu'elle tourne.
import * as THREE from "three";

const R = 0.62, L = 1.25; // rayon, longueur de la partie droite (hauteur totale L + 2R)
const HOME = new THREE.Vector3(0, 1.5, 2.6);

// Une demi-capsule (du joint vers le haut) ; la moitié basse est la même, retournée
function halfGeometry() {
  const pts = [new THREE.Vector2(R, 0), new THREE.Vector2(R, L / 2)];
  for (let i = 1; i <= 20; i++) { const a = (i / 20) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * R, L / 2 + Math.sin(a) * R)); }
  return new THREE.LatheGeometry(pts, 56);
}

export function buildCapsule({ decor, ctx, backTex, BLUE, MINT }) {
  const { tween, ease } = ctx, chrome = decor.materials.chrome;
  const group = new THREE.Group(); group.position.copy(HOME);
  const body = new THREE.Group(); group.add(body);
  const top = new THREE.Group(), bottom = new THREE.Group(); body.add(top, bottom);

  const glass = new THREE.MeshPhysicalMaterial({ color: "#d9e6ff", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.34, clearcoat: 1, clearcoatRoughness: 0.03,
    envMapIntensity: 2.8, iridescence: 0.7, iridescenceIOR: 1.3, side: THREE.DoubleSide, depthWrite: false });
  const half = halfGeometry(), rim = new THREE.TorusGeometry(R + 0.012, 0.036, 12, 64);
  const shellTop = new THREE.Mesh(half, glass), shellBottom = new THREE.Mesh(half, glass); shellBottom.rotation.x = Math.PI;
  const rimTop = new THREE.Mesh(rim, chrome), rimBottom = new THREE.Mesh(rim, chrome); rimTop.rotation.x = rimBottom.rotation.x = Math.PI / 2;
  rimTop.position.y = 0.02; rimBottom.position.y = -0.02;
  const tip = new THREE.SphereGeometry(0.1, 20, 14);
  const tipTop = new THREE.Mesh(tip, chrome), tipBottom = new THREE.Mesh(tip, chrome); tipTop.position.y = L / 2 + R + 0.02; tipBottom.position.y = -tipTop.position.y;
  tipTop.castShadow = tipBottom.castShadow = true;
  top.add(shellTop, rimTop, tipTop); bottom.add(shellBottom, rimBottom, tipBottom);

  // Joint lumineux, visible tant que la capsule est fermée
  const seamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2.2) });
  const seam = new THREE.Mesh(new THREE.TorusGeometry(R + 0.075, 0.02, 8, 72), seamMat); seam.rotation.x = Math.PI / 2; body.add(seam);

  // Intérieur : un noyau, une orbite et cinq cartes en éventail
  const inner = new THREE.Group(); body.add(inner);
  const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2.4) });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), coreMat); inner.add(core);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.008, 6, 72), new THREE.MeshBasicMaterial({ color: new THREE.Color(MINT).multiplyScalar(1.8) })); orbit.rotation.x = Math.PI / 2; inner.add(orbit);
  const deck = new THREE.Group(); inner.add(deck);
  const cardGeo = new THREE.PlaneGeometry(0.7, 0.98);
  const cardMat = new THREE.MeshStandardMaterial({ map: backTex, side: THREE.DoubleSide, roughness: 0.28, metalness: 0.2, emissive: "#ffffff", emissiveMap: backTex, emissiveIntensity: 0.4 });
  for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(cardGeo, cardMat); c.rotation.y = (i - 2) * 0.5; c.position.y = (i - 2) * 0.04; deck.add(c); }

  const hit = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.1, R * 1.1, L + 2 * R, 16), new THREE.MeshBasicMaterial({ visible: false })); group.add(hit);

  let hoverK = 0, hovering = false, opening = false;
  const set = (v) => (hovering = v);

  // Réinitialise et fait entrer la capsule en scène
  function show() {
    opening = false; group.visible = true; group.position.copy(HOME);
    top.position.set(0, 0, 0); top.rotation.set(0, 0, 0); bottom.position.set(0, 0, 0); bottom.rotation.set(0, 0, 0);
    glass.opacity = 0.34; seam.visible = true; seamMat.color.set(BLUE).multiplyScalar(2.2); inner.position.set(0, 0, 0); inner.scale.setScalar(1);
    group.scale.setScalar(0.01);
    return tween(0.9, (k) => group.scale.setScalar(Math.max(0.01, k)), ease.back);
  }

  // Secousse, puis les deux moitiés s'écartent et le deck s'envole
  async function open({ burst, fxPulse, wait }) {
    opening = true; hovering = false;
    await tween(0.5, (k) => {
      group.position.set(HOME.x + (Math.random() - 0.5) * 0.06 * k, HOME.y + (Math.random() - 0.5) * 0.04 * k, HOME.z);
      seamMat.color.set(BLUE).multiplyScalar(2.2 + k * 3); inner.scale.setScalar(1 + k * 0.25);
    }, ease.in);
    group.position.copy(HOME); seam.visible = false;
    burst(HOME, [BLUE, "#ffffff", MINT], { n: 160, speed: 3, additive: true }); fxPulse(BLUE, 14, HOME);
    await tween(0.6, (k) => {
      top.position.y = 1.5 * k; top.rotation.z = -0.6 * k; bottom.position.y = -1.1 * k; bottom.rotation.z = 0.45 * k;
      glass.opacity = 0.34 * (1 - k); inner.position.y = 1.9 * k; inner.scale.setScalar(1.25 * (1 - k * k) + 0.01);
    }, ease.out);
    group.visible = false;
    await wait(0.05);
  }

  function update(dt, t, mouse) {
    if (!group.visible || opening) return;
    hoverK += ((hovering ? 1 : 0) - hoverK) * Math.min(1, dt * 8);
    group.position.y = HOME.y + Math.sin(t * 1.3) * 0.09 + hoverK * 0.1;
    body.rotation.y = t * 0.45; body.rotation.z = -mouse.x * 0.14; body.rotation.x = mouse.y * 0.1;
    inner.rotation.y = -t * 0.9; orbit.rotation.z = t * 1.4; core.rotation.y = t * 2.2; core.scale.setScalar(1 + Math.sin(t * 3) * 0.1 + hoverK * 0.3);
    seamMat.color.set(hoverK > 0.5 ? MINT : BLUE).multiplyScalar(2.2 + hoverK * 1.6);
  }

  return { group, hit, show, open, update, set };
}
