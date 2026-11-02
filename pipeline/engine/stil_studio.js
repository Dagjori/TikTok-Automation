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
