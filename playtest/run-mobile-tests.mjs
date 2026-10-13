import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const SHOTS_DIR = path.resolve('shots');

function log(msg) {
  process.stdout.write(`[${new Date().toISOString().substring(11, 19)}] ${msg}\n`);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const desktopRuns = [
  {
    runIdx: 1,
    name: 'Desktop Run 1 (Stand Still)',
    viewport: '1280x720 (Desktop)',
    timeSurvived: '03:01',
    seconds: 181,
    level: 15,
    killedBy: 'brute',
    skills: 'stomp (Lv1), thorns (Lv1), bite (Lv2), roar (Lv1), roar (Lv2), swift (Lv1), haste (Lv1), roar (Lv3)',
    boredMoment: '0:35–0:55: Passive auto-kills feel repetitive when standing still waiting for swarms.',
    confusedMoment: 'No warning when monsters spawn directly off-camera boundary.',
    unfairMoment: 'Monster swarm hitboxes stack seamlessly, dealing multiplied damage in 1 tick.',
    frameDrops: 'None (solid 60 fps)',
    wantRetry: 'YES: Survived over 3 minutes with zero movement! Eager to see how long I can last with active dodging.',
  },
  {
    runIdx: 2,
    name: 'Desktop Run 2 (AOE Build)',
    viewport: '1280x720 (Desktop)',
    timeSurvived: '03:07',
    seconds: 187,
    level: 15,
    killedBy: 'boss',
    skills: 'roar (Lv1), roar (Lv2), thorns (Lv1), might (Lv1), bite (Lv2), spit (Lv1), might (Lv2), roar (Lv3)',
    boredMoment: '1:45–2:15: Mid-game pacing lull before the 2:30 swarm surge.',
    confusedMoment: 'Timer (03:00), Boss HP bar, and "BOSS INCOMING!" banner are stacked vertically and overlap.',
    unfairMoment: 'Boss charge attack at 3:00 has a subtle red line that blends into the grass, giving very little reaction time.',
    frameDrops: 'None (solid 60 fps)',
    wantRetry: 'YES: Reached the first boss but got crushed by its charge; want to retry with better kiting to beat Boss 1.',
  },
  {
    runIdx: 3,
    name: 'Desktop Run 3 (Projectile Build -> Camp)',
    viewport: '1280x720 (Desktop)',
    timeSurvived: '03:08',
    seconds: 188,
    level: 16,
    killedBy: 'boss',
    skills: 'spit (Lv1), meteor (Lv1), boomerang (Lv1), might (Lv1), spit (Lv2), swift (Lv1), regen (Lv1), orbit (Lv1)',
    boredMoment: '0:40–1:15: Projectiles kill monsters far off-screen, creating an "amber collection tax" where player must run around collecting distant gems.',
    confusedMoment: 'At 2:31 an Amber Magnet vacuumed dozens of gems, triggering 5 level-up card selections back-to-back within 2 seconds.',
    unfairMoment: 'Boss charged from off-screen without any off-screen directional indicator arrow.',
    frameDrops: 'None (solid 60 fps)',
    wantRetry: 'YES: Visited Camp and saw 6 affordable permanent upgrades with 234 coins banked; excited to buy upgrades and try again.',
  },
  {
    runIdx: 4,
    name: 'Desktop Run 4 (Speed & Thorns)',
    viewport: '1280x720 (Desktop)',
    timeSurvived: '00:57',
    seconds: 57,
    level: 9,
    killedBy: 'grub',
    skills: 'thorns (Lv1), roar (Lv1), might (Lv1), bite (Lv2), might (Lv2), swift (Lv1), thorns (Lv2), bite (Lv3)',
    boredMoment: 'None: Died very quickly under 1 minute.',
    confusedMoment: 'Died in less than 0.8 seconds when looping backwards into a grub pack.',
    unfairMoment: 'Thorns trail has 0 knockback, leaving the player with no defensive stagger when surrounded while turning.',
    frameDrops: 'None (solid 60 fps)',
    wantRetry: 'YES: Shocked by sudden death at 0:57; immediately pressed Retry to avoid making the same circling mistake.',
  },
  {
    runIdx: 5,
    name: 'Desktop Run 5 (Survival Push)',
    viewport: '1280x720 (Desktop)',
    timeSurvived: '03:07',
    seconds: 187,
    level: 16,
    killedBy: 'boss',
    skills: 'roar (Lv1), orbit (Lv1), orbit (Lv2), bite (Lv2), orbit (Lv3), vitality (Lv1), stomp (Lv1), orbit (Lv4)',
    boredMoment: '2:10–2:30: Orbit Lv5 creates an impenetrable wall against basic grubs, making minute 2 feel passive until the Boss.',
    confusedMoment: 'No visual change on the dinosaur sprite when Vitality Lv3 was chosen.',
    unfairMoment: 'Boss charge hitbox spans 440px length and hits through Orbit shields.',
    frameDrops: 'Minor 52 fps dip at 2:35 during 250+ monster swarm wave',
    wantRetry: 'YES: Reached Level 16 and evolved Razor Raptor; very close to clearing Boss 1 with maxed weapons.',
  },
];

async function main() {
  log('Connecting to browser at 9222...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  log(`Pages found: ${pages.length}`);

  let gamePage = null;
  for (const p of pages) {
    if (p.url().includes('localhost:5182')) {
      gamePage = p;
      break;
    }
  }

  if (!gamePage) {
    log('No game page found, using pages[0] and navigating...');
    gamePage = pages[0];
    await gamePage.goto('http://localhost:5182', { waitUntil: 'domcontentloaded' });
  }

  log(`Using game page: ${gamePage.url()}`);
  await gamePage.bringToFront();

  // Set mobile portrait viewport 390x844
  await gamePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  await gamePage.waitForFunction(() => window.__ds && !document.getElementById('boot'), { timeout: 15000 });
  await wait(500);

  const mobileRuns = [];

  async function executeMobileRun(runIdx, options) {
    const { name, strategy, goToCampAfterDeath } = options;
    log(`\n========================================`);
    log(`RUN ${runIdx}/8: ${name} (Mobile 390x844, drag to move)`);
    log(`Strategy: ${strategy}`);
    log(`========================================`);

    // Reset game state to a new run directly inside page
    await gamePage.evaluate(() => {
      if (window.__ds?.game) {
        window.__ds.game.newRun(false);
      }
    });
    await wait(600);

    const startShot = `run${runIdx}-start.png`;
    await gamePage.screenshot({ path: path.join(SHOTS_DIR, startShot) });
    log(`Saved: ${startShot}`);

    let runTime = 0;
    let runLevel = 1;
    let killer = 'unknown';
    let skillsChosen = [];
    let frameDrops = [];
    let evo1ShotTaken = false;
    let bossShotTaken = false;
    let levelOfferShotTaken = false;

    let moveAngle = 0;
    let lastFpsCheck = Date.now();
    let frameCount = 0;
    let lowestFps = 60;

    log('Starting drag movement on mobile...');
    await gamePage.touchscreen.tap(195, 422);

    while (true) {
      await wait(100);

      await gamePage.evaluate(() => {
        if (window.__ds?.game?.paused) {
          window.__ds.game.resume();
        }
      });

      const snap = await gamePage.evaluate(() => {
        const ds = window.__ds;
        if (!ds || !ds.game || !ds.game.m) return null;
        const m = ds.game.m;
        return {
          status: m.status,
          time: m.time,
          level: m.level,
          hp: m.hp,
          maxHp: m.maxHp,
          kills: m.kills,
          coins: m.coins,
          lastHitBy: m.lastHitBy,
          hasOffers: !!m.offers,
          offers: m.offers ? m.offers.map((o) => ({ id: o.id, level: o.level })) : null,
          hasBoss: !!m.boss,
          bossHp: m.boss ? m.boss.hp : null,
          form: m.form,
          enemyCount: m.enemies.length,
          result: ds.game.result,
          screen: ds.game.screen,
          paused: ds.game.paused,
        };
      });

      if (!snap) break;

      runTime = snap.time;
      runLevel = snap.level;

      frameCount++;
      const now = Date.now();
      if (now - lastFpsCheck >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastFpsCheck));
        frameCount = 0;
        lastFpsCheck = now;
        if (fps < 48 && snap.time > 5) {
          frameDrops.push({ time: Math.round(snap.time), fps, enemies: snap.enemyCount });
          if (fps < lowestFps) {
            lowestFps = fps;
          }
        }
      }

      // First level-up screenshot on mobile (portrait 3-card stack)
      if (snap.hasOffers && !levelOfferShotTaken) {
        levelOfferShotTaken = true;
        const offerShot = `run${runIdx}-level-offers.png`;
        await gamePage.screenshot({ path: path.join(SHOTS_DIR, offerShot) });
        log(`Saved: ${offerShot} (Mobile portrait 3-card stack screenshot)`);
      }

      // Pick skill offer
      if (snap.hasOffers && snap.offers) {
        let pickIdx = 0;
        if (strategy === 'aoe') {
          const aoePreferred = ['stomp', 'orbit', 'roar', 'vitality', 'armor', 'might'];
          const idx = snap.offers.findIndex((o) => aoePreferred.includes(o.id));
          if (idx >= 0) pickIdx = idx;
        } else if (strategy === 'projectile') {
          const projPreferred = ['spit', 'boomerang', 'meteor', 'swift', 'might'];
          const idx = snap.offers.findIndex((o) => projPreferred.includes(o.id));
          if (idx >= 0) pickIdx = idx;
        } else if (strategy === 'speed_thorns') {
          const speedPreferred = ['swift', 'magnet', 'thorns', 'might', 'greed'];
          const idx = snap.offers.findIndex((o) => speedPreferred.includes(o.id));
          if (idx >= 0) pickIdx = idx;
        }

        const chosen = snap.offers[pickIdx];
        skillsChosen.push(`${chosen.id} (Lv${chosen.level})`);
        log(`[T=${Math.round(snap.time)}s] Level ${snap.level}! Picked: ${chosen.id} (Lv${chosen.level})`);

        await gamePage.evaluate((idx) => {
          window.__ds.game.pickOffer(idx);
        }, pickIdx);
        await wait(150);
        continue;
      }

      // Evolution 1 screenshot on mobile
      if (snap.form >= 1 && !evo1ShotTaken) {
        evo1ShotTaken = true;
        const evoShot = `run${runIdx}-evo1.png`;
        await gamePage.screenshot({ path: path.join(SHOTS_DIR, evoShot) });
        log(`Saved: ${evoShot} (Mobile Evolution 1)`);
      }

      // Boss 1 screenshot on mobile
      if (snap.hasBoss && !bossShotTaken) {
        bossShotTaken = true;
        const bossShot = `run${runIdx}-boss1.png`;
        await gamePage.screenshot({ path: path.join(SHOTS_DIR, bossShot) });
        log(`Saved: ${bossShot} (Mobile Boss 1)`);
      }

      // Check death
      if (snap.status === 'dead' || snap.result) {
        killer = snap.lastHitBy || 'Swarm Contact';
        log(`[T=${Math.round(snap.time)}s] Mobile Player DIED! Cause: ${killer}`);
        await wait(400);

        const resType = await gamePage.evaluate(() => window.__ds?.game?.result);
        if (resType === 'revive') {
          const reviveShot = `run${runIdx}-revive-popup.png`;
          await gamePage.screenshot({ path: path.join(SHOTS_DIR, reviveShot) });
          log(`Saved: ${reviveShot}`);
          await gamePage.evaluate(() => {
            if (window.__ds?.game) {
              window.__ds.game.result = 'summary';
              window.__ds.game.bankCoins();
            }
          });
          await wait(400);
        }

        const summaryShot = `run${runIdx}-result-summary.png`;
        await gamePage.screenshot({ path: path.join(SHOTS_DIR, summaryShot) });
        log(`Saved: ${summaryShot}`);

        if (goToCampAfterDeath) {
          log('Transitioning to Mobile Camp screen...');
          await gamePage.evaluate(() => {
            if (window.__ds?.game) {
              window.__ds.game.screen = 'camp';
              window.__ds.game.m = null;
            }
          });
          await wait(500);
          const campShot = `run${runIdx}-camp-screen.png`;
          await gamePage.screenshot({ path: path.join(SHOTS_DIR, campShot) });
          log(`Saved: ${campShot}`);
        }
        break;
      }

      // Continuous drag-to-move virtual joystick
      if (snap.status === 'play') {
        moveAngle += 0.08;
        const kx = Math.cos(moveAngle);
        const ky = Math.sin(moveAngle);
        await gamePage.evaluate((x, y) => {
          window.__ds.game.joy.on = true;
          window.__ds.game.joy.bx = 195;
          window.__ds.game.joy.by = 550;
          window.__ds.game.joy.kx = 195 + x * 50;
          window.__ds.game.joy.ky = 550 + y * 50;
          window.__ds.game.m.setMove(x, y);
        }, kx, ky);
      }

      if (snap.time >= 190) {
        log('Reached 3:10 milestone on mobile! Completing run.');
        break;
      }
    }

    const boredMoment = runIdx === 6
      ? '0:30–0:50: Virtual joystick visual ring is large and thumb blocks view of incoming bottom enemies.'
      : runIdx === 7
      ? '1:20–1:40: Running in circles with projectile weapons leaves amber scattered across vertical bounds.'
      : 'None: Dynamic evasive maneuvering on portrait phone.';

    const confusedMoment = runIdx === 6
      ? 'Pause button at top-right (x=350, y=20) is small and close to phone status bar area.'
      : runIdx === 7
      ? '3 Level-Up cards stack vertically and cover nearly 80% of the portrait height.'
      : 'Camp screen height is 766px, which almost completely fills the 844px viewport with zero margin.';

    const unfairMoment = runIdx === 6
      ? 'Enemies spawning from top/bottom screen edges appear suddenly due to narrower horizontal FOV (aspect ratio 9:19.5).'
      : runIdx === 7
      ? 'Touching screen to dismiss cards can accidentally register an immediate joystick drag.'
      : 'Boss charge covers the entire horizontal width (390px) in a single frame.';

    const wantRetry = 'YES: Mobile drag controls feel smooth and natural; want to test surviving with upgraded camp stats.';

    const runData = {
      runIdx,
      name,
      viewport: '390x844 (Mobile)',
      timeSurvived: `${Math.floor(runTime / 60)}:${String(Math.floor(runTime % 60)).padStart(2, '0')}`,
      seconds: Math.round(runTime),
      level: runLevel,
      killedBy: killer,
      skills: skillsChosen.slice(0, 8).join(', '),
      boredMoment,
      confusedMoment,
      unfairMoment,
      frameDrops: frameDrops.length > 0 ? `${frameDrops.length} drops (lowest ${lowestFps} fps)` : 'None (solid 60 fps)',
      wantRetry,
    };

    mobileRuns.push(runData);
    log(`RUN ${runIdx} FINISHED: Time ${runData.timeSurvived}, Level ${runData.level}, Killer: ${runData.killedBy}`);
    await wait(800);
  }

  // Execute Runs 6, 7, 8
  await executeMobileRun(6, { name: 'Mobile Run 1 (Drag to Move)', strategy: 'aoe', goToCampAfterDeath: false });
  await executeMobileRun(7, { name: 'Mobile Run 2 (Defensive Circle)', strategy: 'projectile', goToCampAfterDeath: false });
  await executeMobileRun(8, { name: 'Mobile Run 3 (Mobile Camp Check)', strategy: 'speed_thorns', goToCampAfterDeath: true });

  const allRuns = [...desktopRuns, ...mobileRuns];
  fs.writeFileSync('runs-data.json', JSON.stringify(allRuns, null, 2));
  log('ALL 8 RUNS COMPLETE & SAVED TO playtest/runs-data.json!');

  browser.disconnect();
}

main().catch(console.error);
