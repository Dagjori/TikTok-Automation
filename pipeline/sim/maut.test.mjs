import test from "node:test";
import assert from "node:assert/strict";
import { videoZahlen, P } from "./maut.mjs";
const Z = videoZahlen();
test("Pro Kopf und Familie (Skript: 91,83 / 160,48 / 367,31 / 641,92)", () => {
  assert.equal(Z.kopfA, 91.83); assert.equal(Z.kopfB, 160.48);
  assert.equal(Z.famA, 367.31); assert.equal(Z.famB, 641.92);
});
test("Differenz 274,61 € (+74,8 %)", () => { assert.equal(Z.differenz, 274.61); assert.equal(Z.mehrProzent, 74.8); });
test("Pro Woche 7,06 € gegen 12,34 € (+5,28 €)", () => { assert.equal(Z.wocheA, 7.06); assert.equal(Z.wocheB, 12.34); assert.equal(Z.wocheMehr, 5.28); });
test("Mautsatz 19,0 → 34,8 ct/km (+83,2 %)", () => assert.equal(Z.satzPlus, 83.2));
test("2024: Lücke zum Plan 2 Mrd. €", () => { assert.equal(Z.luecke2024, 2.04); assert.equal(P.plan2024 / 1e9, 15); });
test("Ergebnis liegt unter der Warnung des Verbands (350–400 €)", () => assert.ok(Z.unterBgl));
test("Hälfte für die Schiene ca. 321 €", () => assert.equal(Math.round(Z.schieneFam), 321));
test("Zwischenstand 2024 liegt zwischen 2021 und 2025", () => assert.ok(Z.fam24 > Z.famA && Z.fam24 < Z.famB));
