// Tests: node --test pipeline/sim/superkontinent.test.mjs
import { test } from "node:test"; import assert from "node:assert/strict";
import { R, A, BREITE_HEUTE, BREITE_MAX, SCHLIESSEN_CM, rate, jahre, zeitBei, breiteBei, breiteKm, jahreBisStoss, sichtweiteKm, fingernagelCmJahr, grosskreis, etikett } from "./superkontinent.mjs";
const nah = (x, y, tol) => assert.ok(Math.abs(x - y) <= tol, `${x} ≠ ${y} (±${tol})`);
test("Referenzstrecke Dakar–Natal ≈ 3.003 km", () => { nah(grosskreis(14.69, -17.45, -5.79, -35.21), 3003, 2); nah(BREITE_HEUTE, 3003, 2); });
test("Wachstum 3 cm/Jahr × 50 Mio. Jahre = 1.500 km, größte Breite 4.503 km", () => { nah(BREITE_MAX, 4503, 2); nah(breiteKm(50e6) - breiteKm(0), 1500, 1e-6); });
test("Schließen: 4.503 km in 200 Mio. Jahren ≈ 2,25 cm/Jahr", () => { nah(SCHLIESSEN_CM, 2.25, 0.01); });
test("Fingernagel 3,47 mm/Monat ≈ 4,16 cm/Jahr", () => { nah(fingernagelCmJahr, 4.164, 0.001); });
test("Zeitraffer: Summe bei 58 s = 250 Mio. Jahre, R ≈ 5,28 Mio. Jahre/s", () => { nah(jahre(58), 250e6, 1); nah(R, 5284123, 3000); assert.equal(jahre(70), 250e6); nah(rate(0), 1000, 1e-6); nah(rate(8), R, 1); nah(rate(58), 500000, 1); });
test("Rate ist stetig (8 s, 50 s)", () => { nah(rate(8 - 1e-6), rate(8 + 1e-6), 20); nah(rate(50 - 1e-6), rate(50 + 1e-6), 20); });
test("Umkehr (50 Mio. Jahre) bei 16,5 s", () => { nah(zeitBei(50e6), 16.53, 0.03); });
test("Kontrollwerte: 2.000 km bei 37,6 s, 1.000 km bei 46,0 s (Satzzeiten)", () => { nah(breiteBei(37.6), 2000, 40); nah(breiteBei(46.0), 1000, 30); });
test("Ca. 500 km bei 50,2 s, ca. 23 Mio. Jahre bis zum Stoß bei 50 s", () => { nah(breiteBei(50.2), 500, 15); nah(jahreBisStoss(50) / 1e6, 23.1, 0.3); });
test("Gegenküste sichtbar ab 212 km = 53,3 s (Berge 3.000 m, Standhöhe 20 m)", () => { nah(sichtweiteKm(3000, 20), 212, 3); nah(breiteBei(53.3), 212, 12); });
test("Breite am Ende 0 km (58 s)", () => { nah(breiteBei(58), 0, 0.5); assert.equal(jahreBisStoss(58), 0); });
test("Anzeige läuft monoton und ohne Sprung (0,5-s-Schritt)", () => {
  let prev = null; for (let t = 0.5; t <= 58; t += 0.5) { const d = jahre(t) - jahre(t - 0.5); assert.ok(d > 0); if (t > 1.5) assert.ok(d / prev < 2.9 && d / prev > 0.4, `Sprung bei ${t}: ${d / prev}`); prev = d; }
});
test("Etiketten", () => { assert.equal(etikett(0), "JAHRE IN DER ZUKUNFT"); assert.equal(etikett(16.6), "BREITE DES ATLANTIKS"); assert.equal(etikett(50), "JAHRE BIS ZUM ZUSAMMENSTOSS"); assert.equal(etikett(58), "HIER"); });
