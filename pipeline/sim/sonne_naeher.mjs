// Account 2 (Neufassung 03.11. mittag): „Was wäre, wenn die Erde immer näher an die Sonne rücken würde?“
// Quellen (F): NASA Earth Fact Sheet (149,598 Mio. km); Kopparapu et al. 2013, ApJ 765:131 (Wasserverlust-Grenze 0,99 AE);
// NASA Venus Facts (108 Mio. km, 467 °C); NASA Mercury Facts (58 Mio. km, tags bis 430 °C); NASA Sun Facts (Oberfläche 5.500 °C);
// NASA Sun Fact Sheet (Radius 695.700 km); Parker Solar Probe 24.12.2024: 6,1 Mio. km über der Oberfläche (NASA).
// Physik: Strahlung ∝ 1/r², scheinbare Größe ∝ 1/r; Subsolar-Temperatur (Schwarzkörper, Albedo 0) T = 394 K / √(r/AE) (S).
export const AE = 149.598, R_SONNE = 0.6957; // Mio. km
export const KNOTEN = [[0, AE], [15, 0.99 * AE], [32, 108.2], [45, 57.9], [55, 6.1 + R_SONNE], [60, R_SONNE]];
export function r(t) { // log-linear zwischen Knoten: stetig und monoton
  if (t <= 0) return AE; if (t >= 60) return R_SONNE;
  for (let i = 1; i < KNOTEN.length; i++) { const [t0, r0] = KNOTEN[i - 1], [t1, r1] = KNOTEN[i];
    if (t <= t1) return r0 * (r1 / r0) ** ((t - t0) / (t1 - t0)); }
}
export const strahlung = (rr) => (AE / rr) ** 2;
export const groesse = (rr) => AE / rr;
export const subsolarC = (rr) => 394 / Math.sqrt(rr / AE) - 273.15;
export function anzeige(t) {
  const rr = r(t);
  if (t < 18) return { etikett: "ENTFERNUNG ZUR SONNE", wert: rr, einheit: "MIO. KM" };
  if (t < 44) return { etikett: "SONNENSTRAHLUNG", wert: strahlung(rr), einheit: "× SO STARK" };
  if (t < 55) return { etikett: "SONNE AM HIMMEL", wert: groesse(rr), einheit: "× SO GROSS" };
  return { etikett: "BIS ZUR SONNENOBERFLÄCHE", wert: Math.max(0, rr - R_SONNE), einheit: "MIO. KM", hier: t >= 60 };
}
if (typeof process !== "undefined" && process.argv && import.meta.url === `file://${process.argv[1]}`) for (const t of [0, 13.6, 15, 18, 22.4, 26.8, 31.2, 32, 35.6, 40, 44, 45, 48.8, 51, 53.2, 55, 58, 60]) { const a = anzeige(t); console.log(t, r(t).toFixed(3), a.etikett, a.wert.toFixed(2), "T_subsolar", subsolarC(r(t)).toFixed(0)); }
