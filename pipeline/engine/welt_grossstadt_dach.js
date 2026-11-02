// Grundwelt „Großstadt-Dach“ (Account 2 @stelldirvor.pov, .claude/skills/stelldirvor-video/themen-und-plan.md §3) – NUR für den Baukasten Lunar-POV.
// Blick von der Dachterrasse eines Hochhauses über eine Großstadt am Wasser: Straßenraster, Hochhäuser mit Dächern,
// Dachaufbauten und Fensterreihen (Fenster als Shader in echter Größe, Licht in Fenstern), Wahrzeichen-Turm (Silhouette wie CN Tower),
// Stadion-Kuppel, Straßenbäume und Parks, See/Hafen mit bewegtem Wasser und Sonnenglanz, Boote, Autos, Menschen auf Straßen und Dächern,
// Möwen, Dampf aus Dächern. Jahreszeiten und Wetter über Uniforms: Schnee (Dächer, Boden, Bäume), Schneedecke (Kappen), Eis auf dem See,
// kahle Bäume, Fensterlicht. Alles ist eine Funktion von t (feste Seeds), kein Zustand zwischen Bildern.
//
// Nutzung (Muster: projekte/a2-eiszeit-toronto/szene.js):
//   const stadt = new GrossstadtDach(szene, { ...TORONTO_HAFEN, sonne: SONNE_RICHTUNG, schatten: true });
//   stadt.setze(t, kamera, { schnee, schneeTiefe, seeEis, herbst, kahl, fensterLicht, himmel, sonneFarbe, versenkt: (x, z) => 0..1 });
//   stadt.puffs(t) → Dampf-Puffs (in die gemeinsame Puffs-Instanz der Szene)
// Koordinaten: Kamera (Auge) bei x = 0, z = 0 auf dem Dach (Höhe dachHoehe), Blick nach −z. Boden y = 0, Wasser y = −0,8.
import * as THREE from "three";
import { clamp, smoothstep, hash } from "./bewegung.js";
import { Menschen, Autos, Voegel, puffStrahl } from "./stil_lunar_pov.js";

const h2 = (a, b, s) => hash((a | 0) * 7919 + (b | 0) * 104729 + 13, s);

/** Voreinstellung: Toronto, Dachterrasse am Hafen (Port Lands), Blick nach Nordwesten über Innenstadt und CN Tower, links der Ontariosee. */
export const TORONTO_HAFEN = {
  dachHoehe: 150,
  raster: { px: 112, pz: 92, ox: 46, oz: 30, strasse: 15, avenue: 24, avenueJede: 4 },
  ufer: { a: 20, b: 0.16, c: 90, f: 0.0011 },                // Wasser bei x < a + b·z + c·sin(f·z)
  turm: { x: -255, z: -2950 },                                   // CN Tower (553 m)
  kuppel: { x: -330, z: -3330, r: 105 },                         // Stadion-Kuppel (Rogers Centre)
  zentren: [                                                      // Hochhausfelder: Mitte, Radius, Höhe
    { x: 160, z: -3350, r: 650, h: [110, 290] },                  // Bankenviertel
    { x: -300, z: -3950, r: 420, h: [90, 230] },                  // Wohntürme am Ufer
    { x: 260, z: -1500, r: 500, h: [60, 150] },                   // East Bayfront / St. Lawrence
    { x: 380, z: -9800, r: 700, h: [80, 175] },                   // Midtown
    { x: 2300, z: -16500, r: 800, h: [90, 180] },                 // North York
  ],
  nahFern: 7000, maxFern: 16000,
  nachbarn: [{ x: 30, z: -300, w: 32, d: 28, h: 100, typ: 0, farbe: 0.35 }, { x: -78, z: -385, w: 28, d: 32, h: 90, typ: 2, farbe: 0.2 }, { x: 72, z: -440, w: 36, d: 30, h: 82, typ: 1, farbe: 0.6 }],
};

// --------------------------------------------------------------------------------------------- GLSL-Bausteine
const GLSL_HASH = /* glsl */ `
float lpH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float lpN(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(lpH(i), lpH(i + vec2(1.0, 0.0)), u.x), mix(lpH(i + vec2(0.0, 1.0)), lpH(i + vec2(1.0, 1.0)), u.x), u.y); }
float lpF(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * lpN(p); p *= 2.03; a *= 0.5; } return s; }
`;
const uferGLSL = (u) => `float lpUfer(float z) { return ${u.a.toFixed(3)} + ${u.b.toFixed(5)} * z + ${u.c.toFixed(3)} * sin(${u.f.toFixed(6)} * z); }`;

/** Gemeinsame Uniforms der Welt (Jahreszeit, Licht) */
function weltUniforms() {
  return {
    uSchnee: { value: 0 }, uTiefe: { value: 0 }, uLicht: { value: 0.08 }, uHerbst: { value: 0 }, uKahl: { value: 0 }, uZeit: { value: 0 },
    uSchneeFarbe: { value: new THREE.Color("#EEF2F6") }, uHimmel: { value: new THREE.Color("#B8C4D2") }, uSeeEis: { value: 0 },
  };
}

/** Vertex-Zusatz: Weltposition, Weltnormale, Instanz-Mitte und -Größe (für Fenster, Dachkanten, Schnee) */
function vertexWelt(sh, extra = "") {
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", `#include <common>
varying vec3 vLpW; varying vec3 vLpN; varying vec3 vLpC; varying vec3 vLpS; varying float vLpI;
${extra.split("@")[0] || ""}`)
    .replace("#include <project_vertex>", `#include <project_vertex>
#ifdef USE_INSTANCING
  vec4 lpW = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
  vLpN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
  vLpC = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vLpS = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vLpI = float(gl_InstanceID);
#else
  vec4 lpW = modelMatrix * vec4(transformed, 1.0);
  vLpN = normalize(mat3(modelMatrix) * objectNormal);
  vLpC = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; vLpS = vec3(1.0); vLpI = 0.0;
#endif
  vLpW = lpW.xyz;
${extra.split("@")[1] || ""}`);
}
function fragmentKopf(sh, u, extra = "") {
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vLpW; varying vec3 vLpN; varying vec3 vLpC; varying vec3 vLpS; varying float vLpI;
uniform float uSchnee, uTiefe, uLicht, uHerbst, uKahl, uZeit, uSeeEis; uniform vec3 uSchneeFarbe, uHimmel;
${GLSL_HASH}
${extra}`);
  Object.assign(sh.uniforms, u);
}

// --------------------------------------------------------------------------------------------- Gebäude-Material
// Typ (Attribut lpTyp): 0 Beton/Putz mit Lochfenstern, 1 Glasfassade, 2 Backstein, 3 Technik (ohne Fenster), 4 Schnee-Kappe
function gebaeudeMaterial(u) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.0, flatShading: true });
  m.onBeforeCompile = (sh) => {
    vertexWelt(sh, "attribute float lpTyp; varying float vLpTyp;@vLpTyp = lpTyp;");
    fragmentKopf(sh, u, "varying float vLpTyp;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
  vec3 lpN3 = normalize(vLpN);
  float lpOben = step(0.6, lpN3.y);
  float lpTyp = floor(vLpTyp + 0.5);
  float lpSeed = lpH(vLpC.xz * 0.013 + vLpI * 0.17);
  float lpFenster = 0.0, lpLeucht = 0.0, lpRahmen = 0.0;
  vec3 lpLokal = (vLpW - vLpC) / max(vLpS, vec3(0.01));        // x,z in −0,5..0,5, y in 0..1
  float lpSchneeAnteil = 0.0;
  if (lpTyp < 3.5) {
    if (lpOben > 0.5) {
      // Dach: Kies/Bitumen, Rand (Attika) dunkler, Luken
      vec2 lpRand = (0.5 - abs(lpLokal.xz)) * vLpS.xz;
      float attika = 1.0 - step(0.9, min(lpRand.x, lpRand.y));
      float kies = 0.88 + 0.16 * lpN(vLpW.xz * 0.9);
      diffuseColor.rgb = mix(vec3(0.36, 0.36, 0.35), vec3(0.30, 0.38, 0.27), step(0.84, lpSeed) * step(lpTyp, 1.5)) * kies;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.61, 0.58), attika);
      lpSchneeAnteil = uSchnee * (0.8 + 0.2 * lpN(vLpW.xz * 0.2));
    } else if (lpTyp < 3.5) {
      vec2 f = abs(lpN3.x) > abs(lpN3.z) ? vec2(vLpW.z, vLpW.y) : vec2(vLpW.x, vLpW.y);
      float teilung = lpTyp < 0.5 ? (2.6 + 1.2 * lpSeed) : (lpTyp < 1.5 ? 1.55 : 2.3);
      float geschoss = lpTyp < 1.5 ? 3.6 : 3.2;
      vec2 zelle = vec2(f.x / teilung, (vLpW.y - vLpC.y) / geschoss);
      vec2 g = fract(zelle);
      vec2 fw = fwidth(zelle);
      float aa = clamp(1.0 - max(fw.x, fw.y) * 2.2, 0.0, 1.0);    // ferne Fassaden: Mittelwert statt Flimmern
      float bx = lpTyp < 0.5 ? 0.20 : (lpTyp < 1.5 ? 0.05 : 0.24);
      float by = lpTyp < 0.5 ? 0.30 : (lpTyp < 1.5 ? 0.10 : 0.28);
      float fen = smoothstep(bx - fw.x, bx, g.x) * (1.0 - smoothstep(1.0 - bx * 0.6, 1.0 - bx * 0.6 + fw.x, g.x)) * smoothstep(by - fw.y, by, g.y) * (1.0 - smoothstep(0.92, 0.92 + fw.y, g.y));
      float sockel = step(lpLokal.y * vLpS.y, 5.0);             // Erdgeschoss: Schaufenster
      float dachrand = step(vLpS.y - 1.4, lpLokal.y * vLpS.y);  // Attika ohne Fenster
      fen *= (1.0 - dachrand);
      float mittel = lpTyp < 0.5 ? 0.42 : (lpTyp < 1.5 ? 0.8 : 0.38);
      lpFenster = mix(mittel, fen, aa);
      vec2 zid = floor(zelle) + floor(vLpC.xz * 0.37);
      float an = step(lpH(zid + lpSeed * 17.0), uLicht * (0.6 + 0.8 * lpSeed));
      lpLeucht = an * fen * aa + uLicht * 0.25 * (1.0 - aa) + sockel * 0.35 * uLicht;
      // Fassade: Geschossbänder und Pfeiler
      float band = smoothstep(0.0, 0.06, g.y) * (1.0 - smoothstep(0.96, 1.0, g.y));
      diffuseColor.rgb *= mix(0.9, 1.0, mix(0.5, band, aa));
      // Glas: dunkel mit Himmelsspiegelung (Fresnel)
      vec3 V = normalize(cameraPosition - vLpW);
      float fr = pow(1.0 - clamp(abs(dot(V, lpN3)), 0.0, 1.0), 3.0);
      vec3 glas = mix(vec3(0.06, 0.08, 0.10), uHimmel * 0.75, 0.25 + 0.6 * fr + 0.15 * lpN(zid * 0.7));
      diffuseColor.rgb = mix(diffuseColor.rgb, glas, lpFenster);
      lpSchneeAnteil = uSchnee * 0.12 * (1.0 - lpFenster) + uTiefe * 0.25 * step(0.97, g.y) * aa * (1.0 - lpFenster);
    }
  } else if (lpTyp < 4.5) {
    diffuseColor.rgb = uSchneeFarbe;                           // Schnee-Kappe
  } else {
    diffuseColor.rgb *= 0.95;                                  // Technik
    lpSchneeAnteil = uSchnee * lpOben * 0.9;
  }
  diffuseColor.rgb = mix(diffuseColor.rgb, uSchneeFarbe, clamp(lpSchneeAnteil, 0.0, 1.0));`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  totalEmissiveRadiance += vec3(1.0, 0.66, 0.34) * lpLeucht * 0.6 + uHimmel * lpFenster * 0.1;`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, 0.25, lpFenster);`);
  };
  return m;
}

// --------------------------------------------------------------------------------------------- Boden (Straßenraster, Parks, Ufer)
function bodenMaterial(u, R, ufer) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    vertexWelt(sh);
    fragmentKopf(sh, u, uferGLSL(ufer) + `
float lpStr(float k, float p, float o, float w, float wa, float jede, out float fw) {
  float q = (k - o) / p; float id = floor(q); float f = fract(q) * p; fw = fwidth(k) * 1.5;
  float breit = mod(id, jede) < 0.5 ? wa : w;
  return 1.0 - smoothstep(breit * 0.5 - fw, breit * 0.5 + fw, min(f, p - f));
}`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
  float dU = vLpW.x - lpUfer(vLpW.z);
  if (dU < 0.0) discard;
  float fwx, fwz;
  float sx = lpStr(vLpW.x, ${R.px.toFixed(1)}, ${R.ox.toFixed(1)} + ${R.px.toFixed(1)} * 0.5, ${R.strasse.toFixed(1)}, ${R.avenue.toFixed(1)}, ${R.avenueJede.toFixed(1)}, fwx);
  float sz = lpStr(vLpW.z, ${R.pz.toFixed(1)}, ${R.oz.toFixed(1)} + ${R.pz.toFixed(1)} * 0.5, ${R.strasse.toFixed(1)}, ${R.avenue.toFixed(1)}, ${R.avenueJede.toFixed(1)}, fwz);
  float strasse = max(sx, sz);
  vec2 blk = floor((vLpW.xz - vec2(${R.ox.toFixed(1)}, ${R.oz.toFixed(1)})) / vec2(${R.px.toFixed(1)}, ${R.pz.toFixed(1)}));
  float park = step(lpH(blk * 1.31 + 4.0), 0.0);
  float fern = clamp(max(fwx, fwz) / 30.0, 0.0, 1.0);
  vec3 block = mix(vec3(0.43, 0.42, 0.40), vec3(0.24, 0.32, 0.18), park);
  block *= 0.85 + 0.25 * lpN(vLpW.xz * 0.05);
  vec3 grauGruen = mix(vec3(0.36, 0.37, 0.33), vec3(0.27, 0.33, 0.22), 0.45 + 0.4 * lpF(vLpW.xz * 0.0006));
  vec3 asphalt = vec3(0.20, 0.205, 0.21);
  vec3 c = mix(block, asphalt, strasse);
  c = mix(c, grauGruen, smoothstep(0.15, 0.9, fern));
  c = mix(c, vec3(0.55, 0.53, 0.49), 1.0 - smoothstep(4.0, 9.0, dU));   // Kaimauer
  float schnee = uSchnee * mix(1.0, smoothstep(0.45, 0.85, uTiefe), strasse * (1.0 - fern));
  diffuseColor.rgb = mix(c, uSchneeFarbe * (0.93 + 0.07 * lpN(vLpW.xz * 0.03)), clamp(schnee, 0.0, 1.0));`);
  };
  return m;
}

// --------------------------------------------------------------------------------------------- Wasser (Wellen, Sonnenglanz, Eis)
const WASSER_V = /* glsl */ `
varying vec3 vW;
#include <fog_pars_vertex>
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const wasserF = (ufer) => /* glsl */ `
uniform float zeit, eis, schnee, schneeLuft; uniform vec3 tief, himmel, sonneDir, sonneFarbe, eisFarbe, schneeFarbe;
varying vec3 vW;
#include <fog_pars_fragment>
${GLSL_HASH}
${uferGLSL(ufer)}
vec2 welle(vec2 p, float t, float amp) {
  vec2 g = vec2(0.0);
  vec2 d1 = normalize(vec2(0.7, 0.71)), d2 = normalize(vec2(-0.35, 0.94)), d3 = normalize(vec2(0.95, -0.3)), d4 = normalize(vec2(0.2, 0.98));
  g += d1 * 0.30 * cos(dot(p, d1) * 0.16 + t * 1.25);
  g += d2 * 0.22 * cos(dot(p, d2) * 0.27 + t * 1.7);
  g += d3 * 0.16 * cos(dot(p, d3) * 0.49 + t * 2.3);
  g += d4 * 0.10 * cos(dot(p, d4) * 0.93 + t * 3.1);
  return g * amp;
}
void main() {
  vec3 V = normalize(cameraPosition - vW);
  float d = length(cameraPosition.xz - vW.xz);
  float amp = 0.55 / (1.0 + d / 900.0);
  vec2 g = welle(vW.xz, zeit, amp) + (vec2(lpN(vW.xz * 0.05 + zeit * 0.2), lpN(vW.zx * 0.05 - zeit * 0.17)) - 0.5) * 0.25 * amp;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float fr = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N);
  float s = max(dot(R, normalize(sonneDir)), 0.0);
  float funkel = step(0.55, lpH(floor(vW.xz * 0.6) + floor(zeit * 7.0)));
  vec3 col = mix(tief, himmel, fr * mix(0.85, 0.5, schneeLuft)) + sonneFarbe * (pow(s, 900.0) * 26.0 * (0.3 + funkel) + pow(s, 60.0) * 0.22);
  // Eis: wächst vom Ufer nach außen, mit Rissen und Schnee
  float weit = vW.x - lpUfer(vW.z);                       // < 0 im Wasser
  float n = lpF(vW.xz * 0.0025) * 900.0;
  float front = eis * 5000.0 + eis * eis * 9000.0;
  float m = 1.0 - smoothstep(front - 120.0, front + 120.0, -weit + n - 450.0 * (1.0 - eis));
  float riss = smoothstep(0.03, 0.0, abs(lpN(vW.xz * 0.03) - 0.5)) * (1.0 - smoothstep(0.0, 3000.0, d));
  vec3 eisC = mix(eisFarbe, eisFarbe * 0.75, riss) * (0.92 + 0.1 * lpN(vW.xz * 0.01));
  eisC = mix(eisC, schneeFarbe, schnee * (0.6 + 0.4 * lpN(vW.xz * 0.004)));
  eisC = mix(eisC, himmel, fr * 0.35);
  col = mix(col, eisC, clamp(m, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
#include <fog_fragment>
}`;

// --------------------------------------------------------------------------------------------- Geometrien
function boxBasis() { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); return g; }
function mitTyp(geo, n) { const a = new THREE.InstancedBufferAttribute(new Float32Array(n), 1); geo.setAttribute("lpTyp", a); return a; }

function baumGeo(nadel) {
  const teile = [];
  const farbe = (g, c, krone) => { const n = g.getAttribute("position").count, col = new Float32Array(n * 3), k = new Float32Array(n), cc = new THREE.Color(c); for (let i = 0; i < n; i++) { cc.toArray(col, i * 3); k[i] = krone; } g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("lpKrone", new THREE.BufferAttribute(k, 1)); return g; };
  if (nadel) {
    const k1 = new THREE.ConeGeometry(2.6, 6.5, 6); k1.translate(0, 5.6, 0); teile.push(farbe(k1.toNonIndexed(), "#FFFFFF", 1));
    const k2 = new THREE.ConeGeometry(1.9, 4.8, 6); k2.translate(0, 8.6, 0); teile.push(farbe(k2.toNonIndexed(), "#FFFFFF", 1));
  } else {
    const k1 = new THREE.IcosahedronGeometry(3.0, 0); k1.scale(1, 0.85, 1); k1.translate(0, 6.6, 0); teile.push(farbe(k1.toNonIndexed(), "#FFFFFF", 1));
    const k2 = new THREE.IcosahedronGeometry(2.1, 0); k2.translate(1.3, 8.1, 0.6); teile.push(farbe(k2.toNonIndexed(), "#E8EEE0", 1));
    const k3 = new THREE.IcosahedronGeometry(1.9, 0); k3.translate(-1.4, 7.6, -0.7); teile.push(farbe(k3.toNonIndexed(), "#F2F2EA", 1));
  }
  const st = new THREE.CylinderGeometry(0.22, 0.32, 4.4, 5); st.translate(0, 2.2, 0); teile.push(farbe(st.toNonIndexed(), "#5A4636", 0));
  const pos = [], col = [], kr = [];
  for (const g of teile) { pos.push(...g.getAttribute("position").array); col.push(...g.getAttribute("color").array); kr.push(...g.getAttribute("lpKrone").array); }
  const r = new THREE.BufferGeometry();
  r.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); r.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); r.setAttribute("lpKrone", new THREE.Float32BufferAttribute(kr, 1));
  r.computeVertexNormals();
  return r;
}
function baumMaterial(u, nadel) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
attribute float lpKrone; varying float vLpKrone; uniform float uKahl;`).replace("#include <begin_vertex>", `#include <begin_vertex>
vLpKrone = lpKrone;
${nadel ? "" : "transformed.xz *= mix(1.0, 0.55, uKahl * lpKrone); transformed.y = mix(transformed.y, transformed.y * 0.92 + 0.3, uKahl * lpKrone);"}`);
    vertexWelt(sh);
    fragmentKopf(sh, u, "varying float vLpKrone;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
  float kr = vLpKrone;
  ${nadel ? "" : `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.36, 0.12) * (0.8 + 0.4 * lpH(vLpC.xz)), uHerbst * kr * 0.85);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.25, 0.21), uKahl * kr);`}
  float oben = smoothstep(0.2, 0.8, normalize(vLpN).y);
  diffuseColor.rgb = mix(diffuseColor.rgb, uSchneeFarbe, clamp(uSchnee * (${nadel ? "0.25 + 0.6 * oben" : "0.15 + 0.7 * oben"}) * kr + uSchnee * 0.3 * (1.0 - kr) * oben, 0.0, 1.0));`);
  };
  return m;
}

/** Wahrzeichen-Turm mit Silhouette des CN Tower (553,3 m): dreiflügeliger Schaft, Hauptkorb bei 342–360 m, SkyPod 447 m, Antenne. */
function cnTurm(farbe = "#C9C6BF") {
  const g = new THREE.Group();
  const beton = new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.8, flatShading: true });
  const dunkel = new THREE.MeshStandardMaterial({ color: "#2C3138", roughness: 0.35, metalness: 0.2, flatShading: true });
  const hell = new THREE.MeshStandardMaterial({ color: "#E6E3DD", roughness: 0.7, flatShading: true });
  const add = (geo, m, y = 0) => { const x = new THREE.Mesh(geo, m); x.position.y = y; x.castShadow = true; x.receiveShadow = true; g.add(x); return x; };
  const lathe = (pts, seg = 18) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  add(lathe([[0, 0], [9.5, 0], [8.4, 120], [7.2, 250], [6.6, 335], [0, 335]], 12), beton);
  for (let k = 0; k < 3; k++) { // drei Flügel (Y-Grundriss), nach oben schmaler
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(30, 0); s.lineTo(17, 70); s.lineTo(9, 200); s.lineTo(6.5, 330); s.lineTo(0, 330); s.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 5.5, bevelEnabled: false }); geo.translate(0, 0, -2.75);
    const m = add(geo, beton); m.rotation.y = (k * 2 * Math.PI) / 3 + 0.3;
  }
  add(lathe([[6.5, 330], [17, 333], [22, 340], [22.5, 342]], 24), hell);
  add(lathe([[22.5, 342], [24, 346], [24, 352], [22.5, 356]], 24), dunkel);          // Fensterband des Hauptkorbs
  add(lathe([[22.5, 356], [18, 361], [10, 366], [5.5, 368]], 24), hell);
  add(lathe([[5.6, 368], [5.0, 440], [4.6, 445]], 10), beton);
  add(lathe([[4.6, 445], [8.2, 447], [8.6, 452], [7.4, 455], [4.4, 457]], 16), dunkel); // SkyPod
  add(lathe([[3.0, 457], [2.3, 500], [1.5, 535], [0.6, 553]], 8), new THREE.MeshStandardMaterial({ color: "#7E828A", roughness: 0.5, flatShading: true }));
  for (const y of [470, 495, 520]) add(lathe([[3.1, y], [3.1, y + 4]], 8), new THREE.MeshStandardMaterial({ color: "#B4473C", roughness: 0.6, flatShading: true }));
  return g;
}

// --------------------------------------------------------------------------------------------- Hauptklasse
export class GrossstadtDach {
  constructor(szene, o = {}) {
    o = { ...TORONTO_HAFEN, ...o };
    this.o = o; this.szene = szene;
    const R = o.raster, U = o.ufer;
    this.R = R;
    this.ufer = (z) => U.a + U.b * z + U.c * Math.sin(U.f * z);
    this.u = weltUniforms();
    const schatten = o.schatten !== false;

    // Boden
    const boden = new THREE.Mesh(new THREE.PlaneGeometry(90000, 90000).rotateX(-Math.PI / 2), bodenMaterial(this.u, R, U));
    boden.position.set(0, 0, -30000); boden.receiveShadow = true; szene.add(boden); this.boden = boden;

    // Wasser
    this.wasserU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      zeit: { value: 0 }, eis: { value: 0 }, schnee: { value: 0 }, schneeLuft: { value: 0 }, tief: { value: new THREE.Color("#294652") }, himmel: { value: new THREE.Color("#B8C4D2") },
      sonneDir: { value: new THREE.Vector3(...(o.sonne || [-0.2, 0.26, -0.94])).normalize() }, sonneFarbe: { value: new THREE.Color("#FFE2BC") },
      eisFarbe: { value: new THREE.Color("#C9D6DE") }, schneeFarbe: { value: new THREE.Color("#EEF2F6") },
    }]);
    const wasser = new THREE.Mesh(new THREE.PlaneGeometry(90000, 90000).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ vertexShader: WASSER_V, fragmentShader: wasserF(U), uniforms: this.wasserU, fog: true }));
    wasser.position.set(0, -0.8, -30000); szene.add(wasser); this.wasser = wasser;

    // Gebäude erzeugen (Raster, Zonen, Ufer)
    const nah = [], fern = [], technik = [], kappen = [];
    this.daecher = [];
    const halbBreite = (z) => -z * 0.43 + 160;
    const zone = (x, z) => { let best = null; for (const c of o.zentren) { const d = Math.hypot(x - c.x, z - c.z) / c.r; if (d < 1 && (!best || d < best.d)) best = { d, c }; } return best; };
    const gzMin = Math.floor((-o.maxFern - R.oz) / R.pz), gzMax = Math.ceil((-200 - R.oz) / R.pz);
    for (let gz = gzMax; gz >= gzMin; gz--) {
      const z0 = R.oz + gz * R.pz, zc = z0 + R.pz / 2;
      const hb = halbBreite(zc);
      const gx0 = Math.floor((-hb - R.ox) / R.px), gx1 = Math.ceil((hb - R.ox) / R.px);
      for (let gx = gx0; gx <= gx1; gx++) {
        const x0 = R.ox + gx * R.px, xc = x0 + R.px / 2;
        const wx = (gx % R.avenueJede === 0 ? R.avenue : R.strasse) / 2, wz = (gz % R.avenueJede === 0 ? R.avenue : R.strasse) / 2;
        let bx0 = x0 + wx + 3, bx1 = x0 + R.px - wx - 3; const bz0 = z0 + wz + 3, bz1 = z0 + R.pz - wz - 3;
        const uf = Math.max(this.ufer(bz0), this.ufer(bz1)) + 14;
        if (bx1 < uf + 12) continue; bx0 = Math.max(bx0, uf);
        if (Math.abs(xc) < 75 && zc > -70) continue;                                  // eigenes Haus
        if ((o.nachbarn || []).some((n) => Math.abs(n.x - xc) < n.w / 2 + R.px / 2 && Math.abs(n.z - zc) < n.d / 2 + R.pz / 2)) continue;
        if (Math.hypot(xc - o.turm.x, zc - o.turm.z) < 70) continue;
        if (o.kuppel && Math.hypot(xc - o.kuppel.x, zc - o.kuppel.z) < o.kuppel.r + 40) continue;
        const park = h2(gx, gz, 1) < 0.1;
        if (park) { this.daecher.push({ park: true, x0: bx0, x1: bx1, z0: bz0, z1: bz1 }); continue; }
        const dist = -zc;
        const zn = zone(xc, zc);
        if (dist > o.nahFern) { // ferner Block: ein bis zwei flache Körper
          const hgt = zn ? zn.c.h[0] * 0.6 + (zn.c.h[1] - zn.c.h[0]) * h2(gx, gz, 2) ** 2 * (1 - zn.d) : 5 + 12 * h2(gx, gz, 3) ** 2;
          const tower = zn && h2(gx, gz, 4) < 0.5;
          fern.push({ x: (bx0 + bx1) / 2, z: (bz0 + bz1) / 2, w: tower ? 26 + 14 * h2(gx, gz, 5) : bx1 - bx0, d: tower ? 26 + 14 * h2(gx, gz, 6) : bz1 - bz0, h: tower ? hgt : Math.min(hgt, 22), typ: tower ? (h2(gx, gz, 7) < 0.5 ? 1 : 0) : (h2(gx, gz, 8) < 0.45 ? 2 : 0), farbe: h2(gx, gz, 9) });
          continue;
        }
        // naher Block: 1–4 Häuser mit Rücksprüngen; in Hochhausfeldern Turm auf Sockel
        const teilX = (bx1 - bx0) > 60 && h2(gx, gz, 10) < 0.7 ? 2 : 1, teilZ = h2(gx, gz, 11) < 0.55 ? 2 : 1;
        for (let a = 0; a < teilX; a++) for (let b = 0; b < teilZ; b++) {
          const k = a * 2 + b, s = gx * 4 + k;
          const lx0 = bx0 + ((bx1 - bx0) * a) / teilX, lx1 = bx0 + ((bx1 - bx0) * (a + 1)) / teilX;
          const lz0 = bz0 + ((bz1 - bz0) * b) / teilZ, lz1 = bz0 + ((bz1 - bz0) * (b + 1)) / teilZ;
          const rx = 1 + 4 * h2(s, gz, 12), rz = 1 + 4 * h2(s, gz, 13);
          const w = lx1 - lx0 - rx * 2, d = lz1 - lz0 - rz * 2;
          if (w < 8 || d < 8) continue;
          let hgt = 9 + 30 * h2(s, gz, 14) ** 1.6 * (1 - smoothstep(2500, 7000, dist) * 0.6);
          let typ = h2(s, gz, 15) < 0.4 ? 2 : 0;
          if (zn && h2(s, gz, 16) < 0.45 - zn.d * 0.3) {
            const th = zn.c.h[0] + (zn.c.h[1] - zn.c.h[0]) * h2(s, gz, 17) ** 1.3 * (1 - zn.d * 0.5);
            const sockel = 12 + 10 * h2(s, gz, 18);
            nah.push({ x: (lx0 + lx1) / 2, z: (lz0 + lz1) / 2, w, d, h: sockel, typ: 0, farbe: h2(s, gz, 19) });
            const tw = Math.min(w, 22 + 22 * h2(s, gz, 20)), td = Math.min(d, 22 + 20 * h2(s, gz, 21));
            const tx = (lx0 + lx1) / 2 + (w - tw) * (h2(s, gz, 22) - 0.5), tz = (lz0 + lz1) / 2 + (d - td) * (h2(s, gz, 23) - 0.5), ttyp = h2(s, gz, 24) < 0.6 ? 1 : 0;
            nah.push({ x: tx, z: tz, w: tw, d: td, h: th, typ: ttyp, farbe: h2(s, gz, 25), turm: true });
            if (th > 90 && h2(s, gz, 30) < 0.65) { const kf = 0.55 + 0.25 * h2(s, gz, 31); nah.push({ x: tx, z: tz, y: th, w: tw * kf, d: td * kf, h: 6 + 22 * h2(s, gz, 32), typ: ttyp, farbe: h2(s, gz, 25), turm: true }); }
            continue;
          }
          if (dist < 2200 && h2(s, gz, 26) < 0.12) { hgt = 50 + 85 * h2(s, gz, 27); typ = h2(s, gz, 28) < 0.5 ? 1 : 0; }
          nah.push({ x: (lx0 + lx1) / 2, z: (lz0 + lz1) / 2, w, d, h: hgt, typ, farbe: h2(s, gz, 29) });
        }
      }
    }
    for (const nb of o.nachbarn || []) nah.push({ ...nb, terrasse: true });
    // Dachaufbauten und Schneekappen für nahe Häuser
    nah.forEach((b, i) => {
      const dist = -b.z;
      const top = (b.y || 0) + b.h;
      if (dist < 4200 && b.h > 5) {
        kappen.push({ ...b, i, top });
        const kw = b.w * (0.22 + 0.15 * hash(i, 31)), kd = b.d * (0.22 + 0.15 * hash(i, 32));
        technik.push({ x: b.x + (b.w - kw) * (hash(i, 33) - 0.5) * 0.7, z: b.z + (b.d - kd) * (hash(i, 34) - 0.5) * 0.7, y: top, w: kw, d: kd, h: 3 + 4 * hash(i, 35), i });
        const n = 1 + Math.floor(hash(i, 36) * 3);
        for (let k = 0; k < n; k++) technik.push({ x: b.x + (hash(i * 7 + k, 37) - 0.5) * b.w * 0.75, z: b.z + (hash(i * 7 + k, 38) - 0.5) * b.d * 0.75, y: top, w: 2 + 2.5 * hash(i * 7 + k, 39), d: 2 + 3 * hash(i * 7 + k, 40), h: 1.2 + 1.3 * hash(i * 7 + k, 41), i });
        if (b.turm && top > 140 && hash(i, 42) < 0.4) technik.push({ x: b.x, z: b.z, y: top, w: 1.2, d: 1.2, h: 12 + 18 * hash(i, 43), i });
      }
    });
    this.nah = nah; this.fern = fern; this.technik = technik; this.kappen = kappen;

    const mat = gebaeudeMaterial(this.u);
    const FARB = { 0: ["#C9C2B6", "#B8B1A6", "#D6CFC2", "#A39E95", "#C4B8A2", "#9FA4A8", "#D9D3C7", "#B5A58F", "#C7B9A6", "#8E9499"], 1: ["#4E6378", "#5D7A92", "#3F5266", "#7891A6", "#56707F", "#6A7F8E", "#84929A"], 2: ["#9A5E47", "#A8735B", "#83533F", "#B9876E", "#8C6A55", "#A0806A"] };
    const baue = (liste, typFn, farbFn) => {
      const geo = boxBasis(); const typ = mitTyp(geo, liste.length);
      const im = new THREE.InstancedMesh(geo, mat, liste.length);
      const m = new THREE.Matrix4(), c = new THREE.Color();
      liste.forEach((b, k) => { m.makeScale(b.w, b.h, b.d); m.setPosition(b.x, b.y || 0, b.z); im.setMatrixAt(k, m); typ.array[k] = typFn(b); im.setColorAt(k, c.set(farbFn(b))); });
      im.castShadow = schatten; im.receiveShadow = true; this.szene.add(im);
      return im;
    };
    const farbe = (b) => { const f = FARB[b.typ] || FARB[0]; return f[Math.floor(b.farbe * f.length) % f.length]; };
    this.mNah = baue(nah, (b) => b.typ, farbe);
    this.mFern = baue(fern, (b) => b.typ, farbe); this.mFern.castShadow = false;
    this.mTechnik = baue(technik, () => 5, (b) => ["#8D9093", "#A4A6A8", "#76797C"][b.i % 3]);
    this.mKappen = baue(kappen, () => 4, () => "#FFFFFF"); this.mKappen.castShadow = false;
    this.mKappen.count = kappen.length;

    // Wahrzeichen und Kuppel
    this.turm = cnTurm(); this.turm.position.set(o.turm.x, 0, o.turm.z); szene.add(this.turm);
    this.turmLicht = null;
    if (o.kuppel) {
      const k = new THREE.Group();
      const dach = new THREE.Mesh(new THREE.SphereGeometry(o.kuppel.r, 20, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#E4E2DD", roughness: 0.6, flatShading: true }));
      dach.scale.set(1, 0.42, 1); dach.position.y = 30; dach.castShadow = dach.receiveShadow = true;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(o.kuppel.r, o.kuppel.r * 1.03, 30, 24), new THREE.MeshStandardMaterial({ color: "#9FA3A7", roughness: 0.8, flatShading: true }));
      ring.position.y = 15; ring.castShadow = ring.receiveShadow = true;
      k.add(dach, ring); k.position.set(o.kuppel.x, 0, o.kuppel.z); szene.add(k); this.kuppel = k; this.kuppelDach = dach;
    }

    // Bäume: Straßenbäume entlang der Avenues und Parks
    const laub = [], nadel = [];
    for (let gx = -14; gx <= 14; gx++) {
      if (gx % 2 !== 0) continue;
      const x = R.ox + gx * R.px;
      for (let z = -260; z > -3600; z -= 13) {
        if (Math.abs(x) > halbBreite(z)) continue;
        for (const sx of [-1, 1]) { const xx = x + sx * ((gx % R.avenueJede === 0 ? R.avenue : R.strasse) / 2 + 2.5); if (xx < this.ufer(z) + 10) continue; if (hash(Math.round(z) + gx * 999 + sx, 51) < 0.15) continue; laub.push({ x: xx, z, s: 0.75 + 0.35 * hash(Math.round(z) + gx * 31 + sx, 52) }); }
      }
    }
    for (let gz = -3; gz >= -40; gz--) {
      if (gz % 2 !== 0) continue;
      const z = R.oz + gz * R.pz, hb = halbBreite(z) + 40;
      for (let x = -hb; x < hb; x += 14) for (const sz of [-1, 1]) { const zz = z + sz * ((gz % R.avenueJede === 0 ? R.avenue : R.strasse) / 2 + 2.5); if (x < this.ufer(zz) + 10) continue; if (hash(Math.round(x) + gz * 977 + sz, 50) < 0.25) continue; laub.push({ x: x + 4 * hash(Math.round(x), 49), z: zz, s: 0.75 + 0.35 * hash(Math.round(x) + gz, 48) }); }
    }
    for (const p of this.daecher.filter((d) => d.park)) {
      const n = Math.round(((p.x1 - p.x0) * (p.z1 - p.z0)) / 160);
      for (let k = 0; k < n; k++) { const x = p.x0 + (p.x1 - p.x0) * hash(k + Math.round(p.x0), 53), z = p.z0 + (p.z1 - p.z0) * hash(k + Math.round(p.z0), 54); (hash(k, 55) < 0.25 ? nadel : laub).push({ x, z, s: 0.8 + 0.5 * hash(k + Math.round(x), 56) }); }
    }
    // Uferpark mit Bäumen entlang des Wassers
    for (let z = -700; z > -9000; z -= 9) { const x = this.ufer(z) + 18 + 22 * hash(Math.round(z), 57); if (hash(Math.round(z), 58) < 0.35) continue; (hash(Math.round(z), 59) < 0.3 ? nadel : laub).push({ x, z, s: 0.9 + 0.5 * hash(Math.round(z), 60) }); }
    const baumMesh = (liste, istNadel) => {
      const im = new THREE.InstancedMesh(baumGeo(istNadel), baumMaterial(this.u, istNadel), liste.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), e = new THREE.Euler();
      liste.forEach((b, k) => { const s = b.s * (1 + Math.min(1.2, -b.z / 3000)); q.setFromEuler(e.set(0, hash(k, 61) * 6.28, 0)); m.compose(new THREE.Vector3(b.x, 0, b.z), q, new THREE.Vector3(s, s, s)); im.setMatrixAt(k, m);
        im.setColorAt(k, istNadel ? c.setHSL(0.36 + hash(k, 62) * 0.05, 0.32, 0.2 + hash(k, 63) * 0.08) : c.setHSL(0.21 + hash(k, 62) * 0.09, 0.32 + hash(k, 64) * 0.18, 0.27 + hash(k, 63) * 0.12)); });
      im.castShadow = schatten; im.receiveShadow = true; this.szene.add(im); return im;
    };
    this.laub = baumMesh(laub, false); this.nadel = baumMesh(nadel, true);
    this.baumListen = { laub, nadel };

    // Autos: Avenues (in die Tiefe), Querstraßen, Uferautobahn
    const spuren = [];
    for (let gx = -12; gx <= 12; gx++) {
      if (gx % R.avenueJede !== 0 && gx % 2 !== 0) continue;
      const x = R.ox + gx * R.px; if (Math.abs(x) > halbBreite(-1500) + 300) continue;
      const P = []; for (let z = -230; z > -6500; z -= 200) if (x > this.ufer(z) + 20) P.push([x, 0, z]);
      if (P.length > 3) spuren.push({ P, gross: gx % R.avenueJede === 0 });
    }
    const autos = new Autos(szene, { anzahl: 900, seed: 83, schatten, farben: ["#B8BCC2", "#1F2A36", "#8E1F1F", "#E9E9E6", "#2E4F7A", "#3B3F44", "#C9A227", "#33503C", "#A33A2A", "#1D1D20"] });
    autos._s.set(1.35, 1.35, 1.35);
    for (const s of spuren) {
      const n = s.gross ? 40 : 16;
      autos.spur({ punkte: s.P.map((p) => [p[0] - 3.2, 0, p[2]]), anzahl: n, tempo: s.gross ? 14 : 10 });
      autos.spur({ punkte: s.P.slice().reverse().map((p) => [p[0] + 3.2, 0, p[2]]), anzahl: n, tempo: s.gross ? 13 : 9 });
    }
    for (let gz = -3; gz >= -22; gz -= 2) {
      const z = R.oz + gz * R.pz; const hb = halbBreite(z) + 100;
      const x0 = Math.max(-hb, this.ufer(z) + 20);
      if (hb - x0 < 80) continue;
      autos.spur({ punkte: [[x0, 0, z - 3], [hb, 0, z - 3]], anzahl: 10, tempo: 11 }).spur({ punkte: [[hb, 0, z + 3], [x0, 0, z + 3]], anzahl: 10, tempo: 10 });
    }
    { const P = []; for (let z = -400; z > -9000; z -= 150) P.push([this.ufer(z) + 55, 0, z]);
      autos.spur({ punkte: P.map((p) => [p[0] - 3, 0, p[2]]), anzahl: 45, tempo: 22 }).spur({ punkte: P.slice().reverse().map((p) => [p[0] + 3, 0, p[2]]), anzahl: 45, tempo: 21 }); }
    this.autos = autos;

    // Menschen: Gehwege entlang der Avenues (nah) und auf Dachterrassen benachbarter Häuser
    const leute = new Menschen(szene, { anzahl: 1100, seed: 73, schatten, hoehe: 2.0 });
    // Dachterrassen: hohe Nachbarn nahe der Kamera
    const terrassen = [...nah.filter((b) => b.terrasse), ...nah.filter((b) => !b.terrasse && b.h > 35 && b.h < 140 && -b.z < 900 && Math.abs(b.x) < halbBreite(b.z) - 20).slice(0, 5)];
    this.terrassen = terrassen;
    for (const b of terrassen) leute.verteile({ anzahl: b.terrasse ? 16 : 8, bereich: { x: [b.x - b.w * 0.35, b.x + b.w * 0.35], z: [b.z - b.d * 0.35, b.z + b.d * 0.35] }, boden: () => b.h, gehen: 0.35, weg: [3, 8] });

    for (let gx = -6; gx <= 6; gx++) {
      const x = R.ox + gx * R.px; const w = (gx % R.avenueJede === 0 ? R.avenue : R.strasse) / 2 + 1.5;
      for (const sx of [-1, 1]) leute.verteile({ anzahl: gx % R.avenueJede === 0 ? 40 : 18, bereich: { x: [x + sx * w - 0.8, x + sx * w + 0.8], z: [-1600, -270] }, gehen: 0.8, tempo: [1.0, 1.5], weg: [10, 40], richtung: [0, 1] });
    }
    for (let gz = -4; gz >= -16; gz--) {
      const z = R.oz + gz * R.pz; const w = (gz % R.avenueJede === 0 ? R.avenue : R.strasse) / 2 + 1.5;
      for (const sz of [-1, 1]) leute.verteile({ anzahl: 7, bereich: { x: [Math.max(-halbBreite(z), this.ufer(z) + 15), halbBreite(z)], z: [z + sz * w - 0.6, z + sz * w + 0.6] }, gehen: 0.75, weg: [8, 30], richtung: [1, 0] });
    }
    // Uferpromenade
    { const P = []; for (let z = -600; z > -2600; z -= 7) P.push([this.ufer(z) + 9, z]); leute.verteile({ anzahl: 90, punkte: P.filter((_, i) => hash(i, 71) < 0.35), gehen: 0.7, weg: [6, 25], richtung: [0, 1] }); }
    this.leute = leute;

    // Boote auf dem See (Sommer)
    const bootGeo = (() => { const rumpf = new THREE.BoxGeometry(2.4, 1.0, 8.5).toNonIndexed(); rumpf.translate(0, 0.3, 0);
      const segel = new THREE.BufferGeometry(); segel.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.8, 2.6, 0, 11.5, 0.6, 0, 0.8, -2.2, 0, 0.8, -2.2, 0, 11.5, 0.6, 0, 0.8, 2.6], 3));
      const col = (g, c) => { const n = g.getAttribute("position").count, a = new Float32Array(n * 3), cc = new THREE.Color(c); for (let i = 0; i < n; i++) cc.toArray(a, i * 3); g.setAttribute("color", new THREE.BufferAttribute(a, 3)); };
      col(rumpf, "#F2F0EA"); col(segel, "#FBFAF6");
      const r = new THREE.BufferGeometry(); r.setAttribute("position", new THREE.Float32BufferAttribute([...rumpf.getAttribute("position").array, ...segel.getAttribute("position").array], 3)); r.setAttribute("color", new THREE.Float32BufferAttribute([...rumpf.getAttribute("color").array, ...segel.getAttribute("color").array], 3)); r.computeVertexNormals(); return r; })();
    this.boote = [];
    for (let k = 0; this.boote.length < 22 && k < 400; k++) { const z = -900 - 6000 * hash(k, 81) ** 1.4, x = this.ufer(z) - 60 - 1600 * hash(k, 82); if (x < -halbBreite(z) - 200) continue; this.boote.push({ x, z, v: 1.5 + 2.5 * hash(k, 83), w: hash(k, 84) * 6.28, s: 0.9 + 0.6 * hash(k, 85) }); }
    this.mBoote = new THREE.InstancedMesh(bootGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6, side: THREE.DoubleSide }), this.boote.length);
    this.mBoote.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mBoote.castShadow = schatten; this.mBoote.frustumCulled = false; szene.add(this.mBoote);

    // Möwen über dem Hafen, Zugvögel
    this.moewen = new Voegel(szene, { anzahl: 26, seed: 93, farbe: "#D9DCDF", spannweite: 1.3 });
    this.moewen.schwarm({ zentrum: [this.ufer(-1200) - 120, 45, -1200], radius: 90, hoehe: 25, tempo: 9, anzahl: 14, skala: 1.4 })
      .schwarm({ zentrum: [this.ufer(-500) - 40, 70, -520], radius: 45, hoehe: 15, tempo: 8, anzahl: 12, skala: 1.2 });
    this.krähen = new Voegel(szene, { anzahl: 30, seed: 95, farbe: "#26272B", spannweite: 1.0 });
    this.krähen.schwarm({ zentrum: [80, 120, -420], radius: 60, hoehe: 20, tempo: 9, anzahl: 12, skala: 1.4 }).schwarm({ zentrum: [-60, 210, -1600], radius: 120, hoehe: 30, tempo: 11, anzahl: 18, skala: 3.2 });

    // Dampf aus Dächern (Winter)
    const dampfHaus = nah.filter((b) => b.h > 25 && -b.z < 3000 && -b.z > 900 && Math.abs(b.x + 0.05 * b.z) < halbBreite(b.z) - 60).filter((_, i) => hash(i, 91) < 0.2).slice(0, 8);
    this.dampf = dampfHaus.map((b, k) => puffStrahl({ ursprung: [b.x + (hash(k, 92) - 0.5) * b.w * 0.5, b.h + 3, b.z], richtung: [0.45, 1, 0.25], streuung: 0.25, tempo: 3.2 + 2 * hash(k, 93), von: -20, bis: 80, rate: 3.5, leben: 12, r: 2.5 + 0.02 * b.h, wachsen: 6, farbe: "#F1F3F5", a: 0.2, seed: 300 + k, licht: 0.85 }));

    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); this._e = new THREE.Euler();
  }

  /** Dampf-Puffs (mit Kälte-Anteil 0..1) */
  puffs(t, kaelte = 1) {
    if (kaelte <= 0.01) return [];
    const out = [];
    for (const f of this.dampf) for (const p of f(t)) { p.a *= kaelte; out.push(p); }
    return out;
  }

  /**
   * Zustand bei t. w: { schnee, schneeTiefe, seeEis, herbst, kahl, fensterLicht, himmel (Color), sonneFarbe, sonneDir,
   *   versenkt(x, z) → 0..1 (0 = steht, 1 = ganz verschwunden, z. B. unter einer Eisfront), leuteAnteil, autoAnteil }
   */
  setze(t, kamera, w = {}) {
    const u = this.u;
    u.uSchnee.value = w.schnee ?? 0; u.uTiefe.value = w.schneeTiefe ?? 0; u.uLicht.value = w.fensterLicht ?? 0.08;
    u.uHerbst.value = w.herbst ?? 0; u.uKahl.value = w.kahl ?? 0; u.uZeit.value = t;
    if (w.himmel) { u.uHimmel.value.copy(w.himmel); this.wasserU.himmel.value.copy(w.himmel); }
    const W = this.wasserU; W.zeit.value = t; W.eis.value = w.seeEis ?? 0; W.schnee.value = smoothstep(0.3, 1, w.seeEis ?? 0) * (w.schnee ?? 0); W.schneeLuft.value = w.schnee ?? 0;
    if (w.sonneFarbe) W.sonneFarbe.value.copy(w.sonneFarbe);
    if (w.sonneDir) W.sonneDir.value.set(...w.sonneDir).normalize();

    // Gebäude unter einer Front versinken lassen
    const vs = w.versenkt;
    const m = this._m;
    if (vs) {
      const setzeListe = (im, liste, yOff) => {
        let geaendert = false;
        liste.forEach((b, k) => {
          const f = vs(b.x, b.z);
          if (f !== (b._f ?? 0)) { b._f = f; geaendert = true; const h = Math.max(0.001, b.h * (1 - f)); m.makeScale(b.w, h, b.d); m.setPosition(b.x, yOff(b, f), b.z); im.setMatrixAt(k, m); }
        });
        if (geaendert) im.instanceMatrix.needsUpdate = true;
      };
      setzeListe(this.mNah, this.nah, (b, f) => (b.y || 0) * (1 - f));
      setzeListe(this.mFern, this.fern, () => 0);
      const nahF = (b) => this.nah[b.i]._f ?? 0;
      let g2 = false;
      this.technik.forEach((b, k) => { const f = nahF(b); if (f !== (b._f ?? 0)) { b._f = f; g2 = true; const nb = this.nah[b.i]; const hb = ((nb.y || 0) + nb.h) * (1 - f); m.makeScale(b.w, f > 0.98 ? 0.001 : b.h, b.d); m.setPosition(b.x, hb, b.z); this.mTechnik.setMatrixAt(k, m); } });
      if (g2) this.mTechnik.instanceMatrix.needsUpdate = true;
    }
    // Schneekappen: wachsen mit der Schneedecke (Dachaufbauten verschwinden darunter)
    const tiefe = w.schneeTiefe ?? 0;
    if (tiefe !== this._tiefe || vs) {
      this._tiefe = tiefe;
      const hk = 0.05 + 2.8 * tiefe;
      this.kappen.forEach((b, k) => { const f = this.nah[b.i]._f ?? 0; const hb = b.top * (1 - f); const sicht = tiefe > 0.02 && f < 0.98; m.makeScale(sicht ? b.w + 0.8 : 0.001, sicht ? hk : 0.001, sicht ? b.d + 0.8 : 0.001); m.setPosition(b.x, hb - 0.05, b.z); this.mKappen.setMatrixAt(k, m); });
      this.mKappen.instanceMatrix.needsUpdate = true;
    }
    // Bäume unter der Front verschwinden
    if (vs) for (const [im, liste] of [[this.laub, this.baumListen.laub], [this.nadel, this.baumListen.nadel]]) {
      let g = false;
      liste.forEach((b, k) => { const f = vs(b.x, b.z) > 0.05 ? 1 : 0; if (f !== (b._f ?? 0)) { b._f = f; g = true; im.getMatrixAt(k, m); const s = f ? 0.0001 : b.s * (1 + Math.min(1.2, -b.z / 3000)); m.decompose(this._v, this._q, this._s); this._s.setScalar(s); m.compose(this._v, this._q, this._s); im.setMatrixAt(k, m); } });
      if (g) im.instanceMatrix.needsUpdate = true;
    }

    // Statisten
    this.leute.setze(t); this.autos.setze(t);
    const la = w.leuteAnteil ?? 1, aa = w.autoAnteil ?? 1;
    if (la < 1 || vs) { for (let i = 0; i < this.leute.n; i++) { const L = this.leute.leute[i]; if (!L) continue; const z = this.leute.zustand(i, t); if (hash(i, 77) > la || (vs && vs(z.x, z.z) > 0.02)) { m.makeScale(0, 0, 0); this.leute.koerper.setMatrixAt(i, m); this.leute.kopf.setMatrixAt(i, m); } } this.leute.koerper.instanceMatrix.needsUpdate = this.leute.kopf.instanceMatrix.needsUpdate = true; }
    if (aa < 1 || vs) { const p = new THREE.Vector3(); for (let i = 0; i < this.autos.n; i++) { this.autos.mesh.getMatrixAt(i, m); p.setFromMatrixPosition(m); if (hash(i, 78) > aa || (vs && vs(p.x, p.z) > 0.02)) { m.makeScale(0, 0, 0); this.autos.mesh.setMatrixAt(i, m); } } this.autos.mesh.instanceMatrix.needsUpdate = true; }
    // Boote: fahren im Sommer, verschwinden mit dem Eis
    const bootSicht = 1 - smoothstep(0.05, 0.4, Math.max(w.schnee ?? 0, w.seeEis ?? 0));
    this.boote.forEach((b, k) => { const s = bootSicht > 0.01 ? b.s : 0; const x = b.x + Math.sin(b.w) * b.v * t, z = b.z + Math.cos(b.w) * b.v * t;
      this._q.setFromEuler(this._e.set(Math.sin(t * 1.1 + k) * 0.04, b.w, Math.sin(t * 0.9 + k * 2) * 0.06)); m.compose(this._v.set(x, -0.6 - (1 - bootSicht) * 3, z), this._q, this._s.setScalar(s)); this.mBoote.setMatrixAt(k, m); });
    this.mBoote.instanceMatrix.needsUpdate = true;
    this.moewen.setze(t); this.krähen.setze(t);
    return this;
  }
}
