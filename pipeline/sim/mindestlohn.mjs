// Video-Rechnung „Mindestlohn 2015 oder 2026: Wer kann sich mit einem Jahr Arbeit mehr leisten?“ (Simulierbar, 09.11.2026 mittag).
// Modellrechnung: Vollzeit 40 h × 52 Wochen, Steuerklasse I, ledig, kinderlos, gesetzlich versichert (Annahmen im Skript).
// Quellen (F): MiLoV5 (13,90 € ab 2026), bpb (8,50 € 2015, 9,82 € Mai 2022, 10,45 € ab Juli 2022, 12 € ab Okt. 2022),
// Destatis VPI (2020=100): 2015 = 94,5; Jan–Sep 2026 Mittel 124,8; Mai 2022 = 109,8; Okt. 2022 = 113,5; §32a EStG 2015/2026.
export const H = 40 * 52;
export const VPI = { y2015: 94.5, mai2022: 109.8, okt2022: 113.5, m2026: [122.8, 123.1, 124.5, 125.2, 125.0, 124.6, 125.6, 125.8, 126.6] };
export const LOHN = { y2015: 8.5, y2026: 13.9, mai2022: 9.82, okt2022: 12.0 };
const fl = Math.floor;
export function est2015(x) {
  x = fl(x);
  if (x <= 8472) return 0;
  if (x <= 13469) { const y = (x - 8472) / 1e4; return fl((997.6 * y + 1400) * y); }
  if (x <= 52881) { const z = (x - 13469) / 1e4; return fl((228.74 * z + 2397) * z + 948.68); }
  return fl(0.42 * x - 8261.29);
}
export function est2026(x) {
  x = fl(x);
  if (x <= 12348) return 0;
  if (x <= 17799) { const y = (x - 12348) / 1e4; return fl((914.51 * y + 1400) * y); }
  if (x <= 69878) { const z = (x - 17799) / 1e4; return fl((173.1 * z + 2397) * z + 1034.87); }
  return fl(0.42 * x - 11135.63);
}
export function rechne(jahr, lohn) {
  const b = lohn * H;
  let rv, kv, kvabz, pv, av, wk, altvors;
  if (jahr === 2015) { rv = 0.187 / 2; kv = 0.073 + 0.009; kvabz = 0.07 + 0.009; pv = 0.0235 / 2 + 0.0025; av = 0.03 / 2; wk = 1000; altvors = Math.max(0, 0.8 * 0.187 * b - (0.187 / 2) * b); }
  else { rv = 0.186 / 2; kv = 0.073 + 0.029 / 2; kvabz = 0.07 + 0.029 / 2; pv = 0.036 / 2 + 0.006; av = 0.026 / 2; wk = 1230; altvors = (0.186 / 2) * b; }
  const sv = b * (rv + kv + pv + av);
  const zve = b - wk - 36 - altvors - b * (kvabz + pv);
  const est = jahr === 2015 ? est2015(zve) : est2026(zve);
  let soli = 0;
  if (jahr === 2015 && est > 972) soli = Math.min(0.055 * est, 0.2 * (est - 972));
  if (jahr === 2026 && est > 20350) soli = Math.min(0.055 * est, 0.119 * (est - 20350));
  return { brutto: b, sv, zve, est, soli, netto: b - sv - est - soli };
}
const r2 = (x) => Math.round(x * 100) / 100;
export function videoZahlen() {
  const a = rechne(2015, LOHN.y2015), c = rechne(2026, LOHN.y2026);
  const vpi26 = VPI.m2026.reduce((s, v) => s + v, 0) / VPI.m2026.length;
  const f = vpi26 / VPI.y2015;                       // Preisfaktor 2015 → heute
  const fMai = vpi26 / VPI.mai2022, fOkt = vpi26 / VPI.okt2022;
  const nettoAltReal = a.netto * f;
  return {
    a, c, faktor: f, teuerungProzent: Math.round((f - 1) * 1000) / 10,
    bruttoAlt: a.brutto, bruttoNeu: c.brutto, bruttoVorsprung: c.brutto - a.brutto,
    stundeAltHeute: r2(LOHN.y2015 * f),
    bruttoAltReal: r2(a.brutto * f), bruttoVorsprungReal: r2(c.brutto - a.brutto * f),
    // Lena zu früheren Zeitpunkten, in heutigen Euro (Jahreswert brutto)
    lenaMai22Real: r2(LOHN.mai2022 * H * fMai), lenaOkt22Real: r2(LOHN.okt2022 * H * fOkt),
    stundeMai22Real2015: r2((LOHN.mai2022 * VPI.y2015) / VPI.mai2022), // Euro von 2015
    nettoAlt: r2(a.netto), nettoNeu: r2(c.netto), nettoAltReal: r2(nettoAltReal),
    vorsprungNettoReal: r2(c.netto - nettoAltReal), vorsprungNominal: r2(c.netto - a.netto),
    teuerungFrisst: r2(nettoAltReal - a.netto),
    behaltenAlt: Math.round((a.netto / a.brutto) * 1000) / 1000, behaltenNeu: Math.round((c.netto / c.brutto) * 1000) / 1000,
    abgabenEffekt: r2(c.brutto * (a.netto / a.brutto) - c.netto),
    realAnteil: Math.round(((c.netto - nettoAltReal) / (c.netto - a.netto)) * 1000) / 10,
    stundenFuerAnnasJahr: Math.round(nettoAltReal / (c.netto / H)), monateFuerAnnasJahr: r2((nettoAltReal / (c.netto / H) / H) * 12),
  };
}
