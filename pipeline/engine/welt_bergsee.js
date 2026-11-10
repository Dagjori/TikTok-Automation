// Welt „Bergsee im Herbstwald“ (Account 2 @stelldirvor.pov, Weltenkatalog „Bergsee / Herbstwald“), Erstbau 10.11.2026
// („Was wäre, wenn der Erdkern abkühlt?“, Projekt erdkern-kuehlt). NUR für den Baukasten Lunar-POV. Alles prozedural, reine Funktion von t
// (feste Seeds über hash(), kein Math.random, kein Zustand zwischen Bildern).
//
// STANDPUNKT: bodennah am Südufer eines Bergsees, sitzend (Auge 0,95 m über dem Boden), Blick nach Norden über den See. Rechts vorn neben dem
// Sitzplatz ein flacher Stein mit aufgeklapptem Spiegelkompass (Grundplatte, Skala, Nadel, Spiegeldeckel, rote Kordel), daneben Fliegenpilze.
// INHALT: See mit echter Spiegelung (Reflector), Wind-Kräuseln, Kielwellen der Enten, Fischringe, Flachwasser mit Steingrund, treibendes Laub;
// Uferkies, Herbstgras, Laub am Boden, Ufersteine mit Moos, Schilfgürtel (wiegt im Wind), Holzsteg mit Ruderboot (rechts ins Bild),
// Stockenten (Erpel/Weibchen, gründeln, können auffliegen), Vogelschwarm, fallende Blätter; Wald ringsum: dunkle Fichten, goldene Lärchen,
// gelbes/oranges/rotes Laub (nah detailliert, fern Silhouetten + Kronendach im Bodenshader), Talhänge, Felsgipfel mit erstem Schnee,
// Berghütte am Nordufer mit Rauch und Fensterlicht. Himmel: Verlauf, Sonne, Venusgürtel, Wolken (von der tiefen Sonne gefärbt), Sterne,
// Milchstraße, Polarlicht (grüne Vorhänge mit roten Säumen, Strahlen; Lage über plNord vom Nordhorizont bis in den Zenit verschiebbar).
// Bergschatten: bei tiefer Sonne liegt das Tal im Schatten, nur die Gipfel glühen (Alpenglühen). Fünf Stimmungen, weich überblendet.
//
// ===================================================================================================== API (vollständig)
// Koordinaten: Meter, y oben, Seespiegel y = 0, NORDEN = −z, OSTEN = +x, Süden = +z, Westen = −x. Kamera (Auge) bei (0, hoehe(0,0) + 0,95, 0).
// Gierwinkel „yaw“ in Grad: 0 = Norden (Blick über den See), +90 = Osten (rechts), −90 = Westen (links), 180 = Süden. pitch + = nach oben.
// Sonnen-Azimut „az“ in Grad: 0 = Nord, 90 = Ost, 180 = Süd, 270 = West (Herbstnachmittag ≈ 215–235, Untergang ≈ 245, Morgen ≈ 80–100).
//
//   import { Bergsee, AUGE, KOMPASS, ORTE, STIMMUNGEN, TAGESVERLAUF, verlauf, richtung, sonnenRichtung, hoehe, landAbstand, waldMass,
//            nadelEinschwingen, nadelZittern, nadelKurve } from "../../engine/welt_bergsee.js";
//
//   AUGE = { x: 0, z: 0, sitz: 0.95 }        Sitzplatz; augePos() → [0, hoehe(0,0) + 0,95, 0]
//   KOMPASS = { x, z, steinOben, mitte: [x,y,z] }   Mitte des Kompasses (für Blickziel der Nahaufnahme), steinOben = Höhe der Steinplatte
//   ORTE = { nord, gipfel, huette, steg, boot, enten, zenit, kompass, westen, osten }   [x, y, z] für Blickziele (PovKamera.blick)
//   richtung(yaw, pitch) → [x, y, z]   sonnenRichtung(hoehe, az) → [x, y, z]   hoehe(x, z) → Gelände (m)   landAbstand(x, z) → > 0 Land, < 0 See
//   waldMass(x, z) → 0..1 Walddichte
//   verlauf(s) → { sonne: {hoehe, az}, polarlicht, plNord, wolken, nebel, voegel, blaetter }   Tagesverlauf als reine Funktion von s (0..1):
//       0 Herbstnachmittag · 0,32 Sonnenuntergang · 0,52 klare Nacht · 0,58–0,80 Polarlicht (0,70 Nordhimmel → 0,80 Zenit) · 0,86 erloschen ·
//       1 fahle Morgendämmerung. Die Szene bildet t → s selbst ab (z. B. s = t / 80) und darf jeden Wert überschreiben.
//   nadelEinschwingen(t, t0, von, nach, { dauer = 5, schwingungen = 3 }) → Grad (gedämpftes Pendeln von „von“ nach „nach“ ab t0)
//   nadelZittern(t, staerke) → Grad (unruhiges Zittern, Funktion von t; staerke 1 ≈ ±14°)
//   nadelKurve(t, { nordBis, zitternBis, ruheBis, endWinkel = 0, zitternStaerke = 1, wandern = 0.6 }) → { winkel, zittern, wandern }
//       fertige Dramaturgie: zeigt Nord bis nordBis, zittert bis zitternBis (wird stärker, wandert), schwingt bis ruheBis auf endWinkel ein.
//
//   const welt = new Bergsee(szene, {
//     schatten = 4096 (Schattenkarte, 0 = aus; Buehne braucht schatten: true), licht = true, himmel = true, nebel = true (setzt szene.fog),
//     nebelDichte = 7e-5 (mit aktiviereHoehenNebel({ abfall: 0.0012 }) der Szene), spiegel = 0.5 (Auflösungsanteil der Spiegelung, 0 = ohne),
//     baeume = 1 (Dichte-Faktor ferner Wald), kompassGroesse = 1.4 (Maßstab des Kompasses; 1 = echte 6 × 11 cm), enten = 9 });
//   welt.update(t, {                        // alles optional; jeder Wert wirkt sofort (kein Gedächtnis)
//     kamera,                               // THREE.PerspectiveCamera (Himmel folgt, Schattenausschnitt, Sortierung der Puffs, Partikelgröße)
//     sonne: { hoehe, az },                 // Grad; alternativ sonnenRichtung: [x, y, z]
//     stimmung,                             // "nachmittag" | "sonnenuntergang" | "nacht" | "polarlicht" | "daemmerung" | { name: Gewicht }
//                                           // Standard: automatisch aus Sonnenhöhe, Azimut (Abend/Morgen) und polarlicht (weich überblendet)
//     polarlicht = 0,                       // 0..1 Stärke der Vorhänge (0 = erloschen)
//     plNord = 380,                         // Lage der Vorhänge in km nördlich: ≈ 420 tief am Nordhimmel, 200 halbhoch, 0 im Zenit (Korona), < 0 südlich
//     sterne, wolken = 0.4, nebel = 0,      // 0..1: Sterne (Standard aus Sonnenhöhe), Wolkendecke, Nebelschwaden über dem Wasser
//     wind = 0.5, welle = 1,                // Wind (Schilf, Gras, Bäume, Kräuseln, Rauch, Blätter), Wellenstärke
//     enten = 1, entenFlucht = null,        // Enten sichtbar 0/1; entenFlucht = t0 → die Enten fliegen ab t0 nacheinander auf und davon
//     voegel = 1, blaetter = 1, rauch = 1,  // Vogelschwarm, fallende/treibende Blätter, Rauch aus der Hütte (je 0..1)
//     fenster,                              // 0..1 Fensterlicht der Hütte (Standard aus der Stimmung)
//     nadel: { winkel = 0, zittern = 0, wandern = 0, ruhe: { t0, von, dauer } },   // Kompassnadel (Grad, 0 = Nord, + = nach Osten);
//                                           //   zittern 0..1 (schnelles Zittern), wandern 0..1 (langsames Umherirren bis ±50°),
//                                           //   ruhe: gedämpftes Einschwingen von „von“ auf „winkel“ ab t0. nadelKurve(t, …) liefert alles fertig.
//     leuchten,                             // 0..1 Leuchtfarbe auf Nadelspitze und N-O-S-W (Standard: nachts an)
//     tempo = 1 })                          // Tempo von Enten, Treibgut, Blättern (Zeitraffer z. B. 0,3)
//   welt.setze(t, kamera, zustand)          Alias
//   welt.augePos(t)  → [x, y, z]            Augenpunkt (sitzend) für PovKamera
//   welt.post        → Empfehlung für Buehne-post je Stimmung { belichtung, saettigung, kontrast, tonung, tonungStaerke, bloomStaerke, bloomSchwelle }
//   welt.lichter     → { sonne (DirectionalLight, Schatten), hemi, mond, aurora } – nach update frei überschreibbar
//   welt.zustand     → zuletzt berechnete Werte { alt, az, gewichte, sonnenDir, nadelWinkel, nacht }
//   welt.kompass     → THREE.Group des Kompasses (Nadel: welt.nadel), welt.himmel.u (Uniforms des Himmels)
//
// Szenen-Muster (siehe pipeline/projekte/_test-bergsee/szene.js):
//   aktiviereHoehenNebel({ abfall: 0.0012, basis: 0 });  const welt0 = new Bergsee(szene, { schatten: 4096 });
//   const kam = new THREE.PerspectiveCamera(58, 1080 / 1920, 0.05, 40000);
//   update(t) { kam.position.set(...welt0.augePos(t)); kam.lookAt(…); kam.updateMatrixWorld();
//               welt0.update(t, { kamera: kam, ...verlauf(t / 80), nadel: nadelKurve(t, { nordBis: 20, zitternBis: 50, ruheBis: 62 }) });
//               Object.assign(post, welt0.post) }   – Kamera vor welt.update setzen (Himmel, Schatten und Puffs folgen ihr).
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { clamp, lerp, smoothstep, hash, ease } from "./bewegung.js";
import { GLSL_NOISE, buschel } from "./welt_feld_wald.js";
import { sammle, zweig, klumpe, bucheGeo, fichteGeo, fichteFern, bucheFern } from "./welt_waldlichtung.js";
import { Puffs, Voegel } from "./stil_lunar_pov.js";

const D2R = Math.PI / 180;
const C = (h) => new THREE.Color(h);
const fr = (x) => x - Math.floor(x);

// ----------------------------------------------------------------------------------------------- Rauschen (gleich wie GLSL_NOISE nN/nF)
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 17.1; a *= 0.5; } return s; }

// ----------------------------------------------------------------------------------------------- Lage und Gelände
export const AUGE = { x: 0, z: 0, sitz: 0.95 };
export const richtung = (yaw, pitch = 0) => [Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R)];
export function sonnenRichtung(hoehe, az) { const h = hoehe * D2R, a = az * D2R; return [Math.sin(a) * Math.cos(h), Math.sin(h), -Math.cos(a) * Math.cos(h)]; }

const SEE_CZ = -640, SEE_RZ = 636;
const seeRX = (z) => lerp(430, 290, smoothstep(-150, -1250, z));                  // See wird nach Norden schmaler
const GIPFEL = [-330, -4300];
/** > 0 Land, < 0 See (ungefähr Meter bis zum Ufer); nahe am Sitzplatz fast glatt (Ufer bei z ≈ −4) */
export function landAbstand(x, z) {
  const m = Math.hypot(x / seeRX(z), (z - SEE_CZ) / SEE_RZ), amp = smoothstep(8, 260, Math.hypot(x, z));
  return (m - 1) * 520 + amp * (70 * (fbm(x * 0.0042 + 3.1, z * 0.0042 + 1.7, 3) - 0.5) + 14 * (vn(x * 0.03, z * 0.03) - 0.5)) + 0.9 * (vn(x * 0.35 + 2, z * 0.35) - 0.5);
}
export function hoehe(x, z) {
  const d = landAbstand(x, z);
  if (d < 0) return Math.max(-25, d * 0.2) - 0.12;                                 // Seegrund
  let y = 0.04 + 0.13 * Math.min(d, 5) + 0.05 * clamp(d - 5, 0, 40) + 0.7 * smoothstep(30, 300, Math.hypot(x, z)) * smoothstep(0, 2.5, d);
  y += 0.22 * (fbm(x * 0.4, z * 0.4, 2) - 0.5) * smoothstep(0.5, 3, d);           // Unebenheit am Ufer
  y += 380 * Math.pow(smoothstep(30, 1200, d), 1.3) * (0.7 + 0.6 * fbm(x * 0.0011 + 4, z * 0.0011, 3));   // Talhänge
  const rid = 1 - Math.abs(2 * fbm(x * 0.0022 + 3, z * 0.0022 + 8, 3) - 1);       // Grate und Rinnen an den Hängen
  y += (170 * rid - 70) * smoothstep(150, 900, d);
  const n = -z - 1300;                                                             // Gebirge im Norden
  y += 420 * smoothstep(0, 2600, n) * (0.55 + 0.9 * fbm(x * 0.0007 + 9, z * 0.0007, 4));
  const gp = Math.hypot(x - GIPFEL[0], (z - GIPFEL[1]) / 1.25), grat = 1 - Math.abs(2 * vn(x * 0.004 + 1, z * 0.004) - 1);
  y += 680 * Math.pow(Math.max(0, 1 - gp / 1500), 1.6) * (0.85 + 0.3 * grat);       // Felsgipfel
  y += 60 * (grat - 0.5) * smoothstep(1500, 3000, n);
  return y;
}
/** Walddichte 0..1 (gleiche Formel wie im Bodenshader) */
export function waldMass(x, z, y = hoehe(x, z), d = landAbstand(x, z)) {
  if (d < 6) return 0;
  const lichtung = smoothstep(0.24, 0.36, fbm(x * 0.0045 + 7, z * 0.0045 + 2, 3));
  const grenze = 1 - smoothstep(780, 980, y + 160 * (vn(x * 0.003, z * 0.003) - 0.5));
  const nahFrei = smoothstep(34, 60, Math.hypot(x * 0.9, z - 10));                  // Uferwiese: Nachmittagssonne erreicht den Sitzplatz
  return lichtung * grenze * nahFrei * smoothstep(6, 18, d);
}
const pos3 = (x, z, dy = 0) => [x, hoehe(x, z) + dy, z];
export const KOMPASS = { x: 0.13, z: -1.22, steinH: 0.42 };
KOMPASS.steinOben = hoehe(KOMPASS.x, KOMPASS.z) + KOMPASS.steinH;
KOMPASS.mitte = [KOMPASS.x, KOMPASS.steinOben + 0.012, KOMPASS.z];
const STEG = { a: [2.6, -2.2], b: [8.5, -38], deck: 0.62, breite: 1.4 };
export const ORTE = {
  nord: [0, 40, -1400], gipfel: pos3(GIPFEL[0], GIPFEL[1], 0), steg: [6.4, 0.8, -25], boot: [9.6, 0.3, -36.5], enten: [-2, 0.2, -18],
  zenit: [0, 1e4, -10], kompass: KOMPASS.mitte, westen: [-1000, 60, -300], osten: [1000, 60, -300], huette: null,
};

// ----------------------------------------------------------------------------------------------- Stimmungen
export const STIMMUNGEN = {
  nachmittag: { zenit: "#3F6DAE", horizont: "#C4D3E2", unten: "#5E6A60", hof: "#FFE2B8", guertel: "#C8D0DE", guertelS: 0, sonne: "#FFE6C2", sonneI: 3.1, hemiH: "#B2C6E2", hemiB: "#5C5238", hemiI: 1.15, mond: 0, nebel: "#B9C9DA", wasser: "#0C2630", flach: "#5A5236", wolkenHell: "#FFFFFF", wolkenDunkel: "#97A3B6", fenster: 0,
    post: { belichtung: 1.04, saettigung: 1.1, kontrast: 1.07, tonung: [1.04, 1.0, 0.94], tonungStaerke: 0.2, bloomStaerke: 0.9, bloomSchwelle: 1.0 } },
  sonnenuntergang: { zenit: "#2B4580", horizont: "#F0A060", unten: "#3A3030", hof: "#FF7A38", guertel: "#9C7CA6", guertelS: 0.45, sonne: "#FF9248", sonneI: 2.6, hemiH: "#8E8CB6", hemiB: "#4A3428", hemiI: 0.75, mond: 0, nebel: "#B08C8E", wasser: "#0A1622", flach: "#3A3024", wolkenHell: "#FFAE70", wolkenDunkel: "#5A4466", fenster: 0.6,
    post: { belichtung: 1.1, saettigung: 1.15, kontrast: 1.08, tonung: [1.08, 0.97, 0.9], tonungStaerke: 0.25, bloomStaerke: 1.15, bloomSchwelle: 0.9 } },
  nacht: { zenit: "#02040C", horizont: "#0A1430", unten: "#03050A", hof: "#101A38", guertel: "#0A1430", guertelS: 0, sonne: "#8090C0", sonneI: 0, hemiH: "#2E4474", hemiB: "#0C1018", hemiI: 0.3, mond: 0.45, nebel: "#0A1226", wasser: "#010409", flach: "#06080A", wolkenHell: "#141A2A", wolkenDunkel: "#05070C", fenster: 1,
    post: { belichtung: 1.25, saettigung: 1.0, kontrast: 1.06, tonung: [0.86, 0.95, 1.12], tonungStaerke: 0.3, bloomStaerke: 1.25, bloomSchwelle: 0.8 } },
  polarlicht: { zenit: "#020A0C", horizont: "#06201E", unten: "#030807", hof: "#0A2A24", guertel: "#06201E", guertelS: 0, sonne: "#80C0A0", sonneI: 0, hemiH: "#2A6C58", hemiB: "#0A1410", hemiI: 0.42, mond: 0.2, nebel: "#08201C", wasser: "#010605", flach: "#050A08", wolkenHell: "#123028", wolkenDunkel: "#04080A", fenster: 1,
    post: { belichtung: 1.28, saettigung: 1.08, kontrast: 1.06, tonung: [0.88, 1.06, 0.98], tonungStaerke: 0.25, bloomStaerke: 1.35, bloomSchwelle: 0.75 } },
  daemmerung: { zenit: "#263A62", horizont: "#C4AEB0", unten: "#2E3038", hof: "#E8B49A", guertel: "#7E7898", guertelS: 0.3, sonne: "#FFC6A0", sonneI: 1.6, hemiH: "#7E8CAE", hemiB: "#30302E", hemiI: 0.6, mond: 0.05, nebel: "#9AA0B4", wasser: "#08141E", flach: "#2A2A26", wolkenHell: "#E8C0B4", wolkenDunkel: "#6A6E86", fenster: 0.7,
    post: { belichtung: 1.12, saettigung: 0.88, kontrast: 1.04, tonung: [0.96, 0.97, 1.04], tonungStaerke: 0.2, bloomStaerke: 1.05, bloomSchwelle: 0.9 } },
};
const ST_NAMEN = Object.keys(STIMMUNGEN);
const ST_FARBEN = ["zenit", "horizont", "unten", "hof", "guertel", "sonne", "hemiH", "hemiB", "nebel", "wasser", "flach", "wolkenHell", "wolkenDunkel"];
const ST_ZAHLEN = ["guertelS", "sonneI", "hemiI", "mond", "fenster"];
const ST_C = Object.fromEntries(ST_NAMEN.map((n) => [n, Object.fromEntries(ST_FARBEN.map((f) => [f, C(STIMMUNGEN[n][f])]))]));
function autoGewichte(alt, az, pl) {
  const tag = smoothstep(3, 12, alt), tief = (1 - tag) * smoothstep(-9, -1, alt), nacht = Math.max(0, 1 - tag - tief);
  const abend = smoothstep(150, 210, ((az % 360) + 360) % 360);
  const p = clamp(pl * 1.4) * nacht;
  return { nachmittag: tag, sonnenuntergang: tief * abend, daemmerung: tief * (1 - abend), nacht: nacht - p, polarlicht: p };
}
function mischeStimmung(g) {
  let s = 0; for (const n of ST_NAMEN) s += g[n] || 0;
  const out = { gewichte: {}, post: {} };
  for (const f of ST_FARBEN) out[f] = new THREE.Color(0, 0, 0);
  for (const f of ST_ZAHLEN) out[f] = 0;
  const pk = Object.keys(STIMMUNGEN.nacht.post); for (const k of pk) out.post[k] = k === "tonung" ? [0, 0, 0] : 0;
  for (const n of ST_NAMEN) {
    const a = s > 0 ? (g[n] || 0) / s : n === "nachmittag" ? 1 : 0; out.gewichte[n] = a; if (a <= 0) continue;
    for (const f of ST_FARBEN) { const c = ST_C[n][f]; out[f].r += c.r * a; out[f].g += c.g * a; out[f].b += c.b * a; }
    for (const f of ST_ZAHLEN) out[f] += STIMMUNGEN[n][f] * a;
    for (const k of pk) { const v = STIMMUNGEN[n].post[k]; if (k === "tonung") for (let i = 0; i < 3; i++) out.post.tonung[i] += v[i] * a; else out.post[k] += v * a; }
  }
  return out;
}

// ----------------------------------------------------------------------------------------------- Tagesverlauf (reine Funktion von s)
export const TAGESVERLAUF = [
  { s: 0.0, hoehe: 22, az: 218, polarlicht: 0, plNord: 430, wolken: 0.52, nebel: 0, voegel: 1, blaetter: 1 },
  { s: 0.22, hoehe: 6, az: 238, polarlicht: 0, plNord: 430, wolken: 0.5, nebel: 0, voegel: 1, blaetter: 1 },
  { s: 0.32, hoehe: 0.4, az: 246, polarlicht: 0, plNord: 430, wolken: 0.55, nebel: 0.05, voegel: 0.6, blaetter: 0.8 },
  { s: 0.42, hoehe: -7, az: 256, polarlicht: 0, plNord: 430, wolken: 0.28, nebel: 0.15, voegel: 0, blaetter: 0.4 },
  { s: 0.52, hoehe: -17, az: 285, polarlicht: 0, plNord: 430, wolken: 0.04, nebel: 0.15, voegel: 0, blaetter: 0.2 },
  { s: 0.58, hoehe: -19, az: 305, polarlicht: 1, plNord: 430, wolken: 0, nebel: 0.15, voegel: 0, blaetter: 0.2 },
  { s: 0.7, hoehe: -20, az: 335, polarlicht: 1, plNord: 360, wolken: 0, nebel: 0.2, voegel: 0, blaetter: 0.2 },
  { s: 0.8, hoehe: -19, az: 365, polarlicht: 1, plNord: 0, wolken: 0, nebel: 0.25, voegel: 0, blaetter: 0.2 },
  { s: 0.86, hoehe: -17, az: 380, polarlicht: 0, plNord: 0, wolken: 0, nebel: 0.3, voegel: 0, blaetter: 0.2 },
  { s: 0.93, hoehe: -11, az: 420, polarlicht: 0, plNord: 0, wolken: 0.1, nebel: 0.55, voegel: 0, blaetter: 0.3 },
  { s: 1.0, hoehe: -4, az: 445, polarlicht: 0, plNord: 0, wolken: 0.2, nebel: 0.7, voegel: 0.3, blaetter: 0.5 },
];
export function verlauf(s) {
  const K = TAGESVERLAUF; s = clamp(s);
  let i = 0; while (i < K.length - 2 && s > K[i + 1].s) i++;
  const a = K[i], b = K[i + 1], f = ease.inOutSine(clamp((s - a.s) / (b.s - a.s))), m = (k) => lerp(a[k], b[k], f);
  return { sonne: { hoehe: m("hoehe"), az: m("az") }, polarlicht: m("polarlicht"), plNord: m("plNord"), wolken: m("wolken"), nebel: m("nebel"), voegel: m("voegel"), blaetter: m("blaetter") };
}

// ----------------------------------------------------------------------------------------------- Kompassnadel
export function nadelZittern(t, staerke = 1) {
  return staerke * (7 * Math.sin(t * 31.0) + 4.5 * Math.sin(t * 47.3 + 1.3) + 2.5 * Math.sin(t * 73.1 + 2.1) + 3 * (vn(t * 9.0, 3.7) - 0.5) * 2);
}
export function nadelEinschwingen(t, t0, von, nach, { dauer = 5, schwingungen = 3 } = {}) {
  if (t <= t0) return von;
  const x = (t - t0) / dauer, w = 2 * Math.PI * schwingungen;
  return nach + (von - nach) * Math.exp(-4.2 * x) * Math.cos(w * x);
}
/** fertige Dramaturgie: Nord → Zittern/Umherirren → Einschwingen auf endWinkel */
export function nadelKurve(t, { nordBis = 10, zitternBis = 40, ruheBis = 50, endWinkel = 0, zitternStaerke = 1, wandern = 0.6 } = {}) {
  if (t < nordBis) return { winkel: 0, zittern: 0.04 * smoothstep(nordBis - 3, nordBis, t), wandern: 0 };
  if (t < zitternBis) { const k = smoothstep(nordBis, nordBis + 3, t); return { winkel: 0, zittern: zitternStaerke * k * (0.6 + 0.4 * smoothstep(nordBis, zitternBis, t)), wandern: wandern * k }; }
  const vonW = 50 * wandern * (fbm(zitternBis * 0.18 + 5, 1.3, 2) - 0.5) * 2 + nadelZittern(zitternBis, zitternStaerke);
  return { winkel: endWinkel, zittern: zitternStaerke * (1 - smoothstep(zitternBis, zitternBis + 1.2, t)) * 0.6, wandern: 0, ruhe: { t0: zitternBis, von: vonW, dauer: Math.max(1.5, ruheBis - zitternBis) } };
}

// ----------------------------------------------------------------------------------------------- GLSL: Ufer, Wald (wie landAbstand/waldMass)
const GLSL_SEE = /* glsl */ `
float bsF3(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * nN(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
float landD(vec2 p) {
  float rx = mix(430.0, 290.0, 1.0 - smoothstep(-1250.0, -150.0, p.y));
  float m = length(vec2(p.x / rx, (p.y + 640.0) / 636.0));
  float amp = smoothstep(8.0, 260.0, length(p));
  return (m - 1.0) * 520.0 + amp * (70.0 * (bsF3(p * 0.0042 + vec2(3.1, 1.7)) - 0.5) + 14.0 * (nN(p * 0.03) - 0.5)) + 0.9 * (nN(p * 0.35 + vec2(2.0, 0.0)) - 0.5);
}
float waldM(vec2 p, float y, float d) {
  if (d < 6.0) return 0.0;
  float lichtung = smoothstep(0.24, 0.36, bsF3(p * 0.0045 + vec2(7.0, 2.0)));
  float grenze = 1.0 - smoothstep(780.0, 980.0, y + 160.0 * (nN(p * 0.003) - 0.5));
  float nahFrei = smoothstep(34.0, 60.0, length(vec2(p.x * 0.9, p.y - 10.0)));
  return lichtung * grenze * nahFrei * smoothstep(6.0, 18.0, d);
}`;

// ----------------------------------------------------------------------------------------------- Bergschatten + Wind (gemeinsam für alle Materialien)
function bsVertex(vs, { wind = 0, windH = 1, krone = false, welt = false } = {}) {
  vs = vs.replace("#include <common>", `#include <common>
varying vec3 vBSW; varying vec3 vBSN; varying float vKH; uniform float uZeit, uWind;
${krone ? "attribute vec3 kc;" : ""}`);
  vs = vs.replace("#include <begin_vertex>", `#include <begin_vertex>
  {
    vec4 wp0 = vec4(0.0, 0.0, 0.0, 1.0);
  #ifdef USE_INSTANCING
    wp0 = instanceMatrix * wp0;
  #endif
    wp0 = modelMatrix * wp0;
    vKH = ${krone ? "fract(sin(dot(kc.xz * 1.7 + kc.y + wp0.xz * 0.37, vec2(12.9898, 78.233))) * 43758.5453)" : "0.0"};
    ${wind > 0 ? `float k = clamp(position.y / ${windH.toFixed(2)}, 0.0, 1.0); k *= k;
    float ph = wp0.x * 0.37 + wp0.z * 0.23;
    float boe = 0.5 + 0.5 * sin(wp0.x * 0.05 + wp0.z * 0.03 - uZeit * 1.3);
    transformed.x += (sin(uZeit * 1.9 + ph) * 0.6 + sin(uZeit * 3.3 + ph * 1.7) * 0.25 + boe * 0.8) * k * ${wind.toFixed(3)} * uWind;
    transformed.z += cos(uZeit * 1.4 + ph) * k * ${(wind * 0.5).toFixed(3)} * uWind;` : ""}
  }`);
  vs = vs.replace("#include <project_vertex>", `#include <project_vertex>
  { vec4 bsw = vec4(transformed, 1.0); vec3 bsn = objectNormal;
  #ifdef USE_INSTANCING
    bsw = instanceMatrix * bsw; bsn = mat3(instanceMatrix) * bsn;
  #endif
    vBSW = (modelMatrix * bsw).xyz; vBSN = normalize(mat3(modelMatrix) * bsn); }`);
  return vs;
}
function bsFragment(fs, { krone = false, moos = 0, extra = "" } = {}) {
  fs = fs.replace("#include <common>", `#include <common>
varying vec3 vBSW; varying vec3 vBSN; varying float vKH; uniform float uBSY, uBSMin, uZeit;
${moos > 0 ? GLSL_NOISE : ""}`);
  fs = fs.replace("#include <color_fragment>", `#include <color_fragment>
  ${krone ? "diffuseColor.rgb *= vKH < 0.22 ? vec3(1.2, 0.7, 0.5) : (vKH > 0.8 ? vec3(1.06, 1.12, 0.74) : (vKH > 0.66 ? vec3(0.8, 0.86, 0.7) : vec3(1.0)));" : ""}
  ${moos > 0 ? `{ float mo = smoothstep(0.45, 0.85, vBSN.y) * smoothstep(0.35, 0.7, nN(vBSW.xz * 6.0 + vBSW.y * 3.0)) * ${moos.toFixed(2)};
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13, 0.19, 0.06) * (0.8 + 0.4 * nN(vBSW.xz * 23.0)), mo);
    float fl = smoothstep(0.72, 0.8, nN(vBSW.xz * 14.0 + vBSW.y * 9.0));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.6, 0.42), fl * 0.5); }` : ""}
  ${extra}`);
  fs = fs.replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
  { float bs = mix(uBSMin, 1.0, smoothstep(uBSY - 90.0, uBSY + 90.0, vBSW.y)); reflectedLight.directDiffuse *= bs; reflectedLight.directSpecular *= bs; }`);
  return fs;
}
let MAT_NR = 0;
function weltMat(u, { color = "#FFFFFF", roughness = 0.9, metalness = 0, vertexColors = false, flatShading = true, side = THREE.FrontSide, wind = 0, windH = 1, krone = false, moos = 0, extra = "", emissive = null, transparent = false, opacity = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, vertexColors, flatShading, side, transparent, opacity });
  if (emissive) m.emissive = C(emissive);
  const key = "bs-" + MAT_NR++;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uZeit: u.uZeit, uWind: u.uWind, uBSY: u.uBSY, uBSMin: u.uBSMin });
    sh.vertexShader = bsVertex(sh.vertexShader, { wind, windH, krone });
    sh.fragmentShader = bsFragment(sh.fragmentShader, { krone, moos, extra });
  };
  m.customProgramCacheKey = () => key;
  return m;
}

// ----------------------------------------------------------------------------------------------- Himmel
const HIMMEL_V = /* glsl */ `
varying vec3 vDir;
void main() { vDir = (modelMatrix * vec4(position, 0.0)).xyz; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const HIMMEL_F = /* glsl */ `
uniform vec3 zenit, horizont, unten, hof, guertel, sonnenDir, sonnenFarbe, wolkenHell, wolkenDunkel, plGruen, plRot;
uniform float guertelS, sonnenStaerke, sonnenGroesse, glanz, dunst, sterne, helligkeit, wolken, zeit, polarlicht, plNord;
varying vec3 vDir;
${GLSL_NOISE}
float nH3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
vec3 polarlichtF(vec3 d) {
  if (polarlicht < 0.001 || d.y < 0.004) return vec3(0.0);
  float h = max(d.y, 0.012);
  vec3 acc = vec3(0.0);
  for (int c = 0; c < 3; c++) {
    float fc = float(c);
    float y0 = plNord + 70.0 * fc - 50.0;
    float st = 1.0 - 0.26 * fc;
    for (int k = 0; k < 16; k++) {
      float ff = float(k) / 15.0;
      float a = 100.0 + ff * 190.0;                                  // Höhe der Schicht (km)
      vec2 q = vec2(d.x, -d.z) / h * a;                              // Ort auf der Schicht (km), q.y = Norden
      float x = q.x;
      float kurve = y0 + 85.0 * sin(x * 0.0042 + zeit * 0.11 + fc * 2.1) + 70.0 * (nN(vec2(x * 0.0055 + zeit * 0.045, fc * 7.3)) - 0.5)
                  + 22.0 * sin(x * 0.019 - zeit * 0.33 + fc * 1.7);
      float schritt = 12.7 * abs(d.z) / h;
      float b0 = (6.0 + 7.0 * nN(vec2(x * 0.008 + 3.0, fc + 3.0))) * (1.0 - 0.45 * h);   // über Kopf schmaler
      float breite = max(b0 + ff * 6.0, schritt * 0.75);
      float dy = q.y - kurve;
      float band = exp(-dy * dy / (breite * breite)) * b0 / breite;
      float rx = x * 0.11 * (1.0 + 2.5 * h * h) / (1.0 + schritt * 0.02);            // über Kopf feinere Strahlen (Korona)
      float strahl = 0.12 + 0.88 * pow(nN(vec2(rx + zeit * (0.22 + 0.1 * fc), fc * 13.0)), 2.6) + 0.35 * pow(nN(vec2(rx * 3.1 - zeit * 0.5, fc)), 4.0);
      float unten = smoothstep(-0.02, 0.05, ff);
      float u2 = (ff - 0.08) / 0.05;
      float profil = (exp(-ff * 3.4) + 0.35 * exp(-u2 * u2)) * unten;
      vec3 col = mix(plGruen, plRot, smoothstep(0.42, 1.0, ff)) * (1.0 + 0.6 * (1.0 - unten));
      acc += col * band * strahl * profil * st;
    }
  }
  acc *= smoothstep(0.004, 0.05, d.y);
  if (any(isnan(acc)) || any(isinf(acc))) acc = vec3(0.0);
  float puls = 0.82 + 0.18 * sin(zeit * 0.9) * sin(zeit * 0.37 + 1.0);
  return acc * polarlicht * puls * 0.2;
}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float g = 1.0 - exp(-max(h, 0.0) / max(dunst, 1e-3));
  vec3 col = mix(horizont, zenit, g);
  vec3 s = normalize(sonnenDir);
  vec2 dh = normalize(d.xz + vec2(1e-5)), sh = normalize(s.xz + vec2(1e-5));
  float azc = dot(dh, sh);
  float tiefS = 1.0 - smoothstep(0.05, 0.45, s.y);
  col += hof * exp((azc - 1.0) * 1.5) * exp(-max(h, 0.0) / 0.17) * smoothstep(-0.3, -0.02, s.y) * tiefS * 0.9;
  float bh = (h - 0.075) / 0.055;
  col = mix(col, guertel, clamp(exp((-azc - 1.0) * 1.2) * exp(-bh * bh) * guertelS, 0.0, 1.0));
  // Wolken (Schicht ≈ 2,5 km), von der tiefen Sonne gefärbt
  float dichte = 0.0;
  if (wolken > 0.001 && h > 0.0) {
    vec2 q = d.xz / (h + 0.04) * 2.2 + vec2(zeit * 0.004, zeit * 0.0016);
    float n = nF(q * 0.9) * 0.68 + nN(q * 3.7) * 0.32;
    dichte = smoothstep(1.0 - wolken * 0.72, 1.12 - wolken * 0.6, n) * smoothstep(0.01, 0.11, h);
    float zurSonne = exp((azc - 1.0) * 1.3);
    vec3 wc = mix(wolkenDunkel, wolkenHell, clamp(0.3 + 0.7 * zurSonne * (0.55 + 0.45 * nN(q * 2.0 + 5.0)) + 0.25 * (n - 0.6), 0.0, 1.2));
    col = mix(col, wc, dichte * 0.92);
  }
  float frei = 1.0 - dichte;
  if (sterne > 0.001 && h > -0.01) {
    vec3 sp = d * 260.0, si = floor(sp), sf = fract(sp) - 0.5;                     // 3D-Zellen: kein Raster am Zenit
    float hs = nH3(si);
    if (hs > 0.955) {
      vec3 o = (vec3(nH3(si + 1.7), nH3(si + 4.1), nH3(si + 7.3)) - 0.5) * 0.5;
      vec3 q = sf - o; q -= d * dot(q, d);                                           // Abstand quer zur Blickrichtung
      float stn = (1.0 - smoothstep(0.0, 0.3, length(q))) * (0.35 + 2.4 * pow((hs - 0.955) / 0.045, 3.0));
      stn *= 0.8 + 0.2 * sin(zeit * (1.0 + 2.0 * nH3(si + 8.0)) + hs * 40.0);
      col += vec3(0.85, 0.9, 1.0) * stn * sterne * smoothstep(0.0, 0.1, h) * frei * (cameraPosition.y < 0.0 ? 0.4 : 1.0);
    }
    float mw = smoothstep(0.5, 0.85, nF(vec2(atan(d.x, -d.z) * 2.0 + h * 3.0, h * 6.0 - atan(d.x, -d.z))));
    col += vec3(0.04, 0.05, 0.08) * sterne * mw * smoothstep(0.05, 0.3, h) * frei;
  }
  col += polarlichtF(d) * (1.0 - dichte * 0.8);
  col = mix(col, unten, smoothstep(0.0, 0.09, -h));
  float ang = acos(clamp(dot(d, s), -1.0, 1.0));
  float scheibe = 1.0 - smoothstep(sonnenGroesse * 0.8, sonnenGroesse, ang);
  float halo = exp(-ang / 0.07) * 0.6 + exp(-ang / 0.3) * 0.12;
  float sichtbar = smoothstep(-0.012, 0.004, h);
  col += sonnenFarbe * (scheibe * sonnenStaerke * sichtbar * (1.0 - dichte * 0.85) + halo * glanz * smoothstep(-0.2, 0.02, s.y));
  gl_FragColor = vec4(col * helligkeit, 1.0);
}`;
class BergHimmel {
  constructor(szene, { radius = 20000 } = {}) {
    this.u = {
      zenit: { value: C("#3F6DAE") }, horizont: { value: C("#C4D3E2") }, unten: { value: C("#5E6A60") }, hof: { value: C("#FFFFFF") }, guertel: { value: C("#C8D0DE") },
      sonnenDir: { value: new THREE.Vector3(0, 0.3, 1).normalize() }, sonnenFarbe: { value: C("#FFF0D8") }, guertelS: { value: 0 }, sonnenStaerke: { value: 26 }, sonnenGroesse: { value: 0.011 },
      glanz: { value: 0.6 }, dunst: { value: 0.28 }, sterne: { value: 0 }, helligkeit: { value: 1 }, wolken: { value: 0.4 }, wolkenHell: { value: C("#FFFFFF") }, wolkenDunkel: { value: C("#97A3B6") },
      zeit: { value: 0 }, polarlicht: { value: 0 }, plNord: { value: 380 }, plGruen: { value: new THREE.Color(0.25, 1.0, 0.45) }, plRot: { value: new THREE.Color(0.75, 0.18, 0.62) },
    };
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), new THREE.ShaderMaterial({ vertexShader: HIMMEL_V, fragmentShader: HIMMEL_F, uniforms: this.u, side: THREE.BackSide, depthWrite: false, fog: false }));
    this.mesh.renderOrder = -1000; this.mesh.frustumCulled = false; szene.add(this.mesh);
  }
  folge(k) { this.mesh.position.copy(k.position); return this; }
}

// ----------------------------------------------------------------------------------------------- Boden
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
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.94, metalness: 0, side: THREE.DoubleSide });   // Unterseite: Uferböschung in der Spiegelung
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uZeit: u.uZeit, uWind: u.uWind, uBSY: u.uBSY, uBSMin: u.uBSMin });
    sh.vertexShader = bsVertex(sh.vertexShader, {});
    sh.fragmentShader = bsFragment(sh.fragmentShader, {}).replace("#include <common>", `#include <common>
${GLSL_NOISE}
${GLSL_SEE}`).replace("#include <color_fragment>", `#include <color_fragment>
  {
  vec3 W = vBSW; vec2 p = W.xz; float y = W.y; vec3 Nn = normalize(vBSN);
  float steil = 1.0 - smoothstep(0.55, 0.85, Nn.y);
  float dl = landD(p), dk = length(p - cameraPosition.xz);
  float n1 = nN(p * 0.06), n2 = nN(p * 0.7), n3 = bsF3(p * 0.008), n4 = nN(p * 3.1), n5 = nN(p * 11.0);
  vec3 gras = mix(vec3(0.33, 0.30, 0.13), vec3(0.50, 0.43, 0.20), n1) * (0.82 + 0.3 * n2);
  gras = mix(gras, vec3(0.22, 0.26, 0.10), smoothstep(0.55, 0.8, nN(p * 0.25 + 3.0)) * 0.6);
  gras *= 0.85 + 0.3 * n4;
  gras *= 0.9 + 0.2 * smoothstep(0.3, 0.7, n5) * (1.0 - smoothstep(4.0, 20.0, dk));
  { float nahF = 1.0 - smoothstep(6.0, 30.0, dk);                                   // Nahbereich: Erde, Moos, Halmstruktur
    gras = mix(gras, vec3(0.20, 0.15, 0.09) * (0.8 + 0.4 * n5), smoothstep(0.62, 0.8, nN(p * 0.9 + 4.0)) * 0.7 * nahF);
    gras = mix(gras, vec3(0.16, 0.24, 0.07) * (0.8 + 0.4 * n4), smoothstep(0.6, 0.78, nN(p * 1.7 + 11.0)) * 0.6 * nahF);
    gras *= 1.0 + (0.32 * (nN(p * 55.0) - 0.5) + 0.25 * (nN(vec2(p.x * 160.0, p.y * 20.0)) - 0.5)) * nahF; }
  // Uferkies: feiner Sand/Grus mit Kieseln in mehreren Größen (keine Zellränder sichtbar)
  vec3 zl = nZelle(p * 9.0 + vec2(nN(p * 2.0), nN(p * 2.0 + 5.0)) * 0.8);
  vec3 zl2 = nZelle(p * 23.0 + 3.0);
  vec3 sand = mix(vec3(0.30, 0.27, 0.22), vec3(0.40, 0.36, 0.30), nN(p * 1.3)) * (0.85 + 0.2 * nN(p * 40.0));
  float kiesel = (1.0 - smoothstep(0.25, 0.42, zl.x)) * step(0.35, zl.z);
  float kiesel2 = (1.0 - smoothstep(0.2, 0.36, zl2.x)) * step(0.5, zl2.z);
  vec3 kc1 = mix(vec3(0.26, 0.25, 0.24), vec3(0.52, 0.49, 0.45), fract(zl.z * 7.3)) * (0.92 + 0.12 * (1.0 - zl.x));
  vec3 kies = mix(sand, kc1, kiesel * 0.9);
  kies = mix(kies, mix(vec3(0.22, 0.2, 0.18), vec3(0.46, 0.42, 0.37), fract(zl2.z * 5.1)), kiesel2 * 0.7);
  float strand = 1.0 - smoothstep(0.3, 1.5, dl + 0.9 * (n2 - 0.5));
  float nass = 1.0 - smoothstep(0.0, 0.55, dl + 0.15 * (n4 - 0.5));
  vec3 c = mix(gras, kies, strand);
  c *= 1.0 - 0.45 * nass;
  float laubB = smoothstep(0.5, 0.72, nN(p * 1.6 + 9.0)) * (1.0 - strand) * (1.0 - smoothstep(30.0, 80.0, dk));
  c = mix(c, mix(vec3(0.50, 0.20, 0.05), vec3(0.62, 0.42, 0.10), n5), laubB * 0.55);
  float wald = waldM(p, y, dl) * (1.0 - steil * 0.8);
  // Kronendach: jede Zelle (≈ 6 m) ist eine Krone mit eigener Art und Farbe (wie die Bäume), dunkle Lücken dazwischen
  vec3 zk = nZelle(p * 0.16 + vec2(nN(p * 0.05), nN(p * 0.05 + 7.0)) * 1.4);
  float laubZone = 1.0 - smoothstep(60.0, 320.0, y);
  float pLaub = smoothstep(0.35, 0.65, nN(p * 0.0035 + 21.0) + laubZone * 0.55 - 0.3) * 0.9;
  float pLae = smoothstep(0.62, 0.8, nN(p * 0.006 + 4.0)) * smoothstep(250.0, 500.0, y);
  float r1 = zk.z, r2 = fract(zk.z * 91.7);
  vec3 fichte = vec3(0.06, 0.10, 0.065) * (0.8 + 0.4 * r2);
  vec3 laerche = mix(vec3(0.58, 0.40, 0.10), vec3(0.66, 0.48, 0.14), r2);
  vec3 laub = r2 < 0.3 ? vec3(0.64, 0.27, 0.06) : (r2 < 0.62 ? vec3(0.70, 0.50, 0.12) : (r2 < 0.8 ? vec3(0.52, 0.15, 0.05) : vec3(0.42, 0.38, 0.12)));
  vec3 dach = r1 < pLae ? laerche : (r1 < pLae + pLaub * (1.0 - pLae) ? laub : fichte);
  dach *= 0.28 + 0.9 * (1.0 - smoothstep(0.12, 0.72, zk.x));
  dach *= 0.82 + 0.3 * nN(p * 0.04);
  float fernW = smoothstep(60.0, 220.0, dk);
  vec3 wboden = vec3(0.17, 0.11, 0.06) * (0.8 + 0.4 * n2);
  c = mix(c, mix(wboden, dach, fernW), wald);
  float schicht = nN(vec2(y * 0.05 + n3 * 3.0, (p.x + p.y) * 0.002));
  vec3 fels = mix(vec3(0.23, 0.22, 0.21), vec3(0.46, 0.44, 0.41), schicht) * (0.72 + 0.42 * n2);
  fels = mix(fels, fels * 0.55, smoothstep(0.6, 0.8, nN(vec2(y * 0.18, p.x * 0.01 + p.y * 0.01))) * steil);
  float hoch = y + 120.0 * (n3 - 0.5);
  vec3 matte = mix(vec3(0.34, 0.23, 0.11), vec3(0.46, 0.36, 0.18), n1) * (0.85 + 0.3 * n2);
  c = mix(c, matte, smoothstep(800.0, 950.0, hoch) * (1.0 - wald));
  float felsM = max(smoothstep(0.3, 0.75, steil) * smoothstep(3.0, 40.0, y), smoothstep(980.0, 1120.0, hoch));
  c = mix(c, fels, felsM * (1.0 - wald * 0.7));
  fels *= 0.78 + 0.34 * nN(p * 0.35 + y * 0.2);
  float rinnen = bsF3(vec2(p.x * 0.006 + y * 0.004, p.y * 0.006));
  float sch = smoothstep(1120.0, 1260.0, y + 170.0 * (n3 - 0.5)) * smoothstep(0.3, 0.62, Nn.y + 0.4 * (rinnen - 0.45) + 0.25 * (n2 - 0.5));
  sch *= 1.0 - 0.8 * smoothstep(0.56, 0.7, nN(vec2(p.x * 0.018 + y * 0.003, p.y * 0.004 + y * 0.012)));          // Felsrippen im Schnee
  c = mix(c, vec3(0.8, 0.83, 0.88) * (0.88 + 0.14 * n2), sch);
  diffuseColor.rgb = c;
  }`);
  };
  m.customProgramCacheKey = () => "bergsee-boden";
  return m;
}

// ----------------------------------------------------------------------------------------------- Wasser (Reflector)
const WASSER = {
  name: "BergseeWasser",
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, texel: { value: new THREE.Vector2(1 / 540, 1 / 960) },
    zeit: { value: 0 }, welle: { value: 1 }, tief: { value: new THREE.Color("#0C2630") }, flach: { value: new THREE.Color("#5A5236") }, licht: { value: new THREE.Color(0.5, 0.55, 0.6) },
    sonnenDir: { value: new THREE.Vector3(0, 0.3, 1) }, sonnenF: { value: new THREE.Color(1, 1, 1) }, spiegel: { value: 1 },
    enten: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, 0)) }, ringe: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, -1, 0)) },
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
uniform sampler2D tDiffuse; uniform vec3 color, tief, flach, licht, sonnenDir, sonnenF; uniform vec2 texel; uniform float zeit, welle, spiegel;
uniform vec4 enten[8]; uniform vec4 ringe[4];
varying vec4 vUv4; varying vec3 vW;
#include <fog_pars_fragment>
${GLSL_NOISE}
${GLSL_SEE}
float wh(vec2 p) {
  vec2 q1 = p * 0.45 + vec2(zeit * 0.09, zeit * 0.05), q2 = p * 1.7 + vec2(-zeit * 0.2, zeit * 0.13), q3 = p * 0.08 + vec2(zeit * 0.02, -zeit * 0.012);
  return nN(q1) + 0.35 * nN(q2) + 1.4 * nN(q3) * (0.6 + 0.4 * nN(p * 0.01 + zeit * 0.01));
}
void main() {
  vec3 V = normalize(cameraPosition - vW);
  vec2 p = vW.xz;
  float d = length(cameraPosition.xz - p);
  float fw = length(fwidth(p));
  float e = 0.06 + fw * 0.5;
  float h0 = wh(p);
  vec2 g = vec2(wh(p + vec2(e, 0.0)) - h0, wh(p + vec2(0.0, e)) - h0) / e;
  g *= 0.075 * welle * (1.0 - smoothstep(0.6, 5.0, fw));
  // Kielwellen der Enten (zwei Arme, Kelvin-Winkel ≈ 19,5°) und Ringe um den Körper
  for (int i = 0; i < 8; i++) {
    vec4 E = enten[i];
    float v = length(E.zw);
    if (v < 0.001) continue;
    vec2 f = E.zw / v, l = vec2(-f.y, f.x), r = p - E.xy;
    float vor = dot(r, f), seit = dot(r, l), hinten = -vor;
    float aq = (abs(seit) - 0.354 * hinten) / (0.07 + 0.035 * max(hinten, 0.0));      // kein pow(negativ, 2.0) (GPU: NaN)
    float arm = exp(-aq * aq) * smoothstep(-0.1, 0.3, hinten) * exp(-max(hinten, 0.0) / 7.0);
    g += l * sign(seit) * arm * sin(hinten * 9.0 - zeit * 6.5) * 0.5 * min(v, 1.0);
    float rr = length(r);
    g += r / max(rr, 1e-3) * sin(rr * 13.0 - zeit * 5.0) * 0.18 * exp(-rr / 0.8) * smoothstep(0.12, 0.3, rr);
  }
  // Fischringe
  for (int i = 0; i < 4; i++) {
    vec4 R = ringe[i];
    if (R.z < 0.0) continue;
    float rad = 0.25 + 0.85 * R.z, rr = length(p - R.xy);
    float rq = (rr - rad) / (0.12 + 0.05 * R.z);
    float w = exp(-rq * rq) * exp(-R.z * 0.55) * R.w;
    g += (p - R.xy) / max(rr, 1e-3) * sin((rr - rad) * 22.0) * w * 0.55;
  }
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float fres = 0.22 + 0.78 * pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec2 uv0 = vUv4.xy / vUv4.w, uv = uv0 + N.xz * vec2(0.3 * smoothstep(0.0, 0.04, min(uv0.x, 1.0 - uv0.x)), 0.85) * 0.045 / (1.0 + d / 50.0);
  vec3 refl = vec3(0.0); float sw = 0.0;
  for (int i = -3; i <= 3; i++) { float w = exp(-float(i * i) / 5.0); refl += texture2D(tDiffuse, uv + vec2(0.0, float(i) * texel.y * 2.0)).rgb * w; sw += w; }
  refl /= sw;
  float dl = landD(p);
  float seicht = 1.0 - smoothstep(0.0, 5.5, -dl);
  vec2 pb = p + N.xz * 0.5;                                                         // Grund, durch die Wellen verzerrt
  vec3 zl = nZelle(pb * 4.0 + vec2(nN(pb), nN(pb + 3.0)));
  float stn = (1.0 - smoothstep(0.2, 0.45, zl.x)) * step(0.4, zl.z);
  vec3 grund = flach * (0.75 + 0.45 * nN(pb * 1.7)) * (0.85 + 0.3 * nN(pb * 9.0)) * (1.0 + 0.35 * stn * (zl.z - 0.5));
  grund *= 1.0 + 0.35 * smoothstep(0.55, 0.9, nN(pb * 2.2 + vec2(zeit * 0.25, -zeit * 0.18)) * nN(pb * 3.1 - zeit * 0.2) * 2.0);   // Lichtnetz
  grund *= licht * 1.3 + 0.05;
  vec3 koerper = mix(tief * (licht * 0.55 + 0.03), grund, seicht * 0.85);
  vec3 col = mix(koerper, refl * color, fres * spiegel * (1.0 - seicht * 0.4));
  vec3 S = normalize(sonnenDir);
  col += sonnenF * pow(max(dot(reflect(-V, N), S), 0.0), 450.0) * step(0.0, S.y) * 7.0;
  col += licht * 0.12 * (1.0 - smoothstep(0.0, 0.3, -dl)) * smoothstep(0.55, 0.8, nN(p * 7.0 + zeit * 0.4));
  gl_FragColor = vec4(col, 1.0);
#include <fog_fragment>
}`,
};

// ----------------------------------------------------------------------------------------------- Lichtpunkte (Fenster in der Ferne)
const PUNKT_V = /* glsl */ `attribute vec3 farbe; attribute float groesse; varying vec3 vF; uniform float nebelD;
void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = groesse; vF = farbe * exp(-nebelD * -mv.z); }`;
const PUNKT_F = /* glsl */ `varying vec3 vF;
void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = (exp(-d * d * 7.0) + 0.2 * exp(-d * d * 1.5)) * (1.0 - smoothstep(0.75, 1.0, d)); if (a < 0.004) discard; gl_FragColor = vec4(vF * a, 1.0); }`;

// ----------------------------------------------------------------------------------------------- Geometrien
function box(w, h, d, x, y, z, ry = 0) { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; }
/** Birke: weißer Stamm mit dunklen Bändern, kleine gelbe Ballen */
function birkeGeo(seed) {
  const tr = [], kr = [], H = 9 + 3 * hash(seed, 1);
  const rinde = (x, y, z) => (Math.sin(y * 6.3 + seed + Math.sin(x * 40 + z * 30) * 0.6) > 0.72 ? [0.12, 0.11, 0.1] : [0.84, 0.82, 0.78]);
  let a = [0, 0, 0];
  for (let k = 0; k < 4; k++) { const b = [0.3 * (hash(k, seed + 2) - 0.5), (H * (k + 1)) / 4, 0.3 * (hash(k, seed + 3) - 0.5)]; tr.push(zweig(a, b, 0.17 * (1 - k / 4) + 0.04, 0.17 * (1 - (k + 1) / 4) + 0.035, rinde)); a = b; }
  for (let i = 0; i < 10; i++) {
    const w = i * 2.4 + hash(i, seed + 4), yb = H * 0.4 + i * H * 0.055, R = 1.2 + 1.5 * hash(i, seed + 5);
    const e = [Math.cos(w) * R, yb + 1.3 + 0.6 * hash(i, seed + 6), Math.sin(w) * R];
    tr.push(zweig([0, yb, 0], e, 0.06, 0.02, [0.3, 0.27, 0.24]));
    kr.push(klumpe(e, 1.0 + 0.6 * hash(i, seed + 7), seed + i * 5, 0.8 + 0.3 * hash(i, seed + 8), 1.15));
    kr.push(klumpe([e[0] * 0.6, e[1] - 0.9, e[2] * 0.6], 0.75, seed + i * 5 + 2, 0.75, 1.2));
  }
  kr.push(klumpe([0, H + 0.6, 0], 1.5, seed + 77, 1.0));
  return { stamm: sammle(tr), krone: sammle(kr) };
}
/** Schilf: 11 Blätter + 3 Halme mit Rispen, Höhe ≈ 2,2 m, Farbverlauf olivgrün → strohgelb */
function schilfGeo(seed) {
  const pos = [];
  const blatt = (x0, z0, a, H, lean, w0) => {
    const S = 5, dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx;
    for (let s = 0; s < S; s++) {
      const f0 = s / S, f1 = (s + 1) / S, y0 = f0 * H, y1 = f1 * H, o0 = lean * f0 * f0 * H * 0.3, o1 = lean * f1 * f1 * H * 0.3, w_0 = w0 * (1 - f0) + 0.002, w_1 = w0 * (1 - f1) + 0.002;
      const A = [x0 + dx * o0 - px * w_0, y0, z0 + dz * o0 - pz * w_0], B = [x0 + dx * o0 + px * w_0, y0, z0 + dz * o0 + pz * w_0];
      const Cc = [x0 + dx * o1 - px * w_1, y1, z0 + dz * o1 - pz * w_1], D = [x0 + dx * o1 + px * w_1, y1, z0 + dz * o1 + pz * w_1];
      pos.push(...A, ...B, ...Cc, ...B, ...D, ...Cc);
    }
  };
  for (let i = 0; i < 11; i++) { const a = hash(i, seed) * 6.283, r = 0.07 * hash(i, seed + 1); blatt(Math.cos(a) * r, Math.sin(a) * r, a + 0.4, 1.1 + 0.8 * hash(i, seed + 2), 0.3 + 0.9 * hash(i, seed + 3), 0.022); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  const T = [{ g, c: (x, y) => { const f = clamp(y / 1.9); return [lerp(0.24, 0.72, f), lerp(0.26, 0.62, f), lerp(0.11, 0.36, f)]; } }];
  for (let k = 0; k < 3; k++) {
    const a = hash(k, seed + 9) * 6.283, x = Math.cos(a) * 0.06, z = Math.sin(a) * 0.06, H = 1.9 + 0.4 * hash(k, seed + 10), lx = 0.12 * Math.cos(a), lz = 0.12 * Math.sin(a);
    T.push(zweig([x, 0, z], [x + lx, H, z + lz], 0.008, 0.005, [0.6, 0.55, 0.35]));
    const r = new THREE.IcosahedronGeometry(0.042, 1); r.scale(0.7, 3.2, 0.7); r.rotateZ(-0.35 * Math.cos(a)); r.rotateX(0.35 * Math.sin(a)); r.translate(x + lx * 1.07, H + 0.12, z + lz * 1.07);
    T.push({ g: r, c: [0.46, 0.33, 0.22] });
  }
  return sammle(T);
}
/** Stockente (Meter, Länge ≈ 0,55 m, Kopf +x); erpel: grüner Kopf, weißer Ring, braune Brust */
function enteGeo(erpel) {
  const T = [], koerper = erpel ? [0.62, 0.62, 0.6] : [0.44, 0.33, 0.22], brust = erpel ? [0.36, 0.2, 0.12] : [0.48, 0.36, 0.24], kopf = erpel ? [0.06, 0.28, 0.12] : [0.42, 0.32, 0.22];
  const leib = new THREE.IcosahedronGeometry(0.14, 2); leib.scale(1.8, 0.85, 1.0); leib.translate(0, 0.07, 0);
  T.push({ g: leib, c: (x, y) => (x > 0.12 ? brust : y < 0.02 ? [koerper[0] * 0.7, koerper[1] * 0.7, koerper[2] * 0.7] : koerper) });
  const sp = new THREE.IcosahedronGeometry(0.09, 1); sp.scale(1.3, 0.55, 0.9); sp.translate(-0.24, 0.13, 0); T.push({ g: sp, c: erpel ? [0.1, 0.1, 0.1] : [0.38, 0.28, 0.2] });
  const fl = new THREE.IcosahedronGeometry(0.1, 1); fl.scale(1.9, 0.5, 1.05); fl.translate(-0.04, 0.12, 0); T.push({ g: fl, c: (x, y, z) => (erpel ? (Math.abs(z) > 0.07 && x < -0.02 && x > -0.12 ? [0.15, 0.2, 0.6] : [0.52, 0.5, 0.46]) : [0.36, 0.27, 0.19]) });
  const hals = new THREE.CylinderGeometry(0.045, 0.06, 0.12, 8); hals.rotateZ(-0.35); hals.translate(0.2, 0.17, 0); T.push({ g: hals, c: (x, y) => (erpel && y < 0.16 ? [0.92, 0.92, 0.9] : kopf) });
  const k = new THREE.IcosahedronGeometry(0.058, 2); k.scale(1.25, 1, 0.9); k.translate(0.24, 0.25, 0); T.push({ g: k, c: kopf });
  const sn = new THREE.BoxGeometry(0.075, 0.018, 0.04); sn.translate(0.31, 0.235, 0); T.push({ g: sn, c: erpel ? [0.85, 0.72, 0.18] : [0.75, 0.45, 0.15] });
  for (const s of [-1, 1]) { const au = new THREE.IcosahedronGeometry(0.01, 0); au.translate(0.27, 0.262, s * 0.045); T.push({ g: au, c: [0.02, 0.02, 0.02] }); }
  return sammle(T);
}
function fluegelGeo() {
  const s = new THREE.Shape(); s.moveTo(0, -0.09); s.lineTo(0.22, -0.07); s.lineTo(0.4, -0.02); s.lineTo(0.38, 0.03); s.lineTo(0.18, 0.05); s.lineTo(0.02, 0.08); s.closePath();
  const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2);                // in der Ebene, Spannweite +z… nach Rotation: x = Spann, z = Tiefe
  g.rotateY(-Math.PI / 2);                                                         // Spannweite entlang +z (Seite der Ente)
  return g;
}
/** Fliegenpilz (Höhe ≈ 0,1 m) */
function pilzGeo() {
  const st = new THREE.CylinderGeometry(0.009, 0.013, 0.08, 8); st.translate(0, 0.04, 0);
  const hut = new THREE.SphereGeometry(0.035, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45); hut.scale(1, 0.62, 1); hut.translate(0, 0.068, 0);
  const T = [{ g: st, c: [0.92, 0.9, 0.84] }, { g: hut, c: [0.78, 0.08, 0.05] }];
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4, r = 0.006 + 0.02 * Math.sqrt(hash(i, 3)), y = 0.068 + Math.sqrt(Math.max(0, 0.035 * 0.035 - r * r)) * 0.62;
    const p = new THREE.IcosahedronGeometry(0.0035, 0); p.translate(Math.cos(a) * r, y + 0.001, Math.sin(a) * r); T.push({ g: p, c: [0.96, 0.95, 0.9] });
  }
  return sammle(T);
}
/** Ruderboot (Länge 3,4 m, Bug +x): Rumpf, Boden innen, zwei Duchten, Riemen */
function bootTeile() {
  const s = new THREE.Shape(), L = 1.7, B = 0.66, n = 24;
  for (let i = 0; i <= n; i++) { const f = i / n, x = lerp(-L, L, f), w = B * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (x - 0.1) / (L - 0.1)), 2.2))) * (x < -1.45 ? 0.92 : 1); (i ? s.lineTo(x, w) : s.moveTo(x, w)); }
  for (let i = n; i >= 0; i--) { const f = i / n, x = lerp(-L, L, f), w = B * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (x - 0.1) / (L - 0.1)), 2.2))) * (x < -1.45 ? 0.92 : 1); s.lineTo(x, -w); }
  const rumpf = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false, curveSegments: 2 });
  rumpf.rotateX(-Math.PI / 2); rumpf.translate(0, -0.18, 0);
  const p = rumpf.getAttribute("position");
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), u = clamp((y + 0.18) / 0.5); const k = lerp(0.55, 1, Math.sqrt(u)); p.setXYZ(i, x * lerp(0.86, 1, u), y + 0.12 * Math.pow(Math.abs(x) / L, 3) * u, z * k); }
  rumpf.computeVertexNormals();
  const innen = new THREE.ShapeGeometry(s); innen.rotateX(-Math.PI / 2); innen.scale(0.82, 1, 0.7); innen.translate(0, -0.05, 0);
  const holz = [box(0.22, 0.04, 1.08, 0.35, 0.2, 0), box(0.22, 0.04, 0.96, -0.75, 0.2, 0), box(0.5, 0.04, 0.9, -1.4, 0.22, 0)];
  const riemen = [zweig([-1.1, 0.12, 0.25], [1.2, 0.18, 0.38], 0.022, 0.022, null).g, zweig([-1.1, 0.12, -0.25], [1.2, 0.18, -0.36], 0.022, 0.022, null).g];
  const bl = box(0.5, 0.012, 0.14, 1.1, 0.18, 0.37); bl.rotateY(0.05); riemen.push(bl, box(0.5, 0.012, 0.14, 1.1, 0.18, -0.36));
  return { rumpf, innen, holz, riemen };
}
function huetteGeo() {
  const T = [], w = 7, d = 5.5, h = 2.8;
  T.push({ g: box(w, h, d, 0, h / 2, 0), c: [0.36, 0.24, 0.15] }, { g: box(w + 0.3, 0.6, d + 0.3, 0, 0.3, 0), c: [0.32, 0.31, 0.3] });
  const rh = 2.2, L = Math.hypot(d / 2 + 0.5, rh);
  for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(w + 0.9, 0.2, L); g.rotateX(s * Math.atan2(rh, d / 2 + 0.5)); g.translate(0, h + rh / 2, (s * (d / 2 + 0.5)) / 2); T.push({ g, c: [0.22, 0.17, 0.13] }); }
  for (const s of [-1, 1]) {                                                       // Giebeldreiecke (beide Windungen → von außen sichtbar)
    const A = [s * w / 2, h, -d / 2], B = [s * w / 2, h, d / 2], Cc = [s * w / 2, h + rh, 0];
    for (const tri of [[A, B, Cc], [B, A, Cc]]) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(tri.flat(), 3)); g.computeVertexNormals(); T.push({ g, c: [0.33, 0.22, 0.14] }); }
  }
  T.push({ g: box(0.7, 1.6, 0.7, w * 0.25, h + rh * 0.7, -0.6), c: [0.3, 0.29, 0.28] });
  return sammle(T);
}
function leinwand(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
function textur(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; }

// ----------------------------------------------------------------------------------------------- Welt
export class Bergsee {
  constructor(szene, { schatten = 4096, licht = true, himmel = true, nebel = true, nebelDichte = 7e-5, spiegel = 0.5, baeume = 1, kompassGroesse = 1.4, enten = 9 } = {}) {
    this.szene = szene; this.schattenAn = !!schatten; this.nebelDichte = nebelDichte; this.vertices = 0;
    this.u = { uZeit: { value: 0 }, uWind: { value: 0.5 }, uBSY: { value: -1e5 }, uBSMin: { value: 0 } };
    this._m = new THREE.Matrix4(); this._m2 = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._e = new THREE.Euler();
    this._c = new THREE.Color(); this._c2 = new THREE.Color(); this._v = new THREE.Vector3();
    if (nebel) szene.fog = new THREE.FogExp2("#B9C9DA", nebelDichte);
    if (himmel) this.himmel = new BergHimmel(szene);
    if (licht) this._lichter(schatten);
    this._gelaende(); this._wasser(spiegel); this._wald(baeume); this._ufer(); this._schilf(); this._steg(); this._huette(); this._enten(enten); this._laub();
    this._kompass(kompassGroesse);
    this.voegelS = new Voegel(szene, { anzahl: 16, seed: 77, farbe: "#1A1C20", spannweite: 0.9 });
    this.voegelS.schwarm({ zentrum: [-80, 75, -460], radius: 70, hoehe: 14, tempo: 9, anzahl: 16, skala: 1.2 });
    this.puffs = new Puffs(szene, { max: 420, schatten: 0.5 });
    this.post = { ...STIMMUNGEN.nachmittag.post };
    this.zustand = {};
  }
  _inst(geo, mat, n, schatten = false, empf = true) { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); im.count = n; im.castShadow = schatten && this.schattenAn; im.receiveShadow = empf && this.schattenAn; im.frustumCulled = false; this.szene.add(im); this.vertices += geo.getAttribute("position").count * n; return im; }
  _setze(im, i, x, y, z, s, ry, sx = s, sz = s, rx = 0, rz = 0) { this._e.set(rx, ry, rz, "YXZ"); this._q.setFromEuler(this._e); this._s.set(sx, s, sz); this._p.set(x, y, z); this._m.compose(this._p, this._q, this._s); im.setMatrixAt(i, this._m); }
  _mesh(geo, mat, { schatten = true, empf = true } = {}) { const m = new THREE.Mesh(geo, mat); m.castShadow = schatten && this.schattenAn; m.receiveShadow = empf && this.schattenAn; this.szene.add(m); this.vertices += geo.getAttribute("position").count; return m; }

  _lichter(schatten) {
    const s = new THREE.DirectionalLight("#FFFFFF", 2.5);
    // Licht 45 m vor dem Ziel (near 0,5 / far 200): ferner Wald wirft keinen Schatten auf den Sitzplatz
    if (schatten) { s.castShadow = true; s.shadow.mapSize.set(+schatten || 4096, +schatten || 4096); Object.assign(s.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 0.5, far: 200 }); s.shadow.bias = -0.0003; s.shadow.normalBias = 0.03; s.shadow.radius = 2; }
    const hemi = new THREE.HemisphereLight("#B2C6E2", "#5C5238", 1.15);
    const mond = new THREE.DirectionalLight("#9DB4E8", 0); mond.position.set(...richtung(140, 30).map((v) => v * 5000));
    const aurora = new THREE.DirectionalLight("#5CFF9A", 0); aurora.position.set(0, 3000, -3000);
    this.szene.add(s, s.target, hemi, mond, aurora);
    this.lichter = { sonne: s, hemi, mond, aurora };
  }
  _gelaende() {
    this.boden = this._mesh(gitter(-9000, 9000, -9000, 6000, 0.3, 0.012, hoehe), bodenMat(this.u), { schatten: false });
  }
  _wasser(spiegel) {
    if (spiegel > 0) {
      const w = Math.round(1080 * spiegel), h = Math.round(1920 * spiegel);
      const r = new Reflector(new THREE.PlaneGeometry(60000, 60000), { textureWidth: w, textureHeight: h, clipBias: 0.002, multisample: 4, shader: WASSER, color: "#FFFFFF" });
      r.material.fog = true; r.material.uniforms.texel.value.set(1 / w, 1 / h);
      r.rotation.x = -Math.PI / 2; r.renderOrder = 1; this.wasser = r; this.wasserU = r.material.uniforms; this.szene.add(r);
    } else {
      const mat = new THREE.ShaderMaterial({ ...WASSER, uniforms: THREE.UniformsUtils.clone(WASSER.uniforms), fog: true });
      mat.uniforms.spiegel.value = 0; mat.uniforms.textureMatrix.value = new THREE.Matrix4();
      const m = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), mat); m.rotation.x = -Math.PI / 2; this.wasser = m; this.wasserU = mat.uniforms; this.szene.add(m);
    }
    this.wasser.frustumCulled = false;
  }
  _art(x, z, y, i) {                                                               // 0 Fichte, 1 Laub, 2 Lärche, 3 Birke
    const laubZone = 1 - smoothstep(60, 320, y);
    const pLaub = smoothstep(0.35, 0.65, vn(x * 0.0035 + 21, z * 0.0035 + 21) + laubZone * 0.55 - 0.3) * 0.9;
    const pLae = smoothstep(0.62, 0.8, vn(x * 0.006 + 4, z * 0.006 + 4)) * smoothstep(250, 500, y);
    if (hash(i, 9001) < pLae) return 2;
    if (hash(i, 9002) < pLaub) return y < 40 && hash(i, 9003) < 0.3 ? 3 : 1;
    return 0;
  }
  _wald(dichte) {
    const u = this.u;
    const FICHTE = ["#1C3124", "#22382A", "#2A4230", "#1A2C22"].map(C), LAERCHE = ["#C9962E", "#D8A63A", "#B9802A", "#C48C34"].map(C);
    const LAUB = ["#D88A24", "#E2B03A", "#B6461C", "#C8661E", "#9C7A2A", "#6E7A2E", "#E0A030"].map(C), BIRKE = ["#E4C040", "#D8B034", "#C9A82E"].map(C);
    const farbe = (art, i) => { const L = art === 0 ? FICHTE : art === 2 ? LAERCHE : art === 3 ? BIRKE : LAUB; return this._c.copy(L[Math.floor(hash(i, 9100) * L.length)]).multiplyScalar(0.88 + 0.24 * hash(i, 9101)); };
    const steil = (x, z, y) => Math.hypot(hoehe(x + 3, z) - y, hoehe(x, z + 3) - y) / 3;
    // --- nah (detailliert) bis 115 m
    const nah = [[], [], [], []];
    for (let gx = -115; gx <= 115; gx += 5.2) for (let gz = -115; gz <= 115; gz += 5.2) {
      const i = Math.round((gx + 200) * 97 + (gz + 200) * 3), x = gx + 4.4 * (hash(i, 11) - 0.5), z = gz + 4.4 * (hash(i, 12) - 0.5);
      if (Math.hypot(x, z) > 115) continue;
      const d = landAbstand(x, z); if (d < 5) continue;
      const y = hoehe(x, z), w = waldMass(x, z, y, d); if (hash(i, 13) > w * 0.95) continue;
      if (steil(x, z, y) > 1.0) continue;
      nah[this._art(x, z, y, i)].push({ x, y, z, i, s: 0.75 + 0.45 * hash(i, 14), ry: hash(i, 15) * 6.283 });
    }
    // Uferbäume rechts und links des Sitzplatzes (Rahmen bei Schwenks)
    for (const [x, z, art] of [[-24, -2, 3], [-29, 4, 1], [26, -1, 1], [31, 6, 3], [36, 14, 0], [-38, 12, 0], [18, 30, 1], [-12, 44, 0]]) nah[art].push({ x, y: hoehe(x, z), z, i: Math.round(x * 31 + z * 7), s: 0.9 + 0.2 * hash(Math.round(x * 31 + z), 5), ry: hash(Math.round(x * 7 + z), 6) * 6.283 });
    const fichtenG = [fichteGeo(3), fichteGeo(17), fichteGeo(29)], buchenG = [bucheGeo(5), bucheGeo(41, { gross: 0.85 })], birkenG = [birkeGeo(7), birkeGeo(23)];
    const nadelM = weltMat(u, { vertexColors: true, roughness: 0.92, wind: 0.12, windH: 20 }), kroneM = weltMat(u, { vertexColors: true, roughness: 0.88, wind: 0.22, windH: 22, krone: true });
    const stammM = weltMat(u, { vertexColors: true, roughness: 0.95, wind: 0.05, windH: 20 }), birkeKM = weltMat(u, { vertexColors: true, roughness: 0.85, wind: 0.28, windH: 12, krone: true });
    const setzeAlle = (liste, geos, mat, art, sx = 1, mitKrone = null, kMat = null) => {
      geos.forEach((G, gi) => {
        const L = liste.filter((b) => ((b.i % geos.length) + geos.length) % geos.length === gi); if (!L.length) return;
        const im = this._inst(mitKrone ? G.stamm : G, mat, L.length, true);
        const ik = mitKrone ? this._inst(G.krone, kMat, L.length, true) : null;
        L.forEach((b, k) => {
          this._setze(im, k, b.x, b.y - 0.2, b.z, b.s, b.ry, b.s * sx, b.s * sx); im.setColorAt(k, mitKrone ? this._c.setRGB(1, 1, 1) : farbe(art, b.i));
          if (ik) { this._setze(ik, k, b.x, b.y - 0.2, b.z, b.s, b.ry, b.s * sx, b.s * sx); ik.setColorAt(k, farbe(art, b.i)); }
        });
        im.instanceColor.needsUpdate = true; if (ik) ik.instanceColor.needsUpdate = true;
      });
    };
    setzeAlle(nah[0], fichtenG, nadelM, 0);
    setzeAlle(nah[2], fichtenG, nadelM, 2, 0.72);
    setzeAlle(nah[1], buchenG, stammM, 1, 0.8, true, kroneM);
    setzeAlle(nah[3], birkenG, stammM, 3, 1, true, birkeKM);
    this.baumNah = nah.reduce((a, l) => a + l.length, 0);
    // --- fern (Silhouetten) bis 6 km, vorn dichter
    const fFichte = fichteFern(), fLaub = bucheFern(), fern = [[], [], [], []];
    const fernM = weltMat(u, { vertexColors: true, roughness: 0.95 }), fernKM = weltMat(u, { vertexColors: true, roughness: 0.92, krone: true });
    let i = 0;
    for (let r = 112; r < 6200;) {
      const ds = (2.7 + 0.0058 * r) / Math.sqrt(dichte), n = Math.floor((2 * Math.PI * r) / ds);
      for (let k = 0; k < n; k++, i++) {
        const a = ((k + hash(i, 21) * 0.8) / n) * 2 * Math.PI, rr = r + ds * (hash(i, 22) - 0.5), x = Math.sin(a) * rr, z = -Math.cos(a) * rr;
        const wa = Math.abs(((a / D2R + 180) % 360) - 180);                          // Winkel zur Blickrichtung Nord
        if (wa > 75 && hash(i, 23) > (wa > 120 ? 0.22 : 0.45)) continue;               // hinten lichter (nur bei Schwenks sichtbar)
        const d = landAbstand(x, z); if (d < 6) continue;
        const y = hoehe(x, z), w = waldMass(x, z, y, d); if (hash(i, 24) > w) continue;
        if (steil(x, z, y) > 1.35) continue;
        const art = this._art(x, z, y, i);
        fern[art].push({ x, y, z, i, art, s: (0.75 + 0.55 * hash(i, 25)) * (1 + Math.min(1, rr / 4000) * 0.45), ry: hash(i, 26) * 6.283 });
      }
      r += ds;
    }
    const fernSetze = (liste, geo, mat, art, sx = 1, hoch = 1) => {
      if (!liste.length) return;
      const im = this._inst(geo, mat, liste.length, false);
      liste.forEach((b, k) => { this._setze(im, k, b.x, b.y - 0.3, b.z, b.s * hoch, b.ry, b.s * sx, b.s * sx); im.setColorAt(k, farbe(art, b.i)); });
      im.instanceColor.needsUpdate = true;
    };
    fernSetze(fern[0], fFichte, fernM, 0, 1, 1.05);
    fernSetze(fern[2], fFichte, fernM, 2, 0.7, 1.15);
    const laubAlle = fern[1].concat(fern[3]);
    if (laubAlle.length) {
      const st = this._inst(fLaub.stamm, fernM, laubAlle.length, false), kr = this._inst(fLaub.krone, fernKM, laubAlle.length, false);
      laubAlle.forEach((b, k) => { const art = b.art; this._setze(st, k, b.x, b.y - 0.3, b.z, b.s * 0.85, b.ry); st.setColorAt(k, this._c.setRGB(0.5, 0.42, 0.34)); this._setze(kr, k, b.x, b.y - 0.3, b.z, b.s * 0.85, b.ry, b.s * 0.75, b.s * 0.75); kr.setColorAt(k, farbe(art, b.i)); });
      st.instanceColor.needsUpdate = true; kr.instanceColor.needsUpdate = true;
    }
    this.baumFern = fern.reduce((a, l) => a + l.length, 0);
  }
  _ufer() {
    const u = this.u;
    // Ufersteine (Kies groß, Brocken, Steine im Flachwasser)
    const g = new THREE.IcosahedronGeometry(1, 2), p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = 0.8 + 0.32 * vn(x * 2.1 + 5, z * 2.1 + y * 1.7) + 0.08 * vn(x * 7, y * 7 + z); p.setXYZ(i, x * f, y * f * 0.58, z * f * 1.05); }
    g.computeVertexNormals();
    const N = 320, stein = this._inst(g, weltMat(u, { color: "#FFFFFF", roughness: 0.9, moos: 0.8 }), N, true);
    const grau = [[0.27, 0.26, 0.25], [0.36, 0.34, 0.31], [0.44, 0.42, 0.39], [0.3, 0.28, 0.24], [0.52, 0.5, 0.46]];
    let k = 0;
    for (let i = 0; i < 6000 && k < N; i++) {
      const gross = k < 26, x = (hash(i, 401) - 0.5) * (gross ? 46 : 26), z = 2 - 18 * Math.pow(hash(i, 402), 1.3), d = landAbstand(x, z);
      if (d < -4 || d > (gross ? 6 : 3.5)) continue;
      if (Math.hypot(x, z) < 0.9 || Math.hypot(x - KOMPASS.x, z - KOMPASS.z) < 0.5) continue;
      if (Math.abs(x - 2.6) < 0.9 && z < -1.5) continue;                                 // Stegeinstieg frei
      const s = gross ? 0.25 + 0.5 * hash(i, 403) : 0.03 + 0.13 * Math.pow(hash(i, 403), 1.8), col = grau[Math.floor(hash(i, 404) * grau.length)], vf = 0.85 + 0.3 * hash(i, 408);
      this._setze(stein, k, x, hoehe(x, z) + s * 0.12, z, s, hash(i, 405) * 6.28, s * (0.8 + 0.5 * hash(i, 406)), s * (0.8 + 0.5 * hash(i, 407)), (hash(i, 409) - 0.5) * 0.3, (hash(i, 410) - 0.5) * 0.3);
      stein.setColorAt(k, this._c.setRGB(col[0] * vf, col[1] * vf, col[2] * vf)); k++;
    }
    stein.count = k; stein.instanceColor.needsUpdate = true;
    // flacher Stein für den Kompass
    let sg = new THREE.IcosahedronGeometry(1, 3); sg.deleteAttribute("normal"); sg.deleteAttribute("uv"); sg = mergeVertices(sg); const sp = sg.getAttribute("position");   // geschlossene Fläche → weiche Normalen
    for (let i = 0; i < sp.count; i++) {
      let x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i); const f = 1 + 0.08 * (vn(x * 3 + 2, z * 3 + y) - 0.5) + 0.03 * (vn(x * 9, z * 9 + y * 4) - 0.5);
      x *= 0.36 * f; z *= 0.27 * f; y = Math.min(y * 0.52 * f, 0.4 - 0.003 * vn(x * 30, z * 30)); sp.setXYZ(i, x, y, z);
    }
    sg.computeVertexNormals(); sg.translate(0, KOMPASS.steinH - 0.4, 0);
    const steinM = weltMat(u, { color: "#A29E94", roughness: 0.86, moos: 0.3, flatShading: false });
    // flache Oberseite + streifende Sonne → sonst Schattenakne auf dem Kompass: Stein wirft keinen Schatten
    this.stein = this._mesh(sg, steinM, { schatten: false }); this.stein.position.set(KOMPASS.x, hoehe(KOMPASS.x, KOMPASS.z), KOMPASS.z); this.stein.rotation.y = 0.25;
    // Fliegenpilze neben dem Stein
    const pz = this._inst(pilzGeo(), weltMat(u, { vertexColors: true, roughness: 0.6, flatShading: false }), 4, true);
    [[-0.22, -1.3, 1.1, 0.2], [-0.17, -1.42, 0.8, 1.4], [-0.3, -1.12, 0.6, 2.2], [0.5, -1.55, 0.9, 0.7]].forEach(([x, z, s, ry], i) => this._setze(pz, i, x, hoehe(x, z) - 0.004, z, s, ry, s, s, 0.05 * (i - 1), 0.04));
    // Herbstgras-Büschel
    const gr = buschel(), N2 = 9000, gras = this._inst(gr, weltMat(u, { color: "#FFFFFF", roughness: 0.95, side: THREE.DoubleSide, wind: 0.06, windH: 1 }), N2, false);
    const GF = ["#A89A55", "#8C8A48", "#B5A060", "#7A7A3A", "#C2A866", "#6E6A34"].map(C);
    k = 0;
    for (let i = 0; i < 90000 && k < N2; i++) {
      const r = 0.5 + 26 * Math.pow(hash(i, 501), 2.0), a = hash(i, 502) * 6.283, x = Math.sin(a) * r, z = -Math.cos(a) * r * 0.9 + 1.5, d = landAbstand(x, z);
      if (d < 1.3 + 0.8 * hash(i, 503) || Math.hypot(x - KOMPASS.x, z - KOMPASS.z) < 0.42 || Math.hypot(x, z - 0.3) < 0.55) continue;
      const s = (0.22 + 0.35 * hash(i, 504)) * (d < 2.5 ? 0.7 : 1);
      this._setze(gras, k, x, hoehe(x, z) - 0.02, z, s, hash(i, 505) * 6.28, s * 1.1, s * 1.1); gras.setColorAt(k, GF[Math.floor(hash(i, 506) * GF.length)]); k++;
    }
    gras.count = k; gras.instanceColor.needsUpdate = true;
  }
  _schilf() {
    const geos = [schilfGeo(3), schilfGeo(11)], mat = weltMat(this.u, { vertexColors: true, roughness: 0.85, side: THREE.DoubleSide, wind: 0.14, windH: 2.2 });
    const L = [];
    for (const [x, z, s] of [[-1.45, -5.0, 0.8], [-1.75, -4.4, 0.7], [-1.25, -5.9, 0.85], [2.1, -7.6, 0.9], [2.6, -8.5, 0.8], [3.2, -7.9, 1]]) L.push({ x, z, s });
    for (let i = 0; i < 9000 && L.length < 640; i++) {
      const x = (hash(i, 601) - 0.5) * 140, z = 4 - 90 * hash(i, 602), d = landAbstand(x, z);
      if (d < -2.2 || d > 0.5 || Math.abs(x) < 2.8 && z > -14) continue;
      if (vn(x * 0.07 + 3, z * 0.07) < 0.5 + 0.06 * hash(i, 603)) continue;
      L.push({ x, z });
    }
    // Schilfgürtel an den Seitenufern (fern)
    for (let i = 0; i < 4000 && L.length < 900; i++) {
      const z = -60 - 1100 * hash(i, 611), s = hash(i, 612) < 0.5 ? -1 : 1; let x = s * seeRX(z) * Math.sqrt(Math.max(0, 1 - ((z - SEE_CZ) / SEE_RZ) ** 2));
      for (let k = 0; k < 6; k++) { const d = landAbstand(x, z); x -= s * d * 0.7; }
      if (Math.abs(landAbstand(x, z)) > 2 || vn(x * 0.05, z * 0.05) < 0.45) continue;
      L.push({ x, z, s: 1.1 });
    }
    geos.forEach((G, gi) => {
      const T = L.filter((_, k) => k % 2 === gi), im = this._inst(G, mat, T.length, true);
      T.forEach((b, k) => { const i = Math.round(b.x * 131 + b.z * 17), s = (b.s ?? 1) * (0.75 + 0.45 * hash(i, 605)); this._setze(im, k, b.x, Math.max(hoehe(b.x, b.z), -0.6) - 0.05, b.z, s, hash(i, 606) * 6.28, s, s); im.setColorAt(k, this._c.setRGB(0.9 + 0.2 * hash(i, 607), 0.9 + 0.15 * hash(i, 608), 0.85 + 0.2 * hash(i, 609))); });
      im.instanceColor.needsUpdate = true;
    });
    this.schilfZahl = L.length;
  }
  _steg() {
    const u = this.u, [ax, az] = STEG.a, [bx, bz] = STEG.b, L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L, ry = Math.atan2(dx, dz);
    const holz = weltMat(u, { color: "#FFFFFF", roughness: 0.93 }), dunkel = weltMat(u, { color: "#3A3028", roughness: 0.95 });
    const brett = new THREE.BoxGeometry(STEG.breite, 0.05, 0.15), nB = Math.floor(L / 0.18), bm = this._inst(brett, holz, nB, true);
    for (let k = 0, j = 0; k < nB; k++) {
      if (k === 61 || k === 97) continue;                                                // fehlende Bretter
      const s = k * 0.18 + 0.09, x = ax + dx * s, z = az + dz * s;
      this._setze(bm, j, x + (hash(k, 701) - 0.5) * 0.04, STEG.deck + (hash(k, 702) - 0.5) * 0.02, z, 1, ry + (hash(k, 703) - 0.5) * 0.03, 1 - 0.06 * hash(k, 704), 1, (hash(k, 705) - 0.5) * 0.03, 0);
      const f = 0.36 + 0.14 * hash(k, 706); bm.setColorAt(j, this._c.setRGB(f * 1.05, f * 0.92, f * 0.78)); j++; bm.count = j;
    }
    bm.instanceColor.needsUpdate = true;
    const pf = new THREE.CylinderGeometry(0.075, 0.085, 2.6, 7), nP = Math.ceil(L / 2.4) * 2 + 2, pm = this._inst(pf, dunkel, nP, true);
    let k = 0; const lx = Math.cos(ry), lz = -Math.sin(ry);
    for (let s = 0.6; s < L; s += 2.4) for (const q of [-1, 1]) { const x = ax + dx * s + lx * q * 0.62, z = az + dz * s + lz * q * 0.62; this._setze(pm, k++, x, STEG.deck - 1.2, z, 1, 0, 1, 1, (hash(k, 711) - 0.5) * 0.06, (hash(k, 712) - 0.5) * 0.06); }
    pm.count = k;
    for (const q of [-1, 1]) { const g = new THREE.BoxGeometry(0.08, 0.14, L); g.rotateY(ry); g.translate((ax + bx) / 2 + lx * q * 0.6, STEG.deck - 0.1, (az + bz) / 2 + lz * q * 0.6); this._mesh(g, dunkel); }
    // Poller am Ende mit Tau, Ruderboot
    const ex = bx + dx * 0.1, ez = bz + dz * 0.1;
    const poller = new THREE.CylinderGeometry(0.09, 0.1, 1.0, 8); poller.translate(ex + lx * 0.55, STEG.deck + 0.3, ez + lz * 0.55); this._mesh(poller, dunkel);
    const B = bootTeile(), boot = new THREE.Group(), rumpfM = weltMat(u, { color: "#E6E2D6", roughness: 0.6, side: THREE.DoubleSide, flatShading: false }), innenM = weltMat(u, { color: "#5A4632", roughness: 0.9 });
    const stG = new THREE.Mesh(B.rumpf, [new THREE.MeshBasicMaterial({ visible: false }), rumpfM]); stG.castShadow = stG.receiveShadow = this.schattenAn; boot.add(stG);
    const streif = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 4, 48), weltMat(u, { color: "#2F5A3A", roughness: 0.6 })); streif.scale.set(1.68, 0.64, 1); streif.rotation.x = Math.PI / 2; streif.position.y = 0.28; boot.add(streif);
    for (const g of [B.innen, ...B.holz]) { const m = new THREE.Mesh(g, innenM); m.castShadow = m.receiveShadow = this.schattenAn; boot.add(m); }
    for (const g of B.riemen) { const m = new THREE.Mesh(g, weltMat(u, { color: "#8A6A44", roughness: 0.8 })); m.castShadow = this.schattenAn; boot.add(m); }
    this.boot = boot; this.bootPos = [ex + lx * 1.55, ez + lz * 1.55, ry - Math.PI / 2 + 0.12]; this.szene.add(boot);
    const tau = new THREE.CatmullRomCurve3([[ex + lx * 0.55, STEG.deck + 0.72, ez + lz * 0.55], [ex + lx * 0.9, STEG.deck + 0.2, ez + lz * 0.9], [ex + lx * 1.1, 0.32, ez + lz * 1.0 + 0.6]].map((v) => new THREE.Vector3(...v)));
    this._mesh(new THREE.TubeGeometry(tau, 16, 0.014, 5), weltMat(u, { color: "#BCA77E", roughness: 0.95 }), { schatten: false });
    ORTE.boot = [this.bootPos[0], 0.3, this.bootPos[1]];
  }
  _huette() {
    let z = -1150, x = -150; for (; z > -1700; z -= 4) if (landAbstand(x, z) > 22) break;
    const y = hoehe(x, z);
    this.huette = this._mesh(huetteGeo(), weltMat(this.u, { vertexColors: true, roughness: 0.9 })); this.huette.position.set(x, y - 0.2, z); this.huette.rotation.y = 0.2;
    this.huetteFenster = new THREE.MeshStandardMaterial({ color: "#151210", emissive: "#FFB060", emissiveIntensity: 0 });
    for (const xx of [-1.6, 1.4]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), this.huetteFenster); f.position.set(xx, 1.5, 2.79); this.huette.add(f); }
    this.kamin = [x + 1.75 * Math.cos(0.2) - 0.6 * Math.sin(0.2), y + 5.4, z - 0.6 * Math.cos(0.2) - 1.75 * Math.sin(0.2)];
    ORTE.huette = [x, y + 3, z];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([x + 0.2, y + 1.5, z + 2.9, x - 4, y + 1.2, z + 4], 3));
    g.setAttribute("farbe", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3)); g.setAttribute("groesse", new THREE.Float32BufferAttribute([9, 5], 1));
    this.punktU = { nebelD: { value: 0 } };
    this.punkte = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: PUNKT_V, fragmentShader: PUNKT_F, uniforms: this.punktU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.punkte.frustumCulled = false; this.punkte.renderOrder = 15; this.szene.add(this.punkte);
  }
  _enten(n) {
    const mat = weltMat(this.u, { vertexColors: true, roughness: 0.75, flatShading: false });
    this.enteE = this._inst(enteGeo(true), mat, Math.ceil(n / 2), true); this.enteW = this._inst(enteGeo(false), mat, Math.floor(n / 2), true);
    this.fluegel = this._inst(fluegelGeo(), weltMat(this.u, { color: "#7C7064", roughness: 0.8, side: THREE.DoubleSide }), n * 2, false);
    // [cx, cz, r, om, folgt der vorigen Ente (Paar)]
    const bahnen = [[-2.5, -15, 4.5, 0.06, 0], [-2.5, -15, 4.5, 0.06, 1], [5, -34, 7, -0.04, 0], [-9, -46, 6, 0.035, 0], [-9, -46, 6, 0.035, 1], [12, -70, 10, -0.03, 0], [-20, -95, 12, 0.025, 0], [3, -120, 9, -0.03, 0], [-4, -24, 3, -0.07, 0]];
    this.entenL = [];
    for (let i = 0; i < n; i++) {
      const b = bahnen[i % bahnen.length], folge = b[4] === 1 && i > 0;
      const e = { erpel: i % 2 === 0, cx: b[0], cz: b[1], r: b[2] * (folge ? 1.05 : 1), om: b[3], ph: hash(i, 801) * 6.28, gr: hash(i, 802), i };
      if (folge) e.ph = this.entenL[i - 1].ph - (0.75 / b[2]) * Math.sign(b[3]);       // ≈ 0,75 m hinter der vorigen
      this.entenL.push(e);
    }
  }
  _laub() {
    const u = this.u, bs = new THREE.Shape(); bs.moveTo(0, -0.036); bs.quadraticCurveTo(0.032, -0.012, 0.004, 0.03); bs.lineTo(0, 0.04); bs.lineTo(-0.004, 0.03); bs.quadraticCurveTo(-0.032, -0.012, 0, -0.036);
    const blatt = new THREE.ShapeGeometry(bs, 4); blatt.rotateX(-Math.PI / 2);
    const LF = ["#B4521C", "#C8802A", "#D6A03A", "#8E3A16", "#A8742E", "#6E4A22", "#7A5A2E", "#B89040"].map(C);
    const mat = weltMat(u, { color: "#FFFFFF", roughness: 0.85, side: THREE.DoubleSide });
    // am Boden
    const N = 2600, boden = this._inst(blatt, mat, N, false); let k = 0;
    for (let i = 0; i < 20000 && k < N; i++) {
      const r = 0.4 + 14 * Math.pow(hash(i, 901), 1.4), a = hash(i, 902) * 6.283, x = Math.sin(a) * r, z = -Math.cos(a) * r + 1.2, d = landAbstand(x, z);
      if (d < 0.4) continue;
      const s = 0.6 + 0.6 * hash(i, 903);
      this._setze(boden, k, x, hoehe(x, z) + 0.012, z, s, hash(i, 904) * 6.28, s, s, (hash(i, 905) - 0.5) * 0.5, (hash(i, 906) - 0.5) * 0.5);
      boden.setColorAt(k, this._c.copy(LF[Math.floor(hash(i, 907) * LF.length)]).multiplyScalar(0.75 + 0.3 * hash(i, 908))); k++;
    }
    boden.count = k; boden.instanceColor.needsUpdate = true;
    // auf dem Stein ein paar Blätter
    // treibend auf dem Wasser und fallend
    this.treibL = []; for (let i = 0; i < 240; i++) this.treibL.push({ x: (hash(i, 911) - 0.5) * 40, z: -4.6 - 30 * Math.pow(hash(i, 912), 1.5), s: 0.8 + 0.8 * hash(i, 913), ry: hash(i, 914) * 6.28, ph: hash(i, 915) * 6.28, v: 0.6 + 0.8 * hash(i, 916) });
    this.treib = this._inst(blatt, mat, this.treibL.length, false);
    this.treibL.forEach((b, i) => this.treib.setColorAt(i, LF[Math.floor(hash(i, 917) * LF.length)]));
    this.treib.instanceColor.needsUpdate = true;
    this.fallN = 36; this.fall = this._inst(blatt, mat, this.fallN, true);
    for (let i = 0; i < this.fallN; i++) this.fall.setColorAt(i, LF[Math.floor(hash(i, 921) * LF.length)]);
    this.fall.instanceColor.needsUpdate = true;
  }
  _kompass(S) {
    const u = this.u, g = new THREE.Group(); this.kompass = g;
    const plastik = weltMat(u, { color: "#1C1E20", roughness: 0.45, flatShading: false }), metall = weltMat(u, { color: "#A9AEB2", roughness: 0.3, metalness: 0.8, flatShading: false });
    // Grundplatte (transparent, abgerundet) 6 × 11 cm, Länge entlang −z (Marschrichtung = Norden)
    const W = 0.06, Lp = 0.11, R = 0.008, sh = new THREE.Shape();
    sh.moveTo(-W / 2 + R, -Lp / 2); sh.lineTo(W / 2 - R, -Lp / 2); sh.quadraticCurveTo(W / 2, -Lp / 2, W / 2, -Lp / 2 + R); sh.lineTo(W / 2, Lp / 2 - R); sh.quadraticCurveTo(W / 2, Lp / 2, W / 2 - R, Lp / 2);
    sh.lineTo(-W / 2 + R, Lp / 2); sh.quadraticCurveTo(-W / 2, Lp / 2, -W / 2, Lp / 2 - R); sh.lineTo(-W / 2, -Lp / 2 + R); sh.quadraticCurveTo(-W / 2, -Lp / 2, -W / 2 + R, -Lp / 2);
    const hole = new THREE.Path(); hole.absarc(0, -(Lp / 2 - 0.007), 0.0025, 0, Math.PI * 2, true); sh.holes.push(hole);   // Form-y → Welt −z: Loch am Südende
    const platte = new THREE.ExtrudeGeometry(sh, { depth: 0.0025, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0006, bevelSegments: 2, curveSegments: 8 }); platte.rotateX(-Math.PI / 2);
    const platteM = new THREE.MeshStandardMaterial({ color: "#E8F0F2", roughness: 0.12, metalness: 0, transparent: true, opacity: 0.58, depthWrite: false });
    const pm = new THREE.Mesh(platte, platteM); pm.renderOrder = 3; g.add(pm);
    // Aufdruck der Grundplatte: Lineal, Marschrichtungspfeil, Lupe
    const [c1, x1] = leinwand(512, 1024);
    x1.clearRect(0, 0, 512, 1024); x1.strokeStyle = "#111"; x1.fillStyle = "#111";
    for (let i = 0; i <= 90; i++) { const y = 60 + i * 9.6, l = i % 10 === 0 ? 34 : i % 5 === 0 ? 24 : 14; x1.lineWidth = i % 10 === 0 ? 3 : 2; x1.beginPath(); x1.moveTo(10, y); x1.lineTo(10 + l, y); x1.stroke(); x1.beginPath(); x1.moveTo(502, y); x1.lineTo(502 - l, y); x1.stroke(); }
    x1.fillStyle = "#C21E1A"; x1.beginPath(); x1.moveTo(256, 30); x1.lineTo(226, 110); x1.lineTo(246, 110); x1.lineTo(246, 230); x1.lineTo(266, 230); x1.lineTo(266, 110); x1.lineTo(286, 110); x1.closePath(); x1.fill();
    x1.strokeStyle = "rgba(20,20,20,0.7)"; x1.lineWidth = 4; x1.beginPath(); x1.arc(256, 900, 64, 0, Math.PI * 2); x1.stroke();
    x1.font = "600 26px Arial, sans-serif"; x1.fillStyle = "#111"; x1.fillText("1:25 000", 64, 1000);
    const druck = new THREE.Mesh(new THREE.PlaneGeometry(W, Lp), new THREE.MeshStandardMaterial({ map: textur(c1), transparent: true, roughness: 0.5, depthWrite: false }));
    druck.rotation.x = -Math.PI / 2; druck.position.y = 0.0032; druck.renderOrder = 4; g.add(druck);
    // Kapsel (drehbar): Gehäusering mit Skala, Boden mit Nordpfeil, Nadel, Glas
    const kap = new THREE.Group(); kap.position.set(0, 0.0031, -0.004); g.add(kap); this.kapsel = kap;
    const RA = 0.024, RI = 0.0165;
    const wand = new THREE.CylinderGeometry(RA, RA, 0.009, 64, 1, true); wand.translate(0, 0.0045, 0);
    const wp = wand.getAttribute("position"), wc = []; for (let i = 0; i < wp.count; i++) { const a = Math.atan2(wp.getZ(i), wp.getX(i)); const r = 0.15 + 0.05 * (Math.sin(a * 64) > 0 ? 1 : 0); wc.push(r, r, r * 1.05); }
    wand.setAttribute("color", new THREE.Float32BufferAttribute(wc, 3));
    kap.add(new THREE.Mesh(wand, weltMat(u, { vertexColors: true, roughness: 0.5, flatShading: false })));
    const innenW = new THREE.CylinderGeometry(RI, RI, 0.0078, 48, 1, true); innenW.translate(0, 0.0012 + 0.0039, 0);
    kap.add(new THREE.Mesh(innenW, weltMat(u, { color: "#2A2D30", roughness: 0.5, flatShading: false, side: THREE.DoubleSide })));
    const [c2, x2] = leinwand(1024, 1024);
    x2.fillStyle = "#17191B"; x2.fillRect(0, 0, 1024, 1024); x2.translate(512, 512);
    for (let dgr = 0; dgr < 360; dgr += 2) {
      const lang = dgr % 10 === 0, a = (dgr * Math.PI) / 180; x2.strokeStyle = "#EDEDE4"; x2.lineWidth = lang ? 7 : 4;
      const r0 = lang ? 412 : 446; x2.beginPath(); x2.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0); x2.lineTo(Math.sin(a) * 500, -Math.cos(a) * 500); x2.stroke();
    }
    x2.textAlign = "center"; x2.textBaseline = "middle";
    for (let dgr = 20; dgr < 360; dgr += 20) { if (dgr % 90 === 0 || Math.abs(((dgr + 45) % 90) - 45) < 15) continue; const a = (dgr * Math.PI) / 180; x2.save(); x2.rotate(a); x2.fillStyle = "#EDEDE4"; x2.font = "600 42px Arial, sans-serif"; x2.fillText(String(dgr), 0, -378); x2.restore(); }
    [["N", 0, "#E8362A"], ["O", 90, "#EDEDE4"], ["S", 180, "#EDEDE4"], ["W", 270, "#EDEDE4"]].forEach(([b, dgr, f]) => { x2.save(); x2.rotate((dgr * Math.PI) / 180); x2.fillStyle = f; x2.font = "700 64px Arial, sans-serif"; x2.fillText(b, 0, -376); x2.restore(); });
    const [c3, x3] = leinwand(1024, 1024); x3.fillStyle = "#000"; x3.fillRect(0, 0, 1024, 1024); x3.translate(512, 512); x3.fillStyle = "#FFF";
    for (const dgr of [0, 90, 180, 270]) { const a = (dgr * Math.PI) / 180; x3.beginPath(); x3.arc(Math.sin(a) * 300, -Math.cos(a) * 300, 18, 0, Math.PI * 2); x3.fill(); }
    this.skalaM = new THREE.MeshStandardMaterial({ map: textur(c2), emissiveMap: textur(c3), emissive: "#7CFFB0", emissiveIntensity: 0, roughness: 0.45 });
    const ring = new THREE.RingGeometry(RI * 0.98, RA, 96, 1); ring.rotateX(-Math.PI / 2);
    const ru = ring.getAttribute("uv"), rpos = ring.getAttribute("position"); for (let i = 0; i < ru.count; i++) ru.setXY(i, rpos.getX(i) / RA / 2 + 0.5, -rpos.getZ(i) / RA / 2 + 0.5);
    const skala = new THREE.Mesh(ring, this.skalaM); skala.position.y = 0.009; kap.add(skala);
    const [c4, x4] = leinwand(512, 512); x4.fillStyle = "#E9ECE6"; x4.fillRect(0, 0, 512, 512); x4.translate(256, 256);
    x4.strokeStyle = "rgba(30,30,30,0.55)"; x4.lineWidth = 3; for (let k = -3; k <= 3; k++) { x4.beginPath(); x4.moveTo(k * 62, -250); x4.lineTo(k * 62, 250); x4.stroke(); }
    x4.strokeStyle = "#D2261E"; x4.lineWidth = 9; x4.beginPath(); x4.moveTo(0, -200); x4.lineTo(-56, -90); x4.lineTo(-24, -90); x4.lineTo(-24, 150); x4.lineTo(24, 150); x4.lineTo(24, -90); x4.lineTo(56, -90); x4.closePath(); x4.stroke();
    const boden = new THREE.Mesh(new THREE.CircleGeometry(RI, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: textur(c4), roughness: 0.6 })); boden.position.y = 0.0012; kap.add(boden);
    // Nadel: Norden rot (Spitze leuchtend), Süden weiß
    const nadel = new THREE.Group(); nadel.position.y = 0.0042; kap.add(nadel); this.nadel = nadel;
    const halb = (laenge, farbe, emis) => { const s = new THREE.Shape(); s.moveTo(-0.0032, 0); s.lineTo(0, laenge); /* Form +y → Welt −z (Norden) */ s.lineTo(0.0032, 0); s.closePath(); const geo = new THREE.ExtrudeGeometry(s, { depth: 0.0007, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); const m = new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.4, emissive: emis || "#000000", emissiveIntensity: 0 }); return [new THREE.Mesh(geo, m), m]; };
    const [nN_, nM] = halb(0.0152, "#D3261E", "#FF3A22"), [sN_, sM] = halb(0.0152, "#ECEBE6"); sN_.rotation.y = Math.PI; nadel.add(nN_, sN_);
    const spitze = new THREE.Mesh(new THREE.CircleGeometry(0.0011, 10).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#E8FFE8", emissive: "#8CFFB8", emissiveIntensity: 0 })); spitze.position.set(0, 0.00075, -0.0108); nadel.add(spitze);
    this.leuchtM = [spitze.material]; this.nadelM = nM;
    const achse = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.0014, 16), metall); achse.position.y = 0.0011; nadel.add(achse);
    const glas = new THREE.Mesh(new THREE.CircleGeometry(RA * 0.99, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.14, depthWrite: false }));
    glas.position.y = 0.0094; glas.renderOrder = 5; kap.add(glas);
    // Spiegeldeckel am Nordende (Scharnier), aufgeklappt, Spiegel zum Betrachter
    const deckel = new THREE.Group(); deckel.position.set(0, 0.0035, -Lp / 2); deckel.rotation.x = -(Math.PI - 1.15); g.add(deckel);
    const dw = W, dl = 0.072;
    const rahmen = new THREE.Mesh(new THREE.BoxGeometry(dw, 0.0035, dl).translate(0, 0, dl / 2), plastik); rahmen.castShadow = this.schattenAn; deckel.add(rahmen);
    this.spiegelM = new THREE.MeshStandardMaterial({ color: "#1A1E22", roughness: 0.08, metalness: 0.9, emissive: "#8090A0", emissiveIntensity: 0.3 });
    const spiegel = new THREE.Mesh(new THREE.PlaneGeometry(dw * 0.78, dl * 0.72).rotateX(Math.PI / 2).translate(0, -0.0019, dl * 0.5), this.spiegelM); deckel.add(spiegel);
    const kimme = new THREE.Mesh(new THREE.BoxGeometry(0.0006, 0.0004, dl * 0.72).translate(0, -0.0022, dl * 0.5), new THREE.MeshStandardMaterial({ color: "#111" })); deckel.add(kimme);
    for (const s of [-1, 1]) { const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.0017, 0.0017, 0.012, 10).rotateZ(Math.PI / 2), metall); sc.position.set(s * (W / 2 - 0.007), 0.0035, -Lp / 2); g.add(sc); }
    // rote Kordel durch das Loch, über den Stein hinab
    const top = KOMPASS.steinOben, kx = KOMPASS.x, kz = KOMPASS.z;
    const kordel = new THREE.CatmullRomCurve3([[0, 0.004, Lp / 2 - 0.007], [0.008, 0.005, Lp / 2 + 0.02], [0.04, 0.0025, Lp / 2 + 0.045], [0.085, 0.0022, Lp / 2 + 0.03], [0.12, 0.002, Lp / 2 - 0.01], [0.135, 0.0024, Lp / 2 - 0.05]].map((v) => new THREE.Vector3(...v)));
    const kordelM = weltMat(u, { color: "#A8231C", roughness: 0.85, flatShading: false });
    g.add(new THREE.Mesh(new THREE.TubeGeometry(kordel, 60, 0.0018, 6), kordelM));
    g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = this.schattenAn; } });     // millimeterdünne Teile: kein Schattenwurf (Akne)
    g.scale.setScalar(S); g.position.set(kx, top + 0.0008 * S, kz); g.rotation.y = 0.14;
    this.szene.add(g);
    KOMPASS.mitte.splice(0, 3, kx, top + 0.01 * S, kz);                             // ORTE.kompass zeigt auf dasselbe Feld
  }

  augePos() { return [AUGE.x, hoehe(AUGE.x, AUGE.z) + AUGE.sitz, AUGE.z]; }
  setze(t, kamera, zustand = {}) { return this.update(t, { ...zustand, kamera }); }

  update(t, z = {}) {
    const kam = z.kamera || null, u = this.u, tempo = z.tempo ?? 1, tt = t * tempo, wind = z.wind ?? 0.5;
    // --- Sonne, Stimmung
    const az = z.sonne?.az ?? 218, sd = z.sonnenRichtung ? new THREE.Vector3(...z.sonnenRichtung).normalize().toArray() : sonnenRichtung(z.sonne?.hoehe ?? 22, az);
    const alt = Math.asin(clamp(sd[1], -1, 1)) / D2R, pl = clamp(z.polarlicht ?? 0), plNord = z.plNord ?? 380;
    const g = typeof z.stimmung === "string" ? { [z.stimmung]: 1 } : z.stimmung || autoGewichte(alt, az, pl);
    const S = mischeStimmung(g), nacht = 1 - smoothstep(-9, -3, alt), sterne = z.sterne ?? 1 - smoothstep(-11, -4, alt);
    const sonneSicht = smoothstep(-1.5, 2.5, alt);
    u.uZeit.value = t; u.uWind.value = wind;
    u.uBSY.value = alt > 7.5 ? -1e5 : -300 + 1800 * smoothstep(7, -2.5, alt); u.uBSMin.value = 0;
    const bsBoden = clamp((0 - (u.uBSY.value - 90)) / 180);                       // Bergschatten auf Seehöhe (für Glitzer)
    if (kam && this.himmel) this.himmel.folge(kam);
    // --- Himmel
    if (this.himmel) {
      const H = this.himmel.u;
      for (const k of ["zenit", "horizont", "unten", "hof", "guertel", "wolkenHell", "wolkenDunkel"]) H[k].value.copy(S[k]);
      H.guertelS.value = S.guertelS; H.sonnenDir.value.set(...sd); H.sonnenFarbe.value.copy(S.sonne); H.sonnenStaerke.value = 26 * sonneSicht;
      H.glanz.value = 0.55 + 0.45 * (1 - smoothstep(4, 25, alt)); H.sterne.value = sterne; H.polarlicht.value = pl; H.plNord.value = plNord; H.zeit.value = t;
      H.wolken.value = z.wolken ?? 0.4; H.dunst.value = 0.28;
    }
    if (this.szene.fog) { this.szene.fog.color.copy(S.nebel); this.szene.fog.density = this.nebelDichte * (z.dunst ?? 1); }
    // --- Lichter
    const plG = this._c2.setRGB(0.3, 1.0, 0.55), plE = Math.atan2(150, Math.max(plNord, -2000) + 1e-3);
    if (this.lichter) {
      const L = this.lichter, s = L.sonne, vor = this._p.set(0, 0, -8);
      if (kam) { this._v.set(0, 0, -1).applyQuaternion(kam.quaternion).setY(0); if (this._v.lengthSq() > 1e-6) this._v.normalize(); vor.copy(kam.position).addScaledVector(this._v, 10).setY(0); }
      s.position.set(vor.x + sd[0] * 45, Math.max(sd[1], 0.03) * 45, vor.z + sd[2] * 45); s.target.position.copy(vor); s.target.updateMatrixWorld();
      s.color.copy(S.sonne); s.intensity = S.sonneI * sonneSicht * (0.5 + 0.5 * smoothstep(0, 12, alt));
      L.hemi.color.copy(S.hemiH).lerp(plG, 0.25 * pl * nacht); L.hemi.groundColor.copy(S.hemiB); L.hemi.intensity = S.hemiI * (1 + 0.4 * pl * nacht);
      L.mond.intensity = S.mond;
      L.aurora.position.set(0, Math.sin(plE) * 4000, -Math.cos(plE) * 4000); L.aurora.intensity = 1.1 * pl * nacht;
    }
    // --- Wasser
    const W = this.wasserU;
    W.zeit.value = t; W.welle.value = (z.welle ?? 1) * (0.5 + 0.9 * wind); W.tief.value.copy(S.wasser); W.flach.value.copy(S.flach);
    W.licht.value.copy(S.hemiH).multiplyScalar(S.hemiI * 0.6).lerp(plG, 0.1 * pl * nacht); W.sonnenDir.value.set(...sd);
    W.sonnenF.value.copy(S.sonne).multiplyScalar(sonneSicht * S.sonneI / 3 * bsBoden);
    // --- Enten (schwimmen, gründeln, fliegen auf)
    const enS = (z.enten ?? 1) > 0.02, flucht = z.entenFlucht ?? null, eu = W.enten.value;
    let iE = 0, iW = 0;
    this.entenL.forEach((e, i) => {
      const a = e.ph + e.om * tt, x0 = e.cx + Math.cos(a) * e.r, z0 = e.cz + Math.sin(a) * e.r * 0.6;
      let fx = -Math.sin(a) * Math.sign(e.om), fz = Math.cos(a) * 0.6 * Math.sign(e.om); const fl = Math.hypot(fx, fz); fx /= fl; fz /= fl;
      const v = Math.abs(e.om) * e.r * tempo;
      const per = 9 + 6 * e.gr, ph = fr(tt / per + e.gr * 3.1), dip = smoothstep(0.0, 0.06, ph) * (1 - smoothstep(0.2, 0.26, ph)) * (i % 3 === 1 ? 0 : 1);
      let x = x0, y = 0.0 + 0.012 * Math.sin(t * 1.7 + i), zz = z0, nick = -1.55 * dip, roll = 0.04 * Math.sin(t * 1.3 + i), flug = 0;
      if (flucht !== null) {
        const tau = t - flucht - 0.35 * i * (0.6 + 0.8 * e.gr);
        if (tau > 0) { flug = 1; fx = fx * 0.35; fz = fz * 0.35 - 0.65; const fl2 = Math.hypot(fx, fz); fx /= fl2; fz /= fl2; const dist = 2.5 * tau + 3.2 * tau * tau; x = x0 + fx * dist; zz = z0 + fz * dist; y = 0.05 + 0.6 * tau + 1.4 * tau * tau; nick = Math.min(0.35, 0.12 + 0.1 * tau); roll = 0.05 * Math.sin(t * 3 + i); }
      }
      const ry = Math.atan2(-fz, fx), sk = enS ? (flug && y > 60 ? 0.001 : 1) : 0.001;
      const im = e.erpel ? this.enteE : this.enteW, k = e.erpel ? iE++ : iW++;
      this._e.set(roll, ry, nick, "YXZ"); this._q.setFromEuler(this._e); this._s.set(sk, sk, sk); this._p.set(x, y - 0.025 * dip, zz); this._m.compose(this._p, this._q, this._s); im.setMatrixAt(k, this._m);
      // Flügel (nur im Flug sichtbar, schlagen 8 Hz)
      const fw = flug ? 0.9 * Math.sin(t * 2 * Math.PI * 8 + i) : 0;
      for (const sgn of [-1, 1]) {
        this._m2.compose(this._v.set(0.02, 0.15, sgn * 0.05), this._q.setFromEuler(this._e.set(sgn * (0.15 + fw), sgn > 0 ? 0 : Math.PI, 0, "XYZ")), this._s.set(flug ? 1 : 0.001, 1, flug ? 1 : 0.001));
        this.fluegel.setMatrixAt(i * 2 + (sgn > 0 ? 1 : 0), this._m2.premultiply(this._m));
      }
      if (i < 8) eu[i].set(x, zz, flug || !enS ? 0 : fx * v * 3, flug || !enS ? 0 : fz * v * 3);
    });
    this.enteE.instanceMatrix.needsUpdate = true; this.enteW.instanceMatrix.needsUpdate = true; this.fluegel.instanceMatrix.needsUpdate = true;
    // --- Fischringe
    W.ringe.value.forEach((R, k) => {
      const P = 6.5 + 2.7 * k, q = t + k * 2.3, zyk = Math.floor(q / P), alter = q - zyk * P;
      R.set((hash(zyk, 950 + k) - 0.5) * 26, -9 - 50 * hash(zyk, 960 + k), alter < 5 ? alter : -1, hash(zyk, 970 + k) < 0.75 ? 1 : 0);
    });
    // --- Boot
    if (this.boot) { const [bx, bz, bry] = this.bootPos; this.boot.position.set(bx, 0.03 * Math.sin(t * 1.1), bz); this.boot.rotation.set(0.02 * Math.sin(t * 0.9 + 1), bry + 0.03 * Math.sin(tt * 0.15), 0.025 * Math.sin(t * 1.3), "YXZ"); }
    // --- Laub: treibend und fallend
    const bl = z.blaetter ?? 1;
    this.treibL.forEach((b, i) => {
      const xx = ((b.x + 20 + wind * 0.12 * b.v * tt) % 40 + 40) % 40 - 20, zz = b.z + 0.3 * Math.sin(tt * 0.05 + b.ph);
      const ok = landAbstand(xx, zz) < -0.3 ? 1 : 0.001;
      this._setze(this.treib, i, xx, 0.008 + 0.006 * Math.sin(t * 1.6 + b.ph), zz, b.s * ok, b.ry + 0.05 * tt * (b.v - 1), b.s * ok, b.s * ok, 0.06 * Math.sin(t * 1.2 + b.ph), 0.06 * Math.cos(t * 1.4 + b.ph));
    });
    this.treib.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < this.fallN; i++) {
      const P = 7 + 5 * hash(i, 931), q = tt + hash(i, 932) * P, zyk = Math.floor(q / P), alter = q - zyk * P;
      const x0 = (hash(zyk, 940 + i) - 0.5) * 7 - wind * 3, z0 = -1.5 - 14 * hash(zyk, 1940 + i), y0 = 2.2 + 3.2 * hash(zyk, 2940 + i);
      const fallH = y0 - 0.85 * alter, x = x0 + wind * 1.3 * alter + 0.35 * Math.sin(alter * 2.1 + i), zz = z0 - wind * 0.5 * alter + 0.3 * Math.cos(alter * 1.7 + i);
      const boden = Math.max(hoehe(x, zz), 0) + 0.01, y = Math.max(fallH, boden), liegt = fallH <= boden;
      const s = bl > 0.02 && (i / this.fallN) < bl ? 1 - smoothstep(P - 1, P, alter) : 0.001;
      this._setze(this.fall, i, x, y, zz, s, alter * (1.5 + 2 * hash(i, 933)), s, s, liegt ? 0 : alter * (2 + 2.5 * hash(i, 934)), liegt ? 0 : Math.sin(alter * 3 + i) * 1.2);
    }
    this.fall.instanceMatrix.needsUpdate = true;
    // --- Hütte: Fenster, Lichtpunkt, Rauch
    const fen = z.fenster ?? S.fenster * (1 - smoothstep(-2, 6, alt) * 0.95);
    this.huetteFenster.emissiveIntensity = 2.4 * fen;
    const pf = this.punkte.geometry.getAttribute("farbe"); pf.setXYZ(0, 3.2 * fen, 2.0 * fen, 0.9 * fen); pf.setXYZ(1, 0.5 * fen, 0.32 * fen, 0.14 * fen); pf.needsUpdate = true;
    this.punktU.nebelD.value = this.szene.fog ? this.szene.fog.density * 0.6 : 0;
    const puffs = [], rauch = z.rauch ?? 1, km = this.kamin;
    const dFarbe = this._c.copy(S.horizont).lerp(this._c2.copy(S.hemiH).multiplyScalar(S.hemiI * 0.8), 0.5).toArray();
    if (rauch > 0.02) for (let i = 0; i < 26; i++) {
      const a = fr(tt * 0.045 + i / 26), r = 1.2 + a * 9;
      puffs.push({ p: [km[0] + a * 45 * (0.3 + wind) + 2 * Math.sin(i * 1.7 + tt * 0.2), km[1] + a * 38 + 6 * a * a, km[2] - a * 12 * wind], r, dreh: i + a, farbe: dFarbe, a: 0.42 * rauch * (1 - a) * smoothstep(0, 0.06, a), licht: 0.7, bild: i % 4 });
    }
    const nb = z.nebel ?? 0, nf = this._c.copy(S.nebel).lerp(this._c2.copy(S.horizont), 0.4).multiplyScalar(1.05).toArray();
    if (nb > 0.02) for (let i = 0; i < 150; i++) {
      const fern = i >= 40, x = (hash(i, 1501) - 0.5) * (fern ? 700 : 60) + tt * (0.25 + wind * 0.6) * (fern ? 2 : 0.6), zz = fern ? -40 - 1100 * Math.pow(hash(i, 1502), 1.2) : -6 - 45 * hash(i, 1502);
      const w = fern ? 700 : 60, xx = ((x + w / 2) % w + w) % w - w / 2; if (landAbstand(xx, zz) > -4) continue;
      const r = fern ? 10 + 24 * hash(i, 1503) * (1 + -zz / 600) : 2.4 + 3 * hash(i, 1503);
      puffs.push({ p: [xx, (fern ? 1.5 + 3 * hash(i, 1504) : 0.5 + 0.5 * hash(i, 1504)) + r * 0.15, zz], r, dreh: i, farbe: nf, a: nb * (fern ? 0.3 : 0.2) * (0.6 + 0.4 * Math.sin(tt * 0.25 + i)) * smoothstep(0, 1, Math.abs(xx) < w / 2 - r ? 1 : 0), licht: 0.4, bild: i % 4 });
    }
    this.puffs.setze(puffs, kam);
    // --- Vögel
    const vg = z.voegel ?? 1; this.voegelS.mesh.visible = vg > 0.02; if (vg > 0.02) this.voegelS.setze(tt);
    // --- Kompass
    const nd = z.nadel || {}, nz = nd.zittern ?? 0, nw = nd.wandern ?? 0;
    let w = nd.winkel ?? 0;
    if (nd.ruhe && nd.ruhe.t0 !== undefined) w = nadelEinschwingen(t, nd.ruhe.t0, nd.ruhe.von ?? 0, w, { dauer: nd.ruhe.dauer ?? 5 });
    w += 50 * nw * (fbm(t * 0.18 + 5, 1.3, 2) - 0.5) * 2 + nadelZittern(t, nz);
    const kr = this.kompass.rotation.y;
    this.kapsel.rotation.y = -kr;                                                      // Skala: N zeigt nach geografisch Nord
    this.nadel.rotation.y = -w * D2R;
    const le = z.leuchten ?? smoothstep(0.3, 0.8, nacht);
    this.skalaM.emissiveIntensity = 0.9 * le; this.leuchtM.forEach((m) => (m.emissiveIntensity = 2.2 * le)); this.nadelM.emissiveIntensity = 0.25 * le;
    this.spiegelM.emissive.copy(S.zenit).lerp(this._c2.copy(S.horizont), 0.35).lerp(plG, 0.35 * pl * nacht); this.spiegelM.emissiveIntensity = 0.32;
    // --- Post, Zustand
    this.post = { ...S.post, tonung: [...S.post.tonung] };
    this.post.bloomStaerke += 0.25 * pl * nacht;
    this.zustand = { alt, az, gewichte: S.gewichte, sonnenDir: sd, nadelWinkel: w, nacht };
    return this;
  }
}
