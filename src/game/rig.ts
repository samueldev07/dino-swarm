/**
 * Plan C rig JSON:
 * {canvas:[width,height], anchor?:[0..1,0..1], parts:[
 *   {name:"body", key:"enemy-boss-0-body", pivot:[x,y], parent:null, z:0}, ...]}
 * EVERY part image is the FULL canvas with transparent unused pixels. Pivots
 * are absolute canvas pixels (not offsets). Children inherit ancestor motion;
 * z controls draw order independently of hierarchy. Conventional names body,
 * head, jaw, arm, leg-front, leg-back select the code clips. No per-file offsets.
 */
import type { Sprite } from './sprites';

export interface RigPart {
  name: string;
  key: string;
  pivot: [number, number];
  parent: string | null;
  z: number;
}
export interface RigDefinition {
  canvas: [number, number];
  anchor?: [number, number];
  parts: RigPart[];
}
export type RigClip = 'idle' | 'walk' | 'windup' | 'charge' | 'roar' | 'hit' | 'death';
export interface RigState {
  clip: RigClip;
  time: number;
  flip?: number;
  flash?: number;
  progress?: number;
}

export function parseRig(value: unknown): RigDefinition | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const r = value as RigDefinition;
  const pair = (v: unknown): v is [number, number] =>
    Array.isArray(v) && v.length === 2 && v.every(Number.isFinite);
  if (
    !pair(r.canvas) ||
    r.canvas.some((v) => v <= 0 || v > 4096) ||
    !Array.isArray(r.parts) ||
    !r.parts.length ||
    r.parts.length > 64
  )
    return undefined;
  if (r.anchor && (!pair(r.anchor) || r.anchor.some((v) => v < 0 || v > 1))) return undefined;
  const names = new Set<string>();
  for (const p of r.parts) {
    if (
      !p ||
      typeof p.name !== 'string' ||
      !p.name ||
      names.has(p.name) ||
      typeof p.key !== 'string' ||
      !p.key ||
      !pair(p.pivot) ||
      !Number.isFinite(p.z) ||
      !(p.parent === null || typeof p.parent === 'string')
    )
      return undefined;
    names.add(p.name);
  }
  const byName = new Map(r.parts.map((p) => [p.name, p]));
  for (const p of r.parts) {
    const seen = new Set([p.name]);
    let parent = p.parent;
    while (parent !== null) {
      if (seen.has(parent) || !byName.has(parent)) return undefined;
      seen.add(parent);
      parent = byName.get(parent)!.parent;
    }
  }
  return r;
}

/** Shared by the game, viewer and pivot hit testing. */
export function rigMatrices(rig: RigDefinition, state: RigState): Map<string, DOMMatrix> {
  const matrices = new Map<string, DOMMatrix>();
  const phase = state.time * 7;
  const angle = (p: RigPart): number => {
    const name = p.name.toLowerCase();
    const jaw = name.includes('jaw'),
      head = name.includes('head'),
      leg = name.includes('leg'),
      body = name.includes('body'),
      arm = name.includes('arm');
    switch (state.clip) {
      case 'windup':
        return jaw ? 0.26 : body ? -0.12 : head ? 0.08 : arm ? -0.18 : 0;
      case 'charge':
        return jaw
          ? 0.34
          : body
            ? 0.16
            : head
              ? -0.06
              : leg
                ? Math.sin(phase * 2 + (name.includes('back') ? Math.PI : 0)) * 0.22
                : 0;
      case 'roar':
        return jaw ? 0.48 : head ? -0.09 : body ? Math.sin(phase) * 0.025 : arm ? -0.12 : 0;
      case 'walk':
        return leg
          ? Math.sin(phase + (name.includes('back') ? Math.PI : 0)) * 0.16
          : arm
            ? Math.sin(phase + Math.PI) * 0.06
            : head
              ? Math.sin(phase) * 0.025
              : 0;
      default:
        return head ? Math.sin(state.time * 2) * 0.018 : 0;
    }
  };
  const byName = new Map(rig.parts.map((p) => [p.name, p]));
  const build = (p: RigPart): DOMMatrix => {
    const cached = matrices.get(p.name);
    if (cached) return cached;
    const local = new DOMMatrix()
      .translate(p.pivot[0], p.pivot[1])
      .rotate((angle(p) * 180) / Math.PI)
      .translate(-p.pivot[0], -p.pivot[1]);
    const matrix = p.parent ? build(byName.get(p.parent)!).multiply(local) : local;
    matrices.set(p.name, matrix);
    return matrix;
  };
  for (const p of rig.parts) build(p);
  return matrices;
}

/** All-or-nothing: missing/invalid parts return false before drawing any pixels. */
export function drawRig(
  ctx: CanvasRenderingContext2D,
  rig: RigDefinition,
  get: (key: string) => Sprite | undefined,
  x: number,
  y: number,
  width: number,
  state: RigState,
): boolean {
  const ordered = [...rig.parts].sort((a, b) => a.z - b.z);
  const sprites = ordered.map((p) => get(p.key));
  if (sprites.some((s) => !s || s.img.width !== rig.canvas[0] || s.img.height !== rig.canvas[1]))
    return false;
  const matrices = rigMatrices(rig, state),
    scale = width / rig.canvas[0];
  const anchor = rig.anchor ?? [0.5, 0.9],
    death = state.clip === 'death' ? Math.max(0, Math.min(1, state.progress ?? 0)) : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * (state.flip ?? 1), scale);
  if (death) {
    ctx.rotate(death * 0.9);
    ctx.globalAlpha *= 1 - death;
  }
  const breath = Math.sin(state.time * 2) * 0.008;
  ctx.scale(1 - breath, 1 + breath);
  ctx.translate(-rig.canvas[0] * anchor[0], -rig.canvas[1] * anchor[1]);
  if (state.clip === 'walk' || state.clip === 'charge')
    ctx.translate(0, -Math.abs(Math.sin(state.time * 7)) * rig.canvas[1] * 0.014);
  for (let i = 0; i < ordered.length; i++) {
    const matrix = matrices.get(ordered[i].name)!,
      sprite = sprites[i]!;
    ctx.save();
    ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
    ctx.drawImage(sprite.img, 0, 0);
    const flash = state.clip === 'hit' ? 0.8 : (state.flash ?? 0);
    if (flash > 0) {
      ctx.globalAlpha *= Math.min(1, flash);
      ctx.drawImage(sprite.white, 0, 0);
    }
    ctx.restore();
  }
  ctx.restore();
  return true;
}
