import test from "node:test";
import assert from "node:assert/strict";
import * as S from "./truemmer_kette.mjs";

test("Basis und Zuwachs", () => {
  assert.equal(S.NACH_7, 84550); assert.equal(S.NACH_8, 86850); assert.equal(S.ZUWACHS_PROZENT, 26.9);
  assert.equal(S.BASIS + S.JE_KOLLISION, 70750);
});
test("Kollisionen immer schneller, 8 Stück", () => {
  assert.equal(S.KOLL_ZEITEN.length, 8);
  const ab = S.KOLL_ZEITEN.slice(2).map((t, i) => t - S.KOLL_ZEITEN[i + 1]);
  for (let i = 1; i < ab.length; i++) assert.ok(ab[i] < ab[i - 1]);
  assert.equal(S.kollisionen(7.9), 0); assert.equal(S.kollisionen(8), 1); assert.equal(S.kollisionen(41.6), 8);
});
test("Anzeige Trümmer: Anfang, Ende Phase 2, Phase 4", () => {
  assert.equal(S.truemmer(8), 68450); assert.equal(S.truemmer(24), 70750);
  assert.equal(S.truemmer(50), 84550); assert.equal(S.truemmer(58), 86850);
  assert.ok(S.truemmer(50.8) > 80000);
  for (let t = 8; t < 24; t += 0.1) assert.ok(S.truemmer(t + 0.1) >= S.truemmer(t));
});
test("Zeitraffer: 12 Tage, dann 34 Jahre", () => {
  assert.equal(S.tageSeit(24), 12); assert.equal(Math.round((S.tageSeit(50) - 12) / 365.25), 26); assert.equal(S.jahreSeit(50), 26);
});
test("Countdown 0:08 → 0:00 genau bei 8 s", () => {
  assert.equal(S.countdownText(0), "0:08"); assert.equal(S.countdownText(7.5), "0:01"); assert.equal(S.countdownText(8), "0:00");
});
