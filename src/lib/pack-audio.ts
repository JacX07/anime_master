import { getVolume, onVolumeChange } from "./audio-volume";
import { suspendWhenHidden } from "./audio-visibility";
// Sons de la salle des invocations, synthétisés en WebAudio (aucun fichier) :
// carte qui sort du paquet, carte retournée, carillon pour les SSR et UR, ambiance de salle (nappe lente + cloche rare).

import type { Rarity } from "@/generated/prisma/enums";

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
const BASE_GAIN = 1.4;
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
    this.master.gain.value = BASE_GAIN * getVolume();
    onVolumeChange((v) => { if (this.ctx) this.master.gain.setTargetAtTime(BASE_GAIN * v, this.ctx.currentTime, 0.03); });
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    this.master.connect(limiter).connect(ctx.destination);
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
    if (!this.uiOn) return;
    const ctx = this.ready();
    const t = ctx.currentTime + delay;
    this.swish(t, 0.22, 900 * (0.9 + Math.random() * 0.2), 4200, 0.5);
    this.tone(t + 0.16, 150, 0.09, 0.12, "triangle");
  }

  /** Carte retournée : claquement de carte, avec carillon si SSR ou UR. */
  flip(rarity: Rarity) {
    if (!this.uiOn) return;
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

  /** Mécanisme d'invocation entier ; `rarity` = meilleure carte du paquet. Mêmes dates que SummonMachine. */
  machine(rarity: Rarity, fast: boolean) {
    if (!this.uiOn) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = this.ready();
    const t0 = ctx.currentTime;
    const beat = fast ? 0.17 : 0.3;
    const TICKS = 4;
    for (let i = 0; i < TICKS; i++) this.cog(t0 + 0.06 + beat * i, i, TICKS);
    const lk = t0 + 0.06 + beat * TICKS;
    // Verrouillage : deux impacts métal contre métal et un ressort qui se détend
    this.burst(lk, 3400, 1.6, 0.03, 0.6);
    this.metal(lk, 1700, 0.1, 0.09);
    this.thud(lk, 110, 55, 0.09, 0.4);
    this.burst(lk + 0.024, 2800, 1.6, 0.026, 0.5);
    this.thud(lk + 0.024, 80, 45, 0.1, 0.35);
    const sp = ctx.createOscillator();
    sp.type = "triangle";
    sp.frequency.setValueAtTime(820, lk + 0.05);
    sp.frequency.exponentialRampToValueAtTime(380, lk + 0.2);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, lk + 0.05);
    sg.gain.exponentialRampToValueAtTime(0.06, lk + 0.06);
    sg.gain.exponentialRampToValueAtTime(0.0001, lk + 0.2);
    sp.connect(sg).connect(this.master);
    sp.start(lk + 0.05);
    sp.stop(lk + 0.25);
    // Trois éclats qui tombent
    [0.58, 0.74, 0.9].forEach((d, k) => this.metal(lk + d, 2400 + k * 420, 0.06, 0.12));
    // Accent de rareté : ressort libéré et cloche d'horloge, aucun accord
    if (rarity === "SSR") {
      this.metal(lk + 0.02, 2800, 0.12, 0.25);
      this.iron(lk + 0.08, 520, 1.1, 0.14);
    } else if (rarity === "UR") {
      this.thud(lk, 52, 30, 0.35, 0.55);
      this.metal(lk + 0.02, 3100, 0.14, 0.3);
      this.iron(lk + 0.08, 330, 1.6, 0.18);
      this.iron(lk + 0.62, 330, 1.8, 0.16);
    }
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
