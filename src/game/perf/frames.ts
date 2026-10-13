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

/**
 * maxSide: frames are pre-scaled so their longest side is at most this many pixels. Drawing a
 * 300 px frame into a 70 px slot every frame is the main raster cost on phones; pre-scaling once
 * at load makes each draw near 1:1 and cuts atlas memory roughly by the square of the ratio.
 */
export async function loadAtlas(urls: string[], maxSide = 1e9): Promise<Texture[]> {
  if (!urls.length) return [];
  const images = await Promise.all(
    urls.map(async (src) => {
      const img = new Image();
      img.decoding = "async";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Could not load ${src}`));
        img.src = src;
      });
      // decode() can stall in hidden/background tabs: never let it block a clip from becoming ready.
      await Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 1500))]);
      return img;
    }),
  );
  const cols = Math.ceil(Math.sqrt(images.length));
  const big = Math.max(...images.map((i) => Math.max(i.naturalWidth, i.naturalHeight)));
  const k = Math.min(1, maxSide / big);
  // Transparent gutters keep filtering from picking up an adjacent frame.
  const cellW = Math.ceil(Math.max(...images.map((i) => i.naturalWidth)) * k) + 4;
  const cellH = Math.ceil(Math.max(...images.map((i) => i.naturalHeight)) * k) + 4;
  const atlas = document.createElement("canvas");
  atlas.width = cols * cellW;
  atlas.height = Math.ceil(images.length / cols) * cellH;
  const ctx = atlas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  const rects = images.map((img, i) => {
    const tx = (i % cols) * cellW + 2,
      ty = Math.floor(i / cols) * cellH + 2;
    const sw = Math.round(img.naturalWidth * k), sh = Math.round(img.naturalHeight * k);
    ctx.drawImage(img, tx, ty, sw, sh);
    return { width: img.naturalWidth, height: img.naturalHeight, tx, ty, sw, sh };
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
