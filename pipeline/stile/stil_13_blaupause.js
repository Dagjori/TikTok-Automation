// Stil 13 · Blaupause / Schnittmodell (Three.js): technische Zeichnung auf Blaupausen-Raster.
// Weiße Kanten (dicke Linien), verdeckte Kanten gestrichelt, das Auto als Röntgen-Schnitt mit eingefärbten
// Kostenteilen (Teamfarbe) und Beschriftungen mit Führungslinien. Rendert sehr schnell (keine Schatten, kein Licht).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { el, zonen, fertig } from "./gemeinsam.js";
import { INHALT9, anzeigetafel, chip, phrase } from "./massstab.js";

const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("leinwand"), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const szene = new THREE.Scene();

// ---------- Blaupausen-Papier: Verlauf, Raster, leichte Fleckigkeit ----------
function papier() {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const v = g.createRadialGradient(W * 0.5, H * 0.45, 100, W * 0.5, H * 0.5, 1300);
  v.addColorStop(0, "#1257a8"); v.addColorStop(1, "#0a3270");
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  for (let x = 0; x <= W; x += 27) { g.fillStyle = x % 135 === 0 ? "rgba(190,220,255,0.20)" : "rgba(190,220,255,0.08)"; g.fillRect(x, 0, x % 135 === 0 ? 2 : 1, H); }
  for (let y = 0; y <= H; y += 27) { g.fillStyle = y % 135 === 0 ? "rgba(190,220,255,0.20)" : "rgba(190,220,255,0.08)"; g.fillRect(0, y, W, y % 135 === 0 ? 2 : 1); }
  const bild = g.getImageData(0, 0, W, H);
  let s = 7;
  for (let i = 0; i < bild.data.length; i += 4) { s = (s * 16807) % 2147483647; const n = ((s / 2147483647) - 0.5) * 10; bild.data[i] += n; bild.data[i + 1] += n; bild.data[i + 2] += n; }
  g.putImageData(bild, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
szene.background = papier();

// ---------- Zeichen-Bausteine ----------
const AUFL = new THREE.Vector2(W, H);
const linienMat = (farbe, breite, { gestrichelt = false, verdeckt = false, deckkraft = 1 } = {}) => {
  const m = new LineMaterial({ color: farbe, linewidth: breite, resolution: AUFL, dashed: gestrichelt, dashSize: 0.09, gapSize: 0.07, transparent: deckkraft < 1 || verdeckt, opacity: verdeckt ? 0.42 : deckkraft });
  if (verdeckt) { m.depthFunc = THREE.GreaterDepth; m.depthWrite = false; }
  else { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -6; }
  return m;
};
const FUELL = new THREE.MeshBasicMaterial({ color: "#0f4a96", polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 6 });

/** Körper zeichnen: Füllung (deckend oder durchsichtig), sichtbare Kanten durchgezogen, verdeckte gestrichelt */
function koerper(geo, { x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, farbe = "#ffffff", fuellung = FUELL, winkel = 24, breite = 3.2, verdeckt = true, eltern = szene } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.set(rx, ry, rz);
  if (fuellung) g.add(new THREE.Mesh(geo, fuellung));
  const kanten = new THREE.EdgesGeometry(geo, winkel);
  const lg = new LineSegmentsGeometry().fromEdgesGeometry(kanten);
  g.add(new LineSegments2(lg, linienMat(farbe, breite)));
  if (verdeckt) {
    const l2 = new LineSegments2(lg, linienMat(farbe, breite * 0.7, { gestrichelt: true, verdeckt: true }));
    l2.computeLineDistances();
    g.add(l2);
  }
  eltern.add(g);
  return g;
}
/** Einzelne Linien (z. B. Gleis, Straße, Maßlinien) */
function linien(punkte, { farbe = "#d8ecff", breite = 2.2, gestrichelt = false, deckkraft = 1 } = {}) {
  const lg = new LineSegmentsGeometry().setPositions(punkte.flat());
  const l = new LineSegments2(lg, linienMat(farbe, breite, { gestrichelt, deckkraft }));
  if (gestrichelt) l.computeLineDistances();
  szene.add(l);
  return l;
}
const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 2, r);

// ---------- Fahrbahn und Gleis (auf dem Boden) ----------
const X0 = -9, X1 = 9;
const ZS = 1.2;   // Straßenmitte
const ZG = -3.0;  // Gleismitte
for (const dz of [-1.25, 1.25]) linien([[X0, 0, ZS + dz, X1, 0, ZS + dz]], { breite: 2.6 });
for (let x = X0; x < X1; x += 1.1) linien([[x, 0, ZS, x + 0.6, 0, ZS]], { breite: 2.2, deckkraft: 0.8 });
for (const dz of [-0.55, 0.55]) linien([[X0, 0.12, ZG + dz, X1, 0.12, ZG + dz]], { breite: 2.6 });
for (let x = X0; x < X1; x += 0.5) linien([[x, 0.02, ZG - 0.85, x, 0.02, ZG + 0.85]], { breite: 1.6, deckkraft: 0.55 });

// ---------- Zug (Team Ticket): deckende Füllung, Akzentstreifen in Teamfarbe ----------
const A = "#35d0ff", B = "#ff9a3c";
const zug = new THREE.Group();
szene.add(zug);
/** Wagenkasten als extrudiertes Seitenprofil: saubere Umrisslinien statt Facetten */
function wagenProfil(laenge, hoehe, nase) {
  const sh = new THREE.Shape();
  const x0 = -laenge / 2, x1 = laenge / 2, r = 0.28;
  sh.moveTo(x0 + r, 0);
  sh.lineTo(x1 - r, 0); sh.absarc(x1 - r, r, r, -Math.PI / 2, 0, false);
  if (nase) { sh.lineTo(x1, hoehe - 0.9); sh.quadraticCurveTo(x1, hoehe, x1 - 0.9, hoehe); }
  else { sh.lineTo(x1, hoehe - r); sh.absarc(x1 - r, hoehe - r, r, 0, Math.PI / 2, false); }
  sh.lineTo(x0 + r, hoehe); sh.absarc(x0 + r, hoehe - r, r, Math.PI / 2, Math.PI, false);
  sh.lineTo(x0, r); sh.absarc(x0 + r, r, r, Math.PI, Math.PI * 1.5, false);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, -hoehe / 2, -0.75);
  return g;
}
for (const [x0, laenge, nase] of [[0, 5.6, true], [-5.75, 5.6, false]]) {
  koerper(wagenProfil(laenge, 1.85, nase), { x: x0, y: 1.25, eltern: zug, winkel: 40 });
for (let i = 0; i < 6; i++) koerper(rbox(0.6, 0.55, 0.05, 0.08), { x: x0 - laenge / 2 + 0.7 + i * 0.84, y: 1.5, z: 0.76, eltern: zug, verdeckt: false, breite: 2.4 });
  koerper(new THREE.BoxGeometry(laenge - 0.2, 0.14, 0.02), { x: x0, y: 0.75, z: 0.765, eltern: zug, farbe: A, fuellung: new THREE.MeshBasicMaterial({ color: A }), verdeckt: false, breite: 2 });
  for (const dx of [-laenge / 2 + 0.8, laenge / 2 - 0.8]) for (const dz of [-0.6, 0.6]) {
    const r = new THREE.CylinderGeometry(0.3, 0.3, 0.14, 28); r.rotateX(Math.PI / 2);
    koerper(r, { x: x0 + dx, y: 0.3, z: dz, eltern: zug, winkel: 30 });
  }
}
zug.position.set(-0.25, 0.05, ZG);

// ---------- Auto (Team Auto) als Röntgen-Schnitt ----------
const auto = new THREE.Group();
szene.add(auto);
const profil = new THREE.Shape();
[[-2.15, 0.3], [2.1, 0.3], [2.2, 0.62], [2.12, 0.86], [1.2, 0.98], [0.55, 1.52], [-0.95, 1.55], [-1.75, 1.02], [-2.2, 0.9]].forEach(([x, y], i) => (i ? profil.lineTo(x, y) : profil.moveTo(x, y)));
profil.closePath();
const karosserie = new THREE.ExtrudeGeometry(profil, { depth: 1.7, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 });
karosserie.translate(0, 0, -0.85);
const glas = new THREE.MeshBasicMaterial({ color: "#7fb8ff", transparent: true, opacity: 0.1, depthWrite: false });
koerper(karosserie, { eltern: auto, fuellung: glas, verdeckt: false, winkel: 28, breite: 3.4 });
// Fensterlinien
linienAuf(auto, [[0.45, 1.42, 0.88, -0.75, 1.45, 0.88], [-0.75, 1.45, 0.88, -1.5, 1.04, 0.88], [-1.5, 1.04, 0.88, 1.1, 0.98, 0.88], [1.1, 0.98, 0.88, 0.45, 1.42, 0.88], [-0.2, 1.45, 0.88, -0.2, 1.0, 0.88]]);
function linienAuf(eltern, punkte) {
  const lg = new LineSegmentsGeometry().setPositions(punkte.flat());
  eltern.add(new LineSegments2(lg, linienMat("#ffffff", 2.4)));
}
// Kostenteile in Teamfarbe
const orange = new THREE.MeshBasicMaterial({ color: B, transparent: true, opacity: 0.85 });
const motor = koerper(new THREE.BoxGeometry(0.95, 0.55, 1.0), { x: 1.45, y: 0.72, eltern: auto, fuellung: orange, verdeckt: false, breite: 2.6 });
koerper(new THREE.BoxGeometry(0.5, 0.22, 0.8), { x: 1.45, y: 1.1, eltern: auto, fuellung: orange, verdeckt: false, breite: 2.2 });
const tank = koerper(new THREE.BoxGeometry(1.0, 0.32, 1.1), { x: -1.25, y: 0.5, eltern: auto, fuellung: orange, verdeckt: false, breite: 2.6 });
koerper(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 10).rotateZ(Math.PI / 2), { x: -0.6, y: 0.4, z: -0.3, eltern: auto, fuellung: orange, verdeckt: false, breite: 2 });
const schild = koerper(new THREE.BoxGeometry(0.04, 0.2, 0.75), { x: -2.24, y: 0.7, eltern: auto, fuellung: new THREE.MeshBasicMaterial({ color: B }), verdeckt: false, breite: 2.2 });
for (const dx of [-1.35, 1.35]) for (const dz of [-0.82, 0.82]) {
  const r = new THREE.CylinderGeometry(0.4, 0.4, 0.28, 32); r.rotateX(Math.PI / 2);
  koerper(r, { x: dx, y: 0.4, z: dz, eltern: auto, winkel: 30, breite: 3 });
  const n = new THREE.CylinderGeometry(0.18, 0.18, 0.3, 20); n.rotateX(Math.PI / 2);
  koerper(n, { x: dx, y: 0.4, z: dz, eltern: auto, winkel: 30, breite: 2, fuellung: null, verdeckt: false });
}
auto.position.set(0.15, 0.0, ZS);

// ---------- Kamera: Axonometrie (orthografisch) ----------
const HOEHE = 16.4;
const kamera = new THREE.OrthographicCamera(-HOEHE * W / H / 2, HOEHE * W / H / 2, HOEHE / 2, -HOEHE / 2, 0.1, 100);
const ziel = new THREE.Vector3(-0.35, 0.1, -0.8);
kamera.position.copy(ziel).add(new THREE.Vector3(3.0, 6.3, 13));
kamera.lookAt(ziel);
kamera.updateMatrixWorld();

// ---------- HUD: Tafel, Beschriftungen mit Führungslinien, Chip, Untertitel ----------
const hud = document.getElementById("hud");
anzeigetafel(hud);
const proj = (obj, off = [0, 0, 0]) => {
  obj.updateMatrixWorld(true);
  const p = new THREE.Vector3(...off).applyMatrix4(obj.matrixWorld).project(kamera);
  return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H };
};
const svg = el("div", "", "", hud);
const linienSvg = [];
function beschriftung(text, klein, anker, x, y, team = "b", seite = "links") {
  const l = el("div", `label ${team}`, `${text}<small>${klein}</small>`, hud);
  l.style.top = y + "px";
  if (seite === "links") l.style.left = x + "px"; else l.style.right = (W - x) + "px";
  const kx = seite === "links" ? x + l.offsetWidth : x - l.offsetWidth;
  const ky = y + l.offsetHeight / 2;
  const farbe = team === "a" ? "#6fe0ff" : "#ffb36b";
  linienSvg.push(`<polyline points="${kx},${ky} ${(kx + anker.x) / 2},${ky} ${anker.x},${anker.y}" fill="none" stroke="${farbe}" stroke-width="3"/><circle cx="${anker.x}" cy="${anker.y}" r="9" fill="${farbe}" stroke="#0a3270" stroke-width="3"/>`);
}
const pT = proj(zug, [0.6, 2.0, 0.75]), pK = proj(auto, [-0.3, 1.55, 0.3]), pM = proj(motor), pS = proj(schild), pTa = proj(tank);
beschriftung("Ticket", "alle Fahrten pauschal", pT, 54, 462, "a");
beschriftung("Wertverlust", "Karosserie", pK, 54, 820, "b");
beschriftung("Steuer + Vers.", "Kennzeichen", pS, 54, 958, "b");
beschriftung("Sprit", "Tank, Verbrauch", pTa, 54, 1096, "b");
beschriftung("Wartung", "Motor, Reifen", pM, 930, 1190, "b", "rechts");
el("div", "", `<svg class="linien" viewBox="0 0 ${W} ${H}">${linienSvg.join("")}</svg>`, hud);
const pc = proj(zug, [2.8, 2.2, 0]);
chip(hud, `${INHALT9.chip} · Fahrt 13`, { x: 452, y: 1278 });
phrase(hud);
zonen(hud);

fertig(() => renderer.render(szene, kamera));
