// Tests: node --test pipeline/sim/dino_zurueck.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { ICS, r0, r1, r3, a, rate, jahre, zeitBei, anteilHomoSapiens, epoche } from "./dino_zurueck.mjs";
const nah = (x, y, tol) => assert.ok(Math.abs(x - y) <= tol, `${x} ≠ ${y} (±${tol})`);
test("ICS-Grenzen 2024", () => { assert.equal(ICS.quartaer, 2.58e6); assert.equal(ICS.neogen, 23.04e6); assert.equal(ICS.kreide, 66.0e6); });
test("Raten: r3 = 1.652.308, r1 = 1.270.549, r0 = 180, a = 0,4924", () => { nah(r3, 1652308, 1); nah(r1, 1270549, 1); nah(r0, 180, 1); nah(a, 0.4924, 0.0005); });
test("Grenzen werden exakt getroffen (18 s, 32 s, 58 s)", () => { nah(jahre(18), 2.58e6, 1); nah(jahre(32), 23.04e6, 1); nah(jahre(58), 66e6, 1); assert.equal(jahre(70), 66e6); });
test("Stetigkeit der Rate an 18 s und 32 s, kein Sprung", () => { nah(rate(18 - 1e-6), rate(18 + 1e-6), 5); nah(rate(32 - 1e-6), rate(32 + 1e-6), 5); });
test("Kontrollwerte des Rechenwegs", () => {
  nah(jahre(4.8), 3516, 5); nah(jahre(8.17), 20000, 150); nah(jahre(12.8), 199000, 1000); assert.ok(jahre(12.8) > 190000 && jahre(12.8) < 210000); nah(jahre(13.6), 300000, 5000);
  nah(jahre(24.35), 11.2e6, 0.05e6); nah(jahre(38.6), 34e6, 0.1e6); nah(jahre(51.95), 56e6, 0.1e6);
});
test("Zeitpunkte: LGM 20.000 bei 8,17 s, Antarktis 34 Mio. bei 38,6 s, Hipparion 11,2 Mio. bei 24,35 s, Eozän 56 Mio. bei 51,95 s", () => {
  nah(zeitBei(20000), 8.17, 0.02); nah(zeitBei(34e6), 38.6, 0.05); nah(zeitBei(11.2e6), 24.35, 0.02); nah(zeitBei(56e6), 51.95, 0.02);
});
test("Anzeige läuft monoton und ohne Sprung (0,5-s-Schritt ≤ 1 % der Spanne an keiner Stelle > 3,5× Nachbar)", () => {
  let letzt = 0, prev = null;
  for (let t = 0.5; t <= 58; t += 0.5) { const d = jahre(t) - jahre(t - 0.5); assert.ok(d > 0); if (prev) assert.ok(d / prev < 3.5, `Sprung bei ${t}`); prev = d; letzt = jahre(t); }
  assert.equal(letzt, 66e6);
});
test("Satzfenster: Satz 2 (8,8 s) im LGM, Satz 3 (12,8 s) ≈ 190.000 J., Satz 5 (20,8 s) Pferde 5–7 Mio., Satz 9 (37,6 s) > 34 Mio.? nein: 32,3 Mio.", () => {
  assert.ok(jahre(8.8) > 20000 && jahre(8.8) < 40000); nah(jahre(12.8), 199000, 1000); assert.ok(jahre(12.8) > 190000 && jahre(12.8) < 210000);
  assert.ok(jahre(20.8) > 5e6 && jahre(20.8) < 7e6);
  nah(jahre(37.6), 32.3e6, 0.3e6);
  assert.ok(jahre(41.8) > 38e6 && jahre(41.8) < 40e6);
});
test("Pointe: 300.000 / 66 Mio. = 0,45 %", () => { nah(anteilHomoSapiens, 0.4545, 0.0005); assert.equal(+anteilHomoSapiens.toFixed(2), 0.45); });
test("Epochen-Etiketten", () => { assert.equal(epoche(0), "QUARTÄR"); assert.equal(epoche(18.1), "NEOGEN"); assert.equal(epoche(32.1), "PALÄOGEN"); assert.equal(epoche(58.1), "KREIDE"); });
