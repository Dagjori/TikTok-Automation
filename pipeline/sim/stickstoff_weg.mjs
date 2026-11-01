// „Stell dir vor, der Stickstoff verschwindet fünf Sekunden lang aus der Luft“ – eigene Rechnung (Account 2, Video 2).
// Szenario: Nur das N₂-GAS der Luft verschwindet (auch in Tüten, Lunge und Ohr). Alles andere bleibt: O₂, Argon, CO₂, Wasserdampf,
// und der in Körper und Lebensmitteln gelöste bzw. gebundene Stickstoff.
// Einheiten: hPa, mmHg (Atemphysiologie), m, °C, kg. Tests: node --test sim/stickstoff_weg.test.mjs

// ---------- Luft (trockene Luft, Volumenanteile) ----------
export const LUFT = { N2: 0.78084, O2: 0.20946, Ar: 0.00934, CO2: 0.00042 }; // Summe ≈ 1,00006 (Rundung); Rest wird als „alles außer N₂“ gerechnet
export const P0 = 1013.25; // hPa, Normaldruck auf Meereshöhe (ISA)
export const MMHG = 0.750061683; // 1 hPa in mmHg
export const hPaZuMmHg = (p) => p * MMHG;
export const mmHgZuhPa = (p) => p / MMHG;
export const G = 9.80665;

/** Anteil der Luft, der ohne N₂ übrig bleibt (trocken) */
export const restAnteil = () => 1 - LUFT.N2;
/** Gesamtdruck ohne N₂ (trockene Luft, Meereshöhe) */
export const restDruck = (p0 = P0) => p0 * restAnteil();
/** Teildruck von O₂ (bleibt unverändert) */
export const teildruckO2 = (p0 = P0) => p0 * LUFT.O2;
/** Anteil von O₂ im verbleibenden Gas */
export const o2AnteilRest = () => LUFT.O2 / restAnteil();

/** Variante mit feuchter Luft (Wasserdampf bleibt): rel. Feuchte phi bei Temperatur T */
export function restDruckFeucht({ phi = 0.5, tC = 20, p0 = P0 } = {}) {
  const pw = phi * dampfdruckHPa(tC);
  return (p0 - pw) * restAnteil() + pw;
}

// ---------- ICAO-Standardatmosphäre ----------
const L = 0.0065, T0 = 288.15, R = 287.05287, T11 = 216.65, H11 = 11000;
const EXP_TROPO = G / (L * R); // 5,25588
export const P11 = P0 * Math.pow(T11 / T0, EXP_TROPO); // 226,32 hPa
/** Druck (hPa) in Höhe h (m), bis 20 km */
export function isaDruck(h) {
  if (h <= H11) return P0 * Math.pow(1 - (L * h) / T0, EXP_TROPO);
  return P11 * Math.exp((-G * (h - H11)) / (R * T11));
}
/** Höhe (m) zu einem Druck (hPa) */
export function isaHoehe(p) {
  if (p >= P11) return (T0 / L) * (1 - Math.pow(p / P0, 1 / EXP_TROPO));
  return H11 - ((R * T11) / G) * Math.log(p / P11);
}
const bisekt = (f, ziel, a, b) => { // f monoton fallend
  for (let i = 0; i < 80; i++) { const m = (a + b) / 2; if (f(m) > ziel) a = m; else b = m; }
  return (a + b) / 2;
};

// ---------- Atmung: Alveolargleichung ----------
export const KOERPER = { PH2O: 47, PaCO2: 40, RQ: 0.8, tC: 37 }; // mmHg, mmHg, –, °C (Standardannahmen, Ruhe, gesunder Erwachsener)
/** Eingeatmeter O₂-Druck, angefeuchtet in der Luftröhre: PIO2 = FiO2 · (PB − 47) */
export const pio2 = (fio2, pbMmHg, k = KOERPER) => fio2 * (pbMmHg - k.PH2O);
/** Abgekürzte Alveolargleichung (Lehrbuch/Klinik): PAO2 = PIO2 − PaCO2 / R */
export const pao2Kurz = (fio2, pbMmHg, k = KOERPER) => pio2(fio2, pbMmHg, k) - k.PaCO2 / k.RQ;
/** Vollständige Alveolargleichung: PAO2 = PIO2 − PaCO2 · (FiO2 + (1 − FiO2) / R) */
export const pao2Voll = (fio2, pbMmHg, k = KOERPER) => pio2(fio2, pbMmHg, k) - k.PaCO2 * (fio2 + (1 - fio2) / k.RQ);

/** Normale Luft in Höhe h (m): [FiO2, PB in mmHg] */
const luftInHoehe = (h) => [LUFT.O2, hPaZuMmHg(isaDruck(h))];
/** Höhe, in der normale Luft denselben Wert liefert (m). art: "pio2" | "kurz" | "voll" */
export function gefuehlteHoehe(ziel, art = "pio2") {
  const f = (h) => { const [fi, pb] = luftInHoehe(h); return art === "pio2" ? pio2(fi, pb) : art === "kurz" ? pao2Kurz(fi, pb) : pao2Voll(fi, pb); };
  return bisekt(f, ziel, 0, 11000);
}
/** Atmung ohne N₂ bei Normaldruck der Restluft */
export function atmung(p0 = P0) {
  const pb = hPaZuMmHg(restDruck(p0));
  const fi = o2AnteilRest();
  const pioNeu = pio2(fi, pb), kurzNeu = pao2Kurz(fi, pb), vollNeu = pao2Voll(fi, pb);
  const pbNormal = hPaZuMmHg(p0), pioNormal = pio2(LUFT.O2, pbNormal);
  return {
    pb_mmHg: pb, fio2_neu: fi,
    pio2_neu: pioNeu, pio2_normal: pioNormal,
    pao2_kurz_neu: kurzNeu, pao2_kurz_normal: pao2Kurz(LUFT.O2, pbNormal),
    pao2_voll_neu: vollNeu, pao2_voll_normal: pao2Voll(LUFT.O2, pbNormal),
    hoehe_pio2: gefuehlteHoehe(pioNeu, "pio2"),
    hoehe_kurz: gefuehlteHoehe(kurzNeu, "kurz"),
    hoehe_voll: gefuehlteHoehe(vollNeu, "voll"),
  };
}

// ---------- Wasser: Dampfdruck und Siedepunkt (IAPWS-IF97, Region 4) ----------
const N = [0.11670521452767e4, -0.72421316703206e6, -0.17073846940092e2, 0.1202082470247e5, -0.32325550322333e7, 0.1491510861353e2, -0.48232657361591e4, 0.40511340542057e6, -0.23855557567849, 0.65017534844798e3];
/** Sättigungsdruck (MPa) bei Temperatur T (K) */
export function psatMPa(TK) {
  const th = TK + N[8] / (TK - N[9]);
  const A = th * th + N[0] * th + N[1], B = N[2] * th * th + N[3] * th + N[4], C = N[5] * th * th + N[6] * th + N[7];
  return Math.pow((2 * C) / (-B + Math.sqrt(B * B - 4 * A * C)), 4);
}
/** Sättigungstemperatur (K) bei Druck p (MPa) */
export function tsatK(pMPa) {
  const b = Math.pow(pMPa, 0.25);
  const E = b * b + N[2] * b + N[5], F = N[0] * b * b + N[3] * b + N[6], Gg = N[1] * b * b + N[4] * b + N[7];
  const D = (2 * Gg) / (-F - Math.sqrt(F * F - 4 * E * Gg));
  return (N[9] + D - Math.sqrt((N[9] + D) * (N[9] + D) - 4 * (N[8] + N[9] * D))) / 2;
}
export const dampfdruckHPa = (tC) => psatMPa(tC + 273.15) * 1e4; // 1 MPa = 10.000 hPa
/** Siedepunkt (°C) bei Druck p (hPa) */
export const siedepunkt = (pHPa) => tsatK(pHPa / 1e4) - 273.15;

/** Kaffee aus dem Automaten (Annahme 80 °C) bei Druck p: kocht er? Wie viel verdampft, bis er den Siedepunkt erreicht? */
export function kaffee({ tC = 80, pHPa = restDruck(), cp = 4.19, masse = 0.15 } = {}) {
  const tb = siedepunkt(pHPa);
  const kocht = dampfdruckHPa(tC) > pHPa;
  // Verdampfungsenthalpie bei tb (kJ/kg), lineare Näherung der Dampftafel: 2501,3 − 2,36·T (±0,3 %)
  const hfg = 2501.3 - 2.36 * tb;
  const anteil = kocht ? (cp * (tC - tb)) / hfg : 0;
  return { tC, siedepunkt: tb, dampfdruck_hPa: dampfdruckHPa(tC), kocht, ueberhitzung_K: tC - tb, verdampft_anteil: anteil, verdampft_g: anteil * masse * 1000 };
}

// ---------- Chipstüten (E 941: N₂ als Packgas) ----------
/** Restsauerstoff in Tüten mit N₂-Spülung: höchstens ca. 3 % (Branchenangabe), also bis ca. 30 hPa Innendruck nach dem Wegfall des N₂ */
export const TUETE = { restO2: 0.03, flaeche: 0.06 /* m² je Tütenseite, ca. 30 × 20 cm */ };
export function tuete({ p0 = P0 } = {}) {
  const aussen = restDruck(p0);
  const innenMax = TUETE.restO2 * p0; // Tüte war bei Normaldruck gefüllt, hier bleibt nur der Restsauerstoff
  const dp = (innen) => aussen - innen;
  const proM2 = (innen) => (dp(innen) * 100) / G / 1000; // Tonnen je m² (Gewichtskraft)
  return {
    aussen_hPa: aussen, innen_max_hPa: innenMax,
    dp_voll_hPa: dp(0), dp_min_hPa: dp(innenMax),
    t_pro_m2_voll: proM2(0), t_pro_m2_min: proM2(innenMax),
    last_je_seite_kg: (dp(0) * 100 * TUETE.flaeche) / G,
  };
}

// ---------- Körper: gelöster Stickstoff in 5 s ----------
// Annahmen: Körper enthält im Gleichgewicht ca. 1 L N₂ gelöst; Löslichkeit (Bunsen) in Blut bei 37 °C ca. 0,0122 mL N₂ je mL und atm;
// Herzzeitvolumen 5 L/min; alveoläres N₂ im Gleichgewicht 563 mmHg.
export const KOERPER_N2 = { gesamt_mL: 1000, bunsen: 0.0122, hzv_Lmin: 5, pn2_mmHg: 563 };
export function koerperStickstoff(dauer = 5) {
  const proLiterBlut = KOERPER_N2.bunsen * (KOERPER_N2.pn2_mmHg / 760) * 1000; // mL N₂ je Liter Blut
  const blut = (KOERPER_N2.hzv_Lmin / 60) * dauer; // Liter Blut durch die Lunge
  const maxRaus = proLiterBlut * blut; // wenn alles abgegeben würde
  const umgebung = hPaZuMmHg(restDruck());
  return {
    mL_je_L_blut: proLiterBlut, blut_L: blut, max_raus_mL: maxRaus, anteil_vom_koerper: maxRaus / KOERPER_N2.gesamt_mL,
    uebersaettigung: KOERPER_N2.pn2_mmHg / umgebung, // Verhältnis Gewebe-N₂ zu Umgebungsdruck (nur zur Einordnung)
  };
}

export function alles() {
  const a = atmung();
  const t = tuete();
  const k = kaffee();
  const kk = koerperStickstoff();
  return {
    rest_anteil: restAnteil(), rest_druck_hPa: restDruck(), rest_druck_feucht_hPa: restDruckFeucht(),
    teildruck_o2_hPa: teildruckO2(), o2_anteil_rest: o2AnteilRest(),
    isa_p11_hPa: P11, hoehe_druck_m: isaHoehe(restDruck()), hoehe_druck_feucht_m: isaHoehe(restDruckFeucht()),
    atmung: a, tuete: t, kaffee: k, koerper: kk,
    siedepunkt_normal_C: siedepunkt(P0),
  };
}

if (typeof process !== "undefined" && process.argv && import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(alles(), null, 2));
