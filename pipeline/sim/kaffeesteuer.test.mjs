import test from "node:test";
import assert from "node:assert/strict";
import { videoZahlen, bisJahr } from "./kaffeesteuer.mjs";
const Z = videoZahlen();
test("Steuer je Tasse: 1,64 ct (1,76 ct inkl. USt)", () => { assert.equal(Z.centTasse, 1.64); assert.equal(Z.centTasseMitUst, 1.76); });
test("Zwischenstände 10 und 30 Jahre: 192,44 € / 577,33 €", () => { assert.equal(Z.zehn, 192.44); assert.equal(Z.dreissig, 577.33); assert.equal(Math.round(bisJahr(50) * 100) / 100, 962.22); });
test("Endstand 60 Jahre: 1.154,66 € (1.079,12 € Kaffeesteuer + 75,54 € USt), Tee 0 €", () => {
  assert.equal(Z.ende, 1154.66); assert.equal(Z.kaffeesteuerEnde, 1079.12); assert.equal(Z.ustEnde, 75.54); assert.equal(Z.tee, 0);
  assert.equal(Z.tassen, 65700); assert.equal(Z.kg, 492.75);
});
test("Teesteuer bis 1992 ≈ 2,12 €/kg, löslicher Kaffee 0,86 ct je Tasse = 52,4 % der Filtertasse", () => { assert.equal(Z.teeEuroKg, 2.12); assert.equal(Z.instantCentTasse, 0.86); assert.equal(Z.instantAnteil, 52.4); });
test("Aufkommen 2,84 Mio. € je Tag", () => assert.equal(Z.aufkommenTag, 2.84));
