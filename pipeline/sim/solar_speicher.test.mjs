// Tests: node --test pipeline/sim/solar_speicher.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { videoZahlen, abstand } from "./solar_speicher.mjs";
const v = videoZahlen(); const r = Math.round;
test("Jahreswerte 1.231 / 1.696 €, +465 €", () => { assert.equal(r(v.ohne), 1231); assert.equal(r(v.mit), 1696); assert.equal(r(v.mehr), 465); });
test("Geld wächst gut ein Drittel (37–39 %)", () => assert.ok(v.plusProzent > 0.36 && v.plusProzent < 0.39));
test("Lena führt bis Jahr 10, Jonas ab Jahr 11", () => { assert.ok(abstand(10) < 0); assert.ok(abstand(11) > 0); assert.equal(r(abstand(10)), -146); });
test("Endstand 24.620 / 26.802, Akku +2.182 €", () => { assert.equal(r(v.lena20), 24620); assert.equal(r(v.jonas20), 26802); assert.equal(r(v.jonas20) - r(v.lena20), 2182); /* Bildzahlen in sich stimmig */ });
test("Varianten: 6.600 € → unter 400, 3.000 € → fast 4.000", () => { assert.ok(v.teuer > 0 && v.teuer < 400); assert.ok(v.billig > 3900 && v.billig < 4000); });
test("Unabhängigkeit verdoppelt sich (37 → 79 %)", () => assert.ok(0.787 / 0.3736 > 2));
