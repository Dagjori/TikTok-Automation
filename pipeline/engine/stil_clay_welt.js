// Stil 3 · Clay-Spielzeug: die belebte Welt (Ergänzung zu stil_clay.js, Three.js).
// Figuren mit echtem Gesicht (Augen mit Lidern und Pupillen, Brauen, Mund mit Lächeln/Offen, Wangen), sitzend, mit Armen per
// Zwei-Knochen-IK und Händen aus stil_clay.js; kleine Fans für die Logen; Tisch, Requisiten, Raum, Wimpelkette.
// Alles prozedural, deterministisch: setze(...) setzt den Zustand ausschließlich aus Parametern.
import * as THREE from "three";
import { TON, ton, teil, rbox, hand, setzeHand, mischeNamen, dunkler, heller } from "./stil_clay.js";

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Y = V3(0, 1, 0);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const kapsel = (r, l) => new THREE.CapsuleGeometry(r, Math.max(0.001, l - 2 * r), 6, 14);

// =====================================================================================
// Gesicht
// =====================================================================================
/** Kopf mit Gesicht. Ursprung = Kopfmitte, Blick nach +z. setze({laecheln -1..1, offD 0..1, offO 0..1, breite, hoch, hochL, hochR, sorge -1..1, lid -0.5..1, blickX, blickY, wangen 0..1}) */
export function gesicht({ haut = "#F4C9A0", haar = TON.haare, haarStil = "kurz", brille = false, augen = TON.tinte, groesse = 1 } = {}) {
  const kopf = new THREE.Group();
  const R = 0.42;
  const hm = ton(haut, { bump: 0.22 });
  const schaedel = teil(new THREE.SphereGeometry(R, 32, 24), hm, 0, 0, 0, kopf);
  schaedel.scale.set(1, 0.97, 0.95);
  for (const s of [-1, 1]) teil(new THREE.SphereGeometry(0.075, 14, 10), hm, s * 0.41, -0.01, -0.02, kopf);
  teil(new THREE.SphereGeometry(0.058, 14, 10), ton(dunkler(haut, 0.93), { bump: 0.2 }), 0, -0.035, 0.396, kopf);
  const wangeM = ton("#EE8478", { bump: 0.1 });
  const wangen = [-1, 1].map((s) => {
    const w = teil(new THREE.SphereGeometry(0.075, 14, 10), wangeM, s * 0.25, -0.1, 0.305, kopf, { werfen: false });
    w.scale.set(1, 0.65, 0.35);
    w.rotation.y = s * 0.75;
    return w;
  });
  const weissM = ton("#FFFFFF", { rau: 0.35, bump: 0 });
  const pupM = ton(augen, { rau: 0.3, bump: 0 });
  const lichtM = ton("#FFFFFF", { rau: 0.2, bump: 0 });
  const augenTeile = [-1, 1].map((s) => {
    const g = new THREE.Group();
    g.position.set(s * 0.165, 0.065, 0.305);
    kopf.add(g);
    const w = teil(new THREE.SphereGeometry(0.1, 20, 14), weissM, 0, 0, 0, g, { werfen: false });
    w.scale.set(1, 1, 0.75);
    const pupG = new THREE.Group();
    g.add(pupG);
    const p = teil(new THREE.SphereGeometry(0.054, 16, 12), pupM, 0, 0, 0.056, pupG, { werfen: false });
    p.scale.set(1, 1, 0.55);
    teil(new THREE.SphereGeometry(0.016, 8, 6), lichtM, 0.02, 0.024, 0.082, pupG, { werfen: false });
    const lidG = new THREE.Group();
    g.add(lidG);
    const lidK = new THREE.Group();
    lidG.add(lidK);
    const lid = teil(new THREE.SphereGeometry(0.108, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), hm, 0, 0, 0, lidK, { werfen: false });
    lid.scale.set(1, 1, 0.8);
    return { s, pupG, lidG, lidK };
  });
  // Brauen
  const brauM = ton(haar, { bump: 0.1 });
  const brauen = [-1, 1].map((s) => {
    const g = new THREE.Group();
    g.position.set(s * 0.165, 0.215, 0.332);
    kopf.add(g);
    const b = teil(kapsel(0.03, 0.18), brauM, 0, 0, 0, g, { werfen: false });
    b.rotation.z = Math.PI / 2;
    return { s, g };
  });
  // Mund
  const mundG = new THREE.Group();
  mundG.position.set(0, -0.178, 0.366);
  kopf.add(mundG);
  const lippe = ton("#A04646", { bump: 0.1 });
  const dunkel = ton("#4A1F27", { bump: 0 });
  const bogenG = new THREE.Group();
  mundG.add(bogenG);
  const arc = Math.PI * 0.8;
  const bogen = teil(new THREE.TorusGeometry(0.1, 0.02, 8, 28, arc), lippe, 0, 0.05, 0, bogenG, { werfen: false });
  bogen.rotation.z = -Math.PI / 2 - arc / 2;
  const strich = teil(kapsel(0.02, 0.17), lippe, 0, 0, 0, mundG, { werfen: false });
  strich.rotation.z = Math.PI / 2;
  const dMund = teil(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), dunkel, 0, 0, 0, mundG, { werfen: false });
  const zunge = teil(new THREE.SphereGeometry(1, 12, 8), ton("#E8707E", { bump: 0.1 }), 0, 0, 0.004, mundG, { werfen: false });
  const oMund = teil(new THREE.SphereGeometry(1, 20, 12), dunkel, 0, 0, 0, mundG, { werfen: false });
  // Haare
  const haarM = ton(haar, { bump: 0.5 });
  const kappe = teil(new THREE.SphereGeometry(0.445, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), haarM, 0, 0.03, -0.03, kopf);
  kappe.rotation.x = -0.32;
  if (haarStil === "kurz") {
    const tolle = teil(new THREE.SphereGeometry(0.17, 16, 12), haarM, 0.06, 0.4, 0.17, kopf);
    tolle.scale.set(1.25, 0.8, 1);
    teil(new THREE.SphereGeometry(0.1, 12, 10), haarM, -0.2, 0.37, 0.2, kopf);
  } else {
    for (const [x, z, h, rx, rz] of [[0, 0.1, 0.3, 0.2, 0], [-0.2, 0.0, 0.26, 0, 0.5], [0.2, 0.02, 0.28, 0, -0.5], [-0.08, -0.15, 0.26, -0.4, 0.2], [0.12, -0.14, 0.24, -0.4, -0.25], [0.0, 0.26, 0.2, 0.7, 0]]) {
      const k = teil(new THREE.ConeGeometry(0.1, h, 10), haarM, x, 0.4, z, kopf);
      k.rotation.set(rx, 0, rz);
    }
  }
  if (brille) {
    const bm = ton("#2A2530", { rau: 0.4, bump: 0 });
    for (const s of [-1, 1]) teil(new THREE.TorusGeometry(0.128, 0.017, 10, 28), bm, s * 0.165, 0.065, 0.388, kopf, { werfen: false });
    const br = teil(kapsel(0.014, 0.09), bm, 0, 0.09, 0.4, kopf, { werfen: false });
    br.rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) {
      const b = teil(kapsel(0.012, 0.3), bm, s * 0.31, 0.07, 0.25, kopf, { werfen: false });
      b.rotation.x = Math.PI / 2 - 0.1;
      b.rotation.z = 0;
    }
  }

  const setze = (p = {}) => {
    const c = p.laecheln ?? 0, offD = p.offD ?? 0, offO = p.offO ?? 0, breite = p.breite ?? 1;
    const sorge = p.sorge ?? 0, hoch = p.hoch ?? 0, lid = p.lid ?? 0, wang = p.wangen ?? 0;
    // Mund
    const zeigeD = offD > 0.03, zeigeO = offO > 0.03;
    bogenG.visible = !zeigeD && !zeigeO && Math.abs(c) > 0.14;
    bogenG.scale.set(breite * (0.85 + 0.3 * Math.abs(c)), c * 0.9, 1);
    strich.visible = !zeigeD && !zeigeO && Math.abs(c) <= 0.14;
    strich.scale.set(1, breite, 1);
    dMund.visible = zeigeD;
    zunge.visible = zeigeD;
    if (zeigeD) {
      const w = 0.105 * breite * (0.85 + 0.3 * Math.max(0, c)), h = 0.015 + 0.13 * offD;
      dMund.position.y = 0.045 * clamp(c, 0, 1);
      dMund.scale.set(w, h, 0.05);
      zunge.position.set(0, dMund.position.y - h * 0.62, 0.012);
      zunge.scale.set(w * 0.55, h * 0.3, 0.035);
    }
    oMund.visible = zeigeO;
    if (zeigeO) oMund.scale.set(0.05 + 0.045 * offO, 0.025 + 0.075 * offO, 0.05);
    // Wangen
    wangen.forEach((w) => { w.visible = wang > 0.04; w.scale.set(1.0 + 0.3 * wang, 0.65 + 0.2 * wang, 0.35); });
    // Brauen
    brauen.forEach((b) => {
      const extra = b.s < 0 ? (p.hochL ?? 0) : (p.hochR ?? 0);
      b.g.position.y = 0.215 + (hoch + extra) * 0.07 - Math.max(0, -sorge) * 0.02;
      b.g.rotation.z = -b.s * sorge * 0.55;
    });
    // Augen
    const bx = p.blickX ?? 0, by = p.blickY ?? 0;
    augenTeile.forEach((a) => {
      a.pupG.rotation.y = bx * 0.5;
      a.pupG.rotation.x = -by * 0.42;
      a.lidG.rotation.z = -a.s * sorge * 0.3;
      const zu = clamp(lid, -0.6, 1);
      a.lidK.rotation.x = lerp(-1.25, 1.45, clamp(zu, 0, 1)) + (zu < 0 ? zu * 0.5 : 0);
    });
  };
  setze({});
  kopf.scale.setScalar(groesse);
  return { gruppe: kopf, setze, R };
}

// =====================================================================================
// Zwei-Knochen-IK
// =====================================================================================
function ik(S, W, L1, L2, pol) {
  const d = W.clone().sub(S);
  let dist = d.length();
  const u = dist > 1e-5 ? d.clone().divideScalar(dist) : V3(0, 0, 1);
  dist = Math.min(L1 + L2 - 1e-3, Math.max(Math.abs(L1 - L2) + 1e-3, dist));
  const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  let p = pol.clone().addScaledVector(u, -pol.dot(u));
  if (p.lengthSq() < 1e-6) p = V3(0, -1, 0).addScaledVector(u, u.y);
  p.normalize();
  const E = S.clone().addScaledVector(u, a).addScaledVector(p, h);
  const Wn = S.clone().addScaledVector(u, dist);
  return { E, W: Wn };
}
const _m = new THREE.Matrix4();
function legeSegment(mesh, A, B) {
  mesh.position.copy(A).add(B).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(Y, B.clone().sub(A).normalize());
}
function legeHand(h, W, dir, hint) {
  const y = dir.clone().normalize();
  let z = hint.clone().addScaledVector(y, -hint.dot(y));
  if (z.lengthSq() < 1e-6) z = V3(0, 0, 1);
  z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  _m.makeBasis(x, y, z);
  h.quaternion.setFromRotationMatrix(_m);
  h.position.copy(W);
}

// =====================================================================================
// Figur (sitzend, am Tisch)
// =====================================================================================
export const MASSE = { schulterX: 0.56, schulterY: 0.92, oberarm: 0.88, unterarm: 0.98, handS: 0.56, kopfY: 1.58 };

/**
 * Sitzende Figur. Ursprung = Sitzfläche, Blick nach +z, danach um y gedreht (yaw). Die Arme werden in Welt-Koordinaten gesteuert.
 * setze({ gesicht:{…}, kopf:{nick, neig, dreh}, rumpf:{lehn, wipp, hoch}, arme:{ innen:{ziel:[x,y,z] (Welt), hint:[x,y,z] (Welt), pose:{stein:1}, quetsch, wackeln, neigung}, aussen:{…} } })
 */
export function figur({ farbe, haut = "#F4C9A0", haar = TON.haare, haarStil = "kurz", brille = false, yaw = 0, ort = [0, 0, 0], pullover = "pullover" } = {}) {
  const wurzel = new THREE.Group();
  wurzel.position.set(...ort);
  wurzel.rotation.y = yaw;
  const rumpf = new THREE.Group();
  rumpf.position.set(0, 0.05, 0);
  wurzel.add(rumpf);
  const stoff = ton(farbe, { bump: 0.5 });
  const stoffDunkel = ton(dunkler(farbe, 0.8), { bump: 0.5 });
  const stoffHell = ton(heller(farbe, 0.45), { bump: 0.4 });
  // Hocker
  teil(new THREE.CylinderGeometry(0.62, 0.55, 0.2, 28), ton(TON.holz), 0, -0.12, 0, wurzel);
  // Oberkörper
  const torso = teil(kapsel(0.5, 1.22), stoff, 0, 0.52, 0, rumpf);
  torso.scale.set(1, 1, 0.8);
  const streifen = teil(new THREE.TorusGeometry(0.5, 0.045, 10, 36), stoffHell, 0, 0.6, 0, rumpf);
  streifen.rotation.x = Math.PI / 2;
  streifen.scale.set(1, 0.8, 1);
  if (pullover === "kapuze") {
    const tasche = teil(rbox(0.62, 0.3, 0.1, 0.06), stoffDunkel, 0, 0.3, 0.37, rumpf);
    tasche.rotation.x = -0.1;
    const hoodie = teil(new THREE.SphereGeometry(0.3, 18, 12), stoffDunkel, 0, 1.07, -0.14, rumpf);
    hoodie.scale.set(1.2, 0.7, 0.8);
  }
  teil(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 16), ton(haut), 0, 1.15, 0.0, rumpf);
  const kragen = teil(new THREE.TorusGeometry(0.2, 0.06, 10, 28), stoffHell, 0, 1.06, 0.0, rumpf);
  kragen.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) teil(new THREE.SphereGeometry(0.19, 16, 12), stoff, s * MASSE.schulterX, MASSE.schulterY, 0, rumpf);
  // Kopf
  const kg = gesicht({ haut, haar, haarStil, brille });
  const kopfG = new THREE.Group();
  kopfG.position.set(0, MASSE.kopfY, 0.04);
  kopfG.add(kg.gruppe);
  rumpf.add(kopfG);
  // Arme
  const armTeil = (s) => {
    const g = new THREE.Group();
    wurzel.add(g);
    const ober = teil(kapsel(0.155, MASSE.oberarm), stoff, 0, 0, 0, g);
    const unter = teil(kapsel(0.135, MASSE.unterarm), stoffDunkel, 0, 0, 0, g);
    const h = hand({ farbe: haut, manschette: stoffHell, arm: false, manschetteR: 0.34 });
    h.scale.set(s > 0 ? -MASSE.handS : MASSE.handS, MASSE.handS, MASSE.handS); // rechte Hand liegt auf lokal −x (Blick +z)
    g.add(h);
    return { s, g, ober, unter, h };
  };
  const innenS = Math.sign(yaw) || 1;
  const arme = { innen: armTeil(innenS), aussen: armTeil(-innenS) };
  const lokal = (w) => { // Welt → lokal (nur yaw und Ort)
    const v = V3(...w).sub(wurzel.position);
    const c = Math.cos(-yaw), s = Math.sin(-yaw);
    return V3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
  };
  const lokalRicht = (w) => {
    const v = V3(...w);
    const c = Math.cos(-yaw), s = Math.sin(-yaw);
    return V3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
  };
  const setze = (p = {}) => {
    const rp = p.rumpf || {};
    rumpf.rotation.set(rp.lehn || 0, 0, rp.wipp || 0);
    rumpf.position.y = 0.05 + (rp.hoch || 0);
    const kp = p.kopf || {};
    kg.gruppe.rotation.set(kp.nick || 0, kp.dreh || 0, kp.neig || 0);
    kg.setze(p.gesicht || {});
    for (const [name, a] of Object.entries(arme)) {
      const ap = (p.arme || {})[name];
      if (!ap) { a.g.visible = false; continue; }
      a.g.visible = true;
      // Schulter folgt dem Rumpf
      const S = V3(a.s * MASSE.schulterX, MASSE.schulterY, 0).sub(V3(0, 0, 0)).applyEuler(rumpf.rotation).add(V3(0, rumpf.position.y, 0));
      const Wl = lokal(ap.ziel);
      const pol = ap.pol ? lokalRicht(ap.pol) : V3(a.s * 0.55, -0.85, -0.35);
      const r = ik(S, Wl, MASSE.oberarm, MASSE.unterarm, pol);
      legeSegment(a.ober, S, r.E);
      legeSegment(a.unter, r.E, r.W);
      legeHand(a.h, r.W, r.W.clone().sub(r.E), lokalRicht(ap.hint || [0, 0.2, 1]));
      setzeHand(a.h.children.length ? a.h : a.h, mischeNamen(ap.pose || { stein: 1 }), { quetsch: ap.quetsch ?? 1, wackeln: ap.wackeln ?? 0, neigung: ap.neigung ?? 0, pump: 0 });
    }
  };
  return { gruppe: wurzel, setze, kopf: kg, rumpf, arme, lokal };
}

// =====================================================================================
// Fan (klein, für die Logen)
// =====================================================================================
export function fan({ farbe, haut = "#F0C196", haar = TON.haare, haarStil = "kurz", brille = false, fahne = null, groesse = 0.66, yaw = 0 } = {}) {
  const wurzel = new THREE.Group();
  const k = new THREE.Group();
  k.scale.setScalar(groesse);
  k.rotation.y = yaw;
  wurzel.add(k);
  const rumpf = new THREE.Group();
  k.add(rumpf);
  const stoff = ton(farbe, { bump: 0.5 });
  const torso = teil(kapsel(0.46, 1.1), stoff, 0, 0.5, 0, rumpf, { werfen: false });
  torso.scale.set(1, 1, 0.78);
  teil(new THREE.CylinderGeometry(0.13, 0.15, 0.2, 14), ton(haut), 0, 1.12, 0, rumpf, { werfen: false });
  const kg = gesicht({ haut, haar, haarStil, brille });
  const kopfG = new THREE.Group();
  kopfG.position.set(0, MASSE.kopfY - 0.04, 0.04);
  kopfG.add(kg.gruppe);
  rumpf.add(kopfG);
  // Arme: Schulter-Gelenk, Oberarm+Unterarm als eine Kapsel mit leichtem Knick (einfach, Hände als Kugeln)
  const arme = [-1, 1].map((s) => {
    const sg = new THREE.Group();
    sg.position.set(s * 0.52, 0.88, 0);
    rumpf.add(sg);
    const ober = teil(kapsel(0.14, 0.66), stoff, 0, -0.33, 0, sg, { werfen: false });
    const eg = new THREE.Group();
    eg.position.set(0, -0.66, 0);
    sg.add(eg);
    const unter = teil(kapsel(0.125, 0.6), stoff, 0, -0.3, 0, eg, { werfen: false });
    const h = teil(new THREE.SphereGeometry(0.16, 14, 10), ton(haut), 0, -0.62, 0, eg, { werfen: false });
    return { s, sg, eg, ober, unter, h };
  });
  let flagge = null;
  if (fahne) {
    const a = arme[0];
    const stab = teil(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), ton(TON.holz), 0, -0.62 + 0.55, 0.0, a.eg, { werfen: false });
    const tuch = new THREE.Mesh(new THREE.CircleGeometry(0.34, 3), new THREE.MeshStandardMaterial({ color: fahne, roughness: 0.8, side: THREE.DoubleSide }));
    tuch.rotation.z = -Math.PI / 2 + Math.PI / 6 * 0; // Dreieck zeigt nach +x
    tuch.position.set(0.3 * (a.s > 0 ? 1 : -1), -0.62 + 1.1, 0);
    tuch.rotation.z = a.s > 0 ? 0 : Math.PI;
    a.eg.add(tuch);
    flagge = { stab, tuch };
  }
  /** p: { gesicht, kopf, hoch (Sprung), lehn, arm: [{x, z, ell}, …] Winkel je Arm (x = nach vorn/oben, z = zur Seite, ell = Ellbogen) } */
  const setze = (p = {}) => {
    rumpf.position.y = p.hoch || 0;
    rumpf.rotation.set(p.lehn || 0, 0, p.wipp || 0);
    const kp = p.kopf || {};
    kg.gruppe.rotation.set(kp.nick || 0, kp.dreh || 0, kp.neig || 0);
    kg.setze(p.gesicht || {});
    arme.forEach((a, i) => {
      const q = (p.arm || [])[i] || {};
      a.sg.rotation.set(-(q.x || 0), 0, (q.z ?? 0) * a.s * -1 + a.s * 0.15);
      a.eg.rotation.set(-(q.ell || 0), 0, 0);
    });
  };
  setze({});
  return { gruppe: wurzel, setze, kopf: kg, arme, flagge };
}

// =====================================================================================
// Requisiten
// =====================================================================================
/** Würfelbecher (offen, Leder) */
export function becher({ farbe = "#7A4B2E" } = {}) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.85, side: THREE.DoubleSide });
  const mantel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.23, 0.56, 28, 1, true), m);
  mantel.position.y = 0.28;
  mantel.castShadow = true;
  g.add(mantel);
  const boden = new THREE.Mesh(new THREE.CircleGeometry(0.23, 24), m);
  boden.rotation.x = -Math.PI / 2;
  boden.position.y = 0.012;
  g.add(boden);
  const rand = teil(new THREE.TorusGeometry(0.3, 0.025, 8, 28), ton(dunkler(farbe, 0.8)), 0, 0.56, 0, g);
  rand.rotation.x = Math.PI / 2;
  const band = teil(new THREE.TorusGeometry(0.265, 0.02, 8, 28), ton("#E9D3A6"), 0, 0.3, 0, g);
  band.rotation.x = Math.PI / 2;
  return g;
}
/** Notizblock mit Bleistift (Taktik) */
export function notizblock({ deckel = TON.rot } = {}) {
  const g = new THREE.Group();
  teil(rbox(0.95, 0.06, 1.2, 0.03), ton(deckel), 0, 0.03, 0, g);
  teil(rbox(0.86, 0.05, 1.1, 0.02), ton("#FFF8E8", { bump: 0.1 }), 0, 0.075, 0, g);
  for (let i = 0; i < 6; i++) teil(rbox(0.64, 0.006, 0.02, 0.003), ton("#9AA3B8", { bump: 0 }), 0, 0.105, -0.4 + i * 0.16, g, { werfen: false });
  const stift = new THREE.Group();
  teil(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 10), ton("#F2B134"), 0, 0, 0, stift).rotation.z = Math.PI / 2;
  const spitze = teil(new THREE.ConeGeometry(0.035, 0.1, 10), ton("#E8C9A0"), 0.45, 0, 0, stift);
  spitze.rotation.z = -Math.PI / 2;
  stift.position.set(0.3, 0.13, 0.3);
  stift.rotation.y = 0.5;
  g.add(stift);
  g.userData.stift = stift;
  return g;
}
/** Tasse */
export function tasse({ farbe = "#F2E8D8" } = {}) {
  const g = new THREE.Group();
  teil(new THREE.CylinderGeometry(0.17, 0.14, 0.26, 20), ton(farbe), 0, 0.13, 0, g);
  teil(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 20), ton("#5A3A2A", { bump: 0 }), 0, 0.255, 0, g);
  const henkel = teil(new THREE.TorusGeometry(0.08, 0.025, 8, 16, Math.PI), ton(farbe), 0.17, 0.14, 0, g);
  henkel.rotation.z = -Math.PI / 2;
  return g;
}

// =====================================================================================
// Tisch, Raum, Loge, Wimpel
// =====================================================================================
export function spieltisch({ breite = 4.9 } = {}) {
  const g = new THREE.Group();
  teil(rbox(breite + 0.3, 0.2, 2.8, 0.08), ton(TON.holz), 0, 1.5, 0.32, g);
  teil(rbox(breite, 0.07, 2.5, 0.05), ton("#6F9A7C", { bump: 0.6, rau: 0.95 }), 0, 1.62, 0.32, g);
  teil(rbox(breite + 0.1, 0.55, 0.12, 0.05), ton(dunkler(TON.holz, 0.88)), 0, 1.2, 1.64, g);
  for (const x of [-1, 1]) teil(new THREE.CylinderGeometry(0.14, 0.1, 1.45, 14), ton(dunkler(TON.holz, 0.8)), x * (breite / 2 - 0.1), 0.72, 1.45, g);
  return g;
}
const tex = new Map();
function leinwandTextur(key, w, h, zeichne, wdh = [1, 1]) {
  if (tex.has(key)) return tex.get(key);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  zeichne(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...wdh);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  tex.set(key, t);
  return t;
}
/** Wand mit Streifentapete, Fußleiste; Boden mit Dielen; Teppich */
export function raumWelt({ wand = "#8B86B5", streifen = "#938EBF", boden = "#C79B6A" } = {}) {
  const g = new THREE.Group();
  const wt = leinwandTextur("wand" + wand, 256, 256, (c, w, h) => {
    c.fillStyle = wand; c.fillRect(0, 0, w, h);
    c.fillStyle = streifen;
    for (let i = 0; i < 8; i++) c.fillRect(i * 32 + 16, 0, 16, h);
    let s = 99; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.04})`; c.beginPath(); c.arc(r() * w, r() * h, 1 + r() * 3, 0, 7); c.fill(); }
  }, [5, 4]);
  const wm = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.95 }));
  wm.position.set(0, 6, -3.5);
  wm.receiveShadow = true;
  g.add(wm);
  teil(rbox(16, 2.2, 0.18, 0.04), ton("#E5D2B0", { bump: 0.3 }), 0, 1.1, -3.4, g, { werfen: false });
  teil(rbox(16, 0.14, 0.26, 0.04), ton("#C9A86F"), 0, 2.25, -3.36, g, { werfen: false });
  const bt = leinwandTextur("boden" + boden, 512, 256, (c, w, h) => {
    c.fillStyle = boden; c.fillRect(0, 0, w, h);
    let s = 7; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 8; i++) { c.fillStyle = `rgba(80,45,15,${0.1 + r() * 0.1})`; c.fillRect(0, i * 32, w, 2); c.fillStyle = `rgba(255,235,200,${0.05 + r() * 0.07})`; c.fillRect(0, i * 32 + 3, w, 14); }
    for (let i = 0; i < 28; i++) { c.fillStyle = "rgba(80,45,15,0.12)"; c.fillRect(r() * w, Math.floor(r() * 8) * 32, 2, 32); }
  }, [3, 3]);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.9 }));
  fl.rotation.x = -Math.PI / 2;
  fl.position.set(0, 0, 2.5);
  fl.receiveShadow = true;
  g.add(fl);
  // Teppich aus Ringen
  const ring = (r0, r1, farbe) => { const m = teil(new THREE.CylinderGeometry(r1, r1, 0.04, 56), ton(farbe, { bump: 0.7 }), 0, 0.03, 0.4, g, { werfen: false }); m.position.y = 0.03 + (4 - r1) * 0.002; return m; };
  ring(0, 3.7, "#4E3F7A"); ring(0, 3.4, "#F2E4CC"); ring(0, 3.1, "#6A5AA0"); ring(0, 2.1, "#F2E4CC"); ring(0, 1.9, "#4E3F7A");
  return g;
}
/** Loge: Rückwand, Brüstung, Konsolen. breite in x */
export function loge({ breite = 2.2, hoehe = 1.25 } = {}) {
  const g = new THREE.Group();
  teil(rbox(breite, hoehe, 0.18, 0.05), ton("#6B5640", { bump: 0.5 }), 0, hoehe / 2, 0, g, { werfen: false });
  teil(rbox(breite + 0.2, 0.1, 0.8, 0.04), ton(TON.holz), 0, 0.05, 0.4, g);
  teil(rbox(breite + 0.2, 0.55, 0.14, 0.05), ton("#B98B55"), 0, 0.37, 0.8, g);
  teil(rbox(breite + 0.3, 0.1, 0.24, 0.04), ton("#D6B07A"), 0, 0.68, 0.8, g);
  for (const s of [-1, 1]) teil(rbox(0.16, 0.5, 0.7, 0.04), ton(dunkler(TON.holz, 0.85)), s * (breite / 2 - 0.1), -0.25, 0.4, g);
  return g;
}
/** Wimpelkette entlang einer Kettenlinie von (x0,y) nach (x1,y), n Wimpel in den Farben liste */
export function wimpelkette({ x0 = -3.4, x1 = 3.4, y = 6.9, durchhang = 0.45, n = 13, farben = [TON.rot, "#F2E4CC", TON.cyan] } = {}) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(V3(lerp(x0, x1, u), y - durchhang * 4 * u * (1 - u), -3.0)); }
  const kurve = new THREE.CatmullRomCurve3(pts);
  teil(new THREE.TubeGeometry(kurve, 40, 0.014, 6, false), ton("#5A4A3A", { bump: 0 }), 0, 0, 0, g, { werfen: false });
  const fl = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const p = kurve.getPoint(u);
    const wg = new THREE.Group();
    wg.position.copy(p);
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.26, 3), new THREE.MeshStandardMaterial({ color: farben[i % farben.length], roughness: 0.85, side: THREE.DoubleSide }));
    m.rotation.z = Math.PI / 2 + Math.PI; // Spitze nach unten
    m.position.y = -0.2;
    m.castShadow = false;
    wg.add(m);
    g.add(wg);
    fl.push(wg);
  }
  g.userData.fahnen = fl;
  return g;
}
/** Pflanze im Topf (Clay) */
export function pflanze({ topf = "#D98A5B", blatt = "#5FA06A", groesse = 1 } = {}) {
  const g = new THREE.Group();
  teil(new THREE.CylinderGeometry(0.28, 0.2, 0.36, 20), ton(topf), 0, 0.18, 0, g);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, h = 0.45 + (i % 3) * 0.15;
    const b = teil(new THREE.SphereGeometry(0.17, 14, 10), ton(blatt), Math.cos(a) * 0.14, 0.5 + h * 0.4, Math.sin(a) * 0.14, g);
    b.scale.set(0.7, h * 1.6, 0.4);
    b.rotation.set(Math.sin(a) * 0.6, a, -Math.cos(a) * 0.6);
  }
  g.scale.setScalar(groesse);
  return g;
}

// =====================================================================================
// Katze (Clay): liegt auf dem Teppich, hebt den Kopf, wedelt mit dem Schwanz, folgt dem Würfel mit den Ohren
// =====================================================================================
export function katze({ fell = "#E8A15A", hell = "#FFF1DC", groesse = 1 } = {}) {
  const g = new THREE.Group();
  const k = new THREE.Group();
  g.add(k);
  const fm = ton(fell, { bump: 0.7 }), hm = ton(hell, { bump: 0.5 });
  const koerper = teil(new THREE.SphereGeometry(0.5, 24, 16), fm, 0, 0.36, 0, k);
  koerper.scale.set(1.0, 0.72, 1.45);
  const bauch = teil(new THREE.SphereGeometry(0.34, 16, 12), hm, 0, 0.3, 0.32, k);
  bauch.scale.set(1, 0.7, 1);
  // Kopf
  const kopf = new THREE.Group();
  kopf.position.set(0, 0.62, 0.62);
  k.add(kopf);
  teil(new THREE.SphereGeometry(0.34, 24, 16), fm, 0, 0, 0, kopf);
  const schnauze = teil(new THREE.SphereGeometry(0.15, 14, 10), hm, 0, -0.1, 0.27, kopf);
  schnauze.scale.set(1.2, 0.8, 0.7);
  teil(new THREE.SphereGeometry(0.045, 10, 8), ton("#E87F8C", { bump: 0 }), 0, -0.03, 0.37, kopf);
  const ohren = [-1, 1].map((s) => {
    const o = new THREE.Group();
    o.position.set(s * 0.21, 0.27, 0.0);
    kopf.add(o);
    const e = teil(new THREE.ConeGeometry(0.13, 0.26, 12), fm, 0, 0.1, 0, o);
    e.scale.set(1, 1, 0.55);
    const i = teil(new THREE.ConeGeometry(0.075, 0.17, 10), ton("#F2A6A6", { bump: 0 }), 0, 0.09, 0.03, o);
    i.scale.set(1, 1, 0.4);
    o.rotation.z = -s * 0.25;
    return { o, s };
  });
  const augen = [-1, 1].map((s) => {
    const a = teil(new THREE.SphereGeometry(0.06, 12, 10), ton("#2A2530", { rau: 0.3, bump: 0 }), s * 0.13, 0.05, 0.3, kopf, { werfen: false });
    teil(new THREE.SphereGeometry(0.018, 8, 6), ton("#FFFFFF", { bump: 0 }), 0.02, 0.025, 0.05, a, { werfen: false });
    return a;
  });
  for (const s of [-1, 1]) for (const dy of [-0.02, 0.03]) {
    const w = teil(kapsel(0.006, 0.28), ton("#FFFFFF", { bump: 0 }), s * 0.3, -0.05 + dy, 0.28, kopf, { werfen: false });
    w.rotation.z = Math.PI / 2 + s * dy * 2;
  }
  // Pfoten
  for (const s of [-1, 1]) teil(new THREE.SphereGeometry(0.14, 12, 10), hm, s * 0.2, 0.14, 0.85, k);
  // Schwanz: Kette aus Kugeln
  const schwanz = [];
  for (let i = 0; i < 7; i++) {
    const m = teil(new THREE.SphereGeometry(0.11 - i * 0.006, 10, 8), fm, 0, 0, 0, k);
    schwanz.push(m);
  }
  g.scale.setScalar(groesse);
  /** p: { kopf (0 liegt … 1 aufmerksam), wedel (Phase), amp, auf (Augen 0..1), ohr (Zucken), dreh (Kopf yaw) } */
  const setze = (p = {}) => {
    const wach = p.kopf ?? 0;
    kopf.position.set(0, 0.55 + 0.2 * wach, 0.62 - 0.1 * wach);
    kopf.rotation.set(-0.15 * wach, p.dreh ?? 0, p.neig ?? 0);
    augen.forEach((a) => { a.scale.set(1, Math.max(0.12, p.auf ?? 0.2), 1); });
    ohren.forEach((e) => { e.o.rotation.z = -e.s * (0.25 + 0.15 * (p.ohr ?? 0) * (e.s > 0 ? 1 : -0.5)); e.o.rotation.x = -0.15 * wach; });
    for (let i = 0; i < schwanz.length; i++) {
      const u = i / (schwanz.length - 1);
      const a = (p.amp ?? 0.25) * Math.sin((p.wedel ?? 0) - u * 2.2) * (0.3 + u);
      schwanz[i].position.set(a * u * 1.2 + 0.0, 0.26 + 0.3 * Math.sin(u * 1.3) * (0.6 + (p.hochSchwanz ?? 0)), -0.62 - u * 0.75);
    }
  };
  setze({});
  return { gruppe: g, setze };
}
