#!/usr/bin/env node
// Rendert die Stil-Muster als Standbilder (1080×1920 PNG) und die Übersicht (JPG).
// Bewusst schlank: ein Browser, eine Seite nach der anderen (parallel kann ein Video-Render laufen).
//
// Aufruf (im Ordner pipeline/):
//   node stile/render_stile.js              alle Stile + Übersicht
//   node stile/render_stile.js 2 5          nur Stil 2 und 5 (+ Übersicht)
//   node stile/render_stile.js --zonen      mit roten Flächen für die sicheren Zonen (Prüfung, nach out/stile/)
//   node stile/render_stile.js --gpu        echte Grafikkarte statt SwiftShader (Windows-PC)
// Ausgabe: docs/assets/stile/stil_<nr>_<name>.png und docs/assets/stile/uebersicht.jpg
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HIER = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HIER, "..", "..");
const ZIEL = path.join(REPO, "docs", "assets", "stile");

export const STILE = [
  { nr: 1, name: "lowpoly", titel: "Low-Poly-Miniatur (aktuell)" },
  { nr: 2, name: "isometrisch", titel: "Isometrisches 3D" },
  { nr: 3, name: "clay", titel: "Clay-Spielzeug-3D" },
  { nr: 4, name: "flat", titel: "2D-Flat-Infografik" },
  { nr: 5, name: "neon", titel: "Neon-Daten-Dashboard" },
  { nr: 6, name: "collage", titel: "Papier-Collage" },
  { nr: 7, name: "typo", titel: "Kinetische Typografie" },
  { nr: 8, name: "karte", titel: "Karten-/Satellitenoptik" },
];

function ladePlaywright() {
  try {
    return require("playwright");
  } catch {
    const global = execSync("npm root -g").toString().trim();
    return require(path.join(global, "playwright"));
  }
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

function starteServer() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const datei = path.normalize(path.join(REPO, url));
    if (!datei.startsWith(REPO) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) {
      res.writeHead(404);
      res.end("nicht gefunden");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(datei)] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(datei).pipe(res);
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

async function main() {
  const args = process.argv.slice(2);
  const gpu = args.includes("--gpu");
  const pruef = args.includes("--zonen");
  const nummern = args.filter((a) => /^\d+$/.test(a)).map(Number);
  const auswahl = nummern.length ? STILE.filter((s) => nummern.includes(s.nr)) : STILE;
  const ausgabe = pruef ? path.join(REPO, "pipeline", "out", "stile") : ZIEL;
  fs.mkdirSync(ausgabe, { recursive: true });

  const server = await starteServer();
  const basis = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = ladePlaywright();
  const gl = gpu ? ["--use-gl=angle", "--ignore-gpu-blocklist"] : ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
  const browser = await chromium.launch({ args: [...gl, "--font-render-hinting=none", "--force-color-profile=srgb"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on("pageerror", (f) => console.error("Seitenfehler:", f.message));
  page.on("console", (m) => { if (m.type() === "error") console.error("Konsole:", m.text()); });

  const messung = [];
  for (const s of auswahl) {
    const t0 = Date.now();
    await page.goto(`${basis}/pipeline/stile/stil_${s.nr}_${s.name}.html${pruef ? "?zonen=1" : ""}`);
    await page.waitForFunction(() => window.__fertig === true || window.__fehler, null, { timeout: 300000 });
    const fehler = await page.evaluate(() => window.__fehler);
    if (fehler) throw new Error(`Stil ${s.nr}: ${fehler}`);
    const t1 = Date.now();
    // Zeit je Videobild schätzen: ein weiteres Bild zeichnen und fotografieren
    await page.evaluate(() => window.renderAt(0.5));
    const t2 = Date.now();
    const datei = path.join(ausgabe, `stil_${s.nr}_${s.name}.png`);
    await page.screenshot({ path: datei, type: "png", animations: "disabled", caret: "hide" });
    const t3 = Date.now();
    messung.push({ ...s, laden_s: (t1 - t0) / 1000, bild_s: (t3 - t1) / 1000, zeichnen_ms: t2 - t1, foto_ms: t3 - t2 });
    console.log(`Stil ${s.nr} ${s.titel}: Laden ${((t1 - t0) / 1000).toFixed(1)} s · je Bild ${((t3 - t1) / 1000).toFixed(2)} s (Zeichnen ${t2 - t1} ms, Foto ${t3 - t2} ms) → ${path.relative(REPO, datei)}`);
  }
  fs.writeFileSync(path.join(REPO, "pipeline", "stile", "messung.json"), JSON.stringify({ stand: new Date().toISOString(), gpu, messung }, null, 1));

  if (!pruef) {
    // Übersicht: alle Stile nebeneinander mit Namen
    await page.setViewportSize({ width: 2000, height: 1000 });
    await page.goto(`${basis}/pipeline/stile/uebersicht.html`);
    await page.waitForFunction(() => window.__fertig === true, null, { timeout: 60000 });
    const groesse = await page.evaluate(() => ({ w: document.body.scrollWidth, h: document.body.scrollHeight }));
    await page.setViewportSize({ width: groesse.w, height: groesse.h });
    await page.screenshot({ path: path.join(ZIEL, "uebersicht.jpg"), type: "jpeg", quality: 88, fullPage: true });
    console.log(`Übersicht → docs/assets/stile/uebersicht.jpg (${groesse.w}×${groesse.h})`);
  }
  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
