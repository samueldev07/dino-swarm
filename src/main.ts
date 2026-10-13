import '@fontsource/alegreya/latin-500.css';
import '@fontsource/alegreya/latin-700.css';
import '@fontsource/alegreya-sc/latin-800.css';
import { Stage } from './engine/canvas';
import { Input } from './engine/input';
import { Audio } from './engine/audio';
import { Assets } from './engine/assets';
import { Poki } from './engine/poki';
import { startLoop } from './engine/loop';
import { Sprites } from './game/sprites';
import { setUiKit } from './game/ui';
import { Game } from './game/game';
import { FrameMeter } from './game/perf/meter';

async function boot(): Promise<void> {
  const poki = new Poki();
  // Poki: init first; a failure (ad blocker) must never stop the game.
  await Promise.race([poki.init(), new Promise((r) => setTimeout(r, 2500))]);

  const canvas = document.getElementById('stage') as HTMLCanvasElement;
  const stage = new Stage(canvas);
  const input = new Input(stage);
  const audio = new Audio();
  const assets = new Assets();
  await Promise.race([assets.init(), new Promise((r) => setTimeout(r, 1000))]);
  // Painted creatures + ground: start loading now so the first frames never show stand-ins.
  assets.preload(['ui-panel', 'ui-card', 'ui-btn-primary', 'ui-btn-primary-pressed', 'ui-btn-ad', 'ui-btn-quiet', 'ui-ribbon-win', 'ui-ribbon-lose', 'ui-medallion', 'ui-bar-frame', 'ui-iconbtn', 'ground-0', 'prop-stump-large', 'prop-mossy-rock', 'prop-roots-mound', 'prop-stump-twisted', 'logo-plate', 'hud-skull', 'hud-coin', 'hud-pause', 'hud-sound', 'hud-amber', 'proj-lid', 'proj-bone', 'proj-flask', 'proj-rock', 'proj-meteor', 'fx-jab', 'fx-fire', 'fx-slam', 'pickup-amber-1', 'pickup-amber-2', 'pickup-amber-3', 'pickup-meat', 'pickup-coin', 'pickup-magnet', 'pickup-chest', ...['bite', 'spit', 'orbit', 'stomp', 'meteor', 'thorns', 'vitality', 'swift', 'might', 'haste', 'magnet', 'regen', 'heal', 'gold'].map((k) => `skill-${k}`), ...['grub', 'bat', 'beetle', 'wolf', 'shroom', 'brute', 'boss'].map((k) => `enemy-${k}`)]);
  await Promise.race([
    Promise.all([document.fonts.load('700 20px Alegreya'), document.fonts.load('800 20px "Alegreya SC"')]),
    new Promise((r) => setTimeout(r, 1200)),
  ]).catch(() => {});

  setUiKit((k) => assets.get(k));
  const game = new Game(stage, input, audio, new Sprites(assets), poki);
  void input.firstGesture.then(() => { audio.unlock(); audio.setMusic(audio.music); });

  const meter = new URLSearchParams(location.search).has('debug') ? new FrameMeter() : null;
  if (meter) (window as unknown as Record<string, unknown>).__perf = meter;
  startLoop((dt, now) => {
    const begin = meter ? performance.now() : 0;
    game.update(dt);
    const updated = meter ? performance.now() : 0;
    game.draw();
    if (meter) meter.record(now, updated - begin, performance.now() - updated);
    input.endFrame();
  });
  poki.loadingFinished();

  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__ds = { stage, input, audio, game };

  const bootEl = document.getElementById('boot');
  if (bootEl) { bootEl.classList.add('gone'); setTimeout(() => bootEl.remove(), 400); }
}

void boot();
