// Video-Rechnung „Kaffee oder Tee? Wer zahlt im Leben mehr Steuern für sein Heißgetränk?“ (Simulierbar, 09.11.2026 abend).
// Quellen (F): KaffeeStG § 2: 2,19 €/kg Röstkaffee, 4,78 €/kg löslicher Kaffee; Kaffeesteuer-Aufkommen 2025 ≈ 1.037,9 Mio. € (BMF);
// Teesteuer bis 31.12.1992: 4,15 DM/kg (1 € = 1,95583 DM). Annahmen: 3 Tassen à 125 ml täglich, 60 g/l, 60 Jahre, Steuer voll im Preis,
// 7 % Umsatzsteuer auf die Kaffeesteuer (Bemessungsgrundlage enthält die Verbrauchsteuer).
export const P = { satzRoest: 2.19, satzInstant: 4.78, ust: 0.07, tassenTag: 3, jahre: 60, gramm: 7.5, grammInstant: 1.8, aufkommen: 1037.9e6, teeDM: 4.15, dm: 1.95583 };
const r2 = (x) => Math.round(x * 100) / 100;
export const steuerTasse = () => (P.gramm / 1000) * P.satzRoest;              // € ohne USt
export const steuerTasseMitUst = () => steuerTasse() * (1 + P.ust);
export const tassenJahr = () => P.tassenTag * 365;
export const bisJahr = (j) => tassenJahr() * j * steuerTasseMitUst();            // Kumuliert inkl. USt auf die Steuer
export function videoZahlen() {
  const ende = P.jahre * tassenJahr() * steuerTasseMitUst();
  const kg = (P.jahre * tassenJahr() * P.gramm) / 1000;
  return {
    centTasse: Math.round(steuerTasse() * 10000) / 100, centTasseMitUst: Math.round(steuerTasseMitUst() * 10000) / 100,
    zehn: r2(bisJahr(10)), dreissig: r2(bisJahr(30)), ende: r2(ende), tassen: P.jahre * tassenJahr(), kg: r2(kg),
    kaffeesteuerEnde: r2(kg * P.satzRoest), ustEnde: r2(kg * P.satzRoest * P.ust), tee: 0,
    teeEuroKg: r2(P.teeDM / P.dm), instantCentTasse: Math.round(((P.grammInstant / 1000) * P.satzInstant) * 10000) / 100,
    instantAnteil: Math.round(((P.grammInstant * P.satzInstant) / (P.gramm * P.satzRoest)) * 1000) / 10,
    aufkommenTag: Math.round((P.aufkommen / 365 / 1e6) * 100) / 100,
  };
}
