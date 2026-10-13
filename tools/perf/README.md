# Performance capture

Run the Vite dev server and install `puppeteer-core` in a separate tools directory (Node 22).
Run these commands from the repository root. Set `PUPPETEER_MODULE` to its exported JavaScript
entry point if it is not installed in this repository; set `CHROME_PATH` to the Chrome executable.
`PERF_URL` defaults to `http://127.0.0.1:5182`. `PERF_OUT` chooses a scratch output directory.

```sh
node tools/perf/measure.mjs before
node tools/perf/visual.mjs before
node tools/perf/smoke.mjs
```

`measure.mjs` captures 390×844 at DPR 2 and 1280×720 at DPR 1, CPU throttle 4×, 300 enemies
(six kinds, 10% elites), four level-3 weapons. The real model runs. Test-only HP and spawn
settings prevent deaths/level-up pauses; a grid fixture keeps all enemies visible throughout.
This is a controlled rendering/collision stress test, not a pacing or balance simulation.

After a 2.5-second warm-up, it measures 12 seconds without tracing, then records a separate
4-second Chrome Performance trace and CPU profile. Open `*-timeline.json` in DevTools Performance
and `*.cpuprofile` in its JavaScript profiler. `metrics.json` contains frame/update/draw averages
and P95, plus coarse method timings. Frame samples are the meter's last 600 frames (up to
10 seconds at 60 FPS); low-FPS captures retain the whole measured interval. Do not compare
traced intervals against untraced intervals or treat this headless host as a real phone.

`visual.mjs` freezes animation clocks/randomness, waits for every mapped image, supplies the
same bundled fonts, then captures gameplay, flashes, offers, pause, menu and camp. It changes
only the harness: no test assets or fixture settings ship in the game.

The reference capture used `a19be07` in a separate archived checkout, with only `FrameMeter`
and its `main.ts` wiring copied in so both revisions used the same instrumentation. Both
checkouts shared unchanged dependencies/art. Keep baseline and candidate servers separate;
run captures sequentially on an idle host. On a physical phone, also inspect startup time,
memory, the first hit and sustained play. `?debug` enables the small runtime meter, including
in production; without it no meter, sampling arrays or DOM panel are created.
