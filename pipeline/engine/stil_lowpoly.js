// Baukasten Designstil 1 „Low-Poly-Miniatur (Tilt-Shift)“ für Stadt- und Verkehrsszenen:
// Fußgänger mit Armen und Beinen (Gehen, Drücken, Warten), Fußgänger- und Kfz-Signale (leuchten für Bloom),
// Anforderungstaster mit „Signal kommt“-Anzeige, Querstraße mit Furt-Markierung und Haltlinien, Straßenbahn,
// Autoströme mit Rückstau an der Haltlinie (deterministisch vorberechnet), Tilt-Shift-Fokus aus einem 3D-Punkt.
// Nutzt bausteine.js (Material, abgerundete Boxen, Kontaktschatten) und kern.js (Bühne, Nachbearbeitung).
// Alle Modelle und Texturen sind im Code erzeugt (keine fremden Assets). Maßstab: 1 Einheit ≈ 3 m.
import * as THREE from "three";
import { mat, leucht, rundeBox, kontaktSchatten, auto as spielzeugAuto } from "./bausteine.js";
import { clamp, lerp, ease } from "./bewegung.js";

export const TINTE = "#14171F";

// =====================================================================================
// Texturen
// =====================================================================================
/** Text auf Canvas → Textur (für Schilder, Taster, Haltestelle) */
export function textTextur(text, { b = 256, h = 64, farbe = "#FFFFFF", grund = TINTE, groesse = 0.62, schrift = "900", rand = 0 } = {}) {
  const c = document.createElement("canvas");
  c.width = b; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = grund;
  g.fillRect(0, 0, b, h);
  if (rand) { g.strokeStyle = farbe; g.lineWidth = rand; g.strokeRect(rand / 2, rand / 2, b - rand, h - rand); }
  g.fillStyle = farbe;
  g.font = `${schrift} ${Math.round(h * groesse)}px "SB Display", Inter, sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle";
  const zeilen = String(text).split("\n");
  zeilen.forEach((z, i) => g.fillText(z, b / 2, h * (0.53 + (i - (zeilen.length - 1) / 2) * groesse * 1.05)));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Ampelmännchen (stehend rot bzw. gehend grün) als Leucht-Maske auf dunklem Grund */
function maennchenTextur(art) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#000";
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#fff";
  g.strokeStyle = "#fff";
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath(); g.arc(64, 26, 11, 0, Math.PI * 2); g.fill();
  if (art === "steht") {
    g.lineWidth = 17;
    g.beginPath(); g.moveTo(64, 46); g.lineTo(64, 82); g.stroke();
    g.lineWidth = 11;
    g.beginPath(); g.moveTo(45, 50); g.lineTo(40, 80); g.moveTo(83, 50); g.lineTo(88, 80); g.stroke();
    g.beginPath(); g.moveTo(56, 84); g.lineTo(55, 114); g.moveTo(72, 84); g.lineTo(73, 114); g.stroke();
  } else {
    g.lineWidth = 15;
    g.beginPath(); g.moveTo(62, 46); g.lineTo(66, 80); g.stroke();
    g.lineWidth = 10;
    g.beginPath(); g.moveTo(60, 52); g.lineTo(42, 70); g.moveTo(64, 52); g.lineTo(84, 66); g.stroke();
    g.beginPath(); g.moveTo(66, 80); g.lineTo(48, 112); g.moveTo(66, 80); g.lineTo(88, 108); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// =====================================================================================
// Fußgänger (Low-Poly-Figur mit Gelenken, ohne Gesicht)
// =====================================================================================
const GEO = {
  rumpf: (() => { const g = new THREE.CapsuleGeometry(0.075, 0.13, 4, 10); g.translate(0, 0.43, 0); return g; })(),
  kopf: new THREE.IcosahedronGeometry(0.068, 1),
  bein: (() => { const g = new THREE.CapsuleGeometry(0.03, 0.17, 3, 8); g.translate(0, -0.115, 0); return g; })(),
  arm: (() => { const g = new THREE.CapsuleGeometry(0.024, 0.15, 3, 8); g.translate(0, -0.1, 0); return g; })(),
  schuh: (() => { const g = new THREE.BoxGeometry(0.06, 0.035, 0.09); g.translate(0, -0.235, 0.015); return g; })(),
};
/**
 * Fußgänger: Blickrichtung +z. opt: {farbe (Jacke, Teamfarbe), haut, hose, haar, frisur:"dutt"|"kappe"|"kurz", groesse}
 * Rückgabe: Gruppe mit userData {rumpf, kopf, beinL, beinR, armL, armR, ring}
 */
export function fussgaenger({ farbe = "#FF4F9A", haut = "#F6C9A4", hose = "#2B3045", haar = "#3A2A22", frisur = "kurz", groesse = 1.25, schuhe = "#FFFFFF" } = {}) {
  const g = new THREE.Group();
  const k = new THREE.Group(); // Körper (für Hüpfen und Neigung)
  g.add(k);
  const mJacke = mat(farbe, { rau: 0.55 });
  const rumpf = new THREE.Mesh(GEO.rumpf, mJacke);
  k.add(rumpf);
  const kopf = new THREE.Group();
  kopf.position.y = 0.63;
  k.add(kopf);
  kopf.add(new THREE.Mesh(GEO.kopf, mat(haut, { rau: 0.6 })));
  const mHaar = mat(haar, { rau: 0.7 });
  if (frisur === "dutt") {
    const kappe = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mHaar);
    kappe.rotation.x = -0.35;
    kopf.add(kappe);
    const dutt = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 1), mHaar);
    dutt.position.set(0, 0.06, -0.055);
    kopf.add(dutt);
  } else if (frisur === "kappe") {
    const kappe = new THREE.Mesh(new THREE.SphereGeometry(0.073, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(farbe, { rau: 0.5 }));
    kopf.add(kappe);
    const schirm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 16, 1, false, -Math.PI / 2, Math.PI), mat(farbe, { rau: 0.5 }));
    schirm.position.set(0, 0.012, 0.045);
    kopf.add(schirm);
  } else {
    const kappe = new THREE.Mesh(new THREE.SphereGeometry(0.071, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), mHaar);
    kopf.add(kappe);
  }
  const mHose = mat(hose, { rau: 0.7 });
  const mSchuh = mat(schuhe, { rau: 0.5 });
  const bein = (x) => {
    const p = new THREE.Group();
    p.position.set(x, 0.27, 0);
    p.add(new THREE.Mesh(GEO.bein, mHose), new THREE.Mesh(GEO.schuh, mSchuh));
    k.add(p);
    return p;
  };
  const arm = (x) => {
    const p = new THREE.Group();
    p.rotation.order = "YXZ"; // erst nach vorn heben (x), dann zur Seite drehen (y)
    p.position.set(x, 0.52, 0);
    p.add(new THREE.Mesh(GEO.arm, mJacke));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), mat(haut, { rau: 0.6 }));
    hand.position.y = -0.2;
    p.add(hand);
    k.add(p);
    return p;
  };
  const beinL = bein(-0.04), beinR = bein(0.04), armL = arm(-0.1), armR = arm(0.1);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  g.add(kontaktSchatten(0.32, 0.32, 0.35));
  // Bodenring in Teamfarbe (macht die Figur von oben sofort erkennbar)
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.2, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(1.15), transparent: true, opacity: 0.9, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.012;
  ring.renderOrder = 2;
  g.add(ring);
  g.scale.setScalar(groesse);
  g.userData = { k, rumpf, kopf, beinL, beinR, armL, armR, ring };
  return g;
}

/**
 * Figur setzen. o: {pos:[x,y,z], richtung (rad, 0 = +z), phase (Schritte), lauf 0..1 (Schwung), tempo (0..1 → Neigung),
 *   druecken 0..1 (ein Arm zum Taster), stoss 0..1 (Druckbewegung), seite: +1 = Arm auf der lokalen +x-Seite, −1 = −x-Seite,
 *   ungeduld 0..1 (Wippen), huepf (m), verschraenkt 0..1 (Arme vor der Brust), schauen (Kopfdrehung rad)}
 */
export function setzeFussgaenger(f, { pos, richtung = Math.PI, phase = 0, lauf = 0, tempo = 0, druecken = 0, stoss = 0, seite = 1, ungeduld = 0, huepf = 0, verschraenkt = 0, schauen = 0, zeit = 0 } = {}) {
  const u = f.userData;
  f.position.set(pos[0], pos[1] ?? 0, pos[2]);
  f.rotation.y = richtung;
  const s = Math.sin(phase * Math.PI);
  const amp = 0.62 * lauf * (0.75 + 0.35 * tempo);
  u.beinL.rotation.x = s * amp;
  u.beinR.rotation.x = -s * amp;
  u.k.position.y = Math.abs(Math.cos(phase * Math.PI)) * 0.02 * lauf + huepf + Math.abs(Math.sin(zeit * 9)) * 0.012 * ungeduld;
  u.k.rotation.x = 0.1 * tempo * lauf + 0.03 * Math.sin(zeit * 9) * ungeduld;
  u.k.rotation.z = Math.sin(phase * Math.PI) * 0.03 * lauf;
  u.kopf.rotation.y = schauen;
  // Arme: Gehen (gegenläufig), Drücken (eine Hand zum Taster), Verschränken
  const armAmp = 0.55 * lauf * (0.7 + 0.5 * tempo);
  const drueckArm = seite > 0 ? u.armR : u.armL, freiArm = seite > 0 ? u.armL : u.armR;
  const gehL = -s * armAmp, gehR = s * armAmp;
  u.armL.rotation.set(gehL, 0, -0.08);
  u.armR.rotation.set(gehR, 0, 0.08);
  if (verschraenkt > 0) {
    const v = ease.inOutSine(clamp(verschraenkt));
    u.armL.rotation.set(lerp(gehL, -1.25, v), lerp(0, 0.9, v), lerp(-0.08, 0.2, v));
    u.armR.rotation.set(lerp(gehR, -1.25, v), lerp(0, -0.9, v), lerp(0.08, -0.2, v));
  }
  if (druecken > 0) {
    const d = ease.inOutSine(clamp(druecken));
    const vor = -1.12 - 0.16 * stoss; // nach vorn (leicht nach unten) gestreckt, beim Stoß weiter
    drueckArm.rotation.set(lerp(drueckArm.rotation.x, vor, d), lerp(drueckArm.rotation.y, seite * 0.3, d), lerp(drueckArm.rotation.z, seite * 0.08, d));
    drueckArm.position.z = 0.03 * stoss * d;
    freiArm.rotation.x = lerp(freiArm.rotation.x, 0.05, d);
  } else drueckArm.position.z = 0;
}

// =====================================================================================
// Signale und Taster
// =====================================================================================
const MAST = () => mat("#3A4152", { rau: 0.5, metall: 0.3 });
const LINSE_AUS = new THREE.Color("#1B1E26");

/** Fußgängersignal (rot oben, grün unten) auf einem Mast. Blickrichtung +z. Rückgabe {gruppe, setze("rot"|"gruen"|"aus")} */
export function fussgaengerSignal({ hoehe = 0.95 } = {}) {
  const g = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, hoehe + 0.3, 10), MAST());
  mast.position.y = (hoehe + 0.3) / 2;
  mast.castShadow = true;
  g.add(mast);
  const kasten = rundeBox(0.15, 0.32, 0.1, { farbe: "#2A2F3A", radius: 0.025 });
  kasten.position.set(0, hoehe, 0.05);
  g.add(kasten);
  const steht = maennchenTextur("steht"), geht = maennchenTextur("geht");
  const mRot = new THREE.MeshBasicMaterial({ color: LINSE_AUS.clone(), alphaMap: steht, transparent: true, toneMapped: false });
  const mGruen = new THREE.MeshBasicMaterial({ color: LINSE_AUS.clone(), alphaMap: geht, transparent: true, toneMapped: false });
  const linse = (m, y) => {
    const grund = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), new THREE.MeshBasicMaterial({ color: "#0D0F14" }));
    grund.position.set(0, y, 0.101);
    g.add(grund);
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), m);
    l.position.set(0, y, 0.103);
    g.add(l);
    const schute = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.012, 0.05), mat("#2A2F3A"));
    schute.position.set(0, y + 0.065, 0.12);
    g.add(schute);
  };
  linse(mRot, hoehe + 0.235);
  linse(mGruen, hoehe + 0.095);
  const ROT = new THREE.Color("#FF2B1F").multiplyScalar(3.2), GRUEN = new THREE.Color("#2BFF7A").multiplyScalar(2.6);
  let zuletzt = null;
  return {
    gruppe: g,
    setze(z, blink = 0) {
      const key = `${z}|${blink.toFixed(2)}`;
      if (key === zuletzt) return;
      zuletzt = key;
      mRot.color.copy(z === "rot" ? ROT : LINSE_AUS);
      mGruen.color.copy(z === "gruen" ? GRUEN : LINSE_AUS).multiplyScalar(z === "gruen" ? 1 - 0.0 * blink : 1);
    },
  };
}

/** Kfz-Signal (3 Lichter). Blickrichtung +z. setze("rot"|"gelb"|"gruen"|"rotgelb") */
export function kfzSignal({ hoehe = 1.2 } = {}) {
  const g = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, hoehe + 0.35, 10), MAST());
  mast.position.y = (hoehe + 0.35) / 2;
  mast.castShadow = true;
  g.add(mast);
  const kasten = rundeBox(0.15, 0.42, 0.11, { farbe: "#2A2F3A", radius: 0.025 });
  kasten.position.set(0, hoehe, 0.06);
  g.add(kasten);
  const farben = { rot: "#FF2B1F", gelb: "#FFB21F", gruen: "#2BFF7A" };
  const m = {};
  [["rot", 0.34], ["gelb", 0.21], ["gruen", 0.08]].forEach(([k, y]) => {
    m[k] = new THREE.MeshBasicMaterial({ color: LINSE_AUS.clone(), toneMapped: false });
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.042, 18), m[k]);
    l.position.set(0, hoehe + y, 0.117);
    g.add(l);
  });
  let zuletzt = null;
  return {
    gruppe: g,
    setze(z) {
      if (z === zuletzt) return;
      zuletzt = z;
      const an = { rot: z === "rot" || z === "rotgelb", gelb: z === "gelb" || z === "rotgelb", gruen: z === "gruen" };
      for (const k of Object.keys(m)) m[k].color.copy(an[k] ? new THREE.Color(farben[k]).multiplyScalar(2.8) : LINSE_AUS);
    },
  };
}

/** Anforderungstaster (gelber Kasten) mit „SIGNAL KOMMT“-Feld. Blickrichtung +z. setze({kommt, druck 0..1}) */
export function taster() {
  const g = new THREE.Group();
  const kasten = rundeBox(0.12, 0.17, 0.07, { farbe: "#FFC21A", radius: 0.02 });
  g.add(kasten);
  const knopf = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.02, 18), mat("#E9ECF2", { rau: 0.4 }));
  knopf.rotation.x = Math.PI / 2;
  knopf.position.set(0, 0.06, 0.072);
  g.add(knopf);
  const aus = textTextur("SIGNAL\nKOMMT", { b: 128, h: 64, farbe: "#3A2E10", grund: "#1C1A16", groesse: 0.36 });
  const an = textTextur("SIGNAL\nKOMMT", { b: 128, h: 64, farbe: "#FF5A3C", grund: "#1C1A16", groesse: 0.36 });
  const mFeld = new THREE.MeshBasicMaterial({ map: aus, toneMapped: false });
  const feld = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.045), mFeld);
  feld.position.set(0, 0.125, 0.072);
  g.add(feld);
  const blitz = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFF2B0").multiplyScalar(3), transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
  blitz.position.set(0, 0.06, 0.083);
  g.add(blitz);
  let zuletzt = null;
  return {
    gruppe: g,
    setze({ kommt = false, druck = 0 } = {}) {
      const key = `${kommt}|${druck.toFixed(2)}`;
      if (key === zuletzt) return;
      zuletzt = key;
      mFeld.map = kommt ? an : aus;
      mFeld.color.setScalar(kommt ? 2.2 : 1);
      knopf.position.z = 0.072 - 0.012 * druck;
      blitz.material.opacity = 0.85 * druck;
    },
  };
}

// =====================================================================================
// Straßen
// =====================================================================================
/**
 * Querstraße entlang x mit Fahrspuren (z-Breite), Furt (bei x = 0) mit Blockmarkierung, Haltlinien je Richtung, Bordsteinen.
 * opt: {breite (Einheiten), laenge, spuren (je Richtung), furtBreite, farbe}
 */
export function querstrasse({ breite = 2.7, laenge = 80, spuren = 1, furtBreite = 1.2, farbe = "#7C8497" } = {}) {
  const g = new THREE.Group();
  const asphalt = new THREE.Mesh(new THREE.BoxGeometry(laenge, 0.04, breite), mat(farbe, { rau: 0.92 }));
  asphalt.position.y = -0.02;
  asphalt.receiveShadow = true;
  g.add(asphalt);
  const weiss = mat("#F4F6FA", { rau: 0.6 });
  const strich = (x, z, l, b) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(l, 0.006, b), weiss);
    s.position.set(x, 0.003, z);
    s.receiveShadow = true;
    g.add(s);
  };
  // Mittellinie (bei mehreren Spuren doppelt) und Spurtrenner, nicht in der Furt
  const fh = furtBreite / 2;
  const nSpuren = spuren * 2;
  const spurB = breite / nSpuren;
  for (const seite of [-1, 1]) {
    const x0 = seite < 0 ? -laenge / 2 : fh + 0.9, x1 = seite < 0 ? -fh - 0.9 : laenge / 2;
    if (spuren > 1) {
      for (const dz of [-0.05, 0.05]) strich((x0 + x1) / 2, dz, x1 - x0, 0.035);
      for (let k = 1; k < spuren; k++) for (const s of [-1, 1]) for (let x = x0 + 0.3; x < x1; x += 1.0) strich(x, s * k * spurB, 0.5, 0.035);
    } else {
      for (let x = x0 + 0.3; x < x1; x += 1.0) strich(x, 0, 0.5, 0.04);
    }
  }
  // Haltlinien: Verkehr Richtung +x hält links der Furt (z > 0, rechte Fahrbahnhälfte vom Fahrer aus), Richtung −x rechts (z < 0)
  strich(-fh - 0.55, breite / 4, 0.08, breite / 2 - 0.06);
  strich(fh + 0.55, -breite / 4, 0.08, breite / 2 - 0.06);
  // Furt: Blockmarkierung an beiden Rändern
  for (const sx of [-1, 1]) for (let z = -breite / 2 + 0.1; z < breite / 2 - 0.05; z += 0.22) strich(sx * fh, z + 0.06, 0.07, 0.12);
  // Bordsteine
  const bord = mat("#D9DCE3", { rau: 0.8 });
  for (const sz of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(laenge, 0.07, 0.1), bord);
    b.position.set(0, 0.015, sz * (breite / 2 + 0.05));
    b.receiveShadow = true;
    b.castShadow = true;
    g.add(b);
  }
  return { gruppe: g, spurZ: (richtung, k = 0) => richtung > 0 ? spurB * (k + 0.5) : -spurB * (k + 0.5), haltX: (richtung) => (richtung > 0 ? -fh - 0.62 : fh + 0.62) };
}

// =====================================================================================
// Straßenbahn
// =====================================================================================
/** Niederflur-Straßenbahn (3 Wagen), Fahrtrichtung ±x. Rückgabe {gruppe, setzeTueren(0..1)} */
export function strassenbahn({ farbe = "#E8EDF5", streifen = "#2F6FED", laenge = 9 } = {}) {
  const g = new THREE.Group();
  const n = 3, lw = laenge / n;
  const tueren = [];
  const glas = mat("#22304F", { rau: 0.12, metall: 0.25 });
  for (let i = 0; i < n; i++) {
    const w = new THREE.Group();
    w.position.x = (i - (n - 1) / 2) * (lw + 0.04);
    const k = rundeBox(lw - 0.06, 0.95, 0.82, { farbe, radius: 0.14, segmente: 3 });
    k.position.y = 0.08;
    w.add(k);
    const fenster = rundeBox(lw - 0.3, 0.38, 0.84, { material: glas, radius: 0.06 });
    fenster.position.y = 0.5;
    w.add(fenster);
    const band = rundeBox(lw - 0.08, 0.1, 0.84, { farbe: streifen, radius: 0.03 });
    band.position.y = 0.3;
    w.add(band);
    const dach = rundeBox(lw - 0.5, 0.1, 0.5, { farbe: "#C9D1DE", radius: 0.04 });
    dach.position.y = 1.03;
    w.add(dach);
    // Türen auf der Seite +z (zur Haltestelleninsel bzw. zur Kamera)
    for (const dx of [-lw * 0.22, lw * 0.22]) {
      const t = rundeBox(0.36, 0.72, 0.03, { farbe: "#5C6B85", radius: 0.02 });
      t.position.set(dx, 0.12, 0.43);
      w.add(t);
      tueren.push({ m: t, x0: dx });
    }
    if (i === 0 || i === n - 1) {
      const front = rundeBox(0.08, 0.4, 0.7, { material: glas, radius: 0.04 });
      front.position.set((i === 0 ? -1 : 1) * (lw / 2 - 0.04), 0.5, 0);
      w.add(front);
      const licht = leucht("#FFF4D6", 3);
      for (const dz of [-0.26, 0.26]) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), licht);
        l.position.set((i === 0 ? -1 : 1) * (lw / 2 - 0.01), 0.24, dz);
        w.add(l);
      }
    }
    g.add(w);
  }
  const buegel = rundeBox(0.6, 0.05, 0.05, { farbe: "#5B6375", radius: 0.02 });
  buegel.position.set(0, 1.35, 0);
  buegel.rotation.z = 0.35;
  g.add(buegel);
  g.add(kontaktSchatten(laenge * 1.05, 1.3, 0.35));
  g.traverse((o) => { if (o.isMesh && !o.material.transparent) o.castShadow = true; });
  return {
    gruppe: g,
    setzeTueren(k) { for (const t of tueren) t.m.position.x = t.x0 + (t.x0 < 0 ? -1 : 1) * 0.2 * clamp(k); },
  };
}

// =====================================================================================
// Autoströme mit Rückstau (deterministisch, über einer Uhr c vorberechnet)
// =====================================================================================
/**
 * Spur einer Querstraße: Autos fahren in Richtung `richtung` (±1), halten an der Haltlinie, wenn rot(c) (bzw. gelb,
 * wenn sie noch weit genug weg sind), und stauen sich. Positionen über der Uhr c ∈ [von, bis] im Raster dt.
 * Rückgabe {autos:[{gruppe}], setze(c)} – setze() verschiebt die Autos (außerhalb von ±laenge/2 unsichtbar).
 */
export function autoSpur({ richtung = 1, z = 0.6, halt = -1.2, rot, von = 0, bis = 80, dt = 1 / 30, v = 3.2, a = 7, abstand = 1.45, takt = 2.2, laenge = 60, farben = ["#F2F2F2", "#C9D3E3", "#D6DCE8", "#FFFFFF", "#8FA3C4", "#E6E1D8"], seed = 1, eltern, groesse = 0.85 }) {
  const rnd = (i, k = 0) => { const x = Math.sin((i + 1) * 12.9898 + seed * 78.233 + k * 37.719) * 43758.5453; return x - Math.floor(x); };
  // Einfahrzeiten: Takt mit Streuung; die ersten Autos stehen zu Beginn schon verteilt auf der Spur
  const start = -laenge / 2 - 1;
  const autos = [];
  let tEin = von - (laenge / v) * 1.05;
  for (let i = 0; tEin < bis; i++) {
    autos.push({ ein: tEin, farbe: farben[Math.floor(rnd(i) * farben.length)], s: null, vv: v, laenge: 0.95 + rnd(i, 2) * 0.25 });
    tEin += takt * (0.6 + rnd(i, 1) * 0.9);
  }
  // Simulation: s = zurückgelegter Weg ab Einfahrt (Haltlinie bei sHalt)
  const sHalt = richtung > 0 ? halt - start : -halt - start;
  const n = Math.ceil((bis - von) / dt) + 1;
  const tab = autos.map(() => new Float32Array(n).fill(NaN));
  const vorlauf = Math.ceil(((laenge / v) * 1.1) / dt);
  const zust = autos.map(() => ({ s: null, v }));
  for (let j = -vorlauf; j < n; j++) {
    const c = von + j * dt;
    const r = rot(c);
    for (let i = 0; i < autos.length; i++) {
      const A = autos[i], Z = zust[i];
      if (c < A.ein) continue;
      if (Z.s === null) { Z.s = 0; Z.v = v; }
      let grenze = Infinity;
      const vor = i > 0 ? zust[i - 1] : null;
      if (vor && vor.s !== null && vor.s < laenge + 4) grenze = vor.s - abstand;
      if (r && Z.s <= sHalt + 0.05) grenze = Math.min(grenze, sHalt - (r === "gelb" && sHalt - Z.s < 1.0 ? -99 : 0));
      // Bremsen: so, dass vor der Grenze angehalten wird
      const bremsweg = (Z.v * Z.v) / (2 * a);
      const rest = grenze - Z.s;
      if (rest <= bremsweg + 0.05) Z.v = Math.max(0, Math.min(Z.v, Math.sqrt(Math.max(0, 2 * a * Math.max(0, rest - 0.02)))));
      else Z.v = Math.min(v, Z.v + a * dt);
      Z.s = Math.min(Z.s + Z.v * dt, Math.max(Z.s, grenze));
      if (j >= 0) tab[i][j] = Z.s;
    }
  }
  const gruppe = new THREE.Group();
  if (eltern) eltern.add(gruppe);
  for (const A of autos) {
    A.gruppe = spielzeugAuto({ farbe: A.farbe, laenge: A.laenge });
    A.gruppe.scale.setScalar(groesse);
    A.gruppe.rotation.y = richtung > 0 ? 0 : Math.PI;
    A.gruppe.visible = false;
    gruppe.add(A.gruppe);
  }
  return {
    gruppe, autos,
    setze(c) {
      const k = (c - von) / dt;
      const j = Math.max(0, Math.min(n - 2, Math.floor(k))), f = clamp(k - j);
      autos.forEach((A, i) => {
        const s0 = tab[i][j], s1 = tab[i][j + 1];
        const s = Number.isNaN(s0) ? s1 : Number.isNaN(s1) ? s0 : lerp(s0, s1, f);
        if (Number.isNaN(s) || s > laenge + 2) { A.gruppe.visible = false; return; }
        const x = start + s;
        A.gruppe.visible = true;
        A.gruppe.position.set(richtung > 0 ? x : -x, 0, z);
      });
    },
  };
}

// =====================================================================================
// Kulisse
// =====================================================================================
/** Laterne (Mast mit Leuchtkopf) */
export function laterne({ hoehe = 1.3 } = {}) {
  const g = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, hoehe, 8), MAST());
  mast.position.y = hoehe / 2;
  mast.castShadow = true;
  g.add(mast);
  const arm = rundeBox(0.28, 0.03, 0.04, { farbe: "#3A4152", radius: 0.01 });
  arm.position.set(0.12, hoehe - 0.02, 0);
  g.add(arm);
  const kopf = rundeBox(0.14, 0.04, 0.08, { farbe: "#2A2F3A", radius: 0.015 });
  kopf.position.set(0.24, hoehe - 0.05, 0);
  g.add(kopf);
  return g;
}

/** Tilt-Shift-Fokus: Bildhöhe (0 unten … 1 oben) eines 3D-Punkts für post.tiltMitte */
export function fokusHoehe(punkt, kamera) {
  const v = new THREE.Vector3(...punkt).project(kamera);
  return clamp((v.y + 1) / 2, 0.08, 0.92);
}
