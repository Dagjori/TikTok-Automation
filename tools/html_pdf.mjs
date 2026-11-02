// HTML-Datei als A4-PDF (mehrseitig erlaubt). Aufruf: node tools/html_pdf.mjs <quelle.html> <ziel.pdf>
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error("Aufruf: node tools/html_pdf.mjs <quelle.html> <ziel.pdf>"); process.exit(1); }

function loadPlaywright() {
  const req = createRequire(import.meta.url);
  for (const id of ["playwright", "playwright-core", path.join(ROOT, "pipeline", "node_modules", "playwright")]) {
    try { return req(id); } catch { /* nächster Versuch */ }
  }
  console.error("Playwright fehlt."); process.exit(1);
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.resolve(src)).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({ path: path.resolve(out), format: "A4", printBackground: true, preferCSSPageSize: true });
  const seiten = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`PDF geschrieben: ${out} (${seiten} Seiten)`);
} finally {
  await browser.close();
}
