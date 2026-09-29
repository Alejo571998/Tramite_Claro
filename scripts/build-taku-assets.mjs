// scripts/build-taku-assets.mjs
// Genera las variantes web de Taku a partir del PNG original (assets/img/taku_tramite.png).
// Solo reescala / recodifica: NO modifica el arte del personaje.
//   node scripts/build-taku-assets.mjs
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";

const src = readFileSync("assets/img/taku_tramite.png").toString("base64");
mkdirSync("src/assets/taku", { recursive: true });
mkdirSync("public/icons", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");

async function render({ size, type, quality, bg, pad = 0 }) {
  return page.evaluate(
    async ({ src, size, type, quality, bg, pad }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${src}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      if (bg) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size, size);
      }
      const inner = size - pad * 2;
      ctx.drawImage(img, pad, pad, inner, inner);
      return c.toDataURL(type, quality).split(",")[1];
    },
    { src, size, type, quality, bg, pad },
  );
}

const out = [
  ["src/assets/taku/taku-480.webp", { size: 480, type: "image/webp", quality: 0.92 }],
  ["src/assets/taku/taku-240.webp", { size: 240, type: "image/webp", quality: 0.92 }],
  ["public/icons/apple-touch-icon.png", { size: 180, type: "image/png", bg: "#EAF3EF", pad: 10 }],
  ["public/icons/icon-192.png", { size: 192, type: "image/png", bg: "#EAF3EF", pad: 12 }],
  ["public/icons/icon-512.png", { size: 512, type: "image/png", bg: "#EAF3EF", pad: 40 }],
  ["public/og-taku.png", { size: 512, type: "image/png", bg: "#FAFAF8", pad: 24 }],
];
for (const [file, opts] of out) {
  const b64 = await render(opts);
  writeFileSync(file, Buffer.from(b64, "base64"));
  console.log(file, Math.round(Buffer.byteLength(b64, "base64") / 1024) + "KB");
}
await browser.close();

copyFileSync("favicon.ico", "public/favicon.ico");
console.log("public/favicon.ico");
