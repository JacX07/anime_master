// La marche des cendres : boucle procédurale de 16 mesures à 152 BPM, validée en combat.
// Recette reproductible : scripts/generate-battle-music.py.
export class BattleMusic {
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private request: AbortController | null = null;
  private requested = false;
  private disposed = false;
  private offset = 0;
  private startedAt = 0;

  constructor(private readonly ctx: AudioContext, private readonly output: AudioNode) {}

  get playing() {
    return this.requested;
  }

  start() {
    if (this.requested || this.disposed || this.ctx.state === "closed") return;
    this.requested = true;
    if (this.buffer) this.playBuffer();
    else if (!this.request) void this.load();
  }

  stop() {
    this.requested = false;
    if (!this.source) return;
    const now = this.ctx.currentTime;
    this.offset = (this.offset + now - this.startedAt) % this.buffer!.duration;
    // Un bref fondu évite une discontinuité lorsqu'on coupe une note.
    this.gain!.gain.cancelAndHoldAtTime(now);
    this.gain!.gain.linearRampToValueAtTime(0, now + 0.03);
    this.source.stop(now + 0.035);
    this.source = null;
    this.gain = null;
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.request?.abort();
    this.buffer = null;
  }

  private async load() {
    const request = new AbortController();
    this.request = request;
    try {
      const response = await fetch("/audio/battle/combat.ogg", { signal: request.signal });
      if (!response.ok) throw new Error(`Musique de combat indisponible (${response.status})`);
      const buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
      if (this.disposed || this.ctx.state === "closed") return;
      this.buffer = buffer;
      if (this.requested) this.playBuffer();
    } catch (error) {
      this.requested = false;
      if (!request.signal.aborted && !this.disposed) console.warn("Impossible de charger la musique de combat.", error);
    } finally {
      if (this.request === request) this.request = null;
    }
  }

  private playBuffer() {
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = this.buffer;
    source.loop = true;
    this.startedAt = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, this.startedAt);
    // Même équilibre musique/effets que l'essai en combat approuvé.
    gain.gain.linearRampToValueAtTime(1.5, this.startedAt + 0.015);
    source.connect(gain).connect(this.output);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(this.startedAt, this.offset);
    this.source = source;
    this.gain = gain;
  }
}

/** Jingles courts, sur un bus indépendant pour survivre à l'arrêt de la boucle de combat. */
export class BattleResultMusic {
  private request = new AbortController();
  private buffers = new Map<"victory" | "defeat", Promise<AudioBuffer | null>>();
  private source: AudioBufferSourceNode | null = null;
  private version = 0;

  constructor(private readonly ctx: AudioContext, private readonly output: AudioNode) {
    for (const kind of ["victory", "defeat"] as const) {
      this.buffers.set(kind, this.load(kind));
    }
  }

  private async load(kind: "victory" | "defeat") {
    try {
      const response = await fetch(`/audio/battle/${kind}.ogg`, { signal: this.request.signal });
      if (!response.ok) throw new Error(`Jingle ${kind} indisponible (${response.status})`);
      return await this.ctx.decodeAudioData(await response.arrayBuffer());
    } catch (error) {
      if (!this.request.signal.aborted) console.warn("Impossible de charger la musique de fin.", error);
      return null;
    }
  }

  async play(kind: "victory" | "defeat") {
    this.stop();
    const version = this.version;
    const buffer = await this.buffers.get(kind);
    if (!buffer || version !== this.version || this.ctx.state === "closed") return;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = 0.3;
    source.connect(gain).connect(this.output);
    source.onended = () => {
      source.disconnect(); gain.disconnect();
      if (this.source === source) this.source = null;
    };
    this.source = source;
    source.start();
  }

  stop() {
    this.version++;
    this.source?.stop();
    this.source = null;
  }

  dispose() {
    this.stop();
    this.request.abort();
    this.buffers.clear();
  }
}
