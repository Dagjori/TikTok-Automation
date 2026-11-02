// Account 2, Video 2: „Wie hoch bringt dich eine Tafel Schokolade?“
// Stil 16 „POV-Filmlook stilisiert“ (wie im Prototyp): Ich-Kamera, goldene Stunde, Bloom, Vignette, Körnung.
// Küche → durch die Decke → über die Stadt → Höhenmarken (Dom, Fernsehturm, Brocken, Feldberg, Zugspitze).
// Rechnung: ../../sim/schokolade_hoehe.mjs (Tests: node --test sim/schokolade_hoehe.test.mjs).
// Deterministisch: window.renderAt(t). Kein Logo, kein Kanalname, keine Rubrik im Bild.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { Buehne } from "../../engine/kern.js";
import { lichtTag } from "../../engine/licht.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD, el } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash, keyframes } from "../../engine/bewegung.js";
import { mat } from "../../engine/bausteine.js";
import * as S from "../../sim/schokolade_hoehe.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 1024;
const BLOOM = Q.has("bloom") ? +Q.get("bloom") : 0.85;
const SKALA = Q.has("skala") ? +Q.get("skala") : 1; // interne 3D-Auflösung (HUD bleibt scharf)
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

// Teamfarben (überall gleich): a = Schokolade (Koralle), b = Höhe (Türkis), c = neutral (Zugspitze, TNT). Kein Gelb.
const KORALLE = "#FF4F5A";
const TUERKIS = "#2EC4B6";
const STAHL = "#8B93B5";
const ABGELAUFEN = "#3B3F55";
const HORIZONT = "#F2A878"; // Dunst = Horizontfarbe des Himmels (Nebel passt dazu)

// =====================================================================================
// Geometrie der Welt (Meter). Küchenboden y = 0, Augenhöhe im Sitzen 1,2 m. Flug nach −z (Blick = Kamera-Standardrichtung).
// Die Höhe im Zähler ist die Höhe über dem Startpunkt (Annahme: Start auf Meereshöhe, siehe skript.json).
// =====================================================================================
const EYE0 = 1.2;
const BODEN = -9.6; // Stadtboden (Küche im dritten Stock)
const HTOP = S.hoehe(); // 3.070,8 m
const MARKE = Object.fromEntries(S.MARKEN.map((m) => [m.id, m]));
const ZUG_X = 2700, ZUG_Z = -2300; // Gipfel der Zugspitze (seitlich versetzt: aus dem Küchenfenster sieht man Stadt und Himmel)
const CAM0 = V(0, EYE0, 0.3); // Startposition der Kamera
// Horizontaler Flugpfad: quadratische Bezier-Kurve P0 → P1 → E (E = 70 m vor dem Gipfel, damit der Blick nie senkrecht nach unten geht)
const P1X = 200, P1Z = -1900;
const _tl = Math.hypot(ZUG_X - P1X, ZUG_Z - P1Z);
const END_X = ZUG_X - ((ZUG_X - P1X) / _tl) * 70, END_Z = ZUG_Z - ((ZUG_Z - P1Z) / _tl) * 70;
const bezier = (g) => { const a = (1 - g) * (1 - g), b = 2 * (1 - g) * g, c = g * g; return [a * CAM0.x + b * P1X + c * END_X, a * CAM0.z + b * P1Z + c * END_Z]; };
/** Anteil des Wegs bei Höhe h (langsam am Anfang, damit die Küche nicht verlassen wird) */
const gWeg = (h) => Math.pow(clamp(h / HTOP), 1.25);
/** Kamerapfad: Position bei Höhe h (m über Start) */
function pfad(h) {
  const [x, z] = bezier(gWeg(h));
  return V(x, EYE0 + h, z);
}
/** Flugrichtung (waagerecht, normiert) bei Höhe h */
function kurs(h) {
  const g = clamp(gWeg(h), 0.0005, 0.9995);
  const [x0, z0] = bezier(g - 0.0004), [x1, z1] = bezier(g + 0.0004);
  const l = Math.hypot(x1 - x0, z1 - z0);
  return { x: (x1 - x0) / l, z: (z1 - z0) / l };
}
/** Punkt neben dem Pfad: seitlich (lat > 0 = rechts) und vor/zurück (vor > 0 = in Flugrichtung) */
function nebenPfad(h, lat, vor = 0) {
  const p = pfad(h), k = kurs(h);
  return { x: p.x + -k.z * lat + k.x * vor, z: p.z + k.x * lat + k.z * vor };
}
const topY = (m) => EYE0 + m.hoehe; // Weltkoordinate der Spitze (Zähler 0 = Augenhöhe in der Küche)

// Berge (Kegel mit Profil). Lage: seitlich des (geraden) Flugpfads, außerhalb des Fußes → keine Durchdringung
const BERGE = {
  brocken: { ...MARKE.brocken, R: 1000, form: "kuppe", ...nebenPfad(MARKE.brocken.hoehe, -(1000 + 320), 40) },
  feldberg: { ...MARKE.feldberg, R: 1150, form: "kuppe", ...nebenPfad(MARKE.feldberg.hoehe, 1150 + 360, 40) },
  zugspitze: { ...MARKE.zugspitze, R: 1700, form: "spitze", x: ZUG_X, z: ZUG_Z },
};
/** Höhe des Geländes (Weltkoordinate y) bei (x, z) – gleiche Formel wie die Berg-Netze, nur Obergrenze */
function gelaende(x, z) {
  let y = BODEN;
  for (const b of Object.values(BERGE)) {
    if (!b.R) continue;
    const d = Math.hypot(x - b.x, z - b.z);
    if (d >= b.R) continue;
    const u = d / b.R;
    const f = b.form === "kuppe" ? 1 - u * u : Math.pow(1 - u, 1.35);
    y = Math.max(y, BODEN + (topY(b) - BODEN) * f);
  }
  return y;
}

// =====================================================================================
// Hilfen
// =====================================================================================
function canvasTextur(b, h, malen, { wiederholen = false } = {}) {
  const c = document.createElement("canvas");
  c.width = b; c.height = h;
  malen(c.getContext("2d"), b, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (wiederholen) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function textSprite(text, { farbe = "#FFFFFF", kontur = "#0B1020", hoehe = 0.5, schrift = 900, b = 1024, h = 256 } = {}) {
  const tex = canvasTextur(b, h, (g) => {
    g.font = `${schrift} ${Math.round(h * 0.62)}px "SB Display", Inter, sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.lineJoin = "round"; g.lineWidth = h * 0.11; g.strokeStyle = kontur;
    g.strokeText(text, b / 2, h * 0.54);
    g.fillStyle = farbe; g.fillText(text, b / 2, h * 0.54);
  });
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, fog: false });
  const s = new THREE.Sprite(m);
  s.scale.set(hoehe * (b / h), hoehe, 1);
  s.renderOrder = 30;
  return s;
}
const fmtZahl = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const hex = (c) => new THREE.Color(c);

/** Monotone kubische Hermite-Interpolation (Fritsch–Carlson): glatt, kein Überschwingen, streng deterministisch */
function monoton(keys) {
  const n = keys.length;
  const dx = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx.push(keys[i + 1].t - keys[i].t); m.push((keys[i + 1].v - keys[i].v) / dx[i]); }
  const tg = new Array(n).fill(0);
  tg[0] = m[0]; tg[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) tg[i] = m[i - 1] * m[i] <= 0 ? 0 : (2 * m[i - 1] * m[i]) / (m[i - 1] + m[i]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { tg[i] = 0; tg[i + 1] = 0; continue; }
    const a = tg[i] / m[i], b = tg[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); tg[i] = k * a * m[i]; tg[i + 1] = k * b * m[i]; }
  }
  return (t) => {
    if (t <= keys[0].t) return keys[0].v;
    if (t >= keys[n - 1].t) return keys[n - 1].v;
    let i = 0;
    while (t > keys[i + 1].t) i++;
    const h = dx[i], u = (t - keys[i].t) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * keys[i].v + (u3 - 2 * u2 + u) * h * tg[i] + (-2 * u3 + 3 * u2) * keys[i + 1].v + (u3 - u2) * h * tg[i + 1];
  };
}

// =====================================================================================
// Himmel, Boden, Stadt, Berge
// =====================================================================================
const SONNE = V(-0.17, 0.16, -0.97).normalize(); // Richtung zur Sonne (links der Flugrichtung, tief)

function himmelBauen() {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      zenit: { value: hex("#1C2B63") }, mitte: { value: hex("#7A5C9C") }, horizont: { value: hex(HORIZONT) }, unten: { value: hex("#C98B6B") },
      sonne: { value: SONNE.clone() },
    },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.9999; }`,
    fragmentShader: `uniform vec3 zenit, mitte, horizont, unten, sonne; varying vec3 vD;
      void main(){
        float h = vD.y;
        vec3 oben = mix(horizont, mix(mitte, zenit, smoothstep(0.22, 0.95, h)), smoothstep(0.0, 0.42, h));
        vec3 col = h >= 0.0 ? oben : mix(horizont, unten, smoothstep(0.0, 0.3, -h));
        float sd = max(dot(normalize(vD), normalize(sonne)), 0.0);
        col *= 0.8; col += vec3(1.0, 0.52, 0.22) * pow(sd, 6.0) * 0.32 + vec3(1.0, 0.78, 0.5) * pow(sd, 64.0) * 0.6;
        col += vec3(1.0, 0.86, 0.62) * smoothstep(0.99955, 0.99985, sd) * 9.0;
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  });
  const k = new THREE.Mesh(new THREE.SphereGeometry(30000, 32, 20), m);
  k.renderOrder = -10; k.frustumCulled = false;
  return k;
}

function berg(b, seed, farben) {
  const N = 14, M = 14;
  const hTop = topY(b);
  const pos = [], col = [], idx = [];
  const f = (u) => (b.form === "kuppe" ? 1 - u * u : Math.pow(1 - u, 1.35));
  const c = new THREE.Color();
  for (let i = 0; i <= N; i++) {
    const u = Math.pow(i / N, 0.85);
    for (let j = 0; j <= (i === 0 ? 0 : M); j++) {
      const a = (j / M) * Math.PI * 2 + (i > 0 ? (hash(i * 71 + j, seed) - 0.5) * 0.18 : 0);
      const schrumpf = i === 0 || i === N ? 1 : 1 - 0.16 * hash(i * 131 + j, seed + 7); // nur nach innen → Oberfläche bleibt unter der Nennform
      const d = u * b.R * schrumpf;
      const y = BODEN + (hTop - BODEN) * f(u);
      pos.push(b.x + Math.cos(a) * d, y, b.z + Math.sin(a) * d);
      const t = (y - BODEN) / (hTop - BODEN);
      const rausch = hash(i * 17 + j, seed + 3);
      farben(c, t, rausch);
      col.push(c.r, c.g, c.b);
    }
  }
  // Dreiecke: Ring 0 (Spitze, 1 Punkt) → Ring 1 (M+1 Punkte)
  const ring0 = 1;
  const start = (i) => (i === 0 ? 0 : 1 + (i - 1) * (M + 1));
  for (let j = 0; j < M; j++) idx.push(0, start(1) + j + 1, start(1) + j);
  for (let i = 1; i < N; i++) for (let j = 0; j < M; j++) {
    const a = start(i) + j, bb = start(i) + j + 1, cc = start(i + 1) + j, dd = start(i + 1) + j + 1;
    idx.push(a, bb, cc, bb, dd, cc);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  void ring0;
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide }));
  mesh.frustumCulled = false;
  return mesh;
}

function wolkenTextur() {
  return canvasTextur(256, 256, (g, b, h) => {
    g.clearRect(0, 0, b, h);
    for (let i = 0; i < 9; i++) {
      const x = b * (0.25 + 0.5 * hash(i, 5)), y = h * (0.4 + 0.25 * hash(i, 6)), r = b * (0.16 + 0.14 * hash(i, 7));
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(255,255,255,0.55)"); grad.addColorStop(0.55, "rgba(255,255,255,0.22)"); grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad; g.fillRect(0, 0, b, h);
    }
  });
}

/** Stadt: instanzierte Häuser (4 Klassen), Straßen- und Parktextur, Fluss */
function stadtBauen(szene) {
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshStandardMaterial({ color: "#4B5A43", roughness: 1 }));
  boden.rotation.x = -Math.PI / 2; boden.position.set(0, BODEN - 0.6, 0); szene.add(boden);

  const CX = 0, CZ = -300, HALB = 1300; // Stadtfläche
  const tex = canvasTextur(2048, 2048, (g, b, h) => {
    g.fillStyle = "#5E6B52"; g.fillRect(0, 0, b, h);
    const px = b / (2 * HALB); // Pixel je Meter
    const wz = (x, z) => [(x - (CX - HALB)) * px, (z - (CZ - HALB)) * px];
    g.fillStyle = "#3D3F4B"; // Straßen
    for (let gx = -14; gx <= 14; gx++) { const [x] = wz(gx * 90, 0); g.fillRect(x - 9 * px, 0, 18 * px, h); }
    for (let gz = -20; gz <= 8; gz++) { const [, z] = wz(0, gz * 90); g.fillRect(0, z - 9 * px, b, 18 * px); }
    g.fillStyle = "rgba(255,214,150,0.65)"; // Mittellinie / Laternenlicht
    for (let gx = -14; gx <= 14; gx++) { const [x] = wz(gx * 90, 0); g.fillRect(x - 0.8 * px, 0, 1.6 * px, h); }
    for (let gz = -20; gz <= 8; gz++) { const [, z] = wz(0, gz * 90); g.fillRect(0, z - 0.8 * px, b, 1.6 * px); }
    // Park und Fluss
    g.fillStyle = "#6D8A55";
    const [pa, pb] = wz(-560, -820); g.fillRect(pa, pb, 360 * px, 300 * px);
    g.strokeStyle = "#5F8BB3"; g.lineWidth = 56 * px; g.lineCap = "round"; g.beginPath();
    for (let i = 0; i <= 40; i++) { const z = CZ - HALB + (i / 40) * 2 * HALB; const x = 380 + 120 * Math.sin(i * 0.38) + 60 * Math.sin(i * 0.9); const [a, c2] = wz(x, z); if (i === 0) g.moveTo(a, c2); else g.lineTo(a, c2); }
    g.stroke();
  });
  const ebene = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALB, 2 * HALB), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  ebene.rotation.x = -Math.PI / 2; ebene.position.set(CX, BODEN - 0.3, CZ); szene.add(ebene);

  // Fassaden: Klassen nach Höhe
  const fassade = canvasTextur(128, 128, (g, b, h) => {
    g.fillStyle = "#EFE6DA"; g.fillRect(0, 0, b, h);
    g.fillStyle = "#6F7C94"; g.fillRect(24, 22, 80, 84);
    g.fillStyle = "#F7F2EA"; g.fillRect(62, 22, 4, 84); g.fillRect(24, 62, 80, 4);
  }, { wiederholen: true });
  const licht = canvasTextur(128, 128, (g, b, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, b, h);
    g.fillStyle = "#FFB366"; g.fillRect(26, 24, 36, 36); g.fillStyle = "#FFD9A0"; g.fillRect(66, 66, 36, 38);
  }, { wiederholen: true });
  licht.colorSpace = THREE.SRGBColorSpace;
  const klassen = [{ h: 14, w: 26, d: 22 }, { h: 24, w: 30, d: 26 }, { h: 38, w: 28, d: 28 }, { h: 64, w: 24, d: 24 }];
  const farben = ["#F1DEC8", "#E6C7A8", "#D8B79A", "#C9C3D6", "#E8D3C2", "#BFA79A", "#F0E8DD"];
  const lagen = klassen.map(() => []);
  const sperr = [V(-80, 0, -55), V(120, 0, -190)]; // Platz für Dom und Fernsehturm
  for (let gx = -14; gx <= 14; gx++) for (let gz = -18; gz <= 8; gz++) {
    const x = gx * 90 + (hash(gx * 53 + gz, 1) - 0.5) * 14, z = gz * 90 + (hash(gx * 29 + gz * 7, 2) - 0.5) * 14;
    if (Math.abs(x) < 70 && Math.abs(z) < 50) continue; // eigenes Haus
    if (sperr.some((p) => Math.hypot(x - p.x, z - p.z) < 95)) continue;
    if (gelaende(x, z) > BODEN + 25) continue;
    if (Math.abs(x - 380) < 150 && true) { const fl = 380 + 120 * Math.sin(((z - (CZ - HALB)) / (2 * HALB)) * 40 * 0.38) + 60 * Math.sin(((z - (CZ - HALB)) / (2 * HALB)) * 40 * 0.9); if (Math.abs(x - fl) < 70) continue; }
    if (x > -560 && x < -200 && z > -820 && z < -520) continue; // Park
    const dist = Math.hypot(x, z + 100);
    const r = hash(gx * 91 + gz * 13, 3);
    const k = r < 0.06 ? 3 : r < 0.25 ? 2 : r < 0.6 ? 1 : 0;
    lagen[dist > 700 && k > 1 ? 0 : k].push({ x, z, rot: hash(gx + gz * 17, 4) < 0.5 ? 0 : Math.PI / 2, farbe: farben[Math.floor(hash(gx * 3 + gz * 11, 5) * farben.length)] });
  }
  klassen.forEach((kl, i) => {
    const geo = new THREE.BoxGeometry(kl.w, kl.h, kl.d);
    const uv = geo.attributes.uv;
    const skal = [kl.d / 3, kl.h / 3.2, kl.d / 3, kl.h / 3.2, 0.001, 0.001, 0.001, 0.001, kl.w / 3, kl.h / 3.2, kl.w / 3, kl.h / 3.2]; // je Fläche (px, nx, py, ny, pz, nz) × (u, v)
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
      const k = f * 4 + v;
      const su = f < 2 ? kl.d / 3 : f < 4 ? 0.001 : kl.w / 3, sv = f < 4 && f >= 2 ? 0.001 : kl.h / 3.2;
      uv.setXY(k, uv.getX(k) * su, uv.getY(k) * sv);
    }
    void skal;
    const m = new THREE.MeshStandardMaterial({ map: fassade, emissive: "#FFFFFF", emissiveMap: licht, emissiveIntensity: 0.55, roughness: 0.85 });
    const inst = new THREE.InstancedMesh(geo, m, Math.max(1, lagen[i].length));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
    lagen[i].forEach((p, n) => {
      q.setFromAxisAngle(V(0, 1, 0), p.rot);
      m4.compose(V(p.x, BODEN + kl.h / 2, p.z), q, s1);
      inst.setMatrixAt(n, m4);
      inst.setColorAt(n, c.set(p.farbe));
    });
    inst.count = lagen[i].length;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.frustumCulled = false;
    szene.add(inst);
  });
}

// =====================================================================================
// Wahrzeichen
// =====================================================================================
function domBauen() {
  const g = new THREE.Group();
  const stein = mat("#7A6F66", { rau: 0.95 }), dunkel = mat("#5E554F", { rau: 1 });
  const H = MARKE.dom.hoehe + EYE0 - BODEN; // Höhe vom Boden
  const kasten = (b, h, d, x, y, z, m) => { const k = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), m); k.position.set(x, y, z); g.add(k); return k; };
  kasten(40, 44, 96, 0, 22, -20, stein); // Schiff
  kasten(34, 6, 90, 0, 47, -20, dunkel); // Dachfirst
  const dach = new THREE.Mesh(new THREE.CylinderGeometry(1, 20, 10, 4, 1), dunkel); dach.rotation.y = Math.PI / 4; dach.scale.set(1, 1, 2.3); dach.position.set(0, 55, -20); g.add(dach);
  for (const sx of [-12, 12]) { // zwei Westtürme
    kasten(16, H * 0.62, 16, sx, (H * 0.62) / 2, 34, stein);
    kasten(12, H * 0.2, 12, sx, H * 0.62 + (H * 0.2) / 2, 34, stein);
    const spitze = new THREE.Mesh(new THREE.ConeGeometry(8.2, H * 0.19, 8), dunkel); spitze.position.set(sx, H * 0.82 + (H * 0.19) / 2, 34); g.add(spitze);
    for (const [ox, oz] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) { const p = new THREE.Mesh(new THREE.ConeGeometry(1.6, 18, 5), dunkel); p.position.set(sx + ox, H * 0.62 + 6, 34 + oz); g.add(p); }
  }
  kasten(14, 62, 14, 0, 31, -66, stein); // Vierungsturm klein
  const kr = new THREE.Mesh(new THREE.ConeGeometry(6, 26, 8), dunkel); kr.position.set(0, 75, -66); g.add(kr);
  g.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  return g;
}
function fernsehturmBauen() {
  const g = new THREE.Group();
  const beton = mat("#D9D6D2", { rau: 0.8 }), metall = new THREE.MeshStandardMaterial({ color: "#C8CCD4", roughness: 0.22, metalness: 0.9, emissive: "#FFB070", emissiveIntensity: 0.12 });
  const hoehe = MARKE.turm.hoehe + EYE0 - BODEN;
  const schaft = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 9, 203 + 10, 20, 1), beton); schaft.position.y = (203 + 10) / 2; g.add(schaft);
  const kugel = new THREE.Mesh(new THREE.SphereGeometry(16, 28, 18), metall); kugel.position.y = 213 + 4; g.add(kugel);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(16.4, 16.4, 4, 28, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFD7A0").multiplyScalar(2.2) })); band.position.y = 217; g.add(band);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2.4, hoehe - 235, 10, 1), mat("#E8E8EC", { rau: 0.5 })); mast.position.y = 235 + (hoehe - 235) / 2; g.add(mast);
  const rot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.2, 10, 8), mat("#FF4F5A", { rau: 0.5, emissiv: "#FF4F5A", emissivStaerke: 0.6 })); rot.position.y = hoehe - 20; g.add(rot);
  const lampe = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FF4F5A").multiplyScalar(5) })); lampe.position.y = hoehe - 1; g.add(lampe);
  g.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  return g;
}
function gipfelAusruestung(b) {
  const g = new THREE.Group();
  const y = topY(b);
  if (b.id === "zugspitze") {
    const gold = new THREE.MeshStandardMaterial({ color: "#F2C14E", roughness: 0.3, metalness: 0.8, emissive: "#F2B040", emissiveIntensity: 0.5 });
    const a = new THREE.Mesh(new THREE.BoxGeometry(2.2, 14, 2.2), gold); a.position.set(b.x, y + 7, b.z); g.add(a);
    const q = new THREE.Mesh(new THREE.BoxGeometry(9, 2.2, 2.2), gold); q.position.set(b.x, y + 10.5, b.z); g.add(q);
    const hs = new THREE.Mesh(new THREE.BoxGeometry(34, 12, 22), mat("#D9DCE4", { rau: 0.6 })); hs.position.set(b.x - 36, y - 20, b.z + 14); hs.rotation.y = 0.4; g.add(hs);
    const hs2 = new THREE.Mesh(new THREE.BoxGeometry(18, 22, 16), mat("#8A8F9E", { rau: 0.7 })); hs2.position.set(b.x - 14, y - 12, b.z - 24); g.add(hs2);
  } else if (b.id === "brocken") {
    const m1 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.4, 70, 8), mat("#E8E8EC", { rau: 0.5 })); m1.position.set(b.x, y + 35, b.z); g.add(m1);
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 18), mat("#CDB8A0", { rau: 0.9 })); h1.position.set(b.x + 24, y - 4, b.z); g.add(h1);
  } else if (b.id === "feldberg") {
    const m1 = new THREE.Mesh(new THREE.CylinderGeometry(2, 4.2, 48, 10), mat("#D8D6D2", { rau: 0.8 })); m1.position.set(b.x, y + 24, b.z); g.add(m1);
    const k1 = new THREE.Mesh(new THREE.CylinderGeometry(6, 4, 8, 12), mat("#BFC3CC", { rau: 0.6 })); k1.position.set(b.x, y + 50, b.z); g.add(k1);
  }
  g.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  return g;
}

// =====================================================================================
// Schokoladentafel (24 Stückchen, 6 × 4)
// =====================================================================================
const PW = 0.0245, PT = 0.0125, PD = 0.0178, LUECKE = 0.0032;
function stueckGeo() {
  const a = new RoundedBoxGeometry(PW, PT * 0.62, PD, 3, 0.0032); a.translate(0, PT * 0.31, 0);
  const b = new RoundedBoxGeometry(PW * 0.76, PT * 0.5, PD * 0.72, 3, 0.0036); b.translate(0, PT * 0.62 + PT * 0.2, 0);
  const g = mergeGeometries([a.toNonIndexed(), b.toNonIndexed()]);
  return g;
}
function tafelBauen() {
  const gruppe = new THREE.Group();
  const geo = stueckGeo();
  const stuecke = [];
  const L = 6 * PW + 5 * LUECKE, Bq = 4 * PD + 3 * LUECKE;
  for (let c = 0; c < 6; c++) for (let r = 0; r < 4; r++) {
    const i = c * 4 + r; // verbrauchte Reihenfolge: Spalte für Spalte von links
    const m = new THREE.MeshStandardMaterial({ color: "#5E3522", roughness: 0.36, metalness: 0.02, emissive: "#FF6A3A", emissiveIntensity: 0 });
    const k = new THREE.Mesh(geo, m);
    k.position.set(-L / 2 + PW / 2 + c * (PW + LUECKE), 0.0012, -Bq / 2 + PD / 2 + r * (PD + LUECKE));
    k.castShadow = true; k.receiveShadow = true;
    gruppe.add(k);
    stuecke[i] = { k, x: k.position.x, y: k.position.y, z: k.position.z };
  }
  const folie = new THREE.Mesh(new RoundedBoxGeometry(L + 0.02, 0.0012, Bq + 0.02, 2, 0.0006), new THREE.MeshStandardMaterial({ color: "#C9CED8", roughness: 0.28, metalness: 0.95 }));
  folie.position.y = -0.0014; folie.receiveShadow = true; folie.castShadow = true; gruppe.add(folie);
  return { gruppe, stuecke, L, Bq };
}

// =====================================================================================
// Welt
// =====================================================================================
function baueWelt(buehne) {
  const szene = new THREE.Scene();
  szene.fog = new THREE.Fog(HORIZONT, 500, 18000);
  const himmel = himmelBauen();
  szene.add(himmel);
  const licht = lichtTag(szene, buehne.renderer, { bereich: 4.2, schattenKarte: Math.max(512, SCHATTEN), sonnenRichtung: [SONNE.x, SONNE.y, SONNE.z], sonnenFarbe: "#FFB174", sonnenStaerke: 2.1,
    himmel: "#FFD9B5", boden: "#7B5C58", himmelStaerke: 0.5, umgebungsStaerke: 0.22, schattenWeich: 3, ziel: [0, 0.8, -0.4] });
  licht.sonne.castShadow = SCHATTEN > 0;
  licht.sonne.shadow.camera.far = 90; licht.sonne.shadow.camera.updateProjectionMatrix();
  szene.environmentIntensity = 0.22;

  // ---------- Küche ----------
  const holz = canvasTextur(512, 512, (g, b, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = ["#B98B5E", "#C39868", "#B08257", "#BC9062"][i % 4]; g.fillRect(i * 64, 0, 64, h); g.fillStyle = "rgba(60,35,20,0.35)"; g.fillRect(i * 64, 0, 3, h); }
    for (let i = 0; i < 90; i++) { g.fillStyle = "rgba(80,50,30,0.10)"; g.fillRect(Math.floor(hash(i, 1) * 512), Math.floor(hash(i, 2) * 512), 2, 18 + hash(i, 3) * 60); }
  }, { wiederholen: true });
  holz.repeat.set(3, 3);
  const bodenK = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 4.6), new THREE.MeshStandardMaterial({ map: holz, roughness: 0.6 }));
  bodenK.position.set(0, -0.05, -0.3); bodenK.receiveShadow = true; szene.add(bodenK);
  const wandM = new THREE.MeshStandardMaterial({ color: "#EBD6B8", roughness: 0.95 });
  const wand = (b, h, d, x, y, z, m = wandM) => { const k = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), m); k.position.set(x, y, z); k.castShadow = true; k.receiveShadow = true; szene.add(k); return k; };
  wand(0.12, 2.6, 4.6, -2.3, 1.3, -0.3); wand(0.12, 2.6, 4.6, 2.3, 1.3, -0.3); wand(4.6, 2.6, 0.12, 0, 1.3, 2.0); // links, rechts, hinten
  wand(1.45, 2.6, 0.12, -1.575, 1.3, -2.6); wand(1.45, 2.6, 0.12, 1.575, 1.3, -2.6); wand(1.7, 0.9, 0.12, 0, 0.45, -2.6); wand(1.7, 0.45, 0.12, 0, 2.375, -2.6); // vorn mit Fensteröffnung
  const rahmenM = mat("#F7F3EC", { rau: 0.6 });
  for (const [b, h, x, y] of [[1.78, 0.06, 0, 2.15], [1.78, 0.06, 0, 0.9], [0.06, 1.3, -0.86, 1.52], [0.06, 1.3, 0.86, 1.52], [0.05, 1.24, 0, 1.52]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(b, h, 0.08), rahmenM); r.position.set(x, y, -2.52); r.castShadow = true; szene.add(r); }
  const bank = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.3), mat("#F7F3EC", { rau: 0.5 })); bank.position.set(0, 0.9, -2.45); szene.add(bank);
  for (const sx of [-1, 1]) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.05), new THREE.MeshStandardMaterial({ color: "#E7B79B", roughness: 1 })); v.position.set(sx * 1.05, 1.5, -2.42); v.castShadow = true; szene.add(v); }
  // Pflanze auf der Fensterbank
  const topf = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.12, 14), mat("#C86B4E", { rau: 0.8 })); topf.position.set(0.55, 1.0, -2.45); szene.add(topf);
  for (let i = 0; i < 7; i++) { const bl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat("#4E8F55", { rau: 0.8 })); bl.scale.set(1, 0.45, 1.6); bl.position.set(0.55 + (hash(i, 1) - 0.5) * 0.14, 1.1 + hash(i, 2) * 0.1, -2.45 + (hash(i, 3) - 0.5) * 0.1); bl.rotation.set(hash(i, 4) - 0.5, hash(i, 5) * 6, 0.4); szene.add(bl); }
  // Zeile links: Unterschränke, Platte, Oberschränke
  const schr = mat("#2F7F86", { rau: 0.55 }), platte = mat("#C9A27A", { rau: 0.5 });
  wand(0.62, 0.86, 3.0, -1.97, 0.43, -1.1, schr); wand(0.66, 0.05, 3.04, -1.97, 0.885, -1.1, platte);
  for (let i = 0; i < 5; i++) { const gr = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.18), mat("#E9E4DA", { metall: 0.6, rau: 0.3 })); gr.position.set(-1.65, 0.7, -2.4 + i * 0.6); szene.add(gr); }
  wand(0.36, 0.8, 2.4, -2.11, 1.85, -1.3, mat("#E9E4DA", { rau: 0.6 }));
  const kessel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.17, 18), mat("#D5D9E0", { rau: 0.25, metall: 0.9 })); kessel.position.set(-1.95, 1.0, -1.7); kessel.castShadow = true; szene.add(kessel);
  const brett = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.2), mat("#9C7048", { rau: 0.7 })); brett.position.set(-1.95, 0.92, -0.8); brett.rotation.y = 0.3; szene.add(brett);
  // Kühlschrank rechts
  wand(0.7, 1.85, 0.68, 1.9, 0.925, -2.15, mat("#E7ECF2", { rau: 0.35 }));
  const kg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.03), mat("#9AA3B4", { metall: 0.8, rau: 0.3 })); kg.position.set(1.52, 1.3, -1.85); szene.add(kg);
  // Bild an der Wand
  const bild = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.6, 0.45), mat("#F6EBD9", { rau: 0.8 })); bild.position.set(2.22, 1.6, -0.6); szene.add(bild);
  const bildInnen = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.46, 0.32), new THREE.MeshStandardMaterial({ color: "#E3875F", roughness: 0.8 })); bildInnen.position.set(2.21, 1.6, -0.6); szene.add(bildInnen);
  // Pendelleuchte
  const schnur = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.55, 6), mat("#2A2A32")); schnur.position.set(0, 2.33, -0.5); szene.add(schnur);
  const schirm = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.17, 20, 1, true), new THREE.MeshStandardMaterial({ color: "#F4E6CF", roughness: 0.6, side: THREE.DoubleSide, emissive: "#FFC890", emissiveIntensity: 0.8 })); schirm.position.set(0, 2.1, -0.5); szene.add(schirm);
  const birne = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFE2B8").multiplyScalar(5) })); birne.position.set(0, 2.03, -0.5); szene.add(birne);

  // Tisch
  const tischM = new THREE.MeshStandardMaterial({ map: holz, color: "#E6C9A2", roughness: 0.5 });
  const platteT = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.05, 1.1, 3, 0.012), tischM); platteT.position.set(0, 0.735, -0.45); platteT.castShadow = true; platteT.receiveShadow = true; szene.add(platteT);
  for (const [lx, lz] of [[-0.72, -0.92], [0.72, -0.92], [-0.72, 0.02], [0.72, 0.02]]) { const bn = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.71, 10), mat("#8E6A47", { rau: 0.6 })); bn.position.set(lx, 0.355, lz); bn.castShadow = true; szene.add(bn); }
  const tuch = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.004, 0.9), new THREE.MeshStandardMaterial({ map: canvasTextur(256, 256, (g, b, h) => { g.fillStyle = "#EFE3D0"; g.fillRect(0, 0, b, h); g.fillStyle = "rgba(150,90,70,0.16)"; for (let i = 0; i < 8; i++) { g.fillRect(i * 32, 0, 5, h); g.fillRect(0, i * 32, b, 5); } }), roughness: 1 }));
  tuch.position.set(0, 0.762, -0.45); tuch.receiveShadow = true; tuch.rotation.y = 0.05; szene.add(tuch);
  const becher = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.04, 0.09, 18), mat("#2EC4B6", { rau: 0.35 })); becher.position.set(0.5, 0.81, -0.75); becher.castShadow = true; becher.receiveShadow = true; szene.add(becher);
  const henkel = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 8, 14, Math.PI), mat("#2EC4B6", { rau: 0.35 })); henkel.position.set(0.545, 0.81, -0.75); henkel.rotation.z = -Math.PI / 2; szene.add(henkel);
  const schale = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat("#F1EAE0", { rau: 0.5 })); schale.position.set(-0.52, 0.86, -0.7); schale.castShadow = true; szene.add(schale);
  for (let i = 0; i < 4; i++) { const ap = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), mat(i % 2 ? "#D4403A" : "#8FBF4F", { rau: 0.5 })); ap.position.set(-0.52 + (i % 2 - 0.5) * 0.06 + (i > 1 ? 0.01 : 0), 0.82 + (i > 1 ? 0.045 : 0), -0.7 + (i > 1 ? 0 : (i - 0.5) * 0.03)); ap.castShadow = true; szene.add(ap); }

  // Riegel
  const tafel = tafelBauen();
  szene.add(tafel.gruppe);

  // ---------- Gebäude: Hülle, Dach (Decke), Aufbauten ----------
  const dachM = new THREE.MeshStandardMaterial({ color: "#DAD3C9", roughness: 0.9, transparent: true, opacity: 1 });
  const dach = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.5, 8.7), dachM);
  dach.position.set(0, 2.85, 1.69); dach.castShadow = true; dach.receiveShadow = true; szene.add(dach);
  const huelle = new THREE.Mesh(new THREE.BoxGeometry(10.4, 2.6 - BODEN, 8.7), new THREE.MeshStandardMaterial({ map: canvasTextur(256, 256, (g, b, h) => {
    g.fillStyle = "#E9DCCB"; g.fillRect(0, 0, b, h);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { g.fillStyle = hash(r * 9 + c, 4) > 0.5 ? "#F0C689" : "#5C6B88"; g.fillRect(14 + c * 40, 18 + r * 58, 24, 36); }
  }, { wiederholen: true }), roughness: 0.9, emissive: "#FFFFFF", emissiveIntensity: 0.0 }));
  huelle.material.map.repeat.set(2, 1); huelle.position.set(0, (2.6 + BODEN) / 2, 1.69); szene.add(huelle);
  huelle.material.emissiveIntensity = 0;
  // Dachaufbauten (nur von oben sichtbar)
  const aufbauten = new THREE.Group();
  const ab = (b, h, d, x, y, z, m) => { const k = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), m); k.position.set(x, y, z); k.castShadow = true; aufbauten.add(k); return k; };
  ab(10.6, 0.5, 0.2, 0, 3.35, -2.75, mat("#B9B1A6", { rau: 0.9 })); ab(10.6, 0.5, 0.2, 0, 3.35, 6.05, mat("#B9B1A6", { rau: 0.9 })); ab(0.2, 0.5, 8.7, -5.3, 3.35, 1.69, mat("#B9B1A6", { rau: 0.9 })); ab(0.2, 0.5, 8.7, 5.3, 3.35, 1.69, mat("#B9B1A6", { rau: 0.9 }));
  ab(1.1, 2.0, 1.1, -3.0, 4.1, 3.4, mat("#A25A44", { rau: 0.9 })); ab(1.4, 0.9, 1.4, 2.5, 3.55, 4.2, mat("#8C9AAE", { rau: 0.6 })); ab(2.2, 0.08, 1.4, 1.0, 3.5, 0.2, mat("#26324A", { rau: 0.3, metall: 0.4 }));
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.5, 6), mat("#9AA3B4", { metall: 0.7, rau: 0.4 })); ant.position.set(4.0, 5.6, 4.8); aufbauten.add(ant);
  szene.add(aufbauten);
  // Ring-Welle beim Durchflug durch die Decke
  const welle = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.0, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(TUERKIS).multiplyScalar(3), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  welle.rotation.x = -Math.PI / 2; welle.visible = false; szene.add(welle);

  // ---------- Außenwelt ----------
  stadtBauen(szene);
  const dom = domBauen(); { const p = nebenPfad(MARKE.dom.hoehe, -105, -5); dom.position.set(p.x, BODEN, p.z); dom.rotation.y = -0.5; szene.add(dom); BERGE.domPos = p; }
  const turm = fernsehturmBauen(); { const p = nebenPfad(MARKE.turm.hoehe, 125, 30); turm.position.set(p.x, BODEN, p.z); szene.add(turm); BERGE.turmPos = p; }
  const farbBrocken = (c, t, r) => { c.set("#2F4A33").lerp(c.clone().set("#4E6B3C"), clamp(t * 1.2 + r * 0.25)); if (t > 0.86) c.lerp(c.clone().set("#8A8579"), clamp((t - 0.86) * 6)); };
  const farbFeld = (c, t, r) => { c.set("#486B3A").lerp(c.clone().set("#8F9A5A"), clamp(t * 1.1 + r * 0.3)); if (t > 0.8) c.lerp(c.clone().set("#DADDE0"), clamp((t - 0.8) * 4 + r * 0.2)); };
  const farbZug = (c, t, r) => { c.set("#34503A").lerp(c.clone().set("#5E6478"), clamp((t - 0.16) * 2.6 + r * 0.2)); if (t > 0.55 + r * 0.1) c.lerp(c.clone().set("#EEF1F6"), clamp((t - 0.55) * 7)); };
  const bergeMeshes = [];
  for (const [id, f, seed] of [["brocken", farbBrocken, 11], ["feldberg", farbFeld, 23], ["zugspitze", farbZug, 37]]) {
    const b = BERGE[id]; b.id = id;
    const m = berg(b, seed, f); szene.add(m); szene.add(gipfelAusruestung(b)); bergeMeshes.push(m);
  }
  // Wolken (Sprites), entlang des Pfads verteilt
  const wTex = wolkenTextur();
  const wolken = [];
  for (let i = 0; i < 30; i++) {
    const h = 250 + hash(i, 1) * 2800;
    const lat = (hash(i, 2) < 0.5 ? -1 : 1) * (420 + hash(i, 3) * 1100);
    const p = nebenPfad(h + (hash(i, 4) - 0.5) * 400, lat, (hash(i, 5) - 0.3) * 500);
    const gr = 260 + hash(i, 6) * 520;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: wTex, color: i % 3 === 0 ? "#FFD9C4" : "#FFF3EA", transparent: true, opacity: 0.2 + hash(i, 7) * 0.2, depthWrite: false, fog: true }));
    sp.userData.o = sp.material.opacity;
    sp.position.set(p.x, EYE0 + h, p.z); sp.scale.set(gr * 1.7, gr, 1); sp.renderOrder = 5; szene.add(sp); wolken.push(sp);
  }

  // ---------- Ergebnis-Elemente (Totale, Ringe) ----------
  const ende = pfad(HTOP);
  const baken = new THREE.Group();
  const kern = new THREE.Mesh(new THREE.SphereGeometry(3.4, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(TUERKIS).multiplyScalar(3), fog: false }));
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(8, 0.7, 10, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFFFFF").multiplyScalar(2.2), fog: false })); ring1.rotation.x = Math.PI / 2;
  baken.add(kern, ring1);
  const duLabel = textSprite("DU", { farbe: TUERKIS, hoehe: 26, b: 512, h: 256 }); duLabel.position.set(0, 24, 0); baken.add(duLabel);
  baken.position.copy(ende); baken.visible = false; szene.add(baken);
  const maßLinie = new THREE.Group();
  const linie = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFFFFF").multiplyScalar(2), fog: false }));
  const kappeO = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.8, 24), linie.material), kappeU = kappeO.clone();
  maßLinie.add(linie, kappeO, kappeU);
  const mLabel = textSprite("109 M", { farbe: "#FFFFFF", hoehe: 34, b: 768, h: 256 }); maßLinie.add(mLabel);
  maßLinie.visible = false; szene.add(maßLinie);
  const ringe = [];
  for (let k = 1; k <= 4; k++) {
    const y = EYE0 + S.hoeheEchtMuskel() * k;
    const rel = (y - BODEN) / (topY(BERGE.zugspitze) - BODEN);
    const rad = k < 4 ? BERGE.zugspitze.R * Math.pow(1 - clamp(rel), 1 / 1.35) * 1.02 + 25 : 140;
    const rg = new THREE.Mesh(new THREE.TorusGeometry(rad, k < 4 ? 45 : 9, 8, 120), new THREE.MeshBasicMaterial({ color: new THREE.Color(k < 4 ? KORALLE : TUERKIS).multiplyScalar(2.4), transparent: true, opacity: 0.95, fog: false }));
    rg.rotation.x = Math.PI / 2; rg.position.set(ZUG_X, y, ZUG_Z); rg.visible = false; szene.add(rg);
    const lb = textSprite(k < 4 ? `${k}` : "4 TAFELN", { farbe: k < 4 ? "#FFFFFF" : TUERKIS, hoehe: k < 4 ? 330 : 190, b: k < 4 ? 256 : 1024, h: 256 });
    lb.position.set(ZUG_X + (k < 4 ? -rad * 0.95 : 0), y + (k < 4 ? 130 : 220), ZUG_Z + (k < 4 ? rad * 0.2 : 0)); lb.visible = false; szene.add(lb);
    ringe.push({ rg, lb, y, rad });
  }
  // Höhenmarken-Ringe an den Spitzen (leuchten beim Überholen)
  const markenRinge = [];
  for (const m of S.MARKEN) {
    const pos = m.id === "dom" ? BERGE.domPos : m.id === "turm" ? BERGE.turmPos : BERGE[m.id];
    const r = m.id === "dom" || m.id === "turm" ? 22 : 60;
    const rg = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.045, 8, 56), new THREE.MeshBasicMaterial({ color: new THREE.Color(TUERKIS).multiplyScalar(1.5), transparent: true, opacity: 0, fog: false, depthWrite: false }));
    rg.rotation.x = Math.PI / 2; rg.position.set(pos.x, topY(m), pos.z); rg.visible = false; szene.add(rg);
    markenRinge.push({ m, rg });
  }

  return { szene, licht, himmel, tafel, dach, dachM, huelle, aufbauten, welle, baken, maßLinie, linie, kappeO, kappeU, mLabel, ringe, markenRinge, wolken, bergeMeshes, dom, turm };
}

// =====================================================================================
// Höhen-HUD (24 Segmente = 24 Stückchen) – Gegenstück zum Countdown-HUD aus 5 Segmenten
// =====================================================================================
class Hoehenanzeige {
  constructor(M, wurzel, { sFn, von, bis }) {
    this.M = M; this.sFn = sFn; this.von = von; this.bis = bis;
    this.e = el("div", "ms ms-hoehe", `<div class="cd-reihe">${"<div class='cd-seg'><i></i></div>".repeat(24)}</div><div class="cd-zahl">0<small>m</small></div><div class="cd-sub">STÜCKCHEN <b>0</b> / 24</div>`, wurzel);
    this.segs = [...this.e.querySelectorAll(".cd-seg")];
    this.balken = this.segs.map((s) => s.querySelector("i"));
    this.zahl = this.e.querySelector(".cd-zahl");
    this.sub = this.e.querySelector(".cd-sub b");
    this._z = null; this._n = null;
  }
  update(t) {
    const s = clamp(this.sFn(t), 0, 24);
    this.segs.forEach((seg, i) => {
      const f = clamp(i + 1 - s, 0, 1);
      this.balken[i].style.transform = `scaleX(${f.toFixed(4)})`;
      seg.classList.toggle("aktiv", s > i && s < i + 1 && t > this.von);
    });
    const h = S.hoeheBeiStueckchen(s);
    const txt = fmtZahl(h);
    if (txt !== this._z) { this.zahl.innerHTML = `${txt}<small>m</small>`; this._z = txt; }
    const n = Math.min(24, Math.max(0, Math.ceil(s - 1e-9)));
    if (n !== this._n) { this.sub.textContent = String(n); this._n = n; }
    const ph = s % 1, puls = s > 0 && s < 24 ? Math.exp(-ph * 7) * 0.05 : 0;
    this.e.style.transform = `scale(${(1 + puls).toFixed(4)})`;
  }
  ereignisse() {
    const ev = [];
    for (const [a, b] of this.M.laufIntervalle((t) => Math.round(S.hoeheBeiStueckchen(clamp(this.sFn(t), 0, 24))), this.von, this.bis)) ev.push({ t: a, typ: "uhr", dauer: b - a, laufend: true, klang: "uhr" });
    for (let k = 1; k <= 24; k++) {
      let lo = this.von, hi = this.bis;
      if (this.sFn(hi) < k - 1 + 1e-6) continue;
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (this.sFn(mid) >= k - 1 + 1e-6) hi = mid; else lo = mid; }
      ev.push({ t: hi, typ: "marke", klang: k === 24 ? "ding" : "tick", text: `Stückchen ${k}` });
    }
    return ev;
  }
}

// =====================================================================================
// Start
// =====================================================================================
async function start() {
  const skript = await lade("skript.json");
  let timing;
  try { timing = await lade("audio/timing.json"); }
  catch { try { timing = await lade("audio/timing_schaetzung.json"); } catch { timing = schaetzeTiming(skript); } }
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.6 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const ENDE = DAUER - 1 / FPS;
  const T = (x) => zp.zeit(x);

  const buehne = new Buehne(document.getElementById("leinwand"), { breite: Math.round(1080 * SKALA), hoehe: Math.round(1920 * SKALA), msaa: MSAA, schatten: SCHATTEN > 0 });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "700 27px 'SB Display'", "700 27px 'SB Text'", "800 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const W = baueWelt(buehne);
  const kam = new THREE.PerspectiveCamera(66, 1080 / 1920, 0.06, 60000);

  // ---------- Zeitmarken ----------
  const tHook = T("hook:Stell"), tWie = T("regeln:Wie"), tLos = T("Los"), tS1 = T("flug1:Stückchen"), tDu = T("flug1:Du"), tDecke = T("Decke."), tSanft = T("Sanft.");
  const tFolg = T("Folg"), tDoch = T("Doch"), tFT = T("Fernsehturm."), tNeun = T("Neun"), tBrocken = T("Brocken."), tZwoelf = T("Zwölf:"), tFeld = T("Feldberg.");
  const t23 = T("Dreiundzwanzig."), tZugW = T("flug3:Zugspitze"), tNeunzehn = T("neunzehn"), tLetzte = T("letzte"), tUeber = T("überholst"), tZugEnde = T("flug4:Zugspitze!");
  const tErg = T("Endstand:"), tWarum = T("Warum?"), tUeb = T("ueber:Und"), tSchoko = T("ueber:Schokolade"), tTNT = T("TNT."), tKeinBoom = T("ueber:Sie"), tEcht = T("echt:In"), tMerk = T("merk:In"), tSchluss = T("Welches");
  const tSchleife = tSchluss + 0.6;
  const tKitchenBack = tSchluss - 0.05; // Schnitt zurück in die Küche (Wolken-Übergang)

  // ---------- Verbrauchte Stückchen s(t) (0…24) – monotone Kurve, Schlüsselstellen an den Wörtern ----------
  const sKeys = [
    { t: tLos, v: 0 }, { t: tS1, v: 0 }, { t: tDu, v: 0.006 }, { t: tDecke + 0.03, v: 0.026 }, { t: tDecke + 0.85, v: 0.17 }, { t: tSanft + 0.85, v: 0.45 }, { t: tSanft + 1.55, v: 0.8 },
    { t: tFolg + 1.25, v: S.markeUeberholt(MARKE.dom).stuecke }, { t: tDoch + 0.4, v: 1.62 }, { t: T("drei"), v: 2.0 }, { t: T("drei") + 0.85, v: 2.45 }, { t: tFT - 0.05, v: S.markeUeberholt(MARKE.turm).stuecke },
    { t: tNeun - 0.3, v: 4.8 }, { t: tBrocken - 0.6, v: 7.2 }, { t: tBrocken, v: S.markeUeberholt(MARKE.brocken).stuecke }, { t: tBrocken + 0.55, v: 10.0 }, { t: tFeld - 0.55, v: 11.0 }, { t: tFeld, v: S.markeUeberholt(MARKE.feldberg).stuecke },
    { t: tFeld + 0.55, v: 14.5 }, { t: tFeld + 1.25, v: 19.0 }, { t: t23 + 1.0, v: 23.0 }, { t: tNeunzehn + 0.3, v: 23.0035 }, { t: tLetzte + 0.0, v: 23.03 }, { t: tLetzte + 1.0, v: 23.085 },
    { t: tUeber + 0.3, v: S.markeUeberholt(MARKE.zugspitze).stuecke }, { t: tUeber + 0.95, v: 23.45 }, { t: tZugEnde + 0.85, v: 24 }, { t: DAUER + 5, v: 24 },
  ];
  for (let i = 1; i < sKeys.length; i++) if (!(sKeys[i].t > sKeys[i - 1].t)) throw new Error(`Schlüssel s(t) nicht aufsteigend bei ${i}: ${sKeys[i - 1].t} → ${sKeys[i].t}`);
  const sRoh = monoton(sKeys);
  const sMono = (t) => Math.min(24, Math.max(0, sRoh(t)));
  const hRoh = (t) => S.hoeheBeiStueckchen(sMono(t));
  /** Zeit, zu der s den Wert erreicht (Bisektion, s ist monoton) */
  const tFuerS = (sz) => { let lo = tLos, hi = DAUER; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (sMono(m) >= sz) hi = m; else lo = m; } return hi; };

  // ---------- HUD ----------
  const hud = new HUD(document.getElementById("hud"));
  if (Q.get("hud") === "0") hud.wurzel.style.display = "none";
  const M = new Massstab(hud, zp, {
    akzent: TUERKIS,
    teams: {
      a: { name: "SCHOKOLADE", farbe: KORALLE, woerter: ["Schokolade*", "Tafel*", "Stückchen*", "Energie*"] },
      b: { name: "HÖHE", farbe: TUERKIS, woerter: ["Höhe*", "hoch*", "Meter*", "Zugspitze*", "Fernsehturm*"] },
      c: { name: "NEUTRAL", farbe: STAHL, woerter: ["TNT*"] },
    },
  });
  M.schleife({ ab: tSchleife, ende: ENDE });
  const sM = M.wert(sMono); // schleifenfest: HUD-Zähler kehrt zum Anfangszustand zurück
  hud.add(new Hoehenanzeige(M, hud.wurzel, { sFn: sM, von: tLos, bis: tZugEnde + 1.0 }));

  // Hook: Titel steigt Wort für Wort auf
  M.titel({ y: 540, groesse: 108, aus: "regeln:Hundert-0.4", woerter: [
    { text: "STELL", ein: "Stell-0.04", art: "klein" }, { text: "DIR", ein: "dir-0.04", art: "klein" }, { text: "VOR:", ein: "vor,-0.04", art: "klein" },
    { umbruch: true },
    { text: "EINE TAFEL", ein: "Tafel-0.06" },
    { umbruch: true },
    { text: "SCHOKOLADE", ein: "Schokolade-0.04", team: "a" },
    { umbruch: true },
    { text: "WIE HOCH?", ein: "regeln:Wie-0.02", team: "b" },
  ] });
  // Regeln als Chips
  M.chips({ y: 470, ausrichtung: "mitte", aus: "falle:Klar,-0.5", liste: [{ text: "100 G VOLLMILCH", ein: "Hundert-0.02", art: "voll", team: "a", gross: true }] });
  M.chips({ y: 610, ausrichtung: "mitte", aus: "falle:Klar,-0.5", liste: [{ text: "ENERGIE = HÖHE", ein: "regeln:Alles-0.02", art: "voll", team: "b" }] });
  M.chips({ y: 750, ausrichtung: "mitte", aus: "falle:Klar,-0.5", liste: [{ text: "DU: 75 KG", ein: "regeln:Du-0.02", art: "dunkel" }] });
  M.chips({ y: 890, ausrichtung: "mitte", aus: "falle:Klar,-0.5", liste: [{ text: "OHNE LUFTWIDERSTAND", ein: "Luftwiderstand.-0.28", art: "hell" }] });
  // Denkfalle
  M.stempel({ text: "KLAR?", ein: "falle:Klar,", aus: "falle:Dach.+0.9", x: SICHER.mitte, y: 880, winkel: -6, farbe: "weiss", textFarbe: "tinte", groesse: 100 });
  // Folgen-Aufruf
  M.folgen({ ein: "Folg", dauer: 1.8, y: 960 });
  // Höhenmarken (Chip oben, nach den gesprochenen Wörtern)
  const mk = (id, ein, aus, text) => M.chips({ y: 400, ausrichtung: "mitte", aus, liste: [{ text, ein, art: "voll", team: "b", gross: true }] });
  const tDom = tFuerS(S.markeUeberholt(MARKE.dom).stuecke), tTurm = tFuerS(S.markeUeberholt(MARKE.turm).stuecke);
  const tBro = tFuerS(S.markeUeberholt(MARKE.brocken).stuecke), tFel = tFuerS(S.markeUeberholt(MARKE.feldberg).stuecke), tZug = tFuerS(S.markeUeberholt(MARKE.zugspitze).stuecke);
  mk("dom", tDom - 0.05, tDom + 1.9, "KÖLNER DOM · 157 M");
  mk("turm", tTurm - 0.05, tBrocken - 0.55, "FERNSEHTURM · 368 M");
  mk("brocken", tBrocken - 0.05, tFeld - 0.55, "BROCKEN · 1.141 M");
  mk("feldberg", tFeld - 0.05, tZugW - 0.5, "FELDBERG · 1.493 M");
  mk("zugspitze", tZugW - 0.02, tErg - 0.2, "ZUGSPITZE · 2.962 M");
  M.stempel({ text: "ÜBERHOLT!", ein: tFT, x: SICHER.mitte, y: 900, winkel: 5, art: "stempel", farbe: "b", groesse: 104 });
  // Restmeter bis zur Spitze (Live-Zähler)
  const bisSpitze = (t) => Math.max(0, MARKE.zugspitze.hoehe - hRoh(t));
  M.zaehler({ ein: tZugW + 0.25, aus: tUeber + 0.25, wert: bisSpitze, nk: 0, einheit: "m", max: 99, team: "b", label: "BIS ZUR SPITZE", x: SICHER.mitte, y: 560, anker: "mitte" });
  M.stempel({ text: "DRÜBER!", ein: tUeber + 0.55, aus: tErg - 0.2, x: SICHER.mitte, y: 900, winkel: -5, farbe: "a", groesse: 100 });
  // Ergebnis: Bilanzkarte (unterer Teil, die Totale bleibt oben sichtbar)
  const hoeheEnde = S.hoehe();
  M.bilanz({
    y: 840, ein: tErg + 0.55, aus: tWarum - 0.65, titel: "Endstand",
    zeilen: [
      { label: "DU", wert: Math.round(hoeheEnde), nk: 0, einheit: "m", team: "b", ein: "ergebnis:3.071" },
      { label: "ZUGSPITZE", wert: MARKE.zugspitze.hoehe, nk: 0, einheit: "m", team: "c", ein: "ergebnis:Meter.+0.15" },
    ],
    differenz: { label: "DARÜBER", wert: Math.round(S.ueberMarke(MARKE.zugspitze)), nk: 0, einheit: "m", ein: "ergebnis:109" },
  });
  M.stempel({ text: "WARUM?", ein: tWarum, aus: tWarum + 1.0, x: SICHER.mitte, y: 960, winkel: -4, farbe: "b", groesse: 96 });
  // Warum? Zwei Faktoren als Formelkarten
  M.formel({ y: 420, ein: "warum:Tafel:-0.2", aus: "warum:Ein-0.1", titel: "Energie in der Tafel", teile: [
    { text: "540", einheit: "kcal", ein: "warum:Eine", team: "a" }, { text: "×", ein: "warum:Tafel:" }, { text: "4,184", einheit: "kJ", ein: "warum:Tafel:+0.2" },
    { text: "=", ein: "warum:2,26-0.12" }, { text: "2,26", einheit: "MIO. J", ein: "warum:2,26", art: "erg" },
  ] });
  M.formel({ y: 820, ein: "warum:Ein-0.05", aus: "ueber:Und-0.1", titel: "Einen Meter hochheben", teile: [
    { text: "75", einheit: "kg", ein: "warum:Meter", team: "b" }, { text: "×", ein: "warum:Höhe:-0.2" }, { text: "9,81", ein: "warum:Höhe:" },
    { text: "=", ein: "warum:nur-0.12" }, { text: "736", einheit: "J", ein: "warum:736", art: "erg" },
  ] });
  // Zweite Überraschung: TNT
  M.bilanz({
    y: 420, ein: tSchoko - 0.1, aus: tKeinBoom - 0.5, titel: "Energie pro Kilo",
    zeilen: [
      { label: "SCHOKOLADE", wert: +S.mjProKg().toFixed(1), nk: 1, einheit: "MJ", team: "a", ein: "ueber:Schokolade+0.15" },
      { label: "TNT", wert: S.SZ.tntMJproKg, nk: 1, einheit: "MJ", team: "c", ein: "TNT.-0.7" },
    ],
    differenz: { label: "FAKTOR", wert: +S.tntFaktor().toFixed(1), nk: 1, einheit: "×", ein: "ueber:5,4-mal" },
  });
  M.stempel({ text: "KEIN BOOM", ein: tKeinBoom + 0.0, aus: tEcht - 0.1, x: SICHER.mitte, y: 900, winkel: 4, art: "stempel", farbe: "c", groesse: 76 });
  // In echt: Wirkungsgrad, vier Tafeln
  M.chips({ y: 372, ausrichtung: "mitte", aus: "echt:768-0.4", liste: [{ text: "MUSKELN: NUR 25 %", ein: "echt:Viertel:-0.4", art: "voll", team: "a", gross: true }] });
  M.formel({ y: 500, ein: "echt:768-0.35", aus: "echt:Zugspitze?-0.05", titel: "In echt", teile: [
    { text: "3.071", einheit: "m", ein: "echt:768-0.3", team: "b" }, { text: "×", ein: "echt:768-0.22" }, { text: "25", einheit: "%", ein: "echt:768-0.14" },
    { text: "=", ein: "echt:768-0.06" }, { text: "768", einheit: "m", ein: "echt:768", art: "erg" },
  ], unter: { text: "ZUGSPITZE: 4 TAFELN", ein: "echt:Vier", team: "a" } });
  // Merksatz
  M.pointe({ text: "IN JEDER TAFEL | STECKT EIN | *BERG.*", ein: "merk:In", takt: 0.2, aus: "Welches-0.1", y: 520, groesse: 112 });
  M.chips({ y: 960, ausrichtung: "mitte", aus: "Schreib-0.1", liste: [{ text: "DEIN SZENARIO?", ein: "Szenario-0.05", art: "voll", team: "b", gross: true }] });
  M.untertitel({ stil: "kontur", unten: 1450, groesse: 62 });

  // 3D-Ereignisse fürs Protokoll (Ton und Prüfung)
  M.melde({ t: tLos, typ: "kamera", klang: "whoosh", dauer: 0.7, text: "Tafel greifen" });
  M.melde({ t: tDecke + 0.05, typ: "welle", klang: "boom", text: "Durch die Decke" });
  for (const [id, t0] of [["dom", tDom], ["turm", tTurm], ["brocken", tBro], ["feldberg", tFel], ["zugspitze", tZug]]) M.melde({ t: t0, typ: "marke", klang: "ding", text: `Höhenmarke ${id} überholt` });
  M.melde({ t: tErg - 0.1, typ: "kamera", klang: "whoosh", dauer: 0.7, text: "Totale" });
  M.melde({ t: tUeb - 0.05, typ: "kamera", klang: "whoosh", dauer: 0.5, text: "zurück in die Ich-Sicht" });
  M.melde({ t: tEcht - 0.1, typ: "kamera", klang: "whoosh", dauer: 0.5, text: "Seitenansicht mit Ringen" });
  M.melde({ t: tKitchenBack, typ: "kamera", klang: "wolke", dauer: 0.9, text: "zurück in die Küche" });
  for (let k = 1; k <= 3; k++) M.melde({ t: T("echt:Vier") + 0.1 * k + 0.1, typ: "marke", klang: "ding", text: `Ring ${k + 1}` });

  // =====================================================================================
  // Welt-Zustand je Zeit
  // =====================================================================================
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), qA = new THREE.Quaternion(), qB = new THREE.Quaternion();
  const TISCH = { pos: V(0.0, 0.7685, -0.46), rot: 0.1, skala: 1.5 };
  const funken = (() => { // Funken beim Verbrauch: Points in Weltkoordinaten, jeden Frame neu berechnet
    const N = 24 * 10;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.02, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, sizeAttenuation: true, fog: false }));
    p.frustumCulled = false; p.renderOrder = 20; W.szene.add(p);
    return { p, N };
  })();
  const tEndeStueck = Array.from({ length: 24 }, (_, i) => tFuerS(i + 1 - 0.08));

  /** Welt für Zeit t setzen. modus: "pov" | "totale" | "kueche" */
  const setzeWelt = (t, modus, kamera) => {
    const s = modus === "kueche" ? 0 : sMono(t);
    const h = S.hoeheBeiStueckchen(s);
    // Hülle/Decke: durchsichtig beim Durchflug
    const naeheDecke = modus === "kueche" ? 1 : 1 - Math.exp(-Math.pow((h - 3.4) / 4.5, 2)) * 0.0;
    const imDach = modus !== "kueche" && h > 1.4 && h < 6.2;
    const geist = imDach ? 1 - ease.inOutSine(clamp(Math.abs(h - 3.4) / 1.9)) : 0;
    W.dachM.opacity = 1 - 0.93 * geist;
    W.dachM.depthWrite = geist < 0.05;
    void naeheDecke;
    // Welle an der Decke
    const tw = tDecke + 0.03;
    W.welle.visible = modus !== "kueche" && t > tw - 0.05 && t < tw + 0.9;
    if (W.welle.visible) { const k = (t - (tw - 0.05)) / 0.95; const cam = pfad(h); W.welle.position.set(cam.x, 3.45, cam.z); W.welle.scale.setScalar(0.2 + 7 * ease.outCubic(k)); W.welle.material.opacity = (1 - k) * 0.9; }
    // Wolken: nahe Wolken blenden aus (kein Schleier vor der Kamera)
    for (const sp of W.wolken) { const d = sp.position.distanceTo(W.himmel.position); sp.material.opacity = sp.userData.o * clamp((d - 250) / 500); }
    // Höhenmarken-Ringe flackern beim Überholen
    for (const mr of W.markenRinge) {
      const tp = mr.m.id === "dom" ? tDom : mr.m.id === "turm" ? tTurm : mr.m.id === "brocken" ? tBro : mr.m.id === "feldberg" ? tFel : tZug;
      const d = t - tp;
      const sicht = modus === "pov" && d > -1.6 && d < 1.2;
      mr.rg.visible = sicht;
      if (sicht) mr.rg.material.opacity = d < 0 ? clamp(1 + d / 1.6) * 0.55 : Math.exp(-d * 3.2);
    }
    // Totale-Elemente
    const ende = pfad(HTOP);
    const oben = modus === "totale" || (modus === "pov" && t > tZugEnde);
    W.baken.visible = modus === "totale";
    W.baken.position.copy(ende);
    W.maßLinie.visible = modus === "totale";
    if (modus === "totale") {
      const yU = topY(MARKE.zugspitze), yO = ende.y;
      W.linie.scale.set(1, yO - yU - 4, 1); W.linie.position.set(ZUG_X, (yO + yU) / 2, ZUG_Z);
      W.kappeO.position.set(ZUG_X, yO - 2, ZUG_Z); W.kappeU.position.set(ZUG_X, yU + 0.4, ZUG_Z);
      { const rr = new THREE.Vector3().setFromMatrixColumn(kamT.matrixWorld, 0); W.mLabel.position.set(ZUG_X + rr.x * 62, (yO + yU) / 2, ZUG_Z + rr.z * 62); }
      const pop = ease.outBack(clamp((t - tErg - 0.9) / 0.5));
      W.mLabel.scale.set(34 * 3 * pop, 34 * pop, 1);
      W.baken.scale.setScalar(0.4 + 0.6 * ease.outBack(clamp((t - tErg) / 0.5)));
    }
    void oben;
    // Ringe für „in echt“ (768 m je Tafel)
    const tR0 = tEcht + 2.0;
    W.ringe.forEach((r, i) => {
      const tr = i === 0 ? T("echt:768") - 0.1 : i === 1 ? T("echt:Zugspitze?") : i === 2 ? T("echt:Vier") : T("echt:Tafeln.");
      const sicht = modus === "ringe" && t > tr;
      r.rg.visible = sicht; r.lb.visible = sicht;
      if (sicht) {
        const p = ease.outBack(clamp((t - tr) / 0.45));
        r.rg.scale.set(p, p, p); r.rg.material.opacity = 0.95;
        r.lb.scale.set(r.lb.scale.x, r.lb.scale.y, 1);
      }
    });
    void tR0;
    // Tafel: Stückchen verbrauchen, Pose (Tisch → Hand)
    const kz = kamera;
    const kHand = 1; // die Tafel ist von Anfang an in deiner Hand
    const hand = new THREE.Object3D();
    hand.position.set(0, -0.15, -0.66);
    hand.rotation.set(Math.PI / 2 - 0.55, 0, 0);
    hand.scale.setScalar(2.05);
    hand.updateMatrix();
    const mHand = kz.matrixWorld.clone().multiply(hand.matrix);
    mHand.decompose(tmpA, qA, tmpB);
    const pHandW = tmpA.clone(), qHandW = qA.clone(), sHand = tmpB.clone();
    const pT = TISCH.pos.clone(), qT = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), TISCH.rot);
    // Hochheben: erst heben, dann zur Hand
    const hub = 0;
    W.tafel.gruppe.position.lerpVectors(pT, pHandW, kHand); W.tafel.gruppe.position.y += hub;
    W.tafel.gruppe.quaternion.slerpQuaternions(qT, qHandW, kHand);
    W.tafel.gruppe.scale.setScalar(lerp(TISCH.skala, sHand.x, kHand));
    W.tafel.gruppe.visible = modus !== "totale" && modus !== "ringe";
    W.tafel.gruppe.updateMatrixWorld(true);
    // Stückchen: glühen, schrumpfen, verschwinden
    W.tafel.stuecke.forEach((st, i) => {
      const f = clamp(s - i);
      const brennt = f > 0 && f < 1;
      const glut = brennt ? Math.pow(Math.sin(Math.PI * Math.min(1, f * 1.05)), 0.7) : 0;
      st.k.material.emissiveIntensity = glut * 2.4;
      const sc = f < 0.7 ? 1 : lerp(1, 0, ease.inCubic((f - 0.7) / 0.3));
      st.k.visible = f < 1 && sc > 0.01;
      st.k.scale.setScalar(Math.max(0.001, sc));
      st.k.position.y = st.y + (f > 0.7 ? (f - 0.7) * 0.05 : 0);
    });
    // Funken
    const pos = funken.p.geometry.attributes.position, col = funken.p.geometry.attributes.color;
    const wp = new THREE.Vector3();
    for (let i = 0; i < 24; i++) {
      const alter = t - tEndeStueck[i];
      const st = W.tafel.stuecke[i];
      st.k.getWorldPosition(wp);
      for (let j = 0; j < 10; j++) {
        const id = i * 10 + j;
        if (modus === "kueche" || alter < 0 || alter > 0.75) { pos.setXYZ(id, 0, -999, 0); col.setXYZ(id, 0, 0, 0); continue; }
        const a = hash(id, 91) * Math.PI * 2, r = 0.05 + hash(id, 92) * 0.12, up = 0.12 + hash(id, 93) * 0.22;
        const wk = hash(id, 94);
        // Weltrichtungen aus Kamera: oben = Kamera-y, seitlich = Kamera-x
        tmpA.set(Math.cos(a) * r, up, Math.sin(a) * r * 0.4).multiplyScalar(alter * (1 + 0.5 * wk));
        tmpA.applyQuaternion(kz.quaternion);
        pos.setXYZ(id, wp.x + tmpA.x, wp.y + tmpA.y - 0.18 * alter * alter, wp.z + tmpA.z);
        const f = (1 - alter / 0.75) ** 1.4;
        col.setXYZ(id, 3.0 * f, 1.5 * f, 0.5 * f);
      }
    }
    pos.needsUpdate = true; col.needsUpdate = true;
    funken.p.material.size = 0.016 * (1 + hand.scale.x * 0.0);
  };

  // =====================================================================================
  // Kamera: Ich-Perspektive, Blickziele im Takt der Stimme
  // =====================================================================================
  const flach = (p, vor, hoch) => { const k = kurs(p.y - EYE0); return V(p.x + k.x * vor, p.y + hoch, p.z + k.z * vor); }; // Punkt voraus (in Flugrichtung) mit Höhenversatz
  const domOben = () => V(BERGE.domPos.x, topY(MARKE.dom), BERGE.domPos.z);
  const turmOben = () => V(BERGE.turmPos.x, topY(MARKE.turm), BERGE.turmPos.z);
  const bergOben = (id) => () => V(BERGE[id].x, topY(BERGE[id]), BERGE[id].z);
  const gipfel = bergOben("zugspitze");
  const vorn = (t, p) => flach(p, 300, -85); // Standardblick: voraus, leicht abwärts
  const ziele = [
    { t: 0, z: () => V(0, 0.42, -2.6), d: 0 },
    { t: tWie - 0.15, z: () => V(0.0, 0.95, -0.9), d: 0.8 }, // Hook → Tafel ansehen
    { t: T("regeln:Du") - 0.2, z: () => V(0.0, 0.85, -0.7), d: 0.55 }, // „Du wiegst …“: Blick leicht nach unten
    { t: T("Luftwiderstand.") - 1.1, z: () => V(0.1, 1.45, -2.6), d: 0.95 }, // „Ohne Luftwiderstand“: Blick aus dem Fenster
    { t: T("falle:höchstens") - 0.1, z: () => V(0.0, 2.6, -0.9), d: 0.7 }, // „aufs Dach“: Blick zur Decke
    { t: T("Oder?") - 0.15, z: () => V(0.0, 0.95, -0.9), d: 0.55 }, // „Oder?“: zurück zur Tafel
    { t: tLos - 0.1, z: () => V(0.0, 0.95, -0.9), d: 0.45 },
    { t: tDu - 0.25, z: () => V(0.0, 2.9, -0.7), d: 0.9 }, // beim Abheben zur Decke hochsehen
    { t: tDecke + 0.45, z: (t, p) => flach(p, 260, -120), d: 0.8 }, // oben angekommen: Stadt unter dir
    { t: tDom - 1.15, z: domOben, d: 0.95 },
    { t: tDom + 0.55, z: vorn, d: 0.9 },
    { t: tTurm - 1.4, z: turmOben, d: 1.0 },
    { t: tTurm + 0.35, z: vorn, d: 0.7 },
    { t: tBro - 1.2, z: bergOben("brocken"), d: 0.75 },
    { t: tBro + 0.25, z: vorn, d: 0.55 },
    { t: tFel - 0.9, z: bergOben("feldberg"), d: 0.6 },
    { t: tFel + 0.3, z: vorn, d: 0.55 },
    { t: tFel + 0.95, z: gipfel, d: 0.9 }, // dann bleibt der Blick auf der Zugspitze
    { t: tUeber + 1.2, z: (t, p) => V(ZUG_X, topY(MARKE.zugspitze) - 40, ZUG_Z), d: 1.0 },
    { t: tErg + 0.1, z: (t, p) => V(ZUG_X, topY(MARKE.zugspitze) - 80, ZUG_Z), d: 0.6 },
    // Ab „Und das Verrückte“: Ich-Sicht von oben, Blick über den Horizont und dann hinunter auf die Ringe
    { t: tUeb, z: (t, p) => flach(p, 600, -60), d: 0.6 },
    { t: tSchoko + 1.2, z: (t, p) => flach(p, 500, -240), d: 1.2 },
    { t: T("ueber:Sauerstoff") - 0.3, z: (t, p) => flach(p, 700, 140), d: 0.9 }, // „braucht Sauerstoff“: Blick in den Himmel
    { t: tEcht - 0.1, z: (t, p) => V(ZUG_X, topY(MARKE.zugspitze) - 900, ZUG_Z + 80), d: 1.0 },
    { t: T("echt:768") + 0.7, z: (t, p) => V(ZUG_X, topY(MARKE.zugspitze) - 1400, ZUG_Z + 200), d: 1.3 },
    { t: tMerk - 0.2, z: (t, p) => V(ZUG_X, topY(MARKE.zugspitze) - 40, ZUG_Z - 40), d: 0.9 },
  ];
  for (const k of ziele.slice(1)) if (k.d > 0.05) M.melde({ t: k.t, typ: "kamera", klang: false, dauer: k.d, text: "Blickwechsel" });
  const posFuer = (t) => {
    const h = hRoh(t);
    const p = pfad(h);
    // Kamera in der Küche: leichtes Atmen
    const k = clamp(1 - h / 5);
    p.x += (Math.sin(t * 0.43) * 0.02 + Math.sin(t * 1.9) * 0.004) * k;
    p.y += (Math.sin(t * 1.9) * 0.012 + Math.sin(t * 0.7) * 0.01) * k;
    p.z += Math.cos(t * 0.37) * 0.015 * k;
    return p;
  };
  const blickZiel = (t, pos) => {
    let d = ziele[0].z(t, pos).clone().sub(pos).normalize();
    for (let i = 1; i < ziele.length; i++) {
      const k = ziele[i];
      if (t < k.t) break;
      const w = ease.inOutCubic(fortschritt(t, k.t, k.t + k.d));
      const d2 = k.z(t, pos).clone().sub(pos).normalize();
      d = d.lerp(d2, w).normalize();
    }
    return pos.clone().addScaledVector(d, 10);
  };
  const v = (t) => (hRoh(t + 0.05) - hRoh(t - 0.05)) / 0.1; // Steiggeschwindigkeit
  const fovAt = (t) => 66 + 3 * Math.exp(-Math.pow((t - tLos) / 0.5, 2)) + 9 * clamp(v(t) / 700) + (t < tWie ? 4 : 0) * (1 - fortschritt(t, 0, tWie));
  const regie = new Regie(kam, (t) => {
    const pos = posFuer(t);
    const z = blickZiel(t, pos);
    const roll = Math.sin(t * 0.6) * 0.006 + (t > tDecke && t < tDecke + 1.0 ? Math.sin((t - tDecke) * 7) * 0.02 * (1 - (t - tDecke)) : 0);
    return { pos: [pos.x, pos.y, pos.z], ziel: [z.x, z.y, z.z], fov: fovAt(t), roll };
  }, { zp });
  regie.stoss({ t: tLos + 0.05, staerke: 0.6 });
  regie.stoss({ t: tDecke + 0.03, staerke: 1.1 });
  regie.stoss({ t: tFT, staerke: 0.8 });
  regie.stoss({ t: tBro, staerke: 0.5 });
  regie.stoss({ t: tUeber + 0.5, staerke: 1.1 });
  regie.stoss({ t: T("falle:Klar,") + 0.05, staerke: 0.5 });
  regie.schleife({ ab: tSchleife, ende: ENDE });

  const post = { bloomStaerke: BLOOM, bloomSchwelle: 1.5, bloomRadius: 1.0, belichtung: 1.0, vignette: 0.32, saettigung: 1.08, kontrast: 1.06, koernung: 0.03, tonung: [1.05, 1.0, 0.93], tonungStaerke: 0.22 };
  const nahe = (h) => (h < 6 ? 0.06 : h < 400 ? 0.5 : 4);
  const weltPOV = { szene: W.szene, kamera: kam, post, update(t) {
    regie.anwenden(t);
    kam.near = nahe(hRoh(t)); kam.updateProjectionMatrix();
    W.himmel.position.copy(kam.position);
    setzeWelt(t, "pov", kam);
  } };

  // Totale (Ergebnis und Warum): Du schwebst 109 m über dem Gipfel, Kamera umkreist
  const kamT = new THREE.PerspectiveCamera(46, 1080 / 1920, 5, 60000);
  const regieT = new Regie(kamT, (t) => {
    const k = ease.inOutSine(fortschritt(t, tErg - 0.2, tUeb));
    const a = lerp(-0.6, 0.35, k);
    const dist = lerp(520, 400, k);
    const ende = pfad(HTOP);
    const mitteY = (ende.y + topY(MARKE.zugspitze)) / 2;
    const sicht = 2 * dist * Math.tan((23 * Math.PI) / 180); // sichtbare Höhe in m
    const tY = mitteY - 0.09 * sicht; // Subjekt im oberen Bilddrittel (unter dem Höhen-HUD, über der Karte)
    return { pos: [ZUG_X + Math.sin(a) * dist, mitteY + 6, ZUG_Z + Math.cos(a) * dist], ziel: [ZUG_X, tY, ZUG_Z], fov: 46 };
  }, { zp });
  regieT.stoss({ t: T("ergebnis:109") + 0.05, staerke: 0.5 });
  regieT.zoom({ t: T("ergebnis:über"), staerke: 0.1, halt: 0.9, rueck: 0.6 });
  regieT.stoss({ t: T("ergebnis:Zugspitze.") + 0.05, staerke: 0.35 });
  regieT.stoss({ t: T("warum:Millionen") + 0.05, staerke: 0.4 });
  regieT.stoss({ t: T("warum:Joule.") + 0.05, staerke: 0.4 });
  // Ereignisse der Totale-Kamera ins Protokoll (die Regie der Totale wird nicht automatisch übernommen)
  M.melde({ t: T("ergebnis:109") + 0.05, typ: "kamera", art: "stoss", dauer: 0.2, klang: false });
  M.melde({ t: T("ergebnis:über"), typ: "kamera", art: "zoom", dauer: 1.5, klang: "zoom" });
  M.melde({ t: T("ergebnis:Zugspitze.") + 0.05, typ: "kamera", art: "stoss", dauer: 0.2, klang: false });
  M.melde({ t: T("warum:Millionen") + 0.05, typ: "kamera", art: "stoss", dauer: 0.2, klang: false });
  M.melde({ t: T("warum:Joule.") + 0.05, typ: "kamera", art: "stoss", dauer: 0.2, klang: false });
  const weltT = { szene: W.szene, kamera: kamT, post: { ...post, vignette: 0.36 }, update(t) {
    regieT.anwenden(t);
    W.himmel.position.copy(kamT.position);
    setzeWelt(t, "totale", kam); // Tafel-Pose braucht die POV-Kamera (matrixWorld wird mitgeführt)
  } };

  // Ringe („in echt“): Seitenansicht des ganzen Bergs, vier Tafeln à 768 m übereinander
  const kamR = new THREE.PerspectiveCamera(48, 1080 / 1920, 20, 60000);
  const regieR = new Regie(kamR, (t) => {
    const k = fortschritt(t, tEcht - 0.1, tKitchenBack);
    const a = lerp(0.1, -0.12, k), dist = lerp(6200, 5700, ease.inOutSine(k));
    const span = 2 * dist * Math.tan((24 * Math.PI) / 180);
    const cy = 2963 - 0.23 * span; // Gipfel bei ca. 27 % der Bildhöhe: unter dem Höhen-HUD, Ringe über den Untertiteln
    return { pos: [ZUG_X - Math.sin(a) * dist * 0.8 - dist * 0.45, cy, ZUG_Z + Math.cos(a) * dist * 0.88], ziel: [ZUG_X, cy, ZUG_Z], fov: 48 };
  }, { zp });
  const weltR = { szene: W.szene, kamera: kamR, post: { ...post, vignette: 0.3 }, update(t) {
    regieR.anwenden(t);
    kamR.near = 20; kamR.updateProjectionMatrix();
    W.himmel.position.copy(kamR.position);
    setzeWelt(t, "ringe", kam);
  } };

  // Küche am Schluss (Schleife): gleicher Anfangszustand wie bei t = 0
  const kamK = new THREE.PerspectiveCamera(66, 1080 / 1920, 0.06, 60000);
  const regieK = new Regie(kamK, (t) => {
    const z0 = regie.basis(0); // gleiche Anfangspose wie das erste Bild
    const k = ease.inOutCubic(fortschritt(t, tKitchenBack, ENDE));
    const sw = 1 - k;
    return { pos: [z0.pos[0] + 0.0 * sw, z0.pos[1] + 0.05 * sw, z0.pos[2] + 0.22 * sw], ziel: [z0.ziel[0] + 0.1 * sw, z0.ziel[1] - 0.18 * sw, z0.ziel[2]], fov: lerp(z0.fov + 4, z0.fov, k), roll: 0 };
  }, { zp });
  const weltK = { szene: W.szene, kamera: kamK, post, update(t) {
    regieK.anwenden(t);
    kamK.near = 0.06; kamK.updateProjectionMatrix();
    W.himmel.position.copy(kamK.position);
    setzeWelt(t, "kueche", kamK);
  } };

  const zl = new Zeitleiste(buehne);
  zl.shot(0, weltPOV);
  zl.shot(tErg - 0.1, weltT, { typ: "blasen", dauer: 0.7 });
  zl.shot(tUeb - 0.05, weltPOV, { typ: "zoomwisch", dauer: 0.5, richtung: [1, -0.2], mitte: [0.5, 0.5] });
  zl.shot(tEcht - 0.1, weltR, { typ: "zoomwisch", dauer: 0.5, richtung: [-1, 0.2], mitte: [0.5, 0.5] });
  zl.shot(tKitchenBack, weltK, { typ: "wolken", dauer: 0.9 });

  // =====================================================================================
  // Rendern und Übergabe
  // =====================================================================================
  const gl = buehne.renderer.getContext();
  const px = new Uint8Array(4);
  window.renderAt = (t) => {
    zl.zeichne(t, Math.round(t * FPS));
    hud.update(t);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  window.hudAt = (t) => hud.update(t);
  for (const t of [0, tDecke, tFT, tErg + 0.5, tEcht + 2, ENDE]) window.renderAt(Math.min(t, ENDE));
  const schleifenPruefung = M.pruefeSchleife(window.renderAt, { regie });
  if (!schleifenPruefung.ok) console.warn("Schleife nicht geschlossen:", JSON.stringify(schleifenPruefung));
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich, schleifenPruefung });
  window.modell = S.alles(); window.__dbg = { W, kam, zl, regie, setzeWelt, hRoh, sMono, pfad, gelaende, kurs, BERGE, MARKE, tLos, tZugEnde, HTOP, nebenPfad };
  window.zeitmarken = { tLos, tDecke, tDom, tTurm, tBro, tFel, tZug, tErg, tUeb, tEcht, tMerk, tSchluss, tKitchenBack };
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
