// Kern: WebGL-Renderer und Nachbearbeitung (Bloom, Tilt-Shift/Unschärfe, ACES-Filmic,
// Farbkorrektur, Vignette, Körnung, FXAA) sowie Szenenübergänge (blende, iris, wisch, zoom, wolken, blasen, zoomwisch).
// Ablauf je Bild:  Welt → HDR-Ziel → [Bloom-Kette, Unschärfe-Kette] → Komposit (ACES) → LDR-Ziel
//                  (→ Übergang mischt zwei LDR-Ziele) → FXAA → Körnung → Bildschirm
import * as THREE from "three";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { UEBERGANG_GLSL, UEBERGANG_NR } from "./uebergaenge.js";

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BLOOM_VOR = /* glsl */ `
uniform sampler2D tQuelle; uniform vec2 texel; uniform float schwelle; uniform float knie;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tQuelle, vUv + texel * vec2(-0.5, -0.5)).rgb + texture2D(tQuelle, vUv + texel * vec2(0.5, -0.5)).rgb
         + texture2D(tQuelle, vUv + texel * vec2(-0.5, 0.5)).rgb + texture2D(tQuelle, vUv + texel * vec2(0.5, 0.5)).rgb;
  c *= 0.25;
  if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
  c = min(c, vec3(40.0));
  float hell = max(c.r, max(c.g, c.b));
  float weich = clamp(hell - schwelle + knie, 0.0, 2.0 * knie);
  weich = weich * weich / (4.0 * knie + 1e-4);
  float anteil = max(weich, hell - schwelle) / max(hell, 1e-4);
  gl_FragColor = vec4(c * anteil, 1.0);
}`;

const RUNTER = /* glsl */ `
uniform sampler2D tQuelle; uniform vec2 texel; varying vec2 vUv;
vec3 s(vec2 o) { return texture2D(tQuelle, vUv + texel * o).rgb; }
void main() {
  vec3 a = s(vec2(-2., 2.)), b = s(vec2(0., 2.)), c = s(vec2(2., 2.));
  vec3 d = s(vec2(-2., 0.)), e = s(vec2(0., 0.)), f = s(vec2(2., 0.));
  vec3 g = s(vec2(-2., -2.)), h = s(vec2(0., -2.)), i = s(vec2(2., -2.));
  vec3 j = s(vec2(-1., 1.)), k = s(vec2(1., 1.)), l = s(vec2(-1., -1.)), m = s(vec2(1., -1.));
  vec3 o = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  gl_FragColor = vec4(o, 1.0);
}`;

const HOCH = /* glsl */ `
uniform sampler2D tQuelle; uniform vec2 texel; uniform float radius; uniform float gewicht; varying vec2 vUv;
vec3 s(vec2 o) { return texture2D(tQuelle, vUv + texel * o * radius).rgb; }
void main() {
  vec3 o = s(vec2(0.)) * 4.0 + (s(vec2(-1., 0.)) + s(vec2(1., 0.)) + s(vec2(0., 1.)) + s(vec2(0., -1.))) * 2.0
         + s(vec2(-1., -1.)) + s(vec2(1., -1.)) + s(vec2(-1., 1.)) + s(vec2(1., 1.));
  gl_FragColor = vec4(o / 16.0 * gewicht, 1.0);
}`;

const GAUSS = /* glsl */ `
uniform sampler2D tQuelle; uniform vec2 schritt; varying vec2 vUv;
void main() {
  vec3 c = texture2D(tQuelle, vUv).rgb * 0.2270270270;
  c += texture2D(tQuelle, vUv + schritt * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(tQuelle, vUv - schritt * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(tQuelle, vUv + schritt * 3.2307692308).rgb * 0.0702702703;
  c += texture2D(tQuelle, vUv - schritt * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}`;

const KOMPOSIT = /* glsl */ `
uniform sampler2D tScharf, tU1, tU2, tU3, tBloom;
uniform float bloomStaerke, belichtung, tiltMitte, tiltBreite, tiltStaerke, unschaerfe;
uniform float vignette, saettigung, kontrast, aspekt;
uniform vec3 tonung; uniform float tonungStaerke;
uniform sampler2D tTiefe; uniform float tiefeAn, tiefeNah, tiefeFern, fokusNah, fokusFern, kNah, kFern;
uniform float flimmern, flimmerZeit; uniform vec2 flimmerY;
uniform vec3 schleier; uniform float schleierStaerke;
varying vec2 vUv;
vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 acesFilmic(vec3 c) {
  const mat3 einM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 ausM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  c = einM * (c / 0.6); c = RRTAndODTFit(c); c = ausM * c; return clamp(c, 0.0, 1.0);
}
vec3 zuSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() {
  vec2 uv = vUv;
  if (flimmern > 0.0) { // Hitzeflimmern: weiche, wandernde UV-Verzerrung in einem Höhenband
    float fm = smoothstep(flimmerY.x, flimmerY.x + 0.06, vUv.y) * (1.0 - smoothstep(flimmerY.y - 0.06, flimmerY.y, vUv.y));
    vec2 fo = vec2(sin(vUv.y * 230.0 + flimmerZeit * 13.0 + 2.0 * sin(vUv.x * 29.0 + flimmerZeit * 2.1)), sin(vUv.y * 151.0 - flimmerZeit * 9.0 + vUv.x * 47.0));
    uv += fo * flimmern * 0.0016 * fm;
  }
  vec3 scharf = texture2D(tScharf, uv).rgb;
  float d = abs(uv.y - tiltMitte);
  float coc = smoothstep(tiltBreite * 0.5, tiltBreite * 0.5 + 0.32, d) * tiltStaerke;
  if (tiefeAn > 0.5) { // Tiefenunschärfe aus dem Tiefenpuffer (nah vor fokusNah, fern hinter fokusFern)
    float zb = texture2D(tTiefe, uv).x;
    float z = kNah * kFern / (kFern - zb * (kFern - kNah));
    float cn = z < fokusNah ? (fokusNah - z) / fokusNah * tiefeNah : 0.0;
    float cf = z > fokusFern ? (1.0 - fokusFern / z) * tiefeFern : 0.0;
    coc = max(coc, max(cn, cf));
  }
  coc = clamp(max(coc, unschaerfe), 0.0, 1.0);
  vec3 col = scharf;
  if (coc > 0.001) {
    vec3 b1 = texture2D(tU1, uv).rgb;
    vec3 b2 = texture2D(tU2, uv).rgb;
    vec3 b3 = texture2D(tU3, uv).rgb;
    float k = coc * 3.0;
    col = k < 1.0 ? mix(scharf, b1, k) : (k < 2.0 ? mix(b1, b2, k - 1.0) : mix(b2, b3, k - 2.0));
  }
  col += texture2D(tBloom, vUv).rgb * bloomStaerke;
  col *= belichtung;
  col = acesFilmic(col);
  col = zuSRGB(col);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, saettigung);
  col = (col - 0.5) * kontrast + 0.5;
  col = mix(col, col * tonung, tonungStaerke);
  col = mix(col, schleier, schleierStaerke); // Schleier (Staub, Weißblende, Wasser) nach der Tonwertkurve
  vec2 p = vUv - 0.5; p.x *= aspekt;
  float v = smoothstep(0.95, 0.35, length(p) * 1.15);
  col *= mix(1.0 - vignette, 1.0, v);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;

const UEBERGANG = /* glsl */ `
uniform sampler2D tA, tB; uniform float p; uniform int typ; uniform vec2 mitte; uniform float aspekt;
uniform vec2 richtung; uniform vec3 farbe1, farbe2;
varying vec2 vUv;
vec3 ue_srgb(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
#define UE_LIES(t, uv) texture2D(t, clamp(uv, 0.0, 1.0)).rgb
#define UE_FARBE(c) ue_srgb(c)
${UEBERGANG_GLSL}
vec3 zoomBlur(sampler2D t, vec2 uv, vec2 m, float staerke) {
  vec3 c = vec3(0.0);
  for (int i = 0; i < 12; i++) { float f = 1.0 - staerke * float(i) / 11.0; c += texture2D(t, m + (uv - m) * f).rgb; }
  return c / 12.0;
}
void main() {
  vec3 col;
  if (typ == 0) { // Blende
    col = mix(texture2D(tA, vUv).rgb, texture2D(tB, vUv).rgb, smoothstep(0.0, 1.0, p));
  } else if (typ == 1) { // Iris mit Zoom-Unschärfe und Lichtkante
    vec2 d = vUv - mitte; d.x *= aspekt;
    float r = p * p * 1.55;
    float kante = 0.035;
    float m = smoothstep(r, r - kante, length(d));
    float zA = p * 0.32;
    vec2 uvA = mitte + (vUv - mitte) * (1.0 - p * 0.35);
    vec3 a = zoomBlur(tA, uvA, mitte, zA);
    vec2 uvB = mitte + (vUv - mitte) * (1.0 - (1.0 - p) * 0.25);
    vec3 b = zoomBlur(tB, uvB, mitte, (1.0 - p) * 0.12);
    col = mix(a, b, m);
    float ring = smoothstep(kante * 1.6, 0.0, abs(length(d) - r + kante * 0.5)) * (1.0 - smoothstep(0.75, 1.0, p));
    col = mix(col, farbe1, ring * 0.9);
  } else if (typ == 2) { // Wisch mit zwei Farbbändern
    vec2 dir = normalize(richtung);
    vec2 q = vUv - 0.5; q.x *= aspekt;
    float s = dot(q, dir) + 0.18 * dot(q, vec2(-dir.y, dir.x));
    float breite = 0.14;
    float front = mix(-0.9, 0.9 + 3.0 * breite, p);
    vec3 a = texture2D(tA, vUv + dir * vec2(1.0 / aspekt, 1.0) * p * 0.06).rgb;
    vec3 b = texture2D(tB, vUv - dir * vec2(1.0 / aspekt, 1.0) * (1.0 - p) * 0.06).rgb;
    float x = front - s;
    col = x < 0.0 ? a : (x < breite ? farbe1 : (x < 2.0 * breite ? farbe2 : b));
  } else if (typ == 10) {
    col = ue_wolken(tA, tB, vUv, p, aspekt, mitte, farbe1, farbe2);
  } else if (typ == 11) {
    col = ue_blasen(tA, tB, vUv, p, aspekt, farbe1);
  } else if (typ == 12) {
    col = ue_zoomwisch(tA, tB, vUv, p, aspekt, mitte, richtung, farbe1);
  } else { // Zoom: A fliegt auf den Betrachter zu, B kommt aus der Tiefe
    float e = smoothstep(0.0, 1.0, p);
    vec2 uvA = mitte + (vUv - mitte) / (1.0 + e * 1.6);
    vec2 uvB = mitte + (vUv - mitte) * (1.0 + (1.0 - e) * 0.6);
    vec3 a = zoomBlur(tA, uvA, mitte, e * 0.35);
    vec3 b = zoomBlur(tB, uvB, mitte, (1.0 - e) * 0.25);
    col = mix(a, b, smoothstep(0.35, 0.75, p));
    col += vec3(1.0) * 0.35 * (1.0 - abs(p - 0.55) / 0.45) * step(abs(p - 0.55), 0.45);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const FINAL = /* glsl */ `
uniform sampler2D tBild; uniform float koernung; uniform float bildNr; uniform vec2 aufloesung;
varying vec2 vUv;
float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec3 c = texture2D(tBild, vUv).rgb;
  vec2 px = floor(vUv * aufloesung);
  float o = mod(bildNr, 64.0) * 17.31;
  // weiche Körnung: Mittel aus Pixel- und Halbpixel-Rauschen
  float n = (h12(px + o) + h12(floor(px * 0.5) + o * 1.7)) * 0.5 - 0.5;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c += n * koernung * (1.0 - 0.6 * l);
  c += (h12(px * 1.37 + o + 11.0) - 0.5) / 255.0; // Dithering gegen Banding
  gl_FragColor = vec4(c, 1.0);
}`;

/** Standardwerte der Nachbearbeitung je Welt */
export const POST_STANDARD = {
  bloomStaerke: 0.9,
  bloomSchwelle: 1.0,
  bloomKnie: 0.6,
  bloomRadius: 1.0,
  belichtung: 1.0,
  tiltMitte: 0.5,
  tiltBreite: 0.35,
  tiltStaerke: 0.0,
  unschaerfe: 0.0,
  vignette: 0.22,
  saettigung: 1.05,
  kontrast: 1.02,
  tonung: [1, 1, 1],
  tonungStaerke: 0,
  koernung: 0.035,
  // Tiefenunschärfe (nur mit new Buehne(…, { tiefe: true })): Meter vor fokusNah bzw. hinter fokusFern werden unscharf
  tiefeNah: 0, tiefeFern: 0, fokusNah: 0.5, fokusFern: 1e9,
  flimmern: 0, flimmerY: [0, 1],          // Hitzeflimmern (Stärke ≈ 0–3, Höhenband in UV 0 unten … 1 oben)
  schleier: [1, 1, 1], schleierStaerke: 0, // Farbschleier nach der Tonwertkurve (sRGB 0–1)
};

function ziel(w, h, opt = {}) {
  const rt = new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    ...opt,
  });
  rt.texture.generateMipmaps = false;
  return rt;
}

export class Buehne {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{breite?:number, hoehe?:number, msaa?:number, schatten?:boolean}} opt
   */
  constructor(canvas, { breite = 1080, hoehe = 1920, msaa = 4, schatten = true, tiefe = false } = {}) {
    this.breite = breite;
    this.hoehe = hoehe;
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: false, powerPreference: "high-performance" });
    r.setPixelRatio(1);
    r.setSize(breite, hoehe, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = schatten;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.shadowMap.autoUpdate = true;
    this.renderer = r;

    this.rtSzene = ziel(breite, hoehe, { depthBuffer: true, samples: msaa });
    if (tiefe) { // Tiefenpuffer als Textur für die Tiefenunschärfe
      this.rtSzene.depthTexture = new THREE.DepthTexture(breite, hoehe);
      this.rtSzene.depthTexture.type = THREE.UnsignedIntType;
    }
    this.rtLdrA = ziel(breite, hoehe);
    this.rtLdrB = ziel(breite, hoehe);
    this.rtMix = ziel(breite, hoehe);
    this.rtFxaa = ziel(breite, hoehe);
    // Bloom-Kette (1/2 … 1/32)
    this.bloom = [];
    let w = breite >> 1, h = hoehe >> 1;
    for (let i = 0; i < 5; i++) {
      this.bloom.push(ziel(w, h));
      w = Math.max(1, w >> 1);
      h = Math.max(1, h >> 1);
    }
    // Unschärfe-Kette für Tilt-Shift (1/2, 1/4, 1/8) mit Hilfszielen für getrennte Gauß-Durchgänge
    this.u1 = ziel(breite >> 1, hoehe >> 1);
    this.u1h = ziel(breite >> 1, hoehe >> 1);
    this.u2 = ziel(breite >> 2, hoehe >> 2);
    this.u2h = ziel(breite >> 2, hoehe >> 2);
    this.u3 = ziel(breite >> 3, hoehe >> 3);
    this.u3h = ziel(breite >> 3, hoehe >> 3);

    this.kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.quad = new THREE.Mesh(geo);
    this.quad.frustumCulled = false;
    this.quadSzene = new THREE.Scene();
    this.quadSzene.add(this.quad);

    const mat = (frag, uniforms, extra = {}) =>
      new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, ...extra });
    this.m = {
      vor: mat(BLOOM_VOR, { tQuelle: { value: null }, texel: { value: new THREE.Vector2() }, schwelle: { value: 1 }, knie: { value: 0.5 } }),
      runter: mat(RUNTER, { tQuelle: { value: null }, texel: { value: new THREE.Vector2() } }),
      hoch: mat(HOCH, { tQuelle: { value: null }, texel: { value: new THREE.Vector2() }, radius: { value: 1 }, gewicht: { value: 1 } }, { blending: THREE.AdditiveBlending, transparent: true }),
      gauss: mat(GAUSS, { tQuelle: { value: null }, schritt: { value: new THREE.Vector2() } }),
      komposit: mat(KOMPOSIT, {
        tScharf: { value: null }, tU1: { value: null }, tU2: { value: null }, tU3: { value: null }, tBloom: { value: null },
        bloomStaerke: { value: 1 }, belichtung: { value: 1 }, tiltMitte: { value: 0.5 }, tiltBreite: { value: 0.3 }, tiltStaerke: { value: 0 },
        unschaerfe: { value: 0 }, vignette: { value: 0.2 }, saettigung: { value: 1 }, kontrast: { value: 1 }, aspekt: { value: breite / hoehe },
        tonung: { value: new THREE.Vector3(1, 1, 1) }, tonungStaerke: { value: 0 },
        tTiefe: { value: null }, tiefeAn: { value: 0 }, tiefeNah: { value: 0 }, tiefeFern: { value: 0 }, fokusNah: { value: 0.5 }, fokusFern: { value: 1e9 },
        kNah: { value: 0.1 }, kFern: { value: 1000 }, flimmern: { value: 0 }, flimmerZeit: { value: 0 }, flimmerY: { value: new THREE.Vector2(0, 1) },
        schleier: { value: new THREE.Vector3(1, 1, 1) }, schleierStaerke: { value: 0 },
      }),
      uebergang: mat(UEBERGANG, {
        tA: { value: null }, tB: { value: null }, p: { value: 0 }, typ: { value: 0 }, mitte: { value: new THREE.Vector2(0.5, 0.5) },
        aspekt: { value: breite / hoehe }, richtung: { value: new THREE.Vector2(1, 0) },
        farbe1: { value: new THREE.Color("#FFD23F") }, farbe2: { value: new THREE.Color("#2F6FED") },
      }),
      fxaa: new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FXAAShader.fragmentShader,
        uniforms: { tDiffuse: { value: null }, resolution: { value: new THREE.Vector2(1 / breite, 1 / hoehe) } },
        depthTest: false, depthWrite: false,
      }),
      final: mat(FINAL, { tBild: { value: null }, koernung: { value: 0.03 }, bildNr: { value: 0 }, aufloesung: { value: new THREE.Vector2(breite, hoehe) } }),
    };
    this.statistik = {};
  }

  _pass(material, ziel, { leeren = true } = {}) {
    this.quad.material = material;
    this.renderer.setRenderTarget(ziel);
    if (leeren) this.renderer.clear();
    this.renderer.render(this.quadSzene, this.kamera);
  }

  _texel(rt) {
    return new THREE.Vector2(1 / rt.width, 1 / rt.height);
  }

  /** Eine Welt ({szene, kamera, post}) in ein LDR-Ziel rendern */
  _welt(welt, ausgabe, t) {
    const r = this.renderer;
    // Zustand der Welt für diese Zeit setzen (Welten dürfen sich eine Szene teilen)
    if (welt.update) welt.update(t);
    const post = { ...POST_STANDARD, ...(welt.post || {}) };
    r.setRenderTarget(this.rtSzene);
    r.clear();
    r.render(welt.szene, welt.kamera);
    const quelle = this.rtSzene.texture;

    // Bloom
    const m = this.m;
    if (post.bloomStaerke > 0) {
      m.vor.uniforms.tQuelle.value = quelle;
      m.vor.uniforms.texel.value.set(1 / this.breite, 1 / this.hoehe);
      m.vor.uniforms.schwelle.value = post.bloomSchwelle;
      m.vor.uniforms.knie.value = post.bloomKnie;
      this._pass(m.vor, this.bloom[0]);
      for (let i = 1; i < this.bloom.length; i++) {
        m.runter.uniforms.tQuelle.value = this.bloom[i - 1].texture;
        m.runter.uniforms.texel.value.copy(this._texel(this.bloom[i - 1]));
        this._pass(m.runter, this.bloom[i]);
      }
      for (let i = this.bloom.length - 1; i > 0; i--) {
        m.hoch.uniforms.tQuelle.value = this.bloom[i].texture;
        m.hoch.uniforms.texel.value.copy(this._texel(this.bloom[i]));
        m.hoch.uniforms.radius.value = post.bloomRadius;
        m.hoch.uniforms.gewicht.value = 1;
        this._pass(m.hoch, this.bloom[i - 1], { leeren: false });
      }
    }

    // Unschärfe-Kette (nur wenn gebraucht)
    const tiefeAn = !!this.rtSzene.depthTexture && (post.tiefeNah > 0.001 || post.tiefeFern > 0.001);
    const brauchtUnschaerfe = post.tiltStaerke > 0.001 || post.unschaerfe > 0.001 || tiefeAn;
    if (brauchtUnschaerfe) {
      // je Stufe: herunterskalieren (13 Abgriffe) → Gauß horizontal → Gauß vertikal; Ergebnis liegt in uX
      const stufe = (quellTex, quellTexel, uX, uXh, breite) => {
        m.runter.uniforms.tQuelle.value = quellTex;
        m.runter.uniforms.texel.value.copy(quellTexel);
        this._pass(m.runter, uX);
        const t = this._texel(uX);
        m.gauss.uniforms.tQuelle.value = uX.texture;
        m.gauss.uniforms.schritt.value.set(t.x * breite, 0);
        this._pass(m.gauss, uXh);
        m.gauss.uniforms.tQuelle.value = uXh.texture;
        m.gauss.uniforms.schritt.value.set(0, t.y * breite);
        this._pass(m.gauss, uX);
      };
      stufe(quelle, new THREE.Vector2(1 / this.breite, 1 / this.hoehe), this.u1, this.u1h, 1.0);
      stufe(this.u1.texture, this._texel(this.u1), this.u2, this.u2h, 1.4);
      stufe(this.u2.texture, this._texel(this.u2), this.u3, this.u3h, 1.8);
    }

    const k = m.komposit.uniforms;
    k.tScharf.value = quelle;
    k.tU1.value = this.u1.texture;
    k.tU2.value = this.u2.texture;
    k.tU3.value = this.u3.texture;
    k.tBloom.value = this.bloom[0].texture;
    k.bloomStaerke.value = post.bloomStaerke > 0 ? post.bloomStaerke * 0.25 : 0;
    k.belichtung.value = post.belichtung;
    k.tiltMitte.value = post.tiltMitte;
    k.tiltBreite.value = post.tiltBreite;
    k.tiltStaerke.value = post.tiltStaerke;
    k.unschaerfe.value = post.unschaerfe;
    k.vignette.value = post.vignette;
    k.saettigung.value = post.saettigung;
    k.kontrast.value = post.kontrast;
    k.tonung.value.set(...post.tonung);
    k.tonungStaerke.value = post.tonungStaerke;
    k.tiefeAn.value = tiefeAn ? 1 : 0;
    k.tTiefe.value = tiefeAn ? this.rtSzene.depthTexture : null;
    k.tiefeNah.value = post.tiefeNah; k.tiefeFern.value = post.tiefeFern; k.fokusNah.value = post.fokusNah; k.fokusFern.value = post.fokusFern;
    k.kNah.value = welt.kamera.near ?? 0.1; k.kFern.value = welt.kamera.far ?? 1000;
    k.flimmern.value = post.flimmern; k.flimmerZeit.value = t; k.flimmerY.value.set(...post.flimmerY);
    k.schleier.value.set(...post.schleier); k.schleierStaerke.value = post.schleierStaerke;
    this._pass(m.komposit, ausgabe);
    return post;
  }

  /**
   * Ein Bild zeichnen.
   * @param {object} weltA  aktive Welt
   * @param {object} [opt]  { weltB, uebergang: {typ:'blende'|'iris'|'wisch'|'zoom'|'wolken'|'blasen'|'zoomwisch', p, mitte:[x,y], richtung:[x,y], farbe1, farbe2}, bildNr, t }
   */
  zeichne(weltA, { weltB = null, uebergang = null, bildNr = 0, t = 0 } = {}) {
    const r = this.renderer;
    r.autoClear = false;
    const postA = this._welt(weltA, this.rtLdrA, t);
    let bild = this.rtLdrA;
    let koernung = postA.koernung;
    if (weltB && uebergang) {
      const postB = this._welt(weltB, this.rtLdrB, t);
      const u = this.m.uebergang.uniforms;
      u.tA.value = this.rtLdrA.texture;
      u.tB.value = this.rtLdrB.texture;
      u.p.value = uebergang.p;
      u.typ.value = { blende: 0, iris: 1, wisch: 2, zoom: 3, ...UEBERGANG_NR }[uebergang.typ] ?? 0;
      // Standardfarben der neuen Übergänge (Wolken: hell/Schatten, Blasen: Rand, Zoom-Wisch: Lichtkante)
      const std = { wolken: ["#FFFFFF", "#C9D3E6"], blasen: ["#FFFFFF", "#FFFFFF"], zoomwisch: ["#FFF6D8", "#FFFFFF"] }[uebergang.typ];
      if (std && !uebergang.farbe1) u.farbe1.value.set(std[0]);
      if (std && !uebergang.farbe2) u.farbe2.value.set(std[1]);
      u.mitte.value.set(...(uebergang.mitte || [0.5, 0.5]));
      u.richtung.value.set(...(uebergang.richtung || [1, 0]));
      if (uebergang.farbe1) u.farbe1.value.set(uebergang.farbe1);
      if (uebergang.farbe2) u.farbe2.value.set(uebergang.farbe2);
      this._pass(this.m.uebergang, this.rtMix);
      bild = this.rtMix;
      koernung = koernung + (postB.koernung - koernung) * uebergang.p;
    }
    this.m.fxaa.uniforms.tDiffuse.value = bild.texture;
    this._pass(this.m.fxaa, this.rtFxaa);
    const f = this.m.final.uniforms;
    f.tBild.value = this.rtFxaa.texture;
    f.koernung.value = koernung;
    f.bildNr.value = bildNr;
    this._pass(this.m.final, null);
  }
}
