// Account 2: „Was wäre, wenn der Mond nur halb so weit von der Erde entfernt wäre?“ (03.11.2026 abend)
// Quellen (F): NASA Moon Fact Sheet (Halbachse 384.400 km, siderische Umlaufzeit 27,3217 d); NOAA Tides Tutorial
// (Gezeitenkraft ∝ 1/r³); Mondlicht (reflektiertes Sonnenlicht) ∝ 1/r² (Physik, Sonne–Mond-Abstand gleich);
// Kepler III: T ∝ a^1,5. Mondlaser-Messung: Mond entfernt sich ca. 3,8 cm/Jahr (NASA GSFC Eclipse-Seite).
// Annahme (A): Mond rückt in ca. 5 Std. hypothetisch heran (0–52 s, Zeitraffer 1 s = 6 min); Wasserlinie Szenengeometrie.
export const D0 = 384400, T_SID = 27.3217;
export const faktor = (d) => D0 / d; // scheinbarer Durchmesser
export const gezeiten = (d) => faktor(d) ** 3;
export const helligkeit = (d) => faktor(d) ** 2;
export const umlauf = (d) => T_SID * (d / D0) ** 1.5;
// x(t) = 384.400 / d(t): 1 → 2 zwischen 0 und 52 s, quadratisch (langsam anlaufend), danach konstant
export const x = (t) => 1 + Math.min(t / 52, 1) ** 2;
export const d = (t) => D0 / x(t);
export function anzeige(t) {
  if (t < 22) return { etikett: "ENTFERNUNG ZUM MOND", wert: Math.round(d(t)), einheit: "km" };
  if (t < 38) return { etikett: "MOND AM HIMMEL", wert: x(t), einheit: "× SO GROSS" };
  if (t < 52) return { etikett: "GEZEITENKRAFT", wert: x(t) ** 3, einheit: "× SO STARK" };
  return { etikett: "BIS ZUM WASSER", wert: Math.max(0, 40 * (60 - t) / 8), einheit: "m", hier: t >= 60 }; // Szenengeometrie (A)
}
export const videoZahlen = () => ({ d_halb: D0 / 2, groesse: faktor(D0 / 2), gezeiten: gezeiten(D0 / 2), licht: helligkeit(D0 / 2), umlauf_tage: umlauf(D0 / 2) });
if (import.meta.url === `file://${process.argv[1]}`) { console.log(videoZahlen()); for (const t of [0, 9, 18, 22, 27, 32, 38, 41, 46, 51, 52, 56, 60]) console.log(t, JSON.stringify(anzeige(t)), Math.round(d(t))); }
