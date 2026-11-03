// Grüne Sahara / Mega-Tschad (Slot acc2-2026-11-04-abend): Anzeige-Zeitachse.
export const DE = 357588, SEE = 400000; // See: obere Schätzung (Drake & Bristow 2006); Armitage 2015: 361.000
export function jvh(t) {
  if (t <= 20) return 16000 - 75 * t;
  if (t <= 34) return 14500 - (3000 / 14) * (t - 20);
  return Math.max(0, 11500 - (11500 / 26) * (t - 34));
}
export const seeflaeche = (t) => t < 20 ? 0 : t > 34 ? SEE : SEE * (t - 20) / 14;
export const deutschlandUeberschritten = () => 20 + 14 * DE / SEE;
