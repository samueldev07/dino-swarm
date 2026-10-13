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

  constructor(private base = 'sprites/') {}

  async init(): Promise<void> {
    try {
      const res = await fetch(this.base + 'manifest.json', { cache: import.meta.env.DEV ? 'no-cache' : 'default' });
      if (!res.ok) return;
      const m = (await res.json()) as Manifest;
      this.files = m.files ?? {};
    } catch {
      /* no manifest: everything stays procedural */
    }
  }

  has(key: string): boolean {
    return key in this.files;
  }

  /** The image once decoded, else undefined (and the load is kicked off). */
  get(key: string): HTMLImageElement | undefined {
    if (this.ready.has(key)) return this.images.get(key);
    const file = this.files[key];
    if (!file || this.images.has(key)) return undefined;

    const img = new Image();
    img.decoding = 'async';
    // decode() can stall in hidden/background tabs: mark ready after onload + decode, or 1.2 s at most.
    img.onload = () => {
      void Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 1200))]).then(() => this.ready.add(key));
    };
    img.onerror = () => { delete this.files[key]; };
    img.src = this.base + file;
    this.images.set(key, img);
    return undefined;
  }

  /** Warm the cache for keys that are needed on the very first frames. */
  preload(keys: string[]): void {
    for (const k of keys) this.get(k);
  }
}
