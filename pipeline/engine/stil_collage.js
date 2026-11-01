// Stil 6 · Papier-Collage als Three.js-Baukasten (Muster: stile/stil_6_collage.*, neu gebaut nach der Regel „nur Three.js“).
// Packpapier-Grund mit Faser, gerissene Papierkanten mit weißem Rand, weiche Papierschatten, Rasterpunkte, Klebeband,
// Schreibmaschinen-Etiketten und Papierfiguren. Bühne: ComicBuehne (stil_comic.js) ohne Licht; Welt in Bild-Pixeln wie stil_flat.js
// (orthografische Kamera, y nach unten, Wurzelgruppe links oben).
//
// Papierstück:  papier(eltern, rechteck(300, 200, 6), "#FBF7EE", { x: 540, y: 900, z: 3, dreh: -2, schatten: 1, raster: "#FFFFFF" })
//   Formen sind Vielecke um (0, 0) in Pixeln (y nach unten): rechteck(w, h, r), kreisForm(r), halbkreis(r), oder eigene Punkte.
//   Alle Rissränder entstehen aus einem festen Zufall (seed) → jedes Bild sieht gleich aus (deterministisch).
// Stop-Motion: stopp(t, fps = 12) rastet Zeiten auf 12 Bilder je Sekunde (kleine Teile wippen ruckartig wie Papier-Animation).
import * as THREE from "three";
import { FlatBuehne, FlatWelt, FLAT, mat, ton, gruppe, setzePx, rrPfad, textFlaeche } from "./stil_flat.js";

export { FlatBuehne as CollageBuehne, FlatWelt as CollageWelt, gruppe, setzePx, ton, textFlaeche, mat };

export const COLLAGE = {
  kraft: "#C9A77C",
  kraftDunkel: "#B58F63",
  kraftHell: "#D8BC93",
  pappe: "#A98B63",
  papier: "#FBF7EE",
  saum: "#F7F1E3",
  zeitung: "#EDE7D8",
  druck: "#8A8578",
  tinte: "#2A2622",
  rot: "#C8371D",
  band: "#F1E3B8",
  schatten: "#3A2810",
};

/** Deterministischer Zufall (Linear-Kongruenz) */
export function zufall(seed = 1) {
  let s = (seed * 2654435761) >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export const stopp = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps;

// ---------------------------------------------------------------------------------------------------------------
// Texturen (alle aus Code, keine fremden Dateien)
// ---------------------------------------------------------------------------------------------------------------
const texCache = {};
function leinwand(b, h = b) {
  const c = document.createElement("canvas");
  c.width = b;
  c.height = h;
  return [c, c.getContext("2d")];
}
/** Papierfaser (Graustufen, kachelbar, 512 px = eine Wiederholung): Multiplikator um 0,9 mit feinen hellen und dunklen Fasern */
export function faserTextur() {
  if (texCache.faser) return texCache.faser;
  const N = 512;
  const [c, g] = leinwand(N);
  const r = zufall(77);
  const img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const v = 232 + Math.floor(r() * 22) - (r() < 0.04 ? 24 : 0);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 900; i++) {
    const x = r() * N, y = r() * N, a = r() * Math.PI, l = 6 + r() * 22;
    g.strokeStyle = r() < 0.5 ? "rgba(255,250,235,0.35)" : "rgba(120,95,60,0.16)";
    g.lineWidth = 0.6 + r() * 0.9;
    for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) {
      g.beginPath();
      g.moveTo(x + ox, y + oy);
      g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / N, 1 / N);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (texCache.faser = t);
}
/** Rasterpunkte (halbtransparent, 16 px Abstand, 28° gedreht): Alpha-Textur für Überzüge */
export function punktTextur() {
  if (texCache.punkt) return texCache.punkt;
  const [c, g] = leinwand(32);
  g.fillStyle = "rgba(20,20,40,0.55)";
  g.beginPath();
  g.arc(16, 16, 6.2, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(0, 0, 6.2, 0, Math.PI * 2);
  g.arc(32, 0, 6.2, 0, Math.PI * 2);
  g.arc(0, 32, 6.2, 0, Math.PI * 2);
  g.arc(32, 32, 6.2, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 20, 1 / 20);
  t.center.set(0.5, 0.5);
  t.rotation = (28 * Math.PI) / 180;
  t.colorSpace = THREE.SRGBColorSpace;
  return (texCache.punkt = t);
}
/** Zeitungsdruck: graue Spaltenzeilen und Schlagzeilenbalken (Alpha-Textur, 400 px Wiederholung) */
export function zeitungsTextur() {
  if (texCache.zeitung) return texCache.zeitung;
  const N = 400;
  const [c, g] = leinwand(N);
  const r = zufall(31);
  g.fillStyle = "rgba(58,54,46,0.55)";
  g.fillRect(24, 26, 230 + r() * 80, 15);
  for (let col = 0; col < 2; col++) {
    for (let y = 70; y < N - 20; y += 14) {
      const w = 150 - (r() < 0.14 ? 60 : 0);
      g.fillStyle = "rgba(90,84,72,0.5)";
      g.fillRect(24 + col * 180, y, w, 5);
    }
  }
  g.fillStyle = "rgba(70,64,54,0.28)";
  g.fillRect(24 + 168, 66, 2, N - 90);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / N, 1 / N);
  t.colorSpace = THREE.SRGBColorSpace;
  return (texCache.zeitung = t);
}
/** Kraftpapier-Grund: weiche Flecken und Fasern, kachelbar (1024 px) */
export function kraftTextur() {
  if (texCache.kraft) return texCache.kraft;
  const N = 1024;
  const [c, g] = leinwand(N);
  const r = zufall(5);
  g.fillStyle = COLLAGE.kraft;
  g.fillRect(0, 0, N, N);
  for (let i = 0; i < 140; i++) {
    const x = r() * N, y = r() * N, rad = 40 + r() * 140;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const dunkel = r() < 0.5;
    gr.addColorStop(0, dunkel ? "rgba(150,110,60,0.13)" : "rgba(255,235,200,0.13)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) { g.save(); g.translate(ox, oy); g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore(); }
  }
  for (let i = 0; i < 3200; i++) {
    const x = r() * N, y = r() * N, l = 10 + r() * 38, a = (r() - 0.5) * 0.5; // Fasern laufen fast waagerecht
    g.strokeStyle = r() < 0.55 ? "rgba(120,86,48,0.2)" : "rgba(255,238,205,0.22)";
    g.lineWidth = 0.7 + r() * 1.1;
    for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) {
      g.beginPath();
      g.moveTo(x + ox, y + oy);
      g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / N, 1 / N);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (texCache.kraft = t);
}

// ---------------------------------------------------------------------------------------------------------------
// Materialien
// ---------------------------------------------------------------------------------------------------------------
const matCache = new Map();
/** Papier-Material: Farbe × Faser. eigen: true = eigenes Material (animierte Deckkraft) */
export function papierMat(farbe, deckkraft = 1, { eigen = false, faser = true } = {}) {
  // Die Faser dunkelt im Mittel um ca. 12 % (linear) ab: Farbe vorab anheben, damit Teamfarben im Bild stimmen
  const neu = () => new THREE.MeshBasicMaterial({
    color: new THREE.Color(farbe).multiplyScalar(faser ? 1.13 : 1), map: faser ? faserTextur() : null, transparent: deckkraft < 1 || eigen, opacity: deckkraft,
    depthWrite: deckkraft >= 1 && !eigen, side: THREE.DoubleSide,
  });
  if (eigen) return neu();
  const k = `${farbe}|${deckkraft}|${faser}`;
  if (!matCache.has(k)) matCache.set(k, neu());
  return matCache.get(k);
}
const schattenMat = (a) => {
  const k = `schatten|${a}`;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshBasicMaterial({ color: COLLAGE.schatten, transparent: true, opacity: a, depthWrite: false }));
  return matCache.get(k);
};
const ueberzugMat = (textur, farbe = "#FFFFFF", a = 1) => {
  const k = `ueberzug|${textur.uuid}|${farbe}|${a}`;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshBasicMaterial({ color: farbe, map: textur, transparent: true, opacity: a, depthWrite: false }));
  return matCache.get(k);
};

// ---------------------------------------------------------------------------------------------------------------
// Formen (Vielecke um (0, 0), y nach unten)
// ---------------------------------------------------------------------------------------------------------------
/** Rechteck w × h um (0, 0), r = Eckenradius */
export function rechteck(w, h, r = 0) {
  const x = w / 2, y = h / 2;
  if (r <= 0) return [[-x, -y], [x, -y], [x, y], [-x, y]];
  r = Math.min(r, x, y);
  const p = [];
  const ecke = (cx, cy, a0) => { for (let i = 0; i <= 4; i++) { const a = a0 + (i / 4) * (Math.PI / 2); p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  ecke(x - r, -y + r, -Math.PI / 2);
  ecke(x - r, y - r, 0);
  ecke(-x + r, y - r, Math.PI / 2);
  ecke(-x + r, -y + r, Math.PI);
  return p;
}
/** Kreis bzw. Ellipse (n Ecken) */
export function kreisForm(rx, ry = rx, n = 28) {
  return Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * rx, Math.sin((i / n) * Math.PI * 2) * ry]);
}
/** Halbkreis nach oben (flache Seite unten bei y = 0) */
export function halbkreis(r, n = 14) {
  const p = [[-r, 0]];
  for (let i = 1; i < n; i++) p.push([-Math.cos((i / n) * Math.PI) * r, -Math.sin((i / n) * Math.PI) * r]);
  p.push([r, 0]);
  return p;
}
/** Rissrand: jede Kante in Stücke teilen und quer zur Kante versetzen */
export function rissPunkte(poly, rnd, amp = 3, schritt = 10) {
  if (amp <= 0) return poly.map((p) => p.slice());
  const out = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % n];
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1;
    const k = Math.max(1, Math.round(l / schritt));
    const nx = -dy / l, ny = dx / l;
    for (let j = 0; j < k; j++) {
      const t = j / k, a = (rnd() - 0.5) * 2 * amp;
      out.push([x0 + dx * t + nx * a, y0 + dy * t + ny * a]);
    }
  }
  return out;
}
const shapeAus = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, -y)));
function geometrie(pts, rnd) {
  const g = new THREE.ShapeGeometry(shapeAus(pts), 4);
  const uv = g.attributes.uv;
  const ox = rnd() * 600, oy = rnd() * 600;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + ox, uv.getY(i) + oy);
  return g;
}
const mittelpunkt = (p) => p.reduce((a, q) => [a[0] + q[0] / p.length, a[1] + q[1] / p.length], [0, 0]);
/** Vieleck vom Mittelpunkt aus um d Pixel nach außen schieben (für den weißen Rand) */
function aufgeblaeht(p, d) {
  const [cx, cy] = mittelpunkt(p);
  return p.map(([x, y]) => { const l = Math.hypot(x - cx, y - cy) || 1; return [x + ((x - cx) / l) * d, y + ((y - cy) / l) * d]; });
}

// ---------------------------------------------------------------------------------------------------------------
// Papierstück
// ---------------------------------------------------------------------------------------------------------------
/**
 * Papierstück mit Rissrand, weißem Saum, Schatten und optionalen Rasterpunkten bzw. Druck.
 * form: Vieleck um (0, 0); x, y: Mitte in px (y nach unten); z: Tiefe; dreh: Grad (im Uhrzeigersinn)
 * opt: amp (Rissstärke px), schritt (px), saum (Farbe | false), schatten (0..2), raster (Farbe | false), druck (Textur), seed, eigen, deckkraft
 * Rückgabe: { g (Gruppe), farbe (Mesh), saum (Mesh), meshes[] } – bei eigen: true lassen sich Deckkraft und Farbe animieren
 */
export function papier(eltern, form, farbe, { x = 0, y = 0, z = 0, dreh = 0, amp = 3, schritt = 10, saum = COLLAGE.saum, schatten = 1, raster = false, druck = null, seed = 1, eigen = false, deckkraft = 1, faser = true, sx = 1, sy = 1 } = {}) {
  const rnd = zufall(seed);
  const g = new THREE.Group();
  g.position.set(x, -y, z);
  g.rotation.z = (-dreh * Math.PI) / 180;
  g.scale.set(sx, sy, 1);
  const pts = rissPunkte(form, rnd, amp, schritt);
  const geo = geometrie(pts, rnd);
  const meshes = [];
  if (schatten > 0 && deckkraft >= 1) {
    const sm = schattenMat(0.09 * Math.min(schatten, 1.6));
    for (let i = 1; i <= 3; i++) {
      const s = new THREE.Mesh(geo, sm);
      s.position.set(2.2 * i * schatten, -3.6 * i * schatten, -0.3 + i * 0.01);
      g.add(s);
    }
  }
  let saumMesh = null;
  if (saum && deckkraft >= 1) {
    const sp = rissPunkte(aufgeblaeht(form, 2.6), rnd, Math.max(amp * 0.8, 0.8), schritt);
    saumMesh = new THREE.Mesh(geometrie(sp, rnd), papierMat(saum, 1, { eigen }));
    saumMesh.position.z = -0.1;
    g.add(saumMesh);
    meshes.push(saumMesh);
  }
  const m = new THREE.Mesh(geo, papierMat(farbe, deckkraft, { eigen, faser }));
  g.add(m);
  meshes.push(m);
  if (raster) {
    const r = new THREE.Mesh(geo, ueberzugMat(punktTextur(), raster, 0.5));
    r.position.z = 0.02;
    g.add(r);
  }
  if (druck) {
    const d = new THREE.Mesh(geo, ueberzugMat(druck, "#FFFFFF", 1));
    d.position.z = 0.03;
    g.add(d);
  }
  if (eltern) eltern.add(g);
  return { g, farbe: m, saum: saumMesh, meshes };
}
/** Deckkraft aller eigenen Materialien eines Papierstücks */
export function blende(p, a) {
  for (const m of p.meshes) { m.material.opacity = a; m.visible = a > 0.01; }
}
/** Klebeband: halbtransparenter Streifen mit gezackten Enden */
export function band(eltern, x, y, w, dreh = 0, z = 5, { farbe = COLLAGE.band, h = 38, seed = 3 } = {}) {
  return papier(eltern, rechteck(w, h), farbe, { x, y, z, dreh, amp: 2.2, schritt: 7, saum: false, schatten: 0.5, deckkraft: 0.86, seed, faser: false });
}

// ---------------------------------------------------------------------------------------------------------------
// Grund: Packpapier und Zeitungsfetzen
// ---------------------------------------------------------------------------------------------------------------
/** Packpapier über das ganze Bild (und Reserve für Kamerafahrten) */
export function kraftGrund(eltern, { w = 2600, h = 3800, z = -50 } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: kraftTextur() }));
  const uv = m.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
  m.position.set(540, -960, z);
  if (eltern) eltern.add(m);
  return m;
}
/** Zeitungsfetzen mit Druck */
export function zeitung(eltern, x, y, w, h, dreh, z = 0, seed = 11) {
  return papier(eltern, rechteck(w, h), COLLAGE.zeitung, { x, y, z, dreh, amp: 5, schritt: 12, druck: zeitungsTextur(), schatten: 0.8, seed });
}

// ---------------------------------------------------------------------------------------------------------------
// Münzsäule: Papierscheiben in Seitenansicht, unten Geld, oben Zeit
// ---------------------------------------------------------------------------------------------------------------
/**
 * Säule aus dünnen Papier-Münzen, Standfläche bei (x, boden). setze(geld, zeit) = Anzahl Münzen (auch Bruchteile).
 * Münzen im Geldteil in `farbe`, im Zeitteil in `zeitFarbe` (heller, mit Rasterüberzug). oben = y der Oberkante in px.
 */
export function muenzSaeule(eltern, { x, boden, farbe, zeitFarbe, breite = 176, dicke = 7, max = 64, z = 6, seed = 9 } = {}) {
  const g = new THREE.Group();
  g.position.set(x, -boden, z);
  if (eltern) eltern.add(g);
  const rnd = zufall(seed);
  const geoMuenze = new THREE.ShapeGeometry(rrPfad(-breite / 2, -dicke, breite, dicke, dicke / 2.2), 4);
  const geoGlanz = new THREE.ShapeGeometry(rrPfad(-breite / 2 + 12, -dicke + 1.2, breite * 0.42, 1.8, 0.9), 2);
  const geoSchatten = new THREE.PlaneGeometry(breite + 4, 1);
  const A = [papierMat(ton(farbe, -0.03)), papierMat(ton(farbe, -0.15))];
  const Z = [papierMat(ton(zeitFarbe, -0.03)), papierMat(ton(zeitFarbe, -0.12))];
  const GL = papierMat(ton(farbe, 0.45), 1, { faser: false });
  const GZ = papierMat(ton(zeitFarbe, 0.55), 1, { faser: false });
  // gemeinsamer Schatten hinter der Säule (wächst mit)
  const schattenFlaeche = new THREE.Mesh(geoSchatten, schattenMat(0.14));
  schattenFlaeche.position.set(5, 0, -0.4);
  g.add(schattenFlaeche);
  const rasterMat = ueberzugMat(punktTextur(), "#FFFFFF", 0.7);
  const muenzen = [];
  for (let i = 0; i < max; i++) {
    const c = new THREE.Group();
    const koerper = new THREE.Mesh(geoMuenze, A[i % 2]);
    const glanz = new THREE.Mesh(geoGlanz, GL);
    glanz.position.z = 0.05;
    const rast = new THREE.Mesh(geoMuenze, rasterMat);
    rast.position.z = 0.03;
    c.add(koerper, glanz, rast);
    c.position.z = i * 0.002;
    c.userData = { jx: (rnd() - 0.5) * 7, koerper, glanz, rast };
    g.add(c);
    muenzen.push(c);
  }
  const zustand = { oben: boden, geld: 0, zeit: 0 };
  return {
    g, muenzen, dicke, breite,
    setze(geld, zeit = 0) {
      const gesamt = geld + zeit;
      const n = Math.ceil(gesamt - 1e-6);
      muenzen.forEach((c, i) => {
        const f = Math.max(0, Math.min(1, gesamt - i));
        c.visible = f > 0.001;
        if (!c.visible) return;
        const istGeld = i + 0.5 < geld;
        c.userData.koerper.material = (istGeld ? A : Z)[i % 2];
        c.userData.glanz.material = istGeld ? GL : GZ;
        c.userData.rast.visible = !istGeld;
        c.position.x = c.userData.jx;
        c.position.y = i * dicke;
        c.scale.y = f;
      });
      schattenFlaeche.visible = gesamt > 0.01;
      schattenFlaeche.scale.y = Math.max(0.001, gesamt * dicke);
      schattenFlaeche.position.y = (gesamt * dicke) / 2 - 3;
      zustand.oben = boden - gesamt * dicke;
      zustand.geld = geld;
      zustand.zeit = zeit;
      return zustand.oben;
    },
    get oben() { return zustand.oben; },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Symbole aus Papier (Unterkante Mitte = (0, 0), y nach unten, negativ = nach oben)
// ---------------------------------------------------------------------------------------------------------------
/** Topf mit Deckel und aufsteigendem Dampf */
export function topf({ farbe = "#2ECC71", seed = 21 } = {}) {
  const g = new THREE.Group();
  papier(g, rechteck(110, 62, 8), farbe, { y: -31, z: 0, amp: 1.6, seed, raster: "#FFFFFF" });
  papier(g, rechteck(26, 12, 5), ton(farbe, -0.25), { x: -66, y: -44, z: -0.2, amp: 1, schatten: 0.5, seed: seed + 1 });
  papier(g, rechteck(26, 12, 5), ton(farbe, -0.25), { x: 66, y: -44, z: -0.2, amp: 1, schatten: 0.5, seed: seed + 2 });
  papier(g, rechteck(124, 14, 6), ton(farbe, -0.22), { y: -66, z: 0.2, amp: 1.2, seed: seed + 3 });
  papier(g, halbkreis(50), ton(farbe, 0.2), { y: -72, z: 0.4, amp: 1.5, seed: seed + 4 });
  papier(g, kreisForm(8), ton(farbe, -0.3), { y: -124, z: 0.6, amp: 0.8, schatten: 0.4, seed: seed + 5 });
  papier(g, rechteck(60, 8, 3), "#FFFFFF", { x: -6, y: -42, z: 0.5, dreh: -8, amp: 0.8, saum: false, schatten: 0, deckkraft: 0.55, seed: seed + 6, eigen: true });
  const dampf = [];
  for (let i = 0; i < 4; i++) {
    const p = papier(g, kreisForm(11 + (i % 2) * 5, 9 + (i % 2) * 4), "#FFFFFF", { amp: 2, schritt: 7, saum: false, schatten: 0, seed: 40 + i, eigen: true, deckkraft: 0.8, faser: false });
    p.g.position.z = 1.2;
    dampf.push(p);
  }
  return {
    g,
    setze(t) {
      dampf.forEach((p, i) => {
        const u = ((stopp(t, 12) * 0.55 + i / dampf.length) % 1);
        p.g.position.set(-14 + i * 12 + Math.sin(u * 6 + i) * 6, 128 + u * 60, 1.2);
        p.g.scale.setScalar(0.5 + u * 0.9);
        for (const m of p.meshes) { m.material.opacity = 0.85 * Math.sin(Math.PI * u); m.visible = true; }
      });
    },
  };
}
/** Lieferbeutel (Papiertüte mit Henkel und Zettel) */
export function lieferbeutel({ farbe = "#E040FB", seed = 61 } = {}) {
  const g = new THREE.Group();
  papier(g, [[-48, -92], [48, -92], [58, 0], [-58, 0]], farbe, { z: 0, amp: 1.6, seed, raster: "#FFFFFF" });
  papier(g, [[-48, -92], [48, -92], [50, -74], [-50, -74]], ton(farbe, -0.2), { z: 0.2, amp: 1.2, seed: seed + 1, schatten: 0.4 });
  papier(g, rechteck(46, 30, 3), "#FBF7EE", { x: 0, y: -40, z: 0.4, dreh: -4, amp: 1, seed: seed + 2, schatten: 0.7 });
  for (const dy of [-46, -38, -30]) papier(g, rechteck(30, 3, 1), "#8A8578", { x: 0, y: dy, z: 0.5, dreh: -4, amp: 0.4, saum: false, schatten: 0, faser: false, seed });
  // Henkel (Bogen aus dicken Strichen)
  const bogen = [];
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; bogen.push([-Math.cos(a) * 30, -92 - Math.sin(a) * 34]); }
  for (let i = 1; i < bogen.length; i++) {
    const [x0, y0] = bogen[i - 1], [x1, y1] = bogen[i];
    const l = Math.hypot(x1 - x0, y1 - y0) + 3;
    papier(g, rechteck(l, 8, 3), ton(farbe, -0.3), { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: -0.2, dreh: (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI, amp: 0.4, saum: false, schatten: 0.3, seed });
  }
  return { g };
}
/** Kantinen-Tablett mit Teller, Essen und Becher */
export function tablett({ farbe = "#3F6AF0", seed = 81 } = {}) {
  const g = new THREE.Group();
  papier(g, rechteck(150, 16, 6), farbe, { y: -8, z: 0, amp: 1.4, seed, raster: "#FFFFFF" });
  papier(g, kreisForm(36, 8), "#FBF7EE", { x: -12, y: -22, z: 0.2, amp: 1, schatten: 0.5, seed: seed + 1 });
  papier(g, halbkreis(26), "#E8484F", { x: -22, y: -26, z: 0.4, amp: 1.4, schritt: 6, schatten: 0.4, seed: seed + 2 });
  papier(g, halbkreis(20), "#7FC796", { x: 6, y: -26, z: 0.5, amp: 1.4, schritt: 6, schatten: 0.4, seed: seed + 3 });
  papier(g, rechteck(22, 30, 4), "#FBF7EE", { x: 56, y: -31, z: 0.2, amp: 1, schatten: 0.6, seed: seed + 4 });
  papier(g, rechteck(22, 8, 3), "#8A5A3B", { x: 56, y: -42, z: 0.3, amp: 0.8, saum: false, schatten: 0, seed: seed + 5 });
  return { g };
}
/** Einkaufstüte (Papier) */
export function einkaufstuete({ seed = 101 } = {}) {
  const g = new THREE.Group();
  papier(g, [[-40, -80], [40, -80], [46, 0], [-46, 0]], "#C9A06A", { amp: 1.4, seed, saum: "#EAD9B8" });
  papier(g, kreisForm(14), "#2ECC71", { x: -6, y: -50, z: 0.3, amp: 1.2, seed: seed + 1, schatten: 0.4 });
  papier(g, halbkreis(11), "#E8484F", { x: 14, y: -72, z: 0.3, dreh: 20, amp: 1, seed: seed + 2, schatten: 0.4, saum: false });
  papier(g, rechteck(8, 40, 3), "#4C8B3C", { x: 20, y: -100, z: -0.2, dreh: 14, amp: 0.8, saum: false, seed: seed + 3, schatten: 0.3 });
  return { g };
}
/** Schwamm mit Seifenblasen */
export function schwamm({ seed = 121 } = {}) {
  const g = new THREE.Group();
  papier(g, rechteck(84, 44, 9), "#7FC8E8", { y: -22, amp: 1.6, seed, raster: "#FFFFFF" });
  papier(g, rechteck(84, 12, 5), "#4FA6CC", { y: -6, z: 0.2, amp: 1.2, seed: seed + 1, schatten: 0.5 });
  for (const [x, y, r] of [[-20, -30, 5], [12, -24, 4], [24, -34, 3.4], [-4, -16, 3]]) papier(g, kreisForm(r), "#DDF2FB", { x, y, z: 0.4, amp: 0.5, saum: false, schatten: 0, seed: seed + 3 });
  const blasen = [[-16, -62, 13], [14, -78, 9], [30, -56, 11]].map(([x, y, r], i) => {
    const p = papier(g, kreisForm(r), "#FFFFFF", { x, y, z: 0.8, amp: 0.6, saum: false, schatten: 0.3, deckkraft: 0.75, seed: seed + 5 + i, eigen: true, faser: false });
    p.g.userData = { x, y };
    return p;
  });
  return {
    g,
    setze(t) {
      blasen.forEach((p, i) => { const u = stopp(t, 12) * 1.1 + i; p.g.position.y = -p.g.userData.y + Math.sin(u * 2) * 4; });
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Kalender, der Blätter verliert
// ---------------------------------------------------------------------------------------------------------------
/** Abreißkalender, Mitte bei (0, 0). Das Datum steht als HUD-Zähler darüber (nicht als Textur). */
export function kalender({ w = 300, h = 330, kopf = "#C8371D", seed = 140 } = {}) {
  const g = new THREE.Group();
  // Blockstapel (Papierkanten unten)
  for (let i = 3; i >= 1; i--) papier(g, rechteck(w - 4, h - 20, 6), COLLAGE.papier, { x: i * 2.2, y: i * 4.5 + 6, z: -0.2 - i * 0.02, dreh: (i - 2) * 0.9, amp: 2, seed: seed + i, schatten: i === 3 ? 1.1 : 0 });
  papier(g, rechteck(w, h, 8), COLLAGE.papier, { z: 0, amp: 2.2, seed, schatten: 0.9 });
  papier(g, rechteck(w, 74, 6), kopf, { y: -h / 2 + 37, z: 0.3, amp: 1.6, seed: seed + 5, raster: "#FFFFFF", schatten: 0.4, saum: false });
  for (const dx of [-84, 0, 84]) {
    papier(g, kreisForm(12), "#2A2622", { x: dx, y: -h / 2 + 8, z: 0.8, amp: 0.8, saum: false, schatten: 0.5, seed: seed + 6 });
    papier(g, kreisForm(5), "#B9B3A4", { x: dx, y: -h / 2 + 8, z: 0.9, amp: 0.4, saum: false, schatten: 0, seed: seed + 7 });
  }
  // grobe Zeilen als Platzhalter für die große Zahl (steht als HUD darüber)
  for (let i = 0; i < 3; i++) papier(g, rechteck(w * 0.5 - i * 20, 6, 3), "#D9D3C3", { x: 0, y: 92 + i * 16, z: 0.3, amp: 0.6, saum: false, schatten: 0, seed: seed + 8 + i });
  // Seitenecke, die sich aufrollt
  const lappen = papier(g, [[0, 0], [58, 0], [0, 58]], "#EFE8D6", { x: w / 2 - 58, y: h / 2 - 58, z: 0.5, amp: 1, saum: false, schatten: 0.6, seed: seed + 12 });
  return { g, w, h, lappen };
}
/** Abgerissene Kalenderblätter, die wegfliegen (Pool); rate = Blätter je Sekunde zwischen von und bis */
export function flugBlaetter(eltern, { anzahl = 10, z = 12, seed = 150 } = {}) {
  const g = new THREE.Group();
  g.position.z = z;
  if (eltern) eltern.add(g);
  const blaetter = Array.from({ length: anzahl }, (_, i) => {
    const p = papier(g, rechteck(150, 190, 4), i % 3 === 0 ? "#F4EEDD" : COLLAGE.papier, { amp: 2, seed: seed + i, schatten: 0.7, eigen: true });
    p.g.visible = false;
    return p;
  });
  return {
    g,
    /** t: Zeit; start, ende: Flugfenster; rate: Blätter/s; x0, y0: Startpunkt (Kalendermitte); richtung: 1 rechts / −1 links */
    setze(t, { start, ende, rate = 14, x0 = 540, y0 = 880, leben = 0.75 } = {}) {
      blaetter.forEach((b, s) => {
        const k = Math.floor(((Math.min(t, ende) - start) * rate - s) / anzahl);
        const n = s + anzahl * k;
        const alter = t - (start + n / rate);
        const aktiv = n >= 0 && alter >= 0 && alter < leben && start + n / rate <= ende;
        b.g.visible = aktiv;
        if (!aktiv) return;
        const u = alter / leben;
        const r = zufall(n * 7 + 3);
        const seite = r() < 0.5 ? -1 : 1;
        const vx = seite * (260 + r() * 360), vy = -(420 + r() * 300);
        setzePx(b.g, x0 + vx * alter, y0 + vy * alter + 1500 * alter * alter, 12 + (n % 7) * 0.05);
        b.g.rotation.z = -seite * (alter * (3 + r() * 5));
        b.g.scale.setScalar(1 - 0.35 * u);
        for (const m of b.meshes) { m.material.opacity = 1 - Math.pow(u, 3); m.visible = true; }
      });
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Uhr aus Papier
// ---------------------------------------------------------------------------------------------------------------
/** Papieruhr (Mitte (0, 0)): setze(winkelStunden) dreht beide Zeiger (Stundenzeiger langsam, Minutenzeiger 12×) */
export function papierUhr({ r = 118, farbe = "#FBF7EE", zeiger = "#2A2622", akzent = "#E8484F", seed = 160 } = {}) {
  const g = new THREE.Group();
  papier(g, kreisForm(r, r, 34), "#2A2622", { amp: 1.6, schritt: 11, seed, saum: false, schatten: 1.1, z: -0.1 });
  papier(g, kreisForm(r - 12, r - 12, 34), farbe, { amp: 1.6, schritt: 11, seed: seed + 1, saum: false, schatten: 0, z: 0.1 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const l = i % 3 === 0 ? 20 : 11;
    const rr = r - 24 - l / 2;
    papier(g, rechteck(i % 3 === 0 ? 8 : 5, l, 2), "#2A2622", { x: Math.sin(a) * rr, y: -Math.cos(a) * rr, z: 0.3, dreh: (a * 180) / Math.PI, amp: 0.5, saum: false, schatten: 0, seed: seed + 3 + i, faser: false });
  }
  const std = new THREE.Group(), min = new THREE.Group(), sek = new THREE.Group();
  g.add(sek, std, min);
  papier(std, rechteck(14, r * 0.52, 6), zeiger, { y: -r * 0.2, z: 0.6, amp: 0.8, saum: false, schatten: 0.7, seed: seed + 20 });
  papier(min, rechteck(10, r * 0.76, 5), zeiger, { y: -r * 0.3, z: 0.7, amp: 0.8, saum: false, schatten: 0.7, seed: seed + 21 });
  papier(sek, rechteck(4, r * 0.82, 2), akzent, { y: -r * 0.28, z: 0.8, amp: 0.4, saum: false, schatten: 0.4, seed: seed + 22 });
  papier(g, kreisForm(10), akzent, { z: 1, amp: 0.6, saum: false, schatten: 0.6, seed: seed + 23 });
  return {
    g, r,
    /** stunden: Dezimalstunden der Anzeige (Stundenzeiger = stunden/12 Umdrehungen) */
    setze(stunden) {
      std.rotation.z = -(stunden / 12) * Math.PI * 2;
      min.rotation.z = -stunden * Math.PI * 2;
      sek.rotation.z = -stunden * Math.PI * 2 * 12;
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Papierfigur (ohne Gesicht), Füße bei (0, 0)
// ---------------------------------------------------------------------------------------------------------------
/**
 * Figur aus Papier: Beine, Rumpf in Teamfarbe, Kopf mit Haarkappe, Arme. setze(t, {gehen, arm}) wippt im Stop-Motion-Takt.
 * trage: "dose" | "tuete" | "tablett" | null (in der rechten Hand)
 */
export function papierFigur({ farbe = "#2ECC71", haar = "#3A2B2B", haut = "#F0C8A0", hose = "#3B3A46", trage = null, seed = 200 } = {}) {
  const g = new THREE.Group();
  const koerper = new THREE.Group();
  g.add(koerper);
  const beinL = new THREE.Group(), beinR = new THREE.Group();
  beinL.position.set(-11, -44, 0);
  beinR.position.set(11, -44, 0);
  papier(beinL, rechteck(15, 46, 5), hose, { y: 23, amp: 0.8, saum: false, schatten: 0.5, seed });
  papier(beinR, rechteck(15, 46, 5), hose, { y: 23, amp: 0.8, saum: false, schatten: 0.5, seed: seed + 1 });
  papier(beinL, rechteck(24, 9, 4), "#2A2622", { x: 4, y: 45, z: 0.1, amp: 0.5, saum: false, schatten: 0, seed: seed + 2 });
  papier(beinR, rechteck(24, 9, 4), "#2A2622", { x: 4, y: 45, z: 0.1, amp: 0.5, saum: false, schatten: 0, seed: seed + 3 });
  g.add(beinL, beinR);
  papier(koerper, rechteck(58, 66, 18), farbe, { y: -78, z: 0.3, amp: 1.2, seed: seed + 4, raster: "#FFFFFF" });
  papier(koerper, rechteck(58, 14, 6), ton(farbe, -0.22), { y: -52, z: 0.35, amp: 0.8, saum: false, schatten: 0, seed: seed + 5 });
  const kopf = new THREE.Group();
  kopf.position.set(0, -134, 0.5);
  koerper.add(kopf);
  papier(kopf, kreisForm(25, 26), haut, { amp: 1, schritt: 8, seed: seed + 6, schatten: 0.7 });
  papier(kopf, halbkreis(26), haar, { y: -4, z: 0.2, amp: 1, schritt: 7, saum: false, schatten: 0, seed: seed + 7 });
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-33, -100, 0.1);
  armR.position.set(33, -100, 0.6);
  papier(armL, rechteck(14, 46, 6), ton(farbe, -0.1), { y: 20, amp: 0.8, saum: false, schatten: 0.5, seed: seed + 8 });
  papier(armR, rechteck(14, 46, 6), ton(farbe, -0.1), { y: 20, amp: 0.8, saum: false, schatten: 0.5, seed: seed + 9 });
  koerper.add(armL, armR);
  let item = null;
  if (trage === "dose") {
    item = new THREE.Group();
    papier(item, rechteck(46, 30, 5), "#FBF7EE", { amp: 1, seed: seed + 10, schatten: 0.7 });
    papier(item, rechteck(46, 9, 3), farbe, { y: -10, z: 0.2, amp: 0.6, saum: false, schatten: 0, seed: seed + 11 });
  } else if (trage === "tuete") {
    item = new THREE.Group();
    papier(item, [[-20, -22], [20, -22], [24, 22], [-24, 22]], "#E040FB", { amp: 1, seed: seed + 10, schatten: 0.7, raster: "#FFFFFF" });
  } else if (trage === "tablett") {
    item = new THREE.Group();
    papier(item, rechteck(62, 10, 4), farbe, { amp: 0.8, seed: seed + 10, schatten: 0.6 });
    papier(item, kreisForm(14, 5), "#FBF7EE", { y: -8, z: 0.2, amp: 0.5, saum: false, schatten: 0, seed: seed + 11 });
  }
  if (item) { item.position.set(0, 44, 0.3); armR.add(item); }
  return {
    g, koerper, kopf, armL, armR, item,
    /** gehen 0..1 (Beine schwingen), arm: −1..1 Armhebung rechts, wippen 0..1 */
    setze(t, { gehen = 0, arm = 0, wippen = 0.4, phase = 0 } = {}) {
      const s = stopp(t + phase, 12);
      const schritt = Math.sin(s * Math.PI * 2 * 1.9) * gehen;
      beinL.rotation.z = schritt * 0.5;
      beinR.rotation.z = -schritt * 0.5;
      armL.rotation.z = -schritt * 0.45;
      armR.rotation.z = schritt * 0.3 + arm * 1.6;
      const w = Math.abs(Math.sin(s * Math.PI * 2 * 1.9)) * 4 * gehen + Math.sin(s * Math.PI * 2 * 0.9) * 2.2 * wippen;
      koerper.position.y = w;
      kopf.rotation.z = Math.sin(s * Math.PI * 2 * 0.7) * 0.07 * (0.4 + wippen);
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Pappstreifen (Boden) und Etikett
// ---------------------------------------------------------------------------------------------------------------
/** Wellpappe-Streifen als Boden: Mitte (x, y), Breite w, Höhe h */
export function pappstreifen(eltern, x, y, w, h, z = 4, { seed = 170 } = {}) {
  const p = papier(eltern, rechteck(w, h, 4), COLLAGE.pappe, { x, y, z, amp: 3, schritt: 14, seed, schatten: 1.1 });
  // Wellen als helle Linien
  const g = p.g;
  for (let i = 0; i < Math.floor(h / 10); i++) papier(g, rechteck(w - 24, 2.6, 1), "#BFA07A", { y: -h / 2 + 14 + i * 10, z: 0.2, amp: 0.8, schritt: 18, saum: false, schatten: 0, seed: seed + i, faser: false });
  return p;
}
/** Schreibmaschinen-Etikett (Welttext): Papierstreifen mit Courier-Schrift */
export function etikett(eltern, text, x, y, { w = 200, groesse = 26, farbe = COLLAGE.tinte, grund = COLLAGE.band, dreh = 0, z = 7, seed = 180 } = {}) {
  const p = papier(eltern, rechteck(w, groesse + 22, 2), grund, { x, y, z, dreh, amp: 1.5, schritt: 8, saum: false, schatten: 0.6, seed });
  const t = textFlaeche(p.g, text, 0, 1, { groesse, farbe, gewicht: 700, schrift: "'Liberation Mono', 'Courier New', monospace", z: 0.3 });
  return { ...p, text: t };
}
