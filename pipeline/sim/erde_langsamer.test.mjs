// Tests: node --test pipeline/sim/erde_langsamer.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { v0, sonnentagH, vStill, meer, fliehHoeheM } from "./erde_langsamer.mjs";
test("Äquator 1.674 km/h", () => assert.equal(Math.round(v0), 1674));
test("835 km/h → 48 h Tag; 700 → 2,4 Tage; 20 → 108 Tage", () => { assert.equal(Math.round(sonnentagH(835)), 48); assert.equal(+(sonnentagH(700) / 24).toFixed(1), 2.4); assert.equal(Math.round(sonnentagH(20) / 24), 108); });
test("Sonne steht still bei 4,6 km/h (Schritttempo)", () => assert.equal(+vStill.toFixed(1), 4.6));
test("Meer −850 bei 1.450, −2.806 bei 700, −3.000 bei 574", () => { assert.equal(Math.round(meer(1450)), -850); assert.equal(Math.round(meer(700)), -2806); assert.equal(Math.round(meer(574)), -3000); });
test("Fliehkrafthöhe ca. 11 km, starr ein Drittel ≈ 3,7 km", () => { const h = fliehHoeheM(); assert.ok(h > 10900 && h < 11200); assert.ok(h / 3 > 3600 && h / 3 < 3750); });
