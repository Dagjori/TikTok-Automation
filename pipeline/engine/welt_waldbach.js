// Grundwelt „Mischwald mit Bach und Lichtung“ (Account 2 @stelldirvor.pov, Weltenkatalog „Wald und Lichtung“), Erstbau 08.11.2026
// („Was wäre, wenn unsere Luft 35 % Sauerstoff hätte?“, Skript acc2-2026-11-08-mittag). NUR für den Baukasten Lunar-POV.
//
// Inhalt: ebenerdige Lichtung mit Gras, Wildblumen und einem moosigen Baumstumpf (Vordergrund), davor ein mäandernder Waldbach mit
// Steinen, Strömung und Sonnenglitzern, jenseits des Bachs Mischwald (Buchen und Fichten aus engine/welt_waldlichtung.js, Unterholz, Farne),
// eine hohe Fichte als Blitzziel, bewaldete Hügel im Dunst. Dazu: Waldbrand als reine Funktion von t (Ankunftszeit der Front je Ort, Bach
// als Brandschneise, verkohlter Boden, Glut, Flammen und Rauch als Puff-Listen), Farne mit Austrieb, Lichtstrahlen, Blitz, Libellen
// (instanziertes Modell mit Flügeladern, Flügelschlag im Shader, auch im Schatten).
// Steuerung je Bild (alles Funktion von t, kein Zustand):
//   const welt = new Waldbach(szene, { schatten });
//   welt.setze(t, kamera, { wind, laub, laub2, fichte, gras, gras2, brandAn, erholt, glutS, farnNeu, zenit, horizont, sonne:[x,y,z], sonneF,
//                           glitzer, wasserHell, glutLicht, regen, tau })
//   welt.flammen(t, { staerke }) / welt.rauch(t, { staerke }) → Puff-Listen (additiv bzw. normal)
//   ankunft(x, z) → Zeit, zu der das Feuer den Ort erreicht (Infinity = brennt nicht)
// Lehren: alle Objekte stehen auf hoehe(x, z) (minus wenige cm), Wasser schneidet das Gelände (keine deckungsgleichen Flächen),
// Nah- und Ferngitter überlappen nicht in der Höhe (Ferngitter im Nahbereich abgesenkt).
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { GLSL_NOISE } from "./welt_feld_wald.js";
import { sammle, klumpe, bucheGeo, fichteGeo, bucheFern, fichteFern } from "./welt_waldlichtung.js";

const C = (h) => new THREE.Color(h);
const fr = (x) => x - Math.floor(x);
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= 0.5; } return s; }

// ------------------------------------------------------------------------------------------------ Gelände
/** Mittellinie des Bachs (fließt nach +x) */
export const bachZ = (x) => -11 + 2.2 * Math.sin(x * 0.055 + 0.6) + 0.9 * Math.sin(x * 0.16 + 1.3);
export const WASSER_Y = 0;
export const STUMPF = { x: 0.75, z: -2.4, r: 0.44, h: 0.62 };
/** Platz am Ufer (Kamerastart): Gras dort kurz, direkt am Standpunkt frei */
export const UFERPLATZ = { x: 0.6, z: bachZ(0.6) + 3.7 };
export const LICHTUNG = { x: 0, z: 0.6 };
export const FICHTE = { x: -5.5, z: bachZ(-5.5) - 29, s: 1.45 };
/** Waldmaske: > 0.5 = Wald (jenseits des Bachs ab ca. 8 m, an den Seiten ab ca. 26 m) */
export function waldMass(x, z) {
  const jenseits = smoothstep(25, 30, bachZ(x) - z + 5 * (vn(x * 0.07 + 3, 1.7) - 0.5));
  const seite = smoothstep(30, 37, Math.abs(x) + 6 * (vn(z * 0.08, 4.1) - 0.5)) * smoothstep(-40, -4, z) + smoothstep(16, 22, z);
  return clamp(Math.max(jenseits, seite));
}
export function hoehe(x, z) {
  const zb = bachZ(x);
  let y = 0.45 + 0.34 * (fbm(x * 0.05 + 3, z * 0.05 + 1, 3) - 0.5) + 0.06 * (vn(x * 0.7, z * 0.7) - 0.5);
  y += 0.075 * clamp(zb - 3.5 - z, 0, 90) - 0.0003 * clamp(zb - 3.5 - z, 0, 90) ** 2;        // jenseitiger Hang steigt an
  y += 0.035 * clamp(z - 6, 0, 120) + 0.03 * clamp(Math.abs(x) - 26, 0, 300);
  const d = Math.hypot(x, z + 80);
  y += 110 * smoothstep(240, 1400, d) * fbm(x * 0.0013 + 7, z * 0.0013 + 2, 4) + 300 * Math.pow(smoothstep(900, 3800, d), 1.3) * (0.45 + fbm(x * 0.0007 + 1, 3.3, 3));
  const dd = Math.abs(z - zb) + 0.45 * (vn(x * 0.35 + 9, 2.2) - 0.5);
  const kanal = 1 - smoothstep(1.0, 2.7, dd);
  return lerp(y, -0.52 + 0.14 * (vn(x * 0.5, z * 0.5) - 0.5), kanal);
}
/** Ankunft des Feuers (Videozeit) – nur jenseits des Bachs und im Umkreis von 75 m um die Fichte; T_B = Blitz */
export function ankunftBei(x, z, TB) {
  if (z > bachZ(x) - 2.6) return Infinity;
  const d = Math.hypot(x - FICHTE.x, z - FICHTE.z);
  if (d > 75) return Infinity;
  return TB + 0.5 + d / 7.0 + 1.4 * (0.5 + 0.5 * Math.sin(x * 0.21 + z * 0.13) * Math.sin(z * 0.17 - x * 0.07));
}
const GLSL_BRAND = /* glsl */ `
uniform float uT, uTB, uBrandAn, uErholt, uGlutS; uniform vec2 uFichte;
float bachZf(float x) { return -11.0 + 2.2 * sin(x * 0.055 + 0.6) + 0.9 * sin(x * 0.16 + 1.3); }
float ankunftF(vec2 p) {
  if (p.y > bachZf(p.x) - 2.6) return 1e4;
  float d = length(p - uFichte);
  if (d > 75.0) return 1e4;
  return uTB + 0.5 + d / 7.0 + 1.4 * (0.5 + 0.5 * sin(p.x * 0.21 + p.y * 0.13) * sin(p.y * 0.17 - p.x * 0.07));
}
float verbranntF(vec2 p) { return uBrandAn * smoothstep(0.0, 1.6, uT - ankunftF(p)) * (1.0 - uErholt); }
float glutF(vec2 p) { float a = uT - ankunftF(p); return uBrandAn * smoothstep(0.0, 0.5, a) * (0.3 + 0.7 * (1.0 - smoothstep(2.5, 8.0, a))) * uGlutS; }
`;

// ------------------------------------------------------------------------------------------------ Geometrien
function vfarb(g, f) { const p = g.getAttribute("position"), c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) c.set(f(p.getX(i), p.getY(i), p.getZ(i)), i * 3); g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g; }
function verbinde(teile) {     // [{g, c:[r,g,b]|f}] → nicht-indizierte Geometrie mit Farben
  const gs = teile.map((t) => { const g = t.g.index ? t.g.toNonIndexed() : t.g.clone(); return vfarb(g, typeof t.c === "function" ? t.c : () => t.c); });
  let n = 0; for (const g of gs) n += g.getAttribute("position").count;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const g of gs) { pos.set(g.getAttribute("position").array, o * 3); col.set(g.getAttribute("color").array, o * 3); o += g.getAttribute("position").count; }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("color", new THREE.BufferAttribute(col, 3)); out.computeVertexNormals();
  return out;
}
function grasTuff() {         // 9 Halme, Höhe ≈ 1, Fuß dunkel, Spitze hell
  const pos = [], col = [];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39996, r = 0.04 + 0.16 * Math.sqrt((i + 0.5) / 9), x = Math.cos(a) * r, z = Math.sin(a) * r, w = 0.035 + 0.015 * (i % 3);
    const nx = -Math.sin(a) * w, nz = Math.cos(a) * w, hh = 0.65 + 0.35 * ((i * 5) % 9) / 8, lean = 0.15 + 0.22 * ((i * 7) % 5) / 4;
    pos.push(x - nx, 0, z - nz, x + nx, 0, z + nz, x + Math.cos(a) * lean, hh, z + Math.sin(a) * lean);
    col.push(0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 1, 1, 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const n = new Float32Array(pos.length); for (let i = 0; i < n.length; i += 3) { n[i] = 0; n[i + 1] = 1; n[i + 2] = 0; } g.setAttribute("normal", new THREE.BufferAttribute(n, 3));
  return g;
}
/** Farn: Rosette aus 7 Wedeln mit je 13 Fiederpaaren, Höhe ≈ 0,75, Breite ≈ 2 (Einheit) */
function farnGeo() {
  const pos = [], col = [];
  const P = (x, y, z, c) => { pos.push(x, y, z); col.push(c, c, c); };
  for (let w = 0; w < 7; w++) {
    const a = w * 0.898 + 0.3, ca = Math.cos(a), sa = Math.sin(a), L = 0.85 + 0.25 * ((w * 3) % 4) / 3, auf = 0.95 + 0.25 * ((w * 5) % 3) / 2;
    const bahn = (s) => { const r = L * s * 0.85, y = auf * (1.25 * s - 0.95 * s * s) * L; return [ca * r, y, sa * r]; };   // Bogen: steigt, neigt sich
    for (let k = 0; k < 13; k++) {
      const s0 = 0.1 + 0.068 * k, s1 = s0 + 0.04, m = bahn((s0 + s1) / 2), b0 = bahn(s0), b1 = bahn(s1);
      const len = 0.16 * (1 - s0) * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, s0 * 1.3))) + 0.025;
      for (const seite of [-1, 1]) {
        const qx = -sa * seite, qz = ca * seite, tip = [m[0] + qx * len + ca * len * 0.45, m[1] - len * 0.35, m[2] + qz * len + sa * len * 0.45];
        const hell = 0.55 + 0.45 * s0;
        P(b0[0], b0[1], b0[2], hell * 0.75); P(b1[0], b1[1], b1[2], hell * 0.8); P(tip[0], tip[1], tip[2], hell);
      }
      // Rhachis (Mittelrippe) als schmales Dreieck
      P(b0[0] - sa * 0.008, b0[1], b0[2] + ca * 0.008, 0.45); P(b0[0] + sa * 0.008, b0[1], b0[2] - ca * 0.008, 0.45); P(b1[0], b1[1], b1[2], 0.5);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const n = g.getAttribute("normal"); for (let i = 0; i < n.count; i++) { const y = n.getY(i); if (y < 0) n.setXYZ(i, -n.getX(i), -y, -n.getZ(i)); }
  return g;
}
function blumeGeo() {
  const st = new THREE.CylinderGeometry(0.005, 0.008, 0.3, 3); st.translate(0, 0.15, 0);
  const kopf = new THREE.CylinderGeometry(0.03, 0.012, 0.012, 7); kopf.translate(0, 0.305, 0);
  return verbinde([{ g: st, c: [0.22, 0.36, 0.13] }, { g: kopf, c: [1, 1, 1] }]);
}
function steinGeo(seed) {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.getAttribute("position");
  for (let j = 0; j < p.count; j++) { const x = p.getX(j), y = p.getY(j), z = p.getZ(j), f = 1 + 0.22 * (vn(x * 2 + seed, z * 2 + y) - 0.5); p.setXYZ(j, x * f * 1.25, y * f * 0.62, z * f); }
  return vfarb(g.toNonIndexed(), (x, y, z) => { const m = smoothstep(0.05, 0.45, y) * smoothstep(0.35, 0.65, vn(x * 3 + seed, z * 3)); const d = 0.75 + 0.25 * vn(x * 6, z * 6 + seed); return [lerp(0.3, 0.2, m) * d, lerp(0.29, 0.3, m) * d, lerp(0.27, 0.1, m) * d]; });
}
/** Baumstumpf mit Borkenrissen, Jahresringen, Moosdecke, Wurzeln und Pilzen (Meter, Fuß bei y = 0) */
function stumpfTeile() {
  const R = STUMPF.r, H = STUMPF.h;
  const holz = new THREE.CylinderGeometry(R * 0.96, R * 1.14, H, 48, 14, true); holz.translate(0, H / 2, 0);
  const p = holz.getAttribute("position");
  const rand = (a) => 0.05 * (vn(a * 2.2, 1) - 0.5) + 0.03 * Math.sin(a * 3 + 1);
  for (let j = 0; j < p.count; j++) {
    const x = p.getX(j), y = p.getY(j), z = p.getZ(j), a = Math.atan2(z, x);
    const riss = 1 - 0.07 * Math.pow(Math.abs(Math.sin(a * 9 + 0.6 * vn(y * 6, a))), 6) + 0.025 * (vn(a * 7, y * 9) - 0.5), fuss = 1 + 0.12 * (1 - smoothstep(0, 0.18, y)) * (0.5 + vn(a * 3, 2));
    const yy = y > H - 0.01 ? H + rand(a) : y;
    p.setXYZ(j, x * riss * fuss, yy, z * riss * fuss);
  }
  const rinde = vfarb(holz.toNonIndexed(), (x, y, z) => {
    const a = Math.atan2(z, x), r = Math.hypot(x, z), tief = smoothstep(R * 1.0, R * 0.93, r / (1 + 0.12 * (1 - smoothstep(0, 0.18, y))));
    const moosS = smoothstep(0.62, 0.8, vn(a * 2.5 + 3, y * 5) + 0.22 * Math.cos(a - 2.1) + 0.25 * (1 - smoothstep(0, 0.2, y)));
    const b = 0.21 + 0.06 * vn(a * 9, y * 14);
    const holzC = [b * 1.22 * (1 - 0.5 * tief), b * 0.92 * (1 - 0.5 * tief), b * 0.66 * (1 - 0.5 * tief)];
    const m = 0.85 + 0.3 * vn(a * 20, y * 20);
    return [lerp(holzC[0], 0.2 * m, moosS), lerp(holzC[1], 0.36 * m, moosS), lerp(holzC[2], 0.08 * m, moosS)];
  });
  const top = new THREE.RingGeometry(0.0001, R * 0.985, 64, 18); top.rotateX(-Math.PI / 2);
  const tp = top.getAttribute("position");
  for (let j = 0; j < tp.count; j++) { const x = tp.getX(j), z = tp.getZ(j), a = Math.atan2(z, x), r = Math.hypot(x, z) / R; tp.setY(j, H + rand(a) * smoothstep(0.7, 1, r) - 0.004 + 0.006 * (vn(x * 30, z * 30) - 0.5)); }
  top.computeVertexNormals();
  const ringe = vfarb(top.toNonIndexed(), (x, y, z) => {
    const a = Math.atan2(z, x), r = Math.hypot(x, z) / R, ring = 0.5 + 0.5 * Math.sin(r * 34 + 1.5 * Math.sin(a * 3) * r), riss = Math.pow(Math.abs(Math.sin(a * 5 + r * 2)), 40) * smoothstep(0.15, 0.6, r);
    const b = (0.42 - 0.08 * r) * (0.78 + 0.22 * ring) * (1 - 0.6 * riss) * (r > 0.9 ? 0.7 : 1);
    const holzC = [b * 1.15, b * 0.86, b * 0.58];
    const moos = smoothstep(0.52, 0.66, vn(x * 9 + 2, z * 9) * 0.7 + 0.45 * smoothstep(0.55, 1.0, r) + 0.18 * Math.cos(a - 2.0));
    const m = 0.8 + 0.4 * vn(x * 60, z * 60);
    return [lerp(holzC[0], 0.22 * m, moos), lerp(holzC[1], 0.42 * m, moos), lerp(holzC[2], 0.1 * m, moos)];
  });
  const wurzel = [];
  for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.4 + 0.3 * hash(k, 3), g = new THREE.CylinderGeometry(0.025, 0.12, 0.8, 7, 3); g.rotateZ(-1.3); g.translate(0.38, 0.05, 0); g.rotateY(a); wurzel.push({ g, c: (x, y) => [0.24, 0.19, 0.14].map((c) => c * (0.85 + 0.3 * vn(x * 20, y * 20))) }); }
  const moos = [];
  for (let k = 0; k < 60; k++) { const a = 1.2 + hash(k, 5) * 2.2, rr = R * (0.9 + 0.12 * hash(k, 6)), y = H - 0.02 - 0.18 * hash(k, 7) ** 2;
    const g = new THREE.IcosahedronGeometry(0.012 + 0.02 * hash(k, 8), 1); g.scale(1.3, 0.7, 1.3); g.translate(Math.cos(a) * rr, y, Math.sin(a) * rr); const hh = 0.75 + 0.5 * hash(k, 9); moos.push({ g, c: [0.24 * hh, 0.44 * hh, 0.1 * hh] }); }
  const pilze = [];
  for (const [a, s] of [[2.4, 1], [2.62, 0.7], [2.95, 0.85], [3.3, 0.55]]) { const st = new THREE.CylinderGeometry(0.01 * s, 0.014 * s, 0.07 * s, 8); st.translate(Math.cos(a) * (R + 0.07), 0.035 * s, Math.sin(a) * (R + 0.07)); const hu = new THREE.SphereGeometry(0.036 * s, 12, 6, 0, 6.283, 0, 1.5); hu.scale(1, 0.7, 1); hu.translate(Math.cos(a) * (R + 0.07), 0.062 * s, Math.sin(a) * (R + 0.07)); pilze.push({ g: st, c: [0.86, 0.82, 0.72] }, { g: hu, c: (x, y) => [0.66, 0.4 - 0.1 * (y > 0.07 * s), 0.2] }); }
  return { rinde, ringe, rest: verbinde([...wurzel, ...moos, ...pilze]) };
}

// ------------------------------------------------------------------------------------------------ Libelle (Spannweite 1 m, Körper entlang +x, Kopf vorn)
/** Röhre entlang x mit Radiusprofil r(x) (Querschnitt leicht oval), Farbe f(x, y, z, winkel) */
function roehre(x0, x1, r, f, { nx = 60, nr = 18, oval = 1.0 } = {}) {
  const pos = [], col = [], idx = [];
  for (let i = 0; i <= nx; i++) { const x = lerp(x0, x1, i / nx), rr = r(x); for (let j = 0; j <= nr; j++) { const w = (j / nr) * Math.PI * 2, y = Math.cos(w) * rr * oval, z = Math.sin(w) * rr; pos.push(x, y, z); col.push(...f(x, y, z, w)); } }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nr; j++) { const a = i * (nr + 1) + j, b = a + nr + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g.toNonIndexed();
}
function libelleKoerper() {
  const T = [];
  // Hinterleib: 10 Segmente mit Einschnürungen, oben dunkle Bronze, Flanken heller, Gelenke dunkel
  const AX0 = -0.4, AX1 = 0.215, seg = (x) => fr((AX1 - x) / 0.06);
  const rAb = (x) => { const u = (AX1 - x) / (AX1 - AX0), basis = lerp(0.03, 0.016, u) * (u < 0.08 ? lerp(1.15, 1, u / 0.08) : 1) * (u > 0.93 ? lerp(1, 0.6, (u - 0.93) / 0.07) : 1); return basis * (1 - 0.13 * Math.exp(-((seg(x) - 0.02) ** 2) / 0.004)); };
  const ab = roehre(AX0, AX1, rAb, (x, y, z) => { const s = seg(x), gelenk = s < 0.1 ? 1 : 0, ob = smoothstep(-0.2, 0.6, y / (rAb(x) + 1e-4)), fleck = (s > 0.2 && s < 0.55 && Math.abs(z) > rAb(x) * 0.6 && y > -0.004) ? 1 : 0;
    const c = [lerp(0.42, 0.22, ob), lerp(0.33, 0.2, ob), lerp(0.18, 0.12, ob)]; if (fleck) { c[0] = 0.55; c[1] = 0.48; c[2] = 0.24; } return gelenk ? [0.05, 0.045, 0.035] : c; }, { nx: 120, nr: 16, oval: 1.1 });
  T.push({ g: ab, c: null });
  // Brust: kräftig, mit Schrägstreifen
  const rTh = (x) => 0.058 * Math.sqrt(Math.max(0, 1 - ((x - 0.275) / 0.085) ** 2)) + 0.002;
  const th = roehre(0.19, 0.36, rTh, (x, y, z) => { const streif = Math.sin((x * 60 + y * 40)) > 0.55 ? 1 : 0, ob = y > 0.02 ? 1 : 0; return streif ? [0.12, 0.11, 0.07] : ob ? [0.3, 0.32, 0.16] : [0.46, 0.4, 0.2]; }, { nx: 30, nr: 20, oval: 1.15 });
  T.push({ g: th, c: null });
  // Kopf: große Komplexaugen, die sich oben berühren, helle Stirn
  for (const sz of [1, -1]) { const g = new THREE.SphereGeometry(0.043, 24, 16); g.scale(1, 1.02, 0.9); g.translate(0.375, 0.012, sz * 0.03);
    T.push({ g, c: (x, y, z) => { const facet = 0.9 + 0.1 * Math.sin(x * 900) * Math.sin(y * 900) * Math.sin(z * 900); return [0.2 * facet, (0.3 + 0.08 * (y > 0.02)) * facet, 0.16 * facet]; } }); }
  const stirn = new THREE.SphereGeometry(0.026, 16, 10); stirn.scale(1.0, 0.8, 1.25); stirn.translate(0.405, -0.012, 0); T.push({ g: stirn, c: [0.62, 0.56, 0.32] });
  const mund = new THREE.SphereGeometry(0.016, 10, 8); mund.translate(0.405, -0.035, 0); T.push({ g: mund, c: [0.4, 0.34, 0.2] });
  // Beine: 3 Paare, je Schenkel und Schiene, unter der Brust nach vorn gebeugt
  for (const [dx, sp] of [[0.31, 0.6], [0.275, 0.2], [0.24, -0.2]]) for (const sz of [1, -1]) {
    const hueft = [dx, -0.04, sz * 0.018], knie = [dx + 0.03 + 0.03 * sp, -0.085, sz * 0.07], fuss = [dx + 0.06 + 0.05 * sp, -0.13, sz * 0.085];
    for (const [a, b, r0, r1] of [[hueft, knie, 0.006, 0.005], [knie, fuss, 0.005, 0.003]]) {
      const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), L = A.distanceTo(Bv), g = new THREE.CylinderGeometry(r1, r0, L, 6); g.translate(0, L / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize())); g.translate(...a); T.push({ g, c: [0.07, 0.06, 0.05] });
    }
  }
  const anh = new THREE.ConeGeometry(0.006, 0.04, 6); anh.rotateZ(Math.PI / 2); anh.translate(-0.42, 0, 0.008); T.push({ g: anh, c: [0.06, 0.05, 0.04] });
  const anh2 = anh.clone(); anh2.translate(0, 0, -0.016); T.push({ g: anh2, c: [0.06, 0.05, 0.04] });
  const gs = T.map((t) => (t.c === null ? t.g : vfarb(t.g.index ? t.g.toNonIndexed() : t.g.clone(), typeof t.c === "function" ? t.c : () => t.c)));
  let n = 0; for (const g of gs) n += g.getAttribute("position").count;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const g of gs) { pos.set(g.getAttribute("position").array, o * 3); col.set(g.getAttribute("color").array, o * 3); o += g.getAttribute("position").count; }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("color", new THREE.BufferAttribute(col, 3)); out.computeVertexNormals();
  return out;
}
/** vier Flügel als Netz (je 28 × 6 Felder); Attribute: uv (u = Spannweite 0..1, v = Profil 0 Vorderkante .. 1 Hinterkante), aSeite ±1, aVorn 1|0 */
function libelleFluegel() {
  const pos = [], uv = [], seite = [], vorn = [], idx = [];
  const NU = 28, NV = 6;
  for (const [sz, vo] of [[1, 1], [-1, 1], [1, 0], [-1, 0]]) {
    const base = pos.length / 3, x0 = vo ? 0.305 : 0.25, c0 = vo ? 0.082 : 0.1;
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
      const s = i / NU, v = j / NV;
      const spitze = s > 0.8 ? Math.sqrt(Math.max(0, 1 - ((s - 0.8) / 0.2) ** 2)) : 1;
      const ansatz = vo ? lerp(0.32, 1, smoothstep(0, 0.22, s)) : lerp(0.75, 1, smoothstep(0, 0.12, s)) * (1 + 0.35 * (1 - smoothstep(0.05, 0.3, s)));
      const w = c0 * ansatz * Math.max(spitze, 0.04) * (1 - 0.12 * s);
      const z = 0.03 + s * 0.47, x = x0 - v * w - (vo ? 0.01 : 0.022) * s + 0.006 * Math.sin(Math.PI * s) - (1 - spitze) * 0.012 * (1 - v);
      pos.push(x, 0, sz * z); uv.push(s, v); seite.push(sz); vorn.push(vo);
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = base + i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("aSeite", new THREE.Float32BufferAttribute(seite, 1)); g.setAttribute("aVorn", new THREE.Float32BufferAttribute(vorn, 1)); g.setIndex(idx);
  const n = new Float32Array(pos.length); for (let i = 0; i < n.length; i += 3) n[i + 1] = 1; g.setAttribute("normal", new THREE.BufferAttribute(n, 3));
  return g;
}
const FLUEGEL_VERTEX = /* glsl */ `
    float fl_th = iFlug.z + iFlug.x * sin(uZeit * iFlug.y * 6.2832 + iFlug.w + (aVorn > 0.5 ? 0.0 : 1.7));
    float fl_zz = abs(transformed.z);
    transformed.y += fl_zz * sin(fl_th) + fl_zz * fl_zz * 0.35 * iFlug.x * cos(uZeit * iFlug.y * 6.2832 + iFlug.w);
    transformed.z = aSeite * fl_zz * cos(fl_th);`;
const FLUEGEL_KOPF = "attribute float aSeite; attribute float aVorn; attribute vec4 iFlug; uniform float uZeit;";

/** Libellen-Schwarm: setze(liste) mit { p:[x,y,z], yaw, pitch, roll, spann (m), amp, freq, ph, basis } */
export class Libellen {
  constructor(szene, { max = 16, schatten = true } = {}) {
    this.max = max; this.uZeit = { value: 0 }; this.uSonne = { value: new THREE.Vector3(0, 1, 0) }; this.uSonneF = { value: C("#FFF0D8") }; this.uHell = { value: 1 };
    const kg = libelleKoerper();
    const km = new THREE.MeshStandardMaterial({ color: "#FFFFFF", vertexColors: true, roughness: 0.55, metalness: 0.08 });
    km.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      { float fres = pow(1.0 - clamp(dot(normalize(vViewPosition), -normal), 0.0, 1.0), 3.0); totalEmissiveRadiance += vec3(0.08, 0.18, 0.14) * fres * 0.35; }`); };
    this.koerper = new THREE.InstancedMesh(kg, km, max); this.koerper.castShadow = schatten; this.koerper.frustumCulled = false; this.koerper.count = 0;
    const fg = libelleFluegel();
    this.iFlug = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.iFlug.setUsage(THREE.DynamicDrawUsage); fg.setAttribute("iFlug", this.iFlug);
    const u = { uZeit: this.uZeit, uSonne: this.uSonne, uSonneF: this.uSonneF, uHell: this.uHell };
    const fm = new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: /* glsl */ `${FLUEGEL_KOPF}
        varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main() { vUv = uv; vec3 transformed = position; ${FLUEGEL_VERTEX}
          vec3 n = vec3(0.0, cos(fl_th), -aSeite * sin(fl_th));
          vec4 w = modelMatrix * instanceMatrix * vec4(transformed, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * n);
          gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `uniform vec3 uSonne, uSonneF; uniform float uHell; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        float linie(float x, float b) { return 1.0 - smoothstep(0.0, b, abs(x)); }
        void main() {
          float s = vUv.x, v = vUv.y;
          float lang = 0.0; for (int k = 1; k < 6; k++) { float vk = float(k) / 6.0 + 0.04 * sin(s * 5.0 + float(k) * 1.3); lang = max(lang, linie(v - vk, 0.01 + 0.006 * (1.0 - s))); }
          vec2 zp = vec2(s * 42.0, v * 9.0); vec2 zi = floor(zp), zf = fract(zp); float d1 = 8.0, d2 = 8.0;
          for (int yy = -1; yy <= 1; yy++) for (int xx = -1; xx <= 1; xx++) { vec2 gg = vec2(float(xx), float(yy)); vec2 oo = vec2(fract(sin(dot(zi + gg, vec2(127.1, 311.7))) * 43758.5), fract(sin(dot(zi + gg, vec2(269.5, 183.3))) * 43758.5));
            float dd = length(gg + oo * 0.8 + 0.1 - zf); if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd; }
          float quer = (1.0 - smoothstep(0.0, 0.07, d2 - d1)) * 0.45;
          float kante = (1.0 - smoothstep(0.02, 0.045, v)) + (1.0 - smoothstep(0.0, 0.03, 1.0 - v)) * 0.5;
          float mal = smoothstep(0.84, 0.86, s) * (1.0 - smoothstep(0.92, 0.94, s)) * (1.0 - smoothstep(0.16, 0.22, v));
          float ader = clamp(max(max(lang, quer), kante), 0.0, 1.0);
          vec3 V = normalize(cameraPosition - vW), N = normalize(vN); if (dot(N, V) < 0.0) N = -N;
          vec3 L = normalize(uSonne);
          float fres = pow(1.0 - abs(dot(N, V)), 2.0);
          vec3 schillern = 0.5 + 0.5 * cos(6.2832 * (fres * 1.3 + s * 0.4 + vec3(0.0, 0.33, 0.67)));
          float glanz = pow(max(dot(reflect(-L, N), V), 0.0), 36.0);
          float durch = pow(max(dot(-V, L), 0.0), 3.0);
          vec3 haut = vec3(0.7, 0.62, 0.45) * (0.3 + 0.6 * uHell) + uSonneF * durch * 0.3;
          vec3 c = mix(haut, vec3(0.16, 0.12, 0.08), ader * 0.85);
          c = mix(c, vec3(0.08, 0.05, 0.03), mal);
          c += schillern * fres * 0.22 * uHell + uSonneF * glanz * 0.9;
          float a = clamp(0.045 + 0.12 * fres + 0.5 * ader + 0.9 * mal + glanz * 0.3 + durch * 0.06, 0.0, 0.92);
          float rand = smoothstep(0.0, 0.04, 1.0 - v) * smoothstep(0.0, 0.03, s);
          gl_FragColor = vec4(c, a * rand);
        }`,
    });
    this.fluegel = new THREE.InstancedMesh(fg, fm, max); this.fluegel.frustumCulled = false; this.fluegel.count = 0; this.fluegel.renderOrder = 30;
    if (schatten) {
      this.fluegel.castShadow = true;
      const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
      dm.onBeforeCompile = (sh) => { sh.uniforms.uZeit = this.uZeit; sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\n${FLUEGEL_KOPF}`).replace("#include <begin_vertex>", `#include <begin_vertex>\n${FLUEGEL_VERTEX}`); };
      this.fluegel.customDepthMaterial = dm;
    }
    szene.add(this.koerper, this.fluegel);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, "YZX"); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
  }
  setze(t, liste, { sonne, sonneF, hell = 1 } = {}) {
    this.uZeit.value = t; if (sonne) this.uSonne.value.set(...sonne).normalize(); if (sonneF) this.uSonneF.value.copy(sonneF); this.uHell.value = hell;
    const n = Math.min(this.max, liste.length);
    for (let i = 0; i < n; i++) {
      const L = liste[i];
      this._e.set(L.roll || 0, L.yaw || 0, L.pitch || 0); this._q.setFromEuler(this._e); this._s.setScalar(L.spann); this._p.set(...L.p);
      this._m.compose(this._p, this._q, this._s); this.koerper.setMatrixAt(i, this._m); this.fluegel.setMatrixAt(i, this._m);
      this.iFlug.setXYZW(i, L.amp ?? 0.5, L.freq ?? 7, L.basis ?? 0.08, L.ph ?? i * 1.7);
    }
    this.koerper.count = this.fluegel.count = n;
    this.koerper.instanceMatrix.needsUpdate = this.fluegel.instanceMatrix.needsUpdate = true; this.iFlug.needsUpdate = true;
    return this;
  }
}

// ------------------------------------------------------------------------------------------------ Materialien
function brandUniforms() {
  return { uT: { value: 0 }, uTB: { value: 1e4 }, uBrandAn: { value: 0 }, uErholt: { value: 0 }, uGlutS: { value: 1 }, uFichte: { value: new THREE.Vector2(FICHTE.x, FICHTE.z) } };
}
function bodenMaterial(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.97, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vNW;").replace("#include <project_vertex>", "#include <project_vertex>\nvNW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vNW;
uniform vec3 uGras, uGras2, uLaub, uFichteF;
uniform float uFarnNeu, uNass;
${GLSL_NOISE}
${GLSL_BRAND}
float waldF(vec2 p) {
  float jen = smoothstep(25.0, 30.0, bachZf(p.x) - p.y + 5.0 * (nN(vec2(p.x * 0.07 + 3.0, 1.7)) - 0.5));
  float sei = smoothstep(30.0, 37.0, abs(p.x) + 6.0 * (nN(vec2(p.y * 0.08, 4.1)) - 0.5)) * smoothstep(-40.0, -4.0, p.y) + smoothstep(16.0, 22.0, p.y);
  return clamp(max(jen, sei), 0.0, 1.0);
}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  vec2 p = vNW.xz; float y = vNW.y;
  float dc = length(p - cameraPosition.xz);
  float n1 = nN(p * 0.25), n2 = nN(p * 1.3), n3 = nF(p * 0.1), n4 = nN(p * 4.7);
  vec3 wiese = mix(uGras * 0.72, uGras * 1.12, n1) * (0.84 + 0.3 * n2);
  wiese = mix(wiese, uGras2 * (0.9 + 0.2 * n2), smoothstep(0.45, 0.75, nF(p * 0.08 + 11.0)) * 0.6);
  wiese *= 0.9 + 0.18 * n4;
  vec3 streu = vec3(0.17, 0.11, 0.06) * (0.7 + 0.5 * n2) * (0.85 + 0.3 * n4);
  streu = mix(streu, vec3(0.1, 0.17, 0.05) * (0.8 + 0.4 * n2), smoothstep(0.42, 0.7, nF(p * 0.21 + 5.0)) * 0.7);   // Moosflecken
  streu = mix(streu, uGras * 0.6, uFarnNeu * 0.45 * smoothstep(0.3, 0.6, nF(p * 0.15 + 2.0)));
  float w = waldF(p);
  float fernM = smoothstep(120.0, 380.0, length(p - vec2(0.0, -60.0)));
  vec3 fern = mix(uFichteF * 0.6, uLaub * 0.55, smoothstep(0.35, 0.65, nF(p * 0.004 + 2.0))) * (0.72 + 0.56 * nN(p * 0.06 + 3.0));
  vec3 c = mix(wiese, mix(streu, fern, fernM), w);
  // Ufer: feucht und dunkel, Kies im Bachbett
  float nass = 1.0 - smoothstep(0.02, 0.32, y);
  c = mix(c, vec3(0.09, 0.07, 0.045) * (0.8 + 0.4 * n2), nass * 0.85);
  vec3 kies = vec3(0.32, 0.29, 0.24) * (0.6 + 0.6 * nN(p * 9.0));
  c = mix(c, kies * 0.55, 1.0 - smoothstep(-0.35, -0.05, y));
  c = mix(c, c * vec3(0.84, 0.92, 1.0), smoothstep(250.0, 1800.0, dc) * 0.4);
  // Brand: verkohlter Boden mit Asche, Glut
  float vb = verbranntF(p);
  vec3 kohle = mix(vec3(0.028, 0.025, 0.022), vec3(0.24, 0.23, 0.22), smoothstep(0.55, 0.85, nN(p * 2.3 + 7.0)) * 0.6);
  c = mix(c, kohle, vb * (1.0 - nass * 0.6));
  diffuseColor.rgb = c;`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  { float g = glutF(vNW.xz); float muster = smoothstep(0.35, 0.8, nF(vNW.xz * 1.7 + vec2(uT * 0.4, 0.0))) * (0.6 + 0.4 * sin(uT * 7.0 + vNW.x * 3.0));
    totalEmissiveRadiance += vec3(1.0, 0.32, 0.06) * g * muster * 2.6; }`);
  };
  return m;
}
/** Wind und Brand für Baum-Instanzen (Krone bzw. Stamm) */
function baumMaterial(u, { art = "krone", fichte = false, hoehe = 22 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.92, metalness: 0, flatShading: true, vertexColors: true });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uZeit, uWindS; varying float vTint; varying vec3 vWp; varying float vLy;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
  {
    vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vTint = fract(sin(dot(wp.xz, vec2(12.9898, 78.233))) * 43758.5453); vWp = wp.xyz; vLy = position.y;
    float k = clamp(position.y / ${hoehe.toFixed(1)}, 0.0, 1.0), ph = wp.x * 0.21 + wp.z * 0.17;
    transformed.x += (sin(uZeit * 1.1 + ph) * 0.3 + sin(uZeit * 2.3 + ph * 2.0) * 0.12) * k * k * uWindS;
    transformed.z += cos(uZeit * 0.9 + ph) * 0.18 * k * k * uWindS;
  }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying float vTint; varying vec3 vWp; varying float vLy; uniform vec3 uLaub, uLaub2, uFichteF;
${GLSL_BRAND}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  {
    float vb = verbranntF(vWp.xz);
    float nahF = 1.0 - smoothstep(6.0, 22.0, length(vWp.xz - uFichte));
    ${art === "krone" ? (fichte ? "diffuseColor.rgb *= uFichteF * 1.25 * (0.88 + 0.24 * vTint);" : "diffuseColor.rgb *= mix(uLaub, uLaub2, vTint * vTint) * 1.35;")
      + "\n    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.12, 0.05) * (0.7 + 0.3 * vTint), vb * (0.25 + 0.6 * nahF));"
      : "diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03, 0.026, 0.022), vb * (1.0 - smoothstep(1.2, 4.5, vLy)));"}
  }`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  ${art === "stamm" ? "{ float g = glutF(vWp.xz) * (1.0 - smoothstep(0.3, 2.2, vLy)); totalEmissiveRadiance += vec3(1.0, 0.3, 0.05) * g * 1.4 * (0.6 + 0.4 * sin(uT * 9.0 + vWp.x)); }" : ""}`);
  };
  return m;
}
function pflanzenMaterial(u, { farn = false } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.9, flatShading: farn, vertexColors: true, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
attribute vec3 iInfo; uniform float uZeit, uWindS, uFarnNeu; varying float vZ; varying vec3 vWp; varying float vInfo;
${GLSL_BRAND}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
  {
    vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); vWp = wp.xyz;
    float iz = fract(sin(dot(wp.xz, vec2(12.9898, 78.233))) * 43758.5453); vZ = iz; vInfo = iInfo.x;
    float vb = verbranntF(wp.xz);
    float vis = iInfo.x > 0.5 ? smoothstep(iInfo.y, iInfo.y + 0.35, uFarnNeu) : 1.0 - vb;
    ${farn ? "float auf = mix(0.25, 1.0, smoothstep(0.0, 0.7, vis)); transformed.xz *= mix(0.35, 1.0, vis); transformed.y *= vis * auf;" : "transformed *= max(vis, 0.0); transformed.y *= 1.0;"}
    float k = max(position.y, 0.0), ph = wp.x * 0.31 + wp.z * 0.23;
    float boe = 0.5 + 0.5 * sin(wp.z * 0.05 - uZeit * 1.9 + wp.x * 0.03);
    float s = sin(uZeit * 1.7 + ph) * 0.55 + sin(uZeit * 3.1 + ph * 1.9) * 0.3;
    transformed.x += (s * 0.5 + boe * 1.1) * k * k * ${farn ? "0.06" : "0.1"} * uWindS;
    transformed.z += cos(uZeit * 1.3 + ph) * k * k * 0.05 * uWindS;
  }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying float vZ; varying vec3 vWp; varying float vInfo; uniform vec3 uGras, uGras2, uFarnF;`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  {
    ${farn ? "vec3 g = uFarnF * mix(0.9, 1.3, vZ) * mix(1.0, 1.15, vInfo) * 1.25;" : "vec3 g = mix(uGras, uGras2, vZ) * (0.85 + 0.3 * fract(vZ * 7.3));"}
    diffuseColor.rgb *= g * 1.9;
  }`);
  };
  return m;
}
const WASSER_F = /* glsl */ `
varying vec3 vW;
uniform vec3 uZenit, uHorizont, uSonne, uSonneF, uTief, uFlach, uWaldR, uGlutL;
uniform float uZeit, uGlitzer, uHell, uRegen;
${GLSL_NOISE}
float bachZw(float x) { return -11.0 + 2.2 * sin(x * 0.055 + 0.6) + 0.9 * sin(x * 0.16 + 1.3); }
float wh(vec2 p) {
  vec2 q = p * vec2(0.9, 2.2) - vec2(uZeit * 1.1, 0.0);
  float h = nF(q) * 0.6 + nN(p * vec2(2.6, 5.0) - vec2(uZeit * 2.0, uZeit * 0.3)) * 0.3 + nN(p * 9.0 - vec2(uZeit * 3.0, 0.0)) * 0.1;
  vec3 rz = nZelle(p * 2.2 + floor(uZeit * 4.0) * 1.7); h += uRegen * 0.25 * sin(rz.x * 30.0 - fract(uZeit * 4.0) * 12.0) * (1.0 - smoothstep(0.2, 0.5, rz.x));
  return h * 0.05;
}
void main() {
  vec3 V = normalize(vW - cameraPosition);
  vec2 p = vW.xz; float e = 0.04;
  float h0 = wh(p), hx = wh(p + vec2(e, 0.0)), hz = wh(p + vec2(0.0, e));
  vec3 N = normalize(vec3(-(hx - h0) / e, 1.0, -(hz - h0) / e));
  vec3 R = reflect(V, N); R.y = abs(R.y);
  vec3 himmel = mix(uHorizont, uZenit, pow(clamp(R.y, 0.0, 1.0), 0.6));
  vec3 refl = mix(uWaldR, himmel, smoothstep(0.12, 0.5, R.y));
  float cosT = clamp(dot(-V, N), 0.0, 1.0);
  float F = 0.03 + 0.97 * pow(1.0 - cosT, 4.0);
  float dd = abs(p.y - bachZw(p.x));
  vec3 grund = mix(uTief, uFlach, smoothstep(0.6, 1.9, dd));
  vec3 col = mix(grund * uHell, refl, clamp(F * 1.1, 0.0, 0.9));
  vec3 S = normalize(uSonne);
  float spec = pow(max(dot(R, S), 0.0), 300.0);
  vec3 zf = nZelle(p * vec2(9.0, 16.0) - vec2(uZeit * 2.2, 0.0));
  float funkel = (1.0 - smoothstep(0.0, 0.07, zf.x)) * step(0.82, fract(zf.z * 7.0 + uZeit * 0.9)) * pow(max(dot(R, S), 0.0), 24.0);
  col += uSonneF * (spec * 2.5 + funkel * 3.2) * uGlitzer;
  col += uGlutL * (0.3 + 0.7 * F);
  float schaum = smoothstep(1.55, 1.95, dd) * smoothstep(0.5, 0.75, nN(p * vec2(1.5, 6.0) - vec2(uZeit * 1.4, 0.0)));
  col = mix(col, vec3(0.85, 0.88, 0.86) * uHell, schaum * 0.35);
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`;

// ------------------------------------------------------------------------------------------------ Welt
export class Waldbach {
  constructor(szene, { schatten = true, nahZelle = 0.35 } = {}) {
    this.szene = szene; this.schatten = schatten; this.vertices = 0;
    this.u = {
      uZeit: { value: 0 }, uWindS: { value: 1 }, uLaub: { value: C("#4E7C2E") }, uLaub2: { value: C("#6A8F34") }, uFichteF: { value: C("#2F4D34") },
      uGras: { value: C("#6F9440") }, uGras2: { value: C("#8AA648") }, uFarnF: { value: C("#5E9E34") }, uFarnNeu: { value: 0 }, uNass: { value: 0 },
      ...brandUniforms(),
    };
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._e = new THREE.Euler();
    this._boden(nahZelle); this._wasser(); this._baeume(); this._pflanzen(); this._deko();
    this.libellen = new Libellen(szene, { max: 16, schatten });
    this._brandOrte();
  }
  _boden(zelle) {
    const mat = bodenMaterial(this.u);
    const NX = Math.round(150 / zelle), NZ = Math.round(150 / zelle);
    const nah = new THREE.PlaneGeometry(150, 150, NX, NZ); nah.rotateX(-Math.PI / 2); nah.translate(0, 0, -50);
    const mid = new THREE.PlaneGeometry(1400, 1400, 280, 280); mid.rotateX(-Math.PI / 2); mid.translate(0, 0, -450);
    const fern = new THREE.PlaneGeometry(40000, 40000, 260, 260); fern.rotateX(-Math.PI / 2); fern.translate(0, 0, -12000);
    const innen = (x, z, r) => Math.abs(x) < r[0] && z < r[1] && z > r[2];
    for (const [g, rand] of [[nah, null], [mid, [72, 22, -122]], [fern, [690, 240, -1140]]]) {
      const p = g.getAttribute("position");
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let y = hoehe(x, z); if (rand && innen(x, z, rand)) y -= 3; p.setY(i, y); }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = this.schatten; this.szene.add(m); this.vertices += p.count;
    }
  }
  _wasser() {
    // Band entlang der Mittellinie (± 3,2 m); das Gelände schneidet es an den Ufern
    const N = 520, pos = [], idx = [];
    for (let i = 0; i <= N; i++) { const x = -110 + (220 * i) / N, zb = bachZ(x); for (const s of [-3.2, 0, 3.2]) pos.push(x, WASSER_Y, zb + s); }
    for (let i = 0; i < N; i++) for (let j = 0; j < 2; j++) { const a = i * 3 + j, b = a + 3; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    this.uW = {
      uZeit: this.u.uZeit, uZenit: { value: C("#5A84C0") }, uHorizont: { value: C("#D8E3EC") }, uSonne: { value: new THREE.Vector3(0, 1, 0) }, uSonneF: { value: C("#FFF0D2") },
      uTief: { value: C("#0B2A26") }, uFlach: { value: C("#3E5A3A") }, uWaldR: { value: C("#2E4A2A") }, uGlutL: { value: new THREE.Vector3() }, uGlitzer: { value: 1 }, uHell: { value: 1 }, uRegen: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]), vertexShader: `varying vec3 vW;\n#include <fog_pars_vertex>\nvoid main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}`,
      fragmentShader: "#include <fog_pars_fragment>\n" + WASSER_F, fog: true });
    Object.assign(mat.uniforms, this.uW);
    this.wasser = new THREE.Mesh(g, mat); this.wasser.receiveShadow = false; this.szene.add(this.wasser);
  }
  _inst(geo, mat, liste, { schatten = false, info = null } = {}) {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, liste.length));
    im.castShadow = schatten && this.schatten; im.receiveShadow = this.schatten; im.frustumCulled = false;
    if (info) { const a = new Float32Array(Math.max(1, liste.length) * 3); liste.forEach((t, i) => a.set(t.info || [0, 0, 0], i * 3)); geo.setAttribute("iInfo", new THREE.InstancedBufferAttribute(a, 3)); }
    liste.forEach((t, i) => { this._e.set(t.tilt || 0, t.ry || 0, (t.tilt || 0) * 0.5); this._q.setFromEuler(this._e); this._s.set(t.sx ?? t.s, t.sy ?? t.s, t.sz ?? t.sx ?? t.s); this._p.set(t.x, t.y ?? hoehe(t.x, t.z) - 0.04, t.z); this._m.compose(this._p, this._q, this._s); im.setMatrixAt(i, this._m); });
    im.count = liste.length; this.szene.add(im); this.vertices += geo.getAttribute("position").count * liste.length;
    return im;
  }
  _baeume() {
    const u = this.u;
    const mK = baumMaterial(u), mF = baumMaterial(u, { fichte: true }), mS = baumMaterial(u, { art: "stamm" }), mKf = baumMaterial(u, { hoehe: 18 }), mFf = baumMaterial(u, { fichte: true, hoehe: 18 });
    const nahB = [], nahF = [], fernB = [], fernF = [];
    const belegt = new Set(), zelle = (x, z) => `${Math.floor(x / 3.4)},${Math.floor(z / 3.4)}`;
    for (let i = 0; i < 60000 && (nahB.length < 210 || nahF.length < 260); i++) {
      const x = (hash(i, 801) - 0.5) * 150, z = 18 - hash(i, 802) * 130;
      if (waldMass(x, z) < 0.6 || Math.hypot(x - FICHTE.x, z - FICHTE.z) < 6) continue;
      if (belegt.has(zelle(x, z))) continue; belegt.add(zelle(x, z));
      const gr = 0.72 + 0.5 * hash(i, 803), e = { x, z, s: gr, ry: hash(i, 804) * 6.28, v: Math.floor(hash(i, 805) * 3), tilt: (hash(i, 806) - 0.5) * 0.05 };
      if (hash(i, 807) < 0.48 ? nahB.length < 210 : nahF.length >= 260) nahB.push(e); else nahF.push({ ...e, v: e.v % 2 });
    }
    for (let i = 0; i < 30000 && fernB.length + fernF.length < 7000; i++) {
      const x = (hash(i, 811) - 0.5) * 1800, z = 150 - Math.pow(hash(i, 812), 1.2) * 1500;
      if (Math.abs(x) < 74 && z > -118 && z < 30) continue;
      if (z > -20 && Math.abs(x) < 40) continue;
      const e = { x, z, s: 0.8 + 0.9 * hash(i, 813), ry: hash(i, 814) * 6.28 };
      if (hash(i, 815) < 0.55) fernF.push(e); else fernB.push(e);
    }
    const BV = [0, 1, 2].map((k) => bucheGeo(7 + k * 13, { gross: 0.9 + 0.12 * k }));
    BV.forEach((v, k) => { const l = nahB.filter((t) => t.v === k); this._inst(v.stamm, mS, l, { schatten: true }); this._inst(v.krone, mK, l, { schatten: true }); });
    const FV = [fichteGeo(5), fichteGeo(17)];
    FV.forEach((g, k) => this._inst(g, mF, nahF.filter((t) => t.v === k), { schatten: true }));
    const bF = bucheFern(), fF = fichteFern();
    this._inst(bF.stamm, mS, fernB); this._inst(bF.krone, mKf, fernB); this._inst(fF, mFf, fernF.map((t) => ({ ...t, s: t.s * 1.1 })));
    const kamm = [];
    for (let i = 0; i < 12000 && kamm.length < 8000; i++) { const x = (hash(i, 821) - 0.5) * 5000, z = -800 - hash(i, 822) * 3600; if (hoehe(x, z) > 25) kamm.push({ x, z, s: 1.6 + 1.8 * hash(i, 823) + (-z) / 2200, ry: hash(i, 824) * 6.28 }); }
    this._inst(fF, mFf, kamm);
    // junge Buchen und Büsche auf der Uferwiese jenseits des Bachs
    const jung = [], busch = [];
    for (let i = 0; i < 20000 && (jung.length < 16 || busch.length < 90); i++) {
      const x = (hash(i, 841) - 0.5) * 90, dz = 5 + hash(i, 842) * 20, z = bachZ(x) - dz;
      if (waldMass(x, z) > 0.3 || Math.abs(x - FICHTE.x) < 7) continue;
      if (hash(i, 843) < 0.2 && jung.length < 16 && Math.abs(x) > 4) jung.push({ x, z, s: 0.26 + 0.22 * hash(i, 844), ry: hash(i, 845) * 6.28 });
      else if (busch.length < 90) busch.push({ x, z, s: 0.7 + 1.3 * hash(i, 846), ry: hash(i, 847) * 6.28 });
    }
    this._inst(BV[1].stamm, mS, jung, { schatten: true }); this._inst(BV[1].krone, mK, jung, { schatten: true });
    this._inst(sammle([klumpe([0, 0.6, 0], 0.95, 9, 0.95, 0.75)]), baumMaterial(u, { hoehe: 2 }), busch, { schatten: true });
    // Unterholz (Laubballen) am Waldrand jenseits des Bachs und an den Seiten
    const un = []; for (let i = 0; i < 30000 && un.length < 1300; i++) { const x = (hash(i, 831) - 0.5) * 140, z = 15 - hash(i, 832) * 110, w = waldMass(x, z); if (w > 0.25 && w < 0.95 && Math.abs(z - bachZ(x)) > 3.4) un.push({ x, z, s: 0.6 + 0.9 * hash(i, 833), ry: hash(i, 834) * 6.28 }); }
    this._inst(sammle([klumpe([0, 0.65, 0], 1.0, 4, 0.9, 0.7)]), baumMaterial(u, { hoehe: 2 }), un, { schatten: true });
    // die hohe Fichte (Blitzziel): eigenes Mesh, brennt und verkohlt
    this.uFi = { uZeit: u.uZeit, uWindS: u.uWindS, uFichteF: u.uFichteF, uKohle: { value: 0 }, uFeuer: { value: 0 }, uWeg: { value: 0 } };
    const g = fichteGeo(29);
    const mat = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.92, flatShading: true, vertexColors: true });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.uFi);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uZeit, uWindS, uKohle, uWeg; varying float vLy;")
        .replace("#include <begin_vertex>", `#include <begin_vertex>
  vLy = position.y; { float k = clamp(position.y / 22.0, 0.0, 1.0); transformed.x += sin(uZeit * 1.1) * 0.3 * k * k * uWindS; transformed.xz *= mix(1.0, 0.45, uKohle * smoothstep(1.0, 3.0, position.y)); transformed *= 1.0 - uWeg; }`);
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uFichteF; uniform float uKohle, uFeuer, uZeit; varying float vLy;")
        .replace("#include <color_fragment>", "#include <color_fragment>\n  diffuseColor.rgb *= uFichteF * 1.25; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03, 0.025, 0.02), uKohle);")
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n  totalEmissiveRadiance += vec3(1.0, 0.32, 0.06) * uFeuer * (0.5 + 0.5 * sin(uZeit * 11.0 + vLy * 1.7)) * 0.5 * (1.0 - smoothstep(4.0, 14.0, vLy)) + vec3(1.0, 0.25, 0.04) * uKohle * uFeuer * 0.25;");
    };
    this.fichte = new THREE.Mesh(g, mat); this.fichte.castShadow = this.schatten; this.fichte.receiveShadow = this.schatten;
    this.fichte.scale.setScalar(FICHTE.s); this.fichte.position.set(FICHTE.x, hoehe(FICHTE.x, FICHTE.z) - 0.1, FICHTE.z); this.szene.add(this.fichte);
    this.FICHTE_SPITZE = [FICHTE.x, this.fichte.position.y + 21 * FICHTE.s, FICHTE.z];
  }
  _pflanzen() {
    const u = this.u;
    const mG = pflanzenMaterial(u), tuff = grasTuff(), gras = [];
    for (let i = 0; gras.length < 70000 && i < 300000; i++) {
      const nahe = i % 3 !== 0, x = nahe ? (hash(i, 841) - 0.5) * 40 : (hash(i, 841) - 0.5) * 120, z = nahe ? 6 - hash(i, 842) * 26 : 16 - hash(i, 842) * 60;
      const y = hoehe(x, z); if (y < 0.12 || waldMass(x, z) > 0.55) continue;
      if (Math.hypot(x - STUMPF.x, z - STUMPF.z) < STUMPF.r + 0.08) continue;
      const dU = Math.hypot(x - UFERPLATZ.x, z - UFERPLATZ.z), dS = Math.hypot(x - STUMPF.x, z - STUMPF.z);
      if (dU < 0.9) continue;
      const fleck = fbm(x * 0.11 + 4, z * 0.11, 3), kurz = Math.min(lerp(0.35, 1, smoothstep(0.9, 4.5, dU)), lerp(0.55, 1, smoothstep(0.5, 2.2, dS)));
      gras.push({ x, y: y - 0.03, z, s: (0.24 + 0.3 * hash(i, 843)) * (0.75 + 0.55 * fleck) * kurz * (Math.abs(z - bachZ(x)) < 3.5 ? 0.8 : 1), ry: hash(i, 844) * 6.28 });
    }
    this.gras = this._inst(tuff, mG, gras, { info: true });
    // Wildblumen in Flecken
    const mB = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.8, vertexColors: true });
    const bl = [], farbenB = [[0.96, 0.95, 0.88], [0.98, 0.8, 0.16], [0.62, 0.42, 0.86], [0.9, 0.3, 0.42]];
    for (let i = 0; bl.length < 1600 && i < 40000; i++) {
      const x = (hash(i, 851) - 0.5) * 44, z = 6 - hash(i, 852) * 24, y = hoehe(x, z); if (y < 0.15 || waldMass(x, z) > 0.4 || fbm(x * 0.09 + 2, z * 0.09, 3) < 0.48) continue;
      if (Math.hypot(x - UFERPLATZ.x, z - UFERPLATZ.z) < 2.5 || Math.hypot(x - STUMPF.x, z - STUMPF.z) < 1.2) continue;
      bl.push({ x, y: y - 0.02, z, s: 0.55 + 0.45 * hash(i, 853), ry: hash(i, 854) * 6.28, f: farbenB[Math.floor(hash(i, 855) * 4)] });
    }
    const blG = blumeGeo(); this.blumen = this._inst(blG, mB, bl); bl.forEach((b, i) => this.blumen.setColorAt(i, new THREE.Color(...b.f)));
    // Farne: alt (Unterwuchs, verbrennt) und neu (treiben nach dem Brand aus, info.x = 1, info.y = Startschwelle)
    const mF = pflanzenMaterial(u, { farn: true }), fg = farnGeo(), farne = [];
    for (let i = 0; farne.length < 2400 && i < 60000; i++) {
      const x = (hash(i, 861) - 0.5) * 110, z = 14 - hash(i, 862) * 90, y = hoehe(x, z), w = waldMass(x, z), dz = Math.abs(z - bachZ(x));
      if (y < 0.1 || dz < 2.4 || Math.hypot(x - STUMPF.x, z - STUMPF.z) < 2.8 || Math.hypot(x - LICHTUNG.x, z - LICHTUNG.z) < 3.2 || Math.hypot(x - UFERPLATZ.x, z - UFERPLATZ.z) < 2.6) continue;
      const neu = hash(i, 863) < 0.62, rand = w > 0.15 || (z < bachZ(x) && dz > 2.8);
      if (!neu && !rand) continue;
      if (neu && w < 0.15 && z > bachZ(x) && hash(i, 864) < 0.55 && Math.hypot(x, z) < 6) continue;
      farne.push({ x, y: y - 0.05, z, s: (neu ? 0.9 + 1.0 * hash(i, 865) : 0.55 + 0.5 * hash(i, 865)) * (w > 0.5 ? 1.15 : 1), ry: hash(i, 866) * 6.28, info: [neu ? 1 : 0, neu ? 0.55 * hash(i, 867) + 0.2 * smoothstep(0, 40, Math.hypot(x, z)) : 0, 0] });
    }
    this.farne = this._inst(fg, mF, farne, { info: true, schatten: true });
  }
  _deko() {
    const sch = this.schatten;
    // Steine im Bach und am Ufer
    const mSt = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.75, vertexColors: true, flatShading: true });
    const steine = [];
    for (let i = 0; steine.length < 70 && i < 3000; i++) { const x = (hash(i, 871) - 0.5) * 80, off = (hash(i, 872) - 0.5) * 4.6, z = bachZ(x) + off, r = 0.12 + 0.35 * hash(i, 873) ** 2; if (Math.hypot(x - UFERPLATZ.x, z - UFERPLATZ.z) < 2.6) continue; steine.push({ x, y: Math.max(hoehe(x, z), -0.5) + r * 0.05, z, s: r, ry: hash(i, 874) * 6.28 }); }
    for (let k = 0; k < 3; k++) this._inst(steinGeo(k * 3.1), mSt, steine.filter((_, i) => i % 3 === k), { schatten: true });
    // Baumstumpf mit Moos (Vordergrund, Landeplatz der Libelle)
    const T = stumpfTeile(), mH = new THREE.MeshStandardMaterial({ color: "#FFFFFF", vertexColors: true, roughness: 0.93, flatShading: true });
    const ringTex = new THREE.MeshStandardMaterial({ color: "#FFFFFF", vertexColors: true, roughness: 0.85 });
    const gy = hoehe(STUMPF.x, STUMPF.z) - 0.06;
    for (const [g, m] of [[T.rinde, mH], [T.ringe, ringTex], [T.rest, mH]]) { const o = new THREE.Mesh(g, m); o.position.set(STUMPF.x, gy, STUMPF.z); o.rotation.y = 0.7; o.castShadow = o.receiveShadow = sch; this.szene.add(o); }
    this.STUMPF_OBEN = [STUMPF.x, gy + STUMPF.h + 0.02, STUMPF.z];
    // Totholz am jenseitigen Ufer
    const mHolz = new THREE.MeshStandardMaterial({ color: "#5E4A38", roughness: 0.95, flatShading: true });
    for (const [x, dz, l, r, ry] of [[-9, -4.2, 5.5, 0.22, 0.35], [6.5, -5.0, 4.2, 0.18, -0.4], [14, -3.6, 3.4, 0.15, 0.9]]) {
      const z = bachZ(x) + dz, st = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, l, 8), mHolz); st.rotation.z = Math.PI / 2; st.rotation.y = ry; st.position.set(x, hoehe(x, z) + r * 0.6, z); st.castShadow = st.receiveShadow = sch; this.szene.add(st);
    }
  }
  _brandOrte() {
    // Orte für Flammen und Rauch: Raster jenseits des Bachs (Abstand ≈ 2,6 m), dazu die Fichte
    this.orte = [];
    for (let i = 0; i < 9000 && this.orte.length < 300; i++) {
      const x = FICHTE.x + (hash(i, 881) - 0.5) * 120, z = FICHTE.z + 30 - hash(i, 882) * 75;
      const a = ankunftBei(x, z, 0); if (!isFinite(a)) continue;
      if (this.orte.some((o) => Math.abs(o.x - x) < 2.4 && Math.abs(o.z - z) < 2.4)) continue;
      this.orte.push({ x, z, y: hoehe(x, z), a, k: hash(i, 883), w: waldMass(x, z) });
    }
  }
  /** Flammen (additive HDR-Puffs) bei Videozeit t; TB = Blitz, staerke 0..1 (fällt in der Nacht) */
  flammen(t, TB, { staerke = 1, fichte = 0 } = {}) {
    const out = [];
    for (let i = 0; i < this.orte.length; i++) {
      const o = this.orte[i], tau = t - (TB + o.a);
      if (tau < 0 || tau > 12) continue;
      const leben = smoothstep(0, 0.5, tau) * (1 - smoothstep(3.5, 9 + 3 * o.k, tau)) * staerke;
      if (leben < 0.02) continue;
      const hoch = (0.9 + 1.6 * o.k + 1.4 * o.w) * leben;
      for (let k = 0; k < 3; k++) {
        const ph = fr(t * (1.6 + 0.4 * k) + o.k * 7 + k * 0.33), dx = (hash(i * 3 + k, 891) - 0.5) * 1.6, dz = (hash(i * 3 + k, 892) - 0.5) * 1.6;
        const hell = (1 - ph) * leben;
        out.push({ p: [o.x + dx, o.y + 0.2 + ph * hoch, o.z + dz], r: (0.55 + 0.5 * o.w) * (1 - 0.5 * ph) * (0.6 + leben), dreh: ph * 3 + k, farbe: [5.5 * hell, 1.6 * hell, 0.32 * hell], a: 0.55, licht: 0.2, bild: (i + k) % 4 });
      }
    }
    if (fichte > 0.01) {     // brennende Fichte: Flammensäule entlang des Stamms
      const [fx, fy, fz] = this.FICHTE_SPITZE, y0 = this.fichte.position.y;
      for (let k = 0; k < 26; k++) { const ph = fr(t * 1.3 + k * 0.137), y = lerp(y0 + 1, fy, (k / 26) * 0.9 + ph * 0.1), r = lerp(3.2, 0.9, (y - y0) / (fy - y0)) * FICHTE.s * (0.7 + 0.5 * ph);
        const hell = fichte * (0.7 + 0.3 * Math.sin(t * 9 + k)) * (1 - 0.6 * ph); out.push({ p: [fx + Math.sin(k * 2.1 + t) * 0.6, y + ph * 2.5, fz + Math.cos(k * 1.7) * 0.6], r, dreh: k + ph, farbe: [5 * hell, 1.5 * hell, 0.3 * hell], a: 0.6, licht: 0.2, bild: k % 4 }); }
    }
    return out;
  }
  /** Rauch (normale Puffs) */
  rauch(t, TB, { staerke = 1, wind = [2.5, 0, 1] } = {}) {
    const out = [];
    for (let i = 0; i < this.orte.length; i += 2) {
      const o = this.orte[i], tau = t - (TB + o.a);
      if (tau < 0.3) continue;
      const lebt = (1 - smoothstep(7, 14, tau)) * staerke;
      if (lebt < 0.02) continue;
      for (let k = 0; k < 2; k++) {
        const ph = fr(t * 0.22 + o.k * 5 + k * 0.5), h = 2 + ph * 26;
        out.push({ p: [o.x + wind[0] * ph * 8, o.y + h, o.z + wind[2] * ph * 8], r: 2.2 + ph * 7, dreh: o.k * 6 + ph, farbe: [0.16, 0.15, 0.14].map((c) => c * (1.2 - 0.4 * ph)), a: 0.62 * lebt * Math.sin(Math.PI * Math.min(1, ph * 1.15)), licht: 0.6, bild: (i + k) % 4 });
      }
    }
    return out;
  }
  /** Zustand je Bild */
  setze(t, kam, w = {}) {
    const u = this.u;
    u.uZeit.value = t; u.uT.value = t;
    if (w.wind !== undefined) u.uWindS.value = w.wind;
    for (const k of ["laub", "laub2", "gras", "gras2"]) if (w[k]) u["u" + k[0].toUpperCase() + k.slice(1)].value.copy(w[k]);
    if (w.fichte) u.uFichteF.value.copy(w.fichte); if (w.farn) u.uFarnF.value.copy(w.farn);
    if (w.TB !== undefined) u.uTB.value = w.TB;
    if (w.brandAn !== undefined) u.uBrandAn.value = w.brandAn; if (w.erholt !== undefined) u.uErholt.value = w.erholt; if (w.glutS !== undefined) u.uGlutS.value = w.glutS;
    if (w.farnNeu !== undefined) u.uFarnNeu.value = w.farnNeu;
    const W = this.uW;
    if (w.zenit) W.uZenit.value.copy(w.zenit); if (w.horizont) W.uHorizont.value.copy(w.horizont); if (w.sonne) W.uSonne.value.set(...w.sonne).normalize(); if (w.sonneF) W.uSonneF.value.copy(w.sonneF);
    if (w.glitzer !== undefined) W.uGlitzer.value = w.glitzer; if (w.wasserHell !== undefined) W.uHell.value = w.wasserHell; if (w.regen !== undefined) W.uRegen.value = w.regen;
    if (w.glutLicht) W.uGlutL.value.set(...w.glutLicht); if (w.waldR) W.uWaldR.value.copy(w.waldR);
    if (w.fichteZ) { this.uFi.uKohle.value = w.fichteZ.kohle; this.uFi.uFeuer.value = w.fichteZ.feuer; this.uFi.uWeg.value = w.fichteZ.weg; this.fichte.visible = w.fichteZ.weg < 0.999; }
    return this;
  }
}

// ------------------------------------------------------------------------------------------------ Blitz und Lichtstrahlen
/** Blitz als gezackter Leuchtpfad (additiv, HDR) von oben in ein Ziel; setze(t, kamera, hell) baut Bänder zur Kamera hin */
export class Blitz {
  constructor(szene, { ziel = [0, 0, 0], hoehe = 600, seed = 3 } = {}) {
    const pfad = (a, b, tiefe, s) => { if (tiefe === 0) return [a, b]; const m = a.map((v, i) => (v + b[i]) / 2), L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); m[0] += (hash(s, 1) - 0.5) * L * 0.42; m[2] += (hash(s, 2) - 0.5) * L * 0.3; m[1] += (hash(s, 3) - 0.5) * L * 0.08; return [...pfad(a, m, tiefe - 1, s * 2 + 1), ...pfad(m, b, tiefe - 1, s * 2 + 2).slice(1)]; };
    const oben = [ziel[0] + 10, ziel[1] + hoehe, ziel[2] - 22];
    this.zweige = [{ pts: pfad(oben, ziel, 5, seed), b: 1 }];
    const P = this.zweige[0].pts;
    for (const [k, l, s] of [[7, 26, 11], [15, 18, 17], [22, 12, 23]]) { const a = P[k], e = [a[0] + (hash(s, 4) - 0.5) * l * 1.6, a[1] - l, a[2] + (hash(s, 5) - 0.5) * l]; this.zweige.push({ pts: pfad(a, e, 4, s), b: 0.45 }); }
    const n = this.zweige.reduce((s, z) => s + (z.pts.length - 1), 0) * 2;
    this.pos = new Float32Array(n * 6 * 3); this.col = new Float32Array(n * 6 * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 40; szene.add(this.mesh); this.g = g;
  }
  setze(kamera, hell) {
    this.mesh.visible = hell > 0.002; if (!this.mesh.visible) return;
    const cp = kamera.position, A = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3(), Q = new THREE.Vector3();
    let o = 0;
    for (const z of this.zweige) for (let i = 0; i < z.pts.length - 1; i++) for (const [breite, f] of [[0.45, [9, 9, 12]], [1.6, [0.45, 0.5, 0.9]]]) {
      A.set(...z.pts[i]); B.set(...z.pts[i + 1]); D.subVectors(B, A).normalize(); Q.subVectors(cp, A).cross(D).normalize().multiplyScalar(breite * (z.b < 1 ? 0.6 : 1) * 0.5);
      const v = [A.clone().add(Q), A.clone().sub(Q), B.clone().add(Q), B.clone().sub(Q)];
      for (const k of [0, 1, 2, 2, 1, 3]) { this.pos.set([v[k].x, v[k].y, v[k].z], o * 3); this.col.set(f.map((c) => c * hell * z.b * (breite > 1 ? 0.5 : 1)), o * 3); o++; }
    }
    this.g.attributes.position.needsUpdate = true; this.g.attributes.color.needsUpdate = true;
  }
}
/** Lichtstrahlen durch die Kronen: weiche additive Bänder entlang der Sonnenrichtung (zum Betrachter gedreht) */
export class Lichtstrahlen {
  constructor(szene, { anzahl = 16, seed = 5 } = {}) {
    this.n = anzahl;
    this.st = Array.from({ length: anzahl }, (_, i) => { const x = (hash(i, seed) - 0.5) * 46, z = bachZ(x) - 9 - 10 * hash(i, seed + 1); return { x, z, y: hoehe(x, z) + 7 + 4 * hash(i, seed + 2), b: 0.8 + 2.4 * hash(i, seed + 3), l: 26 + 14 * hash(i, seed + 4), ph: hash(i, seed + 5) * 6.28 }; });
    const g = new THREE.BufferGeometry(); this.pos = new Float32Array(anzahl * 4 * 3); this.uv = new Float32Array(anzahl * 4 * 2); this.al = new Float32Array(anzahl * 4);
    const idx = []; for (let i = 0; i < anzahl; i++) { const a = i * 4; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); for (const [k, uv] of [[0, [0, 0]], [1, [1, 0]], [2, [0, 1]], [3, [1, 1]]]) this.uv.set(uv, (a + k) * 2); }
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute("uv", new THREE.BufferAttribute(this.uv, 2)); g.setAttribute("aA", new THREE.BufferAttribute(this.al, 1).setUsage(THREE.DynamicDrawUsage)); g.setIndex(idx);
    this.u = { uFarbe: { value: C("#FFE6B8") }, uStaerke: { value: 0 } };
    const m = new THREE.ShaderMaterial({ uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "attribute float aA; varying vec2 vUv; varying float vA; void main() { vUv = uv; vA = aA; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 uFarbe; uniform float uStaerke; varying vec2 vUv; varying float vA; void main() { float q = 1.0 - abs(vUv.x * 2.0 - 1.0); q = q * q * (3.0 - 2.0 * q); float l = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y)); gl_FragColor = vec4(uFarbe * q * l * vA * uStaerke, 1.0); }" });
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 15; szene.add(this.mesh); this.g = g;
  }
  setze(t, kamera, sonne, staerke, farbe) {
    this.u.uStaerke.value = staerke; if (farbe) this.u.uFarbe.value.copy(farbe); this.mesh.visible = staerke > 0.003; if (!this.mesh.visible) return;
    const S = new THREE.Vector3(...sonne).normalize(), cp = kamera.position, M = new THREE.Vector3(), Q = new THREE.Vector3();
    this.st.forEach((s, i) => {
      M.set(s.x, s.y, s.z); Q.subVectors(cp, M).cross(S).normalize().multiplyScalar(s.b * 0.5);
      const oben = M.clone().addScaledVector(S, s.l * 0.5), unten = M.clone().addScaledVector(S, -s.l * 0.5);
      const v = [oben.clone().sub(Q), oben.clone().add(Q), unten.clone().sub(Q), unten.clone().add(Q)];
      v.forEach((p, k) => this.pos.set([p.x, p.y, p.z], (i * 4 + k) * 3));
      const a = 0.05 * (0.55 + 0.45 * Math.sin(t * 0.35 + s.ph)) * smoothstep(0, 4, cp.distanceTo(M));
      for (let k = 0; k < 4; k++) this.al[i * 4 + k] = a;
    });
    this.g.attributes.position.needsUpdate = true; this.g.attributes.aA.needsUpdate = true;
  }
}
