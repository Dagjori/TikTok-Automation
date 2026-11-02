// DEMO (nicht zum Posten): Baukasten „Lunar-POV“ für Account 2 – eigenes neutrales Szenario, kein Referenz-Thema.
// „Was wäre, wenn der Vulkan gegenüber ausbricht?“ Ausblick von einer Aussichtsterrasse über einem Bergdorf, Vulkan 14 km entfernt.
// Physik (eigene Rechnung, Annahmen in skript.json): Schall/Druckwelle 343 m/s → 14 km in 40,8 s; Ausbruch bei 19,6 s → Ankunft 60,4 s.
// Feste Ich-Perspektive, eine Einstellung, drei Textebenen (LunarHUD), Abspann. Deterministisch: window.renderAt(t).
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes, hash } from "../../engine/bewegung.js";
import {
  aktiviereHoehenNebel, Himmel, Glut, Puffs, wolkenFeld, rauchSaeule, staubWand, feuerBall, puffStrahl, Partikel, Truemmer,
  Menschen, Autos, Voegel, vordergrund, PovKamera, farbPhasen, blitzKurve, huelle, Protokoll,
} from "../../engine/stil_lunar_pov.js";
import { LunarHUD, zahlDE, uhrzeit } from "../../engine/lunar_hud.js";

const FPS = 30, DAUER = 80;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;

// ---------------------------------------------------------------- Modell (eigene Rechnung)
const C = 343;                       // Schallgeschwindigkeit m/s (15 °C)
const ABSTAND = 14000;               // Gipfel → Terrasse, m
const T_AUS = 19.6;                  // Ausbruch
const T_AN = T_AUS + ABSTAND / C;    // Ankunft der Druckwelle = 60,42 s
const saeule = (t) => (t < T_AUS ? 0 : 10000 * (1 - Math.exp(-(t - T_AUS) / 25)));          // Höhe der Aschesäule m (Startgeschw. 400 m/s)
const saeuleV = (t) => (t < T_AUS ? 0 : 400 * Math.exp(-(t - T_AUS) / 25));
const druck = (t) => 1013.2 + Math.sin(t * 0.9) * 0.08 + Math.sin(t * 2.3) * 0.05;          // ruhige Luft, Mikroschwankung
const VX = -900, VZ = -ABSTAND, VH = 2800;                                                  // Gipfel
const ankunft = (x, z) => T_AUS + Math.hypot(x - VX, z - VZ) / C;                          // Druckwelle erreicht den Punkt (x, z)

// ---------------------------------------------------------------- Gelände
const fbm = (x, z, s = 1) => { let a = 0, f = 1, w = 0.5; for (let i = 0; i < 5; i++) { a += w * (Math.sin(x * f * 1.7 + s + Math.sin(z * f * 1.3 + i)) * Math.cos(z * f * 1.9 - s * 2 + Math.cos(x * f * 1.1 - i)) * 0.5 + 0.5); f *= 2.1; w *= 0.5; } return a; };
function H(x, z) {
  const d = Math.max(0, -z);
  const breite = 330 + d * 0.1;
  const wand = Math.max(0, Math.abs(x + Math.sin(z * 0.0009) * 120) - breite);
  let h = 820 * (1 - Math.exp(-wand / 1300)) * (0.75 + 0.5 * fbm(x * 0.0007, z * 0.0005, 2)) + fbm(x * 0.0021, z * 0.0021) * 190 * smoothstep(80, 600, wand) + fbm(x * 0.012, z * 0.012, 4) * 7;
  h += 41 * Math.exp(-((x / 95) ** 2 + ((z - 15) / 75) ** 2));                               // Terrassen-Hügel
  const r = Math.hypot(x - VX, z - VZ);
  const rinne = 1 + 0.07 * Math.sin(Math.atan2(z - VZ, x - VX) * 17 + r * 0.0015) * smoothstep(300, 2500, r);
  h += VH * Math.pow(Math.max(0, 1 - r / 5600), 1.5) * rinne - 260 * Math.exp(-((r / 260) ** 2)); // Vulkankegel mit Rinnen und Krater
  h += 900 * Math.pow(Math.max(0, 1 - Math.hypot(x - 3800, z + 9000) / 3800), 1.6);         // Nebenberg rechts
  return h;
}
const AUGE = [0, H(0, 0) + 1.6, 0], BLICK = [VX * 0.25, 160, -3000];

async function start() {
  aktiviereHoehenNebel({ abfall: 0.00045, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#AEBACA", 3.6e-5);
  const kam = new THREE.PerspectiveCamera(52, 1080 / 1920, 0.1, 40000);
  const pov = new PovKamera(kam, { pos: AUGE, ziel: BLICK, fov: 52 });

  // Himmel und Licht (Gegenlicht: Sonne rechts über dem Vulkan, Morgen)
  const SONNE = new THREE.Vector3(0.097, 0.375, -0.922).normalize();
  const himmel = new Himmel(szene, { zenit: "#4F72AA", horizont: "#AAB8CB", unten: "#7E8774", dunst: 0.26, sonnenRichtung: SONNE.toArray(), sonnenStaerke: 34, glanz: 0.75, glanzBreite: 0.11, zirren: 0.55 });
  const hemi = new THREE.HemisphereLight("#BCCAE0", "#3F4434", 1.0);
  const sonne = new THREE.DirectionalLight("#FFE6C4", 2.3);
  sonne.position.copy(SONNE).multiplyScalar(600); sonne.target.position.set(0, 0, -260);
  sonne.castShadow = SCHATTEN > 0; sonne.shadow.mapSize.set(SCHATTEN || 1, SCHATTEN || 1);
  Object.assign(sonne.shadow.camera, { left: -420, right: 420, top: 420, bottom: -420, near: 10, far: 1600 });
  sonne.shadow.bias = -0.0006; sonne.shadow.normalBias = 0.6;
  szene.add(hemi, sonne, sonne.target);

  // Gelände (Low-Poly, Farbe nach Höhe und Neigung)
  const geo = new THREE.PlaneGeometry(14000, 19000, 150, 230); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, -8700);
  const P = geo.getAttribute("position");
  for (let i = 0; i < P.count; i++) P.setY(i, H(P.getX(i), P.getZ(i)));
  const gelaende = new THREE.Mesh(geo.toNonIndexed(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
  gelaende.geometry.computeVertexNormals();
  { const g = gelaende.geometry, p = g.getAttribute("position"), n = g.getAttribute("normal"), col = new Float32Array(p.count * 3), c = new THREE.Color();
    const gras = new THREE.Color("#4E6332"), wald = new THREE.Color("#2B3F25"), fels = new THREE.Color("#6F675E"), asche = new THREE.Color("#4B433E"), schnee = new THREE.Color("#E9ECEF");
    for (let i = 0; i < p.count; i += 3) {
      const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, x = p.getX(i), z = p.getZ(i), steil = 1 - n.getY(i);
      const rv = Math.hypot(x - VX, z - VZ);
      c.copy(gras).lerp(wald, smoothstep(25, 120, y) * 0.85 + hash(i, 3) * 0.12).lerp(fels, smoothstep(0.42, 0.7, steil) * 0.7 + smoothstep(900, 1400, y) * 0.6);
      if (rv < 5600) c.lerp(asche, smoothstep(5600, 3000, rv)).lerp(schnee, smoothstep(2150, 2450, y + (hash(i, 5) - 0.5) * 260) * 0.92);
      const feld = fbm(x * 0.006, z * 0.006, 7); if (y < 30) c.lerp(new THREE.Color(feld > 0.55 ? "#7C7F48" : "#43592C"), Math.abs(feld - 0.55) * 1.4);
      c.multiplyScalar(0.9 + hash(i, 9) * 0.14);
      for (let k = 0; k < 3; k++) c.toArray(col, (i + k) * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3)); }
  gelaende.receiveShadow = true;
  szene.add(gelaende);

  // Straße durchs Tal und Dorf
  const strasse = []; for (let z = -60; z > -7000; z -= 60) { const x = 40 + Math.sin(z * 0.0011) * 90; strasse.push([x, H(x, z) + 0.35, z]); }
  { const g = new THREE.BufferGeometry(), v = [];
    for (let i = 1; i < strasse.length; i++) { const [a, b] = [strasse[i - 1], strasse[i]]; const w = 4.5;
      v.push(a[0] - w, a[1], a[2], b[0] - w, b[1], b[2], a[0] + w, a[1], a[2], a[0] + w, a[1], a[2], b[0] - w, b[1], b[2], b[0] + w, b[1], b[2]); }
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: "#5D5E5F", roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 })); m.receiveShadow = true; szene.add(m); }
  const HAUS = []; for (let i = 0; HAUS.length < 260 && i < 4000; i++) {
    const x = (hash(i, 21) - 0.5) * 620, z = -150 - hash(i, 22) ** 1.3 * 1100, sx = 40 + Math.sin(z * 0.0011) * 90;
    if (Math.abs(x - sx) < 14 || H(x, z) > 30) continue; HAUS.push({ x, z, w: 7 + hash(i, 23) * 7, d: 8 + hash(i, 24) * 8, h: 5 + hash(i, 25) * 5, r: Math.round(hash(i, 26) * 2) * Math.PI / 2 + (hash(i, 27) - 0.5) * 0.3, i });
  }
  { const wand = new THREE.BoxGeometry(1, 1, 1); wand.translate(0, 0.5, 0);
    const dach = new THREE.CylinderGeometry(0.72, 0.72, 1, 3, 1); dach.rotateZ(Math.PI / 2); dach.rotateX(0); dach.scale(1, 0.55, 1.42); dach.translate(0, 1.18, 0);
    const fenster = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 64, 64);
      g.fillStyle = "#3A3F45"; for (const [x, y] of [[12, 14], [38, 14], [12, 38], [38, 38]]) g.fillRect(x, y, 13, 15); g.fillStyle = "#7A5236"; g.fillRect(26, 50, 12, 14);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; })();
    const mW = new THREE.InstancedMesh(wand, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true, map: fenster }), HAUS.length);
    const mD = new THREE.InstancedMesh(dach, new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), HAUS.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    HAUS.forEach((h, k) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), h.r); m.compose(new THREE.Vector3(h.x, H(h.x, h.z) - 0.3, h.z), q, new THREE.Vector3(h.w, h.h, h.d));
      mW.setMatrixAt(k, m); mD.setMatrixAt(k, m); mW.setColorAt(k, c.set(["#E9E2D3", "#DCCBAE", "#CDBA9C", "#F1EEE6", "#C7B59B"][h.i % 5])); mD.setColorAt(k, c.set(["#7C3B2C", "#5E4B42", "#8E4A33", "#4E4643"][h.i % 4])); });
    for (const x of [mW, mD]) { x.castShadow = x.receiveShadow = true; szene.add(x); }
    const turm = new THREE.Mesh(new THREE.BoxGeometry(8, 30, 8), new THREE.MeshStandardMaterial({ color: "#EDE7DA", flatShading: true })); turm.position.set(-60, H(-60, -520) + 15, -520);
    const spitze = new THREE.Mesh(new THREE.ConeGeometry(6.2, 14, 4), new THREE.MeshStandardMaterial({ color: "#3F5A4A", flatShading: true })); spitze.position.set(-60, H(-60, -520) + 37, -520); spitze.rotation.y = Math.PI / 4;
    for (const x of [turm, spitze]) { x.castShadow = true; szene.add(x); } }

  // Wald: Bäume biegen sich von der Druckwelle weg, sobald die Front sie erreicht
  const BAUM = []; for (let i = 0; BAUM.length < 10000 && i < 90000; i++) {
    const x = (hash(i, 31) - 0.5) * 3000, z = 60 - hash(i, 32) ** 1.2 * 5200, y = H(x, z);
    if (y < 18 && Math.abs(x) < 380 && z < -120) continue; if (Math.hypot(x, z) < 70 || y > 1500) continue;
    BAUM.push({ x, y, z, s: (0.55 + hash(i, 33) * 0.7) * (1 + Math.min(1, Math.hypot(x, z) / 2500)), i });
  }
  const baumGeo = (() => { const k1 = new THREE.ConeGeometry(2.4, 6.5, 6); k1.translate(0, 6.2, 0); const k2 = new THREE.ConeGeometry(1.8, 5, 6); k2.translate(0, 9.4, 0); const st = new THREE.CylinderGeometry(0.3, 0.4, 3.4, 5); st.translate(0, 1.7, 0);
    const g = [k1, k2, st].map((x) => x.toNonIndexed()); const pos = [], col = []; const cs = [[0.2, 0.36, 0.2], [0.2, 0.36, 0.2], [0.32, 0.22, 0.15]];
    g.forEach((x, j) => { pos.push(...x.getAttribute("position").array); for (let k = 0; k < x.getAttribute("position").count; k++) col.push(...cs[j]); });
    const r = new THREE.BufferGeometry(); r.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); r.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); r.computeVertexNormals(); return r; })();
  const baeume = new THREE.InstancedMesh(baumGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }), BAUM.length);
  { const c = new THREE.Color(); BAUM.forEach((b, k) => baeume.setColorAt(k, c.setHSL(0.25 + hash(b.i, 34) * 0.07, 0.3 + hash(b.i, 35) * 0.2, 0.3 + hash(b.i, 36) * 0.2))); }
  baeume.castShadow = true; baeume.receiveShadow = true; baeume.instanceMatrix.setUsage(THREE.DynamicDrawUsage); szene.add(baeume);
  const setzeBaeume = (t) => { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    BAUM.forEach((b, k) => { const ta = ankunft(b.x, b.z); const f = t < ta ? 0 : ease.outCubic(clamp((t - ta) / 0.7)); const w = f * (1.05 + hash(b.i, 37) * 0.4) + Math.sin(t * 1.3 + b.i) * 0.012;
      q.setFromEuler(e.set(w, 0, -w * 0.12)); m.compose(new THREE.Vector3(b.x, b.y - 0.3, b.z), q, new THREE.Vector3(b.s, b.s, b.s)); baeume.setMatrixAt(k, m); });
    baeume.instanceMatrix.needsUpdate = true; };

  // Vordergrund: Brüstung der Aussichtsterrasse
  vordergrund(szene, { art: "glas", pos: AUGE, ziel: BLICK, abstand: 3.0, breite: 10, augenhoehe: 1.6, hoehe: 1.0, pfosten: [-2.6, 0.7, 4.0], farben: ["#5A625F", "#474E4B"] });

  // Statisten
  const leute = new Menschen(szene, { anzahl: 420 });
  leute.verteile({ anzahl: 260, bereich: { x: [-260, 260], z: [-760, -150] }, boden: (x, z) => H(x, z), gehen: 0.65, weg: [8, 30] });
  leute.verteile({ anzahl: 70, bereich: { x: [-30, 30], z: [-230, -150] }, boden: (x, z) => H(x, z), gehen: 0.4, weg: [4, 10] }); // Dorfplatz
  leute.reaktion({ t0: 38.8, art: "hinsehen", weg: [-VX / ABSTAND, 1], verzoegerung: [0, 1.2] });  // weg = Richtung weg vom Vulkan → sie sehen zum Vulkan
  leute.reaktion({ t0: ankunft(0, -450), art: "fallen", verzoegerung: [-1.2, 0.5], anteil: 0.8 });
  const autos = new Autos(szene, { anzahl: 46 });
  autos.spur({ punkte: strasse.map((p) => [p[0] - 2, p[1], p[2]]), anzahl: 22, tempo: 13 }).spur({ punkte: strasse.slice().reverse().map((p) => [p[0] + 2, p[1], p[2]]), anzahl: 22, tempo: 14 }).bremsen({ t0: 39.2, dauer: 3 });
  const voegel = new Voegel(szene, { anzahl: 40 });
  voegel.schwarm({ zentrum: [-30, 95, -260], radius: 45, hoehe: 14, tempo: 8, anzahl: 14, skala: 1.4 }).schwarm({ zentrum: [120, 150, -700], radius: 80, hoehe: 20, tempo: 10, anzahl: 18, skala: 2.2 }).flucht({ t0: 14.6, richtung: [0.9, 0.35, 0.5], tempo: 16 });

  // Wolken, Dampf, Ausbruch, Druckwelle
  const puffs = new Puffs(szene, { max: 900, schatten: 0.55 });
  const glutPuffs = new Puffs(szene, { max: 120, additiv: true, nebel: false, renderOrder: 11 });
  const wolken = wolkenFeld({ anzahl: 6, bereich: { x: [-7000, 8000], z: [-19000, -15500] }, hoehe: [3600, 5200], groesse: 900, a: 0.5, farbe: "#EEF0F2", wind: [3, 0], seed: 5 });
  const dampf = puffStrahl({ ursprung: [VX, VH - 230, VZ], richtung: [0.3, 1, 0], streuung: 0.25, tempo: 18, von: -40, bis: T_AUS, rate: 2.2, leben: 22, r: 160, wachsen: 3, farbe: "#E9E6E1", a: 0.75, seed: 9 });
  const saeuleF = rauchSaeule({ basis: [VX, VH - 250, VZ], t0: T_AUS, hoehe: 10000, hoeheBei: (tau) => saeule(T_AUS + tau), breite: 650, aufweitung: 3.2, kopf: 5200, kopfDauer: 30, anzahl: 320, farbeUnten: "#35302D", farbeOben: "#77706A", wind: [22, 5], seed: 13 });
  const schirm = (() => { const P = []; for (let i = 0; i < 70; i++) P.push({ u: hash(i, 41), v: hash(i, 42), r: 900 + hash(i, 43) * 900, b: i % 4, d: hash(i, 44) * 6 });
    return (t) => { const f = smoothstep(36, 50, t); if (f <= 0) return [];
      return P.map((p) => { const ax = VX + 400 + p.u * 6200 * f, az = VZ + 2500 + p.v * 4000 * f; return { p: [ax, 5200 + (p.v - 0.5) * 1400 - p.u * 1600 * f, az], r: p.r * (0.6 + f * 0.6), dreh: p.d, farbe: "#4D4743", a: 0.95 * smoothstep(0, 0.25, f - p.u * 0.5), licht: 0.9, bild: p.b }; }); }; })();
  const knall = feuerBall({ p: [VX, VH + 120, VZ], t0: T_AUS, radius: 330, wachsen: 1.4, glutDauer: 1.6, anzahl: 50, seed: 17, kern: "#FF8A40", rauch: "#3A3532" });
  const auswurf = puffStrahl({ ursprung: [VX, VH - 100, VZ], breite: 300, richtung: [0, 1, 0], streuung: 0.7, tempo: 260, schwerkraft: 9.8, von: T_AUS, bis: T_AUS + 2.5, rate: 28, leben: 9, r: 140, wachsen: 3.2, farbe: "#2E2926", a: 0.9, seed: 19, licht: 0.6 });
  const welle = staubWand({ ziel: [0, 0], boden: 0, richtung: [-VX / ABSTAND, 1], start: ABSTAND - 900, t0: T_AUS + 900 / C, ankunft: T_AN, breite: 5600, hoehe: 420, anzahl: 420, farbe: "#A8977F", farbeSchatten: "#4A4036", seed: 29 });
  const gipfelGlut = new Glut(szene, { farbe: "#FF8A3D", groesse: 800, staerke: 0 });
  gipfelGlut.setze({ p: [VX, VH + 80, VZ] });
  const blitze = [31.2, 36.9, 41.5, 47.3].map((t, i) => ({ t, x: VX + (hash(i, 51) - 0.5) * 900, y: VH + 1400 + hash(i, 52) * 2400 }));
  const blitzGlut = new Glut(szene, { farbe: "#DCE6FF", groesse: 1600, staerke: 0 });

  // Trümmer beim Höhepunkt: Ziegel und Bretter vom Dorf und der Terrasse
  const ziegel = new Truemmer(szene, { anzahl: 260, form: "ziegel", farben: ["#7C3B2C", "#8E4A33", "#5E4B42"], groesse: [0.8, 1.6], seed: 61 });
  for (let k = 0; k < 5; k++) ziegel.wurf({ t0: ankunft(0, -260 - k * 120), ursprung: [0, 12, -260 - k * 120], streuung: [220, 6, 50], richtung: [-VX / ABSTAND * 40, 14, 40], tempoStreuung: 0.5, wind: [-VX / ABSTAND * 70, 0, 70], luft: 0.9, anzahl: 40 });
  const bretter = new Truemmer(szene, { anzahl: 40, form: "brett", farben: ["#6B4A33", "#8A6A4E"], groesse: [0.5, 1.0], seed: 67 });
  bretter.wurf({ t0: T_AN - 0.25, ursprung: [-2, 42, -40], streuung: [14, 4, 8], richtung: [0, 6, 35], tempoStreuung: 0.4, wind: [0, 0, 60], luft: 1.2, anzahl: 40, drehung: 9 });
  const staubNah = puffStrahl({ ursprung: [0, 40, -25], breite: 40, richtung: [0, 0.15, 1], streuung: 0.6, tempo: 30, von: T_AN - 0.6, bis: T_AN + 1.8, rate: 22, leben: 2.2, r: 7, wachsen: 4, farbe: "#8F7F6C", a: 0.55, seed: 71 });

  const asche = new Partikel(szene, { art: "asche", anzahl: 2600, box: [26, 14, 26], seed: 7 });
  const staub = new Partikel(szene, { art: "staub", anzahl: 1800, box: [30, 16, 30], seed: 8 });

  // Kamera: fast starr, leichtes Beben ab 9,6 s (Satz 2), Grollen vor der Ankunft, Stoß und Kippen bei der Ankunft
  pov.atmen({ staerke: 1 }).beben({ von: 9.6, bis: 13.6, staerke: 0.05, anstieg: 0.8, abkling: 0.6 }).beben({ von: 54, bis: T_AN, staerke: 0.22, anstieg: 6, abkling: 0.3 })
    .stoss({ t: T_AN, staerke: 1.6, abkling: 1.2 }).kippen({ t: T_AN + 0.12, dauer: 0.75, roll: 13, nick: -5, fall: 0.3, seit: 0.2 });

  // Farbstimmung je Phase
  const farben = farbPhasen([
    { t: 0, phase: "alltag", werte: { belichtung: 1.0, kontrast: 1.04, saettigung: 1.18 } }, { t: 36, phase: "alltag", werte: { belichtung: 1.0, kontrast: 1.04, saettigung: 1.18 } },
    { t: 47.5, werte: { belichtung: 0.95, saettigung: 1.0, kontrast: 1.04, tonung: [1.08, 0.95, 0.8], tonungStaerke: 0.4 } },   // Sonne verdeckt, warmes Restlicht
    { t: 58.5, phase: "staub", werte: { belichtung: 0.85 } },
    { t: T_AN + 0.05, phase: "staubwand", e: ease.outCubic }, { t: T_AN + 0.7, phase: "staubwand" },
    { t: T_AN + 2.6, phase: "staub", werte: { belichtung: 0.66, schleier: [0.5, 0.42, 0.35], schleierStaerke: 0.4, unschaerfe: 0.15 } },
    { t: 68, phase: "staub", werte: { belichtung: 0.6, schleier: [0.45, 0.38, 0.32], schleierStaerke: 0.36, unschaerfe: 0.1 } },
  ]);
  const prot = new Protokoll();
  prot.effekt(9.6, "grollen", { dauer: 4, staerke: 0.3 }).effekt(14.6, "voegel", { klang: "fluegel" }).effekt(T_AUS, "blitz", { staerke: 0.6, klang: false, text: "stumm: der Schall braucht 40,8 s" })
    .effekt(T_AUS, "ausbruch", { dauer: 40, klang: false, text: "Säule steigt (Bild), Schall noch unterwegs (Ton still)" }).effekt(T_AN - 6, "grollen", { dauer: 6, staerke: 1 })
    .effekt(T_AN, "druckwelle", { staerke: 1 }).effekt(T_AN + 0.1, "truemmer", { dauer: 3 }).effekt(T_AN + 1.4, "tinnitus", { dauer: 8.5 });
  blitze.forEach((b) => prot.effekt(b.t, "vulkanblitz", { klang: false, staerke: 0.4 }));   // Donner käme erst nach 41 s an

  const welt = { szene, kamera: kam, post: {}, update(t) {
    const z = pov.anwenden(t);
    himmel.folge(kam);
    // Licht: Sonne verschwindet hinter dem Schirm (43,6–47,5 s), Staub dämpft danach weiter
    const verdeckt = smoothstep(43.6, 47.5, t), dunkel = smoothstep(58, T_AN, t);
    himmel.setze({ sonnenStaerke: 34 * (1 - verdeckt), glanz: 0.75 * (1 - verdeckt * 0.85), zenit: new THREE.Color("#4F72AA").lerp(new THREE.Color("#7A6E60"), verdeckt * 0.5 + dunkel * 0.35), horizont: new THREE.Color("#AAB8CB").lerp(new THREE.Color("#A79A88"), verdeckt * 0.55 + dunkel * 0.35), zeit: t });
    sonne.intensity = 2.3 * (1 - verdeckt * 0.8); hemi.intensity = 1.0 * (1 - verdeckt * 0.35 - dunkel * 0.2);
    szene.fog.color.copy(himmel.horizont); szene.fog.density = 3.6e-5 * (1 + verdeckt * 0.6 + dunkel * 6 + smoothstep(T_AN, T_AN + 1, t) * 40 - smoothstep(T_AN + 2, 66, t) * 26);
    // Ausbruch: Gipfelglut, Blitze in der Säule
    gipfelGlut.setze({ staerke: 9 * blitzKurve(t, T_AUS, { anstieg: 0.06, halten: 0.3, abkling: 2.4 }) + (t > T_AUS ? 1.6 * smoothstep(T_AUS, T_AUS + 3, t) : 0) });
    let bz = 0, bp = blitze[0];
    for (const b of blitze) { const k = blitzKurve(t, b.t, { anstieg: 0.03, halten: 0.06, abkling: 0.25 }); if (k > bz) { bz = k; bp = b; } }
    blitzGlut.setze({ p: [bp.x, bp.y, VZ + 600], staerke: 9 * bz });
    // Puffs: Wolken, Dampf, Säule, Schirm, Feuerball-Rauch, Druckwellen-Staub, Staub an der Terrasse
    puffs.setze([...wolken(t).map((p) => ({ ...p, a: p.a * (1 - verdeckt * 0.7) })), ...dampf(t), ...auswurf(t), ...saeuleF(t), ...schirm(t), ...knall.rauch(t), ...welle.puffs(t), ...staubNah(t)], kam);
    glutPuffs.setze(knall.glut(t), kam);
    setzeBaeume(t); leute.setze(t); autos.setze(t); voegel.setze(t); ziegel.setze(t); bretter.setze(t);
    asche.setze(t, kam, { deckkraft: 0.85 * smoothstep(T_AN + 0.8, T_AN + 3, t), wind: [0.5, 0, 0.8] });
    staub.setze(t, kam, { deckkraft: 0.6 * smoothstep(T_AN - 1, T_AN + 0.5, t) * (1 - 0.5 * smoothstep(T_AN + 4, 70, t)), wind: [0.2, 0.1, 2.5] });
    // Nachbearbeitung
    const f = farben(t);
    const vor = welle.vorKamera(t);
    Object.assign(welt.post, f, {
      bloomStaerke: f.bloomStaerke + 0.6 * blitzKurve(t, T_AUS, { anstieg: 0.06, halten: 0.3, abkling: 2 }), belichtung: f.belichtung * (1 + 0.25 * blitzKurve(t, T_AUS, { anstieg: 0.06, halten: 0.2, abkling: 1.6 })),
      schleierStaerke: Math.max(f.schleierStaerke, 0.9 * vor * (1 - smoothstep(T_AN + 0.6, T_AN + 2.6, t))), schleier: f.schleier,
      tiefeNah: t > T_AN ? 0.55 : 0, fokusNah: 2.5, vignette: 0, koernung: 0.008, tiltStaerke: 0,
    });
    return z;
  } };

  // ---------------------------------------------------------------- Text: Titel, Anzeige, Sätze, Abspann
  const TITEL = "Was wäre, wenn der Vulkan gegenüber ausbricht?";
  const FAKT = "Krakatau, 1883 · Der Knall war 4.800 km weit zu hören";
  const anzeige = (t) => {
    if (t < T_AUS) return { etikett: "Luftdruck", zahl: zahlDE(druck(t), 1), einheit: "hPa", unter: "Gipfel 14 km entfernt", wert: druck(t) };
    if (t < 34) return { etikett: "Aschesäule", zahl: zahlDE(saeule(t) / 1000, 1), einheit: "km", unter: `steigt mit ${zahlDE(saeuleV(t))} m/s`, wert: saeule(t) };
    if (t < T_AN) { const rest = T_AN - t; return { etikett: "Druckwelle in", zahl: uhrzeit(rest), einheit: "", unter: `noch ${zahlDE((rest * C) / 1000, 1)} km · ${zahlDE(C * 3.6)} km/h`, wert: rest }; }
    return { etikett: "Druckwelle", zahl: "HIER", einheit: "", unter: "", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), {
    titel: TITEL, fakt: FAKT, anzeige,
    saetze: [[4.8, "Ein stiller Morgen im Tal."], [9.6, "Der Berg bebt seit Tagen."], [14.4, "Die Vögel fliegen auf."], [19.6, "Dann reißt der Gipfel auf."],
      [24.4, "Kein Laut. Der Schall ist unterwegs."], [29.2, "Die Säule wächst und wächst."], [34.0, "Die Druckwelle rollt auf dich zu."], [38.8, "Unten im Ort bleiben alle stehen."],
      [43.6, "Die Wolke schiebt sich vor die Sonne."], [48.4, "Über das Tal rast eine Wand."], [53.2, "Die Bäume legen sich flach."], [57.6, "Gleich ist sie da.", 3.0],
      [62.6, "Die Druckwelle ist vorbei.", 4.0], [67.0, "Asche rieselt wie grauer Schnee.", 3.0]],
  });
  hud.glas({ t: T_AN + 0.18, seed: 4, punkte: [[0.64, 0.33, 1], [0.22, 0.71, 0.8], [0.83, 0.86, 0.6]] });
  hud.flecken({ von: T_AN + 0.4, bis: 71, anzahl: 18, art: "dunkel", seed: 3, wind: [18, 26] });

  const ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_AUS, T_AN, C, ABSTAND, saeule_34s_m: saeule(34) };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
