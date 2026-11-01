// Tests für die Video-Rechnung „Steuererklärung oder Überstunden“:  node --test pipeline/sim/steuer_ueberstunden.test.mjs
// Grundlage: Netto-Modul 2026 (netto.mjs, eigene 11 Tests) und die Regeln 2026 (Pauschbetrag 1.230 €, 0,38 € je km ab dem
// ersten Kilometer, Homeoffice 6 €/Tag bis 1.260 €). Erwartete Werte von Hand nachgerechnet (Kommentare).
import { test } from "node:test";
import assert from "node:assert/strict";
import { tarif } from "./netto.mjs";
import { REGELN, ANNAHMEN, stundenlohn, ueberstunden, werbungskosten, erstattung, steuererklaerung, kipppunkte, videoZahlen } from "./steuer_ueberstunden.mjs";

const nah = (a, b, eps = 0.005, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ""} erwartet ${b}, erhalten ${a}`);

test("Regeln 2026: Pauschbetrag, Kilometersatz ab dem ersten km, Homeoffice-Deckel", () => {
  assert.equal(REGELN.pauschbetrag, 1230);
  assert.equal(REGELN.kmSatz, 0.38);
  // ab dem ersten Kilometer: 1 km an 230 Tagen = 87,40 € (keine Staffel mehr)
  nah(werbungskosten({ km: 1, buerotage: 230 }).summe, 87.4);
  // Homeoffice: 6 €/Tag, höchstens 1.260 € (= 210 Tage)
  assert.equal(werbungskosten({ homeofficeTage: 92 }).summe, 552);
  assert.equal(werbungskosten({ homeofficeTage: 230 }).summe, 1260);
});

test("Stundenlohn: 3.500 € bei 40 Stunden und 52/12 Wochen je Monat = 20,19 €", () => {
  nah(stundenlohn(), 20.1923, 0.0001);
});

test("Überstunden: 4 Stunden = 80,77 € brutto, davon kommen 44,45 € netto an (45 % Abzüge)", () => {
  const u = ueberstunden();
  nah(u.brutto, 80.77);
  nah(u.netto, 44.45);
  nah(u.lohnsteuer, 18.75);
  nah(u.sozial, 17.57); // 21,75 % von 80,77 € (RV 9,3 + KV 8,75 + PV 2,4 + AV 1,3)
  nah(u.proStunde, 11.11, 0.01);
  assert.ok(u.abzugQuote > 0.44 && u.abzugQuote < 0.46, "fast die Hälfte");
  // Mit 25 % Zuschlag (heute voll steuerpflichtig) und hypothetisch lohnsteuerfrei (Plan, nicht in Kraft): Sieger bleibt gleich
  const z = ueberstunden({ zuschlag: 0.25 });
  const plan = ueberstunden({ zuschlag: 0.25, zuschlagSteuerfrei: true });
  assert.ok(plan.netto > z.netto && z.netto > u.netto);
  assert.ok(plan.proStunde < steuererklaerung(ANNAHMEN.fallA).proStunde);
});

test("Erstattung: unter dem Pauschbetrag 0 €, darüber Einkommensteuer-Differenz nach Grundtabelle 2026", () => {
  assert.equal(erstattung(0).betrag, 0);
  assert.equal(erstattung(1230).betrag, 0);
  const e = erstattung(1999);
  assert.equal(e.extra, 769);
  assert.equal(e.betrag, tarif(e.zve) - tarif(e.zve - 769));
  // zvE 32.271 € (PAP, 3.500 € × 12): Grenzsteuersatz knapp 29 %
  assert.equal(e.zve, 32271);
  assert.ok(e.grenzsatz > 0.28 && e.grenzsatz < 0.3, `Grenzsatz ${e.grenzsatz}`);
});

test("Fall A (25 km, 3 Bürotage, 2 Homeoffice-Tage): 1.999 € Werbungskosten → 222 € zurück, 55,50 €/h", () => {
  const a = steuererklaerung(ANNAHMEN.fallA);
  assert.deepEqual(a.posten.map((p) => p.label), ["KONTOFÜHRUNG", "ARBEITSMITTEL", "HOMEOFFICE", "PENDELWEG"]);
  nah(a.posten.find((p) => p.id === "weg").betrag, 1311); // 25 × 0,38 × 138
  assert.equal(a.wk, 1999);
  // Bis zum Pendelweg bleibt die Erstattung bei 0 (688 € < 1.230 €)
  assert.deepEqual(a.posten.map((p) => p.erstattung), [0, 0, 0, 222]);
  assert.equal(a.erstattung, 222);
  nah(a.proStunde, 55.5);
  // Fünfmal so viel pro Stunde wie die Überstunden
  nah(a.proStunde / ueberstunden().proStunde, 5, 0.05);
});

test("Fall B (5 km, keine Extras): 453 € Werbungskosten → 0 €, die Überstunden gewinnen", () => {
  const b = steuererklaerung(ANNAHMEN.fallB);
  nah(b.wk, 453);
  assert.equal(b.erstattung, 0);
  assert.ok(ueberstunden().netto > b.erstattung);
});

test("Kipppunkte: erster Euro ab 14 km, Sieg über die Überstunden ab 16 km (230 Bürotage, ohne Extras)", () => {
  const k = kipppunkte();
  assert.equal(k.ersterEuro, 14);
  assert.equal(k.schlaegt, 16);
  const v = videoZahlen();
  assert.equal(v.kipp.schlaegt, 16);
  nah(v.faktorA, 5, 0.05);
});
