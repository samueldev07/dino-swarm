"""Remove light halos left by white/green-screen cut-outs.
usage: python defringe.py <file-or-dir> [...]
For every edge pixel (partly transparent, or opaque but bordering transparency) whose colour is
lighter than the solid pixels just inside it, the colour is replaced by that inner colour and the
alpha is pulled in by ~1px, so the sprite keeps its soft edge but loses the white rim."""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage

def fix(path):
    im = Image.open(path).convert('RGBA'); a = np.asarray(im).astype(np.float32)
    al = a[..., 3]
    solid = al > 250
    inner = ndimage.binary_erosion(solid, iterations=2)
    # nearest inner pixel colour for every pixel
    _, (iy, ix) = ndimage.distance_transform_edt(~inner, return_indices=True)
    near = a[iy, ix, :3]
    edge = (al > 0) & ~inner
    lum = a[..., :3].mean(-1); nlum = near.mean(-1)
    light = edge & (lum > nlum + 12)
    a[..., :3] = np.where(light[..., None], near, a[..., :3])
    # pull alpha in by one pixel on the outer ring
    ring = (al > 0) & ~ndimage.binary_erosion(al > 0, iterations=1)
    a[..., 3] = np.where(ring, al * 0.35, al)
    out = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
    if path.endswith('.webp'): out.save(path, 'WEBP', quality=88)
    else: out.save(path)
    return int(light.sum())

for t in sys.argv[1:]:
    files = [t] if os.path.isfile(t) else [os.path.join(t, f) for f in sorted(os.listdir(t)) if f.endswith(('.webp', '.png'))]
    n = sum(fix(f) for f in files)
    print(t, len(files), 'files, light edge px fixed:', n)
