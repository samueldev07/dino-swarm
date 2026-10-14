/**
 * Sound design, fully synthesised (no audio files to download).
 *
 * Signal chain:  voices -> sfx / music bus -> compressor -> speakers
 *                              \-> shared reverb (generated impulse) -/
 *
 * Every effect is layered (transient + body + tail), slightly detuned at
 * random so repeats never sound identical, and panned to where it happens
 * on screen (champion left, enemy right). Effects are rate-limited per voice
 * so fast tapping never piles up (spec §10).
 *
 * Music is a small step sequencer: a 16-bar calm song in C major (drums,
 * bass, pad, marimba melody with an A/B section) and a driving A-minor boss
 * track, which speeds up when either side of the duel is close to falling.
 */
export type Voice =
  | 'buy' | 'hatch' | 'select' | 'merge' | 'discover' | 'deny' | 'unlock' | 'claim'
  | 'cast' | 'hit' | 'kill' | 'boss' | 'bossCast' | 'hurt' | 'heartbeat' | 'win' | 'ko'
  | 'tap' | 'super' | 'ready' | 'chest' | 'combo' | 'crit' | 'lucky' | 'stars'
  | 'whistle' | 'thud' | 'dizzy';

export type MusicMood = 'calm' | 'boss' | 'final';

type Filter = { type: BiquadFilterType; f: number; f2?: number; q?: number };

interface ToneOpts {
  type?: OscillatorType;
  f: number;
  /** Glide target frequency. */
  f2?: number;
  t?: number;
  dur: number;
  gain: number;
  attack?: number;
  detune?: number;
  pan?: number;
  filter?: Filter;
  bus?: 'sfx' | 'mus';
}

interface NoiseOpts {
  t?: number;
  dur: number;
  gain: number;
  filter: Filter;
  pan?: number;
  attack?: number;
  bus?: 'sfx' | 'mus';
}

const MIN_GAP: Partial<Record<Voice, number>> = {
  hit: 0.07, cast: 0.07, select: 0.05, deny: 0.15, heartbeat: 0.5, hatch: 0.04, buy: 0.04,
  tap: 0.05, stars: 0.12,
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const rnd = (amount: number) => 1 + (Math.random() - 0.5) * amount;

// ------------------------------------------------------------- the songs
// Dark Folk Fairy-Tale / Prehistoric Survival soundtrack in D Dorian & D Harmonic Minor.
// Built on an 8-bar / 16-bar structure with plucked folk lute, wooden flute, frame drum (bodhrán),
// bowed cello drone, and war-horn stabs — zero external audio file size.
const FOLK_CHORDS: Record<string, number[]> = {
  Dm: [62, 65, 69],   // D4 F4 A4
  C:  [60, 64, 67],   // C4 E4 G4
  Gm: [58, 62, 67],   // Bb3 D4 G4
  Bb: [58, 62, 65],   // Bb3 D4 F4
  Am: [57, 60, 64],   // A3 C4 E4
  A7: [57, 61, 64],   // A3 C#4 E4 (harmonic minor dominant tension)
  F:  [60, 65, 69],   // C4 F4 A4
};
const FOLK_BASS: Record<string, number> = {
  Dm: 50, C: 48, Gm: 43, Bb: 46, Am: 45, A7: 45, F: 41,
};
// 16-bar journey: Section A (Mystic Woods march) -> Section B (Swarm Rising chorus)
const CALM_BARS = [
  'Dm', 'Gm', 'C', 'Dm', 'Bb', 'Gm', 'A7', 'Dm',
  'Dm', 'F',  'C', 'Gm', 'Bb', 'C',  'A7', 'Dm',
];
/** Wooden flute & plucked lute melody: per bar, [step, midi, durSteps] on a 16-step grid. */
const CALM_MELODY: [number, number, number][][] = [
  // Section A: Haunting Dorian folk theme
  [[0, 74, 3], [3, 77, 2], [6, 76, 2], [8, 74, 4], [12, 69, 4]],
  [[0, 70, 3], [3, 74, 2], [6, 79, 4], [12, 77, 4]],
  [[0, 76, 3], [3, 74, 2], [6, 72, 2], [8, 74, 3], [12, 76, 4]],
  [[0, 74, 6], [8, 69, 4], [12, 72, 4]],
  [[0, 70, 3], [3, 74, 2], [6, 77, 3], [10, 76, 2], [12, 74, 4]],
  [[0, 79, 3], [3, 77, 2], [6, 74, 2], [8, 70, 4], [12, 74, 4]],
  [[0, 73, 4], [4, 76, 4], [8, 79, 4], [12, 76, 3], [15, 73, 1]],
  [[0, 74, 8], [10, 69, 3], [14, 72, 2]],
  // Section B: Soaring survival call
  [[0, 81, 3], [3, 79, 2], [6, 77, 2], [8, 74, 4], [12, 77, 4]],
  [[0, 81, 4], [4, 84, 4], [8, 81, 4], [12, 79, 4]],
  [[0, 76, 3], [3, 79, 2], [6, 81, 3], [10, 79, 2], [12, 76, 4]],
  [[0, 79, 4], [4, 74, 4], [8, 70, 4], [12, 74, 4]],
  [[0, 77, 3], [3, 74, 2], [6, 70, 2], [8, 74, 4], [12, 77, 4]],
  [[0, 76, 3], [3, 79, 2], [6, 81, 3], [10, 84, 2], [12, 79, 4]],
  [[0, 81, 3], [3, 79, 2], [6, 76, 2], [8, 73, 4], [12, 76, 4]],
  [[0, 74, 10]],
];

// Boss & Final: D Phrygian Dominant / Harmonic Minor war chant (Dm - Eb - Gm - A7 / Dm - Bb - Gm - A7)
const BOSS_CHORDS = [
  [62, 65, 69], [63, 67, 70], [58, 62, 67], [57, 61, 64],
  [62, 65, 69], [58, 62, 65], [58, 62, 67], [57, 61, 67],
];
const BOSS_BASS = [50, 51, 43, 45, 50, 46, 43, 45];
const BOSS_RIFF: [number, number][][] = [
  [[0, 74], [2, 74], [3, 77], [4, 74], [6, 73], [8, 74], [10, 79], [12, 77], [14, 74]],
  [[0, 75], [2, 75], [3, 79], [4, 75], [6, 74], [8, 75], [10, 82], [12, 79], [14, 75]],
  [[0, 70], [2, 74], [4, 79], [6, 77], [8, 74], [10, 70], [12, 67], [14, 70]],
  [[0, 69], [2, 73], [4, 76], [6, 79], [8, 81], [10, 79], [12, 76], [14, 73]],
];

export class Audio {
  sound = true;
  music = true;
  suspended = false;

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private mus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private last = new Map<Voice, number>();

  private mood: MusicMood = 'calm';
  private nextMood: MusicMood = 'calm';
  private timer: number | null = null;
  private nextStep = 0;
  private step = 0;
  private bar = 0;
  private loops = 0;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !this.suspended) void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      const ctx = new Ctor();
      this.ctx = ctx;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 4;
      comp.attack.value = 0.004;
      comp.release.value = 0.2;
      comp.connect(ctx.destination);
      this.master = ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(comp);

      const verb = ctx.createConvolver();
      verb.buffer = this.impulse(1.9, 2.6);
      const verbOut = ctx.createGain();
      verbOut.gain.value = 0.9;
      verb.connect(verbOut);
      verbOut.connect(this.master);

      this.sfx = ctx.createGain();
      this.sfx.gain.value = 0.55;
      this.sfx.connect(this.master);
      const sfxVerb = ctx.createGain();
      sfxVerb.gain.value = 0.16;
      this.sfx.connect(sfxVerb);
      sfxVerb.connect(verb);

      this.mus = ctx.createGain();
      this.mus.gain.value = 0;
      this.mus.connect(this.master);
      const musVerb = ctx.createGain();
      musVerb.gain.value = 0.28;
      this.mus.connect(musVerb);
      musVerb.connect(verb);

      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

      this.applyMusic();
    } catch {
      this.ctx = null;
    }
  }

  /** Stereo exponential-decay noise: a cheap but convincing room. */
  private impulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  setSuspended(on: boolean): void {
    this.suspended = on;
    if (!this.ctx) return;
    if (on) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  setMusic(on: boolean): void {
    this.music = on;
    this.applyMusic();
  }

  /** Mood changes land on the next bar line, so the music never stumbles. */
  setMood(mood: MusicMood): void {
    this.nextMood = mood;
  }

  private applyMusic(): void {
    if (!this.ctx || !this.mus) return;
    const t = this.ctx.currentTime;
    this.mus.gain.cancelScheduledValues(t);
    this.mus.gain.setValueAtTime(this.mus.gain.value, t);
    this.mus.gain.linearRampToValueAtTime(this.music ? 0.42 : 0, t + 0.6);
    if (this.music && this.timer === null) {
      this.nextStep = this.ctx.currentTime + 0.1;
      this.timer = window.setInterval(() => this.schedule(), 25);
    } else if (!this.music && this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  // ========================================================= primitives
  private out(bus: 'sfx' | 'mus' = 'sfx'): GainNode {
    return bus === 'mus' ? this.mus! : this.sfx!;
  }

  private chain(node: AudioNode, o: { pan?: number; filter?: Filter; t: number; dur: number; bus?: 'sfx' | 'mus' }, gain: GainNode): void {
    const ctx = this.ctx!;
    let head: AudioNode = node;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = o.filter.type;
      f.frequency.setValueAtTime(o.filter.f, o.t);
      if (o.filter.f2) f.frequency.exponentialRampToValueAtTime(o.filter.f2, o.t + o.dur);
      f.Q.value = o.filter.q ?? 0.8;
      head.connect(f);
      head = f;
    }
    head.connect(gain);
    if (o.pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, o.pan));
      gain.connect(p);
      p.connect(this.out(o.bus));
    } else {
      gain.connect(this.out(o.bus));
    }
  }

  private env(g: GainNode, t: number, attack: number, dur: number, peak: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.01));
  }

  private tone(o: ToneOpts): void {
    const ctx = this.ctx!;
    const t = o.t ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    this.env(g, t, o.attack ?? 0.004, o.dur, o.gain);
    this.chain(osc, { ...o, t }, g);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  private noise(o: NoiseOpts): void {
    const ctx = this.ctx!;
    const t = o.t ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const g = ctx.createGain();
    this.env(g, t, o.attack ?? 0.002, o.dur, o.gain);
    this.chain(src, { ...o, t }, g);
    src.start(t, Math.random() * 1.5);
    src.stop(t + o.dur + 0.05);
  }

  // ============================================================ effects
  play(voice: Voice, variation = 0): void {
    if (!this.sound || this.suspended || !this.ctx || !this.sfx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const gap = MIN_GAP[voice] ?? 0.03;
    if (now - (this.last.get(voice) ?? -1) < gap) return;
    this.last.set(voice, now);
    const t = now;

    switch (voice) {
      case 'buy': {
        const k = rnd(0.04);
        this.noise({ dur: 0.02, gain: 0.12, filter: { type: 'highpass', f: 6000 } });
        this.tone({ f: 1568 * k, dur: 0.12, gain: 0.22 });
        this.tone({ f: 2093 * k, t: t + 0.06, dur: 0.3, gain: 0.2 });
        this.tone({ type: 'triangle', f: 3136 * k, t: t + 0.06, dur: 0.2, gain: 0.05 });
        break;
      }
      case 'hatch': {
        for (const d of [0, 0.05, 0.11]) {
          this.noise({ t: t + d, dur: 0.035, gain: 0.25, filter: { type: 'bandpass', f: 2600 * rnd(0.3), q: 3 } });
        }
        this.tone({ f: 420, f2: 980 * rnd(0.1), t: t + 0.14, dur: 0.12, gain: 0.32 });
        this.tone({ type: 'triangle', f: 2637, t: t + 0.2, dur: 0.25, gain: 0.07 });
        break;
      }
      case 'select':
        this.noise({ dur: 0.015, gain: 0.12, filter: { type: 'bandpass', f: 3200, q: 2 } });
        this.tone({ f: 880 * rnd(0.03), dur: 0.07, gain: 0.12 });
        break;
      case 'merge': {
        // pitch climbs a whole tone per tier, so evolving sounds like progress
        const root = 220 * Math.pow(2, ((variation - 1) * 2) / 12);
        this.noise({ dur: 0.2, gain: 0.22, filter: { type: 'bandpass', f: 400, f2: 3200, q: 1.2 }, attack: 0.08 });
        this.tone({ f: 110, f2: 52, t: t + 0.16, dur: 0.16, gain: 0.4 });
        for (const r of [1, 1.26, 1.5, 2]) {
          this.tone({ type: 'triangle', f: root * 2 * r, t: t + 0.16, dur: 0.5, gain: 0.12 });
        }
        this.tone({ f: root * 8, t: t + 0.2, dur: 0.35, gain: 0.04 });
        break;
      }
      case 'discover': {
        [523, 659, 784, 1047, 1319].forEach((f, i) => {
          this.tone({ type: 'square', f, t: t + i * 0.085, dur: 0.28, gain: 0.06, filter: { type: 'lowpass', f: 3000 } });
          this.tone({ type: 'triangle', f, t: t + i * 0.085, dur: 0.3, gain: 0.12 });
        });
        for (const f of [523, 659, 784, 1047]) this.tone({ type: 'triangle', f, t: t + 0.46, dur: 1.2, gain: 0.07, attack: 0.02 });
        this.noise({ t: t + 0.4, dur: 0.9, gain: 0.05, filter: { type: 'highpass', f: 7000 }, attack: 0.2 });
        break;
      }
      case 'deny':
        this.tone({ type: 'square', f: 196, dur: 0.09, gain: 0.1, filter: { type: 'lowpass', f: 900 } });
        this.tone({ type: 'square', f: 165, t: t + 0.09, dur: 0.12, gain: 0.1, filter: { type: 'lowpass', f: 900 } });
        break;
      case 'unlock':
        this.noise({ dur: 0.38, gain: 0.25, filter: { type: 'lowpass', f: 500, f2: 1400 }, attack: 0.05 });
        this.tone({ type: 'triangle', f: 784, t: t + 0.22, dur: 0.3, gain: 0.13 });
        this.tone({ type: 'triangle', f: 1175, t: t + 0.3, dur: 0.4, gain: 0.13 });
        break;
      case 'claim':
        [1047, 1319, 1568, 2093].forEach((f, i) => this.tone({ f, t: t + i * 0.05, dur: 0.28, gain: 0.13 }));
        this.noise({ t: t + 0.15, dur: 0.5, gain: 0.04, filter: { type: 'highpass', f: 8000 } });
        break;
      case 'cast':
        this.cast(Math.max(1, Math.min(12, variation)));
        break;
      case 'hit': {
        const pan = 0.35;
        this.tone({ f: 160 * rnd(0.1), f2: 55, dur: 0.13, gain: 0.45, pan });
        this.noise({ dur: 0.06, gain: 0.3, filter: { type: 'bandpass', f: 1800 * rnd(0.3), q: 0.8 }, pan });
        this.tone({ type: 'triangle', f: 440 * Math.pow(2, variation / 12), dur: 0.05, gain: 0.06, pan });
        break;
      }
      case 'kill':
        this.noise({ dur: 0.38, gain: 0.3, filter: { type: 'lowpass', f: 1000, f2: 250 }, pan: 0.35 });
        this.tone({ f: 1568, t: t + 0.12, dur: 0.12, gain: 0.14, pan: 0.2 });
        this.tone({ f: 2093, t: t + 0.18, dur: 0.25, gain: 0.12, pan: 0.2 });
        break;
      case 'boss':
        this.tone({ type: 'sawtooth', f: 110, f2: 68, dur: 1.0, gain: 0.16, filter: { type: 'lowpass', f: 800 }, attack: 0.05, pan: 0.3 });
        this.tone({ type: 'sawtooth', f: 113, f2: 70, dur: 1.0, gain: 0.16, filter: { type: 'lowpass', f: 700 }, attack: 0.05, pan: 0.3 });
        this.noise({ dur: 1.1, gain: 0.45, filter: { type: 'lowpass', f: 160 }, attack: 0.1 });
        this.tone({ f: 70, f2: 35, t: t + 0.35, dur: 0.5, gain: 0.5 });
        break;
      case 'bossCast':
        this.noise({ dur: 0.42, gain: 0.3, filter: { type: 'bandpass', f: 280, f2: 1100, q: 1 }, attack: 0.15, pan: 0.3 });
        this.tone({ type: 'sawtooth', f: 92, f2: 74, dur: 0.32, gain: 0.12, filter: { type: 'lowpass', f: 500 }, pan: 0.4 });
        break;
      case 'hurt':
        this.tone({ f: 125, f2: 48, dur: 0.2, gain: 0.5, pan: -0.35 });
        this.noise({ dur: 0.12, gain: 0.32, filter: { type: 'lowpass', f: 1600 }, pan: -0.35 });
        this.tone({ type: 'square', f: 330, f2: 210, t: t + 0.04, dur: 0.14, gain: 0.07, filter: { type: 'lowpass', f: 1300 }, pan: -0.35 });
        break;
      case 'heartbeat':
        this.tone({ f: 72, f2: 45, dur: 0.13, gain: 0.5 });
        this.tone({ f: 68, f2: 42, t: t + 0.19, dur: 0.12, gain: 0.32 });
        break;
      case 'win': {
        [523, 659, 784].forEach((f, i) => this.tone({ type: 'triangle', f, t: t + i * 0.1, dur: 0.18, gain: 0.16 }));
        for (const f of [523, 659, 784, 1047]) {
          this.tone({ type: 'triangle', f, t: t + 0.32, dur: 1.4, gain: 0.1, attack: 0.01 });
          this.tone({ type: 'square', f, t: t + 0.32, dur: 0.9, gain: 0.035, filter: { type: 'lowpass', f: 2400 } });
        }
        for (let i = 0; i < 6; i++) this.noise({ t: t + i * 0.05, dur: 0.05, gain: 0.08 + i * 0.02, filter: { type: 'highpass', f: 3500 } });
        this.tone({ f: 120, f2: 50, t: t + 0.32, dur: 0.3, gain: 0.45 });
        break;
      }
      case 'tap': {
        // a light knock that climbs with the tap combo
        const f = 520 * Math.pow(2, Math.min(variation, 20) / 24);
        this.noise({ dur: 0.03, gain: 0.16, filter: { type: 'bandpass', f: 2400 * rnd(0.3), q: 1.5 }, pan: 0.3 });
        this.tone({ type: 'triangle', f: f * rnd(0.04), f2: f * 0.7, dur: 0.06, gain: 0.08, pan: 0.3 });
        break;
      }
      case 'super': {
        this.noise({ dur: 0.35, gain: 0.25, filter: { type: 'bandpass', f: 300, f2: 4000, q: 1 }, attack: 0.18 });
        this.tone({ type: 'sawtooth', f: 110, f2: 440, dur: 0.22, gain: 0.12, filter: { type: 'lowpass', f: 2400 }, attack: 0.15 });
        this.tone({ f: 90, f2: 32, t: t + 0.22, dur: 0.45, gain: 0.6 });
        this.noise({ t: t + 0.22, dur: 0.6, gain: 0.4, filter: { type: 'lowpass', f: 1800, f2: 200 } });
        for (const f of [523, 784, 1047]) this.tone({ type: 'triangle', f, t: t + 0.24, dur: 0.5, gain: 0.08 });
        this.cast(Math.max(1, Math.min(12, variation)));
        break;
      }
      case 'ready':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone({ type: 'triangle', f, t: t + i * 0.06, dur: 0.22, gain: 0.11 }));
        this.noise({ t: t + 0.1, dur: 0.4, gain: 0.05, filter: { type: 'highpass', f: 7000 }, attack: 0.1 });
        break;
      case 'chest':
        this.tone({ f: 140, f2: 60, dur: 0.18, gain: 0.45 });
        this.noise({ dur: 0.1, gain: 0.2, filter: { type: 'lowpass', f: 1200 } });
        this.tone({ type: 'triangle', f: 1319, t: t + 0.12, dur: 0.18, gain: 0.07 });
        break;
      case 'combo': {
        const n = Math.min(variation, 8);
        const root = 523 * Math.pow(2, n / 12);
        [1, 1.26, 1.5, 2].forEach((r, i) => this.tone({ type: 'square', f: root * r, t: t + i * 0.045, dur: 0.14, gain: 0.05, filter: { type: 'lowpass', f: 3200 } }));
        this.tone({ type: 'triangle', f: root * 2, t: t + 0.18, dur: 0.3, gain: 0.1 });
        break;
      }
      case 'crit':
        this.noise({ dur: 0.08, gain: 0.3, filter: { type: 'highpass', f: 2500 }, pan: 0.35 });
        this.tone({ type: 'square', f: 1760, f2: 2637, dur: 0.08, gain: 0.05, filter: { type: 'lowpass', f: 5000 }, pan: 0.35 });
        break;
      case 'lucky':
        [1047, 1319, 1568, 2093, 2637].forEach((f, i) => this.tone({ f, t: t + i * 0.04, dur: 0.25, gain: 0.09 }));
        this.noise({ t: t + 0.05, dur: 0.6, gain: 0.06, filter: { type: 'highpass', f: 8000 }, attack: 0.1 });
        break;
      case 'stars': {
        const f = 784 * Math.pow(2, (variation * 4) / 12);
        this.tone({ type: 'triangle', f, dur: 0.3, gain: 0.14 });
        this.tone({ f: f * 2, dur: 0.18, gain: 0.05 });
        this.noise({ dur: 0.25, gain: 0.05, filter: { type: 'highpass', f: 7000 } });
        break;
      }
      case 'whistle':
        // cartoon slide whistle falling
        this.tone({ type: 'sine', f: 1400, f2: 260, dur: 0.6, gain: 0.16, attack: 0.02 });
        this.tone({ type: 'triangle', f: 1410, f2: 262, dur: 0.6, gain: 0.06, attack: 0.02 });
        break;
      case 'thud':
        this.tone({ f: 120, f2: 40, dur: 0.28, gain: 0.6 });
        this.noise({ dur: 0.25, gain: 0.35, filter: { type: 'lowpass', f: 900, f2: 200 } });
        this.tone({ type: 'square', f: 220, f2: 180, t: t + 0.02, dur: 0.08, gain: 0.05, filter: { type: 'lowpass', f: 1200 } });
        break;
      case 'dizzy':
        // little birds/stars twittering round the head
        for (let i = 0; i < 6; i++) {
          const f = (i % 2 ? 2637 : 2093) * rnd(0.04);
          this.tone({ type: 'sine', f, f2: f * 1.12, t: t + i * 0.11, dur: 0.07, gain: 0.07 });
        }
        break;
      case 'ko':
        [[311, 294], [294, 277], [277, 196]].forEach(([a, b], i) => {
          this.tone({ type: 'sawtooth', f: a, f2: b, t: t + 0.2 + i * 0.3, dur: i === 2 ? 0.6 : 0.26, gain: 0.11, filter: { type: 'lowpass', f: 900 } });
        });
        this.tone({ f: 110, f2: 40, dur: 0.3, gain: 0.5, pan: -0.3 });
        this.noise({ dur: 0.4, gain: 0.3, filter: { type: 'lowpass', f: 700 }, pan: -0.3 });
        break;
    }
  }

  /** Twelve signature skill sounds, one per species. */
  private cast(tier: number): void {
    const t = this.ctx!.currentTime;
    const pan = -0.3;
    switch (tier) {
      case 1: // Leaf Shot
        this.noise({ dur: 0.22, gain: 0.18, filter: { type: 'bandpass', f: 1800, f2: 4200, q: 2 }, pan });
        this.tone({ f: 1200, f2: 1800, dur: 0.12, gain: 0.05, pan });
        break;
      case 2: // Bubble Pop
        this.tone({ f: 300, f2: 900, dur: 0.14, gain: 0.2, pan });
        this.tone({ f: 500, f2: 1300, t: t + 0.06, dur: 0.12, gain: 0.14, pan });
        break;
      case 3: // Wind Slash
        this.noise({ dur: 0.26, gain: 0.24, filter: { type: 'highpass', f: 1500, f2: 5200 }, attack: 0.06, pan });
        break;
      case 4: // Spike Burst
        for (const d of [0, 0.04, 0.08]) this.noise({ t: t + d, dur: 0.04, gain: 0.2, filter: { type: 'bandpass', f: 3000, q: 3 }, pan });
        this.tone({ type: 'square', f: 600, dur: 0.06, gain: 0.05, filter: { type: 'lowpass', f: 2000 }, pan });
        break;
      case 5: // Sonic Crest
        this.tone({ f: 900, f2: 450, dur: 0.22, gain: 0.14, pan });
        this.tone({ f: 1350, f2: 675, dur: 0.22, gain: 0.08, pan });
        break;
      case 6: // Crystal Shard
        this.tone({ type: 'triangle', f: 1760, dur: 0.32, gain: 0.1, pan });
        this.tone({ type: 'triangle', f: 2637, t: t + 0.03, dur: 0.28, gain: 0.08, pan });
        this.noise({ dur: 0.08, gain: 0.08, filter: { type: 'highpass', f: 6000 }, pan });
        break;
      case 7: // Boulder Roll
        this.noise({ dur: 0.32, gain: 0.32, filter: { type: 'lowpass', f: 420 }, attack: 0.04, pan });
        this.tone({ f: 92, f2: 58, dur: 0.26, gain: 0.26, pan });
        break;
      case 8: // Horn Charge
        this.tone({ type: 'sawtooth', f: 220, f2: 460, dur: 0.22, gain: 0.1, filter: { type: 'lowpass', f: 1600 }, pan });
        this.noise({ dur: 0.16, gain: 0.14, filter: { type: 'bandpass', f: 1500, q: 1 }, pan });
        break;
      case 9: // Fireball
        this.noise({ dur: 0.32, gain: 0.3, filter: { type: 'lowpass', f: 1100, f2: 3200 }, attack: 0.05, pan });
        for (const d of [0.05, 0.12, 0.2]) this.noise({ t: t + d, dur: 0.02, gain: 0.12, filter: { type: 'highpass', f: 4000 }, pan });
        break;
      case 10: // Water Jet
        this.noise({ dur: 0.26, gain: 0.22, filter: { type: 'bandpass', f: 900, f2: 2600, q: 4 }, pan });
        this.tone({ f: 620, f2: 300, dur: 0.12, gain: 0.08, pan });
        break;
      case 11: // Roar Blast
        this.tone({ type: 'sawtooth', f: 165, f2: 92, dur: 0.36, gain: 0.15, filter: { type: 'lowpass', f: 900 }, pan });
        this.tone({ type: 'sawtooth', f: 168, f2: 95, dur: 0.36, gain: 0.15, filter: { type: 'lowpass', f: 800 }, pan });
        this.noise({ dur: 0.3, gain: 0.15, filter: { type: 'lowpass', f: 600 }, pan });
        break;
      default: // Prism Beam
        [1047, 1319, 1568, 2093].forEach((f, i) => this.tone({ type: 'triangle', f, t: t + i * 0.03, dur: 0.25, gain: 0.07, pan }));
        this.noise({ dur: 0.3, gain: 0.08, filter: { type: 'highpass', f: 7000 }, pan });
        break;
    }
  }

  // ============================================================== music
  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.mus || ctx.state !== 'running') return;
    // Coming back from a suspended context: never try to "catch up".
    if (this.nextStep < ctx.currentTime - 0.2) this.nextStep = ctx.currentTime + 0.05;
    while (this.nextStep < ctx.currentTime + 0.12) {
      if (this.step === 0 && this.nextMood !== this.mood) {
        this.mood = this.nextMood;
        this.bar = 0;
      }
      const bpm = this.mood === 'calm' ? 108 : this.mood === 'boss' ? 146 : 132;
      const sixteenth = 60 / bpm / 4;
      if (this.mood === 'calm') this.calmStep(this.nextStep, sixteenth);
      else this.bossStep(this.nextStep, sixteenth);
      this.nextStep += sixteenth;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) {
        this.bar = (this.bar + 1) % (this.mood === 'calm' ? CALM_BARS.length : 8);
        if (this.bar === 0) this.loops++;
      }
    }
  }

  // Folk & tribal percussion + acoustic instrument voices
  private bodhran(t: number, g: number, low = true): void {
    const f0 = low ? 115 : 165, f1 = low ? 48 : 78;
    this.tone({ type: 'sine', f: f0, f2: f1, t, dur: low ? 0.22 : 0.14, gain: g, bus: 'mus' });
    this.tone({ type: 'triangle', f: f0 * 1.5, f2: f1 * 1.2, t, dur: 0.07, gain: g * 0.35, filter: { type: 'lowpass', f: 420 }, bus: 'mus' });
  }
  private rimClick(t: number, g: number): void {
    this.noise({ t, dur: 0.035, gain: g, filter: { type: 'bandpass', f: 2200, q: 3.2 }, bus: 'mus' });
    this.tone({ type: 'triangle', f: 680, f2: 320, t, dur: 0.025, gain: g * 0.45, bus: 'mus' });
  }
  private shaker(t: number, g: number, open = false): void {
    this.noise({ t, dur: open ? 0.09 : 0.028, gain: g, filter: { type: 'bandpass', f: 6200, q: 1.4 }, bus: 'mus' });
  }
  private lute(n: number, t: number, dur: number, g: number): void {
    const f = midi(n);
    this.tone({ type: 'triangle', f, t, dur, gain: g, attack: 0.004, bus: 'mus' });
    this.tone({ type: 'sawtooth', f, t, dur: dur * 0.55, gain: g * 0.38, attack: 0.003, detune: 5, filter: { type: 'lowpass', f: f * 3.2 }, bus: 'mus' });
  }
  private flute(n: number, t: number, dur: number, g: number): void {
    const f = midi(n);
    this.tone({ type: 'sine', f, f2: f * 1.003, t, dur, gain: g, attack: 0.035, bus: 'mus' });
    this.tone({ type: 'triangle', f: f * 2, t, dur: dur * 0.75, gain: g * 0.18, attack: 0.04, filter: { type: 'lowpass', f: 2400 }, bus: 'mus' });
    this.noise({ t, dur: Math.min(0.06, dur * 0.3), gain: g * 0.12, filter: { type: 'bandpass', f: f * 2, q: 2.5 }, bus: 'mus' });
  }

  private calmStep(t: number, s16: number): void {
    const name = CALM_BARS[this.bar];
    const chord = FOLK_CHORDS[name];
    const root = FOLK_BASS[name];
    const st = this.step;
    const isB = this.bar >= 8;

    // Driving dark-folk bodhrán & wood-rim groove (compound folk feel on 16-step grid)
    if (st === 0 || st === 6 || st === 8) this.bodhran(t, st === 0 ? 0.30 : 0.22, true);
    if (st === 3 || st === 14) this.bodhran(t, 0.15, false);
    if (st === 4 || st === 12) this.rimClick(t, 0.09);
    if (st % 2 === 1) this.shaker(t, st % 4 === 3 ? 0.045 : 0.022, isB && st === 15);

    // Earthy bowed cello / bass pulse on root & fifth
    const bassAt: Record<number, [number, number]> = {
      0: [root, 4], 6: [root + 7, 2], 8: [root, 4], 12: [root + (name === 'A7' ? 4 : 7), 2], 14: [root + 12, 2],
    };
    const b = bassAt[st];
    if (b) {
      this.tone({ type: 'triangle', f: midi(b[0]), t, dur: b[1] * s16 * 1.35, gain: 0.28, attack: 0.012, filter: { type: 'lowpass', f: 620 }, bus: 'mus' });
      this.tone({ type: 'sawtooth', f: midi(b[0]), t, dur: b[1] * s16 * 1.1, gain: 0.055, attack: 0.02, filter: { type: 'lowpass', f: 380 }, bus: 'mus' });
    }

    // Warm dark-folk drone pad (fifth + octave)
    if (st === 0) {
      for (const n of [chord[0], chord[2]]) {
        for (const det of [-6, 6]) {
          this.tone({ type: 'sawtooth', f: midi(n), t, dur: 16 * s16, gain: 0.016, attack: 0.3, detune: det, filter: { type: 'lowpass', f: 880 }, bus: 'mus' });
        }
      }
    }

    // Plucked folk lute arpeggio weaving through every bar
    const arpIdx = [0, 1, 2, 1, 0, 2, 1, 2];
    if (st % 2 === 0) {
      const note = chord[arpIdx[(st >> 1) % 8]] + (st === 10 || st === 14 ? 12 : 0);
      this.lute(note, t, s16 * 2.4, isB ? 0.075 : 0.06);
    }

    // Wooden flute & lute lead melody: rests on odd loops in first 4 bars so the forest atmosphere breathes
    const rest = this.bar < 4 && this.loops % 2 === 1;
    if (!rest) {
      for (const [at, n, durSteps] of CALM_MELODY[this.bar]) {
        if (at !== st) continue;
        this.flute(n, t, durSteps * s16 * 1.05, isB ? 0.13 : 0.11);
        this.lute(n - 12, t, durSteps * s16 * 0.8, 0.045);
      }
    } else if (st === 2 || st === 6 || st === 10 || st === 14) {
      this.lute(chord[(st >> 2) % 3] + 12, t, s16 * 2.2, 0.05);
    }
  }

  private bossStep(t: number, s16: number): void {
    const i = this.bar % 8;
    const chord = BOSS_CHORDS[i];
    const root = BOSS_BASS[i];
    const st = this.step;
    const final = this.mood === 'final';

    // Heavy tribal war-drums
    if (st % 4 === 0 || st === 6 || (i % 4 === 3 && st === 14)) this.bodhran(t, 0.42, true);
    if (st === 2 || st === 10) this.bodhran(t, 0.24, false);
    if (st === 4 || st === 12) {
      this.rimClick(t, 0.16);
      this.noise({ t, dur: 0.11, gain: 0.16, filter: { type: 'bandpass', f: 1650, q: 0.9 }, bus: 'mus' });
    }
    if (final && i % 4 === 3 && st >= 12) this.bodhran(t, 0.22 + (st - 12) * 0.04, false);
    this.shaker(t, st % 2 === 0 ? 0.055 : 0.03, st % 8 === 6);

    // Relentless galloping bass ostinato
    if (st % 2 === 0 || st === 3 || st === 11) {
      const n = st === 6 || st === 14 ? root + 12 : st === 10 ? root + 7 : root;
      this.tone({ type: 'sawtooth', f: midi(n), t, dur: s16 * 1.5, gain: 0.17, filter: { type: 'lowpass', f: final ? 920 : 680 }, bus: 'mus' });
      this.tone({ type: 'triangle', f: midi(n), t, dur: s16 * 1.5, gain: 0.20, filter: { type: 'lowpass', f: 480 }, bus: 'mus' });
    }

    // Brass / war-horn stabs on chord hits
    if (st === 0 || st === 6 || st === 12) {
      for (const n of chord) {
        this.tone({ type: 'sawtooth', f: midi(n), t, dur: s16 * 2.2, gain: 0.04, attack: 0.015, detune: 6, filter: { type: 'lowpass', f: 1600 }, bus: 'mus' });
      }
    }

    // Aggressive Phrygian folk lute + horn battle riff
    const riff = BOSS_RIFF[i % 4];
    for (const [at, n] of riff) {
      if (at !== st) continue;
      const pitch = i >= 4 ? n + 12 : n;
      this.lute(pitch, t, s16 * 1.9, 0.085);
      this.tone({ type: 'sawtooth', f: midi(n), t, dur: s16 * 1.8, gain: 0.045, detune: -7, filter: { type: 'lowpass', f: 2100 }, bus: 'mus' });
    }
  }
}
