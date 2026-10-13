/**
 * Responsive canvas with a virtual design space.
 *
 * The scale is picked so the virtual space is ALWAYS at least
 * MIN_W x MIN_H. Whatever the screen gives beyond that becomes margin,
 * and gameplay is confined to a centred column -- which is how portrait
 * games stay playable on a wide desktop window.
 */
export const MIN_W = 720;
export const MIN_H = 980;
/** Gameplay never spreads wider than this, however wide the window is. */
export const MAX_COLUMN = 820;

export interface View {
  /** Virtual space size (>= MIN_W x MIN_H). */
  w: number;
  h: number;
  /** Device pixels per virtual unit. */
  scale: number;
  /** Centred gameplay column. */
  colX: number;
  colW: number;
  /** Notch / home-bar insets in virtual units (env(safe-area-inset-*)). */
  safe: { t: number; r: number; b: number; l: number };
}

export class Stage {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly view: View = { w: MIN_W, h: MIN_H, scale: 1, colX: 0, colW: MIN_W, safe: { t: 0, r: 0, b: 0, l: 0 } };
  private probe: HTMLDivElement;
  onResize: ((view: View) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is not available in this browser.');
    this.ctx = ctx;

    // An invisible element whose padding is the safe-area insets: the only
    // way to read env(safe-area-inset-*) from script.
    this.probe = document.createElement('div');
    this.probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;'
      + 'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(this.probe);

    const resize = () => this.resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 120));
    this.resize();
  }

  resize(): void {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    // Cap DPR: a 3x retina phone would otherwise shade 3x the pixels for
    // no visible gain on art this chunky.
    // Phones: 1.5x is visually identical for this painted art and shades ~45% fewer pixels than 2x.
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2);

    const scale = Math.min(cssW / MIN_W, cssH / MIN_H);
    const v = this.view;
    v.scale = scale;
    v.w = cssW / scale;
    v.h = cssH / scale;
    v.colW = Math.min(v.w, MAX_COLUMN);
    v.colX = (v.w - v.colW) / 2;
    const cs = getComputedStyle(this.probe);
    const px = (x: string) => (parseFloat(x) || 0) / scale;
    v.safe = { t: px(cs.paddingTop), r: px(cs.paddingRight), b: px(cs.paddingBottom), l: px(cs.paddingLeft) };

    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;

    this.onResize?.(v);
  }
}
