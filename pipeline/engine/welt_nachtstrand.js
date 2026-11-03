// Grundwelt „Nachtstrand“ (Account 2 @stelldirvor.pov, Weltenkatalog „Meer und Küste“, .claude/skills/stelldirvor-video/themen-und-plan.md §2)
// Erstbau 03.11.2026 („Was wäre, wenn der Mond der Erde immer näher käme?“). NUR für den Baukasten Lunar-POV.
//
// Inhalt: breiter Atlantikstrand bei Nacht (generisch, Portugal-ähnlich) mit Bucht und ferner Landzunge (Leuchtturm mit kreisendem
// Strahl, Lichter eines Dorfes), Brandung mit Schaumbändern, nasser Sand mit Mondglanz und Rippeln, Dünen mit Strandhafer im Wind,
// Dünenzaun, Treibholz, Tanglinie, Fischerboot mit Laterne (liegt, schwimmt auf, wird mitgerissen), Felsen und Tang am Meeresgrund
// (sichtbar, wenn das Meer zurückweicht), Flutwand (Wasserberg mit Schaumkrone, rollt heran), Möwen, Mondwolken.
// Eigener Himmel `MondHimmel`: Sterne, Mond mit Maren und Kratern in wachsender Winkelgröße, Halo, Risse (Aufleuchten),
// Staub vom Mondrand, Zerbrechen (Bruchstücke treiben auseinander), Trümmerwolke und Trümmerband über den Himmel.
//
// Steuerung je Bild (alles Funktion von t, kein Zustand):
//   const welt = new Nachtstrand(szene, { schatten: true });
//   welt.setze(t, kamera, { pegel m, unruhe 0..2 (Wellenhöhe), wandFront m (u-Koordinate der Front), wandHoehe m, nassBis m,
//                           wind 0..1, mondDir [x,y,z], mondFarbe, himmelFarbe, licht (Mondlicht-Faktor für Wasserglanz) });
//   welt.wasserHoehe(x, z, t, w) → Wasserspiegel (m), dieselbe Formel wie der Shader (für Boot und Gischt)
//   welt.puffs(t, { … }) → { normal: [...], glow: [...] } für die zwei Puffs-Instanzen der Szene
//   welt.himmel.setze({ zenit, horizont, sterne, mondDir, mondR, mondHell, halo, risse, bruch, staubRand, wolke, band, blitz, zeit })
// Koordinaten: Kamera-Start über (0, 0), Blick nach −z aufs Meer. Land liegt links (x < Küste), das Meer rechts und voraus.
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { Voegel } from "./stil_lunar_pov.js";
import { Kuestenlinie } from "./welt_kueste_klippe.js";

// --------------------------------------------------------------------------------------------- Rauschen (JS, wie im Shader)
const fr = (x) => x - Math.floor(x);
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= 0.5; } return s; }
const ridge = (x, y) => { const v = 1 - Math.abs(fbm(x, y, 3) * 2 - 1); return v * v; };

/** Küste gespiegelt gespeichert: Punkte [z, x'] mit x' = −x, Land bei x' > Küste (also links im Bild). */
export const KUESTE_NACHTSTRAND = {
  punkte: [[2500, -900], [800, -300], [200, -110], [0, -40], [-40, -8], [-100, 22], [-250, 58], [-600, 95], [-1500, 150], [-3000, 260], [-4200, 420],
    [-5200, 520], [-6500, 420], [-9000, 250], [-14000, -200], [-30000, -1500]],
};
/** Richtung, aus der die Wellen und die Flutwand kommen (zeigt landwärts, u = Skalarprodukt mit D) */
export const WELLEN_D = (() => { const x = -0.3, z = 1, l = Math.hypot(x, z); return [x / l, z / l]; })();
const LEUCHTTURM = [-760, -4760];

export function gelaende(K) {
  const abstand = (x, z) => K.abstand(-x, z);          // > 0 Land
  const land = (x, z, d) => {
    let y = d < 30 ? 0.085 * d : 2.55 + 0.09 * Math.min(d - 30, 40);
    const duene = (5.5 + 6 * fbm(x * 0.006 + 3, z * 0.006, 3)) * smoothstep(32, 66, d) * (0.5 + 0.5 * ridge(x * 0.016, z * 0.016));
    y += duene + 1.4 * (vn(x * 0.11, z * 0.11) - 0.5) * smoothstep(34, 60, d) + 0.5 * (vn(x * 0.35, z * 0.35) - 0.5) * smoothstep(36, 50, d);
    y += 14 * smoothstep(250, 1600, d) * (0.5 + fbm(x * 0.0015, z * 0.0015, 3)) + 40 * smoothstep(1200, 5000, d) * fbm(x * 0.0007 + 7, z * 0.0007, 3);
    const dl = Math.hypot(x - LEUCHTTURM[0] - 120, z - LEUCHTTURM[1]);
    y += 48 * smoothstep(0, 70, d) * Math.exp(-(dl * dl) / (900 * 900)) * (0.8 + 0.4 * fbm(x * 0.004, z * 0.004, 3));
    return y;
  };
  const grund = (x, z, f) => {                           // f = Abstand ins Meer (m, > 0)
    let y = f < 15 ? -0.085 * f : -1.275 - 0.02 * (f - 15);
    if (f > 700) y = -15.3 - 30 * (1 - Math.exp(-(f - 700) / 900));
    y += 0.55 * Math.sin(f * 0.055 + fbm(x * 0.004, z * 0.004, 2) * 6) * smoothstep(25, 70, f) * (1 - smoothstep(280, 520, f)); // Sandbänke
    y += 2.6 * smoothstep(0.56, 0.8, fbm(x * 0.007 + 4, z * 0.007, 3)) * smoothstep(30, 90, f);                                   // Felsplatten
    y += 0.18 * (vn(x * 0.4, z * 0.4) - 0.5) * smoothstep(5, 20, f);
    return Math.min(y, -0.02);
  };
  const hoehe = (x, z) => { const d = abstand(x, z); return d >= 0 ? land(x, z, d) : grund(x, z, -d); };
  return { hoehe, abstand };
}

// --------------------------------------------------------------------------------------------- GLSL-Bausteine
const GLSL_NOISE = /* glsl */ `
float nH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float nN(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(nH(i), nH(i + vec2(1.0, 0.0)), u.x), mix(nH(i + vec2(0.0, 1.0)), nH(i + vec2(1.0, 1.0)), u.x), u.y); }
float nF(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * nN(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
vec3 nZelle(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0; vec2 id = vec2(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 o = vec2(nH(i + g), nH(i + g + 7.7));
    float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; id = i + g; } else if (d < d2) d2 = d; }
  return vec3(d1, d2, nH(id * 1.31 + 0.7)); }
`;
// Wellen (Dünung landwärts) und Flutwand – identisch in Vertex- und Fragment-Shader und in JS (wasserHoehe)
const GLSL_WELLEN = /* glsl */ `
uniform float zeit, unruhe, wandFront, wandHoehe; uniform vec2 wellenD;
float wandProfil(float u) {
  float hinter = max(wandFront - u, 0.0);
  float vorn = max(u - wandFront, 0.0);
  float f = (0.35 + 0.65 * exp(-hinter / 350.0)) * exp(-hinter / 2500.0) * (1.0 - smoothstep(0.0, 14.0 + wandHoehe * 0.6, vorn));
  return wandHoehe * f * (0.92 + 0.08 * sin(dot(vec2(-wellenD.y, wellenD.x), vec2(0.0)) ));
}
float wellen(vec2 p) {
  float u = dot(p, wellenD); float v = dot(p, vec2(-wellenD.y, wellenD.x));
  float y = 0.0;
  y += 0.55 * sin(u * 0.052 - zeit * 0.78 + sin(v * 0.004) * 2.0);
  y += 0.30 * sin(u * 0.093 + v * 0.021 - zeit * 1.15 + 1.3);
  y += 0.18 * sin(u * 0.17 - v * 0.05 - zeit * 1.7 + 2.1);
  y += 0.08 * sin(u * 0.41 + v * 0.13 - zeit * 2.6);
  return y * unruhe;
}
vec2 wellenGrad(vec2 p) { float e = 0.6; return vec2(wellen(p + vec2(e, 0.0)) - wellen(p - vec2(e, 0.0)), wellen(p + vec2(0.0, e)) - wellen(p - vec2(0.0, e))) / (2.0 * e); }
`;

function weltUniforms() {
  return { uZeit: { value: 0 }, uPegel: { value: 0 }, uNassBis: { value: 0 }, uWind: { value: 0.5 }, uMond: { value: new THREE.Vector3(0, 0.3, -1) } };
}

/** Gelände-Material: trockener und nasser Sand (Rippel, Glanz), Dünen mit Grasflecken, Meeresgrund (Sand, Fels, Tang), ferne Hügel */
function gelaendeMaterial(u, { fels = false } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.95, metalness: 0, flatShading: fels });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vNW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvNW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vNW; uniform float uZeit, uPegel, uNassBis;
float gNass = 0.0;
${GLSL_NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  vec3 W = vNW;
  vec3 Nw = normalize(cross(dFdx(W), dFdy(W))); if (Nw.y < 0.0) Nw = -Nw;
  float dc = length(W.xz - cameraPosition.xz);
  // Sand: trocken hell, Rippel quer zur Brandung
  float rippel = sin(dot(W.xz, vec2(-0.29, 0.96)) * 3.1 + nN(W.xz * 0.6) * 4.0) * 0.5 + 0.5;
  vec3 sand = mix(vec3(0.6, 0.55, 0.45), vec3(0.68, 0.62, 0.51), nN(W.xz * 0.08));
  sand *= 0.86 + 0.16 * nN(W.xz * 1.9) + 0.1 * rippel * (1.0 - smoothstep(30.0, 120.0, dc));
  sand *= 1.0 - 0.18 * smoothstep(0.55, 0.8, nN(W.xz * 0.25 + 9.0)) * (1.0 - smoothstep(20.0, 80.0, dc));   // Trittspuren, Mulden
  // Dünen: Grasflecken (Strandhafer aus der Ferne), dunkler Sand in den Mulden
  float duene = smoothstep(3.0, 6.0, W.y) * (1.0 - smoothstep(60.0, 200.0, W.y));
  float gras = smoothstep(0.45, 0.7, nF(W.xz * 0.05 + 3.0)) * duene;
  vec3 c = mix(sand, vec3(0.28, 0.31, 0.2) * (0.8 + 0.4 * nN(W.xz * 0.7)), gras * 0.85);
  // ferne Hügel und Landzunge: Macchia, Fels
  float huegel = smoothstep(14.0, 40.0, W.y);
  c = mix(c, mix(vec3(0.2, 0.22, 0.16), vec3(0.33, 0.31, 0.27), smoothstep(0.5, 0.8, 1.0 - Nw.y)) * (0.8 + 0.4 * nN(W.xz * 0.02)), huegel);
  // Meeresgrund: nasser dunkler Sand, Felsplatten, Tang
  float unter = 1.0 - smoothstep(-0.6, 0.3, W.y);
  vec3 grund = mix(vec3(0.42, 0.38, 0.31), vec3(0.3, 0.29, 0.27), smoothstep(0.5, 0.75, nF(W.xz * 0.007 + 4.0) + 0.1 * nN(W.xz * 0.2)));
  grund = mix(grund, vec3(0.16, 0.18, 0.11), smoothstep(0.58, 0.78, nN(W.xz * 0.045 + 2.0)) * 0.8 * smoothstep(-2.0, -5.0, W.y));
  grund *= 0.85 + 0.25 * nN(W.xz * 0.9);
  c = mix(c, grund, unter);
  if (${fels ? "true" : "false"}) c = mix(vec3(0.2, 0.19, 0.18), vec3(0.32, 0.3, 0.27), nN(W.xz * 0.9 + W.y)) * (0.8 + 0.3 * nN(W.xy * 2.0));
  // nass: alles unter der höchsten Wasserlinie bisher (dunkler, glänzend)
  gNass = 1.0 - smoothstep(uNassBis - 0.1, uNassBis + 0.35, W.y + 0.25 * nN(W.xz * 0.3));
  c *= mix(1.0, 0.45, gNass);
  diffuseColor.rgb = c;`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, ${fels ? "0.6" : "0.68"}, gNass * (0.7 + 0.3 * nN(vNW.xz * 0.5)));`);
  };
  return m;
}

// --------------------------------------------------------------------------------------------- Wasser
const WASSER_V = /* glsl */ `
${GLSL_WELLEN}
uniform float pegel;
varying vec3 vW; varying float vWand;
#include <fog_pars_vertex>
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  float u = dot(w.xz, wellenD);
  float wa = wandProfil(u);
  w.y = pegel + wellen(w.xz) * (1.0 - smoothstep(4.0, 22.0, wandHoehe) * 0.5) + wa;
  vW = w.xyz; vWand = wandHoehe > 0.01 ? wa / wandHoehe : 0.0;
  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const WASSER_F = /* glsl */ `
${GLSL_WELLEN}
uniform float pegel, licht; uniform vec3 tief, flach, himmel, mondDir, mondFarbe; uniform sampler2D grundTex; uniform vec4 grundBox;
varying vec3 vW; varying float vWand;
#include <fog_pars_fragment>
${GLSL_NOISE}
void main() {
  vec3 V = normalize(cameraPosition - vW);
  float d = length(cameraPosition.xz - vW.xz);
  vec2 uvG = (vW.xz - grundBox.xy) / grundBox.zw;
  float grund = (uvG.x > 0.0 && uvG.x < 1.0 && uvG.y > 0.0 && uvG.y < 1.0) ? texture2D(grundTex, uvG).r : -40.0;
  float tiefe = vW.y - grund;
  vec2 g = wellenGrad(vW.xz) * (1.0 - smoothstep(4.0, 22.0, wandHoehe) * 0.5);
  float u = dot(vW.xz, wellenD), e = 1.5;
  float wg = (wandProfil(u + e) - wandProfil(u - e)) / (2.0 * e);
  g += wellenD * wg;
  float fein = 0.35 + unruhe * 0.25;
  g += (vec2(nN(vW.xz * 0.21 + zeit * 0.31), nN(vW.zx * 0.23 - zeit * 0.27)) - 0.5) * fein / (1.0 + d / 300.0);
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N);
  vec3 M = normalize(mondDir);
  float s = max(dot(R, M), 0.0);
  float funkel = smoothstep(0.42, 0.78, nN(vW.xz * 0.45 + vec2(zeit * 1.1, -zeit * 0.8)));     // stetig (kein Takt-Flackern)
  vec3 wasserF = mix(flach, tief, max(smoothstep(1.0, 14.0, tiefe), smoothstep(0.05, 0.3, vWand)));
  vec3 col = mix(wasserF, himmel, fres * 0.85);
  float wandF = smoothstep(0.02, 0.4, vWand) * smoothstep(0.15, 0.9, length(g));
  col += mondFarbe * licht * (min(pow(s, 260.0) * 5.0 * (0.2 + 0.8 * funkel), 2.2) + pow(s, 40.0) * 0.12 + pow(s, 8.0) * 0.02) * (1.0 - 0.85 * wandF);
  // Brandung: Schaumbänder laufen aufs Ufer zu, Schaum an der Wasserlinie
  float ufer = 1.0 - smoothstep(0.0, 0.7 + unruhe * 0.9, tiefe);
  float band = smoothstep(0.6, 0.95, sin(u * 0.052 - zeit * 0.78 + 1.2 + nN(vW.xz * 0.04) * 3.0) * 0.5 + 0.5);
  float schaum = ufer * (0.25 + 0.75 * band) * smoothstep(0.3, 0.62, nN(vW.xz * 0.35 + zeit * 0.25));
  schaum += (1.0 - smoothstep(0.0, 0.12 + 0.12 * unruhe, tiefe)) * 0.8;
  // Schaumkronen draußen, dichter bei unruhiger See
  float krone = smoothstep(0.35, 0.9, (wellen(vW.xz) / max(unruhe, 0.05)) * 0.6 + 0.2);
  schaum += krone * smoothstep(0.55, 0.85, nN(vW.xz * 0.09 - zeit * 0.2)) * smoothstep(0.5, 1.4, unruhe) * 0.7;
  // Flutwand: dunkle Front, Schaumstreifen an der Wand, weiße Krone
  float wand = smoothstep(0.02, 0.4, vWand);
  float steil = smoothstep(0.15, 0.9, length(g));
  col = mix(col, mix(vec3(0.01, 0.025, 0.035), vec3(0.04, 0.1, 0.12), vWand * vWand), wand * 0.95);
  float streifen = smoothstep(0.55, 0.85, nN(vec2(dot(vW.xz, vec2(-wellenD.y, wellenD.x)) * 0.05, vW.y * 0.25 - zeit * 1.4)));
  schaum += wand * steil * streifen * 0.6 + smoothstep(0.8, 0.95, vWand) * (0.6 + 0.6 * smoothstep(0.3, 0.7, nN(vW.xz * 0.06 + zeit * 0.5))) * 1.4 * smoothstep(5.0, 15.0, wandHoehe);
  vec3 schaumF = vec3(0.78, 0.82, 0.86) * (0.35 + 0.65 * clamp(licht * 0.6, 0.0, 2.2));
  col = mix(col, schaumF, clamp(schaum, 0.0, 1.0) * (1.0 - smoothstep(1500.0, 6000.0, d) * 0.7));
  gl_FragColor = vec4(col, 1.0);
#include <fog_fragment>
}`;

/** Wassergitter: fein nahe der Kamera (Abstand 0,6 m), wachsend zur Ferne (gegen Einzelbild-Flackern, Lehre „Sonne näher“) */
function gitter(xVon, xBis, zVon, zBis, a, k, hoehe = () => 0) {
  const achse = (von, bis) => { const out = []; let x = 0; while (x < bis) { out.push(x); x += a + k * x; } out.push(bis); const neg = []; x = 0; while (x > von) { x -= a + k * -x; neg.push(Math.max(x, von)); } return [...neg.reverse(), ...out]; };
  const xs = achse(xVon, xBis), zs = achse(zVon, zBis);
  const nx = xs.length, nz = zs.length, pos = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const q = (j * nx + i) * 3; pos[q] = xs[i]; pos[q + 1] = hoehe(xs[i], zs[j]); pos[q + 2] = zs[j]; }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const A = j * nx + i, B = A + 1, C = A + nx, D = C + 1; idx.set([A, C, B, B, C, D], q); q += 6; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return { geo, n: nx * nz };
}

// --------------------------------------------------------------------------------------------- Himmel mit Mond
const HIMMEL_V = /* glsl */ `
varying vec3 vDir;
void main() { vDir = (modelMatrix * vec4(position, 0.0)).xyz; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const HIMMEL_F = /* glsl */ `
uniform vec3 zenit, horizont, unten, mondDir, mondFarbe, bandFarbe;
uniform float mondR, mondHell, halo, sterne, risse, bruch, staubRand, wolke, band, blitz, zeit, helligkeit, dunst;
varying vec3 vDir;
${GLSL_NOISE}
// Krater (eine Größenordnung): Zelle mit Mittelpunkt, Radius aus dem Hash
vec2 krater(vec2 q, float sk, vec2 L) {
  vec2 p = q * sk, i = floor(p), f = fract(p);
  float hell = 0.0, dunkel = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 gg = vec2(float(x), float(y)), id = i + gg;
    float h = nH(id + sk);
    if (h < 0.58) continue;
    vec2 c = gg + vec2(nH(id + 3.1), nH(id + 5.7)) * 0.8 + 0.1 - f;
    float r = 0.16 + 0.3 * nH(id + 9.3);
    float dd = length(c) / r;
    vec2 n = -c / max(length(c), 1e-4);
    float seite = dot(n, L);
    dunkel += (1.0 - smoothstep(0.55, 0.92, dd)) * (0.14 + 0.18 * max(seite, 0.0));
    hell += smoothstep(0.7, 0.92, dd) * (1.0 - smoothstep(0.92, 1.12, dd)) * (0.16 + 0.22 * max(-seite, 0.0));
    hell += (1.0 - smoothstep(1.0, 1.7, dd)) * smoothstep(0.95, 1.1, dd) * 0.04;
  }
  return vec2(hell, dunkel);
}
vec3 mondFlaeche(vec2 p, float mu) {
  vec2 q = vec2(asin(clamp(p.x / max(sqrt(1.0 - p.y * p.y), 1e-3), -1.0, 1.0)), asin(clamp(p.y, -1.0, 1.0)));   // Länge/Breite
  float a = 0.6 + 0.12 * nF(q * 3.0 + 1.0);
  float mare = smoothstep(0.48, 0.62, nF(q * 1.15 + vec2(2.0, 0.4)) + 0.18 * nN(q * 4.0));
  a *= mix(1.0, 0.5, mare);
  vec2 L = normalize(vec2(-0.5, 0.35));
  vec2 k1 = krater(q, 3.2, L), k2 = krater(q + 4.0, 7.5, L), k3 = krater(q + 9.0, 17.0, L);
  a += (k1.x + k2.x * 0.7 + k3.x * 0.4) * 0.45;
  a -= (k1.y + k2.y * 0.7 + k3.y * 0.35) * 0.45;
  float strahl = pow(nN(vec2(atan(q.y + 0.35, q.x - 0.25) * 9.0, 1.0)), 6.0) * exp(-length(q - vec2(0.25, -0.35)) * 2.2);
  a += strahl * 0.25;
  a *= 0.78 + 0.22 * pow(mu, 0.4);
  return vec3(a) * vec3(1.0, 0.985, 0.95);
}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float g = 1.0 - exp(-max(h, 0.0) / max(dunst, 1e-3));
  vec3 col = mix(horizont, zenit, g);
  col = mix(col, unten, smoothstep(0.0, -0.06, h));
  // Sterne (fest, langsames Funkeln)
  if (sterne > 0.001 && h > -0.01) {
    vec2 sp = vec2(atan(d.x, -d.z), asin(h)) * 330.0;
    vec2 si = floor(sp), sf = fract(sp) - 0.5;
    float sh = nH(si);
    if (sh > 0.972) {
      vec2 o = (vec2(nH(si + 1.7), nH(si + 4.1)) - 0.5) * 0.6;
      float st = smoothstep(0.32, 0.0, length(sf - o)) * (0.4 + 2.2 * pow((sh - 0.972) / 0.028, 3.0));
      st *= 0.8 + 0.2 * sin(zeit * (1.0 + 2.0 * nH(si + 8.0)) + sh * 40.0);
      col += vec3(0.85, 0.9, 1.0) * st * sterne * smoothstep(0.0, 0.08, h);
    }
    col += vec3(0.05, 0.06, 0.09) * sterne * smoothstep(0.55, 0.85, nF(vec2(atan(d.x, -d.z) * 2.0 + h * 3.0, h * 6.0 - atan(d.x, -d.z))));  // Milchstraßen-Schleier
  }
  vec3 s = normalize(mondDir);
  float cs = dot(d, s);
  float ang = acos(clamp(cs, -1.0, 1.0));
  float R = mondR;
  float aussen = max(ang - R, 0.0);
  col += mondFarbe * halo * (exp(-aussen / (0.03 + R * 0.35)) * 0.32 + exp(-aussen / (0.18 + R * 0.8)) * 0.1) / (1.0 + R * 6.0);
  vec3 e1 = normalize(cross(s, vec3(0.0, 1.0, 0.0))), e2 = cross(e1, s);
  vec2 p = cs > 0.0 ? vec2(dot(d, e1), dot(d, e2)) / cs / tan(R) : vec2(9.0);          // Scheibenkoordinaten (|p| = 1 am Rand)
  float rp = length(p);
  float um = atan(p.y, p.x);
  // Staub vom Mondrand (Fahnen nach außen)
  if (staubRand > 0.001 && rp > 0.9 && rp < 3.0) {
    float fahne = smoothstep(0.45, 0.8, nN(vec2(um * 14.0, rp * 3.0 - zeit * 0.5))) * smoothstep(0.4, 0.7, nN(vec2(um * 5.0 + 3.0, rp - zeit * 0.2)));
    col += vec3(0.75, 0.72, 0.68) * mondHell * 0.35 * fahne * exp(-(rp - 1.0) / (0.18 + 0.5 * bruch)) * staubRand;
  }
  // Trümmerwolke um den Mond (ab dem Bruch)
  if (wolke > 0.001 && rp < 6.0) {
    float n = nF(p * 1.6 + vec2(zeit * 0.05, -zeit * 0.03)) * 0.7 + nF(p * 4.5 - zeit * 0.08) * 0.3;
    float m = smoothstep(0.4, 0.78, n) * exp(-max(rp - 0.8, 0.0) / (0.25 + 0.8 * wolke));
    col = mix(col, vec3(0.5, 0.49, 0.48) * mondHell * (0.4 + 0.45 * n), clamp(m * wolke, 0.0, 0.75));
  }
  // Scheibe: ganz, mit Rissen, zerbrechend
  float b = bruch;
  vec2 pb = p / (1.0 + 0.55 * b + 0.35 * b * b);
  if (length(pb) < 1.02) {
    float mu = sqrt(max(1.0 - dot(pb, pb), 0.0));
    vec3 platte = nZelle(pb * 1.9 + 0.3);
    vec3 fein = nZelle(pb * 7.0 + 5.0);
    vec2 off = (vec2(nH(vec2(platte.z, 1.0)), nH(vec2(platte.z, 2.0))) - 0.5) * 0.18 * b;
    vec3 f = mondFlaeche(clamp(pb + off, -0.999, 0.999), mu);
    float rand = smoothstep(1.0 + 0.004 / max(R, 0.004), 0.995 - 0.004 / max(R, 0.004), length(pb));
    // Risse: wachsen vom erdnahen Punkt aus, erst die großen Platten, dann feine
    float wachs = smoothstep(risse * 1.9, risse * 1.9 - 0.35, length(pb - vec2(0.12, -0.18)));
    float kante = platte.y - platte.x, kanteF = fein.y - fein.x;
    float riss = (1.0 - smoothstep(0.0, 0.012 + 0.022 * risse, kante)) * wachs;
    riss += (1.0 - smoothstep(0.0, 0.006 + 0.006 * risse, kanteF)) * wachs * smoothstep(0.55, 0.95, risse) * 0.45 * step(0.45, fein.z);
    float luecke = 1.0 - smoothstep(0.004 + 0.12 * b, 0.014 + 0.12 * b, kante);
    float stueck = rand * (1.0 - step(0.001, b) * luecke);
    vec3 scheibe = f * mondHell * (1.0 - 0.55 * smoothstep(0.05, 1.0, b) * (0.5 + 0.5 * platte.z));
    scheibe *= 1.0 - 0.3 * riss;
    float glut = clamp(riss, 0.0, 1.0) * (0.75 + 0.25 * sin(zeit * 3.0 + platte.z * 20.0));
    glut += step(0.001, b) * (1.0 - smoothstep(0.0, 0.035, abs(kante - (0.009 + 0.12 * b)))) * (1.0 - 0.7 * b);
    scheibe += vec3(2.6, 1.7, 1.0) * glut * (0.6 + 0.6 * risse) * mondHell * 0.55;
    col = mix(col, scheibe, stueck);
  }
  // Trümmerband (zieht sich vom Mond aus über den Himmel)
  if (band > 0.001) {
    vec3 nb = normalize(cross(s, normalize(vec3(1.0, 0.42, -0.1))));
    float quer = asin(clamp(dot(d, nb), -1.0, 1.0));
    vec3 t1 = normalize(cross(nb, s));
    float phi = atan(dot(d, t1), dot(d, s));
    float breite = 0.02 + 0.07 * band;
    float laenge = band * 2.8;
    float m = exp(-pow(quer / breite, 2.0)) * smoothstep(laenge, laenge - 0.5, abs(phi));
    m *= 0.55 + 0.7 * nF(vec2(phi * 7.0 - zeit * 0.02, quer * 40.0));
    m += exp(-pow(quer / (breite * 0.25), 2.0)) * smoothstep(laenge, laenge - 0.3, abs(phi)) * 0.4 * nN(vec2(phi * 40.0, 1.0));
    col += bandFarbe * m * band;
  }
  col += mondFarbe * blitz * (exp(-aussen / 0.05) * 1.4 + 0.08);
  gl_FragColor = vec4(col * helligkeit, 1.0);
}`;

export class MondHimmel {
  constructor(szene, { radius = 9000 } = {}) {
    const C = (c) => new THREE.Color(c);
    this.u = {
      zenit: { value: C("#0B1426") }, horizont: { value: C("#25344F") }, unten: { value: C("#141C28") }, mondDir: { value: new THREE.Vector3(0.1, 0.28, -0.95).normalize() },
      mondFarbe: { value: C("#E6ECF7") }, bandFarbe: { value: C("#D9D2C8") }, mondR: { value: 0.01 }, mondHell: { value: 1.4 }, halo: { value: 0.6 }, sterne: { value: 1 },
      risse: { value: 0 }, bruch: { value: 0 }, staubRand: { value: 0 }, wolke: { value: 0 }, band: { value: 0 }, blitz: { value: 0 }, zeit: { value: 0 }, helligkeit: { value: 1 }, dunst: { value: 0.22 },
    };
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 48), new THREE.ShaderMaterial({ vertexShader: HIMMEL_V, fragmentShader: HIMMEL_F, uniforms: this.u, side: THREE.BackSide, depthWrite: false, fog: false }));
    this.mesh.renderOrder = -1000; this.mesh.frustumCulled = false;
    szene.add(this.mesh);
  }
  setze(w = {}) {
    for (const [k, v] of Object.entries(w)) {
      const u = this.u[k]; if (!u || v === undefined) continue;
      if (u.value.isColor) u.value.copy(v.isColor ? v : new THREE.Color(v));
      else if (u.value.isVector3) u.value.set(...(v.isVector3 ? v.toArray() : v)).normalize();
      else u.value = v;
    }
    return this;
  }
  folge(k) { this.mesh.position.copy(k.position); return this; }
  get horizont() { return this.u.horizont.value; }
}

// --------------------------------------------------------------------------------------------- Strandhafer (Halme im Wind)
function halmGeo() {
  const pos = [], hh = [];
  const B = [0.014, 0.01, 0.006, 0.0];
  for (let i = 0; i < 3; i++) {
    const y0 = i / 3, y1 = (i + 1) / 3, b0 = B[i], b1 = B[i + 1];
    const q = [[-b0, y0], [b0, y0], [b1, y1], [-b1, y1]];
    pos.push(q[0][0], q[0][1], 0, q[1][0], q[1][1], 0, q[2][0], q[2][1], 0, q[0][0], q[0][1], 0, q[2][0], q[2][1], 0, q[3][0], q[3][1], 0);
    hh.push(y0, y0, y1, y0, y1, y1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("lpH", new THREE.Float32BufferAttribute(hh, 1));
  g.computeVertexNormals();
  return g;
}
function halmMaterial(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.8, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
attribute float lpH; attribute vec2 lpZ; uniform float uZeit, uWind; varying float vH; varying vec2 vZ;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
  vH = lpH; vZ = lpZ;
  float px = instanceMatrix[3].x, pz = instanceMatrix[3].z;
  float boe = sin(uZeit * 0.9 + px * 0.21 + pz * 0.13) * 0.5 + 0.5;
  float w = (sin(uZeit * (2.2 + lpZ.y) + lpZ.x * 30.0 + px * 0.7) * 0.5 + sin(uZeit * 3.7 + pz * 1.3) * 0.25 + boe * 0.9) * uWind;
  transformed.x += (w * 0.2 + 0.04) * lpH * lpH;
  transformed.z += (0.08 * w) * lpH * lpH;`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying float vH; varying vec2 vZ;`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  vec3 c = mix(vec3(0.4, 0.43, 0.28), vec3(0.72, 0.68, 0.5), vZ.x * 0.6 + vH * 0.4);
  c *= 0.6 + 0.6 * vH;
  diffuseColor.rgb = c;`);
  };
  return m;
}

// --------------------------------------------------------------------------------------------- Fischerboot (Low-Poly, Rumpf blau-weiß-rot)
function bootGeo() {
  const g = new THREE.BoxGeometry(5.2, 1.0, 1.9, 12, 3, 4);
  const p = g.getAttribute("position"), col = [];
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const s = x / 2.6;                                          // −1 Heck … +1 Bug
    const breite = s > 0 ? Math.sqrt(Math.max(0, 1 - Math.pow(s, 2.2))) : 1 - 0.25 * Math.pow(-s, 3);
    const v = (y + 0.5);                                        // 0 Kiel … 1 Bordkante
    z *= breite * (0.35 + 0.65 * Math.pow(v, 0.6));
    y += 0.42 * Math.pow(Math.max(s, 0), 2) * v + 0.12 * Math.pow(Math.max(-s, 0), 2) * v;
    p.setXYZ(i, x, y, z);
    const c = v > 0.86 ? [0.85, 0.83, 0.78] : v > 0.72 ? [0.62, 0.12, 0.1] : [0.14, 0.32, 0.55];
    col.push(...c);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// --------------------------------------------------------------------------------------------- Welt
export class Nachtstrand {
  constructor(szene, { schatten = true, halme = 22000, seed = 11 } = {}) {
    this.szene = szene;
    this.K = new Kuestenlinie(KUESTE_NACHTSTRAND.punkte);
    this.G = gelaende(this.K);
    this.u = weltUniforms();
    const H = this.G.hoehe;
    this.augeY = H(0, 0) + 1.65;
    this.D = WELLEN_D;

    // Gelände: fein nahe der Kamera
    const T = gitter(-9000, 3000, -12000, 2500, 0.55, 0.012, H);
    T.geo.computeVertexNormals();
    this.boden = new THREE.Mesh(T.geo, gelaendeMaterial(this.u));
    this.boden.receiveShadow = schatten; this.boden.frustumCulled = false;
    szene.add(this.boden);
    this.vertices = T.n;
    const fern = new THREE.Mesh(new THREE.PlaneGeometry(140000, 140000, 140, 140).rotateX(-Math.PI / 2), gelaendeMaterial(this.u));
    fern.position.set(0, -46, 0); szene.add(fern); this.fern = fern;

    // Grund als Textur für das Wasser (Tiefe → Brandung, Farbe)
    const GB = [-1600, -2800, 3400, 3400], TW = 768, TH = 768, td = new Uint16Array(TW * TH * 4);
    for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
      const x = GB[0] + (i + 0.5) / TW * GB[2], z = GB[1] + (j + 0.5) / TH * GB[3], k = (j * TW + i) * 4;
      td[k] = THREE.DataUtils.toHalfFloat(H(x, z)); td[k + 1] = td[k + 2] = 0; td[k + 3] = THREE.DataUtils.toHalfFloat(1);
    }
    const tex = new THREE.DataTexture(td, TW, TH, THREE.RGBAFormat, THREE.HalfFloatType);
    tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
    this.wasserU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      zeit: { value: 0 }, unruhe: { value: 0.4 }, pegel: { value: 0 }, wandFront: { value: -20000 }, wandHoehe: { value: 0 }, wellenD: { value: new THREE.Vector2(...WELLEN_D) },
      licht: { value: 1 }, tief: { value: new THREE.Color("#050B12") }, flach: { value: new THREE.Color("#0E2630") }, himmel: { value: new THREE.Color("#2A3A55") },
      mondDir: { value: new THREE.Vector3(0.1, 0.28, -0.95).normalize() }, mondFarbe: { value: new THREE.Color("#E6ECF7") }, grundTex: { value: null }, grundBox: { value: new THREE.Vector4(...GB) },
    }]);
    this.wasserU.grundTex.value = tex;
    const Wg = gitter(-16000, 24000, -34000, 3000, 0.6, 0.016);
    this.wasser = new THREE.Mesh(Wg.geo, new THREE.ShaderMaterial({ vertexShader: WASSER_V, fragmentShader: WASSER_F, uniforms: this.wasserU, fog: true }));
    this.wasser.frustumCulled = false;
    szene.add(this.wasser);

    const mm = new THREE.Matrix4(), qq = new THREE.Quaternion(), ss = new THREE.Vector3(), pp = new THREE.Vector3(), yA = new THREE.Vector3(0, 1, 0);
    // Strandhafer: Horste an den Dünen um die Kamerawege, einzelne Horste am Dünenfuß (werden überspült)
    const hg = halmGeo(), zz = new Float32Array(halme * 2);
    const halmM = new THREE.InstancedMesh(hg, halmMaterial(this.u), halme);
    let n = 0;
    for (let i = 0; n < halme && i < halme * 8; i++) {
      const hx = -70 + 75 * hash(i, seed), hz = -45 + 100 * hash(i, seed + 1);
      const d = this.G.abstand(hx, hz);
      const horst = vn(hx * 0.45 + 3, hz * 0.45);
      const am = d > 35 ? smoothstep(0.42, 0.56, horst) : (d > 23 && d < 28 && hx < -3 ? smoothstep(0.62, 0.68, horst) * 0.8 : 0);
      if (hash(i, seed + 9) > am) continue;
      const h = (0.5 + 0.6 * hash(i, seed + 2) ** 1.3) * (0.7 + 0.6 * horst) * (d > 35 ? 1 : 0.8);
      pp.set(hx, H(hx, hz) - 0.03, hz); qq.setFromAxisAngle(yA, hash(i, seed + 3) * 6.28);
      qq.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (hash(i, seed + 4) - 0.5) * 0.7));
      ss.set(1 + hash(i, seed + 5), h, 1); mm.compose(pp, qq, ss); halmM.setMatrixAt(n, mm);
      zz[n * 2] = hash(i, seed + 6); zz[n * 2 + 1] = hash(i, seed + 7); n++;
    }
    halmM.count = n; hg.setAttribute("lpZ", new THREE.InstancedBufferAttribute(zz, 2));
    halmM.receiveShadow = schatten; halmM.frustumCulled = false; szene.add(halmM); this.halme = halmM;

    // Felsen: Felsgruppe in der Brandung rechts voraus, Blöcke und Riffköpfe am Meeresgrund, Steine am Dünenfuß
    const steinGeo = new THREE.IcosahedronGeometry(1, 1); const sp = steinGeo.getAttribute("position");
    for (let i = 0; i < sp.count; i++) { const f = 0.72 + 0.5 * hash(i, 31); sp.setXYZ(i, sp.getX(i) * f, sp.getY(i) * f * 0.75, sp.getZ(i) * f); }
    steinGeo.computeVertexNormals();
    const steinM = gelaendeMaterial(this.u, { fels: true });
    const steine = new THREE.InstancedMesh(steinGeo, steinM, 1400); let ns = 0;
    const fels = (x, z, r, hy = 0.6, dreh = 0) => { pp.set(x, H(x, z) + r * 0.1, z); qq.setFromEuler(new THREE.Euler(hash(ns, 47) * 0.6, dreh + hash(ns, 48) * 6, hash(ns, 49) * 0.6)); ss.set(r, r * hy, r * (0.8 + 0.4 * hash(ns, 50))); mm.compose(pp, qq, ss); steine.setMatrixAt(ns++, mm); };
    const GRUPPE = [[58, -96, 7, 1.2], [66, -104, 4.5, 1.5], [49, -88, 3.2, 1.1], [74, -92, 2.6, 1.0], [62, -112, 3, 1.3], [40, -170, 5, 1.0], [140, -260, 9, 0.9], [150, -275, 5, 1.2]];
    for (const [x, z, r, hy] of GRUPPE) fels(x, z, r, hy);
    for (let i = 0; i < 9000 && ns < 1250; i++) {
      const x = -400 + 1300 * hash(i, 141), z = -1300 + 1300 * hash(i, 142), d = this.G.abstand(x, z);
      if (d > -12 || d < -700) continue;
      const platte = fbm(x * 0.007 + 4, z * 0.007, 3);
      if (hash(i, 143) > 0.25 + 0.75 * smoothstep(0.5, 0.7, platte)) continue;
      fels(x, z, (0.5 + 2.6 * hash(i, 144) ** 2.2) * (1 + -d / 500), 0.45 + 0.4 * hash(i, 145));
    }
    for (let i = 0; i < 400 && ns < 1400; i++) {
      const x = -50 + 60 * hash(i, 151), z = -30 + 50 * hash(i, 152), d = this.G.abstand(x, z);
      if (d < 26 || d > 40 || hash(i, 153) > 0.4) continue;
      fels(x, z, 0.12 + 0.35 * hash(i, 154) ** 2, 0.6);
    }
    steine.count = ns; steine.castShadow = schatten; steine.receiveShadow = schatten; steine.frustumCulled = false; szene.add(steine); this.steine = steine;

    // Tang: Bänder am Meeresgrund zwischen den Felsen und als Spülsaum am Strand
    const tangGeo = new THREE.PlaneGeometry(0.14, 1.6, 1, 6).rotateX(-Math.PI / 2); const tp = tangGeo.getAttribute("position");
    for (let i = 0; i < tp.count; i++) { const z = tp.getZ(i); tp.setX(i, tp.getX(i) + 0.18 * Math.sin(z * 3.1)); tp.setY(i, 0.03 * Math.cos(z * 4.0)); }
    tangGeo.computeVertexNormals();
    const tang = new THREE.InstancedMesh(tangGeo, new THREE.MeshStandardMaterial({ color: "#2B2E17", roughness: 0.45, side: THREE.DoubleSide }), 5000); let nt = 0;
    for (let i = 0; i < 40000 && nt < 5000; i++) {
      const x = -300 + 1000 * hash(i, 161), z = -900 + 950 * hash(i, 162), d = this.G.abstand(x, z);
      if (d > -8 || d < -560) continue;
      const platte = fbm(x * 0.007 + 4, z * 0.007, 3), feld = vn(x * 0.045 + 2, z * 0.045);
      if (hash(i, 163) > 0.6 * smoothstep(0.5, 0.66, platte) + 0.5 * smoothstep(0.6, 0.78, feld)) continue;
      const s = (1 + -d / 400) * (0.7 + 0.8 * hash(i, 164));
      pp.set(x, H(x, z) + 0.04, z); qq.setFromAxisAngle(yA, hash(i, 165) * 6.28); ss.set(s, 1, s); mm.compose(pp, qq, ss); tang.setMatrixAt(nt++, mm);
    }
    for (let i = 0; i < 6000 && nt < 5000; i++) {                // Spülsaum (Linie der letzten Flut) quer vor der Kamera
      const zz2 = -70 + 90 * hash(i, 171), xs = -this.K.x(zz2);
      const along = [-(xs - (-this.K.x(zz2 - 1))), 1];
      const dl = 16.5 + 1.5 * Math.sin(zz2 * 0.13) + (hash(i, 172) - 0.5) * 2.2;
      const nx = -1, x = xs + nx * dl * 1.2;
      if (Math.abs(this.G.abstand(x, zz2) - 18) > 3 || hash(i, 173) > 0.5) continue;
      pp.set(x, H(x, zz2) + 0.03, zz2); qq.setFromAxisAngle(yA, hash(i, 174) * 6.28 + along[0]); ss.set(0.6, 1, 0.35 + 0.3 * hash(i, 175)); mm.compose(pp, qq, ss); tang.setMatrixAt(nt++, mm);
    }
    tang.count = nt; tang.receiveShadow = schatten; tang.frustumCulled = false; szene.add(tang); this.tang = tang;

    // Dünenzaun (Pfähle mit Draht) und Treibholz
    const holzM = new THREE.MeshStandardMaterial({ color: "#6F6253", roughness: 0.9, flatShading: true });
    const pfahl = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.055, 1.3, 6).translate(0, 0.65, 0), holzM, 90); let np = 0;
    const zaunPunkte = [];
    for (let k = 0; k < 90; k++) {
      const z = -50 + k * 1.35; let x = -(this.K.x(z));
      for (let it = 0; it < 30; it++) x -= (44 + 2.2 * Math.sin(z * 0.05) - this.G.abstand(x, z)) * 0.8;
      const y = H(x, z); zaunPunkte.push([x, y + 1.0 + 0.04 * Math.sin(k * 1.7), z]);
      pp.set(x, y - 0.15, z); qq.setFromEuler(new THREE.Euler((hash(k, 181) - 0.5) * 0.18, 0, (hash(k, 182) - 0.5) * 0.22)); ss.set(1, 0.85 + 0.3 * hash(k, 183), 1); mm.compose(pp, qq, ss); pfahl.setMatrixAt(np++, mm);
    }
    pfahl.castShadow = schatten; pfahl.receiveShadow = schatten; szene.add(pfahl); this.pfahl = pfahl;
    const draht = new THREE.Line(new THREE.BufferGeometry().setFromPoints(zaunPunkte.map((p) => new THREE.Vector3(...p))), new THREE.LineBasicMaterial({ color: "#3A352F" }));
    szene.add(draht); this.draht = draht;
    const treib = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.18, 1, 7).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#8A7F70", roughness: 0.95, flatShading: true }), 8);
    [[-1.6, -11, 3.2, 0.5], [2.6, -20, 2.4, -0.6], [-5.5, -27, 2.0, 1.1], [-9, -6, 4.0, 0.2], [-16, -14, 2.6, -0.3]].forEach(([x, z, l, dreh], i) => {
      pp.set(x, H(x, z) + 0.08, z); qq.setFromEuler(new THREE.Euler(0, dreh, 0.04)); ss.set(l, 1 + 0.3 * hash(i, 191), 1); mm.compose(pp, qq, ss); treib.setMatrixAt(i, mm); });
    treib.count = 5; treib.castShadow = schatten; treib.receiveShadow = schatten; szene.add(treib); this.treib = treib;

    // Fischerboot mit Kajüte, Mast und Laterne
    const boot = new THREE.Group();
    const rumpf = new THREE.Mesh(bootGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, flatShading: true }));
    rumpf.position.y = 0.5; boot.add(rumpf);
    const weiss = new THREE.MeshStandardMaterial({ color: "#D9D4C8", roughness: 0.7, flatShading: true });
    const kaj = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 1.1), weiss); kaj.position.set(-0.9, 1.35, 0); boot.add(kaj);
    const dach = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 1.25), new THREE.MeshStandardMaterial({ color: "#7A2A20", roughness: 0.7 })); dach.position.set(-0.9, 1.8, 0); boot.add(dach);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.2, 6), holzM); mast.position.set(0.7, 2.4, 0); boot.add(mast);
    const laterne = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.2) })); laterne.position.set(0.7, 3.9, 0); boot.add(laterne);
    boot.traverse((o) => { if (o.isMesh) { o.castShadow = schatten; o.receiveShadow = schatten; } });
    szene.add(boot); this.boot = boot;
    // Liegeplatz: Sand ca. 22 m voraus, leicht links (Höhe ≈ 0,8 m)
    this.bootStart = (() => { for (let s = 8; s < 80; s += 0.25) { const x = 0.03 * s, z = -s; if (H(x, z) < 0.45) return [x, z]; } return [1, -26]; })();
    // Kamera-Standpunkte: Dünenfuß (Start) und Dünenkamm hinten links (Rückzug)
    this.augeStart = [0, this.augeY, 0];
    let best = null;
    for (let x = -36; x <= -4; x += 1) for (let z = 8; z <= 46; z += 1) { const y = H(x, z), s = y - 0.06 * Math.hypot(x, z - 20); if (!best || s > best[3]) best = [x, y, z, s]; }
    this.augeDuene = [best[0], best[1] + 1.65, best[2]];

    // Leuchtturm auf der Landzunge, Dorf-Lichter, Schiffslichter
    const lx = LEUCHTTURM[0], lz = LEUCHTTURM[1], ly = H(lx, lz);
    const turm = new THREE.Group();
    const turmM = new THREE.MeshStandardMaterial({ color: "#D8D6D0", roughness: 0.8 });
    const t1 = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.4, 26, 10), turmM); t1.position.y = 13; turm.add(t1);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 3, 10), new THREE.MeshStandardMaterial({ color: "#8E2A22", roughness: 0.8 })); ring.position.y = 17; turm.add(ring);
    const haus = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 7), turmM); haus.position.set(8, 2.5, 3); turm.add(haus);
    turm.position.set(lx, ly - 1, lz); szene.add(turm); this.turm = turm;
    this.lampe = [lx, ly + 28.5, lz];
    const strahlGeo = new THREE.ConeGeometry(260, 5200, 32, 1, true).translate(0, -2600, 0).rotateZ(Math.PI / 2);
    this.strahlU = { staerke: { value: 0.6 }, laenge: { value: 5200 } };
    const strahlM = new THREE.ShaderMaterial({
      uniforms: this.strahlU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      vertexShader: `varying vec3 vL; void main() { vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float staerke, laenge; varying vec3 vL; void main() { float s = clamp(vL.x / laenge, 0.0, 1.0); float rr = length(vL.yz) / max(vL.x * 0.05, 1.0); float a = (1.0 - s) * (1.0 - s) * staerke * 0.05 * pow(max(1.0 - rr, 0.0), 2.0); gl_FragColor = vec4(vec3(1.0, 0.93, 0.78) * a, 1.0); }`,
    });
    this.strahl = new THREE.Group();
    for (const r of [0, Math.PI]) { const m = new THREE.Mesh(strahlGeo, strahlM); m.rotation.y = r; this.strahl.add(m); }
    this.strahl.position.set(...this.lampe); szene.add(this.strahl);
    this.lichter = [];
    for (let i = 0; i < 70; i++) {
      const z = -3600 - 2000 * hash(i, 201), x = -(this.K.x(z)) - 60 - 900 * hash(i, 202) ** 1.4;
      if (this.G.abstand(x, z) < 30) continue;
      this.lichter.push({ p: [x, H(x, z) + 4, z], r: 3.5 + 3 * hash(i, 203), f: hash(i, 204) < 0.8 ? [3.2, 2.0, 0.9] : [2.4, 2.6, 3.0], ph: hash(i, 205) });
    }
    for (let i = 0; i < 26; i++) {                                // Häuser in den Dünen hinten links
      const z = -400 - 2200 * hash(i, 211), x = -(this.K.x(z)) - 160 - 500 * hash(i, 212);
      if (this.G.abstand(x, z) < 80) continue;
      this.lichter.push({ p: [x, H(x, z) + 3, z], r: 2.4 + 2 * hash(i, 213), f: [3.0, 1.9, 0.85], ph: hash(i, 214) });
    }

    // Möwen über der Brandung
    this.moewen = new Voegel(szene, { anzahl: 22, seed: 97, farbe: "#B9C2CF", spannweite: 1.2 });
    this.moewen.schwarm({ zentrum: [25, this.augeY + 9, -70], radius: 32, hoehe: 10, tempo: 6, anzahl: 10, skala: 1.0 });
    this.moewen.schwarm({ zentrum: [90, this.augeY + 22, -220], radius: 60, hoehe: 18, tempo: 7, anzahl: 12, skala: 1.4 });
    this.moewen.flucht({ t0: 33.5, richtung: [-0.8, 0.35, 0.4], tempo: 16 });

    // Wolken (Puff-Gruppen hoch über dem Meer)
    this.wolkenQ = [];
    for (let w = 0; w < 9; w++) {                                 // dünne Streifenwolken (Bänder aus vielen kleinen Puffs)
      const cx = -4000 + 9000 * hash(w, 81), cz = -4000 - 10000 * hash(w, 82), cy = 1100 + 1300 * hash(w, 83), lang = 1400 + 1800 * hash(w, 84), gr = 90 + 110 * hash(w, 85);
      for (let k = 0; k < 22; k++) { const i = w * 40 + k, s = (k / 21 - 0.5) * lang;
        this.wolkenQ.push({ x: cx + s, y: cy + (hash(i, 87) - 0.5) * gr * 0.6, z: cz + (hash(i, 86) - 0.5) * gr * 3 + s * 0.15, r: gr * (1.6 + 1.3 * hash(i, 88)) * (1 - 0.6 * Math.abs(k / 21 - 0.5)), dreh: hash(i, 89) * 6.28, b: Math.floor(hash(i, 90) * 4) }); }
    }
    // Gischt-Quellen an der Felsgruppe
    this.gischtQ = GRUPPE.slice(0, 5).map(([x, z, r], i) => ({ x, z, r, ph: hash(i, 221) }));
    this.himmel = new MondHimmel(szene);
  }

  hoehe(x, z) { return this.G.hoehe(x, z); }

  /** Wasserspiegel an (x, z) – dieselbe Formel wie im Shader */
  wasserHoehe(x, z, t, w) {
    const D = this.D, u = x * D[0] + z * D[1], v = -x * D[1] + z * D[0], un = w.unruhe ?? 0.4, A = w.wandHoehe ?? 0;
    let y = 0.55 * Math.sin(u * 0.052 - t * 0.78 + Math.sin(v * 0.004) * 2) + 0.3 * Math.sin(u * 0.093 + v * 0.021 - t * 1.15 + 1.3)
      + 0.18 * Math.sin(u * 0.17 - v * 0.05 - t * 1.7 + 2.1) + 0.08 * Math.sin(u * 0.41 + v * 0.13 - t * 2.6);
    y *= un * (1 - smoothstep(4, 22, A) * 0.5);
    const hinter = Math.max((w.wandFront ?? -2e4) - u, 0), vorn = Math.max(u - (w.wandFront ?? -2e4), 0);
    const wa = A * (0.35 + 0.65 * Math.exp(-hinter / 350)) * Math.exp(-hinter / 2500) * (1 - smoothstep(0, 14 + A * 0.6, vorn)) * 0.92;
    return (w.pegel ?? 0) + y + wa;
  }

  setze(t, kamera, w = {}) {
    const u = this.u;
    u.uZeit.value = t; u.uPegel.value = w.pegel ?? 0; u.uNassBis.value = w.nassBis ?? 0.6; u.uWind.value = w.wind ?? 0.5;
    const W = this.wasserU;
    W.zeit.value = t; W.unruhe.value = w.unruhe ?? 0.4; W.pegel.value = w.pegel ?? 0; W.wandFront.value = w.wandFront ?? -2e4; W.wandHoehe.value = w.wandHoehe ?? 0;
    W.licht.value = w.licht ?? 1;
    if (w.himmelFarbe) W.himmel.value.copy(w.himmelFarbe);
    if (w.mondDir) W.mondDir.value.set(...w.mondDir).normalize();
    if (w.mondFarbe) W.mondFarbe.value.copy(w.mondFarbe);
    if (w.tief) W.tief.value.copy(w.tief);
    if (w.flach) W.flach.value.copy(w.flach);
    this.strahl.rotation.y = t * (2 * Math.PI / 9);
    this.strahlU.staerke.value = w.strahl ?? 0.6;
    this.moewen.setze(t);
    this.himmel.folge(kamera);
    return this;
  }

  /** Boot setzen: pos [x, y, z], Drehung (gier, roll, nick) in rad */
  setzeBoot(pos, gier, roll, nick) { this.boot.position.set(...pos); this.boot.rotation.set(nick, gier, roll, "YXZ"); return this; }

  /** Puffs der Welt: normal (Wolken, Gischt) und glow (Lichter, Laterne) */
  puffs(t, { wolken = 1, wolkenFarbe = [0.3, 0.34, 0.42], mondNah = [0.6, 0.65, 0.75], mondDir = [0, 0.3, -1], gischt = 0, gischtFarbe = [0.7, 0.75, 0.8], lichter = 1, laterne = [0, 0, 0], laterneAn = 1, lampe = 1, kamPos = [0, 0, 0] } = {}) {
    const normal = [], glow = [];
    const md = new THREE.Vector3(...mondDir).normalize();
    if (wolken > 0.01) for (const q of this.wolkenQ) {
      const p = [q.x + 9 * t, q.y, q.z + 3 * t];
      const dir = new THREE.Vector3(p[0] - kamPos[0], p[1] - kamPos[1], p[2] - kamPos[2]).normalize();
      const nah = Math.pow(Math.max(dir.dot(md), 0), 24);
      normal.push({ p, r: q.r, dreh: q.dreh, farbe: wolkenFarbe.map((c, k) => c + (mondNah[k] - c) * nah), a: 0.26 * wolken, licht: 0.6, bild: q.b });
    }
    if (gischt > 0.01) for (const q of this.gischtQ) for (let k = 0; k < 4; k++) {
      const leben = 2.6, tau = ((t + q.ph * leben + k * 0.65) % leben) / leben;
      const stoss = Math.pow(Math.max(0, Math.sin((t + q.ph * 9) * 0.78 + k)), 3);
      normal.push({ p: [q.x + (hash(k, q.ph * 99) - 0.5) * q.r, this.hoehe(q.x, q.z) + q.r * 0.6 + tau * q.r * 1.6 * gischt, q.z + 2], r: q.r * (0.5 + 0.9 * tau) * (0.6 + 0.6 * gischt), dreh: q.ph * 6 + k,
        farbe: gischtFarbe, a: gischt * 0.55 * stoss * smoothstep(0, 0.15, tau) * (1 - smoothstep(0.5, 1, tau)), licht: 0.9, bild: k % 4 });
    }
    if (lichter > 0.01) for (const q of this.lichter) glow.push({ p: q.p, r: q.r, farbe: q.f.map((c) => c * lichter * (0.85 + 0.15 * Math.sin(t * 0.7 + q.ph * 30))), a: 0.9, licht: 0, bild: 0 });
    // Leuchtturm-Lampe: blitzt auf, wenn der Strahl zur Kamera zeigt
    const zuKam = Math.atan2(-(kamPos[2] - this.lampe[2]), kamPos[0] - this.lampe[0]);
    const wink = t * (2 * Math.PI / 9);
    const blick = Math.max(Math.pow(Math.max(Math.cos(wink - zuKam), 0), 60), Math.pow(Math.max(Math.cos(wink + Math.PI - zuKam), 0), 60));
    glow.push({ p: this.lampe, r: 14 + 60 * blick, farbe: [3.4 * lampe, 3.0 * lampe, 2.4 * lampe], a: 0.6 + 0.4 * blick, licht: 0, bild: 0 });
    if (laterneAn > 0.01) glow.push({ p: laterne, r: 0.45, farbe: [3.0 * laterneAn, 1.9 * laterneAn, 0.8 * laterneAn], a: 0.85, licht: 0, bild: 0 });
    return { normal, glow };
  }
}
