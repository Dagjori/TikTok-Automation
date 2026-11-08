// Account 2 @stelldirvor.pov – „Was wäre, wenn unsere Luft 35 % Sauerstoff hätte?“ (Skript acc2-2026-11-08-mittag)
// Welt: engine/welt_waldbach.js (Erstbau 08.11.2026, Mischwald mit Bach und Lichtung). Rechnung: sim/sauerstoff_35.mjs.
// Bogen: Countdown ab Bild 0 (0:08 → 0:00), 8 s Anstieg (Licht wird klar und hart, Aufleuchten, Tonkante), 8–27 s 1 s = 5 Jahre
// (Mittag, Gewitterfront, Wetterleuchten, Regen, 19,9 s Blitz in die Fichte, Waldbrand jenseits des Bachs), 27–31 s Nacht mit Glut und Asche,
// 31 s Zeitraffersprung (1 s = 100.000 Jahre): heller Vormittag, Farne treiben aus, Libellen wachsen 11 → 70 cm, 46–50 s eine Riesenlibelle
// löst sich, 50–58 s Anflug in Echtzeit (Abstand 20 → 0,5 m, Schatten über der Lichtung), 58 s HIER, 60 s harter Schnitt in die Nahsicht,
// Landung auf dem Baumstumpf, Abblende 70–72 s, Abspann 72–80 s.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes, hash } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Himmel, Puffs, Partikel, Voegel, PovKamera, farbPhasen, Protokoll, wolkenFeld, blitzKurve } from "../../engine/stil_lunar_pov.js";
import { LunarHUD, zahlDE, uhrzeit } from "../../engine/lunar_hud.js";
import { Waldbach, Blitz, Lichtstrahlen, hoehe, bachZ, FICHTE, STUMPF, UFERPLATZ } from "../../engine/welt_waldbach.js";
import { countdown, sauerstoff, spannweite, abstand, T_EREIGNIS, T_HIER, T_SCHNITT } from "../../sim/sauerstoff_35.mjs";

const FPS = 30, DAUER = 80, TB = 19.9, T_CUT = T_SCHNITT;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Number(Q.get("schatten") ?? 4096);
const D2R = Math.PI / 180, L = ease.inOutSine;
const richtung = (yaw, pitch) => [Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R)];
const fr = (x) => x - Math.floor(x);
const K = (keys) => (t) => keyframes(keys.map(([tt, v, e]) => ({ t: tt, v, e: e || L })), t);
const farbe = (keys) => { const Cs = keys.map(([tt, c]) => [tt, new THREE.Color(c)]), o = new THREE.Color(); return (t) => { o.copy(Cs[0][1]); for (let i = 1; i < Cs.length; i++) { if (t <= Cs[i][0]) { const p = L(clamp((t - Cs[i - 1][0]) / (Cs[i][0] - Cs[i - 1][0]))); return o.copy(Cs[i - 1][1]).lerp(Cs[i][1], p); } o.copy(Cs[i][1]); } return o; }; };
const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// ---------------------------------------------------------------- Kamera
const gy = (x, z) => hoehe(x, z);
const A0 = [UFERPLATZ.x, gy(UFERPLATZ.x, UFERPLATZ.z) + 1.45, UFERPLATZ.z];      // am Ufer, Blick auf den Bach
const B = [0, gy(0, 0.6) + 1.62, 0.6];                                           // auf der Lichtung neben dem Baumstumpf
const POS = [{ t: 0, v: A0 }, { t: 5.5, v: A0 }, { t: 15, v: B, e: L }];
const ZIEL = [
  { t: 0, v: [-13.4, 1.0, bachZ(-13.4) - 6] }, { t: 5.5, v: [-13.0, 1.1, bachZ(-13) - 7] }, { t: 15, v: [-2.6, 8.5, FICHTE.z + 3] },
  { t: 19.6, v: [FICHTE.x + 0.8, 15, FICHTE.z] }, { t: 22, v: [FICHTE.x + 1.6, 12, FICHTE.z] }, { t: 27, v: [2.0, 7.0, FICHTE.z + 4] },
  { t: 30.4, v: [0.5, 5.0, FICHTE.z + 4] }, { t: 34.5, v: [-0.6, 1.6, -11] },
];
const FOV = [{ t: 0, v: 60 }, { t: 19.7, v: 60 }, { t: 21.9, v: 52 }, { t: 24, v: 52 }, { t: 29.5, v: 58 }, { t: 34.5, v: 60 }, { t: 54, v: 60 }, { t: 57.9, v: 66 }];
// Schwarm (35–50 s) und Riesenlibelle (46–60 s)
const schwarmMitte = (t) => [-0.4 + 1.3 * Math.sin(0.23 * t), 2.35 + 0.25 * Math.sin(0.41 * t), -4.6 + 0.8 * Math.sin(0.17 * t + 1)];
const DIR0 = norm([-0.42, 0.14, -1]), DIR1 = norm([0.04, 0.03, -1]);
function libelleSchwarm(i, t) {      // Kreisbahn um die Schwarmmitte, jede Libelle mit eigenem Radius, Takt und Höhe
  const m = schwarmMitte(t), r = 0.9 + 1.2 * hash(i, 71), w = (0.55 + 0.4 * hash(i, 72)) * (i % 2 ? 1 : -1), ph = hash(i, 73) * 6.28;
  const sprung = Math.sin(t * (1.7 + hash(i, 74)) + ph) * 0.25;
  return [m[0] + Math.cos(w * t + ph) * r + sprung, m[1] + 0.5 * Math.sin(0.9 * t + ph * 2) + 0.4 * (hash(i, 75) - 0.5), m[2] + Math.sin(w * t + ph) * r * 0.8];
}
function heldPos(t) {
  if (t < 46) return libelleSchwarm(0, t);
  const P20 = add(B, DIR0, 20);
  if (t < 50) { const a = libelleSchwarm(0, 46), p = L(clamp((t - 46) / 4)), m = [lerp(a[0], P20[0], p), lerp(a[1], P20[1], p) + 2.2 * Math.sin(Math.PI * p), lerp(a[2], P20[2], p)]; return m; }
  if (t < T_HIER) { const p = smoothstep(50, T_HIER, t), d = norm([lerp(DIR0[0], DIR1[0], p), lerp(DIR0[1], DIR1[1], p), lerp(DIR0[2], DIR1[2], p)]), A = abstand(t), wob = 0.35 * (1 - p);
    return add(add(B, d, A), [Math.sin(t * 1.3) * wob, Math.sin(t * 2.1) * wob * 0.5, 0]); }
  return add(add(B, DIR1, 0.78), [0.03 * Math.sin(t * 1.7), 0.04 * Math.sin(t * 2.3), 0]);
}
const augeBei = (t) => keyframes(POS, t);
function zielBei(t) {
  if (t < 34.5) return keyframes(ZIEL, t);
  const z0 = ZIEL[ZIEL.length - 1].v;
  if (t < 50) { const sm = [0, 0, 0]; for (let k = 0; k < 7; k++) { const s = schwarmMitte(t - 0.25 * k); sm[0] += s[0] / 7; sm[1] += s[1] / 7; sm[2] += s[2] / 7; }
    const zw = t < 46 ? sm : (() => { const h = heldPos(t), p = smoothstep(46, 49, t); return [lerp(sm[0], h[0], p * 0.75), lerp(sm[1], h[1], p * 0.75), lerp(sm[2], h[2], p * 0.75)]; })();
    const p = smoothstep(34.5, 37.5, t); return [lerp(z0[0], zw[0], p), lerp(z0[1], zw[1], p), lerp(z0[2], zw[2], p)]; }
  const h = heldPos(t), sm = schwarmMitte(49), w = smoothstep(49, 51, t);
  const zw = (() => { const hh = heldPos(Math.min(t, 49)); const s0 = [lerp(sm[0], hh[0], 0.75), lerp(sm[1], hh[1], 0.75), lerp(sm[2], hh[2], 0.75)]; return s0; })();
  return [lerp(zw[0], h[0], w), lerp(zw[1], h[1], w) - 0.02, lerp(zw[2], h[2], w)];
}
// nach dem Schnitt: Nahsicht am Baumstumpf (Blick nach +x/−z, Sonne im Gegenlicht)
const S_OBEN = () => [STUMPF.x, gy(STUMPF.x, STUMPF.z) - 0.06 + STUMPF.h + 0.02, STUMPF.z];
const C2a = () => add(S_OBEN(), [-1.25, 0.62, 1.12]), C2b = () => add(S_OBEN(), [-0.98, 0.52, 0.88]);
const SCHWEBE = () => add(S_OBEN(), [0.02, 0.34, 0.05]);

// ---------------------------------------------------------------- Tageslauf, Himmel, Licht
const SONNE_YAW = K([[0, -62], [8, -60], [12, -20], [18, 0], [27, 10], [30.2, 10], [31.6, -62], [46, -30], [50, -14], [58, -12], [70, -4]]);
const SONNE_EL = K([[0, 15], [8, 17], [12, 42], [18, 50], [27, 30], [30.2, 30], [31.6, 34], [46, 46], [50, 32], [58, 28], [70, 22]]);
const NACHT = (t) => smoothstep(25.5, 27.5, t) * (1 - smoothstep(30.2, 31.6, t));
const STURM = (t) => smoothstep(11.5, 18.5, t) * (1 - smoothstep(27, 30.5, t));
const zenitF = farbe([[0, "#6E8DBE"], [8, "#6C90C6"], [12, "#5D8ACB"], [16, "#56698A"], [19.5, "#2C3240"], [26, "#24242C"], [27.5, "#0A1022"], [30.2, "#0A1022"], [31.6, "#5C8ECF"], [46, "#5E8ECC"], [52, "#6A86B8"], [70, "#6D80AE"]]);
const horizontF = farbe([[0, "#F2D7B2"], [8, "#EED9BE"], [12, "#DCE4EA"], [16, "#A9AFB4"], [19.5, "#55555A"], [22, "#7A4A30"], [26, "#6E3A22"], [27.5, "#1A1E30"], [30.2, "#28263A"], [31.6, "#DCE6EE"], [46, "#E2E8EC"], [52, "#F2D6AA"], [70, "#F6C68E"]]);
const sonneF = farbe([[0, "#FFD39A"], [8, "#FFE6C0"], [12, "#FFF4E0"], [18, "#E8ECF2"], [27, "#B8C6E8"], [30.2, "#B8C6E8"], [31.6, "#FFF2DC"], [46, "#FFEED4"], [52, "#FFD9A0"], [70, "#FFC27A"]]);
const laubF = farbe([[0, "#4E7C2E"], [31.6, "#4E7C2E"], [34, "#4A8030"], [70, "#4E7C2E"]]), laub2F = farbe([[0, "#6A8F34"], [70, "#6E9638"]]);
const grasF = farbe([[0, "#6F9440"], [12, "#709A42"], [19, "#5E7A40"], [31.6, "#78A044"], [52, "#7C9A40"], [70, "#86A042"]]), gras2F = farbe([[0, "#8AA648"], [70, "#9CAE4E"]]);
const nebelD = K([[0, 6.0e-4], [8, 5.5e-4], [10, 5.0e-4], [14, 5.5e-4], [19.5, 9.0e-4], [26, 1.0e-3], [30.2, 8.0e-4], [31.6, 4.2e-4], [46, 4.0e-4], [52, 5.0e-4], [70, 5.5e-4]]);
const WIND = K([[0, 0.8], [8, 1.0], [12, 1.1], [18, 2.6], [20, 2.4], [27, 1.4], [30, 0.6], [31.6, 0.9], [52, 0.8], [60, 0.7], [70, 0.6]]);

async function start() {
  aktiviereHoehenNebel({ abfall: 0.004, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#E8DCC6", 9e-4);
  const kam = new THREE.PerspectiveCamera(60, 1080 / 1920, 0.05, 60000);
  const welt0 = new Waldbach(szene, { schatten: SCHATTEN > 0, nahZelle: Number(Q.get("zelle") || 0.35) });
  const himmel = new Himmel(szene, { radius: 30000, zenit: "#6E8DBE", horizont: "#F2D7B2", unten: "#5A6A4A", sonnenRichtung: richtung(-42, 11), sonnenStaerke: 30, glanz: 0.8, zirren: 0.25, dunst: 0.25 });
  const pov = new PovKamera(kam, { pos: A0, ziel: ZIEL[0].v, fov: 60 }).atmen({ staerke: 1.0 }).stoss({ t: TB + 0.05, staerke: 0.35, abkling: 0.9 });

  const hemi = new THREE.HemisphereLight("#C8D8EC", "#4A5A2E", 0.95);
  const sonne = new THREE.DirectionalLight("#FFE8C8", 2.6);
  if (SCHATTEN > 0) { sonne.castShadow = true; sonne.shadow.mapSize.set(SCHATTEN, SCHATTEN); Object.assign(sonne.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 600 }); sonne.shadow.bias = -0.0004; sonne.shadow.normalBias = 0.05; }
  const feuerL = new THREE.PointLight("#FF7A2A", 0, 90, 1.4), feuerL2 = new THREE.PointLight("#FF8A3A", 0, 70, 1.4);
  szene.add(hemi, sonne, sonne.target, feuerL, feuerL2);
  const wolkenP = new Puffs(szene, { max: 700, schatten: 0.45, nebel: false });
  const sturmP = new Puffs(szene, { max: 700, schatten: 0.25, renderOrder: 9, nebel: false });
  const flammenP = new Puffs(szene, { max: 1100, additiv: true, schatten: 1, renderOrder: 14 });
  const rauchP = new Puffs(szene, { max: 500, schatten: 0.5, renderOrder: 13 });
  const nebelP = new Puffs(szene, { max: 160, schatten: 0.9, renderOrder: 12 });
  const regen = new Partikel(szene, { art: "regen", anzahl: 2600, box: [30, 18, 30], seed: 4 });
  const asche = new Partikel(szene, { art: "asche", anzahl: 1600, box: [26, 12, 26], seed: 8, farbe: "#8A8580", groesse: 0.05, fall: 0.35 });
  const funken = new Partikel(szene, { art: "funken", anzahl: 1400, box: [56, 22, 34], seed: 9 });
  const pollen = new Partikel(szene, { art: "eis", anzahl: 900, box: [6, 3, 6], seed: 12, farbe: "#FFD890", groesse: 0.012, fall: -0.05, wirbel: 0.25, wind: [0.15, 0.02, 0.05] });
  const staubLicht = new Partikel(szene, { art: "eis", anzahl: 1200, box: [24, 10, 24], seed: 13, farbe: "#FFE7B8", groesse: 0.02, fall: 0.02, wirbel: 0.35, wind: [0.2, 0, 0] });
  const voegel = new Voegel(szene, { anzahl: 14, seed: 41, farbe: "#24221F", spannweite: 0.42 }).schwarm({ zentrum: [-6, 16, -34], radius: 16, hoehe: 4, tempo: 7, anzahl: 14 });
  const blitz = new Blitz(szene, { ziel: welt0.FICHTE_SPITZE, hoehe: 95, seed: 7 });
  const strahlen = new Lichtstrahlen(szene, { anzahl: 18, seed: 5 });
  const sterne = (() => { const n = 1400, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = hash(i, 1) * 6.283, z = 0.06 + 0.94 * hash(i, 2), r = Math.sqrt(1 - z * z); p.set([Math.cos(a) * r * 25000, z * 25000, Math.sin(a) * r * 25000], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({ color: "#FFFFFF", size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    const o = new THREE.Points(g, m); o.renderOrder = -900; szene.add(o); return o; })();
  const wolkenA = wolkenFeld({ anzahl: 14, bereich: { x: [-9000, 9000], z: [-16000, -3000] }, hoehe: [1100, 1700], groesse: 700, farbe: "#FFFFFF", a: 0.85, wind: [10, 3], seed: 21 });
  // Gewitter: Ambosswolke am Horizont, die wächst, und eine tiefe Wolkendecke, die heranzieht
  const ZB = [{ x: -700, z: -2600 }];
  const turm = Array.from({ length: 70 }, (_, i) => ({ u: (hash(i, 51) - 0.5) * 2, v: hash(i, 52), w: (hash(i, 53) - 0.5), r: 0.5 + 0.5 * hash(i, 54), dreh: hash(i, 55) * 6.28, bild: i % 4 }));
  const decke = Array.from({ length: 170 }, (_, i) => ({ x: (hash(i, 61) - 0.5) * 2600, z: -120 - hash(i, 62) * 2400, y: 380 + 300 * hash(i, 63), r: 170 + 260 * hash(i, 64), dreh: hash(i, 65) * 6.28, bild: i % 4 }));
  function sturmPuffs(t, blitzHell) {
    const s = STURM(t); if (s < 0.01) return [];
    const out = [], wachs = smoothstep(10.5, 19, t), dunkel = smoothstep(14, 20, t);
    for (const q of turm) {
      const H = 900 + 2800 * wachs, y = 700 + q.v * H, breite = 500 + 1100 * smoothstep(0.7, 1, q.v) * wachs;    // Amboss oben breit
      const hell = lerp(1.05, 0.55, dunkel) * (0.45 + 0.6 * q.v) + blitzHell * 0.4;
      out.push({ p: [ZB[0].x + q.u * breite + 30 * t, y, ZB[0].z + q.w * 500], r: (300 + 300 * q.r) * (0.6 + 0.4 * wachs), dreh: q.dreh, farbe: [hell * 0.95, hell * 0.95, hell], a: 0.95 * s, licht: 1, bild: q.bild });
    }
    const zug = smoothstep(12.4, 19, t);
    for (const q of decke) {
      const z = q.z - 2600 * (1 - zug) + 40 * (t - 12);
      if (z > 300) continue;
      const hell = lerp(0.55, 0.2, dunkel) * (0.8 + 0.3 * hash(q.dreh * 100, 5)) + blitzHell * (0.25 + 0.35 * hash(q.dreh * 100, 3));
      out.push({ p: [q.x + 30 * t, q.y, z], r: q.r, dreh: q.dreh + 0.01 * t, farbe: [hell, hell * 1.0, hell * 1.06], a: 0.92 * s * smoothstep(12.4, 15.5, t), licht: 0.85, bild: q.bild });
    }
    return out;
  }
  function nebelPuffs(t) {
    const a = 0.09 * (1 - smoothstep(7.6, 10, t)); if (a < 0.01) return [];
    const out = [];
    for (let i = 0; i < 26; i++) { const x = -40 + 36 * fr(hash(i, 81) + t * 0.012), z = bachZ(x) + (hash(i, 82) - 0.5) * 2.4, y = 0.2 + 0.35 * hash(i, 83); out.push({ p: [x, y, z], r: 1.6 + 1.6 * hash(i, 84), dreh: hash(i, 85) * 6 + t * 0.05, farbe: [0.98, 0.95, 0.9], a: a * (0.5 + 0.5 * hash(i, 86)), licht: 0.9, bild: i % 4 }); }
    return out;
  }

  // ---------------------------------------------------------------- Zustände
  const blitzHell = (t) => Math.max(blitzKurve(t, TB, { anstieg: 0.02, halten: 0.06, abkling: 0.18 }), 0.8 * blitzKurve(t, TB + 0.16, { anstieg: 0.02, halten: 0.05, abkling: 0.2 }), 0.6 * blitzKurve(t, TB + 0.34, { anstieg: 0.02, halten: 0.04, abkling: 0.35 }));
  const wetterleuchten = (t) => 0.55 * blitzKurve(t, 15.6, { anstieg: 0.03, halten: 0.08, abkling: 0.3 }) + 0.45 * blitzKurve(t, 17.7, { anstieg: 0.03, halten: 0.06, abkling: 0.25 }) + 0.3 * blitzKurve(t, 24.6, { anstieg: 0.03, halten: 0.05, abkling: 0.3 });
  const brand = (t) => smoothstep(TB, TB + 1.6, t) * (1 - 0.65 * smoothstep(26, 28.5, t)) * (1 - smoothstep(30.2, 31.4, t));
  const fichteZ = (t) => ({ feuer: smoothstep(TB, TB + 0.7, t) * (1 - 0.7 * smoothstep(24.5, 27.5, t)) * (1 - smoothstep(30.2, 31.2, t)), kohle: smoothstep(TB + 1, 26, t), weg: smoothstep(32, 34.5, t) });
  const farben = farbPhasen([
    { t: 0, werte: { belichtung: 1.0, saettigung: 0.92, kontrast: 1.03, tonung: [1.08, 1.0, 0.88], tonungStaerke: 0.3, bloomStaerke: 1.1 } },
    { t: 7.9, werte: { belichtung: 1.0, saettigung: 0.92, kontrast: 1.03, tonung: [1.08, 1.0, 0.88], tonungStaerke: 0.3, bloomStaerke: 1.1 } },
    { t: 9.0, werte: { belichtung: 1.05, saettigung: 1.02, kontrast: 1.12, tonung: [1.0, 1.0, 1.0], tonungStaerke: 0.08, bloomStaerke: 1.0 } },
    { t: 14, werte: { belichtung: 0.95, saettigung: 0.86, kontrast: 1.06, tonung: [0.94, 0.98, 1.06], tonungStaerke: 0.28, bloomStaerke: 1.0 } },
    { t: 19.5, werte: { belichtung: 0.92, saettigung: 0.76, kontrast: 1.06, tonung: [0.9, 0.95, 1.08], tonungStaerke: 0.35, bloomStaerke: 1.15 } },
    { t: 22, werte: { belichtung: 0.9, saettigung: 1.08, kontrast: 1.08, tonung: [1.14, 0.92, 0.74], tonungStaerke: 0.42, bloomStaerke: 1.45 } },
    { t: 27.5, phase: "nacht", werte: { belichtung: 0.78, saettigung: 0.9, tonung: [0.88, 0.9, 1.1], tonungStaerke: 0.4, bloomStaerke: 1.45 } },
    { t: 30.2, phase: "nacht", werte: { belichtung: 0.78, saettigung: 0.9, tonung: [0.88, 0.9, 1.1], tonungStaerke: 0.4, bloomStaerke: 1.45 } },
    { t: 31.6, werte: { belichtung: 1.05, saettigung: 1.02, kontrast: 1.04, tonung: [1.0, 1.02, 0.97], tonungStaerke: 0.14, bloomStaerke: 1.05 } },
    { t: 46, werte: { belichtung: 1.04, saettigung: 1.02, kontrast: 1.04, tonung: [1.02, 1.0, 0.95], tonungStaerke: 0.18, bloomStaerke: 1.05 } },
    { t: 53, werte: { belichtung: 1.03, saettigung: 1.05, kontrast: 1.05, tonung: [1.12, 0.98, 0.82], tonungStaerke: 0.36, bloomStaerke: 1.22 } },
    { t: 59.99, werte: { belichtung: 1.03, saettigung: 1.05, kontrast: 1.05, tonung: [1.12, 0.98, 0.82], tonungStaerke: 0.36, bloomStaerke: 1.22 } },
    { t: 60.01, werte: { belichtung: 1.06, saettigung: 1.06, kontrast: 1.04, tonung: [1.14, 0.98, 0.8], tonungStaerke: 0.4, bloomStaerke: 1.3 } },
    { t: 70, werte: { belichtung: 1.04, saettigung: 1.04, kontrast: 1.03, tonung: [1.14, 0.98, 0.8], tonungStaerke: 0.4, bloomStaerke: 1.3 } },
  ]);

  // ---------------------------------------------------------------- Protokoll (Effekte mit Klang, Kamera, Schnitt)
  const prot = new Protokoll();
  prot.effekt(0.6, "wind_im_farn", { klang: "windstoss", staerke: 0.25 }).effekt(1.6, "libellen_am_bach", { klang: "fluegel", staerke: 0.35 }).effekt(3.0, "bach_glitzert", { klang: false })
    .effekt(5.5, "voegel_kreisen", { klang: false }).effekt(T_EREIGNIS, "sauerstoff_steigt", { klang: "zischen", staerke: 0.7, dauer: 2 }).effekt(T_EREIGNIS, "licht_wird_hart", { klang: "windstoss", staerke: 0.5 })
    .effekt(10.5, "zeitraffer_wolken", { klang: false }).effekt(12.4, "gewitterfront", { klang: "grollen", staerke: 0.5, dauer: 4 }).effekt(13.2, "voegel_fliehen", { klang: "fluegel", staerke: 0.4 })
    .effekt(15.6, "blitz_wetterleuchten", { klang: "donner", staerke: 0.35 }).effekt(16.5, "regen", { klang: false }).effekt(17.7, "blitz_wetterleuchten", { klang: "donner", staerke: 0.4 })
    .effekt(TB, "blitz", { klang: "blitz", staerke: 1 }).effekt(TB + 0.25, "donnerschlag", { klang: "donner", staerke: 1 }).effekt(TB + 0.4, "fichte_brennt", { klang: "zischen", staerke: 0.5, dauer: 3 })
    .effekt(22.5, "feuer_im_unterholz", { klang: "windstoss", staerke: 0.5, dauer: 3 }).effekt(24.6, "blitz_wetterleuchten", { klang: "donner", staerke: 0.3 }).effekt(27.0, "nacht_glut", { klang: false })
    .effekt(28.0, "asche_faellt", { klang: false }).effekt(31.0, "zeitsprung", { klang: "windstoss", staerke: 0.4, dauer: 2.5 }).effekt(31.5, "farne_treiben_aus", { klang: false })
    .effekt(35.0, "libellen_wachsen", { klang: "fluegel", staerke: 0.4 }).effekt(40.0, "libellen_40cm", { klang: "fluegel", staerke: 0.5 }).effekt(44.5, "lichtstrahlen", { klang: false })
    .effekt(46.6, "riesenlibelle_loest_sich", { klang: "fluegel", staerke: 0.6 }).effekt(50.0, "anflug", { klang: "fluegel", staerke: 0.6 }).effekt(54.4, "schatten_ueber_lichtung", { klang: "fluegel", staerke: 0.8 })
    .effekt(57.2, "fluegel_nah", { klang: "fluegel", staerke: 1 }).effekt(T_HIER, "hier", { klang: "windstoss", staerke: 0.9, dauer: 2 })
    .effekt(63.4, "landung", { klang: "fluegel", staerke: 0.5 }).effekt(65.5, "pollen_treiben", { klang: false });
  prot.melde({ t: 6, typ: "kamera", art: "fahrt", dauer: 9, text: "langsame Fahrt vom Bach zurück auf die Lichtung, Blick hebt sich zum Waldrand", klang: false })
    .melde({ t: 15, typ: "kamera", art: "schwenk", dauer: 4.6, text: "Blick zur hohen Fichte unter der Gewitterfront", klang: false })
    .melde({ t: 19.7, typ: "kamera", art: "zoom", dauer: 2.2, von: 60, bis: 52, text: "kurzer Zoom auf den Blitzeinschlag", klang: false })
    .melde({ t: 22, typ: "kamera", art: "schwenk", dauer: 5, text: "Schwenk folgt dem Feuer durchs Unterholz", klang: false })
    .melde({ t: 30.4, typ: "kamera", art: "schwenk", dauer: 4.1, text: "Blick sinkt auf die austreibenden Farne", klang: false })
    .melde({ t: 34.5, typ: "kamera", art: "schwenk", dauer: 15.5, text: "ruhiger Schwenk mit den kreisenden Libellen", klang: false })
    .melde({ t: 50, typ: "kamera", art: "schwenk", dauer: 8, text: "Schwenk folgt der anfliegenden Riesenlibelle", klang: false })
    .melde({ t: 54, typ: "kamera", art: "zoom", dauer: 3.9, von: 60, bis: 66, text: "Blickwinkel öffnet sich, Libelle füllt das Bild", klang: false })
    .melde({ t: T_CUT, typ: "schnitt", grund: "Höhepunkt: harter Schnitt in die Nahsicht am Baumstumpf", klang: false })
    .melde({ t: T_CUT, typ: "kamera", art: "fahrt", dauer: 10, text: "langsame Fahrt auf den Baumstumpf zu, Landung", klang: false });

  // ---------------------------------------------------------------- Libellen je Bild
  function libellenListe(t) {
    const out = [], spann = spannweite(t) / 100;
    if (t < 13.5) {           // Morgen: Königslibellen (11 cm) jagen über dem Bach
      const vis = 1 - smoothstep(12, 13.4, t);
      for (let i = 0; i < 6; i++) {
        let u = t + hash(i, 31) * 10, k = 0; const lang = (n) => 1.2 + 1.4 * hash(n + i * 31, 32); while (u > lang(k) && k < 60) { u -= lang(k); k++; }
        const pk = (n) => { const x = A0[0] - 3.4 + lerp(-2.0, 2.0, hash(n + i * 31, 33)); return [x, 0.25 + 0.8 * hash(n + i * 31, 34), bachZ(x) + lerp(-1.0, 2.2, hash(n + i * 31, 35))]; };
        const a = pk(k), b = pk(k + 1), p = smoothstep(0, 0.3, u / lang(k));
        const pos = [lerp(a[0], b[0], p), lerp(a[1], b[1], p) + 0.03 * Math.sin(13 * t + i), lerp(a[2], b[2], p)];
        const yaw = Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
        out.push({ p: pos, yaw, pitch: 0.05, spann: 0.11 * (0.85 + 0.25 * hash(i, 36)) * vis, amp: 0.55, freq: 9.3 + i * 0.4, basis: 0.1, ph: i * 1.3 });
      }
      return out;
    }
    if (t < 31.5) return out;
    const n = 9, auf = smoothstep(31.5, 33.5, t);
    for (let i = 0; i < n; i++) {
      const held = i === 0 && t >= 46;
      const p = held ? heldPos(t) : libelleSchwarm(i, t);
      const q = held ? heldPos(t + 0.06) : libelleSchwarm(i, t + 0.06);
      let yaw = Math.atan2(-(q[2] - p[2]), q[0] - p[0]), pitch = clamp((q[1] - p[1]) * 6, -0.3, 0.3);
      if (held && t > 52) { const d = [B[0] - p[0], B[1] - p[1], B[2] - p[2]]; const yw = Math.atan2(-d[2], d[0]) + 0.75 * smoothstep(55, 58.5, t); yaw = lerp(yaw, yw, smoothstep(52, 55, t)); pitch = lerp(pitch, 0.1, smoothstep(52, 55, t)); }
      const s = held ? spann : spann * (0.8 + 0.2 * hash(i, 41));
      const gleit = 0.55 + 0.45 * smoothstep(-0.3, 0.6, Math.sin(t * 0.8 + i * 1.7));
      const amp = lerp(0.55, 0.42, smoothstep(0.11, 0.7, s)) * gleit, freq = lerp(9, 4.2, smoothstep(0.11, 0.7, s)) + 0.3 * hash(i, 42);
      out.push({ p, yaw, pitch, roll: 0.15 * Math.sin(t * 0.7 + i), spann: s * auf, amp, freq, basis: 0.08, ph: i * 1.9 });
    }
    return out;
  }
  function heldNah(t) {        // nach dem Schnitt: schwebt neben dem Stumpf, landet 63–65,5 s, ruht
    const o = S_OBEN(), sch = SCHWEBE(), p = smoothstep(63, 65.5, t);
    const land = [o[0] + 0.02, o[1] + 0.055, o[2] + 0.04];
    const pos = [lerp(sch[0], land[0], p) + 0.03 * Math.sin(t * 1.9) * (1 - p), lerp(sch[1], land[1], ease.inOutCubic(p)) + 0.035 * Math.sin(t * 2.6) * (1 - p), lerp(sch[2], land[2], p)];
    const ruhe = smoothstep(65, 66.5, t);
    return { p: pos, yaw: lerp(-0.55, -0.62, p), pitch: lerp(0.1, 0.0, p), roll: 0.04 * Math.sin(t * 1.3) * (1 - p), spann: 0.7, amp: lerp(0.42, 0.035, ruhe), freq: lerp(4.2, 2.6, ruhe), basis: lerp(0.06, -0.02, ruhe), ph: 0 };
  }

  // ---------------------------------------------------------------- Welt pro Bild
  const sV = new THREE.Vector3(), cT = new THREE.Color(), cT2 = new THREE.Color();
  const welt = { szene, kamera: kam, post: {}, update(t) {
    const nah = t >= T_CUT;
    pov.fov = keyframes(FOV, Math.min(t, 59.99));
    if (!nah) { pov.posKeys = [{ t: 0, v: augeBei(t) }]; pov.zielKeys = [{ t: 0, v: zielBei(t) }]; }
    else { const p = smoothstep(T_CUT, 70, t); const a = C2a(), b = C2b(); pov.fov = 46; pov.posKeys = [{ t: 0, v: [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)] }]; const h = heldNah(t).p; pov.zielKeys = [{ t: 0, v: [h[0] + 0.1, h[1] - 0.12, h[2] - 0.1] }]; }
    pov.atmenS = nah ? 0.6 : 1.0;
    const z = pov.anwenden(t);
    himmel.folge(kam);
    const nacht = NACHT(t), sturm = STURM(t), bl = blitzHell(t), wl = wetterleuchten(t), br = brand(t);
    const sd = richtung(SONNE_YAW(t), SONNE_EL(t)), mond = richtung(-25, 34);
    const zen = zenitF(t).clone(), hor = horizontF(t).clone();
    if (bl + wl > 0.001) { zen.lerp(cT.set("#8A90C0"), clamp(bl * 0.45 + wl * 0.4)); hor.lerp(cT.set("#B8B8D8"), clamp(bl * 0.5 + wl * 0.3)); }
    const sichtSonne = (1 - sturm) ** 2 * (1 - nacht);
    himmel.setze({ zenit: zen, horizont: hor, unten: hor.clone().multiplyScalar(0.55), sonnenRichtung: nacht > 0.5 ? mond : sd, sonnenFarbe: sonneF(t),
      sonnenStaerke: nacht > 0.5 ? 4 * nacht : 30 * sichtSonne, glanz: lerp(0.85, 0.2, Math.max(sturm, nacht)), zirren: 0.25 * (1 - sturm) });
    szene.fog.color.copy(hor).lerp(cT.set("#9AA4A8"), sturm * 0.3); if (br > 0.01) szene.fog.color.lerp(cT.set("#6A3A22"), br * 0.35 * (1 - nacht * 0.5));
    szene.fog.density = nebelD(t);
    // Licht
    const L0 = nacht > 0.5 ? mond : sd; sV.set(...L0).normalize();
    const zentrum = nah ? new THREE.Vector3(...S_OBEN()) : kam.position.clone().add(new THREE.Vector3(0, 0, -16));
    const engS = !nah && t > 49 && t < 58.5;          // Anflug: kleiner Schattenbereich vor der Kamera (ferne Bäume werfen dann keinen Schatten auf die Lichtung)
    if (engS) zentrum.set(B[0], gy(B[0], B[2] - 5), B[2] - 5);
    const sc = sonne.shadow.camera, gr = engS ? 11 : nah ? 8 : 42; if (sc.right !== gr) { Object.assign(sc, { left: -gr, right: gr, top: gr, bottom: -gr }); sc.updateProjectionMatrix(); }
    sonne.position.copy(zentrum).addScaledVector(sV, 220); sonne.target.position.copy(zentrum); sonne.target.updateMatrixWorld();
    const elF = smoothstep(2, 14, SONNE_EL(t));
    sonne.color.copy(sonneF(t)); if (nacht > 0.01) sonne.color.lerp(cT.set("#7E94C8"), nacht);
    const anflugL = smoothstep(49, 51, t) * (1 - smoothstep(57.5, 59, t));
    sonne.intensity = lerp(3.1 * elF * (1 - 0.82 * sturm), 0.3, nacht) + 3.5 * bl + 1.0 * wl + 0.7 * anflugL;
    hemi.intensity = lerp(lerp(1.35, 1.05, sturm), 0.3, nacht) + 0.8 * bl + 0.3 * wl + (nah ? 0.15 : 0) - 0.3 * anflugL;
    hemi.color.copy(zen).lerp(cT.set("#E0E6EE"), 0.45); hemi.groundColor.set(t > 31.6 ? "#4E6030" : "#3E4A2A");
    // Feuerlicht
    const fz = fichteZ(t), fdir = norm([0.5, 0, 0.62]), R = clamp((t - TB) * 7, 0, 40);
    feuerL.position.set(FICHTE.x + 2, gy(FICHTE.x, FICHTE.z) + 2.5, FICHTE.z + 9); feuerL.intensity = 28 * fz.feuer * (0.85 + 0.15 * Math.sin(t * 13));
    feuerL2.position.set(FICHTE.x + fdir[0] * R, gy(FICHTE.x, FICHTE.z) + 3, FICHTE.z + fdir[2] * R * 0.6); feuerL2.intensity = 160 * br * (0.8 + 0.2 * Math.sin(t * 17 + 1));
    // Welt
    const glutLicht = [1.0 * br * 0.5 + 0.3 * fz.feuer, 0.35 * br * 0.5 + 0.1 * fz.feuer, 0.06 * br * 0.5];
    welt0.setze(t, kam, { wind: WIND(t), laub: laubF(t), laub2: laub2F(t), gras: grasF(t), gras2: gras2F(t), TB, brandAn: t > TB ? 1 : 0, erholt: smoothstep(31.8, 36, t), glutS: lerp(1, 0.75, smoothstep(26, 28, t)) * (1 - smoothstep(30.3, 31.2, t)),
      farnNeu: smoothstep(30.8, 35.5, t), zenit: zen, horizont: hor, sonne: L0, sonneF: sonneF(t), glitzer: (1 - sturm) * (1 - nacht) * (t < 12 ? 1.25 : t > 48 ? 1.2 : 0.8),
      wasserHell: lerp(lerp(1, 0.5, sturm), 0.2, nacht) + bl * 0.6, regen: smoothstep(16.3, 17.5, t) * (1 - smoothstep(20.5, 22, t)), glutLicht,
      waldR: cT2.set("#2E4A2A").lerp(cT.set("#0A0E12"), Math.max(nacht, sturm * 0.6)), fichteZ: fz });
    welt0.libellen.setze(t, nah ? [heldNah(t)] : libellenListe(t), { sonne: sd, sonneF: sonneF(t), hell: lerp(lerp(1, 0.55, sturm), 0.25, nacht) });
    blitz.setze(kam, bl);
    strahlen.setze(t, kam, sd, (t < 12 ? 1.25 * (1 - smoothstep(9, 12, t)) : 0) + (t > 31.6 && !nah ? 0.75 * smoothstep(31.6, 34, t) : 0) + (t > 46 && !nah ? 0.35 * smoothstep(46, 52, t) : 0) + (nah ? 0.6 : 0), sonneF(t));
    // Vögel: kreisen am Morgen, fliehen vor dem Gewitter
    const flucht = Math.max(0, t - 12.6);
    voegel.mesh.visible = t < 17; voegel.mesh.position.set(flucht * flucht * 4.5, flucht * 3, -flucht * 6); voegel.setze(t);
    sterne.material.opacity = nacht * 0.85 * (1 - smoothstep(26, 28.5, t) * 0) * smoothstep(27.5, 29.5, t); sterne.rotation.y = 0.004 * t;
    // Wolken: schöner Morgen, Zeitraffer jagt sie, Gewitter, klarer Vormittag, goldener Nachmittag
    const tw = t < 8 ? t * 0.6 : t < 27 ? 4.8 + (t - 8) * 9 : t < 31.6 ? 175 + (t - 27) * 2 : 184 + (t - 31.6) * 14;
    const wHell = lerp(lerp(1, 0.55, sturm), 0.12, nacht);
    const wA = 0.9 * (1 - sturm) * (1 - nacht * 0.9);
    const warm = smoothstep(46, 56, t) + (t < 9 ? 1 - smoothstep(6, 10, t) : 0);
    const wl1 = wA > 0.01 ? wolkenA(tw).map((w) => ({ ...w, a: w.a * wA, farbe: [1.0, lerp(1.0, 0.86, warm), lerp(1.0, 0.72, warm)].map((c) => c * wHell) })) : [];
    wolkenP.setze(wl1, kam);
    sturmP.setze(sturmPuffs(t, bl + wl), kam);
    flammenP.setze(t > TB && t < 31.5 ? welt0.flammen(t, TB, { staerke: lerp(1, 0.4, smoothstep(26, 28.5, t)) * (1 - smoothstep(30.2, 31.2, t)), fichte: fz.feuer }) : [], kam);
    rauchP.setze(t > TB && t < 33 ? welt0.rauch(t, TB, { staerke: (1 - smoothstep(29.5, 31.4, t)) * (1 - nacht * 0.4) }) : [], kam);
    nebelP.setze(nebelPuffs(t), kam);
    regen.setze(t, kam, { deckkraft: 0.42 * smoothstep(16.3, 17.5, t) * (1 - smoothstep(20.2, 21.8, t)) * (nah ? 0 : 1), wind: [2.2, 0, 0.6] });
    asche.setze(t, kam, { deckkraft: 0.75 * smoothstep(26.5, 28.5, t) * (1 - smoothstep(32.6, 34.2, t)), wind: [0.5, 0, 0.3] });
    funken.setze(t, kam, { zentrum: [FICHTE.x + 8, gy(FICHTE.x, FICHTE.z) + 6, FICHTE.z + 3], deckkraft: smoothstep(TB + 0.3, TB + 1.4, t) * (1 - smoothstep(28, 30.6, t)), wind: [1.6, 0, 0.4] });
    pollen.setze(t, kam, { zentrum: nah ? add(S_OBEN(), [-0.2, 0.4, 0.2]) : [0, 0, 0], deckkraft: nah ? 0.9 * smoothstep(61, 64, t) : 0 });
    staubLicht.setze(t, kam, { zentrum: [kam.position.x, kam.position.y, kam.position.z - 10], deckkraft: (t < 10 ? 0.6 * (1 - smoothstep(8, 10, t)) : 0) + (t > 31.6 && !nah ? 0.45 * smoothstep(31.6, 34, t) : 0) });
    const fp = farben(t), auf = Math.exp(-Math.max(0, t - T_EREIGNIS) / 0.6) * smoothstep(7.85, 8.0, t);
    const sprung = smoothstep(30.6, 31.0, t) * (1 - smoothstep(31.0, 31.8, t));
    Object.assign(welt.post, fp, { belichtung: fp.belichtung * (1 + 0.22 * auf + 0.45 * bl + 0.18 * wl + 0.25 * sprung + (nah ? 0.12 : 0)), bloomStaerke: fp.bloomStaerke + 0.15 * bl + 0.4 * auf,
      vignette: 0, koernung: 0.008, tiltStaerke: 0, tiefeNah: 0, tiefeFern: nah ? 0.9 : 0, fokusFern: 2.2, schleier: [0.98, 0.96, 0.92], schleierStaerke: Math.max(fp.schleierStaerke, 0.12 * sprung) });
    if (Q.has("ohnebloom")) welt.post.bloomStaerke = 0;
    return z;
  } };

  // ---------------------------------------------------------------- Text (1:1 aus dem Skript)
  const TITEL = "Was wäre, wenn unsere Luft 35 % Sauerstoff hätte?";
  const FAKT = "KARBON, VOR RUND 300 MIO. JAHREN · SCHÄTZUNGEN BIS 35 % SAUERSTOFF · LIBELLEN MIT BIS ZU 70 CM SPANNWEITE";
  const S = [[4.8, "Ein stiller Morgen am Waldbach."], [8.4, "Dann steigt der Sauerstoff in der Luft."], [12.4, "Über dem Wald ziehen Gewitterwolken auf."], [16.2, "Ab 25 Prozent brennen auch feuchte Wälder leichter."],
    [19.8, "Dann schlägt ein Blitz in die Fichte."], [23.4, "Das Feuer frisst sich durchs feuchte Unterholz."], [27, "Der Anteil erreicht 35 Prozent."], [31, "Asche fällt, und die Farne treiben aus."],
    [35, "Dann wachsen die Libellen, Generation um Generation."], [39.8, "Ihre Flügel spannen 40 Zentimeter."], [46.8, "Dann spannen sie 60 Zentimeter."], [50.6, "Eine von ihnen hält auf dich zu."],
    [54.4, "Ihr Schatten gleitet über die Lichtung."], [63, "Sie landet auf dem Baumstumpf neben dir."], [66.8, "So ähnlich war die Luft vor 300 Millionen Jahren."]];
  const SAETZE = S.map(([t, text], i) => { const nxt = i + 1 < S.length ? S[i + 1][0] - 0.45 : 69.9; return [t, text, Math.min(4.2, nxt - t)]; });
  const anzeige = (t) => {
    if (t < T_EREIGNIS) return { etikett: "ANSTIEG IN", zahl: uhrzeit(countdown(t)), einheit: "", unter: t < 4 ? "LUFT HEUTE: 20,9 %" : "WALD AHNUNGSLOS", wert: countdown(t) };
    if (t < 30) { const o = sauerstoff(t); return { etikett: "SAUERSTOFF", zahl: zahlDE(o, 1), einheit: "%", unter: t < 14 ? "1 SEKUNDE = 5 JAHRE" : t < 20 ? "BRÄNDE NEHMEN ZU" : t < 27 ? "WALDBRAND" : "WIE IM KARBON", wert: o }; }
    if (t < 50) { const s = spannweite(t); return { etikett: "SPANNWEITE LIBELLE", zahl: zahlDE(s, 1), einheit: "cm", unter: t < 40 ? "1 SEKUNDE = 100.000 JAHRE" : t < 46 ? "GENERATION FÜR GENERATION" : "SO GROSS WIE EIN FALKE", wert: s }; }
    if (t < T_HIER) { const a = abstand(t); return { etikett: "ABSTAND", zahl: zahlDE(a, 1), einheit: "m", unter: t < 54 ? "ECHTZEIT" : "IM ANFLUG", wert: a }; }
    return { etikett: "ABSTAND", zahl: "HIER", einheit: "", unter: "70 CM SPANNWEITE", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE });
  hud.flecken({ von: 27.2, bis: 33.5, anzahl: 6, art: "dunkel", seed: 23, wind: [3, 2] });

  const ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, T_EREIGNIS, TB, vertices: welt0.vertices };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
