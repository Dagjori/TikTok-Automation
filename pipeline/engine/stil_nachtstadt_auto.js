// Stil 17 Nachtstadt-Miniatur · Erweiterung „Auto“ (07.11.2026, Simulierbar „Elektroauto oder Benziner“): Ladesäule, Zapfsäule mit Dach,
// Wohnhaus mit Wallbox und Solardach. Alles ohne Marken und ohne Logos. Front der Objekte zeigt nach +x (zur Straße), Wohnhaus und Säulen
// stehen am Straßenrand. Leuchtende Teile teilen sich Materialien; led(k) bzw. solar(k) setzen die Helligkeit (k = 0–1,5).
import * as THREE from "three";
import { leuchtMat, lichtPfuetze, lichtKegel } from "./sim_atmosphaere.js";

const speicher = new Map();
const mat = (key, bau) => { if (!speicher.has(key)) speicher.set(key, bau()); return speicher.get(key); };
const std = (key, o) => mat(key, () => new THREE.MeshStandardMaterial(o));
const box = (g, w, h, d, x, y, z, m, schatten = true) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = schatten; b.receiveShadow = true; g.add(b); return b; };

/** Schnellladesäule (Front +x): dunkler Korpus, Display, Lichtleiste in Teamfarbe, Kabelhalter. led(k) */
export function ladeSaeule({ farbe = "#22C6F2", hoehe = 0.95 } = {}) {
  const g = new THREE.Group();
  const korpus = std("lsK", { color: "#1D222B", roughness: 0.4, metalness: 0.65 });
  const kante = std("lsC", { color: "#0E1117", roughness: 0.6, metalness: 0.3 });
  box(g, 0.34, 0.05, 0.4, 0, 0.025, 0, kante);
  box(g, 0.2, hoehe, 0.26, 0, 0.05 + hoehe / 2, 0, korpus);
  box(g, 0.24, 0.06, 0.3, 0, 0.05 + hoehe + 0.03, 0, kante);
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(4), fog: false });
  const led = [];
  const bar = (b, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), ledMat); m.position.set(x, y, z); g.add(m); led.push(m); };
  bar(0.012, hoehe * 0.8, 0.012, 0.104, 0.05 + hoehe * 0.5, -0.1);
  bar(0.012, hoehe * 0.8, 0.012, 0.104, 0.05 + hoehe * 0.5, 0.1);
  bar(0.02, 0.02, 0.26, 0.1, 0.05 + hoehe + 0.065, 0);
  const schirm = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color("#BFEFFF").multiplyScalar(1.6), fog: false }));
  schirm.rotation.y = Math.PI / 2; schirm.position.set(0.102, 0.05 + hoehe * 0.68, 0); g.add(schirm);
  const stecker = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 12), kante);
  stecker.rotation.z = Math.PI / 2; stecker.position.set(0.13, 0.05 + hoehe * 0.38, 0.04); g.add(stecker);
  const kabel = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.1, 0.05 + hoehe * 0.38, 0.04), new THREE.Vector3(0.25, 0.3, 0.1), new THREE.Vector3(0.18, 0.06, 0.16)]), 24, 0.012, 6), kante);
  g.add(kabel);
  const p = lichtPfuetze({ radius: 0.8, farbe, staerke: 0.6, streckung: 0.9 }); p.position.set(0.4, 0.012, 0); g.add(p);
  g.led = (k) => { ledMat.color.set(farbe).multiplyScalar(2.2 + 3.2 * k); };
  g.userData = { hoehe: 0.05 + hoehe, kopf: new THREE.Vector3(0.12, 0.05 + hoehe + 0.2, 0) };
  return g;
}

/** Zapfsäule mit Tankstellendach (Front +x): Korpus, Display, Zapfhahn, Dach mit leuchtender Unterseite und Kante in Teamfarbe */
export function zapfSaeule({ farbe = "#FF8A3D", dach = true } = {}) {
  const g = new THREE.Group();
  const korpus = std("zsK", { color: "#2B2F38", roughness: 0.45, metalness: 0.55 });
  const kante = std("zsC", { color: "#0E1117", roughness: 0.6, metalness: 0.3 });
  const insel = std("zsI", { color: "#3A3F48", roughness: 0.85 });
  box(g, 0.5, 0.05, 0.5, 0.05, 0.025, 0, insel);
  box(g, 0.2, 0.62, 0.3, 0, 0.05 + 0.31, 0, korpus);
  const band = new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(3.2), fog: false });
  const m1 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.5, 0.26), band); m1.position.set(0.104, 0.05 + 0.31, 0); g.add(m1);
  const schirm = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.13), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFD9B8").multiplyScalar(1.6), fog: false }));
  schirm.rotation.y = Math.PI / 2; schirm.position.set(0.108, 0.05 + 0.5, 0); g.add(schirm);
  const hahn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 10), kante);
  hahn.rotation.z = Math.PI / 5; hahn.position.set(0.14, 0.05 + 0.34, 0.1); g.add(hahn);
  const schlauch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.1, 0.05 + 0.36, 0.1), new THREE.Vector3(0.22, 0.3, 0.15), new THREE.Vector3(0.18, 0.08, 0.2)]), 20, 0.012, 6), kante);
  g.add(schlauch);
  const dachMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFE2C4").multiplyScalar(1.5), fog: false });
  if (dach) {
    for (const z of [-0.45, 0.45]) box(g, 0.05, 1.18, 0.05, 0.3, 0.59, z, korpus);
    box(g, 1.15, 0.06, 1.05, 0.3, 1.2, 0, korpus);
    const unten = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.95), dachMat); unten.rotation.x = Math.PI / 2; unten.position.set(0.3, 1.165, 0); g.add(unten);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.17, 0.025, 1.07), band); rim.position.set(0.3, 1.215, 0); g.add(rim);
    const k = lichtKegel({ hoehe: 1.15, radiusOben: 0.35, radiusUnten: 0.8, farbe: "#FFD2A0", staerke: 0.2 }); k.position.set(0.3, 1.16, 0); g.add(k);
  }
  const p = lichtPfuetze({ radius: 1.0, farbe: "#FFC58A", staerke: 0.75, streckung: 1 }); p.position.set(0.35, 0.012, 0); g.add(p);
  g.userData = { kopf: new THREE.Vector3(0.12, 1.4, 0) };
  return g;
}

/**
 * Wohnhaus mit Satteldach (Front +x zur Straße, First entlang z): warme Fenster, Tür, optional Wallbox (Teamfarbe) mit Kabel und
 * optional Solarmodule auf der Straßenseite des Daches. led(k) = Wallbox, solar(k) = Modulglühen.
 */
export function wohnHaus({ farbe = "#22C6F2", wallbox = true, solar = false, wand = "#B9C1CF", seed = 1 } = {}) {
  const g = new THREE.Group();
  const putz = std("whP|" + wand, { color: wand, roughness: 0.9 });
  const dunkel = std("whD", { color: "#1F242E", roughness: 0.6 });
  const ziegel = std("whZ", { color: "#2A2E39", roughness: 0.75, metalness: 0.1 });
  const DX = 1.1, DZ = 1.7, H = 0.9, DH = 0.55;
  box(g, DX, H, DZ, 0, H / 2, 0, putz);
  box(g, DX + 0.06, 0.04, DZ + 0.06, 0, H + 0.02, 0, dunkel, false);
  const warm = leuchtMat("#FFC27A", 2.4);
  const front = DX / 2;
  for (const z of [-0.5, 0.18]) {
    box(g, 0.02, 0.34, 0.36, front + 0.01, 0.58, z, dunkel, false);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.28), warm); p.rotation.y = Math.PI / 2; p.position.set(front + 0.025, 0.58, z); g.add(p);
    const pf = lichtPfuetze({ radius: 0.45, farbe: "#FFB574", staerke: 0.3, streckung: 0.8 }); pf.position.set(front + 0.5, 0.014, z); g.add(pf);
  }
  box(g, 0.02, 0.56, 0.3, front + 0.012, 0.28, 0.62, std("whT", { color: "#4A3A30", roughness: 0.7 }), false);
  const lampe = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.07), leuchtMat("#FFD7A6", 5)); lampe.rotation.y = Math.PI / 2; lampe.position.set(front + 0.03, 0.66, 0.42); g.add(lampe);
  // Satteldach (First entlang z)
  const sh = new THREE.Shape(); sh.moveTo(-DX / 2 - 0.1, 0); sh.lineTo(DX / 2 + 0.1, 0); sh.lineTo(0, DH); sh.closePath();
  const dg = new THREE.ExtrudeGeometry(sh, { depth: DZ + 0.2, bevelEnabled: false }); dg.translate(0, 0, -(DZ + 0.2) / 2);
  const dach = new THREE.Mesh(dg, ziegel); dach.position.y = H; dach.castShadow = true; dach.receiveShadow = true; g.add(dach);
  const alpha = Math.atan2(DH, DX / 2 + 0.1);
  const glimm = new THREE.MeshStandardMaterial({ color: "#0B1A38", roughness: 0.22, metalness: 0.75, emissive: new THREE.Color(farbe), emissiveIntensity: 0.0, envMapIntensity: 1.3 });
  if (solar) {
    const L = Math.hypot(DX / 2 + 0.1, DH);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
      const s = L * (0.2 + 0.31 * r);
      const px = (DX / 2 + 0.1) - (s) * Math.cos(alpha), py = H + s * Math.sin(alpha);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.014, 0.34), glimm);
      m.position.set(px + Math.sin(alpha) * 0.012, py + Math.cos(alpha) * 0.012, -0.64 + c * 0.43);
      m.rotation.z = -alpha; m.castShadow = true; g.add(m);
      const rahmen = new THREE.Mesh(new THREE.BoxGeometry(0.215, 0.01, 0.355), dunkel);
      rahmen.position.copy(m.position).add(new THREE.Vector3(Math.sin(alpha) * -0.004, Math.cos(alpha) * -0.004, 0)); rahmen.rotation.z = -alpha; g.add(rahmen);
    }
  }
  // Wallbox links neben der Tür-Seite, Kabel zur Straße
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(3), fog: false });
  if (wallbox) {
    box(g, 0.05, 0.16, 0.1, front + 0.025, 0.38, -0.82, std("whW", { color: "#E4E8EF", roughness: 0.4 }));
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.1, 0.014), ledMat); l.position.set(front + 0.055, 0.38, -0.82); g.add(l);
    const kabel = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(front + 0.05, 0.32, -0.82), new THREE.Vector3(front + 0.12, 0.1, -0.84), new THREE.Vector3(front + 0.3, 0.02, -0.9), new THREE.Vector3(front + 0.5, 0.02, -0.7)]), 24, 0.01, 6), dunkel);
    g.add(kabel);
  }
  const pf = lichtPfuetze({ radius: 0.9, farbe, staerke: 0.3, streckung: 1 }); pf.position.set(front + 0.7, 0.012, -0.8); g.add(pf);
  g.led = (k) => { ledMat.color.set(farbe).multiplyScalar(1.6 + 3.4 * k); };
  g.solar = (k) => { glimm.emissiveIntensity = k * 0.8; };
  g.userData = { dachMitte: new THREE.Vector3(0.1, H + DH * 0.5, 0), wallbox: new THREE.Vector3(front + 0.1, 0.4, -0.82) };
  return g;
}
