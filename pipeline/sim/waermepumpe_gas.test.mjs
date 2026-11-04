// Tests: node --test pipeline/sim/waermepumpe_gas.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { videoZahlen, abstand } from "./waermepumpe_gas.mjs";
const v = videoZahlen(); const r = Math.round;
test("Jahreskosten 2.019 / 1.263 €, +756 €", () => { assert.equal(r(v.gasJahr), 2019); assert.equal(r(v.wpJahr), 1263); assert.equal(r(v.diffJahr), 756); });
test("Förderung 12.880 €, WP netto 22.120 €, Start −12.120 €", () => { assert.equal(r(v.foerderung), 12880); assert.equal(r(v.wpNetto), 22120); assert.equal(r(v.mehrpreis), 12120); });
test("Jahr 16 Gas noch 24 € vorn, Jahr 17 WP vorn (Führungswechsel)", () => { assert.equal(r(abstand(16)), -24); assert.ok(abstand(17) > 0); assert.ok(abstand(15) < 0); });
test("Endstand 50.383 / 47.384, Vorteil 2.999 €", () => { assert.equal(r(v.gas20), 50383); assert.equal(r(v.wp20), 47384); assert.equal(r(v.vorteil20), 2999); });
test("Ohne Förderung verliert die WP (60.264 €), nur Grundförderung auch", () => { assert.equal(r(v.wpOhne20), 60264); assert.ok(v.wpOhne20 > v.gas20); assert.ok(v.wpNurGrund20 > v.gas20); });
test("Bio-Stufe 1 skaliert ≈ 200 €/Jahr (187–256)", () => { assert.equal(r(227 * 16510 / 20000), 187); assert.equal(r(310 * 16510 / 20000), 256); });
