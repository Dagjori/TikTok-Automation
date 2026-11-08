import test from "node:test";
import assert from "node:assert/strict";
import { videoZahlen, P } from "./mwst_1968.mjs";
const Z = videoZahlen();
test("Anteile ergeben 100 %", () => assert.equal(Math.round((P.anteil.regel + P.anteil.erm + P.anteil.frei) * 100), 100));
test("Stationen: Restaurant, Supermarkt, Rest", () => {
  assert.equal(Z.gastroHeute, 14.07); assert.equal(Z.gastroAlt, 20.09);
  assert.equal(Z.ermHeute, 34.09); assert.equal(Z.ermAlt, 24.35);
  assert.equal(Z.regelBrutto, 1608.92); assert.equal(Z.regelHeute, 256.89); assert.equal(Z.regelAlt, 135.2);
});
test("Zwischenstand nach dem Supermarkt: heute führt knapp (Führungswechsel)", () => {
  assert.equal(Z.nachSuperHeute, 48.16); assert.equal(Z.nachSuperAlt, 44.44);
  assert.ok(Z.gastroAlt > Z.gastroHeute); assert.ok(Z.nachSuperHeute > Z.nachSuperAlt);
});
test("Monat und Jahr", () => {
  assert.equal(Z.monatHeute, 305.04); assert.equal(Z.monatAlt, 179.65);
  assert.equal(Z.jahrHeute, 3660.53); assert.equal(Z.jahrAlt, 2155.78); assert.equal(Z.differenzJahr, 1504.75);
  assert.equal(Z.mehrProzent, 69.8); assert.equal(Z.korbTeurerProzent, 4.0); assert.equal(Z.anteilNichtRegel, 44);
});
test("Variante Juli 1968 (11 %/5,5 %): Differenz 1.289 €", () => assert.equal(Math.round(videoZahlen(P.juli1968).differenzJahr), 1289));
