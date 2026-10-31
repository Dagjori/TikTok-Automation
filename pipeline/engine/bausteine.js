// Bausteine für Spielzeug-Welten: abgerundete Häuser, Hochhaus, Figuren, Autos, Bäume, Münzen,
// Geldbündel, Straßen und weiche Kontaktschatten. Maße in Metern „Spielzeugmaßstab“ (Haus ≈ 1–2 m).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const FARBE = {
  tinte: "#14171F", blau: "#2F6FED", orange: "#FF7A1A", gruen: "#19B36B", gelb: "#FFD23F",
  weiss: "#F8F6F1", creme: "#FFF3E0", hellblau: "#BCD4FF", himmelblau: "#8DB7FF", rosa: "#FF9F8E",
  koralle: "#FF6B5B", salbei: "#C9E4BC", rasen: "#A9D98F", sand: "#F1E2C4", grau: "#D5DAE3",
  stein: "#B9C0CC", asphalt: "#8C93A3", dunkel: "#2A2F3A", haut: "#FFDCC0", gold: "#FFC23A",
  geld: "#3FBF7F", geldDunkel: "#2E9E68",
};

const matCache = new Map();
/** Spielzeug-Material (matt, leicht seidig). Gecacht nach Parametern. */
export function mat(farbe, { rau = 0.62, metall = 0, emissiv = null, emissivStaerke = 1, transparent = false, deckkraft = 1 } = {}) {
  const key = [farbe, rau, metall, emissiv, emissivStaerke, transparent, deckkraft].join("|");
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color: farbe, roughness: rau, metalness: metall, transparent, opacity: deckkraft });
  if (emissiv) {
    m.emissive = new THREE.Color(emissiv);
    m.emissiveIntensity = emissivStaerke;
  }
  matCache.set(key, m);
  return m;
}
/** Leuchtmaterial mit HDR-Farbe (für Bloom), unabhängig vom Licht */
export function leucht(farbe, staerke = 3) {
  const c = new THREE.Color(farbe).multiplyScalar(staerke);
  return new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
}

const geoCache = new Map();
function rbGeo(b, h, t, r, seg) {
  const key = [b, h, t, r, seg].join("|");
  if (!geoCache.has(key)) {
    const g = new RoundedBoxGeometry(b, h, t, seg, r);
    g.translate(0, h / 2, 0); // Unterkante auf y = 0
    geoCache.set(key, g);
  }
  return geoCache.get(key);
}

function schatten(o, werfen = true, empfangen = true) {
  o.traverse((k) => {
    if (k.isMesh) {
      k.castShadow = werfen;
      k.receiveShadow = empfangen;
    }
  });
  return o;
}

/** Abgerundeter Quader, Unterkante auf y = 0 */
export function rundeBox(b, h, t, { farbe = FARBE.weiss, radius = 0.06, segmente = 3, material = null } = {}) {
  return schatten(new THREE.Mesh(rbGeo(b, h, t, radius, segmente), material || mat(farbe)));
}

// ---------- weicher Kontaktschatten (Blob) ----------
let blobTex = null;
function blobTextur() {
  if (blobTex) return blobTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(0,0,0,1)");
  r.addColorStop(0.45, "rgba(0,0,0,0.55)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  blobTex = new THREE.CanvasTexture(c);
  return blobTex;
}
/** Weicher Schatten unter einem Objekt (verankert Objekte optisch am Boden) */
export function kontaktSchatten(b, t, staerke = 0.35, farbe = "#1A2238") {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(b, t),
    new THREE.MeshBasicMaterial({ color: farbe, alphaMap: blobTextur(), transparent: true, opacity: staerke, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.006;
  m.renderOrder = 1;
  return m;
}

// ---------- Haus ----------
function dachGeo(breite, tiefe, hoehe, ueberstand = 0.12) {
  const s = new THREE.Shape();
  const hb = tiefe / 2 + ueberstand;
  s.moveTo(-hb, 0);
  s.lineTo(hb, 0);
  s.lineTo(0, hoehe);
  s.lineTo(-hb, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: breite + ueberstand * 2 - 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 1 });
  g.translate(0, 0, -(breite + ueberstand * 2 - 0.1) / 2);
  g.rotateY(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/**
 * Wohnhaus mit Satteldach. Vorderseite zeigt nach +z.
 * Rückgabe: { gruppe, bildschirm (Material, HDR-Farbe steuerbar), tuer (lokale Position vor der Tür) }
 */
export function haus({ breite = 1.5, tiefe = 1.3, hoehe = 1.05, wand = FARBE.weiss, dach = FARBE.orange, dachHoehe = 0.62, tuerFarbe = FARBE.blau } = {}) {
  const g = new THREE.Group();
  g.add(rundeBox(breite, hoehe, tiefe, { farbe: wand, radius: 0.09 }));
  const d = schatten(new THREE.Mesh(dachGeo(breite, tiefe, dachHoehe), mat(dach, { rau: 0.55 })));
  d.position.y = hoehe - 0.02;
  g.add(d);
  // Tür
  const tuer = rundeBox(0.3, 0.5, 0.08, { farbe: tuerFarbe, radius: 0.04 });
  tuer.position.set(-breite * 0.2, 0, tiefe / 2);
  g.add(tuer);
  // Fenster mit Bildschirm-Leuchten
  const rahmen = rundeBox(0.46, 0.4, 0.06, { farbe: FARBE.weiss, radius: 0.035 });
  rahmen.position.set(breite * 0.2, hoehe * 0.38, tiefe / 2 + 0.005);
  g.add(rahmen);
  const glasMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#2B3550") });
  const glas = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.3), glasMat);
  glas.position.set(breite * 0.2, hoehe * 0.38 + 0.2, tiefe / 2 + 0.037);
  g.add(glas);
  // Seitenfenster
  const seite = rundeBox(0.06, 0.34, 0.4, { farbe: FARBE.weiss, radius: 0.03 });
  seite.position.set(breite / 2 + 0.005, hoehe * 0.38, 0);
  g.add(seite);
  // Rückfenster (TV-Leuchten auch von hinten sichtbar)
  const hinten = rundeBox(0.46, 0.4, 0.06, { farbe: FARBE.weiss, radius: 0.035 });
  hinten.position.set(-breite * 0.15, hoehe * 0.38, -tiefe / 2 - 0.005);
  g.add(hinten);
  const glas3 = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.3), glasMat);
  glas3.rotation.y = Math.PI;
  glas3.position.set(-breite * 0.15, hoehe * 0.38 + 0.2, -tiefe / 2 - 0.037);
  g.add(glas3);
  const glas2 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.26), glasMat);
  glas2.rotation.y = Math.PI / 2;
  glas2.position.set(breite / 2 + 0.037, hoehe * 0.38 + 0.17, 0);
  g.add(glas2);
  g.add(kontaktSchatten(breite * 1.6, tiefe * 1.6, 0.28));
  return { gruppe: g, bildschirm: glasMat, tuer: new THREE.Vector3(-breite * 0.2, 0, tiefe / 2 + 0.35) };
}

/** Bildschirm-Material zwischen „aus“ und „TV leuchtet blau“ blenden (0..1), flackern optional */
export function setzeBildschirm(material, an, flackern = 0) {
  const aus = new THREE.Color("#2B3550");
  const ein = new THREE.Color("#5FB0FF").multiplyScalar(3.2 * (1 - flackern * 0.25));
  material.color.copy(aus).lerp(ein, an);
}

/**
 * Bürohochhaus mit Fenster-Raster auf allen vier Seiten.
 * Rückgabe: { gruppe, anzahl, setzeFenster(fn(i, info) → Helligkeit 0..1), fensterInfo[] }
 */
export function hochhaus({ breite = 2.6, tiefe = 2.6, hoehe = 7, etagen = 11, spalten = 4, wand = "#EEF2F8", akzent = FARBE.blau } = {}) {
  const g = new THREE.Group();
  const sockel = 0.7;
  g.add(rundeBox(breite + 0.2, sockel, tiefe + 0.2, { farbe: "#DCE3EE", radius: 0.1 }));
  const koerper = rundeBox(breite, hoehe - sockel, tiefe, { farbe: wand, radius: 0.14 });
  koerper.position.y = sockel;
  g.add(koerper);
  const dach = rundeBox(breite * 0.6, 0.35, tiefe * 0.5, { farbe: "#D3DAE6", radius: 0.08 });
  dach.position.y = hoehe;
  g.add(dach);
  const band = rundeBox(breite + 0.06, 0.16, tiefe + 0.06, { farbe: akzent, radius: 0.06 });
  band.position.y = hoehe - 0.45;
  g.add(band);
  // Eingang
  const eingang = rundeBox(0.8, 0.5, 0.1, { farbe: "#2B3550", radius: 0.04, material: mat("#3A4766", { rau: 0.2 }) });
  eingang.position.set(0, 0, tiefe / 2 + 0.1);
  g.add(eingang);

  const fw = (breite - 0.5) / spalten * 0.7;
  const fh = (hoehe - sockel - 0.9) / etagen * 0.62;
  const fGeo = new RoundedBoxGeometry(fw, fh, 0.06, 1, 0.025);
  const info = [];
  const seiten = [
    { n: new THREE.Vector3(0, 0, 1), b: breite },
    { n: new THREE.Vector3(1, 0, 0), b: tiefe },
    { n: new THREE.Vector3(0, 0, -1), b: breite },
    { n: new THREE.Vector3(-1, 0, 0), b: tiefe },
  ];
  seiten.forEach((s, si) => {
    for (let e = 0; e < etagen; e++) {
      for (let c = 0; c < spalten; c++) {
        const u = ((c + 0.5) / spalten - 0.5) * (s.b - 0.5);
        const y = sockel + 0.35 + (e + 0.5) * ((hoehe - sockel - 0.9) / etagen);
        const pos = new THREE.Vector3();
        const tang = new THREE.Vector3(-s.n.z, 0, s.n.x);
        const tiefeHalb = s.n.x !== 0 ? breite / 2 : tiefe / 2;
        pos.copy(s.n).multiplyScalar(tiefeHalb + 0.012).addScaledVector(tang, u);
        pos.y = y;
        info.push({ pos, seite: si, etage: e, spalte: c, rot: Math.atan2(s.n.x, s.n.z) });
      }
    }
  });
  const anMesh = new THREE.InstancedMesh(fGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), info.length);
  const ausMesh = new THREE.InstancedMesh(fGeo, mat("#33405C", { rau: 0.18, metall: 0.1 }), info.length);
  anMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(info.length * 3), 3);
  ausMesh.castShadow = false;
  ausMesh.receiveShadow = true;
  g.add(anMesh, ausMesh);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const warm = new THREE.Color("#FFE2A8");
  const dunkel = new THREE.Color("#33405C");
  const tmp = new THREE.Color();
  function setzeFenster(fn) {
    let a = 0, b = 0;
    info.forEach((f, i) => {
      const hell = fn(i, f);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), f.rot);
      m4.compose(f.pos, q, new THREE.Vector3(1, 1, 1));
      if (hell > 0.02) {
        anMesh.setMatrixAt(a, m4);
        tmp.copy(dunkel).lerp(warm, Math.min(1, hell)).multiplyScalar(0.6 + 1.5 * hell);
        anMesh.setColorAt(a, tmp);
        a++;
      } else {
        ausMesh.setMatrixAt(b++, m4);
      }
    });
    anMesh.count = a;
    ausMesh.count = b;
    anMesh.instanceMatrix.needsUpdate = true;
    anMesh.instanceColor.needsUpdate = true;
    ausMesh.instanceMatrix.needsUpdate = true;
  }
  setzeFenster(() => 1);
  g.add(kontaktSchatten(breite * 1.9, tiefe * 1.9, 0.35));
  return { gruppe: g, setzeFenster, fensterInfo: info, anzahl: info.length, hoehe, tuer: new THREE.Vector3(0, 0, tiefe / 2 + 0.5) };
}

// ---------- Figur ----------
const figurGeo = {
  koerper: (() => { const g = new THREE.CapsuleGeometry(0.11, 0.2, 6, 14); g.translate(0, 0.21, 0); return g; })(),
  kopf: (() => { const g = new THREE.SphereGeometry(0.095, 20, 14); g.translate(0, 0.47, 0); return g; })(),
};
/** Spielfigur (abstrakt, ohne Gesicht). Blickrichtung +z. */
export function figur({ farbe = FARBE.orange, kopf = FARBE.haut } = {}) {
  const g = new THREE.Group();
  const k = new THREE.Mesh(figurGeo.koerper, mat(farbe, { rau: 0.5 }));
  const h = new THREE.Mesh(figurGeo.kopf, mat(kopf, { rau: 0.55 }));
  g.add(k, h);
  schatten(g, true, false);
  const s = kontaktSchatten(0.42, 0.42, 0.32);
  g.add(s);
  g.userData = { koerper: k, kopf: h, schatten: s };
  return g;
}
/** Figur an Position mit Laufbewegung setzen (phase in Schritten, laeuft 0..1) */
export function setzeFigur(f, pos, richtung, phase = 0, laeuft = 1) {
  const hub = Math.abs(Math.sin(phase * Math.PI)) * 0.05 * laeuft;
  f.position.set(pos.x, pos.y ?? 0, pos.z);
  f.userData.koerper.position.y = hub;
  f.userData.kopf.position.y = hub * 1.1;
  f.userData.koerper.rotation.z = Math.sin(phase * Math.PI) * 0.06 * laeuft;
  f.rotation.y = richtung;
}

// ---------- Auto ----------
const radGeo = (() => { const g = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 20); g.rotateX(Math.PI / 2); return g; })();
/** Spielzeugauto, fährt in Richtung +x. Länge ca. 1 m. */
export function auto({ farbe = FARBE.blau, dachFarbe = null, laenge = 1.0 } = {}) {
  const g = new THREE.Group();
  const l = laenge;
  const karo = rundeBox(l, 0.28, 0.5, { farbe, radius: 0.1 });
  karo.position.y = 0.08;
  g.add(karo);
  const kabine = rundeBox(l * 0.52, 0.24, 0.44, { material: mat("#2D3A55", { rau: 0.15, metall: 0.2 }), radius: 0.08 });
  kabine.position.set(-l * 0.06, 0.32, 0);
  g.add(kabine);
  const dach = rundeBox(l * 0.46, 0.06, 0.42, { farbe: dachFarbe || farbe, radius: 0.03 });
  dach.position.set(-l * 0.06, 0.53, 0);
  g.add(dach);
  const radMat = mat(FARBE.dunkel, { rau: 0.8 });
  [[0.3, 0.25], [-0.3, 0.25], [0.3, -0.25], [-0.3, -0.25]].forEach(([x, z]) => {
    const r = new THREE.Mesh(radGeo, radMat);
    r.position.set(x * l, 0.1, z);
    r.castShadow = true;
    g.add(r);
  });
  const licht = leucht("#FFF4D6", 2.2);
  [-0.14, 0.14].forEach((z) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), licht);
    s.position.set(l / 2 - 0.01, 0.2, z);
    g.add(s);
  });
  const rueck = leucht("#FF4A3A", 1.6);
  [-0.16, 0.16].forEach((z) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), rueck);
    s.position.set(-l / 2 + 0.01, 0.22, z);
    g.add(s);
  });
  g.add(kontaktSchatten(l * 1.5, 0.9, 0.4));
  return g;
}

// ---------- Baum ----------
const kroneGeo = new THREE.SphereGeometry(1, 20, 14);
const stammGeo = (() => { const g = new THREE.CylinderGeometry(0.05, 0.07, 0.4, 10); g.translate(0, 0.2, 0); return g; })();
export function baum({ groesse = 1, farbe = "#5DBB7A", farbe2 = "#86D09A", seed = 1 } = {}) {
  const g = new THREE.Group();
  const s = new THREE.Mesh(stammGeo, mat("#C49A74"));
  g.add(s);
  const r = (n) => (Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1;
  const k1 = new THREE.Mesh(kroneGeo, mat(farbe, { rau: 0.7 }));
  k1.scale.setScalar(0.32);
  k1.position.y = 0.6;
  const k2 = new THREE.Mesh(kroneGeo, mat(farbe2, { rau: 0.7 }));
  k2.scale.setScalar(0.22);
  k2.position.set(0.14 * Math.sign(r(1) || 1), 0.82, 0.08);
  g.add(k1, k2);
  schatten(g);
  g.scale.setScalar(groesse);
  g.add(kontaktSchatten(0.9, 0.9, 0.25));
  return g;
}

// ---------- Geld ----------
/** Münzgeometrie mit abgerundetem Rand (liegt flach, Dicke in y) */
export function muenzGeo(radius = 0.12, dicke = 0.032) {
  const p = [];
  const r = dicke / 2;
  p.push(new THREE.Vector2(0, -dicke / 2));
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI;
    p.push(new THREE.Vector2(radius - r + Math.cos(a) * r, Math.sin(a) * r));
  }
  p.push(new THREE.Vector2(0, dicke / 2));
  const g = new THREE.LatheGeometry(p, 28);
  return g;
}
export function goldMaterial() {
  return mat(FARBE.gold, { rau: 0.26, metall: 1 });
}

/** Geldbündel (Scheine mit Banderole), Unterkante auf y = 0, Länge entlang x */
export function buendelGeo(l = 0.8, h = 0.1, t = 0.36) {
  const k = new RoundedBoxGeometry(l, h, t, 1, 0.025);
  k.translate(0, h / 2, 0);
  const b = new RoundedBoxGeometry(l * 0.18, h + 0.012, t + 0.012, 1, 0.02);
  b.translate(0, h / 2, 0);
  const g = mergeGeometries([k.toNonIndexed(), b.toNonIndexed()], true);
  return g;
}
export function buendelMaterialien() {
  return [mat(FARBE.geld, { rau: 0.7 }), mat("#FFF1C9", { rau: 0.6 })];
}

// ---------- Straße ----------
/** Gerade Straße entlang x mit Mittellinie (gestrichelt) und Bordsteinen. */
export function strasse({ laenge = 20, breite = 2.2, gestrichelt = true, farbe = "#8C95AA" } = {}) {
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.BoxGeometry(laenge, 0.04, breite), mat(farbe, { rau: 0.9 }));
  s.position.y = 0.02;
  s.receiveShadow = true;
  g.add(s);
  if (gestrichelt) {
    const n = Math.floor(laenge / 0.9);
    const strich = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.01, 0.07), mat("#FFFFFF", { rau: 0.6 }), n);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      m4.makeTranslation(-laenge / 2 + 0.45 + i * 0.9, 0.045, 0);
      strich.setMatrixAt(i, m4);
    }
    strich.receiveShadow = true;
    g.add(strich);
  }
  return g;
}
