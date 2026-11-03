#!/usr/bin/env node
// Pipeline-Skripte mit Schlüssel starten, ohne dass Claude den Schlüssel sieht (läuft nur in Claude-Prozessen des Cockpits).
// Der Cockpit-Server startet das Skript mit den Werten aus der .env und reicht die Ausgabe maskiert durch.
//   node cockpit/werkzeuge/mit_schluessel.mjs stimme <args für pipeline/tts.py>
//   node cockpit/werkzeuge/mit_schluessel.mjs render <args für pipeline/render_dienst/auftrag.py>   (senden …, warten …, status, pc)
//   node cockpit/werkzeuge/mit_schluessel.mjs buffer <args für pipeline/post_buffer.py>             (--video … --kanal … , --nachpruefen)
// Pfade relativ zum Arbeits-Klon (C:\tiktok\tiktok-automation). Exit-Code = Exit-Code des Skripts (1 bei Verbindungsfehler).
// Lange Läufe (render warten) im Hintergrund starten; bricht der Aufruf ab, beendet der Server das Skript.
const URL_ = process.env.COCKPIT_URL || "http://127.0.0.1:4777";
const TOKEN = process.env.COCKPIT_DB_TOKEN || "";
const [werkzeug, ...args] = process.argv.slice(2);

if (!werkzeug || !["stimme", "render", "buffer"].includes(werkzeug)) {
  console.error("Aufruf: node cockpit/werkzeuge/mit_schluessel.mjs stimme|render|buffer [Argumente …]");
  process.exit(1);
}
if (!TOKEN) {
  console.error("Nur in Claude-Prozessen des Cockpits verfügbar (COCKPIT_DB_TOKEN fehlt).");
  process.exit(1);
}

let rest = "";
let code = 1;
try {
  const r = await fetch(`${URL_}/api/werkzeug`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Cockpit-Token": TOKEN },
    body: JSON.stringify({ werkzeug, args }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({ fehler: `HTTP ${r.status}` }));
    console.error(d.fehler || `HTTP ${r.status}`);
    process.exit(1);
  }
  const dec = new TextDecoder();
  for await (const teil of r.body) {
    rest += dec.decode(teil, { stream: true });
    const i = rest.lastIndexOf("\n");
    if (i >= 0) {
      const zeilen = rest.slice(0, i + 1);
      rest = rest.slice(i + 1);
      for (const z of zeilen.split("\n").slice(0, -1)) {
        const m = z.match(/^@@ENDE (\{.*\})$/);
        if (m) code = JSON.parse(m[1]).code;
        else process.stdout.write(z + "\n");
      }
    }
  }
  if (rest && !rest.startsWith("@@ENDE")) process.stdout.write(rest);
} catch (e) {
  console.error(`Cockpit nicht erreichbar oder Verbindung abgebrochen (${e.message}). Läuft das Cockpit (Strg+Alt+T)?`);
  process.exit(1);
}
process.exit(code);
