/**
 * Optional sprite layer.
 *
 * `sprites/manifest.json` (written by tools/prep_sprites.py) lists the art
 * that actually exists. Anything not listed simply returns undefined and the
 * caller draws its procedural fallback -- so art can land one file at a
 * time and the game never shows a broken image or fires a 404.
 *
 * Images load lazily on first request: the player only downloads the
 * backgrounds of worlds they have reached.
 */
interface Manifest {
  files: Record<string, string>;
}

export class Assets {
  private files: Record<string, string> = {};
  private images = new Map<string, HTMLImageElement>();
  private ready = new Set<string>();
  private loads = new Map<string, Promise<void>>();
  onZoneRequested: ((zone: number) => void) | null = null;
  onGet: ((key: string) => void) | null = null;
  onCriticalRequested: ((key: string) => void) | null = null;

  constructor(
    private base = "sprites/",
    private enqueue: (
      key: string,
      task: () => Promise<void>,
    ) => Promise<void> = (_key, task) => task(),
  ) {}

  async init(): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(this.base + "manifest.json", {
        cache: import.meta.env.DEV ? "no-cache" : "default",
        signal: controller.signal,
      });
      if (!res.ok) return;
      const m = (await res.json()) as Manifest;
      this.files = m.files ?? {};
    } catch {
      /* no manifest: everything stays procedural */
    } finally {
      clearTimeout(timer);
    }
  }

  has(key: string): boolean {
    return key in this.files;
  }
  isReady(key: string): boolean {
    return !this.has(key) || this.ready.has(key);
  }

  /** The image once decoded, else undefined (and the load is kicked off). */
  get(key: string): HTMLImageElement | undefined {
    this.onGet?.(key);
    if (key.startsWith("ground-")) this.onZoneRequested?.(Number(key.slice(7)));
    if (this.ready.has(key)) return this.images.get(key);
    void this.request(key);
    return undefined;
  }

  private request(key: string, critical = false): Promise<void> {
    if (critical) this.onCriticalRequested?.(key);
    const pending = this.loads.get(key);
    if (pending) return pending;
    const file = this.files[key];
    if (!file) return Promise.resolve();
    const img = new Image();
    img.decoding = "async";
    this.images.set(key, img);
    const result = this.enqueue(
      (critical ? "critical:" : "") + "sprite:" + key,
      async () => {
        try {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
              img.src = "";
              reject(new Error("Image load timed out"));
            }, 15000);
            img.onload = () => {
              clearTimeout(timer);
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timer);
              reject(new Error("Image load failed"));
            };
            img.src = this.base + file;
          });
          let timer: ReturnType<typeof setTimeout> | undefined;
          await Promise.race([
            img.decode().catch(() => {}),
            new Promise((resolve) => {
              timer = setTimeout(resolve, 1200);
            }),
          ]);
          clearTimeout(timer);
          this.ready.add(key);
        } catch {
          delete this.files[key];
        }
      },
    );
    this.loads.set(key, result);
    return result;
  }

  /** Warm the cache for keys that are needed on the very first frames. */
  preload(keys: string[], critical = false): Promise<void> {
    return Promise.all(keys.map((k) => this.request(k, critical))).then(
      () => {},
    );
  }
}
