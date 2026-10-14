/** Build-time WebP atlases. Loose frames remain the source of truth for the art pipeline.
 * JSON adds atlas: {version, file, width, height, hash, sourceHash, frames: {filename:{x,y,w,h}}}.
 * Original fps/cx/foot/k and frame order are never changed. --verify checks cached atlas alpha/RGB error.
 * --prune-dist removes only verified atlas-backed loose frame copies from the production build.
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
// Owner-approved quality/size tradeoff. Alpha stays exact so masks and glow silhouettes are preserved.
const WEBP = {
  quality: 88,
  alphaQuality: 100,
  effort: 6,
  smartSubsample: true,
};
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
  let error = 0,
    channels = 0,
    maxRGB = 0;
  for (let i = 0; i < source.length; i++) {
    const frame = source[i],
      r = rects[frame.name];
    for (let y = 0; y < r.h; y++)
      for (let x = 0; x < r.w; x++) {
        const a = (y * r.w + x) * 4,
          b = ((r.y + y) * info.width + r.x + x) * 4;
        if (frame.pixels[a + 3] !== data[b + 3])
          throw new Error(`Alpha mismatch in ${frame.name} at ${x},${y}`);
        if (frame.pixels[a + 3])
          for (let c = 0; c < 3; c++) {
            const diff = Math.abs(frame.pixels[a + c] - data[b + c]);
            error += diff;
            channels++;
            maxRGB = Math.max(maxRGB, diff);
          }
      }
  }
  return { mae: channels ? error / channels : 0, maxRGB };
}

function inside(base, target) {
  const relative = path.relative(base, target);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(".." + path.sep) &&
    !path.isAbsolute(relative)
  );
}

function frameFile(folder, name) {
  if (typeof name !== "string" || name === "atlas.webp")
    throw new Error(`Unsafe frame name: ${name}`);
  const file = path.resolve(folder, name);
  if (
    !inside(folder, file) ||
    path.relative(path.join(folder, "atlas.webp"), file) === ""
  )
    throw new Error(`Unsafe frame path: ${name}`);
  return file;
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
      const file = frameFile(folder, name);
      return { name, bytes: await fs.readFile(file) };
    }),
  );
  const sourceHash = hash(
    Buffer.concat([
      Buffer.from(`atlas-${VERSION}-${PAD}-${JSON.stringify(WEBP)}\n`),
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
    // Always encode from the original decoded frames, never from a previously lossy atlas.
    encoded = await sharp(raw, { raw: { width, height, channels: 4 } })
      .webp(WEBP)
      .toBuffer();
  }
  const difference = await checkPixels(encoded, pixels, rects);
  doc.atlas = {
    version: VERSION,
    file: "atlas.webp",
    width,
    height,
    hash: hash(encoded),
    sourceHash,
    encoding: WEBP,
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
    `${path.relative(root, folder)}: ${names.length} → 1 image, ${(previous / 1024).toFixed(1)} → ${(encoded.length / 1024).toFixed(1)} KiB; alpha exact, visible RGB MAE ${difference.mae.toFixed(2)}/255, max ${difference.maxRGB}`,
  );
}

const collections = [
  ["anim", "clip.json"],
  ["hero", "hero.json"],
];

async function pruneDist() {
  const repo = await fs.realpath(root);
  const dist = await fs.realpath(path.join(repo, "dist"));
  // Reject a redirected output directory; every unlink target is resolved and checked below too.
  if (path.relative(path.join(repo, "dist"), dist) !== "")
    throw new Error("dist must be a directory inside this repository");
  const removals = new Set();
  for (const [parent, jsonName] of collections) {
    const base = path.join(dist, parent);
    if (!(await exists(base))) continue;
    for (const entry of await fs.readdir(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const folder = path.join(base, entry.name),
        jsonFile = path.join(folder, jsonName);
      if (!(await exists(jsonFile))) continue;
      const doc = JSON.parse(await fs.readFile(jsonFile, "utf8"));
      if (!doc.atlas) continue; // Unpacked animations retain their loose fallback files.
      const original = JSON.parse(
        await fs.readFile(
          path.join(repo, "public", parent, entry.name, jsonName),
          "utf8",
        ),
      );
      const a = doc.atlas;
      if (
        a.version !== VERSION ||
        a.file !== "atlas.webp" ||
        JSON.stringify(a) !== JSON.stringify(original.atlas)
      )
        throw new Error(`Unverified atlas metadata: ${jsonFile}`);
      const atlasPath = await fs.realpath(path.join(folder, a.file));
      if (!inside(dist, atlasPath))
        throw new Error(`Atlas outside dist: ${atlasPath}`);
      const encoded = await fs.readFile(atlasPath);
      if (hash(encoded) !== a.hash)
        throw new Error(`Damaged atlas: ${atlasPath}`);
      const info = await sharp(encoded).metadata();
      if (
        info.width !== a.width ||
        info.height !== a.height ||
        a.width > MAX ||
        a.height > MAX
      )
        throw new Error(`Invalid atlas size: ${atlasPath}`);
      const frames = doc.frames ?? Object.values(doc.clips ?? {}).flat();
      for (const name of new Set(frames.map((f) => f.f))) {
        const r = a.frames?.[name];
        if (
          !r ||
          ![r.x, r.y, r.w, r.h].every(Number.isInteger) ||
          r.x < 0 ||
          r.y < 0 ||
          r.w < 1 ||
          r.h < 1 ||
          r.x + r.w > a.width ||
          r.y + r.h > a.height
        )
          throw new Error(`Invalid frame rect: ${name}`);
        const target = frameFile(folder, name);
        if (!(await exists(target))) continue; // Re-running postbuild is safe.
        if (!inside(dist, await fs.realpath(target)))
          throw new Error(`Frame outside dist: ${target}`);
        removals.add(target);
      }
    }
  }
  // Validate every atlas first: a bad folder cannot leave a partially pruned deployment.
  for (const file of removals) await fs.unlink(file);
  console.log(
    `Removed ${removals.size} loose frame copies from dist; public sources retained.`,
  );
}

if (process.argv.includes("--prune-dist")) {
  await pruneDist();
} else
  for (const [collection, json] of collections) {
    const parent = "public/" + collection;
    const base = path.join(root, parent);
    if (!(await exists(base))) continue;
    for (const entry of (await fs.readdir(base, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      if (entry.isDirectory()) await pack(path.join(base, entry.name), json);
    }
  }
