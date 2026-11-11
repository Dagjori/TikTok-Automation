// Video-Rechnung „Was passiert, wenn du im Watt stehst und die Flut kommt?“ (stelldirvor, 13.11.2026 abend).
// Quelle (F, Skript acc2-2026-11-13-abend): WSV Pegelonline, Pegel Cuxhaven Steubenhöft, 09.11.2026 (NW 07:28 bei 352 cm, HW 13:03 bei 658 cm).
// Anstieg über Niedrigwasser: +10 cm nach 33 min, +50 cm nach 63 min, +100 cm nach 88 min. Zeitraffer 105,6-fach (1 s = 1,76 min), Kenterung bei 8 s.
export const T_EREIGNIS = 8, T_HIER = 58, T_ENDE = 70;
export const MIN_JE_S = 1.76;
// Anstieg über Niedrigwasser in cm je Videozeit (Stützpunkte aus der Rechnung; 58 s = 88 min ≈ +100 cm = Sandbank-Oberkante (Priel 121 cm))
const H = [[0, 0], [8, 0], [13, 1], [22.4, 12], [36, 28], [40, 38], [53.2, 84], [58, 101], [70, 143]];
// Steiggeschwindigkeit (cm/h) an den Messpunkten der Rechnung
const RATE = [[13, 9], [22.4, 32], [35.6, 83], [40, 96], [53.2, 122], [58, 124], [70, 124]];
function monoton(P) {
  const n = P.length, h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h[i] = P[i + 1][0] - P[i][0]; d[i] = (P[i + 1][1] - P[i][1]) / h[i]; }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return (t) => {
    if (t <= P[0][0]) return P[0][1]; if (t >= P[n - 1][0]) return P[n - 1][1];
    let i = 0; while (t > P[i + 1][0]) i++;
    const u = (t - P[i][0]) / h[i], u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * P[i][1] + (u3 - 2 * u2 + u) * h[i] * m[i] + (-2 * u3 + 3 * u2) * P[i + 1][1] + (u3 - u2) * h[i] * m[i + 1];
  };
}
const hf = monoton(H);
export const anstiegCm = (t) => hf(t);
export const rateCmH = (t) => { if (t <= 8) return 0; if (t <= RATE[0][0]) return RATE[0][1] * ((t - 8) / (RATE[0][0] - 8)); let i = 0; while (i < RATE.length - 2 && t > RATE[i + 1][0]) i++; const u = Math.min(1, (t - RATE[i][0]) / (RATE[i + 1][0] - RATE[i][0])); return RATE[i][1] + u * (RATE[i + 1][1] - RATE[i][1]); };
export const prielCm = (t) => 20 + anstiegCm(t);
export const minNachNw = (t) => Math.max(0, (t - T_EREIGNIS) * MIN_JE_S);
export const countdownMin = (t) => Math.max(0, 14.08 - (14.08 / 8) * t);        // 14:05 → 0:00 in 8 s
export const countdownText = (t) => { const s = Math.ceil(countdownMin(t) * 60 - 1e-6); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
export const sandbankCm = 100;
export const wasserAnFuessen = (t) => Math.min(1, anstiegCm(t) / sandbankCm);
export const uhrzeitMez = (t) => { const m = 15 * 60 - 14 + (t <= 8 ? (t / 8) * 14 : 14 + minNachNw(t)); const x = Math.floor(m); return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };
export const sonnenuntergangMez = "16:27";
