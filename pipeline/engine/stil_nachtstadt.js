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
