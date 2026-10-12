// Habillage sonore de la DA cyber futuriste.
// - Musique générative en couches (pad, arpège, basse, charleston, pulsation) dont l'intensité suit l'action ;
//   les changements de couche tombent sur la mesure suivante pour rester musicaux.
// - Sons de verre : tintements en sinusoïdes (tink) et, pour le verre brisé, claquement + grains de bruit brillants.

const BPM = 84, STEP = 60 / BPM / 4; // double croche
// Ré majeur, progression « générique d'anime » : D(add9) · A/C# · Bm7 · G(6/9) — lumineuse, calme, avec un côté héroïque
const BARS = [
  { root: 73.42, chord: [146.83, 185.0, 220.0, 293.66, 329.63] },
  { root: 69.3, chord: [138.59, 164.81, 220.0, 277.18, 329.63] },
  { root: 61.74, chord: [123.47, 146.83, 185.0, 220.0, 293.66] },
  { root: 49.0, chord: [196.0, 246.94, 293.66, 329.63, 440.0] },
];
const ARP = [0, 1, 2, 3, 4, 3, 2, 1]; // une note par croche
// Mélodie (pas de double croche, demi-tons au-dessus de ré5, durée en pas) : un motif simple et chantable, joué au glockenspiel
const MELODY = [
  [[0, 4, 6], [8, 7, 6], [12, 9, 4]],
  [[0, 11, 6], [8, 9, 6], [12, 7, 4]],
  [[0, 9, 6], [8, 7, 6], [12, 4, 4]],
  [[0, 5, 6], [8, 7, 4], [12, 9, 8]],
];
const LEVEL = [
  { cutoff: 1800, arp: 4, lead: false, bass: false, drum: 0 },
  { cutoff: 4200, arp: 2, lead: true, bass: true, drum: 0 },
  { cutoff: 9000, arp: 2, lead: true, bass: true, drum: 1 },
];

import { createPalettes } from "./sounds-lab.js";

export function futurAudio(s) {
  const W = createPalettes(s).wa; // palette japonaise, réservée aux SSR et UR
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
    // Bus des cordes et de la basse
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
    // Cordes : scies désaccordées, filtrées, attaque lente (nappe chaude plutôt que synthé froid)
    const strings = (t, chord, dur) => {
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100; lp.connect(pump);
      chord.slice(0, 4).forEach((f) => [-9, 9].forEach((c) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sawtooth"; o.frequency.value = f * 2 ** (c / 1200);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.0065, t + 1.5); g.gain.setValueAtTime(0.0065, t + dur - 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);
        o.connect(g).connect(lp); g.connect(rev); o.start(t); o.stop(t + dur + 0.6);
      }));
    };
    const bass = (t, f, d = 0.9) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f; env(g, t, 0.1, 0.02, d); o.connect(g).connect(pump); o.start(t); o.stop(t + d + 0.1); };
    // Glockenspiel : sinus + partiel brillant, longue réverbération
    const bell = (t, f, len) => { voice(t, f, { type: "sine", gain: 0.05, a: 0.004, d: 0.5 + len * STEP * 0.5, send: 0.8 }); voice(t, f * 4, { type: "sine", gain: 0.012, a: 0.002, d: 0.25, send: 0.5 }); };
    // Taiko doux : coup grave arrondi, jamais agressif
    const taiko = (t, power = 1) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
      env(g, t, 0.16 * power, 0.004, 0.5); o.connect(g).connect(out); g.connect(rev); o.start(t); o.stop(t + 0.6);
    };
    const shaker = (t) => { const src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = noise(ctx); hp.type = "highpass"; hp.frequency.value = 7500; env(g, t, 0.006, 0.002, 0.05); src.connect(hp).connect(g).connect(out); src.start(t, Math.random() * 0.3, 0.1); };

    let level = 0, pending = 0, step = 0, next = ctx.currentTime + 0.1;
    const tick = () => {
      if (next < ctx.currentTime - 0.2) { next = ctx.currentTime + 0.05; step = 0; } // onglet en arrière-plan : on se recale
      while (next < ctx.currentTime + 0.15) {
        const t = next, barIx = Math.floor(step / 16) % 4, bar = BARS[barIx], i = step % 16;
        if (i === 0) {
          if (pending !== level) { level = pending; out.frequency.setTargetAtTime(LEVEL[level].cutoff, t, 0.6); }
          strings(t, bar.chord, STEP * 16);
        }
        const L = LEVEL[level];
        if (i % L.arp === 0) voice(t, bar.chord[ARP[(i / L.arp * (L.arp === 4 ? 2 : 1)) % ARP.length]] * 2, { gain: level ? 0.032 : 0.026, d: 0.55, send: 0.6 });
        if (L.bass && (i === 0 || i === 8)) bass(t, bar.root);
        if (L.lead) MELODY[barIx].forEach(([at, semi, len]) => at === i && bell(t, 587.33 * 2 ** (semi / 12), len));
        if (L.drum && (i === 0 || i === 8 || (barIx === 3 && (i === 12 || i === 14)))) taiko(t, i === 0 ? 1 : 0.7);
        if (L.drum && i % 2 === 0) shaker(t);
        next += STEP; step++;
      }
    };
    setInterval(tick, 25); tick();
    s.music = { setLevel: (n) => (pending = Math.max(0, Math.min(2, n))) };
  }

  const base = {
    ambience: startMusic,
    // SSR : carillon doré qui monte (arpège de ré majeur) avec une longue résonance
    ssr: () => { [587.33, 739.99, 880, 1174.66, 1480].forEach((f, i) => s.bell(f, 2.2, { gain: 0.04, at: i * 0.09, partials: [1, 2.76, 5.4] })); s.tone(146.83, 1.4, { gain: 0.06, slide: 1.2, attack: 0.05, wet: 0.5 }); },
    // Ouverture du booster : petit éclat de verre et accord pincé
    tear: () => { const t = s.ctx.currentTime; for (let i = 0; i < 6; i++) tink(t + i * 0.03, 3200 + Math.random() * 2400, 0.025, 0.25); [587.33, 739.99, 880].forEach((f, i) => s.tone(f, 0.9, { type: "triangle", gain: 0.035, at: 0.08 + i * 0.05, wet: 0.5 })); },
    // Sélection : montée tonale propre, sans souffle
    select: () => { s.tone(392, 0.45, { gain: 0.05, slide: 1.5, attack: 0.03, wet: 0.5 }); s.tone(587.33, 0.5, { type: "triangle", gain: 0.025, at: 0.12, wet: 0.6 }); },
    // Charge UR : nappe qui s'ouvre et tintements qui accélèrent
    urCharge: () => {
      s.pad([293.66, 369.99, 440, 554.37], 1.4, { type: "sawtooth", gain: 0.012, attack: 1.1, cutoff: 2600, wet: 0.6 });
      const t = s.ctx.currentTime; for (let i = 0; i < 18; i++) { const k = i / 18; tink(t + 1.2 * (1 - (1 - k) ** 2), 1800 + k * 4200, 0.012 + k * 0.012, 0.12); }
    },
    // Verre brisé : claquement sec, craquement de fond, puis pluie d'éclats (grains de bruit brillants + tintements)
    shatter(power = 1) {
      const ctx = s.ctx, t = ctx.currentTime;
      // Choc : claquement très bref et brillant + petit coup sourd
      const crack = ctx.createBufferSource(), chp = ctx.createBiquadFilter(), cg = ctx.createGain();
      crack.buffer = noise(ctx); chp.type = "highpass"; chp.frequency.value = 2500; env(cg, t, 0.3 * power, 0.001, 0.05);
      crack.connect(chp).connect(cg); s.out(cg, "sfx", 0.25); crack.start(t, Math.random() * 0.3, 0.1);
      s.tone(110, 0.2, { gain: 0.07 * power, slide: 0.6, attack: 0.003, wet: 0.1 });
      // Fracas : fine nappe de bruit aigu qui se tait vite
      const body = ctx.createBufferSource(), bbp = ctx.createBiquadFilter(), bg = ctx.createGain();
      body.buffer = noise(ctx); bbp.type = "bandpass"; bbp.Q.value = 0.8; bbp.frequency.setValueAtTime(7500, t); bbp.frequency.exponentialRampToValueAtTime(3500, t + 0.4);
      env(bg, t + 0.005, 0.1 * power, 0.004, 0.35); body.connect(bbp).connect(bg); s.out(bg, "sfx", 0.45); body.start(t, Math.random() * 0.2, 0.45);
      // Éclats qui tombent : grains de bruit très courts, filtrés étroits (cliquetis de morceaux de verre)
      const grains = Math.round(70 * power);
      for (let i = 0; i < grains; i++) {
        const at = t + 0.02 + Math.random() ** 1.7 * 1.1, k = 1 - (at - t) / 1.2;
        const g = ctx.createGain(), bp = ctx.createBiquadFilter(), src = ctx.createBufferSource(), pan = ctx.createStereoPanner();
        src.buffer = noise(ctx); bp.type = "bandpass"; bp.frequency.value = 3000 + Math.random() * 8000; bp.Q.value = 3 + Math.random() * 6;
        env(g, at, (0.05 + Math.random() * 0.07) * power * Math.max(0.15, k), 0.001, 0.008 + Math.random() * 0.02);
        pan.pan.value = Math.random() * 1.8 - 0.9; src.connect(bp).connect(g).connect(pan); s.out(pan, "sfx", 0.35); src.start(at, Math.random() * 0.4, 0.05);
      }
      // Tintements aigus qui s'éteignent (éclats plus gros qui rebondissent)
      const n = Math.round(22 * power);
      for (let i = 0; i < n; i++) { const at = 0.01 + Math.random() ** 1.5 * 1.0; tink(t + at, 3500 + Math.random() * 6500, 0.035 * power * (1 - at * 0.5), 0.06 + Math.random() * 0.14, 0.45); }
    },
    // Éclats qui se rassemblent : tintements ascendants qui se resserrent
    gather: () => { const t = s.ctx.currentTime; for (let i = 0; i < 14; i++) { const k = i / 14; tink(t + 0.6 * k ** 0.7, 1500 * 2 ** (k * 1.6), 0.02, 0.14, 0.7); } },
    // Arrivée dans l'album : petit carillon montant
    collect: () => { const t = s.ctx.currentTime; [0, 0.06, 0.12].forEach((at, i) => tink(t + at, 2400 * 2 ** (i / 3), 0.04, 0.3, 0.6)); s.tone(659.25, 0.5, { type: "triangle", gain: 0.035, slide: 1.5, wet: 0.5 }); },
    // Scellé de capsule : clic, puis le verre chante et se fend
    unseal: () => { [0, 0.07].forEach((at) => s.tone(2200, 0.04, { type: "square", gain: 0.02, at, bus: "ui", wet: 0.2 })); s.bell(1318.5, 1.6, { gain: 0.03, at: 0.05, partials: [1, 2.41, 3.9] }); },
    // Portail : montée harmonique (pas de souffle), puis jaillissement scintillant
    warp: () => { s.tone(146.83, 1.3, { type: "sawtooth", gain: 0.03, slide: 2, attack: 0.5, cutoff: 1500, wet: 0.4 }); s.tone(220, 1.3, { type: "sine", gain: 0.05, slide: 2, attack: 0.5, wet: 0.5 }); },
    whoosh: () => { const t = s.ctx.currentTime; for (let i = 0; i < 16; i++) tink(t + i * 0.025, 5200 - i * 200, 0.02, 0.2); s.tone(110, 0.6, { gain: 0.12, slide: 0.5, wet: 0.3 }); },
    launch: () => s.tone(440, 0.4, { type: "triangle", gain: 0.04, slide: 2.5, wet: 0.5 }),
  };
  // SSR et UR : koto, flûte, taiko et cloche de temple ; tout le reste garde les sons de verre d'origine
  return { ...base, ssr: () => W.ssr(), urCharge: () => W.urCharge(), urImpact: () => W.urImpact() };
}
