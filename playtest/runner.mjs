import puppeteer from 'puppeteer-core';

async function testHarness() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:5182');

  // Wait for boot to finish and window.__ds to be ready
  await page.waitForFunction(() => {
    return window.__ds && !document.getElementById('boot');
  }, { timeout: 10000 });

  console.log('Game fully booted!');

  // Check initial state
  const state = await page.evaluate(() => {
    const ds = window.__ds;
    return {
      screen: ds.game.screen,
      paused: ds.game.paused,
      hasModel: !!ds.game.m,
      modelStatus: ds.game.m ? ds.game.m.status : null,
      meta: ds.game.meta,
    };
  });
  console.log('Initial state:', state);

  // Take screenshot of run 1 ready
  await page.screenshot({ path: 'shots/run-ready-desktop.png' });
  console.log('Screenshot run-ready-desktop.png taken');

  await page.close();
  browser.disconnect();
}

testHarness().catch(console.error);
