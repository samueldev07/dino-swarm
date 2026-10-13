import type { Input } from '../engine/input';
import { rrect, INK, fontFor } from './draw';
import type { Assets, SliceInsets } from '../engine/assets';

type Ctx = CanvasRenderingContext2D;

export interface Rect { x: number; y: number; w: number; h: number }

const skins = new WeakMap<CanvasRenderingContext2D, Assets>();
export function setUISkin(ctx: CanvasRenderingContext2D, assets: Assets): void { skins.set(ctx, assets); }
export function hasUISkin(ctx: CanvasRenderingContext2D, key: string): boolean { return !!skins.get(ctx)?.get(key); }

/** Insets are source pixels: corners stay fixed, only center/edges stretch. */
export function nineSlice(ctx: CanvasRenderingContext2D, image: HTMLImageElement | HTMLCanvasElement, r: Rect, insets: SliceInsets): boolean {
  const [l, t, right, b] = insets, w = image.width, h = image.height;
  if (![...insets, r.w, r.h].every(Number.isFinite) || insets.some(v => v < 0) || l + right >= w || t + b >= h || r.w <= 0 || r.h <= 0) return false;
  const k = Math.min(1, r.w / Math.max(1, l + right), r.h / Math.max(1, t + b));
  const sx = [0, l, w - right, w], sy = [0, t, h - b, h];
  const dx = [r.x, r.x + l*k, r.x + r.w - right*k, r.x + r.w], dy = [r.y, r.y + t*k, r.y + r.h - b*k, r.y + r.h];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const sw = sx[col+1]-sx[col], sh = sy[row+1]-sy[row], dw = dx[col+1]-dx[col], dh = dy[row+1]-dy[row];
    if (sw > 0 && sh > 0 && dw > 0 && dh > 0) ctx.drawImage(image, sx[col], sy[row], sw, sh, dx[col], dy[row], dw, dh);
  }
  return true;
}

export function drawUISkin(ctx: CanvasRenderingContext2D, key: string, r: Rect, pressed = false): boolean {
  const assets = skins.get(ctx), image = assets?.get(key);
  if (!image) return false;
  // Artists normally supply insets; a quarter-size default keeps old manifests usable.
  const insets = assets!.slice(key) ?? [Math.floor(image.width/4), Math.floor(image.height/4), Math.floor(image.width/4), Math.floor(image.height/4)];
  ctx.save();
  if (pressed) { ctx.translate(r.x+r.w/2, r.y+r.h/2); ctx.scale(.96,.96); ctx.translate(-r.x-r.w/2,-r.y-r.h/2); ctx.filter = 'brightness(.82)'; }
  const drawn = nineSlice(ctx, image, r, insets);
  ctx.restore(); return drawn;
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
    const skinKey = `ui-btn-${opts.tone ?? 'green'}`;
    const painted = hasUISkin(ctx, skinKey);
    const dy = painted ? 0 : pressed ? 4 : 0;
    const lip = pressed ? 2 : 6;

    ctx.save();
    if (disabled) ctx.filter = 'grayscale(.85) brightness(.9)';
    else if (painted && pressed) { ctx.translate(r.x+r.w/2,r.y+r.h/2); ctx.scale(.96,.96); ctx.translate(-r.x-r.w/2,-r.y-r.h/2); ctx.filter='brightness(.82)'; }

    if (!drawUISkin(ctx, skinKey, r)) {
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

    }

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
    ctx.fillStyle = 'rgba(20,12,6,.62)';
    ctx.fillRect(0, 0, w, h);
  }

  /** Call after a modal has drawn all its buttons: eats any unclaimed press. */
  swallow(): void {
    if (this.input.p.justDown) this.claimed = true;
  }
}

/** Parchment-and-stone panel used by every modal. */
export function panel(ctx: Ctx, r: Rect, title?: string): void {
  if (!drawUISkin(ctx, 'ui-panel', r)) {
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
  }
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
  if (drawUISkin(ctx, 'ui-panel', r)) return;
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
  const [top, bottom, dark, outline] = tone === 'green'
    ? ['#7ee05a', '#3fae35', '#2c7a24', '#1f5a1a']
    : ['#ff7a8a', '#e8384f', '#a3202f', '#7a1424'];
  const h = 78;
  const x = cx - w / 2;
  if (!drawUISkin(ctx, `ui-ribbon-${tone}`, { x, y, w, h })) {
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
  }
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
  drawUISkin(ctx, 'ui-bar-frame', r);
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
