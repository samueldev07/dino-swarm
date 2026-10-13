type Ctx = CanvasRenderingContext2D;

export const FONT = '"Fredoka", system-ui, sans-serif';
export const DISPLAY = '"Lilita One", "Fredoka", system-ui, sans-serif';

/** Bold text at readable sizes uses the display face; small or light text stays Fredoka. */
export function fontFor(size: number, weight = 700): string {
  return weight >= 700 && size >= 16 ? `${size}px ${DISPLAY}` : `${weight} ${size}px ${FONT}`;
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
