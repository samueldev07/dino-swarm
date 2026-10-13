# Antigravity: brief 06, nền đất và vật trang trí cho Zone 2 "Ember Marsh"

Dán nguyên đoạn dưới đây vào Antigravity, thư mục làm việc `D:\REMOTION\games\dino-swarm`.
Antigravity chỉ vẽ ảnh, không sửa code. Xong thì dừng lại chờ chủ game duyệt.
Claude lo phần quái của Zone 2 (vẽ bằng G-Labs, đang làm), Antigravity chỉ làm nền và vật trang trí.

```
ROLE: environment artist for "Pitchfork & Pot", a top-down survivor game for Poki (dark FOLK FAIRY-TALE style).
Zone 1 "Mossy Hollow" is finished. You make the ground and props for Zone 2 "EMBER MARSH": a smouldering peat bog at dusk -
dark wet peat, olive reeds, still black-green water pools, faint orange ember glow in cracks of dry peat, grey ash.

STYLE ANCHORS (attach to EVERY generation, and read the rules):
  art/STYLE-LOCK/README.md          style rules (palette, outline, texture) - obey all of them
  public/sprites/ground-0.webp      the approved Zone 1 ground tile: SAME scale, SAME detail density, SAME calm low contrast
  public/sprites/prop-mossy-rock.webp, prop-stump-large.webp   approved Zone 1 props: SAME outline, size and finish
PERMISSIONS: write ONLY inside art/zone2/map/ . Do not edit src/, public/, tools/ or any other file. Do not run git.

RULES THE OWNER ALREADY ENFORCED (rejected before - do not repeat):
  - The ground must be CALM and fairly light so the hero and enemies pop. No busy noise, no strong highlights.
  - NO loose leaves, twigs, pebbles or small scattered bits on the ground tile (they looked like glitches / "dirty").
  - NO white or dark halos around props (clean alpha edges, no leftover background pixels).
  - Props are FEW and simple, same thick uneven dark-brown ink outline as the characters (#221a14), flat muted colours
    with one soft shadow tone. NO 3D render look, NO glossy water, NO neon glow.

DELIVERABLES
  1. ground-1.png   1024x1024, SEAMLESS tile (check it tiled 2x2: no visible seams or repeating blobs), top-down 90 degree view,
     uniform flat lighting across all four edges, a bit DARKER and WARMER than ground-0 but still calm (mean brightness
     within ~15% of ground-0). Peat soil + patches of olive moss + a few soft darker damp patches. No water pools on the tile.
     Also save ground-1-tiled2x2.jpg for review.
  2. Props, transparent PNG, about 380 px wide, top-down 3/4 view like the Zone 1 props, contact shadow painted in:
       prop-marsh-pool.png     small still bog pool, black-green water, reeds at one edge
       prop-marsh-reeds.png    a clump of tall olive reeds / cattails
       prop-marsh-stump.png    a burnt black tree stump with a faint ember glow in one crack and a thin wisp of smoke
       prop-marsh-bones.png    a half-sunk mossy ox skull with a broken cart wheel (one item, low and flat)
  3. art/zone2/map/REVIEW.png : the tile 2x2 with the four props placed sparsely on it at game scale, plus the hero
     (art/STYLE-LOCK/hero-master.png at ~145 px tall) standing in the middle, so the owner can judge readability.
  4. art/zone2/map/NOTES.md : the prompts you used and anything you are unsure about.
```

Khi Antigravity xong, đưa Claude thư mục `art/zone2/map/`. Claude sẽ kiểm tra viền và đường nối, rồi gắn vào game.
