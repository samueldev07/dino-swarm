# Dino Swarm Survivors

Idle merge game about dinosaurs, built to **Gameplay 1.0**
(`Primal_Pals_Gameplay_v1.pdf`). Buy eggs, merge two dinos of the same level
into the next one, watch your strongest dino fight on its own, beat the boss
of each stage and travel through three regions.

- **How the spec was implemented, and what the numbers do:** [DESIGN.md](DESIGN.md)
- **Art and how to regenerate it:** [ART_REQUEST.md](ART_REQUEST.md), [art/logo/README.md](art/logo/README.md)

TypeScript + Vite + Canvas2D, no runtime framework.

```bash
npm install
npm run dev      # http://localhost:5177
npm run build    # -> dist/, static, relative paths
node --experimental-strip-types --no-warnings tools/test-model.ts   # acceptance tests
node --experimental-strip-types --no-warnings tools/balance-sim.ts  # pacing simulator
```

## Code map

`src/engine/` knows nothing about dinosaurs, so the next game starts from it.

| File | Responsibility |
|---|---|
| `engine/canvas.ts` | Virtual design space (≥ 720×980) + DPR-capped canvas |
| `engine/input.ts` | One unified pointer (mouse + touch), drag-aware |
| `engine/loop.ts` | rAF loop, dt clamped to 50 ms |
| `engine/assets.ts` | Optional sprites from `sprites/manifest.json`, lazy-loaded |
| `engine/storage.ts` | localStorage that never throws |
| `engine/audio.ts` | Synthesised effects (rate-limited) + generative music |
| `engine/analytics.ts` | §13 events to `window.dataLayer` |
| `engine/ads.ts` | Ad adapter — **not wired in 1.0** (spec excludes ads) |
| `engine/num.ts` | Big-number / duration formatting |
| `game/config.ts` | Every rule number (`TUNING`), stages, regions, quests, tutorial |
| `game/model.ts` | **All game rules**, pure and DOM-free |
| `game/save.ts` | Versioned save + backup copy, single-writer tab lock |
| `game/art.ts` | Sprite-or-procedural drawing for every visual |
| `game/ui.ts` | Immediate-mode buttons, panels, plaques |
| `game/fx.ts` | Particles, floating numbers, shake |
| `game/game.ts` | Layouts, input, rendering, modals — calls the model |
| `tools/test-model.ts` | §13 acceptance tests against the real model |
| `tools/balance-sim.ts` | Pacing simulator; `--set key=value` tries tuning variants |
| `tools/prep_sprites.py` | Raw AI images → trimmed WebP sprites + manifest |
| `tools/build_glab_jobs.py` | Art prompts → G-Labs job list |

## Layouts

`game.ts` picks **landscape** when the window is at least 1.15× wider than
tall (Chromebooks, desktops), **portrait** otherwise (phones). Both are laid
out from the same virtual space, so nothing is letterboxed.

## Balance

All numbers live in `TUNING` in `src/game/config.ts`; the defaults are
exactly the spec. Try a variant in the simulator before changing the game:

```bash
node --experimental-strip-types --no-warnings tools/balance-sim.ts --set eggPriceBase=60,startGold=60
```

After any change, `tools/test-model.ts` must still pass — some cases pin the
§8 worked numbers, so they will (correctly) fail if the economy changes and
need updating together with the spec.

## Art

```bash
python tools/prep_sprites.py
```

turns `art/raw/<key>.*` into `public/sprites/<key>.webp` and rewrites the
manifest. Requires Pillow. Keys and prompts: `art/prompts.csv`; generation
through the G-Labs webhook is documented in `ART_REQUEST.md`.

## Ads

Gameplay 1.0 has no ads in the loop (§1, §12). `engine/ads.ts` (a
provider-neutral adapter that pauses/mutes the game and never gates progress)
is kept for a later version but is not imported anywhere.

## Dev handle

Dev builds expose `window.__pm` (`stage`, `input`, `game`, `assets`, …) for
inspection; it is stripped from production builds.
