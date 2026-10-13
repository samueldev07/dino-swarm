/**
 * Looping frame animations for enemies (video-cut, see tools/anim-lab/cut_video.py).
 * public/anim/<key>/clip.json = { fps, frames: [{ f, cx, foot, k }] } where cx/foot are the
 * shared ground anchor in frame pixels and k = 1 / reference width in pixels, so
 * `width * k` is the draw scale. Missing clips simply report not-ready.
 */
import { loadAtlas, type Texture } from './perf/frames';
type Ctx = CanvasRenderingContext2D;

interface ClipFrame extends Partial<Texture> { f: string; cx: number; foot: number; k: number }
interface ClipData { fps: number; frames: ClipFrame[] }

export class Clip {
  private data: ClipData | null = null;
  private loaded = 0;

  constructor(private base: string) { void this.load(); }

  private async load(): Promise<void> {
    try {
      const res = await fetch(this.base + 'clip.json', { cache: 'no-cache' });
      if (!res.ok) return;
      const d = (await res.json()) as ClipData;
      this.data = d;
      const textures = await loadAtlas(d.frames.map(fr => this.base + fr.f));
      d.frames.forEach((fr, i) => Object.assign(fr, textures[i]));
      this.loaded = textures.length;
    } catch { /* no clip: caller keeps its still sprite */ }
  }

  get ready(): boolean { return !!this.data && this.loaded > 0 && this.loaded === this.data.frames.length; }

  /** Feet at (x, y), `width` in world units, `t` = this creature's own clock (s). */
  draw(ctx: Ctx, x: number, y: number, width: number, t: number, flip: number, flash: number, sx = 1, sy = 1): void {
    const d = this.data;
    if (!d?.frames.length) return;
    const fr = d.frames[Math.floor(t * d.fps) % d.frames.length];
    if (!fr.width || !fr.height || fr.tx === undefined || fr.ty === undefined || !fr.raster || !fr.white) return;
    const s = width * fr.k;
    const w = fr.width * s, h = fr.height * s;
    // Ordinary walking needs no saved canvas state for every creature. Only wind-ups squash.
    if (sx === 1 && sy === 1) {
      if (flip < 0) ctx.scale(-1, 1);
      const dx = (flip < 0 ? -x : x) - fr.cx * s, dy = y - fr.foot * s;
      ctx.drawImage(fr.raster, fr.tx, fr.ty, fr.width, fr.height, dx, dy, w, h);
      if (flash > 0) {
        const alpha = ctx.globalAlpha;
        ctx.globalAlpha = alpha * Math.min(1, flash);
        ctx.drawImage(fr.white, fr.tx, fr.ty, fr.width, fr.height, dx, dy, w, h);
        ctx.globalAlpha = alpha;
      }
      if (flip < 0) ctx.scale(-1, 1);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip * sx, sy);
    ctx.drawImage(fr.raster, fr.tx, fr.ty, fr.width, fr.height, -fr.cx * s, -fr.foot * s, w, h);
    if (flash > 0) {
      ctx.globalAlpha *= Math.min(1, flash);
      ctx.drawImage(fr.white, fr.tx, fr.ty, fr.width, fr.height, -fr.cx * s, -fr.foot * s, w, h);
    }
    ctx.restore();
  }
}
