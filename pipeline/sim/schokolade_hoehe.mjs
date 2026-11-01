// „Wie hoch bringt dich eine Tafel Schokolade?“ – eigene Rechnung (Account 2, Video 2).
// Gedankenexperiment: Die gesamte Energie einer 100-g-Tafel Vollmilch wird 1:1 zu Höhe (Hubarbeit E = m·g·h).
// Annahmen: keine Luft (kein Luftwiderstand), Start auf Meereshöhe, 75 kg, g = 9,81 m/s², Tafel mit 24 Stückchen.
// Alle Werte in SI (J, m, kg). Tests: node --test sim/schokolade_hoehe.test.mjs

export const KCAL_J = 4184; // 1 kcal = 4,184 kJ (thermochemische Kalorie)
export const SZ = {
  tafelG: 100, // Tafel Vollmilch
  kcalPro100g: 540, // Mittelwert üblicher Etiketten (Spanne 532–577 kcal, siehe skript.json)
  stuecke: 24, // Stückchen je Tafel (Annahme, 4 × 6)
  masseKg: 75, // du
  g: 9.81, // m/s²
  wirkungsgrad: 0.25, // Muskel (Obergrenze der üblichen 20–25 %)
  tntMJproKg: 4.184, // TNT-Äquivalent (Konvention: 1 g TNT = 4.184 J)
};

/** Höhenmarken (m): Bauwerke ab Boden, Berge ü. NHN; „Start auf Meereshöhe“ ist die Vereinfachung. */
export const MARKEN = [
  { id: "dom", name: "Kölner Dom", hoehe: 157 },
  { id: "turm", name: "Berliner Fernsehturm", hoehe: 368 },
  { id: "brocken", name: "Brocken", hoehe: 1141 },
  { id: "feldberg", name: "Feldberg", hoehe: 1493 },
  { id: "zugspitze", name: "Zugspitze", hoehe: 2962 },
];

export const energieJ = (kcal = SZ.kcalPro100g) => kcal * KCAL_J;
export const jouleProMeter = (m = SZ.masseKg, g = SZ.g) => m * g;
/** Höhe aus Energie: h = η·E / (m·g) */
export const hoehe = ({ kcal = SZ.kcalPro100g, m = SZ.masseKg, g = SZ.g, eta = 1 } = {}) => (eta * energieJ(kcal)) / jouleProMeter(m, g);
export const energieProStueckJ = () => energieJ() / SZ.stuecke;
export const hoeheProStueck = () => hoehe() / SZ.stuecke;
/** Höhe nach n vollständig verbrauchten Stückchen */
export const hoeheNachStuecken = (n) => n * hoeheProStueck();
/** Stückchen, das gerade verbraucht wird, wenn du auf Höhe h bist (0 am Boden, 1…24); das Zähler-Display */
export const stueckBeiHoehe = (h) => Math.min(SZ.stuecke, Math.max(0, Math.ceil(h / hoeheProStueck() - 1e-9)));
/** Vollständig verbrauchte Stückchen (floor) */
export const stueckeFertig = (h) => Math.min(SZ.stuecke, Math.floor(h / hoeheProStueck() + 1e-9));
/** Höhe, bei der die Marke überholt wird → Stückchen (laufend) und Fortschritt in Stückchen */
export const markeUeberholt = (marke) => {
  const stuecke = marke.hoehe / hoeheProStueck();
  return { stuecke, laufendesStueck: Math.ceil(stuecke - 1e-9), vollNachStuecken: Math.ceil(stuecke - 1e-9) };
};
/** Wie viele Meter fehlen nach n Stückchen zur Marke? */
export const fehltNach = (n, marke) => marke.hoehe - hoeheNachStuecken(n);
/** Abstand zur Marke am Ende (positiv = darüber) */
export const ueberMarke = (marke, h = hoehe()) => h - marke.hoehe;
/** Pro kg: Schokolade gegenüber TNT */
export const mjProKg = (kcal = SZ.kcalPro100g, g = SZ.tafelG) => (energieJ(kcal) / (g / 1000)) / 1e6;
export const tntFaktor = () => mjProKg() / SZ.tntMJproKg;
/** Mit Muskel-Wirkungsgrad: wirklich erreichte Höhe */
export const hoeheEchtMuskel = (eta = SZ.wirkungsgrad) => hoehe({ eta });
/** Tafeln für ein Ziel (aufgerundet) mit Muskel-Wirkungsgrad */
export const tafelnFuer = (ziel, eta = SZ.wirkungsgrad) => Math.ceil(ziel / hoehe({ eta }) - 1e-9);
/** Mindestens nötige kcal für ein Ziel (Obergrenze der Tafel, ideal) */
export const kcalFuer = (ziel, m = SZ.masseKg, g = SZ.g) => (ziel * jouleProMeter(m, g)) / KCAL_J;

/**
 * Höhenverlauf als Funktion von „verbrauchter Energie“ in Stückchen (stetig) – Grundlage der Szene.
 * s ∈ [0, 24] → Höhe in m (linear: 1:1-Umwandlung).
 */
export const hoeheBeiStueckchen = (s) => Math.max(0, Math.min(SZ.stuecke, s)) * hoeheProStueck();

export function alles() {
  const z = MARKEN.find((x) => x.id === "zugspitze");
  return {
    kcal: SZ.kcalPro100g, energie_J: energieJ(), energie_MJ: energieJ() / 1e6,
    joule_pro_meter: jouleProMeter(), hoehe_m: hoehe(), hoehe_pro_stueck_m: hoeheProStueck(),
    ueber_zugspitze_m: ueberMarke(z), fehlt_nach_23_m: fehltNach(23, z),
    marken: MARKEN.map((m) => ({ ...m, ...markeUeberholt(m), hoehe_nach_stueck: hoeheNachStuecken(markeUeberholt(m).vollNachStuecken) })),
    mj_pro_kg: mjProKg(), tnt_faktor: tntFaktor(),
    hoehe_echt_m: hoeheEchtMuskel(), tafeln_zugspitze_echt: tafelnFuer(z.hoehe),
    min_kcal_zugspitze: kcalFuer(z.hoehe),
    empfindlichkeit: [530, 540, 568, 577].map((k) => ({ kcal: k, hoehe_m: hoehe({ kcal: k }), echt_m: hoehe({ kcal: k, eta: 0.25 }) })),
  };
}

if (typeof process !== "undefined" && process.argv && import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(alles(), null, 2));
