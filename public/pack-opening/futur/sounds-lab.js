// Palettes sonores à comparer (page ?lab) : instruments plutôt qu'électro, tout synthétisé dans le navigateur (aucun fichier audio).
// Chaque palette fournit les mêmes sons : tear (ouverture), flip(rareté), ssr, urCharge, urImpact, gather, collect.

export function createPalettes(s) {
  const C = () => s.ctx;
  const hz = (n) => 440 * 2 ** ((n - 69) / 12); // numéro MIDI → Hz
  const env = (g, t, peak, a, d) => { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  let nb = null;
  const noiseBuf = () => { const c = C(); if (!nb) { nb = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return nb; };
  const route = (node, pan = 0, wet = 0.4, bus = "sfx") => { const p = C().createStereoPanner(); p.pan.value = pan; node.connect(p); s.out(p, bus, wet); };

  // Une voix : oscillateur(s) → filtre → enveloppe
  function voice(t, f, { type = "sine", gain = 0.1, a = 0.01, d = 0.6, wet = 0.4, pan = 0, lp = 0, det = 0, slide = 0, sustain = 0 } = {}) {
    const c = C(), g = c.createGain(); let tail = g;
    if (lp) { const fl = c.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; g.connect(fl); tail = fl; }
    (det ? [-det, det] : [0]).forEach((cents) => {
      const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f * 2 ** (cents / 1200) * (slide ? 1 / slide : 1), t);
      if (slide) o.frequency.exponentialRampToValueAtTime(f * 2 ** (cents / 1200), t + a + d * 0.5);
      o.connect(g); o.start(t); o.stop(t + a + d + sustain + 0.1);
    });
    if (sustain) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + a); g.gain.setValueAtTime(gain, t + a + sustain); g.gain.exponentialRampToValueAtTime(0.0001, t + a + sustain + d); } else env(g, t, gain, a, d);
    route(tail, pan, wet);
  }
  function noise(t, { from = 2000, to = 0, q = 1, gain = 0.1, a = 0.002, d = 0.2, type = "bandpass", wet = 0.3, pan = 0 } = {}) {
    const c = C(), src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); src.buffer = noiseBuf(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(from, t); if (to) f.frequency.exponentialRampToValueAtTime(to, t + a + d);
    env(g, t, gain, a, d); src.connect(f).connect(g); src.start(t, Math.random() * 0.4, a + d + 0.1); route(g, pan, wet);
  }
  // Pincé (Karplus-Strong) : koto, harpe, cordes pincées
  const plucks = new Map();
  function pluck(t, f, { gain = 0.2, decay = 0.997, dur = 2, wet = 0.45, pan = 0 } = {}) {
    const c = C(), key = `${Math.round(f)}|${decay}|${dur}`; let buf = plucks.get(key);
    if (!buf) {
      const sr = c.sampleRate, n = Math.floor(sr * dur), N = Math.max(2, Math.round(sr / f)); buf = c.createBuffer(1, n, sr); const d = buf.getChannelData(0);
      for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1;
      for (let i = N; i < n; i++) d[i] = (d[i - N] + d[i - N + 1]) * 0.5 * decay;
      plucks.set(key, buf);
    }
    const src = c.createBufferSource(), g = c.createGain(); src.buffer = buf; g.gain.value = gain; src.connect(g); src.start(t); route(g, pan, wet);
  }
  // Cloche / carillon : partiels inharmoniques à longue résonance
  function bell(t, f, { gain = 0.1, dur = 3, wet = 0.6, parts = [1, 2.76, 5.4, 8.93], pan = 0 } = {}) { parts.forEach((m, i) => voice(t, f * m, { gain: gain / (1 + i * 1.3), a: 0.003, d: dur / (1 + i * 0.6), wet, pan })); }
  const taiko = (t, p = 1) => { voice(t, 78, { gain: 0.34 * p, a: 0.003, d: 0.7, slide: 2.2, wet: 0.35 }); noise(t, { from: 900, to: 200, type: "lowpass", gain: 0.16 * p, d: 0.25, wet: 0.2 }); };
  const timpani = (t, p = 1) => { voice(t, 98, { gain: 0.3 * p, a: 0.004, d: 1.2, slide: 1.35, wet: 0.5 }); voice(t, 147, { gain: 0.08 * p, a: 0.004, d: 0.7, wet: 0.5 }); };
  const cymbal = (t, { gain = 0.12, swell = 1.5, d = 1.6 } = {}) => noise(t, { from: 6500, type: "highpass", gain, a: swell, d, wet: 0.5 });
  const strings = (t, notes, dur, gain = 0.05) => notes.forEach((n) => voice(t, hz(n), { type: "sawtooth", gain, a: dur * 0.55, d: dur * 0.5, det: 9, lp: 1700, wet: 0.6 }));
  const brass = (t, n, dur, gain = 0.09) => { const f = hz(n); [-6, 6].forEach((det) => voice(t, f, { type: "sawtooth", gain: gain / 2, a: 0.07, d: dur, sustain: Math.max(0, dur - 0.5), lp: 2600, det, wet: 0.45 })); };
  // Voix « aah » : dents de scie filtrées par trois formants
  function choir(t, n, dur, gain = 0.07) {
    const c = C(), f = hz(n), g = c.createGain(); env(g, t, gain, dur * 0.45, dur * 0.6);
    [-8, 0, 8].forEach((cents) => { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = f * 2 ** (cents / 1200); const mix = c.createGain(); mix.gain.value = 1; o.connect(mix); [[800, 1], [1150, 0.5], [2900, 0.25]].forEach(([fq, k]) => { const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = fq; bp.Q.value = 6; const kg = c.createGain(); kg.gain.value = k; mix.connect(bp).connect(kg).connect(g); }); o.start(t); o.stop(t + dur * 1.1 + 0.2); });
    route(g, 0, 0.7);
  }
  function flute(t, n, dur, gain = 0.1, { bend = 0 } = {}) { // shakuhachi : souffle + sinus vibré
    const c = C(), o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(); o.type = "sine"; o.frequency.setValueAtTime(hz(n - bend), t); if (bend) o.frequency.exponentialRampToValueAtTime(hz(n), t + dur * 0.4);
    lfo.frequency.value = 5.2; lg.gain.value = 7; lfo.connect(lg).connect(o.detune); env(g, t, gain, dur * 0.3, dur * 0.8); o.connect(g); o.start(t); lfo.start(t); o.stop(t + dur * 1.2); lfo.stop(t + dur * 1.2); route(g, 0, 0.6);
    noise(t, { from: hz(n) * 2, q: 3, type: "bandpass", gain: gain * 0.5, a: dur * 0.3, d: dur * 0.8, wet: 0.5 });
  }
  function piano(t, n, { gain = 0.14, d = 2.2, pan = 0 } = {}) { const f = hz(n); voice(t, f, { type: "triangle", gain, a: 0.004, d, wet: 0.5, pan }); voice(t, f * 2, { gain: gain * 0.25, a: 0.003, d: d * 0.4, wet: 0.5, pan }); voice(t, f * 3, { gain: gain * 0.08, a: 0.003, d: d * 0.25, wet: 0.5, pan }); noise(t, { from: 3000, q: 1, gain: gain * 0.15, d: 0.04, wet: 0.2, pan }); }
  const now = () => C().currentTime;
  const D = 62; // ré4 (MIDI)

  return {
    // ----- A · Orchestre shonen : cuivres, timbales, cordes, chœur -----
    orchestre: {
      name: "A · Orchestre shonen", blurb: "Cuivres, timbales, cymbale, cordes et chœur : l'ouverture d'un shonen épique.",
      tear() { const t = now(); timpani(t, 0.8); brass(t + 0.02, D + 12, 0.5, 0.06); cymbal(t, { gain: 0.05, swell: 0.1, d: 0.6 }); },
      flip(r) { const t = now(); if (r === "N") pluck(t, hz(D + 12), { gain: 0.12 }); else if (r === "R") { pluck(t, hz(D + 16), { gain: 0.14 }); bell(t + 0.04, hz(D + 28), { gain: 0.04, dur: 1.2 }); } else if (r === "SR") { brass(t, D + 7, 0.6, 0.07); timpani(t, 0.6); } },
      ssr() { const t = now(); timpani(t); [0, 4, 7, 12].forEach((k, i) => brass(t + i * 0.16, D + k, i === 3 ? 1.6 : 0.4, 0.08)); cymbal(t, { gain: 0.1, swell: 0.7, d: 1.6 }); bell(t + 0.5, hz(D + 36), { gain: 0.05, dur: 2 }); },
      urCharge() { const t = now(); strings(t, [D - 12, D - 5, D, D + 4], 3, 0.045); for (let i = 0, at = 0, gap = 0.4; at < 2.8; i++, at += gap, gap *= 0.86) timpani(t + at, 0.3 + at / 5); cymbal(t + 0.4, { gain: 0.1, swell: 2.4, d: 0.8 }); choir(t + 1.2, D + 12, 2, 0.05); },
      urImpact() { const t = now(); timpani(t, 1.3); taiko(t, 1.2); [0, 4, 7, 12, 16].forEach((k) => brass(t, D + k, 2.6, 0.07)); cymbal(t, { gain: 0.2, swell: 0.01, d: 3 }); choir(t, D + 12, 3.5, 0.09); choir(t, D + 19, 3.5, 0.06); bell(t + 0.1, hz(D + 36), { gain: 0.06, dur: 4 }); },
      gather() { const t = now(); strings(t, [D + 7, D + 12], 0.9, 0.03); },
      collect() { const t = now(); pluck(t, hz(D + 24), { gain: 0.13 }); bell(t + 0.05, hz(D + 36), { gain: 0.04, dur: 1 }); },
    },
    // ----- B · Japonais : koto, shakuhachi, taiko, cloche de temple (gamme hirajoshi) -----
    wa: {
      name: "B · Japonais (wa)", blurb: "Koto, flûte shakuhachi, gros taiko et cloche de temple : calme et solennel.",
      tear() { const t = now(); [0, 2, 3, 7].forEach((k, i) => pluck(t + i * 0.05, hz(D + 12 + k), { gain: 0.16, decay: 0.998, dur: 2.2 })); noise(t, { from: 3500, q: 4, gain: 0.06, d: 0.05, wet: 0.2 }); },
      flip(r) { const t = now(); const rank = ["N", "R", "SR"].indexOf(r); pluck(t, hz(D + 12 + [0, 3, 7][Math.max(0, rank)]), { gain: 0.15, dur: 1.6 }); if (rank >= 1) pluck(t + 0.08, hz(D + 19 + (rank === 2 ? 3 : 0)), { gain: 0.12, dur: 1.6 }); },
      ssr() { const t = now(); bell(t, hz(D + 12), { gain: 0.12, dur: 4, parts: [1, 2.01, 3.0, 4.2] }); [0, 3, 7, 8, 12, 14].forEach((k, i) => pluck(t + 0.2 + i * 0.09, hz(D + 12 + k), { gain: 0.15, dur: 2.2 })); flute(t + 0.4, D + 19, 1.4, 0.08); taiko(t, 0.8); },
      urCharge() { const t = now(); flute(t, D + 7, 3, 0.1, { bend: 3 }); for (let i = 0, at = 0, gap = 0.7; at < 2.8; i++, at += gap, gap *= 0.82) taiko(t + at, 0.35 + at / 5); noise(t, { from: 500, to: 3500, q: 0.7, gain: 0.07, a: 2.6, d: 0.4, wet: 0.5 }); [0, 3, 7].forEach((k, i) => pluck(t + 1.6 + i * 0.4, hz(D + 12 + k), { gain: 0.1 + i * 0.03, dur: 2.4 })); },
      urImpact() { const t = now(); taiko(t, 1.4); taiko(t + 0.18, 1); taiko(t + 0.36, 1.2); bell(t, hz(D), { gain: 0.16, dur: 6, parts: [1, 2.01, 3.0, 4.2] }); [0, 3, 7, 12, 15].forEach((k, i) => pluck(t + 0.05 + i * 0.03, hz(D + 12 + k), { gain: 0.18, dur: 3 })); flute(t + 0.3, D + 24, 2.6, 0.1); },
      gather() { const t = now(); [7, 3, 0].forEach((k, i) => pluck(t + i * 0.1, hz(D + 24 - k), { gain: 0.1 })); },
      collect() { const t = now(); pluck(t, hz(D + 24), { gain: 0.14, dur: 1.5 }); bell(t + 0.05, hz(D + 36), { gain: 0.05, dur: 1.8, parts: [1, 2.01, 3.0] }); },
    },
    // ----- C · Féérique : harpe, célesta, chœur doux (magical girl / fantasy) -----
    feerique: {
      name: "C · Féérique", blurb: "Harpe, célesta et chœur doux : lumineux et magique, façon fantasy.",
      tear() { const t = now(); [0, 4, 7, 11, 14, 19].forEach((k, i) => pluck(t + i * 0.04, hz(D + 12 + k), { gain: 0.12, decay: 0.998, dur: 2, wet: 0.6 })); },
      flip(r) { const t = now(); const rank = ["N", "R", "SR"].indexOf(r); bell(t, hz(D + 24 + rank * 4), { gain: 0.06 + rank * 0.02, dur: 1 + rank * 0.5, parts: [1, 2, 3, 4.2] }); },
      ssr() { const t = now(); [0, 4, 7, 12, 16, 19, 24].forEach((k, i) => { pluck(t + i * 0.07, hz(D + 12 + k), { gain: 0.14, dur: 2.4, wet: 0.6 }); bell(t + i * 0.07, hz(D + 24 + k), { gain: 0.04, dur: 1.4, parts: [1, 2, 3, 4.2] }); }); choir(t + 0.2, D + 12, 2.2, 0.06); },
      urCharge() { const t = now(); choir(t, D, 3, 0.05); choir(t + 0.5, D + 7, 2.5, 0.05); for (let i = 0, at = 0, gap = 0.3; at < 2.8; i++, at += gap, gap *= 0.9) pluck(t + at, hz(D + 12 + [0, 4, 7, 12, 16][i % 5] + (i > 8 ? 12 : 0)), { gain: 0.08 + at / 30, dur: 1.4, wet: 0.6 }); noise(t, { from: 4000, type: "highpass", gain: 0.05, a: 2.6, d: 0.5, wet: 0.5 }); },
      urImpact() { const t = now(); [0, 4, 7, 12, 16, 19, 24, 28].forEach((k, i) => { pluck(t + i * 0.05, hz(D + k), { gain: 0.16, dur: 3, wet: 0.7 }); bell(t + i * 0.05, hz(D + 24 + k), { gain: 0.05, dur: 3, parts: [1, 2, 3, 4.2] }); }); choir(t, D + 12, 4, 0.09); choir(t, D + 16, 4, 0.06); choir(t, D + 19, 4, 0.06); bell(t, hz(D + 36), { gain: 0.08, dur: 5 }); },
      gather() { const t = now(); [0, 4, 7, 12].forEach((k, i) => pluck(t + i * 0.07, hz(D + 24 + k), { gain: 0.08, dur: 1 })); },
      collect() { const t = now(); bell(t, hz(D + 36), { gain: 0.07, dur: 1.4, parts: [1, 2, 3, 4.2] }); },
    },
    // ----- D · Piano émotionnel : piano, cordes, cœur qui bat (OST calme, tirée de tes références) -----
    piano: {
      name: "D · Piano émotionnel", blurb: "Piano, cordes et battements de cœur : sobre, un peu mélancolique, très « OST d'anime ».",
      tear() { const t = now(); piano(t, D + 12, { gain: 0.12 }); piano(t + 0.09, D + 19, { gain: 0.1 }); },
      flip(r) { const t = now(); const rank = ["N", "R", "SR"].indexOf(r); piano(t, D + 12 + [0, 4, 7][Math.max(0, rank)], { gain: 0.12 }); if (rank >= 1) piano(t + 0.1, D + 19 + rank, { gain: 0.09 }); },
      ssr() { const t = now(); [0, 4, 7, 12, 16].forEach((k, i) => piano(t + i * 0.13, D + 12 + k, { gain: 0.14 + i * 0.01 })); strings(t + 0.3, [D, D + 7, D + 12], 2.4, 0.04); taiko(t + 0.5, 0.5); },
      urCharge() { const t = now(); [D - 12, D - 5, D].forEach((n, i) => piano(t + i * 0.6, n, { gain: 0.14, d: 3 })); strings(t, [D - 12, D - 5, D, D + 4], 3, 0.045); for (let i = 0, at = 0.6, gap = 0.8; at < 2.8; i++, at += gap, gap *= 0.78) { taiko(t + at, 0.28 + at / 8); piano(t + at + 0.1, D + 12 + [0, 4, 7, 12][i % 4], { gain: 0.08 }); } },
      urImpact() { const t = now(); [0, 4, 7, 12, 16, 19].forEach((k) => piano(t, D + k, { gain: 0.16, d: 4 })); piano(t, D - 12, { gain: 0.2, d: 4 }); strings(t, [D - 12, D, D + 7, D + 12, D + 16], 3.5, 0.06); taiko(t, 1.2); choir(t + 0.1, D + 12, 3.5, 0.06); bell(t + 0.1, hz(D + 36), { gain: 0.05, dur: 4 }); },
      gather() { const t = now(); [0, 4, 7].forEach((k, i) => piano(t + i * 0.1, D + 12 + k, { gain: 0.07, d: 1 })); },
      collect() { const t = now(); piano(t, D + 24, { gain: 0.09, d: 1.2 }); },
    },
  };
}

export const PALETTE_ORDER = ["orchestre", "wa", "feerique", "piano"];
