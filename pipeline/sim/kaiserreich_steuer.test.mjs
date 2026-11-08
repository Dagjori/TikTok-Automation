import test from "node:test";
import assert from "node:assert/strict";
import { steuerMark1891, steuer1900, est2026, zveAusBrutto, videoZahlen, kreuzung, grenzsatz2026, soli2026 } from "./kaiserreich_steuer.mjs";

const Z = videoZahlen();
const rund = (x, n = 2) => Math.round(x * 10 ** n) / 10 ** n;

test("Tarif 1891: Stufen nach § 17", () => {
  assert.equal(steuerMark1891(900), 0);
  assert.equal(steuerMark1891(1176.5), 9);
  assert.equal(steuerMark1891(1764.7), 26);
  assert.equal(steuerMark1891(2352.9), 36);
  assert.equal(steuerMark1891(4933.3), 118);
  assert.equal(steuerMark1891(104000), 4000); // Höchstsatz 4 %
});

test("Einkommensleiter 10.000 / 15.000 / 20.000 €", () => {
  assert.equal(steuer1900(10000, { zuschlag: 0 }), 76.5);
  assert.equal(steuer1900(10000), 153);
  assert.equal(est2026(10000), 0);
  assert.equal(Math.round(steuer1900(15000)), 442);
  assert.equal(est2026(15000), 435);
  assert.equal(Math.round(steuer1900(20000)), 612);
  assert.equal(est2026(20000), 1570);
  assert.equal(rund(est2026(20000) / steuer1900(20000), 2), 2.57);
});

test("Führungswechsel bei ca. 15.040 €", () => {
  assert.equal(kreuzung(), 15040);
  assert.ok(est2026(15030) <= steuer1900(15030));
});

test("zvE aus 54.066 € brutto", () => {
  const s = zveAusBrutto();
  assert.equal(rund(s.rv), 5028.14);
  assert.equal(rund(s.pv), 1297.58);
  assert.equal(rund(s.kv * 0.96), 4541.54);
  assert.equal(s.zve, 41932); assert.equal(Z.zve, 41932);
  assert.equal(rund(s.sozialSumme), 11759.36);
});

test("Mittleres Gehalt: 7.827 € gegen 2.006 €, Differenz 5.821 €", () => {
  assert.equal(Z.heute, 7827);
  assert.equal(Math.round(Z.damalsOhne), 1003);
  assert.equal(Math.round(Z.damals), 2006);
  assert.equal(Math.round(Z.diff), 5821);
  assert.equal(rund(Z.markZve, 1), 4933.2); // Skript: 4.933,3 (mit nicht abgerundetem zvE 41.932,73)
  assert.equal(Z.steuerMarkZve, 118);
  assert.equal(rund(Z.diffMonat), 485.08);
});

test("Grenzsatz 32,3 %, Soli 0, Gründe fürs Warum", () => {
  assert.equal(rund(Z.grenzHeute * 100, 1), 32.3);
  assert.equal(soli2026(Z.heute), 0);
  assert.equal(Z.steuerfrei1900, 7650);
  assert.equal(Z.hoechstsatzAb, 850000); // 100.000 Mark; das Skript nannte 892.500 € (= 105.000 Mark, obere Grenze der Stufe)
  assert.ok(Math.abs(Z.grenzDamals - 0.056) < 1e-9);
});
