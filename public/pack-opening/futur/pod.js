// Capsule « reliquaire » : un étui de verre à facettes (prisme hexagonal et deux pyramides) cerclé de chrome,
// arêtes lumineuses, cœur qui brille au centre, et les cinq noyaux qui y tournent avant de jaillir à l'ouverture.
import * as THREE from "three";
import { softDot } from "../opening/core.js";

const R = 0.78, L = 1.1, H = 0.62; // rayon, hauteur du prisme, hauteur d'une pyramide

export function buildPod({ decor, BLUE, MINT }) {
  const chrome = decor.materials.chrome;
  const group = new THREE.Group();
  const body = new THREE.Group(); group.add(body);
  const top = new THREE.Group(), bottom = new THREE.Group(); body.add(top, bottom);

  const glass = new THREE.MeshPhysicalMaterial({ color: "#bcd2ff", transparent: true, opacity: 0.42, roughness: 0.05, clearcoat: 1, envMapIntensity: 2.4, iridescence: 0.6, flatShading: true, side: THREE.DoubleSide, depthWrite: false });
  const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2.1), transparent: true, opacity: 0.95 });
  const prism = new THREE.CylinderGeometry(R, R, L / 2, 6, 1, true), cone = new THREE.ConeGeometry(R, H, 6, 1, true);
  const prismEdges = new THREE.EdgesGeometry(prism), coneEdges = new THREE.EdgesGeometry(cone);
  const ring = new THREE.TorusGeometry(R + 0.015, 0.04, 8, 6);

  // Moitié haute ; la moitié basse est la même, retournée
  const half = () => {
    const g = new THREE.Group();
    const p = new THREE.Mesh(prism, glass); p.position.y = L / 4;
    const c = new THREE.Mesh(cone, glass); c.position.y = L / 2 + H / 2;
    const pe = new THREE.LineSegments(prismEdges, edgeMat); pe.position.copy(p.position);
    const ce = new THREE.LineSegments(coneEdges, edgeMat); ce.position.copy(c.position);
    const seam = new THREE.Mesh(ring, chrome); seam.rotation.x = Math.PI / 2; seam.position.y = 0.03;
    const band = new THREE.Mesh(ring, chrome); band.rotation.x = Math.PI / 2; band.position.y = L / 2;
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), chrome); tip.position.y = L / 2 + H + 0.06; tip.castShadow = true;
    g.add(p, c, pe, ce, seam, band, tip);
    return g;
  };
  const topHalf = half(), bottomHalf = half(); bottomHalf.rotation.x = Math.PI;
  top.add(topHalf); bottom.add(bottomHalf);

  // Cœur lumineux et anneau d'énergie au joint
  const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(3) });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.27, 0), coreMat); core.scale.set(1, 1.5, 1); body.add(core);
  // Halo : le cœur éclaire l'intérieur du verre
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot, color: new THREE.Color(BLUE).multiplyScalar(1.6), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(2.4); body.add(glow);
  const energy = new THREE.Mesh(new THREE.TorusGeometry(R + 0.07, 0.02, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(MINT).multiplyScalar(2.2) }));
  energy.rotation.x = Math.PI / 2; body.add(energy);

  // Socle hexagonal et sa couronne de lumière
  const pedY = -(L / 2 + H) - 0.3;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.16, 6), chrome); ped.position.y = pedY; ped.receiveShadow = true;
  const crown = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.025, 6, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2) })); crown.rotation.x = Math.PI / 2; crown.position.y = pedY + 0.09;
  group.add(ped, crown);

  const inner = new THREE.Group(); body.add(inner); // reçoit les noyaux
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.2, R * 1.2, L + 2 * H, 12), new THREE.MeshBasicMaterial({ visible: false })); group.add(hit);

  return { glow, group, body, top, bottom, topHalf, bottomHalf, glass, edgeMat, coreMat, core, energy, ped, crown, inner, hit, pedY, H, L, R };
}
