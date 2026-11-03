#!/usr/bin/env node
// Startet den Cockpit-Server (falls er nicht schon läuft) und öffnet das Cockpit als eigenes App-Fenster.
// Aufruf über die Desktop-Verknüpfung „TikTok Cockpit“ (Strg+Alt+T) oder: node cockpit/starten.mjs
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const DATEN = path.join(HIER, "daten");
const PORT = Number(process.env.COCKPIT_PORT || 4777);
const ADRESSE = `http://127.0.0.1:${PORT}`;
fs.mkdirSync(DATEN, { recursive: true });

async function laeuft() {
  try {
    const r = await fetch(`${ADRESSE}/api/ping`, { signal: AbortSignal.timeout(800) });
    return (await r.json()).cockpit === true;
  } catch {
    return false;
  }
}

if (!(await laeuft())) {
  const log = fs.openSync(path.join(DATEN, "server-start.log"), "a");
  const p = spawn(process.execPath, [path.join(HIER, "server.mjs")], { cwd: HIER, detached: true, stdio: ["ignore", log, log], windowsHide: true });
  p.unref();
  for (let i = 0; i < 40 && !(await laeuft()); i++) await new Promise((r) => setTimeout(r, 250));
}

// Edge im App-Modus mit eigenem Profil (eigenes Fenster, Sound ohne vorherigen Klick); sonst Standardbrowser
const edge = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => fs.existsSync(p));
if (edge) {
  spawn(edge, [`--app=${ADRESSE}`, "--window-size=1680,1000", `--user-data-dir=${path.join(DATEN, "edge-profil")}`, "--no-first-run", "--autoplay-policy=no-user-gesture-required"], { detached: true, stdio: "ignore" }).unref();
} else {
  spawn("cmd.exe", ["/c", "start", "", ADRESSE], { detached: true, stdio: "ignore", windowsHide: true }).unref();
}
