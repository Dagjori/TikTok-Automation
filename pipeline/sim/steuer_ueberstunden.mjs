// Video-Rechnung „Steuererklärung oder Überstunden: Was bringt dir mehr Geld pro Stunde?“ (Modellrechnung 2026).
// Nutzt das Netto-Modul (netto.mjs, PAP 2026). Läuft in Node (Tests, Auswertung) und im Browser (projekte/steuer-ueberstunden/szene.js).
//
// Duell (Annahmen A, Rechtsgrundlagen F; Quellen: projekte/steuer-ueberstunden/skript.json „quellen“):
//   Gleiche Person: 3.500 € brutto im Monat, 40-Stunden-Woche, Steuerklasse 1, kinderlos (über 23), gesetzlich versichert mit dem
//   durchschnittlichen Zusatzbeitrag 2026 (2,9 %), ohne Kirchensteuer. Nach Feierabend sind 4 Stunden frei (Zeitaufwand einer
//   Steuererklärung laut Bundesregierung knapp 4 Stunden, 3 h 50 min).
//   Team ÜBERSTUNDEN: 4 bezahlte Überstunden zum normalen Stundenlohn, ohne Zuschlag. Sie sind 2026 voll steuer- und
//                     beitragspflichtig (eine Steuerbefreiung für Überstundenzuschläge ist geplant, aber nicht in Kraft; sie beträfe
//                     ohnehin nur den Zuschlag, nicht die Stunde selbst).
//   Team STEUERERKLÄRUNG: 4 Stunden für die Erklärung. Erstattung = Lohnsteuer laut Abzug minus festgesetzte Einkommensteuer.
//                     Modell: Einziger Unterschied zwischen Lohnsteuerabzug und Veranlagung sind die Werbungskosten über dem
//                     Arbeitnehmer-Pauschbetrag (1.230 €, § 9a EStG), den der Lohnsteuerabzug schon berücksichtigt.
//   Fall A (Pendler): 25 km einfache Strecke, 3 Bürotage + 2 Homeoffice-Tage pro Woche, 46 Arbeitswochen (230 Arbeitstage),
//                     Arbeitsmittel 120 €, Kontoführung 16 €.
//   Fall B (kurzer Weg): 5 km, 230 Bürotage, kein Homeoffice, keine Arbeitsmittel, Kontoführung 16 €.
// Entfernungspauschale 2026: 0,38 € je Entfernungskilometer ab dem ersten Kilometer (§ 9 Abs. 1 Satz 3 Nr. 4 EStG,
// Steueränderungsgesetz 2025). Homeoffice-Pauschale: 6 € je Tag, höchstens 1.260 € (§ 4 Abs. 5 Satz 1 Nr. 6c EStG).
// Nur Modellrechnung, keine Steuerberatung.
import { netto, grenzbelastung, lohnsteuerMonat, tarif, P2026 } from "./netto.mjs";

export const REGELN = {
  pauschbetrag: P2026.ANP, // 1.230 €
  kmSatz: 0.38, // € je Entfernungskilometer und Arbeitstag, ab dem 1. km (2026)
  homeofficeTag: 6, // € je Tag
  homeofficeMax: 1260, // € im Jahr
  kontofuehrung: 16, // € im Jahr (Verwaltungspraxis ohne Nachweis)
};

export const ANNAHMEN = {
  brutto: 3500,
  wochenstunden: 40,
  stunden: 4, // Zeitaufwand Steuererklärung bzw. Überstunden
  person: { stkl: 1, kinderlos: true, zusatzbeitrag: P2026.ZUSATZBEITRAG, kirche: false },
  arbeitstage: 230,
  fallA: { km: 25, buerotage: 138, homeofficeTage: 92, arbeitsmittel: 120, kontofuehrung: 16 },
  fallB: { km: 5, buerotage: 230, homeofficeTage: 0, arbeitsmittel: 0, kontofuehrung: 16 },
};

const r2 = (x) => Math.round(x * 100) / 100;

/** Brutto-Stundenlohn aus dem Monatsbrutto: Monat = 52/12 Wochen */
export function stundenlohn(brutto = ANNAHMEN.brutto, wochenstunden = ANNAHMEN.wochenstunden) {
  return (brutto * 12) / 52 / wochenstunden;
}

/**
 * Netto von n Überstunden im selben Monat (laufender Arbeitslohn): netto(mit) − netto(ohne).
 * zuschlag: Anteil (0.25 = 25 %); zuschlagSteuerfrei: nur Modellvariante für die geplante, NICHT geltende Befreiung
 * (Zuschlag lohnsteuerfrei, aber beitragspflichtig).
 */
export function ueberstunden({ n = ANNAHMEN.stunden, brutto = ANNAHMEN.brutto, zuschlag = 0, zuschlagSteuerfrei = false, person = ANNAHMEN.person } = {}) {
  const lohn = stundenlohn(brutto);
  const grund = r2(lohn * n);
  const zu = r2(grund * zuschlag);
  const plus = r2(grund + zu);
  const g = grenzbelastung({ brutto, plus, ...person });
  let nettoPlus = g.netto;
  if (zuschlagSteuerfrei && zu > 0) {
    // Lohnsteuer nur auf die Grundvergütung, Sozialabgaben auf alles
    const ohne = netto({ brutto, ...person });
    const lstNur = lohnsteuerMonat({ brutto: brutto + grund, ...person });
    const lstOhne = lohnsteuerMonat({ brutto, ...person });
    const steuer = r2(lstNur.lst + lstNur.soli - lstOhne.lst - lstOhne.soli);
    const sozial = r2(netto({ brutto: brutto + plus, ...person }).sozial - ohne.sozial);
    nettoPlus = r2(plus - steuer - sozial);
  }
  return {
    n,
    stundenlohnBrutto: lohn,
    brutto: plus,
    netto: nettoPlus,
    proStunde: nettoPlus / n,
    lohnsteuer: g.lohnsteuer,
    soli: g.soli,
    sozial: g.sozial,
    abzug: r2(plus - nettoPlus),
    abzugQuote: (plus - nettoPlus) / plus,
  };
}

/** Werbungskosten eines Falls, aufgeteilt in Posten (Reihenfolge = Eintragen im Video) */
export function werbungskosten(fall) {
  const posten = [];
  if (fall.kontofuehrung) posten.push({ id: "konto", label: "KONTOFÜHRUNG", betrag: fall.kontofuehrung });
  if (fall.arbeitsmittel) posten.push({ id: "mittel", label: "ARBEITSMITTEL", betrag: fall.arbeitsmittel });
  if (fall.homeofficeTage) posten.push({ id: "ho", label: "HOMEOFFICE", betrag: Math.min(REGELN.homeofficeMax, fall.homeofficeTage * REGELN.homeofficeTag), tage: fall.homeofficeTage });
  if (fall.km && fall.buerotage) posten.push({ id: "weg", label: "PENDELWEG", betrag: r2(fall.km * REGELN.kmSatz * fall.buerotage), km: fall.km, tage: fall.buerotage });
  let summe = 0;
  for (const p of posten) p.summe = r2((summe += p.betrag));
  return { posten, summe: r2(summe) };
}

/** Soli auf eine Jahressteuer (Freigrenze, Milderungszone), wie netto.mjs (PAP MSOLZ), Grundtabelle */
function soli(st) {
  if (st <= P2026.SOLZFREI) return 0;
  return Math.min(Math.floor(st * 5.5) / 100, Math.floor((st - P2026.SOLZFREI) * 11.9) / 100);
}

/**
 * Erstattung durch Werbungskosten über dem Pauschbetrag: Einkommensteuer (+ Soli) ohne minus mit den zusätzlichen Werbungskosten.
 * Grundlage: zu versteuerndes Einkommen wie im Lohnsteuerabzug (PAP, mit Arbeitnehmer-Pauschbetrag und Vorsorgepauschale).
 */
export function erstattung(wk, { brutto = ANNAHMEN.brutto, person = ANNAHMEN.person } = {}) {
  const ls = lohnsteuerMonat({ brutto, ...person });
  const zve = ls.zve;
  const extra = Math.max(0, wk - REGELN.pauschbetrag);
  const stOhne = tarif(zve), stMit = tarif(Math.max(0, zve - extra));
  const betrag = r2(stOhne - stMit + soli(stOhne) - soli(stMit));
  return { wk, extra, zve, stOhne, stMit, betrag, grenzsatz: extra > 0 ? (stOhne - stMit) / extra : (tarif(zve) - tarif(zve - 100)) / 100 };
}

/** Steuererklärung eines Falls mit Zwischenständen je Posten (für die Live-Zähler) */
export function steuererklaerung(fall, opt = {}) {
  const w = werbungskosten(fall);
  const posten = w.posten.map((p) => ({ ...p, erstattung: erstattung(p.summe, opt).betrag }));
  const e = erstattung(w.summe, opt);
  return { posten, wk: w.summe, ueberPausch: e.extra, erstattung: e.betrag, grenzsatz: e.grenzsatz, proStunde: e.betrag / (opt.stunden ?? ANNAHMEN.stunden) };
}

/** Ab wie vielen Kilometern (nur Bürotage, ohne Homeoffice) wirkt die Erklärung überhaupt bzw. schlägt sie die Überstunden? */
export function kipppunkte({ buerotage = ANNAHMEN.arbeitstage, kontofuehrung = 16, arbeitsmittel = 0 } = {}) {
  const ue = ueberstunden().netto;
  let ersterEuro = null, schlaegt = null;
  for (let km = 1; km <= 100; km++) {
    const s = steuererklaerung({ km, buerotage, homeofficeTage: 0, arbeitsmittel, kontofuehrung });
    if (ersterEuro === null && s.erstattung > 0) ersterEuro = km;
    if (schlaegt === null && s.erstattung > ue) schlaegt = km;
  }
  return { ersterEuro, schlaegt };
}

/** Alle Zahlen für das Video */
export function videoZahlen() {
  const ue = ueberstunden();
  const a = steuererklaerung(ANNAHMEN.fallA);
  const b = steuererklaerung(ANNAHMEN.fallB);
  return {
    stundenlohn: stundenlohn(),
    ue,
    ueZuschlag: ueberstunden({ zuschlag: 0.25 }),
    ueZuschlagPlan: ueberstunden({ zuschlag: 0.25, zuschlagSteuerfrei: true }),
    fallA: a,
    fallB: b,
    kipp: kipppunkte(),
    faktorA: a.proStunde / ue.proStunde,
    nettoBasis: netto({ brutto: ANNAHMEN.brutto, ...ANNAHMEN.person }),
  };
}
