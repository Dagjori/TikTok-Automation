// Account 2 @stelldirvor.pov – „Was wäre, wenn wir wieder in eine Eiszeit steuern?“
// Dachterrasse eines Hochhauses am Hafen von Toronto (150 m), Blick nach Nordwesten über Innenstadt und CN Tower, links der Ontariosee.
// Zeitraffer und Werte aus sim/eiszeit_toronto.mjs (Quellen und Annahmen in skript.json). Grundwelt: engine/welt_grossstadt_dach.js.
// Feste Ich-Perspektive, eine Einstellung, drei Textebenen (LunarHUD), Abspann. Deterministisch: window.renderAt(t).
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, hash } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Himmel, Glut, Puffs, wolkenFeld, puffStrahl, Partikel, Truemmer, vordergrund, PovKamera, farbPhasen, Protokoll } from "../../engine/stil_lunar_pov.js";
import { LunarHUD } from "../../engine/lunar_hud.js";
import { GrossstadtDach, TORONTO_HAFEN } from "../../engine/welt_grossstadt_dach.js";
import * as E from "../../sim/eiszeit_toronto.mjs";

const FPS = 30, DAUER = 80;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const T_HIER = E.T.hier;
const AUGE = [0, TORONTO_HAFEN.dachHoehe + 1.6, 0], BLICK = [-150, AUGE[1] - 160, -3000];

// Sonne: Spätsommer-Abend im Westen (vorn links, im Bild) → Wintermittag im Süden (hinten links, beleuchtet die Eiswand)
const SONNE_SOMMER = new THREE.Vector3(-0.2, 0.25, -0.95).normalize();
const SONNE_WINTER = new THREE.Vector3(-0.55, 0.42, 0.72).normalize();

// ---------------------------------------------------------------- Eisschild (stilisierte Front: 1,15 km hohe Wand, dahinter bis 2,1 km)
const WAND = 1150, FERN = 28000, ALPHA = -0.2;
const lappen = (u) => 220 * Math.sin(u / 1900 + 1) + 90 * Math.sin(u / 530 + 2);
const eisHoehe = (s, u) => {
  if (s < 0) return 0;
  const sv = s + 60 * Math.sin(u / 310) + 40 * Math.sin(u / 97);
  return 110 * smoothstep(0, 30, s) + WAND * smoothstep(0, 400, sv) + (E.EIS_TORONTO - WAND) * (1 - Math.exp(-s / 9000)) + (s < 2500 ? 22 * Math.sin(u * 0.031) * Math.sin(s * 0.023) : 0);
};
function eisschildGeo() {
  const us = []; for (let i = 0; i <= 150; i++) us.push(-16000 + (32000 * i) / 150);
  const ss = [0, 8, 20, 40, 70, 110, 160, 220, 290, 370, 460, 560, 680, 820, 1000, 1250, 1600, 2100, 2800, 3700, 5000, 6600, 8600, 11000, 14000, 18000, 23000, 30000];
  const pos = [], obj = [];
  const P = (u, s) => [u, eisHoehe(s, u) + (s > 30 ? (hash(Math.round(u * 3 + s * 7), 5) - 0.5) * Math.min(30, s * 0.05) : 0), -s - lappen(u)];
  for (let j = 0; j < ss.length - 1; j++) for (let i = 0; i < us.length - 1; i++) {
    const a = P(us[i], ss[j]), b = P(us[i + 1], ss[j]), c = P(us[i], ss[j + 1]), d = P(us[i + 1], ss[j + 1]);
    pos.push(...a, ...b, ...c, ...b, ...d, ...c);
    for (let k = 0; k < 6; k++) obj.push(ss[j]);
  }
  // Stirnseite unten (Fuß der Wand) bis unter den Boden
  for (let i = 0; i < us.length - 1; i++) { const a = [us[i], -5, -lappen(us[i])], b = [us[i + 1], -5, -lappen(us[i + 1])], c = P(us[i], 0), d = P(us[i + 1], 0); pos.push(...a, ...b, ...c, ...c, ...b, ...d); for (let k = 0; k < 6; k++) obj.push(0); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("lpS", new THREE.Float32BufferAttribute(obj, 1));
  g.computeVertexNormals();
  return g;
}
function eisMaterial(uK, uDunst, uDunstF) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.55, flatShading: true, fog: false });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uK, uDunst, uDunstF });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uK; varying vec3 vEisO; varying vec3 vEisN; varying float vEisD;")
      .replace("#include <project_vertex>", `vEisO = position; vEisN = normalize(mat3(modelMatrix) * objectNormal);
  vec4 lpWp = modelMatrix * vec4(transformed, 1.0);
  float lpD = length(lpWp.xz - cameraPosition.xz) / uK;
  vEisD = lpD;
  lpWp.y -= lpD * lpD / 12742000.0 * 0.87 * uK;
  vec4 mvPosition = viewMatrix * lpWp;
  gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vEisO; varying vec3 vEisN; varying float vEisD; uniform vec3 uDunst; uniform float uDunstF; uniform float uK;
float eH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float eN(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(eH(i), eH(i + vec2(1, 0)), u.x), mix(eH(i + vec2(0, 1)), eH(i + vec2(1, 1)), u.x), u.y); }`)
      .replace("#include <color_fragment>", `#include <color_fragment>
  float steil = 1.0 - clamp(normalize(vEisN).y, 0.0, 1.0);
  vec3 schnee = vec3(0.97, 0.98, 0.99);
  float streif = eN(vec2(vEisO.x * 0.045, vEisO.y * 0.004));                       // senkrechte Rinnen und Séracs
  float lagen = 0.5 + 0.5 * sin(vEisO.y * 0.06 + eN(vEisO.xz * 0.004) * 8.0);       // Jahresschichten
  vec3 blau = mix(vec3(0.66, 0.81, 0.92), vec3(0.36, 0.56, 0.74), smoothstep(0.35, 0.8, streif));
  blau *= 0.86 + 0.18 * lagen;
  float spalte = smoothstep(0.78, 0.9, eN(vec2(vEisO.x * 0.03, vEisO.y * 0.0015))) * (1.0 - smoothstep(-2500.0, -600.0, vEisO.z));
  vec3 c = mix(schnee, blau, smoothstep(0.3, 0.75, steil));
  c = mix(c, vec3(0.18, 0.33, 0.50), spalte * 0.8 * smoothstep(0.3, 0.7, steil));
  float schutt = (1.0 - smoothstep(25.0, 75.0, vEisO.y)) * smoothstep(0.4, 0.7, steil);          // Moränenband am Fuß
  c = mix(c, vec3(0.42, 0.40, 0.38) * (0.8 + 0.3 * eN(vEisO.xy * 0.08)), schutt * 0.85);
  diffuseColor.rgb = c * (0.95 + 0.08 * eN(vEisO.xz * 0.05));`)
      .replace("#include <dithering_fragment>", `#include <dithering_fragment>
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uDunst, (1.0 - exp(-vEisD / mix(70000.0, 300000.0, 1.0 - uK))) * uDunstF);   // fern weniger Dunst: Linie am Horizont sichtbar`);
  };
  return m;
}

async function start() {
  aktiviereHoehenNebel({ abfall: 0.0004, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#BCC5CF", 3.0e-5);
  const kam = new THREE.PerspectiveCamera(52, 1080 / 1920, 0.3, 42000);
  const pov = new PovKamera(kam, { pos: AUGE, ziel: BLICK, fov: 52 });

  const himmel = new Himmel(szene, { radius: 3000, zenit: "#5E7DAE", horizont: "#BCC5CF", unten: "#8B8F8C", dunst: 0.22, sonnenRichtung: SONNE_SOMMER.toArray(), sonnenFarbe: "#FFE9CC", sonnenStaerke: 30, glanz: 0.6, glanzBreite: 0.09, zirren: 0.45 });
  const hemi = new THREE.HemisphereLight("#C2CFE2", "#4A4A44", 0.85);
  const sonne = new THREE.DirectionalLight("#FFE3C0", 2.9);
  sonne.castShadow = SCHATTEN > 0; sonne.shadow.mapSize.set(SCHATTEN || 1, SCHATTEN || 1);
  Object.assign(sonne.shadow.camera, { left: -950, right: 950, top: 950, bottom: -950, near: 10, far: 4000 });
  sonne.shadow.bias = -0.0005; sonne.shadow.normalBias = 0.8;
  szene.add(hemi, sonne, sonne.target);

  // Grundwelt
  const stadt = new GrossstadtDach(szene, { ...TORONTO_HAFEN, sonne: SONNE_SOMMER.toArray(), schatten: SCHATTEN > 0 });
  const U = stadt.ufer;

  // Vordergrund: Glasbrüstung mit Stahlhandlauf, Reif wächst darauf
  const vg = vordergrund(szene, { art: "glas", pos: AUGE, ziel: BLICK, abstand: 1.55, breite: 8, augenhoehe: 1.6, hoehe: 1.08, pfosten: [-1.6, 1.2], farben: ["#9AA1A7", "#6E757B"] });
  const reifTex = (() => { const c = document.createElement("canvas"); c.width = 1024; c.height = 256; const g = c.getContext("2d"); g.clearRect(0, 0, 1024, 256);
    for (let i = 0; i < 2600; i++) { const x = hash(i, 1) * 1024, yb = 256 - Math.pow(hash(i, 2), 1.8) * 256, l = 3 + hash(i, 3) * 16, a = hash(i, 4) * 6.28;
      g.strokeStyle = `rgba(255,255,255,${0.25 + 0.5 * hash(i, 5)})`; g.lineWidth = 0.6 + hash(i, 6) * 1.2; g.beginPath(); g.moveTo(x, yb); g.lineTo(x + Math.cos(a) * l, yb + Math.sin(a) * l);
      for (let k = 0; k < 3; k++) { const f = 0.3 + k * 0.25, aa = a + (k % 2 ? 0.8 : -0.8); g.moveTo(x + Math.cos(a) * l * f, yb + Math.sin(a) * l * f); g.lineTo(x + Math.cos(a) * l * f + Math.cos(aa) * l * 0.3, yb + Math.sin(a) * l * f + Math.sin(aa) * l * 0.3); } g.stroke(); }
    const grad = g.createLinearGradient(0, 256, 0, 0); grad.addColorStop(0, "rgba(240,246,250,0.55)"); grad.addColorStop(0.5, "rgba(240,246,250,0.15)"); grad.addColorStop(1, "rgba(240,246,250,0)"); g.fillStyle = grad; g.fillRect(0, 0, 1024, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const reifMat = new THREE.MeshStandardMaterial({ map: reifTex, transparent: true, opacity: 0, roughness: 0.6, depthWrite: false, color: "#FFFFFF" });
  const reif = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.08 * 0.85), reifMat); reif.position.set(0, 1.08 * 0.48, -1.55 + 0.02); vg.add(reif);
  const handlaufMats = []; vg.traverse((o) => { if (o.isMesh && o.material && !o.material.transparent) handlaufMats.push([o.material, o.material.color.clone()]); });

  // Eisschild
  const uK = { value: 1 }, uDunst = { value: new THREE.Color("#DCE5EC") }, uDunstF = { value: 0.9 };
  const eis = new THREE.Mesh(eisschildGeo(), eisMaterial(uK, uDunst, uDunstF)); eis.castShadow = true; eis.frustumCulled = false; eis.rotation.y = ALPHA; szene.add(eis);
  const eisLokal = (x, z, D) => { const dz = z + D * 1000, c = Math.cos(ALPHA), s = Math.sin(ALPHA); const u = x * c - dz * s, zl = x * s + dz * c; return { u, s: -zl - lappen(u) }; };
  const versenkt = (t) => { const D = E.eisrandKm(t); if (D > 18) return null; return (x, z) => smoothstep(-10, 380, eisLokal(x, z, D).s); };

  // Wolken, Dampf, Schneefahnen
  const puffs = new Puffs(szene, { max: 1100, schatten: 0.62 });
  const wolkenS = wolkenFeld({ anzahl: 9, bereich: { x: [-9000, 7000], z: [-26000, -9000] }, hoehe: [1600, 2400], groesse: 520, a: 0.85, farbe: "#F3F2EE", wind: [4, 1], seed: 5 });
  const wolkenW = wolkenFeld({ anzahl: 16, bereich: { x: [-12000, 10000], z: [-24000, -3000] }, hoehe: [1100, 1700], groesse: 700, a: 0.9, farbe: "#C9CFD6", wind: [9, 3], seed: 11 });
  const kaelte = (t) => Math.max(E.schnee(t), smoothstep(23, 30, t));
  // Schneefahnen an der Front und Fallwind über der Wandkrone (nur nahe)
  const FP = []; for (let i = 0; i < 110; i++) FP.push({ u: hash(i, 101), h: hash(i, 102), r: hash(i, 103), ph: hash(i, 104), b: i % 4, oben: i % 3 === 0 });
  const frontPuffs = (t) => {
    const D = E.eisrandKm(t); if (D > 12 || t > T_HIER + 0.8) return [];
    const Dm = D * 1000, breite = Math.min(9000, Dm * 0.5 + 700), out = [], c = Math.cos(ALPHA), s = Math.sin(ALPHA);
    const sicht = smoothstep(12, 6, D);
    for (const p of FP) {
      const u = (p.u - 0.5) * 2 * breite;
      const vor = ((t * (p.oben ? 26 : 14) + p.ph * 400) % 400);
      const sl = p.oben ? 520 - vor * 1.1 : -vor * 0.6;            // s hinter der Front (negativ = davor)
      const y = p.oben ? eisHoehe(Math.max(0, sl), u) + 30 + p.h * 160 : 8 + p.h * 170;
      const lx = u, lz = -sl - lappen(u);
      const x = lx * c + lz * s, z = -lx * s + lz * c - Dm;
      const rr = (110 + 220 * p.r) * (p.oben ? 1.2 : 1) * (0.45 + 0.55 * Math.min(1, Dm / 3000)) * (1 + vor / 400);
      out.push({ p: [x, y, z], r: rr, dreh: p.ph * 6 + t * 0.15, farbe: "#EDF2F6", a: (p.oben ? 0.32 : 0.16) * sicht * (1 - vor / 420) * (p.oben ? smoothstep(0.15, 1.2, D) : smoothstep(0.3, 1.5, D)), licht: 0.9, bild: p.b });
    }
    return out;
  };
  const turmStaub = puffStrahl({ ursprung: [TORONTO_HAFEN.turm.x, 40, TORONTO_HAFEN.turm.z + 60], breite: 160, richtung: [0, 0.6, 1], streuung: 0.6, tempo: 22, von: 53.9, bis: 56.5, rate: 26, leben: 4.5, r: 40, wachsen: 3, farbe: "#E6EBEF", a: 0.7, seed: 77 });
  // Weißblende beim Eintreffen: Schneewalze direkt vor der Kamera
  const walze = puffStrahl({ ursprung: [0, AUGE[1] - 20, -260], breite: 500, richtung: [0, 0.15, 1], streuung: 0.5, tempo: 160, von: T_HIER - 0.75, bis: T_HIER + 0.5, rate: 80, leben: 1.8, r: 28, wachsen: 3.5, farbe: "#F1F5F8", a: 0.85, seed: 79, licht: 0.95 });

  // Teilchen: Schneefall, Eisglitzern (Diamantstaub), treibender Schnee im Fallwind, Eiskristalle unter dem Eis
  const flocken = new Partikel(szene, { art: "schnee", anzahl: 3000, box: [34, 18, 34], seed: 21, groesse: 0.032 });
  const glitzer = new Partikel(szene, { art: "eis", anzahl: 1600, box: [30, 16, 30], seed: 22, groesse: 0.035 });
  const treiben = new Partikel(szene, { art: "schnee", anzahl: 3600, box: [30, 14, 40], seed: 23, groesse: 0.03, wirbel: 1.2 });
  const kristalle = new Partikel(szene, { art: "eis", anzahl: 900, box: [10, 8, 10], seed: 24, groesse: 0.03 });

  // Eisinneres nach der Ankunft (die Kamera steckt im Eis)
  const innenU = { hell: { value: 1 }, zeit: { value: 0 } };
  const innen = new THREE.Mesh(new THREE.SphereGeometry(14, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: true, fog: false, uniforms: innenU,
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float hell, zeit; varying vec3 vD;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y); }
void main(){ vec3 d = normalize(vD); float y = d.y; float az = atan(d.x, -d.z);
  float schicht = 0.5 + 0.5 * sin(y * 55.0 + n(vec2(az * 4.0, y * 3.0)) * 3.0);          // Jahresschichten im Eis
  float strahl = pow(max(0.0, n(vec2(az * 9.0, 0.5)) - 0.35), 2.0) * smoothstep(-0.2, 0.9, y); // Lichtbahnen von oben
  vec2 bq = vec2(az * 60.0, y * 60.0); float blase = smoothstep(0.08, 0.0, length(fract(bq) - 0.5) - 0.02) * step(0.93, h(floor(bq)));
  vec3 tief = vec3(0.02, 0.07, 0.13), mitte = vec3(0.10, 0.30, 0.45), oben = vec3(0.50, 0.74, 0.88);
  vec3 c = mix(tief, mitte, smoothstep(-0.7, 0.2, y)); c = mix(c, oben, smoothstep(0.15, 0.95, y) * hell);
  c *= 0.88 + 0.18 * schicht; c += vec3(0.5, 0.72, 0.85) * (strahl * 0.5 + blase * 0.35) * (0.3 + 0.7 * hell);
  gl_FragColor = vec4(c * (0.4 + 0.6 * hell), 1.0); }` }));
  innen.renderOrder = 0; innen.visible = false; szene.add(innen);

  // Trümmer: Glassplitter der Brüstung und Eisbrocken beim Eintreffen
  const brocken = new Truemmer(szene, { anzahl: 120, form: "brocken", farben: ["#DCE8F0", "#B9CEDD", "#F2F6F9"], groesse: [0.15, 0.7], seed: 61 });
  brocken.wurf({ t0: T_HIER - 0.15, ursprung: [0, AUGE[1] + 6, -30], streuung: [14, 8, 10], richtung: [0, 4, 26], tempoStreuung: 0.5, wind: [0, -2, 30], luft: 0.8, anzahl: 120, drehung: 8 });

  // Statisten-Reaktionen: hinsehen, wenn die Linie erscheint; fliehen nach Süden, wenn die Wand nah ist
  stadt.leute.reaktion({ t0: E.T.linie + 0.5, art: "hinsehen", weg: [0, 1], verzoegerung: [0, 2.5], anteil: 0.6 });
  stadt.leute.reaktion({ t0: 49.5, art: "fliehen", weg: [0.12, 1], tempo: [2.6, 4.6], verzoegerung: [0, 2.2], anteil: 0.9 });
  stadt.krähen.flucht({ t0: 14.6, richtung: [-0.35, 0.05, 1], tempo: 15 });
  stadt.moewen.flucht({ t0: 28.6, richtung: [-0.7, 0.25, 0.65], tempo: 14 });

  // Turm-Licht (Flugwarnlicht)
  const warnlicht = new Glut(szene, { farbe: "#FF4A3A", groesse: 9, staerke: 0 });

  // Kamera: fast starr, leichtes Zittern im Fallwind, Stoß beim Eintreffen
  pov.atmen({ staerke: 1 })
    .beben({ von: 50.5, bis: T_HIER, staerke: 0.13, frequenz: 4.3, anstieg: 7, abkling: 0.3 })
    .stoss({ t: T_HIER, staerke: 1.5, abkling: 1.3 })
    .kippen({ t: T_HIER + 0.1, dauer: 0.8, roll: 8, nick: -4, fall: 0.25, seit: 0.15 });

  // Farbstimmung je Phase (licht-und-effekte.md): Alltag → Winterpulse → kalt-klar (eis) → Schneetreiben (grell) → Weißblende → Eis (blau) → Abblende
  const farben = farbPhasen([
    { t: 0, phase: "alltag", werte: { saettigung: 1.08, kontrast: 1.04 } }, { t: 14.2, phase: "alltag", werte: { saettigung: 1.08, kontrast: 1.04 } },
    { t: 27, phase: "eis", werte: { belichtung: 0.9, saettigung: 0.88, kontrast: 1.14, tonungStaerke: 0.35 } },
    { t: 40, phase: "eis", werte: { belichtung: 0.9, saettigung: 0.9, kontrast: 1.16, bloomStaerke: 1.0 } },
    { t: 57.5, phase: "eis", werte: { belichtung: 0.95, saettigung: 0.85, kontrast: 1.14, bloomStaerke: 1.1, schleier: [0.9, 0.94, 0.97], schleierStaerke: 0.05 } },
    { t: 59.95, phase: "grell", werte: { belichtung: 1.2, saettigung: 0.65, schleier: [0.93, 0.96, 0.99], schleierStaerke: 0.3 } },
    { t: T_HIER + 0.15, phase: "grell", werte: { belichtung: 1.55, saettigung: 0.5, kontrast: 0.75, schleier: [0.95, 0.97, 1.0], schleierStaerke: 0.92, unschaerfe: 0.5 }, e: ease.outCubic },
    { t: T_HIER + 0.9, phase: "grell", werte: { belichtung: 1.4, saettigung: 0.5, kontrast: 0.8, schleier: [0.93, 0.96, 1.0], schleierStaerke: 0.8, unschaerfe: 0.45 } },
    { t: T_HIER + 2.6, phase: "wasser", werte: { belichtung: 0.95, saettigung: 0.8, tonung: [0.6, 0.86, 1.1], tonungStaerke: 0.55, schleier: [0.25, 0.45, 0.6], schleierStaerke: 0.25, unschaerfe: 0.12 } },
    { t: 70, phase: "wasser", werte: { belichtung: 0.55, saettigung: 0.7, tonung: [0.55, 0.8, 1.1], tonungStaerke: 0.6, schleier: [0.06, 0.15, 0.25], schleierStaerke: 0.3, unschaerfe: 0.15 } },
  ]);

  // Ereignis-Protokoll (Klang an genau diesen Stellen, atmo.py)
  const prot = new Protokoll();
  prot.effekt(14.6, "zugvoegel", { klang: "fluegel" })
    .effekt(15.0, "winter", { klang: "windstoss", staerke: 0.5 }).effekt(19.0, "winter", { klang: "windstoss", staerke: 0.6 }).effekt(23.4, "winter", { klang: "windstoss", staerke: 0.7 })
    .effekt(E.T.seeFriert, "see_friert", { klang: "grollen", dauer: 4, staerke: 0.25 })
    .effekt(E.T.linie, "eislinie", { klang: false, text: "Eisrand 125 km, lautlos" })
    .effekt(46.5, "eis_grollen", { klang: "grollen", dauer: 6, staerke: 0.5 })
    .effekt(54.0, "turm_im_eis", { klang: false, text: "Schall bräuchte 8,7 s, geht im Grollen unter" })
    .effekt(56.5, "fallwind", { klang: "windstoss", staerke: 1, dauer: 4 })
    .effekt(T_HIER - 3, "eiswand_nah", { klang: "grollen", dauer: 3, staerke: 1 })
    .effekt(T_HIER, "eiswand", { klang: "einschlag", staerke: 1 })
    .effekt(T_HIER + 0.2, "glas", { klang: "glas" })
    .effekt(T_HIER + 1.2, "tinnitus", { dauer: 8.3 });

  const sDir = new THREE.Vector3(), cTmp = new THREE.Color(), cTmp2 = new THREE.Color();
  const welt = { szene, kamera: kam, post: {}, update(t) {
    const z = pov.anwenden(t);
    himmel.folge(kam);
    const sn = E.schnee(t), som = clamp(E.sommerLicht(t)), kalt = kaelte(t), klar = smoothstep(36, 41, t), nah = smoothstep(59.6, T_HIER, t), drin = t > T_HIER + 0.7;
    // Sonne wandert (Stichproben über Jahrtausende): Sommerabend → Wintermittag
    sDir.copy(SONNE_SOMMER).lerp(SONNE_WINTER, smoothstep(14.5, 30, t)).normalize();
    sonne.position.copy(sDir).multiplyScalar(2000).add(new THREE.Vector3(0, 0, -900)); sonne.target.position.set(0, 0, -900);
    const grau = sn * (1 - klar) * 0.75;
    himmel.setze({ sonnenRichtung: sDir.toArray(), zeit: t, sonnenStaerke: 30 * (1 - grau) * (1 - nah * 0.6), glanz: 0.6 * (1 - grau * 0.8) + klar * 0.15,
      zenit: cTmp.set("#5E7DAE").lerp(cTmp2.set("#8C97A4"), grau).lerp(cTmp2.set("#5277AC"), klar * (1 - nah)).lerp(cTmp2.set("#C9D3DC"), nah * 0.8),
      horizont: new THREE.Color("#BCC5CF").lerp(new THREE.Color("#C9CED3"), grau).lerp(new THREE.Color("#C8D5E1"), klar).lerp(new THREE.Color("#EEF2F5"), nah),
      sonnenFarbe: new THREE.Color("#FFE9CC").lerp(new THREE.Color("#F6F8FF"), smoothstep(14, 30, t)), zirren: 0.45 * (1 - grau) });
    sonne.color.set("#FFE3C0").lerp(cTmp.set("#F2F5FF"), smoothstep(14, 30, t));
    sonne.intensity = 2.9 * (0.35 + 0.65 * (1 - grau)) * (1 - nah * 0.3);
    hemi.intensity = 0.85 + 0.3 * kalt; hemi.color.set("#C2CFE2").lerp(cTmp.set("#D5DEEA"), kalt); hemi.groundColor.set("#4A4A44").lerp(cTmp.set("#AEB6BF"), sn);
    szene.fog.color.copy(himmel.horizont);
    szene.fog.density = 3.0e-5 * (1 + grau * 0.5 + nah * 3) * (1 - klar * 0.25);
    uDunst.value.copy(himmel.horizont); uDunstF.value = 1 - nah * 0.5;
    // Stadt: Jahreszeit, Schnee, See, Licht in Fenstern, Versinken unter der Front
    stadt.setze(t, kam, { schnee: sn, schneeTiefe: E.schneeTiefe(t), seeEis: E.seeEis(t), herbst: smoothstep(14.4, 15.4, t) * (1 - sn), kahl: Math.min(1, sn * 1.1),
      fensterLicht: 0.02 + 0.12 * grau + 0.05 * kalt, himmel: himmel.horizont, sonneFarbe: himmel.u.sonnenFarbe.value.clone().multiplyScalar(som), sonneDir: sDir.toArray(),
      versenkt: versenkt(t) });
    // Eisschild: Lage (nah echt, fern verkleinert um das Auge → gleicher Sehwinkel), Turm kippt, sobald die Front ihn erreicht
    const D = E.eisrandKm(t), Dm = D * 1000;
    eis.visible = !drin && D < 140;
    const k = Dm > FERN ? FERN / Dm : 1; uK.value = k;
    eis.scale.setScalar(k); eis.position.set(0, AUGE[1] * (1 - k), -Dm * k);
    const st = eisLokal(TORONTO_HAFEN.turm.x, TORONTO_HAFEN.turm.z, D).s;
    stadt.turm.rotation.x = 0.32 * smoothstep(-20, 320, st); stadt.turm.position.y = -260 * smoothstep(250, 700, st);
    if (stadt.kuppel) { const sk = eisLokal(TORONTO_HAFEN.kuppel.x, TORONTO_HAFEN.kuppel.z, D).s; stadt.kuppel.scale.y = Math.max(0.001, 1 - smoothstep(-10, 200, sk)); }
    warnlicht.setze({ p: [TORONTO_HAFEN.turm.x, 556 - 260 * smoothstep(250, 700, st), TORONTO_HAFEN.turm.z + 553 * Math.sin(stadt.turm.rotation.x)], staerke: (Math.sin(t * 2.2 * Math.PI) > 0.4 ? 6 : 0.6) * (1 - smoothstep(0, 200, st)) });
    // Reif auf der Brüstung, Handlauf bereift
    const rf = smoothstep(30, 58, t);
    reifMat.opacity = 0.85 * rf;
    for (const [m, c0] of handlaufMats) m.color.copy(c0).lerp(cTmp.set("#E8EEF2"), rf * 0.55);
    // Puffs
    const wS = wolkenS(t).map((p) => ({ ...p, a: p.a * (1 - kalt) }));
    const wW = (kalt > 0.01 ? wolkenW(t).map((p) => ({ ...p, a: p.a * kalt * (1 - klar * 0.65) })) : []);
    puffs.setze(drin ? [] : [...wS, ...wW, ...stadt.puffs(t, kalt * (1 - nah)), ...frontPuffs(t), ...turmStaub(t), ...walze(t)], kam);
    // Teilchen
    const schneefall = Math.max(sn * (1 - klar) * 0.85, smoothstep(23, 26, t) * (1 - klar) * 0.5);
    flocken.setze(t, kam, { deckkraft: drin ? 0 : schneefall, wind: [0.6 + 1.5 * kalt, 0, 0.4] });
    glitzer.setze(t, kam, { deckkraft: drin ? 0 : 0.7 * klar * (1 - nah) });
    treiben.setze(t, kam, { deckkraft: drin ? 0 : 0.85 * smoothstep(54, 58, t), wind: [1.5, -0.6, 9 + 10 * nah] });
    kristalle.setze(t, kam, { deckkraft: drin ? 0.8 : 0, wind: [0.1, -0.05, 0.05] });
    brocken.setze(t);
    // Eisinneres
    innen.visible = drin; innen.position.copy(kam.position);
    innenU.hell.value = 0.25 + 0.75 * Math.exp(-E.eisUeberDir(t) / 700); innenU.zeit.value = t;
    // Nachbearbeitung
    const f = farben(t);
    const grauPost = sn * (1 - klar);
    Object.assign(welt.post, f, {
      saettigung: f.saettigung * (1 - grauPost * 0.2), belichtung: f.belichtung * (drin ? (0.55 + 0.45 * innenU.hell.value) : 1),
      tiefeNah: t > T_HIER ? 0.5 : 0, fokusNah: 2.6, vignette: 0, koernung: 0.008, tiltStaerke: 0,
    });
    return z;
  } };

  // ---------------------------------------------------------------- Text: Titel, Anzeige, Sätze, Abspann
  const TITEL = "Was wäre, wenn wir wieder in eine Eiszeit steuern?";
  const FAKT = "Toronto, vor 21.000 Jahren · 2 km Eis, weltweit nur 6 °C kälter";
  const SAETZE = [
    [4.8, "Spätsommer über Toronto.", 4.0], [9.5, "Der See glitzert, die Stadt summt.", 4.0], [14.2, "Dann werden die Sommer kürzer.", 4.0],
    [18.9, "Jeder Winter bringt mehr Schnee.", 4.0], [23.6, "Der Schnee bleibt im Sommer liegen.", 4.0], [28.3, "Der Ontariosee friert zu.", 4.0],
    [33.0, "Die Dächer verschwinden unter Schnee.", 4.0], [37.7, "Am Horizont erscheint eine weiße Linie.", 4.0], [42.4, "Sie wächst zu einer Wand aus Eis.", 4.0],
    [47.1, "Weltweit nur sechs Grad kälter.", 4.0], [51.8, "Die Wand ist höher als der Turm.", 4.0], [56.5, "Eiskalter Wind fegt über das Dach.", 3.4],
    [62.6, "Das Eis wird zwei Kilometer dick.", 3.4], [66.6, "So lag Toronto schon einmal unter Eis.", 3.3],
  ];
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige: E.anzeige, saetze: SAETZE });
  hud.glas({ t: T_HIER + 0.2, seed: 7, punkte: [[0.3, 0.8, 1], [0.74, 0.86, 0.75], [0.55, 0.62, 0.5]] });
  hud.flecken({ von: T_HIER + 0.3, bis: 71, anzahl: 20, art: "hell", seed: 5, wind: [10, 16] });

  const ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, linie: E.T.linie, p: E.P_FRONT, c: E.C_FRONT, gebaeude: stadt.nah.length + stadt.fern.length, baeume: stadt.baumListen.laub.length + stadt.baumListen.nadel.length };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
