// Account 2 „Was wäre, wenn unsere Luft 35 % Sauerstoff hätte?“ (Skript acc2-2026-11-08-mittag)
// Rechnung als Code nach daten.skript.rechenweg (alle Werte im Bild kommen von hier):
//   Phase 1 (0–8 s):   Countdown 0:08 → 0:00, Sauerstoff 20,9 % (heute 20,95 %, Anzeige eine Nachkommastelle)
//   Phase 2 (8–27 s):  O2(t) = 20,9 + (t − 8)/19 · 14,1 → 35,0 %; Zeitraffer 1 s = 5 Jahre (95 Jahre, Annahme)
//   27–30 s:           Echtzeit-Nachglühen, 35,0 %
//   Phase 3 (30–50 s): Spannweite S(t) = 11 + (t − 30)/20 · 59 cm → 70 cm; Zeitraffer 1 s = 100.000 Jahre (2 Mio. Jahre, Annahme)
//   Phase 4 (50–58 s): Abstand der Riesenlibelle 20 m → 0,5 m (Echtzeit), ab 58 s „HIER“
export const T_EREIGNIS = 8, T_O2_VOLL = 27, T_LIBELLE = 30, T_LIBELLE_VOLL = 50, T_ANFLUG = 50, T_HIER = 58, T_SCHNITT = 60;
export const O2_HEUTE = 20.9, O2_KARBON = 35.0;
export const SPANN_START = 11, SPANN_ENDE = 70;                 // Königslibelle 11 cm, Meganeura ca. 70 cm
export const ABSTAND_START = 20, ABSTAND_ENDE = 0.5;
export const JAHRE_PRO_S_O2 = 5, JAHRE_PRO_S_LIBELLE = 100000;

const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** Countdown in s bis zum Anstieg (8 → 0) */
export const countdown = (t) => Math.max(0, T_EREIGNIS - t);
/** Sauerstoffanteil der Luft in % bei Videozeit t */
export const sauerstoff = (t) => O2_HEUTE + clamp01((t - T_EREIGNIS) / (T_O2_VOLL - T_EREIGNIS)) * (O2_KARBON - O2_HEUTE);
/** Zeitpunkt (Videozeit), zu dem der Anteil den Wert p (%) erreicht */
export const zeitBeiO2 = (p) => T_EREIGNIS + ((p - O2_HEUTE) / (O2_KARBON - O2_HEUTE)) * (T_O2_VOLL - T_EREIGNIS);
/** Spannweite der Libellen in cm (11 → 70) */
export const spannweite = (t) => SPANN_START + clamp01((t - T_LIBELLE) / (T_LIBELLE_VOLL - T_LIBELLE)) * (SPANN_ENDE - SPANN_START);
/** Abstand der anfliegenden Riesenlibelle in m (20 → 0,5) */
export const abstand = (t) => ABSTAND_START - clamp01((t - T_ANFLUG) / (T_HIER - T_ANFLUG)) * (ABSTAND_START - ABSTAND_ENDE);
/** simulierte Jahre seit dem Anstieg (Phase 2: 5 J/s, Phase 3: 100.000 J/s, dazwischen und danach Echtzeit ≈ 0) */
export function jahre(t) {
  const p2 = Math.min(Math.max(t - T_EREIGNIS, 0), T_O2_VOLL - T_EREIGNIS) * JAHRE_PRO_S_O2;
  const p3 = Math.min(Math.max(t - T_LIBELLE, 0), T_LIBELLE_VOLL - T_LIBELLE) * JAHRE_PRO_S_LIBELLE;
  return p2 + p3;
}
export const RAFFER_O2_JAHRE = (T_O2_VOLL - T_EREIGNIS) * JAHRE_PRO_S_O2;                   // 95
export const RAFFER_LIBELLE_JAHRE = (T_LIBELLE_VOLL - T_LIBELLE) * JAHRE_PRO_S_LIBELLE;      // 2.000.000
export const FAKTOR_MEGANEURA = SPANN_ENDE / SPANN_START;                                     // 6,36

/** Spannungsstufen (Videozeit, Beschreibung) – Grundlage für Bewegungsplan, Licht und Ton */
export const STUFEN = [
  [8, "Anstieg beginnt (Countdown-Null)"], [12.4, "Gewitterfront zieht auf"], [16.2, "über 25 %: Brandgefahr"], [19.8, "Blitz schlägt in die Fichte"],
  [23.4, "Feuer im Unterholz"], [27, "35 % erreicht, Nacht mit Glut"], [31, "Zeitraffersprung: Farne treiben aus"], [35, "Libellen wachsen"],
  [50, "Anflug der Riesenlibelle"], [58, "HIER"], [60, "harter Schnitt in die Nahsicht"],
];
