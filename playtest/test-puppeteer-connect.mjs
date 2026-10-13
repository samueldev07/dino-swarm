import puppeteer from 'puppeteer-core';

async function main() {
  console.log('Connecting to browser on 9222...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  console.log('Connected! Creating page...');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:5182');
  console.log('Waiting for stage...');
  await page.waitForSelector('#stage');
  console.log('Page loaded! Evaluating __ds...');
  const dsInfo = await page.evaluate(() => {
    return {
      hasDs: !!window.__ds,
      screen: window.__ds?.game?.screen,
      runs: window.__ds?.game?.meta?.runs,
      coins: window.__ds?.game?.meta?.coins,
    };
  });
  console.log('DS Info:', dsInfo);
  await page.screenshot({ path: 'shots/initial-screen.png' });
  console.log('Screenshot saved to playtest/shots/initial-screen.png');
  await page.close();
  browser.disconnect();
}

main().catch(console.error);
