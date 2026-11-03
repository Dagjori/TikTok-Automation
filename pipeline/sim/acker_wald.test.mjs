// Tests: node --test pipeline/sim/acker_wald.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { jahr, ohnePflug, kohlenstoff } from "./acker_wald.mjs"; const r = Math.round;
test("Stützstellen 1882/1892/1950/1999/2026, 144 Jahre", () => { assert.deepEqual([0,20,40,52,60].map(jahr), [1882,1892,1950,1999,2026]); assert.equal(2026-1882, 144); });
test("Jahre ohne Pflug 11 → 69", () => { assert.equal(ohnePflug(1892), 11); assert.equal(ohnePflug(1950), 69); });
test("Kohlenstoff 234 → 400 t/ha", () => { assert.equal(r(kohlenstoff(1950)), 234); assert.equal(r(kohlenstoff(1999)), 400); });
test("Satzzeiten: Weizen weg 1886 vor 9 s, Teilung 1900 vor 23 s, Schafe 1960–2000 bei 45 s", () => { assert.ok(jahr(9) >= 1886); assert.ok(jahr(23) >= 1900); const s = jahr(45); assert.ok(s > 1960 && s < 2000); });
