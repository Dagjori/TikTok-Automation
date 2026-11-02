// Video-Rechnung „Studium oder Ausbildung: Wer hat mit 40 mehr verdient?“ (Simulierbar, 03.11.2026 mittag).
// Modellrechnung: kumuliertes Nettoeinkommen zweier Modellpersonen bis 40, nominal, konstant je Phase, ohne Inflation/Zinsen.
// Quellen (F): BIBB, Tarifliche Ausbildungsvergütungen 2025 (PM 05.02.2026): Ø 1.209 € brutto/Monat;
// Netto 2026 aus netto.mjs (PAP 2026, SV-Sätze 2026); IAB-Kurzbericht 18/2022 (Stüber): Brutto-Lebensentgelte
// Hochschulabschluss 2,52 Mio. €, Berufsausbildung 1,69 Mio. € (Vollzeit, 18–66, real Basis 2015).
// Gehälter nach der Ausbildung sind Modellwerte (A), unter den Medianen Fachkraft/Experte des Entgeltatlas (S-Plausibilität).
import { netto } from "./netto.mjs";

export const QUELLEN = {
  azubiBrutto: 1209, // BIBB 2025
  iabStudium: 2.52e6,
  iabAusbildung: 1.69e6,
};

// Azubi: Übergangsbereich gilt nicht für Auszubildende (§ 20 Abs. 2 SGB IV), unter 23 kein PV-Kinderlosenzuschlag.
export const azubiNetto = () => netto({ brutto: QUELLEN.azubiBrutto, stkl: 1, kinderlos: false, kirche: false, ohneMidijobPruefung: true }).netto;

export const ANNAHMEN = {
  lena: [ // [vonAlter, bisAlter, netto/Monat]
    [16, 19, 950], // gerundet aus 953,29 €
    [19, 25, 2000], // ca. 2.950 € brutto
    [25, 40, 2400], // ca. 3.600 € brutto
  ],
  tom: [
    [19, 24, 500], // Minijob (unter 603 €-Grenze 2026)
    [24, 30, 2700], // ca. 4.200 € brutto
    [30, 40, 3500], // ca. 5.700 € brutto
  ],
  semesterbeitrag: 300,
  semester: 10,
};

export function summe(phasen, alter, abzug = 0) {
  let s = 0;
  for (const [a, b, m] of phasen) s += m * 12 * Math.max(0, Math.min(alter, b) - a);
  return s - abzug;
}
export const lena = (alter) => summe(ANNAHMEN.lena, alter);
export const tom = (alter) => summe(ANNAHMEN.tom, alter, alter >= 24 ? ANNAHMEN.semesterbeitrag * ANNAHMEN.semester : ANNAHMEN.semesterbeitrag * 2 * Math.max(0, Math.min(alter, 24) - 19));
export const rueckstand = (alter) => lena(alter) - tom(alter);

// Überholzeitpunkt: ab 30 holt Tom (3.500 − 2.400) × 12 = 13.200 €/Jahr auf
export function ueberholAlter() {
  const r30 = rueckstand(30);
  return 30 + r30 / ((3500 - 2400) * 12);
}

export function videoZahlen() {
  return {
    lena19: lena(19), lena24: lena(24), lena30: lena(30), lena40: lena(40),
    tom24: tom(24), tom30: tom(30), tom40: tom(40),
    rueckstand24: rueckstand(24), rueckstand30: rueckstand(30),
    countdown: [33, 35, 37].map((a) => ({ alter: a, rest: rueckstand(a) })),
    ueberholAlter: ueberholAlter(),
    vorsprung40: tom(40) - lena(40),
    iabDifferenz: QUELLEN.iabStudium - QUELLEN.iabAusbildung,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify({ azubiNetto: azubiNetto(), ...videoZahlen() }, null, 2));
