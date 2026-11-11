// Video-Rechnung „Rentenerhöhung 2027: Was bleibt von 82 Euro mehr?“ (Simulierbar, Slot acc1-2026-11-12-mittag, Format Was bleibt).
// Quellen (F), nur intern: Entwurf Rentenversicherungsbericht 2026 (4,1 % zum 01.07.2027, Prognose); Ø-Zusatzbeitrag 2,9 % (Schätzerkreis 14.10.2026);
// Pflegeversicherung 3,6 % trägt der Rentner allein; § 22 EStG Rentenfreibetrag fest; Einkommensteuertarif 2027 nach Regierungsentwurf
// (Grundfreibetrag 12.564 €, Eckwert 17.800 €, 42 % ab 70.601 €; Zonen linear-progressiv nachgebildet).
// Modellperson (A): 2.000 € Bruttorente/Monat (Stand nach 01.07.2026), Rentenbeginn 2020, ledig, keine weiteren Einkünfte, ohne Kirchensteuer, KVdR, Eltern.
// Portiert aus cockpit/daten/tmp/rechnung_rente.py (Faktencheck: Ergebnisse identisch).
export const P = {
  rente: 2000, prozent: 0.041, kv: 0.073, zusatz: 0.029, pv: 0.036,
  anpassungen: [1.0535, 1.0439, 1.0457, 1.0374, 1.0424], // Rentenanpassungen West 2022–2026 (S), nur für den Rentenfreibetrag
  gfb: 12564, e2: 17799, wk: 102, sa: 36, monateWirkung2027: 6,
};

/** Einkommensteuer (Tarif 2027, geplant) auf das zu versteuernde Einkommen x (€, abgerundet) */
export function est(xRoh, p = P) {
  const x = Math.floor(xRoh);
  if (x <= p.gfb) return 0;
  const ye = (p.e2 - p.gfb) / 10000, a = 1000 / (2 * ye);
  if (x <= p.e2) { const y = (x - p.gfb) / 10000; return Math.floor((a * y + 1400) * y); }
  const t2 = (a * ye + 1400) * ye;
  const z = (x - p.e2) / 10000, b = (4200 - 2397) / (2 * ((70600 - 17800) / 10000));
  return Math.floor((b * z + 2397) * z + t2);
}

const r2 = (v) => Math.round(v * 100) / 100;

export function rechne(opt = {}) {
  const p = { ...P, ...opt };
  const svSatz = p.kv + p.zusatz / 2 + p.pv; // 12,35 %
  const erh = r2(p.rente * p.prozent);       // 82,00
  const r21 = p.rente / p.anpassungen.reduce((a, b) => a * b, 1);
  const fb = Math.round(0.2 * r21 * 12);     // Rentenfreibetrag 3.860 (Besteuerungsanteil 80 % bei Rentenbeginn 2020)
  const zve = (jahr) => jahr - fb - p.wk - p.sa - jahr * svSatz;
  const kv = r2(erh * p.kv), zus = r2(erh * p.zusatz / 2), pv = r2(erh * p.pv);
  const svSumme = r2(kv + zus + pv);
  const ohne = 12 * p.rente, mit = 12 * (p.rente + erh);
  const estOhne = est(zve(ohne), p), estMit = est(zve(mit), p);
  const steuerMonat = r2((estMit - estOhne) / 12);
  const bleibt = r2(erh - svSumme - steuerMonat);
  // Jahr 2027: nur Juli bis Dezember
  const brutto27 = erh * p.monateWirkung2027;
  const sv27 = r2(brutto27 * svSatz);
  const jahr27 = 6 * p.rente + 6 * (p.rente + erh);
  const steuer27 = est(zve(jahr27), p) - est(zve(ohne), p);
  const bleibt27 = r2(brutto27 - sv27 - steuer27);
  const x = zve(mit), z = (x - p.e2) / 10000, b = (4200 - 2397) / (2 * 5.28);
  const grenzsatz = r2((2 * b * z + 2397) / 100);
  return {
    svSatz, erh, r21: r2(r21), fb, kv, zus, pv, svSumme,
    nachKv: r2(erh - kv - zus), nachSv: r2(erh - svSumme),
    zveOhne: Math.round(zve(ohne)), zveMit: Math.round(zve(mit)), estOhne, estMit, steuerMonat,
    bleibt, anteil: r2((bleibt / erh) * 100), grenzsatz,
    brutto27, sv27, steuer27, bleibt27, anteil27: r2((bleibt27 / brutto27) * 100),
  };
}

export function videoZahlen() { return rechne(); }

if (typeof process !== "undefined" && import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(videoZahlen(), null, 2));
