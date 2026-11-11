// Video-Rechnung „Was passiert, wenn ein Blitz dein Flugzeug trifft, in Zeitlupe vom Fensterplatz?“ (stelldirvor, Skript acc2-2026-11-12-abend).
// Quellen (F, Skript): Lightning Direct Effects Handbook Rev. A (NIAR/AGATE 2016) Tab. 2-2: typischer negativer Erdblitz, erster Schlag Median 30 kA,
// Anstieg 5,5 µs, 3–4 Teilschläge im Abstand 35 ms, Dauer 0,2 s; „swept flash“: der Kanal steht in der Luft, das Flugzeug fliegt hindurch (ca. 250 kt ≈ 130 m/s, A).
// Alle Anzeigewerte, Zeitlupenfaktoren und Zeitpunkte der Szene kommen aus dieser Datei.
export const T_EREIGNIS = 8, T_MS0 = 13, T_MS1 = 48, T_STRECKE_ENDE = 58, T_HIER = 58, T_ECHTZEIT = 62, T_ENDE = 70;
export const SPITZENSTROM_A = 30000, ANSTIEG_US = 5.5, SCHLAEGE_MS = [0, 35, 70, 105], BLITZDAUER_MS = 200, TEILSCHLAG_ABSTAND_MS = 35;
export const GESCHWINDIGKEIT_M_S = 130;               // 250 kt = 128,6 m/s, gerundet (A)
export const MS_BIS_T1 = 160;                         // 13–48 s zeigen 0 … 160 ms
export const ZEITLUPE_US = (T_MS0 - T_EREIGNIS) / (ANSTIEG_US * 1e-6);             // 5 s Video für 5,5 µs ≈ 909.091
export const ZEITLUPE_MS = (T_MS1 - T_MS0) / (MS_BIS_T1 / 1000);                  // 35 s für 160 ms ≈ 219
export const ZEITLUPE_ENDE = (T_STRECKE_ENDE - T_MS1) / ((BLITZDAUER_MS - MS_BIS_T1) / 1000);  // 10 s für 40 ms = 250
export const FLUGSTUNDEN_JE_TREFFER = { faa_usa: 3000, onera: 1000 };               // Quellen uneinig → im Video nur „etwa einmal pro Jahr“
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (u) => u * u * (3 - 2 * u);
const dez = (x, nk = 0) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: nk, maximumFractionDigits: nk }).format(x);

/** Millisekunden seit Einschlag zur Videozeit t (−1 vor dem Einschlag) */
export function msBei(t) {
  if (t < T_EREIGNIS) return -1;
  if (t < T_MS0) return (ANSTIEG_US * 1e-3 * (t - T_EREIGNIS)) / (T_MS0 - T_EREIGNIS);
  if (t < T_MS1) return ((t - T_MS0) / (T_MS1 - T_MS0)) * MS_BIS_T1;
  if (t < T_ECHTZEIT) return MS_BIS_T1 + ((t - T_MS1) / (T_STRECKE_ENDE - T_MS1)) * (BLITZDAUER_MS - MS_BIS_T1);   // 48–58: 160 → 200 ms, dann weiter im Takt 1:250
  return BLITZDAUER_MS + (t - T_ECHTZEIT) * 1000 + ((T_ECHTZEIT - T_STRECKE_ENDE) * 1000) / ZEITLUPE_ENDE;
}
/** Videozeit, zu der ms Millisekunden nach dem Einschlag erreicht sind (13–48 s) */
export const videoZeitBeiMs = (ms) => T_MS0 + (ms / MS_BIS_T1) * (T_MS1 - T_MS0);
/** Zeitlupenfaktor (Videosekunden je echte Sekunde) – Kehrwert ist „tempo“ der Welt */
export function zeitlupe(t) { if (t < T_EREIGNIS) return 1; if (t < T_MS0) return ZEITLUPE_US; if (t < T_MS1) return ZEITLUPE_MS; if (t < T_ECHTZEIT) return ZEITLUPE_ENDE; return 1; }
/** Zeit der Außenwelt in echten Sekunden (Wolken, Regen): läuft bis zum Einschlag in Echtzeit, danach mit ms */
export function flugzeit(t) { const ms = msBei(t); return t < T_EREIGNIS ? t : T_EREIGNIS + Math.max(0, ms) / 1000; }
/** Strecke in m, die das Flugzeug seit dem Einschlag zurückgelegt hat (= Wanderstrecke des Kanals am Rumpf) */
export const strecke = (ms) => (GESCHWINDIGKEIT_M_S * Math.max(0, ms)) / 1000;
/** Spitzenstrom-Anzeige 8–13 s: 0 → 30.000 A in 5,5 µs (Anstieg als weiche Kurve) */
export const strom = (t) => SPITZENSTROM_A * smooth(cl((t - T_EREIGNIS) / (T_MS0 - T_EREIGNIS)));
/** Zeitpunkte der Teilschläge in Videosekunden */
export const schlagZeit = (k) => videoZeitBeiMs(SCHLAEGE_MS[k]);
export const stufenAktiv = (t) => SCHLAEGE_MS.filter((ms, k) => t >= schlagZeit(k) - 1e-9 && t >= T_MS0).length;

export function anzeige(t) {
  if (t < T_EREIGNIS) return { etikett: "EINSCHLAG IN", zahl: dez(Math.max(0, Math.ceil(T_EREIGNIS - t - 1e-6))), einheit: "s", unter: t < 6 ? "STEIGFLUG" : "IN DER WOLKE", wert: T_EREIGNIS - t };
  if (t < T_MS0) return { etikett: "SPITZENSTROM", zahl: dez(Math.round(strom(t) / 10) * 10), einheit: "A", unter: "ERSTER SCHLAG", wert: strom(t) };
  if (t < T_MS1) {
    const ms = msBei(t), n = stufenAktiv(t);
    const unter = n <= 1 ? "ZEITLUPE" : n === 2 ? "SCHLAG 2 · 35 MS" : n === 3 ? "SCHLAG 3 · 70 MS" : "SCHLAG 4 · KANAL WANDERT";
    return { etikett: "ZEIT SEIT EINSCHLAG", zahl: dez(Math.round(ms)), einheit: "ms", unter, wert: ms };
  }
  if (t < T_HIER) { const s = strecke(msBei(t)); return { etikett: "STRECKE DURCH DEN BLITZ", zahl: dez(Math.round(s)), einheit: "m", unter: t < 54.5 ? "KANAL WANDERT" : "AM HECK", wert: s }; }
  return { etikett: "HIER", zahl: "HIER", einheit: "", unter: t < T_ECHTZEIT ? "26 M · KANAL REISST AB" : "ECHTZEIT", wert: 0 };
}
