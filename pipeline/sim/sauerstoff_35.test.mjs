// Tests: node --test pipeline/sim/sauerstoff_35.test.mjs  (Soll-Werte aus daten.skript.rechenweg und daten.skript.zahlen)
import { test } from "node:test"; import assert from "node:assert/strict";
import { countdown, sauerstoff, zeitBeiO2, spannweite, abstand, jahre, RAFFER_O2_JAHRE, RAFFER_LIBELLE_JAHRE, FAKTOR_MEGANEURA, T_EREIGNIS, T_HIER, STUFEN } from "./sauerstoff_35.mjs";
const nah = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test("Countdown 0:08 → 0:00, Ereignis bei 8 s", () => { assert.equal(T_EREIGNIS, 8); assert.equal(countdown(0), 8); assert.equal(countdown(4), 4); assert.equal(countdown(8), 0); assert.equal(countdown(30), 0); });
test("Sauerstoff: 20,9 % bis 8 s, 26,99 % bei 16,2 s, 35,0 % ab 27 s", () => {
  nah(sauerstoff(0), 20.9, 1e-9, "0 s"); nah(sauerstoff(8), 20.9, 1e-9, "8 s");
  nah(sauerstoff(16.2), 26.99, 0.005, "16,2 s"); nah(sauerstoff(27), 35.0, 1e-9, "27 s"); nah(sauerstoff(45), 35.0, 1e-9, "danach");
});
test("Schwelle 25 % bei 13,52 s (Satz ‚ab 25 Prozent‘ bei 16,2 s liegt darüber)", () => { nah(zeitBeiO2(25), 13.52, 0.005, "t25"); assert.ok(sauerstoff(16.2) > 25); });
test("Spannweite 11 → 70 cm: 39,91 cm bei 39,8 s, 60,56 cm bei 46,8 s", () => {
  nah(spannweite(0), 11, 1e-9, "Start"); nah(spannweite(30), 11, 1e-9, "30 s"); nah(spannweite(39.8), 39.91, 0.005, "39,8 s");
  nah(spannweite(46.8), 60.56, 0.005, "46,8 s"); nah(spannweite(50), 70, 1e-9, "50 s"); nah(spannweite(70), 70, 1e-9, "Ende");
});
test("Abstand 20 → 0,5 m: 9,28 m bei 54,4 s, HIER bei 58 s", () => { nah(abstand(50), 20, 1e-9, "50 s"); nah(abstand(54.4), 9.28, 0.005, "54,4 s"); nah(abstand(T_HIER), 0.5, 1e-9, "58 s"); assert.equal(T_HIER, 58); });
test("Zeitraffer: 95 Jahre (5 J/s) und 2.000.000 Jahre (100.000 J/s)", () => {
  assert.equal(RAFFER_O2_JAHRE, 95); assert.equal(RAFFER_LIBELLE_JAHRE, 2000000);
  nah(jahre(27), 95, 1e-9, "27 s"); nah(jahre(30), 95, 1e-9, "30 s"); nah(jahre(50), 2000095, 1e-6, "50 s");
});
test("Meganeura / Königslibelle = 6,36", () => nah(FAKTOR_MEGANEURA, 6.36, 0.005, "Faktor"));
test("Kurven stetig und monoton, keine Sprünge je Bild", () => {
  for (let t = 0; t < 70; t += 1 / 30) {
    const d = 1 / 30;
    assert.ok(sauerstoff(t + d) >= sauerstoff(t)); assert.ok(spannweite(t + d) >= spannweite(t)); assert.ok(abstand(t + d) <= abstand(t));
    assert.ok(sauerstoff(t + d) - sauerstoff(t) < 0.03); assert.ok(spannweite(t + d) - spannweite(t) < 0.1); assert.ok(abstand(t) - abstand(t + d) < 0.09);
  }
});
test("Stufen: mindestens 3 Eskalationsstufen zwischen 8 und 58 s, Höhepunkt 58–62 s", () => {
  assert.ok(STUFEN.filter(([t]) => t > 8 && t < 58).length >= 3);
  assert.ok(STUFEN.some(([t, s]) => t >= 58 && t <= 62 && s === "HIER"));
});
