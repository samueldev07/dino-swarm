interface Prop {
  key: string;
  w: number;
  x: number;
  y: number;
  flip: boolean;
  rot: number;
}
const LAYERS: {
  cell: number;
  chance: number;
  salt: number;
  items: [string, number][];
  spin?: boolean;
}[] = [
  {
    // Fallen leaves, cut from the ground painting itself and scattered (the tile is leafless so
    // its seams stay invisible; loose leaves never repeat on the tile grid).
    cell: 170,
    chance: 0.45,
    salt: 31,
    spin: true,
    items: [["leaf-0", 30], ["leaf-1", 34], ["leaf-2", 28], ["leaf-3", 32], ["leaf-4", 26], ["leaf-5", 28]],
  },
  {
    // Sparse: owner found the second decor batch ugly and too dense (13/10).
    cell: 700,
    chance: 0.3,
    salt: 97,
    items: [
      ["prop-stump-large", 150],
      ["prop-mossy-rock", 100],
      ["prop-roots-mound", 130],
      ["prop-stump-twisted", 135],
    ],
  },
];

/** Only retain the current visible cell rectangle, so travelling cannot grow the cache. */
export class PropScatter {
  private cached = LAYERS.map(() => ({
    x0: NaN,
    x1: NaN,
    y0: NaN,
    y1: NaN,
    props: [] as Prop[],
  }));
  draw(
    ctx: CanvasRenderingContext2D,
    L: number,
    R: number,
    T: number,
    B: number,
    image: (key: string) => HTMLImageElement | undefined,
  ): void {
    for (let i = 0; i < LAYERS.length; i++) {
      const ly = LAYERS[i],
        c = this.cached[i],
        C = ly.cell;
      const x0 = Math.floor(L / C) - 1,
        x1 = Math.floor(R / C) + 1;
      const y0 = Math.floor(T / C) - 1,
        y1 = Math.floor(B / C) + 1;
      if (x0 !== c.x0 || x1 !== c.x1 || y0 !== c.y0 || y1 !== c.y1) {
        c.x0 = x0;
        c.x1 = x1;
        c.y0 = y0;
        c.y1 = y1;
        c.props.length = 0;
        for (let cx = x0; cx <= x1; cx++)
          for (let cy = y0; cy <= y1; cy++) {
            let h = (cx * 73856093) ^ (cy * 19349663) ^ (ly.salt * 83492791);
            h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
            h ^= h >>> 15;
            const r = (h >>> 0) / 4294967296;
            if (r > ly.chance) continue;
            const [key, w] = ly.items[Math.floor(r * 10007) % ly.items.length];
            c.props.push({
              key,
              w,
              x: cx * C + (((h >>> 8) & 255) / 255) * C * 0.8,
              y: cy * C + (((h >>> 16) & 255) / 255) * C * 0.8,
              flip: !!(h & 1),
              rot: ly.spin ? (((h >>> 4) & 1023) / 1023) * Math.PI * 2 : 0,
            });
          }
      }
      for (const p of c.props) {
        // Keep querying ready assets so late arrivals still appear on an unmoving camera.
        const img = image(p.key);
        if (!img) continue;
        const h = (p.w * img.naturalHeight) / img.naturalWidth;
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.flip) ctx.scale(-1, 1);
        if (p.rot) { ctx.rotate(p.rot); ctx.drawImage(img, -p.w / 2, -h / 2, p.w, h); }
        else ctx.drawImage(img, -p.w / 2, -h * 0.8, p.w, h);
        ctx.restore();
      }
    }
  }
}
