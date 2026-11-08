// Video-Rechnung „1968 oder heute: Wie viel mehr Mehrwertsteuer zahlt ein Haushalt im Jahr?“ (Simulierbar, 08.11.2026 abend).
// Modellrechnung: gleicher Durchschnittseinkauf, gleiche Nettopreise und Mengen, nur die Steuersätze wechseln.
// Quellen (F): Destatis LWR 2024: 3.257 €/Monat, Gastronomie/Beherbergung 215 €; Destatis WISTA 11/2006 (EVS 2003):
// 56 % Regelsatz, 16 % ermäßigt, 28 % steuerfrei; bpb: 01.01.1968 10 %/5 %, ab 01.07.1968 11 %/5,5 %; seit 01.01.2026 Speisen in
// der Gastronomie 7 % (Steueränderungsgesetz 2025), Regelsatz 19 %, ermäßigt 7 %.
export const P = {
  konsum: 3257, gastro: 215,
  anteil: { regel: 0.56, erm: 0.16, frei: 0.28 },
  heute: { regel: 0.19, erm: 0.07, gastro: 0.07 },
  y1968: { regel: 0.10, erm: 0.05, gastro: 0.10 },
  juli1968: { regel: 0.11, erm: 0.055, gastro: 0.11 },
};
const r2 = (x) => Math.round(x * 100) / 100;
const block = (brutto, satzHeute, satzAlt) => { const netto = brutto / (1 + satzHeute); return { heute: netto * satzHeute, alt: netto * satzAlt }; };

export function bloecke(alt = P.y1968) {
  const regelBrutto = P.konsum * P.anteil.regel - P.gastro; // Restaurant gesondert
  const ermBrutto = P.konsum * P.anteil.erm;
  const freiBrutto = P.konsum * P.anteil.frei;
  return {
    gastro: { brutto: P.gastro, ...block(P.gastro, P.heute.gastro, alt.gastro) },
    erm: { brutto: ermBrutto, ...block(ermBrutto, P.heute.erm, alt.erm) },
    frei: { brutto: freiBrutto, heute: 0, alt: 0 },
    regel: { brutto: regelBrutto, ...block(regelBrutto, P.heute.regel, alt.regel) },
  };
}

export function videoZahlen(alt = P.y1968) {
  const b = bloecke(alt);
  const monatHeute = b.gastro.heute + b.erm.heute + b.regel.heute;
  const monatAlt = b.gastro.alt + b.erm.alt + b.regel.alt;
  const korbAlt = P.konsum - (monatHeute - monatAlt);
  return {
    b,
    gastroHeute: r2(b.gastro.heute), gastroAlt: r2(b.gastro.alt),
    ermHeute: r2(b.erm.heute), ermAlt: r2(b.erm.alt),
    regelBrutto: r2(b.regel.brutto), regelHeute: r2(b.regel.heute), regelAlt: r2(b.regel.alt),
    freiBrutto: r2(b.frei.brutto), ermBrutto: r2(b.erm.brutto),
    nachSuperHeute: r2(b.gastro.heute + b.erm.heute), nachSuperAlt: r2(b.gastro.alt + b.erm.alt),
    monatHeute: r2(monatHeute), monatAlt: r2(monatAlt),
    jahrHeute: r2(monatHeute * 12), jahrAlt: r2(monatAlt * 12), differenzJahr: r2((monatHeute - monatAlt) * 12),
    mehrProzent: Math.round((monatHeute / monatAlt - 1) * 1000) / 10,
    korbTeurerProzent: Math.round((P.konsum / korbAlt - 1) * 1000) / 10,
    anteilNichtRegel: Math.round((P.anteil.erm + P.anteil.frei) * 100),
  };
}
