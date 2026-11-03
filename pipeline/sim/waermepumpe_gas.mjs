// Wärmepumpe oder neue Gasheizung (Slot acc1-2026-11-04-abend).
export const P = { gasKwh: 16510, gasPreis: 0.1223, wpKwh: 4680, wpPreis: 0.24, wpGrund: 140,
  gasInvest: 10000, wpInvest: 35000, quote: 0.46, maxKosten: 28000 };
export const gasJahr = () => P.gasKwh * P.gasPreis;
export const wpJahr = () => P.wpKwh * P.wpPreis + P.wpGrund;
export const foerderung = () => P.quote * Math.min(P.wpInvest, P.maxKosten);
export const wpNetto = () => P.wpInvest - foerderung();
export const gasSumme = (j) => P.gasInvest + j * gasJahr();
export const wpSumme = (j, netto = wpNetto()) => netto + j * wpJahr();
export const abstand = (j) => gasSumme(j) - wpSumme(j); // >0: Wärmepumpe günstiger
