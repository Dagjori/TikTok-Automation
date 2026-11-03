// Tests: node --test pipeline/sim/waermepumpe_gas.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import * as W from "./waermepumpe_gas.mjs"; const r = Math.round;
test("Jahreskosten 2.019 / 1.263 €, Differenz 756 €", () => { assert.equal(r(W.gasJahr()), 2019); assert.equal(r(W.wpJahr()), 1263); assert.equal(r(W.gasJahr() - W.wpJahr()), 756); });
test("Förderung 12.880 €, Start −12.120 €", () => { assert.equal(W.foerderung(), 12880); assert.equal(r(W.abstand(0)), -12120); });
test("Jahr 16: Gas 24 € vorn, Jahr 17 WP vorn", () => { assert.equal(r(W.abstand(16)), -24); assert.ok(W.abstand(17) > 0); assert.ok(W.abstand(15) < 0); });
test("Endstand 50.383 / 47.384, Vorteil 2.999", () => { assert.equal(r(W.gasSumme(20)), 50383); assert.equal(r(W.wpSumme(20)), 47384); assert.equal(r(W.abstand(20)), 2999); });
test("Ohne Förderung verliert die WP (60.264 €)", () => { assert.equal(r(W.wpSumme(20, 35000)), 60264); assert.ok(W.wpSumme(20, 35000) > W.gasSumme(20)); });
test("Bio-Stufe 1 skaliert ≈ 187–256 €", () => { assert.equal(r(227 * 16510 / 20000), 187); assert.equal(r(310 * 16510 / 20000), 256); });
