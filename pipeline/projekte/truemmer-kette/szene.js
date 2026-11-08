// Account 2 @stelldirvor.pov – „Was wäre, wenn im Orbit eine Trümmer-Kettenreaktion startet?“ (Skript acc2-2026-11-08-abend)
// Hochebene bei Nacht (Variante der Grundwelt engine/welt_sommerwiese.js: Wiese, Gräser, Sternenhimmel mit Milchstraße; Teich liegt hinter dir),
// Ich-Blick auf dem Rücken liegend, Gras und Felsen am unteren Bildrand. Die Orbit-Objekte (Satelliten, Trümmerwolken, Blitze, Sternschnuppen,
// Band) sind reine Funktionen von t auf einer Himmelskugel um die Kamera (R = 9 km, Tiefentest an, Gras und Felsen verdecken sie).
// Rechnung: sim/truemmer_kette.mjs (Zähler, Kollisionszeiten, Zeitraffer). Ereignis (Kollision 1) genau bei 8 s = Countdown-Null.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, PovKamera, farbPhasen, Protokoll } from "../../engine/stil_lunar_pov.js";
import { LunarHUD, zahlDE } from "../../engine/lunar_hud.js";
import { Sommerwiese, hoehe } from "../../engine/welt_sommerwiese.js";
import { GLSL_NOISE } from "../../engine/welt_feld_wald.js";
import * as S from "../../sim/truemmer_kette.mjs";

const FPS = 30, DAUER = 80, T_HIER = S.T_HIER, R = 9000;
const D2R = Math.PI / 180;
const richtung = (yaw, pitch) => new THREE.Vector3(Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R));
const fr = (x) => x - Math.floor(x);
const hz = (i, s) => fr(Math.sin(i * 127.1 + s * 311.7 + 1.7) * 43758.5453);       // deterministischer Zufall (Funktion von Index und Seed)

// ---------------------------------------------------------------- Geometrie des Himmels (alles Einheitsvektoren)
const P1 = richtung(10, 50);                               // Treffpunkt der ersten Kollision
const Q1 = richtung(100, 18);
const NB = new THREE.Vector3().crossVectors(P1, Q1).normalize();   // Normale der Trümmerbahn (Band)
const E1 = new THREE.Vector3().crossVectors(NB, P1).normalize();   // Laufrichtung entlang der Bahn
const drehe = (v, achse, w) => v.clone().applyAxisAngle(achse, w);
// Orte der 8 Kollisionen auf bzw. nahe der Bahn (Winkel entlang der Bahn und seitlich), im Bild verteilt
const KOLL_ORT = [[0, 0], [0.16, 0.05], [-0.2, -0.04], [0.3, 0.07], [-0.36, 0.0], [0.08, -0.08], [-0.1, 0.1], [0.42, -0.03]].map(([a, b], k) => {
  const p = drehe(P1, NB, a); return k === 0 ? P1.clone() : drehe(p, E1.clone().cross(p).normalize(), b);
});

/** Bahnphase (rad): Mittel der Zeitraffer-Stufen. Das Spreizen der Wolke entlang der Bahn folgt ihr; 1 Tag/s (12–24 s), danach 1 Jahr/s */
const phase = (t) => {
  const seg = [[8, 12, 0.12], [12, 24, 0.34], [24, 58, 0.21], [58, 80, 0.03]]; let s = 0;
  for (const [a, b, r] of seg) if (t > a) s += (Math.min(t, b) - a) * r;
  return s;
};
const himmelsWinkel = (t) => { const seg = [[12, 24, 0.42], [24, 58, 0.06], [58, 80, 0.01]]; let s = 0; for (const [a, b, r] of seg) if (t > a) s += (Math.min(t, b) - a) * r; return s; };
const POL = richtung(0, 46);                              // Himmelspol (Breite ≈ 46°)

// ---------------------------------------------------------------- Punktwolken (additive Sprites, Größe in Pixel der 1080er Leinwand)
const PUNKT_V = `attribute float aSize; attribute float aAlpha; attribute vec3 aCol; varying float vA; varying vec3 vC;
void main() { vA = aAlpha; vC = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize; }`;
const PUNKT_F = `varying float vA; varying vec3 vC;
void main() { vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0; if (d > 1.0 || vA <= 0.001) discard;
  float k = exp(-d * d * 5.5) * 0.85 + exp(-d * 18.0) * 0.6; gl_FragColor = vec4(vC * k * vA, 1.0); }`;
class Punkte {
  constructor(szene, n) {
    this.n = n; const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3); this.size = new Float32Array(n); this.alpha = new Float32Array(n); this.col = new Float32Array(n * 3);
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3)); g.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(this.alpha, 1)); g.setAttribute("aCol", new THREE.BufferAttribute(this.col, 3));
    const m = new THREE.ShaderMaterial({ vertexShader: PUNKT_V, fragmentShader: PUNKT_F, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, fog: false });
    this.mesh = new THREE.Points(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 1100; szene.add(this.mesh);
    this.i = 0; this.g = g;
  }
  start() { this.i = 0; }
  add(v, size, alpha, c) {
    if (this.i >= this.n || alpha <= 0.002) return;
    const i = this.i++, p = this.pos, hor = smoothstep(-0.02, 0.06, v.y);
    if (hor <= 0.001) { this.i--; return; }
    p[i * 3] = v.x * R; p[i * 3 + 1] = v.y * R; p[i * 3 + 2] = v.z * R; this.size[i] = size; this.alpha[i] = alpha * hor;
    this.col[i * 3] = c[0]; this.col[i * 3 + 1] = c[1]; this.col[i * 3 + 2] = c[2];
  }
  ende() { for (let i = this.i; i < this.n; i++) this.alpha[i] = 0; this.g.setDrawRange(0, Math.max(1, this.i)); for (const a of Object.values(this.g.attributes)) a.needsUpdate = true; }
  folge(kam) { this.mesh.position.copy(kam.position); }
}

// Band: leuchtendes Trümmerband auf der Bahn (Shader auf einer Kugel um die Kamera), schließt sich zum Ring; Schimmer läuft einmal herum
const BAND_V = `varying vec3 vDir; void main() { vDir = (modelMatrix * vec4(position, 0.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BAND_F = /* glsl */ `varying vec3 vDir; uniform vec3 uNB, uU, uV, uTint; uniform float uBand, uBogen, uSchimmer, uZeit, uBreite;
${GLSL_NOISE}
float wrap(float a) { return a - 6.2831853 * floor((a + 3.1415926) / 6.2831853); }
void main() {
  vec3 d = normalize(vDir);
  float b = asin(clamp(dot(d, uNB), -1.0, 1.0));
  float th = atan(dot(d, uV), dot(d, uU));
  float w = uBreite * (0.75 + 0.5 * nF(vec2(th * 3.0, 4.0 + uZeit * 0.02)));
  float kern = exp(-pow(b / w, 2.0)), hof = exp(-pow(b / (w * 3.2), 2.0));
  float koernig = 0.35 + 0.65 * pow(nN(vec2(th * 55.0, b * 260.0)), 1.6) + 0.35 * nF(vec2(th * 9.0, b * 40.0 + uZeit * 0.3));
  float bogen = 1.0 - smoothstep(uBogen - 0.35, uBogen, abs(wrap(th)));
  float schim = exp(-pow(wrap(th - uSchimmer) / 0.42, 2.0));
  float v = (kern * koernig * 1.25 + hof * 0.35) * bogen * (0.55 + 1.4 * schim) * uBand;
  v *= smoothstep(-0.02, 0.18, d.y);
  gl_FragColor = vec4(uTint * v, 1.0);
}`;

async function start() {
  aktiviereHoehenNebel({ abfall: 0.0009, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: false, tiefe: false });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#0B1626", 2.0e-5);
  const kam = new THREE.PerspectiveCamera(52, 1080 / 1920, 0.1, 60000);
  const wiese = new Sommerwiese(szene, { schatten: false });
  const AUGE = [0, hoehe(0, 3.5) + 0.3, 3.5];
  const BLICK = [{ t: 0, v: [-4, 32] }, { t: 4.6, v: [-3, 33], e: ease.inOutSine }, { t: 8, v: [8, 47], e: ease.inOutSine }, { t: 12, v: [9, 46], e: ease.inOutSine },
    { t: 24, v: [-3, 52], e: ease.inOutSine }, { t: 50, v: [8, 50], e: ease.inOutSine }, { t: 58.5, v: [11, 74], e: ease.inOutSine }, { t: 59.97, v: [11, 74.5], e: ease.linear },
    { t: 60.0, v: [-14, 58], e: ease.linear }, { t: 70, v: [-7, 55], e: ease.inOutSine }];
  const FOV = [{ t: 0, v: 52 }, { t: 7.4, v: 52 }, { t: 12, v: 34, e: ease.inOutSine }, { t: 24, v: 62, e: ease.inOutSine }, { t: 50, v: 66, e: ease.inOutSine }, { t: 58.5, v: 58, e: ease.inOutSine },
    { t: 59.97, v: 58, e: ease.linear }, { t: 60.0, v: 80, e: ease.linear }, { t: 70, v: 76, e: ease.inOutSine }];
  const zielBei = (t) => { const [y, p] = keyframes(BLICK, t), d = richtung(y, p); return [AUGE[0] + d.x * 1000, AUGE[1] + d.y * 1000, AUGE[2] + d.z * 1000]; };
  const pov = new PovKamera(kam, { pos: AUGE, ziel: zielBei(0), fov: 52 }).atmen({ staerke: 0.8 })
    .beben({ von: 50, bis: 60, staerke: 0.09, frequenz: 3.4, anstieg: 5, abkling: 0.6 }).stoss({ t: S.KOLL_ZEITEN[0], staerke: 0.35, abkling: 0.8 })
    .stoss({ t: T_HIER, staerke: 0.8, abkling: 1.4 });

  // ---------------------------------------------------------------- Licht
  const hemi = new THREE.HemisphereLight("#35487F", "#1B2A1A", 0.6);
  const horizontLicht = new THREE.DirectionalLight("#FF9B66", 0);
  horizontLicht.position.copy(richtung(0, 6)).multiplyScalar(-1).multiplyScalar(-2000);
  const mond = new THREE.DirectionalLight("#8CA2DA", 0.35);
  mond.position.copy(richtung(120, 50)).multiplyScalar(2000);
  szene.add(hemi, horizontLicht, horizontLicht.target, mond);

  // ---------------------------------------------------------------- Felsen am unteren Bildrand (Hochebene)
  const felsMat = new THREE.MeshStandardMaterial({ color: "#40414A", roughness: 0.96, metalness: 0, flatShading: true });
  const felsen = [[-0.85, 1.45, 0.62, 0.34, 1], [0.95, 1.2, 0.5, 0.3, 2], [0.2, 0.75, 0.24, 0.16, 3], [-0.25, 2.0, 0.34, 0.2, 4], [1.9, 1.0, 0.7, 0.4, 5], [-2.0, 0.9, 0.55, 0.36, 6]];
  for (const [x, dz, r, h, sd] of felsen) {
    const g = new THREE.IcosahedronGeometry(r, 2), p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) { const k = 0.78 + 0.45 * hz(i * 0.37 + p.getX(i) * 9.1 + p.getY(i) * 5.3, sd); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * (h / r) * 0.85, p.getZ(i) * k); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, felsMat); const wz = AUGE[2] - dz; m.position.set(AUGE[0] + x, hoehe(AUGE[0] + x, wz) - 0.06, wz); m.rotation.y = sd * 1.7; szene.add(m);
  }

  // ---------------------------------------------------------------- Orbit-Objekte
  const NT = 1500, NK = S.KOLL_ZEITEN.length;
  const teile = [];                                        // Trümmerteile: je Kollision NT
  for (let k = 0; k < NK; k++) for (let i = 0; i < NT; i++) {
    const s = k * 977 + i, phi = hz(s, 1) * 6.2832, rr = 0.008 + 0.075 * Math.pow(hz(s, 2), 1.5);
    const tang = E1.clone().multiplyScalar(Math.cos(phi)).add(new THREE.Vector3().crossVectors(KOLL_ORT[k], E1).normalize().multiplyScalar(Math.sin(phi)));
    const ax = NB.clone().add(new THREE.Vector3(hz(s, 3) - 0.5, hz(s, 4) - 0.5, hz(s, 5) - 0.5).multiplyScalar(0.11)).normalize();
    teile.push({ k, tang, rr, ax, d: (hz(s, 6) - hz(s, 7)) * (0.55 + 0.45 * k / NK), hell: 0.3 + 0.7 * hz(s, 8), gr: 1.4 + 2.4 * Math.pow(hz(s, 9), 2), f: 1 + 4 * hz(s, 10), ph: hz(s, 11) * 40 });
  }
  const wolke = new Punkte(szene, NK * NT + 2000);
  const flashPunkte = new Punkte(szene, 200);
  const sats = [];                                         // Satelliten: 70 auf zufälligen Bahnen, Zerfall zwischen 26 und 50 s
  for (let j = 0; j < 70; j++) {
    const n = new THREE.Vector3(hz(j, 20) - 0.5, hz(j, 21) - 0.2, hz(j, 22) - 0.5).normalize(), v0 = richtung(-40 + 130 * hz(j, 23), 20 + 55 * hz(j, 24));
    const zug = j < 14;                                     // ein Satellitenzug (Kette dicht hintereinander)
    sats.push({ n: zug ? new THREE.Vector3(0.35, 0.2, 0.9).normalize() : n, v0: zug ? richtung(-30, 28) : v0, w: (zug ? 0.017 : 0.006 + 0.012 * hz(j, 25)) * (hz(j, 26) > 0.5 ? 1 : -1), off: zug ? j * 0.022 : 0,
      tf: 25.5 + 24 * Math.pow(hz(j, 27), 1.3), hell: 0.5 + 0.5 * hz(j, 28), zug });
  }
  const ST = new THREE.Vector3();
  const richtungU = new THREE.Vector3().crossVectors(NB, P1).normalize();
  const uA = E1.clone(), uB = E1.clone().applyAxisAngle(P1, 1.25);          // Anflugrichtungen der beiden Satelliten (unter ~70° gegeneinander)
  const satA = (t) => P1.clone().addScaledVector(uA, (S.T_EREIGNIS - t) * 0.052).normalize();
  const satB = (t) => P1.clone().addScaledVector(uB, (S.T_EREIGNIS - t) * 0.044).normalize();
  const meteore = [];
  for (let m = 0; m < 44; m++) {
    const u = m / 44, t0 = 13 + 55 * Math.pow(u, 0.8) + 0.9 * hz(m, 30);
    meteore.push({ t0, dauer: 0.5 + 0.5 * hz(m, 31), start: richtung(-45 + 110 * hz(m, 32), 24 + 55 * hz(m, 33)), dir: hz(m, 34) * 6.28, laenge: 0.12 + 0.2 * hz(m, 35), hell: 0.6 + 0.4 * hz(m, 36) });
  }

  const bandMat = new THREE.ShaderMaterial({ vertexShader: BAND_V, fragmentShader: BAND_F, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, fog: false,
    uniforms: { uNB: { value: NB.clone() }, uU: { value: P1.clone() }, uV: { value: E1.clone() }, uTint: { value: new THREE.Color("#8F7CFF") }, uBand: { value: 0 }, uBogen: { value: 0.6 }, uSchimmer: { value: 0 }, uZeit: { value: 0 }, uBreite: { value: 0.07 } } });
  const bandKugel = new THREE.Mesh(new THREE.SphereGeometry(20000, 48, 24), bandMat); bandKugel.renderOrder = 1050; bandKugel.frustumCulled = false; szene.add(bandKugel);

  // ---------------------------------------------------------------- Zustände je Zeit
  const K = (keys) => (t) => keyframes(keys.map(([tt, v, e]) => ({ t: tt, v, e: e || ease.inOutSine })), t);
  const dusk = K([[0, 0.8], [8, 0.62], [13, 0], [60, 0]]);
  const dawn = K([[0, 0], [16.5, 0], [21.5, 1], [24.5, 0.55], [28, 0]]);
  const puls = (t) => 0.07 * smoothstep(26, 30, t) * (1 - smoothstep(48, 52, t)) * Math.pow(Math.max(0, Math.sin(t * 1.3)), 2);
  const tagWert = (t) => clamp(dusk(t) + 0.62 * dawn(t) + puls(t), 0, 0.9);
  const violett = K([[0, 0], [24, 0], [26, 0.5], [44, 1], [70, 1]]);
  const bandHell = K([[0, 0], [44, 0], [50, 0.22], [55, 0.65], [59.4, 1.0], [60, 1.45], [62, 1.1], [70, 0.95]]);
  const bogen = K([[0, 0.2], [48, 0.25], [50, 0.9], [57, 2.1], [60, 3.3]]);
  const schimmer = (t) => (t < 60 ? -3 : -3.14 + (t - 60) * 0.9);
  const farbe = (keys) => { const C = keys.map(([tt, c]) => [tt, new THREE.Color(c)]), o = new THREE.Color(); return (t) => { o.copy(C[0][1]); for (let i = 1; i < C.length; i++) { if (t <= C[i][0]) { const p = ease.inOutSine(clamp((t - C[i - 1][0]) / (C[i][0] - C[i - 1][0]))); o.copy(C[i - 1][1]).lerp(C[i][1], p); return o; } o.copy(C[i][1]); } return o; }; };
  const zenitTag = farbe([[0, "#1B2F63"], [12, "#1B2F63"], [21, "#2A3B72"], [28, "#2A3B72"]]);
  const horizTag = farbe([[0, "#E58A55"], [8, "#D8764D"], [12, "#B05A4A"], [18, "#CB6F5F"], [22, "#F2A87A"], [28, "#C88A8A"]]);
  const nachtZ = farbe([[0, "#04081A"], [24, "#050A1C"], [34, "#150C2C"], [60, "#190E34"], [70, "#150C2C"]]);
  const nachtH = farbe([[0, "#0C1830"], [24, "#0D1A30"], [36, "#241236"], [60, "#2A1A44"], [70, "#241236"]]);
  const farben = farbPhasen([
    { t: 0, phase: "nacht", werte: { belichtung: 1.02, saettigung: 1.0, kontrast: 1.05, bloomStaerke: 1.15, tonungStaerke: 0.35 } },
    { t: 12, phase: "nacht", werte: { belichtung: 0.9, saettigung: 0.95, kontrast: 1.08, bloomStaerke: 1.3, tonungStaerke: 0.5 } },
    { t: 22, phase: "nacht", werte: { belichtung: 1.0, saettigung: 1.05, kontrast: 1.05, bloomStaerke: 1.2, tonungStaerke: 0.4 } },
    { t: 30, phase: "nacht", werte: { belichtung: 0.92, saettigung: 1.0, kontrast: 1.1, bloomStaerke: 1.35, tonungStaerke: 0.6, tonung: [0.95, 0.85, 1.15] } },
    { t: 56, phase: "nacht", werte: { belichtung: 0.95, saettigung: 1.05, kontrast: 1.1, bloomStaerke: 1.5, tonungStaerke: 0.6, tonung: [0.95, 0.85, 1.15] } },
    { t: 70, phase: "nacht", werte: { belichtung: 0.82, saettigung: 1.0, kontrast: 1.1, bloomStaerke: 1.4, tonungStaerke: 0.6, tonung: [0.95, 0.85, 1.15] } },
  ]);
  const blitzWeiss = (t) => { let w = 0; S.KOLL_ZEITEN.forEach((tk, k) => { const a = t - tk; if (a > -0.03 && a < 0.5) w = Math.max(w, (k === 0 ? 0.5 : 0.18) * Math.exp(-Math.max(0, a) / 0.12) * smoothstep(-0.03, 0.02, a)); });
    return Math.max(w, t > 59.5 && t < 62 ? 0.5 * Math.exp(-Math.max(0, t - 60) / 0.5) * smoothstep(59.5, 60, t) : 0); };

  // ---------------------------------------------------------------- Protokoll (Klang an genau diesen Stellen, atmo.py)
  const prot = new Protokoll();
  prot.effekt(1.2, "gras_im_wind", { klang: "windstoss", staerke: 0.3 })
    .effekt(2.6, "satellitenzug_zieht", { klang: false })
    .effekt(S.KOLL_ZEITEN[0], "kollision_blitz", { klang: "einschlag", staerke: 0.55 })
    .effekt(8.2, "truemmerfaecher", { klang: false })
    .effekt(15.5, "wolke_umrundet_die_erde", { klang: false })
    .effekt(20.0, "morgendaemmerung_splitter", { klang: false });
  S.KOLL_ZEITEN.slice(1).forEach((tk, i) => prot.effekt(tk, `kollision_${i + 2}`, { klang: "blitz", staerke: 0.35 + 0.04 * i }));
  prot.effekt(44.4, "sternschnuppen", { klang: false }).effekt(54.6, "band_schliesst_sich", { klang: false })
    .effekt(T_HIER, "ring_geschlossen", { klang: "einschlag", staerke: 0.95 });
  prot.melde({ t: 5, typ: "kamera", art: "schwenk", dauer: 3, text: "Schwenk zu den zwei Lichtpunkten (vor 8 s)", klang: false })
    .melde({ t: 7.4, typ: "kamera", art: "zoom", dauer: 4.6, von: 52, bis: 34, text: "Zoom auf den Treffpunkt 52° → 34° (szene.js setzt pov.fov je Bild)", klang: false })
    .melde({ t: 12, typ: "kamera", art: "zoom", dauer: 12, von: 34, bis: 62, text: "Zoom zurück 34° → 62°, Schwenk entlang der Trümmerspur", klang: false })
    .melde({ t: 24, typ: "kamera", art: "fahrt", dauer: 26, text: "ruhiger Weitwinkel mit leichter Drift", klang: false })
    .melde({ t: 50, typ: "kamera", art: "schwenk", dauer: 8.5, text: "Kamera kippt langsam in den Zenit (50–58,5 s)", klang: false })
    .melde({ t: 60, typ: "schnitt", grund: "Höhepunkt: Weitwinkel auf das geschlossene Band", klang: false });

  const col = new THREE.Color(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const rotM = new THREE.Matrix4(), rot3 = new THREE.Matrix3();
  const welt = { szene, kamera: kam, post: {}, update(t) {
    pov.fov = keyframes(FOV, t);
    pov.zielKeys = [{ t: 0, v: zielBei(t) }];
    const z = pov.anwenden(t);
    // Himmel (Funktion von t)
    rotM.makeRotationAxis(POL, himmelsWinkel(t)); rot3.setFromMatrix4(rotM);
    const tag = tagWert(t), vi = violett(t);
    wiese.setze(t, kam, { tag, zenit: zenitTag(t), horizont: horizTag(t), nachtZenit: nachtZ(t), nachtHorizont: nachtH(t), sterne: 0.95, galHell: 0.2, wolken: 0, wind: 0.8, rot: rot3,
      mond: { r: [0.3, -0.5, 0.8], hell: 0, dunkel: 0 }, insekten: 0, hell: 0.5 });
    hemi.intensity = 0.55 + 0.4 * dusk(t) + 0.25 * dawn(t) + 0.55 * smoothstep(40, 60, t); hemi.color.set("#35487F").lerp(col.set("#5A3E94"), vi * 0.6);
    horizontLicht.intensity = 1.6 * dusk(t) + 1.1 * dawn(t); horizontLicht.position.copy(richtung(0, 8)).multiplyScalar(2000); horizontLicht.target.position.set(AUGE[0], AUGE[1], AUGE[2] - 50);
    mond.intensity = 0.35 + 0.3 * vi * smoothstep(40, 60, t); szene.fog.color.copy(nachtH(t)).lerp(horizTag(t), tag);
    const duskVis = clamp(dusk(t) + dawn(t) * 0.9 + 0.22, 0, 1);          // Satelliten und große Teile leuchten im Sonnenlicht (Dämmerung); nachts nur schwach (stilisiert)

    // Satelliten
    flashPunkte.start(); wolke.start();
    const warm = [1.0, 0.92, 0.75];
    if (t < S.KOLL_ZEITEN[0]) {
      const a = satA(t), b = satB(t), nah = 1 + 2.2 * smoothstep(5, 8, t);
      wolke.add(a, 7.5 * (0.9 + 0.2 * nah), 1.0 * duskVis + 0.2, warm); wolke.add(b, 6.5 * (0.9 + 0.2 * nah), 1.0 * duskVis + 0.2, warm);
      wolke.add(tmp.copy(a).addScaledVector(uA, 0.012).normalize(), 3.4, 0.5, warm); wolke.add(tmp.copy(b).addScaledVector(uB, 0.012).normalize(), 3.0, 0.5, warm);
    }
    for (const s of sats) {
      if (t >= s.tf) { const a = t - s.tf; if (a < 0.45) flashPunkte.add(ST.copy(s.v0).applyAxisAngle(s.n, s.w * t + s.off), 26 * Math.exp(-a / 0.12) + 4, 0.7 * Math.exp(-a / 0.15), [0.8, 0.85, 1.0]); continue; }
      ST.copy(s.v0).applyAxisAngle(s.n, s.w * t + s.off);
      const blink = 0.78 + 0.22 * Math.sin(t * 3.1 + s.off * 80 + s.hell * 9);
      wolke.add(ST, s.zug ? 4.6 : 3.8 + 1.4 * s.hell, (s.zug ? 1.0 : 0.7 * s.hell + 0.3) * duskVis * blink, warm);
    }
    // Trümmerwolken
    const t0 = S.KOLL_ZEITEN[0], dpf = phase(t);
    const tint = [lerp(0.78, 1.0, vi), lerp(0.9, 0.66, vi), lerp(1.0, 1.0, vi)];
    for (let k = 0; k < NK; k++) {
      const tk = S.KOLL_ZEITEN[k]; if (t < tk) continue;
      const age = t - tk, e = 1 - Math.exp(-3.2 * age), dph = dpf - phase(tk);
      const bright = duskVis * 0.5 + 0.6;
      for (let i = 0; i < NT; i++) {
        const p = teile[k * NT + i], fade = smoothstep(0, 0.12, age) * (0.78 + 0.22 * Math.sin(t * p.f * 2.1 + p.ph)) * (p.hell * 0.75 + 0.1);
        tmp.copy(KOLL_ORT[k]).addScaledVector(p.tang, p.rr * e).normalize().applyAxisAngle(p.ax, dph * p.d);
        const stern = 1 + 0.7 * Math.pow(Math.max(0, Math.sin(t * p.f * 3.3 + p.ph * 1.7)), 12);   // Funkeln
        wolke.add(tmp, p.gr * 1.35 * (age < 0.6 ? 0.8 + 0.5 * (1 - age / 0.6) : 1), fade * bright * 0.95 * stern, tint);
      }
      // Schweife des Fächers (nur kurz nach der Kollision): Teile um Δt zurückgesetzt
      if (age < 1.6) for (let i = 0; i < 70; i++) {
        const p = teile[k * NT + i];
        for (let s = 1; s <= 5; s++) {
          const a2 = Math.max(0, age - s * 0.045), e2 = 1 - Math.exp(-3.2 * a2);
          tmp2.copy(KOLL_ORT[k]).addScaledVector(p.tang, p.rr * 2.2 * e2 * (k === 0 ? 1 : 0.6)).normalize();
          wolke.add(tmp2, 3.4 - 0.4 * s, 0.55 * (1 - s / 6) * Math.exp(-age / 0.9), [0.9, 0.95, 1.0]);
        }
      }
      // Blitz der Kollision
      if (age < 1.2) flashPunkte.add(KOLL_ORT[k], (k === 0 ? 230 : 120) * (0.35 + Math.exp(-age / 0.28)), (k === 0 ? 1.0 : 0.8) * Math.exp(-age / 0.3) * smoothstep(-0.02, 0.03, age), [1.0, 0.97, 0.95]);
    }
    // Sternschnuppen (verglühende Teile)
    for (const m of meteore) {
      const a = t - m.t0; if (a < 0 || a > m.dauer) continue;
      const p = a / m.dauer, kopf = ease.outQuad(p) * m.laenge, alpha = Math.sin(p * Math.PI);
      const ax = new THREE.Vector3().crossVectors(m.start, new THREE.Vector3(Math.cos(m.dir), 0.2, Math.sin(m.dir))).normalize();
      for (let s = 0; s < 14; s++) wolke.add(tmp.copy(m.start).applyAxisAngle(ax, kopf - s * 0.0085), 5.5 - 0.3 * s, alpha * m.hell * (1 - s / 15) * 1.1, [1.0, 0.92, 0.82]);
    }
    wolke.ende(); flashPunkte.ende(); wolke.folge(kam); flashPunkte.folge(kam); bandKugel.position.copy(kam.position);
    const bu = bandMat.uniforms; bu.uBand.value = bandHell(t); bu.uBogen.value = bogen(t); bu.uSchimmer.value = schimmer(t); bu.uZeit.value = t; bu.uBreite.value = 0.06 + 0.03 * smoothstep(44, 60, t);
    bu.uTint.value.set("#8D7CFF").lerp(col.set("#C9B8FF"), smoothstep(58, 62, t));
    const f = farben(t), w = blitzWeiss(t);
    Object.assign(welt.post, f, { schleier: [0.9, 0.92, 1], schleierStaerke: Math.max(f.schleierStaerke, w), belichtung: f.belichtung * (1 + 0.35 * w), vignette: 0, koernung: 0.01, tiltStaerke: 0 });
    return z;
  } };

  // ---------------------------------------------------------------- Text: Titel, Anzeige, Sätze, Abspann
  const TITEL = "Was wäre, wenn im Orbit eine Trümmer-Kettenreaktion startet?";
  const FAKT = "Sibirien, 2009 · zwei Satelliten kollidieren, über 2.000 erfasste Trümmer\nHeute 68.450 Objekte über 10 cm im Orbit";
  const SAETZE = [
    [4.8, "Abenddämmerung auf der Hochebene, du liegst im Gras.", 3.2], [8.4, "Dann treffen sich zwei Lichtpunkte.", 3.2], [12, "Aus zwei Satelliten werden Tausende Trümmer.", 3.4],
    [16, "Die Wolke zieht sich um die Erde.", 3.4], [20, "Am Morgen glitzern Splitter im Sonnenlicht.", 3.4], [24.4, "Dann trifft ein Splitter den nächsten Satelliten.", 3.4],
    [28.4, "Wieder blitzt es, wieder Tausende Teile.", 3.4], [32.4, "Jedes Teil wird zum nächsten Geschoss.", 3.4], [36.4, "Die Kollisionen folgen immer schneller aufeinander.", 3.4],
    [40.4, "Satellitenketten zerfallen über dir zu Splitterwolken.", 3.4], [44.4, "Sternschnuppen ziehen, alte Teile verglühen.", 4.4], [50.8, "Jetzt kreisen über 80.000 große Trümmer.", 3.4],
    [54.6, "Die Spuren schließen sich zu einem Band.", 3.8], [63, "Darüber leuchten die Sterne wie immer.", 3.4], [66.8, "Noch ist das nur ein Modell.", 3.2],
  ];
  const anzeige = (t) => {
    if (t < 8) return { etikett: "KOLLISION IN", zahl: S.countdownText(t), einheit: "", unter: t < 4 ? "ABENDDÄMMERUNG" : "ZWEI SATELLITEN AUF KURS", wert: 8 - t };
    if (t < 24) return { etikett: "TRÜMMER > 10 CM", zahl: zahlDE(S.truemmer(t)), einheit: "", unter: t < 12 ? "KOLLISION · 789 KM HOCH" : t < 18 ? "1 SEKUNDE = 1 TAG" : "WOLKE UMRUNDET DIE ERDE", wert: S.truemmer(t) };
    if (t < 50) return { etikett: "KOLLISIONEN", zahl: String(Math.max(1, S.kollisionen(t))), einheit: "", unter: t < 32 ? "1 SEKUNDE = 1 JAHR" : t < 38 ? "KETTENREAKTION" : "IMMER SCHNELLER", wert: Math.max(1, S.kollisionen(t)) };
    if (t < 58) return { etikett: "TRÜMMER > 10 CM", zahl: zahlDE(S.truemmer(t)), einheit: "", unter: t < 54 ? "NEUE TEILE ERFASST" : "BAND SCHLIESST SICH", wert: S.truemmer(t) };
    return { etikett: "TRÜMMER > 10 CM", zahl: "HIER", einheit: "", unter: "8 KOLLISIONEN", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE });
  const ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, kollisionen: S.KOLL_ZEITEN, vertices: wiese.vertices };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
