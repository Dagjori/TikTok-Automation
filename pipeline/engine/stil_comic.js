// Stil 12 · Comic-Toon 3D als Produktions-Baukasten (Muster: stile/stil_12_comic.*).
// Cel-Shading in drei Stufen mit Rasterpunkten im Schatten, schwarze Konturen (Inverted Hull), Strahlenkranz-Himmel,
// Comic-Figuren ohne Gesicht. Eigene Bühne ohne ACES/Bloom (die Comic-Farben bleiben flach und kräftig), aber mit den
// gleichen Übergängen wie kern.js (blende, wisch, zoom, wolken, blasen, zoomwisch) und der gleichen Schnittstelle für
// Zeitleiste: buehne.zeichne(weltA, { weltB, uebergang, bildNr, t }). Welten: { szene, kamera, post?, update(t) }.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { UEBERGANG_GLSL, UEBERGANG_NR } from "./uebergaenge.js";

const VERTEX = /* glsl */ `varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FINAL = /* glsl */ `
uniform sampler2D tA, tB; uniform float p; uniform int typ; uniform int mischen; uniform vec2 mitte; uniform float aspekt;
uniform vec2 richtung; uniform vec3 farbe1, farbe2; uniform float vignette; uniform float koernung; uniform float bildNr;
uniform vec2 aufloesung;
varying vec2 vUv;
vec3 ue_srgb(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
#define UE_LIES(t, uv) ue_srgb(texture2D(t, clamp(uv, 0.0, 1.0)).rgb)
#define UE_FARBE(c) ue_srgb(c)
${UEBERGANG_GLSL}
float h12(vec2 q) { vec3 p3 = fract(vec3(q.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 zoomBlur(sampler2D t, vec2 uv, vec2 m, float staerke) {
  vec3 c = vec3(0.0);
  for (int i = 0; i < 10; i++) { float f = 1.0 - staerke * float(i) / 9.0; c += UE_LIES(t, m + (uv - m) * f); }
  return c / 10.0;
}
void main() {
  vec3 col;
  if (mischen == 0) col = UE_LIES(tA, vUv);
  else if (typ == 0) col = mix(UE_LIES(tA, vUv), UE_LIES(tB, vUv), smoothstep(0.0, 1.0, p));
  else if (typ == 2) { // Wisch mit zwei Farbbändern (wie kern.js)
    vec2 dir = normalize(richtung);
    vec2 q = vUv - 0.5; q.x *= aspekt;
    float s = dot(q, dir) + 0.18 * dot(q, vec2(-dir.y, dir.x));
    float breite = 0.14;
    float front = mix(-0.9, 0.9 + 3.0 * breite, p);
    vec3 a = UE_LIES(tA, vUv + dir * vec2(1.0 / aspekt, 1.0) * p * 0.06);
    vec3 b = UE_LIES(tB, vUv - dir * vec2(1.0 / aspekt, 1.0) * (1.0 - p) * 0.06);
    float x = front - s;
    col = x < 0.0 ? a : (x < breite ? UE_FARBE(farbe1) : (x < 2.0 * breite ? UE_FARBE(farbe2) : b));
  } else if (typ == 10) col = ue_wolken(tA, tB, vUv, p, aspekt, mitte, farbe1, farbe2);
  else if (typ == 11) col = ue_blasen(tA, tB, vUv, p, aspekt, farbe1);
  else if (typ == 12) col = ue_zoomwisch(tA, tB, vUv, p, aspekt, mitte, richtung, farbe1);
  else { // Zoom
    float e = smoothstep(0.0, 1.0, p);
    vec3 a = zoomBlur(tA, mitte + (vUv - mitte) / (1.0 + e * 1.6), mitte, e * 0.35);
    vec3 b = zoomBlur(tB, mitte + (vUv - mitte) * (1.0 + (1.0 - e) * 0.6), mitte, (1.0 - e) * 0.25);
    col = mix(a, b, smoothstep(0.35, 0.75, p));
    col += vec3(1.0) * 0.35 * (1.0 - abs(p - 0.55) / 0.45) * step(abs(p - 0.55), 0.45);
  }
  vec2 q = vUv - 0.5; q.x *= aspekt;
  col *= mix(1.0 - vignette, 1.0, smoothstep(0.95, 0.35, length(q) * 1.15));
  vec2 px = floor(vUv * aufloesung);
  col += (h12(px + mod(bildNr, 64.0) * 17.31) - 0.5) * koernung;
  col += (h12(px * 1.37 + 11.0) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

/** Bühne für Comic-Welten: MSAA-Ziel (linear, Halbfloat), Übergänge, Vignette, leichte Papierkörnung */
export class ComicBuehne {
  constructor(canvas, { breite = 1080, hoehe = 1920, msaa = 4, schatten = true } = {}) {
    this.breite = breite;
    this.hoehe = hoehe;
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: false, powerPreference: "high-performance" });
    r.setPixelRatio(1);
    r.setSize(breite, hoehe, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = schatten;
    r.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = r;
    const ziel = () => {
      const rt = new THREE.WebGLRenderTarget(breite, hoehe, { type: THREE.HalfFloatType, samples: msaa, depthBuffer: true });
      rt.texture.generateMipmaps = false;
      return rt;
    };
    this.rtA = ziel();
    this.rtB = ziel();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.quad = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      vertexShader: VERTEX, fragmentShader: FINAL, depthTest: false, depthWrite: false,
      uniforms: {
        tA: { value: null }, tB: { value: null }, p: { value: 0 }, typ: { value: 0 }, mischen: { value: 0 },
        mitte: { value: new THREE.Vector2(0.5, 0.5) }, aspekt: { value: breite / hoehe }, richtung: { value: new THREE.Vector2(1, 0) },
        farbe1: { value: new THREE.Color("#FFFFFF") }, farbe2: { value: new THREE.Color("#C9D3E6") }, vignette: { value: 0.18 },
        koernung: { value: 0.012 }, bildNr: { value: 0 }, aufloesung: { value: new THREE.Vector2(breite, hoehe) },
      },
    }));
    this.quad.frustumCulled = false;
    this.quadSzene = new THREE.Scene();
    this.quadSzene.add(this.quad);
    this.quadKamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  _welt(welt, rt, t) {
    if (welt.update) welt.update(t);
    this.renderer.setRenderTarget(rt);
    this.renderer.clear();
    this.renderer.render(welt.szene, welt.kamera);
    return welt.post || {};
  }
  zeichne(weltA, { weltB = null, uebergang = null, bildNr = 0, t = 0 } = {}) {
    const r = this.renderer;
    const postA = this._welt(weltA, this.rtA, t);
    const u = this.quad.material.uniforms;
    u.tA.value = this.rtA.texture;
    u.mischen.value = 0;
    let vign = postA.vignette ?? 0.18, korn = postA.koernung ?? 0.012;
    if (weltB && uebergang) {
      const postB = this._welt(weltB, this.rtB, t);
      u.tB.value = this.rtB.texture;
      u.mischen.value = 1;
      u.p.value = uebergang.p;
      u.typ.value = { blende: 0, iris: 0, wisch: 2, zoom: 3, ...UEBERGANG_NR }[uebergang.typ] ?? 0;
      const std = { wolken: ["#FFFFFF", "#C9D3E6"], blasen: ["#FFFFFF", "#FFFFFF"], zoomwisch: ["#FFF6D8", "#FFFFFF"], wisch: ["#FFD23F", "#12151D"] }[uebergang.typ] || ["#FFFFFF", "#FFFFFF"];
      u.farbe1.value.set(uebergang.farbe1 || std[0]);
      u.farbe2.value.set(uebergang.farbe2 || std[1]);
      u.mitte.value.set(...(uebergang.mitte || [0.5, 0.5]));
      u.richtung.value.set(...(uebergang.richtung || [1, 0]));
      vign += ((postB.vignette ?? 0.18) - vign) * uebergang.p;
      korn += ((postB.koernung ?? 0.012) - korn) * uebergang.p;
    }
    u.vignette.value = vign;
    u.koernung.value = korn;
    u.bildNr.value = bildNr;
    r.setRenderTarget(null);
    r.clear();
    r.render(this.quadSzene, this.quadKamera);
  }
}

// =====================================================================================
// Materialien: Cel-Shading mit Rasterpunkten, Kontur
// =====================================================================================
export const ZELLE = { value: 10.0 };
/** Comic-Material: 3 Tonstufen; im Schatten Rasterpunkte (Bildschirmraster, Zelle in px) */
export function toon(farbe, { punkte = true, hell = 1.0, emissiv = null } = {}) {
  const m = new THREE.MeshLambertMaterial({ color: farbe });
  if (emissiv) m.emissive = new THREE.Color(emissiv);
  m.onBeforeCompile = (s) => {
    s.uniforms.uZelle = ZELLE;
    s.fragmentShader = "uniform float uZelle;\n" + s.fragmentShader.replace("#include <opaque_fragment>", /* glsl */ `
      #include <opaque_fragment>
      float lumD = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)) + 1e-4;
      float lumL = dot(outgoingLight - totalEmissiveRadiance, vec3(0.299, 0.587, 0.114));
      float st = lumL / lumD;
      vec3 basis = diffuseColor.rgb * ${hell.toFixed(3)};
      vec3 col = basis * (st > 0.80 ? 1.0 : (st > 0.47 ? 0.8 : 0.6));
      ${punkte ? `
      vec2 q = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / uZelle;
      float d = length(fract(q) - 0.5);
      float dunkel = clamp((0.84 - st) / 0.56, 0.0, 1.0);
      float r = sqrt(dunkel) * 0.5;
      float punkt = 1.0 - smoothstep(r - 0.07, r + 0.07, d);
      col = mix(col, basis * 0.34, punkt * step(0.04, dunkel));` : ""}
      col += totalEmissiveRadiance;
      gl_FragColor = vec4(col, diffuseColor.a);`);
  };
  m.customProgramCacheKey = () => `toon-${punkte}-${hell}`;
  return m;
}
/** Flache Farbe ohne Licht (Leuchten, Schilder) */
export const flach = (farbe, opt = {}) => new THREE.MeshBasicMaterial({ color: farbe, ...opt });

const KONTUR_DICKE = { value: 0.05 };
export const KONTUR = new THREE.MeshBasicMaterial({ color: "#12151D", side: THREE.BackSide });
KONTUR.onBeforeCompile = (s) => {
  s.uniforms.uDicke = KONTUR_DICKE;
  s.vertexShader = "uniform float uDicke;\n" + s.vertexShader.replace("#include <begin_vertex>", "vec3 transformed = position + normal * uDicke;");
};
export function setzeKonturDicke(d) {
  KONTUR_DICKE.value = d;
}
/** Kontur (Inverted Hull) an ein Mesh hängen; dicke in Welteinheiten (Standard: global) */
export function kontur(mesh, dicke = null) {
  const g = mesh.geometry.clone();
  for (const k of Object.keys(g.attributes)) if (k !== "position") g.deleteAttribute(k);
  g.deleteAttribute && g.index === null;
  const m = mergeVertices(g, 1e-3);
  m.computeVertexNormals();
  let mat = KONTUR;
  if (dicke !== null) {
    mat = KONTUR.clone();
    const u = { value: dicke };
    mat.onBeforeCompile = (s) => {
      s.uniforms.uDicke = u;
      s.vertexShader = "uniform float uDicke;\n" + s.vertexShader.replace("#include <begin_vertex>", "vec3 transformed = position + normal * uDicke;");
    };
    mat.customProgramCacheKey = () => "kontur-eigen";
  }
  const h = new THREE.Mesh(m, mat);
  h.castShadow = false;
  h.receiveShadow = false;
  mesh.add(h);
  return mesh;
}
/** Bauteil: Mesh mit Comic-Material (Farbe oder Material), Kontur, Schatten */
export function teil(geo, farbe, x, y, z, eltern, { linie = true, punkte = true, schatten = true, empfangen = true, dicke = null } = {}) {
  const m = new THREE.Mesh(geo, typeof farbe === "string" ? toon(farbe, { punkte }) : farbe);
  m.position.set(x, y, z);
  m.castShadow = schatten;
  m.receiveShadow = empfangen;
  if (linie) kontur(m, dicke);
  if (eltern) eltern.add(m);
  return m;
}
export const box = (w, h, d, r = 0.06) => new RoundedBoxGeometry(w, h, d, 2, Math.max(0.001, Math.min(r, w / 2, h / 2, d / 2) * 0.99));
export const walze = (r, h, n = 24) => new THREE.CylinderGeometry(r, r, h, n);

// =====================================================================================
// Himmel: Verlauf, Strahlenkranz, Rasterpunkte, Comic-Wolken
// =====================================================================================
export function comicHimmel({ breite = 1080, hoehe = 1920, oben = "#36B6FF", mitte = "#8FDCFF", unten = "#D8F4FF", strahlenMitte = [540, 900], wolken = [[700, 520, 0.9], [80, 640, 0.7], [860, 1180, 0.55], [180, 1320, 0.5]] } = {}) {
  const c = document.createElement("canvas");
  c.width = breite;
  c.height = hoehe;
  const g = c.getContext("2d");
  const v = g.createLinearGradient(0, 0, 0, hoehe);
  v.addColorStop(0, oben); v.addColorStop(0.5, mitte); v.addColorStop(1, unten);
  g.fillStyle = v;
  g.fillRect(0, 0, breite, hoehe);
  const [cx, cy] = strahlenMitte;
  for (let i = 0; i < 40; i++) {
    const a0 = (i / 40) * Math.PI * 2, a1 = a0 + Math.PI / 40;
    if (i % 2) continue;
    g.fillStyle = "rgba(255,255,255,0.16)";
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * 3000, cy + Math.sin(a0) * 3000); g.lineTo(cx + Math.cos(a1) * 3000, cy + Math.sin(a1) * 3000); g.closePath(); g.fill();
  }
  g.fillStyle = "rgba(10,70,160,0.2)";
  for (let y = 0; y < 760; y += 15) for (let x = (y / 15) % 2 ? 7 : 0; x < breite; x += 15) {
    const r = 5 * Math.max(0, 1 - y / 760);
    if (r > 0.4) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  }
  const wolke = (x, y, s) => {
    g.lineWidth = 7; g.strokeStyle = "#12151D"; g.fillStyle = "#fff";
    const k = [[0, 0, 60], [62, -22, 70], [130, 4, 56], [60, 22, 58]];
    g.beginPath(); for (const [dx, dy, r] of k) { g.moveTo(x + dx * s + r * s, y + dy * s); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); } g.stroke();
    for (const [dx, dy, r] of k) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#cfe9ff"; g.beginPath(); g.ellipse(x + 64 * s, y + 46 * s, 110 * s, 18 * s, 0, 0, Math.PI * 2); g.fill();
  };
  for (const [x, y, s] of wolken) wolke(x, y, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Schild mit Text als Textur (für Etagennummern, Banner) */
export function textTextur(text, { b = 512, h = 256, farbe = "#12151D", grund = "#FFFFFF", rand = "#12151D", randBreite = 14, schrift = "900", groesse = 0.62, radius = 36, kursiv = true } = {}) {
  const c = document.createElement("canvas");
  c.width = b;
  c.height = h;
  const g = c.getContext("2d");
  if (grund) {
    g.fillStyle = grund;
    g.beginPath();
    g.roundRect(randBreite / 2, randBreite / 2, b - randBreite, h - randBreite, radius);
    g.fill();
    if (rand) { g.lineWidth = randBreite; g.strokeStyle = rand; g.stroke(); }
  }
  g.fillStyle = farbe;
  g.font = `${kursiv ? "italic " : ""}${schrift} ${Math.round(h * groesse)}px "SB Kursiv", "SB Display", Inter, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, b / 2, h * 0.54);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// =====================================================================================
// Comic-Figur ohne Gesicht: Körper (Teamfarbe), Kopf, Arme, Beine; Laufanimation über setzeFigur
// =====================================================================================
export function figur({ farbe = "#FF8A3D", haut = "#FFD9B8", hose = "#2B3045", groesse = 1.0 } = {}) {
  const g = new THREE.Group();
  const k = new THREE.Group(); // Körper (für Neigen)
  g.add(k);
  const huefte = 0.86 * groesse;
  const koerper = teil(new THREE.CapsuleGeometry(0.27 * groesse, 0.42 * groesse, 6, 14), farbe, 0, huefte + 0.42 * groesse, 0, k);
  koerper.scale.set(1, 1, 0.82);
  teil(new THREE.SphereGeometry(0.27 * groesse, 22, 16), haut, 0, huefte + 1.0 * groesse, 0, k);
  // Haare als Kappe (Teamfarbe dunkler): gibt eine Richtung, ohne Gesicht
  const haar = teil(new THREE.SphereGeometry(0.285 * groesse, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.Color(farbe).multiplyScalar(0.55).getStyle(), 0, huefte + 1.02 * groesse, -0.02, k, { linie: false });
  haar.rotation.x = -0.35;
  const glied = (x, y, l, d, f) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    const m = teil(new THREE.CapsuleGeometry(d, l, 4, 10), f, 0, -l / 2 - d * 0.3, 0, p);
    p.userData.mesh = m;
    return p;
  };
  const armL = glied(-0.33 * groesse, huefte + 0.72 * groesse, 0.34 * groesse, 0.085 * groesse, farbe);
  const armR = glied(0.33 * groesse, huefte + 0.72 * groesse, 0.34 * groesse, 0.085 * groesse, farbe);
  const beinL = glied(-0.13 * groesse, huefte + 0.02, 0.5 * groesse, 0.11 * groesse, hose);
  const beinR = glied(0.13 * groesse, huefte + 0.02, 0.5 * groesse, 0.11 * groesse, hose);
  k.add(armL, armR, beinL, beinR);
  g.userData = { k, armL, armR, beinL, beinR, huefte, groesse };
  return g;
}
/**
 * Figur setzen: pos [x,y,z] (Füße), richtung (Winkel um y, 0 = Blick nach +z), phase (Schrittphase in Schritten),
 * lauf 0..1 (Stärke der Laufbewegung), steigen 0..1 (Knie höher beim Treppensteigen), huepf (Sprung in m), winken 0..1
 */
export function setzeFigur(f, { pos, richtung = 0, phase = 0, lauf = 0, steigen = 0, huepf = 0, winken = 0, neigung = null } = {}) {
  const u = f.userData;
  f.position.set(pos[0], pos[1] + huepf, pos[2]);
  f.rotation.y = richtung;
  const s = Math.sin(phase * Math.PI);
  const ausschlag = lauf * (0.75 + 0.25 * steigen);
  u.beinL.rotation.x = s * ausschlag * 0.9 - steigen * lauf * 0.35 * Math.max(0, s);
  u.beinR.rotation.x = -s * ausschlag * 0.9 - steigen * lauf * 0.35 * Math.max(0, -s);
  u.armL.rotation.x = -s * ausschlag * 1.1;
  u.armR.rotation.x = s * ausschlag * 1.1;
  u.armL.rotation.z = -0.12 - 0.1 * lauf;
  u.armR.rotation.z = 0.12 + 0.1 * lauf - winken * 2.4;
  if (winken > 0) u.armR.rotation.x = Math.sin(phase * Math.PI * 2) * 0.25 * winken;
  u.k.rotation.x = neigung ?? lauf * (0.18 + 0.12 * steigen);
  u.k.position.y = Math.abs(Math.cos(phase * Math.PI)) * 0.06 * lauf;
}
