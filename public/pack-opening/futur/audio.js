// Habillage sonore de la DA cyber futuriste.
// - Musique générative en couches (pad, arpège, basse, charleston, pulsation) dont l'intensité suit l'action ;
//   les changements de couche tombent sur la mesure suivante pour rester musicaux.
// - Sons de verre : tintements en sinusoïdes (tink) et, pour le verre brisé, claquement + grains de bruit brillants.

import { createPalettes } from "./sounds-lab.js";

const BPM = 66, STEP = 60 / BPM / 4; // double croche
// Gamme japonaise (hirajoshi sur ré) : ré mi fa la si♭ ; phrases de koto sur 4 mesures, [pas, degré, octave]
const SCALE = [0, 2, 3, 7, 8];
const PHRASES = [
  [[0, 0, 0], [4, 3, 0], [7, 4, 0], [10, 3, 0], [12, 2, 0]],
  [[0, 3, 0], [3, 4, 0], [6, 0, 1], [10, 4, 0], [14, 3, 0]],
  [[0, 0, 0], [5, 2, 0], [8, 3, 0], [11, 4, 0], [14, 0, 1]],
  [[0, 4, 0], [4, 3, 0], [8, 2, 0], [10, 0, 0], [13, 3, -1]],
];
const D4 = 62;

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

  // Musique : drone grave, koto dispersé, flûte et taiko qui entrent avec l'intensité (même palette que les effets)
  const wa = createPalettes(s);
  function startMusic() {
    const ctx = s.ctx, I = wa.inst;
    let level = 0, pending = 0, step = 0, next = ctx.currentTime + 0.1;
    const tick = () => {
      if (next < ctx.currentTime - 0.2) { next = ctx.currentTime + 0.05; step = 0; } // onglet en arrière-plan : on se recale
      I.setBus("amb");
      while (next < ctx.currentTime + 0.15) {
        const t = next, bar = Math.floor(step / 16), i = step % 16, ph = PHRASES[bar % 4];
        if (i === 0) {
          level = pending;
          if (bar % 2 === 0) { I.voice(t, I.hz(D4 - 24), { gain: 0.05, a: 2.5, d: 6, wet: 0.6 }); I.voice(t, I.hz(D4 - 17), { gain: 0.028, a: 3, d: 6, wet: 0.6 }); }
          if (level >= 1 && bar % 4 === 0) I.bell(t, I.hz(D4 + 24), { gain: 0.025, dur: 5 });
          if (level >= 1 && bar % 4 === 1) I.flute(t + 0.2, D4 + 12 + SCALE[bar % 5], 4.2, 0.045);
          if (level >= 1 && bar % 4 === 3) I.flute(t, D4 + SCALE[3], 3.4, 0.04);
          if (level >= 2 && bar % 2 === 0) I.taiko(t, 0.22);
        }
        ph.forEach(([at, deg, oct], k) => {
          if (at !== i) return;
          if (level === 0 && k % 2 === 1) return; // intensité faible : un koto sur deux
          I.pluck(t, I.hz(D4 + SCALE[deg] + 12 * oct), { gain: level ? 0.075 : 0.06, decay: 0.998, dur: 2.2, wet: 0.55, pan: (deg - 2) * 0.12 });
          if (level >= 2) I.pluck(t + 0.02, I.hz(D4 + SCALE[deg] + 12 * (oct + 1)), { gain: 0.035, dur: 1.4, wet: 0.6 });
        });
        if (level >= 2 && i === 8) I.taiko(t, 0.16);
        next += STEP; step++;
      }
      I.setBus("sfx");
    };
    setInterval(tick, 25); tick();
    s.music = { setLevel: (n) => (pending = Math.max(0, Math.min(2, n))) };
  }

  const W = wa.wa;
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
  // Effets : palette japonaise (koto, flûte, taiko, cloche de temple) par-dessus les anciens sons de verre
  return { ...base, tear: () => W.tear(), flip: (r) => W.flip(r), ssr: () => W.ssr(), urCharge: () => W.urCharge(), urImpact: () => W.urImpact(), gather: () => W.gather(), collect: () => W.collect(), select: () => W.select(), shatter: (p) => W.shatter(p) };
}
