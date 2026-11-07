// Tests: node --test pipeline/sim/meer_flut.test.mjs  (Soll-Werte aus daten.skript.rechenweg)
import { test } from "node:test"; import assert from "node:assert/strict";
import { DAUER_TAGE, TAGE_PRO_S, tag, pegel, rateBei, stunden, bisFels, countdown, START_M } from "./meer_flut.mjs";
const nah = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
test("Dauer 252,7 Tage und Zeitraffer 6,007 Tage/s", () => { nah(DAUER_TAGE, 252.7, 0.05, "Dauer"); nah(TAGE_PRO_S, 6.007, 0.002, "F"); });
test("Tag 253 bei 60 s, Pegel 0 = HIER", () => { nah(tag(60), DAUER_TAGE, 1e-9, "Tag"); nah(pegel(60), 0, 1e-6, "Pegel"); });
test("Pegel vor dem Durchbruch −1.500", () => { assert.equal(pegel(0), START_M); assert.equal(pegel(8), START_M); });
test("Stände laut Rechenweg", () => {
  nah(tag(25), 42, 0.6, "Tag 25 s"); nah(pegel(25), -1450, 3, "25 s");
  nah(tag(33), 91, 0.8, "Tag 33 s"); nah(pegel(33), -1275, 4, "33 s"); nah(rateBei(33), 5.0, 0.15, "Rate 33 s");
  nah(tag(41), 139, 0.8, "Tag 41 s"); nah(pegel(41), -972, 5, "41 s"); nah(rateBei(41), 7.6, 0.2, "Rate 41 s");
  nah(pegel(45), -773, 6, "45 s");
  nah(tag(50.5), 196, 1, "Tag 50,5 s"); nah(rateBei(50.5), 10.8, 0.2, "Rate 50,5 s");
  nah(tag(52), 205, 1, "Tag 52 s"); nah(pegel(52), -349, 6, "52 s");
  nah(pegel(55), -152, 5, "55 s"); nah(pegel(58), -24, 3, "58 s");
});
test("Stunden nach 17 s ca. 27 h, Countdown 8 → 0", () => { nah(stunden(17), 27, 0.6, "h"); assert.equal(countdown(0), 8); assert.equal(countdown(8), 0); assert.equal(countdown(30), 0); });
test("Pegel steigt monoton, Fels-Abstand nie negativ", () => { let p = -1e9; for (let t = 0; t <= 60; t += 0.05) { const x = pegel(t); assert.ok(x >= p - 1e-9); p = x; assert.ok(bisFels(t) >= -1e-6); } });
test("Zeitraffer stetig: Tagessprung pro Bild klein", () => { for (let t = 8; t < 60; t += 1 / 30) assert.ok(tag(t + 1 / 30) - tag(t) < 0.21); });
