// Variante « Noyaux de données » : cinq cristaux suspendus qui volent en éclats, puis les éclats se réassemblent en carte.
import * as THREE from "three";

let group, geo, mats;
const SHARDS = 90;

// Un noyau complet (cristal, arêtes, cœur, orbite, attaches, faisceau) ; sert à l'ouverture et au préchauffage
function buildItem(BLUE, c, x, y, z) {
  const root = new THREE.Group(); root.position.set(x, y, z); group.add(root);
  const body = new THREE.Group(); root.add(body);
  const crystal = new THREE.Mesh(geo.crystal, mats.crystal); crystal.scale.set(0.82, 1.35, 0.82); crystal.castShadow = true;
  const edges = new THREE.LineSegments(geo.edges, mats.edge.clone()); edges.scale.copy(crystal.scale);
  const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.95) });
  const core = new THREE.Mesh(geo.inner, coreMat); core.scale.set(1, 1.5, 1);
  const orbit = new THREE.Mesh(geo.orbit, mats.edge.clone()); orbit.rotation.x = Math.PI / 2 + 0.3;
  const clamps = [0, 1].map((k) => { const m = new THREE.Mesh(geo.clamp, mats.chrome); m.rotation.set(Math.PI / 2, 0, k * Math.PI); m.position.y = k ? 0.52 : -0.52; return m; });
  const light = { intensity: 0, color: new THREE.Color() }; // pas de PointLight par objet (recompilation des shaders)
  const beam = new THREE.Mesh(geo.beam, mats.beam.clone()); beam.scale.y = 1.6; beam.position.y = -1.1;
  const hit = new THREE.Mesh(geo.hit, new THREE.MeshBasicMaterial({ visible: false }));
  body.add(crystal, edges, core, orbit, ...clamps, hit); root.add(beam);
  const item = { c, root, body, crystal, edges, core, coreMat, orbit, clamps, light, beam, hit, state: "spawn", seed: Math.random() * 6, hoverK: 0, spin: 0.6 };
  hit.userData.item = item;
  return item;
}

export default {
  text: { open: "Touche la capsule pour activer les noyaux", reveal: "Clique sur un noyau (ou Espace) pour le briser" },
  init({ scene, decor, BLUE }) {
    group = new THREE.Group(); scene.add(group);
    geo = {
      crystal: new THREE.OctahedronGeometry(0.42, 0),
      inner: new THREE.OctahedronGeometry(0.17, 0),
      edges: new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.425, 0)),
      orbit: new THREE.TorusGeometry(0.62, 0.012, 6, 96),
      clamp: new THREE.TorusGeometry(0.36, 0.035, 10, 48, Math.PI * 0.7),
      beam: new THREE.CylinderGeometry(0.05, 0.22, 1, 24, 1, true),
      shard: new THREE.TetrahedronGeometry(0.07, 0),
      hit: new THREE.SphereGeometry(0.62, 12, 8),
    };
    mats = {
      crystal: new THREE.MeshPhysicalMaterial({ color: "#7f9fff", roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.62, flatShading: true, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }),
      edge: new THREE.LineBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.43), transparent: true, opacity: 0.9 }),
      chrome: decor.materials.chrome,
      beam: new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.4), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      shard: new THREE.MeshPhysicalMaterial({ color: "#dfe8ff", roughness: 0.1, flatShading: true, emissive: "#2b6cff", emissiveIntensity: 1.5 }),
    };
  },

  async open(ctx, chars) {
    const { tween, wait, ease, Sfx, burst, BLUE } = ctx;
    const items = chars.map((c, i) => {
      const item = buildItem(BLUE, c, (i - 2) * 1.3, -1.5, 2.3 - Math.abs(i - 2) ** 2 * 0.18), root = item.root;
      root.scale.setScalar(0.01);
      setTimeout(() => { Sfx.spawn(i); tween(1.0, (k) => { root.position.y = -1.5 + 3.2 * k; root.scale.setScalar(Math.max(0.01, k)); }, ease.back).then(() => (item.state = "ready")); }, i * 140);
      return item;
    });
    burst(new THREE.Vector3(0, 0.2, 2.2), [BLUE, "#ffffff", "#00c8b4"], { n: 140, speed: 2.2, gravity: -0.3, additive: true });
    await wait(1.7);
    return items;
  },

  // Préchauffage (écran de chargement) : un noyau et des éclats hors champ, pour compiler les shaders avant la première ouverture
  warm({ BLUE }) {
    buildItem(BLUE, { rarity: "N" }, 0, -60, 0).root.scale.setScalar(1);
    const shards = new THREE.InstancedMesh(geo.shard, mats.shard.clone(), 4); shards.position.y = -60; group.add(shards);
  },

  pickables: (items) => items.filter((i) => i.state === "ready").map((i) => i.hit),
  nextItem: (items) => items.filter((i) => i.state === "ready").sort((a, b) => Math.abs(a.root.position.x) - Math.abs(b.root.position.x))[0],

  async reveal(ctx, item, quick) {
    const { scene, tween, wait, ease, moveTo, Sfx, S, burst, charge, impact, materialize, makeCard, FOCUS, RC, CARD_W, CARD_H, hitStop, fxPulse } = ctx;
    const { c, root, body } = item;
    Sfx.select();
    const spot = new THREE.Vector3(0, 1.95, 4.4);
    item.beam.visible = false;
    await moveTo(root, { pos: spot, scale: 1.15 }, quick ? 0.22 : 0.35, ease.inOut);
    // Surcharge : le noyau s'emballe, les attaches s'écartent, la couleur de rareté perce
    const col = new THREE.Color(RC[c.rarity]);
    await charge(c, (k) => {
      item.spin = 0.6 + k * 14; body.position.x = (Math.random() - 0.5) * 0.03 * k;
      item.clamps[0].position.y = -0.52 - k * 0.25; item.clamps[1].position.y = 0.52 + k * 0.25;
      item.coreMat.color.copy(new THREE.Color(ctx.BLUE).lerp(col, k)).multiplyScalar(1.95 + k * 3); item.light.color.copy(item.coreMat.color); item.light.intensity = 1.2 + k * 10;
    });
    item.coreMat.color.copy(col).multiplyScalar(3.25);
    // Éclatement
    S.sounds.shatter(1); hitStop(0.06); fxPulse(RC[c.rarity], 16, spot);
    const shardMat = mats.shard.clone(); shardMat.emissive.copy(col);
    const shards = new THREE.InstancedMesh(geo.shard, shardMat, SHARDS); scene.add(shards);
    const P = [], V = [], R = [], target = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < SHARDS; i++) {
      P.push(spot.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.25)));
      V.push(new THREE.Vector3().randomDirection().multiplyScalar(1.3 + Math.random() * 3.5));
      R.push(new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6));
      // Cible : un point du cadre de la carte (les éclats dessinent le contour avant le scan)
      const t = Math.random() * 4, cw = CARD_W * 1.1 / 2, ch = CARD_H * 1.1 / 2;
      const tp = t < 1 ? [-cw + t * 2 * cw, ch] : t < 2 ? [cw, ch - (t - 1) * 2 * ch] : t < 3 ? [cw - (t - 2) * 2 * cw, -ch] : [-cw, -ch + (t - 3) * 2 * ch];
      target.push(FOCUS.clone().add(new THREE.Vector3(tp[0], tp[1], 0)));
    }
    const place = (scale) => { for (let i = 0; i < SHARDS; i++) { q.setFromEuler(e.set(R[i].x, R[i].y, R[i].z)); m4.compose(P[i], q, one.clone().multiplyScalar(scale)); shards.setMatrixAt(i, m4); } shards.instanceMatrix.needsUpdate = true; };
    place(1);
    root.visible = false;
    burst(spot, [RC[c.rarity], "#ffffff", "#cfdcff"], { n: 220, speed: 4, size: 0.06, gravity: 0.6, additive: true });
    const imp = impact(c, spot);
    // Les éclats s'envolent, freinent, puis sont aspirés vers le contour de la carte
    let last = 0;
    await tween(0.28, (k) => { const dt = k - last; last = k; for (let i = 0; i < SHARDS; i++) { P[i].addScaledVector(V[i], dt * 0.55 * (1.4 - k)); R[i].addScalar(dt * 4); } place(1); }, (k) => k);
    S.sounds.gather();
    const start = P.map((p) => p.clone());
    await tween(0.3, (k) => { for (let i = 0; i < SHARDS; i++) { P[i].lerpVectors(start[i], target[i], k); R[i].addScalar(0.05); } place(1 - k * 0.6); }, ease.inOut);
    const card = makeCard(c); card.position.copy(FOCUS); card.scale.setScalar(1.1); scene.add(card);
    const mat = materialize(card, 0.43);
    tween(0.25, (k) => place(0.4 * (1 - k))).then(() => { scene.remove(shards); shards.dispose(); });
    await mat;
    await imp;
    await wait(0.15);
    group.remove(root);
    return card;
  },

  update(ctx, items, dt, t, hover) {
    for (const it of items) {
      it.hoverK += ((it === hover ? 1 : 0) - it.hoverK) * Math.min(1, dt * 10);
      it.crystal.rotation.y += dt * it.spin; it.edges.rotation.y = it.crystal.rotation.y;
      it.core.rotation.y -= dt * it.spin * 1.6; it.orbit.rotation.z += dt * (0.8 + it.spin * 0.3);
      if (it.state === "ready") {
        it.body.position.y = Math.sin(t * 1.2 + it.seed) * 0.08 + it.hoverK * 0.18;
        it.coreMat.color.set(it.hoverK > 0.5 ? ctx.MINT : ctx.BLUE).multiplyScalar(1.95 + it.hoverK * 2);
        it.light.intensity = 1.2 + it.hoverK * 4; it.spin = 0.6 + it.hoverK * 1.8;
        it.beam.material.opacity = 0.14 + Math.sin(t * 3 + it.seed) * 0.04 + it.hoverK * 0.15;
      }
    }
  },

  clear() { group.clear(); },
};
