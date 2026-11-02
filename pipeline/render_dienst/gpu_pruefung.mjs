#!/usr/bin/env node
// Liest den WebGL-Renderer aus, mit denselben Chromium-Schaltern wie render.js (damit das Ergebnis zum echten Render passt).
//   node render_dienst/gpu_pruefung.mjs           Schalter von „render.js --gpu“ (echte Grafikkarte)
//   node render_dienst/gpu_pruefung.mjs --cpu     Schalter von render.js ohne --gpu (SwiftShader, Cloud)
// Letzte Ausgabezeile: GPU_JSON:{"renderer": "...", "vendor": "...", "webgl2": true, "software": false, "ms": 1234}
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import path from "node:path";

const require = createRequire(import.meta.url);
function ladePlaywright() {
  try {
    return require("playwright");
  } catch {
    const global = execSync("npm root -g").toString().trim();
    return require(path.join(global, "playwright"));
  }
}

const cpu = process.argv.includes("--cpu");
const SOFTWARE = /swiftshader|llvmpipe|softpipe|basic render|\bwarp\b|software/i;
const gl = cpu ? ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : ["--use-gl=angle", "--ignore-gpu-blocklist"];
const start = Date.now();
let ergebnis;
let browser;
try {
  const { chromium } = ladePlaywright();
  browser = await chromium.launch({ args: [...gl, "--disable-gpu-vsync", "--disable-frame-rate-limit", "--font-render-hinting=none", "--force-color-profile=srgb"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const info = await page.evaluate(() => {
    const c = document.createElement("canvas");
    const g2 = c.getContext("webgl2");
    const g = g2 || document.createElement("canvas").getContext("webgl");
    if (!g) return { fehler: "Kein WebGL verfügbar" };
    const e = g.getExtension("WEBGL_debug_renderer_info");
    return {
      renderer: e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER),
      vendor: e ? g.getParameter(e.UNMASKED_VENDOR_WEBGL) : g.getParameter(g.VENDOR),
      version: g.getParameter(g.VERSION),
      webgl2: !!g2,
    };
  });
  ergebnis = info.fehler ? { fehler: info.fehler } : { ...info, software: SOFTWARE.test(`${info.renderer} ${info.vendor}`) || !info.webgl2 };
} catch (e) {
  ergebnis = { fehler: String(e && e.message ? e.message : e).split("\n")[0] };
} finally {
  if (browser) await browser.close().catch(() => {});
}
ergebnis.modus = cpu ? "cpu" : "gpu";
ergebnis.ms = Date.now() - start;
console.log("GPU_JSON:" + JSON.stringify(ergebnis));
