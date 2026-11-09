// Account 2 „Was wäre, wenn du die Polarnacht in Tromsø erlebst?“ (Skript acc2-2026-11-10-abend)
// Rechnung nach dem Rechenweg des Skripts: NOAA-Sonnenalgorithmus (Solar Calculator, NOAA GML) für Tromsø 69,6492° N, 18,9553° O, MEZ (UTC+1),
// Sonnenauf-/-untergang bei −0,833° (Refraktion + Sonnenrand), Zeitachse: Tag n (0 = 29.10.2026) liegt bei t = 2,5 + 2·n s (Zeitraffer 1 Tag ≈ 2 s).
// Dieselbe Funktion tau(t) liefert Bild (Sonnenstand, Licht), Anzeige (Tageslänge, Datum, Countdown in Tagen) und Prüfung.
export const LAT = 69.6492, LON = 18.9553, R_AUF = -0.833;
export const T_EREIGNIS = 2.5, T_HIER = 60.5, T_SCHNITT = 62, T_SONNE_DA = 60.0;     // Countdown-Null (Testblock a), „HIER“, harter Schnitt, letzter Sonnenrand
const START_UTC = Date.UTC(2026, 9, 29, 0, 0) - 3600e3;                             // 29.10.2026 00:00 MEZ
const rad = (x) => (x * Math.PI) / 180, deg = (x) => (x * 180) / Math.PI;

/** Sonne bei τ Stunden nach dem 29.10.2026 00:00 MEZ: wahre Höhe, scheinbare Höhe (mit Refraktion), Azimut von Süden über Westen, Deklination, Stundenwinkel (alles Grad) */
export function sonne(tauH) {
  const d = new Date(START_UTC + tauH * 3600e3);
  const jd = d.getTime() / 86400000 + 2440587.5, T = (jd - 2451545) / 36525;
  const L0 = (280.46646 + T * (36000.76983 + 0.0003032 * T)) % 360, M = 357.52911 + T * (35999.05029 - 0.0001537 * T), e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(rad(M)) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * T) + Math.sin(rad(3 * M)) * 0.000289;
  const lam = L0 + C - 0.00569 - 0.00478 * Math.sin(rad(125.04 - 1934.136 * T));
  const eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(rad(125.04 - 1934.136 * T));
  const dec = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lam))));
  const y = Math.tan(rad(eps / 2)) ** 2;
  const eq = 4 * deg(y * Math.sin(2 * rad(L0)) - 2 * e * Math.sin(rad(M)) + 4 * e * y * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) - 0.5 * y * y * Math.sin(4 * rad(L0)) - 1.25 * e * e * Math.sin(2 * rad(M)));
  const min = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60 + d.getUTCMilliseconds() / 60000;
  const tst = (((min + eq + 4 * LON) % 1440) + 1440) % 1440, ha = tst / 4 - 180;
  const sz = Math.sin(rad(LAT)) * Math.sin(rad(dec)) + Math.cos(rad(LAT)) * Math.cos(rad(dec)) * Math.cos(rad(ha));
  const alt = 90 - deg(Math.acos(Math.max(-1, Math.min(1, sz))));
  const az = deg(Math.atan2(Math.sin(rad(ha)), Math.cos(rad(ha)) * Math.sin(rad(LAT)) - Math.tan(rad(dec)) * Math.cos(rad(LAT))));
  // Refraktion nach Sæmundsson (Bogenminuten), unter −1,9° ausgeblendet; die Mitte der Sonne steht bei „Sonnenaufgang“ (−0,833°) scheinbar bei −0,27° (Oberrand am Horizont)
  const hh = Math.max(alt, -1.9), ref = (1.02 / Math.tan(rad(hh + 10.3 / (hh + 5.11)))) / 60 * (alt < -1.9 ? Math.max(0, 1 + (alt + 1.9) / 4) : 1);
  return { alt, scheinbar: alt + ref, az, dekl: dec, ha };
}

// ---------------------------------------------------------------------------------------------------- Tageswerte (Minutenraster wie die Python-Rechnung)
const cache = new Map();
/** Tag n (0 = 29.10.2026): Aufgang/Untergang in Minuten ab 0:00 MEZ (null in der Polarnacht), Länge in Minuten, höchste Sonnenhöhe (wahr, Grad) */
export function tag(n) {
  if (cache.has(n)) return cache.get(n);
  let a = -1, b = -1, hoch = -90;
  for (let m = 0; m < 1440; m++) { const al = sonne(n * 24 + m / 60).alt; if (al > R_AUF) { if (a < 0) a = m; b = m + 1; } }
  for (let m = 540; m < 840; m += 4) hoch = Math.max(hoch, sonne(n * 24 + m / 60).alt);
  const r = a < 0 ? { auf: null, unter: null, laenge: 0, hoch } : { auf: a, unter: b, laenge: b - a, hoch };
  cache.set(n, r); return r;
}
export const hm = (min) => `${Math.floor(min / 60)}:${String(Math.round(min) % 60).padStart(2, "0")}`;
export const TAG_LETZTE = 29;                                  // 27.11.2026 (letzte Sonne), 30 = 28.11. (erster Tag ohne Sonne)
export const datum = (n) => { const d = new Date(Date.UTC(2026, 9, 29 + Math.floor(n))); return { tag: d.getUTCDate(), monat: d.getUTCMonth() + 1 }; };
const MONATE = ["JANUAR", "FEBRUAR", "MÄRZ", "APRIL", "MAI", "JUNI", "JULI", "AUGUST", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DEZEMBER"];
export const datumText = (n) => { const d = datum(n); return `${d.tag}. ${MONATE[d.monat - 1]}`; };

// ---------------------------------------------------------------------------------------------------- Zeitachse t → τ (Stunden nach 29.10. 00:00 MEZ)
const TAU_UNTER0 = tag(0).unter / 60;                          // Sonnenuntergang 29.10. (14:59)
const TAU_AUF_LETZT = TAG_LETZTE * 24 + tag(TAG_LETZTE).auf / 60;   // letzter Sonnenaufgang 27.11. (11:21)
const TAU_UNTER_LETZT = TAG_LETZTE * 24 + tag(TAG_LETZTE).unter / 60; // letzter Sonnenuntergang 27.11. (11:43)
const T_BREMS = 57, TAU_RATE = 12;                             // 12 Std. je Sekunde = 1 Tag je 2 s
export const TAU_POLARNACHT = (TAG_LETZTE + 1) * 24 + 12;      // 28.11. 12:00 (nach dem Schnitt bei 62 s)
const TAU_BREMS = TAU_UNTER0 + TAU_RATE * (T_BREMS - T_EREIGNIS);
const RATE_ENDE = (TAU_UNTER_LETZT - TAU_AUF_LETZT) / (T_HIER - T_SONNE_DA);   // Sonne 22 Min. sichtbar in 0,5 s
export function tau(t) {
  if (t < T_EREIGNIS) return TAU_UNTER0 - ((T_EREIGNIS - t) * 120) / 3600;     // 1 s = 2 Min., Oberrand der Sonne erreicht den Horizont bei 2,5 s
  if (t < T_BREMS) return TAU_UNTER0 + TAU_RATE * (t - T_EREIGNIS);
  if (t < T_SONNE_DA) {                                                          // weich bremsen (Hermite), Ende: Sonnenaufgang 27.11. 11:21
    const w = T_SONNE_DA - T_BREMS, u = (t - T_BREMS) / w, p0 = TAU_BREMS, p1 = TAU_AUF_LETZT, m0 = TAU_RATE * w, m1 = RATE_ENDE * w;
    return (2 * u ** 3 - 3 * u ** 2 + 1) * p0 + (u ** 3 - 2 * u ** 2 + u) * m0 + (-2 * u ** 3 + 3 * u ** 2) * p1 + (u ** 3 - u ** 2) * m1;
  }
  if (t < T_SCHNITT) return TAU_AUF_LETZT + RATE_ENDE * (t - T_SONNE_DA);       // letzter Sonnenrand 11:21–11:43, danach ruhig
  return TAU_POLARNACHT + (t - T_SCHNITT) * 1;                                   // ab 62 s: 1 s ≈ 1 Std. (Mittagsdämmerung, dann Nacht)
}
export const tagIndex = (t) => Math.floor(tau(t) / 24 + 1e-9);
export const sonneBei = (t) => sonne(tau(t));

// ---------------------------------------------------------------------------------------------------- Anzeige
export const countdownText = (t) => { const s = Math.max(0, Math.ceil(T_EREIGNIS - t - 0.5 - 1e-9)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
/** Tageslänge in Minuten, stetig zwischen den Tageswerten: Tag n liegt bei x = n, x = (τ − τ_Start)/24 (n = (t − 2,5)/2 im Zeitraffer 1 Tag = 2 s) */
export function tageslaengeMin(t) {
  const x = Math.max(0, (tau(t) - TAU_UNTER0) / 24), n = Math.min(Math.floor(x), TAG_LETZTE), f = Math.min(1, x - n);
  return tag(n).laenge * (1 - f) + tag(Math.min(n + 1, TAG_LETZTE)).laenge * f;
}
export const tageslaengeText = (t) => { const m = Math.max(0, Math.round(tageslaengeMin(t))); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };
/** Tage bis zum letzten Sonnenaufgang (27.11. 11:21), kontinuierlich; Anzeige = aufgerundet, ab dem Sonnenrand 0 */
export const tageBis = (t) => Math.max(0, (TAU_AUF_LETZT - tau(t)) / 24);
export const tageBisAnzeige = (t) => (t >= T_SONNE_DA ? 0 : Math.ceil(tageBis(t) - 1e-9));
/** Verlust je Tag in Minuten (Tag n gegen Tag n−1) */
export const verlustMin = (n) => tag(n - 1).laenge - tag(n).laenge;
export const mittagsHoehe = (t) => tag(Math.max(0, Math.min(tagIndex(t), TAG_LETZTE))).hoch;
export const POLARNACHT_TAGE = 48, ERSTE_SONNE = "15. JANUAR";
export const ZEITRAFFER = [
  { von: 0, bis: 2.5, faktor: "1 s = 2 Min. (Sonnenuntergang, Countdown)" },
  { von: 2.5, bis: 57, faktor: "1 Tag = 2 s (1 s = 12 Std.), 29.10. → 25.11." },
  { von: 57, bis: 62, faktor: "weich verlangsamt bis zum letzten Sonnenrand (27.11., 11:21–11:43)" },
  { von: 62, bis: 70, faktor: "1 s = 1 Std. (Polarnacht, 28.11.)" },
];
