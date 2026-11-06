// „Angestellt oder selbstständig: Wer hat bei gleichen 60.000 € mehr netto?“ · Simulierbar · Modellrechnung 2026
// Jonas: angestellt, 60.000 € brutto. Sara: Freiberuflerin, 60.000 € Gewinn. Beide kinderlos, ledig, gesetzlich versichert (Zusatzbeitrag 2,9 %),
// keine Kirchensteuer. Sara zahlt freiwillig 18,6 % in die Rente (gleiche Rentenansprüche, ANNAHME) und wählt KV 14,6 % + Zusatzbeitrag mit Krankengeld.
// Steuer als Jahressteuer (Veranlagung). Tarif § 32a EStG 2026 über netto.mjs (PAP UPTAB26), Sätze 2026 aus P2026.
import { P2026 as P, tarif } from "./netto.mjs";

const fl = (x) => Math.floor(x + 1e-9);
export const soli = (est) => (est <= P.SOLZFREI ? 0 : Math.min(P.SOLZ_SATZ * est, P.SOLZ_MILDERUNG * (est - P.SOLZFREI)));
const ZB = P.ZUSATZBEITRAG / 100; // 2,9 %
const KV_KRANKENGELD_KUERZUNG = 0.96; // § 10 Abs. 1 Nr. 3 Satz 4 EStG: 4 % Kürzung bei Krankengeldanspruch

/** Angestellter (Arbeitnehmeranteile), Jahresbrutto B */
export function angestellt(B = 60000) {
  const kb = Math.min(B, P.BBG_KV_JAHR), rb = Math.min(B, P.BBG_RV_JAHR);
  const rv = rb * P.RV_AN, av = rb * P.AV_AN, kv = kb * (P.KV_AN_ALLG + ZB / 2), pv = kb * (P.PV_AN + P.PV_KINDERLOS);
  const abgaben = rv + av + kv + pv;
  const zve = fl(B - P.ANP - P.SAP - rv - (kv * KV_KRANKENGELD_KUERZUNG + pv)); // AV: Höchstbetrag 1.900 € durch KV/PV schon ausgeschöpft
  const est = tarif(zve), s = soli(est);
  const agAnteile = rb * (P.RV_AN + P.AV_AN) + kb * (P.KV_AN_ALLG + ZB / 2 + P.PV_AN);
  return { rv, av, kv, pv, abgaben, zve, est, soli: s, netto: B - abgaben - est - s, agAnteile, agKosten: B + agAnteile };
}
/** Freiberuflerin (alles allein), Jahresgewinn G */
export function selbststaendig(G = 60000) {
  const kb = Math.min(G, P.BBG_KV_JAHR), rb = Math.min(G, P.BBG_RV_JAHR);
  const kv = kb * (2 * P.KV_AN_ALLG + ZB), pv = kb * (2 * P.PV_AN + P.PV_KINDERLOS), rv = rb * 2 * P.RV_AN;
  const abgaben = kv + pv + rv;
  const zve = fl(G - rv - (kv * KV_KRANKENGELD_KUERZUNG + pv) - P.SAP);
  const est = tarif(zve), s = soli(est);
  return { kv, pv, rv, abgaben, zve, est, soli: s, netto: G - abgaben - est - s };
}
/** Gewinn, bei dem Sara so viel netto hat wie Jonas (Bisektion, KV/PV bei 69.750 € gedeckelt) */
export function gleichstandGewinn(B = 60000) {
  const ziel = angestellt(B).netto; let lo = B, hi = 2 * B;
  while (hi - lo > 0.01) { const m = (lo + hi) / 2; if (selbststaendig(m).netto < ziel) lo = m; else hi = m; }
  return hi;
}
/** Arbeitstage 2026 Mo–Fr und bundesweite Feiertage auf Mo–Fr */
export function kalender2026() {
  const feiertage = [[1, 1], [4, 3], [4, 6], [5, 1], [5, 14], [5, 25], [10, 3], [12, 25], [12, 26]].map(([m, d]) => new Date(Date.UTC(2026, m - 1, d)));
  let werktage = 0;
  for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 864e5) { const w = new Date(t).getUTCDay(); if (w >= 1 && w <= 5) werktage++; }
  const feiertageMoFr = feiertage.filter((d) => d.getUTCDay() >= 1 && d.getUTCDay() <= 5).length;
  return { werktage, feiertage: feiertage.length, feiertageMoFr };
}
export function videoZahlen() {
  const B = 60000, J = angestellt(B), S = selbststaendig(B), G = gleichstandGewinn(B), K = kalender2026();
  const urlaub = 30, krank = 14.6;
  const jStunden = K.werktage * 8, sTage = K.werktage - K.feiertageMoFr - urlaub - krank, sStunden = sTage * 8;
  return {
    J, S, G, K, jNetto: J.netto, sNetto: S.netto, diff: J.netto - S.netto, diffMonat: (J.netto - S.netto) / 12,
    steuerVorteilS: J.est - S.est, mehrAbgabenS: S.abgaben - J.abgaben, gleichGewinn: G, gleichPlus: G / B - 1,
    jStunden, sStunden, sTage, jStundenlohn: B / jStunden, sStundensatz: G / sStunden, faktor: (G / sStunden) / (B / jStunden),
    jMonat: J.netto / 12, sMonat: S.netto / 12,
  };
}
