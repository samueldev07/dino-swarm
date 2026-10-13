# Antigravity: brief 04, bộ giao diện phong cách cổ tích dân gian

Bạn dán nguyên đoạn dưới đây vào Antigravity, thư mục làm việc `D:\REMOTION\games\dino-swarm`.
Antigravity chỉ vẽ ảnh, không sửa code. Mỗi lô xong phải dừng lại chờ chủ game duyệt.

```
ROLE: UI artist for a top-down survivor game for Poki (US kids/teens/casual, phone + desktop). The game is moving to a
dark FOLK FAIRY-TALE style. Style anchors (attach as references to EVERY generation):
  art/folk/ref-char.png   (character style: thick uneven black-brown ink outline, flat colours + one soft shadow tone,
                           muted earthy palette, charming but slightly grim)
  art/folk/ref-scene.png  (scene mood: mossy forest, wood, parchment, iron)
Also read docs/ui-rules.md (the owner's REJECTED UI patterns - obey every rule) and AGENTS.md.

PERMISSIONS: write ONLY inside art/ui-folk/ . Do not edit src/, public/, tools/ or any other file. Do not run git.

MATERIALS: weathered wood planks, torn parchment, hand-forged dark iron with rivets, rope, leather straps, wax seals.
Same thick uneven ink outline as the characters. Light from top-left. NO glossy gradients, NO neon, NO 3D render look,
NO generic mobile-game gold-and-blue bevel. Text is drawn by the game: NO letters on any piece (except the logo).

BATCH 1 - core kit (PNG, transparent background, 9-slice friendly: ornaments only in the corners, plain edges that can stretch;
write the slice insets for each piece into art/ui-folk/slices.json as {"key":[left,top,right,bottom]} in pixels):
  ui-panel.png        512x512  parchment sheet on a wood frame (pause / result card)
  ui-card.png         384x512  level-up choice card (parchment, small iron corners, room for an icon at the top)
  ui-btn-primary.png  512x160  main action button (warm amber-painted wood plank) + ui-btn-primary-pressed.png
  ui-btn-ad.png       512x160  "watch ad" button - must NOT be green (Poki rule): muted blue-grey painted wood
  ui-btn-quiet.png    512x160  secondary button (plain dark wood)
  ui-ribbon-win.png   768x192  banner ribbon (moss green cloth, folded tails)  /  ui-ribbon-lose.png (dark red cloth)
  ui-medallion.png    192x192  round iron-rimmed wooden badge (level number goes inside)
  ui-bar-frame.png    512x64   thin iron frame for the XP bar and the boss bar (empty inside)
  ui-iconbtn.png      160x160  small round/rounded-square wooden button for pause / sound
  Then build art/ui-folk/mock-landscape.png (1920x1080) and mock-portrait.png (1080x1920): the in-game HUD
  (XP bar at the top with the level medallion, timer, pause button) over a forest-clearing background, plus the
  level-up screen with three cards, and the result card - using ONLY your pieces + placeholder text in a plain font
  ("LEVEL UP!", "Pitchfork Sweep", "RETRY") so the owner can judge the whole look. STOP for review.

BATCH 2 - icons (after approval). 256x256 PNG transparent, ONE family: round wooden disc with an iron rim, the glyph
painted in the same ink style, centred, readable at 42 px (test: shrink to 42 px and check every icon is still clear).
  Weapons: skill-sweep (pitchfork swing), skill-flask (fire flask), skill-sickle (spinning sickle boomerang),
  skill-geese (angry geese circling), skill-slam (big hammer hitting ground), skill-thunder (lightning bolt from a cloud),
  skill-bramble (thorny bramble trail), skill-horn (war horn blast - draw a jagged burst, NEVER concentric arcs).
  Passives: skill-stew (bowl of hearty stew = max HP), skill-boots (old boots = speed), skill-whetstone (whetstone =
  damage), skill-hourglass (cooldown), skill-lodestone (magnet stone = pickup range), skill-herbs (healing herbs = regen).
  Extra: skill-heal (roast meat), skill-gold (coin pile).
  HUD/pickups: icon-coin, icon-skull (kills), icon-xp (small amber crystal), icon-pause, icon-sound-on, icon-sound-off,
  icon-chest (treasure chest), icon-clapper (small film clapper = "this plays an ad").
  Build art/ui-folk/icons-sheet.png showing all icons at 256 px and at 42 px. STOP for review.

QUALITY GATE for every piece: clean transparent edges (no white halo), consistent outline weight across the kit,
same light direction, nothing touching the canvas edge, no text, no fake logos. Write art/ui-folk/REPORT.md with the
prompts used and pass/fail per piece. Regenerate failures instead of patching with filters.
```

## Ghi chú cho Claude (không gửi cho Antigravity)
- Tên chiêu mới dùng cho biểu tượng ở trên: Pitchfork Sweep, Fire Flask, Sickle Boomerang, Angry Geese, Hammer Slam,
  Thunder Strike, Bramble Trail, War Horn. Chiêu bổ trợ: Hearty Stew, Old Boots, Whetstone, Hourglass, Lodestone,
  Healing Herbs. Claude sẽ đổi tên trong `config.ts` cho khớp khi chủ game duyệt hướng cổ tích.
- Khi gắn vào game: các mảnh 9-slice đọc độ dày viền từ `slices.json` qua công cụ nhập ảnh (Codex vòng 2).
