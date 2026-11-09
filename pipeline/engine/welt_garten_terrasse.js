// Welt „Garten mit Terrasse“ (Account 2 @stelldirvor.pov, Weltenkatalog „Land, Feld, Dorf → Garten“), Erstbau 09.11.2026
// („Was wäre, wenn du 28 Jahre lang Ameisen zusiehst?“, Skript acc2-2026-11-10-mittag). NUR für den Baukasten Lunar-POV.
// Makro-Maßstab: Meter, aber gebaut für eine Kamera 10–60 cm über den Platten (Ameisen sind 4–9 mm groß, siehe engine/ameisen.js).
//
// Inhalt: Terrasse aus Betonplatten 50 × 50 cm (Fase, Poren, Zuschlag, Flechten, Moos in den Fugen, Sandfugen), Plattenkante auf Tiefbord,
// Kiesstreifen, kurzer Rasen (Zehntausende Büschel), Rosenbeet mit Mulch, Pflasterkante, drei Rosen (Triebe, Fiederblätter, Blüten,
// Blattläuse an der Hauptrose), Hainbuchenhecke hinten und links, junger Apfelbaum rechts, Lavendel, Gartenmöbel in drei Epochen,
// Terrakottatopf, Nachbarhäuser und Bäume hinter der Hecke, Hummeln. Kein eigener Himmel und keine Lichter (wie welt_waldlichtung.js):
// Himmel = Himmel aus stil_lunar_pov.js, Licht stellt die Szene nach tageslicht().
//
// ===================================================================================================================== API
// import { GartenTerrasse, jahreszeit, tageslicht, hoehe, TERRASSE, NEST, ROSE } from "../../engine/welt_garten_terrasse.js";
//   Koordinaten: y = 0 Rasen, Terrasse oben y = TERRASSE.y (0,17 m), Plattenkante (vorne) bei z = 0, Terrasse z 0 … 3, x −3 … 3
//   (Raster 0,5 m ab x = −3, Fugen bei x = k·0,5 − 3 und z = k·0,5), Garten liegt bei −z (Blick der Kamera nach −z = WNW,
//   Abendsonne steht im Gegenlicht). NEST = Nesteingang in der Fuge x = 0 der vordersten Plattenreihe (z = 0,21).
//   hoehe(x, z)                       Bodenhöhe (Rasen, Kies, Beet; auf der Terrasse die Plattenoberkante)
//   jahreszeit(p, jahrNr?)            p = Position im Jahr 0..1 (0 = 1. Januar), jahrNr (0, 1, 2 …) variiert Schnee je Winter
//        → { gras, gras2, hecke, laub, cover, rosenLaub, bluete, apfelBluete, aepfel, schnee, laubBoden, aktiv, zenit, horizont, kalt }
//        aktiv = Aktivität der Ameisen 0..1 (Winterruhe 0), kalt 0..1 (für Farbstimmung)
//   tageslicht(p, stunde, zustand?)   Sonnenstand (Breite 51° N, Sonnenzeit) → { sonne:[x,y,z], hoehe (Grad), tag 0..1, gold 0..1,
//        licht:{ richtung, farbe, staerke }, hemi:{ oben, unten, staerke }, zenit, horizont }   (Nacht: Mondlicht, bläulich)
//   const welt = new GartenTerrasse(szene, { schatten = true, moebel = Standardplätze, details = 1 });
//   welt.setze(t, kamera, { zustand: jahreszeit(…), jahre = 0, wind = 1, sand = 0, loch = 0, blattlaeuse = 0, moebel = 0,
//                           hummeln = 1, glanz = 0 })
//        jahre        0 … 28  Wachstum: Hecke 0,95 → 2,1 m, Rose 0,55 → 1,35 m (mehr Triebe), Apfelbaum 1,6 → 4,6 m
//        sand         0..1    Sandhäufchen quellen aus den Fugen um das Nest (mehr Häufchen und größer)
//        loch         0..1    dunkler Nesteingang in der Fuge (nach dem Eingraben der Königin)
//        blattlaeuse  0..1    Kolonie an den Triebspitzen der Hauptrose (bis 160 Tiere)
//        moebel       0 | 1 | 2  Epoche: 0 weiße Kunststoffstühle, 1 Holz (Teak), 2 Metall anthrazit (Wechsel im Zeitraffer)
//        hummeln      0..1    drei Hummeln an Rose und Lavendel (nur bei Blüte sichtbar)
//   welt.strassen(jahre)  → Ameisenstraßen als Punktlisten [{ punkte:[{p:[x,y,z], n:[nx,ny,nz]}], name }] für engine/ameisen.js
//        0 „rose“: Nest → Fuge → Plattenkante hinab → Kies → Rasen → Hauptrose → Trieb hinauf zu den Blattläusen
//        1 „kante“: Nest → Fuge → entlang der Plattenkante nach rechts zum Apfelbaum
//        2 „fuge“: Nest → Querfuge → nach links über die Terrasse zum Topf (spätere Jahre)
//   welt.rosenPfad(jahre) → Punkte am Haupttrieb der Hauptrose (Fuß → Blattlauskolonie), Weltkoordinaten
//   welt.fugenPunkte      → Mittelpunkte der Sandhäufchen (Weltkoordinaten), welt.vertices
// Lehre aus früheren Welten: alle Objekte stehen auf hoehe(x, z), kein Zustand zwischen Bildern, feste Seeds (hash), keine Math.random().
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { GLSL_NOISE, klumpen } from "./welt_feld_wald.js";

const C = (h) => new THREE.Color(h);
const fr = (x) => x - Math.floor(x);
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 3) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= 0.5; } return s; }

// ----------------------------------------------------------------------------------------------- Lage
export const TERRASSE = { y: 0.17, x0: -3, x1: 3, z0: 0, z1: 3, platte: 0.5, fuge: 0.007, dicke: 0.045 };
export const FUGE_Y = TERRASSE.y - 0.006;                       // Sandfüllung der Fugen (knapp unter der Oberkante)
export const NEST = { x: 0, z: 0.21 };
export const KIES = { z0: -0.24, z1: -0.006 };
export const BEET = { x0: -3.3, x1: 2.0, z0: -3.6, z1: -2.5 };
export const ROSE = { x: -0.55, z: -3.0 };
export const ROSEN = [{ x: ROSE.x, z: ROSE.z, seed: 3, s: 1 }, { x: -2.05, z: -3.12, seed: 11, s: 0.9 }, { x: 1.15, z: -3.05, seed: 19, s: 0.85 }];
export const HECKE = { z: -4.35, x0: -7.5, x1: 7.5, links: -4.6, lz0: -4.3, lz1: 1.2 };
export const APFEL = { x: 2.55, z: -1.75 };
export const BREITE = 51.0;
const NORD_ACHSE = 285;                                          // Kompassrichtung von −z (WNW): Abendsonne im Sommer vorne

export function hoehe(x, z) {
  if (z >= 0 && x >= TERRASSE.x0 && x <= TERRASSE.x1 && z <= TERRASSE.z1) return TERRASSE.y;
  let y = 0.008 * (fbm(x * 1.3 + 4, z * 1.3 + 1, 3) - 0.5) + 0.004 * (vn(x * 9, z * 9) - 0.5);
  if (z > KIES.z0 && z < 0.05) y = 0.012 + 0.003 * (vn(x * 30, z * 30) - 0.5);
  const beet = smoothstep(BEET.z1 + 0.04, BEET.z1 - 0.12, z) * smoothstep(BEET.z0 - 0.1, BEET.z0 + 0.15, z) * smoothstep(BEET.x0 - 0.1, BEET.x0 + 0.1, x) * smoothstep(BEET.x1 + 0.1, BEET.x1 - 0.1, x);
  y += beet * (0.035 + 0.012 * (fbm(x * 4, z * 4, 2) - 0.5));
  y += 0.05 * smoothstep(HECKE.z + 0.6, HECKE.z - 0.2, z);       // Heckenfuß leicht erhöht
  const d = Math.hypot(x, z + 10);
  y += 6 * smoothstep(60, 900, d) * fbm(x * 0.004 + 3, z * 0.004 + 1, 3);
  return y;
}

// ----------------------------------------------------------------------------------------------- Jahreszeit
const JZ = [   // p (0 = 1. Jan) und Zustand; zyklisch linear interpoliert
  { p: 0.04, gras: "#5F6E40", gras2: "#7A7F52", hecke: "#7A5E3A", laub: "#6B5A44", cover: 0, rosenLaub: 0.12, bluete: 0, apfelBluete: 0, aepfel: 0, schnee: 1, laubBoden: 0.3, aktiv: 0, zenit: "#7E93B4", horizont: "#D9DFE6", kalt: 1 },
  { p: 0.17, gras: "#5E7540", gras2: "#7C8650", hecke: "#7A5E3A", laub: "#6B5A44", cover: 0, rosenLaub: 0.15, bluete: 0, apfelBluete: 0, aepfel: 0, schnee: 0.35, laubBoden: 0.2, aktiv: 0.05, zenit: "#7D98C0", horizont: "#DCE2E8", kalt: 0.8 },
  { p: 0.27, gras: "#5C9338", gras2: "#86AE48", hecke: "#94B850", laub: "#9EC85A", cover: 0.35, rosenLaub: 0.55, bluete: 0, apfelBluete: 0.6, aepfel: 0, schnee: 0, laubBoden: 0.05, aktiv: 0.45, zenit: "#5C94D2", horizont: "#E2E9EE", kalt: 0.35 },
  { p: 0.36, gras: "#4E8C32", gras2: "#7BAA42", hecke: "#6E9E3C", laub: "#7CAE48", cover: 1, rosenLaub: 1, bluete: 0.15, apfelBluete: 0.15, aepfel: 0, schnee: 0, laubBoden: 0, aktiv: 0.9, zenit: "#4F8ACC", horizont: "#E0E8EE", kalt: 0.1 },
  { p: 0.5, gras: "#5A8E36", gras2: "#90AA48", hecke: "#4E7C2E", laub: "#5C8A34", cover: 1, rosenLaub: 1, bluete: 1, apfelBluete: 0, aepfel: 0.15, schnee: 0, laubBoden: 0, aktiv: 1, zenit: "#4A84C8", horizont: "#DCE4EC", kalt: 0 },
  { p: 0.63, gras: "#7C8C44", gras2: "#A4A458", hecke: "#4C7630", laub: "#5A8632", cover: 1, rosenLaub: 0.95, bluete: 0.75, apfelBluete: 0, aepfel: 0.6, schnee: 0, laubBoden: 0, aktiv: 1, zenit: "#4F86C8", horizont: "#E2E2DC", kalt: 0 },
  { p: 0.76, gras: "#62883C", gras2: "#8E9C4C", hecke: "#A88A3A", laub: "#C8862E", cover: 0.75, rosenLaub: 0.65, bluete: 0.25, apfelBluete: 0, aepfel: 1, schnee: 0, laubBoden: 0.55, aktiv: 0.55, zenit: "#5A84C0", horizont: "#E8DCC6", kalt: 0.3 },
  { p: 0.86, gras: "#5C7A3A", gras2: "#7E8A4C", hecke: "#8A6838", laub: "#9A5A2A", cover: 0.15, rosenLaub: 0.3, bluete: 0.05, apfelBluete: 0, aepfel: 0, schnee: 0, laubBoden: 1, aktiv: 0.1, zenit: "#7488AA", horizont: "#D2D4D4", kalt: 0.65 },
  { p: 0.96, gras: "#5E6F40", gras2: "#787E50", hecke: "#7A5E3A", laub: "#6B5A44", cover: 0, rosenLaub: 0.15, bluete: 0, apfelBluete: 0, aepfel: 0, schnee: 0.7, laubBoden: 0.45, aktiv: 0, zenit: "#7E92B2", horizont: "#D8DDE3", kalt: 0.95 },
];
const JZ_FARBEN = ["gras", "gras2", "hecke", "laub", "zenit", "horizont"];
const JZ_ZAHLEN = ["cover", "rosenLaub", "bluete", "apfelBluete", "aepfel", "schnee", "laubBoden", "aktiv", "kalt"];
const JZ_C = JZ.map((z) => Object.fromEntries(JZ_FARBEN.map((k) => [k, C(z[k])])));
/** Zustand der Natur je Position im Jahr (rein, kein Gedächtnis). jahrNr variiert den Schnee je Winter (Winter 0 hat immer Schnee). */
export function jahreszeit(p, jahrNr = null) {
  p = fr(p);
  let i = JZ.length - 1;
  for (let k = 0; k < JZ.length; k++) if (JZ[k].p <= p) i = k;
  const j = (i + 1) % JZ.length;
  const pa = JZ[i].p, pb = JZ[j].p + (j <= i ? 1 : 0), pp = p < pa ? p + 1 : p;
  const f = clamp((pp - pa) / (pb - pa));
  const out = {};
  for (const k of JZ_FARBEN) out[k] = JZ_C[i][k].clone().lerp(JZ_C[j][k], f);
  for (const k of JZ_ZAHLEN) out[k] = lerp(JZ[i][k], JZ[j][k], f);
  if (jahrNr !== null) {
    const winterNr = p > 0.6 ? jahrNr : jahrNr - 1;                 // Dezember gehört zum Winter des folgenden Januars
    const s = winterNr <= 0 ? 1 : hash(winterNr, 77) < 0.55 ? 0.55 + 0.45 * hash(winterNr, 78) : 0.12 * hash(winterNr, 79);
    out.schnee *= s;
  }
  out.p = p;
  return out;
}

// ----------------------------------------------------------------------------------------------- Tageslicht
const D2R = Math.PI / 180;
/** Sonnenstand: p = Jahr (0 = 1. Jan), stunde = Sonnenzeit (12 = Mittag). Welt: −z = Kompass 285° (WNW). */
export function sonnenStand(p, stunde) {
  const dekl = 23.44 * Math.sin((2 * Math.PI * (p * 365 - 80)) / 365) * D2R, H = (stunde - 12) * 15 * D2R, phi = BREITE * D2R;
  const sa = Math.sin(phi) * Math.sin(dekl) + Math.cos(phi) * Math.cos(dekl) * Math.cos(H);
  const alt = Math.asin(clamp(sa, -1, 1));
  const azS = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dekl) * Math.cos(phi));   // ab Süden, westwärts positiv
  const A = (180 * D2R + azS) - NORD_ACHSE * D2R;
  return { alt, richtung: [Math.sin(A) * Math.cos(alt), Math.sin(alt), -Math.cos(A) * Math.cos(alt)] };
}
const LT = { tagZ: C("#4A84C8"), tagH: C("#D6E2EC"), goldZ: C("#5A74AA"), goldH: C("#F4B47A"), nachtZ: C("#050B1E"), nachtH: C("#16264A"),
  sonneHoch: C("#FFF3DE"), sonneTief: C("#FF9248"), mond: C("#9DB2DE"), hemiTag: C("#C6D8EE"), hemiNacht: C("#26365C"), bodenTag: C("#6E7A4C"), bodenNacht: C("#141A16") };
/** Licht für die Szene (rein). zustand (optional, aus jahreszeit) tönt den Tageshimmel. */
export function tageslicht(p, stunde, zustand = null) {
  const { alt, richtung } = sonnenStand(p, stunde);
  const a = alt / D2R;
  const tag = smoothstep(-8, 3, a), gold = smoothstep(-3, 2, a) * (1 - smoothstep(6, 22, a));
  const zenit = (zustand ? zustand.zenit.clone() : LT.tagZ.clone()).lerp(LT.goldZ, gold * 0.6).lerp(LT.nachtZ, 1 - tag);
  const horizont = (zustand ? zustand.horizont.clone() : LT.tagH.clone()).lerp(LT.goldH, gold).lerp(LT.nachtH, 1 - tag);
  const sonnig = smoothstep(-1.5, 6, a);
  const licht = sonnig > 0.02
    ? { richtung, farbe: LT.sonneHoch.clone().lerp(LT.sonneTief, 1 - smoothstep(2, 28, a)), staerke: 3.1 * sonnig }
    : { richtung: [0.35, 0.75, 0.45], farbe: LT.mond.clone(), staerke: 0.32 * (1 - tag) };
  return {
    sonne: richtung, hoehe: a, tag, gold, licht, zenit, horizont,
    hemi: { oben: LT.hemiNacht.clone().lerp(LT.hemiTag, tag).lerp(LT.goldH, gold * 0.25), unten: LT.bodenNacht.clone().lerp(LT.bodenTag, tag), staerke: lerp(0.28, 1.05, tag) },
  };
}

// ----------------------------------------------------------------------------------------------- Shader-Helfer
const U_DECL = /* glsl */ `
uniform float uZeit, uWindS, uSchnee, uSand, uLoch, uWuchs, uLaubR, uBluete, uCover, uApfelB, uAepfel, uLaubBoden, uKalt;
uniform vec3 uGras, uGras2, uHecke, uLaub, uNest;
`;
const SCHNEE_GLSL = /* glsl */ `
  float snN = smoothstep(0.25, 0.85, vWN.y) * smoothstep(0.15, 0.75, nF(vW.xz * 2.2) * 0.7 + uSchnee * 0.75);
  vec3 snC = vec3(0.90, 0.93, 0.97) * (0.92 + 0.1 * nN(vW.xz * 140.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, snC, clamp(uSchnee * 1.35, 0.0, 1.0) * snN);
`;
let matNr = 0;
/** Material mit Weltposition (vW), Weltnormale (vWN), Rauschen, gemeinsamen Uniforms, optional Vertex- und Farbcode */
function weltMat(mat, u, { vertex = "", farbe = "", schnee = true, attrib = "" } = {}) {
  const key = "garten" + matNr++;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\nvarying vec3 vW; varying vec3 vWN;\n${U_DECL}\n${attrib}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${vertex}`)
      .replace("#include <project_vertex>", `#include <project_vertex>
  #ifdef USE_INSTANCING
    vW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
  #else
    vW = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);
  #endif`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vW; varying vec3 vWN;\n${U_DECL}\n${GLSL_NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${farbe}\n${schnee ? SCHNEE_GLSL : ""}`);
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}
const std = (o = {}) => new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.9, metalness: 0, ...o });

/** Teile zu einer Geometrie mit Vertexfarben (+ optionalem Attribut a1) verschmelzen: [{ g, c: Color|[r,g,b]|f(x,y,z), a? }] */
function verschmelze(teile) {
  const pos = [], col = [], nor = [], a1 = [];
  for (const t of teile) {
    const g = t.g.index ? t.g.toNonIndexed() : t.g;
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    const p = g.getAttribute("position"), n = g.getAttribute("normal");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      pos.push(x, y, z); nor.push(n.getX(i), n.getY(i), n.getZ(i));
      let c = typeof t.c === "function" ? t.c(x, y, z) : t.c;
      if (c && c.isColor) c = [c.r, c.g, c.b];
      col.push(c[0], c[1], c[2]); a1.push(typeof t.a === "function" ? t.a(x, y, z) : t.a || 0);
    }
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  o.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); o.setAttribute("a1", new THREE.Float32BufferAttribute(a1, 1));
  return o;
}
const rgb = (hex, f = 1) => { const c = C(hex); return [c.r * f, c.g * f, c.b * f]; };

// Grasbüschel (kurz gemähter Rasen): 11 Halme, Fuß dunkel, Spitze hell, Normalen nach oben
function grasBuschel() {
  const pos = [], col = [], nor = [];
  for (let i = 0; i < 11; i++) {
    const a = i * 2.39996, r = 0.004 + 0.018 * Math.sqrt((i + 0.5) / 11), x = Math.cos(a) * r, z = Math.sin(a) * r, w = 0.0016 + 0.0008 * (i % 3);
    const nx = -Math.sin(a) * w, nz = Math.cos(a) * w, hh = 0.7 + 0.3 * ((i * 5) % 11) / 10, lean = 0.08 + 0.18 * ((i * 7) % 5) / 4;
    const tx = x + Math.cos(a + 0.6) * lean * 0.06, tz = z + Math.sin(a + 0.6) * lean * 0.06;
    const hell = 0.85 + 0.3 * ((i * 3) % 4) / 3;
    pos.push(x - nx, 0, z - nz, x + nx, 0, z + nz, tx, hh, tz);
    col.push(0.35, 0.35, 0.35, 0.35, 0.35, 0.35, hell, hell, hell); nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  return g;
}
/** Laubballen aus Blattkarten (Ellipse per discard über Attribut aUv), Einheitsradius ≈ 1; n Blätter der Länge laenge (Einheiten) */
function blattKarten(n, seed, { laenge = 0.26, breite = 0.15, innen = 0.35 } = {}) {
  const pos = [], col = [], nor = [], uv = [], a1 = [];
  const v = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const th = hash(i, seed) * 6.283, ph = Math.acos(1 - 2 * Math.pow(hash(i, seed + 1), 0.85)), r = 1 - innen * Math.pow(hash(i, seed + 2), 2);
    v.set(Math.sin(ph) * Math.cos(th), Math.cos(ph) * 0.85, Math.sin(ph) * Math.sin(th));
    const c = v.clone().multiplyScalar(r), nn = v.clone().normalize();
    nn.add(new THREE.Vector3(hash(i, seed + 3) - 0.5, hash(i, seed + 4) - 0.3, hash(i, seed + 5) - 0.5).multiplyScalar(1.1)).normalize();
    t1.crossVectors(nn, Math.abs(nn.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : up).normalize(); t2.crossVectors(nn, t1).normalize();
    const w = hash(i, seed + 6) * 6.283, a = t1.clone().multiplyScalar(Math.cos(w)).addScaledVector(t2, Math.sin(w)), b = nn.clone().cross(a);
    const L = laenge * (0.75 + 0.5 * hash(i, seed + 7)), B = breite * (0.75 + 0.5 * hash(i, seed + 7));
    const ecke = (s, q) => c.clone().addScaledVector(a, s * L).addScaledVector(b, q * B).addScaledVector(nn, -0.08 * s * s * L);
    const P = [ecke(-0.5, -0.5), ecke(0.5, -0.5), ecke(0.5, 0.5), ecke(-0.5, -0.5), ecke(0.5, 0.5), ecke(-0.5, 0.5)], U = [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]];
    const hell = (0.6 + 0.5 * hash(i, seed + 8)) * (0.72 + 0.35 * (v.y + 1) / 2) * (0.8 + 0.2 * r);
    for (let k = 0; k < 6; k++) { pos.push(P[k].x, P[k].y, P[k].z); nor.push(nn.x, nn.y, nn.z); col.push(hell, hell, hell); uv.push(...U[k]); a1.push(hash(i, seed + 9)); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("aUv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("a1", new THREE.Float32BufferAttribute(a1, 1));
  return g;
}
/** Blattform (Ellipse mit Spitze, Mittelrippe) – für Materialien mit blattKarten-Geometrie */
const BLATT_ATTR = "attribute vec2 aUv; attribute float a1; varying vec2 vBUv; varying float vBA;";
const BLATT_V = "vBUv = aUv; vBA = a1;";
const BLATT_F = /* glsl */ `
  { vec2 q = vBUv * 2.0 - 1.0; float w = (1.0 - q.x * q.x) * (0.93 + 0.07 * abs(sin(q.x * 26.0))); if (abs(q.y) > w * (0.95 - 0.25 * max(q.x, 0.0)) || q.x > 0.98) discard;
    diffuseColor.rgb *= 1.0 - 0.12 * smoothstep(0.05, 0.0, abs(abs(q.y) - 0.45 * w * fract(q.x * 3.0 + abs(q.y) * 2.0))) * step(0.15, abs(q.y));
    diffuseColor.rgb *= 0.86 + 0.28 * vBA; diffuseColor.rgb *= 1.0 - 0.25 * smoothstep(0.08, 0.0, abs(q.y)) * step(-0.9, q.x); }`;
/** Material mit Blattkarten: weltMat + Blattform */
function blattMaterial(u, { vertex = "", farbe = "", schnee = true, attrib = "", rauheit = 0.78 } = {}) {
  const m = weltMat(std({ roughness: rauheit, vertexColors: true, side: THREE.DoubleSide }), u, { attrib: BLATT_ATTR + attrib, vertex: BLATT_V + vertex, farbe: farbe + BLATT_F, schnee });
  const alt = m.onBeforeCompile;
  m.onBeforeCompile = (sh) => { alt(sh); sh.fragmentShader = sh.fragmentShader.replace("varying vec3 vW;", "varying vec3 vW; varying vec2 vBUv; varying float vBA;"); };
  return m;
}
// Laubballen aus Ikosaedern (Stufe 0), Einheitsradius ≈ 1, Helligkeit nach Höhe
function blattBallen(n, seed) {
  const teile = [];
  for (let i = 0; i < n; i++) {
    const th = hash(i, seed) * 6.283, ph = Math.acos(1 - 2 * hash(i, seed + 1)), r = i === 0 ? 0 : 0.45 + 0.35 * hash(i, seed + 2);
    const x = Math.sin(ph) * Math.cos(th) * r, y = Math.cos(ph) * r * 0.8, z = Math.sin(ph) * Math.sin(th) * r;
    const k = new THREE.IcosahedronGeometry(i === 0 ? 0.62 : 0.32 + 0.2 * hash(i, seed + 3), 0); k.translate(x, y, z);
    const h = (0.66 + 0.4 * hash(i, seed + 4)) * (0.75 + 0.3 * (y + 1) / 2);
    teile.push({ g: k, c: [h, h, h] });
  }
  return verschmelze(teile);
}

// ----------------------------------------------------------------------------------------------- Welt
export class GartenTerrasse {
  constructor(szene, { schatten = true, moebel = null, details = 1 } = {}) {
    this.szene = szene; this.schatten = schatten; this.details = details; this.vertices = 0;
    this.u = {
      uZeit: { value: 0 }, uWindS: { value: 1 }, uSchnee: { value: 0 }, uSand: { value: 0 }, uLoch: { value: 0 }, uWuchs: { value: 1 }, uLaubR: { value: 1 },
      uBluete: { value: 1 }, uCover: { value: 1 }, uApfelB: { value: 0 }, uAepfel: { value: 0 }, uLaubBoden: { value: 0 }, uKalt: { value: 0 },
      uGras: { value: C("#5A8E36") }, uGras2: { value: C("#90AA48") }, uHecke: { value: C("#4E7C2E") }, uLaub: { value: C("#5C8A34") },
      uNest: { value: new THREE.Vector3(NEST.x, FUGE_Y, NEST.z) },
    };
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._e = new THREE.Euler();
    this._boden(); this._terrasse(); this._kies(); this._rasen(); this._beet(); this._rosen(); this._hecke(); this._apfel();
    this._moebel(moebel); this._deko(); this._hintergrund(); this._laub(); this._sandHaufen(); this._hummeln();
  }
  _add(o, { cast = false, recv = true } = {}) { o.castShadow = cast && this.schatten; o.receiveShadow = recv && this.schatten; this.szene.add(o);
    o.traverse?.((k) => { if (k.geometry) this.vertices += k.geometry.getAttribute("position").count * (k.count || 1); }); return o; }
  _inst(geo, mat, liste, { cast = false, recv = true } = {}) {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, liste.length));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
    liste.forEach((it, i) => {
      e.set(it.rx || 0, it.r || 0, it.rz || 0); q.setFromEuler(e);
      s.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.sx ?? it.s ?? 1); p.set(it.x, it.y, it.z);
      im.setMatrixAt(i, m.compose(p, q, s));
      if (it.c) { c.setRGB(it.c[0], it.c[1], it.c[2]); im.setColorAt(i, c); }
    });
    if (!liste.length) im.count = 0;
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.frustumCulled = false; im.castShadow = cast && this.schatten; im.receiveShadow = recv && this.schatten;
    this.szene.add(im); this.vertices += geo.getAttribute("position").count * liste.length;
    return im;
  }

  // ---------------------------------------------------------------- Boden: Rasenerde, Kies, Beet-Mulch, Ferne
  _boden() {
    const mat = weltMat(std({ roughness: 0.97 }), this.u, { farbe: /* glsl */ `
  vec2 p = vW.xz; float dc = length(vW - cameraPosition);
  float n1 = nN(p * 3.0), n2 = nN(p * 37.0), n3 = nF(p * 0.6);
  vec3 erde = mix(vec3(0.075, 0.06, 0.04), vec3(0.12, 0.10, 0.06), n2);
  vec3 c = mix(erde, uGras * 0.55, 0.55 + 0.25 * n1);                                   // Rasen von oben zwischen den Büscheln
  c = mix(c, uGras2 * 0.6, smoothstep(0.55, 0.8, n3) * 0.4);
  float kies = step(${KIES.z0.toFixed(3)}, p.y) * step(p.y, 0.02) * step(-3.05, p.x) * step(p.x, 3.05);
  c = mix(c, vec3(0.42, 0.40, 0.37) * (0.7 + 0.4 * nN(p * 160.0)), kies);
  float beet = step(${BEET.z0.toFixed(2)}, p.y) * step(p.y, ${BEET.z1.toFixed(2)}) * step(${BEET.x0.toFixed(2)}, p.x) * step(p.x, ${BEET.x1.toFixed(2)});
  mat2 Ra = mat2(0.6, -0.8, 0.8, 0.6), Rb = mat2(0.96, 0.28, -0.28, 0.96);
  float ch1 = nN((Ra * p) * vec2(140.0, 38.0)), ch2 = nN((Rb * p) * vec2(36.0, 150.0) + 5.0), ch3 = nN(p * 300.0);
  float stueck = max(smoothstep(0.55, 0.7, ch1), smoothstep(0.6, 0.72, ch2));
  vec3 mulch = mix(vec3(0.07, 0.045, 0.03), mix(vec3(0.26, 0.16, 0.09), vec3(0.36, 0.24, 0.14), ch3), stueck);
  mulch *= 0.8 + 0.35 * nN(p * 7.0);
  c = mix(c, mulch, beet);
  float hf = smoothstep(${(HECKE.z + 0.55).toFixed(2)}, ${(HECKE.z + 0.2).toFixed(2)}, p.y);
  c = mix(c, vec3(0.08, 0.065, 0.045) * (0.8 + 0.4 * n2), hf);                          // Erde unter der Hecke
  c = mix(c, uGras * 0.7 * (0.8 + 0.3 * n3), smoothstep(${(HECKE.z - 0.7).toFixed(2)}, ${(HECKE.z - 1.2).toFixed(2)}, p.y));  // Nachbargärten
  c = mix(c, c * vec3(0.9, 0.95, 1.05), smoothstep(30.0, 400.0, dc) * 0.5);
  diffuseColor.rgb = c;` });
    const nah = new THREE.PlaneGeometry(18, 14, 360, 280); nah.rotateX(-Math.PI / 2); nah.translate(0, 0, -3);
    const fern = new THREE.PlaneGeometry(4000, 4000, 160, 160); fern.rotateX(-Math.PI / 2); fern.translate(0, 0, -1600);
    for (const [g, tief] of [[nah, 0], [fern, 1]]) {
      const p = g.getAttribute("position");
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let y = hoehe(x, z); if (z > 0 && x > -3.05 && x < 3.05) y = 0.01; if (tief && Math.abs(x) < 9 && z < 4 && z > -10) y -= 0.25; p.setY(i, y); }
      g.computeVertexNormals();
      this._add(new THREE.Mesh(g, mat), { recv: true });
    }
  }

  // ---------------------------------------------------------------- Terrasse: Platten mit Fase, Fugensand, Tiefbord
  _terrasse() {
    const T = TERRASSE, s = T.platte - T.fuge, b = 0.0028;
    const form = new THREE.Shape(); form.moveTo(-s / 2 + b, -s / 2 + b); form.lineTo(s / 2 - b, -s / 2 + b); form.lineTo(s / 2 - b, s / 2 - b); form.lineTo(-s / 2 + b, s / 2 - b); form.closePath();
    const geo = new THREE.ExtrudeGeometry(form, { depth: T.dicke - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 1 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, -T.dicke + b, 0);          // Oberkante bei y = 0 (Fase eingeschlossen)
    geo.computeVertexNormals();
    const mat = weltMat(std({ roughness: 0.93 }), this.u, { farbe: /* glsl */ `
  vec2 p = vW.xz;
  vec2 lp = fract((p - vec2(${T.x0.toFixed(2)}, 0.0)) / ${T.platte.toFixed(2)});
  float rand = min(min(lp.x, 1.0 - lp.x), min(lp.y, 1.0 - lp.y)) * ${T.platte.toFixed(2)};   // m bis zur Plattenkante
  vec3 c = diffuseColor.rgb;
  float dc = length(vW - cameraPosition), fein = 1.0 - smoothstep(0.35, 2.5, dc);            // Feinstruktur nur in der Nähe (kein Moiré)
  mat2 R1 = mat2(0.8, -0.6, 0.6, 0.8), R2 = mat2(0.28, 0.96, -0.96, 0.28);
  c *= 0.9 + 0.1 * (nN(R1 * p * 260.0) - 0.5) * 2.0 * (0.4 + 0.6 * fein) + 0.06 * (nN(R2 * p * 700.0 + 3.1) - 0.5) * fein;
  vec3 zk = nZelle(R2 * p * 620.0);                                                         // Zuschlag: Sandkörner hell/dunkel
  float korn = (1.0 - smoothstep(0.18, 0.42, zk.x)) * step(0.55, zk.z) * fein;
  c *= 1.0 + korn * (zk.z > 0.8 ? -0.16 : 0.08);
  vec3 zp = nZelle(R1 * p * 520.0 + 7.0);                                                   // Poren: wenige dunkle Punkte
  c *= 1.0 - 0.5 * (1.0 - smoothstep(0.06, 0.16, zp.x)) * step(0.86, zp.z) * fein;
  float flecken = nF(p * 2.2 + 5.0);
  c *= 0.84 + 0.22 * smoothstep(0.25, 0.75, flecken);                                     // Witterungsflecken
  c = mix(c, c * vec3(0.8, 0.84, 0.72), smoothstep(0.004, 0.0, rand - 0.0005) * 0.55);    // Schmutz an der Fase
  vec3 fz = nZelle(p * 9.0);                                                               // Flechten (hell, ringförmig)
  float fl = (1.0 - smoothstep(0.02, 0.07 + 0.05 * nN(p * 90.0), fz.x)) * step(0.9, fz.z) * smoothstep(0.02, 0.06, rand);
  c = mix(c, c * vec3(1.12, 1.12, 0.98), fl * 0.45);
  float moos = smoothstep(0.012, 0.0, rand) * smoothstep(0.45, 0.7, nF(p * 6.0 + 2.0)) * (1.0 - uKalt * 0.4);
  c = mix(c, vec3(0.16, 0.24, 0.07) * (0.8 + 0.5 * nN(p * 300.0)), moos * 0.75);          // Moos an den Kanten
  c *= mix(1.0, 0.78, smoothstep(0.5, -0.5, vWN.y));                                      // Kantenflächen etwas dunkler
  diffuseColor.rgb = c;` });
    const liste = [];
    const nx = Math.round((T.x1 - T.x0) / T.platte), nz = Math.round((T.z1 - T.z0) / T.platte);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const k = i * 31 + j, g = 0.42 + 0.08 * (hash(k, 3) - 0.5), w = hash(k, 4) * 0.03;
      liste.push({ x: T.x0 + (i + 0.5) * T.platte, y: T.y + 0.0006 * (hash(k, 1) - 0.5), z: T.z0 + (j + 0.5) * T.platte, rx: 0.0015 * (hash(k, 2) - 0.5), rz: 0.0015 * (hash(k, 5) - 0.5), c: [g + w, g + w * 0.8, g - 0.01] });
    }
    this.platten = this._inst(geo, mat, liste, { cast: false, recv: true });   // werfen keinen Schatten (Akne an den Fasen)
    // Fugenfüllung (Sand, Moos, Nesteingang) – liegt knapp unter der Oberkante und ist nur in den Fugen sichtbar
    const fMat = weltMat(std({ roughness: 1 }), this.u, { farbe: /* glsl */ `
  vec2 p = vW.xz;
  vec3 c = mix(vec3(0.52, 0.44, 0.31), vec3(0.36, 0.30, 0.21), nN(p * 900.0));
  c *= 0.8 + 0.35 * nN(p * 2600.0);
  float moos = smoothstep(0.45, 0.75, nF(p * 7.0 + 9.0));
  c = mix(c, vec3(0.15, 0.24, 0.06) * (0.7 + 0.6 * nN(p * 1200.0)), moos * 0.8);
  float d = length(p - uNest.xz);
  c = mix(c, vec3(0.60, 0.52, 0.38) * (0.85 + 0.3 * nN(p * 1800.0)), uSand * smoothstep(0.09, 0.0, d) * 0.9);   // aufgeworfener Sand
  c *= 1.0 - uLoch * 0.93 * smoothstep(0.0032, 0.0012, d);                                                         // Nesteingang
  diffuseColor.rgb = c;` });
    const fuge = new THREE.PlaneGeometry(T.x1 - T.x0, T.z1 - T.z0, 1, 1); fuge.rotateX(-Math.PI / 2); fuge.translate((T.x0 + T.x1) / 2, FUGE_Y, (T.z0 + T.z1) / 2);
    this._add(new THREE.Mesh(fuge, fMat), { recv: true });
    // Tiefbord unter der vordersten Reihe (vorne bündig) und Unterbau als Kantenfläche
    const bord = new THREE.BoxGeometry(0.995, T.y - T.dicke + 0.02, 0.08); bord.translate(0, (T.y - T.dicke - 0.02) / 2, 0.035);   // Vorderseite z = −0,005, Oberkante unter den Platten
    const bMat = weltMat(std({ roughness: 0.95 }), this.u, { farbe: /* glsl */ `
  vec2 q = vec2(vW.x + vW.z, vW.y);
  vec3 c = vec3(0.47, 0.46, 0.43) * (0.82 + 0.2 * nN(q * 380.0)) * (0.85 + 0.2 * nF(q * 6.0));
  c *= 1.0 - 0.4 * smoothstep(0.84, 0.97, nN(q * 1300.0));
  c = mix(c, vec3(0.20, 0.17, 0.12), smoothstep(0.05, 0.0, vW.y - 0.012) * 0.7);          // Erdspritzer unten
  diffuseColor.rgb = c;` });
    const bl = []; for (let i = 0; i < 6; i++) bl.push({ x: T.x0 + 0.5 + i, y: 0, z: 0, c: [1, 1, 1] });
    this.bord = this._inst(bord, bMat, bl, { cast: true, recv: true });
  }

  // ---------------------------------------------------------------- Kiesstreifen vor der Kante
  _kies() {
    const g = new THREE.IcosahedronGeometry(1, 0), mat = weltMat(std({ roughness: 0.75, vertexColors: false }), this.u, { farbe: `diffuseColor.rgb *= 0.85 + 0.3 * nN(vW.xz * 900.0);` });
    const liste = [], n = Math.round(4200 * this.details);
    for (let i = 0; liste.length < n && i < n * 2; i++) {
      const x = lerp(-3.05, 3.05, hash(i, 51)), z = lerp(KIES.z0 + 0.01, KIES.z1 - 0.004, hash(i, 52)), r = 0.004 + 0.007 * hash(i, 53) ** 2;
      const t = hash(i, 54), g0 = t < 0.4 ? [0.62, 0.6, 0.56] : t < 0.7 ? [0.52, 0.47, 0.4] : t < 0.9 ? [0.72, 0.7, 0.66] : [0.4, 0.38, 0.36];
      const v = 0.85 + 0.3 * hash(i, 55);
      liste.push({ x, y: hoehe(x, z) + r * 0.25, z, r: hash(i, 56) * 6.28, rx: hash(i, 57), sx: r * 1.3, sy: r * 0.7, sz: r, c: g0.map((k) => k * v) });
    }
    this.kies = this._inst(g, mat, liste, { cast: false, recv: true });
  }

  // ---------------------------------------------------------------- Rasen
  _rasen() {
    const geo = grasBuschel();
    const mat = weltMat(std({ roughness: 0.92, vertexColors: true, side: THREE.DoubleSide }), this.u, {
      vertex: /* glsl */ `
  {
    vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float k = clamp(position.y, 0.0, 1.0);
    float ph = wp.x * 3.1 + wp.z * 1.9;
    float welle = sin(uZeit * 1.7 + ph) * 0.6 + sin(uZeit * 3.1 + ph * 1.7) * 0.3 + sin(uZeit * 0.7 + wp.x * 0.8 - wp.z * 0.5) * 0.7;
    transformed.x += welle * k * k * 0.12 * uWindS;
    transformed.z += cos(uZeit * 1.3 + ph) * k * k * 0.06 * uWindS;
    transformed.y *= 1.0 - 0.85 * smoothstep(0.1, 0.8, uSchnee);
  }`,
      farbe: /* glsl */ `
  float hb = clamp(vColor.r, 0.0, 1.3);
  vec3 g = mix(uGras, uGras2, smoothstep(0.4, 0.8, nN(vW.xz * 4.0)) * 0.6 + 0.2 * nN(vW.xz * 60.0));
  diffuseColor.rgb = g * hb * (0.9 + 0.2 * nN(vW.xz * 200.0));`,
    });
    const liste = [], n = Math.round(46000 * this.details);
    const flaeche = (anz, x0, x1, z0, z1, seed) => {
      for (let i = 0, k = 0; k < anz && i < anz * 3; i++) {
        const x = lerp(x0, x1, hash(i, seed)), z = lerp(z0, z1, hash(i, seed + 1));
        if (z > KIES.z0 - 0.01) continue;
        if (z < BEET.z1 + 0.02 && z > BEET.z0 - 0.05 && x > BEET.x0 - 0.05 && x < BEET.x1 + 0.05) continue;
        if (z < HECKE.z + 0.45) continue;
        if (x < HECKE.links + 0.4) continue;
        if (Math.hypot(x - APFEL.x, z - APFEL.z) < 0.12) continue;
        const hh = 0.03 + 0.035 * hash(i, seed + 2), s = 0.8 + 0.6 * hash(i, seed + 3);
        liste.push({ x, y: hoehe(x, z) - 0.002, z, r: hash(i, seed + 4) * 6.28, sx: s, sy: hh, sz: s });
        k++;
      }
    };
    flaeche(n * 0.62, -3.6, 3.6, -2.6, KIES.z0, 61);
    flaeche(n * 0.38, -4.3, 7.5, -4.0, 1.5, 71);
    this.gras = this._inst(geo, mat, liste, { recv: true });
  }

  // ---------------------------------------------------------------- Beet: Pflasterkante, Lavendel
  _beet() {
    const st = new THREE.BoxGeometry(0.09, 0.07, 0.09);
    const mat = weltMat(std({ roughness: 0.85 }), this.u, { farbe: `diffuseColor.rgb *= 0.8 + 0.3 * nN(vW.xz * 300.0 + vW.y * 200.0); diffuseColor.rgb *= 1.0 - 0.3 * smoothstep(0.85, 0.97, nN(vW.xz * 1500.0));` });
    const liste = [];
    for (let x = BEET.x0, i = 0; x < BEET.x1; x += 0.095, i++) {
      const g = 0.45 + 0.12 * hash(i, 81);
      liste.push({ x: x + 0.045, y: hoehe(x, BEET.z1) - 0.01, z: BEET.z1 + 0.045, r: 0.06 * (hash(i, 82) - 0.5), rx: 0.03 * (hash(i, 83) - 0.5), c: [g, g * 0.98, g * 0.94] });
    }
    for (let z = BEET.z1, i = 200; z > BEET.z0; z -= 0.095, i++) {
      const g = 0.45 + 0.12 * hash(i, 81);
      liste.push({ x: BEET.x1 + 0.045, y: hoehe(BEET.x1, z) - 0.01, z: z - 0.045, r: 0.06 * (hash(i, 82) - 0.5), c: [g, g * 0.98, g * 0.94] });
    }
    this.pflaster = this._inst(st, mat, liste, { cast: true, recv: true });
    // Lavendel: Büschel aus Stielen mit violetten Ähren
    const teile = [];
    for (let i = 0; i < 44; i++) {                                                               // Blütenstiele mit Ähren aus Quirlen
      const a = hash(i, 91) * 6.28, r = 0.13 * Math.sqrt(hash(i, 92)), h = 0.3 + 0.16 * hash(i, 93), kipp = (hash(i, 94) - 0.5) * 0.6 + r * 2.2;
      const setz = (g) => { g.rotateZ(-kipp); g.rotateY(-a); g.translate(Math.cos(a) * r * 0.4, 0, Math.sin(a) * r * 0.4); return g; };
      const stiel = new THREE.CylinderGeometry(0.0012, 0.0016, h, 3); stiel.translate(0, h / 2, 0); teile.push({ g: setz(stiel), c: rgb("#8A967A") });
      for (let q = 0; q < 6; q++) { const k = new THREE.IcosahedronGeometry(0.0042 - q * 0.0003, 0); k.scale(1, 1.3, 1); k.translate(0, h + 0.004 + q * 0.0085, 0); teile.push({ g: setz(k), c: rgb(q % 2 ? "#6A50A8" : "#7E62B8", 0.9 + 0.2 * hash(i, 95 + q)), a: 1 }); }
    }
    for (let i = 0; i < 70; i++) {                                                               // graugrüne Blättchen (schmal)
      const a = hash(i, 191) * 6.28, r = 0.11 * Math.sqrt(hash(i, 192)), h = 0.1 + 0.08 * hash(i, 193);
      const b = new THREE.CylinderGeometry(0.0008, 0.002, h, 3); b.translate(0, h / 2, 0); b.rotateZ(-(0.3 + r * 4)); b.rotateY(-a); b.translate(Math.cos(a) * r * 0.5, 0, Math.sin(a) * r * 0.5);
      teile.push({ g: b, c: rgb("#7E8E72", 0.85 + 0.3 * hash(i, 194)) });
    }
    const busch = new THREE.IcosahedronGeometry(0.1, 2); busch.scale(1, 0.55, 1); busch.translate(0, 0.04, 0);
    teile.push({ g: busch, c: rgb("#5E6E56") });
    const lgeo = verschmelze(teile);
    const lmat = weltMat(std({ roughness: 0.9, vertexColors: true }), this.u, {
      attrib: "attribute float a1; varying float vA1;",
      vertex: `vA1 = a1; transformed.x += sin(uZeit * 1.6 + position.y * 4.0 + float(gl_InstanceID)) * position.y * 0.05 * uWindS;`,
      farbe: `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.40, 0.32), vA1 * (1.0 - uBluete)); diffuseColor.rgb *= 0.85 + 0.3 * nN(vW.xz * 200.0 + vW.y * 90.0);`,
    });
    lmat.onBeforeCompile = ((alt) => (sh) => { alt(sh); sh.fragmentShader = sh.fragmentShader.replace("varying vec3 vW;", "varying vec3 vW; varying float vA1;"); })(lmat.onBeforeCompile);
    const lav = [];
    for (let i = 0; i < 9; i++) { const x = lerp(BEET.x0 + 0.3, BEET.x1 - 0.3, (i + 0.5) / 9) + 0.15 * (hash(i, 95) - 0.5), z = BEET.z1 - 0.28 - 0.1 * hash(i, 96); if (Math.abs(x - ROSE.x) < 0.35) continue; lav.push({ x, y: hoehe(x, z) - 0.01, z, r: hash(i, 97) * 6.28, s: 0.85 + 0.35 * hash(i, 98) }); }
    this.lavendel = this._inst(lgeo, lmat, lav, { cast: true });
  }

  // ---------------------------------------------------------------- Rosen (Triebe, Blätter, Blüten, Blattläuse)
  _rosen() {
    this.rosen = [];
    const stielMat = weltMat(std({ roughness: 0.75, vertexColors: true }), this.u, {
      attrib: "attribute float a1;",
      vertex: `if (a1 > uWuchs) transformed *= 0.0; transformed.x += sin(uZeit * 1.1 + position.y * 2.0) * position.y * position.y * 0.02 * uWindS;`,
      farbe: `diffuseColor.rgb *= 0.85 + 0.25 * nN(vW.xz * 400.0 + vW.y * 300.0);`,
    });
    const blattMat = blattMaterial(this.u, { rauheit: 0.55,
      attrib: "attribute float aSchw;",
      vertex: `if (aSchw > uWuchs) transformed *= 0.0; transformed *= uLaubR; transformed.y += sin(uZeit * 2.3 + float(gl_InstanceID) * 1.3) * 0.004 * uWindS;`,
      farbe: `diffuseColor.rgb *= mix(vec3(1.0), vec3(1.6, 1.25, 0.5), clamp(1.0 - uLaubR, 0.0, 1.0) * 0.8); diffuseColor.rgb *= 0.8 + 0.35 * nN(vW.xz * 300.0 + vW.y * 170.0);`,
    });
    const blueteMat = weltMat(std({ roughness: 0.72, vertexColors: true, side: THREE.DoubleSide }), this.u, {
      attrib: "attribute float aSchw; attribute float a1; varying float vA1;",
      vertex: `vA1 = a1; if (aSchw > uWuchs || uBluete < 0.02) transformed *= 0.0; transformed *= 0.3 + 0.7 * uBluete;`,
      farbe: `diffuseColor.rgb = mix(vec3(0.20, 0.36, 0.12), diffuseColor.rgb, smoothstep(0.15, 0.55, uBluete) * (1.0 - vA1 * 0.0));`,
    });
    blueteMat.onBeforeCompile = ((alt) => (sh) => { alt(sh); sh.fragmentShader = sh.fragmentShader.replace("varying vec3 vW;", "varying vec3 vW; varying float vA1;"); })(blueteMat.onBeforeCompile);
    const lausMat = std({ color: "#FFFFFF", vertexColors: true, roughness: 0.45, emissive: "#0E1A06" });
    // Geometrien: Fiederblatt (5 Blättchen), Blüte (gefüllte Rose aus Schalen), Blattlaus
    // Fiederblatt: Blattspindel + 5 gesägte Blättchen als Blattkarten (Form im Shader, BLATT_F)
    const fieder = (() => {
      const pos = [], nor = [], col = [], uvs = [], a1 = [];
      const blaettchen = (x, z, s, r, hex, k) => {
        const g = new THREE.PlaneGeometry(0.036 * s, 0.022 * s).toNonIndexed(); g.translate(0.018 * s, 0, 0); g.rotateX(-Math.PI / 2 + 0.22); g.rotateY(r); g.translate(x, 0, z); g.computeVertexNormals();
        const p = g.getAttribute("position"), n = g.getAttribute("normal"), uv = g.getAttribute("uv"), c = rgb(hex);
        for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(...c); uvs.push(uv.getX(i), uv.getY(i)); a1.push(hash(k, 333)); }
      };
      blaettchen(0.026, 0, 1.15, 0, "#3F7A2C", 0); blaettchen(0.016, 0.006, 0.95, 1.1, "#4A8432", 1); blaettchen(0.016, -0.006, 0.95, -1.1, "#4A8432", 2);
      blaettchen(0.0, 0.006, 0.8, 1.35, "#3C7228", 3); blaettchen(0.0, -0.006, 0.8, -1.35, "#3C7228", 4);
      const spindel = new THREE.CylinderGeometry(0.0008, 0.0012, 0.03, 3).toNonIndexed(); spindel.rotateZ(Math.PI / 2); spindel.translate(0.013, 0, 0); spindel.computeVertexNormals();
      const p = spindel.getAttribute("position"), n = spindel.getAttribute("normal"), c = rgb("#4A6A2A");
      for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(...c); uvs.push(0.5, 0.5); a1.push(0.5); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      g.setAttribute("aUv", new THREE.Float32BufferAttribute(uvs, 2)); g.setAttribute("a1", new THREE.Float32BufferAttribute(a1, 1));
      return g;
    })();
    const bluete = (() => {
      const t = [];
      const knospe = new THREE.SphereGeometry(0.011, 8, 6); knospe.scale(1, 1.25, 1); knospe.translate(0, 0.016, 0); t.push({ g: knospe, c: rgb("#9A1632"), a: 0 });
      // drei Kränze gewölbter Blütenblätter, innen aufrecht und dunkel, außen geöffnet und heller
      [[5, 0.007, 0.35, 0.02, 0.024, "#B01E3E"], [6, 0.012, 0.75, 0.026, 0.028, "#C82E4E"], [7, 0.016, 1.15, 0.03, 0.03, "#DA4A66"]].forEach(([n, r, kipp, w, h, f], ring) => {
        for (let i = 0; i < n; i++) {
          const b = new THREE.PlaneGeometry(w, h, 3, 3), q = b.getAttribute("position");
          for (let j = 0; j < q.count; j++) { const x = q.getX(j) / (w / 2), y = q.getY(j) / (h / 2); q.setX(j, q.getX(j) * (0.75 + 0.25 * (y + 1) / 2)); q.setZ(j, -0.22 * w * x * x + 0.06 * h * (y + 1) * (y + 1) * 0.25); }
          b.translate(0, h / 2, 0); b.rotateX(-kipp); b.translate(0, 0.004 + ring * 0.002, r); b.rotateY((i / n) * Math.PI * 2 + ring * 0.5);
          t.push({ g: b, c: (x, y) => rgb(f, 0.75 + 0.35 * Math.min(1, y / 0.03)), a: 0 });
        }
      });
      for (let i = 0; i < 5; i++) { const k = new THREE.PlaneGeometry(0.008, 0.022); k.translate(0, 0.011, 0); k.rotateX(-2.0); k.translate(0, 0.002, 0.006); k.rotateY(i * 1.2566); t.push({ g: k, c: rgb("#3A5A20"), a: 1 }); }
      return verschmelze(t);
    })();
    const laus = (() => { const k = new THREE.SphereGeometry(0.001, 8, 6); k.scale(1.25, 0.85, 0.95); const kopf = new THREE.SphereGeometry(0.00045, 6, 4); kopf.translate(0.0013, 0.0001, 0); const r1 = new THREE.CylinderGeometry(0.00012, 0.00014, 0.0008, 3); r1.rotateZ(1.1); r1.translate(-0.0011, 0.0006, 0.0004); const r2 = r1.clone(); r2.translate(0, 0, -0.0008); return verschmelze([{ g: k, c: rgb("#9CC048") }, { g: kopf, c: rgb("#7EA036") }, { g: r1, c: rgb("#3A4A1A") }, { g: r2, c: rgb("#3A4A1A") }]); })();
    for (const R of ROSEN) {
      const gruppe = new THREE.Group(); gruppe.position.set(R.x, hoehe(R.x, R.z) - 0.01, R.z); this.szene.add(gruppe);
      const triebe = [], stielTeile = [], blaetter = [], blueten = [];
      // Strauchrose: N Haupttriebe wachsen bogig nach außen (Trieb 0 und 1 zeigen zur Kamera, tragen die Blattläuse), je 2–3 Seitentriebe
      const N = 15, V = (x, y, z) => new THREE.Vector3(x, y, z);
      const belauben = (kurve, t0, t1, n, schw, k, dicht = 1) => {
        for (let j = 0; j < n; j++) {
          const tt = lerp(t0, t1, (j + 0.5) / n), P = kurve.getPointAt(tt), T = kurve.getTangentAt(tt), w = j * 2.4 + k * 1.7;
          const off = new THREE.Vector3(Math.cos(w), 0.15, Math.sin(w)); off.addScaledVector(T, -off.dot(T)).normalize();
          blaetter.push({ p: P.clone().addScaledVector(off, 0.008), r: Math.atan2(-off.z, off.x), rx: -0.35 + 0.5 * hash(j, k + 50), rz: 0.3 * (hash(j, k + 51) - 0.5), s: (0.85 + 0.5 * hash(j, k + 60)) * dicht, schw, c: 0.8 + 0.35 * hash(j, k + 70) });
        }
      };
      for (let k = 0; k < N; k++) {
        const a = k < 2 ? Math.PI / 2 + (k ? 0.75 : -0.6) : hash(k, R.seed) * 6.28 + k * 2.4;     // +z = zur Terrasse
        const lean = (k < 2 ? 0.75 : 0.35) + 0.4 * hash(k, R.seed + 1), h = (k < 2 ? 0.72 : 0.5) + 0.35 * hash(k, R.seed + 2), schw = k < 4 ? 0 : (k - 3) / (N - 3) * 0.9;
        const ca = Math.cos(a), sa = Math.sin(a), b0 = [0.035 * ca, 0, 0.035 * sa];
        const kurve = new THREE.CatmullRomCurve3([V(...b0), V(b0[0] + ca * lean * 0.12 * h, h * 0.42, b0[2] + sa * lean * 0.12 * h),
          V(b0[0] + ca * lean * 0.5 * h, h * 0.86, b0[2] + sa * lean * 0.5 * h), V(b0[0] + ca * lean * 0.95 * h, h * 0.98, b0[2] + sa * lean * 0.95 * h), V(b0[0] + ca * lean * 1.25 * h, h * 0.9, b0[2] + sa * lean * 1.25 * h)]);
        triebe.push({ kurve, schw, h });
        stielTeile.push({ g: new THREE.TubeGeometry(kurve, 22, 0.0058 - 0.001 * (k % 3), 6, false), c: (x, y) => rgb(y < 0.1 ? "#5A4A30" : y > h * 0.75 ? "#5A6A2A" : "#3E6626", 0.9 + 0.2 * hash(k, 5)), a: schw });
        belauben(kurve, 0.3, 0.98, 16, schw, k);
        blueten.push({ p: kurve.getPointAt(1).add(V(0, 0.012, 0)), s: 1.15, schw, rx: (hash(k, 82) - 0.5) * 0.6, rz: (hash(k, 83) - 0.5) * 0.6 });
        for (let j = 0; j < 3; j++) {                                                            // Seitentriebe mit Blüte
          const tt = 0.48 + 0.16 * j, P = kurve.getPointAt(tt), w = a + (j % 2 ? 0.9 : -0.9) + 0.4 * (hash(j, k + 90) - 0.5), l = 0.13 + 0.12 * hash(j, k + 91);
          const seit = new THREE.CatmullRomCurve3([P.clone(), P.clone().add(V(Math.cos(w) * l * 0.45, l * 0.55, Math.sin(w) * l * 0.45)), P.clone().add(V(Math.cos(w) * l, l * 0.75, Math.sin(w) * l))]);
          stielTeile.push({ g: new THREE.TubeGeometry(seit, 8, 0.0035, 5, false), c: rgb("#46702A"), a: schw });
          belauben(seit, 0.2, 0.95, 6, schw, k * 7 + j, 0.85);
          blueten.push({ p: seit.getPointAt(1).add(V(0, 0.01, 0)), s: 0.8 + 0.25 * hash(j, k), schw, rx: (hash(j, k + 84) - 0.5) * 0.8, rz: (hash(j, k + 85) - 0.5) * 0.8 });
        }
      }
      const stiel = new THREE.Mesh(verschmelze(stielTeile), stielMat); stiel.castShadow = this.schatten; stiel.receiveShadow = this.schatten; gruppe.add(stiel);
      const mk = (geo, mat, liste, farbe) => {
        const im = new THREE.InstancedMesh(geo, mat, liste.length), sch = new Float32Array(liste.length), c = new THREE.Color();
        liste.forEach((b, i) => { this._e.set(b.rx || 0, b.r || 0, b.rz || 0); this._q.setFromEuler(this._e); this._s.setScalar(b.s); im.setMatrixAt(i, this._m.compose(b.p, this._q, this._s)); sch[i] = b.schw;
          if (farbe) { c.setRGB(farbe * b.c, farbe * b.c, farbe * b.c); im.setColorAt(i, c); } });
        geo = geo.clone(); geo.setAttribute("aSchw", new THREE.InstancedBufferAttribute(sch, 1)); im.geometry = geo;
        im.castShadow = this.schatten; im.receiveShadow = this.schatten; im.frustumCulled = false; gruppe.add(im); this.vertices += geo.getAttribute("position").count * liste.length;
        return im;
      };
      mk(fieder, blattMat, blaetter, 1);
      mk(bluete, blueteMat, blueten, null);
      // Blattläuse an den Spitzen der Triebe 0 und 1 (nur Hauptrose)
      let laeuse = null;
      if (R === ROSEN[0]) {
        laeuse = new THREE.InstancedMesh(laus, lausMat, 160); laeuse.frustumCulled = false; gruppe.add(laeuse);
        this._lausPos = [];
        for (let i = 0; i < 160; i++) {
          const tr = triebe[i % 2], tt = 0.84 + 0.15 * Math.sqrt(hash(i, 301)), P = tr.kurve.getPointAt(tt), T = tr.kurve.getTangentAt(tt);
          const w = hash(i, 302) * 6.28, n = new THREE.Vector3(Math.cos(w), 0, Math.sin(w)); n.addScaledVector(T, -n.dot(T)).normalize();
          this._lausPos.push({ p: P.clone().addScaledVector(n, 0.0072), T: T.clone(), n, r: hash(i, 303) });
        }
      }
      this.rosen.push({ gruppe, triebe, laeuse, R });
    }
  }

  // ---------------------------------------------------------------- Hecke (Hainbuche, wächst)
  _hecke() {
    const geo = blattKarten(Math.round(85 * this.details), 7, { laenge: 0.3, breite: 0.19 });
    const mat = blattMaterial(this.u, {
      vertex: `{ vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); transformed += normal * sin(uZeit * 2.1 + wp.x * 1.7 + wp.y + a1 * 6.0) * 0.03 * uWindS; }`,
      farbe: /* glsl */ `
  vec3 c = uHecke * vColor.r * 1.1;
  c *= 0.75 + 0.35 * nN(vW.xy * 3.0 + vW.zz * 2.0);                                        // großflächige Schattierung
  c = mix(c, c * vec3(1.25, 1.1, 0.7), smoothstep(0.6, 0.9, nN(vW.xy * 1.3 + 7.0)) * 0.3);
  diffuseColor.rgb = c;` });
    this._heckeListe = [];
    // u = Lage entlang der Hecke, v = Höhe (0..1), d = Tiefe (−0,5 … 0,5; Front = 0,5), Oberseite: v = 1
    const front = (n, seed, art) => {
      for (let i = 0; i < n; i++) {
        const u = hash(i, seed), v = hash(i, seed + 1), w = hash(i, seed + 2), s = 0.16 + 0.12 * hash(i, seed + 3);
        if (i % 4 === 3) this._heckeListe.push({ art, u, v: 1, d: w - 0.5, s: s * 1.1 });
        else this._heckeListe.push({ art, u, v: Math.pow(v, 0.8), d: 0.47 + 0.05 * w, s });
      }
    };
    front(Math.round(1500 * this.details), 401, 0); front(Math.round(700 * this.details), 431, 1);
    this.hecke = new THREE.InstancedMesh(geo, mat, this._heckeListe.length);
    const c = new THREE.Color(); this._heckeListe.forEach((h, i) => { const g = 0.85 + 0.3 * hash(i, 451); c.setRGB(g, g, g); this.hecke.setColorAt(i, c); });
    this.hecke.castShadow = this.schatten; this.hecke.receiveShadow = this.schatten; this.hecke.frustumCulled = false; this.szene.add(this.hecke);
    this.vertices += geo.getAttribute("position").count * this._heckeListe.length;
    const kern = new THREE.BoxGeometry(1, 1, 1); kern.translate(0, 0.5, 0);
    const kMat = weltMat(std({ roughness: 0.95 }), this.u, { farbe: `diffuseColor.rgb = uHecke * 0.35 * (0.7 + 0.5 * nN(vW.xy * 20.0 + vW.zz * 13.0));` });
    this.heckeKern = [new THREE.Mesh(kern, kMat), new THREE.Mesh(kern, kMat)];
    for (const k of this.heckeKern) { k.castShadow = this.schatten; k.receiveShadow = this.schatten; this.szene.add(k); }
    this._heckeMasse = -1;
  }
  _heckeSetzen(jahre) {
    const H = 0.95 + 1.15 * smoothstep(0, 14, jahre), D = 0.55 + 0.5 * smoothstep(0, 18, jahre);
    if (Math.abs(H - this._heckeMasse) < 1e-4) return;
    this._heckeMasse = H;
    const m = this._m, q = this._q, s = this._s, p = this._p;
    this._heckeListe.forEach((h, i) => {
      const r = h.s * (0.85 + 0.35 * smoothstep(0, 14, jahre));
      if (h.art === 0) p.set(lerp(HECKE.x0, HECKE.x1, h.u), hoehe(0, HECKE.z) + h.v * H * 0.96 + 0.05, HECKE.z + D * h.d);
      else p.set(HECKE.links + D * h.d, hoehe(HECKE.links, 0) + h.v * H * 0.96 + 0.05, lerp(HECKE.lz0, HECKE.lz1, h.u));
      q.setFromAxisAngle(this._yAchse || (this._yAchse = new THREE.Vector3(0, 1, 0)), h.u * 40); s.set(r, r * 0.9, r);
      this.hecke.setMatrixAt(i, m.compose(p, q, s));
    });
    this.hecke.instanceMatrix.needsUpdate = true;
    const [a, b] = this.heckeKern;
    a.position.set(0, hoehe(0, HECKE.z), HECKE.z - 0.05); a.scale.set(HECKE.x1 - HECKE.x0 - 0.3, H * 0.95, D * 0.85);
    b.position.set(HECKE.links - 0.05, hoehe(HECKE.links, 0), (HECKE.lz0 + HECKE.lz1) / 2); b.scale.set(D * 0.85, H * 0.95, HECKE.lz1 - HECKE.lz0 - 0.2);
  }

  // ---------------------------------------------------------------- Apfelbaum (wächst, Jahreszeiten)
  _apfel() {
    const g = new THREE.Group(); g.position.set(APFEL.x, hoehe(APFEL.x, APFEL.z) - 0.02, APFEL.z); this.szene.add(g); this.apfel = g;
    const holz = weltMat(std({ roughness: 0.95, vertexColors: true }), this.u, { farbe: `diffuseColor.rgb *= 0.75 + 0.4 * nN(vec2(vW.y * 60.0, atan(vW.x - ${APFEL.x.toFixed(2)}, vW.z - (${APFEL.z.toFixed(2)})) * 8.0));` });
    const teile = [];
    const ast = (a, b, r0, r1) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B); const c = new THREE.CylinderGeometry(r1, r0, L, 7); c.translate(0, L / 2, 0); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize())); c.translate(...a); teile.push({ g: c, c: rgb("#5A4836") }); };
    ast([0, 0, 0], [0.05, 1.5, 0.02], 0.09, 0.06);
    const spitzen = [];
    for (let k = 0; k < 7; k++) { const w = k * 2.4 + 0.3, l = 0.9 + 0.5 * hash(k, 501), y0 = 1.1 + 0.35 * hash(k, 502), e = [Math.cos(w) * l, y0 + 0.6 + 0.4 * hash(k, 503), Math.sin(w) * l];
      ast([0.03, y0, 0.01], e, 0.045, 0.018); spitzen.push(e);
      for (let j = 0; j < 3; j++) { const w2 = w + (j - 1) * 0.7, f = [e[0] + Math.cos(w2) * 0.35, e[1] + 0.25 + 0.2 * hash(j, k), e[2] + Math.sin(w2) * 0.35]; ast(e, f, 0.016, 0.006); spitzen.push(f); } }
    const stamm = new THREE.Mesh(verschmelze(teile), holz); stamm.castShadow = this.schatten; stamm.receiveShadow = this.schatten; g.add(stamm);
    const krone = blattKarten(650, 77, { laenge: 0.14, breite: 0.085, innen: 0.75 });
    const kmat = blattMaterial(this.u, {
      vertex: `if (a1 > uCover * 1.02) transformed *= 0.0; transformed += normal * sin(uZeit * 2.0 + float(gl_InstanceID) + a1 * 9.0) * 0.02 * uWindS;`,
      farbe: /* glsl */ `
  vec3 c = uLaub * vColor.r * (0.8 + 0.3 * nN(vW.xy * 4.0 + vW.zz * 3.0));
  c = mix(c, vec3(0.97, 0.9, 0.92), uApfelB * step(0.45, vBA));
  diffuseColor.rgb = c;` });
    // Äpfel: kleine rote Kugeln zwischen den Blättern (sichtbar nach uAepfel)
    const apfelG = new THREE.SphereGeometry(0.035, 8, 6), aMat = weltMat(std({ color: "#B82A1C", roughness: 0.45 }), this.u, { vertex: `if (float(gl_InstanceID) / 40.0 > uAepfel) transformed *= 0.0;`, farbe: `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.75, 0.62, 0.15), smoothstep(-0.2, -0.8, vWN.y) * 0.6);` });
    const al = []; for (let i = 0; i < 40; i++) { const s = spitzen[i % spitzen.length]; al.push({ x: s[0] + 0.25 * (hash(i, 521) - 0.5), y: s[1] - 0.1 - 0.2 * hash(i, 522), z: s[2] + 0.25 * (hash(i, 523) - 0.5) }); }
    const ai = new THREE.InstancedMesh(apfelG, aMat, al.length); al.forEach((k, i) => { this._p.set(k.x, k.y, k.z); this._q.identity(); this._s.setScalar(1); ai.setMatrixAt(i, this._m.compose(this._p, this._q, this._s)); });
    ai.castShadow = this.schatten; ai.frustumCulled = false; g.add(ai);
    const kl = spitzen.map((p, i) => ({ x: p[0], y: p[1] + 0.05, z: p[2], s: 0.34 + 0.16 * hash(i, 511), r: i, c: [1, 1, 1] }));
    const im = new THREE.InstancedMesh(krone, kmat, kl.length);
    kl.forEach((k, i) => { this._q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), k.r); this._s.setScalar(k.s); this._p.set(k.x, k.y, k.z); im.setMatrixAt(i, this._m.compose(this._p, this._q, this._s)); });
    im.castShadow = this.schatten; im.receiveShadow = this.schatten; im.frustumCulled = false; g.add(im);
    // Pfahl mit Anbindung (junger Baum)
    const pfahl = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 6), std({ color: "#8A7254", roughness: 0.95 })); pfahl.position.set(-0.12, 0.8, 0.05); pfahl.castShadow = this.schatten; g.add(pfahl); this.pfahl = pfahl;
    // Baumscheibe
    const scheibe = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), weltMat(std({ roughness: 1 }), this.u, { farbe: `diffuseColor.rgb = vec3(0.10, 0.075, 0.05) * (0.7 + 0.5 * nN(vW.xz * 80.0));` }));
    scheibe.rotation.x = -Math.PI / 2; scheibe.position.y = 0.024; scheibe.receiveShadow = this.schatten; g.add(scheibe);
  }

  // ---------------------------------------------------------------- Gartenmöbel (drei Epochen)
  _moebel(plaetze) {
    const P = plaetze || { tisch: [1.6, 1.75], stuehle: [[0.95, 1.7, Math.PI / 2 + 0.15], [2.25, 1.8, -Math.PI / 2 - 0.1], [1.6, 2.4, Math.PI - 0.1]] };
    this.moebelSaetze = [];
    const kunst = std({ color: "#ECEBE6", roughness: 0.42 }), teak = weltMat(std({ color: "#9A6A3E", roughness: 0.7 }), this.u, { farbe: `diffuseColor.rgb *= 0.8 + 0.35 * nN(vec2(vW.x * 4.0 + vW.z * 4.0, vW.y * 300.0 + (vW.x - vW.z) * 300.0));` }),
      metall = std({ color: "#2E3134", roughness: 0.45, metalness: 0.6 }), stoff = std({ color: "#5A5F62", roughness: 0.9 });
    const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = this.schatten; b.receiveShadow = this.schatten; return b; };
    const zyl = (r0, r1, h, x, y, z, m, rx = 0, rz = 0) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 10), m); b.position.set(x, y, z); b.rotation.set(rx, 0, rz); b.castShadow = this.schatten; b.receiveShadow = this.schatten; return b; };
    const stuhl = (art) => {
      const g = new THREE.Group();
      if (art === 0) {            // Monoblock
        for (const [x, z] of [[-0.22, -0.2], [0.22, -0.2], [-0.21, 0.2], [0.21, 0.2]]) g.add(zyl(0.018, 0.026, 0.44, x, 0.22, z, kunst, z * 0.25, -x * 0.25));
        g.add(box(0.48, 0.03, 0.46, 0, 0.44, 0, kunst));
        const lehne = box(0.46, 0.4, 0.03, 0, 0.66, -0.22, kunst); lehne.rotation.x = -0.18; g.add(lehne);
        g.add(box(0.03, 0.03, 0.4, -0.24, 0.62, 0, kunst), box(0.03, 0.03, 0.4, 0.24, 0.62, 0, kunst));
      } else if (art === 1) {     // Teak
        for (const [x, z] of [[-0.21, -0.2], [0.21, -0.2], [-0.21, 0.2], [0.21, 0.2]]) g.add(box(0.04, 0.45, 0.04, x, 0.225, z, teak));
        for (let k = 0; k < 5; k++) g.add(box(0.46, 0.022, 0.07, 0, 0.45, -0.18 + k * 0.09, teak));
        for (let k = 0; k < 4; k++) { const l = box(0.44, 0.06, 0.02, 0, 0.56 + k * 0.1, -0.215, teak); g.add(l); }
        g.add(box(0.04, 0.5, 0.04, -0.21, 0.7, -0.215, teak), box(0.04, 0.5, 0.04, 0.21, 0.7, -0.215, teak));
      } else {                    // Metall-Lounge
        for (const [x, z] of [[-0.24, -0.22], [0.24, -0.22], [-0.24, 0.22], [0.24, 0.22]]) g.add(zyl(0.011, 0.011, 0.4, x, 0.2, z, metall));
        g.add(box(0.52, 0.025, 0.5, 0, 0.4, 0, stoff), box(0.54, 0.02, 0.02, 0, 0.4, 0.25, metall));
        const l = box(0.52, 0.36, 0.025, 0, 0.6, -0.24, stoff); l.rotation.x = -0.25; g.add(l);
        g.add(box(0.025, 0.025, 0.5, -0.27, 0.6, 0, metall), box(0.025, 0.025, 0.5, 0.27, 0.6, 0, metall));
      }
      return g;
    };
    const tisch = (art) => {
      const g = new THREE.Group();
      if (art === 0) { g.add(zyl(0.45, 0.45, 0.025, 0, 0.72, 0, kunst)); for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) g.add(zyl(0.02, 0.026, 0.71, x, 0.355, z, kunst)); }
      else if (art === 1) { for (let k = 0; k < 7; k++) g.add(box(1.2, 0.025, 0.105, 0, 0.73, -0.35 + k * 0.117, teak)); for (const [x, z] of [[-0.52, -0.33], [0.52, -0.33], [-0.52, 0.33], [0.52, 0.33]]) g.add(box(0.05, 0.72, 0.05, x, 0.36, z, teak)); }
      else { g.add(box(1.3, 0.03, 0.8, 0, 0.73, 0, metall)); for (const [x, z] of [[-0.6, -0.36], [0.6, -0.36], [-0.6, 0.36], [0.6, 0.36]]) g.add(box(0.035, 0.72, 0.035, x, 0.36, z, metall)); }
      return g;
    };
    for (let art = 0; art < 3; art++) {
      const satz = new THREE.Group();
      const t = tisch(art); t.position.set(P.tisch[0], TERRASSE.y, P.tisch[1]); satz.add(t);
      for (const [x, z, r] of P.stuehle) { const s = stuhl(art); s.position.set(x, TERRASSE.y, z); s.rotation.y = r; satz.add(s); }
      satz.visible = art === 0; this.szene.add(satz); this.moebelSaetze.push(satz);
    }
  }

  // ---------------------------------------------------------------- Deko: Terrakottatopf, Gießkanne
  _deko() {
    const topfMat = weltMat(std({ color: "#B4643A", roughness: 0.9 }), this.u, { farbe: `diffuseColor.rgb *= 0.8 + 0.3 * nN(vec2(atan(vW.x + 1.05, vW.z - 0.62) * 9.0, vW.y * 90.0)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.75, 0.72, 0.62), smoothstep(0.55, 0.8, nF(vW.xz * 40.0 + vW.y * 20.0)) * 0.35);` });
    const topf = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.28, 24, 1, true), topfMat); topf.position.set(-1.05, TERRASSE.y + 0.14, 0.62);
    const rand = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 6, 24), topfMat); rand.rotation.x = Math.PI / 2; rand.position.set(-1.05, TERRASSE.y + 0.28, 0.62);
    const erde = new THREE.Mesh(new THREE.CircleGeometry(0.165, 20), std({ color: "#2A1E14", roughness: 1 })); erde.rotation.x = -Math.PI / 2; erde.position.set(-1.05, TERRASSE.y + 0.26, 0.62);
    for (const o of [topf, rand, erde]) { o.castShadow = this.schatten; o.receiveShadow = this.schatten; this.szene.add(o); }
    const busch = klumpen(10, 31, { flach: 0.8 }), bmat = weltMat(std({ roughness: 0.8, vertexColors: true }), this.u, { farbe: `vec3 c = vec3(0.16, 0.34, 0.12) * vColor.r * (0.7 + 0.5 * nN(vW.xz * 60.0 + vW.y * 40.0)); c = mix(c, vec3(0.85, 0.12, 0.14), smoothstep(0.78, 0.86, nN(vW.xy * 40.0 + vW.zz * 23.0)) * uBluete); diffuseColor.rgb = c;` });
    const b = new THREE.Mesh(busch, bmat); b.scale.setScalar(0.2); b.position.set(-1.05, TERRASSE.y + 0.38, 0.62); b.castShadow = this.schatten; this.szene.add(b);
    this.topf = { x: -1.05, z: 0.62, r: 0.17 };
  }

  // ---------------------------------------------------------------- Hintergrund: Nachbarhäuser, Bäume
  _hintergrund() {
    const wand = weltMat(std({ color: "#E6DED0", roughness: 0.95 }), this.u, { farbe: /* glsl */ `
  vec2 q = vec2(vW.x + vW.z, vW.y);
  float fx = step(0.62, fract(q.x / 1.6)) * step(fract(q.x / 1.6), 0.92), fy = step(0.35, fract((q.y - 0.5) / 2.8)) * step(fract((q.y - 0.5) / 2.8), 0.78);
  diffuseColor.rgb = mix(diffuseColor.rgb * (0.9 + 0.1 * nN(q * 3.0)), vec3(0.12, 0.14, 0.17), fx * fy * step(0.5, abs(vWN.x) + abs(vWN.z)));`, schnee: false });
    const dach = weltMat(std({ color: "#8E3E2C", roughness: 0.8 }), this.u, { farbe: `diffuseColor.rgb *= 0.75 + 0.3 * step(0.5, fract(vW.y * 6.0)) * 0.6 + 0.2 * nN(vW.xz * 2.0);` });
    const haus = (x, z, b, t, h, ry) => {
      const g = new THREE.Group();
      const k = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), wand); k.position.y = h / 2; g.add(k);
      const f = new THREE.Shape(); f.moveTo(-t / 2 - 0.4, 0); f.lineTo(t / 2 + 0.4, 0); f.lineTo(0, t * 0.45); f.closePath();
      const d = new THREE.Mesh(new THREE.ExtrudeGeometry(f, { depth: b + 0.6, bevelEnabled: false }), dach); d.rotation.y = Math.PI / 2; d.position.set(-b / 2 - 0.3, h, 0); g.add(d);
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), std({ color: "#5A5050" })); s.position.set(b * 0.25, h + t * 0.35, 0); g.add(s);
      g.position.set(x, hoehe(x, z), z); g.rotation.y = ry; g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = this.schatten; } }); this.szene.add(g);
    };
    haus(-10, -27, 10, 8, 5.6, 0.04); haus(9, -31, 9, 9, 6.0, -0.06); haus(-27, -34, 11, 8, 5.4, 0.1); haus(25, -30, 10, 8, 5.8, -0.15);
    const krone = blattKarten(340, 13, { laenge: 0.13, breite: 0.08, innen: 0.55 });          // Blattkarten: keine facettierten Klumpen am Horizont
    const kmat = blattMaterial(this.u, { vertex: `if (a1 > mix(0.25, 1.02, uCover)) transformed *= 0.0;`, farbe: `vec3 c = mix(uLaub, uHecke, 0.3) * vColor.r * (0.75 + 0.35 * nN(vW.xy * 1.5 + vW.zz)); diffuseColor.rgb = mix(c, vec3(0.3, 0.26, 0.22) * vColor.r, (1.0 - uCover) * 0.7);` });
    const liste = [];
    for (let i = 0; i < 70; i++) {
      const x = lerp(-40, 40, hash(i, 601)), z = lerp(-9, -45, hash(i, 602) ** 0.7);
      if (Math.abs(x + 10) < 6.5 && Math.abs(z + 27) < 5) continue; if (Math.abs(x - 9) < 6 && Math.abs(z + 31) < 5.5) continue;
      const s = 2.2 + 2.5 * hash(i, 603);
      liste.push({ x, y: hoehe(x, z) + s * 1.3, z, s, sy: s * 1.15, r: hash(i, 604) * 6, c: [0.8 + 0.3 * hash(i, 605), 1, 1] });
    }
    this.baeume = this._inst(krone, kmat, liste, { cast: false });          // Kulisse wirft keine Schatten (sonst liegt die Terrasse am Abend im Schatten)
    const st = new THREE.CylinderGeometry(0.15, 0.25, 1, 6); st.translate(0, 0.5, 0);
    this._inst(st, std({ color: "#4A3C30" }), liste.map((l) => ({ x: l.x, y: hoehe(l.x, l.z), z: l.z, sx: l.s * 0.6, sy: l.s * 1.4, sz: l.s * 0.6 })), { cast: false });
  }

  // ---------------------------------------------------------------- Herbstlaub auf Terrasse und Rasen
  _laub() {
    const g = new THREE.PlaneGeometry(0.05, 0.035, 2, 1); { const p = g.getAttribute("position"); for (let i = 0; i < p.count; i++) p.setZ(i, 0.006 * Math.abs(p.getX(i)) / 0.025); } g.rotateX(-Math.PI / 2);
    const mat = weltMat(std({ roughness: 0.8, side: THREE.DoubleSide }), this.u, {
      vertex: `if (float(gl_InstanceID) / 520.0 > uLaubBoden || uSchnee > 0.5) transformed *= 0.0;`,
      farbe: `diffuseColor.rgb *= 0.75 + 0.4 * nN(vW.xz * 200.0);`, schnee: false });
    const liste = [], farben = ["#B8742A", "#9A4E22", "#C89A3A", "#7A5A2A", "#A86A30"];
    for (let i = 0; i < 520; i++) {
      const auf = hash(i, 701) < 0.45, x = lerp(-3, 3, hash(i, 702)), z = auf ? lerp(0.02, 2.9, hash(i, 703)) : lerp(-2.4, KIES.z1, hash(i, 703) ** 0.6);
      const c = rgb(farben[i % 5], 0.8 + 0.3 * hash(i, 704));
      liste.push({ x, y: hoehe(x, z) + (auf ? 0.002 : 0.03), z, r: hash(i, 705) * 6.28, rx: (hash(i, 706) - 0.5) * 0.4, s: 0.7 + 0.6 * hash(i, 707), c });
    }
    this.laubBoden = this._inst(g, mat, liste, { recv: true });
  }

  // ---------------------------------------------------------------- Sandhäufchen an den Fugen
  _sandHaufen() {
    const prof = []; for (let k = 0; k <= 14; k++) { const r = k / 14 * 1.15; prof.push(new THREE.Vector2(r, 0.55 * Math.exp(-((r / 0.55) ** 2)) - 0.16 * Math.exp(-((r / 0.14) ** 2)))); }
    const g = new THREE.LatheGeometry(prof.reverse(), 28); { const p = g.getAttribute("position"); for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), f = 1 + 0.28 * (vn(x * 4 + 3, z * 4) - 0.5); p.setX(i, x * f); p.setZ(i, z * f); p.setY(i, p.getY(i) * (0.85 + 0.3 * vn(x * 6, z * 6 + 2))); } } g.computeVertexNormals();
    const mat = weltMat(std({ color: "#BBA47C", roughness: 1, side: THREE.DoubleSide }), this.u, { farbe: `diffuseColor.rgb *= 0.7 + 0.45 * nN(vW.xz * 2600.0 + vW.y * 1900.0); diffuseColor.rgb *= 0.85 + 0.2 * nN(vW.xz * 700.0);` });
    const T = TERRASSE, pl = [];
    // Häufchen in den Fugen um das Nest: Längsfuge x = 0 und Querfugen z = 0 / 0,5 sowie Nachbarfugen
    const kand = [[0, 0.21, 0.016], [0, 0.31, 0.012], [0, 0.07, 0.011], [0.13, 0.5, 0.012], [-0.18, 0.5, 0.01], [0.5, 0.36, 0.011], [-0.5, 0.18, 0.012], [0, 0.66, 0.01], [0.28, 0.0035, 0.009], [-0.36, 0.0035, 0.01], [-0.5, 0.71, 0.009], [0.5, 0.82, 0.01]];
    kand.forEach(([x, z, r], i) => pl.push({ x, z, r, schw: i / kand.length }));
    this.fugenPunkte = pl.map((h) => [h.x, T.y, h.z]);
    this._sandListe = pl;
    this.sand = new THREE.InstancedMesh(g, mat, pl.length); this.sand.frustumCulled = false; this.sand.receiveShadow = this.schatten; this.szene.add(this.sand);
    this._sandWert = -1;
  }
  _sandSetzen(s) {
    if (Math.abs(s - this._sandWert) < 1e-4) return; this._sandWert = s;
    this._sandListe.forEach((h, i) => {
      const a = clamp((s - h.schw * 0.8) / 0.25), r = h.r * Math.sqrt(a) * (0.6 + 0.4 * s);
      this._p.set(h.x, FUGE_Y, h.z); this._q.setFromAxisAngle(this._yAchse || (this._yAchse = new THREE.Vector3(0, 1, 0)), i * 1.3); this._s.set(r * 1.7, r * 1.25, r * 1.4);
      this.sand.setMatrixAt(i, this._m.compose(this._p, this._q, this._s));
    });
    this.sand.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- Hummeln
  _hummeln() {
    const k = new THREE.SphereGeometry(0.009, 8, 6); k.scale(1.3, 1, 1);
    const fl = new THREE.PlaneGeometry(0.012, 0.007); fl.rotateX(-Math.PI / 2); fl.translate(0, 0.008, 0.008); const fl2 = fl.clone(); fl2.scale(1, 1, -1);
    const geo = verschmelze([{ g: k, c: (x) => (x > 0.004 ? rgb("#1A1612") : x > -0.002 ? rgb("#D8A824") : x > -0.007 ? rgb("#1A1612") : rgb("#E8E2D0")) }, { g: fl, c: rgb("#DDE4EA"), a: 1 }, { g: fl2, c: rgb("#DDE4EA"), a: 1 }]);
    const mat = weltMat(std({ roughness: 0.7, vertexColors: true, side: THREE.DoubleSide }), this.u, { attrib: "attribute float a1;", vertex: `transformed.y += a1 * sin(uZeit * 170.0 + float(gl_InstanceID) * 2.0) * 0.006;`, schnee: false });
    this.hummelnMesh = new THREE.InstancedMesh(geo, mat, 3); this.hummelnMesh.frustumCulled = false; this.hummelnMesh.castShadow = this.schatten; this.szene.add(this.hummelnMesh);
  }
  _hummelnSetzen(t, an) {
    this.hummelnMesh.visible = an > 0.02;
    if (!this.hummelnMesh.visible) return;
    const ziele = [[ROSE.x, 0.75, ROSE.z], [BEET.x0 + 1.0, 0.35, BEET.z1 - 0.3], [BEET.x1 - 0.8, 0.38, BEET.z1 - 0.3]];
    for (let i = 0; i < 3; i++) {
      const bahn = (tt) => { const z = ziele[(i + Math.floor(tt / 5 + i * 0.37)) % 3], w = tt * (0.6 + 0.2 * i) + i * 2;
        return [z[0] + 0.35 * Math.sin(w) + 0.08 * Math.sin(tt * 3.7 + i), z[1] + 0.12 * Math.sin(w * 1.3 + i) + 0.03 * Math.sin(tt * 7 + i), z[2] + 0.25 * Math.cos(w * 0.9)]; };
      const a = bahn(t), b = bahn(t + 0.05);
      this._e.set(0, Math.atan2(-(b[2] - a[2]), b[0] - a[0]), 0); this._q.setFromEuler(this._e); this._s.setScalar(an); this._p.set(...a);
      this.hummelnMesh.setMatrixAt(i, this._m.compose(this._p, this._q, this._s));
    }
    this.hummelnMesh.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- Wachstum
  _wachstum(jahre) {
    const w = smoothstep(-1, 11, jahre);                                       // Rosen: 0 = junge Pflanze, 1 = Strauch
    for (const r of this.rosen) { const s = r.R.s * (0.55 + 0.5 * w); r.gruppe.scale.setScalar(s); }
    this.u.uWuchs.value = 0.15 + 0.85 * w;
    const a = 0.36 + 0.64 * smoothstep(0, 22, jahre);
    this.apfel.scale.setScalar(a);
    this.pfahl.visible = jahre < 6;
    this._heckeSetzen(jahre);
  }
  _laeuseSetzen(anteil) {
    const L = this.rosen[0].laeuse; if (!L) return;
    const n = Math.round(160 * clamp(anteil)); L.count = n;
    const inv = 1 / this.rosen[0].gruppe.scale.x;
    for (let i = 0; i < n; i++) {
      const l = this._lausPos[i];
      this._q.setFromUnitVectors(this._xAchse || (this._xAchse = new THREE.Vector3(1, 0, 0)), l.T); this._s.setScalar(inv * (0.8 + 0.5 * l.r));
      L.setMatrixAt(i, this._m.compose(l.p, this._q, this._s));
    }
    L.instanceMatrix.needsUpdate = true;
  }

  /** Punkte am Haupttrieb der Hauptrose (Fuß → Blattläuse), Weltkoordinaten, für die Ameisenstraße */
  rosenPfad(jahre = 0, n = 10) {
    this._wachstum(jahre); this.rosen[0].gruppe.updateMatrixWorld(true);
    const tr = this.rosen[0].triebe[0], M = this.rosen[0].gruppe.matrixWorld, out = [];
    for (let k = 0; k <= n; k++) {
      const tt = (k / n) * 0.86, P = tr.kurve.getPointAt(tt), T = tr.kurve.getTangentAt(tt);
      const nn = new THREE.Vector3(0, 0, 1).addScaledVector(T, -T.z).normalize();          // Seite zur Kamera
      const w = P.clone().addScaledVector(nn, 0.0068).applyMatrix4(M);
      out.push({ p: [w.x, w.y, w.z], n: [nn.x, nn.y, nn.z] });
    }
    return out;
  }
  /** Ameisenstraßen (Punktlisten mit Normalen) für engine/ameisen.js */
  strassen(jahre = 0) {
    const T = TERRASSE, F = FUGE_Y, up = [0, 1, 0], vorn = [0, 0, -1];
    const P = (x, y, z, n = up) => ({ p: [x, y, z], n });
    const BO = T.y - T.dicke;                                                    // Oberkante Tiefbord (Absatz 8 mm vor der Platte)
    const hinab = (x) => [P(x, F, 0.008), P(x, T.y - 0.012, 0.0028, vorn), P(x, BO + 0.0012, 0.0, up), P(x + 0.003, BO - 0.012, -0.0058, vorn), P(x + 0.008, 0.035, -0.0058, vorn), P(x + 0.01, hoehe(x, -0.03) + 0.004, -0.03)];
    const kante = [P(NEST.x, F, NEST.z), ...hinab(NEST.x)];
    const rasen = [];
    for (let k = 1; k <= 14; k++) {
      const f = k / 14, x = lerp(0.012, ROSE.x + 0.04, f) + 0.22 * Math.sin(f * 3.1) * (1 - f), z = lerp(-0.03, ROSE.z + 0.06, f);
      rasen.push(P(x, hoehe(x, z) + 0.003, z));
    }
    const rose = this.rosenPfad(jahre);
    const s0 = [...kante, ...rasen, ...rose];
    const s1 = [P(NEST.x, F, NEST.z), P(NEST.x, F, 0.004), P(0.02, T.y + 0.0004, 0.003)];
    for (let k = 1; k <= 12; k++) { const x = lerp(0.02, 2.2, k / 12); s1.push(P(x, T.y + 0.0004, 0.006 + 0.004 * Math.sin(k))); }
    s1.push(P(2.22, T.y + 0.0004, 0.004), ...hinab(2.25).slice(1));
    const a = this.apfel.scale.x, rz = APFEL.z + 0.09 * a + 0.003;
    for (let k = 1; k <= 8; k++) { const f = k / 8, x = lerp(2.27, APFEL.x, f), z = lerp(-0.03, rz + 0.01, f); s1.push(P(x, hoehe(x, z) + 0.003, z)); }
    s1.push(P(APFEL.x, 0.08, rz, [0, 0, 1]), P(APFEL.x + 0.005, 1.3 * a, APFEL.z + 0.065 * a + 0.003, [0, 0, 1]));
    const s2 = [P(NEST.x, F, NEST.z), P(NEST.x, F, 0.5), P(-0.25, F, 0.5), P(-0.5, F, 0.5), P(-0.5, F, 0.62), P(-0.85, T.y + 0.0004, 0.62), P(this.topf.x + 0.17, T.y + 0.0004, this.topf.z)];
    return [{ name: "rose", punkte: s0 }, { name: "kante", punkte: s1 }, { name: "fuge", punkte: s2 }];
  }

  /** Zustand je Bild (alles Funktion von t und den Parametern, siehe Kopf) */
  setze(t, kamera, { zustand = null, jahre = 0, wind = 1, sand = 0, loch = 0, blattlaeuse = 0, moebel = 0, hummeln = 1 } = {}) {
    const u = this.u, Z = zustand || jahreszeit(0.55);
    u.uZeit.value = t; u.uWindS.value = wind; u.uSchnee.value = Z.schnee; u.uSand.value = sand; u.uLoch.value = loch;
    u.uLaubR.value = Z.rosenLaub; u.uBluete.value = Z.bluete; u.uCover.value = Z.cover; u.uApfelB.value = Z.apfelBluete; u.uAepfel.value = Z.aepfel;
    u.uLaubBoden.value = Z.laubBoden; u.uKalt.value = Z.kalt;
    u.uGras.value.copy(Z.gras); u.uGras2.value.copy(Z.gras2); u.uHecke.value.copy(Z.hecke); u.uLaub.value.copy(Z.laub);
    this._wachstum(jahre);
    this._sandSetzen(sand);
    this._laeuseSetzen(blattlaeuse * Z.rosenLaub);
    const m = Math.round(clamp(moebel, 0, 2)); this.moebelSaetze.forEach((s, i) => (s.visible = i === m));
    this._hummelnSetzen(t, hummeln * smoothstep(0.2, 0.5, Z.bluete) * (1 - Z.schnee));
    return this;
  }
}
