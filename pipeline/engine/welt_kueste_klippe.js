// Grundwelt „Küstenklippe“ (Account 2 @stelldirvor.pov, Weltenkatalog „Meer und Küste“, .claude/skills/stelldirvor-video/themen-und-plan.md §2)
// Erstbau 03.11.2026 („Was wäre, wenn die Erde immer näher an die Sonne rücken würde?“). NUR für den Baukasten Lunar-POV.
//
// Inhalt: Atlantik-Steilküste (generisch, Westirland-ähnlich) mit Landzungen und Buchten, Felswände mit Gesteinsschichten,
// Wiesen-Patchwork mit Steinmauern auf den Klippen und dem ansteigenden Hinterland, Meeresgrund mit Riffen (sichtbar, wenn der
// Meeresspiegel fällt), Wasser mit Wellen, Sonnenglanz, Brandung und Kochen, Gras-Halme im Wind vor der Kamera, Felsbrocken an der
// Kante und am Wandfuß, Möwen (nah hell, fern dunkel), Haufenwolken, Dampf über dem Meer, Rauch aus brennenden Wiesen.
// Eigener Himmel `SonnenHimmel` mit einer Sonne, deren Scheibe in echter Winkelgröße wachsen kann (bis sie den Himmel füllt):
// Randverdunklung, Granulation, Korona, Protuberanzen, „Fläche“ (Blick auf die Sonnenoberfläche).
//
// Steuerung je Bild (alles Funktion von t, kein Zustand):
//   const welt = new KuesteKlippe(szene, { schatten: true, sonne: [x, y, z] });
//   welt.setze(t, kamera, { duerre 0..1.5 (0 grün, 0.5 gelb, 1 braun, 1.4 verkohlt), pegel m (0 = heute), kochen 0..1, glut 0..1,
//                           salz 0..1, sonneDir [x,y,z], sonneFarbe, himmelFarbe, wind 0..1, sichtbar (false = Welt aus) });
//   welt.puffs(t, { dampf 0..1, wolken 0..1, rauch 0..1 }) → Puff-Liste für die gemeinsame Puffs-Instanz der Szene
//   welt.himmel.setze({ sonnenRichtung, sonnenWinkel (rad, Radius), sonnenHell, korona, zenit, horizont, milch, milchFarbe, flaeche, zeit })
// Koordinaten: Auge über (0, 0), Blick grob nach −z aufs Meer. Klippenkante bei z ≈ −3,5 vor der Kamera, Klippe 62 m hoch.
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { Voegel } from "./stil_lunar_pov.js";

// --------------------------------------------------------------------------------------------- Küstenlinie und Gelände (JS)
/** Küste als Funktion x = kueste(z) (z fällt mit der Entfernung); Land liegt bei x > kueste(z). Punkte [z, x]. */
export const KUESTE_ATLANTIK = {
  hoehe: 62,
  punkte: [[2000, -700], [400, -170], [120, -70], [40, -34], [10, -12], [-3.5, 0], [-15, 14], [-60, 60], [-180, 125], [-420, 165], [-640, 30],
    [-800, -70], [-880, -95], [-1000, 20], [-1300, 200], [-1800, 70], [-2200, -140], [-2350, -175], [-2700, 50], [-3500, 360], [-4500, 110],
    [-5200, -220], [-5500, -250], [-7000, 280], [-10000, 800], [-16000, 1500], [-40000, 3500]],
};

const fr = (x) => x - Math.floor(x);
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= 0.5; } return s; }
const ridge = (x, y) => { const v = 1 - Math.abs(fbm(x, y, 4) * 2 - 1); return v * v; };

export class Kuestenlinie {
  constructor(punkte) { this.p = [...punkte].sort((a, b) => b[0] - a[0]); }
  /** x der Küste bei z (Hermite-Spline, z absteigend) plus kleine Zacken in der Ferne */
  x(z, glatt = false) {
    const p = this.p, n = p.length;
    if (z >= p[0][0]) return p[0][1];
    if (z <= p[n - 1][0]) return p[n - 1][1];
    let i = 0; while (i < n - 2 && z < p[i + 1][0]) i++;
    const [z0, x0] = p[i], [z1, x1] = p[i + 1];
    const m = (k) => { const a = p[Math.max(0, k - 1)], b = p[Math.min(n - 1, k + 1)]; return (b[1] - a[1]) / (b[0] - a[0]); };
    const hh = z1 - z0, s = (z - z0) / hh, m0 = m(i) * hh, m1 = m(i + 1) * hh;
    const s2 = s * s, s3 = s2 * s;
    const basis = (2 * s3 - 3 * s2 + 1) * x0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * x1 + (s3 - s2) * m1;
    if (glatt) return basis;
    const zack = smoothstep(25, 160, Math.abs(z)) * (34 * (fbm(z * 0.006, 3.3, 3) - 0.5) + 16 * (fbm(z * 0.03, 8.1, 3) - 0.5) + 7 * (fbm(z * 0.1, 1.7, 3) - 0.5));
    return basis + zack;
  }
  /** vorzeichenbehafteter Abstand (> 0 Land), Näherung über die Neigung der Küste */
  abstand(x, z) { const xc = this.x(z), d = (this.x(z - 0.5) - this.x(z + 0.5)); return (x - xc) / Math.sqrt(1 + d * d); }
}

/** Gelände: Land (Klippenoberkante mit ansteigendem Hinterland), Felswand, Meeresgrund */
export function gelaende(K, H0 = 62) {
  const land = (x, z, d) => {
    const dc = Math.hypot(x, z);
    const hv = 1 + 0.42 * (fbm(z * 0.0012 + 2, x * 0.0012, 3) - 0.5) * 2 * smoothstep(40, 300, dc);
    return H0 * hv + 7 * (fbm(z * 0.012 + 5, x * 0.012, 3) - 0.5) * smoothstep(60, 250, dc) + 34 * smoothstep(60, 1500, d) * (0.65 + 0.7 * fbm(x * 0.0016 + 4, z * 0.0016, 3)) + 7 * (fbm(x * 0.006, z * 0.006, 3) - 0.5) * smoothstep(15, 220, d)
      + 0.9 * (vn(x * 0.07, z * 0.07) - 0.5) * smoothstep(6, 30, dc) - 1.1 * (1 - smoothstep(0, 5, d)) * smoothstep(8, 30, dc);
  };
  const grund = (x, z, f) => { // f = Abstand ins Meer (m, > 0)
    let y = -(4 + 120 * (1 - Math.exp(-f / 900)));
    y += 14 * (ridge(x * 0.0045, z * 0.0045) - 0.35) * smoothstep(40, 400, f);       // Riffe und Rinnen
    y += 3.5 * (vn(x * 0.12, z * 0.12) - 0.5) * (1 - smoothstep(10, 60, f));            // Blockschutt am Wandfuß
    y += -2.5 + 3.2 * smoothstep(0, 30, f) * (1 - smoothstep(30, 90, f)) * vn(x * 0.03, z * 0.03); // Brandungsplattform
    return Math.min(y, -1.2);
  };
  const hoehe = (x, z) => {
    const d = K.abstand(x, z), dc = Math.hypot(x, z);
    const w = 1.3 + 0.006 * dc;
    if (d >= 0) return land(x, z, d);
    if (d > -w) { // Wand mit Absätzen (Schichtstufen)
      const u = -d / w, top = land(x, z, 0), bot = grund(x, z, 0.5);
      const stufe = u + 0.07 * Math.sin(u * 19 + vn(x * 0.05, z * 0.05) * 6);
      return lerp(top, bot, clamp(stufe));
    }
    const dg = x - K.x(z, true);                       // Meeresgrund folgt der geglätteten Küste (keine Riefen)
    return grund(x, z, lerp(-d - w, Math.max(0.5, -dg - 20), smoothstep(15, 90, -d)));
  };
  return { hoehe, land, grund };
}

// --------------------------------------------------------------------------------------------- GLSL
const GLSL_NOISE = /* glsl */ `
float kH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float kN(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(kH(i), kH(i + vec2(1.0, 0.0)), u.x), mix(kH(i + vec2(0.0, 1.0)), kH(i + vec2(1.0, 1.0)), u.x), u.y); }
float kF(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * kN(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
vec2 kZelle(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 o = vec2(kH(i + g), kH(i + g + 7.7));
    float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return vec2(d1, d2); }
`;
/** Farbe der Wiese je Dürre (0 grün, 0.5 gelb, 1 braun, 1.4 verkohlt) */
const GLSL_WIESE = /* glsl */ `
vec3 kWiese(float v, float dr) {
  vec3 g = mix(vec3(0.24, 0.36, 0.13), vec3(0.36, 0.48, 0.19), v);
  vec3 y = mix(vec3(0.62, 0.55, 0.22), vec3(0.74, 0.66, 0.30), v);
  vec3 b = mix(vec3(0.38, 0.27, 0.14), vec3(0.50, 0.37, 0.20), v);
  vec3 k = mix(vec3(0.07, 0.06, 0.05), vec3(0.16, 0.14, 0.12), v);
  vec3 c = mix(g, y, smoothstep(0.0, 0.5, dr));
  c = mix(c, b, smoothstep(0.5, 1.0, dr));
  return mix(c, k, smoothstep(1.05, 1.4, dr));
}
vec3 kGlut(float x) { // Glühfarbe (HDR) für 0..1: dunkelrot → orange → gelbweiß
  vec3 c = mix(vec3(0.0), vec3(0.55, 0.04, 0.0), smoothstep(0.0, 0.35, x));
  c = mix(c, vec3(1.4, 0.32, 0.03), smoothstep(0.3, 0.7, x));
  return mix(c, vec3(2.6, 1.3, 0.45), smoothstep(0.7, 1.0, x));
}
`;

function weltUniforms() {
  return {
    uDuerre: { value: 0 }, uGlut: { value: 0 }, uPegel: { value: 0 }, uSalz: { value: 0 }, uZeit: { value: 0 }, uWind: { value: 0.5 },
  };
}

/** Gelände-Material: Felsschichten, Wiesen-Patchwork mit Steinmauern, Meeresgrund (nass, Salzkruste), Glühen */
function gelaendeMaterial(u, { fels: nurFels = false } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.92, metalness: 0, flatShading: nurFels });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vKW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvKW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vKW; uniform float uDuerre, uGlut, uPegel, uSalz, uZeit;
${GLSL_NOISE}
${GLSL_WIESE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  vec3 W = vKW;
  vec3 Nw = normalize(cross(dFdx(W), dFdy(W)));
  if (Nw.y < 0.0) Nw = -Nw;
  float steil = ${nurFels ? '1.0' : '1.0 - smoothstep(0.42, 0.78, Nw.y)'};
  float dc = length(W.xz - cameraPosition.xz);
  // Felsschichten (Sandstein, Schiefer, Siltstein) mit Stufen
  float verz = kF(W.xz * 0.004) * 9.0 + kN(W.xz * 0.03) * 1.5;
  float lage = (W.y + verz) / 6.5;
  float typ = kH(vec2(floor(lage), 3.0));
  vec3 schiefer = vec3(0.13, 0.13, 0.14), sand = vec3(0.47, 0.40, 0.31), silt = vec3(0.29, 0.27, 0.25);
  vec3 fels = typ < 0.35 ? schiefer : (typ < 0.7 ? silt : sand);
  float fuge = smoothstep(0.92, 1.0, fract(lage)) + smoothstep(0.06, 0.0, fract(lage)) * 0.6;
  fels *= 0.82 + 0.3 * kN(vec2(W.x * 0.21 + W.z * 0.17, W.y * 0.9)) - fuge * 0.35;
  fels *= 0.9 + 0.14 * kF(vec2((W.x + W.z) * 0.08, W.y * 0.025));                   // Verwitterung, unregelmäßig
  fels = mix(fels, vec3(0.50, 0.50, 0.42), smoothstep(0.62, 0.8, kN(W.xy * 0.35 + W.zy * 0.2)) * 0.35 * (1.0 - smoothstep(0.6, 1.2, uDuerre))); // Flechten
  // Wiese: Felder (Zellen) mit Steinmauern, Ton je Feld
  vec2 q = mat2(0.87, -0.5, 0.5, 0.87) * W.xz / vec2(95.0, 70.0);
  vec2 z = kZelle(q);
  float mauer = (1.0 - smoothstep(0.012, 0.03, z.y - z.x)) * smoothstep(12.0, 40.0, dc) * smoothstep(40.0, 50.0, W.y);
  float feld = kH(floor(q + 0.5) + floor(z.x * 2.0));
  float v = 0.35 + 0.4 * feld + 0.25 * kN(W.xz * 0.35);
  float dr = uDuerre * (0.85 + 0.3 * kN(W.xz * 0.004 + 3.0));
  vec3 wiese = kWiese(v, dr) * (0.88 + 0.22 * kN(W.xz * 1.7));
  wiese = mix(wiese, vec3(0.47, 0.46, 0.43) * (0.8 + 0.3 * kN(W.xz * 2.0)), mauer * 0.85);
  // Meeresgrund: Sand, Fels, Tang; nass, Salzkruste nach dem Austrocknen
  float unter = 1.0 - smoothstep(-1.5, 1.5, W.y);
  vec3 grund = mix(vec3(0.40, 0.36, 0.29), vec3(0.24, 0.23, 0.22), smoothstep(0.4, 0.7, kF(W.xz * 0.01)));
  grund = mix(grund, vec3(0.13, 0.16, 0.10), smoothstep(0.55, 0.75, kN(W.xz * 0.05)) * 0.7);
  grund *= 0.85 + 0.25 * kN(W.xz * 0.6);
  float nass = 1.0 - smoothstep(uPegel, uPegel + 6.0, W.y);
  float salz = uSalz * smoothstep(uPegel + 2.0, uPegel + 30.0, W.y) * smoothstep(0.35, 0.65, kF(W.xz * 0.02 + 5.0));
  grund = mix(grund, vec3(0.74, 0.72, 0.67), salz * 0.6);
  vec3 c = mix(wiese, fels, steil);
  vec3 riff = mix(vec3(0.36, 0.34, 0.31), vec3(0.47, 0.43, 0.37), kF(W.xz * 0.04 + W.y * 0.05)) * (0.8 + 0.3 * kN(W.xz * 0.3));
  c = mix(c, mix(grund, riff, steil * 0.8), unter * (1.0 - smoothstep(-6.0, 2.0, W.y) * steil));
  c *= mix(1.0, 0.55, nass * unter);
  // Verkohlung des Felsens bei großer Hitze
  c *= 1.0 - 0.55 * smoothstep(0.1, 0.8, uGlut);
  diffuseColor.rgb = c;`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  {
    float muster = kF(W.xz * 0.02 + vec2(W.y * 0.04)) * 0.6 + kF(vec2(W.x - W.z, W.y * 2.0) * 0.03) * 0.4;
    float riss = 1.0 - smoothstep(0.0, 0.07, abs(kN(W.xz * 0.05 + W.y * 0.02) - 0.5));
    float g = uGlut * (0.55 + 0.6 * muster) + riss * smoothstep(0.15, 0.6, uGlut) * 0.35;
    g *= mix(0.75, 1.0, steil);                             // Wände glühen zuerst
    totalEmissiveRadiance += kGlut(clamp(g, 0.0, 1.0)) * smoothstep(0.02, 0.2, uGlut);
  }`);
  };
  return m;
}

// --------------------------------------------------------------------------------------------- Wasser
const WASSER_V = /* glsl */ `
varying vec3 vW;
#include <fog_pars_vertex>
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const WASSER_F = /* glsl */ `
uniform float zeit, kochen, pegel; uniform vec3 tief, flach, himmel, sonneDir, sonneFarbe; uniform sampler2D grundTex; uniform vec4 grundBox;
varying vec3 vW;
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
  float grund = (uvG.x > 0.0 && uvG.x < 1.0 && uvG.y > 0.0 && uvG.y < 1.0) ? texture2D(grundTex, uvG).r : -125.0;
  float tiefe = pegel - grund;
  float amp = (0.9 + kochen * 0.8) / (1.0 + d / 1400.0);
  vec2 g = welle(vW.xz, zeit, amp) + (vec2(kN(vW.xz * 0.04 + zeit * 0.25), kN(vW.zx * 0.04 - zeit * 0.2)) - 0.5) * (0.3 + kochen * 0.9) * amp;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float fres = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N);
  float s = max(dot(R, normalize(sonneDir)), 0.0);
  float funkel = smoothstep(0.45, 0.75, kN(vW.xz * 0.35 + vec2(zeit * 1.3, -zeit * 0.9)));   // stetig (kein Takt-Flackern)
  vec3 wasserF = mix(flach, tief, smoothstep(2.0, 30.0, tiefe));
  vec3 col = mix(wasserF, himmel, fres * 0.8) + sonneFarbe * (min(pow(s, 160.0) * 4.5 * (0.35 + 0.65 * funkel), 1.7) + pow(s, 30.0) * 0.28);
  // Brandung: Schaumbänder an der Küste, laufen auf das Ufer zu
  float ufer = 1.0 - smoothstep(0.0, 9.0, tiefe);
  float band = smoothstep(0.55, 0.95, sin(tiefe * 1.1 + zeit * 1.6 + kN(vW.xz * 0.05) * 4.0) * 0.5 + 0.5);
  float schaum = ufer * (0.45 + 0.55 * band) * smoothstep(0.35, 0.6, kN(vW.xz * 0.25 + zeit * 0.3));
  schaum += (1.0 - smoothstep(0.0, 1.6, tiefe)) * 0.8;
  // Schaumkronen draußen
  schaum += smoothstep(0.78, 0.95, kN(vW.xz * 0.02 + vec2(zeit * 0.05, -zeit * 0.08))) * smoothstep(0.7, 0.9, kN(vW.xz * 0.11 - zeit * 0.2)) * 0.6;
  // Kochen: aufsteigende Blasenfelder, Wasser wird trüb und weiß
  vec2 bz = kZelle(vW.xz * 0.12 + vec2(0.0, zeit * 0.4));
  float blase = (1.0 - smoothstep(0.0, 0.22, bz.x)) * smoothstep(0.4, 0.6, kN(vW.xz * 0.05 + vec2(zeit * 0.9, zeit * 0.6)));
  schaum += kochen * (blase * 0.9 + smoothstep(0.45, 0.8, kN(vW.xz * 0.06 + zeit * 0.7)) * 0.6);
  col = mix(col, mix(col, vec3(0.78, 0.80, 0.80), 0.5), kochen * 0.35);
  col = mix(col, vec3(0.92, 0.94, 0.95), clamp(schaum, 0.0, 1.0) * (1.0 - smoothstep(1500.0, 5000.0, d) * 0.6));
  gl_FragColor = vec4(col, 1.0);
#include <fog_fragment>
}`;

// --------------------------------------------------------------------------------------------- Himmel mit wachsender Sonne
const HIMMEL_V = /* glsl */ `
varying vec3 vDir;
void main() { vDir = (modelMatrix * vec4(position, 0.0)).xyz; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const HIMMEL_F = /* glsl */ `
uniform vec3 zenit, horizont, unten, sonnenRichtung, sonnenFarbe, milchFarbe, oberflaecheA, oberflaecheB;
uniform float sonnenWinkel, sonnenHell, korona, glanz, dunst, milch, zirren, zeit, flaeche, helligkeit;
varying vec3 vDir;
${GLSL_NOISE}
float granulation(vec2 p, float t) {
  vec2 z1 = kZelle(p + vec2(kN(p * 0.5 + t * 0.15), kN(p * 0.5 - t * 0.12)) * 0.6);
  float zelle = (0.45 + 0.55 * (1.0 - smoothstep(0.0, 0.75, z1.x))) * smoothstep(0.0, 0.16, z1.y - z1.x);   // gewölbte helle Granulen, schmale dunkle Bahnen
  return zelle * (0.8 + 0.2 * kN(p * 3.0 + t));
}
vec3 oberflaeche(vec2 p, float t, float mu) {
  float g = granulation(p * 1.0, t) * 0.6 + granulation(p * 3.1 + 11.0, t * 1.3) * 0.4;
  float flecken = smoothstep(0.78, 0.86, kF(p * 0.13 + 3.0)) * 0.7;               // Fackeln/Flecken in großem Maßstab
  vec3 c = mix(oberflaecheA, oberflaecheB, g);
  c *= 1.0 - flecken * 0.6;
  c *= 0.35 + 0.65 * pow(mu, 0.55);                                                // Randverdunklung
  c = mix(c * vec3(1.0, 0.75, 0.55), c, mu);
  return c;
}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float g = 1.0 - exp(-max(h, 0.0) / max(dunst, 1e-3));
  vec3 col = mix(horizont, zenit, g);
  col = mix(col, unten, smoothstep(0.0, -0.08, h));
  if (zirren > 0.0 && h > 0.02) {
    vec2 q = d.xz / (h + 0.06);
    float w = kF(vec2(q.x * 0.5 + zeit * 0.004, q.y * 3.5 + 3.0));
    col = mix(col, vec3(0.93, 0.94, 0.96), smoothstep(0.55, 0.85, w) * smoothstep(0.02, 0.25, h) * zirren);
  }
  col = mix(col, milchFarbe, milch * (0.55 + 0.45 * (1.0 - smoothstep(0.0, 0.6, h))));
  vec3 s = normalize(sonnenRichtung);
  float R = sonnenWinkel;
  float ang = acos(clamp(dot(d, s), -1.0, 1.0));
  float aussen = max(ang - R, 0.0);
  // Glanz in der Atmosphäre (wächst mit der Scheibe) und Korona
  col += sonnenFarbe * (exp(-aussen / (0.05 + R * 0.6)) * glanz + exp(-aussen / (0.012 + R * 0.12)) * korona);
  vec3 e1 = normalize(cross(s, abs(s.y) > 0.95 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0))), e2 = cross(e1, s);
  float um = atan(dot(d, e2), dot(d, e1));
  // Protuberanzen und Strahlen am Rand
  float flamm = kF(vec2(um * 9.0, aussen / max(R, 1e-3) * 5.0 - zeit * 0.25));
  float prot = smoothstep(0.55, 0.85, flamm) * (1.0 - smoothstep(0.0, R * 0.22 + 0.002, aussen)) * smoothstep(0.004, 0.03, R);
  col += vec3(1.6, 0.55, 0.12) * prot * korona * 1.5;
  float strahl = pow(kN(vec2(um * 6.0, 0.3)), 3.0) * exp(-aussen / (0.03 + R * 0.9));
  col += sonnenFarbe * strahl * korona * 0.6;
  // Scheibe
  float rho = clamp(ang / max(R, 1e-5), 0.0, 1.0);
  float mu = sqrt(max(1.0 - rho * rho, 0.0));
  vec2 p = vec2(dot(d, e1), dot(d, e2)) / max(sin(min(R, 1.5)), 1e-4);
  vec2 qs = p / (0.3 + 0.7 * mu) * 22.0;
  vec3 surf = oberflaeche(qs, zeit, mu);
  float hellK = mix(1.0, 0.0, smoothstep(0.004, 0.03, R));                         // klein: gleißend weiß, groß: Struktur sichtbar
  vec3 scheibe = mix(surf, sonnenFarbe * 1.0, hellK) * sonnenHell;
  float rand = smoothstep(R * 1.0 + 0.0008, R * 0.985 - 0.0004, ang);
  col = mix(col, scheibe, rand);
  // Fläche: Blick auf die Sonnenoberfläche (nach der Ankunft)
  if (flaeche > 0.001) {
    vec2 f = 3.2 * vec2(atan(d.x, -d.z) * 6.0, d.y * 6.0 / (0.4 + 0.6 * sqrt(max(1.0 - d.y * d.y, 0.0))));
    vec3 o = oberflaeche(f + vec2(zeit * 0.05, 0.0), zeit * 1.4, 1.0) * sonnenHell;
    float filament = smoothstep(0.62, 0.8, kF(f * 0.35 + vec2(zeit * 0.08, -zeit * 0.05)));
    o += vec3(1.5, 0.6, 0.15) * filament * 0.5;
    o *= 0.8 + 0.35 * kF(f * 0.08 + vec2(zeit * 0.03, 0.0));                       // großräumiges Wogen
    col = mix(col, o, flaeche);
  }
  gl_FragColor = vec4(col * helligkeit, 1.0);
}`;

export class SonnenHimmel {
  constructor(szene, { radius = 9000, zenit = "#6F8DBE", horizont = "#C5CDD6", unten = "#7E8A90", sonnenRichtung = [-0.1, 0.19, -0.98], sonnenFarbe = "#FFF2DC" } = {}) {
    const C = (c) => new THREE.Color(c);
    this.u = {
      zenit: { value: C(zenit) }, horizont: { value: C(horizont) }, unten: { value: C(unten) }, sonnenRichtung: { value: new THREE.Vector3(...sonnenRichtung).normalize() },
      sonnenFarbe: { value: C(sonnenFarbe) }, milchFarbe: { value: C("#EDEDEA") }, oberflaecheA: { value: new THREE.Color(0.5, 0.1, 0.0) }, oberflaecheB: { value: new THREE.Color(1.0, 0.62, 0.2) },
      sonnenWinkel: { value: 0.0047 }, sonnenHell: { value: 30 }, korona: { value: 0.6 }, glanz: { value: 0.55 }, dunst: { value: 0.2 }, milch: { value: 0 },
      zirren: { value: 0.4 }, zeit: { value: 0 }, flaeche: { value: 0 }, helligkeit: { value: 1 },
    };
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), new THREE.ShaderMaterial({ vertexShader: HIMMEL_V, fragmentShader: HIMMEL_F, uniforms: this.u, side: THREE.BackSide, depthWrite: false, fog: false }));
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

// --------------------------------------------------------------------------------------------- Gras-Halme vor der Kamera
function halmGeo() {
  // 3 Abschnitte, verjüngt, leicht gekrümmt; Attribut lpH = Höhe 0..1 (für Wind und Farbe)
  const pos = [], hh = [];
  const B = [0.012, 0.009, 0.005, 0.0];
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
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.85, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
attribute float lpH; attribute vec2 lpZ; uniform float uZeit, uWind, uDuerre, uGlut; varying float vH; varying vec2 vZ;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
  vH = lpH; vZ = lpZ;
  float brand = smoothstep(1.15 + lpZ.x * 0.2, 1.45 + lpZ.x * 0.15, uDuerre);
  transformed.y *= 1.0 - 0.75 * brand;                                    // verbrennt und sackt zusammen
  transformed.y *= 1.0 - 0.25 * smoothstep(0.6, 1.1, uDuerre) * lpZ.y;     // welkt
  float w = (sin(uZeit * (1.7 + lpZ.y) + lpZ.x * 30.0 + instanceMatrix[3].x * 0.7) * 0.6 + sin(uZeit * 3.1 + instanceMatrix[3].z * 1.3) * 0.3) * uWind;
  transformed.x += (w * 0.18 + 0.05) * lpH * lpH;
  transformed.z += (0.05 * w) * lpH * lpH;`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying float vH; varying vec2 vZ; uniform float uDuerre, uGlut;
${GLSL_WIESE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  vec3 c = kWiese(0.3 + 0.6 * vZ.y, uDuerre * (0.85 + 0.3 * vZ.x));
  c *= 0.55 + 0.6 * vH;
  diffuseColor.rgb = c;`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  float brennt = smoothstep(1.1, 1.3, uDuerre * (0.9 + 0.2 * vZ.x)) * (1.0 - smoothstep(1.35, 1.5, uDuerre * (0.9 + 0.2 * vZ.x)));
  totalEmissiveRadiance += kGlut(0.65 + 0.3 * vH) * brennt * smoothstep(0.3, 0.9, vH) + kGlut(0.4) * uGlut * 0.25 * (1.0 - vH);`);
  };
  return m;
}

// --------------------------------------------------------------------------------------------- Welt
export class KuesteKlippe {
  constructor(szene, { kueste = KUESTE_ATLANTIK, schatten = true, sonne = [-0.1, 0.19, -0.98], halme = 16000, seed = 7 } = {}) {
    this.szene = szene;
    this.K = new Kuestenlinie(kueste.punkte);
    this.G = gelaende(this.K, kueste.hoehe);
    this.u = weltUniforms();
    this.augeY = this.G.hoehe(0, 0) + 1.6;
    const H = this.G.hoehe;

    // Gelände: Gitter mit wachsendem Abstand (fein nahe der Kamera)
    const achse = (von, bis, a, k) => { const out = []; let x = 0; while (x < bis) { out.push(x); x += a + k * x; } const neg = []; x = 0; while (x > von) { x -= a + k * -x; neg.push(x); } return [...neg.reverse(), ...out]; };
    const xs = achse(-3200, 4800, 0.9, 0.011), zs = achse(-18000, 900, 0.9, 0.0105).filter((z) => z < 900);
    const nx = xs.length, nz = zs.length;
    const pos = new Float32Array(nx * nz * 3);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = (j * nx + i) * 3; pos[k] = xs[i]; pos[k + 1] = H(xs[i], zs[j]); pos[k + 2] = zs[j]; }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0;
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.set([a, c, b, b, c, d], q); q += 6; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals();
    this.boden = new THREE.Mesh(geo, gelaendeMaterial(this.u));
    this.boden.receiveShadow = schatten; this.boden.castShadow = false;   // flache Sonne: kein Schatten-Akne-Streifen auf dem Gelände this.boden.frustumCulled = false;
    szene.add(this.boden);
    this.vertices = nx * nz;
    // Ferne Ebenen (Meeresgrund und Hinterland jenseits des Gitters)
    const fern = new THREE.Mesh(new THREE.PlaneGeometry(120000, 120000, 240, 240).rotateX(-Math.PI / 2), gelaendeMaterial(this.u));
    fern.position.set(0, -126, 0); szene.add(fern); this.fern = fern;

    // Grund als Textur für das Wasser (Brandung und Farbe nach Tiefe)
    const GB = [-1600, -9500, 4200, 10400], TW = 384, TH = 512, td = new Uint16Array(TW * TH * 4);
    for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
      const x = GB[0] + (i + 0.5) / TW * GB[2], z = GB[1] + (j + 0.5) / TH * GB[3];
      const y = H(x, z); const k = (j * TW + i) * 4;
      td[k] = THREE.DataUtils.toHalfFloat(y); td[k + 1] = td[k + 2] = 0; td[k + 3] = THREE.DataUtils.toHalfFloat(1);
    }
    const tex = new THREE.DataTexture(td, TW, TH, THREE.RGBAFormat, THREE.HalfFloatType);
    tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
    this.wasserU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      zeit: { value: 0 }, kochen: { value: 0 }, pegel: { value: 0 }, tief: { value: new THREE.Color("#1D3A46") }, flach: { value: new THREE.Color("#3F7C7A") },
      himmel: { value: new THREE.Color("#B8C4D2") }, sonneDir: { value: new THREE.Vector3(...sonne).normalize() }, sonneFarbe: { value: new THREE.Color("#FFF0D8") },
      grundTex: { value: null }, grundBox: { value: new THREE.Vector4(...GB) },
    }]);
    this.wasserU.grundTex.value = tex;
    this.wasser = new THREE.Mesh(new THREE.PlaneGeometry(120000, 120000, 480, 480).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ vertexShader: WASSER_V, fragmentShader: WASSER_F, uniforms: this.wasserU, fog: true }));
    szene.add(this.wasser);

    // Gras-Halme vor der Kamera (nur Land)
    const hg = halmGeo();
    const zz = new Float32Array(halme * 2);
    const halmM = new THREE.InstancedMesh(hg, halmMaterial(this.u), halme);
    const mm = new THREE.Matrix4(), qq = new THREE.Quaternion(), ss = new THREE.Vector3(), pp = new THREE.Vector3(), yA = new THREE.Vector3(0, 1, 0);
    let n = 0;
    for (let i = 0; n < halme && i < halme * 6; i++) {
      const x = -6 + 17 * hash(i, seed), z = -10 + 9.4 * hash(i, seed + 1);
      const d = this.K.abstand(x, z);
      if (d < 0.05 + 0.15 * hash(i, seed + 9)) continue;
      const nahKante = 1 - smoothstep(0.1, 1.5, d);
      const h = (0.13 + 0.26 * hash(i, seed + 2) ** 1.5) * (1 + 0.5 * nahKante) * (0.7 + 0.6 * vn(x * 0.8, z * 0.8));
      pp.set(x, H(x, z) - 0.02, z); qq.setFromAxisAngle(yA, hash(i, seed + 3) * 6.28);
      const neig = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (hash(i, seed + 4) - 0.5) * 0.5 - nahKante * 0.25);
      qq.multiply(neig); ss.set(1 + hash(i, seed + 5), h, 1);
      mm.compose(pp, qq, ss); halmM.setMatrixAt(n, mm); zz[n * 2] = hash(i, seed + 6); zz[n * 2 + 1] = hash(i, seed + 7); n++;
    }
    halmM.count = n; hg.setAttribute("lpZ", new THREE.InstancedBufferAttribute(zz, 2));
    halmM.castShadow = false; halmM.receiveShadow = schatten; halmM.frustumCulled = false;
    szene.add(halmM); this.halme = halmM;

    // Grasnelken (Polster mit Blüten) und Felsbrocken an der Kante
    const steinGeo = new THREE.IcosahedronGeometry(1, 1); const sp = steinGeo.getAttribute("position");
    for (let i = 0; i < sp.count; i++) { const f = 0.75 + 0.45 * hash(i, 31); sp.setXYZ(i, sp.getX(i) * f, sp.getY(i) * f * 0.7, sp.getZ(i) * f); }
    steinGeo.computeVertexNormals();
    const steinM = gelaendeMaterial(this.u, { fels: true });
    const steine = new THREE.InstancedMesh(steinGeo, steinM, 1100); let ns = 0;
    for (let i = 0; i < 4000 && ns < 690; i++) {   // Kante nah: kleine Brocken; Wandfuß: große Blöcke
      let x, z, r, y;
      if (i < 600) { x = -8 + 22 * hash(i, 41); z = -12 + 11 * hash(i, 42); const d = this.K.abstand(x, z); if (d < -0.3 || d > 1.2) continue; r = 0.06 + 0.17 * hash(i, 43) ** 2; y = H(x, z) - r * 0.3; }
      else { z = -1500 * hash(i, 44) ** 1.6 - 5; const xc = this.K.x(z); x = xc - (6 + 40 * hash(i, 45) ** 2); r = 0.8 + 2.4 * hash(i, 46) ** 2 * (1 + Math.abs(z) / 1000); y = H(x, z) + r * 0.2; if (Math.abs(this.K.abstand(x, z)) < 1.5) continue; }
      pp.set(x, y, z); qq.setFromEuler(new THREE.Euler(hash(i, 47) * 3, hash(i, 48) * 6, hash(i, 49) * 3)); ss.setScalar(r);
      mm.compose(pp, qq, ss); steine.setMatrixAt(ns++, mm);
    }
    // Felsnadeln (Brandungspfeiler) vor den Landzungen: zerklüftete Säulen mit Schichten (Fels-Material, Schichten nach Welthöhe)
    const nadelGeo = new THREE.CylinderGeometry(0.82, 1.0, 1, 10, 8); nadelGeo.translate(0, 0.5, 0);
    { const np = nadelGeo.getAttribute("position");
      for (let i = 0; i < np.count; i++) { const x = np.getX(i), y = np.getY(i), z = np.getZ(i), w = Math.atan2(z, x);
        const f = 1 + 0.22 * (vn(w * 2.2 + 3, y * 5) - 0.5) * 2 + 0.12 * Math.sin(y * 23 + w * 3) * (y < 0.98 ? 1 : 0);
        np.setXYZ(i, x * f, y < 0.99 ? y : 1 + 0.06 * vn(x * 4, z * 4), z * f); }
      nadelGeo.computeVertexNormals(); }
    const NADELN = [[-905, -55, 52, 16], [-930, -28, 30, 9], [-2390, -60, 64, 22], [-2440, -110, 40, 13], [-5560, -90, 70, 30], [-470, -70, 24, 8], [-760, -150, 46, 14], [-1650, -180, 38, 12]];
    const nadeln = new THREE.InstancedMesh(nadelGeo, steinM, NADELN.length);
    NADELN.forEach(([sz, off, hoch, br], i) => { const x = this.K.x(sz) + off, y0 = H(x, sz) - 4; pp.set(x, y0, sz); qq.setFromEuler(new THREE.Euler(0, hash(i, 3) * 6, 0)); ss.set(br, 62 * (hoch / 52) + (-y0) * 0 + hoch - y0 * 0 - y0 * 0, br * 0.85);
      ss.y = hoch - y0 + 4; mm.compose(pp, qq, ss); nadeln.setMatrixAt(i, mm); });
    nadeln.castShadow = schatten; nadeln.receiveShadow = schatten; nadeln.frustumCulled = false; szene.add(nadeln); this.nadeln = nadeln;
    for (let i = 0; i < 3000 && ns < 1100; i++) {   // Blöcke und Riffköpfe auf dem Meeresgrund (sichtbar, wenn das Meer fällt)
      const z = -60 - 2600 * hash(i, 141) ** 1.3, x = this.K.x(z) - 30 - (150 + Math.abs(z) * 0.6) * hash(i, 142);
      if (this.K.abstand(x, z) > -20) continue;
      const r = (1.5 + 6 * hash(i, 143) ** 2) * (1 + Math.abs(z) / 1500);
      pp.set(x, H(x, z) + r * 0.15, z); qq.setFromEuler(new THREE.Euler(hash(i, 144) * 3, hash(i, 145) * 6, hash(i, 146) * 3)); ss.set(r, r * (0.5 + 0.6 * hash(i, 147)), r * 1.2);
      mm.compose(pp, qq, ss); steine.setMatrixAt(ns++, mm);
    }
    steine.count = ns; steine.castShadow = schatten; steine.receiveShadow = schatten; steine.frustumCulled = false; szene.add(steine); this.steine = steine;
    const bluete = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: "#D98AA6", roughness: 0.8 }), 260); let nb = 0;
    for (let i = 0; i < 3000 && nb < 260; i++) {
      const x = -6 + 17 * hash(i, 51), z = -10 + 9.4 * hash(i, 52), d = this.K.abstand(x, z);
      if (d < 0.1 || d > 2.6 || vn(x * 1.3, z * 1.3) < 0.55) continue;
      const r = 0.011 + 0.009 * hash(i, 53); pp.set(x, H(x, z) + 0.06 + 0.09 * hash(i, 54), z); ss.setScalar(r); mm.compose(pp, qq.identity(), ss); bluete.setMatrixAt(nb++, mm);
    }
    bluete.count = nb; szene.add(bluete); this.bluete = bluete; this.blueteFarbe = new THREE.Color("#D98AA6");

    // Möwen: nah (hell, vor dem Meer), fern (dunkel)
    this.moewen = new Voegel(szene, { anzahl: 26, seed: 93, farbe: "#E9ECEC", spannweite: 1.3 });
    this.moewen.schwarm({ zentrum: [-20, this.augeY - 12, -90], radius: 45, hoehe: 22, tempo: 7, anzahl: 9, skala: 1.0 });
    this.moewen.schwarm({ zentrum: [40, this.augeY - 30, -260], radius: 70, hoehe: 30, tempo: 8, anzahl: 9, skala: 1.4 });
    this.moewen.schwarm({ zentrum: [10, this.augeY + 6, -40], radius: 22, hoehe: 8, tempo: 6, anzahl: 5, skala: 0.9 });
    this.krähen = new Voegel(szene, { anzahl: 18, seed: 95, farbe: "#2A2D31", spannweite: 1.2 });
    this.krähen.schwarm({ zentrum: [-60, this.augeY + 40, -700], radius: 120, hoehe: 40, tempo: 9, anzahl: 12, skala: 2.4 });
    this.krähen.schwarm({ zentrum: [120, this.augeY + 20, -420], radius: 60, hoehe: 20, tempo: 8, anzahl: 6, skala: 1.8 });

    // Dampf-Quellen über dem Meer (feste Orte im sichtbaren Bereich), Rauch über den Wiesen
    this.dampfQ = [];
    for (let i = 0; i < 230; i++) {
      const z = -60 - 5200 * hash(i, 61) ** 1.5, xc = this.K.x(z), x = xc - 15 - (300 + Math.abs(z) * 0.5) * hash(i, 62) ** 0.8;
      this.dampfQ.push({ x, z, ph: hash(i, 63), r: 14 + Math.abs(z) * 0.035 + 18 * hash(i, 64), b: i % 4 });
    }
    this.rauchQ = [];
    for (let i = 0; i < 60; i++) {
      const z = -150 - 3400 * hash(i, 71), xc = this.K.x(z), x = xc + 20 + 500 * hash(i, 72);
      this.rauchQ.push({ x, y: H(x, z), z, ph: hash(i, 73), r: 10 + Math.abs(z) * 0.012, b: i % 4 });
    }
    this.wolkenQ = [];
    for (let w = 0; w < 14; w++) {
      const cx = -5000 + 9000 * hash(w, 81), cz = -5000 - 14000 * hash(w, 82), cy = 650 + 700 * hash(w, 83), g = 220 + 260 * hash(w, 84);
      for (let k = 0; k < 9; k++) { const i = w * 16 + k, ux = (hash(i, 85) - 0.5) * 3.4, uz = (hash(i, 86) - 0.5) * 1.4, uy = hash(i, 87) * 0.7 * (1 - Math.min(1, Math.abs(ux) / 1.8));
        this.wolkenQ.push({ x: cx + ux * g, y: cy + uy * g * 0.55, z: cz + uz * g, r: g * (0.5 + 0.35 * hash(i, 88)), dreh: hash(i, 89) * 6.28, b: Math.floor(hash(i, 90) * 4) }); }
    }
    this.himmel = new SonnenHimmel(szene, { sonnenRichtung: sonne });
  }

  /** Höhe des Geländes (m) */
  hoehe(x, z) { return this.G.hoehe(x, z); }

  setze(t, kamera, w = {}) {
    const u = this.u;
    u.uZeit.value = t; u.uDuerre.value = w.duerre ?? 0; u.uGlut.value = w.glut ?? 0; u.uPegel.value = w.pegel ?? 0; u.uSalz.value = w.salz ?? 0; u.uWind.value = w.wind ?? 0.5;
    const W = this.wasserU;
    W.zeit.value = t; W.kochen.value = w.kochen ?? 0; W.pegel.value = w.pegel ?? 0;
    if (w.himmelFarbe) W.himmel.value.copy(w.himmelFarbe);
    if (w.sonneDir) W.sonneDir.value.set(...w.sonneDir).normalize();
    if (w.sonneFarbe) W.sonneFarbe.value.copy(w.sonneFarbe);
    this.wasser.position.y = w.pegel ?? 0;
    this.wasser.visible = (w.pegel ?? 0) > -124;
    const an = w.sichtbar !== false;
    for (const o of [this.boden, this.fern, this.halme, this.steine, this.nadeln, this.bluete, this.moewen.mesh, this.krähen.mesh]) o.visible = an;
    if (!an) this.wasser.visible = false;
    this.bluete.visible = an && (w.duerre ?? 0) < 0.9;
    this.bluete.material.color.copy(this.blueteFarbe).lerp(new THREE.Color("#6B4A3A"), smoothstep(0.3, 0.85, w.duerre ?? 0));
    this.moewen.setze(t); this.krähen.setze(t);
    this.himmel.folge(kamera);
    return this;
  }

  puffs(t, { dampf = 0, wolken = 1, rauch = 0, wolkenFarbe = [0.95, 0.95, 0.94], dampfFarbe = [0.93, 0.94, 0.95] } = {}) {
    const out = [];
    if (wolken > 0.01) for (const q of this.wolkenQ) out.push({ p: [q.x + 6 * t, q.y, q.z + 2 * t], r: q.r, dreh: q.dreh, farbe: wolkenFarbe, a: 0.85 * wolken, licht: 1, bild: q.b });
    if (dampf > 0.01) for (const q of this.dampfQ) {
      for (let k = 0; k < 2; k++) {
        const leben = 5, tau = ((t + q.ph * leben + k * 2.5) % leben) / leben;
        const steig = q.r * (0.4 + 3.2 * tau);
        out.push({ p: [q.x + 3 * t * 0.3 + tau * q.r * 0.6, (this.wasser.position.y) + 2 + steig, q.z], r: q.r * (0.7 + 1.6 * tau) * (0.6 + 0.6 * dampf), dreh: q.ph * 6 + tau, farbe: dampfFarbe,
          a: dampf * 0.28 * smoothstep(0, 0.15, tau) * (1 - smoothstep(0.55, 1, tau)), licht: 0.95, bild: (q.b + k) % 4 });
      }
    }
    if (rauch > 0.01) for (const q of this.rauchQ) {
      const leben = 6, tau = ((t + q.ph * leben) % leben) / leben;
      out.push({ p: [q.x + tau * q.r * 2, q.y + q.r * (0.5 + 4 * tau), q.z], r: q.r * (0.8 + 2 * tau), dreh: q.ph * 6, farbe: [0.22, 0.2, 0.19], a: rauch * 0.5 * smoothstep(0, 0.15, tau) * (1 - smoothstep(0.5, 1, tau)), licht: 0.7, bild: q.b });
    }
    return out;
  }
}
