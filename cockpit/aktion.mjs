#!/usr/bin/env node
// Cockpit steuern aus dem Chat bzw. Sprachbot (nur in Chat-Aufträgen des Inhabers verfügbar).
//   node cockpit/aktion.mjs <aktion> [schluessel=wert …]
// Studio:  ideen konto=simulierbar|stelldirvor datum=JJJJ-MM-TT [wunsch="…"] · waehlen konto= datum= slot=mittag|abend nr=<1-10>
//          recherchieren konto= datum= · freigeben id= · zuruecknehmen id= · neu_schreiben id= kommentar="…" · verwerfen id=
//          uebergeben datum= · rueckfrage_annehmen id= · erneut id=
// Produktion: produktion_starten datum= · produktion_stopp   (eigene Spur neben dem Chat, cockpit/anleitung/produktion.md)
// Cockpit: ansicht ziel=live|studio|zahlen|lernen · dienst an|aus · lernschleife · vorschlag id= wahl=annehmen|ablehnen [kommentar="…"]
//          stand   (kurzer Überblick: Slots, Render, Zahlen, offene Vorschläge)
// Slot-IDs: <acc1|acc2>-<JJJJ-MM-TT>-<mittag|abend> (acc1 = simulierbar, acc2 = stelldirvor). Ausgabe JSON, Exit 0 ok · 1 Fehler.
const URL_ = process.env.COCKPIT_URL || "http://127.0.0.1:4777";
const TOKEN = process.env.COCKPIT_STEUER_TOKEN || "";
const [aktion, ...rest] = process.argv.slice(2);

function raus(code, daten) {
  process.stdout.write(JSON.stringify(daten, null, 1) + "\n");
  process.exit(code);
}
if (!aktion) raus(1, { ok: false, fehler: "Aufruf: node cockpit/aktion.mjs <aktion> [schluessel=wert …]" });
if (!TOKEN) raus(1, { ok: false, fehler: "Nur in Chat-Aufträgen aus dem Cockpit verfügbar" });

const daten = { aktion };
for (const teil of rest) {
  const i = teil.indexOf("=");
  if (i < 0) { daten.wert = teil; continue; }
  const k = teil.slice(0, i), v = teil.slice(i + 1);
  daten[k] = k === "nr" ? Number(v) : v;
}

try {
  const r = await fetch(`${URL_}/api/steuerung`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Cockpit-Token": TOKEN },
    body: JSON.stringify(daten),
    signal: AbortSignal.timeout(30000),
  });
  const antwort = await r.json().catch(() => ({ ok: false, fehler: `HTTP ${r.status}` }));
  raus(r.ok && antwort.ok !== false ? 0 : 1, antwort);
} catch (e) {
  raus(1, { ok: false, fehler: `Cockpit nicht erreichbar (${e.message})` });
}
