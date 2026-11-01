// Tests für das Netto-Modul 2026 und die Video-Rechnung „Gehalt oder steuerfrei“:  node --test pipeline/sim/netto.test.mjs
//
// Prüfwerte (Quellen, Abruf über die Websuche am 01.11.2026):
//  [T] Einkommensteuer-Grundtabelle 2026 nach § 32a EStG: zvE 15.000 € → 435 €, 40.000 € → 7.209 €, 50.000 € → 10.548 €,
//      60.000 € → 14.233 € (übereinstimmend steuerschroeder.de „Grundtabelle 2026“, rechner-hub.de „Einkommensteuertabelle 2026“,
//      vermoegenszentrum.de „Einkommensteuer-Grundtabelle“).
//  [O] Ordio Lohnsteuer-Rechner, Beispieltabelle 2026 (Rechner nach der Logik des BMF-Lohnsteuerrechners, NRW):
//      3.000 € Steuerklasse I → 293,08 € Lohnsteuer; 3.500 € Steuerklasse III → 110,16 €; 3.500 € Steuerklasse VI → 822,33 €
//      (https://www.ordio.com/tools/lohnsteuer-rechner).
//  [R] rechner-portal.de „3000 Euro brutto in netto“ 2026: Steuerklasse I, Bayern, GKV mit 2,9 % Zusatzbeitrag, kinderlos,
//      ohne Kirchensteuer → 2.054,42 € netto (https://rechner-portal.de/finanzen/gehalt/3000-euro-brutto-in-netto).
//  [S] Beitragssätze und BBG 2026 (Rechengrößen-VO 2026, BMG: durchschnittlicher Zusatzbeitrag 2,9 %), Rechnung von Hand.
import { test } from "node:test";
import assert from "node:assert/strict";
import { tarif, lohnsteuerMonat, sozialMonat, netto, grenzbelastung, sonstigerBezug, sozialSonstigerBezug, rentenpunkte, P2026 } from "./netto.mjs";
import { duell, kipppunkt, renteGehalt, videoZahlen } from "./gehalt_steuerfrei.mjs";

const nah = (a, b, eps = 0.005, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ""} erwartet ${b}, erhalten ${a}`);

test("[T] Tarif 2026 nach § 32a EStG (Grundtabelle)", () => {
  assert.equal(tarif(12348), 0, "Grundfreibetrag 12.348 €");
  assert.equal(tarif(15000), 435);
  assert.equal(tarif(40000), 7209);
  assert.equal(tarif(50000), 10548);
  assert.equal(tarif(60000), 14233);
  // Zonengrenzen stetig (Abweichung höchstens 1 € durch Abrunden)
  assert.ok(Math.abs(tarif(17800) - tarif(17799)) <= 1);
  assert.ok(Math.abs(tarif(69879) - tarif(69878)) <= 1);
  // 42-%-Zone: 0,42 · x − 11.135,63
  assert.equal(tarif(100000), Math.floor(100000 * 0.42 - 11135.63));
});

test("[O] Lohnsteuer Monat 2026 wie BMF-Rechner (Beispieltabelle Ordio)", () => {
  nah(lohnsteuerMonat({ brutto: 3000, stkl: 1, kinderlos: true }).lst, 293.08);
  nah(lohnsteuerMonat({ brutto: 3500, stkl: 3, kinderlos: true }).lst, 110.16);
  nah(lohnsteuerMonat({ brutto: 3500, stkl: 6, kinderlos: true }).lst, 822.33);
});

test("[R] Netto 3.000 € Steuerklasse I, kinderlos, ohne Kirchensteuer (rechner-portal.de)", () => {
  const n = netto({ brutto: 3000, stkl: 1, kinderlos: true, bundesland: "BY" });
  nah(n.netto, 2054.42);
});

test("[S] Sozialabgaben 2026 Arbeitnehmer bei 3.500 € (kinderlos, Zusatzbeitrag 2,9 %)", () => {
  const s = sozialMonat({ brutto: 3500, kinderlos: true });
  nah(s.rv, 325.5); // 9,3 %
  nah(s.av, 45.5); // 1,3 %
  nah(s.kv, 306.25); // 7,3 % + 1,45 %
  nah(s.pv, 84.0); // 1,8 % + 0,6 %
  nah(s.summe, 761.25);
  // Mit Kind kein Zuschlag, Sachsen 2,3 %
  nah(sozialMonat({ brutto: 3500, kinder: 1 }).pv, 63.0);
  nah(sozialMonat({ brutto: 3500, kinderlos: true, bundesland: "SN" }).pv, 101.5);
});

test("[S] Beitragsbemessungsgrenzen 2026 deckeln die Beiträge", () => {
  const kvBBG = P2026.BBG_KV_JAHR / 12, rvBBG = P2026.BBG_RV_JAHR / 12;
  assert.equal(kvBBG, 5812.5);
  assert.equal(rvBBG, 8450);
  assert.deepEqual(sozialMonat({ brutto: 6000, kinderlos: true }).kv, sozialMonat({ brutto: 9000, kinderlos: true }).kv);
  assert.deepEqual(sozialMonat({ brutto: 8450, kinderlos: true }).rv, sozialMonat({ brutto: 12000, kinderlos: true }).rv);
  nah(sozialMonat({ brutto: 9000 }).rv, 785.85); // 8.450 · 9,3 %
});

test("Solidaritätszuschlag: Freigrenze 20.350 € und Milderungszone (11,9 %)", () => {
  // 5.500 €: Jahreslohnsteuer unter der Freigrenze → kein Soli
  assert.equal(lohnsteuerMonat({ brutto: 5500, kinderlos: true }).soli, 0);
  // 8.000 €: Jahreslohnsteuer knapp über der Freigrenze → Milderungszone
  const r = lohnsteuerMonat({ brutto: 8000, kinderlos: true });
  assert.ok(r.lstJahr > P2026.SOLZFREI);
  const soliJahr = Math.floor((r.lstJahr - P2026.SOLZFREI) * 11.9) / 100;
  nah(r.soli, Math.floor((soliJahr * 100) / 12) / 100);
  assert.ok(r.soli < (r.lstJahr * 0.055) / 12);
});

test("Netto ist Brutto minus alle Abzüge, Steuerklasse 3 zahlt weniger als 1", () => {
  for (const b of [2500, 3500, 5500, 8000]) {
    const n = netto({ brutto: b, kinderlos: true });
    nah(n.netto, b - n.lohnsteuer - n.soli - n.kirchensteuer - n.sozial, 0.011);
    assert.ok(netto({ brutto: b, stkl: 3, kinderlos: true }).lohnsteuer < n.lohnsteuer);
  }
  // Kirchensteuer 9 % auf die Lohnsteuer (ohne Kinderfreibeträge)
  const k = lohnsteuerMonat({ brutto: 3500, kinderlos: true, kirche: true });
  nah(k.kist, Math.floor(k.bk * 0.09 * 100) / 100);
  assert.throws(() => netto({ brutto: 1500 }), /Übergangsbereich/);
});

test("Sonstiger Bezug (Weihnachtsgeld): Steuer = Jahressteuer mit minus ohne Bezug", () => {
  const r = sonstigerBezug({ jahreslohn: 42000, bezug: 1000, kinderlos: true });
  // Grenzsteuersatz ca. 29 % auf 1.000 € minus höhere Vorsorgepauschale (ca. 201,50 €) → ca. 232 €
  assert.ok(r.lst > 220 && r.lst < 245, `Lohnsteuer auf 1.000 € bei 42.000 €: ${r.lst}`);
  assert.equal(r.soli, 0);
  // anteilige BBG: bei 7.000 €/Monat im Dezember ist die KV-BBG schon ausgeschöpft → keine KV/PV auf das Weihnachtsgeld
  const sv = sozialSonstigerBezug({ monatsbrutto: 7000, bezug: 1000, monat: 12, kinderlos: true });
  assert.equal(sv.kv, 0);
  assert.equal(sv.pv, 0);
  assert.ok(sv.rv > 0);
});

test("Rentenpunkte: Durchschnittsentgelt 2026 = 1 Entgeltpunkt", () => {
  nah(rentenpunkte(P2026.DURCHSCHNITTSENTGELT).entgeltpunkte, 1, 1e-9);
  nah(rentenpunkte(P2026.DURCHSCHNITTSENTGELT).renteMonat, 42.52, 1e-9);
  nah(renteGehalt(200, 1).renteMonat, 1.96, 0.01);
});

test("Video: 200 € brutto mehr gegen 100 € steuerfrei bei 3.500 € (Endstand)", () => {
  const d = duell(3500);
  nah(d.gehaltNetto, 109.75);
  nah(d.sozial, 43.5);
  nah(d.steuern, 46.75);
  assert.equal(d.steuerfrei, 100);
  assert.equal(d.sieger, "gehalt");
  nah(d.differenz, 9.75);
  // Zwischenstände der Abzüge enden beim Netto
  nah(d.abzuege.at(-1).rest, d.gehaltNetto);
  assert.deepEqual(d.abzuege.map((x) => x.label), ["RENTE", "KRANKEN", "PFLEGE", "ARBEITSLOS", "LOHNSTEUER"]);
  // „fast die Hälfte“ ist weg
  assert.ok(d.abzugQuote > 0.44 && d.abzugQuote < 0.5);
});

test("Video: bei 5.500 € dreht das Ergebnis (zweite Überraschung)", () => {
  const d = duell(5500);
  nah(d.gehaltNetto, 99.09);
  assert.equal(d.sieger, "steuerfrei");
  // Kipppunkt liegt zwischen 3.500 und 5.500 €
  const k = kipppunkt();
  assert.ok(k > 3500 && k <= 5500, `Kipppunkt ${k}`);
  // Über der KV-BBG (5.812,50 €) bringt das Plus wieder mehr (keine KV/PV): darum nur „bei 5.500 €“, keine Pauschalaussage
  assert.equal(duell(6000).sieger, "gehalt");
  const z = videoZahlen();
  assert.equal(z.hoch.brutto, 5500);
});
