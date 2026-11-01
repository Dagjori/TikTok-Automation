// Stil 12 · Comic-Toon 3D (Three.js): Cel-Shading in drei Stufen, Rasterpunkte (Halftone) in den Schatten,
// schwarze Konturen (Inverted Hull), harte Schatten, Strahlenkranz-Himmel, Tempostriche.
// Szene: Zug (Team Ticket) und Auto (Team Auto) rasen auf die Kamera zu, der Zug ist gerade über die Linie „13“.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { el, zonen, fertig, zufall } from "./gemeinsam.js";
import { INHALT9, anzeigetafel, chip, phrase } from "./massstab.js";

const W = 1080, H = 1920;
const zz = zufall(12);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("leinwand"), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const szene = new THREE.Scene();

// ---------- Himmel: Verlauf, Strahlenkranz, Rasterpunkte, Comic-Wolken (2D-Leinwand) ----------
function himmel() {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const v = g.createLinearGradient(0, 0, 0, H);
  v.addColorStop(0, "#36b6ff"); v.addColorStop(0.45, "#8fdcff"); v.addColorStop(1, "#d8f4ff");
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  // Strahlenkranz hinter dem Geschehen
  const cx = 300, cy = 820;
  for (let i = 0; i < 36; i++) {
    const a0 = (i / 36) * Math.PI * 2, a1 = a0 + Math.PI / 36;
    g.fillStyle = i % 2 ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.0)";
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * 3000, cy + Math.sin(a0) * 3000); g.lineTo(cx + Math.cos(a1) * 3000, cy + Math.sin(a1) * 3000); g.closePath(); g.fill();
  }
  // Rasterpunkte, oben dichter
  g.fillStyle = "rgba(10,70,160,0.22)";
  for (let y = 0; y < 900; y += 15) for (let x = (y / 15) % 2 ? 7 : 0; x < W; x += 15) {
    const r = 5.2 * Math.max(0, 1 - y / 900);
    if (r > 0.4) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  }
  // Wolken mit Kontur
  const wolke = (x, y, s) => {
    g.lineWidth = 7; g.strokeStyle = "#111"; g.fillStyle = "#fff";
    const kreise = [[0, 0, 60], [62, -22, 70], [130, 4, 56], [60, 22, 58]];
    g.beginPath(); for (const [dx, dy, r] of kreise) { g.moveTo(x + dx * s + r * s, y + dy * s); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); } g.stroke();
    for (const [dx, dy, r] of kreise) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#cfe9ff"; g.beginPath(); g.ellipse(x + 64 * s, y + 46 * s, 110 * s, 18 * s, 0, 0, Math.PI * 2); g.fill();
  };
  wolke(640, 520, 0.9); wolke(90, 600, 0.7); wolke(820, 760, 0.55);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
szene.background = himmel();

// ---------- Licht ----------
szene.add(new THREE.AmbientLight("#ffffff", 1.0));
const sonne = new THREE.DirectionalLight("#ffffff", 3.1);
sonne.position.set(9, 13, 6);
sonne.castShadow = true;
sonne.shadow.mapSize.set(2048, 2048);
Object.assign(sonne.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
sonne.shadow.bias = -0.0008;
szene.add(sonne);

// ---------- Comic-Material: 3 Tonstufen + Rasterpunkte im Schatten ----------
const ZELLE = { value: 10.0 };
function toon(farbe, { punkte = true } = {}) {
  const m = new THREE.MeshLambertMaterial({ color: farbe });
  m.onBeforeCompile = (s) => {
    s.uniforms.uZelle = ZELLE;
    s.fragmentShader = "uniform float uZelle;\n" + s.fragmentShader.replace("#include <opaque_fragment>", /* glsl */ `
      #include <opaque_fragment>
      float lumD = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)) + 1e-4;
      float lumL = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
      float st = lumL / lumD;
      vec3 basis = diffuseColor.rgb;
      vec3 col = basis * (st > 0.80 ? 1.0 : (st > 0.45 ? 0.78 : 0.56));
      ${punkte ? `
      vec2 q = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / uZelle;
      float d = length(fract(q) - 0.5);
      float dunkel = clamp((0.84 - st) / 0.56, 0.0, 1.0);
      float r = sqrt(dunkel) * 0.5;
      float punkt = 1.0 - smoothstep(r - 0.07, r + 0.07, d);
      col = mix(col, basis * 0.26, punkt * step(0.04, dunkel));` : ""}
      gl_FragColor = vec4(col, diffuseColor.a);`);
  };
  return m;
}
const KONTUR = new THREE.MeshBasicMaterial({ color: "#111111", side: THREE.BackSide });
KONTUR.onBeforeCompile = (s) => {
  s.vertexShader = s.vertexShader.replace("#include <begin_vertex>", "vec3 transformed = position + normal * 0.045;");
};
function kontur(mesh) {
  const g = mesh.geometry.clone();
  for (const k of Object.keys(g.attributes)) if (k !== "position") g.deleteAttribute(k);
  const m = mergeVertices(g, 1e-3);
  m.computeVertexNormals();
  const h = new THREE.Mesh(m, KONTUR);
  mesh.add(h);
  return mesh;
}
function teil(geo, farbe, x, y, z, eltern = szene, { linie = true, punkte = true, schatten = true } = {}) {
  const m = new THREE.Mesh(geo, typeof farbe === "string" ? toon(farbe, { punkte }) : farbe);
  m.position.set(x, y, z);
  m.castShadow = schatten; m.receiveShadow = true;
  if (linie) kontur(m);
  eltern.add(m);
  return m;
}
const box = (w, h, d, r = 0.08) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.99);
const walze = (r, h, n = 28) => new THREE.CylinderGeometry(r, r, h, n);

// ---------- Boden, Gleis, Straße ----------
const boden = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), toon("#63d36e"));
boden.rotation.x = -Math.PI / 2; boden.receiveShadow = true; szene.add(boden);
const L = 60;
teil(box(L, 0.16, 2.0, 0.04), "#c9b48f", 0, 0.0, -1.25, szene, { linie: false });
for (let i = 0; i < 120; i++) teil(box(0.26, 0.1, 1.5, 0.03), "#8a5a3c", -28 + i * 0.5, 0.1, -1.25, szene, { linie: false });
for (const dz of [-0.48, 0.48]) teil(box(L, 0.1, 0.1, 0.02), "#e4e8ef", 0, 0.18, -1.25 + dz, szene, { linie: false });
teil(box(L, 0.08, 2.5, 0.03), "#4b5168", 0, 0.0, 1.35, szene, { linie: false, punkte: false });
for (let i = 0; i < 40; i++) teil(box(0.9, 0.02, 0.14, 0.01), "#ffffff", -28 + i * 1.6, 0.085, 1.35, szene, { linie: false, punkte: false, schatten: false });
for (const dz of [0.12, 2.58]) teil(box(L, 0.18, 0.12, 0.03), "#f2f2f2", 0, 0.0, dz - 0.12, szene, { linie: false });

// Ziellinie „13“ quer über beide Bahnen (Schachbrett)
const LINIE_X = 1.2;
for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) {
  const z = -2.2 + i * 0.3;
  if (z > -0.15 && z < 0.1) continue;
  teil(box(0.3, 0.02, 0.3, 0.0), (i + j) % 2 ? "#111111" : "#ffffff", LINIE_X + j * 0.3, (z < 0 ? 0.24 : 0.1), z + 0.15, szene, { linie: false, punkte: false, schatten: false });
}
// ---------- Zug (Team Ticket) ----------
const BLAU = "#1f7bff";
function wagen(laenge, lok) {
  const g = new THREE.Group();
  teil(box(laenge, 1.05, 1.12, 0.16), BLAU, 0, 0.92, 0, g);
  teil(box(laenge * 0.96, 0.12, 1.14, 0.04), "#ffffff", 0, 0.72, 0, g, { linie: false });
  teil(box(laenge * 0.92, 0.16, 0.98, 0.06), "#d7e6ff", 0, 1.52, 0, g);
  const fenster = Math.floor(laenge / 0.62);
  for (let i = 0; i < fenster; i++) teil(box(0.4, 0.34, 0.04, 0.05), "#16224a", -laenge / 2 + 0.42 + i * ((laenge - 0.84) / Math.max(1, fenster - 1)), 1.12, 0.57, g, { linie: false, punkte: false });
  if (lok) {
    teil(box(0.08, 0.42, 0.86, 0.04), "#16224a", laenge / 2 - 0.02, 1.14, 0, g, { linie: false, punkte: false }); // Frontscheibe
    for (const z of [-0.33, 0.33]) teil(walze(0.09, 0.06), "#fff6a8", laenge / 2 + 0.01, 0.56, z, g, { linie: false, punkte: false }).rotation.z = Math.PI / 2;
    teil(box(0.22, 0.3, 1.0, 0.06), "#2b2b3a", laenge / 2 + 0.02, 0.3, 0, g);
    teil(walze(0.08, 0.06), "#fff6a8", laenge / 2 + 0.01, 1.56, 0, g, { linie: false, punkte: false }).rotation.z = Math.PI / 2;
    teil(box(0.06, 0.1, 1.0, 0.03), "#ffe14d", laenge / 2 + 0.03, 0.78, 0, g, { linie: false, punkte: false });
  }
  for (const x of [-laenge / 2 + 0.45, laenge / 2 - 0.45]) for (const z of [-0.5, 0.5]) {
    const r = teil(walze(0.2, 0.12), "#2b2b3a", x, 0.36, z, g);
    r.rotation.x = Math.PI / 2;
  }
  return g;
}
const zug = new THREE.Group();
const lok = wagen(3.2, true); zug.add(lok);
const w2 = wagen(3.0, false); w2.position.x = -3.25; zug.add(w2);
zug.position.set(LINIE_X + 0.9, 0.2, -1.25);
szene.add(zug);

// ---------- Auto (Team Auto) ----------
const ROT = "#ff4d2e";
const auto = new THREE.Group();
teil(box(2.3, 0.62, 1.16, 0.22), ROT, 0, 0.55, 0, auto);
teil(box(1.3, 0.58, 1.02, 0.2), ROT, -0.22, 1.08, 0, auto);
teil(box(1.12, 0.36, 1.05, 0.12), "#9fdcff", -0.2, 1.1, 0, auto, { linie: false, punkte: false });
teil(box(0.1, 0.16, 0.3, 0.04), "#fff6a8", 1.15, 0.66, 0.36, auto, { linie: false, punkte: false });
teil(box(0.1, 0.16, 0.3, 0.04), "#fff6a8", 1.15, 0.66, -0.36, auto, { linie: false, punkte: false });
for (const x of [-0.72, 0.72]) for (const z of [-0.56, 0.56]) {
  const r = teil(walze(0.3, 0.22), "#22222c", x, 0.3, z, auto);
  r.rotation.x = Math.PI / 2;
  const n = teil(walze(0.13, 0.24), "#d9dde6", x, 0.3, z, auto, { linie: false, punkte: false });
  n.rotation.x = Math.PI / 2;
}
auto.position.set(LINIE_X - 2.0, 0.04, 1.35);
szene.add(auto);

// ---------- Tempostriche (hinter den Fahrzeugen) ----------
const strichMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9 });
function striche(x0, y0, z0, n) {
  for (let i = 0; i < n; i++) {
    const l = 1.6 + zz() * 2.6;
    const s = new THREE.Mesh(new THREE.BoxGeometry(l, 0.05, 0.05), strichMat);
    s.position.set(x0 - l / 2 - zz() * 1.2, y0 + zz() * 1.3, z0 + (zz() - 0.5) * 1.2);
    szene.add(s);
  }
}
striche(LINIE_X + 0.9 - 6.4, 0.6, -1.25, 9);
striche(LINIE_X - 2.0 - 1.3, 0.35, 1.35, 7);

// ---------- Umgebung: Bäume und Häuser seitlich, Hochhäuser am Horizont ----------
function baum(x, z, s) {
  teil(walze(0.1 * s, 0.7 * s), "#8a5a3c", x, 0.35 * s, z);
  teil(new THREE.SphereGeometry(0.62 * s, 20, 14), zz() < 0.5 ? "#2fb54a" : "#41c45c", x, 1.05 * s, z);
}
for (let i = 0; i < 12; i++) baum(-22 + i * 2.6 + zz(), -4.0 - zz() * 1.2, 0.9 + zz() * 0.5);
for (let i = 0; i < 12; i++) baum(-22 + i * 2.6 + zz(), 4.6 + zz() * 1.2, 0.9 + zz() * 0.5);
const hausFarben = ["#ffe14d", "#ff9ec4", "#ffffff", "#9fdcff", "#c8a2ff"];
for (let i = 0; i < 10; i++) {
  const h = 3 + zz() * 6;
  teil(box(2.4, h, 2.4, 0.06), hausFarben[i % 5], -34 - zz() * 4, h / 2, -12 + i * 2.7);
}

// ---------- Kamera ----------
const kamera = new THREE.PerspectiveCamera(31, W / H, 0.1, 200);
kamera.position.set(16.5, 5.0, 0.2);
kamera.lookAt(0.6, 0.85, 0.0);

// ---------- HUD ----------
const hud = document.getElementById("hud");
anzeigetafel(hud);
const proj = (v) => { const p = v.clone().project(kamera); return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H }; };
renderer.render(szene, kamera);
const pS = proj(new THREE.Vector3(LINIE_X + 0.15, 0.1, -0.05));
chip(hud, `${INHALT9.chip} · Fahrt 13`, { x: pS.x - 40, y: pS.y - 26, drehung: -3 });
const pZ = proj(new THREE.Vector3(LINIE_X + 0.9 + 1.6, 1.9, -1.25));
const knall = el("div", "knall", `<svg viewBox="-235 -150 470 300"><path d="${(() => {
  let d = ""; const n = 22;
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2; const r = i % 2 ? 0.74 : 1; d += (i ? "L" : "M") + (Math.cos(a) * 230 * r).toFixed(1) + "," + (Math.sin(a) * 145 * r).toFixed(1); }
  return d + "Z";
})()}" fill="#ff4d2e" stroke="#111" stroke-width="9" stroke-linejoin="round"/></svg><span>ÜBERHOLT!</span>`, hud);
knall.style.left = Math.min(Math.max(pZ.x + 30, 290), 690) + "px";
knall.style.top = (pZ.y - 250) + "px";
knall.querySelector("path").setAttribute("fill", "#1f7bff");
phrase(hud);
zonen(hud);

fertig(() => renderer.render(szene, kamera));
