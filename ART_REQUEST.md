# Dino Swarm Survivors — Art Request

Everything the game can display as real art, in the order it matters.
Every prompt is ready to paste in [`art/prompts.csv`](art/prompts.csv)
(columns `key, priority, size, prompt`), so a batch script can run the whole
list unattended.

The game already runs without any of it: each asset has a procedural
stand-in that disappears the moment the real file lands.

## Status

**All 42 assets are generated and in the game** (07/10/2026, G-Labs
`nano_banana_pro`, styled from the reference mockup). This document stays as
the spec for regenerating or extending the set.

## Generating through G-Labs

```bash
# 1. build jobs (style reference attached to every job)
python tools/build_glab_jobs.py --keys dino-01                  # style anchor first
python tools/build_glab_jobs.py --priority P0 --anchor dino-01  # Pals match the anchor
# 2. call the webhook (config with the API key lives in the glab-footage skill, not here)
node ~/.claude/skills/glab-footage/scripts/glab.mjs art/glab-jobs.json      --config config-game-asset.json --out art/raw --concurrency 3
# 3. cut out, resize, write manifest
python tools/prep_sprites.py
```

`glab.mjs` skips keys already present in `art/raw`, so to redo one asset
delete its raw file and rerun with `--keys <key>`.

## How an asset gets into the game

1. Generate the image and save it as `art/raw/<key>.png` (any of png / jpg / webp).
2. Run `python tools/prep_sprites.py`
   - removes the flat background, trims, pads to square, resizes
   - writes `public/sprites/<key>.png` and refreshes `manifest.json`
3. Reload the game. Nothing else changes.

A file that is missing is simply not requested — no broken images, no 404s.

## Style bible

Taken from the reference mockup and fixed for every asset:

| Rule | Why |
|---|---|
| Chibi proportions — big head, small body, big glossy eyes with one white highlight | Reads at 100 px on a phone |
| **Thick dark brown outline** (`#3b2a1f`), not black | Matches the in-game UI ink colour |
| Soft cel shading, vibrant saturated colours | Pops against the sand board |
| **Plain flat white background, no ground shadow** | `prep_sprites.py` cuts the backdrop out; the game draws its own shadow |
| **Pals face RIGHT, monsters face LEFT** | Champion stands left of the enemy on the ledge |
| Full body, centred, filling ~80% of the frame | Consistent scale after trimming |
| No text anywhere | Text is rendered by the game in any language |

**Negative prompt** (if the tool supports one):
`text, watermark, signature, multiple characters, cropped, cut off, realistic, photo, 3d render, scary, gore, dark background, gradient background, ground shadow, frame, border`

**Consistency tip:** generate all twelve Pals in one session with the same
seed/style reference (attach the mockup as style reference if the tool allows),
then regenerate only the outliers. A herd where one Pal looks like it came
from a different game is more noticeable than any single weak sprite.

## The twelve Pals

Colours already match the procedural versions and the tier badges in game
(`TIERS` in `src/game/config.ts`). Each tier must be recognisable by
silhouette alone — the Pal book shows undiscovered tiers as black shapes.

| Key | Name | Species | Signature feature |
|---|---|---|---|
| `dino-01` | Pebble | baby | lime green, leaf sprout on head |
| `dino-02` | Nibbles | baby | mint teal, two horn nubs |
| `dino-03` | Dash | raptor | sky blue, three feather spikes |
| `dino-04` | Spike | spiky | orange, spikes along back |
| `dino-05` | Crest | parasaurolophus | yellow, curved tube crest |
| `dino-06` | Plato | stegosaurus | lavender, big back plates |
| `dino-07` | Shelly | ankylosaurus | green shell with bumps, tail club |
| `dino-08` | Trike | triceratops | tangerine, frill + three horns |
| `dino-09` | Sail | spinosaurus | coral red, tall striped sail |
| `dino-10` | Longneck | brachiosaurus | royal blue, long raised neck |
| `dino-11` | Rex | T-rex | crimson, tiny arms, friendly toothy grin |
| `dino-12` | Titan | legendary | glowing cyan crystal armour, gold crown, aura |

## Full list by priority

**P0 — minimum for the game to look like a product (16 images)**
`dino-01` … `dino-12`, `egg`, `egg-lucky`, `enemy-1`, `boss-1`

- `egg` should be **neutral cream with light grey spots**: the game tints it
  to each tier's colour, so one egg image covers all twelve tiers.

**P1 — first world fully dressed (10 images)**
`bg-landscape-1` (1920×1080), `bg-portrait-1` (1080×1920), `cell`,
`cell-locked`, `ui-coin`, `ui-amber`, `ui-shop`, `ui-quest`, `ui-dex`, `ui-gear`

- Backgrounds must leave the **centre-bottom empty**: the board and the
  stone ledge are drawn on top. Horizon at ~38% from the top in landscape,
  ~29% in portrait.
- `cell-locked` has **no padlock**; the game draws the lock and the price.

**P2 — worlds 2 to 5 (16 images)**
`enemy-2..5`, `boss-2..5`, `bg-landscape-2..5`, `bg-portrait-2..5`

| World | Name | Monster | Backdrop |
|---|---|---|---|
| 1 | Fern Valley | mossy brown rock | sunset jungle, volcano, waterfalls |
| 2 | Ember Ridge | black basalt, lava | volcanic ridge, ember sky |
| 3 | Frost Fangs | icy rock, frost | snowy peaks, frozen lake |
| 4 | Moonlit Marsh | slate + glowing fungus | night swamp, big moon |
| 5 | Crystal Caves | amethyst crystal | glowing violet cavern |

Worlds 6+ cycle back through these five.

## Budget

Everything ships as WebP: sprites at 512 px (eggs, cells, icons smaller),
backgrounds at their native resolution, never upscaled. The full 42-asset set
is ~1.9 MB; world 1 on first load is ~0.6 MB. Keep it in that range: first-load time is the
single biggest lever on whether a web-game visitor stays. Backgrounds for
later worlds load only when the player reaches them.

## Not wanted

- Anything resembling another game's characters, logo or title art.
- Real-world brands, text, numbers, UI frames baked into images.
- Gore, sharp teeth on Pals 1–10, or monsters scary enough to upset a
  six-year-old — the audience is US kids and teens on school Chromebooks.
