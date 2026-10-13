import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { default: puppeteer } = await import(
  process.env.PUPPETEER_MODULE
    ? pathToFileURL(process.env.PUPPETEER_MODULE).href
    : "puppeteer-core"
);
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH,
  headless: true,
});
try {
  for (const fallback of [false, true]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    if (fallback)
      await page.evaluateOnNewDocument(() => {
        window.createImageBitmap = undefined;
      });
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(process.env.PERF_URL ?? "http://127.0.0.1:5182");
    await page.waitForFunction(
      () =>
        window.__ds?.game.hero.ready &&
        Object.values(window.__ds.game.clips).every((c) => c.ready),
      { polling: 100 },
    );
    assert.equal(
      await page.evaluate(
        () => !!window.__perf || !!document.querySelector("[data-perf]"),
      ),
      false,
      "no debug work on the normal path",
    );
    await page.keyboard.down("w");
    await page.waitForFunction(
      () => window.__ds.game.m.status === "play" && window.__ds.game.m.py < -20,
    );
    await page.keyboard.up("w");
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    const state = await page.evaluate(async () => {
      const g = window.__ds.game;
      const { Clip } = await import("/src/game/clips.ts");
      const { Hero } = await import("/src/game/hero.ts");
      const clip = new Clip("missing-perf-art/"),
        hero = new Hero("missing-perf-art/");
      await new Promise((r) => setTimeout(r, 250));
      g.draw();
      g.cam.x = -700;
      g.cam.y = 600;
      g.draw();
      g.cam.x = g.cam.y = 0;
      g.draw();
      return {
        missingClip: clip.ready,
        missingHero: hero.ready,
        canvas: [
          window.__ds.stage.canvas.width,
          window.__ds.stage.canvas.height,
        ],
        raster: g.clips.grub.data.frames[0].raster.constructor.name,
      };
    });
    assert.equal(state.missingClip, false);
    assert.equal(state.missingHero, false);
    assert.deepEqual(state.canvas, [1280, 720]);
    assert.equal(state.raster, fallback ? "HTMLCanvasElement" : "ImageBitmap");
    assert.deepEqual(errors, []);
    await page.close();
    console.log(
      "ok",
      fallback ? "canvas texture fallback" : "bitmap textures",
      "movement, resize, camera return, missing art, debug off",
    );
  }
} finally {
  await browser.close();
}
