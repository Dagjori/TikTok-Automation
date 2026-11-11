// Video-Rechnung „Was passiert in deinem Dorf, wenn die Netzfrequenz unter 50 Hertz fällt?“ (stelldirvor, Skript acc2-2026-11-12-mittag).
// Quellen (F, Skript): UFLA-Reporting 2023 gemäß VDE-AR-N 4142 der vier deutschen ÜNB (Regelbereich 50 Hz ± 200 mHz → Reserve ab 49,80 Hz;
// Lastabwurf in 10 Stufen 49,0 … 48,1 Hz, Abwurfleistung 2023 je Stufe in % der Gesamtlast, Summe laut Bericht 41,6 %; Trennung der Erzeuger bei 47,5 Hz),
// Iberische Halbinsel 28.04.2025: 48,0 Hz um 12:33:21, Kollaps 12:33:24 (ENTSO-E-Chronologie). Zeitlupe ca. 1:8 (Modell, Iberien ca. 6 s → ca. 58 s).
// Alle Anzeigewerte (Frequenz, Last, Countdown, Stufe) kommen aus dieser Datei; die Szene liest nur sie.
export const T_EREIGNIS = 2.5, T_RESERVE = 12, T_STUFE0 = 21, T_STUFE1 = 28.2, T_STUFE9 = 46.5, T_LAST_ENDE = 48, T_HIER = 58, T_ENDE = 70;
export const SOLL_HZ = 50, RESERVE_HZ = 49.8, TRENNUNG_HZ = 47.5;
export const STUFEN = 10;
export const STUFE_HZ = Array.from({ length: STUFEN }, (_, i) => +(49.0 - 0.1 * i).toFixed(1));             // 49,0 … 48,1
export const ABWURF_PROZENT = [6.4, 4.0, 4.2, 3.9, 3.9, 3.6, 4.2, 3.6, 3.6, 4.3];                        // 2023, % der Gesamtlast je Stufe
export const BERICHT_SUMME = 41.6;                                                                      // Summe laut Bericht (Einzelwerte gerundet: 41,7)
export const KUM = (() => { let s = 0; const k = ABWURF_PROZENT.map((p) => +(s += p).toFixed(1)); k[STUFEN - 1] = BERICHT_SUMME; return k; })();   // 6,4 … 41,6
// Stufe 1 bei 21 s (Satz „Neubaugebiet wird dunkel“), Stufe 2 bei 28,2 s (nach dem Satz zu den 6,4 %), dann gleichmäßig bis Stufe 10 bei 46,5 s (Satz „41,6 Prozent“)
export const stufeZeit = (i) => (i === 0 ? T_STUFE0 : T_STUFE1 + ((T_STUFE9 - T_STUFE1) * (i - 1)) / (STUFEN - 2));
export const ABSTAND_HZ = +(SOLL_HZ - TRENNUNG_HZ).toFixed(1);                                            // 2,5
export const IBERIEN = { hz: 48.0, sekunden_bis_kollaps: 3, datum: "28.04.2025" };

const smooth = (u) => u * u * (3 - 2 * u), cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
function hermite(p0, p1, m0, m1, u, w) { const u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 * w + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1 * w; }
/** Netzfrequenz in Hz, stetig und monoton fallend (Modell, Zeitlupe 1:8): 50,00 → 49,80 (12 s) → 49,00 (21 s) → 48,10 (47,1 s, jede Stufe bremst) → 47,50 (58 s) */
export function frequenz(t) {
  if (t <= T_EREIGNIS) return SOLL_HZ;
  if (t < T_RESERVE) return hermite(50, 49.8, 0, -0.03, (t - T_EREIGNIS) / (T_RESERVE - T_EREIGNIS), T_RESERVE - T_EREIGNIS);
  if (t < T_STUFE0) return hermite(49.8, 49.0, -0.03, -0.06, (t - T_RESERVE) / (T_STUFE0 - T_RESERVE), T_STUFE0 - T_RESERVE);
  if (t < stufeZeit(STUFEN - 1)) { let i = 0; while (i < STUFEN - 2 && t >= stufeZeit(i + 1)) i++; const u = (t - stufeZeit(i)) / (stufeZeit(i + 1) - stufeZeit(i)); return STUFE_HZ[i] + (STUFE_HZ[i + 1] - STUFE_HZ[i]) * u; }
  if (t < T_LAST_ENDE) return 48.1;
  if (t < T_HIER) return hermite(48.1, TRENNUNG_HZ, -0.01, -0.12, (t - T_LAST_ENDE) / (T_HIER - T_LAST_ENDE), T_HIER - T_LAST_ENDE);
  return TRENNUNG_HZ;
}
/** Zahl der bereits ausgelösten Stufen bei t (0 … 10) */
export const stufenAktiv = (t) => { let n = 0; for (let i = 0; i < STUFEN; i++) if (t >= stufeZeit(i) - 1e-9) n++; return n; };
/** abgeschaltete Last in %, Hochzählen über 0,6 s je Stufe (Stufe 1 steht sofort bei 6,4) */
export function lastProzent(t) {
  const n = stufenAktiv(t);
  if (n === 0) return 0;
  const i = n - 1, ziel = KUM[i];
  if (i === 0) return ziel;
  const u = cl((t - stufeZeit(i)) / 0.6);
  return KUM[i - 1] + (ziel - KUM[i - 1]) * smooth(u);
}
const dez = (x, nk) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: nk, maximumFractionDigits: nk }).format(x);
const hzText = (x) => dez(x, 2);
export const countdownText = (t) => dez(Math.max(0, T_EREIGNIS - t), 1);
const stufenText = (i) => `STUFE ${i + 1} · ${dez(STUFE_HZ[i], 1)} HZ`;
/** Anzeige für LunarHUD: { etikett, zahl, einheit, unter, wert } */
export function anzeige(t) {
  if (t < T_EREIGNIS) return { etikett: "KRAFTWERKSAUSFALL IN", zahl: countdownText(t), einheit: "s", unter: "NORMALBETRIEB", wert: T_EREIGNIS - t };
  if (t < T_STUFE0) {
    const unter = t < T_RESERVE ? "KRAFTWERK AUS" : t < 16.5 ? "REGELRESERVE (AB 49,80)" : "RESERVE REICHT NICHT";
    return { etikett: "NETZFREQUENZ", zahl: hzText(frequenz(t)), einheit: "Hz", unter, wert: frequenz(t) };
  }
  if (t < T_LAST_ENDE) {
    const n = stufenAktiv(t);
    return { etikett: "ABGESCHALTETE LAST", zahl: dez(lastProzent(t), 1), einheit: "%", unter: stufenText(n - 1), wert: lastProzent(t) };
  }
  if (t < T_HIER) return { etikett: "NETZFREQUENZ", zahl: hzText(frequenz(t)), einheit: "Hz", unter: t < 53 ? "ALLE STUFEN AUS" : "KRAFTWERKE TRENNEN SICH GLEICH", wert: frequenz(t) };
  return { etikett: "HIER", zahl: "HIER", einheit: "", unter: t < 62 ? "47,50 HZ · NETZZUSAMMENBRUCH" : "NETZAUFBAU: STUNDEN", wert: 0 };
}
/** Zeitlupenfaktor laut Skript: ca. 7 s Echtzeit auf ca. 58 s gedehnt */
export const ZEITLUPE = (T_HIER - T_EREIGNIS) / 7;
