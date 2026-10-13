"""
Turn raw AI-generated images into game-ready sprites.

    python tools/prep_sprites.py                 # art/raw -> public/sprites
    python tools/prep_sprites.py --src some/dir  # other input folder

Name each raw file after its sprite key (see ART_REQUEST.md), any image
extension: dino-07.png, enemy-3.jpg, bg-landscape-1.png ...

What it does per file:
  * sprites (everything except bg-*):
      - removes the background by flood-filling inward from the image edges,
        so interior pixels that happen to match the backdrop survive
      - trims to the content, pads to a square, resizes, saves PNG
  * backgrounds (bg-*): centre-crops to 16:9 or 9:16 (never upscales) and saves WebP
Everything ships as WebP: alpha sprites are ~5x smaller than PNG, and every
browser this game targets decodes it.
Then rewrites public/sprites/manifest.json listing every sprite present.
The game only requests files listed there, so a missing sprite is never a 404
-- it simply keeps its procedural stand-in.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "sprites"

# longest side, in pixels. Champion draws ~300 virtual units at up to 2x DPR.
SIZES = {"dino": 512, "egg": 256, "enemy": 512, "boss": 640, "cell": 256, "ledge": 1600, "ui": 192}
BG_SIZES = {"landscape": (1920, 1080), "portrait": (1080, 1920)}
EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def kind_of(key: str) -> str:
    return key.split("-")[0]


def remove_background(img: Image.Image, tolerance: int) -> Image.Image:
    """Flood-fill from every edge pixel whose colour matches the corners."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    work = rgba.convert("RGB").copy()
    sentinel = (255, 0, 254)  # a colour no AI backdrop will produce exactly

    seeds = [(x, 0) for x in range(0, w, max(1, w // 64))]
    seeds += [(x, h - 1) for x in range(0, w, max(1, w // 64))]
    seeds += [(0, y) for y in range(0, h, max(1, h // 64))]
    seeds += [(w - 1, y) for y in range(0, h, max(1, h // 64))]
    for sx, sy in seeds:
        if work.getpixel((sx, sy)) != sentinel:
            ImageDraw.floodfill(work, (sx, sy), sentinel, thresh=tolerance)

    mask = Image.new("L", (w, h), 255)
    mpx, wpx = mask.load(), work.load()
    for y in range(h):
        for x in range(w):
            if wpx[x, y] == sentinel:
                mpx[x, y] = 0
    # Soften the cut by one pixel so edges don't look stair-stepped.
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    rgba.putalpha(mask)
    return rgba


def to_square(img: Image.Image, size: int) -> Image.Image:
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    side = max(img.size)
    pad = int(side * 0.04)
    canvas = Image.new("RGBA", (side + pad * 2, side + pad * 2), (0, 0, 0, 0))
    # Bottom-align so every creature stands on the same baseline.
    canvas.paste(img, ((canvas.width - img.width) // 2, canvas.height - pad - img.height), img)
    return canvas.resize((size, size), Image.LANCZOS)


def crop_cover(img: Image.Image, target: tuple[int, int]) -> Image.Image:
    tw, th = target
    # Never upscale: a 1376 px source blown up to 1920 is bigger AND blurrier.
    shrink = min(1.0, img.width / tw, img.height / th)
    tw, th = round(tw * shrink), round(th * shrink)
    k = max(tw / img.width, th / img.height)
    img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    left = (img.width - tw) // 2
    top = (img.height - th) // 2
    return img.crop((left, top, left + tw, top + th)).convert("RGB")


def clear_old(key: str) -> None:
    """Drop earlier outputs of this key in other formats so the manifest has one entry."""
    for f in OUT.glob(key + ".*"):
        if f.suffix in (".png", ".jpg", ".webp"):
            f.unlink()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(ROOT / "art" / "raw"))
    ap.add_argument("--tolerance", type=int, default=38,
                    help="background colour tolerance (raise for noisy backdrops)")
    ap.add_argument("--keep-bg", action="store_true",
                    help="skip background removal (input already has alpha)")
    args = ap.parse_args()

    src = Path(args.src)
    OUT.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in src.glob("*") if p.suffix.lower() in EXTS) if src.exists() else []
    if not files:
        print(f"no images in {src}")

    for p in files:
        key = p.stem.lower()
        kind = kind_of(key)
        img = Image.open(p)
        if kind == "bg":
            orient = "portrait" if "portrait" in key else "landscape"
            clear_old(key)
            crop_cover(img, BG_SIZES[orient]).save(OUT / f"{key}.webp", quality=78, method=6)
            print(f"bg      {key}.webp")
            continue
        if kind == "ledge":
            out = img.convert("RGBA")
            out.thumbnail((SIZES["ledge"], SIZES["ledge"]))
            clear_old(key)
            out.save(OUT / f"{key}.webp", quality=88, method=6)
            print(f"ledge   {key}.webp")
            continue
        has_alpha = img.mode in ("RGBA", "LA") and img.getextrema()[-1][0] < 250
        cut = img.convert("RGBA") if (args.keep_bg or has_alpha) else remove_background(img, args.tolerance)
        out = to_square(cut, SIZES.get(kind, 512))
        clear_old(key)
        out.save(OUT / f"{key}.webp", quality=88, method=6)
        print(f"sprite  {key}.webp  ({'alpha kept' if has_alpha or args.keep_bg else 'bg removed'})")

    manifest = {
        "files": {f.stem: f.name for f in sorted(OUT.iterdir())
                  if f.suffix in (".webp", ".png", ".jpg") and f.stem != "manifest"}
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf8")
    print(f"manifest: {len(manifest['files'])} sprites -> {OUT / 'manifest.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
