// Stil 19 „Architekturmodell im Abendlicht“ (nur Simulierbar, Skill .claude/skills/simulierbar-video/stile.md):
// weißes Architekturmodell (Karton, Birkensperrholz, Kork) auf einer Modellplatte, tiefe goldene Sonne mit langen
// Schatten, Lichtbahnen durch die Gassen, Staub im Licht, warme Innenbeleuchtung in Schnitt-Häusern, Acrylglas-Marker
// in Teamfarbe für die beiden Alternativen. Alles prozedural (Laserschnitt-Optik), keine fremden Assets.
//
//   const p = modellPlatte({ breite: 14, tiefe: 14, strassen: [...] }); szene.add(p)
//   const h = modellHaus({ breite: 1.6, hoehe: 2.4, tiefe: 1.4, dach: "sattel", material: "karton", seed: 3 })
//   const s = schnittHaus({ breite: 3, tiefe: 2, etagen: 4 }); s.raum(etage, nr) → Mittelpunkt des Raums (für Marker)
//   const m = acrylMarker({ breite: 0.9, tiefe: 0.9, hoehe: 0.5, farbe: TEAM_A }); m.setze(sichtbar 0–1)
//   const b = modellBaum({ groesse: 0.7, seed: 2 }), f = modellFigur({ farbe: "#F4F1EC" })
// Licht: rigAbendsonne + lichtBahn/staub + post.strahlen (sim_atmosphaere.js). Maßstab 1:200 (1 Einheit ≈ 4 m).
import * as THREE from "three";
import { leuchtMat, lichtPfuetze, glimmLinie } from "./sim_atmosphaere.js";

const zufall = (seed) => { let s = (seed * 2654435761) % 4294967296; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; };
const speicher = new Map();
const gemeinsam = (k, bau) => { if (!speicher.has(k)) speicher.set(k, bau()); return speicher.get(k); };
const leinwand = (b, h, mal) => { const c = document.createElement("canvas"); c.width = b; c.height = h; mal(c.getContext("2d"), b, h); return c; };

export const MODELL = { karton: "#F3F0EA", holz: "#D9BE97", kork: "#B98E63", grau: "#C9C6C0", dunkel: "#5B5650", platte: "#E9E5DD" };

/**
 * Fassaden-Atlas im Modellbau-Look: Wandfläche (weiß, leichte Faser) mit ausgeschnittenen Fensteröffnungen (dunkel,
 * dahinter teils warmes Innenlicht). 64 × 64 Zellen à 24 px, Zeilen von unten 0–3 = Dachfläche (ohne Fenster).
 */
let atlas = null;
export function modellAtlas() {
  if (atlas) return atlas;
  const N = 64, P = 24, S = N * P;
  const r = zufall(31);
  const cf = leinwand(S, S, (g) => {
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 40000; i++) { g.fillStyle = `rgba(0,0,0,${0.012 + r() * 0.02})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1); }
  });
  const cl = leinwand(S, S, (g) => { g.fillStyle = "#000"; g.fillRect(0, 0, S, S); });
  const f = cf.getContext("2d"), l = cl.getContext("2d");
  for (let zo = 0; zo < N; zo++) {
    const zeile = N - 1 - zo;
    if (zeile < 4) continue;
    for (let x = 0; x < N; x++) {
      const fx = x * P + P * 0.28, fy = zo * P + P * 0.18, fw = P * 0.44, fh = P * 0.62;
      f.fillStyle = "#3A3631"; f.fillRect(fx, fy, fw, fh);
      f.fillStyle = "rgba(0,0,0,0.25)"; f.fillRect(fx - 1, fy - 1, fw + 2, 2); // Schnittkante
      const an = r() < 0.18 + (zeile % 7) * 0.02;
      if (an) { l.globalAlpha = 0.4 + r() * 0.6; l.fillStyle = ["#FFB971", "#FFC88C", "#FFD9A8"][Math.floor(r() * 3)]; l.fillRect(fx, fy, fw, fh); l.globalAlpha = 1; f.fillStyle = "#6A5640"; f.fillRect(fx, fy, fw, fh); }
    }
  }
  const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  atlas = { N, karte: tex(cf), leucht: tex(cl) };
  atlas.material = new THREE.MeshStandardMaterial({ map: atlas.karte, emissiveMap: atlas.leucht, emissive: "#FFFFFF", emissiveIntensity: 1.4, roughness: 0.92, metalness: 0, vertexColors: true });
  return atlas;
}

const farbeVon = (material) => new THREE.Color(MODELL[material] || material);

/** UVs einer Box auf Atlas-Ausschnitte setzen (Fenster passen auf ganze Zellen), Vertex-Farbe = Material */
function atlasBox(breite, hoehe, tiefe, { fensterBreite = 0.28, etagenHoehe = 0.3, farbe, seed = 1, fenster = true } = {}) {
  const A = modellAtlas(), r = zufall(seed);
  const geo = new THREE.BoxGeometry(breite, hoehe, tiefe);
  const uv = geo.attributes.uv;
  const c = Math.max(1, Math.round(breite / fensterBreite)), d = Math.max(1, Math.round(tiefe / fensterBreite)), e = Math.max(1, Math.round(hoehe / etagenHoehe));
  const sp = [d, d, 0, 0, c, c];
  for (let face = 0; face < 6; face++) {
    const dachF = face === 2 || face === 3 || !fenster;
    const cc = dachF ? 2 : sp[face], rr = dachF ? 2 : e;
    const ox = Math.floor(r() * (A.N - cc)), oy = dachF ? 1 : 4 + Math.floor(r() * (A.N - 4 - rr));
    for (let k = 0; k < 4; k++) { const i = face * 4 + k; uv.setXY(i, (ox + uv.getX(i) * cc) / A.N, (oy + uv.getY(i) * rr) / A.N); }
  }
  const col = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < col.length / 3; i++) col.set([farbe.r, farbe.g, farbe.b], i * 3);
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, A.material);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** Modellplatte (Sperrholz mit sichtbaren Lagen an der Kante), Straßen als flache Gravur, darunter dunkler Tisch */
export function modellPlatte({ breite = 14, tiefe = 14, dicke = 0.18, strassen = [], tisch = "#2A2622" } = {}) {
  const g = new THREE.Group();
  const kante = gemeinsam("plattenkante", () => {
    const c = leinwand(64, 256, (x, b, h) => { for (let y = 0; y < h; y += 16) { x.fillStyle = y % 32 ? "#D9C3A0" : "#C4A985"; x.fillRect(0, y, b, 16); } });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(40, 1);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
  });
  const c = leinwand(2048, 2048, (x, b, h) => {
    x.fillStyle = MODELL.platte; x.fillRect(0, 0, b, h);
    const r = zufall(5);
    for (let i = 0; i < 30000; i++) { x.fillStyle = `rgba(0,0,0,${0.01 + r() * 0.02})`; x.fillRect(r() * b, r() * h, 2, 1); }
    x.fillStyle = "#D8D3C9";
    for (const s of strassen) {
      const bb = (s.breite ?? 1) / breite * b;
      if (s.richtung === "z") x.fillRect(((s.x + breite / 2) / breite) * b - bb / 2, 0, bb, h);
      else x.fillRect(0, ((s.z + tiefe / 2) / tiefe) * h - bb / 2, b, bb);
    }
    x.strokeStyle = "rgba(255,255,255,0.7)"; x.lineWidth = 3; x.setLineDash([22, 18]);
    for (const s of strassen) { x.beginPath(); if (s.richtung === "z") { const px = ((s.x + breite / 2) / breite) * b; x.moveTo(px, 0); x.lineTo(px, h); } else { const pz = ((s.z + tiefe / 2) / tiefe) * h; x.moveTo(0, pz); x.lineTo(b, pz); } x.stroke(); }
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const oben = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  const p = new THREE.Mesh(new THREE.BoxGeometry(breite, dicke, tiefe), [kante, kante, oben, kante, kante, kante]);
  p.position.y = -dicke / 2; p.receiveShadow = true; p.castShadow = true;
  const ti = new THREE.Mesh(new THREE.BoxGeometry(breite * 4, 0.1, tiefe * 4), new THREE.MeshStandardMaterial({ color: tisch, roughness: 0.6 }));
  ti.position.y = -dicke - 0.05; ti.receiveShadow = true;
  g.add(p, ti);
  return g;
}

/** Modellhaus: Quader mit Fensterschnitten, Flach- oder Satteldach (Dach ohne Fenster), Material karton|holz|kork|grau */
export function modellHaus({ breite = 1.6, hoehe = 2.2, tiefe = 1.4, dach = "flach", material = "karton", seed = 1, fenster = true, dachHoehe = 0.6 } = {}) {
  const g = new THREE.Group();
  const farbe = farbeVon(material);
  const k = atlasBox(breite, hoehe, tiefe, { farbe, seed, fenster });
  k.position.y = hoehe / 2;
  g.add(k);
  if (dach === "sattel") {
    const s = new THREE.Shape();
    s.moveTo(-tiefe / 2 - 0.04, 0); s.lineTo(tiefe / 2 + 0.04, 0); s.lineTo(0, dachHoehe); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: breite + 0.08, bevelEnabled: false });
    geo.translate(0, 0, -(breite + 0.08) / 2);
    geo.rotateY(Math.PI / 2);
    const d = new THREE.Mesh(geo, gemeinsam(`dach|${material}`, () => new THREE.MeshStandardMaterial({ color: farbe.clone().multiplyScalar(0.94), roughness: 0.9 })));
    d.position.y = hoehe; d.castShadow = true; d.receiveShadow = true;
    g.add(d);
  } else {
    const a = gemeinsam(`attika|${material}`, () => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.92 }));
    for (const [w, dd, x, z] of [[breite, 0.03, 0, tiefe / 2 - 0.015], [breite, 0.03, 0, -tiefe / 2 + 0.015], [0.03, tiefe, breite / 2 - 0.015, 0], [0.03, tiefe, -breite / 2 + 0.015, 0]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, dd), a);
      m.position.set(x, hoehe + 0.03, z); m.castShadow = true;
      g.add(m);
    }
  }
  g.userData = { breite, hoehe, tiefe };
  return g;
}

/**
 * Schnitt-Haus (Vorderwand offen): Geschossdecken, Innenwände, Räume mit warmer Deckenleuchte und kleinen Möbeln.
 * raum(etage, nr) → Weltpunkt der Raummitte (nach dem Einsetzen in die Szene); raeume = Räume je Etage.
 */
export function schnittHaus({ breite = 3, tiefe = 2, etagen = 4, etagenHoehe = 0.62, raeume = 3, material = "karton", seed = 4, licht = 0.75 } = {}) {
  const g = new THREE.Group();
  const r = zufall(seed);
  const farbe = farbeVon(material);
  const wand = gemeinsam(`schnittwand|${material}`, () => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.92 }));
  const boden = gemeinsam("schnittboden", () => new THREE.MeshStandardMaterial({ color: MODELL.holz, roughness: 0.75 }));
  const moebel = gemeinsam("moebel", () => new THREE.MeshStandardMaterial({ color: "#B89C78", roughness: 0.8 }));
  const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  const H = etagen * etagenHoehe;
  box(breite, H, 0.05, 0, H / 2, -tiefe / 2 + 0.025, wand); // Rückwand
  box(0.05, H, tiefe, -breite / 2 + 0.025, H / 2, 0, wand);
  box(0.05, H, tiefe, breite / 2 - 0.025, H / 2, 0, wand);
  for (let e = 0; e <= etagen; e++) box(breite, 0.05, tiefe, 0, e * etagenHoehe, 0, e === etagen ? wand : boden);
  const rb = breite / raeume;
  g.raumLokal = [];
  for (let e = 0; e < etagen; e++) {
    const y = e * etagenHoehe;
    g.raumLokal.push([]);
    for (let i = 0; i < raeume; i++) {
      const x = -breite / 2 + rb * (i + 0.5);
      if (i > 0) box(0.035, etagenHoehe - 0.05, tiefe - 0.05, -breite / 2 + rb * i, y + etagenHoehe / 2, 0, wand);
      g.raumLokal[e].push([x, y + 0.03, 0]);
      // Möbel: Bett/Sofa, Tisch, Schrank
      box(rb * 0.45, 0.08, tiefe * 0.3, x - rb * 0.15, y + 0.065, -tiefe * 0.22, moebel);
      box(rb * 0.2, 0.12, rb * 0.2, x + rb * 0.22, y + 0.085, tiefe * 0.05, moebel);
      box(rb * 0.12, etagenHoehe * 0.55, tiefe * 0.25, x + rb * 0.36, y + 0.025 + etagenHoehe * 0.275, -tiefe * 0.3, moebel);
      if (r() < licht) { // warmes Innenlicht
        const l = new THREE.Mesh(new THREE.PlaneGeometry(rb * 0.3, tiefe * 0.25), leuchtMat("#FFD4A0", 3.2));
        l.rotation.x = Math.PI / 2; l.position.set(x, y + etagenHoehe - 0.002, -tiefe * 0.05);
        g.add(l);
        const p = lichtPfuetze({ radius: rb * 0.6, farbe: "#FFB36B", staerke: 0.7, streckung: tiefe / rb, exponent: 1.4 });
        p.position.set(x, y + 0.03, 0);
        g.add(p);
      }
    }
  }
  g.raum = (e, i) => g.localToWorld(new THREE.Vector3(...g.raumLokal[e][i]));
  g.userData = { breite, tiefe, hoehe: H, etagenHoehe, raumBreite: rb };
  return g;
}

/**
 * Acrylglas-Marker in Teamfarbe (z. B. eine Wohnung, ein Raum, ein Grundstück): halbtransparenter Block mit leuchtenden
 * Kanten. setze(s): 0 = unsichtbar … 1 = voll (Kanten und Füllung blenden mit).
 */
export function acrylMarker({ breite = 1, tiefe = 1, hoehe = 0.5, farbe = "#8E6CFF", deckkraft = 0.3, kanten = 3.2 } = {}) {
  const g = new THREE.Group();
  const f = new THREE.Color(farbe);
  const fuell = new THREE.MeshStandardMaterial({ color: f, emissive: f, emissiveIntensity: 0.55, transparent: true, opacity: deckkraft, roughness: 0.1, metalness: 0, depthWrite: false });
  const k = new THREE.Mesh(new THREE.BoxGeometry(breite, hoehe, tiefe), fuell);
  k.position.y = hoehe / 2; k.renderOrder = 4;
  g.add(k);
  const kantenMat = leuchtMat(farbe, kanten, { transparent: true, neu: true });
  const b = breite / 2, t = tiefe / 2;
  const ecken = [[-b, -t], [b, -t], [b, t], [-b, t]];
  const linien = [];
  for (let i = 0; i < 4; i++) {
    const [x1, z1] = ecken[i], [x2, z2] = ecken[(i + 1) % 4];
    for (const y of [0.004, hoehe]) linien.push(glimmLinie([x1, y, z1], [x2, y, z2], { farbe, staerke: kanten, dicke: 0.018 }));
    linien.push(glimmLinie([x1, 0, z1], [x1, hoehe, z1], { farbe, staerke: kanten, dicke: 0.018 }));
  }
  for (const l of linien) { l.material = kantenMat; g.add(l); }
  const p = lichtPfuetze({ radius: Math.max(breite, tiefe) * 0.95, farbe, staerke: 0.4, exponent: 2 });
  p.position.y = 0.006; p.material = p.material.clone();
  g.add(p);
  g.userData.dynamisch = true;
  g.setze = (s) => {
    g.visible = s > 0.001;
    fuell.opacity = deckkraft * s; fuell.emissiveIntensity = 0.55 * s;
    kantenMat.opacity = s; p.material.uniforms.staerke.value = 0.4 * s;
  };
  g.setze(1);
  return g;
}

/** Modellbaum: Draht-Stamm und Krone aus Schaumkugeln (hell, matt) */
export function modellBaum({ groesse = 0.7, seed = 1, farbe = "#E4E2D6" } = {}) {
  const g = new THREE.Group();
  const r = zufall(seed);
  const stamm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, groesse * 0.55, 6), gemeinsam("draht", () => new THREE.MeshStandardMaterial({ color: "#6B5E50", roughness: 0.6, metalness: 0.3 })));
  stamm.position.y = groesse * 0.27; stamm.castShadow = true;
  g.add(stamm);
  const mat = gemeinsam(`schaum|${farbe}`, () => new THREE.MeshStandardMaterial({ color: farbe, roughness: 1 }));
  for (let i = 0; i < 6; i++) {
    const k = new THREE.Mesh(new THREE.IcosahedronGeometry(groesse * (0.16 + r() * 0.1), 1), mat);
    k.position.set((r() - 0.5) * groesse * 0.35, groesse * (0.62 + r() * 0.3), (r() - 0.5) * groesse * 0.35);
    k.castShadow = true; k.receiveShadow = true;
    g.add(k);
  }
  return g;
}

/** Modellfigur (weiß, abstrakt, ohne Gesicht) */
export function modellFigur({ groesse = 0.45, farbe = "#F4F1EC" } = {}) {
  const g = new THREE.Group();
  const mat = gemeinsam(`figur|${farbe}`, () => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.85 }));
  const k = new THREE.Mesh(new THREE.CapsuleGeometry(groesse * 0.12, groesse * 0.5, 4, 10), mat);
  k.position.y = groesse * 0.37; k.castShadow = true;
  const kopf = new THREE.Mesh(new THREE.SphereGeometry(groesse * 0.1, 14, 10), mat);
  kopf.position.y = groesse * 0.82; kopf.castShadow = true;
  g.add(k, kopf);
  return g;
}

/** Abendhimmel/Studiowand als Hintergrund (warm unten, dunkelblau oben) */
export function abendWand() {
  const c = leinwand(16, 512, (g, b, h) => {
    const l = g.createLinearGradient(0, 0, 0, h);
    l.addColorStop(0, "#1E2738"); l.addColorStop(0.38, "#4A4A58"); l.addColorStop(0.62, "#C98A5E"); l.addColorStop(0.72, "#F2B57E"); l.addColorStop(0.85, "#7A5440"); l.addColorStop(1, "#3A2A22");
    g.fillStyle = l; g.fillRect(0, 0, b, h);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
