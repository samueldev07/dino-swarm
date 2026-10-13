import puppeteer from 'puppeteer-core';

async function check() {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await b.pages();
  console.log('Pages open:', pages.length);
  for (let i = 0; i < pages.length; i++) {
    const url = pages[i].url();
    const title = await pages[i].title();
    console.log(`Page ${i}: ${url} | ${title}`);
  }
  b.disconnect();
}
check();
