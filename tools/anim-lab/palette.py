"""Game palette tools (STYLE-LOCK).
  python palette.py build              -> art/STYLE-LOCK/palette.json + palette.png from the approved masters
  python palette.py check <img...>     -> flags skin / overall brightness outside the locked range
  python palette.py fixskin <in> <out> -> pulls skin pixels into the locked skin range
"""
import sys, json, colorsys
import numpy as np
from PIL import Image, ImageDraw

def rgb_to_hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(-1); mn = rgb.min(-1); d = mx - mn
    h = np.zeros_like(mx); nz = d > 1e-6
    rr = nz & (mx == r); gg = nz & (mx == g) & ~rr; bb = nz & ~rr & ~gg
    h[rr] = ((g - b)[rr] / d[rr]) % 6; h[gg] = (b - r)[gg] / d[gg] + 2; h[bb] = (r - g)[bb] / d[bb] + 4
    h = h / 6; s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return np.stack([h, s, mx], -1)

def hsv_to_rgb(hsv):
    h, s, v = hsv[..., 0] * 6, hsv[..., 1], hsv[..., 2]
    i = np.floor(h).astype(int) % 6; f = h - np.floor(h)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    out = np.choose(i[..., None] * 0 + np.arange(3)[None] * 0 + i[..., None], [
        np.stack([v, t, p], -1), np.stack([q, v, p], -1), np.stack([p, v, t], -1),
        np.stack([p, q, v], -1), np.stack([t, p, v], -1), np.stack([v, p, q], -1)])
    return out

LOCK = 'art/STYLE-LOCK/'
MASTERS = ['enemy-gnome.jpg', 'enemy-bat.jpg', 'enemy-boarorc.jpg', 'enemy-orc.jpg', 'enemy-goblin.jpg',
           'enemy-troll.jpg', 'enemy-ogre.jpg', 'hero-master.png']
# Locked ranges (HSV 0-1), measured from the approved ogre + reference crops, then darkened for the dark forest floor.
SKIN = {'h': (0.03, 0.10), 's': (0.30, 0.44), 'v': (0.70, 0.82)}  # hero keeps his original skin (owner 13/10): brighter than enemies so he pops

def pixels(path):
    a = np.asarray(Image.open(LOCK + path if not path.startswith(('art', 'public', 'C:', 'D:')) else path).convert('RGBA'), np.float32) / 255
    rgb = a[..., :3].reshape(-1, 3); al = a[..., 3].reshape(-1)
    white = (rgb.min(1) > 0.9)
    return rgb[(al > 0.5) & ~white]

def hsv(rgb):
    return rgb_to_hsv(rgb)

def is_skin(h):
    return (h[:, 0] > 0.02) & (h[:, 0] < 0.11) & (h[:, 1] > 0.15) & (h[:, 1] < 0.6) & (h[:, 2] > 0.5)

def build():
    from scipy.cluster.vq import kmeans2
    allpx = np.concatenate([pixels(p)[::9] for p in MASTERS])
    np.random.seed(3)
    cent, lab = kmeans2(allpx, 16, minit='++', seed=3)
    order = np.argsort(-np.bincount(lab, minlength=16))
    cols = [cent[i] for i in order]
    hexs = ['#%02x%02x%02x' % tuple(int(c * 255) for c in col) for col in cols]
    roles = {
        'ink': '#2a1d16', 'skin_light': '#d9a98c', 'skin': '#c48f74', 'skin_shadow': '#9a6b58', 'blush': '#c97a72',
        'cloth_olive': '#6f7357', 'cloth_brown': '#6b5240', 'leather': '#5a3f2c', 'rust': '#9a5a32', 'iron': '#6e6a64',
        'hair_ginger': '#b8642e', 'orc_green': '#7f9a5a', 'goblin_green': '#8a8f55', 'mushroom_red': '#a8483a',
        'troll_moss': '#6f7046', 'bat_grey': '#6a6460', 'eye_white': '#ece4d4', 'fire': '#e8a23a', 'blood_dark': '#4a2a22',
    }
    json.dump({'from_masters': hexs, 'roles': roles, 'skin_hsv_range': SKIN,
               'rules': ['No pure white or pure black fills (eye whites use eye_white, lines use ink).',
                         'Max saturation 0.55 except fire / magic VFX.',
                         'Skin must stay inside skin_hsv_range (check with palette.py check).',
                         'Each enemy keeps ONE identity colour from roles, muted.']},
              open(LOCK + 'palette.json', 'w'), indent=1)
    W = 120; im = Image.new('RGB', (W * 8, W * 2 + 40 + 40 * ((len(roles) + 5) // 6)), (40, 34, 30)); d = ImageDraw.Draw(im)
    for i, h in enumerate(hexs):
        x, y = (i % 8) * W, (i // 8) * W
        d.rectangle([x + 4, y + 4, x + W - 4, y + W - 4], fill=h); d.text((x + 8, y + W - 20), h, fill='white')
    y0 = W * 2 + 20
    for i, (k, h) in enumerate(roles.items()):
        x, y = (i % 6) * 160, y0 + (i // 6) * 40
        d.rectangle([x + 4, y, x + 40, y + 32], fill=h); d.text((x + 46, y + 10), k, fill='white')
    im.save(LOCK + 'palette.png'); print('palette ->', LOCK + 'palette.json / palette.png')

def check(paths):
    for p in paths:
        px = pixels(p); h = hsv(px); sk = h[is_skin(h)]
        msg = f'{p}: brightness {h[:,2].mean():.2f} sat {h[:,1].mean():.2f}'
        if len(sk) > 200:
            s, v = sk[:, 1].mean(), sk[:, 2].mean()
            ok = SKIN['s'][0] <= s <= SKIN['s'][1] and SKIN['v'][0] <= v <= SKIN['v'][1]
            msg += f' | skin s={s:.2f} v={v:.2f} ' + ('OK' if ok else 'OUT OF RANGE')
        print(msg)

def fixskin(src, dst):
    im = Image.open(src).convert('RGBA'); a = np.asarray(im, np.float32) / 255
    h = rgb_to_hsv(a[..., :3]); m = (h[..., 0] > 0.02) & (h[..., 0] < 0.11) & (h[..., 1] > 0.12) & (h[..., 1] < 0.6) & (h[..., 2] > 0.45) & (a[..., 3] > 0.3)
    flat = h.reshape(-1, 3); sk = flat[is_skin(flat) & (a[..., 3].reshape(-1) > 0.5)]; s0, v0 = sk[:, 1].mean(), sk[:, 2].mean()
    ts, tv = np.mean(SKIN['s']), np.mean(SKIN['v'])
    h[..., 1] = np.where(m, np.clip(h[..., 1] * ts / s0, 0, 1), h[..., 1])
    h[..., 2] = np.where(m, np.clip(h[..., 2] * tv / v0, 0, 1), h[..., 2])
    h[..., 0] = np.where(m, h[..., 0] * 0.92 + 0.065 * 0.08, h[..., 0])
    a[..., :3] = hsv_to_rgb(h)
    Image.fromarray((a * 255).astype(np.uint8), 'RGBA').save(dst)
    print(f'skin s {s0:.2f}->{ts:.2f}  v {v0:.2f}->{tv:.2f}  -> {dst}')

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'build': build()
    elif cmd == 'check': check(sys.argv[2:])
    elif cmd == 'fixskin': fixskin(sys.argv[2], sys.argv[3])
