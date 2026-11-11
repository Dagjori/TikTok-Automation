import test from "node:test";
import assert from "node:assert/strict";
import * as F from "./watt_flut.mjs";
const nah = (a, b, e) => assert.ok(Math.abs(a - b) <= e, `erwartet ${b}, erhalten ${a}`);
test("Priel-Tiefe: 20 cm bei NW, 48 cm bei 36 s, 58 cm bei 40 s, 104 cm bei 53,2 s, 121 cm bei 58 s", () => { nah(F.prielCm(5), 20, 0.01); nah(F.prielCm(36), 48, 0.5); nah(F.prielCm(40), 58, 0.5); nah(F.prielCm(53.2), 104, 0.5); nah(F.prielCm(58), 121, 0.5); });
test("1 m Anstieg nach 88 min = 50 s Video; Zeitraffer 105,6-fach", () => { nah(F.minNachNw(58), 88, 0.01); nah(F.MIN_JE_S * 60, 105.6, 0.01); nah(F.anstiegCm(58), 100, 1.01); });
test("Steigrate 9 / 32 / 83 / 96 / 122 / 124 cm/h", () => { for (const [t, r] of [[13, 9], [22.4, 32], [35.6, 83], [40, 96], [53.2, 122], [58, 124]]) nah(F.rateCmH(t), r, 0.6); });
test("Anstieg monoton und Wasser erreicht die Füße bei 58 s", () => { let p = -1; for (let t = 0; t <= 70; t += 0.5) { assert.ok(F.anstiegCm(t) >= p - 1e-9); p = F.anstiegCm(t); } assert.equal(F.wasserAnFuessen(58), 1); });
test("Countdown 14:05 bis 0:00 in 8 s", () => { assert.equal(F.countdownText(0), "14:05"); assert.equal(F.countdownText(8), "0:00"); });
