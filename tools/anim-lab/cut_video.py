"""Video frames (white bg) -> clean transparent hero frames + hero.json.
Removes the outer background by flood fill AND enclosed white gaps (between
hand and club, arm and body) below the head; eyes/teeth/hair bone are kept."""
import glob, json, os, collections, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

def cut(path):
    im = Image.open(path).convert('RGB'); a = np.asarray(im).astype(np.int16)
    white = (a.min(axis=2) > 214) & ((a.max(axis=2) - a.min(axis=2)) < 26)
    lab, n = ndimage.label(white)
    H, W = white.shape
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    fig = ~bg
    ys, xs = np.nonzero(fig)
    top, bot = ys.min(), ys.max()
    head_line = top + (bot - top) * 0.36
    sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(n + 1))
    cy = ndimage.center_of_mass(np.ones_like(lab), lab, index=np.arange(n + 1))
    for i in range(1, n + 1):
        if i in edge or sizes[i] < 40: continue
        if cy[i][0] > head_line: bg |= (lab == i)
    al = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert('RGBA'); out.putalpha(al); return out

run = sorted(glob.glob('f-run/*.png')); atk = sorted(glob.glob('f-attack/*.png'))
# clip -> (frames, relative scale of the source start image: run start was 0.76 of the idle start)
clips = {'idle': ([atk[0]], 1.0), 'run': (run[52:62], 0.76),
         'attack': ([atk[i] for i in (8, 10, 12, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26)], 1.0)}
outdir = '../../../public/hero/grok-1'
for f in os.listdir(outdir): os.remove(os.path.join(outdir, f))
man = {'fps': {'idle': 1, 'run': 14, 'attack': 24}, 'clips': {}}
c0 = cut(clips['idle'][0][0]); hb = c0.getchannel('A').point(lambda v: 255 if v > 60 else 0).getbbox(); href = hb[3] - hb[1]
for name, (files, rel) in clips.items():
    ims = [cut(f) for f in files]
    boxes = [i.getchannel('A').point(lambda v: 255 if v > 60 else 0).getbbox() for i in ims]
    ux0 = min(b[0] for b in boxes); uy0 = min(b[1] for b in boxes); ux1 = max(b[2] for b in boxes); uy1 = max(b[3] for b in boxes)
    b0 = boxes[0]; cx_full = (b0[0] + b0[2]) / 2; foot_full = max(b[3] for b in boxes)
    scale = min(1, 300 / (uy1 - uy0))
    frames = []
    for k, im in enumerate(ims):
        c = im.crop((ux0, uy0, ux1, uy1)).resize((round((ux1 - ux0) * scale), round((uy1 - uy0) * scale)), Image.LANCZOS)
        fn = f'{name}-{k:02d}.webp'; c.save(os.path.join(outdir, fn), 'WEBP', quality=86)
        frames.append({'f': fn, 'cx': round((cx_full - ux0) * scale, 1), 'foot': round((foot_full - uy0) * scale, 1),
                       'k': round(rel / (href * scale), 6)})
    man['clips'][name] = frames
json.dump(man, open(os.path.join(outdir, 'hero.json'), 'w'), indent=1)
print('frames', sum(len(v) for v in man['clips'].values()), 'KB', sum(os.path.getsize(os.path.join(outdir, f)) for f in os.listdir(outdir)) // 1024)
