// Habillage sonore de la DA cyber futuriste.
// - Musique générative en couches (pad, arpège, basse, charleston, pulsation) dont l'intensité suit l'action ;
//   les changements de couche tombent sur la mesure suivante pour rester musicaux.
// - Sons de verre : éclats en sinusoïdes (tintements courts, spatialisés) plutôt qu'en bruit blanc, pour rester doux.

const BPM = 100, STEP = 60 / BPM / 4; // double croche
// Progression en ré lydien : Dmaj9 · Bm9 · Gmaj7#11 · A6/9
const BARS = [
  { root: 73.42, chord: [146.83, 185.0, 220.0, 277.18, 329.63] },
  { root: 61.74, chord: [123.47, 146.83, 185.0, 220.0, 277.18] },
  { root: 49.0, chord: [196.0, 246.94, 277.18, 293.66, 369.99] },
  { root: 55.0, chord: [220.0, 246.94, 329.63, 369.99, 440.0] },
];
const ARP = [0, 2, 4, 3, 1, 3, 4, 2, 0, 3, 4, 1, 2, 4, 3, 1];
const LEVEL = [
  { cutoff: 1300, arp: 2, bass: false, hat: 0, kick: false },
  { cutoff: 3200, arp: 1, bass: true, hat: 2, kick: false },
  { cutoff: 7000, arp: 1, bass: true, hat: 1, kick: true },
];

export function futurAudio(s) {
  let noiseBuf = null;
  const noise = (ctx) => { if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return noiseBuf; };
  const env = (g, t, peak, a, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };

  // Tintement de verre : deux partiels inharmoniques, attaque nette, extinction rapide, position stéréo aléatoire
  function tink(t, f, gain, decay = 0.18, wet = 0.6) {
    const ctx = s.ctx, pan = ctx.createStereoPanner(); pan.pan.value = Math.random() * 1.6 - 0.8;
    [[1, 1], [2.76, 0.35], [5.4, 0.12]].filter(([m]) => f * m < 16000).forEach(([m, k]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f * m;
      env(g, t, gain * k, 0.002, decay / m ** 0.5); o.connect(g).connect(pan); o.start(t); o.stop(t + decay + 0.05);
    });
    s.out(pan, "sfx", wet);
  }

  // Musique
  function startMusic() {
    const ctx = s.ctx;
    const out = ctx.createBiquadFilter(); out.type = "lowpass"; out.frequency.value = LEVEL[0].cutoff; out.Q.value = 0.5; out.connect(s.bus.amb);
    // « Pompe » façon sidechain : le pad et la basse respirent sous la pulsation
    const pump = ctx.createGain(); pump.connect(out);
    const delay = ctx.createDelay(1), fb = ctx.createGain(), dlp = ctx.createBiquadFilter();
    delay.delayTime.value = STEP * 3; fb.gain.value = 0.36; dlp.type = "lowpass"; dlp.frequency.value = 2400;
    delay.connect(dlp).connect(fb).connect(delay); dlp.connect(out);
    const rev = ctx.createGain(); rev.gain.value = 0.35; rev.connect(s.bus.rev);

    const voice = (t, f, { type = "triangle", gain = 0.05, a = 0.005, d = 0.4, dest = out, send = 0 } = {}) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
      env(g, t, gain, a, d); o.connect(g).connect(dest);
      if (send) { const sg = ctx.createGain(); sg.gain.value = send; g.connect(sg).connect(delay); g.connect(rev); }
      o.start(t); o.stop(t + a + d + 0.05);
    };
    const pad = (t, chord, dur) => chord.slice(0, 4).forEach((f) => [-7, 7].forEach((c) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f * 2 ** (c / 1200);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012, t + 1.2); g.gain.setValueAtTime(0.012, t + dur - 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
      o.connect(g).connect(pump); g.connect(rev); o.start(t); o.stop(t + dur + 0.5);
    }));
    const bass = (t, f) => { const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = "sawtooth"; o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = 380; env(g, t, 0.07, 0.01, 0.22); o.connect(lp).connect(g).connect(pump); o.start(t); o.stop(t + 0.3); };
    const hat = (t, open) => { const src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = noise(ctx); hp.type = "highpass"; hp.frequency.value = 8500; env(g, t, open ? 0.018 : 0.011, 0.001, open ? 0.12 : 0.04); src.connect(hp).connect(g).connect(out); src.start(t, Math.random() * 0.3, 0.2); };
    const kick = (t) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      env(g, t, 0.22, 0.004, 0.32); o.connect(g).connect(out); o.start(t); o.stop(t + 0.4);
      pump.gain.cancelScheduledValues(t); pump.gain.setValueAtTime(0.45, t); pump.gain.linearRampToValueAtTime(1, t + STEP * 3);
    };

    let level = 0, pending = 0, step = 0, next = ctx.currentTime + 0.1;
    const tick = () => {
      if (next < ctx.currentTime - 0.2) { next = ctx.currentTime + 0.05; step = 0; } // onglet en arrière-plan : on se recale
      while (next < ctx.currentTime + 0.15) {
        const t = next, bar = BARS[Math.floor(step / 16) % 4], i = step % 16;
        if (i === 0) {
          if (pending !== level) { level = pending; out.frequency.setTargetAtTime(LEVEL[level].cutoff, t, 0.6); }
          pad(t, bar.chord, STEP * 16);
        }
        const L = LEVEL[level];
        if (i % L.arp === 0 && (level > 0 || i % 4 !== 2)) {
          const n = bar.chord[ARP[i]] * (level === 2 && i % 8 === 6 ? 4 : 2);
          voice(t, n, { gain: level ? 0.035 : 0.028, d: 0.32, send: 0.6 });
        }
        if (L.bass && i % 2 === 0) bass(t, bar.root * (i === 6 || i === 14 ? 2 : 1));
        if (L.hat && i % L.hat === 0 && (L.hat === 1 || i % 4 === 2)) hat(t, i % 8 === 6);
        if (L.kick && i % 4 === 0) kick(t);
        next += STEP; step++;
      }
    };
    setInterval(tick, 25); tick();
    s.music = { setLevel: (n) => (pending = Math.max(0, Math.min(2, n))) };
  }

  return {
    ambience: startMusic,
    // Ouverture du booster : petit éclat de verre et accord pincé
    tear: () => { const t = s.ctx.currentTime; for (let i = 0; i < 6; i++) tink(t + i * 0.03, 3200 + Math.random() * 2400, 0.025, 0.25); [587.33, 739.99, 880].forEach((f, i) => s.tone(f, 0.9, { type: "triangle", gain: 0.035, at: 0.08 + i * 0.05, wet: 0.5 })); },
    // Sélection : montée tonale propre, sans souffle
    select: () => { s.tone(392, 0.45, { gain: 0.05, slide: 1.5, attack: 0.03, wet: 0.5 }); s.tone(587.33, 0.5, { type: "triangle", gain: 0.025, at: 0.12, wet: 0.6 }); },
    // Charge UR : nappe qui s'ouvre et tintements qui accélèrent
    urCharge: () => {
      s.pad([293.66, 369.99, 440, 554.37], 1.4, { type: "sawtooth", gain: 0.012, attack: 1.1, cutoff: 2600, wet: 0.6 });
      const t = s.ctx.currentTime; for (let i = 0; i < 18; i++) { const k = i / 18; tink(t + 1.2 * (1 - (1 - k) ** 2), 1800 + k * 4200, 0.012 + k * 0.012, 0.12); }
    },
    // Verre qui éclate, en douceur : un choc sourd, un voile filtré très court, puis une pluie de tintements
    shatter(power = 1) {
      const t = s.ctx.currentTime;
      s.tone(90, 0.45, { gain: 0.14 * power, slide: 0.55, attack: 0.004, wet: 0.2 });
      s.noise(0.22, { from: 5200, to: 2400, gain: 0.035 * power, type: "bandpass", q: 1.2, attack: 0.003, wet: 0.6 });
      const n = Math.round(30 * power);
      for (let i = 0; i < n; i++) { const at = Math.random() ** 1.8 * 0.9; tink(t + at, 2200 + Math.random() * 5800, 0.03 * power * (1 - at * 0.6), 0.1 + Math.random() * 0.2); }
    },
    // Éclats qui se rassemblent : tintements ascendants qui se resserrent
    gather: () => { const t = s.ctx.currentTime; for (let i = 0; i < 14; i++) { const k = i / 14; tink(t + 0.6 * k ** 0.7, 1500 * 2 ** (k * 1.6), 0.02, 0.14, 0.7); } },
    // Scellé de capsule : clic, puis le verre chante et se fend
    unseal: () => { [0, 0.07].forEach((at) => s.tone(2200, 0.04, { type: "square", gain: 0.02, at, bus: "ui", wet: 0.2 })); s.bell(1318.5, 1.6, { gain: 0.03, at: 0.05, partials: [1, 2.41, 3.9] }); },
    // Portail : montée harmonique (pas de souffle), puis jaillissement scintillant
    warp: () => { s.tone(146.83, 1.3, { type: "sawtooth", gain: 0.03, slide: 2, attack: 0.5, cutoff: 1500, wet: 0.4 }); s.tone(220, 1.3, { type: "sine", gain: 0.05, slide: 2, attack: 0.5, wet: 0.5 }); },
    whoosh: () => { const t = s.ctx.currentTime; for (let i = 0; i < 16; i++) tink(t + i * 0.025, 5200 - i * 200, 0.02, 0.2); s.tone(110, 0.6, { gain: 0.12, slide: 0.5, wet: 0.3 }); },
    launch: () => s.tone(440, 0.4, { type: "triangle", gain: 0.04, slide: 2.5, wet: 0.5 }),
  };
}
