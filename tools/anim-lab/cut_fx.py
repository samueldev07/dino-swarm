"""Green-screen effect video frames -> one-shot clip (soft key, edge vignette, haze cut).
usage: python cut_fx.py <frames_dir> <first> <last> <step> <out_dir> [maxpx=240]"""
import sys, os, json
import numpy as np
from PIL import Image
src, a0, a1, st, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
maxpx = int(sys.argv[6]) if len(sys.argv) > 6 else 240
def key(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    gm = g - np.maximum(r, b)
    al = np.clip(1 - (gm - 12) / 60, 0, 1); al = np.where(al < 0.3, 0, al)
    g2 = np.minimum(g, np.maximum(r, b) + 6)
    return np.dstack([r, g2, b, al * 255]).clip(0, 255).astype(np.uint8)
idx = list(range(a0, a1 + 1, st))
ims = [key(f'{src}/{i:03d}.png') for i in idx]
al = np.max([m[..., 3] for m in ims], axis=0); ys, xs = np.nonzero(al > 20)
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
# anchor = centre of mass of the opaque area over the clip (the impact point)
tot = np.sum([m[..., 3].astype(np.float32) for m in ims], axis=0); yy, xx = np.mgrid[0:tot.shape[0], 0:tot.shape[1]]
gx, gy = (tot * xx).sum() / tot.sum(), (tot * yy).sum() / tot.sum()
scale = min(1, maxpx / max(x1 - x0, y1 - y0))
os.makedirs(out, exist_ok=True)
for f in os.listdir(out): os.remove(os.path.join(out, f))
H, W = y1 - y0, x1 - x0; Y, X = np.mgrid[0:H, 0:W]
rr = np.sqrt(((X - W / 2) / (W * 0.5)) ** 2 + ((Y - H / 2) / (H * 0.5)) ** 2); vig = np.clip((1.05 - rr) / 0.2, 0, 1)
fr = []
for k, m in enumerate(ims):
    c = m[y0:y1, x0:x1].astype(np.float32); c[..., 3] *= vig
    im = Image.fromarray(c.astype(np.uint8), 'RGBA').resize((round(W * scale), round(H * scale)), Image.LANCZOS)
    fn = f'{k:02d}.webp'; im.save(os.path.join(out, fn), 'WEBP', quality=82)
    fr.append({'f': fn, 'cx': round((gx - x0) * scale, 1), 'foot': round((gy - y0) * scale, 1), 'k': round(1 / (W * scale), 6)})
json.dump({'fps': 24, 'frames': fr}, open(os.path.join(out, 'clip.json'), 'w'), indent=1)
print(out, len(fr), 'frames', sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out)) // 1024, 'KB')
