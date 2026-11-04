// Tests: node --test pipeline/sim/vorsorge_25_35.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { videoZahlen } from "./vorsorge_25_35.mjs";
const v = videoZahlen();
test("Mit 35: Lena 15.499 €", () => assert.equal(v.lena35, 15499));
test("Mit 55 gleich eingezahlt (36.000 €), Lena 81.870 / Mia 61.119", () => { assert.equal(1200 * 30, 1800 * 20); assert.equal(v.lena55, 81870); assert.equal(v.mia55, 61119); });
test("Abstand mit 60: 23.080 €", () => assert.equal(v.abstand60, 23080));
test("Endstand 67: 166.640 / 139.181, +27.459 €, 7.200 € weniger eingezahlt", () => { assert.equal(v.lena67, 166640); assert.equal(v.mia67, 139181); assert.equal(v.abstand67, 27459); assert.equal(v.einMia - v.einLena, 7200); });
test("3 % Rendite: 3.986 € Vorsprung", () => assert.equal(v.abstand3, 3986));
test("Lena nur bis 35 (12.000 €): 73.853 €", () => assert.equal(v.nurBis35, 73853));
import { endwertStetig, endwert } from "./vorsorge_25_35.mjs";
test("Stetige Formel = Schleife bei ganzen Monaten (5 % und 3 %)", () => {
  for (const [r, s, a, p] of [[100, 25, 67, 0.05], [150, 35, 67, 0.05], [100, 25, 35, 0.05], [100, 25, 67, 0.03], [150, 35, 55, 0.05]])
    assert.ok(Math.abs(endwertStetig(r, s, a, p) - endwert(r, s, a, p)) < 1e-6);
});
