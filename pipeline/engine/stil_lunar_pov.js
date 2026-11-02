// Baukasten „Lunar-POV“ (Designstil 16) – NUR für Account 2 @stelldirvor.pov (Referenzformat, Skill .claude/skills/stelldirvor-video/).
// Verbindliche Werte, Zeitpunkte und Regeln: .claude/skills/stelldirvor-video/ (design.md, licht-und-effekte.md, technik.md).
// Text-Ebenen, Glasriss, Linsenflecken, Vignette und Abspann liegen in engine/lunar_hud.js (+ stil_lunar_pov.css).
//
// Alles ist eine reine Funktion der Zeit t (feste Seeds, kein Zustand zwischen Bildern): jedes Bild lässt sich einzeln rendern.
// Einheiten: Meter, Sekunden, Grad (Kamera). Farben als Hex (sRGB) – Three.js rechnet sie in den linearen Arbeitsraum um.
//
// Inhalt
//   aktiviereHoehenNebel()  Höhennebel für alle Materialien (Luftperspektive: tief und fern = dichter Dunst)
//   Himmel                  Verlauf Zenit → Horizont, Sonne mit Scheibe und Glanz (HDR → Bloom), Federwolken
//   Glut                    leuchtender Körper (Feuerball, neuer Stern, Lava, Lichtpunkt) als HDR-Billboard
//   Puffs + Erzeuger        weiche Rauch-/Staub-/Wolken-Billboards: wolkenFeld, rauchSaeule (auch Pilz), staubWand (Druck-/Staubwand),
//                           feuerBall, puffStrahl (Gischt, Dampf, aufgewirbelter Staub)
//   Partikel                GPU-Teilchen: staub, asche, schnee, eis, regen (Striche), funken (HDR)
//   Truemmer                Brocken, Bretter, Ziegel mit Wurfbahn, Luftwiderstand, Wind, Drehung
//   Menschen, Autos, Voegel Statisten als Instanzen mit einfacher Bewegung und Reaktion (fliehen, stehen bleiben, fallen, bremsen)
//   vordergrund()           Geländer (holz, metall, glas), Brüstung (beton), Fensterrahmen – fest vor der Kamera
//   PovKamera               feste Ich-Perspektive: Blick-Schwenks, Atmen, Beben, Stoß, Kippen (gemessen an den Referenzen)
//   PHASE, farbPhasen()     Farbstimmung je Phase (alltag, grell, hitze, staub, staubwand, wasser, eis, nacht) für kern.js
//   huelle(), blitzKurve()  Hüllkurven für Effekte
//   Protokoll               Ereignis-Protokoll (typ "effekt" mit Klangnamen für atmo.py, typ "kamera")
import * as THREE from "three";
import { clamp, lerp, smoothstep, ease, fortschritt, keyframes, hash, rauschen } from "./bewegung.js";

const V3 = (a) => (a && a.isVector3 ? a.clone() : new THREE.Vector3(...a));
const farbe = (c) => (c && c.isColor ? c.clone() : new THREE.Color(c));
const rnd = (i, s) => hash(i, s);
const rndBereich = (i, s, a, b) => a + (b - a) * hash(i, s);

// ---------------------------------------------------------------------------------------------- Hüllkurven
/** 0 → 1 → 0: ein (s), halten (s), aus (s) ab t0 */
export function huelle(t, t0, ein = 0.2, halten = 1, aus = 0.6) {
  if (t < t0) return 0;
  const x = t - t0;
  if (x < ein) return ease.outCubic(x / Math.max(ein, 1e-4));
  if (x < ein + halten) return 1;
  return 1 - ease.inOutSine(clamp((x - ein - halten) / Math.max(aus, 1e-4)));
}
/** Lichtblitz: steiler Anstieg (≈ 0,08 s), kurzes Halten, langes Abklingen (gemessen: Weißblende ≈ 1,5–2 s) */
export function blitzKurve(t, t0, { anstieg = 0.08, halten = 0.25, abkling = 1.6 } = {}) {
  if (t < t0) return 0;
  const x = t - t0;
  if (x < anstieg) return ease.outQuad(x / anstieg);
  if (x < anstieg + halten) return 1;
  return Math.exp(-((x - anstieg - halten) / abkling) * 2.6);
}

// ---------------------------------------------------------------------------------------------- Höhennebel
let nebelAktiv = null;
/**
 * Höhennebel für alle Materialien mit fog (MeshStandard, Lambert, Basic, Points, Sprites, Puffs …). Einmal vor dem ersten Rendern aufrufen.
 * Dichte und Farbe kommen aus szene.fog (THREE.FogExp2) und sind animierbar; abfall (1/m) und basis (m) sind je Video fest.
 * Wirkung (Beer-Lambert, dichte = Extinktion je m): Nebelanteil = 1 − exp(−dichte · Abstand · exp(−max(y − basis, 0) · abfall))
 * → Luftperspektive wie in den Referenzen: 2 km ≈ 12 %, 14 km ≈ 60 % bei dichte 6,5e-5; Gipfel und Türme ragen aus dem Dunst.
 */
export function aktiviereHoehenNebel({ abfall = 0.012, basis = 0 } = {}) {
  if (nebelAktiv) return nebelAktiv;
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex = "#ifdef USE_FOG\n\tvarying float vFogDepth;\n\tvarying float vFogY;\n#endif";
  C.fog_vertex = "#ifdef USE_FOG\n\tvFogDepth = - mvPosition.z;\n\tvFogY = ( inverse( viewMatrix ) * mvPosition ).y;\n#endif";
  C.fog_pars_fragment = "#ifdef USE_FOG\n\tuniform vec3 fogColor;\n\tvarying float vFogDepth;\n\tvarying float vFogY;\n\t#ifdef FOG_EXP2\n\t\tuniform float fogDensity;\n\t#else\n\t\tuniform float fogNear;\n\t\tuniform float fogFar;\n\t#endif\n#endif";
  C.fog_fragment = `#ifdef USE_FOG
	float lpHoehe = exp( - max( vFogY - (${basis.toFixed(3)}), 0.0 ) * ${abfall.toFixed(5)} );
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * vFogDepth * lpHoehe );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth ) * lpHoehe;
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;
  nebelAktiv = { abfall, basis };
  return nebelAktiv;
}

// ---------------------------------------------------------------------------------------------- Himmel
const HIMMEL_V = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = (modelMatrix * vec4(position, 0.0)).xyz;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const HIMMEL_F = /* glsl */ `
uniform vec3 zenit, horizont, unten, sonnenRichtung, sonnenFarbe, zirrenFarbe;
uniform float sonnenStaerke, sonnenGroesse, glanz, glanzBreite, dunst, helligkeit, zirren, zeit;
varying vec3 vDir;
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), u.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n2(p); p *= 2.03; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float g = 1.0 - exp(-max(h, 0.0) / max(dunst, 1e-3));
  vec3 col = mix(horizont, zenit, g);
  col = mix(col, unten, smoothstep(0.0, -0.10, h));
  if (zirren > 0.0 && h > 0.015) { // Federwolken: gestreckte Rauschbänder
    vec2 q = d.xz / (h + 0.06);
    float w = fbm(vec2(q.x * 0.55 + zeit * 0.003, q.y * 4.5 + 3.0));
    float c = smoothstep(0.52, 0.86, w) * smoothstep(0.015, 0.22, h);
    col = mix(col, zirrenFarbe, c * zirren);
  }
  vec3 s = normalize(sonnenRichtung);
  float ang = acos(clamp(dot(d, s), -1.0, 1.0));
  float scheibe = 1.0 - smoothstep(sonnenGroesse * 0.82, sonnenGroesse, ang);
  float halo = exp(-ang / max(glanzBreite, 1e-3));
  col += sonnenFarbe * (scheibe * sonnenStaerke + halo * glanz);
  gl_FragColor = vec4(col * helligkeit, 1.0);
}`;

/**
 * Himmelskuppel (folgt der Kamera). Die Sonne ist HDR (sonnenStaerke ≫ 1) und erzeugt mit dem Bloom von kern.js die Blendung der Referenzen.
 * Gemessen (Alltag, Mittel der oberen 30 % des Bildes): A #8498B6, S #B4B3BD (Dunst, lavendel), T #A0ADC5 – also entsättigt, nie knallblau.
 */
export class Himmel {
  constructor(szene, {
    radius = 2500, zenit = "#6F87AE", horizont = "#C9CFD8", unten = "#8F9488", dunst = 0.22, helligkeit = 1,
    sonnenRichtung = [0.35, 0.42, -1], sonnenFarbe = "#FFF2DC", sonnenStaerke = 30, sonnenGroesse = 0.012, glanz = 0.6, glanzBreite = 0.09,
    zirren = 0, zirrenFarbe = "#E7ECF2",
  } = {}) {
    this.u = {
      zenit: { value: farbe(zenit) }, horizont: { value: farbe(horizont) }, unten: { value: farbe(unten) },
      sonnenRichtung: { value: V3(sonnenRichtung).normalize() }, sonnenFarbe: { value: farbe(sonnenFarbe) },
      sonnenStaerke: { value: sonnenStaerke }, sonnenGroesse: { value: sonnenGroesse }, glanz: { value: glanz }, glanzBreite: { value: glanzBreite },
      dunst: { value: dunst }, helligkeit: { value: helligkeit }, zirren: { value: zirren }, zirrenFarbe: { value: farbe(zirrenFarbe) }, zeit: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: HIMMEL_V, fragmentShader: HIMMEL_F, uniforms: this.u, side: THREE.BackSide, depthWrite: false, fog: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), mat);
    this.mesh.renderOrder = -1000;
    this.mesh.frustumCulled = false;
    szene.add(this.mesh);
  }
  /** Werte setzen (alle optional). Farben als Hex oder THREE.Color, Richtung als [x,y,z]. */
  setze(w = {}) {
    for (const [k, v] of Object.entries(w)) {
      if (!this.u[k] || v === undefined) continue;
      if (this.u[k].value.isColor) this.u[k].value.copy(farbe(v));
      else if (this.u[k].value.isVector3) this.u[k].value.copy(V3(v)).normalize();
      else this.u[k].value = v;
    }
    return this;
  }
  folge(kamera) { this.mesh.position.copy(kamera.position); return this; }
  /** Horizontfarbe (linear) – als Nebelfarbe verwenden, damit ferne Berge im Himmel verschwinden */
  get horizont() { return this.u.horizont.value; }
}

// ---------------------------------------------------------------------------------------------- Glut (leuchtender Körper)
let glutTextur = null;
function radialTextur() {
  if (glutTextur) return glutTextur;
  const n = 128, c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.18, "rgba(255,255,255,0.85)"); r.addColorStop(0.35, "rgba(255,255,255,0.32)");
  r.addColorStop(0.6, "rgba(255,255,255,0.08)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, n, n);
  glutTextur = new THREE.CanvasTexture(c);
  glutTextur.colorSpace = THREE.NoColorSpace;
  return glutTextur;
}
/** Leuchtender Körper (Feuerball, neuer Stern am Himmel, Lavaquelle) als additives HDR-Billboard; staerke ≫ 1 → Bloom. */
export class Glut {
  constructor(szene, { farbe: f = "#FFE2B0", staerke = 8, groesse = 10, nebel = false } = {}) {
    this.mat = new THREE.SpriteMaterial({ map: radialTextur(), color: farbe(f), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: nebel });
    this.sprite = new THREE.Sprite(this.mat);
    this.basis = farbe(f);
    this.sprite.renderOrder = 5;
    szene.add(this.sprite);
    this.setze({ staerke, groesse });
  }
  setze({ p, groesse, staerke, farbe: f } = {}) {
    if (p) this.sprite.position.copy(V3(p));
    if (groesse !== undefined) this.sprite.scale.set(groesse, groesse, 1);
    if (f) this.basis = farbe(f);
    if (staerke !== undefined) { this.mat.color.copy(this.basis).multiplyScalar(staerke); this.sprite.visible = staerke > 0.001; }
    return this;
  }
}

// ---------------------------------------------------------------------------------------------- Puffs (weiche Rauch-/Staub-Billboards)
function wertRauschen2(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const h = (a, b) => hash(a * 7919 + b * 104729, s);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
function fbm2(x, y, s) { let a = 0.5, f = 1, sum = 0; for (let i = 0; i < 5; i++) { sum += a * wertRauschen2(x * f, y * f, s + i * 13); f *= 2.02; a *= 0.5; } return sum; }
let puffAtlas = null;
/** Atlas mit 4 Wolkenballen (R = Dichte, G = Licht von oben), einmal je Seite erzeugt (deterministisch) */
function puffTextur() {
  if (puffAtlas) return puffAtlas;
  const N = 256, H = 128, c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d"), img = g.createImageData(N, N);
  for (let k = 0; k < 4; k++) {
    const ox = (k % 2) * H, oy = Math.floor(k / 2) * H, s = 31 + k * 17;
    for (let y = 0; y < H; y++) for (let x = 0; x < H; x++) {
      const nx = (x - H / 2) / (H / 2), ny = (y - H / 2) / (H / 2);
      const d = Math.hypot(nx, ny * 1.05);
      const n = fbm2(nx * 2.2 + k * 5, ny * 2.2, s);
      // Ballen: weicher Rand, ausgefranst durch Rauschen
      let a = (1 - Math.pow(clamp(d), 1.25)) * (0.62 + 0.7 * n) - 0.24;
      a = clamp(a * 1.45);
      a = a * a * (3 - 2 * a);
      // Licht von oben: oben hell, unten Schatten, Rauschen formt „Blumenkohl“-Wülste
      const n2 = fbm2(nx * 2.2 + k * 5, (ny - 0.12) * 2.2, s);
      let l = 0.6 - ny * 0.36 + (n - n2) * 2.0;
      l = clamp(l);
      const i = ((oy + y) * N + ox + x) * 4;
      img.data[i] = Math.round(a * 255); img.data[i + 1] = Math.round(l * 255); img.data[i + 2] = 0; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  puffAtlas = new THREE.CanvasTexture(c);
  puffAtlas.colorSpace = THREE.NoColorSpace;
  puffAtlas.generateMipmaps = true;
  puffAtlas.minFilter = THREE.LinearMipmapLinearFilter;
  return puffAtlas;
}
const PUFF_V = /* glsl */ `
attribute vec3 iPos; attribute float iGroesse; attribute float iDreh; attribute vec3 iFarbe; attribute float iAlpha; attribute float iLicht; attribute float iBild;
varying vec2 vUv; varying vec3 vFarbe; varying float vAlpha; varying float vLicht;
#include <fog_pars_vertex>
void main() {
  float c = cos(iDreh), s = sin(iDreh);
  vec2 q = vec2(c * position.x - s * position.y, s * position.x + c * position.y) * iGroesse;
  vec4 mvPosition = modelViewMatrix * vec4(iPos, 1.0);
  mvPosition.xy += q;
  gl_Position = projectionMatrix * mvPosition;
  float b = floor(iBild + 0.5);
  vUv = (uv + vec2(mod(b, 2.0), floor(b / 2.0))) * 0.5;
  vFarbe = iFarbe; vAlpha = iAlpha; vLicht = iLicht;
  #include <fog_vertex>
}`;
const PUFF_F = /* glsl */ `
uniform sampler2D atlas; uniform float schatten; uniform float additiv;
varying vec2 vUv; varying vec3 vFarbe; varying float vAlpha; varying float vLicht;
#include <fog_pars_fragment>
void main() {
  vec4 t = texture2D(atlas, vUv);
  float a = t.r * vAlpha;
  if (a < 0.003) discard;
  float licht = mix(1.0, mix(schatten, 1.15, t.g), vLicht);
  gl_FragColor = vec4(vFarbe * licht, additiv > 0.5 ? 1.0 : a);
  #include <fog_fragment>
  if (additiv > 0.5) gl_FragColor.rgb *= a;
}`;

/**
 * Weiche Billboards für Rauch, Staub, Wolken, Gischt. setze(liste, kamera) zeichnet genau die Puffs der Liste (hinten nach vorn sortiert).
 * Puff = { p:[x,y,z], r: Radius m, dreh: rad, farbe: Hex|Color|[r,g,b] linear, a: 0..1, licht: 0..1 (Licht von oben), bild: 0..3 }
 * additiv: true für Feuer/Glut (Farbe darf HDR sein). nebel: false für Puffs, die nicht im Dunst verschwinden sollen.
 */
export class Puffs {
  constructor(szene, { max = 800, additiv = false, nebel = true, schatten = 0.5, renderOrder = 10 } = {}) {
    this.max = max;
    const geo = new THREE.InstancedBufferGeometry();
    const basis = new THREE.PlaneGeometry(1, 1);
    geo.index = basis.index; geo.setAttribute("position", basis.getAttribute("position")); geo.setAttribute("uv", basis.getAttribute("uv"));
    const att = (n, k) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(max * k), k); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(n, a); return a; };
    this.a = { iPos: att("iPos", 3), iGroesse: att("iGroesse", 1), iDreh: att("iDreh", 1), iFarbe: att("iFarbe", 3), iAlpha: att("iAlpha", 1), iLicht: att("iLicht", 1), iBild: att("iBild", 1) };
    geo.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: PUFF_V, fragmentShader: PUFF_F, transparent: true, depthWrite: false, fog: nebel,
      blending: additiv ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { atlas: { value: null }, schatten: { value: schatten }, additiv: { value: additiv ? 1 : 0 } }]),
    });
    this.mat.uniforms.atlas.value = puffTextur();
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = renderOrder;
    this.geo = geo;
    szene.add(this.mesh);
    this._c = new THREE.Color();
    this._v = new THREE.Vector3();
  }
  setze(liste, kamera) {
    const n = Math.min(this.max, liste.length);
    let sortiert = liste;
    if (kamera) {
      const m = kamera.matrixWorldInverse;
      sortiert = liste.map((p) => { this._v.set(p.p[0], p.p[1], p.p[2]).applyMatrix4(m); return [this._v.z, p]; }).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    }
    const A = this.a;
    for (let i = 0; i < n; i++) {
      const p = sortiert[i];
      A.iPos.array.set(p.p, i * 3);
      A.iGroesse.array[i] = p.r * 2;
      A.iDreh.array[i] = p.dreh || 0;
      const c = Array.isArray(p.farbe) ? p.farbe : this._c.copy(farbe(p.farbe ?? "#BFB6AA")).toArray();
      A.iFarbe.array.set(c, i * 3);
      A.iAlpha.array[i] = p.a ?? 1;
      A.iLicht.array[i] = p.licht ?? 0.8;
      A.iBild.array[i] = p.bild ?? 0;
    }
    for (const k of Object.keys(A)) A[k].needsUpdate = true;
    this.geo.instanceCount = n;
    return this;
  }
}

/** Haufenwolken: Gruppen aus 5–9 Puffs, die mit dem Wind treiben. Gibt f(t) → Puff-Liste. */
export function wolkenFeld({ anzahl = 8, bereich = { x: [-600, 600], z: [-1400, -500] }, hoehe = [220, 320], groesse = 60, farbe: f = "#F4F2EE", a = 0.9, wind = [1.2, 0], seed = 7 } = {}) {
  const c = farbe(f).toArray();
  const wolken = [];
  for (let w = 0; w < anzahl; w++) {
    const cx = rndBereich(w, seed, ...bereich.x), cz = rndBereich(w, seed + 1, ...bereich.z), cy = rndBereich(w, seed + 2, ...hoehe);
    const g = groesse * rndBereich(w, seed + 3, 0.6, 1.3);
    const n = 7 + Math.floor(rnd(w, seed + 4) * 6);
    for (let k = 0; k < n; k++) {
      const i = w * 32 + k;
      // flache Unterseite, Türmchen oben in der Mitte (Haufenwolke)
      const ux = (rnd(i, seed + 5) - 0.5) * 3.2, uz = (rnd(i, seed + 7) - 0.5) * 1.6;
      const uy = rnd(i, seed + 6) * 0.7 * (1 - Math.min(1, Math.abs(ux) / 1.8));
      wolken.push({ x: cx + ux * g, y: cy + uy * g * 0.6, z: cz + uz * g, r: g * rndBereich(i, seed + 8, 0.5, 0.85) * (1 - Math.abs(ux) * 0.15), dreh: rnd(i, seed + 9) * 6.28, bild: Math.floor(rnd(i, seed + 10) * 4) });
    }
  }
  return (t) => wolken.map((w) => ({ p: [w.x + wind[0] * t, w.y, w.z + wind[1] * t], r: w.r, dreh: w.dreh, farbe: c, a, licht: 1, bild: w.bild }));
}

/**
 * Rauch- bzw. Aschesäule, auf Wunsch mit Schirm (Pilzkopf). Die Säule wächst mit hoeheBei(τ) (Standard: hoehe · (1 − e^(−3τ/dauer)));
 * jeder Puff entsteht, sobald die Spitze seine Höhe erreicht, quillt dann auf und treibt mit dem Wind. Damit stimmt die sichtbare Höhe
 * mit der Messwert-Anzeige überein (gleiche Funktion übergeben). Der Schirm breitet sich ab Erreichen von 85 % der Höhe aus.
 * basis [x,y,z], t0 Beginn, breite m (Schlot), aufweitung (Breite oben / unten), kopf m (Endradius des Schirms, 0 = keiner), kopfDauer s.
 */
export function rauchSaeule({ basis = [0, 0, 0], t0 = 0, dauer = 20, hoehe = 1000, hoeheBei = null, breite = 120, aufweitung = 2.4, kopf = 0, kopfDauer = 25, anzahl = 200,
  farbeUnten = "#3E3935", farbeOben = "#8C857E", a = 0.95, wind = [0, 0], seed = 11, quellung = 1 } = {}) {
  const b = V3(basis), cu = farbe(farbeUnten), co = farbe(farbeOben);
  const Hf = hoeheBei || ((tau) => hoehe * (1 - Math.exp((-3 * tau) / dauer)));
  const wann = (y) => { let lo = 0, hi = dauer * 20; if (Hf(hi) < y) return Infinity; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (Hf(m) < y) lo = m; else hi = m; } return hi; };
  const hS = kopf > 0 ? hoehe * 0.85 : hoehe;
  const tauK = kopf > 0 ? wann(hS * 0.98) : Infinity;
  const P = [];
  for (let i = 0; i < anzahl; i++) {
    const imKopf = kopf > 0 && rnd(i, seed) < 0.35;
    const w = rnd(i, seed + 1) * Math.PI * 2;
    if (imKopf) {
      const u = Math.sqrt(rnd(i, seed + 2));
      P.push({ kopf: true, w, u, y: hS + (rnd(i, seed + 3) - 0.3) * kopf * 0.12, r: kopf * rndBereich(i, seed + 4, 0.16, 0.26), geburt: tauK + u * 2, dreh: rnd(i, seed + 6) * 6.28, bild: Math.floor(rnd(i, seed + 8) * 4), k: i });
    } else {
      const s = rnd(i, seed + 2);
      const y = s * hS, br = breite * (1 + (aufweitung - 1) * s);
      const rr = br * 0.42 * Math.sqrt(rnd(i, seed + 3));
      P.push({ kopf: false, x: Math.cos(w) * rr, z: Math.sin(w) * rr, y, s, r: br * rndBereich(i, seed + 4, 0.42, 0.66), geburt: wann(y), dreh: rnd(i, seed + 6) * 6.28, bild: Math.floor(rnd(i, seed + 8) * 4), k: i });
    }
  }
  return (t) => {
    const out = [], tau0 = t - t0;
    if (tau0 < 0) return out;
    const spitze = Hf(tau0);
    for (const p of P) {
      const tau = tau0 - p.geburt;
      if (tau < 0) continue;
      const quell = (0.45 + 0.55 * ease.outCubic(clamp(tau / 5))) * (1 + quellung * 0.12 * Math.log1p(tau * 0.15));
      const wob = rauschen(t * 0.1 + p.k, seed) * p.r * 0.12;
      let x, y, z, r = p.r * quell;
      if (p.kopf) {
        const f = ease.outCubic(clamp(tau / kopfDauer));
        const rr = kopf * p.u * f;
        x = Math.cos(p.w) * rr; z = Math.sin(p.w) * rr * 0.85; y = p.y - (p.u * f) ** 2 * kopf * 0.08;
        r *= 0.5 + 0.5 * f;
      } else {
        const vorn = smoothstep(spitze * 0.82, spitze, p.y) * 0.35;   // Kopf des Aufwinds: größer und heller
        x = p.x; z = p.z; y = p.y + tau * 4; r *= 1 + vorn;
      }
      const hoch = clamp(y / hoehe);
      x += wind[0] * Math.max(0, tau) * hoch + wob; z += wind[1] * Math.max(0, tau) * hoch;
      const c = cu.clone().lerp(co, hoch).toArray();
      out.push({ p: [b.x + x, b.y + y, b.z + z], r, dreh: p.dreh + t * 0.02, farbe: c, a: a * smoothstep(0, 0.8, tau), licht: 0.9, bild: p.bild });
    }
    return out;
  };
}

/**
 * Druck- bzw. Staubwand: eine rollende Front aus Staubballen, die auf die Kamera zuläuft (Referenzen: Staubwand 55–60 s, Weißblende).
 * ziel [x,z] = Kamerastandort am Boden, richtung [dx,dz] = Laufrichtung der Front (zeigt auf die Kamera), start m Entfernung bei t0,
 * ankunft = Zeit, zu der die Front die Kamera erreicht. breite, hoehe m. Gibt { puffs(t), entfernung(t), vorKamera(t) 0..1 }.
 */
export function staubWand({ ziel = [0, 0], boden = 0, richtung = [0, 1], start = 3000, t0 = 0, ankunft = 10, breite = 4000, hoehe = 260, anzahl = 260, farbe: f = "#B9A58C", farbeSchatten = "#6E6152", a = 1, seed = 23, rollen = 1 } = {}) {
  const d = new THREE.Vector2(...richtung).normalize();
  const quer = new THREE.Vector2(-d.y, d.x);
  const cl = farbe(f), cs = farbe(farbeSchatten);
  const entfernung = (t) => start * (1 - fortschritt(t, t0, ankunft));
  const P = [];
  for (let i = 0; i < anzahl; i++) {
    const u = (rnd(i, seed) - 0.5) * breite;
    const v = Math.pow(rnd(i, seed + 1), 1.3);
    const tiefe = rnd(i, seed + 2) * hoehe * 1.2;
    P.push({ u, v, tiefe, r: hoehe * rndBereich(i, seed + 3, 0.34, 0.6) * (1.15 - v * 0.4), ph: rnd(i, seed + 4) * 6.28, bild: Math.floor(rnd(i, seed + 5) * 4), k: i });
  }
  const puffs = (t) => {
    if (t < t0) return [];
    const e = entfernung(t);
    const out = [];
    for (const p of P) {
      // Rollen: Ballen kreisen um eine waagrechte Achse entlang der Front
      const w = p.ph + t * 0.35 * rollen;
      const roll = Math.sin(w) * hoehe * 0.12;
      const vorn = e + p.tiefe + Math.cos(w) * hoehe * 0.1 + Math.sin(p.u * 0.004 + t * 0.4) * hoehe * 0.15;
      if (vorn < -hoehe * 0.6) continue;
      const y = boden + p.v * hoehe * (0.75 + 0.25 * Math.sin(p.u * 0.002 + p.k)) + roll + p.r * 0.4;
      const x = ziel[0] - d.x * vorn + quer.x * p.u;
      const z = ziel[1] - d.y * vorn + quer.y * p.u;
      const hell = clamp(0.15 + p.v * 0.8);
      out.push({ p: [x, y, z], r: p.r * (1 + 0.3 * smoothstep(800, 0, e)), dreh: p.ph + t * 0.08, farbe: cs.clone().lerp(cl, hell).toArray(), a: a * smoothstep(0, 1.2, t - t0), licht: 0.65, bild: p.bild });
    }
    return out;
  };
  /** 0 → 1, wenn die Front die Kamera erreicht bzw. überrollt (für den Schleier in kern.js) */
  const vorKamera = (t) => smoothstep(hoehe * 0.6, -hoehe * 0.1, entfernung(t)) * (t >= t0 ? 1 : 0);
  return { puffs, entfernung, vorKamera };
}

/** Feuerball/Explosion: glühender Kern (additiv, HDR) und Rauchring. Gibt { glut(t), rauch(t) } als Puff-Listen. */
export function feuerBall({ p = [0, 0, 0], t0 = 0, radius = 200, wachsen = 2.5, glutDauer = 6, anzahl = 70, seed = 41, kern = "#FFB060", rauch = "#3E3732" } = {}) {
  const P0 = V3(p);
  const P = [];
  for (let i = 0; i < anzahl; i++) {
    const th = rnd(i, seed) * 6.283, ph = Math.acos(2 * rnd(i, seed + 1) - 1);
    const rr = Math.cbrt(rnd(i, seed + 2));
    P.push({ dx: Math.sin(ph) * Math.cos(th) * rr, dy: Math.cos(ph) * rr * 0.8, dz: Math.sin(ph) * Math.sin(th) * rr, s: rndBereich(i, seed + 3, 0.25, 0.45), bild: i % 4, dreh: rnd(i, seed + 4) * 6.28 });
  }
  const kernF = farbe(kern);
  const glut = (t) => {
    const tau = t - t0;
    if (tau < 0) return [];
    const g = ease.outCubic(clamp(tau / wachsen)), hell = Math.exp(-tau / glutDauer);
    return P.map((q, i) => ({ p: [P0.x + q.dx * radius * g, P0.y + q.dy * radius * g + tau * radius * 0.03, P0.z + q.dz * radius * g], r: radius * q.s * (0.5 + g),
      dreh: q.dreh + tau * 0.1, farbe: kernF.clone().multiplyScalar(6 * hell * (1.2 - Math.hypot(q.dx, q.dy, q.dz) * 0.7)).toArray(), a: 0.55 * smoothstep(0, 0.2, tau), licht: 0.4, bild: q.bild }));
  };
  const rauchF = farbe(rauch);
  const rauchL = (t) => {
    const tau = t - t0;
    if (tau < glutDauer * 0.25) return [];
    const g = ease.outCubic(clamp(tau / (wachsen * 3)));
    return P.map((q) => ({ p: [P0.x + q.dx * radius * (1 + g * 0.6), P0.y + q.dy * radius * (1 + g * 0.5) + tau * radius * 0.05, P0.z + q.dz * radius * (1 + g * 0.6)], r: radius * q.s * (1.3 + g),
      dreh: q.dreh, farbe: rauchF.toArray(), a: 0.85 * smoothstep(glutDauer * 0.25, glutDauer * 0.8, tau), licht: 0.9, bild: (q.bild + 1) % 4 }));
  };
  return { glut, rauch: rauchL };
}

/**
 * Strahl aus Puffs mit Wurfbahn: Gischt (weiß, kurzlebig), Dampf (steigt), aufgewirbelter Staub (Boden). Gibt f(t) → Puff-Liste.
 * rate Puffs/s zwischen von und bis, leben s, tempo m/s entlang richtung (± streuung rad), schwerkraft m/s², wachsen (Radius-Faktor über das Leben).
 */
export function puffStrahl({ ursprung = [0, 0, 0], breite = 0, richtung = [0, 1, 0], streuung = 0.4, tempo = 10, schwerkraft = 0, von = 0, bis = 10, rate = 20, leben = 3, r = 4, wachsen = 2.5, farbe: f = "#F2F4F5", a = 0.8, seed = 51, licht = 0.7 } = {}) {
  const o = V3(ursprung), dir = V3(richtung).normalize(), c = farbe(f).toArray();
  const quer = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  const n = Math.ceil((bis - von) * rate);
  return (t) => {
    const out = [];
    const i0 = Math.max(0, Math.floor((t - leben - von) * rate)), i1 = Math.min(n - 1, Math.floor((t - von) * rate));
    for (let i = i0; i <= i1; i++) {
      const tb = von + i / rate, tau = t - tb;
      if (tau < 0 || tau > leben) continue;
      const ax = (rnd(i, seed) - 0.5) * 2 * streuung, ay = (rnd(i, seed + 1) - 0.5) * 2 * streuung;
      const v = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ax).add(new THREE.Vector3(0, ay, 0)).normalize().multiplyScalar(tempo * rndBereich(i, seed + 2, 0.6, 1.2));
      const s = (rnd(i, seed + 3) - 0.5) * breite;
      const p = [o.x + quer.x * s + v.x * tau, o.y + v.y * tau - 0.5 * schwerkraft * tau * tau, o.z + quer.z * s + v.z * tau];
      const k = tau / leben;
      out.push({ p, r: r * (1 + (wachsen - 1) * ease.outQuad(k)) * rndBereich(i, seed + 4, 0.7, 1.2), dreh: rnd(i, seed + 5) * 6.28 + tau * 0.3, farbe: c, a: a * smoothstep(0, 0.12, k) * (1 - smoothstep(0.55, 1, k)), licht, bild: i % 4 });
    }
    return out;
  };
}

// ---------------------------------------------------------------------------------------------- Partikel (GPU)
const TEIL_V = /* glsl */ `
attribute vec4 zufall; attribute float ende;
uniform float zeit, groesse, wirbel, fall, skalaPx, strich, deckkraft;
uniform vec3 box, zentrum, wind;
varying float vA;
void main() {
  vec3 v = wind + vec3(0.0, -fall * (0.65 + 0.7 * zufall.w), 0.0);
  vec3 p = (zufall.xyz - 0.5) * box + v * zeit;
  p += wirbel * vec3(sin(zeit * 0.71 + zufall.w * 40.0), 0.6 * sin(zeit * 0.53 + zufall.x * 31.0), cos(zeit * 0.62 + zufall.y * 23.0));
  p = mod(p - zentrum + box * 0.5, box) - box * 0.5 + zentrum;
  if (strich > 0.0) p -= normalize(v + vec3(1e-4)) * strich * ende;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float s = groesse * (0.55 + 0.9 * zufall.w) * skalaPx / max(-mv.z, 0.05);
  gl_PointSize = clamp(s, 1.0, 96.0);
  vec3 rel = abs(p - zentrum) / (box * 0.5);
  vA = deckkraft * (1.0 - smoothstep(0.75, 1.0, max(rel.x, max(rel.y, rel.z)))) * smoothstep(0.15, 0.6, -mv.z) * (strich > 0.0 ? (1.0 - ende * 0.9) : 1.0);
}`;
const TEIL_F = /* glsl */ `
uniform vec3 farbe; uniform float weich, punkt;
varying float vA;
void main() {
  float a = vA;
  if (punkt > 0.5) { float d = length(gl_PointCoord - 0.5) * 2.0; a *= pow(clamp(1.0 - d, 0.0, 1.0), weich); }
  if (a < 0.002) discard;
  gl_FragColor = vec4(farbe, a);
}`;
const TEIL_ARTEN = {
  staub: { farbe: "#CDBFAE", groesse: 0.05, fall: 0.05, wirbel: 0.6, weich: 1.6, deckkraft: 0.55, wind: [0.4, 0.05, 0] },
  asche: { farbe: "#3B3632", groesse: 0.07, fall: 0.6, wirbel: 0.5, weich: 1.0, deckkraft: 0.8, wind: [0.6, 0, 0.2] },
  schnee: { farbe: "#F4F7FA", groesse: 0.06, fall: 0.9, wirbel: 0.5, weich: 1.4, deckkraft: 0.9, wind: [0.3, 0, 0] },
  eis: { farbe: "#DDEBF5", groesse: 0.03, fall: 0.3, wirbel: 0.2, weich: 0.8, deckkraft: 0.8, wind: [1.5, 0, 0], additiv: true },
  regen: { farbe: "#C9D2DA", groesse: 0.02, fall: 9, wirbel: 0, weich: 1, deckkraft: 0.35, wind: [0.8, 0, 0], strich: 0.5 },
  funken: { farbe: "#FFB45A", groesse: 0.05, fall: -1.4, wirbel: 0.8, weich: 1.2, deckkraft: 1, wind: [0.5, 0, 0], additiv: true, hdr: 6 },
};
/**
 * GPU-Teilchen in einer Box um ein Zentrum (meist die Kamera): staub, asche, schnee, eis, regen (Striche), funken (HDR, additiv).
 * setze(t, kamera, { zentrum, deckkraft, wind, farbe }) – alles optional außer t und kamera.
 */
export class Partikel {
  constructor(szene, { art = "staub", anzahl = 1500, box = [40, 20, 40], seed = 3, ...ueber } = {}) {
    const o = { ...TEIL_ARTEN[art], ...ueber };
    this.o = o;
    const strich = o.strich || 0;
    const n = anzahl * (strich ? 2 : 1);
    const z = new Float32Array(n * 4), e = new Float32Array(n), pos = new Float32Array(n * 3);
    for (let i = 0; i < anzahl; i++) for (let k = 0; k < (strich ? 2 : 1); k++) {
      const j = strich ? i * 2 + k : i;
      for (let c = 0; c < 4; c++) z[j * 4 + c] = hash(i * 4 + c, seed);
      e[j] = k;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("zufall", new THREE.BufferAttribute(z, 4));
    geo.setAttribute("ende", new THREE.BufferAttribute(e, 1));
    const c = farbe(o.farbe).multiplyScalar(o.hdr || 1);
    this.u = {
      zeit: { value: 0 }, groesse: { value: o.groesse }, wirbel: { value: o.wirbel }, fall: { value: o.fall }, skalaPx: { value: 1000 }, strich: { value: strich },
      deckkraft: { value: o.deckkraft }, box: { value: new THREE.Vector3(...box) }, zentrum: { value: new THREE.Vector3() }, wind: { value: new THREE.Vector3(...o.wind) },
      farbe: { value: c }, weich: { value: o.weich }, punkt: { value: strich ? 0 : 1 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: TEIL_V, fragmentShader: TEIL_F, uniforms: this.u, transparent: true, depthWrite: false, blending: o.additiv ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.obj = strich ? new THREE.LineSegments(geo, mat) : new THREE.Points(geo, mat);
    this.obj.frustumCulled = false;
    this.obj.renderOrder = 20;
    szene.add(this.obj);
  }
  setze(t, kamera, { zentrum, deckkraft, wind, farbe: f, groesse } = {}) {
    const u = this.u;
    u.zeit.value = t;
    u.zentrum.value.copy(zentrum ? V3(zentrum) : kamera.position);
    if (deckkraft !== undefined) u.deckkraft.value = deckkraft;
    if (wind) u.wind.value.set(...wind);
    if (f) u.farbe.value.copy(farbe(f)).multiplyScalar(this.o.hdr || 1);
    if (groesse !== undefined) u.groesse.value = groesse;
    u.skalaPx.value = 1920 / (2 * Math.tan(THREE.MathUtils.degToRad(kamera.fov) / 2));
    this.obj.visible = u.deckkraft.value > 0.001;
    return this;
  }
}

// ---------------------------------------------------------------------------------------------- Trümmer
function truemmerGeometrie(form) {
  if (form === "brett") return new THREE.BoxGeometry(1.6, 0.06, 0.3);
  if (form === "ziegel") return new THREE.BoxGeometry(0.4, 0.05, 0.3);
  if (form === "platte") return new THREE.BoxGeometry(1.2, 0.12, 0.9);
  if (form === "ast") return new THREE.CylinderGeometry(0.05, 0.08, 2.2, 5);
  const g = new THREE.IcosahedronGeometry(0.5, 0);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (1 + 0.3 * hash(i, 5)), p.getY(i) * (0.7 + 0.3 * hash(i, 6)), p.getZ(i) * (1 + 0.3 * hash(i, 7)));
  g.computeVertexNormals();
  return g;
}
/**
 * Trümmer als Instanzen. wurf({ t0, ursprung, streuung, richtung (m/s), tempoStreuung (0..1), wind, luft (Widerstand 1/s), boden, anzahl })
 * verteilt die nächsten freien Teile auf einen Wurf. ruhend: true → Teile liegen vor t0 sichtbar am Ursprung (z. B. Dachziegel).
 */
export class Truemmer {
  constructor(szene, { anzahl = 200, form = "brocken", farben = ["#6B5E52", "#8A7B6B", "#4E453D"], groesse = [0.3, 1.2], seed = 61, rauheit = 0.9 } = {}) {
    this.mesh = new THREE.InstancedMesh(truemmerGeometrie(form), new THREE.MeshStandardMaterial({ roughness: rauheit, metalness: 0, flatShading: true }), anzahl);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    const c = new THREE.Color();
    for (let i = 0; i < anzahl; i++) { c.set(farben[Math.floor(hash(i, seed) * farben.length)]); this.mesh.setColorAt(i, c); }
    this.anzahl = anzahl; this.seed = seed; this.groesse = groesse;
    this.teile = [];
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._a = new THREE.Vector3();
    szene.add(this.mesh);
  }
  wurf({ t0 = 0, ursprung = [0, 0, 0], streuung = [5, 2, 5], richtung = [0, 10, 0], tempoStreuung = 0.5, wind = [0, 0, 0], luft = 0.6, boden = -Infinity, anzahl = 50, ruhend = false, drehung = 6 } = {}) {
    const s = this.seed + this.teile.length * 7;
    for (let k = 0; k < anzahl && this.teile.length < this.anzahl; k++) {
      const i = this.teile.length;
      const p0 = V3(ursprung).add(new THREE.Vector3((hash(i, s) - 0.5) * 2 * streuung[0], (hash(i, s + 1) - 0.5) * 2 * streuung[1], (hash(i, s + 2) - 0.5) * 2 * streuung[2]));
      const v0 = V3(richtung).multiplyScalar(1 + (hash(i, s + 3) - 0.5) * 2 * tempoStreuung).add(new THREE.Vector3((hash(i, s + 4) - 0.5), (hash(i, s + 5) - 0.5), (hash(i, s + 6) - 0.5)).multiplyScalar(V3(richtung).length() * tempoStreuung));
      const achse = new THREE.Vector3(hash(i, s + 7) - 0.5, hash(i, s + 8) - 0.5, hash(i, s + 9) - 0.5).normalize();
      this.teile.push({ t0: t0 + hash(i, s + 10) * 0.25, p0, v0, achse, w: (0.5 + hash(i, s + 11)) * drehung, gr: lerp(this.groesse[0], this.groesse[1], hash(i, s + 12) ** 2), wind: V3(wind), luft, boden, ruhend, dreh0: hash(i, s + 13) * 6.28 });
    }
    return this;
  }
  setze(t) {
    const g = new THREE.Vector3(0, -9.81, 0);
    for (let i = 0; i < this.anzahl; i++) {
      const q = this.teile[i];
      if (!q || (t < q.t0 && !q.ruhend)) { this._m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this._m); continue; }
      const tau = Math.max(0, t - q.t0), k = q.luft;
      // v(τ) = vt + (v0 − vt)·e^(−kτ),  vt = wind + g/k  (Endgeschwindigkeit mit Luftwiderstand)
      const vt = q.wind.clone().addScaledVector(g, 1 / k);
      const f = (1 - Math.exp(-k * tau)) / k;
      this._p.copy(q.p0).addScaledVector(vt, tau).addScaledVector(q.v0.clone().sub(vt), f);
      let w = q.dreh0 + q.w * tau;
      if (this._p.y < q.boden) { this._p.y = q.boden + q.gr * 0.15; w = q.dreh0 + q.w * Math.min(tau, 0.8); }
      this._q.setFromAxisAngle(q.achse, w);
      this._s.setScalar(q.gr);
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    return this;
  }
}

// ---------------------------------------------------------------------------------------------- Statisten
function figurGeometrie() {
  // Körper (Beine, Rumpf, Arme) als ein Low-Poly-Stück, Höhe 1,0 = Schulterhöhe ≈ 1,45 m bei hoehe 1,75
  const teile = [];
  const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); teile.push(g); };
  box(0.13, 0.82, 0.16, -0.085, 0.41, 0); box(0.13, 0.82, 0.16, 0.085, 0.41, 0); // Beine
  const r = new THREE.CylinderGeometry(0.2, 0.17, 0.62, 6); r.translate(0, 1.13, 0); teile.push(r); // Rumpf
  box(0.09, 0.58, 0.11, -0.25, 1.1, 0); box(0.09, 0.58, 0.11, 0.25, 1.1, 0); // Arme
  return mergeGeos(teile);
}
function mergeGeos(geos) {
  let n = 0, ni = 0;
  for (const g of geos) { const gg = g.index ? g : g; n += gg.getAttribute("position").count; ni += gg.index ? gg.index.count : gg.getAttribute("position").count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), idx = [];
  let o = 0;
  for (const g of geos) {
    const p = g.getAttribute("position"), q = g.getAttribute("normal"), c = g.getAttribute("color");
    pos.set(p.array, o * 3); nor.set(q.array, o * 3);
    if (c) col.set(c.array, o * 3); else col.fill(1, o * 3, (o + p.count) * 3);
    if (g.index) for (const i of g.index.array) idx.push(i + o); else for (let i = 0; i < p.count; i++) idx.push(i + o);
    o += p.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  return geo;
}
const faerbe = (g, hex) => { const c = new THREE.Color(hex), n = g.getAttribute("position").count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.toArray(a, i * 3); g.setAttribute("color", new THREE.BufferAttribute(a, 3)); return g; };

/**
 * Menschen als Instanzen (Körper in Kleidungsfarbe, Kopf in Hautfarbe). Rollen: gehen (hin und her), stehen (leichtes Wiegen).
 * reaktion({ t0, art: "fliehen"|"stehen"|"fallen"|"hinsehen", weg: [dx,dz] (Fluchtrichtung), tempo, verzoegerung, anteil }) – deterministisch.
 */
export class Menschen {
  constructor(szene, { anzahl = 300, seed = 71, hoehe = 1.75, kleidung = ["#C4473A", "#2F5D8C", "#E8E2D6", "#3A3A3A", "#7A8B4E", "#D9A441", "#8C5A86", "#F0F0F0", "#244C3A"], haut = ["#E2B596", "#C68B67", "#8D5A3E", "#F1CBB0", "#6B4330"], schatten = true } = {}) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true, vertexColors: true });
    this.koerper = new THREE.InstancedMesh(figurGeometrie(), mat, anzahl);
    this.kopf = new THREE.InstancedMesh(faerbe(new THREE.IcosahedronGeometry(0.12, 0), "#FFFFFF"), mat, anzahl);
    for (const m of [this.koerper, this.kopf]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = schatten; m.frustumCulled = false; szene.add(m); }
    const c = new THREE.Color();
    for (let i = 0; i < anzahl; i++) {
      this.koerper.setColorAt(i, c.set(kleidung[Math.floor(hash(i, seed) * kleidung.length)]));
      this.kopf.setColorAt(i, c.set(haut[Math.floor(hash(i, seed + 1) * haut.length)]));
    }
    this.n = anzahl; this.seed = seed; this.skala = hoehe / 1.75;
    this.leute = []; this.reaktionen = [];
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
  }
  /** Menschen in einem Rechteck verteilen (bereich.x/z in m), boden(x,z) → y. gehen = Anteil der Gehenden, tempo m/s, weg m (Länge der Gehstrecke). */
  verteile({ anzahl = 50, bereich = { x: [-20, 20], z: [-20, 20] }, punkte = null, boden = () => 0, gehen = 0.6, tempo = [0.9, 1.5], weg = [6, 20], richtung = null } = {}) {
    for (let k = 0; k < anzahl && this.leute.length < this.n; k++) {
      const i = this.leute.length, s = this.seed + 100;
      const x = punkte ? punkte[k % punkte.length][0] : rndBereich(i, s, ...bereich.x);
      const z = punkte ? punkte[k % punkte.length][1] : rndBereich(i, s + 1, ...bereich.z);
      const w = richtung ? Math.atan2(richtung[0], richtung[1]) + (hash(i, s + 2) < 0.5 ? 0 : Math.PI) : hash(i, s + 2) * 6.283;
      this.leute.push({ x, z, w, geht: hash(i, s + 3) < gehen, v: rndBereich(i, s + 4, ...tempo), L: rndBereich(i, s + 5, ...weg), ph: hash(i, s + 6), boden, gr: rndBereich(i, s + 7, 0.92, 1.08) });
    }
    return this;
  }
  reaktion({ t0 = 0, art = "fliehen", weg = [0, 1], tempo = [3, 5.5], verzoegerung = [0, 1.5], anteil = 1 } = {}) {
    this.reaktionen.push({ t0, art, weg: new THREE.Vector2(...weg).normalize(), tempo, verzoegerung, anteil });
    return this;
  }
  /** Zustand eines Menschen bei t: Position, Blickwinkel, Kippen */
  zustand(i, t) {
    const L = this.leute[i];
    let x = L.x, z = L.z, w = L.w, bob = 0, kipp = 0, f = 1.6;
    if (L.geht) {
      const per = (2 * L.L) / L.v, ph = ((t / per + L.ph) % 1 + 1) % 1;
      const s = ph < 0.5 ? ph * 2 : 2 - ph * 2;
      x += Math.sin(L.w) * (s - 0.5) * L.L; z += Math.cos(L.w) * (s - 0.5) * L.L;
      w = ph < 0.5 ? L.w : L.w + Math.PI;
      bob = Math.abs(Math.sin(t * L.v * 3.6 + L.ph * 20)) * 0.035;
    } else {
      kipp = Math.sin(t * 0.8 + L.ph * 30) * 0.02;
    }
    for (const r of this.reaktionen) {
      if (hash(i, this.seed + 300) > r.anteil) continue;
      const tr = r.t0 + lerp(r.verzoegerung[0], r.verzoegerung[1], hash(i, this.seed + 301));
      if (t < tr) continue;
      const tau = t - tr;
      if (r.art === "fliehen") {
        const v = lerp(r.tempo[0], r.tempo[1], hash(i, this.seed + 302));
        const ab = (hash(i, this.seed + 303) - 0.5) * 0.7;
        const dx = r.weg.x * Math.cos(ab) - r.weg.y * Math.sin(ab), dz = r.weg.x * Math.sin(ab) + r.weg.y * Math.cos(ab);
        const s = v * (tau - (1 - Math.exp(-tau * 2.5)) / 2.5); // Anlaufen
        x += dx * s; z += dz * s; w = Math.atan2(dx, dz); bob = Math.abs(Math.sin(tau * v * 3.2 + L.ph * 20)) * 0.07; kipp = 0.12;
      } else if (r.art === "stehen" || r.art === "hinsehen") {
        bob = 0; if (r.art === "hinsehen") w = Math.atan2(-r.weg.x, -r.weg.y);
      } else if (r.art === "fallen") {
        kipp = ease.outCubic(clamp(tau / 0.5)) * 1.45; bob = 0;
      }
    }
    return { x, z, w, bob, kipp };
  }
  setze(t) {
    for (let i = 0; i < this.n; i++) {
      const L = this.leute[i];
      if (!L) { this._m.makeScale(0, 0, 0); this.koerper.setMatrixAt(i, this._m); this.kopf.setMatrixAt(i, this._m); continue; }
      const z = this.zustand(i, t);
      const y = L.boden(z.x, z.z) + z.bob;
      const sk = this.skala * L.gr;
      this._q.setFromEuler(this._e.set(z.kipp, z.w, 0, "YXZ"));
      this._p.set(z.x, y, z.z); this._s.setScalar(sk);
      this._m.compose(this._p, this._q, this._s); this.koerper.setMatrixAt(i, this._m);
      const kopf = new THREE.Vector3(0, 1.58, 0).applyQuaternion(this._q).multiplyScalar(sk).add(this._p);
      this._m.compose(kopf, this._q, this._s); this.kopf.setMatrixAt(i, this._m);
    }
    this.koerper.instanceMatrix.needsUpdate = true; this.kopf.instanceMatrix.needsUpdate = true;
    return this;
  }
}

function autoGeometrie() {
  const g = [];
  const box = (w, h, d, x, y, z, c) => { const b = faerbe(new THREE.BoxGeometry(w, h, d), c); b.translate(x, y, z); g.push(b); };
  box(1.8, 0.62, 4.3, 0, 0.55, 0, "#FFFFFF");          // Karosserie (Instanzfarbe)
  box(1.62, 0.5, 2.2, 0, 1.1, -0.15, "#FFFFFF");       // Dach
  box(1.64, 0.42, 2.0, 0, 1.08, -0.15, "#1C2228");     // Fensterband (dunkel)
  box(1.84, 0.26, 4.34, 0, 0.3, 0, "#2A2A2A");          // Schweller/Räder
  box(0.36, 0.12, 0.04, -0.58, 0.68, 2.16, "#FFF6E0");  // Scheinwerfer
  box(0.36, 0.12, 0.04, 0.58, 0.68, 2.16, "#FFF6E0");
  box(0.36, 0.1, 0.04, -0.6, 0.68, -2.16, "#B0201A");   // Rücklichter
  box(0.36, 0.1, 0.04, 0.6, 0.68, -2.16, "#B0201A");
  return mergeGeos(g);
}
/**
 * Autos als Instanzen auf Spuren (Polylinien). spur({ punkte: [[x,y,z],…], anzahl, tempo m/s }) verteilt Autos gleichmäßig mit Zufallsversatz;
 * sie fahren die Spur ab und beginnen danach wieder am Anfang. bremsen({ t0, dauer }) hält alle Autos weich an.
 */
export class Autos {
  constructor(szene, { anzahl = 80, seed = 81, farben = ["#B8BCC2", "#1F2A36", "#8E1F1F", "#E9E9E6", "#2E4F7A", "#5B5F63", "#C9A227", "#33503C"], schatten = true } = {}) {
    this.mesh = new THREE.InstancedMesh(autoGeometrie(), new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.15, flatShading: true, vertexColors: true }), anzahl);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.castShadow = schatten; this.mesh.frustumCulled = false;
    const c = new THREE.Color();
    for (let i = 0; i < anzahl; i++) this.mesh.setColorAt(i, c.set(farben[Math.floor(hash(i, seed) * farben.length)]));
    szene.add(this.mesh);
    this.n = anzahl; this.seed = seed; this.autos = []; this.stopp = null;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1); this._y = new THREE.Vector3(0, 1, 0);
  }
  spur({ punkte, anzahl = 10, tempo = 12 } = {}) {
    const P = punkte.map(V3), L = [0];
    for (let i = 1; i < P.length; i++) L.push(L[i - 1] + P[i].distanceTo(P[i - 1]));
    const spur = { P, L, ges: L[L.length - 1] };
    for (let k = 0; k < anzahl && this.autos.length < this.n; k++) {
      const i = this.autos.length;
      this.autos.push({ spur, s0: (k + hash(i, this.seed + 1) * 0.6) / anzahl * spur.ges, v: tempo * (0.9 + hash(i, this.seed + 2) * 0.2) });
    }
    return this;
  }
  bremsen({ t0, dauer = 2.5 } = {}) { this.stopp = { t0, dauer }; return this; }
  setze(t) {
    for (let i = 0; i < this.n; i++) {
      const a = this.autos[i];
      if (!a) { this._m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this._m); continue; }
      let s;
      if (this.stopp && t > this.stopp.t0) { const k = 3 / this.stopp.dauer, tau = t - this.stopp.t0; s = a.s0 + a.v * this.stopp.t0 + (a.v * (1 - Math.exp(-k * tau))) / k; }
      else s = a.s0 + a.v * t;
      s = ((s % a.spur.ges) + a.spur.ges) % a.spur.ges;
      const { P, L } = a.spur;
      let j = 1; while (j < L.length - 1 && L[j] < s) j++;
      const f = (s - L[j - 1]) / Math.max(1e-6, L[j] - L[j - 1]);
      this._p.lerpVectors(P[j - 1], P[j], f);
      const d = P[j].clone().sub(P[j - 1]);
      this._q.setFromAxisAngle(this._y, Math.atan2(d.x, d.z));
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    return this;
  }
}

/**
 * Vögel als dunkle V-Silhouetten mit Flügelschlag (Shader). schwarm({ zentrum, radius, hoehe, tempo, anzahl }) kreist bzw. gleitet;
 * flucht({ t0, richtung, tempo }) lässt alle Vögel schneller wegfliegen (z. B. vor dem Ereignis – Referenz A: Vögel fliehen vor dem Lichtblitz).
 */
export class Voegel {
  constructor(szene, { anzahl = 60, seed = 91, farbe: f = "#1E1E22", spannweite = 0.7 } = {}) {
    const geo = new THREE.BufferGeometry();
    const s = spannweite / 2;
    geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.12, -s, 0.02, -0.06, 0, 0, -0.08, 0, 0, 0.12, 0, 0, -0.08, s, 0.02, -0.06, 0, 0, 0.18, -0.05, 0, -0.1, 0.05, 0, -0.1], 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({ color: farbe(f), side: THREE.DoubleSide, fog: true });
    const phase = new Float32Array(anzahl);
    for (let i = 0; i < anzahl; i++) phase[i] = hash(i, seed) * 6.28;
    geo.setAttribute("iPhase", new THREE.InstancedBufferAttribute(phase, 1));
    this.zeitU = { value: 0 };
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uZeit = this.zeitU;
      sh.vertexShader = "attribute float iPhase;\nuniform float uZeit;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.y += sin(uZeit * 13.0 + iPhase) * abs(position.x) * 0.9;");
    };
    this.mesh = new THREE.InstancedMesh(geo, mat, anzahl);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false;
    szene.add(this.mesh);
    this.n = anzahl; this.seed = seed; this.voegel = []; this.fluchtE = null;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(1, 1, 1); this._y = new THREE.Vector3(0, 1, 0);
  }
  schwarm({ zentrum = [0, 40, -100], radius = 40, hoehe = 8, tempo = 9, anzahl = 12, skala = 1 } = {}) {
    for (let k = 0; k < anzahl && this.voegel.length < this.n; k++) {
      const i = this.voegel.length;
      this.voegel.push({ c: V3(zentrum), R: radius * (0.6 + hash(i, this.seed + 1) * 0.6), h: (hash(i, this.seed + 2) - 0.5) * hoehe, w0: hash(i, this.seed + 3) * 6.28, om: (tempo / radius) * (hash(i, this.seed + 4) < 0.5 ? 1 : -1) * (0.8 + hash(i, this.seed + 5) * 0.4), sk: skala * (0.8 + hash(i, this.seed + 6) * 0.4) });
    }
    return this;
  }
  flucht({ t0, richtung = [1, 0.3, 0], tempo = 18 } = {}) { this.fluchtE = { t0, d: V3(richtung).normalize(), tempo }; return this; }
  setze(t) {
    this.zeitU.value = t;
    for (let i = 0; i < this.n; i++) {
      const v = this.voegel[i];
      if (!v) { this._m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this._m); continue; }
      const w = v.w0 + v.om * t;
      const p = new THREE.Vector3(v.c.x + Math.cos(w) * v.R, v.c.y + v.h + Math.sin(t * 0.4 + v.w0) * 1.5, v.c.z + Math.sin(w) * v.R);
      let blick = Math.atan2(-Math.sin(w) * Math.sign(v.om), Math.cos(w) * Math.sign(v.om));
      if (this.fluchtE && t > this.fluchtE.t0) {
        const tau = t - this.fluchtE.t0 - hash(i, this.seed + 7) * 0.8;
        if (tau > 0) { p.addScaledVector(this.fluchtE.d, this.fluchtE.tempo * tau * (0.8 + hash(i, this.seed + 8) * 0.5)); blick = Math.atan2(this.fluchtE.d.x, this.fluchtE.d.z); }
      }
      this._q.setFromAxisAngle(this._y, blick);
      this._s.setScalar(v.sk);
      this._m.compose(p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    return this;
  }
}

// ---------------------------------------------------------------------------------------------- Vordergrund
const VG_FARBEN = { holz: ["#6A4130", "#4B2D21"], metall: ["#7D838A", "#5B6067"], beton: ["#C8B9A3", "#9E8F7B"], glas: ["#8E969C", "#5B6067"], fenster: ["#E9E4DA", "#B9B2A6"] };
/**
 * Vordergrund-Element fest vor der Kamera (Referenzen: Holzgeländer A, Metallgeländer S, Betonbrüstung T, Kreuzungsgeländer E).
 * pos = Augenpunkt [x,y,z], ziel = Blickziel, abstand m bis zur Vorderkante, augenhoehe über Standfläche, hoehe = Geländerhöhe,
 * pfosten = x-Lagen der Pfosten, staebe = Abstand senkrechter Stäbe in m (0 = keine; metall/glas).
 * Gibt die Gruppe zurück (für Erschütterung bzw. Kippen bleibt sie in der Welt stehen, die Kamera bewegt sich).
 */
export function vordergrund(szene, { art = "holz", pos = [0, 1.6, 0], ziel = [0, 1.4, -10], abstand = 0.85, breite = 4, augenhoehe = 1.6, hoehe = 1.05, pfosten = [-0.62], staebe = 0, farben = null, boden = false } = {}) {
  const [f1, f2] = farben || VG_FARBEN[art];
  const g = new THREE.Group();
  const m1 = new THREE.MeshStandardMaterial({ color: f1, roughness: 0.8, flatShading: true });
  const m2 = new THREE.MeshStandardMaterial({ color: f2, roughness: 0.85, flatShading: true });
  const box = (w, h, d, x, y, z, m = m1) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; g.add(b); return b; };
  const zyl = (r, l, x, y, z, rotZ, m = m1) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 10), m); b.position.set(x, y, z); b.rotation.z = rotZ; b.castShadow = true; g.add(b); return b; };
  const z = -abstand;
  if (art === "holz") {
    box(breite, 0.13, 0.13, 0, hoehe, z);                 // Handlauf
    box(breite, 0.09, 0.1, 0, 0.16, z, m2);                // unterer Riegel
    for (const x of pfosten) box(0.14, hoehe + 0.08, 0.14, x, (hoehe + 0.08) / 2, z + 0.02, m2);
    for (let x = -breite / 2; x < breite / 2; x += 1.4) { // Andreaskreuze
      const d = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(1.4, hoehe - 0.2), 0.07, 0.06), m2);
      d.position.set(x + 0.7, (hoehe + 0.16) / 2, z + 0.03); d.rotation.z = Math.atan2(hoehe - 0.2, 1.4); g.add(d);
      const e = d.clone(); e.rotation.z = -d.rotation.z; g.add(e);
    }
  } else if (art === "metall" || art === "glas") {
    zyl(0.045, breite, 0, hoehe, z, Math.PI / 2);
    zyl(0.02, breite, 0, hoehe * 0.55, z, Math.PI / 2, m2);
    zyl(0.02, breite, 0, hoehe * 0.15, z, Math.PI / 2, m2);
    for (const x of pfosten) zyl(0.035, hoehe, x, hoehe / 2, z, 0, m2);
    if (staebe > 0) { // senkrechte Stäbe (Balustrade)
      const n = Math.floor(breite / staebe), st = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.011, 0.011, hoehe * 0.85, 6), m2, n), mm = new THREE.Matrix4();
      for (let i = 0; i < n; i++) { mm.makeTranslation(-breite / 2 + (i + 0.5) * staebe, hoehe * 0.15 + hoehe * 0.425, z); st.setMatrixAt(i, mm); }
      st.castShadow = true; g.add(st);
    }
    if (art === "glas") { const p = new THREE.Mesh(new THREE.PlaneGeometry(breite, hoehe * 0.85), new THREE.MeshStandardMaterial({ color: "#B9D2D8", transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false })); p.position.set(0, hoehe * 0.48, z + 0.01); g.add(p); }
  } else if (art === "beton") {
    box(breite, hoehe, 0.25, 0, hoehe / 2, z - 0.1, m2);
    box(breite + 0.1, 0.08, 0.36, 0, hoehe + 0.04, z - 0.1);
  } else if (art === "fenster") { // Fensterrahmen: Laibung links/rechts/oben, Brüstung unten, Mittelpfosten
    const h = 2.4;
    box(0.18, h, 0.2, -breite / 2, h / 2, z); box(0.18, h, 0.2, breite / 2, h / 2, z);
    box(breite + 0.18, 0.18, 0.2, 0, h, z); box(breite + 0.18, 0.16, 0.32, 0, hoehe, z + 0.05, m2);
    box(0.08, h - hoehe, 0.12, 0, (h + hoehe) / 2, z);
  }
  if (boden) { const b = box(breite, 0.05, abstand + 1.5, 0, -0.025, z + (abstand + 1.5) / 2 - 0.05, m2); b.receiveShadow = true; }
  // in die Welt setzen: Ursprung = Standfläche unter dem Auge, -z = Blickrichtung
  const p = V3(pos), zi = V3(ziel);
  g.position.set(p.x, p.y - augenhoehe, p.z);
  g.rotation.y = Math.atan2(-(zi.x - p.x), -(zi.z - p.z));
  szene.add(g);
  return g;
}

// ---------------------------------------------------------------------------------------------- Kamera
/**
 * Feste Ich-Perspektive (Referenzen, gemessen mit Phasenkorrelation 720 × 1280):
 *  - Ruhe: praktisch starr (≈ 0,02 px/Bild), Drift ≤ 3 px in 4 s → atmen() Standard 0,04° bei 0,1–0,3 Hz.
 *  - Langsame Schwenks, um dem Ereignis zu folgen (T, E: 25–100 px/s ≈ 1–4°/s) → blick([{t, ziel}]).
 *  - Beben vor und beim Höhepunkt: 4–4,5 Hz senkrecht, 3–6 Hz waagrecht, 0,5–4 px Standardabweichung ≈ 0,05–0,3° → beben(), stoss().
 *  - Höhepunkt: Kamera wird umgeworfen (Rollen 10–20°, Nicken, Absinken) und liegt danach still → kippen().
 */
export class PovKamera {
  constructor(kamera, { pos = [0, 1.6, 0], ziel = [0, 1.4, -10], fov = 52 } = {}) {
    this.k = kamera; this.fov = fov;
    this.posKeys = [{ t: 0, v: [...pos] }]; this.zielKeys = [{ t: 0, v: [...ziel] }];
    this.atmenS = 1; this.bebenL = []; this.stoesse = []; this.kippE = null;
    this._z = new THREE.Vector3();
  }
  /** Blick-Schwenks: [{t, ziel:[x,y,z], e?}] (e = Easing des Stücks bis zu diesem Key) */
  blick(keys) { this.zielKeys = [this.zielKeys[0], ...keys.map((k) => ({ t: k.t, v: k.ziel, e: k.e || ease.inOutSine }))]; return this; }
  bewegung(keys) { this.posKeys = [this.posKeys[0], ...keys.map((k) => ({ t: k.t, v: k.pos, e: k.e || ease.inOutSine }))]; return this; }
  atmen({ staerke = 1 } = {}) { this.atmenS = staerke; return this; }
  /** Anhaltendes Beben (Grollen) zwischen von und bis, staerke in Grad (Referenz: 0,05–0,3°) */
  beben({ von, bis, staerke = 0.12, frequenz = 4.4, anstieg = 2, abkling = 0.8 } = {}) { this.bebenL.push({ von, bis, staerke, frequenz, anstieg, abkling }); return this; }
  /** Einzelner Stoß (Einschlag, Druckwelle), staerke in Grad, klingt exponentiell ab */
  stoss({ t, staerke = 0.8, frequenz = 4.6, abkling = 1.4 } = {}) { this.stoesse.push({ t, staerke, frequenz, abkling }); return this; }
  /** Umgeworfen: in dauer s auf roll/nick Grad, Absinken fall m, seitlich seit m; danach still */
  kippen({ t, dauer = 0.7, roll = 14, nick = -10, fall = 0.9, seit = 0.3 } = {}) { this.kippE = { t, dauer, roll, nick, fall, seit }; return this; }
  zustand(t) {
    const pos = keyframes(this.posKeys, t), ziel = keyframes(this.zielKeys, t);
    let yaw = 0, pitch = 0, roll = 0;
    const a = this.atmenS;
    yaw += (rauschen(t * 0.17, 3) * 0.035 + Math.sin(t * 0.61) * 0.012) * a;
    pitch += (rauschen(t * 0.21, 4) * 0.03 + Math.sin(t * 0.83 + 1) * 0.01) * a;
    roll += rauschen(t * 0.13, 5) * 0.02 * a;
    const zitter = (f, s, seed) => Math.sin(2 * Math.PI * f * t + seed) * 0.6 + Math.sin(2 * Math.PI * f * 1.37 * t + seed * 2.1) * 0.3 + rauschen(t * f * 2.2, seed) * 0.35;
    for (const b of this.bebenL) {
      if (t < b.von - 0.01 || t > b.bis + b.abkling * 3) continue;
      const amp = b.staerke * smoothstep(b.von, b.von + b.anstieg, t) * (t > b.bis ? Math.exp(-(t - b.bis) / b.abkling) : 1);
      pitch += zitter(b.frequenz, amp, 11) * amp; yaw += zitter(b.frequenz * 0.8, amp, 17) * amp * 0.8; roll += zitter(b.frequenz * 1.1, amp, 23) * amp * 0.5;
    }
    for (const s of this.stoesse) {
      if (t < s.t) continue;
      const amp = s.staerke * Math.exp(-(t - s.t) / s.abkling * 2.2) * smoothstep(0, 0.04, t - s.t);
      pitch += zitter(s.frequenz, amp, 31) * amp; yaw += zitter(s.frequenz * 0.85, amp, 37) * amp * 0.7; roll += zitter(s.frequenz * 1.2, amp, 41) * amp * 0.6;
    }
    let p = [...pos];
    if (this.kippE && t > this.kippE.t) {
      const K = this.kippE, x = clamp((t - K.t) / K.dauer);
      const f = x < 1 ? ease.outCubic(x) + Math.sin(x * Math.PI) * 0.08 : 1; // kurzes Nachfedern
      roll += K.roll * f; pitch += K.nick * f;
      p = [p[0] + K.seit * f, p[1] - K.fall * ease.inQuad(x), p[2]];
    }
    return { pos: p, ziel, yaw, pitch, roll };
  }
  anwenden(t) {
    const z = this.zustand(t), k = this.k;
    k.position.set(...z.pos);
    k.up.set(0, 1, 0);
    k.lookAt(this._z.set(...z.ziel));
    const D = THREE.MathUtils.degToRad;
    k.rotateY(D(z.yaw)); k.rotateX(D(z.pitch)); k.rotateZ(D(z.roll));
    k.fov = this.fov; k.updateProjectionMatrix(); k.updateMatrixWorld();
    return z;
  }
  ereignisse() {
    const e = [];
    for (const s of this.stoesse) e.push({ t: s.t, typ: "kamera", art: "stoss", staerke: s.staerke, quelle: "PovKamera", klang: false });
    for (const b of this.bebenL) e.push({ t: b.von, typ: "kamera", art: "beben", dauer: b.bis - b.von, quelle: "PovKamera", klang: false });
    if (this.kippE) e.push({ t: this.kippE.t, typ: "kamera", art: "kippen", dauer: this.kippE.dauer, quelle: "PovKamera", klang: false });
    return e;
  }
}

// ---------------------------------------------------------------------------------------------- Farbstimmung je Phase
/**
 * Voreinstellungen für kern.js (post), abgeleitet aus den Mittelwerten je Phase der Referenzen:
 * alltag (entsättigt, weich), grell (Aufhellen bis Weißblende), hitze (orange), staub (braun), staubwand (beige Weißblende, Kontrast fast 0),
 * wasser (dunkles Blaugrün nach dem Glasbruch), eis (kalt), nacht.
 */
export const PHASE = {
  alltag: { belichtung: 1.0, saettigung: 0.9, kontrast: 1.0, tonung: [1, 1, 1], tonungStaerke: 0, bloomStaerke: 0.85, bloomSchwelle: 1.0, schleier: [1, 1, 1], schleierStaerke: 0, unschaerfe: 0 },
  grell: { belichtung: 1.5, saettigung: 0.7, kontrast: 0.9, tonung: [1.04, 1.0, 0.95], tonungStaerke: 0.4, bloomStaerke: 1.6, bloomSchwelle: 0.75, schleier: [0.99, 0.97, 0.93], schleierStaerke: 0.25, unschaerfe: 0 },
  hitze: { belichtung: 1.12, saettigung: 1.25, kontrast: 1.04, tonung: [1.14, 0.86, 0.6], tonungStaerke: 0.65, bloomStaerke: 1.3, bloomSchwelle: 0.9, schleier: [0.86, 0.56, 0.3], schleierStaerke: 0.1, unschaerfe: 0 },
  staub: { belichtung: 0.95, saettigung: 0.72, kontrast: 0.9, tonung: [1.06, 0.93, 0.78], tonungStaerke: 0.55, bloomStaerke: 0.7, bloomSchwelle: 1.0, schleier: [0.72, 0.64, 0.55], schleierStaerke: 0.28, unschaerfe: 0.05 },
  staubwand: { belichtung: 1.0, saettigung: 0.6, kontrast: 0.7, tonung: [1.05, 0.95, 0.82], tonungStaerke: 0.5, bloomStaerke: 0.6, bloomSchwelle: 1.0, schleier: [0.84, 0.78, 0.7], schleierStaerke: 0.85, unschaerfe: 0.6 },
  wasser: { belichtung: 0.55, saettigung: 0.65, kontrast: 1.05, tonung: [0.55, 0.9, 0.88], tonungStaerke: 0.8, bloomStaerke: 0.6, bloomSchwelle: 1.0, schleier: [0.05, 0.15, 0.15], schleierStaerke: 0.4, unschaerfe: 0.25 },
  eis: { belichtung: 1.05, saettigung: 0.7, kontrast: 1.0, tonung: [0.86, 0.96, 1.14], tonungStaerke: 0.55, bloomStaerke: 1.0, bloomSchwelle: 0.9, schleier: [0.88, 0.93, 0.97], schleierStaerke: 0.1, unschaerfe: 0 },
  nacht: { belichtung: 0.6, saettigung: 0.75, kontrast: 1.08, tonung: [0.8, 0.88, 1.12], tonungStaerke: 0.6, bloomStaerke: 1.2, bloomSchwelle: 0.8, schleier: [0.02, 0.03, 0.06], schleierStaerke: 0.1, unschaerfe: 0 },
};
/** Farbstimmung über die Zeit: farbPhasen([{t:0, phase:"alltag"}, {t:30, phase:"grell", e}, {t:40, werte:{…}}]) → f(t) → post-Werte für kern.js */
export function farbPhasen(keys) {
  const K = keys.map((k) => ({ t: k.t, e: k.e || ease.inOutSine, w: { ...PHASE.alltag, ...(k.phase ? PHASE[k.phase] : {}), ...(k.werte || {}) } }));
  const felder = Object.keys(PHASE.alltag);
  return (t) => {
    const o = {};
    for (const f of felder) o[f] = keyframes(K.map((k) => ({ t: k.t, v: k.w[f], e: k.e })), t);
    return o;
  };
}

// ---------------------------------------------------------------------------------------------- Ereignis-Protokoll
/**
 * Ereignis-Protokoll der Effekte. effekt() meldet {typ:"effekt", name, klang}: atmo.py legt den passenden Klang an genau diese Stelle,
 * qc/referenz_pov.py prüft, dass nur erlaubte Typen vorkommen (keine Chips, Sticker, Karaoke …).
 * Klangnamen (atmo.py): blitz, einschlag, druckwelle, grollen, donner, glas, truemmer, gischt, feuer, zischen, wind, stille, tinnitus.
 */
export class Protokoll {
  constructor() { this.liste = []; }
  melde(e) { this.liste.push({ quelle: "lunar", ...e }); return this; }
  effekt(t, name, { dauer = 0, staerke = 1, klang = name, text } = {}) { return this.melde({ t, typ: "effekt", name, dauer, staerke, klang, ...(text ? { text } : {}) }); }
  alle(...weitere) { return [...this.liste, ...weitere.flat()].sort((a, b) => a.t - b.t); }
}
