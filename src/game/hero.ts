/**
 * Frame-based hero renderer (test: caveman "Grok", tier 1).
 *
 * Art lives in public/hero/<id>/hero.json + WebP frames. Each frame carries its
 * own anchor (cx = hip centre x, foot = feet y, in the frame's pixels) and k
 * (world units per pixel per unit of hero height), so frames from different
 * sources (edited poses, video-cut frames) line up without moving the feet.
 * Until the art has loaded, `ready` is false and the game draws its old player.
 */
import { loadAtlas, type Texture } from './perf/frames';
type Ctx = CanvasRenderingContext2D;

interface Frame extends Partial<Texture> { f: string; cx: number; foot: number; k: number }
interface HeroData { fps: Record<string, number>; clips: Record<string, Frame[]> }

export class Hero {
  private data: HeroData | null = null;
  private loaded = 0;
  private total = 0;
  private atkT = -1;
  private runT = 0;
  private idleT = 0;

  constructor(private base: string) {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const res = await fetch(this.base + 'hero.json', { cache: import.meta.env.DEV ? 'no-cache' : 'default' });
      if (!res.ok) return;
      const d = (await res.json()) as HeroData;
      this.data = d;
      const frames = Object.values(d.clips).flat();
      this.total = frames.length;
      const textures = await loadAtlas(frames.map(fr => this.base + fr.f), 300);
      frames.forEach((fr, i) => Object.assign(fr, textures[i]));
      // Silhouette glow per frame, on a padded canvas so the blur is never cut off by the frame box.
      const P = 10;
      for (const fr of frames) {
        if (!fr.white || fr.sw === undefined) continue;
        const g = document.createElement('canvas'); g.width = fr.sw + P * 2; g.height = fr.sh! + P * 2;
        const x = g.getContext('2d')!;
        x.filter = 'blur(4px)'; x.drawImage(fr.white, fr.tx!, fr.ty!, fr.sw, fr.sh!, P, P, fr.sw, fr.sh!); x.filter = 'none';
        x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgb(255,232,180)'; x.fillRect(0, 0, g.width, g.height);
        (fr as Frame & { glow?: HTMLCanvasElement }).glow = g;
      }
      this.loaded = textures.length;
    } catch { /* no hero art: keep the old player */ }
  }

  get ready(): boolean { return !!this.data && this.loaded === this.total && this.total > 0; }

  private moving = false;

  /**
   * Start a melee swing (restarts only once the previous one is mostly done).
   * While running the run cycle wins: a planted-feet swing over a moving body
   * reads as sliding, and the slash effect already shows the hit.
   */
  attack(): void {
    if (!this.data || this.moving) return;
    const n = this.data.clips.attack?.length ?? 0;
    const len = n / (this.data.fps.attack ?? 14);
    if (this.atkT < 0 || this.atkT > len * 0.7) this.atkT = 0;
  }

  update(dt: number, moving: boolean): void {
    this.moving = moving;
    if (moving && this.atkT >= 0) this.atkT = -1;
    if (moving) this.runT += dt; else this.idleT += dt;
    if (this.atkT >= 0 && this.data) {
      this.atkT += dt;
      const len = (this.data.clips.attack?.length ?? 0) / (this.data.fps.attack ?? 14);
      if (this.atkT >= len) this.atkT = -1;
    }
  }

  private frame(moving: boolean): Frame | null {
    const d = this.data;
    if (!d) return null;
    const pick = (clip: string, t: number, loop: boolean): Frame | null => {
      const fr = d.clips[clip];
      if (!fr?.length) return null;
      let i = Math.floor(t * (d.fps[clip] ?? 8));
      i = loop ? i % fr.length : Math.min(fr.length - 1, i);
      return fr[i];
    };
    if (this.atkT >= 0) return pick('attack', this.atkT, false);
    if (moving) return pick('run', this.runT, true);
    return pick('idle', this.idleT, true);
  }

  /** Draw with the feet at (x, y); `height` in world units; flip = -1 faces left. */
  draw(ctx: Ctx, x: number, y: number, height: number, flip: number, moving: boolean, flash: number, alpha: number): void {
    const fr = this.frame(moving);
    if (!fr?.width || !fr.height || fr.tx === undefined || fr.ty === undefined || !fr.raster || !fr.white) return;
    const s = height * fr.k;
    // Few-frame clips need a code bob to read as running; video-cut clips already move.
    const fewFrames = (this.data?.clips.run?.length ?? 0) <= 2;
    const bob = moving ? (fewFrames ? Math.abs(Math.sin(this.runT * Math.PI * 7)) * height * 0.025 : 0) : Math.sin(this.idleT * 2.4) * height * 0.006;
    const breathe = moving ? 0 : Math.sin(this.idleT * 2.4) * 0.012;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y - bob);
    ctx.scale(flip * (1 - breathe * 0.5), 1 + breathe);
    const w = fr.width * s, h = fr.height * s;
    const glow = (fr as Frame & { glow?: HTMLCanvasElement }).glow;
    if (glow) {
      // subtle: a thin warm halo hugging the silhouette
      const k = w / fr.sw!, pad = 10 * k;
      ctx.globalAlpha = alpha * 0.5;
      ctx.drawImage(glow, -fr.cx * s - pad, -fr.foot * s - pad, w + pad * 2, h + pad * 2);
      ctx.globalAlpha = alpha;
    }
    ctx.drawImage(fr.raster, fr.tx, fr.ty, fr.sw!, fr.sh!, -fr.cx * s, -fr.foot * s, w, h);
    if (flash > 0) {
      ctx.globalAlpha = alpha * Math.min(1, flash);
      ctx.drawImage(fr.white, fr.tx, fr.ty, fr.sw!, fr.sh!, -fr.cx * s, -fr.foot * s, w, h);
    }
    ctx.restore();
  }
}
