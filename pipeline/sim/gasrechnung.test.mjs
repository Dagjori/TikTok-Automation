// Tests: node --test pipeline/sim/gasrechnung.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { videoZahlen, datumNachTagen } from "./gasrechnung.mjs";
const v = videoZahlen();
test("Rechnung 2.446 € brutto, netto 2.055,46, MwSt 390,54", () => { assert.equal(v.brutto, 2446); assert.equal(v.netto, 2055.46); assert.equal(v.mwst, 390.54); });
test("Posten: Energiesteuer 110, CO2 236, Konzession 6, Netz 514, Lieferant 1.189,46", () => { assert.equal(v.es, 110); assert.equal(v.co2, 236); assert.equal(v.konz, 6); assert.equal(v.netz, 514); assert.equal(v.lieferant, 1189.46); });
test("Staat 742,54 € = 30,4 % (BDEW: rund 30 %)", () => { assert.equal(v.staat, 742.54); assert.equal(Math.round(v.staatProzent * 10) / 10, 30.4); });
test("Summe aller Empfänger = Rechnung", () => { assert.equal(Math.round((v.staat + v.netz + v.lieferant) * 100) / 100, v.brutto); });
test("Anteile Netz 21,0 %, Lieferant 48,6 % (BDEW: ein Fünftel, knapp die Hälfte)", () => { assert.equal(v.netzProzent, 21.01); assert.equal(Math.round(v.lieferantProzent * 10) / 10, 48.6); });
test("Staat größer als Netz und als halber Lieferant, mehr als Zehntel und Sechstel", () => { assert.ok(v.staat > v.netz); assert.ok(v.staat > v.halberLieferant); assert.equal(v.halberLieferant, 594.73); assert.ok(v.mwst > v.sechstel - 20 && v.mwst < v.sechstel); assert.ok(v.staat > v.zehntel * 3); });
test("Staats-Tage: 111 Tage, Stichtag 21.04.", () => { assert.equal(v.tage, 111); assert.equal(v.stichtag, "21.04."); assert.equal(datumNachTagen(31), "31.01."); assert.equal(datumNachTagen(32), "01.02."); });
