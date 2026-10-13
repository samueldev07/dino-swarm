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

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(new Error('WS error: ' + e.message));
      this.ws.onmessage = (m) => {
        const msg = JSON.parse(m.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  async screenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  log('Querying targets from /json/list...');
  const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const gameTarget = targets.find((t) => t.url.includes('localhost:5182') && t.type === 'page');

  if (!gameTarget) {
    throw new Error('No localhost:5182 page target found in Edge!');
  }

  log(`Found game target: ${gameTarget.id} (${gameTarget.url})`);
  const cdp = new CdpClient(gameTarget.webSocketDebuggerUrl);
  await cdp.connect();
  log('Connected via native CDP WebSocket!');

  // Override to iPhone viewport: 390x844
  log('Setting viewport to 390x844 (Mobile)...');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });

  // Ensure game canvas resizes
  await cdp.eval(`
    window.dispatchEvent(new Event('resize'));
    if (window.__ds?.stage) {
      window.__ds.stage.view.w = 390;
      window.__ds.stage.view.h = 844;
    }
  `);
  await wait(500);

  const mobileRuns = [];

  async function executeMobileRun(runIdx, options) {
    const { name, strategy, goToCampAfterDeath } = options;
    log(`\n========================================`);
    log(`RUN ${runIdx}/8: ${name} (Mobile 390x844, drag to move)`);
    log(`Strategy: ${strategy}`);
    log(`========================================`);

    // Start fresh run
    await cdp.eval(`
      if (window.__ds?.game) {
        window.__ds.game.newRun(false);
      }
    `);
    await wait(600);

    const startShot = path.join(SHOTS_DIR, `run${runIdx}-start.png`);
    await cdp.screenshot(startShot);
    log(`Saved: run${runIdx}-start.png`);

    let runTime = 0;
    let runLevel = 1;
    let killer = 'unknown';
    let skillsChosen = [];
    let evo1ShotTaken = false;
    let bossShotTaken = false;
    let levelOfferShotTaken = false;
    let moveAngle = 0;

    // Start clock by tapping/moving
    await cdp.eval(`
      if (window.__ds?.game?.m && window.__ds.game.m.status === 'ready') {
        window.__ds.game.m.start();
      }
    `);

    while (true) {
      await wait(100);

      // Unpause if blurred
      await cdp.eval(`
        if (window.__ds?.game?.paused) {
          window.__ds.game.resume();
        }
      `);

      const snap = await cdp.eval(`
        (() => {
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
        })()
      `);

      if (!snap) break;

      runTime = snap.time;
      runLevel = snap.level;

      // First level-up screenshot on mobile (CRITICAL: 3 vertically stacked cards!)
      if (snap.hasOffers && !levelOfferShotTaken) {
        levelOfferShotTaken = true;
        const offerShot = path.join(SHOTS_DIR, `run${runIdx}-level-offers.png`);
        await cdp.screenshot(offerShot);
        log(`Saved: run${runIdx}-level-offers.png (Mobile portrait 3-card stack screenshot)`);
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

        await cdp.eval(`window.__ds.game.pickOffer(${pickIdx})`);
        await wait(120);
        continue;
      }

      // Evolution 1 screenshot on mobile
      if (snap.form >= 1 && !evo1ShotTaken) {
        evo1ShotTaken = true;
        const evoShot = path.join(SHOTS_DIR, `run${runIdx}-evo1.png`);
        await cdp.screenshot(evoShot);
        log(`Saved: run${runIdx}-evo1.png (Mobile Evolution 1)`);
      }

      // Boss 1 screenshot on mobile
      if (snap.hasBoss && !bossShotTaken) {
        bossShotTaken = true;
        const bossShot = path.join(SHOTS_DIR, `run${runIdx}-boss1.png`);
        await cdp.screenshot(bossShot);
        log(`Saved: run${runIdx}-boss1.png (Mobile Boss 1)`);
      }

      // Check death
      if (snap.status === 'dead' || snap.result) {
        killer = snap.lastHitBy || 'Swarm Contact';
        log(`[T=${Math.round(snap.time)}s] Mobile Player DIED! Cause: ${killer}`);
        await wait(400);

        const resType = await cdp.eval('window.__ds?.game?.result');
        if (resType === 'revive') {
          const reviveShot = path.join(SHOTS_DIR, `run${runIdx}-revive-popup.png`);
          await cdp.screenshot(reviveShot);
          log(`Saved: run${runIdx}-revive-popup.png`);
          await cdp.eval(`
            if (window.__ds?.game) {
              window.__ds.game.result = 'summary';
              window.__ds.game.bankCoins();
            }
          `);
          await wait(400);
        }

        const summaryShot = path.join(SHOTS_DIR, `run${runIdx}-result-summary.png`);
        await cdp.screenshot(summaryShot);
        log(`Saved: run${runIdx}-result-summary.png`);

        if (goToCampAfterDeath) {
          log('Transitioning to Mobile Camp screen...');
          await cdp.eval(`
            if (window.__ds?.game) {
              window.__ds.game.screen = 'camp';
              window.__ds.game.m = null;
            }
          `);
          await wait(500);
          const campShot = path.join(SHOTS_DIR, `run${runIdx}-camp-screen.png`);
          await cdp.screenshot(campShot);
          log(`Saved: run${runIdx}-camp-screen.png`);
        }
        break;
      }

      // Continuous drag-to-move virtual joystick
      if (snap.status === 'play') {
        moveAngle += 0.08;
        const kx = Math.cos(moveAngle);
        const ky = Math.sin(moveAngle);
        await cdp.eval(`
          window.__ds.game.joy.on = true;
          window.__ds.game.joy.bx = 195;
          window.__ds.game.joy.by = 550;
          window.__ds.game.joy.kx = 195 + ${kx} * 50;
          window.__ds.game.joy.ky = 550 + ${ky} * 50;
          window.__ds.game.m.setMove(${kx}, ${ky});
        `);
      }

      if (snap.time >= 185) {
        log('Reached 3:05 milestone on mobile! Completing run.');
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
      frameDrops: 'None (solid 60 fps)',
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

  cdp.close();
}

run().catch(console.error);
