import test from "node:test";
import assert from "node:assert/strict";
import * as E from "./erdkern_kuehlt.mjs";
test("Feld: 49 bei Start, 22 ab 18,5 s, 4,9 bei 34 s, 0,17 bei 48 s, 0 ab 58 s", () => {
  assert.equal(E.feld(0), 49); assert.equal(E.feld(2.5), 49);
  assert.ok(Math.abs(E.feld(18.5) - 22) < 1e-9); assert.ok(Math.abs(E.feld(20) - 22) < 1e-9);
  assert.ok(Math.abs(E.feld(33.999) - 4.9) < 0.01); assert.ok(Math.abs(E.feld(47.999) - 0.165) < 0.002);
  assert.equal(E.feld(58), 0); assert.equal(E.feld(70), 0);
});
test("Feld fällt monoton und stetig", () => {
  let v = E.feld(2.5); for (let t = 2.51; t <= 70; t += 0.01) { const x = E.feld(t); assert.ok(x <= v + 1e-9, `t=${t}`); assert.ok(v - x < 0.8, `Sprung bei ${t}`); v = x; }
});
test("Schutzschild r = 10·(B/B0)^(1/3): 4,6 bei 10 %, 1,5 bei 0,34 %", () => {
  assert.equal(E.radius(4.9).toFixed(1), "4.6"); assert.equal(E.radius(E.B_ENDE).toFixed(1), "1.5");
  assert.ok(Math.abs(E.B_ENDE - 0.1655) < 0.001); assert.equal((49 * 0.0034).toFixed(2), "0.17");
  assert.equal(E.rSchild(34).toFixed(1), "4.6"); assert.equal(E.rSchild(48).toFixed(1), "1.5");
  for (let t = 34; t <= 48; t += 0.5) assert.ok(Math.abs(E.radius(E.feld(t)) - E.rSchild(t)) < 1e-9);
});
test("Beryllium ×1,0 bei 20 s, ×2,0 ab 29,5 s", () => { assert.equal(E.beryllium(20), 1); assert.equal(E.beryllium(29.5), 2); assert.equal(E.beryllium(34), 2); });
test("Anteil Südatlantik 22/49 = 44,9 %", () => assert.equal(((22 / 49) * 100).toFixed(1), "44.9"));
test("Anzeige: Countdown 2,5 → 0, deutsche Zahlen, Etiketten und HIER", () => {
  assert.deepEqual([E.anzeige(0).zahl, E.anzeige(0).etikett], ["2,5", "MODELLSTART IN"]);
  assert.equal(E.anzeige(2.49).zahl, "0,0"); assert.equal(E.anzeige(2.5).zahl, "49,0"); assert.equal(E.anzeige(18.6).zahl, "22,0");
  assert.equal(E.anzeige(20).zahl, "×1,0"); assert.equal(E.anzeige(30).zahl, "×2,0");
  assert.equal(E.anzeige(34).zahl, "4,6"); assert.equal(E.anzeige(34).einheit, "Erdradien");
  assert.equal(E.anzeige(48).zahl, "0,17"); assert.equal(E.anzeige(57.99).zahl, "0,00");
  assert.equal(E.anzeige(58).zahl, "HIER"); assert.equal(E.anzeige(58).wert, 0); assert.equal(E.anzeige(65).zahl, "0");
  assert.equal(new Set([0, 3, 21, 35, 50, 59, 65].map((t) => E.anzeige(t).etikett)).size, 4); // MODELLSTART IN, MAGNETFELD, BERYLLIUM-10-BILDUNG, SCHUTZSCHILD (MAGNETFELD kehrt zurück)
});
