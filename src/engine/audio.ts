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
// Chords as midi triads; bass roots in a register laptop speakers can carry.
const CALM_CHORDS: Record<string, number[]> = {
  C: [60, 64, 67], G: [59, 62, 67], Am: [57, 60, 64], F: [57, 60, 65],
};
const CALM_BASS: Record<string, number> = { C: 48, G: 43, Am: 45, F: 41 };
const CALM_BARS = ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'G'];
/** Marimba melody: per bar, [step, midi] pairs on a 16-step grid. */
const CALM_MELODY: [number, number][][] = [
  [[0, 76], [3, 79], [6, 81], [8, 79], [12, 76]],
  [[0, 74], [3, 76], [6, 79], [10, 74]],
  [[0, 72], [3, 76], [6, 81], [8, 79], [11, 76]],
  [[0, 77], [4, 76], [8, 72], [12, 74]],
  [[0, 79], [2, 81], [4, 84], [8, 81], [10, 79], [12, 76]],
  [[0, 74], [4, 79], [6, 81], [8, 79]],
  [[0, 77], [4, 81], [8, 84], [12, 81]],
  [[0, 79], [6, 74], [8, 79], [14, 83]],
  [[0, 76], [4, 72], [8, 76], [10, 79], [12, 81]],
  [[0, 77], [4, 81], [8, 79], [12, 77]],
  [[0, 79], [3, 76], [6, 72], [8, 76], [12, 79]],
  [[0, 83], [4, 81], [8, 79], [12, 74]],
  [[0, 81], [2, 84], [4, 81], [8, 79], [12, 76]],
  [[0, 77], [4, 76], [8, 74], [12, 72]],
  [[0, 74], [4, 79], [8, 81], [12, 83]],
  [[0, 84], [8, 79]],
];

const BOSS_CHORDS = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]];
const BOSS_BASS = [45, 41, 43, 40];
const BOSS_RIFF: [number, number][][] = [
  [[0, 69], [2, 72], [4, 76], [6, 74], [8, 72], [10, 69], [12, 67], [14, 69]],
  [[0, 65], [2, 69], [4, 72], [6, 69], [8, 77], [10, 76], [12, 72], [14, 69]],
  [[0, 67], [2, 71], [4, 74], [6, 71], [8, 79], [10, 77], [12, 74], [14, 71]],
  [[0, 68], [2, 71], [4, 76], [6, 71], [8, 80], [10, 76], [12, 74], [14, 71]],
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
      const bpm = this.mood === 'calm' ? 100 : this.mood === 'boss' ? 140 : 156;
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

  // drum kit, shared by both songs
  private kick(t: number, g: number): void {
    this.tone({ f: 150, f2: 45, t, dur: 0.18, gain: g, bus: 'mus' });
  }
  private snare(t: number, g: number): void {
    this.noise({ t, dur: 0.14, gain: g, filter: { type: 'bandpass', f: 1900, q: 0.7 }, bus: 'mus' });
    this.tone({ type: 'triangle', f: 190, f2: 140, t, dur: 0.08, gain: g * 0.6, bus: 'mus' });
  }
  private hat(t: number, g: number, open = false): void {
    this.noise({ t, dur: open ? 0.12 : 0.03, gain: g, filter: { type: 'highpass', f: 7500 }, bus: 'mus' });
  }

  private calmStep(t: number, s16: number): void {
    const name = CALM_BARS[this.bar];
    const chord = CALM_CHORDS[name];
    const root = CALM_BASS[name];
    const st = this.step;

    if (st === 0 || st === 8) this.kick(t, 0.28);
    if (st === 4 || st === 12) this.noise({ t, dur: 0.03, gain: 0.07, filter: { type: 'bandpass', f: 2600, q: 4 }, bus: 'mus' });
    if (st % 2 === 1) this.hat(t, st % 4 === 3 ? 0.05 : 0.025);

    const bassAt: Record<number, [number, number]> = { 0: [root, 3], 6: [root, 1], 8: [root + 7, 3], 14: [root + 12, 1] };
    const b = bassAt[st];
    if (b) this.tone({ type: 'triangle', f: midi(b[0]), t, dur: b[1] * s16 * 1.4, gain: 0.32, filter: { type: 'lowpass', f: 700 }, bus: 'mus' });

    if (st === 0) {
      for (const n of chord) {
        for (const det of [-7, 7]) {
          this.tone({ type: 'sawtooth', f: midi(n), t, dur: 16 * s16, gain: 0.018, attack: 0.35, detune: det, filter: { type: 'lowpass', f: 1100 }, bus: 'mus' });
        }
      }
    }

    // The A section rests the melody every other loop, so the song breathes.
    const rest = this.bar < 8 && this.loops % 2 === 1;
    if (!rest) {
      for (const [at, n] of CALM_MELODY[this.bar]) {
        if (at !== st) continue;
        this.tone({ f: midi(n), t, dur: 0.42, gain: 0.13, bus: 'mus' });
        this.tone({ type: 'triangle', f: midi(n) * 2, t, dur: 0.12, gain: 0.035, bus: 'mus' });
      }
    } else if (st % 4 === 2) {
      this.tone({ type: 'triangle', f: midi(chord[(st / 2) % 3] + 24), t, dur: 0.25, gain: 0.03, bus: 'mus' });
    }
  }

  private bossStep(t: number, s16: number): void {
    const i = this.bar % 4;
    const chord = BOSS_CHORDS[i];
    const root = BOSS_BASS[i];
    const st = this.step;
    const final = this.mood === 'final';

    if (st % 4 === 0 || (i === 3 && st === 10)) this.kick(t, 0.42);
    if (st === 4 || st === 12) this.snare(t, 0.22);
    if (final && i === 3 && st >= 12) this.snare(t, 0.12 + (st - 12) * 0.04);
    this.hat(t, st % 4 === 2 ? 0.07 : final ? 0.04 : 0.025, st % 8 === 6);

    if (st % 2 === 0) {
      const n = st === 6 || st === 14 ? root + 12 : root;
      this.tone({ type: 'sawtooth', f: midi(n), t, dur: s16 * 1.6, gain: 0.16, filter: { type: 'lowpass', f: final ? 900 : 650 }, bus: 'mus' });
    }
    if (st === 3 || st === 11) {
      for (const n of chord) this.tone({ type: 'square', f: midi(n + 12), t, dur: s16 * 1.5, gain: 0.03, filter: { type: 'lowpass', f: 2200 }, bus: 'mus' });
    }
    if (final || this.bar >= 4) {
      for (const [at, n] of BOSS_RIFF[i]) {
        if (at !== st) continue;
        this.tone({ type: 'square', f: midi(n), t, dur: s16 * 1.8, gain: 0.05, filter: { type: 'lowpass', f: 2600 }, bus: 'mus' });
        this.tone({ type: 'sawtooth', f: midi(n), t, dur: s16 * 1.8, gain: 0.025, detune: 9, filter: { type: 'lowpass', f: 2200 }, bus: 'mus' });
      }
    }
  }
}
