// Chrome/CDP performance capture. Install puppeteer-core separately; no production dependency.
// PUPPETEER_MODULE=/absolute/path/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js
// CHROME_PATH=/path/to/chrome PERF_OUT=/path/to/results node tools/perf/measure.mjs before
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadFonts } from "./fonts.mjs";
const { default: puppeteer } = await import(
  process.env.PUPPETEER_MODULE
    ? pathToFileURL(process.env.PUPPETEER_MODULE).href
    : "puppeteer-core"
);
const label = process.argv[2] ?? "capture";
const out = path.resolve(process.env.PERF_OUT ?? "work/perf", label);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH,
  headless: true,
});
const results = [];
try {
  for (const [width, height, deviceScaleFactor] of [
    [390, 844, 2],
    [1280, 720, 1],
  ]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(
      (process.env.PERF_URL ?? "http://127.0.0.1:5182") + "/?debug",
    );
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
      const { Model } = await import("/src/game/model.ts");
      const g = window.__ds.game;
      g.m = new Model({
        species: "raptor",
        zone: 0,
        camp: {},
        seed: 123,
        tuning: { openingRing: 0, rateBase: 0, rateGrowth: 0, rateMax: 0 },
      });
      const m = g.m;
      m.start();
      m.hp = m.maxHp = 1000000;
      const kinds = ["grub", "bat", "wolf", "beetle", "shroom", "brute"];
      for (let i = 0; i < 300; i++) {
        const e = m.spawn(kinds[i % kinds.length], 0, 0);
        e.hp = e.maxHp = 1000000;
        e.elite = i % 10 === 0;
        e.age = i * 0.017;
      }
      for (const id of ["bite", "spit", "boomerang", "orbit"])
        m.weapons.set(id, 3);
      g.screen = "run";
      g.paused = false;
      g.result = null;
      g.firstRun = false;
      g.hintFade = 10;
      g.banner = null;
      g.keys.clear();
      // Keep all 300 visible throughout the capture; run real model/update/weapon collisions.
      const update = g.update.bind(g);
      g.update = (dt) => {
        const z =
          0.88 *
          Math.max(0.7, Math.min(1.6, Math.sqrt((g.v.w * g.v.h) / 840000)));
        for (let i = 0; i < m.enemies.length; i++) {
          const e = m.enemies[i];
          e.x = (((((i % 20) + 0.5) / 20 - 0.5) * g.v.w) / z) * 0.82;
          e.y = ((((Math.floor(i / 20) + 0.5) / 15 - 0.5) * g.v.h) / z) * 0.82;
          e.kx = e.ky = 0;
        }
        m.invuln = 0;
        update(dt);
      };
      window.__costs = {};
      for (const name of [
        "drawWorld",
        "drawProps",
        "drawLight",
        "drawHud",
        "drawEdgeArrows",
      ]) {
        const fn = g[name].bind(g);
        const cost = (window.__costs[name] = { ms: 0, calls: 0 });
        g[name] = (...args) => {
          const t = performance.now();
          const r = fn(...args);
          cost.ms += performance.now() - t;
          cost.calls++;
          return r;
        };
      }
    });
    const cdp = await page.createCDPSession();
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await new Promise((r) => setTimeout(r, 2500));
    await page.evaluate(() => {
      window.__perf.reset();
      for (const c of Object.values(window.__costs)) {
        c.ms = 0;
        c.calls = 0;
      }
    });
    await new Promise((r) => setTimeout(r, 12000));
    // Measure without tracing overhead; capture a separate trace/profile for diagnosis.
    const result = await page.evaluate(() => ({
      ...window.__perf.snapshot(),
      costs: structuredClone(window.__costs),
      enemies: window.__ds.game.m.enemies.length,
      canvas: [window.__ds.stage.canvas.width, window.__ds.stage.canvas.height],
    }));
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.start");
    await page.tracing.start({
      path: path.join(out, `${width}-timeline.json`),
      categories: ["devtools.timeline", "v8", "blink", "cc"],
    });
    await new Promise((r) => setTimeout(r, 4000));
    await page.tracing.stop();
    const { profile } = await cdp.send("Profiler.stop");
    fs.writeFileSync(
      path.join(out, `${width}.cpuprofile`),
      JSON.stringify(profile),
    );
    const nodes = new Map(profile.nodes.map((n) => [n.id, n.callFrame]));
    const times = new Map();
    profile.samples?.forEach((id, i) =>
      times.set(id, (times.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)),
    );
    result.top = [...times]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 18)
      .map(([id, us]) => ({ ...nodes.get(id), ms: us / 1000 }));
    results.push({
      width,
      height,
      deviceScaleFactor,
      cpuThrottle: 4,
      ...result,
      errors,
    });
    fs.writeFileSync(
      path.join(out, "metrics.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(JSON.stringify(results.at(-1)));
    await page.close();
  }
} finally {
  await browser.close();
}
