// Freeze the font source as well as the scene. A failed Vite font request must not skew comparison.
import fs from "node:fs";
const fonts = [
  ["Alegreya", "500", "alegreya/alegreya-latin-500-normal.woff2"],
  ["Alegreya", "700", "alegreya/alegreya-latin-700-normal.woff2"],
  ["Alegreya SC", "800", "alegreya-sc/alegreya-sc-latin-800-normal.woff2"],
].map(([family, weight, file]) => ({
  family,
  weight,
  data: fs
    .readFileSync(
      `node_modules/@fontsource/${file.split("/")[0]}/files/${file.split("/")[1]}`,
    )
    .toString("base64"),
}));
export async function loadFonts(page) {
  await page.evaluate(async (fonts) => {
    for (const { family, weight, data } of fonts) {
      const face = new FontFace(family, `url(data:font/woff2;base64,${data})`, {
        weight,
      });
      await face.load();
      document.fonts.add(face);
    }
    await document.fonts.ready;
  }, fonts);
}
