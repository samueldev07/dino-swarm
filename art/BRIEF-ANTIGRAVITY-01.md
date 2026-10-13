# Antigravity: art brief 01 (style test)

Bạn dán nguyên đoạn dưới đây vào Antigravity, thư mục làm việc `D:\REMOTION\games\dino-swarm`.
Chủ game sẽ duyệt `art/style-test/compare.png` trước khi làm bất cứ ảnh nào khác.

```
ROLE: You are the art producer for "Dino Swarm Survivors", a top-down survivor-like dinosaur game for Poki
(US market, players are mostly kids/teens/casual, phone + desktop). Read AGENTS.md (your permissions) and
ART-DIRECTION.md (the style rules — read every section) before starting.

PERMISSIONS: write ONLY inside art/style-test/ . Do not touch src/, public/, tools/, playtest/ or any other file.
Do not run git. Do not install anything globally.

TASK: Style test only — the owner will choose ONE style from your results. Produce the SAME set twice:
  style V = hand-drawn VECTOR sticker look: thick tapered dark-brown outline (#2a1d16, ~3% of character height),
  flat colour + ONE hard cel-shadow tone, light from top-left, max one small highlight, no gradients, no textures,
  no 3D render look; white sticker rim (~2% of height) ONLY around the player dino and pickups.
  style P = HAND-PAINTED: visible brush strokes, gouache/oil feel, warm top-left key light, dark coloured
  (not black) thin outline, detailed on the subject, loose and soft in the background.
Both styles: expressive, slightly scruffy and fierce — NOT cute baby/chibi (the owner rejected chibi), and NOT
glossy 3D cartoon (rejected too). Big head (~40% of body), big readable eyes, exaggerated poses.

ITEMS (per style, filenames exactly as written, PNG, transparent background unless stated):
 1. Player raptor, form 1 — orange body (#f08a3a family), cream belly, dark-brown back stripes, small crest.
    3/4 side view FACING RIGHT, feet on the same baseline in all three poses, same canvas 768x608:
      player-raptor-1-idle.png   (standing, slight crouch, mouth closed)
      player-raptor-1-run.png    (mid-stride: legs spread long, body leaning forward, tail straight back)
      player-raptor-1-bite.png   (jaw wide open, head lunging forward, teeth visible)
    The three poses must look like the SAME character (same colours, markings, proportions, line weight).
 2. enemy-grub.png — small teal (#4a9aa8 family) segmented grub critter with one angry eye, facing right, 384x320.
 3. boss-1.png — huge horned purple brute (#9a7ab8 family), cream horns, wide toothy mouth, 1024x900, facing right.
 4. mock-gameplay.png — 1920x1080 OPAQUE mock screenshot, top-down camera: calm green jungle ground (low contrast,
    no clutter), the raptor in the centre, ~30 grubs closing in, a few amber XP gems (small orange-yellow crystals),
    one orange bite-slash arc, the boss at the right edge. NO UI, NO text. This judges readability: the player and the
    amber must pop; the ground must stay quiet.
 5. ui-sample.png — 1200x800 OPAQUE: one level-up card (cream paper card, round skill icon of a fire-spit at the
    top, empty space where text goes — DO NOT draw letters), one big gold pill button, one blue pill button, one
    round medallion badge, in the same style. No text anywhere.
 6. thumb-628.png — 628x628 OPAQUE Poki thumbnail: the raptor big and close, mid-roar/bite, a swarm of enemies
    behind, strong contrast. NO text, NO border, NO padding. Avoid the colour #83FFE7 (Poki's background).
    Also save thumb-94.png = the same image scaled to 94x94 (checks readability at small size).

Save as art/style-test/V/<file> and art/style-test/P/<file>.

QUALITY GATE (check each image; regenerate anything that fails — do not fix with filters):
 - transparent background is clean: no leftover halo or fringe, soft (anti-aliased) edges;
 - outline weight consistent between items of the same style;
 - light from top-left on everything;
 - silhouette readable when filled solid black at 48 px;
 - no text, no fake signatures/logos, no extra limbs/toes/teeth errors, characters face RIGHT;
 - the three raptor poses align on the same baseline and share proportions.

DELIVER:
 - art/style-test/compare.png: two rows (V on top, P below); columns = idle, run, bite, grub, boss, thumb-94,
   and below each row the mock-gameplay and ui-sample at reduced size. Label rows "V" and "P" in the margin only.
 - art/style-test/REPORT.md: the prompts and reference images you used per item (so we can reproduce the style),
   pass/fail per quality-gate check per image, and which style you think reads better on a phone and why.
Then stop and wait for the owner's choice.
```

## Sau khi chủ game chọn
Claude viết **brief 02**: toàn bộ nhân vật, quái, trùm (có tách mảnh), vật phẩm, nền và bộ giao diện,
dùng ảnh khủng long đã duyệt làm ảnh mẫu bắt buộc.
