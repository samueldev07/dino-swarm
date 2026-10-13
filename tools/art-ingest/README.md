# Approved art ingest

Requires Python 3 and Pillow. Run from the repository root:

```sh
python tools/art-ingest/ingest.py
python tools/art-ingest/ingest.py --src path/to/approved-pngs --out path/to/test-sprites --report work/art-report.json --preview-dir work/tile-previews
```

Default input is `art/final`, output `public/sprites`. Run the default only after Antigravity's images are approved. The tool does not remove backgrounds or generate art. It merges an existing manifest so a partial delivery retains earlier assets. Budget includes existing sprite files, rigs and the manifest: 3,000,000 bytes. Budget/empty-image/invalid-group/rig/seam errors occur before sprite output is written. Alpha edge and dark-fringe warnings need a visual review; dark ink can legitimately have low edge luminance. Facing direction always needs manual review and is a warning, never a guessed flip.

Player keys: `player-<raptor|ankylo|ptero>-<1|2|3>-<idle|run|bite>`. All poses and an optional legacy `player-<species>-<form>` must start on the same-sized canvas with feet at the same source coordinates. One union crop, padding and resize is applied to the entire group. The output canvases match; individual poses are never separately trimmed.

Longest side: player 384, enemy 256, full boss and its parts 768, pickup 96, skill 128. UI, logo and thumbnails stay at their native size, without trimming (slice insets remain valid). Ground keys are `ground-*` or `bg-ground-*`: square tiles become 512×512, without trimming; a 2×2 join check rejects mean seam channel deltas above 12/255. Optional previews make the check inspectable. Check the preview for larger patterns/repetition; matching edge pixels alone cannot prove artistic continuity.

Provide `slices.json` beside the PNGs:

```json
{"ui-panel":[32,32,32,32],"ui-btn-gold":[20,20,20,20]}
```

Insets are source pixel counts `[left,top,right,bottom]`. Supported keys: `ui-panel`, `ui-card`, `ui-btn-gold`, `ui-btn-blue`, `ui-btn-stone`, `ui-ribbon-green`, `ui-ribbon-red`, `ui-medallion`, `ui-bar-frame`. Corners stay fixed; destination sizes too small for the corners scale the corners together. Old manifests without insets use quarter-image insets. Text stays in code.

Rig sidecar: `boss-1.rig.json` (also boss-2/boss-3, selected by boss tier). Legacy `enemy-boss-<zone>.rig.json` is also supported. Every part is a PNG on the **full source canvas**, with transparent unused areas. Example:

```json
{"canvas":[768,640],"anchor":[0.5,0.9],"parts":[
  {"name":"body","key":"boss-1-body","pivot":[384,560],"parent":null,"z":1},
  {"name":"head","key":"boss-1-head","pivot":[430,220],"parent":"body","z":2},
  {"name":"jaw","key":"boss-1-jaw","pivot":[450,330],"parent":"head","z":3}
]}
```

The full `boss-1.png`, if supplied, uses the same canvas. The tool scales every part and pivot by the same canvas transform and writes `rigs` in the manifest. `name` conventions `body`, `head`, `jaw`, `arm`, `leg-front`, `leg-back` select motions. Parent graphs must be acyclic; z sets draw order independently. `anchor` is a fraction of the full canvas where the ground point sits, default `[0.5,0.9]`.

Start the dev server on 5182 and open `http://localhost:5182/tools/rig-viewer/`. The built-in test boss is split from the existing procedural boss in code. Upload a JSON plus its PNG/WebP parts, preview seven clips, enable Edit pivots and drag a handle, then Copy JSON. The viewer and test fixture are not entries in the production build. Runtime fallbacks: requested pose → legacy player image → procedural player; complete valid rig → full boss image → procedural boss; UI image → existing procedural UI. Missing/broken assets never block gameplay.

Production contract (art/BRIEF-ANTIGRAVITY-02.md): enemies may be named enemy-<kind> with no zone suffix. The runtime uses these with a cached warm/cold zone tint; enemy-<kind>-<zone> overrides the generic image. Boss-1/2/3 and their rigs follow the boss tier, with legacy enemy-boss-<zone> as fallback. ground-0/1/2 replace the procedural ground in the run, menu and camp. Logo/thumbnail canvases remain native; they are ingested but not placed by this runtime task.
