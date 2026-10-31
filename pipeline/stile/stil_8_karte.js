// Stil 8 · Karten- und Satellitenoptik: frei erfundene Landschaft aus der Vogelperspektive
// (prozedural gemalt, keine echten Kartendaten), geneigte Kamera, leuchtende Routen für Bahn und Auto.
import * as THREE from "three";
import { Buehne } from "../engine/kern.js";
import { INHALT, WUERFEL, el, untertitel, zonen, fertig, zufall } from "./gemeinsam.js";

const zz = zufall(31);
const N = 2048; // Kantenlänge der Kartentextur in Pixeln
const W = 16; // Kantenlänge der Karte in Welt-Einheiten

// ---------- Wege (Kartenpixel) ----------
const HEIM = [690, 1500], BUERO = [1360, 610];
const BAHN = [[520, 2140], [610, 1760], [HEIM[0], HEIM[1]], [770, 1250], [900, 1030], [1110, 800], [BUERO[0], BUERO[1]], [1470, 380], [1560, -80]];
const STRASSE = [[880, 2140], [790, 1740], [HEIM[0], HEIM[1]], [880, 1450], [1040, 1290], [1010, 1100], [1110, 950], [1230, 880], [1250, 760], [1300, 680], [BUERO[0], BUERO[1]], [1600, 520], [2140, 470]];
const FLUSS = [[-80, 1130], [300, 1210], [560, 1090], [900, 1180], [1220, 1080], [1500, 1180], [1800, 1100], [2140, 1160]];

function kurve(g, punkte) {
  const c = new THREE.CatmullRomCurve3(punkte.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, "centripetal");
  const p = c.getPoints(240);
  g.beginPath();
  g.moveTo(p[0].x, p[0].y);
  for (const q of p) g.lineTo(q.x, q.y);
  return c;
}

// ---------- Satellitenbild malen ----------
const cv = document.createElement("canvas");
cv.width = cv.height = N;
const g = cv.getContext("2d");
g.fillStyle = "#33452B";
g.fillRect(0, 0, N, N);
// Felder: gedrehte Parzellen mit Heckenfugen und Furchen
const FELD = ["#6E7A3E", "#8B874D", "#56703A", "#A39C6B", "#5F7C40", "#7C8A4A", "#9A8C5A", "#4D6633"];
for (let gy = -1; gy < 31; gy++) {
  for (let gx = -1; gx < 31; gx++) {
    const cx = gx * 68 + (zz() - 0.5) * 24, cy = gy * 68 + (zz() - 0.5) * 24;
    const w = 44 + zz() * 56, h = 38 + zz() * 62, rot = (zz() - 0.5) * 0.35 + 0.12;
    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    g.fillStyle = FELD[Math.floor(zz() * FELD.length)];
    g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = "rgba(0,0,0,0.10)";
    g.lineWidth = 2;
    for (let k = -w / 2 + 4; k < w / 2; k += 5) { g.beginPath(); g.moveTo(k, -h / 2); g.lineTo(k, h / 2); g.stroke(); }
    g.strokeStyle = "#2B3A24";
    g.lineWidth = 3;
    g.strokeRect(-w / 2, -h / 2, w, h);
    g.restore();
  }
}
// Wald: dichte, dunkle Baumkronen
function wald(cx, cy, r, n) {
  for (let i = 0; i < n; i++) {
    const a = zz() * Math.PI * 2, d = Math.sqrt(zz()) * r;
    const x = cx + Math.cos(a) * d * 1.3, y = cy + Math.sin(a) * d;
    g.fillStyle = ["#1E3420", "#24402A", "#2C4A2E", "#183019"][Math.floor(zz() * 4)];
    g.beginPath(); g.arc(x, y, 5 + zz() * 9, 0, Math.PI * 2); g.fill();
  }
}
wald(330, 820, 230, 2600); wald(1650, 1500, 260, 3000); wald(1180, 1450, 140, 1100); wald(1750, 260, 200, 1800); wald(250, 1800, 180, 1500);
// Fluss
kurve(g, FLUSS);
g.strokeStyle = "#5C6B4E"; g.lineWidth = 34; g.lineCap = "round"; g.lineJoin = "round"; g.stroke();
kurve(g, FLUSS);
g.strokeStyle = "#24435A"; g.lineWidth = 24; g.stroke();
// Orte: Dächer in Rasterblöcken
function ort(cx, cy, r, n, gross = 1) {
  g.fillStyle = "#6E6A5E";
  g.beginPath(); g.ellipse(cx, cy, r * 1.15, r * 0.95, 0.3, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < n; i++) {
    const a = zz() * Math.PI * 2, d = Math.sqrt(zz()) * r;
    const x = cx + Math.cos(a) * d * 1.1, y = cy + Math.sin(a) * d * 0.9;
    const s = (10 + zz() * 16) * gross;
    g.save(); g.translate(x, y); g.rotate(0.3 + Math.round(zz()) * Math.PI / 2);
    g.fillStyle = ["#9C6B58", "#B9B2A8", "#8E8D8A", "#A87A62", "#C9C3B8"][Math.floor(zz() * 5)];
    g.fillRect(-s / 2, -s * 0.35, s, s * 0.7);
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.fillRect(-s / 2, s * 0.05, s, s * 0.3);
    g.restore();
  }
}
ort(HEIM[0] - 30, HEIM[1] + 20, 120, 260);
ort(BUERO[0] + 40, BUERO[1] - 20, 210, 620, 1.35);
ort(1700, 900, 70, 80); ort(380, 1250, 60, 60);
// Straßen und Gleis
function linie(punkte, farbe, breite) { kurve(g, punkte); g.strokeStyle = farbe; g.lineWidth = breite; g.stroke(); }
linie([[0, 600], [500, 650], [900, 520], [1300, 430], [2048, 300]], "#8E8B80", 8);
linie([[1100, 2048], [1250, 1600], [1500, 1350], [2048, 1250]], "#8E8B80", 8);
linie(STRASSE, "#3B3A36", 22); linie(STRASSE, "#A9A69A", 15);
linie(BAHN, "#4A433B", 16); linie(BAHN, "#6F665A", 9);
kurve(g, BAHN); g.strokeStyle = "rgba(20,18,15,0.8)"; g.lineWidth = 2; g.setLineDash([3, 6]); g.stroke(); g.setLineDash([]);
// Körnung und Farbabgleich wie bei einem Luftbild
const bild = g.getImageData(0, 0, N, N);
for (let i = 0; i < bild.data.length; i += 4) {
  const n = (zz() - 0.5) * 22;
  bild.data[i] = Math.min(255, Math.max(0, bild.data[i] * 0.95 + n));
  bild.data[i + 1] = Math.min(255, Math.max(0, bild.data[i + 1] * 0.97 + n));
  bild.data[i + 2] = Math.min(255, Math.max(0, bild.data[i + 2] * 0.92 + n + 4));
}
g.putImageData(bild, 0, 0);

// ---------- 3D ----------
const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 4, schatten: false });
const szene = new THREE.Scene();
szene.background = new THREE.Color("#0B1220");
szene.fog = new THREE.Fog("#0F1A2E", 20, 36);
const tex = new THREE.CanvasTexture(cv);
tex.colorSpace = THREE.SRGBColorSpace;
tex.anisotropy = buehne.renderer.capabilities.getMaxAnisotropy();
// Bodenfläche dreimal so groß, Textur gespiegelt fortgesetzt: keine sichtbare Kartenkante
tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
tex.repeat.set(3, 3);
tex.offset.set(-1, -1);
const boden = new THREE.Mesh(new THREE.PlaneGeometry(W * 3, W * 3), new THREE.MeshBasicMaterial({ map: tex }));
boden.rotation.x = -Math.PI / 2;
szene.add(boden);
const welt3 = ([x, y], h = 0) => new THREE.Vector3((x / N - 0.5) * W, h, (y / N - 0.5) * W);

// Stadt in 3D: Blöcke mit Licht von links oben
szene.add(new THREE.HemisphereLight("#cfd8e8", "#2a3020", 1.4));
const licht = new THREE.DirectionalLight("#fff3e0", 1.6);
licht.position.set(-4, 6, 3);
szene.add(licht);
const blockGeo = new THREE.BoxGeometry(1, 1, 1);
blockGeo.translate(0, 0.5, 0);
for (let i = 0; i < 70; i++) {
  const a = zz() * Math.PI * 2, d = Math.sqrt(zz()) * 150;
  const p = welt3([BUERO[0] + 40 + Math.cos(a) * d * 1.2, BUERO[1] - 20 + Math.sin(a) * d]);
  const h = 0.08 + Math.pow(zz(), 2.2) * (d < 70 ? 0.9 : 0.35);
  const b = new THREE.Mesh(blockGeo, new THREE.MeshLambertMaterial({ color: ["#B9B6AE", "#9DA3AD", "#C7C1B4", "#8E96A3"][i % 4] }));
  b.scale.set(0.12 + zz() * 0.12, h, 0.12 + zz() * 0.12);
  b.position.copy(p);
  b.rotation.y = 0.3;
  szene.add(b);
}

// Leuchtende Routen (HDR-Farbe → Bloom)
function route(punkte, farbe, h) {
  const kurve3 = new THREE.CatmullRomCurve3(punkte.map((p) => welt3(p, h)), false, "centripetal");
  const kern = new THREE.Mesh(new THREE.TubeGeometry(kurve3, 400, 0.032, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(3.2), toneMapped: false, fog: false }));
  const hof = new THREE.Mesh(new THREE.TubeGeometry(kurve3, 400, 0.07, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(0.8), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  szene.add(hof, kern);
  return kurve3;
}
const heimIdx = 2;
const kBahn = route(BAHN.slice(heimIdx, 7), "#4DA3FF", 0.03);
const kStr = route(STRASSE.slice(heimIdx, 11), "#FF8A2A", 0.05);
function marker(kurve3, t, farbe) {
  const p = kurve3.getPointAt(t);
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(5), toneMapped: false, fog: false }));
  m.position.copy(p);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.25, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(2.5), transparent: true, opacity: 0.8, toneMapped: false, side: THREE.DoubleSide, fog: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(p);
  szene.add(m, ring);
  return p;
}
marker(kBahn, 0.5, "#9CCBFF");
marker(kStr, 0.42, "#FFB070");

const kamera = new THREE.PerspectiveCamera(46, 1080 / 1920, 0.05, 60);
kamera.position.set(0.57, 20.6, 14.4);
kamera.lookAt(0.35, 0, -0.6);
kamera.updateMatrixWorld();

const welt = { szene, kamera, post: { bloomStaerke: 0.9, bloomSchwelle: 1.0, tiltMitte: 0.42, tiltBreite: 0.42, tiltStaerke: 0.55, vignette: 0.35, saettigung: 1.02, kontrast: 1.06, belichtung: 1.15, koernung: 0.03 } };

// ---------- HUD ----------
const hud = document.getElementById("hud");
el("div", "abdunkeln", "", hud);
el("div", "marke", `<div class="glas logo">${WUERFEL}SIMULIERBAR</div><div class="rubrik">€ GELD</div>`, hud);
const ROUTE = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none"><circle cx="6" cy="18" r="3" stroke="#9fc3ff" stroke-width="2.4"/><circle cx="18" cy="6" r="3" stroke="#9fc3ff" stroke-width="2.4"/><path d="M8.5 16.5C14 14 10 9 15.5 7.5" stroke="#9fc3ff" stroke-width="2.4" stroke-dasharray="2.5 3" stroke-linecap="round"/></svg>`;
el("div", "titel", `<div class="klein">${ROUTE}${INHALT.duell}</div><div class="gross">${INHALT.frage}</div>`, hud);
const ICON_ZUG = `<svg width="44" height="44" viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="14" rx="3.5" fill="#fff"/><rect x="7.5" y="6" width="9" height="4.5" rx="1" fill="#4DA3FF"/><circle cx="9" cy="13.6" r="1.3" fill="#4DA3FF"/><circle cx="15" cy="13.6" r="1.3" fill="#4DA3FF"/><path d="M8 17.5 6 21M16 17.5 18 21" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
const ICON_AUTO = `<svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M4 15.5V12l1.6-4.1A2 2 0 0 1 7.5 6.6h9a2 2 0 0 1 1.9 1.3L20 12v3.5a1 1 0 0 1-1 1h-1.2a2 2 0 0 1-3.6 0H9.8a2 2 0 0 1-3.6 0H5a1 1 0 0 1-1-1Z" fill="#fff"/><path d="M6.4 11.2 7.4 8.6h9.2l1 2.6Z" fill="#FF8A2A"/></svg>`;
el("div", "glas karte a", `<div class="icon">${ICON_ZUG}</div><div class="wer">TEAM ${INHALT.a.team.toUpperCase()}</div><div class="betrag">${INHALT.a.wert}</div><div class="einheit">${INHALT.a.einheit}</div>`, hud);
el("div", "glas karte b", `<div class="icon">${ICON_AUTO}</div><div class="wer">TEAM ${INHALT.b.team.toUpperCase()}</div><div class="betrag">${INHALT.b.wert}</div><div class="einheit">${INHALT.b.einheit}</div>`, hud);
el("div", "glas hinweis", `${INHALT.hinweis} · Karte erfunden`, hud);
const bild2 = (v) => { const p = v.clone().project(kamera); return { x: (p.x + 1) / 2 * 1080, y: (1 - p.y) / 2 * 1920 }; };
function pin(punkt, text) {
  const s = bild2(welt3(punkt));
  const e = el("div", "pin", `<div class="schild">${text}</div><div class="nadel"></div><div class="fuss"></div>`, hud);
  e.style.left = s.x + "px";
  e.style.top = s.y + 8 + "px";
}
pin(HEIM, "Zuhause");
pin(BUERO, "Büro");
untertitel(hud);
zonen(hud);

fertig((t) => buehne.zeichne(welt, { t, bildNr: 0 }));
