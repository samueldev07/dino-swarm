# Lệnh giao việc cho Codex và Antigravity (vòng gameplay 1, 13/10/2026)

Mỗi agent chỉ sửa đúng các file được liệt kê. Claude đang sửa `src/game/model.ts`, `src/game/config.ts`
và `tools/` cùng lúc (cân bằng, tiến hóa vũ khí, trùm, quái tinh anh), nên **không ai khác đụng vào 3 chỗ đó.**

---

## 1. Codex: trải nghiệm người chơi mới + màn kết quả + nhiệm vụ
Mở thư mục `D:\REMOTION\games\dino-swarm`, dán nguyên đoạn dưới đây:

```
You are working on "Dino Swarm Survivors", a survivor-like HTML5 game (TypeScript + Canvas2D, Vite) built for Poki.
Read first: DESIGN.md, TASKS.md, src/game/game.ts (the whole view), src/game/meta.ts, src/game/ui.ts,
src/engine/poki.ts, and the public API of src/game/model.ts (read only). Also read
C:/Users/84762/.claude/skills/game-ui-craft/SKILL.md — the owner's UI rules; follow them (no boxed-everything,
one primary button per panel, 44px hit areas, no emoji icons, text fitted with fitSize, etc.).

FILES YOU MAY EDIT: src/game/game.ts, src/game/meta.ts, and a NEW file src/game/missions.ts.
DO NOT EDIT: src/game/model.ts, src/game/config.ts, tools/**, src/engine/** (another agent owns them and
is changing them right now). If you need something from the model, write it under "Requests for Claude"
in your final report instead of editing the model.

Model API you can use (already added): m.lastHitBy (EnemyKind | 'spore' | null), m.rerolls, m.banishes,
m.reroll(): boolean, m.banish(i): boolean, plus everything already used in game.ts.

Implement, in this order:
1. Result flow (game.ts drawResult): on death show the SUMMARY card first, never an ad-first card.
   RETRY = the biggest gold button with a gentle pulse. If !m.revived, a secondary blue "REVIVE" button with
   the clapper icon (same size as CAMP, never bigger than RETRY) calls the existing rewardedBreak → m.revive().
   "x2 COINS" becomes a small blue tag with the clapper next to the coin pill (not a big middle button).
   CAMP stays a normal stone button only when the player can afford an upgrade; otherwise a quiet text link.
   Add "Knocked out by <Name>" (map EnemyKind → Grub, Bat, Beetle, Wolf, Shroom, Brute, Boss; 'spore' → "a spore")
   and ONE tip chosen by cause (e.g. spore → "Spores fly straight — sidestep them", boss → "Bosses charge in a line —
   move sideways", standing still → "Keep moving!"). Keep "NEW BEST TIME!".
   Bank coins exactly once (bankCoins) even when REVIVE is used later; if a revive happens after banking,
   bank only the extra coins at the next result.
   If a rewarded ad returns false, show a short toast "No ad available right now" (toasts sit high, under the HUD).
2. First-run teaching (only while meta.runs === 0):
   - The move hint stays until the player has moved for 2 s (this.movedFor), then fades over 0.4 s.
   - On the first kill: one-time banner "Collect amber to LEVEL UP!" and a pulsing ring on the nearest gem
     for 3 s; a small "XP" micro-label at the left end of the XP bar during run 1.
3. Level-up cards: add REROLL (shows m.rerolls) and BANISH (shows m.banishes) as two quiet secondary buttons
   under the cards (hidden when 0). BANISH: tap it, cards wiggle, tap a card to banish it; tap BANISH again to
   cancel. Keyboard: R = reroll. Keep the existing 0.35 s input lock after the cards appear.
4. Edge arrows: when a boss, a brute or a treasure chest is off-screen, draw a small arrow at the screen edge
   pointing to it (boss red, brute orange, chest gold), clamped inside the safe area, never over HUD buttons.
5. Missions (new src/game/missions.ts + meta.ts): 3 active missions persisted in Meta (add a field with a safe
   default in loadMeta so old saves load). Types: defeat N of an enemy kind, reach evolution form F, survive
   T seconds in a zone, defeat boss #k, reach level L. Rewards 30–80 coins. Count progress in game.ts from the
   model events you already receive (kill, evolve, bossDead, level) and m.time. Completed missions show on the
   result card ("MISSION COMPLETE +50") and are replaced by a new one. Show the 3 missions on the menu as a
   simple list (text + thin progress line, no boxed cards).
   Also on the result card: "N more coins for your next upgrade" with a thin progress line (cheapest camp upgrade).
6. Small fixes: Space also pauses/resumes during a run; window blur while level-up cards are open must not set
   paused (the cards already freeze the game); skip commercialBreak on RETRY when the previous run lasted < 20 s.

Verify: `npm run build` must pass (tsc strict) and
`node --experimental-strip-types --no-warnings tools/test-model.ts` must still pass.
Check every screen you changed at 1280x720 and 390x844 (no overlaps, nothing clipped).
Final report: list of changes with file:line, what you verified and how, and "Requests for Claude" (if any).
```

---

## 2. Antigravity: chơi thử thật + nghiên cứu đối thủ (không sửa code)
Trước tiên chạy game bằng lệnh `npm run dev` trong thư mục `D:\REMOTION\games\dino-swarm`
(trang game sẽ ở http://localhost:5182), rồi dán đoạn dưới đây vào Antigravity:

```
You are a playtester and market researcher for "Dino Swarm Survivors" (a Vampire-Survivors-like dinosaur game
made for Poki). DO NOT edit any file except inside D:\REMOTION\games\dino-swarm\playtest\ (create it).
Art is placeholder — ignore visual style; judge GAMEPLAY only.

PART A — Play the real game in your browser at http://localhost:5182.
To be a brand-new player, run `localStorage.removeItem('dss-save')` in the console and reload.
1. Play 5 full runs at desktop size (1280x720, WASD/arrows) and 3 runs in a phone viewport (390x844, drag to move).
   Try different skill choices each run; once, stand still on purpose; once, go straight to the Camp after dying.
2. For every run log: time survived, level, what killed you, skills taken, the moment you felt bored, the moment
   you felt confused, anything that felt unfair, frame drops (note the time), and whether you WANTED to retry and why.
3. Note every bug (with steps to reproduce) and every confusing screen (with a screenshot saved in playtest/shots/).
Write playtest/REPORT.md: a table of runs, then the TOP 10 gameplay problems ranked by how much they would hurt
Poki's playtime metric (average >= 3 min, >= 25% of sessions over 3 min), each with evidence and a suggested fix.

PART B — Research the 5 most popular survivor-like / "bullet heaven" games on poki.com (play each ~5 minutes).
For each: name + URL, how fast the first enemy and first level-up arrive (seconds), level-up cadence in minute 1,
how runs end, the meta loop between runs (currencies, upgrades, unlocks), where ads/rewarded ads appear, controls on
mobile, and what makes you press Retry. Write playtest/COMPETITORS.md with a comparison table and the 5 ideas most
worth copying into Dino Swarm (concrete, with numbers).
```

---

## Sau khi hai bên xong
Đưa cho Claude đường dẫn hai báo cáo: `playtest/REPORT.md`, `playtest/COMPETITORS.md`,
và phần báo cáo cuối của Codex. Claude sẽ ghép phần việc của Codex, chạy lại test và bot, rồi gộp mọi góp ý.
