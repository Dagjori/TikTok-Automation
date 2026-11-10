import test from "node:test";
import assert from "node:assert/strict";
import { videoZahlen, eurNachLitern, P } from "./benzin_steuer.mjs";
const Z = videoZahlen();
test("CO2 je Liter 2,3942 kg, netto 15,56 ct bei 65 €/t (55 €/t: 13,17 ct)", () => {
  assert.equal(Z.co2kg, 2.3942); assert.equal(Z.co2Ct, 15.56); assert.equal(Z.co2Ct55, 13.17);
});
test("MwSt auf Energiesteuer 12,44 ct (Sprechtext: gut zwölf) und auf CO2 2,96 ct", () => {
  assert.equal(Z.mwstEnergieCt, 12.44); assert.equal(Z.mwstCo2Ct, 2.96);
});
test("Steuer auf Steuer 2027: 15,39 ct/l, 7,70 € je 50 l, 153,92 € je 1.000 l", () => {
  assert.equal(Z.ssCt, 15.39); assert.equal(Z.l50, 7.7); assert.equal(Z.jahr, 153.92); assert.equal(Z.ssCt55, 14.94);
});
test("Zwischenstände 10 l 1,54 € · 30 l 4,62 € · 40 l 6,16 €", () => {
  assert.equal(Z.l10, 1.54); assert.equal(Z.l30, 4.62); assert.equal(Z.l40, 6.16);
});
test("Mit Tankrabatt: 12,72 ct/l, 6,36 € je Tank, 127,25 € im Jahr", () => {
  assert.equal(Z.energieRabatt, 51.41); assert.equal(Z.ssRabattCt, 12.72); assert.equal(Z.l50Rabatt, 6.36); assert.equal(Z.jahrRabatt, 127.25);
});
test("Anstieg nach Rabatt-Ende: 2,67 ct/l, 1,33 €/Tank, 26,68 €/Jahr; Abgleich Bundestag 14,04 × 1,19 ≈ 17 ct", () => {
  assert.equal(Z.anstiegCt, 2.67); assert.equal(Z.anstiegTank, 1.33); assert.equal(Z.anstiegJahr, 26.68);
  assert.equal(Math.round(P.tankrabatt * 1.19), 17);
});
test("Monoton und konsistent: Differenz Jahr = Jahr ohne Rabatt − Jahr mit Rabatt", () => {
  assert.ok(eurNachLitern(10) < eurNachLitern(30) && eurNachLitern(40) < eurNachLitern(50));
  assert.ok(Math.abs(Z.jahr - Z.jahrRabatt - Z.anstiegJahr) < 0.011);
});
