# Antigravity: brief 03, thử 1 nhân vật người tiền sử + chuyển động + nâng cấp đồ

Mục đích: chủ game muốn tự xem nhân vật chính **chuyển động ra sao** và **đổi đồ qua từng bậc trông thế nào**:
từ đóng khố, ngực trần nhiều lông, cho tới mũ sọ khủng long, kiếm và khiên.
Đây chỉ là bản thử. Chưa vẽ thứ gì khác.

```
ROLE: Art producer for "Dino Swarm Survivors" (top-down survivor game for Poki). The owner is considering a CAVEMAN
hero instead of a dino hero. Build ONE character test so the owner can SEE its motion and its gear upgrades.
Style anchor: art/style-test/mock-gameplay-caveman-armored.png (match its line work, shading, palette and the
caveman's face/proportions). Read AGENTS.md and ART-DIRECTION.md sections 5 and 6 first.
PERMISSIONS: write ONLY inside art/caveman-test/. Do not touch anything else. Do not run git.

CHARACTER: "Grok", a scrappy, cheeky caveman (fierce grin, big expressive eyes, stocky, NOT a baby/chibi, NOT gory).
Same face, body shape and skin tone in every image. 3/4 view FACING RIGHT. Kid-friendly.

GEAR TIERS (the in-game "evolution" — each tier is a clear visual jump):
  tier 1 "Wild":     leopard-print loincloth, bare hairy chest, barefoot, wooden club.
  tier 2 "Hunter":   + bone chest armour and bone shoulder pad, wrist wraps, fur boots, BONE SWORD.
  tier 3 "Warlord":  + dino-skull helmet, spiked turtle-shell shield, glowing amber FIRE SWORD, small cape.

POSES per tier (same canvas 768x768 for EVERYTHING; feet on the SAME baseline at the SAME x in every image):
  idle    — ready stance, weapon held low.
  run     — mid-stride, body leaning forward, legs long.
  attack  — big swing follow-through (weapon across the body).
  Files: art/caveman-test/grok-t1-idle.png, grok-t1-run.png, grok-t1-attack.png, same for t2 and t3 (9 images).

LAYER TEST (to compare two production methods):
  Also deliver tier 1 and tier 3 bodies WITHOUT the weapon/shield (grok-t1-body-idle.png, grok-t1-body-run.png,
  grok-t3-body-idle.png, grok-t3-body-run.png) and the weapons/shield as separate images on their own 512x512
  canvas, drawn pointing straight UP with the grip at the canvas centre-bottom area: weapon-club.png,
  weapon-bone-sword.png, weapon-fire-sword.png, shield-turtle.png. Note in a JSON file
  art/caveman-test/anchors.json the hand position (x,y in the 768 canvas) in each body pose and the grip point
  (x,y in the 512 canvas) of each weapon.

ANIMATION PREVIEW (this is what the owner will look at):
  Write art/caveman-test/preview.html — ONE standalone file (no external libraries, no CDN, opens by double-click).
  It loads the PNGs above and shows, on a calm green ground (#7da05a), side by side:
   A) "Full poses": for each tier, loops idle (breathing: slight squash/stretch ~2 s) → run (alternate idle/run
      frames at ~7 Hz with a 4–6 px bob and small forward lean) → attack (show attack pose 0.15 s with a curved
      orange slash arc drawn on top, then back to run), and buttons to switch tier 1 / 2 / 3.
   B) "Layered": body poses + the weapon image rotated in code around the hand anchor — the swing is a real
      rotation (wind-up -60°, fast swing to +100°, ease back) — for tier 1 (club) and tier 3 (fire sword + shield).
   C) "Tier-up": a 1.3 s upgrade moment — flash, the character pops (scale 1.0 → 1.15 → 1.0), gear changes from
      tier N to N+1, a few sparkles. Button "UPGRADE".
   Also show each tier at REAL GAME SIZE (~90 px tall) next to the big version, so the owner can judge readability.
  Keep the code simple and readable; it is a review page, not game code.

QUALITY GATE: transparent clean edges, same face/proportions in all 9 poses, the feet never jump when frames swap
(check in the preview), gear readable at 90 px, no text in images. Write art/caveman-test/REPORT.md: prompts used,
what worked, which method (A full poses vs B layered weapon) looks better and why, problems found. Then STOP.
```

**Chủ game duyệt:** mở `art/caveman-test/preview.html` bằng trình duyệt (bấm đúp vào file).
