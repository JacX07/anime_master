import { suspendWhenHidden } from "@/lib/audio-visibility";
// Sons du lecteur de combat : synthèse WebAudio et prise de lame enregistrée pour les attaques de base.
// Deux bus (effets, musique) passent par un master puis un compresseur, pour garder de la marge avant la saturation.
// Les effets varient un peu à chaque coup (hauteur ±4 %) pour ne pas sonner en boucle, et la musique baisse un instant sous les gros impacts.

import type { BattleEvent } from "@/lib/battle";
import type { CardType } from "@/generated/prisma/enums";
import type { AttackElement } from "@/lib/attack-element";
import { BattleMusic, BattleResultMusic } from "./music";

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
// Même niveau que la maquette validée à 65 % (gain logarithmique).
const MUSIC_LEVEL = 10 ** (-12.6 / 20);
// Secondes d'élan sautées au début de blade.ogg (l'entaille est à 0,13 s dans le fichier).
const BLADE_LEAD = 0.07;
// Sons élémentaires (direction A validée, public/audio/battle/elements) : l'impact tombe à 0,48 s dans chaque fichier.
const ELEMENT_IMPACT = 0.48;
const ELEMENTS: AttackElement[] = ["feu", "eau", "foudre", "air", "terre"];
const GENERATED_SFX = ["coup", "critique", "sort", "mort"] as const;
type GeneratedSfx = typeof GENERATED_SFX[number];
/** Élément et style visuel de la carte qui agit : les sorts jouent la séquence entière, les coups seulement l'impact. */
export interface ActorSound { element: AttackElement | null; magic: boolean }

export class BattleAudio {
  sfxOn = true;
  musicOn = true;
  private ctx: AudioContext | null = null;
  private sfx!: GainNode;
  private music!: GainNode;
  private musicEngine: BattleMusic | null = null;
  private resultMusic: BattleResultMusic | null = null;
  private generated = new Map<GeneratedSfx, AudioBuffer>();
  private generatedRequest: AbortController | null = null;
  private projectileActor: string | null = null;
  private pendingProjectileActor: string | null = null;
  private noise!: AudioBuffer;
  private blade: AudioBuffer | null = null;
  private bladeRequest: AbortController | null = null;
  private elements = new Map<AttackElement, AudioBuffer>();

  private init(): AudioContext {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = 0.8;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 12;
    limiter.ratio.value = 4;
    limiter.attack.value = 0.008;
    limiter.release.value = 0.18;
    master.connect(limiter);
    limiter.connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = this.sfxOn ? 1 : 0;
    this.sfx.connect(master);
    this.music = ctx.createGain();
    this.music.gain.value = 0;
    this.music.connect(master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    suspendWhenHidden(ctx);
    this.ctx = ctx;
    this.musicEngine = new BattleMusic(ctx, this.music);
    this.resultMusic = new BattleResultMusic(ctx, master);
    void this.loadGenerated(ctx);
    void this.loadBlade(ctx);
    void this.loadElements(ctx);
    return ctx;
  }

  /** À appeler depuis un geste de l'utilisateur : les navigateurs refusent de jouer du son avant. */
  unlock() {
    const ctx = this.init();
    if (!this.blade && !this.bladeRequest) void this.loadBlade(ctx);
    // Le contexte peut être fermé avant la fin du resume (page quittée, double montage en dev) : sans importance
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  }

  /** Ferme le contexte audio (fin de la page) */
  dispose() {
    this.stopMusic();
    this.musicEngine?.dispose();
    this.resultMusic?.dispose();
    this.resultMusic = null;
    this.generatedRequest?.abort();
    this.generatedRequest = null;
    this.generated.clear();
    this.projectileActor = null;
    this.pendingProjectileActor = null;
    this.musicEngine = null;
    this.bladeRequest?.abort();
    this.bladeRequest = null;
    this.blade = null;
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
    if (this.ctx) this.sfx.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.02);
  }

  // ---------- Briques ----------

  private async loadGenerated(ctx: AudioContext) {
    const request = new AbortController();
    this.generatedRequest = request;
    await Promise.all(GENERATED_SFX.map(async (name) => {
      try {
        const response = await fetch(`/audio/battle/${name}.ogg`, { signal: request.signal });
        if (!response.ok) throw new Error(`Son ${name} indisponible (${response.status})`);
        const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
        if (this.ctx === ctx) this.generated.set(name, buffer);
      } catch (error) {
        if (!request.signal.aborted) console.warn("Impossible de charger un son de combat.", error);
      }
    }));
    if (this.generatedRequest === request) this.generatedRequest = null;
  }

  private sample(t: number, name: GeneratedSfx, volume: number, rate = 1, offset = 0) {
    const buffer = this.generated.get(name);
    if (!buffer || !this.ctx) return false;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    gain.gain.value = volume;
    source.connect(gain).connect(this.sfx);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(t, offset);
    return true;
  }

  private async loadBlade(ctx: AudioContext) {
    const request = new AbortController();
    this.bladeRequest = request;
    try {
      const response = await fetch("/audio/battle/blade.ogg", { signal: request.signal });
      if (!response.ok) throw new Error(`Audio de lame indisponible (${response.status})`);
      const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      if (this.ctx === ctx) this.blade = buffer;
    } catch (error) {
      if (!request.signal.aborted) console.warn("Impossible de charger le son de lame.", error);
    } finally {
      if (this.bladeRequest === request) this.bladeRequest = null;
    }
  }

  private bladeHit(t: number, speed: number, variation: number, power: number) {
    if (!this.blade || !this.ctx) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.blade;
    source.playbackRate.value = variation;
    // Le fichier commence par un élan : on en saute le début pour que l'entaille tombe ~50 ms après le coup affiché.
    const duration = Math.min((this.blade.duration - BLADE_LEAD) / variation, 0.45 / Math.sqrt(speed));
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3 * power, t);
    gain.gain.setValueAtTime(0.3 * power, t + Math.max(0, duration - 0.05));
    gain.gain.linearRampToValueAtTime(0, t + duration);
    source.connect(gain).connect(this.sfx);
    source.start(t, BLADE_LEAD);
    source.stop(t + duration + 0.01);
  }

  private async loadElements(ctx: AudioContext) {
    await Promise.all(ELEMENTS.map(async (element) => {
      try {
        const response = await fetch(`/audio/battle/elements/${element}.ogg`);
        if (!response.ok) throw new Error(`Son ${element} indisponible (${response.status})`);
        const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
        if (this.ctx === ctx) this.elements.set(element, buffer);
      } catch (error) {
        console.warn("Impossible de charger un son d'élément.", error);
      }
    }));
  }

  /** Son d'élément joué à partir de `offset` secondes du fichier. */
  private element(t: number, element: AttackElement, offset: number, gain: number) {
    const buffer = this.elements.get(element);
    if (!buffer || !this.ctx) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.value = 0.55 * gain;
    source.connect(g).connect(this.sfx);
    source.start(t, offset);
  }

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
    if (!this.musicOn || !this.musicEngine?.playing) return;
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.setTargetAtTime(MUSIC_LEVEL * 0.45, t, 0.01);
    this.music.gain.setTargetAtTime(MUSIC_LEVEL, t + 0.22, 0.18);
  }

  // ---------- Effets ----------

  /**
   * Joue le son d'un événement du journal. `prev` est l'événement d'avant (pour ne pas répéter un son sur une zone ou une
   * distribution de boucliers), `cur` le sort en cours, `speed` la vitesse de lecture (les sons raccourcissent jusqu'à ×2).
   */
  play(ev: BattleEvent, prev: BattleEvent | undefined, cur: { spell: "base" | "affinity" | "special" | "tertiary" | "ultimate"; type: CardType } | null, speed: number, actor: ActorSound = { element: null, magic: false }) {
    if (ev.kind === "action") {
      this.projectileActor = null;
      this.pendingProjectileActor = null;
    }
    // La musique de résultat respecte Musique, même lorsque les effets sont coupés.
    if (ev.kind === "end" && ev.winner) {
      if (ev.winner === "A") this.playVictoryMusic();
      else this.playDefeatMusic();
      return;
    }
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
        // Tous les projectiles magiques génériques sont candidats. Le premier dégât ou
        // l'esquive confirme le tir : un buff/debuff/soin seul ne déclenche jamais ce son.
        if (!actor.element && actor.magic && (!ev.target || ev.target[0] !== ev.actor[0])) this.pendingProjectileActor = ev.actor;
        // Les rayons nommés ont aussi ce son quand le personnage est classé mêlée (Goku).
        // Leur lancement complet peut être anticipé, contrairement aux sorts génériques.
        if (!actor.element && /\b(?:zoltraak|kamehameha)\b/iu.test(ev.name ?? "") && (!ev.target || ev.target[0] !== ev.actor[0])) {
          // Le départ descendant est à 0,55 s dans le fichier, l'impact visuel à 0,48 s de replay.
          if (this.sample(t, "sort", 0.32, 1 / k, Math.max(0, 0.55 - 0.48 / speed / k))) this.projectileActor = ev.actor;
          else this.cast(t, cur?.type ?? "MAGIE", k, v);
        } else if (actor.element && actor.magic) {
          // Un sort élémentaire couvre son lancement et son impact (le premier coup tombe 480 ms de replay plus tard)
          this.element(t, actor.element, Math.max(0, ELEMENT_IMPACT - ELEMENT_IMPACT / speed), 1);
        } else if (ev.spell !== "base") this.cast(t, cur?.type ?? "COMBAT", k, v);
        break;
      case "damage": {
        const chain = prev?.kind === "damage" ? 0.6 : 1;
        const soaked = ev.absorbed >= ev.amount * 0.999;
        const power = (ev.affinity === "strong" ? 1.2 : ev.affinity === "weak" ? 0.7 : 1) * chain;
        const criticalSample = ev.crit && !soaked && this.sample(t, "critique", 0.42 * power, v / k, 0.045);
        if (criticalSample) this.duck(t);
        // Le départ est déjà passé : jouer la descente à l'impact du projectile générique.
        if (this.pendingProjectileActor === ev.source && this.projectileActor !== ev.source) {
          if (this.sample(t, "sort", 0.32, 1 / k, 0.55)) this.projectileActor = ev.source;
        }
        // Le rayon porte déjà son impact : pas de slash ni de coup de corps supplémentaire.
        if (this.projectileActor === ev.source) break;
        if (actor.element) {
          if (actor.magic) {
            // Le fichier lancé avec l'action porte déjà l'impact : on ne garde que le renfort du critique
            if (ev.crit && !criticalSample) { this.tone(t, "sine", 110, 38, 0.3 * k, 0.4); this.duck(t); }
            break;
          }
          // Coup de mêlée ou de lame : l'impact élémentaire s'ajoute au coup, une fois par action
          if (prev?.kind !== "damage") this.element(t, actor.element, ELEMENT_IMPACT - 0.03, 0.7);
        }
        if (cur?.spell === "base") {
          this.bladeHit(t, speed, v, power * (soaked ? 0.55 : ev.crit ? 1.25 : 1));
          // Le slash validé reste audible ; le choc de corps lui ajoute du poids.
          if (!soaked) this.sample(t, "coup", 0.16 * power, v / k, 0.1);
          if (ev.crit) this.duck(t);
          break;
        }
        if (soaked) {
          // Le bouclier encaisse : un tintement métallique, sans choc
          this.tone(t, "triangle", 1800 * v, 1200, 0.14 * k, 0.16 * chain);
          this.hiss(t, "highpass", 5000, 3000, 0.05, 0.1 * chain);
          break;
        }
        if (!this.sample(t, "coup", 0.4 * power, v / k, 0.1)) {
          this.tone(t, "sine", 160 * v, 48, 0.18 * k, 0.55 * power);
          this.hiss(t, "lowpass", ev.affinity === "weak" ? 1200 : 2800, 350, 0.12 * k, 0.45 * power);
        }
        if (ev.affinity === "strong") this.tone(t, "triangle", 660 * v, 990, 0.12 * k, 0.1);
        if (ev.crit && !criticalSample) {
          this.tone(t, "square", 1200 * v, 2600, 0.12 * k, 0.1);
          this.tone(t, "sine", 110, 38, 0.3 * k, 0.5);
          this.hiss(t, "highpass", 6000, 2500, 0.1 * k, 0.2);
          this.duck(t);
        }
        break;
      }
      case "dodge":
        if (this.pendingProjectileActor === ev.source && this.projectileActor !== ev.source) {
          if (this.sample(t, "sort", 0.32, 1 / k, 0.55)) this.projectileActor = ev.source;
        }
        if (cur?.spell === "base" && this.projectileActor !== ev.source && !(actor.element && actor.magic)) this.bladeHit(t, speed, v, 0.5);
        break;
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
        if (!this.sample(t, "mort", 0.4, 1 / k, 0.02)) {
          this.tone(t, "sawtooth", 280, 45, 0.55 * k, 0.16);
          this.hiss(t, "lowpass", 700, 80, 0.5 * k, 0.3);
        }
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

  /** Fin gagnée par le joueur (camp A). Ne dépend pas du réglage Effets. */
  playVictoryMusic() { this.playResultMusic("victory"); }

  /** Fin perdue par le joueur (camp B gagnant). */
  playDefeatMusic() { this.playResultMusic("defeat"); }

  private playResultMusic(kind: "victory" | "defeat") {
    if (!this.musicOn) return;
    this.init();
    this.stopMusic();
    void this.resultMusic?.play(kind);
  }

  /** Lance (ou relance) la boucle de musique avec un fondu d'entrée. */
  startMusic() {
    this.resultMusic?.stop();
    if (!this.musicOn || this.musicEngine?.playing) return;
    const ctx = this.init();
    this.unlock();
    this.music.gain.cancelScheduledValues(ctx.currentTime);
    this.music.gain.setTargetAtTime(MUSIC_LEVEL, ctx.currentTime, 0.4);
    this.musicEngine?.start();
  }

  /** Arrête la boucle avec un fondu de sortie. */
  stopMusic() {
    if (!this.musicOn) this.resultMusic?.stop();
    this.musicEngine?.stop();
    if (this.ctx) {
      this.music.gain.cancelScheduledValues(this.ctx.currentTime);
      this.music.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
  }

}
