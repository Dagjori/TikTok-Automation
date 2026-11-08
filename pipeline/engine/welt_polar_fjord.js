// Welt „Polar / Fjord“ (Account 2 @stelldirvor.pov, Weltenkatalog „Polar / Fjord“), Erstbau 08.11.2026
// („Was wäre, wenn die Erdachse nicht geneigt wäre – Teil 2“, Spitzbergen). NUR für den Baukasten Lunar-POV. Alles prozedural, reine Funktion von t.
//
// STANDPUNKT: Achterdeck eines verankerten Forschungsboots im Adventfjord vor Longyearbyen (78,22° N), Augenhöhe 2,2 m über dem Wasser,
// Heckreling, Schanzkleid, Taue, Rettungsring, Kran mit CTD-Rosette im Vordergrund; Ruderhaus hinter der Kamera (Bug).
// INHALT: Fjord mit echter Spiegelung (Reflector) und Kräuseln, Eisschollen und Ufereis (Parameter eis), Schneeufer, Landzunge mit Rentieren,
// Trapperhütte und Menschen mit Stirnlampen, Hafenort (≈ 150 bunte Holzhäuser mit warmen Fenstern, Kirche, Kraftwerk mit Dampf, Seilbahn-
// Böcke, Tanks, Kai mit Expeditionsschiff, Steg, Straßenlaternen, Schneemobile), flache Plateauberge mit Schichtbändern und Gletscher,
// SvalSat-Kuppeln, freier Südhorizont (Adventdalen, Berge < 3°) und Nordhorizont (Isfjord, Berge < 3°). Himmel mit Dämmerfarben, Sonne,
// Venusgürtel, Sternen und Polarlicht (Vorhänge, Strahlen, Nordhimmel). Licht in fünf Stimmungen, weich überblendet.
//
// ===================================================================================================== API (vollständig)
// Koordinaten: Meter, y oben, Wasserspiegel y = 0, Süden = −z, Westen = +x, Norden = +z, Osten = −x. Kamera (Auge) bei (0, 2,2, 0).
// Gierwinkel „yaw“ in Grad: 0 = Süden, +90 = Westen, ±180 = Norden, −90 = Osten (wie sonnenRichtung/Azimut). pitch + = nach oben.
//
//   import { PolarFjord, Sonnenboegen, sonnenRichtung, sonnenHoeheAz, tagesMittel, tagesbogen, richtung, polarlichtKurve,
//            hoehe, landAbstand, spitPunkt, PHI, AUGE, ORTE, STIMMUNGEN, PolarHimmel } from "../../engine/welt_polar_fjord.js";
//   (welt.himmel ist eine PolarHimmel-Kuppel; zustand.dunst = Faktor auf die Nebeldichte; spitPunkt(s) = Punkt auf der Landzunge, s 0 Ufer … 1 Spitze)
//
//   PHI = 78.22                      Breite Longyearbyen
//   AUGE = { x: 0, z: 0, hoehe: 2.2, deck: 0.62 }   Standpunkt (Augenhöhe über Wasser, Deckhöhe)
//   ORTE = { ort, kirche, kraftwerk, steg, kai, landzunge, rentiere, gletscher, svalsat, isfjord }   [x, y, z] für Blickziele
//   sonnenHoeheAz(dekl, H) → { alt, az } (rad; az von Süden über Westen)      sonnenRichtung(dekl, H = 0) → [x, y, z] (Einheitsvektor)
//   richtung(yaw, pitch) → [x, y, z]      hoehe(x, z) → Gelände (m)      landAbstand(x, z) → > 0 Land, < 0 Wasser (m zur Küste)
//   tagesMittel(dekl) → { hell, tagAnteil, altMittag, altMitternacht } (Grad) – mittlere Helligkeit eines Tages für Zeitraffer
//                       (1 s = 1 Monat: hell = tagesMittel(dekl).hell statt Tag-Nacht-Wechsel → kein Flackern)
//   tagesbogen(dekl, n = 96) → [[x, y, z], …] Punkte der Tagesbahn über dem Horizont (leer in der Polarnacht)
//   polarlichtKurve(t, [[von, bis], …], rampe = 1.5) → 0..1 (weiches Ein-/Ausblenden über 1–2 s, Funktion von t)
//
//   const welt = new PolarFjord(szene, {
//     schatten = 4096 (Größe der Schattenkarte, 0/false = aus; Buehne braucht schatten: true), licht = true (eigene Lichter),
//     himmel = true (eigene Himmelskuppel mit Sternen + Polarlicht), nebel = true (setzt szene.fog), nebelDichte = 4.5e-5,
//     spiegel = 0.5 (Auflösungsanteil der Wasserspiegelung, 0 = ohne Reflector), eisschollen = 320, menschen = 12, rentiere = 6 });
//   welt.update(t, {                          // alles optional; jeder Wert wirkt sofort (kein Gedächtnis)
//     kamera,                                 // THREE.PerspectiveCamera (Himmel folgt, Schatten, Sortierung der Dampf-Puffs, Lichtpunkt-Größe)
//     sonne: { dekl, H },                     // Deklination (Grad) und Stundenwinkel (Grad, 0 = Mittag/Süden, 180 = Mitternacht/Norden)
//     sonnenRichtung: [x, y, z],              // alternativ zur Angabe sonne
//     hell,                                   // 0 Polarnacht … 1 Tag (Standard aus Sonnenhöhe; im Zeitraffer tagesMittel(dekl).hell)
//     stimmung,                               // "polarnacht" | "daemmerblau" | "mitternachtssonne" | "wintersonne" | "dauerlicht" | { name: Gewicht }
//                                             // Standard: automatisch aus hell, Sonnenhöhe und Himmelsrichtung (Nord = Mitternachtssonne, Süd = Wintersonne)
//     schnee = 1, eis = 0.5, polarlicht = 0,  // 0..1: Schneedecke (Sommer ≈ 0,2: Reste auf Gipfeln/Rinnen), Eisschollen + Ufereis, Polarlicht
//     sterne,                                 // 0..1 (Standard aus hell)
//     wind = 0.5, welle = 1,                  // Wind (Dampf, Schneefall, Kräuseln), Wellenstärke des Fjords
//     heck = 0,                               // Richtung des Bootshecks (yaw, Grad): Heckreling liegt in dieser Richtung vor der Kamera
//     schneefall = 0, glitzer = 0, seerauch = 0, dampf = 1,   // Partikel: fallender Schnee, Eiskristalle in der Sonne, Seerauch über dem Wasser, Kraftwerksdampf
//     tempo = 1 })                            // Tempo von Menschen/Schneemobil/Rentieren/Schollen (im Zeitraffer z. B. 0,3, damit nichts rast)
//   welt.setze(t, kamera, zustand)            Alias im Stil von Waldlichtung.setze
//   welt.augePos(t)  → [x, y, z]              Kameraposition auf dem Deck inkl. sanftem Dümpeln (für PovKamera.posKeys)
//   welt.wiegen(t)   → { heave, roll, nick }  Bootsbewegung (m, rad) – optional als Kamerarollen übernehmen
//   welt.post        → Empfehlung für Buehne-post je Stimmung { belichtung, saettigung, kontrast, tonung, tonungStaerke, bloomStaerke, bloomSchwelle }
//   welt.lichter     → { sonne (DirectionalLight, Schatten), hemi, mond, deck } – nach update frei überschreibbar
//   welt.zustand     → zuletzt berechnete Werte { alt (Grad), hell, gewichte, sonnenDir }
//
//   const boegen = new Sonnenboegen(szene, { N: 9, seg: 120, radius: 18000, breite: 0.3 });   // leuchtende Tagesbögen für PHI 78,22
//   boegen.folge(kamera).setze({ eps, alpha, jetzt: dekl, jetztAlpha, hell, farbeSommer, farbeWinter });
//     (eps = Achsneigung in Grad; Polartag = voller Kreis, Polarnacht = kein Bogen; bei eps = 0 ein Halbbogen mit 11,8° Mittagshöhe)
//
// Szenen-Muster (siehe pipeline/projekte/_test-polar-fjord/szene.js):
//   const welt = new PolarFjord(szene, { schatten: 4096 });  const kam = new THREE.PerspectiveCamera(58, 1080 / 1920, 0.2, 60000);
//   update(t) { welt.update(t, { kamera: kam, sonne: { dekl, H }, hell, schnee, eis, polarlicht }); kam.position.set(...welt.augePos(t)); …;
//               Object.assign(post, welt.post) }   – Kamera vor welt.update setzen, wenn der Himmel exakt folgen soll (oder danach welt.himmel.folge(kam)).
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { GLSL_NOISE } from "./welt_feld_wald.js";
import { sammle, zweig } from "./welt_waldlichtung.js";
import { Puffs, Partikel } from "./stil_lunar_pov.js";

const D2R = Math.PI / 180;
const C = (h) => new THREE.Color(h);
const fr = (x) => x - Math.floor(x);

// ----------------------------------------------------------------------------------------------- Rauschen (wie GLSL_NOISE)
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 17.1; a *= 0.5; } return s; }

// ----------------------------------------------------------------------------------------------- Lage und Gelände
export const PHI = 78.22;                                   // Breite Longyearbyen
export const AUGE = { x: 0, z: 0, hoehe: 2.2, deck: 0.62 };
export const richtung = (yaw, pitch = 0) => [Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R)];

const kuesteS = (x) => -232 - 0.00034 * x * x;                                   // Südufer (Ort)
const fjordMitte = (z) => -60 + 120 * Math.sin(z * 0.0005 + 0.4) * smoothstep(-300, 800, z);
const fjordBreite = (z) => 600 + 150 * smoothstep(-200, 1800, z) + 5200 * smoothstep(2600, 7500, z) + 1300 * smoothstep(-400, -5000, z);
const SPIT_A = [-700, -210], SPIT_B = [-22, -80];                                // Landzunge (Osten, rechts vorn bei Blick nach Süden)
function spitAbstand(x, z) {
  const ax = SPIT_B[0] - SPIT_A[0], az = SPIT_B[1] - SPIT_A[1], s = clamp(((x - SPIT_A[0]) * ax + (z - SPIT_A[1]) * az) / (ax * ax + az * az));
  const px = SPIT_A[0] + ax * s, pz = SPIT_A[1] + az * s, r = lerp(22, 8, s) + 3 * (vn(x * 0.05, z * 0.05) - 0.5);
  return r - Math.hypot(x - px, z - pz);
}
export const spitPunkt = (s) => [lerp(SPIT_A[0], SPIT_B[0], s), lerp(SPIT_A[1], SPIT_B[1], s)];
/** > 0 Land, < 0 Wasser (ungefähr Meter bis zur Küste) */
export function landAbstand(x, z) {
  const dSeite = Math.abs(x - fjordMitte(z)) - fjordBreite(z), dSued = kuesteS(x) - z, dNord = z - 12500;
  let d = Math.max(dSeite, dSued, dNord);
  d += 34 * (fbm(x * 0.005 + 3, z * 0.005 + 1, 3) - 0.5) + 8 * (vn(x * 0.03, z * 0.03) - 0.5);
  return Math.max(d, spitAbstand(x, z));
}
function terrasse(m) { const s = m * 4, f = Math.floor(s) + smoothstep(0.2, 0.78, s - Math.floor(s)); return 0.3 * m + 0.7 * (f / 4); }
export function hoehe(x, z) {
  const d = landAbstand(x, z);
  if (d < 0) return Math.max(-30, d * 0.06) - 0.5;
  const mitte = fjordMitte(z), dSeite = Math.abs(x - mitte) - fjordBreite(z), dSued = kuesteS(x) - z, dNord = z - 12500;
  let y = 0.4 + 2.2 * smoothstep(0, 22, d) + 0.7 * (fbm(x * 0.08, z * 0.08, 2) - 0.5) * smoothstep(0, 10, d);
  y += 95 * smoothstep(0, 1300, dSued) + 30 * smoothstep(900, 3000, dSued);                    // Ort am Hang, dahinter das Tal
  y += 12 * (fbm(x * 0.004, z * 0.004, 3) - 0.3) * smoothstep(0, 300, d);                     // Moränenhügel
  const seite = x > mitte ? 5 : 11;
  const m = smoothstep(140, 1050, dSeite + 70 * (fbm(z * 0.002 + seite, 3.1, 2) - 0.5));
  const H = 340 + 300 * (fbm(z * 0.0006 + seite, 1.3, 3) - 0.5);
  const rinne = smoothstep(0.62, 0.95, vn(z * 0.006 + x * 0.0008, seite)) * smoothstep(0.1, 0.8, m) * (1 - smoothstep(0.92, 1, m));
  y += H * terrasse(m) * (1 - 0.3 * rinne);
  y += 750 * smoothstep(8000, 24000, dSued) * (0.7 + 0.6 * fbm(x * 0.0004, 3.3, 3));            // Talschluss Adventdalen (< 3°)
  y += 720 * smoothstep(0, 3200, dNord) * (0.55 + 0.8 * fbm(x * 0.0005 + 2, 7, 3));           // Nordufer Isfjord (< 3°)
  return y;
}
const pos3 = (x, z, dy = 0) => [x, hoehe(x, z) + dy, z];
export const ORTE = {
  ort: pos3(-40, -560, 8), kirche: pos3(-250, -560, 12), kraftwerk: pos3(170, -470, 30), steg: [-95, 1.8, -170], kai: pos3(260, -250, 6),
  landzunge: pos3(...spitPunkt(0.9), 1), rentiere: pos3(...spitPunkt(0.84), 1), gletscher: pos3(980, -2300, 200), svalsat: pos3(1850, -1050, 30), isfjord: [0, 300, 12500],
};

// ----------------------------------------------------------------------------------------------- Sonne
export function sonnenHoeheAz(dekl, H) {
  const d = dekl * D2R, h = H * D2R, p = PHI * D2R;
  const sa = Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(h);
  const alt = Math.asin(clamp(sa, -1, 1));
  const az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(p) - Math.tan(d) * Math.cos(p));
  return { alt, az };
}
export function sonnenRichtung(dekl, H = 0) {
  const { alt, az } = sonnenHoeheAz(dekl, H);
  return [Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt)];
}
const hellAusHoehe = (altGrad) => smoothstep(-13, 5, altGrad);
export function tagesMittel(dekl) {
  let hell = 0, tag = 0; const n = 96;
  for (let i = 0; i < n; i++) { const a = sonnenHoeheAz(dekl, -180 + (360 * (i + 0.5)) / n).alt / D2R; hell += hellAusHoehe(a); tag += a > -0.833 ? 1 : 0; }
  return { hell: hell / n, tagAnteil: tag / n, altMittag: 90 - PHI + dekl, altMitternacht: dekl - (90 - PHI) };
}
export function tagesbogen(dekl, n = 96) {
  const out = [];
  for (let i = 0; i <= n; i++) { const r = sonnenRichtung(dekl, -180 + (360 * i) / n); if (r[1] > 0) out.push(r); }
  return out;
}
export function polarlichtKurve(t, fenster, rampe = 1.5) {
  let v = 0;
  for (const [a, b] of fenster) v = Math.max(v, smoothstep(a, a + rampe, t) * (1 - smoothstep(b - rampe, b, t)));
  return v;
}

// ----------------------------------------------------------------------------------------------- Stimmungen (Licht, Himmel, Wasser)
export const STIMMUNGEN = {
  polarnacht: { zenit: "#02050D", horizont: "#0A1428", unten: "#04070E", hof: "#16244A", guertel: "#0A1428", guertelS: 0, sonne: "#9FB0D0", sonneI: 0, hemiH: "#3A5590", hemiB: "#101828", hemiI: 0.26, mond: 0.6, nebel: "#0B1326", wasser: "#010409", fenster: 1, post: { belichtung: 1.2, saettigung: 1.0, kontrast: 1.06, tonung: [0.86, 0.95, 1.12], tonungStaerke: 0.3, bloomStaerke: 1.25, bloomSchwelle: 0.8 } },
  daemmerblau: { zenit: "#0E1E46", horizont: "#5A6FA2", unten: "#1A2442", hof: "#E59AA2", guertel: "#7A6E9E", guertelS: 0.35, sonne: "#FFB8A0", sonneI: 0, hemiH: "#6C86C4", hemiB: "#283250", hemiI: 0.85, mond: 0.2, nebel: "#41558A", wasser: "#030B16", fenster: 0.85, post: { belichtung: 1.14, saettigung: 1.05, kontrast: 1.05, tonung: [0.92, 0.96, 1.08], tonungStaerke: 0.2, bloomStaerke: 1.15, bloomSchwelle: 0.85 } },
  mitternachtssonne: { zenit: "#3A5E9E", horizont: "#F0BE84", unten: "#6A6068", hof: "#FFAA55", guertel: "#A8A8CC", guertelS: 0.25, sonne: "#FFC27E", sonneI: 3.2, hemiH: "#A6B6D6", hemiB: "#5C5048", hemiI: 1.25, mond: 0, nebel: "#E2C49E", wasser: "#06192A", fenster: 0, post: { belichtung: 1.08, saettigung: 1.08, kontrast: 1.07, tonung: [1.08, 1.0, 0.88], tonungStaerke: 0.25, bloomStaerke: 1.1, bloomSchwelle: 0.95 } },
  wintersonne: { zenit: "#4F6BA6", horizont: "#F0C0C2", unten: "#5E6078", hof: "#FFA4A0", guertel: "#B6A2CA", guertelS: 0.3, sonne: "#FFC4B2", sonneI: 2.7, hemiH: "#9CAEDA", hemiB: "#646880", hemiI: 1.2, mond: 0, nebel: "#DCC4D2", wasser: "#071728", fenster: 0.15, post: { belichtung: 1.08, saettigung: 1.05, kontrast: 1.06, tonung: [1.05, 0.97, 1.0], tonungStaerke: 0.18, bloomStaerke: 1.05, bloomSchwelle: 0.95 } },
  dauerlicht: { zenit: "#5D84BE", horizont: "#D6E1EC", unten: "#7C8696", hof: "#F2F4FF", guertel: "#C8D2E2", guertelS: 0, sonne: "#F0F4FF", sonneI: 2.8, hemiH: "#C0D0E8", hemiB: "#6E7884", hemiI: 1.4, mond: 0, nebel: "#D2DCE8", wasser: "#0A2232", fenster: 0, post: { belichtung: 1.1, saettigung: 1.0, kontrast: 1.06, tonung: [0.97, 1.0, 1.04], tonungStaerke: 0.12, bloomStaerke: 1.0, bloomSchwelle: 1.0 } },
};
const ST_NAMEN = Object.keys(STIMMUNGEN);
const ST_FARBEN = ["zenit", "horizont", "unten", "hof", "guertel", "sonne", "hemiH", "hemiB", "nebel", "wasser"];
const ST_ZAHLEN = ["guertelS", "sonneI", "hemiI", "mond", "fenster"];
const ST_C = Object.fromEntries(ST_NAMEN.map((n) => [n, Object.fromEntries(ST_FARBEN.map((f) => [f, C(STIMMUNGEN[n][f])]))]));
function autoGewichte(hell, altGrad, sd) {
  const nacht = 1 - smoothstep(0.08, 0.45, hell), tag = smoothstep(0.5, 0.85, hell), daemmer = Math.max(0, 1 - nacht - tag);
  const tief = 1 - smoothstep(9, 22, altGrad), nord = smoothstep(-0.15, 0.15, sd[2]);
  return { polarnacht: nacht, daemmerblau: daemmer, mitternachtssonne: tag * tief * nord, wintersonne: tag * tief * (1 - nord), dauerlicht: tag * (1 - tief) };
}
function mischeStimmung(g) {
  let s = 0; for (const n of ST_NAMEN) s += g[n] || 0;
  const out = { gewichte: {}, post: {} };
  for (const f of ST_FARBEN) out[f] = new THREE.Color(0, 0, 0);
  for (const f of ST_ZAHLEN) out[f] = 0;
  const pk = Object.keys(STIMMUNGEN.polarnacht.post); for (const k of pk) out.post[k] = k === "tonung" ? [0, 0, 0] : 0;
  for (const n of ST_NAMEN) {
    const a = s > 0 ? (g[n] || 0) / s : n === "dauerlicht" ? 1 : 0; out.gewichte[n] = a; if (a <= 0) continue;
    for (const f of ST_FARBEN) { const c = ST_C[n][f]; out[f].r += c.r * a; out[f].g += c.g * a; out[f].b += c.b * a; }
    for (const f of ST_ZAHLEN) out[f] += STIMMUNGEN[n][f] * a;
    for (const k of pk) { const v = STIMMUNGEN[n].post[k]; if (k === "tonung") for (let i = 0; i < 3; i++) out.post.tonung[i] += v[i] * a; else out.post[k] += v * a; }
  }
  return out;
}

// ----------------------------------------------------------------------------------------------- Himmel (Verlauf, Sonne, Venusgürtel, Sterne, Polarlicht)
const HIMMEL_V = /* glsl */ `
varying vec3 vDir;
void main() { vDir = (modelMatrix * vec4(position, 0.0)).xyz; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const GLSL_POLARLICHT = /* glsl */ `
uniform float polarlicht, zeit; uniform vec3 plGruen, plRot;
vec3 polarlichtF(vec3 d) {
  if (polarlicht < 0.001 || d.y < 0.004) return vec3(0.0);
  float h = max(d.y, 0.01);
  vec3 acc = vec3(0.0);
  for (int c = 0; c < 3; c++) {
    float fc = float(c);
    float y0 = 230.0 + 210.0 * fc;
    float st = 1.0 - 0.28 * fc;
    for (int k = 0; k < 16; k++) {
      float ff = float(k) / 15.0;
      float a = 100.0 + ff * 190.0;                         // Höhe der Schicht (km)
      vec2 q = d.xz / h * a;                                 // Ort auf der Schicht (km), q.y = Norden
      float x = q.x;
      float kurve = y0 + 85.0 * sin(x * 0.0042 + zeit * 0.11 + fc * 2.1) + 70.0 * (nN(vec2(x * 0.0055 + zeit * 0.045, fc * 7.3)) - 0.5)
                  + 22.0 * sin(x * 0.019 - zeit * 0.33 + fc * 1.7);
      float schritt = 12.7 * abs(d.z) / h;                                     // Abstand der Schichten im Bild → Band nie schmaler (keine Streifen)
      float breite = max(6.0 + 7.0 * nN(vec2(x * 0.008 + 3.0, fc + 3.0)) + ff * 6.0, schritt * 0.75);
      float dy = q.y - kurve;
      float band = exp(-dy * dy / (breite * breite)) * (6.0 + 7.0 * nN(vec2(x * 0.008 + 3.0, fc + 3.0))) / breite;
      float rx = x * 0.11 / (1.0 + schritt * 0.02);
      float strahl = 0.12 + 0.88 * pow(nN(vec2(rx + zeit * (0.22 + 0.1 * fc), fc * 13.0)), 2.6) + 0.35 * pow(nN(vec2(rx * 3.1 - zeit * 0.5, fc)), 4.0);
      float unten = smoothstep(-0.02, 0.05, ff);
      float profil = (exp(-ff * 3.4) + 0.35 * exp(-pow((ff - 0.08) / 0.05, 2.0))) * unten;
      vec3 col = mix(plGruen, plRot, smoothstep(0.42, 1.0, ff)) * (1.0 + 0.6 * (1.0 - unten));
      acc += col * band * strahl * profil * st;
    }
  }
  float nord = smoothstep(-0.45, 0.25, normalize(d.xz + vec2(1e-5)).y);
  acc *= nord * smoothstep(0.004, 0.05, d.y);
  float puls = 0.82 + 0.18 * sin(zeit * 0.9) * sin(zeit * 0.37 + 1.0);
  return acc * polarlicht * puls * 0.2;
}`;
const HIMMEL_F = /* glsl */ `
uniform vec3 zenit, horizont, unten, hof, guertel, sonnenDir, sonnenFarbe;
uniform float guertelS, sonnenStaerke, sonnenGroesse, glanz, dunst, sterne, helligkeit, sonnenHoehe;
varying vec3 vDir;
${GLSL_NOISE}
${GLSL_POLARLICHT}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float g = 1.0 - exp(-max(h, 0.0) / max(dunst, 1e-3));
  vec3 col = mix(horizont, zenit, g);
  vec3 s = normalize(sonnenDir);
  vec2 dh = normalize(d.xz + vec2(1e-5)), sh = normalize(s.xz + vec2(1e-5));
  float azc = dot(dh, sh);
  float tiefS = 1.0 - smoothstep(0.05, 0.45, s.y);                                  // Hof nur bei tiefer Sonne
  float hofM = exp((azc - 1.0) * 1.6) * exp(-max(h, 0.0) / 0.16) * smoothstep(-0.32, -0.02, s.y) * tiefS;
  col += hof * hofM * 0.9;
  float belt = exp((-azc - 1.0) * 1.2) * exp(-pow((h - 0.075) / 0.055, 2.0));
  col = mix(col, guertel, clamp(belt * guertelS, 0.0, 1.0));
  if (sterne > 0.001 && h > -0.01) {
    vec2 sp = vec2(atan(d.x, -d.z), asin(clamp(h, -1.0, 1.0))) * 300.0;
    vec2 si = floor(sp), sf = fract(sp) - 0.5;
    float hs = nH(si);
    if (hs > 0.968) {
      vec2 o = (vec2(nH(si + 1.7), nH(si + 4.1)) - 0.5) * 0.6;
      float stn = (1.0 - smoothstep(0.0, 0.34, length(sf - o))) * (0.35 + 2.4 * pow((hs - 0.968) / 0.032, 3.0));
      stn *= 0.8 + 0.2 * sin(zeit * (1.0 + 2.0 * nH(si + 8.0)) + hs * 40.0);
      col += vec3(0.85, 0.9, 1.0) * stn * sterne * smoothstep(0.0, 0.1, h) * (cameraPosition.y < 0.0 ? 0.35 : 1.0);   // im Spiegelbild gedämpft
    }
    float mw = smoothstep(0.5, 0.85, nF(vec2(atan(d.x, -d.z) * 2.0 + h * 3.0, h * 6.0 - atan(d.x, -d.z))));
    col += vec3(0.04, 0.05, 0.08) * sterne * mw * smoothstep(0.05, 0.3, h);
  }
  col += polarlichtF(d);
  col = mix(col, unten, smoothstep(0.0, 0.09, -h));
  float ang = acos(clamp(dot(d, s), -1.0, 1.0));
  float scheibe = 1.0 - smoothstep(sonnenGroesse * 0.8, sonnenGroesse, ang);
  float halo = exp(-ang / 0.07) * 0.6 + exp(-ang / 0.3) * 0.12;
  float sichtbar = smoothstep(-0.012, 0.004, h);
  col += sonnenFarbe * (scheibe * sonnenStaerke * sichtbar + halo * glanz * smoothstep(-0.2, 0.02, s.y));
  gl_FragColor = vec4(col * helligkeit, 1.0);
}`;
export class PolarHimmel {
  constructor(szene, { radius = 20000 } = {}) {
    this.u = {
      zenit: { value: C("#5D84BE") }, horizont: { value: C("#D6E1EC") }, unten: { value: C("#7C8696") }, hof: { value: C("#FFFFFF") }, guertel: { value: C("#C8D2E2") },
      sonnenDir: { value: new THREE.Vector3(0, 0.2, -1).normalize() }, sonnenFarbe: { value: C("#FFF0D8") }, guertelS: { value: 0 }, sonnenStaerke: { value: 30 }, sonnenGroesse: { value: 0.011 },
      glanz: { value: 0.6 }, dunst: { value: 0.26 }, sterne: { value: 0 }, helligkeit: { value: 1 }, sonnenHoehe: { value: 0 },
      polarlicht: { value: 0 }, zeit: { value: 0 }, plGruen: { value: new THREE.Color(0.25, 1.0, 0.45) }, plRot: { value: new THREE.Color(0.75, 0.18, 0.62) },
    };
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), new THREE.ShaderMaterial({ vertexShader: HIMMEL_V, fragmentShader: HIMMEL_F, uniforms: this.u, side: THREE.BackSide, depthWrite: false, fog: false }));
    this.mesh.renderOrder = -1000; this.mesh.frustumCulled = false; szene.add(this.mesh);
  }
  folge(k) { this.mesh.position.copy(k.position); return this; }
}

// ----------------------------------------------------------------------------------------------- Materialien (Schnee auf Oberseiten)
const GLSL_SCHNEE_V = `
#ifdef USE_INSTANCING
  vSWN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal); vSWP = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
#else
  vSWN = normalize(mat3(modelMatrix) * normal); vSWP = (modelMatrix * vec4(position, 1.0)).xyz;
#endif
  vSLP = position;`;
/** MeshStandardMaterial, das Oberseiten je nach uSchnee weiß überzieht (Flecken, Kanten frei) */
function schneeMat(u, { color = "#FFFFFF", roughness = 0.85, metalness = 0, vertexColors = false, flatShading = true, staerke = 0.95, key = "s", emissive = null, muster = "" } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, vertexColors, flatShading });
  if (emissive) { m.emissive = C(emissive); }
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uSchnee: u.uSchnee, uSchneeF: u.uSchneeF });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vSWN; varying vec3 vSWP; varying vec3 vSLP;").replace("#include <begin_vertex>", `#include <begin_vertex>\n${GLSL_SCHNEE_V}`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vSWN; varying vec3 vSWP; varying vec3 vSLP; uniform float uSchnee; uniform vec3 uSchneeF;\n${GLSL_NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  { ${muster} }
  { float fl = nN(vSWP.xz * 1.7 + vSWP.y * 0.3) * 0.6 + nN(vSWP.xz * 6.0) * 0.4;
    float s = smoothstep(0.55, 0.92, vSWN.y) * smoothstep(0.25, 0.6, uSchnee * 1.15 + (fl - 0.5) * 0.7);
    diffuseColor.rgb = mix(diffuseColor.rgb, uSchneeF, s * ${staerke.toFixed(2)}); }`);
  };
  m.customProgramCacheKey = () => "pf-schnee-" + key + (vertexColors ? "v" : "") + staerke;
  return m;
}

// ----------------------------------------------------------------------------------------------- Gelände
function gitter(xVon, xBis, zVon, zBis, a, k, f) {
  const achse = (von, bis) => { const out = []; let x = 0; while (x < bis) { out.push(x); x += a + k * x; } out.push(bis); const neg = []; x = 0; while (x > von) { x -= a + k * -x; neg.push(Math.max(x, von)); } return [...neg.reverse(), ...out]; };
  const xs = achse(xVon, xBis), zs = achse(zVon, zBis), nx = xs.length, nz = zs.length, pos = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const q = (j * nx + i) * 3; pos[q] = xs[i]; pos[q + 1] = f(xs[i], zs[j]); pos[q + 2] = zs[j]; }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const A = j * nx + i, B = A + 1, Cc = A + nx, D = Cc + 1; idx.set([A, Cc, B, B, Cc, D], q); q += 6; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals();
  return geo;
}
function bodenMat(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.93, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uSchnee: u.uSchnee, uSchneeF: u.uSchneeF, uAurora: u.uAurora });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vNW; varying vec3 vNN;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvNW = (modelMatrix * vec4(position, 1.0)).xyz; vNN = normal;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vNW; varying vec3 vNN; uniform float uSchnee, uAurora; uniform vec3 uSchneeF;
${GLSL_NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  vec3 W = vNW; vec3 Nn = normalize(vNN); float y = W.y;
  float n1 = nN(W.xz * 0.045), n2 = nN(W.xz * 0.5), n3 = nF(W.xz * 0.004 + 2.0), n4 = nN(W.xz * 2.2);
  float steil = 1.0 - smoothstep(0.5, 0.82, Nn.y);
  float schicht = nN(vec2(y * 0.12 + n3 * 4.0, (W.x + W.z) * 0.0012));
  vec3 fels = mix(vec3(0.17, 0.145, 0.13), vec3(0.34, 0.29, 0.25), schicht) * (0.8 + 0.35 * n2);
  fels = mix(fels, vec3(0.42, 0.36, 0.30), smoothstep(0.78, 0.92, schicht) * 0.6);
  vec3 geroell = mix(vec3(0.30, 0.27, 0.24), vec3(0.42, 0.38, 0.34), n1) * (0.85 + 0.3 * n4);
  vec3 tundra = mix(vec3(0.27, 0.27, 0.17), vec3(0.40, 0.37, 0.23), n1) * (0.85 + 0.3 * n2);
  tundra = mix(tundra, vec3(0.20, 0.30, 0.14), smoothstep(0.58, 0.8, nN(W.xz * 0.02 + 4.0)) * 0.55);
  vec3 c = mix(tundra, geroell, smoothstep(25.0, 110.0, y) * (1.0 - steil * 0.5));
  c = mix(c, fels, smoothstep(0.15, 0.7, steil));
  float ufer = 1.0 - smoothstep(0.5, 2.0, y);
  c = mix(c, vec3(0.11, 0.10, 0.09) * (0.8 + 0.4 * n4), ufer * 0.85);
  // Schnee: winters fast alles (außer Steilwänden), sommers nur Gipfel, Plateaus und Rinnen
  float hoehenF = smoothstep(90.0, 460.0, y);
  float rinne = smoothstep(0.62, 0.9, nN(vec2(W.z * 0.006 + W.x * 0.0008, 5.0)));
  float flach = smoothstep(0.32, 0.78, Nn.y);
  float sm = uSchnee * 1.2 + (hoehenF * 0.75 + rinne * 0.35) * (1.0 - uSchnee * 0.4) + 0.3 * (n3 - 0.5) + 0.18 * (n1 - 0.5);
  float schnee = smoothstep(0.46, 0.64, sm * mix(0.1, 1.05, flach)) * (1.0 - ufer * (1.0 - uSchnee) * 0.8);
  vec3 sF = uSchneeF * (0.9 + 0.1 * n2) + vec3(0.0, 0.03, 0.02) * uAurora;
  c = mix(c, sF, schnee);
  // Gletscher Longyearbreen (Südwesten, hinter dem Ort) und Larsbreen
  float gl = (1.0 - smoothstep(130.0, 260.0, abs(W.x - 960.0 - 120.0 * sin(W.z * 0.0011)))) * (1.0 - smoothstep(-1900.0, -1200.0, W.z)) * smoothstep(60.0, 140.0, y);
  gl = max(gl, (1.0 - smoothstep(110.0, 220.0, abs(W.x - 420.0 - 80.0 * sin(W.z * 0.0013)))) * (1.0 - smoothstep(-2300.0, -1500.0, W.z)) * smoothstep(90.0, 170.0, y));
  vec3 eisF = mix(vec3(0.62, 0.74, 0.84), vec3(0.86, 0.9, 0.94), n1) * (0.9 + 0.1 * n4);
  c = mix(c, mix(eisF, sF, uSchnee * 0.7), gl * 0.95);
  diffuseColor.rgb = c;`);
  };
  m.customProgramCacheKey = () => "pf-boden";
  return m;
}

// ----------------------------------------------------------------------------------------------- Wasser (Reflector) mit Kräuseln, Ufereis, Glitzer
const GLSL_LAND = /* glsl */ `
float fjM(float z) { return -60.0 + 120.0 * sin(z * 0.0005 + 0.4) * smoothstep(-300.0, 800.0, z); }
float fjB(float z) { return 600.0 + 150.0 * smoothstep(-200.0, 1800.0, z) + 5200.0 * smoothstep(2600.0, 7500.0, z) + 1300.0 * (1.0 - smoothstep(-5000.0, -400.0, z)); }
float landD(vec2 p) {
  float d = max(max(abs(p.x - fjM(p.y)) - fjB(p.y), (-232.0 - 0.00034 * p.x * p.x) - p.y), p.y - 12500.0);
  vec2 A = vec2(${SPIT_A[0].toFixed(1)}, ${SPIT_A[1].toFixed(1)}), B = vec2(${SPIT_B[0].toFixed(1)}, ${SPIT_B[1].toFixed(1)});
  vec2 ab = B - A; float s = clamp(dot(p - A, ab) / dot(ab, ab), 0.0, 1.0);
  return max(d, mix(22.0, 8.0, s) - length(p - (A + ab * s)));
}`;
const WASSER = {
  name: "PolarWasser",
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, texel: { value: new THREE.Vector2(1 / 540, 1 / 960) },
    zeit: { value: 0 }, welle: { value: 1 }, eis: { value: 0 }, tief: { value: new THREE.Color("#06192A") }, licht: { value: new THREE.Color(0.5, 0.55, 0.6) },
    sonnenDir: { value: new THREE.Vector3(0, 0.2, -1) }, sonnenF: { value: new THREE.Color(1, 1, 1) }, schneeF: { value: new THREE.Color("#E8EEF4") }, spiegel: { value: 1 },
    boot: { value: new THREE.Vector3(0, 0, 0) },
  }]),
  vertexShader: /* glsl */ `
uniform mat4 textureMatrix; varying vec4 vUv4; varying vec3 vW;
#include <common>
#include <fog_pars_vertex>
void main() {
  vUv4 = textureMatrix * vec4(position, 1.0);
  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse; uniform vec3 color, tief, licht, sonnenDir, sonnenF, schneeF, boot; uniform vec2 texel; uniform float zeit, welle, eis, spiegel;
varying vec4 vUv4; varying vec3 vW;
#include <fog_pars_fragment>
${GLSL_NOISE}
${GLSL_LAND}
float wh(vec2 p) {
  vec2 q1 = p * 0.32 + vec2(zeit * 0.05, zeit * 0.032), q2 = p * 1.25 + vec2(-zeit * 0.13, zeit * 0.085), q3 = p * 0.06 + vec2(zeit * 0.012, -zeit * 0.009);
  return nN(q1) + 0.35 * nN(q2) + 1.6 * nN(q3);
}
void main() {
  vec3 V = normalize(cameraPosition - vW);
  vec2 p = vW.xz;
  float d = length(cameraPosition.xz - p);
  float fw = length(fwidth(p));
  float e = 0.12 + fw * 0.5;
  float h0 = wh(p);
  vec2 g = vec2(wh(p + vec2(e, 0.0)) - h0, wh(p + vec2(0.0, e)) - h0) / e;
  g *= 0.09 * welle * (1.0 - smoothstep(0.8, 6.0, fw));
  // Ringe um das dümpelnde Boot
  float rb = length((p - boot.xz) * vec2(1.0, 0.55));
  g += normalize(p - boot.xz + 1e-4) * sin(rb * 2.6 - zeit * 2.2) * 0.05 * exp(-max(rb - 4.0, 0.0) / 6.0) * smoothstep(3.0, 5.0, rb) * welle;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float fres = 0.22 + 0.78 * pow(1.0 - max(dot(N, V), 0.0), 4.0);
  vec2 uv = vUv4.xy / vUv4.w + N.xz * vec2(0.35, 0.9) * 0.05 / (1.0 + d / 60.0);
  vec3 refl = vec3(0.0); float sw = 0.0;
  for (int i = -3; i <= 3; i++) { float w = exp(-float(i * i) / 5.0); refl += texture2D(tDiffuse, uv + vec2(0.0, float(i) * texel.y * 2.2)).rgb * w; sw += w; }
  refl /= sw;
  vec3 koerper = tief * (licht * 0.55 + 0.04);
  vec3 col = mix(koerper, refl * color, fres * spiegel);
  vec3 S = normalize(sonnenDir);
  float sp = pow(max(dot(reflect(-V, N), S), 0.0), 500.0) * step(0.0, S.y);
  col += sonnenF * sp * 7.0;
  // Ufereis / Neueis (wächst mit eis von den Ufern und dem Fjordende)
  float dl = landD(p);
  float rand = eis * 150.0 + 170.0 * eis * eis * (1.0 - smoothstep(-650.0, -150.0, p.y)) - 22.0 + 50.0 * (nF(p * 0.006) - 0.5);
  float eisM = (1.0 - smoothstep(rand - 18.0, rand + 6.0, -dl)) * step(0.02, eis);
  vec3 zelle = nZelle(p * 0.16);
  float riss = (1.0 - smoothstep(0.0, 0.04, zelle.y - zelle.x)) * (0.4 + 0.6 * nN(p * 0.05)) * (1.0 - smoothstep(2.0, 12.0, fw));
  float rand2 = smoothstep(rand - 60.0, rand, -dl) * eisM;                                         // Pfannkucheneis am Rand
  vec3 eisC = mix(vec3(0.62, 0.70, 0.76), schneeF, smoothstep(0.3, 0.8, nN(p * 0.05)) * 0.8 + 0.15) * (0.92 + 0.12 * zelle.z);
  eisC *= 1.0 - 0.22 * riss * (1.0 - rand2 * 0.5);
  vec3 eisL = eisC * (licht + sonnenF * max(S.y, 0.0) * 1.1);
  float pfann = rand2 * smoothstep(0.3, 0.55, zelle.x * 2.0);
  col = mix(col, eisL + refl * 0.08, clamp(eisM - pfann * 0.7, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
#include <fog_fragment>
}`,
};

// ----------------------------------------------------------------------------------------------- Lichtpunkte (Fenster außen, Laternen, Stirnlampen, Positionslichter)
const LICHT_V = /* glsl */ `
attribute vec3 farbe; attribute float groesse; uniform float skalaPx, nebelD; varying vec3 vF;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
  float s = groesse * skalaPx / max(-mv.z, 0.1);
  gl_PointSize = clamp(s, 3.0, 90.0);
  vF = farbe * clamp(s / 3.0, 0.2, 1.0) * exp(-nebelD * -mv.z);
}`;
const LICHT_F = /* glsl */ `
varying vec3 vF;
void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = (exp(-d * d * 7.0) + 0.18 * exp(-d * d * 1.6)) * (1.0 - smoothstep(0.7, 1.0, d)); if (a < 0.004) discard; gl_FragColor = vec4(vF * a, 1.0); }`;
class Lichter {
  constructor(szene, max = 900) {
    this.max = max;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.gr = new Float32Array(max);
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("farbe", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("groesse", new THREE.BufferAttribute(this.gr, 1).setUsage(THREE.DynamicDrawUsage));
    this.u = { skalaPx: { value: 1000 }, nebelD: { value: 4.5e-5 } };
    this.obj = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: LICHT_V, fragmentShader: LICHT_F, uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.obj.frustumCulled = false; this.obj.renderOrder = 15; this.g = g; szene.add(this.obj);
  }
  setze(liste, kamera) {
    const n = Math.min(this.max, liste.length);
    for (let i = 0; i < n; i++) { const L = liste[i]; this.pos.set(L.p, i * 3); this.col.set(L.f, i * 3); this.gr[i] = L.r; }
    this.g.setDrawRange(0, n);
    for (const k of ["position", "farbe", "groesse"]) this.g.attributes[k].needsUpdate = true;
    if (kamera) this.u.skalaPx.value = 1920 / (2 * Math.tan((kamera.fov * D2R) / 2));
    this.obj.visible = n > 0;
  }
}

// ----------------------------------------------------------------------------------------------- Bausteine
function tri(a, b, c) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c], 3)); g.computeVertexNormals(); return g; }
function box(w, h, d, x, y, z, ry = 0) { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; }
/** Holzhaus: kz 0 Wand (Instanzfarbe), 0.25 Sockel, 0.5 Dach, 0.75 Zierleisten, 1 Fenster. Ursprung = Boden in der Mitte, Längsseite ±z. */
function hausGeo(art) {
  const T = [];
  const [w, h, d, dachN, stock] = art === 0 ? [11, 5.6, 7, 0.55, 2] : art === 1 ? [6.5, 3.2, 5.2, 0.6, 1] : art === 2 ? [24, 6.2, 9, 0.12, 2] : [8, 4.0, 6, 0.75, 1];
  T.push({ g: box(w + 0.1, 2.6, d + 0.1, 0, -0.5, 0), c: 1, kz: 0.25 });                                    // Sockel/Pfähle (Permafrost)
  T.push({ g: box(w, h, d, 0, 0.8 + h / 2, 0), c: 1, kz: 0 });
  const top = 0.8 + h, rh = (d / 2 + 0.4) * dachN, L = Math.hypot(d / 2 + 0.4, rh);
  for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(w + 0.7, 0.18, L); g.rotateX(s * Math.atan2(rh, d / 2 + 0.4)); g.translate(0, top + rh / 2 + 0.05, s * (d / 2 + 0.4) / 2); T.push({ g, c: 1, kz: 0.5 }); }
  for (const s of [-1, 1]) T.push({ g: tri([s * w / 2, top, -d / 2], [s * w / 2, top, d / 2], [s * w / 2, top + rh, 0]), c: 1, kz: 0 }, { g: tri([s * w / 2, top, d / 2], [s * w / 2, top, -d / 2], [s * w / 2, top + rh, 0]), c: 1, kz: 0 });
  for (const s of [-1, 1]) for (const x of [-w / 2, w / 2]) T.push({ g: box(0.22, h + 0.05, 0.22, x, 0.8 + h / 2, s * d / 2), c: 1, kz: 0.75 });   // Eckleisten
  const nx = Math.max(2, Math.round(w / 2.6));
  for (let k = 0; k < stock; k++) for (let i = 0; i < nx; i++) for (const s of [-1, 1]) {
    const x = -w / 2 + (w / nx) * (i + 0.5), y = 0.8 + 1.55 + k * 2.75;
    if (k === 0 && i === 1 && s === 1) { T.push({ g: box(1.0, 2.0, 0.08, x, 0.8 + 1.0, s * (d / 2 + 0.03)), c: 1, kz: 0.75 }); continue; }   // Tür
    const fr_ = box(1.18, 1.38, 0.06, x, y, s * (d / 2 + 0.02)); T.push({ g: fr_, c: 1, kz: 0.75 });
    T.push({ g: box(0.95, 1.15, 0.06, x, y, s * (d / 2 + 0.05)), c: 1, kz: 1 });
  }
  for (const s of [-1, 1]) T.push({ g: box(0.06, 0.9, 0.8, s * (w / 2 + 0.04), top + rh * 0.35, 0), c: 1, kz: 1 });  // Giebelfenster
  if (art === 0 || art === 3) T.push({ g: box(0.7, 1.6, 0.7, w * 0.25, top + rh * 0.6, -d * 0.12), c: 1, kz: 0.25 });   // Schornstein
  return sammle(T);
}
function hausMat(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.8, flatShading: true, vertexColors: true });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uSchnee: u.uSchnee, uSchneeF: u.uSchneeF, uFenster: u.uFenster });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float kz; varying float vKz; varying vec3 vObj; varying float vIz; varying vec3 vWN2;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
  vKz = kz; vObj = position;
  vec4 wpI = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); vIz = fract(sin(dot(wpI.xz, vec2(12.9898, 78.233))) * 43758.5453);
  vWN2 = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vKz; varying vec3 vObj; varying float vIz; varying vec3 vWN2; uniform float uSchnee, uFenster; uniform vec3 uSchneeF;")
      .replace("#include <color_fragment>", `#include <color_fragment>
  {
    float isWin = step(0.9, vKz), isTrim = step(0.7, vKz) * (1.0 - isWin), isRoof = step(0.4, vKz) * (1.0 - step(0.6, vKz)), isBase = step(0.2, vKz) * (1.0 - step(0.3, vKz));
    vec3 c = diffuseColor.rgb * (0.92 + 0.12 * fract(vObj.y * 3.3));                                  // Paneele (waagrechte Bretter)
    c = mix(c, vec3(0.86, 0.85, 0.82), isTrim);
    c = mix(c, mix(vec3(0.10, 0.10, 0.11), vec3(0.22, 0.12, 0.10), step(0.6, vIz)), isRoof);
    c = mix(c, uSchneeF, isRoof * smoothstep(0.25, 0.6, vWN2.y) * smoothstep(0.2, 0.55, uSchnee));
    c = mix(c, vec3(0.09, 0.08, 0.08), isBase);
    float wid = fract(sin(dot(floor(vObj * vec3(0.45, 0.36, 0.2)) + vIz * 17.0, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    float an = step(0.32, wid) * step(0.12, vIz + 0.1);
    c = mix(c, vec3(0.05, 0.065, 0.08), isWin);
    diffuseColor.rgb = c;
    totalEmissiveRadiance += isWin * an * uFenster * mix(vec3(1.0, 0.62, 0.28), vec3(1.0, 0.82, 0.55), fract(wid * 7.0)) * (1.3 + 1.1 * fract(wid * 13.0));
  }`);
  };
  m.customProgramCacheKey = () => "pf-haus";
  return m;
}
/** kleines Boot (Länge ≈ 2·L): Rumpf mit Farbstreifen, Kajüte, Mast; Ursprung Wasserlinie, Bug +x */
function bootGeo({ L = 3.2, B = 1.2, rumpf = [0.62, 0.12, 0.1], streifen = [0.9, 0.9, 0.88], kajuete = true, mast = 3.2 } = {}) {
  const g = new THREE.BoxGeometry(2 * L, 1.1, 2 * B, 12, 3, 4), p = g.getAttribute("position"), col = [];
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const s = x / L, v = clamp(y + 0.55, 0, 1.1);
    const br = s > 0 ? Math.sqrt(Math.max(0, 1 - Math.pow(s, 2.2))) : 1 - 0.25 * Math.pow(-s, 3);
    z *= br * (0.35 + 0.65 * Math.pow(v / 1.1, 0.6)); y += 0.35 * Math.pow(Math.max(s, 0), 2) * v - 0.2;
    p.setXYZ(i, x, y, z); col.push(...(v > 0.95 ? streifen : v > 0.55 ? rumpf : [0.18, 0.08, 0.07]));
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const teile = [];
  if (kajuete) teile.push({ g: box(L * 0.7, 1.3, B * 1.3, -L * 0.15, 1.0, 0), c: [0.9, 0.9, 0.88] }, { g: box(L * 0.74, 0.12, B * 1.4, -L * 0.15, 1.7, 0), c: [0.25, 0.27, 0.3] }, { g: box(0.05, 0.5, B * 1.1, L * 0.21, 1.05, 0), c: [0.1, 0.13, 0.16] });
  if (mast) teile.push(zweig([-L * 0.1, 1.7, 0], [-L * 0.1, 1.7 + mast, 0], 0.05, 0.03, [0.8, 0.8, 0.8]));
  const rest = sammle(teile);
  return { rumpf: g, aufbau: rest, mastTop: [-L * 0.1, 1.75 + mast, 0] };
}
function rentierGeo() {
  const T = [], K = [], fell = [0.66, 0.6, 0.53], hell = [0.9, 0.88, 0.84], dunkel = [0.32, 0.27, 0.23], horn = [0.55, 0.47, 0.37];
  const leib = new THREE.IcosahedronGeometry(0.5, 1); leib.scale(1.25, 0.78, 0.7); leib.translate(0, 0.78, 0); T.push({ g: leib, c: fell });
  const brust = new THREE.IcosahedronGeometry(0.36, 1); brust.scale(1, 1.05, 0.9); brust.translate(0.42, 0.82, 0); T.push({ g: brust, c: hell });
  const heck = new THREE.IcosahedronGeometry(0.12, 0); heck.translate(-0.62, 0.86, 0); T.push({ g: heck, c: hell });
  for (const [x, z] of [[0.36, 0.16], [0.36, -0.16], [-0.36, 0.16], [-0.36, -0.16]]) { const b = new THREE.CylinderGeometry(0.05, 0.07, 0.56, 5); b.translate(x, 0.28, z); T.push({ g: b, c: dunkel }); }
  const hals = new THREE.CylinderGeometry(0.12, 0.19, 0.5, 6); hals.rotateZ(-0.85); hals.translate(0.62, 1.0, 0); K.push({ g: hals, c: hell });
  const kopf = new THREE.ConeGeometry(0.12, 0.38, 6); kopf.rotateZ(-Math.PI / 2 - 0.5); kopf.translate(0.9, 1.08, 0); K.push({ g: kopf, c: fell });
  const nase = new THREE.IcosahedronGeometry(0.05, 0); nase.translate(1.07, 0.98, 0); K.push({ g: nase, c: [0.1, 0.08, 0.07] });
  for (const s of [-1, 1]) {
    K.push(zweig([0.8, 1.22, 0.06 * s], [0.62, 1.62, 0.22 * s], 0.025, 0.02, horn), zweig([0.62, 1.62, 0.22 * s], [0.78, 1.9, 0.2 * s], 0.02, 0.012, horn));
    K.push(zweig([0.68, 1.45, 0.15 * s], [0.95, 1.52, 0.12 * s], 0.015, 0.01, horn), zweig([0.64, 1.7, 0.21 * s], [0.5, 1.88, 0.3 * s], 0.015, 0.01, horn));
    const ohr = new THREE.ConeGeometry(0.04, 0.12, 4); ohr.rotateX(s * 0.9); ohr.translate(0.78, 1.2, 0.1 * s); K.push({ g: ohr, c: fell });
  }
  return { koerper: sammle(T), kopf: sammle(K) };
}
function menschGeo() {
  const T = [];
  const rumpf = new THREE.CylinderGeometry(0.2, 0.24, 0.75, 7); rumpf.translate(0, 1.15, 0); T.push({ g: rumpf, c: [1, 1, 1] });
  for (const s of [-1, 1]) { const b = new THREE.CylinderGeometry(0.08, 0.1, 0.8, 5); b.translate(0.1 * s, 0.4, 0); T.push({ g: b, c: [0.12, 0.12, 0.14] }); }
  const kopf = new THREE.IcosahedronGeometry(0.12, 1); kopf.translate(0, 1.66, 0); T.push({ g: kopf, c: [0.15, 0.15, 0.17] });
  const kap = new THREE.IcosahedronGeometry(0.21, 1); kap.scale(1, 0.6, 1); kap.translate(0, 1.55, -0.04); T.push({ g: kap, c: [1, 1, 1] });
  const rs = new THREE.BoxGeometry(0.3, 0.42, 0.16); rs.translate(0, 1.2, -0.24); T.push({ g: rs, c: [0.2, 0.2, 0.22] });     // Rucksack
  return sammle(T);
}
function schneemobilGeo() {
  const T = [];
  const k = new THREE.BoxGeometry(1.0, 0.45, 2.6, 2, 2, 4), p = k.getAttribute("position");
  for (let i = 0; i < p.count; i++) { const z = p.getZ(i), y = p.getY(i); if (z > 0.6 && y > 0) p.setY(i, y - (z - 0.6) * 0.35); }
  k.computeVertexNormals(); k.translate(0, 0.55, 0); T.push({ g: k, c: [1, 1, 1] });
  T.push({ g: box(0.5, 0.18, 1.1, 0, 0.86, -0.5), c: [0.08, 0.08, 0.09] }, { g: box(0.7, 0.4, 0.05, 0, 1.0, 0.45, 0), c: [0.25, 0.3, 0.35] });
  T.push({ g: box(0.85, 0.3, 2.4, 0, 0.18, -0.35), c: [0.07, 0.07, 0.08] });
  for (const s of [-1, 1]) T.push({ g: box(0.12, 0.05, 1.3, 0.5 * s, 0.05, 1.1), c: [0.1, 0.1, 0.1] }, zweig([0.5 * s, 0.05, 0.9], [0.4 * s, 0.45, 0.8], 0.03, 0.03, [0.1, 0.1, 0.1]));
  T.push(zweig([-0.35, 0.95, 0.3], [0.35, 0.95, 0.3], 0.025, 0.025, [0.1, 0.1, 0.1]));
  return sammle(T);
}

// ----------------------------------------------------------------------------------------------- Welt
export class PolarFjord {
  constructor(szene, { schatten = 4096, licht = true, himmel = true, nebel = true, nebelDichte = 4.5e-5, spiegel = 0.5, eisschollen = 320, menschen = 12, rentiere = 6 } = {}) {
    this.szene = szene; this.schattenAn = !!schatten; this.nebelDichte = nebelDichte; this.vertices = 0;
    this.u = { uSchnee: { value: 1 }, uSchneeF: { value: C("#E9EEF4") }, uFenster: { value: 0 }, uAurora: { value: 0 } };
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._e = new THREE.Euler();
    this._c = new THREE.Color(); this._c2 = new THREE.Color();
    if (nebel) szene.fog = new THREE.FogExp2("#D2DCE8", nebelDichte);
    if (himmel) this.himmel = new PolarHimmel(szene);
    if (licht) this._lichter(schatten);
    this.lichtPunkte = new Lichter(szene, 1200);
    this.statLichter = [];
    this._gelaende(); this._wasser(spiegel); this._schollen(eisschollen); this._ort(); this._steg(); this._boote(); this._eigenesBoot();
    this._rentiere(rentiere); this._menschen(menschen); this._mobile(); this._eisberge();
    this.dampfP = new Puffs(szene, { max: 260, schatten: 0.55 });
    this.schneeT = new Partikel(szene, { art: "schnee", anzahl: 2600, box: [44, 24, 44], seed: 43 });
    this.glitzerT = new Partikel(szene, { art: "eis", anzahl: 1800, box: [22, 10, 22], seed: 44, groesse: 0.009 });
    this.post = { ...STIMMUNGEN.dauerlicht.post };
    this.zustand = {};
  }
  _inst(geo, mat, n, schatten = false) { const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = schatten && this.schattenAn; im.receiveShadow = this.schattenAn; im.frustumCulled = false; this.szene.add(im); this.vertices += geo.getAttribute("position").count * n; return im; }
  _setze(im, i, x, y, z, s, ry, sx = s, sz = s, rx = 0, rz = 0) { this._e.set(rx, ry, rz); this._q.setFromEuler(this._e); this._s.set(sx, s, sz); this._p.set(x, y, z); this._m.compose(this._p, this._q, this._s); im.setMatrixAt(i, this._m); }
  _mesh(geo, mat, { schatten = true, empf = true } = {}) { const m = new THREE.Mesh(geo, mat); m.castShadow = schatten && this.schattenAn; m.receiveShadow = empf && this.schattenAn; this.szene.add(m); this.vertices += geo.getAttribute("position").count; return m; }

  _lichter(schatten) {
    const s = new THREE.DirectionalLight("#FFFFFF", 2.5);
    if (schatten) { s.castShadow = true; s.shadow.mapSize.set(+schatten || 4096, +schatten || 4096); Object.assign(s.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 900 }); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.05; s.shadow.radius = 3; }
    const hemi = new THREE.HemisphereLight("#C0D0E8", "#6E7884", 1.4);
    const mond = new THREE.DirectionalLight("#9DB4E8", 0); mond.position.set(...richtung(105, 22).map((v) => v * 5000));
    const deck = new THREE.PointLight("#FFD8A8", 0, 16, 2);
    this.szene.add(s, s.target, hemi, mond, deck);
    this.lichter = { sonne: s, hemi, mond, deck };
  }
  _gelaende() {
    const geo = gitter(-16000, 16000, -26000, 18000, 2.5, 0.021, hoehe);
    this.boden = this._mesh(geo, bodenMat(this.u), { schatten: false });
  }
  _wasser(spiegel) {
    if (spiegel > 0) {
      const w = Math.round(1080 * spiegel), h = Math.round(1920 * spiegel);
      const r = new Reflector(new THREE.PlaneGeometry(90000, 90000), { textureWidth: w, textureHeight: h, clipBias: 0.002, multisample: 4, shader: WASSER, color: "#FFFFFF" });
      r.material.fog = true; r.material.uniforms.texel.value.set(1 / w, 1 / h);
      r.rotation.x = -Math.PI / 2; r.position.y = 0; r.renderOrder = 1;
      this.wasser = r; this.wasserU = r.material.uniforms; this.szene.add(r);
    } else {
      const mat = new THREE.ShaderMaterial({ ...WASSER, uniforms: THREE.UniformsUtils.clone(WASSER.uniforms), fog: true });
      mat.uniforms.spiegel.value = 0; mat.uniforms.textureMatrix.value = new THREE.Matrix4();
      const m = new THREE.Mesh(new THREE.PlaneGeometry(90000, 90000), mat); m.rotation.x = -Math.PI / 2; this.wasser = m; this.wasserU = mat.uniforms; this.szene.add(m);
    }
    this.wasser.frustumCulled = false;
  }
  _schollen(n) {
    const g = new THREE.CylinderGeometry(1, 0.9, 0.42, 18, 2), p = g.getAttribute("position"), col = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
      const f = 0.78 + 0.14 * Math.sin(3 * a + 1.3) + 0.09 * Math.sin(5 * a + 0.4) + 0.12 * hash(Math.round(((a + Math.PI) / (2 * Math.PI)) * 18) % 18, 3);
      const oben = y > 0.15, buckel = oben ? 0.07 * (1 - r) + 0.05 * Math.sin(a * 4) * r : 0;
      p.setXYZ(i, x * f, y + buckel, z * f); col.push(...(oben ? [0.96, 0.98, 1.0] : y > -0.05 ? [0.7, 0.84, 0.9] : [0.42, 0.62, 0.74]));
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const mat = schneeMat(this.u, { vertexColors: true, roughness: 0.55, key: "scholle", staerke: 0.5 });
    this.schollen = this._inst(g, mat, n, false);
    this.schollenL = [];
    for (let i = 0, k = 0; i < 40000 && k < n; i++) {
      const r = 14 + Math.pow(hash(i, 701), 1.6) * 1400, a = hash(i, 702) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r - 120 * hash(i, 703);
      const d = landAbstand(x, z); if (d > -6) continue;
      if (hash(i, 704) > 0.35 + 0.65 * smoothstep(-500, -20, d) + 0.4 * smoothstep(0, -400, z)) continue;
      this.schollenL.push({ x, z, s: 0.7 + 4.5 * Math.pow(hash(i, 705), 2.2), ry: hash(i, 706) * 6.28, th: hash(i, 707) * 0.92, sx: 0.7 + 0.6 * hash(i, 708), v: (hash(i, 709) - 0.5) * 0.25, ph: hash(i, 710) * 6.28 }); k++;
    }
  }
  _ort() {
    const u = this.u, mat = hausMat(u);
    const farben = ["#A8332A", "#C9952F", "#2F5F94", "#E6E2D8", "#3F6E52", "#7E2E3C", "#5E93AE", "#B85A2A", "#D8C9A0", "#1F3B5C"].map(C);
    const plaetze = [[], [], [], []];
    // Reihen am Hang (Ort), entlang der Straßen parallel zum Ufer, einige quer
    for (let r = 0; r < 14; r++) {
      const ab = 34 + r * 46 + (r > 6 ? (r - 6) * 12 : 0);
      for (let i = 0; i < 40; i++) {
        const x = -620 + i * 30 + 12 * (hash(i, r * 7 + 1) - 0.5), z = kuesteS(x) - ab - 10 * (hash(i, r * 7 + 2) - 0.5);
        if (hash(i, r * 7 + 3) < 0.28 + r * 0.02 || landAbstand(x, z) < 22 || Math.abs(x - 120) < 70 && ab < 120 || Math.abs(x - 170) < 45 && Math.abs(z + 470) < 40) continue;
        const art = r > 9 ? (hash(i, r * 7 + 4) < 0.6 ? 1 : 3) : hash(i, r * 7 + 4) < 0.18 ? 2 : hash(i, r * 7 + 4) < 0.62 ? 0 : hash(i, r * 7 + 4) < 0.85 ? 3 : 1;
        plaetze[art].push({ x, z, ry: (hash(i, r * 7 + 5) < 0.2 ? Math.PI / 2 : 0) + (hash(i, r * 7 + 6) - 0.5) * 0.22 + 0.0006 * x, f: farben[Math.floor(hash(i, r * 7 + 8) * farben.length)] });
      }
    }
    // Hütten am Ostufer und an der Landzunge
    for (let i = 0; i < 26; i++) {
      const z = -200 + i * 38, x = fjordMitte(z) - fjordBreite(z) - 35 - 40 * hash(i, 41);
      if (landAbstand(x, z) < 15) continue;
      plaetze[1].push({ x, z, ry: Math.PI / 2 + (hash(i, 42) - 0.5) * 0.4, f: farben[Math.floor(hash(i, 43) * farben.length)] });
    }
    const [hx, hz] = spitPunkt(0.74); plaetze[3].push({ x: hx, z: hz + 4, ry: 0.15, f: C("#5A3A2A") });                     // Trapperhütte
    this.hausZahl = 0;
    plaetze.forEach((liste, art) => {
      if (!liste.length) return;
      const im = this._inst(hausGeo(art), mat, liste.length, true);
      liste.forEach((h, i) => { this._setze(im, i, h.x, hoehe(h.x, h.z) + 0.3, h.z, 1, h.ry); im.setColorAt(i, h.f); });
      im.instanceColor.needsUpdate = true; this.hausZahl += liste.length;
    });
    // Kirche (Holz, rotbraun) mit Turm
    const holz = schneeMat(u, { color: "#7A3426", key: "kirche" }), dunkel = schneeMat(u, { color: "#2A2A2E", key: "dach" }), weiss = schneeMat(u, { color: "#E4E2DC", key: "weiss" });
    const kp = ORTE.kirche, kirche = new THREE.Group();
    const add = (g, m) => { const me = new THREE.Mesh(g, m); me.castShadow = me.receiveShadow = this.schattenAn; kirche.add(me); };
    add(box(16, 7, 9, 0, 3.5, 0), holz); add(box(4.2, 13, 4.2, 9.5, 6.5, 0), holz);
    const sp = new THREE.ConeGeometry(3.1, 8, 4); sp.rotateY(Math.PI / 4); sp.translate(9.5, 17, 0); add(sp, dunkel);
    for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(17, 0.25, 6.2); g.rotateX(s * 0.62); g.translate(0, 8.7, s * 2.5); add(g, dunkel); }
    kirche.position.set(kp[0], hoehe(kp[0], kp[2]), kp[2]); kirche.rotation.y = 0.1; this.szene.add(kirche);
    // Kraftwerk mit Schornstein
    const kw = ORTE.kraftwerk, kwG = new THREE.Group(), grau = schneeMat(u, { color: "#59626E", key: "kw" }), rot = new THREE.MeshStandardMaterial({ color: "#B03A2E", roughness: 0.7 });
    const addK = (g, m) => { const me = new THREE.Mesh(g, m); me.castShadow = me.receiveShadow = this.schattenAn; kwG.add(me); };
    addK(box(42, 22, 26, 0, 11, 0), grau); addK(box(18, 30, 14, -14, 15, 2), grau);
    const sch = new THREE.CylinderGeometry(1.9, 2.6, 58, 14); sch.translate(14, 29, 0); addK(sch, weiss);
    for (const y of [48, 54]) { const b = new THREE.CylinderGeometry(1.96, 2.0, 2.2, 14); b.translate(14, y, 0); addK(b, rot); }
    kwG.position.set(kw[0], hoehe(kw[0], kw[2]), kw[2]); this.szene.add(kwG);
    this.schornstein = [kw[0] + 14, hoehe(kw[0], kw[2]) + 59, kw[2]];
    // Tanks am Kai
    for (let i = 0; i < 4; i++) { const x = 330 + i * 17, z = kuesteS(x) - 40, t = new THREE.CylinderGeometry(7, 7, 11, 20); t.translate(x, hoehe(x, z) + 5.5, z); this._mesh(t, weiss); }
    // Seilbahn-Böcke (Kohleseilbahn) den Hang hinauf, mit Seilen
    const bockM = schneeMat(u, { color: "#4A3A2C", key: "bock" }), seile = [];
    for (let i = 0; i < 9; i++) {
      const x = -330 + i * 95, z = -380 - i * 150, y0 = hoehe(x, z), H = 14 + 3 * (i % 2), T = [];
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) T.push(zweig([x + a * 2.2, y0 - 1, z + b * 2.2], [x + a * 0.7, y0 + H, z + b * 0.7], 0.18, 0.14, [1, 1, 1]));
      for (let k = 1; k < 4; k++) { const yy = y0 + (H * k) / 4, w = lerp(2.2, 0.7, k / 4); T.push(zweig([x - w, yy, z - w], [x + w, yy, z + w], 0.08, 0.08, [1, 1, 1]), zweig([x - w, yy, z + w], [x + w, yy, z - w], 0.08, 0.08, [1, 1, 1])); }
      T.push({ g: box(4.5, 0.4, 0.5, x, y0 + H + 0.2, z), c: [1, 1, 1] });
      this._mesh(sammle(T), bockM); seile.push([x - 2, y0 + H + 0.4, z], [x + 2, y0 + H + 0.4, z]);
    }
    const sg = []; for (let i = 0; i < seile.length - 2; i += 2) for (const o of [0, 1]) { const a = seile[i + o], b = seile[i + 2 + o]; for (let k = 0; k < 12; k++) { const f0 = k / 12, f1 = (k + 1) / 12, sag = (f) => -4 * f * (1 - f) * 3.5; sg.push(lerp(a[0], b[0], f0), lerp(a[1], b[1], f0) + sag(f0), lerp(a[2], b[2], f0), lerp(a[0], b[0], f1), lerp(a[1], b[1], f1) + sag(f1), lerp(a[2], b[2], f1)); } }
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(sg, 3));
    this.szene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: "#1A1714" })));
    // SvalSat-Kuppeln auf dem Plateau im Westen
    const sv = ORTE.svalsat, kuppel = schneeMat(u, { color: "#F2F2F0", key: "kuppel", staerke: 0.3 });
    for (let i = 0; i < 9; i++) {
      const x = sv[0] + (i % 3) * 60 + 30 * hash(i, 61), z = sv[2] - Math.floor(i / 3) * 70 + 20 * hash(i, 62), r = 6 + 4 * hash(i, 63), y = hoehe(x, z);
      const k = new THREE.SphereGeometry(r, 18, 12); k.translate(x, y + r * 1.1 + 3, z); this._mesh(k, kuppel);
      const so = new THREE.CylinderGeometry(r * 0.6, r * 0.8, 4, 10); so.translate(x, y + 1.5, z); this._mesh(so, weiss);
    }
    // Straßenlaternen und Fensterlichter, die von weit leuchten
    for (let i = 0; i < 40; i++) { const x = -560 + i * 26, z = kuesteS(x) - 22; if (landAbstand(x, z) > 5) this.statLichter.push({ p: [x, hoehe(x, z) + 6, z], art: "laterne" }); }
    for (let r = 0; r < 5; r++) for (let i = 0; i < 9; i++) { const x = -420 + i * 100 + r * 23, z = kuesteS(x) - 140 - r * 120; if (landAbstand(x, z) > 15) this.statLichter.push({ p: [x, hoehe(x, z) + 6, z], art: "laterne" }); }
    for (let i = 0; i < 14; i++) { const z = -150 + i * 55, x = fjordMitte(z) - fjordBreite(z) - 20; if (landAbstand(x, z) > 4) this.statLichter.push({ p: [x, hoehe(x, z) + 5, z], art: "laterne" }); }
    this.statLichter.push({ p: [this.schornstein[0], this.schornstein[1] + 1, this.schornstein[2]], art: "rot" });
    for (let i = 0; i < 9; i++) this.statLichter.push({ p: [sv[0] + (i % 3) * 60 + 30 * hash(i, 61), hoehe(sv[0], sv[2]) + 15, sv[2] - Math.floor(i / 3) * 70], art: "rot" });
  }
  _steg() {
    const u = this.u, holz = schneeMat(u, { color: "#5E4A38", key: "steg" }), pf = new THREE.MeshStandardMaterial({ color: "#2E2620", roughness: 0.9 });
    const x0 = -95, zA = kuesteS(x0) - 8, zB = -150, L = zB - zA;                                   // vom Ufer (Land) nach Norden ins Wasser
    this._mesh(box(5, 0.35, L, x0, 1.8, (zA + zB) / 2), holz);
    const pile = new THREE.CylinderGeometry(0.22, 0.22, 6, 6), n = Math.ceil(L / 5) * 2 + 2, pm = this._inst(pile, pf, n, true); let k = 0;
    for (let z = zA + 1; z < zB && k < n - 1; z += 5) for (const s of [-1, 1]) this._setze(pm, k++, x0 + 2.3 * s, -1.2, z, 1, 0);
    pm.count = k;
    this._mesh(box(6, 3.2, 4, x0, 3.5, zB - 3), schneeMat(u, { color: "#9E2E25", key: "schuppen" }));
    for (let z = zA + 4; z < zB; z += 14) this.statLichter.push({ p: [x0 + 2.4, 4.6, z], art: "laterne" });
    // Kai mit Expeditionsschiff
    const kai = ORTE.kai; this._mesh(box(120, 3.5, 22, kai[0], 0.6, kuesteS(kai[0]) + 8), schneeMat(u, { color: "#4C4C4E", key: "kai" }));
    const sx = kai[0], sz = kuesteS(sx) + 27, schiff = new THREE.Group(), hull = new THREE.MeshStandardMaterial({ color: "#1D3550", roughness: 0.6 });
    const aufb = schneeMat(u, { color: "#EEEDE8", key: "schiff" });
    const add = (g, m) => { const me = new THREE.Mesh(g, m); me.castShadow = me.receiveShadow = this.schattenAn; schiff.add(me); };
    const rumpf = new THREE.BoxGeometry(62, 7, 11, 10, 2, 2), rp = rumpf.getAttribute("position");
    for (let i = 0; i < rp.count; i++) { const x = rp.getX(i), s = x / 31; if (s > 0.55) rp.setZ(i, rp.getZ(i) * (1 - Math.pow((s - 0.55) / 0.45, 1.6) * 0.95)); }
    rumpf.computeVertexNormals(); rumpf.translate(0, 1.5, 0); add(rumpf, hull);
    add(box(34, 4, 9.6, -6, 6.9, 0), aufb); add(box(22, 3.4, 8.6, -4, 10.6, 0), aufb); add(box(9, 3, 7.4, 3, 13.8, 0), aufb);
    const sc = new THREE.CylinderGeometry(1.2, 1.4, 5, 10); sc.translate(-12, 14.5, 0); add(sc, new THREE.MeshStandardMaterial({ color: "#B23A2E", roughness: 0.6 }));
    add(zweig([3, 15, 0], [3, 22, 0], 0.15, 0.08, [1, 1, 1]).g, aufb);
    schiff.position.set(sx, 0, sz); this.szene.add(schiff); this.schiff = schiff;
    for (let i = 0; i < 9; i++) this.statLichter.push({ p: [sx - 22 + i * 4.5, 9.2, sz + 4.9], art: "fenster" }, { p: [sx - 18 + i * 3.6, 12.6, sz + 4.4], art: "fenster" });
    this.statLichter.push({ p: [sx + 3, 22.4, sz], art: "weiss" }, { p: [sx + 30, 5.4, sz], art: "gruen" });
  }
  _boote() {
    const mat = schneeMat(this.u, { vertexColors: true, roughness: 0.6, key: "boot", staerke: 0.8 });
    const defs = [
      { x: -88, z: -168, ry: -Math.PI / 2, o: { L: 4.6, B: 1.5, rumpf: [0.62, 0.12, 0.1], mast: 4 } },        // Fischerboot am Steg
      { x: 62, z: -92, ry: 2.6, o: { L: 3.0, B: 1.1, rumpf: [0.16, 0.34, 0.58], mast: 3 } },                // kleines Boot vor Anker
      { x: -36, z: -24, ry: 0.4, o: { L: 2.4, B: 0.95, rumpf: [0.85, 0.42, 0.12], streifen: [0.12, 0.12, 0.13], kajuete: false, mast: 0 } },  // Schlauchboot / Beiboot
    ];
    this.boote = defs.map((b, i) => {
      const g = bootGeo(b.o), gr = new THREE.Group(), r = new THREE.Mesh(g.rumpf, mat), a = new THREE.Mesh(g.aufbau, mat);
      r.castShadow = a.castShadow = this.schattenAn; r.receiveShadow = a.receiveShadow = this.schattenAn; gr.add(r, a); this.szene.add(gr);
      return { gr, ...b, i, mastTop: b.o.mast ? g.mastTop : null };
    });
  }
  _eigenesBoot() {
    const u = this.u, D = AUGE.deck, gr = new THREE.Group(); this.eigen = gr;
    const add = (g, m, sch = true) => { const me = new THREE.Mesh(g, m); me.castShadow = sch && this.schattenAn; me.receiveShadow = this.schattenAn; gr.add(me); return me; };
    const deckM = schneeMat(u, { color: "#7A7F84", roughness: 0.95, key: "deck", staerke: 1.0, muster: `
    vec2 q = vSLP.xz; vec2 pl = abs(fract(q / vec2(1.25, 1.6)) - 0.5);
    float fuge = smoothstep(0.478, 0.495, max(pl.x, pl.y));
    vec3 c = diffuseColor.rgb * (0.86 + 0.22 * nN(q * 11.0)) * (0.82 + 0.3 * nN(q * 0.8 + 3.0));
    c *= 1.0 - 0.5 * fuge;
    float gelbM = (1.0 - smoothstep(0.05, 0.08, abs(q.y + 3.7))) + (1.0 - smoothstep(0.04, 0.07, abs(abs(q.x) - 1.55))) * step(q.y, 2.4) * step(-3.7, q.y);
    c = mix(c, vec3(0.78, 0.55, 0.08) * (0.85 + 0.2 * nN(q * 6.0)), clamp(gelbM, 0.0, 1.0) * 0.9);
    c = mix(c, c * 0.55, smoothstep(0.62, 0.8, nN(q * 1.6 + 7.0)) * 0.5);
    diffuseColor.rgb = c;` }), weiss = schneeMat(u, { color: "#E8E8E4", roughness: 0.6, key: "rumpf", staerke: 0.9 });
    const blau = new THREE.MeshStandardMaterial({ color: "#1E4A86", roughness: 0.5 }), metall = new THREE.MeshStandardMaterial({ color: "#B9BEC4", roughness: 0.3, metalness: 0.8 });
    const gelb = schneeMat(u, { color: "#E3A51E", roughness: 0.5, key: "gelb" }), orange = new THREE.MeshStandardMaterial({ color: "#E8541E", roughness: 0.6 });
    const tau = new THREE.MeshStandardMaterial({ color: "#C8B48A", roughness: 0.95 }), schwarz = new THREE.MeshStandardMaterial({ color: "#1A1B1D", roughness: 0.7 });
    // Umriss (lokal: Heck −z, Bug +z), Rumpf und Deck
    const U = [[-2.2, -4.6], [2.2, -4.6], [2.35, 2.5], [1.7, 7.2], [0, 9.6], [-1.7, 7.2], [-2.35, 2.5]];
    const shape = new THREE.Shape(); U.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z))); shape.closePath();
    const rumpf = new THREE.ExtrudeGeometry(shape, { depth: D + 1.2, bevelEnabled: false }); rumpf.rotateX(-Math.PI / 2); rumpf.translate(0, -1.2, 0); add(rumpf, weiss);
    const deck = new THREE.ShapeGeometry(shape); deck.rotateX(-Math.PI / 2); deck.translate(0, D + 0.005, 0); add(deck, deckM);
    // Schanzkleid (Bordwand über Deck) mit blauem Streifen und Handlauf-Reling
    const posten = [];
    for (let i = 0; i < U.length; i++) {
      const [ax, az] = U[i], [bx, bz] = U[(i + 1) % U.length], L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), mx = (ax + bx) / 2, mz = (az + bz) / 2;
      const nx = (bz - az) / L, nz = -(bx - ax) / L;                                                      // nach außen (Umlauf gegen den Uhrzeiger)
      const offen = i === 0, hW = offen ? 0.16 : 0.55;                                                     // Heck offen (nur Süll), Seiten mit Schanzkleid
      const w = new THREE.BoxGeometry(0.1, hW, L + 0.1); w.rotateY(ry); w.translate(mx - nx * 0.05, D + hW / 2, mz - nz * 0.05); add(w, weiss);
      const kap = new THREE.BoxGeometry(0.2, 0.06, L + 0.12); kap.rotateY(ry); kap.translate(mx - nx * 0.05, D + hW + 0.02, mz - nz * 0.05); add(kap, offen ? gelb : weiss);
      if (!offen) { const st = new THREE.BoxGeometry(0.03, 0.12, L); st.rotateY(ry); st.translate(mx - nx * 0.11, D + 0.36, mz - nz * 0.11); add(st, blau, false); }
      if (az > 4 && bz > 4) continue;                                                                     // Bug: nur Schanzkleid
      for (const hy of offen ? [1.0, 0.72, 0.44] : [1.0, 0.78]) add(zweig([ax - nx * 0.05, D + hy, az - nz * 0.05], [bx - nx * 0.05, D + hy, bz - nz * 0.05], hy > 0.9 ? 0.024 : 0.014, hy > 0.9 ? 0.024 : 0.014, null).g, metall);
      const n = Math.max(1, Math.round(L / 1.15)); for (let k = 0; k <= n; k++) posten.push([lerp(ax, bx, k / n) - nx * 0.05, lerp(az, bz, k / n) - nz * 0.05, hW]);
    }
    for (const [x, z, hW] of posten) add(zweig([x, D + hW, z], [x, D + 1.0, z], 0.022, 0.02, null).g, metall);
    // Ruderhaus (hinter der Kamera, Bug) mit Fenstern, Mast, Radar
    add(box(3.8, 2.5, 3.6, 0, D + 1.25, 4.6), weiss); add(box(4.1, 0.14, 4.0, 0, D + 2.57, 4.6), weiss);
    const glas = new THREE.MeshStandardMaterial({ color: "#0E1418", roughness: 0.15, metalness: 0.4, emissive: "#000000" }); this.ruderGlas = glas;
    for (const x of [-1.2, 0, 1.2]) add(box(0.95, 0.85, 0.05, x, D + 1.75, 2.78), glas, false);
    for (const s of [-1, 1]) add(box(0.05, 0.85, 2.4, s * 1.92, D + 1.75, 4.6), glas, false);
    add(box(0.8, 1.9, 0.05, 1.35, D + 0.95, 2.77), schwarz, false);
    add(zweig([0, D + 2.6, 5.4], [0, D + 6.2, 5.4], 0.07, 0.05, null).g, metall); add(box(1.8, 0.12, 0.25, 0, D + 4.6, 5.4), schwarz);
    add(zweig([0.6, D + 2.6, 4.0], [0.6, D + 4.4, 4.0], 0.02, 0.02, null).g, metall); add(zweig([-0.7, D + 2.6, 4.2], [-0.7, D + 3.8, 4.2], 0.02, 0.02, null).g, metall);
    // Kran (Davit) mit CTD-Rosette an Steuerbord achtern
    const kx = 1.95, kz = 1.6;                                                                            // neben der Kamera (außerhalb des Heckblicks)
    add(zweig([kx, D, kz], [kx, D + 2.7, kz], 0.11, 0.09, null).g, gelb); add(zweig([kx, D + 2.6, kz], [kx + 0.9, D + 3.1, kz - 0.3], 0.08, 0.06, null).g, gelb);
    add(zweig([kx + 0.9, D + 3.05, kz - 0.3], [kx + 0.9, D + 0.4, kz - 0.3], 0.008, 0.008, null).g, schwarz, false);
    const ros = new THREE.Group(); ros.position.set(kx - 0.8, D, kz + 0.3);
    const rf = (g, m) => { const me = new THREE.Mesh(g, m); me.castShadow = this.schattenAn; me.receiveShadow = this.schattenAn; ros.add(me); };
    for (const y of [0.05, 1.15]) { const t = new THREE.TorusGeometry(0.55, 0.03, 6, 16); t.rotateX(Math.PI / 2); t.translate(0, y, 0); rf(t, metall); }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, f = new THREE.CylinderGeometry(0.075, 0.075, 0.85, 8); f.translate(Math.cos(a) * 0.46, 0.62, Math.sin(a) * 0.46); rf(f, i % 3 ? weiss : schwarz); }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; rf(zweig([Math.cos(a) * 0.55, 0.05, Math.sin(a) * 0.55], [Math.cos(a) * 0.55, 1.15, Math.sin(a) * 0.55], 0.02, 0.02, null).g, metall); }
    rf(box(0.3, 0.5, 0.3, 0, 0.35, 0), gelb); gr.add(ros);
    // Taue: aufgeschossenes Tau, Ankerleine über das Heck ins Wasser, Poller, Rettungsring, Kisten
    for (const [x, z] of [[-1.7, -4.25], [1.7, -4.25]]) { add(zweig([x, D, z], [x, D + 0.35, z], 0.1, 0.1, null).g, schwarz); add(zweig([x, D + 0.35, z], [x, D + 0.42, z], 0.14, 0.14, null).g, schwarz); }
    for (let k = 0; k < 4; k++) { const t = new THREE.TorusGeometry(0.42 - k * 0.04, 0.035, 6, 22); t.rotateX(Math.PI / 2); t.translate(-1.25, D + 0.04 + k * 0.065, -3.35); add(t, tau); }
    const anker = new THREE.CatmullRomCurve3([[-1.7, D + 0.4, -4.25], [-1.55, D + 0.62, -4.7], [-1.2, D + 0.2, -6.5], [-0.6, -0.4, -11]].map((v) => new THREE.Vector3(...v)));
    add(new THREE.TubeGeometry(anker, 40, 0.028, 6), tau, false);
    const lose = new THREE.CatmullRomCurve3([[-1.25, D + 0.3, -3.35], [-1.6, D + 0.08, -3.8], [-1.7, D + 0.25, -4.15], [-1.7, D + 0.4, -4.25]].map((v) => new THREE.Vector3(...v)));
    add(new THREE.TubeGeometry(lose, 20, 0.028, 6), tau, false);
    const ring = new THREE.TorusGeometry(0.34, 0.075, 8, 24); ring.translate(0, 0, 0); const rg = add(ring, orange); rg.position.set(-2.18, D + 0.8, -1.4); rg.rotation.y = Math.PI / 2;
    for (let i = 0; i < 4; i++) { const b = new THREE.TorusGeometry(0.34, 0.079, 8, 3, 0.35); b.rotateZ((i * Math.PI) / 2); const m = add(b, weiss, false); m.position.copy(rg.position); m.rotation.y = Math.PI / 2; }
    add(box(0.8, 0.5, 0.55, 0.9, D + 0.25, -0.2, 0.1), schneeMat(u, { color: "#A9AEB4", metalness: 0.5, roughness: 0.4, key: "kiste" }));
    add(box(0.6, 0.42, 0.45, -1.5, D + 0.21, 0.7, -0.2), gelb);
    this.ankerBoje = add(new THREE.SphereGeometry(0.28, 12, 8), orange); this.ankerBoje.position.set(-0.6, 0.1, -11);
    this.szene.add(gr);
    this.deckLichtLokal = [0, D + 2.35, 2.7];
  }
  _eisberge() {                                                                                     // kalbende Gletscher im Isfjord: Eisberge und Growler im Norden
    const T = [];
    for (let i = 0; i < 9; i++) {
      const x = -900 + 1800 * hash(i, 301), z = 260 + 3800 * Math.pow(hash(i, 302), 1.4), r = 7 + 13 * hash(i, 303), hh = r * (0.45 + 0.5 * hash(i, 304));
      if (landAbstand(x, z) > -40) continue;
      const g = new THREE.IcosahedronGeometry(1, 1), p = g.getAttribute("position");
      for (let j = 0; j < p.count; j++) { const f = 0.75 + 0.5 * hash(Math.round(p.getX(j) * 13 + p.getY(j) * 7 + p.getZ(j) * 5) + 50, i); p.setXYZ(j, p.getX(j) * r * f, Math.max(-0.3, p.getY(j)) * hh * f + (p.getY(j) > 0.6 ? hh * 0.25 : 0), p.getZ(j) * r * f * 0.8); }
      g.rotateY(hash(i, 305) * 6.28); g.computeVertexNormals(); g.translate(x, -0.2, z);
      T.push({ g, c: (xx, yy) => (yy < 1.2 ? [0.55, 0.78, 0.86] : [0.9, 0.95, 1.0]) });
    }
    this._mesh(sammle(T), schneeMat(this.u, { vertexColors: true, roughness: 0.4, key: "eisberg", staerke: 0.4 }), { schatten: false });
  }
  _rentiere(n) {
    const g = rentierGeo(), mat = schneeMat(this.u, { vertexColors: true, roughness: 0.95, key: "rentier", staerke: 0.25 });
    this.rentierL = [];
    for (let i = 0; i < n; i++) {
      const s = 0.62 + i * 0.055 + 0.03 * hash(i, 81), [x, z] = spitPunkt(s), off = (hash(i, 82) - 0.5) * 9;
      const gr = new THREE.Group(), k = new THREE.Mesh(g.koerper, mat), kopf = new THREE.Mesh(g.kopf, mat);
      k.castShadow = kopf.castShadow = this.schattenAn; kopf.matrixAutoUpdate = false; gr.add(k, kopf); gr.scale.setScalar(0.95 + 0.25 * hash(i, 83));
      this.szene.add(gr); this.rentierL.push({ gr, kopf, x, z: z + off, dreh: hash(i, 84) * 6.28, i });
    }
  }
  _menschen(n) {
    const farben = ["#C7372B", "#E8741E", "#1D2B44", "#222326", "#D9B02A", "#2F6F8F", "#5A2A4A"].map(C);
    this.menschIM = this._inst(menschGeo(), schneeMat(this.u, { vertexColors: true, roughness: 0.8, key: "mensch", staerke: 0.2 }), n, true);
    const steg = [[-95, kuesteS(-95) - 10], [-95, -152]], ufer = [[-520, kuesteS(-520) - 18], [420, kuesteS(420) - 18]];
    const zunge = [[...spitPunkt(0.55)], [...spitPunkt(0.97)]];
    this.wege = [];
    for (let i = 0; i < n; i++) {
      const w = i < 3 ? steg : i < 7 ? zunge : ufer, len = Math.hypot(w[1][0] - w[0][0], w[1][1] - w[0][1]);
      this.wege.push({ w, len, s0: hash(i, 91) * len, v: (0.9 + 0.6 * hash(i, 92)) * (hash(i, 93) < 0.5 ? 1 : -1), steh: hash(i, 94) < 0.35, quer: (hash(i, 95) - 0.5) * (w === zunge ? 6 : 3) });
      this.menschIM.setColorAt(i, farben[i % farben.length]);
    }
    this.menschIM.instanceColor.needsUpdate = true;
  }
  _mobile() {
    const farben = ["#E2B42A", "#1B1C1F", "#B8302A", "#2A5B9A", "#D4D4D0"].map(C);
    this.mobilIM = this._inst(schneemobilGeo(), schneeMat(this.u, { vertexColors: true, roughness: 0.4, key: "mobil", staerke: 0.6 }), 5, true);
    this.mobilL = [];
    for (let i = 0; i < 4; i++) { const x = -112 + i * 2.2, z = kuesteS(-112) - 10; this.mobilL.push({ x, z, ry: Math.PI + 0.1 * i }); }
    for (let i = 0; i < 5; i++) this.mobilIM.setColorAt(i, farben[i]);
    this.mobilIM.instanceColor.needsUpdate = true;
  }

  /** Bootsbewegung (verankert, ruhig): heave m, roll/nick rad */
  wiegen(t) { return { heave: 0.045 * Math.sin(t * 0.83) + 0.02 * Math.sin(t * 1.37 + 1), roll: 0.006 * Math.sin(t * 0.71 + 0.5) + 0.003 * Math.sin(t * 1.9), nick: 0.003 * Math.sin(t * 0.59 + 2) }; }
  augePos(t) { const w = this.wiegen(t); return [AUGE.x, AUGE.hoehe + w.heave, AUGE.z]; }
  setze(t, kamera, zustand = {}) { return this.update(t, { ...zustand, kamera }); }

  update(t, z = {}) {
    const kam = z.kamera || null, u = this.u, tempo = z.tempo ?? 1, tt = t * tempo;
    // --- Sonne, Helligkeit, Stimmung
    const sd = z.sonnenRichtung ? new THREE.Vector3(...z.sonnenRichtung).normalize().toArray() : sonnenRichtung(z.sonne?.dekl ?? 0, z.sonne?.H ?? 0);
    const alt = Math.asin(clamp(sd[1], -1, 1)) / D2R, hell = z.hell ?? hellAusHoehe(alt);
    let g = typeof z.stimmung === "string" ? { [z.stimmung]: 1 } : z.stimmung || autoGewichte(hell, alt, sd);
    const S = mischeStimmung(g), nacht = 1 - smoothstep(0.15, 0.6, hell);
    const schnee = z.schnee ?? 1, eis = z.eis ?? 0.5, pl = z.polarlicht ?? 0, sterne = z.sterne ?? 1 - smoothstep(0.12, 0.45, hell), wind = z.wind ?? 0.5;
    const sonneSicht = smoothstep(-1.5, 2.5, alt);
    this.zustand = { alt, hell, gewichte: S.gewichte, sonnenDir: sd };
    u.uSchnee.value = schnee; u.uAurora.value = pl * nacht; u.uFenster.value = S.fenster * (1 - smoothstep(0.35, 0.8, hell) * 0.9);
    if (kam && this.himmel) this.himmel.folge(kam);
    // --- Himmel
    if (this.himmel) {
      const H = this.himmel.u;
      H.zenit.value.copy(S.zenit); H.horizont.value.copy(S.horizont); H.unten.value.copy(S.unten); H.hof.value.copy(S.hof); H.guertel.value.copy(S.guertel); H.guertelS.value = S.guertelS;
      H.sonnenDir.value.set(...sd); H.sonnenFarbe.value.copy(S.sonne); H.sonnenStaerke.value = 26 * sonneSicht; H.glanz.value = 0.55 + 0.4 * (1 - smoothstep(5, 25, alt));
      H.sterne.value = sterne; H.polarlicht.value = pl; H.zeit.value = t; H.sonnenHoehe.value = alt;
    }
    if (this.szene.fog) { this.szene.fog.color.copy(S.nebel); this.szene.fog.density = this.nebelDichte * (z.dunst ?? 1); }
    // --- eigenes Boot (dümpelt, Heck in Richtung z.heck)
    const wg = this.wiegen(t), heck = (z.heck ?? 0) * D2R;
    this.eigen.position.set(AUGE.x, wg.heave, AUGE.z); this.eigen.rotation.set(wg.nick, -heck, wg.roll, "YXZ");
    this.eigen.updateMatrixWorld(true);
    // --- Lichter
    const plGruen = this._c2.setRGB(0.3, 1.0, 0.5);
    if (this.lichter) {
      const L = this.lichter, s = L.sonne;
      const vor = this._p.set(0, 0, 0); if (kam) vor.copy(kam.position).setY(0);
      s.position.set(vor.x + sd[0] * 400, Math.max(sd[1], 0.05) * 400, vor.z + sd[2] * 400); s.target.position.copy(vor); s.target.updateMatrixWorld();
      s.color.copy(S.sonne); s.intensity = S.sonneI * sonneSicht * (0.45 + 0.55 * smoothstep(0, 14, alt));
      L.hemi.color.copy(S.hemiH).lerp(plGruen, 0.3 * pl * nacht); L.hemi.groundColor.copy(S.hemiB); L.hemi.intensity = S.hemiI * (1 + 0.35 * pl * nacht);
      L.mond.intensity = S.mond; L.deck.intensity = 9 * S.fenster * nacht;
      const w = this.eigen.localToWorld(this._s.set(...this.deckLichtLokal)); L.deck.position.copy(w);
    }
    // --- Wasser
    const W = this.wasserU;
    W.zeit.value = t; W.welle.value = (z.welle ?? 1) * (0.6 + 0.8 * wind); W.eis.value = eis; W.tief.value.copy(S.wasser);
    W.licht.value.copy(S.hemiH).multiplyScalar(S.hemiI * 0.6).lerp(plGruen, 0.08 * pl * nacht); W.sonnenDir.value.set(...sd); W.sonnenF.value.copy(S.sonne).multiplyScalar(sonneSicht * S.sonneI / 3);
    W.schneeF.value.copy(u.uSchneeF.value);
    W.boot.value.set(AUGE.x, 0, AUGE.z);
    this.ruderGlas.emissive.setRGB(0.5, 0.33, 0.16).multiplyScalar(S.fenster * nacht * 1.5);
    this.ankerBoje.position.y = 0.1 + 0.05 * Math.sin(t * 1.1);
    // --- Schollen
    const sc = this.schollen, sichtbar = (th) => smoothstep(th, th + 0.1, eis);
    this.schollenL.forEach((s, i) => {
      const k = sichtbar(s.th), x = s.x + s.v * tt + 0.15 * Math.sin(tt * 0.1 + s.ph), zz = s.z + 0.3 * s.v * tt;
      this._setze(sc, i, x, 0.04 + 0.035 * Math.sin(t * 0.9 + s.ph), zz, k * 1, s.ry + 0.01 * tt * s.v, s.s * s.sx * k, s.s * k, 0.02 * Math.sin(t * 0.7 + s.ph), 0.02 * Math.cos(t * 0.8 + s.ph));
    });
    sc.instanceMatrix.needsUpdate = true;
    // --- andere Boote
    for (const b of this.boote) {
      const y = 0.06 * Math.sin(t * 0.9 + b.i * 2) + (b.i === 0 ? 0 : 0.02);
      b.gr.position.set(b.x, y, b.z); b.gr.rotation.set(0.025 * Math.sin(t * 0.7 + b.i), b.ry + 0.03 * Math.sin(tt * 0.05 + b.i), 0.03 * Math.sin(t * 0.8 + b.i * 1.7), "YXZ");
      b.gr.updateMatrixWorld(true);
    }
    // --- Rentiere (grasen, gehen langsam)
    const mT = new THREE.Matrix4(), mR = new THREE.Matrix4(), mB = new THREE.Matrix4();
    for (const r of this.rentierL) {
      const ph = r.i * 1.7, gras = 0.5 + 0.5 * Math.sin(tt * (0.8 + 0.15 * r.i) + ph), nick = 0.25 + 0.75 * Math.max(0, gras - 0.25);
      const step = Math.sin(tt * 0.04 + ph) * 2.5, x = r.x + Math.cos(r.dreh) * step, zz = r.z - Math.sin(r.dreh) * step;
      r.gr.position.set(x, hoehe(x, zz) - 0.05, zz); r.gr.rotation.y = r.dreh + 0.15 * Math.sin(tt * 0.03 + ph);
      mT.makeTranslation(0.55, 0.95, 0); mR.makeRotationZ(-nick * 0.95); mB.makeTranslation(-0.55, -0.95, 0);
      r.kopf.matrix.copy(mT).multiply(mR).multiply(mB); r.kopf.matrixWorldNeedsUpdate = true;
    }
    // --- Menschen mit Stirnlampen, Schneemobile
    const lampe = nacht * 1.0, liste = [];
    const fen = u.uFenster.value;
    for (const L of this.statLichter) {
      const f = L.art === "laterne" ? [3.2 * lampe, 2.1 * lampe, 1.0 * lampe] : L.art === "fenster" ? [2.0 * fen, 1.35 * fen, 0.7 * fen] : L.art === "rot" ? [3.5 * lampe, 0.25 * lampe, 0.15 * lampe] : L.art === "gruen" ? [0.2, 2.5 * lampe, 0.6 * lampe] : [2.5 * lampe, 2.5 * lampe, 2.5 * lampe];
      if (lampe > 0.01 || L.art === "fenster") liste.push({ p: L.p, f, r: L.art === "laterne" ? 1.6 : 1.0 });
    }
    const mi = this.menschIM;
    this.wege.forEach((w, i) => {
      let s = w.steh ? w.s0 : w.s0 + w.v * 1.1 * tt; s = ((s % (2 * w.len)) + 2 * w.len) % (2 * w.len); const zur = s > w.len; if (zur) s = 2 * w.len - s;
      const f = s / w.len, dx = (w.w[1][0] - w.w[0][0]) / w.len, dz = (w.w[1][1] - w.w[0][1]) / w.len;
      const x = lerp(w.w[0][0], w.w[1][0], f) - dz * w.quer, zz = lerp(w.w[0][1], w.w[1][1], f) + dx * w.quer;
      const auf = i < 3 ? 1.98 : hoehe(x, zz) - 0.02, dir = (w.steh ? 1 : (w.v > 0) !== zur ? 1 : -1);
      const ry = Math.atan2(dx * dir, dz * dir) + (w.steh ? 0.6 * Math.sin(tt * 0.2 + i) : 0);
      const wipp = w.steh ? 0 : 0.03 * Math.abs(Math.sin(tt * 5 + i));
      this._setze(mi, i, x, auf + wipp, zz, 1, ry);
      if (lampe > 0.01) {
        const fx = Math.sin(ry), fz = Math.cos(ry);
        liste.push({ p: [x + fx * 0.22, auf + 1.68, zz + fz * 0.22], f: [3.6 * lampe, 3.8 * lampe, 4.2 * lampe], r: 0.5 });
        liste.push({ p: [x + fx * 3.5, auf + 0.1, zz + fz * 3.5], f: [0.35 * lampe, 0.38 * lampe, 0.42 * lampe], r: 2.6 });
      }
    });
    mi.instanceMatrix.needsUpdate = true;
    const mo = this.mobilIM;
    this.mobilL.forEach((m, i) => this._setze(mo, i, m.x, hoehe(m.x, m.z) - 0.02, m.z, schnee > 0.25 ? 1 : 0.001, m.ry));
    { // fahrendes Schneemobil auf der Uferstraße (hin und zurück)
      const len = 900, s0 = ((tt * 7) % (2 * len) + 2 * len) % (2 * len), s = s0 > len ? 2 * len - s0 : s0, x = -480 + s, zz = kuesteS(x) - 30, dir = s0 > len ? -1 : 1, k = smoothstep(0.3, 0.5, schnee);
      this._setze(mo, 4, x, hoehe(x, zz), zz, k + 0.001, dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      if (k > 0.01 && lampe > 0.01) liste.push({ p: [x + dir * 1.4, hoehe(x, zz) + 0.8, zz], f: [4 * lampe * k, 3.8 * lampe * k, 3.2 * lampe * k], r: 0.7 }, { p: [x - dir * 1.3, hoehe(x, zz) + 0.7, zz], f: [2.5 * lampe * k, 0.15, 0.1], r: 0.4 });
    }
    mo.instanceMatrix.needsUpdate = true;
    for (const b of this.boote) if (b.mastTop && lampe > 0.01) { const p = b.gr.localToWorld(this._s.set(...b.mastTop)); liste.push({ p: p.toArray(), f: [2.6 * lampe, 2.5 * lampe, 2.3 * lampe], r: 0.5 }); }
    this.lichtPunkte.u.nebelD.value = this.szene.fog ? this.szene.fog.density : 0;
    this.lichtPunkte.setze(liste, kam);
    // --- Dampf (Kraftwerk), Seerauch, Schneefall, Eiskristalle
    const puffs = [], dampf = (z.dampf ?? 1) * (0.55 + 0.45 * schnee), sc0 = this.schornstein;
    const dFarbe = this._c.copy(S.horizont).lerp(this._c2.copy(S.hemiH).multiplyScalar(S.hemiI * 0.7), 0.5).toArray();
    const sl = S.sonne, so = sonneSicht * S.sonneI / 3;
    const df = [Math.min(1.6, dFarbe[0] + sl.r * so * 0.6), Math.min(1.6, dFarbe[1] + sl.g * so * 0.6), Math.min(1.6, dFarbe[2] + sl.b * so * 0.6)];
    if (dampf > 0.02) for (let i = 0; i < 36; i++) {
      const a = fr(tt * 0.06 + i / 36), r = 3 + a * 26;
      puffs.push({ p: [sc0[0] + a * 140 * (0.4 + wind) + 6 * Math.sin(i * 1.7), sc0[1] + a * 55 + 10 * a * a, sc0[2] - a * 30 * wind + 4 * Math.cos(i)], r, dreh: i + a, farbe: df, a: 0.5 * dampf * (1 - a) * smoothstep(0, 0.08, a), licht: 0.8, bild: i % 4 });
    }
    const see = z.seerauch ?? 0;
    if (see > 0.02) for (let i = 0; i < 90; i++) {
      const x = -700 + 1400 * hash(i, 501) + 6 * tt * (0.3 + wind), zz = -30 - 900 * hash(i, 502) + 600 * (hash(i, 503) - 0.3);
      const xx = ((x + 700) % 1400 + 1400) % 1400 - 700; if (landAbstand(xx, zz) > -15 || Math.hypot(xx, zz) < 25) continue;
      puffs.push({ p: [xx, 3 + 4 * hash(i, 504), zz], r: 9 + 12 * hash(i, 505), dreh: i, farbe: df, a: 0.22 * see * (0.6 + 0.4 * Math.sin(tt * 0.3 + i)), licht: 0.5, bild: i % 4 });
    }
    this.dampfP.setze(puffs, kam);
    if (kam) {
      const sf = z.schneefall ?? 0;
      this.schneeT.setze(t, kam, { deckkraft: 0.85 * sf, wind: [0.4 + 2.2 * wind, -0.3, 0.4] });
      const gl = (z.glitzer ?? 0) * sonneSicht;
      this.glitzerT.setze(t, kam, { deckkraft: 0.9 * gl, farbe: this._c.copy(S.sonne).multiplyScalar(1.4), wind: [0.6 * wind, 0.05, 0.2] });
    } else { this.schneeT.obj.visible = false; this.glitzerT.obj.visible = false; }
    // --- Post-Empfehlung
    this.post = { ...S.post, tonung: [...S.post.tonung] };
    return this;
  }
}

// ----------------------------------------------------------------------------------------------- Sonnenbögen (Lichtspur am Himmel) für PHI 78,22
/**
 * Leuchtende Tagesbögen der Sonne: N Bögen mit Deklinationen ε·cos(πk/(N−1)) plus ein „aktueller“ Bogen (jetzt). Polartag: voller Kreis
 * (läuft unter dem Polarstern einmal rundherum, tief im Norden), Polarnacht: kein Bogen. Bei ε → 0 fallen alle zu einem Halbbogen (Mittag 11,8°).
 */
export class Sonnenboegen {
  constructor(szene, { N = 9, seg = 120, radius = 18000, breite = 0.3 } = {}) {
    this.N = N; this.seg = seg; this.R = radius; this.breite = breite;
    const bands = N + 1;
    this.pos = new Float32Array(bands * (seg + 1) * 3 * 3); this.col = new Float32Array(this.pos.length);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const index = []; for (let b = 0; b < bands; b++) for (let i = 0; i < seg; i++) { const a = (b * (seg + 1) + i) * 3, c = a + 3; index.push(a, a + 1, c, c, a + 1, c + 1, a + 1, a + 2, c + 1, c + 1, a + 2, c + 2); }
    geo.setIndex(index); this.geo = geo;
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = -900; szene.add(this.mesh);
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._t = new THREE.Vector3(); this._n = new THREE.Vector3();
  }
  setze({ eps, alpha = 1, jetzt = null, jetztAlpha = 1, hell = 1.6, farbeSommer = "#FFD680", farbeWinter = "#BFD8FF" }) {
    const N = this.N, seg = this.seg, bands = N + 1, R = this.R, ws = this.breite * D2R * R;
    const cs = C(farbeSommer), cw = C(farbeWinter), col = new THREE.Color();
    for (let b = 0; b < bands; b++) {
      const aktuell = b === N, dekl = aktuell ? (jetzt ?? 0) : eps * Math.cos((Math.PI * b) / (N - 1)), a = aktuell ? (jetzt === null ? 0 : jetztAlpha) : alpha;
      const f = eps > 1e-3 ? (dekl / eps + 1) / 2 : 0.5;
      col.copy(cw).lerp(cs, clamp(f)).multiplyScalar(hell * (aktuell ? 1.5 : 1) * a);
      const x = -Math.tan(PHI * D2R) * Math.tan(dekl * D2R), Hs = Math.acos(clamp(x, -1, 1)) / D2R, voll = x <= -1;
      for (let i = 0; i <= seg; i++) {
        const H = lerp(-Hs, Hs, i / seg), dir = (HH, out) => out.set(...sonnenRichtung(dekl, HH));
        dir(H, this._a); dir(H + 0.6, this._b); this._t.copy(this._b).sub(this._a).normalize(); this._n.copy(this._a).cross(this._t).normalize();
        const rand = voll ? 1 : smoothstep(0, 0.07, i / seg) * (1 - smoothstep(0.93, 1, i / seg)), hor = smoothstep(0.0, 0.03, this._a.y), w = rand * hor * (Hs > 0.5 ? 1 : 0);
        const k = (b * (seg + 1) + i) * 9;
        for (let j = 0; j < 3; j++) {
          const off = (j - 1) * ws;
          this.pos[k + j * 3] = this._a.x * R + this._n.x * off; this.pos[k + j * 3 + 1] = this._a.y * R + this._n.y * off; this.pos[k + j * 3 + 2] = this._a.z * R + this._n.z * off;
          const m = j === 1 ? w : 0; this.col[k + j * 3] = col.r * m; this.col[k + j * 3 + 1] = col.g * m; this.col[k + j * 3 + 2] = col.b * m;
        }
      }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
    this.mesh.visible = alpha > 0.001 || (jetzt !== null && jetztAlpha > 0.001);
    return this;
  }
  folge(kamera) { this.mesh.position.copy(kamera.position); return this; }
}
