// Supermarkt-Welt für „Was, wenn der Stickstoff 5 Sekunden aus der Luft verschwindet?“ (Account 2, Video 2).
// Stil 16 „POV-Filmlook stilisiert“: Low-Poly-Formen, Neonlicht, Bloom. Regale, Tüten und Produkte sind Instanzen.
// Koordinaten (Meter): Gang entlang +x, y nach oben, +z = rechts. Du stehst bei (0, 1,65, 0). Boden y = 0.
//   Gang 0: z ∈ [−1,3 ; 1,3]. Links (z < −1,3): Chips-Gondel (x −7,5 … 3,6) dahinter Regale; rechts (z > 1,3): Backstation (x −4,4 … 0,4).
// Alles ist eine reine Funktion von t bzw. des übergebenen Zustands (deterministisch).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { clamp, lerp, ease, fortschritt, hash, smoothstep } from "../../engine/bewegung.js";
import { mat } from "../../engine/bausteine.js";
import { lichtTag } from "../../engine/licht.js";

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const AUGE = V(0, 1.65, 0);
// Kaffeeautomat auf der Theke der Backstation (hinter dir, rechts)
export const MASCHINE = { x: -1.7, z: 1.86, tisch: 0.97 };
export const TASSE = { x: MASCHINE.x, y: MASCHINE.tisch + 0.14, z: MASCHINE.z - 0.14, hoehe: 0.11 }; // Tassenboden
export const N2_FARBE = "#5B8CFF";
export const O2_FARBE = "#FF4F5A";
export const AR_FARBE = "#C9D3E6";

export function canvasTextur(b, h, malen, { wrap = false, repeat = null, anisotropy = 8 } = {}) {
  const c = document.createElement("canvas");
  c.width = b; c.height = h;
  malen(c.getContext("2d"), b, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat) t.repeat.set(...repeat); }
  return t;
}

export function textSprite(text, { farbe = "#FFFFFF", kontur = "#0B1020", hoehe = 0.5, schrift = 900, b = 1024, h = 256 } = {}) {
  const tex = canvasTextur(b, h, (g) => {
    g.font = `${schrift} ${Math.round(h * 0.62)}px "SB Display", Inter, sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.lineJoin = "round"; g.lineWidth = h * 0.11; g.strokeStyle = kontur;
    g.strokeText(text, b / 2, h * 0.54);
    g.fillStyle = farbe; g.fillText(text, b / 2, h * 0.54);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  s.scale.set(hoehe * (b / h), hoehe, 1);
  s.renderOrder = 30;
  return s;
}

// =====================================================================================
// Chipstüte: Kissenform (Folie), kollabiert per Vertex-Shader (alle Tüten teilen die Uniform uT = Sekunden seit dem Klatschen)
// =====================================================================================
export function tuetenGeometrie({ B = 0.27, H = 0.37, D = 0.125, NX = 14, NY = 20 } = {}) {
  const pos = [], uv = [], seite = [], idx = [];
  for (const s of [1, -1]) {
    const base = pos.length / 3;
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
      const u = i / NX, v = j / NY;
      const kx = Math.pow(Math.max(0, 1 - ((u - 0.5) * 2) ** 2), 0.55);
      const ky = Math.pow(Math.sin(Math.PI * clamp((v - 0.07) / 0.86)), 0.8);
      pos.push((u - 0.5) * B, v * H, s * (D / 2) * kx * ky + s * 0.0006);
      uv.push(s > 0 ? u : 1 - u, v);
      seite.push(s);
    }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const a = base + j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
      if (s > 0) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("seite", new THREE.Float32BufferAttribute(seite, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function tuetenTextur() {
  return canvasTextur(256, 384, (g, b, h) => {
    g.fillStyle = "#F6F6F6"; g.fillRect(0, 0, b, h);
    // Siegelnähte (oben/unten) mit Zickzack
    g.fillStyle = "#CFCFCF"; g.fillRect(0, 0, b, h * 0.075); g.fillRect(0, h * 0.925, b, h * 0.075);
    g.strokeStyle = "#B5B5B5"; g.lineWidth = 2;
    for (let x = 0; x < b; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 4, h * 0.07); g.stroke(); g.beginPath(); g.moveTo(x, h); g.lineTo(x + 4, h * 0.93); g.stroke(); }
    // dunkles Band hinter dem Schriftzug und Kartoffelscheibe
    g.fillStyle = "#E4E4E4"; g.beginPath(); g.ellipse(b / 2, h * 0.58, b * 0.36, b * 0.3, -0.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#FFFFFF"; g.beginPath(); g.ellipse(b / 2 - 4, h * 0.585, b * 0.3, b * 0.24, -0.2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#D8D8D8"; g.lineWidth = 3; g.beginPath(); g.ellipse(b / 2 - 4, h * 0.585, b * 0.22, b * 0.16, -0.2, 0.3, Math.PI * 1.7); g.stroke();
    g.fillStyle = "#1E1E1E"; g.font = `900 ${h * 0.14}px "SB Display", Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("CHIPS", b / 2, h * 0.255);
    g.font = `800 ${h * 0.05}px "SB Display", Inter, sans-serif`; g.fillStyle = "#3A3A3A"; g.fillText("KNUSPRIG · GESALZEN", b / 2, h * 0.355);
    g.font = `700 ${h * 0.045}px "SB Text", Inter, sans-serif`; g.fillText("150 g", b / 2, h * 0.865);
  });
}

export function tuetenMaterial({ attr = false } = {}) {
  const uni = { uT: { value: -10 }, uRueck: { value: 0 } };
  const m = new THREE.MeshStandardMaterial({ map: tuetenTextur(), roughness: 0.34, metalness: 0.5, color: 0xffffff });
  m.userData.uni = uni;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uni.uT; sh.uniforms.uRueck = uni.uRueck;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
attribute float seite; ${attr ? 'attribute float dlyA;' : ''} uniform float uT; uniform float uRueck; varying float vKc;
float tkHash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float tkK(float tt){ if (tt < 0.0) return 0.0; return clamp(1.0 - exp(-tt * 13.0) * cos(tt * 21.0), 0.0, 1.06); }
float tkAuf(float tt){ if (tt < 0.0) return 0.0; return 1.0 - exp(-tt * 9.0) * cos(tt * 17.0); }`)
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
float dly = 0.0;
#ifdef USE_INSTANCING
${attr ? 'dly = dlyA;' : 'dly = tkHash(instanceMatrix[3].xyz) * 0.32;'}
#endif
float kk = tkK(uT - dly) * (1.0 - clamp(tkAuf(uRueck - dly * 0.6), 0.0, 1.0));
float kc = clamp(kk, 0.0, 1.0);
vKc = kc;
float gx = cos(position.x * 68.0 + position.y * 41.0 + dly * 40.0) * 34.0 + cos(position.y * 95.0 - position.x * 37.0) * -18.5;
float gy = cos(position.x * 68.0 + position.y * 41.0 + dly * 40.0) * 20.5 + cos(position.y * 95.0 - position.x * 37.0) * 47.5;
objectNormal = normalize(mix(objectNormal, vec3(0.0, 0.0, seite), kc * 0.9) - vec3(gx, gy, 0.0) * 0.55 * kc);`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
transformed.z *= mix(1.0, 0.05, clamp(kk, 0.0, 1.06));
float wr = sin(position.x * 68.0 + position.y * 41.0 + dly * 40.0) * 0.5 + sin(position.y * 95.0 - position.x * 37.0) * 0.5;
transformed.z += seite * (0.5 + 0.5 * wr) * 0.0045 * kc;
transformed.x *= 1.0 - 0.07 * kc;
transformed.y *= 1.0 - 0.03 * kc;`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vKc;")
      .replace("#include <map_fragment>", `#include <map_fragment>
{ float cr = abs(sin(vMapUv.x * 37.0 + vMapUv.y * 23.0)) * abs(sin(vMapUv.x * -29.0 + vMapUv.y * 41.0));
  diffuseColor.rgb *= 1.0 - vKc * (0.34 * (1.0 - smoothstep(0.0, 0.3, cr)) + 0.12); }`);
  };
  return m;
}

/** Tütenzustand: sek = Sekunden seit dem Klatschen (< 0: aufgeblasen), rueck = Sekunden seit der Rückkehr des Stickstoffs (< 0: noch nicht) */
export function setzeTueten(m, sek, rueck) { m.userData.uni.uT.value = sek; m.userData.uni.uRueck.value = rueck; }

// =====================================================================================
// Figuren (wie im Prototyp, Low-Poly, ohne Logo)
// =====================================================================================
export function figurBauen({ jacke = "#4E5D8C", hose = "#2A2F3D", haare = "#4A2E22", haut = "#E8B996", schal = null, groesse = 1.68, schuerze = null } = {}) {
  const g = new THREE.Group();
  const k = groesse / 1.68;
  const m = (f, r = 0.75) => mat(f, { rau: r });
  const bein = (x) => { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.68, 4, 10), m(hose)); b.position.set(0, 0.43, x); b.castShadow = true; return b; };
  g.add(bein(-0.1), bein(0.1));
  const schuh = (x) => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.11), m("#1C1F27")); s.position.set(0.04, 0.04, x); return s; };
  g.add(schuh(-0.1), schuh(0.1));
  const rumpf = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 14), m(jacke, 0.85));
  rumpf.scale.set(0.78, 1, 1.05); rumpf.position.y = 1.06; rumpf.castShadow = true; g.add(rumpf);
  if (schuerze) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.34), m(schuerze, 0.8)); s.position.set(0.16, 0.9, 0); g.add(s); }
  if (schal) { const s = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.05, 8, 16), m(schal, 0.9)); s.rotation.x = Math.PI / 2; s.position.y = 1.37; g.add(s); }
  const hals = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), m(haut, 0.6)); hals.position.y = 1.4; g.add(hals);
  const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 18), m(haut, 0.55)); kopf.scale.set(0.95, 1.08, 0.9); kopf.position.y = 1.53; kopf.castShadow = true; g.add(kopf);
  const haar = new THREE.Mesh(new THREE.SphereGeometry(0.125, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), m(haare, 0.9)); haar.position.set(-0.012, 1.55, 0); haar.rotation.z = 0.25; g.add(haar);
  const zopf = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.16, 4, 8), m(haare, 0.9)); zopf.position.set(-0.12, 1.45, 0); zopf.rotation.z = -0.4; g.add(zopf);
  const auge = (z) => { const a = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), mat("#1A1D26", { rau: 0.3 })); a.position.set(0.105, 1.55, z); return a; };
  g.add(auge(-0.04), auge(0.04));
  const nase = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.04, 8), m(haut, 0.6)); nase.rotation.z = -Math.PI / 2; nase.position.set(0.122, 1.515, 0); g.add(nase);
  const ohr = (z) => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), m(haut, 0.6)); o.scale.set(0.6, 1, 0.5); o.position.set(-0.005, 1.53, z); return o; };
  g.add(ohr(-0.105), ohr(0.105));
  const arm = (seite) => {
    const p = new THREE.Group(); p.position.set(0, 1.3, seite * 0.23);
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.5, 4, 10), m(jacke, 0.85)); a.position.y = -0.28; a.castShadow = true; p.add(a);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), m(haut, 0.6)); hand.position.y = -0.58; p.add(hand);
    g.add(p); return p;
  };
  const armL = arm(-1), armR = arm(1);
  g.scale.setScalar(k);
  return { g, armL, armR };
}

export function gelenkFigur({ jacke = "#4E5D8C", hose = "#2A2F3D", haare = "#4A2E22", haut = "#E8B996", schuerze = null, groesse = 1.68, zopf = true } = {}) {
  const root = new THREE.Group();
  const sk = groesse / 1.68;
  const m = (f, r = 0.75) => mat(f, { rau: r });
  const hueft = new THREE.Group(); hueft.position.y = 0.84; root.add(hueft);
  const beine = [-1, 1].map((sd) => {
    const pv = new THREE.Group(); pv.position.set(0, 0, sd * 0.1); hueft.add(pv);
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.68, 4, 10), m(hose)); b.position.y = -0.41; b.castShadow = true; pv.add(b);
    const sch = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.11), m("#1C1F27")); sch.position.set(0.04, -0.8, 0); pv.add(sch);
    return pv;
  });
  const ober = new THREE.Group(); hueft.add(ober);
  const rumpf = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 14), m(jacke, 0.85)); rumpf.scale.set(0.78, 1, 1.05); rumpf.position.y = 0.22; rumpf.castShadow = true; ober.add(rumpf);
  if (schuerze) { const sc = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.34), m(schuerze, 0.8)); sc.position.set(0.16, 0.06, 0); ober.add(sc); }
  const hals = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), m(haut, 0.6)); hals.position.y = 0.56; ober.add(hals);
  const kopf = new THREE.Group(); kopf.position.y = 0.56; ober.add(kopf);
  const kg = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 18), m(haut, 0.55)); kg.scale.set(0.95, 1.08, 0.9); kg.position.y = 0.13; kg.castShadow = true; kopf.add(kg);
  const haar = new THREE.Mesh(new THREE.SphereGeometry(0.125, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), m(haare, 0.9)); haar.position.set(-0.012, 0.15, 0); haar.rotation.z = 0.25; kopf.add(haar);
  if (zopf) { const zp = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.16, 4, 8), m(haare, 0.9)); zp.position.set(-0.12, 0.05, 0); zp.rotation.z = -0.4; kopf.add(zp); }
  for (const z of [-0.04, 0.04]) { const a = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), mat("#1A1D26", { rau: 0.3 })); a.position.set(0.105, 0.15, z); kopf.add(a); }
  const nase = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.04, 8), m(haut, 0.6)); nase.rotation.z = -Math.PI / 2; nase.position.set(0.122, 0.115, 0); kopf.add(nase);
  for (const z of [-0.105, 0.105]) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), m(haut, 0.6)); o.scale.set(0.6, 1, 0.5); o.position.set(-0.005, 0.13, z); kopf.add(o); }
  const arm = (sd) => {
    const pv = new THREE.Group(); pv.position.set(0, 0.46, sd * 0.23); ober.add(pv);
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.5, 4, 10), m(jacke, 0.85)); a.position.y = -0.28; a.castShadow = true; pv.add(a);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), m(haut, 0.6)); h.position.y = -0.58; pv.add(h);
    return pv;
  };
  const armL = arm(-1), armR = arm(1);
  root.scale.setScalar(sk);
  return { g: root, hueft, ober, beine, kopf, armL, armR, rumpf, sk };
}

export function einkaufswagen() {
  const g = new THREE.Group();
  const draht = mat("#C9CED8", { rau: 0.3, metall: 0.8 });
  const boden = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.5), draht); boden.position.y = 0.38; g.add(boden);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.02), mat("#B7BDC9", { rau: 0.4, metall: 0.5, transparent: true, deckkraft: 0.6 })); w.position.set(0, 0.55, s * 0.25); g.add(w);
  }
  const hinten = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.5), mat("#B7BDC9", { rau: 0.4, metall: 0.5, transparent: true, deckkraft: 0.6 })); hinten.position.set(-0.45, 0.55, 0); g.add(hinten);
  const griff = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.54, 8), mat("#E8552A", { rau: 0.6 })); griff.rotation.x = Math.PI / 2; griff.position.set(-0.5, 0.92, 0); g.add(griff);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 0.03), draht); st.position.set(-0.47, 0.65, s * 0.25); g.add(st); }
  for (const [x, z] of [[-0.35, 0.2], [-0.35, -0.2], [0.35, 0.2], [0.35, -0.2]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), mat("#232830", { rau: 0.7 })); r.rotation.x = Math.PI / 2; r.position.set(x, 0.07, z); g.add(r); }
  // Einkauf
  const cols = ["#3FA45B", "#E8452C", "#2E6FD8", "#F2B632"];
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.14), mat(cols[i % 4], { rau: 0.6 })); b.position.set(-0.25 + i * 0.13, 0.5, -0.1 + (i % 2) * 0.2); g.add(b); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// =====================================================================================
// Die Welt
// =====================================================================================
const PALETTE = ["#E8452C", "#2E6FD8", "#F2B632", "#3FA45B", "#8B4FC9", "#17A5A0", "#E2569B", "#F28A30", "#C93C3C", "#5F6B85"];

export function baueMarkt(buehne, { schatten = 1024 } = {}) {
  const szene = new THREE.Scene();
  szene.background = new THREE.Color("#C8D2E6");
  szene.fog = new THREE.Fog("#C3CCE0", 22, 70);
  const licht = lichtTag(szene, buehne.renderer, { bereich: 13, schattenKarte: Math.max(512, schatten), sonnenRichtung: [0.28, 1.0, -0.32], sonnenFarbe: "#FFF3E2", sonnenStaerke: 1.35,
    himmel: "#DDE8FF", boden: "#9C968B", himmelStaerke: 0.95, umgebungsStaerke: 0.5, schattenWeich: 4, ziel: [3, 0, 0] });
  licht.sonne.castShadow = schatten > 0;
  buehne.renderer.shadowMap.autoUpdate = false; // alle Schattenwerfer stehen still: Schattenkarte nur beim ersten Bild rendern
  buehne.renderer.shadowMap.needsUpdate = true;
  const gruppeDecke = new THREE.Group(); // wird in der Totalen ausgeblendet
  szene.add(gruppeDecke);

  // --- Boden ---
  const fliese = canvasTextur(512, 512, (g, b, h) => {
    g.fillStyle = "#D6D3CB"; g.fillRect(0, 0, b, h);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${120 + (i * 37) % 60},${118 + (i * 53) % 50},${112 + (i * 29) % 50},0.06)`; g.fillRect((i * 97) % b, (i * 61) % h, 9, 9); }
    g.strokeStyle = "rgba(120,116,108,0.55)"; g.lineWidth = 5;
    for (let k = 0; k <= 2; k++) { g.beginPath(); g.moveTo(0, k * 256); g.lineTo(b, k * 256); g.stroke(); g.beginPath(); g.moveTo(k * 256, 0); g.lineTo(k * 256, h); g.stroke(); }
  }, { wrap: true, repeat: [70 / 1.2, 36 / 1.2] });
  const bodenM = new THREE.MeshStandardMaterial({ map: fliese, roughness: 0.3, metalness: 0.05, color: "#CBC7BC" });
  const boden = new THREE.Mesh(new THREE.BoxGeometry(70, 0.1, 36), bodenM);
  boden.position.set(14, -0.05, 0); boden.receiveShadow = true; szene.add(boden);
  // Läufer: dunklerer Streifen in Gang 0 (Laufweg)
  const lauf = new THREE.Mesh(new THREE.BoxGeometry(70, 0.004, 1.3), mat("#C9C5BB", { rau: 0.5 })); lauf.position.set(14, 0.003, 0); szene.add(lauf);

  // --- Wände ---
  const wand = mat("#E9ECF2", { rau: 0.9 });
  const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 36), wand); w1.position.set(43, 2, 0); szene.add(w1);
  const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 36), wand); w2.position.set(-10.5, 2, 0); szene.add(w2);
  const w3 = new THREE.Mesh(new THREE.BoxGeometry(56, 4, 0.4), wand); w3.position.set(16, 2, -18); szene.add(w3);
  const w4 = new THREE.Mesh(new THREE.BoxGeometry(56, 4, 0.4), wand); w4.position.set(16, 2, 18); szene.add(w4);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 36), mat("#17A5A0", { rau: 0.6 })); band.position.set(42.8, 1.1, 0); szene.add(band);
  const farSchild = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.5), new THREE.MeshBasicMaterial({ map: canvasTextur(1024, 170, (g, b, h) => {
    g.fillStyle = "#17A5A0"; g.fillRect(0, 0, b, h); g.fillStyle = "#FFFFFF"; g.font = `900 ${h * 0.6}px "SB Display", Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("KASSEN", b / 2, h * 0.54);
  }), color: new THREE.Color(1.15, 1.15, 1.15) }));
  farSchild.position.set(42.7, 2.9, 0); farSchild.rotation.y = -Math.PI / 2; szene.add(farSchild);

  // --- Decke mit Lichtbändern, Lüftung ---
  const decke = new THREE.Mesh(new THREE.BoxGeometry(56, 0.2, 36), mat("#7A8194", { rau: 0.9 })); decke.position.set(16, 3.6, 0); gruppeDecke.add(decke);
  const lichtGeo = new THREE.BoxGeometry(2.6, 0.05, 0.3);
  const lichtMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#EAF2FF").multiplyScalar(1.6) });
  const reihen = [-7.2, -3.6, 0, 3.6, 7.2];
  const nL = reihen.length * 22;
  const lichter = new THREE.InstancedMesh(lichtGeo, lichtMat, nL);
  { const m4 = new THREE.Matrix4(); let i = 0; for (const z of reihen) for (let x = -9; x < 42; x += 2.4 + 0.8) { if (i >= nL) break; m4.makeTranslation(x, 3.48, z); lichter.setMatrixAt(i++, m4); } lichter.count = i; lichter.frustumCulled = false; }
  gruppeDecke.add(lichter);
  for (const z of [-0.9, 0.9]) { const rohr = new THREE.Mesh(new THREE.BoxGeometry(56, 0.22, 0.3), mat("#59606F", { rau: 0.6, metall: 0.4 })); rohr.position.set(16, 3.33, z * 2.2); gruppeDecke.add(rohr); }
  // Hängeschilder über dem Gang (frei erfunden)
  const hangSchild = (x, text, farbe) => {
    const tex = canvasTextur(1024, 256, (g, b, h) => {
      g.fillStyle = farbe; g.fillRect(0, 0, b, h); g.fillStyle = "#FFFFFF"; g.font = `900 ${h * 0.5}px "SB Display", Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, b / 2, h * 0.54);
    });
    const m = new THREE.MeshStandardMaterial({ map: tex, emissive: "#FFFFFF", emissiveMap: tex, emissiveIntensity: 0.35, roughness: 0.6 });
    const rand = mat("#2F3440");
    const sch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 2.4), [m, m, rand, rand, rand, rand]);
    sch.position.set(x, 3.0, 0);
    for (const z of [-0.9, 0.9]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 6), rand); r.position.set(x, 3.32, z); gruppeDecke.add(r); }
    gruppeDecke.add(sch);
  };
  hangSchild(7.5, "GETRÄNKE", "#2E6FD8");
  hangSchild(15.5, "KONSERVEN", "#3FA45B");
  hangSchild(23.5, "MÜSLI", "#E8552A");
  hangSchild(31.5, "TIEFKÜHL", "#17A5A0");

  // --- Regale (Gondeln) ---
  // Geometrie je Gondel: Front bei zf, Körper wächst in Richtung s (−1: nach −z, +1: nach +z). Produkte zeigen nach −s.
  const gondelTeile = (x0, x1, zf, s, farbe, kopfText, { ebenen = 4, hoehe = 2.0, tiefe = 0.5 } = {}) => {
    const len = x1 - x0, xm = (x0 + x1) / 2;
    const zc = zf + s * tiefe / 2;
    const rueck = new THREE.Mesh(new THREE.BoxGeometry(len, hoehe, 0.04), mat("#E7EAF0", { rau: 0.8, emissiv: "#8B93A8", emissivStaerke: 0.45 })); rueck.position.set(xm, hoehe / 2, zf + s * tiefe); rueck.castShadow = true; szene.add(rueck);
    const sockel = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, tiefe), mat("#2F3440", { rau: 0.7 })); sockel.position.set(xm, 0.07, zc); sockel.castShadow = true; sockel.receiveShadow = true; szene.add(sockel);
    for (let k = 0; k < ebenen; k++) {
      const y = 0.26 + k * 0.46;
      const brett = new THREE.Mesh(new THREE.BoxGeometry(len, 0.035, tiefe * 0.96), mat("#C9CED6", { rau: 0.5, metall: 0.3 })); brett.position.set(xm, y, zc); brett.receiveShadow = true; szene.add(brett);
      const leiste = new THREE.Mesh(new THREE.BoxGeometry(len, 0.045, 0.012), mat("#F5F7FB", { rau: 0.5 })); leiste.position.set(xm, y + 0.01, zf - s * 0.0); szene.add(leiste);
    }
    const nP = Math.max(2, Math.round(len / 1.2) + 1);
    for (let i = 0; i < nP; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, hoehe, tiefe), mat("#3A404E", { rau: 0.5, metall: 0.3 })); p.position.set(x0 + (len * i) / (nP - 1), hoehe / 2, zc); p.castShadow = true; szene.add(p); }
    const kopfTex = canvasTextur(1024, 128, (g, b, h) => {
      g.fillStyle = farbe; g.fillRect(0, 0, b, h); g.fillStyle = "#FFFFFF"; g.font = `900 ${h * 0.58}px "SB Display", Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(kopfText, b / 2, h * 0.54);
    }, { wrap: true, repeat: [len / 3.2, 1] });
    const kopfM = new THREE.MeshStandardMaterial({ map: kopfTex, emissive: "#FFFFFF", emissiveMap: kopfTex, emissiveIntensity: 0.3, roughness: 0.6 });
    const kopf = new THREE.Mesh(new THREE.BoxGeometry(len, 0.32, tiefe + 0.04), [mat(farbe), mat(farbe), mat(farbe), mat(farbe), s < 0 ? kopfM : mat(farbe), s < 0 ? mat(farbe) : kopfM]);
    kopf.position.set(xm, hoehe + 0.16, zc); szene.add(kopf);
    return { zc, ebenenY: Array.from({ length: ebenen }, (_, k) => 0.26 + k * 0.46 + 0.0175), zFront: zf + s * 0.07 };
  };

  // Produkte als Instanzen. tuete: Instanzen der Chipstüten; kisten/dosen: einfache Produkte
  const tuetenMat = tuetenMaterial();
  const tuetenGeo = tuetenGeometrie();
  const tuetenPlatz = []; // {x, y, z, rot}
  const kistenPlatz = []; // {x, y, z, w, h, d}
  const dosenPlatz = []; // {x, y, z, r, h}
  const flaschenPlatz = [], deckelPlatz = [];
  const SORT = [["#E8452C", "#F2B632"], ["#2E6FD8", "#EEF2F8"], ["#3FA45B", "#F2B632"], ["#8B4FC9", "#E2569B"], ["#F28A30", "#C93C3C"], ["#17A5A0", "#2E6FD8"], ["#C93C3C", "#EEF2F8"], ["#5F6B85", "#F2B632"]];
  const stellen = (x0, x1, g, s, art, luecken = []) => {
    const frei = (x) => !luecken.some(([a, b]) => x > a - 0.3 && x < b + 0.3);
    for (const [ei, y] of g.ebenenY.entries()) {
      if (art === "chips") {
        for (let x = x0 + 0.17; x < x1 - 0.1; x += 0.3) {
          if (!frei(x)) continue;
          tuetenPlatz.push({ x: x + (hash(Math.round(x * 100) + 7, Math.round(y * 100)) - 0.5) * 0.03, y, z: g.zFront, rot: (hash(Math.round(x * 50), Math.round(y * 99)) - 0.5) * 0.12, s });
        }
        continue;
      }
      let x = x0 + 0.08, i = 0;
      while (x < x1 - 0.12) {
        const seg = Math.floor((x - x0) / 2.1);
        const art2 = Math.floor(hash(seg, 61 + (ei >> 1)) * 5); // 0 Müsli, 1 Dosen, 2 Flaschen, 3 Gläser, 4 Pakete
        const farben = SORT[Math.floor(hash(seg, 71 + ei) * SORT.length)];
        const f = farben[hash(i, 5 + ei) > 0.55 ? 1 : 0];
        const h0 = hash(Math.round(x * 40) + i, Math.round(y * 100));
        if (!frei(x)) { x += 0.2; continue; }
        if (art2 === 1) {
          const r = 0.036 + h0 * 0.006, hh = 0.1 + hash(seg, 3) * 0.05;
          for (let n = 0; n < 3; n++) dosenPlatz.push({ x: x + r, y: y + hh / 2, z: g.zFront + s * (n * 0.1), r, h: hh, f });
          x += r * 2 + 0.008;
        } else if (art2 === 2) {
          const r = 0.032;
          for (let n = 0; n < 3; n++) flaschenPlatz.push({ x: x + r, y, z: g.zFront + s * (n * 0.1), r, k: 0.9 + hash(seg, 4) * 0.2, f });
          x += r * 2 + 0.01;
        } else if (art2 === 3) {
          const r = 0.04 + hash(seg, 6) * 0.01, hh = 0.11;
          for (let n = 0; n < 3; n++) { dosenPlatz.push({ x: x + r, y: y + hh / 2, z: g.zFront + s * (n * 0.11), r, h: hh, f }); deckelPlatz.push({ x: x + r, y: y + hh + 0.01, z: g.zFront + s * (n * 0.11), r: r * 1.03, f: farben[1] }); }
          x += r * 2 + 0.01;
        } else {
          const w = art2 === 0 ? 0.2 + hash(seg, 8) * 0.06 : 0.13 + hash(seg, 9) * 0.04;
          const hh = art2 === 0 ? 0.29 + hash(seg, 10) * 0.04 : 0.17 + hash(seg, 11) * 0.03;
          for (let n = 0; n < 2; n++) kistenPlatz.push({ x: x + w / 2, y: y + hh / 2, z: g.zFront + s * (n * 0.13), w, h: hh, d: 0.07, f });
          x += w + 0.008;
        }
        i++;
      }
    }
  };

  const gL = gondelTeile(-7.5, 3.6, -1.3, -1, "#E8552A", "CHIPS & SNACKS");
  stellen(-7.5, 3.6, gL, -1, "chips");
  const gL2 = gondelTeile(3.6, 13.4, -1.3, -1, "#2E6FD8", "GETRÄNKE · KONSERVEN");
  stellen(3.6, 13.4, gL2, -1, "mix");
  const gL3 = gondelTeile(16.6, 36, -1.3, -1, "#2E6FD8", "GETRÄNKE · KONSERVEN");
  stellen(16.6, 36, gL3, -1, "mix");
  const gR = gondelTeile(0.8, 13.4, 1.3, 1, "#3FA45B", "MÜSLI · NUDELN");
  stellen(0.8, 13.4, gR, 1, "mix");
  const gR2 = gondelTeile(16.6, 36, 1.3, 1, "#3FA45B", "MÜSLI · NUDELN");
  stellen(16.6, 36, gR2, 1, "mix");
  // Instanzen erzeugen
  {
    const nT = tuetenPlatz.length;
    const tuetenInst = new THREE.InstancedMesh(tuetenGeo, tuetenMat, nT);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
    tuetenPlatz.forEach((t, i) => {
      // Die Tüte steht aufrecht, ihre Vorderseite (+z im Modell) zeigt nach +z (links) bzw. −z (rechts)
      e.set(0, t.s < 0 ? 0 : Math.PI, t.rot);
      q.setFromEuler(e);
      const k = 0.94 + hash(i, 3) * 0.1;
      sc.set(k, 0.97 + hash(i, 9) * 0.08, 1);
      p.set(t.x, t.y, t.z + (t.s < 0 ? 0.075 : -0.075));
      m4.compose(p, q, sc);
      tuetenInst.setMatrixAt(i, m4);
      c.set(PALETTE[Math.floor(hash(i, 5) * PALETTE.length)]);
      tuetenInst.setColorAt(i, c);
    });
    tuetenInst.instanceMatrix.needsUpdate = true;
    if (tuetenInst.instanceColor) tuetenInst.instanceColor.needsUpdate = true;
    tuetenInst.frustumCulled = false;
    szene.add(tuetenInst);

    const kistenTex = canvasTextur(128, 192, (g, b, h) => {
      g.fillStyle = "#F4F4F4"; g.fillRect(0, 0, b, h);
      g.fillStyle = "#D9D9D9"; g.fillRect(0, h * 0.62, b, h * 0.38);
      g.fillStyle = "#FFFFFF"; g.beginPath(); g.ellipse(b / 2, h * 0.34, b * 0.34, b * 0.26, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#6A6A6A"; g.fillRect(b * 0.15, h * 0.72, b * 0.7, h * 0.05); g.fillRect(b * 0.15, h * 0.82, b * 0.45, h * 0.04);
    });
    const kistenMat = new THREE.MeshStandardMaterial({ map: kistenTex, roughness: 0.55, color: 0xffffff });
    const kisten = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), kistenMat, kistenPlatz.length);
    kistenPlatz.forEach((k, i) => {
      p.set(k.x, k.y, k.z); q.identity(); sc.set(k.w, k.h, k.d); m4.compose(p, q, sc); kisten.setMatrixAt(i, m4);
      c.set(k.f || PALETTE[Math.floor(hash(i, 11) * PALETTE.length)]); kisten.setColorAt(i, c);
    });
    kisten.instanceMatrix.needsUpdate = true; if (kisten.instanceColor) kisten.instanceColor.needsUpdate = true; kisten.frustumCulled = false;
    szene.add(kisten);
    const dosenMat = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.7, color: 0xffffff });
    const dosen = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 14), dosenMat, dosenPlatz.length);
    dosenPlatz.forEach((d, i) => {
      p.set(d.x, d.y, d.z); q.identity(); sc.set(d.r, d.h, d.r); m4.compose(p, q, sc); dosen.setMatrixAt(i, m4);
      c.set(d.f || PALETTE[Math.floor(hash(i, 17) * PALETTE.length)]); dosen.setColorAt(i, c);
    });
    dosen.instanceMatrix.needsUpdate = true; if (dosen.instanceColor) dosen.instanceColor.needsUpdate = true; dosen.frustumCulled = false;
    szene.add(dosen);
    // Flaschen (Drehkörper mit Hals) und Deckel
    const flaschenProfil = [[0, 0], [0.034, 0], [0.036, 0.02], [0.036, 0.15], [0.03, 0.19], [0.014, 0.225], [0.013, 0.25], [0, 0.25]].map(([r, y]) => new THREE.Vector2(r, y));
    const flaschen = new THREE.InstancedMesh(new THREE.LatheGeometry(flaschenProfil, 10), new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.1, color: 0xffffff }), Math.max(1, flaschenPlatz.length));
    flaschenPlatz.forEach((fl, i) => { p.set(fl.x, fl.y, fl.z); q.identity(); sc.set(fl.r / 0.034, fl.k, fl.r / 0.034); m4.compose(p, q, sc); flaschen.setMatrixAt(i, m4); c.set(fl.f); flaschen.setColorAt(i, c); });
    flaschen.count = flaschenPlatz.length; flaschen.instanceMatrix.needsUpdate = true; if (flaschen.instanceColor) flaschen.instanceColor.needsUpdate = true; flaschen.frustumCulled = false; szene.add(flaschen);
    const deckel = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.02, 12), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2, color: 0xffffff }), Math.max(1, deckelPlatz.length));
    deckelPlatz.forEach((d, i) => { p.set(d.x, d.y, d.z); q.identity(); sc.set(d.r, 1, d.r); m4.compose(p, q, sc); deckel.setMatrixAt(i, m4); c.set(d.f); deckel.setColorAt(i, c); });
    deckel.count = deckelPlatz.length; deckel.instanceMatrix.needsUpdate = true; if (deckel.instanceColor) deckel.instanceColor.needsUpdate = true; deckel.frustumCulled = false; szene.add(deckel);
  }

  // --- Backstation (rechts, hinter dir): Theke, Regalwand mit Backwaren, Kaffeeautomat ---
  const theke = new THREE.Group(); szene.add(theke);
  const thekeKoerper = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.92, 0.72), mat("#E9ECF2", { rau: 0.6 })); thekeKoerper.position.set(-2.2, 0.46, 1.7); thekeKoerper.castShadow = true; thekeKoerper.receiveShadow = true; theke.add(thekeKoerper);
  const thekeBand = new THREE.Mesh(new THREE.BoxGeometry(4.42, 0.2, 0.74), mat("#17A5A0", { rau: 0.5 })); thekeBand.position.set(-2.2, 0.3, 1.7); theke.add(thekeBand);
  const thekePlatte = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.05, 0.8), mat("#F3F5F8", { rau: 0.25, metall: 0.1 })); thekePlatte.position.set(-2.2, 0.945, 1.7); thekePlatte.castShadow = true; thekePlatte.receiveShadow = true; theke.add(thekePlatte);
  const wandHinten = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.5, 0.2), mat("#F1F3F7", { rau: 0.85 })); wandHinten.position.set(-2.2, 1.25, 3.3); theke.add(wandHinten);
  const station = canvasTextur(1024, 160, (g, b, h) => {
    g.fillStyle = "#8A5A2B"; g.fillRect(0, 0, b, h); g.fillStyle = "#FFF4DE"; g.font = `900 ${h * 0.58}px "SB Display", Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("BACKSTATION", b / 2, h * 0.54);
  });
  const stationM = new THREE.MeshStandardMaterial({ map: station, emissive: "#FFFFFF", emissiveMap: station, emissiveIntensity: 0.35, roughness: 0.6 });
  const stationSchild = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 0.1), [mat("#8A5A2B"), mat("#8A5A2B"), mat("#8A5A2B"), mat("#8A5A2B"), mat("#8A5A2B"), stationM]);
  stationSchild.position.set(-2.2, 2.78, 3.12); stationSchild.rotation.y = Math.PI; theke.add(stationSchild);
  // Regale mit Brötchen und Baguettes
  const broetchenGeo = new THREE.SphereGeometry(0.5, 10, 8);
  const nBr = 3 * 22;
  const broetchen = new THREE.InstancedMesh(broetchenGeo, mat("#B97A3E", { rau: 0.7 }), nBr);
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
    const toene = ["#C98A4B", "#B97A3E", "#D9A15F", "#A86B35"];
    let i = 0;
    for (let k = 0; k < 3; k++) for (let n = 0; n < 22; n++) {
      p.set(-4.25 + n * 0.19 + (k % 2) * 0.05, 1.12 + k * 0.5, 3.05 - 0.12); q.identity(); sc.set(0.15, 0.1, 0.12); m4.compose(p, q, sc); broetchen.setMatrixAt(i, m4); c.set(toene[(n + k) % 4]); broetchen.setColorAt(i, c); i++;
    }
    broetchen.instanceMatrix.needsUpdate = true; if (broetchen.instanceColor) broetchen.instanceColor.needsUpdate = true; broetchen.frustumCulled = false; theke.add(broetchen);
    for (let k = 0; k < 3; k++) { const br = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.03, 0.4), mat("#7A5B44", { rau: 0.7 })); br.position.set(-2.2, 1.06 + k * 0.5, 3.0); theke.add(br); }
  }
  // Kaffeeautomat (ohne Marke)
  const maschine = new THREE.Group(); maschine.position.set(MASCHINE.x, MASCHINE.tisch, MASCHINE.z); theke.add(maschine);
  const stahl = mat("#C9CFDA", { rau: 0.5, metall: 0.25 });
  const dunkel = mat("#4A5264", { rau: 0.5, metall: 0.15 });
  const wanne = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.44), stahl); wanne.position.set(0, 0.07, -0.02); wanne.castShadow = true; maschine.add(wanne);
  const rost = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.012, 0.28), mat("#59606F", { rau: 0.6, metall: 0.2 })); rost.position.set(0, 0.146, -0.09); maschine.add(rost);
  const saeule = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.7, 0.26), mat("#8C95A6", { rau: 0.5, metall: 0.2 })); saeule.position.set(0, 0.49, 0.1); saeule.castShadow = true; maschine.add(saeule);
  const kopf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.42), dunkel); kopf.position.set(0, 0.98, 0.0); kopf.castShadow = true; maschine.add(kopf);
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.02), stahl); front.position.set(0, 0.98, -0.215); maschine.add(front);
  const anzeigeTex = canvasTextur(256, 96, (g, b, h) => { g.fillStyle = "#06101C"; g.fillRect(0, 0, b, h); g.fillStyle = "#6FE3FF"; g.font = `800 ${h * 0.5}px "SB Display", Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("KAFFEE", b / 2, h * 0.52); });
  const anzeige = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.075), new THREE.MeshBasicMaterial({ map: anzeigeTex, color: new THREE.Color(1.4, 1.4, 1.4) })); anzeige.position.set(0, 1.0, -0.226); anzeige.rotation.y = Math.PI; maschine.add(anzeige);
  for (let i = 0; i < 4; i++) { const kn = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.015), new THREE.MeshBasicMaterial({ color: new THREE.Color(["#3FA45B", "#2E6FD8", "#F28A30", "#E2569B"][i]).multiplyScalar(1.5) })); kn.position.set(-0.15 + i * 0.1, 0.92, -0.224); maschine.add(kn); }
  const auslauf = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.07, 10), stahl); auslauf.position.set(0, 0.8, -0.14); maschine.add(auslauf);
  const duese = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.12), dunkel); duese.position.set(0, 0.86, -0.13); maschine.add(duese);
  const leute = []; // Personen mit Bewegung (siehe unten)

  // --- Tasse mit Kaffee (Lathe), Schaum, Dampf ---
  const tasseG = new THREE.Group(); tasseG.position.set(TASSE.x, TASSE.y, TASSE.z); szene.add(tasseG);
  const profil = [[0.0, 0.0], [0.031, 0.0], [0.0455, 0.108], [0.0475, 0.112], [0.0445, 0.112], [0.0425, 0.108], [0.0295, 0.006], [0.0, 0.006]].map(([r, y]) => new THREE.Vector2(r, y));
  const tasseTex = canvasTextur(64, 128, (g, b, h) => { g.fillStyle = "#F7F5EF"; g.fillRect(0, 0, b, h); g.fillStyle = "#17A5A0"; g.fillRect(0, h * 0.35, b, h * 0.18); });
  const tasse = new THREE.Mesh(new THREE.LatheGeometry(profil, 28), new THREE.MeshStandardMaterial({ map: tasseTex, roughness: 0.75, side: THREE.DoubleSide }));
  tasse.castShadow = true; tasseG.add(tasse);
  const kaffeeOben = new THREE.Mesh(new THREE.CircleGeometry(0.0425, 28), new THREE.MeshStandardMaterial({ color: "#2D1A10", roughness: 0.18, metalness: 0.05 }));
  kaffeeOben.rotation.x = -Math.PI / 2; kaffeeOben.position.y = 0.078; tasseG.add(kaffeeOben);
  // Blasen (Instanzen)
  const nB = 800;
  const blasenGeo = new THREE.SphereGeometry(1, 9, 7);
  const blasen = new THREE.InstancedMesh(blasenGeo, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.0, color: 0xffffff }), nB);
  blasen.frustumCulled = false; tasseG.add(blasen);
  const blasenDaten = Array.from({ length: nB }, (_, i) => ({ w: hash(i, 21), a: hash(i, 22) * Math.PI * 2, r: Math.sqrt(hash(i, 23)), ph: hash(i, 24), rate: 0.7 + hash(i, 25) * 1.3, gr: 0.006 + hash(i, 26) * 0.011, ton: hash(i, 27) }));
  { const c = new THREE.Color(); blasenDaten.forEach((b, i) => { c.set(b.ton > 0.9 ? "#EAD7B5" : b.ton > 0.45 ? "#B68554" : b.ton > 0.2 ? "#8A5A32" : "#4A2B18"); blasen.setColorAt(i, c); }); if (blasen.instanceColor) blasen.instanceColor.needsUpdate = true; }
  // Rinnsale (außen an der Tasse) und Tropfen
  const rinnsale = [];
  for (let i = 0; i < 7; i++) {
    const r = new THREE.Mesh(new THREE.CapsuleGeometry(0.0075, 0.02, 4, 8), mat("#4A2B18", { rau: 0.2 }));
    rinnsale.push({ m: r, a: (i / 7) * Math.PI * 2 + 0.3, len: 0.03 + hash(i, 31) * 0.05, start: 0.5 + hash(i, 32) * 0.3 }); tasseG.add(r);
  }
  const tropfen = [];
  for (let i = 0; i < 12; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), mat("#4A2B18", { rau: 0.2 })); tropfen.push({ m: d, a: hash(i, 41) * Math.PI * 2, ph: hash(i, 42), rate: 1.2 + hash(i, 43) * 1.2 }); tasseG.add(d); }
  // Dampf (Sprites)
  const dampfTex = canvasTextur(128, 128, (g, b, h) => { const gr = g.createRadialGradient(b / 2, h / 2, 0, b / 2, h / 2, b / 2); gr.addColorStop(0, "rgba(255,255,255,0.75)"); gr.addColorStop(0.5, "rgba(255,255,255,0.28)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, b, h); });
  const dampf = [];
  for (let i = 0; i < 18; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dampfTex, transparent: true, depthWrite: false, opacity: 0 })); s.renderOrder = 12;
    dampf.push({ s, a: hash(i, 51) * Math.PI * 2, r: hash(i, 52) * 0.03, ph: hash(i, 53), rate: 0.35 + hash(i, 54) * 0.4 }); tasseG.add(s);
  }

  // --- Menschen im Markt: Gelenkfiguren mit Laufen, Atmen und Reaktionen (alles Funktionen von t, periodisch bzw. am Ende wieder im Ausgangszustand) ---
  const bump = (t, a, b) => { const x = fortschritt(t, a, b); return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x) ** 2; };
  const atmen = (f, t, ph = 0) => { const a = Math.sin(t * 1.5 + ph); f.rumpf.scale.set(0.78 + 0.012 * a, 1 + 0.012 * a, 1.05 + 0.018 * a); };
  const gehPose = (f, ph, tempo) => {
    const sw = Math.sin(ph) * 0.55 * tempo;
    f.beine[0].rotation.z = sw; f.beine[1].rotation.z = -sw;
    f.armL.rotation.z = -sw * 0.7; f.armR.rotation.z = sw * 0.7;
    f.hueft.position.y = 0.84 + Math.abs(Math.cos(ph)) * 0.025 * tempo;
  };
  const kundin = (cfg) => { const f = gelenkFigur(cfg); szene.add(f.g); return f; };
  // A: Kundin am Chipsregal mit Tüte in der Hand (die Tüte kollabiert mit allen anderen)
  const fA = kundin({ jacke: "#8A4F4F", hose: "#2B2F3E", haare: "#7A5A3A", groesse: 1.66 });
  fA.g.position.set(-2.2, 0, -0.85); fA.g.rotation.y = Math.PI / 2;
  const tuetenGeoHand = tuetenGeometrie();
  const tuteA = new THREE.Mesh(tuetenGeoHand, tuetenMat); tuteA.rotation.y = Math.PI / 2; tuteA.castShadow = false; fA.ober.add(tuteA);
  leute.push((t, z) => {
    const tL = z.n2.aus, tK = z.tKlatsch, tR = z.tRueck;
    atmen(fA, t, 0.4);
    let th = lerp(1.18, 0.5, smoothstep(tK + 1.4, tK + 2.6, t)); th = lerp(th, 1.18, smoothstep(tR, tR + 0.9, t));
    if (t > tK) th += 0.22 * Math.sin(26 * (t - tK)) * Math.exp(-(t - tK) * 3.2); // schüttelt die plattgedrückte Tüte
    fA.armR.rotation.z = th; fA.armR.rotation.x = -0.12;
    fA.armL.rotation.z = 0.35; fA.armL.rotation.x = 0.1;
    const nick = -0.5 + 0.45 * bump(t, tL + 0.3, tL + 2.3) + 0.0;
    fA.kopf.rotation.z = nick;
    fA.kopf.rotation.y = 0.5 * Math.sin((t - tL) * 4.2) * bump(t, tL + 0.5, tL + 2.7) + 0.4 * Math.sin((t - tK) * 6) * bump(t, tK + 0.5, tK + 2.2);
    const hx = 0.58 * Math.sin(th), hy = 0.46 - 0.58 * Math.cos(th);
    tuteA.position.set(hx + 0.07, hy - 0.34, 0.2);
  });
  // B: Kunde mit Einkaufswagen, geht im Gang auf und ab (periodisch)
  const fB = kundin({ jacke: "#4F6A8A", hose: "#2A2F3D", haare: "#2A1E18", groesse: 1.78 });
  const wagenB = einkaufswagen(); szene.add(wagenB);
  leute.push((t, z) => {
    const w = (2 * Math.PI * t) / z.periode, x = 11 + 2.3 * Math.sin(w * 3), vx = Math.cos(w * 3);
    const dir = Math.abs(vx) < 0.12 ? (fB.__d ?? 1) : Math.sign(vx);
    fB.__d = dir;
    const kopfDreh = bump(t, z.n2.aus + 0.5, z.n2.aus + 2.4);
    fB.g.position.set(x, 0, 0.5); fB.g.rotation.y = dir > 0 ? 0 : Math.PI;
    gehPose(fB, t * 7.5, Math.min(1, Math.abs(vx) * 1.6));
    fB.armL.rotation.z = 1.25; fB.armR.rotation.z = 1.25; // hält den Wagen
    fB.kopf.rotation.y = 0.6 * Math.sin((t - z.n2.aus) * 5) * kopfDreh; atmen(fB, t);
    wagenB.position.set(x + dir * 0.85, 0, 0.5); wagenB.rotation.y = dir > 0 ? 0 : Math.PI;
  });
  // C: Kundin quert den Gang an der Querstraße (periodisch)
  const fC = kundin({ jacke: "#5E6B4A", hose: "#2B2F3E", haare: "#2A1E18", groesse: 1.64 });
  leute.push((t, z) => {
    const w = (2 * Math.PI * t) / z.periode, zz = 3.4 * Math.sin(w * 2), vz = Math.cos(w * 2);
    const dir = Math.abs(vz) < 0.1 ? (fC.__d ?? 1) : Math.sign(vz); fC.__d = dir;
    fC.g.position.set(15.0, 0, zz); fC.g.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    gehPose(fC, t * 6.5, Math.min(1, Math.abs(vz) * 1.8)); atmen(fC, t, 1.0);
    fC.kopf.rotation.y = 0.5 * Math.sin((t - z.n2.aus) * 5) * bump(t, z.n2.aus + 0.8, z.n2.aus + 2.6);
  });
  // D: Mitarbeiterin der Backstation: wischt die Theke, tritt beim Sieden erschrocken zurück
  const fD = kundin({ jacke: "#F4F5F7", hose: "#2B2F3E", haare: "#6A3F26", schuerze: "#17A5A0", groesse: 1.66 });
  leute.push((t, z) => {
    const k = smoothstep(0.35, 0.8, z.koch);
    atmen(fD, t, 2.0);
    fD.g.position.set(-2.55 - 0.1 * k, 0, 2.62 + 0.55 * k); fD.g.rotation.y = -Math.PI / 2;
    const wisch = (1 - k) * Math.sin(t * 2.6);
    fD.armR.rotation.z = lerp(0.95 + 0.12 * wisch, 2.4, k); fD.armR.rotation.x = lerp(0.1, 0.5, k);
    fD.armL.rotation.z = lerp(0.2, 2.2, k); fD.armL.rotation.x = lerp(-0.1, -0.5, k);
    fD.kopf.rotation.z = lerp(-0.2, 0.15, k); fD.kopf.rotation.y = lerp(0.3 * Math.sin(t * 0.8), 0, k);
    gehPose(fD, 0, 0);
    fD.beine[0].rotation.z = 0.35 * k; fD.beine[1].rotation.z = -0.2 * k;
  });
  // E–G: weitere Kunden, stehen und stöbern, schauen beim Verschwinden des Stickstoffs auf
  [[19.0, -0.5, 1.3, 0.0, "#6C4F8A"], [24.5, 0.6, -1.6, 0.9, "#7A5E4A"], [9.0, 0.9, 0.5, 1.7, "#4A4F6E"]].forEach(([x, zz, ry, ph, jk], i) => {
    const f = kundin({ jacke: jk, hose: "#2A2F3D", haare: hash(i, 9) > 0.4 ? "#2A1E18" : "#7A5A3A", groesse: 1.62 + hash(i, 8) * 0.2 });
    f.g.position.set(x, 0, zz); f.g.rotation.y = ry;
    leute.push((t, z) => {
      const d = Math.hypot(x, zz);
      atmen(f, t, ph);
      f.armR.rotation.z = 0.5 + 0.35 * Math.sin(t * 0.8 + ph) * 0.5; f.armL.rotation.z = 0.2;
      f.kopf.rotation.z = 0.2 * bump(t, z.n2.aus + 0.2 + d * 0.03, z.n2.aus + 1.8 + d * 0.03);
      f.kopf.rotation.y = 0.45 * Math.sin((t - z.n2.aus) * 4) * bump(t, z.n2.aus + 0.4 + d * 0.03, z.n2.aus + 2.4 + d * 0.03) + 0.25 * Math.sin(t * 0.6 + ph);
    });
  });
  const wagen2 = einkaufswagen(); wagen2.position.set(-1.1, 0, -0.55); wagen2.rotation.y = 0.35; szene.add(wagen2); // dein Wagen
  const wagen3 = einkaufswagen(); wagen3.position.set(5.2, 0, 1.0); wagen3.rotation.y = 2.9; szene.add(wagen3);
  const personen = [fA, fB, fC, fD];

  // „Du“ (nur in der Totalen)
  const du = figurBauen({ jacke: "#2C3A5E", hose: "#22262F", haare: "#2A1E18", haut: "#D9A47E", groesse: 1.78 });
  du.g.position.set(0, 0, 0); du.g.rotation.y = 0; du.g.visible = false; szene.add(du.g);
  const duRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color("#2EC4B6").multiplyScalar(2), transparent: true, opacity: 0.9, depthWrite: false }));
  duRing.rotation.x = -Math.PI / 2; duRing.position.set(0, 0.03, 0); duRing.visible = false; szene.add(duRing);
  const duLabel = textSprite("DU", { farbe: "#2EC4B6", hoehe: 0.8 }); duLabel.position.set(0, 2.7, 0); duLabel.visible = false; szene.add(duLabel);

  // --- Luftmoleküle ---
  const kugel = (r) => new THREE.SphereGeometry(r, 10, 8);
  const hantelGeo = (r, d) => { const a = kugel(r); a.translate(-d / 2, 0, 0); const b = kugel(r); b.translate(d / 2, 0, 0); return mergeGeometries([a, b]); };
  const hdr = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
  const mN2 = new THREE.MeshBasicMaterial({ color: hdr(N2_FARBE, 1.55) });
  const mO2 = new THREE.MeshBasicMaterial({ color: hdr(O2_FARBE, 1.5) });
  const mAr = new THREE.MeshBasicMaterial({ color: hdr(AR_FARBE, 1.3) });
  const ANZ = { N2: 360, O2: 97, Ar: 5 };
  const n2Inst = new THREE.InstancedMesh(hantelGeo(0.022, 0.048), mN2, ANZ.N2);
  const o2Inst = new THREE.InstancedMesh(hantelGeo(0.024, 0.052), mO2, ANZ.O2);
  const arInst = new THREE.InstancedMesh(kugel(0.03), mAr, ANZ.Ar);
  for (const m of [n2Inst, o2Inst, arInst]) { m.frustumCulled = false; szene.add(m); }
  const BOX = { x0: -3.4, x1: 11, y0: 0.18, y1: 3.15, z0: -1.1, z1: 1.1 };
  const baueMol = (n, seed) => Array.from({ length: n }, (_, i) => {
    const h = (k) => hash(i, seed * 100 + k);
    const base = V(lerp(BOX.x0, BOX.x1, h(1)), lerp(BOX.y0, BOX.y1, h(2)), lerp(BOX.z0, BOX.z1, h(3)));
    return { base, amp: [0.25 + h(4) * 0.5, 0.15 + h(5) * 0.3, 0.2 + h(6) * 0.35], k: [1 + Math.floor(h(7) * 4), 1 + Math.floor(h(8) * 5), 1 + Math.floor(h(9) * 3)], ph: [h(10) * 6.283, h(11) * 6.283, h(12) * 6.283],
      kw: 28 + Math.floor(h(13) * 30), wph: h(14) * 6.283, ax: V(h(15) - 0.5, h(16) - 0.5, h(17) - 0.5).normalize(), spin: 4 + Math.floor(h(18) * 14), sp0: h(19) * 6.283, gr: 0.85 + h(20) * 0.3 };
  });
  const dN2 = baueMol(ANZ.N2, 1), dO2 = baueMol(ANZ.O2, 2), dAr = baueMol(ANZ.Ar, 3);
  const mm = { m4: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3() };

  return {
    szene, licht, personen, gruppeDecke, tuetenMat, blasenDaten, du, duRing, duLabel,
    /** Zustand der Welt: z = {n2:{aus: Sekunden des Wegfalls, rueck: Sekunden der Rückkehr, dauerPop}, eye: Vector3 (Kamera), pull: 0..1 (Einatmen), tKlatsch, tRueck, koch: 0..1, pov: bool} */
    setze(t, z) {
      // Moleküle
      const P = z.periode;
      const pos = (d, tt) => {
        const w = (2 * Math.PI * tt) / P;
        return mm.p.set(
          d.base.x + d.amp[0] * Math.sin(w * d.k[0] + d.ph[0]) + 0.03 * Math.sin(2 * Math.PI * tt * d.kw / P + d.wph),
          d.base.y + d.amp[1] * Math.sin(w * d.k[1] + d.ph[1]) + 0.03 * Math.sin(2 * Math.PI * tt * (d.kw + 3) / P + d.wph * 2),
          d.base.z + d.amp[2] * Math.sin(w * d.k[2] + d.ph[2]) + 0.03 * Math.sin(2 * Math.PI * tt * (d.kw + 7) / P + d.wph * 3));
      };
      const rand = (p) => {
        const dx = Math.min(p.x - BOX.x0, BOX.x1 - p.x), dz = Math.min(p.z - BOX.z0, BOX.z1 - p.z), dy = Math.min(p.y - BOX.y0, BOX.y1 - p.y);
        return smoothstep(0, 0.35, Math.min(dx, dz, dy));
      };
      const nahe = (p) => smoothstep(0.55, 1.6, p.distanceTo(z.eye));
      const praesenzN2 = (d0) => {
        const tp = z.n2.aus + 0.03 + d0 * 0.05, tb = z.n2.rueck + 0.03 + d0 * 0.05;
        if (t < tp) return 1;
        if (t < tp + 0.26) { const x = (t - tp) / 0.26; return x < 0.3 ? lerp(1, 1.7, x / 0.3) : lerp(1.7, 0, ease.inCubic((x - 0.3) / 0.7)); }
        if (t < tb) return 0;
        const x = clamp((t - tb) / 0.4);
        return ease.outBack(x);
      };
      const setzeMol = (inst, daten, istN2, istO2) => {
        daten.forEach((d, i) => {
          const p = pos(d, t);
          let s = d.gr;
          if (istN2) s *= praesenzN2(Math.hypot(p.x, p.z));
          s *= rand(p);
          if (istO2 && z.pull > 0.001) {
            // Einatmen: Sauerstoff strömt zu deinem Mund und wieder hinaus
            const ziel = mm.s.set(z.eye.x + 0.1, z.eye.y - 0.14, z.eye.z + 0.0);
            const w = (1 - smoothstep(1.4, 5.2, p.distanceTo(ziel))) * z.pull;
            p.lerp(ziel, w * 0.97);
          }
          s *= nahe(p);
          const ang = d.sp0 + (2 * Math.PI * d.spin * t) / P;
          mm.q.setFromAxisAngle(d.ax, ang);
          mm.s.set(s, s, s);
          mm.m4.compose(p, mm.q, mm.s);
          inst.setMatrixAt(i, mm.m4);
        });
        inst.instanceMatrix.needsUpdate = true;
      };
      setzeMol(n2Inst, dN2, true, false);
      setzeMol(o2Inst, dO2, false, true);
      setzeMol(arInst, dAr, false, false);

      // Tüten und Menschen
      setzeTueten(tuetenMat, t - z.tKlatsch, t - z.tRueck);
      for (const f of leute) f(t, z);

      // Totale: Decke weg, „Du“ sichtbar
      gruppeDecke.visible = z.pov;
      du.g.visible = !z.pov; duRing.visible = !z.pov; duLabel.visible = !z.pov;

      // Kaffee
      const k = z.koch;
      const sieden = smoothstep(0.02, 0.45, k);
      const o = smoothstep(0.5, 1.0, k); // Überlaufen
      const hMax = 0.01 + 0.095 * k;
      {
        const { m4, q, p, s } = mm;
        const innen = (y) => 0.0295 + (0.0425 - 0.0295) * clamp((y - 0.006) / 0.102);
        const Rk = lerp(0.039, 0.058, o);
        blasenDaten.forEach((b, i) => {
          const lauf = (t * b.rate + b.ph) % 1;
          let rr = Math.sqrt(b.r) * Rk;
          const dom = Math.pow(Math.max(0, 1 - (rr / Rk) ** 2), 0.7);
          const y = 0.082 + hMax * dom * (0.45 + 0.55 * b.w) * (0.9 + 0.1 * Math.sin(lauf * Math.PI));
          if (y < 0.108) rr = Math.min(rr, innen(y) - 0.004);
          const gr = b.gr * 0.5 * (0.4 + 0.6 * smoothstep(0, 0.25, lauf)) * (1 - 0.8 * smoothstep(0.8, 1, lauf)) * smoothstep(0.0, 0.2, k) * (0.85 + 0.4 * o);
          p.set(Math.cos(b.a) * rr, y, Math.sin(b.a) * rr);
          q.identity(); s.set(gr, gr * 0.92, gr);
          m4.compose(p, q, s); blasen.setMatrixAt(i, m4);
        });
        blasen.instanceMatrix.needsUpdate = true;
        for (const r of rinnsale) {
          const fluss = o * (0.55 + 0.45 * Math.sin(t * 2.4 + r.a * 3.0));
          const Ll = 0.008 + fluss * r.len;
          r.m.visible = o > 0.03;
          r.m.scale.set(1, Ll / 0.035, 1);
          const rr = 0.0482;
          r.m.position.set(Math.cos(r.a) * rr, 0.115 - Ll / 2, Math.sin(r.a) * rr);
        }
        for (const d of tropfen) {
          const ph = (t * d.rate + d.ph) % 1;
          d.m.visible = o > 0.1;
          const y = 0.1 - 0.1 * ph * ph - 0.003;
          d.m.position.set(Math.cos(d.a) * (0.052 + 0.01 * ph), y, Math.sin(d.a) * (0.052 + 0.01 * ph));
          d.m.scale.setScalar((1 - smoothstep(0.85, 1, ph)) * o);
        }
        for (const d of dampf) {
          const ph = (t * d.rate * (0.6 + 0.8 * sieden) + d.ph) % 1;
          d.s.material.opacity = 0.22 * sieden * Math.sin(Math.PI * ph) ** 1.5 * (0.5 + 0.5 * k);
          const sc = 0.03 + 0.1 * ph;
          d.s.scale.set(sc, sc, 1);
          d.s.position.set(Math.cos(d.a) * d.r * (1 + ph * 2), 0.11 + hMax * 0.8 + ph * 0.22, Math.sin(d.a) * d.r * (1 + ph * 2));
        }
      }
    },
  };
}
