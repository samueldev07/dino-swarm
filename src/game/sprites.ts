/**
 * Procedural sprites in the hand-drawn vector style (ART-DIRECTION.md §2):
 * thick dark outline, flat colour + one hard cel shadow (light from top-left),
 * white sticker rim on the player and pickups only.
 *
 * Everything is drawn ONCE into offscreen canvases at load, then blitted, so
 * 300 enemies cost one drawImage each. When Antigravity's painted art lands
 * in public/sprites (same keys), `Sprites.get` prefers it automatically.
 */
import { INK } from './draw';
import type { Assets } from '../engine/assets';
import type { EnemyKind, SpeciesId, SkillId } from './config';

export interface Sprite {
  img: HTMLCanvasElement | HTMLImageElement;
  /** White silhouette for the hit flash. */
  white: HTMLCanvasElement;
  /** Size in world units (the image is drawn into a w x h box centred on the anchor). */
  w: number;
  h: number;
  /** Anchor: fraction of the box where the entity's ground point sits. */
  ax: number;
  ay: number;
}

type Ctx = CanvasRenderingContext2D;
const RES = 2; // pixels per world unit in the cached canvases

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * RES);
  c.height = Math.ceil(h * RES);
  const ctx = c.getContext('2d')!;
  ctx.scale(RES, RES);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return [c, ctx];
}

/** Outline + flat fill + hard cel shadow on the lower-right. */
function cel(ctx: Ctx, path: Path2D, base: string, shade: string, line = 3.2, off = 3.5): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = line * 2;
  ctx.stroke(path);
  ctx.fillStyle = shade;
  ctx.fill(path);
  ctx.clip(path);
  ctx.translate(-off, -off * 1.15);
  ctx.fillStyle = base;
  ctx.fill(path);
  ctx.restore();
}

function ell(x: number, y: number, rx: number, ry: number, rot = 0): Path2D {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  return p;
}

function poly(pts: number[], close = true): Path2D {
  const p = new Path2D();
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  if (close) p.closePath();
  return p;
}

/** Smooth closed blob through points (quadratic midpoints). */
function blob(pts: number[]): Path2D {
  const p = new Path2D();
  const n = pts.length / 2;
  const mx = (i: number) => (pts[(i % n) * 2] + pts[((i + 1) % n) * 2]) / 2;
  const my = (i: number) => (pts[(i % n) * 2 + 1] + pts[((i + 1) % n) * 2 + 1]) / 2;
  p.moveTo(mx(0), my(0));
  for (let i = 1; i <= n; i++) p.quadraticCurveTo(pts[(i % n) * 2], pts[(i % n) * 2 + 1], mx(i), my(i));
  p.closePath();
  return p;
}

function eye(ctx: Ctx, x: number, y: number, r: number, angry = false, lookX = 0.35): void {
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(x, y, r + 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(x + r * lookX, y + r * 0.1, r * 0.52, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x + r * lookX - r * 0.18, y - r * 0.2, r * 0.17, 0, Math.PI * 2); ctx.fill();
  if (angry) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(x - r * 1.1, y - r * 1.25); ctx.lineTo(x + r * 1.05, y - r * 0.7); ctx.stroke();
  }
}

/** Sticker rim: dilate the silhouette in white, then the art on top. */
function withRim(src: HTMLCanvasElement, rim: number): HTMLCanvasElement {
  const pad = Math.ceil(rim * RES);
  const c = document.createElement('canvas');
  c.width = src.width + pad * 2;
  c.height = src.height + pad * 2;
  const ctx = c.getContext('2d')!;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.drawImage(src, pad + Math.cos(a) * pad, pad + Math.sin(a) * pad);
  }
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(src, pad, pad);
  return c;
}

function whiteOf(src: HTMLCanvasElement | HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

function make(w: number, h: number, ax: number, ay: number, draw: (ctx: Ctx) => void, rim = 0): Sprite {
  const [c, ctx] = canvas(w, h);
  draw(ctx);
  const img = rim > 0 ? withRim(c, rim) : c;
  const W = rim > 0 ? w + rim * 2 : w;
  const H = rim > 0 ? h + rim * 2 : h;
  const AX = rim > 0 ? (ax * w + rim) / W : ax;
  const AY = rim > 0 ? (ay * h + rim) / H : ay;
  return { img, white: whiteOf(img), w: W, h: H, ax: AX, ay: AY };
}

// ------------------------------------------------------------------ dinos (face right)
const DINO_COLORS: Record<SpeciesId, [string, string, string, string][]> = {
  // body, shade, belly, accent (spikes / crest) per form
  raptor: [['#f08a3a', '#c25e22', '#ffd9a0', '#7a3b1a'], ['#e8653a', '#b0401e', '#ffd2a0', '#5a2412'], ['#d8422e', '#9a2618', '#ffc890', '#3a1610']],
  ankylo: [['#8fb04a', '#617d2c', '#e6dca0', '#5a4a2a'], ['#6f9a52', '#4a6d34', '#e0d8a0', '#4a3a22'], ['#5a8a6a', '#3a6048', '#d8d4a8', '#3a2e1c']],
  ptero:  [['#5aa8d8', '#3a78a8', '#e8f0e0', '#2a4a6a'], ['#5a88e0', '#3a5aa8', '#e8ecf4', '#25335e'], ['#7a6ae0', '#4e40a8', '#efe8f8', '#2e2460']],
};

function drawRaptor(ctx: Ctx, form: number, col: [string, string, string, string]): void {
  const [b, s, belly, acc] = col;
  // tail
  cel(ctx, blob([8, 52, 30, 44, 50, 46, 52, 60, 30, 62]), b, s);
  // back leg
  cel(ctx, poly([52, 66, 46, 92, 40, 96, 54, 96, 60, 70]), s, s);
  // body
  cel(ctx, ell(66, 58, 26, 20, -0.25), b, s);
  cel(ctx, ell(70, 66, 15, 9, -0.25), belly, belly, 2.4, 0);
  // front leg
  cel(ctx, poly([72, 70, 76, 94, 70, 98, 86, 98, 82, 70]), b, s);
  // neck + head
  cel(ctx, blob([76, 48, 86, 30, 96, 22, 116, 24, 124, 34, 118, 44, 100, 46, 88, 56]), b, s);
  // jaw line + teeth
  ctx.strokeStyle = INK; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(100, 40); ctx.quadraticCurveTo(112, 42, 122, 38); ctx.stroke();
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(106 + i * 5, 41); ctx.lineTo(108.5 + i * 5, 45); ctx.lineTo(111 + i * 5, 41); ctx.fill(); }
  // arm
  ctx.strokeStyle = INK; ctx.lineWidth = 5.5;
  ctx.beginPath(); ctx.moveTo(82, 60); ctx.lineTo(92, 66); ctx.lineTo(96, 62); ctx.stroke();
  ctx.strokeStyle = s; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(82, 60); ctx.lineTo(92, 66); ctx.lineTo(96, 62); ctx.stroke();
  // crest / spikes grow with the form
  const spikes = 2 + form * 2;
  for (let i = 0; i < spikes; i++) {
    const x = 92 - i * 9, y = 26 + i * 6;
    cel(ctx, poly([x - 4, y + 4, x - 1 - form, y - 9 - form * 2, x + 5, y + 2]), acc, acc, 2.4, 0);
  }
  eye(ctx, 106, 31, 5.2, form > 0);
  // nostril + claw tips
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(119, 30, 1.4, 0, 7); ctx.fill();
}

function drawAnkylo(ctx: Ctx, form: number, col: [string, string, string, string]): void {
  const [b, s, belly, acc] = col;
  cel(ctx, blob([8, 62, 26, 54, 40, 60, 26, 70]), b, s);
  cel(ctx, ell(10, 63, 8, 7), acc, acc, 2.8, 0); // tail club
  for (const x of [38, 58, 82, 96]) cel(ctx, poly([x - 7, 72, x - 6, 94, x + 7, 94, x + 7, 72]), s, s);
  cel(ctx, blob([28, 66, 34, 40, 64, 30, 94, 36, 108, 56, 104, 74, 40, 76]), b, s);
  cel(ctx, ell(70, 70, 30, 6), belly, belly, 2.2, 0);
  // shell plates + spikes
  const n = 4 + form * 2;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = 38 + t * 62, y = 40 - Math.sin(t * Math.PI) * 10;
    cel(ctx, poly([x - 6, y + 5, x, y - 8 - form * 2.5, x + 6, y + 5]), acc, acc, 2.2, 0);
  }
  cel(ctx, blob([100, 46, 122, 44, 128, 58, 116, 66, 100, 62]), b, s);
  eye(ctx, 114, 52, 4.4, form > 0);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(114, 61); ctx.lineTo(126, 60); ctx.stroke();
}

function drawPtero(ctx: Ctx, form: number, col: [string, string, string, string]): void {
  const [b, s, belly, acc] = col;
  const span = 1 + form * 0.12;
  // back wing
  cel(ctx, poly([62, 50, 20 - form * 6, 22 - form * 4, 34, 54, 54, 62]), s, s);
  cel(ctx, poly([58, 74, 54, 96, 66, 96, 66, 74]), s, s);
  cel(ctx, ell(66, 60, 18, 16), b, s);
  cel(ctx, ell(68, 66, 10, 8), belly, belly, 2.2, 0);
  // front wing
  cel(ctx, poly([70, 52, 70 + 50 * span, 18 - form * 4, 92, 50, 82, 62]), b, s);
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(74, 52); ctx.lineTo(70 + 44 * span, 24 - form * 4); ctx.stroke();
  // head with crest
  cel(ctx, poly([64, 40, 54 - form * 4, 18 - form * 3, 74, 34]), acc, acc, 2.4, 0);
  cel(ctx, blob([64, 46, 72, 32, 86, 32, 120, 42, 86, 50]), b, s);
  eye(ctx, 78, 38, 4.6, form > 0);
}

export function dinoSprite(sp: SpeciesId, form: number): Sprite {
  const col = DINO_COLORS[sp][form];
  return make(132, 104, 0.5, 0.92, (ctx) => {
    if (sp === 'raptor') drawRaptor(ctx, form, col);
    else if (sp === 'ankylo') drawAnkylo(ctx, form, col);
    else drawPtero(ctx, form, col);
  }, 3.5);
}

// ------------------------------------------------------------------ enemies (face right)
function enemyDraw(kind: EnemyKind, zone: number): [number, number, (ctx: Ctx) => void] {
  // Zone tints: jungle (mossy), lava (charred red), frost (blue-grey).
  // Cool hues for monsters (the player is warm); magenta is reserved for enemy shots.
  const tint = [['#4a9aa8', '#2e6e7a'], ['#b8543a', '#7e3020'], ['#7a9ab8', '#4e6a8a']][zone] ?? ['#4a9aa8', '#2e6e7a'];
  switch (kind) {
    case 'grub': return [48, 40, (c) => {
      cel(c, blob([4, 32, 8, 18, 22, 10, 38, 12, 46, 26, 42, 36, 20, 38]), tint[0], tint[1], 2.8, 3);
      c.strokeStyle = INK; c.lineWidth = 2;
      for (const x of [16, 26]) { c.beginPath(); c.moveTo(x, 14); c.quadraticCurveTo(x - 3, 25, x + 1, 36); c.stroke(); }
      eye(c, 36, 22, 4.2, true);
    }];
    case 'bat': return [56, 40, (c) => {
      cel(c, poly([28, 20, 2, 6, 8, 22, 4, 32, 26, 28]), '#5a4a5e', '#3e3044', 2.6, 0);
      cel(c, poly([28, 20, 54, 6, 48, 22, 52, 32, 30, 28]), '#5a4a5e', '#3e3044', 2.6, 0);
      cel(c, ell(28, 22, 10, 10), '#7a6680', '#54445a', 2.6, 2.5);
      eye(c, 32, 20, 3.6, true);
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(27, 28); c.lineTo(29, 32); c.lineTo(31, 28); c.fill();
    }];
    case 'beetle': return [64, 52, (c) => {
      c.strokeStyle = INK; c.lineWidth = 3;
      for (const x of [18, 30, 42]) { c.beginPath(); c.moveTo(x, 36); c.lineTo(x - 4, 48); c.stroke(); }
      cel(c, blob([6, 38, 10, 14, 32, 6, 52, 12, 58, 34, 50, 42, 14, 42]), '#4e6a3a', '#344a26', 3, 4);
      c.strokeStyle = INK; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(32, 8); c.lineTo(32, 40); c.stroke();
      cel(c, ell(56, 30, 8, 7), '#3a3028', '#2a221c', 2.6, 1.5);
      cel(c, poly([58, 26, 64, 12, 62, 28]), '#e8d8b0', '#c8b890', 2, 0);
      eye(c, 58, 30, 2.8, true);
    }];
    case 'wolf': return [64, 52, (c) => {
      cel(c, poly([6, 22, 2, 14, 14, 20]), tint[1], tint[1], 2.4, 0);
      for (const x of [16, 24, 40, 48]) cel(c, poly([x - 3, 34, x - 3, 50, x + 4, 50, x + 4, 34]), '#5e6470', '#40454e', 2.2, 0);
      cel(c, blob([8, 26, 16, 16, 40, 14, 50, 22, 48, 36, 14, 38]), '#7c8290', '#585d68', 2.8, 3);
      cel(c, blob([42, 16, 52, 8, 62, 20, 60, 28, 48, 30]), '#7c8290', '#585d68', 2.6, 2);
      cel(c, poly([46, 12, 48, 0, 54, 10]), '#585d68', '#585d68', 2.2, 0);
      eye(c, 54, 17, 3.2, true);
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(56, 26); c.lineTo(58, 30); c.lineTo(60, 25); c.fill();
    }];
    case 'shroom': return [50, 54, (c) => {
      cel(c, blob([16, 50, 14, 28, 36, 28, 34, 50]), '#efe2c4', '#cbbb98', 2.8, 2.5);
      cel(c, blob([2, 28, 8, 8, 26, 2, 44, 8, 48, 28, 24, 32]), '#a8563a', '#7a3622', 3, 3.5);
      c.fillStyle = '#f6e2c8';
      for (const [x, y, r] of [[16, 14, 4], [30, 10, 3.2], [38, 20, 2.6]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
      eye(c, 22, 38, 3.2, true, 0.2); eye(c, 30, 38, 3.2, true, 0.2);
    }];
    case 'brute': return [100, 96, (c) => {
      cel(c, poly([24, 70, 20, 94, 40, 94, 42, 70]), '#5a524a', '#3e3832', 3.2, 0);
      cel(c, poly([58, 70, 60, 94, 80, 94, 76, 70]), '#5a524a', '#3e3832', 3.2, 0);
      cel(c, blob([10, 66, 8, 30, 30, 10, 66, 8, 90, 26, 92, 62, 70, 78, 30, 78]), '#7a7066', '#544c44', 3.6, 6);
      c.strokeStyle = tint[0]; c.lineWidth = 3.4;
      c.beginPath(); c.moveTo(30, 30); c.lineTo(42, 46); c.lineTo(36, 60); c.moveTo(66, 24); c.lineTo(58, 42); c.stroke();
      cel(c, ell(84, 52, 14, 16), '#7a7066', '#544c44', 3.2, 3);
      eye(c, 56, 34, 5.5, true); eye(c, 74, 34, 5, true);
      c.strokeStyle = INK; c.lineWidth = 3;
      c.beginPath(); c.moveTo(56, 52); c.lineTo(76, 50); c.stroke();
    }];
    case 'boss': return [170, 150, (c) => {
      cel(c, poly([40, 110, 34, 146, 66, 146, 66, 110]), '#4a3a44', '#33282f', 3.6, 0);
      cel(c, poly([100, 110, 104, 146, 134, 146, 126, 110]), '#4a3a44', '#33282f', 3.6, 0);
      cel(c, blob([12, 104, 8, 50, 40, 18, 100, 12, 150, 36, 162, 92, 130, 124, 44, 126]), tint[0], tint[1], 4, 9);
      for (const [x, y, h] of [[52, 22, 26], [84, 12, 34], [118, 20, 28]]) cel(c, poly([x - 9, y + 8, x, y - h, x + 9, y + 8]), '#efe2c4', '#cbbb98', 3, 0);
      eye(c, 92, 56, 9, true); eye(c, 124, 58, 8, true);
      c.fillStyle = INK; c.beginPath(); c.moveTo(84, 86); c.quadraticCurveTo(110, 104, 140, 84); c.quadraticCurveTo(110, 92, 84, 86); c.fill();
      c.fillStyle = '#fff';
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(92 + i * 9, 88); c.lineTo(96 + i * 9, 96); c.lineTo(100 + i * 9, 88); c.fill(); }
    }];
  }
}

// ------------------------------------------------------------------ pickups & projectiles
function amber(c: Ctx, s: number, base: string, shade: string): void {
  const h = s / 2;
  cel(c, poly([h, 2, s - 3, h * 0.8, h + h * 0.55, s - 2, h - h * 0.55, s - 2, 3, h * 0.8]), base, shade, 2.2, s * 0.12);
  c.fillStyle = 'rgba(255,255,255,.85)';
  c.beginPath(); c.ellipse(h - s * 0.12, s * 0.32, s * 0.07, s * 0.12, -0.5, 0, 7); c.fill();
}

export class Sprites {
  private cache = new Map<string, Sprite>();
  constructor(private assets: Assets) {}

  /** Painted art (manifest key) wins over the procedural fallback once it has loaded. */
  private pick(key: string, fallback: () => Sprite): Sprite {
    const img = this.assets.get(key);
    const hit = this.cache.get(key);
    if (img && (!hit || !(hit.img instanceof HTMLImageElement))) {
      const fb = hit ?? fallback();
      const s: Sprite = { ...fb, img, white: whiteOf(img) };
      this.cache.set(key, s);
      return s;
    }
    if (hit) return hit;
    const s = fallback();
    this.cache.set(key, s);
    return s;
  }

  dino(sp: SpeciesId, form: number): Sprite {
    return this.pick(`player-${sp}-${form + 1}`, () => dinoSprite(sp, form));
  }

  enemy(kind: EnemyKind, zone: number): Sprite {
    return this.pick(`enemy-${kind}-${zone}`, () => {
      const [w, h, draw] = enemyDraw(kind, zone);
      return make(w, h, 0.5, 0.9, draw);
    });
  }

  gem(value: number): Sprite {
    const tier = value >= 10 ? 2 : value >= 3 ? 1 : 0;
    return this.pick(`pickup-amber-${tier + 1}`, () => {
      const s = [20, 26, 34][tier];
      const col = [['#ffc23a', '#d8861a'], ['#ff8a2a', '#c8521a'], ['#e8406a', '#a8203e']][tier];
      return make(s, s, 0.5, 0.75, (c) => amber(c, s, col[0], col[1]), 2);
    });
  }

  pickup(kind: 'meat' | 'coin' | 'magnet' | 'chest'): Sprite {
    return this.pick(`pickup-${kind}`, () => {
      switch (kind) {
        case 'meat': return make(44, 34, 0.5, 0.8, (c) => {
          c.strokeStyle = INK; c.lineWidth = 9; c.beginPath(); c.moveTo(30, 18); c.lineTo(41, 9); c.stroke();
          c.strokeStyle = '#f6ecd8'; c.lineWidth = 4.5; c.beginPath(); c.moveTo(30, 18); c.lineTo(41, 9); c.stroke();
          cel(c, ell(19, 20, 15, 11, -0.3), '#d8603a', '#a83e22', 2.8, 3);
          c.fillStyle = '#f2a080'; c.beginPath(); c.ellipse(15, 16, 5, 3, -0.4, 0, 7); c.fill();
        }, 3);
        case 'coin': return make(28, 28, 0.5, 0.75, (c) => {
          cel(c, ell(14, 14, 11, 11), '#ffd24a', '#d8961a', 2.4, 2.5);
          c.strokeStyle = '#b8761a'; c.lineWidth = 2; c.beginPath(); c.arc(14, 14, 6, 0, 7); c.stroke();
        }, 2.5);
        case 'magnet': return make(40, 40, 0.5, 0.8, (c) => {
          const p = new Path2D();
          p.arc(20, 18, 13, Math.PI, 0); p.lineTo(33, 32); p.lineTo(25, 32); p.lineTo(25, 18);
          p.arc(20, 18, 5, 0, Math.PI, true); p.lineTo(15, 32); p.lineTo(7, 32); p.closePath();
          cel(c, p, '#e8403a', '#a8221e', 2.6, 2.5);
          c.fillStyle = '#e8e8f0'; c.fillRect(7, 28, 8, 4); c.fillRect(25, 28, 8, 4);
        }, 3);
        case 'chest': return make(60, 50, 0.5, 0.85, (c) => {
          cel(c, poly([6, 22, 54, 22, 54, 46, 6, 46]), '#b8742e', '#8a4e1a', 3, 3);
          cel(c, blob([6, 24, 8, 8, 30, 4, 52, 8, 54, 24]), '#d08a3a', '#9a5a20', 3, 3);
          c.fillStyle = '#ffd24a'; c.strokeStyle = INK; c.lineWidth = 2.4;
          c.fillRect(25, 20, 10, 12); c.strokeRect(25, 20, 10, 12);
          c.strokeStyle = '#ffd24a'; c.lineWidth = 3; c.beginPath(); c.moveTo(14, 8); c.lineTo(14, 46); c.moveTo(46, 8); c.lineTo(46, 46); c.stroke();
        }, 3);
      }
    });
  }

  egg(): Sprite {
    return this.pick('proj-egg', () => make(30, 36, 0.5, 0.5, (c) => {
      cel(c, blob([15, 3, 25, 12, 27, 24, 21, 33, 9, 33, 3, 24, 5, 12]), '#fff2d0', '#e0c890', 2.6, 3);
      c.fillStyle = '#c89a5a';
      for (const [x, y] of [[11, 14], [19, 20], [12, 26]]) { c.beginPath(); c.arc(x, y, 2.2, 0, 7); c.fill(); }
    }, 2));
  }

  bone(): Sprite {
    return this.pick('proj-bone', () => make(48, 22, 0.5, 0.5, (c) => {
      const p = new Path2D();
      p.rect(10, 8, 28, 6);
      for (const [x, y] of [[8, 7], [8, 15], [40, 7], [40, 15]]) { p.moveTo(x + 5, y); p.arc(x, y, 5, 0, Math.PI * 2); }
      cel(c, p, '#f6ecd8', '#d0c0a0', 2.4, 2);
    }));
  }

  thorn(): Sprite {
    return this.pick('fx-thorn', () => make(64, 64, 0.5, 0.5, (c) => {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + 0.3;
        const r = 12 + (i % 3) * 7;
        const x = 32 + Math.cos(a) * r * 0.9, y = 32 + Math.sin(a) * r * 0.7;
        cel(c, poly([x - 4, y + 4, x + Math.cos(a) * 2, y - 12, x + 4, y + 4]), '#7bc04a', '#4e8a2a', 2, 0);
      }
    }));
  }

  /** Round skill icon in the same family: ink ring, flat colour disc, glyph. */
  icon(id: SkillId | 'heal' | 'gold', color: string): Sprite {
    return this.pick(`skill-${id}`, () => make(64, 64, 0.5, 0.5, (c) => {
      cel(c, ell(32, 32, 27, 27), color, shade(color), 3, 3);
      c.save();
      c.translate(32, 32);
      glyph(c, id);
      c.restore();
    }));
  }
}

function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * 0.72);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function glyph(c: Ctx, id: SkillId | 'heal' | 'gold'): void {
  const W = '#fffaf0';
  const fillCel = (p: Path2D, col = W) => cel(c, p, col, col === W ? '#e0d4b8' : shade(col), 2.4, 1.5);
  switch (id) {
    case 'bite': {
      for (const s of [-1, 1]) {
        const p = new Path2D();
        for (let i = 0; i < 4; i++) { const x = -15 + i * 10; p.moveTo(x, 0); p.lineTo(x + 5, s * 13); p.lineTo(x + 10, 0); }
        c.translate(0, s * -3);
        fillCel(p);
        c.translate(0, s * 3);
      }
      break;
    }
    case 'spit': fillCel(blob([-14, 8, -6, -10, 0, -16, 8, -6, 14, 6, 0, 15]), '#ffd24a'); fillCel(ell(0, 6, 6, 6), '#ff7a2c'); break;
    case 'boomerang': {
      c.rotate(-0.6);
      const p = new Path2D(); p.rect(-12, -3.5, 24, 7);
      for (const [x, y] of [[-14, -4], [-14, 4], [14, -4], [14, 4]]) { p.moveTo(x + 4.5, y); p.arc(x, y, 4.5, 0, 7); }
      fillCel(p); break;
    }
    case 'orbit': fillCel(blob([0, -16, 10, -6, 12, 6, 6, 14, -6, 14, -12, 6, -10, -6])); break;
    case 'stomp': {
      fillCel(ell(0, 4, 9, 11));
      for (const x of [-9, 0, 9]) fillCel(ell(x, -12, 3.5, 4.5));
      break;
    }
    case 'meteor': fillCel(blob([-16, 14, -14, 0, 4, -16, 2, -2, 16, -12, 8, 10, -4, 16]), '#ff9a3c'); fillCel(ell(-6, 8, 7, 7), '#8a6a5a'); break;
    case 'thorns': for (const [x, h] of [[-9, 12], [0, 18], [9, 12]]) fillCel(poly([x - 5, 12, x, 12 - h - 4, x + 5, 12]), '#9ad85a'); break;
    case 'roar': {
      const pts: number[] = [];
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const r = i % 2 ? 7 : 17; pts.push(Math.cos(a) * r, Math.sin(a) * r); }
      fillCel(poly(pts), '#fff2a0'); break;
    }
    case 'vitality': case 'heal': {
      const p = new Path2D(); p.moveTo(0, 14); p.bezierCurveTo(-20, 0, -12, -16, 0, -6); p.bezierCurveTo(12, -16, 20, 0, 0, 14);
      fillCel(p, '#ff6a6a'); break;
    }
    case 'swift': fillCel(blob([-14, 12, -4, -2, 10, -14, 6, 2, -6, 10]), W); break;
    case 'might': for (const x of [-9, 0, 9]) fillCel(blob([x - 3, 12, x - 4, -2, x + 2, -14, x + 4, 0, x + 3, 12])); break;
    case 'haste': fillCel(poly([4, -16, -10, 2, -1, 2, -4, 16, 10, -2, 1, -2]), '#fff2a0'); break;
    case 'magnet': {
      const p = new Path2D();
      p.arc(0, -2, 12, Math.PI, 0); p.lineTo(12, 12); p.lineTo(5, 12); p.lineTo(5, -2);
      p.arc(0, -2, 5, 0, Math.PI, true); p.lineTo(-5, 12); p.lineTo(-12, 12); p.closePath();
      fillCel(p, '#ff6a5a'); break;
    }
    case 'regen': fillCel(poly([-4, -14, 4, -14, 4, -4, 14, -4, 14, 4, 4, 4, 4, 14, -4, 14, -4, 4, -14, 4, -14, -4, -4, -4])); break;
    case 'gold': fillCel(ell(0, 0, 12, 12), '#ffd24a'); break;
  }
}
