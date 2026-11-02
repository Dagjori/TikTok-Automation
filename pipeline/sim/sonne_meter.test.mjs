import { test } from "node:test";
import assert from "node:assert/strict";
import { videoZahlen, anzeige } from "./sonne_meter.mjs";
test("1 Jahr = 365 m, 100 Jahre = 36,5 km, 10.000 Jahre = 3.653 km (unter 1/3 Erddurchmesser)", () => {
  const v = videoZahlen();
  assert.equal(Math.round(v.jahr1_m), 365); assert.equal(Math.round(v.j100_km * 10) / 10, 36.5);
  assert.equal(Math.round(v.j10000_km), 3653); assert.ok(v.j10000_anteil_erddurchmesser < 1 / 3);
});
test("Bis zur Sonnenoberfläche ca. 408 Mio. Jahre; Jahresschwankung 5,0 Mio. km ≈ 1.370× mehr als 10.000 Jahre", () => {
  const v = videoZahlen();
  assert.equal(Math.round(v.jahre_bis_sonne / 1e6), 408);
  assert.equal(Math.round(v.schwankung_km / 1e5) / 10, 5.0);
  assert.ok(v.schwankung_vs_10000 > 1300 && v.schwankung_vs_10000 < 1400);
});
test("Anzeige stetig: 1 m bei 18 s, 365 m bei 36 s, 100 Jahre bei 47 s, 10.000 Jahre bei 58 s, HIER ab 59,5 s", () => {
  assert.ok(Math.abs(anzeige(17.999).wert - 1) < 0.001);
  assert.ok(Math.abs(anzeige(35.999).wert - 365.256) < 0.1);
  assert.ok(Math.abs(anzeige(47).wert - 100) < 0.5);
  assert.equal(Math.round(149.598e6 - anzeige(58).wert), 3653);
  assert.ok(anzeige(60).hier && !anzeige(59).hier);
});
