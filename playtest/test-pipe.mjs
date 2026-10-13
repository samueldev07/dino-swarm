import puppeteer from 'puppeteer-core';

async function test() {
  console.log('Testing puppeteer launch...');
  try {
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      pipe: true,
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });
    console.log('Browser launched successfully!');
    const page = await browser.newPage();
    await page.goto('http://localhost:5182');
    console.log('Title:', await page.title());
    await browser.close();
    console.log('Done!');
  } catch (err) {
    console.error('Error launching:', err);
  }
}

test();
