import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "./stickstoff_weg.mjs";

const nah = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b} (±${eps})`);

test("Luft: Anteile und Restdruck ohne N₂ = 222 hPa", () => {
  nah(S.LUFT.N2 + S.LUFT.O2 + S.LUFT.Ar + S.LUFT.CO2, 1, 0.0002);
  nah(S.restAnteil(), 0.21916, 1e-9);
  nah(S.restDruck(), 222.06, 0.05); // 1.013,25 × 0,21916
  nah(S.restDruck(), 1013 * 0.219, 0.5); // Handrechnung des Plans: 1.013 × 0,219 = 222 hPa
  nah(S.teildruckO2(), 212.2, 0.05); // O₂-Teildruck bleibt
  nah(S.o2AnteilRest(), 0.9557, 0.0005);
});
test("Feuchte Luft (50 %, 20 °C): Wasserdampf bleibt, Druck etwas höher (ca. 231 hPa)", () => {
  nah(S.restDruckFeucht(), 231, 1.5);
  assert.ok(S.restDruckFeucht() > S.restDruck());
});
test("ICAO-Standardatmosphäre: 226,32 hPa in 11 km, Gegenprobe mit 1.013,25 hPa in 0 m und 795 hPa in 2.000 m", () => {
  nah(S.P11, 226.32, 0.01);
  nah(S.isaDruck(0), 1013.25, 1e-9);
  nah(S.isaDruck(11000), 226.32, 0.01);
  nah(S.isaDruck(2000), 795.0, 0.2);
  nah(S.isaDruck(5000), 540.2, 0.5);
  nah(S.isaHoehe(S.isaDruck(3456)), 3456, 1e-6);
  nah(S.isaHoehe(S.isaDruck(13000)), 13000, 1e-6);
});
test("222 hPa entsprechen ca. 11,1 km Höhe", () => {
  const h = S.isaHoehe(S.restDruck());
  assert.ok(h > 11000 && h < 11200, String(h)); // knapp über der Tropopause (226,32 hPa)
  nah(h, 11119, 20);
});
test("Atmung: PIO2 bleibt bei ca. 114 mmHg (statt 149), abgekürzte Alveolargleichung ≈ 64 mmHg (statt ca. 100)", () => {
  const a = S.atmung();
  nah(a.pb_mmHg, 166.6, 0.1);
  nah(a.pio2_normal, 149.4, 0.2);
  nah(a.pio2_neu, 114.3, 0.3);
  nah(a.pao2_kurz_normal, 99.4, 0.2); // „ca. 100“
  nah(a.pao2_kurz_neu, 64.3, 0.3); // „≈ 64“
  nah(a.pao2_voll_neu, 73.9, 0.3); // volle Gleichung mit FiO2-Korrektur: etwas mehr
  assert.ok(a.pao2_voll_neu > a.pao2_kurz_neu);
});
test("Gefühlte Höhe: PAO2 64 mmHg entspricht ca. 2.050 m (nicht 2.500–3.000 m); mit der vollen Gleichung ca. 1.600 m", () => {
  const a = S.atmung();
  nah(a.hoehe_pio2, 2048, 30);
  nah(a.hoehe_kurz, 2048, 30); // abgekürzte Gleichung und PIO2 liefern dieselbe Höhe, weil PaCO2/R nur ein fester Abzug ist
  nah(a.hoehe_voll, 1575, 40);
  assert.ok(a.hoehe_kurz < 2500);
  // Gegenprobe: in 2.048 m Höhe liefert normale Luft wirklich PAO2 ≈ 64 mmHg
  nah(S.pao2Kurz(S.LUFT.O2, S.hPaZuMmHg(S.isaDruck(2048))), 64.3, 0.4);
});
test("IAPWS-IF97 Region 4: Prüfwerte der Norm", () => {
  nah(S.psatMPa(300), 0.353658941e-2, 1e-9);
  nah(S.psatMPa(500), 0.263889776e1, 1e-7);
  nah(S.psatMPa(600), 0.123443146e2, 1e-6);
  nah(S.tsatK(0.1), 372.755919, 1e-5);
  nah(S.tsatK(1), 453.035632, 1e-5);
  nah(S.tsatK(10), 584.149488, 1e-5);
});
test("Dampftafel: 20 kPa = 60,06 °C; 60 °C = 19,95 kPa; 65 °C = 25,0 kPa; 80 °C = 47,4 kPa; Siedepunkt normal 99,97 °C", () => {
  nah(S.siedepunkt(200), 60.06, 0.03);
  nah(S.dampfdruckHPa(60) / 10, 19.95, 0.02); // Tafelwerte 19,90–19,95 kPa je nach Ausgabe, IF97 = 19,946
  nah(S.dampfdruckHPa(65) / 10, 25.02, 0.03);
  nah(S.dampfdruckHPa(80) / 10, 47.4, 0.05); // IF97 47,415 kPa, ältere Tafel (Lide) 47,373 kPa
  nah(S.siedepunkt(1013.25), 100, 0.03);
});
test("Siedepunkt bei 222 hPa ≈ 62 °C", () => {
  nah(S.siedepunkt(S.restDruck()), 62.4, 0.15);
});
test("Kaffee (80 °C, Annahme) kocht bei 222 hPa sofort; ca. 3 % verdampfen, bis er auf 62 °C abgekühlt ist", () => {
  const k = S.kaffee();
  assert.equal(k.kocht, true);
  assert.ok(k.dampfdruck_hPa > 2 * S.restDruck()); // 474 hPa gegen 222 hPa
  nah(k.ueberhitzung_K, 17.6, 0.2);
  nah(k.verdampft_anteil, 0.031, 0.002);
  assert.equal(S.kaffee({ pHPa: S.P0 }).kocht, false); // normal: 80 °C kochen nicht
});
test("Chipstüte: innen fast Vakuum, außen 222 hPa = gut 2 t pro m² (2,26 t bei leerer Tüte, 1,95 t bei 3 % Restsauerstoff)", () => {
  const t = S.tuete();
  nah(t.dp_voll_hPa, 222.06, 0.05);
  nah(t.t_pro_m2_voll, 2.264, 0.01);
  nah(t.t_pro_m2_min, 1.954, 0.02);
  nah(t.last_je_seite_kg, 135.9, 1);
  assert.ok(t.t_pro_m2_min > 1.9 && t.t_pro_m2_voll < 2.3);
});
test("Gelöster Stickstoff im Körper: in 5 s höchstens ca. 4 mL (0,4 % von ca. 1 L), also nicht relevant", () => {
  const k = S.koerperStickstoff(5);
  nah(k.mL_je_L_blut, 9.0, 0.3);
  nah(k.blut_L, 0.4167, 1e-3);
  nah(k.max_raus_mL, 3.75, 0.2);
  assert.ok(k.anteil_vom_koerper < 0.005);
});
