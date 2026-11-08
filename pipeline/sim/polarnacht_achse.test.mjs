import test from "node:test";
import assert from "node:assert/strict";
import * as S from "./polarnacht_achse.mjs";
test("heute (ε 23,44°): Modell 116 Tage Polarnacht (skaliert 113), 126 Tage Mitternachtssonne", () => {
  const z = S.zaehle(23.44); assert.equal(z.polarnacht, 116); assert.equal(z.mitternachtssonne, 126);
  assert.equal(S.tage(23.44).polarnacht, 113); assert.equal(S.tage(23.44).mitternachtssonne, 126);
});
test("Schwellen: Polarnacht endet bei ε < 12,61°, Mitternachtssonne bei ε < 10,95°", () => {
  assert.equal(S.zaehle(12.5).polarnacht, 0); assert.ok(S.zaehle(12.7).polarnacht > 0);
  assert.equal(S.zaehle(10.9).mitternachtssonne, 0); assert.ok(S.zaehle(11.0).mitternachtssonne > 0);
});
test("Winter 1 (Mitte 19,65 s): 94 Tage Polarnacht, rund 19 Tage kürzer", () => { const n = S.tage(S.eps(19.65)).polarnacht; assert.ok(n >= 92 && n <= 96, String(n)); assert.ok(113 - n >= 17 && 113 - n <= 21); });
test("Sommer 2 (ca. 25,65 s, ε 15,44°): rund drei Monate Mitternachtssonne (92 Tage)", () => { const n = S.tage(S.eps(25.65)).mitternachtssonne; assert.ok(n >= 90 && n <= 94, String(n)); });
test("Sommer 3 (37,65 s, ε 9,18°): keine Mitternachtssonne mehr", () => assert.equal(S.tage(S.eps(37.65)).mitternachtssonne, 0));
test("Winter 2 (31,65 s, ε 12,19°): keine Polarnacht, Mittagshöhe −0,41°, Tag 2,1 h", () => {
  assert.equal(S.tage(S.eps(31.65)).polarnacht, 0); assert.equal(Math.round(S.mittag(S.eps(31.65), 354.6) * 100) / 100, -0.41);
  assert.equal(Math.round(S.tagesLaengeStunden(S.dekl(S.eps(31.65), 354.6)) * 10) / 10, 2.1);
});
test("Mittagssonne im Winter: 3,8° bei 40 s, 6,0° bei 44,4 s, 9,9° bei 52,4 s, 11,8° ab 58 s", () => {
  assert.equal(Math.round(S.mittagWinter(40) * 10) / 10, 3.8); assert.equal(Math.round(S.mittagWinter(44.4) * 10) / 10, 6.0);
  assert.equal(Math.round(S.mittagWinter(52.4) * 10) / 10, 9.9); assert.equal(Math.round(S.mittagWinter(58) * 10) / 10, 11.8);
});
test("Neigung unter 2° bei 52,4 s (1,87°), ohne Neigung 11,78° und 12,54 h", () => {
  assert.equal(Math.round(S.eps(52.4) * 100) / 100, 1.87); assert.equal(Math.round(S.mittagNull * 100) / 100, 11.78); assert.equal(Math.round(S.tageslaengeNull * 100) / 100, 12.54);
});
test("Countdown 0:08 → 0:00 bis 8 s", () => { assert.equal(S.countdownText(0), "0:08"); assert.equal(S.countdownText(7.5), "0:01"); assert.equal(S.countdownText(8), "0:00"); });
