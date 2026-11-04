// Wärmepumpe oder neue Gasheizung (Slot acc1-2026-11-04-abend). Quellen intern in skript.json.
export const P = { gasKwh: 16510, gasPreis: 0.1223, wpKwh: 4680, wpPreis: 0.24, wpGrund: 140,
  gasInvest: 10000, wpInvest: 35000, foerderQuote: 0.30 + 0.16, foerderMax: 28000, jahre: 20 };
export const gasJahr = () => P.gasKwh * P.gasPreis;
export const wpJahr = () => P.wpKwh * P.wpPreis + P.wpGrund;
export const foerderung = (q = P.foerderQuote) => q * Math.min(P.wpInvest, P.foerderMax);
export const wpNetto = (q = P.foerderQuote) => P.wpInvest - foerderung(q);
export const gasSumme = (j) => P.gasInvest + j * gasJahr();
export const wpSumme = (j, q = P.foerderQuote) => wpNetto(q) + j * wpJahr();
export const abstand = (j, q) => gasSumme(j) - wpSumme(j, q); // > 0: Wärmepumpe vorn
export function videoZahlen() {
  return { gasJahr: gasJahr(), wpJahr: wpJahr(), diffJahr: gasJahr() - wpJahr(), foerderung: foerderung(),
    wpNetto: wpNetto(), mehrpreis: wpNetto() - P.gasInvest, gleichstand: (wpNetto() - P.gasInvest) / (gasJahr() - wpJahr()),
    gas20: gasSumme(20), wp20: wpSumme(20), vorteil20: abstand(20), wpOhne20: wpSumme(20, 0), wpNurGrund20: wpSumme(20, 0.30),
    reihe: Array.from({ length: 21 }, (_, j) => ({ j, gas: gasSumme(j), wp: wpSumme(j) })) };
}
