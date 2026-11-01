// Account 2, Video: „Stell dir vor, dein Auto wiegt so viel wie ein Kasten Wasser.“
// Stil 16 „POV-Filmlook stilisiert“: Ich-Kamera am Steuer, Autobahn im Abendlicht, Bloom, Countdown aus 5 Segmenten (Prototyp
// „schall-schritttempo“). Zähler: Tacho (km/h), Kraft im Gurt (g), Kräfteduell Reifen gegen Luft (N), Gewicht.
// Rechnung: ../../sim/leichtes_auto.mjs (Tests: node --test sim/leichtes_auto.test.mjs).
// Drei Fünf-Sekunden-Fenster (Gas weg, Vollgas, Lkw), danach „Warum?“ in der Totalen mit Kraftpfeilen.
// Deterministisch: window.renderAt(t). Kein Logo, kein Kanalname, keine Rubrik im Bild, keine Automarken.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Buehne } from "../../engine/kern.js";
import { verlauf } from "../../engine/licht.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD, el } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash, keyframes } from "../../engine/bewegung.js";
import { mat } from "../../engine/bausteine.js";
import * as S from "../../sim/leichtes_auto.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 0;
const BLOOM = Q.has("bloom") ? +Q.get("bloom") : 0.8;
const SKALA = Q.has("skala") ? +Q.get("skala") : 1; // interne 3D-Auflösung (HUD bleibt scharf)
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

// Teamfarben (überall gleich): Reifen/Auto = Koralle, Luft = Türkis. Kein Gelb (Gelb = aktuelles Untertitel-Wort).
const KORALLE = "#FF4F5A";
const TUERKIS = "#2EC4B6";

// Geometrie (Meter). Fahrtrichtung −z. Mittlere Spur (x = 0), 3 Spuren à 3,75 m, Standstreifen rechts.
const SPUR = 3.75;
const CAM_X = -0.37, CAM_Y = 1.2; // Linkslenker: Kopf 0,37 m links der Wagenmitte
const FRONT_Z = -2.3; // Stoßstange vorn
const P0 = -0.15; // Grundneigung des Blicks (rad, nach unten): Horizont im oberen Drittel, Straße über dem Armaturenbrett
const MASTER = 288; // alle Muster wiederholen sich in einem Teiler von 288 m → Schleife schließt
const kmhOf = (v) => v * 3.6;

// =====================================================================================
// Bausteine der Welt
// =====================================================================================
function canvasTextur(b, h, malen, { wiederholen = false } = {}) {
  const c = document.createElement("canvas");
  c.width = b; c.height = h;
  malen(c.getContext("2d"), b, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (wiederholen) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const rbox = (b, h, t, r, m) => new THREE.Mesh(new RoundedBoxGeometry(b, h, t, 3, r), m);
const box = (b, h, t, m) => new THREE.Mesh(new THREE.BoxGeometry(b, h, t), m);
const leuchtMat = (farbe, st = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(st), toneMapped: false });

/** Instanzierte Wiederholung: set(i, x, y, z, sx, sy, sz, ry) */
function instanz(geo, material, n) {
  const m = new THREE.InstancedMesh(geo, material, n);
  m.frustumCulled = false;
  const o = new THREE.Object3D();
  m.setze = (i, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) => {
    o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(0, ry, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
  };
  return m;
}
/** Abstand nach vorn (m) eines Musters mit Periode L, das sich mit P gegen die Kamera bewegt (Bereich [−zurueck, L − zurueck)) */
const vorn = (z0, P, L, zurueck = 20) => ((((z0 - P) % L) + L) % L) - zurueck;

function autoBauen(farbe, { dach = null, laenge = 4.3, breite = 1.8, scheinwerfer = false } = {}) {
  const g = new THREE.Group();
  const lack = mat(farbe, { rau: 0.35, metall: 0.15 });
  const glas = mat("#1B2233", { rau: 0.15, metall: 0.5 });
  const unten = rbox(breite, 0.62, laenge, 0.18, lack); unten.position.y = 0.62; g.add(unten);
  const kabine = rbox(breite - 0.18, 0.55, laenge * 0.5, 0.2, glas); kabine.position.set(0, 1.12, laenge * 0.06); g.add(kabine);
  const dachM = rbox(breite - 0.26, 0.1, laenge * 0.42, 0.05, dach ? mat(dach, { rau: 0.35 }) : lack); dachM.position.set(0, 1.43, laenge * 0.06); g.add(dachM);
  const radGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14); radGeo.rotateZ(Math.PI / 2);
  const radM = mat("#15171D", { rau: 0.8 });
  for (const sx of [-1, 1]) for (const z of [-laenge * 0.32, laenge * 0.32]) { const r = new THREE.Mesh(radGeo, radM); r.position.set(sx * (breite / 2 - 0.05), 0.33, z); g.add(r); }
  const rueck = leuchtMat("#FF2A3A", 2.4);
  for (const sx of [-1, 1]) { const l = box(0.42, 0.13, 0.05, rueck); l.position.set(sx * (breite / 2 - 0.3), 0.8, laenge / 2 + 0.01); g.add(l); }
  const front = leuchtMat("#FFF1DE", scheinwerfer ? 4 : 1.6);
  for (const sx of [-1, 1]) { const l = box(0.36, 0.1, 0.05, front); l.position.set(sx * (breite / 2 - 0.3), 0.76, -laenge / 2 - 0.01); g.add(l); }
  return g;
}

function lkwBauen() {
  const g = new THREE.Group();
  const B = 2.55;
  const kabine = mat("#E5E8EE", { rau: 0.4 });
  const plane = canvasTextur(512, 128, (c, w, h) => {
    c.fillStyle = "#C9CFDA"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#AEB6C6"; for (let i = 0; i < 16; i++) c.fillRect(i * 32 + 2, 0, 3, h);
    c.fillStyle = "#3B4A78"; c.fillRect(0, h * 0.72, w, h * 0.12);
  }, { wiederholen: true });
  plane.repeat.set(3, 1);
  const kasten = new THREE.Mesh(new THREE.BoxGeometry(B, 3.0, 13.4), new THREE.MeshStandardMaterial({ map: plane, roughness: 0.6 }));
  kasten.position.set(0, 2.5, 2.4 + 6.7 + 0.2); g.add(kasten);
  const fahrerhaus = rbox(B, 2.55, 2.4, 0.12, kabine); fahrerhaus.position.set(0, 2.05, 1.2); g.add(fahrerhaus);
  const scheibe = box(B - 0.3, 0.95, 0.05, mat("#141A28", { rau: 0.1, metall: 0.6 })); scheibe.position.set(0, 2.7, -0.02); g.add(scheibe);
  const grill = box(B - 0.4, 0.8, 0.06, mat("#2A3040", { rau: 0.5, metall: 0.3 })); grill.position.set(0, 1.35, -0.02); g.add(grill);
  const stoss = box(B, 0.3, 0.2, mat("#2F3544")); stoss.position.set(0, 0.62, -0.1); g.add(stoss);
  const hl = leuchtMat("#FFF1DE", 5);
  for (const sx of [-1, 1]) { const l = box(0.34, 0.2, 0.06, hl); l.position.set(sx * (B / 2 - 0.3), 1.08, -0.06); g.add(l); }
  const rahmen = box(B - 0.2, 0.35, 15.3, mat("#1B1F2B")); rahmen.position.set(0, 0.7, 7.7); g.add(rahmen);
  const radGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16); radGeo.rotateZ(Math.PI / 2);
  const radM = mat("#14161C", { rau: 0.85 });
  for (const z of [1.0, 9.6, 11.0, 12.4]) for (const sx of [-1, 1]) { const r = new THREE.Mesh(radGeo, radM); r.position.set(sx * (B / 2 - 0.1), 0.5, z + 0.3); g.add(r); }
  for (const sx of [-1, 1]) { const l = box(0.4, 0.14, 0.05, leuchtMat("#FF2A3A", 2.4)); l.position.set(sx * (B / 2 - 0.3), 0.9, 15.6); g.add(l); }
  return g;
}

function pfeilBauen(farbe) {
  // Pfeil entlang +z: setze(len) = Gesamtlänge in m, Spitze (0,5 m) am Ende
  const g = new THREE.Group();
  const m = leuchtMat(farbe, 2.2);
  const schaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1, 12), m); schaft.rotation.x = Math.PI / 2; g.add(schaft);
  const spitze = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 14), m); spitze.rotation.x = Math.PI / 2; g.add(spitze);
  g.setze = (len) => { const l = Math.max(0.02, len), sl = Math.max(0.01, l - 0.5); schaft.scale.y = sl; schaft.position.z = sl / 2; spitze.position.z = sl + 0.25; spitze.visible = l > 0.3; schaft.visible = l > 0.55; };
  return g;
}

function baueWelt(buehne, cfg) {
  const szene = new THREE.Scene();
  szene.background = verlauf([[0, "#1D2C5E"], [0.22, "#4A66B0"], [0.38, "#B6A2B8"], [0.47, "#F7B98A"], [0.55, "#F2B88F"], [1, "#6E5A5A"]]);
  szene.fog = new THREE.Fog("#EDB48C", 40, 330);

  const hemi = new THREE.HemisphereLight("#C8D6FF", "#8A7A72", 1.35);
  szene.add(hemi);
  const sonne = new THREE.DirectionalLight("#FFB880", 2.1);
  sonne.position.set(-30, 26, 38); sonne.target.position.set(0, 0, -10);
  szene.add(sonne, sonne.target);
  const kontra = new THREE.DirectionalLight("#9DB6FF", 0.5);
  kontra.position.set(40, 12, -50);
  szene.add(kontra);

  // --- Gelände und Fahrbahn ---
  const gras = box(500, 0.2, 900, mat("#5E7646", { rau: 1 })); gras.position.set(0, -0.12, -300); szene.add(gras);
  const asphaltM = mat("#5E6171", { rau: 0.92 });
  const strasse = box(11.5, 0.12, 900, asphaltM); strasse.position.set(0, -0.05, -300); szene.add(strasse);
  const stand = box(3.0, 0.12, 900, mat("#575A66", { rau: 0.95 })); stand.position.set(7.0, -0.055, -300); szene.add(stand);
  const mittelstreifen = box(4.4, 0.12, 900, mat("#667A4C", { rau: 1 })); mittelstreifen.position.set(-8.35, -0.05, -300); szene.add(mittelstreifen);
  const gegenfahrbahn = box(11.5, 0.12, 900, asphaltM); gegenfahrbahn.position.set(-16.3, -0.05, -300); szene.add(gegenfahrbahn);
  const weiss = mat("#F2F3F7", { rau: 0.6, emissiv: "#F2F3F7", emissivStaerke: 0.12 });
  for (const x of [-5.7, 5.7]) { const l = box(0.2, 0.02, 900, weiss); l.position.set(x, 0.015, -300); szene.add(l); }
  for (const x of [-10.6]) { const l = box(0.2, 0.02, 900, weiss); l.position.set(x, 0.015, -300); szene.add(l); }
  // Leitplanken (Balken, Pfosten laufen als Instanzen)
  const stahl = mat("#B8BFCC", { rau: 0.45, metall: 0.6 });
  const planke = (x) => { const b = box(0.14, 0.34, 900, stahl); b.position.set(x, 0.72, -300); szene.add(b); const r = box(0.1, 0.1, 900, stahl); r.position.set(x, 0.38, -300); szene.add(r); };
  planke(8.7); planke(-7.6); planke(-9.1);
  // Hügel in der Ferne
  const huegelM = mat("#5B6A8C", { rau: 1 });
  for (let i = 0; i < 9; i++) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), huegelM);
    h.scale.set(60 + hash(i, 3) * 60, 14 + hash(i, 4) * 26, 30); h.position.set(-260 + i * 70 + hash(i, 5) * 20, -4, -420 - hash(i, 6) * 40); szene.add(h);
  }
  const sonnenscheibe = new THREE.Mesh(new THREE.CircleGeometry(16, 36), leuchtMat("#FFD9A8", 3.4));
  sonnenscheibe.position.set(55, 40, -480); szene.add(sonnenscheibe);

  // --- Laufende Muster (alle Perioden teilen 288) ---
  const dashes = instanz(new THREE.BoxGeometry(0.16, 0.012, 6), weiss, 2 * 16);
  const fugen = instanz(new THREE.BoxGeometry(11.4, 0.01, 0.12), mat("#363944", { rau: 1 }), 24);
  const pfostenGeo = new THREE.BoxGeometry(0.12, 0.8, 0.12);
  const pfosten = instanz(pfostenGeo, mat("#7B8294", { rau: 0.6, metall: 0.3 }), 3 * 72);
  const leitpfosten = instanz(new THREE.BoxGeometry(0.1, 0.95, 0.1), mat("#F4F6FA", { rau: 0.5, emissiv: "#FFFFFF", emissivStaerke: 0.25 }), 2 * 6);
  const leitStreifen = instanz(new THREE.BoxGeometry(0.11, 0.18, 0.11), mat("#12151D"), 2 * 6);
  szene.add(dashes, fugen, pfosten, leitpfosten, leitStreifen);

  // Bäume: Kegel + Stamm, rechts und links, Position deterministisch mit Periode 288
  const NB = 56;
  const kronen = instanz(new THREE.ConeGeometry(1, 1, 7), mat("#35573E", { rau: 1 }), NB * 2);
  const kronen2 = instanz(new THREE.ConeGeometry(1, 1, 7), mat("#46703F", { rau: 1 }), NB * 2);
  const staemme = instanz(new THREE.CylinderGeometry(0.15, 0.2, 1, 6), mat("#4A3828", { rau: 1 }), NB * 2);
  szene.add(kronen, kronen2, staemme);
  const baumDaten = [];
  for (let s = 0; s < 2; s++) for (let i = 0; i < NB; i++) {
    baumDaten.push({ z0: (i + hash(i, 40 + s)) * (MASTER / NB), x: s ? 12.5 + hash(i, 50 + s) * 24 : -33 - hash(i, 60 + s) * 26, h: 4.5 + hash(i, 70 + s) * 5.5, b: 1.5 + hash(i, 80 + s) * 1.0 });
  }

  // Schilderbrücke (alle 288 m) und Richtgeschwindigkeits-Schild
  const bruecke = new THREE.Group();
  const stahlD = mat("#8B93A5", { rau: 0.5, metall: 0.5 });
  for (const x of [-10.2, 9.8]) { const st = box(0.35, 7, 0.35, stahlD); st.position.set(x, 3.5, 0); bruecke.add(st); }
  const traeger = box(20.8, 0.5, 0.5, stahlD); traeger.position.set(-0.2, 6.6, 0); bruecke.add(traeger);
  const schildTex = (text, pfeil) => canvasTextur(1024, 512, (c, w, h) => {
    c.fillStyle = "#1F5FD6"; c.fillRect(0, 0, w, h);
    c.strokeStyle = "#FFFFFF"; c.lineWidth = 14; c.strokeRect(14, 14, w - 28, h - 28);
    c.fillStyle = "#FFFFFF"; c.font = '800 150px "SB Display", Inter, sans-serif'; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(text, w / 2, h * 0.42);
    c.font = '700 70px "SB Display", Inter, sans-serif'; c.fillText(pfeil, w / 2, h * 0.78);
  });
  for (const [x, t1, t2] of [[-3.8, "A 12", "Rosenau 5 km"], [4.2, "A 12", "Waldstadt 12 km"]]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.8, 0.15), [mat("#1F5FD6"), mat("#1F5FD6"), mat("#1F5FD6"), mat("#1F5FD6"), new THREE.MeshStandardMaterial({ map: schildTex(t1, t2), roughness: 0.5, emissive: "#FFFFFF", emissiveMap: schildTex(t1, t2), emissiveIntensity: 0.18 }), mat("#16367F")]);
    s.position.set(x, 5.0, 0.3); bruecke.add(s);
  }
  szene.add(bruecke);
  const richtTex = canvasTextur(256, 256, (c, w, h) => {
    c.fillStyle = "#1F5FD6"; c.fillRect(0, 0, w, h); c.strokeStyle = "#fff"; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16);
    c.fillStyle = "#fff"; c.font = '900 120px "SB Display", Inter, sans-serif'; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("130", w / 2, h * 0.5);
  });
  const richt = new THREE.Group();
  const mast = box(0.1, 3.0, 0.1, stahlD); mast.position.y = 1.5; richt.add(mast);
  const tafel = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.06), [mat("#16367F"), mat("#16367F"), mat("#16367F"), mat("#16367F"), new THREE.MeshStandardMaterial({ map: richtTex, roughness: 0.5, emissive: "#fff", emissiveMap: richtTex, emissiveIntensity: 0.2 }), mat("#16367F")]);
  tafel.position.set(0, 3.1, 0.06); richt.add(tafel);
  szene.add(richt);

  // --- Fahrzeuge ---
  const autoFarben = ["#E9EDF5", "#3B4F8C", "#B9BEC9", "#2E6F5E"];
  const autos = cfg.autos.map((c, i) => { const a = autoBauen(autoFarben[i % 4], { scheinwerfer: c.x < -2 }); a.rotation.y = c.x < 0 && c.v > 0 && c.gegen ? Math.PI : 0; szene.add(a); return a; });
  const lkw = lkwBauen(); lkw.visible = false; szene.add(lkw);

  // --- Dein Auto (nur in der Totalen) mit Kraftpfeilen ---
  const ich = autoBauen(KORALLE, { dach: "#FF8A92" });
  ich.visible = false; szene.add(ich);
  const pfeilReifen = pfeilBauen(KORALLE), pfeilLuft = pfeilBauen(TUERKIS);
  pfeilReifen.visible = false; pfeilLuft.visible = false; szene.add(pfeilReifen, pfeilLuft);

  // --- Cockpit (feststehend im Wagen, Kopf bewegt sich relativ dazu) ---
  const cockpit = new THREE.Group();
  const dunkel = mat("#4B5476", { rau: 0.75 });
  const dunkel2 = mat("#2C3350", { rau: 0.6 });
  const armatur = rbox(1.7, 0.16, 0.42, 0.05, dunkel); armatur.position.set(0, 0.74, -1.05); cockpit.add(armatur);
  const armaturUnten = box(1.7, 0.5, 0.5, dunkel2); armaturUnten.position.set(0, 0.45, -0.85); cockpit.add(armaturUnten);
  const haube = rbox(0.58, 0.1, 0.22, 0.04, dunkel2); haube.position.set(CAM_X, 0.855, -0.95); haube.rotation.x = 0.1; cockpit.add(haube);
  const instrTex = canvasTextur(512, 200, () => {});
  const instrCtx = instrTex.image.getContext("2d");
  const instr = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.18), new THREE.MeshBasicMaterial({ map: instrTex, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) }));
  instr.position.set(CAM_X, 0.86, -0.78); instr.rotation.x = -0.45; cockpit.add(instr);
  const lenkrad = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.024, 12, 40), mat("#202433", { rau: 0.55 })); lenkrad.add(rim);
  for (const w of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) { const sp = box(0.03, 0.17, 0.02, dunkel2); sp.position.set(Math.sin(w) * 0.09, Math.cos(w) * 0.09, 0); sp.rotation.z = -w; lenkrad.add(sp); }
  const nabe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 16), dunkel2); nabe.rotation.x = Math.PI / 2; lenkrad.add(nabe);
  lenkrad.position.set(CAM_X, 0.60, -0.55); lenkrad.rotation.x = -0.95; cockpit.add(lenkrad);
  const haut = mat("#E3AE88", { rau: 0.6 }), aermel = mat("#3A4D80", { rau: 0.85 });
  for (const s of [-1, 1]) {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), haut);
    hand.position.set(CAM_X + s * 0.19, 0.60 + 0.02, -0.55 + 0.02); cockpit.add(hand);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.5, 4, 10), aermel);
    arm.position.set(CAM_X + s * 0.26, 0.74, -0.30); arm.rotation.set(1.2, 0, s * -0.22); cockpit.add(arm);
  }
  // Karosserie: Boden, Türen, A-Säulen
  const boden = box(1.9, 0.06, 3.2, mat("#3D4566", { rau: 0.95 })); boden.position.set(0, 0.26, -0.3); cockpit.add(boden);
  const tuer = (x) => { const d = box(0.1, 0.62, 2.4, dunkel); d.position.set(x, 0.74, -0.2); cockpit.add(d); const l = box(0.04, 0.05, 2.3, mat("#8A93AA", { rau: 0.4, metall: 0.5 })); l.position.set(x - Math.sign(x) * 0.03, 1.06, -0.2); cockpit.add(l); };
  tuer(-0.98); tuer(0.98);
  const saeule = (x) => { const s = box(0.12, 1.0, 0.14, dunkel2); s.position.set(x, 1.5, -1.05); s.rotation.set(0.62, 0, -Math.sign(x) * 0.14); cockpit.add(s); const m2 = box(0.1, 0.05, 1.0, dunkel2); m2.position.set(x, 1.0, -0.55); cockpit.add(m2); };
  saeule(-0.9); saeule(0.9);
  const spiegel = rbox(0.28, 0.07, 0.04, 0.02, dunkel2); spiegel.position.set(0, 1.64, -0.95); cockpit.add(spiegel);
  // Pedale und Fuß
  const pedalM = mat("#8A93AA", { rau: 0.5, metall: 0.5 });
  const gaspedal = box(0.07, 0.22, 0.03, pedalM); gaspedal.position.set(CAM_X + 0.22, 0.30, -0.78); gaspedal.rotation.x = -0.5; cockpit.add(gaspedal);
  const bremse = box(0.11, 0.2, 0.03, pedalM); bremse.position.set(CAM_X - 0.05, 0.30, -0.78); bremse.rotation.x = -0.5; cockpit.add(bremse);
  const fuss = new THREE.Group();
  const schuh = rbox(0.11, 0.09, 0.30, 0.04, mat("#E8ECF5", { rau: 0.7 })); schuh.position.set(0, 0, 0); fuss.add(schuh);
  const bein = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.6, 4, 10), mat("#3A4260", { rau: 0.8 })); bein.rotation.x = 1.15; bein.position.set(0, 0.28, 0.32); fuss.add(bein);
  fuss.position.set(CAM_X + 0.22, 0.36, -0.62); cockpit.add(fuss);
  // Kasten Wasser auf dem Beifahrersitz (12 Flaschen, 3 × 4)
  const sitz = rbox(0.55, 0.2, 0.55, 0.05, mat("#5A6590", { rau: 0.9 })); sitz.position.set(0.5, 0.40, 0.0); cockpit.add(sitz);
  const lehne = rbox(0.55, 0.7, 0.14, 0.05, mat("#5A6590", { rau: 0.9 })); lehne.position.set(0.5, 0.78, 0.38); lehne.rotation.x = -0.12; cockpit.add(lehne);
  const kasten = new THREE.Group();
  const kastenM = mat("#2B6CB0", { rau: 0.6 });
  const kb = box(0.40, 0.04, 0.30, kastenM); kb.position.y = 0.02; kasten.add(kb);
  for (const [sx, sz, b, t] of [[0, -0.14, 0.40, 0.02], [0, 0.14, 0.40, 0.02], [-0.19, 0, 0.02, 0.30], [0.19, 0, 0.02, 0.30]]) { const w = box(b, 0.13, t, kastenM); w.position.set(sx, 0.09, sz); kasten.add(w); }
  const flaschenGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.30, 10);
  const flaschenM = new THREE.MeshStandardMaterial({ color: "#9EDCE6", roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.62 });
  const deckelM = mat("#FFFFFF", { rau: 0.5 });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const f = new THREE.Mesh(flaschenGeo, flaschenM); f.position.set(-0.15 + i * 0.1, 0.20, -0.1 + j * 0.1); kasten.add(f);
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.025, 8), deckelM); d.position.set(f.position.x, 0.365, f.position.z); kasten.add(d);
  }
  kasten.position.set(0.5, 0.51, 0.02); cockpit.add(kasten);
  szene.add(cockpit);

  return { szene, autos, lkw, ich, pfeilReifen, pfeilLuft, cockpit, fuss, gaspedal, instrCtx, instrTex, lenkrad,
    muster: { dashes, fugen, pfosten, leitpfosten, leitStreifen, kronen, kronen2, staemme, baumDaten, bruecke, richt }, sonne, hemi, kasten };
}

// =====================================================================================
// Countdown-HUD aus 5 Segmenten (Prototyp): Koralle = verbleibend, #3B3F55 = abgelaufen
// =====================================================================================
class Countdown {
  constructor(M, wurzel, { tauFn, tauRoh, von, bis, marken }) {
    this.M = M; this.tauFn = tauFn; this.tauRoh = tauRoh; this.von = von; this.bis = bis; this.marken = marken;
    this.e = el("div", "ms ms-countdown", `<div class="cd-reihe">${"<div class='cd-seg'><i></i></div>".repeat(5)}</div><div class="cd-zahl">5,0<small>s</small></div>`, wurzel);
    this.segs = [...this.e.querySelectorAll(".cd-seg")];
    this.balken = this.segs.map((s) => s.querySelector("i"));
    this.zahl = this.e.querySelector(".cd-zahl");
    this._letzt = null;
  }
  update(t) {
    const tau = clamp(this.tauFn(t), 0, 5);
    this.segs.forEach((s, i) => {
      const f = clamp(i + 1 - tau, 0, 1);
      this.balken[i].style.transform = `scaleX(${f.toFixed(4)})`;
      s.classList.toggle("aktiv", tau > i + 0.001 && tau < i + 1 - 0.001 && t > this.von);
    });
    const rest = Math.max(0, 5 - tau);
    const txt = rest.toFixed(1).replace(".", ",");
    if (txt !== this._letzt) { this.zahl.innerHTML = `${txt}<small>s</small>`; this._letzt = txt; }
    this.zahl.classList.toggle("null", rest <= 0.001);
    const ph = tau % 1, puls = tau > 0.001 && tau < 4.999 ? Math.exp(-ph * 9) * 0.06 : 0;
    this.e.style.transform = `scale(${(1 + puls).toFixed(4)})`;
  }
  ereignisse() {
    const ev = [];
    for (const [a, b] of this.M.laufIntervalle((t) => +clamp(this.tauRoh(t), 0, 5).toFixed(1), this.von, this.bis)) ev.push({ t: a, typ: "uhr", dauer: b - a, laufend: true, klang: "uhr" });
    for (const t of this.marken) ev.push({ t, typ: "marke", klang: "tick", text: "Sekunde vorbei" });
    return ev;
  }
}

// =====================================================================================
// Instrumente: Tacho, Gurt (g), Kräfteduell (N), Gewicht
// =====================================================================================
const fmtZ = (x, nk = 0) => x.toFixed(nk).replace(".", ",");
const fmtTausend = (x) => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
class Instrumente {
  constructor(M, wurzel, f) {
    this.M = M; this.f = f;
    this.tacho = el("div", "in in-tacho", `<span class="lab">TACHO</span><div class="zeile"><b class="num">130</b><small>km/h</small></div>`, wurzel);
    this.tachoZ = this.tacho.querySelector(".num");
    this.gurt = el("div", "in in-karte in-gurt", `<span class="lab">GURT</span><div class="bahn"><i></i><u class="spitze"></u><span class="spitzeZahl">MAX 3,2</span></div><b class="num">0,0<small>g</small></b>`, wurzel);
    this.gurtBalken = this.gurt.querySelector("i"); this.gurtSpitze = this.gurt.querySelector(".spitze"); this.gurtSpitzeZahl = this.gurt.querySelector(".spitzeZahl"); this.gurtZ = this.gurt.querySelector(".num");
    this.kr = el("div", "in in-karte in-kr", `<div class="kopf"><div class="seite l"><span class="lab">REIFEN</span><b class="num">0<small>N</small></b></div><div class="seite r"><span class="lab">LUFT</span><b class="num">473<small>N</small></b></div></div><div class="bahn"><b class="bl"></b><b class="br"></b></div><div class="marke"></div><span class="markeZahl">MAX 147 N</span><span class="flag">RÄDER DREHEN DURCH</span>`, wurzel);
    this.krL = this.kr.querySelector(".seite.l .num"); this.krR = this.kr.querySelector(".seite.r .num"); this.krLab = this.kr.querySelector(".seite.r .lab"); this.krLabL = this.kr.querySelector(".seite.l .lab");
    this.bl = this.kr.querySelector(".bl"); this.br = this.kr.querySelector(".br");
    this.marke = this.kr.querySelector(".marke"); this.markeZahl = this.kr.querySelector(".markeZahl"); this.flag = this.kr.querySelector(".flag");
    this.gewicht = el("div", "in in-gewicht", `<div class="pille"><span class="lab">GEWICHT</span><b class="num">1.400<small>KG</small></b></div>`, wurzel);
    this.gewZ = this.gewicht.querySelector(".num"); this.gewP = this.gewicht.querySelector(".pille");
    this.cache = {};
  }
  setze(e, k, txt) { if (this.cache[k] !== txt) { e.innerHTML = txt; this.cache[k] = txt; } }
  vis(e, a, extra = "") {
    e.style.opacity = a.toFixed(3);
    e.style.transform = `translateY(${((1 - a) * 24).toFixed(1)}px) scale(${(0.94 + 0.06 * a).toFixed(4)}) ${extra}`;
    e.style.visibility = a > 0.005 ? "visible" : "hidden";
  }
  update(t) {
    const s = this.f(t);
    this.vis(this.tacho, s.visTacho);
    this.vis(this.gurt, s.visRest);
    this.vis(this.kr, s.visRest);
    this.vis(this.gewicht, s.visRest, `scale(${(1 + s.gewichtPuls * 0.12).toFixed(3)})`);
    this.setze(this.tachoZ, "tacho", String(Math.round(s.kmh)));
    this.tachoZ.style.color = s.kmh < 100 ? "#fff" : "#fff";
    // Gurt
    const g = Math.max(0, s.g);
    this.setze(this.gurtZ, "g", `${fmtZ(g, 1)}<small>g</small>`);
    this.gurtBalken.style.transform = `scaleX(${clamp(g / 3.6).toFixed(4)})`;
    this.gurtSpitze.style.display = s.gPeak > 0 ? "block" : "none"; this.gurtSpitzeZahl.style.display = s.gPeak > 0 ? "block" : "none";
    this.gurtSpitze.style.left = `${(clamp(s.gPeak / 3.6) * 100).toFixed(2)}%`; this.gurtSpitzeZahl.style.left = `${(clamp(s.gPeak / 3.6) * 100).toFixed(2)}%`;
    this.setze(this.gurtSpitzeZahl, "gp", `MAX ${fmtZ(s.gPeak, 1)}`);
    // Kräfte
    const SK = 700, halb = 364; // Skala 0 … 700 N je Seite
    this.setze(this.krL, "krL", `${Math.round(s.antrieb)}<small>N</small>`);
    this.setze(this.krR, "krR", `${Math.round(s.rechts)}<small>N</small>`);
    this.setze(this.krLab, "krLab", s.rechtsLabel); this.setze(this.krLabL, "krLabL", s.linksLabel);
    this.bl.style.width = `${halb}px`; this.br.style.width = `${halb}px`;
    this.bl.style.transform = `scaleX(${clamp(s.antrieb / SK).toFixed(4)})`;
    this.br.style.transform = `scaleX(${clamp(s.rechts / SK).toFixed(4)})`;
    this.marke.style.display = s.grenze ? "block" : "none"; this.markeZahl.style.display = s.grenze ? "block" : "none";
    const mx = 26 + 364 - (147.15 / SK) * 364; // Haftgrenze links der Mitte (Karte: 26 px Innenabstand, Balken 728 px)
    this.marke.style.left = `${mx.toFixed(1)}px`;
    this.markeZahl.style.left = `${(mx - 12).toFixed(1)}px`;
    this.flag.style.opacity = s.flag.toFixed(3);
    // Gewicht
    this.setze(this.gewZ, "gew", `${fmtTausend(s.gewicht)}<small>KG</small>`);
    this.gewicht.classList.toggle("normal", s.gewicht > 100);
  }
  ereignisse() {
    const ev = [];
    for (const [a, b] of this.M.laufIntervalle((t) => Math.round(this.f(t).kmh), 0, this.M.zp.dauer)) ev.push({ t: a, typ: "zaehler", dauer: b - a, laufend: true, klang: "zaehlen", quelle: "Tacho" });
    for (const [a, b] of this.M.laufIntervalle((t) => { const s = this.f(t); return Math.round(s.rechts) + Math.round(s.antrieb) * 1000 + (s.visRest > 0.5 ? 0 : 1e7); }, 0, this.M.zp.dauer)) ev.push({ t: a, typ: "zaehler", dauer: b - a, laufend: true, klang: false, quelle: "Kräfteduell" });
    return ev;
  }
}

// =====================================================================================
// Start
// =====================================================================================
async function start() {
  const skript = await lade("skript.json");
  let timing;
  try { timing = await lade("audio/timing.json"); }
  catch { try { timing = await lade("audio/timing_schaetzung.json"); } catch { timing = schaetzeTiming(skript); } }
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.8 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const ENDE = DAUER - 1 / FPS;
  const T = (x) => zp.zeit(x);

  // ---------- Zeitmarken ----------
  const tKasten = T("hook:Kasten"), t130 = T("regeln:130."), tFuenf = T("regeln:Fünf"), t15 = T("regeln:15"), tKlar = T("Klar,"), tZischst = T("falle:zischst"), tOder = T("Oder?");
  const tLos = T("Los"), tFuss = T("gas1:Fuß"), tGas = T("gas1:Gas."), tFolg = T("folgen:Folg");
  const tDoch = T("gas2:Doch"), tA0 = T("gas2:Sekunde"), tA32 = T("gas2:3,2"), tAGurt = T("gas2:Gurt!"), tAWand = T("gas2:Wand."), tANach = T("gas3:Nach"), tA24 = T("gas3:24.");
  const tRew0 = tA24 + 0.5, tB0 = T("voll1:Dann") - 0.06, tBvoll = T("voll1:Vollgas!"), tBRaeder = T("voll1:Räder"), tBdurch = T("voll1:durch."), tBTacho = T("voll2:Tacho"), tBAuf = T("voll2:Auf"), tB73 = T("voll2:73.");
  const tErg = T("Ergebnis:"), tErg73 = T("ergebnis:73"), tWarum = T("Warum?"), tErstens = T("warum:Erstens:"), t147 = T("warum:147"), tZweitens = T("warum:Zweitens:"), t473 = T("warum:473"), tDrueckt = T("warum:drückt.");
  const tT0 = tErg - 0.12;
  const tC0 = T("ueberraschung:Und"), tLkw = T("ueberraschung:Lkw"), tUeberholt = T("ueberraschung:überholt"), tLuftstoss = T("ueberraschung:Luftstoß"), tFuenfmal = T("ueberraschung:fünfmal"), tHaftung = T("ueberraschung:Haftung."), tRutscht = T("ueberraschung:rutschst"), tDann = T("ueberraschung:Dann"), tWieder = T("ueberraschung:wieder.");
  const tMerk = T("merksatz:Dein"), tFeind = T("merksatz:Feind."), tEs = T("merksatz:Es"), tStrasse = T("merksatz:Straße."), tSchluss = T("Welches"), tSzenario = T("Szenario"), tSchreib = T("Schreib");
  const tPost0 = tWieder + 0.1;
  const tSchleife = tSchluss + 0.9;

  // ---------- Sim-Tabellen ----------
  const tabA = S.integriere({ modus: "gasweg" });
  const tabB = S.integriere({ modus: "vollgas" });
  const lkwSim = S.lkwUeberholt({ tab: tabA });
  const rutsch = S.rutschProfil();
  const V0 = S.P.v0, FMAX = S.seitenKraft(), FH = S.haftgrenze();

  // ---------- Szenario-Zeit τ (0–5 s) über die Videozeit: Zeitlupe im Takt der Sätze ----------
  const tauAKeys = [{ t: 0, v: 0 }, { t: tA0, v: 0 }, { t: tA32, v: 0.15, e: ease.linear }, { t: tAGurt, v: 0.45, e: ease.linear }, { t: tAWand, v: 1.25, e: ease.linear },
    { t: tANach, v: 1.65, e: ease.linear }, { t: tA24 + 0.05, v: 5.0, e: ease.inOutSine }, { t: tRew0, v: 5.0 }, { t: tB0, v: 0, e: ease.inOutCubic }];
  const tauBKeys = [{ t: tB0, v: 0 }, { t: tBvoll, v: 0.5, e: ease.linear }, { t: tBRaeder, v: 1.5, e: ease.linear }, { t: tBdurch, v: 2.4, e: ease.linear }, { t: tBTacho + 0.1, v: 3.0, e: ease.linear },
    { t: tBAuf, v: 4.5, e: ease.linear }, { t: tB73 + 0.35, v: 5.0, e: ease.outSine }, { t: tT0, v: 5.0 }];
  const tauTKeys = [{ t: tT0, v: 5.0 }, { t: tZweitens - 0.1, v: 5.0 }, { t: tZweitens + 0.7, v: 0, e: ease.inOutCubic }, { t: t473 + 0.05, v: 0 }, { t: tC0 - 0.2, v: 5.0, e: ease.inOutSine }];
  const tauCKeys = [{ t: tC0, v: 0 }, { t: tLkw + 0.6, v: 1.0, e: ease.linear }, { t: tLuftstoss + 0.4, v: 2.3, e: ease.linear }, { t: tHaftung + 0.2, v: lkwSim.tPass, e: ease.linear },
    { t: tRutscht + 0.9, v: lkwSim.tPass + 0.5, e: ease.linear }, { t: tWieder, v: 5.0, e: ease.inOutSine }, { t: DAUER + 1, v: 5.0 }];
  const fenster = (t) => (t < tA0 ? "pre" : t < tB0 ? "A" : t < tT0 ? "B" : t < tC0 ? "T" : t < tPost0 ? "C" : "post");
  const tauIn = (f, t) => {
    if (f === "pre") return 0;
    if (f === "A") return keyframes(tauAKeys, t);
    if (f === "B") return keyframes(tauBKeys, t);
    if (f === "T") return keyframes(tauTKeys, t);
    if (f === "C") return keyframes(tauCKeys, t);
    return 5;
  };
  const tauRoh = (t) => tauIn(fenster(t), t);
  const rate = (t) => { const f = fenster(t); return (tauIn(f, t + 0.02) - tauIn(f, t - 0.02)) / 0.04; }; // nur innerhalb eines Fensters ableiten
  const rateSicht = (t) => {
    const r = rate(t);
    if (Math.abs(r) < 0.01) return 1; // Stillstand der Szenario-Uhr = normale Fahrt
    return r < 0 ? r : Math.max(r, 0.5);
  };

  // Fahrzeuge: x = Spur, d0 = Abstand Mitte zur eigenen Stoßstange bei τ = 0 (positiv vorn), v = Tempo (m/s)
  const AUTOS = [
    { x: 0, d0: 70, v: 92 / 3.6 },          // vor dir, langsamer: du schließt auf (Hook), dann zieht es weg
    { x: SPUR, d0: 38, v: 104 / 3.6 },      // rechte Spur, vorn
    { x: -SPUR, d0: -34, v: 168 / 3.6 },    // linke Spur, hinter dir, saust nach vorn vorbei
    { x: SPUR, d0: 150, v: 110 / 3.6 },     // rechte Spur, weit vorn
  ];
  const tabAnz = Math.ceil(DAUER * 120) + 3;
  const Ptab = new Float64Array(tabAnz);
  const carTab = AUTOS.map(() => new Float64Array(tabAnz));
  const lkwTab = new Float64Array(tabAnz);
  const kmhTab = new Float64Array(tabAnz);
  // v(t), a(t) etc. je Fenster (Tabellenabfrage)
  const zeile = (f, tau) => S.abfrage(f === "B" ? tabB : f === "T" ? tabB : tabA, clamp(tau, 0, 5));
  const fahr = (t) => { // Zustand der Fahrt zur Zeit t
    const f = fenster(t);
    const tau = tauRoh(t);
    if (f === "pre") return { f, tau, v: V0, a: 0, luft: S.luftwiderstand(V0), antrieb: S.luftwiderstand(V0) };
    if (f === "post") {
      const v1 = S.abfrage(tabA, 5).v, k = ease.inOutSine(fortschritt(t, tPost0, ENDE));
      const v = lerp(v1, V0, k);
      return { f, tau: 5, v, a: -(V0 - v1) * 0.3 * Math.sin(Math.PI * k) * 0, luft: S.luftwiderstand(v), antrieb: S.luftwiderstand(v), beschleunigt: k };
    }
    const r = zeile(f, tau);
    return { f, tau, v: r.v, a: -r.a, luft: r.luft, antrieb: r.antrieb };
  };
  // Integration der sichtbaren Bewegung (Zeitlupe nie unter halbem Tempo, Rücklauf rückwärts)
  {
    const dt = 1 / 120;
    let P = 0;
    const d = AUTOS.map((c) => c.d0 - (c.v - V0) * tA0);
    let dl = -lkwSim.g0;
    for (let k = 0; k < tabAnz; k++) {
      const t = k * dt;
      if (k > 0 && (k - 1) * dt < tC0 && t >= tC0) { AUTOS.forEach((c, i) => { d[i] = c.d0; }); dl = -lkwSim.g0; }
      Ptab[k] = P; AUTOS.forEach((c, i) => { carTab[i][k] = d[i]; }); lkwTab[k] = dl;
      const s = fahr(t);
      let rs = rateSicht(t);
      if (t > tZischst - 0.1 && t < tOder + 0.05 && fenster(t) === "pre") rs *= 1 + 0.9 * ease.inOutSine(fortschritt(t, tZischst - 0.1, tZischst + 0.4)) * (1 - ease.inCubic(fortschritt(t, tOder - 0.25, tOder + 0.05)));
      P += s.v * rs * dt;
      AUTOS.forEach((c, i) => { d[i] += (c.v - s.v) * rs * dt; });
      dl += (S.P.lkwV - s.v) * rs * dt;
    }
    // Schleife: P am Ende ≡ 0 (mod 288): den Rest als sanften Zusatz über die letzten Sekunden verteilen
    const kEnde = Math.round(ENDE * 120);
    const rest = (MASTER - (Ptab[kEnde] % MASTER)) % MASTER;
    const ab = Math.floor(tPost0 * 120);
    for (let k = ab; k < tabAnz; k++) Ptab[k] += rest * ease.inOutSine(Math.min(1, (k - ab) / Math.max(1, kEnde - ab)));
    // Autos: nach Ende des Abspanns weit weg (außerhalb der Sicht), Anfang ebenso → kein Abgleich nötig
  }
  const lerpTab = (tab, t) => { const x = clamp(t * 120, 0, tabAnz - 2), i = Math.floor(x); return lerp(tab[i], tab[i + 1], x - i); };
  const Pof = (t) => lerpTab(Ptab, t);
  // Zeitpunkt des Überholens (Lkw-Front neben deiner Stoßstange) in Videozeit
  let tPass = tC0 + 4;
  for (let k = Math.floor(tC0 * 120); k < tabAnz; k++) if (lkwTab[k] >= 0) { tPass = k / 120; break; }
  const tauPass = tauRoh(tPass);
  const rutschS = (t) => Math.max(0, tauRoh(t) - tauPass); // Sekunden seit Beginn des Luftstoßes (Szenario-Zeit)
  const rutschY = (t) => (fenster(t) === "C" ? rutsch.abfrage(rutschS(t)).y : 0);
  const stossKraft = (t) => { if (fenster(t) !== "C") return 0; const s = rutschS(t); return s > 0 && s < S.P.lkwStoss ? FMAX * Math.sin((Math.PI * s) / S.P.lkwStoss) ** 2 : 0; };

  // ---------- Fahrwerte für Instrumente und Kamera ----------
  const gOf = (t) => Math.max(0, fahr(t).a / S.G);
  const gLean = (t) => { let s = 0, w = 0; for (let k = 0; k < 6; k++) { const x = Math.exp(-k * 0.35); s += gOf(t - k * 0.05) * x; w += x; } return s / w; };

  // =====================================================================================
  // Szene, HUD
  // =====================================================================================
  const buehne = new Buehne(document.getElementById("leinwand"), { breite: Math.round(1080 * SKALA), hoehe: Math.round(1920 * SKALA), msaa: MSAA, schatten: false });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "700 27px 'SB Display'", "700 27px 'SB Text'", "800 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const W = baueWelt(buehne, { autos: AUTOS });

  const hud = new HUD(document.getElementById("hud"));
  if (Q.get("hud") === "0") hud.wurzel.style.display = "none";
  const M = new Massstab(hud, zp, {
    akzent: TUERKIS,
    teams: {
      a: { name: "REIFEN", farbe: KORALLE, woerter: ["Reifen*", "Haftung*", "Räder*", "Vollgas*"] },
      b: { name: "LUFT", farbe: TUERKIS, woerter: ["Luft*", "Luftstoß*", "Luftwiderstand*", "Lkw"] },
    },
  });
  M.schleife({ ab: tSchleife, ende: ENDE });

  // Countdown (Anzeige-τ). Am Ende füllt er sich wieder (Schleife), in der Totalen läuft er mit.
  const tauAnz = (t) => (t < tPost0 + 0.01 ? clamp(tauRoh(t), 0, 5) : 5 * (1 - ease.inOutCubic(fortschritt(t, tMerk, ENDE))));
  const marken = [];
  for (const [t0, t1] of [[tA0, tRew0], [tB0, tT0], [tC0, tPost0]]) for (let k = 1; k <= 5; k++) { let t = t0; while (t < t1 && tauRoh(t) < k - 1e-6) t += 1 / 60; if (t < t1) marken.push(t); }
  hud.add(new Countdown(M, hud.wurzel, { tauFn: tauAnz, tauRoh: tauAnz, von: tA0, bis: ENDE, marken }));

  // Sichtbarkeitsfenster der Instrumente
  const fen = (t, liste, fade = 0.22) => { let v = 0; for (const [a, b] of liste) v = Math.max(v, fortschritt(t, a - fade, a) * (1 - fortschritt(t, b, b + fade))); return v; };
  const sichtTacho = [[0, tT0 - 0.05], [tC0 + 0.05, ENDE + 1]];
  const sichtRest = [[tLos, tT0 - 0.05], [tC0 + 0.05, tPost0 + 0.5]];
  const inst = (t) => {
    const s = fahr(t);
    const f = s.f;
    const g = f === "post" ? 0 : Math.max(0, s.a / S.G);
    const fensterAktiv = f === "A" || f === "B" || f === "C";
    const peak = fensterAktiv && tauRoh(t) > 0.02 ? (f === "B" ? S.gRichtung(-tabB[0].a) : S.gRichtung(-tabA[0].a)) : 0;
    // linke Seite: Antrieb bzw. Haftung
    let antrieb = s.antrieb, linksLabel = "REIFEN", rechts = s.luft, rechtsLabel = "LUFT";
    if (f === "pre") {
      const k = ease.inOutCubic(fortschritt(t, tFuss + 0.1, tGas + 0.25)); // Fuß vom Gas
      antrieb = lerp(s.luft, 0, k);
    } else if (f === "B") antrieb = S.haftgrenze() * ease.inOutCubic(fortschritt(t, tB0, tBvoll + 0.1));
    else if (f === "C") { linksLabel = "HAFTUNG"; antrieb = FH; }
    const stoss = stossKraft(t);
    let stossBlend = 0;
    if (f === "C") { const s0 = rutschS(t); stossBlend = clamp(fortschritt(t, tPass - 0.35, tPass) * (1 - fortschritt(s0, 0.3, 0.9))); if (stossBlend > 0.01) rechtsLabel = "LUFTSTOSS"; rechts = Math.max(s.luft * (1 - stossBlend), stoss, stossBlend > 0.01 ? 0 : 0); }
    let gewicht = 1400;
    if (f === "A" || f === "B") gewicht = 15; else if (f === "C") gewicht = t < tC0 + 0.15 ? 1400 : t < tWieder ? 15 : 1400; else if (f === "T") gewicht = 15;
    const gewichtPuls = Math.exp(-Math.abs(t - (f === "A" ? tA0 : f === "C" ? (t < tWieder ? tC0 + 0.15 : tWieder) : -9)) * 7);
    const flag = f === "B" ? clamp(fortschritt(t, tBRaeder - 0.05, tBRaeder + 0.1)) * (1 - fortschritt(t, tB73, tB73 + 0.4)) * (0.7 + 0.3 * Math.sin(t * 16)) : 0;
    return {
      kmh: kmhOf(s.v), g, gPeak: peak, antrieb, rechts, linksLabel, rechtsLabel, grenze: gewicht < 100, flag, gewicht, gewichtPuls,
      visTacho: fen(t, sichtTacho), visRest: fen(t, sichtRest),
    };
  };
  const instr = new Instrumente(M, hud.wurzel, inst);
  hud.add(instr);

  // --- Hook: Titel steigt Wort für Wort auf ---
  M.titel({ y: 520, groesse: 100, aus: "regeln:130.-0.1", woerter: [
    { text: "STELL", ein: "Stell-0.03", art: "klein" }, { text: "DIR", ein: "dir-0.03", art: "klein" }, { text: "VOR:", ein: "vor,-0.03", art: "klein" },
    { umbruch: true }, { text: "DEIN", ein: "dein-0.03" }, { text: "AUTO", ein: "Auto-0.03", team: "a" },
    { umbruch: true }, { text: "WIEGT", ein: "wiegt-0.03", art: "klein" }, { text: "SO", ein: "so-0.03", art: "klein" }, { text: "VIEL", ein: "viel-0.03", art: "klein" }, { text: "WIE", ein: "wie-0.03", art: "klein" },
    { umbruch: true }, { text: "EIN", ein: "ein-0.03" }, { text: "KASTEN", ein: "Kasten-0.03" },
    { umbruch: true }, { text: "WASSER", ein: "Wasser.-0.03", team: "b" },
  ] });
  // --- Regeln als Chips ---
  M.chips({ y: 580, ausrichtung: "mitte", aus: "Klar,-0.35", liste: [{ text: "AUTOBAHN · 130 KM/H", ein: "regeln:130.+0.0", art: "voll", team: "b", gross: true }] });
  M.chips({ y: 720, ausrichtung: "mitte", aus: "Klar,-0.35", liste: [{ text: "5 SEKUNDEN LANG", ein: "regeln:Fünf+0.2", art: "dunkel", gross: true }] });
  M.chips({ y: 860, ausrichtung: "mitte", aus: "Klar,-0.35", liste: [{ text: "AUTO + DU = 15 KG", ein: "regeln:15-0.1", art: "voll", team: "a", gross: true }] });
  // --- Denkfalle ---
  M.stempel({ text: "KLAR?", ein: "Klar,", aus: "Los-0.1", x: SICHER.mitte, y: 930, winkel: -6, farbe: "weiss", textFarbe: "tinte", groesse: 128 });
  // --- Fenster A: Gas weg ---
  M.chips({ y: 1010, ausrichtung: "mitte", aus: "folgen:Folg-0.05", liste: [{ text: "FUSS VOM GAS", ein: "gas1:Fuß-0.05", art: "voll", team: "a", gross: true }] });
  M.folgen({ ein: "folgen:Folg", dauer: 1.8, y: 960 });
  M.chips({ y: 1150, ausrichtung: "mitte", aus: "gas2:Doch+0.2", liste: [{ text: "GLEICH: NUR 15 KG", ein: "folgen:damit", art: "dunkel", gross: true }] });
  M.stempel({ text: "3,2 G!", ein: "gas2:3,2-0.02", aus: "gas2:Luft-0.1", x: SICHER.mitte, y: 1010, winkel: -5, farbe: "a", groesse: 150 });
  M.chips({ y: 1010, ausrichtung: "mitte", aus: "gas3:Nach-0.05", liste: [{ text: "LUFT BREMST: 473 N", ein: "gas2:Luft-0.05", art: "voll", team: "b", gross: true }] });
  M.chips({ y: 1010, ausrichtung: "mitte", aus: tRew0, liste: [{ text: "NUR NOCH 24 KM/H", ein: "gas3:nur-0.02", art: "dunkel", gross: true }] });
  // --- Fenster B: Vollgas ---
  M.chips({ y: 1010, ausrichtung: "mitte", aus: "voll1:Räder-0.1", liste: [{ text: "VOLLGAS", ein: "voll1:Vollgas!-0.02", art: "voll", team: "a", gross: true }] });
  M.chips({ y: 1010, ausrichtung: "mitte", aus: "Ergebnis:-0.35", liste: [{ text: "REIFEN AM LIMIT", ein: "voll1:Räder", art: "dunkel", gross: true }] });
  M.stempel({ text: "73 KM/H", ein: "voll2:73.-0.05", aus: "Ergebnis:-0.05", x: SICHER.mitte, y: 960, winkel: 4, farbe: "weiss", textFarbe: "tinte", groesse: 128 });
  // --- Ergebnis ---
  M.bilanz({
    y: 420, ein: "Ergebnis:-0.15", aus: "Warum?-0.15", titel: "Nach 5 Sekunden",
    zeilen: [
      { label: "VOLLGAS", wert: 73, einheit: "km/h", team: "a", ein: "ergebnis:73" },
      { label: "GAS WEG", wert: 24, einheit: "km/h", team: "b", ein: "ergebnis:Mehr" },
      { label: "NORMAL, 1.400 KG", wert: 124, einheit: "km/h", team: "tinte", ein: "ergebnis:nicht." },
    ],
    differenz: { label: "VERLUST VOLLGAS", wert: 57, einheit: "km/h", ein: "ergebnis:nicht.+0.25" },
  });
  // --- Warum? zwei Faktoren ---
  M.formel({ y: 420, ein: "warum:Erstens:-0.1", aus: "warum:Zweitens:-0.1", titel: "Erstens: Reifen", teile: [
    { text: "15", einheit: "kg", ein: "warum:Erstens:+0.15", team: "a" }, { text: "×", ein: "warum:halten" }, { text: "9,81", einheit: "m/s²", ein: "warum:viel,-0.05" },
    { text: "=", ein: "warum:drückt.-0.05" }, { text: "147", einheit: "N", ein: "warum:147", art: "erg" },
  ], unter: { text: "µ = 1,0 · TROCKEN · HÖCHSTWERT", ein: "warum:Newton.-0.1", team: "a" } });
  M.formel({ y: 420, ein: "warum:Zweitens:-0.1", aus: "ueberraschung:Und-0.15", titel: "Zweitens: Luft", teile: [
    { text: "130", einheit: "km/h", ein: "warum:Luftwiderstand", team: "b" }, { text: "→", ein: "warum:ist" }, { text: "473", einheit: "N", ein: "warum:473", art: "erg" },
  ], unter: { text: "EGAL, WIE SCHWER DU BIST", ein: "warum:wie#2+0.1", team: "b" } });
  M.chips({ y: 1010, ausrichtung: "mitte", aus: "warum:Zweitens:-0.1", liste: [{ text: "REIFEN HALTEN NUR 147 N", ein: "warum:147-0.05", art: "voll", team: "a", gross: true }] });
  M.chips({ y: 1010, ausrichtung: "mitte", aus: "ueberraschung:Und-0.15", liste: [{ text: "BEI 73 KM/H: 147 = 147", ein: "warum:473+0.5", art: "dunkel", gross: true }] });
  // --- Zweite Überraschung: Lkw ---
  M.stempel({ text: "LKW!", ein: "ueberraschung:Lkw-0.02", aus: "ueberraschung:überholt+0.5", x: SICHER.mitte, y: 960, winkel: -6, farbe: "b", groesse: 150 });
  M.chips({ y: 1010, ausrichtung: "mitte", aus: "ueberraschung:Sein-0.1", liste: [{ text: "LKW 80 · DU 30 KM/H", ein: "ueberraschung:dich.+0.05", art: "dunkel", gross: true }] });
  M.chips({ y: 1010, ausrichtung: "mitte", aus: "ueberraschung:rutschst+0.6", liste: [{ text: "694 N = 4,7 × HAFTUNG", ein: "ueberraschung:fünfmal-0.05", art: "voll", team: "b", gross: true }] });
  M.chips({ y: 1010, ausrichtung: "mitte", aus: "merksatz:Dein-0.1", liste: [{ text: "GEWICHT ZURÜCK", ein: "ueberraschung:wieder.", art: "voll", team: "a", gross: true }] });
  // --- Merksatz ---
  M.pointe({ text: "DEIN GEWICHT | IST NICHT | *DEIN FEIND.*", ein: "merksatz:Dein", takt: 0.2, aus: "merksatz:Es-0.1", y: 560, groesse: 116 });
  M.pointe({ text: "ES HÄLT DICH | AUF DER | *STRASSE.*", ein: "merksatz:Es", takt: 0.16, aus: "Welches-0.1", y: 560, groesse: 116 });
  M.chips({ y: 960, ausrichtung: "mitte", aus: "Schreib-0.1", liste: [{ text: "DEIN SZENARIO?", ein: "Szenario-0.05", art: "voll", team: "b", gross: true }] });
  M.untertitel({ stil: "kontur", unten: 1450, groesse: 62 });

  // Weißer Blitz bei Gewichtsverlust und Luftstoß; Rücklauf-Streifen; Tempo-Streifen
  const blitz = el("div", "", "", hud.wurzel);
  Object.assign(blitz.style, { position: "absolute", left: "0", top: "0", width: "1080px", height: "1920px", pointerEvents: "none", zIndex: 5, background: "radial-gradient(ellipse at 50% 55%, rgba(255,255,255,0) 28%, rgba(255,79,90,0.55) 100%)", opacity: 0 });
  const blitzZeiten = [tA0, tB0 + 0.0, tC0 + 0.05, tPass];
  const rueck = el("div", "", "", hud.wurzel);
  Object.assign(rueck.style, { position: "absolute", left: "0", top: "0", width: "1080px", height: "1920px", pointerEvents: "none", zIndex: 6, opacity: 0,
    background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.0) 0px, rgba(255,255,255,0.0) 10px, rgba(255,255,255,0.22) 11px, rgba(255,255,255,0.22) 14px)", mixBlendMode: "screen" });
  const linien = el("div", "", "", hud.wurzel);
  Object.assign(linien.style, { position: "absolute", left: "0", top: "0", width: "1080px", height: "1920px", pointerEvents: "none", zIndex: 4, opacity: 0, mixBlendMode: "screen",
    background: "repeating-conic-gradient(from 0deg at 50% 52%, rgba(255,255,255,0.0) 0deg, rgba(255,255,255,0.0) 4.2deg, rgba(255,255,255,0.35) 4.6deg, rgba(255,255,255,0.0) 5deg)",
    maskImage: "radial-gradient(ellipse at 50% 52%, rgba(0,0,0,0) 38%, rgba(0,0,0,1) 85%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 52%, rgba(0,0,0,0) 38%, rgba(0,0,0,1) 85%)" });
  hud.add({ update(t) {
    let o = 0; for (const b of blitzZeiten) o = Math.max(o, t >= b - 0.03 ? Math.exp(-(t - b + 0.03) * 5.5) : 0);
    blitz.style.opacity = (o * 0.85).toFixed(3);
    rueck.style.opacity = (clamp(fortschritt(t, tRew0, tRew0 + 0.1) * (1 - fortschritt(t, tB0 + 0.05, tB0 + 0.25)) * 0.9)).toFixed(3);
    rueck.style.transform = `translateY(${((t * 700) % 14).toFixed(1)}px)`;
    // Tempo-Linien in der Denkfalle („zischst davon“) und beim Zeitraffer
    const l1 = fortschritt(t, tZischst - 0.05, tZischst + 0.3) * (1 - fortschritt(t, tOder - 0.05, tOder + 0.1));
    const l2 = fortschritt(t, tANach + 0.1, tANach + 0.3) * (1 - fortschritt(t, tA24 + 0.05, tA24 + 0.35));
    linien.style.opacity = (Math.max(l1, l2 * 0.8) * 0.9).toFixed(3);
    linien.style.transform = `rotate(${((t * 40) % 5).toFixed(2)}deg)`;
  } });

  // 3D-Ereignisse fürs Protokoll (Ton und Prüfung)
  M.melde({ t: tKasten - 0.05, typ: "kamera", klang: "whoosh", dauer: 0.5, text: "Blick zum Kasten" });
  M.melde({ t: tKasten + 1.0, typ: "kamera", klang: false, dauer: 0.5, text: "Blick zurück auf die Straße" });
  M.melde({ t: t15 + 0.1, typ: "kamera", klang: false, text: "Nicken" });
  M.melde({ t: tZischst, typ: "kamera", klang: "whoosh", dauer: 1.0, text: "Zischen (FOV und Tempo)" });
  M.melde({ t: tFuss - 0.15, typ: "kamera", klang: "whoosh", dauer: 0.5, text: "Blick zum Fuß" });
  M.melde({ t: tGas + 0.5, typ: "kamera", klang: false, dauer: 1.5, text: "Kopf hebt sich langsam" });
  M.melde({ t: tA0, typ: "welle", klang: "boom", text: "Gewicht weg: 15 kg" });
  M.melde({ t: tANach + 0.1, typ: "kamera", klang: "whoosh", dauer: 1.4, text: "Zeitraffer bis 24 km/h" });
  M.melde({ t: tRew0, typ: "uebergang", klang: "rueck", dauer: 0.6, text: "Rücklauf" });
  M.melde({ t: tB0 + 0.05, typ: "welle", klang: "boom", text: "Vollgas: Gewicht weg" });
  M.melde({ t: tBRaeder, typ: "kamera", klang: "rumpeln", dauer: 2.4, text: "Räder drehen durch (Rütteln)" });
  M.melde({ t: tZweitens + 0.0, typ: "kamera", klang: "rueck", dauer: 0.8, text: "Rücklauf in der Totalen" });
  M.melde({ t: t147, typ: "pfeil", klang: "pop", text: "Pfeil Reifen" });
  M.melde({ t: t473, typ: "pfeil", klang: "pop", text: "Pfeil Luft" });
  M.melde({ t: tC0 + 0.35, typ: "kamera", klang: "whoosh", dauer: 0.8, text: "Blick nach hinten zum Lkw" });
  M.melde({ t: tPass, typ: "welle", klang: "boom", text: "Luftstoß des Lkw" });
  M.melde({ t: tWieder, typ: "welle", klang: "stempel", text: "Gewicht zurück" });

  // =====================================================================================
  // Welt-Zustand
  // =====================================================================================
  const setzeWelt = (t, { pov }) => {
    const P = Pof(t);
    const m = W.muster;
    // Dashes: Spurtrenner bei x = ±1,875, Periode 18 m (6 m Strich), 16 je Linie
    for (let i = 0; i < 16; i++) for (let s = 0; s < 2; s++) { const z = -vorn(i * 18, P, 288, 24) - 3; m.dashes.setze(i + s * 16, s ? 1.875 : -1.875, 0.016, z); }
    m.dashes.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 24; i++) m.fugen.setze(i, 0, 0.013, -vorn(i * 12, P, 288, 24));
    m.fugen.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 72; i++) { const z = -vorn(i * 4, P, 288, 24); m.pfosten.setze(i, 8.7, 0.4, z); m.pfosten.setze(72 + i, -7.6, 0.4, z); m.pfosten.setze(144 + i, -9.1, 0.4, z); }
    m.pfosten.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 6; i++) { const z = -vorn(i * 48, P, 288, 24); m.leitpfosten.setze(i, 8.2, 0.5, z); m.leitpfosten.setze(6 + i, -6.9, 0.5, z); m.leitStreifen.setze(i, 8.2, 0.78, z); m.leitStreifen.setze(6 + i, -6.9, 0.78, z); }
    m.leitpfosten.instanceMatrix.needsUpdate = true; m.leitStreifen.instanceMatrix.needsUpdate = true;
    m.baumDaten.forEach((b, i) => {
      const z = -vorn(b.z0, P, MASTER, 30);
      m.staemme.setze(i, b.x, b.h * 0.18, z, 1, b.h * 0.36, 1);
      m.kronen.setze(i, b.x, b.h * 0.34 + b.h * 0.32, z, b.b * 1.5, b.h * 0.66, b.b * 1.5);
      m.kronen2.setze(i, b.x, b.h * 0.58 + b.h * 0.3, z, b.b * 1.15, b.h * 0.55, b.b * 1.15);
    });
    m.staemme.instanceMatrix.needsUpdate = true; m.kronen.instanceMatrix.needsUpdate = true; m.kronen2.instanceMatrix.needsUpdate = true;
    m.bruecke.position.set(0, 0, -vorn(110, P, MASTER, 30)); m.richt.position.set(9.6, 0, -vorn(210, P, MASTER, 30));

    // Autos
    AUTOS.forEach((c, i) => {
      const d = lerpTab(carTab[i], t);
      const a = W.autos[i];
      const zc = FRONT_Z - d; // Mitte des Autos
      a.visible = d > -50 && d < 150;
      a.position.set(c.x + (fenster(t) === "C" ? 0 : 0), 0, zc);
    });
    // Lkw
    const f = fenster(t);
    const dl = lerpTab(lkwTab, t);
    W.lkw.visible = f === "C" && dl > -60 && dl < 220;
    W.lkw.position.set(-SPUR, 0, FRONT_Z - dl);
    // Eigenes Auto, Kraftpfeile (nur Totale)
    W.ich.visible = !pov; W.cockpit.visible = pov;
    const s = fahr(t);
    W.ich.position.set(0, 0, FRONT_Z + 2.15);
    W.ich.rotation.z = 0;
    const FL = s.luft;
    W.pfeilReifen.visible = !pov && t >= t147 - 0.12;
    W.pfeilLuft.visible = !pov && t >= tZweitens - 0.2;
    const kReifen = ease.outCubic(clamp(fortschritt(t, t147 - 0.12, t147 + 0.3)));
    const kLuft = ease.outCubic(clamp(fortschritt(t, tZweitens - 0.2, tZweitens + 0.1)));
    // Reifenkraft (vorwärts, −z) vorn am Wagen; Luftwiderstand (rückwärts, +z) oben, wirkt gegen die Fahrt
    W.pfeilReifen.setze(Math.max(0.02, S.haftgrenze() * 0.01 * kReifen));
    W.pfeilReifen.rotation.y = Math.PI;
    W.pfeilReifen.position.set(0, 0.62, FRONT_Z - 0.05);
    W.pfeilLuft.setze(Math.max(0.02, FL * 0.01 * kLuft));
    W.pfeilLuft.rotation.y = 0;
    W.pfeilLuft.position.set(0, 2.05, FRONT_Z - 0.05);

    // Fuß, Pedal
    const fussHoch = pov ? ease.inOutCubic(fortschritt(t, tFuss, tGas + 0.15)) * (1 - ease.inOutCubic(fortschritt(t, tB0 - 0.05, tBvoll))) + (f === "B" ? 0 : 0) : 0;
    const gasAn = f === "B" ? ease.inOutCubic(fortschritt(t, tB0, tBvoll + 0.1)) : f === "pre" ? 1 - fussHoch : 0;
    W.fuss.position.set(CAM_X + 0.22, 0.36 + 0.13 * (1 - gasAn), -0.62 + 0.05 * gasAn - 0.04);
    W.fuss.rotation.x = -0.25 * (1 - gasAn);
    // Instrument im Cockpit
    const c = W.instrCtx; c.fillStyle = "#06080E"; c.fillRect(0, 0, 512, 200);
    const v = kmhOf(s.v), cx = 256, cy = 150, R = 118;
    c.lineWidth = 10; c.strokeStyle = "#2A3050"; c.beginPath(); c.arc(cx, cy, R, Math.PI * 0.85, Math.PI * 2.15); c.stroke();
    c.strokeStyle = KORALLE; c.beginPath(); c.arc(cx, cy, R, Math.PI * 0.85, Math.PI * (0.85 + 1.3 * clamp(v / 200))); c.stroke();
    const w = Math.PI * (0.85 + 1.3 * clamp(v / 200));
    c.strokeStyle = "#FFFFFF"; c.lineWidth = 8; c.beginPath(); c.moveTo(cx + Math.cos(w) * 30, cy + Math.sin(w) * 30); c.lineTo(cx + Math.cos(w) * (R - 16), cy + Math.sin(w) * (R - 16)); c.stroke();
    c.fillStyle = "#FFFFFF"; c.font = '800 54px "SB Display", Inter, sans-serif'; c.textAlign = "center"; c.fillText(String(Math.round(v)), cx, 112);
    W.instrTex.needsUpdate = true;
    // Sonne wandert nicht; leichte Himmelsstärke je nach Fenster bleibt konstant
  };

  // =====================================================================================
  // Kamera: Ich-Perspektive am Steuer, Blickrichtung als Yaw/Pitch (links positiv)
  // =====================================================================================
  const kam = new THREE.PerspectiveCamera(72, 1080 / 1920, 0.03, 700);
  const blickKeys = [ // t, yaw, pitch
    { t: 0, v: [0, P0] },
    { t: tKasten - 0.12, v: [0, P0], e: ease.linear },
    { t: tKasten + 0.2, v: [-1.32, -0.55], e: ease.outCubic },
    { t: tKasten + 0.95, v: [-1.32, -0.55], e: ease.linear },
    { t: tKasten + 1.5, v: [0.0, P0], e: ease.inOutCubic },
    { t: t15 - 0.05, v: [0.0, P0], e: ease.linear },
    { t: t15 + 0.12, v: [0.0, P0 - 0.2], e: ease.outCubic },
    { t: t15 + 0.7, v: [0.0, P0], e: ease.inOutSine },
    { t: tKlar + 0.9, v: [0.0, P0], e: ease.linear },
    { t: tZischst, v: [0.0, P0 + 0.03], e: ease.inOutSine },
    { t: tOder, v: [0.0, P0 - 0.03], e: ease.inCubic },
    { t: tLos - 0.1, v: [0.0, P0] },
    { t: tFuss - 0.1, v: [0.0, P0], e: ease.linear },
    { t: tFuss + 0.25, v: [0.0, -1.0], e: ease.outCubic }, // Blick zum Fuß
    { t: tGas + 0.5, v: [0.0, -1.0], e: ease.linear },
    { t: tDoch - 0.05, v: [0.0, -0.78], e: ease.inOutSine },
    { t: tDoch + 0.28, v: [0.0, P0], e: ease.outCubic }, // Kopf hoch: die Luft packt zu
    { t: tAWand, v: [0.0, P0] },
    { t: tRew0, v: [0.0, P0] },
    { t: tB0 + 0.2, v: [0.0, P0] },
    { t: tT0, v: [0.0, P0] },
    { t: tC0 + 0.15, v: [0.0, P0], e: ease.linear },
  ];
  // Lkw-Blick: yaw zum Lkw (Fahrerhaus-Front) über die ganze Szene
  const lkwBlick = (t) => {
    const dl = lerpTab(lkwTab, t);
    const zf = FRONT_Z - dl; // Front des Lkw
    const ziel = V(-SPUR, 1.7, zf + 1.4 + clamp(-dl * 0.0, 0, 0));
    const dx = ziel.x - CAM_X, dz = ziel.z - 0, dy = ziel.y - CAM_Y;
    const yaw = Math.atan2(-dx, -dz);
    const pitch = Math.atan2(dy, Math.hypot(dx, dz));
    return [yaw, pitch];
  };
  const blickBasis = (t) => keyframes(blickKeys, t);
  const blick = (t) => {
    let [yaw, pitch] = blickBasis(t);
    if (fenster(t) === "C" || (t >= tC0 && t < tPost0)) {
      const ein = ease.inOutCubic(fortschritt(t, tC0 + 0.15, tC0 + 0.6));
      const [ly, lp] = lkwBlick(t);
      // Kopf bleibt beim Lkw bis kurz nach dem Rutschen, dann zurück nach vorn
      const aus = ease.inOutCubic(fortschritt(t, tRutscht + 0.55, tWieder - 0.1));
      const lyc = Math.min(Math.max(ly, 0), 3.05);
      yaw = lerp(yaw, lyc, ein * (1 - aus)); pitch = lerp(pitch, lp, ein * (1 - aus));
    }
    return [yaw, pitch];
  };
  const fovKeys = [
    { t: 0, v: 72 }, { t: tKasten, v: 72 }, { t: tKasten + 0.2, v: 66, e: ease.outCubic }, { t: tKasten + 1.4, v: 72, e: ease.inOutSine },
    { t: tKlar, v: 70, e: ease.inOutSine }, { t: tZischst, v: 72, e: ease.linear }, { t: tOder - 0.05, v: 88, e: ease.inOutSine }, { t: tOder + 0.15, v: 70, e: ease.outCubic },
    { t: tLos, v: 72, e: ease.outCubic }, { t: tDoch, v: 72 }, { t: tDoch + 0.35, v: 82, e: ease.outCubic }, { t: tAWand, v: 78, e: ease.inOutSine },
    { t: tANach, v: 78 }, { t: tA24, v: 70, e: ease.inOutSine }, { t: tB0, v: 72 }, { t: tBvoll, v: 80, e: ease.outCubic }, { t: tB73, v: 72, e: ease.inOutSine },
    { t: tC0, v: 72 }, { t: tC0 + 0.5, v: 70, e: ease.inOutSine }, { t: tPass, v: 66, e: ease.inOutSine }, { t: tPass + 0.3, v: 80, e: ease.outCubic }, { t: tWieder, v: 74, e: ease.inOutSine },
    { t: tMerk, v: 72, e: ease.inOutSine }, { t: DAUER, v: 72 },
  ];
  const regie = new Regie(kam, (t) => {
    const g = gLean(t);
    const beschl = fahr(t).beschleunigt ?? 0;
    const lehne = g * 0.062 - 0.02 * Math.sin(Math.PI * beschl);
    const sack = g * 0.026;
    const slide = rutschY(t);
    // Rütteln beim Durchdrehen (Fenster B), Zittern beim Bremsen
    const rueckelnB = fenster(t) === "B" ? fortschritt(t, tBRaeder - 0.1, tBRaeder + 0.2) * (1 - fortschritt(t, tB73, tB73 + 0.5)) : 0;
    const zittern = Math.min(1, g / 3) * 0.0035 + rueckelnB * 0.0065;
    const ox = Math.sin(t * 61) * zittern + Math.sin(t * 7.3) * 0.002, oy = Math.sin(t * 73 + 1) * zittern + Math.sin(t * 1.9) * 0.004;
    const pos = [CAM_X + ox + slide, CAM_Y - sack + oy, -lehne];
    let [yaw, pitch] = blick(t);
    pitch -= g * 0.035;
    const dir = V(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    const roll = Math.sin(t * 0.6) * 0.006 + rueckelnB * Math.sin(t * 47) * 0.012 + (slide > 0 ? Math.min(0.14, slide * 0.1) : 0) + (stossKraft(t) > 0 ? Math.sin(t * 40) * 0.01 : 0);
    return { pos, ziel: [pos[0] + dir.x * 10, pos[1] + dir.y * 10, pos[2] + dir.z * 10], fov: keyframes(fovKeys, t), roll };
  }, { zp });
  regie.stoss({ t: tLos + 0.05, staerke: 0.6 });
  regie.stoss({ t: tKlar + 0.05, staerke: 0.5 });
  regie.stoss({ t: tA0 + 0.0, staerke: 1.1 });
  regie.stoss({ t: tBvoll, staerke: 0.9 });
  regie.stoss({ t: tPass, staerke: 1.1 });
  regie.stoss({ t: tWieder, staerke: 0.8 });
  regie.stoss({ t: tFeind, staerke: 0.4 });
  regie.schleife({ ab: tSchleife, ende: ENDE });

  const post = { bloomStaerke: BLOOM, bloomSchwelle: 0.95, bloomRadius: 1.0, belichtung: 1.0, vignette: 0.34, saettigung: 1.08, kontrast: 1.06, koernung: 0.03 };
  const weltPOV = { szene: W.szene, kamera: kam, post, update(t) { setzeWelt(t, { pov: true }); regie.anwenden(t); } };

  // Totale (Ergebnis und Warum): Verfolgerkamera um dein Auto, Kraftpfeile
  const kamT = new THREE.PerspectiveCamera(56, 1080 / 1920, 0.1, 800);
  const regieT = new Regie(kamT, (t) => {
    const k = ease.inOutSine(fortschritt(t, tErg - 0.4, tC0));
    const az = lerp(-0.42, 0.42, k), el = 0.2, r = 11.8;
    const cz = FRONT_Z + 2.15;
    return { pos: [r * Math.cos(el) * Math.cos(az), r * Math.sin(el) + 1.0, cz - r * Math.cos(el) * Math.sin(az)], ziel: [0, 2.9, cz - 0.4], fov: 56 };
  }, { zp });
  regieT.stoss({ t: tErstens + 0.05, staerke: 0.4 });
  regieT.zoom({ t: tZweitens, staerke: 0.1, halt: 1.2, rueck: 0.6 });
  const weltT = { szene: W.szene, kamera: kamT, post: { ...post, vignette: 0.38 }, update(t) { setzeWelt(t, { pov: false }); regieT.anwenden(t); } };

  const zl = new Zeitleiste(buehne);
  zl.shot(0, weltPOV);
  zl.shot(tT0 + 0.1, weltT, { typ: "blasen", dauer: 0.7 });
  zl.shot(tC0 - 0.02, weltPOV, { typ: "zoomwisch", dauer: 0.5, richtung: [1, -0.2], mitte: [0.5, 0.5] });

  // =====================================================================================
  // Rendern und Übergabe
  // =====================================================================================
  const gl = buehne.renderer.getContext();
  const px = new Uint8Array(4);
  window.renderAt = (t) => {
    zl.zeichne(t, Math.round(t * FPS));
    hud.update(t);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  window.hudAt = (t) => hud.update(t);
  for (const t of [0, tA0 + 0.5, tB0 + 1, tErg + 0.5, tC0 + 1, ENDE]) window.renderAt(Math.min(t, ENDE));
  const schleifenPruefung = M.pruefeSchleife(window.renderAt, { regie });
  if (!schleifenPruefung.ok) console.warn("Schleife nicht geschlossen:", JSON.stringify(schleifenPruefung));
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich, schleifenPruefung });
  window.modell = S.alles();
  console.warn('INFO', JSON.stringify({ tPass, tauPass, tA0, tB0, tT0, tC0, P0: Pof(0), PEnde: Pof(ENDE), dl: [50.2,51,52,53,54,55,55.5,56,57].map((x)=>[x, +lerpTab(lkwTab,x).toFixed(1), +tauRoh(x).toFixed(2)]), c2: [50.2,52,55,57].map((x)=>[x,+lerpTab(carTab[2],x).toFixed(1)]) }));
  window.info = { tPass, tauPass, tA0, tB0, tT0, tC0, P0: Pof(0), PEnde: Pof(ENDE) };
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
