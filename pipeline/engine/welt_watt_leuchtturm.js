// Welt „Wattenmeer mit Leuchtturm“ (Account 2 @stelldirvor.pov, Weltenkatalog „Küste / Watt“), Erstbau 10.11.2026 (Opus-Neubau).
// NUR für den Baukasten Lunar-POV. Alles prozedural, reine Funktion von t (kein Zustand von Bild zu Bild, Zufall nur über hash() mit festem Startwert).
//
// STANDPUNKT: Galerie eines rot-weiß geringelten Leuchtturms (Vorbild Westerheversand, Eiderstedt, Nordsee), Augenhöhe ≈ 39,6 m über dem Watt.
// Im Vordergrund Gitterboden, Geländer mit Stäben und Handlauf, Tau, Windmesser; Laterne mit Linse, rote Kuppel und Wetterfahne hinter der Kamera.
// INHALT: Wattenmeer mit verzweigten Prielen (glänzender nasser Schlick, Spiegelung des Himmels über einen Reflector, Gezeiten über pegel),
// Lahnungsfelder, Salzwiese mit Queller (rot), Andel (grün-oliv), Grüppen und Salzwiesenprielen, Warft des Turms mit zwei Wärterhäusern,
// Holzsteg zum Deich, Deich mit Schafen (Instanzen, grasen), Koog mit Feldern, Gräben, Silageballen, Warften-Dorf (≈ 24 Reetdachhäuser,
// Kirche mit Turm, Bäume, Laternen, warme Fenster) und Einzelhöfe, Pricken entlang der Priele, Krabbenkutter, Möwen (nah hell, fern dunkel),
// Horizont mit Pellworm, Hallig, Amrum, Leuchtfeuern und Windparks (rote Blinklichter). Himmel „WattHimmel“: Abenddämmerung ↔ Nacht mit
// Sternen ↔ Morgengrauen im Osten, ziehende Wolkenfelder, Polarlicht mit fünf getrennten Reglern, drehender Leuchtfeuer-Strahl (Periode 7 s).
//
// ===================================================================================================== API (vollständig)
// Koordinaten: Meter, y oben, Mittelwasser y = 0, Turmachse bei (0, 0). Süden = −z, Westen = +x, Norden = +z, Osten = −x (wie welt_polar_fjord.js).
// Gierwinkel „yaw“ in Grad: 0 = Süden, +90 = Westen, ±180 = Norden, −90 = Osten. pitch + = nach oben. richtung(yaw, pitch) → [x, y, z].
//
//   import { WattLeuchtturm, WattHimmel, richtung, hoehe, marschD, deichZ, TURM, ORTE, wasserStand } from "../../engine/welt_watt_leuchtturm.js";
//   TURM = { galerie: 38.0 (Boden), auge: 39.6, rAuge: 2.45, rGelaender: 3.48, lampe: [0, 40.4, 0], periode: 7 }
//   ORTE = { turm, dorf, kirche, deich, kutter, hallig, pellworm, amrum, windpark, sued } – [x, y, z] als Blickziele
//   hoehe(x, z) → sichtbare Bodenhöhe (Deich, Koog, Warften; Watt/Salzwiese = 0)     deichZ(x) → z der Deichkrone     marschD(x, z) > 0 Salzwiese
//   wasserStand(pegel) → Wasserspiegel (m) im Shader-Höhenmodell des Watts (−1,5 … +1,5)
//
//   const welt = new WattLeuchtturm(szene, {
//     schatten = 2048 (Schattenkarte, 0 = aus; Buehne braucht schatten: true), spiegel = 0.5 (Auflösungsanteil der Spiegelung, ≤ 0,5),
//     nebelDichte = 2.6e-5, schafe = 300, moewen = 34 });
//   welt.update(t, {                               // alles optional; jeder Wert wirkt sofort (kein Gedächtnis)
//     kamera,                                      // THREE.PerspectiveCamera – VOR update setzen (Himmel folgt, Schatten, LOD der Schafe, Punktgrößen)
//     dunkel = 1,                                  // 0 späte Abenddämmerung (blau-orange, Glut im Südwesten) … 1 tiefe Nacht mit Sternen
//     morgen = 0,                                  // 0 … 1 erstes Morgengrauen im Osten (Südost-Glut, Sterne verblassen)
//     wolken = 0.5,                                // 0 klar … 1 dicht; Wolken ziehen (fest 12 m/s aus WSW), Aufreißen = wolken im Verlauf senken
//     wind = 0.5,                                  // Kräuseln der Priele, Wiegen von Gras/Tau, Möwenflug
//     pegel = 0.3,                                 // 0 Watt trocken (nur tiefe Priele führen Wasser) … 1 Hochwasser (Watt überflutet, Salzwiesen-Rand nass)
//     plNord = 0, plRot = 0, plKrone = 0,          // Polarlicht: grüner Saum/Bogen im Norden · rote und violette Bögen über dem Watt · Korona im Zenit
//     plSued = 0, plHelle = 0,                     // roter Südhimmel mit Strahlen · Licht so stark, dass Landschaft farbig angeleuchtet wird (Schatten, Konturen)
//     strahl = 1,                                  // Stärke des Leuchtfeuers (0 = aus)
//     moewen = 1, tempo = 1 })                     // Anteil sichtbarer Möwen · Tempo von Schafen, Möwen, Wolkenzug (Zeitraffer z. B. 0,3)
//   welt.augePos(t, yaw = 180) → [x, y, z]         Auge auf der Galerie in Blickrichtung yaw (man steht am Geländer; schwenkt die Kamera,
//                                                  wandert das Auge mit um die Laterne), inkl. sehr leichtem Wind-Wiegen (mm, ohne Wackeln)
//   welt.dorfPos      → [x, y, z]                  Blickziel Warften-Dorf (Kirchwarft)
//   welt.dorfAugePos  → [x, y, z]                  zweiter Standpunkt am Nordrand des Dorfes (Straße, 1,7 m), Blick nach Süden/oben über die Dächer
//   welt.dorfBlick    → { yaw, pitch, fov }        empfohlene Blickrichtung dazu (harter Schnitt)
//   welt.post         → Empfehlung für Buehne-post { belichtung, saettigung, kontrast, tonung, tonungStaerke, bloomStaerke, bloomSchwelle, vignette }
//   welt.lichter      → { key (DirectionalLight mit Schatten), hemi, laterne (PointLight), dorf (PointLight) } – nach update frei überschreibbar
//   welt.zustand      → zuletzt berechnete Werte { strahlWinkel (rad), aurFarbe [r,g,b], licht }
//   welt.vertices     → Eckpunkte aller Meshes (Instanzen mitgezählt)
//
// Szenen-Muster (siehe pipeline/projekte/_welttest_watt/szene.js):
//   aktiviereHoehenNebel({ abfall: 0.0012, basis: 0 }); const welt = new WattLeuchtturm(szene, { schatten: 2048 });
//   update(t) { kam.position.set(...welt.augePos(t, yaw)); kam.lookAt(…richtung(yaw, pitch)…); welt.update(t, { kamera: kam, dunkel, plNord, … });
//               Object.assign(post, welt.post) }
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { GLSL_NOISE } from "./welt_feld_wald.js";
import { sammle, zweig } from "./welt_waldlichtung.js";
import { Voegel } from "./stil_lunar_pov.js";
import { richtung } from "./welt_polar_fjord.js";
export { richtung };

const D2R = Math.PI / 180;
const C = (h) => new THREE.Color(h);
const fr = (x) => x - Math.floor(x);
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 17.1; a *= 0.5; } return s; }

// ----------------------------------------------------------------------------------------------- Lage (JS und GLSL gleich)
export const TURM = { galerie: 38.0, auge: 39.6, rAuge: 2.45, rGelaender: 3.48, lampe: [0, 40.4, 0], periode: 7, warft: 4.0 };
export const kanteN = (x) => 120 + 70 * Math.sin(x * 0.0016 + 1.0) + 45 * Math.sin(x * 0.0047 + 2.0) + 20 * Math.sin(x * 0.013 + 0.5);
export const kanteW = (z) => 420 + 120 * Math.sin(z * 0.0021 + 0.3) + 40 * Math.sin(z * 0.007 + 1.1);
export const deichZ = (x) => { const w = Math.max(x - 300, 0); return -950 + 60 * Math.sin(x * 0.0009) - 0.00012 * w * w; };
export const marschD = (x, z) => Math.min(kanteN(x) - z, kanteW(z) - x);
export const wasserStand = (pegel) => -1.5 + 3.0 * pegel;
const GLSL_GEO = /* glsl */ `
float kanteN(float x) { return 120.0 + 70.0 * sin(x * 0.0016 + 1.0) + 45.0 * sin(x * 0.0047 + 2.0) + 20.0 * sin(x * 0.013 + 0.5); }
float kanteW(float z) { return 420.0 + 120.0 * sin(z * 0.0021 + 0.3) + 40.0 * sin(z * 0.007 + 1.1); }
float marschD(vec2 p) { return min(kanteN(p.x) - p.y, kanteW(p.y) - p.x); }`;

/** Deichprofil: n = Abstand quer zur Krone (m, + = seewärts/Norden) → Höhe (m) */
function deichProfil(n) {
  if (n >= 0) return n < 1.8 ? 8.6 : Math.max(8.6 - (n - 1.8) / 7.5, -0.6);
  const m = -n;
  if (m < 1.8) return 8.6;
  if (m < 25) return 8.6 - (m - 1.8) / 3.0;
  if (m < 31) return 0.9;
  const g = (m - 34) / 3; if (Math.abs(g) < 1) return 0.9 - 0.8 * (1 - g * g);
  return 0.85;
}
function deichNormale(x) { const dz = (deichZ(x + 1) - deichZ(x - 1)) / 2, l = Math.hypot(1, dz); return [-dz / l, 1 / l]; }
/** Punkt am Deich: x entlang, n quer (+ seewärts) → [x, y, z] */
export function deichPunkt(x, n) { const [nx, nz] = deichNormale(x); return [x + nx * n, deichProfil(n), deichZ(x) + nz * n]; }

// Warften: [x, z, Radius, Höhe] – Dorf (Kirchwarft zuerst) und Einzelhöfe im Koog
const WARFTEN = [[-250, -1450, 72, 4.6], [-70, -1385, 36, 3.8], [-470, -1530, 42, 4.0], [-150, -1660, 46, 4.2], [-390, -1305, 30, 3.6], [60, -1570, 32, 3.8], [-640, -1400, 30, 3.4], [-310, -1790, 36, 3.8]];
for (let i = 0; i < 16; i++) {
  const a = -2.6 + 3.4 * hash(i, 901), r = 1900 + 5200 * hash(i, 902), x = -250 + Math.sin(a) * r, z = -1450 - Math.abs(Math.cos(a)) * r * 0.8 - 300;
  if (z > deichZ(x) - 250) continue;
  WARFTEN.push([x, z, 30 + 12 * hash(i, 903), 3.0 + hash(i, 904)]);
}
const strasseX = (z) => -240 + 14 * Math.sin(z * 0.004);
function koogH(x, z) {
  const dz = deichZ(x);
  if (z > dz - 20) return -1.5;                                                      // seewärts: unter dem Watt (Deich hat eigene Geometrie)
  let y = 0.85 + 0.22 * (fbm(x * 0.004, z * 0.004, 3) - 0.5) + 0.08 * (vn(x * 0.05, z * 0.05) - 0.5);
  for (const [cx, cz, r, h] of WARFTEN) { const d = Math.hypot(x - cx, z - cz); if (d < r) y = Math.max(y, 0.85 + h * (1 - smoothstep(r * 0.62, r, d))); }
  return y;
}
/** Warft des Leuchtturms */
const turmWarft = (d) => (d < 17 ? TURM.warft : d < 44 ? lerp(TURM.warft, -0.5, smoothstep(17, 44, d)) : -0.5);
/** sichtbare Bodenhöhe: Deich, Koog, Warften (Watt und Salzwiese liegen im Shader auf y = 0) */
export function hoehe(x, z) {
  const dt = Math.hypot(x, z); if (dt < 44) return Math.max(0, turmWarft(dt));
  const dz = deichZ(x), [nx, nz] = deichNormale(x), n = (z - dz) * nz;
  if (n > -42 && n < 72) return Math.max(deichProfil(n), 0);
  return Math.max(koogH(x, z), 0);
}

// ----------------------------------------------------------------------------------------------- Prielnetz (deterministisch, einmal gebacken)
function prielNetz() {
  const S = [], belegt = new Map(), ZL = 26, elternVon = [0]; let astNr = 0;
  const linie = (a, b) => { for (let q = a; q > 0; q = elternVon[q]) if (q === b) return true; return false; };   // b ist a selbst oder Vorfahr von a
  const zk = (x, z) => Math.floor(x / ZL) * 100003 + Math.floor(z / ZL);
  const markiere = (x, z, r, id) => { const k = Math.ceil(r / ZL); for (let i = -k; i <= k; i++) for (let j = -k; j <= k; j++) { const q = zk(x + i * ZL, z + j * ZL); if (!belegt.has(q)) belegt.set(q, id); } };
  const ast = (x, z, a0, w0, laenge, stufe, seed, ziel, eltern = -1) => {
    const id = ++astNr; elternVon[id] = Math.max(eltern, 0);
    // Mäander als Funktion der Lauflänge (nicht aufsummiert → keine Schleifen); Hauptpriele halten Kurs auf ihr Ziel
    let s = 0, w = w0, zweigBei = 120 + 220 * hash(seed, 3), seite = hash(seed, 4) < 0.5 ? 1 : -1, n = 0, a = a0;
    const welle = 300 + 7 * w0, amp = [0.55, 0.7, 0.8, 0.85][stufe], o1 = hash(seed, 1) * 50, o2 = hash(seed, 2) * 50;
    while (s < laenge && n++ < 3000) {
      const step = clamp(w * 0.8, 6, 30);
      const basis = ziel ? Math.atan2(ziel[0] - x, ziel[1] - z) : a0 + 0.25 * Math.sin(s / (welle * 4) + o1);
      a = basis + amp * (vn(s / welle + o1, o2) - 0.5) * 2.4 + 0.22 * (vn(s / (welle * 0.22) + o2, o1) - 0.5) * 2;
      const nx = x + Math.sin(a) * step, nz = z + Math.cos(a) * step, md = marschD(nx, nz);
      if (md > (stufe >= 2 ? 650 : stufe === 1 ? 40 : -30) || nz < deichZ(nx) + 90 || Math.hypot(nx, nz) < 60) break;
      const frei = belegt.get(zk(nx + Math.sin(a) * (w * 0.5 + 14), nz + Math.cos(a) * (w * 0.5 + 14)));
      if (n > 2 && frei !== undefined && !linie(frei, id) && !linie(id, frei)) break;
      markiere(nx, nz, w * 0.5 + 12, id);
      S.push([x, z, nx, nz, w, [1.0, 0.8, 0.58, 0.42][stufe] * (0.6 + 0.4 * w / w0), stufe]);
      x = nx; z = nz; s += step; w = w0 * (1 - 0.72 * s / laenge);
      if (w < 1.5) break;
      if (stufe < 3 && s > zweigBei) {
        const k = S.length, lang = laenge * [0.3, 0.38, 0.42][stufe] * (0.6 + 0.6 * hash(seed + k, 7)) + 120;
        ast(x, z, a + seite * (0.55 + 0.5 * hash(seed + k, 5)), w * (0.34 + 0.2 * hash(seed + k, 6)), lang, stufe + 1, (seed * 7 + k) % 100003, null, id);
        seite = -seite; zweigBei = s + [300, 230, 150][stufe] + 260 * hash(seed + k, 8);
      }
    }
  };
  const staemme = [
    { p: [7800, 9800], ziel: [650, 700], w: 150, L: 12500 }, { p: [12500, 1600], ziel: [700, 120], w: 120, L: 11800 },
    { p: [-2600, 10500], ziel: [-700, 500], w: 105, L: 10500 }, { p: [3400, 7600], ziel: [100, 380], w: 72, L: 7900 },
    { p: [-7000, 6500], ziel: [-3400, 420], w: 85, L: 7000 }, { p: [9000, -6000], ziel: [1600, -1300], w: 90, L: 8200 },
  ];
  staemme.forEach((st, i) => ast(st.p[0], st.p[1], Math.atan2(st.ziel[0] - st.p[0], st.ziel[1] - st.p[1]), st.w, st.L, 0, 1000 + i * 37, st.ziel));
  // Salzwiesenpriele: von der Abbruchkante ins Land
  for (let i = 0; i < 34; i++) { const x = -3200 + i * 110 + 40 * hash(i, 11); if (x > kanteW(kanteN(x)) - 20) continue; ast(x, kanteN(x) - 4, Math.PI + (hash(i, 12) - 0.5) * 0.9, 5 + 7 * hash(i, 13), 380 + 520 * hash(i, 14), 2, 5000 + i, null); }
  for (let i = 0; i < 9; i++) { const z = -820 + i * 120 + 30 * hash(i, 21); ast(kanteW(z) - 4, z, -Math.PI / 2 + (hash(i, 22) - 0.5) * 0.8, 5 + 6 * hash(i, 23), 320 + 380 * hash(i, 24), 2, 6000 + i, null); }
  return S;
}
function rastern(S, [x0, z0, sz], N) {
  const px = sz / N, R = new Float32Array(N * N), G = new Float32Array(N * N);
  for (const [ax, az, bx, bz, w, tief] of S) {
    const hw = w / 2, rb = hw + w * 1.6 + px * 2;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - rb - x0) / px)), i1 = Math.min(N - 1, Math.ceil((Math.max(ax, bx) + rb - x0) / px));
    const j0 = Math.max(0, Math.floor((Math.min(az, bz) - rb - z0) / px)), j1 = Math.min(N - 1, Math.ceil((Math.max(az, bz) + rb - z0) / px));
    if (i0 > i1 || j0 > j1) continue;
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, hwE = Math.max(hw, px * 0.6), dk = Math.min(1, hw / (px * 0.6)), ub = w * 0.7 + px;
    for (let j = j0; j <= j1; j++) {
      const z = z0 + (j + 0.5) * px;
      for (let i = i0; i <= i1; i++) {
        const x = x0 + (i + 0.5) * px, t = clamp(((x - ax) * dx + (z - az) * dz) / L2), ex = ax + dx * t - x, ez = az + dz * t - z, d = Math.sqrt(ex * ex + ez * ez);
        if (d > rb) continue;
        const q = d / hwE, dep = q < 1 ? tief * Math.sqrt(1 - q * q) * dk : 0, bank = tief * Math.exp(-Math.max(d - hw, 0) / ub), k = j * N + i;
        if (dep > R[k]) R[k] = dep; if (bank > G[k]) G[k] = bank;
      }
    }
  }
  const out = new Uint8Array(N * N * 2);
  for (let k = 0; k < N * N; k++) { out[k * 2] = Math.round(clamp(R[k]) * 255); out[k * 2 + 1] = Math.round(clamp(G[k]) * 255); }
  const tex = new THREE.DataTexture(out, N, N, THREE.RGFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.anisotropy = 8; tex.needsUpdate = true;
  return tex;
}
const BOX_NAH = [-1700, -1150, 4400], BOX_FERN = [-13000, -9000, 30000];

// ----------------------------------------------------------------------------------------------- Leuchtfeuer-Strahl (Streulicht im Dunst, Licht am Boden)
const GLSL_STRAHL = /* glsl */ `
uniform vec3 strO, strD, strF; uniform float strI, strB, strNebel;
float strahlDichte(vec3 X, vec3 O, vec3 b) {
  vec3 v = X - O; float u = dot(v, b); if (u < 1.0) return 0.0;
  float R = strB * u + 0.4; vec3 q = v - b * u; float dl2 = dot(q, q);
  return exp(-dl2 / (R * R)) / (3.14159 * R * R) * smoothstep(40.0, 450.0, u);
}
float strahlStreu(vec3 Cm, vec3 d, float smax) {
  if (strI < 0.001) return 0.0;
  vec3 O = strO, b = strD;
  if (Cm.y < 0.0) { O.y = -O.y; b.y = -b.y; }                                  // Spiegelbild (Reflector)
  float bd = dot(d, b), den = max(1.0 - bd * bd, 1e-6), sinT = sqrt(den);
  float wA = smoothstep(2.0 * strB, 4.0 * strB, sinT), val = 0.0;
  if (wA > 0.0) {                                                              // quer zum Strahl: analytisch (Gauß-Schnitt)
    vec3 w0 = Cm - O; float s = (bd * dot(b, w0) - dot(d, w0)) / den;
    if (s > 0.0 && s < smax) {
      vec3 X = Cm + d * s; float u = dot(X - O, b);
      if (u > 1.0) { float R = strB * u + 0.4; vec3 q = X - O - b * u; val += wA * 7.0 * exp(-dot(q, q) / (R * R)) / (1.7725 * R * sinT) * smoothstep(8.0, 60.0, u) * exp(-strNebel * s); }
    }
  }
  if (wA < 1.0) {                                                              // fast parallel: numerisch (log. Schritte)
    float s0 = 2.0, s1 = clamp(smax, 4.0, 30000.0), q = log(s1 / s0) / 12.0, sp = s0, acc = 0.0;
    for (int i = 1; i <= 12; i++) { float sn = s0 * exp(q * float(i)), sm = 0.5 * (sp + sn); acc += strahlDichte(Cm + d * sm, O, b) * (sn - sp) * exp(-strNebel * sm); sp = sn; }
    val += (1.0 - wA) * acc * 1.6;
  }
  float vorne = 0.55 + 1.6 * pow(max(-bd, 0.0), 8.0);                           // Vorwärtsstreuung, wenn der Strahl zur Kamera zeigt
  return strI * val * vorne;
}
float strahlBoden(vec3 P) {
  vec3 v = P - strO; float dd = length(v); vec3 vn = v / max(dd, 1e-3);
  float ah = acos(clamp(dot(normalize(vn.xz + vec2(1e-6)), normalize(strD.xz + vec2(1e-6))), -1.0, 1.0));
  float av = asin(clamp(vn.y, -1.0, 1.0)) - asin(clamp(strD.y, -1.0, 1.0));
  return strI * exp(-ah * ah / (strB * strB * 2.0)) * exp(-av * av / 0.0036) / (1.0 + dd * dd / 250000.0);
}`;

// ----------------------------------------------------------------------------------------------- Himmel: Dämmerung, Sterne, Wolken, Polarlicht
const HIMMEL_V = /* glsl */ `
varying vec3 vDir;
void main() { vDir = (modelMatrix * vec4(position, 0.0)).xyz; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const GLSL_PL = /* glsl */ `
uniform float plNord, plRot, plKrone, plSued, plHelle, zeit; uniform vec3 krZ;
const vec3 GRUEN = vec3(0.20, 1.0, 0.40), GELBGRUEN = vec3(0.55, 1.0, 0.32), ROT = vec3(1.0, 0.09, 0.15), VIOLETT = vec3(0.58, 0.14, 0.88), PINK = vec3(1.0, 0.30, 0.62);
vec3 vorhang(vec3 d, float y0, float amp, float aLo, float aHi, vec3 cLo, vec3 cHi, float ph, float st, float abfall, float drift) {
  float h = max(d.y, 0.012); vec3 acc = vec3(0.0); float tz = zeit * drift;
  for (int k = 0; k < 12; k++) {
    float ff = float(k) / 11.0, a = aLo + ff * (aHi - aLo);
    vec2 q = d.xz / h * a; float x = q.x;
    float kurve = y0 + amp * sin(x * 0.0042 + tz * 0.11 + ph) + 0.8 * amp * (nN(vec2(x * 0.0055 + tz * 0.045, ph * 7.3)) - 0.5) + 0.26 * amp * sin(x * 0.019 - tz * 0.33 + ph * 1.7);
    float schritt = (aHi - aLo) / 11.0 * length(d.xz) / h;
    float bw = 6.0 + 7.0 * nN(vec2(x * 0.008 + 3.0, ph + 3.0)) + ff * 6.0, breite = max(bw, schritt * 0.75), dy = q.y - kurve;
    float band = exp(-dy * dy / (breite * breite)) * bw / breite;
    float rx = x * 0.11 / (1.0 + schritt * 0.03);
    float strahl = 0.12 + 0.88 * pow(nN(vec2(rx + tz * (0.22 + 0.05 * ph), ph * 13.0)), 2.6) + 0.35 * pow(nN(vec2(rx * 3.1 - tz * 0.5, ph)), 4.0);
    float profil = exp(-ff * abfall) + 0.35 * exp(-((ff - 0.08) / 0.05) * ((ff - 0.08) / 0.05));
    acc += mix(cLo, cHi, smoothstep(0.3, 1.0, ff)) * band * mix(1.0, strahl, st) * profil;
  }
  return acc;
}
vec3 polarlicht(vec3 d) {
  vec3 acc = vec3(0.0);
  if (d.y < 0.002) return acc;
  float el = asin(clamp(d.y, 0.0, 1.0)), t = zeit;
  vec2 dh = normalize(d.xz + vec2(1e-5)); float nord = dh.y;
  float hfade = smoothstep(-0.004, 0.012, d.y);
  if (plNord > 0.001) {                                                         // grüner Saum, dann Bogen mit Strahlen im Norden
    float puls = 0.82 + 0.18 * sin(t * 0.9) * sin(t * 0.37 + 1.0);
    float saumH = 0.05 + 0.05 * plNord, saumB = 0.035 + 0.035 * plNord;
    float saum = exp(-((el - saumH) / saumB) * ((el - saumH) / saumB)) * smoothstep(-0.35, 0.7, nord) * (0.65 + 0.35 * nN(vec2(atan(d.x, d.z) * 4.0 + t * 0.06, 1.0)));
    float y0 = 950.0 - 420.0 * plNord;
    vec3 v = vorhang(d, y0, 70.0, 100.0, 270.0, GRUEN, ROT * 0.7, 0.0, smoothstep(0.25, 0.85, plNord), 3.2, 1.0);
    if (plNord > 0.35) v += vorhang(d, y0 + 170.0, 55.0, 100.0, 240.0, GELBGRUEN * 0.8, ROT * 0.5, 2.3, 0.7, 3.6, 0.8) * smoothstep(0.35, 0.9, plNord);
    acc += (GRUEN * saum * (0.32 - 0.16 * plNord) + v * 0.34 * smoothstep(-0.55, 0.15, nord)) * plNord * puls;
  }
  if (plRot > 0.001) {                                                          // rote und violette Bögen/Vorhänge über dem Watt (hoch, 220–450 km)
    float puls = 0.78 + 0.22 * sin(t * 0.63 + 2.0) * sin(t * 0.29);
    float y0 = 480.0 - 330.0 * plRot;
    vec3 v = vorhang(d, y0, 120.0, 220.0, 440.0, ROT, VIOLETT, 4.1, 0.55, 1.1, 0.7) + vorhang(d, y0 + 190.0, 95.0, 200.0, 420.0, PINK * 0.85, VIOLETT * 0.9, 5.7, 0.45, 0.9, 0.6);
    float glow = smoothstep(-0.5, 0.6, nord) * (0.35 + 0.65 * smoothstep(0.0, 0.5, el)) * (0.7 + 0.3 * nN(vec2(d.x / max(d.y, 0.05) * 0.8 + t * 0.03, d.z / max(d.y, 0.05) * 0.8)));
    acc += (v * 0.22 + mix(ROT, VIOLETT, 0.25) * glow * 0.05) * plRot * puls;
  }
  if (plKrone > 0.001) {                                                        // Korona: Strahlen laufen im magnetischen Zenit zusammen, pulsierend
    vec3 m = normalize(krZ);
    float rho = acos(clamp(dot(d, m), -1.0, 1.0));
    vec3 t1 = normalize(cross(m, vec3(1.0, 0.0, 0.0))), t2 = cross(m, t1);
    float phi = atan(dot(d, t2), dot(d, t1)); vec2 cs = vec2(cos(phi), sin(phi));
    float rays = pow(nN(cs * 15.0 + vec2(t * 0.07, -t * 0.05)), 2.2) * 0.85 + pow(nN(cs * 36.0 - vec2(t * 0.11, t * 0.09)), 3.0) * 0.7;
    rays = mix(0.45, rays, smoothstep(0.03, 0.14, rho));                       // Mitte: weich (kein Moiré)
    float radial = smoothstep(0.015, 0.09, rho) * exp(-rho / 0.62);
    float wellen = 0.6 + 0.4 * sin(t * 2.3 + rho * 10.0 + nN(cs * 4.0) * 5.0);   // Wellen laufen zur Mitte
    float puls = 0.7 + 0.3 * sin(t * 0.8) * sin(t * 1.9 + 0.4);
    vec3 col = mix(PINK, GRUEN, smoothstep(0.1, 0.42, rho)); col = mix(col, ROT, smoothstep(0.6, 1.0, rho) * 0.7);
    float kern = exp(-rho * rho / 0.004) * 0.5;
    acc += (col * rays * radial * wellen * 0.9 + mix(PINK, VIOLETT, 0.4) * kern * (0.7 + 0.3 * sin(t * 1.7))) * plKrone * puls * hfade;
  }
  if (plSued > 0.001) {                                                         // roter Südhimmel mit Strahlen (Säulen)
    float sued = 1.0 - smoothstep(-0.55, 0.55, nord);
    float puls = 0.8 + 0.2 * sin(t * 0.47 + 1.3);
    float glow = exp(-el / (0.33 + 0.25 * plSued)) * sued;
    float az = atan(d.x, -d.z);
    float top = 0.22 + 0.5 * nN(vec2(az * 14.0 + t * 0.04, 9.0));
    float rays = pow(nN(vec2(az * 16.0 + t * 0.05, 3.0)), 1.8) * smoothstep(0.0, 0.06, el) * (1.0 - smoothstep(top * 0.5, top, el));
    vec3 v = vorhang(d, -380.0 - 160.0 * (1.0 - plSued), 80.0, 230.0, 440.0, ROT, PINK * 0.7, 7.3, 0.8, 1.0, 0.8);
    acc += (ROT * glow * 0.22 + (ROT * 0.85 + VIOLETT * 0.15) * rays * sued * 0.35 + v * 0.14) * plSued * puls;
  }
  if (any(isnan(acc)) || any(isinf(acc))) acc = vec3(0.0);
  return acc * hfade * (1.0 + 0.7 * plHelle);
}`;
const HIMMEL_F = /* glsl */ `
uniform vec3 zenit, horizont, unten, glowA, glowM, glowAF, glowMF, smogF, wolkeF, wolkeAur, guertelF;
uniform float glowAS, glowMS, sterne, dunst, helligkeit, wolken, wolkenH, guertelS;
uniform vec2 wolkenOff;
varying vec3 vDir;
${GLSL_NOISE}
${GLSL_PL}
${GLSL_STRAHL}
float wolkeDichte(vec3 d, out float dicke) {
  dicke = 0.0;
  if (wolken < 0.002 || d.y < -0.01) return 0.0;
  float h = max(d.y, 0.0), hh = max(h, 0.05), lod = smoothstep(0.05, 0.22, h);
  vec2 q = d.xz / hh * wolkenH + wolkenOff;
  float f = nF(q * 0.42) * 0.82 + (nN(q * 1.9 + 3.0) - 0.5) * 0.22 * lod;
  float s = 1.0 - wolken * 0.92;
  float c = smoothstep(s - 0.05, s + 0.17, f);
  c = mix(smoothstep(0.15, 0.85, wolken) * 0.85, c, lod * lod);                  // zum Horizont hin zu einer Wolkenbank verdichtet
  dicke = smoothstep(s, s + 0.4, f) * lod;
  return c * smoothstep(-0.01, 0.015, d.y);
}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 dd = vec3(d.x, abs(d.y), d.z);
  float g = 1.0 - exp(-max(h, 0.0) / max(dunst, 1e-3));
  vec3 col = mix(horizont, zenit, g);
  vec2 dh = normalize(d.xz + vec2(1e-5));
  float azA = dot(dh, normalize(glowA.xz + vec2(1e-5))), azM = dot(dh, normalize(glowM.xz + vec2(1e-5)));
  float hp = max(h, 0.0);
  vec3 glut = glowAF * glowAS * (exp((azA - 1.0) * 1.9) * exp(-hp / 0.11) + 0.28 * exp((azA - 1.0) * 0.55) * exp(-hp / 0.38))
            + glowMF * glowMS * (exp((azM - 1.0) * 1.7) * exp(-hp / 0.12) + 0.3 * exp((azM - 1.0) * 0.5) * exp(-hp / 0.4));
  col += glut;
  float belt = exp(-((hp - 0.07) / 0.05) * ((hp - 0.07) / 0.05)) * exp((-azA - 1.0) * 1.2);
  col = mix(col, guertelF, clamp(belt * guertelS, 0.0, 1.0));
  col += smogF * (exp((dot(dh, normalize(vec2(-0.62, -0.78))) - 1.0) * 3.0) + 0.6 * exp((dot(dh, normalize(vec2(0.55, -0.83))) - 1.0) * 4.0)) * exp(-hp / 0.05);
  bool spiegel = cameraPosition.y < 0.0;
  if (sterne > 0.001 && h > -0.01) {
    vec3 sp = d * 190.0; vec3 si = floor(sp);                                   // 3D-Zellen: keine Naht, Hash ohne sin (GPU-genau)
    vec3 p3 = fract(si * 0.1031); p3 += dot(p3, p3.yzx + 33.33); float hs = fract((p3.x + p3.y) * p3.z);
    if (hs > 0.955) {
      vec3 q3 = fract(si * vec3(0.1031, 0.103, 0.0973)); q3 += dot(q3, q3.yxz + 33.33); vec3 o = fract((q3.xxy + q3.yzz) * q3.zyx);
      vec3 sd = normalize(si + 0.25 + 0.5 * o);
      float ang = acos(clamp(dot(d, sd), -1.0, 1.0)) * 190.0;
      float stn = (1.0 - smoothstep(0.0, 0.17, ang)) * (0.35 + 2.4 * pow((hs - 0.955) / 0.045, 3.0));
      stn *= 0.82 + 0.18 * sin(zeit * (1.0 + 2.0 * o.x) + hs * 40.0);
      col += vec3(0.85, 0.9, 1.0) * stn * sterne * smoothstep(0.0, 0.12, h) * (spiegel ? 0.4 : 1.0);
    }
    vec3 gal = normalize(vec3(0.45, 0.35, 0.82)); float gb = dot(d, gal);                    // Milchstraße als Band um einen Großkreis (nahtlos)
    float mw = exp(-gb * gb / 0.03) * smoothstep(0.35, 0.8, nF(vec2(dot(d, vec3(0.8, 0.0, -0.6)), d.y) * 5.0 + 3.0));
    col += vec3(0.035, 0.042, 0.065) * sterne * mw * smoothstep(0.05, 0.3, h);
  }
  vec3 aur = polarlicht(d);
  col += aur;
  // Wolken (verdecken Sterne und Polarlicht, werden von Dämmerung, Polarlicht und Leuchtfeuer angeleuchtet)
  float dicke; float wd = wolkeDichte(d, dicke);
  if (wd > 0.001) {
    vec3 wc = wolkeF * (1.0 - 0.45 * dicke) + wolkeAur * (0.55 + 0.45 * (1.0 - dicke)) + aur * 0.22 * (1.0 - dicke);
    wc += glut * (0.55 + 0.6 * (1.0 - dicke)) * 1.3;
    float az = atan(d.x, d.z), azS = atan(strD.x, strD.z), da = az - azS; da = atan(sin(da), cos(da));
    wc += strF * strI * 0.004 * exp(-da * da / 0.012) * exp(-hp / 0.045) * (0.4 + 0.6 * dicke);   // Strahl streift die Wolkenbank
    col = mix(col, wc, wd);
  }
  col += strF * strahlStreu(cameraPosition, d, 1e5);
  col = mix(col, unten, smoothstep(0.0, 0.06, -h));
  gl_FragColor = vec4(col * helligkeit, 1.0);
}`;
export class WattHimmel {
  constructor(szene, { radius = 20000 } = {}) {
    const v3 = (x, y, z) => ({ value: new THREE.Vector3(x, y, z) });
    this.u = {
      zenit: { value: C("#010208") }, horizont: { value: C("#050913") }, unten: { value: C("#020306") }, guertelF: { value: C("#3A2E48") }, guertelS: { value: 0 },
      glowA: v3(0.8, -0.1, -0.55), glowM: v3(-0.85, -0.1, -0.5), glowAF: { value: C("#FF7A30") }, glowMF: { value: C("#FFA860") }, glowAS: { value: 0 }, glowMS: { value: 0 },
      smogF: { value: new THREE.Color(0.012, 0.007, 0.003) }, sterne: { value: 1 }, dunst: { value: 0.3 }, helligkeit: { value: 1 },
      wolken: { value: 0.5 }, wolkenH: { value: 1.8 }, wolkenOff: { value: new THREE.Vector2() }, wolkeF: { value: new THREE.Color(0.01, 0.01, 0.014) }, wolkeAur: { value: new THREE.Color() },
      plNord: { value: 0 }, plRot: { value: 0 }, plKrone: { value: 0 }, plSued: { value: 0 }, plHelle: { value: 0 }, zeit: { value: 0 }, krZ: v3(0, 0.94, -0.34),
      strO: v3(...TURM.lampe), strD: v3(0, 0, 1), strF: { value: new THREE.Color(1.0, 0.86, 0.62) }, strI: { value: 1 }, strB: { value: 0.035 }, strNebel: { value: 2.6e-5 },
    };
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), new THREE.ShaderMaterial({ vertexShader: HIMMEL_V, fragmentShader: HIMMEL_F, uniforms: this.u, side: THREE.BackSide, depthWrite: false, fog: false }));
    this.mesh.renderOrder = -1000; this.mesh.frustumCulled = false; szene.add(this.mesh);
  }
  folge(k) { this.mesh.position.copy(k.position); return this; }
}

// ----------------------------------------------------------------------------------------------- Watt + Salzwiese (Reflector-Shader)
const WATT = {
  name: "WattBoden",
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, texel: { value: new THREE.Vector2(1 / 540, 1 / 960) },
    tNah: { value: null }, tFern: { value: null }, boxN: { value: new THREE.Vector4() }, boxF: { value: new THREE.Vector4() },
    zeit: { value: 0 }, pegel: { value: 0.3 }, wind: { value: 0.5 }, spiegel: { value: 1 }, debug: { value: 0 },
    hemiH: { value: new THREE.Color() }, hemiB: { value: new THREE.Color() }, keyDir: { value: new THREE.Vector3(0, 1, 0) }, keyF: { value: new THREE.Color() },
    strO: { value: new THREE.Vector3(...TURM.lampe) }, strD: { value: new THREE.Vector3(0, 0, 1) }, strF: { value: new THREE.Color(1, 0.86, 0.62) }, strI: { value: 1 }, strB: { value: 0.035 }, strNebel: { value: 2.6e-5 },
  }]),
  vertexShader: /* glsl */ `
uniform mat4 textureMatrix; varying vec4 vUv4; varying vec3 vW;
#include <common>
#include <fog_pars_vertex>
void main() {
  vUv4 = textureMatrix * vec4(position, 1.0);
  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse, tNah, tFern; uniform vec3 color, hemiH, hemiB, keyDir, keyF; uniform vec2 texel; uniform vec4 boxN, boxF;
uniform float zeit, pegel, wind, spiegel, debug;
varying vec4 vUv4; varying vec3 vW;
#include <fog_pars_fragment>
${GLSL_NOISE}
${GLSL_GEO}
${GLSL_STRAHL}
#define WPI 3.14159265
float wh(vec2 p) { return nN(p * 0.34 + vec2(zeit * 0.06, zeit * 0.035)) + 0.4 * nN(p * 1.3 + vec2(-zeit * 0.15, zeit * 0.09)) + 1.2 * nN(p * 0.07 + vec2(zeit * 0.012, -zeit * 0.01)); }
float linie(float a, float halb, float fwa) { return clamp((halb - a) / max(fwa, 1e-3) + 0.5, 0.0, 1.0); }
void main() {
  vec2 p = vW.xz;
  vec3 Vv = cameraPosition - vW; float dist = length(Vv); vec3 V = Vv / dist;
  vec2 fwv = fwidth(p); float fw = max(max(fwv.x, fwv.y), 1e-3);
  // --- Priele (gebacken): R = Tiefe, G = Nähe zum Priel
  vec2 un = (p - boxN.xy) * boxN.z, uf = (p - boxF.xy) * boxF.z;
  float inN = smoothstep(0.0, 0.03, un.x) * smoothstep(0.0, 0.03, un.y) * smoothstep(0.0, 0.03, 1.0 - un.x) * smoothstep(0.0, 0.03, 1.0 - un.y);
  vec2 P = mix(texture2D(tFern, uf).rg, texture2D(tNah, un).rg, inN);
  float Dp = P.r, ufer = P.g;
  float fade = 1.0 - smoothstep(1.2, 6.0, fw);
  float nf = nN(p * 0.017 + 4.0) * 0.7 + nN(p * 0.051) * 0.3;
  float fein = (1.0 - smoothstep(0.0, 0.024 + fw * 0.002, abs(nf - 0.5))) * smoothstep(0.06, 0.4, ufer) * fade;   // feine Rinnen
  float md = marschD(p) + 22.0 * (nF(p * 0.011) - 0.5) + 6.0 * (nN(p * 0.07) - 0.5) * (1.0 - smoothstep(2.0, 10.0, fw));
  float isM = smoothstep(-1.5 - fw, 1.5 + fw, md);
  float see = smoothstep(2500.0, 9000.0, -md);
  float fadeM = 1.0 - smoothstep(5.0, 22.0, fw), fadeG = 1.0 - smoothstep(40.0, 160.0, fw);
  float n1 = mix(0.5, nN(p * 0.045), fadeM), n2 = mix(0.5, nN(p * 0.35), fade), n3 = mix(0.5, nF(p * 0.0011 + 7.0), fadeG);
  float pf = mix(0.05, smoothstep(0.83, 0.88, nF(vec2(p.x * 0.05 + p.y * 0.02, p.y * 0.022 - p.x * 0.008) + 21.0)), fadeM) * (1.0 - isM) * smoothstep(0.08, 0.35, ufer) * mix(1.0, smoothstep(0.3, 0.6, nN(p * 0.4)), fade);                                   // Restwasser-Pfützen
  float hW = 0.34 - 2.7 * see - 0.3 * n3 + 0.04 * (n1 - 0.5) - 3.2 * Dp - 0.55 * fein - 0.1 * pf;
  // Grüppen (Entwässerungsgräben) und Lahnungen
  vec2 pr0 = mat2(0.8, 0.6, -0.6, 0.8) * p;
  float feld = nH(floor(vec2(p.x / 150.0 + 0.37, p.y / 180.0 + 0.3)));
  float per = 13.0;
  float gx = abs(fract(p.x / per) - 0.5) * per, gz = abs(fract(p.y / 180.0 + 0.3) - 0.5) * 180.0;
  float gr = max(mix(linie(gx, 0.28, fwv.x), 0.56 / per, smoothstep(1.5, 5.0, fwv.x)) * smoothstep(0.45, 0.6, nN(p * 0.004 + 3.0)), mix(linie(gz, 0.8, fwv.y), 1.6 / 180.0, smoothstep(3.0, 12.0, fwv.y)));
  gr *= smoothstep(35.0, 90.0, md) * (1.0 - smoothstep(560.0, 700.0, md)) * (0.4 + 0.6 * nN(p * 0.02)) * smoothstep(0.4, 0.6, nN(p * 0.003 + 8.0)) * 0.6;
  float pfanne = smoothstep(0.82, 0.88, nN(pr0 * 0.05 + 3.0)) * smoothstep(60.0, 120.0, md) * fadeM;                   // Salzpfannen
  float hM = 0.48 + 1.1 * smoothstep(0.0, 800.0, md) + 0.12 * (nF(p * 0.02) - 0.5) - 2.4 * Dp - 0.7 * fein - 0.25 * gr - 0.9 * pfanne;
  float wq = -md;
  float lahn = 0.0;
  { float band = smoothstep(-5.0, 5.0, wq) * (1.0 - smoothstep(370.0, 392.0, wq)) * step(-1900.0, p.x) * step(p.x, 360.0);
    float lx = mix(linie(abs(fract((p.x - 63.0) / 200.0 + 0.5) - 0.5) * 200.0, 0.5, fwv.x), 1.0 / 200.0, smoothstep(3.0, 12.0, fwv.x));
    float fq = max(fwidth(wq), 1e-3); float lq = mix(linie(min(abs(wq - 190.0), abs(wq - 380.0)), 0.55, fq), 0.0, smoothstep(3.0, 12.0, fq));
    lahn = max(lx, lq) * band * mix(0.75, smoothstep(0.25, 0.45, nN(p * 0.35)), fade) * 0.85; }
  float hgt = mix(hW, hM, isM);
  float L = -1.5 + 3.0 * pegel;
  float fh = max(fwidth(hgt), 0.004);
  float wasser = clamp((L - hgt) / (fh * 1.5 + 0.03) + 0.5, 0.0, 1.0);
  float lahnSicht = lahn * clamp((hgt + 0.7 - L) / 0.15, 0.0, 1.0);
  float nass = smoothstep(-0.6, 0.15, L - hgt + 0.5) * 0.55 + 0.45;
  // --- Normale: Wasser kräuselt, Schlick mit Rippelfeldern
  float e = 0.15 + fw * 0.5;
  float w0 = wh(p); vec2 gw = vec2(wh(p + vec2(e, 0.0)) - w0, wh(p + vec2(0.0, e)) - w0) / e;
  gw *= 0.07 * (0.35 + 1.1 * wind) * (1.0 - smoothstep(0.8, 6.0, fw));
  float m0 = nN(p * 0.6); vec2 gm = vec2(nN((p + vec2(e, 0.0)) * 0.6) - m0, nN((p + vec2(0.0, e)) * 0.6) - m0) / e;
  gm *= 0.16 * fade * (1.0 - isM);
  vec2 g2 = mix(gm, gw, wasser);
  vec3 N = normalize(vec3(-g2.x, 1.0, -g2.y));
  // --- Farben
  vec3 schlick = mix(vec3(0.075, 0.07, 0.062), vec3(0.11, 0.1, 0.085), n2 * 0.6 + 0.2);
  vec3 sand = vec3(0.21, 0.19, 0.155) * (0.88 + 0.2 * n2);
  float sandA = smoothstep(0.42, 0.68, n3 + 0.25 * see) * smoothstep(200.0, 1400.0, wq) + 0.5 * smoothstep(0.25, 0.7, ufer) * (1.0 - smoothstep(0.75, 0.95, ufer));
  vec3 alb = mix(schlick, sand, clamp(sandA, 0.0, 1.0) * 0.8);
  alb = mix(alb, vec3(0.1, 0.095, 0.06), (1.0 - smoothstep(0.0, 260.0, wq)) * 0.6);                              // Kieselalgen-Film am Rand
  float muschel = smoothstep(0.72, 0.79, nF(p * 0.0045 + 11.0)) * smoothstep(500.0, 1300.0, wq) * (1.0 - see);
  alb = mix(alb, vec3(0.025, 0.025, 0.03) * (0.7 + 0.6 * n2), muschel);
  // Salzwiese: Queller-Pionierzone rot, Andel grün-oliv, Strandaster braun, obere Wiese kurz grün
  float mfa = 1.0 - smoothstep(1.5, 8.0, fw);
  vec3 queller = vec3(0.30, 0.065, 0.085) * (0.75 + 0.5 * nN(p * 0.4));
  vec2 pr = mat2(0.8, 0.6, -0.6, 0.8) * p;
  float qD = smoothstep(0.3, 0.7, mix(0.5, nF(pr * 0.05 + 5.0), mfa)) * (1.0 - smoothstep(30.0, 110.0, md));
  vec3 andel = mix(vec3(0.15, 0.18, 0.085), vec3(0.20, 0.16, 0.09), smoothstep(0.45, 0.75, nF(p * 0.012 + 2.0)));
  andel = mix(andel, vec3(0.27, 0.085, 0.09), smoothstep(0.58, 0.78, nF(pr * 0.012 + 9.0)) * 0.75);                // Strandsode/Queller-Flecken rot
  andel = mix(andel, vec3(0.23, 0.2, 0.17), smoothstep(0.62, 0.82, nF(pr * 0.04 + 2.0)) * 0.45 * mfa);                  // vertrocknete Aster
  vec3 oben = mix(vec3(0.13, 0.18, 0.075), vec3(0.17, 0.2, 0.1), nN(p * 0.03));
  vec3 wiese = mix(andel, oben, smoothstep(350.0, 700.0, md));
  wiese *= 0.8 + 0.32 * mix(0.5, nN(p * 1.7), mfa);
  vec3 pionier = mix(alb, queller, qD);
  vec3 mAlb = mix(pionier, wiese, smoothstep(25.0, 110.0, md));
  mAlb = mix(mAlb, mAlb * 0.55, gr);
  float veg = smoothstep(25.0, 110.0, md) * (1.0 - gr) * (1.0 - pfanne);
  alb = mix(alb, mAlb, isM);
  alb = mix(alb, vec3(0.09, 0.07, 0.05) * (0.8 + 0.4 * n2), lahnSicht);
  // --- Licht
  vec3 irr = mix(hemiB, hemiH, 0.5 + 0.5 * N.y) + keyF * max(dot(N, keyDir), 0.0) + strF * strahlBoden(vW) * 1.4;
  vec3 diff = alb * irr / WPI;
  vec3 wKoerper = mix(vec3(0.012, 0.016, 0.018), vec3(0.04, 0.035, 0.026), 1.0 - smoothstep(0.0, 0.8, L - hgt)) * irr / WPI;
  // --- Spiegelung
  float NdV = max(dot(N, V), 0.0), F = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
  float glanz = smoothstep(0.35, 0.75, nN(p * 0.009 + 5.0) * 0.6 + 0.4 * nass) * fadeG;            // glänzende, nasse Flecken
  float rau = mix(mix(0.95, 0.45, glanz * nass), 0.03, max(wasser, pf * 0.8));
  vec2 uv = vUv4.xy / vUv4.w + N.xz * vec2(0.35, 0.9) * 0.05 / (1.0 + dist / 70.0);
  vec3 refl = vec3(0.0); float sw = 0.0;
  for (int i = -3; i <= 3; i++) { float wg = exp(-float(i * i) / 5.0); refl += texture2D(tDiffuse, uv + vec2(float(i) * texel.x * rau * 3.0, float(i) * texel.y * (1.2 + rau * 30.0))).rgb * wg; sw += wg; }
  refl /= sw;
  float spec = mix(mix((0.28 + 0.5 * glanz) * nass + 0.25 * pf, 0.04, veg * isM) * (1.0 - lahnSicht), 1.0, wasser) * spiegel;
  vec3 boden = mix(diff, refl * color, F * spec * (1.0 - wasser));
  vec3 wasserC = mix(wKoerper, refl * color, F);
  vec3 col = mix(boden, wasserC, wasser);
  float saum = (1.0 - smoothstep(0.0, 0.05, abs(L - hgt))) * fade * (0.3 + 0.7 * nN(p * 0.8 + zeit * 0.2));    // Schaumsaum an der Wasserlinie
  col += irr / WPI * 0.18 * saum;
  col += strF * strahlStreu(cameraPosition, -V, dist);
  if (debug > 0.5) col = vec3(Dp, ufer * 0.5, isM * 0.3) + vec3(0.0, 0.0, wasser * 0.5);
  gl_FragColor = vec4(col, 1.0);
#include <fog_fragment>
}`,
};

// ----------------------------------------------------------------------------------------------- Lichtpunkte (Fenster, Laternen, Blinklichter) und Schaf-Punkte
const PUNKT_V = /* glsl */ `
attribute vec3 farbe; attribute float groesse; attribute float nahAus; uniform float skalaPx, nebelD, minPx; varying vec3 vF; varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
  float s = groesse * skalaPx / max(-mv.z, 0.1);
  gl_PointSize = clamp(s, minPx, 90.0);
  float nah = nahAus > 0.0 ? 1.0 - smoothstep(nahAus, nahAus * 2.5, s) : 1.0;
  vF = farbe * clamp(s / minPx, 0.3, 1.0) * nah * exp(-nebelD * -mv.z); vAlpha = nah;
}`;
const PUNKT_F = /* glsl */ `
varying vec3 vF; varying float vAlpha; uniform float weich, normalB;
void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = (exp(-d * d * (7.0 - 4.0 * normalB)) + 0.18 * exp(-d * d * 1.6) * weich) * (1.0 - smoothstep(0.7, 1.0, d)); if (a < 0.004) discard;
  gl_FragColor = normalB > 0.5 ? vec4(vF, clamp(a * 1.6, 0.0, 1.0) * vAlpha) : vec4(vF * a, 1.0); }`;
class Punkte {
  constructor(szene, max = 900, { additiv = true, minPx = 2.6, weich = 1 } = {}) {
    this.max = max;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.gr = new Float32Array(max); this.nah = new Float32Array(max);
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("farbe", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("groesse", new THREE.BufferAttribute(this.gr, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("nahAus", new THREE.BufferAttribute(this.nah, 1).setUsage(THREE.DynamicDrawUsage));
    this.u = { skalaPx: { value: 1000 }, nebelD: { value: 2.6e-5 }, minPx: { value: minPx }, weich: { value: weich }, normalB: { value: additiv ? 0 : 1 } };
    this.obj = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: PUNKT_V, fragmentShader: PUNKT_F, uniforms: this.u, transparent: true, depthWrite: false, blending: additiv ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false }));
    this.obj.frustumCulled = false; this.obj.renderOrder = 15; this.g = g; szene.add(this.obj);
  }
  setze(liste, kamera) {
    const n = Math.min(this.max, liste.length);
    for (let i = 0; i < n; i++) { const L = liste[i]; this.pos.set(L.p, i * 3); this.col.set(L.f, i * 3); this.gr[i] = L.r; this.nah[i] = L.nah || 0; }
    this.g.setDrawRange(0, n);
    for (const k of ["position", "farbe", "groesse", "nahAus"]) this.g.attributes[k].needsUpdate = true;
    if (kamera) this.u.skalaPx.value = 1920 / (2 * Math.tan((kamera.fov * D2R) / 2));
    this.obj.visible = n > 0;
  }
}
// Striche: dünne Dinge (Pricken, Windradmasten, Rotorblätter, Zaun) als Bildschirm-Linien mit Mindestbreite → kein Flackern bei Subpixel-Breite
const STRICH_V = /* glsl */ `
attribute vec3 aA, aB, aF; attribute float aW; uniform vec2 aufl; uniform float minPx, minA, nebelD; uniform vec3 licht, nebelF;
varying vec3 vF; varying float vA, vS, vNebel;
void main() {
  vec4 A = projectionMatrix * viewMatrix * vec4(aA, 1.0), B = projectionMatrix * viewMatrix * vec4(aB, 1.0);
  if (A.w < 0.3 || B.w < 0.3) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); vA = 0.0; return; }
  vec2 sa = A.xy / A.w * aufl * 0.5, sb = B.xy / B.w * aufl * 0.5, dir = sb - sa; float L = length(dir); dir = L > 1e-4 ? dir / L : vec2(0.0, 1.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  vec4 P = mix(A, B, position.x);
  float pxm = projectionMatrix[1][1] * aufl.y * 0.5 / P.w, wpx = aW * pxm, w = max(wpx, minPx);
  vA = max(clamp(wpx / minPx, 0.0, 1.0), minA);
  P.xy += nrm * position.y * w * 0.5 / (aufl * 0.5) * P.w;
  gl_Position = P; vS = position.y; vF = aF * licht; vNebel = 1.0 - exp(-nebelD * P.w);
}`;
const STRICH_F = /* glsl */ `
varying vec3 vF; varying float vA, vS, vNebel; uniform vec3 nebelF;
void main() { float a = vA * (1.0 - smoothstep(0.55, 1.0, abs(vS))); if (a < 0.003) discard; gl_FragColor = vec4(mix(vF, nebelF, vNebel), a); }`;
class Striche {
  constructor(szene, max, { minPx = 1.25, minA = 0.3 } = {}) {
    const g = new THREE.InstancedBufferGeometry(), base = new Float32Array([0, -1, 0, 1, -1, 0, 0, 1, 0, 1, 1, 0]);
    g.setAttribute("position", new THREE.BufferAttribute(base, 3)); g.setIndex([0, 1, 2, 2, 1, 3]);
    const att = (n, k) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(max * k), k); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(n, a); return a; };
    this.a = { aA: att("aA", 3), aB: att("aB", 3), aF: att("aF", 3), aW: att("aW", 1) };
    this.u = { aufl: { value: new THREE.Vector2(1080, 1920) }, minPx: { value: minPx }, minA: { value: minA }, nebelD: { value: 2.6e-5 }, licht: { value: new THREE.Color(1, 1, 1) }, nebelF: { value: new THREE.Color() } };
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: STRICH_V, fragmentShader: STRICH_F, uniforms: this.u, transparent: true, depthWrite: false, fog: false }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 8; szene.add(this.mesh);
    this.g = g; this.max = max; this.n = 0; g.instanceCount = 0;
  }
  setze(i, a, b, w, f) { const A = this.a; A.aA.array.set(a, i * 3); A.aB.array.set(b, i * 3); A.aF.array.set(f, i * 3); A.aW.array[i] = w; if (i >= this.n) this.n = i + 1; }
  neu(a, b, w, f) { if (this.n >= this.max) return -1; const i = this.n; this.setze(i, a, b, w, f); return i; }
  fertig() { for (const k of Object.keys(this.a)) this.a[k].needsUpdate = true; this.g.instanceCount = this.n; }
}

// ----------------------------------------------------------------------------------------------- Geometrie-Bausteine
function box(w, h, d, x, y, z, ry = 0) { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; }
function tri(a, b, c) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c], 3)); g.computeVertexNormals(); return g; }
function quad(a, b, c, d) { return [tri(a, b, c), tri(a, c, d)]; }
/** Walmdach (Reet oder Ziegel): Traufe bei y, Länge 2l (x), Breite 2b (z), Firsthöhe hd, Walm-Einzug r */
function walmDach(l, b, y, hd, r, kz, T) {
  const E1 = [-l, y, -b], E2 = [l, y, -b], E3 = [l, y, b], E4 = [-l, y, b], R1 = [-l + r, y + hd, 0], R2 = [l - r, y + hd, 0];
  for (const g of [...quad(E1, R1, R2, E2), ...quad(E3, R2, R1, E4), tri(E2, R2, E3), tri(E4, R1, E1)]) T.push({ g, c: 1, kz });
}
function satteldach(l, b, y, hd, kz, T, ueber = 0.35) {
  const L = Math.hypot(b + ueber, hd * (b + ueber) / b);
  for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(2 * l + 2 * ueber, 0.2, L); g.rotateX(s * Math.atan2(hd, b)); g.translate(0, y + hd / 2, s * (b + ueber) / 2 * (b / (b + ueber)) * 1.0); T.push({ g, c: 1, kz }); }
  for (const s of [-1, 1]) T.push({ g: tri([s * l, y, -b], [s * l, y, b], [s * l, y + hd, 0]), c: 1, kz: 0 }, { g: tri([s * l, y, b], [s * l, y, -b], [s * l, y + hd, 0]), c: 1, kz: 0 });
}
function fensterReihe(T, l, b, y, n, seite, achse = "x") {
  for (let i = 0; i < n; i++) {
    const u = -l + (2 * l / n) * (i + 0.5);
    if (achse === "x") { T.push({ g: box(1.15, 1.3, 0.06, u, y, seite * (b + 0.02)), c: 1, kz: 0.75 }, { g: box(0.92, 1.08, 0.06, u, y, seite * (b + 0.05)), c: 1, kz: 1 }); }
    else { const v = -b + (2 * b / n) * (i + 0.5); T.push({ g: box(0.06, 1.3, 1.15, seite * (l + 0.02), y, v), c: 1, kz: 0.75 }, { g: box(0.06, 1.08, 0.92, seite * (l + 0.05), y, v), c: 1, kz: 1 }); }
  }
}
/** Reetdachhaus (Friesenhaus): art 0 Langhaus mit Zwerchgiebel, 1 kleines Haus, 2 Haubarg (großes Pyramidendach), 3 Ziegelhaus (Wärterhaus) */
const HAUS_ARTEN = [{ l: 8.5, b: 4.2, hw: 3.0, hd: 6.2, r: 2.6, nf: 5 }, { l: 5.2, b: 3.5, hw: 2.7, hd: 5.0, r: 2.2, nf: 3 }, { l: 9.5, b: 8.5, hw: 3.4, hd: 10.5, r: 7.0, nf: 5 }, { l: 6.2, b: 4.0, hw: 3.4, hd: 3.6, r: 0, nf: 4 }];
function hausGeo(art) {
  const A = HAUS_ARTEN[art], T = [], { l, b, hw, hd, r, nf } = A;
  T.push({ g: box(2 * l + 0.15, 0.55, 2 * b + 0.15, 0, 0.0, 0), c: 1, kz: 0.25 });
  T.push({ g: box(2 * l, hw, 2 * b, 0, hw / 2, 0), c: 1, kz: 0 });
  if (art === 3) { satteldach(l + 0.1, b + 0.1, hw, hd, 0.55, T); }
  else {
    T.push({ g: box(2 * l + 1.0, 0.5, 2 * b + 1.0, 0, hw - 0.12, 0), c: 1, kz: 0.5 });                       // dicke Reet-Traufe
    walmDach(l + 0.5, b + 0.5, hw + 0.13, hd, r + 0.5, 0.5, T);
    T.push({ g: box(Math.max(0.6, 2 * (l - r)), 0.36, 0.7, 0, hw + 0.13 + hd - 0.05, 0), c: 1, kz: 0.6 });   // First (Soden)
    if (art === 0) {                                                                                            // Zwerchgiebel (Utlucht) zur Südseite
      T.push({ g: box(3.4, hw + 2.3, 1.2, 0.8, (hw + 2.3) / 2, -b - 0.5), c: 1, kz: 0 });
      const y0 = hw + 2.3; T.push({ g: tri([-1.0, y0, -b - 1.15], [2.6, y0, -b - 1.15], [0.8, y0 + 1.9, -b - 1.15]), c: 1, kz: 0 });
      for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(0.45, 2.7, 2.8); g.rotateZ(s * 0.75); g.translate(0.8 + s * 0.95, y0 + 0.95, -b - 0.25); T.push({ g, c: 1, kz: 0.5 }); }
      T.push({ g: box(1.0, 1.2, 0.06, 0.8, hw + 1.1, -b - 1.13), c: 1, kz: 0.75 }, { g: box(0.8, 1.0, 0.06, 0.8, hw + 1.1, -b - 1.16), c: 1, kz: 1 });
    }
  }
  fensterReihe(T, l, b, 1.45, nf, -1); fensterReihe(T, l, b, 1.45, nf, 1);
  fensterReihe(T, l, b, 1.45, art === 2 ? 3 : 1, 1, "z"); fensterReihe(T, l, b, 1.45, art === 2 ? 3 : 1, -1, "z");
  T.push({ g: box(1.05, 2.1, 0.08, -l * 0.45, 1.05, -b - 0.04), c: 1, kz: 0.85 });
  if (art !== 1) T.push({ g: box(0.7, 1.6, 0.7, l * 0.35, hw + hd * 0.85, 0.3), c: 1, kz: 0.25 });
  return sammle(T);
}
function hausMat(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.88, flatShading: true, vertexColors: true });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uFenster: u.uFenster });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float kz; varying float vKz; varying vec3 vObj; varying float vIz; varying vec3 vWN2;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
  vKz = kz; vObj = position;
  vec4 wpI = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); vIz = fract(sin(dot(wpI.xz, vec2(12.9898, 78.233))) * 43758.5453);
  vWN2 = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying float vKz; varying vec3 vObj; varying float vIz; varying vec3 vWN2; uniform float uFenster;\n${GLSL_NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  {
    float isWin = step(0.95, vKz), isTuer = step(0.8, vKz) * (1.0 - isWin), isTrim = step(0.7, vKz) * (1.0 - step(0.8, vKz)), isSod = step(0.58, vKz) * (1.0 - step(0.7, vKz));
    float isZiegel = step(0.53, vKz) * (1.0 - step(0.58, vKz)), isReet = step(0.4, vKz) * (1.0 - step(0.53, vKz)), isBase = step(0.2, vKz) * (1.0 - step(0.3, vKz));
    vec3 c = diffuseColor.rgb;
    float ziegelM = step(0.5, fract(vObj.y * 3.6 + step(0.5, fract(vObj.x * 1.7)) * 0.5)) * 0.08;               // Klinkerfugen
    c *= 0.93 + 0.1 * nN(vObj.xy * 2.0 + vIz * 9.0) - ziegelM * step(0.35, c.r - c.b);
    vec3 reet = mix(vec3(0.24, 0.19, 0.13), vec3(0.15, 0.13, 0.1), nN(vec2(vObj.x * 3.0 + vObj.z * 3.0, vObj.y * 0.6) + vIz * 7.0));
    reet = mix(reet, vec3(0.1, 0.13, 0.07), smoothstep(0.62, 0.85, nN(vObj.xz * 0.7 + vIz * 3.0)) * 0.55);          // Moos
    reet *= 0.85 + 0.25 * fract(sin(floor(vObj.y * 9.0 + vObj.x * 0.7) * 17.3) * 341.7) * 0.5;
    c = mix(c, reet, isReet);
    c = mix(c, vec3(0.42, 0.1, 0.07) * (0.85 + 0.25 * step(0.5, fract(vObj.x * 2.5 + step(0.5, fract(vObj.y * 3.0)) * 0.5))), isZiegel);
    c = mix(c, vec3(0.07, 0.08, 0.05), isSod);
    c = mix(c, vec3(0.88, 0.87, 0.84), isTrim);
    c = mix(c, mix(vec3(0.07, 0.25, 0.16), vec3(0.08, 0.16, 0.34), step(0.55, vIz)), isTuer);
    c = mix(c, vec3(0.2, 0.09, 0.07), isBase);
    float wid = fract(sin(dot(floor(vObj * vec3(0.9, 0.5, 0.9)) + vIz * 17.0, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    float an = step(0.38, wid);
    c = mix(c, vec3(0.04, 0.05, 0.06), isWin);
    diffuseColor.rgb = c;
    totalEmissiveRadiance += isWin * an * uFenster * mix(vec3(1.0, 0.6, 0.26), vec3(1.0, 0.8, 0.5), fract(wid * 7.0)) * (1.2 + 1.2 * fract(wid * 13.0));
  }`);
  };
  m.customProgramCacheKey = () => "wl-haus";
  return m;
}
/** Kirche: Schiff mit Ziegeldach, Turm mit Spitzhelm (eine Instanz des Hausmaterials) */
function kircheGeo() {
  const T = [];
  T.push({ g: box(24, 0.6, 11, 0, 0, 0), c: 1, kz: 0.25 }, { g: box(23, 6.5, 10, 0, 3.25, 0), c: 1, kz: 0 });
  satteldach(11.6, 5.1, 6.5, 6.0, 0.55, T, 0.4);
  const ch = new THREE.CylinderGeometry(4.6, 4.6, 6.0, 12, 1, false, 0, Math.PI); ch.rotateY(Math.PI / 2); ch.translate(-11.5, 3.0, 0); T.push({ g: ch, c: 1, kz: 0 });   // Apsis
  T.push({ g: box(6, 17, 6, 14.3, 8.5, 0), c: 1, kz: 0 });
  const sp = new THREE.ConeGeometry(4.5, 12, 4); sp.rotateY(Math.PI / 4); sp.translate(14.3, 23, 0); T.push({ g: sp, c: 1, kz: 0.6 });
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) T.push({ g: box(1.3, 3.2, 0.06, -7.5 + i * 5, 3.4, s * 5.03), c: 1, kz: 0.75 }, { g: box(1.0, 2.9, 0.06, -7.5 + i * 5, 3.4, s * 5.06), c: 1, kz: 1 });
  for (const s of [-1, 1]) T.push({ g: box(0.06, 1.4, 1.0, 14.3 + s * 3.03, 14.5, 0), c: 1, kz: 0.75 });
  T.push({ g: box(1.6, 2.6, 0.08, 17.33, 1.3, 0, Math.PI / 2), c: 1, kz: 0.85 });
  return sammle(T);
}
function schafGeo() {
  const K = [], H = [], wolle = [0.86, 0.84, 0.77], bein = [0.14, 0.13, 0.12];
  const leib = new THREE.IcosahedronGeometry(0.5, 1); leib.scale(1.15, 0.72, 0.64); leib.translate(0, 0.74, 0); K.push({ g: leib, c: wolle });
  const hinten = new THREE.IcosahedronGeometry(0.34, 1); hinten.translate(-0.38, 0.76, 0); K.push({ g: hinten, c: wolle });
  for (const [x, z] of [[0.32, 0.15], [0.32, -0.15], [-0.36, 0.15], [-0.36, -0.15]]) { const b = new THREE.CylinderGeometry(0.045, 0.05, 0.46, 5); b.translate(x, 0.23, z); K.push({ g: b, c: bein }); }
  const hals = new THREE.CylinderGeometry(0.11, 0.17, 0.32, 6); hals.rotateZ(-1.0); hals.translate(0.55, 0.86, 0); H.push({ g: hals, c: wolle });
  const kopf = new THREE.IcosahedronGeometry(0.15, 1); kopf.scale(1.35, 0.9, 0.82); kopf.translate(0.78, 0.88, 0); H.push({ g: kopf, c: [0.82, 0.8, 0.76] });
  for (const s of [-1, 1]) { const o = new THREE.ConeGeometry(0.035, 0.14, 4); o.rotateX(s * 1.2); o.translate(0.7, 0.95, 0.1 * s); H.push({ g: o, c: [0.7, 0.66, 0.62] }); }
  return { koerper: sammle(K), kopf: sammle(H) };
}
function baumGeo() {
  const T = [], rinde = [0.14, 0.12, 0.1], laub = [0.09, 0.085, 0.06];
  T.push(zweig([0, 0, 0], [-0.7, 4.0, 0.1], 0.3, 0.17, rinde));
  for (let k = 0; k < 7; k++) { const a = k * 2.4 + 0.3, l = 1.8 + 1.2 * hash(k, 3), y = 2.6 + 0.35 * k; T.push(zweig([-0.6, y, 0.1], [-0.6 - 0.8 - Math.cos(a) * l * 0.6, y + l * 0.8, Math.sin(a) * l * 0.7], 0.11, 0.03, rinde)); }
  for (let k = 0; k < 9; k++) {
    const a = k * 2.1, r = 0.9 + 0.7 * hash(k, 5), g = new THREE.IcosahedronGeometry(r, 1), p = g.getAttribute("position");
    for (let j = 0; j < p.count; j++) { const f = 0.7 + 0.55 * hash(Math.round(p.getX(j) * 17 + p.getY(j) * 11 + p.getZ(j) * 7) + k * 50, 9); p.setXYZ(j, p.getX(j) * f, p.getY(j) * f * 0.75, p.getZ(j) * f); }
    g.computeVertexNormals(); g.translate(-1.4 - Math.cos(a) * 1.5, 5.0 + 1.3 * hash(k, 6), Math.sin(a) * 1.5); T.push({ g, c: laub });
  }
  return sammle(T);
}
function kutterGeo() {
  const T = [];
  const rumpf = new THREE.BoxGeometry(17, 2.4, 5.2, 10, 2, 3), p = rumpf.getAttribute("position");
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), s = x / 8.5, y = p.getY(i); const br = s > 0.25 ? 1 - Math.pow((s - 0.25) / 0.75, 1.8) * 0.92 : 1 - 0.18 * Math.pow(-Math.min(s, 0), 3); p.setZ(i, p.getZ(i) * br * (y < 0 ? 0.75 : 1)); p.setY(i, y + 0.6 * Math.max(s, 0) ** 2 * (y > 0 ? 1 : 0)); }
  rumpf.computeVertexNormals(); rumpf.translate(0, 0.6, 0); T.push({ g: rumpf, c: (x, y) => (y > 1.45 ? [0.85, 0.85, 0.82] : y > 0.25 ? [0.12, 0.28, 0.2] : [0.35, 0.1, 0.08]) });
  T.push({ g: box(3.4, 2.4, 3.2, 3.5, 3.0, 0), c: [0.88, 0.88, 0.84] }, { g: box(3.6, 0.18, 3.4, 3.5, 4.3, 0), c: [0.2, 0.2, 0.22] }, { g: box(0.08, 0.7, 2.6, 5.22, 3.4, 0), c: [0.05, 0.06, 0.08] });
  T.push({ g: box(4.5, 0.9, 3.4, -3.5, 2.3, 0), c: [0.3, 0.3, 0.32] });
  return sammle(T);
}

// ----------------------------------------------------------------------------------------------- Welt
export const ORTE = {
  turm: [0, 30, 0], dorf: [-250, 8, -1450], kirche: [-235, 20, -1450], deich: [-250, 8.6, deichZ(-250)], kutter: [0, 1, 0], hallig: [6800, 5, 6600],
  pellworm: [2500, 10, 15200], amrum: [21000, 20, 27000], windpark: [-6000, 120, -6200], sued: [0, 5, -5000],
};
export class WattLeuchtturm {
  constructor(szene, { schatten = 2048, spiegel = 0.5, nebelDichte = 2.6e-5, schafe = 300, moewen = 34 } = {}) {
    this.szene = szene; this.schattenAn = !!schatten; this.nebelDichte = nebelDichte; this.vertices = 0;
    this.u = { uFenster: { value: 1 }, uZeit: { value: 0 }, uWind: { value: 0.5 }, uHimmelF: { value: new THREE.Color() }, uStrahlD: { value: new THREE.Vector3(0, 0, 1) }, uLinse: { value: 1 } };
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._e = new THREE.Euler(); this._c = new THREE.Color(); this._v = new THREE.Vector3();
    szene.fog = new THREE.FogExp2("#04070E", nebelDichte);
    this.himmel = new WattHimmel(szene);
    this._lichter(schatten);
    this.punkte = new Punkte(szene, 1400);
    this.striche = new Striche(szene, 3200);
    this.statLichter = [];
    this._watt(spiegel); this._koog(); this._deich(); this._turmWarft(); this._turm(); this._galerie(); this._steg(); this._dorf(); this._inseln(); this._windparks(); this._pricken(); this._kutter();
    this._schafe(schafe); this._moewen(moewen);
    this.striche.fertig();
    this.post = {}; this.zustand = {};
    this.dorfPos = [...ORTE.dorf];
    const ex = -236, ez = -1372; this.dorfAugePos = [ex, hoehe(ex, ez) + 1.7, ez];
    this.dorfBlick = { yaw: 4, pitch: 24, fov: 62 };
  }
  _inst(geo, mat, n, schatten = false) { const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = schatten && this.schattenAn; im.receiveShadow = this.schattenAn; im.frustumCulled = false; this.szene.add(im); this.vertices += geo.getAttribute("position").count * n; return im; }
  _setze(im, i, x, y, z, s, ry, sx = s, sz = s, rx = 0, rz = 0) { this._e.set(rx, ry, rz); this._q.setFromEuler(this._e); this._s.set(sx, s, sz); this._p.set(x, y, z); this._m.compose(this._p, this._q, this._s); im.setMatrixAt(i, this._m); }
  _mesh(geo, mat, { schatten = true, empf = true, ziel = this.szene } = {}) { const m = new THREE.Mesh(geo, mat); m.castShadow = schatten && this.schattenAn; m.receiveShadow = empf && this.schattenAn; ziel.add(m); this.vertices += geo.getAttribute("position").count; return m; }

  _lichter(schatten) {
    const key = new THREE.DirectionalLight("#FFFFFF", 0.5);
    if (schatten) { key.castShadow = true; key.shadow.mapSize.set(+schatten || 2048, +schatten || 2048); Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 200 }); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03; }
    const hemi = new THREE.HemisphereLight("#1A2440", "#070810", 0.3);
    const laterne = new THREE.PointLight("#FFD9A0", 0, 14, 2); laterne.position.set(0, TURM.galerie + 2.4, 0);
    const dorf = new THREE.PointLight("#FFB466", 0, 60, 2);
    this.szene.add(key, key.target, hemi, laterne, dorf);
    this.lichter = { key, hemi, laterne, dorf };
  }
  _watt(spiegel) {
    const S = prielNetz(); this.priele = S;
    this.texNah = rastern(S, BOX_NAH, 2048); this.texFern = rastern(S, BOX_FERN, 2048);
    const w = Math.round(1080 * Math.min(spiegel, 0.5)), h = Math.round(1920 * Math.min(spiegel, 0.5));
    const r = new Reflector(new THREE.PlaneGeometry(90000, 90000), { textureWidth: w, textureHeight: h, clipBias: 0.002, multisample: 4, shader: WATT, color: "#FFFFFF" });
    r.material.fog = true; const U = r.material.uniforms;
    U.texel.value.set(1 / w, 1 / h); U.tNah.value = this.texNah; U.tFern.value = this.texFern;
    U.boxN.value.set(BOX_NAH[0], BOX_NAH[1], 1 / BOX_NAH[2], 0); U.boxF.value.set(BOX_FERN[0], BOX_FERN[1], 1 / BOX_FERN[2], 0);
    r.rotation.x = -Math.PI / 2; r.renderOrder = 1; r.frustumCulled = false;
    this.wasser = r; this.wasserU = U; this.szene.add(r);
  }
  _koog() {
    const u = this.u, m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.95 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uHimmelF: u.uHimmelF });
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vKW;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvKW = (modelMatrix * vec4(position, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vKW; uniform vec3 uHimmelF;\n${GLSL_NOISE}\nfloat lin(float a, float h, float f) { return clamp((h - a) / max(f, 1e-3) + 0.5, 0.0, 1.0); }`)
        .replace("#include <color_fragment>", `#include <color_fragment>
  vec2 p = vKW.xz; vec2 fw = fwidth(p); float f = max(fw.x, fw.y);
  vec3 z = nZelle(vec2(p.x * 0.0042, p.y * 0.0019) + 3.0);
  float art = z.z;
  vec3 c = art < 0.5 ? mix(vec3(0.12, 0.17, 0.07), vec3(0.16, 0.2, 0.09), art * 2.0) : art < 0.72 ? vec3(0.22, 0.19, 0.11) : art < 0.88 ? vec3(0.11, 0.085, 0.06) : vec3(0.17, 0.2, 0.1);
  float fa = 1.0 - smoothstep(1.5, 8.0, f);
  c *= 0.85 + 0.25 * nN(p * 0.05 + art * 9.0) + 0.12 * (nN(p * 0.9) - 0.5) * fa;
  if (art > 0.72 && art < 0.88) c *= 0.9 + 0.18 * sin(p.x * 3.0 + art * 40.0) * fa;                               // Pflugfurchen
  float graben = (1.0 - smoothstep(0.0, 0.035 + f * 0.0004, z.y - z.x));
  graben = mix(graben, 0.05, smoothstep(6.0, 25.0, f));
  c = mix(c, uHimmelF * 3.0 + vec3(0.02, 0.025, 0.02), graben * 0.85);
  float h = vKW.y; c = mix(c, vec3(0.14, 0.19, 0.08) * (0.9 + 0.2 * nN(p * 0.2)), smoothstep(1.4, 2.4, h));       // Warften: Gras
  float sx = -240.0 + 14.0 * sin(p.y * 0.004);
  float str = max(lin(abs(p.x - sx), 2.8, fw.x), lin(abs(p.y + 1900.0), 2.6, fw.y) * step(-2600.0, p.x) * step(p.x, 900.0));
  str = mix(str, 0.0, smoothstep(5.0, 14.0, f));
  c = mix(c, vec3(0.085, 0.085, 0.09) * (0.9 + 0.2 * nN(p * 2.0)), str);
  diffuseColor.rgb = c;`);
    };
    m.customProgramCacheKey = () => "wl-koog";
    const geo = gitterC(-250, -1450, -45000, 45000, -45000, -600, 2.0, 0.022, (x, z) => koogH(x, z));
    this.koog = this._mesh(geo, m, { schatten: false });
    // Silageballen auf den Wiesen
    const ballen = this._inst(new THREE.CylinderGeometry(0.65, 0.65, 1.2, 14), new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.45 }), 46, true);
    for (let i = 0; i < 46; i++) {
      const gx = -900 + 420 * Math.floor(i / 8) + 60 * hash(i, 41), gz = -1250 - 160 * (i % 8) - 300 * hash(i, 42), x = gx + 1.4 * (i % 3), z = gz + 1.5 * Math.floor((i % 6) / 3);
      this._setze(ballen, i, x, koogH(x, z) + 0.65, z, 1, hash(i, 43) * 0.3, 1, 1, 0, Math.PI / 2);
      ballen.setColorAt(i, this._c.setRGB(...(hash(i, 44) < 0.65 ? [0.82, 0.82, 0.8] : [0.05, 0.07, 0.05])));
    }
    ballen.instanceColor.needsUpdate = true;
  }
  _deich() {
    const quer = [74, 68, 60, 50, 40, 30, 20, 10, 4, 1.8, -1.8, -6, -12, -18, -25, -28, -31, -32.5, -34, -35.5, -37, -42];
    const xs = []; for (let x = -16000; x <= 9000;) { xs.push(x); x += 4 + 0.008 * Math.abs(x + 250); }
    const nq = quer.length, pos = new Float32Array(xs.length * nq * 3), q = new Float32Array(xs.length * nq);
    xs.forEach((x, i) => quer.forEach((n, j) => { const P = deichPunkt(x, n); pos.set(P, (i * nq + j) * 3); q[i * nq + j] = n; }));
    const idx = []; for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < nq - 1; j++) { const A = i * nq + j, B = A + 1, Cc = A + nq, D = Cc + 1; idx.push(A, Cc, B, B, Cc, D); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("quer", new THREE.BufferAttribute(q, 1)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.95, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float quer; varying float vQ; varying vec3 vDW;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvQ = quer; vDW = (modelMatrix * vec4(position, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying float vQ; varying vec3 vDW;\n${GLSL_NOISE}`)
        .replace("#include <color_fragment>", `#include <color_fragment>
  vec2 p = vDW.xz; float f = max(length(fwidth(p)), 1e-3), fa = 1.0 - smoothstep(1.5, 8.0, f);
  vec3 c = mix(vec3(0.15, 0.2, 0.095), vec3(0.19, 0.22, 0.12), nN(p * 0.08)) * (0.85 + 0.25 * mix(0.5, nN(p * 1.3), fa));
  c = mix(c, vec3(0.12, 0.165, 0.075), 1.0 - smoothstep(-12.0, -2.0, vQ));
  c = mix(c, vec3(0.2, 0.19, 0.15), (1.0 - smoothstep(1.2, 2.2, abs(vQ))) * 0.6);                                   // Trampelpfad auf der Krone
  c = mix(c, vec3(0.09, 0.09, 0.095), (1.0 - smoothstep(1.6, 2.4, abs(vQ + 28.0))));                                 // Deichverteidigungsweg
  c = mix(c, vec3(0.05, 0.06, 0.07), (1.0 - smoothstep(0.8, 1.6, abs(vQ + 34.0))) * 0.8);                            // Graben
  c = mix(c, vec3(0.22, 0.2, 0.16), smoothstep(62.0, 72.0, vQ) * 0.7);                                               // Deichfuß (Spülsaum)
  diffuseColor.rgb = c;`);
    };
    m.customProgramCacheKey = () => "wl-deich";
    this.deich = this._mesh(geo, m, { schatten: false });
    // Zaun am Deichfuß (seewärts) als Striche: Pfähle und zwei Drähte
    const pf = [0.32, 0.27, 0.22], dr = [0.4, 0.4, 0.4];
    for (let x = -2600; x < 1600; x += 4.2) { const a = deichPunkt(x, 58), y0 = Math.max(a[1], 0); this.striche.neu([a[0], y0 - 0.1, a[2]], [a[0], y0 + 1.05, a[2]], 0.09, pf); }
    for (let x = -2600; x < 1600; x += 12.6) for (const hy of [0.55, 0.95]) { const a = deichPunkt(x, 58), b = deichPunkt(x + 12.6, 58); this.striche.neu([a[0], Math.max(a[1], 0) + hy, a[2]], [b[0], Math.max(b[1], 0) + hy, b[2]], 0.01, dr); }
  }
  _turmWarft() {
    const prof = []; for (let i = 0; i <= 30; i++) { const d = (i / 30) * 46; prof.push(new THREE.Vector2(d, turmWarft(d))); }
    const geo = new THREE.LatheGeometry(prof.map((v) => new THREE.Vector2(v.x, v.y)), 72);
    const p = geo.getAttribute("position"); for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) + 0.25 * (vn(x * 0.15, z * 0.15) - 0.5) * smoothstep(2, 10, Math.hypot(x, z))); }
    geo.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.95 });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vTW;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvTW = (modelMatrix * vec4(position, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vTW;\n${GLSL_NOISE}`).replace("#include <color_fragment>", `#include <color_fragment>
  vec2 p = vTW.xz; float r = length(p);
  vec3 c = mix(vec3(0.13, 0.18, 0.08), vec3(0.18, 0.2, 0.1), nN(p * 0.4)) * (0.85 + 0.25 * nN(p * 3.0));
  float weg = (1.0 - smoothstep(0.9, 1.3, abs(p.x * 0.995 - p.y * 0.1 + 0.0))) * step(p.y, -2.0) + (1.0 - smoothstep(3.6, 4.4, r)) * step(3.0, r);
  c = mix(c, vec3(0.26, 0.24, 0.2) * (0.85 + 0.3 * nN(p * 6.0)), clamp(weg, 0.0, 1.0));
  diffuseColor.rgb = c;`);
    };
    m.customProgramCacheKey = () => "wl-warft";
    this._mesh(geo, m, { schatten: false });
    // Wärterhäuser (Ziegeldach) und Schuppen auf der Warft
    const hm = hausMat(this.u), im = this._inst(hausGeo(3), hm, 2, true);
    this._setze(im, 0, -9.5, TURM.warft, -12.5, 1, 0.05); this._setze(im, 1, 9.8, TURM.warft, -12.0, 1, -0.05);
    im.setColorAt(0, C("#E9E5DB")); im.setColorAt(1, C("#E9E5DB")); im.instanceColor.needsUpdate = true;
    this.waerterFenster = [[-9.5, TURM.warft + 1.45, -16.6], [9.8, TURM.warft + 1.45, -16.1], [-12, TURM.warft + 1.45, -16.6], [7, TURM.warft + 1.45, -16.1]];
  }
  _turm() {
    const prof = []; const y0 = TURM.warft, y1 = TURM.galerie - 0.15;
    for (let i = 0; i <= 34; i++) { const f = i / 34, y = lerp(y0, y1, f); prof.push(new THREE.Vector2(lerp(3.3, 2.22, Math.pow(f, 0.85)) + 0.25 * Math.exp(-f * 30), y)); }
    const geo = new THREE.LatheGeometry(prof, 64);
    const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.55, metalness: 0.15 });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vTL;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvTL = position;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vTL;\n${GLSL_NOISE}`).replace("#include <color_fragment>", `#include <color_fragment>
  float y = vTL.y; float a = atan(vTL.x, vTL.z);
  float band = step(0.5, fract((y - 4.0) / 11.0 + 0.0)) ;
  float rot = 1.0 - step(0.5, fract((y - ${TURM.warft.toFixed(1)}) / 11.2));
  vec3 c = mix(vec3(0.86, 0.85, 0.82), vec3(0.52, 0.07, 0.06), rot);
  c *= 0.94 + 0.08 * nN(vec2(a * 20.0, y * 2.0));
  c *= 1.0 - 0.18 * smoothstep(0.885, 0.915, abs(fract(y / 1.85) - 0.5) * 1.85);                                  // Plattenstöße
  c *= 1.0 - 0.12 * smoothstep(0.55, 0.9, nN(vec2(a * 6.0, y * 0.25))) * (1.0 - rot);                              // Rostfahnen
  for (int i = 0; i < 6; i++) { float yy = 8.0 + float(i) * 5.2, aa = float(i) * 2.2; float da = mod(a - aa + 3.14159, 6.28318) - 3.14159; vec2 q = vec2(da * 2.6, y - yy); float o = length(q); c = mix(c, vec3(0.04, 0.05, 0.06), 1.0 - smoothstep(0.32, 0.4, o)); }
  diffuseColor.rgb = c;`);
    };
    m.customProgramCacheKey = () => "wl-turm";
    this._mesh(geo, m, { schatten: true });
    const tuer = this._mesh(box(1.1, 2.2, 0.3, 0, TURM.warft + 1.1, -3.4), new THREE.MeshStandardMaterial({ color: "#3A1A14", roughness: 0.7 }));
  }
  _galerie() {
    const G = TURM.galerie, R = TURM.rGelaender, u = this.u, gr = new THREE.Group(); this.szene.add(gr);
    const weiss = new THREE.MeshStandardMaterial({ color: "#E4E2DA", roughness: 0.42, metalness: 0.2 }), rot = new THREE.MeshStandardMaterial({ color: "#8E1F17", roughness: 0.5, metalness: 0.25 });
    const dunkel = new THREE.MeshStandardMaterial({ color: "#1C1D20", roughness: 0.6, metalness: 0.4 }), messing = new THREE.MeshStandardMaterial({ color: "#B08A4A", roughness: 0.35, metalness: 0.85 });
    const add = (g, m, sch = true) => this._mesh(g, m, { schatten: sch, ziel: gr });
    // Gitterboden (Gitterroste mit Tragstäben; gefiltert gegen Moiré)
    const boden = new THREE.RingGeometry(1.9, R + 0.08, 128, 6); boden.rotateX(-Math.PI / 2); boden.translate(0, G, 0);
    const bm = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.5, metalness: 0.5 });
    bm.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vGW;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvGW = (modelMatrix * vec4(position, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vGW;\n${GLSL_NOISE}\nfloat stab(float x, float per, float b) { float f = max(fwidth(x), 1e-4); float a = abs(fract(x / per) - 0.5) * per; float c = clamp((b * 0.5 - a) / f + 0.5, 0.0, 1.0); return mix(c, b / per, smoothstep(per * 0.3, per * 0.9, f)); }`)
        .replace("#include <color_fragment>", `#include <color_fragment>
  vec2 p = vGW.xz; float r = length(p), a = atan(p.x, p.y);
  float s1 = stab(a * r, 0.034, 0.006);                                    // Tragstäbe quer zum Umlauf
  float s2 = stab(r, 0.1, 0.008);                                          // Querstäbe
  float rahmen = stab(a * r, 1.05, 0.06) + (1.0 - smoothstep(0.0, 0.02, abs(r - ${(R - 0.02).toFixed(2)}) - 0.04));
  float metall = clamp(max(max(s1, s2), rahmen), 0.0, 1.0);
  vec3 loch = vec3(0.025, 0.028, 0.03);
  vec3 c = mix(loch, vec3(0.38, 0.37, 0.35) * (0.8 + 0.3 * nN(p * 9.0)), metall);
  c = mix(c, vec3(0.32, 0.12, 0.06), smoothstep(0.6, 0.85, nN(p * 3.0)) * metall * 0.35);                           // Rost
  diffuseColor.rgb = c;`);
    };
    bm.customProgramCacheKey = () => "wl-gitter";
    add(boden, bm, false).receiveShadow = this.schattenAn;
    const kante = new THREE.CylinderGeometry(R + 0.08, R + 0.08, 0.18, 128, 1, true); kante.translate(0, G - 0.09, 0); add(kante, weiss);
    const unten = new THREE.RingGeometry(2.1, R + 0.08, 96, 1); unten.rotateX(Math.PI / 2); unten.translate(0, G - 0.18, 0); add(unten, dunkel, false);
    for (let i = 0; i < 24; i++) {                                                                          // Konsolen unter der Galerie
      const a = (i / 24) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const g = new THREE.BufferGeometry(); const P = (r, y) => [s * r, y, c * r];
      const T = [tri(P(2.24, G - 2.2), P(2.24, G - 0.18), P(R, G - 0.18)), tri(P(R, G - 0.18), P(2.24, G - 0.18), P(2.24, G - 2.2))];
      for (const t of T) add(t, weiss);
    }
    // Geländer: Pfosten, Handlauf, Knieleisten, Stäbe, Fußleiste
    const H = 1.15;
    const hl = new THREE.TorusGeometry(R, 0.03, 10, 220); hl.rotateX(Math.PI / 2); hl.translate(0, G + H, 0); add(hl, weiss);
    for (const hy of [0.76, 0.4]) { const t = new THREE.TorusGeometry(R, 0.013, 6, 220); t.rotateX(Math.PI / 2); t.translate(0, G + hy, 0); add(t, weiss); }
    const fl = new THREE.CylinderGeometry(R - 0.01, R - 0.01, 0.13, 160, 1, true); fl.translate(0, G + 0.065, 0); add(fl, weiss);
    const pfosten = this._inst(new THREE.CylinderGeometry(0.024, 0.026, H, 8), weiss, 28, true);
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; this._setze(pfosten, i, Math.sin(a) * R, G + H / 2, Math.cos(a) * R, 1, 0); }
    const staebe = this._inst(new THREE.CylinderGeometry(0.008, 0.008, H - 0.13, 5), weiss, 196, true);
    for (let i = 0; i < 196; i++) { const a = ((i + 0.5) / 196) * Math.PI * 2; this._setze(staebe, i, Math.sin(a) * R, G + 0.13 + (H - 0.13) / 2, Math.cos(a) * R, 1, 0); }
    // Laterne: Unterbau, Glas mit Sprossen, Linse, Kuppel, Lüfterkugel, Wetterfahne, Blitzableiter
    const unterbau = new THREE.CylinderGeometry(1.95, 1.95, 1.05, 48); unterbau.translate(0, G + 0.52, 0); add(unterbau, rot);
    const tuer = box(0.7, 0.9, 0.06, 0, G + 0.5, -1.97); add(tuer, dunkel, false);
    const glasM = new THREE.MeshStandardMaterial({ color: "#0B1013", roughness: 0.06, metalness: 0.7, emissive: "#000000" });
    glasM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uStrahlD: u.uStrahlD, uLinse: u.uLinse });
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vLN;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvLN = normalize(position * vec3(1.0, 0.0, 1.0) + vec3(1e-4));");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vLN; uniform vec3 uStrahlD; uniform float uLinse;")
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n  float fa = max(dot(normalize(vLN.xz), normalize(uStrahlD.xz + vec2(1e-5))), 0.0);\n  totalEmissiveRadiance += vec3(1.0, 0.8, 0.5) * uLinse * (0.025 + 5.0 * pow(fa, 22.0) + 0.25 * pow(fa, 4.0));");
    };
    glasM.customProgramCacheKey = () => "wl-glas";
    const glas = new THREE.CylinderGeometry(1.78, 1.78, 2.7, 48, 1, true); glas.translate(0, G + 1.05 + 1.35, 0); add(glas, glasM, false);
    const spr = this._inst(new THREE.BoxGeometry(0.05, 2.7, 0.07), rot, 16, true);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; this._setze(spr, i, Math.sin(a) * 1.8, G + 2.4, Math.cos(a) * 1.8, 1, a); }
    for (const hy of [1.07, 2.4, 3.74]) { const t = new THREE.TorusGeometry(1.81, 0.04, 6, 64); t.rotateX(Math.PI / 2); t.translate(0, G + hy, 0); add(t, rot); }
    const kuppel = new THREE.SphereGeometry(2.0, 48, 14, 0, Math.PI * 2, 0, Math.PI / 2); kuppel.scale(1, 0.62, 1); kuppel.translate(0, G + 3.75, 0); add(kuppel, rot);
    const traufe = new THREE.TorusGeometry(2.0, 0.07, 6, 64); traufe.rotateX(Math.PI / 2); traufe.translate(0, G + 3.77, 0); add(traufe, rot);
    const decke = new THREE.CircleGeometry(2.02, 48); decke.rotateX(Math.PI / 2); decke.translate(0, G + 3.74, 0); add(decke, dunkel, false);
    const kugel = new THREE.SphereGeometry(0.32, 16, 10); kugel.translate(0, G + 5.12, 0); add(kugel, rot);
    add(zweig([0, G + 5.3, 0], [0, G + 7.2, 0], 0.025, 0.012, null).g, messing);
    this.fahne = new THREE.Group(); this.fahne.position.set(0, G + 6.6, 0); gr.add(this.fahne);
    const fp = new THREE.Shape(); fp.moveTo(-0.15, 0); fp.lineTo(0.55, 0.0); fp.lineTo(0.55, 0.32); fp.lineTo(0.15, 0.32); fp.lineTo(-0.15, 0.12); fp.closePath();
    const fg = new THREE.ExtrudeGeometry(fp, { depth: 0.015, bevelEnabled: false }); fg.translate(0, -0.05, 0); this._mesh(fg, messing, { ziel: this.fahne });
    this._mesh(box(0.6, 0.03, 0.03, -0.45, 0.02, 0), messing, { ziel: this.fahne }); this._mesh(new THREE.ConeGeometry(0.06, 0.18, 6).rotateZ(Math.PI / 2).translate(-0.8, 0.02, 0), messing, { ziel: this.fahne });
    for (const [dx, dz] of [[1, 0], [0, 1]]) add(box(dx ? 0.9 : 0.02, 0.02, dz ? 0.9 : 0.02, 0, G + 6.15, 0), messing, false);
    // Linse (sichtbar beim Blick zurück durch das Glas)
    const linse = new THREE.CylinderGeometry(0.62, 0.62, 1.5, 24); linse.translate(0, G + 2.3, 0);
    this.linseM = new THREE.MeshStandardMaterial({ color: "#222018", emissive: "#FFD9A0", emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.6 }); add(linse, this.linseM, false);
    // Windmesser (Schalenkreuz) an einem Pfosten, Tau aufgeschossen am Geländer
    const wa = (202 * D2R), wx = Math.sin(wa) * (R + 0.05), wz = -Math.cos(wa) * (R + 0.05);
    add(zweig([wx, G + 0.2, wz], [wx, G + 2.35, wz], 0.024, 0.02, null).g, dunkel); add(box(0.08, 0.1, 0.08, wx, G + H, wz), dunkel);
    this.anemo = new THREE.Group(); this.anemo.position.set(wx, G + 2.4, wz); gr.add(this.anemo);
    const grau = new THREE.MeshStandardMaterial({ color: "#8A8E92", roughness: 0.4, metalness: 0.6 });
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2, arm = zweig([0, 0, 0], [Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15], 0.005, 0.005, null).g; this._mesh(arm, grau, { ziel: this.anemo });
      const schale = new THREE.SphereGeometry(0.032, 12, 8, 0, Math.PI); schale.rotateY(a + Math.PI / 2); schale.translate(Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15); this._mesh(schale, grau, { ziel: this.anemo }); }
    this._mesh(box(0.16, 0.05, 0.05, 0.0, -0.08, 0), dunkel, { ziel: this.anemo });
    const tauM = new THREE.MeshStandardMaterial({ color: "#B59B6E", roughness: 0.95 });
    const ta = 172 * D2R, tx = Math.sin(ta) * (R + 0.07), tz = -Math.cos(ta) * (R + 0.07), tr = new THREE.Vector3(Math.cos(ta), 0, Math.sin(ta));
    for (let k = 0; k < 5; k++) { const t = new THREE.TorusGeometry(0.22 - k * 0.008, 0.017, 6, 26); t.scale(1, 1.25, 1); t.rotateY(-ta); t.translate(tx, G + H - 0.25 - k * 0.012, tz); add(t, tauM); }
    const tc = new THREE.CatmullRomCurve3([[tx - tr.x * 0.12, G + H + 0.02, tz - tr.z * 0.12], [tx, G + H - 0.05, tz], [tx + tr.x * 0.05, G + 0.6, tz + tr.z * 0.05], [tx + tr.x * 0.12, G + 0.1, tz + tr.z * 0.15]].map((v) => new THREE.Vector3(...v)));
    add(new THREE.TubeGeometry(tc, 30, 0.017, 6), tauM);
    const tb = new THREE.CatmullRomCurve3([[tx + tr.x * 0.12, G + 0.1, tz + tr.z * 0.15], [tx + tr.x * 0.35, G + 0.03, tz + tr.z * 0.3], [tx + tr.x * 0.55, G + 0.03, tz + tr.z * 0.1]].map((v) => new THREE.Vector3(...v)));
    add(new THREE.TubeGeometry(tb, 16, 0.017, 6), tauM);
    // Steigleiter zur Kuppel (hinten)
    for (const s of [-1, 1]) add(zweig([s * 0.2, G + 1.05, -2.0], [s * 0.2, G + 3.8, -2.02], 0.012, 0.012, null).g, dunkel);
    for (let k = 0; k < 8; k++) add(box(0.4, 0.02, 0.02, 0, G + 1.25 + k * 0.32, -2.01), dunkel, false);
    this.galerieG = gr;
  }
  _steg() {
    const pts = []; for (let i = 0; i <= 120; i++) { const f = i / 120; pts.push([lerp(-8, -420, f) + 40 * Math.sin(f * 3.1), lerp(-42, deichZ(-420) + 66, f)]); }
    const T = [], holz = [0.3, 0.24, 0.18];
    for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az); T.push({ g: box(1.6, 0.1, L + 0.05, (ax + bx) / 2, 0.75, (az + bz) / 2, ry), c: holz }); }
    this._mesh(sammle(T), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), { schatten: false });
    const n = 240, im = this._inst(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 5), new THREE.MeshStandardMaterial({ color: "#2B2420", roughness: 0.9 }), n, false); let k = 0;
    for (let i = 0; i < pts.length - 1 && k < n - 1; i++) for (const s of [-1, 1]) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), nx = (bz - az) / L, nz = -(bx - ax) / L; this._setze(im, k++, ax + nx * 0.75 * s, 0.2, az + nz * 0.75 * s, 1, 0); }
    im.count = k;
  }
  _dorf() {
    const u = this.u, mat = hausMat(u), farbe = [C("#7E3426"), C("#E6E1D5"), C("#8C3E2C"), C("#DCD6C8"), C("#6F2D22"), C("#EAE6DC")];
    const plaetze = [[], [], [], []], fenster = [];
    const stelle = (x, z, ry, art, f) => {
      plaetze[art].push({ x, z, ry, f });
      const A = HAUS_ARTEN[art], c = Math.cos(ry), s = Math.sin(ry), y = koogH(x, z) + 1.45;
      for (let i = 0; i < A.nf; i++) for (const sd of [-1, 1]) {
        const lx = -A.l + (2 * A.l / A.nf) * (i + 0.5), lz = sd * (A.b + 0.12), hsh = hash(Math.round(x * 3 + z * 7 + i * 13 + sd * 5), 77);
        if (hsh < 0.55) fenster.push({ p: [x + lx * c + lz * s, y, z - lx * s + lz * c], f: hsh < 0.2 ? [2.2, 1.5, 0.75] : [1.6, 0.95, 0.4] });
      }
    };
    const [kx, kz, kr] = WARFTEN[0];
    for (let k = 0; k < 7; k++) { const a = 0.35 + (k / 7) * Math.PI * 2 + 0.2 * hash(k, 61), r = kr * 0.43; stelle(kx + Math.cos(a) * r, kz + Math.sin(a) * r, (hash(k, 62) < 0.75 ? 0 : Math.PI / 2) + (hash(k, 63) - 0.5) * 0.25, hash(k, 64) < 0.6 ? 0 : 1, farbe[k % farbe.length]); }
    WARFTEN.slice(1, 8).forEach(([x, z, r], i) => { const n = r > 40 ? 3 : r > 33 ? 2 : 1; for (let k = 0; k < n; k++) { const a = hash(i, 71) * 6.28 + (k / n) * 6.28, rr = n > 1 ? r * 0.36 : 0; stelle(x + Math.cos(a) * rr, z + Math.sin(a) * rr, (hash(i * 5 + k, 72) < 0.8 ? 0 : Math.PI / 2) + (hash(i * 5 + k, 73) - 0.5) * 0.2, n > 1 && k === 0 ? 0 : hash(i * 5 + k, 74) < 0.5 ? 0 : 1, farbe[(i + k) % farbe.length]); } });
    WARFTEN.slice(8).forEach(([x, z, r], i) => { stelle(x, z, (hash(i, 81) - 0.5) * 0.3, hash(i, 82) < 0.4 ? 2 : 0, farbe[i % farbe.length]); if (hash(i, 83) < 0.6) stelle(x + r * 0.45, z - r * 0.3, Math.PI / 2, 1, farbe[(i + 2) % farbe.length]); });
    this.hausZahl = 0;
    plaetze.forEach((liste, art) => {
      if (!liste.length) return;
      const im = this._inst(hausGeo(art), mat, liste.length, true);
      liste.forEach((h, i) => { this._setze(im, i, h.x, koogH(h.x, h.z) - 0.05, h.z, 1, h.ry); im.setColorAt(i, h.f); });
      im.instanceColor.needsUpdate = true; this.hausZahl += liste.length;
    });
    const ki = this._inst(kircheGeo(), mat, 1, true); this._setze(ki, 0, kx + 4, koogH(kx, kz) - 0.1, kz - 2, 1, 0.04); ki.setColorAt(0, C("#7A3527")); ki.instanceColor.needsUpdate = true;
    for (let i = 0; i < 4; i++) fenster.push({ p: [kx + 4 - 7.5 + i * 5, koogH(kx, kz) + 3.4, kz - 2 - 5.2], f: [1.2, 0.8, 0.45] });
    fenster.push({ p: [kx + 4 + 14.3, koogH(kx, kz) + 14.5, kz - 2 - 3.1], f: [1.4, 1.3, 1.1] });
    for (const L of fenster) this.statLichter.push({ ...L, art: "fenster", r: 0.9, nah: 9 });
    // Bäume (Windflüchter) um die Warften
    const bl = [];
    WARFTEN.forEach(([x, z, r], i) => { const n = i === 0 ? 12 : 4; for (let k = 0; k < n; k++) { const a = hash(i * 31 + k, 91) * 6.28, rr = r * (0.7 + 0.25 * hash(i * 31 + k, 92)), bx = x + Math.cos(a) * rr, bz = z + Math.sin(a) * rr; if (Math.hypot(bx + 236, bz + 1372) < 38) continue; bl.push([bx, bz, 0.75 + 0.6 * hash(i * 31 + k, 93)]); } });
    const bm = this._inst(baumGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }), bl.length, true);
    bl.forEach(([x, z, s], i) => { this._setze(bm, i, x, koogH(x, z) - 0.2, z, s, (hash(i, 94) - 0.5) * 0.6); bm.setColorAt(i, this._c.setRGB(0.85 + 0.3 * hash(i, 95), 0.85 + 0.3 * hash(i, 96), 0.85)); });
    bm.instanceColor.needsUpdate = true;
    // Straßenlaternen
    const lm = new THREE.MeshStandardMaterial({ color: "#2A2C30", roughness: 0.6, metalness: 0.5 });
    const lpos = []; for (let i = 0; i < 9; i++) { const z = -1180 - i * 70, x = strasseX(z) + 4.2; lpos.push([x, z]); } for (let i = 0; i < 5; i++) { const x = -520 + i * 110; lpos.push([x, -1904]); }
    const li = this._inst(new THREE.CylinderGeometry(0.06, 0.08, 5.2, 6), lm, lpos.length, true);
    lpos.forEach(([x, z], i) => { const y = koogH(x, z); this._setze(li, i, x, y + 2.6, z, 1, 0); this.statLichter.push({ p: [x - 0.5, y + 5.3, z], art: "laterne", r: 1.1 }); });
    this.dorfLampe = [lpos[2][0] - 0.5, koogH(lpos[2][0], lpos[2][1]) + 5.0, lpos[2][1]];
    for (const p of this.waerterFenster) this.statLichter.push({ p, art: "fenster", f: [1.8, 1.2, 0.6], r: 0.8, nah: 9 });
  }
  _inseln() {
    const m = new THREE.MeshStandardMaterial({ color: "#2A2E28", roughness: 1 });
    const streifen = (x0, x1, zf, hf, n = 220) => {                                    // Silhouette als senkrechtes Band
      const pos = [], idx = [];
      for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n), z = zf(x), h = hf(x); pos.push(x, -1, z, x, h, z); if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      return this._mesh(g, m, { schatten: false, empf: false });
    };
    const pw = streifen(-4500, 9500, (x) => 15200 + 900 * Math.sin(x * 0.0004) - 0.00002 * x * x, (x) => 7 + 6 * smoothstep(0.55, 0.8, vn(x * 0.004, 2)) + 9 * smoothstep(0.7, 0.85, vn(x * 0.011, 5)) * (1 - smoothstep(6000, 9500, x)));
    pw.material.side = THREE.DoubleSide;
    streifen(15500, 27000, (x) => 26000 + 0.35 * (x - 15500), (x) => 12 + 18 * fbm(x * 0.002, 3, 3)).material.side = THREE.DoubleSide;
    streifen(-16000, -6500, (x) => 9000 + 0.25 * (x + 16000), (x) => 6 + 8 * smoothstep(0.6, 0.85, vn(x * 0.006, 9))).material.side = THREE.DoubleSide;   // Nordstrand
    // Hallig mit Warft, Haus und Bäumen
    const [hx, , hz] = ORTE.hallig;
    const hg = new THREE.CylinderGeometry(260, 300, 1.6, 40, 1); hg.translate(hx, 0.1, hz); this._mesh(hg, new THREE.MeshStandardMaterial({ color: "#1D241A", roughness: 1 }), { schatten: false });
    const wg = new THREE.CylinderGeometry(22, 55, 5, 24); wg.translate(hx, 2.6, hz); this._mesh(wg, new THREE.MeshStandardMaterial({ color: "#1F2A1A", roughness: 1 }), { schatten: false });
    const hh = this._inst(hausGeo(0), hausMat(this.u), 2, false); this._setze(hh, 0, hx - 6, 5, hz, 1, 0.1); this._setze(hh, 1, hx + 9, 5, hz + 6, 0.8, 1.5);
    hh.setColorAt(0, C("#8A3A2A")); hh.setColorAt(1, C("#DDD8CC")); hh.instanceColor.needsUpdate = true;
    this.statLichter.push({ p: [hx - 6, 7, hz - 4.3], art: "fenster", f: [2.4, 1.5, 0.7], r: 1.2 });
    // Leuchtfeuer am Horizont: Pellworm (Fl 5 s), Amrum (Fl 7,5 s), St. Peter-Böhl (Fl(2) 9 s), Tonnen im Fahrwasser (grün/rot)
    this.feuer = [
      { p: [1800, 40, 15600], f: [3.2, 3.0, 2.6], r: 30, per: 5, an: 0.6, art: "blitz" },
      { p: [20500, 66, 27800], f: [3.4, 3.1, 2.6], r: 40, per: 7.5, an: 0.6, art: "blitz" },
      { p: [8500, 30, -12500], f: [3.0, 2.8, 2.4], r: 26, per: 9, an: 0.5, art: "doppel" },
    ];
    for (let i = 0; i < 6; i++) { const s = this.priele[Math.floor(hash(i, 51) * 400)]; if (!s) continue; this.feuer.push({ p: [s[0] + 40, 2.5, s[1] + 30], f: i % 2 ? [3.2, 0.25, 0.15] : [0.2, 3.0, 0.6], r: 5, per: 4 + i * 0.3, an: 0.25, art: "blitz" }); }
    for (const z of [15000, 15400]) for (let i = 0; i < 6; i++) this.statLichter.push({ p: [-2500 + i * 1700 + 300 * hash(i, z), 8, z + 200 * hash(i, 3)], art: "fern", r: 9 });
    this.striche.neu([1800, 0, 15600], [1800, 40, 15600], 3.5, [0.55, 0.3, 0.28]);
    this.striche.neu([20500, 0, 27800], [20500, 64, 27800], 4, [0.45, 0.3, 0.28]);
  }
  _windparks() {
    this.wka = [];
    const park = (cx, cz, nx, nz, ab, h, rot, ph) => { for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const k = this.wka.length; this.wka.push({ x: cx + i * ab + (j % 2) * ab * 0.5 + 60 * (hash(k, 7) - 0.5), z: cz - j * ab * 0.8, h, r: rot, ph: hash(k, 8) * 6.28, om: 1.35 + 0.25 * hash(k, 9) }); } };
    park(-8200, -4300, 5, 3, 520, 100, 58, 0);                                                         // Koog-Windpark im Südosten
    park(-4200, -9800, 4, 2, 480, 95, 55, 1);
    park(30000, 9000, 6, 3, 900, 110, 70, 2);                                                         // Offshore im Westen
    park(5200, 15400, 3, 1, 420, 80, 45, 3);                                                          // Pellworm
    const weiss = [0.72, 0.74, 0.76];
    for (const w of this.wka) {
      const y0 = w.z > 14000 || w.x > 20000 ? 0 : Math.max(koogH(w.x, w.z), 0);
      w.y0 = y0; w.turm = this.striche.neu([w.x, y0, w.z], [w.x, y0 + w.h, w.z], 4.2, weiss);
      w.gondel = this.striche.neu([w.x + 4, y0 + w.h + 1.8, w.z], [w.x - 8, y0 + w.h + 1.8, w.z], 3.6, weiss);
      w.blatt = [0, 1, 2].map(() => this.striche.neu([w.x, 0, w.z], [w.x, 1, w.z], 2.4, weiss));
    }
  }
  _pricken() {
    const pr = [0.13, 0.1, 0.08], liste = [];
    for (const s of this.priele) {
      if (s[6] > 1) continue;
      const mx = (s[0] + s[2]) / 2, mz = (s[1] + s[3]) / 2, d = Math.hypot(mx, mz);
      if (d < 320 || d > 4200 || hash(Math.round(mx * 3 + mz), 5) > 0.42) continue;
      const L = Math.hypot(s[2] - s[0], s[3] - s[1]) || 1, nx = (s[3] - s[1]) / L, nz = -(s[2] - s[0]) / L;
      for (const sd of [-1, 1]) liste.push([mx + nx * sd * (s[4] / 2 + 5), mz + nz * sd * (s[4] / 2 + 5), hash(liste.length, 9)]);
    }
    let n = 0;
    for (const [x, z, h] of liste) { if (n++ > 260) break; const top = 2.6 + 1.2 * h; this.striche.neu([x, -0.6, z], [x + 0.15, top, z], 0.11, pr); for (let k = 0; k < 3; k++) this.striche.neu([x + 0.12, top - 0.6, z], [x + 0.12 + (k - 1) * 0.5, top + 0.25, z + (hash(n, k) - 0.5) * 0.4], 0.05, pr); }
  }
  _kutter() {
    let best = null;
    for (const s of this.priele) { if (s[6] !== 0) continue; const mx = (s[0] + s[2]) / 2, mz = (s[1] + s[3]) / 2, d = Math.hypot(mx, mz); if (d > 1500 && d < 2300 && mz > 0 && (!best || Math.abs(d - 1900) < Math.abs(best.d - 1900))) best = { s, d, mx, mz }; }
    if (!best) { this.kutter = null; return; }
    const ry = Math.atan2(best.s[2] - best.s[0], best.s[3] - best.s[1]) - Math.PI / 2;
    const g = new THREE.Group(); this._mesh(kutterGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), { ziel: g, schatten: false });
    g.position.set(best.mx, 0, best.mz); g.rotation.y = ry; this.szene.add(g); g.updateMatrixWorld(true);
    const lw = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z)).toArray();
    const m = [0.15, 0.15, 0.16];
    this.striche.neu(lw(4.5, 4.3, 0), lw(4.5, 12, 0), 0.25, m);
    for (const s of [-1, 1]) this.striche.neu(lw(0, 3.0, s * 2.4), lw(0, 13, s * 3.6), 0.22, m);
    this.kutter = g; ORTE.kutter = lw(0, 3, 0);
    this.statLichter.push({ p: lw(4.5, 12.2, 0), art: "weiss", r: 0.7 }, { p: lw(3.5, 4.6, 1.8), art: "gruen", r: 0.5 }, { p: lw(3.5, 4.6, -1.8), art: "rot", r: 0.5 }, { p: lw(-2, 4.5, 0), art: "deck", r: 1.2 });
  }
  _schafe(n) {
    const g = schafGeo(), mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
    this.schafK = this._inst(g.koerper, mat, n, true); this.schafH = this._inst(g.kopf, mat, n, true);
    this.schafL = [];
    for (let i = 0; i < n; i++) {
      let x, z, y, ry;
      if (i < n * 0.66) { const xx = -2700 + 4300 * hash(i, 101), q = 8 + 50 * hash(i, 102), P = deichPunkt(xx, q); [x, y, z] = P; y = Math.max(y, 0); ry = hash(i, 103) * 6.28; }
      else if (i < n * 0.92) { const xx = -1200 + 1800 * hash(i, 104); x = xx; z = deichZ(xx) + 80 + 260 * Math.pow(hash(i, 105), 1.5); y = 0.02; ry = hash(i, 106) * 6.28; if (marschD(x, z) < 40) z -= 80; }
      else { const a = hash(i, 107) * 6.28, r = 30 + 50 * hash(i, 108); x = Math.sin(a) * r; z = Math.cos(a) * r; y = Math.max(0, turmWarft(r)) + 0.02; ry = hash(i, 109) * 6.28; }
      const schwarz = hash(i, 110) < 0.18;
      this.schafH.setColorAt(i, this._c.setRGB(...(schwarz ? [0.12, 0.11, 0.1] : [1, 1, 1])));
      this.schafK.setColorAt(i, this._c.setRGB(0.9 + 0.12 * hash(i, 111), 0.9 + 0.1 * hash(i, 111), 0.88));
      this.schafL.push({ x, y, z, ry, ph: hash(i, 112) * 6.28, s: 0.85 + 0.3 * hash(i, 113) });
    }
    this.schafK.instanceColor.needsUpdate = true; this.schafH.instanceColor.needsUpdate = true;
    this.schafP = new Punkte(this.szene, n, { additiv: false, minPx: 1.8, weich: 0 });
  }
  _moewen(n) {
    this.moewenNah = new Voegel(this.szene, { anzahl: Math.round(n * 0.35), seed: 131, farbe: "#C8CCD0", spannweite: 1.1 });
    this.moewenNah.schwarm({ zentrum: [0, 54, 0], radius: 38, hoehe: 10, tempo: 7, anzahl: Math.round(n * 0.35), skala: 1.0 });
    this.moewenFern = new Voegel(this.szene, { anzahl: n - Math.round(n * 0.35), seed: 137, farbe: "#202226", spannweite: 1.3 });
    this.moewenFern.schwarm({ zentrum: [260, 9, 820], radius: 190, hoehe: 14, tempo: 8, anzahl: Math.round(n * 0.35), skala: 1.6 });
    this.moewenFern.schwarm({ zentrum: [-520, 16, 420], radius: 120, hoehe: 12, tempo: 7, anzahl: n - Math.round(n * 0.7), skala: 1.4 });
    this.nMoewen = [this.moewenNah.n, this.moewenFern.n];
  }

  /** Auge auf der Galerie in Blickrichtung yaw (Grad), mit sehr leichtem Wind-Wiegen */
  augePos(t, yaw = 180) {
    const a = yaw * D2R, r = TURM.rAuge, w = this._wiegen(t);
    return [Math.sin(a) * r + w[0], TURM.auge + w[1], -Math.cos(a) * r + w[2]];
  }
  _wiegen(t) { return [0.006 * Math.sin(t * 1.07 + 0.4) + 0.003 * Math.sin(t * 2.3), 0.003 * Math.sin(t * 0.83 + 1.2), 0.006 * Math.sin(t * 0.91 + 2.1) + 0.003 * Math.sin(t * 1.9 + 0.7)]; }
  setze(t, kamera, zustand = {}) { return this.update(t, { ...zustand, kamera }); }

  update(t, z = {}) {
    const kam = z.kamera || null, u = this.u, tempo = z.tempo ?? 1, tt = t * tempo;
    const dunkel = clamp(z.dunkel ?? 1), morgen = clamp(z.morgen ?? 0), wolken = clamp(z.wolken ?? 0.5), wind = z.wind ?? 0.5, pegel = clamp(z.pegel ?? 0.3);
    const plN = clamp(z.plNord ?? 0), plR = clamp(z.plRot ?? 0), plK = clamp(z.plKrone ?? 0), plS = clamp(z.plSued ?? 0), plH = clamp(z.plHelle ?? 0), strahl = z.strahl ?? 1;
    const nacht = clamp(dunkel * (1 - morgen * 0.85));
    if (kam) this.himmel.folge(kam);
    // --- Himmelsgrundfarben (linear): Abend ↔ Nacht, dann Morgengrauen darüber
    const mix3 = (a, b, f) => this._c.copy(C(a)).lerp(C(b), f).clone();
    const zen = mix3("#14265C", "#010208", Math.pow(dunkel, 0.8)).lerp(C("#0F1F48"), morgen), hor = mix3("#56679C", "#050913", Math.pow(dunkel, 0.7)).lerp(C("#4A5C92"), morgen);
    const unt = mix3("#1A2036", "#020306", dunkel).lerp(C("#151B2E"), morgen);
    const H = this.himmel.u;
    H.zenit.value.copy(zen); H.horizont.value.copy(hor); H.unten.value.copy(unt);
    H.glowA.value.set(...richtung(52, -7)); H.glowAS.value = Math.pow(1 - dunkel, 1.4) * (1 - morgen); H.glowAF.value.setRGB(1.0, 0.34, 0.08).multiplyScalar(1.2);
    H.glowM.value.set(...richtung(-58, -8)); H.glowMS.value = morgen * (0.35 + 0.65 * morgen); H.glowMF.value.setRGB(1.0, 0.5, 0.2).multiplyScalar(0.9);
    H.guertelS.value = (1 - dunkel) * 0.35; H.guertelF.value.setRGB(0.16, 0.11, 0.2);
    H.sterne.value = smoothstep(0.25, 0.85, dunkel) * (1 - smoothstep(0.2, 0.9, morgen)) * (1 - 0.55 * plH);
    H.dunst.value = 0.28; H.smogF.value.setRGB(0.014, 0.008, 0.003).multiplyScalar(0.4 + 0.6 * nacht);
    H.wolken.value = wolken; H.wolkenOff.value.set(-0.0115 * tt, -0.0045 * tt);
    H.plNord.value = plN; H.plRot.value = plR; H.plKrone.value = plK; H.plSued.value = plS; H.plHelle.value = plH; H.zeit.value = t;
    // Farbe des Polarlichts als Lichtquelle (linear)
    const aur = [0.2 * (plN * 0.5 + plK * 0.45) + 1.0 * (plR * 0.45 + plS * 0.6 + plK * 0.15), 1.0 * (plN * 0.5 + plK * 0.45) + 0.09 * (plR + plS), 0.4 * (plN * 0.5 + plK * 0.45) + 0.3 * (plR * 0.45 + plS * 0.6) + 0.4 * plR * 0.3];
    const aurS = aur.map((v) => v * (0.05 + 0.95 * plH));
    // Wolkenfarbe: Grundton, Polarlicht-Anstrahlung
    H.wolkeF.value.copy(zen).lerp(hor, 0.35).multiplyScalar(0.3 + 0.12 * (1 - dunkel)).add(this._c.setRGB(0.004, 0.004, 0.005));
    H.wolkeAur.value.setRGB(aurS[0] * 0.05, aurS[1] * 0.05, aurS[2] * 0.05);
    // --- Leuchtfeuer
    const wink = (t / TURM.periode) * Math.PI * 2 + 0.6, bd = new THREE.Vector3(Math.sin(wink), -0.009, Math.cos(wink)).normalize();
    for (const U of [H, this.wasserU]) { U.strD.value.copy(bd); U.strI.value = 0.9 * strahl * (0.35 + 0.65 * nacht); U.strNebel.value = this.nebelDichte; }
    u.uStrahlD.value.copy(bd); u.uLinse.value = strahl * (0.4 + 0.6 * nacht);
    this.linseM.emissiveIntensity = 1.4 * strahl;
    // --- Lichter: Himmel (Hemisphäre), Schlüssellicht (Glut bzw. Polarlicht, Schatten), Laterne, Dorf
    const L = this.lichter;
    const hH = mix3("#5A6A9E", "#1A2442", dunkel).lerp(C("#5A6AA0"), morgen), hI = lerp(2.4, 0.45, Math.pow(dunkel, 0.7)) + 1.3 * morgen;
    L.hemi.color.copy(hH).multiplyScalar(hI).add(this._c.setRGB(aurS[0] * 0.4, aurS[1] * 0.4, aurS[2] * 0.4)); L.hemi.groundColor.copy(L.hemi.color).multiplyScalar(0.22); L.hemi.intensity = 1;
    let kd = new THREE.Vector3(...richtung(52, 3)).multiplyScalar(Math.pow(1 - dunkel, 1.3) * (1 - morgen) * 0.6);
    kd.add(new THREE.Vector3(...richtung(-58, 3)).multiplyScalar(morgen * 0.5));
    const kA = [[[0, 0.42, 0.9], plN * 0.5], [[0, 0.75, 0.66], plR * 0.45], [[0, 0.94, -0.34], plK * 0.6], [[0, 0.5, -0.86], plS * 0.75]];
    for (const [v, w] of kA) kd.add(this._v.set(...v).multiplyScalar(w * (0.1 + 2.0 * plH)));
    const kStaerke = kd.length(); if (kStaerke > 1e-4) kd.normalize(); else kd.set(0, 1, 0);
    const kF = new THREE.Color(1.0, 0.55, 0.3).multiplyScalar(1.1 * Math.pow(1 - dunkel, 1.3) * (1 - morgen) + 0.9 * morgen).add(new THREE.Color(aurS[0] * 1.0, aurS[1] * 1.0, aurS[2] * 1.0));
    L.key.color.copy(kF); L.key.intensity = 1;
    const kp = kam ? kam.position : this._p.set(0, TURM.auge, 0), hoch = kp.y > 20, ext = hoch ? 9 : 40;
    L.key.position.set(kp.x + kd.x * 120, kp.y + Math.max(kd.y, 0.08) * 120, kp.z + kd.z * 120); L.key.target.position.copy(kp); L.key.target.updateMatrixWorld();
    if (L.key.castShadow) { const sc = L.key.shadow.camera; if (sc.right !== ext) { Object.assign(sc, { left: -ext, right: ext, top: ext, bottom: -ext, far: 260 }); sc.updateProjectionMatrix(); } }
    const kamAz = Math.atan2(kp.x, kp.z), blitz = Math.pow(Math.max(Math.cos(wink - kamAz), 0), 24);
    L.laterne.intensity = strahl * (0.5 + 5 * blitz) * (0.3 + 0.7 * nacht);
    L.dorf.position.set(...this.dorfLampe); L.dorf.intensity = 30 * nacht;
    u.uFenster.value = 0.35 + 0.65 * smoothstep(0.2, 0.7, dunkel) * (1 - 0.6 * morgen);
    // --- Watt-Shader
    const W = this.wasserU;
    W.zeit.value = tt; W.pegel.value = pegel; W.wind.value = wind;
    W.hemiH.value.copy(L.hemi.color); W.hemiB.value.copy(L.hemi.groundColor); W.keyDir.value.copy(kd); W.keyF.value.copy(kF);
    u.uHimmelF.value.copy(hor).multiplyScalar(0.25).add(this._c.setRGB(aurS[0] * 0.02, aurS[1] * 0.02, aurS[2] * 0.02));
    // --- Nebel (Luftperspektive) in Himmelsfarbe am Horizont
    this.szene.fog.color.copy(hor).multiplyScalar(0.8).add(this._c.setRGB(aurS[0] * 0.012, aurS[1] * 0.012, aurS[2] * 0.012)); this.szene.fog.density = this.nebelDichte * (1 + 0.4 * wolken);
    // --- Galerie: Wetterfahne, Windmesser
    this.fahne.rotation.y = 2.4 + 0.12 * Math.sin(t * 0.31) + 0.05 * Math.sin(t * 1.3 + 0.4);
    this.anemo.rotation.y = -t * 7.5;
    // --- Schafe (grasen; ferne als Punkte, damit nichts flimmert)
    const skala = kam ? 1920 / (2 * Math.tan((kam.fov * D2R) / 2)) : 1000, sp = [];
    const sl = new THREE.Color().copy(L.hemi.color).multiplyScalar(0.8 / Math.PI).add(new THREE.Color(kF.r * 0.45 / Math.PI, kF.g * 0.45 / Math.PI, kF.b * 0.45 / Math.PI));
    const mR = new THREE.Matrix4(), mT = new THREE.Matrix4();
    this.schafL.forEach((s, i) => {
      const gras = 0.5 + 0.5 * Math.sin(tt * (0.5 + 0.13 * (i % 5)) + s.ph), nick = 0.15 + 0.85 * smoothstep(0.3, 0.7, gras);
      const step = 0.6 * Math.sin(tt * 0.05 + s.ph), x = s.x + Math.cos(s.ry) * step, zz = s.z - Math.sin(s.ry) * step, ry = s.ry + 0.2 * Math.sin(tt * 0.04 + s.ph);
      const d = kam ? Math.hypot(x - kam.position.x, s.y - kam.position.y, zz - kam.position.z) : 50, px = 1.1 * s.s * skala / d;
      const mk = smoothstep(3.0, 6.0, px), pk = 1 - smoothstep(4.5, 7.0, px);
      const sc = mk > 0.001 ? s.s : 0.0001;
      this._setze(this.schafK, i, x, s.y, zz, sc, ry);
      this._e.set(0, ry, 0); this._q.setFromEuler(this._e); this._s.set(sc, sc, sc); this._p.set(x, s.y, zz); this._m.compose(this._p, this._q, this._s);
      mT.makeTranslation(0.5, 0.86, 0); mR.makeRotationZ(-nick * 0.9); this._m.multiply(mT).multiply(mR).multiply(mT.makeTranslation(-0.5, -0.86, 0));
      this.schafH.setMatrixAt(i, this._m);
      if (pk > 0.01) sp.push({ p: [x, s.y + 0.75 * s.s, zz], f: [sl.r * 0.86 * pk, sl.g * 0.84 * pk, sl.b * 0.77 * pk], r: 1.25 * s.s });
    });
    this.schafK.instanceMatrix.needsUpdate = true; this.schafH.instanceMatrix.needsUpdate = true;
    this.schafP.u.nebelD.value = this.szene.fog.density; this.schafP.setze(sp, kam);
    // --- Möwen (nah hell im Licht, fern dunkle Silhouetten)
    const mw = clamp(z.moewen ?? 1);
    this.moewenNah.setze(tt); this.moewenFern.setze(tt);
    this.moewenNah.mesh.count = Math.round(this.nMoewen[0] * mw); this.moewenFern.mesh.count = Math.round(this.nMoewen[1] * mw);
    const hell = Math.min(0.3, 0.04 + 0.8 * (L.hemi.color.r + L.hemi.color.g + L.hemi.color.b) / 3 + 0.4 * blitz * nacht);
    this.moewenNah.mesh.material.color.setRGB(0.78 * hell, 0.8 * hell, 0.83 * hell);
    this.moewenFern.mesh.material.color.setRGB(0.03 + 0.05 * (1 - dunkel), 0.032 + 0.05 * (1 - dunkel), 0.036 + 0.06 * (1 - dunkel));
    // --- Windräder (Rotoren drehen, Funktion von t)
    const S = this.striche;
    for (const w of this.wka) {
      const hub = [w.x - 1, w.y0 + w.h + 1.8, w.z], a0 = w.ph + t * w.om;
      for (let k = 0; k < 3; k++) { const a = a0 + (k * Math.PI * 2) / 3; S.setze(w.blatt[k], hub, [hub[0], hub[1] + Math.cos(a) * w.r, hub[2] + Math.sin(a) * w.r], 2.6, [0.72, 0.74, 0.76]); }
    }
    S.u.licht.value.copy(L.hemi.color).multiplyScalar(1.1).add(this._c.setRGB(0.01, 0.01, 0.012)); S.u.nebelF.value.copy(this.szene.fog.color); S.u.nebelD.value = this.szene.fog.density;
    S.fertig();
    // --- Lichtpunkte
    const lampe = smoothstep(0.15, 0.6, dunkel) * (1 - 0.5 * morgen), fen = u.uFenster.value, liste = [];
    const rotBlink = fr(t / 1.5) < 0.67 ? 1 : 0.0;
    for (const P of this.statLichter) {
      const f = P.f ? P.f.map((v) => v * fen) : P.art === "laterne" ? [3.0 * lampe, 2.0 * lampe, 0.95 * lampe] : P.art === "rot" ? [3.0 * lampe, 0.2, 0.12] : P.art === "gruen" ? [0.2, 2.6 * lampe, 0.6 * lampe]
        : P.art === "fern" ? [1.6 * lampe, 1.1 * lampe, 0.6 * lampe] : P.art === "deck" ? [2.4 * lampe, 1.9 * lampe, 1.2 * lampe] : [2.6 * lampe, 2.6 * lampe, 2.5 * lampe];
      liste.push({ p: P.p, f, r: P.r, nah: P.nah || 0 });
    }
    for (const w of this.wka) liste.push({ p: [w.x - 2, w.y0 + w.h + 3.4, w.z], f: [4.2 * rotBlink * lampe, 0.25 * rotBlink * lampe, 0.15 * rotBlink * lampe], r: 10 });
    for (const F of this.feuer) {
      const ph = fr(t / F.per + F.an), b = F.art === "doppel" ? Math.max(smoothstep(0.0, 0.03, ph) * (1 - smoothstep(0.06, 0.1, ph)), smoothstep(0.16, 0.19, ph) * (1 - smoothstep(0.22, 0.26, ph))) : smoothstep(0.0, 0.04, ph) * (1 - smoothstep(0.1, 0.18, ph));
      liste.push({ p: F.p, f: F.f.map((v) => v * (0.08 + b) * lampe), r: F.r * (0.6 + 0.4 * b) });
    }
    const lp = TURM.lampe;
    if (kam && !hoch) { const az = Math.atan2(kam.position.x - lp[0], kam.position.z - lp[2]), bl = Math.pow(Math.max(Math.cos(wink - az), 0), 60); liste.push({ p: lp, f: [3.4 * strahl, 3.0 * strahl, 2.3 * strahl].map((v) => v * (0.5 + 2.5 * bl)), r: 3 + 18 * bl }); }
    this.punkte.u.nebelD.value = this.szene.fog.density;
    this.punkte.setze(liste, kam);
    // --- Zustand und Post-Empfehlung
    const plMax = Math.max(plN, plR, plK, plS);
    this.zustand = { strahlWinkel: wink, aurFarbe: aurS, licht: kStaerke };
    this.post = {
      belichtung: lerp(1.08, 1.32, nacht) - 0.06 * plH, saettigung: 1.04 + 0.12 * plMax + 0.04 * (1 - dunkel), kontrast: 1.05 + 0.03 * plMax,
      tonung: [lerp(1.04, 0.92, nacht) + 0.04 * morgen, lerp(0.98, 0.97, nacht), lerp(0.95, 1.1, nacht) - 0.05 * morgen], tonungStaerke: 0.16,
      bloomStaerke: 1.05 + 0.25 * nacht + 0.25 * plMax, bloomSchwelle: lerp(0.95, 0.78, nacht), vignette: 0.16,
    };
    return this;
  }
}

// ----------------------------------------------------------------------------------------------- Gelände-Gitter mit Zentrum (fein nahe am Zentrum)
function gitterC(cx, cz, xVon, xBis, zVon, zBis, a, k, f) {
  const achse = (c, von, bis) => { const out = [c]; let x = c; while (x < bis) { x += a + k * (x - c); out.push(Math.min(x, bis)); } const neg = []; x = c; while (x > von) { x -= a + k * (c - x); neg.push(Math.max(x, von)); } return [...neg.reverse(), ...out]; };
  const xs = achse(cx, xVon, xBis), zs = achse(cz, zVon, zBis), nx = xs.length, nz = zs.length, pos = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const q = (j * nx + i) * 3; pos[q] = xs[i]; pos[q + 1] = f(xs[i], zs[j]); pos[q + 2] = zs[j]; }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const A = j * nx + i, B = A + 1, Cc = A + nx, D = Cc + 1; idx.set([A, Cc, B, B, Cc, D], q); q += 6; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals();
  return geo;
}
