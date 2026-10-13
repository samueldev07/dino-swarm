import {
  parseRig,
  drawRig,
  rigMatrices,
  type RigClip,
  type RigDefinition,
} from '../../src/game/rig';
import { testRig } from './test-rig';
import { Assets } from '../../src/engine/assets';
import { Sprites } from '../../src/game/sprites';

const canvas = document.querySelector<HTMLCanvasElement>('#preview')!,
  ctx = canvas.getContext('2d')!;
const json = document.querySelector<HTMLTextAreaElement>('#json')!,
  status = document.querySelector<HTMLElement>('#status')!;
const clip = document.querySelector<HTMLSelectElement>('#clip')!,
  edit = document.querySelector<HTMLInputElement>('#edit')!,
  flip = document.querySelector<HTMLInputElement>('#flip')!;
let fixture = testRig(),
  rig: RigDefinition = fixture.rig,
  sprites = fixture.sprites;
const full = new Sprites(new Assets()).enemy('boss', 0);
let elapsed = 0,
  last = performance.now(),
  dragging: string | null = null;
const x = 500,
  y = 510,
  width = 440;
const state = () => ({
  clip: clip.value as RigClip,
  time: edit.checked ? 0 : elapsed,
  progress: edit.checked ? 0 : (elapsed % 1.5) / 1.5,
  flip: flip.checked ? -1 : 1,
});
const sync = () => {
  json.value = JSON.stringify(rig, null, 2);
};
sync();
function point(pivot: [number, number], parent: string | null): DOMPoint {
  const matrix = parent ? rigMatrices(rig, state()).get(parent)! : new DOMMatrix();
  return new DOMPoint(...pivot).matrixTransform(matrix);
}
function render(now: number) {
  elapsed += (now - last) / 1000;
  last = now;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(35,40,25,.25)';
  ctx.beginPath();
  ctx.ellipse(x, y, 180, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!drawRig(ctx, rig, (key) => sprites.get(key), x, y, width, state())) {
    ctx.drawImage(
      full.img,
      x - width / 2,
      y - ((width * full.h) / full.w) * 0.9,
      width,
      (width * full.h) / full.w,
    );
    status.textContent =
      'Some parts are missing or have the wrong canvas size. Showing the complete boss fallback.';
  }
  if (edit.checked) {
    const a = rig.anchor ?? [0.5, 0.9],
      s = width / rig.canvas[0],
      f = flip.checked ? -1 : 1;
    rig.parts.forEach((part, i) => {
      const p = point(part.pivot, part.parent),
        px = x + (p.x - rig.canvas[0] * a[0]) * s * f,
        py = y + (p.y - rig.canvas[1] * a[1]) * s;
      ctx.fillStyle = `hsl(${i * 65},95%,72%)`;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#26352c';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '15px system-ui';
      ctx.fillText(part.name, px + 12, py - 12);
    });
  }
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
function coords(e: PointerEvent): [number, number] {
  const b = canvas.getBoundingClientRect();
  return [
    ((e.clientX - b.left) * canvas.width) / b.width,
    ((e.clientY - b.top) * canvas.height) / b.height,
  ];
}
canvas.addEventListener('pointerdown', (e) => {
  if (!edit.checked) return;
  const [cx, cy] = coords(e),
    s = width / rig.canvas[0],
    a = rig.anchor ?? [0.5, 0.9],
    f = flip.checked ? -1 : 1;
  let nearest = 18;
  for (const part of rig.parts) {
    const p = point(part.pivot, part.parent),
      d = Math.hypot(
        cx - (x + (p.x - rig.canvas[0] * a[0]) * s * f),
        cy - (y + (p.y - rig.canvas[1] * a[1]) * s),
      );
    if (d < nearest) {
      nearest = d;
      dragging = part.name;
    }
  }
  if (dragging) canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const part = rig.parts.find((p) => p.name === dragging)!,
    [cx, cy] = coords(e),
    s = width / rig.canvas[0],
    a = rig.anchor ?? [0.5, 0.9],
    f = flip.checked ? -1 : 1;
  const p = new DOMPoint(
    ((cx - x) / s) * f + rig.canvas[0] * a[0],
    (cy - y) / s + rig.canvas[1] * a[1],
  );
  const parent = part.parent ? rigMatrices(rig, state()).get(part.parent)! : new DOMMatrix(),
    local = p.matrixTransform(parent.inverse());
  part.pivot = [Math.round(local.x * 10) / 10, Math.round(local.y * 10) / 10];
  sync();
  status.textContent = 'Updated ' + part.name + ' pivot.';
});
const release = () => {
  dragging = null;
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
document.querySelector('#test')!.addEventListener('click', () => {
  fixture = testRig();
  rig = fixture.rig;
  sprites = fixture.sprites;
  elapsed = 0;
  sync();
  status.textContent = 'Procedural boss split into six full-canvas parts.';
});
document.querySelector('#apply')!.addEventListener('click', () => {
  try {
    const parsed = parseRig(JSON.parse(json.value));
    if (!parsed) throw Error('Invalid rig, missing parent or cyclic hierarchy.');
    rig = parsed;
    sync();
    status.textContent = 'Rig applied.';
  } catch (e) {
    status.textContent = String(e);
  }
});
document.querySelector('#copy')!.addEventListener('click', () => {
  sync();
  void navigator.clipboard
    .writeText(json.value)
    .then(() => (status.textContent = 'JSON copied.'))
    .catch(() => {
      json.focus();
      json.select();
      status.textContent = 'Select and copy the JSON below.';
    });
});
document.querySelector<HTMLInputElement>('#rig-file')!.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const parsed = parseRig(JSON.parse(await file.text()));
    if (!parsed) throw Error('Invalid rig.');
    rig = parsed;
    sync();
    status.textContent = 'Rig loaded; choose its part images.';
  } catch (error) {
    status.textContent = String(error);
  }
});
document.querySelector<HTMLInputElement>('#parts')!.addEventListener('change', async (e) => {
  for (const file of Array.from((e.target as HTMLInputElement).files ?? [])) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const white = document.createElement('canvas');
      white.width = img.width;
      white.height = img.height;
      const c = white.getContext('2d')!;
      c.drawImage(img, 0, 0);
      c.globalCompositeOperation = 'source-in';
      c.fillStyle = '#fff';
      c.fillRect(0, 0, img.width, img.height);
      sprites.set(file.name.replace(/\.(png|webp)$/i, ''), {
        img,
        white,
        w: img.width,
        h: img.height,
        ax: 0.5,
        ay: 0.9,
      });
    } catch (error) {
      status.textContent = String(error);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  status.textContent = 'Part images loaded.';
});
// Deliberately dev-only inspection handle; this file is not a production entry.
Object.assign(window, {
  __rigViewer: {
    get rig() {
      return rig;
    },
    get sprites() {
      return sprites;
    },
    drawRig,
    parseRig,
  },
});
