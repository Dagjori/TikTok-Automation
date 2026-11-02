// Account 2 (Neufassung 03.11. abend): „Was wäre, wenn der Mond der Erde immer näher käme?“
// Quellen (F): NASA Moon Fact Sheet (384.400 km, Dichte 3.344 kg/m³); NASA Earth Fact Sheet (Radius 6.371 km, Dichte 5.514 kg/m³);
// NOAA (Gezeitenkraft ∝ 1/r³); ESA/AMS (geostationäre Bahn 35.786 km Höhe = 42.164 km vom Erdmittelpunkt);
// Roche-Grenze (flüssiger Satellit) d = 2,44 · R · (ρ_Erde/ρ_Mond)^(1/3) (S, Standardformel); NASA GSFC Mondlaser 3,8 cm/Jahr.
export const D0 = 384400, R_E = 6371, RHO_E = 5514, RHO_M = 3344, GEO = 42164;
export const ROCHE = 2.44 * R_E * (RHO_E / RHO_M) ** (1 / 3); // ≈ 18.367 km
export const ROCHE_STARR = 1.26 * R_E * (RHO_E / RHO_M) ** (1 / 3); // ≈ 9.485 km
export const KNOTEN = [[0, D0], [20, D0 / 2], [32, D0 / 4], [44, GEO], [60, ROCHE]];
export function d(t) {
  if (t <= 0) return D0; if (t >= 60) return ROCHE;
  for (let i = 1; i < KNOTEN.length; i++) { const [t0, a] = KNOTEN[i - 1], [t1, b] = KNOTEN[i];
    if (t <= t1) return a * (b / a) ** ((t - t0) / (t1 - t0)); }
}
export const groesse = (x) => D0 / x, gezeiten = (x) => (D0 / x) ** 3, licht = (x) => (D0 / x) ** 2;
export function anzeige(t) {
  const x = d(t);
  if (t < 20) return { etikett: "ENTFERNUNG ZUM MOND", wert: x, einheit: "KM" };
  if (t < 44) return { etikett: "GEZEITENKRAFT", wert: gezeiten(x), einheit: "× SO STARK" };
  return { etikett: "BIS ZUR ROCHE-GRENZE", wert: Math.max(0, x - ROCHE), einheit: "KM", hier: t >= 60 };
}
if (import.meta.url === `file://${process.argv[1]}`) { console.log({ ROCHE, ROCHE_STARR, geoGez: gezeiten(GEO), geoGr: groesse(GEO), rocheGez: gezeiten(ROCHE), rocheGr: groesse(ROCHE) });
  for (const t of [0, 13.6, 18, 20, 22, 22.4, 26.8, 31.2, 32, 35.6, 40, 44, 48.8, 53.2, 60]) { const a = anzeige(t); console.log(t, Math.round(d(t)), a.etikett, a.wert.toFixed(1), "gr", groesse(d(t)).toFixed(1), "licht", licht(d(t)).toFixed(1)); } }
