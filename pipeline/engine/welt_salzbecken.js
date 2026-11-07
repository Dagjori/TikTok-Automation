// Grundwelt „Salzwüste am Grund eines Meeresbeckens“ (Account 2 @stelldirvor.pov, Weltenkatalog „Wüste“ / „Meer und Küste“)
// Erstbau 07.11.2026 („Was wäre, wenn ein ausgetrocknetes Meer plötzlich wieder vollläuft?“, Skript acc2-2026-11-07-mittag). NUR für den Baukasten Lunar-POV.
//
// Inhalt: Felsvorsprung (y = 2 m, künftiger Meeresspiegel = 0 m) am Rand eines 1.500 m tiefen Beckens, gestufte Felsklippe (Terrassen mit Bänken und
// Steilstufen, Schichtfarben), Salzebene mit Rissen und Glitzern, Felshügel am Grund (werden zu Inseln), Beckenrand-Gebirge im Dunst mit Lücke
// (Durchbruch), Flutwasser (Sediment-braun → blau, Gischt an Front und Ufer, Wellen, Sonnen-/Mondglanz, Tiefen-Tönung), Vordergrund-Felsbrocken.
// Steuerung je Bild (alles Funktion von t, kein Zustand): welt.setze(t, kamera, { flaeche, frontR, braun, schaum, sonneR, sonneF, himmelFarbe, tiefFarbe, flachFarbe, licht, welle, nass, glitzer })
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { GLSL_NOISE, merge } from "./welt_feld_wald.js";

const fr = (x) => x - Math.floor(x);
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= 0.5; } return s; }
const C = (h) => new THREE.Color(h);

export const BODEN = -1500;          // Grund des Beckens (m zum Meeresspiegel)
export const SPUR_Y = 2;             // Oberkante des Felsvorsprungs
export const DURCHBRUCH = [-3600, -19200];   // Lücke im Beckenrand (x, z), hier bricht das Meer herein
const HS = 100;                      // Stufenhöhe der Klippe (m)

// Felshügel am Grund: x, z, Höhe über Grund, Breite (werden beim Anstieg zu Inseln, die höchsten bleiben bis ca. −700 m)
export const HUEGEL = (() => {
  const L = [];
  const fest = [[-380, -2300, 760, 380], [620, -3100, 680, 420], [-1250, -3900, 560, 520], [1700, -4300, 800, 600], [-300, -5200, 640, 560], [950, -6400, 520, 700],
    [-2400, -2900, 330, 420], [2600, -3000, 260, 380], [380, -2050, 210, 250], [-900, -1850, 150, 220], [1300, -2200, 190, 260], [-1800, -5600, 440, 520],
    [2900, -5900, 380, 600], [-3300, -4300, 300, 450], [150, -7600, 470, 800], [-1400, -8800, 360, 900], [2200, -8300, 300, 700]];
  for (const [x, z, h, w] of fest) L.push({ x, z, h, w });
  for (let i = 0; i < 20; i++) L.push({ x: lerp(-4500, 4500, hash(i, 501)), z: lerp(-1900, -11000, hash(i, 502)), h: lerp(60, 260, hash(i, 503)), w: lerp(160, 420, hash(i, 504)) });
  return L;
})();

/** Gelände (m zum Meeresspiegel): Vorsprung bei z ≈ 0, gestufte Klippe nach vorn (−z) bis 3.000 m, Salzebene, Hügel, Beckenrand-Gebirge */
export function hoehe(x, z) {
  const s = -z, ax = Math.abs(x);
  const rueck = 260 * smoothstep(10, 150, ax) + 70 * fbm(x * 0.004 + 3.1, 1.3) * smoothstep(15, 90, ax);   // Kante weicht seitlich zurück → Spur ragt vor
  const se = s + rueck;
  let y;
  if (se < 0) {
    y = SPUR_Y + 0.45 * (vn(x * 0.35, z * 0.35) - 0.5) + 0.03 * Math.min(-se, 3000) * smoothstep(40, 400, -se) * 0.5;      // Platte, hinten ansteigend
    y += 0.5 * (fbm(x * 0.05, z * 0.05, 3) - 0.5) * smoothstep(-5, -40, se) * 2;
  } else {
    const b = BODEN * (1 - Math.exp(-se / 900)) / (1 - Math.exp(-3000 / 900));
    const wob = 0.32 * (fbm(x * 0.0065 + 7.7, se * 0.0042 + 2.2, 3) - 0.5) * smoothstep(60, 500, se);
    const u = -b / HS + 0.55 + wob;
    const u2 = Math.floor(u) + smoothstep(0.5, 0.86, fr(u));
    const u0 = smoothstep(0.5, 0.86, 0.55);
    y = Math.max(BODEN, SPUR_Y - HS * (u2 - u0) - 0.035 * se * smoothstep(0, 150, se));
    y += 0.7 * (vn(x * 0.21, z * 0.21) - 0.5) * smoothstep(0, 60, se) + 1.4 * (fbm(x * 0.03, z * 0.03, 3) - 0.5) * smoothstep(0, 90, se);
    if (se > 2800) y = BODEN + 2.2 * (fbm(x * 0.0016 + 4, z * 0.0016, 4) - 0.5) + 0.7 * (vn(x * 0.02, z * 0.02) - 0.5);
  }
  // Hügel am Grund
  for (let k = 0; k < HUEGEL.length; k++) {
    const hg = HUEGEL[k], dx = x - hg.x, dz = z - hg.z;
    const W = hg.w * 1.55;
    if (Math.abs(dx) > W || Math.abs(dz) > W) continue;
    const d2 = (dx * dx + dz * dz) / (W * W);
    if (d2 >= 1) continue;
    const form = 1 + 0.2 * (fbm(x * 0.006, z * 0.006, 3) - 0.5) + 0.05 * (vn(x * 0.03, z * 0.03) - 0.5);
    y += hg.h * Math.pow(1 - d2, 1.7) * form * (0.9 + 0.2 * Math.sin(Math.atan2(dz, dx) * 3 + k));
  }
  // Beckenrand: Gebirge im Dunst, Lücke beim Durchbruch
  const r = Math.hypot(x / 9800, (z + 11500) / 7200);
  if (r > 0.92 && z < -6000) {
    const gap = Math.exp(-(((x - DURCHBRUCH[0]) / 1100) ** 2)) * smoothstep(-13000, -19500, z);
    const rand = (1800 + 1100 * fbm(x * 0.0009 + 1, z * 0.0009, 4)) * Math.pow(smoothstep(0.92, 1.45, r), 1.2) * (1 - 0.92 * gap) * smoothstep(-6000, -9500, z);
    y = Math.max(y, BODEN + 80 * smoothstep(0.92, 1.0, r) + rand * (0.7 + 0.5 * fbm(x * 0.003, z * 0.003, 3)));
  }
  return y;
}

// ---------------------------------------------------------------------------------------------- Gelände-Material
function bodenMaterial(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.96, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vNW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvNW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vNW;
uniform float uFlaeche, uZeit, uSchaum, uNass, uGlitzer, uMitte;
${GLSL_NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  vec3 W = vNW; vec2 p = W.xz;
  vec3 Nw = normalize(cross(dFdx(W), dFdy(W))); if (Nw.y < 0.0) Nw = -Nw;
  float dc = length(W - cameraPosition);
  float n1 = nN(p * 0.02), n2 = nN(p * 0.11), n3 = nF(p * 0.0035), n4 = nN(p * 0.7);
  // Salzebene: weiße Kruste mit Polygonrissen (Zellen ca. 45 m), graue und ockerfarbene Lehmflecken, Windstreifen
  vec3 zell = nZelle(p * 0.009);
  float riss = 1.0 - smoothstep(0.02, 0.1, zell.y - zell.x);
  vec3 salz = mix(vec3(0.66, 0.62, 0.55), vec3(0.5, 0.45, 0.39), smoothstep(0.3, 0.7, n3 + 0.35 * zell.z));
  salz = mix(salz, vec3(0.55, 0.43, 0.3), smoothstep(0.55, 0.78, nF(p * 0.0021 + 9.0)) * 0.8);
  salz = mix(salz, vec3(0.82, 0.8, 0.74), smoothstep(0.7, 0.9, nF(p * 0.0011 + 2.0)) * 0.7);
  salz *= 0.9 + 0.14 * n2 + 0.05 * sin(p.x * 0.004 + n3 * 9.0);
  salz = mix(salz, salz * vec3(0.38, 0.35, 0.32), riss * 0.85 * (1.0 - smoothstep(6000.0, 16000.0, dc)));
  salz *= 0.86 + 0.22 * smoothstep(0.1, 0.9, zell.z);
  // Klippe und Hügel: Schichten (Dicke 14–40 m), Farbe je Schicht aus Palette
  float lag = W.y / 34.0 + 1.2 * n3 + 0.6 * n1;
  float li = floor(lag); float lh = nH(vec2(li, 3.7));
  vec3 pal = lh < 0.17 ? vec3(0.84, 0.76, 0.6) : (lh < 0.34 ? vec3(0.72, 0.5, 0.3) : (lh < 0.5 ? vec3(0.56, 0.3, 0.2) : (lh < 0.66 ? vec3(0.6, 0.55, 0.48) : (lh < 0.82 ? vec3(0.4, 0.3, 0.24) : vec3(0.78, 0.6, 0.48)))));
  pal = mix(pal, vec3(0.62, 0.52, 0.42), 0.35); pal *= 0.88 + 0.2 * n2 + 0.08 * n4 * (1.0 - smoothstep(300.0, 1500.0, dc));
  float steil = 1.0 - smoothstep(0.55, 0.86, Nw.y);
  vec3 bank = mix(mix(vec3(0.72, 0.6, 0.45), vec3(0.62, 0.5, 0.38), n1), pal, 0.55) * (0.9 + 0.15 * n2);   // Bänke: Staub und Geröll
  vec3 fels = mix(bank, pal, steil);
  float flach = smoothstep(0.9, 0.985, Nw.y) * (1.0 - smoothstep(-1496.0, -1440.0, W.y));
  vec3 c = mix(fels, salz, flach);
  // Beckenrand-Gebirge: dunkler, bläulich im Dunst
  c = mix(c, vec3(0.42, 0.34, 0.3) * (0.85 + 0.3 * n3), smoothstep(-200.0, 300.0, W.y) * smoothstep(5000.0, 9000.0, length(p)));
  // Vorsprung: heller Fels
  float sp = (1.0 - smoothstep(1.0, 4.0, abs(W.y - ${SPUR_Y.toFixed(1)}))) * (1.0 - smoothstep(5.0, 40.0, W.z)) * smoothstep(-30.0, 6.0, W.z);
  c = mix(c, vec3(0.4, 0.31, 0.23) * (0.8 + 0.3 * n2 + 0.2 * n4) * (1.0 - 0.45 * (1.0 - smoothstep(0.0, 0.22, nZelle(p * 0.9).y - nZelle(p * 0.9).x))), sp * 0.9);
  // Salzglitzern (nur trocken, nur Salz): langsames Funkeln einzelner Zellen
  float glz = step(0.965, nH(floor(p * 0.12) + 5.0)) * (0.5 + 0.5 * sin(uZeit * 5.0 + nH(floor(p * 0.12)) * 40.0)) * flach * uGlitzer * (1.0 - smoothstep(1500.0, 4500.0, dc));
  // Wasser: feuchte Dunkelung und Gischtband über der Wasserlinie (sichtbar auch aus 1 km: Band wächst mit dem Abstand)
  float ab = W.y - uFlaeche;
  float nass = (1.0 - smoothstep(0.0, 9.0 + dc * 0.004, ab)) * step(-0.5, ab);
  c = mix(c, c * vec3(0.56, 0.5, 0.45), nass * 0.7 * uNass);
  float band = 4.0 + dc * 0.0035;
  float schaum = (1.0 - smoothstep(0.3, band, ab)) * step(-0.4, ab) * smoothstep(0.30, 0.62, nN(vec2(p.x * 0.18, W.y * 0.45) + uZeit * 0.2) + 0.25 * n4);
  c = mix(c, vec3(0.94, 0.95, 0.93), schaum * uSchaum);
  diffuseColor.rgb = c + glz * vec3(1.0, 0.98, 0.9) * 0.9;`);
  };
  return m;
}

// ---------------------------------------------------------------------------------------------- Wasser
const WASSER_V = /* glsl */ `
varying vec3 vW;
#include <fog_pars_vertex>
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const WASSER_F = /* glsl */ `
uniform vec3 tief, flach, himmel, sonneR, sonneF, frontC, boxMin, boxMax;
uniform float zeit, glanzS, licht, braun, welle, schaum, frontR, texN, dbg;
uniform sampler2D tH;
varying vec3 vW;
#include <fog_pars_fragment>
${GLSL_NOISE}
float hAt(vec2 p) {
  vec2 q = (p - boxMin.xz) / (boxMax.xz - boxMin.xz) * texN - 0.5; vec2 i = floor(q), f = fract(q);
  float a = texture2D(tH, (i + 0.5) / texN).r, b = texture2D(tH, (i + vec2(1.0, 0.0) + 0.5) / texN).r;
  float c = texture2D(tH, (i + vec2(0.0, 1.0) + 0.5) / texN).r, d = texture2D(tH, (i + vec2(1.0, 1.0) + 0.5) / texN).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {
  vec2 fq = vW.xz - frontC.xz;
  float fd = length(fq) + 900.0 * (nF(vW.xz * 0.0007 + 3.0) - 0.5);
  if (frontR < 1.0e5 && fd > frontR) discard;
  vec3 V = normalize(cameraPosition - vW); float d = length(cameraPosition - vW);
  float k = 1.0 / (1.0 + d / 900.0);
  vec2 g = (vec2(nN(vW.xz * 0.045 + zeit * 0.5 + vec2(0.0, zeit * 0.2)), nN(vW.zx * 0.04 - zeit * 0.4)) - 0.5) * 0.9 * k;
  g += (vec2(nN(vW.xz * 0.16 + zeit * 0.9), nN(vW.zx * 0.14 - zeit * 0.8)) - 0.5) * 0.5 * k;
  g += (vec2(nN(vW.xz * 0.007 + zeit * 0.1), nN(vW.zx * 0.006 - zeit * 0.08)) - 0.5) * 0.18;
  g *= welle;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N); float s = max(dot(R, normalize(sonneR)), 0.0);
  float depth = max(0.0, vW.y - hAt(vW.xz));
  float fl = exp(-depth / 40.0);
  vec3 sed = mix(vec3(0.43, 0.32, 0.2), vec3(0.34, 0.27, 0.19), smoothstep(0.0, 300.0, depth));
  vec3 grund = mix(tief, flach, fl * 0.85);
  grund = mix(grund, sed, braun * (0.55 + 0.45 * fl));
  vec3 col = mix(grund, himmel, fres * 0.85);
  col += sonneF * (pow(s, 260.0) * 3.0 + pow(s, 28.0) * 0.14) * glanzS * (0.4 + 0.6 * k);
  // Gischt: Front (breiter weißer Streifen mit Brandung dahinter), Ufer (flaches Wasser), Schaumkämme
  float sf = (frontR < 1.0e5) ? (1.0 - smoothstep(0.0, 180.0, frontR - fd)) * step(fd, frontR) * smoothstep(0.0, 25.0, frontR - fd + 25.0) : 0.0;
  sf *= 0.55 + 0.45 * nN(vW.xz * 0.02 + zeit);
  float uf = (1.0 - smoothstep(0.0, 5.0, depth)) * (0.35 + 0.65 * nN(vW.xz * 0.1 + zeit * 0.6));
  float kamm = smoothstep(0.84, 0.98, nN(vec2(vW.x * 0.03, vW.z * 0.09) + zeit * 0.25)) * welle * 0.35 * k;
  col = mix(col, vec3(0.93, 0.94, 0.92) * (0.35 + 0.65 * licht), clamp(sf * 0.95 + uf * schaum + kamm * schaum, 0.0, 1.0));
  col *= licht;
  if (dbg > 0.5 && dbg < 1.5) col = vec3(depth / 400.0);
  if (dbg > 1.5 && dbg < 2.5) col = vec3(fres, sf + uf, kamm);
  if (dbg > 2.5 && dbg < 3.5) col = grund;
  if (dbg > 3.5) col = vec3(depth / 400.0, -hAt(vW.xz) / 1500.0, fl);
  gl_FragColor = vec4(col, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
}`;

function felsGeo() {
  const g = new THREE.IcosahedronGeometry(1, 1); const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) { const k = 0.82 + 0.38 * hash(Math.round(p.getX(i) * 40) + Math.round(p.getY(i) * 40) * 7 + Math.round(p.getZ(i) * 40) * 13, 77); p.setXYZ(i, p.getX(i) * k * 1.25, p.getY(i) * k * 0.8, p.getZ(i) * k); }
  g.computeVertexNormals(); return g;
}

export class Salzbecken {
  constructor(szene, { gitter = [360, 900] } = {}) {
    this.szene = szene; this.vertices = 0;
    this.u = { uFlaeche: { value: BODEN }, uZeit: { value: 0 }, uSchaum: { value: 0 }, uNass: { value: 0 }, uGlitzer: { value: 1 }, uMitte: { value: 0 } };
    const mat = bodenMaterial(this.u);
    // Gelände: Gitter mit nach außen gröber werdender Teilung (a quer, b nach vorn)
    const [NX, NZ] = gitter;
    const pos = new Float32Array((NX + 1) * (NZ + 1) * 3), idx = [];
    const XM = 10500, S0 = -300, S1 = 30000;
    const xs = (a) => XM * Math.sign(a) * Math.pow(Math.abs(a), 2.4);
    const zs = (b) => -(S0 + (S1 - S0) * Math.pow(b, 2.4));
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const a = -1 + (2 * i) / NX, b = j / NZ, x = xs(a), z = zs(b), o = (j * (NX + 1) + i) * 3;
      pos[o] = x; pos[o + 1] = hoehe(x, z); pos[o + 2] = z;
    }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    this.gelaende = new THREE.Mesh(geo, mat); this.gelaende.frustumCulled = false; szene.add(this.gelaende); this.vertices += (NX + 1) * (NZ + 1);
    // Höhenfeld-Textur für die Wassertiefe (nur Färbung, die Geometrie schneidet exakt)
    const TN = 1024, BMIN = [-14000, -31000], BMAX = [14000, 700], tex = new Float32Array(TN * TN);
    for (let j = 0; j < TN; j++) for (let i = 0; i < TN; i++) tex[j * TN + i] = hoehe(lerp(BMIN[0], BMAX[0], (i + 0.5) / TN), lerp(BMIN[1], BMAX[1], (j + 0.5) / TN));
    const dt = new THREE.DataTexture(tex, TN, TN, THREE.RedFormat, THREE.FloatType); dt.minFilter = dt.magFilter = THREE.NearestFilter; dt.generateMipmaps = false; dt.needsUpdate = true;
    this.wu = { tief: { value: C("#16506A") }, flach: { value: C("#3E8A96") }, himmel: { value: C("#9FB4C6") }, sonneR: { value: new THREE.Vector3(0, 0.4, -1) }, sonneF: { value: C("#FFF0D8") },
      frontC: { value: new THREE.Vector3(DURCHBRUCH[0], 0, DURCHBRUCH[1]) }, boxMin: { value: new THREE.Vector3(BMIN[0], 0, BMIN[1]) }, boxMax: { value: new THREE.Vector3(BMAX[0], 0, BMAX[1]) },
      zeit: { value: 0 }, glanzS: { value: 1 }, licht: { value: 1 }, braun: { value: 1 }, welle: { value: 0.6 }, schaum: { value: 1 }, frontR: { value: 1e9 }, texN: { value: TN }, dbg: { value: 0 }, tH: { value: dt } };
    const wm = new THREE.ShaderMaterial({ vertexShader: WASSER_V, fragmentShader: WASSER_F, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, this.wu]), fog: true });
    wm.uniforms = Object.assign(wm.uniforms, this.wu);
    this.wasser = new THREE.Mesh(new THREE.PlaneGeometry(70000, 70000, 1, 1).rotateX(-Math.PI / 2).translate(0, 0, -15000), wm); this.wasser.frustumCulled = false;
    this.wasser.position.y = BODEN; szene.add(this.wasser);
    // Vordergrund: Felsbrocken am Rand des Vorsprungs und auf der Platte (verankern das Ich-Gefühl)
    const fm = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.95, flatShading: true, vertexColors: false });
    this.felsen = new THREE.InstancedMesh(felsGeo(), fm, 70); this.felsen.castShadow = false; this.felsen.receiveShadow = false; this.felsen.frustumCulled = false;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pp = new THREE.Vector3(), ss = new THREE.Vector3(), cc = new THREE.Color();
    for (let i = 0; i < 70; i++) {
      const rand = (s) => hash(i, 900 + s);
      const kante = i < 44; const x = kante ? lerp(-9, 9, rand(1)) : lerp(-14, 14, rand(1)), z = kante ? lerp(-1.2, 0.6, rand(2)) : lerp(1.5, 14, rand(2));
      const sz = kante ? lerp(0.15, 0.6, rand(3)) * (1 - Math.abs(x) / 18) : lerp(0.15, 0.5, rand(3));
      const y = hoehe(x, z) + sz * 0.25; e.set(rand(4) * 0.4, rand(5) * 6.28, rand(6) * 0.4); q.setFromEuler(e); pp.set(x, y, z); ss.set(sz * lerp(0.9, 1.7, rand(7)), sz * lerp(0.6, 1.0, rand(8)), sz);
      m4.compose(pp, q, ss); this.felsen.setMatrixAt(i, m4);
      const v = lerp(0.62, 1.0, rand(9)); this.felsen.setColorAt(i, cc.setRGB(0.62 * v + 0.1, 0.5 * v + 0.06, 0.38 * v + 0.03));
    }
    szene.add(this.felsen);
  }
  /** Zustand je Bild */
  setze(t, kamera, w) {
    const { flaeche, frontR = 1e9, braun = 1, schaum = 1, sonneR, sonneF, himmelFarbe, tiefFarbe, flachFarbe, licht = 1, welle = 0.6, nass = 1, glitzer = 1, glanz = 1 } = w;
    const u = this.u; u.uFlaeche.value = flaeche; u.uZeit.value = t; u.uSchaum.value = schaum; u.uNass.value = nass; u.uGlitzer.value = glitzer;
    this.wasser.position.y = flaeche; this.wasser.visible = flaeche > BODEN - 5;
    const q = this.wu; q.zeit.value = t; q.frontR.value = frontR; q.braun.value = braun; q.schaum.value = schaum; q.licht.value = licht; q.welle.value = welle; q.glanzS.value = glanz; q.dbg.value = w.dbg || 0;
    q.sonneR.value.set(...sonneR); q.sonneF.value.copy(sonneF); q.himmel.value.copy(himmelFarbe); q.tief.value.copy(tiefFarbe); q.flach.value.copy(flachFarbe);
  }
}
