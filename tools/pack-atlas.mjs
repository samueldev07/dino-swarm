/** Build-time WebP atlases. Loose frames remain the source of truth for the art pipeline.
 * JSON adds atlas: {version, file, width, height, hash, sourceHash, frames: {filename:{x,y,w,h}}}.
 * Original fps/cx/foot/k and frame order are never changed. --verify also checks cached atlases.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const MAX = 4096,
  PAD = 2,
  VERSION = 1;
const verify = process.argv.includes("--verify");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const exists = async (file) => {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
};

async function checkPixels(atlas, source, rects) {
  const { data, info } = await sharp(atlas)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < source.length; i++) {
    const frame = source[i],
      r = rects[frame.name];
    for (let y = 0; y < r.h; y++)
      for (let x = 0; x < r.w; x++) {
        const a = (y * r.w + x) * 4,
          b = ((r.y + y) * info.width + r.x + x) * 4;
        // RGB under zero alpha has no visual meaning; every visible RGB and every alpha must match.
        if (
          frame.pixels[a + 3] !== data[b + 3] ||
          (frame.pixels[a + 3] &&
            (frame.pixels[a] !== data[b] ||
              frame.pixels[a + 1] !== data[b + 1] ||
              frame.pixels[a + 2] !== data[b + 2]))
        ) {
          throw new Error(`Pixel mismatch in ${frame.name} at ${x},${y}`);
        }
      }
  }
}

async function pack(folder, jsonName) {
  const jsonFile = path.join(folder, jsonName);
  if (!(await exists(jsonFile))) return;
  const doc = JSON.parse(await fs.readFile(jsonFile, "utf8"));
  const frames = doc.frames ?? Object.values(doc.clips ?? {}).flat();
  const names = [...new Set(frames.map((f) => f.f))];
  if (!names.length) return;
  const source = await Promise.all(
    names.map(async (name) => {
      const file = path.resolve(folder, name);
      if (!file.startsWith(folder + path.sep) || name === "atlas.webp")
        throw new Error(`Unsafe frame path: ${name}`);
      return { name, bytes: await fs.readFile(file) };
    }),
  );
  const sourceHash = hash(
    Buffer.concat([
      Buffer.from(`atlas-${VERSION}-${PAD}\n`),
      ...source.flatMap((f) => [Buffer.from(f.name + "\n"), f.bytes]),
    ]),
  );
  const output = path.join(folder, "atlas.webp");
  const old = doc.atlas;
  let encoded;
  if (
    old?.version === VERSION &&
    old.sourceHash === sourceHash &&
    (await exists(output))
  ) {
    encoded = await fs.readFile(output);
    if (hash(encoded) === old.hash && !verify) {
      console.log(
        `${path.relative(root, folder)}: cached ${names.length} frames, ${(encoded.length / 1024).toFixed(1)} KiB`,
      );
      return;
    }
  }
  const pixels = await Promise.all(
    source.map(async (f) => {
      const { data, info } = await sharp(f.bytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return { ...f, pixels: data, width: info.width, height: info.height };
    }),
  );
  const cellW = Math.max(...pixels.map((f) => f.width)) + PAD * 2;
  const cellH = Math.max(...pixels.map((f) => f.height)) + PAD * 2;
  const cols = Math.min(
    Math.ceil(Math.sqrt(names.length)),
    Math.floor(MAX / cellW),
  );
  const width = cols * cellW,
    height = Math.ceil(names.length / cols) * cellH;
  if (!cols || width > MAX || height > MAX)
    throw new Error(`Atlas exceeds ${MAX}px: ${folder}`);
  const raw = Buffer.alloc(width * height * 4);
  const rects = {};
  pixels.forEach((f, i) => {
    const r = (rects[f.name] = {
      x: (i % cols) * cellW + PAD,
      y: Math.floor(i / cols) * cellH + PAD,
      w: f.width,
      h: f.height,
    });
    for (let y = 0; y < f.height; y++)
      f.pixels.copy(
        raw,
        ((r.y + y) * width + r.x) * 4,
        y * f.width * 4,
        (y + 1) * f.width * 4,
      );
  });
  if (
    !encoded ||
    old?.sourceHash !== sourceHash ||
    hash(encoded) !== old?.hash
  ) {
    // Lossless avoids a second lossy pass over the already approved WebP artwork.
    encoded = await sharp(raw, { raw: { width, height, channels: 4 } })
      .webp({ lossless: true, quality: 100, effort: 6 })
      .toBuffer();
  }
  await checkPixels(encoded, pixels, rects);
  doc.atlas = {
    version: VERSION,
    file: "atlas.webp",
    width,
    height,
    hash: hash(encoded),
    sourceHash,
    frames: rects,
  };
  if (
    !(await exists(output)) ||
    hash(await fs.readFile(output)) !== doc.atlas.hash
  )
    await fs.writeFile(output, encoded);
  const json = JSON.stringify(doc, null, 1) + "\n";
  if ((await fs.readFile(jsonFile, "utf8")) !== json)
    await fs.writeFile(jsonFile, json);
  const previous = source.reduce((n, f) => n + f.bytes.length, 0);
  console.log(
    `${path.relative(root, folder)}: ${names.length} → 1 image, ${(previous / 1024).toFixed(1)} → ${(encoded.length / 1024).toFixed(1)} KiB; visible pixels verified`,
  );
}

for (const [parent, json] of [
  ["public/anim", "clip.json"],
  ["public/hero", "hero.json"],
]) {
  const base = path.join(root, parent);
  if (!(await exists(base))) continue;
  for (const entry of (await fs.readdir(base, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    if (entry.isDirectory()) await pack(path.join(base, entry.name), json);
  }
}
