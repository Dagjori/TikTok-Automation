import test from "node:test";
import assert from "node:assert/strict";
import * as S from "./pilz_geflecht.mjs";
const r1 = (x) => Math.round(x * 10) / 10;
test("Endwert: 2.400 Jahre, 965 ha bei 60 s; Fußballfeld 0,714 ha → über 1.350 Felder", () => { assert.equal(S.jahr(60), 2400); assert.equal(r1(S.flaeche(60)), 965); assert.ok(S.felder(60) > 1350 && S.felder(60) < 1352); });
test("Satz „Nach 1.000 Jahren 170 Hektar“ bei 29,8 s (Jahr 1.006, 169,6 ha)", () => { assert.equal(Math.round(S.jahr(29.8)), 1006); assert.equal(r1(S.flaeche(29.8)), 169.6); });
test("Anzeige 30 s: 172,7 ha = 242 Felder; 50 s: 629,5 ha = 882 Felder; 58 s 892 ha", () => {
  assert.equal(r1(S.flaeche(30)), 172.7); assert.equal(Math.round(S.felder(30)), 242); assert.equal(r1(S.flaeche(50)), 629.5); assert.equal(Math.round(S.felder(50)), 882); assert.equal(Math.round(S.flaeche(58)), 892);
});
test("Satz „über 700 Fußballfelder“ bei 45,6 s: 707 Felder (504,5 ha)", () => { assert.equal(Math.round(S.felder(45.6)), 707); assert.equal(r1(S.flaeche(45.6)), 504.5); });
test("Vor dem Ereignis nichts, Countdown 0:08 → 0:00, Kreisradius bei 965 ha ca. 1.753 m", () => { assert.equal(S.flaeche(7.9), 0); assert.equal(S.countdownText(0), "0:08"); assert.equal(S.countdownText(8), "0:00"); assert.equal(Math.round(S.radiusM(60)), 1753); });
