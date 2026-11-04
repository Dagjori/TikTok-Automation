// Stil 17 „Nachtstadt-Miniatur“ (nur Simulierbar, Skill .claude/skills/simulierbar-video/stile.md):
// Stadtmodell zur blauen Stunde nach einem Regenschauer: erleuchtete Fenster, Laternen mit Lichtkegel und Lichtfleck,
// nasser Asphalt mit echter Spiegelung (sim_atmosphaere.spiegelBoden), Autos mit Scheinwerfern, Lichtspuren in
// Teamfarbe (Langzeitbelichtung = Weg eines Teams), Parkhaus, ferne Skyline im Dunst. Alles prozedural.
//
//   fassadenAtlas()                                                                 gemeinsame Fassade + Leuchtkarte (ein Material)
//   const h = gebaeude({ breite: 2, hoehe: 4, tiefe: 2, seed: 3 }); szene.add(h)    Wohn-/Bürohaus mit Dachdetails
//   const s = strassenBoden({ breite: 60, tiefe: 60, strassen: [{x:0, richtung:"z", breite:2.2}] })
//   const l = laterne({ hoehe: 1.5 }); l.position.set(x, 0, z)                        Mast, Leuchte, Kegel, Lichtfleck
//   const a = autoNacht({ farbe: TEAM_A }); a.position.set(…); a.rotation.y = …       Lack mit Spiegelung, Scheinwerfer
//   const sp = lichtSpur(kurve, { farbe: TEAM_A }); sp.setze(kopf, schweif)           Lichtspur entlang einer Kurve
//   const p = parkhaus({ etagen: 4, akzent: TEAM_B })                                 offenes Parkdeck mit Lichtbändern
//   const f = skyline({ anzahl: 40, radius: 30 })                                     ferne Silhouette (instanziert)
//   szene.background = himmelNacht()
// Nach dem Aufbau: bewegte Objekte mit userData.dynamisch = true markieren, dann buendeln(szene) (sim_atmosphaere.js).
// Maßstab: 1 Einheit ≈ 4 m (Miniatur, Tilt-Shift). Team-Identität über Lack, Lichtspur und LED-Kanten, nie Gelb.
import * as THREE from "three";
import { rundeBox } from "./bausteine.js";
import { lichtKegel, lichtPfuetze, leuchtMat, glimmLinie } from "./sim_atmosphaere.js";
import { verlauf } from "./licht.js";

const zufall = (seed) => { let s = (seed * 2654435761) % 4294967296; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; };

/**
 * Fassaden-Atlas für alle Gebäude (ein Material für die ganze Stadt → buendeln() fasst alles zu einem Mesh zusammen).
 * 128 × 128 Fensterzellen à 16 px; Zeilen (von unten) 0–7 Dachfläche, darüber vier Bänder mit 25/40/55/70 % Licht.
 */
let atlas = null;
export function fassadenAtlas() {
  if (atlas) return atlas;
  const N = 128, P = 16, S = N * P;
  const mk = () => { const c = document.createElement("canvas"); c.width = c.height = S; return c; };
  const cf = mk(), cl = mk();
  const f = cf.getContext("2d"), l = cl.getContext("2d");
  const r = zufall(77);
  f.fillStyle = "#8A9099"; f.fillRect(0, 0, S, S);
  l.fillStyle = "#000"; l.fillRect(0, 0, S, S);
  for (let i = 0; i < 60000; i++) { f.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${0.03 + r() * 0.05})`; f.fillRect(r() * S, r() * S, 1 + r() * 3, 1 + r() * 3); }
  const warm = ["#FFB86B", "#FFC98A", "#FFD7A6", "#FFE2BC", "#FFAE5C", "#FFC07A"], kalt = ["#9CC3FF", "#BCD6FF", "#DDE8FF"];
  for (let zeileOben = 0; zeileOben < N; zeileOben++) {
    const zeile = N - 1 - zeileOben;
    const y = zeileOben * P;
    if (zeile < 8) { // Dach: Kies, Bitumenbahnen
      f.fillStyle = "#5A5F68"; f.fillRect(0, y, S, P);
      for (let i = 0; i < 300; i++) { f.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${0.05 + r() * 0.08})`; f.fillRect(r() * S, y + r() * P, 2, 2); }
      continue;
    }
    const anteil = [0.25, 0.4, 0.55, 0.7][Math.min(3, Math.floor((zeile - 8) / 30))];
    for (let x = 0; x < N; x++) {
      const fx = x * P + P * 0.2, fy = y + P * 0.22, fw = P * 0.6, fh = P * 0.56;
      f.fillStyle = "#3A3F48"; f.fillRect(fx - 1, fy - 1, fw + 2, fh + 2);
      f.fillStyle = "#222935"; f.fillRect(fx, fy, fw, fh);
      if (r() > anteil * (0.7 + 0.6 * r())) continue;
      const farbe = r() < 0.16 ? kalt[Math.floor(r() * kalt.length)] : warm[Math.floor(r() * warm.length)];
      l.globalAlpha = 0.35 + r() * 0.65;
      l.fillStyle = farbe; l.fillRect(fx, fy, fw, fh);
      l.globalAlpha = 0.45; l.fillStyle = "#000"; l.fillRect(fx, fy + fh * 0.65, fw, fh * 0.35);
      if (r() < 0.3) { l.globalAlpha = 0.55; l.fillRect(fx + (r() < 0.5 ? 0 : fw * 0.5), fy, fw * 0.5, fh); }
      l.globalAlpha = 1;
      f.fillStyle = "#5A4E3E"; f.fillRect(fx, fy, fw, fh);
    }
  }
  const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };
  atlas = { N, karte: tex(cf), leucht: tex(cl) };
  atlas.material = new THREE.MeshStandardMaterial({ map: atlas.karte, emissiveMap: atlas.leucht, emissive: "#FFFFFF", emissiveIntensity: 2.6, roughness: 0.8, metalness: 0, vertexColors: true });
  return atlas;
}

/** Fassade (Farbe + Leuchtkarte) für ein einzelnes Objekt: Ausschnitt aus dem Atlas als eigene Texturen (selten nötig) */
export function fensterTextur() { const a = fassadenAtlas(); return { karte: a.karte, leucht: a.leucht }; }

const farbeLinear = (hex) => new THREE.Color(hex);

/**
 * Gebäude mit Fensterfassade (Atlas), Dachrand, Dachaufbauten, Oberlichtern, optional Laden im Erdgeschoss.
 * Maße werden auf ganze Fenster/Etagen gerundet. Unterkante y = 0. Alle Gebäude teilen ein Material → buendeln().
 */
export function gebaeude({ breite = 2, hoehe = 4, tiefe = 2, seed = 1, fassade = "#2B313D", dach = "#454B55", anteilAn = 0.5, etagenHoehe = 0.3, fensterBreite = 0.32, schatten = true, laden = true, warnlicht = false, oberlicht = 0.5 } = {}) {
  const A = fassadenAtlas();
  const g = new THREE.Group();
  const r = zufall(seed + 3);
  const c = Math.max(2, Math.round(breite / fensterBreite)), d = Math.max(2, Math.round(tiefe / fensterBreite)), e = Math.max(2, Math.round(hoehe / etagenHoehe));
  breite = c * fensterBreite; tiefe = d * fensterBreite; hoehe = e * etagenHoehe;
  const geo = new THREE.BoxGeometry(breite, hoehe, tiefe);
  const uv = geo.attributes.uv;
  const band = Math.min(3, Math.max(0, Math.round((anteilAn - 0.25) / 0.15)));
  const spalten = [d, d, 0, 0, c, c];
  for (let face = 0; face < 6; face++) {
    const dachFlaeche = face === 2 || face === 3;
    const cc = dachFlaeche ? 6 : spalten[face], rr = dachFlaeche ? 6 : e;
    const ox = Math.floor(r() * (A.N - cc));
    const unten = dachFlaeche ? 1 : 8 + band * 30;
    const oy = dachFlaeche ? unten : Math.min(A.N - rr, unten + Math.floor(r() * Math.max(1, 30 - Math.min(rr, 30))));
    for (let k = 0; k < 4; k++) {
      const i = face * 4 + k;
      uv.setXY(i, (ox + uv.getX(i) * cc) / A.N, (oy + uv.getY(i) * rr) / A.N);
    }
  }
  const fc = farbeLinear(fassade), dc = farbeLinear(dach);
  const col = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < geo.attributes.position.count; i++) { const f = Math.floor(i / 4) === 2 || Math.floor(i / 4) === 3 ? dc : fc; col.set([f.r, f.g, f.b], i * 3); }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const box = new THREE.Mesh(geo, A.material);
  box.position.y = hoehe / 2;
  box.castShadow = schatten; box.receiveShadow = true;
  g.add(box);
  const rand = gemeinsamMat("rand", () => new THREE.MeshStandardMaterial({ color: "#3A404C", roughness: 0.75 }));
  for (const [w, dd, x, z] of [[breite + 0.04, 0.05, 0, tiefe / 2], [breite + 0.04, 0.05, 0, -tiefe / 2], [0.05, tiefe, breite / 2, 0], [0.05, tiefe, -breite / 2, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, dd), rand);
    m.position.set(x, hoehe + 0.035, z);
    g.add(m);
  }
  const aufbau = gemeinsamMat("aufbau", () => new THREE.MeshStandardMaterial({ color: "#596070", roughness: 0.55, metalness: 0.4 }));
  const n = 2 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const w = 0.15 + r() * 0.35, dd = 0.15 + r() * 0.3, hh = 0.08 + r() * 0.2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, dd), aufbau);
    m.position.set((r() - 0.5) * (breite - w - 0.15), hoehe + hh / 2, (r() - 0.5) * (tiefe - dd - 0.15));
    m.castShadow = schatten;
    g.add(m);
  }
  if (r() < oberlicht) { // Oberlichter: warmes Licht von unten, wirkt aus der Vogelperspektive
    const ol = leuchtMat("#FFCF96", 1.6);
    for (let i = 0; i < 1 + Math.floor(r() * 3); i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16 + r() * 0.2, 0.12 + r() * 0.14), ol);
      m.rotation.x = -Math.PI / 2;
      m.position.set((r() - 0.5) * (breite - 0.5), hoehe + 0.004, (r() - 0.5) * (tiefe - 0.5));
      g.add(m);
    }
  }
  if (laden) {
    const bandM = new THREE.Mesh(new THREE.PlaneGeometry(breite * 0.86, etagenHoehe * 0.55), leuchtMat("#FFC98A", 1.8));
    bandM.position.set(0, etagenHoehe * 0.42, tiefe / 2 + 0.005);
    g.add(bandM);
    const p = lichtPfuetze({ radius: breite * 0.42, farbe: "#FFB86B", staerke: 0.35, streckung: 0.55 });
    p.position.set(0, 0.012, tiefe / 2 + 0.35);
    g.add(p);
  }
  if (warnlicht) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), leuchtMat("#FF3B30", 6));
    w.position.set(breite / 2 - 0.1, hoehe + 0.12, tiefe / 2 - 0.1);
    g.add(w);
  }
  g.userData = { breite, hoehe, tiefe };
  return g;
}

const matSpeicher = new Map();
function gemeinsamMat(key, bau) { if (!matSpeicher.has(key)) matSpeicher.set(key, bau()); return matSpeicher.get(key); }

/** Asphaltboden mit Straßen (Markierungen, Bordsteine, Gehwege). strassen: [{x|z, richtung:"x"|"z", breite}] */
export function strassenBoden({ breite = 60, tiefe = 60, strassen = [], aufloesung = 2048, asphalt = "#1A1D23", gehweg = "#3A3F48", seed = 2 } = {}) {
  const c = document.createElement("canvas");
  c.width = aufloesung; c.height = aufloesung;
  const g = c.getContext("2d");
  const s = aufloesung / breite, sz = aufloesung / tiefe;
  const r = zufall(seed);
  g.fillStyle = gehweg; g.fillRect(0, 0, aufloesung, aufloesung);
  // Gehwegplatten
  g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 1;
  for (let x = 0; x < aufloesung; x += s * 0.25) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, aufloesung); g.stroke(); }
  for (let y = 0; y < aufloesung; y += sz * 0.25) { g.beginPath(); g.moveTo(0, y); g.lineTo(aufloesung, y); g.stroke(); }
  const px = (x) => (x + breite / 2) * s, pz = (z) => (z + tiefe / 2) * sz;
  for (const st of strassen) {
    const b = st.breite ?? 2.2;
    g.fillStyle = asphalt;
    if (st.richtung === "z") g.fillRect(px(st.x - b / 2), 0, b * s, aufloesung);
    else g.fillRect(0, pz(st.z - b / 2), aufloesung, b * sz);
  }
  for (let i = 0; i < 26000; i++) { // Körnung, Flicken, Nässe-Flecken
    const x = r() * aufloesung, y = r() * aufloesung;
    g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${0.03 + r() * 0.05})`;
    g.fillRect(x, y, 1 + r() * 2, 1 + r() * 2);
  }
  for (const st of strassen) { // Markierungen
    const b = st.breite ?? 2.2;
    g.fillStyle = "rgba(225,228,235,0.75)";
    const lang = st.richtung === "z";
    for (let k = -breite / 2; k < breite / 2; k += 0.9) {
      if (lang) g.fillRect(px(st.x) - 1.5, pz(k), 3, 0.45 * sz); else g.fillRect(px(k), pz(st.z) - 1.5, 0.45 * s, 3);
    }
    g.fillStyle = "rgba(225,228,235,0.5)";
    if (lang) { g.fillRect(px(st.x - b / 2 + 0.08), 0, 2, aufloesung); g.fillRect(px(st.x + b / 2 - 0.08), 0, 2, aufloesung); }
    else { g.fillRect(0, pz(st.z - b / 2 + 0.08), aufloesung, 2); g.fillRect(0, pz(st.z + b / 2 - 0.08), aufloesung, 2); }
  }
  // Zebrastreifen an Kreuzungen
  const zs = strassen.filter((a) => a.richtung === "z"), xs = strassen.filter((a) => a.richtung === "x");
  g.fillStyle = "rgba(230,232,238,0.7)";
  for (const a of zs) for (const b of xs) {
    const bb = b.breite ?? 2.2, ba = a.breite ?? 2.2;
    for (const seite of [-1, 1]) for (let k = -ba / 2 + 0.15; k < ba / 2 - 0.1; k += 0.26) g.fillRect(px(a.x + k), pz(b.z + seite * (bb / 2 + 0.25)) - 0.2 * sz, 0.13 * s, 0.4 * sz);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(breite, tiefe), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.0 }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  const gruppe = new THREE.Group();
  gruppe.add(m);
  // Bordsteine
  const bord = new THREE.MeshStandardMaterial({ color: "#5A606B", roughness: 0.7 });
  for (const st of strassen) {
    const b = st.breite ?? 2.2;
    for (const seite of [-1, 1]) {
      const k = new THREE.Mesh(new THREE.BoxGeometry(st.richtung === "z" ? 0.06 : breite, 0.04, st.richtung === "z" ? tiefe : 0.06), bord);
      if (st.richtung === "z") k.position.set(st.x + seite * b / 2, 0.02, 0); else k.position.set(0, 0.02, st.z + seite * b / 2);
      k.receiveShadow = true;
      gruppe.add(k);
    }
  }
  return gruppe;
}

/** Straßenlaterne: Mast, Ausleger, Leuchte (HDR), Lichtkegel und Lichtfleck. Ausleger zeigt nach +x. */
export function laterne({ hoehe = 1.45, arm = 0.32, farbe = "#FFC07A", kegel = 0.26, pfuetze = 0.65, radius = 0.95 } = {}) {
  const g = new THREE.Group();
  const metall = gemeinsamMat("laterne", () => new THREE.MeshStandardMaterial({ color: "#2A2E36", roughness: 0.45, metalness: 0.7 }));
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, hoehe, 10), metall);
  mast.position.y = hoehe / 2; mast.castShadow = true;
  const a = new THREE.Mesh(new THREE.BoxGeometry(arm, 0.018, 0.018), metall);
  a.position.set(arm / 2, hoehe - 0.01, 0);
  const kopf = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.07), metall);
  kopf.position.set(arm, hoehe - 0.02, 0);
  const lampe = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.05), leuchtMat(farbe, 9));
  lampe.rotation.x = Math.PI / 2;
  lampe.position.set(arm, hoehe - 0.04, 0);
  g.add(mast, a, kopf, lampe);
  if (kegel > 0) {
    const k = lichtKegel({ hoehe: hoehe - 0.04, radiusOben: 0.05, radiusUnten: radius * 0.85, farbe, staerke: kegel, weich: 1.4 });
    k.position.set(arm, hoehe - 0.04, 0);
    g.add(k);
  }
  if (pfuetze > 0) {
    const p = lichtPfuetze({ radius, farbe, staerke: pfuetze });
    p.position.set(arm, 0.014, 0);
    g.add(p);
  }
  return g;
}

/**
 * Auto (Front nach +x): Lack mit Spiegelung, dunkle Scheiben, Scheinwerfer und Rücklichter (HDR),
 * optional Lichtkegel auf der Straße vor dem Auto. laenge in Einheiten (≈ 0,9 = Kleinwagen).
 */
export function autoNacht({ farbe = "#3A4250", laenge = 0.9, scheinwerfer = true, rueck = true, glanz = 0.3 } = {}) {
  const g = new THREE.Group();
  const lack = gemeinsamMat(`lack|${farbe}|${glanz}`, () => new THREE.MeshStandardMaterial({ color: farbe, roughness: glanz, metalness: 0.45, envMapIntensity: 1.4 }));
  const glas = gemeinsamMat("autoglas", () => new THREE.MeshStandardMaterial({ color: "#0B0F16", roughness: 0.08, metalness: 0.9, envMapIntensity: 1.6 }));
  const b = laenge, br = laenge * 0.46;
  const unten = rundeBox(b, b * 0.2, br, { material: lack, radius: b * 0.05 });
  unten.position.y = b * 0.07;
  const kabine = rundeBox(b * 0.55, b * 0.17, br * 0.88, { material: glas, radius: b * 0.05 });
  kabine.position.set(-b * 0.06, b * 0.26, 0);
  const dach = rundeBox(b * 0.46, b * 0.03, br * 0.82, { material: lack, radius: b * 0.015 });
  dach.position.set(-b * 0.07, b * 0.42, 0);
  g.add(unten, kabine, dach);
  const rad = gemeinsamMat("rad", () => new THREE.MeshStandardMaterial({ color: "#0A0B0D", roughness: 0.8 }));
  for (const [x, z] of [[b * 0.3, br / 2], [-b * 0.3, br / 2], [b * 0.3, -br / 2], [-b * 0.3, -br / 2]]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(b * 0.1, b * 0.1, b * 0.08, 16), rad);
    r.rotation.x = Math.PI / 2; r.position.set(x, b * 0.1, z * 0.98);
    g.add(r);
  }
  if (scheinwerfer) {
    for (const z of [-br * 0.32, br * 0.32]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(b * 0.1, b * 0.045), leuchtMat("#F4F7FF", 14));
      s.rotation.y = Math.PI / 2; s.position.set(b / 2 + 0.003, b * 0.17, z);
      g.add(s);
    }
    const p = lichtPfuetze({ radius: b * 0.75, farbe: "#E8EEFF", staerke: 0.55, streckung: 0.6, exponent: 1.6 });
    p.position.set(b * 1.05, 0.013, 0);
    g.add(p);
  }
  if (rueck) {
    for (const z of [-br * 0.34, br * 0.34]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(b * 0.1, b * 0.035), leuchtMat("#FF2A22", 7));
      s.rotation.y = -Math.PI / 2; s.position.set(-b / 2 - 0.003, b * 0.18, z);
      g.add(s);
    }
    const p = lichtPfuetze({ radius: b * 0.35, farbe: "#FF3A2A", staerke: 0.3, streckung: 0.8 });
    p.position.set(-b * 0.62, 0.013, 0);
    g.add(p);
  }
  g.traverse((k) => { if (k.isMesh && k.material.isMeshStandardMaterial) { k.castShadow = true; } });
  return g;
}

/**
 * Lichtspur (Langzeitbelichtung) entlang einer Kurve: zwei gekreuzte Bänder, HDR-Farbe, Kopf und Schweif.
 * setze(kopf, schweif): kopf/schweif als Anteil der Kurve (0–1); schweif = 1 zeigt die ganze bisherige Spur.
 */
export function lichtSpur(kurve, { farbe = "#FF8A3D", breite = 0.06, hoehe = 0.1, staerke = 5, segmente = 600, kopfGlanz = 2.5 } = {}) {
  const pos = [], s = [], idx = [];
  const punkte = kurve.getSpacedPoints(segmente);
  const auf = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= segmente; i++) {
    const p = punkte[i];
    const tan = punkte[Math.min(segmente, i + 1)].clone().sub(punkte[Math.max(0, i - 1)]).normalize();
    const seite = new THREE.Vector3().crossVectors(tan, auf).normalize().multiplyScalar(breite / 2);
    const u = i / segmente;
    // Band 1 (waagerecht), Band 2 (senkrecht)
    pos.push(p.x - seite.x, hoehe, p.z - seite.z, p.x + seite.x, hoehe, p.z + seite.z);
    pos.push(p.x, hoehe - breite / 2, p.z, p.x, hoehe + breite / 2, p.z);
    s.push(u, -1, u, 1, u, -1, u, 1);
    if (i < segmente) {
      const a = i * 4, b = (i + 1) * 4;
      idx.push(a, a + 1, b, a + 1, b + 1, b, a + 2, a + 3, b + 2, a + 3, b + 3, b + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("spur", new THREE.Float32BufferAttribute(s, 2));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe) }, staerke: { value: staerke }, kopf: { value: 0 }, schweif: { value: 1 }, kopfGlanz: { value: kopfGlanz } },
    vertexShader: `attribute vec2 spur; varying vec2 vS; void main(){ vS = spur; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 farbe; uniform float staerke, kopf, schweif, kopfGlanz; varying vec2 vS;
      void main() {
        if (vS.x > kopf) discard;
        float alt = (kopf - vS.x) / max(schweif, 1e-4);
        float a = clamp(1.0 - alt, 0.0, 1.0); a = a * a * (0.35 + 0.65 * a) + 0.12 * step(alt, 1.0);
        float q = 1.0 - abs(vS.y); q = pow(q, 1.5);
        float k = exp(-pow((kopf - vS.x) * 160.0, 2.0)) * kopfGlanz;
        vec3 c = mix(farbe, vec3(1.0), 0.25 * q) * staerke * (a + k) * q;
        gl_FragColor = vec4(c, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  m.renderOrder = 8;
  m.setze = (kopf, schweif = 1) => { mat.uniforms.kopf.value = kopf; mat.uniforms.schweif.value = schweif; };
  m.punkt = (u) => kurve.getPointAt(Math.min(1, Math.max(0, u)));
  return m;
}

/** Offenes Parkhaus: Decks mit Stützen, Lichtbänder unter den Decken, Brüstung mit LED-Kante in Teamfarbe, Schild „P“ */
export function parkhaus({ etagen = 4, breite = 3.6, tiefe = 2.8, etagenHoehe = 0.42, akzent = "#3D8BFF", seed = 4, autos = 0.5 } = {}) {
  const g = new THREE.Group();
  const beton = gemeinsamMat("beton", () => new THREE.MeshStandardMaterial({ color: "#7E8591", roughness: 0.85 }));
  const deck = gemeinsamMat("deck", () => new THREE.MeshStandardMaterial({ color: "#3C414B", roughness: 0.7 }));
  const r = zufall(seed);
  for (let e = 0; e <= etagen; e++) {
    const y = e * etagenHoehe;
    const platte = new THREE.Mesh(new THREE.BoxGeometry(breite, 0.05, tiefe), e === 0 ? deck : beton);
    platte.position.y = y + 0.025;
    platte.castShadow = true; platte.receiveShadow = true;
    g.add(platte);
    if (e > 0) {
      const oben = new THREE.Mesh(new THREE.PlaneGeometry(breite - 0.1, tiefe - 0.1), deck);
      oben.rotation.x = -Math.PI / 2; oben.position.y = y + 0.051;
      oben.receiveShadow = true;
      g.add(oben);
      for (const z of [-tiefe / 2 + 0.03, tiefe / 2 - 0.03]) { // Brüstung
        const b = new THREE.Mesh(new THREE.BoxGeometry(breite, 0.09, 0.04), beton);
        b.position.set(0, y + 0.095, z); b.castShadow = true;
        g.add(b);
        g.add(glimmLinie([-breite / 2, y + 0.142, z * 1.01], [breite / 2, y + 0.142, z * 1.01], { farbe: akzent, staerke: 3.2, dicke: 0.014 }));
      }
    }
    if (e < etagen) { // Lichtbänder unter der Decke und Licht auf dem Deck
      for (let k = -1; k <= 1; k++) {
        const l = new THREE.Mesh(new THREE.PlaneGeometry(breite * 0.8, 0.025), leuchtMat("#E6F0FF", 5));
        l.rotation.x = Math.PI / 2; l.position.set(0, y + etagenHoehe - 0.002, k * tiefe * 0.28);
        g.add(l);
      }
      const p = lichtPfuetze({ radius: breite * 0.48, farbe: "#D6E6FF", staerke: 0.4, streckung: tiefe / breite, exponent: 1.2 });
      p.position.y = y + 0.06;
      g.add(p);
      // geparkte Autos
      for (let k = 0; k < 6; k++) {
        if (r() > autos) continue;
        const a = autoNacht({ farbe: ["#5B6270", "#8A909B", "#2D323B", "#B7BCC6", "#46505F"][Math.floor(r() * 5)], laenge: 0.38, scheinwerfer: false, rueck: false });
        a.rotation.y = Math.PI / 2;
        a.position.set(-breite / 2 + 0.35 + (k % 6) * (breite - 0.7) / 5, y + 0.055, (r() < 0.5 ? -1 : 1) * tiefe * 0.27);
        g.add(a);
      }
    }
    if (e > 0 && e < etagen + 1) for (const x of [-breite / 2 + 0.05, -breite / 6, breite / 6, breite / 2 - 0.05]) for (const z of [-tiefe / 2 + 0.05, tiefe / 2 - 0.05]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, etagenHoehe, 0.06), beton);
      s.position.set(x, y - etagenHoehe / 2, z); s.castShadow = true;
      g.add(s);
    }
  }
  // Treppenhaus mit senkrechtem Lichtband in Teamfarbe und Schild „P“
  const turm = new THREE.Mesh(new THREE.BoxGeometry(0.5, (etagen + 1) * etagenHoehe, 0.5), new THREE.MeshStandardMaterial({ color: "#2E333C", roughness: 0.6 }));
  turm.position.set(breite / 2 + 0.25, ((etagen + 1) * etagenHoehe) / 2, tiefe / 2 - 0.25);
  turm.castShadow = true;
  g.add(turm);
  const band = new THREE.Mesh(new THREE.PlaneGeometry(0.08, (etagen + 0.6) * etagenHoehe), leuchtMat(akzent, 3.2));
  band.position.set(breite / 2 + 0.25, ((etagen + 1) * etagenHoehe) / 2, tiefe / 2 + 0.003);
  g.add(band);
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = "#0E1B33"; x.fillRect(0, 0, 128, 128);
  x.fillStyle = "#FFFFFF"; x.font = "900 104px Inter, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("P", 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const schild = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(akzent).lerp(new THREE.Color("#FFFFFF"), 0.55).multiplyScalar(2.2) }));
  schild.position.set(breite / 2 + 0.25, (etagen + 1) * etagenHoehe - 0.25, tiefe / 2 + 0.005);
  g.add(schild);
  g.userData = { breite, tiefe, hoehe: (etagen + 1) * etagenHoehe, etagenHoehe };
  return g;
}

/** Ferne Skyline (instanziert, Ausschnitt aus dem Fassaden-Atlas), verschwindet im Dunst */
export function skyline({ anzahl = 40, radius = 32, bogen = [Math.PI * 0.9, Math.PI * 2.1], hoehe = [2, 9], seed = 9, mitte = [0, 0] } = {}) {
  const A = fassadenAtlas();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (20 + uv.getX(i) * 6) / A.N, (40 + uv.getY(i) * 26) / A.N);
  const col = new Float32Array(uv.count * 3).fill(0.22);
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const m = new THREE.InstancedMesh(geo, A.material, anzahl);
  const r = zufall(seed);
  const o = new THREE.Object3D();
  for (let i = 0; i < anzahl; i++) {
    const w = bogen[0] + (bogen[1] - bogen[0]) * (i + r() * 0.6) / anzahl;
    const rr = radius * (0.85 + r() * 0.35);
    const h = hoehe[0] + Math.pow(r(), 1.6) * (hoehe[1] - hoehe[0]);
    const b = 1.2 + r() * 1.8;
    o.position.set(mitte[0] + Math.cos(w) * rr, h / 2, mitte[1] + Math.sin(w) * rr);
    o.rotation.y = -w;
    o.scale.set(b, h, b * (0.7 + r() * 0.6));
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
  }
  return m;
}

/** Dunkler Baum (Krone aus wenigen Facetten), für Gehwege */
export function baumNacht({ groesse = 0.5, seed = 1, farbe = "#1E2A24" } = {}) {
  const g = new THREE.Group();
  const r = zufall(seed);
  const stamm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, groesse * 0.6, 6), gemeinsamMat("stamm", () => new THREE.MeshStandardMaterial({ color: "#2A231E", roughness: 0.9 })));
  stamm.position.y = groesse * 0.3;
  g.add(stamm);
  const blatt = gemeinsamMat(`blatt|${farbe}`, () => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.85, flatShading: true }));
  for (let i = 0; i < 4; i++) {
    const k = new THREE.Mesh(new THREE.IcosahedronGeometry(groesse * (0.28 + r() * 0.12), 0), blatt);
    k.position.set((r() - 0.5) * groesse * 0.4, groesse * (0.7 + r() * 0.3), (r() - 0.5) * groesse * 0.4);
    k.castShadow = true;
    g.add(k);
  }
  return g;
}

/** Nachthimmel als Hintergrund: tiefes Blau oben, Petrol am Horizont, warmer Stadtschein */
export function himmelNacht({ oben = "#04070D", mitte = "#0C1626", horizont = "#22324A", schein = "rgba(255,170,110,0.28)", scheinY = 0.62 } = {}) {
  return verlauf([[0, oben], [0.45, mitte], [0.7, horizont], [1, "#141B26"]], { radial: [0.5, scheinY, 0.5, schein] });
}

/** Innenmodul der Wärmepumpe im Heizraum: Warmwasser-Pufferspeicher (Zylinder) mit LED-Ring in Teamfarbe; glimm(0–2), Unterkante y = 0 */
export function speicherTank({ farbe = "#2F8CFF", radius = 0.1, hoehe = 0.4 } = {}) {
  const g = new THREE.Group();
  const mantel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, hoehe, 24), stdMat("tk|mantel", { color: "#E4E9F1", roughness: 0.3, metalness: 0.35 }));
  mantel.position.y = hoehe / 2; mantel.castShadow = true; g.add(mantel);
  const deckel = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.02, radius * 1.02, 0.02, 24), stdMat("tk|deckel", { color: "#9AA3B2", roughness: 0.5, metalness: 0.4 }));
  deckel.position.y = hoehe + 0.01; g.add(deckel);
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(3), fog: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.03, 0.008, 6, 40), ledMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = hoehe * 0.72; g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.03, 0.008, 6, 40), ledMat);
  ring2.rotation.x = Math.PI / 2; ring2.position.y = hoehe * 0.2; g.add(ring2);
  const dispMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#BFE0FF").multiplyScalar(1.6), fog: false });
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.03), dispMat);
  disp.position.set(0, hoehe * 0.46, radius + 0.003); g.add(disp);
  for (const x of [-radius * 0.7, radius * 0.7]) { const rohr = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8), stdMat("tk|rohr", { color: "#B26A3E", roughness: 0.4, metalness: 0.7 })); rohr.position.set(x, hoehe + 0.07, 0); g.add(rohr); }
  g.userData.dynamisch = true;
  g.glimm = (v) => { ledMat.color.set(farbe).multiplyScalar(3 * (0.5 + v)); dispMat.color.set("#BFE0FF").multiplyScalar(1.6 * (0.5 + 0.7 * v)); return g; };
  g.userData.hoehe = hoehe + 0.12;
  return g;
}

// =====================================================================================
// Winternacht-Erweiterung (Heizungs-Videos): Miniatur-Platte im Schnee, Einfamilienhaus mit Heizraum-Einblick,
// Gaskessel alt/neu mit Flamme, Wärmepumpen-Außeneinheit mit Lüfter, Kostensäulen, Förderstapel, Bio-Treppe,
// Energie-/Kostenstrom, Preis-Anhänger, Rauch, Wintertanne. Alle bewegten Teile: userData.dynamisch = true
// (danach buendeln(szene)); Zustand nur über Methoden, jede Methode ist eine reine Funktion des Arguments.
//
//   const p = schneePlatte({ breite: 3.1, tiefe: 3.1, led: TEAM })            Platte mit Schnee, Pfad, LED-Kante (Teamfarbe); p.userData.oben
//   const h = einfamilienhaus({ seed: 2 })                                    Haus (Front +z), Heizraum vorn links; h.punkte, h.kesselHalter
//   const k = gasKessel({ alt: true, farbe: GAS }); h.kesselHalter.add(k)     k.flamme(0–1), k.glimm(0–1)
//   const w = waermepumpeAussen({ farbe: WP })                                w.lauf(t, tempo), w.led(0–1.6), w.setze(0–1)
//   const s = kostenSaeule({ breite: 0.3, farbe, tick: 0.5 })                 s.hoehe(h), s.setze(0–1), s.puls(0–1)
//   const f = foerderStapel({ farbe: "#ECE6DA", akzent: WP })                 f.setze(0–1), f.glimm(0–1)
//   const b = bioTreppe({ farbe: GAS })                                       b.stufe(i, 0–1), b.puls(i, 0–1)
//   const e = energieFluss({ punkte, farbe, radius })                         e.setze(0–1), e.lauf(t, tempo), e.breite(radius)
//   const a = preisAnhaenger({ farbe })                                       a.text("10.000 €"), a.setze(0–1), a.glimm(0–1)
//   const r = rauchSaeule({ hoehe: 0.9 })                                     r.lauf(t, staerke)
//   const d = abstandsAnzeige({ farbeL, farbeR })                             d.laenge(links, rechts), d.setze(0–1)
//   const t = winterBaum({ groesse: 0.8, seed: 3 }); speicherTank({ farbe })  Tanne; Pufferspeicher der Wärmepumpe
const schneeFarbe = "#DCE6F4";
const putzTextur = (() => {
  let tex = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d"), r = zufall(31);
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${0.03 + r() * 0.06})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2); }
    tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return tex;
  };
})();
const schneeTextur = (() => {
  let tex = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d"), r = zufall(53);
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${r() < 0.55 ? "150,175,215" : "255,255,255"},${0.05 + r() * 0.09})`; const s = 1 + r() * 4; g.fillRect(r() * 256, r() * 256, s, s * 0.7); }
    tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 3); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return tex;
  };
})();
const stdMat = (key, opt) => gemeinsamMat(key, () => new THREE.MeshStandardMaterial(opt));

/** Miniatur-Platte mit Schneedecke, Schneehügeln, geräumtem Pfad und LED-Kante in Teamfarbe. Oberkante der Decke: userData.oben (y). */
export function schneePlatte({ breite = 3.1, tiefe = 3.1, dicke = 0.2, seed = 5, led = "#FF5A1F", pfadX = 0, pfadBreite = 0.5, pfadAb = 0.5 } = {}) {
  const g = new THREE.Group();
  const r = zufall(seed);
  const rand = stdMat("pl|rand", { color: "#252D3B", roughness: 0.62, metalness: 0.15 });
  const schnee = stdMat("pl|schnee", { color: schneeFarbe, map: schneeTextur(), roughness: 0.92, metalness: 0 });
  const sockel = rundeBox(breite, dicke, tiefe, { material: rand, radius: 0.045 });
  sockel.castShadow = true; sockel.receiveShadow = true;
  g.add(sockel);
  const deckeH = 0.05;
  const decke = new THREE.Mesh(new THREE.BoxGeometry(breite - 0.1, deckeH, tiefe - 0.1), schnee);
  decke.position.y = dicke + deckeH / 2 - 0.005; decke.castShadow = false; decke.receiveShadow = true;
  g.add(decke);
  const oben = dicke + deckeH - 0.005;
  // Schneehügel (abgeflachte Kugeln) an Rand und Ecken
  const huegel = new THREE.SphereGeometry(1, 14, 8);
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2, rr = 0.55 + r() * 0.4;
    const x = Math.cos(a) * (breite / 2 - 0.2) * rr * (r() < 0.5 ? 1 : 0.92), z = Math.sin(a) * (tiefe / 2 - 0.2) * rr;
    if (Math.abs(x - pfadX) < pfadBreite * 0.8 && z > pfadAb - 0.8) continue;
    const m = new THREE.Mesh(huegel, schnee);
    const s = 0.18 + r() * 0.2;
    m.scale.set(s * 1.5, s * 0.34, s * 1.2); m.position.set(x, oben, z); m.receiveShadow = true; m.castShadow = true;
    g.add(m);
  }
  // geräumter Pfad vom Haus zum Plattenrand
  const pfadMat = stdMat("pl|pfad", { color: "#8D99AC", roughness: 0.8 });
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(pfadBreite, tiefe / 2 - pfadAb + 0.02), pfadMat);
  pf.rotation.x = -Math.PI / 2; pf.position.set(pfadX, oben + 0.003, (tiefe / 2 + pfadAb) / 2 - 0.01); pf.receiveShadow = true;
  g.add(pf);
  // LED-Kante (Teamfarbe) rundum am Sockel
  const y = dicke * 0.5, b2 = breite / 2 + 0.003, t2 = tiefe / 2 + 0.003;
  const e = (a, b) => g.add(glimmLinie(a, b, { farbe: led, staerke: 2.4, dicke: 0.018 }));
  e([-b2, y, t2], [b2, y, t2]); e([-b2, y, -t2], [b2, y, -t2]); e([-b2, y, -t2], [-b2, y, t2]); e([b2, y, -t2], [b2, y, t2]);
  g.userData = { oben, breite, tiefe, dicke };
  return g;
}

/**
 * Einfamilienhaus (Front zeigt nach +z, Unterkante y = 0): Sockelgeschoss mit offenem Heizraum (Einblick vorn links),
 * Wohngeschoss mit warmen Fenstern und Tür, verschneites Satteldach (First entlang x), Schornstein, Dachfenster.
 * h.kesselHalter: Gruppe im Heizraum (hier Kessel/Speicher einsetzen), h.raumLicht: warmes PunktLicht des Heizraums,
 * h.punkte: { schornstein, heizraum, front } in lokalen Koordinaten.
 */
export function einfamilienhaus({ breite = 1.9, tiefe = 1.45, hoehe = 0.85, sockel = 0.55, dachHoehe = 0.72, seed = 1, offenX = -0.34, offenBreite = 0.92, wand = "#C8CFDA" } = {}) {
  const g = new THREE.Group();
  const beton = stdMat("hs|beton", { color: "#7F8896", roughness: 0.9, map: putzTextur() });
  const putz = stdMat("hs|putz|" + wand, { color: wand, roughness: 0.88, map: putzTextur() });
  const dachSchnee = stdMat("hs|dachschnee", { color: "#E3ECF8", roughness: 0.92 });
  const dunkel = stdMat("hs|dunkel", { color: "#2B303B", roughness: 0.6 });
  const holz = stdMat("hs|holz", { color: "#4A3A30", roughness: 0.7 });
  const box = (w, h, d, x, y, z, m, schatten = true) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = schatten; b.receiveShadow = true; g.add(b); return b; };
  // Sockelgeschoss: links, rechts, Sturz, Rückwand
  const oh = sockel - 0.07;
  const xl = offenX - offenBreite / 2, xr = offenX + offenBreite / 2;
  box(xl + breite / 2, sockel, tiefe, (xl - breite / 2) / 2, sockel / 2, 0, beton);
  box(breite / 2 - xr, sockel, tiefe, (xr + breite / 2) / 2, sockel / 2, 0, beton);
  box(breite, sockel - oh, tiefe, 0, oh + (sockel - oh) / 2, 0, beton);
  box(offenBreite + 0.02, sockel, 0.08, offenX, sockel / 2, -tiefe / 2 + 0.04, beton, false);
  // Innenraum: Boden, Rückwand mit warmem Schein
  const rauMat = new THREE.MeshStandardMaterial({ color: "#59606E", roughness: 0.85, emissive: new THREE.Color("#FF9A52"), emissiveIntensity: 0.22 });
  const rueck = new THREE.Mesh(new THREE.PlaneGeometry(offenBreite, oh), rauMat);
  rueck.position.set(offenX, oh / 2 + 0.01, -tiefe / 2 + 0.085);
  g.add(rueck);
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(offenBreite, tiefe - 0.2), stdMat("hs|rb", { color: "#4A5262", roughness: 0.6 }));
  boden.rotation.x = -Math.PI / 2; boden.position.set(offenX, 0.012, 0.0); boden.receiveShadow = true;
  g.add(boden);
  // Rahmen um die Öffnung
  box(offenBreite + 0.1, 0.035, 0.05, offenX, oh + 0.01, tiefe / 2 + 0.005, dunkel, false);
  // Wohngeschoss
  const wy = sockel + hoehe / 2;
  box(breite + 0.04, hoehe, tiefe + 0.04, 0, wy, 0, putz);
  box(breite + 0.08, 0.04, tiefe + 0.08, 0, sockel + 0.02, 0, stdMat("hs|band", { color: "#9AA3B2", roughness: 0.8 }), false);
  // Fenster (warm) und Tür
  const warm = leuchtMat("#FFC27A", 2.4);
  for (const fx of [-0.62, -0.02]) {
    box(0.36, 0.32, 0.03, fx, sockel + hoehe * 0.55, tiefe / 2 + 0.03, dunkel, false);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.26), warm);
    p.position.set(fx, sockel + hoehe * 0.55, tiefe / 2 + 0.048);
    g.add(p);
    box(0.02, 0.26, 0.012, fx, sockel + hoehe * 0.55, tiefe / 2 + 0.052, dunkel, false);
    const pf = lichtPfuetze({ radius: 0.5, farbe: "#FFB574", staerke: 0.3, streckung: 0.7 });
    pf.position.set(fx, 0.014, tiefe / 2 + 0.55); g.add(pf);
  }
  const tx = 0.62;
  box(0.3, 0.52, 0.04, tx, sockel + 0.26 + 0.02, tiefe / 2 + 0.03, holz, false);
  const lampe = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.05), leuchtMat("#FFD7A6", 5));
  lampe.position.set(tx + 0.22, sockel + 0.58, tiefe / 2 + 0.052); g.add(lampe);
  // Satteldach (First entlang x) mit Schnee, Traufe dunkel
  const d = tiefe / 2 + 0.11, len = breite + 0.22;
  const sh = new THREE.Shape(); sh.moveTo(-d, 0); sh.lineTo(d, 0); sh.lineTo(0, dachHoehe); sh.closePath();
  const dg = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false });
  dg.translate(0, 0, -len / 2); dg.rotateY(Math.PI / 2);
  const dach = new THREE.Mesh(dg, dachSchnee);
  dach.position.y = sockel + hoehe; dach.castShadow = true; dach.receiveShadow = true;
  g.add(dach);
  box(len, 0.045, 0.05, 0, sockel + hoehe + 0.012, d - 0.01, dunkel, false);
  // Dachfenster (warm) in der Vorderseite des Daches
  const ang = -Math.atan2(d, dachHoehe);
  const f = 0.42, zz = d * (1 - f), yy = sockel + hoehe + dachHoehe * f;
  for (const fx of [-0.3, 0.3]) {
    const rah = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22), dunkel);
    rah.rotation.x = ang; rah.position.set(fx, yy, zz + 0.012); g.add(rah);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.17), leuchtMat("#FFC98A", 2.0));
    gl.rotation.x = ang; gl.position.set(fx, yy + 0.003, zz + 0.026); g.add(gl);
  }
  // Schornstein mit Schneekappe
  const cx = 0.58, cz = -0.2, fz = 1 - Math.abs(cz) / d;
  const topY = sockel + hoehe + dachHoehe * fz + 0.34;
  box(0.15, topY - (sockel + hoehe) + 0.02, 0.15, cx, (topY + sockel + hoehe) / 2, cz, stdMat("hs|schorn", { color: "#6A5A52", roughness: 0.95 }));
  box(0.19, 0.045, 0.19, cx, topY + 0.02, cz, dachSchnee);
  // Raumlicht (warm, im Heizraum)
  const raumLicht = new THREE.PointLight("#FFB070", 2.6, 2.6, 1.5);
  raumLicht.position.set(offenX, sockel * 0.7, tiefe / 2 - 0.12);
  g.add(raumLicht);
  // Halter für Kessel/Speicher im Heizraum (vorn, gut sichtbar durch die Öffnung)
  const kesselHalter = new THREE.Group();
  kesselHalter.position.set(offenX, 0.02, tiefe / 2 - 0.42);
  g.add(kesselHalter);
  g.userData = { breite, tiefe, hoehe, sockel, dachHoehe, offenX, offenBreite };
  g.raumLicht = raumLicht; g.raumMat = rauMat; g.kesselHalter = kesselHalter;
  g.punkte = { schornstein: new THREE.Vector3(cx, topY + 0.08, cz), heizraum: new THREE.Vector3(offenX, 0.3, tiefe / 2 + 0.05), front: new THREE.Vector3(0, 0.5, tiefe / 2), dach: new THREE.Vector3(0, sockel + hoehe + dachHoehe, 0) };
  return g;
}

/**
 * Gaskessel im Heizraum (Unterkante y = 0). alt = verschmutzt, Typenschild „2006“, Flamme flackert vom Aufrufer gesteuert;
 * neu = weiß mit LED-Streifen in Teamfarbe. flamme(a): Helligkeit der Flamme im Sichtfenster 0–1, glimm(g): LED/Schein 0–2.
 */
export function gasKessel({ alt = true, farbe = "#FF5A1F", jahr = "2006" } = {}) {
  const g = new THREE.Group();
  const bw = 0.31, bh = 0.38, bd = 0.21;
  const koerperMat = alt ? stdMat("gk|alt", { color: "#868C96", roughness: 0.8, metalness: 0.25 }) : stdMat("gk|neu", { color: "#E8EDF4", roughness: 0.3, metalness: 0.25 });
  const k = rundeBox(bw, bh, bd, { material: koerperMat, radius: 0.025 });
  k.castShadow = true; g.add(k);
  const dunkel = stdMat("gk|panel", { color: alt ? "#2B2E34" : "#171B22", roughness: 0.4, metalness: 0.4 });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(bw * 0.78, bh * 0.3), dunkel);
  panel.position.set(0, bh * 0.76, bd / 2 + 0.002); g.add(panel);
  // Flammenfenster unten
  const flMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#FF7A2E").multiplyScalar(4), fog: false });
  const fenRahmen = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.085), dunkel);
  fenRahmen.position.set(alt ? 0.03 : 0, bh * 0.3, bd / 2 + 0.002); g.add(fenRahmen);
  const flamme = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.06), flMat);
  flamme.position.set(alt ? 0.03 : 0, bh * 0.3, bd / 2 + 0.006); g.add(flamme);
  // Abgasrohr nach oben
  const rohr = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.2, 10), stdMat("gk|rohr", { color: alt ? "#4D5158" : "#C6CCD6", roughness: 0.5, metalness: 0.6 }));
  rohr.position.set(0.07, bh + 0.09, -0.02); g.add(rohr);
  let ledMat = null, dispMat = null;
  if (alt) {
    // Typenschild mit Baujahr
    const c = document.createElement("canvas"); c.width = 128; c.height = 64;
    const x = c.getContext("2d"); x.fillStyle = "#C9C2A8"; x.fillRect(0, 0, 128, 64); x.strokeStyle = "#5A5240"; x.lineWidth = 3; x.strokeRect(2, 2, 124, 60);
    x.fillStyle = "#2E2A20"; x.font = "800 26px 'SB Text', Inter, sans-serif"; x.textAlign = "center"; x.fillText(jahr, 64, 28); x.font = "600 13px Inter, sans-serif"; x.fillText("BAUJAHR", 64, 50);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sch = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), new THREE.MeshBasicMaterial({ map: t, color: "#BFBFBF" }));
    sch.position.set(-0.07, bh * 0.52, bd / 2 + 0.003); g.add(sch);
    // Rußspuren über dem Flammenfenster
    const russ = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), new THREE.MeshBasicMaterial({ color: "#14151A", transparent: true, opacity: 0.35 }));
    russ.position.set(0.03, bh * 0.43, bd / 2 + 0.003); g.add(russ);
    dispMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#FF8A4D").multiplyScalar(1.5), fog: false });
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.025), dispMat);
    disp.position.set(0, bh * 0.76, bd / 2 + 0.004); g.add(disp);
  } else {
    ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(3.2), fog: false });
    const led = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.86, 0.016, 0.012), ledMat);
    led.position.set(0, bh * 0.93, bd / 2 + 0.004); g.add(led);
    dispMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#BFE0FF").multiplyScalar(1.6), fog: false });
    const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.03), dispMat);
    disp.position.set(0, bh * 0.76, bd / 2 + 0.004); g.add(disp);
  }
  g.userData.dynamisch = true;
  g.flamme = (a) => { const v = Math.max(0, Math.min(1.2, a)); flamme.visible = v > 0.02; flMat.color.set("#FF7A2E").multiplyScalar(0.4 + 4.2 * v); flamme.scale.set(0.6 + 0.4 * v, 0.5 + 0.5 * v, 1); return g; };
  g.glimm = (v) => { if (ledMat) ledMat.color.set(farbe).multiplyScalar(3.2 * (0.5 + v)); if (dispMat) dispMat.color.set(alt ? "#FF8A4D" : "#BFE0FF").multiplyScalar(1.5 * (0.5 + 0.7 * v)); return g; };
  g.flamme(0.6);
  g.userData.hoehe = bh + 0.19;
  return g;
}

/**
 * Wärmepumpen-Außeneinheit (Front +z, Unterkante y = 0): Gehäuse, Lüftergitter mit drehendem Lüfter, LED-Kante in Teamfarbe,
 * Schneekappe, Betonplatte. lauf(t, tempo) dreht den Lüfter, led(k) 0–1.6, setze(s) 0–1 (blendet ein: wächst aus der Platte).
 */
export function waermepumpeAussen({ farbe = "#2F8CFF", breite = 0.66, hoehe = 0.52, tiefe = 0.3 } = {}) {
  const g = new THREE.Group();
  const innen = new THREE.Group(); g.add(innen);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(breite + 0.06, 0.03, tiefe + 0.2), stdMat("wp|pad", { color: "#7B8493", roughness: 0.9 }));
  pad.position.y = 0.015; pad.receiveShadow = true; g.add(pad);
  const metall = stdMat("wp|korpus", { color: "#D3D9E3", roughness: 0.42, metalness: 0.45 });
  const kor = rundeBox(breite, hoehe, tiefe, { material: metall, radius: 0.03 });
  kor.position.y = 0.06; kor.castShadow = true; innen.add(kor);
  const dunkel = stdMat("wp|dunkel", { color: "#12151B", roughness: 0.5, metalness: 0.3 });
  const fz = tiefe / 2 + 0.003, fy = 0.06 + hoehe * 0.5;
  const loch = new THREE.Mesh(new THREE.CircleGeometry(hoehe * 0.38, 40), dunkel);
  loch.position.set(-breite * 0.06, fy, fz); innen.add(loch);
  const fan = new THREE.Group(); fan.position.set(-breite * 0.06, fy, fz + 0.006);
  const blatt = stdMat("wp|blatt", { color: "#98A2B2", roughness: 0.4, metalness: 0.5 });
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(hoehe * 0.34, hoehe * 0.085, 0.008), blatt);
    const w = (i / 5) * Math.PI * 2;
    b.position.set(Math.cos(w) * hoehe * 0.17, Math.sin(w) * hoehe * 0.17, 0); b.rotation.z = w + 0.25; b.rotation.x = 0.35;
    fan.add(b);
  }
  const nabe = new THREE.Mesh(new THREE.CylinderGeometry(hoehe * 0.06, hoehe * 0.06, 0.03, 14), blatt);
  nabe.rotation.x = Math.PI / 2; fan.add(nabe);
  innen.add(fan);
  const gitterMat = stdMat("wp|gitter", { color: "#C2C9D4", roughness: 0.4, metalness: 0.6 });
  for (const rad of [hoehe * 0.2, hoehe * 0.32, hoehe * 0.4]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.005, 6, 40), gitterMat);
    ring.position.set(-breite * 0.06, fy, fz + 0.025); innen.add(ring);
  }
  for (const w of [0, Math.PI / 2]) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(hoehe * 0.8, 0.007, 0.007), gitterMat);
    st.position.set(-breite * 0.06, fy, fz + 0.025); st.rotation.z = w; innen.add(st);
  }
  // Lamellen an der rechten Seite der Front
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(breite * 0.17, 0.008, 0.008), dunkel);
    l.position.set(breite * 0.37, 0.06 + hoehe * (0.22 + i * 0.09), fz + 0.004); innen.add(l);
  }
  // LED-Kante in Teamfarbe (oben vorn und senkrecht links)
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(3), fog: false });
  const l1 = new THREE.Mesh(new THREE.BoxGeometry(breite * 0.94, 0.014, 0.012), ledMat); l1.position.set(0, 0.06 + hoehe - 0.02, fz + 0.004); innen.add(l1);
  const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.012, hoehe * 0.88, 0.012), ledMat); l2.position.set(-breite / 2 + 0.018, fy, fz + 0.004); innen.add(l2);
  // Schneekappe und Füße
  const kappe = new THREE.Mesh(new THREE.BoxGeometry(breite * 0.98, 0.04, tiefe * 1.0), stdMat("wp|schnee", { color: schneeFarbe, roughness: 0.92 }));
  kappe.position.y = 0.06 + hoehe + 0.012; kappe.castShadow = true; innen.add(kappe);
  for (const x of [-breite * 0.38, breite * 0.38]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, tiefe * 0.8), dunkel); f.position.set(x, 0.045, 0); innen.add(f); }
  const pf = lichtPfuetze({ radius: breite * 1.3, farbe, staerke: 0.5, exponent: 2 });
  pf.material = pf.material.clone(); pf.position.set(0, 0.034, tiefe * 0.7); g.add(pf);
  g.userData.dynamisch = true;
  let S = 1;
  g.lauf = (t, tempo = 1.2) => { fan.rotation.z = -t * tempo * Math.PI * 2; return g; };
  g.led = (k) => { ledMat.color.set(farbe).multiplyScalar(3 * k); pf.material.uniforms.staerke.value = (0.35 + 0.5 * k) * S; return g; };
  g.setze = (s) => { S = s; g.visible = s > 0.003; innen.scale.setScalar(Math.max(0.01, s)); innen.position.y = -0.1 * (1 - s); pf.visible = s > 0.2; return g; };
  g.userData.hoehe = hoehe + 0.1; g.userData.fanPos = new THREE.Vector3(-breite * 0.06, fy, fz);
  return g;
}

/**
 * Kostensäule: durchscheinende Glas-Säule in Teamfarbe mit leuchtender Kappe, optional mit Skala (Querlinien alle `tick` Einheiten).
 * hoehe(h) beliebig änderbar, setze(s) blendet ein, puls(k) lässt Kappe und Fläche aufleuchten.
 */
export function kostenSaeule({ breite = 0.3, farbe = "#FF5A1F", tick = 0, deckkraft = 0.5, kante = 2.6 } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe) }, hoehe: { value: 1 }, tick: { value: tick }, op: { value: deckkraft }, puls: { value: 0 }, ein: { value: 1 } },
    vertexShader: `uniform float hoehe; varying vec3 vP; varying float vY; void main(){ vP = vec3(position.x, position.y * hoehe, position.z); vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 farbe; uniform float tick, op, puls, ein; varying vec3 vP; varying float vY;
      void main(){
        float rim = smoothstep(0.36, 0.5, max(abs(vP.x), abs(vP.z)));
        float tk = 0.0; if (tick > 0.0) { float f = fract(vP.y / tick); float d = min(f, 1.0 - f) * tick; tk = 1.0 - smoothstep(0.004, 0.014, d); }
        float kopf = smoothstep(0.9, 1.0, vY);
        float v = 0.5 + 1.4 * rim + 1.4 * tk + 0.9 * kopf + 1.2 * puls;
        float a = clamp(op * (0.5 + 0.5 * rim + 0.5 * puls) + 0.3 * tk, 0.0, 1.0) * ein;
        gl_FragColor = vec4(farbe * v, a);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const fuell = new THREE.Mesh(geo, mat); fuell.renderOrder = 4; g.add(fuell);
  const kappeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(kante), transparent: true, fog: false });
  const kappe = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), kappeMat); kappe.renderOrder = 5; g.add(kappe);
  const pf = lichtPfuetze({ radius: breite * 2.4, farbe, staerke: 0.5, exponent: 2 });
  pf.material = pf.material.clone(); pf.position.y = 0.008; g.add(pf);
  g.userData.dynamisch = true;
  let H = 1, S = 1, P = 0;
  const wende = () => {
    g.visible = S > 0.002;
    fuell.scale.set(breite, Math.max(H, 1e-3), breite); mat.uniforms.hoehe.value = Math.max(H, 1e-3); mat.uniforms.puls.value = P; mat.uniforms.ein.value = S;
    kappe.scale.set(breite * 1.02, 0.026, breite * 1.02); kappe.position.y = H;
    kappeMat.color.set(farbe).multiplyScalar(kante * (1 + 1.4 * P)); kappeMat.opacity = S;
    pf.material.uniforms.staerke.value = (0.5 + 0.9 * P) * S;
  };
  g.hoehe = (h) => { H = h; wende(); return g; };
  g.setze = (s) => { S = s; wende(); return g; };
  g.puls = (k) => { P = k; wende(); return g; };
  g.kopf = () => H;
  wende();
  return g;
}

/** Förderstapel: 7 dünne Elfenbein-Platten (Bescheide, keine Banknoten) mit Blau-Streifen auf der obersten; setze(s) 0–1 (Sichtbarkeit), glimm(k) */
export function foerderStapel({ farbe = "#ECE6DA", akzent = "#2F8CFF", anzahl = 7 } = {}) {
  const g = new THREE.Group();
  const r = zufall(17);
  const m = new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.55, emissive: new THREE.Color(farbe), emissiveIntensity: 0.35, transparent: true });
  const platten = [];
  for (let i = 0; i < anzahl; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.028, 0.32), m);
    p.position.set((r() - 0.5) * 0.03, 0.014 + i * 0.03, (r() - 0.5) * 0.03); p.rotation.y = (r() - 0.5) * 0.28; p.castShadow = true;
    g.add(p); platten.push(p);
  }
  const streifenMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(akzent).multiplyScalar(3), transparent: true, fog: false });
  const streifen = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.045), streifenMat);
  streifen.rotation.x = -Math.PI / 2; streifen.position.set(0, 0.03 * anzahl + 0.003, 0.06); streifen.rotation.z = platten[anzahl - 1].rotation.y; g.add(streifen);
  const kante = glimmLinie([-0.23, 0.03 * anzahl, 0.165], [0.23, 0.03 * anzahl, 0.165], { farbe: akzent, staerke: 3, dicke: 0.012 });
  kante.material = kante.material.clone(); kante.material.transparent = true; g.add(kante);
  g.userData.dynamisch = true;
  g.setze = (s) => { g.visible = s > 0.004; m.opacity = Math.min(1, s * 1.6); streifenMat.opacity = Math.min(1, s * 1.6); kante.material.opacity = Math.min(1, s * 1.6); return g; };
  g.glimm = (k) => { m.emissiveIntensity = 0.35 + 1.1 * k; return g; };
  g.userData.hoehe = 0.03 * anzahl;
  g.setze(1);
  return g;
}

/**
 * Bio-Treppe: vier gläserne Stufen 2029 10 % · 2030 15 % · 2035 30 % · 2040 60 % (Höhe = Anteil), Beschriftung über jeder Stufe.
 * stufe(i, a) blendet Stufe i ein (0–1, wächst), puls(i, k) lässt sie aufleuchten. Unterkante y = 0, Breite ≈ 1,9.
 */
export function bioTreppe({ farbe = "#FF5A1F", hoehe = 2.0, breite = 0.4, abstand = 0.5 } = {}) {
  const g = new THREE.Group();
  const daten = [["2029", "10 %", 0.1], ["2030", "15 %", 0.15], ["2035", "30 %", 0.3], ["2040", "60 %", 0.6]];
  const stufen = daten.map(([jahr, pz, a], i) => {
    const s = kostenSaeule({ breite, farbe, deckkraft: 0.42, kante: 3.0 });
    const x = (i - 1.5) * abstand;
    s.position.set(x, 0, 0);
    g.add(s);
    const c = document.createElement("canvas"); c.width = 256; c.height = 160;
    const x2 = c.getContext("2d"); x2.textAlign = "center";
    x2.fillStyle = "rgba(10,13,19,0.72)"; x2.beginPath(); x2.roundRect(8, 8, 240, 144, 26); x2.fill();
    x2.strokeStyle = "rgba(255,255,255,0.22)"; x2.lineWidth = 3; x2.stroke();
    x2.fillStyle = "#9AA3B2"; x2.font = "700 40px 'SB Text', Inter, sans-serif"; x2.fillText(jahr, 128, 54);
    x2.fillStyle = "#FFFFFF"; x2.font = "800 72px 'SB Display', Inter, sans-serif"; x2.fillText(pz, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const lm = new THREE.MeshBasicMaterial({ map: t, transparent: true, fog: false, depthWrite: false });
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46 * 160 / 256), lm); lab.renderOrder = 9;
    g.add(lab);
    return { s, lab, lm, h: a * hoehe, x, A: 0, P: 0 };
  });
  const wende = (st) => {
    const a = st.A;
    st.s.setze(Math.min(1, a * 1.5)); st.s.hoehe(Math.max(1e-3, st.h * a)); st.s.puls(st.P);
    st.lab.visible = a > 0.3; st.lm.opacity = Math.min(1, Math.max(0, (a - 0.3) / 0.5));
    st.lab.position.set(st.x, st.h * a + 0.32 + 0.04 * st.P, 0.0);
    st.lab.scale.setScalar(1 + 0.15 * st.P);
  };
  g.userData.dynamisch = true;
  g.stufe = (i, a) => { stufen[i].A = a; wende(stufen[i]); return g; };
  g.puls = (i, k) => { stufen[i].P = k; wende(stufen[i]); return g; };
  g.anzahl = stufen.length;
  g.kopfPos = (i) => new THREE.Vector3(stufen[i].x, stufen[i].h * stufen[i].A, 0);
  stufen.forEach(wende);
  return g;
}

/**
 * Energie-/Kostenstrom: dünnes Leuchtrohr entlang einer Kurve (Weltpunkte) mit laufenden Würfeln.
 * setze(s) Stärke 0–1, lauf(t, tempo) Würfelpositionen, breite(r) Rohrradius (Neuaufbau in 0,003er Stufen, deterministisch).
 */
export function energieFluss({ punkte, farbe = "#FF5A1F", radius = 0.02, wuerfel = 8, groesse = 0.075, staerke = 2.4, spannung = 0.5 } = {}) {
  const g = new THREE.Group();
  const kurve = new THREE.CatmullRomCurve3(punkte.map((p) => new THREE.Vector3(...p)), false, "catmullrom", spannung);
  const bahnMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(staerke * 0.7), transparent: true, opacity: 0.75, depthWrite: false, fog: false });
  let rad = -1, bahn = null;
  const baue = (r2) => { const q = Math.max(0.004, Math.round(r2 / 0.003) * 0.003); if (q === rad) return; rad = q; if (bahn) { bahn.geometry.dispose(); g.remove(bahn); } bahn = new THREE.Mesh(new THREE.TubeGeometry(kurve, 64, q, 6), bahnMat); bahn.renderOrder = 6; g.add(bahn); };
  baue(radius);
  const wMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(staerke * 1.5), transparent: true, fog: false });
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const ws = [];
  for (let i = 0; i < wuerfel; i++) { const m = new THREE.Mesh(geo, wMat); m.renderOrder = 7; g.add(m); ws.push(m); }
  g.userData.dynamisch = true;
  let S = 1, R = radius;
  g.setze = (s) => { S = s; g.visible = s > 0.01; bahnMat.opacity = 0.75 * Math.min(1, s * 1.4); wMat.opacity = Math.min(1, s * 1.6); return g; };
  g.breite = (r2) => { R = r2; baue(r2); return g; };
  g.lauf = (t, tempo = 0.35) => {
    ws.forEach((m, i) => {
      const u = (((t * tempo + i / wuerfel) % 1) + 1) % 1;
      m.position.copy(kurve.getPointAt(u));
      m.scale.setScalar(Math.max(0.005, S * groesse * (R / radius) ** 0.5 * (0.55 + 0.6 * Math.sin(Math.PI * u))));
      m.rotation.set(u * 7, u * 5, 0);
    });
    return g;
  };
  g.kurve = kurve;
  g.setze(1); g.lauf(0);
  return g;
}

/** Preis-Anhänger: schwebendes Leuchtschild (Glas, Teamfarbe als Rand) mit wechselbarem Text; text("10.000 €"), setze(s), glimm(k) */
export function preisAnhaenger({ breite = 0.95, hoehe = 0.4, farbe = "#FF5A1F" } = {}) {
  const g = new THREE.Group();
  const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * hoehe / breite);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  let aktuell = null;
  const mal = (txt) => {
    const x = c.getContext("2d"), b = c.width, h = c.height;
    x.clearRect(0, 0, b, h);
    x.fillStyle = "rgba(10,13,19,0.86)"; x.beginPath(); x.roundRect(6, 6, b - 12, h - 12, 38); x.fill();
    x.strokeStyle = farbe; x.lineWidth = 12; x.stroke();
    x.fillStyle = "#F3F5F8"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = `800 ${Math.round(h * 0.52)}px 'SB Display', Inter, sans-serif`;
    x.fillText(txt, b / 2, h / 2 + 5);
    t.needsUpdate = true;
  };
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, fog: false, depthWrite: false, color: new THREE.Color(1.15, 1.15, 1.15) });
  const tafel = new THREE.Mesh(new THREE.PlaneGeometry(breite, hoehe), mat); tafel.renderOrder = 9;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(breite * 1.5, hoehe * 2.2), new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe) }, staerke: { value: 0.35 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 farbe; uniform float staerke; varying vec2 vUv; void main(){ float r = length((vUv - 0.5) * vec2(1.0, 1.0)) * 2.0; float a = pow(clamp(1.0 - r, 0.0, 1.0), 2.2); gl_FragColor = vec4(farbe * staerke * a, 1.0); }",
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.renderOrder = 8; halo.position.z = -0.01;
  g.add(halo, tafel);
  g.userData.dynamisch = true;
  g.text = (txt) => { if (txt !== aktuell) { aktuell = txt; mal(txt); } return g; };
  g.setze = (s) => { g.visible = s > 0.01; g.scale.setScalar(Math.max(0.01, s)); mat.opacity = Math.min(1, s * 1.5); return g; };
  g.glimm = (k) => { halo.material.uniforms.staerke.value = 0.3 + 0.9 * k; return g; };
  g.text("10.000 €");
  return g;
}

/** Rauchsäule aus weichen Wolken, steigt am Schornstein auf; lauf(t, staerke 0–1). Ursprung = Mündung. */
export function rauchSaeule({ anzahl = 14, hoehe = 1.0, farbe = "#9AA6BA", seed = 5, drift = 0.28 } = {}) {
  const g = new THREE.Group();
  const r = zufall(seed);
  const geo = new THREE.SphereGeometry(1, 10, 8);
  const teile = [];
  for (let i = 0; i < anzahl; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: farbe, transparent: true, opacity: 0.3, depthWrite: false }));
    m.renderOrder = 6; g.add(m); teile.push({ m, ph: r(), sx: (r() - 0.5) * 2, sz: (r() - 0.5) * 2 });
  }
  g.userData.dynamisch = true;
  g.lauf = (t, staerke = 1) => {
    teile.forEach((p, i) => {
      const u = (((t * 0.28 + p.ph) % 1) + 1) % 1;
      p.m.position.set(drift * u * u + p.sx * 0.05 * u + Math.sin(t * 0.9 + i) * 0.015, u * hoehe, p.sz * 0.04 * u);
      const s = 0.035 + 0.13 * u;
      p.m.scale.setScalar(s);
      p.m.material.opacity = staerke * 0.36 * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - 0.4 * u);
      p.m.visible = p.m.material.opacity > 0.004;
    });
    return g;
  };
  g.lauf(0, 1);
  return g;
}

/** Abstandsanzeige am Boden: zwei Leuchtbalken von der Mitte nach links bzw. rechts; laenge(links, rechts) in Weltmaß, setze(0–1) */
export function abstandsAnzeige({ farbeL = "#FF5A1F", farbeR = "#2F8CFF", dicke = 0.06 } = {}) {
  const g = new THREE.Group();
  const mk = (f) => { const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(f).multiplyScalar(3.2), transparent: true, fog: false }); const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat); m.renderOrder = 6; g.add(m); return { m, mat }; };
  const L = mk(farbeL), R = mk(farbeR);
  const mitte = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.16, 0.014), new THREE.MeshBasicMaterial({ color: "#ECE6DA", fog: false }));
  mitte.position.y = 0.08; g.add(mitte);
  g.userData.dynamisch = true;
  g.laenge = (l, rr) => {
    L.m.visible = l > 0.003; R.m.visible = rr > 0.003;
    L.m.scale.set(Math.max(l, 1e-3), dicke * 0.5, dicke); L.m.position.set(-l / 2, dicke * 0.25, 0);
    R.m.scale.set(Math.max(rr, 1e-3), dicke * 0.5, dicke); R.m.position.set(rr / 2, dicke * 0.25, 0);
    return g;
  };
  g.setze = (s) => { g.visible = s > 0.01; L.mat.opacity = R.mat.opacity = Math.min(1, s * 1.5); return g; };
  g.laenge(0, 0);
  return g;
}

/** Wintertanne mit Schnee auf den Etagen (statisch) */
export function winterBaum({ groesse = 0.8, seed = 1, farbe = "#1E3A36" } = {}) {
  const g = new THREE.Group();
  const r = zufall(seed);
  const stamm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, groesse * 0.22, 6), stdMat("wb|stamm", { color: "#2E241E", roughness: 0.9 }));
  stamm.position.y = groesse * 0.11; g.add(stamm);
  const nadel = stdMat("wb|nadel|" + farbe, { color: farbe, roughness: 0.85, flatShading: true });
  const schnee = stdMat("wb|schnee", { color: "#DCE6F4", roughness: 0.92, flatShading: true });
  const n = 4;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1), rad = groesse * (0.34 - 0.22 * f) * (0.92 + 0.16 * r()), h = groesse * 0.34;
    const y = groesse * (0.18 + 0.62 * f);
    const k = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 7), nadel); k.position.y = y + h / 2; k.castShadow = true; g.add(k);
    const s = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.74, h * 0.52, 7), schnee); s.position.y = y + h * 0.74; g.add(s);
  }
  return g;
}
