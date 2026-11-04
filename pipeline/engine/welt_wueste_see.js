// Grundwelt „Wüste → Seeufer → Wüste“ (Account 2 @stelldirvor.pov, Weltenkatalog „Wüste und Dünen“, .claude/skills/stelldirvor-video/themen-und-plan.md §2)
// Erstbau 04.11.2026 („Was wäre, wenn du 16.000 Jahre auf einer Sahara-Düne stehst?“, Afrikanische Feuchtzeit, Megatschad). NUR für den Baukasten Lunar-POV.
//
// Inhalt: Dünenkamm (Standpunkt), Hang hinab in ein flaches Becken, das sich zum See füllt (Pegel steuerbar), eine Landzunge 90 m voraus
// (Savanne mit Giraffen und Antilopen), Felsblock mit Ritzbild (Giraffe) am Ufer, Gras, Akazien, Schilf, Flusspferde, Krokodile, Menschen am Fels,
// weißer Seegrund (Kieselgur) nach dem Austrocknen, Sand, der zurück ins Becken wandert. Ferne Bergkette (Tibesti-ähnlich) im Dunst.
// Steuerung je Bild (alles Funktion von t, kein Zustand): welt.setze(t, kamera, { pegel, gruen, gelb, nass, weiss, sandZ, sonne, himmelFarbe,
//   tiere: { giraffen, nilpferde, krokodile, antilopen, menschen }, ritzbild, felsSinkt })
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { GLSL_NOISE, windMaterial, buschel, klumpen, merge } from "./welt_feld_wald.js";

const fr = (x) => x - Math.floor(x);
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= 0.5; } return s; }
const C = (h) => new THREE.Color(h);

export const PEGEL_MAX = -2.5, PEGEL_MIN = -21;
export const FELS = [-3.5, -43];
export const KAMM = [0, 2], UFERBLICK = [0, -30];

/** Gelände: Dünenkamm bei z ≈ 0, Hang (35 %) bis z = −62, flaches Becken fällt sanft (1,2 %), Landzunge bei z = −90, Seitendünen, Berge in 3–6 km */
export function hoehe(x, z) {
  let y;
  if (z > -5) y = 12 - 0.2 * Math.max(0, z - 3);
  else if (z > -62) y = 12 - 0.35 * (-5 - z);
  else y = -7.95 - 0.012 * (-62 - z);
  y = Math.max(y, -21 - 2 * smoothstep(-1500, -2500, z));
  y += (2.2 * Math.sin(x * 0.06 + 0.7) + 1.4 * Math.sin(x * 0.13 + z * 0.05)) * smoothstep(-35, -2, z) * (1 - smoothstep(4, 30, z));
  y += 0.5 * (vn(x * 0.2, z * 0.2) - 0.5);
  const seite = smoothstep(45, 140, Math.abs(x)) * smoothstep(-400, -60, z);
  y += seite * (10 + 14 * fbm(x * 0.012, z * 0.012, 3)) * (0.6 + 0.4 * Math.sin(x * 0.03 + z * 0.02));
  y += 9 * Math.exp(-(((z + 90) / 7) ** 2)) * (1 - smoothstep(160, 320, Math.abs(x))) * (0.85 + 0.3 * vn(x * 0.03, 3));
  y += 160 * smoothstep(-2600, -5200, z) * fbm(x * 0.0011 + 5, z * 0.0011, 4) * (0.6 + 0.4 * Math.sin(x * 0.0012));
  return y;
}

function bodenMaterial(u) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.97, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vNW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvNW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vNW;
uniform float uG, uGelb, uNass, uPegel, uWeiss, uSandZ, uZeit;
${GLSL_NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  vec3 W = vNW; vec2 p = W.xz;
  vec3 Nw = normalize(cross(dFdx(W), dFdy(W))); if (Nw.y < 0.0) Nw = -Nw;
  float n1 = nN(p * 0.3), n2 = nN(p * 1.9), n3 = nF(p * 0.05);
  float rippel = sin(dot(p, vec2(0.42, 0.91)) * 2.6 + n1 * 3.0) * 0.5 + 0.5;
  vec3 sand = mix(vec3(0.74, 0.5, 0.29), vec3(0.83, 0.62, 0.38), n3) * (0.9 + 0.12 * n2 + 0.06 * rippel);
  sand *= mix(0.78, 1.0, smoothstep(0.55, 0.95, Nw.y));
  float berg = smoothstep(30.0, 120.0, W.y);
  sand = mix(sand, vec3(0.42, 0.3, 0.22) * (0.8 + 0.4 * nN(p * 0.004)), berg);
  // Becken unter der Höchstmarke: nasser Schlamm nahe dem Wasser, nach dem Austrocknen weiße Kieselgur mit Rissen
  float bett = 1.0 - smoothstep(${PEGEL_MAX.toFixed(1)} - 0.3, ${PEGEL_MAX.toFixed(1)} + 0.4, W.y);
  vec3 zell = nZelle(p * 0.35);
  vec3 kruste = vec3(0.86, 0.83, 0.76) * (0.92 + 0.1 * n2) * mix(0.75, 1.0, smoothstep(0.02, 0.08, zell.y - zell.x));
  vec3 schlamm = vec3(0.36, 0.3, 0.22) * (0.85 + 0.25 * n2);
  float nahWasser = 1.0 - smoothstep(uPegel, uPegel + 1.2, W.y);
  vec3 c = sand;
  c = mix(c, mix(schlamm, kruste, uWeiss), bett * max(uWeiss, nahWasser * 0.8) * step(uPegel - 0.05, W.y));
  // Gras und Savanne
  float gm = uG * smoothstep(0.32, 0.62, nF(p * 0.08 + 3.0) + 0.25 * n1 + 0.15) * (1.0 - berg) * step(uPegel + 0.15, W.y);
  vec3 gras = mix(vec3(0.33, 0.43, 0.17), vec3(0.62, 0.55, 0.28), uGelb) * (0.82 + 0.3 * n2);
  c = mix(c, gras, gm * 0.9);
  // nasse Flecken nach dem Regen
  c *= 1.0 - 0.32 * uNass * smoothstep(0.4, 0.7, nF(p * 0.12 + uZeit * 0.02));
  // Sand wandert zurück (Front von der Düne ins Becken)
  float decke = smoothstep(uSandZ - 10.0, uSandZ + 10.0, W.z + 6.0 * n1);
  c = mix(c, sand, decke * (1.0 - bett * 0.5));
  diffuseColor.rgb = c;`);
  };
  return m;
}

const WASSER_V = /* glsl */ `
varying vec3 vW;
#include <fog_pars_vertex>
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const WASSER_F = /* glsl */ `
uniform vec3 tief, himmel, sonneR, sonneF; uniform float zeit, glanzS;
varying vec3 vW;
#include <fog_pars_fragment>
${GLSL_NOISE}
void main() {
  vec3 V = normalize(cameraPosition - vW); float d = length(cameraPosition.xz - vW.xz);
  vec2 g = (vec2(nN(vW.xz * 0.35 + zeit * 0.4), nN(vW.zx * 0.31 - zeit * 0.33)) - 0.5) * 0.35 / (1.0 + d / 120.0);
  g += (vec2(nN(vW.xz * 0.06 + zeit * 0.1), nN(vW.zx * 0.05 - zeit * 0.08)) - 0.5) * 0.12;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float fres = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N); float s = max(dot(R, normalize(sonneR)), 0.0);
  vec3 col = mix(tief, himmel, fres * 0.9);
  col += sonneF * (pow(s, 300.0) * 6.0 + pow(s, 30.0) * 0.25) * glanzS;
  gl_FragColor = vec4(col, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
}`;

function giraffeGeo() {
  const g = [];
  const leib = new THREE.BoxGeometry(1.7, 1.0, 0.7); leib.translate(0, 2.3, 0); g.push(leib);
  for (const [x, z] of [[0.65, 0.25], [0.65, -0.25], [-0.65, 0.25], [-0.65, -0.25]]) { const b = new THREE.BoxGeometry(0.14, 1.9, 0.14); b.translate(x, 0.95, z); g.push(b); }
  const hals = new THREE.CylinderGeometry(0.13, 0.25, 2.3, 6); hals.rotateZ(-0.45); hals.translate(1.25, 3.7, 0); g.push(hals);
  const kopf = new THREE.BoxGeometry(0.55, 0.26, 0.24); kopf.translate(1.85, 4.8, 0); g.push(kopf);
  return merge(g);
}
function nilpferdGeo() { const r = new THREE.IcosahedronGeometry(1, 1); r.scale(1.6, 0.6, 0.85); const k = new THREE.IcosahedronGeometry(0.5, 1); k.scale(1.1, 0.6, 0.8); k.translate(1.7, 0.1, 0); return merge([r, k]); }
function krokoGeo() { const k = new THREE.BoxGeometry(3.2, 0.28, 0.5); k.translate(0, 0.14, 0); const s = new THREE.ConeGeometry(0.22, 1.4, 4); s.rotateZ(Math.PI / 2); s.translate(-2.2, 0.12, 0); return merge([k, s]); }
function antilopeGeo() { const g = [new THREE.BoxGeometry(1.1, 0.5, 0.35)]; g[0].translate(0, 0.95, 0);
  for (const [x, z] of [[0.4, 0.12], [0.4, -0.12], [-0.4, 0.12], [-0.4, -0.12]]) { const b = new THREE.BoxGeometry(0.07, 0.75, 0.07); b.translate(x, 0.37, z); g.push(b); }
  const h = new THREE.BoxGeometry(0.35, 0.22, 0.18); h.translate(0.7, 1.3, 0); g.push(h); return merge(g); }
function akazieGeo() {
  const st = new THREE.CylinderGeometry(0.12, 0.2, 3.2, 6); st.translate(0, 1.6, 0);
  const a1 = new THREE.CylinderGeometry(0.06, 0.1, 1.8, 5); a1.rotateZ(0.7); a1.translate(-0.6, 3.4, 0);
  const a2 = new THREE.CylinderGeometry(0.06, 0.1, 1.8, 5); a2.rotateZ(-0.7); a2.translate(0.6, 3.4, 0);
  return merge([st, a1, a2]);
}
function akazieKrone() { const k = klumpen(8, 41, { flach: 0.35, streu: 1.0 }); k.scale(2.6, 0.75, 2.6); k.translate(0, 4.2, 0); return k; }
function schilfGeo() { const pos = []; for (let i = 0; i < 5; i++) { const a = i * 1.3, x = Math.cos(a) * 0.08, z = Math.sin(a) * 0.08; pos.push(x - 0.012, 0, z, x + 0.012, 0, z, x * 2.5, 1, z * 2.5); } const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; }

function ritzTextur() {
  const n = 256, c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d");
  g.clearRect(0, 0, n, n); g.strokeStyle = "rgba(236,214,180,1)"; g.lineWidth = 5; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); // Giraffe: Rumpf, Beine, langer Hals, Kopf
  g.moveTo(70, 150); g.lineTo(150, 145); g.lineTo(160, 110); g.lineTo(190, 40); g.lineTo(215, 38);
  g.moveTo(190, 40); g.lineTo(183, 55); g.moveTo(70, 150); g.lineTo(75, 110); g.lineTo(150, 112); g.lineTo(150, 145);
  for (const x of [80, 95, 135, 148]) { g.moveTo(x, 148); g.lineTo(x + 3, 215); }
  g.moveTo(70, 125); g.lineTo(45, 160); g.stroke();
  g.lineWidth = 3; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(90 + (i % 3) * 22, 122 + Math.floor(i / 3) * 9, 3, 0, 6.28); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class WuesteSee {
  constructor(szene, { schatten = true } = {}) {
    this.szene = szene;
    this.u = { uG: { value: 0 }, uGelb: { value: 0 }, uNass: { value: 0 }, uPegel: { value: PEGEL_MIN }, uWeiss: { value: 0 }, uSandZ: { value: 999 }, uZeit: { value: 0 }, uWindS: { value: 1 } };
    this.vertices = 0;
    const mat = bodenMaterial(this.u);
    const nah = new THREE.PlaneGeometry(500, 420, 300, 300); nah.rotateX(-Math.PI / 2); nah.translate(0, 0, -170);
    const fern = new THREE.PlaneGeometry(16000, 12000, 180, 180); fern.rotateX(-Math.PI / 2); fern.translate(0, 0, -5600);
    for (const [g, tief] of [[nah, 0], [fern, 1]]) {
      const p = g.getAttribute("position");
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let y = hoehe(x, z); if (tief && Math.abs(x) < 245 && z < 35 && z > -375) y -= 4; p.setY(i, y); }
      g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.receiveShadow = schatten; szene.add(m); this.vertices += p.count;
    }
    // See
    this.wu = { tief: { value: C("#2C5A62") }, himmel: { value: C("#9FB4C6") }, sonneR: { value: new THREE.Vector3(0, 0.4, -1) }, sonneF: { value: C("#FFF0D8") }, zeit: { value: 0 }, glanzS: { value: 1 } };
    const wm = new THREE.ShaderMaterial({ vertexShader: WASSER_V, fragmentShader: WASSER_F, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, this.wu]), fog: true });
    wm.uniforms = Object.assign(wm.uniforms, this.wu);
    this.wasser = new THREE.Mesh(new THREE.PlaneGeometry(14000, 9000, 1, 1).rotateX(-Math.PI / 2).translate(0, 0, -4450), wm);
    this.wasser.position.y = PEGEL_MIN; szene.add(this.wasser);
    // Vegetation
    const R = (i, s, a, b) => lerp(a, b, hash(i, s));
    const land = (x, z) => hoehe(x, z) > PEGEL_MAX + 0.25;
    this.grasP = []; for (let i = 0; this.grasP.length < 9000 && i < 30000; i++) { const x = R(i, 1, -80, 80), z = R(i, 2, -150, 6); if (!land(x, z) || Math.hypot(x - FELS[0], z - FELS[1]) < 2.5) continue; this.grasP.push({ x, z, y: hoehe(x, z), h: R(i, 3, 0.4, 1.0), r: hash(i, 4), d: hash(i, 5) * 6.28 }); }
    this.gras = this._inst(buschel(), windMaterial({ side: THREE.DoubleSide, vertexColors: false }, this.u, { staerke: 1.4 }), this.grasP.length, false, true);
    this.akP = []; for (let i = 0; this.akP.length < 90 && i < 3000; i++) { const nahb = i % 3 !== 0; const x = nahb ? R(i, 11, -70, 70) : R(i, 11, -220, 220), z = nahb ? R(i, 12, -60, -8) : R(i, 12, -96, -84);
      if (!land(x, z) || Math.hypot(x - UFERBLICK[0], z - UFERBLICK[1]) < 9 || Math.abs(x) < 20 && z > -50) continue; this.akP.push({ x, z, y: hoehe(x, z), s: R(i, 13, 0.7, 1.4), r: hash(i, 14), d: hash(i, 15) * 6.28 }); }
    this.akStamm = this._inst(akazieGeo(), new THREE.MeshStandardMaterial({ color: "#4E3A2C", roughness: 0.9, flatShading: true }), this.akP.length, false, false);
    this.akKrone = this._inst(akazieKrone(), windMaterial({}, this.u, { staerke: 0.2 }), this.akP.length, false, true);
    this.schilfP = []; for (let i = 0; i < 3200; i++) { const bar = i % 3 === 0; const x = bar ? R(i, 21, -200, 200) : R(i, 21, -90, 90), z = bar ? (hash(i, 23) < 0.5 ? R(i, 22, -84, -81) : R(i, 22, -99, -96)) : R(i, 22, -48.5, -43.5); this.schilfP.push({ x, z, y: hoehe(x, z), h: R(i, 24, 1.2, 2.2), d: hash(i, 25) * 6.28, r: hash(i, 26) }); }
    this.schilf = this._inst(schilfGeo(), windMaterial({ side: THREE.DoubleSide, vertexColors: false }, this.u, { staerke: 1.2 }), this.schilfP.length, false, false);
    // Tiere
    const fell = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true });
    this.giraffen = this._inst(giraffeGeo(), fell("#C69A5A"), 5, schatten, false);
    this.nilpferde = this._inst(nilpferdGeo(), fell("#5E5654"), 6, false, false);
    this.krokodile = this._inst(krokoGeo(), fell("#3E4430"), 3, false, false);
    this.antilopen = this._inst(antilopeGeo(), fell("#A8784A"), 24, false, false);
    // Fels mit Ritzbild
    const fg = new THREE.IcosahedronGeometry(1.9, 1); const fp = fg.getAttribute("position");
    for (let i = 0; i < fp.count; i++) fp.setXYZ(i, fp.getX(i) * (1.1 + 0.15 * hash(i, 31)), fp.getY(i) * (0.9 + 0.1 * hash(i, 32)), fp.getZ(i) * (0.85 + 0.15 * hash(i, 33)));
    fg.computeVertexNormals();
    this.fels = new THREE.Group();
    const fm = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: "#7A4E34", roughness: 0.95, flatShading: true })); fm.castShadow = false; fm.receiveShadow = schatten; this.fels.add(fm);
    this.ritz = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: ritzTextur(), transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.ritz.position.set(0.15, 0.35, 1.72); this.ritz.rotation.y = 0.15; this.fels.add(this.ritz);
    this.felsY = hoehe(...FELS) + 1.0; this.fels.position.set(FELS[0], this.felsY, FELS[1]); this.fels.rotation.y = 0.35; szene.add(this.fels);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._e = new THREE.Euler();
  }
  _inst(geo, mat, n, schatten, empfangen) {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = schatten; m.receiveShadow = empfangen; m.frustumCulled = false;
    const c = new THREE.Color(); for (let i = 0; i < n; i++) { const v = 0.82 + 0.3 * hash(i, 777 + n); m.setColorAt(i, c.setRGB(v, v, v)); }
    this.szene.add(m); this.vertices += geo.getAttribute("position").count * n; return m;
  }
  _setze(mesh, i, x, y, z, sx, sy, sz, dreh = 0) {
    if (sx < 1e-3 || sy < 1e-3) { this._m.makeScale(0, 0, 0); mesh.setMatrixAt(i, this._m); return; }
    this._e.set(0, dreh, 0); this._q.setFromEuler(this._e); this._p.set(x, y, z); this._s.set(sx, sy, sz); this._m.compose(this._p, this._q, this._s); mesh.setMatrixAt(i, this._m);
  }
  setze(t, kamera, w) {
    const { pegel, gruen, gelb, nass, weiss, sandZ, sonne, sonnenFarbe, himmelFarbe, wasserFarbe, wind = 0.5, tiere = {}, ritzbild = 0, felsSinkt = 0 } = w;
    const u = this.u; Object.assign(u.uG, { value: gruen }); u.uGelb.value = gelb; u.uNass.value = nass; u.uPegel.value = pegel; u.uWeiss.value = weiss; u.uSandZ.value = sandZ; u.uZeit.value = t; u.uWindS.value = 0.4 + 1.2 * wind;
    this.wasser.position.y = pegel; this.wasser.visible = pegel > PEGEL_MIN + 0.3;
    this.wu.zeit.value = t; this.wu.sonneR.value.set(...sonne); this.wu.sonneF.value.copy(sonnenFarbe); this.wu.himmel.value.copy(himmelFarbe); this.wu.tief.value.copy(wasserFarbe);
    const decke = (z) => smoothstep(sandZ - 10, sandZ + 10, z);
    const grasC = C("#5A7A2A").lerp(C("#A8984E"), gelb);
    this.gras.material.color.copy(grasC); this.gras.material.emissive.copy(grasC).multiplyScalar(0.15);
    const gx = kamera.position.x, gz = kamera.position.z;
    this.grasP.forEach((p, i) => { const k = (p.r < gruen ? 1 : 0) * smoothstep(0, 0.25, gruen - p.r) * (1 - decke(p.z)) * (p.y > pegel + 0.2 ? 1 : 0) * smoothstep(2.5, 4, Math.hypot(p.x - gx, p.z - gz));
      this._setze(this.gras, i, p.x, p.y, p.z, 1.3 * k, p.h * k * (1 - 0.3 * gelb), 1.3 * k, p.d); });
    this.gras.instanceMatrix.needsUpdate = true;
    const kroneC = C("#4E6A2C").lerp(C("#8A7A44"), gelb);
    this.akKrone.material.color.copy(kroneC); this.akKrone.material.emissive.copy(kroneC).multiplyScalar(0.12);
    const kx = kamera.position.x, kz = kamera.position.z;
    this.akP.forEach((p, i) => { const g = smoothstep(p.r * 0.6, p.r * 0.6 + 0.4, gruen) * (1 - decke(p.z) * 0.9) * (Math.hypot(p.x - kx, p.z - kz) < 16 ? 0 : 1), s = p.s * g;
      this._setze(this.akStamm, i, p.x, p.y - 0.1, p.z, s, s, s, p.d); this._setze(this.akKrone, i, p.x, p.y - 0.1, p.z, s, s * (1 - 0.3 * gelb), s, p.d); });
    this.akStamm.instanceMatrix.needsUpdate = true; this.akKrone.instanceMatrix.needsUpdate = true;
    const schilfK = smoothstep(PEGEL_MAX - 3, PEGEL_MAX - 0.5, pegel) * gruen;
    this.schilf.material.color.copy(C("#5E7A34").lerp(C("#9A8A50"), gelb));
    this.schilfP.forEach((p, i) => { const k = schilfK * (p.r < 0.85 ? 1 : 0); this._setze(this.schilf, i, p.x, Math.max(p.y, pegel - 0.3), p.z, k, p.h * k, k, p.d); });
    this.schilf.instanceMatrix.needsUpdate = true;
    // Tiere
    const gir = tiere.giraffen || 0;
    for (let i = 0; i < 5; i++) { const x = -26 + i * 7 + (t - 36) * 1.1 + 2 * Math.sin(i * 3), z = -90 + 2.5 * Math.sin(i * 1.7), s = gir * (0.9 + 0.2 * hash(i, 51));
      this._setze(this.giraffen, i, x, hoehe(x, z), z, s, s, s, 0.1 * Math.sin(t * 0.5 + i)); }
    this.giraffen.instanceMatrix.needsUpdate = true;
    const nil = tiere.nilpferde || 0;
    for (let i = 0; i < 6; i++) { const x = -6 + 14 * hash(i, 61) + 1.2 * Math.sin(t * 0.3 + i), z = -56 - 16 * hash(i, 62);
      this._setze(this.nilpferde, i, x, pegel - 0.25 + 0.08 * Math.sin(t * 1.3 + i * 2), z, nil, nil, nil, hash(i, 63) * 6); }
    this.nilpferde.instanceMatrix.needsUpdate = true;
    const kro = tiere.krokodile || 0;
    for (let i = 0; i < 3; i++) { const x = 4 + 4 * i, z = -46.2 - 0.6 * i; this._setze(this.krokodile, i, x, Math.max(hoehe(x, z), pegel) - 0.05, z, kro, kro, kro, 1.4 + 0.3 * i); }
    this.krokodile.instanceMatrix.needsUpdate = true;
    const ant = tiere.antilopen || 0;
    for (let i = 0; i < 24; i++) { const x = -60 + 120 * hash(i, 71) - (t - 30) * 1.6, z = -88 - 5 * hash(i, 72), s = ant * (hash(i, 73) < 0.9 ? 1 : 0);
      this._setze(this.antilopen, i, x, hoehe(x, z), z, s, s, s, Math.PI); }
    this.antilopen.instanceMatrix.needsUpdate = true;
    this.ritz.material.opacity = ritzbild;
    this.fels.position.y = this.felsY - 1.1 * felsSinkt;
  }
}
