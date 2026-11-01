// Tests für die Video-Rechnung „Mittagessen im Job“:  node --test pipeline/sim/mittagessen.test.mjs
// Erwartete Werte von Hand nachgerechnet (Kommentare). Grundlage: Netto-Modul 2026 (netto.mjs, eigene Tests).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ANNAHMEN, SACHBEZUG_MITTAG_2026, nettoStundenlohn, geldProTag, option, vergleich, kippKochminuten, verlauf, empfindlichkeit, videoZahlen } from "./mittagessen.mjs";

const nah = (a, b, eps = 0.005, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ""} erwartet ${b}, erhalten ${a}`);

test("Annahmen: 220 Arbeitstage, 3,50 € Kochen, 15 € Bestellen (12,50 + 2,50), Kantine = Sachbezugswert 2026 (4,57 €)", () => {
  assert.equal(ANNAHMEN.arbeitstage, 220);
  assert.equal(SACHBEZUG_MITTAG_2026, 4.57);
  assert.equal(geldProTag("kochen"), 3.5);
  assert.equal(geldProTag("bestellen"), 15);
  assert.equal(geldProTag("kantine"), 4.57);
  assert.throws(() => geldProTag("restaurant"));
});

test("Netto-Stundenlohn: 2.333,25 € netto × 12 / 52 / 40 = 13,46 €", () => {
  // 2.333,25 × 12 = 27.999 ; 27.999 / 2.080 Stunden = 13,461058
  nah(nettoStundenlohn(), 13.461058, 0.00001);
});

test("Geld pro Jahr: Kochen 770 €, Bestellen 3.300 €, Kantine 1.005,40 €", () => {
  nah(option("kochen").geld, 770); // 3,50 × 220
  nah(option("bestellen").geld, 3300); // 15 × 220
  nah(option("kantine").geld, 1005.4); // 4,57 × 220
});

test("Zeit pro Jahr: Kochen 55 Stunden, Bestellen 22 Stunden, Kantine 36,7 Stunden", () => {
  nah(option("kochen").stunden, 55, 1e-9); // 15 min × 220 = 3.300 min
  nah(option("bestellen").stunden, 22, 1e-9); // 6 min × 220 = 1.320 min
  nah(option("kantine").stunden, 36.666667, 1e-6); // 10 min × 220 = 2.200 min
});

test("Zeit in Euro: 55 h → 740,36 €, 22 h → 296,14 €, 36,67 h → 493,57 €", () => {
  nah(option("kochen").zeitwert, 740.36); // 55 × 13,461058
  nah(option("bestellen").zeitwert, 296.14); // 22 × 13,461058
  nah(option("kantine").zeitwert, 493.57); // 36,6667 × 13,461058
});

test("Gesamt: Kochen 1.510,36 €, Bestellen 3.596,14 €, Kantine 1.498,97 €", () => {
  const v = vergleich();
  nah(v.kochen.gesamt, 1510.36);
  nah(v.bestellen.gesamt, 3596.14);
  nah(v.kantine.gesamt, 1498.97);
});

test("Reihenfolge: nur Geld = Kochen, Kantine, Bestellen; mit Zeit = Kantine, Kochen, Bestellen", () => {
  const v = vergleich();
  assert.deepEqual(v.nurGeld, ["kochen", "kantine", "bestellen"]);
  assert.deepEqual(v.rang, ["kantine", "kochen", "bestellen"]);
});

test("Kochen gegen Bestellen: Geld +2.530 €, Zeit −444,21 €, Gesamt +2.085,79 €, Faktor 2,38", () => {
  const v = vergleich();
  nah(v.geldVorteilKochen, 2530); // 3.300 − 770
  nah(v.zeitNachteilKochen, 444.215, 0.001); // 33 Stunden × 13,461058
  nah(v.vorteilKochenGesamt, 2085.785, 0.001); // 3.596,143 − 1.510,358
  nah(v.geldVorteilKochen - v.zeitNachteilKochen, v.vorteilKochenGesamt, 0.005, "Geld minus Zeit = Gesamt");
  nah(v.faktorBestellenKochen, 2.381, 0.001);
});

test("Kantine liegt nur 11 € vor dem Kochen (Gleichstand innerhalb der Annahmen)", () => {
  const v = vergleich();
  nah(v.kantineVorKochen, 11.39);
  assert.ok(v.kantineVorKochen < 0.01 * v.kochen.gesamt, "weniger als 1 % Abstand");
});

test("Kipppunkt Kochzeit: Kantine gewinnt ab 14,8 Minuten, Bestellen erst ab 57,3 Minuten", () => {
  nah(kippKochminuten("kantine"), 14.77, 0.01); // (4,57 − 3,50) / 13,461058 · 60 + 10
  nah(kippKochminuten("bestellen"), 57.26, 0.01); // (15 − 3,50) / 13,461058 · 60 + 6
  // Gegenprobe: bei genau dieser Kochzeit sind beide gleich teuer
  const A = JSON.parse(JSON.stringify(ANNAHMEN));
  A.optionen.kochen.minuten = kippKochminuten("kantine");
  const v = vergleich(A);
  nah(v.kochen.gesamt, v.kantine.gesamt, 1e-6);
});

test("Verlauf: nach 30 Tagen Kochen 105 € / Bestellen 450 €, nach 220 Tagen die Jahreswerte, über das Jahr hinaus gedeckelt", () => {
  nah(verlauf("kochen", 30).geld, 105); // 3,50 × 30
  nah(verlauf("bestellen", 30).geld, 450); // 15 × 30
  nah(verlauf("kochen", 220).gesamt, option("kochen").gesamt, 1e-9);
  nah(verlauf("bestellen", 220).gesamt, option("bestellen").gesamt, 1e-9);
  nah(verlauf("kantine", 220).gesamt, option("kantine").gesamt, 1e-9);
  assert.equal(verlauf("kochen", 500).geld, 770);
  assert.equal(verlauf("kochen", -3).geld, 0);
  // halbes Jahr = halbe Kosten (linear)
  nah(verlauf("kochen", 110).gesamt * 2, option("kochen").gesamt, 1e-9);
});

test("Empfindlichkeit: Bestellen ist in allen Varianten am teuersten; Kochen gegen Kantine kippt je nach Annahme", () => {
  const l = empfindlichkeit();
  assert.ok(l.length >= 18);
  for (const x of l) assert.equal(x.rang[2], "bestellen", `Bestellen nicht Letzter bei: ${x.name}`);
  const erster = new Set(l.map((x) => x.rang[0]));
  assert.ok(erster.has("kochen") && erster.has("kantine"), "beides kommt vor: die Kantine-gegen-Kochen-Frage hängt an den Annahmen");
  // Weg 5 min: Kantine klar vorn; Weg 15 min: Kochen vorn
  assert.equal(l.find((x) => x.name === "Weg zur Kantine 5 min").rang[0], "kantine");
  assert.equal(l.find((x) => x.name === "Weg zur Kantine 15 min").rang[0], "kochen");
});

test("Video-Zahlen (gerundet wie im Bild)", () => {
  const z = videoZahlen();
  assert.equal(z.arbeitstage, 220);
  assert.equal(z.netto_stundenlohn, 13.46);
  assert.equal(z.netto_monat, 2333.25);
  assert.deepEqual([z.kochen.geld, z.bestellen.geld, z.kantine.geld], [770, 3300, 1005]);
  assert.deepEqual([z.kochen.stunden, z.bestellen.stunden, z.kantine.stunden], [55, 22, 37]);
  assert.deepEqual([z.kochen.zeitwert, z.bestellen.zeitwert, z.kantine.zeitwert], [740, 296, 494]);
  assert.deepEqual([z.kochen.gesamt, z.bestellen.gesamt, z.kantine.gesamt], [1510, 3596, 1499]);
  assert.equal(z.geld_vorteil_kochen, 2530);
  assert.equal(z.zeit_nachteil_kochen, 444);
  assert.equal(z.vorteil_kochen_gesamt, 2086);
  assert.equal(z.kantine_vor_kochen, 11);
  assert.equal(z.kipp_kochminuten_kantine, 14.77);
  assert.deepEqual(z.rang, ["kantine", "kochen", "bestellen"]);
});
