// Tests: node --test pipeline/sim/gruene_sahara.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { jvh, seeflaeche, deutschlandUeberschritten, DE } from "./gruene_sahara.mjs";
test("Stützstellen 16.000/14.500/11.500/0", () => { assert.deepEqual([0,20,34,60].map(jvh), [16000,14500,11500,0]); });
test("Feuchtzeit-Beginn 14.800 bei 16 s, vor Satz Monsun 18 s", () => { assert.equal(jvh(16), 14800); });
test("Größer als Deutschland bei 32,5 s, vor dem Satz 32,8 s", () => { const t = deutschlandUeberschritten(); assert.ok(t > 32.4 && t < 32.8); assert.ok(seeflaeche(32.8) > DE); });
test("Auch mit Armitage-Wert 361.000 km² größer als Deutschland", () => assert.ok(361000 > DE));
test("Pegelfall 5.000 J. v. h. vor Satz 49,4 s", () => assert.ok(jvh(49.4) < 5000));
