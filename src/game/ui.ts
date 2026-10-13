import type { Input } from '../engine/input';
import { rrect, INK, fontFor } from './draw';

type Ctx = CanvasRenderingContext2D;

export interface Rect { x: number; y: number; w: number; h: number }

/**
 * Painted folk UI kit (art/ui-folk, see art/STYLE-LOCK). Images come from the asset
 * layer; when one is missing the old procedural drawing is used, so the game never
 * breaks while art is still landing.
 */
type ImgGet = (key: string) => HTMLImageElement | undefined;
let kit: ImgGet = () => undefined;
/** Source-pixel insets [left, top, right, bottom] that must not stretch (art/ui-folk/slices.json). */
const SLICES: Record<string, [number, number, number, number]> = {
  'ui-panel': [72, 72, 72, 72], 'ui-card': [56, 56, 56, 56],
  'ui-btn-primary': [88, 24, 88, 24], 'ui-btn-primary-pressed': [88, 24, 88, 24],
  'ui-btn-ad': [88, 24, 88, 24], 'ui-btn-quiet': [88, 24, 88, 24],
  'ui-ribbon-win': [190, 48, 190, 48], 'ui-ribbon-lose': [190, 48, 190, 48],
  'ui-bar-frame': [42, 16, 42, 16], 'ui-medallion': [32, 32, 32, 32], 'ui-iconbtn': [32, 32, 32, 32],
};
export function setUiKit(get: ImgGet): void { kit = get; }
export function kitImage(key: string): HTMLImageElement | undefined { return kit(key); }

/** Draws a 9-slice image into r; `scale` maps source pixels of the fixed borders to world units. */
export function nine(ctx: Ctx, key: string, r: Rect, scale = 0.5): boolean {
  const img = kit(key);
  if (!img) return false;
  const [l, t, rr, b] = SLICES[key] ?? [0, 0, 0, 0];
  const W = img.naturalWidth, H = img.naturalHeight;
  const k = Math.min(scale, r.w / (l + rr || 1), r.h / (t + b || 1));
  const L = l * k, T = t * k, R = rr * k, B = b * k;
  const xs = [0, l, W - rr, W], ys = [0, t, H - b, H];
  const dx = [r.x, r.x + L, r.x + r.w - R, r.x + r.w], dy = [r.y, r.y + T, r.y + r.h - B, r.y + r.h];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const sw = xs[i + 1] - xs[i], sh = ys[j + 1] - ys[j], w = dx[i + 1] - dx[i], h = dy[j + 1] - dy[j];
      if (sw > 0 && sh > 0 && w > 0 && h > 0) ctx.drawImage(img, xs[i], ys[j], sw, sh, dx[i], dy[j], w, h);
    }
  }
  return true;
}

export function inside(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export type Tone = 'green' | 'gold' | 'stone' | 'blue' | 'teal' | 'red' | 'pink';

export interface ButtonOpts {
  label: string;
  sub?: string;
  disabled?: boolean;
  tone?: Tone;
  /** Font size of the label; defaults to a fraction of the height. */
  size?: number;
  /** Draws a small icon (e.g. the coin) before the sub label. */
  subIcon?: (ctx: Ctx, x: number, y: number, size: number) => void;
  radius?: number;
}

const TONES: Record<Tone, { top: string; bottom: string; lip: string; text: string; shadow: string }> = {
  green: { top: '#7bdc5a', bottom: '#43a83a', lip: '#2c6e26', text: '#fff', shadow: '#2c6e26' },
  gold:  { top: '#ffd75a', bottom: '#f0a92a', lip: '#a8661a', text: '#fff', shadow: '#a8661a' },
  stone: { top: '#8f8a84', bottom: '#6a655f', lip: '#47423d', text: '#fff', shadow: '#3a352f' },
  blue:  { top: '#6ec2ff', bottom: '#3b86e0', lip: '#245aa0', text: '#fff', shadow: '#245aa0' },
  teal:  { top: '#4fd6c8', bottom: '#1f9e9a', lip: '#136663', text: '#ffe28a', shadow: '#0d4442' },
  red:   { top: '#ff8a6b', bottom: '#e0503a', lip: '#9a2a1d', text: '#fff', shadow: '#9a2a1d' },
  pink:  { top: '#ff86b8', bottom: '#e8408a', lip: '#a3205a', text: '#fff', shadow: '#8a1a4a' },
};

/**
 * Immediate-mode UI drawn straight onto the game canvas.
 *
 * Buttons are identified by a stable string id, not by their rect: layout
 * rects are rebuilt every frame, so identity comparison would lose the
 * press on the very next frame and no button would ever fire.
 *
 * A press is "claimed" by the first button that takes it, so overlapping
 * widgets cannot both fire from one tap. The world checks `claimed` before
 * reacting, so a tap on a button never also lands on the board under it.
 */
export class UI {
  private pressedId: string | null = null;
  claimed = false;

  constructor(private input: Input) {}

  beginFrame(): void {
    this.claimed = false;
    if (this.input.p.justDown) this.pressedId = null;
  }

  /** Hit-test without drawing; used to let buttons claim before the world reads input. */
  claimIfOver(id: string, r: Rect, disabled = false): void {
    const p = this.input.p;
    if (!disabled && !this.claimed && p.justDown && inside(r, p.x, p.y)) {
      this.pressedId = id;
      this.claimed = true;
    }
  }

  private track(id: string, r: Rect, disabled: boolean): { pressed: boolean; clicked: boolean } {
    const p = this.input.p;
    const over = inside(r, p.x, p.y);
    if (!disabled && !this.claimed && p.justDown && over) {
      this.pressedId = id;
      this.claimed = true;
    }
    const pressed = !disabled && p.down && this.pressedId === id && over;
    let clicked = false;
    if (!disabled && p.justUp && this.pressedId === id && over) {
      clicked = true;
      this.pressedId = null;
    }
    return { pressed, clicked };
  }

  button(id: string, r: Rect, opts: ButtonOpts, ctx: Ctx): boolean {
    const disabled = !!opts.disabled;
    const { pressed, clicked } = this.track(id, r, disabled);
    const tone = TONES[opts.tone ?? 'green'];
    const rad = opts.radius ?? Math.min(18, r.h * 0.3);
    const dy = pressed ? 4 : 0;
    const lip = pressed ? 2 : 6;

    ctx.save();
    // No ctx.filter here: a canvas filter re-rasterises every draw call and stalled the frame each time
    // the level-up cards opened (their buttons start disabled). A plain fade reads the same.
    if (disabled) ctx.globalAlpha *= 0.55;
    const plank = opts.tone === 'gold' || opts.tone === 'green' ? (pressed ? 'ui-btn-primary-pressed' : 'ui-btn-primary')
      : opts.tone === 'blue' ? 'ui-btn-ad' : 'ui-btn-quiet';
    if (kit(plank)) {
      const pr = { x: r.x - 8, y: r.y - 6 + (pressed ? 2 : 0), w: r.w + 16, h: r.h + 12 };
      if (pressed) { ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(0.97, 0.97); ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2)); }
      nine(ctx, plank, pr, Math.min(0.55, pr.h / 160));
      const light = opts.tone === 'gold' || opts.tone === 'green';
      const fill = light ? '#2a1d16' : '#f3e6cc', edge = light ? 'rgba(255,236,190,.55)' : '#1e1510';
      const sub = opts.sub, room = r.w - 40;
      const size = fitSize(ctx, opts.label, opts.size ?? Math.round(r.h * (sub ? 0.34 : 0.42)), room);
      const cy = r.y + (pressed ? 2 : 0) + r.h * (sub ? 0.4 : 0.52);
      outlinedText(ctx, opts.label, r.x + r.w / 2, cy, size, fill, edge, 'center');
      if (sub) {
        let subSize = fitSize(ctx, sub, Math.round(size * 0.62), room);
        const sy = cy + size * 0.72;
        if (opts.subIcon) {
          subSize = fitSize(ctx, sub, subSize, room - subSize * 1.4);
          ctx.font = fontFor(subSize);
          const tw = ctx.measureText(sub).width, is = subSize * 1.25, x0 = r.x + r.w / 2 - (is + 6 + tw) / 2;
          opts.subIcon(ctx, x0 + is / 2, sy, is);
          outlinedText(ctx, sub, x0 + is + 6, sy, subSize, fill, edge, 'left');
        } else outlinedText(ctx, sub, r.x + r.w / 2, sy, subSize, fill, edge, 'center');
      }
      ctx.restore();
      return clicked;
    }

    ctx.fillStyle = INK;
    rrect(ctx, r.x - 3, r.y - 3 + dy, r.w + 6, r.h + lip + 6, rad + 3);
    ctx.fill();
    ctx.fillStyle = tone.lip;
    rrect(ctx, r.x, r.y + dy, r.w, r.h + lip, rad);
    ctx.fill();
    const g = ctx.createLinearGradient(0, r.y + dy, 0, r.y + dy + r.h);
    g.addColorStop(0, tone.top);
    g.addColorStop(1, tone.bottom);
    ctx.fillStyle = g;
    rrect(ctx, r.x, r.y + dy, r.w, r.h, rad);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    rrect(ctx, r.x + 6, r.y + dy + 4, r.w - 12, r.h * 0.3, rad * 0.6);
    ctx.fill();

    const sub = opts.sub;
    const room = r.w - 24;
    const size = fitSize(ctx, opts.label, opts.size ?? Math.round(r.h * (sub ? 0.32 : 0.4)), room);
    const cy = r.y + dy + r.h * (sub ? 0.37 : 0.52);
    outlinedText(ctx, opts.label, r.x + r.w / 2, cy, size, tone.text, tone.shadow, 'center');
    if (sub) {
      const iconW = opts.subIcon ? 1 : 0;
      let subSize = fitSize(ctx, sub, Math.round((opts.size ?? Math.round(r.h * 0.32)) * 0.68), room);
      if (iconW) subSize = fitSize(ctx, sub, subSize, room - subSize * 1.4);
      const sy = r.y + dy + r.h * 0.74;
      if (opts.subIcon) {
        ctx.font = fontFor(subSize);
        const tw = ctx.measureText(sub).width;
        const is = subSize * 1.25;
        const x0 = r.x + r.w / 2 - (is + 6 + tw) / 2;
        opts.subIcon(ctx, x0 + is / 2, sy, is);
        outlinedText(ctx, sub, x0 + is + 6, sy, subSize, '#fff', tone.shadow, 'left');
      } else {
        outlinedText(ctx, sub, r.x + r.w / 2, sy, subSize, '#fff', tone.shadow, 'center');
      }
    }
    ctx.restore();
    return clicked;
  }

  /** Square icon key (shop, quests, dex, settings). Draws nothing itself but the frame. */
  iconButton(id: string, r: Rect, ctx: Ctx, drawIcon: () => void, badge = 0): boolean {
    const { pressed, clicked } = this.track(id, r, false);
    const dy = pressed ? 3 : 0;
    ctx.save();
    const ib = kit('ui-iconbtn');
    if (ib) {
      ctx.drawImage(ib, r.x - 6, r.y - 6 + dy, r.w + 12, r.h + 12);
      ctx.translate(0, dy);
      drawIcon();
      ctx.restore();
      return clicked;
    }
    ctx.fillStyle = INK;
    rrect(ctx, r.x - 3, r.y - 3 + dy, r.w + 6, r.h + 11, 20);
    ctx.fill();
    ctx.fillStyle = '#5b544c';
    rrect(ctx, r.x, r.y + dy, r.w, r.h + 5, 17);
    ctx.fill();
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, '#a49b90');
    g.addColorStop(1, '#7a7268');
    ctx.fillStyle = g;
    rrect(ctx, r.x, r.y + dy, r.w, r.h, 17);
    ctx.fill();
    ctx.translate(0, dy);
    drawIcon();
    ctx.restore();
    if (badge > 0) {
      const bx = r.x + r.w - 6, by = r.y + 6;
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(bx, by, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8402f';
      ctx.beginPath(); ctx.arc(bx, by, 14, 0, Math.PI * 2); ctx.fill();
      outlinedText(ctx, '!', bx, by + 1, 20, '#fff', '#9a2a1d', 'center');
    }
    return clicked;
  }

  /** Dimmer behind a modal. Swallows stray taps so the world never sees them. */
  scrim(ctx: Ctx, w: number, h: number): void {
    ctx.fillStyle = 'rgba(16,14,8,.6)';
    ctx.fillRect(0, 0, w, h);
  }

  /** Call after a modal has drawn all its buttons: eats any unclaimed press. */
  swallow(): void {
    if (this.input.p.justDown) this.claimed = true;
  }
}

/** Parchment-and-stone panel used by every modal. */
export function panel(ctx: Ctx, r: Rect, title?: string): void {
  if (nine(ctx, 'ui-panel', { x: r.x - 14, y: r.y - 14, w: r.w + 28, h: r.h + 28 }, 0.6)) {
    if (title) ribbon(ctx, r.x + r.w / 2, r.y - 40, Math.min(r.w * 0.8, 420), title, 'green');
    return;
  }
  ctx.save();
  ctx.fillStyle = INK;
  rrect(ctx, r.x - 5, r.y - 5, r.w + 10, r.h + 10, 30);
  ctx.fill();
  ctx.fillStyle = '#8a7d6c';
  rrect(ctx, r.x, r.y, r.w, r.h, 26);
  ctx.fill();
  ctx.fillStyle = '#f3e2bf';
  rrect(ctx, r.x + 12, r.y + 12, r.w - 24, r.h - 24, 18);
  ctx.fill();
  ctx.restore();
  if (title) {
    const tw = Math.min(r.w * 0.7, 360);
    const tr: Rect = { x: r.x + (r.w - tw) / 2, y: r.y - 30, w: tw, h: 60 };
    plaque(ctx, tr);
    outlinedText(ctx, title, tr.x + tr.w / 2, tr.y + tr.h / 2 + 2, 30, '#ffe28a', INK, 'center');
  }
}

/**
 * Result card in the reference style: an orange frame around cream paper.
 */
export function fancyPanel(ctx: Ctx, r: Rect): void {
  if (nine(ctx, 'ui-panel', { x: r.x - 14, y: r.y - 14, w: r.w + 28, h: r.h + 28 }, 0.6)) return;
  ctx.save();
  ctx.fillStyle = INK;
  rrect(ctx, r.x - 5, r.y - 5, r.w + 10, r.h + 10, 40);
  ctx.fill();
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, '#ffc252');
  g.addColorStop(1, '#e8801a');
  ctx.fillStyle = g;
  rrect(ctx, r.x, r.y, r.w, r.h, 36);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  rrect(ctx, r.x + 8, r.y + 6, r.w - 16, 10, 5);
  ctx.fill();
  ctx.fillStyle = '#b8600f';
  rrect(ctx, r.x + 13, r.y + 15, r.w - 26, r.h - 26, 26);
  ctx.fill();
  ctx.fillStyle = '#fff4dc';
  rrect(ctx, r.x + 14, r.y + 14, r.w - 28, r.h - 30, 26);
  ctx.fill();
  ctx.restore();
}

/** Ribbon banner across the top of a card, with folded tails. */
export function ribbon(ctx: Ctx, cx: number, y: number, w: number, text: string, tone: 'green' | 'red'): void {
  const key = tone === 'green' ? 'ui-ribbon-win' : 'ui-ribbon-lose';
  if (kit(key)) {
    const h = 96, ww = w + 120;
    nine(ctx, key, { x: cx - ww / 2, y: y - 6, w: ww, h }, 0.5);
    const size = fitSize(ctx, text, 40, w - 40);
    outlinedText(ctx, text, cx, y + h * 0.4, size, '#f6ead0', '#2a1d16', 'center');
    return;
  }
  const [top, bottom, dark, outline] = tone === 'green'
    ? ['#7ee05a', '#3fae35', '#2c7a24', '#1f5a1a']
    : ['#ff7a8a', '#e8384f', '#a3202f', '#7a1424'];
  const h = 78;
  const x = cx - w / 2;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  // tails behind
  for (const side of [-1, 1]) {
    const ex = side < 0 ? x - 34 : x + w + 34;
    const ix = side < 0 ? x + 26 : x + w - 26;
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(ix, y + 22);
    ctx.lineTo(ex, y + 26);
    ctx.lineTo(ex + side * -18, y + 52);
    ctx.lineTo(ex, y + 80);
    ctx.lineTo(ix, y + 80);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  // main band, gently arched
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y + 10);
  ctx.quadraticCurveTo(cx, y - 12, x + w, y + 10);
  ctx.lineTo(x + w, y + h - 6);
  ctx.quadraticCurveTo(cx, y + h - 26, x, y + h - 6);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 14);
  ctx.quadraticCurveTo(cx, y - 4, x + w - 14, y + 14);
  ctx.lineTo(x + w - 14, y + 22);
  ctx.quadraticCurveTo(cx, y + 4, x + 14, y + 22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const size = fitSize(ctx, text, 44, w - 60);
  ctx.font = fontFor(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, size * 0.22);
  ctx.strokeStyle = outline;
  ctx.strokeText(text, cx, y + h / 2 - 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, cx, y + h / 2 - 6);
}

/** Golden capsule for a score or a reward row. */
export function goldPill(ctx: Ctx, r: Rect): void {
  ctx.save();
  ctx.fillStyle = '#c9781a';
  rrect(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 8, (r.h + 6) / 2);
  ctx.fill();
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, '#fff3c4');
  g.addColorStop(1, '#ffd36a');
  ctx.fillStyle = g;
  rrect(ctx, r.x, r.y, r.w, r.h, r.h / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 3;
  rrect(ctx, r.x + 4, r.y + 3, r.w - 8, r.h - 6, (r.h - 6) / 2);
  ctx.stroke();
  ctx.restore();
}

/** Section label with little dashes either side, e.g. "- REWARDS -". */
export function sectionLabel(ctx: Ctx, str: string, cx: number, y: number, size: number): void {
  ctx.font = fontFor(size);
  const w = ctx.measureText(str).width;
  ctx.save();
  ctx.strokeStyle = '#e8b878';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const x0 = cx + side * (w / 2 + 14);
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + side * 36, y); ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#a8501a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, cx, y);
}

/** Wooden plank shape for titles and the stage label. */
export function plaque(ctx: Ctx, r: Rect): void {
  ctx.save();
  ctx.fillStyle = INK;
  rrect(ctx, r.x - 4, r.y - 4, r.w + 8, r.h + 8, 18);
  ctx.fill();
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, '#a8703f');
  g.addColorStop(1, '#7a4c26');
  ctx.fillStyle = g;
  rrect(ctx, r.x, r.y, r.w, r.h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(59,42,31,.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r.x + 12, r.y + r.h * 0.35); ctx.lineTo(r.x + r.w - 12, r.y + r.h * 0.38);
  ctx.moveTo(r.x + 12, r.y + r.h * 0.7); ctx.lineTo(r.x + r.w - 12, r.y + r.h * 0.66);
  ctx.stroke();
  ctx.restore();
}

/** Stone pill used for the coin and amber counters. */
export function pill(ctx: Ctx, r: Rect): void {
  ctx.save();
  ctx.fillStyle = INK;
  rrect(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, (r.h + 6) / 2);
  ctx.fill();
  ctx.fillStyle = '#5f5a54';
  rrect(ctx, r.x, r.y, r.w, r.h, r.h / 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  rrect(ctx, r.x + 8, r.y + 4, r.w - 16, r.h * 0.35, r.h * 0.2);
  ctx.fill();
  ctx.restore();
}

export function bar(ctx: Ctx, r: Rect, pct: number, fill: string): void {
  if (kit('ui-bar-frame')) {
    ctx.save();
    ctx.fillStyle = '#2a2018'; rrect(ctx, r.x, r.y, r.w, r.h, r.h / 3); ctx.fill();
    const w = Math.max(0, Math.min(1, pct)) * r.w;
    if (w > 1) { ctx.fillStyle = fill; rrect(ctx, r.x, r.y, Math.max(w, 4), r.h, r.h / 3); ctx.fill(); }
    ctx.restore();
    nine(ctx, 'ui-bar-frame', { x: r.x - 6, y: r.y - 5, w: r.w + 12, h: r.h + 10 }, Math.min(0.35, (r.h + 10) / 64));
    return;
  }
  ctx.save();
  ctx.fillStyle = INK;
  rrect(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, (r.h + 6) / 2);
  ctx.fill();
  ctx.fillStyle = '#4a3a30';
  rrect(ctx, r.x, r.y, r.w, r.h, r.h / 2);
  ctx.fill();
  const w = Math.max(0, Math.min(1, pct)) * r.w;
  if (w > 1) {
    ctx.fillStyle = fill;
    rrect(ctx, r.x, r.y, Math.max(w, r.h), r.h, r.h / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    rrect(ctx, r.x + 3, r.y + 2, Math.max(w - 6, 1), r.h * 0.35, r.h * 0.2);
    ctx.fill();
  }
  ctx.restore();
}

/** Largest font size <= `size` at which `str` fits in `maxW` (svg/canvas text never wraps). */
export function fitSize(ctx: Ctx, str: string, size: number, maxW: number, weight = 700): number {
  ctx.font = fontFor(size, weight);
  const w = ctx.measureText(str).width;
  return w > maxW && w > 0 ? Math.max(8, Math.floor(size * maxW / w)) : size;
}

export function outlinedText(
  ctx: Ctx, str: string, x: number, y: number, size: number,
  fill = '#fff', outline = INK, align: CanvasTextAlign = 'left', weight = 700,
): void {
  ctx.font = fontFor(size, weight);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.2);
  ctx.strokeStyle = outline;
  ctx.strokeText(str, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
}

export function text(
  ctx: Ctx, str: string, x: number, y: number, size: number,
  color = INK, align: CanvasTextAlign = 'left', weight = 600,
): void {
  ctx.font = fontFor(size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}
