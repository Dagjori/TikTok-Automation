// Welt „Sandbank im Watt, bodennah“ (Account 2 @stelldirvor.pov, Weltenkatalog „Küste / Watt“), Erstbau 11.11.2026
// (Opus-Neubau für „Was passiert, wenn du im Watt stehst und die Flut kommt?“, Skript acc2-2026-11-13-abend).
// NUR für den Baukasten Lunar-POV. Alles prozedural, reine Funktion von t (kein Zustand von Bild zu Bild, Zufall nur über hash()/feste Startwerte).
// Himmel- und Wasser-Shader übernommen (kopiert) aus engine/welt_hallig.js (Tageshimmel mit Sonnenstand, Wolken, Federwolken, Spiegelung),
// Möwen über Voegel aus stil_lunar_pov.js; welt_hallig.js und welt_watt_leuchtturm.js bleiben unverändert.
//
// STANDPUNKT: stehend auf dem Rücken einer Sandbank im Watt vor Cuxhaven, Boden 1,00 m über Niedrigwasser (NW), Auge 1,70 m darüber.
// INHALT: Sandbank mit Rippelmarken (Shader, Normalen + Glanz in den Tälern), Wattwurm-Häufchen (Instanzen, einige wachsen 0,6–3,8 s),
// Wattwurm-Trichter, Muschelschill, Algenfilm, Pfützen mit Himmelsspiegelung (eigener Pegel je Pfütze, laufen über, wenn die Flut sie erreicht),
// Rinnsale (verästelt, füllen sich mit steigendem Pegel von unten nach oben), ein Priel hinter dir (Richtung Festland) mit Strömung, Schaum,
// Treibgut, Wirbeln, Pricken (Birkenstangen) und einer rot-weißen Markierungsstange (20-cm-Ringe = Tiefe), Fußspuren vom Priel zu dir,
// Austernfischer und Möwen am Boden (landen, picken, fliegen auf, sobald das Wasser sie erreicht), Möwenschwärme in der Luft, Seehunde
// (tauchen im Nachspiel auf, Wasserringe), Deichlinie mit Häusern, Bäumen, Kugelbake, Windrädern (drehen) am Horizont, zwei Containerschiffe
// auf der Elbe-Zufahrt (fahren), Neuwerk mit Turm. Himmel: heller Nachmittag → goldene Stunde → Sonnenuntergang → Dämmerung.
//
// ===================================================================================================== API (vollständig)
// Koordinaten: Meter, y oben, Niedrigwasser y = 0, Standpunkt (0, 1.0, 0). Süden = −z, Westen = +x (wie welt_hallig.js).
// Gierwinkel „yaw“ in Grad: 0 = Süden, +90 = Westen, ±180 = Norden. pitch + = nach oben. richtung(yaw, pitch) → [x, y, z].
//   import { WattSandbank, richtung, hoehe, sonnenStand, BLICK, STAND, AUGE_H, PRIEL, STANGE, optischerPegel, stroemUhr } from "../../engine/welt_watt_flut.js";
//   BLICK = { vorn: −10 (Meer, trockenes Watt), priel: 66 (Priel hinter dir, Markierungsstange), festland: 170 }  (yaw in Grad)
//   STAND = { x: 0, y: 1.0, z: 0 } · AUGE_H = 1.7 · PRIEL.u(v), PRIEL.breite(v), PRIEL.uv(x, z) → [u, v], PRIEL.xz(u, v) → [x, z]
//   STANGE = { x, z, boden } (Markierungsstange im Priel, Ringe à 20 cm ab Boden) · hoehe(x, z) → Gelände (m über NW, mit Pfützen und Rinnsalen)
//   sonnenStand(utcStunde) → { hoehe, az } in Grad (Cuxhaven 53,87° N, 8,70° O, 13. November)
//   optischerPegel(anstiegCm) → Wasserspiegel in m über NW (optisch überhöht bis 1 m, darüber 1:1; 101 cm → 1,01 m = Füße)
//   stroemUhr(tempoFn, dauer) → (t) => Strömungsweg in m (Integral der Strömungsgeschwindigkeit, + = landeinwärts; reine Funktion von t)
//
//   const welt = new WattSandbank(szene, { schatten = 2048, pegelVon: (t) => m, haeufchen = 1700 });
//     pegelVon: Wasserspiegel als Funktion von t (für die Fluchtzeiten der Vögel am Boden; einmal vorab abgetastet)
//   welt.update(t, {                                // alles optional; jeder Wert wirkt sofort (kein Gedächtnis)
//     kamera,                                       // THREE.PerspectiveCamera – VOR update setzen (Himmel und Schatten folgen)
//     sonne = { hoehe: 10, az: 220 },               // Grad (aus sonnenStand())
//     bewoelkung = 0.3, zirren = 0.45,              // Haufenwolken (0 … 1) · Federwolken
//     dunkel = 0,                                   // 0 Tag … 1 Nacht (Dämmerung ≈ 0,3–0,5)
//     gold = 0,                                     // 0 … 1 goldene Stunde (warmes Licht, Wasser leuchtet orange)
//     pegel = 0,                                    // Wasserspiegel (m über NW) für Priel, Rinnsale, Watt und Meer
//     strom = 0, stromTempo = 0,                    // Strömungsweg (m, aus stroemUhr) · Geschwindigkeit (m/s, Vorzeichen + = landeinwärts)
//     schaum = 0.2, wirbel = 0,                     // Schaumlinien im Priel (0 … 1) · Wirbel (0 … 1)
//     wind = 0.3, windZeit = t,                     // Kräuseln · Uhr für Wellen
//     seehunde = 0 })                               // 0 … 1 Seehunde im Priel (gestaffeltes Auftauchen)
//   welt.post      → Empfehlung für Buehne-post { belichtung, saettigung, kontrast, tonung, tonungStaerke, bloomStaerke, bloomSchwelle, vignette, koernung }
//   welt.lichter   → { sonne (DirectionalLight, Schatten), hemi }
//   welt.vertices  → Eckpunkte aller Meshes (Instanzen mitgezählt)
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { GLSL_NOISE } from "./welt_feld_wald.js";
import { Voegel } from "./stil_lunar_pov.js";
import { richtung } from "./welt_watt_leuchtturm.js";
export { richtung };

const D2R = Math.PI / 180;
const C = (h) => new THREE.Color(h);
const fr = (x) => x - Math.floor(x);
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 3) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= 0.5; } return s; }
const ss = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };

// ----------------------------------------------------------------------------------------------- Lage
export const BLICK = { vorn: -10, priel: 66, festland: 170 };
export const STAND = { x: 0, y: 1.0, z: 0 }, AUGE_H = 1.7;
const YP = 75;                                         // Richtung zum nächsten Punkt des Priels
const EU = richtung(YP), EV = richtung(YP + 90);       // Priel-Rahmen: u zum Priel, v entlang (+ = landeinwärts, rechts im Prielblick)
const EA = richtung(BLICK.vorn), EB = richtung(BLICK.vorn + 90);
const uvVon = (x, z) => [x * EU[0] + z * EU[2], x * EV[0] + z * EV[2]];
const xzVon = (u, v) => [u * EU[0] + v * EV[0], u * EU[2] + v * EV[2]];
const prielU = (v) => 26 + 0.0026 * v * v + 2.2 * (Math.sin(0.045 * v + 0.7) - Math.sin(0.7));
const prielUd = (v) => 0.0052 * v + 0.099 * Math.cos(0.045 * v + 0.7);
const prielB = (v) => 15 + 6 * ss(0, 300, Math.abs(v)) + 2.5 * Math.sin(0.05 * v + 1.3);
export const PRIEL = { u: prielU, breite: prielB, uv: uvVon, xz: xzVon };
const KAMM = [EA[0] * 4.2 + EB[0] * 0.8, EA[2] * 4.2 + EB[2] * 0.8];   // Kamm der Sandbank 4,2 m vor dir (letzte Insel, reicht bis an deine Füße)
const DEICH_R = (yaw) => 4300 + 260 * Math.sin(yaw * 0.05 * D2R * 20) + 120 * Math.sin(yaw * D2R * 3.1 + 1);

/** optisch überhöhter Wasserspiegel (m über NW) aus dem Anstieg in cm (Rechnung): bis 101 cm sichtbar schneller, danach 1:1 */
export const optischerPegel = (a) => (a <= 101 ? (a / 100) * (1.6 - 0.6 * a / 101) : 1.01 + (a - 101) / 100);
/** Strömungsweg (m) als Integral einer Geschwindigkeit (m/s); einmal tabelliert, reine Funktion von t */
export function stroemUhr(tempo, dauer = 80) {
  const N = Math.ceil(dauer * 120), T = new Float64Array(N + 2);
  for (let i = 1; i <= N + 1; i++) T[i] = T[i - 1] + tempo((i - 0.5) / 120) / 120;
  return (t) => { const x = clamp(t, 0, dauer) * 120, i = Math.floor(x); return T[i] + (T[Math.min(i + 1, N + 1)] - T[i]) * (x - i); };
}

// Gelände ohne Pfützen (m über NW)
function basisH(x, z, u, v) {
  const r = Math.hypot(x, z), a = x * EA[0] + z * EA[2];
  const vorn = a / Math.max(r, 1), ff = ss(-0.15, 0.55, vorn);
  const n = fbm(x * 0.021 + 3, z * 0.021 - 2), n2 = vn(x * 0.11, z * 0.11);
  const hinten = 0.15 + 0.12 * (n - 0.5) * 2 + 0.05 * (n2 - 0.5);
  const vornH = 0.43 + 0.06 * (n - 0.5) * 2 + 0.025 * (n2 - 0.5);
  let h = lerp(hinten, vornH, ff);
  h -= 1.6 * ss(620, 1200, a) * ss(-0.2, 0.3, vorn);                     // Abfall zum Meer
  // landeinwärts hinter dem Priel: Watt steigt zur Salzwiese, hinter dem Deich Land
  const yaw = Math.atan2(x, -z) / D2R, dy = ((yaw - 145 + 540) % 360) - 180, land = 1 - ss(85, 110, Math.abs(dy));
  if (land > 0 && r > 300) { const R = DEICH_R(yaw); h = lerp(h, h + 1.1 * ss(600, R - 80, r) + 1.2 * ss(R - 60, R + 40, r), land); }
  return h;
}
function sandbank(x, z, h) {
  const a = x * EA[0] + z * EA[2], b = x * EB[0] + z * EB[2];
  const ae = a > 0 ? a * 0.55 : a * 1.3, be = b > 0 ? b * 3.0 : b * 1.25;
  const re = Math.hypot(ae, be) * (1 + 0.36 * (fbm(x * 0.03 + 11, z * 0.03 + 5) - 0.5));
  const form = Math.pow(1 - ss(0, 55, re), 1.3);
  let y = h + (STAND.y - h) * form;
  const dk = Math.hypot(x - KAMM[0], z - KAMM[1]);
  y += 0.12 * (1 - ss(0, 4.2, dk * (1 + 0.25 * (vn(x * 0.9 + 4, z * 0.9) - 0.5))));
  return y;
}
function rinnsale(x, z, u, v, y, uBank) {
  if (u < 3 || u > uBank + 1.5 || Math.abs(v) > 170) return y;
  const q1 = v + 3.2 * Math.sin(u * 0.23 + 1.3) + 1.5 * Math.sin(u * 0.61 + 0.2), S1 = 8.5, d1 = Math.abs(fr(q1 / S1) - 0.5) * S1;
  const q2 = v * 0.82 + u * 0.42 + 2.1 * Math.sin(u * 0.37 + 2.0), S2 = 12, d2 = Math.abs(fr(q2 / S2) - 0.5) * S2;
  const gate = ss(0.38, 0.55, vn(x * 0.05 + 7, z * 0.05 - 3));
  const k = clamp((u - 3) / Math.max(uBank - 3, 1)), wr = 0.32 + 0.95 * k, dep = 0.05 + 0.1 * k;
  let c = 0;
  if (d1 < wr * 1.5) c = Math.max(c, 1 - (d1 / (wr * 1.5)) ** 2);
  if (d2 < wr * 1.2) c = Math.max(c, gate * (1 - (d2 / (wr * 1.2)) ** 2));
  return y - dep * c * ss(3, 7, u) * (1 - ss(-0.5, 1.5, u - uBank));
}
export function hoeheRoh(x, z) {
  const [u, v] = uvVon(x, z);
  let y = basisH(x, z, u, v);
  const hb = y;
  y = sandbank(x, z, y);
  const uc = prielU(v), w = prielB(v) / 2, sl = Math.sqrt(1 + prielUd(v) ** 2);
  y = rinnsale(x, z, u, v, y, uc - w);
  const d = Math.abs((u - uc) / sl);
  if (d < w + 7) {
    const py = d < w ? -0.22 + 0.34 * (d / w) ** 2 + 0.03 * (vn(x * 0.3, z * 0.3) - 0.5) : 0.12 + (Math.max(hb, 0.12) - 0.12) * ss(0, 7, d - w);
    y = Math.min(y, py);
  }
  return y;
}
// Pfützen (fest, Startwert 4711): Mulden auf der Sandbank, eigener Wasserspiegel knapp unter dem Rand
const PFUETZEN = (() => {
  const L = [];
  for (let i = 0; L.length < 30 && i < 400; i++) {
    const vorn = i % 4 !== 3;
    const yaw = vorn ? lerp(-62, 42, hash(i, 4711)) : lerp(40, 120, hash(i, 4712)), r = vorn ? lerp(4.5, 34, hash(i, 4713) ** 1.3) : lerp(3.5, 9, hash(i, 4713));
    const d = richtung(yaw), x = d[0] * r, z = d[2] * r, h = hoeheRoh(x, z);
    if (h < 0.5 || h > 1.0) continue;
    const rp = lerp(0.45, vorn ? (r < 9 ? 0.95 : 2.4) : 0.9, hash(i, 4714)), sx = lerp(0.7, 1.5, hash(i, 4715)), rot = hash(i, 4716) * Math.PI;
    if (L.some((p) => Math.hypot(p.x - x, p.z - z) < p.rp + rp + 0.6)) continue;
    L.push({ x, z, rp, sx, rot, dep: 0.03 + 0.02 * hash(i, 4717), lvl: h - 0.006 });
  }
  return L;
})();
const HB = 256, NG = 2048, TX = (2 * HB) / NG;          // Nah-Raster ±256 m, 0,25 m je Zelle
let GRID = null;
function backe() {
  if (GRID) return GRID;
  const H = new Float32Array(NG * NG), P = new Float32Array(NG * NG).fill(-10), M = new Float32Array(NG * NG);
  for (let j = 0; j < NG; j++) { const z = -HB + (j + 0.5) * TX; for (let i = 0; i < NG; i++) { const x = -HB + (i + 0.5) * TX, k = j * NG + i;
    H[k] = hoeheRoh(x, z);
    const [u, v] = uvVon(x, z), d = Math.abs((u - prielU(v)) / Math.sqrt(1 + prielUd(v) ** 2)), w = prielB(v) / 2;
    M[k] = 1 - ss(w - 3, w + 2.5, d);
  } }
  for (const p of PFUETZEN) {
    const R = p.rp * p.sx + 0.5, i0 = Math.max(0, Math.floor((p.x - R + HB) / TX)), i1 = Math.min(NG - 1, Math.ceil((p.x + R + HB) / TX));
    const j0 = Math.max(0, Math.floor((p.z - R + HB) / TX)), j1 = Math.min(NG - 1, Math.ceil((p.z + R + HB) / TX));
    const c = Math.cos(p.rot), s = Math.sin(p.rot);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = -HB + (i + 0.5) * TX - p.x, z = -HB + (j + 0.5) * TX - p.z, qx = (x * c + z * s) / p.sx, qz = -x * s + z * c;
      const q = Math.hypot(qx, qz) / p.rp + 0.18 * (vn(x * 2 + p.x, z * 2) - 0.5);
      if (q < 1.25) { const k = j * NG + i; H[k] -= p.dep * Math.max(0, 1 - q * q) + 0.004 * (1 - ss(1, 1.25, q)); if (q < 1.08) P[k] = Math.max(P[k], p.lvl); }
    }
  }
  GRID = { H, P, M };
  return GRID;
}
function rasterH(x, z) {
  const g = backe(), fx = (x + HB) / TX - 0.5, fz = (z + HB) / TX - 0.5;
  if (fx < 0 || fz < 0 || fx > NG - 1.001 || fz > NG - 1.001) return null;
  const i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j, k = j * NG + i, H = g.H;
  return lerp(lerp(H[k], H[k + 1], a), lerp(H[k + NG], H[k + NG + 1], a), b);
}
/** Geländehöhe (m über Niedrigwasser) inkl. Pfützenmulden und Rinnsalen */
export function hoehe(x, z) { const r = rasterH(x, z); return r == null ? hoeheRoh(x, z) : r; }
const sb = (() => { const [x, z] = xzVon(prielU(-3.8) - 2.3, -3.8); return { x, z }; })();
export const STANGE = { x: sb.x, z: sb.z, get boden() { return hoehe(sb.x, sb.z); } };

/** Sonnenstand vor Cuxhaven (53,87° N, 8,70° O) am 13. November (Deklination −17,9°, Zeitgleichung +15,8 min) */
export function sonnenStand(utc) {
  const phi = 53.87 * D2R, dek = -17.9 * D2R, solar = utc + 8.70 / 15 + 15.8 / 60, H = (solar - 12) * 15 * D2R;
  const sh = Math.sin(phi) * Math.sin(dek) + Math.cos(phi) * Math.cos(dek) * Math.cos(H), h = Math.asin(sh);
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dek) * Math.cos(phi));
  return { hoehe: h / D2R, az: ((az / D2R + 180) % 360 + 360) % 360 };
}

// ----------------------------------------------------------------------------------------------- Himmel (Kopie aus welt_hallig.js, eine Funktion für Kuppel, Wasser, Watt)
const GLSL_HIMMEL = /* glsl */ `
uniform vec3 hSonne, hZenit, hHorizont, hUnten, hGlut, hSonnenF, hWolkeHell, hWolkeDunkel, hDecke, hZirrF, hSaumF;
uniform float hBew, hZirr, hSaum, hSonneSicht;
uniform vec2 hWOff, hZOff, hWind;
float wolkenDecke(vec3 d, out vec3 wc) {
  float h = d.y, hp = max(h, 0.0);
  vec3 s = normalize(hSonne);
  vec2 dh = normalize(d.xz + vec2(1e-5)), sh = normalize(s.xz + vec2(1e-5));
  float azS = dot(dh, sh);
  vec2 q = d.xz / (hp + 0.045) * 0.55 + hWOff;
  float lod = smoothstep(0.0, 0.2, hp);
  float n = nF(q * 0.85) * 0.72 + nF(q * 2.9 + 7.0) * 0.28 * (0.35 + 0.65 * lod);
  float sw = 0.92 - 0.9 * hBew;
  float c = smoothstep(sw - 0.07, sw + 0.12, n + (1.0 - lod) * 0.22 * hBew);
  c = max(c, smoothstep(0.84, 1.0, hBew));
  vec2 qs = q + sh * 0.1;
  float n2 = nF(qs * 0.85) * 0.72 + nF(qs * 2.9 + 7.0) * 0.28 * (0.35 + 0.65 * lod);
  float licht = clamp(0.55 + (n - n2) * 3.5 - (n - sw) * 0.9, 0.0, 1.0);
  wc = mix(hWolkeDunkel, hWolkeHell, licht);
  wc += hGlut * 0.55 * exp((azS - 1.0) * 2.2) * (1.0 - c * 0.5) * exp(-hp / 0.25);
  float deck = smoothstep(0.62, 1.0, hBew);
  float roll = nF(q * 0.42 + vec2(3.0, 1.0)) * 0.7 + nN(vec2(dot(q, hWind) * 0.4, dot(q, vec2(-hWind.y, hWind.x)) * 2.4)) * 0.3;
  vec3 dc = hDecke * (0.62 + 0.62 * roll) * (0.82 + 0.3 * smoothstep(0.0, 0.6, hp));
  wc = mix(wc, dc, deck);
  float saum = hSaum * exp((azS - 1.0) * 2.4);
  wc += hSaumF * saum * (exp(-hp / 0.06) * 1.3 + 0.25 * exp(-hp / 0.25)) * (0.6 + 0.6 * roll);
  return c * smoothstep(-0.03, 0.01, h);
}
vec3 himmel(vec3 d) {
  float h = d.y, hp = max(h, 0.0);
  vec3 s = normalize(hSonne);
  float cs = dot(d, s);
  vec2 dh = normalize(d.xz + vec2(1e-5)), sh = normalize(s.xz + vec2(1e-5));
  float azS = dot(dh, sh);
  vec3 col = mix(hHorizont, hZenit, 1.0 - exp(-hp / 0.13));
  col += hGlut * (exp((azS - 1.0) * 2.0) * exp(-hp / 0.09) + 0.28 * exp((azS - 1.0) * 0.7) * exp(-hp / 0.32));
  col += hSonnenF * exp((cs - 1.0) * 70.0) * 0.55 * hSonneSicht;
  if (hZirr > 0.001 && h > 0.0) {
    vec2 q = d.xz / (hp + 0.09);
    vec2 r = vec2(dot(q, hWind), dot(q, vec2(-hWind.y, hWind.x)));
    float f = nF(vec2(r.x * 0.32, r.y * 2.3) + hZOff) * 0.8 + nN(vec2(r.x * 1.4, r.y * 7.0) + hZOff * 2.0) * 0.2;
    float ci = smoothstep(0.52, 0.84, f) * smoothstep(0.03, 0.22, h) * hZirr;
    col = mix(col, hZirrF + hGlut * 0.5 * exp((azS - 1.0) * 1.6), ci * 0.8);
  }
  vec3 wc = vec3(0.0); float c = 0.0;
  if (hBew > 0.001) c = wolkenDecke(d, wc);
  if (c > 0.0) col = mix(col, wc, c);
  float sd = smoothstep(0.99990, 0.99996, cs);
  col += hSonnenF * sd * 26.0 * (1.0 - c) * hSonneSicht;
  col = mix(col, hUnten, smoothstep(0.0, 0.08, -h));
  return col;
}`;
const HIMMEL_V = /* glsl */ `
varying vec3 vDir;
void main() { vDir = (modelMatrix * vec4(position, 0.0)).xyz; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const HIMMEL_F = /* glsl */ `
varying vec3 vDir;
${GLSL_NOISE}
${GLSL_HIMMEL}
void main() { gl_FragColor = vec4(himmel(normalize(vDir)), 1.0); }`;

// Priel-Geometrie in GLSL (gleich wie oben)
const GLSL_PRIEL = /* glsl */ `
uniform vec2 eU, eV;
float prielU(float v) { return 26.0 + 0.0026 * v * v + 2.2 * (sin(0.045 * v + 0.7) - sin(0.7)); }
float prielUd(float v) { return 0.0052 * v + 0.099 * cos(0.045 * v + 0.7); }
float prielB(float v) { return 15.0 + 6.0 * smoothstep(0.0, 300.0, abs(v)) + 2.5 * sin(0.05 * v + 1.3); }`;

// ----------------------------------------------------------------------------------------------- Wasser (Priel, Rinnsale, Watt, Meer): durchsichtig im Flachen
const WASSER_V = /* glsl */ `
varying vec3 vW;
#include <common>
#include <fog_pars_vertex>
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const WASSER_F = /* glsl */ `
uniform float wZeit, wWind, wStrom, wStromT, wSchaum, wWirbel, wPegel, wGold, wDunkel;
uniform vec3 wTief, wFlach, wSchaumF, wLicht;
uniform sampler2D tH; uniform vec3 uBox;
varying vec3 vW;
#include <common>
#include <fog_pars_fragment>
${GLSL_NOISE}
${GLSL_HIMMEL}
${GLSL_PRIEL}
float wkr(vec2 p, vec2 fl, float pm) {
  vec2 q = vec2(-fl.y, fl.x);
  float al = dot(p, fl) - wStrom, qu = dot(p, q);
  float stromW = (nN(vec2(al * 0.55, qu * 1.6)) + 0.5 * nN(vec2(al * 1.6, qu * 3.2) + 5.0)) * pm * (0.35 + 0.65 * min(abs(wStromT), 1.5));
  float windW = nN(p * 1.3 + vec2(wZeit * 0.7, -wZeit * 0.45)) + 0.5 * nN(p * 3.1 - vec2(wZeit * 1.1, wZeit * 0.6)) + 0.25 * nN(p * 7.0 + wZeit);
  return stromW * 0.9 + windW * (0.4 + wWind);
}
void main() {
  vec3 Vv = cameraPosition - vW; float dist = length(Vv); vec3 V = Vv / dist;
  vec2 p = vW.xz;
  vec2 uvT = (p - uBox.xy) * uBox.z;
  float inB = step(0.002, uvT.x) * step(0.002, uvT.y) * step(uvT.x, 0.998) * step(uvT.y, 0.998);
  vec4 T = texture2D(tH, clamp(uvT, 0.0, 1.0));
  float hB = mix(-3.0, T.r, inB), pm = T.b * inB;
  float tiefe = wPegel - hB;
  if (tiefe < -0.02) discard;
  float u = dot(p, eU), v = dot(p, eV);
  vec2 fl = normalize(eV + eU * prielUd(v));
  if (wStromT < 0.0) fl = -fl;
  // Wirbel: drehen das Schaummuster um Kerne, die mit der Strömung ziehen
  vec2 pw = p;
  if (wWirbel > 0.001 && pm > 0.01) {
    float vc = floor((v - wStrom) / 23.0) * 23.0 + 11.5 + wStrom;
    float uc = prielU(vc) + (nH(vec2(floor((v - wStrom) / 23.0), 3.0)) - 0.5) * 6.0;
    vec2 cw = eU * uc + eV * vc;
    vec2 dd = p - cw; float r2 = dot(dd, dd);
    float ang = wWirbel * (0.9 + 0.5 * sin(wZeit * 0.3)) * exp(-r2 / 30.0) * (0.6 + 0.4 * nN(dd * 0.5));
    float cA = cos(ang), sA = sin(ang);
    pw = cw + vec2(cA * dd.x - sA * dd.y, sA * dd.x + cA * dd.y);
  }
  float e = 0.05 + dist * 0.0015;
  float h0 = 0.0, hx = 0.0, hz = 0.0;
  if (dist < 2500.0) { h0 = wkr(pw, fl, pm); hx = wkr(pw + vec2(e, 0.0), fl, pm); hz = wkr(pw + vec2(0.0, e), fl, pm); }
  float amp = 0.02 + 0.045 * wWind + 0.025 * pm * min(abs(wStromT), 1.5);
  vec3 n = normalize(vec3(-(hx - h0) / e * amp, 1.0, -(hz - h0) / e * amp));
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), smoothstep(80.0, 3000.0, dist) * 0.85));
  vec3 r = reflect(-V, n); r.y = max(abs(r.y), 0.01);
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
  vec3 refl = himmel(r);
  // Wasserkörper: flach sandig-grau, tief trüb grünbraun; golden im Abendlicht
  vec3 koerper = mix(wFlach, wTief, smoothstep(0.02, 0.7, tiefe)) * wLicht;
  koerper += vec3(1.0, 0.45, 0.12) * wGold * 0.08 * (1.0 - wDunkel);
  vec3 col = mix(koerper, refl * 0.92, clamp(fres * 0.82, 0.0, 1.0));
  vec3 s = normalize(hSonne);
  float rs = max(dot(r, s), 0.0);
  col += hSonnenF * (pow(rs, 1400.0) * 40.0 + pow(rs, 90.0) * 0.9 + pow(rs, 12.0) * 0.12 * wGold) * hSonneSicht * (1.0 - hBew * 0.6);
  // Schaum: Streifen entlang der Strömung, Treibschaum-Flecken, Saum an der Wasserlinie
  vec2 q = vec2(-fl.y, fl.x);
  float al = dot(pw, fl) - wStrom, qu = dot(pw, q);
  float streif = smoothstep(0.64, 0.82, nN(vec2(al * 0.07, qu * 1.1 + 3.0)) * 0.75 + 0.35 * nN(vec2(al * 0.35, qu * 3.8)));
  float flecken = smoothstep(0.68, 0.8, nF(vec2(al, qu) * 0.32 + 9.0)) * (0.6 + 0.4 * nN(vec2(al, qu) * 2.5));
  float schaum = (streif * wSchaum + flecken * (0.25 + 0.75 * wSchaum)) * pm;
  float saum = (1.0 - smoothstep(0.0, 0.035 + 0.03 * nN(p * 1.3), tiefe)) * smoothstep(0.3, 0.7, nN(p * 0.8 + vec2(wZeit * 0.15, 0.0)) + 0.2) * inB;
  schaum = clamp(schaum + saum * 0.75, 0.0, 1.0) * (1.0 - smoothstep(120.0, 600.0, dist));
  col = mix(col, wSchaumF * wLicht * 1.25, schaum * 0.85);
  if (dist > 2500.0) { streif = 0.0; flecken = 0.0; }
  float alpha = mix(1.0, clamp(smoothstep(0.0, 0.28, tiefe) * 0.82 + 0.1 + fres * 0.55 + schaum, 0.0, 1.0), inB);
  col = min(col, vec3(48.0)); if (any(isnan(col))) col = vec3(0.0); if (isnan(alpha)) alpha = 1.0;
  gl_FragColor = vec4(col, alpha);
#include <fog_fragment>
}`;

// ----------------------------------------------------------------------------------------------- Watt-Boden (Sand, Schlick, Rippel, Pfützen, Spiegelung)
function bodenMaterial(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.9, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vW2; varying vec3 vN2;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvW2 = (modelMatrix * vec4(transformed, 1.0)).xyz; vN2 = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vW2; varying vec3 vN2;
uniform float uPegel, uZeit, uGold, uDunkel;
uniform sampler2D tH; uniform vec3 uBox; uniform vec4 uPfA[30], uPfB[30];
${GLSL_NOISE}
${GLSL_HIMMEL}
vec3 gNw; float gSpec, gPf, gNass;`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  {
  vec2 p = vW2.xz; float y = vW2.y;
  float fw = max(fwidth(p.x), fwidth(p.y));
  float fein = 1.0 - smoothstep(0.04, 0.35, fw), mittel = 1.0 - smoothstep(0.3, 3.0, fw);
  vec2 uvT = (p - uBox.xy) * uBox.z;
  float inB = step(0.002, uvT.x) * step(0.002, uvT.y) * step(uvT.x, 0.998) * step(uvT.y, 0.998);
  float n1 = nF(p * 0.05), n2 = mix(0.5, nN(p * 0.7), mittel), n3 = mix(0.5, nN(p * 4.3), fein);
  // Rippelmarken: Kämme quer zur Strömung, gewellt, Richtung wechselt in Feldern
  float wink = 0.9 + 1.4 * (nN(p * 0.012 + 4.0) - 0.5);
  vec2 kd = vec2(cos(wink), sin(wink));
  float lam = 0.075 + 0.035 * nN(p * 0.04 + 2.0);
  float ph = dot(p, kd) / lam + 1.7 * nN(p * 0.5) + 0.45 * nN(p * 1.9 + 3.0);
  float fwp = fwidth(ph), rf = 1.0 - smoothstep(0.25, 0.7, fwp);
  float sr = sin(6.2832 * ph), rip = sr + 0.3 * sin(12.566 * ph + 0.6);
  float ramp = (0.45 + 0.55 * smoothstep(0.35, 0.7, nN(p * 0.09 + 6.0))) * (1.0 - 0.6 * smoothstep(0.92, 1.1, y)) * rf;
  vec2 g = kd * (6.2832 / lam) * (cos(6.2832 * ph) + 0.6 * cos(12.566 * ph + 0.6)) * 0.0045 * ramp;
  // Nässe: tiefes Watt immer nass, knapp über dem Wasser glänzend, Rippeltäler mit Wasserfilm
  float nassB = 1.0 - smoothstep(0.55, 0.98, y + 0.08 * (n1 - 0.5));
  float amWasser = 1.0 - smoothstep(uPegel + 0.005, uPegel + 0.07, y);
  float nass = clamp(max(nassB * 0.85, amWasser), 0.0, 1.0);
  float film = nass * smoothstep(0.1, 0.9, -rip) * ramp * 0.9;
  // Farben (linear): trockener Sand oben hell, nasses Watt grau-braun, Schlick am Priel dunkel
  vec3 trocken = mix(vec3(0.42, 0.36, 0.26), vec3(0.52, 0.45, 0.33), n2) * (0.9 + 0.14 * n3);
  vec3 feucht = mix(vec3(0.17, 0.155, 0.125), vec3(0.23, 0.205, 0.165), n2) * (0.9 + 0.14 * n3);
  vec3 schlick = mix(vec3(0.085, 0.08, 0.07), vec3(0.13, 0.12, 0.1), n2);
  vec3 c = mix(trocken, feucht, smoothstep(0.15, 0.75, nass));
  c = mix(c, schlick, (1.0 - smoothstep(-0.05, 0.22, y)) * 0.8);
  c *= 1.0 + 0.16 * rip * ramp * (1.0 - nass * 0.5);
  // Algenfilm, Muschelschill, Wattwurm-Trichter
  c = mix(c, vec3(0.11, 0.13, 0.07), smoothstep(0.58, 0.76, nF(p * 0.035 + 8.0)) * (1.0 - smoothstep(0.15, 0.6, y)) * 0.55);
  vec3 zs = nZelle(p * 7.0 + 1.3);
  float schill = smoothstep(0.2, 0.1, zs.x) * step(zs.z, 0.16) * smoothstep(0.45, 0.7, nN(p * 0.25 + 5.0)) * fein;
  c = mix(c, mix(vec3(0.62, 0.6, 0.55), vec3(0.2, 0.19, 0.2), step(0.08, zs.z)), schill * 0.85);
  vec3 zt = nZelle(p * 2.2 + 7.7);
  float trichter = smoothstep(0.07, 0.03, zt.x) * step(zt.z, 0.3) * fein * (1.0 - smoothstep(0.9, 1.05, y));
  c *= 1.0 - 0.55 * trichter;
  // Pfützen: eigener Spiegel, wenn sie über dem Boden liegen
  float pf = 0.0;
  for (int i = 0; i < 30; i++) {
    vec4 A = uPfA[i]; if (A.z <= 0.0) continue;
    vec2 dd = p - A.xy; float R = A.z * A.w + 0.5; if (abs(dd.x) > R || abs(dd.y) > R) continue;
    vec4 B = uPfB[i]; float cR = cos(B.x), sR = sin(B.x);
    vec2 q2 = vec2((dd.x * cR + dd.y * sR) / A.w, -dd.x * sR + dd.y * cR);
    float q = length(q2) / A.z + 0.16 * (nN(dd * 2.2 + A.xy) - 0.5) + 0.05 * (nN(dd * 9.0) - 0.5);
    pf = max(pf, smoothstep(1.08, 0.98, q) * smoothstep(0.0, 0.004, B.y - y) * (1.0 - step(B.y, uPegel)));
  }
  c = mix(c, vec3(0.07, 0.068, 0.06), pf * 0.8);
  diffuseColor.rgb = c;
  vec3 nb = normalize(vN2);
  gNw = normalize(nb + vec3(-g.x, 0.0, -g.y) * (1.0 - pf));
  if (pf > 0.0) { float w1 = nN(p * 3.0 + vec2(uZeit * 0.6, uZeit * 0.4)); float w2 = nN(p * 3.0 + vec2(0.07, 0.0) + vec2(uZeit * 0.6, uZeit * 0.4)); gNw = normalize(mix(gNw, normalize(vec3(-(w2 - w1) * 0.25, 1.0, 0.0)), pf)); }
  gSpec = clamp(nass * 0.38 + film * 0.5 + pf, 0.0, 1.0); gPf = pf; gNass = nass;
  }`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
  normal = normalize((viewMatrix * vec4(gNw, 0.0)).xyz);`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, 0.32, gNass * 0.8); roughnessFactor = mix(roughnessFactor, 0.16, gPf);`)
      .replace("#include <opaque_fragment>", `
  {
  vec3 V = normalize(cameraPosition - vW2);
  if (gSpec > 0.02) {
    vec3 R = reflect(-V, gNw); R.y = max(R.y, 0.01);
    float F = 0.02 + 0.98 * pow(1.0 - max(dot(gNw, V), 0.0), 5.0);
    vec3 sky = himmel(R);
    float k = clamp(F * gSpec * (1.0 - 0.3 * (1.0 - gPf)), 0.0, 1.0);
    outgoingLight = mix(outgoingLight, sky, k);
    float rs = max(dot(R, normalize(hSonne)), 0.0);
    outgoingLight += hSonnenF * (pow(rs, 700.0) * 22.0 + pow(rs, 60.0) * 0.35) * gSpec * hSonneSicht * (1.0 - hBew * 0.5);
  }
  outgoingLight = min(outgoingLight, vec3(48.0));
  if (any(isnan(outgoingLight))) outgoingLight = vec3(0.0);
  }
#include <opaque_fragment>`);
  };
  return m;
}

// ----------------------------------------------------------------------------------------------- Formen
function box(w, h, d, x, y, z, ry = 0) { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; }
function vereine(list, farbe = false) {
  const geos = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of geos) n += g.getAttribute("position").count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = farbe ? new Float32Array(n * 3) : null; let o = 0;
  for (const g of geos) {
    pos.set(g.getAttribute("position").array, o); if (!g.getAttribute("normal")) g.computeVertexNormals(); nor.set(g.getAttribute("normal").array, o);
    if (col) { const c = g.getAttribute("color"); if (c) col.set(c.array, o); else col.fill(1, o, o + g.getAttribute("position").count * 3); }
    o += g.getAttribute("position").count * 3;
  }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  if (col) out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return out;
}
function faerbe(g, f) {
  const geo = g.index ? g.toNonIndexed() : g, p = geo.getAttribute("position"), c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const k = typeof f === "function" ? f(p.getX(i), p.getY(i), p.getZ(i)) : f; c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b; }
  geo.setAttribute("color", new THREE.BufferAttribute(c, 3)); return geo;
}
const lin = (h) => new THREE.Color(h);
/** Watvogel am Boden (+x = vorn): Austernfischer bzw. Möwe, Vertex-Farben */
function vogelGeo(art) {
  const af = art === "austern";
  const L = af ? 0.42 : 0.55, Hh = af ? 0.16 : 0.2, W = af ? 0.13 : 0.17;
  const oben = lin(af ? "#141414" : "#8E969E"), bauch = lin("#ECECEA"), kopfF = lin(af ? "#121212" : "#F2F2F0");
  const k = new THREE.SphereGeometry(0.5, 14, 10); k.scale(L, Hh, W); k.translate(0, (af ? 0.2 : 0.24), 0);
  const koerper = faerbe(k, (x, y) => (y > (af ? 0.205 : 0.25) || x < -0.12 ? oben : bauch));
  const kp = new THREE.SphereGeometry(af ? 0.055 : 0.07, 10, 8); kp.translate(L * 0.42, af ? 0.31 : 0.36, 0);
  const kopf = faerbe(kp, kopfF);
  const sl = af ? 0.085 : 0.06, sn = new THREE.ConeGeometry(af ? 0.012 : 0.014, sl, 6); sn.rotateZ(-Math.PI / 2); sn.translate(L * 0.42 + (af ? 0.05 : 0.065) + sl / 2, af ? 0.305 : 0.35, 0);
  const schnabel = faerbe(sn, lin(af ? "#E2541A" : "#E0B23A"));
  const bf = lin(af ? "#D9877E" : "#C9B58A"), beine = [-0.03, 0.03].map((z) => faerbe(box(0.012, af ? 0.17 : 0.2, 0.012, 0.0, af ? 0.085 : 0.1, z), bf));
  const sw = faerbe(box(0.12, 0.03, W * 0.7, -L * 0.5, af ? 0.22 : 0.27, 0), oben);
  const fluegel = [-1, 1].map((sg) => { const f = new THREE.SphereGeometry(0.5, 12, 6); f.scale(L * 0.66, 0.06, W * 0.42); f.translate(-L * 0.16, af ? 0.245 : 0.29, sg * W * 0.3);
    return faerbe(f, (x) => (x < -L * 0.4 ? lin("#101010") : oben)); });
  const auge = faerbe(new THREE.SphereGeometry(0.011, 6, 4).translate(L * 0.42 + 0.035, af ? 0.325 : 0.375, 0.038), lin(af ? "#C2201A" : "#E8D040"));
  return vereine([koerper, kopf, schnabel, ...beine, sw, ...fluegel, auge], true);
}
function haeufchenGeo() {
  const pts = [];
  for (let i = 0; i <= 64; i++) { const f = i / 64, a = f * Math.PI * 2 * 3.2, r = 0.034 * (1 - 0.7 * f) + 0.004 * Math.sin(f * 37); pts.push(new THREE.Vector3(Math.cos(a) * r, 0.006 + 0.034 * f, Math.sin(a) * r)); }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.0062, 5, false);
  return g;
}
function prickeGeo() {
  const teile = [new THREE.CylinderGeometry(0.012, 0.03, 2.9, 6, 1).translate(0, 1.45, 0)];
  for (let i = 0; i < 9; i++) {
    const l = 0.35 + 0.35 * hash(i, 301), c = new THREE.CylinderGeometry(0.003, 0.006, l, 4, 1);
    c.translate(0, l / 2, 0); c.rotateZ((hash(i, 302) - 0.5) * 1.3); c.rotateY(hash(i, 303) * 6.28); c.translate(0, 2.45 + 0.4 * hash(i, 304), 0); teile.push(c);
  }
  return vereine(teile);
}
function stangenTextur() {
  const cv = document.createElement("canvas"); cv.width = 16; cv.height = 512; const g = cv.getContext("2d");
  const n = 13;   // 2,6 m Stange, 13 Ringe à 20 cm
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 === 0 ? "#B8231C" : "#ECE8E0"; g.fillRect(0, 512 - (i + 1) * (512 / n), 16, 512 / n + 1); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function seehundGeo() {
  const k = new THREE.SphereGeometry(0.5, 16, 12); k.scale(0.3, 0.26, 0.24);
  const kopf = faerbe(k, (x, y, z) => lin("#5A5650").multiplyScalar(0.75 + 0.5 * vn(x * 40 + 3, y * 40 + z * 30)));
  const s = new THREE.SphereGeometry(0.5, 12, 8); s.scale(0.13, 0.1, 0.12); s.translate(0.16, -0.03, 0);
  const schnauze = faerbe(s, lin("#4A4640"));
  const nase = faerbe(new THREE.SphereGeometry(0.018, 6, 4).translate(0.225, -0.01, 0), lin("#151312"));
  const augen = [-0.055, 0.055].map((z) => faerbe(new THREE.SphereGeometry(0.024, 8, 6).translate(0.11, 0.045, z), lin("#0C0B0A")));
  const hals = faerbe(new THREE.CylinderGeometry(0.12, 0.15, 0.3, 12).translate(-0.04, -0.2, 0), lin("#504C46"));
  return vereine([kopf, schnauze, nase, ...augen, hals], true);
}
/** fliegende Vögel auf eigenen Bahnen (Flügelschlag im Shader wie Voegel in stil_lunar_pov.js) */
class Flieger {
  constructor(szene, n, farbe = "#F2F4F5", spann = 1.0) {
    const s = spann / 2, geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.12, -s, 0.02, -0.06, 0, 0, -0.08, 0, 0, 0.12, 0, 0, -0.08, s, 0.02, -0.06, 0, 0, 0.2, -0.05, 0, -0.12, 0.05, 0, -0.12], 3));
    geo.computeVertexNormals();
    const ph = new Float32Array(n); for (let i = 0; i < n; i++) ph[i] = hash(i, 777) * 6.28;
    geo.setAttribute("iPhase", new THREE.InstancedBufferAttribute(ph, 1));
    const mat = new THREE.MeshBasicMaterial({ color: C(farbe), side: THREE.DoubleSide, fog: true });
    this.zeitU = { value: 0 };
    mat.onBeforeCompile = (sh) => { sh.uniforms.uZeit = this.zeitU; sh.vertexShader = "attribute float iPhase;\nuniform float uZeit;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.y += sin(uZeit * 14.0 + iPhase) * abs(position.x) * 0.9;"); };
    this.mesh = new THREE.InstancedMesh(geo, mat, n); this.mesh.frustumCulled = false; this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); szene.add(this.mesh);
    this.n = n; this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); this._y = new THREE.Vector3(0, 1, 0);
  }
  setze(t, liste) {
    this.zeitU.value = t;
    for (let i = 0; i < this.n; i++) {
      const e = liste[i];
      if (!e) { this._m.makeScale(0, 0, 0); } else { this._q.setFromAxisAngle(this._y, e.blick); this._s.setScalar(e.sk || 1); this._m.compose(this._v.set(...e.p), this._q, this._s); }
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ----------------------------------------------------------------------------------------------- Welt
export class WattSandbank {
  constructor(szene, { schatten = 2048, pegelVon = () => 0, haeufchen = 1700 } = {}) {
    this.szene = szene; this.verts = 0;
    szene.fog = new THREE.FogExp2("#D4DAE0", 7e-5);
    this.u = {
      hSonne: { value: new THREE.Vector3(0, 0.1, -1) }, hZenit: { value: C("#5A7FB4") }, hHorizont: { value: C("#D9DEE2") }, hUnten: { value: C("#7C7E70") },
      hGlut: { value: C("#FFB070") }, hSonnenF: { value: C("#FFF0D8") }, hWolkeHell: { value: C("#F4F1EA") }, hWolkeDunkel: { value: C("#8C929C") },
      hDecke: { value: C("#5E646C") }, hZirrF: { value: C("#F2F4F7") }, hSaumF: { value: C("#FF5A24") },
      hBew: { value: 0.3 }, hZirr: { value: 0.45 }, hSaum: { value: 0 }, hSonneSicht: { value: 1 },
      hWOff: { value: new THREE.Vector2() }, hZOff: { value: new THREE.Vector2() }, hWind: { value: new THREE.Vector2(0.8, 0.6) },
    };
    const g = backe();
    const daten = new Uint16Array(NG * NG * 4), hf = THREE.DataUtils.toHalfFloat;
    for (let k = 0; k < NG * NG; k++) { daten[k * 4] = hf(g.H[k]); daten[k * 4 + 1] = hf(g.P[k]); daten[k * 4 + 2] = hf(g.M[k]); daten[k * 4 + 3] = 0; }
    this.tH = new THREE.DataTexture(daten, NG, NG, THREE.RGBAFormat, THREE.HalfFloatType);
    this.tH.minFilter = this.tH.magFilter = THREE.LinearFilter; this.tH.generateMipmaps = false; this.tH.needsUpdate = true;
    const box0 = new THREE.Vector3(-HB, -HB, 1 / (2 * HB));
    const pfA = [], pfB = [];
    for (let i = 0; i < 30; i++) { const p = PFUETZEN[i]; pfA.push(p ? new THREE.Vector4(p.x, p.z, p.rp, p.sx) : new THREE.Vector4(0, 0, 0, 1)); pfB.push(p ? new THREE.Vector4(p.rot, p.lvl, p.dep, 0) : new THREE.Vector4()); }
    this.bu = { uPegel: { value: 0 }, uZeit: { value: 0 }, uGold: { value: 0 }, uDunkel: { value: 0 }, tH: { value: this.tH }, uBox: { value: box0 }, uPfA: { value: pfA }, uPfB: { value: pfB } };
    Object.assign(this.bu, this.u);
    this.wu = { wZeit: { value: 0 }, wWind: { value: 0.3 }, wStrom: { value: 0 }, wStromT: { value: 0 }, wSchaum: { value: 0.2 }, wWirbel: { value: 0 }, wPegel: { value: 0 },
      wGold: { value: 0 }, wDunkel: { value: 0 }, wTief: { value: C("#2A2F28") }, wFlach: { value: C("#8C826C") }, wSchaumF: { value: C("#E8E6DE") }, wLicht: { value: new THREE.Color(1, 1, 1) },
      tH: { value: this.tH }, uBox: { value: box0 }, eU: { value: new THREE.Vector2(EU[0], EU[2]) }, eV: { value: new THREE.Vector2(EV[0], EV[2]) } };
    this.pegelVon = pegelVon;
    this._himmel(); this._lichter(schatten); this._boden(); this._wasser(); this._haeufchen(haeufchen); this._muscheln(); this._pricken(); this._stange();
    this._spuren(); this._tang(); this._treibgut(); this._voegelBoden(); this._moewen(); this._seehunde(); this._deich(); this._windraeder(); this._schiffe(); this._neuwerk();
    this.post = {}; this.zustand = {};
    this.lichter = { sonne: this.sonne, hemi: this.hemi };
  }
  get vertices() { return this.verts; }
  _zaehle(obj, n = 1) { const g = obj.geometry; if (g) this.verts += g.getAttribute("position").count * n; }
  _himmel() {
    this.himmelMesh = new THREE.Mesh(new THREE.SphereGeometry(30000, 64, 32), new THREE.ShaderMaterial({ vertexShader: HIMMEL_V, fragmentShader: HIMMEL_F, uniforms: this.u, side: THREE.BackSide, depthWrite: false, fog: false }));
    this.himmelMesh.renderOrder = -1000; this.himmelMesh.frustumCulled = false; this.szene.add(this.himmelMesh);
  }
  _lichter(schatten) {
    const s = new THREE.DirectionalLight("#FFE2B8", 3);
    if (schatten > 0) {
      s.castShadow = true; s.shadow.mapSize.set(schatten, schatten);
      const c = s.shadow.camera; c.left = -30; c.right = 30; c.top = 30; c.bottom = -30; c.near = 1; c.far = 900;
      s.shadow.bias = -0.0003; s.shadow.normalBias = 0.02;
    }
    this.szene.add(s, s.target); this.sonne = s;
    this.hemi = new THREE.HemisphereLight("#B8C8E0", "#6A6250", 1.2); this.szene.add(this.hemi);
  }
  _boden() {
    const N = 820, A = 9.0, K = 6.75, xs = new Float32Array(N + 1);
    for (let i = 0; i <= N; i++) { const u = (i / N) * 2 - 1; xs[i] = Math.sign(u) * A * (Math.exp(K * Math.abs(u)) - 1); }
    const pos = new Float32Array((N + 1) * (N + 1) * 3), idx = new Uint32Array(N * N * 6);
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const k = (j * (N + 1) + i) * 3, x = xs[i], z = xs[j]; pos[k] = x; pos[k + 1] = hoehe(x, z); pos[k + 2] = z; }
    let o = 0; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, bodenMaterial(this.bu)); m.receiveShadow = true; m.frustumCulled = false; this.szene.add(m); this._zaehle(m);
  }
  _wasser() {
    const mat = new THREE.ShaderMaterial({ vertexShader: WASSER_V, fragmentShader: WASSER_F, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), fog: true, transparent: true, depthWrite: true });
    Object.assign(mat.uniforms, this.u, this.wu);
    // feines, nach außen gestrecktes Gitter (statt 2 Riesendreiecken): bei tiefer Kamera knapp über dem Wasser werden Tiefe und Weltposition
    // sonst über 30-km-Dreiecke interpoliert, ungenau und von Bild zu Bild verschieden (Wasser lag flackernd über dem Sand, 55,8–58 s)
    const N = 320, A = 1.0, K = 10.3, xs = new Float32Array(N + 1);
    for (let i = 0; i <= N; i++) { const u = (i / N) * 2 - 1; xs[i] = Math.sign(u) * A * (Math.exp(K * Math.abs(u)) - 1); }
    const pos = new Float32Array((N + 1) * (N + 1) * 3), idx = new Uint32Array(N * N * 6);
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const k = (j * (N + 1) + i) * 3; pos[k] = xs[i]; pos[k + 1] = 0; pos[k + 2] = xs[j]; }
    let o = 0; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
    mat.polygonOffset = true; mat.polygonOffsetFactor = 1; mat.polygonOffsetUnits = 2;   // bei Gleichstand gewinnt der Sand
    this.wasser = new THREE.Mesh(g, mat); this.wasser.frustumCulled = false; this.wasser.renderOrder = 5; this.szene.add(this.wasser); this._zaehle(this.wasser);
  }
  _haeufchen(n) {
    const geo = haeufchenGeo(), mat = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.55, metalness: 0 });
    const im = new THREE.InstancedMesh(geo, mat, n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color();
    this.wachsen = [];
    let k = 0;
    for (let i = 0; k < n && i < n * 4; i++) {
      const r = 0.8 + 34 * Math.pow(hash(i, 501), 1.7), yaw = hash(i, 502) * 360, d = richtung(yaw), x = d[0] * r, z = d[2] * r, y = hoehe(x, z);
      if (y < 0.12 || y > 1.02) continue;
      const g = rasterH(x, z) == null ? -10 : backe().P[Math.floor((z + HB) / TX) * NG + Math.floor((x + HB) / TX)];
      if (g > y) continue;
      const s = 0.75 + 0.7 * hash(i, 503);
      e.set(0, hash(i, 504) * 6.28, 0); q.setFromEuler(e); M.compose(new THREE.Vector3(x, y - 0.004, z), q, new THREE.Vector3(s, s * (0.8 + 0.5 * hash(i, 505)), s)); im.setMatrixAt(k, M);
      cc.setRGB(0.3, 0.27, 0.22).multiplyScalar(0.75 + 0.35 * hash(i, 506)); im.setColorAt(k, cc);
      const yw = ((yaw - BLICK.vorn + 540) % 360) - 180;
      if (this.wachsen.length < 34 && r > 2.2 && r < 11 && Math.abs(yw) < 22) this.wachsen.push({ k, p: [x, y - 0.004, z], q: q.clone(), s, sy: s * (0.8 + 0.5 * hash(i, 505)), t0: 0.6 + 3.2 * hash(i, 507) });
      k++;
    }
    im.count = k; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; this.szene.add(im); this._zaehle(im, k); this.haeufchenMesh = im;
  }
  _muscheln() {
    const geo = new THREE.SphereGeometry(0.016, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2); geo.scale(1, 0.45, 0.85);
    const mat = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.45 }), n = 700;
    const im = new THREE.InstancedMesh(geo, mat, n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color(); let k = 0;
    for (let i = 0; k < n && i < n * 4; i++) {
      const r = 0.7 + 18 * Math.pow(hash(i, 521), 1.5), d = richtung(hash(i, 522) * 360), x = d[0] * r, z = d[2] * r, y = hoehe(x, z);
      if (y < 0.12) continue;
      e.set((hash(i, 523) - 0.5) * 0.5, hash(i, 524) * 6.28, (hash(i, 525) - 0.5) * 0.5); q.setFromEuler(e);
      const s = 0.7 + 0.8 * hash(i, 526); M.compose(new THREE.Vector3(x, y - 0.002, z), q, new THREE.Vector3(s, s, s)); im.setMatrixAt(k, M);
      const v = hash(i, 527); cc.setRGB(...(v < 0.6 ? [0.72, 0.68, 0.6] : v < 0.85 ? [0.5, 0.44, 0.36] : [0.12, 0.12, 0.14])); im.setColorAt(k, cc); k++;
    }
    im.count = k; im.castShadow = true; im.frustumCulled = false; this.szene.add(im); this._zaehle(im, k);
  }
  _pricken() {
    const geo = prickeGeo(), mat = new THREE.MeshStandardMaterial({ color: "#3E3428", roughness: 0.9 }), L = [];
    for (let v = -230; v <= 300; v += 17) {
      const vv = v + 4 * (hash(v + 999, 311) - 0.5), u = prielU(vv) + prielB(vv) / 2 - 1.2, [x, z] = xzVon(u, vv);
      L.push({ x, z, y: hoehe(x, z) - 0.15, rx: (hash(v + 999, 312) - 0.5) * 0.12, rz: (hash(v + 999, 313) - 0.5) * 0.12, s: 0.9 + 0.25 * hash(v + 999, 314) });
    }
    const im = new THREE.InstancedMesh(geo, mat, L.length), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    L.forEach((p, i) => { e.set(p.rx, hash(i, 315) * 6.28, p.rz); q.setFromEuler(e); M.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.s, p.s, p.s)); im.setMatrixAt(i, M); });
    im.castShadow = true; im.frustumCulled = false; this.szene.add(im); this._zaehle(im, L.length);
  }
  _stange() {
    const y0 = STANGE.boden - 0.08, g = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 16, 1, false); g.translate(0, 1.3, 0);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: stangenTextur(), roughness: 0.6 }));
    m.position.set(STANGE.x, y0 + 0.08, STANGE.z); m.castShadow = true; this.szene.add(m); this._zaehle(m);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 10).translate(0, 2.8, 0), new THREE.MeshStandardMaterial({ color: "#B21E18", roughness: 0.6 }));
    top.position.copy(m.position); top.castShadow = true; this.szene.add(top);
    const top2 = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 10).rotateX(Math.PI).translate(0, 3.12, 0), top.material); top2.position.copy(m.position); this.szene.add(top2);
  }
  _spuren() {
    // Fußspuren: vom Priel (dein Rückweg) bis zu deinem Standpunkt, nasse dunkle Abdrücke
    const geo = new THREE.CircleGeometry(0.5, 14); geo.rotateX(-Math.PI / 2); geo.scale(0.26, 1, 0.095);
    const mat = new THREE.MeshStandardMaterial({ color: "#8E846E", roughness: 0.45, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const L = [];
    for (let s = 0.7; s < 22; s += 0.38) {
      const vv = -2.5 * Math.sin(s * 0.11) - 0.06 * s * s * 0.1, uu = s, [x, z] = xzVon(uu, vv), [x2, z2] = xzVon(uu + 0.2, -2.5 * Math.sin((s + 0.2) * 0.11) - 0.006 * (s + 0.2) ** 2);
      const ang = Math.atan2(-(z2 - z), x2 - x), seite = (Math.round(s / 0.38) % 2 ? 1 : -1) * 0.12, nx = -Math.sin(ang) * seite, nz = -Math.cos(ang) * seite;
      L.push({ x: x + nx, z: z + nz, ang });
    }
    const im = new THREE.InstancedMesh(geo, mat, L.length), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    L.forEach((p, i) => { e.set(0, p.ang, 0); q.setFromEuler(e); M.compose(new THREE.Vector3(p.x, hoehe(p.x, p.z) + 0.003, p.z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, M); });
    im.receiveShadow = true; im.frustumCulled = false; this.szene.add(im); this._zaehle(im, L.length);
  }
  _tang() {
    // Blasentang und Seegras am Prielufer
    const teile = [];
    for (let i = 0; i < 14; i++) { const l = 0.12 + 0.16 * hash(i, 547), b = new THREE.PlaneGeometry(0.025 + 0.02 * hash(i, 548), l, 1, 2); b.translate(0, l / 2, 0);
      const pp = b.getAttribute("position"); for (let k = 0; k < pp.count; k++) pp.setX(k, pp.getX(k) + 0.03 * Math.sin(pp.getY(k) * 20 + i));
      b.rotateX(-Math.PI / 2 + 0.12 + 0.2 * hash(i, 549)); b.rotateY(i * 2.39); b.translate(0.04 * (hash(i, 550) - 0.5), 0.004, 0.04 * (hash(i, 551) - 0.5)); teile.push(b); }
    const geo = vereine(teile), mat = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.42, side: THREE.DoubleSide }), n = 320;
    const im = new THREE.InstancedMesh(geo, mat, n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color(); let k = 0;
    for (let i = 0; k < n && i < n * 5; i++) {
      const vv = lerp(-110, 130, hash(i, 541)), w = prielB(vv) / 2, side = hash(i, 542) < 0.75 ? -1 : 1, uu = prielU(vv) + side * (w + lerp(-0.5, 3.5, hash(i, 543)));
      const [x, z] = xzVon(uu, vv), y = hoehe(x, z); if (y < -0.05 || y > 0.45) continue;
      e.set(0, hash(i, 544) * 6.28, 0); q.setFromEuler(e); const s = 0.6 + 0.8 * hash(i, 545); M.compose(new THREE.Vector3(x, y + 0.005, z), q, new THREE.Vector3(s, s, s)); im.setMatrixAt(k, M);
      cc.setRGB(...(hash(i, 546) < 0.6 ? [0.2, 0.16, 0.07] : [0.12, 0.14, 0.06])); im.setColorAt(k, cc); k++;
    }
    im.count = k; im.frustumCulled = false; im.receiveShadow = true; this.szene.add(im); this._zaehle(im, k);
  }
  _treibgut() {
    const n = 46, schaum = new THREE.CircleGeometry(0.5, 9); schaum.rotateX(-Math.PI / 2);
    const p = schaum.getAttribute("position"); for (let i = 1; i < p.count; i++) { const f = 0.7 + 0.5 * vn(i * 0.9, 3.1); p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f * 0.7); }
    this.treib = new THREE.InstancedMesh(schaum, new THREE.MeshStandardMaterial({ color: "#EDEBE4", roughness: 0.8, transparent: true, opacity: 0.92, depthWrite: false }), n);
    this.treib.renderOrder = 8; this.treib.frustumCulled = false; this.treib.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.szene.add(this.treib);
    const holz = new THREE.CylinderGeometry(0.035, 0.045, 1, 6); holz.rotateZ(Math.PI / 2);
    this.holz = new THREE.InstancedMesh(holz, new THREE.MeshStandardMaterial({ color: "#5A4632", roughness: 0.9 }), 8); this.holz.frustumCulled = false; this.holz.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.szene.add(this.holz);
    this.treibDaten = [];
    for (let i = 0; i < n + 8; i++) this.treibDaten.push({ v0: hash(i, 561) * 260, quer: (hash(i, 562) - 0.5) * 0.75, k: 0.8 + 0.45 * hash(i, 563), s: i < n ? 0.25 + 0.9 * hash(i, 564) ** 2 : 0.7 + 1.2 * hash(i, 564), rot: hash(i, 565) * 6.28 });
    this._tm = new THREE.Matrix4(); this._tq = new THREE.Quaternion(); this._te = new THREE.Euler();
  }
  _voegelBoden() {
    // Austernfischer (picken auf den hinteren Flächen) und Möwen (landen vorne 0,8–3,6 s); fliegen auf, wenn das Wasser sie erreicht
    const arten = [["austern", 22], ["moewe", 16]];
    this.bodenVoegel = []; this.flieger = new Flieger(this.szene, 64, "#F2F3F2", 1.05); this.fliegerA = new Flieger(this.szene, 26, "#1A1A1A", 0.8);
    for (const [art, n] of arten) {
      const geo = vogelGeo(art), mat = new THREE.MeshStandardMaterial({ color: "#FFFFFF", vertexColors: true, roughness: 0.75 });
      const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = true; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.szene.add(im); this._zaehle(im, n);
      const L = [];
      for (let i = 0; L.length < n && i < 600; i++) {
        let x, z;
        if (art === "austern") { const vv = lerp(-34, 30, hash(i, 581)), uu = lerp(9, prielU(vv) - prielB(vv) / 2 + 2, hash(i, 582)); [x, z] = xzVon(uu, vv); if (hash(i, 589) < 0.3) { const [x2, z2] = xzVon(prielU(vv) + prielB(vv) / 2 + lerp(1, 12, hash(i, 590)), vv); x = x2; z = z2; } }
        else { const yaw = lerp(-34, 18, hash(i, 583)), r = lerp(9, 38, hash(i, 584)), d = richtung(yaw); x = d[0] * r; z = d[2] * r; }
        const y = hoehe(x, z); if (y < 0.06) continue;
        let tf = 999; for (let t = 0; t < 80; t += 0.05) if (this.pegelVon(t) > y + 0.015) { tf = t + 0.3 * hash(i, 585); break; }
        const tl = art === "moewe" && L.length < 7 ? 0.8 + 2.8 * (L.length / 6) : null;
        L.push({ x, z, y, blick: hash(i, 586) * 6.28, ph: hash(i, 587) * 6.28, tf, tl, sk: 0.92 + 0.16 * hash(i, 588) });
      }
      this.bodenVoegel.push({ art, im, L });
    }
    this._vm = new THREE.Matrix4(); this._vq = new THREE.Quaternion(); this._ve = new THREE.Euler(); this._vs = new THREE.Vector3(); this._vp = new THREE.Vector3();
  }
  _moewen() {
    const z1 = xzVon(32, -10), z2 = richtung(BLICK.vorn).map((v) => v * 140);
    this.moewe1 = new Voegel(this.szene, { anzahl: 16, seed: 93, farbe: "#F2F4F5", spannweite: 1.1 }).schwarm({ zentrum: [z1[0], 9, z1[1]], radius: 22, hoehe: 5, tempo: 7, anzahl: 16, skala: 1 });
    this.moewe2 = new Voegel(this.szene, { anzahl: 22, seed: 99, farbe: "#E8ECEE", spannweite: 1.1 }).schwarm({ zentrum: [z2[0], 16, z2[2]], radius: 60, hoehe: 10, tempo: 9, anzahl: 22, skala: 1 });
    this._zaehle(this.moewe1.mesh, 16); this._zaehle(this.moewe2.mesh, 22);
  }
  _seehunde() {
    const geo = seehundGeo(), mat = new THREE.MeshStandardMaterial({ color: "#FFFFFF", vertexColors: true, roughness: 0.32, metalness: 0.05 });
    this.robben = new THREE.InstancedMesh(geo, mat, 4); this.robben.frustumCulled = false; this.robben.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.szene.add(this.robben); this._zaehle(this.robben, 4);
    const ring = new THREE.RingGeometry(0.92, 1.0, 40); ring.rotateX(-Math.PI / 2);
    this.ringe = new THREE.InstancedMesh(ring, new THREE.MeshBasicMaterial({ color: "#F0E8DC", transparent: true, opacity: 0.35, depthWrite: false, fog: true }), 8);
    this.ringe.frustumCulled = false; this.ringe.renderOrder = 9; this.ringe.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.szene.add(this.ringe);
    // Auftauchen im Priel (Blick ≈ yaw 55–75), gestaffelt
    this.robbenDaten = [[60, 10.5, 0.0, 0.0], [70, 15, 0.22, 1.1], [52, 19, 0.45, 0.4], [76, 26, 0.7, 2.0]].map(([yw, r, a, ph]) => { const d = richtung(yw); return { x: d[0] * r, z: d[2] * r, a, ph }; });
  }
  _deich() {
    // Deichlinie (yaw 52 … 245), dahinter Häuser, Bäume, Kugelbake
    const pos = [], idx = [], prof = [[-34, 0.6], [-6, 7.6], [0, 8.4], [5, 7.6], [26, 2.0]];
    const Y0 = 52, Y1 = 245, S = 1.0; let n = 0;
    for (let yw = Y0; yw <= Y1; yw += S) { const R = DEICH_R(yw), d = richtung(yw); for (const [dr, h] of prof) pos.push(d[0] * (R + dr), h, d[2] * (R + dr)); n++; }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < prof.length - 1; k++) { const a = i * prof.length + k, b = a + 1, c = a + prof.length, d = c + 1; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const dm = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: "#4B5A33", roughness: 0.95, side: THREE.DoubleSide })); this.szene.add(dm); this._zaehle(dm);
    const haeuser = [], daecher = [], baeume = [];
    for (let i = 0; i < 70; i++) {
      const yw = lerp(58, 238, hash(i, 601)), R = DEICH_R(yw) + 70 + 500 * hash(i, 602) ** 1.5, d = richtung(yw), x = d[0] * R, z = d[2] * R;
      if (hash(i, 603) < 0.55) { const l = 9 + 8 * hash(i, 604), b = 7 + 3 * hash(i, 605), h = 5 + 4 * hash(i, 606), r = hash(i, 607) * 3;
        haeuser.push(faerbe(box(l, h, b, x, 2 + h / 2, z, r), lin(hash(i, 608) < 0.6 ? "#7A3A2C" : "#D8D2C4")));
        const dach = new THREE.ConeGeometry(Math.hypot(l, b) * 0.55, 4, 4, 1); dach.rotateY(Math.PI / 4 + r); dach.scale(1, 1, b / l); dach.translate(x, 2 + h + 2, z); daecher.push(faerbe(dach, lin("#3A2C28")));
      } else { const s = 6 + 6 * hash(i, 609), k = new THREE.IcosahedronGeometry(s, 1); k.scale(1, 1.2, 1); k.translate(x, 2 + s, z); baeume.push(faerbe(k, lin("#2C3A22"))); }
    }
    // Kugelbake (Holzgerüst mit Kugel) auf dem Deich bei yaw 84
    const kd = richtung(84), KR = DEICH_R(84) - 10, kx = kd[0] * KR, kz = kd[2] * KR, bake = [];
    for (const [ox, oz] of [[-2.5, -2.5], [2.5, -2.5], [2.5, 2.5], [-2.5, 2.5]]) { const p = new THREE.CylinderGeometry(0.35, 0.5, 26, 5); p.translate(0, 13 + 8, 0); p.rotateZ(ox * 0.01); p.translate(kx + ox, 0, kz + oz); bake.push(p); }
    bake.push(new THREE.SphereGeometry(3.2, 10, 8).translate(kx, 8 + 26 + 2, kz), new THREE.CylinderGeometry(0.25, 0.25, 8, 4).translate(kx, 8 + 26 + 8, kz));
    const hm = new THREE.Mesh(vereine([...haeuser, ...daecher, ...baeume], true), new THREE.MeshStandardMaterial({ color: "#FFFFFF", vertexColors: true, roughness: 0.9, flatShading: true }));
    const bm = new THREE.Mesh(vereine(bake), new THREE.MeshStandardMaterial({ color: "#2A2420", roughness: 0.9 }));
    this.szene.add(hm, bm); this._zaehle(hm); this._zaehle(bm);
  }
  _windraeder() {
    this.raeder = []; const weiss = new THREE.MeshStandardMaterial({ color: "#E4E6E8", roughness: 0.6 });
    for (let i = 0; i < 9; i++) {
      const yw = lerp(64, 170, i / 8) + 4 * (hash(i, 621) - 0.5), R = 6200 + 800 * hash(i, 622), d = richtung(yw), x = d[0] * R, z = d[2] * R;
      const turm = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 3.0, 100, 10).translate(x, 52, z), weiss); this.szene.add(turm); this._zaehle(turm);
      const kopf = new THREE.Group(); kopf.position.set(x, 103, z); kopf.rotation.y = -yw * D2R; this.szene.add(kopf);
      const nab = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 11), weiss); kopf.add(nab);
      const rotor = new THREE.Group(); rotor.position.z = 6; kopf.add(rotor);
      for (let b = 0; b < 3; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(2.6, 56, 0.8).translate(0, 29, 0), weiss); bl.rotation.z = b * 2.094; rotor.add(bl); }
      this.raeder.push({ rotor, w: 1.3 + 0.3 * hash(i, 623), ph: hash(i, 624) * 6.28 });
    }
  }
  _schiffe() {
    this.schiffe = [];
    for (let i = 0; i < 2; i++) {
      const teile = [faerbe(box(260, 14, 38, 0, 3, 0), lin("#262A30")), faerbe(box(250, 2, 37, 0, 10.5, 0), lin("#6E2A22"))];
      for (let c = 0; c < 18; c++) { const f = ["#2F5D8C", "#B8452C", "#D8D2C4", "#3B6E4E", "#C9A227", "#7A7E84"][Math.floor(hash(c + i * 30, 641) * 6)], hh = 8 + 10 * hash(c + i * 30, 642);
        teile.push(faerbe(box(12.5, hh, 36, -105 + c * 12.6, 11.5 + hh / 2, 0), lin(f))); }
      teile.push(faerbe(box(14, 26, 34, 110, 24, 0), lin("#E8E6E0")), faerbe(box(5, 10, 5, 116, 42, 0), lin("#30343A")));
      const m = new THREE.Mesh(vereine(teile, true), new THREE.MeshStandardMaterial({ color: "#FFFFFF", vertexColors: true, roughness: 0.8, flatShading: true }));
      this.szene.add(m); this._zaehle(m);
      this.schiffe.push({ m, yaw0: i === 0 ? -48 : -14, R: i === 0 ? 8800 : 10400, tempo: i === 0 ? 7.5 : -6.5 });
    }
  }
  _neuwerk() {
    const d = richtung(-36), R = 12500, x = d[0] * R, z = d[2] * R;
    const insel = new THREE.Mesh(new THREE.CylinderGeometry(900, 1300, 6, 24).scale(1, 1, 0.45).translate(x, 0, z), new THREE.MeshStandardMaterial({ color: "#4A5636", roughness: 1 }));
    const turm = new THREE.Mesh(new THREE.BoxGeometry(14, 40, 14).translate(x + 120, 23, z), new THREE.MeshStandardMaterial({ color: "#5A3A2C", roughness: 0.9 }));
    const baeume = new THREE.Mesh(new THREE.IcosahedronGeometry(60, 1).scale(2.4, 0.4, 1).translate(x - 200, 14, z), new THREE.MeshStandardMaterial({ color: "#2C3622", roughness: 1, flatShading: true }));
    this.szene.add(insel, turm, baeume);
  }
  update(t, z = {}) {
    const { kamera, sonne = { hoehe: 10, az: 220 }, bewoelkung = 0.3, zirren = 0.45, dunkel = 0, gold = 0, pegel = 0, strom = 0, stromTempo = 0, schaum = 0.2, wirbel = 0,
      wind = 0.3, windZeit = t, seehunde = 0 } = z;
    const U = this.u;
    const sd = richtung(sonne.az - 180, sonne.hoehe);
    U.hSonne.value.set(...sd);
    const tief = 1 - smoothstep(1.5, 14, sonne.hoehe), unter = smoothstep(0.6, -2.5, sonne.hoehe);
    const mix3 = (a, b, f) => C(a).lerp(C(b), clamp(f));
    // Himmelsfarben: klarer Novembernachmittag → goldene Stunde → Abendrot → Dämmerung
    U.hZenit.value.copy(mix3("#3A6CB2", "#4E68A2", tief * 0.7)).lerp(C("#1A2340"), dunkel);
    U.hHorizont.value.copy(mix3("#BFD0E0", "#EEC38C", tief * 0.85)).lerp(C("#E59A62"), gold * 0.45).lerp(C("#4A4058"), dunkel);
    U.hUnten.value.copy(mix3("#8A8672", "#6E5E4C", tief)).lerp(C("#101218"), dunkel);
    U.hGlut.value.copy(mix3("#FFC27A", "#FF7A30", tief)).multiplyScalar((0.3 + 1.1 * gold + 0.35 * tief) * (1 - 0.55 * unter) * (1 - 0.6 * dunkel));
    U.hSonnenF.value.copy(mix3("#FFF3DE", "#FFA458", tief)).multiplyScalar(1 - dunkel);
    U.hWolkeHell.value.copy(mix3("#FFF8EE", "#FFC48E", tief * 0.8 + gold * 0.2)).multiplyScalar(1 - 0.75 * dunkel).lerp(C("#C8728A"), unter * 0.45 * (1 - dunkel * 0.6));
    U.hWolkeDunkel.value.copy(mix3("#9AA3B0", "#8A7480", tief)).multiplyScalar(1 - 0.75 * dunkel);
    U.hDecke.value.copy(C("#7C838C")); U.hZirrF.value.copy(mix3("#F4F6F9", "#FFC9A0", tief)).multiplyScalar(1 - 0.7 * dunkel).lerp(C("#E07A8A"), unter * 0.5 * (1 - dunkel * 0.5));
    U.hBew.value = bewoelkung; U.hZirr.value = zirren; U.hSaum.value = 0; U.hSonneSicht.value = 1 - unter;
    U.hWOff.value.set(-0.8 * windZeit * 0.0016, -0.6 * windZeit * 0.0016); U.hZOff.value.set(windZeit * 0.0008, 0);
    if (kamera) this.himmelMesh.position.copy(kamera.position);
    this.szene.fog.color.copy(U.hHorizont.value).multiplyScalar(0.94);
    this.szene.fog.density = lerp(4.2e-5, 9e-5, tief * 0.5 + dunkel * 0.5);
    // Licht: tiefe Novembersonne, goldene Stunde, nach dem Untergang nur Himmelslicht
    const L = this.sonne, sichtbar = 1 - unter;
    const ld = richtung(sonne.az - 180, Math.max(sonne.hoehe, 2.2));
    const ziel = kamera ? new THREE.Vector3().copy(kamera.position).add(new THREE.Vector3(0, 0, -1).applyQuaternion(kamera.quaternion).multiplyScalar(14)) : new THREE.Vector3(0, 0, -14);
    ziel.y = 0.6; L.target.position.copy(ziel); L.position.set(ziel.x + ld[0] * 400, ziel.y + ld[1] * 400, ziel.z + ld[2] * 400);
    L.color.copy(mix3("#FFF0D8", "#FFB070", tief)).lerp(C("#FF8A40"), gold * 0.5);
    L.intensity = (3.4 * (1 - 0.35 * tief) + 0.6 * gold) * sichtbar * (1 - dunkel);
    this.hemi.color.copy(mix3("#BACBE2", "#C8B4B0", tief * 0.6)).lerp(C("#3A4470"), dunkel);
    this.hemi.groundColor.copy(mix3("#7A6E56", "#6A5040", tief)).lerp(C("#121218"), dunkel);
    this.hemi.intensity = (1.3 - 0.2 * tief + 0.45 * gold) * (1 - 0.6 * dunkel) + 0.12;
    // Boden, Wasser
    this.bu.uPegel.value = pegel; this.bu.uZeit.value = windZeit; this.bu.uGold.value = gold; this.bu.uDunkel.value = dunkel;
    this.wasser.position.y = pegel;
    const W = this.wu;
    W.wZeit.value = windZeit; W.wWind.value = wind; W.wStrom.value = strom; W.wStromT.value = stromTempo; W.wSchaum.value = schaum; W.wWirbel.value = wirbel; W.wPegel.value = pegel;
    W.wGold.value = gold; W.wDunkel.value = dunkel;
    const lichtF = (0.55 + 0.45 * sichtbar) * (1 - 0.7 * dunkel);
    W.wLicht.value.setRGB(1, 1, 1).lerp(C("#FFC890"), gold * 0.6 + tief * 0.2).multiplyScalar(lichtF);
    W.wTief.value.copy(mix3("#2E342C", "#3A2E22", gold * 0.6));
    W.wFlach.value.copy(mix3("#857A62", "#9A7650", gold * 0.6));
    // Wattwurm-Häufchen wachsen (0,6–3,8 s)
    if (this.wachsen.length) {
      const M = new THREE.Matrix4();
      for (const w of this.wachsen) { const f = 0.05 + 0.95 * smoothstep(w.t0, w.t0 + 0.9, t); M.compose(new THREE.Vector3(...w.p), w.q, new THREE.Vector3(w.s * (0.5 + 0.5 * f), w.sy * f, w.s * (0.5 + 0.5 * f))); this.haeufchenMesh.setMatrixAt(w.k, M); }
      this.haeufchenMesh.instanceMatrix.needsUpdate = true;
    }
    // Treibgut im Priel: zieht mit der Strömung (bis 8 s seewärts, steht bei der Kenterung, dann landeinwärts)
    const TM = this._tm, TQ = this._tq, TE = this._te;
    this.treibDaten.forEach((d, i) => {
      const v = -110 + (((d.v0 + d.k * strom) % 260) + 260) % 260, w = prielB(v) / 2, u = prielU(v) + d.quer * w * 1.2, [x, zz] = xzVon(u, v);
      const tiefe = pegel - hoehe(x, zz), sicht = smoothstep(0.02, 0.1, tiefe) * smoothstep(-110, -95, v) * (1 - smoothstep(135, 150, v));
      TE.set(0, d.rot + 0.05 * strom * (i % 2 ? 1 : -1), 0); TQ.setFromEuler(TE);
      const s = d.s * sicht;
      TM.compose(new THREE.Vector3(x, pegel + 0.012, zz), TQ, new THREE.Vector3(s, s, s));
      if (i < this.treib.count) this.treib.setMatrixAt(i, TM); else this.holz.setMatrixAt(i - this.treib.count, TM);
    });
    this.treib.instanceMatrix.needsUpdate = true; this.holz.instanceMatrix.needsUpdate = true;
    // Vögel am Boden und Flieger
    const fl = [], flA = [], VM = this._vm, VQ = this._vq, VE = this._ve, VS = this._vs, VP = this._vp;
    for (const gr of this.bodenVoegel) {
      gr.L.forEach((b, i) => {
        let sicht = 1;
        if (b.tl != null && t < b.tl) {
          sicht = 0; const tau = t - (b.tl - 3.0);
          if (tau > 0) { const f = smoothstep(0, 3.0, tau), dirx = Math.cos(b.blick + 0.4), dirz = Math.sin(b.blick + 0.4);
            fl.push({ p: [b.x - dirx * 14 * (1 - f), b.y + 0.3 + 7 * (1 - f) ** 1.5, b.z - dirz * 14 * (1 - f)], blick: Math.atan2(dirx, dirz), sk: 1 }); }
        }
        if (t > b.tf) {
          sicht = 0; const tau = t - b.tf, dirx = Math.cos(b.ph), dirz = Math.sin(b.ph);
          if (tau < 14) (gr.art === "austern" ? flA : fl).push({ p: [b.x + dirx * (3 * tau + 0.8 * tau * tau), b.y + 0.2 + 1.6 * tau + 0.15 * tau * tau, b.z + dirz * (3 * tau + 0.8 * tau * tau)], blick: Math.atan2(dirx, dirz), sk: gr.art === "austern" ? 0.9 : 1 });
        }
        const lauf = 0.25 * Math.sin(t * 0.21 + b.ph), x = b.x + Math.cos(b.blick) * lauf, zz = b.z - Math.sin(b.blick) * lauf;
        const picken = Math.max(0, Math.sin(t * (gr.art === "austern" ? 2.3 : 0.9) + b.ph * 3)) ** 3 * (gr.art === "austern" ? 0.75 : 0.35);
        VE.set(0, b.blick + 0.3 * Math.sin(t * 0.17 + b.ph), -picken, "YXZ"); VQ.setFromEuler(VE); VS.setScalar(b.sk * sicht);
        VM.compose(VP.set(x, hoehe(x, zz) - 0.01, zz), VQ, VS); gr.im.setMatrixAt(i, VM);
      });
      gr.im.instanceMatrix.needsUpdate = true;
    }
    this.flieger.setze(t, fl); this.fliegerA.setze(t, flA);
    const vogelHell = (1 - 0.75 * dunkel) * (1 + 0.15 * gold);
    this.flieger.mesh.material.color.copy(C("#F2F3F2")).lerp(C("#FFD8B0"), gold * 0.5).multiplyScalar(vogelHell);
    for (const v of [this.moewe1, this.moewe2]) { v.setze(t); v.mesh.material.color.copy(C("#EEF1F3")).lerp(C("#FFD2A8"), gold * 0.5).multiplyScalar(vogelHell); }
    // Seehunde: tauchen gestaffelt auf, sehen sich um, Wasserringe
    const RM = this._vm;
    this.robbenDaten.forEach((r, i) => {
      const f = smoothstep(r.a, r.a + 0.18, seehunde), tauch = i === 2 ? smoothstep(0.86, 0.97, seehunde) : 0, h = (f - tauch);
      const bob = 0.03 * Math.sin(t * 1.7 + r.ph), y = pegel - 0.32 + 0.34 * h + bob;
      VE.set(0, r.ph + 0.5 * Math.sin(t * 0.4 + r.ph) + 2.2, 0.1 * Math.sin(t * 0.9 + r.ph), "YXZ"); VQ.setFromEuler(VE); VS.setScalar(h > 0.01 ? 1 : 0);
      RM.compose(VP.set(r.x, y, r.z), VQ, VS); this.robben.setMatrixAt(i, RM);
      for (let k = 0; k < 2; k++) {
        const ph = fr((seehunde - r.a) * 5 + k * 0.5), aktiv = f > 0.05 ? 1 : 0, rad = 0.3 + 2.2 * ph;
        VQ.identity(); VS.set(rad * aktiv, 1, rad * aktiv); RM.compose(VP.set(r.x, pegel + 0.006, r.z), VQ, VS); this.ringe.setMatrixAt(i * 2 + k, RM);
      }
    });
    this.robben.instanceMatrix.needsUpdate = true; this.ringe.instanceMatrix.needsUpdate = true;
    this.ringe.material.opacity = 0.3 * (1 - 0.6 * dunkel);
    // Windräder drehen, Schiffe fahren
    for (const r of this.raeder) r.rotor.rotation.z = r.ph + r.w * t;
    for (const s of this.schiffe) { const d = richtung(s.yaw0), q = richtung(s.yaw0 + 90), o = s.tempo * t; s.m.position.set(d[0] * s.R + q[0] * o, pegel - 2, d[2] * s.R + q[2] * o); s.m.rotation.y = -(s.yaw0 + 90) * D2R + Math.PI / 2; }
    // Nachbearbeitung
    this.post = {
      belichtung: (1.02 + 0.06 * gold) * (1 + 0.3 * dunkel), saettigung: (1.04 + 0.12 * gold) * (1 - 0.15 * dunkel), kontrast: 1.04 + 0.03 * gold,
      tonung: [1.0 + 0.06 * gold + 0.03 * tief - 0.04 * dunkel, 1.0 - 0.01 * gold, 0.98 - 0.08 * gold + 0.1 * dunkel], tonungStaerke: 0.25 + 0.1 * gold + 0.1 * dunkel,
      bloomStaerke: 0.85 + 0.45 * gold + 0.2 * dunkel, bloomSchwelle: 1.0, vignette: 0, koernung: 0.012,
    };
    this.zustand = { tief, unter, sichtbar };
  }
}
