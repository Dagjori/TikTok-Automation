// Tests: node --test pipeline/sim/studium_ausbildung.test.mjs  (Werte von Hand nachgerechnet)
import { test } from "node:test";
import assert from "node:assert/strict";
import { azubiNetto, lena, tom, rueckstand, ueberholAlter, videoZahlen } from "./studium_ausbildung.mjs";

test("Azubi-Netto aus BIBB 2025 (1.209 € brutto) ≈ 953 €, keine Lohnsteuer", () => {
  assert.ok(Math.abs(azubiNetto() - 953.29) < 0.01);
});
test("Lena: 34.200 mit 19, 154.200 mit 24, 322.200 mit 30, 610.200 mit 40", () => {
  assert.equal(lena(19), 34200); assert.equal(lena(24), 154200); assert.equal(lena(30), 322200); assert.equal(lena(40), 610200);
});
test("Tom: 27.000 mit 24 (Minijob minus Semesterbeiträge), 221.400 mit 30, 641.400 mit 40", () => {
  assert.equal(tom(24), 27000); assert.equal(tom(30), 221400); assert.equal(tom(40), 641400);
});
test("Rückstand maximal mit 24 (127.200), mit 30 noch 100.800", () => {
  assert.equal(rueckstand(24), 127200); assert.equal(rueckstand(30), 100800);
  assert.ok(rueckstand(23) < rueckstand(24) && rueckstand(25) < rueckstand(24));
});
test("Countdown 61.200 / 34.800 / 8.400, Überholen kurz vor 38 (37,64), Vorsprung mit 40 = 31.200", () => {
  const v = videoZahlen();
  assert.deepEqual(v.countdown.map((c) => c.rest), [61200, 34800, 8400]);
  assert.ok(v.ueberholAlter > 37.5 && v.ueberholAlter < 38);
  assert.equal(v.vorsprung40, 31200);
  assert.ok(rueckstand(37.6) > 0 && rueckstand(37.7) < 0);
});
test("IAB 18/2022: Abstand Lebensentgelt 830.000 € brutto", () => {
  assert.equal(videoZahlen().iabDifferenz, 830000);
});
