// Video-Rechnung „Was passiert auf einer Hallig, wenn der Luftdruck rapide fällt?“ (stelldirvor, 13.11.2026 mittag).
// Quelle (F, Skript acc2-2026-11-13-mittag): DWD-Stundenwerte Luftdruck und Böen Station List/Sylt, 18.01.2007 (Orkan Kyrill), UTC.
// Zeitraffer: 0–8 s = 08–09 UTC (450-fach), ab 8 s UTC = 9 + (t−8)·576/3600 h (58 s = 17 UTC). Meer gehoben ≈ 1 cm je hPa unter 1013,25 (A/S).
export const T_EREIGNIS = 8, T_HIER = 58, T_ENDE = 70;
export const NORMAL = 1013.25;
const DRUCK = [[8, 987.3], [9, 985.2], [10, 982.3], [11, 978.0], [12, 973.9], [13, 969.9], [14, 967.0], [15, 966.1], [16, 964.6], [17, 962.3], [18, 965.2], [19, 972.2]];
const BOEN = [[9, 61], [10, 61], [13, 43], [14, 83], [15, 97], [16, 101], [17, 130], [18, 120], [19, 100]]; // km/h, Stundenmaxima (09–10: 17 m/s)
const lin = (T, h) => { if (h <= T[0][0]) return T[0][1]; if (h >= T[T.length - 1][0]) return T[T.length - 1][1]; let i = 0; while (h > T[i + 1][0]) i++; const u = (h - T[i][0]) / (T[i + 1][0] - T[i][0]); return T[i][1] + u * (T[i + 1][1] - T[i][1]); };
export const utcH = (t) => (t <= 8 ? 8 + t / 8 : 9 + ((t - 8) * 576) / 3600);
export const druck = (t) => lin(DRUCK, utcH(t));
export const meerCm = (t) => Math.max(0, NORMAL - druck(t));
export const boe = (t) => lin(BOEN, utcH(t));
export const countdownMin = (t) => Math.max(0, 60 - 7.5 * t);   // 60:00 → 0:00 in 8 s
export const countdownText = (t) => { const s = Math.ceil(countdownMin(t) * 60 - 1e-6); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
export const uhrzeitMez = (t) => { const m = Math.floor(utcH(t) * 60) + 60; return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
export const fallrateHpaProH = (h1, h2) => (lin(DRUCK, h1) - lin(DRUCK, h2)) / (h2 - h1);
export const sonnenuntergangVideoS = 8 + ((15.5667 - 9) * 3600) / 576;   // 15:34 UTC → ca. 49,1 s
export const de = (x, nk = 1) => x.toFixed(nk).replace(".", ",");
