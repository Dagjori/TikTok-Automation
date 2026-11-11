// Grundwelt „Fensterplatz über der Tragfläche“ (Account 2 @stelldirvor.pov, Weltenkatalog „Himmel, Flug“ / Physik im Alltag).
// Neubau 12.11.2026 für „Was passiert, wenn ein Blitz dein Flugzeug trifft, in Zeitlupe vom Fensterplatz?“ (Skript acc2-2026-11-12-abend). NUR für den Baukasten Lunar-POV.
//
// Inhalt: Kabine (Seitenwand mit sieben Fenstern, Fensterlaibung, Rollo, Armlehne, Vordersitz, Gepäckfach, Boden), Scheiben mit Regentropfen und Rinnsalen
// (laufen mit der Flugzeit, stehen in der Zeitlupe still) und leichter Spiegelung der Kabine; draußen Rumpf, Bauchverkleidung, linke Tragfläche
// (Profil, Pfeilung, V-Stellung, Blechstöße, Spoiler, Klappen, Vorflügel, Laufsteg), Sharklet-Winglet, Triebwerk mit Pylon, Klappenschienen,
// statische Entlader, Positionslicht rot und Blitzlicht weiß, Höhenleitwerk und Seitenleitwerk; Gewitterfront aus Cumulonimbus-Türmen (Puffs mit
// Sonnenschattierung, wachsend), Wolkenmeer darunter (Shader), Wolkenfetzen, die vorbeiziehen, Regen (Striche in Echtzeit, stehende Tropfen in
// Zeitlupe), Graupel, Elmsfeuer. Blitz: verzweigter Blitzkanal (fest in der Luft, das Flugzeug fliegt hindurch), Kontaktglühen an der Hülle,
// Lichtadern auf der Tragfläche, Funken an den Entladern, Aufleuchten der Wolke, Lichtquellen an Kanal und Nase.
// Alles ist eine reine Funktion von t bzw. der Flugzeit (feste Seeds, kein Math.random, kein Zustand von Bild zu Bild).
//
//   const welt = new FlugzeugFenster(szene, { schatten: 2048 });
//   welt.update(t, {
//     kamera,                       // THREE.PerspectiveCamera (Pflicht)
//     blick: { pos, ziel, yaw, pitch, roll, fov, mitnehmen },   // optional: Kamera in Flugzeug-Koordinaten (pos/ziel [x,y,z], Winkel in Grad wie
//                                   //   PovKamera.zustand(t)); mitnehmen 0..1 = Anteil der Turbulenz, den der Kopf mitmacht (Standard 0,8 → Kabine wackelt leicht).
//                                   //   Ohne blick setzt die Szene die Kamera selbst (Weltkoordinaten; welt.lokalZuWelt([x,y,z]) hilft).
//     flugzeit: s,                  // Zeit der Außenwelt in echten Sekunden (Standard t). In der Zeitlupe langsam weiterzählen → Wolken, Regen, Tropfen stehen.
//     tempo: 1,                     // echte Sekunden je Videosekunde (1 = Echtzeit, 1/220 = Zeitlupe): Länge der Regenstriche, Tropfen statt Striche
//     sonne: [x,y,z], sonneFarbe, hell: 0..1,   // Sonnenrichtung (Welt, y = oben, −z = Flugrichtung), Farbe, Tageslicht gesamt
//     himmel: { … },                // Überschreibungen für Himmel.setze (zenit, horizont …); zenit/horizont (Hex) als Grundfarben des klaren Himmels
//     nebelFarbe, sicht,            // Dunstfarbe in klarer Luft, Nebeldichte (überschreibt den Wert aus wolke)
//     fetzen: 0..1,                 // Dichte der vorbeiziehenden Wolkenfetzen (Standard aus wolke)
//     wolke: 0..1,                  // 0 = klare Luft, 1 = mitten in der Gewitterwolke (Nebel, Sicht ca. 20–40 m)
//     dunkel: 0..1,                 // Dunkelheit der Wolke innen (Gewitterkern)
//     wachsen: 0..1,                // Höhe der Cumulonimbus-Türme (Phase 1: wachsen)
//     deckY: m,                     // Höhe der Wolkendecke unter dem Flugzeug (Standard −420; Ausstieg über die Wolken z. B. −160)
//     regen: 0..1, eis: 0..1, nass: 0..1,   // Regen draußen, Graupel, Tropfen auf der Scheibe (Rinnsale laufen mit regen)
//     turbulenz: 0..1, steig: Grad (6), rollen: Grad (0),
//     kabine: 0..1 (Standard 0,6),  // Kabinenlicht (Flackern macht die Szene, höchstens 3 Wechsel/s)
//     rollo: 0..1 (Standard 0 = offen, unsichtbar),  // Rollo des eigenen Fensters (Anteil zugezogen)
//     elmsfeuer: 0..1,              // bläuliches Glimmen an Winglet und Entladern
//     strobe: true,                 // weißes Doppelblitzlicht an der Flügelspitze (1 s, je 2 Bilder)
//     blitz: {                      // Einschlag; alles außer t0 optional (Standardmodell = typischer Blitz, Lightning Direct Effects Handbook Median):
//       t0: 8, staerke: 1,          //   Videozeit des Einschlags (Countdown-Null), Gesamtstärke
//       ms,                         //   Millisekunden seit Einschlag (die Szene rechnet ihre Zeitlupe selbst: 8–13 s → 0–0,0055 ms, 13–48 s → 0–160 ms …);
//       zeitlupe: 220,              //   ohne ms gilt ms = (t − t0) · 1000 / zeitlupe
//       schlaege: [0,35,70,105],    //   Teilschläge in ms (Gewichte 1 / 0,8 / 0,62 / 0,45)
//       hell,                       //   Leuchtkraft des Kanals 0..1,4 (Standard blitzHelligkeit(ms)); in Echtzeit unbedingt selbst setzen (max. 3 Blitze/s)
//       kanalZ,                     //   z der Kontaktstelle am Rumpf (Flugzeug-Koordinaten; Standard NASE_Z + 130 m/s · ms): der Kanal steht in der Luft, das
//                                   //   Flugzeug fliegt hindurch → er wandert von der Nase (−16) am Fenster (z ≈ 1,5) vorbei zum Heck (21,5)
//       abriss,                     //   0..1 Kanal löst sich vom Flugzeug (Standard: ab kanalZ > HECK_Z − 1)
//       nase, adern, aderPhase, funken, aufleuchten,   // Teilwirkungen 0..1 (Standard aus ms): Leuchten an der Nase, Lichtadern auf der Tragfläche
//                                   //   (aderPhase 0..1,2 = Front von der Flügelwurzel zur Spitze), Funken an den Entladern, Aufleuchten der Wolke
//       form: 1                     //   Seed der Kanalform
//     },
//   })
// Koordinaten (Flugzeug, Meter): Rumpfachse x = 0, y = 0; −z = Flugrichtung (Nase bei z = −16, Heck bei 21,5), −x = links (Fensterseite), +y = oben.
//   Blick aus dem Fenster nach −x: Nase im Bild rechts, Heck links. Eigenes Fenster FENSTER = (−1,93 | 0,24 | 1,5). augeVor(ziel, d) liefert den Augenpunkt
//   d m vor der Scheibe auf der Linie Ziel → Fenstermitte (Fenster bleibt mittig); fertig: AUGE (Sitz, 0,85 m, Rahmen und Wand im Bild), AUGE_NAH (0,38 m),
//   AUGE_VORN (Blick schräg nach vorn, Triebwerk), AUGE_HINTEN (an die Scheibe gedrückt, ca. 40° nach hinten), Ziele ZIELE.{himmel, spitze, aussen, vorn, hinten, wolken}. Flügelspitze bei x ≈ −17, Winglet bis y ≈ 2,3.
// Höhennebel: aktiviereHoehenNebel() nicht oder mit abfall: 0 aufrufen (die Welt setzt szene.fog selbst, Flughöhe ist der Ursprung).
// Kamera: near wird auf 0,03 m gesetzt (Fensterrahmen ist 0,3–0,8 m vor dem Auge).
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash, rauschen } from "./bewegung.js";
import { Himmel, Puffs, Partikel, Glut } from "./stil_lunar_pov.js";

// ------------------------------------------------------------------------------------------------ Konstanten
const R = 1.98;
export const RUMPF_R = R;
export const NASE_Z = -16, HECK_Z = 21.5;
export const GESCHWINDIGKEIT = 130;                 // m/s (ca. 250 Knoten im Steigflug)
export const SCHLAEGE_MS = [0, 35, 70, 105];
const SCHLAG_W = [1, 0.8, 0.62, 0.45];
const FZ = 1.5;                                     // z des eigenen Fensters
const FENSTER_Z = [-3, -2, -1, 0, 1, 2, 3].map((k) => FZ + k * 0.53);
const FY = 0.24;                                    // Fenstermitte (Höhe)
const BI = 0.32, HI = 0.45, RI = 0.11;              // Fensteröffnung innen (Breite z, Höhe y, Eckradius)
const BA = 0.27, HA = 0.37, RA = 0.09;              // Scheibe außen
const X_SCHEIBE = -1.975;
export const FENSTER = [-1.93, FY, FZ];
const FL = { wx: -1.95, sx: -17.0, wy: -1.5, sy: -0.18, lew: -2.2, les: 4.8, tw: 6.4, ts: 1.5 };   // Tragfläche
export const SPITZE = [-17.0, -0.15, 5.5];
/** Ziele für den Blick (Flugzeug-Koordinaten). spitze liegt etwas unter der Flügelspitze, damit Spitze und Winglet im oberen Bilddrittel stehen. */
export const ZIELE = {
  himmel: [-16, 0.6, 5.4], spitze: [-16, -2.6, 4.6], aussen: [-30, -4.2, FZ + 3.2], vorn: [-16, -2.4, FZ - 12], hinten: [-12, -1.4, FZ + 9.5], wolken: [-60, -5, FZ + 6],
};
/** Augenpunkt auf der Linie Ziel → Fenstermitte im Abstand d (m) vor der Scheibe: so steht das Fenster immer mittig im Bild */
export function augeVor(ziel, d) {
  const W = [-1.975, FY, FZ], v = [W[0] - ziel[0], W[1] - ziel[1], W[2] - ziel[2]], l = Math.hypot(...v);
  return [W[0] + (v[0] / l) * d, W[1] + (v[1] / l) * d, W[2] + (v[2] / l) * d];
}
export const AUGE = augeVor(ZIELE.spitze, 0.85);          // Sitz: Fenster mit Rahmen, Wand und Rollo im Bild
export const AUGE_NAH = augeVor(ZIELE.spitze, 0.38);      // nah an der Scheibe: nur noch Laibung als Rahmen
export const AUGE_HINTEN = augeVor(ZIELE.hinten, 0.2);    // an die Scheibe gedrückt, Blick nach hinten (ca. 40°)
export const AUGE_VORN = augeVor(ZIELE.vorn, 0.32);       // Blick schräg nach vorn Richtung Nase und Triebwerk
const C = (h) => new THREE.Color(h);
const D2R = THREE.MathUtils.degToRad;
const bandX = (y) => -1.89 + (y - FY) * 0.10;       // Fensterpaneel (oben leicht nach innen geneigt)

/** Rumpfradius und Mittelhöhe an der Stelle z */
export function rumpf(z) {
  let r = R, yc = 0;
  if (z < -10) r = R * Math.sqrt(clamp(1 - ((z + 10) / 6) ** 2));
  if (z > 9) { const u = clamp((z - 9) / (HECK_Z - 9)); r = lerp(R, 0.32, u ** 1.35); yc = 0.95 * u * u; }
  return { r, yc };
}
/** Punkt auf der Tragfläche: s 0 (Wurzel) … 1 (Spitze), c 0 (Vorderkante) … 1 (Hinterkante), seite +1 oben / −1 unten */
function fluegel(s, c, seite = 1) {
  const x = lerp(FL.wx, FL.sx, s), le = lerp(FL.lew, FL.les, s), tiefe = lerp(FL.tw, FL.ts, s);
  const y0 = lerp(FL.wy, FL.sy, s), dicke = tiefe * lerp(0.13, 0.1, s);
  const f = c <= 0 || c >= 1 ? 0 : 2.6 * Math.sqrt(c) * (1 - c);
  return [x, y0 + (seite > 0 ? 0.62 : -0.38) * dicke * f, le + c * tiefe];
}
const cosAbstand = (v) => (1 - Math.cos(Math.PI * v)) / 2;

/** Leuchtkraft des Blitzkanals (0 … ca. 1,4) zur Zeit ms nach dem Einschlag: Grundleuchten 0,35 + Teilschläge mit Anstieg und Abklingen.
 *  Der erste Schlag steigt physikalisch in 5,5 µs an (in der µs-Zeitlupe sichtbar), spätere in mindestens 0,35 ms (≈ 2–3 Bilder bei 1:220). */
export function blitzHelligkeit(ms, { schlaege = SCHLAEGE_MS, gewichte = SCHLAG_W, anstieg1 = 0.0055, anstiegMin = 0.35, grund = 0.35 } = {}) {
  if (ms < 0) return 0;
  let s = grund * (1 - smoothstep(180, 260, ms));
  schlaege.forEach((ts, k) => {
    const x = ms - ts;
    if (x < 0) return;
    const an = smoothstep(0, k === 0 ? anstieg1 : anstiegMin, x);
    const ab = (0.22 + 0.78 * Math.exp(-x / 1.1)) * Math.exp(-Math.max(0, x - 2) / 7);
    s += (gewichte[k] ?? 0.4) * an * ab;
  });
  return Math.min(1.4, s);
}

// ------------------------------------------------------------------------------------------------ Geometrie-Helfer
function gitter(nu, nv, P, { umkehren = false, uvF = null } = {}) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const u = i / nu, v = j / nv; pos.push(...P(u, v)); uv.push(...(uvF ? uvF(u, v) : [u, v])); }
  const W = nu + 1;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
    if (!umkehren) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals(); return g;
}
/** Abgerundetes Rechteck als Punktliste [u,v] (gegen den Uhrzeigersinn, gleiche Anzahl für jede Größe) */
function rrPunkte(b, h, r, n = 6) {
  const P = [], cx = b / 2 - r, cy = h / 2 - r, E = [[cx, cy, 0], [-cx, cy, 90], [-cx, -cy, 180], [cx, -cy, 270]];
  for (const [x, y, a0] of E) for (let k = 0; k <= n; k++) { const a = D2R(a0 + (90 * k) / n); P.push([x + r * Math.cos(a), y + r * Math.sin(a)]); }
  return P;
}
function rrPfad(pfad, cu, cv, b, h, r) {
  const P = rrPunkte(b, h, r, 8); pfad.moveTo(cu + P[0][0], cv + P[0][1]); for (let i = 1; i < P.length; i++) pfad.lineTo(cu + P[i][0], cv + P[i][1]); pfad.closePath(); return pfad;
}

// ------------------------------------------------------------------------------------------------ Shader
const KABINE_V = /* glsl */ `
attribute vec3 albedo; attribute vec2 licht;
varying vec3 vA; varying vec2 vL; varying vec3 vP;
void main() { vA = albedo; vL = licht; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const KABINE_F = /* glsl */ `
uniform vec3 uKabine, uFenster;
varying vec3 vA; varying vec2 vL; varying vec3 vP;
float h1(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
void main() {
  vec3 q = floor(vP * 900.0);
  float korn = 0.975 + 0.05 * h1(q);                                   // feine Kunststoff-Struktur
  gl_FragColor = vec4(vA * korn * (vL.x * uKabine + vL.y * uFenster), 1.0);
}`;

const SCHEIBE_V = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SCHEIBE_F = /* glsl */ `
uniform float uZeit, uTempo, uRegen, uNass, uVersatz;
uniform vec3 uFarbe, uLicht, uDunst;
uniform vec2 uGroesse; uniform float uRadius;
varying vec2 vUv;
float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sdR(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 p = (vUv - 0.5) * uGroesse;
  float rand = sdR(p, uGroesse * 0.5, uRadius);
  if (rand > 0.0) discard;
  vec3 col = uDunst; float a = 0.04 * uNass + 0.025;
  // stehende Tropfen (Raster 6 mm, Nachbarzellen): wenige, unscharf (Fokus liegt draußen), Linsenwirkung = oben dunkler, unten heller
  vec2 q = p / 0.006 + vec2(uVersatz * 17.0, uVersatz * 5.0);
  vec2 id = floor(q);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = id + vec2(float(i), float(j));
    float hh = h1(c);
    if (hh > uNass * 0.32) continue;
    vec2 m = c + 0.5 + (vec2(h1(c + 3.1), h1(c + 7.7)) - 0.5) * 0.8;
    float r = 0.1 + 0.3 * pow(h1(c + 1.3), 2.0);
    vec2 d = (q - m) / r; d.x *= 0.8 + 0.4 * h1(c + 5.5);
    float L = length(d);
    if (L < 1.0) {
      float k = smoothstep(1.0, 0.45, L);
      float hellU = 0.55 + 0.6 * smoothstep(-0.2, 0.9, -d.y);
      vec3 c3 = uFarbe * hellU * mix(1.0, 0.7, smoothstep(0.55, 1.0, L) * step(0.0, d.y)) + uLicht * 0.6 * pow(max(0.0, 1.0 - length(d - vec2(-0.25, 0.4)) * 3.2), 2.0);
      col = mix(col, c3, k); a = max(a, k * 0.5);
    }
  }
  // Rinnsale: der Fahrtwind treibt Tropfen nach hinten (Bild links) und leicht nach oben
  vec2 dir = normalize(vec2(-1.0, 0.3)), quer = vec2(-dir.y, dir.x);
  float al = dot(p, dir), ac = dot(p, quer);
  float spur = floor(ac / 0.0055); float hl = h1(vec2(spur, uVersatz * 3.0 + 1.0));
  if (hl < uRegen * 0.35) {
    float ac0 = (spur + 0.5) * 0.0055 + (h1(vec2(spur, 9.0)) - 0.5) * 0.003;
    float tempo = 0.18 + 0.5 * h1(vec2(spur, 4.0));
    float kopf = -0.3 + fract(h1(vec2(spur, 2.0)) + uZeit * tempo / 0.6) * 0.6;
    float dx = al - kopf, dq = abs(ac - ac0);
    float schweif = 0.012 + 0.07 * clamp(uTempo, 0.0, 1.0);
    float kk = smoothstep(0.0016, 0.0008, length(vec2(dx, dq)));
    float ss = (dx < 0.0 && dx > -schweif) ? smoothstep(0.0009, 0.0003, dq) * (1.0 + dx / schweif) * 0.8 : 0.0;
    float k = max(kk, ss);
    if (k > 0.0) { vec3 c3 = uFarbe * 0.8 + uLicht * 0.22 * kk; col = mix(col, c3, k); a = max(a, k * 0.55); }
  }
  // Rand der Scheibe etwas dichter (Dichtung, Kratzer)
  a = max(a, smoothstep(-0.006, 0.0, rand) * 0.55);
  if (rand > -0.006) col = mix(col, vec3(0.03), smoothstep(-0.006, 0.0, rand));
  gl_FragColor = vec4(col, a);
}`;

const KANAL_V = /* glsl */ `
attribute float quer; attribute float glanz;
varying float vQ; varying float vG; varying float vD;
void main() { vQ = quer; vG = glanz; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`;
const KANAL_F = /* glsl */ `
uniform vec3 uFarbe; uniform float uDichte, uKern;
varying float vQ; varying float vG; varying float vD;
void main() {
  float q = abs(vQ);
  float a = (exp(-q * q * 70.0) * uKern + exp(-q * 4.5) * 0.32) * vG * exp(-uDichte * vD);
  if (a < 0.002) discard;
  gl_FragColor = vec4(uFarbe * a, 1.0);
}`;
const ADER_V = /* glsl */ `
attribute float pfad; attribute float quer;
varying float vP; varying float vQ; varying float vD;
void main() { vP = pfad; vQ = quer; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`;
const ADER_F = /* glsl */ `
uniform float uPhase, uStaerke, uDichte; uniform vec3 uFarbe;
varying float vP; varying float vQ; varying float vD;
void main() {
  float vor = uPhase - vP;
  if (vor < 0.0 || uStaerke < 0.001) discard;
  float puls = exp(-vor * vor / 0.0025) * 1.3 + 0.05 * exp(-vor * 3.0);
  float q = exp(-vQ * vQ * 5.0);
  gl_FragColor = vec4(uFarbe * uStaerke * puls * q * exp(-uDichte * vD), 1.0);
}`;
const DECK_V = /* glsl */ `
varying vec3 vW;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const DECK_F = /* glsl */ `
uniform vec3 uLicht, uSchatten, uHorizont, uNebel, uSonne;
uniform vec2 uVersatz; uniform float uDichte, uWeite;
varying vec3 vW;
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), u.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n2(p); p = p * 2.03 + vec2(17.1, 9.3); a *= 0.5; } return s; }
float hoehe(vec2 p) { return fbm(p / 1500.0) * 0.62 + fbm(p / 340.0 + 7.0) * 0.38; }
void main() {
  vec2 p = vW.xz - uVersatz;
  vec2 s = normalize(uSonne.xz + vec2(1e-4));
  float h = hoehe(p), h2v = hoehe(p + s * 70.0);
  float licht = clamp(0.55 + (h - h2v) * 10.0, 0.0, 1.0);
  float dichte = smoothstep(0.3, 0.55, h);
  vec3 col = mix(uSchatten, uLicht, clamp(licht * (0.55 + 0.6 * h), 0.0, 1.0));
  col = mix(uSchatten * 0.55, col, dichte);
  float d = length(vW.xz - cameraPosition.xz);
  col = mix(col, uHorizont, 1.0 - exp(-d / uWeite));
  col = mix(col, uNebel, 1.0 - exp(-uDichte * length(vW - cameraPosition)));
  gl_FragColor = vec4(col, 1.0);
}`;

// ------------------------------------------------------------------------------------------------ Texturen
function fluegelTextur() {
  const W = 1024, H = 512, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"), Y = (c) => (1 - c) * H, X = (s) => s * W;
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#C3C7CC"); gr.addColorStop(0.85, "#CDD1D5"); gr.addColorStop(0.92, "#BFC3C8"); gr.addColorStop(1, "#9DA3AA");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {        // Schmutzfahnen in Strömungsrichtung (Sehne)
    const x = hash(i, 201) * W, w = 2 + hash(i, 202) * 12, c0 = 0.1 + hash(i, 203) * 0.5, l = 0.08 + hash(i, 204) * 0.4;
    g.fillStyle = `rgba(70,76,84,${(0.025 + 0.05 * hash(i, 205)).toFixed(3)})`; g.fillRect(x, Y(c0 + l), w, l * H);
  }
  const linie = (s0, c0, s1, c1) => { g.beginPath(); g.moveTo(X(s0), Y(c0)); g.lineTo(X(s1), Y(c1)); g.stroke(); };
  const rechteck = (s0, c0, s1, c1) => { g.strokeRect(X(s0), Y(c1), X(s1) - X(s0), Y(c0) - Y(c1)); };
  g.strokeStyle = "rgba(60,66,74,0.6)"; g.lineWidth = 1.4;
  linie(0, 0.1, 1, 0.1);                                                     // Vorflügel-Kante
  for (let k = 0; k < 6; k++) linie(0.12 + k * 0.15, 0, 0.12 + k * 0.15, 0.1);
  for (const c of [0.14, 0.64]) linie(0, c, 1, c);                           // Holme
  for (let k = 1; k < 16; k++) { const s = k / 16 + (hash(k, 206) - 0.5) * 0.01; linie(s, 0.14, s, 0.64); }
  for (let k = 0; k < 5; k++) rechteck(0.08 + k * 0.11, 0.66, 0.18 + k * 0.11, 0.8);   // Spoiler
  g.fillStyle = "rgba(140,146,153,0.35)"; g.fillRect(X(0.02), Y(1), X(0.65) - X(0.02), Y(0.82) - Y(1)); rechteck(0.02, 0.82, 0.65, 1);   // Klappe
  rechteck(0.68, 0.8, 0.93, 1); linie(0.8, 0.8, 0.8, 1);                     // Querruder
  g.strokeStyle = "rgba(20,20,24,0.85)"; g.lineWidth = 2.2; rechteck(0.012, 0.2, 0.1, 0.62);   // Laufsteg
  g.strokeStyle = "rgba(170,40,30,0.55)"; g.lineWidth = 1.6; linie(0.5, 0.15, 0.5, 0.2);      // kleine rote Markierung
  g.fillStyle = "rgba(55,60,68,0.55)";
  for (const c of [0.14, 0.64, 0.1]) for (let x = 3; x < W; x += 8) g.fillRect(x, Y(c) - 3.5, 1.6, 1.6);   // Nietreihen
  for (let k = 1; k < 16; k++) { const x = X(k / 16) + 3.5; for (let y = Y(0.64); y < Y(0.14); y += 8) g.fillRect(x, y, 1.6, 1.6); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function spiegelTextur() {
  const n = 256, cv = document.createElement("canvas"); cv.width = cv.height = n;
  const g = cv.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, n, n);
  const fleck = (x, y, r, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,236,205,${a})`); gr.addColorStop(1, "rgba(255,236,205,0)"); g.fillStyle = gr; g.fillRect(0, 0, n, n); };
  fleck(190, 40, 60, 0.9); fleck(60, 70, 90, 0.35); fleck(128, 230, 120, 0.25);       // Leselampe, Gegenfenster, Kabinenboden
  g.fillStyle = "rgba(255,240,220,0.18)"; g.fillRect(0, 105, n, 10);                    // Gepäckfachkante
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ------------------------------------------------------------------------------------------------ Blitzkanal (Form fest in der Luft)
function kanalForm(seed) {
  const L = [];   // Liste von Linienzügen {p:[[x,y,z]…], g:[glanz…], d:[weg ab Kontakt…], ast: bool}
  const ablenken = (a, b, tiefe, id, out, minL) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (tiefe <= 0 || len < minL(a, b)) { out.push(b); return; }
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len, (b[2] - a[2]) / len];
    let u = [d[1], -d[0], 0]; const lu = Math.hypot(...u) || 1; u = u.map((x) => x / lu);
    const w = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
    const s1 = (hash(id, seed) - 0.5) * len * 0.32, s2 = (hash(id, seed + 1) - 0.5) * len * 0.24;
    for (let k = 0; k < 3; k++) m[k] += u[k] * s1 + w[k] * s2;
    ablenken(a, m, tiefe - 1, id * 2 + 1, out, minL); ablenken(m, b, tiefe - 1, id * 2 + 2, out, minL);
  };
  const zug = (a, b, tiefe, id, minL) => { const out = [a]; ablenken(a, b, tiefe, id, out, minL); return out; };
  const nahe = (a, b) => { const r = Math.min(Math.hypot(...a), Math.hypot(...b)); return Math.max(0.12, r * 0.035); };
  // Eintritt bei (0,0,0) (lokal, Rumpfseite über dem Fenster), oben weit nach außen zur Wolke;
  // Austritt unter dem Rumpf (UNTEN_LOKAL, Bauch hinter der Tragflächenwurzel) steil nach unten außen zum Boden
  const oben = zug([0, 0, 0], [-240, 135, -10], 12, 1, nahe).reverse();
  const unten = zug(UNTEN_LOKAL, [UNTEN_LOKAL[0] - 150, -320, 16], 11, 7, nahe);
  const weg = oben.map((p) => Math.hypot(...p));
  L.push({ p: oben, g: oben.map((p, i) => 0.92 + 0.16 * hash(i, seed + 9)), d: weg, ast: false });
  L.push({ p: unten, g: unten.map((p, i) => 0.9 + 0.16 * hash(i, seed + 19)), d: unten.map((p) => Math.hypot(p[0] - UNTEN_LOKAL[0], p[1] - UNTEN_LOKAL[1], p[2] - UNTEN_LOKAL[2])), ast: false });
  const stamm = [...oben, ...unten], wegS = [...weg, ...L[1].d];
  // Äste: von Stammpunkten weit draußen nach unten außen
  for (let k = 0; k < 9; k++) {
    const i0 = Math.floor((k < 5 ? 0.08 + 0.1 * k : 0.6 + 0.07 * (k - 5)) * stamm.length), a = stamm[i0];
    const lang = 18 + 70 * hash(k, seed + 20) * (Math.hypot(...a) / 200 + 0.3);
    const b = [a[0] - lang * (0.3 + 0.5 * hash(k, seed + 21)), a[1] - lang * (0.5 + 0.4 * hash(k, seed + 22)), a[2] + (hash(k, seed + 23) - 0.5) * lang * 0.8];
    const p = zug(a, b, 7, 100 + k * 13, () => 1.5);
    L.push({ p, g: p.map((_, j) => 0.6 * (1 - j / p.length) + 0.05), d: p.map(() => wegS[i0]), ast: true });
  }
  return L;
}
const UNTEN_LOKAL = [2.0, -2.75, 0.4];   // Austritt relativ zum Eintritt K (K liegt bei x = −r − 0,24, y = 0,36): unter dem Bauch

// ------------------------------------------------------------------------------------------------ Welt
export class FlugzeugFenster {
  constructor(szene, { schatten = 2048, form = 1 } = {}) {
    this.szene = szene; this.schatten = schatten;
    this.flugzeug = new THREE.Group(); szene.add(this.flugzeug);
    this.post = {};
    this._m = { kam: new THREE.Matrix4(), v: new THREE.Vector3(), v2: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler() };
    this.himmel = new Himmel(szene, { radius: 3000, zenit: "#3E68A6", horizont: "#C4D2E2", unten: "#9AA2AE", dunst: 0.2, sonnenRichtung: [-0.45, 0.45, -0.75],
      sonnenFarbe: "#FFE2B8", sonnenStaerke: 40, sonnenGroesse: 0.014, glanz: 0.8, glanzBreite: 0.14, zirren: 0.12, zirrenFarbe: "#FFF1DF" });
    szene.fog = new THREE.FogExp2("#C9CFD9", 2e-5);
    this._licht(); this._kabine(); this._rumpf(); this._fluegel(); this._leitwerk(); this._wolken(); this._wetter(); this._blitz(form);
  }

  // ---------------------------------------------------------------------------------------------- Licht
  _licht() {
    this.hemi = new THREE.HemisphereLight("#BCC9DB", "#6E727A", 1.0); this.szene.add(this.hemi);
    this.sonne = new THREE.DirectionalLight("#FFE2B8", 3.0); this.szene.add(this.sonne, this.sonne.target);
    if (this.schatten > 0) {
      this.sonne.castShadow = true; this.sonne.shadow.mapSize.set(this.schatten, this.schatten);
      const c = this.sonne.shadow.camera; c.left = -16; c.right = 16; c.top = 16; c.bottom = -16; c.near = 1; c.far = 400;
      this.sonne.shadow.bias = -0.0003; this.sonne.shadow.normalBias = 0.03;
    }
    this.kanalLicht = new THREE.PointLight("#CFE0FF", 0, 0, 2); this.naseLicht = new THREE.PointLight("#D8E6FF", 0, 0, 2);
    this.naseLicht.position.set(-2.5, 0.4, NASE_Z + 1); this.flugzeug.add(this.kanalLicht, this.naseLicht);
  }

  // ---------------------------------------------------------------------------------------------- Kabine
  _kabMat() {
    if (!this.kabU) this.kabU = { uKabine: { value: new THREE.Vector3(0.3, 0.29, 0.27) }, uFenster: { value: new THREE.Vector3(0.6, 0.62, 0.66) } };
    return new THREE.ShaderMaterial({ vertexShader: KABINE_V, fragmentShader: KABINE_F, uniforms: this.kabU, side: THREE.DoubleSide });
  }
  /** Kabinen-Mesh mit eingebackenem Licht: albedo (Hex), ao/Fensterlicht aus Lage und Normale */
  _kab(geo, farbe, { ao = 1, fenster = 1, glanz = null, versatz = [0, 0, 0], skala = [1, 1, 1] } = {}) {
    if (!geo.getAttribute("normal")) geo.computeVertexNormals();
    const p = geo.getAttribute("position"), n = geo.getAttribute("normal"), N = p.count;
    const alb = new Float32Array(N * 3), li = new Float32Array(N * 2), c = C(farbe);
    for (let i = 0; i < N; i++) {
      const x = p.getX(i) * skala[0] + versatz[0], y = p.getY(i) * skala[1] + versatz[1], z = p.getZ(i) * skala[2] + versatz[2];
      let f = 0;
      for (const fz of FENSTER_Z) {
        const dx = -1.96 - x, dy = FY - y, dz = fz - z, d = Math.hypot(dx, dy, dz) || 1e-4;
        const ndl = Math.abs(n.getX(i) * dx + n.getY(i) * dy + n.getZ(i) * dz) / d;
        f += Math.exp(-((d / 0.42) ** 2)) * (0.3 + 0.7 * ndl);
      }
      const a = (0.5 + 0.5 * smoothstep(-1.1, 0.9, y)) * (0.85 + 0.15 * Math.abs(n.getX(i)));
      const g = glanz ? glanz(x, y, z) : 1;
      alb[i * 3] = c.r * g; alb[i * 3 + 1] = c.g * g; alb[i * 3 + 2] = c.b * g;
      li[i * 2] = a * ao; li[i * 2 + 1] = Math.min(1.5, f) * fenster;
    }
    geo.setAttribute("albedo", new THREE.BufferAttribute(alb, 3)); geo.setAttribute("licht", new THREE.BufferAttribute(li, 2));
    const m = new THREE.Mesh(geo, this._kabMat()); this.flugzeug.add(m); return m;
  }
  _kabine() {
    const box = (b, h, d, x, y, z, farbe, o) => { const g = new THREE.BoxGeometry(b, h, d, 4, 4, 4); g.translate(x, y, z); return this._kab(g, farbe, o); };
    // Fensterband (flach, leicht geneigt) mit sieben Öffnungen; Form in (u = −(z − FZ), v = y)
    const form = new THREE.Shape(); form.moveTo(-3.2, -0.12); form.lineTo(3.2, -0.12); form.lineTo(3.2, 0.62); form.lineTo(-3.2, 0.62); form.closePath();
    for (const fz of FENSTER_Z) form.holes.push(rrPfad(new THREE.Path(), -(fz - FZ), FY, BI, HI, RI));
    const band = new THREE.ShapeGeometry(form, 10), bp = band.getAttribute("position");
    for (let i = 0; i < bp.count; i++) { const u = bp.getX(i), v = bp.getY(i); bp.setXYZ(i, bandX(v), v, FZ - u); }
    band.computeVertexNormals();
    this._kab(band, "#E7E5DF", { glanz: (x, y, z) => 0.97 + 0.03 * Math.sin(z * 9) });
    // oberes und unteres Paneel (gewölbt), Boden, Gepäckfach, Armlehne, Vordersitz
    const z0 = FZ - 3.2, z1 = FZ + 3.2;
    this._kab(gitter(24, 10, (u, v) => { const y = lerp(-0.12, -1.05, v); return [bandX(-0.12) + 0.2 * ((-0.12 - y) / 0.93) ** 1.6, y, lerp(z0, z1, u)]; }), "#DEDCD5");
    this._kab(gitter(24, 10, (u, v) => { const y = lerp(0.62, 1.32, v); return [bandX(0.62) + 0.38 * ((y - 0.62) / 0.7) ** 1.5, y, lerp(z0, z1, u)]; }), "#ECEAE4");
    this._kab(gitter(4, 4, (u, v) => [lerp(-1.75, 0.2, u), -1.05, lerp(z0, z1, v)]), "#3B3F48", { fenster: 0.5 });
    box(0.95, 0.42, 6.4, -1.05, 1.55, FZ, "#EEECE6");                                           // Gepäckfach (Unterkante)
    box(0.06, 0.07, 0.95, -1.76, -0.2, FZ + 0.12, "#8D9198");                                    // Armlehne an der Wand
    box(0.5, 0.98, 0.14, -1.47, -0.1, FZ - 0.74, "#2C3549", { glanz: (x, y) => 0.85 + 0.25 * smoothstep(-0.6, 0.38, y) });   // Vordersitz Fenster
    box(0.42, 0.2, 0.15, -1.47, 0.29, FZ - 0.73, "#C8CDD5");                                     // Kopfschoner
    box(0.5, 0.98, 0.14, -0.95, -0.1, FZ - 0.74, "#2C3549");                                     // Mittelsitz
    // Laibungen (Tunnel vom Paneel zur Scheibe), Scheiben, Spiegelung, Rollo
    const innen = rrPunkte(BI, HI, RI, 7), aussen = rrPunkte(BA, HA, RA, 7), n = innen.length;
    this.scheiben = [];
    FENSTER_Z.forEach((fz, k) => {
      const pos = [], idx = [];
      for (let i = 0; i < n; i++) {
        const [ui, vi] = innen[i], [ua, va] = aussen[i];
        pos.push(bandX(FY + vi) - 0.002, FY + vi, fz - ui, X_SCHEIBE - 0.004, FY + va, fz - ua);
      }
      for (let i = 0; i < n; i++) { const j = (i + 1) % n, a = i * 2, b = i * 2 + 1, c = j * 2, d = j * 2 + 1; idx.push(a, c, b, b, c, d); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      this._kab(g, "#D6D4CC", { glanz: (x) => 0.82 + 0.25 * smoothstep(-1.9, -1.97, x) });
      const u = {
        uZeit: this.scheibeU?.uZeit ?? { value: 0 }, uTempo: this.scheibeU?.uTempo ?? { value: 1 }, uRegen: this.scheibeU?.uRegen ?? { value: 0 },
        uNass: this.scheibeU?.uNass ?? { value: 0.3 }, uFarbe: this.scheibeU?.uFarbe ?? { value: new THREE.Vector3(0.8, 0.82, 0.86) },
        uLicht: this.scheibeU?.uLicht ?? { value: new THREE.Vector3(1, 1, 1) }, uDunst: this.scheibeU?.uDunst ?? { value: new THREE.Vector3(0.7, 0.72, 0.76) },
        uGroesse: { value: new THREE.Vector2(BA, HA) }, uRadius: { value: RA }, uVersatz: { value: k * 0.37 + 0.11 },
      };
      if (!this.scheibeU) this.scheibeU = u;
      const sg = new THREE.PlaneGeometry(BA, HA); sg.rotateY(Math.PI / 2);
      const sm = new THREE.Mesh(sg, new THREE.ShaderMaterial({ vertexShader: SCHEIBE_V, fragmentShader: SCHEIBE_F, uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      sm.position.set(X_SCHEIBE + 0.003, FY, fz); sm.renderOrder = 30; this.flugzeug.add(sm); this.scheiben.push(sm);
    });
    const spg = new THREE.PlaneGeometry(BI, HI); spg.rotateY(Math.PI / 2);
    this.spiegelMat = new THREE.MeshBasicMaterial({ map: spiegelTextur(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: new THREE.Color(0.08, 0.08, 0.08) });
    this.spiegel = new THREE.Mesh(spg, this.spiegelMat); this.spiegel.position.set(-1.935, FY, FZ); this.spiegel.renderOrder = 31; this.flugzeug.add(this.spiegel);
    // Rollo: Blende hinter dem Paneel, die Höhe setzt update()
    const rg = new THREE.BoxGeometry(0.008, 1, BI + 0.01, 1, 6, 1); rg.translate(0, -0.5, 0);
    this.rollo = this._kab(rg, "#E2DFD7", { fenster: 1.1, versatz: [-1.915, FY + HI / 2 + 0.01, FZ], skala: [1, 0.1, 1] }); this.rollo.position.set(-1.915, FY + HI / 2 + 0.01, FZ);
    const lg = new THREE.BoxGeometry(0.02, 0.018, BI * 0.5); this.rolloGriff = this._kab(lg, "#B4B1A8", { fenster: 1.1, versatz: [-1.905, FY + 0.15, FZ] }); this.rolloGriff.position.set(-1.905, 0, FZ);
    // Fugen zwischen den Fensterpaneelen und Kante des Gepäckfachs
    for (let k = -3; k <= 2; k++) { const z = FZ + (k + 0.5) * 0.53; const g = new THREE.BoxGeometry(0.004, 0.72, 0.004); g.translate(bandX(FY + 0.01) + 0.002, FY + 0.01, z); this._kab(g, "#9E9C95"); }
    { const g = new THREE.BoxGeometry(0.02, 0.025, 6.4); g.translate(-1.5, 1.33, FZ); this._kab(g, "#B9B7B0"); }
  }

  // ---------------------------------------------------------------------------------------------- Rumpf außen, Triebwerk
  _rumpf() {
    const M = (c, r = 0.45, ex = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...ex });
    const geo = gitter(64, 90, (u, v) => { const th = u * Math.PI * 2, z = lerp(NASE_Z, HECK_Z, v), { r, yc } = rumpf(z); return [r * Math.cos(th), yc + r * Math.sin(th), z]; });
    const haut = new THREE.Mesh(geo, M("#F0F1F3", 0.4)); haut.castShadow = true; haut.receiveShadow = true; this.flugzeug.add(haut);
    const fair = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), M("#DADDE1", 0.5)); fair.scale.set(2.25, 1.0, 8.6); fair.position.set(0, -1.55, 1.2);
    fair.castShadow = true; fair.receiveShadow = true; this.flugzeug.add(fair);
    // Triebwerk unter dem Flügel (Mitte x −5,7), Einlauf vorn
    const prof = []; for (let k = 0; k <= 24; k++) { const u = k / 24; prof.push(new THREE.Vector2(0.92 + 0.13 * Math.sin(Math.min(1, u * 2.4) * Math.PI / 2) - 0.32 * smoothstep(0.45, 1, u), u * 4.4)); }
    const ng = new THREE.LatheGeometry(prof, 40); ng.rotateX(-Math.PI / 2); ng.translate(-5.7, -2.75, -0.1);
    const gondel = new THREE.Mesh(ng, M("#E3E6EA", 0.35, { side: THREE.DoubleSide })); gondel.castShadow = true; gondel.receiveShadow = true; this.flugzeug.add(gondel);
    const lippe = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.06, 10, 40), M("#AEB4BA", 0.25, { metalness: 0.7 })); lippe.position.set(-5.7, -2.75, -4.5); this.flugzeug.add(lippe);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), M("#16181B", 0.6)); fan.rotation.y = Math.PI; fan.position.set(-5.7, -2.75, -4.3); this.flugzeug.add(fan);
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 20), M("#D9DCE0", 0.3)); spinner.rotation.x = -Math.PI / 2; spinner.position.set(-5.7, -2.75, -4.55); this.flugzeug.add(spinner);
    const pf = new THREE.Shape(); pf.moveTo(-3.9, -1.92); pf.lineTo(0.2, -1.92); pf.quadraticCurveTo(0.9, -1.75, 1.1, -1.2); pf.lineTo(-1.6, -1.2); pf.quadraticCurveTo(-3.2, -1.4, -3.9, -1.92);
    const pg = new THREE.ExtrudeGeometry(pf, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 10 }); pg.rotateY(-Math.PI / 2); pg.translate(-5.7 + 0.15, 0, 0);
    const pylon = new THREE.Mesh(pg, M("#D3D6DA", 0.45)); pylon.castShadow = true; pylon.receiveShadow = true; this.flugzeug.add(pylon);
  }

  // ---------------------------------------------------------------------------------------------- Tragfläche, Winglet, Entlader, Lichter
  _fluegel() {
    const piv = [FL.wx, FL.wy, 1.0];
    this.fluegelG = new THREE.Group(); this.fluegelG.position.set(...piv); this.flugzeug.add(this.fluegelG);
    const ab = (p) => [p[0] - piv[0], p[1] - piv[1], p[2] - piv[2]];
    const tex = fluegelTextur();
    const oben = gitter(48, 30, (u, v) => ab(fluegel(u, cosAbstand(v), 1)), { uvF: (u, v) => [u, cosAbstand(v)] });
    const unten = gitter(48, 30, (u, v) => ab(fluegel(u, cosAbstand(v), -1)), { umkehren: true });
    const mo = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.04 });
    const mu = new THREE.MeshStandardMaterial({ color: "#A9AFB6", roughness: 0.55 });
    for (const [g, m] of [[oben, mo], [unten, mu]]) { const me = new THREE.Mesh(g, m); me.castShadow = true; me.receiveShadow = true; this.fluegelG.add(me); }
    // Sharklet: Rückgrat aus der Flügelspitze nach außen und oben
    const N = 24, sp = [[FL.sx, FL.sy]], ang = [0];
    for (let k = 1; k <= N; k++) { const w = k / N, a = (Math.PI / 2) * 0.9 * smoothstep(0, 0.32, w); const [x, y] = sp[k - 1]; sp.push([x - Math.cos(a) * 2.5 / N, y + Math.sin(a) * 2.5 / N]); ang.push(a); }
    const wl = (w, c, seite) => {
      const k = Math.min(N, Math.round(w * N)), [x, y] = sp[k], a = ang[k], tiefe = lerp(FL.ts, 0.45, w ** 0.8), le = FL.les + 1.75 * w ** 1.25;
      const f = c <= 0 || c >= 1 ? 0 : 2.6 * Math.sqrt(c) * (1 - c), d = 0.1 * tiefe * f * (seite > 0 ? 0.6 : 0.4) * (seite > 0 ? 1 : -1);
      return [x + Math.sin(a) * d, y + Math.cos(a) * d, le + c * tiefe];
    };
    this.wlPunkt = wl;
    const mw = new THREE.MeshStandardMaterial({ color: "#E4E7EA", roughness: 0.38 });
    for (const s of [1, -1]) { const me = new THREE.Mesh(gitter(N, 16, (u, v) => ab(wl(u, cosAbstand(v), s)), { umkehren: s < 0 }), mw); me.castShadow = true; me.receiveShadow = true; this.fluegelG.add(me); }
    // Klappenschienen-Verkleidungen
    const mf = new THREE.MeshStandardMaterial({ color: "#B7BDC4", roughness: 0.55 });
    for (const s of [0.17, 0.41, 0.62]) { const p = fluegel(s, 1, -1); const k = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mf); k.scale.set(0.17, 0.2, 1.25); k.position.set(...ab([p[0], p[1] - 0.14, p[2] - 0.2])); k.castShadow = true; this.fluegelG.add(k); }
    // statische Entlader: Hinterkante außen und Winglet-Hinterkante
    this.entlader = [];
    const md = new THREE.MeshStandardMaterial({ color: "#2A2C30", roughness: 0.6 });
    const stab = (p) => { const g = new THREE.CylinderGeometry(0.008, 0.012, 0.26, 6); g.rotateX(Math.PI / 2); const m = new THREE.Mesh(g, md); const q = ab(p); m.position.set(q[0], q[1], q[2] + 0.13); this.fluegelG.add(m); this.entlader.push([q[0], q[1], q[2] + 0.27]); };
    for (const s of [0.74, 0.83, 0.92, 0.985]) stab(fluegel(s, 1, 1));
    for (const w of [0.55, 0.97]) stab(wl(w, 1, 1));
    this.wingletSpitze = ab(wl(1, 0.3, 1));
    // Positionslicht rot (Vorderkante Spitze), Blitzlicht weiß (Hinterkante)
    const lp = ab(fluegel(1, 0.02, 1)), sp2 = ab(fluegel(1, 0.98, 1));
    this.navPos = [lp[0] - 0.08, lp[1] + 0.05, lp[2] - 0.05]; this.strobePos = [sp2[0] - 0.1, sp2[1] + 0.06, sp2[2] + 0.05];
    const lin = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.15, 0.1) })); lin.position.set(...this.navPos); this.fluegelG.add(lin);
    this.strobeLinse = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: "#DDE2E8" })); this.strobeLinse.position.set(...this.strobePos); this.fluegelG.add(this.strobeLinse);
    this.navGlut = new Glut(this.szene, { farbe: "#FF2A1C", staerke: 1, groesse: 0.9 }); this.strobeGlut = new Glut(this.szene, { farbe: "#F4F8FF", staerke: 0, groesse: 3.5 });
    // Lichtadern (Strom auf der Hülle): Pfade im (s,c)-Raum, als flache Bänder auf der Oberseite
    const pos = [], pfad = [], quer = [], idx = [];
    const band = (pts) => {
      const b = pos.length / 3;
      for (let i = 0; i < pts.length; i++) {
        const [s, c] = pts[i], P = fluegel(s, c, 1), Q = fluegel(pts[Math.min(i + 1, pts.length - 1)][0], pts[Math.min(i + 1, pts.length - 1)][1], 1), O = fluegel(pts[Math.max(i - 1, 0)][0], pts[Math.max(i - 1, 0)][1], 1);
        const tx = Q[0] - O[0], tz = Q[2] - O[2], tl = Math.hypot(tx, tz) || 1, nx = -tz / tl * 0.014, nz = tx / tl * 0.014, a = ab(P);
        pos.push(a[0] + nx, a[1] + 0.012, a[2] + nz, a[0] - nx, a[1] + 0.012, a[2] - nz); pfad.push(s, s); quer.push(1, -1);
        if (i > 0) { const j = b + i * 2; idx.push(j - 2, j - 1, j, j - 1, j + 1, j); }
      }
    };
    for (let k = 0; k < 9; k++) {
      let s = 0.02 + 0.03 * hash(k, 301), c = 0.12 + 0.75 * hash(k, 302); const pts = [[s, c]];
      for (let i = 0; i < 160 && s < 0.985; i++) {
        s += 0.006 + 0.006 * hash(i, 303 + k); c = clamp(c + (hash(i, 304 + k) - 0.5) * 0.022 + (k % 3 === 0 ? 0.004 : -0.001), 0.04, 0.97); pts.push([s, c]);
        if (hash(i, 305 + k) < 0.035) { let s2 = s, c2 = c; const ast = [[s2, c2]]; for (let j = 0; j < 12; j++) { s2 += 0.008; c2 = clamp(c2 + (hash(j, 306 + k + i) - 0.35) * 0.06, 0.03, 0.98); ast.push([s2, c2]); } band(ast); }
      }
      band(pts);
    }
    const ag = new THREE.BufferGeometry(); ag.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ag.setAttribute("pfad", new THREE.Float32BufferAttribute(pfad, 1)); ag.setAttribute("quer", new THREE.Float32BufferAttribute(quer, 1)); ag.setIndex(idx);
    this.aderU = { uPhase: { value: 0 }, uStaerke: { value: 0 }, uDichte: { value: 0 }, uFarbe: { value: new THREE.Vector3(0.8, 1.0, 1.8) } };
    this.adern = new THREE.Mesh(ag, new THREE.ShaderMaterial({ vertexShader: ADER_V, fragmentShader: ADER_F, uniforms: this.aderU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    this.adern.frustumCulled = false; this.adern.renderOrder = 12; this.fluegelG.add(this.adern);
  }

  // ---------------------------------------------------------------------------------------------- Leitwerk
  _leitwerk() {
    const M = new THREE.MeshStandardMaterial({ color: "#E9EBEE", roughness: 0.42, side: THREE.DoubleSide });
    const hl = (s, c, seite) => { const x = lerp(-1.05, -6.3, s), le = lerp(17.2, 20.3, s), tiefe = lerp(3.8, 1.4, s), y = 0.62 + 0.4 * s, f = c <= 0 || c >= 1 ? 0 : 2.6 * Math.sqrt(c) * (1 - c); return [x, y + (seite > 0 ? 0.6 : -0.4) * 0.1 * tiefe * f, le + c * tiefe]; };
    for (const s of [1, -1]) { const m = new THREE.Mesh(gitter(16, 12, (u, v) => hl(u, cosAbstand(v), s), { umkehren: s < 0 }), M); m.castShadow = true; this.flugzeug.add(m); }
    const sl = (s, c, seite) => { const y = lerp(1.75, 7.6, s), le = lerp(14.6, 19.6, s), tiefe = lerp(5.6, 2.0, s), f = c <= 0 || c >= 1 ? 0 : 2.6 * Math.sqrt(c) * (1 - c); return [seite * 0.09 * tiefe * f * 0.5, y, le + c * tiefe]; };
    for (const s of [1, -1]) { const m = new THREE.Mesh(gitter(12, 12, (u, v) => sl(u, cosAbstand(v), s)), M); m.castShadow = true; this.flugzeug.add(m); }
  }

  // ---------------------------------------------------------------------------------------------- Wolken: Türme, Fetzen, Wolkenmeer
  _wolken() {
    this.puffs = new Puffs(this.szene, { max: 1500, schatten: 0.5, renderOrder: 8 });
    const T = [
      { x: -2700, z: -2300, R: 950, H: 7600 }, { x: -5200, z: 1200, R: 1350, H: 9200, amboss: 1 }, { x: -1900, z: 4300, R: 800, H: 5600 },
      { x: -9000, z: -6200, R: 1700, H: 10500, amboss: 1 }, { x: 650, z: -1500, R: 640, H: 5200 }, { x: -6500, z: -13000, R: 2000, H: 10000, amboss: 1 },
      { x: -12500, z: 3200, R: 1900, H: 9800, amboss: 1 }, { x: -3800, z: -7600, R: 1100, H: 6800 }, { x: -15000, z: -16000, R: 2600, H: 11000, amboss: 1 },
    ];
    this.turmPuffs = [];
    T.forEach((tw, ti) => {
      const L = 13;
      for (let l = 0; l < L; l++) {
        const hh = l / (L - 1);
        let Rr = tw.R * (0.72 + 0.32 * Math.sin(hh * Math.PI * 0.85)) * (1 - 0.35 * smoothstep(0.82, 1, hh));
        if (tw.amboss) Rr *= 1 + 2.4 * smoothstep(0.78, 1, hh);
        const n = Math.min(7, 3 + Math.floor(Rr / 420));
        for (let k = 0; k < n; k++) {
          const a = ((k + hash(l * 11 + ti, 401)) / n) * Math.PI * 2, rr = Rr * (0.55 + 0.25 * hash(k + l * 7, 402 + ti));
          const dx = Math.cos(a) * rr, dz = Math.sin(a) * rr;
          this.turmPuffs.push({ ti, hh, dx, dz, dy: (hash(k, 403 + l + ti) - 0.5) * tw.H / L * 0.6, r: Rr * (0.42 + 0.24 * hash(k + l, 404 + ti)) * (tw.amboss && hh > 0.85 ? 0.7 : 1),
            n: new THREE.Vector3(dx, 0.35 * Rr * (hh - 0.3), dz).normalize(), bild: Math.floor(hash(k + l * 3, 405 + ti) * 4), dreh: hash(k + l, 406 + ti) * 6.28 });
        }
        // Blumenkohl-Wülste auf der Oberfläche (nur nahe Türme): scharfe, gegliederte Ränder statt Rauch
        if (Math.hypot(tw.x, tw.z) < 9500) for (let k = 0; k < 6; k++) {
          const a = ((k + 0.5 + hash(l * 5 + ti, 409)) / 6) * Math.PI * 2, rr = Rr * (0.86 + 0.1 * hash(k + l * 9, 410 + ti)), dx = Math.cos(a) * rr, dz = Math.sin(a) * rr;
          this.turmPuffs.push({ ti, hh, dx, dz, dy: (hash(k + l, 417 + ti) - 0.5) * tw.H / L * 0.8, r: Rr * (0.24 + 0.14 * hash(k * 3 + l, 418 + ti)),
            n: new THREE.Vector3(dx, 0.4 * Rr * (hh - 0.2), dz).normalize(), bild: (k + l) % 4, dreh: hash(k + l * 2, 419 + ti) * 6.28 });
        }
        if (hh > 0.7 && !tw.amboss) for (let k = 0; k < 2; k++) this.turmPuffs.push({ ti, hh: hh + 0.04, dx: (hash(k, 407 + ti) - 0.5) * Rr, dz: (hash(k, 408 + ti) - 0.5) * Rr, dy: tw.H / L * 0.5, r: Rr * 0.45,
          n: new THREE.Vector3(0, 1, 0), bild: k, dreh: k * 2.1 });
      }
    });
    this.tuerme = T;
    // Wolkenfetzen nah am Flugzeug (ziehen vorbei, links)
    this.fetzen = [];
    for (let i = 0; i < 110; i++) this.fetzen.push({ x: -9 - 200 * hash(i, 411) ** 1.8, y: (hash(i, 412) - 0.55) * 70, z0: hash(i, 413) * 1400, r: 7 + 34 * hash(i, 414), bild: i % 4, dreh: hash(i, 415) * 6.28, h: 0.62 + 0.75 * hash(i, 416) });
    // Wolkenmeer (Shader-Ebene, folgt der Kamera)
    this.deckU = { uLicht: { value: new THREE.Vector3(1, 1, 1) }, uSchatten: { value: new THREE.Vector3(0.4, 0.45, 0.55) }, uHorizont: { value: new THREE.Vector3(0.8, 0.8, 0.85) },
      uNebel: { value: new THREE.Vector3(0.6, 0.6, 0.6) }, uSonne: { value: new THREE.Vector3(-0.5, 0.3, 0.6) }, uVersatz: { value: new THREE.Vector2() }, uDichte: { value: 0 }, uWeite: { value: 14000 } };
    const dg = new THREE.PlaneGeometry(90000, 90000, 1, 1); dg.rotateX(-Math.PI / 2);
    this.deck = new THREE.Mesh(dg, new THREE.ShaderMaterial({ vertexShader: DECK_V, fragmentShader: DECK_F, uniforms: this.deckU, depthWrite: true }));
    this.deck.frustumCulled = false; this.deck.renderOrder = -500; this.szene.add(this.deck);
  }

  // ---------------------------------------------------------------------------------------------- Regen, Graupel, Glimmen
  _wetter() {
    this.regen = new Partikel(this.szene, { art: "regen", anzahl: 2600, box: [16, 14, 60], seed: 5, wind: [0, 0, GESCHWINDIGKEIT], fall: 9, deckkraft: 0.4, farbe: "#C4CCD6" });
    this.tropfen = new Partikel(this.szene, { art: "staub", anzahl: 3200, box: [16, 14, 40], seed: 6, wind: [0, 0, GESCHWINDIGKEIT], fall: 9, wirbel: 0, groesse: 0.014, weich: 1.4, deckkraft: 0.6, farbe: "#DCE4EC" });
    this.graupel = new Partikel(this.szene, { art: "schnee", anzahl: 900, box: [16, 14, 60], seed: 7, wind: [0, 0, GESCHWINDIGKEIT], fall: 6, wirbel: 0, groesse: 0.03, deckkraft: 0.6 });
    this.glimmer = new Puffs(this.szene, { max: 260, additiv: true, nebel: false, schatten: 1, renderOrder: 14 });
    this.kontaktGlut = new Glut(this.szene, { farbe: "#DCE8FF", staerke: 0, groesse: 2.4 });
  }

  // ---------------------------------------------------------------------------------------------- Blitzkanal
  _blitz(form) {
    this.kanalZuege = kanalForm(31 + form * 17);
    let n = 0; for (const z of this.kanalZuege) n += z.p.length;
    this.kanalN = n;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("quer", new THREE.BufferAttribute(new Float32Array(n * 2), 1));
    g.setAttribute("glanz", new THREE.BufferAttribute(new Float32Array(n * 2), 1).setUsage(THREE.DynamicDrawUsage));
    const idx = []; let b = 0; const q = g.getAttribute("quer");
    for (const z of this.kanalZuege) { for (let i = 0; i < z.p.length; i++) { q.setX((b + i) * 2, 1); q.setX((b + i) * 2 + 1, -1); if (i > 0) { const j = (b + i) * 2; idx.push(j - 2, j - 1, j, j - 1, j + 1, j); } } b += z.p.length; }
    g.setIndex(idx);
    this.kanalU = { uFarbe: { value: new THREE.Vector3(5, 5.6, 7.5) }, uDichte: { value: 0 }, uKern: { value: 3.5 } };
    this.kanal = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: KANAL_V, fragmentShader: KANAL_F, uniforms: this.kanalU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    this.kanal.frustumCulled = false; this.kanal.renderOrder = 13; this.kanal.visible = false; this.flugzeug.add(this.kanal);
  }
  _kanalSetzen(kz, hell, abriss, astF, kamLokal) {
    const g = this.kanal.geometry, P = g.getAttribute("position"), G = g.getAttribute("glanz");
    const { r } = rumpf(kz), K = [-r - 0.24, 0.36, kz];
    const T = new THREE.Vector3(), V = new THREE.Vector3(), S = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3();
    let b = 0, naechster = null, nd = 1e9;
    for (const z of this.kanalZuege) {
      const n = z.p.length;
      for (let i = 0; i < n; i++) {
        const p = z.p[i], x = K[0] + p[0], y = K[1] + p[1], zz = K[2] + p[2];
        A.set(...z.p[Math.min(i + 1, n - 1)]); B.set(...z.p[Math.max(i - 1, 0)]); T.subVectors(A, B).normalize();
        V.set(kamLokal.x - x, kamLokal.y - y, kamLokal.z - zz); const dist = V.length(); V.divideScalar(dist || 1);
        S.crossVectors(T, V).normalize().multiplyScalar(0.05 + 0.008 * dist);
        P.setXYZ((b + i) * 2, x + S.x, y + S.y, zz + S.z); P.setXYZ((b + i) * 2 + 1, x - S.x, y - S.y, zz - S.z);
        const wg = z.d[i] + (z.ast ? i * 2 : 0);
        let gl = z.g[i] * hell * (z.ast ? astF : 1) * smoothstep(abriss * 110, abriss * 110 + 14, wg) * (1 - smoothstep(0.75, 1, abriss));
        G.setX((b + i) * 2, gl); G.setX((b + i) * 2 + 1, gl);
        if (!z.ast && dist < nd && Math.abs(p[1]) < 6) { nd = dist; naechster = [x, y, zz]; }
      }
      b += n;
    }
    P.needsUpdate = true; G.needsUpdate = true;
    return { kontakt: [K[0] + 0.2, K[1], K[2]], naechster };
  }

  /** Punkt in Flugzeug-Koordinaten → Weltkoordinaten (nach update) */
  lokalZuWelt(p) { return this.flugzeug.localToWorld(new THREE.Vector3(...p)).toArray(); }

  // ---------------------------------------------------------------------------------------------- je Bild
  update(t, o = {}) {
    const { kamera } = o;
    const tau = o.flugzeit ?? t, tempo = o.tempo ?? 1, hell = o.hell ?? 1, wolke = clamp(o.wolke ?? 0), dunkel = clamp(o.dunkel ?? 0), turb = o.turbulenz ?? 0.2;
    const regen = o.regen ?? 0, nass = o.nass ?? 0.25, kabine = o.kabine ?? 0.6;
    // Fluglage: Steigen, Rollen, Turbulenz (Rauschen der Flugzeit, ≤ 4 Hz)
    const jp = turb * (rauschen(tau * 1.7, 11) * 0.7 + rauschen(tau * 4.1, 12) * 0.25), jr = turb * (rauschen(tau * 1.3, 13) * 1.0 + rauschen(tau * 3.6, 14) * 0.3), jh = turb * rauschen(tau * 2.1, 15) * 0.12;
    const steig = o.steig ?? 6, roll = o.rollen ?? 0;
    this.flugzeug.position.set(0, jh, 0); this.flugzeug.rotation.set(D2R(steig + jp), 0, D2R(roll + jr), "YXZ"); this.flugzeug.updateMatrixWorld(true);
    this.fluegelG.rotation.z = -0.006 - turb * (rauschen(tau * 2.6, 16) * 0.014 + rauschen(tau * 5.3, 17) * 0.004); this.fluegelG.updateMatrixWorld(true);
    // Kamera
    if (o.blick && kamera) {
      const bl = o.blick, mit = bl.mitnehmen ?? 0.8, m = this._m;
      m.kam.compose(m.v.set(0, jh * mit, 0), m.q.setFromEuler(m.e.set(D2R(steig + jp * mit), 0, D2R(roll + jr * mit), "YXZ")), m.v2.set(1, 1, 1));
      const pos = new THREE.Vector3(...bl.pos), q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pos, new THREE.Vector3(...bl.ziel), new THREE.Vector3(0, 1, 0)));
      q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), D2R(bl.yaw || 0))).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), D2R(bl.pitch || 0))).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), D2R(bl.roll || 0)));
      new THREE.Matrix4().multiplyMatrices(m.kam, new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1))).decompose(kamera.position, kamera.quaternion, kamera.scale);
      if (bl.fov) kamera.fov = bl.fov;
      kamera.near = 0.03; kamera.far = 95000; kamera.updateProjectionMatrix(); kamera.updateMatrixWorld(true);
    }
    const kamLokal = this.flugzeug.worldToLocal(kamera.position.clone());

    // Blitz-Zustand
    const B = o.blitz;
    let bh = 0, kz = NASE_Z, abriss = 0, nase = 0, adern = 0, aderPhase = 0, funken = 0, ms = -1, astF = 0, schlagAlter = 1e9, schlagW = 0;
    if (B && t >= (B.t0 ?? 8)) {
      const st = B.staerke ?? 1, sl = B.schlaege ?? SCHLAEGE_MS;
      ms = B.ms ?? ((t - (B.t0 ?? 8)) * 1000) / (B.zeitlupe ?? 220);
      bh = (B.hell ?? blitzHelligkeit(ms, { schlaege: sl })) * st;
      kz = B.kanalZ ?? NASE_Z + (GESCHWINDIGKEIT * ms) / 1000;
      abriss = B.abriss ?? smoothstep(HECK_Z - 1, HECK_Z + 5, kz);
      sl.forEach((ts, k) => { if (ms >= ts && ms - ts < schlagAlter) { schlagAlter = ms - ts; schlagW = SCHLAG_W[k] ?? 0.4; } });
      astF = B.aeste ?? (0.25 + 0.75 * Math.exp(-schlagAlter / 1.5)) * schlagW;
      nase = B.nase ?? (1 - smoothstep(3, 40, ms)) * smoothstep(0, 0.002, ms + 0.0001);
      adern = (B.adern ?? Math.exp(-schlagAlter / 9) * (0.4 + 0.6 * schlagW)) * st;
      aderPhase = B.aderPhase ?? clamp(schlagAlter / 7, 0, 1.25);
      funken = (B.funken ?? 1) * st;
    }
    const auf = B?.aufleuchten ?? clamp((bh - 0.2) * 0.9, 0, 1) * (0.35 + 0.65 * wolke);

    // Sonne, Himmel, Nebel
    const sv = new THREE.Vector3(...(o.sonne || [-0.45, 0.45, -0.75])).normalize(), sf = C(o.sonneFarbe || "#FFE2B8");
    this.sonne.target.position.copy(this.flugzeug.localToWorld(new THREE.Vector3(-8, -1, 3)));
    this.sonne.position.copy(this.sonne.target.position).addScaledVector(sv, 150);
    this.sonne.color.copy(sf); this.sonne.intensity = 2.6 * hell * (1 - 0.94 * wolke);
    const wolkeGrau = new THREE.Color(0.2, 0.225, 0.27).multiplyScalar(hell * (1 - 0.5 * dunkel));
    const blitzFarbe = new THREE.Color(0.5, 0.58, 0.85);
    const nebel = new THREE.Color(o.nebelFarbe || "#C9D0DA").multiplyScalar(hell).lerp(wolkeGrau, smoothstep(0, 0.6, wolke)).add(blitzFarbe.multiplyScalar(auf * 0.6));
    this.szene.fog.color.copy(nebel); this.szene.fog.density = o.sicht ?? lerp(1.6e-5, 0.03, wolke ** 1.6);
    this.hemi.color.set("#BCC9DB").lerp(C("#8E9AAE"), wolke); this.hemi.groundColor.set("#6E727A").lerp(C("#2E333C"), wolke);
    this.hemi.intensity = lerp(1.0, 0.42, wolke) * hell * (1 - 0.4 * dunkel) + auf * 1.8;
    const hz = C(o.horizont || "#C4D2E2"), ze = C(o.zenit || "#3E68A6"), un = C("#9AA2AE"), wm = smoothstep(0, 0.55, wolke);
    this.himmel.setze({ sonnenRichtung: [sv.x, sv.y, sv.z], sonnenFarbe: sf, sonnenStaerke: 40 * (1 - wm), glanz: 0.8 * (1 - wm), helligkeit: hell,
      zenit: ze.lerp(nebel.clone().multiplyScalar(1 / Math.max(hell, 1e-3)), wm), horizont: hz.lerp(nebel.clone().multiplyScalar(1 / Math.max(hell, 1e-3)), wm), unten: un.lerp(nebel.clone().multiplyScalar(1 / Math.max(hell, 1e-3)), wm), zirren: 0.12 * (1 - wm), ...(o.himmel || {}) }).folge(kamera);
    this.himmel.u.zeit.value = tau;

    // Wolkenmeer
    const deckY = o.deckY ?? -420, versatz = GESCHWINDIGKEIT * tau;
    const sl = sf.clone().multiplyScalar(1.12 * hell);
    this.deck.position.set(kamera.position.x, deckY, kamera.position.z);
    const DU = this.deckU; DU.uLicht.value.set(sl.r, sl.g, sl.b); DU.uSchatten.value.set(0.42 * hell, 0.47 * hell, 0.58 * hell);
    const hzl = this.himmel.u.horizont.value; DU.uHorizont.value.set(hzl.r * hell, hzl.g * hell, hzl.b * hell); DU.uNebel.value.set(nebel.r, nebel.g, nebel.b);
    DU.uSonne.value.copy(sv); DU.uVersatz.value.set(0, versatz); DU.uDichte.value = this.szene.fog.density;

    // Türme und Fetzen
    const liste = [], wachsen = o.wachsen ?? 1, lit = sf.clone().multiplyScalar(1.7 * hell), sch = new THREE.Color(0.17, 0.21, 0.31).multiplyScalar(hell), tief = new THREE.Color(0.2, 0.23, 0.3).multiplyScalar(hell), c = new THREE.Color();
    for (const p of this.turmPuffs) {
      const tw = this.tuerme[p.ti], H = tw.H * (0.72 + 0.28 * wachsen), y = deckY + 120 + p.hh * H + p.dy + 9 * tau * p.hh;
      const l = smoothstep(-0.3, 0.5, p.n.dot(sv)) * (0.7 + 0.3 * p.hh);
      c.copy(sch).lerp(lit, l).lerp(tief, (1 - smoothstep(0, 0.22, p.hh)) * 0.7);
      liste.push({ p: [tw.x + p.dx, y, tw.z + p.dz + versatz], r: p.r * (1 + 0.05 * Math.sin(tau * 0.25 + p.dreh)), dreh: p.dreh + tau * 0.004, farbe: [c.r, c.g, c.b], a: 0.97, licht: 1.0, bild: p.bild });
    }
    const fd = o.fetzen ?? lerp(0.35, 1, smoothstep(0.1, 0.8, wolke));
    for (const f of this.fetzen) {
      const z = ((f.z0 + versatz) % 1400) - 700, a = fd * smoothstep(700, 520, Math.abs(z)) * 0.75;
      if (a < 0.01) continue;
      const fc = wolke > 0.5 ? nebel.clone().multiplyScalar(f.h) : c.copy(sch).lerp(lit, 0.75 * f.h);
      liste.push({ p: [f.x, f.y, z], r: f.r, dreh: f.dreh, farbe: [fc.r, fc.g, fc.b], a, licht: 0.6, bild: f.bild });
    }
    this.puffs.setze(liste, kamera);

    // Regen, Tropfen, Graupel (Box draußen links vom Fenster)
    const zr = this.flugzeug.localToWorld(new THREE.Vector3(-11, -1, FZ));
    const zeitlupe = 1 - smoothstep(0.04, 0.3, tempo);
    this.regen.setze(tau, kamera, { zentrum: zr, deckkraft: regen * 0.45 * (1 - zeitlupe) });
    this.regen.u.strich.value = clamp((GESCHWINDIGKEIT * tempo) / 30 * 0.8, 0.05, 3.5);
    this.tropfen.setze(tau, kamera, { zentrum: zr, deckkraft: regen * 0.45 * zeitlupe, farbe: new THREE.Color(0.75, 0.8, 0.88).multiplyScalar(0.3 + 0.25 * hell + auf * 1.2) });
    this.graupel.setze(tau, kamera, { zentrum: zr, deckkraft: (o.eis ?? 0) * 0.6 });

    // Glimmen: Positionslicht, Blitzlicht, Elmsfeuer, Funken, Kontakt
    const W = (p) => this.fluegelG.localToWorld(new THREE.Vector3(...p));
    this.navGlut.setze({ p: W(this.navPos), staerke: 1.2 + 1.6 * wolke, groesse: 0.8 + 0.6 * wolke });
    const sp = ((tau % 1) + 1) % 1, strobe = (o.strobe ?? true) && (sp < 0.067 || (sp > 0.17 && sp < 0.237));
    this.strobeGlut.setze({ p: W(this.strobePos), staerke: strobe ? 4 : 0 }); this.strobeLinse.material.color.setScalar(strobe ? 6 : 0.85);
    const gl = [], elms = o.elmsfeuer ?? 0;
    if (elms > 0.01) {
      [...this.entlader, this.wingletSpitze].forEach((e, i) => {
        for (let k = 0; k < 3; k++) {
          const fl = 0.7 + 0.3 * rauschen(tau * 2.2 + i * 3 + k, 501);
          gl.push({ p: W([e[0] + (hash(k, 502 + i) - 0.5) * 0.06, e[1] + 0.02 * k, e[2] + 0.04 * k + 0.05 * rauschen(tau * 1.5 + k, 503)]).toArray(), r: (0.07 + 0.08 * k) * (0.8 + 0.4 * elms), dreh: tau * 0.5 + k, farbe: [0.55, 0.7, 2.2], a: elms * fl * (1 - 0.25 * k), licht: 0, bild: k });
        }
      });
    }
    if (funken > 0 && ms >= 0) {
      (B.schlaege ?? SCHLAEGE_MS).forEach((ts, k) => {
        const alter = ms - ts; if (alter < 0 || alter > 9) return;
        const w = (SCHLAG_W[k] ?? 0.4) * funken * (1 - alter / 9) ** 2;
        [...this.entlader, this.wingletSpitze].forEach((e, i) => {
          gl.push({ p: W(e).toArray(), r: 0.12 + 0.35 * w, dreh: i, farbe: [2.4, 2.7, 4.2], a: w, licht: 0, bild: i % 4 });
          for (let j = 0; j < 6; j++) {
            const s = 7 * i + j + k * 61, d = [(hash(s, 511) - 0.5) * 0.5, (hash(s, 512) - 0.25) * 0.6, 0.3 + hash(s, 513)];
            const v = 0.02 + 0.03 * hash(s, 514);
            gl.push({ p: W([e[0] + d[0] * v * alter, e[1] + d[1] * v * alter, e[2] + d[2] * v * alter + 0.13 * alter]).toArray(), r: 0.025 + 0.025 * hash(s, 515), dreh: 0, farbe: [4.5, 3.4, 2.2], a: w * (0.6 + 0.4 * hash(s, 516)), licht: 0, bild: j % 4 });
          }
        });
      });
    }
    // Kanal
    if (ms >= 0 && bh > 0.001 && abriss < 0.999) {
      this.kanal.visible = true;
      const { kontakt, naechster } = this._kanalSetzen(kz, bh, abriss, astF, kamLokal);
      this.kanalU.uDichte.value = this.szene.fog.density * 0.35;
      const ka = 1 - smoothstep(0.1, 0.6, abriss);
      const kd = Math.hypot(kontakt[0] - kamLokal.x, kontakt[1] - kamLokal.y, kontakt[2] - kamLokal.z), nahF = smoothstep(0.4, 3.0, kd);
      this.kontaktGlut.setze({ p: this.flugzeug.localToWorld(new THREE.Vector3(...kontakt)), staerke: 3.0 * bh * ka * (0.25 + 0.75 * nahF), groesse: Math.min(1.2 + 1.6 * bh, 0.3 * kd) });
      if (naechster) {                                               // Lichtquelle nie näher als 3 m an der Kamera (sonst brennt der Flügel aus)
        const v = new THREE.Vector3(naechster[0] - kamLokal.x, naechster[1] - kamLokal.y, naechster[2] - kamLokal.z), l = v.length();
        if (l < 3) v.multiplyScalar(3 / Math.max(l, 1e-3)); this.kanalLicht.position.set(kamLokal.x + v.x, kamLokal.y + v.y, kamLokal.z + v.z);
      }
      this.kanalLicht.intensity = 45 * bh * ka;
      gl.push({ p: this.flugzeug.localToWorld(new THREE.Vector3(...kontakt)).toArray(), r: Math.min(0.9, 0.2 * kd), dreh: tau, farbe: [2.2, 2.5, 3.4], a: bh * ka * 0.7 * (0.3 + 0.7 * nahF), licht: 0, bild: 1 });
    } else { this.kanal.visible = false; this.kontaktGlut.setze({ staerke: 0 }); this.kanalLicht.intensity = 0; }
    this.naseLicht.intensity = 900 * nase * bh;
    this.glimmer.setze(gl, kamera);
    // Lichtadern
    this.aderU.uStaerke.value = adern; this.aderU.uPhase.value = aderPhase; this.aderU.uDichte.value = this.szene.fog.density * 0.5;

    // Kabine, Scheiben, Rollo, Spiegelung
    const kl = 0.05 + 0.13 * kabine, au = new THREE.Color().copy(nebel).lerp(new THREE.Color(1, 0.97, 0.92).multiplyScalar(hell), 0.35 * (1 - wolke));
    this.kabU.uKabine.value.set(0.95 * kl, 0.9 * kl, 0.82 * kl);
    this.kabU.uFenster.value.set(au.r * 0.24 + auf * 0.4, au.g * 0.24 + auf * 0.45, au.b * 0.25 + auf * 0.6);
    const S = this.scheibeU; S.uZeit.value = tau; S.uTempo.value = tempo; S.uRegen.value = regen; S.uNass.value = nass;
    S.uFarbe.value.set(au.r * 0.8, au.g * 0.8, au.b * 0.85); S.uDunst.value.set(au.r * 0.6, au.g * 0.62, au.b * 0.66);
    S.uLicht.value.set(0.9 * hell + 2.5 * bh * (ms >= 0 ? 1 : 0), 0.9 * hell + 2.7 * bh * (ms >= 0 ? 1 : 0), 0.95 * hell + 3.2 * bh * (ms >= 0 ? 1 : 0));
    const rollo = clamp(o.rollo ?? 0); this.rollo.visible = this.rolloGriff.visible = rollo > 0.005; this.rollo.scale.y = Math.max(0.001, rollo * HI + 0.012); this.rolloGriff.position.y = FY + HI / 2 + 0.01 - (rollo * HI + 0.012);
    const sp2 = 0.025 + 0.06 * kabine * (1 - 0.4 * hell); this.spiegelMat.color.setRGB(sp2, sp2, sp2);

    this.post = { bloomStaerke: 0.85 + 0.7 * auf, bloomSchwelle: 1.0, vignette: 0.24, saettigung: 1.0 - 0.18 * wolke, kontrast: 1.03, koernung: 0.012 };
    this.zustand = { ms, hell: bh, kanalZ: kz, abriss, aufleuchten: auf };
    return this;
  }
}
