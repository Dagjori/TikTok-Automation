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

// =====================================================================================
// Erweiterung (03.11., Video „Studium oder Ausbildung“): Lebensweg-Objekte für Bildung, Arbeit und Geld
//   modellLaeufer  Modellfigur mit Gehen/Sitzen (pose), Teamton, Lichtfleck
//   hoersaal       Schnittmodell eines Hörsaals (Stufen, Pulte, Tafel, Deckenlicht), sitz(stufe, nr) → Sitzpunkt
//   werkstatt      Schnittmodell eines Ausbildungsbetriebs (Sheddach, Werkbank, Maschine, Zahnrad)
//   schulhaus      Schulgebäude mit Uhrturm und Fahne (Gymnasium, Berufsschule)
//   zielTor        Ziellinien-Tor mit leuchtender Zahl (setze(0–1))
//   geldSaeule     Acryl-Säule mit variabler Höhe (hoehe(h), setze(s), puls(k)) – Geld als Pegel
//   schild         kleines stehendes Schild mit Text (Canvas, Schrift „SB Display“ vorher laden)
//   spurBand       leuchtendes Band am Boden (laenge(l)) – Spur einer Figur
// =====================================================================================

const teamMat = (farbe, e = 0.5) => new THREE.MeshStandardMaterial({ color: farbe, emissive: farbe, emissiveIntensity: e, roughness: 0.5 });

/**
 * Modellfigur (weiß, abstrakt, ohne Gesicht) mit Gelenken: Beine und Arme pendeln beim Gehen, Sitzen setzt die Figur ab und
 * streckt die Beine nach vorn (−z). pose({ geh: Phase in rad, schritt: 0–1 Schrittweite, sitz: 0–1 }).
 * farbe = Teamfarbe (Schal/Rucksack-Band und Lichtfleck am Boden), Figur blickt nach −z.
 */
export function modellLaeufer({ groesse = 0.75, farbe = "#FF8A3D", lichtfleck = true, jacke = 0.0 } = {}) {
  const g = new THREE.Group();
  const weiss = gemeinsam("laeufer|weiss", () => new THREE.MeshStandardMaterial({ color: "#F4F1EC", roughness: 0.85 }));
  const grau = gemeinsam("laeufer|grau", () => new THREE.MeshStandardMaterial({ color: "#D9D5CC", roughness: 0.9 }));
  const tm = new THREE.MeshStandardMaterial({ color: new THREE.Color("#F4F1EC").lerp(new THREE.Color(farbe), jacke), emissive: farbe, emissiveIntensity: 0.35 + jacke * 0.4, roughness: 0.6 });
  const s = groesse;
  const huefte = s * 0.46;
  const koerper = new THREE.Group(); // Rumpf, Kopf, Arme: wandert beim Sitzen nach unten
  g.add(koerper);
  const rumpf = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.12, s * 0.24, 4, 12), jacke > 0.01 ? tm : weiss);
  rumpf.position.y = huefte + s * 0.2; rumpf.castShadow = true;
  const schal = new THREE.Mesh(new THREE.TorusGeometry(s * 0.115, s * 0.03, 8, 20), tm);
  schal.rotation.x = Math.PI / 2; schal.position.y = huefte + s * 0.4;
  const kopf = new THREE.Mesh(new THREE.SphereGeometry(s * 0.105, 16, 12), weiss);
  kopf.position.y = huefte + s * 0.55; kopf.castShadow = true;
  koerper.add(rumpf, schal, kopf);
  const bein = (x) => {
    const p = new THREE.Group(); p.position.set(x, huefte, 0);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.05, huefte - s * 0.1, 3, 8), grau);
    m.position.y = -huefte / 2; m.castShadow = true;
    p.add(m); g.add(p); return p;
  };
  const arm = (x) => {
    const p = new THREE.Group(); p.position.set(x, huefte + s * 0.34, 0);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(s * 0.038, s * 0.2, 3, 8), weiss);
    m.position.y = -s * 0.13; m.castShadow = true;
    p.add(m); koerper.add(p); return p;
  };
  const bl = bein(-s * 0.07), br = bein(s * 0.07), al = arm(-s * 0.17), ar = arm(s * 0.17);
  if (lichtfleck) {
    const p = lichtPfuetze({ radius: s * 0.9, farbe, staerke: 0.75, exponent: 1.8 });
    p.material = p.material.clone();
    p.position.y = 0.01;
    g.add(p);
    g.fleck = p;
  }
  g.pose = ({ geh = 0, schritt = 0.5, sitz = 0 } = {}) => {
    const a = Math.sin(geh) * 0.7 * schritt * (1 - sitz);
    bl.rotation.x = a + sitz * Math.PI * 0.5; br.rotation.x = -a + sitz * Math.PI * 0.5;
    al.rotation.x = -a * 0.9 + sitz * 0.5; ar.rotation.x = a * 0.9 + sitz * 0.5;
    const wipp = Math.abs(Math.cos(geh)) * s * 0.025 * schritt * (1 - sitz);
    const runter = sitz * (huefte - s * 0.22);
    koerper.position.y = wipp - runter; koerper.position.z = sitz * s * 0.02;
    bl.position.y = br.position.y = huefte - runter;
    bl.position.z = br.position.z = 0;
    const lift = Math.max(0, -Math.cos(geh)) * s * 0.03 * schritt * (1 - sitz);
    g.position.y = g.userData.basisY !== undefined ? g.userData.basisY + 0 : g.position.y;
    return lift;
  };
  g.leuchte = (k) => { if (g.fleck) g.fleck.material.uniforms.staerke.value = 0.75 * k; };
  g.hoehe = s;
  g.userData.dynamisch = true;
  g.pose({});
  return g;
}

/** Schnittmodell Hörsaal: offene Vorderseite (+z), Stufen steigen zur Rückwand (+x), Pulte, Tafel links, warme Deckenlichter */
export function hoersaal({ breite = 4.4, tiefe = 2.5, hoehe = 2.5, stufen = 4, stufenHoehe = 0.3, licht = 1, gespiegelt = false } = {}) {
  const g = new THREE.Group();
  const sg = gespiegelt ? -1 : 1; // Stufen steigen nach −x statt +x (ohne negative Skalierung)
  const wand = gemeinsam("hs|wand", () => new THREE.MeshStandardMaterial({ color: MODELL.karton, roughness: 0.92 }));
  const holz = gemeinsam("hs|holz", () => new THREE.MeshStandardMaterial({ color: MODELL.holz, roughness: 0.75 }));
  const kork = gemeinsam("hs|kork", () => new THREE.MeshStandardMaterial({ color: MODELL.kork, roughness: 0.85 }));
  const box = (w, h, d, x, y, z, m, schatten = true) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(sg * x, y, z); b.castShadow = schatten; b.receiveShadow = true; g.add(b); return b; };
  box(breite, 0.06, tiefe, 0, 0.03, 0, holz); // Bodenplatte
  box(breite, hoehe, 0.06, 0, hoehe / 2, -tiefe / 2 + 0.03, wand); // Rückwand
  box(0.06, hoehe, tiefe, breite / 2 - 0.03, hoehe / 2, 0, wand); // Wand rechts (hinten im Raum)
  box(breite, 0.06, tiefe, 0, hoehe, 0, wand); // Decke
  box(0.06, hoehe * 0.55, tiefe, -breite / 2 + 0.03, hoehe * 0.275 + 0.06, 0, wand); // niedrige Wand links (Eingang)
  const x0 = -breite / 2 + 1.0, sb = (breite - 1.2) / stufen; // Stufen von links nach rechts
  g.stufen = [];
  for (let i = 0; i < stufen; i++) {
    const hh = (i + 1) * stufenHoehe, x = x0 + sb * (i + 0.5);
    box(sb, hh, tiefe - 0.1, x, 0.06 + hh / 2, 0, i % 2 ? kork : holz);
    const top = 0.06 + hh;
    box(sb * 0.34, 0.035, tiefe * 0.86, x - sb * 0.2, top + 0.24, 0, kork); // Pult (Platte)
    box(0.03, 0.24, tiefe * 0.82, x - sb * 0.2, top + 0.12, 0, kork, false); // Pultwand
    box(sb * 0.2, 0.05, tiefe * 0.8, x + sb * 0.22, top + 0.13, 0, holz, false); // Sitzbank
    g.stufen.push({ x: sg * (x + sb * 0.18), y: top + 0.12, breite: sb });
  }
  // Pult des Dozenten und Tafel
  box(0.5, 0.42, 0.7, -breite / 2 + 0.55, 0.06 + 0.21, tiefe * 0.18, kork);
  const tafel = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), leuchtMat("#C9D6E6", 1.1));
  tafel.position.set(sg * (-breite / 2 + 1.0), hoehe * 0.55, -tiefe / 2 + 0.07);
  g.add(tafel);
  const rahmen = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.98, 0.03), kork);
  rahmen.position.set(sg * (-breite / 2 + 1.0), hoehe * 0.55, -tiefe / 2 + 0.055);
  g.add(rahmen);
  for (let i = 0; i < 3; i++) box(0.9 - i * 0.15, 0.025, 0.012, -breite / 2 + 1.0 - 0.1 + i * 0.05, hoehe * 0.55 + 0.25 - i * 0.22, -tiefe / 2 + 0.085, gemeinsam("hs|kreide", () => new THREE.MeshBasicMaterial({ color: "#6D7F96" })), false);
  // Deckenlicht
  for (let i = 0; i < 3; i++) {
    const x = -breite / 2 + breite * (0.22 + 0.28 * i);
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.9, tiefe * 0.4), leuchtMat("#FFD9A8", 3.2 * licht));
    l.rotation.x = Math.PI / 2; l.position.set(sg * x, hoehe - 0.004, 0);
    g.add(l);
    const p = lichtPfuetze({ radius: 1.1, farbe: "#FFB36B", staerke: 0.55 * licht, streckung: tiefe / 2.2, exponent: 1.4 });
    p.position.set(sg * x, 0.07 + stufenHoehe * Math.min(stufen, 1 + i), 0);
    g.add(p);
  }
  g.sitz = (stufe, nr = 0, anzahl = 3) => { const s = g.stufen[stufe]; return [s.x, s.y, (nr - (anzahl - 1) / 2) * (tiefe * 0.72 / Math.max(1, anzahl - 1))]; };
  g.userData = { breite, tiefe, hoehe };
  return g;
}

/** Schnittmodell Ausbildungsbetrieb: Sheddach, offene Vorderseite (+z), Werkbank, Maschine, Hängelampen, Zahnrad auf dem Dach */
export function werkstatt({ breite = 3.6, tiefe = 2.4, hoehe = 1.6, licht = 1 } = {}) {
  const g = new THREE.Group();
  const wand = gemeinsam("ws|wand", () => new THREE.MeshStandardMaterial({ color: MODELL.karton, roughness: 0.92 }));
  const holz = gemeinsam("ws|holz", () => new THREE.MeshStandardMaterial({ color: MODELL.holz, roughness: 0.75 }));
  const grau = gemeinsam("ws|grau", () => new THREE.MeshStandardMaterial({ color: MODELL.grau, roughness: 0.6, metalness: 0.2 }));
  const kork = gemeinsam("ws|kork", () => new THREE.MeshStandardMaterial({ color: MODELL.kork, roughness: 0.85 }));
  const box = (w, h, d, x, y, z, m, schatten = true) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = schatten; b.receiveShadow = true; g.add(b); return b; };
  box(breite, 0.06, tiefe, 0, 0.03, 0, holz);
  box(breite, hoehe, 0.06, 0, hoehe / 2 + 0.06, -tiefe / 2 + 0.03, wand);
  box(0.06, hoehe, tiefe, -breite / 2 + 0.03, hoehe / 2 + 0.06, 0, wand);
  box(0.06, hoehe, tiefe, breite / 2 - 0.03, hoehe / 2 + 0.06, 0, wand);
  // Sheddach: drei Sägezähne (schräge Dachflächen, hohe Wand mit Fensterband)
  const n = 3, sw = breite / n;
  for (let i = 0; i < n; i++) {
    const x = -breite / 2 + sw * (i + 0.5);
    const s = new THREE.Shape();
    s.moveTo(-sw / 2, 0); s.lineTo(sw / 2, 0); s.lineTo(sw / 2, 0.5); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: tiefe, bevelEnabled: false });
    geo.translate(0, 0, -tiefe / 2);
    const d = new THREE.Mesh(geo, wand);
    d.position.set(x, hoehe + 0.06, 0); d.castShadow = true; d.receiveShadow = true;
    g.add(d);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(tiefe * 0.8, 0.34), leuchtMat("#FFE2B8", 2.4 * licht));
    f.rotation.y = -Math.PI / 2; f.position.set(x + sw / 2 - 0.004, hoehe + 0.06 + 0.25, 0);
    g.add(f);
  }
  box(breite, 0.06, tiefe, 0, hoehe + 0.06, 0, wand); // Decke
  // Werkbank mit Schraubstock, Maschine (Drehbank), Werkstück
  box(1.2, 0.05, 0.55, -breite * 0.2, 0.42, -tiefe * 0.2, holz);
  box(1.2, 0.36, 0.5, -breite * 0.2, 0.24, -tiefe * 0.2, kork);
  box(0.14, 0.14, 0.14, -breite * 0.2 - 0.4, 0.52, -tiefe * 0.2, grau);
  box(0.9, 0.5, 0.6, breite * 0.25, 0.31, -tiefe * 0.15, grau);
  const spindel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 14), grau);
  spindel.rotation.z = Math.PI / 2; spindel.position.set(breite * 0.25, 0.7, -tiefe * 0.15); spindel.castShadow = true; g.add(spindel);
  box(0.5, 0.08, 0.3, breite * 0.25, 0.9, -tiefe * 0.35, kork);
  // Zahnrad auf der Vorderkante des Dachs (als Zeichen für Ausbildung/Handwerk)
  const z = new THREE.Group();
  const zr = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.07, 20), gemeinsam("ws|zahn", () => new THREE.MeshStandardMaterial({ color: "#ECE6DA", roughness: 0.5, metalness: 0.15 })));
  zr.rotation.x = Math.PI / 2; z.add(zr);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const t = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.09), zr.material); t.position.set(Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0); t.rotation.z = a; z.add(t); }
  z.position.set(-breite * 0.35, hoehe + 0.06 + 0.55, tiefe / 2 - 0.08);
  g.add(z); g.zahnrad = z; z.userData.dynamisch = true;
  for (const x of [-0.28, 0.12]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.3), leuchtMat("#FFD4A0", 3 * licht));
    l.rotation.x = Math.PI / 2; l.position.set(breite * x, hoehe + 0.055 - 0.004, 0);
    g.add(l);
    const p = lichtPfuetze({ radius: 0.9, farbe: "#FFB36B", staerke: 0.6 * licht, streckung: tiefe / 1.8, exponent: 1.4 });
    p.position.set(breite * x, 0.07, 0);
    g.add(p);
  }
  g.userData = { breite, tiefe, hoehe };
  return g;
}

/** Schulgebäude: langer Baukörper mit Fensterschnitten, Uhrturm mit leuchtendem Zifferblatt und Fahnenmast */
export function schulhaus({ breite = 3.6, tiefe = 1.7, hoehe = 1.5, material = "karton", seed = 11 } = {}) {
  const g = new THREE.Group();
  const k = modellHaus({ breite, hoehe, tiefe, dach: "flach", material, seed });
  g.add(k);
  const turm = modellHaus({ breite: 0.8, hoehe: hoehe + 0.9, tiefe: 0.8, dach: "sattel", material, seed: seed + 3, dachHoehe: 0.55, fenster: false });
  turm.position.set(breite * 0.3, 0, tiefe * 0.05);
  g.add(turm);
  const uhr = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), leuchtMat("#FFE9C8", 2.2));
  uhr.position.set(breite * 0.3, hoehe + 0.55, tiefe * 0.05 + 0.405);
  g.add(uhr);
  const zeiger = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.01), gemeinsam("schule|zeiger", () => new THREE.MeshBasicMaterial({ color: "#3A3631" })));
  zeiger.position.set(breite * 0.3 + 0.04, hoehe + 0.6, tiefe * 0.05 + 0.412); zeiger.rotation.z = -0.6;
  const zeiger2 = zeiger.clone(); zeiger2.scale.set(0.8, 0.6, 1); zeiger2.position.set(breite * 0.3 - 0.03, hoehe + 0.52, tiefe * 0.05 + 0.412); zeiger2.rotation.z = 1.1;
  g.add(zeiger, zeiger2);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 6), gemeinsam("draht", () => new THREE.MeshStandardMaterial({ color: "#6B5E50", roughness: 0.6, metalness: 0.3 })));
  mast.position.set(-breite * 0.38, hoehe + 0.55, tiefe * 0.3); mast.castShadow = true; g.add(mast);
  const fahne = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), new THREE.MeshStandardMaterial({ color: "#ECE6DA", side: THREE.DoubleSide, roughness: 0.9 }));
  fahne.position.set(-breite * 0.38 + 0.18, hoehe + 0.98, tiefe * 0.3); fahne.castShadow = true; g.add(fahne);
  // Eingangstreppe als helle Stufen
  for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.7 + i * 0.12, 0.04, 0.12), gemeinsam("schule|stufe", () => new THREE.MeshStandardMaterial({ color: MODELL.grau, roughness: 0.9 }))); s.position.set(-breite * 0.05, 0.02 + (2 - i) * 0.04, tiefe / 2 + 0.06 + i * 0.11); s.receiveShadow = true; g.add(s); }
  g.userData = { breite, tiefe, hoehe };
  return g;
}

/** Text auf Canvas → Textur (Schrift „SB Display“ muss geladen sein) */
function textTextur(text, { b = 512, h = 256, farbe = "#2A2622", grund = "#ECE6DA", schrift = "800", rand = "#B9B0A2", px = null } = {}) {
  const c = leinwand(b, h, (g) => {
    g.fillStyle = grund; g.fillRect(0, 0, b, h);
    g.strokeStyle = rand; g.lineWidth = 8; g.strokeRect(6, 6, b - 12, h - 12);
    const zeilen = String(text).split("\n");
    const groesse = px ?? Math.min(h * 0.62 / zeilen.length, (b * 0.82) / Math.max(1, Math.max(...zeilen.map((z) => z.length)) * 0.6));
    g.fillStyle = farbe; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `${schrift} ${groesse}px 'SB Display', 'Inter', sans-serif`;
    zeilen.forEach((z, i) => g.fillText(z, b / 2, h / 2 + (i - (zeilen.length - 1) / 2) * groesse * 1.08));
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/** Kleines stehendes Schild (Pfosten + Tafel mit Text), z. B. Geld-Meilenstein auf dem Weg */
export function schild({ text = "", breite = 0.8, hoehe = 0.36, pfosten = 0.42, grund = "#ECE6DA", farbe = "#2A2622", px = null, schrift = "800" } = {}) {
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, pfosten, 6), gemeinsam("draht", () => new THREE.MeshStandardMaterial({ color: "#6B5E50", roughness: 0.6, metalness: 0.3 })));
  p.position.y = pfosten / 2; p.castShadow = true; g.add(p);
  const t = textTextur(text, { b: 512, h: Math.round(512 * hoehe / breite), grund, farbe, px, schrift });
  const m = new THREE.Mesh(new THREE.BoxGeometry(breite, hoehe, 0.025), [gemeinsam("schild|kante", () => new THREE.MeshStandardMaterial({ color: MODELL.holz, roughness: 0.8 })), gemeinsam("schild|kante", () => new THREE.MeshStandardMaterial({ color: MODELL.holz, roughness: 0.8 })), gemeinsam("schild|kante", () => new THREE.MeshStandardMaterial({ color: MODELL.holz, roughness: 0.8 })), gemeinsam("schild|kante", () => new THREE.MeshStandardMaterial({ color: MODELL.holz, roughness: 0.8 })), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, emissive: "#FFFFFF", emissiveMap: t, emissiveIntensity: 0.18 }), new THREE.MeshStandardMaterial({ color: MODELL.holz, roughness: 0.8 })]);
  m.position.y = pfosten + hoehe / 2; m.castShadow = true; g.add(m);
  return g;
}

/** Ziellinien-Tor: zwei Pfosten, Querbalken mit leuchtender Zahl, Lichtlinie am Boden; setze(0–1) = Aufleuchten */
export function zielTor({ breite = 3.2, hoehe = 1.9, text = "40", farbe = "#ECE6DA", staerke = 3.0 } = {}) {
  const g = new THREE.Group();
  const holz = gemeinsam("tor|holz", () => new THREE.MeshStandardMaterial({ color: MODELL.karton, roughness: 0.9 }));
  for (const x of [-breite / 2, breite / 2]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, hoehe, 0.14), holz); p.position.set(x, hoehe / 2, 0); p.castShadow = true; g.add(p); }
  const bal = new THREE.Mesh(new THREE.BoxGeometry(breite + 0.14, 0.5, 0.14), holz);
  bal.position.y = hoehe - 0.05; bal.castShadow = true; g.add(bal);
  const t = textTextur(text, { b: 256, h: 128, grund: "#1B1E26", farbe, rand: "#1B1E26", px: 96 });
  const tafelMat = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1, 1, 1).multiplyScalar(1.0), toneMapped: false });
  const tafel = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.4), tafelMat);
  tafel.position.set(0, hoehe - 0.05, 0.075); g.add(tafel);
  const tafel2 = tafel.clone(); tafel2.position.z = -0.075; tafel2.rotation.y = Math.PI; g.add(tafel2);
  const lm = leuchtMat(farbe, staerke, { transparent: true, neu: true });
  const linie = new THREE.Mesh(new THREE.BoxGeometry(breite, 0.012, 0.07), lm); linie.position.y = 0.012; g.add(linie);
  const bandL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.15), lm); bandL.position.set(-breite / 2, hoehe + 0.2, 0); // kleine Marke auf dem Balken
  const bandR = bandL.clone(); bandR.position.x = breite / 2; g.add(bandL, bandR);
  const pf = lichtPfuetze({ radius: breite * 0.8, farbe, staerke: 0.5, streckung: 0.5, exponent: 1.6 });
  pf.material = pf.material.clone(); pf.position.y = 0.015; g.add(pf);
  g.userData.dynamisch = true;
  g.setze = (s) => { lm.opacity = 0.12 + 0.88 * s; pf.material.uniforms.staerke.value = 0.08 + 0.7 * s; tafelMat.color.setScalar(0.45 + 0.9 * s); };
  g.setze(0);
  return g;
}

/**
 * Geld-Säule: halbtransparenter Acryl-Quader in Teamfarbe mit leuchtenden Kanten und Pegelkappe. Die Höhe ist beliebig und
 * jederzeit änderbar (hoehe(h)); setze(s) blendet ein (0–1); puls(k) erhöht kurz das Leuchten (Aufleuchten bei Ereignissen).
 */
export function geldSaeule({ breite = 0.4, farbe = "#FF8A3D", deckkraft = 0.34, kanten = 3.0 } = {}) {
  const g = new THREE.Group();
  const f = new THREE.Color(farbe);
  const fuellMat = new THREE.MeshStandardMaterial({ color: f, emissive: f, emissiveIntensity: 0.55, transparent: true, opacity: deckkraft, roughness: 0.1, depthWrite: false });
  const fuell = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), fuellMat);
  fuell.renderOrder = 4; g.add(fuell);
  const lm = leuchtMat(farbe, kanten, { transparent: true, neu: true });
  const b = breite / 2;
  const senkrecht = [[-b, -b], [b, -b], [b, b], [-b, b]].map(([x, z]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.016, 1, 0.016), lm); m.position.set(x, 0.5, z); g.add(m); return m; });
  const oben = [];
  for (const [w, d, x, z] of [[breite, 0.016, 0, -b], [breite, 0.016, 0, b], [0.016, breite, -b, 0], [0.016, breite, b, 0]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.016, d), lm); m.position.set(x, 1, z); g.add(m); oben.push(m); }
  const kappeMat = leuchtMat(farbe, kanten * 0.9, { transparent: true, neu: true });
  const kappe = new THREE.Mesh(new THREE.BoxGeometry(breite * 0.96, 0.02, breite * 0.96), kappeMat);
  kappe.position.y = 1; g.add(kappe);
  const pf = lichtPfuetze({ radius: breite * 1.7, farbe, staerke: 0.45, exponent: 2 });
  pf.material = pf.material.clone(); pf.position.y = 0.006; g.add(pf);
  g.userData.dynamisch = true;
  let H = 1, S = 1, P = 0;
  const wende = () => {
    g.visible = S > 0.001;
    fuell.scale.set(breite, Math.max(H, 1e-3), breite); fuell.position.y = H / 2;
    senkrecht.forEach((m) => { m.scale.y = Math.max(H, 1e-3); m.position.y = H / 2; });
    oben.forEach((m) => { m.position.y = H; }); kappe.position.y = H;
    fuellMat.opacity = Math.min(1, deckkraft * S * (1 + 0.8 * P)); fuellMat.emissiveIntensity = (0.55 + 1.6 * P) * S;
    lm.opacity = S; kappeMat.opacity = S;
    lm.color.copy(f).multiplyScalar(kanten * (1 + 0.8 * P)); kappeMat.color.copy(f).multiplyScalar(kanten * 0.9 * (1 + 1.2 * P));
    pf.material.uniforms.staerke.value = (0.45 + 0.9 * P) * S;
  };
  g.hoehe = (h) => { H = h; wende(); return g; };
  g.setze = (s) => { S = s; wende(); return g; };
  g.puls = (k) => { P = k; wende(); return g; };
  g.kopf = () => H;
  wende();
  return g;
}

/** Leuchtende Bodenspur (Band) in Teamfarbe: laenge(l) setzt die Länge ab dem Ursprung nach −z (Quader, kein Texturlauf) */
export function spurBand({ breite = 0.1, farbe = "#FF8A3D", staerke = 2.6, y = 0.012 } = {}) {
  const lm = leuchtMat(farbe, staerke, { transparent: true, neu: true, deckkraft: 0.9 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(breite, 0.012, 1), lm);
  m.userData.dynamisch = true;
  m.laenge = (l) => { m.visible = l > 1e-3; m.scale.z = Math.max(l, 1e-3); m.position.set(0, y, -l / 2); };
  m.laenge(0);
  m.mat = lm;
  return m;
}
