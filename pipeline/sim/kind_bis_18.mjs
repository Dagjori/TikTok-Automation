// Video-Rechnung „Kind: Was kostet es wirklich bis 18?“ (Simulierbar, 03.11.2026 abend).
// Quellen (F): Destatis, Konsumausgaben von Familien für Kinder, EVS 2018 (erschienen 21.06.2021), Paare mit einem Kind:
// unter 6 J. 679 €, 6 bis unter 12 J. 786 €, 12 bis unter 18 J. 953 € je Monat (Preise 2018, nominal). Kindergeld 2026: 259 €/Monat
// (§ 66 EStG, BA). Modell: Altersgruppe je 6 Jahre, Kindergeld 2026 für alle 18 Jahre (Jahresmischung offengelegt).
export const AUSGABEN = [679, 786, 953];
export const KINDERGELD = 259;

export const ausgabenBis = (jahre) => AUSGABEN.reduce((s, m, i) => s + m * 12 * Math.max(0, Math.min(jahre - 6 * i, 6)), 0);
export const kindergeldBis = (jahre) => KINDERGELD * 12 * jahre;

export function videoZahlen() {
  const gesamt = ausgabenBis(18), kg = kindergeldBis(18);
  return {
    phasen: AUSGABEN.map((m) => m * 72),
    ausgaben12: ausgabenBis(12), kindergeld12: kindergeldBis(12),
    gesamt, kindergeld: kg, netto: gesamt - kg,
    deckungKlein: KINDERGELD / AUSGABEN[0], deckungJugend: KINDERGELD / AUSGABEN[2], deckungGesamt: kg / gesamt,
    mehrJugend: AUSGABEN[2] / AUSGABEN[0] - 1,
    differenzEndeAnfang: (AUSGABEN[2] - AUSGABEN[0]) * 72,
  };
}
if (typeof process !== "undefined" && import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(videoZahlen(), null, 2));
