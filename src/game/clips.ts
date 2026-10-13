/**
 * Looping frame animations for enemies (video-cut, see tools/anim-lab/cut_video.py).
 * public/anim/<key>/clip.json = { fps, frames: [{ f, cx, foot, k }] } where cx/foot are the
 * shared ground anchor in frame pixels and k = 1 / reference width in pixels, so
 * `width * k` is the draw scale. Missing clips simply report not-ready.
 */
type Ctx = CanvasRenderingContext2D;

interface ClipFrame { f: string; cx: number; foot: number; k: number; img?: HTMLImageElement; white?: HTMLCanvasElement }
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
      for (const fr of d.frames) {
        const img = new Image();
        img.onload = () => { this.loaded++; };
        img.src = this.base + fr.f;
        fr.img = img;
      }
      this.data = d;
    } catch { /* no clip: caller keeps its still sprite */ }
  }

  get ready(): boolean { return !!this.data && this.loaded === this.data.frames.length; }

  /** Feet at (x, y), `width` in world units, `t` = this creature's own clock (s). */
  draw(ctx: Ctx, x: number, y: number, width: number, t: number, flip: number, flash: number, sx = 1, sy = 1): void {
    const d = this.data;
    if (!d) return;
    const fr = d.frames[Math.floor(t * d.fps) % d.frames.length];
    if (!fr.img) return;
    const s = width * fr.k;
    const w = fr.img.naturalWidth * s, h = fr.img.naturalHeight * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip * sx, sy);
    ctx.drawImage(fr.img, -fr.cx * s, -fr.foot * s, w, h);
    if (flash > 0) {
      if (!fr.white) fr.white = whiteOf(fr.img);
      ctx.globalAlpha *= Math.min(1, flash);
      ctx.drawImage(fr.white, -fr.cx * s, -fr.foot * s, w, h);
    }
    ctx.restore();
  }
}

function whiteOf(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d')!;
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#fff';
  x.fillRect(0, 0, c.width, c.height);
  return c;
}
