// Baustein „Ameisen“ (Account 2 @stelldirvor.pov, Erstbau 09.11.2026) – Schwarze Wegameise (Lasius niger) für
// „Was wäre, wenn du 28 Jahre lang Ameisen zusiehst?“ (Skript acc2-2026-11-10-mittag). Nur Three.js, alles prozedural,
// jedes Bild eine reine Funktion von t und den update-Parametern (feste Seeds, kein Zustand zwischen Bildern).
// Größen in Metern: Arbeiterin 3,5–5 mm, Königin 9 mm, Männchen 4,5 mm, Jungkönigin 8,5 mm (geflügelt).
//
// ===================================================================================================================== API
// import { Ameisen, Koenigin, Schwarm, dichte, ameiseGeo } from "../../engine/ameisen.js";
//
// A) Ameisen – Arbeiterinnen als InstancedMesh (Beine laufen im Shader, Kontaktschatten, Sandkörner im Maul)
//    const ameisen = new Ameisen(szene, { max = 2400 });
//    ameisen.update(t, { strassen, volk, aktiv = 1, tempo = 1, draussen = 0.25, nest = null, nestBoden = null, nestRadius = 0.03,
//                        traeger = 0.3, gewusel = null })
//      strassen  [{ punkte: [{ p:[x,y,z], n:[nx,ny,nz] } | [x,y,z]], anteil = 1, gewicht = 1, breite = 0.007 }]  (Polylinien, n = Bodennormale;
//                welt_garten_terrasse.js → welt.strassen(jahre)). anteil 0..1 öffnet eine Straße (0 = noch nicht da).
//      volk      Arbeiterinnen im Volk (1 … 7.000). Dichte als Funktion der Volksgröße: draußen = volk · draussen · aktiv,
//                verteilt nach gewicht · anteil, je Straße höchstens 1 Tier je 3,5 mm. Ameise j einer Straße bleibt dieselbe, wenn das Volk wächst.
//      aktiv     0..1 Saison (Winterruhe 0 → niemand draußen), tempo = Faktor auf die Laufgeschwindigkeit (2–4 cm/s)
//      nest      [x,y,z] Nesteingang: Gewusel aus 4 … 120 Tieren (dichte(volk)), nestBoden(x, z) → y (z. B. Fuge/Plattenoberkante)
//      traeger   Anteil der Tiere am Nest, die ein Sandkorn tragen
//    ameisen.anzahl (sichtbar im letzten Bild), ameisen.mesh, ameisen.zeige(bool)
//    dichte(volk) → 0..1 (Wurzelkurve: 100 Tiere 0,12 · 1.000 0,38 · 7.000 1,0)
//
// B) Koenigin – eine Königin mit vier einzeln abfallenden Flügeln
//    const k = new Koenigin(szene, { groesse = 0.009 });
//    k.update(t, { sichtbar = true, pos:[x,y,z], yaw = 0, tempo = 0, flug = 0, fluegelAb = 0, ablage = pos, versinken = 0, glanz = 0, normale = [0,1,0] })
//      yaw        Blickrichtung (rad, 0 = +x, π/2 = −z), tempo 0..2 Beinbewegung (0 = steht)
//      flug       0..1 Flügel ausgebreitet und schlagend (Landung: 1 → 0)
//      fluegelAb  0..1 Abwurf: Flügel 1–4 lösen sich nacheinander, kippen ab und liegen danach flach bei ablage (glitzern mit glanz)
//      versinken  0..1 die Königin kriecht in die Fuge (sinkt 9 mm, wird dabei dunkler/kleiner sichtbar), 1 = verschwunden
//      glanz      0..2 Lichtreflex auf den Flügeln (Gegenlicht), auch für die abgeworfenen
//
// C) Schwarm – Hunderte geflügelte Geschlechtstiere (Jungköniginnen und Männchen), Körper + Flügel + Glitzerpunkte für die Ferne
//    const s = new Schwarm(szene, { max = 1500 });
//    s.update(t, kamera, { modus = "aufstieg", anzahl, t0, dauer = 4, quelle:[x,y,z], streu = 0.03, quellen = null, krabbeln = 2,
//                          steig = 0.9, hoehe = 18, wind = [0.25, -0.1], bereich = { mitte, radius, hoehe }, boden = null,
//                          sonne = [x,y,z], glanz = 1, punkte = 1 })
//      "aufstieg": Tier i krabbelt ab t0 + dauer·h_i − krabbeln aus der Quelle (quellen = Liste mehrerer Fugenpunkte), startet bei t0 + dauer·h_i,
//                  steigt in weiten Spiralen mit steig m/s, treibt mit dem Wind und verschwindet über hoehe m.
//      "tanzen":   Schwärme anderer Nester schweben im Gegenlicht in bereich (Kugel um mitte, Radius, Höhe) – Einstieg, Nachspiel
//      "landen":   Jungköniginnen sinken ab t0 innerhalb von dauer s auf den Boden (boden(x, z) → y) in bereich und laufen los
//      punkte      0..1 Glitzerpunkte (für Tiere in > 0,5 m Abstand, Größe ≥ 1,6 px, Helligkeit nach Gegenlicht zur sonne)
//    s.anzahl (sichtbar im letzten Bild)
//
// D) ameiseGeo(art = "arbeiterin" | "koenigin" | "gyne" | "maennchen") → BufferGeometry, Länge 1 (Einheit), +x vorn, y oben, Fußpunkt y = 0,
//    Attribute color, aBein (0 Körper, 1–6 Beine, 7 Fühler). fluegelGeo(art) → Flügel (Attribute aSeite, aHinge, aHinten).
//    Material: ameisenMaterial(u) bzw. fluegelMaterial(u) – u = { uZeit } (gemeinsame Uniforms).
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";

const C = (h) => new THREE.Color(h);
const fr = (x) => x - Math.floor(x);
export const GROESSE = { arbeiterin: 0.0045, koenigin: 0.009, gyne: 0.0085, maennchen: 0.0045 };

/** Dichte 0..1 als Funktion der Volksgröße (Wurzelkurve, 7.000 = voll) */
export const dichte = (volk) => clamp(Math.sqrt(Math.max(0, volk) / 7000));

// ----------------------------------------------------------------------------------------------- Geometrie
function verschmelze(teile) {
  const pos = [], col = [], nor = [], bein = [];
  for (const t of teile) {
    const g = t.g.index ? t.g.toNonIndexed() : t.g; g.computeVertexNormals();
    const p = g.getAttribute("position"), n = g.getAttribute("normal"), c = C(t.c);
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r * (t.f || 1), c.g * (t.f || 1), c.b * (t.f || 1)); bein.push(t.b || 0); }
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  o.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); o.setAttribute("aBein", new THREE.Float32BufferAttribute(bein, 1));
  return o;
}
const ellipsoid = (rx, ry, rz, x, y, z, rot = 0, seg = 10) => { const g = new THREE.SphereGeometry(1, seg, Math.max(6, seg - 3)); g.scale(rx, ry, rz); g.rotateZ(rot); g.translate(x, y, z); return g; };
function stab(a, b, r0, r1 = r0, seg = 4) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize())); g.translate(...a);
  return g;
}
/** Ameise, Länge 1, +x vorn, Füße auf y = 0 */
export function ameiseGeo(art = "arbeiterin") {
  const K = art === "koenigin" || art === "gyne", M = art === "maennchen";
  const koerper = K ? "#1E1610" : M ? "#141110" : "#1A1410", glanz = K ? "#2A1E16" : "#241A14", bein = M ? "#3A3026" : "#2E241A";
  const gs = K ? 1.28 : M ? 0.8 : 1, ms = K ? 1.25 : M ? 1.15 : 1, ks = K ? 0.9 : M ? 0.72 : 1;
  const yK = 0.2;
  const t = [
    { g: ellipsoid(0.21 * gs, 0.15 * gs, 0.16 * gs, -0.26 - 0.05 * (gs - 1), yK + 0.01, 0, -0.12), c: koerper },                 // Hinterleib (Gaster)
        { g: ellipsoid(0.035, 0.05, 0.035, -0.03, yK + 0.02, 0, 0, 6), c: koerper },                                                     // Stielchen (Petiolus)
    { g: ellipsoid(0.17 * ms, 0.085 * ms, 0.075 * ms, 0.1, yK + 0.02, 0, 0.18), c: glanz },                                          // Bruststück
    { g: ellipsoid(0.1 * ks, 0.085 * ks, 0.095 * ks, 0.32, yK + 0.05, 0, -0.15), c: koerper },                                       // Kopf
    { g: ellipsoid(0.02, 0.02, 0.02, 0.36, yK + 0.08, 0.07 * ks, 0, 5), c: "#050403" }, { g: ellipsoid(0.02, 0.02, 0.02, 0.36, yK + 0.08, -0.07 * ks, 0, 5), c: "#050403" },  // Augen
    { g: stab([0.4, yK + 0.02, 0.03], [0.46, yK - 0.01, 0.012], 0.012, 0.006), c: "#3A2A1A" }, { g: stab([0.4, yK + 0.02, -0.03], [0.46, yK - 0.01, -0.012], 0.012, 0.006), c: "#3A2A1A" },
  ];
  for (const s of [1, -1]) {                                                                         // Fühler (gekniet)
    t.push({ g: stab([0.37, yK + 0.1, 0.035 * s], [0.43, yK + 0.2, 0.11 * s], 0.009, 0.008), c: bein, b: 7 });
    t.push({ g: stab([0.43, yK + 0.2, 0.11 * s], [0.6, yK + 0.15, 0.17 * s], 0.008, 0.01), c: bein, b: 7 });
  }
  const beine = [[0.16, 0.17, 0.33], [0.1, 0.02, 0.36], [0.04, -0.22, 0.34]];                         // [Hüfte x, Fuß x, Spreizung]
  beine.forEach(([hx, fx, sp], k) => {
    for (const s of [1, -1]) {
      const id = 1 + k * 2 + (s < 0 ? 1 : 0);
      const huefte = [hx, yK - 0.03, 0.035 * s], knie = [lerp(hx, fx, 0.45), yK + 0.07, sp * 0.62 * s], fuss = [fx, 0.0, sp * s];
      t.push({ g: stab(huefte, knie, 0.016, 0.013), c: bein, b: id }, { g: stab(knie, fuss, 0.012, 0.007), c: bein, b: id });
    }
  });
  return verschmelze(t);
}
/** Flügel (Einheit wie ameiseGeo): Vorder- und Hinterflügel je Seite, gefaltet nach hinten über dem Hinterleib */
export function fluegelGeo(art = "gyne") {
  const L = art === "maennchen" ? 1.05 : 1.08;
  const pos = [], seite = [], hinge = [], hinten = [], uv = [];
  for (const s of [1, -1]) for (const h of [0, 1]) {
    const lang = L * (h ? 0.78 : 1), breit = lang * (h ? 0.22 : 0.28), H = [0.13 - 0.06 * h, 0.31, 0.03 * s];
    const umriss = [[0, 0.03], [-0.12, 0.28], [-0.45, 0.5], [-0.75, 0.48], [-0.94, 0.3], [-1, 0.05], [-0.96, -0.2], [-0.78, -0.4], [-0.5, -0.46], [-0.2, -0.3], [0, -0.03]];
    const form = new THREE.Shape(umriss.map(([x, y]) => new THREE.Vector2(x * lang, y * breit)));
    const g = new THREE.ShapeGeometry(form, 6); g.rotateX(Math.PI / 2);                     // flach (Form-y → Welt-z), zeigt nach −x
    const p = g.index ? g.toNonIndexed() : g, a = p.getAttribute("position");
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i), z = a.getZ(i) * s + s * breit * 0.42;
      pos.push(H[0] + x, H[1] + 0.004 * h, H[2] + z); seite.push(s); hinge.push(...H); hinten.push(h); uv.push(-x / lang, ((a.getZ(i) * s) / breit) + 0.5);
    }
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute("aSeite", new THREE.Float32BufferAttribute(seite, 1));
  o.setAttribute("aHinge", new THREE.Float32BufferAttribute(hinge, 3)); o.setAttribute("aHinten", new THREE.Float32BufferAttribute(hinten, 1));
  o.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); o.computeVertexNormals();
  return o;
}

// ----------------------------------------------------------------------------------------------- Materialien
let nr = 0;
/** Ameisenkörper: Beine laufen (Dreifußgang), Fühler tasten. Instanz-Attribute aTempo (0 = steht) und aPh (Phase). */
export function ameisenMaterial(u, { instanz = true } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", vertexColors: true, roughness: 0.36, metalness: 0.0 });
  const key = "ameise" + nr++ + instanz;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
uniform float uZeit, uTempo; attribute float aBein; ${instanz ? "attribute float aTempo; attribute float aPh;" : ""}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
  {
    float tempo = ${instanz ? "aTempo" : "uTempo"}, ph0 = ${instanz ? "aPh" : "0.0"};
    if (aBein > 0.5 && aBein < 6.5) {
      float gruppe = mod(aBein, 2.0) < 0.5 ? (aBein > 2.5 && aBein < 4.5 ? 0.0 : 1.0) : (aBein > 2.5 && aBein < 4.5 ? 1.0 : 0.0);
      float ph = uZeit * 22.0 * tempo + ph0 + gruppe * 3.14159;
      float w = clamp(1.0 - position.y / 0.27, 0.0, 1.0);
      transformed.x += 0.07 * sin(ph) * w * min(tempo, 1.5);
      transformed.y += 0.035 * max(0.0, cos(ph)) * w * min(tempo, 1.0);
    }
    if (aBein > 6.5) { float k = clamp((position.x - 0.37) / 0.25, 0.0, 1.0); transformed.y += k * 0.04 * sin(uZeit * 7.0 + ph0 + position.z * 20.0); transformed.z += k * 0.03 * sin(uZeit * 5.3 + ph0); }
    transformed.y += 0.006 * sin(uZeit * 44.0 * tempo + ph0) * min(tempo, 1.0);
  }`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}
/** Flügel: Adern, Schillern, Gegenlicht-Glanz; Instanz-Attribut aFlug (0 gefaltet … 1 Flug) und aPh */
export function fluegelMaterial(u, { instanz = true } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: "#E4EAF0", roughness: 0.18, metalness: 0.0, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false });
  const key = "fluegel" + nr++ + instanz;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
uniform float uZeit, uFlug; attribute float aSeite; attribute vec3 aHinge; attribute float aHinten; ${instanz ? "attribute float aFlug; attribute float aPh;" : ""} varying vec2 vUvF;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
  {
    vUvF = uv;
    float flug = ${instanz ? "aFlug" : "uFlug"}, ph0 = ${instanz ? "aPh" : "0.0"};
    vec3 v = transformed - aHinge;
    float a1 = aSeite * mix(0.14 + 0.06 * aHinten, 1.35 - 0.12 * aHinten, flug);
    v = vec3(v.x * cos(a1) + v.z * sin(a1), v.y, -v.x * sin(a1) + v.z * cos(a1));
    float a2 = -aSeite * flug * (0.25 + 0.95 * sin(uZeit * 157.0 + ph0 * 6.0 + aHinten * 0.4));
    v = vec3(v.x, v.y * cos(a2) - v.z * sin(a2), v.y * sin(a2) + v.z * cos(a2));
    transformed = aHinge + v;
  }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
uniform float uGlanz; varying vec2 vUvF;`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  {
    float ader = smoothstep(0.035, 0.0, abs(vUvF.y - 0.18 - 0.1 * vUvF.x)) + smoothstep(0.03, 0.0, abs(vUvF.y - 0.5 + 0.12 * vUvF.x)) * step(0.15, vUvF.x)
               + smoothstep(0.03, 0.0, abs(vUvF.x - 0.38 - 0.1 * vUvF.y)) * 0.7 + smoothstep(0.05, 0.0, abs(vUvF.y - 0.05)) * 1.2;
    float mal = smoothstep(0.05, 0.0, length(vUvF - vec2(0.28, 0.12)) - 0.03);              // Flügelmal
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.26, 0.2), clamp(ader * 0.75 + mal, 0.0, 1.0));
    diffuseColor.a = mix(diffuseColor.a, 0.9, clamp(ader * 0.6 + mal, 0.0, 1.0));
    diffuseColor.rgb += vec3(0.25, 0.18, 0.35) * sin(vUvF.x * 9.0 + vUvF.y * 5.0) * 0.12;    // Schillern
  }`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  totalEmissiveRadiance += vec3(1.0, 0.92, 0.78) * uGlanz * 0.22;`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}

// ----------------------------------------------------------------------------------------------- Straßen
function bereitePfad(punkte) {
  const P = punkte.map((q) => (Array.isArray(q) ? { p: q, n: [0, 1, 0] } : { p: q.p, n: q.n || [0, 1, 0] }));
  const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i].p[0] - P[i - 1].p[0], P[i].p[1] - P[i - 1].p[1], P[i].p[2] - P[i - 1].p[2]));
  return { P, L, laenge: L[L.length - 1] };
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3(), _n2 = new THREE.Vector3();
/** Punkt, Tangente und Normale bei Bogenlänge s (in out.p, out.t, out.n) */
function pfadBei(pf, s, out) {
  const { P, L } = pf; s = clamp(s, 0, pf.laenge);
  let lo = 0, hi = L.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= s) lo = m; else hi = m; }
  const f = L[hi] > L[lo] ? (s - L[lo]) / (L[hi] - L[lo]) : 0;
  _a.fromArray(P[lo].p); _b.fromArray(P[hi].p);
  out.p.copy(_a).lerp(_b, f); out.t.copy(_b).sub(_a).normalize();
  // Normale weich zwischen den Stützpunkten (Kante hinab: Übergang über ±4 mm)
  _n.fromArray(P[lo].n); _n2.fromArray(P[hi].n); out.n.copy(_n).lerp(_n2, smoothstep(0.35, 0.65, f)).normalize();
  return out;
}

// ----------------------------------------------------------------------------------------------- A) Arbeiterinnen
export class Ameisen {
  constructor(szene, { max = 2400, schatten = false } = {}) {
    this.max = max; this.u = { uZeit: { value: 0 }, uTempo: { value: 1 } };
    const geo = ameiseGeo("arbeiterin");
    this.tempoA = new THREE.InstancedBufferAttribute(new Float32Array(max), 1); this.phA = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    geo.setAttribute("aTempo", this.tempoA); geo.setAttribute("aPh", this.phA);
    this.mesh = new THREE.InstancedMesh(geo, ameisenMaterial(this.u), max); this.mesh.frustumCulled = false; this.mesh.castShadow = schatten; this.mesh.count = 0;
    const sg = new THREE.CircleGeometry(1, 12); sg.rotateX(-Math.PI / 2); sg.scale(0.36, 1, 0.2); sg.translate(-0.02, 0.004, 0);
    this.schatten = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), max);
    this.schatten.frustumCulled = false; this.schatten.count = 0; this.schatten.renderOrder = 2;
    const kg = new THREE.IcosahedronGeometry(0.075, 0); kg.translate(0.52, 0.2, 0);
    this.koerner = new THREE.InstancedMesh(kg, new THREE.MeshStandardMaterial({ color: "#B8A27C", roughness: 0.95 }), 200); this.koerner.frustumCulled = false; this.koerner.count = 0;
    szene.add(this.mesh, this.schatten, this.koerner);
    this._m = new THREE.Matrix4(); this._X = new THREE.Vector3(); this._Y = new THREE.Vector3(); this._Z = new THREE.Vector3();
    this._o = { p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3() };
    this.anzahl = 0;
  }
  zeige(an) { this.mesh.visible = this.schatten.visible = this.koerner.visible = an; return this; }
  _setze(i, p, vorn, oben, s) {
    const X = this._X.copy(vorn), Z = this._Z.crossVectors(X, oben).normalize(), Y = this._Y.crossVectors(Z, X).normalize();
    this._m.makeBasis(X.multiplyScalar(s), Y.multiplyScalar(s), Z.multiplyScalar(s)).setPosition(p);
    this.mesh.setMatrixAt(i, this._m); this.schatten.setMatrixAt(i, this._m);
  }
  update(t, { strassen = [], volk = 0, aktiv = 1, tempo = 1, draussen = 0.25, nest = null, nestBoden = null, nestRadius = 0.03, traeger = 0.3, gewusel = null } = {}) {
    this.u.uZeit.value = t;
    let i = 0, k = 0;
    const o = this._o, vorn = new THREE.Vector3(), oben = new THREE.Vector3();
    // Gewusel am Nesteingang
    if (nest) {
      const nN = volk < 1 ? 0 : Math.round((gewusel ?? (4 + 116 * dichte(volk))) * clamp(aktiv * 1.4));
      for (let j = 0; j < nN && i < this.max; j++, i++) {
        const r = lerp(0.003, nestRadius, Math.sqrt(hash(j, 11))), w0 = hash(j, 12) * 6.283, om = (0.25 + 0.5 * hash(j, 13)) * (hash(j, 14) < 0.5 ? -1 : 1) * tempo;
        const w = w0 + om * t + 0.6 * Math.sin(t * (0.7 + hash(j, 15)) + j);
        const rr = r * (0.75 + 0.25 * Math.sin(t * (0.5 + hash(j, 16)) + j * 2));
        const x = nest[0] + Math.cos(w) * rr, z = nest[2] + Math.sin(w) * rr * 0.8;
        const y = nestBoden ? nestBoden(x, z) : nest[1];
        o.p.set(x, y + 0.0002, z);
        vorn.set(-Math.sin(w) * Math.sign(om), 0, Math.cos(w) * Math.sign(om) * 0.8).normalize(); oben.set(0, 1, 0);
        const s = GROESSE.arbeiterin * (0.8 + 0.3 * hash(j, 17));
        this._setze(i, o.p, vorn, oben, s);
        this.tempoA.array[i] = tempo * (0.8 + 0.4 * hash(j, 18)); this.phA.array[i] = hash(j, 19) * 40;
        if (hash(j, 20) < traeger && k < 200) { this.koerner.setMatrixAt(k++, this._m); }
      }
    }
    // Straßen
    const pfade = strassen.map((s) => ({ ...s, pf: bereitePfad(s.punkte) })).filter((s) => s.pf.laenge > 0.01);
    const F = volk * draussen * clamp(aktiv);
    const summe = pfade.reduce((a, s) => a + (s.gewicht ?? 1), 0) || 1;
    pfade.forEach((s, si) => {
      const L = s.pf.laenge, cap = Math.floor(L / 0.0035), n = Math.min(cap, Math.round((F * (s.gewicht ?? 1) * clamp(s.anteil ?? 1)) / summe));
      const br = s.breite ?? 0.007;
      for (let j = 0; j < n && i < this.max; j++, i++) {
        const seed = 100 + si * 37, rueck = hash(j, seed) < 0.5;
        const v = (0.02 + 0.02 * hash(j, seed + 1)) * tempo, ph = hash(j, seed + 2);
        const lauf = ph * L + v * t + 0.006 * Math.sin(t * (0.9 + hash(j, seed + 3)) + j);
        const sp = fr(lauf / L) * L, sPos = rueck ? L - sp : sp;
        // Ende der Straße (anteil < 1: Straße wächst vom Nest weg)
        const reich = L * clamp(s.anteil ?? 1);
        const sEff = sPos * (reich / L);
        pfadBei(s.pf, sEff, o);
        const quer = new THREE.Vector3().crossVectors(o.t, o.n).normalize();
        const lat = (hash(j, seed + 4) - 0.5) * br + 0.0012 * Math.sin(t * 3 + j);
        o.p.addScaledVector(quer, lat).addScaledVector(o.n, 0.0002);
        vorn.copy(o.t).multiplyScalar(rueck ? -1 : 1).addScaledVector(quer, 0.25 * Math.sin(t * 4 + j * 1.7)).normalize();
        oben.copy(o.n);
        this._setze(i, o.p, vorn, oben, GROESSE.arbeiterin * (0.78 + 0.32 * hash(j, seed + 5)));
        this.tempoA.array[i] = v / 0.03; this.phA.array[i] = hash(j, seed + 6) * 40;
      }
    });
    this.anzahl = i;
    this.mesh.count = this.schatten.count = i; this.koerner.count = k;
    this.mesh.instanceMatrix.needsUpdate = this.schatten.instanceMatrix.needsUpdate = true; this.koerner.instanceMatrix.needsUpdate = true;
    this.tempoA.needsUpdate = this.phA.needsUpdate = true;
    return this;
  }
}

// ----------------------------------------------------------------------------------------------- B) Königin
export class Koenigin {
  constructor(szene, { groesse = GROESSE.koenigin, schatten = true } = {}) {
    this.g = groesse; this.u = { uZeit: { value: 0 }, uTempo: { value: 0 }, uFlug: { value: 0 }, uGlanz: { value: 0 } };
    this.koerper = new THREE.Mesh(ameiseGeo("koenigin"), ameisenMaterial(this.u, { instanz: false })); this.koerper.castShadow = schatten; this.koerper.matrixAutoUpdate = false;
    const sg = new THREE.CircleGeometry(1, 16); sg.rotateX(-Math.PI / 2); sg.scale(0.42, 1, 0.24); sg.translate(-0.05, 0.004, 0);
    this.schatten = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.schatten.matrixAutoUpdate = false; this.schatten.renderOrder = 2;
    // vier Flügel als eigene Meshes (lösen sich einzeln); jede Geometrie enthält nur einen Flügel
    const alle = fluegelGeo("gyne"), n = alle.getAttribute("position").count / 4;
    this.fluegel = [];
    for (let w = 0; w < 4; w++) {
      const g = new THREE.BufferGeometry();
      for (const name of ["position", "normal", "uv", "aSeite", "aHinge", "aHinten"]) { const a = alle.getAttribute(name); g.setAttribute(name, new THREE.Float32BufferAttribute(a.array.slice(w * n * a.itemSize, (w + 1) * n * a.itemSize), a.itemSize)); }
      const uw = { ...this.u, uFlug: { value: 0 } };
      const m = new THREE.Mesh(g, fluegelMaterial(uw, { instanz: false })); m.matrixAutoUpdate = false; m.renderOrder = 3; m.userData.u = uw;
      this.fluegel.push(m);
    }
    szene.add(this.koerper, this.schatten, ...this.fluegel);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._qf = new THREE.Quaternion();
  }
  _basis(pos, yaw, normale, s) {
    const oben = new THREE.Vector3(...normale).normalize(), vorn = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    vorn.addScaledVector(oben, -vorn.dot(oben)).normalize();
    const Z = new THREE.Vector3().crossVectors(vorn, oben).normalize(), Y = new THREE.Vector3().crossVectors(Z, vorn);
    return new THREE.Matrix4().makeBasis(vorn.multiplyScalar(s), Y.multiplyScalar(s), Z.multiplyScalar(s)).setPosition(new THREE.Vector3(...pos));
  }
  update(t, { sichtbar = true, pos = [0, 0, 0], yaw = 0, tempo = 0, flug = 0, fluegelAb = 0, ablage = null, versinken = 0, glanz = 0, normale = [0, 1, 0] } = {}) {
    this.u.uZeit.value = t; this.u.uTempo.value = tempo; this.u.uGlanz.value = glanz;
    const s = this.g, p = [pos[0], pos[1] - 0.009 * smoothstep(0, 1, versinken), pos[2]];
    const M = this._basis(p, yaw, normale, s);
    this.koerper.matrix.copy(M); this.schatten.matrix.copy(this._basis(pos, yaw, normale, s));
    this.koerper.visible = sichtbar && versinken < 0.999; this.schatten.visible = this.koerper.visible && versinken < 0.4;
    this.schatten.material.opacity = 0.35 * (1 - smoothstep(0, 0.4, versinken));
    const ab = ablage || pos;
    for (let w = 0; w < 4; w++) {
      const f = this.fluegel[w], a = clamp((fluegelAb - w * 0.17) / 0.3);
      f.userData.u.uFlug.value = a > 0 ? 0 : flug;
      if (a <= 0) { f.matrix.copy(M); f.visible = sichtbar; continue; }
      // abgelöster Flügel: kippt zur Seite und fällt flach neben die Ablage (Bogen, Flattern), bleibt dort liegen
      const seite = w < 2 ? 1 : -1, ziel = [ab[0] + seite * 0.006 + 0.004 * (w % 2) - 0.003, ab[1] + 0.0004 + 0.0002 * w, ab[2] + 0.004 * (w % 2) - 0.002 + seite * 0.003];
      const yawZ = yaw + seite * (1.2 + 0.4 * w), Z = this._basis(ziel, yawZ, [0, 1, 0], s);
      const e = smoothstep(0, 1, a), A = new THREE.Vector3(), B = new THREE.Vector3(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), sv = new THREE.Vector3();
      M.decompose(A, qa, sv); Z.decompose(B, qb, sv);
      const P = A.clone().lerp(B, e); P.y += Math.sin(e * Math.PI) * 0.006;
      const q = qa.clone().slerp(qb, e), wack = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.sin(t * 9 + w) * 0.5 * (1 - e) * e * 4);
      q.multiply(wack);
      f.matrix.compose(P, q, sv.setScalar(s)); f.visible = true;
    }
    return this;
  }
}

// ----------------------------------------------------------------------------------------------- C) Schwarm
const PUNKT_V = /* glsl */ `
attribute float aGroesse; attribute float aHell; uniform float uPx, uMin; varying float vHell; varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float px = aGroesse * uPx / max(-mv.z, 0.001);
  gl_PointSize = clamp(px, uMin, 6.0);
  vA = clamp(px / uMin, 0.25, 1.0) * step(0.001, aGroesse);
  vHell = aHell;
  gl_Position = projectionMatrix * mv;
}`;
const PUNKT_F = /* glsl */ `
varying float vHell; varying float vA;
void main() {
  vec2 q = gl_PointCoord - 0.5; float d = length(q);
  float a = smoothstep(0.5, 0.15, d) * vA;
  if (a < 0.01) discard;
  vec3 dunkel = vec3(0.035, 0.03, 0.028), hell = vec3(1.0, 0.86, 0.62) * 1.6;
  gl_FragColor = vec4(mix(dunkel, hell, clamp(vHell, 0.0, 1.0)) * (1.0 + max(vHell - 1.0, 0.0)), a);
}`;
export class Schwarm {
  constructor(szene, { max = 1500, schatten = false } = {}) {
    this.max = max; this.u = { uZeit: { value: 0 }, uGlanz: { value: 0 } };
    const geo = ameiseGeo("gyne"), wg = fluegelGeo("gyne");
    this.tempoA = new THREE.InstancedBufferAttribute(new Float32Array(max), 1); this.phA = new THREE.InstancedBufferAttribute(new Float32Array(max), 1); this.flugA = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    geo.setAttribute("aTempo", this.tempoA); geo.setAttribute("aPh", this.phA);
    wg.setAttribute("aFlug", this.flugA); wg.setAttribute("aPh", this.phA);
    this.koerper = new THREE.InstancedMesh(geo, ameisenMaterial(this.u), max); this.koerper.castShadow = schatten;
    this.fluegel = new THREE.InstancedMesh(wg, fluegelMaterial(this.u), max); this.fluegel.renderOrder = 3;
    for (const m of [this.koerper, this.fluegel]) { m.frustumCulled = false; m.count = 0; }
    const pg = new THREE.BufferGeometry();
    this.pPos = new Float32Array(max * 3); this.pGr = new Float32Array(max); this.pHell = new Float32Array(max);
    pg.setAttribute("position", new THREE.BufferAttribute(this.pPos, 3)); pg.setAttribute("aGroesse", new THREE.BufferAttribute(this.pGr, 1)); pg.setAttribute("aHell", new THREE.BufferAttribute(this.pHell, 1));
    this.pu = { uPx: { value: 1000 }, uMin: { value: 1.6 } };
    this.punkte = new THREE.Points(pg, new THREE.ShaderMaterial({ vertexShader: PUNKT_V, fragmentShader: PUNKT_F, uniforms: this.pu, transparent: true, depthWrite: false }));
    this.punkte.frustumCulled = false; this.punkte.renderOrder = 4;
    szene.add(this.koerper, this.fluegel, this.punkte);
    this._m = new THREE.Matrix4(); this.anzahl = 0;
  }
  zeige(an) { this.koerper.visible = this.fluegel.visible = this.punkte.visible = an; return this; }
  _pose(i, t, o) {
    const { modus } = o, h = (k) => hash(i, 700 + k);
    if (modus === "tanzen") {
      const B = o.bereich, r = B.radius * Math.sqrt(h(1)), w = h(2) * 6.283, x0 = B.mitte[0] + Math.cos(w) * r, z0 = B.mitte[2] + Math.sin(w) * r, y0 = B.mitte[1] + B.hoehe * h(3);
      const om = 0.6 + 0.8 * h(4), a = 0.25 + 0.5 * h(5);
      const p = [x0 + a * Math.sin(om * t + h(6) * 9) + 0.05 * Math.sin(5.1 * t + i), y0 + 0.3 * a * Math.sin(om * 1.3 * t + h(7) * 9) + 0.04 * Math.sin(7.3 * t + i), z0 + a * Math.cos(om * 0.8 * t + h(8) * 9)];
      return { p, flug: 1, sicht: 1 };
    }
    if (modus === "landen") {
      const B = o.bereich, r = B.radius * Math.sqrt(h(1)), w = h(2) * 6.283, x = B.mitte[0] + Math.cos(w) * r, z = B.mitte[2] + Math.sin(w) * r;
      const ts = o.t0 + o.dauer * h(3), y0 = (o.boden ? o.boden(x, z) : B.mitte[1]) + 0.0002;
      if (t < ts) { const e = clamp((ts - t) / 2.5); return { p: [x + 0.3 * e * Math.sin(t * 2 + i), y0 + B.hoehe * e * e, z + 0.3 * e * Math.cos(t * 1.7 + i)], flug: 1, sicht: e < 1 ? 1 : 0 }; }
      const lauf = (t - ts) * 0.012, ri = h(4) * 6.283;
      return { p: [x + Math.cos(ri) * lauf, y0, z + Math.sin(ri) * lauf], flug: smoothstep(0.6, 0, t - ts), sicht: 1, boden: true, yaw: ri, tempo: 1 };
    }
    // aufstieg
    const ts = o.t0 + o.dauer * Math.pow(h(1), 1.3);
    const Q = o.quellen ? o.quellen[Math.floor(h(9) * o.quellen.length) % o.quellen.length] : o.quelle;
    const w = h(2) * 6.283, r = o.streu * Math.sqrt(h(3));
    const qx = Q[0] + Math.cos(w) * r, qz = Q[2] + Math.sin(w) * r, qy = Q[1] + 0.0003;
    if (t < ts - o.krabbeln) return null;
    if (t < ts) {                                   // krabbelt aus der Fuge, läuft unruhig, hebt die Flügel
      const k = (t - (ts - o.krabbeln)) / o.krabbeln, ri = h(4) * 6.283 + Math.sin(t * 2 + i) * 0.8;
      return { p: [qx + Math.cos(ri) * 0.01 * k, qy, qz + Math.sin(ri) * 0.01 * k], flug: k > 0.85 ? (k - 0.85) * 2 : 0, sicht: 1, boden: true, yaw: ri, tempo: 1.4 };
    }
    const d = t - ts, v = o.steig * (0.7 + 0.6 * h(5)), om = 1.2 + 1.6 * h(6), R = Math.min(0.5, 0.06 + 0.12 * d) * (0.5 + h(7));
    const y = qy + v * d * (1 - Math.exp(-d * 3)) + 0.02 * d;
    const p = [qx + Math.cos(om * d + w) * R + o.wind[0] * d * d * 0.3 + (h(8) - 0.5) * d * 0.4, y, qz + Math.sin(om * d + w) * R + o.wind[1] * d * d * 0.3 + (h(10) - 0.5) * d * 0.4];
    return { p, flug: 1, sicht: 1 - smoothstep(o.hoehe * 0.7, o.hoehe, y - qy) };
  }
  update(t, kamera, { modus = "aufstieg", anzahl = 0, t0 = 0, dauer = 4, quelle = [0, 0, 0], quellen = null, streu = 0.03, krabbeln = 2, steig = 0.9, hoehe = 18,
    wind = [0.25, -0.1], bereich = { mitte: [0, 1, -3], radius: 3, hoehe: 2 }, boden = null, sonne = [0, 0.2, -1], glanz = 1, punkte = 1 } = {}) {
    this.u.uZeit.value = t; this.u.uGlanz.value = glanz * 0.6;
    const o = { modus, t0, dauer, quelle, quellen, streu, krabbeln, steig, hoehe, wind, bereich, boden };
    const S = new THREE.Vector3(...sonne).normalize(), kp = kamera.position, sv = new THREE.Vector3(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    this.pu.uPx.value = 1920 / (2 * Math.tan(THREE.MathUtils.degToRad(kamera.fov) / 2)); this.pu.uMin.value = 1.6;
    let n = 0;
    const N = Math.min(this.max, Math.round(anzahl));
    for (let i = 0; i < N; i++) {
      const z = this._pose(i, t, o);
      if (!z || z.sicht <= 0.01) continue;
      const gr = (hash(i, 790) < 0.4 ? GROESSE.maennchen : GROESSE.gyne) * (0.9 + 0.2 * hash(i, 791)) * (0.4 + 0.6 * z.sicht);
      // Ausrichtung: im Flug Bewegungsrichtung (aus dem nächsten Zeitschritt), am Boden yaw
      let vorn;
      if (z.boden) vorn = X.set(Math.cos(z.yaw), 0, -Math.sin(z.yaw));
      else { const z2 = this._pose(i, t + 0.04, o); vorn = X.set(z2 ? z2.p[0] - z.p[0] : 1, z2 ? (z2.p[1] - z.p[1]) * 0.4 : 0, z2 ? z2.p[2] - z.p[2] : 0); if (vorn.lengthSq() < 1e-10) vorn.set(1, 0, 0); vorn.normalize(); }
      Z.crossVectors(vorn, up).normalize(); Y.crossVectors(Z, vorn).normalize();
      this._m.makeBasis(X.clone().multiplyScalar(gr), Y.clone().multiplyScalar(gr), Z.clone().multiplyScalar(gr)).setPosition(z.p[0], z.p[1], z.p[2]);
      this.koerper.setMatrixAt(n, this._m); this.fluegel.setMatrixAt(n, this._m);
      this.tempoA.array[n] = z.tempo || 0; this.phA.array[n] = hash(i, 792) * 40; this.flugA.array[n] = z.flug;
      // Glitzerpunkt: nur in der Ferne (≥ 0,5 m), heller im Gegenlicht und mit dem Flügelschlag (je Bild anders)
      sv.set(z.p[0] - kp.x, z.p[1] - kp.y, z.p[2] - kp.z); const dist = sv.length(); sv.divideScalar(dist || 1);
      const gegen = Math.pow(Math.max(0, sv.dot(S)), 3), blitz = hash(i * 131 + Math.floor(t * 30), 793);
      this.pPos.set(z.p, n * 3);
      this.pGr[n] = punkte * gr * 1.4 * smoothstep(1.0, 2.6, dist) * (z.boden ? 0 : 1);
      this.pHell[n] = glanz * (0.15 + 1.4 * gegen * (0.4 + 0.6 * blitz) + 0.25 * blitz * z.flug);
      n++;
    }
    for (let k = n; k < Math.min(this.max, this.anzahl + 1); k++) this.pGr[k] = 0;
    this.anzahl = n;
    this.koerper.count = this.fluegel.count = n;
    this.punkte.geometry.setDrawRange(0, n);
    this.koerper.instanceMatrix.needsUpdate = this.fluegel.instanceMatrix.needsUpdate = true;
    this.tempoA.needsUpdate = this.phA.needsUpdate = this.flugA.needsUpdate = true;
    for (const a of ["position", "aGroesse", "aHell"]) this.punkte.geometry.getAttribute(a).needsUpdate = true;
    return this;
  }
}
