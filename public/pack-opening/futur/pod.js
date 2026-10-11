// Capsule « reliquaire » : une coque de verre teinté à facettes (prisme hexagonal et deux pyramides), arêtes lumineuses, cœur qui brille
// à l'intérieur. Une couche de verre dépoli double la coque : on devine le cœur et les formes, on ne distingue pas les noyaux.
import * as THREE from "three";

const R = 0.78, L = 1.1, H = 0.62; // rayon, hauteur du prisme, hauteur d'une pyramide

export function buildPod({ decor, BLUE, MINT }) {
  const chrome = decor.materials.chrome.clone(); // socle seulement : la capsule n'a plus d'anneaux de métal
  const group = new THREE.Group();
  const body = new THREE.Group(); group.add(body);
  const top = new THREE.Group(), bottom = new THREE.Group(); body.add(top, bottom);

  // Verre teinté bleu pâle : reflets de l'environnement bien marqués, facettes nettes
  const glass = new THREE.MeshPhysicalMaterial({ color: "#b4ccf6", transparent: true, opacity: 0.6, metalness: 0.1, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2.6, iridescence: 0.35, flatShading: true, side: THREE.DoubleSide, depthWrite: false });
  // Verre dépoli juste dessous : il floute ce qu'il y a dedans
  const frost = new THREE.MeshPhysicalMaterial({ color: "#cfdffb", transparent: true, opacity: 0.96, roughness: 0.9, metalness: 0, flatShading: true, side: THREE.DoubleSide, depthWrite: false });
  const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2.1), transparent: true, opacity: 0.95 });
  const prism = new THREE.CylinderGeometry(R, R, L / 2, 6, 1, true), cone = new THREE.ConeGeometry(R, H, 6, 1, true);
  const prismEdges = new THREE.EdgesGeometry(prism), coneEdges = new THREE.EdgesGeometry(cone);

  // Moitié haute ; la moitié basse est la même, retournée
  const half = () => {
    const g = new THREE.Group();
    const p = new THREE.Mesh(prism, glass); p.position.y = L / 4;
    const c = new THREE.Mesh(cone, glass); c.position.y = L / 2 + H / 2;
    const pf = new THREE.Mesh(prism, frost); pf.position.copy(p.position); pf.scale.set(0.95, 1, 0.95);
    const cf = new THREE.Mesh(cone, frost); cf.position.copy(c.position); cf.scale.set(0.95, 0.97, 0.95);
    const pe = new THREE.LineSegments(prismEdges, edgeMat); pe.position.copy(p.position);
    const ce = new THREE.LineSegments(coneEdges, edgeMat); ce.position.copy(c.position);
    // Ordre de dessin : ce qu'il y a dedans d'abord (réglé dans lab.js), puis le verre dépoli, puis le verre teinté, puis les arêtes
    pf.renderOrder = cf.renderOrder = 2; p.renderOrder = c.renderOrder = 3; pe.renderOrder = ce.renderOrder = 4;
    g.add(pf, cf, p, c, pe, ce);
    return g;
  };
  const topHalf = half(), bottomHalf = half(); bottomHalf.rotation.x = Math.PI;
  top.add(topHalf); bottom.add(bottomHalf);

  // Cœur lumineux, caché par la coque jusqu'à l'ouverture
  const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(3) });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), coreMat); core.scale.set(1, 1.5, 1); core.renderOrder = -5; body.add(core);

  // Socle hexagonal et sa couronne de lumière
  const pedY = -(L / 2 + H) - 0.3;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.16, 6), chrome); ped.position.y = pedY; ped.receiveShadow = true;
  const crown = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.025, 6, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2) })); crown.rotation.x = Math.PI / 2; crown.position.y = pedY + 0.09;
  group.add(ped, crown);

  const inner = new THREE.Group(); body.add(inner); // reçoit les noyaux
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.2, R * 1.2, L + 2 * H, 12), new THREE.MeshBasicMaterial({ visible: false })); group.add(hit);

  return { group, body, top, bottom, topHalf, bottomHalf, glass, edgeMat, coreMat, core, ped, crown, inner, hit, pedY, H, L, R };
}
