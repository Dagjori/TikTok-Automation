// Welt „Flussmündung / Küstenebene mit Anhöhe“ (Account 2 @stelldirvor.pov, Weltenkatalog „See, Fluss, Delta“), Erstbau 06.11.2026
// („Was wäre, wenn die Erde zurück in die Zeit der Dinosaurier spulen würde?“, generische Flussmündung in gemäßigten Breiten). NUR für den Baukasten Lunar-POV.
//
// Inhalt: flache Anhöhe (Standpunkt) über einer Flussebene mit Mäander und Mündung ins Meer, Meeresspiegel frei steuerbar (flache Schelfküste,
// Schaum an der Uferlinie, Sonnenglanz), Gletscherzunge im Tal (Eisfront wandert, hebt das Gelände), Vegetation als Funktion von Gewichten
// (Fichten, Laubbäume, Palmen, Baumfarne, Araukarien, Büsche, Farn, Gras) mit Wachstum, Wind und Schnee, Tiere (Mammuts, Dreizehenpferde, Krokodile,
// Kleinsäuger, Saurier, Flugsaurier) als gehende Gruppen.
//   const w = new Muendung(szene, { schatten });  w.setze(t, kamera, S)  mit
//   S = { pegel, eis, schnee, wind, gewicht: { fichte, laub, palme, farn, baumfarn, arau, busch, gras }, farben: { grund, grund2, streu, sand, mud, tief, flach, himmel },
//         wald, sonneDir, sonneFarbe, sichtbar? }
//   w.tiere.add("mammut", { …});  (siehe Tierwelt)
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { GLSL_NOISE } from "./welt_feld_wald.js";

const fr = (x) => x - Math.floor(x);
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 17.1; a *= 0.5; } return s; }
const hx = (h) => new THREE.Color(h).toArray();

// ----------------------------------------------------------------------------------------------- Lage und Gelände
export const HUEGEL = { x: -60, z: 40 };                   // Mitte der Anhöhe
export const KNOSPE = { x: -30, z: 18 };                   // Kuppe mit dem Standpunkt
export const AUGE = { hoehe: 2.2 };
export const flussX = (z) => 60 + 70 * Math.sin(z * 0.009 + 0.9);
export const flussB = (z) => 20 + 80 * smoothstep(-240, -380, z);
const KUESTE = (x) => -260 + 30 * Math.sin(x * 0.006 + 1);

function land(x, z) {
  let h = 3 + 4.4 * (fbm(x * 0.011 + 3, z * 0.011) - 0.5) + 0.7 * (fbm(x * 0.09, z * 0.09, 2) - 0.5);
  h += 0.02 * Math.max(0, z - 150);
  h += 170 * smoothstep(430, 950, x) * (0.55 + 0.9 * fbm(x * 0.004, z * 0.004));
  h += 95 * smoothstep(-380, -900, x) * (0.55 + 0.9 * fbm(x * 0.005 + 9, z * 0.005));
  const r = Math.hypot(x - HUEGEL.x, z - HUEGEL.z) + 16 * (fbm(x * 0.02, z * 0.02) - 0.5);
  h += 22 * (1 - smoothstep(105, 175, r));
  h += 14 * Math.exp(-((x - KNOSPE.x) ** 2 + (z - KNOSPE.z) ** 2) / (2 * 38 * 38));
  const d = Math.max(0, KUESTE(x) - z);
  h -= 0.05 * Math.min(d, 900) + 0.015 * Math.max(0, d - 900);
  return h;
}
export function hoehe(x, z) {
  const dx = Math.abs(x - flussX(z)), B = flussB(z);
  return land(x, z) - 4.5 * (1 - smoothstep(B * 0.35, B * 0.35 + 16, dx));
}
export const flussHoehe = (z) => land(flussX(z), z) - 1.6;
/** Ankunft der Eisfront (0..1 = uEis), ab der Ort (x, z, Höhe h) unter dem Eis liegt; 9 = nie */
export function eisAnkunft(x, z, h) {
  const lat = 1 - smoothstep(260, 400, Math.abs(x - 110)), hh = 1 - smoothstep(16, 22, h);
  return lat * hh > 0.5 ? clamp((455 - z) / 540, 0, 2) : 9;
}

// ----------------------------------------------------------------------------------------------- Geometrie-Hilfen
function prim(g, c) {
  g = g.index ? g.toNonIndexed() : g; if (g.getAttribute("uv")) g.deleteAttribute("uv");
  const p = g.getAttribute("position"), n = p.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const cc = typeof c === "function" ? c(p.getX(i), p.getY(i), p.getZ(i)) : c; a[i * 3] = cc[0]; a[i * 3 + 1] = cc[1]; a[i * 3 + 2] = cc[2]; }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3)); if (g.getAttribute("normal")) g.deleteAttribute("normal");
  return g;
}
const fuse = (list) => { const g = mergeGeometries(list, false); g.computeVertexNormals(); g.computeBoundingSphere(); return g; };
const UP = new THREE.Vector3(0, 1, 0);
function ast(a, b, r0, r1, c, seg = 5) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, B.clone().sub(A).normalize())); g.translate(...a);
  return prim(g, c);
}
function blob(z, r, seed, col, flach = 0.8, detail = 1) {
  const g = new THREE.IcosahedronGeometry(r, detail), p = g.getAttribute("position");
  for (let j = 0; j < p.count; j++) { const x = p.getX(j), y = p.getY(j), zz = p.getZ(j), f = 1 + 0.2 * (hash(Math.round((x + 9) * 31 + (zz + 9) * 17 + y * 7), seed) - 0.5); p.setXYZ(j, x * f, y * f * flach, zz * f); }
  g.translate(...z);
  const cy = z[1];
  return prim(g, (x, y) => { const k = clamp((y - cy + r) / (2 * r)); return [lerp(col[0] * 0.7, col[0] * 1.15, k), lerp(col[1] * 0.7, col[1] * 1.15, k), lerp(col[2] * 0.7, col[2] * 1.15, k)]; });
}
/** gefiederter Wedel: Mittelrippe als Bogen, Fiedern als Dreiecke (doppelseitig rendern) */
function wedel({ L = 4, hoch = 0.9, haengt = 1.5, breite = 0.5, n = 9, ang = 0, ab = [0, 0, 0], cu = [0.12, 0.28, 0.08], co = [0.4, 0.6, 0.2], lauf = 1 }) {
  const pos = [], col = [], dx = Math.cos(ang), dz = Math.sin(ang), sx = -dz, sz = dx;
  const R = (u) => [ab[0] + dx * L * u, ab[1] + L * (hoch * u - haengt * u * u), ab[2] + dz * L * u];
  const mix = (u) => [lerp(cu[0], co[0], u), lerp(cu[1], co[1], u), lerp(cu[2], co[2], u)];
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n, a = R(u0), b = R(u1), ll = breite * L * 0.5 * Math.sin(Math.PI * (0.12 + 0.88 * Math.pow(u0 + 0.05, 0.7))) * lauf;
    for (const s of [-1, 1]) {
      const tip = [a[0] + sx * s * ll + dx * ll * 0.5, a[1] - ll * 0.38, a[2] + sz * s * ll + dz * ll * 0.5];
      pos.push(...a, ...tip, ...b); const c0 = mix(u0), c1 = mix(u1 * 0.9);
      col.push(...c0, ...mix(Math.min(1, u0 + 0.25)), ...c1);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
}

// ----------------------------------------------------------------------------------------------- Pflanzen-Geometrien (Einheiten Meter, Boden y = 0)
function fichteGeo(seed) {
  const T = [], hoch = 17 + 4 * hash(seed, 3);
  T.push(ast([0, 0, 0], [0, hoch, 0], 0.34, 0.08, hx("#4A3322"), 6));
  const n = 9;
  for (let i = 0; i < n; i++) {
    const f = i / n, y = 2.2 + f * (hoch - 3.4), r = (4.0 * Math.pow(1 - f, 0.85) + 0.5) * (0.88 + 0.24 * hash(i, seed + 5)), h = 3.4 - 0.7 * f;
    const g = new THREE.ConeGeometry(r, h, 9, 1); g.translate(0, y + h / 2 - 0.4, 0);
    const yy = y;
    T.push(prim(g, (x, yv, z) => { const k = 0.55 + 0.45 * clamp((yv - yy + 0.4) / h); return [0.07 * k * (0.85 + 0.3 * hash(Math.round(x * 9 + z * 5), seed)), 0.2 * k, 0.1 * k]; }));
  }
  return fuse(T);
}
function laubGeo(seed) {
  const T = [], H0 = 5.5 + 2 * hash(seed, 1);
  T.push(ast([0, 0, 0], [0, H0, 0], 0.5, 0.3, hx("#5A4332"), 7));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.283 + hash(i, seed) * 0.8, R = 2.4 + 2.2 * hash(i, seed + 1), yt = H0 + 2.6 + 3.2 * hash(i, seed + 2), bx = Math.cos(a) * R, bz = Math.sin(a) * R;
    T.push(ast([0, H0 - 0.8, 0], [bx, yt, bz], 0.22, 0.08, hx("#55402F"), 5));
    T.push(blob([bx, yt + 0.5, bz], 2.1 + 1.1 * hash(i, seed + 4), seed + i * 3, [0.19 + 0.1 * hash(i, seed + 5), 0.32 + 0.1 * hash(i, seed + 6), 0.09], 0.82));
  }
  T.push(blob([0, H0 + 5.2, 0], 3.0, seed + 90, [0.24, 0.38, 0.1], 0.85));
  return fuse(T);
}
function palmeGeo(seed) {
  const T = [], H = 9 + 4 * hash(seed, 2), lean = 1.5 + 2 * hash(seed, 3), la = hash(seed, 4) * 6.28, n = 9;
  const P = (u) => [Math.cos(la) * lean * u * u, H * u, Math.sin(la) * lean * u * u];
  for (let i = 0; i < n; i++) T.push(ast(P(i / n), P((i + 1) / n), 0.34 - 0.2 * (i / n), 0.34 - 0.2 * ((i + 1) / n), hx(i % 2 ? "#7D6A52" : "#6E5C46"), 6));
  const top = P(1);
  for (let k = 0; k < 11; k++) T.push(wedel({ L: 5.2 + 1.2 * hash(k, seed), hoch: 0.5 + 0.7 * hash(k, seed + 1), haengt: 1.2 + 0.7 * hash(k, seed + 2), ang: (k / 11) * 6.283 + hash(k, seed + 3), ab: top, n: 11, breite: 0.55, cu: [0.1, 0.27, 0.07], co: [0.36, 0.55, 0.14] }));
  T.push(blob([top[0], top[1] - 0.2, top[2]], 0.5, seed, [0.32, 0.22, 0.12], 0.9, 0));
  return fuse(T);
}
function baumfarnGeo(seed) {
  const T = [], H = 3.6 + 1.8 * hash(seed, 2);
  T.push(ast([0, 0, 0], [0.2, H, 0.1], 0.3, 0.2, hx("#3B2D22"), 6));
  for (let k = 0; k < 13; k++) T.push(wedel({ L: 3.0 + 0.8 * hash(k, seed), hoch: 1.1 + 0.8 * hash(k, seed + 1), haengt: 1.4, ang: (k / 13) * 6.283 + hash(k, seed + 3), ab: [0.2, H, 0.1], n: 10, breite: 0.38, cu: [0.07, 0.23, 0.06], co: [0.28, 0.5, 0.12] }));
  return fuse(T);
}
function araukarieGeo(seed) {
  const T = [], H = 20 + 5 * hash(seed, 2);
  T.push(ast([0, 0, 0], [0.3, H, 0], 0.55, 0.14, hx("#5A4A3C"), 7));
  const n = 7;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1), y = 9 + (H - 11) * f, r = (4.6 - 2.4 * f) * (0.85 + 0.3 * hash(i, seed + 3)), h = 3.2 - 0.8 * f;
    const g = new THREE.ConeGeometry(r, h, 8, 1); g.translate(0.15 * i, y + h / 2 - 0.5, 0);
    const yy = y;
    T.push(prim(g, (x, yv, z) => { const k = 0.5 + 0.5 * clamp((yv - yy + 0.5) / h); return [0.06 * k, 0.21 * k, 0.16 * k]; }));
  }
  return fuse(T);
}
function buschGeo(seed) {
  const T = [];
  for (let i = 0; i < 5; i++) { const a = i * 1.26 + hash(i, seed), R = 0.7 * hash(i, seed + 1); T.push(blob([Math.cos(a) * R, 0.7 + 0.35 * hash(i, seed + 2), Math.sin(a) * R], 0.85 + 0.45 * hash(i, seed + 3), seed + i, [0.2 + 0.08 * hash(i, seed + 4), 0.3, 0.1], 0.8, 1)); }
  return fuse(T);
}
function farnGeo(seed) {
  const T = [];
  for (let k = 0; k < 9; k++) T.push(wedel({ L: 1.2 + 0.4 * hash(k, seed), hoch: 1.2, haengt: 1.5, ang: (k / 9) * 6.283 + hash(k, seed + 3), n: 7, breite: 0.45, cu: [0.07, 0.22, 0.05], co: [0.3, 0.52, 0.14] }));
  return fuse(T);
}
function grasGeo() {
  const pos = [], col = [];
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4 + 0.3, r = 0.12 + 0.08 * (i % 2), x = Math.cos(a) * r, z = Math.sin(a) * r, w = 0.045, nx = -Math.sin(a) * w, nz = Math.cos(a) * w, h = 0.8 + 0.5 * ((i * 5) % 3) / 2;
    pos.push(x - nx, 0, z - nz, x + nx, 0, z + nz, x * 2.2, h, z * 2.2); col.push(0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 1, 1, 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  return g;
}

// ----------------------------------------------------------------------------------------------- Materialien
const WACHSEN = `
    vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float vis = smoothstep(iA.x, iA.x + 0.12, uW) * (1.0 - smoothstep(iA.y - 0.02, iA.y + 0.03, uEis)) * (1.0 - smoothstep(iA.z - 1.2, iA.z + 0.4, uPegel));
    vis = vis * (0.7 + 0.3 * smoothstep(iA.x, iA.x + 0.5, uW));
    transformed *= vis;`;
const ATTR = `attribute vec4 iA; uniform float uW, uEis, uPegel, uZeit, uWindS, uH; varying float vTint; varying vec3 vWN;`;
function pflanzenMaterial(u, { H = 20, wind = 1, doppel = false } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.92, metalness: 0, flatShading: true, vertexColors: true, side: doppel ? THREE.DoubleSide : THREE.FrontSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\n${ATTR}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
  {
    ${WACHSEN}
    vTint = iA.w;
    float k = clamp(position.y / ${H.toFixed(1)}, 0.0, 1.0);
    float ph = wp.x * 0.21 + wp.z * 0.17;
    transformed.x += (sin(uZeit * 1.1 + ph) * 0.34 + sin(uZeit * 2.3 + ph * 2.0) * 0.12) * k * k * uWindS * ${wind.toFixed(2)} * vis;
    transformed.z += cos(uZeit * 0.9 + ph) * 0.2 * k * k * uWindS * ${wind.toFixed(2)} * vis;
    vWN = normalize(mat3(instanceMatrix) * normal);
  }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying float vTint; varying vec3 vWN; uniform vec3 uTint, uTint2; uniform float uSchnee;`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  diffuseColor.rgb *= mix(uTint, uTint2, vTint) * (0.88 + 0.24 * vTint);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.92, 0.96), uSchnee * smoothstep(0.1, 0.7, vWN.y) * 0.9);`);
  };
  return m;
}
function tiefenMaterial(u, H = 20) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\n${ATTR}`).replace("#include <begin_vertex>", `#include <begin_vertex>\n  {\n  ${WACHSEN}\n  }`);
  };
  return m;
}

const BODEN_V = `
varying vec3 vNW; varying float vH, vM;
uniform float uEis;
float eisM(vec2 p, float h) {
  float zf = mix(420.0, -120.0, uEis);
  float lat = 1.0 - smoothstep(260.0, 400.0, abs(p.x - 110.0 + 25.0 * sin(p.y * 0.01)));
  float hh = 1.0 - smoothstep(16.0, 22.0, h);
  return smoothstep(zf, zf + 70.0, p.y) * lat * hh * step(0.001, uEis);
}`;
function bodenMaterial(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.97, metalness: 0, flatShading: true });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\n${BODEN_V}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
  vH = position.y; vM = eisM(position.xz, position.y);
  transformed.y += vM * 9.0 * (0.65 + 0.5 * fract(sin(dot(floor(position.xz * 0.08), vec2(12.9, 78.2))) * 43758.5));
  vNW = vec3(position.x, transformed.y, position.z);`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vNW; varying float vH, vM;
uniform vec3 uGrund, uGrund2, uStreu, uSand, uMud, uEisF, uSchneeF;
uniform float uSchnee, uPegel, uZeit, uWald;
${GLSL_NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  vec2 p = vNW.xz; float h = vH;
  float n1 = nN(p * 0.2), n2 = nN(p * 1.1), n3 = nF(p * 0.03);
  vec3 c = mix(uGrund, uGrund2, smoothstep(0.35, 0.7, nF(p * 0.045 + 3.0))) * (0.84 + 0.3 * n1) * (0.9 + 0.2 * n2);
  float wald = uWald * smoothstep(0.4, 0.65, nF(p * 0.012 + 8.0));
  c = mix(c, uStreu * (0.75 + 0.45 * nN(p * 0.8)), wald * 0.85);
  float seabed = smoothstep(0.8, -1.5, h);
  c = mix(c, uMud * (0.85 + 0.3 * nN(p * 0.25)), seabed * 0.92);
  float strand = smoothstep(2.4, 0.0, abs(h - uPegel - 0.7));
  c = mix(c, uSand * (0.9 + 0.2 * n2), strand * 0.9);
  float fl = 1.0 - smoothstep(10.0, 24.0, length(p - vec2(-60.0, 40.0)));
  float eis = smoothstep(0.08, 0.5, vM);
  vec3 ec = uEisF * (0.82 + 0.25 * nF(p * vec2(0.09, 0.03))) * (1.0 - 0.18 * smoothstep(0.55, 0.62, nN(p * vec2(0.7, 0.18))));
  c = mix(c, ec, eis);
  float sch = uSchnee * smoothstep(0.2, 0.5, n3 + 0.32 + 0.0016 * h);
  c = mix(c, uSchneeF * (0.93 + 0.1 * n2), sch);
  diffuseColor.rgb = c;`);
  };
  return m;
}

// ----------------------------------------------------------------------------------------------- Wasser
const WASSER_V = /* glsl */ `
attribute float aQ; varying vec3 vW; varying float vQ;
#include <fog_pars_vertex>
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vQ = aQ; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const WASSER_F = /* glsl */ `
uniform float zeit, pegel, strom; uniform vec3 tief, flach, himmel, sonneDir, sonneFarbe; uniform sampler2D grundTex; uniform vec4 grundBox;
varying vec3 vW; varying float vQ;
#include <fog_pars_fragment>
${GLSL_NOISE}
vec2 welle(vec2 p, float t, float amp) {
  vec2 g = vec2(0.0);
  vec2 d1 = normalize(vec2(0.25, 1.0)), d2 = normalize(vec2(-0.45, 0.9)), d3 = normalize(vec2(0.9, 0.45)), d4 = normalize(vec2(0.1, 1.0));
  g += d1 * 0.32 * cos(dot(p, d1) * 0.045 + t * 0.85);
  g += d2 * 0.22 * cos(dot(p, d2) * 0.11 + t * 1.3);
  g += d3 * 0.16 * cos(dot(p, d3) * 0.27 + t * 2.0);
  g += d4 * 0.10 * cos(dot(p, d4) * 0.62 + t * 2.9);
  return g * amp;
}
void main() {
  vec3 V = normalize(cameraPosition - vW);
  float d = length(cameraPosition.xz - vW.xz);
  vec2 uvG = (vW.xz - grundBox.xy) / grundBox.zw;
  float grund = (uvG.x > 0.0 && uvG.x < 1.0 && uvG.y > 0.0 && uvG.y < 1.0) ? texture2D(grundTex, uvG).r : -200.0;
  float tiefe = strom > 0.5 ? 2.6 * (1.0 - smoothstep(0.5, 1.0, abs(vQ))) + 0.15 : pegel - grund;
  vec2 p = vW.xz; p.y += strom * zeit * 5.0;
  float amp = (0.9 + 0.5 * strom) / (1.0 + d / 1400.0);
  vec2 g = welle(p, zeit, amp) + (vec2(nN(p * 0.04 + zeit * 0.25), nN(p.yx * 0.04 - zeit * 0.2)) - 0.5) * 0.3 * amp;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float fres = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N);
  float s = max(dot(R, normalize(sonneDir)), 0.0);
  float funkel = smoothstep(0.45, 0.75, nN(p * 0.35 + vec2(zeit * 1.3, -zeit * 0.9)));
  vec3 wasserF = mix(flach, tief, smoothstep(1.5, 26.0, tiefe));
  vec3 col = mix(wasserF, himmel, fres * 0.8) + sonneFarbe * (min(pow(s, 160.0) * 4.5 * (0.35 + 0.65 * funkel), 1.7) + pow(s, 30.0) * 0.28);
  float ufer = 1.0 - smoothstep(0.0, 7.0, tiefe);
  float band = smoothstep(0.55, 0.95, sin(tiefe * 1.1 + zeit * 1.6 + nN(p * 0.05) * 4.0) * 0.5 + 0.5);
  float schaum = ufer * (0.4 + 0.6 * band) * smoothstep(0.35, 0.6, nN(p * 0.25 + zeit * 0.3)) * (1.0 - 0.4 * strom);
  schaum += (1.0 - smoothstep(0.0, 1.4, tiefe)) * 0.75;
  schaum += smoothstep(0.78, 0.95, nN(p * 0.02 + vec2(zeit * 0.05, -zeit * 0.08))) * smoothstep(0.7, 0.9, nN(p * 0.11 - zeit * 0.2)) * 0.5 * (1.0 - strom);
  col = mix(col, vec3(0.92, 0.94, 0.95), clamp(schaum, 0.0, 1.0) * (1.0 - smoothstep(1500.0, 5000.0, d) * 0.6));
  gl_FragColor = vec4(col, 1.0);
#include <fog_fragment>
}`;

// ----------------------------------------------------------------------------------------------- Welt
function gelaendeGeo(x0, x1, z0, z1, zelle, loch) {
  const nx = Math.round((x1 - x0) / zelle), nz = Math.round((z1 - z0) / zelle), pos = new Float32Array((nx + 1) * (nz + 1) * 3);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = x0 + i * zelle, z = z0 + j * zelle; pos.set([x, hoehe(x, z), z], (j * (nx + 1) + i) * 3); }
  const idx = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (loch) { const cx = x0 + (i + 0.5) * zelle, cz = z0 + (j + 0.5) * zelle; if (cx > loch[0] && cx < loch[1] && cz > loch[2] && cz < loch[3]) continue; }
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeBoundingSphere();
  return g;
}

export class Muendung {
  constructor(szene, { schatten = true } = {}) {
    this.szene = szene; this.schatten = schatten; this.vertices = 0;
    this.u = {
      uGrund: { value: new THREE.Color("#5C7F3A") }, uGrund2: { value: new THREE.Color("#7E9A45") }, uStreu: { value: new THREE.Color("#3A4A22") },
      uSand: { value: new THREE.Color("#CDBB8E") }, uMud: { value: new THREE.Color("#8A8472") }, uEisF: { value: new THREE.Color("#CFE2EE") }, uSchneeF: { value: new THREE.Color("#EEF3F8") },
      uSchnee: { value: 0 }, uPegel: { value: 0 }, uZeit: { value: 0 }, uWald: { value: 0.5 }, uEis: { value: 0 }, uWindS: { value: 1 },
    };
    const INNEN = [-430, 520, -440, 340];
    const mat = bodenMaterial(this.u);
    const innen = new THREE.Mesh(gelaendeGeo(INNEN[0], INNEN[1], INNEN[2], INNEN[3], 5, null), mat);
    const aussen = new THREE.Mesh(gelaendeGeo(-2400, 2400, -3600, 1200, 24, [INNEN[0] + 1, INNEN[1] - 1, INNEN[2] + 1, INNEN[3] - 1]), mat);
    // Randschürze der Innenfläche: verhindert Risse zwischen feinem und grobem Gitter
    for (const m of [innen, aussen]) { m.receiveShadow = schatten; m.frustumCulled = false; szene.add(m); this.vertices += m.geometry.getAttribute("position").count; }
    innen.castShadow = false;
    // Wasserhöhen-Textur (Uferschaum, Farbe nach Tiefe)
    const GB = [-1700, -3300, 3400, 3800], TW = 512, TH = 512, td = new Uint16Array(TW * TH * 4);
    for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) { const k = (j * TW + i) * 4; td[k] = THREE.DataUtils.toHalfFloat(hoehe(GB[0] + (i + 0.5) / TW * GB[2], GB[1] + (j + 0.5) / TH * GB[3])); td[k + 3] = THREE.DataUtils.toHalfFloat(1); }
    const tex = new THREE.DataTexture(td, TW, TH, THREE.RGBAFormat, THREE.HalfFloatType); tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
    this.wU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { zeit: { value: 0 }, pegel: { value: 0 }, strom: { value: 0 }, tief: { value: new THREE.Color("#1D4660") }, flach: { value: new THREE.Color("#3F7F86") },
      himmel: { value: new THREE.Color("#B8C4D2") }, sonneDir: { value: new THREE.Vector3(0.5, 0.4, -0.7).normalize() }, sonneFarbe: { value: new THREE.Color("#FFF0D8") }, grundTex: { value: tex }, grundBox: { value: new THREE.Vector4(...GB) } }]);
    const meerG = new THREE.PlaneGeometry(60000, 60000, 2, 2).rotateX(-Math.PI / 2); meerG.setAttribute("aQ", new THREE.BufferAttribute(new Float32Array(meerG.getAttribute("position").count), 1));
    this.meer = new THREE.Mesh(meerG, new THREE.ShaderMaterial({ vertexShader: WASSER_V, fragmentShader: WASSER_F, uniforms: this.wU, fog: true })); this.meer.frustumCulled = false; szene.add(this.meer);
    // Flussband
    this.fU = THREE.UniformsUtils.clone(this.wU); this.fU.strom.value = 1; this.fU.grundTex.value = tex;
    const pos = [], q = [], idx = [], Z0 = 330, Z1 = -2300, dz = 5;
    for (let z = Z0, i = 0; z >= Z1; z -= dz, i++) { const x = flussX(z), hw = flussB(z) * 0.35 + 7, y = flussHoehe(z); pos.push(x - hw, y, z, x + hw, y, z); q.push(-1, 1); if (i > 0) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute("aQ", new THREE.Float32BufferAttribute(q, 1)); fg.setIndex(idx);
    this.fluss = new THREE.Mesh(fg, new THREE.ShaderMaterial({ vertexShader: WASSER_V, fragmentShader: WASSER_F, uniforms: this.fU, fog: true })); this.fluss.frustumCulled = false; this.fluss.renderOrder = 1; szene.add(this.fluss);

    // ---- Pflanzen
    this.typen = {};
    const sbox = (x, z) => x > -420 && x < 510 && z > -430 && z < 330;
    const baue = (name, geos, n, { zelle, dichte, H, wind = 1, doppel = false, mask, hMin = 0.4, nah = 14, skala = [0.8, 1.3], tint = ["#FFFFFF", "#FFFFFF"], schatten: sch = true, anzahlMax, bereich = [-420, 510, -430, 330], huegelMin = 0 }) => {
      const pro = geos.length, liste = [];
      for (let z = bereich[2]; z < bereich[3]; z += zelle) for (let x = bereich[0]; x < bereich[1]; x += zelle) {
        const sx = x + (hash(Math.round(x * 3.1 + z * 7.3), 11) - 0.5) * zelle, sz = z + (hash(Math.round(x * 5.7 - z * 1.9), 13) - 0.5) * zelle;
        const hh = hoehe(sx, sz); if (hh < hMin) continue;
        const dxr = Math.abs(sx - flussX(sz)); if (dxr < flussB(sz) * 0.35 + 9) continue;
        if (Math.hypot(sx - KNOSPE.x, sz - KNOSPE.z) < nah) continue;
        if (huegelMin && Math.hypot(sx - HUEGEL.x, sz - HUEGEL.z) < huegelMin) continue;
        const m = mask ? mask(sx, sz, hh) : 1; if (hash(Math.round(sx * 7.1 + sz * 3.3), 17) > m * dichte) continue;
        liste.push([sx, sz, hh]);
      }
      const N = anzahlMax ? Math.min(anzahlMax, liste.length) : liste.length;
      const iAs = [], mats = [];
      const u = { uW: { value: 0 }, uEis: this.u.uEis, uPegel: this.u.uPegel, uZeit: this.u.uZeit, uWindS: this.u.uWindS, uTint: { value: new THREE.Color(tint[0]) }, uTint2: { value: new THREE.Color(tint[1]) }, uSchnee: this.u.uSchnee };
      const material = pflanzenMaterial(u, { H, wind, doppel }), tiefenM = tiefenMaterial(u, H);
      const meshes = geos.map((g, gi) => { const cnt = Math.ceil(N / pro); const im = new THREE.InstancedMesh(g, material, cnt); im.frustumCulled = false; im.castShadow = sch && schatten; im.receiveShadow = schatten; if (sch) im.customDepthMaterial = tiefenM; return im; });
      const arrs = meshes.map((im) => new Float32Array(im.count * 4)), cnts = meshes.map(() => 0), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
      for (let k = 0; k < N; k++) {
        const [x, z, hh] = liste[k], gi = k % pro, im = meshes[gi], c = cnts[gi]++;
        const sk = lerp(skala[0], skala[1], hash(k, 21));
        Q.setFromAxisAngle(UP, hash(k, 22) * 6.283); S.set(sk, sk * (0.9 + 0.2 * hash(k, 23)), sk); P.set(x, hh - 0.05, z);
        im.setMatrixAt(c, M.compose(P, Q, S));
        arrs[gi].set([hash(k, 24) * 0.9, eisAnkunft(x, z, hh), hh, hash(k, 25)], c * 4);
      }
      meshes.forEach((im, gi) => { im.count = cnts[gi]; im.geometry = im.geometry.clone(); im.geometry.setAttribute("iA", new THREE.InstancedBufferAttribute(arrs[gi], 4)); im.instanceMatrix.needsUpdate = true; this.szene.add(im); this.vertices += im.geometry.getAttribute("position").count * im.count; });
      this.typen[name] = { u, meshes, n: N };
    };
    const wald = (a, b) => (x, z) => smoothstep(a, b, fbm(x * 0.012 + 4.0, z * 0.012 + 1.0));
    baue("fichte", [fichteGeo(1), fichteGeo(2), fichteGeo(3)], 0, { zelle: 11, dichte: 0.9, H: 22, mask: wald(0.35, 0.55), skala: [0.8, 1.35], tint: ["#FFFFFF", "#E8F0E8"], nah: 70, huegelMin: 112 });
    baue("laub", [laubGeo(5), laubGeo(6), laubGeo(7)], 0, { zelle: 11, dichte: 0.9, H: 16, mask: wald(0.38, 0.55), skala: [0.85, 1.35], tint: ["#FFFFFF", "#FFFFFF"], nah: 70, huegelMin: 112 });
    baue("palme", [palmeGeo(2), palmeGeo(9), palmeGeo(14)], 0, { zelle: 11, dichte: 0.9, H: 14, wind: 1.6, doppel: true, mask: wald(0.34, 0.5), skala: [0.85, 1.4], tint: ["#FFFFFF", "#FFFFFF"], nah: 55, huegelMin: 112 });
    baue("baumfarn", [baumfarnGeo(3), baumfarnGeo(8)], 0, { zelle: 8, dichte: 0.9, H: 7, wind: 1.3, doppel: true, mask: wald(0.28, 0.45), skala: [0.9, 1.6], tint: ["#FFFFFF", "#FFFFFF"], nah: 30, huegelMin: 0 });
    baue("arau", [araukarieGeo(4), araukarieGeo(11)], 0, { zelle: 14, dichte: 0.9, H: 28, mask: wald(0.4, 0.55), skala: [0.9, 1.4], tint: ["#FFFFFF", "#FFFFFF"], nah: 70, huegelMin: 112 });
    baue("busch", [buschGeo(2), buschGeo(6)], 0, { zelle: 3.6, dichte: 0.8, H: 2, mask: (x, z) => 0.3 + 0.7 * smoothstep(0.35, 0.6, fbm(x * 0.03 + 11, z * 0.03)), skala: [0.8, 1.5], tint: ["#FFFFFF", "#FFFFFF"], schatten: false, nah: 9, bereich: [-300, 400, -330, 160], zelle2: 1 });
    baue("farn", [farnGeo(2), farnGeo(7)], 0, { zelle: 2.0, dichte: 0.85, H: 1.5, wind: 1.2, doppel: true, mask: (x, z) => 0.5 + 0.5 * smoothstep(0.3, 0.6, fbm(x * 0.05, z * 0.05)), skala: [0.8, 1.9], tint: ["#FFFFFF", "#FFFFFF"], schatten: false, nah: 5, anzahlMax: 14000, bereich: [-190, 150, -190, 90] });
    baue("gras", [grasGeo()], 0, { zelle: 1.25, dichte: 0.95, H: 1.2, wind: 1.4, doppel: true, mask: () => 1, skala: [0.9, 1.7], tint: ["#FFFFFF", "#FFFFFF"], schatten: false, nah: 3, anzahlMax: 90000, bereich: [-190, 330, -260, 90] });
    this.tiere = new Tierwelt(szene, { schatten });
  }

  setze(t, kamera, S) {
    const u = this.u, W = this.wU, F = this.fU, f = S.farben;
    u.uZeit.value = t; u.uPegel.value = S.pegel; u.uEis.value = S.eis; u.uSchnee.value = S.schnee; u.uWindS.value = S.wind; u.uWald.value = S.wald ?? 0.5;
    u.uGrund.value.copy(f.grund); u.uGrund2.value.copy(f.grund2); u.uStreu.value.copy(f.streu); u.uSand.value.copy(f.sand); u.uMud.value.copy(f.mud);
    for (const V of [W, F]) { V.zeit.value = t; V.pegel.value = S.pegel; V.tief.value.copy(f.tief); V.flach.value.copy(f.flach); V.himmel.value.copy(f.himmel); V.sonneDir.value.set(...S.sonneDir).normalize(); V.sonneFarbe.value.copy(S.sonneFarbe); }
    this.meer.position.y = S.pegel;
    for (const [k, T] of Object.entries(this.typen)) { T.u.uW.value = S.gewicht[k] ?? 0; const on = T.u.uW.value > 0.001; for (const im of T.meshes) im.visible = on; }
    this.tiere.setze(t, S);
    return this;
  }
}

// ----------------------------------------------------------------------------------------------- Tiere
const matC = {};
const MT = (c) => (matC[c] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true }));
const IKO = new THREE.IcosahedronGeometry(1, 1);
function ell(par, r, p, c, rot) { const m = new THREE.Mesh(IKO, MT(c)); m.scale.set(...r); m.position.set(...p); if (rot) m.rotation.set(...rot); m.castShadow = true; m.receiveShadow = true; par.add(m); return m; }
function zyl(par, a, b, r0, r1, c, seg = 6) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B), m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L, seg, 1), MT(c));
  m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize()); m.castShadow = true; m.receiveShadow = true; par.add(m); return m;
}
function bein(par, hip, len, r0, r1, c) { const pv = new THREE.Group(); pv.position.set(...hip); const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 6, 1), MT(c)); m.position.y = -len / 2; m.castShadow = true; pv.add(m); const fuss = new THREE.Mesh(IKO, MT(c)); fuss.scale.set(r1 * 1.9, r1 * 0.9, r1 * 1.5); fuss.position.set(r1 * 0.8, -len, 0); fuss.castShadow = true; pv.add(fuss); par.add(pv); return pv; }
const kegel = (par, p, r, h, c, rot) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), MT(c)); m.position.set(...p); if (rot) m.rotation.set(...rot); m.castShadow = true; par.add(m); return m; };

const TIERE = {
  mammut() {
    const k = new THREE.Group(), B = "#5A3D2A", D = "#3B2A1F", beine = [];
    ell(k, [1.9, 1.45, 1.25], [0, 2.5, 0], B); ell(k, [1.2, 1.05, 1.05], [1.3, 3.2, 0], "#4A3223"); ell(k, [1.0, 1.15, 0.95], [2.1, 2.55, 0], B); ell(k, [1.8, 0.75, 1.3], [0, 1.5, 0], D);
    zyl(k, [2.7, 2.3, 0], [3.2, 1.2, 0], 0.34, 0.22, "#4F3626"); zyl(k, [3.2, 1.2, 0], [3.0, 0.3, 0], 0.22, 0.13, "#4F3626");
    for (const s of [-1, 1]) { zyl(k, [2.6, 1.9, 0.55 * s], [3.5, 1.3, 0.95 * s], 0.1, 0.07, "#E8E0CC"); zyl(k, [3.5, 1.3, 0.95 * s], [4.2, 1.9, 0.8 * s], 0.07, 0.03, "#E8E0CC"); ell(k, [0.1, 0.5, 0.42], [1.9, 2.95, 0.95 * s], "#4A3223"); }
    zyl(k, [-1.8, 2.8, 0], [-2.3, 1.7, 0], 0.12, 0.05, D);
    for (const [x, z] of [[1.1, 0.7], [1.1, -0.7], [-1.1, 0.7], [-1.1, -0.7]]) beine.push(bein(k, [x, 1.9, z], 1.9, 0.4, 0.3, D));
    return { g: k, beine, kopf: null, amp: 0.4 };
  },
  pferd() {
    const k = new THREE.Group(), B = "#A07850", D = "#5E4630", beine = [];
    ell(k, [0.95, 0.4, 0.3], [0, 1.15, 0], B); ell(k, [0.35, 0.3, 0.3], [0.8, 1.2, 0], B);
    const hals = zyl(k, [0.95, 1.3, 0], [1.4, 1.95, 0], 0.17, 0.12, B); const kopf = ell(k, [0.42, 0.14, 0.12], [1.72, 2.0, 0], B, [0, 0, -0.4]);
    zyl(k, [1.0, 1.55, 0], [0.8, 1.7, 0], 0.07, 0.03, D);
    zyl(k, [-0.95, 1.25, 0], [-1.3, 0.55, 0], 0.07, 0.03, D);
    for (const [x, z] of [[0.7, 0.14], [0.7, -0.14], [-0.7, 0.14], [-0.7, -0.14]]) beine.push(bein(k, [x, 1.0, z], 1.0, 0.07, 0.04, D));
    return { g: k, beine, kopf, amp: 0.6, kopfNick: 0.5 };
  },
  krokodil() {
    const k = new THREE.Group(), B = "#4A5A3A", D = "#34402A", beine = [];
    ell(k, [1.8, 0.3, 0.6], [0, 0.4, 0], B); ell(k, [0.9, 0.18, 0.4], [1.9, 0.38, 0], B); ell(k, [0.9, 0.13, 0.25], [2.7, 0.33, 0], "#566847");
    const schwanz = []; zyl(k, [-1.6, 0.4, 0], [-3.0, 0.3, 0], 0.4, 0.22, B); zyl(k, [-3.0, 0.3, 0], [-4.2, 0.22, 0], 0.22, 0.08, B);
    for (const [x, z] of [[1.0, 0.65], [1.0, -0.65], [-0.9, 0.65], [-0.9, -0.65]]) { const l = new THREE.Group(); l.position.set(x, 0.3, z); zyl(l, [0, 0, 0], [0, -0.3, z > 0 ? 0.25 : -0.25], 0.12, 0.08, D); k.add(l); beine.push(l); }
    for (let i = 0; i < 8; i++) ell(k, [0.12, 0.08, 0.1], [1.4 - i * 0.45, 0.68 - Math.abs(i - 2) * 0.03, 0], D);
    return { g: k, beine, amp: 0.15, schlange: true };
  },
  klein() {
    const k = new THREE.Group();
    ell(k, [0.22, 0.12, 0.1], [0, 0.14, 0], "#3F2F24"); ell(k, [0.09, 0.07, 0.07], [0.22, 0.17, 0], "#3F2F24"); zyl(k, [-0.2, 0.14, 0], [-0.5, 0.1, 0], 0.03, 0.01, "#3F2F24", 4);
    return { g: k, beine: [], amp: 0, huepf: true };
  },
  sauropode() {
    const k = new THREE.Group(), B = "#7C8A6A", H = "#A8AF8A", D = "#5E6A52", beine = [];
    ell(k, [3.4, 2.3, 1.7], [0, 6.0, 0], B); ell(k, [2.8, 1.2, 1.4], [0, 5.0, 0], H);
    const pts = [[2.6, 7.0], [4.0, 9.0], [4.8, 11.5], [5.4, 14.0], [6.2, 16.0]]; let pr = [2.0, 6.6]; pts.forEach((p, i) => { zyl(k, [pr[0], pr[1], 0], [p[0], p[1], 0], 0.85 - 0.12 * i, 0.72 - 0.12 * i, B); pr = p; });
    ell(k, [0.8, 0.45, 0.4], [6.9, 16.3, 0], B, [0, 0, 0.2]);
    zyl(k, [-3.0, 6.0, 0], [-5.5, 4.8, 0], 1.0, 0.7, B); zyl(k, [-5.5, 4.8, 0], [-8.5, 3.4, 0], 0.7, 0.4, B); zyl(k, [-8.5, 3.4, 0], [-11, 2.6, 0], 0.4, 0.1, B);
    for (const [x, z] of [[2.0, 1.1], [2.0, -1.1], [-2.0, 1.1], [-2.0, -1.1]]) beine.push(bein(k, [x, 4.6, z], 4.6, 0.75, 0.6, D));
    return { g: k, beine, amp: 0.22, kopf: null };
  },
  hadrosaurier() {
    const k = new THREE.Group(), B = "#A78B52", D = "#6F5A34", H = "#C9B27A", beine = [];
    ell(k, [2.5, 1.35, 1.0], [0, 3.6, 0], B); ell(k, [2.0, 0.75, 0.9], [0, 3.1, 0], H);
    zyl(k, [2.0, 4.0, 0], [3.0, 5.4, 0], 0.55, 0.38, B); const kopf = new THREE.Group(); kopf.position.set(3.0, 5.4, 0); k.add(kopf);
    ell(kopf, [0.95, 0.3, 0.42], [0.5, 0, 0], B, [0, 0, -0.3]); ell(kopf, [0.5, 0.3, 0.3], [0, 0.15, 0], D); kegel(kopf, [0.15, 0.55, 0], 0.1, 0.7, D, [0, 0, 0.7]);
    zyl(k, [-2.2, 3.7, 0], [-4.5, 3.2, 0], 0.7, 0.45, B); zyl(k, [-4.5, 3.2, 0], [-7.0, 2.6, 0], 0.45, 0.08, B);
    for (const [x, z] of [[-0.6, 0.8], [-0.6, -0.8]]) beine.push(bein(k, [x, 3.0, z], 3.0, 0.5, 0.3, D));
    for (const [x, z] of [[1.6, 0.6], [1.6, -0.6]]) beine.push(bein(k, [x, 2.8, z], 2.0, 0.28, 0.2, D));
    return { g: k, beine, amp: 0.3, kopf, kopfNick: 0.35 };
  },
  ceratopsier() {
    const k = new THREE.Group(), B = "#8B6F5A", D = "#5C4636", H = "#B59A7A", beine = [];
    ell(k, [2.7, 1.45, 1.4], [0, 2.1, 0], B); ell(k, [2.3, 0.7, 1.2], [0, 1.4, 0], H);
    const kopf = new THREE.Group(); kopf.position.set(2.6, 2.2, 0); k.add(kopf);
    ell(kopf, [1.3, 0.8, 0.7], [0.4, 0, 0], B); ell(kopf, [0.3, 1.6, 1.8], [-0.7, 0.9, 0], "#9E7355", [0, 0, 0.25]);
    kegel(kopf, [1.3, 0.8, 0.3], 0.14, 1.4, "#E8E0CC", [0, 0, -1.2]); kegel(kopf, [1.3, 0.8, -0.3], 0.14, 1.4, "#E8E0CC", [0, 0, -1.2]); kegel(kopf, [1.75, 0.1, 0], 0.12, 0.5, "#CFC3A8", [0, 0, -1.4]);
    zyl(k, [-2.4, 2.3, 0], [-4.2, 1.5, 0], 0.55, 0.12, B);
    for (const [x, z] of [[1.7, 0.95], [1.7, -0.95], [-1.7, 0.95], [-1.7, -0.95]]) beine.push(bein(k, [x, 1.6, z], 1.6, 0.42, 0.33, D));
    return { g: k, beine, amp: 0.28, kopf, kopfNick: 0.25 };
  },
  flugsaurier() {
    const k = new THREE.Group(), fl = [];
    ell(k, [0.8, 0.28, 0.28], [0, 0, 0], "#7A6A58"); zyl(k, [0.7, 0.08, 0], [2.8, 0.1, 0], 0.17, 0.06, "#8A7A66"); kegel(k, [-0.5, 0.35, 0], 0.12, 1.6, "#B4654A", [0, 0, 1.9]); zyl(k, [-0.7, 0, 0], [-1.6, -0.1, 0], 0.1, 0.02, "#7A6A58");
    for (const s of [-1, 1]) {
      const pv = new THREE.Group(); const pos = [0, 0, 0, 1.2, 0, 1.3 * s, -1.2, 0, 0.9 * s, 1.2, 0, 1.3 * s, 0.6, 0.3, 5.4 * s, -1.2, 0, 0.9 * s, 0.6, 0.3, 5.4 * s, -2.6, -0.05, 4.2 * s, -1.2, 0, 0.9 * s];
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: "#9B7C62", roughness: 0.9, side: THREE.DoubleSide, flatShading: true })); m.castShadow = true; pv.add(m); k.add(pv); pv.userData.s = s; fl.push(pv);
    }
    return { g: k, beine: [], fl, amp: 0 };
  },
};

/** Tiere als Gruppen. add(typ, { p0:[x,z], v:[vx,vz], von, bis, skala, gang, seed, hoch?, kreis? }) – gehen, grasen, trinken, kreisen */
export class Tierwelt {
  constructor(szene, { schatten = true } = {}) { this.szene = szene; this.liste = []; this.schatten = schatten; this.pegel = 0; }
  add(typ, o) {
    const b = TIERE[typ](); const grp = new THREE.Group(); grp.add(b.g); this.szene.add(grp);
    const e = { b, grp, typ, ...o, skala: o.skala ?? 1, gang: o.gang ?? 1.3, ph: hash(o.seed ?? this.liste.length, 7) * 6.28 };
    grp.visible = false; this.liste.push(e); return e;
  }
  setze(t, S) {
    for (const e of this.liste) {
      const { b, grp } = e, von = e.von ?? 0, bis = e.bis ?? 999;
      const vis = smoothstep(von, von + (e.ein ?? 0.8), t) * (1 - smoothstep(bis - (e.aus ?? 0.8), bis, t));
      grp.visible = vis > 0.01; if (!grp.visible) continue;
      let x, z, y, yaw;
      if (e.kreis) {                                                             // Flugsaurier: kreisen
        const w = (e.kreis.w0 ?? 0) + e.kreis.om * t; x = e.kreis.c[0] + Math.cos(w) * e.kreis.R; z = e.kreis.c[1] + Math.sin(w) * e.kreis.R; y = e.kreis.h + Math.sin(t * 0.6 + e.ph) * 2.2;
        yaw = Math.atan2(-Math.sin(w) * Math.sign(e.kreis.om), Math.cos(w) * Math.sign(e.kreis.om));
        grp.rotation.z = 0.0;
        for (const pv of b.fl) { pv.rotation.x = -pv.userData.s * (0.28 * Math.sin(t * 2.4 + e.ph) + 0.12); }
        grp.rotation.x = -0.18 * Math.sign(e.kreis.om) * 0.0;
      } else {
        const tt = Math.min(t, e.stopp ?? 1e9) - von; x = e.p0[0] + (e.v?.[0] ?? 0) * tt; z = e.p0[1] + (e.v?.[1] ?? 0) * tt;
        y = (e.huepf ? 0 : 0) + hoehe(x, z);
        yaw = e.yaw !== undefined ? e.yaw : Math.atan2(-(e.v?.[1] ?? 0), e.v?.[0] ?? 1);
        const ph = t * e.gang * 6.283 + e.ph, bew = (e.stopp !== undefined && t >= e.stopp) || b.schlange || ((Math.abs(e.v?.[0] ?? 0) + Math.abs(e.v?.[1] ?? 0)) < 0.05) ? 0 : 1;
        b.beine.forEach((pv, i) => { pv.rotation.z = Math.sin(ph + (i === 1 || i === 2 ? Math.PI : 0)) * b.amp * bew; });
        if (b.kopf) b.kopf.rotation.z = (b.kopfNick ?? 0.3) * (e.trinkt ? -1.0 * smoothstep(e.trinkt[0], e.trinkt[0] + 0.8, t) * (0.7 + 0.3 * Math.sin(t * 1.4 + e.ph)) : Math.sin(t * 0.8 + e.ph)) * 0.8;
        grp.position.y = 0; if (e.huepf) y += Math.abs(Math.sin(t * 9 + e.ph)) * 0.18;
        if (b.schlange) b.g.rotation.y = Math.sin(t * 0.7 + e.ph) * 0.06;
        b.g.position.y = bew * Math.abs(Math.sin(ph)) * 0.05 * e.skala;
      }
      grp.position.set(x, y + (e.hoch ?? 0), z); grp.rotation.y = yaw; grp.scale.setScalar(Math.max(0.0001, e.skala * (0.2 + 0.8 * vis)));
    }
  }
}
