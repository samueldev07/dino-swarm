# Antigravity: brief 05, chơi thử Pitchfork & Pot, báo lỗi và đánh giá cân bằng

Chạy game trước: mở terminal ở `D:\REMOTION\games\dino-swarm`, chạy `npm run dev`, rồi mở http://localhost:5182
(thêm `?debug` ở cuối địa chỉ để hiện số khung hình/giây). Dán nguyên đoạn dưới đây vào Antigravity:

```
ROLE: QA playtester + balance analyst for "Pitchfork & Pot" (a survivor-like for Poki: a farm boy with a pot helmet
holds off swarms of mushroom gnomes, bats, boar riders, orcs, torch goblins, trolls and an ogre boss; move only,
auto-attack, pick 1 of 3 skills per level, 10-minute runs, bosses at 3/6/9 min, camp upgrades between runs).
PERMISSIONS: write ONLY inside playtest/ (create playtest/round5/). Do NOT edit src/, public/, tools/, art/. Do not run git.
Fresh player: in the browser console run localStorage.removeItem('dss-save') and reload.

PART A - PLAY (real input, not scripts):
 1. 6 full runs on desktop 1280x720 (WASD) and 3 runs in a phone viewport 390x844 (drag to move, DevTools device mode).
    Vary the skill picks. One run: go to CAMP and buy upgrades between runs.
 2. Log per run in a table: time survived, level, killed by, skills taken, coins earned, FPS (from ?debug) at 1, 3, 5 min,
    moments of boredom / confusion / unfairness, whether you wanted to retry.
 3. BUGS: every defect with exact steps to reproduce + a screenshot in playtest/round5/shots/. Check especially:
    picking up gold coins and the coin counter, XP/level-up, chests, magnet, revive, pause (Esc/Space), level-up cards,
    result card buttons (RETRY / CAMP / REVIVE / x2 coins), camp purchases persisting after reload, missions progress,
    menu, sound toggle, window resize, phone portrait layout (nothing clipped or overlapping), text that is cut off,
    sprites with white/black halos, effects drawn in the wrong place, frame drops (note when and how many enemies).
 4. BALANCE: for each of the 5 weapons (Pitchfork Jab, Fire Flask, Spinning Pot Lids, Mallet Slam, Rockfall) and the
    6 passives, say if it feels too strong, too weak, or pointless; when does difficulty spike or go flat; is the first
    minute exciting; is boss 1 at 3:00 fair; how many runs until the first zone is cleared.

PART B - REPORT: playtest/round5/REPORT.md with: run table, a ranked BUG list (severity: blocker / major / minor),
a ranked list of the 10 biggest gameplay/feel problems with concrete fixes (numbers where possible), and what already
works well and must be kept. Keep it factual; every claim needs evidence (run number, timestamp or screenshot).
```

Khi Antigravity xong, đưa Claude đường dẫn `playtest/round5/REPORT.md`.
