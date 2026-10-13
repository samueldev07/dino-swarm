/** Opt-in frame meter. No timers, DOM nodes or sampling on the normal game path. */
export class FrameMeter {
  private panel = document.createElement("output");
  private samples: { frame: number; update: number; draw: number }[] = [];
  private last = 0;
  private displayed = 0;
  constructor() {
    this.panel.dataset.perf = "";
    this.panel.style.cssText =
      "position:fixed;top:4px;left:4px;z-index:99;pointer-events:none;background:#191611dd;color:#fff;font:11px monospace;padding:4px;white-space:pre";
    document.body.append(this.panel);
  }
  record(now: number, update: number, draw: number): void {
    if (this.last) {
      this.samples.push({ frame: now - this.last, update, draw });
      if (this.samples.length > 600) this.samples.shift();
    }
    this.last = now;
    if (now - this.displayed < 1000) return;
    this.displayed = now;
    const s = this.snapshot();
    this.panel.textContent = `${(1000 / s.frame.avg || 0).toFixed(0)} FPS | frame ${s.frame.avg.toFixed(1)} / p95 ${s.frame.p95.toFixed(1)} ms\nupdate ${s.update.avg.toFixed(1)} | draw ${s.draw.avg.toFixed(1)} ms`;
  }
  reset(): void {
    this.samples.length = 0;
    this.last = 0;
  }
  snapshot() {
    const stat = (key: "frame" | "update" | "draw") => {
      const a = this.samples.map((s) => s[key]).sort((a, b) => a - b);
      return {
        avg: a.reduce((n, x) => n + x, 0) / (a.length || 1),
        p95: a[Math.max(0, Math.ceil(a.length * 0.95) - 1)] ?? 0,
      };
    };
    return {
      count: this.samples.length,
      frame: stat("frame"),
      update: stat("update"),
      draw: stat("draw"),
    };
  }
}
