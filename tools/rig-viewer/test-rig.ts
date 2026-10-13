/** Dev fixture: split the actual procedural boss. No shipped image assets. */
import { Assets } from '../../src/engine/assets';
import { Sprites, type Sprite } from '../../src/game/sprites';
import type { RigDefinition } from '../../src/game/rig';

export function testRig(): { rig: RigDefinition; sprites: Map<string, Sprite> } {
  const original = new Sprites(new Assets()).enemy('boss', 0),
    w = original.img.width,
    h = original.img.height;
  const source = document.createElement('canvas');
  source.width = w;
  source.height = h;
  const ctx = source.getContext('2d')!;
  ctx.drawImage(original.img, 0, 0);
  const raw = ctx.getImageData(0, 0, w, h),
    names = ['leg-back', 'body', 'head', 'jaw', 'arm', 'leg-front'];
  const buffers = names.map(() => ctx.createImageData(w, h));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const n =
        y > h * 0.73
          ? x < w * 0.5
            ? 0
            : 5
          : x > w * 0.8 && y > h * 0.6
            ? 4
            : x > w * 0.47 && y > h * 0.55 && y < h * 0.7
              ? 3
              : x > w * 0.4 && y < h * 0.63
                ? 2
                : 1;
      const i = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) buffers[n].data[i + c] = raw.data[i + c];
    }
  const sprites = new Map<string, Sprite>();
  names.forEach((name, i) => {
    const img = document.createElement('canvas');
    img.width = w;
    img.height = h;
    img.getContext('2d')!.putImageData(buffers[i], 0, 0);
    const white = document.createElement('canvas');
    white.width = w;
    white.height = h;
    const c = white.getContext('2d')!;
    c.drawImage(img, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = '#fff';
    c.fillRect(0, 0, w, h);
    sprites.set('test-boss-' + name, { img, white, w, h, ax: 0.5, ay: 0.9 });
  });
  const rig: RigDefinition = {
    canvas: [w, h],
    anchor: [0.5, 0.9],
    parts: [
      {
        name: 'leg-back',
        key: 'test-boss-leg-back',
        pivot: [w * 0.31, h * 0.72],
        parent: 'body',
        z: 0,
      },
      { name: 'body', key: 'test-boss-body', pivot: [w * 0.5, h * 0.82], parent: null, z: 1 },
      { name: 'head', key: 'test-boss-head', pivot: [w * 0.56, h * 0.37], parent: 'body', z: 2 },
      { name: 'jaw', key: 'test-boss-jaw', pivot: [w * 0.52, h * 0.57], parent: 'head', z: 3 },
      { name: 'arm', key: 'test-boss-arm', pivot: [w * 0.8, h * 0.6], parent: 'body', z: 4 },
      {
        name: 'leg-front',
        key: 'test-boss-leg-front',
        pivot: [w * 0.7, h * 0.72],
        parent: 'body',
        z: 5,
      },
    ],
  };
  return { rig, sprites };
}
