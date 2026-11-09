import test from "node:test";
import assert from "node:assert/strict";
import * as S from "./ameisen.mjs";
const r1 = (x) => Math.round(x * 10) / 10;
test("Prüfwerte laut Skript: 12,8 s → Tag 46, 16,8 s → Tag 167, 20,8 s → Tag 319", () => {
  assert.equal(Math.round(S.tag(12.8)), 46); assert.equal(Math.round(S.tag(16.8)), 167); assert.equal(Math.round(S.tag(20.8)), 319);
});
test("Prüfwerte Jahre: 33,4 s → Jahr 9, 54,4 s → Jahr 24, Jahr 28 bei 60 s", () => {
  assert.equal(Math.round(S.jahr(33.4)), 9); assert.equal(Math.round(S.jahr(54.4)), 24); assert.equal(S.jahr(60), 28); assert.equal(S.jahr(22), 1);
});
test("1,41 s je Jahr = 8,5 Monate je Sekunde; stetiger Anschluss Tag 365 bei 22 s", () => {
  assert.equal(Math.round(S.jahrJeSekunde() * 100) / 100, 1.41); assert.equal(r1(S.monateJeSekunde()), 8.5);
  assert.equal(S.tag(22), 365); assert.equal(S.tag(2.5), 0); assert.equal(S.tag(9), 1); assert.equal(S.tag(14), 60);
});
test("Countdown 0:02 bei Bild 0, 0:00 auf Null bei 2,5 s (Testblock a); Laborrekord 28,75, Anzeige endet bei 28", () => {
  assert.equal(S.countdownText(0), "0:02"); assert.equal(S.countdownText(1), "0:01"); assert.equal(S.countdownText(2.5), "0:00"); assert.equal(S.T_EREIGNIS, 2.5);
  assert.equal(S.LABOR_JAHRE, 28.75); assert.equal(S.ANZEIGE_ENDE_JAHRE, 28); assert.ok(S.jahr(58.5) < 28 && S.jahr(58.5) > 26.9);
});
test("Jahreszeit: Start Juli, Tag 167 Jahreswechsel (Winter), Tag 319 Ende Mai", () => {
  assert.ok(Math.abs(S.jahresPos(2.5) - 196 / 365) < 1e-9);
  const p = S.jahresPos(16.8); assert.ok(p > 0.95 || p < 0.1); assert.ok(Math.abs(S.jahresPos(20.8) - 150 / 365) < 0.01);
});
