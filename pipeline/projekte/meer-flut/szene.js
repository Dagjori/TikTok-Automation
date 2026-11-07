// Account 2 @stelldirvor.pov – „Was wäre, wenn ein ausgetrocknetes Meer plötzlich wieder vollläuft?“ (Skript acc2-2026-11-07-mittag)
// Welt: engine/welt_salzbecken.js (Erstbau 07.11.2026). Rechnung: sim/meer_flut.mjs (Pegel, Zeitraffer, Countdown, Stände).
// Bogen: Countdown ab Bild 0 (0:08 → 0:00), Durchbruch bei 8,0 s (Gischtfontäne am Horizont, Tonkante, Licht kippt), 8–16 s 1 s = 1 h (Flutfront,
// Sonnenuntergang, erste Nacht), 16–20 s weich beschleunigt, 20–60 s 1 s = 6 Tage (Lichtpuls statt Tag-Nacht-Flackern), Fahrt an der Klippe 37–50 s,
// Annäherung mit Beben 52–60 s, 60 s HIER: Weißblende + ein harter Schnitt in den ruhigen Morgen am vollen Meer, Abblende 70–72 s, Abspann 72–80 s.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes, hash } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Himmel, Puffs, Partikel, Voegel, PovKamera, farbPhasen, Protokoll, wolkenFeld } from "../../engine/stil_lunar_pov.js";
import { LunarHUD, zahlDE, uhrzeit } from "../../engine/lunar_hud.js";
import { Salzbecken, hoehe, BODEN, SPUR_Y, DURCHBRUCH } from "../../engine/welt_salzbecken.js";
import { pegel, rateBei, stunden, countdown, tag, T_EREIGNIS, T_HIER } from "../../sim/meer_flut.mjs";

const FPS = 30, DAUER = 80, T_CUT = T_HIER;
const Q = new URLSearchParams(location.search);
const D2R = Math.PI / 180, L = ease.inOutSine;
const richtung = (yaw, pitch) => [Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R)];
const fr = (x) => x - Math.floor(x);
const K = (keys) => (t) => keyframes(keys.map(([tt, v, e]) => ({ t: tt, v, e: e || L })), t);
const farbe = (keys) => { const Cs = keys.map(([tt, c]) => [tt, new THREE.Color(c)]), o = new THREE.Color(); return (t) => { o.copy(Cs[0][1]); for (let i = 1; i < Cs.length; i++) { if (t <= Cs[i][0]) { const p = L(clamp((t - Cs[i - 1][0]) / (Cs[i][0] - Cs[i - 1][0]))); return o.copy(Cs[i - 1][1]).lerp(Cs[i][1], p); } o.copy(Cs[i][1]); } return o; }; };

// ---------------------------------------------------------------- Kamera (Vorsprung, Auge 1,6 m über der Platte)
const AUGE = [0, SPUR_Y + 1.6, 3.5];
const POS = [{ t: 0, v: AUGE }, { t: 37, v: AUGE }, { t: 50, v: [11, SPUR_Y + 3.4, 0.8], e: L }, { t: 59.99, v: [13, SPUR_Y + 3.6, 0.3], e: L }];
const BLICK = [{ t: 0, v: [0, -13] }, { t: 5.6, v: [-0.8, -12.5] }, { t: 11.2, v: [-9.6, -8.8], e: L }, { t: 14, v: [-8, -11], e: L }, { t: 18.5, v: [-1, -18], e: L }, { t: 24, v: [0, -22], e: L },
  { t: 37, v: [1.5, -27], e: L }, { t: 50, v: [7, -36], e: L }, { t: 59.99, v: [9, -54], e: L }];
const FOV = [{ t: 0, v: 60 }, { t: 52, v: 60 }, { t: 59.99, v: 52, e: L }];
const POS2 = [{ t: 60, v: [4, SPUR_Y + 1.6, 3.2] }, { t: 70, v: [5, SPUR_Y + 1.7, 3.0], e: L }];
const BLICK2 = [{ t: 60, v: [16, -6] }, { t: 70, v: [10, -8], e: L }];
const augeBei = (t) => (t < T_CUT ? keyframes(POS, t) : keyframes(POS2, t));
const blickBei = (t) => (t < T_CUT ? keyframes(BLICK, t) : keyframes(BLICK2, t));
const zielBei = (t) => { const [y, p] = blickBei(t), d = richtung(y, p), a = augeBei(t); return [a[0] + d[0] * 100, a[1] + d[1] * 100, a[2] + d[2] * 100]; };

// ---------------------------------------------------------------- Tageslauf (Stunde seit Mittag während 8–16 s: 1 s = 1 h)
const STUNDE = (t) => (t <= T_EREIGNIS ? 12 + 0.05 * t : 12 + (t - 8) * 1.0);
const SONNE_EL = (h) => 66 * Math.cos(((h - 12) / 7) * Math.PI / 2);      // 66° mittags, 0° um 19:00
const NACHT = (t) => smoothstep(14.9, 16.2, t) * (1 - smoothstep(16.5, 20.5, t));   // Mondnacht nur um 16 s, danach Lichtpuls
const PULS = (t) => smoothstep(16.5, 21, t) * (1 - smoothstep(58.2, 59.6, t));
const MORGEN = (t) => smoothstep(T_CUT - 0.01, T_CUT + 0.01, t);
function himmelZustand(t) {
  const h = STUNDE(Math.min(t, 15.99));
  const elTag = Math.max(SONNE_EL(h), -8);
  const azTag = lerp(24, 4, smoothstep(8, 15.3, t));
  // Lichtpuls: Sonne ca. 40°, Azimut wandert langsam, Helligkeit pulsiert weich (Periode 5,2 s, ±14 %) – kein Tag-Nacht-Flackern
  const puls = 0.78 + 0.14 * Math.sin((2 * Math.PI * t) / 5.2 + 0.6);
  const mo = MORGEN(t), pu = PULS(t), na = NACHT(t);
  const el = lerp(lerp(elTag, 40, pu), 13, mo), az = lerp(lerp(azTag, -25 + 3.2 * (t - 20), pu), 30, mo);
  return { el, az, puls, mo, pu, na };
}

async function start() {
  aktiviereHoehenNebel({ abfall: 0.0002, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: false, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#D8C8AE", 3.0e-5);
  const kam = new THREE.PerspectiveCamera(60, 1080 / 1920, 0.1, 80000);
  const welt0 = new Salzbecken(szene, { gitter: Q.has("gitter") ? Q.get("gitter").split(",").map(Number) : [360, 900] });
  if (Q.get("dbg") === "1") welt0.gelaende.visible = false;
  if (Q.get("dbg") === "2") welt0.wasser.visible = false;
  const himmel = new Himmel(szene, { radius: 40000, zenit: "#5F7FAE", horizont: "#E4CFAE", sonnenRichtung: richtung(24, 66), sonnenStaerke: 30, glanz: 0.7, zirren: 0.35, dunst: 0.2 });
  const pov = new PovKamera(kam, { pos: AUGE, ziel: zielBei(0), fov: 60 }).atmen({ staerke: 1.1 })
    .beben({ von: 52, bis: 59.8, staerke: 0.1, frequenz: 4.2, anstieg: 5, abkling: 0.6 });

  const hemi = new THREE.HemisphereLight("#BCD0E8", "#9A7A54", 0.9);
  const sonne = new THREE.DirectionalLight("#FFE8C8", 2.6);
  szene.add(hemi, sonne, sonne.target);
  const puffs = new Puffs(szene, { max: 900, schatten: 0.4 });
  const gischt = new Puffs(szene, { max: 400, schatten: 0.1, renderOrder: 12 });
  const staubP = new Partikel(szene, { art: "staub", anzahl: 1600, box: [30, 8, 30], seed: 6, groesse: 0.03, farbe: "#E8D8B8" });
  const geier = new Voegel(szene, { anzahl: 3, seed: 91, farbe: "#26211E", spannweite: 3.2 }).schwarm({ zentrum: [40, 70, -260], radius: 140, hoehe: 25, tempo: 12, anzahl: 3 });
  const moewen = new Voegel(szene, { anzahl: 18, seed: 93, farbe: "#F0EDE6", spannweite: 1.1 }).schwarm({ zentrum: [4, 6, -34], radius: 36, hoehe: 10, tempo: 8, anzahl: 18 });
  const sterne = (() => { const n = 1100, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = hash(i, 1) * 6.283, z = 0.04 + 0.96 * hash(i, 2), r = Math.sqrt(1 - z * z); p.set([Math.cos(a) * r * 30000, z * 30000, Math.sin(a) * r * 30000], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({ color: "#FFFFFF", size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    const o = new THREE.Points(g, m); o.renderOrder = -900; szene.add(o); return o; })();
  const wolkenA = wolkenFeld({ anzahl: 12, bereich: { x: [-16000, 16000], z: [-26000, -6000] }, hoehe: [700, 1400], groesse: 1100, farbe: "#F6F0E6", a: 0.9, wind: [14, 5], seed: 3 });
  const wolkenB = wolkenFeld({ anzahl: 8, bereich: { x: [-9000, 9000], z: [-9000, -2500] }, hoehe: [600, 900], groesse: 700, farbe: "#F2EEE8", a: 0.85, wind: [20, 8], seed: 4 });

  // ---------------------------------------------------------------- Zustände
  const frontR = (t) => (t < T_EREIGNIS ? 0 : t >= 17.2 ? 1e9 : 24000 * Math.pow(clamp((t - T_EREIGNIS) / 9), 0.85) + 300);
  const flaeche = (t) => Math.max(pegel(t), BODEN + 14 * smoothstep(8.0, 9.5, t));
  const braun = K([[0, 1], [20, 1], [38, 0.05], [44, 0]]);
  const wasserTief = farbe([[0, "#2A4B58"], [30, "#1E5870"], [44, "#16607C"], [62, "#1A6A8A"]]);
  const wasserFlach = farbe([[0, "#4A8590"], [44, "#3E9AA4"], [62, "#4FB0BA"]]);
  const zenit = farbe([[0, "#4F74AA"], [8, "#5878AC"], [12, "#4C5A8A"], [15, "#33406E"], [16.3, "#10183A"], [18, "#4B6C98"], [58, "#4B6A94"], [59.9, "#566A8C"], [60.01, "#5A86B6"], [66, "#6A98C6"], [70, "#6A96C2"]]);
  const horizont = farbe([[0, "#E6D2B0"], [8, "#E8D2AE"], [12, "#E6A870"], [14.5, "#F08A4E"], [16.3, "#2E2A48"], [18, "#C9BBA4"], [58, "#C8BAA4"], [59.9, "#D8C4A8"], [60.01, "#F2C48C"], [64, "#EFD2A6"], [70, "#E8D8BC"]]);
  const sonneF = farbe([[0, "#FFF4E2"], [10, "#FFEBCC"], [13, "#FFC88A"], [15, "#FF9440"], [15.6, "#FF7A30"], [16.3, "#B8C8E8"], [18, "#FFF0D8"], [59.9, "#FFE8CC"], [60.01, "#FFC890"], [66, "#FFD8A8"]]);
  const nebelD = K([[0, 2.6e-5], [8, 3.0e-5], [14, 3.6e-5], [16, 4.5e-5], [20, 3.4e-5], [52, 3.2e-5], [59.9, 5.5e-5], [60.01, 3.0e-5], [70, 2.8e-5]]);
  const farben = farbPhasen([
    { t: 0, werte: { belichtung: 1.02, saettigung: 0.9, kontrast: 1.05, tonung: [1.1, 0.96, 0.82], tonungStaerke: 0.32, bloomStaerke: 1.05 } },
    { t: 7.9, werte: { belichtung: 1.04, saettigung: 0.9, kontrast: 1.05, tonung: [1.1, 0.96, 0.82], tonungStaerke: 0.32, bloomStaerke: 1.05 } },
    { t: 9.5, werte: { belichtung: 1.0, saettigung: 0.88, kontrast: 1.06, tonung: [0.96, 1.0, 1.06], tonungStaerke: 0.3, bloomStaerke: 1.0 } },
    { t: 14.5, werte: { belichtung: 1.0, saettigung: 1.05, kontrast: 1.06, tonung: [1.14, 0.9, 0.72], tonungStaerke: 0.55, bloomStaerke: 1.3 } },
    { t: 16.3, phase: "nacht", werte: { belichtung: 0.88, tonungStaerke: 0.5, bloomStaerke: 1.2 } },
    { t: 19.5, werte: { belichtung: 0.98, saettigung: 0.88, kontrast: 1.04, tonung: [1.0, 1.0, 1.04], tonungStaerke: 0.2, bloomStaerke: 1.0 } },
    { t: 36, werte: { belichtung: 1.02, saettigung: 0.98, kontrast: 1.05, tonung: [1.0, 1.02, 1.06], tonungStaerke: 0.24, bloomStaerke: 1.0 } },
    { t: 52, werte: { belichtung: 1.0, saettigung: 0.95, kontrast: 1.06, tonung: [0.96, 1.0, 1.08], tonungStaerke: 0.32, bloomStaerke: 1.05 } },
    { t: 59.9, werte: { belichtung: 1.0, saettigung: 0.9, kontrast: 1.06, tonung: [0.96, 1.0, 1.08], tonungStaerke: 0.32, bloomStaerke: 1.1 } },
    { t: 60.01, werte: { belichtung: 1.08, saettigung: 1.02, kontrast: 1.03, tonung: [1.12, 1.0, 0.86], tonungStaerke: 0.34, bloomStaerke: 1.15 } },
    { t: 66, werte: { belichtung: 1.04, saettigung: 1.02, kontrast: 1.02, tonung: [1.08, 1.0, 0.9], tonungStaerke: 0.26, bloomStaerke: 1.0 } },
    { t: 70, werte: { belichtung: 1.02, saettigung: 1.0, kontrast: 1.02, tonung: [1.06, 1.0, 0.92], tonungStaerke: 0.22, bloomStaerke: 1.0 } },
  ]);
  const weiss = (t) => smoothstep(58.9, 59.95, t) * (t < T_CUT ? 1 : 0) + (t >= T_CUT ? 1 - smoothstep(60.0, 62.2, t) : 0);   // Weißblende aus Gischt, hält über den Schnitt und klingt aus

  // Ufer: z, wo das Gelände die Wasserfläche schneidet (Bisektion auf der Mittellinie x)
  const uferZ = (x, y) => { let a = 20, b = -2900; if (hoehe(x, a) < y) return a; for (let i = 0; i < 28; i++) { const m = (a + b) / 2; if (hoehe(x, m) > y) a = m; else b = m; } return (a + b) / 2; };

  // ---------------------------------------------------------------- Protokoll (Effekte mit Klang, Kamera, Schnitt)
  const prot = new Protokoll();
  prot.effekt(0.8, "staubwirbel", { klang: "windstoss", staerke: 0.3 }).effekt(2.4, "geier_kreisen", { klang: false }).effekt(3.2, "salz_glitzert", { klang: false })
    .effekt(6.8, "dunst_am_horizont", { klang: "grollen", staerke: 0.3, dauer: 1.2 })
    .effekt(T_EREIGNIS, "durchbruch", { klang: "donner", staerke: 0.95 }).effekt(T_EREIGNIS, "gischtfontaene", { klang: "gischt", staerke: 0.6, dauer: 4 })
    .effekt(11.0, "flutfront", { klang: "gischt", staerke: 0.45, dauer: 4 }).effekt(14.0, "flut_am_fuss", { klang: "gischt", staerke: 0.6, dauer: 3 })
    .effekt(15.0, "sonnenuntergang", { klang: false }).effekt(16.0, "mondnacht", { klang: false })
    .effekt(17.5, "zeitraffer", { klang: "windstoss", staerke: 0.35, dauer: 3 }).effekt(21.0, "wolken_jagen", { klang: false }).effekt(26.0, "salzebene_verschwindet", { klang: false })
    .effekt(31.0, "wasser_wird_gruen", { klang: false }).effekt(38.0, "wasserlinie_klettert", { klang: "gischt", staerke: 0.3, dauer: 6 })
    .effekt(41.0, "huegel_werden_inseln", { klang: false }).effekt(46.0, "gischt_steigt", { klang: "gischt", staerke: 0.5, dauer: 6 })
    .effekt(50.5, "elf_meter_pro_tag", { klang: "grollen", staerke: 0.5, dauer: 5 }).effekt(55.0, "wellen_unter_dir", { klang: "gischt", staerke: 0.7, dauer: 5 })
    .effekt(59.4, "weissblende_gischt", { klang: false }).effekt(T_HIER, "wasser_erreicht_den_vorsprung", { klang: "druckwelle", staerke: 0.85 })
    .effekt(61.5, "moewen", { klang: "fluegel", staerke: 0.3 }).effekt(64.0, "wellen_am_fels", { klang: "gischt", staerke: 0.25, dauer: 6 });
  prot.melde({ t: 6, typ: "kamera", art: "schwenk", dauer: 5.2, text: "Schwenk zum Horizont, wo das Meer hereinbricht", klang: false })
    .melde({ t: 11.2, typ: "kamera", art: "schwenk", dauer: 7, text: "Rückschwenk, folgt der Flut über die Salzebene", klang: false })
    .melde({ t: 37, typ: "kamera", art: "fahrt", dauer: 13, text: "langsame Fahrt am Fels, Wasserlinie klettert sichtbar", klang: false })
    .melde({ t: 52, typ: "kamera", art: "zoom", dauer: 8, von: 60, bis: 52, text: "Zoom und Neigung zur Wasserlinie unter dir", klang: false })
    .melde({ t: T_CUT, typ: "schnitt", grund: "Höhepunkt: harter Schnitt von der Weißblende der Gischt in den ruhigen Morgen am vollen Meer", klang: false });

  // ---------------------------------------------------------------- Welt pro Bild
  const sV = new THREE.Vector3(), cT = new THREE.Color();
  const welt = { szene, kamera: kam, post: {}, update(t) {
    pov.fov = keyframes(FOV, t);
    pov.posKeys = [{ t: 0, v: augeBei(t) }]; pov.zielKeys = [{ t: 0, v: zielBei(t) }];
    const z = pov.anwenden(t);
    himmel.folge(kam);
    const hz = himmelZustand(t);
    const blickYaw = blickBei(t)[0];
    const sd = richtung(blickYaw + hz.az, hz.el);
    const nachtD = hz.na * (1 - hz.pu);
    const zen = zenit(t).clone(), hor = horizont(t).clone();
    const mondR = richtung(blickYaw - 6, 24);                       // Mond: im Bild links oben
    const sRicht = nachtD > 0.5 ? mondR : sd;
    himmel.setze({ zenit: zen, horizont: hor, unten: hor.clone().multiplyScalar(0.7), sonnenRichtung: nachtD > 0.5 ? mondR : sd, sonnenFarbe: sonneF(t),
      sonnenStaerke: lerp(30, 5, nachtD) * (1 - 0.65 * hz.pu), glanz: lerp(0.75, 0.3, nachtD), zirren: 0.32 + 0.3 * hz.pu });
    szene.fog.color.copy(hor).lerp(cT.set("#B8B4A8"), hz.pu * 0.2); szene.fog.density = nebelD(t);
    sV.set(...sd).normalize();
    sonne.position.copy(kam.position).addScaledVector(sV, 3000); sonne.target.position.copy(kam.position); sonne.target.updateMatrixWorld();
    const tag01 = smoothstep(-1, 6, hz.el);                         // Sonnenlicht je nach Höhe
    sonne.color.copy(sonneF(t)).lerp(cT.set("#8FA8D8"), nachtD);
    sonne.intensity = (1.55 * tag01 * (0.35 + 0.65 * hz.puls * (1 + 0.1 * hz.pu)) + 0.35 * nachtD) * (1 - 0.0 * hz.mo) + 0.15;
    hemi.intensity = lerp(0.55, 0.25, nachtD) * (0.8 + 0.2 * hz.puls); hemi.color.copy(zen).lerp(cT.set("#D8E0EC"), 0.4); hemi.groundColor.set("#9A7A54");
    const lichtW = lerp(1, 0.28, nachtD) * (0.7 + 0.3 * lerp(1, hz.puls, hz.pu)) * (0.7 + 0.3 * tag01);
    const sonneRW = nachtD > 0.5 ? mondR : sd;
    const nass = smoothstep(8, 11, t);
    welt0.setze(t, kam, { flaeche: flaeche(t), frontR: frontR(t), braun: braun(t), schaum: smoothstep(8, 10, t), sonneR: sonneRW, sonneF: sonneF(t), himmelFarbe: hor.clone().lerp(zen, 0.45),
      tiefFarbe: wasserTief(t), flachFarbe: wasserFlach(t), licht: lichtW, welle: lerp(0.55, 1.0, smoothstep(40, 58, t)) * (t >= T_CUT ? 0.5 : 1), nass,
      glitzer: 1 - smoothstep(8, 14, t), glanz: lerp(1, 0.7, nachtD), dbg: Number(Q.get("dbg") || 0) > 2 ? Number(Q.get("dbg")) - 2 : 0 });
    // Vögel: Geier im Alltag, Möwen im Morgen
    geier.mesh.visible = t < 12; geier.setze(t); moewen.mesh.visible = t > 60.5; moewen.setze(t - 60);
    sterne.material.opacity = nachtD * 0.9; sterne.rotation.y = 0.004 * t;
    // Wolken: ziehen, jagen im Zeitraffer
    const wf = t < 16 ? 1 : 1 + 0.5 * (t - 16);
    const wd = 0.5 + 0.5 * (t >= T_CUT ? 1 : smoothstep(0, 10, t));
    const wl = [...wolkenA(t * 2 * Math.min(wf, 14)), ...wolkenB(t * 2 * Math.min(wf, 14))].map((w) => ({ ...w, a: w.a * wd * (0.55 + 0.45 * lichtW) * (t >= T_CUT ? 0.55 : 1), farbe: [0.96, 0.94, 0.9].map((c, k) => c * (0.5 + 0.5 * lichtW) * (k === 2 ? 0.96 : 1)) }));
    // Staubwirbel auf der Salzebene (0–8 s, wandert), Gischtfontäne am Durchbruch und Flutfront
    const P = DURCHBRUCH, wirbel = [];
    if (t < 9) for (let i = 0; i < 26; i++) { const tau = fr(t * 0.22 + i / 26), hh = tau * 380, rr = 14 + 40 * tau, ang = tau * 14 + i * 2.4; const a = (1 - smoothstep(6.4, 8.6, t)) * Math.sin(Math.PI * tau) * 0.5;
      wirbel.push({ p: [320 + 55 * t + Math.cos(ang) * rr * 0.8, BODEN + 8 + hh, -3900 + Math.sin(ang) * rr * 0.8], r: rr, dreh: i, farbe: [0.86, 0.76, 0.6], a, licht: 0.9, bild: i % 4 }); }
    const fontaene = [];
    const ts = t - T_EREIGNIS;
    if (t > 6.8) for (let i = 0; i < 60; i++) { const tau = fr(ts * 0.35 + i / 60), hh = tau * 700 * smoothstep(0, 1.2, ts + 1), rr = 90 + 260 * tau; const a = smoothstep(6.8, 8.4, t) * (1 - smoothstep(14, 18, t)) * (1 - tau * 0.6) * 0.8;
      fontaene.push({ p: [P[0] + (hash(i, 31) - 0.5) * 500, BODEN + 30 + hh, P[1] + (hash(i, 32) - 0.5) * 300], r: rr, dreh: i * 1.7, farbe: [0.96, 0.97, 0.97], a, licht: 1, bild: i % 4 }); }
    const front = [];
    if (t > 8 && t < 17.6) {
      const R = frontR(t), wk0 = Math.atan2(0 - P[0], -2900 - P[1]);     // Richtung vom Durchbruch zum Becken vor dem Vorsprung
      for (let i = 0; i < 90; i++) {
        const wk = wk0 + lerp(-0.62, 0.62, hash(i, 41)), rr2 = R - 60 * hash(i, 42);
        front.push({ p: [P[0] + Math.sin(wk) * rr2, BODEN + 18 + 30 * hash(i, 43), P[1] + Math.cos(wk) * rr2], r: lerp(90, 210, hash(i, 44)) * (0.5 + 0.5 * smoothstep(8, 11, t)), dreh: i * 2.1, farbe: [0.95, 0.96, 0.96], a: 0.55 * (1 - smoothstep(13.5, 17.2, t)), licht: 1, bild: i % 4 });
      }
    }
    // Gischt am Ufer der Klippe (ab 38 s): Sprühwolken auf der Wasserlinie unter dir
    const ufer = [];
    if (t > 13 && t < T_CUT) { const f = flaeche(t), anz = t > 36 ? 70 : 24; for (let i = 0; i < anz; i++) { const x = lerp(-34, 34, hash(i, 51)) * (t < 36 ? 8 : 1), zz = uferZ(x, f), tau = fr(t * 0.9 + hash(i, 52));
      const gro = lerp(2.5, 9, hash(i, 53)) * (1 + 0.4 * smoothstep(40, 58, t)) * (t < 36 ? 6 : 1); const a = (1 - smoothstep(58.6, 59.8, t)) * 0.55 * smoothstep(12, 15, t) * Math.sin(Math.PI * tau);
      if (zz < -2850) continue; ufer.push({ p: [x, f + 1 + tau * gro * 3, zz - 1], r: gro, dreh: i, farbe: [0.97, 0.98, 0.98], a, licht: 1, bild: i % 4 }); } }
    if (Q.get("dbg") === "1") welt0.gelaende.visible = false; else if (Q.get("dbg") === "2") welt0.wasser.visible = false;
    puffs.setze([...wl, ...wirbel], kam);
    gischt.setze([...fontaene, ...front, ...ufer], kam);
    staubP.setze(t, kam, { zentrum: [kam.position.x, kam.position.y - 1.0, kam.position.z - 9], deckkraft: 0.35 * (1 - smoothstep(6, 9, t)) + 0.2 * smoothstep(60, 62, t) * (1 - smoothstep(66, 70, t)), wind: [1.5, 0.2, -1] });
    const fp = farben(t), wb = weiss(t);
    Object.assign(welt.post, fp, { belichtung: fp.belichtung * (1 + 0.5 * wb), schleier: [0.96, 0.97, 0.96], schleierStaerke: Math.max(fp.schleierStaerke, 0.95 * wb),
      flimmern: 0.55 * (smoothstep(0.3, 2, t) * (1 - smoothstep(7.2, 8.4, t))) + 0.0, flimmerY: [0.2, 0.62], vignette: 0, koernung: 0.008, tiltStaerke: 0, tiefeNah: 0, tiefeFern: 0 });
    return z;
  } };

  // ---------------------------------------------------------------- Text (1:1 aus dem Skript)
  const TITEL = "Was wäre, wenn ein ausgetrocknetes Meer plötzlich wieder vollläuft?";
  const FAKT = "MITTELMEER, VOR 5,33 MIO. JAHREN · 90 % DES WASSERS FLOSSEN IN MONATEN BIS ZWEI JAHREN ZURÜCK";
  const S = [[4.8, "Mittag über dem Grund eines leeren Meeres."], [9, "Dann bricht am Horizont das Meer herein."], [13, "Die Flut wälzt sich über das Salz."], [17, "Über der Flut wird es Nacht."],
    [21, "Dann rasen Tage und Nächte vorbei."], [25, "Das Wasser steigt Tag für Tag."], [29, "Die Salzebene ist ganz verschwunden."], [33, "Jetzt steigt es fünf Meter am Tag."],
    [37, "Das Wasser klettert die Klippe hinauf."], [41, "Hügel am Grund werden zu Inseln."], [45, "Noch knapp achthundert Meter bis zu dir."], [50.5, "Jetzt steigt es elf Meter am Tag."],
    [54.5, "Die Wellen schlagen schon unter dir."], [62.8, "Ein neuer Morgen über einem vollen Meer."], [66.4, "So füllte sich einst das Mittelmeer."]];
  const SAETZE = S.map(([t, text], i) => { const nxt = i + 1 < S.length ? S[i + 1][0] : 70.0; return [t, text, Math.min(4.2, nxt - t - 0.45, 70 - t)]; });
  const minus = (x) => "−" + zahlDE(Math.round(Math.abs(x)));
  const anzeige = (t) => {
    if (t < T_EREIGNIS) return { etikett: "DURCHBRUCH IN", zahl: uhrzeit(countdown(t)), einheit: "", unter: t < 5.5 ? "BECKEN TROCKEN" : "NOCH RUHIG", wert: countdown(t) };
    if (t < 17) return { etikett: "STUNDEN SEIT DURCHBRUCH", zahl: zahlDE(Math.floor(stunden(t))), einheit: "h", unter: t < 12 ? "FLUT AM HORIZONT" : t < 16 ? "SALZEBENE LÄUFT VOLL" : "ERSTE NACHT", wert: stunden(t) };
    if (t < 52) { const p = pegel(t); const unter = t < 20 ? "TAG 1" : t < 33 ? "1 SEKUNDE = 6 TAGE" : t < 41 ? `+${Math.round(rateBei(33))} M PRO TAG` : t < 50.5 ? `+${Math.round(rateBei(41))} M PRO TAG` : `+${Math.round(rateBei(50.5))} M PRO TAG`;
      return { etikett: "WASSERSTAND", zahl: t < 21 ? "−" + zahlDE(Math.abs(p), 1) : minus(p), einheit: "m", unter, wert: p }; }
    if (t < T_HIER) return { etikett: "BIS ZU DEINEM FELS", zahl: zahlDE(Math.round(-pegel(t))), einheit: "m", unter: t < 57 ? "WASSER KLETTERT" : "FAST AUF AUGENHÖHE", wert: -pegel(t) };
    return { etikett: "BIS ZU DEINEM FELS", zahl: "HIER", einheit: "", unter: "MEERESSPIEGEL ERREICHT", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE });
  hud.flecken({ von: T_HIER + 1.2, bis: 71, anzahl: 8, art: "hell", seed: 17, wind: [6, 3] });

  const ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, T_EREIGNIS, vertices: welt0.vertices };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
