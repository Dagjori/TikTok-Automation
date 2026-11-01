// Stil 3 · Clay-Spielzeug-3D als Produktions-Baukasten (Three.js, Muster: stile/stil_3_clay.*).
// Knetmasse-Look: matte Standard-Materialien mit feiner Fingerabdruck-Struktur (Bump), runde Formen, weiche Schatten.
// Bausteine: Hände (Stein, Papier, Schere, stufenlos mischbar), Sockel, Schach-Bauer, Würfel, Kopf-Figur, Brett mit 10×10 Mulden
// und Kacheln, Wand und Tisch. Alles prozedural (keine fremden Dateien). Die Bühne kommt aus kern.js (Buehne), das Licht
// aus licht.js (lichtTag). Deterministisch: setzeHand/setzeKachel usw. setzen den Zustand nur aus Parametern.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const TON = {
  wand: "#F2E4CC", tisch: "#E8D2AD", holz: "#C99A62", brett: "#8F7658", mulde: "#7C654A", creme: "#FFF6E6", tinte: "#2A2530",
  rot: "#FF4D4D", cyan: "#33D1FF", remis: "#C9C1B2", haare: "#5B3B2A",
};

// =====================================================================================
// Material: Knete mit Fingerabdruck-Struktur
// =====================================================================================
let bumpTex = null;
function bumpTextur() {
  if (bumpTex) return bumpTex;
  const n = 256;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d");
  g.fillStyle = "#808080";
  g.fillRect(0, 0, n, n);
  // deterministisches Rauschen: viele weiche Dellen und Hügel
  let s = 1234567;
  const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 900; i++) {
    const x = r() * n, y = r() * n, rad = 2 + r() * 9, hell = r() < 0.5;
    for (const [dx, dy] of [[0, 0], [n, 0], [-n, 0], [0, n], [0, -n]]) {
      const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
      gr.addColorStop(0, hell ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.22)");
      gr.addColorStop(1, "rgba(128,128,128,0)");
      g.fillStyle = gr;
      g.beginPath(); g.arc(x + dx, y + dy, rad, 0, Math.PI * 2); g.fill();
    }
  }
  // feine Rillen wie Fingerabdrücke
  g.strokeStyle = "rgba(0,0,0,0.10)";
  g.lineWidth = 1.2;
  for (let k = 0; k < 14; k++) {
    const cx = r() * n, cy = r() * n;
    for (let j = 1; j < 6; j++) { g.beginPath(); g.ellipse(cx, cy, 6 + j * 3.2, 4 + j * 2.4, r() * 3, 0.4, 5.6); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  bumpTex = t;
  return t;
}
const matCache = new Map();
/** Knete-Material in einer Farbe (gecacht). rau 0.78 = matt, bump = Stärke der Struktur */
export function ton(farbe, { rau = 0.78, bump = 0.55, emissiv = null, emissivStaerke = 0 } = {}) {
  const key = [farbe, rau, bump, emissiv, emissivStaerke].join("|");
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color: farbe, roughness: rau, metalness: 0, bumpMap: bumpTextur(), bumpScale: bump });
  if (emissiv) { m.emissive = new THREE.Color(emissiv); m.emissiveIntensity = emissivStaerke; }
  matCache.set(key, m);
  return m;
}
export const dunkler = (hex, k = 0.78) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;
export const heller = (hex, k = 0.35) => `#${new THREE.Color(hex).lerp(new THREE.Color("#FFFFFF"), k).getHexString()}`;

/** Mesh mit Schatten */
export function teil(geo, material, x = 0, y = 0, z = 0, eltern = null, { werfen = true, empfangen = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = werfen;
  m.receiveShadow = empfangen;
  if (eltern) eltern.add(m);
  return m;
}
export const rbox = (b, h, t, r = 0.06, seg = 3) => new RoundedBoxGeometry(b, h, t, seg, Math.max(0.001, Math.min(r, b / 2, h / 2, t / 2) * 0.99));

// =====================================================================================
// Hände: Handballen, vier Finger (je zwei Glieder), Daumen. Die Hand zeigt mit den Fingern nach +y, die Handfläche nach +z.
// =====================================================================================
/** Haltungen: c = Beugung je Finger (Zeige-, Mittel-, Ring-, kleiner Finger, 0 gestreckt … 1 Faust), s = Spreizung (rad),
 *  th = [Daumenwinkel (rad), Daumenbeugung 0..1] */
export const GESTEN = {
  stein: { c: [1, 1, 1, 1], s: [-0.03, 0, 0.02, 0.05], th: [1.32, 1] },
  papier: { c: [0, 0, 0, 0], s: [-0.1, -0.03, 0.05, 0.15], th: [-0.82, 0] },
  schere: { c: [0, 0, 1, 1], s: [-0.19, 0.19, 0.03, 0.05], th: [1.32, 1] },
};
export const GESTEN_NAMEN = ["stein", "papier", "schere"]; // Index = Zug in sim/schere_stein_papier.mjs (0 Stein, 1 Papier, 2 Schere)

const FINGER = [
  { x: 0.36, r: 0.1, l: [0.4, 0.3] }, // Zeigefinger (Daumenseite)
  { x: 0.12, r: 0.106, l: [0.46, 0.34] }, // Mittelfinger
  { x: -0.12, r: 0.1, l: [0.42, 0.32] }, // Ringfinger
  { x: -0.35, r: 0.089, l: [0.33, 0.25] }, // kleiner Finger
];

export function hand({ farbe = TON.rot, manschette = TON.creme } = {}) {
  const wurzel = new THREE.Group();
  const innen = new THREE.Group(); // Pumpen, Neigen, Wippen
  wurzel.add(innen);
  const m = ton(farbe);
  const dunkel = ton(dunkler(farbe, 0.8));
  // Arm / Ärmel und Manschette
  teil(new THREE.CylinderGeometry(0.5, 0.58, 1.3, 32), dunkel, 0, -0.78, 0, innen);
  teil(new THREE.CylinderGeometry(0.58, 0.58, 0.26, 32), ton(manschette), 0, -0.12, 0, innen);
  // Handballen
  teil(rbox(0.98, 0.92, 0.46, 0.22), m, 0, 0.58, 0, innen);
  teil(new THREE.SphereGeometry(0.31, 20, 14), m, 0, 0.16, 0, innen); // Handwurzel
  const glieder = [];
  const kapsel = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14);
  FINGER.forEach((f) => {
    const fg = new THREE.Group();
    fg.position.set(f.x, 1.02, 0);
    const j1 = new THREE.Group();
    fg.add(j1);
    teil(kapsel(f.r, f.l[0]), m, 0, f.l[0] / 2, 0, j1);
    const j2 = new THREE.Group();
    j2.position.y = f.l[0];
    j1.add(j2);
    teil(kapsel(f.r * 0.95, f.l[1]), m, 0, f.l[1] / 2, 0, j2);
    innen.add(fg);
    glieder.push({ fg, j1, j2 });
  });
  // Daumen
  const tg = new THREE.Group();
  tg.position.set(0.5, 0.36, 0.1);
  const t1 = new THREE.Group();
  tg.add(t1);
  teil(kapsel(0.12, 0.3), m, 0, 0.19, 0, t1);
  const t2 = new THREE.Group();
  t2.position.y = 0.32;
  t1.add(t2);
  teil(kapsel(0.108, 0.24), m, 0, 0.14, 0, t2);
  innen.add(tg);
  wurzel.userData = { innen, glieder, daumen: { tg, t1, t2 } };
  return wurzel;
}

/** Haltung setzen: gewichtete Mischung der drei Gesten w = [Stein, Papier, Schere] (Summe 1). */
export function mischePose(w) {
  const c = [0, 0, 0, 0], s = [0, 0, 0, 0], th = [0, 0];
  GESTEN_NAMEN.forEach((n, i) => {
    const g = GESTEN[n];
    for (let k = 0; k < 4; k++) { c[k] += w[i] * g.c[k]; s[k] += w[i] * g.s[k]; }
    th[0] += w[i] * g.th[0]; th[1] += w[i] * g.th[1];
  });
  return { c, s, th };
}
/** Pose anwenden. extra: {pump (Höhe), neigung (rad), quetsch (1 = normal), wackeln (rad)} */
export function setzeHand(h, pose, { pump = 0, neigung = 0, quetsch = 1, wackeln = 0 } = {}) {
  const u = h.userData;
  u.glieder.forEach((g, k) => {
    g.fg.rotation.z = pose.s[k];
    g.j1.rotation.x = pose.c[k] * 1.36;
    g.j2.rotation.x = pose.c[k] * 1.62;
  });
  u.daumen.tg.rotation.z = pose.th[0];
  u.daumen.tg.rotation.x = pose.th[1] * 0.35;
  u.daumen.tg.position.z = 0.1 + pose.th[1] * 0.2;
  u.daumen.t1.rotation.x = pose.th[1] * 0.5;
  u.daumen.t2.rotation.x = pose.th[1] * 0.7;
  u.innen.position.y = pump;
  u.innen.rotation.z = neigung + wackeln;
  u.innen.scale.set(1 / Math.sqrt(quetsch), quetsch, 1 / Math.sqrt(quetsch));
}

// =====================================================================================
// Sockel, Bauer, Würfel, Kopf-Figur
// =====================================================================================
export function sockel({ farbe = TON.rot, radius = 0.95, hoehe = 0.5 } = {}) {
  const g = new THREE.Group();
  teil(new THREE.CylinderGeometry(radius, radius * 1.06, hoehe, 40), ton(TON.creme), 0, hoehe / 2, 0, g);
  const ring = teil(new THREE.TorusGeometry(radius * 0.97, 0.07, 14, 48), ton(farbe, { emissiv: farbe, emissivStaerke: 0 }), 0, hoehe + 0.0, 0, g);
  ring.rotation.x = Math.PI / 2;
  g.userData.ring = ring;
  return g;
}
/** Schach-Bauer (Taktik) per Drehkörper */
export function bauer({ farbe = TON.rot } = {}) {
  const g = new THREE.Group();
  const p = [[0, 0], [0.42, 0], [0.45, 0.05], [0.43, 0.11], [0.3, 0.17], [0.2, 0.3], [0.15, 0.5], [0.2, 0.58], [0.34, 0.62], [0.34, 0.69], [0.2, 0.73], [0]].filter((v) => v.length === 2).map(([x, y]) => new THREE.Vector2(x, y));
  teil(new THREE.LatheGeometry(p, 40), ton(farbe), 0, 0, 0, g);
  teil(new THREE.SphereGeometry(0.235, 28, 20), ton(farbe), 0, 0.93, 0, g);
  return g;
}
/** Würfel mit Augen (Zufall) */
export function wuerfel({ farbe = TON.cyan, augen = TON.tinte, groesse = 0.72 } = {}) {
  const g = new THREE.Group();
  const k = new THREE.Group();
  g.add(k);
  teil(rbox(groesse, groesse, groesse, 0.14), ton(farbe), 0, 0, 0, k);
  const aug = ton(augen, { bump: 0.2 });
  const pos = {
    1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  };
  const d = groesse * 0.26, h = groesse / 2;
  const seiten = [[1, [0, 0, h], [0, 0, 0]], [6, [0, 0, -h], [0, Math.PI, 0]], [2, [h, 0, 0], [0, Math.PI / 2, 0]], [5, [-h, 0, 0], [0, -Math.PI / 2, 0]], [3, [0, h, 0], [-Math.PI / 2, 0, 0]], [4, [0, -h, 0], [Math.PI / 2, 0, 0]]];
  for (const [n, p, r] of seiten) {
    const s = new THREE.Group();
    s.position.set(...p);
    s.rotation.set(...r);
    for (const [x, y] of pos[n]) { const a = teil(new THREE.SphereGeometry(groesse * 0.07, 14, 10), aug, x * d, y * d, 0, s, { werfen: false }); a.scale.z = 0.45; }
    k.add(s);
  }
  g.userData.korpus = k;
  return g;
}
/** Kopf-Figur ohne Gesicht (Mensch): Körper, Kopf, Haare, Ohren */
export function kopfFigur({ farbe = TON.cyan, haut = "#F4C9A0" } = {}) {
  const g = new THREE.Group();
  const k = new THREE.Group();
  g.add(k);
  const kp = teil(new THREE.CapsuleGeometry(0.29, 0.34, 8, 18), ton(farbe), 0, 0.3, 0, k);
  kp.scale.set(1, 1, 0.84);
  teil(new THREE.SphereGeometry(0.27, 28, 20), ton(haut), 0, 0.93, 0, k);
  const haar = teil(new THREE.SphereGeometry(0.285, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.56), ton(TON.haare), 0, 0.96, -0.02, k);
  haar.rotation.x = -0.3;
  for (const s of [-1, 1]) teil(new THREE.SphereGeometry(0.06, 12, 10), ton(haut), s * 0.27, 0.92, 0, k);
  g.userData.korpus = k;
  return g;
}

// =====================================================================================
// Brett mit n×n Mulden und Kacheln (steht senkrecht, Vorderseite nach +z)
// =====================================================================================
export function brett({ n = 10, teilung = 0.18, rand = 0.15 } = {}) {
  const g = new THREE.Group();
  const seite = n * teilung;
  const aussen = seite + 2 * rand;
  teil(rbox(aussen, aussen, 0.16, 0.12), ton(TON.holz), 0, 0, 0, g);
  teil(rbox(seite + 0.07, seite + 0.07, 0.06, 0.05), ton(TON.brett), 0, 0, 0.085, g);
  // Mulden als Instanzen
  const mgeo = new THREE.PlaneGeometry(teilung * 0.86, teilung * 0.86);
  const mulden = new THREE.InstancedMesh(mgeo, ton(TON.mulde, { bump: 0.3 }), n * n);
  mulden.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const platz = (i) => {
    const sp = i % n, ze = Math.floor(i / n);
    return [(-(n - 1) / 2 + sp) * teilung, ((n - 1) / 2 - ze) * teilung];
  };
  for (let i = 0; i < n * n; i++) { const [x, y] = platz(i); dummy.position.set(x, y, 0.118); dummy.updateMatrix(); mulden.setMatrixAt(i, dummy.matrix); }
  g.add(mulden);
  // Kacheln
  const kgeo = rbox(teilung * 0.86, teilung * 0.86, 0.1, 0.034, 2);
  const mats = { rot: ton(TON.rot), cyan: ton(TON.cyan), remis: ton(TON.remis) };
  const kacheln = [];
  for (let i = 0; i < n * n; i++) {
    const [x, y] = platz(i);
    const k = teil(kgeo, mats.rot, x, y, 0.15, g);
    k.visible = false;
    kacheln.push(k);
  }
  g.userData = { n, teilung, platz, kacheln, mats, mulden, aussen };
  return g;
}
/** Kachel setzen: groesse 0..1.x (Skalierung), farbe "rot"|"cyan"|"remis", drehung (rad um y, für das Umdrehen) */
export function setzeKachel(b, i, { groesse = 0, farbe = "remis", drehung = 0, hebe = 0 } = {}) {
  const k = b.userData.kacheln[i];
  const sichtbar = groesse > 0.002;
  k.visible = sichtbar;
  if (!sichtbar) return;
  k.material = b.userData.mats[farbe];
  k.scale.set(groesse, groesse, Math.max(0.2, groesse));
  k.rotation.y = drehung;
  k.position.z = 0.15 + hebe;
}

// =====================================================================================
// Raum: Wand, Tisch, Sockelleiste
// =====================================================================================
export function raum() {
  const g = new THREE.Group();
  const wand = teil(new THREE.BoxGeometry(30, 22, 0.4), ton(TON.wand, { bump: 0.35 }), 0, 7, -3.4, g, { werfen: false });
  wand.receiveShadow = true;
  const tisch = teil(rbox(16, 0.9, 12, 0.3), ton(TON.tisch, { bump: 0.5 }), 0, -0.52, 1.8, g, { werfen: false });
  tisch.receiveShadow = true;
  // dezente Wandpunkte (Tapete), damit die Fläche nicht leer wirkt
  const pg = new THREE.CircleGeometry(0.16, 20);
  const pm = new THREE.MeshStandardMaterial({ color: new THREE.Color(TON.wand).multiplyScalar(0.94), roughness: 0.9 });
  for (let j = 0; j < 11; j++) for (let i = 0; i < 13; i++) {
    const p = new THREE.Mesh(pg, pm);
    p.position.set(-6.6 + i * 1.1 + (j % 2) * 0.55, -0.4 + j * 1.15, -3.19);
    g.add(p);
  }
  return g;
}
