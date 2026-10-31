// Stil 1 · Low-Poly-Miniatur mit Tilt-Shift (aktueller Kanal-Stil)
// Nutzt die Engine (Buehne, Licht, Bausteine) nur per Import, ohne sie zu verändern.
import * as THREE from "three";
import { Buehne } from "../engine/kern.js";
import { lichtTag, verlauf } from "../engine/licht.js";
import * as B from "../engine/bausteine.js";
import { INHALT, WUERFEL, el, untertitel, zonen, fertig, zufall } from "./gemeinsam.js";

const zz = zufall(7);
const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 4, schatten: true });
const szene = new THREE.Scene();
szene.background = verlauf([[0, "#9CC3F0"], [0.35, "#CFE2F7"], [0.6, "#E9F1F6"], [1, "#E9F1F6"]]);
szene.fog = new THREE.Fog("#DCE9F3", 34, 70);
lichtTag(szene, buehne.renderer, { bereich: 16, ziel: [0, 0, -3], sonnenRichtung: [-0.5, 1.0, 0.45] });

// ---------- Boden mit Feldern ----------
const boden = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), B.mat("#B4DC97", { rau: 0.95 }));
boden.rotation.x = -Math.PI / 2;
boden.receiveShadow = true;
szene.add(boden);
const feldFarben = ["#A6D486", "#C5E3A6", "#E9DDB4", "#9ECB7E", "#D9E9B8"];
for (let i = 0; i < 46; i++) {
  const x = (zz() - 0.5) * 60, z = -6 - zz() * 50;
  if (Math.abs(x) < 6.5) continue;
  const f = new THREE.Mesh(new THREE.BoxGeometry(3 + zz() * 6, 0.02, 3 + zz() * 7), B.mat(feldFarben[i % 5], { rau: 0.95 }));
  f.position.set(x, 0.01, z);
  f.receiveShadow = true;
  szene.add(f);
}

// ---------- Bahnstrecke (links) ----------
const RX = -1.75;
const schotter = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 140), B.mat("#D8D0C3", { rau: 1 }));
schotter.position.set(RX, 0.05, -50);
schotter.receiveShadow = true;
szene.add(schotter);
const nSchw = 260;
const schwellen = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 0.05, 0.16), B.mat("#8B6F5A", { rau: 0.9 }), nSchw);
const m4 = new THREE.Matrix4();
for (let i = 0; i < nSchw; i++) {
  m4.makeTranslation(RX, 0.115, 18 - i * 0.5);
  schwellen.setMatrixAt(i, m4);
}
schwellen.receiveShadow = true;
szene.add(schwellen);
for (const dx of [-0.36, 0.36]) {
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 140), B.mat("#A7AFBF", { rau: 0.3, metall: 0.6 }));
  s.position.set(RX + dx, 0.17, -50);
  s.castShadow = true;
  szene.add(s);
}
// Oberleitungsmasten
for (let i = 0; i < 12; i++) {
  const z = 8 - i * 5.5;
  const mast = B.rundeBox(0.1, 1.7, 0.1, { farbe: "#7D8597", radius: 0.02 });
  mast.position.set(RX - 0.95, 0, z);
  const arm = B.rundeBox(1.1, 0.06, 0.06, { farbe: "#7D8597", radius: 0.02 });
  arm.position.set(RX - 0.45, 1.6, z);
  szene.add(mast, arm);
}

// Regionalzug (Team Ticket, blau), fährt auf die Kamera zu
function wagen({ laenge = 2.7, kopf = false } = {}) {
  const g = new THREE.Group();
  const k = B.rundeBox(0.92, 0.82, laenge, { farbe: "#2F6FED", radius: 0.16, segmente: 4 });
  k.position.y = 0.24;
  g.add(k);
  const fenster = B.rundeBox(0.95, 0.26, laenge - 0.5, { material: B.mat("#22304F", { rau: 0.15, metall: 0.2 }), radius: 0.08 });
  fenster.position.set(0, 0.62, -0.05);
  g.add(fenster);
  const streifen = B.rundeBox(0.94, 0.07, laenge - 0.2, { farbe: "#FFFFFF", radius: 0.03 });
  streifen.position.set(0, 0.46, 0);
  g.add(streifen);
  const dach = B.rundeBox(0.7, 0.1, laenge - 0.4, { farbe: "#E7ECF4", radius: 0.05 });
  dach.position.set(0, 1.05, 0);
  g.add(dach);
  const fahrwerk = B.rundeBox(0.7, 0.16, laenge - 0.5, { farbe: "#30384A", radius: 0.05 });
  fahrwerk.position.y = 0.12;
  g.add(fahrwerk);
  if (kopf) {
    const front = B.rundeBox(0.95, 0.3, 0.12, { material: B.mat("#22304F", { rau: 0.12, metall: 0.2 }), radius: 0.06 });
    front.position.set(0, 0.62, laenge / 2 - 0.02);
    g.add(front);
    const licht = B.leucht("#FFF4D6", 3.2);
    for (const x of [-0.3, 0.3]) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), licht);
      l.position.set(x, 0.38, laenge / 2 + 0.02);
      g.add(l);
    }
    const buegel = B.rundeBox(0.5, 0.05, 0.05, { farbe: "#5B6375", radius: 0.02 });
    buegel.position.set(0, 1.32, 0.3);
    buegel.rotation.x = 0.4;
    g.add(buegel);
  }
  g.add(B.kontaktSchatten(1.5, laenge * 1.15, 0.35));
  return g;
}
const zug = new THREE.Group();
[0, 1, 2].forEach((i) => {
  const w = wagen({ kopf: i === 0 });
  w.position.z = -i * 2.82;
  zug.add(w);
});
zug.position.set(RX, 0.16, -2.2);
szene.add(zug);

// Bahnsteig mit Dach
const steig = B.rundeBox(1.1, 0.32, 7, { farbe: "#E6E1D8", radius: 0.05 });
steig.position.set(RX - 1.45, 0, -8.5);
szene.add(steig);
const dachSteig = B.rundeBox(1.0, 0.08, 3.2, { farbe: "#FFD23F", radius: 0.04 });
dachSteig.position.set(RX - 1.55, 1.35, -8.8);
szene.add(dachSteig);
for (const z of [-7.6, -10]) {
  const p = B.rundeBox(0.08, 1.05, 0.08, { farbe: "#7D8597", radius: 0.02 });
  p.position.set(RX - 1.8, 0.32, z);
  szene.add(p);
}
for (let i = 0; i < 4; i++) {
  const f = B.figur({ farbe: ["#2F6FED", "#19B36B", "#FF9F8E", "#2F6FED"][i] });
  f.scale.setScalar(1.15);
  f.position.set(RX - 1.35 + (i % 2) * 0.25, 0.32, -7.4 - i * 0.7);
  f.rotation.y = Math.PI / 2;
  szene.add(f);
}

// ---------- Straße (rechts) ----------
const SX = 1.75;
const str = B.strasse({ laenge: 140, breite: 2.3, farbe: "#8E96A8" });
str.rotation.y = Math.PI / 2;
str.position.set(SX, 0, -50);
szene.add(str);
for (const dx of [-1.24, 1.24]) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 140), B.mat("#E4E7EE", { rau: 0.8 }));
  b.position.set(SX + dx, 0.04, -50);
  b.receiveShadow = true;
  szene.add(b);
}
// Pendlerauto (Team Auto, orange), fährt auf die Kamera zu (rechte Fahrspur = links im Bild)
const auto = B.auto({ farbe: "#FF7A1A", laenge: 1.05 });
auto.rotation.y = -Math.PI / 2;
auto.position.set(SX - 0.55, 0.05, -1.6);
szene.add(auto);
// weiterer Verkehr
const weitere = [[SX - 0.55, -4.4, "#F2F2F2", 1], [SX + 0.55, -6.6, "#C9D3E3", -1], [SX - 0.55, -9.0, "#F2F2F2", 1], [SX + 0.55, 1.5, "#F2F2F2", -1], [SX - 0.55, -14, "#D6DCE8", 1], [SX + 0.55, -18, "#F2F2F2", -1], [SX - 0.55, 3.5, "#D6DCE8", 1]];
for (const [x, z, f, r] of weitere) {
  const a = B.auto({ farbe: f });
  a.rotation.y = r > 0 ? -Math.PI / 2 : Math.PI / 2;
  a.position.set(x, 0.05, z);
  szene.add(a);
}

// ---------- Mittelstreifen, Bäume, Häuser, Stadt ----------
const hecke = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 140), B.mat("#9FCF84", { rau: 0.95 }));
hecke.position.set(0, 0.03, -50);
hecke.receiveShadow = true;
szene.add(hecke);
for (let i = 0; i < 26; i++) {
  const b = B.baum({ groesse: 0.9 + zz() * 0.35, seed: i + 3 });
  b.position.set((zz() - 0.5) * 0.3, 0.05, 6 - i * 2.1);
  szene.add(b);
}
const hausFarben = [["#FFFFFF", "#FF7A1A"], ["#FFF3E0", "#2F6FED"], ["#F8F6F1", "#19B36B"], ["#FFFFFF", "#FF9F8E"]];
for (let i = 0; i < 14; i++) {
  const seite = i % 2 ? 1 : -1;
  const [wand, dach] = hausFarben[i % 4];
  const h = B.haus({ wand, dach, breite: 1.4 + zz() * 0.4 });
  h.gruppe.position.set(seite * (5.2 + zz() * 3.5), 0, 2 - i * 3.2 - zz());
  h.gruppe.rotation.y = seite > 0 ? -Math.PI / 2 : Math.PI / 2;
  szene.add(h.gruppe);
}
for (let i = 0; i < 60; i++) {
  const x = (zz() < 0.5 ? -1 : 1) * (4.2 + zz() * 22);
  const z = 8 - zz() * 46;
  const b = B.baum({ groesse: 0.8 + zz() * 0.6, seed: i + 40, farbe: zz() < 0.5 ? "#5DBB7A" : "#4FAE6C" });
  b.position.set(x, 0, z);
  szene.add(b);
}
// Stadt am Horizont (Ziel der Pendler)
for (let i = 0; i < 9; i++) {
  const hh = B.hochhaus({ hoehe: 4 + zz() * 5, etagen: 8, spalten: 3, breite: 2, tiefe: 2, akzent: i % 2 ? "#2F6FED" : "#FF7A1A" });
  hh.gruppe.position.set(-10 + i * 2.6 + zz(), 0, -34 - zz() * 6);
  szene.add(hh.gruppe);
}

const kamera = new THREE.PerspectiveCamera(31, 1080 / 1920, 0.1, 200);
kamera.position.set(0.3, 10.5, 15.5);
kamera.lookAt(0, -0.4, -6.5);

const welt = {
  szene,
  kamera,
  post: { tiltMitte: 0.43, tiltBreite: 0.16, tiltStaerke: 1.0, bloomStaerke: 0.7, vignette: 0.16, saettigung: 1.08, koernung: 0.025 },
};

// ---------- HUD ----------
const hud = document.getElementById("hud");
el("div", "marke", `<div class="logo">${WUERFEL}SIMULIERBAR</div><div class="rubrik">€ GELD</div>`, hud);
el("div", "karte titelkarte", `<div class="label"><span class="punkt"></span>${INHALT.duell}</div><div class="gross">${INHALT.frage}</div>`, hud);
const anteil = (x) => Math.round((x / INHALT.b.zahl) * 100);
el("div", "karte team a", `<span class="flagge">TEAM ${INHALT.a.team.toUpperCase()}</span><div class="label">Kosten ${INHALT.a.einheit}</div><div class="wert">${INHALT.a.wert}</div><div class="balken"><i style="width:${anteil(INHALT.a.zahl)}%"></i></div>`, hud);
el("div", "karte team b", `<span class="flagge">TEAM ${INHALT.b.team.toUpperCase()}</span><div class="label">Kosten ${INHALT.b.einheit}</div><div class="wert">${INHALT.b.wert}</div><div class="balken"><i style="width:100%"></i></div>`, hud);
el("div", "hinweis", INHALT.hinweis, hud);
untertitel(hud);
zonen(hud);

fertig((t) => buehne.zeichne(welt, { t, bildNr: 0 }));
