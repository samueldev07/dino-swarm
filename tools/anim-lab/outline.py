"""Hand-drawn dark outline for sprites: variable, organic thickness (not one even line).

usage: python outline.py <dir-or-file> [base_px=4] [seed=7]
Processes .webp/.png in place. The stroke is dark brown, wobbles in width along
the contour (smooth noise fixed to image coordinates, so animation frames that
share a crop do not flicker) and is heavier on the bottom-right (shadow side,
light comes from top-left). The canvas grows by a pad; clip.json / hero.json
anchors in the same folder are shifted by that pad.
"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage

INK = np.array([42, 29, 22], np.float32)


def smooth_noise(h, w, cell, seed):
    rng = np.random.default_rng(seed)
    gh, gw = h // cell + 3, w // cell + 3
    g = rng.random((gh, gw)).astype(np.float32)
    big = np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((gw * cell, gh * cell), Image.BICUBIC), np.float32) / 255
    return big[:h, :w]


def outline(im, base, seed):
    pad = int(base * 2.2) + 2
    a = np.asarray(im.convert('RGBA'), np.float32)
    H, W = a.shape[:2]
    A = np.zeros((H + 2 * pad, W + 2 * pad), np.float32); A[pad:pad + H, pad:pad + W] = a[..., 3] / 255
    rgb = np.zeros((H + 2 * pad, W + 2 * pad, 3), np.float32); rgb[pad:pad + H, pad:pad + W] = a[..., :3]
    inside = A > 0.5
    dist = ndimage.distance_transform_edt(~inside)
    n = smooth_noise(*A.shape, cell=max(6, int(base * 4)), seed=seed)
    # direction bias: thicker where the outside is to the bottom-right of the body
    sh = ndimage.shift(inside.astype(np.float32), (base * 0.9, base * 0.9), order=0) > 0.5
    width = base * (0.55 + 0.9 * n) + np.where(sh & ~inside, base * 0.6, 0)
    stroke = np.clip(width - dist + 0.5, 0, 1)            # anti-aliased edge
    stroke = np.maximum(stroke, A)                          # body stays solid
    out = np.zeros((*A.shape, 4), np.float32)
    # composite: ink behind, original art on top
    out[..., :3] = INK * (1 - A[..., None]) + rgb * A[..., None]
    out[..., 3] = stroke * 255
    return Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA'), pad


def main():
    target = sys.argv[1]
    base = float(sys.argv[2]) if len(sys.argv) > 2 else 4
    seed = int(sys.argv[3]) if len(sys.argv) > 3 else 7
    files = [target] if os.path.isfile(target) else sorted(
        os.path.join(target, f) for f in os.listdir(target) if f.endswith(('.webp', '.png')))
    pad = 0
    for f in files:
        im, pad = outline(Image.open(f), base, seed)
        if f.endswith('.webp'): im.save(f, 'WEBP', quality=88)
        else: im.save(f)
    folder = target if os.path.isdir(target) else os.path.dirname(target)
    for meta in ('clip.json', 'hero.json'):
        p = os.path.join(folder, meta)
        if not os.path.exists(p) or not pad: continue
        d = json.load(open(p))
        frames = d['frames'] if 'frames' in d else [fr for c in d['clips'].values() for fr in c]
        for fr in frames:
            fr['cx'] = round(fr['cx'] + pad, 1); fr['foot'] = round(fr['foot'] + pad, 1)
        json.dump(d, open(p, 'w'), indent=1)
    print(len(files), 'files, pad', pad)


if __name__ == '__main__':
    main()
