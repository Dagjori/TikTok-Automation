// Text-Überlappung für das Referenzformat (Titel, Messwert-Anzeige, kursiver Satz, Abspann): prüft alle Zeitpunkte (Standard alle 0,1 s)
// auf Rechtecke, die sich berühren oder näher als --abstand px kommen (Deckkraft > 0,3 über alle Eltern). Außerdem: liegt jede Ebene in der sicheren Zone
// (x 150–930, y 150–1500)? Aufruf: node qc/text_ueberlappung_pov.mjs projekte/stickstoff-weg [--abstand 12] [--schritt 0.1]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv.slice(2);
const opt = { abstand: 12, schritt: 0.1, deckkraft: 0.3 };
let projekt = null;
for (let i = 0; i < arg.length; i++) { if (arg[i].startsWith("--")) opt[arg[i].slice(2)] = +arg[++i]; else projekt = arg[i]; }
if (!projekt) { console.error("Aufruf: node qc/text_ueberlappung_pov.mjs projekte/<name>"); process.exit(2); }
const rel = path.relative(WURZEL, path.resolve(process.cwd(), projekt)).split(path.sep).join("/");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const d = path.normalize(path.join(WURZEL, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!d.startsWith(WURZEL) || !fs.existsSync(d) || fs.statSync(d).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(d)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(d).pipe(res);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const { chromium } = require("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--font-render-hinting=none"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on("pageerror", (f) => console.error("Seitenfehler:", f.message));
await page.goto(`http://127.0.0.1:${server.address().port}/${rel}/szene.html?msaa=0&schatten=0&skala=0.25`);
await page.waitForFunction(() => window.__fertig === true || window.__fehler, null, { timeout: 600000 });
const fehler = await page.evaluate(() => window.__fehler); if (fehler) { console.error(fehler); process.exit(2); }
const dauer = await page.evaluate(() => window.dauer);
const paare = new Map(), aussen = new Map();
const sicher = { l: 150 - 2, r: 930 + 2, o: 150, u: 1500 };
for (let t = 0; t <= dauer - 0.01; t += opt.schritt) {
  const r = await page.evaluate(({ t, minD }) => {
    window.hudAt(t);
    const deck = (e) => { let o = 1; for (let n = e; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === "none" || cs.visibility === "hidden") return 0; o *= +cs.opacity; } return o; };
    const sel = [["titel", "#titel"], ["anzeige-etikett", "#anzeige .etikett"], ["anzeige-zahl", "#anzeige .zahl"], ["anzeige-unter", "#anzeige .unter"], ["satz", "#satz"], ["abspann-frage", "#abspann .frage"], ["abspann-fakt", "#abspann .fakt"]];
    const liste = [];
    for (const [n, s] of sel) { const e = document.querySelector(s); if (!e || !e.textContent.trim() || deck(e) <= minD) continue;
      // Textbreite statt Boxbreite: Range über den Inhalt
      const rg = document.createRange(); rg.selectNodeContents(e); const b = rg.getBoundingClientRect(); liste.push({ n, l: b.left, r: b.right, o: b.top, u: b.bottom }); }
    return liste;
  }, { t, minD: opt.deckkraft });
  for (let i = 0; i < r.length; i++) {
    const a = r[i];
    if (a.n.startsWith("abspann") === false && (a.l < sicher.l || a.r > sicher.r || a.o < sicher.o || a.u > sicher.u)) aussen.set(a.n, [...(aussen.get(a.n) || []), +t.toFixed(2)]);
    for (let j = i + 1; j < r.length; j++) {
      const b = r[j], d = opt.abstand;
      if (a.n.startsWith("anzeige") && b.n.startsWith("anzeige")) continue; // Zeilen derselben Anzeige liegen absichtlich dicht übereinander
      if (a.n.startsWith("abspann") && b.n.startsWith("abspann") && Math.abs(a.o - b.o) > 100) { /* Frage und Faktenzeile prüfen wir normal */ }
      if (a.l < b.r + d && b.l < a.r + d && a.o < b.u + d && b.o < a.u + d) { const k = `${a.n} | ${b.n}`; paare.set(k, [...(paare.get(k) || []), +t.toFixed(2)]); }
    }
  }
}
await browser.close(); server.close();
console.log(`Text-Überlappung (Referenzformat) · ${rel} · 0–${dauer} s, Schritt ${opt.schritt} s, Abstand ${opt.abstand} px`);
if (!paare.size) console.log("Überlappende Paare: 0"); else for (const [k, v] of paare) console.log(`- ${k}: ${v.length} Zeitpunkte (${v[0]}–${v[v.length - 1]} s)`);
if (!aussen.size) console.log("Außerhalb der sicheren Zone: nichts"); else for (const [k, v] of aussen) console.log(`- ${k} außerhalb der sicheren Zone: ${v.length} Zeitpunkte (${v[0]}–${v[v.length - 1]} s)`);
process.exit(paare.size || aussen.size ? 1 : 0);
