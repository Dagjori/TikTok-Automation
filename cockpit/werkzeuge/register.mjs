#!/usr/bin/env node
// Video-Register jetzt neu bauen und die erzeugte Hirn-Notiz hirn/01-Projekt/Video-Register.md schreiben lassen
// (läuft nur in Claude-Prozessen des Cockpits). Gedacht für den Commit-Schritt einer Sitzung: erst dieses Werkzeug, dann die
// Notiz mit in den Commit nehmen (cockpit/anleitung/produktion.md §0.2). Die Notiz nie von Hand ändern.
//   node cockpit/werkzeuge/register.mjs
// Exit 0 = Register steht (Notiz geschrieben oder unverändert), 1 = Cockpit nicht erreichbar oder Fehler.
const URL_ = process.env.COCKPIT_URL || "http://127.0.0.1:4777";
const TOKEN = process.env.COCKPIT_DB_TOKEN || "";
if (!TOKEN) {
  console.error("Nur in Claude-Prozessen des Cockpits verfügbar (COCKPIT_DB_TOKEN fehlt).");
  process.exit(1);
}
try {
  const r = await fetch(`${URL_}/api/register`, { method: "POST", headers: { "Content-Type": "application/json", "X-Cockpit-Token": TOKEN }, body: "{}" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) {
    console.error(`Video-Register: ${d.fehler || `HTTP ${r.status}`}`);
    process.exit(1);
  }
  console.log(`Video-Register: ${d.videos} Videos · Notiz ${d.notiz?.geschrieben ? "neu geschrieben" : `unverändert (${d.notiz?.grund || "gleicher Inhalt"})`} · ${d.datei}`);
} catch (e) {
  console.error(`Video-Register: Cockpit nicht erreichbar (${e.message})`);
  process.exit(1);
}
