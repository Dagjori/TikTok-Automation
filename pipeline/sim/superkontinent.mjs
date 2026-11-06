// Plattentektonik im Zeitraffer bis zum nächsten Superkontinent (Account 2, Skript acc2-2026-11-06-abend)
// Anzeige y(t) = Jahre in der Zukunft = ∫ r dt; Breite des Atlantiks in km aus den Plattentempi (Referenzstrecke Dakar–Natal, Großkreis).
// Modell Pangaea Proxima (Scotese/PALEOMAP): Atlantik wächst zunächst ca. 50 Mio. Jahre mit 3 cm/Jahr, schließt sich dann in 200 Mio. Jahren.
export const GESAMT = 250e6;                     // Jahre bis zum Superkontinent
export const T_UMKEHR_J = 50e6;                  // Wachstumsphase
export const R_ERDE = 6371;                      // km
export const T1 = 8, T2 = 50, T3 = 58;           // Segmentgrenzen in s
export const R_ENDE = 0.5e6;                     // Jahre/s am Ende der Bremsung (T3)
export const R0 = 1000;                          // Jahre/s bei t = 0
export const WACHSTUM_CM = 3;                    // cm/Jahr (NOAA: 3–4 cm/Jahr zwischen Südamerika und Afrika)

// Großkreisabstand Dakar (14,69° N, 17,45° W) – Natal (5,79° S, 35,21° W)
export function grosskreis(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180, p1 = lat1 * r, p2 = lat2 * r, dl = (lon2 - lon1) * r;
  const c = Math.acos(Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl));
  return R_ERDE * c;
}
export const BREITE_HEUTE = grosskreis(14.69, -17.45, -5.79, -35.21);                       // ≈ 3.003 km
export const BREITE_MAX = BREITE_HEUTE + WACHSTUM_CM * 1e-5 * T_UMKEHR_J;                   // 1 cm/Jahr = 1e-5 km/Jahr → +1.500 km
export const SCHLIESSEN_CM = BREITE_MAX / ((GESAMT - T_UMKEHR_J) * 1e-5);                   // ≈ 2,25 cm/Jahr

// Segment 2 (konstant R) wird so gewählt, dass die Summe bei T3 genau 250 Mio. Jahre ergibt.
// Segment 1: r = R0·e^(a·t), r(T1) = R  →  ∫ = (R − R0)/a mit a = ln(R/R0)/T1;  Segment 3: linear R → R_ENDE.
function summe(R) {
  const a = Math.log(R / R0) / T1;
  return (R - R0) / a + R * (T2 - T1) + (R + R_ENDE) / 2 * (T3 - T2);
}
function loeseR() { let lo = 1e5, hi = 3e7; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (summe(m) < GESAMT) lo = m; else hi = m; } return (lo + hi) / 2; }
export const R = loeseR();                       // ≈ 5,28 Mio. Jahre/s
export const A = Math.log(R / R0) / T1;

export function rate(t) {
  if (t <= 0) return R0;
  if (t <= T1) return R0 * Math.exp(A * t);
  if (t <= T2) return R;
  if (t <= T3) return R + (R_ENDE - R) * (t - T2) / (T3 - T2);
  return 0;
}
export function jahre(t) {
  if (t <= 0) return 0;
  if (t <= T1) return R0 * (Math.exp(A * t) - 1) / A;
  if (t >= T3) return GESAMT;
  const j1 = (R - R0) / A;
  if (t <= T2) return j1 + R * (t - T1);
  const j2 = j1 + R * (T2 - T1);
  if (t <= T3) { const s = t - T2, L = T3 - T2; return j2 + R * s + 0.5 * (R_ENDE - R) * s * s / L; }
  return GESAMT;
}
export function zeitBei(y) { let lo = 0, hi = T3; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (jahre(m) < y) lo = m; else hi = m; } return (lo + hi) / 2; }

/** Breite des Atlantiks in km (Referenzstrecke): wächst 50 Mio. Jahre mit 3 cm/Jahr, schrumpft danach mit SCHLIESSEN_CM */
export function breiteKm(y) {
  if (y <= T_UMKEHR_J) return BREITE_HEUTE + WACHSTUM_CM * 1e-5 * y;
  return Math.max(0, BREITE_MAX - SCHLIESSEN_CM * 1e-5 * (y - T_UMKEHR_J));
}
export const breiteBei = (t) => breiteKm(jahre(t));
export const jahreBisStoss = (t) => Math.max(0, GESAMT - jahre(t));
/** Sichtweite eines Gebirges (Höhe h m) bei Standhöhe e m: 3,57·(√h + √e) km */
export const sichtweiteKm = (hGebirge, eAuge) => 3.57 * (Math.sqrt(hGebirge) + Math.sqrt(eAuge));
/** Fingernagel: 3,47 mm/Monat → cm/Jahr */
export const fingernagelCmJahr = 0.347 * 12;
/** Phase der Anzeige (Etikett) */
export const etikett = (t) => (t < 16.5 ? "JAHRE IN DER ZUKUNFT" : t < T2 ? "BREITE DES ATLANTIKS" : t < T3 ? "JAHRE BIS ZUM ZUSAMMENSTOSS" : "HIER");
