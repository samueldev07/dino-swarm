/** Pose B: all pose images share one canvas/feet anchor. Timing is visual only. */
export type PlayerPose = 'idle' | 'run' | 'bite';
export class PlayerAnim {
  private biteUntil = -Infinity;
  bite(time: number): void {
    this.biteUntil = time + 0.14;
  }
  sample(
    time: number,
    speed: number,
    moving: boolean,
    facing: number,
    reduced = false,
  ): { pose: PlayerPose; bob: number; squash: number; lean: number } {
    const rate = 6 + 2 * Math.min(1, Math.max(0, speed) / 300);
    const phase = time * rate * Math.PI * 2;
    return {
      pose: time < this.biteUntil ? 'bite' : moving && Math.sin(phase) > 0 ? 'run' : 'idle',
      bob: reduced ? 0 : moving ? Math.abs(Math.sin(phase)) * 3 : Math.sin(time * 2.2) * 1.2,
      squash: reduced ? 0 : moving ? Math.sin(phase * 2) * 0.035 : Math.sin(time * 2.2) * 0.012,
      lean: reduced ? 0 : moving ? facing * 0.045 : 0,
    };
  }
}
