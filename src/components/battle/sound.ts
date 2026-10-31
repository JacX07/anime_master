// Sons du lecteur de combat : tout est synthétisé avec WebAudio, aucun fichier à charger.
// Deux bus (effets, musique) passent par un master puis un compresseur, pour garder de la marge avant la saturation.
// Les effets varient un peu à chaque coup (hauteur ±4 %) pour ne pas sonner en boucle, et la musique baisse un instant sous les gros impacts.

import type { BattleEvent } from "@/lib/battle";
import type { CardType } from "@/generated/prisma/enums";

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
const MUSIC_LEVEL = 0.45;
/** Boucle de musique : 128 battements par minute, 16 pas par mesure */
const STEP = 60 / 128 / 4;
/** Accords de la boucle (la mineur, fa, do, sol) : note de base, tierce, basse */
const CHORDS = [
  { root: 69, third: 3, bass: 45 },
  { root: 65, third: 4, bass: 41 },
  { root: 72, third: 4, bass: 48 },
  { root: 67, third: 4, bass: 43 },
];

export class BattleAudio {
  sfxOn = true;
  musicOn = true;
  private ctx: AudioContext | null = null;
  private sfx!: GainNode;
  private music!: GainNode;
  private arpBus!: BiquadFilterNode;
  private bassBus!: BiquadFilterNode;
  private noise!: AudioBuffer;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;

  private init(): AudioContext {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = 0.8;
    const limiter = ctx.createDynamicsCompressor();
    master.connect(limiter);
    limiter.connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = this.sfxOn ? 1 : 0;
    this.sfx.connect(master);
    this.music = ctx.createGain();
    this.music.gain.value = 0;
    this.music.connect(master);
    // Les notes de musique brillantes (carré, dent de scie) passent par un filtre pour ne pas piquer
    const lowpass = (hz: number) => {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = hz;
      f.connect(this.music);
      return f;
    };
    this.arpBus = lowpass(2200);
    this.bassBus = lowpass(450);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.ctx = ctx;
    return ctx;
  }

  /** À appeler depuis un geste de l'utilisateur : les navigateurs refusent de jouer du son avant. */
  unlock() {
    const ctx = this.init();
    if (ctx.state === "suspended") void ctx.resume();
  }

  /** Ferme le contexte audio (fin de la page) */
  dispose() {
    this.stopMusic();
    void this.ctx?.close();
    this.ctx = null;
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
    if (this.ctx) this.sfx.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.02);
  }

  // ---------- Briques ----------

  /** Une note : oscillateur dont la fréquence glisse de f0 à f1, avec une enveloppe courte. */
  private tone(t: number, type: OscillatorType, f0: number, f1: number, dur: number, gain: number, dest: AudioNode = this.sfx) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** Un souffle de bruit filtré dont la fréquence glisse de f0 à f1. */
  private hiss(t: number, filter: BiquadFilterType, f0: number, f1: number, dur: number, gain: number, q = 1, dest: AudioNode = this.sfx) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  /** La musique baisse un instant sous un gros impact, puis revient. */
  private duck(t: number) {
    if (!this.musicOn || !this.timer) return;
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.setTargetAtTime(MUSIC_LEVEL * 0.45, t, 0.01);
    this.music.gain.setTargetAtTime(MUSIC_LEVEL, t + 0.22, 0.18);
  }

  // ---------- Effets ----------

  /**
   * Joue le son d'un événement du journal. `prev` est l'événement d'avant (pour ne pas répéter un son sur une zone ou une
   * distribution de boucliers), `cur` le sort en cours, `speed` la vitesse de lecture (les sons raccourcissent jusqu'à ×2).
   */
  play(ev: BattleEvent, prev: BattleEvent | undefined, cur: { spell: "base" | "affinity"; type: CardType } | null, speed: number) {
    if (!this.sfxOn) return;
    const ctx = this.init();
    if (ctx.state === "suspended") return;
    const t = ctx.currentTime + 0.01;
    const k = 1 / Math.min(speed, 2);
    const v = 1 + (Math.random() - 0.5) * 0.08;
    switch (ev.kind) {
      case "round":
        this.tone(t, "sine", 150 * v, 90, 0.2 * k, 0.1);
        break;
      case "action":
        if (ev.spell === "base") this.hiss(t, "bandpass", 500, 1500, 0.1 * k, 0.16, 2);
        else this.cast(t, cur?.type ?? "COMBAT", k, v);
        break;
      case "damage": {
        const chain = prev?.kind === "damage" ? 0.6 : 1;
        const soaked = ev.absorbed >= ev.amount * 0.999;
        const power = (ev.affinity === "strong" ? 1.2 : ev.affinity === "weak" ? 0.7 : 1) * chain;
        if (soaked) {
          // Le bouclier encaisse : un tintement métallique, sans choc
          this.tone(t, "triangle", 1800 * v, 1200, 0.14 * k, 0.16 * chain);
          this.hiss(t, "highpass", 5000, 3000, 0.05, 0.1 * chain);
          break;
        }
        this.tone(t, "sine", 160 * v, 48, 0.18 * k, 0.55 * power);
        this.hiss(t, "lowpass", ev.affinity === "weak" ? 1200 : 2800, 350, 0.12 * k, 0.45 * power);
        if (ev.affinity === "strong") this.tone(t, "triangle", 660 * v, 990, 0.12 * k, 0.1);
        if (ev.crit) {
          this.tone(t, "square", 1200 * v, 2600, 0.12 * k, 0.1);
          this.tone(t, "sine", 110, 38, 0.3 * k, 0.5);
          this.hiss(t, "highpass", 6000, 2500, 0.1 * k, 0.2);
          this.duck(t);
        }
        break;
      }
      case "heal":
        if (prev?.kind === "heal") break;
        this.tone(t, "sine", 660 * v, 660 * v, 0.28 * k, 0.12);
        this.tone(t + 0.08 * k, "sine", 880 * v, 880 * v, 0.3 * k, 0.12);
        this.tone(t + 0.16 * k, "sine", 1320 * v, 1320 * v, 0.3 * k, 0.07);
        break;
      case "shield":
        if (ev.amount < 0) this.tone(t, "sine", 500, 200, 0.16 * k, 0.08);
        else if (prev?.kind !== "shield") this.tone(t, "sine", 420 * v, 840 * v, 0.16 * k, 0.1);
        break;
      case "status":
        if (!ev.on) break;
        if (ev.status === "exposed") this.tone(t, "square", 1500, 1500, 0.06, 0.04);
        else if (ev.status === "weaken") this.tone(t, "sine", 520, 240, 0.18 * k, 0.08);
        else this.tone(t, "sine", 400, 820, 0.14 * k, 0.08);
        break;
      case "ko":
        this.tone(t, "sawtooth", 280, 45, 0.55 * k, 0.16);
        this.hiss(t, "lowpass", 700, 80, 0.5 * k, 0.3);
        this.duck(t);
        break;
      case "end":
        this.jingle(t, ev.winner);
        break;
    }
  }

  /** Bruit de lancement du sort affilié, propre à chaque type. */
  private cast(t: number, type: CardType, k: number, v: number) {
    switch (type) {
      case "COMBAT":
        this.hiss(t, "highpass", 4500, 900, 0.16 * k, 0.3, 1);
        this.tone(t, "sawtooth", 300 * v, 120, 0.14 * k, 0.07);
        break;
      case "MYSTERE":
        this.tone(t, "sine", 330 * v, 220, 0.34 * k, 0.12);
        this.tone(t, "sine", 340 * v, 226, 0.34 * k, 0.12);
        this.hiss(t, "bandpass", 300, 900, 0.3 * k, 0.12, 4);
        break;
      case "MAGIE":
        [880, 1175, 1568].forEach((f, i) => this.tone(t + i * 0.06 * k, "triangle", f * v, f * v, 0.22 * k, 0.1));
        break;
      case "COEUR":
        this.tone(t, "sine", midi(72) * v, midi(72) * v, 0.45 * k, 0.1);
        this.tone(t + 0.1 * k, "sine", midi(76) * v, midi(76) * v, 0.45 * k, 0.1);
        break;
      case "AVENTURE":
        this.tone(t, "sine", 120 * v, 300, 0.4 * k, 0.22);
        this.hiss(t, "lowpass", 300, 1800, 0.35 * k, 0.2);
        break;
    }
  }

  /** Fin du combat : arpège montant pour l'équipe A (le joueur), descendant pour l'équipe B, deux notes neutres pour un nul. */
  private jingle(t: number, winner: "A" | "B" | null) {
    const notes = winner === "A" ? [72, 76, 79, 84] : winner === "B" ? [69, 65, 62, 57] : [67, 67];
    notes.forEach((n, i) => this.tone(t + i * 0.16, "triangle", midi(n), midi(n), i === notes.length - 1 ? 0.9 : 0.3, 0.14));
  }

  // ---------- Musique ----------

  /** Lance (ou relance) la boucle de musique avec un fondu d'entrée. */
  startMusic() {
    if (!this.musicOn || this.timer) return;
    const ctx = this.init();
    this.unlock();
    this.nextTime = ctx.currentTime + 0.08;
    this.music.gain.cancelScheduledValues(ctx.currentTime);
    this.music.gain.setTargetAtTime(MUSIC_LEVEL, ctx.currentTime, 0.4);
    this.timer = setInterval(() => this.schedule(), 40);
  }

  /** Arrête la boucle avec un fondu de sortie. */
  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.ctx) {
      this.music.gain.cancelScheduledValues(this.ctx.currentTime);
      this.music.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
  }

  /** Programme les pas de musique qui tombent dans les 200 prochaines millisecondes. */
  private schedule() {
    const ctx = this.ctx;
    if (!ctx) return;
    while (this.nextTime < ctx.currentTime + 0.2) {
      this.musicStep(this.step++, this.nextTime);
      this.nextTime += STEP;
    }
  }

  private musicStep(step: number, t: number) {
    const bar = Math.floor(step / 16) % CHORDS.length;
    const s = step % 16;
    const c = CHORDS[bar];
    const bus = this.music;
    if (s === 0) {
      // Nappe : l'accord tenu toute la mesure
      for (const n of [c.root - 12, c.root - 12 + c.third, c.root - 12 + 7]) this.tone(t, "triangle", midi(n), midi(n), 16 * STEP, 0.05, bus);
    }
    if (s % 4 === 0) this.tone(t, "sine", 130, 45, 0.16, 0.4, bus);
    if (s % 4 === 2) this.hiss(t, "highpass", 7000, 7000, 0.04, 0.07, 1, bus);
    if ([0, 3, 6, 8, 11, 14].includes(s)) this.tone(t, "sawtooth", midi(c.bass), midi(c.bass), 0.15, 0.12, this.bassBus);
    // Arpège : les trois notes de l'accord en boucle, une octave plus haut dans la seconde moitié de la mesure
    const arp = [0, c.third, 7, c.third][s % 4] + (s >= 8 ? 12 : 0);
    this.tone(t, "square", midi(c.root + arp), midi(c.root + arp), 0.1, 0.04, this.arpBus);
  }
}
