// Grundwelt „Tropenstrand → freigelegter Meeresboden“ (Account 2 @stelldirvor.pov, Weltenkatalog „Meer und Küste“, .claude/skills/stelldirvor-video/themen-und-plan.md §2)
// Erstbau 04.11.2026 („Was wäre, wenn sich die Erde immer langsamer drehen würde?“, Pazifikküste bei Pedernales, Ecuador). NUR für den Baukasten Lunar-POV.
//
// Inhalt: Holz-Rettungsturm am Strand (Standpunkt, Auge 5,4 m), heller Sandstrand mit Palmen, Strandgras, Treibholz und zwei Fischerbooten, dichter Tropenwald
// als Hinterland, Landzunge links, flaches Schelf mit Sandbänken, Rinnen und Riffen (erst unter Wasser, später freigelegt), Seestapel vor der Küste, Brandung mit
// Schaumbändern, durchsichtiges Flachwasser (Tiefe aus Höhentextur), Priel-Tümpel, Seevögel (über Voegel), Strandbewohner.
// Der Meeresspiegel (pegel, m) fällt; das Gelände färbt sich nach der Zeit seit dem Trockenfallen (nass-dunkel → trocknend → helle Salzkruste mit Rissen).
//
// Steuerung je Bild (alles Funktion von t, kein Zustand):
//   const welt = new Tropenstrand(szene, { schatten: true });
//   welt.setze(t, kamera, { pegel, pegelV1 (= pegel(t − 4)), pegelV2 (= pegel(t − 12)), sonne [x,y,z], sonnenFarbe, himmelFarbe, wasserFarbe, wind 0..1,
//                           lichtwelle: { r, a }, tuempel 0..1 })
// Koordinaten: Turm bei (0, 0), Blick nach −z = Westen (Pazifik), +x = Norden. Strand bei z ≈ 0…−30, Wasserlinie bei z ≈ −30 (pegel 0).
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { GLSL_NOISE as GLSL_NOISE0, buschel, klumpen, merge, windMaterial } from "./welt_feld_wald.js";
// Hash ohne sin(): stabil auch bei großen Koordinaten (die sin-Variante bildet bei |z| > 100 Streifen)
const GLSL_NOISE = GLSL_NOISE0.replace(/float nH\(vec2 p\)[^\n]*\n/, "float nH(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }\n");

const fr = (x) => x - Math.floor(x);
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= 0.5; } return s; }
const C = (h) => new THREE.Color(h);

export const TURM = { x: 0, z: 0, boden: 0, plattform: 0, auge: 0 };   // Höhen werden unten aus dem Gelände gesetzt
// Querprofil: [Abstand d = −z vom Turm seewärts, Höhe]; negatives d = Hinterland
const KNOTEN = [[-400, 14], [-150, 5], [-60, 2.6], [-10, 1.3], [0, 0.95], [30, 0], [60, -0.9], [130, -2], [250, -3.7], [400, -5.6], [800, -10.6], [1400, -16.6], [2200, -24.6], [3200, -34.6], [4500, -47.6], [5500, -57.6], [7000, -80], [12000, -120], [30000, -200]];
function profil(d) {
  if (d <= KNOTEN[0][0]) return KNOTEN[0][1];
  for (let i = 1; i < KNOTEN.length; i++) if (d <= KNOTEN[i][0]) { const a = KNOTEN[i - 1], b = KNOTEN[i]; return lerp(a[1], b[1], (d - a[0]) / (b[0] - a[0])); }
  return KNOTEN[KNOTEN.length - 1][1];
}
const BANKC = [330, 640, 1050], BANKW = [45, 60, 85], BANKA = [1.9, 2.5, 3.2];
export function hoehe(x, z) {
  const d0 = -z;
  const d = d0 + (22 * Math.sin(x * 0.012 - 1.2) + 12 * Math.sin(x * 0.031 - 0.4)) * smoothstep(-20, 60, d0) * (1 - smoothstep(300, 800, d0));
  let y = profil(d);
  const see = smoothstep(20, 90, d0);
  for (let k = 0; k < 3; k++) {
    const luecke = smoothstep(0.12, 0.4, vn(x * 0.011 + k * 7.3, k * 3.1));
    y += BANKA[k] * Math.exp(-(((d - BANKC[k] - 14 * Math.sin(x * 0.02 + k)) / BANKW[k]) ** 2)) * (0.55 + 0.45 * vn(x * 0.03 + k, 2)) * luecke;
  }
  for (let k = 0; k < 5; k++) {
    const xc = -170 + 85 * k + 28 * Math.sin(d * 0.009 + k * 1.7);
    y -= (0.5 + 0.9 * hash(k, 5)) * Math.exp(-(((x - xc) / 6.5) ** 2)) * smoothstep(60, 200, d0) * (1 - smoothstep(900, 1300, d0));
  }
  y += see * (0.55 * (fbm(x * 0.045, z * 0.045, 3) - 0.5) + 0.05 * (vn(x * 0.15, z * 0.15) - 0.5)) * (1 - smoothstep(1500, 3200, d0));
  y += see * 0.5 * (fbm(x * 0.004 + 9, z * 0.004, 3) - 0.5) * smoothstep(1500, 3000, d0);
  const land = smoothstep(-60, -300, d0);
  y += land * 16 * fbm(x * 0.007 + 3, z * 0.007, 3) + smoothstep(-5, -60, d0) * 1.2 * (fbm(x * 0.03, z * 0.03, 3) - 0.4);
  y += 34 * Math.exp(-(((x + 720) / 200) ** 2)) * (1 - smoothstep(500, 1100, d0)) * smoothstep(-500, -200, d0) * (0.8 + 0.4 * vn(x * 0.02, z * 0.02));
  y += 18 * Math.exp(-(((x - 900) / 260) ** 2)) * (1 - smoothstep(150, 700, d0)) * smoothstep(-500, -150, d0);
  return y;
}

TURM.boden = hoehe(0, 0); TURM.plattform = TURM.boden + 2.85; TURM.auge = TURM.plattform + 1.6;

// ------------------------------------------------------------------------------------------------ Höhentexturen für die Wassertiefe
function hoehenTextur(x0, z0, sx, sz, w, h) {
  const a = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) a[j * w + i] = hoehe(x0 + (i + 0.5) / w * sx, z0 + (j + 0.5) / h * sz);
  const t = new THREE.DataTexture(a, w, h, THREE.RedFormat, THREE.FloatType);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
const GLSL_TIEFE = /* glsl */ `
uniform sampler2D tNah, tFern; uniform vec4 bNah, bFern; uniform vec2 gNah, gFern;
float lies(sampler2D t, vec4 b, vec2 g, vec2 p, out float ok) {
  vec2 uv = (p - b.xy) / b.zw; ok = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  vec2 q = clamp(uv, 0.0, 1.0) * g - 0.5; vec2 i = floor(q), f = fract(q); vec2 s = 1.0 / g;
  float a = texture2D(t, (i + vec2(0.5, 0.5)) * s).r, c = texture2D(t, (i + vec2(1.5, 0.5)) * s).r;
  float d = texture2D(t, (i + vec2(0.5, 1.5)) * s).r, e = texture2D(t, (i + vec2(1.5, 1.5)) * s).r;
  return mix(mix(a, c, f.x), mix(d, e, f.x), f.y);
}
float hoeheGL(vec2 p) { float ok; float h = lies(tNah, bNah, gNah, p, ok); if (ok > 0.5) return h; h = lies(tFern, bFern, gFern, p, ok); return ok > 0.5 ? h : -300.0; }
`;

// ------------------------------------------------------------------------------------------------ Gelände
function bodenMaterial(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.95, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vNW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvNW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vNW;
uniform float uPegel, uPV1, uPV2, uZeit, uLWr, uLWa; uniform vec2 uCam;
${GLSL_NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  vec3 W = vNW; vec2 p = W.xz; float hg = W.y; float d0 = -W.z;
  vec3 Nw = normalize(cross(dFdx(W), dFdy(W))); if (Nw.y < 0.0) Nw = -Nw;
  float n1 = nN(p * 0.3), n2 = nN(p * 1.9), n3 = nF(p * 0.04), n4 = nN(p * 7.0);
  float rip = 0.5;
  vec3 sand = mix(vec3(0.46, 0.37, 0.25), vec3(0.74, 0.64, 0.48), 0.3 + 0.7 * n3) * (0.9 + 0.12 * n2 + 0.05 * n4) * (0.94 + 0.08 * rip);
  float land = smoothstep(1.15, 2.3, hg + 0.7 * (n1 - 0.5));
  vec3 veg = mix(vec3(0.17, 0.28, 0.09), vec3(0.30, 0.36, 0.13), n1) * (0.8 + 0.35 * n2);
  veg = mix(veg, vec3(0.09, 0.17, 0.07), smoothstep(5.0, 28.0, hg));
  vec3 c = mix(sand, veg, land);
  float fels = smoothstep(0.8, 0.55, Nw.y) * smoothstep(3.0, 9.0, hg);
  c = mix(c, vec3(0.36, 0.31, 0.26) * (0.8 + 0.4 * n2), fels);
  // Meeresboden: Sediment, Riffe mit Algen, Sandbänke
  float seeM = smoothstep(0.7, -0.3, hg) * smoothstep(20.0, 60.0, d0);
  float riff = smoothstep(0.42, 0.58, nF(p * 0.012 + 7.0) + 0.2 * (n1 - 0.5));
  vec3 alge = mix(vec3(0.12, 0.17, 0.08), vec3(0.30, 0.20, 0.08), nN(p * 0.7)) * (0.7 + 0.5 * n2);
  vec3 sed = mix(mix(vec3(0.36, 0.31, 0.24), vec3(0.58, 0.48, 0.34), n3), vec3(0.50, 0.32, 0.19), smoothstep(0.45, 0.7, nF(p * 0.02 + 21.0)) * 0.7) * (0.85 + 0.3 * n2) * (0.94 + 0.08 * rip);
  vec3 boden = mix(sed, alge, riff * 0.85);
  c = mix(c, boden, seeM);
  // Alter seit dem Trockenfallen
  float sub = smoothstep(uPegel + 0.12, uPegel - 0.18, hg);
  float f1 = smoothstep(uPV1 - 0.2, uPV1 + 0.2, hg);
  float f2 = smoothstep(uPV2 - 0.25, uPV2 + 0.25, hg);
  float frisch = (1.0 - sub) * (1.0 - f1);
  float wetNah = (1.0 - sub) * smoothstep(uPegel + 0.9, uPegel + 0.1, hg);
  float wet = max(frisch, wetNah * 0.85);
  float trocken = f2 * seeM * (1.0 - sub);
  vec3 zl = nZelle(p * 0.45);
  float riss = smoothstep(0.0, 0.07, zl.y - zl.x);
  vec3 salz = vec3(0.80, 0.76, 0.64) * (0.88 + 0.18 * n2) * mix(0.88, 1.0, riss) * (0.92 + 0.1 * zl.z);
  c = mix(c, mix(c, vec3(0.74, 0.7, 0.6), 0.5), (1.0 - f2) * f1 * seeM * (1.0 - sub) * 0.7);
  c = mix(c, salz, trocken * (1.0 - riff * 0.7) * 0.62 * smoothstep(0.4, 0.62, nF(p * 0.035 + 3.0) + 0.2 * (n1 - 0.5)));
  c = mix(c, c * 0.55, wet);
  float depth = max(uPegel - hg, 0.0);
  c = mix(c, c * vec3(0.55, 0.88, 0.88), (1.0 - exp(-depth * 0.2)) * sub);
  c *= 1.0 - 0.25 * smoothstep(0.6, 1.8, depth) * sub;
  diffuseColor.rgb = c;`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
  roughnessFactor = mix(0.95, 0.3, clamp(wet + sub * 0.5, 0.0, 1.0));`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
  {
    float amp = (0.12 + 0.25 * seeM) * (1.0 - fels);
    float e = 0.3;
    float gx = nN((p + vec2(e, 0.0)) * 1.4) - nN((p - vec2(e, 0.0)) * 1.4) + 0.5 * (nN((p + vec2(e, 0.0)) * 5.0) - nN((p - vec2(e, 0.0)) * 5.0));
    float gz = nN((p + vec2(0.0, e)) * 1.4) - nN((p - vec2(0.0, e)) * 1.4) + 0.5 * (nN((p + vec2(0.0, e)) * 5.0) - nN((p - vec2(0.0, e)) * 5.0));
    normal = normalize(normal - (viewMatrix * vec4(gx, 0.0, gz, 0.0)).xyz * amp * 0.9);
  }`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  { float lw = uLWa * smoothstep(60.0, 0.0, abs(length(p - uCam) - uLWr)); totalEmissiveRadiance += vec3(1.0, 0.72, 0.4) * lw * dot(diffuseColor.rgb, vec3(0.33)) * 1.5; }`);
  };
  return m;
}

// ------------------------------------------------------------------------------------------------ Wasser
const WASSER_V = /* glsl */ `
varying vec3 vW;
#include <fog_pars_vertex>
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const WASSER_F = /* glsl */ `
uniform vec3 tief, flach, himmel, sonneR, sonneF; uniform float zeit, glanzS, pegel, fadeX, fleck;
varying vec3 vW;
#include <fog_pars_fragment>
${GLSL_NOISE}
${GLSL_TIEFE}
void main() {
  vec3 V = normalize(cameraPosition - vW); float dist = length(cameraPosition.xz - vW.xz);
  vec2 g = (vec2(nN(vW.xz * 0.45 + zeit * 0.5), nN(vW.zx * 0.41 - zeit * 0.43)) - 0.5) * 0.42 / (1.0 + dist / 160.0);
  g += (vec2(nN(vW.xz * 0.07 + zeit * 0.12), nN(vW.zx * 0.06 - zeit * 0.1)) - 0.5) * 0.14;
  g += (vec2(nN(vW.xz * 2.2 + zeit * 0.9), nN(vW.zx * 2.0 - zeit * 0.8)) - 0.5) * 0.10 / (1.0 + dist / 25.0);
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float h = hoeheGL(vW.xz);
  float tiefe = max(vW.y - h, 0.0);
  float fres = 0.025 + 0.975 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N); float s = max(dot(R, normalize(sonneR)), 0.0);
  float k = 1.0 - exp(-tiefe * 0.16);
  vec3 body = mix(flach, tief, smoothstep(0.0, 1.0, k * 1.4));
  vec3 col = mix(body, himmel, fres * 0.68);
  col += sonneF * (pow(s, 280.0) * 7.0 + pow(s, 28.0) * 0.3) * glanzS;
  // Brandung: Schaumbänder wandern zum Strand, nahe der Wasserlinie Schaumsaum
  float n5 = nF(vW.xz * 0.6 + zeit * 0.05);
  float band = 0.5 + 0.5 * sin(tiefe * 1.9 + zeit * 1.25 + n5 * 3.5);
  float brand = smoothstep(2.6, 0.5, tiefe) * smoothstep(0.0, 0.25, tiefe) * smoothstep(0.55, 0.95, band) * smoothstep(0.25, 0.7, n5);
  float saum = smoothstep(0.35, 0.02, tiefe) * (0.55 + 0.45 * nN(vW.xz * 3.0 + zeit * 0.8));
  float schaum = clamp(brand * 0.85 + saum, 0.0, 1.0);
  col = mix(col, vec3(0.96, 0.97, 0.95), schaum);
  float a = clamp(0.1 + 0.9 * smoothstep(0.0, 0.9, k * 1.8) + fres * 0.45, 0.0, 0.985);
  a = max(a, schaum * 0.95);
  a *= smoothstep(0.0, 0.05, tiefe) * smoothstep(fadeX, fadeX * 0.6, abs(vW.x)) * mix(1.0, smoothstep(0.3, 0.55, nF(vW.xz * 0.04 + 5.0)), fleck);
  gl_FragColor = vec4(col, a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
}`;

// ------------------------------------------------------------------------------------------------ Geometrien
function stammGeo() {
  const seg = 10, rad = 7, pos = [], col = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const s = i / seg, cx = 0.10 * s * s, cy = s, r = 0.034 * (1 - 0.42 * s) * (1 + 0.05 * Math.sin(s * 70)) + (i === 0 ? 0.01 : 0);
    for (let j = 0; j < rad; j++) { const a = j / rad * 6.2832; pos.push(cx + Math.cos(a) * r, cy, Math.sin(a) * r); const b = 0.75 + 0.25 * Math.sin(s * 70) * 0.5 + 0.2 * (j % 2); col.push(b, b, b); }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a = i * rad + j, b = i * rad + (j + 1) % rad, c = a + rad, d = b + rad; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function kroneGeo() {
  const pos = [], col = [], idx = [], n = 13, L = 0.44, st = 16;
  for (let f = 0; f < n; f++) {
    const a = f * 2.39996 + 0.3, hang = 0.35 + 0.6 * fr(f * 0.618), len = L * (0.85 + 0.3 * fr(f * 0.37 + 0.1)), br = 0.075 * (0.85 + 0.3 * fr(f * 0.73));
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, base = pos.length / 3;
    for (let j = 0; j <= st; j++) {
      const u = j / st, h = len * u * Math.cos(0.5), y = len * (0.5 * u * (1 - 0.35 * hang) - hang * 0.9 * u * u) + 0.012, w = br * Math.sin(Math.PI * Math.pow(u, 0.75)) * (j % 2 ? 0.4 : 1) + 0.002;
      const x0 = dx * h, z0 = dz * h, bright = 0.45 + 0.65 * u * (0.7 + 0.3 * fr(f * 0.9));
      pos.push(x0 - px * w, y, z0 - pz * w, x0 + px * w, y, z0 + pz * w); col.push(bright, bright, bright * 0.92, bright, bright, bright * 0.92);
    }
    for (let j = 0; j < st; j++) { const a2 = base + j * 2; idx.push(a2, a2 + 1, a2 + 2, a2 + 1, a2 + 3, a2 + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function felsGeo(seed, det = 2) {
  const g = new THREE.IcosahedronGeometry(1, det), p = g.getAttribute("position"), c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = 1 + 0.32 * (vn(x * 2.2 + seed, z * 2.2 + y * 1.3) - 0.5);
    p.setXYZ(i, x * f, y * f, z * f);
    const yy = y * f, alg = smoothstep(0.1, -0.7, yy), b = 0.55 + 0.45 * smoothstep(-0.6, 0.9, yy);
    c[i * 3] = b * (1 - 0.35 * alg); c[i * 3 + 1] = b * (1 - 0.05 * alg + 0.1 * alg); c[i * 3 + 2] = b * (1 - 0.45 * alg);
  }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3)); g.computeVertexNormals(); return g;
}
function bootGeo() {
  const rumpf = new THREE.IcosahedronGeometry(1, 2); rumpf.scale(2.6, 0.42, 0.62); rumpf.translate(0, 0.28, 0);
  const bug = new THREE.ConeGeometry(0.34, 1.0, 6); bug.rotateZ(-Math.PI / 2); bug.translate(2.75, 0.42, 0);
  const bank = new THREE.BoxGeometry(0.1, 0.06, 1.0); bank.translate(0.3, 0.62, 0);
  const bank2 = bank.clone(); bank2.translate(-1.1, 0, 0);
  const motor = new THREE.BoxGeometry(0.25, 0.55, 0.22); motor.translate(-2.5, 0.65, 0);
  return merge([rumpf, bug, bank, bank2, motor]);
}
function holzGeo(len) { const g = new THREE.CylinderGeometry(0.16, 0.2, len, 6); g.rotateZ(Math.PI / 2); g.translate(0, 0.16, 0); return g; }

export class Tropenstrand {
  constructor(szene, { schatten = true } = {}) {
    this.szene = szene; this.vertices = 0;
    this.u = { uPegel: { value: 0 }, uPV1: { value: 0 }, uPV2: { value: 0 }, uZeit: { value: 0 }, uWindS: { value: 1 }, uLWr: { value: 0 }, uLWa: { value: 0 }, uCam: { value: new THREE.Vector2() } };
    const mat = bodenMaterial(this.u);
    const gitter = (breite, tiefe, nx, nz, cx, cz, dy) => {
      const g = new THREE.PlaneGeometry(breite, tiefe, nx, nz); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
      const p = g.getAttribute("position"); for (let i = 0; i < p.count; i++) p.setY(i, hoehe(p.getX(i), p.getZ(i)) + dy(p.getX(i), p.getZ(i)));
      g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.receiveShadow = schatten; szene.add(m); this.vertices += p.count; return m;
    };
    const inA = (x, z) => Math.abs(x) < 300 && z > -500 && z < 120, inB = (x, z) => Math.abs(x) < 1500 && z > -3000 && z < 300;
    gitter(600, 620, 400, 413, 0, -190, () => 0);
    gitter(3000, 3300, 250, 275, 0, -1350, (x, z) => (inA(x, z) ? -0.35 : 0));
    gitter(40000, 36000, 200, 180, 0, -14000, (x, z) => (inB(x, z) ? -3 : 0));
    // Höhentexturen für die Wassertiefe
    this.tNah = hoehenTextur(-300, -1500, 600, 1600, 750, 800); this.tFern = hoehenTextur(-5000, -9000, 10000, 9600, 800, 768);
    this.wu = { tief: { value: C("#0A4660") }, flach: { value: C("#2FB0A0") }, himmel: { value: C("#9FB4C6") }, sonneR: { value: new THREE.Vector3(0, 0.4, -1) }, sonneF: { value: C("#FFF0D8") }, zeit: { value: 0 }, glanzS: { value: 1 }, pegel: { value: 0 },
      tNah: { value: this.tNah }, tFern: { value: this.tFern }, bNah: { value: new THREE.Vector4(-300, -1500, 600, 1600) }, bFern: { value: new THREE.Vector4(-5000, -9000, 10000, 9600) }, gNah: { value: new THREE.Vector2(750, 800) }, gFern: { value: new THREE.Vector2(800, 768) } };
    const wm = new THREE.ShaderMaterial({ vertexShader: WASSER_V, fragmentShader: WASSER_F, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, this.wu]), fog: true, transparent: true, depthWrite: false });
    Object.assign(wm.uniforms, this.wu); wm.uniforms.fadeX = { value: 1e7 }; wm.uniforms.fleck = { value: 0 };
    this.wasser = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000, 1, 1).rotateX(-Math.PI / 2).translate(0, 0, -29000), wm); this.wasser.renderOrder = 5; this.wasser.frustumCulled = false; szene.add(this.wasser);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._e = new THREE.Euler();

    // Rettungsturm
    const holz = new THREE.MeshStandardMaterial({ color: "#B9A58A", roughness: 0.9, flatShading: true }), rot = new THREE.MeshStandardMaterial({ color: "#B5412F", roughness: 0.85, flatShading: true });
    const turm = new THREE.Group(); const box = (w, h, d, x, y, z, m = holz) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; turm.add(b); return b; };
    const H = TURM.plattform - TURM.boden;
    for (const [x, z] of [[-1.3, -0.9], [1.3, -0.9], [-1.3, 1.3], [1.3, 1.3]]) box(0.2, H + 0.4, 0.2, x, H / 2 - 0.1, z);
    for (const y of [0.9, 1.9]) { box(2.8, 0.08, 0.08, 0, y, -0.9); box(2.8, 0.08, 0.08, 0, y, 1.3); box(0.08, 0.08, 2.2, -1.3, y, 0.2); box(0.08, 0.08, 2.2, 1.3, y, 0.2); }
    box(3.2, 0.14, 2.4, 0, H, 0.2, rot);
    for (const [x, z, w, d, h] of [[0, -1.0, 3.2, 0.08, 0.7], [-1.55, 0.2, 0.08, 2.4, 0.9], [1.55, 0.2, 0.08, 2.4, 0.9], [0, 1.4, 3.2, 0.08, 0.9]]) box(w, h, d, x, H + 0.07 + h / 2, z, rot);
    for (let i = 0; i < 7; i++) box(0.9, 0.06, 0.12, 0, 0.35 + i * 0.4, 1.9 - i * 0.07).rotation.x = 0.3;   // Leiter hinten
    turm.position.set(TURM.x, TURM.boden, TURM.z); szene.add(turm); this.turm = turm;

    // Palmen: Strand (nah) und Hinterland
    const R = (i, s, a, b) => lerp(a, b, hash(i, s));
    this.palmen = [[-8.5, -13, 8.5, 0.4], [9.0, -18, 9.2, 2.1]].map(([x, z, s, d]) => ({ x, z, y: hoehe(x, z), s, d }));
    for (let i = 0; this.palmen.length < 46 && i < 4000; i++) {
      const x = i % 5 === 0 ? R(i, 1, -70, 70) : (hash(i, 2) < 0.5 ? -1 : 1) * R(i, 3, 7, 130), z = R(i, 4, -24, 14);
      if (Math.hypot(x, z + 3) < 7 || hoehe(x, z) < 0.35) continue;
      this.palmen.push({ x, z, y: hoehe(x, z), s: R(i, 5, 6.5, 10.5), d: hash(i, 6) * 6.283 });
    }
    for (let i = 0; this.palmen.length < 190 && i < 6000; i++) {
      const x = R(i, 11, -260, 260), z = R(i, 12, 10, 150); if (hoehe(x, z) < 1) continue;
      this.palmen.push({ x, z, y: hoehe(x, z), s: R(i, 13, 7, 12), d: hash(i, 14) * 6.283 });
    }
    const n = this.palmen.length;
    this.stamm = this._inst(stammGeo(), new THREE.MeshStandardMaterial({ color: "#B09470", roughness: 0.95, vertexColors: true, flatShading: true }), n, schatten, true);
    const km = new THREE.MeshStandardMaterial({ color: "#4F8A32", roughness: 0.8, vertexColors: true, side: THREE.DoubleSide, flatShading: true });
    km.onBeforeCompile = (sh) => {
      sh.uniforms.uZeit = this.u.uZeit; sh.uniforms.uWindS = this.u.uWindS;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uZeit, uWindS;").replace("#include <begin_vertex>", `#include <begin_vertex>
  { float k = length(position.xz) * 2.4; vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float ph = wp.x * 0.21 + wp.z * 0.17;
    transformed.y += (sin(uZeit * 1.9 + ph + k * 3.0) * 0.022 + sin(uZeit * 3.3 + ph * 2.0 + k * 5.0) * 0.012) * k * (0.5 + uWindS);
    transformed.x += sin(uZeit * 1.4 + ph) * 0.02 * k * uWindS; }`);
    };
    this.krone = this._inst(kroneGeo(), km, n, schatten, true);
    for (let i = 0; i < n; i++) {
      const p = this.palmen[i], c = Math.cos(p.d), s = Math.sin(p.d);
      this._setze(this.stamm, i, p.x, p.y - 0.1, p.z, p.s, p.s, p.s, p.d);
      this._setze(this.krone, i, p.x + 0.10 * p.s * c, p.y - 0.1 + p.s, p.z - 0.10 * p.s * s, p.s, p.s, p.s, p.d + 0.4 * i);
    }
    this.stamm.instanceMatrix.needsUpdate = true; this.krone.instanceMatrix.needsUpdate = true;

    // Tropenwald im Hinterland und auf den Landzungen
    const bm = new THREE.CylinderGeometry(0.28, 0.5, 1, 5); bm.translate(0, 0.5, 0);
    this.baeume = []; for (let i = 0; this.baeume.length < 260 && i < 9000; i++) {
      const x = R(i, 21, -900, 1200), z = R(i, 22, 40, 600), nah = hash(i, 23) < 0.6; const xx = nah ? R(i, 24, -300, 300) : x, zz = nah ? R(i, 25, 30, 260) : z;
      const y = hoehe(xx, zz); if (y < 1.4) continue; this.baeume.push({ x: xx, z: zz, y, s: R(i, 26, 7, 16), d: hash(i, 27) * 6.28 });
    }
    for (let i = 0; this.baeume.length < 360 && i < 9000; i++) { const x = R(i, 31, -1100, -380), z = R(i, 32, -700, 200), y = hoehe(x, z); if (y < 3) continue; this.baeume.push({ x, z, y, s: R(i, 33, 8, 16), d: hash(i, 34) * 6.28 }); }
    const nb = this.baeume.length;
    this.bstamm = this._inst(bm, new THREE.MeshStandardMaterial({ color: "#4A3A2A", roughness: 1, flatShading: true }), nb, false, false);
    this.bkrone = this._inst(klumpen(9, 77, { flach: 0.7, streu: 0.6 }), windMaterial({}, this.u, { staerke: 0.25 }), nb, schatten, true);
    this.bkrone.material.color.set("#2F5A24");
    this.baeume.forEach((b, i) => { this._setze(this.bstamm, i, b.x, b.y - 0.2, b.z, 0.8, b.s * 0.6, 0.8, b.d); this._setze(this.bkrone, i, b.x, b.y + b.s * 0.55, b.z, b.s * 0.55, b.s * 0.42, b.s * 0.55, b.d); });
    this.bstamm.instanceMatrix.needsUpdate = true; this.bkrone.instanceMatrix.needsUpdate = true;

    // Strandgras, Büsche, Treibholz
    this.grasP = []; for (let i = 0; this.grasP.length < 7000 && i < 30000; i++) { const x = R(i, 41, -150, 150), z = R(i, 42, -34, 40), y = hoehe(x, z); if (y < 0.95 + 0.25 * (hash(i, 43) - 0.3) || Math.hypot(x, z + 1) < 3.2) continue; this.grasP.push({ x, z, y, h: R(i, 44, 0.45, 1.1), d: hash(i, 45) * 6.28 }); }
    this.gras = this._inst(buschel(), windMaterial({ side: THREE.DoubleSide, vertexColors: false }, this.u, { staerke: 1.3 }), this.grasP.length, false, true);
    this.gras.material.color.set("#7D9A40");
    this.grasP.forEach((p, i) => this._setze(this.gras, i, p.x, p.y - 0.02, p.z, 1.3, p.h * 1.1, 1.3, p.d)); this.gras.instanceMatrix.needsUpdate = true;
    this.holzP = []; for (let i = 0; this.holzP.length < 16 && i < 600; i++) { const x = R(i, 51, -90, 90), z = R(i, 52, -30, -6), y = hoehe(x, z); if (y < 0.3 || Math.hypot(x, z) < 5) continue; this.holzP.push({ x, z, y, s: R(i, 53, 0.7, 1.7), d: hash(i, 54) * 6.28 }); }
    this.holz = this._inst(holzGeo(4), new THREE.MeshStandardMaterial({ color: "#9C8A74", roughness: 0.95, flatShading: true }), this.holzP.length, schatten, true);
    this.holzP.forEach((p, i) => this._setze(this.holz, i, p.x, p.y - 0.05, p.z, p.s, 1, 1, p.d)); this.holz.instanceMatrix.needsUpdate = true;

    // Fischerboote am Strand (gleiten nicht, liegen am Strand; das Wasser zieht sich zurück)
    this.boote = this._inst(bootGeo(), new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.7, flatShading: true }), 3, schatten, true);
    const bc = [C("#2D6FA8"), C("#C8503A"), C("#E8E0CE")]; bc.forEach((c, i) => this.boote.setColorAt(i, c));
    [[-26, -22, 0.35], [31, -27, 2.6], [-58, -16, 5.6]].forEach(([x, z, d], i) => this._setze(this.boote, i, x, hoehe(x, z) - 0.12, z, 1.1, 1.1, 1.1, d)); this.boote.instanceMatrix.needsUpdate = true;

    // Felsen: Seestapel vor der Küste (ragen von Anfang an heraus) und Riffgestein, das beim Rückzug auftaucht
    this.felsP = [];
    const stapel = [[-34, -92, 3.4, 7.5], [22, -135, 2.4, 5], [-70, -172, 4.6, 9], [58, -214, 3.1, 6], [-14, -262, 2.2, 4], [-120, -120, 3.0, 6], [105, -150, 2.8, 5.5], [-30, -330, 3.2, 3.2]];
    for (const [x, z, r, h] of stapel) this.felsP.push({ x, z, y: hoehe(x, z) - 0.6 * h * 0.3, sx: r, sy: h, sz: r * 0.85, d: hash(x, 3) * 6.28 });
    this.tangP = [];
    for (let k = 0; k < 120; k++) {
      const cx = R(k, 61, -300, 300), cz = -(60 + 2500 * hash(k, 62) ** 1.6), nR = 6 + Math.floor(hash(k, 63) * 11), cr = R(k, 64, 10, 30);
      for (let j = 0; j < nR; j++) { const x = cx + R(k * 31 + j, 65, -cr, cr), z = cz + R(k * 31 + j, 66, -cr, cr), s = R(k * 31 + j, 67, 0.5, 3.0) * (cz < -700 ? 1.8 : 1);
        if (j % 2 === 0) this.tangP.push({ x: x + R(j, 72, -2, 2), z: z + R(j, 73, -2, 2), y: hoehe(x, z), h: R(j + k, 74, 0.7, 1.5), d: hash(j + k * 3, 75) * 6.28 });
        this.felsP.push({ x, z, y: hoehe(x, z) - 0.18 * s, sx: s * R(j, 68, 0.9, 1.9), sy: s * R(j, 69, 0.35, 0.8), sz: s * R(j, 70, 0.8, 1.4), d: hash(j + k * 7, 71) * 6.28 }); }
    }
    // Seetang-Büschel (trocken fallend: dunkel) und Kiesel
    this.tang = this._inst(buschel(), windMaterial({ side: THREE.DoubleSide, vertexColors: false }, this.u, { staerke: 0.4 }), this.tangP.length, false, true);
    this.tang.material.color.set("#4A4A22");
    this.tangP.forEach((p, i) => this._setze(this.tang, i, p.x, p.y, p.z, 1.9, p.h * 0.7, 1.9, p.d)); this.tang.instanceMatrix.needsUpdate = true;
    this.kieselP = []; for (let i = 0; this.kieselP.length < 2600 && i < 9000; i++) { const x = R(i, 81, -220, 220), z = -(35 + 1100 * hash(i, 82) ** 1.5), y = hoehe(x, z); this.kieselP.push({ x, z, y, s: R(i, 83, 0.12, 0.5), d: hash(i, 84) * 6.28 }); }
    this.kiesel = this._inst(felsGeo(9, 1), new THREE.MeshStandardMaterial({ color: "#A09484", roughness: 0.9, vertexColors: true, flatShading: true }), this.kieselP.length, false, true);
    this.kieselP.forEach((p, i) => this._setze(this.kiesel, i, p.x, p.y, p.z, p.s * 1.5, p.s, p.s * 1.2, p.d)); this.kiesel.instanceMatrix.needsUpdate = true;
    this.felsen = this._inst(felsGeo(5), new THREE.MeshStandardMaterial({ color: "#8A7A6A", roughness: 0.9, vertexColors: true, flatShading: true }), this.felsP.length, schatten, true);
    this.felsP.forEach((p, i) => this._setze(this.felsen, i, p.x, p.y, p.z, p.sx, p.sy, p.sz, p.d)); this.felsen.instanceMatrix.needsUpdate = true;

    // Priel-Tümpel: flache Wasserflächen in den Rinnen zwischen den Sandbänken, bleiben nach dem Rückzug stehen
    const tm = new THREE.ShaderMaterial({ vertexShader: WASSER_V, fragmentShader: WASSER_F, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, this.wu]), fog: true, transparent: true, depthWrite: false });
    Object.assign(tm.uniforms, this.wu); tm.uniforms.fadeX = { value: 260 }; tm.uniforms.fleck = { value: 1 };
    this.tuempel = [];
    [[-180, 14, 1.4], [-470, 18, 1.1], [-850, 24, 0.9], [-1200, 26, 1.0], [-1700, 40, 1.2]].forEach(([z, br, hh]) => {
      let tiefst = 1e9; for (let x = -200; x <= 200; x += 20) tiefst = Math.min(tiefst, hoehe(x, z));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(520, br * 2, 1, 1).rotateX(-Math.PI / 2), tm); m.position.set(0, tiefst + hh, z); m.renderOrder = 6; m.frustumCulled = false; m.visible = false; szene.add(m);
      this.tuempel.push({ m, basis: tiefst + hh, z, zeit: 0 });
    });
  }
  _inst(geo, mat, n, schatten, empfangen) {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = schatten; m.receiveShadow = empfangen; m.frustumCulled = false;
    const c = new THREE.Color(); for (let i = 0; i < n; i++) { const v = 0.8 + 0.34 * hash(i, 777 + n); m.setColorAt(i, c.setRGB(v, v, v)); }
    this.szene.add(m); this.vertices += geo.getAttribute("position").count * n; return m;
  }
  _setze(mesh, i, x, y, z, sx, sy, sz, dreh = 0) {
    this._e.set(0, dreh, 0); this._q.setFromEuler(this._e); this._p.set(x, y, z); this._s.set(sx, sy, sz); this._m.compose(this._p, this._q, this._s); mesh.setMatrixAt(i, this._m);
  }
  setze(t, kamera, w) {
    const { pegel, pegelV1, pegelV2, sonne, sonnenFarbe, himmelFarbe, wasserFarbe, wind = 0.5, lichtwelle = { r: 0, a: 0 }, tuempel = 1 } = w;
    const u = this.u; u.uPegel.value = pegel; u.uPV1.value = pegelV1; u.uPV2.value = pegelV2; u.uZeit.value = t; u.uWindS.value = 0.4 + 1.2 * wind;
    u.uLWr.value = lichtwelle.r; u.uLWa.value = lichtwelle.a; u.uCam.value.set(kamera.position.x, kamera.position.z);
    this.wasser.position.y = pegel; this.wu.pegel.value = pegel;
    this.wu.zeit.value = t; this.wu.sonneR.value.set(...sonne); this.wu.sonneF.value.copy(sonnenFarbe); this.wu.himmel.value.copy(himmelFarbe); if (wasserFarbe) this.wu.tief.value.copy(wasserFarbe);
    // Tümpel: sichtbar, sobald das Meer unter ihrer Oberfläche liegt; sinken langsam (Verdunstung, Versickern)
    for (const q of this.tuempel) {
      const frei = pegel < q.basis - 0.6;
      q.m.visible = frei && tuempel > 0.01;
      if (frei) { q.m.position.y = q.basis - 0.05 - (1 - tuempel) * 1.0 - Math.max(0, (pegelV2 - q.basis)) * 0.0; }
    }
    this.turm.visible = true;
  }
}
