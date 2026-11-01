// „Was siehst du, wenn der Boden unter dir 5 Sekunden durchsichtig wird?“ – eigene Rechnung (Account 2).
// Schulhof in der Mitte Deutschlands (Niederdorla), Blick geradeaus durch die Erde bis zum Gegenpunkt im Südpazifik.
// Alle Strecken in km, Zeiten in s bzw. min, Temperaturen in °C.
// Tests: node --test sim/boden_durchsichtig.test.mjs

export const R = 6371; // mittlerer Erdradius (km), IUGG
export const D = 2 * R; // Erddurchmesser 12.742 km
export const G = 9.80665; // m/s²
export const SZ = { dauer: 5 }; // das Szenario: 5 Sekunden

/** Schichtgrenzen (Tiefe in km unter deinen Füßen; Gegenseite gespiegelt) */
export const SCHICHT = {
  kruste: 30, // Krustendicke unter Deutschland ca. 30 km (Moho)
  mantelEnde: 2891, // Kern-Mantel-Grenze ≈ 2.900 km
  aeussererKernEnde: 5150, // Grenze äußerer / innerer Kern
};
/** Radien der Grenzflächen (km vom Erdmittelpunkt) */
export const RADIUS = {
  oberflaeche: R,
  moho: R - SCHICHT.kruste, // 6.341
  kernMantel: R - SCHICHT.mantelEnde, // 3.480
  innerer: R - SCHICHT.aeussererKernEnde, // 1.221
};

// ---------------- Geografie (Haversine) ----------------
export const NIEDERDORLA = { lat: 51.16, lon: 10.45 }; // geografischer Mittelpunkt Deutschlands (Vier-Punkt-Methode)
const rad = (g) => (g * Math.PI) / 180;
const normLon = (l) => ((((l + 180) % 360) + 360) % 360) - 180;
/** Gegenpunkt: Breite spiegeln, Länge um 180° drehen */
export const gegenpunkt = ({ lat, lon }) => ({ lat: -lat, lon: normLon(lon + 180) });
/** Großkreisabstand in km (Haversine, Radius R) */
export function haversine(a, b) {
  const dp = rad(b.lat - a.lat), dl = rad(b.lon - a.lon);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
export const GEGENPUNKT = gegenpunkt(NIEDERDORLA); // 51,16° S, 169,55° W

/** Nächstes Land: Antipodeninseln (Neuseeland, Gazetteer-Position der Hauptinsel 49°41′ S, 178°46′ E) */
export const ANTIPODENINSELN = { name: "Antipodeninseln", lat: -(49 + 41 / 60), lon: 178 + 46 / 60 };
/** Weitere Kandidaten (Näherungswerte aus Karten): alles weiter weg als die Antipodeninseln */
export const KANDIDATEN = [
  ANTIPODENINSELN,
  { name: "Bountyinseln", lat: -47.75, lon: 179.05 },
  { name: "Pitt Island (Chatham)", lat: -44.25, lon: -176.2 },
  { name: "Chatham Island", lat: -44.0, lon: -176.5 },
  { name: "Campbell Island", lat: -52.54, lon: 169.15 },
  { name: "Auckland Islands", lat: -50.7, lon: 166.0 },
  { name: "Stewart Island", lat: -47.2, lon: 167.5 },
];
/** Festland Neuseeland: östlichste Küstenpunkte der Südinsel (Näherungswerte) */
export const FESTLAND = [
  { name: "Banks Peninsula (Akaroa Head)", lat: -43.85, lon: 172.98 },
  { name: "Cape Saunders (Otago)", lat: -45.9, lon: 170.75 },
  { name: "Taiaroa Head (Otago)", lat: -45.77, lon: 170.73 },
  { name: "Nugget Point", lat: -46.45, lon: 169.8 },
  { name: "Kaikoura Peninsula", lat: -42.4, lon: 173.7 },
];
export function naechster(punkt, liste) {
  return liste.map((o) => ({ ...o, km: haversine(punkt, o) })).sort((a, b) => a.km - b.km)[0];
}
export const naechstesLand = () => naechster(GEGENPUNKT, KANDIDATEN);
export const naechstesFestland = () => naechster(GEGENPUNKT, FESTLAND);

/** Australien liegt nicht gegenüber: Mitte (ca. 25° S, 134° O) liegt weit vom Gegenpunkt */
export const AUSTRALIEN = { name: "Australien (Mitte)", lat: -25.0, lon: 134.0 };
export const abstandAustralien = () => haversine(GEGENPUNKT, AUSTRALIEN);
/** Nächster Punkt Australiens (Tasmanien, South East Cape, Näherung): trotzdem über 3.000 km weg */
export const AUSTRALIEN_NAH = { name: "Tasmanien (South East Cape)", lat: -43.64, lon: 146.83 };
export const abstandAustralienNah = () => haversine(GEGENPUNKT, AUSTRALIEN_NAH);
/** Wo müsstest du stehen, damit Australien (Mitte) gegenüberliegt? */
export const gegenueberAustralien = () => gegenpunkt(AUSTRALIEN);

// ---------------- Temperatur entlang des Wegs ----------------
// Modellprofil (Näherung, Stützstellen aus Literaturwerten, siehe skript.json): Tiefe km → °C
export const PROFIL = [
  [0, 10],
  [30, 600], // Krusten-Mantel-Grenze, stabil kontinental ca. 500–800 °C
  [100, 1250],
  [410, 1570], // Katsura (Adiabate) ≈ 1.840 K
  [660, 1670], // ≈ 1.940 K
  [2891, 3730], // Kern-Mantel-Grenze ≈ 4.000 K (3.850–4.600 K)
  [5150, 5960], // Grenze innerer Kern: Anzellini 2013, 6.230 K ≈ 5.960 °C
  [6371, 6000], // Mittelpunkt ca. 6.000 °C
];
export function temperaturTiefe(tiefe) {
  const t = Math.max(0, Math.min(R, tiefe));
  for (let i = 1; i < PROFIL.length; i++) {
    const [x0, y0] = PROFIL[i - 1], [x1, y1] = PROFIL[i];
    if (t <= x1) return y0 + ((y1 - y0) * (t - x0)) / (x1 - x0);
  }
  return PROFIL[PROFIL.length - 1][1];
}
/** Temperatur nach `weg` km Strecke (0 … 12.742): hinter dem Mittelpunkt gespiegelt */
export const temperatur = (weg) => temperaturTiefe(weg <= R ? weg : D - weg);
export const SONNENOBERFLAECHE = 5500; // °C, 5.772 K (NASA Sun Fact Sheet) ≈ 5.499 °C
export const KERN_TEMPERATUR = 6000;

/** Schicht nach Strecke: 0 Kruste, 1 Mantel, 2 äußerer Kern, 3 innerer Kern, 4 äußerer Kern, 5 Mantel, 6 Kruste */
export function schichtNr(weg) {
  const a = SCHICHT.kruste, b = SCHICHT.mantelEnde, c = SCHICHT.aeussererKernEnde;
  if (weg < a) return 0;
  if (weg < b) return 1;
  if (weg < c) return 2;
  if (weg <= D - c) return 3;
  if (weg <= D - b) return 4;
  if (weg <= D - a) return 5;
  return 6;
}
/** Zeitleiste der 5 Sekunden: bei welcher Sekunde τ ist der Blick wo? Je Sekunde eine Schicht-Etappe. */
export const ETAPPEN = [0, SCHICHT.kruste, SCHICHT.mantelEnde, SCHICHT.aeussererKernEnde, D - SCHICHT.aeussererKernEnde, D];
/** Strecke nach τ (0 … 5 s) mit gleichmäßigem Tempo je Etappe (eine Etappe = eine Sekunde) */
export function weg(tau) {
  const t = Math.max(0, Math.min(5, tau));
  const i = Math.min(4, Math.floor(t));
  return ETAPPEN[i] + (ETAPPEN[i + 1] - ETAPPEN[i]) * (t - i);
}

// ---------------- Tunnel ohne Luft ----------------
/** Fallzeit durch das Loch (einfache Fahrt) bei gleichmäßiger Dichte: π·√(R/g), in Minuten (Cooper 1966) */
export const fallzeitMin = (r = R, g = G) => (Math.PI * Math.sqrt((r * 1000) / g)) / 60;
export const periodeMin = (r = R, g = G) => 2 * fallzeitMin(r, g);
/** Höchstes Tempo im Mittelpunkt: √(g·R) in km/s */
export const maxTempoKmS = (r = R, g = G) => Math.sqrt(g * r * 1000) / 1000;
/** Ort im Tunnel nach t Minuten (harmonische Schwingung): Abstand vom Start in km (0 … 12.742) */
export const tunnelWeg = (tMin) => (D / 2) * (1 - Math.cos((2 * Math.PI * tMin) / periodeMin()));
/** Tempo im Tunnel nach t Minuten in km/s */
export const tunnelTempo = (tMin) => maxTempoKmS() * Math.abs(Math.sin((2 * Math.PI * tMin) / periodeMin()));
/** Mit realem Dichteprofil (PREM) ca. 38 min 11 s (Klotz 2015); hier nur als Vermerk */
export const FALLZEIT_PREM_MIN = 38 + 11 / 60;

// ---------------- Wasser und Land ----------------
export const WASSERANTEIL = 0.71; // ca. 71 % der Erdoberfläche (USGS)
export const LAND_MIT_LAND_GEGENUEBER = 0.15; // ca. 15 % der Landfläche (Schätzung, Wikipedia/Spilhaus; eigene Kontrolle mit Natural-Earth-Punkten 15,6 %)

export function alles() {
  const land = naechstesLand();
  const fest = naechstesFestland();
  return {
    gegenpunkt: GEGENPUNKT,
    durchmesser_km: D,
    abstand_gegenpunkt_km: haversine(NIEDERDORLA, GEGENPUNKT),
    naechstes_land: { name: land.name, km: land.km },
    naechstes_festland: { name: fest.name, km: fest.km },
    abstand_australien_km: abstandAustralien(),
    abstand_australien_nah_km: abstandAustralienNah(),
    gegenueber_australien: gegenueberAustralien(),
    radien: RADIUS,
    fallzeit_min: fallzeitMin(),
    periode_min: periodeMin(),
    max_tempo_km_s: maxTempoKmS(),
    temperatur: { kruste_ende: temperatur(30), kern_grenze: temperatur(5150), mitte: temperatur(R), sonne: SONNENOBERFLAECHE },
  };
}

if (typeof process !== "undefined" && process.argv && import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(alles(), null, 2));
