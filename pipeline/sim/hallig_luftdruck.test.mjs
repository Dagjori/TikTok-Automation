import test from "node:test";
import assert from "node:assert/strict";
import * as H from "./hallig_luftdruck.mjs";
const nah = (a, b, e = 0.15) => assert.ok(Math.abs(a - b) <= e, `erwartet ${b}, erhalten ${a}`);
test("Start 985,2 hPa bei 8 s, Tiefpunkt 962,3 hPa bei 58 s", () => { nah(H.druck(8), 985.2, 0.01); nah(H.druck(58), 962.3, 0.01); });
test("Meer gehoben: 30 cm bei 13 s, 48 cm bei 49 s, 51 cm im Tiefpunkt", () => { nah(H.meerCm(13), 30.4, 0.3); nah(H.meerCm(49), 48, 0.3); nah(H.meerCm(58), 51, 0.1); });
test("Fallrate 4 hPa je Stunde (10–13 UTC), Anstieg +7 hPa/h (18–19 UTC)", () => { nah(H.fallrateHpaProH(10, 13), 4.1, 0.1); nah(-H.fallrateHpaProH(18, 19), 7.0, 0.01); });
test("Böen: 43 km/h bei 13 UTC, 85 km/h bei 40 s, 130 km/h bei 58 s", () => { nah(H.boe(8 + (13 - 9) * 3600 / 576), 43, 0.01); nah(H.boe(40), 85, 3); nah(H.boe(58), 130, 0.01); });
test("Countdown 60:00 bis 0:00 in 8 s, Sonnenuntergang bei 49,1 s", () => { assert.equal(H.countdownText(0), "60:00"); assert.equal(H.countdownText(8), "0:00"); nah(H.sonnenuntergangVideoS, 49.1, 0.1); });
