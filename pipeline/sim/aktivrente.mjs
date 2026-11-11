// Rechnung „Aktivrente: gleiches Brutto, wer hat mehr netto?“ (Video 13.11.2026 Mittag)
// Kollegin 45: Lohnsteuer aus netto.mjs (PAP 2026), Beiträge regulär. Kollegin 67: Lohnsteuer 0 (§ 3 Nr. 21 EStG),
// RV und AV frei, KV ermäßigt (ohne Krankengeldanspruch: 14,0 % + Zusatzbeitrag 2,9 %), PV wie bei der Jüngeren.
import { netto, lohnsteuerMonat, cent } from "./netto.mjs";

const BRUTTO = 2000;
export function videoZahlen() {
  const opt = { brutto: BRUTTO, stkl: 1, kinder: 1, kirche: false, zusatzbeitrag: 2.9, ohneMidijobPruefung: true };
  const j = netto(opt);
  const lst45 = lohnsteuerMonat(opt).lst;
  const rv45 = cent(BRUTTO * 0.093), av45 = cent(BRUTTO * 0.013);
  const kv45 = cent(BRUTTO * (0.073 + 0.0145)), pv = cent(BRUTTO * 0.018);
  const kv67 = cent(BRUTTO * (0.070 + 0.0145));
  const abz45 = cent(lst45 + rv45 + av45 + kv45 + pv);
  const abz67 = cent(kv67 + pv);
  const netto45 = cent(BRUTTO - abz45), netto67 = cent(BRUTTO - abz67);
  return {
    brutto: BRUTTO, lst45, rv45, av45, kv45, pv, kv67, abz45, abz67, netto45, netto67,
    nettoModul45: j.netto, soli45: j.soli,
    abstandNachAv: cent(lst45 + rv45 + av45),
    diffMonat: cent(netto67 - netto45), diffJahr: cent((netto67 - netto45) * 12),
    agRvMonat: cent(BRUTTO * 0.093), agRvJahr: cent(BRUTTO * 0.093 * 12),
  };
}
