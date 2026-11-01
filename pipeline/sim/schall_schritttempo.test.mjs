import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "./schall_schritttempo.mjs";

const nah = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b} (±${eps})`);

test("Schallgeschwindigkeit normal und im Szenario", () => {
  nah(S.C0, 343.2, 0.1);
  nah(S.C0 * 3.6, 1235.6, 0.5); // „über 1.200 km/h“
  nah(S.C1 * 3.6, 5, 1e-9);
  nah(S.FAKTOR, 247.1, 0.1);
});
test("Hey der Freundin: 2 m dauern 1,44 s, kommt in Sekunde 2 an", () => {
  nah(S.laufzeit(2), 1.44, 0.005);
  const t = S.heyAn();
  assert.ok(t > 1 && t < 2, String(t));
});
test("Durchsage aus 8 m kommt nicht mehr in den 5 s an (fast 6 s)", () => {
  nah(S.laufzeit(8), 5.76, 0.005);
  assert.ok(S.durchsageAn() > S.SZ.dauer);
});
test("S-Bahn: Mach 10, Machkegel 5,7°", () => {
  nah(S.mach(50 / 3.6), 10, 1e-9);
  nah(S.machWinkelGrad(10), 5.74, 0.01);
});
test("S-Bahn fährt in Sekunde 5 an dir vorbei, kein Ton von ihr erreicht dich in den 5 s", () => {
  const t = S.bahnBeiDir();
  assert.ok(t > 4 && t < 5, String(t));
  assert.ok(S.fruehesteBahnAnkunft() > S.SZ.dauer, String(S.fruehesteBahnAnkunft()));
});
test("Rennen: S-Bahn 4,3 s, Geräusch 43,2 s, Vorsprung 38,9 s", () => {
  const r = S.rennen();
  nah(r.bahn, 4.32, 0.005);
  nah(r.geraeusch, 43.2, 0.001);
  nah(r.vorsprung, 38.88, 0.001);
});
test("Reichweite in 5 s knapp 7 m; danach wird eine Stimme zu Ultraschall", () => {
  nah(S.reichweite(), 6.94, 0.01);
  assert.ok(S.nachNormal(200) > 20000);
  nah(S.hoerbarBis(), 80.9, 0.2);
});
