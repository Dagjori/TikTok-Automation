// Welt „Waldlichtung im Mittelgebirge“ (Account 2 @stelldirvor.pov, Weltenkatalog „Wald / Lichtung“), Erstbau 05.11.2026
// („Was wäre, wenn die Erdachse nicht mehr geneigt wäre?“, Thüringer Wald, Blick nach Süden). NUR für den Baukasten Lunar-POV.
//
// Inhalt: Hangwiese mit Gräsern, Blumen, Pfad, Hochsitz, Findlingen und Rehen; ringsum Buchen- und Fichtenwald (nah: Äste, Krone aus Clustern,
// fern: einfache Silhouetten), dahinter gestaffelte, bewaldete Kämme im Dunst. Die Jahreszeit ist eine reine Funktion von s (Jahr) und der
// Stärke w der Achsneigung (0..1): vier Zustände (Sommer, Herbst, Winter, Frühling) plus ein milder Mittelzustand für w → 0.
//   saison(s, w) → { cover, laub, laub2, gras, gras2, bluete, schnee, … }  (Zustand je Bild, kein Gedächtnis)
//   const welt = new Waldlichtung(szene, { schatten });  welt.setze(t, kamera, { saison, wind, glanz, glanzR, rehe })
//   sonnenRichtung(dekl, stundenwinkel) → [x,y,z] (Süden = −z, Westen = +x, Breite 50,7° N)
//   Sonnenboegen: leuchtende Tagesbögen am Himmel (Lichtspur wie bei einer Langzeitbelichtung), `setze({ eps, alpha, … })`
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { GLSL_NOISE } from "./welt_feld_wald.js";

const D2R = Math.PI / 180;
const C = (h) => new THREE.Color(h);
const fr = (x) => x - Math.floor(x);

// ----------------------------------------------------------------------------------------------- Rauschen (wie GLSL_NOISE)
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 17.1; a *= 0.5; } return s; }

// ----------------------------------------------------------------------------------------------- Lage und Gelände
export const PHI = 50.7;                                   // Breite Thüringer Wald (Raum Oberhof)
export const AUGE = { x: 0, z: 0, hoehe: 1.65 };
/** Lichtung: Ellipse um (0, −58), Radien 78 × 88; Maß < 1 = Wiese, > 1 = Wald (mit unruhigem Rand) */
export const lichtungMass = (x, z) => (x / 78) ** 2 + ((z + 58) / 88) ** 2 + 0.38 * (fbm(x * 0.02 + 5, z * 0.02) - 0.5);
/** Pfadmitte (Hangweg durch die Wiese) */
export const pfadX = (z) => 4.0 * Math.sin(z * 0.05 + 0.4) + 0.5;

export function hoehe(x, z) {
  const d = -z;
  let y = -0.05 * clamp(d, 0, 170) + 0.04 * clamp(-d, 0, 60);                    // Hang fällt nach Süden, hinter uns leicht an
  y += 3.4 * (vn(x * 0.03 + 4, z * 0.03) - 0.5) * smoothstep(6, 60, Math.hypot(x, z + 55));
  y += 0.5 * (fbm(x * 0.15 + 5, z * 0.15, 2) - 0.5);
  const tal = smoothstep(170, 520, d);                                            // Talboden, dann ansteigende Kämme
  y += 18 * smoothstep(-60, 120, z) * smoothstep(-10, 0, -d + 60) * 0;           // (Platzhalter, Norden bleibt flach)
  y += 36 * smoothstep(380, 1500, Math.abs(x));                                   // Talwände links und rechts
  y += 470 * Math.pow(smoothstep(950, 2800, d), 1.5) * (0.62 + 0.76 * fbm(x * 0.0009 + 3, 1.7, 3));
  y += 380 * Math.pow(smoothstep(3300, 5600, d), 1.4) * (0.6 + 0.8 * fbm(x * 0.0006 + 8, 4.1, 3));
  y += 160 * tal * (fbm(x * 0.0021 + 11, z * 0.0021, 3) - 0.4) * smoothstep(300, 900, d);
  y += 70 * smoothstep(60, 260, z) * (0.6 + fbm(x * 0.004, 2.2, 2));
  return y;
}

// ----------------------------------------------------------------------------------------------- Sonne
/** Sonnenrichtung (Weltkoordinaten, Süden = −z, Westen = +x) aus Deklination und Stundenwinkel (Grad), Breite PHI */
export function sonnenHoeheAz(dekl, H) {
  const d = dekl * D2R, h = H * D2R, p = PHI * D2R;
  const sa = Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(h);
  const alt = Math.asin(clamp(sa, -1, 1));
  const az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(p) - Math.tan(d) * Math.cos(p));
  return { alt, az };
}
export function sonnenRichtung(dekl, H = 6) {
  const { alt, az } = sonnenHoeheAz(dekl, H);
  return [Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt)];
}

// ----------------------------------------------------------------------------------------------- Jahreszeit
/** s = Jahrposition (0 März, 0.30 Sommersonnenwende, 0.55 Oktober, 0.80 Wintersonnenwende), w = Stärke der Neigung 0..1 */
const ZUSTAND = {
  //            cover  Buchenlaub  Laub2      Gras       Gras2      Blüte  Himmel-Zenit Himmel-Horizont  Sonne     Dunst
  sommer: { cover: 1.00, laub: C("#4E7C2E"), laub2: C("#6A8F34"), gras: C("#6F9440"), gras2: C("#8AA648"), bluete: 0.55, zenit: C("#4F83C6"), horizont: C("#D8E3EC"), sonne: C("#FFF0D2"), nebel: 0.8 },
  herbst: { cover: 0.62, laub: C("#D69A30"), laub2: C("#C25524"), gras: C("#A89A52"), gras2: C("#B58E4C"), bluete: 0.08, zenit: C("#5A84C0"), horizont: C("#E8DCC6"), sonne: C("#FFD9A6"), nebel: 1.6 },
  winter: { cover: 0.00, laub: C("#6A5A4A"), laub2: C("#5A4E44"), gras: C("#8E8A6C"), gras2: C("#A09A7A"), bluete: 0.0, zenit: C("#8397B6"), horizont: C("#DCE2EA"), sonne: C("#E8EEFF"), nebel: 1.2 },
  fruehling: { cover: 0.50, laub: C("#98C45A"), laub2: C("#B6D468"), gras: C("#7EA84A"), gras2: C("#96B852"), bluete: 1.0, zenit: C("#5C94D2"), horizont: C("#E4EAEE"), sonne: C("#FFF4DC"), nebel: 1.0 },
  mild: { cover: 0.96, laub: C("#5C8A36"), laub2: C("#77A040"), gras: C("#70963F"), gras2: C("#8EAD4A"), bluete: 0.75, zenit: C("#5D8FD0"), horizont: C("#E2E8EC"), sonne: C("#FFF2D8"), nebel: 0.7 },
};
const SCHLUESSEL = ["sommer", "herbst", "winter", "fruehling", "mild"];
export function saison(s, w) {
  const th = 2 * Math.PI * (s - 0.30), c = Math.cos(th) * w, si = Math.sin(th) * w;
  const g = { sommer: Math.max(0, c), winter: Math.max(0, -c), herbst: Math.max(0, si), fruehling: Math.max(0, -si) };
  let sum = g.sommer + g.winter + g.herbst + g.fruehling;
  if (sum > 1) for (const k of Object.keys(g)) g[k] /= sum;
  sum = Math.min(sum, 1); g.mild = 1 - sum;
  const out = { gewichte: g, laub: new THREE.Color(0, 0, 0), laub2: new THREE.Color(0, 0, 0), gras: new THREE.Color(0, 0, 0), gras2: new THREE.Color(0, 0, 0),
    zenit: new THREE.Color(0, 0, 0), horizont: new THREE.Color(0, 0, 0), sonne: new THREE.Color(0, 0, 0), cover: 0, bluete: 0, nebel: 0 };
  for (const k of SCHLUESSEL) {
    const z = ZUSTAND[k], a = g[k];
    for (const f of ["laub", "laub2", "gras", "gras2", "zenit", "horizont", "sonne"]) out[f].r += z[f].r * a, out[f].g += z[f].g * a, out[f].b += z[f].b * a;
    out.cover += z.cover * a; out.bluete += z.bluete * a; out.nebel += z.nebel * a;
  }
  out.schnee = clamp((g.winter - 0.30) / 0.45);
  out.herbstAnteil = g.herbst;
  out.warm = g.sommer + 0.5 * g.mild;
  return out;
}

// ----------------------------------------------------------------------------------------------- Geometrie-Bausteine
/** Teile zu einer Geometrie verschmelzen: { g, c (Helligkeit | [r,g,b] | f(x,y,z)→Helligkeit), kc, kz } */
function sammle(teile, { farbig = false } = {}) {
  const geos = teile.map((t) => (t.g.index ? t.g.toNonIndexed() : t.g));
  let n = 0; for (const g of geos) n += g.getAttribute("position").count;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), kc = new Float32Array(n * 3), kz = new Float32Array(n), nor = new Float32Array(n * 3);
  let o = 0;
  geos.forEach((g, i) => {
    const t = teile[i], p = g.getAttribute("position"), nm = g.getAttribute("normal");
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j), y = p.getY(j), z = p.getZ(j);
      pos.set([x, y, z], (o + j) * 3);
      if (nm) nor.set([nm.getX(j), nm.getY(j), nm.getZ(j)], (o + j) * 3);
      let c = t.c ?? 1; if (typeof c === "function") c = c(x, y, z);
      if (Array.isArray(c)) col.set(c, (o + j) * 3); else if (c && c.isColor) col.set([c.r, c.g, c.b], (o + j) * 3); else col.set([c, c, c], (o + j) * 3);
      if (t.kc) kc.set(t.kc, (o + j) * 3);
      kz[o + j] = t.kz ?? 0;
    }
    o += p.count;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  out.setAttribute("kc", new THREE.BufferAttribute(kc, 3)); out.setAttribute("kz", new THREE.BufferAttribute(kz, 1));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  if (!nor.some((v) => v !== 0)) out.computeVertexNormals();
  return out;
}
function zweig(a, b, r0, r1, c) {         // Zylinder von a nach b
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r1, r0, L, 5, 1); g.translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  g.applyQuaternion(q); g.translate(A.x, A.y, A.z);
  return { g, c };
}
function klumpe(zentrum, r, seed, hell, flach = 0.82) {   // Laubballen: Ikosaeder mit Unregelmäßigkeit
  const g = new THREE.IcosahedronGeometry(r, 1), p = g.getAttribute("position");
  for (let j = 0; j < p.count; j++) {
    const x = p.getX(j), y = p.getY(j), z = p.getZ(j), f = 1 + 0.16 * (hash(Math.round((x + 9) * 31 + (z + 9) * 17), seed) - 0.5);
    p.setXYZ(j, x * f, y * f * flach, z * f);
  }
  g.translate(...zentrum); g.computeVertexNormals();
  const cy = zentrum[1], H = r * 2.0;
  return { g, c: (x, y) => hell * (0.72 + 0.4 * clamp((y - cy + r) / H)), kc: zentrum, kz: hash(seed, 77) };
}

/** Buche (Meter): Stamm 9 m, Äste in die Krone, ca. 17 Laubballen; Höhe ≈ 21 m */
function bucheGeo(seed, { gross = 1 } = {}) {
  const tr = [], kr = [];
  const H0 = 8.5 + 2.5 * hash(seed, 1);
  const stamm = new THREE.CylinderGeometry(0.36, 0.62, H0, 7); stamm.translate(0, H0 / 2, 0);
  tr.push({ g: stamm, c: (x, y) => [0.4 + 0.05 * Math.sin(y * 3), 0.33, 0.26] });
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + hash(i, seed) * 0.8, R = (3.4 + 3.2 * hash(i, seed + 1)) * gross, yb = H0 - 1.6 + 2.4 * hash(i, seed + 2), yt = H0 + 4.2 + 4.6 * hash(i, seed + 3);
    const bx = Math.cos(a) * R, bz = Math.sin(a) * R, mx = bx * 0.55, mz = bz * 0.55, my = (yb + yt) / 2 - 0.6;
    tr.push(zweig([0, yb, 0], [mx, my, mz], 0.3, 0.2, [0.34, 0.28, 0.22]), zweig([mx, my, mz], [bx, yt, bz], 0.2, 0.07, [0.34, 0.28, 0.22]));
    tr.push(zweig([mx, my, mz], [mx + Math.cos(a + 1) * 2.2, my + 2.2, mz + Math.sin(a + 1) * 2.2], 0.1, 0.04, [0.34, 0.28, 0.22]));
    const rr = (2.3 + 1.2 * hash(i, seed + 4)) * gross;
    kr.push(klumpe([bx, yt + 0.4, bz], rr, seed + i * 3, 0.78 + 0.35 * hash(i, seed + 5)));
    kr.push(klumpe([mx * 1.1, my + 2.4, mz * 1.1], rr * 0.9, seed + i * 3 + 1, 0.7 + 0.35 * hash(i, seed + 6)));
  }
  kr.push(klumpe([0, H0 + 8.4 * gross, 0], 3.4 * gross, seed + 90, 1.0), klumpe([0.8, H0 + 5.6, -0.6], 3.0 * gross, seed + 91, 0.85));
  return { stamm: sammle(tr), krone: sammle(kr) };
}
/** Fichte (Meter): 20 m, 10 Etagen aus Kegeln */
function fichteGeo(seed) {
  const T = [], hoch = 19 + 3 * hash(seed, 3);
  const st = new THREE.CylinderGeometry(0.1, 0.34, hoch, 6); st.translate(0, hoch / 2, 0); T.push({ g: st, c: [0.3, 0.2, 0.14], kz: 0 });
  const nE = 10;
  for (let i = 0; i < nE; i++) {
    const f = i / nE, y = 2.6 + f * (hoch - 4.4), r = (4.4 * Math.pow(1 - f, 0.85) + 0.55) * (0.88 + 0.24 * hash(i, seed + 5)), h = 3.6 - 0.8 * f;
    const g = new THREE.ConeGeometry(r, h, 9, 1); g.translate(0, y + h / 2 - 0.4, 0);
    const p = g.getAttribute("position");
    for (let j = 0; j < p.count; j++) { const x = p.getX(j), z = p.getZ(j); const k = 1 + 0.12 * (hash(j + i * 31, seed + 9) - 0.5); p.setXYZ(j, x * k, p.getY(j) - 0.35 * Math.hypot(x, z) / (r + 1e-3) * 0, z * k); }
    g.computeVertexNormals();
    const yy = y;
    T.push({ g, c: (x, yv, z) => (0.62 + 0.42 * clamp((yv - yy + 0.6) / h)) * (0.85 + 0.25 * hash(Math.round(x * 13 + z * 7), seed)), kz: 0 });
  }
  return sammle(T);
}
/** einfache Silhouetten für Wald in der Ferne */
function bucheFern() {
  const st = new THREE.CylinderGeometry(0.4, 0.7, 9, 6); st.translate(0, 4.5, 0);
  const k = new THREE.IcosahedronGeometry(4.6, 1); const p = k.getAttribute("position");
  for (let j = 0; j < p.count; j++) { const f = 1 + 0.2 * (hash(j, 5) - 0.5); p.setXYZ(j, p.getX(j) * f, p.getY(j) * f * 0.85, p.getZ(j) * f); }
  k.translate(0, 13, 0); k.computeVertexNormals();
  return { stamm: sammle([{ g: st, c: [0.4, 0.33, 0.26] }]), krone: sammle([{ g: k, c: (x, y) => 0.72 + 0.36 * clamp((y - 8) / 9), kc: [0, 13, 0], kz: 0.4 }]) };
}
function fichteFern() {
  const T = [];
  for (let i = 0; i < 4; i++) { const f = i / 4, r = 3.6 * (1 - f * 0.8) + 0.4, h = 6, g = new THREE.ConeGeometry(r, h, 7, 1); g.translate(0, 2 + f * 11 + h / 2, 0); g.computeVertexNormals(); T.push({ g, c: (x, y) => 0.6 + 0.45 * clamp(y / 18) }); }
  return sammle(T);
}

// ----------------------------------------------------------------------------------------------- Materialien
const PREFIX_KRONE = `attribute vec3 kc; attribute float kz; uniform float uZeit, uCover, uWindS, uMinVis; varying float vTint; varying vec3 vWN;`;
function kronenMaterial(u, { fichte = false, minVis = 0, hoehe = 22 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.92, metalness: 0, flatShading: true, vertexColors: true });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uZeit: u.uZeit, uCover: u.uCover, uWindS: u.uWindS, uLaub: u.uLaub, uLaub2: u.uLaub2, uFichte: u.uFichte, uSchnee: u.uSchnee, uGlanz: u.uGlanz, uGlanzR: u.uGlanzR, uMinVis: { value: minVis } });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\n${PREFIX_KRONE}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
  {
    vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float iz = fract(sin(dot(wp.xz, vec2(12.9898, 78.233))) * 43758.5453);
    vTint = iz;
    ${fichte ? "" : `float cov = uCover + (iz - 0.5) * 0.24;
    float vis = max(smoothstep(kz * 0.85, kz * 0.85 + 0.15, cov), uMinVis);
    transformed = kc + (transformed - kc) * vis;`}
    float k = clamp(position.y / ${hoehe.toFixed(1)}, 0.0, 1.0);
    float ph = wp.x * 0.21 + wp.z * 0.17;
    transformed.x += (sin(uZeit * 1.1 + ph) * 0.34 + sin(uZeit * 2.3 + ph * 2.0) * 0.12) * k * k * uWindS;
    transformed.z += cos(uZeit * 0.9 + ph) * 0.2 * k * k * uWindS;
    vWN = normalize(mat3(instanceMatrix) * normal);
  }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying float vTint; varying vec3 vWN; uniform vec3 uLaub, uLaub2, uFichte; uniform float uSchnee;`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  ${fichte ? `diffuseColor.rgb *= uFichte * 1.25 * (0.9 + 0.2 * vTint);
  float oben = smoothstep(0.12, 0.65, vWN.y);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.95), uSchnee * oben * 0.9);`
    : `diffuseColor.rgb *= mix(uLaub, uLaub2, vTint * vTint) * 1.35;`}`);
  };
  return m;
}
function stammMaterial(u, { hoehe = 20 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.95, flatShading: true, vertexColors: true });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uSchnee: u.uSchnee });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWN;").replace("#include <begin_vertex>", "#include <begin_vertex>\n  vWN = normalize(mat3(instanceMatrix) * normal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWN; uniform float uSchnee;")
      .replace("#include <color_fragment>", "#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.84, 0.9), uSchnee * smoothstep(0.35, 0.9, vWN.y) * 0.85);");
  };
  return m;
}
function bodenMaterial(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.98, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vNW;").replace("#include <project_vertex>", "#include <project_vertex>\nvNW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vNW;
uniform vec3 uGras, uGras2, uLaub, uFichte, uStreu, uSchneeF;
uniform float uSchnee, uGlanz, uGlanzR, uHerbst, uCover;
${GLSL_NOISE}
float pfadMitte(float z) { return 4.0 * sin(z * 0.05 + 0.4) + 0.5; }`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  vec2 p = vNW.xz;
  float dK = length(p - cameraPosition.xz);
  float n1 = nN(p * 0.22), n2 = nN(p * 1.15), n3 = nF(p * 0.05);
  float m = pow(p.x / 78.0, 2.0) + pow((p.y + 58.0) / 88.0, 2.0) + 0.38 * (nF(p * 0.02 + 5.0) - 0.5);
  float wald = smoothstep(0.88, 1.2, m);
  vec3 wiese = mix(uGras * 0.74, uGras * 1.14, n1) * (0.86 + 0.26 * n2);
  wiese = mix(wiese, uGras2 * (0.9 + 0.2 * n2), smoothstep(0.5, 0.8, nF(p * 0.08 + 11.0)) * 0.65);
  wiese *= 0.9 + 0.2 * nN(p * 4.3);
  float pf = 1.0 - smoothstep(0.45, 1.05, abs(p.x - pfadMitte(p.y)) + 0.35 * (n2 - 0.5)); pf *= 1.0 - smoothstep(-135.0, -108.0, p.y) * 0.0;
  vec3 pfad = vec3(0.30, 0.23, 0.16) * (0.8 + 0.3 * nN(p * 2.2));
  float spur = smoothstep(0.35, 0.55, abs(sin((p.x - pfadMitte(p.y)) * 2.6)));
  pfad *= 0.84 + 0.2 * spur;
  vec3 streu = uStreu * (0.7 + 0.5 * nN(p * 1.3));
  streu = mix(streu, uLaub * 0.55, uHerbst * smoothstep(0.35, 0.65, nN(p * 0.9)) * 0.8);
  vec3 wd = mix(streu, vec3(0.1, 0.16, 0.07) * (0.8 + 0.4 * n2), 0.5 * nN(p * 0.5)) * 0.8;
  vec3 fern = mix(uFichte * 0.62, uLaub * 0.62, smoothstep(0.35, 0.65, nF(p * 0.004 + 2.0)) * smoothstep(-0.4, 0.5, uCover));
  fern *= (0.7 + 0.6 * nN(p * 0.07 + 3.0)) * (0.82 + 0.36 * nN(p * 0.55));
  fern = mix(fern, uLaub * 0.55, 0.0);
  float fernM = smoothstep(150.0, 420.0, length(p - vec2(0.0, -80.0)));
  vec3 c = mix(wiese, mix(wd, fern, fernM), wald);
  c = mix(c, pfad, pf * (1.0 - wald));
  float hohe = smoothstep(120.0, 380.0, vNW.y);
  float sch = uSchnee * smoothstep(0.18, 0.5, n3 + 0.34 + 0.22 * hohe - 0.18 * wald * (1.0 - fernM));
  c = mix(c, uSchneeF * (0.93 + 0.1 * n2), sch * (1.0 - 0.6 * pf));
  c *= 1.0 + uGlanz * 0.9 * exp(-pow((dK - uGlanzR) / 12.0, 2.0)) * (1.0 - fernM);
  diffuseColor.rgb = c;`);
  };
  return m;
}
function grasMaterial(u, { schneeHuellt = 0.6 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.95, flatShading: true, vertexColors: true, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uZeit: u.uZeit, uWindS: u.uWindS, uGras: u.uGras, uGras2: u.uGras2, uSchnee: u.uSchnee, uGlanz: u.uGlanz, uGlanzR: u.uGlanzR, uSchneeF: u.uSchneeF });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uZeit, uWindS, uSchnee; varying float vZ; varying vec3 vWp;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
  {
    vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float iz = fract(sin(dot(wp.xz, vec2(12.9898, 78.233))) * 43758.5453); vZ = iz;
    float k = max(position.y, 0.0);
    float ph = wp.x * 0.31 + wp.z * 0.23;
    float boe = 0.5 + 0.5 * sin(wp.z * 0.045 - uZeit * 1.9 + wp.x * 0.02);
    float s = sin(uZeit * 1.7 + ph) * 0.55 + sin(uZeit * 3.1 + ph * 1.9) * 0.3;
    transformed.x += (s * 0.55 + boe * 1.25) * k * k * 0.1 * uWindS;
    transformed.z += cos(uZeit * 1.3 + ph) * k * k * 0.05 * uWindS;
    transformed.y *= 1.0 - ${schneeHuellt.toFixed(2)} * uSchnee * (0.5 + 0.5 * iz);
    vWp = wp.xyz;
  }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vZ; varying vec3 vWp; uniform vec3 uGras, uGras2, uSchneeF; uniform float uSchnee, uGlanz, uGlanzR;")
      .replace("#include <color_fragment>", `#include <color_fragment>
  {
    vec3 g = mix(uGras, uGras2, vZ) * (0.85 + 0.3 * fract(vZ * 7.3));
    diffuseColor.rgb *= g * 1.9;
    diffuseColor.rgb = mix(diffuseColor.rgb, uSchneeF * 0.95, uSchnee * (1.0 - 0.7 * vColor.r) * 0.85);
    float dK = length(vWp.xz - cameraPosition.xz);
    diffuseColor.rgb *= 1.0 + uGlanz * 0.9 * exp(-pow((dK - uGlanzR) / 12.0, 2.0));
  }`);
  };
  return m;
}

// ----------------------------------------------------------------------------------------------- Gras, Blumen
function grasBueschel() {      // 6 Halme, Höhe 1, Farbverlauf dunkel → hell
  const pos = [], col = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 2.4 + 0.3, r = 0.1 + 0.06 * (i % 2), x = Math.cos(a) * r, z = Math.sin(a) * r, w = 0.032;
    const nx = -Math.sin(a) * w, nz = Math.cos(a) * w, h = 0.7 + 0.3 * ((i * 5) % 3) / 2;
    pos.push(x - nx, 0, z - nz, x + nx, 0, z + nz, x * 1.9, h, z * 1.9);
    col.push(0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 1, 1, 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  return g;
}
function blumeGeo() {
  const st = new THREE.CylinderGeometry(0.008, 0.012, 0.42, 3); st.translate(0, 0.21, 0);
  const kopf = new THREE.IcosahedronGeometry(0.04, 0); kopf.scale(1, 0.6, 1); kopf.translate(0, 0.44, 0);
  const bl = new THREE.ConeGeometry(0.07, 0.12, 4); bl.translate(0.05, 0.1, 0);
  return sammle([{ g: st, c: [0.25, 0.4, 0.15] }, { g: kopf, c: [1, 1, 1], kz: 1 }, { g: bl, c: [0.3, 0.45, 0.18] }]);
}

// ----------------------------------------------------------------------------------------------- Tiere
function rehGeo() {
  const T = [];
  const leib = new THREE.IcosahedronGeometry(0.5, 1); leib.scale(1.25, 0.62, 0.55); leib.translate(0, 0.8, 0); T.push({ g: leib, c: [0.62, 0.38, 0.22] });
  const bauch = new THREE.IcosahedronGeometry(0.4, 1); bauch.scale(1.2, 0.45, 0.5); bauch.translate(0, 0.68, 0); T.push({ g: bauch, c: [0.78, 0.66, 0.5] });
  const spiegel = new THREE.IcosahedronGeometry(0.1, 0); spiegel.scale(0.5, 1, 1.2); spiegel.translate(-0.62, 0.86, 0); T.push({ g: spiegel, c: [0.96, 0.93, 0.86] });
  for (const [x, z] of [[0.38, 0.14], [0.38, -0.14], [-0.38, 0.14], [-0.38, -0.14]]) { const b = new THREE.CylinderGeometry(0.035, 0.05, 0.66, 5); b.translate(x, 0.33, z); T.push({ g: b, c: [0.3, 0.2, 0.14] }); }
  const hals = new THREE.CylinderGeometry(0.07, 0.12, 0.5, 6); hals.rotateZ(-0.7); hals.translate(0.62, 1.04, 0);
  const kopf = new THREE.ConeGeometry(0.09, 0.3, 6); kopf.rotateZ(-Math.PI / 2 - 0.35); kopf.translate(0.9, 1.2, 0);
  const ohr1 = new THREE.ConeGeometry(0.04, 0.13, 4); ohr1.translate(0.78, 1.36, 0.07); const ohr2 = ohr1.clone(); ohr2.translate(0, 0, -0.14);
  const nase = new THREE.IcosahedronGeometry(0.035, 0); nase.translate(1.04, 1.1, 0);
  return { koerper: sammle(T), kopf: sammle([{ g: hals, c: [0.6, 0.37, 0.22] }, { g: kopf, c: [0.62, 0.4, 0.24] }, { g: ohr1, c: [0.5, 0.32, 0.2] }, { g: ohr2, c: [0.5, 0.32, 0.2] }, { g: nase, c: [0.08, 0.06, 0.05] }]) };
}
function hochsitz() {
  const g = new THREE.Group();
  const holz = new THREE.MeshStandardMaterial({ color: "#7A5B3E", roughness: 0.9, flatShading: true }), dunkel = new THREE.MeshStandardMaterial({ color: "#5A4330", roughness: 0.9, flatShading: true });
  const dach = new THREE.MeshStandardMaterial({ color: "#3F4A3A", roughness: 0.95, flatShading: true });
  const box = (w, h, d, x, y, z, m = holz) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; g.add(b); return b; };
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) box(0.14, 3.0, 0.14, x, 1.5, z, dunkel);
  for (const s of [-1, 1]) { const b = box(0.07, 3.3, 0.07, s * 0.8, 1.5, 0, dunkel); b.rotation.x = s * 0.55; }
  box(2.0, 0.12, 2.0, 0, 3.05, 0);
  box(1.8, 1.25, 0.08, 0, 3.75, -0.9, holz); box(1.8, 0.7, 0.08, 0, 3.5, 0.9, holz); box(0.08, 1.25, 1.8, -0.9, 3.75, 0, holz); box(0.08, 1.25, 1.8, 0.9, 3.75, 0, holz);
  const r = box(2.4, 0.1, 2.4, 0, 4.45, 0, dach); r.rotation.z = 0.06;
  for (let i = 0; i < 9; i++) box(0.5, 0.05, 0.06, 0.1, 0.3 + 0.33 * i, 1.38 - 0.0 * i, dunkel);
  const l = box(0.06, 3.1, 0.06, -0.15, 1.55, 1.3, dunkel); l.rotation.x = -0.4; const l2 = l.clone(); l2.position.x = 0.35; g.add(l2);
  return g;
}

// ----------------------------------------------------------------------------------------------- Welt
export class Waldlichtung {
  constructor(szene, { schatten = true } = {}) {
    this.szene = szene; this.schatten = schatten; this.vertices = 0;
    this.u = {
      uZeit: { value: 0 }, uWindS: { value: 1 }, uCover: { value: 1 }, uLaub: { value: C("#4E7C2E") }, uLaub2: { value: C("#6A8F34") }, uFichte: { value: C("#2F4D34") },
      uGras: { value: C("#6F9440") }, uGras2: { value: C("#8AA648") }, uStreu: { value: C("#4A3A28") }, uSchneeF: { value: C("#E6EBF2") },
      uSchnee: { value: 0 }, uGlanz: { value: 0 }, uGlanzR: { value: 0 }, uHerbst: { value: 0 },
    };
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._e = new THREE.Euler();
    this._boden(); this._baeume(); this._gras(); this._deko(); this._rehe();
  }
  _boden() {
    const mat = bodenMaterial(this.u);
    const nah = new THREE.PlaneGeometry(700, 800, 350, 400); nah.rotateX(-Math.PI / 2); nah.translate(0, 0, -250);
    const fern = new THREE.PlaneGeometry(26000, 26000, 400, 400); fern.rotateX(-Math.PI / 2); fern.translate(0, 0, -8000);
    for (const [g, tief] of [[nah, 0], [fern, 1]]) {
      const p = g.getAttribute("position");
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let y = hoehe(x, z); if (tief && Math.abs(x) < 360 && z < 160 && z > -660) y -= 4; p.setY(i, y); }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = this.schatten; this.szene.add(m); this.vertices += p.count;
    }
  }
  _inst(geo, mat, n, schatten = false) { const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = schatten && this.schatten; im.receiveShadow = this.schatten; im.frustumCulled = false; this.szene.add(im); this.vertices += geo.getAttribute("position").count * n; return im; }
  _setze(im, i, x, z, s, ry, y = null, tilt = 0) {
    this._e.set(tilt * Math.cos(ry), ry, tilt * Math.sin(ry)); this._q.setFromEuler(this._e); this._s.set(s, s, s);
    this._p.set(x, y ?? hoehe(x, z), z); this._m.compose(this._p, this._q, this._s); im.setMatrixAt(i, this._m);
  }
  _baeume() {
    const u = this.u, sch = this.schatten;
    const mKrone = kronenMaterial(u), mKroneF = kronenMaterial(u, { minVis: 0.3 }), mFichte = kronenMaterial(u, { fichte: true }), mStamm = stammMaterial(u);
    const mKroneFern = kronenMaterial(u, { minVis: 0.3 }), mFichteFern = kronenMaterial(u, { fichte: true, hoehe: 18 });
    // --- Platzierung: nah (detailreich) und fern (Silhouetten)
    const nahB = [], nahF = [], fernB = [], fernF = [];
    const frei = (x, z, mind = 0) => lichtungMass(x, z) > 1.04 + mind;
    let seed = 1;
    for (let i = 0; i < 40000 && (nahB.length < 130 || nahF.length < 200); i++) {            // dichter Rand und Wald in Kameranähe
      const x = (hash(i, 901) - 0.5) * 340, z = 70 - hash(i, 902) * 330;
      if (!frei(x, z, 0.0)) continue;
      const dist = Math.hypot(x, z + 50), rand = smoothstep(1.04, 1.5, lichtungMass(x, z));
      const gr = 0.8 + 0.5 * hash(i, 903) + 0.25 * (1 - rand);
      if (hash(i, 904) < 0.5 && nahB.length < 130) nahB.push({ x, z, s: gr, ry: hash(i, 905) * 6.28, v: Math.floor(hash(i, 906) * 3), tilt: (hash(i, 907) - 0.5) * 0.05 });
      else if (nahF.length < 200) nahF.push({ x, z, s: gr * 0.95, ry: hash(i, 905) * 6.28, v: Math.floor(hash(i, 906) * 2), tilt: (hash(i, 907) - 0.5) * 0.05 });
    }
    // einzelne Solitäre auf der Wiese
    for (const [x, z, s] of [[-11, -78, 1.1], [13, -92, 0.95], [-30, -88, 1.2], [12, -112, 1.0]]) nahB.push({ x, z, s, ry: x * 0.7, v: 1, tilt: 0.02 });
    for (const [x, z, s] of [[26, -24, 0.7], [-38, -52, 0.8]]) nahF.push({ x, z, s, ry: x * 0.3, v: 0, tilt: 0.015 });
    for (let i = 0; i < 16000 && fernB.length + fernF.length < 5200; i++) {
      const x = (hash(i, 911) - 0.5) * 1500, z = 130 - Math.pow(hash(i, 912), 1.25) * 1250;
      if (!frei(x, z, 0.1) || (Math.abs(x) < 190 && z > -330 && z < 60 && nahB.length + nahF.length > 0 && hash(i, 913) < 0.55)) continue;
      const y = hoehe(x, z), fichteAnteil = clamp(0.42 + y / 160, 0.3, 0.95);
      const e = { x, z, s: 0.75 + 0.9 * hash(i, 914), ry: hash(i, 915) * 6.28 };
      if (hash(i, 916) < fichteAnteil) fernF.push(e); else fernB.push(e);
    }
    // --- Meshes
    const varianten = [0, 1, 2].map((k) => bucheGeo(3 + k * 11, { gross: 0.92 + 0.12 * k }));
    this.nahBuche = varianten.map((v, k) => {
      const liste = nahB.filter((t) => t.v === k), a = this._inst(v.stamm, mStamm, liste.length, true), b = this._inst(v.krone, mKrone, liste.length, true);
      liste.forEach((t, i) => { this._setze(a, i, t.x, t.z, t.s, t.ry, null, t.tilt); this._setze(b, i, t.x, t.z, t.s, t.ry, null, t.tilt); });
      return [a, b];
    });
    const fv = [fichteGeo(5), fichteGeo(17)];
    fv.forEach((g, k) => { const liste = nahF.filter((t) => t.v === k), a = this._inst(g, mFichte, liste.length, true); liste.forEach((t, i) => this._setze(a, i, t.x, t.z, t.s, t.ry, null, t.tilt)); });
    const bF = bucheFern(), fF = fichteFern();
    const ab = this._inst(bF.stamm, mStamm, fernB.length), bb = this._inst(bF.krone, mKroneFern, fernB.length);
    fernB.forEach((t, i) => { this._setze(ab, i, t.x, t.z, t.s, t.ry); this._setze(bb, i, t.x, t.z, t.s, t.ry); });
    const af = this._inst(fF, mFichteFern, fernF.length);
    fernF.forEach((t, i) => this._setze(af, i, t.x, t.z, t.s * 1.1, t.ry));
    // bewaldete Kämme: Fichtensilhouetten in 0,9–3,6 km erzeugen den gezackten Kamm
    const kamm = [];
    for (let i = 0; i < 9000 && kamm.length < 7000; i++) { const x = (hash(i, 921) - 0.5) * 4200, z = -700 - hash(i, 922) * 3200; if (hoehe(x, z) > 20 || z < -2000) kamm.push({ x, z, s: 1.5 + 1.8 * hash(i, 923) + (-z) / 2500, ry: hash(i, 924) * 6.28 }); }
    const ak = this._inst(fF, mFichteFern, kamm.length);
    kamm.forEach((t, i) => this._setze(ak, i, t.x, t.z, t.s, t.ry));
    // Unterholz am Waldrand (kleine Laubballen)
    const un = []; for (let i = 0; i < 20000 && un.length < 1500; i++) { const x = (hash(i, 931) - 0.5) * 300, z = 50 - hash(i, 932) * 260, m = lichtungMass(x, z); if (m > 0.98 && m < 1.7) un.push({ x, z, s: 0.7 + 0.9 * hash(i, 933), ry: hash(i, 934) * 6.28 }); }
    const ug = sammle([klumpe([0, 0.7, 0], 1.0, 4, 0.9, 0.7)]), au = this._inst(ug, kronenMaterial(u, { minVis: 0.55, hoehe: 2 }), un.length);
    un.forEach((t, i) => this._setze(au, i, t.x, t.z, t.s, t.ry));
    this.baumZahl = nahB.length + nahF.length + fernB.length + fernF.length + kamm.length;
    this.randBaeume = nahB.concat(nahF);
  }
  _gras() {
    const u = this.u, mG = grasMaterial(u);
    const geo = grasBueschel();
    const nah = 52000, mid = 26000;
    const gn = this._inst(geo, mG, nah), gm = this._inst(geo, mG, mid);
    const pfadFrei = (x, z) => Math.abs(x - pfadX(z)) < 0.9;
    let n = 0;
    for (let i = 0; i < nah * 1.4 && n < nah; i++) {                       // dicht um die Kamera
      const r = 4 + 58 * Math.pow(hash(i, 931), 0.8), a = hash(i, 932) * 6.283, x = Math.cos(a) * r * 1.0, z = -14 + Math.sin(a) * r * 1.3 - 20 * hash(i, 933);
      if (lichtungMass(x, z) > 0.92 || pfadFrei(x, z)) continue;
      this._setze(gn, n++, x, z, 0.32 + 0.34 * hash(i, 934) + 0.18 * smoothstep(20, 60, r), hash(i, 935) * 6.28);
    }
    for (let k = n; k < nah; k++) this._setze(gn, k, 0, 0, 0, 0);
    gn.count = nah;
    n = 0;
    for (let i = 0; i < mid * 1.6 && n < mid; i++) {
      const x = (hash(i, 941) - 0.5) * 170, z = 20 - hash(i, 942) * 200;
      if (lichtungMass(x, z) > 0.95 || pfadFrei(x, z) || Math.hypot(x, z + 14) < 30) continue;
      this._setze(gm, n++, x, z, 0.45 + 0.4 * hash(i, 944), hash(i, 945) * 6.28);
    }
    for (let k = n; k < mid; k++) this._setze(gm, k, 0, 0, 0, 0);
    // Blumen
    const mB = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.8, flatShading: true, vertexColors: true });
    const ub = { uBluete: { value: 1 } };
    mB.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uBluete: ub.uBluete, uZeit: u.uZeit, uWindS: u.uWindS, uSchnee: u.uSchnee });
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float kz; uniform float uBluete, uZeit, uWindS, uSchnee; varying float vK; varying float vI;")
        .replace("#include <begin_vertex>", `#include <begin_vertex>
  { vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float iz = fract(sin(dot(wp.xz, vec2(12.9898, 78.233))) * 43758.5453); vI = iz; vK = kz;
    float vis = smoothstep(iz, iz + 0.25, uBluete) * (1.0 - uSchnee);
    transformed.y *= (kz > 0.5 ? 1.0 : 1.0) * (0.15 + 0.85 * vis) ; transformed *= step(0.001, vis + 0.0);
    transformed.x += sin(uZeit * 1.8 + wp.x * 0.3 + wp.z * 0.2) * position.y * position.y * 0.18 * uWindS; }`);
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vK; varying float vI;")
        .replace("#include <color_fragment>", `#include <color_fragment>
  if (vK > 0.5) { vec3 bl = vI < 0.4 ? vec3(0.98, 0.97, 0.92) : (vI < 0.75 ? vec3(0.98, 0.82, 0.18) : vec3(0.66, 0.46, 0.84)); diffuseColor.rgb = bl; }`);
    };
    const bl = this._inst(blumeGeo(), mB, 6500);
    this.bluete = ub.uBluete;
    n = 0;
    for (let i = 0; i < 14000 && n < 6500; i++) {
      const r = 3 + 55 * Math.pow(hash(i, 951), 0.85), a = hash(i, 952) * 6.283, x = Math.cos(a) * r, z = -12 + Math.sin(a) * r * 1.25 - 15 * hash(i, 953);
      if (lichtungMass(x, z) > 0.9 || pfadFrei(x, z)) continue;
      this._setze(bl, n++, x, z, 0.8 + 0.7 * hash(i, 954), hash(i, 955) * 6.28);
    }
    for (let k = n; k < 6500; k++) this._setze(bl, k, 0, 0, 0, 0);
    this.gras = [gn, gm, bl];
  }
  _deko() {
    // Findlinge, Baumstümpfe, Totholz, Hochsitz
    const stein = new THREE.MeshStandardMaterial({ color: "#7C7A72", roughness: 0.95, flatShading: true });
    const moos = new THREE.MeshStandardMaterial({ color: "#566B3C", roughness: 1, flatShading: true });
    const holz = new THREE.MeshStandardMaterial({ color: "#6B5440", roughness: 0.95, flatShading: true });
    const mkStein = (x, z, r, i) => {
      const g = new THREE.IcosahedronGeometry(r, 1), p = g.getAttribute("position");
      for (let j = 0; j < p.count; j++) { const f = 1 + 0.25 * (hash(j + i * 7, 8) - 0.5); p.setXYZ(j, p.getX(j) * f * 1.2, p.getY(j) * f * 0.7, p.getZ(j) * f); } g.computeVertexNormals();
      const m = new THREE.Mesh(g, hash(i, 3) < 0.5 ? stein : moos); m.position.set(x, hoehe(x, z) + r * 0.2, z); m.rotation.y = i; m.castShadow = m.receiveShadow = this.schatten; this.szene.add(m);
    };
    [[-3.2, -3.4, 0.55], [2.6, -6.5, 0.4], [-6, -16, 0.8], [8, -24, 0.7], [-1.5, -30, 0.45], [14, -37, 1.0], [-14, -45, 0.9], [4, -58, 0.6], [-21, -74, 1.1], [18, -86, 0.9]].forEach(([x, z, r], i) => mkStein(x, z, r, i));
    // Baumstumpf und Totholz im Vordergrund (verankert den Standpunkt)
    const stumpf = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.46, 0.55, 8), holz); stumpf.position.set(-2.1, hoehe(-2.1, -2.8) + 0.25, -2.8); stumpf.castShadow = stumpf.receiveShadow = this.schatten; this.szene.add(stumpf);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.02, 8), new THREE.MeshStandardMaterial({ color: "#B99A70", roughness: 0.9 })); ring.position.set(-2.1, hoehe(-2.1, -2.8) + 0.53, -2.8); this.szene.add(ring);
    const stamm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 4.2, 7), holz); stamm.rotation.z = Math.PI / 2 - 0.08; stamm.rotation.y = 0.5; stamm.position.set(3.4, hoehe(3.4, -9) + 0.26, -9); stamm.castShadow = stamm.receiveShadow = this.schatten; this.szene.add(stamm);
    const moosOben = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 1), moos); moosOben.scale.set(3, 0.45, 0.9); moosOben.rotation.y = 0.5; moosOben.position.set(3.4, hoehe(3.4, -9) + 0.45, -9); this.szene.add(moosOben);
    // Hochsitz am Weg
    const hz = hochsitz(), hx = pfadX(-66) - 6.5, hzz = -68; hz.position.set(hx, hoehe(hx, hzz) - 0.05, hzz); hz.rotation.y = 0.45; this.szene.add(hz);
    this.hochsitz = hz;
  }
  _rehe() {
    const g = rehGeo();
    const mat = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.9, flatShading: true, vertexColors: true });
    this.rehe = [];
    const lage = [[3.6, -17, 0.5, 1.25], [6.6, -21, 2.3, 0.85], [-8, -27, 1.1, 1.2], [-5.4, -31, -0.7, 1.05]];
    for (let i = 0; i < lage.length; i++) {
      const gr = new THREE.Group(), k = new THREE.Mesh(g.koerper, mat), kopf = new THREE.Mesh(g.kopf, mat), s = lage[i][3];
      k.castShadow = kopf.castShadow = this.schatten; kopf.matrixAutoUpdate = false; gr.add(k, kopf);
      gr.scale.setScalar(s); gr.position.set(lage[i][0], hoehe(lage[i][0], lage[i][1]), lage[i][1]); gr.rotation.y = lage[i][2];
      this.szene.add(gr); this.rehe.push({ gr, kopf, x: lage[i][0], z: lage[i][1], dreh: lage[i][2], s, i });
    }
  }

  /** Zustand je Bild (alles Funktion von t) */
  setze(t, kam, { saison: S, wind = 1, glanz = 0, glanzR = 0, rehe = {} } = {}) {
    const u = this.u;
    u.uZeit.value = t; u.uWindS.value = wind;
    u.uCover.value = S.cover; u.uLaub.value.copy(S.laub); u.uLaub2.value.copy(S.laub2); u.uGras.value.copy(S.gras); u.uGras2.value.copy(S.gras2);
    u.uSchnee.value = S.schnee; u.uGlanz.value = glanz; u.uGlanzR.value = glanzR; u.uHerbst.value = S.herbstAnteil;
    this.bluete.value = S.bluete;
    // Rehe: grasen (Kopf nickt), manche heben den Kopf (wachsam), manche gehen langsam
    const mT = new THREE.Matrix4(), mR = new THREE.Matrix4(), mB = new THREE.Matrix4();
    for (const r of this.rehe) {
      const ph = r.i * 1.9, wk = rehe.wachsam?.[r.i] ?? 0;
      const gras = 0.5 + 0.5 * Math.sin(t * (0.9 + 0.2 * r.i) + ph);
      const nick = lerp(0.55 + 0.55 * Math.max(0, gras - 0.35), -0.12, wk);          // positiv = Kopf nach unten
      const gehen = rehe.gehen?.[r.i] ?? 0.12, step = Math.sin(t * 0.05 + ph) * 2.0 * gehen;
      r.gr.position.set(r.x + Math.sin(r.dreh) * step, hoehe(r.x, r.z), r.z + Math.cos(r.dreh) * step);
      mT.makeTranslation(0.55, 0.95, 0); mR.makeRotationZ(-nick * 0.85); mB.makeTranslation(-0.55, -0.95, 0);
      r.kopf.matrix.copy(mT).multiply(mR).multiply(mB); r.kopf.matrixWorldNeedsUpdate = true;
    }
    return this;
  }
}

// ----------------------------------------------------------------------------------------------- Sonnenbögen (Lichtspur am Himmel)
/**
 * Leuchtende Tagesbögen der Sonne: N Bögen mit Deklinationen ε·cos(πk/(N−1)) (dichter an den Wenden) plus ein „aktueller“ Bogen.
 * Bänder liegen auf einer Kugel (Radius R), Mitte hell, Ränder weich. Fallen bei ε → 0 zu einem Bogen zusammen (additive Helligkeit steigt).
 */
export class Sonnenboegen {
  constructor(szene, { N = 9, seg = 90, radius = 18000, breite = 0.5 } = {}) {
    this.N = N; this.seg = seg; this.R = radius; this.breite = breite;
    const bands = N + 1;
    this.pos = new Float32Array(bands * (seg + 1) * 3 * 3); this.col = new Float32Array(this.pos.length);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const index = []; for (let b = 0; b < bands; b++) for (let i = 0; i < seg; i++) { const a = (b * (seg + 1) + i) * 3, c = a + 3; index.push(a, a + 1, c, c, a + 1, c + 1, a + 1, a + 2, c + 1, c + 1, a + 2, c + 2); }
    geo.setIndex(index);
    this.geo = geo;
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = -900; szene.add(this.mesh);
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._t = new THREE.Vector3(); this._n = new THREE.Vector3(); this._s = new THREE.Vector3();
  }
  /** eps = Achsneigung (Grad), alpha 0..1 (alle Bögen), jetzt = Deklination des aktuellen Tages (Grad) oder null, jetztAlpha, hell = Gesamthelligkeit */
  setze({ eps, alpha = 1, jetzt = null, jetztAlpha = 1, hell = 1.6, farbeSommer = "#FFD680", farbeWinter = "#BFD8FF", H0 = 6 }) {
    const N = this.N, seg = this.seg, bands = N + 1, R = this.R, ws = this.breite * D2R * R;
    const cs = C(farbeSommer), cw = C(farbeWinter), col = new THREE.Color();
    for (let b = 0; b < bands; b++) {
      const aktuell = b === N;
      const dekl = aktuell ? (jetzt ?? 0) : eps * Math.cos((Math.PI * b) / (N - 1));
      const a = aktuell ? (jetzt === null ? 0 : jetztAlpha) : alpha;
      const f = eps > 1e-3 ? (dekl / eps + 1) / 2 : 0.5;
      col.copy(cw).lerp(cs, clamp(f)).multiplyScalar(hell * (aktuell ? 1.5 : 1) * a);
      const d = dekl * D2R, p = PHI * D2R;
      const Hs = Math.acos(clamp(-Math.tan(p) * Math.tan(d), -1, 1)) / D2R;      // Halbbogen in Grad
      for (let i = 0; i <= seg; i++) {
        const H = lerp(-Hs, Hs, i / seg);
        const dir = (HH, out) => { const r = sonnenRichtung(dekl, HH); return out.set(r[0], r[1], r[2]); };
        dir(H, this._a); const H2 = H + 0.6; dir(H2, this._b); this._t.copy(this._b).sub(this._a).normalize();
        this._n.copy(this._a).cross(this._t).normalize();
        const rand = smoothstep(0, 0.07, i / seg) * (1 - smoothstep(0.93, 1, i / seg)), hor = smoothstep(0.0, 0.05, this._a.y);
        const k = (b * (seg + 1) + i) * 9;
        const w = rand * hor;
        for (let j = 0; j < 3; j++) {
          const off = (j - 1) * ws * (j === 1 ? 0 : 1);
          this.pos[k + j * 3] = this._a.x * R + this._n.x * off; this.pos[k + j * 3 + 1] = this._a.y * R + this._n.y * off; this.pos[k + j * 3 + 2] = this._a.z * R + this._n.z * off;
          const m = j === 1 ? w : 0;
          this.col[k + j * 3] = col.r * m; this.col[k + j * 3 + 1] = col.g * m; this.col[k + j * 3 + 2] = col.b * m;
        }
      }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
    this.mesh.position.set(0, 0, 0);
    this.mesh.visible = alpha > 0.001 || (jetzt !== null && jetztAlpha > 0.001);
  }
  folge(kamera) { this.mesh.position.copy(kamera.position); return this; }
}
