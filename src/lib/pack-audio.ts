import { getVolume, onVolumeChange } from "./audio-volume";
import { suspendWhenHidden } from "./audio-visibility";
// Sons de la salle des invocations, synthétisés en WebAudio (aucun fichier) :
// carte qui sort du paquet et carte retournée (papier), mécanisme d'invocation, ambiance de salle (nappe lente + cloche rare).

import type { Rarity } from "@/generated/prisma/enums";

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
const BASE_GAIN = 1.4;
const STORE = "am-packs-ambience";
const STORE_UI = "am-ui-sfx";

class PackAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private limiter!: DynamicsCompressorNode;
  private ambience!: GainNode;
  private noise!: AudioBuffer;
  private stopAmbience: (() => void) | null = null;

  /** Le contexte n'existe qu'après un geste de l'utilisateur (règle des navigateurs). */
  private init(): AudioContext {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.master = ctx.createGain();
    this.master.gain.value = BASE_GAIN * getVolume();
    onVolumeChange((v) => { if (this.ctx) this.master.gain.setTargetAtTime(BASE_GAIN * v, this.ctx.currentTime, 0.03); });
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    this.master.connect(limiter).connect(ctx.destination);
    this.limiter = limiter;
    this.ambience = ctx.createGain();
    this.ambience.gain.value = 0;
    this.ambience.connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    suspendWhenHidden(ctx);
    this.ctx = ctx;
    return ctx;
  }

  /** Coupe net tous les sons déjà programmés (saut d'une animation) : l'ancien bus est débranché, les sons suivants utilisent un bus neuf. */
  cut() {
    if (!this.ctx) return;
    this.master.disconnect();
    const m = this.ctx.createGain();
    m.gain.value = BASE_GAIN * getVolume();
    m.connect(this.limiter);
    this.ambience.disconnect();
    this.ambience.connect(m);
    this.master = m;
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

  /** Bruit filtré à enveloppe courte : brique de base des sons de papier. */
  private nz(at: number, o: { type?: BiquadFilterType; f: number; f2?: number; q?: number; att?: number; dur: number; g: number }) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const fl = ctx.createBiquadFilter();
    fl.type = o.type ?? "bandpass";
    fl.frequency.setValueAtTime(o.f, at);
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, at + o.dur);
    fl.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(o.g, at + (o.att ?? 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, at + o.dur);
    src.connect(fl).connect(g).connect(this.master);
    src.start(at, Math.random() * 0.5);
    src.stop(at + o.dur + 0.03);
  }

  /** Froissement : micro-craquements aléatoires, filtrés haut. */
  private rustle(at: number, span: number, n: number, level: number, lo: number, hi: number) {
    for (let i = 0; i < n; i++) {
      this.nz(at + Math.pow(Math.random(), 1.3) * span, {
        f: lo + Math.random() * (hi - lo), q: 1.5 + Math.random() * 3, att: 0.0004, dur: 0.004 + Math.random() * 0.012, g: level * (0.3 + Math.random() * 0.7),
      });
    }
  }

  /** Claquement mince du papier à plat. */
  private paperSnap(at: number, level = 1) {
    this.nz(at, { f: 3200, q: 0.9, att: 0.0006, dur: 0.022, g: 0.34 * level });
    this.nz(at, { type: "highpass", f: 5500, q: 0.4, att: 0.0004, dur: 0.014, g: 0.18 * level });
  }

  /** Une carte glisse hors du paquet (`delay` en secondes pour les enchaîner) : froissement léger, sans queue. */
  deal(delay = 0) {
    if (!this.uiOn) return;
    const ctx = this.ready();
    const t = ctx.currentTime + delay;
    this.nz(t, { type: "highpass", f: 1800, f2: 5000, q: 0.4, att: 0.05, dur: 0.15, g: 0.13 });
    this.rustle(t, 0.15, 10, 0.07, 2500, 7500);
  }

  /** Carte retournée : « parchemin lourd » (validé le 2026-11-09) : souffle d'étoffe épaisse puis claquement sourd et mat. */
  flip() {
    if (!this.uiOn) return;
    const ctx = this.ready();
    const t = ctx.currentTime + 0.02;
    this.nz(t, { f: 700, f2: 1700, q: 0.7, att: 0.05, dur: 0.22, g: 0.1 });
    this.nz(t + 0.17, { type: "lowpass", f: 700, dur: 0.08, g: 0.13 });
    this.thud(t + 0.17, 110, 60, 0.14, 0.08);
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

  // ---- Mécanisme d'invocation : rouage sec (docs/direction-artistique.md §6), calé sur SummonMachine ----
  /** Rafale de bruit filtrée : grincement, « tck » d'acier. */
  private burst(at: number, freq: number, q: number, dur: number, level: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.02);
  }

  /** Tintement de métal : partiels inharmoniques très courts. */
  private metal(at: number, base: number, level: number, dur: number) {
    [1, 2.76, 5.4, 8.93].forEach((m, i) => this.tone(at, base * m, dur / (1 + i * 0.8), level / (1 + i * 1.4)));
  }

  /** Nappe grave qui gonfle (dents de scie filtrées). */
  private pad(at: number, freq: number, dur: number, level: number) {
    const ctx = this.ctx!;
    [0, 6, -6].forEach((detune) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = freq;
      o.detune.value = detune;
      const fl = ctx.createBiquadFilter();
      fl.type = "lowpass";
      fl.frequency.setValueAtTime(300, at);
      fl.frequency.linearRampToValueAtTime(1800, at + dur * 0.7);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(level, at + dur * 0.6);
      g.gain.linearRampToValueAtTime(0.0001, at + dur);
      o.connect(fl).connect(g).connect(this.master);
      o.start(at);
      o.stop(at + dur + 0.05);
    });
  }

  /** Balayage montant (sinus fin qui gonfle puis s'éteint). */
  private rise(at: number, dur: number, f0: number, f1: number, level: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(level, at + dur * 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(this.master);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  /** Tic fin d'horlogerie. */
  private tic(at: number, level = 1) {
    this.nz(at, { f: 4200, q: 3, dur: 0.02, g: 0.3 * level });
    this.tone(at, 1700, 0.05, 0.04 * level);
  }

  /** Éclat SSR/UR « constellation encadrée » (DA §6) : balayage fin qui monte, tics à chaque losange, frappe de cloche à l'embrasement, nappe, chuintement, cloche d'arrivée. Calé sur --S du CSS (1,3 s SSR, 1,5 s UR). */
  jingle(rarity: "SSR" | "UR") {
    this.ui((_ctx, t0) => {
      const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
      const ur = rarity === "UR";
      const S = ur ? 1.5 : 1.3;
      const K = 0.4;
      const T = (s: number) => t0 + 0.05 + s;
      this.rise(T(0.08), S, 260, 2400, 0.045 * K);
      for (let i = 0; i < 8; i++) this.tic(T(0.75 + i * 0.11), K * 2);
      this.metal(T(S), hz(ur ? 55 : 60), 0.45 * K, 3.2);
      this.thud(T(S), 110, 45, 0.35, 0.7 * K);
      this.nz(T(S), { type: "highpass", f: 2500, dur: 0.3, g: 0.22 * K });
      if (ur) { this.metal(T(S + 0.28), hz(67), 0.35 * K, 3.2); this.metal(T(S + 0.28), hz(43), 0.45 * K, 4); }
      this.pad(T(S + 0.25), hz(ur ? 43 : 48), 2.2, 0.1 * K);
      this.pad(T(S + 0.25), hz(ur ? 50 : 55), 2.2, 0.08 * K);
      this.nz(T(S + 0.45), { type: "highpass", f: 600, f2: 5000, dur: 0.9, g: 0.14 * K, att: 0.5 });
      for (let i = 0; i < 6; i++) this.tone(T(S + 0.45 + i * 0.12), hz(72 + i * 3), 0.5, 0.05 * K);
      this.metal(T(S + 1.45), hz(ur ? 79 : 74), 0.3 * K, 2.8);
      this.thud(T(S + 1.45), 100, 45, 0.35, 0.6 * K);
      if (ur) { this.thud(T(S + 1.7), 80, 40, 0.35, 0.6 * K); this.metal(T(S + 1.7), hz(86), 0.25 * K, 3); }
    });
  }

  /** Un cran : friction, « tck » net, rebond du cliquet, coup grave quand la dent s'appuie. */
  private cog(at: number, i: number, ticks: number) {
    const tension = 1 + i * (0.5 / Math.max(1, ticks - 1)); // la tension monte jusqu'au verrou
    const jitter = 0.97 + Math.random() * 0.06;
    this.burst(at - 0.028, 2600, 1.2, 0.024, 0.18);
    this.burst(at, 4200 * jitter, 2.2, 0.018, 0.5 * tension);
    this.tone(at, 2900 * jitter, 0.03, 0.12 * tension);
    this.burst(at + 0.011, 3600, 3, 0.012, 0.22);
    this.thud(at, 150, 70, 0.05, 0.16 * tension);
  }

  /** Invocation « graduations » (DA §6) : balayage fin qui monte, tics tous les 5 crans, tintements à chaque douzième de tour, puis verrouillage (frappe de cloche pour une SSR/UR, choc discret sinon) et petites notes montantes. `rarity` = meilleure carte du paquet ; mêmes dates que SummonMachine. */
  machine(rarity: Rarity, fast: boolean) {
    if (!this.uiOn) return;
    const ctx = this.ready();
    const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
    const k = fast ? 0.6 : 1;
    const K = 0.4;
    const t = ctx.currentTime + 0.05;
    this.rise(t + 0.2 * k, 1.8 * k, 350, 2200, 0.04 * K);
    for (let i = 0; i < 12; i++) {
      this.tic(t + (0.25 + i * 5 * 0.028) * k, K * 2);
      this.metal(t + (0.25 + ((i + 1) * 1.7) / 12) * k, 1300 + i * 60, 0.05 * K, 0.1);
    }
    const L = t + 2.05 * k;
    const ur = rarity === "UR";
    if (rarity === "SSR" || ur) {
      this.metal(L, hz(ur ? 55 : 60), 0.45 * K, 3.2);
      this.thud(L, 110, 45, 0.35, 0.7 * K);
      this.nz(L, { type: "highpass", f: 2500, dur: 0.3, g: 0.22 * K });
      if (ur) { this.metal(L + 0.28, hz(67), 0.35 * K, 3.2); this.metal(L + 0.28, hz(43), 0.45 * K, 4); }
    } else {
      this.metal(L, hz(67), 0.25 * K, 1.2);
      this.thud(L, 100, 45, 0.3, 0.5 * K);
    }
    for (let i = 0; i < 5; i++) this.tone(L + 0.1 + i * 0.09, hz(76 + i * 3), 0.45, 0.04 * K);
  }

  /** Clic d'ouverture : petit coup grave et souffle montant. */
  open() {
    if (!this.uiOn) return;
    const ctx = this.ready();
    const t = ctx.currentTime;
    this.tone(t, 110, 0.25, 0.2, "triangle");
    this.swish(t, 0.35, 400, 5000, 0.4);
  }

  /** Harpe de cristal : notes pincées éparses avec écho sur une nappe discrète ; coupée en fondu. */
  startAmbience() {
    if (this.stopAmbience) return;
    const ctx = this.ready();
    const nodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
    // Écho : un retard rebouclé et filtré, qui fait traîner chaque note pincée.
    const echo = ctx.createGain();
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.42;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.45;
    const damp = ctx.createBiquadFilter();
    damp.type = "lowpass";
    damp.frequency.value = 1600;
    echo.connect(this.ambience);
    echo.connect(delay);
    delay.connect(damp);
    damp.connect(feedback).connect(delay);
    damp.connect(this.ambience);
    // Nappe presque inaudible (quinte), pour que le silence entre les notes reste habité
    for (const [freq, level] of [[220, 0.035], [330.4, 0.025]] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = level;
      o.connect(g).connect(this.ambience);
      o.start();
      nodes.push(o);
    }
    this.ambience.gain.cancelScheduledValues(ctx.currentTime);
    this.ambience.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
    // Notes pincées éparses (gamme pentatonique de do, sol4 à sol5), espacées de 1,4 à 3,8 s au hasard
    const scale = [67, 69, 72, 74, 76, 79];
    const pluck = (freq: number, dur: number, level: number, type: OscillatorType) => {
      const at = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(level, at + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.004 + dur);
      o.connect(g).connect(echo);
      o.start(at);
      o.stop(at + dur + 0.1);
    };
    let timer = 0;
    const next = () => {
      const f = midi(scale[Math.floor(Math.random() * scale.length)]);
      pluck(f, 1.6, 0.09, "triangle");
      pluck(f * 2, 0.6, 0.015, "sine");
      timer = window.setTimeout(next, 1400 + Math.random() * 2400);
    };
    timer = window.setTimeout(next, 500);
    this.stopAmbience = () => {
      window.clearTimeout(timer);
      this.ambience.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      window.setTimeout(() => {
        nodes.forEach((n) => { try { n.stop(); } catch { /* déjà arrêté */ } });
        echo.disconnect();
        damp.disconnect();
      }, 2000);
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
