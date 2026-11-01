// Video-Rechnung „200 € mehr Gehalt oder 100 € steuerfrei: Was bringt dir netto mehr?“ (Modellrechnung 2026).
// Nutzt das Netto-Modul (netto.mjs). Läuft in Node (Tests, Auswertung) und im Browser (projekte/gehalt-steuerfrei/szene.js).
//
// Duell (Annahmen A, Rechtsgrundlagen F):
//   Team GEHALT:     +200 € brutto im Monat (laufender Arbeitslohn, voll steuer- und beitragspflichtig)
//   Team STEUERFREI: +100 € im Monat als
//                      50 € Sachbezug (Gutschein/Geldkarte, 50-€-Freigrenze § 8 Abs. 2 Satz 11 EStG) und
//                      50 € Zuschuss zum Jobticket (§ 3 Nr. 15 EStG; Deutschlandticket 2026: 63 €),
//                    beides zusätzlich zum ohnehin geschuldeten Arbeitslohn (§ 8 Abs. 4 EStG), daher steuer- und
//                    sozialversicherungsfrei (§ 1 Abs. 1 Satz 1 Nr. 1 SvEV bzw. § 3 Abs. 1 SvEV).
//   Person: 3.500 € brutto, Steuerklasse 1, kinderlos (über 23), gesetzlich versichert mit durchschnittlichem
//           Zusatzbeitrag 2,9 %, ohne Kirchensteuer, nicht Sachsen.
// Zweite Überraschung: gleiche Rechnung bei 5.500 € brutto. Nachteil der Extras: keine Rentenpunkte.
import { netto, grenzbelastung, rentenpunkte, P2026 } from "./netto.mjs";

export const ANNAHMEN = {
  brutto: 3500,
  bruttoHoch: 5500,
  plusGehalt: 200,
  gutschein: 50,
  jobticket: 50,
  person: { stkl: 1, kinderlos: true, zusatzbeitrag: P2026.ZUSATZBEITRAG, kirche: false },
};

/** Was von +200 € brutto ankommt, aufgeteilt in die Abzüge (Reihenfolge wie im Video) */
export function duell(brutto = ANNAHMEN.brutto, opt = {}) {
  const a = { ...ANNAHMEN, ...opt };
  const g = grenzbelastung({ brutto, plus: a.plusGehalt, ...a.person });
  const steuerfrei = a.gutschein + a.jobticket;
  const abzuege = [
    { id: "rv", label: "RENTE", betrag: g.rv },
    { id: "kv", label: "KRANKEN", betrag: g.kv },
    { id: "pv", label: "PFLEGE", betrag: g.pv },
    { id: "av", label: "ARBEITSLOS", betrag: g.av },
    { id: "lst", label: "LOHNSTEUER", betrag: g.lohnsteuer },
  ];
  if (g.soli > 0) abzuege.push({ id: "soli", label: "SOLI", betrag: g.soli });
  if (g.kirchensteuer > 0) abzuege.push({ id: "kist", label: "KIRCHE", betrag: g.kirchensteuer });
  // Zwischenstände: Netto des Gehaltsplus nach jedem Abzug
  let rest = a.plusGehalt;
  const verlauf = abzuege.map((x) => ({ ...x, rest: (rest = Math.round((rest - x.betrag) * 100) / 100) }));
  return {
    brutto,
    plus: a.plusGehalt,
    gehaltNetto: g.netto,
    steuerfrei,
    differenz: Math.round((g.netto - steuerfrei) * 100) / 100,
    sieger: g.netto > steuerfrei ? "gehalt" : g.netto < steuerfrei ? "steuerfrei" : "gleich",
    sozial: g.sozial,
    steuern: g.steuern,
    abzugGesamt: Math.round((a.plusGehalt - g.netto) * 100) / 100,
    abzugQuote: (a.plusGehalt - g.netto) / a.plusGehalt,
    abzuege: verlauf,
    vorher: g.vorher,
    nachher: g.nachher,
  };
}

/** Ab welchem Monatsbrutto bringen +200 € brutto weniger als 100 € netto? (Schritt 10 €) */
export function kipppunkt({ von = 2100, bis = 9000, schritt = 10, ...opt } = {}) {
  for (let b = von; b <= bis; b += schritt) if (duell(b, opt).gehaltNetto < ANNAHMEN.gutschein + ANNAHMEN.jobticket) return b;
  return null;
}

/** Rente: Was bringen +200 € brutto für ein Jahr an Entgeltpunkten und Monatsrente (Werte 2026, ohne Dynamik) */
export function renteGehalt(plusMonat = ANNAHMEN.plusGehalt, jahre = 1) {
  const r = rentenpunkte(plusMonat * 12);
  return { entgeltpunkte: r.entgeltpunkte * jahre, renteMonat: r.renteMonat * jahre };
}

/** Alle Zahlen für das Video */
export function videoZahlen() {
  const basis = duell(ANNAHMEN.brutto);
  const hoch = duell(ANNAHMEN.bruttoHoch);
  return {
    basis,
    hoch,
    kipppunkt: kipppunkt(),
    rente1: renteGehalt(200, 1),
    rente30: renteGehalt(200, 30),
    nettoBasis: netto({ brutto: ANNAHMEN.brutto, ...ANNAHMEN.person }),
    nettoHoch: netto({ brutto: ANNAHMEN.bruttoHoch, ...ANNAHMEN.person }),
  };
}
