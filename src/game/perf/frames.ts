/** Pack decoded frames at their original resolution; shared textures avoid per-frame uploads. */
export interface Texture {
  width: number;
  height: number;
  tx: number;
  ty: number;
  /** Size of the (possibly downscaled) rect inside the atlas. width/height stay in source pixels for anchors. */
  sw: number;
  sh: number;
  raster: ImageBitmap | HTMLCanvasElement;
  white: HTMLCanvasElement;
}

export interface PackedAtlas {
  version: number;
  file: string;
  width: number;
  height: number;
  hash?: string;
  frames: Record<string, { x: number; y: number; w: number; h: number }>;
}
export interface AtlasSource {
  base: string;
  atlas?: PackedAtlas;
}

export async function animationJSON<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      cache: import.meta.env.DEV ? "no-cache" : "default",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Could not load ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function decodedImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      img.src = "";
      reject(new Error(`Timed out loading ${src}`));
    }, 15000);
    img.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`Could not load ${src}`));
    };
    img.src = src;
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    img.decode().catch(() => {}),
    new Promise((resolve) => {
      timer = setTimeout(resolve, 1500);
    }),
  ]);
  clearTimeout(timer);
  return img;
}

async function textureOf(
  source: HTMLImageElement | HTMLCanvasElement,
  rects: Omit<Texture, "raster" | "white">[],
): Promise<Texture[]> {
  const white = document.createElement("canvas");
  white.width =
    source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  white.height =
    source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const ctx = white.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  let raster: Texture["raster"];
  try {
    raster = await createImageBitmap(source);
  } catch {
    if (source instanceof HTMLCanvasElement) raster = source;
    else {
      const copy = document.createElement("canvas");
      copy.width = white.width;
      copy.height = white.height;
      copy.getContext("2d")!.drawImage(source, 0, 0);
      raster = copy;
    }
  }
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, white.width, white.height);
  return rects.map((rect) => ({ ...rect, raster, white }));
}

async function packedTextures(
  urls: string[],
  maxSide: number,
  source: AtlasSource,
): Promise<Texture[]> {
  const a = source.atlas!;
  if (
    a.version !== 1 ||
    !a.file ||
    a.file.includes("..") ||
    /[:\\]/.test(a.file) ||
    !Number.isInteger(a.width) ||
    !Number.isInteger(a.height) ||
    a.width < 1 ||
    a.height < 1 ||
    a.width > 4096 ||
    a.height > 4096
  )
    throw new Error("Invalid atlas");
  const rects = urls.map((url) => {
    const r = a.frames?.[url.slice(source.base.length)];
    if (
      !r ||
      ![r.x, r.y, r.w, r.h].every(Number.isInteger) ||
      r.x < 0 ||
      r.y < 0 ||
      r.w < 1 ||
      r.h < 1 ||
      r.x + r.w > a.width ||
      r.y + r.h > a.height
    )
      throw new Error("Invalid atlas rect");
    return r;
  });
  const img = await decodedImage(
    source.base + a.file + (a.hash ? `?v=${a.hash.slice(0, 12)}` : ""),
  );
  if (img.naturalWidth !== a.width || img.naturalHeight !== a.height)
    throw new Error("Atlas dimensions do not match JSON");
  const k = Math.min(
    1,
    maxSide / Math.max(...rects.map((r) => Math.max(r.w, r.h))),
  );
  if (k === 1) {
    // Hero, jab and large enemies use the shipped texture directly: no runtime frame packing.
    return textureOf(
      img,
      rects.map((r) => ({
        width: r.w,
        height: r.h,
        tx: r.x,
        ty: r.y,
        sw: r.w,
        sh: r.h,
      })),
    );
  }
  // Preserve the existing high-quality per-frame downsampling and rounded sizes on phones.
  const cols = Math.ceil(Math.sqrt(rects.length));
  const cellW = Math.ceil(Math.max(...rects.map((r) => r.w)) * k) + 4;
  const cellH = Math.ceil(Math.max(...rects.map((r) => r.h)) * k) + 4;
  const canvas = document.createElement("canvas");
  canvas.width = cols * cellW;
  canvas.height = Math.ceil(rects.length / cols) * cellH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  const scaled = rects.map((r, i) => {
    const tx = (i % cols) * cellW + 2,
      ty = Math.floor(i / cols) * cellH + 2;
    const sw = Math.round(r.w * k),
      sh = Math.round(r.h * k);
    ctx.drawImage(img, r.x, r.y, r.w, r.h, tx, ty, sw, sh);
    return { width: r.w, height: r.h, tx, ty, sw, sh };
  });
  return textureOf(canvas, scaled);
}

/**
 * maxSide: frames are pre-scaled so their longest side is at most this many pixels. Drawing a
 * 300 px frame into a 70 px slot every frame is the main raster cost on phones; pre-scaling once
 * at load makes each draw near 1:1 and cuts atlas memory roughly by the square of the ratio.
 */
export async function loadAtlas(
  urls: string[],
  maxSide = 1e9,
  source?: AtlasSource,
): Promise<Texture[]> {
  if (!urls.length) return [];
  if (source?.atlas) {
    try {
      return await packedTextures(urls, maxSide, source);
    } catch {
      /* Missing/stale atlas: the development pipeline's loose frames still work. */
    }
  }
  const images = await Promise.all(urls.map(decodedImage));
  const cols = Math.ceil(Math.sqrt(images.length));
  const big = Math.max(
    ...images.map((i) => Math.max(i.naturalWidth, i.naturalHeight)),
  );
  const k = Math.min(1, maxSide / big);
  // Transparent gutters keep filtering from picking up an adjacent frame.
  const cellW =
    Math.ceil(Math.max(...images.map((i) => i.naturalWidth)) * k) + 4;
  const cellH =
    Math.ceil(Math.max(...images.map((i) => i.naturalHeight)) * k) + 4;
  const atlas = document.createElement("canvas");
  atlas.width = cols * cellW;
  atlas.height = Math.ceil(images.length / cols) * cellH;
  const ctx = atlas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  const rects = images.map((img, i) => {
    const tx = (i % cols) * cellW + 2,
      ty = Math.floor(i / cols) * cellH + 2;
    const sw = Math.round(img.naturalWidth * k),
      sh = Math.round(img.naturalHeight * k);
    ctx.drawImage(img, tx, ty, sw, sh);
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      tx,
      ty,
      sw,
      sh,
    };
  });
  const white = document.createElement("canvas");
  white.width = atlas.width;
  white.height = atlas.height;
  const mask = white.getContext("2d")!;
  mask.drawImage(atlas, 0, 0);
  mask.globalCompositeOperation = "source-in";
  mask.fillStyle = "#fff";
  mask.fillRect(0, 0, white.width, white.height);
  let raster: Texture["raster"];
  try {
    raster = await createImageBitmap(atlas);
  } catch {
    raster = atlas;
  }
  return rects.map((rect) => ({ ...rect, raster, white }));
}
