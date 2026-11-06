// Rückwärts-Zeitraffer bis zur späten Kreidezeit (Account 2, Skript acc2-2026-11-06-mittag)
// Rate r(t) in Jahren je Videosekunde, Anzeige y(t) = ∫ r dt (Jahre vor heute). Grenzen nach ICS 2024.
export const ICS = { quartaer: 2.58e6, neogen: 23.04e6, kreide: 66.0e6 };          // Gelasian, Aquitanian, Danian (Basis)
export const T1 = 18, T2 = 32, T3 = 58;                                               // Segmentgrenzen in s
export const HOMO_SAPIENS = 300000;
// Segment 3 (32–58 s): konstant
export const r3 = (ICS.kreide - ICS.neogen) / (T3 - T2);
// Segment 2 (18–32 s): linear von r1 nach r3; Fläche = Neogen − Quartär
export const r1 = (2 * (ICS.neogen - ICS.quartaer)) / (T2 - T1) - r3;
// Segment 1 (0–18 s): r0·e^(a·t) mit r0·e^(a·18) = r1 und (r1 − r0)/a = Quartär (Bisektion auf a)
function loeseA() {
  let lo = 1e-3, hi = 5;
  const f = (a) => (r1 - r1 * Math.exp(-a * T1)) / a - ICS.quartaer;               // fällt mit a
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
export const a = loeseA();
export const r0 = r1 * Math.exp(-a * T1);

export function rate(t) {
  if (t <= T1) return r0 * Math.exp(a * Math.max(t, 0));
  if (t <= T2) return r1 + (r3 - r1) * (t - T1) / (T2 - T1);
  if (t <= T3) return r3;
  return 0;
}
export function jahre(t) {
  if (t <= 0) return 0;
  if (t <= T1) return r0 * (Math.exp(a * t) - 1) / a;
  if (t <= T2) { const s = t - T1; return ICS.quartaer + r1 * s + 0.5 * (r3 - r1) * s * s / (T2 - T1); }
  if (t <= T3) return ICS.neogen + r3 * (t - T2);
  return ICS.kreide;
}
// Zeit, zu der die Anzeige einen Wert y erreicht (Bisektion, y monoton)
export function zeitBei(y) { let lo = 0, hi = T3; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (jahre(m) < y) lo = m; else hi = m; } return (lo + hi) / 2; }
export const anteilHomoSapiens = HOMO_SAPIENS / ICS.kreide * 100;                    // 0,4545 %
export const epoche = (t) => (t < T1 ? "QUARTÄR" : t < T2 ? "NEOGEN" : t < T3 ? "PALÄOGEN" : "KREIDE");
