"""Hero videos (white bg) -> hero.json clips. Keeps eye whites (only gaps below the head are cleared).
usage: python cut_hero.py <run.mp4> <attack.mp4> <attack_start> <attack_end> <out_dir>"""
import sys, os, json
import numpy as np, cv2
from PIL import Image, ImageFilter
from scipy import ndimage

def frames(path):
    cap = cv2.VideoCapture(path); out = []; i = 0
    while True:
        ok, f = cap.read()
        if not ok: break
        if i % 2 == 0: out.append(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
        i += 1
    return out

def cut(a):
    a16 = a.astype(np.int16)
    white = (a16.min(axis=2) > 214) & ((a16.max(axis=2) - a16.min(axis=2)) < 26)
    lab, n = ndimage.label(white)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    ys, _ = np.nonzero(~bg); top, bot = ys.min(), ys.max(); head = top + (bot - top) * 0.45
    sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(n + 1))
    cy = ndimage.center_of_mass(np.ones_like(lab), lab, index=np.arange(n + 1))
    for i in range(1, n + 1):
        if i not in edge and sizes[i] >= 40 and cy[i][0] > head: bg |= lab == i
    al = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    im = Image.fromarray(a).convert('RGBA'); im.putalpha(al); return im

def best_loop(fr, lo=8, hi=14):
    sm = [np.asarray(Image.fromarray(f).convert('L').resize((108, 192)), np.float32) for f in fr]
    best = None
    for s in range(len(fr) // 4, len(fr) * 3 // 4):
        for L in range(lo, hi + 1):
            if s + L < len(fr):
                d = np.abs(sm[s] - sm[s + L]).mean() + 0.02 * L
                if best is None or d < best[0]: best = (d, s, L)
    return best[1], best[2]

run_v, atk_v, a0, a1, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
rf, af = frames(run_v), frames(atk_v)
s, L = best_loop(rf)
clips = {'idle': ([af[0]], 1), 'run': (rf[s:s + L], 14), 'attack': (af[a0:a1 + 1], 24)}
os.makedirs(out, exist_ok=True)
for f in os.listdir(out): os.remove(os.path.join(out, f))
idle = cut(af[0]); hb = idle.getchannel('A').point(lambda v: 255 if v > 60 else 0).getbbox(); href = hb[3] - hb[1]
man = {'fps': {}, 'clips': {}}
for name, (src, fps) in clips.items():
    ims = [cut(f) for f in src]
    boxes = [i.getchannel('A').point(lambda v: 255 if v > 60 else 0).getbbox() for i in ims]
    ux0 = min(b[0] for b in boxes); uy0 = min(b[1] for b in boxes); ux1 = max(b[2] for b in boxes); uy1 = max(b[3] for b in boxes)
    # body anchor: the idle frame's hip centre (the camera is static, so one anchor per clip)
    cx = (hb[0] + hb[2]) / 2 if name != 'run' else (boxes[0][0] + boxes[0][2]) / 2
    foot = max(b[3] for b in boxes)
    hh = np.median([b[3] - b[1] for b in boxes]) if name == 'run' else href
    scale = min(1, 230 / (uy1 - uy0))
    fr = []
    for k, im in enumerate(ims):
        c = im.crop((ux0, uy0, ux1, uy1)).resize((round((ux1 - ux0) * scale), round((uy1 - uy0) * scale)), Image.LANCZOS)
        fn = f'{name}-{k:02d}.webp'; c.save(os.path.join(out, fn), 'WEBP', quality=86)
        fr.append({'f': fn, 'cx': round((cx - ux0) * scale, 1), 'foot': round((foot - uy0) * scale, 1), 'k': round(1 / (hh * scale), 6)})
    man['fps'][name] = fps; man['clips'][name] = fr
json.dump(man, open(os.path.join(out, 'hero.json'), 'w'), indent=1)
print('run loop', s, L, 'attack', a1 - a0 + 1, 'frames; KB', sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out)) // 1024)
