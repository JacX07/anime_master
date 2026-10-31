// Composition de combat validée dans public/mockups/battle-music.html.
// Les 32 mesures gardent leur montée, leur respiration et leur dernier refrain.
const BPM = 152;
const STEP = 60 / BPM / 4;
const BAR = STEP * 16;
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);
const CHORDS = [
  { bass: 45, notes: [57, 60, 64] },
  { bass: 41, notes: [53, 57, 60] },
  { bass: 38, notes: [50, 53, 57] },
  { bass: 40, notes: [52, 56, 59] },
];
// Un motif de huit mesures, avec respirations et réponse dans l'aigu.
const MELODY = [
  [[0,76,2],[3,76,1],[4,79,2],[7,81,3],[12,79,2],[14,76,2]],
  [[0,77,3],[4,76,2],[6,72,2],[10,74,2],[12,76,4]],
  [[0,74,2],[3,77,1],[4,81,3],[8,79,2],[10,77,2],[12,76,2],[14,74,2]],
  [[0,71,3],[4,74,2],[7,76,2],[10,80,2],[12,83,3]],
  [[0,81,2],[3,81,1],[4,84,2],[7,83,3],[12,81,2],[14,79,2]],
  [[0,81,3],[4,79,2],[6,77,2],[10,76,2],[12,77,4]],
  [[0,77,2],[3,79,1],[4,81,3],[8,84,2],[10,83,2],[12,81,3]],
  [[0,80,3],[4,76,2],[7,74,2],[10,71,2],[12,76,2],[14,80,2]],
];

type MusicBus = "drums" | "bass" | "rhythm" | "lead" | "strings";
interface VoiceOptions {
  attack?: number;
  cutoff?: number;
  tail?: number;
  q?: number;
  wet?: number;
  echo?: number;
  detune?: number;
  type?: OscillatorType;
  bend?: number;
}

export class BattleMusic {
  private buses: Record<MusicBus, GainNode>;
  private reverb: ConvolverNode;
  private delay: DelayNode;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;
  private level = 1;
  private lastLevel = 0;

  constructor(private readonly ctx: AudioContext, output: AudioNode, private readonly noiseBuffer: AudioBuffer) {
    this.buses = Object.fromEntries(["drums", "bass", "rhythm", "lead", "strings"].map((name) => {
      const gain = this.ctx.createGain(); gain.connect(output); return [name, gain];
    })) as Record<MusicBus, GainNode>;
    const shape = this.ctx.createWaveShaper();
    shape.curve = Float32Array.from({length:2048}, (_, i) => Math.tanh((i / 1023.5 - 1) * 2.1) / Math.tanh(2.1));
    shape.oversample = "2x";
    const guitarFilter = this.ctx.createBiquadFilter(); guitarFilter.type = "lowpass"; guitarFilter.frequency.value = 2900;
    this.buses.rhythm.disconnect(); this.buses.rhythm.connect(shape).connect(guitarFilter).connect(output);
    this.reverb = this.ctx.createConvolver();
    const impulse = this.ctx.createBuffer(2, Math.floor(this.ctx.sampleRate * 1.25), this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
    }
    this.reverb.buffer = impulse;
    const wet = this.ctx.createGain(); wet.gain.value = .13; this.reverb.connect(wet).connect(output);
    this.delay = this.ctx.createDelay(1); this.delay.delayTime.value = STEP * 3;
    const feedback = this.ctx.createGain(); feedback.gain.value = .24;
    const delayFilter = this.ctx.createBiquadFilter(); delayFilter.type = "lowpass"; delayFilter.frequency.value = 2800;
    this.delay.connect(delayFilter).connect(feedback).connect(this.delay);
    const delayWet = this.ctx.createGain(); delayWet.gain.value = .2; delayFilter.connect(delayWet).connect(output);
  }

  get playing() {
    return this.timer !== null;
  }

  start() {
    if (this.timer || this.ctx.state === "closed") return;
    // Reprendre sur une mesure évite de couper le premier accord après une pause.
    this.step = Math.ceil(this.step / 16) * 16;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private envelope(gain: GainNode, t: number, peak: number, attack: number, duration: number) {
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, t + Math.max(attack + .005, duration));
  }

  private voice(t: number, note: number, duration: number, gain: number, bus: AudioNode, options: VoiceOptions = {}) {
    const output = this.ctx.createGain(); this.envelope(output, t, gain, options.attack ?? .006, duration);
    const filter = this.ctx.createBiquadFilter(); filter.type = "lowpass";
    filter.frequency.setValueAtTime(options.cutoff ?? 3600, t);
    filter.frequency.exponentialRampToValueAtTime(options.tail ?? 1300, t + duration);
    filter.Q.value = options.q ?? .65;
    filter.connect(output).connect(bus);
    if (options.wet) { const send = this.ctx.createGain(); send.gain.value = options.wet; output.connect(send).connect(this.reverb); }
    if (options.echo) { const send = this.ctx.createGain(); send.gain.value = options.echo; output.connect(send).connect(this.delay); }
    (options.detune ? [-options.detune, options.detune] : [0]).forEach((cents) => {
      const oscillator = this.ctx.createOscillator(); oscillator.type = options.type ?? "sawtooth";
      oscillator.frequency.setValueAtTime(hz(note), t); oscillator.detune.value = cents;
      if (options.bend) oscillator.frequency.exponentialRampToValueAtTime(hz(note + options.bend), t + .04);
      oscillator.connect(filter); oscillator.start(t); oscillator.stop(t + duration + .025);
    });
  }

  private noise(t: number, duration: number, gain: number, from: number, to: number, type: BiquadFilterType = "bandpass", wet = 0) {
    const source = this.ctx.createBufferSource(); source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter(); filter.type = type; filter.Q.value = .7;
    filter.frequency.setValueAtTime(from, t); filter.frequency.exponentialRampToValueAtTime(to, t + duration);
    const output = this.ctx.createGain(); this.envelope(output, t, gain, .002, duration);
    source.connect(filter).connect(output).connect(this.buses.drums);
    if (wet) { const send = this.ctx.createGain(); send.gain.value = wet; output.connect(send).connect(this.reverb); }
    source.start(t, Math.random() * .3, duration); source.stop(t + duration + .01);
  }

  private drumTone(t: number, frequency: number, end: number, duration: number, gain: number) {
    const oscillator = this.ctx.createOscillator(); const output = this.ctx.createGain();
    oscillator.frequency.setValueAtTime(frequency, t); oscillator.frequency.exponentialRampToValueAtTime(end, t + duration * .7);
    this.envelope(output, t, gain, .002, duration); oscillator.connect(output).connect(this.buses.drums);
    oscillator.start(t); oscillator.stop(t + duration + .02);
  }
  private kick(t: number, power = 1) { this.drumTone(t, 155, 46, .22, .72 * power); this.noise(t, .025, .08 * power, 2200, 1200, "highpass"); }
  private snare(t: number, power = 1) { this.drumTone(t, 195, 120, .14, .17 * power); this.noise(t, .18, .34 * power, 1900, 1000, "bandpass", .12); this.noise(t, .09, .10 * power, 5200, 3500, "highpass"); }
  private hat(t: number, open = false, power = 1) { this.noise(t, open ? .19 : .045, (open ? .045 : .036) * power, 6900, open ? 5800 : 7200, "highpass"); }
  private crash(t: number, power = 1) { this.noise(t, 1.05, .13 * power, 7600, 3200, "highpass", .2); }
  private tom(t: number, high: boolean) { this.drumTone(t, high ? 210 : 140, high ? 95 : 64, .21, .26); this.noise(t, .04, .035, 2200, 600); }

  private setMix(t: number) {
    this.buses.drums.gain.setTargetAtTime(this.level === 3 ? .93 : .82, t, .15);
    this.buses.bass.gain.setTargetAtTime(.78, t, .15);
    this.buses.rhythm.gain.setTargetAtTime(this.level === 1 ? .65 : .85, t, .18);
    this.buses.lead.gain.setTargetAtTime(this.level === 1 ? .25 : .78, t, .2);
    this.buses.strings.gain.setTargetAtTime(this.level === 1 ? .08 : this.level === 2 ? .36 : .53, t, .25);
  }

  private musicStep(index: number, t: number) {
    const bar = Math.floor(index / 16), s = index % 16, cycle = bar % 32;
    const chord = CHORDS[bar % 4];
    // La respiration centrale crée un contraste avant le dernier refrain.
    const bridge = cycle >= 20 && cycle < 24;
    if (s === 0) {
      this.level = cycle < 4 || bridge ? 1 : cycle < 12 ? 2 : 3;
      this.setMix(t);
      if (bar % 8 === 0 || this.level > this.lastLevel) this.crash(t, this.level === 3 ? 1 : .65);
      this.lastLevel = this.level;
      chord.notes.forEach((note) => this.voice(t, note + 12, BAR * .92, .018, this.buses.strings, {type:"triangle",attack:.15,cutoff:1800,tail:1200,wet:.3}));
    }
    const kicks = bridge ? [0, 10] : this.level === 1 ? [0, 6, 8, 14] : [0, 3, 6, 8, 11, 14];
    if (kicks.includes(s)) this.kick(t, s === 0 || s === 8 ? 1 : .78);
    if (bridge ? s === 8 : s === 4 || s === 12) this.snare(t);
    if (this.level === 3 && s === 11 && bar % 2) this.snare(t, .28);
    if (s % 2 === 0) this.hat(t, !bridge && s === 14 && bar % 2 === 1, s % 4 === 0 ? .8 : 1);
    if (this.level === 3 && [3,7,11,15].includes(s)) this.hat(t, false, .45);
    if (s === 15 && bar % 4 === 3) this.snare(t, .48);
    if (bar % 8 === 7 && s >= 12) { if (s === 12 || s === 14) this.tom(t, s === 12); if (s === 15) this.snare(t, .7); }

    const bassSteps = bridge ? [0, 8] : [0, 3, 6, 8, 10, 14];
    if (bassSteps.includes(s)) {
      const note = chord.bass + (!bridge && s === 10 ? 12 : 0);
      this.voice(t, note, bridge ? STEP * 6 : STEP * (s === 0 || s === 8 ? 2.6 : 1.6), .19, this.buses.bass, {cutoff:650,tail:260});
      this.voice(t, note, STEP * 1.8, .12, this.buses.bass, {type:"sine",cutoff:400,tail:180});
    }
    const chugs = bridge ? [0, 8] : this.level === 1 ? [0, 6, 8, 14] : [0, 2, 3, 6, 8, 10, 11, 14];
    if (chugs.includes(s)) {
      const root = chord.bass + 12;
      [root,root + 7,root + 12].forEach((note) => this.voice(t, note, STEP * (bridge ? 6 : s % 8 === 0 ? 2.3 : 1.15), .036, this.buses.rhythm, {cutoff:2400,tail:750,type:"sawtooth"}));
    }
    if (!bridge) MELODY[bar % 8].forEach(([at, note, length]) => {
      if (at !== s || (this.level === 1 && s !== 0 && s !== 7 && s !== 12)) return;
      this.voice(t, note, STEP * length * .90, .065, this.buses.lead, {detune:5,cutoff:4200,tail:1700,echo:.3,wet:.14});
      if (this.level === 3) this.voice(t, note - 12, STEP * length * .82, .035, this.buses.lead, {type:"triangle",cutoff:2300,tail:1300,wet:.12});
    });
    if (bridge && s === 0) this.voice(t, [76,77,74,80][bar % 4], BAR * .7, .065, this.buses.lead, {type:"triangle",attack:.05,cutoff:2600,tail:1400,echo:.5,wet:.4});
    if (this.level >= 2 && !bridge && [2,6,10,14].includes(s)) {
      const n = chord.notes[[0,2,1,2][Math.floor(s / 4)]] + 12;
      this.voice(t, n, STEP * 1.25, .04, this.buses.strings, {type:"sawtooth",attack:.015,cutoff:2100,tail:800,wet:.12});
    }
  }

  private schedule() {
    if (this.nextTime < this.ctx.currentTime - .3) { const skipped = Math.ceil((this.ctx.currentTime - this.nextTime + .06) / STEP); this.step += skipped; this.nextTime += skipped * STEP; }
    while (this.nextTime < this.ctx.currentTime + .15) { this.musicStep(this.step++, this.nextTime); this.nextTime += STEP; }
  }

}
