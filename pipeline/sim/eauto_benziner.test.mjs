// Tests: node --test pipeline/sim/eauto_benziner.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { videoZahlen, P, kosten, vorsprungBenziner } from "./eauto_benziner.mjs";
const v = videoZahlen();
test("75.000 km, Kaufpreisdifferenz 8.200 €", () => { assert.equal(v.km, 75000); assert.equal(v.kaufDiff, 8200); });
test("Benziner 50.025 €, 833,75 €/Monat", () => { assert.equal(v.benziner, 50025); assert.equal(v.monatB, 833.75); });
test("Stromer je Ladepreis: 53.250 / 51.750 / 50.550 / 48.750 €", () => { assert.equal(v.s60, 53250); assert.equal(v.s45, 51750); assert.equal(v.s35, 50550); assert.equal(v.s18, 48750); });
test("Vorsprung Benziner 3.225 / 1.725 / 525 €, Solar: Stromer 1.275 € vorn", () => { assert.equal(v.v60, 3225); assert.equal(v.v45, 1725); assert.equal(v.v35, 525); assert.equal(v.v18, -1275); });
test("Monat Stromer bei 35 ct: 842,50 €", () => assert.equal(v.monat35, 842.5));
test("Spanne Solar gegen Säule 4.500 €", () => assert.equal(v.spanne, 4500));
test("Führung kippt erst bei Solarstrom (Vorsprung Benziner sinkt je Runde, Vorzeichen wechselt in Runde 4)", () => {
  const f = [60, 45, 35, 18].map((c) => vorsprungBenziner(c)); assert.ok(f[0] > f[1] && f[1] > f[2] && f[2] > 0 && f[3] < 0);
});
test("Prämie 3.000 €: 35 ct → 47.550 € (Stromer 2.475 € günstiger), 60 ct → Benziner nur noch 225 € günstiger", () => {
  assert.equal(v.p35, 47550); assert.equal(v.pv35, -2475); assert.equal(v.p60, 50250); assert.equal(v.pv60, 225);
});
test("kosten() rundet auf Cent", () => assert.equal(kosten(P.ctKmBenziner), 50025));
