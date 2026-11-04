// Vorsorge: 100 €/Monat ab 25 gegen 150 €/Monat ab 35 bis 67 (Modellrendite, Einzahlung Monatsanfang)
export function endwert(rate, startAlter, bisAlter, p = 0.05) {
  const m = Math.pow(1 + p, 1 / 12) - 1; let k = 0;
  for (let i = 0; i < (bisAlter - startAlter) * 12; i++) k = (k + rate) * (1 + m);
  return k;
}
export function stand(alter, p = 0.05) {
  return { lena: alter <= 25 ? 0 : endwert(100, 25, alter, p), mia: alter <= 35 ? 0 : endwert(150, 35, alter, p) };
}
export function videoZahlen() {
  const r = Math.round;
  const s35 = stand(35), s55 = stand(55), s60 = stand(60), s67 = stand(67), s67_3 = stand(67, 0.03);
  return { lena35: r(s35.lena), lena55: r(s55.lena), mia55: r(s55.mia), abstand60: r(s60.lena - s60.mia),
    lena67: r(s67.lena), mia67: r(s67.mia), abstand67: r(s67.lena) - r(s67.mia),
    einLena: 100 * 12 * 42, einMia: 150 * 12 * 32, abstand3: r(s67_3.lena) - r(s67_3.mia),
    nurBis35: r(endwert(100, 25, 35) * Math.pow(1.05, 32)) };
}

/** Stetiger Endwert (Einzahlung am Monatsanfang, monatliche Verzinsung) für beliebiges Alter, z. B. für die Zähler im Video */
export function endwertStetig(rate, startAlter, alter, p = 0.05) {
  const n = Math.max(0, (alter - startAlter) * 12);
  const m = Math.pow(1 + p, 1 / 12) - 1;
  return rate * ((Math.pow(1 + m, n) - 1) / m) * (1 + m);
}
