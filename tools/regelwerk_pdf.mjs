// Regelwerk als 1-Seiten-PDF (Entscheidung des Inhabers 01.11.: bei jeder Änderung an Regeln oder Wissen
// ein PDF mit „geändert“, „hinzugefügt“ und dem aktuellen Stand).
// Quelle: docs/regelwerk/regelwerk.html (vor dem Erzeugen von Hand aktualisieren).
// Aufruf: node tools/regelwerk_pdf.mjs [--out docs/regelwerk/regelwerk-JJJJ-MM-TT.pdf]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const i = process.argv.indexOf("--out");
const heute = new Date().toISOString().slice(0, 10);
const OUT = i > 0 ? path.resolve(process.argv[i + 1]) : path.join(ROOT, "docs", "regelwerk", `regelwerk-${heute}.pdf`);
const SRC = path.join(ROOT, "docs", "regelwerk", "regelwerk.html");

function loadPlaywright() {
  const req = createRequire(import.meta.url);
  for (const id of ["playwright", "playwright-core", path.join(ROOT, "pipeline", "node_modules", "playwright")]) {
    try { return req(id); } catch { /* nächster Versuch */ }
  }
  console.error("Playwright fehlt. Installieren: npm i -D playwright  und  npx playwright install chromium");
  process.exit(1);
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(SRC).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({ path: OUT, format: "A4", printBackground: true, preferCSSPageSize: true });
  const seiten = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`PDF geschrieben: ${path.relative(ROOT, OUT)} (${seiten} Seite${seiten === 1 ? "" : "n"})`);
  if (seiten !== 1) { console.error("Achtung: Das Regelwerk muss auf genau 1 Seite passen. Text kürzen."); process.exitCode = 2; }
} finally {
  await browser.close();
}
