export type Tick = (dt: number, now: number) => void;

/**
 * requestAnimationFrame loop with dt clamped to 50ms. The clamp matters:
 * a backgrounded tab resumes with a multi-second delta that would teleport
 * every creature across the board.
 */
export function startLoop(tick: Tick): () => void {
  let last = performance.now();
  let raf = 0;
  let running = true;

  const frame = (now: number) => {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    // Schedule first: one bad frame must never stop the game for good.
    raf = requestAnimationFrame(frame);
    try { tick(dt, now); } catch (err) { console.error(err); }
  };
  raf = requestAnimationFrame(frame);

  // Resync on tab return so the clamp above never has to fire.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) last = performance.now();
  });

  return () => {
    running = false;
    cancelAnimationFrame(raf);
  };
}
