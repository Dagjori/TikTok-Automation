// Video-Rechnung „Maut 2021 oder heute: Welche Familie zahlt beim Einkaufen mehr mit?“ (Simulierbar, 10.11.2026 mittag).
// Modellrechnung: Jeder Maut-Euro des Bundes landet vollständig im Preis und verteilt sich gleichmäßig auf alle Einwohner (Obergrenze);
// Familie = 4 Personen mit Durchschnittsverbrauch. Quellen (F): BMV Lkw-Maut (Einnahmen 2025 rund 13,4 Mrd. €), hib 134/2025 (Ist 2024 12,96 Mrd. €),
// Bundesregierung/transport-online (2021: 7,64 Mrd. €), Destatis (Einwohner Ende 2021 83,2 Mio., Ende 2025 83,5 Mio.), SVG/IHK (Mautsätze), BGL (350–400 €).
export const P = {
  einnahmen: { 2021: 7.64e9, 2024: 12.96e9, 2025: 13.4e9 }, // €
  plan2024: 15e9,
  einwohner: { 2021: 83.2e6, 2025: 83.5e6 },
  personen: 4,
  wochen: 52,
  satz: { vorher: 19.0, nachher: 34.8 }, // ct/km, Euro 6, > 18 t, 5+ Achsen
  bgl: { von: 350, bis: 400 },
  schieneAnteil: 0.5,
};
const r2 = (x) => Math.round(x * 100) / 100;
const r1 = (x) => Math.round(x * 10) / 10;

export function videoZahlen() {
  const kopfA = P.einnahmen[2021] / P.einwohner[2021];
  const kopfB = P.einnahmen[2025] / P.einwohner[2025];
  const kopf24 = P.einnahmen[2024] / P.einwohner[2025]; // Einwohner 2025 als Näherung (nur Zwischenstand)
  const famA = kopfA * P.personen, famB = kopfB * P.personen, fam24 = kopf24 * P.personen;
  return {
    kopfA: r2(kopfA), kopfB: r2(kopfB),
    famA: r2(famA), famB: r2(famB), fam24: r2(fam24),
    differenz: r2(famB - famA), mehrProzent: r1((famB / famA - 1) * 100),
    wocheA: r2(famA / P.wochen), wocheB: r2(famB / P.wochen), wocheMehr: r2((famB - famA) / P.wochen),
    satzPlus: r1((P.satz.nachher / P.satz.vorher - 1) * 100),
    luecke2024: r2((P.plan2024 - P.einnahmen[2024]) / 1e9), // Mrd. €
    schieneFam: r2(famB * P.schieneAnteil),
    unterBgl: famB - famA < P.bgl.von,
    roh: { famA, famB, fam24 },
  };
}
