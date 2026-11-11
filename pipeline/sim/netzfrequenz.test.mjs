import test from "node:test";
import assert from "node:assert/strict";
import * as N from "./netzfrequenz.mjs";
test("Stufen 49,0 … 48,1 Hz, 10 Stück; Prozentwerte 2023; kumuliert 6,4 … 41,6", () => {
  assert.equal(N.STUFEN, 10); assert.deepEqual([N.STUFE_HZ[0], N.STUFE_HZ[9]], [49.0, 48.1]);
  assert.deepEqual(N.KUM, [6.4, 10.4, 14.6, 18.5, 22.4, 26.0, 30.2, 33.8, 37.4, 41.6]);
  assert.ok(Math.abs(N.ABWURF_PROZENT.reduce((a, b) => a + b, 0) - 41.7) < 1e-9);   // gerundete Einzelwerte 41,7, Bericht 41,6
  assert.ok(N.KUM[9] < 45 && N.KUM[9] > 38);                                          // Vorgabe 45 % ± 7 %
});
test("Abstand 2,5 Hz, Trennung bei 47,5 Hz, Iberien 48,0 Hz → 3 s", () => {
  assert.equal(N.ABSTAND_HZ, 2.5); assert.equal(N.TRENNUNG_HZ, 47.5); assert.equal(N.IBERIEN.hz, 48); assert.equal(N.IBERIEN.sekunden_bis_kollaps, 24 - 21);
});
test("Frequenz: 50,00 bei 2,5 s, 49,80 bei 12 s, 49,00 bei 21 s, 48,10 ab 46,5 s, 47,50 ab 58 s; monoton fallend, stetig", () => {
  const f = (t) => N.frequenz(t).toFixed(2);
  assert.equal(f(0), "50.00"); assert.equal(f(2.5), "50.00"); assert.equal(f(12), "49.80"); assert.equal(f(21), "49.00");
  assert.equal(f(46.5), "48.10"); assert.equal(f(48), "48.10"); assert.equal(f(58), "47.50"); assert.equal(f(75), "47.50");
  let v = 50; for (let t = 0; t <= 70; t += 0.01) { const x = N.frequenz(t); assert.ok(x <= v + 1e-9, `t=${t}`); assert.ok(v - x < 0.01, `Sprung bei ${t}`); v = x; }
});
test("Stufenzeiten: Stufe 1 bei 21 s, Stufe 2 bei 28,2 s, Stufe 5 (Ampel) bei ca. 35 s, Stufe 10 bei 46,5 s; Schwelle passt zur Frequenz", () => {
  assert.equal(N.stufeZeit(0), 21); assert.equal(N.stufeZeit(1), 28.2); assert.ok(Math.abs(N.stufeZeit(4) - 35.06) < 0.01); assert.ok(Math.abs(N.stufeZeit(9) - 46.5) < 1e-9);
  for (let i = 0; i < 10; i++) assert.ok(Math.abs(N.frequenz(N.stufeZeit(i)) - N.STUFE_HZ[i]) < 1e-9, `Stufe ${i}`);
  assert.equal(N.stufenAktiv(20.9), 0); assert.equal(N.stufenAktiv(21), 1); assert.equal(N.stufenAktiv(46.6), 10);
});
test("Lastanzeige: 6,4 bei 21 s, hochzählend, 41,6 am Ende; Sätze: 6,4 % und 41,6 %", () => {
  assert.equal(N.lastProzent(20), 0); assert.equal(N.lastProzent(21), 6.4); assert.equal(N.lastProzent(46.4).toFixed(1), "37.4"); assert.equal(N.lastProzent(27.9), 6.4);
  assert.ok(N.lastProzent(28.2 + 0.3) > 6.4 && N.lastProzent(28.2 + 0.3) < 10.4); assert.equal(N.lastProzent(47.7), 41.6);
  let v = 0; for (let t = 21; t <= 48; t += 0.01) { const x = N.lastProzent(t); assert.ok(x >= v - 1e-9); v = x; }
});
test("Anzeige: Countdown 2,5 → 0,0, Etiketten, Statuszeilen, HIER", () => {
  assert.deepEqual([N.anzeige(0).zahl, N.anzeige(0).etikett], ["2,5", "KRAFTWERKSAUSFALL IN"]);
  assert.equal(N.anzeige(2.49).zahl, "0,0"); assert.equal(N.anzeige(2.5).zahl, "50,00"); assert.equal(N.anzeige(12.5).unter, "REGELRESERVE (AB 49,80)");
  assert.equal(N.anzeige(21).zahl, "6,4"); assert.equal(N.anzeige(21).unter, "STUFE 1 · 49,0 HZ"); assert.equal(N.anzeige(46.6).unter, "STUFE 10 · 48,1 HZ");
  assert.equal(N.anzeige(48).etikett, "NETZFREQUENZ"); assert.equal(N.anzeige(48).zahl, "48,10"); assert.equal(N.anzeige(57.99).zahl, "47,50");
  assert.equal(N.anzeige(58).zahl, "HIER"); assert.equal(N.anzeige(58).wert, 0);
  assert.equal(new Set([0, 3, 12.5, 18, 22, 30, 40, 49, 54, 59, 63].map((t) => N.anzeige(t).unter)).size >= 8, true);
});
test("Zeitlupe ca. 1:8", () => assert.ok(N.ZEITLUPE > 7.5 && N.ZEITLUPE < 8.5));
