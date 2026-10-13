# AGENTS.md: rules for every AI agent working on this repo

Repo: https://github.com/samueldev07/dino-swarm (private). Game: **Dino Swarm Survivors**, a survivor-like
HTML5 game (TypeScript + Canvas2D + Vite) built to pass Poki's tests. Owner: andienhuynh (Vietnamese speaker).
**Current phase: GAMEPLAY FIRST.** Art is placeholder (`src/game/sprites.ts`); do not work on visuals unless your task says so.

## Roles
| Agent | Role | Owns (may edit) | Never edits |
|---|---|---|---|
| **Claude** (lead) | Core rules, balance, Poki SDK, integration, QA, merges to `main` | everything; sole writer of `src/game/model.ts`, `src/game/config.ts`, `tools/**`, `src/engine/**`, `DESIGN.md`, `AGENTS.md` | — |
| **Codex** (support) | UI/UX features assigned in `AGENT-BRIEFS.md` | only the files listed in its current task (default: `src/game/game.ts`, `src/game/meta.ts`, new `src/game/missions.ts`) | `model.ts`, `config.ts`, `tools/**`, `src/engine/**`, `art/**` |
| **Antigravity** (support) | Real playtests, market research; art later | `playtest/**`; later `art/**`, `public/sprites/**` | anything in `src/**`, `tools/**` |

If you need a change in a file you do not own, **do not make it**: write it under "Requests for Claude" in your hand-off.

## Git workflow
1. `git pull origin main`, then work on your own branch: `codex/<topic>`, `antigravity/<topic>`, `claude/<topic>`.
2. **Never push to `main`** and never force-push someone else's branch. Only Claude merges into `main`.
3. Small commits with clear messages. Do not commit `node_modules/`, `dist/`, `.snaps/`, zips.
4. Before pushing, run:
   - `npm install` (first time)
   - `npm run build` (tsc strict + Vite, must pass)
   - `node --experimental-strip-types --no-warnings tools/test-model.ts` (must say "all passed")
5. Push your branch and write a hand-off file `handoff/<branch-name>.md`: what changed (file:line), how you
   verified it (viewports 1280x720 and 390x844 for UI), what is not done, and "Requests for Claude".
6. Claude reviews, runs tests + the balance bot, merges or sends notes back in the same hand-off file.

### Exception: Antigravity runs on the owner's main PC, in the same folder as Claude
It does **not** run git (no branch switching in a shared working copy). It only writes inside `playtest/`
(later `art/`), and Claude commits those files for it.

## Rules that always apply
- Game rules live only in `model.ts` (pure, no DOM). The view (`game.ts`) never decides rules.
- In-game text: American English. Reports to the owner: Vietnamese, plain words.
- UI rules: follow the owner's rejected-patterns list (copy kept in the brief): no boxed-everything, one primary
  button per panel, 44 px hit areas, text fitted to its box, no emoji icons, roar = jagged burst (never concentric arcs).
- Poki SDK rules: see `DESIGN.md` → "Poki SDK". Rewarded buttons are never green, carry the clapper icon, and
  always sit next to a plain option at least as big. Never add ad timers.
- Every `localStorage` access stays wrapped (`src/engine/storage.ts`).
- Gameplay changes are judged by the bot: `node --experimental-strip-types --no-warnings tools/balance-sim.ts --seeds 6`.
