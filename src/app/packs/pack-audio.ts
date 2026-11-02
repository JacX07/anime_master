// Sons de la salle des invocations, synthétisés en WebAudio (aucun fichier) :
// carte qui sort du paquet, carte retournée, carillon pour les SSR et UR, ambiance de salle (nappe lente + cloche rare).

import type { Rarity } from "@/generated/prisma/enums";

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
const STORE = "am-packs-ambience";

class PackAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private ambience!: GainNode;
  private noise!: AudioBuffer;
  private stopAmbience: (() => void) | null = null;

  /** Le contexte n'existe qu'après un geste de l'utilisateur (règle des navigateurs). */
  private init(): AudioContext {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.master = ctx.createGain();
    this.master.gain.value = 0.7;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    this.master.connect(limiter).connect(ctx.destination);
    this.ambience = ctx.createGain();
    this.ambience.gain.value = 0;
    this.ambience.connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.ctx = ctx;
    return ctx;
  }

  private ready(): AudioContext {
    const ctx = this.init();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  /** Souffle de papier : bruit filtré dont la fréquence monte (balayage) puis claquement sec. */
  private swish(at: number, dur: number, from: number, to: number, level: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(from, at);
    filter.frequency.exponentialRampToValueAtTime(to, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(level, at + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.05);
  }

  private tone(at: number, freq: number, dur: number, level: number, type: OscillatorType = "sine") {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(level, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(this.master);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  /** Une carte glisse hors du paquet (`delay` en secondes pour les enchaîner). */
  deal(delay = 0) {
    const ctx = this.ready();
    const t = ctx.currentTime + delay;
    this.swish(t, 0.22, 900 * (0.9 + Math.random() * 0.2), 4200, 0.5);
    this.tone(t + 0.16, 150, 0.09, 0.12, "triangle");
  }

  /** Carte retournée : claquement de carte, avec carillon si SSR ou UR. */
  flip(rarity: Rarity) {
    const ctx = this.ready();
    const t = ctx.currentTime;
    this.swish(t, 0.14, 2200, 6500, 0.45);
    this.tone(t + 0.07, 190 * (0.95 + Math.random() * 0.1), 0.08, 0.14, "triangle");
    if (rarity === "SSR") [76, 81, 84].forEach((n, i) => this.tone(t + 0.1 + i * 0.09, midi(n), 0.9, 0.12));
    if (rarity === "UR") {
      [72, 76, 79, 84, 88].forEach((n, i) => {
        this.tone(t + 0.08 + i * 0.08, midi(n), 1.6, 0.13);
        this.tone(t + 0.08 + i * 0.08, midi(n + 12), 1.2, 0.05);
      });
      this.tone(t, midi(36), 1.8, 0.2, "triangle");
    }
  }

  /** Clic d'ouverture : petit coup grave et souffle montant. */
  open() {
    const ctx = this.ready();
    const t = ctx.currentTime;
    this.tone(t, 110, 0.25, 0.2, "triangle");
    this.swish(t, 0.35, 400, 5000, 0.4);
  }

  /** Nappe lente (la mineure, deux voix désaccordées) et cloche espacée ; coupée en fondu. */
  startAmbience() {
    if (this.stopAmbience) return;
    const ctx = this.ready();
    const nodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 520;
    lp.connect(this.ambience);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start();
    nodes.push(lfo);
    for (const [note, detune] of [[45, -6], [45, 7], [52, 0], [57, -4], [60, 5]] as const) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = midi(note);
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = note < 50 ? 0.1 : 0.045;
      o.connect(g).connect(lp);
      o.start();
      nodes.push(o);
    }
    this.ambience.gain.cancelScheduledValues(ctx.currentTime);
    this.ambience.gain.setTargetAtTime(0.5, ctx.currentTime, 1.2);
    const scale = [69, 72, 76, 79, 81];
    const bell = window.setInterval(() => {
      const at = ctx.currentTime + 0.05;
      this.tone(at, midi(scale[Math.floor(Math.random() * scale.length)]), 3.2, 0.03);
    }, 6500);
    this.stopAmbience = () => {
      window.clearInterval(bell);
      this.ambience.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      window.setTimeout(() => nodes.forEach((n) => { try { n.stop(); } catch { /* déjà arrêté */ } }), 2000);
      this.stopAmbience = null;
    };
  }

  setAmbience(on: boolean) {
    if (on) this.startAmbience();
    else this.stopAmbience?.();
    try { localStorage.setItem(STORE, on ? "on" : "off"); } catch { /* stockage indisponible */ }
  }

  get ambienceWanted(): boolean {
    try { return localStorage.getItem(STORE) !== "off"; } catch { return true; }
  }

  dispose() {
    this.stopAmbience?.();
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx) window.setTimeout(() => void ctx.close(), 2200);
  }
}

export const packAudio = new PackAudio();
