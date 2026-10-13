"""Approved PNGs -> WebP + manifest. No background removal or invented poses.

python tools/art-ingest/ingest.py --src art/final --out public/sprites
Optional input sidecars: slices.json {key:[l,t,r,b]}, <key>.rig.json.
Rig parts occupy the full canvas; their canvases and pivots scale together.
All idle/run/bite PNGs for one player form MUST have identical source sizes.
"""
from __future__ import annotations

import argparse
import io
import json
import math
import re
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[2]
KEY = re.compile(r"^[a-z0-9][a-z0-9-]*$")
POSE = re.compile(r"^(player-(?:raptor|ankylo|ptero)-[123])(?:-(?:idle|run|bite))?$")


def size_for(key: str) -> int | None:
    if key.startswith("ui-"): return None
    if key.startswith(("ground-", "bg-ground-")): return 512
    if key.startswith("player-"): return 384
    if key.startswith("boss-") or key.startswith("enemy-boss-"): return 768
    if key.startswith("enemy-"): return 256
    if key.startswith("pickup-"): return 96
    if key.startswith("skill-"): return 128
    return 128


def edge_report(image: Image.Image) -> tuple[int, float | None]:
    alpha = image.getchannel("A")
    hist = alpha.histogram()
    soft = sum(hist[1:255])
    pixels = [rgb for rgb, a in zip(image.convert("RGB").getdata(), alpha.getdata()) if 0 < a < 255]
    luma = sum(.2126*r + .7152*g + .0722*b for r, g, b in pixels) / len(pixels) if pixels else None
    return soft, luma


def seam_report(image: Image.Image) -> float:
    """Evaluate the actual joins in a 2x2 tile, including alpha discontinuity."""
    w, h = image.size
    tiled = Image.new("RGBA", (w*2, h*2))
    for x in (0, w):
        for y in (0, h): tiled.paste(image, (x, y))
    joins = [ImageChops.difference(tiled.crop((w-1, 0, w, h*2)), tiled.crop((w, 0, w+1, h*2))),
             ImageChops.difference(tiled.crop((0, h-1, w*2, h)), tiled.crop((0, h, w*2, h+1)))]
    return max(max(ImageStat.Stat(join).mean) for join in joins)


def ingest(src: Path, out: Path, quality: int, budget: int, previews: Path | None) -> dict:
    if not src.is_dir(): raise ValueError(f"input folder does not exist: {src}")
    images: dict[str, Image.Image] = {}
    for path in sorted(src.rglob("*.png")):
        key = path.stem
        if not KEY.fullmatch(key): raise ValueError(f"invalid sprite key: {key}")
        if key in images: raise ValueError(f"duplicate sprite key: {key}")
        with Image.open(path) as raw: images[key] = raw.convert("RGBA")
        if not images[key].getchannel("A").getbbox(): raise ValueError(f"empty image: {key}")
    if not images: raise ValueError("no PNGs in input folder")

    rigs = {}
    part_keys = set()
    for path in sorted(src.glob("*.rig.json")):
        key = path.name.removesuffix(".rig.json")
        if not KEY.fullmatch(key): raise ValueError(f"invalid rig key: {key}")
        rig = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(rig, dict): raise ValueError(f"bad rig object: {key}")
        canvas = rig.get("canvas")
        number = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)
        if not isinstance(canvas, list) or len(canvas) != 2 or any(not number(v) or v <= 0 for v in canvas): raise ValueError(f"bad rig canvas: {key}")
        anchor = rig.get("anchor")
        if anchor is not None and (not isinstance(anchor, list) or len(anchor) != 2 or any(not number(v) or not 0 <= v <= 1 for v in anchor)): raise ValueError(f"bad rig anchor: {key}")
        parts = rig.get("parts")
        if not isinstance(parts, list) or not parts or any(not isinstance(p, dict) for p in parts): raise ValueError(f"no rig parts: {key}")
        by_name = {p.get("name"): p for p in parts}
        if len(by_name) != len(parts) or any(not isinstance(name, str) or not name for name in by_name): raise ValueError(f"duplicate/missing rig part name: {key}")
        for part in parts:
            sprite = part.get("key")
            if sprite not in images or images[sprite].size != tuple(canvas): raise ValueError(f"{sprite}: rig parts must use FULL canvas {canvas}")
            pivot = part.get("pivot")
            if not isinstance(pivot, list) or len(pivot) != 2 or any(not number(v) for v in pivot): raise ValueError(f"bad pivot: {sprite}")
            seen = {part["name"]}; parent = part.get("parent")
            while parent is not None:
                if parent in seen or parent not in by_name: raise ValueError(f"cyclic/missing parent: {sprite}")
                seen.add(parent); parent = by_name[parent].get("parent")
            if not number(part.get("z")): raise ValueError(f"bad z: {sprite}")
            part_keys.add(sprite)
        if key in images and images[key].size != tuple(canvas): raise ValueError(f"full boss canvas differs: {key}")
        scale = 768 / max(canvas)
        target = [round(v * scale) for v in canvas]
        rig["canvas"] = target
        for part in parts:
            part["pivot"] = [part["pivot"][i] * target[i] / canvas[i] for i in (0, 1)]
        rigs[key] = rig

    crops = {}
    groups: dict[str, list[str]] = {}
    for key in images:
        match = POSE.fullmatch(key)
        if match: groups.setdefault(match[1], []).append(key)
    for keys in groups.values():
        if len({images[key].size for key in keys}) != 1: raise ValueError(f"pose canvases differ: {keys}")
        boxes = [images[key].getchannel("A").getbbox() for key in keys]
        union = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
        # Same union crop, padding and resize for EVERY pose; never per-pose trim.
        pad = max(2, round(max(union[2]-union[0], union[3]-union[1])*.02))
        common = (union[0]-pad, union[1]-pad, union[2]+pad, union[3]+pad)
        for key in keys: crops[key] = common

    files = {}
    old = out / "manifest.json"
    manifest = json.loads(old.read_text(encoding="utf-8")) if old.exists() else {"files": {}}
    manifest.setdefault("files", {})
    report = []
    for key, image in images.items():
        original_size = image.size
        tile = key.startswith(("ground-", "bg-ground-"))
        if tile and image.width != image.height: raise ValueError(f"ground tile must be square: {key}")
        preserve = key.startswith("ui-") or key in part_keys or key in rigs or key.startswith(("boss-", "enemy-boss-")) or tile
        if not preserve: image = image.crop(crops.get(key, image.getchannel("A").getbbox()))
        size = size_for(key)
        # Rig parts may use arbitrary names; their referenced rig owns the scale.
        rig = next((r for r in rigs.values() if any(p["key"] == key for p in r["parts"])), None)
        if rig: target = tuple(rig["canvas"])
        elif tile: target = (512, 512)
        elif size: target = tuple(max(1, round(v * size / max(image.size))) for v in image.size)
        else: target = image.size
        if rig and key in rigs and tuple(rigs[key]["canvas"]) != target: raise ValueError(f"rig canvas conflict: {key}")
        image = image.resize(target, Image.Resampling.LANCZOS)
        soft, luma = edge_report(image)
        warnings = []
        if not preserve and soft == 0: warnings.append("no soft alpha edge")
        if luma is not None and luma < 28: warnings.append("dark edge: inspect for fringe (dark ink can be intentional)")
        if key.startswith(("player-", "enemy-", "boss-")): warnings.append("faces right: manual review required")
        seam = seam_report(image) if tile else None
        if seam is not None and seam > 12: raise ValueError(f"tile seam delta {seam:.1f}: not seamless: {key}")
        if previews and tile:
            previews.mkdir(parents=True, exist_ok=True)
            preview = Image.new("RGBA", (1024, 1024))
            for x in (0, 512):
                for y in (0, 512): preview.paste(image, (x, y))
            preview.save(previews / f"{key}-2x2.png")
        buf = io.BytesIO(); image.save(buf, format="WEBP", quality=quality, method=6)
        files[f"{key}.webp"] = buf.getvalue()
        manifest["files"][key] = f"{key}.webp"
        report.append({"key": key, "source": original_size, "size": image.size, "bytes": len(buf.getvalue()), "soft_alpha": soft, "edge_luma": luma, "seam_delta": seam, "warnings": warnings})

    slices_path = src / "slices.json"
    if slices_path.exists():
        slices = json.loads(slices_path.read_text(encoding="utf-8"))
        for key, insets in slices.items():
            if key not in images or not isinstance(insets, list) or len(insets) != 4 or any(not isinstance(v, int) or v < 0 for v in insets): raise ValueError(f"invalid slices: {key}")
            w, h = images[key].size
            if insets[0]+insets[2] >= w or insets[1]+insets[3] >= h: raise ValueError(f"no slice center: {key}")
        manifest.setdefault("slices", {}).update(slices)
    for key, rig in rigs.items():
        name = f"{key}.rig.json"
        files[name] = json.dumps(rig, indent=2).encode("utf-8")
        manifest.setdefault("rigs", {})[key] = name
    files["manifest.json"] = json.dumps(manifest, indent=2).encode("utf-8")
    # Include existing sprite/rig files: a partial ingest still observes the TOTAL budget.
    total = sum(len(value) for value in files.values()) + sum(p.stat().st_size for p in out.rglob("*") if p.is_file() and p.name not in files and p.suffix.lower() in {".webp", ".png", ".jpg", ".jpeg", ".json"}) if out.exists() else sum(map(len, files.values()))
    if total > budget: raise ValueError(f"TOTAL shipped size {total:,} bytes exceeds budget {budget:,}; no outputs written")
    out.mkdir(parents=True, exist_ok=True)
    for name, data in files.items(): (out / name).write_bytes(data)
    return {"files": report, "total_bytes": total, "budget_bytes": budget}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--src", type=Path, default=ROOT / "art" / "final")
    ap.add_argument("--out", type=Path, default=ROOT / "public" / "sprites")
    ap.add_argument("--quality", type=int, default=88)
    ap.add_argument("--budget", type=int, default=3_000_000)
    ap.add_argument("--preview-dir", type=Path)
    ap.add_argument("--report", type=Path)
    args = ap.parse_args()
    try:
        if not 0 <= args.quality <= 100 or args.budget < 1: raise ValueError("invalid quality or budget")
        report = ingest(args.src, args.out, args.quality, args.budget, args.preview_dir)
        for row in report["files"]: print(f"{row['key']}: {row['size']} {row['bytes']:,} B; soft alpha={row['soft_alpha']}; edge luma={row['edge_luma']}; " + "; ".join(row["warnings"]))
        print(f"TOTAL shipped: {report['total_bytes']:,} / {report['budget_bytes']:,} bytes")
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True); args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
        return 0
    except (ValueError, OSError, KeyError, TypeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr); return 1


if __name__ == "__main__": sys.exit(main())
