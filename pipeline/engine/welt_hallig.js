// Welt „Hallig mit Warft, Reetdachhaus und Barometer“ (Account 2 @stelldirvor.pov, Weltenkatalog „Küste / Watt“), Erstbau 11.11.2026
// (Opus-Neubau für „Was passiert auf einer Hallig, wenn der Luftdruck rapide fällt?“, Skript acc2-2026-11-13-mittag).
// NUR für den Baukasten Lunar-POV. Alles prozedural, reine Funktion von t (kein Zustand von Bild zu Bild, Zufall nur über hash() mit festem Startwert).
//
// STANDPUNKT: Südostecke der Warft (4,6 m über Mittelwasser), Auge 1,65 m darüber. Rechts (Westen) steht ein Friesenhaus mit Klinkerwänden,
// schwarzem Sockel, weißen Sprossenfenstern, grüner Tür und Reet-Walmdach (Traufkante mit Reet-Fransen, die im Sturm zittern); an der
// Ostgiebelwand neben der Ecke hängt ein Dosenbarometer (Messing-Ring, Eichenholzbrett, Zifferblatt 950–1050 hPa mit Skala und den Wörtern
// STURM · REGEN · VERÄNDERLICH · SCHÖN · SEHR TROCKEN, schwarzer Zeiger und messingfarbener Schleppzeiger), darüber eine Hoflampe.
// INHALT: Warftböschung, Fennen (Wintergras in Büscheln, Grüppen, Weidezaun), ein mäandrierender Priel mit Schlickbänken und Abbruchkante,
// Salzwiesen-Senken, Halligkante mit Steinkante, Watt und Nordsee bis zum Horizont, Nachbarwarft mit Häusern und Bäumen, ferne Halligen,
// Schafe (Instanzen: grasen, ziehen sich bei Sturm an die Hauswand zurück), Möwen (kreisen, fliegen tief, werden verweht).
// HIMMEL (neu: Tag): heller Wintermorgen mit tiefer Sonne, Federwolken, ziehende Haufenwolken mit Wolkenschatten am Boden → geschlossene
// bleigraue Decke → roter Sonnenuntergangsstreifen unter der Decke → stürmische Nacht. Wasser spiegelt denselben Himmel (eine GLSL-Funktion).
//
// ===================================================================================================== API (vollständig)
// Koordinaten: Meter, y oben, Mittelwasser y = 0. Süden = −z, Westen = +x, Norden = +z, Osten = −x (wie welt_watt_leuchtturm.js).
// Gierwinkel „yaw“ in Grad: 0 = Süden, +90 = Westen, ±180 = Norden, −90 = Osten. pitch + = nach oben. richtung(yaw, pitch) → [x, y, z].
//
//   import { Hallig, richtung, hoehe, sonnenStand, AUGE, WARFT, HAUS, BARO, PRIEL } from "../../engine/welt_hallig.js";
//   AUGE = [x, y, z] Standpunkt auf der Warft · WARFT = { y } · HAUS = { x0, x1, z0, z1, traufe } · BARO = { pos:[x,y,z], normale:[x,y,z], r }
//   PRIEL.z(x) → Mittellinie des Priels · hoehe(x, z) → Geländehöhe (m) · sonnenStand(utcStunde) → { hoehe, az } in Grad (Hallig Hooge, 18. Januar)
//   baroWinkel(hpa) → Zeigerwinkel in Grad (im Uhrzeigersinn ab 12 Uhr; 950 hPa = −135°, 1050 hPa = +135°)
//
//   const welt = new Hallig(szene, { schatten = 2048, gras = 70000, schafe = 48, moewen = 34 });
//   welt.update(t, {                               // alles optional; jeder Wert wirkt sofort (kein Gedächtnis)
//     kamera,                                      // THREE.PerspectiveCamera – VOR update setzen (Himmel folgt, Schatten folgt dem Blick)
//     sonne = { hoehe: 5, az: 140 },               // Grad; az ab Norden im Uhrzeigersinn (aus sonnenStand())
//     bewoelkung = 0.15,                           // 0 klar … 0.5 ziehende Haufenwolken … 1 geschlossene bleigraue Decke
//     zirren = 0.5,                                // Federwolken (hoch, in Windrichtung gestreckt)
//     sturm = 0.2,                                 // 0 still … 1 Orkan: Gras peitscht, Priel kräuselt, Schaumkronen, Gischtflocken, Reet zittert
//     dunkel = 0,                                  // 0 Tag … 1 stürmische Nacht (Fenster und Lampe leuchten)
//     saum = 0,                                    // roter Sonnenuntergangsstreifen unter der Decke (0 … 1)
//     pegel = 0,                                   // Wasserspiegel in m (Priel, Watt, Meer; Schlickbank liegt 0,0 … 0,35 m)
//     schaum = 0,                                  // Schaumlinie am Ufer (0 … 1)
//     lampe = 0, regen = 0,                        // Hoflampe über der Tür · Regen um die Kamera (0 … 1)
//     wolkenZeit, windZeit, weideZeit,             // monotone „Uhren“ (aus der Szene integriert): Wolkenzug, Gras/Wellen, Schafe grasen
//     sammeln = 0,                                 // 0 … 1 Schafe ziehen sich an die Hauswand zurück (gestaffelt)
//     moewenTief = 0, moewenFlucht = null,         // 0 … 1 Möwen sinken über das Gras · Zeitpunkt, ab dem sie verweht werden
//     hpa = 1013, schlepp = 985, zucken = 0 })     // Barometer: Zeiger (hPa), Schleppzeiger (hPa), Zittern des Zeigers (Grad)
//   welt.baroBlick(abstand, { hoch, seit, pitchExtra }) → { pos, yaw, pitch }  Kamera vor dem Barometer (Nahaufnahme), Blick auf das Zifferblatt
//   welt.post         → Empfehlung für Buehne-post { belichtung, saettigung, kontrast, tonung, tonungStaerke, bloomStaerke, bloomSchwelle, vignette }
//   welt.lichter      → { sonne (DirectionalLight, Schatten), hemi, lampe (PointLight), fenster (PointLight) }
//   welt.vertices     → Eckpunkte aller Meshes (Instanzen mitgezählt)
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { GLSL_NOISE, klumpen } from "./welt_feld_wald.js";
import { Voegel, Partikel } from "./stil_lunar_pov.js";
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
export const WARFT = { y: 4.6, x0: -6.5, x1: 26, z0: -20.5, z1: 12, r: 6, boeschung: 19 };
export const FENNE_Y = 1.0;
export const AUGE = [-2.0, WARFT.y + 1.65, -14.5];
export const HAUS = { x0: 1.0, x1: 19.5, z0: -17.5, z1: -9.0, boden: WARFT.y - 0.15, traufe: WARFT.y + 2.75, neigung: 49, ueber: 0.6 };
export const BARO = { pos: [HAUS.x0 - 0.035, WARFT.y + 1.95, -16.95], normale: [-1, 0, 0], r: 0.27 };
export const WIND = (() => { const x = -0.86, z = 0.51, l = Math.hypot(x, z); return [x / l, z / l]; })();   // Wind weht nach ONO (aus WSW)
const prielZ = (x) => -96 + 20 * Math.sin(x * 0.016 + 0.6) + 8 * Math.sin(x * 0.047 + 1.9) + 3 * Math.sin(x * 0.11 + 0.4);
const prielW = (x) => 11 + 4 * Math.sin(x * 0.012 + 1.1);
const bankW = (x) => 2.4 + 3.2 * (0.5 + 0.5 * Math.sin(x * 0.031 + 2.2));
export const PRIEL = { z: prielZ, breite: prielW };
const kanteZ = (x) => -440 + 35 * Math.sin(x * 0.005 + 0.4) + 12 * Math.sin(x * 0.019 + 1.3);
const SENKEN = [[34, -64, 9, 5], [-26, -128, 12, 6], [62, -132, 10, 7], [-48, -70, 7, 4]];   // [x, z, a, b] flache Mulden in den Fennen
const NACHBAR = { x: 190, z: -255, r: 24 };                                                    // Nachbarwarft

function warftSdf(x, z) {
  const cx = (WARFT.x0 + WARFT.x1) / 2, cz = (WARFT.z0 + WARFT.z1) / 2, hx = (WARFT.x1 - WARFT.x0) / 2 - WARFT.r, hz = (WARFT.z1 - WARFT.z0) / 2 - WARFT.r;
  const qx = Math.abs(x - cx) - hx, qz = Math.abs(z - cz) - hz;
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - WARFT.r;
}
function prielAbstand(x, z) { const d = (prielZ(x + 0.5) - prielZ(x - 0.5)); return Math.abs(z - prielZ(x)) / Math.sqrt(1 + d * d); }

/** Geländehöhe (m über Mittelwasser) */
export function hoehe(x, z) {
  let y = FENNE_Y + 0.14 * (fbm(x * 0.018, z * 0.018) - 0.5) + 0.035 * (vn(x * 0.25, z * 0.25) - 0.5);
  // Grüppen (flache Gräben, ca. 30 m Abstand, quer zum Priel)
  const gq = Math.abs(fr((x + 6 * Math.sin(z * 0.02)) / 31) - 0.5) * 31;
  if (z < -24 && z > -420) y -= 0.32 * (1 - ss(0.3, 1.1, gq));
  // Senken
  for (const [sx, sz, a, b] of SENKEN) { const q = ((x - sx) / a) ** 2 + ((z - sz) / b) ** 2; if (q < 1.6) y -= 0.62 * (1 - ss(0.0, 1.6, q)); }
  // Priel: Bett, Schlickbank, Abbruchkante
  const d = prielAbstand(x, z), w = prielW(x) / 2, b = bankW(x);
  if (d < w + b + 2.2) {
    let py;
    if (d < w) { const q = d / w; py = -1.05 + 1.05 * q * q; }
    else if (d < w + b) py = 0.02 + 0.3 * ((d - w) / b) ** 1.4 + 0.04 * (vn(x * 0.6, z * 0.6) - 0.5);
    else py = 0.32 + (y - 0.32) * ss(0, 2.2, d - w - b);
    y = Math.min(y, py);
  }
  // Halligkante mit Steinkante, dahinter Watt und Meer
  const ke = kanteZ(x);
  if (z < ke + 3) {
    const u = ss(ke + 3, ke - 5, z);
    const watt = -0.18 + 0.32 * (fbm(x * 0.006 + 3, z * 0.006, 3) - 0.5) + 0.12 * (vn(x * 0.05, z * 0.05) - 0.5) - 1.6 * ss(ke - 500, ke - 2600, z);
    y = lerp(y, watt, u);
  }
  // Warften (eigene und Nachbarwarft)
  const sd = warftSdf(x, z);
  if (sd < WARFT.boeschung) y = Math.max(y, lerp(WARFT.y, FENNE_Y, ss(0, WARFT.boeschung, sd)) + (sd < 0 ? 0.03 * (vn(x * 0.4, z * 0.4) - 0.5) : 0));
  const dn = Math.hypot(x - NACHBAR.x, z - NACHBAR.z) - NACHBAR.r;
  if (dn < 18) y = Math.max(y, lerp(4.2, FENNE_Y, ss(0, 18, dn)));
  return y;
}

/** Sonnenstand auf Hallig Hooge (54,57° N, 8,55° O) am 18. Januar (Deklination −20,6°, Zeitgleichung −10 min) */
export function sonnenStand(utc) {
  const phi = 54.57 * D2R, dek = -20.6 * D2R, solar = utc + 8.55 / 15 - 10 / 60, H = (solar - 12) * 15 * D2R;
  const sh = Math.sin(phi) * Math.sin(dek) + Math.cos(phi) * Math.cos(dek) * Math.cos(H), h = Math.asin(sh);
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dek) * Math.cos(phi));   // ab Süden, West +
  return { hoehe: h / D2R, az: ((az / D2R + 180) % 360 + 360) % 360 };
}
export const baroWinkel = (hpa) => -135 + (clamp(hpa, 940, 1060) - 950) * 2.7;

// ----------------------------------------------------------------------------------------------- Himmel (eine Funktion für Kuppel und Wasser)
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
  float luecke = hSaum * (1.0 - smoothstep(0.003, 0.04 + 0.02 * nN(dh * 9.0), hp)) * smoothstep(0.1, 0.85, azS);
  c *= 1.0 - luecke;
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

// ----------------------------------------------------------------------------------------------- Wasser (Priel, Watt, Meer)
const WASSER_V = /* glsl */ `
varying vec3 vW;
#include <common>
#include <fog_pars_vertex>
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const WASSER_F = /* glsl */ `
uniform float wZeit, wSturm, wSchaum, wDunkel;
uniform vec3 wTief, wSchaumF;
varying vec3 vW;
#include <common>
#include <fog_pars_fragment>
${GLSL_NOISE}
${GLSL_HIMMEL}
float wellen(vec2 p, float zt) {
  vec2 w = hWind, qn = vec2(-w.y, w.x);
  vec2 r = vec2(dot(p, w), dot(p, qn));
  return nN(vec2(r.x * 0.32 - zt * 0.9, r.y * 0.55)) + 0.55 * nN(vec2(r.x * 0.95 - zt * 1.7, r.y * 1.3) + 4.0)
       + 0.3 * nN(p * 2.6 + vec2(zt * 0.7, -zt * 0.4)) + 0.16 * nN(p * 6.0 - vec2(zt * 1.3, zt * 0.9));
}
void main() {
  vec3 Vv = cameraPosition - vW; float dist = length(Vv); vec3 V = Vv / dist;
  vec2 p = vW.xz;
  float amp = 0.035 + 0.3 * wSturm;
  float e = 0.08 + dist * 0.0015;
  float h0 = wellen(p, wZeit), hx = wellen(p + vec2(e, 0.0), wZeit), hz = wellen(p + vec2(0.0, e), wZeit);
  vec3 n = normalize(vec3(-(hx - h0) / e * amp, 1.0, -(hz - h0) / e * amp));
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), smoothstep(150.0, 4000.0, dist) * 0.8));
  vec3 r = reflect(-V, n); r.y = max(abs(r.y), 0.012);
  float fres = 0.025 + 0.975 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
  vec3 refl = himmel(r);
  vec3 col = mix(wTief * (0.7 + 0.3 * h0), refl, clamp(fres * 1.05, 0.0, 1.0));
  vec3 s = normalize(hSonne);
  float rs = max(dot(r, s), 0.0);
  col += hSonnenF * (pow(rs, 900.0) * 30.0 + pow(rs, 60.0) * 0.6) * hSonneSicht * (1.0 - hBew * 0.92);
  // Schaumkronen und Schaumstreifen in Windrichtung (Sturm)
  vec2 w = hWind, qn = vec2(-w.y, w.x);
  float fk = smoothstep(0.66, 0.86, nF(p * 0.11 - w * wZeit * 0.5) + 0.25 * (h0 - 0.9)) * smoothstep(0.35, 0.95, wSturm);
  float st = smoothstep(0.7, 0.95, nN(vec2(dot(p, w) * 0.06 - wZeit * 0.4, dot(p, qn) * 0.9))) * smoothstep(0.45, 1.0, wSturm) * 0.6;
  float schaum = clamp(fk + st, 0.0, 1.0) * (1.0 - smoothstep(300.0, 2500.0, dist) * 0.7);
  col = mix(col, wSchaumF, schaum * 0.75);
  gl_FragColor = vec4(col, 1.0);
#include <fog_fragment>
}`;

// ----------------------------------------------------------------------------------------------- Boden (Fennen, Warft, Schlick, Watt)
function bodenMaterial(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.95, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vW2; varying vec3 vN2;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvW2 = (modelMatrix * vec4(transformed, 1.0)).xyz; vN2 = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vW2; varying vec3 vN2;
uniform float uPegel, uSchaum, uNass, uWZeit, uSturm, uBew, uDunkel;
uniform vec2 uWOff, uWind;
${GLSL_NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  float hgSchlick = 0.0, hgNass = 0.0;
  {
  vec2 p = vW2.xz; float y = vW2.y; float dist = length(cameraPosition - vW2);
  float fw = max(fwidth(p.x), fwidth(p.y));
  float fein = 1.0 - smoothstep(0.15, 1.5, fw);
  float n1 = nF(p * 0.035), n2 = mix(0.5, nN(p * 0.6), fein), n3 = mix(0.5, nN(p * 3.3), 1.0 - smoothstep(0.03, 0.25, fw));
  float steil = 1.0 - clamp(vN2.y, 0.0, 1.0);
  // Wintergras der Fennen: olivgrün, strohgelb, rötliche Salzwiesen-Flecken
  vec3 gras = mix(vec3(0.20, 0.25, 0.11), vec3(0.36, 0.34, 0.17), smoothstep(0.35, 0.7, n1));
  gras = mix(gras, vec3(0.30, 0.20, 0.12), smoothstep(0.62, 0.8, nF(p * 0.012 + 9.0)) * 0.55);
  gras *= 0.8 + 0.32 * n2 + 0.18 * (n3 - 0.5);
  float warft = smoothstep(3.6, 4.4, y);
  gras = mix(gras, mix(vec3(0.17, 0.21, 0.09), vec3(0.30, 0.29, 0.15), nN(p * 1.3)) * (0.7 + 0.45 * n2 + 0.35 * (n3 - 0.5)), warft * 0.85);
  // Grüppen mit Wasser im Grund, Schlick an den Rändern
  vec3 schlick = mix(vec3(0.15, 0.13, 0.11), vec3(0.24, 0.21, 0.17), n2) * (0.85 + 0.2 * n3);
  vec3 erde = mix(vec3(0.20, 0.16, 0.12), vec3(0.28, 0.23, 0.17), n2);
  float isSchlick = 1.0 - smoothstep(0.42, 0.72, y);
  vec3 c = mix(gras, erde, smoothstep(0.35, 0.7, steil) * (1.0 - warft));
  c = mix(c, schlick, isSchlick);
  // Steinkante an der Halligkante (grauer Basalt)
  float stein = smoothstep(0.3, 0.55, steil) * (1.0 - smoothstep(0.9, 1.05, y)) * smoothstep(-0.25, 0.1, y) * step(380.0, -p.y);
  c = mix(c, vec3(0.22, 0.23, 0.24) * (0.7 + 0.5 * n3), stein);
  // Nässe: Spritzwasser unter dem Pegel bis knapp darüber, Regen
  float nass = 1.0 - smoothstep(uPegel + 0.02, uPegel + 0.22, y);
  c *= 1.0 - 0.35 * max(nass, uNass * 0.6);
  // Schaumlinie am Wasserrand
  float sl = (1.0 - smoothstep(0.0, 0.06 + 0.04 * nN(p * 1.7), abs(y - uPegel - 0.02))) * smoothstep(0.35, 0.65, nN(p * 0.9 + vec2(uWZeit * 0.2, 0.0)) + 0.25);
  c = mix(c, vec3(0.86, 0.87, 0.85), sl * uSchaum * 0.85);
  // Wolkenschatten (gleiche Wolken wie am Himmel, auf den Boden projiziert)
  float ws = smoothstep(0.42, 0.62, nF((p * 0.0011 + uWOff * 0.55) * 0.85)) * uBew * (1.0 - smoothstep(0.6, 0.95, uBew));
  c *= 1.0 - 0.38 * ws;
  diffuseColor.rgb = c; hgSchlick = isSchlick; hgNass = nass;
  }`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, 0.28, max(hgSchlick * 0.8, hgNass * 0.7));`);
  };
  return m;
}

// ----------------------------------------------------------------------------------------------- Wind-Material (Gras, Reet-Fransen)
function windMat(basis, u, { lean = 1, flatter = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.9, metalness: 0, vertexColors: true, side: THREE.DoubleSide, ...basis });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWZeit = u.uWZeit; sh.uniforms.uSturm = u.uSturm; sh.uniforms.uWind = u.uWind;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWZeit, uSturm; uniform vec2 uWind;")
      .replace("#include <project_vertex>", `
  vec4 mvPosition = vec4(transformed, 1.0);
  float hInst = 1.0;
  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
    hInst = length(instanceMatrix[1].xyz);
    vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  #else
    vec4 wp = vec4(0.0);
  #endif
  {
    float k = clamp(position.y, 0.0, 1.0);
    float ph = wp.x * 0.37 + wp.z * 0.23;
    float boe = 0.55 + 0.45 * sin(uWZeit * 0.8 - dot(wp.xz, uWind) * 0.09 + nH2(wp.xz));
    float s = sin(uWZeit * 2.3 + ph) * 0.6 + sin(uWZeit * 3.9 + ph * 1.7) * 0.3 + sin(uWZeit * 7.1 + ph * 2.3) * 0.15 * uSturm;
    float amp = hInst * (0.08 + 0.55 * uSturm);
    vec2 d = uWind * (${lean.toFixed(2)} * uSturm * boe * 0.85 + s * ${flatter.toFixed(2)} * (0.35 + 0.65 * uSturm)) * amp * k * k;
    vec2 quer = vec2(-uWind.y, uWind.x) * sin(uWZeit * 3.1 + ph * 1.3) * amp * 0.25 * k * k;
    mvPosition.xz += d + quer;
    mvPosition.y -= length(d) * 0.45 * k;
  }
  mvPosition = modelViewMatrix * mvPosition;
  gl_Position = projectionMatrix * mvPosition;`)
      .replace("void main() {", "float nH2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) * 6.28; }\nvoid main() {");
  };
  return m;
}

// ----------------------------------------------------------------------------------------------- Haus: Klinker, Reet, Fenster
function klinkerMaterial(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.88, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vW3; varying vec3 vN3;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvW3 = (modelMatrix * vec4(transformed, 1.0)).xyz; vN3 = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vW3; varying vec3 vN3;\n${GLSL_NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  {
  vec2 q = abs(vN3.x) > 0.5 ? vec2(vW3.z, vW3.y) : vec2(vW3.x, vW3.y);
  float reihe = floor(q.y / 0.078);
  vec2 b = vec2(q.x / 0.24 + 0.5 * mod(reihe, 2.0), q.y / 0.078);
  vec2 f = fract(b), id = floor(b);
  float fuge = 1.0 - smoothstep(0.005, 0.011, min(min(f.x, 1.0 - f.x) * 0.24, min(f.y, 1.0 - f.y) * 0.078));
  float v = nH(id);
  vec3 stein = mix(vec3(0.22, 0.075, 0.055), vec3(0.34, 0.13, 0.09), v) * (0.85 + 0.25 * nN(q * 9.0));
  stein = mix(stein, vec3(0.22, 0.09, 0.07), step(0.9, v) * 0.6);
  vec3 c = mix(stein, vec3(0.46, 0.44, 0.40), fuge * 0.85);
  float sockel = 1.0 - smoothstep(${(WARFT.y + 0.33).toFixed(2)}, ${(WARFT.y + 0.35).toFixed(2)}, vW3.y);
  c = mix(c, vec3(0.035, 0.035, 0.04), sockel);
  c *= 0.9 + 0.15 * nN(q * 0.7);
  diffuseColor.rgb = c;
  }`);
  };
  return m;
}
function reetMaterial(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.97, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSturm = u.uSturm; sh.uniforms.uWZeit = u.uWZeit; sh.uniforms.uNass = u.uNass;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vW4; varying vec3 vN4;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvW4 = (modelMatrix * vec4(transformed, 1.0)).xyz; vN4 = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vW4; varying vec3 vN4;\nuniform float uSturm, uWZeit, uNass;\n${GLSL_NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  {
  vec2 sdir = normalize(vN4.xz + vec2(1e-4));
  float entlang = dot(vW4.xz, vec2(-sdir.y, sdir.x));
  float runter = dot(vW4.xz, sdir) - vW4.y * 0.8;
  float zitter = uSturm * 0.012 * sin(uWZeit * 9.0 + runter * 3.0);
  float faser = nN(vec2((entlang + zitter) * 70.0, runter * 1.6)) * 0.55 + nN(vec2(entlang * 210.0, runter * 4.0)) * 0.3 + nN(vec2(entlang * 9.0, runter * 0.6)) * 0.15;
  float lage = fract(runter * 2.4 + 0.15 * nN(vec2(entlang * 2.0, 0.0)));
  vec3 c = mix(vec3(0.20, 0.17, 0.12), vec3(0.40, 0.34, 0.24), faser);
  c *= 0.82 + 0.22 * smoothstep(0.0, 0.25, lage);
  float moos = smoothstep(0.55, 0.8, nF(vW4.xz * 0.35 + vW4.y * 0.2)) * (0.35 + 0.65 * smoothstep(0.2, -0.6, vN4.z));
  c = mix(c, vec3(0.20, 0.23, 0.12), moos * 0.55);
  c *= 1.0 - 0.3 * uNass;
  diffuseColor.rgb = c;
  }`);
  };
  return m;
}
function tri(a, b, c) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c], 3)); g.computeVertexNormals(); return g; }
function quad(a, b, c, d) { return [tri(a, b, c), tri(a, c, d)]; }
function vereine(list) {
  const geos = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of geos) n += g.getAttribute("position").count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const g of geos) { pos.set(g.getAttribute("position").array, o); if (!g.getAttribute("normal")) g.computeVertexNormals(); nor.set(g.getAttribute("normal").array, o); o += g.getAttribute("position").count * 3; }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  return out;
}
/** Walmdach (Reet): Traufrechteck x0..x1 × z0..z1 auf Höhe y, Neigung in Grad, dicke Traufkante (Reet ist ≈ 35 cm stark) */
function walmDach(x0, x1, z0, z1, y, neigung, dicke = 0.38) {
  const tn = Math.tan(neigung * D2R), hb = (z1 - z0) / 2, hoch = hb * tn, zm = (z0 + z1) / 2;
  const r0 = x0 + hb, r1 = x1 - hb, yf = y + hoch;
  const A = [x0, y, z0], B = [x1, y, z0], Cc = [x1, y, z1], D = [x0, y, z1], R0 = [r0, yf, zm], R1 = [r1, yf, zm];
  const teile = [...quad(A, R0, R1, B), ...quad(Cc, R1, R0, D), tri(D, R0, A), tri(B, R1, Cc)];
  // Traufkante: senkrechter Streifen, leicht nach innen
  const k = (p, dx, dz) => [p[0] + dx, p[1] - dicke, p[2] + dz], i = 0.12;
  const A2 = k(A, i, i), B2 = k(B, -i, i), C2 = k(Cc, -i, -i), D2 = k(D, i, -i);
  teile.push(...quad(A2, A, B, B2), ...quad(B2, B, Cc, C2), ...quad(C2, Cc, D, D2), ...quad(D2, D, A, A2));
  return { geo: vereine(teile), first: [r0, r1, yf, zm] };
}
function box(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; }

// ----------------------------------------------------------------------------------------------- Barometer
function zifferblattTextur() {
  const N = 1024, cv = document.createElement("canvas"); cv.width = cv.height = N;
  const g = cv.getContext("2d"), m = N / 2;
  const grad = g.createRadialGradient(m, m * 0.9, N * 0.05, m, m, N * 0.52);
  grad.addColorStop(0, "#F3EBD6"); grad.addColorStop(0.8, "#E6DABC"); grad.addColorStop(1, "#CDBE98");
  g.fillStyle = grad; g.fillRect(0, 0, N, N);
  const pol = (deg, r) => { const a = (deg - 90) * D2R; return [m + Math.cos(a) * r, m + Math.sin(a) * r]; };
  g.strokeStyle = "#2A221A"; g.lineCap = "round";
  g.lineWidth = 3; g.beginPath(); g.arc(m, m, N * 0.44, (-135 - 90) * D2R, (135 - 90) * D2R); g.stroke();
  g.lineWidth = 2; g.beginPath(); g.arc(m, m, N * 0.405, (-135 - 90) * D2R, (135 - 90) * D2R); g.stroke();
  for (let p = 950; p <= 1050; p++) {
    const w = baroWinkel(p), gross = p % 10 === 0, mittel = p % 5 === 0;
    const [ax, ay] = pol(w, N * 0.44), [bx, by] = pol(w, N * (gross ? 0.36 : mittel ? 0.38 : 0.405));
    g.lineWidth = gross ? 7 : mittel ? 4.5 : 2.4; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
  }
  g.fillStyle = "#1E1812"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "600 46px 'Lunar Serif', Georgia, serif";
  for (let p = 950; p <= 1050; p += 10) { const [x, y] = pol(baroWinkel(p), N * 0.305); g.save(); g.translate(x, y); g.rotate(baroWinkel(p) * D2R); g.fillText(String(p), 0, 0); g.restore(); }
  const woerter = [[960, "STURM"], [980, "REGEN"], [1000, "VERÄNDERLICH"], [1020, "SCHÖN"], [1040, "SEHR TROCKEN"]];
  g.font = "600 33px 'Lunar Sans', Arial, sans-serif";
  for (const [p, wort] of woerter) {
    const w0 = baroWinkel(p), r = N * 0.205, schritt = 4.1, b = wort.length;
    for (let i = 0; i < b; i++) { const w = w0 + (i - (b - 1) / 2) * schritt; const [x, y] = pol(w, r); g.save(); g.translate(x, y); g.rotate(w * D2R); g.fillText(wort[i], 0, 0); g.restore(); }
  }
  g.font = "italic 400 40px 'Lunar Serif', Georgia, serif"; g.fillText("hPa", m, m + N * 0.3);
  g.font = "400 26px 'Lunar Sans', Arial, sans-serif"; g.fillText("BAROMETER", m, m + N * 0.37);
  // Alterung: feine Flecken
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(110,80,40,${0.02 + 0.05 * hash(i, 71)})`; g.beginPath(); g.arc(N * hash(i, 72), N * hash(i, 73), 2 + 14 * hash(i, 74), 0, 6.283); g.fill(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return tex;
}
function zeigerGeo(laenge, breite, schwanz) {
  const s = new THREE.Shape();
  s.moveTo(0, laenge); s.lineTo(breite * 0.5, laenge * 0.1); s.lineTo(breite * 0.9, 0); s.lineTo(breite * 0.6, -schwanz * 0.7);
  s.lineTo(breite * 1.3, -schwanz); s.lineTo(-breite * 1.3, -schwanz); s.lineTo(-breite * 0.6, -schwanz * 0.7); s.lineTo(-breite * 0.9, 0); s.lineTo(-breite * 0.5, laenge * 0.1); s.lineTo(0, laenge);
  return new THREE.ExtrudeGeometry(s, { depth: 0.002, bevelEnabled: false });
}

// ----------------------------------------------------------------------------------------------- Schafe
function schafGeo() {
  const k = new THREE.SphereGeometry(0.5, 20, 14), p = k.getAttribute("position");
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = 1 + 0.09 * (vn(x * 9 + 3, y * 9 + z * 7) - 0.5) + 0.05 * Math.sin(x * 23 + z * 19); p.setXYZ(i, x * 1.28 * f, y * 0.82 * f, z * 0.8 * f); }
  k.computeVertexNormals(); k.translate(0, 0.78, 0);
  const beine = [-0.38, 0.36].flatMap((x) => [-0.17, 0.17].map((z) => box(0.075, 0.52, 0.075, x, 0.26, z)));
  const schwanz = box(0.08, 0.2, 0.1, -0.66, 0.72, 0);
  const kopf = new THREE.BoxGeometry(0.34, 0.2, 0.18); kopf.translate(0.17, 0, 0);
  const ohr = [box(0.05, 0.03, 0.14, 0.05, 0.08, 0.13), box(0.05, 0.03, 0.14, 0.05, 0.08, -0.13)];
  const schopf = new THREE.IcosahedronGeometry(0.11, 1); schopf.translate(0.04, 0.08, 0);
  return { wolle: k, beine: vereine([...beine, schwanz]), kopf: vereine([kopf, ...ohr]), schopf };
}

// ----------------------------------------------------------------------------------------------- Welt
export class Hallig {
  constructor(szene, { schatten = 2048, gras = 70000, schafe = 48, moewen = 34 } = {}) {
    this.szene = szene; this.verts = 0;
    szene.fog = new THREE.FogExp2("#C8D0D8", 9e-5);
    this.u = {
      hSonne: { value: new THREE.Vector3(0, 0.1, -1) }, hZenit: { value: C("#5A7FB4") }, hHorizont: { value: C("#D9DEE2") }, hUnten: { value: C("#7C7E70") },
      hGlut: { value: C("#FFB070") }, hSonnenF: { value: C("#FFF0D8") }, hWolkeHell: { value: C("#F4F1EA") }, hWolkeDunkel: { value: C("#8C929C") },
      hDecke: { value: C("#5E646C") }, hZirrF: { value: C("#F2F4F7") }, hSaumF: { value: C("#FF5A24") },
      hBew: { value: 0.1 }, hZirr: { value: 0.5 }, hSaum: { value: 0 }, hSonneSicht: { value: 1 },
      hWOff: { value: new THREE.Vector2() }, hZOff: { value: new THREE.Vector2() }, hWind: { value: new THREE.Vector2(...WIND) },
    };
    this.wu = { wZeit: { value: 0 }, wSturm: { value: 0.2 }, wSchaum: { value: 0 }, wDunkel: { value: 0 }, wTief: { value: C("#1C2A2C") }, wSchaumF: { value: C("#E4E8E8") } };
    this.bu = { uPegel: { value: 0 }, uSchaum: { value: 0 }, uNass: { value: 0 }, uWZeit: { value: 0 }, uSturm: { value: 0.2 }, uBew: { value: 0.1 }, uDunkel: { value: 0 },
      uWOff: this.u.hWOff, uWind: this.u.hWind };
    this._himmel(); this._lichter(schatten); this._boden(); this._wasser(); this._haus(); this._barometer(); this._zaun(); this._nachbarn();
    this._gras(gras); this._schafe(schafe); this._moewen(moewen);
    this.regen = new Partikel(szene, { art: "regen", anzahl: 2600, box: [26, 14, 26], seed: 5, deckkraft: 0 });
    this.flocken = new Partikel(szene, { art: "staub", anzahl: 900, box: [40, 8, 40], seed: 9, farbe: "#E9ECEC", groesse: 0.05, fall: -0.2, wirbel: 1.2, deckkraft: 0, wind: [-14, 0.6, 8] });
    this.post = {}; this.zustand = {};
    this.lichter = { sonne: this.sonne, hemi: this.hemi, lampe: this.lampe, fenster: this.fensterLicht };
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
      const c = s.shadow.camera; c.left = -55; c.right = 55; c.top = 55; c.bottom = -55; c.near = 1; c.far = 900;
      s.shadow.bias = -0.0004; s.shadow.normalBias = 0.04;
    }
    this.szene.add(s, s.target); this.sonne = s;
    this.hemi = new THREE.HemisphereLight("#B8C8E0", "#5A5640", 1.2); this.szene.add(this.hemi);
    this.lampe = new THREE.PointLight("#FFB25E", 0, 14, 2); this.lampe.position.set(HAUS.x0 - 0.45, WARFT.y + 2.45, -15.6); this.szene.add(this.lampe);
    this.fensterLicht = new THREE.PointLight("#FFA850", 0, 10, 2); this.fensterLicht.position.set(HAUS.x0 - 1.2, WARFT.y + 1.4, -11.0); this.szene.add(this.fensterLicht);
  }
  _boden() {
    const N = 640, A = 14.2, K = 5.65, xs = new Float32Array(N + 1);
    for (let i = 0; i <= N; i++) { const u = (i / N) * 2 - 1; xs[i] = Math.sign(u) * A * (Math.exp(K * Math.abs(u)) - 1); }
    const pos = new Float32Array((N + 1) * (N + 1) * 3), idx = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const k = (j * (N + 1) + i) * 3, x = xs[i], z = xs[j] - 20; pos[k] = x; pos[k + 1] = hoehe(x, z); pos[k + 2] = z; }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, bodenMaterial(this.bu)); m.receiveShadow = true; m.frustumCulled = false; this.szene.add(m); this._zaehle(m);
  }
  _wasser() {
    const mat = new THREE.ShaderMaterial({ vertexShader: WASSER_V, fragmentShader: WASSER_F, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), fog: true });
    Object.assign(mat.uniforms, this.u, this.wu);
    const g = new THREE.PlaneGeometry(60000, 60000, 8, 8); g.rotateX(-Math.PI / 2);
    this.wasser = new THREE.Mesh(g, mat); this.wasser.frustumCulled = false; this.szene.add(this.wasser); this._zaehle(this.wasser);
  }
  _haus() {
    const H = HAUS, gr = new THREE.Group();
    const klinker = klinkerMaterial(this.bu), reet = reetMaterial(this.bu);
    const weiss = new THREE.MeshStandardMaterial({ color: "#E8E6E0", roughness: 0.6 }), gruen = new THREE.MeshStandardMaterial({ color: "#1F4A3A", roughness: 0.55 });
    this.glasMat = new THREE.MeshStandardMaterial({ color: "#1A2228", roughness: 0.12, metalness: 0.3, emissive: "#FFAE5A", emissiveIntensity: 0 });
    const hoehe0 = H.traufe - H.boden;
    const wand = new THREE.Mesh(box(H.x1 - H.x0, hoehe0, H.z1 - H.z0, (H.x0 + H.x1) / 2, H.boden + hoehe0 / 2, (H.z0 + H.z1) / 2), klinker);
    wand.castShadow = wand.receiveShadow = true; gr.add(wand); this._zaehle(wand);
    const { geo, first } = walmDach(H.x0 - H.ueber, H.x1 + H.ueber, H.z0 - H.ueber, H.z1 + H.ueber, H.traufe - 0.05, H.neigung);
    const dach = new THREE.Mesh(geo, reet); dach.castShadow = dach.receiveShadow = true; gr.add(dach); this._zaehle(dach);
    this.first = first;
    // Firstabdeckung, Schornstein
    const [r0, r1, yf, zm] = first;
    const firstM = new THREE.Mesh(box(r1 - r0 + 0.4, 0.22, 0.5, (r0 + r1) / 2, yf + 0.02, zm), new THREE.MeshStandardMaterial({ color: "#2E3328", roughness: 0.9 }));
    const schorn = new THREE.Mesh(box(0.7, 1.6, 0.7, r0 + 6.5, yf + 0.3, zm), klinker), kappe = new THREE.Mesh(box(0.86, 0.1, 0.86, r0 + 6.5, yf + 1.12, zm), weiss);
    for (const o of [firstM, schorn, kappe]) { o.castShadow = true; gr.add(o); this._zaehle(o); }
    // Fenster und Tür an Ost- und Südseite (Sprossen, weiße Rahmen, Sohlbank)
    const teileW = [], teileG = [], teileT = [];
    const fenster = (achse, a, z, y, w, h, nach) => {
      const d = 0.06, s = nach;   // nach = Vorzeichen der Außennormalen (−1 Ost/Süd)
      if (achse === "x") {      // Ostwand: Ebene x = a
        teileG.push(box(0.02, h, w, a + s * 0.01, y, z));
        teileW.push(box(d, 0.07, w + 0.14, a + s * d / 2, y + h / 2, z), box(d, 0.07, w + 0.14, a + s * d / 2, y - h / 2, z), box(d, h, 0.07, a + s * d / 2, y, z - w / 2), box(d, h, 0.07, a + s * d / 2, y, z + w / 2));
        teileW.push(box(0.035, h, 0.035, a + s * 0.04, y, z), box(0.035, 0.035, w, a + s * 0.04, y + h / 6, z), box(0.035, 0.035, w, a + s * 0.04, y - h / 6, z));
        teileW.push(box(0.16, 0.06, w + 0.24, a + s * 0.08, y - h / 2 - 0.05, z));
      } else {                  // Südwand: Ebene z = a
        teileG.push(box(w, h, 0.02, z, y, a + s * 0.01));
        teileW.push(box(w + 0.14, 0.07, d, z, y + h / 2, a + s * d / 2), box(w + 0.14, 0.07, d, z, y - h / 2, a + s * d / 2), box(0.07, h, d, z - w / 2, y, a + s * d / 2), box(0.07, h, d, z + w / 2, y, a + s * d / 2));
        teileW.push(box(0.035, h, 0.035, z, y, a + s * 0.04), box(w, 0.035, 0.035, z, y + h / 6, a + s * 0.04), box(w, 0.035, 0.035, z, y - h / 6, a + s * 0.04));
      }
    };
    fenster("x", H.x0, -10.6, WARFT.y + 1.35, 0.95, 1.15, -1);
    for (const x of [3.6, 6.6, 9.6, 12.6, 15.6, 18.0]) fenster("z", H.z0, x, WARFT.y + 1.35, 0.95, 1.15, -1);
    // Tür (grün, zweiflügelig, Oberlicht) an der Ostwand
    const tz = -13.3, ty = WARFT.y;
    teileT.push(box(0.07, 2.0, 1.1, H.x0 - 0.03, ty + 1.0, tz));
    teileW.push(box(0.08, 0.1, 1.3, H.x0 - 0.04, ty + 2.08, tz), box(0.08, 2.1, 0.1, H.x0 - 0.04, ty + 1.05, tz - 0.6), box(0.08, 2.1, 0.1, H.x0 - 0.04, ty + 1.05, tz + 0.6));
    teileW.push(box(0.09, 0.05, 0.05, H.x0 - 0.08, ty + 1.0, tz - 0.25), box(0.3, 0.12, 1.4, H.x0 - 0.15, ty + 0.03, tz));
    const mW = new THREE.Mesh(vereine(teileW), weiss), mG = new THREE.Mesh(vereine(teileG), this.glasMat), mT = new THREE.Mesh(vereine(teileT), gruen);
    for (const o of [mW, mG, mT]) { o.castShadow = o !== mG; o.receiveShadow = true; gr.add(o); this._zaehle(o); }
    // Hoflampe über der Tür
    const lamp = new THREE.Group();
    lamp.add(new THREE.Mesh(box(0.05, 0.05, 0.4, -0.18, 0.12, 0), new THREE.MeshStandardMaterial({ color: "#1A1A1A", roughness: 0.6 })));
    this.lampenGlas = new THREE.MeshStandardMaterial({ color: "#FFF2D0", emissive: "#FFC070", emissiveIntensity: 0, roughness: 0.4 });
    lamp.add(new THREE.Mesh(box(0.16, 0.22, 0.16, -0.32, 0.0, 0), this.lampenGlas));
    lamp.add(new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.1, 4).translate(-0.32, 0.16, 0), new THREE.MeshStandardMaterial({ color: "#1A1A1A", roughness: 0.6 })));
    lamp.position.set(H.x0, ty + 2.42, -15.6); gr.add(lamp);
    // Reet-Fransen an der Traufe (zittern im Sturm)
    // Halm von y = 0 (Ansatz) bis y = 1 (Spitze); die Instanz steht kopf (Drehung um x), die Spitze hängt nach unten und schwingt im Wind-Shader
    const fr = new THREE.PlaneGeometry(0.008, 1, 1, 3); fr.translate(0, 0.5, 0);
    const pp = fr.getAttribute("position"); const fc = new Float32Array(pp.count * 3);
    for (let i = 0; i < pp.count; i++) { const k = pp.getY(i); fc[i * 3] = 0.42 - 0.16 * k; fc[i * 3 + 1] = 0.36 - 0.14 * k; fc[i * 3 + 2] = 0.25 - 0.1 * k; }
    fr.setAttribute("color", new THREE.BufferAttribute(fc, 3));
    const ex0 = H.x0 - H.ueber, ex1 = H.x1 + H.ueber, ez0 = H.z0 - H.ueber, ez1 = H.z1 + H.ueber, ty0 = H.traufe - 0.05 - 0.38;
    const kanten = [[[ex0, ez0], [ex1, ez0]], [[ex1, ez0], [ex1, ez1]], [[ex1, ez1], [ex0, ez1]], [[ex0, ez1], [ex0, ez0]]];
    let L = 0; for (const [a, b] of kanten) L += Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.floor(L / 0.018), im = new THREE.InstancedMesh(fr, windMat({}, this.bu, { lean: 0.6, flatter: 1.6 }), n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let k = 0;
    for (const [a, b] of kanten) { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), cnt = Math.floor(l / 0.018); for (let i = 0; i < cnt && k < n; i++, k++) {
      const f = (i + hash(k, 41)) / cnt, x = lerp(a[0], b[0], f), z = lerp(a[1], b[1], f), lang = 0.04 + 0.08 * hash(k, 42);
      e.set(Math.PI + (hash(k, 47) - 0.5) * 0.3, hash(k, 43) * 3.14, 0, "YXZ"); q.setFromEuler(e);
      M.compose(new THREE.Vector3(x + 0.04 * (hash(k, 44) - 0.5), ty0 + 0.05, z + 0.04 * (hash(k, 45) - 0.5)), q, new THREE.Vector3(1 + hash(k, 46), lang, 1)); im.setMatrixAt(k, M);
    } }
    im.count = k; gr.add(im); this._zaehle(im, k);
    // Regentonne und Bank an der Ostwand
    const holz = new THREE.MeshStandardMaterial({ color: "#4A3424", roughness: 0.85 });
    const tonne = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.29, 0.9, 14).translate(H.x0 - 0.4, WARFT.y + 0.45, -9.6), holz); tonne.castShadow = true; gr.add(tonne);
    const bank = new THREE.Mesh(vereine([box(0.42, 0.06, 1.6, H.x0 - 0.3, WARFT.y + 0.46, -11.9), box(0.06, 0.46, 1.5, H.x0 - 0.08, WARFT.y + 0.72, -11.9), box(0.36, 0.44, 0.06, H.x0 - 0.3, WARFT.y + 0.22, -12.6), box(0.36, 0.44, 0.06, H.x0 - 0.3, WARFT.y + 0.22, -11.2)]), holz);
    bank.castShadow = true; gr.add(bank);
    this.szene.add(gr);
  }
  _barometer() {
    const g = new THREE.Group(), r = BARO.r;
    const holz = new THREE.MeshStandardMaterial({ color: "#5A3A22", roughness: 0.55, metalness: 0 });
    const messing = new THREE.MeshStandardMaterial({ color: "#9C7A36", roughness: 0.42, metalness: 0.85 });
    const brett = new THREE.Shape(); brett.absarc(0, 0, r, 0, Math.PI * 2, false);
    const bg = new THREE.ExtrudeGeometry(brett, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 64 });
    const b = new THREE.Mesh(bg, holz); b.castShadow = true; g.add(b);
    const zier = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.06, 24).rotateX(Math.PI / 2).translate(0, r + 0.03, 0.02), holz); g.add(zier);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.76, 0.022, 16, 96).translate(0, 0, 0.055), messing); ring.castShadow = true; g.add(ring);
    const blatt = new THREE.Mesh(new THREE.CircleGeometry(r * 0.75, 96).translate(0, 0, 0.05), new THREE.MeshStandardMaterial({ map: zifferblattTextur(), roughness: 0.75 }));
    g.add(blatt);
    this.zeiger = new THREE.Mesh(zeigerGeo(r * 0.66, 0.012, r * 0.2), new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.35, metalness: 0.4 }));
    this.zeiger.position.z = 0.062; g.add(this.zeiger);
    this.schlepp = new THREE.Mesh(zeigerGeo(r * 0.6, 0.008, 0.01), messing); this.schlepp.position.z = 0.068; g.add(this.schlepp);
    const nabe = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 20).rotateX(Math.PI / 2).translate(0, 0, 0.074), messing); g.add(nabe);
    const glas = new THREE.Mesh(new THREE.CircleGeometry(r * 0.76, 64).translate(0, 0, 0.082), new THREE.MeshStandardMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.08, roughness: 0.04, metalness: 0.9, depthWrite: false }));
    g.add(glas);
    g.position.set(...BARO.pos); g.rotation.y = -Math.PI / 2;
    this.szene.add(g); this.baro = g;
  }
  baroBlick(abstand = 1.2, { hoch = -0.12, seit = 0.18, pitchExtra = 0 } = {}) {
    const [bx, by, bz] = BARO.pos, pos = [bx - abstand, by + hoch, bz + seit];
    const dx = bx - pos[0], dy = by - pos[1], dz = bz - pos[2];
    const yaw = Math.atan2(dx, -dz) / D2R, pitch = Math.atan2(dy, Math.hypot(dx, dz)) / D2R + pitchExtra;
    return { pos, yaw, pitch };
  }
  _zaun() {
    const holz = new THREE.MeshStandardMaterial({ color: "#5B4A38", roughness: 0.9 }), pf = [], dr = [];
    const linie = (a, b, n) => { for (let i = 0; i <= n; i++) { const f = i / n, x = lerp(a[0], b[0], f), z = lerp(a[1], b[1], f), y = hoehe(x, z); pf.push(box(0.1, 1.15, 0.1, x, y + 0.5, z)); } };
    linie([-30, -44], [90, -46], 40); linie([14, -46], [14, -82], 12); linie([-30, -44], [-30, -80], 12);
    const m = new THREE.Mesh(vereine(pf), holz); m.castShadow = true; this.szene.add(m); this._zaehle(m);
    const pts = [];
    const draht = (a, b, n, hh) => { for (let i = 0; i < n; i++) { const f0 = i / n, f1 = (i + 1) / n; const p0 = [lerp(a[0], b[0], f0), lerp(a[1], b[1], f0)], p1 = [lerp(a[0], b[0], f1), lerp(a[1], b[1], f1)];
      pts.push(p0[0], hoehe(p0[0], p0[1]) + hh, p0[1], p1[0], hoehe(p1[0], p1[1]) + hh, p1[1]); } };
    for (const hh of [0.55, 0.9]) { draht([-30, -44], [90, -46], 40, hh); draht([14, -46], [14, -82], 12, hh); draht([-30, -44], [-30, -80], 12, hh); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    this.szene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: "#3A3836", transparent: true, opacity: 0.7 })));
  }
  _nachbarn() {
    const reet = reetMaterial(this.bu), klinker = klinkerMaterial(this.bu), baum = new THREE.MeshStandardMaterial({ color: "#2F3424", roughness: 0.95, flatShading: true });
    const hausL = [], dachL = [], baeumeL = [];
    const haus = (x, z, l, b, y, rot) => {
      const s = Math.sin(rot), c = Math.cos(rot), T = (g) => { g.rotateY(rot); g.translate(x, 0, z); return g; };
      hausL.push(T(box(l, 2.5, b, 0, y + 1.2, 0)));
      dachL.push(T(walmDach(-l / 2 - 0.5, l / 2 + 0.5, -b / 2 - 0.5, b / 2 + 0.5, y + 2.45, 50).geo));
      void s; void c;
    };
    const warften = [[NACHBAR.x, NACHBAR.z, 4.2, [[-6, 2, 16, 8, 0.3], [9, -8, 13, 7, -0.2], [2, 13, 11, 7, 1.4]]],
      [-1300, -2600, 3.6, [[0, 0, 16, 8, 0.1], [14, 6, 12, 7, 0.4]]], [1900, -3500, 3.6, [[0, 0, 18, 9, -0.3], [-16, 8, 12, 7, 0.9], [10, -12, 10, 7, 0.2]]],
      [-300, -5200, 3.4, [[0, 0, 16, 8, 0.6], [16, -4, 13, 7, 0.1]]], [4200, -6100, 3.2, [[0, 0, 14, 8, 0.2]]]];
    const wGeo = [];
    warften.forEach(([wx, wz, wy, haeuser], wi) => {
      if (wi > 0) { const w = new THREE.CylinderGeometry(34, 62, wy + 1.6, 28, 1); w.translate(wx, (wy + 1.6) / 2 - 1.6, wz); wGeo.push(w); }
      for (const [dx, dz, l, b, rot] of haeuser) haus(wx + dx, wz + dz, l, b, wy, rot);
      for (let i = 0; i < (wi === 0 ? 7 : 4); i++) { const a = hash(i + wi * 13, 81) * 6.28, rr = 8 + 12 * hash(i + wi * 13, 82), x = wx + Math.cos(a) * rr, z = wz + Math.sin(a) * rr, s = 3.5 + 3 * hash(i, 83);
        const k = klumpen(9, 300 + i + wi * 20, { flach: 0.85 }); k.scale(s, s * 1.15, s); k.translate(x, wy + s * 1.1 + 1.4, z); baeumeL.push(k);
        const st = new THREE.CylinderGeometry(0.18, 0.3, 2.4, 6); st.translate(x, wy + 1.2, z); baeumeL.push(st); }
    });
    const ws = new THREE.Mesh(vereine(wGeo), bodenMaterial(this.bu)); ws.receiveShadow = true; this.szene.add(ws);
    const hm = new THREE.Mesh(vereine(hausL), klinker), dm = new THREE.Mesh(vereine(dachL), reet);
    const bm = new THREE.Mesh(vereine(baeumeL.map((g) => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute("color"); n.deleteAttribute("uv"); return n; })), baum);
    for (const o of [hm, dm, bm]) { o.castShadow = true; o.receiveShadow = true; this.szene.add(o); this._zaehle(o); }
  }
  _gras(n) {
    // Büschel: 7 schmale, gebogene Halme, Höhe 1 (Spitze heller)
    const pos = [], col = [];
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4 + 0.3, r = 0.03 + 0.07 * (i % 3) / 2, x = Math.cos(a) * r, z = Math.sin(a) * r, w = 0.03, nx = -Math.sin(a) * w, nz = Math.cos(a) * w;
      const h = 0.7 + 0.3 * ((i * 5) % 7) / 6, ox = Math.cos(a) * (0.25 + 0.1 * (i % 2)), oz = Math.sin(a) * (0.25 + 0.1 * (i % 2));
      const m = [x + ox * 0.45, h * 0.55, z + oz * 0.45];
      pos.push(x - nx, 0, z - nz, x + nx, 0, z + nz, m[0] + nx * 0.6, m[1], m[2] + nz * 0.6, x - nx, 0, z - nz, m[0] + nx * 0.6, m[1], m[2] + nz * 0.6, m[0] - nx * 0.6, m[1], m[2] - nz * 0.6,
        m[0] - nx * 0.6, m[1], m[2] - nz * 0.6, m[0] + nx * 0.6, m[1], m[2] + nz * 0.6, x + ox, h, z + oz);
      for (const yy of [0, 0, 0.55, 0, 0.55, 0.55, 0.55, 0.55, 1]) { const f = 0.55 + 0.45 * yy; col.push(f, f, f * 0.95); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const im = new THREE.InstancedMesh(g, windMat({ roughness: 0.85 }, this.bu), n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color();
    let k = 0;
    for (let i = 0; k < n && i < n * 3; i++) {
      const r = 1.2 + 140 * Math.pow(hash(i, 61), 2.2), a = hash(i, 62) * Math.PI * 2;
      // bevorzugt der Blickbereich nach Süden/Südwesten
      const aa = r < 14 || hash(i, 67) >= 0.75 ? a : lerp(-0.9, 1.2, hash(i, 68)) - Math.PI / 2;
      const x = -2.2 + Math.cos(aa) * r, z = -13.2 + Math.sin(aa) * r;
      if (x > HAUS.x0 - 0.6 && x < HAUS.x1 + 0.6 && z > HAUS.z0 - 0.6 && z < HAUS.z1 + 0.6) continue;
      if (Math.hypot(x + 2.2, z + 13.2) < 0.9) continue;
      const y = hoehe(x, z);
      if (y < 0.55) continue;
      const aufWarft = y > 3.5, hoch = (aufWarft ? 0.24 : 0.26) + (aufWarft ? 0.2 : 0.3) * hash(i, 63);
      e.set((hash(i, 64) - 0.5) * 0.25, hash(i, 65) * 6.28, (hash(i, 69) - 0.5) * 0.25); q.setFromEuler(e);
      const br = hoch * (1.4 + 1.2 * hash(i, 66));
      M.compose(new THREE.Vector3(x, y - 0.03, z), q, new THREE.Vector3(br, hoch, br)); im.setMatrixAt(k, M);
      const v = hash(i, 70);
      cc.setRGB(...(v < 0.5 ? [0.36, 0.40, 0.2] : v < 0.85 ? [0.5, 0.46, 0.25] : [0.48, 0.34, 0.22])).multiplyScalar(0.85 + 0.3 * hash(i, 71));
      im.setColorAt(k, cc); k++;
    }
    im.count = k; im.frustumCulled = false; this.szene.add(im); this._zaehle(im, k);
  }
  _schafe(n) {
    const G = schafGeo();
    const wolle = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.95, flatShading: false });
    const dunkel = new THREE.MeshStandardMaterial({ color: "#2B2522", roughness: 0.8 });
    this.schafW = new THREE.InstancedMesh(G.wolle, wolle, n); this.schafB = new THREE.InstancedMesh(G.beine, dunkel, n); this.schafK = new THREE.InstancedMesh(G.kopf, dunkel, n);
    this.schafS = new THREE.InstancedMesh(G.schopf, wolle, n);
    for (const m of [this.schafW, this.schafB, this.schafK, this.schafS]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.szene.add(m); this._zaehle(m, n); }
    const cc = new THREE.Color();
    // Zielplätze an der Hauswand (Ostseite und Südostecke, Lee)
    const ziele = [];
    for (let i = 0; i < 22; i++) {
      const r = i < 12 ? [-2.6 + (i % 4) * 1.05 + 0.25 * (hash(i, 11) - 0.5), -18.2 - Math.floor(i / 4) * 0.85] : [HAUS.x0 + 0.6 + (i - 12) * 1.0, HAUS.z0 - 0.85 - 0.95 * ((i - 12) % 2)];
      ziele.push(r);
    }
    this.schafDaten = [];
    for (let i = 0; i < n; i++) {
      let x, z;
      if (i < 22) { x = -20 + 75 * hash(i, 21); z = -32 - 40 * hash(i, 22); }
      else { x = -40 + 120 * hash(i, 23); z = -30 - 60 * hash(i, 24); if (i > 40) { z = -125 - 50 * hash(i, 25); } }
      if (prielAbstand(x, z) < prielW(x) / 2 + bankW(x) + 2) z += 14;
      this.schafDaten.push({ x, z, ziel: i < 22 ? ziele[i] : null, verz: hash(i, 26), ph: hash(i, 27) * 6.28, rot: hash(i, 28) * 6.28, sk: 0.9 + 0.2 * hash(i, 29) });
      cc.setRGB(0.86, 0.82, 0.74).multiplyScalar(0.8 + 0.22 * hash(i, 30)); this.schafW.setColorAt(i, cc); this.schafS.setColorAt(i, cc);
    }
    this.schafM = new THREE.Matrix4(); this.schafQ = new THREE.Quaternion(); this.schafV = new THREE.Vector3(); this.schafE = new THREE.Euler(); this.schafSk = new THREE.Vector3();
  }
  _schafePos(i, weide, sammeln) {
    const s = this.schafDaten[i];
    const wx = s.x + 1.6 * Math.sin(weide * 0.05 + s.ph) + 0.8 * Math.sin(weide * 0.13 + s.ph * 2.1);
    const wz = s.z + 1.6 * Math.cos(weide * 0.045 + s.ph * 1.3) + 0.8 * Math.sin(weide * 0.11 + s.ph);
    if (!s.ziel) {   // ferne Schafe rücken bei Sturm zu Gruppen zusammen
      const g = smoothstep(0, 1, sammeln), cx = Math.round(s.x / 30) * 30, cz = Math.round(s.z / 25) * 25;
      return [lerp(wx, cx + 2.5 * Math.sin(s.ph), g * 0.8), lerp(wz, cz + 2 * Math.cos(s.ph), g * 0.8), g];
    }
    const p = smoothstep(s.verz * 0.45, s.verz * 0.45 + 0.55, sammeln);
    return [lerp(wx, s.ziel[0], p), lerp(wz, s.ziel[1], p), p];
  }
  _moewen(n) {
    this.moewe1 = new Voegel(this.szene, { anzahl: Math.ceil(n * 0.6), seed: 91, farbe: "#EEF1F3", spannweite: 1.15 }).schwarm({ zentrum: [24, 26, -85], radius: 42, hoehe: 10, tempo: 9, anzahl: Math.ceil(n * 0.6), skala: 1 });
    this.moewe2 = new Voegel(this.szene, { anzahl: Math.floor(n * 0.4), seed: 97, farbe: "#E6EAEE", spannweite: 1.1 }).schwarm({ zentrum: [-4, 14, -42], radius: 16, hoehe: 5, tempo: 7, anzahl: Math.floor(n * 0.4), skala: 1 });
    this._zaehle(this.moewe1.mesh, this.moewe1.n); this._zaehle(this.moewe2.mesh, this.moewe2.n);
  }
  update(t, z = {}) {
    const { kamera, sonne = { hoehe: 5, az: 140 }, bewoelkung = 0.15, zirren = 0.5, sturm = 0.2, dunkel = 0, saum = 0, pegel = 0, schaum = 0, lampe = 0, regen = 0,
      wolkenZeit = t, windZeit = t, weideZeit = t, sammeln = 0, moewenTief = 0, moewenFlucht = null, hpa = 1013, schlepp = 985, zucken = 0 } = z;
    const U = this.u;
    const sd = richtung(sonne.az - 180, sonne.hoehe);
    U.hSonne.value.set(...sd);
    const tief = 1 - smoothstep(2, 16, sonne.hoehe), unter = smoothstep(0.5, -3, sonne.hoehe);
    const deck = smoothstep(0.55, 1.0, bewoelkung), hell = (1 - 0.86 * dunkel) * (1 - 0.35 * deck);
    const mix3 = (a, b, f) => C(a).lerp(C(b), clamp(f));
    // Himmelsfarben: klarer Wintermorgen → bleiern → Abendrot → Nacht
    U.hZenit.value.copy(mix3("#4F78B2", "#6E7A88", deck)).lerp(C("#141A24"), dunkel).multiplyScalar(lerp(1, 0.75, deck));
    U.hHorizont.value.copy(mix3("#DCE2E6", "#E9D6BC", tief * 0.55)).lerp(C("#8F959C"), deck * 0.85).lerp(C("#1A1E25"), dunkel);
    U.hUnten.value.copy(mix3("#7D806F", "#3E4246", deck)).lerp(C("#0B0D10"), dunkel);
    U.hGlut.value.copy(mix3("#FFC27A", "#FF8A3C", tief)).multiplyScalar((0.85 * (1 - deck * 0.8) + 0.9 * saum) * (1 - unter * (1 - saum)) * (1 - dunkel));
    U.hSonnenF.value.copy(mix3("#FFF3DE", "#FFB46A", tief)).multiplyScalar(1 - dunkel);
    U.hWolkeHell.value.copy(mix3("#FFF8EE", "#FFD9B0", tief * 0.6)).multiplyScalar(hell);
    U.hWolkeDunkel.value.copy(mix3("#9AA3B0", "#6B7380", sturm)).multiplyScalar(hell);
    U.hDecke.value.copy(mix3("#7C838C", "#4C525A", sturm)).lerp(C("#1C2027"), dunkel).multiplyScalar(1 - 0.25 * dunkel);
    U.hZirrF.value.copy(C("#F4F6F9")).multiplyScalar(hell);
    U.hSaumF.value.copy(C("#FF4A1C")).multiplyScalar(1 - dunkel * 0.9);
    U.hBew.value = bewoelkung; U.hZirr.value = zirren * (1 - deck); U.hSaum.value = saum; U.hSonneSicht.value = (1 - unter) * (1 - deck * (1 - saum));
    U.hWOff.value.set(-WIND[0] * wolkenZeit * 0.004, -WIND[1] * wolkenZeit * 0.004);
    U.hZOff.value.set(wolkenZeit * 0.0016, 0);
    if (kamera) this.himmelMesh.position.copy(kamera.position);
    // Nebel = Horizont
    this.szene.fog.color.copy(U.hHorizont.value).multiplyScalar(0.92);
    this.szene.fog.density = lerp(8e-5, 2.4e-4, deck * 0.6 + sturm * 0.25 + dunkel * 0.3);
    // Licht
    const L = this.sonne, sichtbar = (1 - deck * 0.92) * (1 - unter);
    const lichtHoehe = Math.max(sonne.hoehe, 7);   // Bodenlicht: tiefe Wintersonne, für die Fläche etwas angehoben
    const ld = richtung(sonne.az - 180, lichtHoehe);
    const ziel = kamera ? new THREE.Vector3().copy(kamera.position).add(new THREE.Vector3(0, 0, -1).applyQuaternion(kamera.quaternion).multiplyScalar(18)) : new THREE.Vector3(0, 0, -20);
    L.target.position.copy(ziel); L.position.set(ziel.x + ld[0] * 400, ziel.y + ld[1] * 400, ziel.z + ld[2] * 400);
    L.color.copy(mix3("#FFF0D8", "#FFC48A", tief)).lerp(C("#FF8A50"), saum * 0.7);
    L.intensity = 3.3 * sichtbar * (1 - dunkel) + 1.6 * saum * (1 - dunkel);
    this.hemi.color.copy(mix3("#B9CBE4", "#9AA2AE", deck)).lerp(C("#2A3346"), dunkel);
    this.hemi.groundColor.copy(mix3("#6B6648", "#3E3E36", deck)).lerp(C("#0E0F10"), dunkel);
    this.hemi.intensity = lerp(1.35, 1.05, deck) * (1 - 0.82 * dunkel) + 0.15;
    this.lampe.intensity = 9 * lampe; this.lampenGlas.emissiveIntensity = 4 * lampe;
    const fenster = smoothstep(0.15, 0.6, dunkel); this.glasMat.emissiveIntensity = 1.4 * fenster; this.fensterLicht.intensity = 5 * fenster;
    // Boden, Wasser
    this.bu.uPegel.value = pegel; this.bu.uSchaum.value = schaum; this.bu.uNass.value = regen; this.bu.uWZeit.value = windZeit; this.bu.uSturm.value = sturm;
    this.bu.uBew.value = bewoelkung; this.bu.uDunkel.value = dunkel;
    this.wasser.position.y = pegel;
    this.wu.wZeit.value = windZeit * 0.35; this.wu.wSturm.value = sturm; this.wu.wSchaum.value = schaum; this.wu.wDunkel.value = dunkel;
    this.wu.wTief.value.copy(mix3("#1E2C2E", "#2A3132", deck)).lerp(C("#06080A"), dunkel);
    this.wu.wSchaumF.value.copy(C("#E6EAEA")).multiplyScalar(hell * 0.9 + 0.1);
    // Schafe
    const M = this.schafM, Q = this.schafQ, V = this.schafV, E = this.schafE, Sk = this.schafSk;
    for (let i = 0; i < this.schafDaten.length; i++) {
      const s = this.schafDaten[i];
      const [x, zz, p] = this._schafePos(i, weideZeit, sammeln), [x2, z2] = this._schafePos(i, weideZeit + 0.6, sammeln + 0.004);
      const y = hoehe(x, zz) - 0.02, lauf = Math.hypot(x2 - x, z2 - zz);
      const ri = lauf > 1e-4 ? Math.atan2(-(z2 - zz), x2 - x) : s.rot;
      const grasen = (1 - smoothstep(0.05, 0.4, p)) * (0.5 + 0.5 * Math.sin(weideZeit * 0.9 + s.ph));
      const wackeln = 0.03 * Math.sin(weideZeit * 2.0 + s.ph) * (1 - p) + 0.05 * sturm * Math.sin(t * 9 + s.ph);
      E.set(0, ri, wackeln); Q.setFromEuler(E); Sk.setScalar(s.sk);
      M.compose(V.set(x, y, zz), Q, Sk); this.schafW.setMatrixAt(i, M); this.schafB.setMatrixAt(i, M);
      // Kopf: senkt sich beim Grasen
      const kopf = new THREE.Matrix4().compose(new THREE.Vector3(0.62, 0.86 - 0.32 * grasen, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.95 * grasen + 0.15)), new THREE.Vector3(1, 1, 1));
      const km = new THREE.Matrix4().multiplyMatrices(M, kopf); this.schafK.setMatrixAt(i, km); this.schafS.setMatrixAt(i, km);
    }
    for (const m of [this.schafW, this.schafB, this.schafK, this.schafS]) m.instanceMatrix.needsUpdate = true;
    // Möwen
    for (const [v, tiefe] of [[this.moewe1, 18], [this.moewe2, 7]]) {
      if (moewenFlucht != null && !v.fluchtE) v.flucht({ t0: moewenFlucht, richtung: [WIND[0], 0.25, WIND[1]], tempo: 24 });
      v.setze(t); v.mesh.position.y = -tiefe * moewenTief;
      v.mesh.material.color.copy(C("#EEF1F3")).multiplyScalar(lerp(1, 0.55, deck) * (1 - 0.8 * dunkel));
    }
    // Partikel
    if (kamera) {
      this.regen.setze(t, kamera, { deckkraft: 0.42 * regen, wind: [WIND[0] * 9 * sturm, 0, WIND[1] * 9 * sturm] });
      this.flocken.setze(t, kamera, { deckkraft: 0.75 * smoothstep(0.6, 0.95, sturm) * (1 - 0.5 * dunkel), wind: [WIND[0] * 16, 0.5, WIND[1] * 16], zentrum: [kamera.position.x, kamera.position.y - 1, kamera.position.z] });
    }
    // Barometer
    this.zeiger.rotation.z = -(baroWinkel(hpa) + zucken) * D2R;
    this.schlepp.rotation.z = -baroWinkel(schlepp) * D2R;
    // Nachbearbeitung
    this.post = {
      belichtung: lerp(1.04, 1.0, deck) * (1 + 0.35 * dunkel), saettigung: lerp(1.08, 0.78, deck) * (1 + 0.25 * saum), kontrast: lerp(1.04, 1.0, deck) + 0.04 * dunkel,
      tonung: [lerp(1.04, 0.96, deck) + 0.1 * saum, 1.0 - 0.02 * saum, lerp(0.95, 1.05, deck) - 0.08 * saum + 0.08 * dunkel], tonungStaerke: 0.25 + 0.15 * dunkel,
      bloomStaerke: 0.85 + 0.35 * saum + 0.4 * dunkel, bloomSchwelle: lerp(1.0, 0.85, dunkel), vignette: 0, koernung: 0.012,
    };
    this.zustand = { tief, deck, sichtbar };
  }
}
