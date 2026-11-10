#!/usr/bin/env node
// Zeile an data/produktion/protokoll.csv anhängen bzw. den Status einer Zeile setzen, korrekt in Anführungszeichen
// (Titel mit Komma haben die Datei früher verschoben). Vorhandene Zeilen werden nie neu geschrieben.
//   node cockpit/werkzeuge/protokoll.mjs anhaengen datum=2026-11-11 slot=mittag konto=simulierbar titel="Kaffee, Tee oder Wasser?" projekt=kaffee-tee post_id=6af… status=geplant
//   node cockpit/werkzeuge/protokoll.mjs status post_id=6af… status=gepostet
// Optional datei=<pfad> (nur für Tests). Exit 0 = erledigt (auch „stand schon drin“), 1 = Fehler.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { anhaengen, statusSetzen } from "../lib/protokoll.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const [befehl, ...rest] = process.argv.slice(2);
const a = Object.fromEntries(rest.map((t) => { const i = t.indexOf("="); return i < 0 ? [t, ""] : [t.slice(0, i), t.slice(i + 1)]; }));
const datei = a.datei || path.join(REPO, "data", "produktion", "protokoll.csv");

try {
  if (befehl === "anhaengen") {
    const r = anhaengen(datei, { datum: a.datum, slot: a.slot, konto: a.konto, titel: a.titel, projekt: a.projekt, post_id: a.post_id, status: a.status || "geplant" });
    console.log(r.angehaengt ? `Protokoll: Zeile angehängt (${a.post_id})` : `Protokoll: nichts geändert (${r.grund})`);
  } else if (befehl === "status") {
    const r = statusSetzen(datei, a.post_id, a.status);
    console.log(r.geaendert ? `Protokoll: ${a.post_id} → ${a.status}` : `Protokoll: nichts geändert (${r.grund})`);
    if (!r.geaendert) process.exit(1);
  } else {
    console.error("Aufruf: node cockpit/werkzeuge/protokoll.mjs anhaengen datum=… slot=… konto=… titel=\"…\" projekt=… post_id=… [status=geplant]\n        node cockpit/werkzeuge/protokoll.mjs status post_id=… status=gepostet");
    process.exit(1);
  }
} catch (e) {
  console.error("Protokoll: " + e.message);
  process.exit(1);
}
