// Rechnung „Deutschlandticket: 2023 oder 2027, wer arbeitet länger dafür?“ (Simulierbar, 13.11.2026 abend).
// Arbeitszeit = Monatspreis ÷ gesetzlicher Mindestlohn je Stunde (brutto). Jahreswerte jeweils zum 1. Januar (Mai 2023 = Start).
export const JAHRE = [
  { jahr: 2023, preis: 49.0, lohn: 12.0 },
  { jahr: 2024, preis: 49.0, lohn: 12.41 },
  { jahr: 2025, preis: 58.0, lohn: 12.82 },
  { jahr: 2026, preis: 63.0, lohn: 13.9 },
  { jahr: 2027, preis: 66.8, lohn: 14.6 },
];
export const minuten = (j) => (j.preis / j.lohn) * 60;
const r2 = (x) => Math.round(x * 100) / 100;
export function videoZahlen() {
  const m = JAHRE.map(minuten);
  const jobEigen = 66.8 * 0.95 - 66.8 * 0.25;              // Jobticket 5 % billiger, Arbeitgeber mind. 25 % des Preises
  const diffMin = m[4] - m[0];
  return {
    min: m, min2023: m[0], min2024: m[1], min2025: m[2], min2026: m[3], min2027: m[4],
    diffMin, diffJahrStd: (diffMin * 12) / 60, diffJahrEuro: r2(((diffMin * 12) / 60) * 14.6),
    gleichwertPreis: r2((m[0] / 60) * 14.6), preisPlus: r2((66.8 / 49 - 1) * 100), lohnPlus: r2((14.6 / 12 - 1) * 100),
    preisPlusJan: r2((66.8 / 63 - 1) * 100), lohnPlusJan: r2((14.6 / 13.9 - 1) * 100),
    jobTicket: r2(66.8 * 0.95), jobEigen: r2(jobEigen), jobMin: (jobEigen / 14.6) * 60,
  };
}
export const fmtStdMin = (min) => { const m = Math.round(min); return `${Math.floor(m / 60)} Std. ${m % 60} Min.`; };
