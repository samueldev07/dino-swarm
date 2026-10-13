# Dino Swarm Survivors

Survivor-like dinosaur game (move only, auto-attack, pick 1 of 3 skills per level, 10-minute runs) built for Poki.
TypeScript + Canvas2D + Vite, no runtime framework. Build ~220 KB.

- Rules: `src/game/model.ts` (pure) + numbers in `src/game/config.ts`
- View: `src/game/game.ts`, placeholder art `src/game/sprites.ts`, missions `src/game/missions.ts`, save `src/game/meta.ts`
- Poki SDK wrapper: `src/engine/poki.ts`
- Docs: `DESIGN.md` (rules, Poki SDK, measured pacing), `ART-DIRECTION.md`, `AGENTS.md` (roles, permissions, git flow)

```
npm install
npm run dev                      # http://localhost:5182
npm run build                    # dist/ -> zip for Poki
node --experimental-strip-types --no-warnings tools/test-model.ts
node --experimental-strip-types --no-warnings tools/balance-sim.ts --seeds 6
```
