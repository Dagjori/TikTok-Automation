// Grundwelt „Sommerwiese am Teich – Tag und Sternenhimmel“ (Account 2 @stelldirvor.pov, Weltenkatalog „Land, Feld → Wald“ / „Nachthimmel“)
// Erstbau 07.11.2026 („Was wäre, wenn die Sonne in diesem Moment erlischt?“, Skript acc2-2026-11-07-abend). NUR für den Baukasten Lunar-POV.
//
// Inhalt: Wiese mit Gräsern im Wind (Tausende Büschel, Höhenwuchs vor der Kamera begrenzt), sechs Wildblumenarten, Teich mit Schilf und Seerosen,
// ferne Baumreihen und Hügel im Dunst; Insekten (Bienen, Schmetterlinge, Libellen) als reine Funktion von t; ein Himmel aus einem Shader:
// Tageshimmel mit Wolken und Halbmond, Nachthimmel mit drei Sternebenen, Milchstraße (Staubband), Planeten als helle Punkte, Sternenrotation
// (Zeitraffer), alles auch im Teich gespiegelt (Wasser-Shader nutzt dieselbe Himmelsfunktion).
// Steuerung je Bild (alles Funktion von t, kein Zustand):
//   const welt = new Sommerwiese(szene);
//   welt.setze(t, kamera, { tag: 1|0, zenit, horizont, nachtZenit, nachtHorizont, sonne:[x,y,z], mond:{ r, hell, dunkel }, planeten:[{ r, farbe, kern, halo }],
//                           rot: THREE.Matrix3, sterne: 0..1, wind, insekten: 0|1, ufer: THREE.Color, wolken })
// Lehre 07.11. (Meer-Video): Objekte stehen immer sichtbar auf ihrem Untergrund (alle Positionen aus hoehe(x, z) minus 3 cm), Wasser schneidet das
// Gelände (keine deckungsgleichen Flächen), Gelände aus zwei Gittern mit überlappendem Rand.
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { GLSL_NOISE, klumpen } from "./welt_feld_wald.js";

const fr = (x) => x - Math.floor(x);
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= 0.5; } return s; }
const C = (h) => new THREE.Color(h);

// ------------------------------------------------------------------------------------------------ Gelände
export const TEICH = { x: 4, z: -19, a: 26, b: 15 };
export const WASSER_Y = 0;
export const AUGE_XZ = { x: 0, z: 3.5 };
/** Teichmaß: < 1 innerhalb der Uferlinie (Ellipse mit Rauschen) */
export const teichMass = (x, z) => ((x - TEICH.x) / TEICH.a) ** 2 + ((z - TEICH.z) / TEICH.b) ** 2 + 0.16 * (fbm(x * 0.055 + 2.1, z * 0.07 + 8.4, 3) - 0.5);
/** Gelände (m, Wasserfläche = 0): flache Wiese ±0,22 m, sanfter Uferhang, Teichgrund −0,75 m, ferne Hügel in 0,4–3 km */
export function hoehe(x, z) {
  const dd = Math.hypot(x, z + 25);
  let y = 0.5 + 0.44 * (fbm(x * 0.04 + 1.7, z * 0.04 + 4.2, 3) - 0.5) + 0.01 * clamp(-z - 30, 0, 300);
  y += 120 * smoothstep(400, 3200, dd) * fbm(x * 0.0006 + 7, z * 0.0006 + 2, 4);
  const m = teichMass(x, z);
  const t = 1 - smoothstep(0.5, 1.05, m);
  return lerp(y, -0.75, t);
}
const NAH = { x: 60, zc: -25, zh: 50 };           // Nahgitter: x ±60, z −75 … 25, Zellen 0,4 m
const inNah = (x, z) => Math.abs(x) < NAH.x && Math.abs(z - NAH.zc) < NAH.zh;

// ------------------------------------------------------------------------------------------------ Shader-Bausteine
const SKY_GLSL = /* glsl */ `
uniform vec3 uZenit, uHorizont, uNachtZenit, uNachtHorizont, uSonne, uMond, uGal, uGalX;
uniform float uGalH, uTag, uZeit, uSterne, uMondHell, uMondDunkel, uMondR, uWolken;
uniform mat3 uRot;
uniform vec3 uPD[4]; uniform vec3 uPF[4]; uniform vec2 uPG[4];
float sh31(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
vec3 sterneEbene(vec3 d, float N, float prob, float sz, float helle, float boost) {
  vec3 p = d * N, ip = floor(p), acc = vec3(0.0);
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
    vec3 c = ip + vec3(float(x), float(y), float(z));
    if (sh31(c + 3.7) > prob * boost) continue;
    vec3 pos = c + vec3(sh31(c + 1.3), sh31(c + 7.1), sh31(c + 11.9));
    vec3 dv = p - pos;
    float b = 0.3 + 0.7 * sh31(c + 5.5); b *= b;
    float tw = 0.9 + 0.1 * sin(uZeit * (1.5 + 3.0 * sh31(c + 2.2)) + sh31(c) * 40.0);
    vec3 tint = mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.84, 0.66), sh31(c + 9.1));
    acc += tint * b * tw * exp(-dot(dv, dv) / (sz * sz)) * helle;
  }
  return acc;
}
vec3 milchstrasse(vec3 dr, out float band) {
  float b = dot(dr, uGal);
  float l = atan(dot(dr, uGalX), dot(dr, cross(uGal, uGalX)));
  band = exp(-pow(b / 0.21, 2.0));
  float n = nF(vec2(l * 2.4, b * 9.0) + 3.0) * 0.6 + nF(vec2(l * 5.1, b * 17.0) + 8.0) * 0.4;
  float bulge = exp(-pow(abs(l) / 0.95, 2.0));
  vec3 col = mix(vec3(0.075, 0.09, 0.15), vec3(0.2, 0.17, 0.15), bulge) * band * (0.35 + 1.15 * n) * uGalH;
  col += vec3(0.16, 0.15, 0.17) * exp(-pow(b / 0.07, 2.0)) * bulge * n;
  float lane = exp(-pow((b - 0.015) / 0.032, 2.0)) * smoothstep(0.32, 0.68, nF(vec2(l * 4.5, b * 22.0) + 11.0));
  col *= 1.0 - 0.75 * lane;
  return col;
}
vec3 nachtHimmel(vec3 d) {
  float h = d.y;
  vec3 col = mix(uNachtHorizont, uNachtZenit, 1.0 - exp(-max(h, 0.0) / 0.32));
  col = mix(col, uNachtHorizont * 0.35, smoothstep(0.0, -0.12, h));
  vec3 dr = uRot * d;
  float band;
  vec3 mw = milchstrasse(dr, band);
  vec3 st = sterneEbene(dr, 58.0, 0.055, 0.052, 1.9, 1.0) + sterneEbene(dr, 125.0, 0.085, 0.058, 0.85, 1.0 + 1.5 * band) + sterneEbene(dr, 250.0, 0.11, 0.066, 0.42, 1.0 + 2.2 * band);
  float ext = smoothstep(-0.02, 0.16, h);                       // Horizont schluckt Licht (Dunst)
  float okk = 1.0;
  float am = acos(clamp(dot(d, uMond), -1.0, 1.0));
  okk *= 1.0 - (1.0 - smoothstep(uMondR * 0.9, uMondR, am)) * uMondDunkel;   // erloschener Mond verdeckt Sterne als schwarze Scheibe
  col += (mw + st) * uSterne * ext * okk;
  for (int i = 0; i < 4; i++) {
    float a2 = 2.0 * (1.0 - dot(d, uPD[i]));
    col += uPF[i] * (exp(-a2 / (uPG[i].x * uPG[i].x)) + 0.16 * exp(-a2 / (uPG[i].y * uPG[i].y))) * ext;
  }
  return col;
}
vec3 tagHimmel(vec3 d) {
  float h = d.y;
  float g = 1.0 - exp(-max(h, 0.0) / 0.3);
  vec3 col = mix(uHorizont, uZenit, g);
  col = mix(col, uHorizont * 0.82, smoothstep(0.0, -0.1, h));
  if (h > 0.0) {
    vec2 q = d.xz / (h + 0.22) * 1.5 + vec2(uZeit * 0.011, uZeit * 0.004);
    float w = nF(q * 1.15 + 4.0);
    float cum = smoothstep(0.54 - 0.12 * uWolken, 0.78, w) * smoothstep(0.0, 0.18, h) * step(0.001, uWolken);
    float sch = nF(q * 1.15 + 4.0 + normalize(uSonne.xz) * 0.2);
    vec3 cc = mix(vec3(1.0, 0.99, 0.96), vec3(0.62, 0.68, 0.78), clamp((sch - w) * 2.4 + 0.4, 0.0, 1.0) * 0.8);
    col = mix(col, cc * 1.05, cum * 0.88);
    float zi = smoothstep(0.56, 0.86, nF(vec2(q.x * 0.5, q.y * 4.2) + 20.0)) * smoothstep(0.02, 0.3, h) * 0.35 * step(0.001, uWolken);
    col = mix(col, vec3(0.95, 0.97, 1.0), zi);
  }
  return col;
}
vec3 mondScheibe(vec3 d, vec3 base, bool nacht) {
  float am = acos(clamp(dot(d, uMond), -1.0, 1.0));
  if (am > uMondR * 1.15) return base;
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), uMond)), up = cross(uMond, right);
  vec2 q = vec2(dot(d, right), dot(d, up)) / uMondR;
  float r2 = dot(q, q);
  float disc = 1.0 - smoothstep(0.93, 1.0, sqrt(r2));
  if (disc <= 0.0) return base;
  vec3 n = normalize(right * q.x + up * q.y + uMond * sqrt(max(1.0 - r2, 0.0)));
  float lit = smoothstep(-0.03, 0.05, dot(n, normalize(uSonne)));
  float mare = smoothstep(0.42, 0.62, nF(q * 2.6 + 5.0)) * 0.3 + 0.1 * nF(q * 7.0);
  vec3 mc = vec3(0.93, 0.92, 0.86) * (0.95 - mare) * mix(0.8, 1.5, float(nacht));
  vec3 res = mix(base, mix(base, mc, mix(0.8, 1.0, float(nacht))), disc * lit * uMondHell);
  return res;
}
vec3 skyColor(vec3 d) {
  vec3 col = vec3(0.0);
  if (uTag > 0.001) col += uTag * mondScheibe(d, tagHimmel(d), false);
  if (uTag < 0.999) col += (1.0 - uTag) * mondScheibe(d, nachtHimmel(d), true);
  return col;
}
`;

function bauGeo(teile) {   // teile: [{ g, c: Color | (x,y,z)=>[r,g,b], f? }] → Geometrie mit Vertexfarben und Flügel-Flag
  const pos = [], col = [], fl = [];
  for (const t of teile) {
    const g = t.g.index ? t.g.toNonIndexed() : t.g, p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      pos.push(x, y, z);
      const c = typeof t.c === "function" ? t.c(x, y, z) : [t.c.r, t.c.g, t.c.b];
      col.push(c[0], c[1], c[2]); fl.push(t.f || 0);
    }
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); o.setAttribute("aFl", new THREE.Float32BufferAttribute(fl, 1));
  o.computeVertexNormals();
  return o;
}
const farbVon = (hex, f = 1) => { const c = C(hex); return [c.r * f, c.g * f, c.b * f]; };

// Gras: Halme als Dreiecke mit Farbverlauf (Fuß dunkel, Spitze hell), Normalen nach oben (weiche Beleuchtung wie der Boden)
function grasBuschel() {
  const pos = [], col = [], nor = [];
  const fuss = farbVon("#3F5E1E", 1), spitze = farbVon("#9CC04E", 1);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39996, r = 0.05 + 0.2 * Math.sqrt((i + 0.5) / 9), x = Math.cos(a) * r, z = Math.sin(a) * r, w = 0.045 + 0.02 * (i % 3);
    const nx = -Math.sin(a) * w, nz = Math.cos(a) * w, hh = 0.72 + 0.28 * ((i * 5) % 9) / 8, lean = 0.22 + 0.25 * ((i * 7) % 5) / 4;
    const tx = x + Math.cos(a) * lean, tz = z + Math.sin(a) * lean;
    pos.push(x - nx, 0, z - nz, x + nx, 0, z + nz, tx, hh, tz);
    col.push(...fuss, ...fuss, ...spitze); nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  return g;
}
// Blume: Stiel (0 … h) und Kopf als offener Kelch, zur Kamera (+z) geneigt, in Metern; Farbvarianten über Typ
const BLUMEN = [
  { name: "gaensebluemchen", blatt: "#F7F5EC", mitte: "#E9B820", hoehe: 0.34, kopf: 0.05, anzahl: 900 },
  { name: "mohn", blatt: "#D62C1C", mitte: "#2A1612", hoehe: 0.52, kopf: 0.06, anzahl: 520 },
  { name: "hahnenfuss", blatt: "#F0C412", mitte: "#C98A10", hoehe: 0.4, kopf: 0.04, anzahl: 800 },
  { name: "kornblume", blatt: "#4768D8", mitte: "#27337A", hoehe: 0.5, kopf: 0.045, anzahl: 520 },
  { name: "klee", blatt: "#C45A98", mitte: "#8A3A6E", hoehe: 0.3, kopf: 0.045, anzahl: 700 },
  { name: "margerite", blatt: "#FBFAF4", mitte: "#E6A818", hoehe: 0.62, kopf: 0.07, anzahl: 360 },
];
function blumeGeo(b) {
  const stiel = new THREE.CylinderGeometry(0.004, 0.006, b.hoehe, 4); stiel.translate(0, b.hoehe / 2, 0);
  const blattG = new THREE.PlaneGeometry(0.05, 0.016); blattG.rotateX(-Math.PI / 2 + 0.5); blattG.translate(0.03, b.hoehe * 0.3, 0);
  const kelch = new THREE.ConeGeometry(b.kopf, b.kopf * 0.9, 9, 1, true); kelch.rotateX(Math.PI); kelch.rotateX(-0.55); kelch.translate(0, b.hoehe + 0.005, 0.012);
  const mitte = new THREE.IcosahedronGeometry(b.kopf * 0.38, 0); mitte.translate(0, b.hoehe + 0.012, 0.022);
  return bauGeo([{ g: stiel, c: C("#4C7A2A") }, { g: blattG, c: C("#5C8A30") }, { g: kelch, c: C(b.blatt) }, { g: mitte, c: C(b.mitte) }]);
}
function schilfGeo() {
  const stiel = new THREE.CylinderGeometry(0.008, 0.012, 1.5, 4); stiel.translate(0, 0.75, 0);
  const kolben = new THREE.CylinderGeometry(0.022, 0.022, 0.22, 6); kolben.translate(0, 1.38, 0);
  const b1 = new THREE.PlaneGeometry(0.04, 1.3, 1, 4), b2 = b1.clone();
  for (const [b, rot] of [[b1, 0.7], [b2, 2.3]]) { const p = b.getAttribute("position"); for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.65; p.setX(i, p.getX(i) + 0.14 * y * y * 0.6); p.setY(i, y); } b.rotateY(rot); }
  return bauGeo([{ g: stiel, c: C("#587A34") }, { g: kolben, c: C("#4A2E1A") }, { g: b1, c: C("#4E7A30") }, { g: b2, c: C("#5C8A38") }]);
}
function seerosenGeo() {
  const blatt = new THREE.CircleGeometry(0.28, 14, 0.3, Math.PI * 2 - 0.5); blatt.rotateX(-Math.PI / 2);
  const blueteB = new THREE.ConeGeometry(0.07, 0.07, 8, 1, true); blueteB.rotateX(Math.PI); blueteB.translate(0.04, 0.05, 0.02);
  return bauGeo([{ g: blatt, c: C("#2F6A2C") }, { g: blueteB, c: C("#F6EBF0") }]);
}
function baumGeos() {
  const kronen = [0, 1].map((s) => { const g = klumpen(26, 40 + s * 11, { flach: 0.9, streu: 0.6 }); g.translate(0, 0.9, 0); return g; });
  const stamm = new THREE.CylinderGeometry(0.06, 0.1, 1.2, 6); stamm.translate(0, 0.6, 0);
  return { kronen, stamm: bauGeo([{ g: stamm, c: C("#5A4430") }]) };
}

function wiesenMaterial(u, tuft = false) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.95, metalness: 0, vertexColors: true, side: THREE.DoubleSide, flatShading: false });
  const f = (s) => s.toFixed(3);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uZeit = u.uZeit; sh.uniforms.uWindS = u.uWindS;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uZeit, uWindS;\nattribute float aFl;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
  {
    vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float k = clamp(position.y / ${tuft ? "0.9" : "0.5"}, 0.0, 1.5);
    float ph = wp.x * 0.31 + wp.z * 0.19;
    float welle = sin(uZeit * 1.5 + ph) * 0.6 + sin(uZeit * 2.7 + ph * 1.9) * 0.3 + sin(uZeit * 0.6 + wp.x * 0.08 - wp.z * 0.05) * 0.8;
    transformed.x += welle * k * k * ${tuft ? "0.16" : "0.06"} * uWindS;
    transformed.z += cos(uZeit * 1.2 + ph) * k * k * ${tuft ? "0.07" : "0.03"} * uWindS;
  }`);
  };
  return m;
}

function bodenMaterial(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.97, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vNW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvNW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vNW;
${GLSL_NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  vec2 p = vNW.xz; float y = vNW.y;
  float dc = length(p - cameraPosition.xz);
  float n1 = nN(p * 0.25), n2 = nN(p * 1.3), n3 = nF(p * 0.1);
  vec3 c = mix(vec3(0.115, 0.215, 0.045), vec3(0.19, 0.30, 0.07), smoothstep(0.3, 0.7, nF(p * 0.11 + 2.0)));
  c *= 0.82 + 0.32 * n2 + 0.1 * n1;
  c = mix(c, vec3(0.33, 0.30, 0.10), smoothstep(0.6, 0.82, nF(p * 0.035 + 7.0)) * 0.55);
  // Wildblumen als Punkte in Flecken (nur in der Nähe, sonst Mittelwert)
  float flecken = smoothstep(0.36, 0.66, nF(p * 0.07 + 3.0));
  vec3 z = nZelle(p * 2.6);
  float dot1 = (1.0 - smoothstep(0.06, 0.13, z.x)) * step(0.4, nH(floor(p * 2.6) + 1.3)) * flecken * (1.0 - smoothstep(30.0, 70.0, dc));
  vec3 bc = z.z < 0.3 ? vec3(0.9, 0.88, 0.8) : (z.z < 0.55 ? vec3(0.9, 0.62, 0.05) : (z.z < 0.7 ? vec3(0.62, 0.07, 0.04) : (z.z < 0.85 ? vec3(0.1, 0.16, 0.6) : vec3(0.52, 0.16, 0.36))));
  c = mix(c, bc, dot1 * 0.85);
  // Uferstreifen: feuchte Erde, unter Wasser Schlamm
  float nass = 1.0 - smoothstep(0.04, 0.34, y);
  c = mix(c, vec3(0.1, 0.075, 0.045) * (0.8 + 0.4 * n2), nass * 0.9);
  c = mix(c, vec3(0.025, 0.04, 0.03), (1.0 - smoothstep(-0.35, 0.0, y)) * 0.8);
  c = mix(c, c * vec3(0.85, 0.95, 1.0), smoothstep(200.0, 1500.0, dc) * 0.4);
  diffuseColor.rgb = c;`);
  };
  return m;
}

const WASSER_V = `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const WASSER_F = /* glsl */ `
varying vec3 vW;
uniform vec3 uTief, uFlach, uUfer; uniform float uWelle, uHell, uTeichA, uTeichB; uniform vec2 uTeichM;
${GLSL_NOISE}
${SKY_GLSL}
float wellen(vec2 p, float t) {
  float h = sin(p.x * 1.7 + t * 1.1) * 0.5 + sin(p.y * 2.3 - t * 0.9 + p.x * 0.6) * 0.4 + sin((p.x + p.y) * 3.1 + t * 1.7) * 0.25 + sin((p.x - p.y) * 5.3 - t * 2.3) * 0.12;
  h += (nF(p * 1.4 + vec2(t * 0.2, -t * 0.15)) - 0.5) * 0.8;
  return h * 0.012 * uWelle;
}
void main() {
  vec3 V = normalize(vW - cameraPosition);
  vec2 p = vW.xz;
  float e = 0.06, h0 = wellen(p, uZeit), hx = wellen(p + vec2(e, 0.0), uZeit), hz = wellen(p + vec2(0.0, e), uZeit);
  vec3 N = normalize(vec3(-(hx - h0) / e * 5.0, 1.0, -(hz - h0) / e * 5.0));
  vec3 R = reflect(V, N); R.y = abs(R.y);
  vec3 refl = skyColor(normalize(R));
  float cosT = clamp(dot(-V, N), 0.0, 1.0);
  float F = 0.03 + 0.97 * pow(1.0 - cosT, 4.0);
  float m = pow((p.x - uTeichM.x) / uTeichA, 2.0) + pow((p.y - uTeichM.y) / uTeichB, 2.0);
  vec3 tief = mix(uFlach, uTief, smoothstep(0.1, 0.7, 1.0 - m));
  vec3 col = mix(tief * uHell, refl, clamp(F, 0.0, 1.0));
  float rand = smoothstep(0.7, 0.99, m);
  col = mix(col, uUfer, rand * 0.6 * (0.6 + 0.4 * nN(p * 1.8)));      // Spiegelung von Uferpflanzen
  float dist = length(vW - cameraPosition);
  col = mix(col, uHorizont * uHell * 0.9 * uTag + uNachtHorizont * (1.0 - uTag), smoothstep(80.0, 400.0, dist) * 0.35);
  gl_FragColor = vec4(col, 1.0);
}`;
const HIMMEL_V = `varying vec3 vDir; void main() { vDir = (modelMatrix * vec4(position, 0.0)).xyz; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const HIMMEL_F = /* glsl */ `varying vec3 vDir;
${GLSL_NOISE}
${SKY_GLSL}
void main() { gl_FragColor = vec4(skyColor(normalize(vDir)), 1.0); }`;

// ------------------------------------------------------------------------------------------------ Welt
export class Sommerwiese {
  constructor(szene, { schatten = true } = {}) {
    this.szene = szene;
    const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
    this.u = {
      uGalH: { value: 1 }, uZeit: { value: 0 }, uWindS: { value: 1 }, uTag: { value: 1 }, uSterne: { value: 0 }, uWolken: { value: 0.3 }, uHell: { value: 1 },
      uZenit: { value: C("#4B86CB") }, uHorizont: { value: C("#C9DCEC") }, uNachtZenit: { value: C("#02040B") }, uNachtHorizont: { value: C("#0B1626") },
      uSonne: { value: v3(-0.55, 0.53, -0.64).normalize() }, uMond: { value: v3(-0.12, 0.78, -0.62).normalize() }, uMondHell: { value: 1 }, uMondDunkel: { value: 0 }, uMondR: { value: 0.05 },
      uGal: { value: v3(0.5, 0.45, 0.6).normalize() }, uGalX: { value: v3(0.7, -0.2, -0.65).normalize() }, uRot: { value: new THREE.Matrix3() },
      uPD: { value: [v3(0, 1, 0), v3(0, 1, 0), v3(0, 1, 0), v3(0, 1, 0)] }, uPF: { value: [v3(), v3(), v3(), v3()] }, uPG: { value: [new THREE.Vector2(0.003, 0.012), new THREE.Vector2(0.003, 0.012), new THREE.Vector2(0.003, 0.012), new THREE.Vector2(0.003, 0.012)] },
      uTief: { value: C("#0E3438") }, uFlach: { value: C("#1D4A36") }, uUfer: { value: C("#16301A") }, uWelle: { value: 1 }, uTeichM: { value: new THREE.Vector2(TEICH.x, TEICH.z) }, uTeichA: { value: TEICH.a }, uTeichB: { value: TEICH.b },
    };
    this.vertices = 0;
    this._baueHimmel();
    this._baueGelaende(schatten);
    this._baueWasser();
    this._baueGras(schatten);
    this._baueBlumen(schatten);
    this._baueUfer(schatten);
    this._baueBaeume(schatten);
    this._baueInsekten();
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._e = new THREE.Euler();
  }
  _baueHimmel() {
    const mat = new THREE.ShaderMaterial({ vertexShader: HIMMEL_V, fragmentShader: HIMMEL_F, uniforms: this.u, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false });
    this.himmel = new THREE.Mesh(new THREE.SphereGeometry(30000, 64, 32), mat);
    this.himmel.renderOrder = 1000; this.himmel.frustumCulled = false;     // nach dem Opaken: nur sichtbare Himmelspixel werden berechnet
    this.szene.add(this.himmel);
  }
  _baueGelaende(schatten) {
    const mat = bodenMaterial(this.u);
    const nah = new THREE.PlaneGeometry(NAH.x * 2, NAH.zh * 2, NAH.x * 5, NAH.zh * 5); nah.rotateX(-Math.PI / 2); nah.translate(0, 0, NAH.zc);
    this._hebe(nah, 0); this.gelaendeNah = new THREE.Mesh(nah, mat); this.gelaendeNah.receiveShadow = schatten; this.szene.add(this.gelaendeNah);
    // Ferngitter: Zellen wachsen mit dem Abstand (x = R·u³), Löcher im Nahbereich, Absenkung 0,3 m unter dem Nahgitter (Überlappung ohne Spalt)
    const N = 240, R = 14000, pos = [], idx = [];
    const koord = (i) => { const u = (i / N) * 2 - 1; return R * Math.sign(u) * Math.abs(u) ** 3; };
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const x = koord(i), z = koord(j) + NAH.zc;
      const d = Math.max(Math.abs(x), Math.abs(z - NAH.zc) * 1.2), ab = -0.3 * (1 - smoothstep(40, 56, d));
      pos.push(x, hoehe(x, z) + ab, z);
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x0 = koord(i), x1 = koord(i + 1), z0 = koord(j) + NAH.zc, z1 = koord(j + 1) + NAH.zc;
      if (Math.max(Math.abs(x0), Math.abs(x1)) < 45 && Math.max(Math.abs(z0 - NAH.zc), Math.abs(z1 - NAH.zc)) * 1.2 < 45) continue;
      const a = j * (N + 1) + i; idx.push(a, a + N + 1, a + 1, a + 1, a + N + 1, a + N + 2);
    }
    const fern = new THREE.BufferGeometry(); fern.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); fern.setIndex(idx); fern.computeVertexNormals();
    this.gelaendeFern = new THREE.Mesh(fern, mat); this.szene.add(this.gelaendeFern);
    this.vertices += nah.getAttribute("position").count + fern.getAttribute("position").count;
  }
  _hebe(g, dy) { const p = g.getAttribute("position"); for (let i = 0; i < p.count; i++) p.setY(i, hoehe(p.getX(i), p.getZ(i)) + dy); g.computeVertexNormals(); }
  _baueWasser() {
    const geo = new THREE.PlaneGeometry(130, 90, 1, 1); geo.rotateX(-Math.PI / 2); geo.translate(TEICH.x, WASSER_Y, TEICH.z);
    const mat = new THREE.ShaderMaterial({ vertexShader: WASSER_V, fragmentShader: WASSER_F, uniforms: this.u, fog: false });
    this.wasser = new THREE.Mesh(geo, mat); this.wasser.renderOrder = 1; this.szene.add(this.wasser);
    // Seerosenblätter auf dem Wasser (y = +2 cm, Abstand zur Wasserfläche vermeidet Z-Fighting), nur dort, wo wirklich Wasser ist
    const g = seerosenGeo(), mt = new THREE.MeshStandardMaterial({ color: "#FFFFFF", vertexColors: true, roughness: 0.6, side: THREE.DoubleSide });
    const liste = [];
    for (let i = 0; liste.length < 38 && i < 3000; i++) {
      const x = TEICH.x + (hash(i, 801) - 0.5) * 2 * TEICH.a * 0.8, z = TEICH.z + (hash(i, 802) - 0.5) * 2 * TEICH.b * 0.85;
      if (teichMass(x, z) > 0.55 || hoehe(x, z) > -0.35) continue;
      liste.push([x, z, hash(i, 803) * 6.28, 0.7 + hash(i, 804) * 0.9]);
    }
    this.rosen = new THREE.InstancedMesh(g, mt, liste.length);
    liste.forEach(([x, z, r, s], i) => { this._m = this._m || new THREE.Matrix4(); const m = new THREE.Matrix4().compose(new THREE.Vector3(x, WASSER_Y + 0.025, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r), new THREE.Vector3(s, s, s)); this.rosen.setMatrixAt(i, m); });
    this.rosen.frustumCulled = false; this.szene.add(this.rosen);
  }
  _instanzen(geo, mat, liste, { castShadow = false } = {}) {
    const im = new THREE.InstancedMesh(geo, mat, liste.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    liste.forEach((it, i) => {
      q.setFromAxisAngle(up, it.r || 0); s.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sx ?? it.s ?? 1); p.set(it.x, it.y, it.z);
      im.setMatrixAt(i, m.compose(p, q, s));
      if (it.c) { c.setRGB(it.c[0], it.c[1], it.c[2]); im.setColorAt(i, c); }
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false; im.castShadow = castShadow; im.receiveShadow = false;
    this.szene.add(im); this.vertices += geo.getAttribute("position").count * liste.length;
    return im;
  }
  _baueGras(schatten) {
    const geo = grasBuschel(), mat = wiesenMaterial(this.u, true);
    const liste = [];
    const band = (anz, x0, x1, z0, z1, hmin, hmax, seed, nah = 0) => {
      let n = 0;
      for (let i = 0; n < anz && i < anz * 4; i++) {
        const x = lerp(x0, x1, hash(i, seed)), z = lerp(z0, z1, hash(i, seed + 1)), y = hoehe(x, z);
        if (y < 0.1 || teichMass(x, z) < 0.92) continue;
        const dK = Math.hypot(x - AUGE_XZ.x, z - AUGE_XZ.z);
        if (dK < 0.7) continue;
        const hh = Math.min(lerp(hmin, hmax, hash(i, seed + 2)), 0.12 + 0.2 * dK);          // Kamera liegt im Gras: nah bleibt es niedrig
        const g = 0.8 + 0.5 * hash(i, seed + 3), gelb = hash(i, seed + 4) < 0.22;
        liste.push({ x, y: y - 0.03, z, r: hash(i, seed + 5) * 6.28, sx: lerp(0.8, 1.5, hash(i, seed + 6)), sy: hh, c: gelb ? [g * 1.15, g * 1.05, g * 0.55] : [g * 0.95, g * 1.05, g * 0.8] });
        n++;
      }
    };
    band(5500, -7, 7, -3.5, 5.5, 0.4, 0.8, 11);
    band(20000, -22, 22, -16, 7, 0.32, 0.6, 21);
    band(26000, -58, 58, -72, 22, 0.3, 0.55, 31);
    this.gras = this._instanzen(geo, mat, liste);
    this.grasAnzahl = liste.length;
  }
  _baueBlumen(schatten) {
    this.blumen = [];
    const mat = wiesenMaterial(this.u, false);
    BLUMEN.forEach((b, k) => {
      const liste = [];
      for (let i = 0; liste.length < b.anzahl && i < b.anzahl * 6; i++) {
        const nahBereich = i % 3 !== 0;
        const x = nahBereich ? lerp(-9, 9, hash(i, 100 + k)) : lerp(-34, 34, hash(i, 100 + k)), z = nahBereich ? lerp(-5.2, 7, hash(i, 120 + k)) : lerp(-26, 14, hash(i, 120 + k)), y = hoehe(x, z);
        if (y < 0.16 || teichMass(x, z) < 0.95) continue;
        if (Math.hypot(x - AUGE_XZ.x, z - AUGE_XZ.z) < 1.1) continue;
        const flecken = fbm(x * 0.07 + 3 + k * 5, z * 0.07 + k * 3, 3);
        if (flecken < 0.42 && hash(i, 140 + k) < 0.7) continue;
        const s = 0.8 + 0.55 * hash(i, 160 + k);
        liste.push({ x, y: y - 0.03, z, r: hash(i, 180 + k) * 6.28, s, c: [1, 1, 1] });
      }
      this.blumen.push(this._instanzen(blumeGeo(b), mat, liste));
    });
  }
  _baueUfer(schatten) {
    // Schilf mit Kolben in Gruppen entlang der Uferlinie (Teichmaß 0,78 … 1,08), Fuß auf dem Gelände, links/rechts/hinten dichter als vorn
    const liste = [], gruppen = [];
    for (let i = 0; gruppen.length < 34 && i < 4000; i++) {
      const w = hash(i, 301) * 6.283, rr = 1 + 0.02 * (hash(i, 302) - 0.5), x = TEICH.x + Math.cos(w) * TEICH.a * rr, z = TEICH.z + Math.sin(w) * TEICH.b * rr;
      const m = teichMass(x, z);
      if (m < 0.8 || m > 1.12 || z > -2) continue;
      gruppen.push({ x, z });
    }
    let n = 0;
    for (const g of gruppen) for (let k = 0; k < 14; k++) {
      const x = g.x + (hash(n, 311) - 0.5) * 3.2, z = g.z + (hash(n, 312) - 0.5) * 2.4, m = teichMass(x, z), y = hoehe(x, z);
      n++;
      if (m < 0.78 || m > 1.12 || y < -0.35) continue;
      const s = 0.7 + 0.8 * hash(n, 313);
      liste.push({ x, y: y - 0.05, z, r: hash(n, 314) * 6.28, s, c: [0.9 + 0.2 * hash(n, 315), 1, 0.9] });
    }
    this.schilf = this._instanzen(schilfGeo(), wiesenMaterial(this.u, false), liste);
    this.schilfAnzahl = liste.length;
  }
  _baueBaeume(schatten) {
    const { kronen, stamm } = baumGeos();
    const mat = new THREE.MeshStandardMaterial({ color: "#FFFFFF", vertexColors: true, roughness: 0.92, flatShading: true });
    const matS = new THREE.MeshStandardMaterial({ color: "#FFFFFF", vertexColors: true, roughness: 0.95, flatShading: true });
    const L = [[], []], ST = [];
    for (let i = 0; i < 70; i++) {
      const fernRing = i < 44;
      const x = fernRing ? lerp(-150, 150, hash(i, 401)) : (hash(i, 401) < 0.5 ? -1 : 1) * lerp(30, 58, hash(i, 402)), z = fernRing ? lerp(-52, -210, hash(i, 402)) : lerp(-34, 8, hash(i, 403));
      if (teichMass(x, z) < 1.5 && Math.hypot(x - TEICH.x, (z - TEICH.z) * 1.4) < 60) continue;
      const y = hoehe(x, z), s = fernRing ? lerp(7, 13, hash(i, 404)) : lerp(5, 8, hash(i, 404)), g = 0.7 + 0.5 * hash(i, 405);
      L[i % 2].push({ x, y: y - 0.15, z, r: hash(i, 406) * 6.28, s, c: [g * (0.55 + 0.2 * hash(i, 407)), g * 0.75, g * 0.4] });
      ST.push({ x, y: y - 0.2, z, r: 0, sx: s * 0.9, sy: s * 0.95, c: [1, 1, 1] });
    }
    this.kronen = kronen.map((g, k) => this._instanzen(g, mat, L[k], { castShadow: schatten }));
    this.staemme = this._instanzen(stamm, matS, ST, { castShadow: schatten });
  }
  _baueInsekten() {
    // Biene: gelb-schwarzer Körper, zwei Flügel (schlagen im Shader), Länge ≈ 0,06 m
    const koerper = new THREE.IcosahedronGeometry(0.014, 1); koerper.scale(1.6, 1, 1);
    const kopf = new THREE.IcosahedronGeometry(0.009, 0); kopf.translate(0.024, 0.002, 0);
    const streifen = (x) => (Math.sin(x * 330) > 0.15 ? farbVon("#1A140A") : farbVon("#E8B418"));
    const fl = new THREE.PlaneGeometry(0.03, 0.016); fl.translate(0.0, 0, 0.011);
    const fl2 = fl.clone(); fl2.scale(1, 1, -1);
    const bieneG = bauGeo([{ g: koerper, c: (x) => streifen(x) }, { g: kopf, c: C("#1A140A") }, { g: fl, c: C("#EEF3F7"), f: 1 }, { g: fl2, c: C("#EEF3F7"), f: 1 }]);
    const mat = (nebel) => { const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }); m.onBeforeCompile = (sh) => { sh.uniforms.uZeit = this.u.uZeit; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uZeit;\nattribute float aFl;").replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.y += aFl * sin(uZeit * 190.0 + float(gl_InstanceID) * 1.7) * 0.012;"); }; return m; };
    this.bienen = new THREE.InstancedMesh(bieneG, mat(), 9); this.bienen.frustumCulled = false; this.szene.add(this.bienen);
    // Schmetterling: zwei Flügel um die Körperachse klappend
    const fluegel = new THREE.PlaneGeometry(0.1, 0.075); fluegel.translate(0.05, 0, 0.0); fluegel.rotateX(-Math.PI / 2);
    const mkF = (hex, hex2) => bauGeo([{ g: fluegel, c: (x, y, z) => (Math.abs(z) < 0.02 || x < 0.03 ? farbVon(hex2) : farbVon(hex)) }]);
    this.faltFarben = [["#F4F2E8", "#9A9A88"], ["#F08A18", "#3A1C08"], ["#5C86E0", "#1E2A58"], ["#F4D838", "#6A5A10"]];
    this.faltR = new THREE.InstancedMesh(mkF(...this.faltFarben[0]), new THREE.MeshStandardMaterial({ color: "#FFFFFF", vertexColors: true, side: THREE.DoubleSide, roughness: 0.7 }), 4);
    this.faltL = new THREE.InstancedMesh(mkF(...this.faltFarben[0]), this.faltR.material, 4);
    for (const f of [this.faltR, this.faltL]) { f.frustumCulled = false; this.szene.add(f); }
    // Libelle: schlanker Körper, vier Flügel, blau/grün
    const leib = new THREE.CylinderGeometry(0.005, 0.003, 0.14, 5); leib.rotateZ(Math.PI / 2);
    const kopfL = new THREE.IcosahedronGeometry(0.01, 0); kopfL.translate(0.075, 0, 0);
    const flL = new THREE.PlaneGeometry(0.075, 0.016); flL.translate(0.0, 0, 0.042);
    const flL2 = flL.clone(), flL3 = flL.clone(); flL3.translate(-0.022, 0, 0); const flL4 = flL3.clone(); flL4.scale(1, 1, -1); flL2.scale(1, 1, -1);
    const libelleG = bauGeo([{ g: leib, c: C("#2A6FD0") }, { g: kopfL, c: C("#1E8A5A") }, { g: flL, c: C("#DCEAF2"), f: 1 }, { g: flL2, c: C("#DCEAF2"), f: 1 }, { g: flL3, c: C("#DCEAF2"), f: 1 }, { g: flL4, c: C("#DCEAF2"), f: 1 }]);
    const mL = mat(); mL.onBeforeCompile = (sh) => { sh.uniforms.uZeit = this.u.uZeit; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uZeit;\nattribute float aFl;").replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.y += aFl * sin(uZeit * 120.0 + float(gl_InstanceID) * 2.1) * 0.02;"); };
    this.libellen = new THREE.InstancedMesh(libelleG, mL, 4); this.libellen.frustumCulled = false; this.szene.add(this.libellen);
    this.libellenSpiegel = null;
  }

  // Flugbahnen: reine Funktionen von t
  _bahn(i, t, art) {
    const s = 900 + i * 7;
    if (art === "biene") {      // schwirrt zwischen Blumen vor der Kamera: Lissajous um einen Mittelpunkt, kleine Haltepunkte
      const cx = lerp(-4.5, 4.5, hash(i, s)), cz = lerp(-2.5, 3.0, hash(i, s + 1)), ch = 0.35 + 0.35 * hash(i, s + 2);
      const w1 = 0.5 + 0.9 * hash(i, s + 3), w2 = 0.6 + 0.9 * hash(i, s + 4), w3 = 0.7 + 0.8 * hash(i, s + 5), ph = hash(i, s + 6) * 6.28;
      return [cx + 1.5 * Math.sin(w1 * t + ph) + 0.4 * Math.sin(3.1 * t + i), ch + 0.18 * Math.sin(w2 * t + ph * 2) + 0.05 * Math.sin(9 * t + i), cz + 1.2 * Math.sin(w3 * t + ph * 3)];
    }
    if (art === "libelle") {    // Schwebeflug über dem Wasser mit kurzen Sprüngen (Abschnittslänge 1,3–2,6 s)
      let u = t + hash(i, s) * 10, k = 0, tau = 0;
      const lang = (n) => 1.3 + 1.3 * hash(n + i * 31, s + 20);
      while (u > lang(k)) { u -= lang(k); k++; if (k > 80) break; }
      const pk = (n) => [TEICH.x + lerp(-16, 16, hash(n + i * 31, s + 21)), 0.5 + 0.9 * hash(n + i * 31, s + 22), lerp(-8, -23, hash(n + i * 31, s + 23))];
      const a = pk(k), b = pk(k + 1), p = smoothstep(0, 0.25, u / lang(k));
      return [lerp(a[0], b[0], p) + 0.03 * Math.sin(20 * t + i), lerp(a[1], b[1], p) + 0.04 * Math.sin(13 * t + i * 2), lerp(a[2], b[2], p) + 0.03 * Math.sin(17 * t + i * 3)];
    }
    // Schmetterling: weite Bögen über die Wiese
    const cx = lerp(-5, 5, hash(i, s)), cz = lerp(-4, 2.5, hash(i, s + 1)), w = 0.28 + 0.18 * hash(i, s + 2);
    return [cx + 3.2 * Math.sin(w * t + i * 2), 0.55 + 0.35 * Math.sin(0.9 * t + i * 5) + 0.12 * Math.sin(4.2 * t + i), cz + 2.2 * Math.sin(w * 1.3 * t + i * 4)];
  }
  _setzeInsekten(t, an) {
    const m = this._m, q = this._q, s = this._s, p = this._p, e = this._e;
    for (const k of [this.bienen, this.faltR, this.faltL, this.libellen]) k.visible = an;
    if (!an) return;
    const ausrichten = (a, b) => { const dx = b[0] - a[0], dz = b[2] - a[2]; e.set(0, Math.atan2(-dz, dx), 0); q.setFromEuler(e); };
    for (let i = 0; i < 9; i++) {
      const a = this._bahn(i, t, "biene"), b = this._bahn(i, t + 0.05, "biene");
      ausrichten(a, b); s.setScalar(1.15); p.set(a[0], hoehe(a[0], a[2]) + a[1] * 0.9 + 0.12, a[2]);
      this.bienen.setMatrixAt(i, m.compose(p, q, s));
    }
    this.bienen.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 4; i++) {
      const a = this._bahn(i, t, "falter"), b = this._bahn(i, t + 0.05, "falter");
      ausrichten(a, b); p.set(a[0], hoehe(a[0], a[2]) + a[1] + 0.2, a[2]);
      const flap = Math.sin(t * (14 + i * 1.3) + i) * 0.75 + 0.25, qb = q.clone(), qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), flap), qzl = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -flap);
      s.setScalar(0.8 + 0.4 * (i % 2));
      this.faltR.setMatrixAt(i, m.compose(p, qb.clone().multiply(qz), s));
      const sl = new THREE.Vector3(s.x, s.y, -s.z); this.faltL.setMatrixAt(i, m.compose(p, qb.clone().multiply(qzl), sl));
    }
    this.faltR.instanceMatrix.needsUpdate = true; this.faltL.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 4; i++) {
      const a = this._bahn(i, t, "libelle"), b = this._bahn(i, t + 0.08, "libelle");
      ausrichten(a, b); if (Math.hypot(b[0] - a[0], b[2] - a[2]) < 1e-4) { e.set(0, i * 1.7, 0); q.setFromEuler(e); }
      s.setScalar(1.1); p.set(a[0], WASSER_Y + a[1] + 0.2, a[2]);
      this.libellen.setMatrixAt(i, m.compose(p, q, s));
    }
    this.libellen.instanceMatrix.needsUpdate = true;
  }

  /** Zustand für Zeit t setzen (alles optional, siehe Kopf) */
  setze(t, kamera, w = {}) {
    const u = this.u;
    u.uZeit.value = t;
    if (w.wind !== undefined) u.uWindS.value = w.wind;
    if (w.tag !== undefined) u.uTag.value = w.tag; if (w.galHell !== undefined) u.uGalH.value = w.galHell;
    if (w.sterne !== undefined) u.uSterne.value = w.sterne;
    if (w.wolken !== undefined) u.uWolken.value = w.wolken;
    if (w.hell !== undefined) u.uHell.value = w.hell;
    for (const k of ["zenit", "horizont", "nachtZenit", "nachtHorizont", "ufer"]) if (w[k]) u["u" + k[0].toUpperCase() + k.slice(1)].value.copy(w[k]);
    if (w.sonne) u.uSonne.value.set(...w.sonne).normalize();
    if (w.mond) { u.uMond.value.set(...w.mond.r).normalize(); u.uMondHell.value = w.mond.hell; u.uMondDunkel.value = w.mond.dunkel; if (w.mond.radius) u.uMondR.value = w.mond.radius; }
    if (w.rot) u.uRot.value.copy(w.rot);
    if (w.planeten) w.planeten.forEach((pl, i) => { u.uPD.value[i].set(...pl.r).normalize(); u.uPF.value[i].set(...pl.farbe); u.uPG.value[i].set(pl.kern, pl.halo); });
    if (w.tief) u.uTief.value.copy(w.tief); if (w.flach) u.uFlach.value.copy(w.flach);
    if (w.welle !== undefined) u.uWelle.value = w.welle;
    this.himmel.position.copy(kamera.position);
    this._setzeInsekten(t, w.insekten !== 0);
    return this;
  }
}
