// Account 2 „Was wäre, wenn im Orbit eine Trümmer-Kettenreaktion startet?“ (Skript acc2-2026-11-08-abend)
// Rechnung nach daten.skript.rechenweg:
//   Basis 68.450 Objekte > 10 cm (ESA DISCOS/MASTER-8, Referenz 02/2026); je Kollision + 2.300 (Annahme nach 2009: 1.668 + 628 = 2.296 erfasste Teile).
//   Kollisionen 1–8 bei 8 / 24,4 / 28,4 / 32,0 / 35,0 / 37,6 / 39,8 / 41,6 s (Abstände 4,0 → 1,8 s, „immer schneller“; Annahme).
//   Zeitraffer: 12–24 s = 1 Tag je Sekunde (12 Tage), 24–50 s = 1 Jahr je Sekunde (26 Jahre), danach 1 Jahr je Sekunde, ab 58 s Echtzeit.
export const BASIS = 68450;
export const JE_KOLLISION = 2300;
export const T_EREIGNIS = 8;
export const T_HIER = 60;
export const KOLL_ZEITEN = [8, 24.4, 28.4, 32.0, 35.0, 37.6, 39.8, 41.6];
export const ZEITRAFFER = [
  { von: 12, bis: 24, faktor: "1 s = 1 Tag" }, { von: 24, bis: 58, faktor: "1 s = 1 Jahr" },
];
const sm = (p) => { p = Math.min(1, Math.max(0, p)); return p * p * (3 - 2 * p); };

/** Anzahl Kollisionen bis Videosekunde t (0 vor dem Ereignis) */
export const kollisionen = (t) => KOLL_ZEITEN.filter((k) => t >= k).length;
/** Trümmer > 10 cm laut Anzeige in den Phasen 8–24 s und 50–58 s (andere Zeiten: nächster Wert der Phase) */
export function truemmer(t) {
  if (t < T_EREIGNIS) return BASIS;
  if (t < 50) { const p = Math.min(1, (t - 8) / 16); return Math.round(BASIS + JE_KOLLISION * (1 - (1 - p) * (1 - p))); }
  const p = (t - 50) / 8;
  return Math.round((BASIS + 7 * JE_KOLLISION) + JE_KOLLISION * sm(p));
}
export const NACH_7 = BASIS + 7 * JE_KOLLISION;           // 84.550
export const NACH_8 = BASIS + 8 * JE_KOLLISION;           // 86.850
export const ZUWACHS_PROZENT = Math.round(((NACH_8 / BASIS - 1) * 100) * 10) / 10;   // 26,9
/** Welt-Tage seit Videosekunde 12 (Phase 1 s = 1 Tag, danach Jahre) */
export function tageSeit(t) {
  if (t <= 12) return 0;
  if (t <= 24) return t - 12;
  if (t <= 58) return 12 + (t - 24) * 365.25;
  return 12 + 34 * 365.25;
}
/** Jahre-Zeitraffer 24–58 s */
export const jahreSeit = (t) => (t <= 24 ? 0 : Math.min(t, 58) - 24);
export function countdown(t) { const s = Math.max(0, T_EREIGNIS - t); return { s, text: `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, "0")}` }; }
/** Countdown ganzzahlig auf Sekunden, 0:00 genau bei 8 s */
export function countdownText(t) { const s = Math.max(0, Math.ceil(T_EREIGNIS - t - 1e-9)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
