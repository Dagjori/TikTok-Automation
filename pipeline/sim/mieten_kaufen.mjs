// Video-Rechnung „Mieten oder kaufen: Wer hat nach 30 Jahren mehr Vermögen?“ (Simulierbar, 06.11.2026 abend).
// Modellrechnung monatlich über 360 Monate, Leipzig, 80 m² Bestand. Quellen (F), nur intern:
// ImmoScout24 WohnBarometer Q1 2026 Kauf (3.034 €/m²) und Q2 2026 Miete (8,97 €/m²); Bundesbank MFI-Zinsstatistik Sept. 2026 (4,13 %);
// Sächsisches GrEStSatzG 5,5 %; Notar/Grundbuch ca. 2 %, Makler 3,57 % (§ 656c BGB); II. BV 2026 (18,62 €/m²/J, Verwaltung 445,32 €/J);
// Abgeltungsteuer 25 % + Soli 5,5 %, Teilfreistellung 30 % (§ 20 InvStG). Rendite 5 %, Steigerungen je 2 % sind Annahmen (A).
export const P = {
  qm: 80, preisQm: 3034, mieteQm: 8.97, grest: 0.055, notar: 0.02, makler: 0.0357, ek: 50000,
  instandQmJ: 18.62, verwJ: 445.32, zins: 0.0413, rendite: 0.05, mieteStg: 0.02, wertStg: 0.02, kostenStg: 0.02,
  jahre: 30, steuer: 0.25 * 1.055 * 0.7,
};

export function rechne(opt = {}) {
  const p = { ...P, ...opt };
  const tomLegtAn = opt.tomLegtAn !== false;
  const preis = p.qm * p.preisQm;
  const nk = preis * (p.grest + p.notar + p.makler);
  const kredit = preis + nk - p.ek;
  const n = p.jahre * 12, im = p.zins / 12;
  const rate = (kredit * im) / (1 - Math.pow(1 + im, -n));
  const rm = Math.pow(1 + p.rendite, 1 / 12) - 1;
  let depT = p.ek, einT = p.ek, depL = 0, einL = 0, rest = kredit, zinsen = 0, mieteSumme = 0;
  const jahr = []; // Jahresende: { y, wert, rest, lisa, tom, depT, miete, lisaKosten }
  const monat = [{ m: 0, wert: preis, rest: kredit, lisa: preis - kredit, tom: p.ek, miete: p.qm * p.mieteQm }]; // Monatsende (für die Szene), m = 0 = Tag eins nach den Nebenkosten
  for (let m = 0; m < n; m++) {
    const j = Math.floor(m / 12);
    const miete = p.qm * p.mieteQm * Math.pow(1 + p.mieteStg, j);
    const haus = ((p.qm * p.instandQmJ + p.verwJ) / 12) * Math.pow(1 + p.kostenStg, j);
    const z = rest * im; zinsen += z; rest -= rate - z;
    const lisaKosten = rate + haus, diff = lisaKosten - miete;
    mieteSumme += miete;
    depT *= 1 + rm; depL *= 1 + rm;
    if (diff > 0) { if (tomLegtAn) { depT += diff; einT += diff; } } else { depL += -diff; einL += -diff; }
    { const w = preis * Math.pow(1 + p.wertStg, (m + 1) / 12); monat.push({ m: m + 1, wert: w, rest: Math.max(rest, 0), lisa: w - Math.max(rest, 0) + depL, tom: depT, miete }); }
    if ((m + 1) % 12 === 0) {
      const y = (m + 1) / 12, wert = preis * Math.pow(1 + p.wertStg, y);
      jahr.push({ y, wert, rest: Math.max(rest, 0), lisa: wert - Math.max(rest, 0) + depL, tom: depT, depT, miete, lisaKosten, sparrate: diff });
    }
  }
  const wert30 = preis * Math.pow(1 + p.wertStg, p.jahre);
  const tom = depT - Math.max(depT - einT, 0) * p.steuer;
  const lisa = wert30 + depL - Math.max(depL - einL, 0) * p.steuer;
  return {
    preis, nk, kredit, rate, zinsen, mieteSumme, wert30, depT, einT, gewinnT: depT - einT, steuerT: Math.max(depT - einT, 0) * p.steuer,
    tom, lisa, vorsprung: tom - lisa, jahr, monat,
    miete0: p.qm * p.mieteQm, haus0: (p.qm * p.instandQmJ + p.verwJ) / 12, lisaStart: rate + (p.qm * p.instandQmJ + p.verwJ) / 12,
  };
}

export const basis = () => rechne();
export const ohneAnlage = () => rechne({ tomLegtAn: false });

export function videoZahlen() {
  const b = basis(), o = ohneAnlage();
  return {
    preis: b.preis, nk: b.nk, kredit: b.kredit, rate: b.rate, lisaStart: b.lisaStart, miete0: b.miete0, sparrate0: b.lisaStart - b.miete0,
    miete20: b.jahr[19].miete, miete30: b.jahr[29].miete, lisaKosten30: b.jahr[29].lisaKosten,
    wert30: b.wert30, depT: b.depT, einT: b.einT, steuerT: b.steuerT, tom: b.tom, lisa: b.lisa, vorsprung: b.vorsprung,
    tomOhne: o.tom, vorsprungOhne: o.lisa - o.tom, zinsen: b.zinsen, mieteSumme: b.mieteSumme,
    zinsen3Lisa: rechne({ zins: 0.03 }).lisa - rechne({ zins: 0.03 }).tom,
    rendite3Lisa: rechne({ rendite: 0.03 }).lisa - rechne({ rendite: 0.03 }).tom,
    wert1Tom: rechne({ wertStg: 0.01 }).tom - rechne({ wertStg: 0.01 }).lisa,
    wert3Lisa: rechne({ wertStg: 0.03 }).lisa - rechne({ wertStg: 0.03 }).tom,
  };
}

if (typeof process !== "undefined" && import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(videoZahlen(), null, 2));
