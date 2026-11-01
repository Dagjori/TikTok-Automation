// Prüft jedes Bild eines Projekts auf übereinanderliegende Texte im HUD: Tafel, Chips, Zähler, Ringe, Sticker-Text
// (nur die Plakette, nicht der Strahlenkranz), Titel, Pointe (Schlagzeile, je Zeile), Karten, Leiste, Folgen-Pille,
// eigene Schilder und Untertitel-Wörter. Gezählt wird ein Paar, wenn beide Elemente sichtbar sind (Deckkraft > 0,3,
// über alle Eltern multipliziert) und sich die Rechtecke berühren bzw. näher als --abstand px kommen (Standard 0).
//
//   node qc/text_ueberlappung.mjs projekte/<name> [--abstand 12] [--von 0 --bis 80] [--schritt 1] [--deckkraft 0.3]
//
// Nutzt window.hudAt(t) der Szene (nur HUD, schnell), sonst window.renderAt(t). Ausgabe: Zeitbereiche je Paar.
// Exit-Code 1, wenn es Treffer gibt.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv.slice(2);
const opt = { abstand: 0, von: 0, bis: Infinity, schritt: 1, deckkraft: 0.3, fps: 30 };
let projekt = null;
for (let i = 0; i < arg.length; i++) {
  const k = arg[i].replace(/^--/, "");
  if (arg[i].startsWith("--")) opt[k] = +arg[++i];
  else projekt = arg[i];
}
if (!projekt) { console.error("Aufruf: node qc/text_ueberlappung.mjs projekte/<name> [--abstand 12]"); process.exit(2); }
const projektDir = path.resolve(process.cwd(), projekt);
const relativ = path.relative(WURZEL, projektDir).split(path.sep).join("/");

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const datei = path.normalize(path.join(WURZEL, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!datei.startsWith(WURZEL) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(datei)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(datei).pipe(res);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(path.join(require("child_process").execSync("npm root -g").toString().trim(), "playwright"))); }
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--font-render-hinting=none"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on("pageerror", (f) => console.error("Seitenfehler:", f.message));
await page.goto(`http://127.0.0.1:${server.address().port}/${relativ}/szene.html?msaa=0&schatten=0`);
await page.waitForFunction(() => window.__fertig === true || window.__fehler, null, { timeout: 600000 });
const fehler = await page.evaluate(() => window.__fehler);
if (fehler) { console.error(fehler); process.exit(2); }
const dauer = await page.evaluate(() => window.dauer);
const nBilder = Math.round(dauer * opt.fps);

const paare = new Map(); // "A | B" → [Bildnummern]
const f0 = Math.max(0, Math.floor(opt.von * opt.fps)), f1 = Math.min(nBilder - 1, Math.ceil(Math.min(opt.bis, dauer) * opt.fps));
for (let f = f0; f <= f1; f += opt.schritt) {
  const treffer = await page.evaluate(({ t, minDeck, abstand }) => {
    (window.hudAt || window.renderAt)(t);
    const wurzel = document.getElementById("hud");
    const deck = (e) => {
      let o = 1;
      for (let n = e; n && n !== document.body; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === "none" || cs.visibility === "hidden") return 0;
        o *= +cs.opacity;
      }
      return o;
    };
    const name = (e, art) => `${art}:${(e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 28)}`;
    const liste = [];
    const nimm = (e, art) => {
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      if (deck(e) <= minDeck) return;
      liste.push({ n: name(e, art), r, art, gruppe: art === "pointe" ? e.parentElement : null });
    };
    for (const e of wurzel.querySelectorAll(".ms")) {
      if (e.parentElement && e.parentElement.closest(".ms")) continue; // nur oberste Bausteine
      if (e.classList.contains("ms-ut")) continue;
      if (e.classList.contains("ms-stempel")) { const p = e.querySelector(".ms-plakette"); if (p) nimm(p, "sticker"); continue; }
      if (e.classList.contains("ms-pointe")) { for (const z of e.querySelectorAll(".ms-pz")) { const ws = [...z.querySelectorAll(".ms-pw")].filter((w) => deck(w) > minDeck); if (ws.length) nimm(z, "pointe"); } continue; }
      if (e.classList.contains("ms-folgen")) { const p = e.querySelector(".ms-fp"); if (p) nimm(p, "folgen"); continue; }
      if (e.classList.contains("ms-titel")) { for (const w of e.querySelectorAll(".ms-tw")) nimm(w, "titel"); continue; }
      nimm(e, (e.className.split(/\s+/).find((c) => c.startsWith("ms-") || c.startsWith("fa-")) || "ms").replace(/^ms-/, ""));
    }
    for (const w of wurzel.querySelectorAll(".karaoke .w")) nimm(w, "untertitel");
    const aus = [];
    for (let i = 0; i < liste.length; i++) for (let j = i + 1; j < liste.length; j++) {
      const a = liste[i], b = liste[j];
      if (a.art === b.art && (a.art === "untertitel" || a.art === "titel")) continue; // Wörter einer Zeile stehen dicht
      if (a.gruppe && a.gruppe === b.gruppe) continue; // Zeilen derselben Schlagzeile
      const dx = Math.max(a.r.left, b.r.left) - Math.min(a.r.right, b.r.right);
      const dy = Math.max(a.r.top, b.r.top) - Math.min(a.r.bottom, b.r.bottom);
      if (dx < abstand && dy < abstand) aus.push([a.n, b.n].sort().join("  |  "));
    }
    return aus;
  }, { t: f / opt.fps, minDeck: opt.deckkraft, abstand: opt.abstand });
  for (const k of treffer) { if (!paare.has(k)) paare.set(k, []); paare.get(k).push(f); }
}
await browser.close();
server.close();

const bereiche = (bs) => {
  const r = [];
  for (const b of bs) { const l = r[r.length - 1]; if (l && b - l[1] <= opt.schritt) l[1] = b; else r.push([b, b]); }
  return r.map(([a, b]) => `${a}–${b} (${(a / opt.fps).toFixed(2)}–${(b / opt.fps).toFixed(2)} s)`).join(", ");
};
console.log(`Text-Überlappung · ${path.basename(projektDir)} · Bilder ${f0}–${f1} (Schritt ${opt.schritt}) · Deckkraft > ${opt.deckkraft} · Abstand < ${opt.abstand} px`);
if (!paare.size) console.log("Keine Treffer.");
for (const [k, bs] of [...paare.entries()].sort((a, b) => a[1][0] - b[1][0])) console.log(`- ${k}: ${bs.length} Bilder · ${bereiche(bs)}`);
process.exit(paare.size ? 1 : 0);
