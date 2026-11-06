// Tests: node --test pipeline/sim/mieten_kaufen.test.mjs  (Werte aus dem Skript acc1-2026-11-06-abend, unabhängig in Python gerechnet)
import { test } from "node:test";
import assert from "node:assert/strict";
import { videoZahlen, basis } from "./mieten_kaufen.mjs";

const v = videoZahlen();
const nahe = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test("Kaufpreis 242.720 €, Nebenkosten 26.869,10 €, Kredit 219.589,10 €", () => {
  assert.equal(v.preis, 242720); nahe(v.nk, 26869.10, 0.01); nahe(v.kredit, 219589.10, 0.01);
});
test("Rate 1.064,88 €, Lisa Start 1.226,12 €, Miete 717,60 €, Sparrate 508,52 €", () => {
  nahe(v.rate, 1064.88, 0.01); nahe(v.lisaStart, 1226.12, 0.01); nahe(v.miete0, 717.60, 0.001); nahe(v.sparrate0, 508.52, 0.01);
});
test("Miete Jahr 20 = 1.045,41 €, Jahr 30 = 1.274,35 €; Lisa bleibt teurer (Jahr 30: 1.351,22 €)", () => {
  nahe(v.miete20, 1045.41, 0.01); nahe(v.miete30, 1274.35, 0.01); nahe(v.lisaKosten30, 1351.22, 0.01);
  assert.ok(basis().jahr.every((j) => j.sparrate > 0));
});
test("Zinsen über 30 Jahre 163.766 €", () => nahe(v.zinsen, 163766, 1));
test("Wohnung nach 30 Jahren 439.654 €", () => nahe(v.wert30, 439654, 1));
test("Toms Depot 512.969 € (eingezahlt 162.512 €), Steuer 64.703 €", () => {
  nahe(v.depT, 512969, 1); nahe(v.einT, 162512, 1); nahe(v.steuerT, 64703, 1);
});
test("Endstand: Tom 448.266 €, Lisa 439.654 €, Tom vorn mit 8.612 €", () => {
  nahe(v.tom, 448266, 1); nahe(v.lisa, 439654, 1); nahe(v.vorsprung, 8612, 1);
  assert.ok(v.vorsprung > 0);
});
test("Variante ohne Anlage der Differenz: Tom 185.431 €, Lisa vorn mit 254.222 €", () => {
  nahe(v.tomOhne, 185431, 1); nahe(v.vorsprungOhne, 254222, 1);
});
test("Empfindlichkeit: Zins 3 % Lisa +93.097, Rendite 3 % Lisa +148.074, Wert 1 % Tom +121.116, Wert 3 % Lisa +140.879", () => {
  nahe(v.zinsen3Lisa, 93097, 1); nahe(v.rendite3Lisa, 148074, 1); nahe(v.wert1Tom, 121116, 1); nahe(v.wert3Lisa, 140879, 1);
});
test("Sprechzahlen passen: 27.000, 240.000, 440.000, 513.000, 448.000, 65.000, 185.000", () => {
  assert.equal(Math.round(v.nk / 1000), 27); assert.equal(Math.round(v.wert30 / 1000), 440); assert.equal(Math.round(v.depT / 1000), 513);
  assert.equal(Math.round(v.tom / 1000), 448); assert.equal(Math.round(v.steuerT / 1000), 65); assert.equal(Math.round(v.tomOhne / 1000), 185);
});
test("Monatsreihe: Tag eins Lisa 23.131 € / Tom 50.000 €, Monat 360 = Jahr 30, Wert wächst nur 2 %/Jahr", () => {
  const b = basis();
  nahe(b.monat[0].lisa, 23130.90, 0.01); assert.equal(b.monat[0].tom, 50000);
  assert.equal(b.monat.length, 361); nahe(b.monat[360].lisa, 439654, 1); nahe(b.monat[360].tom, 512969, 1); nahe(b.monat[12].tom, b.jahr[0].tom, 0.001);
});
