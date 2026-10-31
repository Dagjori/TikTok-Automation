// Baukasten für Designstil 2 „Isometrisches 3D“ (Vorbild: pipeline/stile/stil_2_isometrisch.*).
// Flache Facetten (Lambert, flatShading), harte Schatten, orthografische Kamera, schwebende Kachel bzw. Streifen
// mit Erdschichten, kantige Spielzeugautos, Pastell-Hintergrund. Keine Unschärfe, kein Tonemapping.
//
// Inhalt
//   ISO, isoMat, isoBox, isoVerlauf        Farben, Material-Cache, Quader, Hintergrund-Verlauf
//   IsoBuehne                               Renderer: MSAA-Ziel, Übergänge (blende, wisch, schieben), sRGB, Dithering
//   isoKamera, richteKamera                 orthografische Kamera mit fester Blickrichtung (Azimut/Höhe)
//   isoLicht                                Sonne mit harten Schatten (folgt dem Bildausschnitt), Himmelslicht
//   StrassenStreifen                        schwebender Streifen mit Richtungsfahrbahn (2 Spuren), mitlaufender Kulisse,
//                                           Start-/Zielportal und Kilometertafeln (Weltkoordinate x läuft mit)
//   IsoAutos                                instanzierte Spielzeugautos (Karosserie, Kabine, Dach, Räder, Lichter)
//   IsoVerkehr                              Abspieler für 1-Hz-Bahnen aus der Simulation (glatt, Spurwechsel, Bremslicht)
//   IsoDuellTafel                           Anzeigetafel für zwei Personen im Stil der Preisschilder (DOM)
// Stile: engine/iso.css. Alles hängt nur an der Zeit t (deterministisch).
import * as THREE from "three";
import { feder, FEDER, ease, fortschritt, clamp, lerp, hash } from "./bewegung.js";
import { el, animiere } from "./hud.js";

export const ISO = {
  hintergrund: [[0, "#E6E8FD"], [0.55, "#D6DAFB"], [1, "#C3C8F4"]],
  gras: "#93D27C",
  grasRand: "#86C96F",
  erde: ["#D9A56B", "#B98352"],
  stein: "#9C6C42",
  asphalt: "#5E6479",
  seitenstreifen: "#6A7086",
  markierung: "#FFFFFF",
  bord: "#E9EAF2",
  planke: "#D3D7EA",
  pfosten: "#8E93A8",
  stamm: "#8B5E3C",
  baum: ["#3FAE5C", "#58C26E", "#4CB865"],
  tinte: "#1C1D3A",
  lila: "#5B5FA8",
  blau: "#2F6FED",
  orange: "#FF7A1A",
  gruen: "#19B36B",
  gelb: "#FFD23F",
  rot: "#F0443A",
};

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- Material und Grundformen
const matCache = new Map();
/** Flaches Lambert-Material (Facetten-Look), je Farbe nur einmal */
export function isoMat(farbe, { basic = false } = {}) {
  const k = (basic ? "b:" : "l:") + farbe;
  if (!matCache.has(k)) {
    matCache.set(k, basic ? new THREE.MeshBasicMaterial({ color: farbe }) : new THREE.MeshLambertMaterial({ color: farbe, flatShading: true }));
  }
  return matCache.get(k);
}

/** Quader mit Unterkante auf y (wie im Stil-Muster) */
export function isoBox(w, h, d, farbe, x, y, z, eltern = null, { schatten = true, empfangen = true } = {}) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof farbe === "string" ? isoMat(farbe) : farbe);
  b.position.set(x, y + h / 2, z);
  b.castShadow = schatten;
  b.receiveShadow = empfangen;
  if (eltern) eltern.add(b);
  return b;
}

/** Senkrechter Farbverlauf als Hintergrund-Textur */
export function isoVerlauf(stops = ISO.hintergrund) {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 512;
  const g = c.getContext("2d");
  const lin = g.createLinearGradient(0, 0, 0, 512);
  for (const [p, f] of stops) lin.addColorStop(p, f);
  g.fillStyle = lin;
  g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function canvasTextur(b, h, zeichne) {
  const c = document.createElement("canvas");
  c.width = b;
  c.height = h;
  zeichne(c.getContext("2d"), b, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function rundRect(g, x, y, b, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + b, y, x + b, y + h, r);
  g.arcTo(x + b, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + r, y, r);
  g.closePath();
}

// ---------------------------------------------------------------- Bühne (Renderer, Übergänge)
const VERTEX = /* glsl */ `varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FINAL = /* glsl */ `
uniform sampler2D tA, tB; uniform float p; uniform int typ; uniform vec2 richtung; uniform float aspekt;
uniform vec3 farbe1, farbe2; uniform float bildNr; uniform float koernung; uniform vec2 aufloesung;
varying vec2 vUv;
vec3 zuSRGB(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float h12(vec2 q) { vec3 p3 = fract(vec3(q.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec3 a = zuSRGB(texture2D(tA, vUv).rgb);
  vec3 col = a;
  if (typ == 1) { // Blende
    col = mix(a, zuSRGB(texture2D(tB, vUv).rgb), smoothstep(0.0, 1.0, p));
  } else if (typ == 2) { // Wisch mit zwei Farbbändern (Klötzchen-Kante)
    vec2 dir = normalize(richtung);
    vec2 q = vUv - 0.5; q.x *= aspekt;
    float s = dot(q, dir);
    float breite = 0.075;
    float front = mix(-0.75, 0.75 + 2.0 * breite, p);
    vec3 b = zuSRGB(texture2D(tB, vUv).rgb);
    float x = front - s;
    col = x < 0.0 ? a : (x < breite ? zuSRGB(farbe1) : (x < 2.0 * breite ? zuSRGB(farbe2) : b));
  } else if (typ == 3) { // Schieben: B schiebt A aus dem Bild
    vec2 dir = normalize(richtung);
    float e = p * p * (3.0 - 2.0 * p);
    vec2 uvA = vUv + dir * e;
    vec2 uvB = vUv + dir * (e - 1.0);
    bool inA = all(greaterThanEqual(uvA, vec2(0.0))) && all(lessThanEqual(uvA, vec2(1.0)));
    col = inA ? zuSRGB(texture2D(tA, uvA).rgb) : zuSRGB(texture2D(tB, uvB).rgb);
  }
  vec2 px = floor(vUv * aufloesung);
  float o = mod(bildNr, 64.0) * 17.31;
  float n = (h12(px + o) + h12(floor(px * 0.5) + o * 1.7)) * 0.5 - 0.5;
  col += n * koernung;
  col += (h12(px * 1.37 + o + 11.0) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

export class IsoBuehne {
  /** canvas: Leinwand; msaa: Kantenglättung (Samples); koernung: leichte Körnung gegen „Plastik-Look“ */
  constructor(canvas, { breite = 1080, hoehe = 1920, msaa = 4, koernung = 0.012 } = {}) {
    this.breite = breite;
    this.hoehe = hoehe;
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: false });
    r.setPixelRatio(1);
    r.setSize(breite, hoehe, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.localClippingEnabled = true;
    this.renderer = r;
    const ziel = () => new THREE.WebGLRenderTarget(breite, hoehe, { type: THREE.HalfFloatType, samples: msaa, depthBuffer: true });
    this.rtA = ziel();
    this.rtB = ziel();
    this.koernung = koernung;
    this.kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.final = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FINAL,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tA: { value: null }, tB: { value: null }, p: { value: 0 }, typ: { value: 0 }, richtung: { value: new THREE.Vector2(1, 0) },
        aspekt: { value: breite / hoehe }, farbe1: { value: new THREE.Color(ISO.gelb) }, farbe2: { value: new THREE.Color(ISO.blau) },
        bildNr: { value: 0 }, koernung: { value: koernung }, aufloesung: { value: new THREE.Vector2(breite, hoehe) },
      },
    });
    this.quad = new THREE.Mesh(geo, this.final);
    this.quad.frustumCulled = false;
    this.quadSzene = new THREE.Scene();
    this.quadSzene.add(this.quad);
  }
  _welt(welt, rt, t) {
    if (welt.update) welt.update(t);
    this.renderer.setRenderTarget(rt);
    this.renderer.clear();
    this.renderer.render(welt.szene, welt.kamera);
  }
  /** Ein Bild: Welt A, optional Übergang zu Welt B ({typ:'blende'|'wisch'|'schieben', p, richtung, farbe1, farbe2}) */
  zeichne(weltA, { weltB = null, uebergang = null, bildNr = 0, t = 0 } = {}) {
    this._welt(weltA, this.rtA, t);
    const u = this.final.uniforms;
    u.tA.value = this.rtA.texture;
    u.typ.value = 0;
    if (weltB && uebergang) {
      this._welt(weltB, this.rtB, t);
      u.tB.value = this.rtB.texture;
      u.p.value = uebergang.p;
      u.typ.value = { blende: 1, wisch: 2, schieben: 3 }[uebergang.typ] ?? 1;
      u.richtung.value.set(...(uebergang.richtung || [1, 0]));
      u.farbe1.value.set(uebergang.farbe1 || ISO.gelb);
      u.farbe2.value.set(uebergang.farbe2 || ISO.blau);
    }
    u.bildNr.value = bildNr;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadSzene, this.kamera);
  }
}

// ---------------------------------------------------------------- Kamera
/**
 * Orthografische Kamera mit fester Blickrichtung. azimut: Drehung aus der Seitenansicht (0° = Straße waagerecht,
 * 45° = echte Isometrie), hoehe: Blickwinkel von oben (35,26° = Isometrie). Straßen entlang +x steigen nach rechts an.
 */
export function isoKamera({ azimut = 30, hoehe = 35, breite = 100 } = {}) {
  const k = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 4000);
  const a = (azimut * Math.PI) / 180, e = (hoehe * Math.PI) / 180;
  k.userData.richtung = V(-Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).normalize();
  richteKamera(k, { ziel: [0, 0, 0], breite });
  return k;
}
/** Bildausschnitt: ziel (Weltpunkt in Bildmitte), breite (Welteinheiten über 1080 px), versatzY (px, + = Ziel weiter oben) */
export function richteKamera(k, { ziel = [0, 0, 0], breite = 100, versatzY = 0, seitenverhaeltnis = 1080 / 1920 } = {}) {
  const h = breite / seitenverhaeltnis;
  const dy = (versatzY / 1920) * h;
  k.left = -breite / 2;
  k.right = breite / 2;
  k.top = h / 2 - dy;
  k.bottom = -h / 2 - dy;
  const z = V(...ziel);
  k.position.copy(z).addScaledVector(k.userData.richtung, 1000);
  k.up.set(0, 1, 0);
  k.lookAt(z);
  k.updateProjectionMatrix();
  k.updateMatrixWorld();
  return k;
}
/** Weltpunkt → Bildpunkt (px) */
export function bildpunkt(k, p) {
  const v = p.clone().project(k);
  return { x: ((v.x + 1) / 2) * 1080, y: ((1 - v.y) / 2) * 1920 };
}

// ---------------------------------------------------------------- Licht
/** Licht wie im Stil-Muster: helle Deckflächen, mittlere Front, dunkle Seiten; harte Schatten */
export function isoLicht(szene, { schattenKarte = 4096, staerke = 2.3, himmel = 1.35 } = {}) {
  const hemi = new THREE.HemisphereLight("#ffffff", "#b9bfe8", himmel);
  szene.add(hemi);
  const sonne = new THREE.DirectionalLight("#ffffff", staerke);
  sonne.castShadow = true;
  sonne.shadow.mapSize.set(schattenKarte, schattenKarte);
  sonne.shadow.bias = -0.0005;
  sonne.shadow.normalBias = 0.03;
  szene.add(sonne, sonne.target);
  const richtung = V(-0.42, 1.0, 0.62).normalize();
  /** Schatten-Box um einen Punkt (Radius r in m) legen, auf Texel gerastert (kein Flimmern) */
  const folge = (mitte, r = 70) => {
    const c = sonne.shadow.camera;
    if (Math.abs(c.right - r) > 0.01) {
      c.left = -r; c.right = r; c.top = r; c.bottom = -r;
      c.near = 1; c.far = 600;
      c.updateProjectionMatrix();
    }
    const raster = (2 * r) / schattenKarte;
    const m = mitte.clone();
    m.x = Math.round(m.x / raster) * raster;
    m.z = Math.round(m.z / raster) * raster;
    sonne.position.copy(m).addScaledVector(richtung, 250);
    sonne.target.position.copy(m);
    sonne.target.updateMatrixWorld();
  };
  folge(V(0, 0, 0));
  return { sonne, hemi, folge };
}

// ---------------------------------------------------------------- Instanz-Hilfe
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
function instanz(geo, mat, max, { schatten = true, empfangen = true } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, max);
  m.castShadow = schatten;
  m.receiveShadow = empfangen;
  m.frustumCulled = false;
  m.count = 0;
  return m;
}
function setzeInstanz(mesh, i, x, y, z, sx = 1, sy = 1, sz = 1, rotY = 0) {
  _q.setFromEuler(_e.set(0, rotY, 0));
  mesh.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)));
}

// ---------------------------------------------------------------- Straßenstreifen
/**
 * Schwebender Streifen (Kachel) mit einer Richtungsfahrbahn: 2 Spuren (Spur 0 rechts bei +z, Spur 1 links bei −z),
 * Standstreifen rechts, Leitplanke links, Bankette mit Leitpfosten, Bäume. Fahrtrichtung +x.
 * Die Weltkoordinate x (m, wie in der Simulation) läuft mit: setzeZentrum(x) verschiebt Markierungen und Kulisse,
 * der Streifen selbst bleibt stehen. Lokale Lage eines Weltpunkts: x − zentrum.
 * opt: laenge, tiefe (Breite quer zur Straße), dicke (Erdschichten), seed, start (x des Startportals), ziel (x Zielportal),
 *      kmTafeln: [x …] mit Beschriftung, kulisse: Dichte der Bäume (0..1)
 */
export class StrassenStreifen {
  constructor({ laenge = 300, tiefe = 30, dicke = 4.2, spur = 3.75, standstreifen = 3.0, seed = 1, start = null, ziel = null, kmTafeln = [], kulisse = 1 } = {}) {
    Object.assign(this, { laenge, tiefe, dicke, spur, standstreifen, seed, start, ziel, kmTafeln, kulisse });
    const g = new THREE.Group();
    this.gruppe = g;
    const L = laenge, T = tiefe;
    // Fahrbahn quer: Leitplanke links (−z), Spur 1, Spur 0, Standstreifen (+z)
    this.zLinks = -spur - 1.2; // linker Fahrbahnrand (Bankett mit Planke)
    this.zRechts = spur + standstreifen; // rechter Rand des Standstreifens
    // Kachel: Gras oben, zwei Erdschichten, Steine an der Front
    isoBox(L, 0.5, T, ISO.gras, 0, -0.5, 0, g, { schatten: false });
    isoBox(L, dicke * 0.42, T, ISO.erde[0], 0, -0.5 - dicke * 0.42, 0, g, { schatten: false });
    isoBox(L, dicke * 0.58, T, ISO.erde[1], 0, -0.5 - dicke, 0, g, { schatten: false });
    const steine = [];
    for (let i = 0; i < L / 3; i++) steine.push(V(-L / 2 + hash(i, seed * 7 + 1) * L, -0.9 - hash(i, seed * 7 + 2) * (dicke - 0.6), T / 2 + 0.02));
    const steinMesh = instanz(new THREE.BoxGeometry(0.9, 0.34, 0.06), isoMat(ISO.stein), steine.length, { schatten: false });
    steine.forEach((p, i) => setzeInstanz(steinMesh, i, p.x, p.y, p.z, 0.6 + hash(i, seed + 3) * 0.8, 1, 1));
    steinMesh.count = steine.length;
    g.add(steinMesh);
    // Asphalt und Standstreifen
    const fb = isoBox(L, 0.1, this.zRechts - this.zLinks, ISO.asphalt, 0, 0, (this.zLinks + this.zRechts) / 2, g, { schatten: false });
    fb.receiveShadow = true;
    // Bankette (heller Rand) links und rechts
    isoBox(L, 0.14, 1.0, ISO.bord, 0, 0, this.zLinks - 0.5, g, { schatten: false });
    isoBox(L, 0.14, 0.8, ISO.bord, 0, 0, this.zRechts + 0.4, g, { schatten: false });
    // durchgehende Linien: links, zwischen Spur 0 und Standstreifen
    isoBox(L, 0.02, 0.18, ISO.markierung, 0, 0.1, this.zLinks + 0.45, g, { schatten: false });
    isoBox(L, 0.02, 0.22, ISO.markierung, 0, 0.1, spur + 0.05, g, { schatten: false });
    // Leitplanke links (durchgehend) auf Pfosten
    isoBox(L, 0.32, 0.12, ISO.planke, 0, 0.62, this.zLinks - 0.55, g);
    // mitlaufende Teile (Instanzen, jedes Bild neu gesetzt)
    this.striche = instanz(new THREE.BoxGeometry(6, 0.02, 0.18), isoMat(ISO.markierung), Math.ceil(L / 18) + 4, { schatten: false });
    this.plankenPfosten = instanz(new THREE.BoxGeometry(0.14, 0.75, 0.14), isoMat(ISO.pfosten), Math.ceil(L / 4) + 4);
    this.leitpfosten = instanz(new THREE.BoxGeometry(0.16, 1.0, 0.16), isoMat("#FFFFFF"), Math.ceil(L / 50) + 4);
    this.leitpfostenBand = instanz(new THREE.BoxGeometry(0.17, 0.18, 0.17), isoMat("#2A2E45"), Math.ceil(L / 50) + 4, { schatten: false });
    const kroneSpitz = new THREE.ConeGeometry(1.5, 3.8, 6);
    const kroneRund = new THREE.IcosahedronGeometry(1.55, 0);
    const maxBaeume = Math.ceil((L / 7) * 2 * kulisse) + 8;
    this.staemme = instanz(new THREE.BoxGeometry(0.45, 1.1, 0.45), isoMat(ISO.stamm), maxBaeume);
    this.kronenSpitz = ISO.baum.map((f) => instanz(kroneSpitz, isoMat(f), maxBaeume));
    this.kronenRund = ISO.baum.map((f) => instanz(kroneRund, isoMat(f), maxBaeume));
    this.buesche = instanz(new THREE.IcosahedronGeometry(0.9, 0), isoMat(ISO.grasRand), Math.ceil(L / 6) + 6);
    g.add(this.striche, this.plankenPfosten, this.leitpfosten, this.leitpfostenBand, this.staemme, ...this.kronenSpitz, ...this.kronenRund, this.buesche);
    // Portale und Tafeln (Gruppen, werden verschoben)
    this.portale = [];
    if (start !== null) this.portale.push({ x: start, g: this._portal("START", ISO.gruen) });
    if (ziel !== null) this.portale.push({ x: ziel, g: this._portal("ZIEL", ISO.tinte, true) });
    this.tafeln = kmTafeln.map(({ x, text }) => ({ x, g: this._tafel(text) }));
    for (const o of [...this.portale, ...this.tafeln]) g.add(o.g);
    this.setzeZentrum(0);
  }
  /** z-Lage einer Spur (kontinuierlich: 0 = rechte Spur, 1 = linke Spur) */
  spurZ(s) {
    return (0.5 - s) * this.spur;
  }
  _portal(text, farbe, kariert = false) {
    const g = new THREE.Group();
    const breite = this.zRechts - this.zLinks + 1.2;
    const zm = (this.zLinks + this.zRechts) / 2;
    const hoehe = 6.2;
    for (const z of [this.zLinks - 0.8, this.zRechts + 0.5]) isoBox(0.45, hoehe, 0.45, "#E9EAF2", 0, 0, z, g);
    const tex = canvasTextur(1024, 160, (c, b, h) => {
      if (kariert) {
        const n = 32;
        for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? "#1C1D3A" : "#FFFFFF"; c.fillRect((i * b) / n, (j * h) / 4, b / n + 1, h / 4 + 1); }
        c.fillStyle = "#FFFFFF";
        rundRect(c, b * 0.3, h * 0.12, b * 0.4, h * 0.76, 22);
        c.fill();
        c.fillStyle = "#1C1D3A";
      } else {
        c.fillStyle = farbe;
        c.fillRect(0, 0, b, h);
        c.fillStyle = "#FFFFFF";
      }
      c.font = "900 104px 'SB Display', Inter, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(text, b / 2, h / 2 + 6);
    });
    const balken = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.25, breite), isoMat(farbe));
    // Schrift auf der Seite, die dem ankommenden Verkehr (und der Kamera, die von −x schaut) zugewandt ist
    const schild = new THREE.Mesh(new THREE.PlaneGeometry(breite, 1.25), new THREE.MeshLambertMaterial({ map: tex }));
    schild.rotation.y = -Math.PI / 2;
    schild.position.set(-0.26, hoehe - 0.1, zm);
    balken.position.set(0, hoehe - 0.1, zm);
    balken.castShadow = true;
    g.add(balken, schild);
    // Linie über die Fahrbahn (Ziel: schwarz-weiß kariert)
    if (kariert) {
      for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) {
        const f = (i + j) % 2 ? "#1C1D3A" : "#FFFFFF";
        const q = isoBox(0.6, 0.03, (this.zRechts - this.zLinks - 0.2) / 12, f, -0.3 + j * 0.6, 0.1, this.zLinks + 0.1 + ((i + 0.5) * (this.zRechts - this.zLinks - 0.2)) / 12, g, { schatten: false });
        q.receiveShadow = true;
      }
    } else {
      const linie = isoBox(0.6, 0.03, this.zRechts - this.zLinks - 0.2, farbe, 0, 0.1, zm, g, { schatten: false });
      linie.receiveShadow = true;
    }
    // große Tafel auf dem vorderen Bankett, der Kamera zugewandt (gut lesbar)
    const tafel = canvasTextur(640, 256, (c, b, h) => {
      c.fillStyle = "#FFFFFF";
      rundRect(c, 0, 0, b, h, 40);
      c.fill();
      if (kariert) {
        const n = 10;
        c.save();
        rundRect(c, 14, 14, b - 28, h - 28, 30);
        c.clip();
        for (let i = 0; i < n * 2; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? "#1C1D3A" : "#FFFFFF"; c.fillRect((i * b) / (n * 2), (j * h) / 4, b / (n * 2) + 1, h / 4 + 1); }
        c.restore();
        c.fillStyle = "#FFFFFF";
        rundRect(c, b * 0.2, h * 0.2, b * 0.6, h * 0.6, 26);
        c.fill();
        c.fillStyle = "#1C1D3A";
      } else {
        c.fillStyle = farbe;
        rundRect(c, 14, 14, b - 28, h - 28, 30);
        c.fill();
        c.fillStyle = "#FFFFFF";
      }
      c.font = "900 112px 'SB Display', Inter, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(text, b / 2, h / 2 + 8);
    });
    const zt = this.zRechts + 2.2;
    isoBox(0.22, 2.2, 0.22, ISO.pfosten, -1.9, 0, zt, g);
    isoBox(0.22, 2.2, 0.22, ISO.pfosten, 1.9, 0, zt, g);
    const brett = isoBox(5.0, 2.0, 0.16, kariert ? "#1C1D3A" : farbe, 0, 2.0, zt, g);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 2.0), new THREE.MeshLambertMaterial({ map: tafel }));
    front.position.set(0, 3.0, zt + 0.09);
    g.add(front);
    return g;
  }
  _tafel(text) {
    const g = new THREE.Group();
    const tex = canvasTextur(512, 256, (c, b, h) => {
      c.fillStyle = "#FFFFFF";
      rundRect(c, 0, 0, b, h, 34);
      c.fill();
      c.fillStyle = ISO.blau;
      rundRect(c, 14, 14, b - 28, h - 28, 24);
      c.fill();
      c.fillStyle = "#FFFFFF";
      c.font = "900 120px 'SB Display', Inter, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(text, b / 2, h / 2 + 8);
    });
    const z = this.zRechts + 1.6;
    isoBox(0.18, 2.6, 0.18, ISO.pfosten, 0, 0, z, g);
    const brett = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 0.12), isoMat(ISO.blau));
    brett.position.set(0, 3.2, z);
    brett.castShadow = true;
    const front = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshLambertMaterial({ map: tex }));
    front.position.set(0, 3.2, z + 0.07);
    g.add(brett, front);
    return g;
  }
  /** Weltkoordinate in der Mitte des Streifens setzen (Kulisse läuft mit) */
  setzeZentrum(x0) {
    this.zentrum = x0;
    const L = this.laenge, hl = L / 2, seed = this.seed;
    // Leitlinie: 6 m Strich, 12 m Lücke
    let n = 0;
    for (let k = Math.floor((x0 - hl) / 18) - 1; k * 18 <= x0 + hl + 18; k++) {
      const lx = k * 18 + 3 - x0;
      if (lx < -hl + 3 || lx > hl - 3) continue;
      setzeInstanz(this.striche, n++, lx, 0.11, 0);
    }
    this.striche.count = n;
    // Pfosten der Leitplanke alle 4 m
    n = 0;
    for (let k = Math.floor((x0 - hl) / 4); k * 4 <= x0 + hl; k++) {
      const lx = k * 4 - x0;
      if (Math.abs(lx) > hl - 0.2) continue;
      setzeInstanz(this.plankenPfosten, n++, lx, 0.375, this.zLinks - 0.55);
    }
    this.plankenPfosten.count = n;
    // Leitpfosten alle 50 m rechts
    n = 0;
    for (let k = Math.floor((x0 - hl) / 50); k * 50 <= x0 + hl; k++) {
      const lx = k * 50 - x0;
      if (Math.abs(lx) > hl - 0.2) continue;
      setzeInstanz(this.leitpfosten, n, lx, 0.6, this.zRechts + 0.5);
      setzeInstanz(this.leitpfostenBand, n, lx, 0.92, this.zRechts + 0.5);
      n++;
    }
    this.leitpfosten.count = this.leitpfostenBand.count = n;
    // Bäume: Raster von 7 m, je Seite zufällig (deterministisch nach Weltlage)
    const zahl = new Array(ISO.baum.length).fill(0), zahlR = new Array(ISO.baum.length).fill(0);
    let nS = 0;
    const T = this.tiefe;
    const seiten = [
      { z0: this.zRechts + 2.6, z1: T / 2 - 1.6, salz: 11 },
      { z0: -T / 2 + 1.6, z1: this.zLinks - 2.2, salz: 23 },
    ];
    for (const s of seiten) {
      if (s.z1 - s.z0 < 0.5) continue;
      for (let k = Math.floor((x0 - hl) / 7); k * 7 <= x0 + hl; k++) {
        if (hash(k, seed * 31 + s.salz) > 0.55 * this.kulisse) continue;
        const lx = k * 7 + hash(k, seed * 31 + s.salz + 1) * 4 - x0;
        if (Math.abs(lx) > hl - 1.8) continue;
        // nicht auf Portale oder Tafeln
        if (this.portale.some((p) => Math.abs(p.x - x0 - lx) < 4) || this.tafeln.some((p) => Math.abs(p.x - x0 - lx) < 3)) continue;
        const z = s.z0 + hash(k, seed * 31 + s.salz + 2) * (s.z1 - s.z0);
        const gr = 0.75 + hash(k, seed * 31 + s.salz + 3) * 0.55;
        const f = Math.floor(hash(k, seed * 31 + s.salz + 4) * ISO.baum.length);
        const rund = hash(k, seed * 31 + s.salz + 5) < 0.4;
        setzeInstanz(this.staemme, nS++, lx, 0.55 * gr, z, gr, gr, gr);
        if (rund) setzeInstanz(this.kronenRund[f], zahlR[f]++, lx, 2.5 * gr, z, gr, gr, gr, hash(k, 99) * 3);
        else setzeInstanz(this.kronenSpitz[f], zahl[f]++, lx, 2.9 * gr, z, gr, gr, gr, hash(k, 98) * 3);
      }
    }
    this.staemme.count = nS;
    this.kronenSpitz.forEach((m, i) => { m.count = zahl[i]; m.instanceMatrix.needsUpdate = true; });
    this.kronenRund.forEach((m, i) => { m.count = zahlR[i]; m.instanceMatrix.needsUpdate = true; });
    // Büsche an der Planke
    n = 0;
    for (let k = Math.floor((x0 - hl) / 6); k * 6 <= x0 + hl; k++) {
      if (hash(k, seed * 17 + 5) > 0.45) continue;
      const lx = k * 6 + hash(k, seed * 17 + 6) * 3 - x0;
      if (Math.abs(lx) > hl - 1.2) continue;
      const gr = 0.7 + hash(k, seed * 17 + 7) * 0.5;
      setzeInstanz(this.buesche, n++, lx, 0.4 * gr, this.zLinks - 1.7 - hash(k, seed * 17 + 8) * 1.2, gr * 1.2, gr * 0.8, gr);
    }
    this.buesche.count = n;
    for (const m of [this.striche, this.plankenPfosten, this.leitpfosten, this.leitpfostenBand, this.staemme, this.buesche]) m.instanceMatrix.needsUpdate = true;
    for (const o of [...this.portale, ...this.tafeln]) {
      const lx = o.x - x0;
      o.g.visible = Math.abs(lx) < hl - 1;
      o.g.position.x = lx;
    }
  }
}

// ---------------------------------------------------------------- Spielzeugautos
/**
 * Kantige Spielzeugautos (wie im Stil-Muster), instanziert. Fahrtrichtung lokal +x.
 * setze(liste): [{x, z, gier, farbe: THREE.Color, bremse: 0..1, sichtbar?: 0..1}] in Koordinaten der Gruppe.
 */
export class IsoAutos {
  constructor(max = 300, { laenge = 4.5, breite = 2.0 } = {}) {
    this.max = max;
    this.L = laenge;
    this.B = breite;
    this.gruppe = new THREE.Group();
    const weiss = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    const teil = (geo, mat, n, schatten = true) => {
      const m = instanz(geo, mat, n, { schatten, empfangen: true });
      this.gruppe.add(m);
      return m;
    };
    this.karo = teil(new THREE.BoxGeometry(laenge, 0.95, breite), weiss, max);
    this.kabine = teil(new THREE.BoxGeometry(laenge * 0.5, 0.82, breite * 0.9), isoMat("#26304A"), max);
    this.dach = teil(new THREE.BoxGeometry(laenge * 0.44, 0.2, breite * 0.8), weiss.clone(), max);
    this.raeder = teil(new THREE.BoxGeometry(0.78, 0.7, 0.3), isoMat("#22263A"), max * 4);
    this.scheinwerfer = teil(new THREE.BoxGeometry(0.08, 0.24, 0.48), isoMat("#FFF3C4", { basic: true }), max * 2, false);
    this.ruecklicht = teil(new THREE.BoxGeometry(0.08, 0.24, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }), max * 2, false);
    for (const [m, n] of [[this.karo, max], [this.dach, max], [this.ruecklicht, max * 2]]) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this._b = new THREE.Matrix4();
    this._l = new THREE.Matrix4();
    this._w = new THREE.Matrix4();
    this._c = new THREE.Color();
    this.aus = new THREE.Color("#7A2A2A");
    this.an = new THREE.Color("#FF2E1F");
  }
  setze(liste) {
    const n = Math.min(liste.length, this.max);
    const { L, B } = this;
    for (let i = 0; i < n; i++) {
      const a = liste[i];
      const sk = a.skala ?? 1;
      _q.setFromEuler(_e.set(0, a.gier || 0, 0));
      this._b.compose(_p.set(a.x, a.y ?? 0.1, a.z), _q, _s.set(sk, sk, sk));
      const setz = (mesh, idx, x, y, z) => {
        this._l.makeTranslation(x, y, z);
        this._w.multiplyMatrices(this._b, this._l);
        mesh.setMatrixAt(idx, this._w);
      };
      setz(this.karo, i, 0, 0.75, 0);
      setz(this.kabine, i, -L * 0.06, 1.62, 0);
      setz(this.dach, i, -L * 0.06, 2.12, 0);
      this.karo.setColorAt(i, a.farbe);
      this.dach.setColorAt(i, a.farbe);
      const rx = L * 0.3, rz = B * 0.5;
      setz(this.raeder, i * 4, rx, 0.35, rz);
      setz(this.raeder, i * 4 + 1, -rx, 0.35, rz);
      setz(this.raeder, i * 4 + 2, rx, 0.35, -rz);
      setz(this.raeder, i * 4 + 3, -rx, 0.35, -rz);
      setz(this.scheinwerfer, i * 2, L / 2 + 0.02, 0.95, B * 0.3);
      setz(this.scheinwerfer, i * 2 + 1, L / 2 + 0.02, 0.95, -B * 0.3);
      setz(this.ruecklicht, i * 2, -L / 2 - 0.02, 0.95, B * 0.3);
      setz(this.ruecklicht, i * 2 + 1, -L / 2 - 0.02, 0.95, -B * 0.3);
      const c = this._c.copy(this.aus).lerp(this.an, clamp(a.bremse || 0));
      this.ruecklicht.setColorAt(i * 2, c);
      this.ruecklicht.setColorAt(i * 2 + 1, c);
    }
    this.karo.count = this.kabine.count = this.dach.count = n;
    this.raeder.count = n * 4;
    this.scheinwerfer.count = this.ruecklicht.count = n * 2;
    for (const m of [this.karo, this.kabine, this.dach, this.raeder, this.scheinwerfer, this.ruecklicht]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
}

// ---------------------------------------------------------------- Verkehr aus der Simulation
function lineareBahn(xs) {
  const n = xs.length;
  const summe = new Float64Array(n);
  for (let k = 1; k < n; k++) summe[k] = summe[k - 1] + (xs[k - 1] + xs[k]) / 2;
  const d0 = n > 1 ? xs[1] - xs[0] : 0;
  const d1 = n > 1 ? xs[n - 1] - xs[n - 2] : 0;
  const P = (u) => {
    if (n < 2) return xs[0];
    if (u <= 0) return xs[0] + d0 * u;
    if (u >= n - 1) return xs[n - 1] + d1 * (u - (n - 1));
    const k = Math.floor(u);
    return xs[k] + (xs[k + 1] - xs[k]) * (u - k);
  };
  const I = (u) => {
    if (n < 2) return xs[0] * u;
    if (u <= 0) return xs[0] * u + (d0 * u * u) / 2;
    if (u >= n - 1) {
      const r = u - (n - 1);
      return summe[n - 1] + xs[n - 1] * r + (d1 * r * r) / 2;
    }
    const k = Math.floor(u);
    const f = u - k;
    return summe[k] + xs[k] * f + ((xs[k + 1] - xs[k]) * f * f) / 2;
  };
  return { P, I };
}
const glatt = (u) => {
  const s = clamp(u);
  return s * s * (3 - 2 * s);
};

/**
 * Abspieler für 1-Hz-Bahnen (Format von pipeline/sim/auswertung_spurwechsel.mjs: fahrzeuge [{id, typ, rolle, t0, x[], s[], v[]}]).
 * Weg: lineare Interpolation, gleitendes Mittel über `glaettungS` (exakt über das Integral, bleibt monoton und
 * hält den Abstand ein). Spurwechsel: weicher Übergang über `wechselDauerS`, Beginn `wechselVersatzS` nach dem Modellschritt.
 */
export class IsoVerkehr {
  constructor(daten, { glaettungS = 0.7, wechselDauerS = 1.1, wechselVersatzS = -0.3 } = {}) {
    this.daten = daten;
    this.h = glaettungS / 2;
    this.wd = wechselDauerS;
    this.wv = wechselVersatzS;
    this.bahnen = daten.fahrzeuge.map((f) => {
      const { P, I } = lineareBahn(f.x);
      const wechsel = [];
      for (let k = 0; k + 1 < f.s.length; k++) if (f.s[k] !== f.s[k + 1]) wechsel.push({ t: f.t0 + k, von: f.s[k], nach: f.s[k + 1] });
      return { ...f, P, I, n: f.x.length, wechsel };
    });
    this.nachId = new Map();
    for (const b of this.bahnen) {
      if (!this.nachId.has(b.id)) this.nachId.set(b.id, []);
      this.nachId.get(b.id).push(b);
    }
  }
  /** Zustand einer Bahn zur Zeit tau (null, wenn nicht vorhanden) */
  zustand(b, tau) {
    const u = tau - b.t0;
    if (u < 0 || u > b.n - 1) return null;
    const h = this.h;
    const x = (b.I(u + h) - b.I(u - h)) / (2 * h);
    const v = Math.max(0, (b.P(u + h) - b.P(u - h)) / (2 * h));
    const vVor = Math.max(0, (b.P(u + h - 0.35) - b.P(u - h - 0.35)) / (2 * h));
    let s = b.s[Math.min(b.n - 1, Math.max(0, Math.floor(u)))];
    let ds = 0;
    for (const e of b.wechsel) {
      const w = (tau - (e.t + this.wv)) / this.wd;
      if (w >= 0) {
        s = e.von + (e.nach - e.von) * glatt(w);
        if (w < 1) ds = ((e.nach - e.von) * 6 * w * (1 - w)) / this.wd;
      }
    }
    // Bremslicht: Verzögerung oder Stillstand
    const verz = (vVor - v) / 0.35;
    let bremse = clamp(verz / 4);
    if (v < 0.6) bremse = Math.max(bremse, 0.85);
    return { id: b.id, rolle: b.rolle, typ: b.typ, x, s, ds, v, bremse };
  }
  /** fn(zustand) für jedes Fahrzeug, das zur Zeit tau existiert */
  fahrzeuge(tau, fn) {
    for (const b of this.bahnen) {
      const z = this.zustand(b, tau);
      if (z) fn(z);
    }
  }
  /** Zustand eines bestimmten Fahrzeugs (id) */
  von(id, tau) {
    for (const b of this.nachId.get(id) || []) {
      const z = this.zustand(b, tau);
      if (z) return z;
    }
    return null;
  }
}

/** Gierwinkel beim Spurwechsel (Drehung um y; +x = Fahrtrichtung, Spur 1 liegt bei −z) */
export function gierwinkel(z, spurBreite = 3.75) {
  const quer = z.ds * spurBreite; // m/s nach −z
  return clamp(Math.atan2(quer, Math.max(z.v, 3.2)), -0.42, 0.42);
}

// ---------------------------------------------------------------- Anzeigetafel (zwei Personen)
/**
 * Anzeigetafel im Stil der Preisschilder: zwei weiße Karten mit hartem farbigem Schatten, dazwischen eine Uhr.
 * opt: {x, y, breite, ein, aus, links:{name, rolle, farbe, schatten}, rechts:{…}, zustand(t) → {
 *   uhr: "1:30" | null, links:{wert, anteil (0..1|null), zusatz (HTML|null), ziel (bool)}, rechts:{…} }, stoesse:[{t, seite}]}
 */
export class IsoDuellTafel {
  constructor(hud, { x = 54, y = 262, breite = 876, ein, aus = Infinity, links, rechts, zustand, stoesse = [] }) {
    this.e = el("div", "iso-tafel", "", hud.wurzel);
    Object.assign(this.e.style, { left: x + "px", top: y + "px", width: breite + "px" });
    const karte = (p, seite) => {
      const k = el("div", `iso-karte ${seite}`, `<div class="name"><i></i><span>${p.name}</span></div><div class="rolle">${p.rolle}</div><div class="wert"><span class="zahl"></span></div><div class="balken"><i></i></div><div class="zusatz"></div>`, this.e);
      k.style.setProperty("--f", p.farbe);
      k.style.setProperty("--k", p.schatten);
      return { k, zahl: k.querySelector(".zahl"), wert: k.querySelector(".wert"), balken: k.querySelector(".balken i"), balkenBox: k.querySelector(".balken"), zusatz: k.querySelector(".zusatz") };
    };
    this.l = karte(links, "links");
    this.mitte = el("div", "iso-uhr", `<div class="raute"></div><span></span>`, this.e);
    this.uhr = this.mitte.querySelector("span");
    this.r = karte(rechts, "rechts");
    Object.assign(this, { ein, aus, zustand, stoesse });
  }
  klangEreignisse() {
    return [{ t: this.ein, typ: "pop" }, ...this.stoesse.map((s) => ({ t: s.t, typ: "ding" }))];
  }
  update(t) {
    const r = animiere(this.e, t, { ein: this.ein, aus: this.aus, stil: "hoch", feder: FEDER.standard });
    if (!r.sichtbar) return;
    const z = this.zustand(t);
    const uhr = z.uhr ?? "";
    if (this.uhr.textContent !== uhr) this.uhr.textContent = uhr;
    this.mitte.style.opacity = z.uhr ? "1" : "0";
    for (const [seite, k] of [["links", this.l], ["rechts", this.r]]) {
      const w = z[seite];
      if (k.zahl.innerHTML !== w.wert) k.zahl.innerHTML = w.wert;
      const zu = w.zusatz || "";
      if (k.zusatz.innerHTML !== zu) k.zusatz.innerHTML = zu;
      const mitBalken = w.anteil !== null && w.anteil !== undefined;
      k.balkenBox.style.opacity = mitBalken ? "1" : "0";
      if (mitBalken) k.balken.style.transform = `scaleX(${clamp(w.anteil)})`;
      k.k.classList.toggle("ziel", !!w.ziel);
      let s = 0;
      for (const st of this.stoesse) if (st.seite === seite || st.seite === "beide") s = Math.max(s, t >= st.t ? Math.sin(clamp((t - st.t) / 0.4) * Math.PI) : 0);
      k.wert.style.transform = `scale(${1 + 0.1 * s})`;
      k.k.style.transform = `translateY(${-6 * s}px)`;
    }
  }
}

/** Kleiner Block-Chip im Stil der Markenleiste (weiß bzw. farbig, harter Schatten) */
export function isoChip(hud, { html, x, y, farbe = "#FFFFFF", schrift = ISO.tinte, schatten = "#B9BEE6", klasse = "", ...opt }, Erscheinung) {
  const e = el("div", `iso-chip ${klasse}`, html, hud.wurzel);
  e.style.setProperty("--f", farbe);
  e.style.setProperty("--s", schrift);
  e.style.setProperty("--k", schatten);
  return hud.add(new Erscheinung(hud, e, { x, y, ...opt }));
}

export { lerp, ease, fortschritt, feder };
