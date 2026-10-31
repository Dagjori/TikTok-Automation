#!/usr/bin/env node
// Rendert die neuen Stilbilder ab Nr. 9 (Maßstab-Layout) als 1080×1920 PNG und die Übersicht uebersicht_neu.jpg.
// Three.js-Stile zeichnen die Szene selbst. Blender-Stile laden das Szenenbild aus pipeline/out/stile/blender/
// (vorher das jeweilige Python-Skript ausführen, siehe Kopf der .py-Datei) und legen nur das HUD darüber.
//
// Aufruf (im Ordner pipeline/):
//   node stile/render_neu.js              alle neuen Stile + Übersicht
//   node stile/render_neu.js 12 13        nur Stil 12 und 13 (+ Übersicht)
//   node stile/render_neu.js --zonen      mit roten Flächen für die sicheren Zonen (Prüfung, nach out/stile/)
//   node stile/render_neu.js --gpu        echte Grafikkarte statt SwiftShader (Windows-PC)
//   node stile/render_neu.js --ohne-uebersicht
// Ausgabe: docs/assets/stile/stil_<nr>_<name>.png, docs/assets/stile/uebersicht_neu.jpg, Messwerte stile/messung_neu.json
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
const BLENDER_OUT = path.join(REPO, "pipeline", "out", "stile", "blender");

export const STILE_NEU = [
  { nr: 9, name: "holz", titel: "Holzspielzeug-Tisch", technik: "Blender Cycles" },
  { nr: 10, name: "papier", titel: "Papier-Diorama", technik: "Blender Cycles" },
  { nr: 11, name: "filz", titel: "Filz & Knöpfe", technik: "Blender Cycles" },
  { nr: 12, name: "comic", titel: "Comic-Toon 3D", technik: "Three.js" },
  { nr: 13, name: "blaupause", titel: "Blaupause / Schnittmodell", technik: "Three.js" },
  { nr: 14, name: "glas", titel: "Glas-Labor (Füllstand)", technik: "Blender Cycles" },
  { nr: 15, name: "holz_gltf", titel: "Holz gebacken (Blender → glTF → Three.js)", technik: "Blender-Bake + Three.js" },
];

function ladePlaywright() {
  try {
    return require("playwright");
  } catch {
    const global = execSync("npm root -g").toString().trim();
    return require(path.join(global, "playwright"));
  }
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".bin": "application/octet-stream" };

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
  const auswahl = nummern.length ? STILE_NEU.filter((s) => nummern.includes(s.nr)) : STILE_NEU;
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

  const mFile = path.join(HIER, "messung_neu.json");
  const alt = fs.existsSync(mFile) ? JSON.parse(fs.readFileSync(mFile, "utf8")) : { messung: [] };
  const messung = new Map(alt.messung.map((m) => [m.nr, m]));
  for (const s of auswahl) {
    const t0 = Date.now();
    await page.goto(`${basis}/pipeline/stile/stil_${s.nr}_${s.name}.html${pruef ? "?zonen=1" : ""}`);
    await page.waitForFunction(() => window.__fertig === true || window.__fehler, null, { timeout: 600000 });
    const fehler = await page.evaluate(() => window.__fehler);
    if (fehler) throw new Error(`Stil ${s.nr}: ${fehler}`);
    const t1 = Date.now();
    const datei = path.join(ausgabe, `stil_${s.nr}_${s.name}.png`);
    await page.screenshot({ path: datei, type: "png", animations: "disabled", caret: "hide" });
    // Zeit je Videobild: ein zweites Bild zeichnen und als JPG fotografieren (wie render.js)
    const t1b = Date.now();
    await page.evaluate(() => window.renderAt(0.5));
    await page.screenshot({ type: "jpeg", quality: 95, animations: "disabled", caret: "hide" });
    const t3 = Date.now();
    const eintrag = { nr: s.nr, name: s.name, titel: s.titel, technik: s.technik, laden_s: (t1 - t0) / 1000, bild_s: (t3 - t1b) / 1000 };
    const bl = path.join(BLENDER_OUT, `stil_${s.nr}_${s.name}.json`);
    if (fs.existsSync(bl)) eintrag.blender = JSON.parse(fs.readFileSync(bl, "utf8"));
    messung.set(s.nr, eintrag);
    const bInfo = eintrag.blender ? ` · Blender-Szene ${eintrag.blender.sekunden.toFixed(0)} s (${eintrag.blender.samples} Samples)` : "";
    console.log(`Stil ${s.nr} ${s.titel}: Laden ${eintrag.laden_s.toFixed(1)} s · je Videobild (Browser) ${eintrag.bild_s.toFixed(2)} s${bInfo} → ${path.relative(REPO, datei)}`);
  }
  if (!pruef) {
    fs.writeFileSync(mFile, JSON.stringify({ stand: new Date().toISOString(), gpu, hinweis: "Cloud-Container, 4 Kerne, ohne GPU (SwiftShader bzw. Cycles CPU). bild_s = zweites Bild im Browser zeichnen + JPG; blender.sekunden = Cycles-Render der Szene 1080×1920.", messung: [...messung.values()].sort((a, b) => a.nr - b.nr) }, null, 1));
  }

  if (!pruef && !args.includes("--ohne-uebersicht")) {
    await page.setViewportSize({ width: 2000, height: 1000 });
    await page.goto(`${basis}/pipeline/stile/uebersicht_neu.html`);
    await page.waitForFunction(() => window.__fertig === true, null, { timeout: 60000 });
    const groesse = await page.evaluate(() => ({ w: document.body.scrollWidth, h: document.body.scrollHeight }));
    await page.setViewportSize({ width: groesse.w, height: groesse.h });
    await page.screenshot({ path: path.join(ZIEL, "uebersicht_neu.jpg"), type: "jpeg", quality: 86, fullPage: true });
    console.log(`Übersicht → docs/assets/stile/uebersicht_neu.jpg (${groesse.w}×${groesse.h})`);
  }
  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
