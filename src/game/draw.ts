type Ctx = CanvasRenderingContext2D;

// Folk fairy-tale type (matches art/ui-folk): small-caps serif for titles/buttons, book serif for text.
export const FONT = '"Alegreya", Georgia, serif';
export const DISPLAY = '"Alegreya SC", "Alegreya", Georgia, serif';

/** Bold text at readable sizes uses the display face; small or light text stays Fredoka. */
export function fontFor(size: number, weight = 700): string {
  return weight >= 700 && size >= 16 ? `800 ${size}px ${DISPLAY}` : `${Math.max(500, weight)} ${size}px ${FONT}`;
}
/** Outline colour of the hand-drawn style (ART-DIRECTION.md §2). */
export const INK = '#2a1d16';

export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/**
 * Hand-inked ellipse (matches the game's brush-pen outlines): the radius wobbles a little,
 * the stroke is drawn twice with a slight offset so the line thickens and thins like a pen,
 * and it does not close perfectly. `seed` keeps the wobble stable per object.
 */
export function inkEllipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, seed: number, width = 3, color = INK): void {
  const n = 28;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    ctx.lineWidth = width * (pass ? 0.55 : 1);
    ctx.beginPath();
    const start = (seed % 7) * 0.4 + pass * 0.3, end = start + Math.PI * 2 * (pass ? 0.92 : 1.03);
    for (let i = 0; i <= n; i++) {
      const a = start + ((end - start) * i) / n;
      const wob = 1 + 0.035 * Math.sin(a * 3 + seed * 1.7 + pass) + 0.02 * Math.sin(a * 7 + seed);
      const px = x + Math.cos(a) * rx * wob + (pass ? 1.2 : 0), py = y + Math.sin(a) * ry * wob + (pass ? 0.8 : 0);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}
