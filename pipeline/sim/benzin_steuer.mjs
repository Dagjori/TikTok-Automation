// Rechnung zu „Benzin: Wie viel Steuer auf Steuer zahlst du pro Tankfüllung?“ (Simulierbar, Lernvideo, 11.11.2026 abend).
// „Steuer auf Steuer“ = Mehrwertsteuer auf Energiesteuer und auf den weitergegebenen CO2-Preis (Warenpreis nicht enthalten).
// Alle Beträge in Cent je Liter, Rundung wie im Skript (rechenweg); reine Funktionen, keine Zufallswerte.
export const P = {
  energiesteuer: 65.45,      // ct/l, EnergieStG § 2 Abs. 1 Nr. 1 (654,50 €/1.000 l), Satz ab 01.01.2027
  tankrabatt: 14.04,         // ct/l, 01.10.–31.12.2026 (Satz 514,10 €/1.000 l)
  dichte: 0.755,             // t je 1.000 l, EBeV 2030 Anlage 2 Teil 4
  heizwert: 43.5,            // GJ/t
  emissionsfaktor: 0.0729,   // t CO2/GJ
  co2Preis: 65,              // €/t (Annahme: Obergrenze des Korridors 2027; 55 €/t = Untergrenze)
  mwst: 0.19,
  tankLiter: 50,
  jahrLiter: 1000,
};
const r = (x, n = 2) => Math.round((x + Number.EPSILON) * 10 ** n) / 10 ** n;

export function berechne(p = P) {
  const co2kgJeL = p.dichte * p.heizwert * p.emissionsfaktor;          // kg CO2 je Liter (t/1.000 l = kg/l)
  const co2NettoCt = co2kgJeL * p.co2Preis / 10;                        // kg × €/t = ct/l (÷ 1.000 × 100)
  const mwstEnergie = p.mwst * p.energiesteuer;
  const mwstCo2 = p.mwst * co2NettoCt;
  const ssCt = p.mwst * (p.energiesteuer + co2NettoCt);                 // Steuer auf Steuer 2027
  const energieRabatt = p.energiesteuer - p.tankrabatt;
  const ssRabattCt = p.mwst * (energieRabatt + co2NettoCt);             // mit Tankrabatt
  const anstiegCt = p.mwst * p.tankrabatt;
  return { co2kgJeL, co2NettoCt, mwstEnergie, mwstCo2, ssCt, energieRabatt, ssRabattCt, anstiegCt };
}

/** Steuer auf Steuer in Euro nach `liter` Litern (Modell 2027; mit rabatt = true: mit Tankrabatt) */
export function eurNachLitern(liter, { rabatt = false, p = P } = {}) {
  const b = berechne(p);
  return ((rabatt ? b.ssRabattCt : b.ssCt) * liter) / 100;
}

export function videoZahlen(p = P) {
  const b = berechne(p);
  return {
    roh: b,
    energiesteuer: p.energiesteuer, tankrabatt: p.tankrabatt, energieRabatt: r(b.energieRabatt),
    co2kg: r(b.co2kgJeL, 4), co2Preis: p.co2Preis, co2Ct: r(b.co2NettoCt),
    mwstEnergieCt: r(b.mwstEnergie), mwstCo2Ct: r(b.mwstCo2),
    ssCt: r(b.ssCt), ssRabattCt: r(b.ssRabattCt), anstiegCt: r(b.anstiegCt),
    l10: r(eurNachLitern(10, { p })), l30: r(eurNachLitern(30, { p })), l40: r(eurNachLitern(40, { p })),
    l50: r(eurNachLitern(p.tankLiter, { p })), l50Rabatt: r(eurNachLitern(p.tankLiter, { rabatt: true, p })),
    jahr: r(eurNachLitern(p.jahrLiter, { p })), jahrRabatt: r(eurNachLitern(p.jahrLiter, { rabatt: true, p })),
    anstiegTank: r((b.anstiegCt * p.tankLiter) / 100), anstiegJahr: r((b.anstiegCt * p.jahrLiter) / 100),
    // Alternative CO2-Preise (Skript: bei 55 €/t 13,17 ct und 14,94 ct Steuer auf Steuer)
    co2Ct55: r((p.dichte * p.heizwert * p.emissionsfaktor * 55) / 10),
    ssCt55: r(p.mwst * (p.energiesteuer + (p.dichte * p.heizwert * p.emissionsfaktor * 55) / 10)),
  };
}
