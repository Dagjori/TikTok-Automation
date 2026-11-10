// Video-Rechnung „Rente 2010 oder 2026: gleiche 2.000 Euro, wer zahlt mehr Steuern?“ (Simulierbar, 11.11.2026 mittag).
// Modellrechnung, alleinstehend, nur gesetzliche Rente, Steuerjahr 2026. Quellen (F): § 22 EStG (Besteuerungsanteil 2010: 60 %, 2026: 84 %),
// DRV Rentenwert West (2010: 27,20 · 2011 ab Juli: 27,47 · 2025: 40,79 · ab Juli 2026: 42,52), § 32a EStG 2026, Grundfreibetrag 2026: 12.348 €.
export const RW = { y2010: 27.2, y2011h1: 27.2, y2011h2: 27.47, y2025: 40.79, y2026h2: 42.52 };
const fl = Math.floor;
export function est2026(x) {
  x = fl(x);
  if (x <= 12348) return 0;
  if (x <= 17799) { const y = (x - 12348) / 1e4; return fl((914.51 * y + 1400) * y); }
  if (x <= 69878) { const z = (x - 17799) / 1e4; return fl((173.1 * z + 2397) * z + 1034.87); }
  return fl(0.42 * x - 11135.63);
}
const KV = 0.073 + 0.029 / 2, PV = 0.036;
export function videoZahlen() {
  const M0 = 2000, M1 = (M0 * RW.y2026h2) / RW.y2025;
  const jahr = 6 * M0 + 6 * M1;
  const jahrA2011 = (M0 / RW.y2025) * (6 * RW.y2011h1 + 6 * RW.y2011h2);
  const freiA = 0.4 * jahrA2011, freiB = 0.16 * jahr;
  const pflA = jahr - freiA, pflB = jahr - freiB;
  const vors = jahr * (KV + PV), pausch = 102 + 36;
  const zveA = fl(pflA - pausch - vors), zveB = fl(pflB - pausch - vors);
  const grund = 12348;
  return {
    monatBisJuni: M0, monatAbJuli: M1, jahresrente: jahr, monat2010A: (M0 * RW.y2010) / RW.y2025, jahresrenteA2011: jahrA2011,
    freiA, freiB, pflA, pflB, anteilA: pflA / jahr, anteilB: pflB / jahr, vorsorge: vors, pauschalen: pausch, zveA, zveB, grund,
    grenzA: (2 * 914.51 * ((zveA - grund) / 1e4) + 1400) / 1e4, grenzB: (2 * 914.51 * ((zveB - grund) / 1e4) + 1400) / 1e4,
    ueberA: zveA - grund, ueberB: zveB - grund, estA: est2026(zveA), estB: est2026(zveB),
    diffJahr: est2026(zveB) - est2026(zveA), diffMonat: (est2026(zveB) - est2026(zveA)) / 12, steigerungA: RW.y2025 / RW.y2010 - 1,
  };
}
