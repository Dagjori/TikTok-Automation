// Baustein „Myzel“ (Account 2 @stelldirvor.pov, Erstbau 08.11.2026) – leuchtendes Pilzgeflecht des Dunklen Hallimasch (Armillaria ostoyae)
// für „Was wäre, wenn du 2.400 Jahre einem Pilzgeflecht zusiehst?“ (965 ha ≈ Kreis mit r ≈ 1.750 m). Nur Three.js, alles prozedural,
// jedes Bild eine reine Funktion von t und den update-Parametern (feste Seeds, kein Zustand zwischen Bildern).
//
// ===================================================================================================================== API
//
// import { MyzelDecke, MyzelBoden, fruchtkoerper, pilzMaterial } from "../../engine/myzel.js";
//
// A) MyzelDecke – Geflecht als Leuchten im Waldboden der Waldlichtung (engine/welt_waldlichtung.js, folgt hoehe(x,z) + 0,03 m)
//    const decke = new MyzelDecke(szene, { mitte: [-110, -40], rMax: 1800, seed: 3, huete: 120 });
//      mitte  [x, z] Weltmeter, Keimpunkt der Kolonie (am besten im Wald, Lichtungsmaß > 1,2: dort kein Gras, das die Fäden verdeckt)
//      rMax   größter Radius, der je gebraucht wird (m); bestimmt die Netzgröße (Standard 1800 → 965 ha passen hinein)
//      huete  Zahl der Pilzbüschel-Instanzen (Standard 120, verteilt log-gleichmäßig 0,6 … 90 m um die Mitte)
//    decke.update(t, { radius, deckung = 1, glanz = 1, farbe = "#E6FFF0", front = 1, huete = 0, r0 = 2, nebel = null })
//      radius   aktueller Radius der Kolonie in m (0 … rMax). Rand = unruhige Wachstumsfront mit Lappen, Rhizomorph-Stränge laufen 4 % voraus
//      deckung  0..1 Dichte: wie viele Faden-Oktaven sichtbar sind (0,2 = nur Hauptstränge, 1 = volles Netz)
//      glanz    Helligkeit (HDR, additiv; ≥ 1 erzeugt mit dem Bloom von kern.js Leuchten). Tag: 1,2–2, Dämmerung/Nacht: 0,6–1
//      farbe    Farbe des Leuchtens (Hex oder THREE.Color), front 0..1 Stärke des Leuchtsaums an der Front
//      huete    0..1 Pilzbüschel (Hallimasch, honiggelb-braun) sprießen im Moos; nur Büschel innerhalb 0,85·radius und erst ab radius > r0
//      nebel    Extinktion je m für das Leuchten (Standard: szene.fog.density · 0,7), damit es in der Ferne im Dunst verschwindet
//    Level of Detail: Fäden sind Iso-Linien von Rauschen im Fragment-Shader (keine Liniengeometrie). Jede Oktave (Stränge 8 … 512 um den
//    Mittelpunkt in log-polaren Koordinaten = natürliche Verzweigung, dazu ein kartesisches Netz 0,15 … 150 m) wird pixelgenau gezeichnet
//    (Breite ≥ 1 px, Energie erhalten) und geht in ihren Mittelwert über, sobald sie feiner als ein paar Pixel wird → von 5 m bis 1.750 m
//    lesbar, ohne Flimmern. Geometrie: Nahgitter exakt auf dem 2-m-Gitter des Lichtungsbodens + Ferngitter exakt auf dem 65-m-Gitter
//    des Fernbodens (≈ 144k Vertices). Die Muster liegen fest in Weltkoordinaten (schwimmen nicht, wenn der Radius wächst).
//    decke.gruppe (THREE.Group), decke.vertices, decke.zeige(bool)
//
// B) MyzelBoden – Querschnitt durch den Waldboden als eigene kleine Welt (Diorama) an einer beliebigen Weltposition
//    const boden = new MyzelBoden(szene, { pos: [0, -2000, 0], breite: 4.6, tiefe: 3.0, seed: 7, tanneX: 0.85, keim: [-1.45, -0.5] });
//      pos     Weltposition des Schnitts (Mitte der Schnittkante an der Oberfläche). Weit weg von der Welt legen (z. B. 2 km unter dem
//              Gelände): die eigene Rückwand (Waldkulisse, 16 m Halbzylinder) verdeckt alles dahinter, Bodenplatten der Welt sind von unten unsichtbar.
//      breite  Breite der Schnittfläche (m), tiefe = Bodentiefe (m). Lokale Achsen: x rechts, y oben (Oberfläche y = 0), Schnittfläche z = 0
//              zeigt nach +z (zur Kamera). Tanne bei x = +0,85 (junge Weißtanne, 4,6 m), Keimpunkt des Myzels bei (−1,45 | −0,5).
//    boden.update(t, { wachstum = 0, befall = 0, glanz = 1, licht = 1 })
//      wachstum 0..1  Myzel wächst vom Keimpunkt nach außen (Rhizomorphe voraus, feine Hyphen dahinter); ≈ 0,5 erreichen die ersten Fäden die
//                     Tannenwurzel, danach dringen sie ein (weiße Myzelfächer unter der Rinde, wachsen bis 1,0 die Wurzel entlang)
//      befall   0..1  Wurzel färbt sich vom Eintrittspunkt aus schwarzbraun, die Tanne darüber wird rostbraun (ab ≈ 0,35), ab 0,6 Hallimasch-Büschel am Stammfuß
//      glanz          Helligkeit des Myzels und seines Lichts, licht = Grundlicht des Dioramas (Mond-/Waldlicht)
//    boden.zeige(true|false)  schaltet die Gruppe (samt Licht) ein/aus; Standard aus. boden.gruppe (THREE.Group), boden.vertices
//    boden.kamera(art) → { pos:[x,y,z], ziel:[x,y,z], fov }  feste Einstellungen in Weltkoordinaten:
//      "total" (ganzer Schnitt + Tanne, Hochkant, fov 60), "wurzel" (nah an einem Eintrittspunkt in eine dicke Tannenwurzel, fov 50),
//      "keim" (nah am Keimpunkt, fov 52), "boden" (nur Erde, etwas näher, fov 56). Eigene Einstellungen: lokale Koordinate + boden.pos.
//    boden.kontakt / boden.kontaktNah [x, y] lokal: erster Eintrittspunkt (Mitte der Schwarzfärbung) bzw. der für die Nahansicht.
//    Licht: ausschließlich in den eigenen Shadern (Schlüssellicht, Himmel/Boden-Umgebung, Gegenlicht, 8 Myzel-Lichtpunkte) – es gibt KEINE
//    THREE-Lichter, also beeinflusst das Diorama die Szene nicht, Szenenlichter beeinflussen das Diorama nicht, und alles schaltet mit gruppe.visible.
//    Nebel/Dunst ebenfalls eigen (fog: false).
//
//    Harter Schnitt mit der Kamera (in welt.update(t), Beispiel PovKamera aus stil_lunar_pov.js):
//      const imSchnitt = t >= T_SCHNITT && t < T_ZURUECK;
//      boden.zeige(imSchnitt); decke.zeige(!imSchnitt);
//      if (imSchnitt) { const k = boden.kamera("total"); pov.fov = k.fov; pov.posKeys = [{ t: 0, v: k.pos }]; pov.zielKeys = [{ t: 0, v: k.ziel }]; }
//      else { … normale Kamera … }
//      pov.anwenden(t); boden.update(t, { wachstum, befall });
//    Während des Schnitts Partikel/Puffs, die der Kamera folgen (Pollen, Schnee, Laub), auf deckkraft 0 setzen; Himmel darf bleiben (Rückwand verdeckt ihn).
//    Post-Werte (kern.js): im Schnitt z. B. belichtung 1,0, bloomStaerke 1,2–1,4, bloomSchwelle 0,9, vignette 0,25.
//    Ein Schnitt ins Diorama ist ein harter Szenensprung → im Protokoll als { typ: "kamera", art: "schnitt" } melden (höchstens 1–3 im Video).
//
// C) fruchtkoerper(n = 9, seed = 1) → THREE.BufferGeometry: Büschel aus n Hallimasch-Fruchtkörpern (Hut 2–4,5 cm, honiggelb mit dunkler
//    schuppiger Mitte, heller Stiel mit Ring), Ursprung = Bodenmitte des Büschels, Meter, Vertexfarben im Attribut "color".
//    pilzMaterial() → MeshStandardMaterial (vertexColors), wird von Szenenlichtern beleuchtet. Beispiel:
//      const m = new THREE.Mesh(fruchtkoerper(12, 5), pilzMaterial()); m.position.set(x, hoehe(x, z), z); szene.add(m);
//
// Maße: Hyphen ≈ 1–2 mm (gezeichnet pixelgenau), Rhizomorphe 4–6 mm, Hallimasch-Hut 2–4,5 cm.
// Umfang: Decke ≈ 144k Vertices Netz (+ ≈ 110k in 120 Pilzbüscheln), Boden ≈ 343k Vertices (≈ 3.500 Hyphen-Bänder), keine Texturen;
// Bauzeit im Browser < 1 s. Test: projekte/_test-myzel (node render.js projekte/_test-myzel --zeiten 1,3,5,7,9,11,13,15 --worker 1).
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { hoehe } from "./welt_waldlichtung.js";

const C = (h) => (h && h.isColor ? h.clone() : new THREE.Color(h));

/** deterministischer Zufall (mulberry32) */
function zufall(seed) {
  let a = (seed | 0) * 2654435761 + 1013904223;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --------------------------------------------------------------------------------------------- GLSL: Rauschen (robuster Hash, auch für große Koordinaten)
const GLSL_MYZ = /* glsl */ `
float mh(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float mvn(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mh(i), mh(i + vec2(1.0, 0.0)), u.x), mix(mh(i + vec2(0.0, 1.0)), mh(i + vec2(1.0, 1.0)), u.x), u.y); }
float mfbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * mvn(p); p = p * 2.03 + vec2(17.1, 9.3); a *= 0.5; } return s; }
vec2 mgr(vec2 i, float P) { i.y = mod(i.y, P); float a = 6.2831853 * mh(i); return vec2(cos(a), sin(a)); }
// Gradientenrauschen (≈ −0,7 … 0,7), periodisch in y mit Periode P (ganzzahlig)
float mgn(vec2 p, float P) { vec2 i = floor(p), f = fract(p), u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(mgr(i, P), f), b = dot(mgr(i + vec2(1.0, 0.0), P), f - vec2(1.0, 0.0));
  float c = dot(mgr(i + vec2(0.0, 1.0), P), f - vec2(0.0, 1.0)), d = dot(mgr(i + vec2(1.0, 1.0), P), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
vec3 mzelle(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0; float id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 o = vec2(mh(i + g), mh(i + g + 7.7));
    float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; id = mh(i + g + 3.1); } else if (d < d2) d2 = d; }
  return vec3(d1, d2, id); }
`;

// =============================================================================================== A) MyzelDecke
const NAH = { x0: -350, z0: -650, d: 2, nx: 350, nz: 400 };           // = Waldlichtung._boden „nah“ (700 × 800 m, 350 × 400 Felder)
const FERN = { x0: -13000, z0: -21000, d: 65, nx: 400, nz: 400 };     // = Waldlichtung._boden „fern“ (26 km, 400 × 400 Felder, Mitte z −8000)
const fernHoehe = (x, z) => { let y = hoehe(x, z); if (Math.abs(x) < 360 && z < 160 && z > -660) y -= 4; return y; };

/** Teilgitter eines Bodengitters mit identischer Dreiecksteilung (PlaneGeometry: Diagonale (ix, iz+1)–(ix+1, iz)) */
function teilGitter(G, ix0, ix1, iz0, iz1, hFn) {
  ix0 = clamp(ix0, 0, G.nx); ix1 = clamp(ix1, 0, G.nx); iz0 = clamp(iz0, 0, G.nz); iz1 = clamp(iz1, 0, G.nz);
  const w = ix1 - ix0 + 1, h = iz1 - iz0 + 1;
  if (w < 2 || h < 2) return null;
  const pos = new Float32Array(w * h * 3);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = G.x0 + (ix0 + i) * G.d, z = G.z0 + (iz0 + j) * G.d, k = (j * w + i) * 3;
    pos[k] = x; pos[k + 1] = hFn(x, z); pos[k + 2] = z;
  }
  const idx = new Uint32Array((w - 1) * (h - 1) * 6);
  let o = 0;
  for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) {
    const a = j * w + i, b = (j + 1) * w + i, c = (j + 1) * w + i + 1, d = j * w + i + 1;
    idx[o++] = a; idx[o++] = b; idx[o++] = d; idx[o++] = b; idx[o++] = c; idx[o++] = d;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return g;
}

const DECKE_V = /* glsl */ `
uniform float uLift;
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0); w.y += uLift; vW = w.xyz;
  vec4 mv = viewMatrix * w;
  float dd = length(mv.xyz);
  mv.xyz *= max(0.0, 1.0 - (0.015 + 0.0011 * dd) / max(dd, 1e-3));   // leicht zur Kamera ziehen: kein Z-Fighting mit dem Boden
  gl_Position = projectionMatrix * mv;
}`;

const DECKE_F = /* glsl */ `
uniform vec2 uMitte; uniform float uR, uDeck, uGlanz, uZeit, uFront, uNebel, uFern; uniform vec3 uFarbe;
varying vec3 vW;
${GLSL_MYZ}
// Iso-Linie n = 0, physikalische Breite wM (m) bei Pixelgröße px (m); pixelgenau (≥ 1 px, Energie erhalten mit Mindestsichtbarkeit mv),
// geht in den Mittelwert über, wenn die Linienschar feiner als wenige Pixel wird (fwidth groß) → kein Flimmern bei großen Radien.
float iso(float n, float wM, float px, float mv) {
  float fw = max(fwidth(n), 1e-6);
  float dpx = abs(n) / fw;
  float wpx = wM / px;
  float dw = max(wpx, 1.0);
  float kern = 1.0 - smoothstep(dw * 0.5 - 0.35, dw * 0.5 + 0.7, dpx);
  float halo = exp(-dpx / (dw * 1.5 + 1.5)) * 0.1;
  float stark = clamp(wpx, mv, 1.0);
  float l = (kern + halo) * stark;
  float avg = stark * clamp((dw + 1.0) * fw * 0.3, 0.0, 0.035);
  return mix(l, avg, smoothstep(0.1, 0.35, fw));
}
void main() {
  vec2 p = vW.xz, q = p - uMitte;
  float d = max(length(q), 0.02);
  float px = sqrt(length(dFdx(vW)) * length(dFdy(vW))) + 1e-5;
  float th = atan(q.y, q.x) / 6.2831853 + 0.5;
  float u = log(d);
  // Wachstumsfront mit Lappen (Form hängt am Radius → wandert mit, Muster innen bleiben fest)
  float lob = mgn(vec2(th * 12.0, log(uR + 1.0) * 0.9), 12.0) * 0.9 + mgn(vec2(th * 36.0, 3.1 + log(uR + 1.0) * 0.4), 36.0) * 0.45;
  float rf = max(uR * (0.9 + 0.17 * lob), 0.001);
  float soft = max(rf * 0.03, px * 2.0);
  float innen = 1.0 - smoothstep(rf - soft, rf + soft, d);
  float sInnen = 1.0 - smoothstep(rf * 1.05 - soft, rf * 1.05 + soft, d);
  float saum = exp(-pow((d - rf) / max(rf * 0.045, px * 3.0), 2.0)) * innen;
  float alt = 0.55 + 0.45 * smoothstep(0.0, 0.75, d / rf);            // innen älter, etwas matter
  // Rhizomorph-Stränge: log-polare Iso-Linien, Zahl der Stränge verdoppelt sich je Oktave → Verzweigung über alle Maßstäbe
  float str = 0.0;
  for (int k = 0; k < 7; k++) {
    float fk = float(k);
    float N = 8.0 * pow(2.0, fk);
    vec2 s = vec2(u * N * 0.028 + fk * 5.3, th * N);
    float w1 = mgn(vec2(s.x * 1.9 + 2.0, s.y * 0.5), N * 0.5);
    s.y += 0.6 * w1;
    float n = mgn(s, N);
    float wM = 0.0055 * pow(0.72, fk);
    float I = 1.7 * pow(0.62, fk);
    float an = smoothstep(fk / 7.0 - 0.12, fk / 7.0 + 0.08, uDeck);
    float vorn = 1.0 - smoothstep(0.75, 1.0, d / (rf * 1.05)) * smoothstep(1.0, 5.0, fk);   // feine Oktaven erst hinter der Front
    str += iso(n, wM, px, fk < 2.0 ? 0.32 : 0.2) * I * an * vorn;
  }
  // Feines Netz (kartesisch): verzogene Voronoi-Kanten, in Stücke gebrochen → offene, verknüpfte Fäden statt Zellen; 0,25 m … 64 m
  float netz = 0.0, sc = 0.25;
  for (int k = 0; k < 5; k++) {
    float fk = float(k);
    vec2 r = p / sc + fk * 7.31;
    r += 0.6 * vec2(mgn(r * 0.5 + 1.7, 1e6), mgn(r * 0.5 + 9.2, 1e6));
    vec3 z = mzelle(r);
    float e = (z.y - z.x) * 0.5;
    float stueck = smoothstep(0.45, 0.65, mvn(r * 1.3 + fk * 3.3));
    float an = smoothstep(fk / 5.0 - 0.15, fk / 5.0 + 0.1, uDeck * 1.1);
    netz += iso(e, sc * 0.005, px, 0.04) * stueck * (0.38 - 0.04 * fk) * an;
    sc *= 4.0;
  }
  // Flecken: Moos, Wurzeln, Steine verdecken – fest in der Welt; feine Stufe blendet bei großen Pixeln aus
  float fl1 = mix(0.72, smoothstep(0.25, 0.7, mfbm(p * 0.45 + 3.0)), 1.0 - smoothstep(0.4, 2.0, px * 0.45));
  float fl2 = 0.55 + 0.45 * smoothstep(0.2, 0.75, mfbm(p * 0.012 + 11.0));
  float fl = mix(0.2, 1.0, fl1) * fl2;
  float puls = 0.86 + 0.14 * sin(u * 7.0 - uZeit * 1.6 + 2.0 * mvn(p * 0.05));
  float lum = (str * sInnen * 1.0 + netz * innen * 0.75) * fl * alt * puls;
  lum += innen * (0.01 + 0.03 * smoothstep(0.3, 3.0, px)) * uDeck * fl2 + saum * uFront * 0.3 * fl;   // aus großer Höhe: Fläche leuchtet leicht   // Schimmer unter der Streu + Leuchtsaum der Front
  float dk = length(vW - cameraPosition);
  lum *= exp(-uNebel * dk);
  float keep = 1.0;
  if (uFern > 0.5 && abs(p.x) < 350.0 && p.y > -650.0 && p.y < 150.0) keep = 0.0;   // Ferngitter nur außerhalb des Nahbodens
  if (keep < 0.5 || lum < 1e-4) discard;
  gl_FragColor = vec4(uFarbe * lum * uGlanz, 1.0);
}`;

/** Material für Pilzbüschel in der Welt (Szenenlicht) */
export function pilzMaterial() {
  return new THREE.MeshStandardMaterial({ color: "#FFFFFF", vertexColors: true, roughness: 0.62, metalness: 0, flatShading: false });
}

/**
 * Hallimasch-Büschel: n Fruchtkörper (Hut 2–4,5 cm), Ursprung = Bodenmitte, Meter. Rückgabe BufferGeometry mit "color".
 * Hut honiggelb, Mitte dunkler mit Schuppen, Rand heller, Lamellen cremeweiß; Stiel hell, unten braun, mit Ring.
 */
export function fruchtkoerper(n = 9, seed = 1) {
  const rnd = zufall(seed * 7919 + 13), teile = [];
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.283, rr = 0.012 + 0.06 * Math.sqrt(rnd()), jung = rnd() < 0.3;
    const h = (jung ? 0.035 : 0.06) + 0.06 * rnd(), R = (jung ? 0.012 : 0.02) + (jung ? 0.008 : 0.025) * rnd();
    const neig = 0.15 + 0.35 * (rr / 0.072), bx = Math.cos(a) * rr, bz = Math.sin(a) * rr;
    const tip = [bx + Math.cos(a) * Math.sin(neig) * h, h * Math.cos(neig), bz + Math.sin(a) * Math.sin(neig) * h];
    // Stiel (leicht gebogen)
    const st = new THREE.CylinderGeometry(0.0042, 0.0062, h, 7, 6, true), sp = st.getAttribute("position");
    for (let j = 0; j < sp.count; j++) { const y = sp.getY(j) + h / 2, f = y / h; sp.setXYZ(j, sp.getX(j) + Math.cos(a) * Math.sin(neig) * h * f * f, y * Math.cos(neig * f * 0.9) , sp.getZ(j) + Math.sin(a) * Math.sin(neig) * h * f * f); }
    st.translate(bx, 0, bz); st.computeVertexNormals();
    teile.push({ g: st, c: (x, y) => { const f = clamp(y / h); return [lerp(0.09, 0.5, smoothstep(0, 0.5, f)), lerp(0.045, 0.38, smoothstep(0, 0.5, f)), lerp(0.018, 0.16, smoothstep(0, 0.5, f))]; } });
    // Ring
    const ring = new THREE.CylinderGeometry(0.0085, 0.0055, 0.004, 8, 1, true); ring.translate(tip[0] * 0.78 + bx * 0.22, tip[1] * 0.78, tip[2] * 0.78 + bz * 0.22);
    teile.push({ g: ring, c: [0.62, 0.55, 0.3] });
    // Hut (Lathe), jung = gewölbt, alt = flach mit leicht hochgebogenem Rand
    const prof = jung
      ? [[0.0005, 0.55], [0.35, 0.5], [0.65, 0.38], [0.88, 0.2], [1.0, 0.02], [0.92, -0.02], [0.55, -0.05], [0.12, -0.06]]
      : [[0.0005, 0.3], [0.3, 0.29], [0.6, 0.2], [0.85, 0.09], [1.0, 0.04], [0.97, 0.0], [0.6, -0.04], [0.12, -0.06]];
    const hut = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r * R, y * R)), 14);
    const hp = hut.getAttribute("position");
    for (let j = 0; j < hp.count; j++) { const x = hp.getX(j), z = hp.getZ(j), y = hp.getY(j); const w = 1 + 0.08 * Math.sin(Math.atan2(z, x) * 5 + i); hp.setXYZ(j, x * w, y + 0.06 * R * Math.sin(Math.atan2(z, x) * 3 + i * 2) * (Math.hypot(x, z) / R), z * w); }
    hut.rotateZ(-Math.cos(a) * neig * 0.8); hut.rotateX(Math.sin(a) * neig * 0.8);
    hut.translate(...tip); hut.computeVertexNormals();
    const tone = 0.85 + 0.3 * rnd();
    teile.push({ g: hut, c: (x, y, z) => {
      const lx = x - tip[0], ly = y - tip[1], lz = z - tip[2], r = Math.hypot(lx, lz) / R;
      if (ly < -0.015 * R && r < 0.97) return [0.6, 0.5, 0.28];                          // Lamellen
      const sch = hash(Math.round(lx * 900) * 31 + Math.round(lz * 900), seed + i) < 0.35 * (1 - r) ? 0.55 : 1;   // Schuppen zur Mitte
      const mitte = smoothstep(0.55, 0.0, r);
      return [lerp(0.42, 0.075, mitte) * sch * tone, lerp(0.22, 0.035, mitte) * sch * tone, lerp(0.045, 0.012, mitte) * sch * tone];
    } });
  }
  return verschmelze(teile, { farbName: "color" });
}

/** Teile ({ g, c: [r,g,b] | f(x,y,z) → [r,g,b], hilf: [a,b] | f(x,y,z,j) → [a,b] }) zu einer Geometrie (nicht indiziert) */
function verschmelze(teile, { farbName = "farbe" } = {}) {
  const gs = teile.map((t) => t.g);
  let n = 0, ni = 0; for (const g of gs) { const c = g.getAttribute("position").count; n += c; ni += g.index ? g.index.count : c; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), hlf = new Float32Array(n * 2), uv = new Float32Array(n * 2);
  const index = new Uint32Array(ni);
  let o = 0, oi = 0;
  gs.forEach((g) => {
    const c = g.getAttribute("position").count;
    if (g.index) for (let j = 0; j < g.index.count; j++) index[oi++] = g.index.getX(j) + o; else for (let j = 0; j < c; j++) index[oi++] = j + o;
    o += c;
  });
  o = 0;
  gs.forEach((g, i) => {
    const t = teile[i], p = g.getAttribute("position"), nm = g.getAttribute("normal"), u = g.getAttribute("uv");
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j), y = p.getY(j), z = p.getZ(j), k = o + j;
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      if (nm) { nor[k * 3] = nm.getX(j); nor[k * 3 + 1] = nm.getY(j); nor[k * 3 + 2] = nm.getZ(j); }
      let c = t.c ?? [1, 1, 1]; if (typeof c === "function") c = c(x, y, z, j);
      col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
      let hh = t.hilf ?? [0, 0]; if (typeof hh === "function") hh = hh(x, y, z, j);
      hlf[k * 2] = hh[0]; hlf[k * 2 + 1] = hh[1];
      if (u) { uv[k * 2] = u.getX(j); uv[k * 2 + 1] = u.getY(j); }
    }
    o += p.count;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute(farbName, new THREE.BufferAttribute(col, 3)); out.setAttribute("hilf", new THREE.BufferAttribute(hlf, 2)); out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  return out;
}

export class MyzelDecke {
  constructor(szene, { mitte = [0, 0], rMax = 1800, seed = 3, huete = 120 } = {}) {
    this.szene = szene; this.mitte = [...mitte]; this.rMax = rMax; this.seed = seed;
    this.gruppe = new THREE.Group(); this.gruppe.name = "MyzelDecke"; szene.add(this.gruppe);
    this.u = {
      uMitte: { value: new THREE.Vector2(...mitte) }, uR: { value: 0 }, uDeck: { value: 1 }, uGlanz: { value: 1 }, uZeit: { value: 0 }, uFront: { value: 1 },
      uNebel: { value: 0 }, uFarbe: { value: C("#E6FFF0") }, uLift: { value: 0.03 },
    };
    const mat = (fern) => {
      const m = new THREE.ShaderMaterial({ vertexShader: DECKE_V, fragmentShader: DECKE_F, uniforms: { ...this.u, uFern: { value: fern ? 1 : 0 } },
        transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
      return m;
    };
    this.vertices = 0;
    const R = rMax + 4, [mx, mz] = mitte;
    // Nahgitter: identisch mit dem 2-m-Gitter des Lichtungsbodens (nur der Teil im Umkreis)
    const gN = teilGitter(NAH, Math.floor((mx - R - NAH.x0) / NAH.d), Math.ceil((mx + R - NAH.x0) / NAH.d), Math.floor((mz - R - NAH.z0) / NAH.d), Math.ceil((mz + R - NAH.z0) / NAH.d), hoehe);
    if (gN) { const m = new THREE.Mesh(gN, mat(false)); m.frustumCulled = false; m.renderOrder = 5; this.gruppe.add(m); this.vertices += gN.getAttribute("position").count; }
    const RF = rMax + 70;
    const gF = teilGitter(FERN, Math.floor((mx - RF - FERN.x0) / FERN.d), Math.ceil((mx + RF - FERN.x0) / FERN.d), Math.floor((mz - RF - FERN.z0) / FERN.d), Math.ceil((mz + RF - FERN.z0) / FERN.d), fernHoehe);
    if (gF) { const m = new THREE.Mesh(gF, mat(true)); m.frustumCulled = false; m.renderOrder = 5; this.gruppe.add(m); this.vertices += gF.getAttribute("position").count; }
    this._huete(huete);
  }
  _huete(anzahl) {
    const rnd = zufall(this.seed * 31 + 5), varianten = [fruchtkoerper(11, this.seed), fruchtkoerper(7, this.seed + 1), fruchtkoerper(15, this.seed + 2)];
    const mat = pilzMaterial();
    this.pilze = varianten.map((g) => { const im = new THREE.InstancedMesh(g, mat, Math.ceil(anzahl / 3)); im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true; this.gruppe.add(im); this.vertices += g.getAttribute("position").count * im.count; return { im, liste: [] }; });
    for (let i = 0; i < anzahl; i++) {
      const d = 0.6 * Math.pow(90 / 0.6, rnd()), a = rnd() * 6.283, x = this.mitte[0] + Math.cos(a) * d, z = this.mitte[1] + Math.sin(a) * d;
      const v = this.pilze[i % 3]; if (v.liste.length >= v.im.count) continue;
      v.liste.push({ x, z, y: hoehe(x, z) - 0.005, d, ry: rnd() * 6.283, s: 0.9 + 0.7 * rnd(), schwelle: 0.7 * rnd() });
    }
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._e = new THREE.Euler();
  }
  zeige(an = true) { this.gruppe.visible = an; return this; }
  update(t, { radius = 0, deckung = 1, glanz = 1, farbe = null, front = 1, huete = 0, r0 = 2, nebel = null } = {}) {
    const u = this.u;
    u.uR.value = radius; u.uDeck.value = deckung; u.uGlanz.value = glanz; u.uZeit.value = t; u.uFront.value = front;
    if (farbe) u.uFarbe.value.copy(C(farbe));
    u.uNebel.value = nebel ?? (this.szene.fog && this.szene.fog.density ? this.szene.fog.density * 0.7 : 0);
    for (const m of this.gruppe.children) if (m.isMesh && !m.isInstancedMesh) m.visible = radius > 0.01 && glanz > 0;
    for (const v of this.pilze) {
      v.liste.forEach((p, i) => {
        const inR = radius > r0 && p.d < radius * 0.85;
        const k = inR ? smoothstep(p.schwelle, p.schwelle + 0.3, huete) : 0;
        const s = k > 0 ? p.s * (0.25 + 0.75 * k) : 0;
        this._e.set(0, p.ry, 0); this._q.setFromEuler(this._e); this._s.set(s, s * (0.4 + 0.6 * k), s); this._p.set(p.x, p.y, p.z);
        this._m.compose(this._p, this._q, this._s); v.im.setMatrixAt(i, this._m);
      });
      for (let i = v.liste.length; i < v.im.count; i++) { this._m.makeScale(0, 0, 0); v.im.setMatrixAt(i, this._m); }
      v.im.instanceMatrix.needsUpdate = true; v.im.visible = huete > 0;
    }
    return this;
  }
}

// =============================================================================================== B) MyzelBoden (Querschnitt)
const BODEN_V = /* glsl */ `
attribute vec3 farbe; attribute vec2 hilf;
uniform vec3 uPos;
varying vec3 vP, vG, vW, vN, vC; varying vec2 vH, vUv;
void main() {
  vP = position; vC = farbe; vH = hilf; vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vG = w.xyz - uPos;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const BODEN_F = /* glsl */ `
uniform float uLicht, uBefall, uW, uGlanz, uZeit;
uniform vec3 uGlowCol, uDunst; uniform vec4 uGlow[8]; uniform vec2 uInf;
varying vec3 vP, vG, vW, vN, vC; varying vec2 vH, vUv;
${GLSL_MYZ}
vec3 bump(vec3 pos, vec3 nrm, float h, float s) {
  vec3 dx = dFdx(pos), dy = dFdy(pos); vec3 r1 = cross(dy, nrm), r2 = cross(nrm, dx); float det = dot(dx, r1);
  vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2) * s; return normalize(abs(det) * nrm - g); }
vec3 licht(vec3 alb, vec3 n, float ao) {
  vec3 kd = normalize(vec3(-0.45, 0.8, 0.5)), rd = normalize(vec3(0.6, 0.35, -0.7));
  float k = max(dot(n, kd), 0.0), r = max(dot(n, rd), 0.0);
  vec3 amb = mix(vec3(0.016, 0.014, 0.012), vec3(0.06, 0.075, 0.09), n.y * 0.5 + 0.5);
  vec3 c = alb * (vec3(0.42, 0.47, 0.56) * k + vec3(0.12, 0.15, 0.16) * r + amb) * uLicht * ao;
  float g = 0.0;
  for (int i = 0; i < 8; i++) { vec3 L = uGlow[i].xyz - vG; float dl = length(L) + 1e-3;
    g += uGlow[i].w / (1.0 + dl * dl / 0.07) * (0.45 + 0.55 * max(dot(n, L / dl), 0.0)); }
  c += alb * uGlowCol * g;
  return c;
}
void main() {
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 alb = vC; float ao = 1.0; vec3 emis = vec3(0.0);
#if ART == 1
  // Schnittfläche: Streu, Humus, brauner Oberboden, Unterboden mit Kies
  vec2 p = vP.xy;
  float n1 = mfbm(p * 5.0), n2 = mfbm(p * 22.0 + 3.0), n3 = mvn(p * 120.0), n4 = mfbm(vec2(p.x * 1.6, 2.0));
  float y = p.y + 0.05 * (n4 - 0.5) + 0.02 * (n1 - 0.5);
  vec3 col = vec3(0.10, 0.055, 0.026);
  col = mix(col, vec3(0.032, 0.023, 0.016), smoothstep(-0.03, -0.07, y));
  col = mix(col, vec3(0.15, 0.085, 0.04), smoothstep(-0.26, -0.42, y + 0.09 * (n1 - 0.5)));
  col = mix(col, vec3(0.23, 0.165, 0.10), smoothstep(-1.0, -1.3, y + 0.14 * (n2 - 0.5)));
  col *= 0.68 + 0.6 * n2;
  col *= 0.8 + 0.4 * n3;
  vec3 z = mzelle(p * 26.0);
  float kies = (1.0 - smoothstep(0.1 + 0.12 * z.z, 0.2 + 0.12 * z.z, z.x + 0.08 * (n3 - 0.5))) * step(0.72, z.z) * smoothstep(-0.55, -1.05, y);
  col = mix(col, vec3(0.2, 0.18, 0.15) * (0.55 + 0.6 * fract(z.z * 7.3)), kies * 0.75);
  vec3 z2 = mzelle(p * 55.0 + 7.0);
  float loch = (1.0 - smoothstep(0.05, 0.11, z2.x)) * step(0.8, z2.z);
  col *= 1.0 - 0.65 * loch;
  float spaten = smoothstep(0.35, 0.75, mvn(vec2(p.x * 60.0, p.y * 2.5)));
  col *= 0.9 + 0.12 * spaten;
  float h = n2 * 0.5 + n3 * 0.25 + kies * 0.6 * (0.3 + z.x) - loch * 0.4 + spaten * 0.15;
  n = bump(vG, n, h, 0.012);
  ao = 0.7 + 0.3 * smoothstep(-0.02, -0.25, p.y) ;                       // unter der Kante etwas Schatten
  alb = col;
#elif ART == 2
  // Rinde (uv.x um den Stamm, uv.y Höhe), hilf.x = Rauheit (0 Buche glatt … 1 Fichte schuppig)
  float rau = vH.x;
  float f = mvn(vec2(vUv.x * 46.0, vUv.y * (3.0 + 9.0 * rau)));
  float s = mfbm(vec2(vUv.x * 18.0, vUv.y * 6.0));
  alb = vC * (0.72 + 0.42 * mix(s, f, rau)) * (1.0 - 0.35 * rau * smoothstep(0.55, 0.8, f));
  alb = mix(alb, vec3(0.05, 0.09, 0.03), smoothstep(0.55, 0.75, mfbm(vec2(vUv.x * 9.0, vUv.y * 4.0))) * (1.0 - smoothstep(0.0, 1.4, vG.y)) * 0.8);  // Moos am Fuß
  n = bump(vG, n, mix(s, f, rau), 0.02);
  ao = 0.55 + 0.45 * smoothstep(0.0, 0.6, vG.y);
#elif ART == 3
  // Oberfläche: Moos, Nadelstreu, Zweige
  vec2 p = vP.xz;
  float m = smoothstep(0.45, 0.62, mfbm(p * 2.4 + 1.0));
  vec3 moos = vec3(0.045, 0.10, 0.022) * (0.6 + 0.8 * mfbm(p * 36.0));
  float nad = 0.0;
  for (int k = 0; k < 3; k++) { float a = float(k) * 2.1 + 0.4; vec2 rp = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
    nad = max(nad, smoothstep(0.6, 0.7, mvn(vec2(rp.x * 160.0, rp.y * 8.0 + float(k) * 5.0)))); }
  vec3 streu = vec3(0.13, 0.062, 0.026) * (0.55 + 0.7 * mfbm(p * 14.0));
  streu = mix(streu, vec3(0.30, 0.15, 0.06), nad * 0.75);
  alb = mix(streu, moos, m * (1.0 - nad * 0.5));
  n = bump(vG, n, m * 0.5 + nad * 0.35 + mfbm(p * 40.0) * 0.3, 0.01);
  ao = 0.8 + 0.2 * smoothstep(0.0, 0.3, -vP.z);
#elif ART == 4
  // Rückwand (unbeleuchtet): dunkler Wald mit Bodennebel und Stamm-Silhouetten
  float y = vP.y; float a = vUv.x;
  vec3 c = mix(vec3(0.010, 0.013, 0.015), vec3(0.055, 0.075, 0.08), exp(-pow((y - 0.6) / 3.2, 2.0)));
  c = mix(c, vec3(0.008, 0.011, 0.014), smoothstep(5.0, 18.0, y));
  for (int k = 0; k < 3; k++) {
    float N = 40.0 + float(k) * 34.0; float i = floor(a * N); float fx = fract(a * N);
    float w = 0.08 + 0.18 * mh(vec2(i, float(k))); float x0 = 0.2 + 0.6 * mh(vec2(i, float(k) + 9.0));
    float st = 1.0 - smoothstep(w * 0.5 - 0.02, w * 0.5 + 0.02, abs(fx - x0)) ;
    st *= step(0.35, mh(vec2(i, float(k) + 3.0)));
    float tiefe = 0.25 + 0.3 * float(k);
    c = mix(c, c * tiefe, st);
  }
  c += vec3(0.03, 0.04, 0.042) * smoothstep(0.55, 0.9, mfbm(vec2(a * 30.0, y * 0.05 - uZeit * 0.01))) * exp(-pow((y - 1.0) / 2.0, 2.0));
  gl_FragColor = vec4(c * uLicht, 1.0);
  return;
#elif ART == 5
  // Nadeln der Tanne: grün → rostbraun mit dem Befall (von unten und je Zweig versetzt)
  float zz = vH.x, hy = vH.y;
  float braun = smoothstep(0.0, 0.35, uBefall * 1.7 - 0.75 + (zz - 0.5) * 0.35 + (1.0 - hy) * 0.25);
  float tr = smoothstep(0.75, 1.0, uBefall);
  vec3 gruen = vec3(0.045, 0.1, 0.04) * (0.7 + 0.6 * zz), rost = vec3(0.3, 0.12, 0.035) * (0.75 + 0.5 * zz), grau = vec3(0.14, 0.1, 0.07);
  alb = mix(mix(gruen, rost, braun), grau, tr * 0.45);
  float nd = mvn(vP.xz * 90.0 + vP.y * 40.0);
  alb *= 0.75 + 0.45 * nd;
  ao = 0.55 + 0.45 * hy;
#elif ART == 6
  // Wurzeln (hilf = Lauflänge, Umfang 0..1), uv.x = 1 bei Tannenwurzeln
  float lauf = vH.x, um = vH.y, tanne = vUv.x;
  float b = mvn(vec2(lauf * 30.0, um * 9.0)), b2 = mfbm(vec2(lauf * 6.0, um * 4.0));
  alb = vC * (0.7 + 0.45 * b) * (0.8 + 0.4 * b2);
  float dInf = length(vG.xy - uInf);
  float fr = uBefall * 2.4;
  float dunkel = (1.0 - smoothstep(fr - 0.2, fr + 0.05, dInf)) * tanne;
  alb = mix(alb, vec3(0.045, 0.03, 0.022) * (0.8 + 0.4 * b), dunkel * 0.9);
  float ein = clamp((uW - 0.5) * 2.0, 0.0, 1.0);
  float fanR = ein * 0.55 + uBefall * 1.4;
  float fan = (1.0 - smoothstep(fanR - 0.12, fanR + 0.02, dInf)) * tanne * step(0.001, ein + uBefall);
  float filz = smoothstep(0.35, 0.75, mfbm(vec2(lauf * 9.0, um * 5.0))) * (0.6 + 0.4 * smoothstep(0.3, 0.7, mvn(vec2(lauf * 40.0, um * 8.0))));
  float rand = exp(-pow((dInf - fanR) / 0.05, 2.0)) * 0.8;                          // hellere Front des Fächers
  float streif = smoothstep(0.62, 0.8, mvn(vec2(lauf * 22.0, um * 6.0)));
  emis += uGlowCol * fan * (filz * streif * 0.45 + filz * 0.025 + rand * 0.6) * (0.88 + 0.12 * sin(uZeit * 2.0 - dInf * 18.0));
  alb = mix(alb, vec3(0.42, 0.43, 0.4), fan * filz * streif * 0.25);
  n = bump(vG, n, b * 0.6 + b2 * 0.4, 0.004);
#endif
  vec3 fc = licht(alb, n, ao) + emis;
  float dist = length(vW - cameraPosition);
  fc = mix(fc, uDunst, 1.0 - exp(-dist * 0.05));
  gl_FragColor = vec4(fc, 1.0);
}`;

const HYPHE_V = /* glsl */ `
attribute vec3 seite; attribute float quer, geb, breite, hell;
uniform float uHoehePx;
varying float vQ, vGeb, vHell, vE;
void main() {
  vec4 mvC = modelViewMatrix * vec4(position, 1.0);
  float pxW = 2.0 * max(-mvC.z, 0.01) / (projectionMatrix[1][1] * uHoehePx);   // Meter je Pixel in dieser Tiefe
  float hw = max(breite, pxW * 0.85);
  vE = breite / hw; vQ = quer; vGeb = geb; vHell = hell;
  vec3 p = position + seite * quer * hw * 2.2;                                   // Band 2,2× breiter für den weichen Hof
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const HYPHE_F = /* glsl */ `
uniform float uW, uGlanz, uZeit; uniform vec3 uGlowCol;
varying float vQ, vGeb, vHell, vE;
void main() {
  if (vGeb > uW) discard;
  float alter = uW - vGeb;
  float spitze = exp(-alter / 0.012);
  float q = vQ * 2.2;
  float kern = exp(-q * q * 2.2), hof = exp(-q * q * 0.35) * 0.18;
  float puls = 0.86 + 0.14 * sin(uZeit * 2.2 - vGeb * 45.0);
  float reif = 0.7 + 0.3 * smoothstep(0.0, 0.15, alter);
  vec3 c = uGlowCol * (kern + hof) * vHell * vE * (reif + 2.4 * spitze) * puls * uGlanz;
  gl_FragColor = vec4(c, 1.0);
}`;

export class MyzelBoden {
  constructor(szene, { pos = [0, -2000, 0], breite = 4.6, tiefe = 3.0, seed = 7, tanneX = 0.85, keim = [-1.45, -0.5] } = {}) {
    this.szene = szene; this.pos = [...pos]; this.breite = breite; this.tiefe = tiefe; this.seed = seed; this.tanneX = tanneX; this.keim = [...keim];
    this.gruppe = new THREE.Group(); this.gruppe.name = "MyzelBoden"; this.gruppe.position.set(...pos); this.gruppe.visible = false; szene.add(this.gruppe);
    this.vertices = 0;
    const glows = []; for (let i = 0; i < 8; i++) glows.push(new THREE.Vector4(0, 0, 0, 0));
    this.u = {
      uPos: { value: new THREE.Vector3(...pos) }, uLicht: { value: 1 }, uBefall: { value: 0 }, uW: { value: 0 }, uGlanz: { value: 1 }, uZeit: { value: 0 },
      uGlowCol: { value: C("#E6FFF0") }, uDunst: { value: new THREE.Color(0.02, 0.028, 0.032) }, uGlow: { value: glows }, uInf: { value: new THREE.Vector2(0, -0.5) },
      uHoehePx: { value: 1920 },
    };
    this._rnd = zufall(seed * 104729 + 7);
    this._mats = {};
    this._steine(); this._wurzeln(); this._schnitt(); this._oberflaeche(); this._staemme(); this._tanne(); this._wand(); this._myzel(); this._pilze();
  }
  _mat(art, opt = {}) {
    if (this._mats[art] && !opt.neu) return this._mats[art];
    const m = new THREE.ShaderMaterial({ vertexShader: BODEN_V, fragmentShader: BODEN_F, uniforms: this.u, defines: { ART: art }, fog: false, side: opt.side ?? THREE.FrontSide });
    this._mats[art] = m; return m;
  }
  _add(geo, art, opt = {}) { const m = new THREE.Mesh(geo, this._mat(art, opt)); m.frustumCulled = false; this.gruppe.add(m); this.vertices += geo.getAttribute("position").count; return m; }
  /** Relief der Schnittfläche (z-Versatz, m) – identisch für Fläche und Fäden */
  rel(x, y) {
    const a = 0.009 * Math.sin(x * 9.1 + Math.sin(y * 7.3) * 1.7) * Math.sin(y * 11.7 + x * 2.1), b = 0.005 * Math.sin(x * 31 + y * 17) * Math.cos(y * 27 - x * 5);
    return (a + b) * smoothstep(0, -0.05, y);
  }
  // ------------------------------------------------------------------ Steine (halb in der Schnittfläche)
  _steine() {
    const rnd = this._rnd, W = this.breite / 2, teile = [];
    this.steine = [];
    for (let i = 0; i < 260 && this.steine.length < 24; i++) {
      const tiefeAnteil = Math.pow(rnd(), 0.6), y = -0.35 - tiefeAnteil * (this.tiefe - 0.5), x = (rnd() - 0.5) * 2 * (W - 0.1);
      const r = 0.03 + 0.14 * rnd() * (0.4 + 0.6 * tiefeAnteil);
      if (this.steine.some((s) => Math.hypot(s.x - x, s.y - y) < s.r + r + 0.05)) continue;
      if (Math.hypot(x - this.keim[0], y - this.keim[1]) < 0.25) continue;
      this.steine.push({ x, y, r });
      const g = new THREE.IcosahedronGeometry(r, 2), p = g.getAttribute("position");
      for (let j = 0; j < p.count; j++) { const vx = p.getX(j), vy = p.getY(j), vz = p.getZ(j); const f = 1 + 0.22 * (Math.sin(vx * 40 / r * 0.1 + i) * Math.cos(vy * 31 / r * 0.1 + i * 2) ) + 0.05 * (hash(j, i) - 0.5); p.setXYZ(j, vx * f * 1.15, vy * f * 0.85, vz * f * 0.8); }
      g.computeVertexNormals(); g.rotateZ(rnd() * 3); g.translate(x, y, -0.4 * r);
      const ton = 0.6 + 0.5 * rnd(), warm = rnd();
      teile.push({ g, c: (vx, vy, vz) => { const n = 0.8 + 0.4 * hash(Math.round(vx * 400) + Math.round(vy * 400) * 977, i); return [(0.2 + 0.06 * warm) * ton * n, 0.19 * ton * n, (0.17 - 0.04 * warm) * ton * n]; } });
    }
    this._add(verschmelze(teile), 0);
  }
  // ------------------------------------------------------------------ Wurzeln: Tanne (Herzwurzel) + fremde Wurzeln + Feinwurzeln
  _wurzeln() {
    const rnd = this._rnd, W = this.breite / 2, B = this.tiefe;
    const wurzeln = [];   // { pts:[[x,y]], r:[..], tanne }
    const wachse = (x, y, ang, len, r, tanne, tiefe, schwer = 0.04) => {
      const pts = [[x, y]], rs = [r]; let L = 0, versuche = 0; const st = 0.025;
      while (L < len && versuche++ < 600) {
        ang += (rnd() - 0.5) * 0.32;
        ang += (-Math.PI / 2 - ang) * schwer * (tiefe === 0 ? 1 : 0.6);
        let nx = x + Math.cos(ang) * st, ny = y + Math.sin(ang) * st;
        if (ny > -0.04) { ang = -Math.abs(ang); ny = y; }
        if (Math.abs(nx) > W - 0.02 || ny < -B + 0.05) break;
        const s = this.steine.find((q) => Math.hypot(q.x - nx, q.y - ny) < q.r + r);
        if (s) { ang += (nx > s.x ? -0.7 : 0.7); continue; }
        x = nx; y = ny; L += st; r *= 0.988; pts.push([x, y]); rs.push(Math.max(r, 0.0025));
        if (tiefe < 4 && rnd() < 0.05 && r > 0.006) wachse(x, y, ang + (rnd() < 0.5 ? -1 : 1) * (0.5 + 0.7 * rnd()), len * (0.35 + 0.35 * rnd()), r * 0.6, tanne, tiefe + 1, schwer * 0.7);
      }
      if (pts.length > 2) wurzeln.push({ pts, rs, tanne });
    };
    const tx = this.tanneX;
    wachse(tx, -0.04, -Math.PI / 2 - 0.05, 1.35, 0.034, 1, 0, 0.08);           // Pfahlwurzel
    wachse(tx - 0.03, -0.05, Math.PI + 0.35, 1.5, 0.026, 1, 0, 0.012);           // Seitenwurzel nach links (zum Keimpunkt)
    wachse(tx - 0.02, -0.09, Math.PI + 0.8, 1.1, 0.022, 1, 0, 0.025);
    wachse(tx + 0.03, -0.05, -0.35, 1.0, 0.024, 1, 0, 0.02);                   // nach rechts
    wachse(tx + 0.02, -0.12, -0.9, 0.9, 0.018, 1, 0, 0.03);
    // fremde Wurzeln (Buche links hinten, Fichte rechts hinten) kreuzen den Schnitt
    wachse(-W + 0.02, -0.12, -0.12, 1.4, 0.03, 0, 0, 0.01);
    wachse(-W + 0.02, -0.5, -0.25, 0.9, 0.02, 0, 0, 0.02);
    wachse(W - 0.02, -0.2, Math.PI + 0.25, 1.0, 0.028, 0, 0, 0.01);
    // Feinwurzeln
    for (let i = 0; i < 46; i++) wachse((rnd() - 0.5) * 2 * (W - 0.1), -0.05 - 0.6 * Math.pow(rnd(), 1.5), -Math.PI / 2 + (rnd() - 0.5) * 2.4, 0.12 + 0.3 * rnd(), 0.003 + 0.004 * rnd(), 0, 3, 0.05);
    this.wurzeln = wurzeln;
    // Abtastpunkte für das Myzel
    this.wurzelPunkte = [];
    for (const w of wurzeln) w.pts.forEach((p, i) => this.wurzelPunkte.push({ x: p[0], y: p[1], r: w.rs[i], tanne: w.tanne }));
    // Röhren mit veränderlichem Radius (Mitte z = −0,35 r: Wurzeln liegen halb frei in der Schnittfläche)
    const seg = 8, pos = [], nor = [], col = [], hlf = [], uv = [], idx = [];
    for (const w of wurzeln) {
      const n = w.pts.length, basis = pos.length / 3; let lauf = 0;
      const farbe = w.tanne ? [0.34, 0.19, 0.1] : (w.rs[0] < 0.01 ? [0.36, 0.26, 0.17] : [0.30, 0.24, 0.18]);
      for (let i = 0; i < n; i++) {
        const p = w.pts[i], q = w.pts[Math.min(n - 1, i + 1)], o = w.pts[Math.max(0, i - 1)];
        let tx2 = q[0] - o[0], ty2 = q[1] - o[1]; const tl = Math.hypot(tx2, ty2) || 1; tx2 /= tl; ty2 /= tl;
        if (i > 0) lauf += Math.hypot(p[0] - w.pts[i - 1][0], p[1] - w.pts[i - 1][1]);
        const r = w.rs[i] * (i === n - 1 ? 0.3 : 1), zc = -0.35 * w.rs[i] + this.rel(p[0], p[1]);
        for (let k = 0; k <= seg; k++) {
          const a = (k / seg) * 6.2832, ca = Math.cos(a), sa = Math.sin(a);
          const nx = -ty2 * ca, ny = tx2 * ca, nz = sa;               // Ring senkrecht zur Laufrichtung (Laufrichtung in xy)
          pos.push(p[0] + nx * r, p[1] + ny * r, zc + nz * r); nor.push(nx, ny, nz); col.push(...farbe); hlf.push(lauf, k / seg); uv.push(w.tanne, 0);
        }
      }
      for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) {
        const a = basis + i * (seg + 1) + k, b = a + seg + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute("farbe", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("hilf", new THREE.Float32BufferAttribute(hlf, 2)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    this._add(g, 6, { side: THREE.DoubleSide });
  }
  // ------------------------------------------------------------------ Schnittfläche
  _schnitt() {
    const W = this.breite, B = this.tiefe;
    const g = new THREE.PlaneGeometry(W, B, Math.round(W * 60), Math.round(B * 60)); g.translate(0, -B / 2, 0);
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, this.rel(x, y) + (y > -0.012 ? 0.006 * (1 + Math.sin(x * 23)) : 0)); }
    g.computeVertexNormals();
    this._add(verschmelze([{ g }]), 1);
  }
  // ------------------------------------------------------------------ Oberfläche (Moos, Streu) + Moospolster an der Kante + Zweige
  _oberflaeche() {
    const rnd = this._rnd, W = this.breite / 2;
    const g = new THREE.PlaneGeometry(36, 18, 216, 108); g.rotateX(-Math.PI / 2); g.translate(0, 0, -9);
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const d = -z; p.setY(i, 0.012 * Math.sin(x * 7 + z * 5) * Math.sin(z * 9 - x * 3) + 0.25 * smoothstep(3, 16, d) * (0.5 + 0.5 * Math.sin(x * 0.4 + 1)) + (d < 0.02 ? 0.004 : 0)); }
    g.computeVertexNormals();
    this._add(verschmelze([{ g }]), 3);
    const teile = [];
    // Moospolster entlang der Kante (hängen etwas über) und verstreut
    for (let i = 0; i < 420; i++) {
      const kante = i < 200, x = (rnd() - 0.5) * 2 * (kante ? W : 7), z = kante ? -0.06 * rnd() + 0.012 : -0.05 - 4.5 * Math.pow(rnd(), 1.6);
      if (Math.abs(x - this.tanneX) < 0.09 && z > -0.3) continue;
      const r = (kante ? 0.025 : 0.03) + 0.05 * rnd();
      const k = new THREE.IcosahedronGeometry(r, 1), kp = k.getAttribute("position");
      for (let j = 0; j < kp.count; j++) { const f = 1 + 0.18 * Math.sin(kp.getX(j) / r * 5 + i) * Math.cos(kp.getZ(j) / r * 4 + i) + 0.12 * (hash(j, i) - 0.5); kp.setXYZ(j, kp.getX(j) * f * 1.4, Math.max(kp.getY(j) * f * 0.55, -0.004), kp.getZ(j) * f * 1.4); }
      k.computeVertexNormals(); k.translate(x, 0.003, z);
      const gr = 0.7 + 0.6 * rnd(), braun = rnd() < 0.2;
      teile.push({ g: k, c: (vx, vy) => { const o = 0.7 + 0.5 * clamp(vy / r); return braun ? [0.12 * o * gr, 0.09 * o * gr, 0.03 * o] : [0.05 * o * gr, 0.12 * o * gr, 0.025 * o * gr]; } });
    }
    // Zweige und Zapfen
    for (let i = 0; i < 70; i++) {
      const x = (rnd() - 0.5) * 9, z = -0.05 - 5 * Math.pow(rnd(), 1.3), L = 0.08 + 0.35 * rnd(), r = 0.003 + 0.006 * rnd();
      const zw = new THREE.CylinderGeometry(r * 0.7, r, L, 5); zw.rotateZ(Math.PI / 2); zw.rotateY(rnd() * 6.28); zw.translate(x, r * 0.8, z);
      teile.push({ g: zw, c: [0.17, 0.11, 0.07] });
      if (i < 14) { const zp = new THREE.CylinderGeometry(0.012, 0.016, 0.07, 7); zp.rotateZ(Math.PI / 2); zp.rotateY(rnd() * 6.28); zp.translate(x + 0.1, 0.014, z - 0.05); teile.push({ g: zp, c: (vx, vy, vz) => { const s = hash(Math.round(vx * 600 + vz * 900), i) < 0.5 ? 0.7 : 1; return [0.26 * s, 0.14 * s, 0.07 * s]; } }); }
    }
    this._add(verschmelze(teile), 0);
  }
  // ------------------------------------------------------------------ Stämme mit Wurzelanläufen (vorn groß, hinten Silhouetten im Dunst)
  _stammGeo(cx, cz, r, H, rau, seed, farbe, flare = 1) {
    const ra = 24, hs = 34, pos = [], uv = [], idx = [];
    for (let j = 0; j <= hs; j++) {
      const f = j / hs, y = -0.2 + Math.pow(f, 2.2) * (H + 0.2);
      for (let i = 0; i <= ra; i++) {
        const a = (i / ra) * 6.2832, kf = 4 + (seed % 3);
        const anlauf = flare * Math.exp(-Math.max(y, 0) / (0.35 + 0.4 * r)) * (0.35 + 0.95 * Math.pow(0.5 + 0.5 * Math.cos(kf * a + seed), 3));
        const rr = r * (1 + anlauf) * (1 + 0.03 * Math.sin(a * 7 + y * 3 + seed)) * (1 - 0.25 * f);
        pos.push(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr); uv.push(i / ra, y);
      }
    }
    for (let j = 0; j < hs; j++) for (let i = 0; i < ra; i++) { const a = j * (ra + 1) + i, b = a + ra + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return { g, c: farbe, hilf: [rau, 0] };
  }
  _staemme() {
    const rnd = this._rnd, teile = [];
    teile.push(this._stammGeo(-1.55, -1.5, 0.3, 16, 0.05, 1, [0.36, 0.36, 0.34]));       // Buche (glatt, grau)
    teile.push(this._stammGeo(0.15, -3.3, 0.38, 18, 0.9, 2, [0.27, 0.16, 0.1]));          // Fichte (rotbraun, schuppig)
    teile.push(this._stammGeo(1.95, -2.0, 0.24, 16, 0.85, 3, [0.25, 0.15, 0.1]));
    teile.push(this._stammGeo(-0.6, -5.2, 0.27, 18, 0.1, 4, [0.33, 0.33, 0.31]));
    for (let i = 0; i < 26; i++) {
      const x = (rnd() - 0.5) * 22, z = -5.5 - 9 * rnd(); if (Math.abs(x) < 1.2 && z > -7) continue;
      const fi = rnd() < 0.6;
      teile.push(this._stammGeo(x, z, 0.18 + 0.3 * rnd(), 20, fi ? 0.85 : 0.08, 5 + i, fi ? [0.24, 0.15, 0.1] : [0.32, 0.32, 0.3], 0.7));
    }
    this._add(verschmelze(teile), 2);
  }
  // ------------------------------------------------------------------ junge Weißtanne (4,6 m) direkt hinter der Kante
  _tanne() {
    const rnd = this._rnd, tx = this.tanneX, tz = -0.16, H = 4.6;
    this.tanne = [tx, tz];
    this._add(verschmelze([this._stammGeo(tx, tz, 0.055, H, 0.4, 9, [0.3, 0.27, 0.24], 0.8)]), 2);
    const teile = [];
    const etagen = 16;
    for (let e = 0; e < etagen; e++) {
      const f = e / (etagen - 1), y = 0.5 + f * (H - 0.9), R = (1.05 * Math.pow(1 - f, 0.85) + 0.14) * (0.9 + 0.2 * rnd()), h = 0.62 - 0.25 * f;
      for (let lage = 0; lage < 2; lage++) {
        const rr = R * (lage ? 0.72 : 1), g = new THREE.ConeGeometry(rr, h, 16, 3, true), gp = g.getAttribute("position");
        for (let j = 0; j < gp.count; j++) {
          const x = gp.getX(j), yy = gp.getY(j), z = gp.getZ(j), a = Math.atan2(z, x), unten = clamp((h / 2 - yy) / h);
          const zack = 1 + 0.22 * unten * (Math.sin(a * 8 + e * 1.7 + lage) * 0.6 + (hash(j + e * 97, 41 + lage) - 0.5));
          gp.setXYZ(j, x * zack, yy - unten * unten * 0.12 * R + 0.04 * Math.sin(a * 3 + e), z * zack);
        }
        g.translate(tx, y + h / 2 + lage * h * 0.35, tz); g.computeVertexNormals();
        const zz0 = rnd();
        teile.push({ g, c: [1, 1, 1], hilf: (x, yy, z, j) => [clamp(zz0 * 0.6 + 0.4 * hash(j, e * 3 + lage)), f] });
      }
    }
    const spitze = new THREE.ConeGeometry(0.1, 0.55, 8); spitze.translate(tx, H + 0.05, tz); teile.push({ g: spitze, c: [1, 1, 1], hilf: [0.5, 1] });
    this._add(verschmelze(teile), 5, { side: THREE.DoubleSide });
  }
  // ------------------------------------------------------------------ Rückwand
  _wand() {
    const g = new THREE.CylinderGeometry(16, 16, 40, 96, 1, true, Math.PI * 0.5 + 0.05, Math.PI - 0.1);  // hinterer Halbzylinder
    g.translate(0, 14, 0);   // θ von 90° bis 270° → z ≤ 0 (hinter dem Schnitt), Öffnung zur Kamera
    this._add(verschmelze([{ g }]), 4, { side: THREE.BackSide });
  }
  // ------------------------------------------------------------------ Myzel: Rhizomorphe + Hyphen (Zufallswanderung mit Verzweigung, Anziehung zur Tannenwurzel)
  _myzel() {
    const rnd = zufall(this.seed * 7 + 99), W = this.breite / 2 - 0.05, yTop = -0.03, yBot = -this.tiefe + 0.1;
    const tP = this.wurzelPunkte.filter((p) => p.tanne);
    const zelle = 0.06, raster = new Map();
    for (const p of this.wurzelPunkte) { const k = `${Math.floor(p.x / zelle)},${Math.floor(p.y / zelle)}`; (raster.get(k) || raster.set(k, []).get(k)).push(p); }
    const treffer = (x, y) => {
      const ix = Math.floor(x / zelle), iy = Math.floor(y / zelle);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const l = raster.get(`${ix + a},${iy + b}`); if (l) for (const p of l) if (p.tanne && p.r > 0.006 && Math.hypot(p.x - x, p.y - y) < p.r + 0.003) return p; }
      return null;
    };
    const naechste = (x, y) => { let best = null, bd = 1e9; for (let i = 0; i < tP.length; i += 2) { const p = tP[i], d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } } return { p: best, d: bd }; };
    const linien = [], schlange = [], kontakte = [];
    let punkte = 0; const CAP = 60000;
    const wachse = ({ x, y, ang, t, art, gen, max }) => {
      const st = art ? 0.02 : 0.009, tempo = art ? 2.6 : 1.0;
      const pts = [[x, y, t]]; let L = 0, versuche = 0;
      while (L < max && punkte < CAP && versuche < 400) {
        versuche++;
        ang += (rnd() - 0.5) * (art ? 0.24 : 0.6);
        if (art || gen <= 2) { const z = naechste(x, y), reich = art ? 1.5 : 0.3; if (z.p && z.d < reich) { const ziel = Math.atan2(z.p.y - y, z.p.x - x); let da = ziel - ang; da = Math.atan2(Math.sin(da), Math.cos(da)); ang += da * (art ? 0.07 : 0.12) * (1 - z.d / reich); } }
        if (y < -0.75) ang += (Math.PI / 2 - ang) * 0.04;                            // Hallimasch lebt im Oberboden
        let nx = x + Math.cos(ang) * st, ny = y + Math.sin(ang) * st;
        if (ny > yTop || ny < yBot) { ang = -ang; continue; }
        if (Math.abs(nx) > W) { ang = Math.PI - ang; continue; }
        const s = this.steine.find((q) => Math.hypot(q.x - nx, q.y - ny) < q.r * 0.95 + 0.004);
        if (s) { ang += ((nx - s.x) * Math.sin(ang) - (ny - s.y) * Math.cos(ang) > 0 ? -0.8 : 0.8); continue; }
        const w = treffer(nx, ny);
        x = nx; y = ny; L += st; t += st / tempo; pts.push([x, y, t]); punkte++;
        if (w) { if (w.tanne) kontakte.push({ x, y, t, r: w.r }); break; }
        if (art) {
          if (rnd() < 0.45) schlange.push({ x, y, ang: ang + (rnd() < 0.5 ? -1 : 1) * (0.5 + 0.9 * rnd()), t, art: 0, gen: 1, max: 0.08 + 0.3 * rnd() });
          if (gen < 2 && rnd() < 0.03) schlange.push({ x, y, ang: ang + (rnd() < 0.5 ? -1 : 1) * (0.4 + 0.5 * rnd()), t, art: 1, gen: gen + 1, max: max * 0.5 });
        } else if (gen < 6 && rnd() < 0.11) schlange.push({ x, y, ang: ang + (rnd() < 0.5 ? -1 : 1) * (0.35 + 0.75 * rnd()), t, art: 0, gen: gen + 1, max: Math.max(0.04, (max - L) * (0.5 + 0.6 * rnd())) });
      }
      if (pts.length > 1) linien.push({ pts, art, gen });
    };
    const [kx, ky] = this.keim;
    for (let i = 0; i < 11; i++) schlange.push({ x: kx, y: ky, ang: (i / 11) * 6.283 + rnd() * 0.4, t: 0.01 * i, art: 1, gen: 0, max: 1.2 + 1.8 * rnd() });
    for (let i = 0; i < 140; i++) schlange.push({ x: kx + (rnd() - 0.5) * 0.04, y: ky + (rnd() - 0.5) * 0.04, ang: rnd() * 6.283, t: 0.002 * i, art: 0, gen: 1, max: 0.08 + 0.35 * rnd() });
    while (schlange.length && punkte < CAP) wachse(schlange.shift());
    // Zeit normieren: erster Kontakt mit der Tannenwurzel bei wachstum = 0,5
    kontakte.sort((a, b) => a.t - b.t);
    const tc = kontakte.length ? kontakte[0].t : linien.reduce((m, l) => Math.max(m, l.pts[l.pts.length - 1][2]), 0) * 0.5;
    const k = 0.5 / tc;
    this.kontakt = kontakte.length ? [kontakte[0].x, kontakte[0].y] : [this.tanneX - 0.6, -0.1];
    this.u.uInf.value.set(...this.kontakt);
    this.kontakte = kontakte.length;
    const tief = kontakte.find((c) => c.y < -0.22 && c.r > 0.008 && c.t * k < 0.8);
    this.kontaktNah = tief ? [tief.x, tief.y] : this.kontakt;
    // Bänder bauen
    const P = [], S = [], Q = [], G = [], Bt = [], H = [], I = [];
    let v = 0;
    for (const l of linien) {
      const pts = l.pts.filter((p) => p[2] * k <= 1.02);
      if (pts.length < 2) continue;
      const n = pts.length, b0 = l.art ? 0.0028 : 0.0007 + 0.0004 / (1 + l.gen), hell = l.art ? 1.25 : 0.55 + 0.45 / (1 + 0.5 * l.gen);
      for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const [x, y, t] = pts[i], z = this.rel(x, y) + 0.0045, br = b0 * (1 - 0.55 * (i / (n - 1)));
        for (const q of [-1, 1]) { P.push(x, y, z); S.push(-ty, tx, 0); Q.push(q); G.push(t * k); Bt.push(br); H.push(hell); }
      }
      for (let i = 0; i < n - 1; i++) { const a = v + i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      v += n * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("seite", new THREE.Float32BufferAttribute(S, 3));
    g.setAttribute("quer", new THREE.Float32BufferAttribute(Q, 1)); g.setAttribute("geb", new THREE.Float32BufferAttribute(G, 1));
    g.setAttribute("breite", new THREE.Float32BufferAttribute(Bt, 1)); g.setAttribute("hell", new THREE.Float32BufferAttribute(H, 1)); g.setIndex(I);
    const mat = new THREE.ShaderMaterial({ vertexShader: HYPHE_V, fragmentShader: HYPHE_F, uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 20; this.gruppe.add(m); this.vertices += P.length / 3;
    this.hyphen = linien.length;
    // Lichtpunkte des Myzels (folgen der Wachstumsfront entlang der Rhizomorphe)
    const rh = linien.filter((l) => l.art).flatMap((l) => l.pts).map((p) => [p[0], p[1], p[2] * k]).filter((p) => p[2] <= 1).sort((a, b) => a[2] - b[2]);
    this.lichter = [[kx, ky, 0]];
    for (const q of [0.12, 0.25, 0.38, 0.5, 0.64, 0.8, 0.95]) { const c = rh.filter((p) => Math.abs(p[2] - q) < 0.05); this.lichter.push(c.length ? c[Math.floor(c.length / 2)] : [kx, ky, q]); }
    this.lichter[4] = [this.kontakt[0], this.kontakt[1], 0.5];
  }
  // ------------------------------------------------------------------ Hallimasch-Büschel am Stammfuß der Tanne (erscheinen mit dem Befall)
  _pilze() {
    const mat = this._mat(0);
    this.buschel = [];
    const lagen = [[this.tanneX - 0.17, -0.1, 0.0], [this.tanneX + 0.15, -0.26, 0.25], [this.tanneX - 0.05, -0.36, 0.5], [this.tanneX + 0.32, -0.08, 0.7], [-0.9, -0.5, 0.85]];
    lagen.forEach(([x, z, s], i) => {
      const g = fruchtkoerper(9 + i * 2, this.seed + i);
      g.setAttribute("farbe", g.getAttribute("color"));
      const m = new THREE.Mesh(g, mat); m.position.set(x, 0, z); m.rotation.y = i * 1.3; m.frustumCulled = false; m.scale.setScalar(0);
      this.gruppe.add(m); this.vertices += g.getAttribute("position").count; this.buschel.push({ m, s });
    });
  }

  zeige(an = true) { this.gruppe.visible = an; return this; }
  /** Feste Kamera-Einstellungen in Weltkoordinaten */
  kamera(art = "total") {
    const [px, py, pz] = this.pos, P = (x, y, z) => [px + x, py + y, pz + z];
    if (art === "wurzel") { const [x, y] = this.kontaktNah; return { pos: P(x + 0.12, y + 0.22, 1.25), ziel: P(x, y - 0.02, 0), fov: 50 }; }
    if (art === "keim") { const [x, y] = this.keim; return { pos: P(x + 0.1, y + 0.25, 1.4), ziel: P(x + 0.05, y, 0), fov: 52 }; }
    if (art === "boden") return { pos: P(-0.15, -0.35, 3.3), ziel: P(-0.15, -0.75, 0), fov: 56 };
    return { pos: P(-0.3, 0.95, 5.45), ziel: P(-0.3, 0.45, 0), fov: 60 };
  }
  update(t, { wachstum = 0, befall = 0, glanz = 1, licht = 1, farbe = null } = {}) {
    const u = this.u;
    u.uW.value = wachstum; u.uBefall.value = befall; u.uGlanz.value = glanz; u.uLicht.value = licht; u.uZeit.value = t;
    if (farbe) u.uGlowCol.value.copy(C(farbe));
    this.lichter.forEach((l, i) => {
      const an = smoothstep(l[2] - 0.02, l[2] + 0.12, wachstum) * (i === 0 ? 1 : 0.8) * (i === 4 ? 0.6 + 0.5 * clamp((wachstum - 0.5) * 3) : 1);
      u.uGlow.value[i].set(l[0], Math.min(l[1], -0.25), 0.16, 0.55 * glanz * an * (0.9 + 0.1 * Math.sin(t * 2 + i)));
    });
    for (const b of this.buschel) { const k = smoothstep(0.55 + b.s * 0.35, 0.7 + b.s * 0.3, befall); b.m.scale.set(k * 1.3, k * 1.3 * (0.5 + 0.5 * k), k * 1.3); b.m.visible = k > 0.001; }
    return this;
  }
}
