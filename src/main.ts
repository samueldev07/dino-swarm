import "@fontsource/alegreya/latin-500.css";
import "@fontsource/alegreya/latin-700.css";
import "@fontsource/alegreya-sc/latin-800.css";
import { Stage } from "./engine/canvas";
import { Input } from "./engine/input";
import { Audio } from "./engine/audio";
import { Assets } from "./engine/assets";
import { Poki } from "./engine/poki";
import { startLoop } from "./engine/loop";
import { Sprites } from "./game/sprites";
import { setUiKit } from "./game/ui";
import { Game } from "./game/game";
import { isClipReady, primeClip } from "./game/clips";
import { loadMeta } from "./game/meta";
import { SPECIES, type SpeciesId } from "./game/config";
import { SKILL_ART } from "./game/perf/requirements";
import { configureLoading, scheduleLoad, zoneClips } from "./game/perf/loading";
import { FrameMeter } from "./game/perf/meter";

async function boot(): Promise<void> {
  const poki = new Poki();
  const sdkReady = Promise.race([
    poki.init(),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  const meta = loadMeta();
  const loading = configureLoading(meta.zone);
  const fontsReady = Promise.race([
    Promise.allSettled([
      document.fonts.load("500 20px Alegreya"),
      document.fonts.load("700 20px Alegreya"),
      document.fonts.load('800 20px "Alegreya SC"'),
    ]),
    new Promise((r) => setTimeout(r, 15000)),
  ]);
  const canvas = document.getElementById("stage") as HTMLCanvasElement;
  const stage = new Stage(canvas);
  const input = new Input(stage);
  const audio = new Audio();
  audio.music = meta.music;
  audio.sound = meta.sound;
  void input.firstGesture.then(() => {
    audio.unlock();
    audio.setMusic(audio.music);
  });
  const assets = new Assets("sprites/", scheduleLoad);
  assets.onCriticalRequested = (key) => loading.promote("sprite:" + key);
  await assets.init();
  const common = [
    "ui-panel",
    "ui-card",
    "ui-btn-primary",
    "ui-btn-primary-pressed",
    "ui-btn-ad",
    "ui-btn-quiet",
    "ui-ribbon-win",
    "ui-ribbon-lose",
    "ui-medallion",
    "ui-bar-frame",
    "ui-iconbtn",
    "logo-plate",
    "hud-skull",
    "hud-coin",
    "hud-pause",
    "hud-sound",
    "hud-full",
    "hud-amber",
    "prop-stump-large",
    "prop-mossy-rock",
    "prop-roots-mound",
    "prop-stump-twisted",
    "pickup-amber-1",
    "pickup-amber-2",
    "pickup-amber-3",
    "pickup-meat",
    "pickup-coin",
    "pickup-magnet",
    "pickup-chest",
    "fx-jab",
    ...[
      "bite",
      "spit",
      "orbit",
      "stomp",
      "meteor",
      "thorns",
      "vitality",
      "swift",
      "might",
      "haste",
      "magnet",
      "regen",
      "heal",
      "gold",
    ].map((k) => `skill-${k}`),
  ];
  const criticalKeys = (zone: number) => [
    ...common,
    `ground-${zone}`,
    ...["grub", "bat"].map((kind) =>
      assets.has(`enemy-${kind}-${zone}`)
        ? `enemy-${kind}-${zone}`
        : `enemy-${kind}`,
    ),
  ];
  const primeZone = (zone: number) => {
    for (const [name, size] of zoneClips(zone))
      void primeClip(`anim/${name}/`, size).catch(() => {});
  };

  setUiKit((k) => assets.get(k));
  const game = new Game(stage, input, audio, new Sprites(assets), poki);
  primeZone(loading.zone);
  const openingArt = SKILL_ART[SPECIES[meta.species].start];
  for (const [name, size] of openingArt.clips) {
    void primeClip(`anim/${name}/`, size).catch(() => {});
    loading.promote(`anim/${name}/#${size}`);
  }
  const firstImages = assets.preload(
    [...criticalKeys(loading.zone), ...openingArt.sprites],
    true,
  );
  await Promise.all([
    sdkReady,
    fontsReady,
    firstImages,
    loading.waitCritical(),
  ]);
  // Keep the original boot element as a gate when the player selects a not-yet-loaded zone.
  const bootEl = document.getElementById("boot");
  let artTransition = 0;
  const showBoot = () => {
    if (bootEl) {
      bootEl.style.transition = "none";
      bootEl.classList.remove("gone");
    }
  };
  const hideBoot = () => {
    if (bootEl) {
      bootEl.style.transition = "";
      bootEl.classList.add("gone");
    }
  };
  const waitForArt = (token: number) => {
    void loading.waitCritical().then(() => {
      if (token !== artTransition) return;
      loading.resume();
      hideBoot();
    });
  };
  assets.onZoneRequested = (zone) => {
    if (!Number.isInteger(zone) || zone === loading.zone) return;
    const token = ++artTransition;
    loading.selectZone(zone);
    showBoot();
    primeZone(zone);
    void assets.preload(criticalKeys(zone), true);
    waitForArt(token);
  };
  // Offers already pause the model. Promote their art before a fast choice can reveal a stand-in.
  const requestedSkills = new Set<string>();
  assets.onGet = (key) => {
    const player = key.match(/^player-(.+)-\d+$/);
    const skill = key.startsWith("skill-")
      ? key.slice(6)
      : player
        ? SPECIES[player[1] as SpeciesId]?.start
        : undefined;
    if (!skill || requestedSkills.has(skill)) return;
    requestedSkills.add(skill);
    const art = SKILL_ART[skill];
    if (
      !art ||
      (art.clips.every(([name, size]) => isClipReady(`anim/${name}/`, size)) &&
        art.sprites.every((key) => assets.isReady(key)))
    )
      return;
    const token = ++artTransition;
    loading.selectZone(loading.zone);
    showBoot();
    for (const [name, size] of art.clips) {
      void primeClip(`anim/${name}/`, size).catch(() => {});
      loading.promote(`anim/${name}/#${size}`);
    }
    void assets.preload([...art.sprites], true);
    waitForArt(token);
  };
  // Populate the view's existing sprite/lighting caches while the loading screen still covers it.
  game.draw();
  if (artTransition) await loading.waitCritical();
  loading.resume();
  hideBoot();
  performance.mark("game-ready");
  poki.loadingFinished();
  // Allow the first completed scene to paint before later enemies start competing for resources.
  setTimeout(() => {
    loading.startBackground();
    void assets.preload([
      "proj-lid",
      "proj-bone",
      "proj-flask",
      "proj-rock",
      "proj-meteor",
      "fx-fire",
      "fx-slam",
      "fx-horn",
      ...["wolf", "beetle", "brute", "shroom", "boss"].map((kind) =>
        assets.has(`enemy-${kind}-${loading.zone}`)
          ? `enemy-${kind}-${loading.zone}`
          : `enemy-${kind}`,
      ),
    ]);
  }, 50);

  const meter = new URLSearchParams(location.search).has("debug")
    ? new FrameMeter()
    : null;
  if (meter) (window as unknown as Record<string, unknown>).__perf = meter;
  startLoop((dt, now) => {
    if (loading.blocked) {
      input.endFrame();
      return;
    }
    const begin = meter ? performance.now() : 0;
    game.update(dt);
    const updated = meter ? performance.now() : 0;
    game.draw();
    if (meter) meter.record(now, updated - begin, performance.now() - updated);
    input.endFrame();
  });
  if (import.meta.env.DEV || meter)
    (window as unknown as Record<string, unknown>).__ds = {
      stage,
      input,
      audio,
      game,
    };
  if (meter) (window as unknown as Record<string, unknown>).__loading = loading;
}

void boot();
