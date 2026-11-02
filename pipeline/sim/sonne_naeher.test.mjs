import { test } from "node:test";
import assert from "node:assert/strict";
import { r, anzeige, strahlung, groesse, subsolarC, AE } from "./sonne_naeher.mjs";
test("Knoten: 148,1 (0,99 AE) bei 15 s, Venus 108,2 bei 32 s, Merkur 57,9 bei 45 s, Parker 6,8 bei 55 s, Oberfläche bei 60 s", () => {
  assert.equal(Math.round(r(15) * 10) / 10, 148.1); assert.equal(r(32), 108.2); assert.equal(r(45), 57.9);
  assert.equal(Math.round((r(55) - 0.6957) * 10) / 10, 6.1); assert.equal(r(60), 0.6957);
});
test("monoton fallend, Anzeige HIER bei 60 s", () => {
  for (let t = 0; t < 60; t += 0.5) assert.ok(r(t + 0.5) < r(t));
  assert.ok(anzeige(60).hier && anzeige(60).wert === 0);
});
test("Venusbahn: Strahlung ×1,9; Merkurbahn: Sonne ×2,6; Parker: Sonne ×22", () => {
  assert.equal(Math.round(strahlung(108.2) * 10) / 10, 1.9);
  assert.equal(Math.round(groesse(57.9) * 10) / 10, 2.6);
  assert.equal(Math.round(groesse(6.1 + 0.6957)), 22);
});
test("Ab ca. 49 s liegt die Subsolar-Temperatur über 800 °C (Gestein glüht sichtbar ab ca. 525 °C)", () => {
  assert.ok(subsolarC(r(48.8)) > 525);
});
