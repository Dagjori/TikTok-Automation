// Tests: node --test pipeline/sim/steuerklasse.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { videoZahlen } from "./steuerklasse.mjs";
const v = videoZahlen();
test("Monatsnetto 4.711,68 / 4.640,01, +71,67 €", () => { assert.equal(v.netto35, 4711.68); assert.equal(v.netto44, 4640.01); assert.equal(+(v.netto35 - v.netto44).toFixed(2), 71.67); });
test("Jahr: +860 € vorab", () => assert.equal(Math.round((v.netto35 - v.netto44) * 12), 860));
test("Nachzahlung 554 € / Erstattung 306 €", () => { assert.equal(Math.round(v.nach35), 554); assert.equal(Math.round(v.erst44), 306); });
test("Jahresnetto gleich 55.986 €, Unterschied 0", () => { assert.equal(Math.round(v.jahr35), 55986); assert.equal(Math.round(v.jahr35), Math.round(v.jahr44)); });
test("Elterngeld V 914 € / IV 1.095 €, 12 Monate 2.171 €", () => { assert.equal(Math.round(v.egV), 914); assert.equal(Math.round(v.egIV), 1095); assert.equal(Math.round((v.egIV - v.egV) * 12), 2171); });
