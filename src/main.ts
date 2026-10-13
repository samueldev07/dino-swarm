import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/lilita-one/latin-400.css';
import { Stage } from './engine/canvas';
import { Input } from './engine/input';
import { Audio } from './engine/audio';
import { Assets } from './engine/assets';
import { Poki } from './engine/poki';
import { startLoop } from './engine/loop';
import { Sprites } from './game/sprites';
import { Game } from './game/game';

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
  assets.preload(['ground-0', ...['grub', 'bat', 'beetle', 'wolf', 'shroom', 'brute', 'boss'].map((k) => `enemy-${k}`)]);
  await Promise.race([
    Promise.all([document.fonts.load('700 20px Fredoka'), document.fonts.load('20px "Lilita One"')]),
    new Promise((r) => setTimeout(r, 1200)),
  ]).catch(() => {});

  const game = new Game(stage, input, audio, new Sprites(assets), poki);
  void input.firstGesture.then(() => { audio.unlock(); audio.setMusic(audio.music); });

  startLoop((dt) => {
    game.update(dt);
    game.draw();
    input.endFrame();
  });
  poki.loadingFinished();

  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__ds = { stage, input, audio, game };

  const bootEl = document.getElementById('boot');
  if (bootEl) { bootEl.classList.add('gone'); setTimeout(() => bootEl.remove(), 400); }
}

void boot();
