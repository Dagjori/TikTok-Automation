#!/usr/bin/env node
// Rendert ein Projekt Bild für Bild in Headless-Chromium (parallel mit mehreren Workern).
//
// Aufruf (im Ordner pipeline/):
//   node render.js projekte/gta6-welt                     ganzes Video → out/gta6-welt/frames/
//   node render.js projekte/gta6-welt --von 10 --bis 20   nur ein Ausschnitt (Sekunden)
//   node render.js projekte/gta6-welt --worker 4          Anzahl paralleler Chromium-Prozesse
//   node render.js projekte/gta6-welt --zeiten 1.5,30     Standbilder (PNG) → out/gta6-welt/standbilder/
//   Optionen: --fps 30  --format jpg|png  --qualitaet 95  --nur-fehlende  --ausgabe <ordner>
//             --query "msaa=4&schatten=2048"  (Qualitätsschalter, die die Szene auswertet)
//             --gpu   echte Grafikkarte statt SwiftShader (Windows-PC)
//
// Die Szene (szene.html) muss window.renderAt(t), window.dauer und window.__fertig bereitstellen.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { schaetzeTiming } from "./engine/zeitplan.js";

const require = createRequire(import.meta.url);
const WURZEL = path.dirname(fileURLToPath(import.meta.url));

function ladePlaywright() {
  try {
    return require("playwright");
  } catch {
    const global = execSync("npm root -g").toString().trim();
    return require(path.join(global, "playwright"));
  }
}

function argumente(argv) {
  const a = { projekt: null, von: null, bis: null, worker: Math.max(1, Math.min(4, os.cpus().length)), fps: 30, format: "jpg", qualitaet: 95, zeiten: null, nurFehlende: false, ausgabe: null };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    const n = () => argv[++i];
    if (x === "--von") a.von = parseFloat(n());
    else if (x === "--bis") a.bis = parseFloat(n());
    else if (x === "--worker") a.worker = parseInt(n(), 10);
    else if (x === "--fps") a.fps = parseFloat(n());
    else if (x === "--format") a.format = n();
    else if (x === "--qualitaet") a.qualitaet = parseInt(n(), 10);
    else if (x === "--zeiten") a.zeiten = n().split(",").map(Number);
    else if (x === "--nur-fehlende") a.nurFehlende = true;
    else if (x === "--ausgabe") a.ausgabe = n();
    else if (x === "--query") a.query = n();
    else if (x === "--gpu") a.gpu = true;
    else if (!x.startsWith("--")) a.projekt = x;
  }
  if (!a.projekt) {
    console.error("Aufruf: node render.js <projektordner> [--von s --bis s] [--worker N] [--zeiten a,b,c]");
    process.exit(1);
  }
  return a;
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".otf": "font/otf", ".mp3": "audio/mpeg" };

function starteServer() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const datei = path.normalize(path.join(WURZEL, url));
    if (!datei.startsWith(WURZEL) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) {
      res.writeHead(404);
      res.end("nicht gefunden");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(datei)] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(datei).pipe(res);
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

/** Timing-Schätzung schreiben, solange die echte Stimme fehlt */
function timingVorbereiten(projektDir) {
  const echt = path.join(projektDir, "audio", "timing.json");
  if (fs.existsSync(echt)) return "timing.json (echte Stimme)";
  const skript = JSON.parse(fs.readFileSync(path.join(projektDir, "skript.json"), "utf8"));
  fs.mkdirSync(path.join(projektDir, "audio"), { recursive: true });
  const t = schaetzeTiming(skript);
  fs.writeFileSync(path.join(projektDir, "audio", "timing_schaetzung.json"), JSON.stringify(t, null, 1));
  return `timing_schaetzung.json (geschätzt, ${t.dauer.toFixed(1)} s Sprechzeit)`;
}

async function oeffneSeite(chromium, url, gpu = false) {
  // Ohne GPU (Cloud): WebGL über SwiftShader. Mit --gpu: Grafikkarte des Rechners (z. B. Windows-PC).
  const gl = gpu ? ["--use-gl=angle", "--ignore-gpu-blocklist"] : ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
  const browser = await chromium.launch({
    args: [...gl, "--disable-gpu-vsync", "--disable-frame-rate-limit", "--font-render-hinting=none", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on("pageerror", (f) => console.error("Seitenfehler:", f.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.error("Konsole:", m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__fertig === true || window.__fehler, null, { timeout: 600000 });
  const fehler = await page.evaluate(() => window.__fehler);
  if (fehler) throw new Error("Szene meldet Fehler: " + fehler);
  return { browser, page };
}

async function main() {
  const a = argumente(process.argv.slice(2));
  const projektDir = path.resolve(process.cwd(), a.projekt);
  const name = path.basename(projektDir);
  const relativ = path.relative(WURZEL, projektDir).split(path.sep).join("/");
  const timingInfo = timingVorbereiten(projektDir);
  const outDir = a.ausgabe ? path.resolve(a.ausgabe) : path.join(WURZEL, "out", name, a.zeiten ? "standbilder" : "frames");
  fs.mkdirSync(outDir, { recursive: true });

  const server = await starteServer();
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/${relativ}/szene.html${a.query ? "?" + a.query.replace(/^\?/, "") : ""}`;
  const { chromium } = ladePlaywright();
  console.log(`Projekt ${name} · ${timingInfo}`);

  // Erste Seite: Dauer und Klang-Ereignisse abfragen
  const erste = await oeffneSeite(chromium, url, a.gpu);
  const dauer = await erste.page.evaluate(() => window.dauer);
  const fps = a.fps;
  const meta = await erste.page.evaluate(() => ({ dauer: window.dauer, klang: window.klangEreignisse || [], stimmEnde: window.stimmEnde }));
  fs.mkdirSync(path.join(WURZEL, "out", name), { recursive: true });
  fs.writeFileSync(path.join(WURZEL, "out", name, "ereignisse.json"), JSON.stringify({ ...meta, fps }, null, 1));

  let auftraege;
  if (a.zeiten) {
    auftraege = a.zeiten.map((t) => ({ t, datei: path.join(outDir, `t${t.toFixed(2).replace(".", "_")}.png`), format: "png" }));
  } else {
    const gesamt = Math.round(dauer * fps);
    const von = a.von != null ? Math.max(0, Math.floor(a.von * fps)) : 0;
    const bis = a.bis != null ? Math.min(gesamt, Math.ceil(a.bis * fps)) : gesamt;
    auftraege = [];
    for (let f = von; f < bis; f++) {
      const datei = path.join(outDir, `f_${String(f).padStart(5, "0")}.${a.format}`);
      if (a.nurFehlende && fs.existsSync(datei)) continue;
      auftraege.push({ f, t: f / fps, datei, format: a.format });
    }
    console.log(`Dauer ${dauer.toFixed(2)} s · ${gesamt} Bilder gesamt · rendere ${auftraege.length} (${von}–${bis - 1}) mit ${a.worker} Workern → ${path.relative(process.cwd(), outDir)}`);
  }

  const start = Date.now();
  let fertig = 0;
  let naechster = 0;
  const zeiten = { render: 0, bild: 0 };
  async function worker(nr, seite) {
    const { browser, page } = seite || (await oeffneSeite(chromium, url, a.gpu));
    try {
      while (naechster < auftraege.length) {
        const job = auftraege[naechster++];
        const t0 = Date.now();
        await page.evaluate((t) => window.renderAt(t), job.t);
        const t1 = Date.now();
        const opt = { path: job.datei, type: job.format === "png" ? "png" : "jpeg", animations: "disabled", caret: "hide", timeout: 180000 };
        if (opt.type === "jpeg") opt.quality = a.qualitaet;
        await page.screenshot(opt);
        zeiten.render += t1 - t0;
        zeiten.bild += Date.now() - t1;
        fertig++;
        if (fertig % 30 === 0 || fertig === auftraege.length || a.zeiten) {
          const s = (Date.now() - start) / 1000;
          const rate = fertig / s;
          const rest = (auftraege.length - fertig) / rate;
          console.log(`  ${fertig}/${auftraege.length} · ${(s / fertig).toFixed(2)} s/Bild effektiv · Rest ca. ${(rest / 60).toFixed(1)} min`);
        }
      }
    } finally {
      await browser.close();
    }
  }
  const worker1 = Math.min(a.worker, auftraege.length || 1);
  await Promise.all(Array.from({ length: worker1 }, (_, i) => worker(i, i === 0 ? erste : null)));
  const s = (Date.now() - start) / 1000;
  console.log(`Fertig: ${fertig} Bilder in ${(s / 60).toFixed(1)} min (${(s / Math.max(1, fertig)).toFixed(2)} s/Bild effektiv; je Bild im Worker: Rendern ${(zeiten.render / Math.max(1, fertig)).toFixed(0)} ms, Screenshot ${(zeiten.bild / Math.max(1, fertig)).toFixed(0)} ms)`);
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
