// Tests: node --test pipeline/sim/kindergeld.test.mjs  (Werte aus dem Skript acc1-2026-11-10-abend; dort mit Python gerechnet)
import { test } from "node:test";
import assert from "node:assert/strict";
import { videoZahlen, rechne, ccbJahrCad } from "./kindergeld.mjs";

const v = videoZahlen();
const nahe = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test("Deutschland: 3.108 €/Jahr, 55.944 € bis 18", () => { assert.equal(v.deJahr, 3108); assert.equal(v.deSumme, 55944); });
test("Einkommen 78.525 CAD, Kürzung 2.820,16 CAD", () => { nahe(v.einkommenCad, 78525, 0.01); nahe(v.kuerzungCad, 2820.16, 0.01); });
test("Kanada: 3.398,18 €/Jahr (283,18 €/Monat) unter 6, 2.586,97 €/Jahr (215,58 €/Monat) ab 6", () => {
  nahe(v.caU6Jahr, 3398.18, 0.01); nahe(v.caU6Monat, 283.18, 0.01); nahe(v.ca6Jahr, 2586.97, 0.01); nahe(v.ca6Monat, 215.58, 0.01);
});
test("Kanada bis 18: 51.432,74 €, Deutschland vorn mit 4.511 €", () => { nahe(v.caSumme, 51432.74, 0.01); nahe(v.vorsprungDe, 4511, 0.5); assert.ok(v.vorsprungDe > 0); });
test("Maximalbetrag unter 6: 432,82 €/Monat", () => nahe(v.maxMonatEur, 432.82, 0.01));
test("Nach 6 Jahren: Kanada 20.389 €, Deutschland 18.648 €, Kanada +1.741 €", () => {
  nahe(v.nach6Ca, 20389, 0.6); nahe(v.nach6De, 18648, 0.01); nahe(v.vorsprungCa6, 1741, 0.6);
});
test("Deutschland holt 521 €/Jahr auf und überholt in Monat 113 (9 Jahre 5 Monate)", () => {
  nahe(v.aufholenJahr, 521, 0.1); assert.equal(v.kippMonat, 113); assert.equal(v.kippJahre, 9); assert.equal(v.kippRestMonate, 5);
});
test("Gleichstand bei ca. 46.420 € Einkommen", () => nahe(v.gleichstand, 46420, 30));
test("Unter 46.400 € gewinnt Kanada, darüber Deutschland", () => {
  assert.ok(rechne({ einkommenEur: 46000 }).vorsprungDe < 0); assert.ok(rechne({ einkommenEur: 47000 }).vorsprungDe > 0);
});
test("Kanada maximal bis 18: 131.538 CAD = 83.755 €", () => { nahe(v.caMaxCad, 131538, 1); nahe(v.caMax, 83755, 1); });
test("CCB-Staffel: Grenze 38.237 CAD, über 82.847 CAD 3.123 CAD + 3,2 %", () => {
  assert.equal(ccbJahrCad(38237, 0), 8157); nahe(ccbJahrCad(90000, 0), 8157 - 3123 - 0.032 * (90000 - 82847), 0.01);
});
test("Bei 40.000 € Einkommen gewinnt Kanada (Pointe-Szene)", () => { assert.ok(v.vorsprungCa40k > 0); nahe(v.ca40k, 64032, 5); });
