// Capsule « reliquaire » : une coque opaque à facettes (prisme hexagonal et deux pyramides), arêtes lumineuses, cœur qui brille
// à l'intérieur. On ne voit pas dedans : les cinq noyaux n'apparaissent qu'à l'ouverture.
import * as THREE from "three";

const R = 0.78, L = 1.1, H = 0.62; // rayon, hauteur du prisme, hauteur d'une pyramide

export function buildPod({ decor, BLUE, MINT }) {
  const chrome = decor.materials.chrome.clone(); // socle seulement : la capsule n'a plus d'anneaux de métal
  const group = new THREE.Group();
  const body = new THREE.Group(); group.add(body);
  const top = new THREE.Group(), bottom = new THREE.Group(); body.add(top, bottom);

  // Coque opaque : bleu nuit laqué, facettes marquées. Double face pour qu'on voie l'intérieur quand le couvercle saute.
  const glass = new THREE.MeshPhysicalMaterial({ color: "#2a4a8c", emissive: "#0b2150", emissiveIntensity: 0.6, metalness: 0.35, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 2.2, flatShading: true, side: THREE.DoubleSide });
  const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2.1), transparent: true, opacity: 0.95 });
  const prism = new THREE.CylinderGeometry(R, R, L / 2, 6, 1, true), cone = new THREE.ConeGeometry(R, H, 6, 1, true);
  const prismEdges = new THREE.EdgesGeometry(prism), coneEdges = new THREE.EdgesGeometry(cone);

  // Moitié haute ; la moitié basse est la même, retournée
  const half = () => {
    const g = new THREE.Group();
    const p = new THREE.Mesh(prism, glass); p.position.y = L / 4; p.castShadow = true;
    const c = new THREE.Mesh(cone, glass); c.position.y = L / 2 + H / 2; c.castShadow = true;
    const pe = new THREE.LineSegments(prismEdges, edgeMat); pe.position.copy(p.position);
    const ce = new THREE.LineSegments(coneEdges, edgeMat); ce.position.copy(c.position);
    g.add(p, c, pe, ce);
    return g;
  };
  const topHalf = half(), bottomHalf = half(); bottomHalf.rotation.x = Math.PI;
  top.add(topHalf); bottom.add(bottomHalf);

  // Cœur lumineux, caché par la coque jusqu'à l'ouverture
  const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(3) });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), coreMat); core.scale.set(1, 1.5, 1); body.add(core);

  // Socle hexagonal et sa couronne de lumière
  const pedY = -(L / 2 + H) - 0.3;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.16, 6), chrome); ped.position.y = pedY; ped.receiveShadow = true;
  const crown = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.025, 6, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2) })); crown.rotation.x = Math.PI / 2; crown.position.y = pedY + 0.09;
  group.add(ped, crown);

  const inner = new THREE.Group(); body.add(inner); // reçoit les noyaux
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.2, R * 1.2, L + 2 * H, 12), new THREE.MeshBasicMaterial({ visible: false })); group.add(hit);

  return { group, body, top, bottom, topHalf, bottomHalf, glass, edgeMat, coreMat, core, ped, crown, inner, hit, pedY, H, L, R };
}
