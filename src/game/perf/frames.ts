/** Pack decoded frames at their original resolution; shared textures avoid per-frame uploads. */
export interface Texture {
  width: number;
  height: number;
  tx: number;
  ty: number;
  raster: ImageBitmap | HTMLCanvasElement;
  white: HTMLCanvasElement;
}

export async function loadAtlas(urls: string[]): Promise<Texture[]> {
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
      await img.decode().catch(() => {});
      return img;
    }),
  );
  const cols = Math.ceil(Math.sqrt(images.length));
  // Transparent gutters keep filtering from picking up an adjacent frame.
  const cellW = Math.max(...images.map((i) => i.naturalWidth)) + 4;
  const cellH = Math.max(...images.map((i) => i.naturalHeight)) + 4;
  const atlas = document.createElement("canvas");
  atlas.width = cols * cellW;
  atlas.height = Math.ceil(images.length / cols) * cellH;
  const ctx = atlas.getContext("2d")!;
  const rects = images.map((img, i) => {
    const tx = (i % cols) * cellW + 2,
      ty = Math.floor(i / cols) * cellH + 2;
    ctx.drawImage(img, tx, ty);
    return { width: img.naturalWidth, height: img.naturalHeight, tx, ty };
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
