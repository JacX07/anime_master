// Sons de la salle des invocations, synthétisés en WebAudio (aucun fichier) :
// carte qui sort du paquet, carte retournée, carillon pour les SSR et UR, ambiance de salle (nappe lente + cloche rare).

import type { Rarity } from "@/generated/prisma/enums";

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
const STORE = "am-packs-ambience";
const STORE_UI = "am-ui-sfx";

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
    this.master.gain.value = 1.4;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
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
    filter.Q.value = 0.6;
    filter.frequency.setValueAtTime(from, at);
    filter.frequency.exponentialRampToValueAtTime(to, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(level * 3, at + dur * 0.35);
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
    g.gain.exponentialRampToValueAtTime(level * 2.2, at + 0.012);
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
    if (rarity === "SSR") {
      this.swish(t, 0.7, 300, 7000, 0.7);
      this.tone(t + 0.1, midi(40), 1.4, 0.35, "triangle");
      [72, 76, 79, 84].forEach((n, i) => this.tone(t + 0.35 + i * 0.1, midi(n), 1.6, 0.2));
    }
    if (rarity === "UR") {
      this.swish(t, 1, 200, 9000, 0.9);
      this.tone(t + 0.1, midi(34), 2.4, 0.5, "triangle");
      this.tone(t + 0.1, midi(46), 2, 0.25, "sawtooth");
      [72, 76, 79, 84, 88, 91].forEach((n, i) => {
        this.tone(t + 0.5 + i * 0.09, midi(n), 2.4, 0.22);
        this.tone(t + 0.5 + i * 0.09, midi(n + 12), 1.8, 0.1);
      });
    }
  }

  // ---- Sons d'interface : courts et discrets, pour que chaque geste ait un retour ----
  private ui(fn: (ctx: AudioContext, t: number) => void) {
    if (!this.ctx || !this.uiOn) return; // pas de contexte avant un premier geste
    if (this.ctx.state === "suspended") void this.ctx.resume();
    fn(this.ctx, this.ctx.currentTime);
  }
  /** Crée le contexte audio (à appeler pendant un geste de l'utilisateur). */
  unlock() {
    this.ready();
  }
  uiOn = true;
  private lastHover = 0;
  private lastTick = 0;

  /** Choc sourd : sinus dont la hauteur chute vite (pierre, bois lourd). */
  private thud(at: number, from: number, to: number, dur: number, level: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(from, at);
    o.frequency.exponentialRampToValueAtTime(to, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(this.master);
    o.start(at);
    o.stop(at + dur + 0.03);
  }

  /** Cloche de fer : partiels inharmoniques qui s'éteignent vite. */
  private iron(at: number, base: number, dur: number, level: number) {
    [1, 2.76, 5.4, 8.9].forEach((m, i) => this.tone(at, base * m, dur / (1 + i * 0.7), level / (1 + i * 1.3)));
  }

  /** Survol : frottement de pierre très bref et étouffé. */
  uiHover() {
    const now = performance.now();
    if (now - this.lastHover < 70) return;
    this.lastHover = now;
    this.ui((_, t) => this.swish(t, 0.07, 500, 900, 0.1));
  }
  /** Défilement d'une liste déroulante : tic de bois sec (bruit aigu + claquement bref). */
  uiTick() {
    const now = performance.now();
    if (now - this.lastTick < 30) return;
    this.lastTick = now;
    this.ui((_, t) => {
      this.swish(t, 0.035, 2200, 2200, 0.1);
      this.tone(t, 900, 0.03, 0.03, "triangle");
    });
  }
  /** Ouverture d'une liste déroulante : petit coup de bois creux suivi d'un souffle qui monte. */
  uiOpen() {
    this.ui((_, t) => {
      this.thud(t, 320, 140, 0.09, 0.12);
      this.swish(t, 0.1, 900, 2400, 0.07);
    });
  }
  /** Clic : coup de pierre sourd avec un fond de fer. */
  uiClick() {
    this.ui((_, t) => {
      this.thud(t, 150, 55, 0.16, 0.5);
      this.swish(t, 0.06, 1200, 400, 0.35);
      this.iron(t, 140, 0.25, 0.05);
    });
  }
  /** Action principale : cloche grave, comme un glas court. */
  uiConfirm() {
    this.ui((_, t) => {
      this.thud(t, 110, 45, 0.25, 0.5);
      this.iron(t + 0.02, 196, 1.1, 0.16);
      this.swish(t, 0.1, 900, 300, 0.25);
    });
  }
  /** Sélection : deux coups de loquet de fer. */
  uiSelect() {
    this.ui((_, t) => {
      this.thud(t, 220, 90, 0.08, 0.35);
      this.iron(t, 330, 0.12, 0.06);
      this.thud(t + 0.06, 170, 70, 0.1, 0.4);
    });
  }
  /** Changement de page : lourde porte qui glisse. */
  uiNav() {
    this.ui((_, t) => {
      this.swish(t, 0.3, 250, 800, 0.3);
      this.thud(t + 0.02, 90, 45, 0.2, 0.35);
    });
  }
  /** Refus : grondement sourd. */
  uiDenied() {
    this.ui((_, t) => {
      this.thud(t, 85, 40, 0.3, 0.55);
      this.tone(t, 70, 0.25, 0.12, "sawtooth");
    });
  }

  setUi(on: boolean) {
    this.uiOn = on;
    try { localStorage.setItem(STORE_UI, on ? "on" : "off"); } catch { /* stockage indisponible */ }
    if (on) this.ui((_, t) => this.iron(t, 262, 0.6, 0.12));
  }
  get uiWanted(): boolean {
    try { return localStorage.getItem(STORE_UI) !== "off"; } catch { return true; }
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
    lp.frequency.value = 700;
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
      g.gain.value = note < 50 ? 0.22 : 0.1;
      o.connect(g).connect(lp);
      o.start();
      nodes.push(o);
    }
    this.ambience.gain.cancelScheduledValues(ctx.currentTime);
    this.ambience.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
    const scale = [69, 72, 76, 79, 81];
    const bell = window.setInterval(() => {
      const at = ctx.currentTime + 0.05;
      this.tone(at, midi(scale[Math.floor(Math.random() * scale.length)]), 3.2, 0.08);
    }, 6500);
    this.stopAmbience = () => {
      window.clearInterval(bell);
      this.ambience.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      window.setTimeout(() => nodes.forEach((n) => { try { n.stop(); } catch { /* déjà arrêté */ } }), 2000);
      this.stopAmbience = null;
    };
  }

  /** Coupe l'ambiance sans changer la préférence (combat en cours, changement de page). */
  pauseAmbience() {
    this.stopAmbience?.();
  }

  setAmbience(on: boolean) {
    if (on) {
      this.startAmbience();
      const ctx = this.ready();
      this.tone(ctx.currentTime, midi(81), 0.5, 0.15); // bip de contrôle : tu entends ça, le son marche
    }
    else this.stopAmbience?.();
    try { localStorage.setItem(STORE, on ? "on" : "off"); } catch { /* stockage indisponible */ }
  }

  /** Un contexte audio existe : l'utilisateur a déjà interagi avec la page. */
  get unlocked(): boolean {
    return this.ctx !== null;
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
