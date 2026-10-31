// Stil 2 · Isometrisches 3D: schwebende Diorama-Kachel, orthografische Kamera (35,26° / 45°),
// flache Facetten, harte Schatten, keine Unschärfe. Links Team Ticket (Bahn), rechts Team Auto (Straße).
import * as THREE from "three";
import { INHALT, WUERFEL, el, untertitel, zonen, fertig, zufall } from "./gemeinsam.js";

const zz = zufall(11);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("leinwand"), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(1080, 1920, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const szene = new THREE.Scene();
// Hintergrund: weicher Lavendel-Verlauf
const hg = document.createElement("canvas");
hg.width = 4; hg.height = 512;
const g2 = hg.getContext("2d");
const lin = g2.createLinearGradient(0, 0, 0, 512);
lin.addColorStop(0, "#E6E8FD"); lin.addColorStop(0.55, "#D6DAFB"); lin.addColorStop(1, "#C3C8F4");
g2.fillStyle = lin; g2.fillRect(0, 0, 4, 512);
szene.background = new THREE.CanvasTexture(hg);
szene.background.colorSpace = THREE.SRGBColorSpace;

szene.add(new THREE.HemisphereLight("#ffffff", "#b9bfe8", 1.35));
const sonne = new THREE.DirectionalLight("#ffffff", 2.3);
sonne.position.set(-6, 14, 9); // oben hell, linke Seite mittel, rechte Seite dunkel
sonne.castShadow = true;
sonne.shadow.mapSize.set(4096, 4096);
Object.assign(sonne.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
sonne.shadow.bias = -0.0006;
szene.add(sonne);

const matCache = new Map();
const m = (farbe) => {
  if (!matCache.has(farbe)) matCache.set(farbe, new THREE.MeshLambertMaterial({ color: farbe, flatShading: true }));
  return matCache.get(farbe);
};
function box(w, h, d, farbe, x, y, z, eltern = szene, { schatten = true } = {}) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(farbe));
  b.position.set(x, y + h / 2, z);
  b.castShadow = schatten;
  b.receiveShadow = true;
  eltern.add(b);
  return b;
}

// ---------- Kachel ----------
const S = 9;
box(S, 0.22, S, "#93D27C", 0, -0.22, 0);
box(S, 0.55, S, "#D9A56B", 0, -0.77, 0, szene, { schatten: false });
box(S, 0.7, S, "#B98352", 0, -1.47, 0, szene, { schatten: false });
// kleine Steine in der Erdschicht
for (let i = 0; i < 14; i++) {
  const s = box(0.22, 0.12, 0.02, "#9C6C42", -4 + zz() * 8, -1.3 + zz() * 0.8, S / 2 + 0.01);
  s.castShadow = false;
}

// ---------- Bahn (links, entlang z) ----------
const RX = -2.2;
box(1.5, 0.1, S, "#CFCBDC", RX, 0, 0);
for (let i = 0; i < 20; i++) box(1.15, 0.05, 0.16, "#8B6F5A", RX, 0.1, -S / 2 + 0.25 + i * 0.45);
for (const dx of [-0.34, 0.34]) box(0.07, 0.07, S, "#8E93A8", RX + dx, 0.15, 0);
// Zug: zwei kantige Wagen, Fahrtrichtung +z (zur Kamera)
function wagen(z, kopf) {
  const g = new THREE.Group();
  box(0.9, 0.85, 2.5, "#2F6FED", 0, 0.08, 0, g);
  box(0.92, 0.26, 2.1, "#1E2A4A", 0, 0.52, 0, g);
  box(0.92, 0.07, 2.4, "#FFFFFF", 0, 0.4, 0, g);
  box(0.6, 0.1, 2.0, "#E6E9F5", 0, 0.93, 0, g);
  if (kopf) {
    box(0.8, 0.28, 0.06, "#1E2A4A", 0, 0.52, 1.25, g);
    box(0.16, 0.08, 0.04, "#FFF3C4", -0.25, 0.25, 1.27, g);
    box(0.16, 0.08, 0.04, "#FFF3C4", 0.25, 0.25, 1.27, g);
  }
  g.position.set(RX, 0.12, z);
  szene.add(g);
}
wagen(-0.2, true);
wagen(-2.85, false);
// Bahnsteig mit Dach und Wartenden
box(0.9, 0.32, 4.6, "#E9E7F2", RX - 1.25, 0, -1.2);
box(1.0, 0.1, 1.9, "#FFD23F", RX - 1.3, 1.3, -1.6);
for (const z of [-2.3, -0.9]) box(0.08, 0.98, 0.08, "#5B6080", RX - 1.55, 0.32, z);
for (let i = 0; i < 3; i++) {
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.42, 6), m(["#2F6FED", "#19B36B", "#FF7A9A"][i]));
  f.position.set(RX - 1.1 - (i % 2) * 0.25, 0.53, -2.6 + i * 0.75);
  f.castShadow = true;
  szene.add(f);
  const k = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), m("#FFD9B8"));
  k.position.set(f.position.x, 0.84, f.position.z);
  k.castShadow = true;
  szene.add(k);
}
// Bahnhofshäuschen
box(1.1, 1.0, 1.4, "#F4F1FA", RX - 1.3, 0, 2.6);
const dachG = new THREE.ConeGeometry(1.0, 0.6, 4);
dachG.rotateY(Math.PI / 4);
const dach1 = new THREE.Mesh(dachG, m("#2F6FED"));
dach1.scale.set(0.85, 1, 1.05);
dach1.position.set(RX - 1.3, 1.3, 2.6);
dach1.castShadow = true;
szene.add(dach1);

// ---------- Straße (rechts, entlang z) ----------
const SX = 1.35;
box(2.3, 0.06, S, "#5E6479", SX, 0, 0);
for (let i = 0; i < 9; i++) box(0.08, 0.02, 0.5, "#FFFFFF", SX, 0.06, -S / 2 + 0.5 + i * 1.0);
for (const dx of [-1.22, 1.22]) box(0.14, 0.1, S, "#E9EAF2", SX + dx, 0, 0);
function auto(farbe, x, z, richtung = 1) {
  const g = new THREE.Group();
  box(0.62, 0.3, 1.15, farbe, 0, 0.1, 0, g);
  box(0.56, 0.26, 0.62, "#26304A", 0, 0.4, -0.06, g);
  box(0.5, 0.06, 0.55, farbe, 0, 0.66, -0.06, g);
  for (const [wx, wz] of [[-0.31, 0.36], [0.31, 0.36], [-0.31, -0.36], [0.31, -0.36]]) box(0.08, 0.2, 0.22, "#22263A", wx, 0, wz, g);
  box(0.14, 0.07, 0.03, "#FFF3C4", -0.2, 0.25, 0.58, g);
  box(0.14, 0.07, 0.03, "#FFF3C4", 0.2, 0.25, 0.58, g);
  g.position.set(x, 0.06, z);
  g.rotation.y = richtung > 0 ? 0 : Math.PI;
  szene.add(g);
  return g;
}
auto("#FF7A1A", SX - 0.55, -0.9, 1);
auto("#F4F4F8", SX + 0.55, -3.3, -1);
auto("#C9CEE6", SX - 0.55, 2.6, 1);
// Tankstelle (Kosten des Autos)
box(1.9, 0.12, 2.0, "#E9E7F2", 3.55, 0, -2.6);
for (const [x, z] of [[2.9, -3.3], [4.2, -3.3], [2.9, -1.9], [4.2, -1.9]]) box(0.1, 1.25, 0.1, "#5B6080", x, 0.12, z);
box(1.8, 0.16, 1.9, "#FF7A1A", 3.55, 1.37, -2.6);
box(1.8, 0.05, 1.9, "#FFFFFF", 3.55, 1.53, -2.6);
box(0.3, 0.6, 0.3, "#F4F4F8", 3.55, 0.12, -2.95);
box(0.3, 0.6, 0.3, "#F4F4F8", 3.55, 0.12, -2.2);
box(0.12, 1.6, 0.12, "#5B6080", 3.9, 0, 0.6);
box(0.12, 0.62, 0.7, "#FF7A1A", 3.9, 1.6, 0.6);
box(0.13, 0.12, 0.5, "#FFFFFF", 3.9, 1.95, 0.6);
// Haus vorne rechts
box(1.4, 0.9, 1.3, "#FFFFFF", 3.5, 0, 3.0);
const dach2 = new THREE.Mesh(dachG, m("#FF7A1A"));
dach2.scale.set(1.05, 1, 0.95);
dach2.position.set(3.5, 1.2, 3.0);
dach2.castShadow = true;
szene.add(dach2);

// ---------- Bäume (Grünstreifen und Ränder) ----------
const kroneG = new THREE.ConeGeometry(0.42, 1.05, 6);
const kroneK = new THREE.IcosahedronGeometry(0.42, 0);
function baum(x, z, s = 1, rund = false) {
  const st = box(0.12 * s, 0.3 * s, 0.12 * s, "#8B5E3C", x, 0, z);
  const k = new THREE.Mesh(rund ? kroneK : kroneG, m(zz() < 0.5 ? "#3FAE5C" : "#58C26E"));
  k.scale.setScalar(s);
  k.position.set(x, (rund ? 0.62 : 0.78) * s, z);
  k.castShadow = true;
  szene.add(k);
}
for (let i = 0; i < 8; i++) baum(-0.42 + (i % 2) * 0.32, -3.9 + i * 1.1, 0.85 + zz() * 0.3, i % 3 === 0);
baum(-4.0, -3.9, 1.1); baum(-4.0, -3.0, 0.9, true); baum(-3.95, 4.0, 1.0); baum(2.7, 4.1, 0.9, true); baum(4.1, 1.9, 0.8); baum(-4.05, 1.0, 0.9, true);

// ---------- Kamera: echte Isometrie ----------
const B = 15.4, H = B * 1920 / 1080;
const kamera = new THREE.OrthographicCamera(-B / 2, B / 2, H / 2, -H / 2, 0.1, 100);
const ziel = new THREE.Vector3(0.15, 0.4, 0.15);
kamera.position.copy(ziel).add(new THREE.Vector3(20, 20 * Math.SQRT2 * Math.tan(35.264 * Math.PI / 180), 20));
kamera.lookAt(ziel);
// Isometrie bleibt erhalten, die Kachel wird nur im Bildausschnitt verschoben
kamera.top = H / 2 + 1.2; kamera.bottom = -H / 2 + 1.2;
kamera.updateProjectionMatrix();
kamera.updateMatrixWorld();

// ---------- HUD ----------
const hud = document.getElementById("hud");
el("div", "marke", `<div class="block logo">${WUERFEL}SIMULIERBAR</div><div class="block rubrik">€ GELD</div>`, hud);
el("div", "titel", `<div class="klein">${INHALT.duell}</div><div class="gross">${INHALT.frage}</div>`, hud);
const p = (x, y, z) => {
  const v = new THREE.Vector3(x, y, z).project(kamera);
  return { x: (v.x + 1) / 2 * 1080, y: (1 - v.y) / 2 * 1920 };
};
const linien = el("div", "", "", hud);
linien.innerHTML = `<svg width="1080" height="1920" style="position:absolute;inset:0"></svg>`;
const svg = linien.firstChild;
function preisschild(klasse, anker, tagX, tagY, team, wert) {
  const a = p(...anker);
  // Führungslinie mit Knick: senkrecht aus dem Schild, dann schräg zum Objekt
  const knickY = tagY + 46;
  svg.insertAdjacentHTML("beforeend", `<polyline points="${tagX},${tagY} ${tagX},${knickY} ${a.x},${a.y}" fill="none" stroke="#1c1d3a" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`);
  el("div", "fuss", "", hud).style.cssText = `left:${a.x}px;top:${a.y}px`;
  const t = el("div", `tag ${klasse}`, `<div class="wer"><i></i>TEAM ${team.toUpperCase()}</div><div class="betrag">${wert}</div><div class="einheit">${INHALT.a.einheit}</div>`, hud);
  t.style.left = tagX + "px";
  t.style.top = tagY + "px";
}
preisschild("a", [RX, 1.15, -0.4], 252, 738, INHALT.a.team, INHALT.a.wert);
preisschild("b", [SX - 0.55, 0.8, -0.9], 690, 738, INHALT.b.team, INHALT.b.wert);
el("div", "vs", "<span>VS</span>", hud).style.cssText = "left:474px;top:640px";
el("div", "hinweis", INHALT.hinweis, hud);
untertitel(hud);
zonen(hud);

fertig(() => renderer.render(szene, kamera));
