// Video-Rechnung „Gasrechnung zerlegt: Wie viel davon bekommt der Staat?“ (Simulierbar, Slot acc1-2026-11-12-abend, Format Was bleibt).
// Quellen (F), nur intern: BDEW-Gaspreisanalyse Okt. 2026 (EFH 12,23 ct/kWh, Steuern/Abgaben ca. 30 %, Netz ca. ein Fünftel, Beschaffung/Vertrieb knapp die Hälfte,
// Gasspeicherumlage entfallen), BDEW 01/2026 (Netzentgelt 2,57 ct/kWh netto), § 2 EnergieStG (0,55 ct/kWh), nEHS 65 €/t (Korridor 2026), Konzessionsabgabe 0,03 ct/kWh.
// Modell (A): Einfamilienhaus 20.000 kWh/Jahr, Neukundenpreis 2026. Lieferant = Rest (Beschaffung + Vertrieb + Marge).
export const P = { kwh: 20000, preis: 12.23, mwst: 0.19, esCt: 0.55, co2Ct: 1.18, konzCt: 0.03, netzCt: 2.57 };
const r2 = (v) => Math.round(v * 100) / 100;

export function rechne(p = P) {
  const brutto = r2((p.kwh * p.preis) / 100);
  const netto = r2(brutto / (1 + p.mwst));
  const mwst = r2(brutto - netto);
  const es = r2((p.kwh * p.esCt) / 100);
  const co2 = r2((p.kwh * p.co2Ct) / 100);
  const konz = r2((p.kwh * p.konzCt) / 100);
  const netz = r2((p.kwh * p.netzCt) / 100);
  const lieferant = r2(netto - es - co2 - konz - netz);
  const staat = r2(mwst + es + co2 + konz);
  const tage = Math.round((staat / brutto) * 365);
  return { brutto, netto, mwst, es, co2, konz, netz, lieferant, staat,
    staatProzent: r2((staat / brutto) * 100), mwstProzent: r2((mwst / brutto) * 100), netzProzent: r2((netz / brutto) * 100), lieferantProzent: r2((lieferant / brutto) * 100),
    tage, stichtag: datumNachTagen(tage), halberLieferant: r2(lieferant / 2), zehntel: r2(brutto / 10), sechstel: r2(brutto / 6) };
}
/** n-ter Tag eines Nicht-Schaltjahres als Datum „TT.MM.“ */
export function datumNachTagen(n) {
  const l = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; let rest = n, m = 0;
  while (rest > l[m]) { rest -= l[m]; m++; }
  return `${String(rest).padStart(2, "0")}.${String(m + 1).padStart(2, "0")}.`;
}
export function videoZahlen() { return rechne(); }
if (typeof process !== "undefined" && import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(videoZahlen(), null, 2));
