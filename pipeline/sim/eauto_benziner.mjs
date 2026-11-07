// Elektroauto oder Benziner: Welches kostet in 5 Jahren weniger? (Slot acc1-2026-11-07-mittag). Quellen intern in skript.json.
// Vollkosten nach ADAC (Wertverlust ohne Zinsen, Werkstatt, Reifen, Versicherung, Kfz-Steuer, Energie nach WLTP) in ct/km bei 15.000 km/Jahr.
// Kosten = ct/km × 75.000 km / 100. Alle Zahlen im Bild kommen aus dieser Datei.
export const P = {
  kmJahr: 15000, jahre: 5,
  preisStromer: 45990, preisBenziner: 37790,
  ctKmBenziner: 66.7,
  // Stromer: Ladepreis in ct/kWh -> Vollkosten in ct/km (ADAC-Tabellen _18/_35/_45/_60)
  ctKmStromer: { 60: 71.0, 45: 69.0, 35: 67.4, 18: 65.0 },
  praemie: 3000,
};
export const km = () => P.kmJahr * P.jahre;
export const kosten = (ctKm) => Math.round((ctKm * km()) / 100 * 100) / 100;
export const monat = (ctKm) => Math.round(ctKm * (P.kmJahr / 12)) / 100;
export const benziner = () => kosten(P.ctKmBenziner);
export const stromer = (ct, mitPraemie = false) => kosten(P.ctKmStromer[ct]) - (mitPraemie ? P.praemie : 0);
/** Vorsprung des Benziners (positiv) bzw. des Stromers (negativ) je Ladepreis */
export const vorsprungBenziner = (ct, mitPraemie = false) => Math.round((stromer(ct, mitPraemie) - benziner()) * 100) / 100;
/** Kostenverlauf beider Autos nach Anteil u (0–1) der 75.000 km in der Runde mit Ladepreis ct (linear in km) */
export const verlauf = (ct, u, mitPraemie = false) => ({
  benziner: benziner() * u,
  stromer: (kosten(P.ctKmStromer[ct])) * u - (mitPraemie ? P.praemie * u : 0),
});
export function videoZahlen() {
  return {
    km: km(), kaufDiff: P.preisStromer - P.preisBenziner,
    benziner: benziner(), s60: stromer(60), s45: stromer(45), s35: stromer(35), s18: stromer(18),
    v60: vorsprungBenziner(60), v45: vorsprungBenziner(45), v35: vorsprungBenziner(35), v18: vorsprungBenziner(18),
    monatB: monat(P.ctKmBenziner), monat35: monat(P.ctKmStromer[35]),
    spanne: stromer(60) - stromer(18),
    p35: stromer(35, true), pv35: vorsprungBenziner(35, true), p60: stromer(60, true), pv60: vorsprungBenziner(60, true),
  };
}
