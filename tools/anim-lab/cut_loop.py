"""Enemy video (white bg, static camera) -> seamless loop of clean frames.
usage: python cut_loop.py video.mp4 out_dir [min_len max_len]"""
import sys, os, json
import numpy as np, cv2
from PIL import Image, ImageFilter
from scipy import ndimage
src, out = sys.argv[1], sys.argv[2]
lo, hi = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (6, 14)
cap = cv2.VideoCapture(src); frames = []; i = 0
while True:
    ok, f = cap.read()
    if not ok: break
    if i % 2 == 0: frames.append(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
    i += 1
small = [np.asarray(Image.fromarray(f).convert('L').resize((108, 192)), np.float32) for f in frames]
best = None
for s in range(len(frames) // 4, len(frames) * 3 // 4):
    for L in range(lo, hi + 1):
        if s + L >= len(frames): continue
        d = np.abs(small[s] - small[s + L]).mean() + 0.02 * L
        if best is None or d < best[0]: best = (d, s, L)
_, s0, L = best
def cut(a):
    a16 = a.astype(np.int16)
    white = (a16.min(axis=2) > 214) & ((a16.max(axis=2) - a16.min(axis=2)) < 26)
    lab, n = ndimage.label(white)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(n + 1))
    keep_out = [i for i in range(1, n + 1) if i in edge or sizes[i] >= 120]
    bg = np.isin(lab, keep_out)
    al = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    im = Image.fromarray(a).convert('RGBA'); im.putalpha(al); return im
ims = [cut(frames[k]) for k in range(s0, s0 + L)]
boxes = [im.getchannel('A').point(lambda v: 255 if v > 60 else 0).getbbox() for im in ims]
ux0 = min(b[0] for b in boxes); uy0 = min(b[1] for b in boxes); ux1 = max(b[2] for b in boxes); uy1 = max(b[3] for b in boxes)
cx = (boxes[0][0] + boxes[0][2]) / 2; foot = max(b[3] for b in boxes)
refw = float(np.median([b[2] - b[0] for b in boxes]))
scale = min(1, 260 / max(ux1 - ux0, uy1 - uy0))
os.makedirs(out, exist_ok=True)
for f in os.listdir(out): os.remove(os.path.join(out, f))
fr = []
for k, im in enumerate(ims):
    c = im.crop((ux0, uy0, ux1, uy1)).resize((round((ux1 - ux0) * scale), round((uy1 - uy0) * scale)), Image.LANCZOS)
    fn = f'{k:02d}.webp'; c.save(os.path.join(out, fn), 'WEBP', quality=86)
    fr.append({'f': fn, 'cx': round((cx - ux0) * scale, 1), 'foot': round((foot - uy0) * scale, 1), 'k': round(1 / (refw * scale), 6)})
json.dump({'fps': 12, 'frames': fr}, open(os.path.join(out, 'clip.json'), 'w'), indent=1)
print(src, 'loop start', s0, 'len', L, 'KB', sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out)) // 1024)
