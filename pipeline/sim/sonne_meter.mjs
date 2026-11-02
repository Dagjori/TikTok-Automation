// Account 2: „Was wäre, wenn die Erde jeden Tag 1 Meter näher an die Sonne rücken würde?“ (03.11.2026 mittag)
// Quellen (F): NASA Earth Fact Sheet (Halbachse 149,598 Mio. km, Perihel 147,095, Aphel 152,100 Mio. km, Jahr 365,256 d);
// NASA Sun Fact Sheet (Radius 695.700 km); Erddurchmesser 12.742 km (2 × 6.371 km, NASA Earth Fact Sheet).
// Prämisse 1 m/Tag ist Annahme (A). Anzeige-Plan: 0–18 s 1 Tag, 18–36 s 1 Jahr, 36–58 s Jahre 1 → 10.000 (logarithmisch), HIER 60 s.
export const AE_KM = 149.598e6, PERIHEL_KM = 147.095e6, APHEL_KM = 152.100e6, SONNENRADIUS_KM = 695700, JAHR_D = 365.256;
export const naeherKm = (tage) => tage / 1000; // 1 m pro Tag
export const naeherNachJahren = (j) => naeherKm(j * JAHR_D);
export const jahreBisSonne = () => (AE_KM - SONNENRADIUS_KM) * 1000 / JAHR_D; // bis zur Sonnenoberfläche
export const jahrSchwankungKm = () => APHEL_KM - PERIHEL_KM;

// Anzeige als Funktion der Videozeit t (s)
export function anzeige(t) {
  if (t < 18) return { etikett: "NÄHER AN DER SONNE", wert: t / 18, einheit: "m" };              // 1 Tag in 18 s
  if (t < 36) { const tage = 1 + (t - 18) / 18 * (JAHR_D - 1); return { etikett: "NÄHER AN DER SONNE", wert: tage, einheit: "m" }; }
  if (t < 56) { const j = 10 ** (4 * (t - 36) / 22); return { etikett: "JAHRE", wert: j, naeher_km: naeherNachJahren(j) }; }
  const j = 10 ** (4 * Math.min(t - 36, 22) / 22);
  return { etikett: "ENTFERNUNG ZUR SONNE", wert: AE_KM - naeherNachJahren(j), einheit: "km", hier: t >= 59.5 };
}
export function videoZahlen() {
  return { tag1_m: 1, jahr1_m: JAHR_D, j100_km: naeherNachJahren(100), j10000_km: naeherNachJahren(10000),
    j10000_anteil_erddurchmesser: naeherNachJahren(10000) / 12742, entfernung_nach_10000: AE_KM - naeherNachJahren(10000),
    jahre_bis_sonne: jahreBisSonne(), schwankung_km: jahrSchwankungKm(), schwankung_vs_10000: jahrSchwankungKm() / naeherNachJahren(10000) };
}
if (import.meta.url === `file://${process.argv[1]}`) { console.log(JSON.stringify(videoZahlen(), null, 1)); for (const t of [0, 9, 18, 27, 33, 36, 42, 47, 52, 56, 58, 60]) console.log(t, JSON.stringify(anzeige(t))); }
