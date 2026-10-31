// Stil 3 · Clay-Spielzeug-3D: Knetfiguren auf einer runden Platte, Pastellfarben,
// matte Oberfläche mit feiner Fingerabdruck-Struktur, sehr weiche Schatten, leichte Tiefenunschärfe.
// Münzstapel zeigen die Kosten (3 gegen 10 Münzen ≈ 66,80 € gegen 214 €).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Buehne } from "../engine/kern.js";
import { umgebung, verlauf } from "../engine/licht.js";
import { kontaktSchatten } from "../engine/bausteine.js";
import { INHALT, WUERFEL, el, untertitel, zonen, fertig, zufall } from "./gemeinsam.js";

const zz = zufall(5);
const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 4, schatten: true });
buehne.renderer.shadowMap.type = THREE.VSMShadowMap; // weiche Schatten mit großem Radius

const szene = new THREE.Scene();
szene.background = verlauf([[0, "#FBE3DA"], [0.5, "#F6CFC6"], [1, "#EDB8B4"]]);
szene.environment = umgebung(buehne.renderer);
szene.environmentIntensity = 0.35;
szene.add(new THREE.HemisphereLight("#FFF4EE", "#E7A9A6", 0.6));
const sonne = new THREE.DirectionalLight("#FFF2E6", 3.1);
sonne.position.set(-5, 11, 7);
sonne.castShadow = true;
sonne.shadow.mapSize.set(2048, 2048);
Object.assign(sonne.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 });
sonne.shadow.radius = 7;
sonne.shadow.blurSamples = 24;
sonne.shadow.bias = -0.002;
szene.add(sonne);

// Fingerabdruck-Struktur: feines Rauschen mit weichen Dellen als Bump-Map
const nc = document.createElement("canvas");
nc.width = nc.height = 512;
const ng = nc.getContext("2d");
ng.fillStyle = "#808080";
ng.fillRect(0, 0, 512, 512);
for (let i = 0; i < 900; i++) {
  const x = zz() * 512, y = zz() * 512, r = 4 + zz() * 22;
  const g = ng.createRadialGradient(x, y, 0, x, y, r);
  const hell = zz() < 0.5;
  g.addColorStop(0, hell ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)");
  g.addColorStop(1, "rgba(128,128,128,0)");
  ng.fillStyle = g;
  ng.beginPath(); ng.arc(x, y, r, 0, Math.PI * 2); ng.fill();
}
const bild = ng.getImageData(0, 0, 512, 512);
for (let i = 0; i < bild.data.length; i += 4) {
  const n = (zz() - 0.5) * 26;
  bild.data[i] += n; bild.data[i + 1] += n; bild.data[i + 2] += n;
}
ng.putImageData(bild, 0, 0);
const bump = new THREE.CanvasTexture(nc);
bump.wrapS = bump.wrapT = THREE.RepeatWrapping;

const matCache = new Map();
function knete(farbe, { glanz = 0 } = {}) {
  const k = farbe + glanz;
  if (!matCache.has(k)) {
    matCache.set(k, new THREE.MeshPhysicalMaterial({
      color: farbe, roughness: glanz ? 0.42 : 0.78, metalness: 0, bumpMap: bump, bumpScale: 1.6,
      sheen: 0.55, sheenRoughness: 0.85, sheenColor: new THREE.Color("#FFFFFF"), clearcoat: glanz, clearcoatRoughness: 0.5,
    }));
  }
  return matCache.get(k);
}
function rb(w, h, d, r, farbe, x, y, z, eltern = szene, opt = {}) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 6, Math.min(r, w / 2, h / 2, d / 2) * 0.999), knete(farbe, opt));
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  eltern.add(m);
  return m;
}
function kugel(r, farbe, x, y, z, eltern = szene, s = [1, 1, 1]) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 22), knete(farbe));
  m.position.set(x, y, z);
  m.scale.set(...s);
  m.castShadow = m.receiveShadow = true;
  eltern.add(m);
  return m;
}
function walze(r, h, farbe, x, y, z, eltern = szene, achse = "y") {
  const g = new THREE.CylinderGeometry(r, r, h, 36, 1);
  if (achse === "z") g.rotateX(Math.PI / 2);
  if (achse === "x") g.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(g, knete(farbe));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  eltern.add(m);
  return m;
}

// ---------- Platte ----------
rb(5.4, 0.5, 4.3, 0.32, "#A8E6C6", 0, -0.5, 0);
rb(5.6, 0.18, 4.5, 0.09, "#F3B7B0", 0, -0.66, 0);

// ---------- Gleis und Zug (hinten, Team Ticket) ----------
const GZ = -1.05;
for (let i = 0; i < 11; i++) rb(0.2, 0.09, 1.05, 0.04, "#D9A57B", -2.45 + i * 0.49, 0, GZ);
for (const dz of [-0.3, 0.3]) walze(0.055, 5.3, "#B9B2C9", 0, 0.12, GZ + dz, szene, "x");
const zug = new THREE.Group();
rb(2.3, 0.95, 0.92, 0.36, "#4E86F2", 0, 0.2, 0, zug);
rb(2.0, 0.2, 0.74, 0.1, "#BFD5FF", 0, 1.1, 0, zug);
for (let i = 0; i < 3; i++) rb(0.42, 0.32, 0.1, 0.12, "#2B3560", -0.75 + i * 0.55, 0.62, 0.43, zug);
for (let i = 0; i < 3; i++) kugel(0.045, "#FFFFFF", -0.86 + i * 0.55, 0.88, 0.49, zug);
rb(0.12, 0.42, 0.7, 0.06, "#2B3560", 1.12, 0.58, 0, zug); // Frontscheibe
kugel(0.09, "#FFE27A", 1.15, 0.38, 0.27, zug, [0.6, 1, 1]);
kugel(0.09, "#FFE27A", 1.15, 0.38, -0.27, zug, [0.6, 1, 1]);
rb(2.0, 0.08, 0.96, 0.04, "#FFFFFF", 0, 0.42, 0, zug);
for (const x of [-0.7, 0.7]) for (const z of [-0.36, 0.36]) walze(0.17, 0.12, "#4A3B5C", x, 0.2, z, zug, "z");
zug.position.set(-1.15, 0.12, GZ);
szene.add(zug);
zug.add(kontaktSchatten(2.8, 1.4, 0.28, "#7A3A4A"));

// ---------- Straße und Auto (vorne, Team Auto) ----------
const SZ = 0.95;
rb(5.3, 0.06, 1.35, 0.03, "#A9A3C4", 0, 0, SZ);
for (let i = 0; i < 6; i++) rb(0.42, 0.03, 0.09, 0.04, "#FFFFFF", -2.2 + i * 0.9, 0.06, SZ);
const auto = new THREE.Group();
rb(1.42, 0.5, 0.82, 0.24, "#FF8A3D", 0, 0.16, 0, auto);
rb(0.82, 0.46, 0.74, 0.22, "#FF8A3D", 0.08, 0.5, 0, auto);
rb(0.62, 0.28, 0.76, 0.12, "#BFE3FF", 0.08, 0.6, 0, auto, { glanz: 0.6 });
for (const x of [-0.45, 0.45]) for (const z of [-0.38, 0.38]) walze(0.17, 0.13, "#4A3B5C", x, 0.18, z, auto, "z");
kugel(0.08, "#FFF2B8", -0.71, 0.4, 0.24, auto, [0.6, 1, 1]);
kugel(0.08, "#FFF2B8", -0.71, 0.4, -0.24, auto, [0.6, 1, 1]);
auto.position.set(1.35, 0.06, SZ + 0.28);
szene.add(auto);
auto.add(kontaktSchatten(1.9, 1.2, 0.3, "#7A3A4A"));

// ---------- Münzstapel (Kosten) ----------
function stapel(n, x, z) {
  for (let i = 0; i < n; i++) {
    const c = walze(0.27, 0.1, "#FFC93C", x + (zz() - 0.5) * 0.05, 0.05 + i * 0.105, z + (zz() - 0.5) * 0.05);
    c.material = knete("#FFC93C", { glanz: 0.35 });
    c.rotation.y = zz();
  }
  const top = walze(0.16, 0.02, "#F2A922", x, 0.11 + (n - 1) * 0.105, z);
  top.material = knete("#F2A922");
}
stapel(3, -2.15, -0.12);
stapel(10, 2.3, -0.2);

// ---------- Bäume, Büsche, Wolken ----------
function baum(x, z, s = 1) {
  walze(0.07 * s, 0.5 * s, "#C98F6B", x, 0.25 * s, z);
  kugel(0.36 * s, zz() < 0.5 ? "#5CC98A" : "#7AD69C", x, 0.72 * s, z);
}
baum(-2.35, -1.75, 0.95); baum(2.3, -1.8, 1.1); baum(1.75, -1.85, 0.8); baum(-2.4, 1.85, 0.8); baum(2.45, 1.85, 0.9);
for (const [x, z] of [[-0.3, -0.25], [0.2, -0.2], [-0.05, -0.12]]) kugel(0.2, "#6FD196", x, 0.12, z, szene, [1, 0.75, 1]);
function wolke(x, y, z, s) {
  kugel(0.5 * s, "#FFFFFF", x, y, z);
  kugel(0.36 * s, "#FFFFFF", x - 0.55 * s, y - 0.1 * s, z);
  kugel(0.4 * s, "#FFFFFF", x + 0.55 * s, y - 0.06 * s, z);
}
wolke(-2.2, 3.4, -4.5, 1.1);
wolke(2.6, 4.2, -5.5, 0.9);

const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 100);
kamera.position.set(0.3, 10.8, 19.8);
kamera.lookAt(0, 0.55, -1.4);

const welt = {
  szene,
  kamera,
  post: { tiltMitte: 0.5, tiltBreite: 0.3, tiltStaerke: 0.55, bloomStaerke: 0.2, vignette: 0.12, saettigung: 1.18, kontrast: 1.07, belichtung: 0.95, koernung: 0.02 },
};

// ---------- HUD ----------
const hud = document.getElementById("hud");
el("div", "marke", `<div class="knete logo">${WUERFEL}SIMULIERBAR</div><div class="knete rubrik">€ GELD</div>`, hud);
el("div", "knete titel", `<div class="klein">${INHALT.duell}</div><div class="gross">${INHALT.frage}</div>`, hud);
el("div", "knete team a", `<div class="wer">TEAM ${INHALT.a.team.toUpperCase()}</div><div class="betrag">${INHALT.a.wert}</div><div class="einheit">${INHALT.a.einheit}</div>`, hud);
el("div", "knete team b", `<div class="wer">TEAM ${INHALT.b.team.toUpperCase()}</div><div class="betrag">${INHALT.b.wert}</div><div class="einheit">${INHALT.b.einheit}</div>`, hud);
el("div", "knete vs", "VS", hud);
el("div", "knete hinweis", INHALT.hinweis, hud);
untertitel(hud);
zonen(hud);

fertig((t) => buehne.zeichne(welt, { t, bildNr: 0 }));
