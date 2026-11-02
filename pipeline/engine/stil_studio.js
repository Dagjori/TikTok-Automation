// Stil 18 „Dunkles Studio / Produktlicht“ (nur Simulierbar, Skill .claude/skills/simulierbar-video/stile.md):
// Geld als echtes Objekt im schwarzen Fotostudio: Münzen (Gold, Silber, Bimetall) mit Rändelung und Prägung,
// Scheinbündel mit Banderole, Balkenwaage aus gebürstetem Stahl, schwarze Sockel mit LED-Kante in Teamfarbe,
// Hohlkehle mit Spiegelboden. Licht: Softbox-Streiflicht, Kantenlichter, Spot von oben mit Lichtkegel und Staub
// (sim_atmosphaere.rigStudio). Alles prozedural, keine echten Banknoten- oder Münzmotive (nur eigene, neutrale Gestaltung).
//
//   const k = hohlkehle({ breite: 30, tiefe: 14, hoehe: 10 }); szene.add(k)
//   const st = muenzStapel({ art: "gold", max: 40 }); st.setze(12.4)   // 12 Münzen liegen, die 13. fällt (Anteil 0,4)
//   const b = scheinBuendel({ farbe: TEAM_A, wert: "100" }); b.setze(anzahlScheine)
//   const s = sockel({ breite: 1.6, farbe: TEAM_B }); szene.add(s)
//   const w = waage({ breite: 3 }); w.setze(neigung)  // Schalen w.links / w.rechts (Gruppen) nehmen Objekte auf
// Maßstab: 1 Einheit ≈ 10 cm (Münze r = 0,12). Teamfarbe als Licht (LED-Kante, Lichtfleck, Banderole), nie Gelb.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { leuchtMat, glimmLinie, lichtPfuetze } from "./sim_atmosphaere.js";

const zufall = (seed) => { let s = (seed * 2654435761) % 4294967296; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; };
const speicher = new Map();
const gemeinsam = (k, bau) => { if (!speicher.has(k)) speicher.set(k, bau()); return speicher.get(k); };
const leinwand = (b, h, mal) => { const c = document.createElement("canvas"); c.width = b; c.height = h; mal(c.getContext("2d"), b, h); return c; };

/** Hohlkehle (Boden geht in einer Rundung in die Rückwand über), dunkel und leicht glänzend */
export function hohlkehle({ breite = 30, tiefe = 14, hoehe = 10, radius = 3, farbe = "#0A0B0E", rau = 0.42, segmente = 24 } = {}) {
  const profil = [];
  profil.push([tiefe / 2, 0]);
  profil.push([-tiefe / 2 + radius, 0]);
  for (let i = 1; i <= segmente; i++) { const w = (i / segmente) * Math.PI / 2; profil.push([-tiefe / 2 + radius - Math.sin(w) * radius, radius - Math.cos(w) * radius]); }
  profil.push([-tiefe / 2, hoehe]);
  const pos = [], idx = [];
  const nx = 2;
  profil.forEach(([z, y]) => { for (let i = 0; i <= nx; i++) pos.push(-breite / 2 + (i / nx) * breite, y, z); });
  for (let j = 0; j < profil.length - 1; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + nx + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: farbe, roughness: rau, metalness: 0.1, side: THREE.DoubleSide }));
  m.receiveShadow = true;
  return m;
}

/** Wandlicht: weicher Lichtfleck an der Rückwand (Hintergrund-Verlauf hinter dem Motiv) */
export function wandLicht({ breite = 9, hoehe = 6, farbe = "#2A3245", staerke = 1 } = {}) {
  const m = lichtPfuetze({ radius: breite / 2, farbe, staerke, streckung: hoehe / breite, exponent: 1.4 });
  m.rotation.set(0, 0, 0);
  return m;
}

// ---------- Münzen ----------
function praegung(art) {
  return gemeinsam(`praeg|${art}`, () => {
    const c = leinwand(512, 512, (g, b) => {
      g.fillStyle = "#808080"; g.fillRect(0, 0, b, b);
      const m = b / 2;
      g.strokeStyle = "#E0E0E0"; g.lineWidth = 18; g.beginPath(); g.arc(m, m, m * 0.9, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = "#606060"; g.lineWidth = 6; g.beginPath(); g.arc(m, m, m * 0.8, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 12; i++) { const w = (i / 12) * Math.PI * 2; g.fillStyle = "#D8D8D8"; g.beginPath(); g.arc(m + Math.cos(w) * m * 0.68, m + Math.sin(w) * m * 0.68, 11, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#E8E8E8"; g.font = `800 ${art === "silber" ? 230 : 250}px Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(art === "silber" ? "1" : art === "bimetall" ? "2" : "€", m, m + 12);
    });
    const t = new THREE.CanvasTexture(c);
    return t;
  });
}
function raendel() {
  return gemeinsam("raendel", () => {
    const c = leinwand(512, 8, (g, b, h) => { for (let x = 0; x < b; x += 4) { g.fillStyle = x % 8 ? "#202020" : "#E0E0E0"; g.fillRect(x, 0, 4, h); } });
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(5, 1);
    return t;
  });
}
const FARBEN_MUENZE = { gold: ["#E4B64F", 0.26], silber: ["#D2D6DD", 0.22], bimetall: ["#D9B25A", 0.25], kupfer: ["#C47A4A", 0.3] };
/** Materialien einer Münze [Rand, Oberseite, Unterseite] */
export function muenzMaterial(art = "gold") {
  return gemeinsam(`muenzmat|${art}`, () => {
    const [farbe, rau] = FARBEN_MUENZE[art] || FARBEN_MUENZE.gold;
    const rand = new THREE.MeshStandardMaterial({ color: farbe, metalness: 1, roughness: rau + 0.06, bumpMap: raendel(), bumpScale: 0.5, envMapIntensity: 1.3 });
    const flaeche = new THREE.MeshStandardMaterial({ color: farbe, metalness: 1, roughness: rau, bumpMap: praegung(art), bumpScale: 2.2, envMapIntensity: 1.3 });
    return [rand, flaeche, flaeche];
  });
}

/**
 * Münzstapel (instanziert). max = höchste Anzahl; setze(wert): floor(wert) Münzen liegen, die nächste fällt mit dem
 * Bruchteil als Fortschritt (von oben, kleines Nachfedern). unordnung = seitlicher Versatz und Drehung je Münze.
 */
export function muenzStapel({ art = "gold", radius = 0.12, dicke = 0.026, max = 40, unordnung = 0.012, seed = 1, fallHoehe = 0.45 } = {}) {
  const geo = new THREE.CylinderGeometry(radius, radius, dicke, 48, 1, false);
  const m = new THREE.InstancedMesh(geo, muenzMaterial(art), max);
  m.castShadow = true; m.receiveShadow = true;
  m.frustumCulled = false;
  const r = zufall(seed);
  const vers = Array.from({ length: max }, () => [(r() - 0.5) * 2 * unordnung, (r() - 0.5) * 2 * unordnung, r() * Math.PI * 2, (r() - 0.5) * 0.05]);
  const o = new THREE.Object3D();
  const g = new THREE.Group();
  g.add(m);
  g.userData.dynamisch = true;
  g.setze = (wert) => {
    const n = Math.max(0, Math.min(max, Math.floor(wert)));
    const p = wert - Math.floor(wert);
    const sichtbar = Math.min(max, n + (p > 0.001 && n < max ? 1 : 0));
    for (let i = 0; i < sichtbar; i++) {
      const [dx, dz, w, kipp] = vers[i];
      let y = dicke / 2 + i * dicke;
      let k = 0;
      if (i === n) { // fallende Münze
        const f = Math.min(1, p / 0.7);
        y += (1 - f * f) * fallHoehe;
        k = (1 - f) * 0.9;
        if (p > 0.7) { const b = (p - 0.7) / 0.3; y += Math.sin(b * Math.PI) * 0.03 * (1 - b); }
      }
      o.position.set(dx, y, dz);
      o.rotation.set(kipp * 0.2 + k, w, kipp * 0.2);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.count = sichtbar;
    m.instanceMatrix.needsUpdate = true;
  };
  g.hoehe = (wert) => Math.min(max, Math.max(0, wert)) * dicke;
  g.setze(0);
  return g;
}

// ---------- Scheine ----------
function scheinTextur(farbe, wert) {
  return gemeinsam(`schein|${farbe}|${wert}`, () => {
    const c = leinwand(1024, 512, (g, b, h) => {
      g.fillStyle = "#EDE9DF"; g.fillRect(0, 0, b, h);
      const f = new THREE.Color(farbe);
      const css = (a) => `rgba(${Math.round(f.r * 255)},${Math.round(f.g * 255)},${Math.round(f.b * 255)},${a})`;
      g.fillStyle = css(0.85); g.fillRect(0, 0, b * 0.24, h);
      g.strokeStyle = css(0.35); g.lineWidth = 2;
      for (let i = 0; i < 46; i++) { g.beginPath(); for (let x = 0; x <= b; x += 8) { const y = h / 2 + Math.sin(x * 0.012 + i * 0.4) * (h * 0.32) * Math.cos(i * 0.13); if (x === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
      g.strokeStyle = css(0.6); g.lineWidth = 6; g.strokeRect(14, 14, b - 28, h - 28);
      g.fillStyle = "#1B1E24"; g.font = "800 190px Inter, sans-serif"; g.textAlign = "right"; g.textBaseline = "alphabetic"; g.fillText(wert, b - 60, h - 70);
      g.font = "700 84px Inter, sans-serif"; g.fillStyle = css(1); g.fillText("€", b - 60, 120);
      g.beginPath(); g.fillStyle = "rgba(255,255,255,0.5)"; g.arc(b * 0.45, h * 0.5, h * 0.26, 0, Math.PI * 2); g.fill(); // Wasserzeichenfeld
    });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  });
}
/**
 * Scheinbündel: Stapel einzelner Scheine (sichtbare Kanten), Banderole in Teamfarbe. setze(n) = Anzahl Scheine.
 * Länge entlang x. wert = Aufdruck (z. B. "100"), neutrale eigene Gestaltung.
 */
export function scheinBuendel({ farbe = "#3D8BFF", wert = "100", max = 40, laenge = 1.4, breite = 0.68, dicke = 0.0085, seed = 2, banderole = true } = {}) {
  const g = new THREE.Group();
  g.userData.dynamisch = true;
  const tex = scheinTextur(farbe, wert);
  const kante = gemeinsam("scheinkante", () => new THREE.MeshStandardMaterial({ color: "#DCD7CA", roughness: 0.85 }));
  const oben = gemeinsam(`scheinoben|${farbe}|${wert}`, () => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(laenge, dicke, breite), [kante, kante, oben, kante, kante, kante], max);
  m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
  g.add(m);
  const r = zufall(seed);
  const vers = Array.from({ length: max }, () => [(r() - 0.5) * 0.02, (r() - 0.5) * 0.015, (r() - 0.5) * 0.02]);
  const o = new THREE.Object3D();
  let band = null;
  if (banderole) {
    band = new THREE.Mesh(new THREE.BoxGeometry(laenge * 0.16, 1, breite + 0.012), new THREE.MeshStandardMaterial({ color: new THREE.Color(farbe).lerp(new THREE.Color("#FFFFFF"), 0.15), roughness: 0.55 }));
    band.castShadow = true;
    g.add(band);
  }
  g.setze = (n) => {
    const k = Math.max(0, Math.min(max, Math.round(n)));
    for (let i = 0; i < k; i++) { const [dx, dz, w] = vers[i]; o.position.set(dx, dicke / 2 + i * dicke, dz); o.rotation.set(0, w, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
    m.count = k;
    m.instanceMatrix.needsUpdate = true;
    if (band) { band.visible = k > 2; band.scale.y = k * dicke + 0.006; band.position.y = (k * dicke) / 2; }
  };
  g.hoehe = (n) => n * dicke;
  g.setze(max);
  return g;
}

// ---------- Sockel ----------
/** Schwarzer Sockel mit Glanzkante, LED-Linie in Teamfarbe oben vorn und farbigem Lichtfleck davor */
export function sockel({ breite = 1.6, hoehe = 0.9, tiefe = 1.2, farbe = "#3D8BFF", led = 3.5, fleck = 0.35 } = {}) {
  const g = new THREE.Group();
  const mat = gemeinsam("sockel", () => new THREE.MeshStandardMaterial({ color: "#0C0D11", roughness: 0.28, metalness: 0.35, envMapIntensity: 1.2 }));
  const k = new THREE.Mesh(new THREE.BoxGeometry(breite, hoehe, tiefe), mat);
  k.position.y = hoehe / 2; k.castShadow = true; k.receiveShadow = true;
  g.add(k);
  const deckel = new THREE.Mesh(new THREE.BoxGeometry(breite + 0.04, 0.03, tiefe + 0.04), mat);
  deckel.position.y = hoehe + 0.015; deckel.receiveShadow = true;
  g.add(deckel);
  g.add(glimmLinie([-breite / 2, hoehe + 0.002, tiefe / 2 + 0.024], [breite / 2, hoehe + 0.002, tiefe / 2 + 0.024], { farbe, staerke: led, dicke: 0.012 }));
  if (fleck > 0) { const p = lichtPfuetze({ radius: breite * 0.7, farbe, staerke: fleck, streckung: 0.5, exponent: 2 }); p.position.set(0, 0.004, tiefe / 2 + breite * 0.25); g.add(p); }
  g.oben = hoehe + 0.03;
  return g;
}

// ---------- Waage ----------
const stahl = () => gemeinsam("stahl", () => new THREE.MeshStandardMaterial({ color: "#C9CDD3", metalness: 1, roughness: 0.24, envMapIntensity: 1.35 }));
const stahlDunkel = () => gemeinsam("stahlDunkel", () => new THREE.MeshStandardMaterial({ color: "#3A3E45", metalness: 1, roughness: 0.32, envMapIntensity: 1.2 }));
/**
 * Balkenwaage aus Stahl. setze(neigung): Winkel in rad (positiv = rechte Schale tiefer). Schalen hängen immer senkrecht.
 * w.links / w.rechts: Gruppen auf der Schalenoberfläche (Objekte dort hinein, y = 0 = Schalenboden).
 */
export function waage({ breite = 3.2, hoehe = 2.6, schalenRadius = 0.62, faden = 1.1 } = {}) {
  const g = new THREE.Group();
  const fuss = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.12, 64), stahlDunkel());
  fuss.position.y = 0.06; fuss.castShadow = true; fuss.receiveShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.012, 8, 96), stahl());
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.122;
  const saeule = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, hoehe, 32), stahl());
  saeule.position.y = hoehe / 2 + 0.12; saeule.castShadow = true;
  const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 16), stahl());
  kopf.position.y = hoehe + 0.14;
  g.add(fuss, ring, saeule, kopf);
  const balken = new THREE.Group();
  balken.position.y = hoehe + 0.14;
  const b = new THREE.Mesh(new THREE.BoxGeometry(breite, 0.05, 0.07), stahl());
  b.castShadow = true;
  const zeiger = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.45, 16), stahlDunkel());
  zeiger.position.y = 0.26;
  balken.add(b, zeiger);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 12), stahl()); e.position.x = s * breite / 2; balken.add(e); }
  g.add(balken);
  const schale = (seite) => {
    const h = new THREE.Group();
    const profil = [[0, 0], [schalenRadius * 0.82, 0], [schalenRadius, 0.07], [schalenRadius * 1.02, 0.085]].map(([x, y]) => new THREE.Vector2(x, y));
    const sch = new THREE.Mesh(new THREE.LatheGeometry(profil, 64), stahl());
    sch.material.side = THREE.DoubleSide;
    sch.castShadow = true; sch.receiveShadow = true;
    h.add(sch);
    for (let i = 0; i < 3; i++) { // drei Fäden zur Aufhängung
      const w = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const a = new THREE.Vector3(Math.cos(w) * schalenRadius * 0.95, 0.08, Math.sin(w) * schalenRadius * 0.95), z = new THREE.Vector3(0, faden, 0);
      const l = a.distanceTo(z);
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, l, 6), stahlDunkel());
      f.position.copy(a).add(z).multiplyScalar(0.5);
      f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), z.clone().sub(a).normalize());
      h.add(f);
    }
    const inhalt = new THREE.Group();
    inhalt.position.y = 0.012;
    h.add(inhalt);
    g.add(h);
    return { h, inhalt };
  };
  const L = schale(-1), R = schale(1);
  g.links = L.inhalt; g.rechts = R.inhalt;
  g.userData.dynamisch = true;
  g.setze = (neigung) => {
    balken.rotation.z = -neigung;
    for (const [s, S] of [[-1, L], [1, R]]) {
      const x = Math.cos(neigung) * s * breite / 2, y = balken.position.y - Math.sin(neigung) * s * breite / 2;
      S.h.position.set(x, y - faden, 0);
    }
  };
  g.setze(0);
  return g;
}

// =====================================================================================
// Familie und Kind (03.11.2026, Projekt kind-bis-18): Drehteller mit Altersring, Kinderwagen, Kinderrad, Jugendrad,
// Windelpaket, Erstausstattung, Säule. Alles prozedural, neutrale Farben (Elfenbein, Graphit, Kraftpapier), keine Marken.
// Maßstab: freie Miniaturen, jedes Modell passt in einen Kreis von ca. 1,9 Einheiten (Drehteller r = 1).
//   const d = drehteller({ radius: 1.05 }); szene.add(d); d.dreh(winkel); d.modell.add(kinderwagen());
//   const w = kinderwagen(); w.rolle(rad);                       // Räder drehen sich um `rad` (Bogenmaß)
//   const r = altersRing({ radius: 1.5 }); r.setze(alter, farbe)  // 18 Stationen leuchten bis zum Alter (Bruchteile erlaubt)
// =====================================================================================
const alu = () => gemeinsam("alu", () => new THREE.MeshStandardMaterial({ color: "#BCC1C9", metalness: 1, roughness: 0.3, envMapIntensity: 1.3 }));
const gummi = () => gemeinsam("gummi", () => new THREE.MeshStandardMaterial({ color: "#16181C", roughness: 0.72, metalness: 0 }));
const lackMat = (farbe, rau = 0.3) => gemeinsam(`lack|${farbe}|${rau}`, () => new THREE.MeshPhysicalMaterial({ color: farbe, roughness: rau, metalness: 0.2, clearcoat: 0.7, clearcoatRoughness: 0.22, envMapIntensity: 1.1 }));
const stoffMat = (farbe, rau = 0.88) => gemeinsam(`stoff|${farbe}|${rau}`, () => new THREE.MeshStandardMaterial({ color: farbe, roughness: rau, metalness: 0, side: THREE.DoubleSide }));
const mesh = (geo, mat, { x = 0, y = 0, z = 0, schatten = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = schatten; m.receiveShadow = true; return m; };

/** Rohr von a nach b */
function rohr(a, b, r, mat, seg = 12) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const l = va.distanceTo(vb);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, seg), mat);
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  m.castShadow = true;
  return m;
}
/** Rad mit Reifen, Felge, Nabe und Speichen (Achse = z); drehbar über rotation.z */
function rad({ r = 0.3, reifen = 0.045, speichen = 14, felge = alu() } = {}) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.TorusGeometry(r, reifen, 14, 56), gummi()));
  g.add(mesh(new THREE.TorusGeometry(r - reifen * 0.75, reifen * 0.3, 8, 56), felge, { schatten: false }));
  const nabe = mesh(new THREE.CylinderGeometry(r * 0.13, r * 0.13, reifen * 2.2, 16), felge, { schatten: false });
  nabe.rotation.x = Math.PI / 2;
  g.add(nabe);
  for (let i = 0; i < speichen; i++) {
    const w = (i / speichen) * Math.PI * 2;
    const s = mesh(new THREE.CylinderGeometry(0.0055, 0.0055, r - reifen * 0.9, 5), felge, { schatten: false });
    s.position.set(Math.cos(w) * (r - reifen * 0.9) / 2, Math.sin(w) * (r - reifen * 0.9) / 2, 0);
    s.rotation.z = w - Math.PI / 2;
    g.add(s);
  }
  g.userData.radius = r;
  g.userData.dynamisch = true;
  return g;
}
const rolleSetzen = (g, raeder) => { g.rolle = (a) => raeder.forEach((w) => { w.rotation.z = -a / w.userData.radius; }); };

/** Kinderwagen (Wanne, Verdeck, Gestell, vier Räder); fährt in +x, passt in einen Kreis von ca. 1,9 */
export function kinderwagen({ stoff = "#E8E2D6", verdeck = "#CBC3B3", akzent = "#9FB3C8" } = {}) {
  const g = new THREE.Group();
  const al = alu();
  const raeder = [];
  for (const [x, r, z] of [[-0.42, 0.28, 0.4], [-0.42, 0.28, -0.4], [0.5, 0.21, 0.36], [0.5, 0.21, -0.36]]) {
    const w = rad({ r, reifen: r * 0.17 }); w.position.set(x, r, z); g.add(w); raeder.push(w);
  }
  g.add(rohr([-0.42, 0.28, -0.4], [-0.42, 0.28, 0.4], 0.014, al), rohr([0.5, 0.21, -0.36], [0.5, 0.21, 0.36], 0.014, al));
  for (const s of [-1, 1]) {
    g.add(rohr([-0.42, 0.28, s * 0.4], [-0.3, 0.55, s * 0.24], 0.019, al), rohr([0.5, 0.21, s * 0.36], [0.4, 0.55, s * 0.24], 0.019, al));
    g.add(rohr([-0.3, 0.55, s * 0.24], [0.4, 0.55, s * 0.24], 0.022, al));
    g.add(rohr([-0.34, 0.5, s * 0.24], [-0.62, 1.05, s * 0.25], 0.022, al));
  }
  const griff = rohr([-0.62, 1.05, -0.27], [-0.62, 1.05, 0.27], 0.036, gummi(), 16);
  g.add(griff);
  // Wanne (untere Halbschale), Rand, Matratze
  const wanne = mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), stoffMat(stoff), { x: 0.02, y: 0.98 });
  wanne.scale.set(0.78, 0.44, 0.36);
  g.add(wanne);
  const rand = mesh(new THREE.TorusGeometry(1, 0.045, 10, 72), stoffMat(akzent, 0.6), { x: 0.02, y: 0.98 });
  rand.rotation.x = Math.PI / 2; rand.scale.set(0.78, 0.36, 1);
  g.add(rand);
  const matratze = mesh(new THREE.SphereGeometry(1, 32, 12), stoffMat("#F4F1EA"), { x: 0.05, y: 0.95 });
  matratze.scale.set(0.66, 0.05, 0.3);
  g.add(matratze);
  const kissen = mesh(new THREE.SphereGeometry(0.13, 24, 14), stoffMat("#FBF9F4"), { x: -0.38, y: 1.03 });
  kissen.scale.set(1.2, 0.55, 1.2);
  g.add(kissen);
  // Verdeck: halbe Kuppel über der hinteren Hälfte, Bügel
  const dach = mesh(new THREE.SphereGeometry(1, 40, 20, -Math.PI / 2, Math.PI, 0, Math.PI / 2), stoffMat(verdeck), { x: -0.22, y: 0.99 });
  dach.scale.set(0.5, 0.52, 0.4);
  g.add(dach);
  for (const w of [0.35, 0.7]) {
    const b = mesh(new THREE.TorusGeometry(1, 0.016, 8, 40, Math.PI), al, { x: -0.22, y: 0.99 });
    b.scale.set(0.5, 0.52, 0.4); b.rotation.y = Math.PI / 2 - w * 0.0; b.rotation.z = 0;
    g.add(b);
  }
  g.rotation.y = 0;
  rolleSetzen(g, raeder);
  return g;
}

/** Fahrrad (Diamantrahmen) mit Rädern r, Radstand l; stuetz = Stützräder (Kinderrad) */
function fahrrad({ r = 0.4, l = 1.2, rahmen = "#ECE6DA", akzent = "#2B2F37", stuetz = false, sattel = 1.0, lenker = 1.0, schutz = false } = {}) {
  const g = new THREE.Group();
  const lack = lackMat(rahmen), dunkel = lackMat(akzent, 0.45), al = alu();
  const raeder = [];
  for (const x of [-l / 2, l / 2]) { const w = rad({ r, reifen: r * 0.1 }); w.position.set(x, r, 0); g.add(w); raeder.push(w); }
  const R = [-l / 2, r, 0], F = [l / 2, r, 0];
  const BB = [-l * 0.06, r * 0.6, 0];
  const ST = [-l * 0.2, r * (1.55 + 0.2 * sattel), 0];       // Sattelrohr oben
  const SB = [-l * 0.19, r * 1.62, 0];                        // Oberrohr hinten
  const H1 = [l * 0.36, r * 1.3, 0], H2 = [l * 0.34, r * 1.7, 0];
  const rr = 0.026 * Math.max(0.8, r / 0.4);
  for (const [a, b] of [[BB, H1], [BB, ST], [SB, H2], [H1, H2]]) g.add(rohr(a, b, rr, lack, 14));
  for (const s of [-1, 1]) {
    g.add(rohr([R[0], R[1], s * 0.05], [BB[0], BB[1], s * 0.05], rr * 0.55, lack), rohr([R[0], R[1], s * 0.05], [SB[0], SB[1], s * 0.04], rr * 0.55, lack));
    g.add(rohr([F[0], F[1], s * 0.05], [H1[0] - 0.01, H1[1] + 0.03, s * 0.04], rr * 0.6, dunkel));
  }
  g.add(rohr(R, [R[0], R[1], 0], 0.01, al));
  // Sattel, Stütze, Vorbau, Lenker, Griffe
  g.add(rohr(ST, [ST[0] - 0.02, ST[1] + 0.12 * sattel, 0], 0.014, al));
  const s = mesh(new THREE.SphereGeometry(1, 24, 12), gummi(), { x: ST[0] - 0.04, y: ST[1] + 0.14 * sattel });
  s.scale.set(0.12, 0.035, 0.065); g.add(s);
  g.add(rohr(H2, [H2[0] - 0.03, H2[1] + 0.13 * lenker, 0], 0.014, al));
  const lx = H2[0] - 0.035, ly = H2[1] + 0.14 * lenker;
  g.add(rohr([lx, ly, -0.22], [lx, ly, 0.22], 0.012, al), rohr([lx, ly, 0.18], [lx, ly, 0.28], 0.019, gummi(), 12), rohr([lx, ly, -0.28], [lx, ly, -0.18], 0.019, gummi(), 12));
  // Tretlager: Kettenblatt, Kurbeln, Pedale
  const blatt = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 24), al, { x: BB[0], y: BB[1], z: 0.04 }); blatt.rotation.x = Math.PI / 2; g.add(blatt);
  for (const sg of [-1, 1]) {
    g.add(rohr([BB[0], BB[1], sg * 0.06], [BB[0] + sg * 0.1, BB[1] - sg * 0.07, sg * 0.1], 0.008, al));
    g.add(mesh(new THREE.BoxGeometry(0.07, 0.012, 0.04), gummi(), { x: BB[0] + sg * 0.1, y: BB[1] - sg * 0.07, z: sg * 0.12 }));
  }
  if (schutz) for (const x of [-l / 2, l / 2]) { const sc = mesh(new THREE.TorusGeometry(r * 1.12, 0.012, 6, 24, Math.PI * 0.7), lack, { x, y: r }); sc.rotation.z = Math.PI * 0.15; g.add(sc); }
  if (stuetz) for (const sg of [-1, 1]) {
    const w = rad({ r: 0.1, reifen: 0.022, speichen: 8 }); w.position.set(-l / 2 - 0.02, 0.1, sg * 0.24); g.add(w); raeder.push(w);
    g.add(rohr([-l / 2, r, sg * 0.05], [-l / 2 - 0.02, 0.1, sg * 0.24], 0.01, al));
  }
  rolleSetzen(g, raeder.length ? raeder : []);
  g.rolle = (a) => raeder.forEach((w) => { w.rotation.z = -a / w.userData.radius; });
  return g;
}
/** Kinderrad mit Stützrädern */
export function kinderrad() { return fahrrad({ r: 0.36, l: 1.05, rahmen: "#ECE6DA", akzent: "#2B2F37", stuetz: true, sattel: 0.7, lenker: 0.9 }); }
/** Jugendfahrrad: größere Räder, Diamantrahmen, hoher Sattel */
export function jugendrad() { return fahrrad({ r: 0.55, l: 1.62, rahmen: "#D9DEE6", akzent: "#23272E", stuetz: false, sattel: 1.4, lenker: 1.1 }); }

// ---------- Windelpaket und Erstausstattung ----------
function windelTextur() {
  return gemeinsam("windeltextur", () => {
    const c = leinwand(512, 384, (g, b, h) => {
      const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, "#EAF3FA"); v.addColorStop(1, "#BFD8EC");
      g.fillStyle = v; g.fillRect(0, 0, b, h);
      g.fillStyle = "rgba(255,255,255,0.65)"; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(40 + i * 62, 340 + (i % 2) * 12, 34, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#FFFFFF";
      g.beginPath(); // Windel-Symbol: Taillenband, zwei Beinöffnungen
      g.moveTo(130, 90); g.lineTo(382, 90); g.quadraticCurveTo(398, 170, 340, 250); g.quadraticCurveTo(300, 290, 256, 224); g.quadraticCurveTo(212, 290, 172, 250); g.quadraticCurveTo(114, 170, 130, 90); g.closePath(); g.fill();
      g.fillStyle = "#8FB6D6"; g.fillRect(130, 90, 252, 26);
      g.strokeStyle = "#8FB6D6"; g.lineWidth = 5; g.beginPath(); g.moveTo(204, 150); g.lineTo(308, 150); g.stroke();
    });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  });
}
/** Windelpaket (weicher Folienkarton) mit einer Windel davor */
export function windelPaket() {
  const g = new THREE.Group();
  const folie = new THREE.MeshStandardMaterial({ color: "#DCEAF5", roughness: 0.4, metalness: 0, envMapIntensity: 0.9 });
  const front = new THREE.MeshStandardMaterial({ map: windelTextur(), roughness: 0.38, envMapIntensity: 0.9 });
  const k = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.62, 0.46, 5, 0.07), [folie, folie, folie, folie, front, front]);
  k.position.y = 0.31; k.castShadow = true; k.receiveShadow = true;
  g.add(k);
  const w = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.06, 0.34, 4, 0.025), stoffMat("#FFFFFF", 0.7));
  w.position.set(0.42, 0.03, 0.38); w.rotation.y = -0.5; w.castShadow = true;
  g.add(w);
  const band = mesh(new THREE.BoxGeometry(0.44, 0.064, 0.07), stoffMat("#8FB6D6", 0.7), { x: 0.42, y: 0.031, z: 0.38 }); band.rotation.y = -0.5;
  g.add(band);
  return g;
}
function babyBody(farbe) {
  const s = new THREE.Shape();
  s.moveTo(-0.07, 0.1); s.lineTo(-0.2, 0.06); s.lineTo(-0.27, -0.04); s.lineTo(-0.2, -0.08); s.lineTo(-0.12, -0.02); s.lineTo(-0.1, -0.2);
  s.lineTo(0.1, -0.2); s.lineTo(0.12, -0.02); s.lineTo(0.2, -0.08); s.lineTo(0.27, -0.04); s.lineTo(0.2, 0.06); s.lineTo(0.07, 0.1);
  s.quadraticCurveTo(0, 0.04, -0.07, 0.1);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }), stoffMat(farbe, 0.9));
  m.castShadow = true;
  return m;
}
/** Erstausstattung: Karton mit Schleife, Strampler, Schnuller */
export function erstausstattung() {
  const g = new THREE.Group();
  const karton = new THREE.Mesh(new RoundedBoxGeometry(0.84, 0.46, 0.62, 4, 0.03), new THREE.MeshStandardMaterial({ color: "#B88F63", roughness: 0.82 }));
  karton.position.y = 0.23; karton.castShadow = true; karton.receiveShadow = true; g.add(karton);
  const deckel = new THREE.Mesh(new RoundedBoxGeometry(0.88, 0.07, 0.66, 3, 0.02), new THREE.MeshStandardMaterial({ color: "#C9A074", roughness: 0.8 }));
  deckel.position.y = 0.5; deckel.castShadow = true; g.add(deckel);
  const band = stoffMat("#ECE6DA", 0.55);
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.5, 0.67), band, { y: 0.25 }), mesh(new THREE.BoxGeometry(0.89, 0.075, 0.1), band, { y: 0.5 }));
  for (const s of [-1, 1]) { const sc = mesh(new THREE.TorusGeometry(0.085, 0.022, 10, 24), band, { x: s * 0.07, y: 0.6 }); sc.rotation.set(Math.PI / 2 - 0.3, 0, s * 0.5); sc.scale.set(1.2, 0.8, 1); g.add(sc); }
  g.add(mesh(new THREE.SphereGeometry(0.035, 16, 10), band, { y: 0.585 }));
  const body = babyBody("#CFE5DB"); body.position.set(-0.05, 0.545, 0.1); body.rotation.set(-Math.PI / 2 + 0.06, 0, 0.2); g.add(body);
  const nu = new THREE.Group(); // Schnuller: Ring, Schild, Sauger
  nu.add(mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 24), lackMat("#F1C6D2", 0.35), { y: 0.0, z: 0.0 }));
  const schild = mesh(new THREE.SphereGeometry(1, 24, 10), lackMat("#F6E3E8", 0.3)); schild.scale.set(0.07, 0.03, 0.07); schild.position.set(0, 0, 0.01); nu.add(schild);
  const sauger = mesh(new THREE.SphereGeometry(0.035, 16, 10), stoffMat("#F7E9D3", 0.5)); sauger.position.set(0, 0.04, 0.01); sauger.scale.set(1, 1.3, 1); nu.add(sauger);
  nu.position.set(0.22, 0.6, 0.12); nu.rotation.set(-1.2, 0, 0.5); g.add(nu);
  return g;
}

// ---------- Drehteller, Altersring, Säule ----------
function tellerTextur() {
  return gemeinsam("tellertextur", () => {
    const c = leinwand(512, 512, (g, b) => {
      g.fillStyle = "#15171C"; g.fillRect(0, 0, b, b);
      const m = b / 2;
      for (let i = 0; i < 72; i++) { const w = (i / 72) * Math.PI * 2; g.strokeStyle = i % 6 === 0 ? "rgba(236,230,218,0.28)" : "rgba(236,230,218,0.09)"; g.lineWidth = i % 6 === 0 ? 3 : 1.5; g.beginPath(); g.moveTo(m + Math.cos(w) * m * 0.3, m + Math.sin(w) * m * 0.3); g.lineTo(m + Math.cos(w) * m * 0.96, m + Math.sin(w) * m * 0.96); g.stroke(); }
      for (const f of [0.34, 0.62, 0.9]) { g.strokeStyle = "rgba(236,230,218,0.16)"; g.lineWidth = 2; g.beginPath(); g.arc(m, m, m * f, 0, Math.PI * 2); g.stroke(); }
    });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  });
}
/** Drehteller mit LED-Ring in Elfenbein; modell = Gruppe auf der Platte; dreh(winkel) dreht Platte samt Modell; led.setze(k) = Helligkeit */
export function drehteller({ radius = 1.05, hoehe = 0.14, led = "#ECE6DA", ledStaerke = 2.4 } = {}) {
  const g = new THREE.Group();
  const sock = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.04, radius * 1.1, hoehe, 72), gemeinsam("sockel", () => new THREE.MeshStandardMaterial({ color: "#0C0D11", roughness: 0.28, metalness: 0.35, envMapIntensity: 1.2 })));
  sock.position.y = hoehe / 2; sock.castShadow = true; sock.receiveShadow = true; g.add(sock);
  const ledMat = leuchtMat(led, ledStaerke, { neu: true });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.045, 0.014, 8, 96), ledMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = hoehe * 0.55; g.add(ring);
  const platte = new THREE.Group(); platte.position.y = hoehe; platte.userData.dynamisch = true; g.add(platte);
  const deckel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.03, 72), new THREE.MeshStandardMaterial({ map: tellerTextur(), roughness: 0.3, metalness: 0.5, envMapIntensity: 1.2 }));
  deckel.position.y = 0.015; deckel.receiveShadow = true; deckel.castShadow = true; platte.add(deckel);
  const modell = new THREE.Group(); modell.position.y = 0.03; platte.add(modell);
  g.modell = modell; g.platte = platte; g.oben = hoehe + 0.03; g.radius = radius;
  g.dreh = (w) => { platte.rotation.y = w; };
  g.led = { setze: (k) => { ledMat.color.set(led).multiplyScalar(ledStaerke * k); } };
  g.userData.dynamisch = true;
  return g;
}
/** Altersring: n Stationen im Kreis (Start vorn, im Uhrzeigersinn), setze(alter, farbe) lässt sie nacheinander aufleuchten */
export function altersRing({ radius = 1.6, n = 18, y = 0.012 } = {}) {
  const g = new THREE.Group();
  const st = [];
  for (let i = 0; i < n; i++) {
    const gross = (i + 1) % 6 === 0;
    const mat = new THREE.MeshStandardMaterial({ color: "#1A1C22", roughness: 0.35, metalness: 0.4, emissive: new THREE.Color("#000000"), emissiveIntensity: 1 });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(gross ? 0.085 : 0.058, gross ? 0.095 : 0.066, 0.024, 24), mat);
    const w = Math.PI / 2 + (i / n) * Math.PI * 2 + (Math.PI * 2) / n * 0.5;
    m.position.set(Math.cos(w) * radius, y, Math.sin(w) * radius);
    m.receiveShadow = true;
    g.add(m); st.push({ m, mat, gross });
  }
  g.userData.dynamisch = true;
  g.setze = (alter, farbe = "#ECE6DA", staerke = 2.6) => {
    const c = new THREE.Color(farbe);
    st.forEach((s, i) => {
      const k = Math.min(1, Math.max(0, alter - i));
      const kk = k * k * (3 - 2 * k);
      s.mat.emissive.copy(c).multiplyScalar(kk * staerke * (s.gross ? 1.3 : 1));
      s.m.scale.setScalar(1 + 0.25 * Math.sin(Math.min(1, k) * Math.PI) );
    });
  };
  g.setze(0);
  return g;
}
/** Säule (Quader mit dunklem Glanz, LED-Kanten und leuchtender Kappe) in Teamfarbe; setze(h) = Höhe, led(k) = Helligkeit */
export function saeule({ breite = 0.5, farbe = "#FF4F9A", staerke = 3 } = {}) {
  const g = new THREE.Group();
  const koerper = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: new THREE.Color(farbe).multiplyScalar(0.32), emissive: new THREE.Color(farbe), emissiveIntensity: 0.42, roughness: 0.18, metalness: 0.45, envMapIntensity: 1.3 }));
  koerper.castShadow = true; koerper.receiveShadow = true; g.add(koerper);
  const ledMat = leuchtMat(farbe, staerke, { neu: true });
  const kanten = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1, 0.03), ledMat); kanten.push([k, sx, sz]); g.add(k); }
  const kappe = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.03, 1.02), ledMat); g.add(kappe);
  g.userData.dynamisch = true;
  g.setze = (h) => {
    const hh = Math.max(0.0001, h);
    koerper.scale.set(breite, hh, breite); koerper.position.y = hh / 2;
    for (const [k, sx, sz] of kanten) { k.scale.set(1, hh, 1); k.position.set(sx * breite / 2, hh / 2, sz * breite / 2); }
    kappe.scale.set(breite, 1, breite); kappe.position.y = hh;
    g.visible = h > 0.002;
  };
  g.led = (k) => { ledMat.color.set(farbe).multiplyScalar(staerke * k); };
  g.setze(0);
  return g;
}
