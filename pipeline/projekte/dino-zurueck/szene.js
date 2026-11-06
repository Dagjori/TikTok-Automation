// Account 2 @stelldirvor.pov – „Was wäre, wenn die Erde zurück in die Zeit der Dinosaurier spulen würde?“ (Skript acc2-2026-11-06-mittag)
// Welt: Flussmündung mit Anhöhe in gemäßigten Breiten (engine/welt_muendung.js, Erstbau 06.11.2026), erhöhter Standpunkt, eine durchgehende Einstellung.
// Zeitraffer rückwärts: Anzeige y(t) = ∫ r dt in Jahren vor heute (sim/dino_zurueck.mjs, ICS 2024: 2,58 / 23,04 / 66,00 Mio.); Vegetation, Meeresspiegel,
// Eis und Tiere sind Funktionen derselben Zeit, die Epoche folgt der Anzeige (Quartär 0–18 s, Neogen 18–32 s, Paläogen 32–58 s, Kreide ab 58 s).
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes, hash } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Himmel, Puffs, Partikel, Voegel, Truemmer, PovKamera, farbPhasen, Protokoll, wolkenFeld } from "../../engine/stil_lunar_pov.js";
import { LunarHUD, zahlDE } from "../../engine/lunar_hud.js";
import { Muendung, hoehe, flussX, KNOSPE, AUGE } from "../../engine/welt_muendung.js";
import { jahre, epoche } from "../../sim/dino_zurueck.mjs";

const FPS = 30, DAUER = 80, T_HIER = 58;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 4096;
const D2R = Math.PI / 180;
const richtung = (yaw, pitch) => [Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R)];
const L = ease.inOutSine;
const K = (keys, e = L) => (t) => keyframes(keys.map(([tt, v, ee]) => ({ t: tt, v, e: ee || e })), t);
const Kc = (keys) => { const R = K(keys.map(([t, h]) => [t, new THREE.Color(h).r])), G = K(keys.map(([t, h]) => [t, new THREE.Color(h).g])), B = K(keys.map(([t, h]) => [t, new THREE.Color(h).b])); const c = new THREE.Color(); return (t) => c.setRGB(R(t), G(t), B(t)); };

// ------------------------------------------------------------------------------ Kamera (Grad): yaw + = rechts (Landeinwärts), pitch − = nach unten
const KX = K([[0, KNOSPE.x], [32, KNOSPE.x], [45, -26], [54, -26], [66, -8], [80, -8]]);
const KZ = K([[0, KNOSPE.z], [20, 12], [32, 10], [45, -12], [54, -12], [58, -14], [66, -30], [80, -32]]);
const KYAW = K([[0, 10], [3, 10], [10, 24], [20, 46], [32, 40], [45, 6], [54, 22], [58, 29], [66, 30], [70, 28]]);
const KPITCH = K([[0, -9], [10, -10], [20, -11], [32, -11], [45, -12], [54, -12], [58, -12], [66, -9], [70, -9]]);
const KFOV = K([[0, 56], [3, 56], [20, 54], [45, 56], [53, 56], [58, 50], [66, 46], [70, 46]]);
const posBei = (t) => { const x = KX(t), z = KZ(t); return [x, hoehe(x, z) + AUGE.hoehe, z]; };
const zielBei = (t) => { const p = posBei(t), d = richtung(KYAW(t), KPITCH(t)); return [p[0] + d[0] * 100, p[1] + d[1] * 100, p[2] + d[2] * 100]; };

// ------------------------------------------------------------------------------ Zustände je Zeit
// Meeresspiegel und Eis: Kaltzeiten im Takt (8–19 s), Pegel −44 m (relativ, im Bild keine Zahl)
const MEER_K = K([[0, 0], [4.6, 0], [8.0, 1], [11.2, 1], [12.0, 0.62], [12.9, 1], [13.8, 0.5], [14.7, 1], [15.5, 0.36], [16.2, 0.95], [16.9, 0.28], [17.6, 0.8], [18.6, 0.2], [20.5, 0]]);
const EIS_K = (t) => MEER_K(t - 1.1) * smoothstep(7.4, 10.0, t);
const PEGEL_NEU = K([[20.5, 0], [24, 5], [30, 5], [33.5, 6], [36.5, 9], [38.5, 16], [41, 21.2], [50, 21.6], [58, 22.2], [80, 22.2]]);
const pegel = (t) => (t < 20.5 ? -44 * MEER_K(t) : PEGEL_NEU(t));
const gewicht = {
  fichte: K([[0, 0.55], [1.2, 0.3], [2.4, 0.6], [3.6, 0.35], [5, 0.55], [8, 0.3], [12, 0.18], [18.6, 0.3], [21, 0.55], [27, 0.5], [31, 0.3], [35, 0]]),
  laub: K([[0, 0.8], [1.2, 0.5], [2.4, 0.85], [3.6, 0.45], [5, 0.78], [6.5, 0.7], [9, 0.22], [13, 0.1], [18.6, 0.2], [21, 0.4], [25, 0.55], [28, 0.95], [31, 1.0], [36, 0.7], [42, 0.2], [46, 0]]),
  palme: K([[0, 0], [31, 0], [34, 0.5], [38, 0.85], [46, 0.9], [56, 0.85], [60, 0.8]]),
  baumfarn: K([[0, 0], [33, 0], [38, 0.3], [44, 0.8], [50, 1.0]]),
  arau: K([[0, 0], [44, 0], [50, 0.3], [56, 0.8], [60, 1]]),
  farn: K([[0, 0.05], [8, 0], [18.6, 0], [30, 0.05], [36, 0.35], [42, 0.8], [50, 1]]),
  busch: K([[0, 0.35], [1.4, 0.15], [2.8, 0.4], [6, 0.3], [9, 0.2], [14, 0.3], [18.6, 0.35], [21, 0.5], [23, 0.85], [27, 1.0], [31, 0.55], [34, 0.2], [38, 0]]),
  gras: K([[0, 0.55], [1.4, 0.3], [2.8, 0.62], [6, 0.55], [9, 0.3], [18.6, 0.35], [21, 0.8], [25, 1.0], [29, 0.8], [32, 0.4], [37, 0]]),
};
const schnee = (t) => 0.55 * smoothstep(7.5, 10, t) * (1 - smoothstep(18.2, 20.5, t)) * (0.7 + 0.3 * MEER_K(t));
const wald = K([[0, 0.5], [9, 0.2], [20, 0.1], [29, 0.7], [36, 0.8], [50, 1]]);
const wind = K([[0, 0.9], [1.2, 1.6], [3, 1.1], [20, 0.9], [37, 1.2], [53, 0.9], [54.4, 1.2], [54.9, 3.2], [56.5, 2.0], [58.5, 1.1], [80, 0.8]]);

const grund = Kc([[0, "#6A8A3C"], [7, "#6E8A3E"], [10, "#8A8472"], [18, "#8E8A78"], [21, "#9AA24A"], [26, "#A5A950"], [30, "#5E7E3A"], [36, "#3F6B2E"], [46, "#3A6A2E"], [54, "#325E28"], [80, "#325E28"]]);
const grund2 = Kc([[0, "#8E9F4C"], [10, "#9A9580"], [21, "#B5B063"], [30, "#6E8E40"], [36, "#4C7A34"], [54, "#3C6C2E"], [80, "#3C6C2E"]]);
const streu = Kc([[0, "#3C4A24"], [10, "#6A6252"], [21, "#6A6A38"], [30, "#3A4A22"], [36, "#24381A"], [80, "#1F3317"]]);
const sand = Kc([[0, "#D2C08F"], [36, "#CDBB8A"], [80, "#C9B98A"]]);
const mud = Kc([[0, "#8C8670"], [10, "#7A7A72"], [20, "#8C8670"], [80, "#8C8670"]]);
const tief = Kc([[0, "#1D4660"], [8, "#27495E"], [18, "#27495E"], [24, "#1D4A63"], [40, "#1A5A6A"], [80, "#1A5A68"]]);
const flach = Kc([[0, "#3F7F86"], [9, "#527E88"], [19, "#527E88"], [26, "#3F8088"], [40, "#3AA098"], [80, "#3A9C92"]]);
const tint_sonne = Kc([[0, "#FFD2A0"], [8, "#FFE2C2"], [18, "#FFF2E0"], [32, "#FFF6E6"], [45, "#FFE9C4"], [58, "#FFD79A"], [70, "#FFC27E"], [80, "#FFC27E"]]);
const zenitK = Kc([[0, "#6E8FC4"], [9, "#7FA0C8"], [18, "#6F96CA"], [30, "#4F83C6"], [45, "#5B87BE"], [58, "#6F86B2"], [70, "#6078A8"], [80, "#6078A8"]]);
const horizontK = Kc([[0, "#EACFB0"], [9, "#DDE6EE"], [18, "#E3E9EE"], [30, "#D6E3EE"], [45, "#E6DDC8"], [58, "#F3CFA0"], [70, "#F2B880"], [80, "#F2B880"]]);
const EL = K([[0, 11], [8, 20], [20, 46], [30, 58], [45, 46], [58, 24], [70, 10], [80, 8]]);
const AZ = K([[0, 66], [10, 100], [20, 150], [30, 182], [45, 240], [58, 275], [70, 296], [80, 300]]);     // Grad von Nord im Uhrzeigersinn: Ost → Süd → West
const sonneRichtung = (t) => { const el = EL(t) * D2R, az = AZ(t) * D2R; return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)]; };

async function start() {
  aktiviereHoehenNebel({ abfall: 0.003, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#CFD9E2", 3.2e-4);
  const kam = new THREE.PerspectiveCamera(56, 1080 / 1920, 0.3, 40000);
  const welt0 = new Muendung(szene, { schatten: SCHATTEN > 0 });
  const himmel = new Himmel(szene, { radius: 9000, zenit: "#6E8FC4", horizont: "#EACFB0", unten: "#8F9A88", dunst: 0.26, sonnenRichtung: sonneRichtung(0), sonnenStaerke: 30, glanz: 0.75, zirren: 0.3 });
  const pov = new PovKamera(kam, { pos: posBei(0), ziel: zielBei(0), fov: 56 }).atmen({ staerke: 1 }).beben({ von: 54.3, bis: 57.2, staerke: 0.1 });

  const hemi = new THREE.HemisphereLight("#BFD2E8", "#6C7A48", 1.2);
  const sonne = new THREE.DirectionalLight("#FFF0D8", 2.6);
  sonne.castShadow = SCHATTEN > 0; sonne.shadow.mapSize.set(SCHATTEN || 1, SCHATTEN || 1);
  Object.assign(sonne.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 1, far: 1200 });
  sonne.shadow.bias = -0.0004; sonne.shadow.normalBias = 0.12;
  const fuell = new THREE.DirectionalLight("#FFF4E0", 0.5); fuell.position.set(-30, 60, 120); szene.add(hemi, sonne, sonne.target, fuell);

  const puffs = new Puffs(szene, { max: 700, schatten: 0.15 });
  const glanzP = new Puffs(szene, { max: 60, additiv: true, nebel: false, renderOrder: 12 });
  const schneeT = new Partikel(szene, { art: "schnee", anzahl: 2800, box: [46, 24, 46], seed: 43 });
  const pollen = new Partikel(szene, { art: "staub", anzahl: 1100, box: [24, 12, 30], seed: 41, groesse: 0.04, farbe: "#FFF3CC", fall: 0.02, wirbel: 1.4 });
  const blaetter = new Partikel(szene, { art: "staub", anzahl: 900, box: [30, 16, 30], seed: 45, groesse: 0.12, farbe: "#6B8A2A", fall: 0.6, wirbel: 1.3 });
  const moewen = new Voegel(szene, { anzahl: 16, seed: 51, farbe: "#F3F3F0", spannweite: 1.6 }).schwarm({ zentrum: [-10, 52, -250], radius: 70, hoehe: 12, tempo: 9, anzahl: 16 });
  const raben = new Voegel(szene, { anzahl: 14, seed: 52, farbe: "#26262A", spannweite: 0.9 }).schwarm({ zentrum: [30, 30, -40], radius: 8, hoehe: 4, tempo: 5, anzahl: 14 }).flucht({ t0: 54.7, richtung: [0.6, 0.55, -0.8], tempo: 17 });
  const kraniche = new Voegel(szene, { anzahl: 12, seed: 53, farbe: "#E9E6DE", spannweite: 1.4 }).schwarm({ zentrum: [60, 70, -100], radius: 85, hoehe: 9, tempo: 10, anzahl: 12 });
  const aeste = new Truemmer(szene, { anzahl: 40, form: "ast", farben: ["#5A4330", "#4A3828"], groesse: [0.8, 1.6], seed: 77 }).wurf({ t0: 54.6, ursprung: [8, 22, -52], streuung: [12, 3, 8], richtung: [3, 9, -4], tempoStreuung: 0.6, wind: [2, 0, -1], luft: 0.5, anzahl: 40, drehung: 4 });
  const wolken = wolkenFeld({ anzahl: 20, bereich: { x: [-3200, 3200], z: [-4200, -900] }, hoehe: [700, 1300], groesse: 170, farbe: "#F4F3EF", a: 0.8, wind: [16, 0], seed: 15 });
  const wolkenZeit = (t) => 2.2 * t + 150 * (1 - Math.exp(-t / 2.8));

  // ---------------------------------------------------------------- Tiere
  const ufer = (x, level) => { for (let z = 10; z > -260; z -= 0.5) if (hoehe(x, z) < level) return z + 0.5; return -120; };
  const T = welt0.tiere;
  // Kaltzeit: Mammutherde zieht am Eisrand vorbei (12–19 s)
  for (let i = 0; i < 7; i++) T.add("mammut", { p0: [175 - 12 * i + 6 * hash(i, 3), -150 - 11 * hash(i, 5) - 3 * i], v: [-2.4 - 0.4 * hash(i, 6), 0.1], von: 11.2 + 0.15 * i, bis: 19.2, skala: 1.9 + 0.2 * hash(i, 7), gang: 1.0, seed: 10 + i });
  // Neogen: dreizehige Pferde auf dem Grasland (20,6–32 s)
  for (let i = 0; i < 6; i++) T.add("pferd", { p0: [190 - 16 * i + 6 * hash(i, 2), -85 - 16 * hash(i, 4) - 5 * i], v: [-3.4, -0.2], von: 20.2 + 0.2 * i, bis: 32.6, skala: 1.7, gang: 1.7, seed: 30 + i });
  // Paläogen: Krokodile am Ufer (ab 41 s), Kleinsäuger im Unterholz (49,6–54,6 s)
  for (const [i, x] of [-50, -34, -20, -6].entries()) T.add("krokodil", { p0: [x, ufer(x, 21.6) + 2.5 + hash(i, 4) * 2], v: [0, 0], yaw: -Math.PI / 2 + (hash(i, 9) - 0.5) * 1.0 + (i % 2 ? 0.7 : -0.7), von: 40.4 + 0.3 * i, bis: 59, skala: 1.9, seed: 50 + i });
  for (let i = 0; i < 7; i++) T.add("klein", { p0: [-20 + 30 * hash(i, 2), -22 - 30 * hash(i, 3)], v: [(hash(i, 4) - 0.5) * 10, -1.5 - 3 * hash(i, 5)], von: 49.4 + 0.5 * i, bis: 54.8, ein: 0.3, aus: 0.4, skala: 3.0, gang: 3, seed: 70 + i });
  // Kreide: Herde tritt ans Ufer (ab 57,6 s), trinkt ab 62 s, Flugsaurier kreisen
  const herde = [["sauropode", -34, 1.0], ["sauropode", 6, 1.1], ["hadrosaurier", -56, 1.0], ["hadrosaurier", -16, 1.0], ["hadrosaurier", 22, 1.0], ["ceratopsier", -44, 1.0], ["ceratopsier", 40, 1.0]];
  herde.forEach(([typ, x, sk], i) => { const zs = ufer(x, 22.0) + (typ === "sauropode" ? 8 : 5.5); T.add(typ, { p0: [x + 3 * hash(i, 5), zs + 17], v: [0, -4.1], stopp: 61.8, von: 57.6 + 0.12 * i, bis: 999, ein: 0.5, skala: sk, gang: typ === "sauropode" ? 0.55 : 0.8, yaw: Math.PI / 2 * -1 + (hash(i, 8) - 0.5) * 0.7 + 0.0, seed: 90 + i, trinkt: [62.2 + 0.4 * hash(i, 9)] }); });
  for (let i = 0; i < 5; i++) T.add("flugsaurier", { kreis: { c: [10 + 20 * hash(i, 3), -150 + 12 * i], R: 44 + 14 * i, h: 52 + 5 * i, om: (i % 2 ? 1 : -1) * (0.13 + 0.02 * i), w0: i * 1.3 }, von: 57.6 + 0.2 * i, bis: 999, ein: 0.4, skala: 1.5, seed: 120 + i });

  // ---------------------------------------------------------------- Farben, Dunst, Lichtstrahl
  const farben = farbPhasen([
    { t: 0, werte: { belichtung: 1.1, saettigung: 1.02, kontrast: 1.07, tonung: [1.08, 1.0, 0.88], tonungStaerke: 0.28, bloomStaerke: 1.15 } },
    { t: 8, werte: { belichtung: 1.1, saettigung: 0.84, kontrast: 1.05, tonung: [0.92, 0.98, 1.1], tonungStaerke: 0.3, bloomStaerke: 1.0 } },
    { t: 19, werte: { belichtung: 1.1, saettigung: 0.86, kontrast: 1.05, tonung: [0.94, 0.99, 1.08], tonungStaerke: 0.26, bloomStaerke: 1.0 } },
    { t: 21.5, werte: { belichtung: 1.14, saettigung: 1.06, kontrast: 1.08, tonung: [1.04, 1.0, 0.94], tonungStaerke: 0.2, bloomStaerke: 1.0 } },
    { t: 35, werte: { belichtung: 1.12, saettigung: 1.1, kontrast: 1.07, tonung: [1.04, 1.02, 0.94], tonungStaerke: 0.2, bloomStaerke: 1.05 } },
    { t: 47, werte: { belichtung: 1.08, saettigung: 1.08, kontrast: 1.07, tonung: [1.12, 1.02, 0.86], tonungStaerke: 0.32, bloomStaerke: 1.2 } },
    { t: 58.2, werte: { belichtung: 1.1, saettigung: 1.08, kontrast: 1.08, tonung: [1.14, 1.0, 0.82], tonungStaerke: 0.36, bloomStaerke: 1.35, bloomSchwelle: 0.92 } },
    { t: 70, werte: { belichtung: 1.0, saettigung: 1.06, kontrast: 1.08, tonung: [1.16, 0.98, 0.78], tonungStaerke: 0.4, bloomStaerke: 1.25 } },
  ]);
  const dunstPuffs = (t, a) => {
    if (a < 0.03) return [];
    const out = [];
    for (let i = 0; i < 90; i++) {
      const x = -380 + 780 * hash(i, 601), z = 60 - 520 * Math.pow(hash(i, 602), 0.85), r = 22 + 40 * hash(i, 603);
      out.push({ p: [x + 9 * Math.sin(t * 0.22 + i), Math.max(hoehe(x, z), pegel(t)) + 5 + 7 * hash(i, 604), z], r, dreh: i, farbe: [0.93, 0.9, 0.82], a: 0.14 * a, licht: 0.9, bild: i % 4 });
    }
    return out;
  };
  const strahl = (t, a, ziel) => {
    if (a < 0.02) return [];
    const out = [];
    for (let i = 0; i < 26; i++) { const k = i / 25; out.push({ p: [ziel[0] + 38 * (1 - k), ziel[1] + 70 * (1 - k) + 3, ziel[2] - 26 * (1 - k)], r: 4 + 9 * (1 - k * 0.5), dreh: i, farbe: [1.0, 0.82, 0.52].map((c) => c * 0.05 * a), a: 1, licht: 0, bild: i % 4 }); }
    return out;
  };
  const herdeZiel = [-12, 24, ufer(-12, 22) + 6];

  // ---------------------------------------------------------------- Protokoll (Klang an genau diesen Stellen, atmo.py)
  const prot = new Protokoll();
  prot.effekt(0.6, "wald_zeitraffer", { klang: false, text: "Bäume wachsen im Rückwärts-Zeitraffer zurück und fallen" })
    .effekt(1.0, "wolkenjagd", { klang: "windstoss", staerke: 0.6, dauer: 3, text: "Wolken jagen über die Mündung" })
    .effekt(2.4, "moewen_steigen", { klang: "fluegel", staerke: 0.5, text: "Möwen kreisen über dem Meer" })
    .effekt(5.0, "meer_weicht", { klang: "gischt", staerke: 0.5, dauer: 3.5, text: "Das Meer zieht sich weit aus der Mündung zurück" })
    .effekt(8.2, "gletscher_schiebt", { klang: "grollen", staerke: 0.55, dauer: 3, text: "Eis schiebt sich als Gletscherzunge ins Tal, Licht wird kalt" })
    .effekt(11.4, "mammuts", { klang: false, text: "Mammutherde am Eisrand" })
    .effekt(12.9, "eis_pulsiert_1", { klang: "grollen", staerke: 0.35, dauer: 1.5 })
    .effekt(14.7, "eis_pulsiert_2", { klang: "grollen", staerke: 0.4, dauer: 1.2 })
    .effekt(16.2, "eis_pulsiert_3", { klang: "grollen", staerke: 0.4, dauer: 1.0 })
    .effekt(18.6, "eis_schmilzt", { klang: "zischen", staerke: 0.5, dauer: 2.5, text: "Das Eis schmilzt endgültig, das Licht wird warm" })
    .effekt(20.4, "pferde", { klang: false, text: "Dreizehige Pferde auf dem Grasland" })
    .effekt(24.0, "gras_staubt", { klang: "windstoss", staerke: 0.3, dauer: 3 })
    .effekt(27.0, "wald_schliesst", { klang: false, text: "Büsche und Bäume erobern das Grasland" })
    .effekt(32.0, "palmen_farne", { klang: "windstoss", staerke: 0.4, dauer: 3, text: "Palmen und Farne am Ufer" })
    .effekt(36.4, "meer_steigt", { klang: "gischt", staerke: 0.7, dauer: 4.5, text: "Das Meer steigt und flutet die Flussmündung" })
    .effekt(40.4, "krokodile", { klang: false, text: "Krokodile am warmen Ufer" })
    .effekt(46.0, "dunst", { klang: false, text: "Schwüler Dunst, goldenes Licht" })
    .effekt(49.6, "kleinsaeuger", { klang: false, text: "Kleine Säugetiere huschen durchs Unterholz" })
    .effekt(54.5, "aeste_brechen", { klang: "truemmer", staerke: 0.9, text: "Schwere Äste brechen im Unterholz" })
    .effekt(54.8, "voegel_fliegen_auf", { klang: "fluegel", staerke: 0.9, text: "Vögel fliegen auf" })
    .effekt(T_HIER, "lichtstrahl", { klang: "zischen", staerke: 0.5, dauer: 3, text: "Lichtstrahl bricht durch den Dunst, die Herde tritt ans Ufer" })
    .effekt(58.6, "herde_tritt", { klang: "grollen", staerke: 0.6, dauer: 3.5 })
    .effekt(62.6, "herde_trinkt", { klang: false });
  prot.melde({ t: 0.0, typ: "kamera", art: "fahrt", dauer: 20, text: "Sehr langsame Fahrt über die Anhöhe nach vorn", klang: false })
    .melde({ t: 3, typ: "kamera", art: "schwenk", dauer: 17, text: "Schwenk vom Fluss ins Land, yaw 10° → 46°", klang: false })
    .melde({ t: 32, typ: "kamera", art: "fahrt", dauer: 13, text: "Fahrt an die Kante der Anhöhe, Blick zum Meer", klang: false })
    .melde({ t: 45, typ: "kamera", art: "schwenk", dauer: 9, text: "Blick landeinwärts auf das Unterholz am Ufer", klang: false })
    .melde({ t: 54, typ: "kamera", art: "zoom", dauer: 12, von: 56, bis: 46, text: "Sanfter Zoom auf Unterholz und Herde, Brennweite 56° → 46°, ab 58 s Fahrt auf die Herde", klang: false });

  const sonneV = new THREE.Vector3(), fwd = new THREE.Vector3(), tmp = new THREE.Color(), tmpB = new THREE.Color();
  const welt = { szene, kamera: kam, post: {}, update(t) {
    pov.fov = KFOV(t); pov.posKeys = [{ t: 0, v: posBei(t) }]; pov.zielKeys = [{ t: 0, v: zielBei(t) }];
    pov.anwenden(t);
    himmel.folge(kam);
    const sd = sonneRichtung(t), hz = horizontK(t), sf = tint_sonne(t), hoheS = EL(t) * D2R;
    const peg = pegel(t), eis = EIS_K(t), sn = schnee(t), wi = wind(t);
    himmel.setze({ zenit: zenitK(t), horizont: hz, unten: tmpB.copy(hz).multiplyScalar(0.55), sonnenRichtung: sd, sonnenFarbe: sf, sonnenStaerke: 30, glanz: 0.7 + 0.2 * smoothstep(45, 70, t), zirren: 0.22 + 0.2 * smoothstep(7, 10, t) });
    szene.fog.color.copy(hz).lerp(tmp.set("#C9D6E2"), 0.2);
    const dunst = smoothstep(40, 48, t);
    szene.fog.density = lerp(3.4e-4, 2.0e-4, smoothstep(0, 9, t)) * (1 + 0.9 * dunst) * (1 + 0.5 * smoothstep(8, 10, t) * (1 - smoothstep(18, 21, t)));
    sonneV.set(...sd).normalize();
    fwd.set(...zielBei(t)).sub(kam.position).setY(0).normalize();
    sonne.position.copy(kam.position).addScaledVector(fwd, 60).addScaledVector(sonneV, 520); sonne.target.position.copy(kam.position).addScaledVector(fwd, 60); sonne.target.updateMatrixWorld();
    sonne.color.copy(sf); sonne.intensity = 1.5 + 2.2 * Math.min(1, Math.sin(Math.max(hoheS, 0.02)) / 0.75);
    hemi.intensity = 1.25 + 0.2 * (sn > 0.1 ? 1 : 0); hemi.color.copy(zenitK(t)).lerp(tmp.set("#DDE8F2"), 0.5); hemi.groundColor.copy(grund(t)).multiplyScalar(0.55);
    fuell.intensity = 0.5; fuell.color.copy(sf).lerp(tmp.set("#FFFFFF"), 0.4);
    const gw = {}; for (const k of Object.keys(gewicht)) gw[k] = gewicht[k](t);
    const S = { pegel: peg, eis, schnee: sn, wind: wi, wald: wald(t), gewicht: gw, sonneDir: sd, sonneFarbe: sf,
      farben: { grund: grund(t).clone(), grund2: grund2(t).clone(), streu: streu(t).clone(), sand: sand(t).clone(), mud: mud(t).clone(), tief: tief(t).clone(), flach: flach(t).clone(), himmel: hz.clone().lerp(zenitK(t), 0.25) } };
    welt0.setze(t, kam, S);
    const wz = wolkenZeit(t);
    const lauf = (c) => ({ ...c, a: 0.55 + 0.25 * sn, p: [((c.p[0] + 3200) % 6400 + 6400) % 6400 - 3200, c.p[1], c.p[2]] });
    puffs.setze([...wolken(wz).map(lauf), ...dunstPuffs(t, dunst)], kam);
    const strA = smoothstep(57.6, 58.6, t) * (1 - smoothstep(61.5, 64.5, t));
    glanzP.setze(strahl(t, strA, herdeZiel), kam);
    schneeT.setze(t, kam, { deckkraft: 0.85 * sn / 0.55 * smoothstep(7.8, 9.5, t) * (1 - smoothstep(18, 20, t)), wind: [1.2 + 2 * wi, -0.5, 0.5] });
    pollen.setze(t, kam, { zentrum: [kam.position.x + 2, kam.position.y - 3, kam.position.z - 14], deckkraft: 0.55 * smoothstep(20, 24, t) * (1 - smoothstep(30, 34, t)) + 0.3 * smoothstep(44, 50, t), wind: [0.4, 0.1, 0.1] });
    blaetter.setze(t, kam, { zentrum: [kam.position.x, kam.position.y - 2, kam.position.z - 12], deckkraft: 0.7 * smoothstep(0.2, 1.2, t) * (1 - smoothstep(3.5, 5.5, t)), wind: [3.5, -0.5, 0.8] });
    moewen.mesh.visible = t < 12 || t > 33; moewen.setze(t); kraniche.mesh.visible = t > 18 && t < 40; kraniche.setze(t);
    raben.setze(t); raben.mesh.visible = t > 49;
    aeste.setze(t);
    const fp = farben(t);
    Object.assign(welt.post, fp, { vignette: 0, koernung: 0.008, tiltStaerke: 0 });
  } };

  // ---------------------------------------------------------------- Text: Titel, Anzeige, Sätze, Abspann (1:1 aus dem Skript)
  const TITEL = "Was wäre, wenn die Erde zurück in die Zeit der Dinosaurier spulen würde?";
  const FAKT = "DIE LETZTEN GROSSEN DINOSAURIER LEBTEN VOR 66 MIO. JAHREN · DEN HOMO SAPIENS GIBT ES ERST SEIT 0,45 % DIESER ZEIT";
  const S = [
    [4.8, "Morgen an einer Flussmündung, die Zeit läuft rückwärts."], [8.8, "Dann weicht das Meer, und Eis füllt das Tal."],
    [12.8, "Eine Mammutherde zieht am Eisrand vorbei."], [16.8, "Eiszeiten kommen und gehen, immer schneller."],
    [20.8, "Das Eis ist fort, dreizehige Pferde ziehen vorbei."], [25, "Dann wird es wärmer, Büsche erobern das Grasland."],
    [29.2, "Der Wald wird dicht, das Grasland verschwindet."], [33.4, "Palmen und Farne wachsen jetzt am Ufer."],
    [37.6, "Das Meer steigt und flutet die Flussmündung."], [41.8, "Krokodile liegen am warmen Ufer."],
    [46, "Schwüle Hitze, Dunst hängt über dem Wald."], [50.2, "Kleine Säugetiere huschen durchs Unterholz."],
    [54.2, "Im Unterholz brechen schwere Äste."], [62.4, "Eine Herde Dinosaurier trinkt am Fluss."],
    [66.4, "Den Homo sapiens gibt es seit 300.000 Jahren."],
  ];
  const SAETZE = S.map(([t, x], i) => [t, x, i === S.length - 1 ? 3.4 : 3.6]);
  const anzeige = (t) => {
    const y = jahre(t), e = epoche(t);
    const zahl = t >= T_HIER ? "HIER" : zahlDE(Math.round(y), 0);
    const et = `${e} · JAHRE VOR HEUTE`;
    if (t < 18) return { etikett: et, zahl, einheit: "", unter: "EISZEITALTER · ZEITRAFFER STEIGT AUF 1 S = 1,3 MIO. JAHRE", wert: y };
    if (t < 32) return { etikett: et, zahl, einheit: "", unter: "GRASLAND · 1 S = 1,3 → 1,65 MIO. JAHRE", wert: y };
    if (t < T_HIER) return { etikett: et, zahl, einheit: "", unter: "WARMZEIT · 1 S = 1,65 MIO. JAHRE", wert: y };
    return { etikett: et, zahl, einheit: "", unter: "ZEIT DER DINOSAURIER", wert: y };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE });

  const ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices, instanzen: Object.fromEntries(Object.entries(welt0.typen).map(([k, v]) => [k, v.n])), jahre: [0, 18, 32, 58].map(jahre) };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
