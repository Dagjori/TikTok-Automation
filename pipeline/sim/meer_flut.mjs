// Account 2 „Was wäre, wenn ein ausgetrocknetes Meer plötzlich wieder vollläuft?“ (Skript acc2-2026-11-07-mittag)
// Rechnung als Code nach daten.skript.rechenweg (Modellprofil nach Garcia-Castellanos et al. 2009, Annahme A):
// Anstieg r(d) wächst linear 0 → 11 m/Tag (Tag 0–200: 1.100 m), 11 m/Tag konstant (Tag 200–220: 220 m),
// dann linear 11 → 0 über D = 2·180/11 = 32,7 Tage (180 m). Summe 1.500 m in 252,7 Tagen (≈ 8,3 Monate).
// Zeitraffer: 0–8 s Echtzeit (Countdown, vor dem Durchbruch), 8–16 s 1 s = 1 h, 16–20 s weich auf F, 20–60 s F Tage/s.
export const START_M = -1500, SPITZE = 11, T_EREIGNIS = 8, T_HIER = 60;
export const D1 = 200, D2 = 20, D3 = (2 * 180) / SPITZE;           // Tage der drei Abschnitte
export const DAUER_TAGE = D1 + D2 + D3;                             // 252,727
// F aus: 8/24 + 2·(1/24 + F) + 40·F = DAUER  (die 2 s = Mittelwert der Rampe 1/24 → F über 4 s)
export const TAGE_PRO_S = (DAUER_TAGE - 8 / 24 - 2 / 24) / 42;       // 6,007

/** Tage seit Durchbruch bei Videozeit t (Sekunden) */
export function tag(t) {
  if (t <= T_EREIGNIS) return 0;
  if (t <= 16) return (t - 8) / 24;
  if (t <= 20) { const u = t - 16, r0 = 1 / 24; return 8 / 24 + r0 * u + ((TAGE_PRO_S - r0) * u * u) / 8; }
  return Math.min(DAUER_TAGE, 8 / 24 + 4 / 24 + (TAGE_PRO_S - 1 / 24) * 2 + (t - 20) * TAGE_PRO_S);
}
/** Anstieg in m/Tag bei Tag d */
export function rate(d) {
  if (d <= D1) return (SPITZE * d) / D1;
  if (d <= D1 + D2) return SPITZE;
  if (d <= DAUER_TAGE) return SPITZE * (1 - (d - D1 - D2) / D3);
  return 0;
}
/** Wasserstand in m zum Meeresspiegel bei Tag d (−1.500 … 0) */
export function pegelTag(d) {
  if (d <= 0) return START_M;
  if (d <= D1) return START_M + (SPITZE * d * d) / (2 * D1);
  if (d <= D1 + D2) return START_M + (SPITZE * D1) / 2 + SPITZE * (d - D1);
  const s = Math.min(d - D1 - D2, D3);
  return START_M + (SPITZE * D1) / 2 + SPITZE * D2 + SPITZE * (s - (s * s) / (2 * D3));
}
export const pegel = (t) => pegelTag(tag(t));
export const rateBei = (t) => rate(tag(t));
/** Meter bis zum Fels (Abstand des Wasserstands zu 0) */
export const bisFels = (t) => -pegel(t);
/** Stunden seit Durchbruch (nur 8–17 s angezeigt) */
export const stunden = (t) => tag(t) * 24;
/** Countdown in s bis zum Durchbruch (8 → 0) */
export const countdown = (t) => Math.max(0, T_EREIGNIS - t);
export const STAENDE = [25, 33, 41, 45, 50.5, 52, 55, 58, 60];
