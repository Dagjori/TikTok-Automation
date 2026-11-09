// Video-Rechnung „Kindergeld in Deutschland oder in Kanada: Wo zahlt der Staat bis 18 mehr?“ (Simulierbar, 10.11.2026 abend).
// Quellen (F), nur intern: Kindergeld 2026 259 €/Monat (Bundesagentur für Arbeit/Familienkasse); Canada Child Benefit Juli 2026 – Juni 2027
// (Canada Revenue Agency: 8.157 CAD unter 6, 6.883 CAD 6–17; 7 % über 38.237 CAD, über 82.847 CAD 3.123 CAD + 3,2 %, ein Kind);
// EZB-Referenzkurs 06.11.2026 1,5705 CAD je €. Modellfamilie: ein Kind, 50.000 € Familieneinkommen (A), alles konstant über 18 Jahre (A).
export const P = {
  kindergeldMonat: 259, ccbU6: 8157, ccb6bis17: 6883, grenze1: 38237, grenze2: 82847, satz1: 0.07, basis2: 3123, satz2: 0.032,
  kurs: 1.5705, einkommenEur: 50000, jahre: 18, jahreU6: 6,
};

/** CCB je Jahr in CAD für ein Kind bei Einkommen (CAD) und Alter (Jahre) */
export function ccbJahrCad(einkommenCad, alter, p = P) {
  const max = alter < p.jahreU6 ? p.ccbU6 : p.ccb6bis17;
  let kuerzung = 0;
  if (einkommenCad > p.grenze2) kuerzung = p.basis2 + p.satz2 * (einkommenCad - p.grenze2);
  else if (einkommenCad > p.grenze1) kuerzung = p.satz1 * (einkommenCad - p.grenze1);
  return Math.max(0, max - kuerzung);
}

export function rechne(opt = {}) {
  const p = { ...P, ...opt };
  const cad = p.einkommenEur * p.kurs;
  const deJahr = p.kindergeldMonat * 12;
  const caU6 = ccbJahrCad(cad, 0, p) / p.kurs, ca6 = ccbJahrCad(cad, p.jahreU6, p) / p.kurs;
  const monat = []; // Monatsende m = 0..216: { m, de, ca }
  let de = 0, ca = 0; monat.push({ m: 0, de: 0, ca: 0 });
  for (let m = 1; m <= p.jahre * 12; m++) {
    de += deJahr / 12; ca += (m <= p.jahreU6 * 12 ? caU6 : ca6) / 12;
    monat.push({ m, de, ca });
  }
  const jahr = monat.filter((x) => x.m % 12 === 0);
  const deSumme = deJahr * p.jahre, caSumme = caU6 * p.jahreU6 + ca6 * (p.jahre - p.jahreU6);
  const kipp = monat.find((x) => x.m > 0 && x.de > x.ca);
  return {
    cad, deJahr, deSumme, caU6, ca6, caU6Monat: caU6 / 12, ca6Monat: ca6 / 12, caSumme, vorsprungDe: deSumme - caSumme,
    nach6: jahr[p.jahreU6], vorsprungCa6: jahr[p.jahreU6].ca - jahr[p.jahreU6].de,
    aufholenJahr: deJahr - ca6, kippMonat: kipp ? kipp.m : null, kippJahre: kipp ? Math.floor(kipp.m / 12) : null, kippRestMonate: kipp ? kipp.m % 12 : null, monat, jahr,
    maxMonatCad: p.ccbU6 / 12, maxMonatEur: p.ccbU6 / 12 / p.kurs,
  };
}

/** Einkommen (€), bei dem die 18-Jahres-Summen gleich sind (Bisektion) */
export function gleichstandEinkommen(p = P) {
  const f = (e) => rechne({ einkommenEur: e }).vorsprungDe;
  let lo = 38237 / p.kurs, hi = 100000;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}

export const maximalCa = () => rechne({ einkommenEur: 20000 }).caSumme;

export function videoZahlen() {
  const r = rechne();
  const g = gleichstandEinkommen();
  const kuerzungCad = P.satz1 * (r.cad - P.grenze1);
  return {
    kindergeldMonat: P.kindergeldMonat, deJahr: r.deJahr, deSumme: r.deSumme, einkommenCad: r.cad, kuerzungCad,
    caU6Jahr: r.caU6, caU6Monat: r.caU6Monat, ca6Jahr: r.ca6, ca6Monat: r.ca6Monat, caSumme: r.caSumme, vorsprungDe: r.vorsprungDe,
    maxMonatEur: r.maxMonatEur, nach6De: r.nach6.de, nach6Ca: r.nach6.ca, vorsprungCa6: r.vorsprungCa6, aufholenJahr: r.aufholenJahr,
    kippMonat: r.kippMonat, kippJahre: r.kippJahre, kippRestMonate: r.kippRestMonate, gleichstand: g, caMax: maximalCa(),
    ca40k: rechne({ einkommenEur: 40000 }).caSumme, vorsprungCa40k: -rechne({ einkommenEur: 40000 }).vorsprungDe,
    caMaxCad: ccbJahrCad(0, 0) * P.jahreU6 + ccbJahrCad(0, 6) * 12,
  };
}

if (typeof process !== "undefined" && import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(videoZahlen(), null, 2));
