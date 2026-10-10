// Variante « Capsules de stase » : cinq capsules de verre en orbite, qui s'ouvrent dans un souffle de vapeur.
import * as THREE from "three";

let ring, geo, mats;

export default {
  text: { open: "Touche la capsule pour lancer la sélection", reveal: "Clique sur une capsule (ou Espace) pour l'ouvrir" },
  init({ scene, decor }) {
    ring = new THREE.Group(); scene.add(ring);
    const capProfile = [[0, 0], [0.5, 0], [0.6, 0.04], [0.64, 0.12], [0.64, 0.2], [0.56, 0.26], [0.3, 0.3], [0, 0.31]].map(([x, y]) => new THREE.Vector2(x, y));
    geo = {
      cap: new THREE.LatheGeometry(capProfile, 64),
      half: [0, Math.PI].map((s) => new THREE.CylinderGeometry(0.5, 0.5, 1.5, 48, 1, true, s, Math.PI)),
      strut: new THREE.CylinderGeometry(0.025, 0.025, 1.5, 8),
      ringLight: new THREE.TorusGeometry(0.605, 0.018, 8, 96),
      led: new THREE.SphereGeometry(0.035, 12, 8),
      hit: new THREE.CylinderGeometry(0.65, 0.65, 2.1, 12),
      fluid: new THREE.CylinderGeometry(0.47, 0.47, 1.48, 48, 1, true),
      band: new THREE.CylinderGeometry(0.645, 0.645, 0.06, 64, 1, true),
    };
    mats = {
      glass: new THREE.MeshPhysicalMaterial({ color: "#d9e7f6", roughness: 0.12, metalness: 0, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1 }),
      ceramic: decor.materials.ceramic, chrome: decor.materials.chrome,
      // Embouts graphite : ils détachent les capsules du décor blanc
      graphite: new THREE.MeshPhysicalMaterial({ color: "#141b26", roughness: 0.3, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }),
      fluid: new THREE.MeshBasicMaterial({ color: "#1f56e0", transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }),
      mist: (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "#ffffffee"); r.addColorStop(0.5, "#cfe0ff88"); r.addColorStop(1, "#cfe0ff00"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(),
    };
  },

  async open(ctx, chars) {
    const { THREE: _, tween, wait, ease, Sfx, burst, BLUE } = ctx;
    ring.rotation.y = 0;
    const items = chars.map((c, i) => {
      const root = new THREE.Group(), a = (i / chars.length) * Math.PI * 2;
      root.position.set(Math.sin(a) * 2.45, -2, Math.cos(a) * 2.45); root.rotation.y = a; ring.add(root);
      const body = new THREE.Group(); root.add(body);
      const bottom = new THREE.Mesh(geo.cap, mats.graphite); bottom.position.y = -0.75; bottom.rotation.x = Math.PI; bottom.castShadow = true;
      const top = new THREE.Mesh(geo.cap, mats.graphite); top.position.y = 0.75; top.castShadow = true;
      const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.56) });
      const rb = new THREE.Mesh(geo.ringLight, glow); rb.rotation.x = Math.PI / 2; rb.position.y = -0.87;
      const rt = new THREE.Mesh(geo.ringLight, glow); rt.rotation.x = Math.PI / 2; rt.position.y = 0.87;
      const halves = geo.half.map((g) => { const m = new THREE.Mesh(g, mats.glass.clone()); body.add(m); return m; });
      const struts = [0, 1, 2].map((k) => { const s = new THREE.Mesh(geo.strut, mats.chrome); const sa = (k / 3) * Math.PI * 2 + 0.5; s.position.set(Math.cos(sa) * 0.56, 0, Math.sin(sa) * 0.56); body.add(s); return s; });
      const led = new THREE.Mesh(geo.led, new THREE.MeshBasicMaterial({ color: new THREE.Color("#00c8b4").multiplyScalar(1.62) })); led.position.set(0, 1.06, 0); top.add(led); led.position.y = 0.31;
      const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: mats.mist, transparent: true, opacity: 0.4, color: "#9cc0ff", depthWrite: false })); mist.scale.set(0.9, 1.3, 1);
      const fluid = new THREE.Mesh(geo.fluid, mats.fluid.clone());
      const bands = [0.62, -0.62].map((y) => { const b = new THREE.Mesh(geo.band, mats.ceramic); b.position.y = y; return b; });
      // Pas de PointLight par capsule : changer le nombre de lumières recompile tous les shaders
      const core = { intensity: 0, color: new THREE.Color() };
      const hit = new THREE.Mesh(geo.hit, new THREE.MeshBasicMaterial({ visible: false }));
      body.add(bottom, top, rb, rt, fluid, ...bands, mist, hit);
      const item = { c, root, body, top, bottom, fluid, bands, halves, struts, rt, rb, glow, led, mist, core, hit, state: "spawn", seed: Math.random() * 6, hoverK: 0 };
      hit.userData.item = item;
      setTimeout(() => { Sfx.spawn(i); tween(0.9, (k) => (root.position.y = -2 + 3.55 * k), ease.back).then(() => (item.state = "ready")); }, i * 130);
      return item;
    });
    burst(new THREE.Vector3(0, -0.4, 0), [BLUE, "#ffffff", "#00c8b4"], { n: 160, speed: 2.5, gravity: -0.2 });
    await wait(1.5);
    return items;
  },

  pickables: (items) => items.filter((i) => i.state === "ready").map((i) => i.hit),
  nextItem(items) { const v = new THREE.Vector3(); return items.filter((i) => i.state === "ready").sort((a, b) => b.root.getWorldPosition(v).z - a.root.getWorldPosition(new THREE.Vector3()).z)[0]; },

  async reveal(ctx, item, quick) {
    const { scene, tween, wait, ease, moveTo, Sfx, S, burst, fxPulse, charge, impact, materialize, makeCard, FOCUS, RC } = ctx;
    const { c, root, body } = item;
    Sfx.select(); Sfx.unseal();
    scene.attach(root); root.rotation.set(0, new THREE.Euler().setFromQuaternion(root.quaternion, "YXZ").y, 0);
    const spot = FOCUS.clone().setZ(3.4).setY(1.75);
    await moveTo(root, { pos: spot, rotY: 0, scale: 0.95 }, quick ? 0.45 : 0.65, ease.inOut);
    // Montée en pression : la capsule vibre légèrement, la brume s'épaissit
    await charge(c, (k) => { item.mist.material.opacity = 0.4 + k * 0.4; item.fluid.material.opacity = 0.42 + k * 0.3; item.mist.scale.set(0.9 + k * 0.3, 1.3 + k * 0.2, 1); item.core.intensity = 1.5 + k * 6; body.rotation.y = Math.sin(k * 60) * 0.01 * k; });
    // Ouverture : verrous, vapeur, panneaux qui s'écartent, lumière de la rareté
    S.sounds.shatter(0.6);
    const col = RC[c.rarity];
    item.glow.color.set(col).multiplyScalar(1.69); item.core.color.set(col); item.core.intensity = 12; item.fluid.material.color.set(col); fxPulse(col, 14, spot);
    burst(spot.clone().setY(spot.y - 0.6), ["#ffffff", "#e8f0ff", "#dfe8f5"], { n: 140, speed: 1.6, size: 0.35, gravity: -0.6, life: 2.2, rise: 0.8 });
    const card = makeCard(c); card.visible = false; card.position.copy(spot).add(new THREE.Vector3(0, 0.1, 0.05)); card.scale.setScalar(0.72); scene.add(card);
    const opening = tween(0.8, (k) => {
      item.top.position.y = 0.75 + k * 0.7; item.top.rotation.y = k * 1.2; item.bottom.position.y = -0.75 - k * 0.35;
      item.rt.position.y = 0.87 + k * 0.7; item.rb.position.y = -0.87 - k * 0.35;
      item.halves[0].position.x = k * 0.75; item.halves[1].position.x = -k * 0.75;
      item.halves.forEach((h) => (h.material.opacity = 0.38 * (1 - k)));
      item.struts.forEach((s, i) => (s.position.y = (i - 1) * k * 0.4));
      item.fluid.scale.y = Math.max(0.001, 1 - k); item.fluid.position.y = -0.74 * k; item.fluid.material.opacity = 0.7 * (1 - k);
      item.bands.forEach((b) => (b.visible = k < 0.3));
      item.mist.material.opacity = 0.8 * (1 - k); item.mist.scale.set(0.9 + k * 1.5, 1.3 + k, 1);
    }, ease.out);
    await wait(0.25);
    const imp = impact(c, spot);
    await materialize(card, 0.85);
    await opening;
    tween(0.9, (k) => { card.position.lerpVectors(spot.clone().add(new THREE.Vector3(0, 0.1, 0.05)), FOCUS, k); card.scale.setScalar(0.72 + (1.1 - 0.72) * k); }, ease.back);
    tween(0.7, (k) => { root.position.y = spot.y - k * 3; root.scale.setScalar(0.95 * (1 - k * 0.5)); }, ease.in).then(() => scene.remove(root));
    await imp;
    await wait(0.4);
    return card;
  },

  update(ctx, items, dt, t, hover) {
    if (!ctx.reduced) ring.rotation.y += dt * 0.32;
    for (const it of items) {
      it.hoverK += ((it === hover ? 1 : 0) - it.hoverK) * Math.min(1, dt * 10);
      if (it.state === "ready") { it.body.position.y = Math.sin(t * 1.1 + it.seed) * 0.06 + it.hoverK * 0.15; it.core.intensity = 1.5 + it.hoverK * 4; it.glow.color.set(it.hoverK > 0.5 ? "#00c8b4" : ctx.BLUE).multiplyScalar(1.56 + it.hoverK); }
      it.led.visible = Math.sin(t * 4 + it.seed) > 0;
      it.mist.material.rotation += dt * 0.3;
    }
  },

  clear() { ring.clear(); },
};
