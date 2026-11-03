// Account 2 @stelldirvor.pov – „Was wäre, wenn der Mond der Erde immer näher käme?“ (Skript acc2-2026-11-03-abend)
// Nachtstrand am Atlantik (generisch, Portugal-ähnlich). Grundwelt engine/welt_nachtstrand.js (Erstbau).
// Die Entfernung zum Mond ist die Zeitachse (sim/mond_naeher.mjs: d(t), anzeige(t)); der Mond wächst in echter Winkelgröße (× 2,2 überhöht,
// damit die Scheibe am Anfang lesbar ist; das Verhältnis 384.400/d bleibt). Eine durchgehende Einstellung: Ruhe am Dünenfuß, langsamer
// Zoom auf den Mond (20–34 s), Rückzug auf den Dünenkamm (35–50 s), Blick hebt sich zum riesigen Mond (44–58 s), Beben, HIER bei 60 s.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes, hash } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Puffs, Partikel, PovKamera, farbPhasen, Protokoll } from "../../engine/stil_lunar_pov.js";
import { LunarHUD, zahlDE } from "../../engine/lunar_hud.js";
import { Nachtstrand } from "../../engine/welt_nachtstrand.js";
import * as S from "../../sim/mond_naeher.mjs";

const FPS = 30, DAUER = 80, T_HIER = 60;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const D2R = Math.PI / 180;
const richtung = (yaw, pitch) => [Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R)];
const MOND = richtung(9, 16.5);                       // Vollmond über dem Atlantik im Westen, rechts der Blickachse
const UEBERHOEHT = 1.9, R_MOND = 1737.4;
const mondWinkel = (t) => UEBERHOEHT * Math.asin(R_MOND / S.d(Math.min(t, 60)));
// Kamera-Plan (Grad): Ruhe 0–20 s, Zoom auf den Mond 20–34 s, Rückzug auf die Düne 35–50 s, Blick hebt sich 44–58 s
const BLICK = [{ t: 0, v: [2, -4] }, { t: 19, v: [2, -4] }, { t: 25, v: [-6, -8], e: ease.inOutSine }, { t: 30, v: [-4, -7], e: ease.inOutSine },
  { t: 36, v: [5, 2], e: ease.inOutSine }, { t: 44, v: [5, 3], e: ease.inOutSine }, { t: 52, v: [4.5, 6], e: ease.inOutSine }, { t: 58, v: [4.5, 8], e: ease.inOutSine }, { t: 70, v: [4, 9], e: ease.inOutSine }];
const FOV = [{ t: 0, v: 52 }, { t: 30, v: 52 }, { t: 36, v: 40, e: ease.inOutSine }, { t: 40, v: 40 }, { t: 44, v: 44, e: ease.inOutSine }, { t: 52, v: 50, e: ease.inOutSine }, { t: 70, v: 50 }];

async function start() {
  aktiviereHoehenNebel({ abfall: 0.0012, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#1E2C46", 5.5e-5);
  const kam = new THREE.PerspectiveCamera(52, 1080 / 1920, 0.1, 60000);
  const welt0 = new Nachtstrand(szene, { schatten: SCHATTEN > 0 });
  const A0 = welt0.augeStart, A1 = welt0.augeDuene;
  const POS = [{ t: 0, v: A0 }, { t: 35, v: A0 }, { t: 50, v: A1, e: ease.inOutSine }];
  const augeBei = (t) => keyframes(POS, t);
  const zielBei = (t) => { const [y, p] = keyframes(BLICK, t), d = richtung(y, p), a = augeBei(t); return [a[0] + d[0] * 1000, a[1] + d[1] * 1000, a[2] + d[2] * 1000]; };
  const pov = new PovKamera(kam, { pos: A0, ziel: zielBei(0), fov: 52 }).atmen({ staerke: 1 })
    .beben({ von: 55, bis: 60, staerke: 0.12, frequenz: 4.2, anstieg: 3.5, abkling: 0.7 })
    .stoss({ t: T_HIER, staerke: 0.8, abkling: 1.3 });

  const hemi = new THREE.HemisphereLight("#3A5378", "#2A2620", 0.5);
  const mond = new THREE.DirectionalLight("#C9D6F0", 0.5);
  mond.castShadow = SCHATTEN > 0; mond.shadow.mapSize.set(SCHATTEN || 1, SCHATTEN || 1);
  Object.assign(mond.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 10, far: 4000 });
  mond.shadow.bias = -0.0006; mond.shadow.normalBias = 0.6;
  szene.add(hemi, mond, mond.target);

  const puffs = new Puffs(szene, { max: 900, schatten: 0.55 });
  const glow = new Puffs(szene, { max: 220, additiv: true, renderOrder: 12 });
  const truemmerP = new Puffs(szene, { max: 420, nebel: false, schatten: 0.4, renderOrder: 8 });
  const truemmerG = new Puffs(szene, { max: 160, additiv: true, nebel: false, renderOrder: 9 });
  const gischtNah = new Partikel(szene, { art: "staub", anzahl: 1800, box: [30, 14, 30], seed: 41, groesse: 0.05, farbe: "#DCE6F0" });
  const sand = new Partikel(szene, { art: "staub", anzahl: 1400, box: [26, 4, 26], seed: 42, groesse: 0.03, farbe: "#B9AA8C" });

  // ---------------------------------------------------------------- Zustände je Zeit (aus dem Skript, siehe skript.json → bewegungsplan)
  const K = (keys) => (t) => keyframes(keys.map(([tt, v, e]) => ({ t: tt, v, e: e || ease.inOutSine })), t);
  const pegel = K([[0, 0], [18, 0.35], [22, 1.0], [28, 1.9], [31, 1.9], [35, -2], [40, -10], [44, -12], [57, -12.4], [60.5, -12.4], [64, 6.5], [70, 6.8]]);
  const unruhe = K([[0, 0.35], [10, 0.5], [20, 0.8], [26, 1.15], [31, 1.0], [36, 0.7], [44, 0.5], [56, 0.8], [60, 1.4], [66, 1.2], [70, 1.0]]);
  const wandFront = K([[0, -20000], [44, -7500], [48, -4200, ease.linear], [51, -2900, ease.linear], [54, -1800, ease.linear], [56, -1100, ease.linear], [57.5, -560, ease.linear], [58.5, -210, ease.linear], [59.3, -30, ease.outSine], [60.5, 60], [64, 140]]);
  const wandHoehe = K([[0, 0], [44, 0], [46.5, 45], [49, 90], [55, 100], [57, 85], [58.3, 45], [59.2, 22], [60.5, 18.5], [64, 0]]);
  const wind = K([[0, 0.35], [20, 0.5], [32, 0.7], [44, 0.9], [55, 1.2], [60, 1.6], [66, 1.0]]);
  const gischt = K([[0, 0.35], [20, 0.6], [26, 1.0], [31, 0.9], [36, 0], [60, 0], [62, 0.8], [70, 0.6]]);
  const risse = K([[0, 0], [53, 0], [56.5, 0.45], [59.8, 1]]);
  const staubRand = K([[0, 0], [55, 0], [57, 0.6], [60, 1], [64, 0.4], [70, 0.2]]);
  const bruch = K([[0, 0], [60, 0], [60.6, 0.12, ease.outCubic], [64, 0.55], [70, 1]]);
  const wolke = K([[0, 0], [60, 0], [60.3, 0.5, ease.outCubic], [63, 0.9], [70, 0.65]]);
  const band = K([[0, 0], [61.5, 0], [70, 0.85]]);
  const sterne = K([[0, 1], [20, 0.7], [32, 0.2], [40, 0], [63, 0], [70, 0.3]]);
  const blitz = (t) => t < 59.95 ? 0 : t < 60.1 ? (t - 59.95) / 0.15 : Math.exp(-(t - 60.1) / 0.45);
  const L = (t) => S.licht(S.d(Math.min(t, 60)));                      // Mondlicht-Faktor (D0/d)²
  const lichtK = (t) => Math.pow(L(t), 0.25) * (1 - 0.55 * smoothstep(60.2, 67, t)) + 0.6 * blitz(t);
  const farbe = (keys) => { const C = keys.map(([tt, c]) => [tt, new THREE.Color(c)]), o = new THREE.Color(); return (t) => { o.copy(C[0][1]); for (let i = 1; i < C.length; i++) { if (t <= C[i][0]) { const p = ease.inOutSine(clamp((t - C[i - 1][0]) / (C[i][0] - C[i - 1][0]))); return o.copy(C[i - 1][1]).lerp(C[i][1], p); } o.copy(C[i][1]); } return o; }; };
  const zenit = farbe([[0, "#060C1A"], [20, "#0A1530"], [32, "#10234A"], [44, "#1A3A70"], [55, "#1E3A68"], [60, "#24365A"], [66, "#1A2640"], [70, "#121A2C"]]);
  const horizont = farbe([[0, "#1A263E"], [20, "#223452"], [32, "#2E4670"], [44, "#46628E"], [55, "#4E6088"], [60, "#5A5E72"], [66, "#3E4252"], [70, "#2C3040"]]);
  const wasserTief = farbe([[0, "#040A11"], [32, "#0A1A28"], [44, "#16324A"], [60, "#18303F"], [70, "#0E1C26"]]);
  const wasserFlach = farbe([[0, "#0C222C"], [32, "#173B48"], [44, "#2A5866"], [60, "#2C5260"], [70, "#1A3440"]]);
  const mondFarbe = farbe([[0, "#E4EAF6"], [44, "#EEF1F7"], [56, "#F2EEE6"], [60, "#FFF2DE"], [64, "#E8E2D8"]]);
  const lichtF = farbe([[0, "#B9C9EA"], [32, "#C8D4EE"], [44, "#D8E0F0"], [58, "#E6E2DA"], [62, "#FFE8C8"], [66, "#C4CAD8"]]);
  const nebel = K([[0, 5e-5], [32, 5.5e-5], [44, 6e-5], [56, 6.5e-5], [62, 9e-5], [70, 8e-5]]);
  const farben = farbPhasen([
    { t: 0, phase: "nacht", werte: { belichtung: 1.05, saettigung: 0.85, kontrast: 1.06, tonungStaerke: 0.35, bloomStaerke: 1.05, bloomSchwelle: 0.85, schleierStaerke: 0.04 } },
    { t: 20, phase: "nacht", werte: { belichtung: 1.02, saettigung: 0.86, kontrast: 1.06, tonungStaerke: 0.32, bloomStaerke: 1.05, bloomSchwelle: 0.85, schleierStaerke: 0.04 } },
    { t: 32, phase: "nacht", werte: { belichtung: 0.98, saettigung: 0.85, kontrast: 1.05, tonungStaerke: 0.25, bloomStaerke: 1.0, bloomSchwelle: 0.9, schleierStaerke: 0.03 } },
    { t: 44, phase: "alltag", werte: { belichtung: 0.84, saettigung: 0.8, kontrast: 1.04, tonung: [0.9, 0.96, 1.08], tonungStaerke: 0.25, bloomStaerke: 1.0, bloomSchwelle: 0.95 } },
    { t: 56, phase: "alltag", werte: { belichtung: 0.85, saettigung: 0.8, kontrast: 1.06, tonung: [0.95, 0.97, 1.02], tonungStaerke: 0.2, bloomStaerke: 1.1, bloomSchwelle: 0.95 } },
    { t: 59.8, phase: "alltag", werte: { belichtung: 0.9, saettigung: 0.85, kontrast: 1.08, bloomStaerke: 1.3, bloomSchwelle: 0.9 } },
    { t: 63, phase: "nacht", werte: { belichtung: 0.95, saettigung: 0.75, kontrast: 1.08, tonungStaerke: 0.3, schleierStaerke: 0.04, bloomStaerke: 1.05 } },
    { t: 70, phase: "nacht", werte: { belichtung: 0.95, saettigung: 0.75, kontrast: 1.04, tonungStaerke: 0.35, schleierStaerke: 0.06, bloomStaerke: 1.0 } },
  ]);
  // höchste Wasserlinie bisher (nasser Sand), rein aus t
  const nassBis = (t) => { let m = 0.6; for (let x = 0; x <= t; x += 0.25) m = Math.max(m, pegel(x) + 0.6 * unruhe(x)); return m; };

  // ---------------------------------------------------------------- Boot: liegt im Sand, schwimmt auf, wird hinausgezogen, von der Flut zurückgeworfen
  const D = welt0.D, Tq = [-D[1], D[0]];
  const B0 = welt0.bootStart, H = (x, z) => welt0.hoehe(x, z);
  const B2 = [B0[0] + D[0] * 14 - Tq[0] * 6, B0[1] + D[1] * 14 - Tq[1] * 6];
  const uferF = (p) => p > -1.275 ? -p / 0.085 : 15 + (-1.275 - p) / 0.02;      // Abstand der Wasserlinie (m) bei Pegel p (sim. Grund)
  const bootXZ = (t) => {
    if (t < 24) return B0;
    const drift = [B0[0] + D[0] * 4 * smoothstep(24, 31, t), B0[1] + D[1] * 4 * smoothstep(24, 31, t)];
    let s = 0; for (let x = 31; x <= Math.min(t, 57); x += 0.25) s = Math.max(s, Math.min(172, uferF(pegel(x)) - 5));
    s *= smoothstep(31, 33, t);
    const raus = [drift[0] - D[0] * s + Tq[0] * s * 0.12, drift[1] - D[1] * s + Tq[1] * s * 0.12];
    if (t < 58.6) return raus;
    const k = ease.outCubic(clamp((t - 58.6) / 3.2));
    return [lerp(raus[0], B2[0], k) + 3 * Math.sin(t * 0.4) * smoothstep(61, 66, t), lerp(raus[1], B2[1], k)];
  };
  const wZust = (t) => ({ pegel: pegel(t), unruhe: unruhe(t), wandFront: wandFront(t), wandHoehe: wandHoehe(t) });
  const bootPose = (t) => {
    const [x, z] = bootXZ(t), w = wZust(t), g = H(x, z), wl = welt0.wasserHoehe(x, z, t, w);
    const f = smoothstep(g + 0.15, g + 0.7, wl);
    const y = Math.max(g - 0.15, wl - 0.5);
    const wild = smoothstep(58.4, 59, t) * (1 - smoothstep(61.5, 64, t));
    const gier = 0.35 + 0.5 * smoothstep(24, 31, t) - 0.9 * smoothstep(33, 39, t) + 1.4 * ease.outCubic(clamp((t - 58.6) / 3)) + 0.1 * Math.sin(t * 0.3) * f;
    const roll = lerp(0.17, 0.07 * Math.sin(t * 1.3) + 0.05 * Math.sin(t * 2.1 + 1), f) + wild * 0.35 * Math.sin(t * 3.3);
    const nick = f * (0.05 * Math.sin(t * 0.9 + 1)) + wild * 0.25 * Math.sin(t * 2.7 + 2);
    return { pos: [x, y, z], gier, roll: f < 0.5 && t > 36 && t < 58 ? 0.24 : roll, nick };
  };

  // ---------------------------------------------------------------- Trümmer des Mondes (Puffs in 7 km Entfernung, folgen der Kamera wie der Himmel)
  const md = new THREE.Vector3(...MOND).normalize(), e1 = new THREE.Vector3().crossVectors(md, new THREE.Vector3(0, 1, 0)).normalize(), e2 = new THREE.Vector3().crossVectors(e1, md);
  const nb = new THREE.Vector3().crossVectors(md, new THREE.Vector3(1, 0.42, -0.1).normalize()).normalize(), bandT = new THREE.Vector3().crossVectors(nb, md);
  const bandWinkel = Math.atan2(bandT.dot(e2), bandT.dot(e1));
  const TEILE = Array.from({ length: 260 }, (_, i) => ({ th: hash(i, 301) * 6.283, v: 0.5 + 1.6 * hash(i, 302) ** 1.4, gr: 0.02 + 0.06 * hash(i, 303) ** 2, z: (hash(i, 304) - 0.5) * 0.6,
    imBand: hash(i, 305) < 0.55, seite: hash(i, 306) < 0.5 ? 0 : Math.PI, quer: (hash(i, 307) - 0.5), ton: 0.32 + 0.22 * hash(i, 308), b: i % 4 }));
  const truemmer = (t, kp) => {
    const normal = [], hell = [];
    if (t < 60) return { normal, hell };
    const tau = t - 60, Rw = 7000 * Math.tan(mondWinkel(60)), C = new THREE.Vector3(...kp).addScaledVector(md, 7000), p = new THREE.Vector3();
    for (const [i, q] of TEILE.entries()) {
      const r = Rw * (0.55 + q.v * 1.6 * (1 - Math.exp(-tau / 3.2)) + q.v * 0.25 * tau) * (q.imBand ? 1 + 0.5 * smoothstep(62, 70, t) * q.v : 1);
      const th = q.imBand ? lerp(q.th, bandWinkel + q.seite + q.quer * 0.35, smoothstep(61.5, 69, t)) : q.th;
      p.copy(C).addScaledVector(e1, Math.cos(th) * r).addScaledVector(e2, Math.sin(th) * r).addScaledVector(md, q.z * Rw);
      const gr = Rw * q.gr * (1 + 0.4 * smoothstep(60, 63, t));
      const k = lichtK(t) * 0.18 + 0.12;
      normal.push({ p: p.toArray(), r: gr, dreh: q.th * 3 + tau * 0.3, farbe: [q.ton * k, q.ton * k * 0.97, q.ton * k * 0.92], a: 0.95 * smoothstep(60, 60.3, t), licht: 0.9, bild: q.b });
      if (i % 4 === 0) hell.push({ p: p.toArray(), r: gr * 0.7, farbe: [2.4, 1.3, 0.55].map((c) => c * Math.exp(-tau / 2.4)), a: 0.8, licht: 0, bild: q.b });
    }
    return { normal, hell };
  };

  // ---------------------------------------------------------------- Gischt der Flutwand (Krone) und beim Auflaufen
  const wandGischt = (t, w) => {
    const out = [];
    if (w.wandHoehe < 2) return out;
    const bricht = smoothstep(55.5, 58, t), auf = smoothstep(58.6, 59.4, t) * (1 - smoothstep(61.5, 64, t));
    for (let i = 0; i < 130; i++) {
      const v = -1600 + 3200 * (i + 0.5) / 130 + 15 * Math.sin(i * 7.1);
      const u = w.wandFront + 4 + 6 * hash(i, 401);
      const x = D[0] * u + Tq[0] * v, z = D[1] * u + Tq[1] * v;
      const r = (6 + w.wandHoehe * (0.22 + 0.3 * bricht)) * (0.6 + 0.8 * hash(i, 402));
      const y = -12.4 + w.wandHoehe * 0.92 + r * (0.2 + 0.5 * bricht) + 4 * Math.sin(t * 2 + i);
      out.push({ p: [x, Math.max(y, H(x, z) + r * 0.3), z], r, dreh: i + t * 0.4, farbe: [0.72, 0.78, 0.84].map((c) => c * (0.35 + 0.25 * lichtK(t))), a: 0.3 + 0.25 * bricht, licht: 0.9, bild: i % 4 });
    }
    if (auf > 0.01) for (let i = 0; i < 55; i++) {
      const v = -260 + 520 * hash(i, 411), tau = ((t - 58.6) + hash(i, 412) * 1.5);
      const u = Math.min(w.wandFront, 20) - 10 * hash(i, 413);
      const x = D[0] * u + Tq[0] * v, z = D[1] * u + Tq[1] * v, r = 5 + 14 * hash(i, 414);
      out.push({ p: [x, Math.max(H(x, z), w.pegel) + 2 + tau * (6 + 8 * hash(i, 415)), z], r: r * (0.6 + 0.5 * tau), dreh: i, farbe: [0.7, 0.76, 0.82].map((c) => c * (0.4 + 0.25 * lichtK(t))), a: 0.38 * auf, licht: 0.9, bild: i % 4 });
    }
    return out;
  };

  // ---------------------------------------------------------------- Protokoll (Klang an genau diesen Stellen, atmo.py)
  const prot = new Protokoll();
  prot.effekt(9.5, "mond_waechst", { klang: false, text: "Mondscheibe wächst, Licht wird heller" })
    .effekt(19.0, "brandung_hoeher", { klang: "gischt", staerke: 0.5 })
    .effekt(22.2, "wasser_steigt", { klang: "gischt", staerke: 0.6, dauer: 3 })
    .effekt(24.5, "boot_schwimmt", { klang: false })
    .effekt(26.8, "harte_schatten", { klang: false })
    .effekt(28.0, "welle_duenenfuss", { klang: "gischt", staerke: 0.7 })
    .effekt(33.5, "moewen_fliehen", { klang: "fluegel" })
    .effekt(34.0, "meer_weicht", { klang: "zischen", dauer: 6, staerke: 0.6 })
    .effekt(39.0, "boot_liegt_trocken", { klang: false })
    .effekt(45.0, "flutwand_horizont", { klang: "grollen", dauer: 8, staerke: 0.5 })
    .effekt(53.2, "risse_mond", { klang: "zischen", staerke: 0.4, dauer: 3 })
    .effekt(55.0, "beben", { klang: "grollen", dauer: 5, staerke: 0.8 })
    .effekt(57.0, "flutwand_bricht", { klang: "gischt", staerke: 1.0, dauer: 2 })
    .effekt(59.0, "flut_trifft_strand", { klang: "druckwelle", staerke: 0.8 })
    .effekt(T_HIER, "mond_zerbricht", { klang: "einschlag", staerke: 1.0 })
    .effekt(T_HIER + 0.4, "truemmerwolke", { klang: "truemmer", dauer: 3, staerke: 0.6 })
    .effekt(T_HIER + 1.5, "tinnitus", { dauer: 8 })
    .effekt(62.5, "truemmerband", { klang: false });
  prot.melde({ t: 20, typ: "kamera", art: "zoom", dauer: 14, von: 52, bis: 40, text: "Zoom über die Brennweite 52° → 40° auf den Mond, Blick hebt sich auf +3°", klang: false })
    .melde({ t: 35, typ: "kamera", art: "fahrt", dauer: 15, text: "Rückzug vom Dünenfuß auf den Dünenkamm (Brennweite zurück auf 50°)", klang: false })
    .melde({ t: 44, typ: "kamera", art: "schwenk", dauer: 13, text: "Blick neigt sich nach oben zum Mond (+3,5° → +9°)", klang: false });

  const mDir = new THREE.Vector3(...MOND), cT = new THREE.Color(), lat = new THREE.Vector3();
  const welt = { szene, kamera: kam, post: {}, update(t) {
    pov.fov = keyframes(FOV, t);
    pov.posKeys = [{ t: 0, v: augeBei(t) }];
    pov.zielKeys = [{ t: 0, v: zielBei(t) }];
    const z = pov.anwenden(t);
    const kp = kam.position.toArray();
    const R = mondWinkel(t), lk = lichtK(t);
    welt0.himmel.setze({ zenit: zenit(t), horizont: horizont(t), unten: cT.copy(horizont(t)).multiplyScalar(0.55), sterne: sterne(t), mondDir: MOND, mondR: R,
      mondHell: 1.3 - 0.35 * smoothstep(30, 56, t), halo: 0.4 * Math.pow(L(t), 0.15) * (1 - 0.6 * smoothstep(60.5, 66, t)), mondFarbe: mondFarbe(t),
      risse: risse(t), bruch: bruch(t), staubRand: staubRand(t), wolke: wolke(t), band: band(t), blitz: blitz(t), zeit: t });
    const w = wZust(t);
    welt0.setze(t, kam, { ...w, nassBis: nassBis(t), wind: wind(t), mondDir: MOND, mondFarbe: mondFarbe(t), himmelFarbe: cT.copy(horizont(t)).lerp(zenit(t), 0.35),
      licht: 0.55 + 0.45 * lk, tief: wasserTief(t), flach: wasserFlach(t), strahl: 0.75 * (1 - smoothstep(30, 42, t)) + 0.2 });
    const bp = bootPose(t); welt0.setzeBoot(bp.pos, bp.gier, bp.roll, bp.nick);
    welt0.boot.updateMatrixWorld(true); lat.set(0.7, 3.9, 0); welt0.boot.localToWorld(lat);
    const fw = new THREE.Vector3(...zielBei(t)).sub(kam.position).setY(0).normalize();
    mond.position.copy(kam.position).addScaledVector(mDir, 1500); mond.target.position.copy(kam.position).addScaledVector(fw, 55); mond.target.updateMatrixWorld();
    mond.color.copy(lichtF(t)); mond.intensity = 0.5 * lk;
    hemi.intensity = 0.5 * Math.pow(L(t), 0.2) * (1 - 0.4 * smoothstep(60.5, 67, t)); hemi.color.copy(zenit(t)).lerp(cT.set("#8CA0C4"), 0.5);
    szene.fog.color.copy(horizont(t)); szene.fog.density = nebel(t);
    const wp = welt0.puffs(t, { wolken: 1 - 0.5 * smoothstep(40, 50, t), wolkenFarbe: [0.07, 0.085, 0.12].map((c) => c * (0.6 + 0.9 * lk)), mondNah: [0.42, 0.46, 0.55].map((c) => c * (0.6 + 0.5 * lk)), mondDir: MOND,
      gischt: gischt(t), gischtFarbe: [0.55, 0.6, 0.66].map((c) => c * (0.5 + 0.4 * lk)), lichter: 1 - 0.85 * smoothstep(58.5, 60, t), laterne: lat.toArray(), laterneAn: 1 - smoothstep(58.8, 59.4, t), lampe: 1 - smoothstep(59, 60, t), kamPos: kp });
    puffs.setze([...wp.normal, ...wandGischt(t, w)], kam);
    glow.setze(wp.glow, kam);
    const tr = truemmer(t, kp);
    truemmerP.setze(tr.normal, kam); truemmerG.setze(tr.hell, kam);
    gischtNah.setze(t, kam, { deckkraft: 0.55 * smoothstep(58.8, 59.8, t) * (1 - smoothstep(64, 68, t)), wind: [-1.5, 2.2, 3.5] });
    sand.setze(t, kam, { zentrum: [kp[0], kp[1] - 1.2, kp[2] - 6], deckkraft: 0.4 * smoothstep(40, 52, t) * (1 - smoothstep(59, 61, t)), wind: [1.8 + 2 * wind(t), 0.2, 2.6 * wind(t)] });
    const f = farben(t);
    Object.assign(welt.post, f, { belichtung: f.belichtung * (1 + 0.25 * blitz(t)), vignette: 0, koernung: 0.008, tiltStaerke: 0, unschaerfe: f.unschaerfe + 0.15 * blitz(t) });
    return z;
  } };

  // ---------------------------------------------------------------- Text: Titel, Anzeige, Sätze, Abspann (1:1 aus dem Skript)
  const TITEL = "Was wäre, wenn der Mond der Erde immer näher käme?";
  const FAKT = "Roche-Grenze ca. 18.400 km · heute 384.400 km\nMond entfernt sich 3,8 cm pro Jahr";
  const SAETZE = [
    [4.8, "Du stehst nachts an einem Strand in Portugal.", 3.7], [9.2, "Dann rückt der Vollmond näher.", 3.7],
    [13.6, "Er wächst sichtbar über dem Atlantik.", 3.7], [18.0, "Halb so weit, achtmal so viel Gezeitenkraft.", 3.7],
    [22.4, "Das Wasser steigt bis an die Dünen.", 3.7], [26.8, "Das Mondlicht wirft scharfe Schatten über den Sand.", 3.7],
    [31.2, "Ein Viertel der Strecke: 64-fache Gezeitenkraft.", 3.7], [35.6, "Das Meer zieht sich weit hinaus zurück.", 3.7],
    [40.0, "Der Mond ist schon siebenmal so groß.", 3.7], [44.4, "So nah kreisen sonst Wettersatelliten.", 3.7],
    [48.8, "Eine Flutwand rollt auf den Strand zu.", 3.7], [53.2, "Risse ziehen sich über den Mond.", 3.7],
    [62.4, "Die Erde reißt den Mond in Stücke.", 3.3], [66.4, "Heute driftet er jedes Jahr 3,8 Zentimeter weg.", 3.4],
  ];
  const entf = (t) => `ENTFERNUNG: ${zahlDE(Math.round(S.d(t)))} KM`;
  const anzeige = (t) => {
    const a = S.anzeige(t), v = a.wert;
    if (t < 20) return { etikett: a.etikett, zahl: zahlDE(Math.round(v)), einheit: a.einheit, unter: "GEDANKENEXPERIMENT: DER MOND RÜCKT HERAN", wert: v };
    if (t < 44) return { etikett: a.etikett, zahl: zahlDE(v, v < 100 ? 1 : 0), einheit: a.einheit,
      unter: t < 24 ? "HALB SO WEIT: 192.200 KM" : (t >= 31 && t < 36 ? "EIN VIERTEL: 96.100 KM" : entf(t)), wert: v };
    if (t < T_HIER) return { etikett: a.etikett, zahl: zahlDE(Math.round(v)), einheit: a.einheit, unter: t < 50.5 ? "42.164 KM · HÖHE DER WETTERSATELLITEN" : entf(t), wert: v };
    return { etikett: a.etikett, zahl: "HIER", einheit: "", unter: "", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE });
  hud.tropfen({ von: 59.3, bis: 67, anzahl: 18, seed: 17, groesse: [10, 30] });
  hud.flecken({ von: T_HIER + 0.8, bis: 71, anzahl: 12, art: "hell", seed: 9, wind: [6, -10] });

  const ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices, augeStart: A0, augeDuene: A1, bootStart: B0 };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
