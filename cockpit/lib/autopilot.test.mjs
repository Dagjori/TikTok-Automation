// Tests für cockpit/lib/autopilot.mjs (automatische Wahl, Prüfung vor der automatischen Freigabe) und die Schalter in
// lib/automatik.mjs. Aufruf: node --test cockpit/lib/autopilot.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { punkteVon, autoWahl, selbstpruefungOffen, freigabePruefen } from "./autopilot.mjs";
import { automatikLesen, automatikPruefen, AUTOMATIK_STANDARD } from "./automatik.mjs";

const idee = (nr, punkte, feld, extra = {}) => ({ nr, titel: `Idee ${nr}`, punkte, feld, ...extra });

test("punkteVon: Zahl, Text „17/21“, Objekt, unlesbar", () => {
  assert.equal(punkteVon({ punkte: 17 }), 17);
  assert.equal(punkteVon({ punkte: "17/21" }), 17);
  assert.equal(punkteVon({ punkte: "16,5 von 21" }), 16.5);
  assert.equal(punkteVon({ punkte: { summe: 15, nachfrage: 3 } }), 15);
  assert.equal(punkteVon({ punkte: "viele" }), null);
  assert.equal(punkteVon({}), null);
});

test("autoWahl: höchste Punkte zuerst, bei Gleichstand die Reihenfolge der Liste", () => {
  const ideen = [idee(1, 14, "Rente"), idee(2, 19, "Steuern"), idee(3, 19, "Wohnen"), idee(4, 12, "Auto")];
  const wahl = autoWahl(ideen, ["mittag", "abend"], []);
  assert.deepEqual(wahl.map((w) => [w.slot, w.nr]), [["mittag", 2], ["abend", 3]]);
  assert.match(wahl[0].grund, /höchste Punktzahl \(19\)/);
});

test("autoWahl: Folgeteile eigener Treffer haben Vorrang vor Punkten", () => {
  const ideen = [idee(1, 21, "Rente"), idee(11, null, "", { typ: "folgeteil", teil: 2, titel: "Teil 2: Mieten oder kaufen" }), idee(2, 20, "Steuern")];
  const wahl = autoWahl(ideen, ["mittag", "abend"], []);
  assert.deepEqual(wahl.map((w) => w.nr), [11, 1]);
  assert.match(wahl[0].grund, /Folgeteil.*Teil 2/);
});

test("autoWahl: nie zwei Ideen mit demselben Themenfeld am selben Tag (auch gegen schon gewählte Slots)", () => {
  const ideen = [idee(1, 20, "Rente"), idee(2, 19, "rente "), idee(3, 18, "Steuern"), idee(4, 17, "Wohnen")];
  assert.deepEqual(autoWahl(ideen, ["mittag", "abend"], []).map((w) => w.nr), [1, 3]); // Idee 2 hat dasselbe Feld wie Idee 1
  // Mittag hat der Inhaber schon gewählt (Feld Steuern): für den Abend fällt Idee 3 weg, Idee 1 bleibt
  assert.deepEqual(autoWahl(ideen, ["abend"], [{ titel: "Etwas anderes", feld: "Steuern" }]).map((w) => [w.slot, w.nr]), [["abend", 1]]);
  // Die schon gewählte Idee selbst wird nicht noch einmal genommen
  assert.deepEqual(autoWahl(ideen, ["abend"], [ideen[0]]).map((w) => w.nr), [3]);
});

test("autoWahl: ohne Punkte gilt die Reihenfolge; ohne Feld keine Sperre; nichts Passendes → leer", () => {
  const ohne = [{ nr: 1, titel: "A" }, { nr: 2, titel: "B" }, { nr: 3, titel: "C" }];
  const wahl = autoWahl(ohne, ["mittag", "abend"], []);
  assert.deepEqual(wahl.map((w) => w.nr), [1, 2]);
  assert.match(wahl[0].grund, /Platz 1 der Liste/);
  assert.deepEqual(autoWahl([idee(1, 20, "Rente"), idee(2, 19, "Rente")], ["mittag", "abend"], []).map((w) => w.nr), [1]); // zweiter Slot bleibt frei
  assert.deepEqual(autoWahl([], ["mittag"], []), []);
  assert.deepEqual(autoWahl([idee(1, 20, "Rente")], [], []), []);
  assert.deepEqual(autoWahl([{ titel: "ohne Nummer" }], ["mittag"], []), []);
});

test("selbstpruefungOffen: echte Formulierungen bestehen, durchgefallene Punkte fallen auf", () => {
  assert.deepEqual(selbstpruefungOffen(["Wortzahl 173 (ohne Tags), Ziel 150–190; Vorprüfung stimme_vorab.py: BEREIT", "Satzzahl 15 (12–18): ok", "Fakten: alle Euro-Zahlen mit Python nachgerechnet"]), []);
  assert.deepEqual(selbstpruefungOffen(["Annahmen gekennzeichnet; nichts als Fakt behauptet, was nicht belegt ist"]), []); // doppelte Verneinung = bestanden
  assert.equal(selbstpruefungOffen(["Strompreis 2026: nicht belegt"]).length, 1);
  assert.equal(selbstpruefungOffen(["Satzzahl 22 (12–18): nicht erfüllt"]).length, 1);
  assert.equal(selbstpruefungOffen(["Vorprüfung stimme_vorab.py: NICHT BEREIT"]).length, 1);
  assert.equal(selbstpruefungOffen(["Quelle für den Strompreis: offen"]).length, 1);
  assert.equal(selbstpruefungOffen([{ punkt: "Quellen", ok: false }, { punkt: "Länge", ok: true }]).length, 1);
  assert.deepEqual(selbstpruefungOffen([]), ["Selbstprüfung fehlt"]);
  assert.deepEqual(selbstpruefungOffen(undefined), ["Selbstprüfung fehlt"]);
});

const gut = () => ({
  konto: "simulierbar", status: "skript_fertig", skript: { segmente: [{ id: "hook", sprechtext: "Was wäre, wenn?" }] },
  selbstpruefung: ["Wortzahl 170: ok"], zahlen: { Kindergeld: "259 €" }, quellen: ["Familienkasse 2026 – https://example.org"], faktencheck: "recherchiert",
  idee: { originalitaet: "Suche: „Kindergeld Kanada“ · Ergebnis: kein deutsches Video gefunden" },
});

test("freigabePruefen: alles in Ordnung → frei (Simulierbar braucht die bestandene Text-Vorprüfung)", () => {
  assert.deepEqual(freigabePruefen(gut(), { ok: true, text: "BEREIT" }), { ok: true, gruende: [] });
  const ohneVorab = freigabePruefen(gut(), null);
  assert.equal(ohneVorab.ok, false);
  assert.match(ohneVorab.gruende[0], /Text-Vorprüfung der Stimme lief nicht/);
  const durchgefallen = freigabePruefen(gut(), { ok: false, text: "Ta Ziffern im Segment regeln" });
  assert.match(durchgefallen.gruende[0], /Text-Vorprüfung der Stimme: Ta Ziffern/);
  // Account 2 hat keine Stimme: keine Vorprüfung nötig
  assert.equal(freigabePruefen({ ...gut(), konto: "stelldirvor" }, null).ok, true);
});

test("freigabePruefen: jeder einzelne Mangel hält die Freigabe an", () => {
  const vorab = { ok: true };
  const mit = (aenderung) => freigabePruefen({ ...gut(), ...aenderung }, vorab);
  assert.match(mit({ selbstpruefung: ["Länge: verfehlt"] }).gruende.join(), /Selbstprüfung/);
  assert.match(mit({ quellen: [] }).gruende.join(), /Zahlen ohne Quellen/);
  assert.match(mit({ zahlen: {}, quellen: [] }).gruende.join(), /keine Quellen/);
  assert.match(mit({ faktencheck: "offen" }).gruende.join(), /Faktencheck: offen/);
  assert.equal(mit({ faktencheck: "recherchiert und korrigiert" }).ok, true);
  assert.match(mit({ originalitaet: "ungeprüft" }).gruende.join(), /Originalität ungeprüft/);
  assert.match(mit({ idee: { originalitaet: "Ungeprueft (keine Suche möglich)" } }).gruende.join(), /Originalität ungeprüft/);
  assert.match(mit({ idee: {} }).gruende.join(), /Originalität nicht dokumentiert/);
  assert.equal(mit({ idee: { typ: "folgeteil", teil: 2 } }).ok, true); // Folgeteil eines eigenen Treffers: eigenes Teil 1 zählt nicht
  assert.match(mit({ skript: null }).gruende.join(), /kein Skript/);
  assert.match(mit({ kommentar: "kürzer", kommentar_zeit: "2026-11-10T12:00:00Z", aktualisiert: "2026-11-10T11:00:00Z" }).gruende.join(), /Kommentar ist noch offen/);
  assert.equal(mit({ kommentar: "kürzer", kommentar_zeit: "2026-11-10T10:00:00Z", aktualisiert: "2026-11-10T11:00:00Z" }).ok, true); // Neufassung ist danach entstanden
});

test("Schalter: Autopilot steht im Standard auf AUS, Fristen 120 und 180 Min., Prüfung der Eingaben", () => {
  assert.equal(AUTOMATIK_STANDARD.auto_wahl, false);
  assert.equal(AUTOMATIK_STANDARD.auto_freigabe, false);
  const a = automatikLesen({});
  assert.deepEqual([a.auto_wahl, a.auto_wahl_frist_min, a.auto_freigabe, a.auto_freigabe_frist_min], [false, 120, false, 180]);
  // Vorhandene Einstellung ohne die neuen Felder (Stand vor dem Ausbau) behält alles und bekommt die Standardwerte dazu
  assert.deepEqual(automatikLesen({ automatik: { recherche: false, ideen_uhrzeit: "06:30" } }), { ...AUTOMATIK_STANDARD, recherche: false, ideen_uhrzeit: "06:30" });
  const neu = automatikPruefen({ auto_wahl: true, auto_wahl_frist_min: 90 }, { produktion: false });
  assert.deepEqual([neu.auto_wahl, neu.auto_wahl_frist_min, neu.produktion, neu.auto_freigabe], [true, 90, false, false]);
  assert.throws(() => automatikPruefen({ auto_wahl_frist_min: 0 }), /1 bis 2880/);
  assert.throws(() => automatikPruefen({ auto_freigabe_frist_min: "180" }), /1 bis 2880/);
  assert.throws(() => automatikPruefen({ auto_freigabe: "ja" }), /true oder false/);
  assert.throws(() => automatikPruefen({ auto_rueckfrage: true }), /gibt es nicht/);
});
