// Baukasten „Atmosphäre“ für Simulierbar (@simulierbar, Account 1, Skill .claude/skills/simulierbar-video/).
// Nicht für Account 2 (@stelldirvor.pov). Ändert kern.js nicht: SimBuehne ist eine Unterklasse von Buehne.
//
//   SimBuehne                 Buehne + Lichtstrahlen (Bildraum, aus hellen Stellen) + Farbgrading (Lift/Gamma/Gain, Split-Toning)
//   GRADING                   Looks je Stil (Nachbearbeitung + Grading als post-Objekt der Welt)
//   umgebung / UMGEBUNG       Umgebungslicht für Spiegelungen (PMREM): studio, nacht, abend, labor
//   rigStudio / rigNacht / rigAbendsonne / rigLabor   Licht-Rigs (Führungslicht, Kanten, Schatten, Umgebung)
//   flaechenLicht             Softbox als RectAreaLight (Streiflicht auf Metall und Glas)
//   lichtKegel / lichtBahn    sichtbares Volumenlicht (Kegel unter Lampen, Lichtbahn durch Lücken)
//   lichtPfuetze              Lichtfleck auf dem Boden (statt teurer Punktlichter)
//   nebelSchicht / dunst      Bodennebel in Lagen, Luftperspektive (FogExp2)
//   staub                     Schwebeteilchen, hell im Lichtkegel
//   spiegelBoden              echte Spiegelung (Reflector, niedrige Auflösung) mit Streckung, Pfützen-Maske, Fresnel
//   leuchtMat / glimmLinie    HDR-Leuchtmaterial (für Bloom), leuchtende Linie (LED-Kante)
//   fokus                     Tiefenschärfe auf einen 3D-Punkt (für new SimBuehne(…, { tiefe: true }))
//   aktualisiere(t)           setzt die Zeit aller Atmosphäre-Objekte (deterministisch, nur aus t)
//   buendeln(szene)           fasst statische Meshes je Material zusammen (weniger Draw-Calls: Hauptbild, Schatten, Spiegelung)
//   rauschTextur()            kachelbare Rausch-Textur (billiger als Rauschen im Shader unter SwiftShader)
//
// Alles prozedural, keine fremden Assets. Jede Funktion ist eine reine Funktion von t (über setze(t)).
import * as THREE from "three";
import { Buehne } from "./kern.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** Kachelbare Rausch-Textur (Wertrauschen, 4 Oktaven, 256²; R/G/B/A = vier unabhängige Kanäle), einmal erzeugt */
let rauschTex = null;
export function rauschTextur() {
  if (rauschTex) return rauschTex;
  const N = 256, d = new Uint8Array(N * N * 4);
  for (let k = 0; k < 4; k++) {
    const gitter = (g, seed) => { const a = new Float32Array(g * g); let s = seed * 7919 + 13; for (let i = 0; i < g * g; i++) { s = (s * 16807) % 2147483647; a[i] = s / 2147483647; } return a; };
    const ok = [4, 8, 16, 32].map((g, i) => ({ g, w: 0.5 ** i, a: gitter(g, k * 10 + i + 1) }));
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v = 0, sum = 0;
      for (const o of ok) {
        const fx = (x / N) * o.g, fy = (y / N) * o.g;
        const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const A = (i, j) => o.a[((j % o.g) * o.g) + (i % o.g)];
        v += o.w * ((A(x0, y0) * (1 - sx) + A(x0 + 1, y0) * sx) * (1 - sy) + (A(x0, y0 + 1) * (1 - sx) + A(x0 + 1, y0 + 1) * sx) * sy);
        sum += o.w;
      }
      d[(y * N + x) * 4 + k] = Math.round((v / sum) * 255);
    }
  }
  rauschTex = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
  rauschTex.wrapS = rauschTex.wrapT = THREE.RepeatWrapping;
  rauschTex.minFilter = THREE.LinearMipmapLinearFilter; rauschTex.magFilter = THREE.LinearFilter;
  rauschTex.generateMipmaps = true;
  rauschTex.needsUpdate = true;
  return rauschTex;
}

const RAUSCH_GLSL = /* glsl */ `
float sa_h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sa_n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(sa_h2(i), sa_h2(i + vec2(1.0, 0.0)), f.x), mix(sa_h2(i + vec2(0.0, 1.0)), sa_h2(i + vec2(1.0, 1.0)), f.x), f.y); }
float sa_fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * sa_n2(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }`;

// ---------- Lichtstrahlen im Bildraum (God Rays) ----------
const STRAHL_VOR = /* glsl */ `
uniform sampler2D tQuelle; uniform vec2 texel; uniform float schwelle; uniform vec2 licht; uniform float aspekt; uniform float maske;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tQuelle, vUv + texel * vec2(-1.0, -1.0)).rgb + texture2D(tQuelle, vUv + texel * vec2(1.0, -1.0)).rgb
         + texture2D(tQuelle, vUv + texel * vec2(-1.0, 1.0)).rgb + texture2D(tQuelle, vUv + texel * vec2(1.0, 1.0)).rgb;
  c = min(c * 0.25, vec3(24.0));
  float h = max(c.r, max(c.g, c.b));
  c *= smoothstep(schwelle, schwelle * 1.5 + 0.05, h);
  if (maske > 0.0) { vec2 d = vUv - licht; d.x *= aspekt; c *= 1.0 - smoothstep(0.0, maske, length(d)); }
  gl_FragColor = vec4(c, 1.0);
}`;

const STRAHL_BLUR = /* glsl */ `
uniform sampler2D tQuelle; uniform vec2 licht; uniform float laenge; uniform float abfall;
varying vec2 vUv;
void main() {
  vec2 schritt = (vUv - licht) * laenge / 40.0;
  vec2 uv = vUv; vec3 c = vec3(0.0); float g = 1.0, s = 0.0;
  for (int i = 0; i < 40; i++) { c += texture2D(tQuelle, uv).rgb * g; s += g; g *= abfall; uv -= schritt; }
  gl_FragColor = vec4(c / s, 1.0);
}`;

// ---------- Farbgrading nach kern.js (Bild ist schon tonemapped, sRGB) ----------
const GRADE = /* glsl */ `
uniform sampler2D tBild, tStrahl; uniform float strahlen; uniform vec3 strahlFarbe;
uniform vec3 lift, gamma, gain, schattenTon, lichterTon; uniform float splitStaerke, splitBalance;
varying vec2 vUv;
vec3 softLight(vec3 a, vec3 b) { return mix(2.0 * a * b + a * a * (1.0 - 2.0 * b), sqrt(a) * (2.0 * b - 1.0) + 2.0 * a * (1.0 - b), step(0.5, b)); }
void main() {
  vec3 c = texture2D(tBild, vUv).rgb;
  if (strahlen > 0.0) { vec3 s = clamp(texture2D(tStrahl, vUv).rgb * strahlFarbe * strahlen, 0.0, 1.0); c = 1.0 - (1.0 - c) * (1.0 - s); }
  c = clamp(c * gain + lift * (1.0 - c), 0.0, 1.0);
  c = pow(c, 1.0 / gamma);
  if (splitStaerke > 0.0) {
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    vec3 ton = mix(schattenTon, lichterTon, smoothstep(0.12, 0.82, l + splitBalance));
    c = mix(c, softLight(c, ton), splitStaerke);
  }
  gl_FragColor = vec4(c, 1.0);
}`;

/** Zusätzliche Nachbearbeitung der SimBuehne (Standard: aus, d. h. Bild wie kern.js) */
export const SIM_POST = {
  strahlen: 0,                 // Stärke der Lichtstrahlen (0 = aus, typisch 0,4–1,2)
  strahlenPunkt: null,         // 3D-Punkt der Lichtquelle [x, y, z] (wird je Bild projiziert) …
  strahlenQuelle: [0.5, 0.85], // … oder Bildpunkt in UV (0 unten … 1 oben)
  strahlenSchwelle: 1.1,       // ab welcher HDR-Helligkeit etwas strahlt
  strahlenLaenge: 0.85,        // Länge der Strahlen (Anteil der Strecke zur Quelle)
  strahlenAbfall: 0.965,       // Abfall je Abgriff
  strahlenMaske: 0,            // > 0: nur helle Stellen in diesem Radius (UV) um die Quelle strahlen
  strahlenFarbe: [1, 0.93, 0.82],
  lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1],
  schattenTon: [0.5, 0.5, 0.5], lichterTon: [0.5, 0.5, 0.5], splitStaerke: 0, splitBalance: 0,
};

const farbe3 = (f) => { const c = new THREE.Color(f); return [c.r, c.g, c.b]; };
const srgb3 = (hex) => { const c = new THREE.Color(); c.setStyle(hex, THREE.SRGBColorSpace); c.convertLinearToSRGB(); return [c.r, c.g, c.b]; };

/**
 * Bühne für Simulierbar: alles aus kern.js (Bloom, Tilt-Shift, Tiefenunschärfe, ACES, Vignette, Körnung, FXAA,
 * Übergänge) plus Lichtstrahlen und Farbgrading. Aufruf wie Buehne: new SimBuehne(canvas, { msaa, schatten, tiefe }).
 */
export class SimBuehne extends Buehne {
  constructor(canvas, opt = {}) {
    super(canvas, opt);
    const rt = (b, h) => {
      const r = new THREE.WebGLRenderTarget(b, h, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
      r.texture.generateMipmaps = false;
      return r;
    };
    this.rtRoh = rt(this.breite, this.hoehe);
    this.rtS1 = rt(this.breite >> 2, this.hoehe >> 2);
    this.rtS2 = rt(this.breite >> 2, this.hoehe >> 2);
    const mat = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.sm = {
      vor: mat(STRAHL_VOR, { tQuelle: { value: null }, texel: { value: new THREE.Vector2(1 / this.breite, 1 / this.hoehe) }, schwelle: { value: 1 }, licht: { value: new THREE.Vector2() }, aspekt: { value: this.breite / this.hoehe }, maske: { value: 0 } }),
      blur: mat(STRAHL_BLUR, { tQuelle: { value: null }, licht: { value: new THREE.Vector2() }, laenge: { value: 0.8 }, abfall: { value: 0.96 } }),
      grade: mat(GRADE, {
        tBild: { value: null }, tStrahl: { value: null }, strahlen: { value: 0 }, strahlFarbe: { value: new THREE.Vector3(1, 1, 1) },
        lift: { value: new THREE.Vector3() }, gamma: { value: new THREE.Vector3(1, 1, 1) }, gain: { value: new THREE.Vector3(1, 1, 1) },
        schattenTon: { value: new THREE.Vector3(0.5, 0.5, 0.5) }, lichterTon: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
        splitStaerke: { value: 0 }, splitBalance: { value: 0 },
      }),
    };
    this._v = new THREE.Vector3();
  }

  _welt(welt, ausgabe, t) {
    const post = super._welt(welt, this.rtRoh, t);
    const p = { ...SIM_POST, ...post };
    const g = this.sm.grade.uniforms;
    let staerke = p.strahlen;
    if (staerke > 0) {
      let q = p.strahlenQuelle;
      if (p.strahlenPunkt) {
        welt.kamera.updateMatrixWorld();
        const v = this._v.set(...p.strahlenPunkt).project(welt.kamera);
        q = [v.x * 0.5 + 0.5, v.y * 0.5 + 0.5];
        if (v.z > 1) staerke = 0;
      }
      if (staerke > 0) {
        const vor = this.sm.vor.uniforms;
        vor.tQuelle.value = this.rtSzene.texture;
        vor.schwelle.value = p.strahlenSchwelle;
        vor.licht.value.set(q[0], q[1]);
        vor.maske.value = p.strahlenMaske;
        this._pass(this.sm.vor, this.rtS1);
        const b = this.sm.blur.uniforms;
        b.licht.value.set(q[0], q[1]);
        b.abfall.value = p.strahlenAbfall;
        b.tQuelle.value = this.rtS1.texture; b.laenge.value = p.strahlenLaenge; this._pass(this.sm.blur, this.rtS2);
        b.tQuelle.value = this.rtS2.texture; b.laenge.value = p.strahlenLaenge * 0.3; this._pass(this.sm.blur, this.rtS1);
        g.tStrahl.value = this.rtS1.texture;
        g.strahlFarbe.value.set(...p.strahlenFarbe);
      }
    }
    g.strahlen.value = staerke;
    g.tBild.value = this.rtRoh.texture;
    g.lift.value.set(...p.lift); g.gamma.value.set(...p.gamma); g.gain.value.set(...p.gain);
    g.schattenTon.value.set(...p.schattenTon); g.lichterTon.value.set(...p.lichterTon);
    g.splitStaerke.value = p.splitStaerke; g.splitBalance.value = p.splitBalance;
    this._pass(this.sm.grade, ausgabe);
    return post;
  }
}

/**
 * Looks je Stil (als welt.post; einzelne Werte dürfen je Szene überschrieben werden: { ...GRADING.nacht, strahlen: 0.8 }).
 * Töne: schattenTon/lichterTon sind sRGB-Farben, 0,5 = neutral (Soft-Light).
 */
export const GRADING = {
  // Stil 17 Nachtstadt: kühle Schatten (Petrol), warme Lichter (Natriumdampf), tiefe Schwärzen, kräftiger Bloom
  nacht: { belichtung: 1.0, bloomStaerke: 1.15, bloomSchwelle: 0.85, bloomKnie: 0.55, bloomRadius: 1.1, saettigung: 1.06, kontrast: 1.06, vignette: 0.34, koernung: 0.024,
    lift: [0.004, 0.012, 0.026], gain: [1.0, 0.99, 1.0], schattenTon: srgb3("#3E6E86"), lichterTon: srgb3("#E7A86E"), splitStaerke: 0.38, splitBalance: 0.02 },
  // Stil 18 Studio: neutrale, satte Schwärzen, Metallglanz, leicht warme Lichter
  studio: { belichtung: 1.0, bloomStaerke: 0.85, bloomSchwelle: 1.05, bloomKnie: 0.5, bloomRadius: 1.0, saettigung: 1.04, kontrast: 1.08, vignette: 0.38, koernung: 0.02,
    lift: [0.0, 0.0, 0.004], gain: [1.02, 1.0, 0.98], schattenTon: srgb3("#4F5A68"), lichterTon: srgb3("#D9B98A"), splitStaerke: 0.22, splitBalance: 0 },
  // Stil 19 Architekturmodell: goldene Stunde, weiche Lichter, Schatten leicht blau
  abend: { belichtung: 1.0, bloomStaerke: 0.7, bloomSchwelle: 1.1, bloomKnie: 0.6, bloomRadius: 1.0, saettigung: 1.04, kontrast: 1.04, vignette: 0.28, koernung: 0.018,
    lift: [0.012, 0.012, 0.022], gain: [1.03, 1.0, 0.95], schattenTon: srgb3("#5C78A0"), lichterTon: srgb3("#F2B27A"), splitStaerke: 0.3, splitBalance: 0 },
  // Stil 20 Glas & Licht: kühles Labor, Flüssigkeit trägt die Farbe, sehr dunkler Grund
  labor: { belichtung: 1.0, bloomStaerke: 1.0, bloomSchwelle: 0.95, bloomKnie: 0.5, bloomRadius: 1.15, saettigung: 1.08, kontrast: 1.07, vignette: 0.4, koernung: 0.022,
    lift: [0.0, 0.006, 0.014], gain: [0.99, 1.0, 1.02], schattenTon: srgb3("#3F5C77"), lichterTon: srgb3("#E9D2B0"), splitStaerke: 0.26, splitBalance: 0 },
  // Stil 21 Nachtkarte: Mondlicht auf Relief, Stadtlichter glühen
  karte: { belichtung: 1.0, bloomStaerke: 1.25, bloomSchwelle: 0.8, bloomKnie: 0.5, bloomRadius: 1.2, saettigung: 1.05, kontrast: 1.07, vignette: 0.36, koernung: 0.022,
    lift: [0.004, 0.01, 0.022], gain: [1.0, 1.0, 1.0], schattenTon: srgb3("#33607E"), lichterTon: srgb3("#EBAE70"), splitStaerke: 0.32, splitBalance: 0 },
};

// =====================================================================================
// Umgebungslicht (Spiegelungen): Kuppel mit Verlauf + leuchtende Felder → PMREM
// =====================================================================================
const umgebungsCache = new WeakMap();
/**
 * felder: [{pos:[x,y,z], groesse:[b,h], farbe, staerke}] (Softboxen, Fenster, Lichter; schauen zur Mitte)
 * oben/horizont/unten: Verlauf der Kuppel (Farbe, Stärke über staerke)
 */
export function umgebung(renderer, { oben = "#000000", horizont = "#000000", unten = "#000000", staerke = 1, felder = [], unschaerfe = 0.02, schluessel = null } = {}) {
  let cache = umgebungsCache.get(renderer);
  if (!cache) { cache = new Map(); umgebungsCache.set(renderer, cache); }
  if (schluessel && cache.has(schluessel)) return cache.get(schluessel);
  const s = new THREE.Scene();
  const kuppel = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { o: { value: new THREE.Color(oben).multiplyScalar(staerke) }, h: { value: new THREE.Color(horizont).multiplyScalar(staerke) }, u: { value: new THREE.Color(unten).multiplyScalar(staerke) } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 o, h, u; varying vec3 vP; void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(h, o, pow(y, 0.6)) : mix(h, u, pow(-y, 0.5)); gl_FragColor = vec4(c, 1.0); }`,
  }));
  s.add(kuppel);
  for (const f of felder) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(...f.groesse), new THREE.MeshBasicMaterial({ color: new THREE.Color(f.farbe || "#FFFFFF").multiplyScalar(f.staerke ?? 4), side: THREE.DoubleSide }));
    m.position.set(...f.pos);
    m.lookAt(0, f.pos[1] * 0.3, 0);
    s.add(m);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(s, unschaerfe).texture;
  pmrem.dispose();
  if (schluessel) cache.set(schluessel, tex);
  return tex;
}

/** Fertige Umgebungen (je Renderer einmal berechnet) */
export const UMGEBUNG = {
  // dunkles Studio: Streifen-Softboxen links/rechts, große Box oben, schwacher Boden → lange Streiflichter auf Metall
  studio: (r) => umgebung(r, { schluessel: "studio", oben: "#0B0C10", horizont: "#050608", unten: "#020203", felder: [
    { pos: [-9, 3, 2], groesse: [1.2, 12], staerke: 6 }, { pos: [9, 3, -1], groesse: [1.2, 12], staerke: 5 },
    { pos: [0, 12, 0], groesse: [8, 8], staerke: 2.5 }, { pos: [-3, 2, -10], groesse: [10, 2], staerke: 1.8, farbe: "#FFE6C8" },
    { pos: [4, 1, 10], groesse: [6, 1.5], staerke: 1.2, farbe: "#CFE0FF" },
  ] }),
  // Nacht: dunkler Himmel, warme und kühle Lichtpunkte am Horizont (Fenster, Laternen) → Spiegelung in nassem Asphalt
  nacht: (r) => umgebung(r, { schluessel: "nacht", oben: "#05080F", horizont: "#1B2638", unten: "#05060A", staerke: 1, felder: [
    ...Array.from({ length: 22 }, (_, i) => {
      const w = (i / 22) * Math.PI * 2;
      const warm = i % 3 !== 0;
      return { pos: [Math.cos(w) * 22, 1 + (i % 4) * 1.4, Math.sin(w) * 22], groesse: [0.8 + (i % 3) * 0.6, 0.5 + (i % 2) * 0.6], farbe: warm ? "#FFC27A" : "#A8CCFF", staerke: warm ? 3.2 : 2.2 };
    }),
    { pos: [0, 14, 0], groesse: [10, 10], farbe: "#2A3A5A", staerke: 0.8 },
  ] }),
  // Abend: blauer Himmel oben, warmer Horizont, Sonne als helles Feld
  abend: (r) => umgebung(r, { schluessel: "abend", oben: "#5E7FB5", horizont: "#F4B98A", unten: "#3C3028", staerke: 1, felder: [
    { pos: [-16, 4, -12], groesse: [3, 3], farbe: "#FFD6A0", staerke: 12 },
  ] }),
  // Labor: schwarz, Gegenlicht-Wand hinten, zwei schmale Kantenlichter
  labor: (r) => umgebung(r, { schluessel: "labor", oben: "#07090D", horizont: "#06070A", unten: "#020203", felder: [
    { pos: [0, 3, -12], groesse: [14, 6], staerke: 1.6, farbe: "#D8E6FF" }, { pos: [-8, 4, 4], groesse: [0.8, 10], staerke: 5 },
    { pos: [8, 4, 4], groesse: [0.8, 10], staerke: 5 }, { pos: [0, 12, 0], groesse: [5, 5], staerke: 2 },
  ] }),
};

// =====================================================================================
// Licht-Rigs
// =====================================================================================
let flaechenInit = false;
/** Softbox als RectAreaLight (wirkt auf MeshStandard-/MeshPhysicalMaterial, wirft keinen Schatten) */
export function flaechenLicht({ farbe = "#FFFFFF", staerke = 6, breite = 2, hoehe = 0.5, pos = [0, 4, 2], ziel = [0, 0, 0] } = {}) {
  if (!flaechenInit) { RectAreaLightUniformsLib.init(); flaechenInit = true; }
  const l = new THREE.RectAreaLight(farbe, staerke, breite, hoehe);
  l.position.set(...pos);
  l.lookAt(...ziel);
  return l;
}

function schattenLicht(l, { karte = 2048, bereich = 10, weich = 3, bias = -0.0004, normalBias = 0.02, nah = 0.5, fern = 120 } = {}) {
  l.castShadow = karte > 0;
  if (!l.castShadow) return l;
  l.shadow.mapSize.set(karte, karte);
  const c = l.shadow.camera;
  if (c.isOrthographicCamera) { c.left = -bereich; c.right = bereich; c.top = bereich; c.bottom = -bereich; }
  c.near = nah; c.far = fern;
  l.shadow.bias = bias;
  l.shadow.normalBias = normalBias;
  l.shadow.radius = weich;
  return l;
}

/**
 * Dunkles Studio: Softbox (RectArea) als Führungslicht, Spot von oben mit weichem Schatten, Kantenlichter von hinten
 * (je Team eine Farbe möglich), Umgebung „studio“ für Streiflichter.
 */
export function rigStudio(szene, renderer, {
  umgebungsStaerke = 0.9, ziel = [0, 0.8, 0],
  softbox = { farbe: "#FFF4E6", staerke: 7, breite: 3.2, hoehe: 1.1, pos: [-3.2, 4.2, 3.4] },
  oben = { farbe: "#FFFFFF", staerke: 60, pos: [0.4, 9, 1.2], winkel: 0.42, rand: 0.6, schatten: 2048 },
  kanten = [{ farbe: "#BFD4FF", staerke: 2.2, pos: [5, 3, -5] }, { farbe: "#FFD9B0", staerke: 1.8, pos: [-5, 2.5, -5] }],
  fuell = 0.06,
} = {}) {
  szene.environment = UMGEBUNG.studio(renderer);
  szene.environmentIntensity = umgebungsStaerke;
  const r = { kanten: [] };
  if (softbox) { r.softbox = flaechenLicht({ ...softbox, ziel }); szene.add(r.softbox); }
  if (oben) {
    const s = new THREE.SpotLight(oben.farbe, oben.staerke, 0, oben.winkel, oben.rand, 2);
    s.position.set(...oben.pos);
    s.target.position.set(...ziel);
    schattenLicht(s, { karte: oben.schatten, weich: 6, bias: -0.0002, nah: 2, fern: 30 });
    szene.add(s, s.target);
    r.oben = s;
  }
  for (const k of kanten) {
    const l = new THREE.DirectionalLight(k.farbe, k.staerke);
    l.position.set(...k.pos);
    l.target.position.set(...ziel);
    szene.add(l, l.target);
    r.kanten.push(l);
  }
  r.fuell = new THREE.HemisphereLight("#9AA8BF", "#050506", fuell);
  szene.add(r.fuell);
  return r;
}

/** Nacht: schwaches kühles Mondlicht mit Schatten, dunkles Himmelslicht, Umgebung „nacht“ (Spiegelungen) */
export function rigNacht(szene, renderer, {
  umgebungsStaerke = 0.45, ziel = [0, 0, 0], richtung = [-0.45, 1.0, -0.6], farbe = "#9FB8E8", staerke = 0.55,
  schatten = 2048, bereich = 18, himmel = "#24324D", boden = "#07080C", himmelStaerke = 0.35,
} = {}) {
  szene.environment = UMGEBUNG.nacht(renderer);
  szene.environmentIntensity = umgebungsStaerke;
  const mond = new THREE.DirectionalLight(farbe, staerke);
  const d = new THREE.Vector3(...richtung).normalize().multiplyScalar(40);
  mond.position.set(ziel[0] + d.x, ziel[1] + d.y, ziel[2] + d.z);
  mond.target.position.set(...ziel);
  schattenLicht(mond, { karte: schatten, bereich, weich: 4 });
  const hemi = new THREE.HemisphereLight(himmel, boden, himmelStaerke);
  szene.add(mond, mond.target, hemi);
  return { mond, hemi };
}

/** Goldene Stunde: tiefe warme Sonne mit langen weichen Schatten, kühles Himmelslicht, Umgebung „abend“ */
export function rigAbendsonne(szene, renderer, {
  umgebungsStaerke = 0.55, ziel = [0, 0, 0], richtung = [-0.75, 0.32, -0.55], farbe = "#FFB774", staerke = 5.2,
  schatten = 2048, bereich = 12, himmel = "#8FB0E6", boden = "#4A3426", himmelStaerke = 0.75,
} = {}) {
  szene.environment = UMGEBUNG.abend(renderer);
  szene.environmentIntensity = umgebungsStaerke;
  const sonne = new THREE.DirectionalLight(farbe, staerke);
  const d = new THREE.Vector3(...richtung).normalize().multiplyScalar(40);
  sonne.position.set(ziel[0] + d.x, ziel[1] + d.y, ziel[2] + d.z);
  sonne.target.position.set(...ziel);
  schattenLicht(sonne, { karte: schatten, bereich, weich: 3.5, bias: -0.0003, normalBias: 0.015 });
  const hemi = new THREE.HemisphereLight(himmel, boden, himmelStaerke);
  szene.add(sonne, sonne.target, hemi);
  return { sonne, hemi, richtung: d.clone().normalize() };
}

/** Labor: schwarz, Gegenlicht, zwei Spots von oben (je Gefäß) mit Schatten, Kantenlichter */
export function rigLabor(szene, renderer, { umgebungsStaerke = 1.0, spots = [], kanten = [{ farbe: "#DCE8FF", staerke: 1.6, pos: [-6, 4, -4] }, { farbe: "#DCE8FF", staerke: 1.6, pos: [6, 4, -4] }], fuell = 0.05, schatten = 1024 } = {}) {
  szene.environment = UMGEBUNG.labor(renderer);
  szene.environmentIntensity = umgebungsStaerke;
  const r = { spots: [], kanten: [] };
  spots.forEach((sp, i) => {
    const s = new THREE.SpotLight(sp.farbe || "#FFFFFF", sp.staerke ?? 40, 0, sp.winkel ?? 0.3, sp.rand ?? 0.7, 2);
    s.position.set(...sp.pos);
    s.target.position.set(...(sp.ziel || [sp.pos[0], 0, sp.pos[2]]));
    schattenLicht(s, { karte: i === 0 ? schatten : 0, weich: 5, bias: -0.0002, nah: 2, fern: 30 });
    szene.add(s, s.target);
    r.spots.push(s);
  });
  for (const k of kanten) {
    const l = new THREE.DirectionalLight(k.farbe, k.staerke);
    l.position.set(...k.pos);
    szene.add(l);
    r.kanten.push(l);
  }
  r.fuell = new THREE.HemisphereLight("#8FA0BA", "#040405", fuell);
  szene.add(r.fuell);
  return r;
}

/** Luftperspektive: exponentieller Nebel (wirkt auf alle Standard-Materialien) */
export function dunst(szene, farbe = "#1A2436", dichte = 0.03) {
  szene.fog = new THREE.FogExp2(farbe, dichte);
  return szene.fog;
}

// =====================================================================================
// Volumenlicht, Lichtflecken, Nebel, Staub
// =====================================================================================
const zeitObjekte = new Set();
/** Setzt die Zeit aller Atmosphäre-Objekte (Kegel, Nebel, Staub, …). In welt.update(t) aufrufen. */
export function aktualisiere(t) {
  for (const o of zeitObjekte) o.uniforms.zeit.value = t;
}

/**
 * Sichtbarer Lichtkegel (additiv, weiche Ränder, feine Staubstreifen). Spitze im Ursprung, zeigt nach −Y.
 * Platzieren: kegel.position.set(lampe), kegel.lookAt-ähnlich über rotation; Länge hoehe.
 */
const matCache = new Map();
const gemeinsam = (key, bau) => { if (!matCache.has(key)) matCache.set(key, bau()); return matCache.get(key); };

export function lichtKegel({ hoehe = 4, radiusOben = 0.12, radiusUnten = 1.5, farbe = "#FFD9A8", staerke = 0.32, weich = 1.6, streifen = 0.45, segmente = 32 } = {}) {
  const geo = new THREE.CylinderGeometry(radiusOben, radiusUnten, hoehe, segmente, 6, true);
  // Kegel-Koordinaten fest in die Geometrie (bleiben beim Zusammenfassen erhalten): x = Anteil der Länge, y = Winkel
  const pos = geo.attributes.position, k = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { k[i * 2] = 0.5 - pos.getY(i) / hoehe; k[i * 2 + 1] = Math.atan2(pos.getZ(i), pos.getX(i)); }
  geo.setAttribute("kegel", new THREE.BufferAttribute(k, 2));
  geo.translate(0, -hoehe / 2, 0);
  const mat = gemeinsam(`kegel|${farbe}|${staerke}|${weich}|${streifen}`, () => {
    const m = new THREE.ShaderMaterial({
      uniforms: { farbe: { value: new THREE.Color(farbe) }, staerke: { value: staerke }, zeit: { value: 0 }, weich: { value: weich }, streifen: { value: streifen } },
      vertexShader: /* glsl */ `
        attribute vec2 kegel; varying vec3 vN; varying vec3 vW; varying vec2 vK;
        void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vK = kegel; vN = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 farbe; uniform float staerke, zeit, weich, streifen; varying vec3 vN; varying vec3 vW; varying vec2 vK;
        void main() {
          float f = abs(dot(normalize(vN), normalize(cameraPosition - vW)));
          float kante = pow(f, weich);
          float laengs = smoothstep(0.0, 0.1, vK.x) * pow(1.0 - vK.x, 1.35);
          float s = 0.5 + 0.5 * sin(vK.y * 9.0 + zeit * 0.35 + vK.x * 2.0) * sin(vK.y * 17.0 - zeit * 0.22);
          gl_FragColor = vec4(farbe * staerke * kante * laengs * mix(1.0, 0.55 + 0.9 * s, streifen), 1.0);
        }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    zeitObjekte.add(m);
    return m;
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 5;
  m.frustumCulled = false;
  return m;
}

/** Ebene Lichtbahn (Sonnenstrahl durch eine Lücke): Rechteck von a nach b, weiche Seiten, Staubstreifen */
export function lichtBahn({ laenge = 8, breite = 1.2, farbe = "#FFD3A0", staerke = 0.22, streifen = 0.5 } = {}) {
  const geo = new THREE.PlaneGeometry(breite, laenge, 1, 8);
  geo.translate(0, -laenge / 2, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe) }, staerke: { value: staerke }, zeit: { value: 0 }, streifen: { value: streifen } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 farbe; uniform float staerke, zeit, streifen; varying vec2 vUv;
      void main() {
        float q = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x);
        float l = smoothstep(1.0, 0.9, vUv.y) * pow(vUv.y, 0.6);
        float s = 0.6 + 0.4 * sin(vUv.x * 23.0 + zeit * 0.4) * sin(vUv.x * 41.0 - zeit * 0.25 + vUv.y * 3.0);
        gl_FragColor = vec4(farbe * staerke * q * l * mix(1.0, s, streifen), 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  zeitObjekte.add(mat);
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 5;
  return m;
}

/** Lichtfleck auf dem Boden (additiv): ersetzt Punktlichter unter Laternen, Scheinwerfern, Fenstern */
export function lichtPfuetze({ radius = 1.4, farbe = "#FFC98A", staerke = 0.7, streckung = 1, exponent = 2.2 } = {}) {
  const mat = gemeinsam(`pfuetze|${farbe}|${staerke}|${exponent}`, () => new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe) }, staerke: { value: staerke }, exponent: { value: exponent } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 farbe; uniform float staerke, exponent; varying vec2 vUv;
      void main(){ float r = length(vUv - 0.5) * 2.0; float a = pow(clamp(1.0 - r, 0.0, 1.0), exponent); gl_FragColor = vec4(farbe * staerke * a, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2 * streckung), mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 3;
  return m;
}

/** Bodennebel in Lagen (Rauschen wandert langsam, deterministisch über t) */
export function nebelSchicht({ breite = 60, tiefe = 60, y = 0.25, lagen = 3, abstand = 0.3, farbe = "#8BA0C4", deckkraft = 0.16, massstab = 0.09, tempo = 0.04, seed = 1, rand = 0.25 } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < lagen; i++) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { farbe: { value: new THREE.Color(farbe) }, deckkraft: { value: deckkraft * (1 - i / (lagen + 1)) }, zeit: { value: 0 }, massstab: { value: massstab * (1 + i * 0.37) }, tempo: { value: tempo * (1 + i * 0.5) }, seed: { value: seed * 0.131 + i * 0.377 }, rand: { value: rand }, tRausch: { value: rauschTextur() } },
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 farbe; uniform float deckkraft, zeit, massstab, tempo, seed, rand; uniform sampler2D tRausch; varying vec2 vUv; varying vec3 vW;
        void main() {
          vec2 p = vW.xz * massstab * 0.25 + seed;
          float w = texture2D(tRausch, p * 0.5 + vec2(zeit * tempo * 0.05, 0.0)).g;
          float n = texture2D(tRausch, p + vec2(zeit * tempo * 0.12, zeit * tempo * 0.04) + w * 0.35).r;
          float k = smoothstep(0.0, rand, vUv.x) * smoothstep(1.0, 1.0 - rand, vUv.x) * smoothstep(0.0, rand, vUv.y) * smoothstep(1.0, 1.0 - rand, vUv.y);
          float a = deckkraft * smoothstep(0.38, 0.72, n) * k;
          float nahe = smoothstep(0.5, 4.0, length(cameraPosition - vW));
          gl_FragColor = vec4(farbe, a * nahe);
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    zeitObjekte.add(mat);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(breite, tiefe), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = y + i * abstand;
    m.renderOrder = 6;
    m.userData.dynamisch = true;
    g.add(m);
  }
  return g;
}

/**
 * Schwebeteilchen. kegel (optional): {spitze:[x,y,z], richtung:[x,y,z], winkel} → Teilchen im Kegel leuchten hell,
 * außerhalb nur schwach (wirkt wie Staub im Scheinwerfer).
 */
export function staub({ anzahl = 500, bereich = [6, 4, 6], mitte = [0, 2, 0], farbe = "#FFE6C4", groesse = 0.035, staerke = 1.6, aussen = 0.12, seed = 7, kegel = null, tempo = 0.02 } = {}) {
  const pos = new Float32Array(anzahl * 3);
  const rnd = new Float32Array(anzahl * 3);
  let s = seed * 9301 + 49297;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < anzahl; i++) {
    for (let k = 0; k < 3; k++) { pos[i * 3 + k] = r(); rnd[i * 3 + k] = r(); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("zufall", new THREE.BufferAttribute(rnd, 3));
  const k = kegel || { spitze: [0, 100, 0], richtung: [0, -1, 0], winkel: Math.PI };
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      farbe: { value: new THREE.Color(farbe) }, staerke: { value: staerke }, aussen: { value: kegel ? aussen : 1 }, zeit: { value: 0 }, groesse: { value: groesse }, tempo: { value: tempo },
      bereich: { value: new THREE.Vector3(...bereich) }, mitte: { value: new THREE.Vector3(...mitte) },
      kSpitze: { value: new THREE.Vector3(...k.spitze) }, kRichtung: { value: new THREE.Vector3(...k.richtung).normalize() }, kCos: { value: Math.cos(k.winkel) },
    },
    vertexShader: /* glsl */ `
      attribute vec3 zufall; uniform float zeit, groesse, tempo; uniform vec3 bereich, mitte, kSpitze, kRichtung; uniform float kCos; varying float vH; varying float vL;
      void main() {
        vec3 p = position + vec3(sin(zeit * 0.21 + zufall.x * 6.28), zeit * tempo * (0.4 + zufall.y), cos(zeit * 0.17 + zufall.z * 6.28)) * vec3(0.03, 1.0, 0.03);
        p = fract(p) - 0.5;
        vec3 w = mitte + p * bereich;
        vec3 d = normalize(w - kSpitze);
        vL = smoothstep(kCos - 0.02, kCos + 0.06, dot(d, kRichtung));
        vH = 0.55 + 0.45 * sin(zeit * (1.0 + zufall.x * 2.0) + zufall.z * 30.0);
        vec4 mv = viewMatrix * vec4(w, 1.0);
        gl_PointSize = groesse * (0.6 + zufall.y) * projectionMatrix[1][1] * 960.0 / max(-mv.z, 0.1);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 farbe; uniform float staerke, aussen; varying float vH; varying float vL;
      void main() { float r = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, r); a *= a;
        gl_FragColor = vec4(farbe * staerke * a * vH * mix(aussen, 1.0, vL), 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  zeitObjekte.add(mat);
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  p.renderOrder = 7;
  return p;
}

// =====================================================================================
// Spiegelung (nasser Asphalt, Studioboden, Laborbank)
// =====================================================================================
const SPIEGEL = {
  name: "SimSpiegel",
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    staerke: { value: 0.6 }, unschaerfe: { value: 1 }, streckung: { value: 2.5 }, pfuetzen: { value: 0 }, massstab: { value: 0.25 },
    fresnel: { value: 0.6 }, texel: { value: new THREE.Vector2(1 / 360, 1 / 640) }, seed: { value: 0 }, rand: { value: 0.06 }, verzerrung: { value: 1 }, tRausch: { value: null },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix; varying vec4 vUv4; varying vec3 vW; varying vec2 vUv;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() { vUv4 = textureMatrix * vec4(position, 1.0); vUv = uv; vW = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color; uniform sampler2D tDiffuse, tRausch; uniform float staerke, unschaerfe, streckung, pfuetzen, massstab, fresnel, seed, rand, verzerrung; uniform vec2 texel;
    varying vec4 vUv4; varying vec3 vW; varying vec2 vUv;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      vec2 uv = vUv4.xy / vUv4.w;
      vec4 r = texture2D(tRausch, vW.xz * massstab * 0.25 + seed);
      float maske = pfuetzen <= 0.0 ? 1.0 : mix(0.22, 1.0, smoothstep(0.6 - 0.25 * pfuetzen, 0.64 - 0.25 * pfuetzen, r.r));
      uv.x += (texture2D(tRausch, vW.xz * 1.5 + seed).g - 0.5) * 0.006 * verzerrung;
      vec3 c = vec3(0.0); float s = 0.0;
      for (int i = -3; i <= 3; i++) {
        float w = exp(-float(i * i) / 6.0);
        float o = float(i) * texel.y * streckung * unschaerfe * 1.3;
        c += texture2D(tDiffuse, uv + vec2(0.0, o)).rgb * w;
        c += texture2D(tDiffuse, uv + vec2(texel.x * unschaerfe * (mod(float(i + 4), 2.0) * 2.0 - 1.0), o * 0.7)).rgb * w * 0.6;
        s += w * 1.6;
      }
      c /= s;
      float fr = mix(1.0 - fresnel, 1.0, pow(1.0 - clamp(normalize(cameraPosition - vW).y, 0.0, 1.0), 3.0));
      float k = smoothstep(0.0, rand, vUv.x) * smoothstep(1.0, 1.0 - rand, vUv.x) * smoothstep(0.0, rand, vUv.y) * smoothstep(1.0, 1.0 - rand, vUv.y);
      gl_FragColor = vec4(c * color * staerke * fr * maske * k, 1.0);
    }`,
};

/**
 * Spiegelnder Boden (Overlay, additiv über einem beleuchteten Boden): echte Spiegelung der Szene in niedriger
 * Auflösung, senkrecht gestreckt (nasser Asphalt), Pfützen-Maske, Fresnel. aufloesung = Anteil von 1080×1920.
 * Kosten: ein zweiter Szenen-Durchgang in kleiner Auflösung (ohne Schattenkarte).
 */
export function spiegelBoden({ breite = 40, tiefe = 40, aufloesung = 0.3, staerke = 0.55, farbe = "#FFFFFF", unschaerfe = 1, streckung = 2.5, pfuetzen = 0, massstab = 0.25, fresnel = 0.6, y = 0.002, seed = 0, rand = 0.06, verzerrung = 1 } = {}) {
  const w = Math.round(1080 * aufloesung), h = Math.round(1920 * aufloesung);
  const r = new Reflector(new THREE.PlaneGeometry(breite, tiefe), { textureWidth: w, textureHeight: h, clipBias: 0.003, multisample: 0, shader: SPIEGEL, color: farbe });
  const u = r.material.uniforms;
  Object.assign(r.material, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  u.staerke.value = staerke; u.unschaerfe.value = unschaerfe; u.streckung.value = streckung; u.pfuetzen.value = pfuetzen;
  u.massstab.value = massstab; u.fresnel.value = fresnel; u.texel.value.set(1 / w, 1 / h); u.seed.value = seed; u.rand.value = rand; u.verzerrung.value = verzerrung; u.tRausch.value = rauschTextur();
  r.rotation.x = -Math.PI / 2;
  r.position.y = y;
  r.renderOrder = 2;
  return r;
}

// =====================================================================================
// Leuchten, Tiefenschärfe, Farben
// =====================================================================================
/** HDR-Leuchtmaterial (Werte > 1 lösen Bloom aus) */
export function leuchtMat(farbe, staerke = 3, { transparent = false, deckkraft = 1, neu = false } = {}) {
  const bau = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(staerke), transparent, opacity: deckkraft, depthWrite: !transparent, fog: false });
  return neu ? bau() : gemeinsam(`leucht|${farbe}|${staerke}|${transparent}|${deckkraft}`, bau); // geteilt; neu: true, wenn die Farbe später animiert wird
}

/**
 * Statische Meshes je Material zu einem Mesh zusammenfassen (in Weltkoordinaten). Spart Draw-Calls im Hauptbild,
 * in der Schattenkarte und in der Spiegelung (unter SwiftShader der größte Hebel). Bewegte Objekte vorher mit
 * obj.userData.dynamisch = true markieren (gilt für alle Kinder). Aufruf einmal nach dem Aufbau: buendeln(szene).
 */
export function buendeln(szene) {
  szene.updateMatrixWorld(true);
  const gruppen = new Map();
  const dynamisch = (o) => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.dynamisch) return true; return false; };
  szene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isReflector || Array.isArray(o.material) || o.morphTargetInfluences || dynamisch(o)) return;
    const geo = o.geometry;
    const key = [o.material.uuid, o.castShadow, o.receiveShadow, o.renderOrder, Object.keys(geo.attributes).sort().join(",")].join("|");
    if (!gruppen.has(key)) gruppen.set(key, []);
    gruppen.get(key).push(o);
  });
  let vorher = 0, nachher = 0;
  for (const liste of gruppen.values()) {
    vorher += liste.length;
    if (liste.length < 2) { nachher += liste.length; continue; }
    const geos = liste.map((m) => { const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()); for (const n of Object.keys(g.morphAttributes)) delete g.morphAttributes[n]; g.applyMatrix4(m.matrixWorld); return g; });
    const geo = mergeGeometries(geos, false);
    if (!geo) { nachher += liste.length; continue; }
    const m0 = liste[0];
    const neu = new THREE.Mesh(geo, m0.material);
    neu.castShadow = m0.castShadow; neu.receiveShadow = m0.receiveShadow; neu.renderOrder = m0.renderOrder; neu.frustumCulled = false;
    for (const m of liste) m.parent.remove(m);
    szene.add(neu);
    nachher++;
  }
  return { vorher, nachher };
}

/** Leuchtende Linie (LED-Kante, Teamfarbe) als dünner Quader von a nach b */
export function glimmLinie(a, b, { farbe = "#FFFFFF", staerke = 4, dicke = 0.025 } = {}) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const l = va.distanceTo(vb);
  const m = new THREE.Mesh(new THREE.BoxGeometry(dicke, dicke, l), leuchtMat(farbe, staerke));
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.lookAt(vb);
  return m;
}

/**
 * Tiefenschärfe auf einen 3D-Punkt (für SimBuehne mit { tiefe: true }): liefert post-Werte.
 * tiefe = Schärfebereich als Anteil der Entfernung; nah/fern = Stärke der Unschärfe davor/dahinter (0–1).
 */
export function fokus(kamera, punkt, { tiefe = 0.18, nah = 0.55, fern = 0.85 } = {}) {
  kamera.updateMatrixWorld();
  const p = new THREE.Vector3(...punkt).applyMatrix4(kamera.matrixWorldInverse);
  const d = Math.max(0.1, -p.z);
  return { fokusNah: d * (1 - tiefe), fokusFern: d * (1 + tiefe), tiefeNah: nah, tiefeFern: fern };
}

/** Teamfarbe für Licht: etwas entsättigt und aufgehellt (wirkt edler als reine UI-Farbe) */
export function lichtFarbe(farbe, { weiss = 0.18 } = {}) {
  return new THREE.Color(farbe).lerp(new THREE.Color("#FFFFFF"), weiss);
}

export { farbe3, srgb3 };
