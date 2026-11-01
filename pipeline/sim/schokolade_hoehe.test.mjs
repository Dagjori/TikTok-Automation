import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "./schokolade_hoehe.mjs";

const nah = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b} (±${eps})`);
const marke = (id) => S.MARKEN.find((m) => m.id === id);

test("Energie: 540 kcal × 4,184 = 2,26 MJ", () => {
  nah(S.energieJ(), 2259360, 1e-6);
  nah(S.energieJ() / 1e6, 2.26, 0.005);
});
test("Einen Meter heben kostet 736 J (75 kg · 9,81 m/s²)", () => {
  nah(S.jouleProMeter(), 735.75, 1e-9);
  assert.equal(Math.round(S.jouleProMeter()), 736);
});
test("Höhe ohne Verlust: 3.071 m, also 109 m über der Zugspitze", () => {
  nah(S.hoehe(), 3070.8, 0.1);
  assert.equal(Math.round(S.hoehe()), 3071);
  assert.equal(Math.round(S.ueberMarke(marke("zugspitze"))), 109);
});
test("Ein Stückchen = 1/24 der Höhe ≈ 128 m", () => {
  nah(S.hoeheProStueck(), 127.95, 0.01);
  nah(S.energieProStueckJ(), 94140, 1e-6);
});
test("Marken: Dom beim 2., Fernsehturm beim 3., Brocken beim 9., Feldberg beim 12., Zugspitze beim 24. Stückchen", () => {
  assert.equal(S.markeUeberholt(marke("dom")).laufendesStueck, 2);
  assert.equal(S.markeUeberholt(marke("turm")).laufendesStueck, 3);
  assert.equal(S.markeUeberholt(marke("brocken")).laufendesStueck, 9);
  assert.equal(S.markeUeberholt(marke("feldberg")).laufendesStueck, 12);
  assert.equal(S.markeUeberholt(marke("zugspitze")).laufendesStueck, 24);
});
test("„Nach drei Stückchen über dem Fernsehturm“ stimmt: 384 m > 368 m, nach zwei erst 256 m", () => {
  nah(S.hoeheNachStuecken(3), 383.9, 0.1);
  assert.ok(S.hoeheNachStuecken(3) > 368);
  assert.ok(S.hoeheNachStuecken(2) < 368);
});
test("Nach 9 Stückchen (1.152 m) über dem Brocken, nach 12 (1.535 m) über dem Feldberg", () => {
  assert.ok(S.hoeheNachStuecken(9) > 1141 && S.hoeheNachStuecken(8) < 1141);
  assert.ok(S.hoeheNachStuecken(12) > 1493 && S.hoeheNachStuecken(11) < 1493);
});
test("Zugspitze: nach 23 Stückchen fehlen noch 19 m, erst das 24. bringt dich drüber (Abweichung zum Plan: nicht „bei Stück 23“)", () => {
  nah(S.fehltNach(23, marke("zugspitze")), 19.1, 0.1);
  assert.ok(S.hoeheNachStuecken(23) < 2962);
  assert.ok(S.hoeheNachStuecken(24) > 2962);
});
test("Zähler: 0/24 am Boden, 24/24 oben, laufendes Stückchen", () => {
  assert.equal(S.stueckBeiHoehe(0), 0);
  assert.equal(S.stueckBeiHoehe(1), 1);
  assert.equal(S.stueckBeiHoehe(157), 2);
  assert.equal(S.stueckBeiHoehe(368), 3);
  assert.equal(S.stueckBeiHoehe(S.hoehe()), 24);
});
test("TNT: 22,6 MJ/kg = 5,4 × 4,184 MJ/kg", () => {
  nah(S.mjProKg(), 22.59, 0.01);
  nah(S.tntFaktor(), 5.4, 0.01);
});
test("Mit Muskel-Wirkungsgrad 25 %: 768 m, für die Zugspitze 4 Tafeln", () => {
  nah(S.hoeheEchtMuskel(), 767.7, 0.1);
  assert.equal(Math.round(S.hoeheEchtMuskel()), 768);
  assert.equal(S.tafelnFuer(2962), 4);
  assert.equal(S.tafelnFuer(2962, 0.2), 5); // bei 20 % wären es 5 (Spanne 20–25 %)
});
test("Empfindlichkeit: Ab 509 kcal reicht die Tafel (ohne Verlust) bis über die Zugspitze", () => {
  nah(S.kcalFuer(2962), 520.7, 0.2);
  assert.ok(S.hoehe({ kcal: 532 }) > 2962);
  assert.ok(S.hoehe({ kcal: 577 }) > 3000);
});
test("Höhenverlauf ist linear in Stückchen und begrenzt", () => {
  nah(S.hoeheBeiStueckchen(12), S.hoehe() / 2, 1e-9);
  nah(S.hoeheBeiStueckchen(30), S.hoehe(), 1e-9);
  assert.equal(S.hoeheBeiStueckchen(-1), 0);
});
