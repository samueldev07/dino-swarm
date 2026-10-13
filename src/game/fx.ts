import { INK, fontFor } from './draw';

type Ctx = CanvasRenderingContext2D;

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; color: string; gravity: number;
}

interface Floater {
  x: number; y: number; vy: number;
  life: number; max: number; text: string; color: string; size: number;
}

interface Shot {
  x: number; y: number; sx: number; sy: number; tx: number; ty: number;
  t: number; speed: number; color: string;
}

/**
 * Particles, floating numbers, tracer shots and screen shake.
 *
 * All four are capped. An idle game runs for hours in a background tab and
 * an uncapped particle array is the usual reason one slowly grinds to a halt.
 */
export class Fx {
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private shots: Shot[] = [];
  private shakeAmount = 0;
  private shakeTime = 0;

  shakeX = 0;
  shakeY = 0;

  private static readonly MAX_PARTICLES = 220;
  private static readonly MAX_FLOATERS = 28;
  private static readonly MAX_SHOTS = 60;

  burst(x: number, y: number, color: string, count = 12, power = 180): void {
    const room = Fx.MAX_PARTICLES - this.particles.length;
    for (let i = 0; i < Math.min(count, room); i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = power * (0.35 + Math.random() * 0.65);
      const life = 0.35 + Math.random() * 0.45;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life, max: life,
        size: 3 + Math.random() * 5,
        color, gravity: 420,
      });
    }
  }

  ring(x: number, y: number, color: string, count = 18, radius = 60): void {
    const room = Fx.MAX_PARTICLES - this.particles.length;
    for (let i = 0; i < Math.min(count, room); i++) {
      const a = (i / count) * Math.PI * 2;
      const life = 0.3 + Math.random() * 0.2;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * radius * 3,
        vy: Math.sin(a) * radius * 3,
        life, max: life,
        size: 3 + Math.random() * 3,
        color, gravity: 0,
      });
    }
  }

  floater(x: number, y: number, text: string, color = '#ffe28a', size = 26): void {
    if (this.floaters.length >= Fx.MAX_FLOATERS) this.floaters.shift();
    this.floaters.push({ x, y, vy: -70, life: 0.95, max: 0.95, text, color, size });
  }

  shot(sx: number, sy: number, tx: number, ty: number, color: string): void {
    if (this.shots.length >= Fx.MAX_SHOTS) return;
    this.shots.push({ x: sx, y: sy, sx, sy, tx, ty, t: 0, speed: 2.6, color });
  }

  shake(amount: number, duration = 0.3): void {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  /** Returns the shots that landed this frame, so the caller can react. */
  update(dt: number): number {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      if (f.life <= 0) { this.floaters.splice(i, 1); continue; }
      f.y += f.vy * dt;
      f.vy *= 0.94;
    }
    let landed = 0;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.t += dt * s.speed;
      if (s.t >= 1) { this.shots.splice(i, 1); landed++; continue; }
      // Slight arc: lerp, then lift the midpoint.
      s.x = s.sx + (s.tx - s.sx) * s.t;
      s.y = s.sy + (s.ty - s.sy) * s.t - Math.sin(s.t * Math.PI) * 48;
    }

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const k = Math.max(0, this.shakeTime) * this.shakeAmount;
      this.shakeX = (Math.random() - 0.5) * k * 12;
      this.shakeY = (Math.random() - 0.5) * k * 12;
      if (this.shakeTime <= 0) { this.shakeAmount = 0; this.shakeX = this.shakeY = 0; }
    }
    return landed;
  }

  draw(ctx: Ctx): void {
    for (const s of this.shots) {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life / p.max);
      ctx.fillStyle = p.color;
      const s = p.size * (p.life / p.max);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.floaters) {
      const k = f.life / f.max;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.font = fontFor(f.size);
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(4, f.size * 0.2);
      ctx.strokeStyle = INK;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
}
