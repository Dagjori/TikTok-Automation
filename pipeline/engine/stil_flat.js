// Stil 4 · 2D-Flat-Infografik als Three.js-Baukasten (Muster: stile/stil_4_flat.*, neu gebaut nach der Regel „nur Three.js“).
// Flache Meshes ohne Licht (MeshBasicMaterial, exakte sRGB-Farben), orthografische Kamera, Tiefenebenen mit Parallaxe,
// zweitonige Flat-Schatten. Bühne ohne ACES/Bloom: FlatBuehne = ComicBuehne aus stil_comic.js (gleiche Übergänge wie kern.js).
//
// Koordinaten: Alles wird in Bild-Pixeln mit y nach UNTEN beschrieben (wie im Stil-4-SVG). Die Wurzelgruppe der Welt setzt
// px (0, 0) auf die linke obere Bildecke; Kinder liegen bei (x, −y). Die Kamera blickt in Pixeln: kamPx(cx, cy, zoom).
//
//   const w = new FlatWelt({ hintergrund: "#FFF4E2" });          // w.szene, w.kamera, w.wurzel, w.ebene(tiefe)
//   const g = gruppe(w.wurzel, 60, 600, 5);                      // Gruppe bei px (60, 600), z = 5
//   rr(g, 0, 0, 460, 460, 36, "#FFE9D6", 0);                      // abgerundetes Rechteck (links oben, Breite, Höhe, Radius)
//   kreis(g, 230, 80, 40, "#FF8A3D", 2); poly(g, [[0,0],[40,0],[20,30]], "#1D2B53", 3); streifen(g, [[0,0],[100,40]], 8, "#fff", 4)
//   const uhr = wanduhr({ r: 52 }); uhr.setze(18.5)               // 18:30
//   const fig = figurRuecken({ farbe: "#FF8A3D" }); fig.setze(t, { tippen: 1 })
//   regie: new Regie(w.kamera, (t) => kamPx(540, 960, 1)) – Zoom wirkt über kamera.zoom (orthografisch)
//   w.projiziere(x, y) → Bild-Pixel (für HUD-Etiketten an Weltpunkten)
import * as THREE from "three";
import { ComicBuehne } from "./stil_comic.js";

export { ComicBuehne as FlatBuehne };

/** Grundpalette (Stil 4): Creme-Grund, Nachtblau als Tinte, gedeckte Flächenfarben */
export const FLAT = {
  creme: "#FFF4E2",
  cremeDunkel: "#F6E4C6",
  tinte: "#1D2B53",
  tinteHell: "#33406B",
  grau: "#C9CED9",
  grauDunkel: "#8A92AB",
  weiss: "#FFFFFF",
  himmelTag: ["#8FD3F4", "#B4E3F7"],
  gruen: "#7FC796",
  gruenDunkel: "#56B474",
  strasse: "#4B5268",
  haut: "#F2C4A0",
  hautSchatten: "#DFA67E",
  haar: "#3A2B2B",
};

// ---------------------------------------------------------------------------------------------------------------
// Materialien
// ---------------------------------------------------------------------------------------------------------------
const cache = new Map();
/** Flaches Material (geteilt). eigen: true = eigenes Material (für animierte Farbe/Deckkraft) */
export function mat(farbe, deckkraft = 1, { eigen = false } = {}) {
  const neu = () => new THREE.MeshBasicMaterial({ color: farbe, transparent: deckkraft < 1 || eigen, opacity: deckkraft, depthWrite: deckkraft >= 1 && !eigen, side: THREE.DoubleSide });
  if (eigen) return neu();
  const k = `${farbe}|${deckkraft}`;
  if (!cache.has(k)) cache.set(k, neu());
  return cache.get(k);
}
/** Farbe heller (k > 0) bzw. dunkler (k < 0) mischen, Ergebnis als Hex */
export function ton(farbe, k) {
  const c = new THREE.Color(farbe);
  const z = k > 0 ? new THREE.Color("#FFFFFF") : new THREE.Color("#0B1030");
  c.lerp(z, Math.abs(k));
  return "#" + c.getHexString();
}

// ---------------------------------------------------------------------------------------------------------------
// Formen in Pixeln (y nach unten)
// ---------------------------------------------------------------------------------------------------------------
/** Gruppe bei px (x, y) mit Tiefe z */
export function gruppe(eltern, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, -y, z);
  if (eltern) eltern.add(g);
  return g;
}
/** px-Position einer Gruppe setzen */
export const setzePx = (o, x, y, z = o.position.z) => o.position.set(x, -y, z);

/** Pfad eines abgerundeten Rechtecks (links oben x, y; y nach unten) als THREE.Shape bzw. Path */
export function rrPfad(x, y, w, h, r, Klasse = THREE.Shape) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  const s = new Klasse();
  const X = x, Y = -y;
  s.moveTo(X + r, Y);
  s.lineTo(X + w - r, Y);
  s.absarc(X + w - r, Y - r, r, Math.PI / 2, 0, true);
  s.lineTo(X + w, Y - h + r);
  s.absarc(X + w - r, Y - h + r, r, 0, -Math.PI / 2, true);
  s.lineTo(X + r, Y - h);
  s.absarc(X + r, Y - h + r, r, -Math.PI / 2, -Math.PI, true);
  s.lineTo(X, Y - r);
  s.absarc(X + r, Y - r, r, Math.PI, Math.PI / 2, true);
  return s;
}
/** Fläche aus einer Form */
export function flaeche(eltern, form, farbe, z = 0, { deckkraft = 1, eigen = false, kurve = 10 } = {}) {
  const m = new THREE.Mesh(new THREE.ShapeGeometry(form, kurve), mat(farbe, deckkraft, { eigen }));
  m.position.z = z;
  if (eltern) eltern.add(m);
  return m;
}
/** Abgerundetes Rechteck */
export const rr = (eltern, x, y, w, h, r, farbe, z = 0, opt = {}) => flaeche(eltern, rrPfad(x, y, w, h, r), farbe, z, opt);
/** Rahmen: abgerundetes Rechteck mit Loch (Dicke d) */
export function rahmen(eltern, x, y, w, h, r, d, farbe, z = 0, opt = {}) {
  const s = rrPfad(x, y, w, h, r);
  s.holes.push(rrPfad(x + d, y + d, w - 2 * d, h - 2 * d, Math.max(0, r - d), THREE.Path));
  return flaeche(eltern, s, farbe, z, opt);
}
/** Fläche mit rechteckigen/abgerundeten Löchern (z. B. Wand mit Fenster): loecher = [[x, y, w, h, r], …] */
export function mitLoechern(eltern, [x, y, w, h, r], loecher, farbe, z = 0, opt = {}) {
  const s = rrPfad(x, y, w, h, r);
  for (const l of loecher) s.holes.push(rrPfad(...l, THREE.Path));
  return flaeche(eltern, s, farbe, z, opt);
}
/** Kreis (Mittelpunkt cx, cy) */
export function kreis(eltern, cx, cy, r, farbe, z = 0, { deckkraft = 1, eigen = false, segmente = 48, sx = 1, sy = 1 } = {}) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, segmente), mat(farbe, deckkraft, { eigen }));
  m.position.set(cx, -cy, z);
  m.scale.set(sx, sy, 1);
  if (eltern) eltern.add(m);
  return m;
}
/** Kreisring */
export function ring(eltern, cx, cy, rInnen, rAussen, farbe, z = 0, { deckkraft = 1, eigen = false, start = 0, laenge = Math.PI * 2 } = {}) {
  const m = new THREE.Mesh(new THREE.RingGeometry(rInnen, rAussen, 64, 1, start, laenge), mat(farbe, deckkraft, { eigen }));
  m.position.set(cx, -cy, z);
  if (eltern) eltern.add(m);
  return m;
}
/** Vieleck aus Punkten [[x, y], …] (y nach unten) */
export function poly(eltern, punkte, farbe, z = 0, opt = {}) {
  const s = new THREE.Shape(punkte.map(([x, y]) => new THREE.Vector2(x, -y)));
  return flaeche(eltern, s, farbe, z, opt);
}
/** Dicke Linie mit runden Enden und Gelenken (Streckenzug) */
export function streifen(eltern, punkte, breite, farbe, z = 0, { rund = true, deckkraft = 1 } = {}) {
  const g = new THREE.Group();
  g.position.z = z;
  const m = mat(farbe, deckkraft);
  for (let i = 1; i < punkte.length; i++) {
    const [x0, y0] = punkte[i - 1], [x1, y1] = punkte[i];
    const l = Math.hypot(x1 - x0, y1 - y0);
    const q = new THREE.Mesh(new THREE.PlaneGeometry(l, breite), m);
    q.position.set((x0 + x1) / 2, -(y0 + y1) / 2, 0);
    q.rotation.z = -Math.atan2(y1 - y0, x1 - x0);
    g.add(q);
  }
  if (rund) for (const [x, y] of punkte) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(breite / 2, 20), m);
    c.position.set(x, -y, 0);
    g.add(c);
  }
  if (eltern) eltern.add(g);
  return g;
}
/** Flat-Schatten: Kopie eines Meshes, versetzt, in Schattenfarbe, knapp dahinter */
export function schatten(mesh, dx = 0, dy = 12, farbe = "#000000", deckkraft = 0.12) {
  const s = new THREE.Mesh(mesh.geometry, mat(farbe, deckkraft));
  s.position.copy(mesh.position);
  s.position.x += dx;
  s.position.y -= dy;
  s.position.z -= 0.05;
  s.rotation.copy(mesh.rotation);
  s.scale.copy(mesh.scale);
  s.renderOrder = -1;
  mesh.parent.add(s);
  return s;
}

/** Text als Fläche (Canvas-Textur, Schrift muss geladen sein). anker: "links" | "mitte" | "rechts" */
export function textFlaeche(eltern, text, x, y, { groesse = 40, farbe = "#1D2B53", gewicht = 900, schrift = "'SB Display', 'Inter', sans-serif", anker = "mitte", z = 0, aufloesung = 2 } = {}) {
  const c = document.createElement("canvas");
  const g = c.getContext("2d");
  const font = `${gewicht} ${groesse * aufloesung}px ${schrift}`;
  g.font = font;
  const b = Math.ceil(g.measureText(text).width + groesse * aufloesung * 0.2);
  const h = Math.ceil(groesse * aufloesung * 1.3);
  c.width = b;
  c.height = h;
  g.font = font;
  g.fillStyle = farbe;
  g.textBaseline = "middle";
  g.textAlign = "center";
  g.fillText(text, b / 2, h / 2 + groesse * aufloesung * 0.04);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const bw = b / aufloesung, bh = h / aufloesung;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  const ox = anker === "links" ? bw / 2 : anker === "rechts" ? -bw / 2 : 0;
  m.position.set(x + ox, -y, z);
  m.userData.breite = bw;
  if (eltern) eltern.add(m);
  return m;
}

// ---------------------------------------------------------------------------------------------------------------
// Welt mit orthografischer Kamera in Pixeln
// ---------------------------------------------------------------------------------------------------------------
export class FlatWelt {
  constructor({ breite = 1080, hoehe = 1920, hintergrund = FLAT.creme } = {}) {
    this.breite = breite;
    this.hoehe = hoehe;
    this.szene = new THREE.Scene();
    this.szene.background = new THREE.Color(hintergrund);
    this.kamera = new THREE.OrthographicCamera(-breite / 2, breite / 2, hoehe / 2, -hoehe / 2, 1, 4000);
    this.kamera.position.set(0, 0, 1000);
    this.wurzel = new THREE.Group();
    this.wurzel.position.set(-breite / 2, hoehe / 2, 0);
    this.szene.add(this.wurzel);
    this.ebenen = [];
  }
  /** Parallax-Ebene: verschiebt sich bei Kamerafahrten um (1 − tiefe) mit (tiefe 1 = normal, 0.5 = halb so schnell) */
  ebene(tiefe = 1, z = 0) {
    const g = gruppe(this.wurzel, 0, 0, z);
    this.ebenen.push({ g, tiefe });
    return g;
  }
  /** Kamera-Zustand für die Regie: Blickmitte in px und Zoom */
  kamPx(cx, cy, zoom = 1, roll = 0) {
    const x = cx - this.breite / 2, y = this.hoehe / 2 - cy;
    return { pos: [x, y, 1000], ziel: [x, y, 0], zoom, roll };
  }
  /** Ebenen nach der Kamera ausrichten (nach regie.anwenden aufrufen) */
  parallax() {
    const k = this.kamera.position;
    for (const e of this.ebenen) {
      e.g.position.x = k.x * (1 - e.tiefe);
      e.g.position.y = k.y * (1 - e.tiefe);
    }
  }
  /** Welt-px (x, y) → Bild-px (nach regie.anwenden) */
  projiziere(x, y, ebene = null) {
    const v = new THREE.Vector3(x - this.breite / 2, this.hoehe / 2 - y, 0);
    if (ebene) v.add(ebene.position);
    v.project(this.kamera);
    return { x: ((v.x + 1) / 2) * this.breite, y: ((1 - v.y) / 2) * this.hoehe };
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Himmel im Fenster: gestufter Verlauf (Flat-Bänder), Abendrot → Nacht über k (0..1)
// ---------------------------------------------------------------------------------------------------------------
const HIMMEL_ABEND = ["#FF9E7A", "#FFC38A", "#FFE2B0"];
const HIMMEL_NACHT = ["#141B3F", "#232E66", "#3A4785"];
export function himmel(eltern, x, y, w, h, z = 0, { baender = 6, abend = HIMMEL_ABEND, nacht = HIMMEL_NACHT } = {}) {
  const u = {
    oA: { value: new THREE.Color(abend[0]) }, mA: { value: new THREE.Color(abend[1]) }, uA: { value: new THREE.Color(abend[2]) },
    oN: { value: new THREE.Color(nacht[0]) }, mN: { value: new THREE.Color(nacht[1]) }, uN: { value: new THREE.Color(nacht[2]) },
    k: { value: 0 }, baender: { value: baender },
  };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 oA, mA, uA, oN, mN, uN; uniform float k, baender; varying vec2 vUv;
      void main(){ float y = floor((1.0 - vUv.y) * baender) / (baender - 1.0);
        vec3 a = y < 0.5 ? mix(oA, mA, y * 2.0) : mix(mA, uA, y * 2.0 - 1.0);
        vec3 n = y < 0.5 ? mix(oN, mN, y * 2.0) : mix(mN, uN, y * 2.0 - 1.0);
        gl_FragColor = vec4(mix(a, n, k), 1.0); }`,
  }));
  m.position.set(x + w / 2, -(y + h / 2), z);
  if (eltern) eltern.add(m);
  return { mesh: m, setze: (k) => { u.k.value = k; } };
}

// ---------------------------------------------------------------------------------------------------------------
// Figuren und Möbel (Flat, ohne Gesicht)
// ---------------------------------------------------------------------------------------------------------------
/**
 * Sitzende Person von hinten (Rückenansicht am Schreibtisch). Anker: Mitte der Schultern (0, 0), y nach unten.
 * setze(t, {tippen 0..1, schreiben 0..1, nicken 0..1, jubeln 0..1, phase})
 */
export function figurRuecken({ farbe = "#FF8A3D", haar = FLAT.haar, haut = FLAT.haut, groesse = 1 } = {}) {
  const g = new THREE.Group();
  g.scale.setScalar(groesse);
  const dunkel = ton(farbe, -0.22);
  const kopf = new THREE.Group();
  g.add(kopf);
  kreis(kopf, -33, -50, 8, haut, 0.4); // Ohren
  kreis(kopf, 33, -50, 8, haut, 0.4);
  kreis(kopf, 0, -52, 34, haar, 0.5);
  poly(kopf, [[-30, -40], [30, -40], [24, -22], [-24, -22]], haar, 0.6); // Haaransatz im Nacken
  rr(g, -13, -26, 26, 26, 8, ton(haut, -0.08), 0.2); // Hals
  const rumpf = rr(g, -66, -6, 132, 150, 46, farbe, 0.3);
  rr(g, -66, 70, 132, 74, 30, dunkel, 0.31, {}); // Pullover-Bund (dunkler)
  poly(g, [[-18, -6], [18, -6], [0, 14]], dunkel, 0.32); // Kragen
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-60, 12, 0.35);
  armR.position.set(60, 12, 0.35);
  rr(armL, -18, 0, 30, 92, 15, dunkel, 0);
  rr(armR, -12, 0, 30, 92, 15, dunkel, 0);
  g.add(armL, armR);
  return {
    g, kopf, armL, armR, rumpf,
    setze(t, { tippen = 0, schreiben = 0, nicken = 0, jubeln = 0, phase = 0 } = {}) {
      const a = Math.sin((t + phase) * 2 * Math.PI * 4.2) * 3.2 * tippen + Math.sin((t + phase) * 2 * Math.PI * 1.3) * 2.2 * schreiben;
      const b = Math.sin((t + phase) * 2 * Math.PI * 4.2 + 2.1) * 3.2 * tippen + Math.sin((t + phase) * 2 * Math.PI * 1.3 + 1.2) * 4 * schreiben;
      armL.position.y = -(12 + a);
      armR.position.y = -(12 + b);
      armL.rotation.z = 0.08 * tippen - jubeln * 2.5;
      armR.rotation.z = -0.08 * tippen + jubeln * 2.5;
      kopf.rotation.z = Math.sin((t + phase) * 2 * Math.PI * 0.35) * 0.05 * (1 + nicken) + nicken * 0.06 * Math.sin((t + phase) * 9);
      kopf.position.y = Math.sin((t + phase) * 2 * Math.PI * 0.5) * 1.5 - nicken * 3 + jubeln * 4;
      if (g.userData.y0 === undefined) g.userData.y0 = g.position.y;
      g.position.y = g.userData.y0 + Math.sin((t + phase) * 2 * Math.PI * 0.5) * 1.2;
    },
  };
}

/** Wanduhr (Mittelpunkt 0,0): setze(stunden) mit Dezimalstunden (18.5 = 18:30) */
export function wanduhr({ r = 52, rand = FLAT.tinte, ziffernblatt = "#FFFFFF", zeiger = FLAT.tinte, akzent = "#FF8A3D" } = {}) {
  const g = new THREE.Group();
  kreis(g, 6, 8, r + 6, "#000000", -0.1, { deckkraft: 0.1 });
  kreis(g, 0, 0, r + 6, rand, 0);
  kreis(g, 0, 0, r - 2, ziffernblatt, 0.1);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const l = i % 3 === 0 ? 12 : 6;
    const s = rr(null, -2, -(r - 8), 4, l, 2, rand, 0);
    const p = new THREE.Group();
    p.add(s);
    p.rotation.z = -a;
    p.position.z = 0.2;
    g.add(p);
  }
  const std = new THREE.Group(), min = new THREE.Group();
  rr(std, -4, -r * 0.5, 8, r * 0.5 + 6, 4, zeiger, 0);
  rr(min, -3, -r * 0.78, 6, r * 0.78 + 6, 3, akzent, 0);
  std.position.z = 0.3;
  min.position.z = 0.35;
  g.add(std, min);
  kreis(g, 0, 0, 6, zeiger, 0.4);
  return { g, setze(stunden) { std.rotation.z = -((stunden % 12) / 12) * Math.PI * 2; min.rotation.z = -(stunden % 1) * Math.PI * 2; } };
}

/** Münze in Teamfarbe (Vorderansicht, Mittelpunkt 0,0) mit €-Zeichen */
export function muenze(r = 22, farbe = "#FF8A3D") {
  const g = new THREE.Group();
  kreis(g, 0, 0, r, ton(farbe, -0.25), 0);
  kreis(g, -1.5, -1.5, r * 0.92, farbe, 0.1);
  ring(g, -1.5, -1.5, r * 0.62, r * 0.7, ton(farbe, 0.35), 0.2);
  const t = textFlaeche(g, "€", -1.5, -0.5, { groesse: r * 1.05, farbe: "#FFFFFF", z: 0.3 });
  t.position.y = 1.5;
  return g;
}
/** Münzstapel (Seitenansicht), Unterkante bei (0,0); setze(n) zeigt n Münzen (auch Bruchteile: die oberste fällt ein) */
export function muenzStapel({ max = 12, breite = 56, hoehe = 11, farbe = "#FF8A3D" } = {}) {
  const g = new THREE.Group();
  const stuecke = [];
  for (let i = 0; i < max; i++) {
    const s = new THREE.Group();
    rr(s, -breite / 2, -hoehe, breite, hoehe, hoehe / 2, ton(farbe, -0.25), 0);
    rr(s, -breite / 2, -hoehe, breite, hoehe - 3.5, hoehe / 2, farbe, 0.05);
    rr(s, -breite / 2 + 8, -hoehe + 2.5, breite * 0.35, 2.5, 1.2, ton(farbe, 0.4), 0.1);
    s.position.set(((i * 37) % 5) - 2, i * (hoehe - 1.5), i * 0.2);
    g.add(s);
    stuecke.push(s);
  }
  return {
    g, stuecke,
    setze(n) {
      stuecke.forEach((s, i) => {
        const k = Math.max(0, Math.min(1, n - i));
        s.visible = k > 0.001;
        s.position.y = i * (hoehe - 1.5) + (1 - k) * 60;
        s.scale.setScalar(0.6 + 0.4 * k);
      });
    },
  };
}
/** Beleg (Papier mit Zeilen), links oben (0,0) */
export function beleg({ w = 70, h = 90, farbe = "#5465FF", papier = "#FFFFFF" } = {}) {
  const g = new THREE.Group();
  rr(g, 4, 5, w, h, 6, "#000000", -0.1, { deckkraft: 0.12 });
  rr(g, 0, 0, w, h, 6, papier, 0);
  rr(g, 0, 0, w, 14, 6, farbe, 0.05);
  rr(g, 0, 8, w, 6, 0, farbe, 0.05);
  for (let i = 0; i < 4; i++) rr(g, 10, 26 + i * 14, i === 3 ? w * 0.4 : w - 20, 5, 2.5, "#D3D7E4", 0.1);
  rr(g, w - 30, h - 20, 20, 8, 3, farbe, 0.1);
  return g;
}
/** Bildschirm (Vorderansicht), links oben (0,0); gibt {g, bild (Gruppe für Inhalt in Bildschirm-px), w, h} */
export function monitor({ w = 200, h = 128, rahmen: rfarbe = FLAT.tinte, bildschirm = "#EAF0FF" } = {}) {
  const g = new THREE.Group();
  rr(g, w / 2 - 12, h - 4, 24, 30, 4, FLAT.tinteHell, -0.1);
  rr(g, w / 2 - 44, h + 22, 88, 10, 5, rfarbe, -0.05);
  rr(g, 0, 0, w, h, 12, rfarbe, 0);
  rr(g, 9, 9, w - 18, h - 18, 6, bildschirm, 0.05);
  const bild = gruppe(g, 9, 9, 0.1);
  return { g, bild, w: w - 18, h: h - 18 };
}
/** Laptop (Vorderansicht, aufgeklappt), links oben (0,0) */
export function laptop({ w = 176, h = 112, rahmen: rfarbe = FLAT.tinte, bildschirm = "#EEF0FF" } = {}) {
  const g = new THREE.Group();
  rr(g, 0, 0, w, h, 10, rfarbe, 0);
  rr(g, 8, 8, w - 16, h - 16, 5, bildschirm, 0.05);
  poly(g, [[-14, h], [w + 14, h], [w + 4, h + 14], [-4, h + 14]], FLAT.grauDunkel, 0.1);
  rr(g, -14, h - 2, w + 28, 6, 3, FLAT.grau, 0.15);
  const bild = gruppe(g, 8, 8, 0.1);
  return { g, bild, w: w - 16, h: h - 16 };
}
/** Schreibtisch (Vorderansicht), Oberkante links bei (0,0) */
export function schreibtisch(eltern, x, y, w, beinHoehe, farbe = FLAT.tinte, z = 0) {
  const g = gruppe(eltern, x, y, z);
  rr(g, -8, 0, w + 16, 18, 6, farbe, 0.1);
  rr(g, 0, 16, 16, beinHoehe, 4, ton(farbe, -0.15), 0);
  rr(g, w - 16, 16, 16, beinHoehe, 4, ton(farbe, -0.15), 0);
  rr(g, 0, 16, w, 10, 0, ton(farbe, -0.3), 0.05);
  return g;
}
/** Topfpflanze, Mittelpunkt Topfoberkante (0,0) */
export function pflanze(eltern, x, y, z = 0, { topf = "#E8735A", blatt = "#3E9C5E", blattHell = "#5DBB7A", groesse = 1 } = {}) {
  const g = gruppe(eltern, x, y, z);
  g.scale.setScalar(groesse);
  const blaetter = new THREE.Group();
  g.add(blaetter);
  const b = [[-28, -48, 0.5], [24, -56, -0.45], [-6, -78, 0.08], [-40, -20, 0.95], [38, -24, -0.9]];
  b.forEach(([bx, by, rot], i) => {
    const e = kreis(null, 0, 0, 30, i % 2 ? blatt : blattHell, 0.1 + i * 0.01, { sx: 0.42, sy: 1 });
    const p = new THREE.Group();
    p.position.set(bx * 0.5, -by * 0.5, 0);
    e.position.set(0, 26, 0);
    p.rotation.z = rot;
    p.add(e);
    blaetter.add(p);
  });
  poly(g, [[-30, 0], [30, 0], [22, 50], [-22, 50]], topf, 0.3);
  rr(g, -34, -6, 68, 14, 5, ton(topf, -0.12), 0.35);
  return { g, blaetter, setze(t, phase = 0) { blaetter.rotation.z = Math.sin((t + phase) * 1.7) * 0.035; } };
}
/** Hängelampe mit Lichtkegel, Aufhängung oben bei (0,0) */
export function haengelampe(eltern, x, y, z = 0, { kabel = 110, schirm = FLAT.tinte, licht = "#FFE7B8" } = {}) {
  const g = gruppe(eltern, x, y, z);
  rr(g, -2, 0, 4, kabel, 2, schirm, 0);
  const kegel = poly(g, [[-36, kabel + 34], [36, kabel + 34], [170, kabel + 300], [-170, kabel + 300]], licht, -0.5, { deckkraft: 0.28, eigen: true });
  poly(g, [[-16, kabel], [16, kabel], [40, kabel + 36], [-40, kabel + 36]], schirm, 0.2);
  kreis(g, 0, kabel + 36, 12, licht, 0.1);
  return { g, kegel };
}
/** Haus (flach), Unterkante Mitte (0,0) */
export function haus(eltern, x, y, z = 0, { wand = "#FFFFFF", dach = FLAT.tinte, tuer = "#5465FF", breite = 150 } = {}) {
  const g = gruppe(eltern, x, y, z);
  const b = breite, h = b * 0.7;
  rr(g, -b / 2, -h, b, h, 6, wand, 0);
  poly(g, [[-b / 2 - 16, -h + 4], [0, -h - b * 0.5], [b / 2 + 16, -h + 4]], dach, 0.1);
  rr(g, -14, -b * 0.36, 28, b * 0.36, 4, tuer, 0.1);
  rr(g, -b / 2 + 16, -h + 20, 30, 28, 4, "#BFD4FF", 0.1);
  rr(g, b / 2 - 46, -h + 20, 30, 28, 4, "#BFD4FF", 0.1);
  rr(g, b * 0.18, -h - b * 0.38, 18, 36, 3, ton(dach, 0.15), 0.05);
  return g;
}
/** Bürohochhaus (flach), Unterkante Mitte (0,0) */
export function buero(eltern, x, y, z = 0, { farbe = "#7DB9DA", breite = 120, hoehe = 260, fenster = "#CDE9F7" } = {}) {
  const g = gruppe(eltern, x, y, z);
  rr(g, -breite / 2, -hoehe, breite, hoehe, 6, farbe, 0);
  rr(g, -breite / 2 - 6, -hoehe - 10, breite + 12, 14, 5, ton(farbe, -0.2), 0.05);
  for (let r = 0; r < Math.floor((hoehe - 60) / 34); r++) for (let c = 0; c < 3; c++) rr(g, -breite / 2 + 14 + c * ((breite - 28) / 3), -hoehe + 20 + r * 34, (breite - 28) / 3 - 10, 20, 3, fenster, 0.1);
  rr(g, -16, -40, 32, 40, 3, ton(farbe, -0.35), 0.1);
  return g;
}
/** Auto (flach, Seitenansicht nach rechts), Unterkante Mitte (0,0) */
export function auto(eltern, x, y, z = 0, { farbe = "#5465FF", laenge = 120 } = {}) {
  const g = gruppe(eltern, x, y, z);
  const L = laenge, s = L / 196;
  const k = (px, py) => [px * s - L / 2, py * s];
  poly(g, [k(0, -16), k(0, -40), k(46, -48), k(66, -80), k(150, -80), k(176, -48), k(196, -40), k(196, -16)], farbe, 0);
  poly(g, [k(70, -50), k(84, -74), k(110, -74), k(110, -50)], "#CFE0FF", 0.1);
  poly(g, [k(118, -50), k(118, -74), k(144, -74), k(162, -50)], "#CFE0FF", 0.1);
  rr(g, k(0, -30)[0], k(0, -30)[1], L, 14 * s, 3, ton(farbe, -0.25), 0.05);
  const raeder = [];
  for (const rx of [46, 152]) {
    const r = new THREE.Group();
    const [cx, cy] = k(rx, -12);
    r.position.set(cx, -cy, 0.2);
    kreis(r, 0, 0, 19 * s, FLAT.tinte, 0);
    kreis(r, 0, 0, 8 * s, FLAT.grau, 0.1);
    rr(r, -2 * s, -8 * s, 4 * s, 16 * s, 1, FLAT.tinteHell, 0.15);
    g.add(r);
    raeder.push(r);
  }
  kreis(g, k(192, -36)[0], k(192, -36)[1], 5 * s, "#FFF3B0", 0.1);
  return { g, raeder };
}
/** Deko-Punkte und Kreuze (Stil 4) in einem Bereich, ohne die Sperrflächen */
export function deko(eltern, { bereich = [0, 0, 1080, 1920], anzahl = 40, farbe = FLAT.cremeDunkel, seed = 4, sperren = [], z = 0 } = {}) {
  let s = seed >>> 0;
  const zz = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const g = gruppe(eltern, 0, 0, z);
  const teile = [];
  for (let i = 0; i < anzahl * 3 && teile.length < anzahl; i++) {
    const x = bereich[0] + zz() * bereich[2], y = bereich[1] + zz() * bereich[3];
    if (sperren.some(([a, b, c, d]) => x > a && x < a + c && y > b && y < b + d)) continue;
    const o = zz() < 0.55 ? kreis(g, x, y, 4 + zz() * 6, farbe, 0) : streifen(g, [[x - 10, y], [x + 10, y]], 6, farbe, 0, {});
    if (o.isGroup) streifen(o, [[x, y - 10], [x, y + 10]], 6, farbe, 0);
    o.userData.phase = zz() * 10;
    teile.push(o);
  }
  return { g, teile };
}
