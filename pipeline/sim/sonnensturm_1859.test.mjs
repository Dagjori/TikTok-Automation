import test from "node:test";
import assert from "node:assert/strict";
import * as S from "./sonnensturm_1859.mjs";
test("Stützwerte: 0 bei 2,5 s, −412 bei 21 s, −589 bei 34 s, −900 bei 58 s", () => {
  assert.equal(S.dst(2.5), 0); assert.equal(Math.round(S.dst(21)), -412); assert.equal(Math.round(S.dst(34)), -589); assert.equal(Math.round(S.dst(58)), -900); assert.equal(S.dst(70), -900);
});
test("Verlauf monoton fallend und stetig", () => {
  let v = S.dst(2.5); for (let t = 2.51; t <= 58; t += 0.01) { const x = S.dst(t); assert.ok(x <= v + 1e-9, `t=${t}`); assert.ok(v - x < 4, `Sprung bei ${t}`); v = x; }
});
test("Vielfaches von Mai 2024: 1,4× bei 34 s, 2,2× bei 58 s; 589/412 und 900/412", () => {
  assert.equal(S.faktor(34).toFixed(1), "1.4"); assert.equal(S.faktor(58).toFixed(1), "2.2"); assert.equal((589 / 412).toFixed(2), "1.43"); assert.equal((900 / 412).toFixed(2), "2.18");
});
test("Mai 2024 ist etwa die Hälfte von 1859 (0,46)", () => assert.equal((412 / 900).toFixed(2), "0.46"));
test("Zeitraffer: 0 s = 18:35, 2,5 s = 19:00, 21 s = 22:05, 34 s = 00:15, 58 s = 04:15, 70 s = 06:15", () => {
  for (const [t, z] of [[0, "18:35"], [2.5, "19:00"], [21, "22:05"], [34, "00:15"], [58, "04:15"], [70, "06:15"]]) assert.equal(S.uhrzeit(t), z);
});
test("Countdown 0:25 bei Bild 0, 0:00 ab 2,5 s", () => { assert.equal(S.countdownText(0), "0:25"); assert.equal(S.countdownText(2.5), "0:00"); assert.equal(S.countdownText(1.25), "0:13"); });
test("Tempo der Wolke 1859 ca. 2.370 km/s", () => assert.equal(Math.round(S.laufzeitH), 2367));
