// Mesure de performance (ouvrir la page avec ?perf) : images par seconde, temps CPU et GPU de chaque image,
// appels de dessin, et interrupteurs pour couper un poste de coût et voir tout de suite ce que ça change.
//   B halo (bloom) · M miroir du sol · S ombres · K ciel · P résolution (1,5 → 1 → 0,75)

export function createPerf({ renderer, toggles, setPixelRatio }) {
  const box = document.createElement("pre");
  box.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:99;margin:0;padding:10px 12px;border-radius:10px;background:#000c;color:#9ff;font:12px/1.45 ui-monospace,monospace;pointer-events:none;white-space:pre";
  document.body.append(box);

  renderer.info.autoReset = false; // sinon les compteurs ne montrent que la dernière passe, pas l'image entière
  const frames = []; // intervalle entre images (ms)
  const cpu = [];    // temps passé par le JS à préparer une image (ms)
  let t0 = 0, lastShown = 0;
  const state = Object.fromEntries(Object.keys(toggles).map((k) => [k, true]));
  const ratios = [1.5, 1, 0.75]; let ri = 0;

  // Minuteur GPU (si le navigateur l'expose) : temps réel passé par la carte graphique
  const gl = renderer.getContext();
  const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
  let query = null, gpuMs = null;

  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "p") { ri = (ri + 1) % ratios.length; setPixelRatio(ratios[ri]); return; }
    const entry = Object.entries(toggles).find(([, t]) => t.key === k);
    if (entry) { state[entry[0]] = !state[entry[0]]; entry[1].set(state[entry[0]]); }
  });

  return {
    begin() {
      t0 = performance.now();
      renderer.info.reset();
      if (ext && !query) { query = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, query); }
    },
    end(now) {
      if (ext && query && !query.__ended) { gl.endQuery(ext.TIME_ELAPSED_EXT); query.__ended = true; }
      if (ext && query?.__ended && gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE) && !gl.getParameter(ext.GPU_DISJOINT_EXT)) {
        gpuMs = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6; gl.deleteQuery(query); query = null;
      }
      cpu.push(performance.now() - t0);
      if (lastShown) frames.push(now - lastShown);
      lastShown = now;
      if (frames.length > 120) frames.shift();
      if (cpu.length > 120) cpu.shift();
      if (frames.length % 30 !== 0 || frames.length === 0) return;
      const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
      const sorted = [...frames].sort((a, b) => a - b), p95 = sorted[Math.floor(sorted.length * 0.95)];
      const r = renderer.info.render;
      const flags = Object.entries(toggles).map(([n, t]) => `${t.key.toUpperCase()} ${n}: ${state[n] ? "oui" : "NON"}`).join("   ");
      box.textContent =
        `${(1000 / avg(frames)).toFixed(0)} images/s   image ${avg(frames).toFixed(1)} ms   pire 5 % ${p95.toFixed(1)} ms\n` +
        `CPU (JS) ${avg(cpu).toFixed(1)} ms   GPU ${gpuMs === null ? "n/d" : gpuMs.toFixed(1) + " ms"}   ratio pixels ${renderer.getPixelRatio().toFixed(2)}\n` +
        `appels ${r.calls}   triangles ${r.triangles}   textures ${renderer.info.memory.textures}   programmes ${renderer.info.programs?.length ?? "?"}\n` +
        `${flags}   P résolution`;
    },
  };
}
