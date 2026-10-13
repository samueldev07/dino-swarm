# Antigravity: art brief 02 (full production)

**Điều kiện bắt đầu:** chủ game đã chọn xong phong cách. Trước khi dán đoạn dưới đây, chép các ảnh được duyệt
(ít nhất 3 tư thế raptor, con sâu, con trùm, mẫu giao diện) vào `art/style-test/APPROVED/`.
Ghi thêm vào `art/style-test/APPROVED/NOTES.md` vài dòng góp ý của chủ game, nếu có.
Mỗi lô làm xong phải dừng lại chờ chủ game duyệt rồi mới sang lô sau.

```
ROLE: Art producer for "Dino Swarm Survivors" (top-down survivor-like dinosaur game for Poki; US kids/teens/casual;
phone + desktop). Read AGENTS.md, ART-DIRECTION.md (all sections, especially 2/3 style, 5 checklist, 6 animation
plan) and art/style-test/APPROVED/ (the owner-approved style + NOTES.md). The approved images are the STYLE ANCHOR:
attach them as reference to EVERY generation and match their line weight, shading, palette logic and proportions.

PERMISSIONS: write ONLY inside art/ (final files in art/final/, work files in art/work/). Never edit src/, public/,
tools/, playtest/. Do not run git. Code reads your files through an ingest tool, so FILE NAMES AND CANVAS RULES
BELOW ARE A CONTRACT — follow them exactly.

GLOBAL RULES
- PNG, transparent background, clean soft edges (no halo/fringe), every character FACES RIGHT, light from top-left.
- Deliver at the canvas size given (bigger is fine if the aspect is the same); the ingest tool resizes.
- No text anywhere except where stated. No signatures/logos.
- Player + pickups get the white sticker rim (if the approved style has it); enemies and bosses never do.
- Readability over detail: everything must read at 48–96 px on a phone. Fill the silhouette black at 48 px:
  each enemy type must still be recognisable (round / spiky / flat / tall / winged...).
- After each batch: build art/work/batch-NN-sheet.png (all images of the batch on a mid-green #7da05a background
  at game size AND at 2x) and append to art/final/REPORT.md: prompts used, pass/fail per checklist item.
  Regenerate failures; never "fix" with blur/filters. Then STOP and wait for the owner.

POSES CONTRACT (plan B, player): idle / run / bite of the same character share ONE canvas size and the feet touch
the SAME baseline at the SAME x. Same colours, markings, proportions. run = mid-stride, legs long, body leaning
forward; bite = jaw wide open, head lunging forward.

RIG CONTRACT (plan C, bosses): deliver the full boss image AND separate part images. EVERY PART IS EXPORTED ON THE
FULL BOSS CANVAS at its exact position (transparent everywhere else), so stacking all parts = the full boss.
Paint the hidden overlap: each part extends ~15% under its neighbour so rotations never open a gap.
Parts: body, head, jaw (lower jaw, separate, closed position), arm-front, leg-front, leg-back, tail (if any).
Also write boss-<n>.rig.json:
{ "canvas": [W,H], "parts": [ {"name":"leg-back","key":"boss-1-leg-back","pivot":[x,y],"parent":"body","z":0}, ... ] }
pivot = the joint point in canvas pixels (hip for legs, shoulder for arm, neck for head, jaw hinge for jaw).
z = draw order (back to front). parent of body = null.

BATCH 1 — the player first (owner plays it in-game before anything else)
  player-raptor-1-idle.png, player-raptor-1-run.png, player-raptor-1-bite.png        canvas 768x608
  player-raptor-2-{idle,run,bite}.png  (form 2 "Razor Raptor": bigger, darker red-orange, sharp back spikes)
  player-raptor-3-{idle,run,bite}.png  (form 3 "Rex": T-rex-like, deep red, heavy jaw, crown of spikes)
  Forms grow ~15% each but use the same canvas; keep the same baseline.
  ground-0.png 1024x1024 seamless tile, Fern Jungle: calm low-contrast grass, very few small details,
  NO big objects, NO strong shadows (verify: tile 3x3 in the sheet, no visible seams or repeating blobs).
  pickup-amber-1.png / -2.png / -3.png (XP gems: small orange-yellow, medium orange-red, large red-magenta) 192x192.

BATCH 2 — other species (same contracts)
  player-ankylo-{1,2,3}-{idle,run,bite}.png  (armoured, club tail, olive/moss; forms: more spikes, bigger club)
  player-ptero-{1,2,3}-{idle,run,bite}.png   (flying; "run" = wings down-beat, "bite" = beak open lunge; blue → violet)

BATCH 3 — enemies (plan A: one image each, 512x512 canvas, fierce not cute)
  enemy-grub (teal segmented critter), enemy-bat (dark winged pest), enemy-beetle (armoured horned bug, tanky),
  enemy-wolf (grey dire-wolf, lunges), enemy-shroom (red-brown mushroom spitter — it SHOOTS magenta spores, so do NOT
  use magenta/purple on any enemy body; magenta is reserved for enemy bullets), enemy-brute (big rock golem, 768x768).
  Cool or earthy hues for enemies; the player is the warm/orange thing on screen.

BATCH 4 — bosses (plan C)
  boss-1 (horned purple brute — matches the approved test), boss-2 (lava beast, molten cracks, two big arms),
  boss-3 (frost titan, ice spikes, long tail). Canvas 1280x1120. Full image + parts + boss-<n>.rig.json each.

BATCH 5 — pickups, projectiles, skill icons
  pickup-meat, pickup-coin, pickup-magnet, pickup-chest (192x192, sticker rim).
  proj-egg (spinning egg), proj-bone (bone boomerang), proj-fireball, proj-spore (magenta enemy bullet),
  fx-thorn (patch of thorns seen from above), fx-slash (curved bite-slash streak, white-orange), fx-impact (round
  hit flash with a few shards), fx-dust (stomp dust puff), fx-meteor (rock with fire trail). 256x256 each.
  Skill icons, 256x256, all the SAME family: round disc in the skill colour, centred bold glyph (~68% of the disc),
  no outer ring painted (the game draws the rim), readable at 42 px:
  skill-bite (jaws), skill-spit (fireball), skill-boomerang (bone), skill-orbit (egg), skill-stomp (footprint),
  skill-meteor (flaming rock), skill-thorns (thorn sprouts), skill-roar (JAGGED burst — never concentric arcs),
  skill-vitality (heart), skill-swift (winged foot or feather), skill-might (claws), skill-haste (lightning),
  skill-magnet (horseshoe magnet), skill-regen (leaf with plus), skill-heal (roast meat), skill-gold (coin pile).

BATCH 6 — UI kit (no text on any piece; 9-slice friendly: ornaments only in the corners, edges plain so they can stretch)
  ui-panel (result/pause card, cream paper + orange frame) 512x512, ui-card (level-up card) 384x512,
  ui-btn-gold, ui-btn-blue, ui-btn-stone (pill buttons, 512x160), ui-ribbon-green, ui-ribbon-red (banner with folded
  tails, 768x192), ui-medallion (round level badge 192x192), ui-bar-frame (thin frame for XP/boss bar 512x64).
  For each 9-slice piece write its insets in art/final/slices.json: {"ui-panel":[l,t,r,b], ...} in pixels.
  logo.png: "DINO SWARM SURVIVORS" game logo (this one HAS text — spell it exactly), 1200x600.
  Follow docs/ui-rules.md (owner's rejected patterns: no generic boxed look, light frames on panels, heavy only on
  anchors, one primary per panel).

BATCH 7 — zones + store art
  ground-1.png (Lava Fields: dark basalt, faint ember cracks, calm), ground-2.png (Frost Peaks: packed snow, faint
  ice), same seamless rules. thumb-628.png final Poki thumbnail (1:1, raptor close-up fighting a swarm, no text,
  no border, strong contrast, avoid #83FFE7) + thumb-94.png check. Optionally 2 alternative thumbnails for an A/B test.
```

## Ghi chú cho Claude/Codex (không gửi cho Antigravity)
- Cách đặt tên ở đây khớp với tên ảnh trong code (`player-<loài>-<dạng>-<tư thế>`, `boss-<n>-<mảnh>`,
  `skill-<id>`, `ui-*`, `ground-<vùng>`). Quái chỉ có `enemy-<kind>`, không tách theo vùng.
  Code phải tự dùng `enemy-<kind>` khi không có `enemy-<kind>-<vùng>`, rồi đổi tông màu theo vùng bằng code.
- Nền đất `ground-<vùng>` thay cho mẫu nền vẽ bằng code trong `game.ts` (`makeGround`).
