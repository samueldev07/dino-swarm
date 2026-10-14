/** Prioritise the selected zone's opening art; constructors can register later art without downloading it. */
export const ZONE_CLIPS = [
  [
    ["gnome", 150],
    ["bat", 140],
    ["boarorc", 220],
    ["orc", 180],
    ["troll", 300],
    ["goblin", 170],
    ["ogre", 400],
  ],
  [
    ["z2-froglet", 150],
    ["z2-moth", 140],
    ["z2-toadrider", 220],
    ["z2-frogman", 180],
    ["troll", 300],
    ["z2-imp", 170],
    ["z2-orcboss", 400],
  ],
] as const;
export function zoneClips(
  zone: number,
): readonly (readonly [string, number])[] {
  return ZONE_CLIPS[zone === 1 ? 1 : 0];
}

interface Job {
  key: string;
  critical?: boolean;
  state: "waiting" | "running" | "done";
  settled: Promise<void>;
  run: () => Promise<void>;
}
export class LoadingPlan {
  private jobs: Job[] = [];
  private active = 0;
  private background = false;
  private openBackground!: () => void;
  readonly backgroundStarted = new Promise<void>((resolve) => {
    this.openBackground = resolve;
  });
  blocked = true;
  constructor(public zone: number) {}

  private priority(key: string): number {
    if (key.startsWith("critical:")) return -40;
    if (key.startsWith("hero/")) return -30;
    if (key.startsWith("anim/arc/")) return -20;
    if (key.startsWith("anim/")) {
      const name = key.split("/")[1];
      const i = zoneClips(this.zone).findIndex(([n]) => n === name);
      if (i >= 0) return i < 2 ? -10 : i - 1;
      const effect = ["dog", "flask", "slam", "meteor"].indexOf(name);
      return effect < 0 ? 50 : 10 + effect;
    }
    if (key.startsWith("sprite:enemy-")) {
      const kind = key.slice(13).split("-")[0];
      const i = [
        "grub",
        "bat",
        "wolf",
        "beetle",
        "brute",
        "shroom",
        "boss",
      ].indexOf(kind);
      return i < 0 ? 20 : i < 2 ? -5 : i - 1;
    }
    return 20;
  }

  enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
    let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
    const result = new Promise<T>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    const job: Job = {
      key,
      state: "waiting",
      settled: result.then(
        () => {},
        () => {},
      ),
      run: async () => {
        try {
          resolve(await task());
        } catch (e) {
          reject(e);
        } finally {
          job.state = "done";
          this.active--;
          this.pump();
        }
      },
    };
    this.jobs.push(job);
    this.pump();
    return result;
  }

  private pump(): void {
    const limit = this.blocked ? 6 : 1;
    while (this.active < limit) {
      const priority = (j: Job) => (j.critical ? -40 : this.priority(j.key));
      const waiting = this.jobs.filter(
        (j) =>
          j.state === "waiting" &&
          (!this.background || this.blocked
            ? priority(j) <= 0
            : priority(j) < 50),
      );
      waiting.sort((a, b) => priority(a) - priority(b));
      const job = waiting[0];
      if (!job) return;
      job.state = "running";
      this.active++;
      void job.run();
    }
  }

  async waitCritical(): Promise<void> {
    // Include work registered by constructors while the first batch is finishing.
    while (true) {
      const batch = this.jobs.filter(
        (j) => j.critical || this.priority(j.key) <= 0,
      );
      await Promise.all(batch.map((j) => j.settled));
      if (
        this.jobs.every(
          (j) =>
            (!j.critical && this.priority(j.key) > 0) || j.state === "done",
        )
      )
        return;
    }
  }
  startBackground(): void {
    this.background = true;
    this.openBackground();
    this.pump();
  }
  selectZone(zone: number): void {
    this.zone = zone;
    this.blocked = true;
    this.pump();
  }
  resume(): void {
    this.blocked = false;
    this.pump();
  }
  promote(key: string): void {
    for (const j of this.jobs) if (j.key === key) j.critical = true;
    this.pump();
  }
  snapshot() {
    return {
      zone: this.zone,
      blocked: this.blocked,
      jobs: this.jobs.map(({ key, state }) => ({ key, state })),
    };
  }
}

let plan: LoadingPlan | null = null;
export function configureLoading(zone: number): LoadingPlan {
  return (plan = new LoadingPlan(zone));
}
export function scheduleLoad<T>(
  key: string,
  task: () => Promise<T>,
): Promise<T> {
  return plan ? plan.enqueue(key, task) : task();
}
export function afterBoot(): Promise<void> {
  return plan?.backgroundStarted ?? Promise.resolve();
}

/** One bounded unit of optional preparation per idle callback, with a hidden-tab fallback. */
export function idleEach<T>(items: T[], work: (item: T) => void): void {
  let i = 0;
  const next = () => {
    if (i === items.length) return;
    const run = () => {
      work(items[i++]);
      next();
    };
    if (typeof window.requestIdleCallback === "function")
      window.requestIdleCallback(run, { timeout: 250 });
    else setTimeout(run, 4);
  };
  next();
}
