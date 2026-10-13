// Same environment variables as measure.mjs. Freeze all clocks for before/after image comparison.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadFonts } from "./fonts.mjs";
const { default: puppeteer } = await import(
  process.env.PUPPETEER_MODULE
    ? pathToFileURL(process.env.PUPPETEER_MODULE).href
    : "puppeteer-core"
);
const out = path.resolve(
  process.env.PERF_OUT ?? "work/perf",
  process.argv[2] ?? "capture",
);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH,
  headless: true,
});
try {
  for (const [width, height, deviceScaleFactor] of [
    [390, 844, 2],
    [1280, 720, 1],
  ]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor });
    await page.evaluateOnNewDocument(() => {
      Math.random = () => 0.42;
      window.requestAnimationFrame = () => 1;
    });
    await page.goto(process.env.PERF_URL ?? "http://127.0.0.1:5182");
    await page.waitForFunction(
      () =>
        window.__ds?.game.hero.ready &&
        Object.values(window.__ds.game.clips).every((c) => c.ready) &&
        !document.getElementById("boot"),
      { polling: 100 },
    );
    await loadFonts(page);
    await page.evaluate(async () => {
      await document.fonts.ready;
      const a = window.__ds.game.sprites.assets;
      // Request every mapped sprite, then await complete/decoded so lazy arrivals don't affect comparison.
      for (const k of Object.keys(a.files)) a.get(k);
      await Promise.all(
        [...a.images.values()].map((i) => i.decode().catch(() => {})),
      );
    });
    await page.waitForFunction(
      () => {
        const a = window.__ds.game.sprites.assets;
        return [...a.images.keys()].every((k) => a.ready.has(k) || !a.files[k]);
      },
      { polling: 100 },
    );
    for (const scene of ["run", "flash", "offers", "pause", "menu", "camp"]) {
      await page.evaluate(async (scene) => {
        const { Model } = await import("/src/game/model.ts");
        const { freshMeta } = await import("/src/game/meta.ts");
        const g = window.__ds.game;
        g.meta = freshMeta();
        g.meta.runs = 1;
        g.meta.coins = 80;
        g.m = new Model({
          species: "raptor",
          zone: 0,
          camp: {},
          seed: 123,
          tuning: { openingRing: 0 },
        });
        const m = g.m;
        m.start();
        m.time = 40;
        g.screen = "run";
        g.paused = false;
        g.result = null;
        g.time = 1;
        g.banner = null;
        g.hurtT = scene === "flash" ? 0.25 : 0;
        g.evolveT = 0;
        g.firstRun = false;
        g.lagHp = 1;
        const z =
          0.88 *
          Math.max(0.7, Math.min(1.6, Math.sqrt((g.v.w * g.v.h) / 840000)));
        g.cam = { x: 0, y: 0, z };
        const kinds = [
          "grub",
          "bat",
          "wolf",
          "beetle",
          "shroom",
          "brute",
          "boss",
        ];
        for (let i = 0; i < 35; i++) {
          const e = m.spawn(kinds[i % 7], 0, 0);
          e.x = (((((i % 7) + 0.5) / 7 - 0.5) * g.v.w) / z) * 0.8;
          e.y = ((((Math.floor(i / 7) + 0.5) / 5 - 0.5) * g.v.h) / z) * 0.65;
          e.age = 0.42 + i / 13;
          e.elite = i % 7 === 0;
          e.facing = i % 2 ? -1 : 1;
          e.flash = scene === "flash" ? 0.1 : 0;
          if (i === 34) {
            m.boss = e;
            e.mode = 1;
            e.dx = 1;
          }
        }
        if (scene === "offers") {
          m.offers = [
            { id: "bite", level: 2 },
            { id: "might", level: 1 },
            { id: "spit", level: 1 },
          ];
          g.offersAt = 0;
        }
        if (scene === "pause") g.paused = true;
        if (scene === "menu" || scene === "camp") g.screen = scene;
        g.draw();
      }, scene);
      await page.screenshot({ path: path.join(out, `${width}-${scene}.png`) });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
console.log("Captured", out);
