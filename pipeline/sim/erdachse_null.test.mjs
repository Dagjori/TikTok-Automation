// Tests: node --test pipeline/sim/erdachse_null.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { mittag, tagH } from "./erdachse_null.mjs";
const f = (x) => +x.toFixed(1);
test("Heute: Sommer 62,7° (über 60), Winter 15,9°", () => { assert.equal(f(mittag(23.44)), 62.7); assert.equal(f(mittag(-23.44)), 15.9); });
test("18°: 57,3/21,3; 7,5°: 46,8/31,8", () => { assert.equal(f(mittag(18)), 57.3); assert.equal(f(mittag(-18)), 21.3); assert.equal(f(mittag(7.5)), 46.8); assert.equal(f(mittag(-7.5)), 31.8); });
test("Wintertag 7,5° → 10,8 h, 5° → 11,2 h (über elf), 0° → 12 h", () => { assert.equal(f(tagH(-7.5)), 10.8); assert.equal(f(tagH(-5)), 11.2); assert.equal(f(tagH(0)), 12.0); });
test("Ohne Neigung Mittagssonne 39°", () => assert.equal(Math.round(mittag(0)), 39));
