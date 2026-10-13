"""
Build a G-Labs job list (the glab-footage skill's prompts.json format) from
art/prompts.csv.

    python tools/build_glab_jobs.py --priority P0 [--keys dino-01] [--anchor dino-01]

Every job carries the style reference (art/style-ref.png). With --anchor, the
already-generated raw image of that key rides along as a second reference so
a whole family (the twelve Pals) comes out looking like one set.

Then generate with:
    node ~/.claude/skills/glab-footage/scripts/glab.mjs art/glab-jobs.json \
        --config config-game-asset.json --out art/raw --concurrency 3
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "art"

STYLE = (
    "Match the art style of the first reference image exactly: chunky thick dark-brown outlines, "
    "soft cel shading, warm saturated colours, cute chibi proportions, polished mobile-game finish. "
    "Use that reference ONLY for style - do not copy its scene, layout, characters, buttons, UI or text. "
)
# Art v2 (owner picked direction A on 09/10): premium stylized 3D cartoon.
STYLE_PREMIUM = (
    "Match the art style of the first reference image: premium stylized 3D-rendered mobile strategy-game "
    "cartoon (Clash of Clans / Boom Beach look) - bold readable shapes, realistic-leaning proportions with "
    "slightly larger heads, rich materials (scales, wood, rock, metal), warm key light from the upper left, "
    "soft shading, confident and heroic, NOT chibi, NOT baby-like. "
    "Use that reference ONLY for style - do not copy its scene, layout, characters or composition. "
)
ANCHOR = (
    "The second reference image is an existing creature from the same game: match its line weight, "
    "eye style, shading and level of detail so both look like one consistent character set. "
    "Do not copy its colours or species. "
)
SUBJECT = "Draw only this single subject: "
BG_SUBJECT = "Draw only this background scene, with no UI and no characters: "


def aspect_of(size: str) -> str:
    w, h = (int(v) for v in size.lower().split("x"))
    return "1:1" if w == h else ("16:9" if w > h else "9:16")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--priority", default="P0", help="comma list, e.g. P0,P1")
    ap.add_argument("--keys", default="", help="comma list of keys; overrides --priority")
    ap.add_argument("--anchor", default="", help="key whose raw image becomes a second reference")
    ap.add_argument("--anchor-prefix", default="dino-", help="only jobs with this key prefix get the anchor")
    ap.add_argument("--model", default="nano_banana_pro")
    ap.add_argument("--out", default=str(ART / "glab-jobs.json"))
    ap.add_argument("--csv", default=str(ART / "prompts.csv"))
    ap.add_argument("--style", choices=["classic", "premium"], default="classic")
    ap.add_argument("--style-ref", default=str(ART / "style-ref.png"))
    ap.add_argument("--raw", default=str(ART / "raw"), help="folder holding the anchor's raw image")
    args = ap.parse_args()

    rows = list(csv.DictReader(open(args.csv, encoding="utf8")))
    keys = {k.strip() for k in args.keys.split(",") if k.strip()}
    pris = {p.strip() for p in args.priority.split(",") if p.strip()}
    rows = [r for r in rows if (r["key"] in keys if keys else r["priority"] in pris)]

    style_ref = {"path": str(Path(args.style_ref).resolve()).replace("\\", "/")}
    style = STYLE_PREMIUM if args.style == "premium" else STYLE
    anchor_ref = None
    if args.anchor:
        hits = [p for p in Path(args.raw).glob(args.anchor + ".*")]
        if not hits:
            raise SystemExit(f"anchor {args.anchor} not found in art/raw - generate it first")
        anchor_ref = {"path": str(hits[0].resolve()).replace("\\", "/")}

    shots = []
    for r in rows:
        is_bg = r["key"].startswith("bg-")
        use_anchor = anchor_ref is not None and r["key"].startswith(args.anchor_prefix) and r["key"] != args.anchor
        prompt = style + (ANCHOR if use_anchor else "") + (BG_SUBJECT if is_bg else SUBJECT) + r["prompt"]
        shots.append({
            "id": r["key"],
            "prompt": prompt,
            "aspect": aspect_of(r["size"]),
            "model": args.model,
            "refs": [style_ref] + ([anchor_ref] if use_anchor else []),
        })

    Path(args.out).write_text(json.dumps({"shots": shots}, indent=2), encoding="utf8")
    print(f"{len(shots)} jobs -> {args.out}")
    for s in shots:
        print(f"  {s['id']:<16} {s['aspect']:<5} refs={len(s['refs'])}")


if __name__ == "__main__":
    main()
