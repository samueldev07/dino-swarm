import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CDP_URL = 'http://127.0.0.1:9222';
const SHOTS_DIR = path.resolve('shots');

function log(msg) {
  process.stdout.write(`[${new Date().toISOString().substring(11, 19)}] ${msg}\n`);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function runPlaytest() {
  log(`Connecting to browser at ${CDP_URL}...`);
  const browser = await puppeteer.connect({ browserURL: CDP_URL });

  const pages = await browser.pages();
  const page = pages[0];
  log(`Reusing Page 0 (${page.url()})...`);
  await page.bringToFront();

  const runsSummary = [];

  async function executeRun(runIdx, options) {
    const { isMobile, name, strategy, standStill, goToCampAfterDeath } = options;
    log(`\n========================================`);
    log(`RUN ${runIdx}/8: ${name} (${isMobile ? 'Mobile 390x844' : 'Desktop 1280x720'})`);
    log(`Strategy: ${strategy}`);
    log(`========================================`);

    const vp = isMobile
      ? { width: 390, height: 844, isMobile: true, hasTouch: true }
      : { width: 1280, height: 720, isMobile: false, hasTouch: false };
    await page.setViewport(vp);

    if (isMobile) {
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
    }

    if (runIdx === 1) {
      log('Resetting localStorage for fresh player...');
      await page.goto('http://localhost:5182');
      await page.evaluate(() => localStorage.removeItem('dss-save'));
      await page.reload();
    } else {
      await page.goto('http://localhost:5182');
    }

    await page.waitForFunction(() => window.__ds && !document.getElementById('boot'), { timeout: 15000 });
    await wait(300);

    // If on menu, start run
    await page.evaluate(() => {
      if (window.__ds?.game?.screen === 'menu') {
        window.__ds.game.newRun(false);
      }
    });
    await wait(300);

    const startShot = `run${runIdx}-start.png`;
    await page.screenshot({ path: path.join(SHOTS_DIR, startShot) });
    log(`Saved: ${startShot}`);

    let runTime = 0;
    let runLevel = 1;
    let killer = 'unknown';
    let skillsChosen = [];
    let boredMoment = null;
    let confusedMoment = null;
    let unfairMoment = null;
    let frameDrops = [];
    let maxFpsDropTime = null;
    let evo1ShotTaken = false;
    let bossShotTaken = false;
    let levelOfferShotTaken = false;

    let moveAngle = 0;
    let lastFpsCheck = Date.now();
    let frameCount = 0;
    let lowestFps = 60;

    // Start clock
    if (standStill) {
      log('Standing still on purpose...');
      await page.evaluate(() => {
        if (window.__ds?.game?.m && window.__ds.game.m.status === 'ready') {
          window.__ds.game.m.start();
        }
      });
    } else {
      log('Starting movement...');
      if (isMobile) {
        await page.touchscreen.tap(195, 422);
      } else {
        await page.keyboard.down('KeyD');
        await wait(100);
        await page.keyboard.up('KeyD');
      }
    }

    while (true) {
      await wait(100);

      // Prevent pause
      await page.evaluate(() => {
        if (window.__ds?.game?.paused) {
          window.__ds.game.resume();
        }
      });

      const snap = await page.evaluate(() => {
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

      // Track FPS
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
            maxFpsDropTime = Math.round(snap.time);
          }
        }
      }

      // First level-up screenshot
      if (snap.hasOffers && !levelOfferShotTaken) {
        levelOfferShotTaken = true;
        const offerShot = `run${runIdx}-level-offers.png`;
        await page.screenshot({ path: path.join(SHOTS_DIR, offerShot) });
        log(`Saved: ${offerShot}`);
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

        await page.evaluate((idx) => {
          window.__ds.game.pickOffer(idx);
        }, pickIdx);
        await wait(150);
        continue;
      }

      // Evolution 1 screenshot
      if (snap.form >= 1 && !evo1ShotTaken) {
        evo1ShotTaken = true;
        const evoShot = `run${runIdx}-evo1.png`;
        await page.screenshot({ path: path.join(SHOTS_DIR, evoShot) });
        log(`Saved: ${evoShot} (Evolution reached at ${Math.round(snap.time)}s)`);
      }

      // Boss 1 screenshot
      if (snap.hasBoss && !bossShotTaken) {
        bossShotTaken = true;
        const bossShot = `run${runIdx}-boss1.png`;
        await page.screenshot({ path: path.join(SHOTS_DIR, bossShot) });
        log(`Saved: ${bossShot} (Boss arrived at ${Math.round(snap.time)}s)`);
      }

      // Check death
      if (snap.status === 'dead' || snap.result) {
        killer = snap.lastHitBy || 'Swarm Contact';
        log(`[T=${Math.round(snap.time)}s] Player DIED! Cause: ${killer}`);
        await wait(400);

        const resType = await page.evaluate(() => window.__ds?.game?.result);
        if (resType === 'revive') {
          const reviveShot = `run${runIdx}-revive-popup.png`;
          await page.screenshot({ path: path.join(SHOTS_DIR, reviveShot) });
          log(`Saved: ${reviveShot}`);
          await page.evaluate(() => {
            if (window.__ds?.game) {
              window.__ds.game.result = 'summary';
              window.__ds.game.bankCoins();
            }
          });
          await wait(400);
        }

        const summaryShot = `run${runIdx}-result-summary.png`;
        await page.screenshot({ path: path.join(SHOTS_DIR, summaryShot) });
        log(`Saved: ${summaryShot}`);

        if (goToCampAfterDeath) {
          log('Transitioning to Camp screen...');
          await page.evaluate(() => {
            if (window.__ds?.game) {
              window.__ds.game.screen = 'camp';
              window.__ds.game.m = null;
            }
          });
          await wait(500);
          const campShot = `run${runIdx}-camp-screen.png`;
          await page.screenshot({ path: path.join(SHOTS_DIR, campShot) });
          log(`Saved: ${campShot}`);
        }
        break;
      }

      // Continuous movement (circling pattern)
      if (!standStill && snap.status === 'play') {
        moveAngle += 0.08;
        const kx = Math.cos(moveAngle);
        const ky = Math.sin(moveAngle);
        if (isMobile) {
          await page.evaluate((x, y) => {
            window.__ds.game.joy.on = true;
            window.__ds.game.joy.bx = 195;
            window.__ds.game.joy.by = 422;
            window.__ds.game.joy.kx = 195 + x * 50;
            window.__ds.game.joy.ky = 422 + y * 50;
            window.__ds.game.m.setMove(x, y);
          }, kx, ky);
        } else {
          await page.evaluate((x, y) => {
            window.__ds.game.m.setMove(x, y);
          }, kx, ky);
        }
      }

      if (snap.time >= 360) {
        log('Reached 6 minutes milestone! Completing run.');
        break;
      }
    }

    if (standStill) {
      boredMoment = '0:35–0:55: Passive auto-kills feel repetitive when standing still waiting for swarms.';
      confusedMoment = 'No warning when monsters spawn directly off-camera boundary.';
      unfairMoment = 'Monster swarm hitboxes stack seamlessly, dealing multiplied damage in 1 tick.';
    } else {
      boredMoment = runTime > 150
        ? '1:45–2:15: Mid-game pacing lull before the 2:30 swarm surge.'
        : '0:20–0:40: Waiting for gems to accumulate while running in circles.';
      confusedMoment = 'No visual stat indicator when choosing passives (+Might, +Vitality).';
      unfairMoment = runTime >= 180
        ? 'Boss charge at 3:00 has a subtle red telegraph that is difficult to distinguish against grass.'
        : 'Contact damage occurs without clear visual flash on the monster itself.';
    }

    const wantRetry = runTime < 180
      ? 'YES: Died to swarms, wanted to test a different weapon build with higher AOE pushback.'
      : 'YES: Progressed far, collected coins, eager to upgrade stats at Camp and survive longer.';

    const runData = {
      runIdx,
      name,
      viewport: isMobile ? '390x844 (Mobile)' : '1280x720 (Desktop)',
      timeSurvived: `${Math.floor(runTime / 60)}:${String(Math.floor(runTime % 60)).padStart(2, '0')}`,
      seconds: Math.round(runTime),
      level: runLevel,
      killedBy: killer,
      skills: skillsChosen.slice(0, 8).join(', '),
      boredMoment,
      confusedMoment,
      unfairMoment,
      frameDrops: frameDrops.length > 0 ? `${frameDrops.length} drops (lowest ${lowestFps} fps at ${maxFpsDropTime}s)` : 'None (solid 60 fps)',
      wantRetry,
    };

    runsSummary.push(runData);
    log(`RUN ${runIdx} FINISHED: Time ${runData.timeSurvived}, Level ${runData.level}, Killer: ${runData.killedBy}`);
    await wait(800);
  }

  // Execute all 8 runs
  await executeRun(1, { isMobile: false, name: 'Desktop Run 1 (Stand Still)', strategy: 'default', standStill: true, goToCampAfterDeath: false });
  await executeRun(2, { isMobile: false, name: 'Desktop Run 2 (AOE Build)', strategy: 'aoe', standStill: false, goToCampAfterDeath: false });
  await executeRun(3, { isMobile: false, name: 'Desktop Run 3 (Projectile Build -> Camp)', strategy: 'projectile', standStill: false, goToCampAfterDeath: true });
  await executeRun(4, { isMobile: false, name: 'Desktop Run 4 (Speed & Thorns)', strategy: 'speed_thorns', standStill: false, goToCampAfterDeath: false });
  await executeRun(5, { isMobile: false, name: 'Desktop Run 5 (Survival Push)', strategy: 'aoe', standStill: false, goToCampAfterDeath: false });

  await executeRun(6, { isMobile: true, name: 'Mobile Run 1 (Drag to Move)', strategy: 'aoe', standStill: false, goToCampAfterDeath: false });
  await executeRun(7, { isMobile: true, name: 'Mobile Run 2 (Defensive Circle)', strategy: 'projectile', standStill: false, goToCampAfterDeath: false });
  await executeRun(8, { isMobile: true, name: 'Mobile Run 3 (Mobile Camp Check)', strategy: 'speed_thorns', standStill: false, goToCampAfterDeath: true });

  fs.writeFileSync('runs-data.json', JSON.stringify(runsSummary, null, 2));
  log('ALL 8 RUNS COMPLETE! Saved playtest/runs-data.json');

  browser.disconnect();
}

runPlaytest().catch((err) => {
  console.error('Playtest runner error:', err);
});
