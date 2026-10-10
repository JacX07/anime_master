// Variante « Portail » : cinq clés de coordonnées ; chacune, lancée dans le gyroscope, ouvre le portail
// et le personnage en jaillit jusqu'au premier plan.
import * as THREE from "three";

let group, geo, mats, glyphs;
const GLYPHS = ["01", "02", "03", "04", "05"];

export default {
  text: { open: "Touche la capsule pour calibrer le portail", reveal: "Clique sur une clé (ou Espace) pour l'envoyer dans le portail" },
  init({ scene, decor, canvasTex, BLUE }) {
    group = new THREE.Group(); scene.add(group);
    geo = {
      key: new THREE.CylinderGeometry(0.34, 0.34, 0.09, 6),
      rim: new THREE.TorusGeometry(0.36, 0.02, 6, 6),
      face: new THREE.CircleGeometry(0.27, 6),
      halo: new THREE.RingGeometry(0.42, 0.47, 64),
      hit: new THREE.SphereGeometry(0.5, 12, 8),
    };
    mats = { ceramic: decor.materials.ceramic, chrome: decor.materials.chrome };
    glyphs = GLYPHS.map((t) => canvasTex(128, 128, (g, w, h) => {
      g.strokeStyle = "#2b6cff"; g.lineWidth = 4; g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke();
      g.setLineDash([6, 8]); g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      g.fillStyle = "#2b6cff"; g.font = '400 34px "Michroma", sans-serif'; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t, 64, 66);
    }));
    decor.portalMat.uniforms.uK.value = 0.2;
  },

  async open(ctx, chars) {
    const { tween, wait, ease, Sfx, decor, BLUE } = ctx;
    const from = decor.portal.getWorldPosition(new THREE.Vector3());
    // Calibration : le portail s'allume brièvement et projette les cinq clés
    tween(0.6, (k) => (decor.portalMat.uniforms.uK.value = 0.2 + 0.5 * k));
    const items = chars.map((c, i) => {
      const root = new THREE.Group(); group.add(root);
      const slot = new THREE.Vector3((i - 2) * 1.15, 1.25 + Math.cos((i - 2) * 0.6) * 0.25, 3.0);
      root.position.copy(from); root.scale.setScalar(0.01);
      const body = new THREE.Group(); root.add(body); body.rotation.x = Math.PI / 2;
      const key = new THREE.Mesh(geo.key, mats.ceramic); key.castShadow = true;
      const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.56) });
      const rims = [0.05, -0.05].map((y) => { const r = new THREE.Mesh(geo.rim, glow); r.rotation.set(Math.PI / 2, 0, Math.PI / 6); r.position.y = y; return r; });
      const face = new THREE.Mesh(geo.face, new THREE.MeshBasicMaterial({ map: glyphs[i], transparent: true })); face.rotation.set(-Math.PI / 2, 0, Math.PI / 2); face.position.y = 0.047;
      const haloMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(1.04), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
      const halo = new THREE.Mesh(geo.halo, haloMat); halo.rotation.x = -Math.PI / 2;
      const hit = new THREE.Mesh(geo.hit, new THREE.MeshBasicMaterial({ visible: false }));
      body.add(key, ...rims, face, halo, hit);
      const item = { c, root, body, glow, halo, haloMat, hit, slot, state: "spawn", seed: Math.random() * 6, hoverK: 0 };
      hit.userData.item = item;
      setTimeout(() => {
        Sfx.spawn(i);
        const ctrl = from.clone().lerp(slot, 0.5).add(new THREE.Vector3(0, 2.2, 0)), curve = new THREE.QuadraticBezierCurve3(from.clone(), ctrl, slot);
        tween(1.0, (k) => { root.position.copy(curve.getPoint(k)); root.scale.setScalar(0.2 + 0.8 * k); body.rotation.y = (1 - k) * 6; }, ease.out).then(() => (item.state = "ready"));
      }, 250 + i * 160);
      return item;
    });
    await wait(1.9);
    tween(0.8, (k) => (decor.portalMat.uniforms.uK.value = 0.7 - 0.5 * k));
    return items;
  },

  pickables: (items) => items.filter((i) => i.state === "ready").map((i) => i.hit),
  nextItem: (items) => items.find((i) => i.state === "ready"),

  async reveal(ctx, item, quick) {
    const { scene, tween, wait, ease, Sfx, S, burst, charge, impact, materialize, makeCard, FOCUS, RC, decor, zoomPunch, BLUE } = ctx;
    const { c, root } = item;
    const pm = decor.portalMat.uniforms;
    Sfx.select(); S.sounds.launch();
    // La clé file vers le gyroscope et s'y insère
    const to = decor.portal.getWorldPosition(new THREE.Vector3()), p0 = root.position.clone();
    const curve = new THREE.QuadraticBezierCurve3(p0, p0.clone().lerp(to, 0.4).add(new THREE.Vector3(0, 2.5, 0)), to);
    await tween(quick ? 0.55 : 0.85, (k) => { root.position.copy(curve.getPoint(k)); root.scale.setScalar(1 - k * 0.85); item.body.rotation.y += 0.3; }, ease.in);
    group.remove(root);
    burst(to, ["#ffffff", BLUE, ctx.MINT], { n: 120, speed: 3, size: 0.22, gravity: 0, additive: true });
    // Ouverture : le portail s'ouvre et prend la couleur de la rareté
    S.sounds.warp(); decor.setSpin(3);
    const col = new THREE.Color(RC[c.rarity]), base = new THREE.Color(BLUE);
    await tween(quick ? 0.5 : 0.8, (k) => { pm.uK.value = 0.2 + 0.8 * k; pm.uColor.value.copy(base).lerp(col, k); }, ease.inOut);
    await charge(c, (k) => (pm.uK.value = 1 + k * 0.6));
    // Le personnage jaillit du portail
    S.sounds.whoosh(); zoomPunch(0.2);
    const card = makeCard(c); card.position.copy(to); card.scale.setScalar(0.4); scene.add(card);
    const mat = materialize(card, 0.75);
    const flight = tween(quick ? 0.7 : 0.95, (k) => {
      card.position.lerpVectors(to, FOCUS, k); card.scale.setScalar(0.4 + 0.7 * k); card.rotation.y = (1 - k) * Math.PI * 2;
      if (Math.random() < 0.5) burst(card.position.clone(), [RC[c.rarity], "#ffffff"], { n: 6, speed: 0.4, size: 0.08, gravity: 0, life: 0.6, additive: true });
    }, ease.out);
    await flight;
    const imp = impact(c, FOCUS);
    tween(1.2, (k) => { pm.uK.value = 1.6 - 1.4 * k; pm.uColor.value.copy(col).lerp(base, k); }).then(() => decor.setSpin(1));
    await mat;
    await imp;
    await wait(0.3);
    return card;
  },

  update(ctx, items, dt, t, hover) {
    for (const it of items) {
      it.hoverK += ((it === hover ? 1 : 0) - it.hoverK) * Math.min(1, dt * 10);
      if (it.state !== "ready") continue;
      it.root.position.y = it.slot.y + Math.sin(t * 1.3 + it.seed) * 0.06 + it.hoverK * 0.15;
      it.body.rotation.y = Math.sin(t * 0.8 + it.seed) * 0.35;
      it.haloMat.opacity = it.hoverK * 0.9; it.halo.scale.setScalar(1 + Math.sin(t * 6) * 0.04);
      it.glow.color.set(it.hoverK > 0.5 ? ctx.MINT : ctx.BLUE).multiplyScalar(1.56 + it.hoverK * 1.5);
    }
  },

  clear(ctx) { group.clear(); ctx.decor.portalMat.uniforms.uK.value = 0.2; ctx.decor.portalMat.uniforms.uColor.value.set(ctx.BLUE); },
};
