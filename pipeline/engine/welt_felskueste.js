// Welt „Felsküste am offenen Ozean“ (Account 2 @stelldirvor.pov, Weltenkatalog „Meer und Küste“), Erstbau 06.11.2026
// („Was wäre, wenn alle Kontinente wieder zusammenstoßen würden?“, Standpunkt: flaches Felsplateau direkt an der Brandung, Westafrika). Nur für den Baukasten Lunar-POV.
//
// Inhalt: Felsplateau mit Schichtstufen und Brocken an der Brandung (Küstenlinie wandert durch Erosion landeinwärts), Hinterland mit
// Savannen-Gras, Büschen, Akazien und Baobabs (trocknet aus: grün → gelb → ocker → rote Wüste), Ozean mit Wellen, Schaumbändern und
// Licht-/Mondglanz (eigener Shader), Sternenfeld mit Strichspuren, Gegenküste als verschiebbarer Kontinent (Vulkankegel, Faltengebirge,
// Höhe über `falte`), Möwen, Gischt.  Alles ist eine Funktion von t (kein Zustand).
//   const w = new Felskueste(szene, { schatten });  w.setze(t, kamera, S)  mit
//   S = { ero m, trocken 0..1.4, anteil 0..1 (Gras), wind, d m (Abstand der Gegenküste zur Küste, 1e9 = ausgeblendet), falte 0..1, beben,
//         licht: { dir, farbe, st (Glanz) }, himmel: { h, z }, wasser: { tief, flach }, sterne 0..1, sternWinkel, sternLaenge, unruhe }
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";

// ----------------------------------------------------------------------------------------------- Rauschen (JS, wie im Shader)
const fr = (x) => x - Math.floor(x);
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= 0.5; } return s; }
const C = (hex) => new THREE.Color(hex);

// ----------------------------------------------------------------------------------------------- Küste und Gelände
/** Küstenlinie (z der Uferkante) bei x ohne Erosion; Land liegt bei z > zs (hinter der Kamera), Meer davor */
export const zsBasis = (x) => -20 + 6 * Math.sin(x * 0.05 + 0.5) + 9 * Math.sin(x * 0.012 + 0.3) + 3 * Math.sin(x * 0.13 + 1.7);
export const AUGE = { hoehe: 3.3 };

const rauschen = (x, z) => ({ r: fbm(x * 0.07 + 3.1, z * 0.07 + 1.3, 3), f: fbm(x * 0.55, z * 0.55, 2), g: fbm(x * 0.004 + 9, z * 0.004 + 2, 3), p: fbm(x * 0.03 + 5, z * 0.03 + 8, 3) });

/** Geländehöhe (m über Meeresspiegel) */
export function hoehe(x, z, ero, n) {
  const u = z - (zsBasis(x) + ero);
  if (u < 0) return Math.max(-32, -0.9 + u * 0.55) + 0.5 * n.f * smoothstep(-8, 0, u);
  const kante = smoothstep(0, 5, u), innen = smoothstep(0, 12, u);
  let h = 0.3 + 1.4 * kante + 1.6 * (n.r - 0.45) * innen + 0.8 * Math.floor(n.r * 4) / 4 * innen + 0.35 * (n.f - 0.5) * kante;
  h += 0.035 * Math.min(u, 320) + 70 * smoothstep(250, 2200, u) * (0.35 + n.g);
  h += 11 * smoothstep(-40, -300, x) * smoothstep(1, 16, u) * (0.6 + 0.8 * n.r);       // niedrige Klippen nach links
  h += 6 * smoothstep(40, 300, x) * smoothstep(1, 14, u) * n.r;
  return h;
}

// Farben: Fels, nasser Fels, Vegetation in Stufen des Austrocknens
const FELS1 = C("#6A645C"), FELS2 = C("#8E8272"), FELS_NASS = C("#2C2B2C"), BOD_SAND = C("#A8885C"), BOD_ROT = C("#9E4A2C");
const VEG = [C("#5D7E32"), C("#7C8C3A"), C("#A89A4C"), C("#B38C55"), C("#A5522F")];       // trocken 0, 0.25, 0.5, 0.75, 1.0+
function vegFarbe(d, aus) {
  const k = clamp(d, 0, 1) * 4, i = Math.min(3, Math.floor(k));
  return aus.copy(VEG[i]).lerp(VEG[i + 1], k - i);
}
const tmpC = new THREE.Color(), tmpD = new THREE.Color(), UNTER = C("#3C6F73");

function gitter(x0, x1, z0, z1, dx, ueberspringe) {
  const nx = Math.round((x1 - x0) / dx) + 1, nz = Math.round((z1 - z0) / dx) + 1, n = nx * nz;
  const X = new Float32Array(n), Z = new Float32Array(n);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { X[j * nx + i] = x0 + i * dx; Z[j * nx + i] = z0 + j * dx; }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i;
    if (ueberspringe && ueberspringe(X[a] + dx / 2, Z[a] + dx / 2)) continue;
    idx.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1);
  }
  return { nx, nz, n, X, Z, idx };
}

class Boden {
  constructor(szene, mat, g, schatten) {
    this.g = g; this.noise = new Array(g.n);
    for (let i = 0; i < g.n; i++) this.noise[i] = rauschen(g.X[i], g.Z[i]);
    this.pos = new Float32Array(g.n * 3); this.col = new Float32Array(g.n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(g.idx);
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.frustumCulled = false; this.mesh.receiveShadow = schatten; szene.add(this.mesh);
    this.geo = geo;
  }
  aktualisiere(ero, trocken, absenk = null) {
    const { g, noise, pos, col } = this;
    const boden0 = BOD_SAND.clone().lerp(BOD_ROT, clamp((trocken - 0.35) / 0.65)), veg0 = vegFarbe(trocken, new THREE.Color());
    const gruenFaktor = 1 - smoothstep(0.5, 1.15, trocken);
    for (let i = 0; i < g.n; i++) {
      const x = g.X[i], z = g.Z[i], n = noise[i];
      let y = hoehe(x, z, ero, n);
      if (absenk) y -= absenk(x, z);
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      const u = z - (zsBasis(x) + ero);
      if (u < 0) { tmpC.copy(FELS_NASS).lerp(UNTER, smoothstep(-6, 0, u)); col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b; continue; }
      const schicht = 0.85 + 0.3 * ((Math.floor(n.r * 8) % 2) ? 1 : 0) * (0.6 + 0.4 * n.f);
      tmpC.copy(FELS1).lerp(FELS2, clamp((n.f - 0.2) * 1.4)).multiplyScalar(schicht);
      tmpC.lerp(FELS_NASS, (1 - smoothstep(0.2, 2.2, y)) * 0.85);
      const vegMaske = smoothstep(14, 60, u) * smoothstep(0.34, 0.62, n.p + 0.12 * (n.f - 0.5));
      tmpD.copy(boden0).multiplyScalar(0.8 + 0.4 * n.f);
      tmpC.lerp(tmpD, smoothstep(30, 120, u) * 0.85 * (1 - vegMaske * 0.4));
      tmpD.copy(veg0).multiplyScalar(0.8 + 0.4 * n.f);
      tmpC.lerp(tmpD, clamp(vegMaske * gruenFaktor + vegMaske * 0.45 * (1 - gruenFaktor)));
      col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
  }
}

// ----------------------------------------------------------------------------------------------- Wasser (Shader)
const WASSER_V = /* glsl */ `
varying vec3 vW;
#include <fog_pars_vertex>
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const WASSER_F = /* glsl */ `
uniform float uZeit, uEro, uUnruhe, uLichtSt;
uniform vec3 uTief, uFlach, uHimH, uHimZ, uLichtDir, uLichtFarbe;
varying vec3 vW;
#include <fog_pars_fragment>
float nH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float nN(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(nH(i), nH(i + vec2(1.0, 0.0)), u.x), mix(nH(i + vec2(0.0, 1.0)), nH(i + vec2(1.0, 1.0)), u.x), u.y); }
float zs(float x) { return -20.0 + 6.0 * sin(x * 0.05 + 0.5) + 9.0 * sin(x * 0.012 + 0.3) + 3.0 * sin(x * 0.13 + 1.7) + uEro; }
void main() {
  vec2 p = vW.xz; vec3 V = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);
  vec2 g = vec2(0.0);
  for (int i = 0; i < 5; i++) {
    float f = float(i); vec2 dir = normalize(vec2(sin(f * 2.3 + 0.4) * 0.55, 1.0));
    float k = 0.28 * pow(1.75, f); float ph = dot(dir, p) * k - uZeit * (1.1 + 0.5 * f) * (0.6 + 0.4 * uUnruhe);
    g += dir * k * cos(ph) * (0.12 / pow(1.6, f)) * uUnruhe;
  }
  g += (vec2(nN(p * 0.9 + uZeit * 0.3), nN(p * 0.9 - uZeit * 0.25 + 9.0)) - 0.5) * 0.12;
  g *= 1.0 / (1.0 + dist * 0.0009);
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float d = vW.z - zs(vW.x);
  float flach = exp(min(d, 0.0) * 0.07);
  vec3 basis = mix(uTief, uFlach, clamp(flach * 1.15, 0.0, 1.0));
  float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  vec3 R = reflect(-V, N);
  vec3 himmel = mix(uHimH, uHimZ, clamp(R.y * 1.6, 0.0, 1.0));
  vec3 c = mix(basis, himmel, clamp(0.06 + 0.92 * fres, 0.0, 1.0));
  float sp = pow(max(dot(R, uLichtDir), 0.0), 140.0) * 3.0 + pow(max(dot(R, uLichtDir), 0.0), 12.0) * 0.35;
  c += uLichtFarbe * sp * uLichtSt;
  // Schaum: laufende Bänder am Ufer + Saum an der Kante
  float w = 0.5 + 0.5 * sin(d * 0.95 - uZeit * 1.7 + nN(p * 0.6) * 4.0);
  float band = smoothstep(-7.0, -0.2, d) * smoothstep(0.55, 0.92, w * (0.55 + 0.9 * nN(p * vec2(1.6, 1.1) + uZeit * 0.15)));
  float saum = smoothstep(-1.1, -0.1, d) * (0.5 + 0.5 * nN(p * 2.4 + uZeit * 0.6));
  float schaum = clamp(band * 0.8 + saum * 0.9, 0.0, 1.0) * step(d, 0.4);
  c = mix(c, vec3(0.95, 0.96, 0.98) * (0.35 + 0.65 * (uHimH.r + uHimH.g + uHimH.b) * 0.9 + 0.12 * uLichtSt), schaum * 0.85);
  gl_FragColor = vec4(c, 1.0);
  #include <fog_fragment>
}`;

// ----------------------------------------------------------------------------------------------- Sterne mit Strichspuren
class Sterne {
  constructor(szene, { anzahl = 1800, seed = 5 } = {}) {
    this.n = anzahl; this.dir = []; this.hell = [];
    for (let i = 0; i < anzahl; i++) {
      const y = 2 * hash(i, seed) - 1, w = 6.2832 * hash(i, seed + 1), r = Math.sqrt(1 - y * y);
      this.dir.push(new THREE.Vector3(r * Math.cos(w), y, r * Math.sin(w))); this.hell.push(0.25 + 0.75 * Math.pow(hash(i, seed + 2), 3));
    }
    this.K = 7;                                                       // Punkte je Spur
    this.pos = new Float32Array(anzahl * (this.K - 1) * 2 * 3); this.col = new Float32Array(anzahl * (this.K - 1) * 2 * 3);
    this.tint = []; for (let i = 0; i < anzahl; i++) this.tint.push(new THREE.Color().setHSL(0.58 + 0.1 * (hash(i, seed + 3) - 0.5), 0.35 * hash(i, seed + 4), 0.8));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.mesh = new THREE.LineSegments(geo, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = -500; szene.add(this.mesh);
    this.geo = geo; this.achse = new THREE.Vector3(Math.cos(0.26), Math.sin(0.26), 0).normalize();
    this._v = new THREE.Vector3();
  }
  setze(kamera, sichtbar, winkel, laenge) {
    this.mesh.visible = sichtbar > 0.003; if (!this.mesh.visible) return;
    const P = this.pos, Cc = this.col, K = this.K, R = 14000; let o = 0;
    for (let i = 0; i < this.n; i++) {
      let prev = null;
      for (let k = 0; k < K; k++) {
        const a = winkel - laenge * (1 - k / (K - 1));
        const v = this._v.copy(this.dir[i]).applyAxisAngle(this.achse, a).multiplyScalar(R).add(kamera.position);
        if (prev) {
          const f0 = (k - 1) / (K - 1), f1 = k / (K - 1), h = this.hell[i] * sichtbar;
          P[o] = prev[0]; P[o + 1] = prev[1]; P[o + 2] = prev[2]; P[o + 3] = v.x; P[o + 4] = v.y; P[o + 5] = v.z;
          const t = this.tint[i];
          Cc[o] = t.r * h * f0; Cc[o + 1] = t.g * h * f0; Cc[o + 2] = t.b * h * f0; Cc[o + 3] = t.r * h * f1; Cc[o + 4] = t.g * h * f1; Cc[o + 5] = t.b * h * f1;
          o += 6;
        }
        prev = [v.x, v.y, v.z];
      }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
  }
}

// ----------------------------------------------------------------------------------------------- Pflanzen
function farbigeGeo(geo, f) {
  geo = geo.index ? geo.toNonIndexed() : geo; if (geo.getAttribute("uv")) geo.deleteAttribute("uv"); geo.deleteAttribute("normal");
  const p = geo.getAttribute("position"), a = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const c = f(p.getX(i), p.getY(i), p.getZ(i)); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute("color", new THREE.BufferAttribute(a, 3)); return geo;
}
function verbinde(teile) {
  const n = teile.reduce((s, g) => s + g.getAttribute("position").count, 0), P = new Float32Array(n * 3), Cc = new Float32Array(n * 3); let o = 0;
  for (const g of teile) { P.set(g.getAttribute("position").array, o * 3); Cc.set(g.getAttribute("color").array, o * 3); o += g.getAttribute("position").count; }
  const r = new THREE.BufferGeometry(); r.setAttribute("position", new THREE.BufferAttribute(P, 3)); r.setAttribute("color", new THREE.BufferAttribute(Cc, 3)); return r;
}
const grasGeo = () => {
  const teile = [];
  for (let k = 0; k < 6; k++) {
    const g = new THREE.ConeGeometry(0.05, 0.55 + 0.5 * hash(k, 3), 3, 1); g.translate(0, 0.3, 0);
    g.rotateZ((hash(k, 5) - 0.5) * 0.7); g.rotateY(k * 1.05); g.translate((hash(k, 6) - 0.5) * 0.25, 0, (hash(k, 7) - 0.5) * 0.25);
    teile.push(farbigeGeo(g, (x, y) => new THREE.Color().setRGB(0.55 + 0.6 * y, 0.6 + 0.6 * y, 0.5 + 0.2 * y)));
  }
  return verbinde(teile);
};
const buschGeo = (s) => {
  const teile = [];
  for (let k = 0; k < 4; k++) {
    const g = new THREE.IcosahedronGeometry(0.55 + 0.25 * hash(k, s), 1); g.scale(1.2, 0.8, 1.1); g.translate((hash(k, s + 1) - 0.5) * 0.9, 0.45 + 0.25 * hash(k, s + 2), (hash(k, s + 3) - 0.5) * 0.9);
    teile.push(farbigeGeo(g, (x, y) => new THREE.Color().setRGB(0.55 + 0.55 * (y - 0.1), 0.58 + 0.55 * (y - 0.1), 0.5 + 0.3 * (y - 0.1))));
  }
  return verbinde(teile);
};
const akazieGeo = (s) => {
  const t = new THREE.CylinderGeometry(0.1, 0.22, 3.4, 5, 1); t.translate(0, 1.7, 0); t.rotateZ(0.08 * (s - 1));
  const kr = new THREE.IcosahedronGeometry(1.0, 1); kr.scale(3.0, 0.55, 2.6); kr.translate(0.2 * s, 3.7, 0);
  const kr2 = new THREE.IcosahedronGeometry(1.0, 1); kr2.scale(1.9, 0.5, 1.7); kr2.translate(-1.4, 3.2, 0.5);
  return verbinde([farbigeGeo(t, () => C("#4A3A2C")), farbigeGeo(kr, (x, y) => new THREE.Color().setRGB(0.7 + 0.5 * y, 0.8 + 0.5 * y, 0.6)), farbigeGeo(kr2, (x, y) => new THREE.Color().setRGB(0.65 + 0.4 * y, 0.75 + 0.4 * y, 0.55))]);
};
const baobabGeo = () => {
  const t = new THREE.CylinderGeometry(0.9, 1.5, 6.5, 8, 1); t.translate(0, 3.25, 0);
  const teile = [farbigeGeo(t, (x, y) => new THREE.Color().setRGB(0.55 + 0.05 * y, 0.45 + 0.04 * y, 0.38))];
  for (let k = 0; k < 6; k++) {
    const a = k * 1.05, g = new THREE.CylinderGeometry(0.12, 0.34, 2.6, 5, 1); g.translate(0, 1.3, 0); g.rotateZ(0.8 + 0.2 * hash(k, 2)); g.rotateY(a); g.translate(0, 6.2, 0);
    teile.push(farbigeGeo(g, () => C("#5A4A3C")));
    const kr = new THREE.IcosahedronGeometry(0.9, 1); kr.scale(1.2, 0.7, 1.1); kr.translate(Math.cos(a) * 2.5, 8.1 + 0.3 * hash(k, 3), Math.sin(a) * 2.5);
    teile.push(farbigeGeo(kr, (x, y) => new THREE.Color().setRGB(0.7 + 0.4 * y, 0.8 + 0.4 * y, 0.6)));
  }
  return verbinde(teile);
};

// ----------------------------------------------------------------------------------------------- Gegenküste (Kontinent, der heranrückt)
const GK = {
  zc: (x) => 380 * Math.sin(x * 0.0007 + 0.6) + 140 * Math.sin(x * 0.0021 + 1.2),                              // Küstenlinie lokal (z)
  vulkane: [[-2600, 2300, 2100, 1900], [1500, 3700, 1600, 2300], [4600, 5000, 2300, 2700], [-5600, 4300, 1400, 2000]],  // x, u, H, R
  ruecken: [[600, 70, 260, 0.0], [1500, 230, 420, 0.1], [3000, 650, 650, 0.3], [4600, 1300, 900, 0.5], [6400, 1900, 1000, 0.7]],   // u0, H, Breite, Verzögerung
};
function gegenHoehen(x, z) {            // z lokal (Land bei z < zc); gibt { basis, falte }
  const u = GK.zc(x) - z;
  let b = u < 0 ? Math.max(-40, -1 + u * 0.12) : 2 + 22 * smoothstep(0, 600, u) + 20 * (fbm(x * 0.004, z * 0.004, 3) - 0.4) * smoothstep(100, 1500, u);
  for (const [vx, vu, H, R] of GK.vulkane) {
    const r = Math.hypot(x - vx, u - vu) / R;
    if (r < 1) { const kegel = Math.pow(1 - r, 1.5); b += H * kegel * (1 - 0.18 * Math.exp(-((r / 0.09) ** 2))) * (0.92 + 0.16 * fbm(x * 0.01, z * 0.01, 2)); }
  }
  let f = 0;
  for (const [u0, H, B, verz] of GK.ruecken) {
    const wob = 500 * Math.sin(x * 0.0012 + u0 * 0.01) + 220 * Math.sin(x * 0.0041 + u0);
    const d = (u - u0 - wob) / (B * 1.7);
    const kamm = Math.exp(-d * d) * (0.75 + 0.5 * fbm(x * 0.0025 + u0, u * 0.0025, 2)) * (0.9 + 0.1 * Math.sin(x * 0.008 + u0));
    f += H * kamm * (1 + 0.3 * verz);
  }
  return { basis: b, falte: f * smoothstep(-100, 700, u) };
}
function gegenFarbe(h, u, steil, c) {
  // Tropenküste grün → Hänge dunkelgrün/braun → Fels grau, hohe Kämme heller
  const gruen = C("#4B7A38"), wald = C("#2F5A2C"), stein = C("#6E655E"), hell = C("#B9B1A8"), rot = C("#8F5B3C"), asche = C("#3B3735");
  c.copy(gruen).lerp(wald, smoothstep(30, 300, h)).lerp(rot, smoothstep(250, 800, h) * 0.5).lerp(stein, smoothstep(600, 1300, h)).lerp(hell, smoothstep(1500, 2400, h));
  if (u < 0) c.copy(C("#3A6C6A"));
  else if (u < 90) c.lerp(C("#C7B58C"), 1 - smoothstep(0, 90, u));
  return c.lerp(asche, clamp(steil * 0.8));
}

export class Felskueste {
  constructor(szene, { schatten = true } = {}) {
    this.szene = szene; this.schatten = schatten; this.vertices = 0;
    this.u = { zeit: { value: 0 }, ero: { value: 0 }, wind: { value: 1 }, anteil: { value: 1 } };
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true });
    const INNEN = [-260, 260, -48, 330], R1 = 2.5;
    this.innen = new Boden(szene, mat, gitter(INNEN[0], INNEN[1], INNEN[2], INNEN[3], R1), schatten);
    this.aussen = new Boden(szene, mat, gitter(-5200, 5200, -400, 5200, 26, (x, z) => x > INNEN[0] + 20 && x < INNEN[1] - 20 && z > INNEN[2] + 20 && z < INNEN[3] - 20), false);
    this.vertices += this.innen.g.n + this.aussen.g.n;
    this.absenkAussen = (x, z) => 0;

    // Wasser
    this.wU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uZeit: { value: 0 }, uEro: { value: 0 }, uUnruhe: { value: 1 }, uLichtSt: { value: 1 },
      uTief: { value: C("#12394F") }, uFlach: { value: C("#3E8B8C") }, uHimH: { value: C("#F2B27A") }, uHimZ: { value: C("#5C79B0") }, uLichtDir: { value: new THREE.Vector3(0.2, 0.1, -1).normalize() }, uLichtFarbe: { value: C("#FFD59A") } }]);
    const wg = new THREE.PlaneGeometry(90000, 90000, 2, 2).rotateX(-Math.PI / 2);
    this.meer = new THREE.Mesh(wg, new THREE.ShaderMaterial({ vertexShader: WASSER_V, fragmentShader: WASSER_F, uniforms: this.wU, fog: true }));
    this.meer.frustumCulled = false; this.meer.renderOrder = 1; szene.add(this.meer);

    // Brocken (Fels) an der Kante und im Wasser
    const bg = new THREE.IcosahedronGeometry(1, 0);
    this.brocken = new THREE.InstancedMesh(bg, new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.95, flatShading: true }), 900);
    this.brocken.frustumCulled = false; this.brocken.castShadow = schatten; this.brocken.receiveShadow = schatten; szene.add(this.brocken);
    this.bl = [];
    const bc = new THREE.Color();
    for (let i = 0; i < 900; i++) {
      let x = -120 + 240 * hash(i, 31); const imWasser = i < 260;
      const u = imWasser ? -(1 + 28 * Math.pow(hash(i, 32), 1.4)) : 0.5 + 40 * Math.pow(hash(i, 32), 1.6);
      const frei = !imWasser && Math.abs(x + 1.5) < 13 && u < 40;                 // Platz für den Standpunkt
      if (imWasser && Math.abs(x + 1.5) < 12 && u > -16) x += (x < -1.5 ? -1 : 1) * 16;
      const sk = frei ? 0.01 : imWasser ? 0.7 + 1.0 * Math.pow(hash(i, 33), 2.4) : 0.3 + 1.0 * Math.pow(hash(i, 33), 2.4);
      this.bl.push({ x, u, sk, rot: hash(i, 34) * 6.28, fl: 0.45 + 0.4 * hash(i, 35) });
      bc.copy(FELS1).lerp(FELS2, hash(i, 36)).multiplyScalar(0.8 + 0.5 * hash(i, 37)); this.brocken.setColorAt(i, bc);
    }
    this.brocken.instanceColor.needsUpdate = true;
    this.M = new THREE.Matrix4(); this.Q = new THREE.Quaternion(); this.E = new THREE.Euler(); this.Pv = new THREE.Vector3(); this.Sv = new THREE.Vector3();

    // Pflanzen
    this.typen = {};
    const baue = (name, geo, n, { x, uMin, uMax, skala, anteil = true, schatten: sch = false, farbFaktor = 1, bereichDicht = 1 }) => {
      const mat2 = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
      mat2.onBeforeCompile = (sh) => {
        sh.uniforms.uZeit = this.u.zeit; sh.uniforms.uAnteil = anteil ? this.u.anteil : { value: 1 }; sh.uniforms.uWindS = this.u.wind;
        sh.vertexShader = "attribute float iR;\nuniform float uZeit; uniform float uAnteil; uniform float uWindS;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
          float sw = sin(uZeit * 1.7 + instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.23) * uWindS * 0.11 * max(position.y, 0.0);
          transformed.x += sw; transformed.z += sw * 0.6;
          if (iR > uAnteil) transformed *= 0.0;`);
      };
      const g = geo.clone(), im = new THREE.InstancedMesh(g, mat2, n), R = new Float32Array(n), Mx = new THREE.Matrix4(), Qq = new THREE.Quaternion(), Pp = new THREE.Vector3(), Ss = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
      let k = 0;
      for (let i = 0; i < n * 3 && k < n; i++) {
        const px = x[0] + (x[1] - x[0]) * hash(i, 41 + name.length), uu = uMin + (uMax - uMin) * Math.pow(hash(i, 43 + name.length), bereichDicht);
        const pz = zsBasis(px) + uu, nz = rauschen(px, pz);
        if (hash(i, 47) > 0.25 + 1.4 * smoothstep(0.34, 0.6, nz.p)) continue;           // Flecken
        const y = hoehe(px, pz, 0, nz); const sk = skala[0] + (skala[1] - skala[0]) * hash(i, 45);
        Qq.setFromAxisAngle(up, hash(i, 46) * 6.283); Pp.set(px, y - 0.05, pz); Ss.set(sk, sk * (0.85 + 0.3 * hash(i, 48)), sk);
        im.setMatrixAt(k, Mx.compose(Pp, Qq, Ss)); R[k] = hash(k, 49); k++;
      }
      im.count = k; im.frustumCulled = false; im.castShadow = sch && this.schatten; im.receiveShadow = false;
      im.geometry.setAttribute("iR", new THREE.InstancedBufferAttribute(R, 1)); im.instanceMatrix.needsUpdate = true;
      szene.add(im); this.vertices += g.getAttribute("position").count * k; this.typen[name] = { im, mat: mat2, n: k };
    };
    baue("gras", grasGeo(), 16000, { x: [-110, 130], uMin: 14, uMax: 150, skala: [0.9, 1.9], bereichDicht: 1.0 });
    baue("gras_fern", grasGeo(), 6000, { x: [-250, 250], uMin: 150, uMax: 320, skala: [1.5, 3.2], bereichDicht: 1.0 });
    baue("busch", buschGeo(2), 700, { x: [-250, 250], uMin: 20, uMax: 330, skala: [0.9, 2.1], bereichDicht: 1.2 });
    baue("akazie", akazieGeo(1), 110, { x: [-250, 250], uMin: 35, uMax: 330, skala: [0.9, 1.6], anteil: false, schatten: true, bereichDicht: 1.1 });
    baue("baobab", baobabGeo(), 26, { x: [-200, 220], uMin: 55, uMax: 320, skala: [0.9, 1.5], anteil: false, schatten: true, bereichDicht: 1.0 });
    this.typen.gras.mat.color.set("#FFFFFF");

    this.sterne = new Sterne(szene);

    // Gegenküste
    const GB = [-9000, 9000, -700, 14000], RS = 80;
    const gg = gitter(GB[0], GB[1], 0, GB[3] + 700, RS);
    const gp = new Float32Array(gg.n * 3), gc = new Float32Array(gg.n * 3), gf = new Float32Array(gg.n), cc = new THREE.Color();
    for (let i = 0; i < gg.n; i++) {
      const x = gg.X[i], zl = -(gg.Z[i] - 700), u = GK.zc(x) - zl; // lokales z: Land bei z < zc  (Gitter-z von 0..14700 entspricht u = z − 700)
      const e = gegenHoehen(x, zl);
      gp[i * 3] = x; gp[i * 3 + 1] = e.basis; gp[i * 3 + 2] = zl; gf[i] = e.falte;
      const hh = e.basis + e.falte; const steil = clamp((e.falte + Math.max(0, e.basis - 200)) / 2500);
      gegenFarbe(hh, u, steil * 0.6, cc); cc.multiplyScalar(0.8 + 0.4 * fbm(x * 0.01, zl * 0.01, 2));
      gc[i * 3] = cc.r; gc[i * 3 + 1] = cc.g; gc[i * 3 + 2] = cc.b;
    }
    const ggeo = new THREE.BufferGeometry();
    ggeo.setAttribute("position", new THREE.BufferAttribute(gp, 3)); ggeo.setAttribute("color", new THREE.BufferAttribute(gc, 3)); ggeo.setAttribute("aFalte", new THREE.BufferAttribute(gf, 1)); ggeo.setIndex(gg.idx.slice().reverse());
    this.uHub = { value: 0.3 }; this.uBeben = { value: 0 };
    const gmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, flatShading: true });
    gmat.onBeforeCompile = (sh) => {
      sh.uniforms.uHub = this.uHub; sh.uniforms.uBeben = this.uBeben;
      sh.vertexShader = "attribute float aFalte;\nuniform float uHub; uniform float uBeben;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
        transformed.y += aFalte * uHub + uBeben * sin(position.x * 0.02 + position.z * 0.017) * aFalte * 0.01;`);
    };
    this.gegen = new THREE.Mesh(ggeo, gmat); this.gegen.frustumCulled = false; this.gegen.visible = false; szene.add(this.gegen);
    // z-Gitter läuft von 0..: wir haben lokales z = −(Gitter-z − 700) → Land liegt bei negativem lokalem z; Mesh zeigt dann nach −z (vom Betrachter weg)
    this.gegenBreite = GB;
    this.vertices += gg.n;
  }

  setze(t, kamera, S) {
    const L = S.licht, W = this.wU;
    this.u.zeit.value = t; this.u.ero.value = S.ero; this.u.wind.value = S.wind; this.u.anteil.value = S.anteil;
    this.innen.aktualisiere(S.ero, S.trocken);
    this.aussen.aktualisiere(S.ero, S.trocken, (x, z) => (x > -240 && x < 240 && z > -30 && z < 310 ? 0.9 : 0));
    W.uZeit.value = t; W.uEro.value = S.ero; W.uUnruhe.value = S.unruhe ?? 1; W.uLichtSt.value = L.st;
    W.uTief.value.copy(S.wasser.tief); W.uFlach.value.copy(S.wasser.flach); W.uHimH.value.copy(S.himmel.h); W.uHimZ.value.copy(S.himmel.z);
    W.uLichtDir.value.set(...L.dir).normalize(); W.uLichtFarbe.value.copy(L.farbe);
    // Brocken: Höhe nach Küstenlinie, von der Erosion verschluckte Brocken verschwinden
    const { M, Q, E, Pv, Sv } = this;
    for (let i = 0; i < this.bl.length; i++) {
      const b = this.bl[i], z = zsBasis(b.x) + S.ero + b.u;
      const u = b.u; const n = rauschen(b.x, z); const y = u < 0 ? -0.35 + b.sk * b.fl * 0.55 : hoehe(b.x, z, S.ero, n) + b.sk * b.fl * 0.4;
      const weg = u < 0 ? 1 : smoothstep(-0.3, 3.0, z - (zsBasis(b.x) + S.ero));
      const skal = b.sk * weg;
      E.set(b.rot, b.rot * 1.7, b.rot * 0.6); Q.setFromEuler(E); Pv.set(b.x, y, z); Sv.set(skal * 1.15, skal * b.fl * 1.1, skal);
      this.brocken.setMatrixAt(i, M.compose(Pv, Q, Sv));
    }
    this.brocken.instanceMatrix.needsUpdate = true;
    // Vegetation färbt sich mit der Trockenheit
    const vc = vegFarbe(S.trocken, tmpC).clone();
    this.typen.gras.mat.color.copy(vc); this.typen.gras_fern.mat.color.copy(vc);
    this.typen.busch.mat.color.copy(vegFarbe(S.trocken, tmpD).clone().multiplyScalar(0.75));
    const lauby = vegFarbe(clamp(S.trocken * 0.85, 0, 1), tmpD).clone().multiplyScalar(0.9);
    this.typen.akazie.mat.color.copy(lauby); this.typen.baobab.mat.color.copy(lauby);
    this.sterne.setze(kamera, S.sterne, S.sternWinkel, S.sternLaenge);
    // Gegenküste
    this.gegen.visible = S.d < 24000;
    this.uHub.value = S.falte; this.uBeben.value = S.beben ?? 0;
    this.gegen.position.set(0, 0, zsBasis(0) + S.ero - S.d - GK.zc(0));
    return this;
  }
}

/** Welt-Position eines Punktes der Gegenküste: lokale Koordinaten (x, zl) → Welt [x, z] */
export const gegenWeltXZ = (S, x, zl) => [x, zsBasis(0) + S.ero - S.d - GK.zc(0) + zl];
export { GK, gegenHoehen };
