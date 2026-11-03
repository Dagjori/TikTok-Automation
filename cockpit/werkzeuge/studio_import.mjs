#!/usr/bin/env node
// Übernimmt Dokumente aus dem bisherigen Ideen-Studio in die Cockpit-Datenbank.
// Eingabe: Ordner mit Unterordnern ideen/, skripte/, stand/, laeufe/ (eine JSON-Datei je Dokument,
// so wie ArtifactData mit out_dir sie ablegt). Vorhandene Dokumente bleiben, außer mit --erzwingen.
//   node cockpit/werkzeuge/studio_import.mjs <ordner> [--ab JJJJ-MM-TT] [--erzwingen]
// --ab setzt den Tag, ab dem das Cockpit das Studio ersetzt (frühere Tage sind im Cockpit nur lesbar).
// Danach das Cockpit neu starten (♻), damit der Server die Dokumente lädt.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const DATEN = process.env.COCKPIT_DATEN || path.join(HIER, "..", "daten");
const args = process.argv.slice(2);
const quelle = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--ab");
const ab = args.includes("--ab") ? args[args.indexOf("--ab") + 1] : null;
const erzwingen = args.includes("--erzwingen");

if (!quelle || !fs.existsSync(quelle)) {
  console.error("Aufruf: node cockpit/werkzeuge/studio_import.mjs <ordner> [--ab JJJJ-MM-TT] [--erzwingen]");
  process.exit(1);
}
if (ab && !/^\d{4}-\d{2}-\d{2}$/.test(ab)) {
  console.error(`--ab muss JJJJ-MM-TT sein, nicht „${ab}“`);
  process.exit(1);
}

let neu = 0, vorhanden = 0;
for (const s of ["ideen", "skripte", "stand", "laeufe"]) {
  const ordner = path.join(quelle, s);
  if (!fs.existsSync(ordner)) continue;
  fs.mkdirSync(path.join(DATEN, "db", s), { recursive: true });
  for (const f of fs.readdirSync(ordner).filter((x) => x.endsWith(".json"))) {
    const ziel = path.join(DATEN, "db", s, f);
    if (fs.existsSync(ziel) && !erzwingen) { vorhanden++; continue; }
    const daten = JSON.parse(fs.readFileSync(path.join(ordner, f), "utf8").replace(/^﻿/, ""));
    const alt = fs.existsSync(ziel) ? JSON.parse(fs.readFileSync(ziel, "utf8")) : null;
    const doc = { daten, version: (alt?.version || 0) + 1, aktualisiert: new Date().toISOString(), von: "studio-import" };
    fs.writeFileSync(ziel, JSON.stringify(doc, null, 1));
    neu++;
    console.log(`übernommen: ${s}/${f.slice(0, -5)}`);
  }
}

if (ab) {
  const datei = path.join(DATEN, "einstellungen.json");
  const einst = fs.existsSync(datei) ? JSON.parse(fs.readFileSync(datei, "utf8")) : {};
  einst.studio_ab = ab;
  fs.writeFileSync(datei, JSON.stringify(einst, null, 1));
  console.log(`Cockpit übernimmt das Studio ab ${ab}`);
}
console.log(`${neu} übernommen, ${vorhanden} schon vorhanden (unverändert). Jetzt im Cockpit ♻ klicken.`);
