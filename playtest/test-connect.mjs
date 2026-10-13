import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--mute-audio'],
    defaultViewport: { width: 1280, height: 720 },
  });

  const page = await browser.newPage();
  console.log('Navigating to http://localhost:5182 ...');
  await page.goto('http://localhost:5182', { waitUntil: 'networkidle0' });

  const title = await page.title();
  console.log('Page title:', title);

  const hasDs = await page.evaluate(() => typeof window.__ds !== 'undefined');
  console.log('Has window.__ds:', hasDs);

  const metaRuns = await page.evaluate(() => {
    return window.__ds?.game?.meta?.runs;
  });
  console.log('Meta runs:', metaRuns);

  await page.screenshot({ path: 'shots/boot-test.png' });
  console.log('Screenshot saved to shots/boot-test.png');

  await browser.close();
}

main().catch(console.error);
