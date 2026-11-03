// Grundwelt „Feld → Wald“ (Account 2 @stelldirvor.pov, Weltenkatalog „Land, Feld → Wald“, .claude/skills/stelldirvor-video/themen-und-plan.md §2)
// Erstbau 04.11.2026 („Was wäre, wenn du einen Acker 144 Jahre lang in Ruhe lässt?“, Broadbalk Wilderness). NUR für den Baukasten Lunar-POV.
//
// Inhalt: englische Feldlandschaft (sanfte Hügel, Hecken, Feldgehölze, Dorf mit Kirchturm in der Ferne), eingezäunte Versuchsfläche vor dem
// Holzpodest (links ab 1900 jährlich gerodet → Wiese mit Schafen, rechts wächst Wald), nebenan das weiter bewirtschaftete Weizenfeld
// (Jahreslauf: grün, gold, Ernte mit Mähdrescher, Stoppeln, Pflug), Feldweg.
// Vegetation wächst als reine Funktion des Simulationsjahres Y und der (stilisierten) Jahreszeit s: Weizenreste, Kraut und Gras, Disteln,
// Brombeere und Weißdorn (mit Blüte), Esche, Bergahorn, einzelne Eichen (Laub im Jahreslauf, kahl im Winter, Schnee in manchen Wintern).
//
// Steuerung je Bild (alles Funktion von t, kein Zustand):
//   const welt = new FeldWald(szene, { schatten: true });
//   welt.setze(t, kamera, { Y, s, schnee, wind, sonne:[x,y,z], ernteX, schafe 0..1, reh 0..1, licht });
//   welt.puffs(t, { … }) → Liste normaler Puffs (Morgennebel, Staub des Mähdreschers)
// Koordinaten: Kamera auf dem Podest bei (PODEST.x, 5.6, PODEST.z), Blick nach −z über die Versuchsfläche; x < 0 = linke (gerodete) Hälfte.
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";

// --------------------------------------------------------------------------------------------- Rauschen (JS)
const fr = (x) => x - Math.floor(x);
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= 0.5; } return s; }

export const PODEST = { x: -2.5, z: 0, boden: 4.0, auge: 5.6 };
export const PLOT = { x0: -22, x1: 22, z0: -48, z1: -2 };            // Versuchsfläche (≈ 0,2 ha), Zaun bei z = −2
export const WEIZEN = { z1: -54, z0: -420 };                          // Nachbarfeld Broadbalk (Weizen seit 1843), hinter dem Feldweg

/** Gelände: flach um die Fläche, sanft gewellt ringsum, Hügel in 1–4 km */
export function hoehe(x, z) {
  const d = Math.hypot(x, z + 30);
  let y = 0.25 * (vn(x * 0.05, z * 0.05) - 0.5);
  y += 6 * smoothstep(120, 600, d) * (fbm(x * 0.002 + 3, z * 0.002, 3) - 0.35);
  y += 55 * smoothstep(700, 3500, d) * fbm(x * 0.0007 + 7, z * 0.0007 + 2, 4);
  y += 0.012 * Math.max(0, -z - 60) * smoothstep(60, 400, -z);         // Feld steigt leicht an (Blick darüber)
  return y;
}

// --------------------------------------------------------------------------------------------- Jahreszeit (s ∈ [0,1): 0 März, 0.15 Mai, 0.3 Juli, 0.42 Aug, 0.55 Okt, 0.68 Nov, 0.8 Jan)
const C = (h) => new THREE.Color(h);
function zyklisch(keys) { // [[s, farbe|zahl], …] auf [0,1) geschlossen
  const K = keys.map(([s, v]) => [s, typeof v === "number" ? v : C(v)]);
  return (s, out) => {
    s = fr(s);
    let i = K.length - 1; for (let k = 0; k < K.length; k++) if (K[k][0] <= s) i = k;
    const a = K[i], b = K[(i + 1) % K.length], sb = b[0] <= a[0] ? b[0] + 1 : b[0];
    const p = smoothstep(0, 1, (s - a[0]) / (sb - a[0]));
    if (typeof a[1] === "number") return lerp(a[1], b[1], p);
    return (out || new THREE.Color()).copy(a[1]).lerp(b[1], p);
  };
}
export const SAISON = {
  laub: zyklisch([[0, 0], [0.06, 0.15], [0.14, 0.85], [0.2, 1], [0.56, 1], [0.66, 0.55], [0.72, 0.1], [0.78, 0], [0.99, 0]]),
  esche: zyklisch([[0, "#6A5F55"], [0.08, "#8FB45A"], [0.18, "#5E8A34"], [0.4, "#567B30"], [0.53, "#8E9A3A"], [0.6, "#D2B24A"], [0.68, "#B7963E"], [0.74, "#6A5F55"]]),
  ahorn: zyklisch([[0, "#615349"], [0.07, "#9EC062"], [0.18, "#4C7A2C"], [0.42, "#466F28"], [0.54, "#9C8A33"], [0.61, "#C49A3A"], [0.69, "#9A7438"], [0.75, "#615349"]]),
  eiche: zyklisch([[0, "#5E5148"], [0.09, "#B6BE62"], [0.2, "#55783A"], [0.45, "#4E6F33"], [0.6, "#8C7A38"], [0.68, "#9A6A33"], [0.8, "#7A5A3A"], [0.95, "#5E5148"]]),
  dorn: zyklisch([[0, "#5A5046"], [0.07, "#88AA58"], [0.12, "#E4E2D6"], [0.19, "#E8E4DA"], [0.23, "#5F8A3A"], [0.45, "#587E35"], [0.56, "#7E6038"], [0.65, "#7E5236"], [0.74, "#5A5046"]]),
  brombeere: zyklisch([[0, "#3E4A30"], [0.1, "#4E6E34"], [0.3, "#3E6230"], [0.5, "#4A5A2E"], [0.62, "#5A4434"], [0.75, "#4A4232"], [0.9, "#3E4A30"]]),
  gras: zyklisch([[0, "#6E7A48"], [0.1, "#7EA048"], [0.25, "#7A9A44"], [0.4, "#A6A060"], [0.55, "#8A8A52"], [0.7, "#7C7650"], [0.85, "#6E7250"]]),
  kraut: zyklisch([[0, "#64703E"], [0.12, "#7A9A40"], [0.28, "#8A9A46"], [0.42, "#B09A5A"], [0.58, "#8E7A4E"], [0.75, "#6A6246"], [0.9, "#64703E"]]),
  weizen: zyklisch([[0, "#7C9A4A"], [0.1, "#86A84E"], [0.22, "#A8AE52"], [0.3, "#D2B460"], [0.4, "#D9B566"], [0.5, "#C6A45E"], [0.62, "#9A8256"], [0.75, "#7E6E52"], [0.88, "#728A48"]]),
  weizenH: zyklisch([[0, 0.25], [0.12, 0.6], [0.24, 0.95], [0.42, 1], [0.55, 0.85], [0.7, 0.45], [0.82, 0.3], [0.95, 0.25]]),
  distel: zyklisch([[0, 0], [0.18, 0.2], [0.28, 1], [0.42, 0.8], [0.55, 0.15], [0.62, 0]]),
};
/** Nachbarfeld im Jahreslauf: Farbe und Halmhöhe (Ernte bei s ≈ 0.45, Pflug bei s ≈ 0.6, Saat danach) */
export function nachbarFeld(s) {
  s = fr(s);
  const gold = SAISON.weizen(s, new THREE.Color()), stoppel = C("#B49B6A"), erde = C("#5E4C3A");
  const col = gold.clone(); let h = SAISON.weizenH(s);
  const a = smoothstep(0.44, 0.47, s), b = smoothstep(0.6, 0.64, s), c = smoothstep(0.7, 0.86, s);
  col.lerp(stoppel, a); h = lerp(h, 0.12, a);
  col.lerp(erde, b); h = lerp(h, 0.02, b);
  col.lerp(gold, c); h = lerp(h, SAISON.weizenH(s), c);
  return { farbe: col, hoehe: h, gold, stoppel };
}

// --------------------------------------------------------------------------------------------- Wachstum (Jahr Y)
export const WACHS = {
  weizenRest: (Y) => 1 - 0.95 * smoothstep(1883, 1886.5, Y) - 0.05 * smoothstep(1886.5, 1889, Y),
  kraut: (Y) => smoothstep(1882.5, 1888.5, Y),
  disteln: (Y) => smoothstep(1883, 1886, Y) * (1 - smoothstep(1900, 1915, Y)),
  busch: (Y, S, H) => Y <= S ? 0 : H * (1 - Math.exp(-(Y - S) / 6)),
  baum: (Y, S, H) => Y <= S ? 0 : H * Math.pow(1 - Math.exp(-(Y - S) / 45), 1.5),
  wald: (Y) => smoothstep(1922, 1985, Y),
};

// --------------------------------------------------------------------------------------------- GLSL
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

function bodenMaterial(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.97, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vNW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvNW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vNW;
uniform vec3 uPlotL, uPlotR, uErde, uWiese, uNachbar, uStoppel, uWeg, uWaldBoden, uFern1, uFern2, uFern3;
uniform float uKahlL, uKahlR, uWald, uSchnee, uErnteX, uFurche, uZeit;
${GLSL_NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  vec3 W = vNW; vec2 p = W.xz;
  float dc = length(p - cameraPosition.xz);
  float n1 = nN(p * 0.35), n2 = nN(p * 1.7), n3 = nF(p * 0.06);
  // Grundfarbe: Wiese ringsum, ferne Felder als Flickenteppich (Zellen), Hecken als dunkle Kanten
  vec3 z = nZelle(p * 0.006 + 3.0);
  vec3 fern = z.z < 0.33 ? uFern1 : (z.z < 0.66 ? uFern2 : uFern3);
  fern *= 0.85 + 0.25 * nN(p * 0.02 + z.z * 9.0);
  float hecke = 1.0 - smoothstep(0.0, 0.035, z.y - z.x);
  vec3 c = mix(uWiese * (0.86 + 0.22 * n1), fern, smoothstep(260.0, 520.0, length(p - vec2(0.0, -150.0))));
  c = mix(c, vec3(0.13, 0.17, 0.09), hecke * smoothstep(300.0, 600.0, length(p - vec2(0.0, -150.0))) * 0.9);
  // Nachbarfeld Broadbalk (Weizen) hinter dem Feldweg und links der Fläche; ernteX: links davon schon geerntet
  float feld = step(W.z, ${WEIZEN.z1.toFixed(1)}) * step(${WEIZEN.z0.toFixed(1)}, W.z) * step(abs(W.x), 300.0);
  feld = max(feld, step(W.x, -28.0) * step(-300.0, W.x) * step(W.z, 30.0) * step(${WEIZEN.z0.toFixed(1)}, W.z));
  vec3 nb = mix(uNachbar, uStoppel, step(W.x, uErnteX) * step(W.z, -60.0) * step(-200.0, W.z));
  float reihe = 0.5 + 0.5 * sin(W.x * 6.0);
  nb *= 0.9 + 0.12 * n2 + 0.05 * reihe * (1.0 - smoothstep(30.0, 90.0, dc));
  c = mix(c, nb, feld);
  // Feldweg zwischen Fläche und Feld
  float weg = (1.0 - smoothstep(1.4, 2.2, abs(W.z + 51.0))) * step(abs(W.x), 300.0);
  c = mix(c, uWeg * (0.85 + 0.25 * n2), weg);
  // Versuchsfläche: links / rechts, offene Erde in Flecken, alte Pflugfurchen, Waldboden mit Laub und Efeu
  float inPlot = step(${PLOT.x0.toFixed(1)}, W.x) * step(W.x, ${PLOT.x1.toFixed(1)}) * step(${PLOT.z0.toFixed(1)}, W.z) * step(W.z, ${PLOT.z1.toFixed(1)});
  float rechts = smoothstep(-0.6, 0.6, W.x);
  float furche = (0.5 + 0.5 * sin(W.x * 4.2 + n1 * 1.5)) * uFurche;
  float kahl = mix(uKahlL, uKahlR, rechts) * smoothstep(0.35, 0.65, nF(p * 0.4) + 0.15 * n2);
  vec3 pc = mix(uPlotL, uPlotR, rechts) * (0.84 + 0.26 * n2);
  pc = mix(pc, uErde * (0.8 + 0.3 * n2) * (1.0 - 0.25 * furche), max(kahl, furche * 0.6));
  float wb = uWald * rechts * smoothstep(0.25, 0.6, nF(p * 0.15 + 2.0) + 0.3);
  pc = mix(pc, uWaldBoden * (0.75 + 0.45 * nN(p * 0.9)), wb);
  c = mix(c, pc, inPlot);
  // Schnee (in manchen Wintern), bleibt im Wald fleckig
  float sch = uSchnee * smoothstep(0.25, 0.55, n3 + 0.4 - 0.3 * wb * inPlot);
  c = mix(c, vec3(0.86, 0.88, 0.9), sch);
  diffuseColor.rgb = c;`);
  };
  return m;
}

/** Wind-Wiegen für Pflanzen: Spitzen schwingen (Höhe im Objektraum 0..1) */
function windMaterial(basis, u, { staerke = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.92, metalness: 0, flatShading: true, vertexColors: true, ...basis });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uZeit = u.uZeit; sh.uniforms.uWindS = u.uWindS;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uZeit, uWindS;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
  {
    vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float k = max(position.y, 0.0);
    float ph = wp.x * 0.37 + wp.z * 0.23;
    float s = sin(uZeit * 1.7 + ph) * 0.6 + sin(uZeit * 2.9 + ph * 1.7) * 0.3;
    transformed.x += s * k * k * 0.08 * uWindS * ${staerke.toFixed(2)};
    transformed.z += cos(uZeit * 1.3 + ph) * k * k * 0.04 * uWindS * ${staerke.toFixed(2)};
  }`);
  };
  return m;
}

// --------------------------------------------------------------------------------------------- Geometrien
function halm() {   // Büschel aus 7 Weizenhalmen (Karten) mit Ähren, Höhe 1
  const g = [];
  for (let i = 0; i < 7; i++) {
    const a = i * 2.39996, r = i === 0 ? 0 : 0.05 + 0.13 * Math.sqrt(i / 7), x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.86 + 0.14 * ((i * 37) % 7) / 7;
    const st = new THREE.PlaneGeometry(0.014, h * 0.86); st.translate(0, h * 0.43, 0); st.rotateY(a); st.translate(x, 0, z); g.push(st);
    for (const rot of [0, Math.PI / 2]) { const ae = new THREE.PlaneGeometry(0.035, 0.15); ae.translate(0, h * 0.86 + 0.07, 0); ae.rotateY(a + rot); ae.translate(x, 0, z); g.push(ae); }
    const bl = new THREE.PlaneGeometry(0.025, 0.3); bl.rotateZ(0.6); bl.translate(0.06, 0.28, 0); bl.rotateY(a + 1); bl.translate(x, 0, z); g.push(bl);
  }
  return merge(g);
}
function buschel() { // Grasbüschel: 5 Halme als schmale Dreiecke, Höhe 1
  const pos = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 2.4, r = 0.12 + 0.05 * (i % 2), x = Math.cos(a) * r, z = Math.sin(a) * r, w = 0.05;
    const nx = -Math.sin(a) * w, nz = Math.cos(a) * w;
    pos.push(-nx, 0, -nz, nx, 0, nz, x * 1.6, 0.75 + 0.25 * (i % 3) / 2, z * 1.6);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}
function distel() {
  const st = new THREE.CylinderGeometry(0.012, 0.02, 0.9, 4); st.translate(0, 0.45, 0);
  const k = new THREE.IcosahedronGeometry(0.06, 0); k.translate(0, 0.93, 0);
  const b = new THREE.IcosahedronGeometry(0.05, 0); b.translate(0.08, 0.78, 0.02);
  const bl = new THREE.ConeGeometry(0.18, 0.3, 5); bl.translate(0, 0.15, 0);
  return merge([st, k, b, bl]);
}
function klumpen(n, seed, { flach = 1, streu = 0.55 } = {}) { // Krone/Busch aus vielen kleinen Ikosaedern in einer Ellipsoid-Schale, Einheitsgröße (Radius ≈ 1)
  const g = [], hell = [];
  const N = Math.max(n, 6) + 6;
  for (let i = 0; i < N; i++) {
    const u = hash(i, seed), v = hash(i, seed + 1), th = u * 6.283, ph = Math.acos(1 - 2 * (0.15 + 0.85 * v));
    const r = i < 3 ? 0.25 * hash(i, seed + 5) : (0.55 + 0.35 * hash(i, seed + 2)) * (0.7 + 0.3 * streu / 0.55);
    const x = Math.sin(ph) * Math.cos(th) * r, y = Math.cos(ph) * r * 0.85 * flach, z = Math.sin(ph) * Math.sin(th) * r;
    const sz = i < 3 ? 0.62 : 0.3 + 0.22 * hash(i, seed + 3);
    const k = new THREE.IcosahedronGeometry(sz, 1);
    const p = k.getAttribute("position");
    for (let j = 0; j < p.count; j++) { const f = 1 + 0.12 * (hash(j + i * 97, seed + 4) - 0.5); p.setXYZ(j, p.getX(j) * f, p.getY(j) * f * (0.8 + 0.2 * flach), p.getZ(j) * f); }
    k.translate(x, y, z);
    g.push(k); hell.push((0.62 + 0.5 * hash(i, seed + 6)) * (0.78 + 0.32 * (y + 1) / 2));
  }
  const m = merge(g, hell); m.computeVertexNormals(); return m;
}
function stamm() { const g = new THREE.CylinderGeometry(0.55, 1, 1, 7); g.translate(0, 0.5, 0); return g; }
function merge(list, hell = null) {
  const geos = list.map((g) => g.index ? g.toNonIndexed() : g);
  let n = 0; for (const g of geos) n += g.getAttribute("position").count;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3).fill(1); let o = 0;
  geos.forEach((g, k) => { const a = g.getAttribute("position").array; pos.set(a, o); if (hell) col.fill(hell[k], o, o + a.length); o += a.length; });
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("color", new THREE.BufferAttribute(col, 3)); out.computeVertexNormals();
  return out;
}
function schafGeo() {
  const k = new THREE.IcosahedronGeometry(0.5, 1); k.scale(1.25, 0.8, 0.8); k.translate(0, 0.75, 0);
  const kopf = new THREE.BoxGeometry(0.22, 0.26, 0.34); kopf.translate(0.72, 0.85, 0);
  const beine = [-0.35, 0.35].flatMap((x) => [-0.2, 0.2].map((z) => { const b = new THREE.BoxGeometry(0.08, 0.5, 0.08); b.translate(x, 0.25, z); return b; }));
  return { wolle: k, dunkel: merge([kopf, ...beine]) };
}
function rehGeo() {
  const leib = new THREE.CylinderGeometry(0.22, 0.24, 1.0, 7); leib.rotateZ(Math.PI / 2); leib.translate(0, 0.85, 0);
  const hals = new THREE.CylinderGeometry(0.08, 0.12, 0.5, 6); hals.rotateZ(-0.6); hals.translate(0.55, 1.12, 0);
  const kopf = new THREE.ConeGeometry(0.1, 0.32, 6); kopf.rotateZ(-Math.PI / 2 - 0.4); kopf.translate(0.82, 1.32, 0);
  const ohr1 = new THREE.ConeGeometry(0.04, 0.14, 4); ohr1.translate(0.72, 1.46, 0.06);
  const ohr2 = ohr1.clone(); ohr2.translate(0, 0, -0.12);
  return merge([leib, hals, kopf, ohr1, ohr2]);
}
function rehBein() { const b = new THREE.CylinderGeometry(0.03, 0.04, 0.72, 5); b.translate(0, -0.36, 0); return b; }

// --------------------------------------------------------------------------------------------- Welt
export class FeldWald {
  constructor(szene, { schatten = true } = {}) {
    this.szene = szene;
    this.u = {
      uPlotL: { value: C("#8C8A50") }, uPlotR: { value: C("#8C8A50") }, uErde: { value: C("#6B5843") }, uWiese: { value: C("#6F8444") },
      uNachbar: { value: C("#C9AA60") }, uStoppel: { value: C("#B49B6A") }, uWeg: { value: C("#8E8270") }, uWaldBoden: { value: C("#3B3A24") },
      uFern1: { value: C("#7A8C4A") }, uFern2: { value: C("#A89A5E") }, uFern3: { value: C("#5E7240") },
      uKahlL: { value: 0 }, uKahlR: { value: 0 }, uWald: { value: 0 }, uSchnee: { value: 0 }, uErnteX: { value: -9999 }, uFurche: { value: 1 }, uZeit: { value: 0 }, uWindS: { value: 1 },
    };
    this.vertices = 0;
    this._baueBoden(schatten);
    this._baueZaunUndPodest(schatten);
    this._baueVegetation(schatten);
    this._baueFerne(schatten);
    this._baueTiere(schatten);
    this._baueMaschine(schatten);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._e = new THREE.Euler(); this._c = new THREE.Color();
  }

  _baueBoden(schatten) {
    const mat = bodenMaterial(this.u);
    const nah = new THREE.PlaneGeometry(700, 700, 280, 280); nah.rotateX(-Math.PI / 2); nah.translate(0, 0, -150);
    const fern = new THREE.PlaneGeometry(16000, 16000, 160, 160); fern.rotateX(-Math.PI / 2); fern.translate(0, 0, -5000);
    for (const [g, tief] of [[nah, 0], [fern, 1]]) {
      const p = g.getAttribute("position");
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        let y = hoehe(x, z);
        if (tief) { const innen = Math.abs(x) < 345 && z < 195 && z > -495; y = innen ? y - 3 : y; }
        p.setY(i, y);
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = schatten; this.szene.add(m);
      this.vertices += p.count;
    }
  }

  _baueZaunUndPodest(schatten) {
    const holz = new THREE.MeshStandardMaterial({ color: "#6E5A44", roughness: 0.9, flatShading: true });
    const holzD = new THREE.MeshStandardMaterial({ color: "#54442F", roughness: 0.9, flatShading: true });
    const draht = new THREE.MeshStandardMaterial({ color: "#8A8A84", roughness: 0.6, metalness: 0.3 });
    // Zaun um die Fläche: Pfosten alle 2,5 m, zwei Drähte
    const posten = [];
    const kante = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 2.5); for (let i = 0; i <= n; i++) posten.push([lerp(ax, bx, i / n), lerp(az, bz, i / n)]); };
    const { x0, x1, z0, z1 } = PLOT;
    kante(x0, z1, x1, z1); kante(x1, z1, x1, z0); kante(x1, z0, x0, z0); kante(x0, z0, x0, z1);
    const pg = new THREE.CylinderGeometry(0.05, 0.06, 1.3, 5); pg.translate(0, 0.62, 0);
    const pi = new THREE.InstancedMesh(pg, holzD, posten.length), m = new THREE.Matrix4();
    posten.forEach(([x, z], i) => { m.makeRotationY(hash(i, 3) * 3); m.setPosition(x, hoehe(x, z) - 0.05, z); pi.setMatrixAt(i, m); });
    pi.castShadow = schatten; this.szene.add(pi);
    const linien = [[x0, z1, x1, z1], [x1, z1, x1, z0], [x1, z0, x0, z0], [x0, z0, x0, z1]];
    for (const [ax, az, bx, bz] of linien) for (const y of [0.55, 1.05]) {
      const L = Math.hypot(bx - ax, bz - az), d = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, L, 3), draht);
      d.rotation.z = Math.PI / 2; d.rotation.y = -Math.atan2(bz - az, bx - ax); d.position.set((ax + bx) / 2, y, (az + bz) / 2); this.szene.add(d);
    }
    // Podest: Plattform 2,4 × 2,4 m in 4 m Höhe, vier Pfosten, Streben, Leiter
    const P = PODEST, gP = new THREE.Group(); gP.position.set(P.x, 0, P.z);
    const box = (w, h, d, x, y, z, mm = holz) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mm); b.position.set(x, y, z); b.castShadow = b.receiveShadow = schatten; gP.add(b); return b; };
    for (const [x, z] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) box(0.16, P.boden, 0.16, x, P.boden / 2, z, holzD);
    box(2.5, 0.12, 2.5, 0, P.boden - 0.06, 0);
    for (let i = 0; i < 9; i++) box(0.24, 0.02, 2.5, -1.12 + i * 0.28, P.boden + 0.01, 0, i % 2 ? holz : holzD);  // Bohlen
    for (const s of [-1, 1]) { const st = box(0.08, 3.2, 0.08, s * 1.1, 2.0, 0, holzD); st.rotation.x = s * 0.6; }
    for (let i = 0; i < 11; i++) box(0.5, 0.05, 0.05, -0.3, 0.35 * i + 0.2, 1.35, holzD);                         // Leiter hinten
    this.podest = gP; this.szene.add(gP);
  }

  _baueVegetation(schatten) {
    const u = this.u, R = (i, s, a, b) => lerp(a, b, hash(i, s));
    const { x0, x1, z0, z1 } = PLOT;
    const plotPunkt = (i, s) => [R(i, s, x0 + 0.4, x1 - 0.4), R(i, s + 1, z0 + 0.4, z1 - 0.4)];
    const nahPodest = (x, z, r) => Math.hypot(x - PODEST.x, z - PODEST.z) < r;
    // Weizen auf der Fläche (Reste, sät sich selbst aus) und Rand des Nachbarfelds
    this.weizen = this._inst(halm(), windMaterial({ side: THREE.DoubleSide, flatShading: false }, u, { staerke: 1.2 }), 7000, schatten, false);
    this.weizenP = Array.from({ length: 7000 }, (_, i) => { const [x, z] = plotPunkt(i, 11); return { x, z, h: R(i, 13, 0.8, 1.15), r: hash(i, 14), dreh: hash(i, 15) * 6.28 }; })
      .filter((p) => !nahPodest(p.x, p.z, 1.6));
    this.feldW = this._inst(halm(), windMaterial({ side: THREE.DoubleSide, flatShading: false }, u, { staerke: 1.2 }), 9000, false, false);
    this.feldP = Array.from({ length: 9000 }, (_, i) => {
      const links = hash(i, 21) < 0.35;
      const x = links ? R(i, 22, -70, -29) : R(i, 22, -80, 60), z = links ? R(i, 23, -50, 4) : R(i, 23, -55.5, -78);
      return { x, z, h: R(i, 24, 0.85, 1.1), dreh: hash(i, 25) * 6.28 };
    });
    // Kraut und Gras
    this.gras = this._inst(buschel(), windMaterial({ side: THREE.DoubleSide }, u, { staerke: 1.5 }), 9000, false, true);
    this.grasP = Array.from({ length: 9000 }, (_, i) => { const [x, z] = plotPunkt(i, 31); return { x, z, h: R(i, 33, 0.35, 0.8), r: hash(i, 34), dreh: hash(i, 35) * 6.28 }; })
      .filter((p) => !nahPodest(p.x, p.z, 1.3));
    this.disteln = this._inst(distel(), windMaterial({}, u, { staerke: 1 }), 700, false, true);
    this.distelP = Array.from({ length: 700 }, (_, i) => { const [x, z] = plotPunkt(i, 41); return { x, z, h: R(i, 43, 0.6, 1.3), r: hash(i, 44), dreh: hash(i, 45) * 6.28 }; });
    // Büsche: Brombeere (flach, breit) und Weißdorn (hoch); Startjahr und Endhöhe je Busch
    const busch = (n, seed, typ) => Array.from({ length: n }, (_, i) => {
      const [x, z] = plotPunkt(i, seed);
      const links = x < 0, frueh = hash(i, seed + 2);
      const S = 1887.5 + (typ === "dorn" ? 1 : 0) + 20 * frueh * frueh;
      return { x, z, S, H: typ === "dorn" ? R(i, seed + 3, 2.5, 5.5) : R(i, seed + 3, 0.8, 1.7), r: hash(i, seed + 4), dreh: hash(i, seed + 5) * 6.28, links, typ };
    }).filter((p) => !nahPodest(p.x, p.z, 2.2));
    this.brombeereP = busch(420, 51, "brombeere"); this.dornP = busch(260, 61, "dorn");
    this.brombeere = this._inst(klumpen(5, 3, { flach: 0.6, streu: 0.8 }), windMaterial({}, u, { staerke: 0.4 }), this.brombeereP.length, schatten, true);
    this.dorn = this._inst(klumpen(6, 7, { flach: 1 }), windMaterial({}, u, { staerke: 0.4 }), this.dornP.length, schatten, true);
    // Bäume: Esche, Bergahorn, Eiche (rechte Hälfte + Hecke rechts hinter dem Podest)
    const baeume = [];
    for (let i = 0; i < 520 && baeume.length < 240; i++) {
      let x, z, hecke = false;
      if (hash(i, 70) < 0.16) { x = R(i, 71, 2, 14); z = R(i, 72, -2.6, -12); } else { x = R(i, 71, 0.8, x1 - 0.6); z = R(i, 72, z0 + 1, z1 - 0.8); }
      if (nahPodest(x, z, 8.0) || x < 1) continue;
      if (baeume.some((b) => Math.hypot(b.x - x, b.z - z) < 2.3)) continue;
      const art = hash(i, 73) < 0.45 ? "esche" : hash(i, 73) < 0.86 ? "ahorn" : "eiche";
      const nah = Math.hypot(x - PODEST.x, z - PODEST.z) < 12;
      const S = hecke ? 1870 - 30 * hash(i, 74) : (nah ? 1904 + 9 * hash(i, 74) : 1891 + 22 * hash(i, 74) ** 1.3);
      baeume.push({ x, z, art, S, H: R(i, 75, 17, 25) * (art === "eiche" ? 0.9 : 1), r: hash(i, 76), dreh: hash(i, 77) * 6.28, hecke });
    }
    this.baumP = baeume;
    this.staemme = this._inst(stamm(), new THREE.MeshStandardMaterial({ color: "#8E887C", emissive: "#2A2622", roughness: 0.95, flatShading: true }), baeume.length, schatten, true);
    this.kronen = {};
    for (const [art, seed] of [["esche", 81], ["ahorn", 82], ["eiche", 83]]) {
      const liste = baeume.filter((b) => b.art === art);
      this.kronen[art] = { liste, mesh: this._inst(klumpen(art === "esche" ? 10 : 9, seed, { flach: art === "eiche" ? 0.75 : 1, streu: art === "esche" ? 0.75 : 0.6 }), windMaterial({}, u, { staerke: 0.15 }), liste.length, schatten, true) };
    }
  }

  _baueFerne(schatten) {
    // Hecken und Feldgehölze ringsum (statisch, Farbe folgt der Jahreszeit), Dorf mit Kirchturm auf dem Hügel
    const baum = merge([(() => { const g = new THREE.CylinderGeometry(0.25, 0.4, 2.5, 5); g.translate(0, 1.25, 0); return g; })(), (() => { const k = klumpen(4, 9); k.scale(2.6, 2.9, 2.6); k.translate(0, 4.8, 0); return k; })()]);
    const pos = [];
    const linie = (ax, az, bx, bz, abst, seed) => { const L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / abst); for (let i = 0; i < n; i++) { const f = (i + hash(i, seed)) / n; pos.push([lerp(ax, bx, f) + (hash(i, seed + 1) - 0.5) * 3, lerp(az, bz, f) + (hash(i, seed + 2) - 0.5) * 3, 0.7 + 0.7 * hash(i, seed + 3)]); } };
    linie(-300, WEIZEN.z0, 300, WEIZEN.z0, 7, 101);                 // Hecke hinter dem Weizenfeld
    linie(-300, 40, -300, WEIZEN.z0, 9, 102); linie(36, -50, 36, 60, 6, 103);  // links und rechts
    linie(36, -50, 300, -50, 8, 104);
    for (let k = 0; k < 26; k++) { // ferne Hecken im Flickenteppich
      const cx = (hash(k, 110) - 0.5) * 5000, cz = -600 - hash(k, 111) * 4000, a = hash(k, 112) * 3.14, L = 300 + 500 * hash(k, 113);
      linie(cx - Math.cos(a) * L, cz - Math.sin(a) * L, cx + Math.cos(a) * L, cz + Math.sin(a) * L, 14, 120 + k);
    }
    for (let k = 0; k < 14; k++) { // Feldgehölze
      const cx = (hash(k, 130) - 0.5) * 4000, cz = -500 - hash(k, 131) * 3500, R = 60 + 140 * hash(k, 132);
      for (let i = 0; i < 70; i++) { const a = hash(i, 140 + k) * 6.28, r = R * Math.sqrt(hash(i, 160 + k)); pos.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r, 0.9 + 0.9 * hash(i, 180 + k)]); }
    }
    this.fernMat = new THREE.MeshStandardMaterial({ color: "#4E6A30", roughness: 0.95, flatShading: true });
    const fi = new THREE.InstancedMesh(baum, this.fernMat, pos.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    pos.forEach(([x, z, sk], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(i, 190) * 6); s.setScalar(sk); p.set(x, hoehe(x, z) - 0.3, z); m.compose(p, q, s); fi.setMatrixAt(i, m); fi.setColorAt(i, this._cc(0.8 + 0.35 * hash(i, 191))); });
    fi.castShadow = false; fi.receiveShadow = false; this.szene.add(fi); this.fernBaeume = fi;
    // Dorf: Häuser mit Satteldach, Kirche mit Turm, Scheune am Feldrand
    const wand = new THREE.MeshStandardMaterial({ color: "#B7A58C", roughness: 0.9, flatShading: true }), dach = new THREE.MeshStandardMaterial({ color: "#7A4E3A", roughness: 0.85, flatShading: true });
    const haus = (x, z, w, d, h, r) => {
      const g = new THREE.Group(); g.position.set(x, hoehe(x, z), z); g.rotation.y = r;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wand); b.position.y = h / 2; g.add(b);
      const dd = new THREE.Mesh(new THREE.CylinderGeometry(0.01, w * 0.62, d * 1.02, 4, 1), dach); dd.rotation.x = Math.PI / 2; dd.rotation.y = Math.PI / 4; dd.scale.set(1, 1, 0.55); dd.position.y = h + w * 0.2; g.add(dd);
      this.szene.add(g);
    };
    const dorf = [-700, -1350];
    for (let i = 0; i < 36; i++) haus(dorf[0] + (hash(i, 200) - 0.5) * 420, dorf[1] + (hash(i, 201) - 0.5) * 260, 7 + 5 * hash(i, 202), 9 + 6 * hash(i, 203), 5 + 3 * hash(i, 204), hash(i, 205) * 0.6 - 0.3);
    const ki = new THREE.Group(); ki.position.set(dorf[0] + 40, hoehe(dorf[0] + 40, dorf[1] - 30), dorf[1] - 30);
    const turm = new THREE.Mesh(new THREE.BoxGeometry(6, 22, 6), wand); turm.position.y = 11; ki.add(turm);
    const spitze = new THREE.Mesh(new THREE.ConeGeometry(4.4, 14, 4), dach); spitze.position.y = 29; spitze.rotation.y = Math.PI / 4; ki.add(spitze);
    const schiff = new THREE.Mesh(new THREE.BoxGeometry(9, 9, 24), wand); schiff.position.set(0, 4.5, 15); ki.add(schiff);
    this.szene.add(ki);
    haus(48, -70, 12, 22, 7, 0.1); haus(62, -88, 8, 10, 5, 0.1);         // Hof rechts hinten
  }

  _baueTiere(schatten) {
    const g = schafGeo();
    this.schafW = new THREE.InstancedMesh(g.wolle, new THREE.MeshStandardMaterial({ color: "#D8D2C4", roughness: 1, flatShading: true }), 22);
    this.schafD = new THREE.InstancedMesh(g.dunkel, new THREE.MeshStandardMaterial({ color: "#2A2622", roughness: 1, flatShading: true }), 22);
    for (const m of [this.schafW, this.schafD]) { m.castShadow = schatten; m.frustumCulled = false; this.szene.add(m); }
    this.schafP = Array.from({ length: 22 }, (_, i) => ({ x: lerp(-19, -3, hash(i, 301)), z: lerp(-44, -6, hash(i, 302)), ph: hash(i, 303) * 6.28, v: 0.3 + 0.4 * hash(i, 304) }));
    const fell = new THREE.MeshStandardMaterial({ color: "#8A5A36", roughness: 0.95, flatShading: true });
    this.reh = new THREE.Group();
    const leib = new THREE.Mesh(rehGeo(), fell); leib.castShadow = schatten; this.reh.add(leib);
    this.rehBeine = [[0.38, 0.13], [0.38, -0.13], [-0.38, 0.13], [-0.38, -0.13]].map(([x, z]) => { const b = new THREE.Mesh(rehBein(), fell); b.position.set(x, 0.75, z); this.reh.add(b); return b; });
    this.reh.visible = false; this.szene.add(this.reh);
    // Eichelhäher / Vogel nah (eigener Flug), Flügel schlagen
    const vm = new THREE.MeshStandardMaterial({ color: "#9C8C80", roughness: 0.8, flatShading: true, side: THREE.DoubleSide });
    this.haeher = new THREE.Group();
    const koerper = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.34, 6), vm); koerper.rotation.x = Math.PI / 2; this.haeher.add(koerper);
    this.fluegel = [-1, 1].map((s) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.14), new THREE.MeshStandardMaterial({ color: "#3A5A8A", roughness: 0.7, side: THREE.DoubleSide })); f.geometry.translate(0.15, 0, 0); f.scale.x = s; this.haeher.add(f); return f; });
    this.haeher.visible = false; this.szene.add(this.haeher);
  }

  _baueMaschine(schatten) {
    const g = new THREE.Group();
    const rot = new THREE.MeshStandardMaterial({ color: "#8E2A22", roughness: 0.6, flatShading: true }), dunkel = new THREE.MeshStandardMaterial({ color: "#2A2A2A", roughness: 0.8 }), glas = new THREE.MeshStandardMaterial({ color: "#9EB2BC", roughness: 0.2, metalness: 0.3 });
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = schatten; g.add(m); return m; };
    add(new THREE.BoxGeometry(4.2, 2.4, 3.0), rot, 0, 2.2, 0);
    add(new THREE.BoxGeometry(1.6, 1.4, 1.6), glas, 1.2, 4.0, 0);
    add(new THREE.BoxGeometry(1.2, 1.0, 6.5), rot, 3.0, 1.0, 0);                    // Schneidwerk
    add(new THREE.CylinderGeometry(0.25, 0.25, 6.4, 8), dunkel, 3.3, 1.0, 0).rotation.x = Math.PI / 2;
    for (const [x, r] of [[0.9, 0.85], [-1.5, 0.55]]) for (const z of [-1.5, 1.5]) add(new THREE.CylinderGeometry(r, r, 0.5, 10), dunkel, x, r, z).rotation.x = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.15, 0.15, 3, 6), rot, -0.5, 3.6, -1.2).rotation.z = 1.0;   // Abtankrohr
    g.visible = false; this.drescher = g; this.szene.add(g);
  }

  _inst(geo, mat, n, schatten, empfangen) {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = schatten; m.receiveShadow = empfangen; m.frustumCulled = false;
    for (let i = 0; i < n; i++) m.setColorAt(i, this._cc(0.82 + 0.3 * hash(i, 999 + n)));
    this.szene.add(m); this.vertices += geo.getAttribute("position").count * n;
    return m;
  }
  _cc(v) { return new THREE.Color(v, v, v); }
  _setze(mesh, i, x, y, z, sx, sy, sz, dreh, neig = 0) {
    if (sx < 1e-3 || sy < 1e-3) { this._m.makeScale(0, 0, 0); mesh.setMatrixAt(i, this._m); return; }
    this._e.set(neig, dreh, neig * 0.5); this._q.setFromEuler(this._e); this._p.set(x, y, z); this._s.set(sx, sy, sz); this._m.compose(this._p, this._q, this._s); mesh.setMatrixAt(i, this._m);
  }

  /** Höhe eines Baums (für Szene: Kronendach, Lichtfleck) */
  baumHoehe(b, Y) { return WACHS.baum(Y, b.S, b.H); }
  /** Krone als Kugel {c, r} (volles Laub): nahe Bäume tragen die Krone hoch (Stamm frei bis über Augenhöhe) */
  krone(b, Y) {
    const h = this.baumHoehe(b, Y), nah = Math.hypot(b.x - PODEST.x, b.z - PODEST.z) < 11;
    const r = (nah ? 0.16 : 0.19 + 0.06 * b.r) * h * (b.art === "eiche" ? 1.15 : 1);
    return { c: [b.x, hoehe(b.x, b.z) + h * (nah ? 0.76 : 0.68), b.z], r, h };
  }

  setze(t, kamera, w) {
    const { Y, s, schnee = 0, wind = 0.5, ernteX = -9999, schafe = 0, reh = 0, rehPos = [0, -12], haeher = null, drescher = null } = w;
    const u = this.u; u.uZeit.value = t; u.uWindS.value = 0.4 + 1.2 * wind;
    const laub = SAISON.laub(s), kraut = WACHS.kraut(Y), wald = WACHS.wald(Y), rest = WACHS.weizenRest(Y), dist = WACHS.disteln(Y);
    const gerodet = smoothstep(1900, 1901.2, Y);           // linke Hälfte ab 1900 jährlich gerodet
    const schaf = smoothstep(1957, 1960, Y) * (1 - smoothstep(2000, 2003, Y));
    // Bodenfarben
    const gras = SAISON.gras(s, new THREE.Color()), kr = SAISON.kraut(s, new THREE.Color()), wz = SAISON.weizen(s, new THREE.Color());
    const rechtsC = new THREE.Color().copy(wz).lerp(kr, smoothstep(0, 0.7, kraut)).lerp(C("#4E4A2E"), 0.5 * smoothstep(1905, 1935, Y));
    const linksC = new THREE.Color().copy(wz).lerp(kr, smoothstep(0, 0.7, kraut)).lerp(gras, gerodet * (0.6 + 0.4 * schaf));
    u.uPlotL.value.copy(linksC); u.uPlotR.value.copy(rechtsC);
    u.uKahlL.value = 0.5 * (1 - kraut) * (1 - rest * 0.6) + 0.25 * (1 - smoothstep(0.1, 0.4, laub)) * (1 - gerodet * 0.6);
    u.uKahlR.value = 0.5 * (1 - kraut) * (1 - rest * 0.6);
    u.uFurche.value = 1 - smoothstep(1882.6, 1890, Y);
    u.uWald.value = wald; u.uSchnee.value = schnee;
    u.uWaldBoden.value.copy(C("#3E3A22")).lerp(C("#5A3E24"), smoothstep(0.55, 0.7, s) * (1 - smoothstep(0.85, 0.99, s))).lerp(C("#2E3E22"), 0.35); // Laub, Efeu
    u.uWiese.value.copy(gras);
    const nf = nachbarFeld(s); u.uNachbar.value.copy(nf.farbe); u.uStoppel.value.copy(nf.stoppel); u.uErnteX.value = ernteX;
    u.uFern1.value.copy(gras).multiplyScalar(0.95); u.uFern2.value.copy(nf.farbe).lerp(gras, 0.3); u.uFern3.value.copy(gras).lerp(C("#4E6234"), 0.5);
    // Weizen auf der Fläche (1882 ungeerntet: steht reif, legt sich im Herbst; danach dünne Selbstaussaat)
    const wH = SAISON.weizenH(s), alt = 1 - smoothstep(1882.9, 1883.5, Y), duenn = lerp(1, 0.75, smoothstep(1883, 1884, Y));
    this.weizen.material.emissive.copy(wz).multiplyScalar(0.28); this.weizen.material.color.copy(wz).lerp(C("#9A8A6A"), 0.5 * alt * smoothstep(0.6, 0.75, s));
    this.weizenP.forEach((p, i) => {
      const h = p.r < rest ? p.h * duenn * Math.max(wH, 0.7 * alt) : 0;
      const neig = (0.4 + 0.5 * p.r) * smoothstep(0.55, 0.72, s) * alt + 0.08 * p.r;
      this._setze(this.weizen, i, p.x, hoehe(p.x, p.z), p.z, 1, h, 1, p.dreh, neig);
    });
    this.weizen.instanceMatrix.needsUpdate = true;
    // Nachbarfeld (Halme am Rand)
    this.feldW.material.color.copy(nf.gold); this.feldW.material.emissive.copy(nf.gold).multiplyScalar(0.25);
    this.feldP.forEach((p, i) => {
      let h = nf.hoehe * p.h;
      if (drescher && p.x < ernteX && p.z < -60) h = Math.min(h, 0.12);
      this._setze(this.feldW, i, p.x, hoehe(p.x, p.z), p.z, 1.1, h, 1.1, p.dreh);
    });
    this.feldW.instanceMatrix.needsUpdate = true;
    // Gras/Kraut
    this.gras.material.color.copy(kr).lerp(gras, 0.5 * gerodet).lerp(C("#E6E8EA"), 0.6 * schnee); this.gras.material.emissive.copy(this.gras.material.color).multiplyScalar(0.18);
    this.grasP.forEach((p, i) => {
      const links = p.x < 0;
      let k = kraut * (p.r < 0.92 ? 1 : 0.5);
      if (!links) k *= 1 - 0.75 * wald * smoothstep(0.3, 0.7, hash(i, 37));
      const winter = 0.55 + 0.45 * smoothstep(0.02, 0.2, s) * (1 - smoothstep(0.62, 0.8, s));
      const h = p.h * k * winter * (links ? (1 - 0.35 * schaf) : 1);
      this._setze(this.gras, i, p.x, hoehe(p.x, p.z), p.z, 1.2 * k, h, 1.2 * k, p.dreh);
    });
    this.gras.instanceMatrix.needsUpdate = true;
    this.disteln.material.color.copy(kr).lerp(C("#8A4A9A"), 0.6 * SAISON.distel(s));
    this.distelP.forEach((p, i) => {
      const k = dist * (p.r < 0.8 ? 1 : 0) * (p.x < 0 ? 1 - gerodet : 1);
      this._setze(this.disteln, i, p.x, hoehe(p.x, p.z), p.z, k, p.h * k * (0.4 + 0.6 * SAISON.distel(s) + 0.2), k, p.dreh);
    });
    this.disteln.instanceMatrix.needsUpdate = true;
    // Büsche (links: ab 1900 jedes Jahr gerodet, im Sommer kurz nachgewachsen)
    const nach = smoothstep(0.05, 0.45, s) * (1 - smoothstep(0.55, 0.62, s));
    const busch = (mesh, liste, farbe, breit) => {
      mesh.material.color.copy(farbe).lerp(C("#E8EAEC"), 0.5 * schnee); mesh.material.emissive.copy(mesh.material.color).multiplyScalar(0.12);
      liste.forEach((p, i) => {
        let h = WACHS.busch(Y, p.S, p.H);
        if (p.links) h = h * (1 - gerodet) + gerodet * (1 - schaf * 0.7) * 0.45 * nach * (p.r < 0.6 ? 1 : 0) * smoothstep(0.2, 1, h > 0 ? 1 : 0);
        else h *= 1 - 0.45 * wald * (p.typ === "brombeere" ? 1 : 0.5) * smoothstep(0.4, 0.8, p.r);
        const bl = p.typ === "dorn" ? lerp(0.55, 1, laub) : lerp(0.75, 1, laub);
        this._setze(mesh, i, p.x, hoehe(p.x, p.z) + h * 0.45, p.z, h * breit * bl, h * 0.55 * bl, h * breit * bl, p.dreh);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    busch(this.brombeere, this.brombeereP, SAISON.brombeere(s, new THREE.Color()), 1.15);
    busch(this.dorn, this.dornP, SAISON.dorn(s, new THREE.Color()), 0.5);
    // Bäume
    this.baumP.forEach((b, i) => {
      const k = this.krone(b, Y), d = 0.016 * k.h + 0.04;
      this._setze(this.staemme, i, b.x, hoehe(b.x, b.z) - 0.1, b.z, d, (k.c[1] - hoehe(b.x, b.z)) + k.r * 0.3, d, b.dreh);
    });
    this.staemme.instanceMatrix.needsUpdate = true;
    for (const art of ["esche", "ahorn", "eiche"]) {
      const K = this.kronen[art], f = SAISON[art](s, new THREE.Color());
      const lb = art === "eiche" ? Math.max(laub, 0.35 * smoothstep(0.6, 0.7, s) * (1 - smoothstep(0.85, 0.98, s))) : laub;   // Eiche hält Laub länger
      K.mesh.material.color.copy(f).lerp(C("#E8EAEC"), 0.55 * schnee * (1 - lb));
      K.mesh.material.emissive.copy(K.mesh.material.color).multiplyScalar(0.3 * lb + 0.06);
      K.liste.forEach((b, i) => {
        const k = this.krone(b, Y);
        if (k.h < 0.4) { this._setze(K.mesh, i, 0, 0, 0, 0, 0, 0, 0); return; }
        const sk = k.r * lerp(0.62, 1, lb);
        this._setze(K.mesh, i, k.c[0], k.c[1], k.c[2], sk, sk * (art === "esche" ? 1.0 : 0.9), sk, b.dreh);
      });
      K.mesh.instanceMatrix.needsUpdate = true;
    }
    this.fernMat.color.copy(SAISON.ahorn(s, new THREE.Color())).lerp(C("#3E5A2A"), 0.45).lerp(C("#D8DCE0"), 0.4 * schnee);
    // Schafe
    const sch = schafe * schaf;
    this.schafP.forEach((p, i) => {
      const k = sch > 0.02 && hash(i, 310) < 0.4 + 0.6 * sch ? 1 : 0;
      const x = p.x + 1.5 * Math.sin(t * 0.21 * p.v + p.ph), z = p.z + 1.2 * Math.cos(t * 0.17 * p.v + p.ph * 1.3);
      const dreh = Math.atan2(Math.cos(t * 0.21 * p.v + p.ph), -Math.sin(t * 0.17 * p.v + p.ph * 1.3) * 1.2) + Math.PI / 2;
      for (const m of [this.schafW, this.schafD]) this._setze(m, i, x, hoehe(x, z), z, k, k, k, dreh);
    });
    this.schafW.instanceMatrix.needsUpdate = true; this.schafD.instanceMatrix.needsUpdate = true;
    // Reh
    this.reh.visible = reh > 0.001;
    if (this.reh.visible) {
      const [x, z, dreh, gehen, kopf] = rehPos;
      this.reh.position.set(x, hoehe(x, z), z); this.reh.rotation.y = dreh; this.reh.scale.setScalar(1);
      this.rehBeine.forEach((b, i) => { b.rotation.z = gehen * 0.45 * Math.sin(t * 6.5 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)); });
      this.reh.children[0].rotation.z = -kopf * 0.25;
    }
    // Vogel nah
    this.haeher.visible = !!haeher;
    if (haeher) { this.haeher.position.set(...haeher.p); this.haeher.rotation.y = haeher.dreh; const f = Math.sin(t * 28) * 0.9; this.fluegel[0].rotation.z = f; this.fluegel[1].rotation.z = -f; this.haeher.scale.setScalar(1.6); }
    // Mähdrescher
    this.drescher.visible = !!drescher;
    if (drescher) { const [x, z] = drescher; this.drescher.position.set(x, hoehe(x, z), z); this.drescher.rotation.y = 0; }
  }
}
