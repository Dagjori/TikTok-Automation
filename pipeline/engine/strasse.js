// Autobahn-Bausteine im echten Maßstab (Meter): Fahrbahn mit endendem Fahrstreifen, Baustelle
// (Leitbaken mit Lauflicht, fahrbare Absperrtafel mit Blinklichtern, Baumaschinen), Verkehrsschilder,
// Leitplanken, eine instanzierte Fahrzeugflotte mit Bremslichtern und ein Abspieler für 30-Hz-Trajektorien.
//
// Koordinaten einer Fahrbahn (lokal): Fahrtrichtung −z. z = 0 ist die Engstelle (Ende des Fahrstreifens),
// z > 0 liegt davor (dort wächst der Stau), z < 0 dahinter. Spur 0 (durchgehend) links bei x = −spur/2,
// Spur 1 (endet) rechts bei x = +spur/2. Simulations-x (m, Fahrtrichtung +x) → z = −x.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mat, FARBE, kontaktSchatten } from "./bausteine.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- Texturen (Canvas)
function canvasTextur(b, h, zeichne, { wiederholen = false } = {}) {
  const c = document.createElement("canvas");
  c.width = b;
  c.height = h;
  zeichne(c.getContext("2d"), b, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (wiederholen) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Rot-weiße Schrägstreifen (Leitbake, Absperrtafel) */
function streifen(g, b, h, breite, richtung = 1) {
  g.fillStyle = "#FFFFFF";
  g.fillRect(0, 0, b, h);
  g.fillStyle = "#E3262B";
  for (let k = -h * 2; k < b + h * 2; k += breite * 2) {
    g.beginPath();
    g.moveTo(k, 0);
    g.lineTo(k + breite, 0);
    g.lineTo(k + breite - richtung * h, h);
    g.lineTo(k - richtung * h, h);
    g.closePath();
    g.fill();
  }
}

let texCache = null;
function texturen() {
  if (texCache) return texCache;
  const bake = canvasTextur(64, 256, (g, b, h) => {
    streifen(g, b, h, 42, -1);
    g.strokeStyle = "rgba(0,0,0,0.12)";
    g.lineWidth = 6;
    g.strokeRect(0, 0, b, h);
  });
  const tafel = canvasTextur(512, 340, (g, b, h) => {
    streifen(g, b, h, 46, 1);
    // blaues Gebotszeichen „links vorbei“
    const r = 108, cx = b / 2, cy = h / 2;
    g.fillStyle = "#FFFFFF";
    g.beginPath(); g.arc(cx, cy, r + 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#1F5FD6";
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.save();
    g.translate(cx, cy);
    g.rotate(Math.PI * 0.75);
    g.fillStyle = "#FFFFFF";
    g.fillRect(-13, -56, 26, 92);
    g.beginPath(); g.moveTo(0, 74); g.lineTo(-44, 22); g.lineTo(44, 22); g.closePath(); g.fill();
    g.restore();
  });
  // Einengungstafel (vereinfacht nach Z 531): zwei Fahrstreifen, der rechte endet
  const schild = canvasTextur(256, 320, (g, b, h) => {
    g.fillStyle = "#FFFFFF";
    rundRect(g, 0, 0, b, h, 26); g.fill();
    g.fillStyle = "#1F5FD6";
    rundRect(g, 10, 10, b - 20, h - 20, 20); g.fill();
    g.strokeStyle = "#FFFFFF";
    g.lineCap = "round";
    g.lineJoin = "round";
    g.lineWidth = 22;
    // linke Spur: gerade nach oben mit Pfeil
    g.beginPath(); g.moveTo(92, 290); g.lineTo(92, 92); g.stroke();
    pfeil(g, 92, 60);
    // rechte Spur: endet, schwenkt nach links
    g.beginPath(); g.moveTo(170, 290); g.lineTo(170, 200); g.quadraticCurveTo(170, 160, 128, 128); g.stroke();
    // Ende-Balken rechts
    g.fillStyle = "#E3262B";
    g.fillRect(150, 150, 46, 14);
  });
  const platte = (txt) => canvasTextur(256, 96, (g, b, h) => {
    g.fillStyle = "#FFFFFF";
    rundRect(g, 0, 0, b, h, 14); g.fill();
    g.strokeStyle = "#14171F"; g.lineWidth = 6;
    rundRect(g, 6, 6, b - 12, h - 12, 10); g.stroke();
    g.fillStyle = "#14171F";
    g.font = "900 62px 'SB Display', 'Inter', sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(txt, b / 2, h / 2 + 3);
  });
  const blob = canvasTextur(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.45, "rgba(255,255,255,0.5)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  });
  blob.colorSpace = THREE.NoColorSpace;
  texCache = { bake, tafel, schild, platte, blob };
  return texCache;
}
function rundRect(g, x, y, b, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + b, y, x + b, y + h, r);
  g.arcTo(x + b, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + b, y, r);
  g.closePath();
}
function pfeil(g, x, y) {
  g.fillStyle = "#FFFFFF";
  g.beginPath(); g.moveTo(x, y - 28); g.lineTo(x - 34, y + 22); g.lineTo(x + 34, y + 22); g.closePath(); g.fill();
}

// ---------------------------------------------------------------- Instanz-Hilfe
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();
function instanzen(geo, material, punkte, { schatten = true, empfangen = true, rot = null, skala = null } = {}) {
  const m = new THREE.InstancedMesh(geo, material, punkte.length);
  punkte.forEach((p, i) => {
    _q.setFromAxisAngle(V(0, 1, 0), rot ? rot(i, p) : 0);
    const s = skala ? skala(i, p) : 1;
    _s.set(s, s, s);
    _m.compose(p, _q, _s);
    m.setMatrixAt(i, _m);
  });
  m.castShadow = schatten;
  m.receiveShadow = empfangen;
  return m;
}
function rb(b, h, t, r, seg = 2) {
  const g = new RoundedBoxGeometry(b, h, t, seg, r);
  g.translate(0, h / 2, 0);
  return g;
}

// ---------------------------------------------------------------- Fahrbahn
export const SPUR = 3.75;
/** x-Position (lokal) einer Spur (0 = durchgehend, 1 = endet; Zwischenwerte beim Wechsel) */
export const spurX = (s, spur = SPUR) => (s - 0.5) * spur;

/**
 * Richtungsfahrbahn mit zwei Fahrstreifen; der rechte endet bei z = 0 (Baustelle dahinter).
 * opt: vor (m vor der Engstelle), nach (m dahinter), schilder: [Entfernungen in m], akzent: Farbe der Baustellen-Fahne
 * Rückgabe: { gruppe, update(t) (Warnlichter), breite: {links, rechts} }
 */
export function autobahn({ vor = 1150, nach = 320, spur = SPUR, schilder = [800], seitenstreifen = 2.5, asphalt = "#8E97AB", baustelle = true, seed = 1 } = {}) {
  const g = new THREE.Group();
  const T = texturen();
  const xl = -spur - 0.75;
  const xr = spur + seitenstreifen;
  const laenge = vor + nach;
  const zm = (vor - nach) / 2;

  // Fahrbahn
  const fb = new THREE.Mesh(new THREE.BoxGeometry(xr - xl, 0.06, laenge), mat(asphalt, { rau: 0.92 }));
  fb.position.set((xl + xr) / 2, 0.03, zm);
  fb.receiveShadow = true;
  g.add(fb);
  // Bankette (etwas heller) als Übergang zur Wiese
  const bank = mat("#C9CCB8", { rau: 1 });
  [xl - 0.9, xr + 0.9].forEach((x) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, laenge), bank);
    b.position.set(x, 0.02, zm);
    b.receiveShadow = true;
    g.add(b);
  });

  // Markierungen
  const weiss = mat("#FFFFFF", { rau: 0.55 });
  const gelbM = mat("#FFC21A", { rau: 0.55 });
  const linie = (x, z0, z1, m = weiss, b = 0.3) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(b, 0.012, Math.abs(z1 - z0)), m);
    l.position.set(x, 0.066, (z0 + z1) / 2);
    l.receiveShadow = true;
    g.add(l);
  };
  linie(xl + 0.45, -nach, vor);          // linker Rand
  linie(spur + 0.15, 0, vor);            // rechter Rand vor der Engstelle
  linie(spur + 0.15, -nach, 0, gelbM);   // gelbe Baustellenmarkierung dahinter
  linie(0.06, -nach, -2, gelbM, 0.34);   // gelbe Trennlinie in der Baustelle
  // Leitlinie (6 m Strich, 12 m Lücke) bis zur Engstelle
  const striche = [];
  for (let z = 4; z < vor; z += 18) striche.push(V(0, 0.066, z + 3));
  g.add(instanzen(new THREE.BoxGeometry(0.3, 0.012, 6), weiss, striche, { schatten: false }));
  // Sperrfläche (Schraffur) im letzten Stück des endenden Streifens
  const schraffur = [];
  for (let k = 0; k < 7; k++) schraffur.push(V(spur * 0.5, 0.066, -2.2 - k * 2.6));
  g.add(instanzen(new THREE.BoxGeometry(0.35, 0.012, 3.6), weiss, schraffur, { schatten: false, rot: () => 0.75 }));

  // Leitplanken mit Pfosten
  const planke = mat("#D9DEE6", { rau: 0.35, metall: 0.35 });
  const pfostenGeo = new THREE.BoxGeometry(0.14, 0.7, 0.14);
  pfostenGeo.translate(0, 0.35, 0);
  [xl - 0.35, xr + 0.35].forEach((x) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, laenge), planke);
    p.position.set(x, 0.62, zm);
    p.castShadow = true;
    p.receiveShadow = true;
    g.add(p);
    const pf = [];
    for (let z = -nach; z < vor; z += 4) pf.push(V(x, 0, z));
    g.add(instanzen(pfostenGeo, mat("#9AA3B2", { rau: 0.6 }), pf));
  });

  // Schilder vor der Engstelle (rechts am Seitenstreifen, Blick zum Verkehr = +z)
  const schildMat = new THREE.MeshStandardMaterial({ map: T.schild, roughness: 0.5 });
  const pfosten = mat("#AEB5C2", { rau: 0.4, metall: 0.4 });
  for (const d of schilder) {
    const s = new THREE.Group();
    [-0.7, 0.7].forEach((x) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.6, 10), pfosten);
      p.position.set(x, 1.8, -0.05);
      p.castShadow = true;
      s.add(p);
    });
    const tafel = new THREE.Mesh(new RoundedBoxGeometry(2.4, 3.0, 0.08, 2, 0.12), [mat("#E8ECF2"), mat("#E8ECF2"), mat("#E8ECF2"), mat("#E8ECF2"), schildMat, mat("#C9D0DA")]);
    tafel.position.set(0, 3.15, 0);
    tafel.castShadow = true;
    s.add(tafel);
    const plMat = new THREE.MeshStandardMaterial({ map: T.platte(`${d} m`), roughness: 0.5 });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.75), plMat);
    pl.position.set(0, 1.25, 0.05);
    s.add(pl);
    s.position.set(xr + 1.6, 0, d);
    s.rotation.x = -0.18; // leicht zurückgeneigt, damit es aus der Vogelperspektive lesbar bleibt
    s.scale.setScalar(1.25);
    g.add(s);
  }

  const lichter = [];
  if (baustelle) {
    // Leitbaken entlang der Trennlinie hinter der Engstelle
    const bakeMat = new THREE.MeshStandardMaterial({ map: T.bake, roughness: 0.55 });
    const bakeGeo = new THREE.BoxGeometry(0.06, 1.0, 0.3);
    bakeGeo.translate(0, 0.75, 0);
    const fussGeo = rb(0.5, 0.18, 0.6, 0.06);
    const pos = [];
    for (let z = -6; z > -nach; z -= 7.5) pos.push(V(0.55, 0, z));
    const bm = instanzen(bakeGeo, [mat("#FFFFFF"), mat("#FFFFFF"), mat("#FFFFFF"), mat("#FFFFFF"), bakeMat, bakeMat], pos);
    // Box-Material-Reihenfolge: +x, −x, +y, −y, +z, −z → Streifen vorn und hinten
    bm.material = [bakeMat, bakeMat, mat("#FFFFFF"), mat("#FFFFFF"), bakeMat, bakeMat];
    g.add(bm);
    g.add(instanzen(fussGeo, mat("#2A2F3A", { rau: 0.8 }), pos));
    pos.forEach((p, i) => lichter.push({ pos: V(p.x, 1.38, p.z), i, art: "lauf" }));

    // Fahrbare Absperrtafel im endenden Streifen
    const at = new THREE.Group();
    const anh = new THREE.Mesh(rb(2.6, 0.5, 2.2, 0.12), mat("#F4F1EA"));
    anh.position.y = 0.35;
    at.add(anh);
    [-0.9, 0.9].forEach((x) => {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 18), mat("#2A2F3A", { rau: 0.8 }));
      r.rotation.z = Math.PI / 2;
      r.position.set(x * 1.35, 0.34, 0.2);
      at.add(r);
    });
    const tafelMat = new THREE.MeshStandardMaterial({ map: T.tafel, roughness: 0.5 });
    const tafel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.1, 0.12), [mat("#E8ECF2"), mat("#E8ECF2"), mat("#E8ECF2"), mat("#E8ECF2"), tafelMat, mat("#D0D6DF")]);
    tafel.position.set(0, 2.05, 0);
    at.add(tafel);
    const rahmen = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 0.16), mat("#F4F1EA"));
    rahmen.position.set(0, 3.15, 0);
    at.add(rahmen);
    at.traverse((k) => { if (k.isMesh) { k.castShadow = true; k.receiveShadow = true; } });
    at.position.set(spur * 0.5 + 0.2, 0.06, -3.2);
    at.rotation.x = -0.08;
    g.add(at);
    [[-1.45, 3.35], [1.45, 3.35], [-1.45, 0.95], [1.45, 0.95]].forEach(([x, y], i) => {
      lichter.push({ pos: V(at.position.x + x, y + 0.06, at.position.z + 0.12), i, art: "blink", gross: true });
    });

    // Leitkegel vor der Tafel und am Rand
    const kegel = [];
    for (let k = 0; k < 5; k++) kegel.push(V(spur * 0.5 + 1.7 - k * 0.0, 0, -6.5 - k * 5));
    for (let k = 0; k < 4; k++) kegel.push(V(xr - 0.5, 0, -1 - k * 6));
    g.add(leitkegelInstanzen(kegel));

    // Baumaschinen und Material im gesperrten Streifen
    const bagger = baggerModell();
    bagger.position.set(spur * 0.5 + 1.2, 0.06, -72);
    bagger.rotation.y = 0.5;
    g.add(bagger);
    const walze = walzeModell();
    walze.position.set(spur * 0.5 + 1.1, 0.06, -140);
    g.add(walze);
    const haufen = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.3, 20), mat("#D9B98A", { rau: 1 }));
    haufen.position.set(spur * 0.5 + 1.3, 0.7, -100);
    haufen.scale.set(1, 1, 1.5);
    haufen.castShadow = true;
    haufen.receiveShadow = true;
    g.add(haufen);
    const cont = new THREE.Mesh(rb(2.3, 2.3, 5.5, 0.15), mat("#FF7A1A", { rau: 0.6 }));
    cont.position.set(xr + 4.6, 0, -40);
    cont.castShadow = true;
    cont.receiveShadow = true;
    g.add(cont);
  }

  // Warnleuchten: ein InstancedMesh, Farbe je Instanz (HDR für Bloom)
  let warn = null;
  if (lichter.length) {
    const geo = new THREE.SphereGeometry(0.16, 12, 8);
    warn = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), lichter.length);
    warn.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(lichter.length * 3), 3);
    lichter.forEach((l, i) => {
      _q.identity();
      const s = l.gross ? 1.9 : 1;
      _s.set(s, s, s);
      _m.compose(l.pos, _q, _s);
      warn.setMatrixAt(i, _m);
    });
    g.add(warn);
  }
  const gelb = new THREE.Color("#FFB627");
  const tmp = new THREE.Color();
  function update(t) {
    if (!warn) return;
    const n = lichter.filter((l) => l.art === "lauf").length;
    lichter.forEach((l, i) => {
      let h;
      if (l.art === "blink") h = (Math.floor(t * 2.2 + (l.i % 2) * 0.5) % 2 === 0) ? 1 : 0.12;
      else {
        // Lauflicht in Fahrtrichtung (Richtung Baustellenende)
        const ph = ((t * 14 - l.i) % 14 + 14) % 14;
        h = ph < 1.4 ? 1 : 0.1;
        if (l.i > n) h = 0.1;
      }
      tmp.copy(gelb).multiplyScalar(0.25 + h * 5.5);
      warn.setColorAt(i, tmp);
    });
    warn.instanceColor.needsUpdate = true;
  }
  return { gruppe: g, update, xl, xr, spur };
}

// ---------------------------------------------------------------- Leitkegel
export function leitkegelInstanzen(punkte) {
  const g = new THREE.Group();
  const kegel = new THREE.ConeGeometry(0.22, 0.75, 16);
  kegel.translate(0, 0.42, 0);
  const band = new THREE.CylinderGeometry(0.135, 0.165, 0.12, 16);
  band.translate(0, 0.45, 0);
  const fuss = rb(0.5, 0.06, 0.5, 0.03, 1);
  g.add(instanzen(kegel, mat("#FF6A1A", { rau: 0.5 }), punkte));
  g.add(instanzen(band, mat("#FFFFFF", { rau: 0.4 }), punkte));
  g.add(instanzen(fuss, mat("#FF6A1A", { rau: 0.6 }), punkte));
  return g;
}

function baggerModell() {
  const g = new THREE.Group();
  const gelb = mat("#FFC21A", { rau: 0.5 });
  const dunkel = mat("#2A2F3A", { rau: 0.8 });
  [-1.1, 1.1].forEach((z) => {
    const k = new THREE.Mesh(rb(3.6, 0.8, 0.8, 0.35), dunkel);
    k.position.set(0, 0, z);
    g.add(k);
  });
  const ober = new THREE.Mesh(rb(2.8, 1.2, 2.4, 0.25), gelb);
  ober.position.y = 0.85;
  g.add(ober);
  const kab = new THREE.Mesh(rb(1.3, 1.3, 1.2, 0.2), mat("#3A4766", { rau: 0.2, metall: 0.2 }));
  kab.position.set(0.4, 2.0, -0.5);
  g.add(kab);
  const arm1 = new THREE.Mesh(rb(0.45, 0.45, 3.4, 0.15), gelb);
  arm1.rotation.x = -0.75;
  arm1.position.set(-0.6, 1.6, 0.6);
  g.add(arm1);
  const arm2 = new THREE.Mesh(rb(0.4, 0.4, 2.4, 0.14), gelb);
  arm2.rotation.x = 0.7;
  arm2.position.set(-0.6, 3.6, 2.8);
  g.add(arm2);
  const schaufel = new THREE.Mesh(rb(0.9, 0.6, 0.8, 0.15), dunkel);
  schaufel.position.set(-0.6, 0.1, 4.0);
  g.add(schaufel);
  g.traverse((k) => { if (k.isMesh) { k.castShadow = true; k.receiveShadow = true; } });
  g.add(kontaktSchatten(5.5, 5.5, 0.35));
  return g;
}

function walzeModell() {
  const g = new THREE.Group();
  const gelb = mat("#FFC21A", { rau: 0.5 });
  const walze = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.9, 24), mat("#8C93A3", { rau: 0.35, metall: 0.6 }));
  walze.rotation.z = Math.PI / 2;
  walze.position.set(0, 0.7, -1.2);
  g.add(walze);
  const koerper = new THREE.Mesh(rb(1.8, 1.0, 2.2, 0.25), gelb);
  koerper.position.set(0, 0.45, 0.6);
  g.add(koerper);
  const dach = new THREE.Mesh(rb(1.5, 0.12, 1.4, 0.05), gelb);
  dach.position.set(0, 2.4, 0.7);
  g.add(dach);
  [[-0.65, 0.15], [0.65, 0.15], [-0.65, 1.25], [0.65, 1.25]].forEach(([x, z]) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), mat("#2A2F3A"));
    s.position.set(x, 1.9, z);
    g.add(s);
  });
  g.traverse((k) => { if (k.isMesh) { k.castShadow = true; k.receiveShadow = true; } });
  g.add(kontaktSchatten(3.2, 4.2, 0.32));
  return g;
}

// ---------------------------------------------------------------- Fahrzeugflotte
/**
 * Viele Spielzeugautos in einem Durchgang (InstancedMesh je Bauteil). Fahrtrichtung lokal +x.
 * setze(liste): [{x, y?, z, rot, farbe: THREE.Color, bremse: 0..1, schein?: 0..1 (roter Bodenschein), skala?}]
 */
export class Fahrzeugflotte {
  constructor(max = 600, { laenge = 4.5, breite = 2.0 } = {}) {
    this.max = max;
    this.gruppe = new THREE.Group();
    const L = laenge, B = breite;
    const weissStd = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const teil = (geo, material, n = max, schatten = true) => {
      const m = new THREE.InstancedMesh(geo, material, n);
      m.castShadow = schatten;
      m.receiveShadow = false;
      m.frustumCulled = false;
      m.count = 0;
      this.gruppe.add(m);
      return m;
    };
    this.karo = teil(rb(L, 0.78, B, 0.3, 3), weissStd);
    this.karo.receiveShadow = true;
    this.kabine = teil(rb(L * 0.52, 0.66, B * 0.88, 0.26, 3), mat("#2D3A55", { rau: 0.18, metall: 0.25 }));
    this.dach = teil(rb(L * 0.46, 0.1, B * 0.82, 0.05, 1), weissStd.clone());
    const radGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.3, 16);
    radGeo.rotateX(Math.PI / 2);
    this.raeder = teil(radGeo, mat(FARBE.dunkel, { rau: 0.8 }), max * 4);
    const lichtGeo = rb(0.12, 0.2, 0.44, 0.05, 1);
    this.lichter = teil(lichtGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), max * 2, false);
    const T = texturen();
    this.blob = teil(new THREE.PlaneGeometry(L * 1.45, B * 1.9), new THREE.MeshBasicMaterial({ color: "#1A2238", alphaMap: T.blob, transparent: true, opacity: 0.38, depthWrite: false }), max, false);
    this.blob.renderOrder = 1;
    this.schein = teil(new THREE.PlaneGeometry(L * 1.15, B * 1.7), new THREE.MeshBasicMaterial({ color: 0xffffff, alphaMap: T.blob, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), max, false);
    this.schein.renderOrder = 2;
    [[this.karo, max], [this.dach, max], [this.lichter, max * 2], [this.schein, max]].forEach(([m, n]) => {
      m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    });
    this.L = L;
    this.B = B;
    this._basis = new THREE.Matrix4();
    this._lok = new THREE.Matrix4();
    this._welt = new THREE.Matrix4();
    this._c = new THREE.Color();
    this.lichtAus = new THREE.Color("#5A1712");
    this.lichtAn = new THREE.Color("#FF2A16");
  }
  setze(liste) {
    const n = Math.min(liste.length, this.max);
    const L = this.L, B = this.B;
    const c = this._c;
    for (let i = 0; i < n; i++) {
      const a = liste[i];
      const sk = a.skala ?? 1;
      _q.setFromAxisAngle(V(0, 1, 0), a.rot);
      _s.set(sk, sk, sk);
      _p.set(a.x, a.y ?? 0.06, a.z);
      this._basis.compose(_p, _q, _s);
      const setz = (mesh, idx, x, y, z) => {
        this._lok.makeTranslation(x, y, z);
        this._welt.multiplyMatrices(this._basis, this._lok);
        mesh.setMatrixAt(idx, this._welt);
      };
      setz(this.karo, i, 0, 0.3, 0);
      setz(this.kabine, i, -L * 0.07, 0.98, 0);
      setz(this.dach, i, -L * 0.07, 1.62, 0);
      this.karo.setColorAt(i, a.farbe);
      this.dach.setColorAt(i, a.farbe);
      const rx = L * 0.3, rz = B * 0.44;
      setz(this.raeder, i * 4, rx, 0.37, rz);
      setz(this.raeder, i * 4 + 1, -rx, 0.37, rz);
      setz(this.raeder, i * 4 + 2, rx, 0.37, -rz);
      setz(this.raeder, i * 4 + 3, -rx, 0.37, -rz);
      const b = a.bremse || 0;
      c.copy(this.lichtAus).lerp(this.lichtAn, Math.min(1, b * 1.4)).multiplyScalar(1 + b * 3.2);
      setz(this.lichter, i * 2, -L / 2 + 0.02, 0.78, B * 0.31);
      setz(this.lichter, i * 2 + 1, -L / 2 + 0.02, 0.78, -B * 0.31);
      this.lichter.setColorAt(i * 2, c);
      this.lichter.setColorAt(i * 2 + 1, c);
      // Bodenschatten und roter Bremsschein hinter dem Auto
      this._lok.makeRotationX(-Math.PI / 2);
      this._lok.setPosition(0, 0.012, 0);
      this._welt.multiplyMatrices(this._basis, this._lok);
      this.blob.setMatrixAt(i, this._welt);
      this._lok.setPosition(-L * 0.58, 0.02, 0);
      this._welt.multiplyMatrices(this._basis, this._lok);
      this.schein.setMatrixAt(i, this._welt);
      c.copy(this.lichtAn).multiplyScalar(b * b * 1.1 * (a.schein ?? 1));
      this.schein.setColorAt(i, c);
    }
    this.karo.count = this.kabine.count = this.dach.count = this.blob.count = this.schein.count = n;
    this.raeder.count = n * 4;
    this.lichter.count = n * 2;
    for (const m of [this.karo, this.kabine, this.dach, this.raeder, this.lichter, this.blob, this.schein]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
}

// ---------------------------------------------------------------- Trajektorien
/**
 * Abspieler für 30-Hz-Trajektorien (Format von pipeline/sim/auswertung_reissverschluss.mjs).
 * fahrzeuge(tau, fn): ruft fn({id, h, x, s, v, bremse, gier}) für jedes Fahrzeug, das zur Datenzeit tau (s) existiert.
 * Werte zwischen zwei Bildern werden linear interpoliert; Standzittern (±0,1 m) wird geglättet.
 */
export class Trajektorie {
  constructor(daten) {
    this.daten = daten;
    this.meta = daten.meta;
    this.fps = daten.meta.fps || 30;
    this.bilder = daten.meta.frames;
    this.dauer = (this.bilder - 1) / this.fps;
    this.fz = daten.fahrzeuge.map((f) => {
      // Stillstand glätten: bei v = 0 Position des Haltepunkts festhalten
      const x = f.x.slice();
      for (let i = 1; i < x.length; i++) if (f.v[i] === 0 && f.v[i - 1] === 0 && Math.abs(x[i] - x[i - 1]) < 0.25) x[i] = x[i - 1];
      return { ...f, x, n: x.length };
    });
    this.stau = daten.staulaenge;
  }
  /** Wert einer Bild-Reihe (z. B. staulaenge.rueckstau_m) zur Datenzeit tau */
  reihe(werte, tau) {
    const fi = Math.max(0, Math.min(werte.length - 1, tau * this.fps));
    const i = Math.floor(fi), u = fi - i;
    return werte[i] + ((werte[Math.min(werte.length - 1, i + 1)] ?? werte[i]) - werte[i]) * u;
  }
  fahrzeuge(tau, fn) {
    const fi = Math.max(0, Math.min(this.bilder - 1, tau * this.fps));
    for (const f of this.fz) {
      const k = fi - f.f;
      if (k < 0 || k > f.n - 1) continue;
      const i = Math.floor(k), u = k - i;
      const j = Math.min(f.n - 1, i + 1);
      const x = f.x[i] + (f.x[j] - f.x[i]) * u;
      const s = f.s[i] + (f.s[j] - f.s[i]) * u;
      const v = f.v[i] + (f.v[j] - f.v[i]) * u;
      // Bremsen: Verzögerung in den letzten 0,5 s (mit Nachleuchten), Stillstand = Bremse gehalten
      let verz = 0;
      for (let q = Math.max(1, i - 15); q <= i; q++) {
        const a = (f.v[q] - f.v[Math.max(0, q - 3)]) / 0.1;
        if (a < 0) verz = Math.max(verz, (-a / 6) * (1 - (i - q) / 18));
      }
      let bremse = Math.min(1, verz);
      if (v < 0.4) bremse = Math.max(bremse, 0.62);
      // Gierwinkel beim Spurwechsel aus der Querbewegung
      const i0 = Math.max(0, i - 4), i1 = Math.min(f.n - 1, i + 4);
      const dx = f.x[i1] - f.x[i0];
      const ds = f.s[i1] - f.s[i0];
      const gier = dx > 0.05 ? Math.atan2(ds * SPUR, dx) : 0;
      fn({ id: f.id, h: f.h, x, s, v, bremse, gier });
    }
  }
}
