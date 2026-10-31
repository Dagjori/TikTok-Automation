// Rendert eine Vorschau-HTML als 1080x1920-PNG in Headless-Chromium.
// Aufruf (im Ordner pipeline/): node vorschau/render_standbild.js vorschau/gta6-standbild.html ausgabe.png
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as warten } from "node:timers/promises";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  // global installiertes Playwright (Cloud-Umgebung)
  const global = require("node:child_process").execSync("npm root -g").toString().trim();
  playwright = require(path.join(global, "playwright"));
}

const [, , seite = "vorschau/gta6-standbild.html", ausgabe = "vorschau.png"] = process.argv;
const PORT = 8765;
const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: process.cwd(), stdio: "ignore" });

try {
  await warten(800);
  const browser = await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on("pageerror", (fehler) => console.error("Seitenfehler:", fehler.message));
  await page.goto(`http://127.0.0.1:${PORT}/${seite}`);
  await page.waitForFunction(() => window.__fertig === true, null, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: ausgabe });
  await browser.close();
  console.log("gespeichert:", ausgabe);
} finally {
  server.kill();
}
