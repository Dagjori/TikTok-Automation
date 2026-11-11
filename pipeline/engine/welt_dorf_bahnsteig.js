// Grundwelt „Dorfbahnsteig mit Dorf, Windpark und Umspannwerk“ (Account 2 @stelldirvor.pov, Weltenkatalog „Land, Feld“ / Technik und Versorgung).
// Neubau 12.11.2026 für „Was passiert in deinem Dorf, wenn die Netzfrequenz unter 50 Hertz fällt?“ (Skript acc2-2026-11-12-mittag). NUR für den Baukasten Lunar-POV.
//
// Inhalt: Bahnsteig (Wartehäuschen, Anzeigetafel, Laternen, wartende Leute, Laub im Wind), zwei Gleise, Dorf aus zehn Ortsteilen (Neubaugebiet, Gewerbe,
// Siedlungen, Schule mit Flutlicht, Kreuzung mit Ampel und Autos, Kirche, Höfe, Mühle) mit beleuchteten Fenstern und Straßenlaternen, Umspannwerk mit Freileitung,
// Windpark, ferne Kraftwerke mit Dampffahnen. Jeder Ortsteil hat eine Ausfallzeit (aus.ortsteile[i]): Fenster erlöschen gestaffelt, Laternen gehen aus.
// Alles ist eine reine Funktion von t (feste Seeds, kein Zustand von Bild zu Bild).
//   const welt = new DorfBahnsteig(szene, { schatten: 4096 });
//   welt.update(t, { kamera, sonne: [x,y,z], hell: 0..1, aus: { ortsteile: [t0…t9], ampel, bahnsteig, umspann, wind }, dampfA: 0..1, dampfB: 0..1 })
// Koordinaten: Kamera steht auf dem Bahnsteig bei (0, ~2,2, 1) und schaut nach −z; +x = rechts. Meter.
import * as THREE from "three";
import { clamp, lerp, smoothstep, hash } from "./bewegung.js";
import { Himmel, Puffs, wolkenFeld, Partikel, Menschen, Autos, Voegel } from "./stil_lunar_pov.js";

const fr = (x) => x - Math.floor(x);
const h2 = (i, j) => fr(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
function vn(x, y) { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return lerp(lerp(h2(i, j), h2(i + 1, j), a), lerp(h2(i, j + 1), h2(i + 1, j + 1), a), b); }
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let k = 0; k < o; k++) { s += a * vn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= 0.5; } return s; }
const C = (h) => new THREE.Color(h);

export const BAHNSTEIG_Y = 0.6;
export const AUGE = [0, BAHNSTEIG_Y + 1.62, 1.0];
/** Gelände: flach im Dorf, sanfte Hügel in der Ferne (m) */
export function hoehe(x, z) {
  const d = Math.hypot(x, z + 80);
  return 7 * smoothstep(190, 520, d) * (0.4 + fbm(x * 0.004 + 3.1, z * 0.004 + 7.7, 3));
}
/** Ortsteile: Mitte, Radius (Platzbedarf), Name */
export const ORTSTEILE = [
  { name: "Neubaugebiet", x: 40, z: -64 }, { name: "Gewerbegebiet", x: -64, z: -72 }, { name: "Siedlung West", x: -32, z: -98 },
  { name: "Schule und Sportplatz", x: 14, z: -84 }, { name: "Kreuzung", x: -6, z: -56 }, { name: "Ortskern mit Kirche", x: -8, z: -118 },
  { name: "Siedlung Ost", x: 74, z: -98 }, { name: "Hangsiedlung", x: 50, z: -134 }, { name: "Höfe", x: -58, z: -138 }, { name: "Mühlenweg", x: 6, z: -156 },
];
export const KREUZUNG = { x: -6, z: -48 };           // Hauptstraße z = −48 (Ost–West), Querstraße x = −6 (nach Norden)
export const UMSPANN = { x: 96, z: -46 };
const L_WARM = new THREE.Color(1.7, 1.0, 0.42), L_AUS = new THREE.Color(0.05, 0.065, 0.09);
const DAMPF_A = [-190, 0, -620], DAMPF_B = [260, 0, -700];

function prisma(b, h, g) {          // Satteldach: Breite b (x), Höhe h, Tiefe g (z); Firstrichtung z
  const s = new THREE.Shape(); s.moveTo(-b / 2, 0); s.lineTo(b / 2, 0); s.lineTo(0, h); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: g, bevelEnabled: false }); geo.translate(0, 0, -g / 2); return geo;
}

export class DorfBahnsteig {
  constructor(szene, { schatten = 4096 } = {}) {
    this.szene = szene; this.schatten = schatten;
    this.himmel = new Himmel(szene, { radius: 3000, zenit: "#5F7FAE", horizont: "#F1C79A", unten: "#8A7F6C", dunst: 0.28, sonnenRichtung: [-0.25, 0.2, -1], sonnenFarbe: "#FFD39A",
      sonnenStaerke: 40, sonnenGroesse: 0.016, glanz: 0.9, glanzBreite: 0.16, zirren: 0.06, zirrenFarbe: "#FFE4C4" });
    this.post = {};
    this._licht(); this._gelaende(); this._bahn(); this._dorf(); this._umspann(); this._windpark(); this._ferne(); this._statisten();
  }

  // ---------------------------------------------------------------------------------------- Licht
  _licht() {
    this.hemi = new THREE.HemisphereLight("#9FB6D8", "#6B6350", 1.1); this.szene.add(this.hemi);
    this.sonne = new THREE.DirectionalLight("#FFC98A", 3.2); this.sonne.position.set(0, 100, -300); this.sonne.target.position.set(0, 0, -80);
    this.szene.add(this.sonne, this.sonne.target);
    if (this.schatten > 0) {
      this.sonne.castShadow = true; this.sonne.shadow.mapSize.set(this.schatten, this.schatten);
      const c = this.sonne.shadow.camera; c.left = -175; c.right = 175; c.top = 175; c.bottom = -175; c.near = 1; c.far = 900; this.sonne.shadow.bias = -0.0004; this.sonne.shadow.normalBias = 0.4;
    }
  }

  // ---------------------------------------------------------------------------------------- Gelände
  _gelaende() {
    const N = 160, S = 1400, geo = new THREE.PlaneGeometry(S, S, N, N); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, -300);
    const p = geo.getAttribute("position"), col = new Float32Array(p.count * 3), c = new THREE.Color();
    const cs = [C("#5E6B3A"), C("#7A7545"), C("#6B5B3C"), C("#4B5A33"), C("#8B8350")];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i); p.setY(i, hoehe(x, z));
      const f = fbm(x * 0.02 + 5, z * 0.02 + 1, 3), g = fbm(x * 0.09, z * 0.09, 2), st = 0.5 + 0.5 * Math.sin(x * 0.11 + 4 * f);
      c.copy(cs[Math.floor(f * 4.99)]).lerp(cs[Math.floor(g * 4.99)], 0.35 + 0.2 * st).multiplyScalar(0.85 + 0.3 * g);
      c.toArray(col, i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); m.receiveShadow = true; this.szene.add(m);
    // Straßen (Hauptstraße, Querstraße, Ringweg), flach auf dem Gelände (y = 0,03)
    const strasse = (x0, z0, x1, z1, b, farbe = "#4A4A4C") => {
      const L = Math.hypot(x1 - x0, z1 - z0), mm = new THREE.Mesh(new THREE.BoxGeometry(b, 0.05, L), new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.95 }));
      mm.position.set((x0 + x1) / 2, 0.04, (z0 + z1) / 2); mm.rotation.y = Math.atan2(x1 - x0, z1 - z0); mm.receiveShadow = true; this.szene.add(mm); return mm;
    };
    strasse(-190, -48, 190, -48, 7); strasse(-6, -48, -6, -175, 6); strasse(-6, -118, 80, -118, 5); strasse(-6, -84, -70, -84, 5); strasse(40, -48, 40, -100, 5); strasse(74, -118, 74, -80, 4.5);
    strasse(-190, -47.99, 190, -47.99, 0.18, "#D8D2B8").position.y = 0.075;           // Mittelmarkierung
  }

  // ---------------------------------------------------------------------------------------- Bahnsteig, Gleise
  _bahn() {
    const s = this.szene, M = (c, r = 0.9, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
    const box = (b, h, d, x, y, z, mat, schatten = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), mat); m.position.set(x, y, z); m.castShadow = schatten; m.receiveShadow = true; s.add(m); return m; };
    // Bahnsteig: Kante bei z = −3, Fläche y = 0,6, Rückseite bei z = 7
    box(110, BAHNSTEIG_Y, 10, 0, BAHNSTEIG_Y / 2, 2, M("#8F8A80", 0.95));
    box(110, 0.04, 0.35, 0, BAHNSTEIG_Y + 0.02, -2.6, M("#D9D6C9", 0.8));              // helle Kantenlinie
    box(110, 0.04, 0.5, 0, BAHNSTEIG_Y + 0.02, -2.1, M("#6B6860", 0.9));
    for (let i = -24; i <= 24; i++) box(0.06, 0.02, 9.5, i * 2.2, BAHNSTEIG_Y + 0.011, 2.1, M("#7D786E", 1), false);   // Plattenfugen
    // Gleise: zwei Gleise, Schotterbett, Schwellen, Schienen
    for (const zc of [-5.8, -9.8]) {
      box(220, 0.24, 3.6, 0, 0.1, zc, M("#6C6A66", 1), false).castShadow = false;
      for (const dz of [-0.7175, 0.7175]) box(220, 0.16, 0.07, 0, 0.32, zc + dz, M("#8A8D91", 0.45, { metalness: 0.6 }));
    }
    const sw = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.12, 2.6), M("#4E4A44", 1), 2 * 360), mm = new THREE.Matrix4(); let k = 0;
    for (const zc of [-5.8, -9.8]) for (let i = 0; i < 360; i++) { mm.makeTranslation(-110 + i * 0.62, 0.27, zc); sw.setMatrixAt(k++, mm); }
    sw.receiveShadow = true; s.add(sw);
    // Wartehäuschen (Glas und Holz) bei x = −9, Dach, Bank, Anzeigekasten
    box(5.4, 0.14, 3.0, -9, BAHNSTEIG_Y + 2.6, -0.6, M("#3F4A52", 0.6));
    for (const dx of [-2.4, 2.4]) for (const zz of [-1.9, 0.6]) box(0.12, 2.55, 0.12, -9 + dx, BAHNSTEIG_Y + 1.27, zz, M("#2E3438", 0.5, { metalness: 0.5 }));
    box(5.2, 2.4, 0.08, -9, BAHNSTEIG_Y + 1.25, 0.6, M("#A9C1C8", 0.15, { transparent: true, opacity: 0.45 }), false);
    box(2.4, 0.08, 0.5, -9, BAHNSTEIG_Y + 0.55, 0.2, M("#7A5B3E", 0.8));
    // Anzeigetafel (LED, gelb-orange) an Mast bei x = −17; Fläche zeigt zur Kamera (+x). Aus bei Ausfall des Bahnsteigs.
    box(0.14, 3.3, 0.14, -17, BAHNSTEIG_Y + 1.65, -1.0, M("#3A3F44", 0.5, { metalness: 0.5 }));
    box(0.18, 0.9, 2.4, -16.88, BAHNSTEIG_Y + 3.0, -1.0, M("#1C1F22", 0.5));
    this.tafelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.5, 0.2) });
    this.tafel = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.62), this.tafelMat); this.tafel.rotation.y = Math.PI / 2; this.tafel.position.set(-16.78, BAHNSTEIG_Y + 3.0, -1.0); s.add(this.tafel);
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 76; const g = cv.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, 256, 76); g.fillStyle = "#fff"; g.font = "bold 22px monospace"; g.fillText("GLEIS 1   RE 17", 8, 28); g.fillText("14:56   +0", 8, 60);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; this.tafelMat.map = tx; this.tafelMat.needsUpdate = true;
    // Bahnsteiglaternen (Mast, Kopf), Glimmer über Puffs
    this.plLampen = [-26, -4.5, 12, 30].map((x) => { box(0.1, 4.6, 0.1, x, BAHNSTEIG_Y + 2.3, -1.6, M("#2F3438", 0.6)); box(0.9, 0.12, 0.34, x, BAHNSTEIG_Y + 4.55, -1.8, M("#2F3438", 0.6)); return [x, BAHNSTEIG_Y + 4.42, -1.8]; });
    // Fußgängerbrücke (Treppenturm) bei x = 34: Standpunkt der Gesamtansicht (Schnitt), Ort für Kamera in 16 m Höhe
    box(4, 16, 4, 34, 8, 5.5, M("#9C968B", 0.9)); box(6, 0.4, 3, 34, 16.2, 5.5, M("#6F6A60", 0.9));
    // Bäume und Büsche am Bahndamm (einfache Kegel/Kugel-Bäume, herbstlich)
    const NB = 46, bm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), M("#FFFFFF", 0.95), NB), cm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.18, 1, 6), M("#4B3A2A", 1), NB);
    const cols = ["#7A6A34", "#8A7030", "#5F6E36", "#8C5A2C", "#6F6A32", "#9A8A4A"], q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), ee = new THREE.Euler();
    for (let i = 0; i < NB; i++) {
      const x = -110 + (i / (NB - 1)) * 220 + (hash(i, 3) - 0.5) * 9, z = -22 - hash(i, 4) * 10, r = 0.9 + hash(i, 5) * 1.0, hh = 2.4 + hash(i, 6) * 2.0;
      const sk = hash(i, 9) < 0.5 ? 0 : 1;                                                      // Lücken für den Blick auf das Dorf
      cm.setMatrixAt(i, mm.compose(ps.set(x, hh / 2, z), q.identity(), sc.set(sk, hh, sk)));
      bm.setMatrixAt(i, mm.compose(ps.set(x, hh + r * 0.5, z), q.setFromEuler(ee.set(0, hash(i, 7) * 6, 0)), sc.set(r * sk, r * 0.9 * sk, r * sk)));
      bm.setColorAt(i, new THREE.Color(cols[Math.floor(hash(i, 8) * 5.99)]));
    }
    for (const m of [bm, cm]) { m.castShadow = true; s.add(m); }
  }

  // ---------------------------------------------------------------------------------------- Dorf
  _dorf() {
    const s = this.szene;
    this.haeuser = []; this.fenster = []; this.lampen = []; this.ampeln = [];
    const wandFarben = ["#E9E2D0", "#D9C9A8", "#C98B6B", "#EDE6DA", "#B7C0B0", "#D7B98A", "#F0EBDD", "#A9B6C2"], dachFarben = ["#7A3B2A", "#4B4B52", "#8A4A32", "#3E3E44", "#6B3A2E"];
    let nr = 0;
    const haus = ({ x, z, b = 9, t = 8, h = 5.5, yaw = 0, flach = false, wand = null, dach = null, od, fro = 2, hoch = 1, fen = 0.75 }) => {
      const i = nr++, y0 = hoehe(x, z);
      this.haeuser.push({ x, z, b, t, h, yaw, flach, y0, wand: wand || wandFarben[Math.floor(hash(i, 11) * 7.99)], dach: dach || dachFarben[Math.floor(hash(i, 12) * 4.99)], od, hoch });
      const sp = (lx, lz, ry, nSp, nRe) => {
        for (let r = 0; r < nRe; r++) for (let c = 0; c < nSp; c++) {
          const off = (c - (nSp - 1) / 2) * (ry === 0 ? Math.min(3.4, (b - 1.6) / Math.max(1, nSp)) : Math.min(3.4, (t - 1.6) / Math.max(1, nSp)));
          this.fenster.push({ h: i, lx: ry === 0 ? off : lx, lz: ry === 0 ? lz : off, ry, ly: 1.6 + r * 2.9, an: hash(this.fenster.length, 21) < fen, od, ph: hash(this.fenster.length, 22) });
        }
      };
      const nF = Math.max(1, Math.round(b / 3.6)), nR = Math.max(1, Math.round(h / 3.4));
      sp(0, t / 2 + 0.03, 0, nF, nR); sp(b / 2 + 0.03, 0, Math.PI / 2, Math.max(1, Math.round(t / 4)), nR); sp(-b / 2 - 0.03, 0, -Math.PI / 2, Math.max(1, Math.round(t / 4)), nR);
      return i;
    };
    const lampe = (x, z, od, hh = 5.2) => this.lampen.push({ x, z, y: hoehe(x, z) + hh, od });
    const reihe = (od, x0, z0, nx, nz, dx, dz, o = {}) => { for (let a = 0; a < nx; a++) for (let c = 0; c < nz; c++) haus({ x: x0 + a * dx + (hash(a * 7 + c, 31 + od) - 0.5) * 2.2, z: z0 - c * dz + (hash(a * 5 + c, 32 + od) - 0.5) * 2.2, yaw: (hash(a + c * 9, 33 + od) - 0.5) * (o.yaw ?? 0.25), od, ...o, b: (o.b ?? 9) + (hash(a + c, 34 + od) - 0.5) * 2, t: (o.t ?? 8) + (hash(a + c, 35 + od) - 0.5) * 2 }); };
    // 0 Neubaugebiet (einheitlich hell, 3×3), 6 Siedlung Ost
    reihe(0, 26, -54, 3, 3, 14, 12, { wand: "#EFE9DC", dach: "#5B5B62", b: 9, t: 8 }); [[27, -50], [53, -50], [27, -80], [53, -80]].forEach(([x, z]) => lampe(x, z, 0));
    reihe(6, 62, -88, 3, 2, 12, 14, { b: 8.5, t: 8 }); [[60, -82], [84, -82], [72, -108]].forEach(([x, z]) => lampe(x, z, 6));
    // 1 Gewerbegebiet: große Hallen mit Flachdach
    haus({ x: -82, z: -62, b: 24, t: 14, h: 6.4, flach: true, wand: "#B5B7B8", od: 1, fen: 0.9 }); haus({ x: -56, z: -64, b: 20, t: 14, h: 6.4, flach: true, wand: "#C7C0B0", od: 1, fen: 0.9 }); haus({ x: -72, z: -88, b: 28, t: 12, h: 7, flach: true, wand: "#9EA8B0", od: 1, fen: 0.9 });
    [[-92, -52], [-66, -52], [-58, -80], [-88, -80]].forEach(([x, z]) => lampe(x, z, 1, 6.5));
    // 2 Siedlung West (locker, gemischt)
    reihe(2, -46, -90, 3, 2, 12.5, 14, { b: 8.5, t: 7.6, yaw: 0.5 }); [[-48, -84], [-26, -84], [-34, -108]].forEach(([x, z]) => lampe(x, z, 2));
    // 3 Schule + Sporthalle + Sportplatz mit Flutlicht
    haus({ x: 10, z: -88, b: 30, t: 11, h: 7.2, flach: true, wand: "#D9C19A", od: 3, fen: 0.85 }); haus({ x: 32, z: -92, b: 14, t: 18, h: 8, flach: false, wand: "#BFC7C9", od: 3, fen: 0.5 });
    for (const [x, z] of [[-6, -106], [26, -106], [-6, -122], [26, -122]]) lampe(x, z, 3, 15);
    this.sport = { x: 10, z: -114, b: 30, t: 20 };
    // 4 Kreuzung: Häuser an der Hauptstraße, Ampel, Laternen
    haus({ x: -18, z: -57, b: 10, t: 8, od: 4, yaw: 0.1 }); haus({ x: 8, z: -58, b: 11, t: 8, od: 4, yaw: -0.12 }); haus({ x: 24, z: -57, b: 9, t: 8, od: 4 });
    haus({ x: -34, z: -58, b: 9.5, t: 8, od: 4, yaw: 0.2 }); haus({ x: -16, z: -39, b: 9, t: 7, od: 4, yaw: 0.1, wand: "#D8BC8B" }); haus({ x: 10, z: -39, b: 9, t: 7, od: 4 });
    [[-12, -52], [0, -52], [-12, -44], [0, -44], [-30, -52], [18, -52]].forEach(([x, z]) => lampe(x, z, 4));
    this.ampelStandort = [[-10.2, -44.8, 0], [-1.8, -51.2, Math.PI]];
    // 5 Ortskern mit Kirche
    haus({ x: -8, z: -118, b: 10, t: 24, h: 9, od: 5, wand: "#E6DCC4", dach: "#5E3A2F", fen: 0.6 });        // Kirchenschiff (Firstrichtung z)
    this.kirche = { x: -8, z: -102, h: 22 }; haus({ x: -8, z: -102, b: 6, t: 6, h: 14, flach: true, od: 5, wand: "#E6DCC4", fen: 0.3 });
    reihe(5, -34, -112, 2, 2, 13, 12, { b: 9, t: 8 }); reihe(5, 12, -112, 2, 2, 13, 12, { b: 9, t: 8 });
    [[-20, -110], [4, -110], [-20, -128], [4, -128]].forEach(([x, z]) => lampe(x, z, 5));
    // 7 Hangsiedlung, 8 Höfe (große Scheunen), 9 Mühlenweg
    reihe(7, 38, -124, 3, 2, 11, 12, { b: 8, t: 7.4, yaw: 0.3 }); [[40, -118], [58, -118]].forEach(([x, z]) => lampe(x, z, 7));
    haus({ x: -70, z: -132, b: 12, t: 9, od: 8 }); haus({ x: -50, z: -136, b: 22, t: 12, h: 7, od: 8, wand: "#7E5A3E", dach: "#3E3E44", fen: 0.2 }); haus({ x: -62, z: -152, b: 18, t: 10, h: 6.5, od: 8, wand: "#8A6446", fen: 0.2 }); haus({ x: -36, z: -150, b: 10, t: 8, od: 8 });
    [[-60, -126], [-44, -126]].forEach(([x, z]) => lampe(x, z, 8));
    haus({ x: -2, z: -150, b: 10, t: 9, h: 9, od: 9, wand: "#C8B79B", dach: "#4B4B52", fen: 0.6 }); haus({ x: 14, z: -158, b: 9, t: 8, od: 9 }); haus({ x: 28, z: -150, b: 8.6, t: 7.6, od: 9 }); haus({ x: -18, z: -164, b: 9, t: 8, od: 9 });
    [[4, -144], [20, -144]].forEach(([x, z]) => lampe(x, z, 9));
    this._bauHaeuser();
    this._bauLampen();
    this._bauKirche();
    this._bauSport();
    // Wald und Hecken im Hintergrund (Dorfrand) als Instanzen
    const bm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 1 }), 220), q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), ps = new THREE.Vector3(), sc = new THREE.Vector3();
    const cols = ["#6E6A2E", "#8A6B2D", "#55642F", "#A5642A"];
    for (let i = 0; i < 220; i++) {
      const ang = (i / 220) * Math.PI * 1.15 + 0.4 * hash(i, 41), R = 150 + 28 * hash(i, 42), x = -R * 1.05 * Math.cos(ang) + 20, z = -230 + R * 0.6 * Math.sin(ang) * -1 + 140 * hash(i, 43) - 70;
      const r = 4 + hash(i, 44) * 6; bm.setMatrixAt(i, m4.compose(ps.set(x, hoehe(x, z) + r * 0.8, Math.min(z, -165 - 10 * hash(i, 45))), q.identity(), sc.set(r, r * 1.1, r))); bm.setColorAt(i, new THREE.Color(cols[Math.floor(hash(i, 46) * 3.99)]));
    }
    bm.castShadow = true; s.add(bm);
  }
  _bauHaeuser() {
    const H = this.haeuser, n = H.length, mm = new THREE.Matrix4(), q = new THREE.Quaternion(), ps = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
    const kasten = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.92 }), n);
    const geoDach = prisma(1, 1, 1), dach = new THREE.InstancedMesh(geoDach, new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.85 }), n);
    H.forEach((h, i) => {
      q.setFromEuler(e.set(0, h.yaw, 0));
      kasten.setMatrixAt(i, mm.compose(ps.set(h.x, h.y0 + h.h / 2, h.z), q, sc.set(h.b, h.h, h.t))); kasten.setColorAt(i, c.set(h.wand));
      if (h.flach) { dach.setMatrixAt(i, mm.compose(ps.set(0, -50, 0), q, sc.set(0, 0, 0))); }
      else { const dh = Math.min(h.b * 0.34, 3.6); dach.setMatrixAt(i, mm.compose(ps.set(h.x, h.y0 + h.h, h.z), q, sc.set(h.b + 0.9, dh, h.t + 0.9))); }
      dach.setColorAt(i, c.set(h.dach));
    });
    for (const m of [kasten, dach]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; this.szene.add(m); }
    // Fenster (Instanzen, Farbe je Bild)
    const F = this.fenster, fm = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1, 1.35), new THREE.MeshBasicMaterial({ color: "#FFFFFF", side: THREE.DoubleSide }), F.length);
    F.forEach((f, i) => {
      const h = H[f.h]; q.setFromEuler(e.set(0, h.yaw, 0));
      const lokal = ps.set(f.lx, f.ly, f.lz).applyQuaternion(q);
      const qq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, h.yaw + f.ry, 0));
      fm.setMatrixAt(i, mm.compose(new THREE.Vector3(h.x + lokal.x, h.y0 + lokal.y, h.z + lokal.z), qq, sc.set(1, 1, 1))); fm.setColorAt(i, L_AUS);
    });
    fm.frustumCulled = false; this.szene.add(fm); this.fensterMesh = fm;
    this.kasten = kasten;
  }
  _bauLampen() {
    const s = this.szene, Ls = this.lampen, mm = new THREE.Matrix4(), ps = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    const mast = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 1, 6), new THREE.MeshStandardMaterial({ color: "#3A3F44", roughness: 0.6 }), Ls.length);
    const kopf = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.14, 0.3), new THREE.MeshBasicMaterial({ color: "#FFFFFF" }), Ls.length);
    Ls.forEach((l, i) => { const y0 = l.y - 0.1 - (l.y - hoehe(l.x, l.z)) / 2 + 0.1; mast.setMatrixAt(i, mm.compose(ps.set(l.x, hoehe(l.x, l.z) + (l.y - hoehe(l.x, l.z)) / 2, l.z), q.identity(), sc.set(1, l.y - hoehe(l.x, l.z), 1))); kopf.setMatrixAt(i, mm.compose(ps.set(l.x, l.y, l.z), q.identity(), sc.set(1, 1, 1))); kopf.setColorAt(i, L_AUS); });
    mast.castShadow = true; for (const m of [mast, kopf]) { m.frustumCulled = false; s.add(m); }
    this.lampenKopf = kopf; this.glimmer = new Puffs(s, { max: 260, additiv: true, schatten: 1 });
    // Ampeln (Mast + Gehäuse) – Lichter als Glimmer
    for (const [x, z] of this.ampelStandort) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.4, 0.12), new THREE.MeshStandardMaterial({ color: "#2C3034", roughness: 0.6 })); m.position.set(x, 1.7, z); m.castShadow = true; s.add(m);
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.95, 0.28), new THREE.MeshStandardMaterial({ color: "#1B1E21", roughness: 0.5 })); g.position.set(x, 3.2, z); g.castShadow = true; s.add(g);
    }
  }
  _bauKirche() {
    const s = this.szene, k = this.kirche, y0 = hoehe(k.x, k.z), m = new THREE.Mesh(new THREE.ConeGeometry(4.2, 11, 4), new THREE.MeshStandardMaterial({ color: "#4A4A50", roughness: 0.7 }));
    m.position.set(k.x, y0 + 14 + 5.5, k.z); m.rotation.y = Math.PI / 4; m.castShadow = true; s.add(m);
    const hahn = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshStandardMaterial({ color: "#C8A24A", metalness: 0.8, roughness: 0.3 })); hahn.position.set(k.x, y0 + 14 + 11.3, k.z); s.add(hahn);
  }
  _bauSport() {
    const sp = this.sport, y = hoehe(sp.x, sp.z), m = new THREE.Mesh(new THREE.PlaneGeometry(sp.b, sp.t), new THREE.MeshStandardMaterial({ color: "#6E8A3E", roughness: 1 }));
    m.rotation.x = -Math.PI / 2; m.position.set(sp.x, y + 0.05, sp.z); m.receiveShadow = true; this.szene.add(m);
    const ln = new THREE.Mesh(new THREE.PlaneGeometry(sp.b - 2, sp.t - 2), new THREE.MeshStandardMaterial({ color: "#8DA354", roughness: 1 })); ln.rotation.x = -Math.PI / 2; ln.position.set(sp.x, y + 0.06, sp.z); this.szene.add(ln);
  }

  // ---------------------------------------------------------------------------------------- Umspannwerk, Freileitung
  _umspann() {
    const s = this.szene, { x: ux, z: uz } = UMSPANN, M = (c, r = 0.6, ex = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...ex });
    const box = (b, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; s.add(m); return m; };
    box(44, 0.1, 30, ux, 0.06, uz, M("#8C8A84", 1));                                                      // Schotterfläche
    for (const dx of [-22, 22]) box(0.1, 2.4, 30, ux + dx, 1.2, uz, M("#767B80", 0.7)); for (const dz of [-15, 15]) box(44, 2.4, 0.1, ux, 1.2, uz + dz, M("#767B80", 0.7));   // Zaun
    for (let i = 0; i < 3; i++) {                                                                          // Portale
      const x = ux - 12 + i * 12; for (const dz of [-5, 5]) box(0.35, 11, 0.35, x, 5.5, uz - 4 + dz, M("#9AA0A6", 0.5, { metalness: 0.5 }));
      box(0.3, 0.3, 10.6, x, 10.8, uz - 4, M("#9AA0A6", 0.5, { metalness: 0.5 }));
      for (let k = -1; k <= 1; k++) box(0.15, 1.6, 0.15, x, 9.9, uz - 4 + k * 3.2, M("#CFC8B8", 0.4));       // Isolatoren
    }
    for (let i = 0; i < 3; i++) { const x = ux - 12 + i * 12; box(4.6, 4.2, 3.6, x, 2.2, uz + 6, M("#6E7F6A", 0.6)); for (let k = -1; k <= 1; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 2.4, 8), M("#CBBFA6", 0.4)); b.position.set(x + k * 1.4, 5.3, uz + 6); b.castShadow = true; s.add(b); } }
    box(8, 3.4, 5, ux + 14, 1.8, uz - 9, M("#C9C2B2", 0.9));                                              // Schalthaus
    this.umFenster = box(1.6, 1.1, 0.06, ux + 14, 2.1, uz - 6.45, new THREE.MeshBasicMaterial({ color: L_WARM.clone() }));
    this.umMasten = [[ux - 20, uz + 13], [ux + 20, uz + 13], [ux - 20, uz - 13], [ux + 20, uz - 13]].map(([x, z]) => { box(0.18, 12, 0.18, x, 6, z, M("#656B70", 0.6)); box(1.4, 0.2, 0.5, x, 12.1, z, M("#656B70", 0.6)); return [x, 12.0, z]; });
    // Warnlichter am Mast, Blinken als Funktion von t
    // Freileitung: Gittermasten von (ux, uz) nach Norden in den Dunst, Drähte als Linien
    const mastPos = []; for (let i = 0; i < 9; i++) { const u = i / 8; mastPos.push([ux + 8 + 46 * u + 4 * Math.sin(u * 3), uz - 22 - u * u * 420 - u * 40]); }
    const lin = []; const arm = [[-4.2, 30], [4.2, 30], [-4.2, 36], [4.2, 36], [-3.2, 42], [3.2, 42]];
    mastPos.forEach(([x, z], i) => {
      const y0 = hoehe(x, z), sc = 1;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) lin.push(x + sx * 2.2, y0, z + sz * 2.2, x + sx * 0.6, y0 + 38, z + sz * 0.6);
      for (let k = 0; k < 6; k++) { const yy = y0 + 4 + k * 6.4; lin.push(x - 1.8 + 0.28 * k, yy, z - 1.6 + 0.2 * k, x + 1.8 - 0.28 * k, yy + 3.2, z + 1.6 - 0.2 * k, x + 1.8 - 0.28 * k, yy, z + 1.6 - 0.2 * k, x - 1.8 + 0.28 * k, yy + 3.2, z - 1.6 + 0.2 * k); }
      for (const [dx, hy] of arm) lin.push(x, y0 + hy - 1, z, x + dx, y0 + hy - 0.4, z);
      if (i < mastPos.length - 1) { const [x2, z2] = mastPos[i + 1], y1 = hoehe(x2, z2); for (const [dx, hy] of arm) { let px = x + dx, py = y0 + hy - 0.4, pz = z; for (let k = 1; k <= 10; k++) { const u = k / 10, nx = x2 + dx, nz = z2, ny = y1 + hy - 0.4; const sag = 6 * Math.sin(u * Math.PI); const yy = lerp(y0 + hy - 0.4, ny, u) - sag; const xx = lerp(x + dx, nx, u), zz = lerp(z, nz, u); lin.push(px, py, pz, xx, yy, zz); px = xx; py = yy; pz = zz; } } }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(lin, 3));
    this.leitung = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: "#3C4146" })); this.leitung.frustumCulled = false; s.add(this.leitung);
    this.flutlicht = [[ux - 20, uz + 13], [ux + 20, uz + 13], [ux - 20, uz - 13], [ux + 20, uz - 13]];
  }

  // ---------------------------------------------------------------------------------------- Windpark
  _windpark() {
    const s = this.szene, M = (c, r = 0.5) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
    this.rotoren = [];
    const pos = [[-150, -250], [-60, -290], [30, -330], [120, -280], [190, -360], [-200, -380], [-20, -430], [90, -470], [-110, -520], [200, -560], [10, -600]];
    pos.forEach(([x, z], i) => {
      const y = hoehe(x, z), hub = 85, sk = 0.9 + 0.1 * hash(i, 61);
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.5 * sk, 2.6 * sk, hub, 10), M("#E8E8E6", 0.55)); tw.position.set(x, y + hub / 2, z); tw.castShadow = true; s.add(tw);
      const na = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 10), M("#E2E2E0", 0.5)); na.position.set(x, y + hub + 1, z - 2); na.castShadow = true; s.add(na);
      const rotor = new THREE.Group(); rotor.position.set(x, y + hub + 1, z + 3.4);
      for (let k = 0; k < 3; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(2.2, 38, 0.5), M("#E9E9E6", 0.45)); bl.geometry.translate(0, 19, 0); bl.rotation.z = (k * 2 * Math.PI) / 3; bl.castShadow = true; rotor.add(bl); }
      s.add(rotor); this.rotoren.push({ g: rotor, ph: hash(i, 62) * 6.28, w: 0.95 + 0.25 * hash(i, 63) });
    });
  }

  // ---------------------------------------------------------------------------------------- fernes Kraftwerk, Wolken
  _ferne() {
    const s = this.szene, M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
    const turm = (x, z, i) => { const pts = []; for (let k = 0; k <= 20; k++) { const u = k / 20; pts.push(new THREE.Vector2(26 + 14 * (1 - Math.sin(u * 2.1 + 0.2)) * 0.9 + 6 * (u - 0.5) ** 2, u * 115)); }
      const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), M("#C9C2B6")); m.position.set(x, hoehe(x, z), z); m.castShadow = true; s.add(m); };
    turm(DAMPF_A[0] - 70, DAMPF_A[2], 0); turm(DAMPF_A[0], DAMPF_A[2], 1); turm(DAMPF_A[0] + 70, DAMPF_A[2] + 10, 2);
    for (const dx of [-30, 0, 30]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(5, 7, 190, 10), M("#B8B3AA")); k.position.set(DAMPF_B[0] + dx, 95, DAMPF_B[2]); k.castShadow = true; s.add(k); }
    const hall = new THREE.Mesh(new THREE.BoxGeometry(140, 40, 60), M("#A9A7A0")); hall.position.set(DAMPF_B[0], 20, DAMPF_B[2] + 50); s.add(hall);
    this.dampf = new Puffs(s, { max: 420, schatten: 0.55 }); this.wolken = new Puffs(s, { max: 120, schatten: 0.7, renderOrder: 9 });
    this.wolkenF = wolkenFeld({ anzahl: 7, bereich: { x: [-700, 700], z: [-1400, -800] }, hoehe: [260, 420], groesse: 90, farbe: "#F3D9BE", a: 0.8, wind: [1.5, 0], seed: 5 });
    this.laub = new Partikel(s, { art: "staub", anzahl: 1, box: [1, 1, 1] });      // Platzhalter (kein Zufall), Laub unten als eigene Instanzen
    this.laubMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.12), new THREE.MeshBasicMaterial({ color: "#FFFFFF", side: THREE.DoubleSide }), 50);
    for (let i = 0; i < 50; i++) this.laubMesh.setColorAt(i, new THREE.Color(["#B5612B", "#A9772C", "#8A6B2D", "#C98B3A"][i % 4]).multiplyScalar(0.8));
    this.laubMesh.frustumCulled = false; s.add(this.laubMesh); this.laub.obj.visible = false;
  }

  // ---------------------------------------------------------------------------------------- Menschen, Autos, Vögel
  _statisten() {
    const s = this.szene, boden = () => BAHNSTEIG_Y;
    this.leute = new Menschen(s, { anzahl: 8, seed: 71, hoehe: 1.75 }).verteile({ anzahl: 6, punkte: [[-13.5, -0.4], [-20, -0.9], [-21.2, 0.3], [-26.5, -0.6], [24, -1.2], [27.5, -0.5]], boden, gehen: 0 });
    this.autos = new Autos(s, { anzahl: 8, seed: 81 }).spur({ punkte: [[-190, 0.03, -49.8], [190, 0.03, -49.8]], anzahl: 4, tempo: 8 }).spur({ punkte: [[190, 0.03, -46.2], [-190, 0.03, -46.2]], anzahl: 3, tempo: 7 });
    this.voegel = new Voegel(s, { anzahl: 14, seed: 91 }).schwarm({ zentrum: [-8, 36, -108], radius: 28, hoehe: 10, tempo: 6, anzahl: 10 }).schwarm({ zentrum: [50, 22, -60], radius: 30, hoehe: 6, tempo: 7, anzahl: 4 });
  }

  // ---------------------------------------------------------------------------------------- je Bild
  /** Dampffahne als Puff-Liste: ort [x,y,z], stärke(τ) = Emission zur Zeit τ (0…1), Höhe m, Breite m, Wind */
  _fahne(ort, staerke, t, { hoehe = 150, breite = 28, seed = 1, n = 70, wind = [3, 0] } = {}) {
    const L = [], zyk = 22;
    for (let k = 0; k < n; k++) {
      const off = k / n, alter = ((t / zyk + off) % 1) * zyk, te = t - alter, st = staerke(te);
      if (st < 0.02) continue;
      const u = alter / zyk, h = hoehe * Math.pow(u, 0.8) * (0.5 + 0.5 * st), r = breite * (0.5 + 1.6 * u) * (0.55 + 0.45 * st);
      L.push({ p: [ort[0] + wind[0] * alter + (hash(k, seed) - 0.5) * breite * 0.5, ort[1] + 100 + h, ort[2] + wind[1] * alter + (hash(k, seed + 1) - 0.5) * 10], r, dreh: hash(k, seed + 2) * 6, farbe: "#F4EDE4", a: 0.5 * st * (1 - 0.65 * u), licht: 1, bild: k % 4 });
    }
    return L;
  }
  update(t, o) {
    const { kamera, sonne = [-0.25, 0.2, -1], hell = 1, aus = {}, dampfA = null, dampfB = null, laubStaerke = 1 } = o;
    const sv = new THREE.Vector3(...sonne).normalize();
    this.sonne.position.copy(this.sonne.target.position).addScaledVector(sv, 420);
    this.sonne.color.set(o.sonneFarbe || "#FFC98A"); this.sonne.intensity = (o.sonneStaerke ?? 3.2) * hell;
    this.hemi.intensity = (o.umgebung ?? 1.1) * (0.55 + 0.45 * hell);
    this.himmel.setze({ sonnenRichtung: [sv.x, sv.y, sv.z], ...(o.himmel || {}) }).folge(kamera);
    this.himmel.u.zeit.value = t;
    // Fenster: Zustand je Ortsteil mit gestaffeltem Erlöschen (Ausbreitung über den Ortsteil, ca. 0,9 s), Aufblitzen im Moment des Ausfalls
    const F = this.fenster, fm = this.fensterMesh, c = new THREE.Color();
    for (let i = 0; i < F.length; i++) {
      const f = F[i];
      let v;
      if (!f.an) v = 0; else {
        const t0 = (f.od === 10 ? aus.bahnsteig : aus.ortsteile?.[f.od]) ?? 1e9, a = t0 + 0.9 * f.ph;
        v = t < a ? 1 : t < a + 0.12 ? 1 + 1.4 * Math.sin(((t - a) / 0.12) * Math.PI) : 0;
        if (t < a) v *= 0.9 + 0.1 * Math.sin(t * 0.7 + f.ph * 20);
      }
      c.copy(L_AUS).lerp(L_WARM, clamp(v)); if (v > 1) c.multiplyScalar(v); fm.setColorAt(i, c);
    }
    fm.instanceColor.needsUpdate = true;
    // Laternen, Ampel, Tafel, Umspannwerk, Glimmer
    const gl = [], lk = this.lampenKopf, lamp = (od) => (t < ((od === 10 ? aus.bahnsteig : od === 11 ? aus.umspann : aus.ortsteile?.[od]) ?? 1e9));
    this.lampen.forEach((l, i) => { const an = lamp(l.od); lk.setColorAt(i, an ? c.set(3.2, 2.2, 1.1) : L_AUS); if (an) gl.push({ p: [l.x, l.y - 0.2, l.z], r: 2.6, farbe: [1.4, 0.95, 0.45], a: 0.7, licht: 0 }); });
    lk.instanceColor.needsUpdate = true;
    const pb = lamp(10); this.tafelMat.color.setRGB(pb ? 2.4 : 0.02, pb ? 1.5 : 0.02, pb ? 0.2 : 0.02); this.tafelMat.map ? (this.tafelMat.color.multiplyScalar(pb ? 1 : 1)) : 0;
    if (pb) for (const [x, y, z] of this.plLampen) gl.push({ p: [x, y - 0.2, z], r: 3.0, farbe: [1.4, 0.95, 0.45], a: 0.8, licht: 0 });
    if (pb) gl.push({ p: [-16.7, BAHNSTEIG_Y + 3.0, -1.0], r: 2.0, farbe: [1.2, 0.7, 0.1], a: 0.6, licht: 0 });
    const um = lamp(11); this.umFenster.material.color.copy(um ? L_WARM : L_AUS);
    if (um) { for (const [x, z] of this.flutlicht) gl.push({ p: [x, 12.0, z], r: 3, farbe: [1.2, 1.1, 0.9], a: 0.5, licht: 0 }); if (Math.sin(t * 2.4) > 0) gl.push({ p: [UMSPANN.x + 14, 4.2, UMSPANN.z - 9], r: 0.8, farbe: [0.2, 2.4, 0.4], a: 1, licht: 0 }); }
    if (t < (aus.ortsteile?.[3] ?? 1e9)) for (const [x, z] of [[-6, -106], [26, -106], [-6, -122], [26, -122]]) gl.push({ p: [x, hoehe(x, z) + 15, z], r: 7, farbe: [1.5, 1.45, 1.2], a: 0.9, licht: 0 });
    // Ampelzyklus: 12 s (grün 5, gelb 1, rot 5, rot-gelb 1); aus ab aus.ampel
    if (t < (aus.ampel ?? 1e9)) {
      const ph = (t % 12), farb = ph < 5 ? [0.2, 2.2, 0.5] : ph < 6 ? [2.6, 1.8, 0.2] : ph < 11 ? [2.6, 0.25, 0.15] : [2.6, 1.4, 0.2], y = ph < 5 ? 3.0 : ph < 6 ? 3.2 : ph < 11 ? 3.45 : 3.3;
      for (const [x, z, ry] of this.ampelStandort) gl.push({ p: [x, y, z + (ry === 0 ? 0.2 : -0.2)], r: 0.7, farbe: farb, a: 1, licht: 0 });
    }
    this.glimmer.setze(gl, kamera);
    // Autos halten bei Ausfall der Ampel; Menschen; Vögel
    this.autos.stopp = (aus.ampel ?? 1e9) < 1e8 ? { t0: aus.ampel, dauer: 3.2 } : null; this.autos.setze(t);
    this.leute.setze(t); this.voegel.setze(t);
    // Windrotoren: Drehwinkel als Funktion von t (Auslaufen ab aus.wind)
    for (const r of this.rotoren) { const tw = aus.wind ?? 1e9, tau = 4.5, a = t < tw ? r.w * t : r.w * tw + r.w * tau * (1 - Math.exp(-(t - tw) / tau)); r.g.rotation.z = r.ph + a; }
    // Dampf, Wolken
    const dl = [];
    if (dampfA) dl.push(...this._fahne(DAMPF_A, dampfA, t, { seed: 3, hoehe: 190, breite: 34, wind: [2.4, 0.4] }));
    if (dampfB) dl.push(...this._fahne(DAMPF_B, dampfB, t, { seed: 9, hoehe: 150, breite: 18, wind: [-2, 0.2], n: 60 }));
    this.dampf.setze(dl, kamera); this.wolken.setze(this.wolkenF(t), kamera);
    // Laub weht über den Bahnsteig (Alltagseffekt): Bahn als Funktion von t, 50 Blätter, in den ersten Sekunden dichter
    const lm = this.laubMesh, mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), ps = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < 50; i++) {
      const per = 7 + 4 * hash(i, 71), ph = (t / per + hash(i, 72)) % 1, x = -30 + ph * 70 + Math.sin(t * 1.3 + i) * 0.8, z = 1 + 4 * hash(i, 73) + Math.sin(t * 0.9 + i * 2) * 0.9;
      const y = BAHNSTEIG_Y + 0.25 + 1.3 * Math.abs(Math.sin(t * 2.2 + i * 1.7)) * (0.4 + hash(i, 74)) * laubStaerke;
      lm.setMatrixAt(i, mm.compose(ps.set(x, y, z), q.setFromEuler(e.set(t * 3 + i, t * 2.3 + i * 2, t * 4 + i)), sc.setScalar(laubStaerke > 0.01 ? 1.4 : 0)));
    }
    lm.instanceMatrix.needsUpdate = true;
    return this;
  }
}
