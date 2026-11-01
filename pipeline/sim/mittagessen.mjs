// Video-Rechnung „Mittagessen im Job: Selbst kochen oder bestellen, was kostet ein Jahr wirklich?“ (Modellrechnung 2026).
// Läuft in Node (Tests, Auswertung) und im Browser (projekte/mittagessen-job/szene.js). Nutzt das Netto-Modul (netto.mjs, PAP 2026).
//
// Modell (Annahmen A; Quellen und Einordnung: projekte/mittagessen-job/skript.json „quellen“ und „annahmen“):
//   Person: 3.500 € brutto im Monat, 40-Stunden-Woche, Steuerklasse 1, kinderlos, ohne Kirchensteuer (wie „200 € oder 100 € steuerfrei“).
//   220 Arbeitstage im Jahr, an jedem Tag ein Mittagessen.
//   Team KOCHEN (Meal-Prep):  3,50 € je Portion (Zutaten, Strom, Verpackung), 15 Minuten Aufwand je Portion
//                             (Einkaufen, Kochen, Spülen, in Portionen verteilt).
//   Team BESTELLEN:           12,50 € Gericht + 2,50 € Lieferung und Service = 15,00 € je Bestellung, 6 Minuten Aufwand
//                             (Bestellen, Entgegennehmen).
//   Kantine mit Zuschuss:     4,57 € Eigenanteil = Sachbezugswert 2026 für ein Mittagessen (der Arbeitgeber trägt den Rest),
//                             10 Minuten Aufwand (Weg, Anstehen).
//   Zeit wird mit dem Netto-Stundenlohn bewertet (Netto je Monat × 12 / 52 / 40 Wochenstunden): Modellannahme, dass eine Stunde
//   Freizeit so viel „wert“ ist, wie eine Stunde Arbeit netto bringt. Eine Hälfte der Frage ist also Geld, die andere Zeit.
//   Gesamtkosten = Geld + bewertete Zeit.
// Nur Modellrechnung, keine Beratung; keine Anbieter, keine Produkte.
import { netto, P2026 } from "./netto.mjs";

/** Sachbezugswert 2026 für ein Mittag- oder Abendessen (SvEV 2026, F: BMAS/Bundesrat; Quellen in skript.json) */
export const SACHBEZUG_MITTAG_2026 = 4.57;

export const ANNAHMEN = {
  arbeitstage: 220,
  brutto: 3500,
  wochenstunden: 40,
  person: { stkl: 1, kinderlos: true, zusatzbeitrag: P2026.ZUSATZBEITRAG, kirche: false },
  optionen: {
    kochen: { zutaten: 3.5, minuten: 15 },
    bestellen: { gericht: 12.5, lieferung: 2.5, minuten: 6 },
    kantine: { eigenanteil: SACHBEZUG_MITTAG_2026, minuten: 10 },
  },
};

const r2 = (x) => Math.round((x + Math.sign(x) * 1e-9) * 100) / 100;

/** Netto-Stundenlohn: Netto je Monat × 12 Monate / 52 Wochen / Wochenstunden */
export function nettoStundenlohn(brutto = ANNAHMEN.brutto, wochenstunden = ANNAHMEN.wochenstunden, person = ANNAHMEN.person) {
  const n = netto({ brutto, ...person });
  return (n.netto * 12) / 52 / wochenstunden;
}

/** Geld je Mittag (€) einer Option */
export function geldProTag(id, A = ANNAHMEN) {
  const o = A.optionen[id];
  if (id === "kochen") return o.zutaten;
  if (id === "bestellen") return o.gericht + o.lieferung;
  if (id === "kantine") return o.eigenanteil;
  throw new Error(`Option „${id}“ unbekannt`);
}

/** Jahreswerte einer Option: Geld, Zeit (Minuten, Stunden), bewertete Zeit, Gesamt (alles in €, ungerundet) */
export function option(id, A = ANNAHMEN, stundenlohn = nettoStundenlohn(A.brutto, A.wochenstunden, A.person)) {
  const o = A.optionen[id];
  const tage = A.arbeitstage;
  const geld = geldProTag(id, A) * tage;
  const minuten = o.minuten * tage;
  const stunden = minuten / 60;
  const zeitwert = stunden * stundenlohn;
  return { id, tage, geldProTag: geldProTag(id, A), minutenProTag: o.minuten, geld, minuten, stunden, zeitwert, gesamt: geld + zeitwert };
}

/** Alle drei Optionen, Rangfolge nach Gesamtkosten und Abstände */
export function vergleich(A = ANNAHMEN) {
  const sl = nettoStundenlohn(A.brutto, A.wochenstunden, A.person);
  const k = option("kochen", A, sl), b = option("bestellen", A, sl), c = option("kantine", A, sl);
  const rang = [k, b, c].sort((x, y) => x.gesamt - y.gesamt).map((x) => x.id);
  return {
    stundenlohn: sl, kochen: k, bestellen: b, kantine: c, rang,
    nurGeld: [k, b, c].sort((x, y) => x.geld - y.geld).map((x) => x.id),
    // Kochen gegen Bestellen
    geldVorteilKochen: b.geld - k.geld, // Kochen spart Geld
    zeitNachteilKochen: k.zeitwert - b.zeitwert, // Kochen kostet mehr Zeit
    vorteilKochenGesamt: b.gesamt - k.gesamt,
    faktorBestellenKochen: b.gesamt / k.gesamt,
    // Kantine gegen Kochen (Gesamt): positiv = Kantine günstiger
    kantineVorKochen: k.gesamt - c.gesamt,
  };
}

/**
 * Kipppunkt: ab wie vielen Minuten Kochzeit je Portion ist `gegen` („kantine“ | „bestellen“) insgesamt günstiger als Kochen?
 * Kochen: zutaten + min/60·sl  =  gegen: geldProTag + minGegen/60·sl  →  min = (geldGegen − zutaten)/sl·60 + minGegen
 */
export function kippKochminuten(gegen, A = ANNAHMEN) {
  const sl = nettoStundenlohn(A.brutto, A.wochenstunden, A.person);
  return ((geldProTag(gegen, A) - A.optionen.kochen.zutaten) / sl) * 60 + A.optionen[gegen].minuten;
}

/** Verlauf über die Arbeitstage: Geld, Zeit (Stunden) und Gesamt einer Option nach `tag` Tagen (0..arbeitstage, auch gebrochen) */
export function verlauf(id, tag, A = ANNAHMEN, stundenlohn = nettoStundenlohn(A.brutto, A.wochenstunden, A.person)) {
  const o = A.optionen[id];
  const d = Math.max(0, Math.min(tag, A.arbeitstage));
  const geld = geldProTag(id, A) * d;
  const stunden = (o.minuten * d) / 60;
  return { geld, stunden, zeitwert: stunden * stundenlohn, gesamt: geld + stunden * stundenlohn };
}

/**
 * Empfindlichkeit: Rangfolge bei abweichenden Annahmen. Gibt für jede Variante die Rangfolge nach Gesamtkosten zurück.
 * Prüft damit, welche Aussagen der Annahme unabhängig halten (Bestellen ist immer Letzter) und welche nicht (Kochen gegen Kantine).
 */
export function empfindlichkeit(A = ANNAHMEN) {
  const kopie = () => JSON.parse(JSON.stringify(A));
  const lauf = (name, aend) => {
    const B = kopie();
    aend(B);
    const v = vergleich(B);
    return { name, rang: v.rang, kochen: v.kochen.gesamt, bestellen: v.bestellen.gesamt, kantine: v.kantine.gesamt };
  };
  const ergebnis = [];
  for (const z of [2.5, 3.5, 5]) for (const m of [10, 15, 25]) ergebnis.push(lauf(`Zutaten ${z} €, Kochzeit ${m} min`, (B) => { B.optionen.kochen.zutaten = z; B.optionen.kochen.minuten = m; }));
  for (const w of [5, 10, 15]) ergebnis.push(lauf(`Weg zur Kantine ${w} min`, (B) => { B.optionen.kantine.minuten = w; }));
  for (const p of [10, 12.5, 15]) ergebnis.push(lauf(`Gericht ${p} €`, (B) => { B.optionen.bestellen.gericht = p; }));
  for (const t of [200, 220, 230]) ergebnis.push(lauf(`${t} Arbeitstage`, (B) => { B.arbeitstage = t; }));
  return ergebnis;
}

/** Alle Zahlen des Videos, gerundet wie im Bild und im Text */
export function videoZahlen(A = ANNAHMEN) {
  const v = vergleich(A);
  const eur = (x) => Math.round(x);
  return {
    hinweis: "Modellrechnung 2026 aus pipeline/sim/mittagessen.mjs (Netto-Modul pipeline/sim/netto.mjs)",
    arbeitstage: A.arbeitstage,
    brutto: A.brutto,
    netto_monat: r2(netto({ brutto: A.brutto, ...A.person }).netto),
    netto_stundenlohn: r2(v.stundenlohn),
    kochen: { zutaten: A.optionen.kochen.zutaten, minuten: A.optionen.kochen.minuten, geld: eur(v.kochen.geld), stunden: eur(v.kochen.stunden), zeitwert: eur(v.kochen.zeitwert), gesamt: eur(v.kochen.gesamt), gesamt_genau: r2(v.kochen.gesamt) },
    bestellen: { gericht: A.optionen.bestellen.gericht, lieferung: A.optionen.bestellen.lieferung, je_bestellung: geldProTag("bestellen", A), minuten: A.optionen.bestellen.minuten, geld: eur(v.bestellen.geld), stunden: eur(v.bestellen.stunden), zeitwert: eur(v.bestellen.zeitwert), gesamt: eur(v.bestellen.gesamt), gesamt_genau: r2(v.bestellen.gesamt) },
    kantine: { eigenanteil: A.optionen.kantine.eigenanteil, minuten: A.optionen.kantine.minuten, geld: eur(v.kantine.geld), stunden: eur(v.kantine.stunden), zeitwert: eur(v.kantine.zeitwert), gesamt: eur(v.kantine.gesamt), gesamt_genau: r2(v.kantine.gesamt) },
    geld_vorteil_kochen: eur(v.geldVorteilKochen),
    zeit_nachteil_kochen: eur(v.zeitNachteilKochen),
    vorteil_kochen_gesamt: eur(v.vorteilKochenGesamt),
    faktor_bestellen_kochen: r2(v.faktorBestellenKochen),
    kantine_vor_kochen: eur(v.kantineVorKochen),
    kipp_kochminuten_kantine: r2(kippKochminuten("kantine", A)),
    kipp_kochminuten_bestellen: r2(kippKochminuten("bestellen", A)),
    rang: v.rang,
  };
}
