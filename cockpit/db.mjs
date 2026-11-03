#!/usr/bin/env node
// Zugriff auf die Cockpit-Datenbank für Claude (läuft nur, wenn Claude vom Cockpit gestartet wurde).
//   node cockpit/db.mjs get <sammlung> <id>
//   node cockpit/db.mjs liste <sammlung> [feld=wert …]
//   node cockpit/db.mjs update <sammlung> <id> --version N (--datei x.json | --json '{…}')
//   node cockpit/db.mjs set <sammlung> <id> [--version N] (--datei x.json | --json '{…}')
//   node cockpit/db.mjs meilenstein <sammlung> <id> "<kurzer Satz>"   (fortschritt + verlauf, ohne Version)
// Sammlungen: ideen, skripte, stand, laeufe. Ausgabe: JSON. Exit 0 ok · 1 Fehler · 3 Versionskonflikt (neu lesen, nur eigene Felder erneut schreiben).
import fs from "node:fs";

const URL_ = process.env.COCKPIT_URL || "http://127.0.0.1:4777";
const TOKEN = process.env.COCKPIT_DB_TOKEN || "";
const [befehl, sammlung, id, ...rest] = process.argv.slice(2);

function raus(code, daten) {
  process.stdout.write(JSON.stringify(daten, null, 1) + "\n");
  process.exit(code);
}

function option(name) {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
}

function datenLesen() {
  const datei = option("--datei");
  const json = option("--json");
  try {
    if (datei) return JSON.parse(fs.readFileSync(datei, "utf8").replace(/^﻿/, ""));
    if (json) return JSON.parse(json);
  } catch (e) {
    raus(1, { ok: false, fehler: `JSON ungültig: ${e.message}` });
  }
  raus(1, { ok: false, fehler: "--datei <pfad> oder --json '<objekt>' fehlt" });
}

async function anfrage(methode, pfad, koerper) {
  try {
    const r = await fetch(URL_ + pfad, {
      method: methode,
      headers: { "Content-Type": "application/json", "X-Cockpit-Token": TOKEN },
      body: koerper ? JSON.stringify(koerper) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    const daten = await r.json().catch(() => ({ ok: false, fehler: `HTTP ${r.status}` }));
    if (r.status === 409) raus(3, daten);
    if (!r.ok || daten.ok === false) raus(1, daten);
    return daten;
  } catch (e) {
    raus(1, { ok: false, fehler: `Cockpit nicht erreichbar (${e.message}). Läuft das Cockpit (Strg+Alt+T)?` });
  }
}

const pfad = (s, i) => `/api/db/${encodeURIComponent(s)}${i ? "/" + encodeURIComponent(i) : ""}`;

if (!befehl || !sammlung || befehl === "hilfe") {
  raus(1, { ok: false, fehler: "Aufruf: node cockpit/db.mjs get|liste|update|set|meilenstein <sammlung> <id> …" });
}
if (befehl === "get") raus(0, await anfrage("GET", pfad(sammlung, id)));
if (befehl === "liste") {
  const filter = [id, ...rest].filter((x) => x && x.includes("=")).map((x) => { const i = x.indexOf("="); return [x.slice(0, i), "==", x.slice(i + 1)]; });
  raus(0, await anfrage("GET", pfad(sammlung) + (filter.length ? `?filter=${encodeURIComponent(JSON.stringify(filter))}` : "")));
}
if (befehl === "update" || befehl === "set") {
  const version = option("--version");
  raus(0, await anfrage("POST", pfad(sammlung, id), { art: befehl, daten: datenLesen(), version: version === undefined ? undefined : Number(version) }));
}
if (befehl === "meilenstein") raus(0, await anfrage("POST", pfad(sammlung, id), { art: "meilenstein", text: rest.join(" ") }));
raus(1, { ok: false, fehler: `Unbekannter Befehl „${befehl}“` });
