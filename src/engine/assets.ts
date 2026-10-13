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
  slices?: Record<string, [number, number, number, number]>;
  rigs?: Record<string, string>;
}

export type SliceInsets = [number, number, number, number];

export class Assets {
  private files: Record<string, string> = {};
  private images = new Map<string, HTMLImageElement>();
  private ready = new Set<string>();
  private slices: Record<string, SliceInsets> = {};
  private rigs: Record<string, string> = {};
  private json = new Map<string, unknown>();
  private requestedJSON = new Set<string>();

  constructor(private base = 'sprites/') {}

  async init(): Promise<void> {
    try {
      const res = await fetch(this.base + 'manifest.json', { cache: 'no-cache' });
      if (!res.ok) return;
      const m = (await res.json()) as Manifest;
      const record = (value: unknown): Record<string, string> => Object.fromEntries(Object.entries(value && typeof value === 'object' ? value : {}).filter(([, v]) => typeof v === 'string'));
      this.files = record(m.files);
      this.rigs = record(m.rigs);
      for (const [key, value] of Object.entries(m.slices ?? {})) {
        if (Array.isArray(value) && value.length === 4 && value.every(v => Number.isFinite(v) && v >= 0)) this.slices[key] = value;
      }
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
    img.onload = () => this.ready.add(key);
    img.onerror = () => { delete this.files[key]; };
    img.src = this.base + file;
    this.images.set(key, img);
    return undefined;
  }

  /** Warm the cache for keys that are needed on the very first frames. */
  preload(keys: string[]): void {
    for (const k of keys) this.get(k);
  }

  slice(key: string): SliceInsets | undefined { return this.slices[key]; }

  /** Optional JSON is fetched once; malformed/missing rigs retain the full sprite. */
  getRig(key: string): unknown {
    if (this.json.has(key)) return this.json.get(key);
    const file = this.rigs[key];
    if (!file || this.requestedJSON.has(key)) return undefined;
    this.requestedJSON.add(key);
    void fetch(this.base + file).then(async res => {
      if (res.ok) this.json.set(key, await res.json());
    }).catch(() => { /* keep sprite fallback */ });
    return undefined;
  }

  /** Used by the dev viewer and by callers that need an entire rig ready together. */
  async warm(keys: string[]): Promise<void> {
    await Promise.all(keys.map(async key => {
      this.get(key);
      const img = this.images.get(key);
      if (img) try { await img.decode(); this.ready.add(key); } catch { /* fallback */ }
    }));
  }
}
