"""White-background AI image -> trimmed transparent PNG (+ grid preview). python cutout.py in.jpg out.png [grid.png]"""
import sys, collections
from PIL import Image, ImageFilter, ImageDraw
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); W, H = im.size; px = im.load()
near = lambda p: min(p) > 232 and max(p) - min(p) < 22
seen = bytearray(W * H); q = collections.deque()
for x in range(W): q += [(x, 0), (x, H - 1)]
for y in range(H): q += [(0, y), (W - 1, y)]
while q:
    x, y = q.popleft()
    if x < 0 or y < 0 or x >= W or y >= H or seen[y * W + x] or not near(px[x, y]): continue
    seen[y * W + x] = 1; q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
a = Image.new('L', (W, H), 255); ap = a.load()
for y in range(H):
    for x in range(W):
        if seen[y * W + x]: ap[x, y] = 0
# enclosed white gaps (between limbs) below the head
seen2 = bytearray(W * H)
for y0 in range(int(H * 0.45), H):
    for x0 in range(W):
        if seen2[y0 * W + x0] or ap[x0, y0] == 0 or min(px[x0, y0]) < 240: continue
        comp = []; q = collections.deque([(x0, y0)])
        while q:
            x, y = q.popleft()
            if x < 0 or y < 0 or x >= W or y >= H or seen2[y * W + x] or ap[x, y] == 0 or min(px[x, y]) < 240: continue
            seen2[y * W + x] = 1; comp.append((x, y)); q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
        if len(comp) > 60:
            for x, y in comp: ap[x, y] = 0
a = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
out = im.convert('RGBA'); out.putalpha(a); out = out.crop(a.getbbox()); out.save(dst)
print(dst, out.size)
if len(sys.argv) > 3:
    g = Image.new('RGB', out.size, (125, 160, 90)); g.paste(out, (0, 0), out); d = ImageDraw.Draw(g)
    for x in range(0, out.width, 50): d.line([(x, 0), (x, out.height)], fill=(255, 255, 255) if x % 100 == 0 else (190, 190, 190))
    for y in range(0, out.height, 50): d.line([(0, y), (out.width, y)], fill=(255, 255, 255) if y % 100 == 0 else (190, 190, 190))
    g.save(sys.argv[3])
