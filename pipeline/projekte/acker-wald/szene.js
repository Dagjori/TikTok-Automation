// Account 2 @stelldirvor.pov – „Was wäre, wenn du einen Acker 144 Jahre lang in Ruhe lässt?“ (Skript acc2-2026-11-04-mittag)
// Broadbalk Wilderness (Rothamsted, Harpenden): seit 1882 sich selbst überlassen. Grundwelt engine/welt_feld_wald.js (Erstbau 04.11.2026).
// Zeitachse = Jahr (sim/acker_wald.mjs: jahr(t)); Vegetation wächst als Funktion des Jahres, die Jahreszeit läuft 0–20 s echt (½ Jahr/s),
// danach stilisiert im 3-s-Takt (je Takt ein Jahreslauf, „Stroboskop“), ab 52 s jeweils im Sommer. Eine durchgehende Einstellung:
// Ruhe über dem Feld, Schwenk links zur gerodeten Hälfte (21–25 s), rechts zum Dickicht (27–31 s), Mitte (40–44 s), Blick hebt sich
// in die Kronen (44–58 s), HIER bei 60 s: Sonne bricht durch eine Lücke, Lichtfleck auf dem Podest; Nachspiel: Blick sinkt auf Wald und Wiese.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes, hash } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Himmel, Glut, Puffs, Partikel, Voegel, PovKamera, farbPhasen, Protokoll, wolkenFeld, vordergrund } from "../../engine/stil_lunar_pov.js";
import { LunarHUD } from "../../engine/lunar_hud.js";
import { FeldWald, PODEST, hoehe } from "../../engine/welt_feld_wald.js";
import { jahr, ohnePflug, kohlenstoff } from "../../sim/acker_wald.mjs";

const FPS = 30, DAUER = 80, T_HIER = 60;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const D2R = Math.PI / 180;
const richtung = (yaw, pitch) => [Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R)];
const AUGE = [PODEST.x, PODEST.auge, PODEST.z];

// Kamera-Plan (Grad): yaw + = rechts, pitch + = oben
const L = ease.inOutSine;
const BLICK = [{ t: 0, v: [3, -8] }, { t: 19, v: [1.5, -8] }, { t: 24.5, v: [-12, -9], e: L }, { t: 27, v: [-12, -9], e: L }, { t: 31.5, v: [17, -6], e: L },
  { t: 35, v: [19, -1], e: L }, { t: 39, v: [16, -3], e: L }, { t: 43.5, v: [0, -7], e: L }, { t: 48, v: [-6, -5], e: L }, { t: 50.5, v: [-4, -4], e: L }, { t: 54, v: [20, 12], e: L },
  { t: 58, v: [26, 27], e: L }, { t: 61, v: [27, 28], e: L }, { t: 67.5, v: [10, -4], e: L }, { t: 70, v: [9, -4], e: L }];
const FOV = [{ t: 0, v: 56 }, { t: 40, v: 56 }, { t: 44, v: 60, e: L }, { t: 57, v: 62, e: L }, { t: 70, v: 60, e: L }];
let SY = 14, SP = 33, SONNE_HIER = richtung(SY, SP);            // Sonne in der Lücke des Kronendachs (wird in start() gesucht)

// Jahreszeit: Zyklen (s = Nachkomma: 0 März, 0.15 Mai, 0.3 Juli, 0.42 Aug, 0.55 Okt, 0.68 Nov, 0.8 Jan)
const PHI = [{ t: 0, v: 0.33 }, { t: 20, v: 10.33 }, { t: 46.5, v: 19.16 }, { t: 47.5, v: 19.4 }, { t: 51, v: 19.47 }, { t: 54, v: 20.24 }, { t: 60, v: 20.3 }, { t: 70, v: 20.4 }, { t: 80, v: 20.42 }];
const phi = (t) => keyframes(PHI.map((k) => ({ ...k, e: ease.linear })), t);
const schneeBei = (t) => { const f = phi(t), s = f - Math.floor(f), jahrN = Math.floor(f - 0.3); const w = smoothstep(0.6, 0.8, s) * (1 - smoothstep(0.84, 0.99, s)); return 0.6 * w * (hash(jahrN, 7) < 0.5 ? 1 : 0.2); };

async function start() {
  aktiviereHoehenNebel({ abfall: 0.004, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#B8C0C4", 2.2e-4);
  const kam = new THREE.PerspectiveCamera(56, 1080 / 1920, 0.1, 30000);
  const welt0 = new FeldWald(szene, { schatten: SCHATTEN > 0 });
  const himmel = new Himmel(szene, { radius: 9000, zenit: "#6F87AE", horizont: "#C9CFD8", unten: "#8F9488", sonnenRichtung: richtung(40, 20), sonnenStaerke: 26, glanz: 0.6, zirren: 0.35 });
  vordergrund(szene, { art: "holz", pos: AUGE, ziel: [AUGE[0], AUGE[1] - 1, AUGE[2] - 10], abstand: 1.15, breite: 2.5, augenhoehe: 1.6, hoehe: 1.0, pfosten: [-1.15, 1.15], farben: ["#8C7458", "#6E5A44"] });

  SY = 27; SP = 42; SONNE_HIER = richtung(SY, SP);
  const blickKeys = BLICK.map((k) => k.v[0] === "S" ? { ...k, v: [SY - 3, SP - 7 + k.v[1]] } : k);
  const zielBei = (t) => { const [y, p] = keyframes(blickKeys, t), d = richtung(y, p); return [AUGE[0] + d[0] * 100, AUGE[1] + d[1] * 100, AUGE[2] + d[2] * 100]; };
  const pov = new PovKamera(kam, { pos: AUGE, ziel: zielBei(0), fov: 56 }).atmen({ staerke: 1 }).stoss({ t: T_HIER, staerke: 0.25, abkling: 1.2 });

  const hemi = new THREE.HemisphereLight("#B9C8DA", "#6E6A48", 1.0);
  const sonne = new THREE.DirectionalLight("#FFF0D8", 2.4);
  sonne.castShadow = SCHATTEN > 0; sonne.shadow.mapSize.set(SCHATTEN || 1, SCHATTEN || 1);
  Object.assign(sonne.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 400 });
  sonne.shadow.bias = -0.0004; sonne.shadow.normalBias = 0.05;
  szene.add(hemi, sonne, sonne.target);

  const stern = new Glut(szene, { farbe: "#FFF1D2", staerke: 0, groesse: 2.2 });
  stern.mat.depthTest = false; stern.sprite && (stern.sprite.renderOrder = 30);
  const STERN = (() => { const d = richtung(27, 34); return [AUGE[0] + d[0] * 24, AUGE[1] + d[1] * 24, AUGE[2] + d[2] * 24]; })();
  const puffs = new Puffs(szene, { max: 700, schatten: 0.15 });
  const glanz = new Puffs(szene, { max: 60, additiv: true, nebel: false, renderOrder: 12 });
  const blaetter = new Partikel(szene, { art: "staub", anzahl: 1400, box: [30, 16, 30], seed: 21, groesse: 0.07, farbe: "#B8782E", fall: 0.9, wirbel: 1.2 });
  const schneeT = new Partikel(szene, { art: "schnee", anzahl: 2600, box: [40, 22, 40], seed: 22 });
  const samen = new Partikel(szene, { art: "staub", anzahl: 500, box: [16, 10, 16], seed: 23, groesse: 0.06, farbe: "#8A6A44", fall: 0.35, wirbel: 1.6 });
  const pollen = new Partikel(szene, { art: "staub", anzahl: 900, box: [14, 8, 14], seed: 24, groesse: 0.025, farbe: "#FFF2C8" });
  const kraehen = new Voegel(szene, { anzahl: 16, seed: 31, farbe: "#17171A", spannweite: 0.9 }).schwarm({ zentrum: [-6, 16, -42], radius: 22, hoehe: 6, tempo: 8, anzahl: 16 }).flucht({ t0: 22.4, richtung: [-1, 0.25, -0.4], tempo: 14 });
  const singvoegel = new Voegel(szene, { anzahl: 22, seed: 32, farbe: "#2A2622", spannweite: 0.35 }).schwarm({ zentrum: [3, 13, -24], radius: 9, hoehe: 4, tempo: 6, anzahl: 22 });
  const tauben = new Voegel(szene, { anzahl: 14, seed: 33, farbe: "#3A3A40", spannweite: 0.7 }).schwarm({ zentrum: [-60, 40, -160], radius: 40, hoehe: 10, tempo: 11, anzahl: 14 });
  const wolken = wolkenFeld({ anzahl: 16, bereich: { x: [-2600, 2600], z: [-3600, -900] }, hoehe: [520, 780], groesse: 150, farbe: "#F2F1EC", a: 0.85, wind: [14, 0], seed: 9 });
  const wolkenZeit = (t) => t < 20 ? t * 2 : 40 + (t - 20) * 4;

  // ---------------------------------------------------------------- Zustände je Zeit
  const K = (keys) => (t) => keyframes(keys.map(([tt, v, e]) => ({ t: tt, v, e: e || L })), t);
  const nebelMorgen = K([[0, 0], [8, 0], [10, 0.9], [12.5, 0.15], [14, 0], [37, 0], [38.6, 0.8], [41, 0.1], [42, 0], [80, 0]]);
  const wind = K([[0, 0.45], [20, 0.55], [30, 0.7], [44, 0.6], [56, 0.45], [60, 0.7], [70, 0.4]]);
  const unterDach = K([[0, 0], [44, 0], [52, 0.35], [57.5, 0.75], [59.6, 0.8], [60.2, 0.25], [64, 0.35], [70, 0.4]]);   // Dämmerung unter dem Kronendach
  const durchbruch = (t) => t < 59.6 ? 0 : t < 60.1 ? smoothstep(59.6, 60.1, t) : 0.55 + 0.45 * Math.exp(-(t - 60.1) / 1.4);
  const farbe = (keys) => { const Cs = keys.map(([tt, c]) => [tt, new THREE.Color(c)]), o = new THREE.Color(); return (t) => { o.copy(Cs[0][1]); for (let i = 1; i < Cs.length; i++) { if (t <= Cs[i][0]) { const p = L(clamp((t - Cs[i - 1][0]) / (Cs[i][0] - Cs[i - 1][0]))); return o.copy(Cs[i - 1][1]).lerp(Cs[i][1], p); } o.copy(Cs[i][1]); } return o; }; };
  // Tageszeiten-Stimmungen: Spätnachmittag golden (0–6), Morgennebel (8–12), Tag, Abenddämmerung (24–28), Tag, Morgennebel (38–41), goldene Ernte (45–51), Mittag (54–70)
  const zenit = farbe([[0, "#7088AA"], [6, "#7590B4"], [10, "#9AA6B4"], [14, "#6F8CB4"], [22, "#7290B6"], [25.5, "#4C5C86"], [28, "#5A6E98"], [31, "#6F8CB4"], [38.5, "#9CA8B6"], [42, "#7090B6"], [47, "#7A90B0"], [54, "#6E8CB6"], [70, "#6E8CB6"]]);
  const horizont = farbe([[0, "#E2CDA6"], [6, "#D9CCB0"], [10, "#D6D8D6"], [14, "#C6CED6"], [22, "#C6CED6"], [25.5, "#E6A878"], [28, "#D8B494"], [31, "#C6CED6"], [38.5, "#DADCDA"], [42, "#C6CED6"], [47, "#E0CCA4"], [51, "#D8D0BC"], [54, "#C8D0D6"], [70, "#C8D0D6"]]);
  const sonnenF = farbe([[0, "#FFD9A0"], [6, "#FFE2B4"], [10, "#FFF0DA"], [14, "#FFF4E2"], [22, "#FFF2DE"], [25.5, "#FFB070"], [28, "#FFCC98"], [31, "#FFF2DE"], [47, "#FFDCA8"], [51, "#FFE8C4"], [54, "#FFF6E6"], [70, "#FFF6E6"]]);
  const sonnenR = (t) => {
    const k = [[0, [38, 16]], [6, [34, 18]], [10, [-30, 10]], [14, [20, 42]], [22, [24, 36]], [25.5, [-32, 7]], [28, [-26, 12]], [31, [26, 40]], [38.5, [-34, 11]], [42, [18, 44]], [47, [36, 22]], [51, [30, 30]], [55, [SY + 2, SP + 1]], [80, [SY, SP]]];
    const [y, p] = keyframes(k.map(([tt, v]) => ({ t: tt, v, e: L })), t); return richtung(y, p);
  };
  const lichtStaerke = K([[0, 2.3], [6, 2.4], [10, 1.2], [13, 2.4], [22, 2.5], [25.5, 1.4], [28, 1.9], [31, 2.6], [38.5, 1.3], [41.5, 2.6], [47, 2.4], [52, 2.6], [57.5, 2.2], [59.6, 2.0], [60.1, 3.4], [64, 2.9], [70, 2.8]]);
  const nebelDichte = K([[0, 2.2e-4], [8, 2.2e-4], [10, 7e-4], [13, 2.4e-4], [25.5, 2.8e-4], [37, 2.2e-4], [38.6, 6.5e-4], [41.5, 2.2e-4], [80, 2.2e-4]]);
  const farben = farbPhasen([
    { t: 0, werte: { belichtung: 1.02, saettigung: 0.9, kontrast: 1.04, tonung: [1.06, 1.0, 0.9], tonungStaerke: 0.25, bloomStaerke: 0.9 } },
    { t: 8, werte: { belichtung: 1.0, saettigung: 0.88, kontrast: 1.02 } },
    { t: 10.5, werte: { belichtung: 1.04, saettigung: 0.72, kontrast: 0.92, schleier: [0.9, 0.92, 0.94], schleierStaerke: 0.12 } },
    { t: 14, werte: { belichtung: 1.0, saettigung: 0.9, kontrast: 1.02 } },
    { t: 22, werte: { belichtung: 1.0, saettigung: 0.9, kontrast: 1.02 } },
    { t: 25.5, werte: { belichtung: 0.92, saettigung: 0.95, kontrast: 1.06, tonung: [1.12, 0.94, 0.82], tonungStaerke: 0.4, bloomStaerke: 1.15 } },
    { t: 31, werte: { belichtung: 1.0, saettigung: 0.9, kontrast: 1.03 } },
    { t: 38.6, werte: { belichtung: 1.04, saettigung: 0.72, kontrast: 0.92, schleier: [0.9, 0.92, 0.94], schleierStaerke: 0.12 } },
    { t: 42, werte: { belichtung: 1.0, saettigung: 0.92, kontrast: 1.03 } },
    { t: 48, werte: { belichtung: 1.0, saettigung: 0.95, kontrast: 1.05, tonung: [1.06, 1.0, 0.88], tonungStaerke: 0.3, bloomStaerke: 1.0 } },
    { t: 54, werte: { belichtung: 0.96, saettigung: 0.92, kontrast: 1.06, tonung: [0.96, 1.04, 0.94], tonungStaerke: 0.25 } },
    { t: 59.6, werte: { belichtung: 0.9, saettigung: 0.9, kontrast: 1.08, tonung: [0.94, 1.04, 0.92], tonungStaerke: 0.3, bloomStaerke: 1.0, bloomSchwelle: 0.95 } },
    { t: 60.25, werte: { belichtung: 1.38, saettigung: 0.98, kontrast: 1.06, tonung: [1.1, 1.04, 0.86], tonungStaerke: 0.4, bloomStaerke: 1.9, bloomSchwelle: 0.7 } },
    { t: 61.5, werte: { belichtung: 1.2, saettigung: 0.95, kontrast: 1.06, tonung: [1.06, 1.03, 0.9], tonungStaerke: 0.3, bloomStaerke: 1.5, bloomSchwelle: 0.8 } },
    { t: 64, werte: { belichtung: 1.0, saettigung: 0.92, kontrast: 1.05, tonung: [1.0, 1.02, 0.94], tonungStaerke: 0.2, bloomStaerke: 1.1 } },
    { t: 70, werte: { belichtung: 0.98, saettigung: 0.9, kontrast: 1.04, bloomStaerke: 1.0 } },
  ]);

  // Mähdrescher 47–51,5 s auf dem Nachbarfeld (links hinten), erntet einen Streifen
  const drescherX = (t) => lerp(-46, 4, smoothstep(47, 51.5, t));
  const drescherAn = (t) => t > 46.8 && t < 51.8;
  // Reh 59–70 s: tritt aus dem Wald auf die Lichtung vor dem Podest
  const rehZust = (t) => {
    const k = smoothstep(59, 64, t), x = lerp(2.5, -3.5, k), z = lerp(-29, -26, k) + 0.6 * smoothstep(64.5, 70, t);
    const gehen = (t > 59 && t < 63.6) ? 1 : 0.15, kopf = smoothstep(63.5, 65, t) * (1 - smoothstep(67.5, 69, t));
    return [x, z, Math.PI * 0.82, gehen, kopf];
  };
  // Eichelhäher 64,5–68 s: fliegt nah vorbei, von rechts nach links
  const haeherZust = (t) => {
    if (t < 64.5 || t > 68.2) return null;
    const k = (t - 64.5) / 3.7, x = lerp(7, -8, k), z = lerp(-7, -10, k), y = 6.6 + 1.2 * Math.sin(k * Math.PI);
    return { p: [x, y, z], dreh: -Math.PI / 2 - 0.25 };
  };
  const nebelPuffs = (t) => {
    const a = nebelMorgen(t); if (a < 0.01) return [];
    const out = [];
    for (let i = 0; i < 90; i++) { const x = -60 + 120 * hash(i, 501), z = -8 - 160 * hash(i, 502) ** 0.8, r = 7 + 9 * hash(i, 503);
      out.push({ p: [x + 3 * Math.sin(t * 0.3 + i), hoehe(x, z) + 1.2 + 1.5 * hash(i, 504), z], r, dreh: i, farbe: [0.86, 0.88, 0.9], a: 0.32 * a, licht: 0.9, bild: i % 4 }); }
    return out;
  };
  const staubPuffs = (t) => {
    if (!drescherAn(t)) return [];
    const out = [], x0 = drescherX(t);
    for (let i = 0; i < 26; i++) { const tau = (i / 26) * 2.2, x = x0 - tau * 26 - 3, r = 2 + 2.5 * tau;
      out.push({ p: [x, hoehe(x, -78) + 2 + tau * 1.5, -78 + 2 * Math.sin(i)], r, dreh: i, farbe: [0.72, 0.64, 0.5], a: 0.28 * (1 - tau / 2.2) * smoothstep(46.8, 47.4, t) * (1 - smoothstep(51.2, 51.8, t)), licht: 1, bild: i % 4 }); }
    return out;
  };
  const strahl = (t) => {                                // Lichtstrahl durch die Lücke im Kronendach auf das Podest
    const a = 0; if (a < 0.01) return [];
    const out = [];
    for (let i = 0; i < 22; i++) { const k = i / 21, d = 5 + k * 26;
      out.push({ p: [AUGE[0] + SONNE_HIER[0] * d + 0.6, AUGE[1] - 2.2 + SONNE_HIER[1] * d, AUGE[2] + SONNE_HIER[2] * d], r: 0.35 + 1.1 * k, dreh: i, farbe: [0.9, 0.84, 0.62].map((c) => c * 0.07 * a), a: 1, licht: 0, bild: i % 4 }); }
    return out;
  };

  // ---------------------------------------------------------------- Protokoll (Klang an genau diesen Stellen, atmo.py)
  const prot = new Protokoll();
  prot.effekt(1.0, "kraehen", { klang: "fluegel", staerke: 0.6, text: "Krähen über dem reifen, ungeernteten Weizen" })
    .effekt(4.5, "weizen_legt_sich", { klang: "windstoss", staerke: 0.4, text: "Herbst 1882: Halme legen sich" })
    .effekt(10.0, "morgennebel", { klang: false })
    .effekt(16.5, "erste_buesche", { klang: false })
    .effekt(22.4, "kraehen_fliegen_auf", { klang: "fluegel", staerke: 0.8 })
    .effekt(22.8, "linke_haelfte_gerodet", { klang: "truemmer", staerke: 0.35, dauer: 1, text: "1900: linke Hälfte wird gerodet" })
    .effekt(25.5, "abendrot", { klang: false })
    .effekt(31.0, "dickicht", { klang: "windstoss", staerke: 0.35 })
    .effekt(36.0, "kronen_ueber_podest", { klang: "windstoss", staerke: 0.45, text: "Herbstlaub leuchtet über Augenhöhe" })
    .effekt(38.6, "morgennebel", { klang: false })
    .effekt(42.6, "schafe", { klang: false, text: "Schafe auf der gerodeten Hälfte (1960–2000)" })
    .effekt(47.0, "maehdrescher", { klang: "grollen", staerke: 0.25, dauer: 4.5, text: "Ernte auf dem Nachbarfeld" })
    .effekt(52.3, "schafe_weg", { klang: false })
    .effekt(54.0, "kronendach_schliesst", { klang: "windstoss", staerke: 0.5, dauer: 3 })
    .effekt(T_HIER, "sonne_bricht_durch", { klang: "windstoss", staerke: 0.9, dauer: 2.5, text: "2026: Sonne bricht durch, Lichtfleck auf dem Podest" })
    .effekt(60.4, "voegel_auf", { klang: "fluegel", staerke: 0.7 })
    .effekt(61.0, "reh", { klang: false })
    .effekt(64.5, "eichelhaeher", { klang: "fluegel", staerke: 0.9 })
    .effekt(65.0, "samen_im_wind", { klang: "windstoss", staerke: 0.4, dauer: 3 });
  prot.melde({ t: 19, typ: "kamera", art: "schwenk", dauer: 5.5, text: "Schwenk nach links zur gerodeten Hälfte", klang: false })
    .melde({ t: 27, typ: "kamera", art: "schwenk", dauer: 8, text: "Schwenk nach rechts zum Dickicht und den Kronen", klang: false })
    .melde({ t: 39, typ: "kamera", art: "schwenk", dauer: 9, text: "Schwenk zur Mitte: Schafe links, Ernte nebenan", klang: false })
    .melde({ t: 44, typ: "kamera", art: "zoom", dauer: 13, von: 56, bis: 62, text: "Blick hebt sich in die Kronen, Brennweite weiter (56° → 62°)", klang: false })
    .melde({ t: 61, typ: "kamera", art: "schwenk", dauer: 5.5, text: "Blick sinkt zurück auf Lichtung, Wald und Wiese", klang: false });

  const sonneV = new THREE.Vector3(), fwd = new THREE.Vector3(), cT = new THREE.Color();
  const welt = { szene, kamera: kam, post: {}, update(t) {
    pov.fov = keyframes(FOV, t);
    pov.zielKeys = [{ t: 0, v: zielBei(t) }];
    const z = pov.anwenden(t);
    himmel.folge(kam);
    const Y = jahr(Math.min(t, 60)), f = phi(t), s = f - Math.floor(f), sch = schneeBei(t), dd = unterDach(t), br = durchbruch(t);
    const sd = t < 55 ? sonnenR(t) : SONNE_HIER;
    const zen = cT.copy(zenit(t)).lerp(new THREE.Color("#A8AEB4"), 0.5 * sch).clone();
    const hor = horizont(t).clone().lerp(new THREE.Color("#D8DADC"), 0.5 * sch);
    himmel.setze({ zenit: zen, horizont: hor, unten: hor.clone().multiplyScalar(0.6), sonnenRichtung: sd, sonnenFarbe: sonnenF(t), sonnenStaerke: 22 + 30 * br, glanz: 0.55 + 0.6 * br, zirren: 0.35 + 0.2 * Math.sin(t * 0.2) });
    szene.fog.color.copy(hor); szene.fog.density = nebelDichte(t);
    sonneV.set(...sd).normalize();
    fwd.set(...zielBei(t)).sub(kam.position).setY(0).normalize();
    sonne.position.copy(kam.position).addScaledVector(fwd, 18).addScaledVector(sonneV, 150); sonne.target.position.copy(kam.position).addScaledVector(fwd, 18); sonne.target.updateMatrixWorld();
    sonne.color.copy(sonnenF(t)); sonne.intensity = lichtStaerke(t) * (1 - 0.3 * sch) * (1 - 0.35 * dd);
    hemi.intensity = (1.0 + 0.15 * dd) * (1 + 0.2 * sch); hemi.color.copy(zen).lerp(new THREE.Color("#C8D8C4"), 0.5 + 0.3 * dd); hemi.groundColor.set("#6A6846");
    welt0.setze(t, kam, { Y, s, schnee: sch, wind: wind(t), ernteX: drescherAn(t) ? drescherX(t) : -9999, schafe: 1, reh: t > 59 ? 1 : 0, rehPos: rehZust(t), haeher: haeherZust(t), drescher: drescherAn(t) ? [drescherX(t), -78] : null });
    kraehen.mesh.visible = t < 27; kraehen.setze(t);
    singvoegel.mesh.visible = t > 28; singvoegel.setze(t);
    tauben.mesh.visible = t < 50; tauben.setze(t);
    const wz = wolkenZeit(t);
    puffs.setze([...wolken(wz).map((w) => ({ ...w, p: [((w.p[0] + 2600) % 5200 + 5200) % 5200 - 2600, w.p[1], w.p[2]] })), ...nebelPuffs(t), ...staubPuffs(t)], kam);
    glanz.setze(strahl(t), kam);
    stern.setze({ p: STERN, staerke: 30 * br * (1 - smoothstep(62.5, 65, t)), groesse: 0.7 + 0.5 * br });
    const herbst = smoothstep(0.58, 0.64, s) * (1 - smoothstep(0.72, 0.78, s)) * smoothstep(1905, 1925, Y);
    blaetter.setze(t, kam, { deckkraft: 0.8 * herbst, wind: [1.2 + 2 * wind(t), -0.4, 0.6] });
    const schneeFall = smoothstep(0.64, 0.78, s) * (1 - smoothstep(0.84, 0.96, s)) * smoothstep(0.1, 0.4, sch);
    schneeT.setze(t, kam, { deckkraft: 0.7 * schneeFall });
    samen.setze(t, kam, { zentrum: [kam.position.x - 2, kam.position.y - 1, kam.position.z - 7], deckkraft: 0.85 * smoothstep(63.5, 65.5, t) * (1 - smoothstep(69, 70.5, t)), wind: [-1.6, -0.2, 0.3] });
    pollen.setze(t, kam, { zentrum: [kam.position.x + 1, kam.position.y + 1, kam.position.z - 5], deckkraft: 0.6 * smoothstep(59.6, 61, t) * (1 - smoothstep(68, 70, t)), wind: [0.2, 0.05, 0.1] });
    const fp = farben(t);
    Object.assign(welt.post, fp, { belichtung: fp.belichtung * (1 + 0.12 * Math.max(0, br - 0.55)), vignette: 0, koernung: 0.008, tiltStaerke: 0 });
    return z;
  } };

  // ---------------------------------------------------------------- Text: Titel, Anzeige, Sätze, Abspann (1:1 aus dem Skript)
  const TITEL = "Was wäre, wenn du einen Acker 144 Jahre lang in Ruhe lässt?";
  const FAKT = "HARPENDEN, ENGLAND, 1882 · KEIN BAUM GEPFLANZT, HEUTE LAUBWALD";
  const SAETZE = [
    [4.8, "Ein Weizenfeld in England, ohne Pflug und Ernte.", 3.6], [9.0, "Nach vier Jahren ist der Weizen kaum zu erkennen.", 3.6],
    [13.2, "Unkraut und Gras übernehmen den Boden.", 3.6], [17.4, "Dann tauchen die ersten Büsche auf.", 3.8],
    [23.0, "Die linke Hälfte wird nun jedes Jahr gerodet.", 3.7], [27.4, "Rechts bleibt alles, wie es wächst.", 3.4],
    [31.4, "Weißdorn schließt sich zu einem Dickicht.", 3.6], [35.6, "Esche und Bergahorn wachsen über dich hinaus.", 4.3],
    [40.6, "Jeder Baum zieht Kohlenstoff aus der Luft.", 3.8], [45.0, "Auf der gerodeten Seite grasen jetzt Schafe.", 3.8],
    [49.4, "Nebenan wird weiter Weizen geerntet.", 3.6], [53.6, "Über dir ist kaum noch Himmel.", 4.0],
    [62.6, "Niemand hat hier einen Baum gepflanzt.", 3.2], [66.4, "Vögel und Wind haben den Wald gesät.", 3.4],
  ];
  const anzeige = (t) => {
    const Y = jahr(Math.min(t, 60));
    if (t < 20) return { etikett: "JAHR", zahl: String(Math.floor(Y)), einheit: "", unter: "ZEITRAFFER: 1 SEKUNDE = 6 MONATE", wert: Y };
    if (t < 40) return { etikett: "JAHRE OHNE PFLUG", zahl: String(Math.floor(ohnePflug(Y))), einheit: "", unter: "1 SEKUNDE = 2,9 JAHRE", wert: ohnePflug(Y) };
    if (t < 52) return { etikett: "KOHLENSTOFF GEBUNDEN", zahl: String(Math.round(kohlenstoff(Y))), einheit: "t/ha", unter: "TONNEN PRO HEKTAR · 1950 BIS 1999", wert: kohlenstoff(Y) };
    if (t < T_HIER) return { etikett: "JAHR", zahl: String(Math.floor(Y)), einheit: "", unter: "1 SEKUNDE = 3,4 JAHRE", wert: Y };
    return { etikett: "JAHR", zahl: "HIER", einheit: "", unter: "", wert: 2026 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE });

  const ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices, auge: AUGE, phi: PHI };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
