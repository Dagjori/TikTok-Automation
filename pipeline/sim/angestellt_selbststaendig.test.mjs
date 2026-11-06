// Tests: node --test pipeline/sim/angestellt_selbststaendig.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { angestellt, selbststaendig, videoZahlen, soli } from "./angestellt_selbststaendig.mjs";
const v = videoZahlen(), r = Math.round;
test("Jonas: Abgaben 5.580 / 780 / 5.250 / 1.440 = 13.050 €", () => {
  assert.equal(r(v.J.rv), 5580); assert.equal(r(v.J.av), 780); assert.equal(r(v.J.kv), 5250); assert.equal(r(v.J.pv), 1440); assert.equal(r(v.J.abgaben), 13050);
});
test("Jonas: zvE 46.674, ESt 9.399, Soli 0, Netto 37.551", () => {
  assert.equal(v.J.zve, 46674); assert.equal(v.J.est, 9399); assert.equal(v.J.soli, 0); assert.equal(r(v.jNetto), 37551); assert.equal(r(v.jMonat), 3129);
});
test("Sara: KV 10.500, PV 2.520, RV 11.160 = 24.180 €", () => {
  assert.equal(r(v.S.kv), 10500); assert.equal(r(v.S.pv), 2520); assert.equal(r(v.S.rv), 11160); assert.equal(r(v.S.abgaben), 24180);
});
test("Sara: zvE 36.204, ESt 6.032, Soli 0, Netto 29.788", () => {
  assert.equal(v.S.zve, 36204); assert.equal(v.S.est, 6032); assert.equal(v.S.soli, 0); assert.equal(r(v.sNetto), 29788); assert.equal(r(v.sMonat), 2482);
});
test("Differenz 7.763 €/Jahr = 647 €/Monat, Jonas gewinnt", () => {
  assert.equal(r(v.diff), 7763); assert.equal(r(v.diffMonat), 647); assert.ok(v.jNetto > v.sNetto);
});
test("Runde Steuer: Sara vorn (−3.367 €), Abgaben: Sara +11.130 €", () => {
  assert.equal(v.steuerVorteilS, 3367); assert.ok(v.S.est < v.J.est); assert.equal(r(v.mehrAbgabenS), 11130);
});
test("Arbeitgeberanteile 12.690 € (21,15 %), Kosten 72.690 €", () => { assert.equal(r(v.J.agAnteile), 12690); assert.equal(r(v.J.agKosten), 72690); });
test("Gleichstand: Saras Gewinn 76.736 € (+27,9 %), danach gleiches Netto", () => {
  assert.equal(r(v.gleichGewinn), 76736); assert.equal(+(v.gleichPlus * 100).toFixed(1), 27.9);
  assert.ok(Math.abs(selbststaendig(v.gleichGewinn).netto - v.jNetto) < 0.05);
  assert.ok(v.gleichGewinn > 69750); // KV/PV gedeckelt: ohne Deckel läge der Wert höher
});
test("Kalender 2026: 261 Werktage, 9 Feiertage, davon 7 Mo–Fr", () => { assert.equal(v.K.werktage, 261); assert.equal(v.K.feiertage, 9); assert.equal(v.K.feiertageMoFr, 7); });
test("Stunden: Jonas 2.088 h = 28,74 €/h; Sara 209,4 Tage = 1.675,2 h = 45,81 €/h, Faktor 1,59", () => {
  assert.equal(v.jStunden, 2088); assert.equal(+v.jStundenlohn.toFixed(2), 28.74);
  assert.equal(+v.sTage.toFixed(1), 209.4); assert.equal(+v.sStunden.toFixed(1), 1675.2); assert.equal(+v.sStundensatz.toFixed(2), 45.81); assert.equal(+v.faktor.toFixed(2), 1.59);
});
test("Sprechzahlen passen: gut 9.000 / 6.000, rund 37,5 T / knapp 30 T, fast 8 T, ~650/Monat, ~12.700, gut 3.000, ~77 T, ~46 €, ~29 €", () => {
  assert.equal(r(v.J.est / 1000), 9); assert.equal(r(v.S.est / 1000), 6); assert.ok(v.jNetto > 37500 && v.jNetto < 37600); assert.ok(v.sNetto < 30000 && v.sNetto > 29500);
  assert.ok(v.diff < 8000 && v.diff > 7500); assert.ok(Math.abs(v.diffMonat - 650) < 5); assert.ok(Math.abs(v.J.agAnteile - 12700) < 20);
  assert.ok(v.steuerVorteilS > 3000 && v.steuerVorteilS < 3500); assert.ok(v.gleichGewinn < 77000 && v.gleichGewinn > 76500);
  assert.ok(v.sStundensatz < 46 && v.sStundensatz > 45.5); assert.ok(v.jStundenlohn < 29 && v.jStundenlohn > 28.5);
});
test("Tarif-Randfälle und Soli-Freigrenze", () => { assert.equal(soli(9399), 0); assert.equal(soli(20350), 0); assert.ok(soli(30000) > 0); assert.equal(angestellt(0).est, 0); assert.ok(selbststaendig(60000).netto < angestellt(60000).netto); });
