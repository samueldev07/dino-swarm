/**
 * Full screen toggle for desktop browsers. Phones get no button: Poki's mobile player and the OS
 * already own that, and a stray tap there would be lost on browsers that refuse it.
 */
const root = document.documentElement;

export function canFullscreen(): boolean {
  return !!document.fullscreenEnabled && matchMedia('(pointer: fine)').matches;
}

export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}

/** Called from a tap handled in the frame loop: the browser's transient user activation still covers it. */
export function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  else void root.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}
