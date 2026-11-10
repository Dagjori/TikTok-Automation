// Video-Rechnung „Was wäre, wenn der Erdkern abkühlt?“ (stelldirvor, 11.11.2026 abend, Skript acc2-2026-11-11-abend).
// Quellen (F, Skript): Magnetfeld Mitteleuropa 49 µT (PTB 2024: 49,68), Südatlantik-Anomalie Minimum 22 µT (ESA 2020),
// Laschamp-Exkursion ca. 41.000 Jahre her: Feld 4–10 % von heute, Beryllium-10-Bildung im Mittel ×2 (Panovska 2024), → Modell 10 % = 4,9 µT.
// Schutzschild (Magnetopause, tagseitig): r = 10 Erdradien · (B/B0)^(1/3) (S, Druckgleichgewicht). Zeitraffer: Modell, real Milliarden Jahre, auf ca. 55 s gestaucht.
export const T_EREIGNIS = 2.5, T_STUFE2 = 20, T_STUFE3 = 34, T_STUFE4 = 48, T_HIER = 58, T_ENDE = 70;
export const B0 = 49, B_SUEDATLANTIK = 22, ANTEIL_LASCHAMP = 0.1, R0 = 10;
export const B_LASCHAMP = B0 * ANTEIL_LASCHAMP;                       // 4,9 µT
export const R_LASCHAMP = R0 * Math.cbrt(ANTEIL_LASCHAMP);            // 4,64 → „4,6“
export const R_ENDE = 1.5, B_ENDE = B0 * (R_ENDE / R0) ** 3;          // 0,165 → „0,17“ µT
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (u) => { u = cl(u); return u * u * (3 - 2 * u); };          // weiche Stufe
const lin = (t, a, b) => cl((t - a) / (b - a));
const aus3 = (u) => 1 - (1 - cl(u)) ** 3;                              // schnell fallend, läuft aus

// Schutzschild-Abstand in Erdradien aus dem Feld
export const radius = (b) => R0 * Math.cbrt(b / B0);
// Schutzschild-Verlauf 34–48 s (4,64 → 1,5), glatter Abstieg
export const rSchild = (t) => R_LASCHAMP + (R_ENDE - R_LASCHAMP) * sm(lin(t, T_STUFE3, T_STUFE4));

/** Magnetfeld in µT je Sekunde t (49 → 22 → 4,9 → 0,165 → 0) */
export function feld(t) {
  if (t <= T_EREIGNIS) return B0;
  if (t < T_STUFE2) return B0 - (B0 - B_SUEDATLANTIK) * aus3(lin(t, T_EREIGNIS, 18.5));     // 22 ab 18,5 s
  if (t < T_STUFE3) return B_SUEDATLANTIK - (B_SUEDATLANTIK - B_LASCHAMP) * sm(lin(t, T_STUFE2, T_STUFE3));
  if (t < T_STUFE4) return B0 * (rSchild(t) / R0) ** 3;                                       // aus dem Schutzschild abgeleitet
  if (t < T_HIER) return B_ENDE * (1 - lin(t, T_STUFE4, T_HIER));
  return 0;
}
/** Beryllium-10-Bildung relativ zu heute: ×1,0 (20 s) → ×2,0 (ab 29,5 s) */
export const beryllium = (t) => 1 + sm(lin(t, T_STUFE2, 29.5));
/** Feldanteil 0..1 (für Welt und Ton) */
export const anteil = (t) => feld(t) / B0;
export const countdown = (t) => Math.max(0, T_EREIGNIS - t);

const de = (x, nk) => x.toFixed(nk).replace(".", ",");
export const zahlDE = de;
/** Anzeige je Sekunde t: { etikett, zahl, einheit, unter, wert } (Zahlenformat deutsch) */
export function anzeige(t) {
  if (t < T_EREIGNIS) return { etikett: "MODELLSTART IN", zahl: de(countdown(t), 1), einheit: "s", unter: "KERN FLÜSSIG", wert: countdown(t) };
  if (t < T_STUFE2) return { etikett: "MAGNETFELD", zahl: de(feld(t), 1), einheit: "µT", unter: "KERN KÜHLT AB → WIE SÜDATLANTIK", wert: feld(t) };
  if (t < T_STUFE3) return { etikett: "BERYLLIUM-10-BILDUNG", zahl: "×" + de(beryllium(t), 1), einheit: "", unter: "FELD BEI 10 % → WIE LASCHAMP", wert: beryllium(t) };
  if (t < T_STUFE4) return { etikett: "SCHUTZSCHILD", zahl: de(rSchild(t), 1), einheit: "Erdradien", unter: "SCHILD SCHRUMPFT → ZUGVÖGEL IRREN", wert: rSchild(t) };
  if (t < T_HIER) return { etikett: "MAGNETFELD", zahl: de(feld(t), 2), einheit: "µT", unter: "DYNAMO STOCKT", wert: feld(t) };
  if (t < 62) return { etikett: "MAGNETFELD", zahl: "HIER", einheit: "", unter: "SCHILD WEG", wert: 0 };
  return { etikett: "MAGNETFELD", zahl: "0", einheit: "µT", unter: "SONNENWIND DIREKT", wert: 0 };
}
