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
