import type { Stage } from './canvas';

export interface Pointer {
  x: number;
  y: number;
  /** Where the current press started, for drag thresholds. */
  downX: number;
  downY: number;
  down: boolean;
  /** True for exactly one frame. */
  justDown: boolean;
  justUp: boolean;
  /** Press that never moved far enough to count as a drag. */
  wasTap: boolean;
}

const TAP_SLOP = 12;

/**
 * One unified pointer in virtual coordinates. Only the primary pointer is
 * tracked -- this game has no gesture that needs a second finger, and
 * ignoring extra touches avoids the classic "palm on the screen" bug.
 */
export class Input {
  readonly p: Pointer = {
    x: 0, y: 0, downX: 0, downY: 0,
    down: false, justDown: false, justUp: false, wasTap: false,
  };
  /** Resolves once the user has interacted, which unlocks WebAudio. */
  readonly firstGesture: Promise<void>;

  private activeId: number | null = null;
  private signalGesture!: () => void;

  constructor(private stage: Stage) {
    this.firstGesture = new Promise((res) => { this.signalGesture = res; });
    const c = stage.canvas;
    c.addEventListener('pointerdown', this.onDown, { passive: false });
    window.addEventListener('pointermove', this.onMove, { passive: false });
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    // Stop iOS Safari from offering to select / magnify the canvas.
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private toVirtual(e: PointerEvent): { x: number; y: number } {
    const s = this.stage.view.scale;
    return { x: e.clientX / s, y: e.clientY / s };
  }

  private onDown = (e: PointerEvent) => {
    if (this.activeId !== null) return;
    e.preventDefault();
    this.activeId = e.pointerId;
    const { x, y } = this.toVirtual(e);
    const p = this.p;
    p.x = p.downX = x;
    p.y = p.downY = y;
    p.down = true;
    p.justDown = true;
    this.signalGesture();
  };

  private onMove = (e: PointerEvent) => {
    if (e.pointerId !== this.activeId) return;
    e.preventDefault();
    const { x, y } = this.toVirtual(e);
    this.p.x = x;
    this.p.y = y;
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.activeId) return;
    this.activeId = null;
    const p = this.p;
    p.down = false;
    p.justUp = true;
    p.wasTap = Math.hypot(p.x - p.downX, p.y - p.downY) < TAP_SLOP;
  };

  /** Call at the end of every frame, after all systems have read the pointer. */
  endFrame(): void {
    this.p.justDown = false;
    this.p.justUp = false;
  }
}
