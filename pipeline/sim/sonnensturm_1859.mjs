// Video-Rechnung „Was wäre, wenn ein Sonnensturm wie 1859 heute Nacht Deutschland trifft?“ (stelldirvor, 11.11.2026 mittag).
// Quellen (F, Skript acc2-2026-11-11-mittag): Dst-Minimum Mai 2024 −412 nT (Kyoto), März 1989 −589 nT, Carrington 1859 ca. −900 nT (Cliver & Dietrich 2013),
// Laufzeit 1859: 150 Mio. km / 17,6 h. Zeitraffer 1 s = 10 Minuten (0 s = 18:35, 2,5 s = 19:00, 70 s = 06:15). Modell: stetiger Anstieg der Störung (Annahme).
export const T_EREIGNIS = 2.5, T_HIER = 58, T_SCHNITT = 58, T_ENDE = 70;
export const DST = { mai2024: -412, maerz1989: -589, carrington: -900 };
export const MIN_JE_S = 10;
const P = [[2.5, 0], [21, -412], [34, -589], [58, -900]];
// monotone kubische Interpolation (Fritsch–Carlson): stetig, nie über die Stützwerte hinaus
const sl = P.slice(1).map((p, i) => (p[1] - P[i][1]) / (p[0] - P[i][0]));
const m = [sl[0], ...sl.slice(1).map((s, i) => (s * sl[i] <= 0 ? 0 : (2 * s * sl[i]) / (s + sl[i]))), sl[sl.length - 1]];
export function dst(t) {
  if (t <= P[0][0]) return 0;
  if (t >= P[P.length - 1][0]) return P[P.length - 1][1];
  let i = 0; while (t > P[i + 1][0]) i++;
  const h = P[i + 1][0] - P[i][0], u = (t - P[i][0]) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * P[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * P[i + 1][1] + (u3 - u2) * h * m[i + 1];
}
export const staerke = (t) => Math.min(1, Math.abs(dst(t)) / 900);          // 0 … 1 (1 = Stärke von 1859)
export const faktor = (t) => Math.abs(dst(t)) / Math.abs(DST.mai2024);           // Vielfaches von Mai 2024
export const uhrzeitMin = (t) => 18 * 60 + 35 + MIN_JE_S * t;                // Minuten seit Mitternacht
export const uhrzeit = (t) => { const x = Math.floor(uhrzeitMin(t)) % 1440; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };
export const countdownMin = (t) => Math.max(0, 25 - MIN_JE_S * t);           // 0:25 → 0:00 in 2,5 s
export const countdownText = (t) => { const m2 = Math.ceil(countdownMin(t) - 1e-9); return `0:${String(m2).padStart(2, "0")}`; };
export const laufzeitH = 150e6 / (17.6 * 3600) ;                             // km/s, nur zur Kontrolle: ≈ 2.367
export const pegel = (t) => 0.55 + 0.4 * Math.sin((2 * Math.PI * t) / 72 - 1.2);   // Gezeiten im Zeitraffer (12 h = 72 s)
