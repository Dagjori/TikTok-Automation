// Sonne und Mond über Berlin (Entscheidung 03.11.: Tag und Nacht der Neon-Stadt laufen in Echtzeit nach Berliner Sonnenstand).
// Formeln nach den üblichen astronomischen Näherungen (wie SunCalc, Genauigkeit etwa eine Minute); rechnet in UTC, die
// Zeitzone des Rechners spielt also keine Rolle. Keine Abhängigkeiten, damit es auch unter Node getestet werden kann.
export const BERLIN = { breite: 52.52, laenge: 13.405 };

const RAD = Math.PI / 180, TAG_MS = 86400000, J1970 = 2440588, J2000 = 2451545, NEIGUNG = RAD * 23.4397;
const tage = (datum) => datum.valueOf() / TAG_MS - 0.5 + J1970 - J2000;
const ausJulian = (j) => new Date((j + 0.5 - J1970) * TAG_MS);
const rektaszension = (l, b) => Math.atan2(Math.sin(l) * Math.cos(NEIGUNG) - Math.tan(b) * Math.sin(NEIGUNG), Math.cos(l));
const deklination = (l, b) => Math.asin(Math.sin(b) * Math.cos(NEIGUNG) + Math.cos(b) * Math.sin(NEIGUNG) * Math.sin(l));
const sternzeit = (d, lw) => RAD * (280.16 + 360.9856235 * d) - lw;
const hoeheAus = (H, phi, dek) => Math.asin(Math.sin(phi) * Math.sin(dek) + Math.cos(phi) * Math.cos(dek) * Math.cos(H));
// Azimut von Süden aus, nach Westen positiv; umgerechnet in eine Kompassrichtung (0 = Nord, im Uhrzeigersinn)
const kompassAus = (H, phi, dek) => (Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dek) * Math.cos(phi)) + Math.PI) % (2 * Math.PI);
const mittlereAnomalie = (d) => RAD * (357.5291 + 0.98560028 * d);
function ekliptikLaenge(M) {
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  return M + C + RAD * 102.9372 + Math.PI;
}
function sonnenKoordinaten(d) {
  const L = ekliptikLaenge(mittlereAnomalie(d));
  return { dek: deklination(L, 0), ra: rektaszension(L, 0) };
}
function brechung(h) { // Lichtbrechung der Atmosphäre in Horizontnähe
  if (h < 0) h = 0;
  return 0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179));
}

/** Sonnenstand: hoehe und kompass in Bogenmaß, hoeheGrad zum Ablesen */
export function sonnenstand(datum = new Date(), ort = BERLIN) {
  const lw = RAD * -ort.laenge, phi = RAD * ort.breite, d = tage(datum), k = sonnenKoordinaten(d);
  const H = sternzeit(d, lw) - k.ra;
  const hoehe = hoeheAus(H, phi, k.dek);
  return { hoehe, kompass: kompassAus(H, phi, k.dek), hoeheGrad: hoehe / RAD };
}

/** Aufgang, Untergang und Mittag des Kalendertags von datum (Sonnenmitte 0,833° unter dem Horizont) */
export function sonnenzeiten(datum = new Date(), ort = BERLIN) {
  const lw = RAD * -ort.laenge, phi = RAD * ort.breite, d = tage(datum);
  const J0 = 0.0009;
  const n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = J0 + lw / (2 * Math.PI) + n;
  const M = mittlereAnomalie(ds), L = ekliptikLaenge(M), dek = deklination(L, 0);
  const durchgang = (a) => J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const mittag = durchgang(ds);
  const zeit = (hGrad) => {
    const w = Math.acos((Math.sin(hGrad * RAD) - Math.sin(phi) * Math.sin(dek)) / (Math.cos(phi) * Math.cos(dek)));
    if (Number.isNaN(w)) return null;
    const unter = durchgang(J0 + (w + lw) / (2 * Math.PI) + n);
    return { auf: ausJulian(mittag - (unter - mittag)), unter: ausJulian(unter) };
  };
  const sonne = zeit(-0.833), daemmerung = zeit(-6);
  return { mittag: ausJulian(mittag), aufgang: sonne?.auf ?? null, untergang: sonne?.unter ?? null, daemmerungAnfang: daemmerung?.auf ?? null, daemmerungEnde: daemmerung?.unter ?? null };
}

function mondKoordinaten(d) {
  const L = RAD * (218.316 + 13.176396 * d), M = RAD * (134.963 + 13.064993 * d), F = RAD * (93.272 + 13.22935 * d);
  const l = L + RAD * 6.289 * Math.sin(M), b = RAD * 5.128 * Math.sin(F);
  return { ra: rektaszension(l, b), dek: deklination(l, b), entfernung: 385001 - 20905 * Math.cos(M) };
}

/** Mondstand wie sonnenstand */
export function mondstand(datum = new Date(), ort = BERLIN) {
  const lw = RAD * -ort.laenge, phi = RAD * ort.breite, d = tage(datum), k = mondKoordinaten(d);
  const H = sternzeit(d, lw) - k.ra;
  let hoehe = hoeheAus(H, phi, k.dek);
  hoehe += brechung(hoehe);
  return { hoehe, kompass: kompassAus(H, phi, k.dek), hoeheGrad: hoehe / RAD };
}

/** Beleuchteter Anteil des Mondes (0–1) und Phase (0 = Neumond, 0,5 = Vollmond) */
export function mondphase(datum = new Date()) {
  const d = tage(datum), s = sonnenKoordinaten(d), m = mondKoordinaten(d), sAbstand = 149598000;
  const phi = Math.acos(Math.sin(s.dek) * Math.sin(m.dek) + Math.cos(s.dek) * Math.cos(m.dek) * Math.cos(s.ra - m.ra));
  const winkelInnen = Math.atan2(sAbstand * Math.sin(phi), m.entfernung - sAbstand * Math.cos(phi));
  const lage = Math.atan2(Math.cos(s.dek) * Math.sin(s.ra - m.ra), Math.sin(s.dek) * Math.cos(m.dek) - Math.cos(s.dek) * Math.sin(m.dek) * Math.cos(s.ra - m.ra));
  return { anteil: (1 + Math.cos(winkelInnen)) / 2, phase: 0.5 + (0.5 * winkelInnen * (lage < 0 ? -1 : 1)) / Math.PI };
}

/** Tagesabschnitt aus der Sonnenhöhe in Grad, für Anzeige und Stimmung */
export function abschnitt(hoeheGrad) {
  if (hoeheGrad >= 12) return "Tag";
  if (hoeheGrad >= 2) return "Goldene Stunde";
  if (hoeheGrad >= -1) return "Sonnenuntergang";
  if (hoeheGrad >= -6) return "Dämmerung";
  if (hoeheGrad >= -12) return "Blaue Stunde";
  return "Nacht";
}
