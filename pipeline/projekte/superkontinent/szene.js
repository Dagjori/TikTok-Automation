// Account 2 @stelldirvor.pov – „Was wäre, wenn alle Kontinente wieder zusammenstoßen würden?“ (Skript acc2-2026-11-06-abend)
// Welt: Felsküste am offenen Ozean (engine/welt_felskueste.js, Erstbau 06.11.2026), ebenerdiger Standpunkt am Rand des Felsplateaus, eine durchgehende Einstellung.
// Zeitraffer vorwärts: Anzeige y(t) = ∫ r dt in Jahren (sim/superkontinent.mjs); Erosion, Trockenheit, Himmel und die heranrückende Gegenküste sind Funktionen derselben Zeit.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes, hash } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Himmel, Puffs, Partikel, Voegel, Glut, PovKamera, farbPhasen, Protokoll, wolkenFeld, rauchSaeule, staubWand } from "../../engine/stil_lunar_pov.js";
import { LunarHUD, zahlDE } from "../../engine/lunar_hud.js";
import { Felskueste, zsBasis, hoehe as hoeheAt, GK, AUGE } from "../../engine/welt_felskueste.js";
import { jahre, breiteBei, jahreBisStoss, etikett as etikettBei } from "../../sim/superkontinent.mjs";

const FPS = 30, DAUER = 80, T_HIER = 58;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 4096;
const D2R = Math.PI / 180;
const richtung = (yaw, pitch) => [Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R)];
const L = ease.inOutSine;
const K = (keys, e = L) => (t) => keyframes(keys.map(([tt, v, ee]) => ({ t: tt, v, e: ee || e })), t);
const Kc = (keys) => { const R = K(keys.map(([t, h]) => [t, new THREE.Color(h).r])), G = K(keys.map(([t, h]) => [t, new THREE.Color(h).g])), B = K(keys.map(([t, h]) => [t, new THREE.Color(h).b])); const c = new THREE.Color(); return (t) => c.setRGB(R(t), G(t), B(t)); };

// ------------------------------------------------------------------------------ Kamera (Grad): yaw + = rechts, pitch − = nach unten; Meer liegt in −z
const KX = K([[0, 0], [15, -3], [80, -3]]);
const KZ = K([[0, 9], [3, 9], [15, -3], [80, -3]]);
const KYAW = K([[0, 12], [3, 12], [15, 5], [25.6, 5], [28.6, -138], [31.6, -138], [34.2, 0], [50, 0], [58, 3], [62, 0], [70, -150]]);
const KPITCH = K([[0, -8], [15, -11], [25.6, -11], [28.6, -3], [31.6, -3], [34.2, -10], [50, -9], [58, -6], [62, -6], [70, -3]]);
const KFOV = K([[0, 58], [50, 58], [58, 47], [70, 46]]);
const EROS = K([[0, 0], [6, 0.3], [10, 0.8], [14, 1.5], [20, 2.0], [30, 2.8], [40, 3.4], [50, 3.9], [58, 4.0], [80, 4.0]]);
const NN = { r: 0.5, f: 0.5, g: 0.5, p: 0.5 };
const posBei = (t) => { const x = KX(t), z = KZ(t); return [x, Math.max(hoeheAt(x, z, EROS(t), NN), 0.9) + AUGE.hoehe, z]; };
const zielBei = (t) => { const p = posBei(t), d = richtung(KYAW(t), KPITCH(t)); return [p[0] + d[0] * 100, p[1] + d[1] * 100, p[2] + d[2] * 100]; };

// ------------------------------------------------------------------------------ Himmel, Licht, Farben je Zeit
const EL = K([[0, 9], [3, 7.5], [8, 3.5], [12, -2.5], [15, -10], [48, -12], [50, -8], [53, -3], [56, 1.5], [62, 6], [70, 9], [80, 10]]);
const AZ = K([[0, 18], [14, 22], [17, -70], [80, -80]]);
const sunDir = (t) => { const el = EL(t) * D2R, az = AZ(t) * D2R; return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)]; };
const MEL = K([[11, 2], [16, 7], [24, 15], [34, 21], [44, 22], [49, 15], [52, 6]]);
const MAZ = K([[11, -12], [24, -9], [40, -5], [52, -2]]);
const moonDir = (t) => { const el = MEL(t) * D2R, az = MAZ(t) * D2R; return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)]; };
const mondAuf = (t) => smoothstep(11, 15, t) * (1 - smoothstep(48, 51, t));
const sonneAuf = (t) => smoothstep(-5, 0.5, EL(t));

const zenitK = Kc([[0, "#4A5C96"], [8, "#33447A"], [12, "#1F2B58"], [16, "#0F1838"], [22, "#0A1330"], [46, "#0C1634"], [50, "#18214A"], [54, "#35407A"], [58, "#4B5A92"], [66, "#5B6C9C"], [80, "#5B6C9C"]]);
const horizontK = Kc([[0, "#F6A468"], [6, "#EE9462"], [11, "#A8607C"], [15, "#3A4472"], [20, "#2A3C66"], [46, "#2A3C68"], [50, "#4A4F86"], [53, "#C46A80"], [58, "#F29060"], [66, "#F4A86E"], [80, "#F4A86E"]]);
const wolkenK = Kc([[0, "#FFBB90"], [8, "#F4A67E"], [12, "#9C7096"], [16, "#4A5882"], [22, "#52628C"], [46, "#566690"], [50, "#7A6A98"], [53, "#F09484"], [58, "#FFA878"], [66, "#FFC090"], [80, "#FFC090"]]);
const wTief = Kc([[0, "#17445F"], [10, "#12384E"], [16, "#0A2036"], [46, "#0D2A44"], [54, "#1B3A58"], [62, "#1C4358"], [80, "#1C4358"]]);
const wFlach = Kc([[0, "#4D9C94"], [10, "#3F8486"], [16, "#2A5C70"], [46, "#2F6684"], [54, "#4B8896"], [62, "#5FA298"], [80, "#5FA298"]]);
const sonneFarbe = Kc([[0, "#FFB070"], [8, "#FF9A58"], [12, "#FF7E4A"], [50, "#FF7A48"], [58, "#FF8E56"], [70, "#FFA264"], [80, "#FFA264"]]);
const MOND_F = new THREE.Color("#9FB8E8");
const TROCKEN = K([[0, 0], [8, 0.02], [16, 0.06], [24, 0.2], [32, 0.42], [40, 0.6], [46, 0.8], [52, 0.97], [58, 1.05], [66, 1.2]]);
const ANTEIL = K([[0, 1], [16, 0.96], [28, 0.75], [40, 0.42], [50, 0.2], [58, 0.1], [70, 0.05]]);
const WIND = K([[0, 0.9], [1.2, 1.6], [3, 1.1], [16, 1.0], [40, 1.3], [56, 1.2], [58, 2.4], [62, 1.8], [70, 0.9]]);
const UNRUHE = K([[0, 0.9], [8, 1.2], [16, 1.0], [25, 1.5], [34, 1.1], [50, 0.8], [58, 1.3], [66, 0.7]]);

// Entfernung der Gegenküste (Bild-m): Sichtweite 212 km (3.000-m-Gebirge) ↔ ca. 9,8 km im Bild
const dBild = (km) => (km >= 212 ? 9802 + 3 * (km - 212) : 50 + 46 * Math.max(km, 0));
const falteK = K([[0, 0.3], [54, 0.3], [58, 0.45], [63, 1.0], [80, 1.0]]);
const FOG = K([[0, 2.6e-4], [8, 2.3e-4], [16, 2.1e-4], [47, 2.2e-4], [49.5, 2.2e-4], [53, 5.5e-5], [56, 6e-5], [58, 9e-5], [60, 3.2e-4], [64, 2.4e-4], [70, 1.6e-4], [80, 1.6e-4]]);
const BEBEN = K([[56, 0], [58, 1], [62, 0.5], [66, 0]]);

async function start() {
  if (Q.has("nohud")) document.getElementById("hud").style.display = "none";
  aktiviereHoehenNebel({ abfall: 0.0005, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#EAA070", 2.6e-4);
  const kam = new THREE.PerspectiveCamera(58, 1080 / 1920, 0.3, 40000);
  const welt0 = new Felskueste(szene, { schatten: SCHATTEN > 0 });
  const himmel = new Himmel(szene, { radius: 9000, zenit: "#4A5C96", horizont: "#F6A468", unten: "#3A3A44", dunst: 0.3, sonnenRichtung: sunDir(0), sonnenStaerke: 30, glanz: 0.8, zirren: 0.35 });
  const pov = new PovKamera(kam, { pos: posBei(0), ziel: zielBei(0), fov: 58 }).atmen({ staerke: 0.8 })
    .beben({ von: 55.5, bis: 62.5, staerke: 0.14 }).stoss({ t: T_HIER, staerke: 1.4, abkling: 1.1 });

  const hemi = new THREE.HemisphereLight("#9BAEDA", "#4A4034", 1.0);
  const sonne = new THREE.DirectionalLight("#FFB070", 2.2);
  sonne.castShadow = SCHATTEN > 0; sonne.shadow.mapSize.set(SCHATTEN || 1, SCHATTEN || 1);
  Object.assign(sonne.shadow.camera, { left: -130, right: 130, top: 130, bottom: -130, near: 1, far: 1400 });
  sonne.shadow.bias = -0.0005; sonne.shadow.normalBias = 0.12;
  const fuell = new THREE.DirectionalLight("#FFD9B0", 0.6);
  szene.add(hemi, sonne, sonne.target, fuell, fuell.target);

  const puffsW = new Puffs(szene, { max: 520, schatten: 0.3 });                // Wolken
  const puffsR = new Puffs(szene, { max: 700, schatten: 0.4 });                // Rauch der Vulkane
  const puffsG = new Puffs(szene, { max: 420, schatten: 0.6, nebel: true, renderOrder: 11 });    // Gischt, Staub, Dunst
  const mondG = new Glut(szene, { farbe: "#D8E4FF", staerke: 3.2, groesse: 330 });
  const mondH = new Glut(szene, { farbe: "#8FA8E0", staerke: 0.28, groesse: 1500 });
  const asche = new Partikel(szene, { art: "asche", anzahl: 1600, box: [34, 18, 34], seed: 61, groesse: 0.08, farbe: "#6A4A3A", fall: 0.35, wirbel: 1.0 });
  const staubT = new Partikel(szene, { art: "staub", anzahl: 1100, box: [26, 12, 30], seed: 62, groesse: 0.05, farbe: "#E0C49A", fall: 0.04, wirbel: 1.5 });
  const moewen = new Voegel(szene, { anzahl: 14, seed: 71, farbe: "#C9BBAA", spannweite: 1.5 }).schwarm({ zentrum: [10, 14, -110], radius: 55, hoehe: 7, tempo: 8, anzahl: 14 });
  const moewen2 = new Voegel(szene, { anzahl: 10, seed: 72, farbe: "#E8D2BC", spannweite: 1.5 }).schwarm({ zentrum: [-40, 22, -90], radius: 60, hoehe: 8, tempo: 7, anzahl: 10 });
  const wolken = wolkenFeld({ anzahl: 22, bereich: { x: [-4200, 4200], z: [-5200, -1000] }, hoehe: [650, 1300], groesse: 190, farbe: "#FFFFFF", a: 0.82, wind: [34, 0], seed: 17 });
  const wolkenZeit = (t) => 2.4 * t + 130 * (1 - Math.exp(-t / 3.4));
  const wolkenLicht = new THREE.Color();

  // Vulkanrauch auf der Gegenküste (lokale Koordinaten, wird mit der Küste verschoben)
  const rauchSaeulen = GK.vulkane.map(([vx, vu, H], i) => rauchSaeule({ basis: [vx, H * 0.82, GK.zc(vx) - vu], t0: 44 + i * 0.7, dauer: 14, hoehe: 2600 + 500 * i, breite: 110, aufweitung: 3.6, anzahl: 150, farbeUnten: "#3A3432", farbeOben: "#8A7C74", a: 0.88, wind: [14, 4], seed: 11 + i * 5, quellung: 1.2 }));
  const wand = staubWand({ ziel: [KX(60), KZ(60)], boden: 0, richtung: [0, 1], start: 950, t0: T_HIER + 0.1, ankunft: 62.4, breite: 1400, hoehe: 110, anzahl: 230, farbe: "#C79A6C", farbeSchatten: "#6E4A38", a: 0.95, seed: 29, rollen: 1.4 });

  // ---------------------------------------------------------------- Farben, Protokoll
  const farben = farbPhasen([
    { t: 0, werte: { belichtung: 1.12, saettigung: 1.08, kontrast: 1.07, tonung: [1.1, 0.98, 0.84], tonungStaerke: 0.26, bloomStaerke: 1.3, bloomSchwelle: 0.9 } },
    { t: 11, werte: { belichtung: 1.15, saettigung: 1.04, kontrast: 1.06, tonung: [1.04, 0.94, 0.96], tonungStaerke: 0.28, bloomStaerke: 1.2, bloomSchwelle: 0.9 } },
    { t: 17, werte: { belichtung: 1.4, saettigung: 0.92, kontrast: 1.08, tonung: [0.86, 0.94, 1.14], tonungStaerke: 0.34, bloomStaerke: 1.15, bloomSchwelle: 0.8 } },
    { t: 46, werte: { belichtung: 1.42, saettigung: 0.94, kontrast: 1.08, tonung: [0.9, 0.96, 1.12], tonungStaerke: 0.3, bloomStaerke: 1.15, bloomSchwelle: 0.8 } },
    { t: 53, werte: { belichtung: 1.2, saettigung: 1.02, kontrast: 1.07, tonung: [1.06, 0.95, 0.94], tonungStaerke: 0.3, bloomStaerke: 1.2, bloomSchwelle: 0.9 } },
    { t: 58, werte: { belichtung: 1.1, saettigung: 1.1, kontrast: 1.08, tonung: [1.16, 0.96, 0.78], tonungStaerke: 0.4, bloomStaerke: 1.4, bloomSchwelle: 0.85 } },
    { t: 70, werte: { belichtung: 1.05, saettigung: 1.12, kontrast: 1.08, tonung: [1.2, 0.96, 0.74], tonungStaerke: 0.46, bloomStaerke: 1.45, bloomSchwelle: 0.85 } },
  ]);
  const prot = new Protokoll();
  prot.effekt(0.5, "wolken_jagen", { klang: "windstoss", staerke: 0.6, dauer: 3, text: "Wolkenbänder jagen über den Himmel, Zeitraffer läuft" })
    .effekt(1.2, "gischt_gegenlicht", { klang: "gischt", staerke: 0.6, dauer: 3, text: "Wellen schlagen an die Felsen, Gischt im Gegenlicht" })
    .effekt(2.6, "moewen", { klang: "fluegel", staerke: 0.4, text: "Möwen kreisen über der Brandung" })
    .effekt(5.0, "sonne_sinkt", { klang: false, text: "Die Sonne sinkt sichtbar dem Meer entgegen" })
    .effekt(9.0, "daemmerung", { klang: "windstoss", staerke: 0.35, dauer: 3, text: "Licht gleitet ins Dämmerblau" })
    .effekt(12.5, "erosion", { klang: "gischt", staerke: 0.35, dauer: 3.5, text: "Wasserlinie und Felsen verändern sich sichtbar" })
    .effekt(16.6, "nacht_sterne", { klang: "zischen", staerke: 0.35, dauer: 2.5, text: "Sterne ziehen als Strichspuren, der Mond geht auf" })
    .effekt(21.5, "mond_glanz", { klang: false, text: "Mondglanz auf dem Wasser" })
    .effekt(25.3, "brandung_nagt", { klang: "gischt", staerke: 0.4, dauer: 4, text: "Die Brandung nagt an den Felsen, Gischt steigt auf" })
    .effekt(27.5, "land_trocknet", { klang: "windstoss", staerke: 0.15, dauer: 3.5, text: "Das Land hinter dir wird trockener, Gras und Büsche vergilben" })
    .effekt(36.0, "horizont_leer", { klang: false, text: "Weite, leerer Horizont im Mondlicht" })
    .effekt(41.5, "hitze", { klang: "windstoss", staerke: 0.2, dauer: 4, text: "Die Luft wird heißer, trockener Wind, Staub" })
    .effekt(47.0, "dunst_hitze", { klang: "windstoss", staerke: 0.3, dauer: 3, text: "Hitzeflimmern über dem Plateau" })
    .effekt(50.3, "rauchsaeulen", { klang: "grollen", staerke: 0.35, dauer: 3, text: "Rauchsäulen stehen über dem Horizont, Morgenrot" })
    .effekt(54.3, "berge", { klang: "grollen", staerke: 0.55, dauer: 3, text: "Berge und Vulkankegel steigen über den Horizont" })
    .effekt(56.6, "meer_schmal", { klang: "grollen", staerke: 0.7, dauer: 2.5, text: "Das Meer ist nur noch ein schmaler Arm, Grollen" })
    .effekt(T_HIER, "zusammenstoss", { klang: "einschlag", staerke: 1.3, text: "Die Küsten berühren sich, Felsen falten sich auf, Kamera bebt" })
    .effekt(T_HIER + 0.3, "druckwelle", { klang: "druckwelle", staerke: 1.0 })
    .effekt(T_HIER + 1.2, "gebirge_faltet", { klang: "grollen", staerke: 1.2, dauer: 5, text: "Gebirge falten sich vor dir auf, Staubwand rollt heran" })
    .effekt(T_HIER + 2.4, "felsen_bersten", { klang: "truemmer", staerke: 0.8, text: "Felsbrocken lösen sich" })
    .effekt(62.4, "staub_ueberrollt", { klang: "windstoss", staerke: 0.55, dauer: 3, text: "Die Staubwand zieht über dich hinweg und legt sich" })
    .effekt(64.5, "wueste_glueht", { klang: false, text: "Rote Sonne über der Wüste, Hitzeflimmern" });
  prot.melde({ t: 0.0, typ: "kamera", art: "schwenk", dauer: 3, text: "Blick vom Sonnenuntergang aufs offene Meer", klang: false })
    .melde({ t: 3, typ: "kamera", art: "fahrt", dauer: 12, text: "Langsame Fahrt nach vorn an die Felskante", klang: false })
    .melde({ t: 25.6, typ: "kamera", art: "schwenk", dauer: 3, text: "Schwenk nach links über die Küste ins trockener werdende Land", klang: false })
    .melde({ t: 31.6, typ: "kamera", art: "schwenk", dauer: 2.6, text: "Schwenk zurück aufs Meer", klang: false })
    .melde({ t: 50, typ: "kamera", art: "zoom", dauer: 8, von: 58, bis: 47, text: "Sanfter Zoom auf den Horizont, Brennweite 58° → 47°", klang: false })
    .melde({ t: 62, typ: "kamera", art: "schwenk", dauer: 8, text: "Schwenk nach links auf die rote Wüste", klang: false });

  // ---------------------------------------------------------------- Hilfen: Gischt und Dunst
  const tmp = new THREE.Color();
  const gischt = (t, x0, ero, tint) => {
    const out = [];
    for (let i = 0; i < 26; i++) {
      const x = x0 - 40 + 80 * hash(i, 501), per = 3.6 + 2.6 * hash(i, 502), ph = hash(i, 503) * per;
      const s = ((t + ph) % per) / per, burst = Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.5)), 2) * (s < 0.66 ? 1 : 0);
      if (burst < 0.03) continue;
      const z = zsBasis(x) + ero - 0.6;
      out.push({ p: [x + 1.5 * s, 0.4 + 3.2 * burst * (0.6 + 0.6 * hash(i, 504)), z], r: 1.4 + 2.2 * hash(i, 505) + 1.8 * burst, dreh: i, farbe: tint.toArray(), a: 0.62 * burst, licht: 0.7, bild: i % 4 });
    }
    return out;
  };
  const dunstP = (t, a, x0, z0, tint) => {
    if (a < 0.02) return [];
    const out = [];
    for (let i = 0; i < 70; i++) {
      const x = x0 - 160 + 320 * hash(i, 601), z = z0 - 260 * Math.pow(hash(i, 602), 0.8) - 20, r = 18 + 32 * hash(i, 603);
      out.push({ p: [x + 8 * Math.sin(t * 0.25 + i), 3 + 10 * hash(i, 604), z], r, dreh: i, farbe: tint.toArray(), a: 0.07 * a, licht: 0.9, bild: i % 4 });
    }
    return out;
  };

  const welt = { szene, kamera: kam, post: {}, update(t) {
    const camP = posBei(t), ero = EROS(t);
    pov.fov = KFOV(t); pov.posKeys = [{ t: 0, v: camP }]; pov.zielKeys = [{ t: 0, v: zielBei(t) }];
    pov.anwenden(t);
    himmel.folge(kam);
    // Lichtquelle: Sonne bzw. Mond
    const sW = sonneAuf(t), mW = mondAuf(t) * (1 - sW);
    const sd = sunDir(t), md = moonDir(t);
    const dir = new THREE.Vector3(...sd).multiplyScalar(sW + 1e-3).addScaledVector(new THREE.Vector3(...md), mW).normalize();
    const sf = sonneFarbe(t).clone(), anteilM = mW / (sW + mW + 1e-6);
    const lf = sf.clone().lerp(MOND_F, anteilM);
    const sI = 0.35 + 2.2 * Math.min(1, Math.max(0, Math.sin(Math.max(EL(t), 0.2) * D2R)) / 0.35);
    const inten = sI * sW + 1.05 * mW + 0.12 * Math.max(0, 1 - sW - mW);
    himmel.setze({ zenit: zenitK(t), horizont: horizontK(t), unten: tmp.copy(horizontK(t)).multiplyScalar(0.4), sonnenRichtung: sd, sonnenFarbe: sf, sonnenStaerke: 30 * sW, glanz: 0.85 * sW + 0.05, zirren: 0.3 * (1 - 0.7 * mondAuf(t)) });
    szene.fog.color.copy(horizontK(t));
    szene.fog.density = FOG(t);
    const fwd = new THREE.Vector3(...zielBei(t)).sub(kam.position).setY(0).normalize();
    sonne.position.copy(kam.position).addScaledVector(fwd, 50).addScaledVector(dir, 520); sonne.target.position.copy(kam.position).addScaledVector(fwd, 50); sonne.target.updateMatrixWorld();
    sonne.color.copy(lf); sonne.intensity = inten;
    fuell.position.copy(kam.position).addScaledVector(fwd, -60).add(new THREE.Vector3(-25, 45, 0)); fuell.target.position.copy(kam.position).addScaledVector(fwd, 20); fuell.target.updateMatrixWorld();
    fuell.color.copy(tmp.set("#FFD9B0")).lerp(MOND_F, mondAuf(t) * (1 - sW)); fuell.intensity = 0.7 * (0.55 + 0.45 * sW) + 0.75 * mondAuf(t);
    hemi.color.copy(zenitK(t)).lerp(tmp.set("#C8D4F0"), 0.35); hemi.groundColor.copy(tmp.set("#5A4A3E")).lerp(horizontK(t), 0.25);
    hemi.intensity = 1.0 + 0.6 * mondAuf(t) + 0.2 * sW;
    // Gegenküste
    const km = breiteBei(t), dm = t < 49.2 ? 1e9 : dBild(km) * (1 - smoothstep(57.3, 59.3, t));
    const S = { ero, trocken: TROCKEN(t), anteil: ANTEIL(t), wind: WIND(t), unruhe: UNRUHE(t), d: dm, falte: falteK(t), beben: BEBEN(t) * 40,
      licht: { dir: [dir.x, dir.y, dir.z], farbe: lf, st: 1.15 * sW + 1.25 * mW + 0.1 },
      himmel: { h: horizontK(t), z: zenitK(t) }, wasser: { tief: wTief(t), flach: wFlach(t) },
      sterne: smoothstep(13.5, 19, t) * (1 - smoothstep(46, 52, t)), sternWinkel: 0.028 * t, sternLaenge: 0.028 };
    welt0.setze(t, kam, S);
    // Mond
    const mp = new THREE.Vector3(...md).multiplyScalar(9000).add(kam.position);
    mondG.setze({ p: [mp.x, mp.y, mp.z], staerke: 3.2 * mondAuf(t) }); mondH.setze({ p: [mp.x, mp.y, mp.z], staerke: 0.3 * mondAuf(t) });
    // Wolken in der Lichtfarbe der Phase
    wolkenLicht.copy(wolkenK(t));
    const wz = wolkenZeit(t);
    const lauf = (c) => ({ ...c, farbe: wolkenLicht.toArray(), a: 0.66 * (1 - 0.2 * mondAuf(t)), p: [((c.p[0] + 4200) % 8400 + 8400) % 8400 - 4200, c.p[1], c.p[2]] });
    puffsW.setze(Q.has('n_w') ? [] : wolken(wz).map(lauf), kam);
    // Rauch der Vulkane (mit der Gegenküste verschoben)
    const offZ = zsBasis(0) + ero - dm - GK.zc(0);
    const rauchT = new THREE.Color().copy(horizontK(t)).multiplyScalar(0.55);
    const rauch = dm < 24000 ? rauchSaeulen.flatMap((f) => f(t).map((p) => ({ ...p, p: [p.p[0], p.p[1], p.p[2] + offZ], farbe: [p.farbe[0] * (0.45 + rauchT.r), p.farbe[1] * (0.45 + rauchT.g), p.farbe[2] * (0.45 + rauchT.b)] }))) : [];
    puffsR.setze(rauch, kam);
    // Gischt, Dunst, Staubwand
    const tintG = new THREE.Color().copy(horizontK(t)).lerp(tmp.set("#FFFFFF"), 0.55 * sW + 0.15).multiplyScalar(0.5 + 0.5 * sW + 0.35 * mW);
    const dunstA = smoothstep(38, 47, t) * (1 - smoothstep(60, 62, t));
    const dust = new THREE.Color().copy(horizontK(t)).lerp(tmp.set("#D9B58A"), 0.5);
    const wandF = 1 - smoothstep(62.5, 66, t), wandP = wandF < 0.01 ? [] : wand.puffs(t).map((p) => { const dd = Math.hypot(p.p[0] - kam.position.x, p.p[1] - kam.position.y, p.p[2] - kam.position.z); return { ...p, a: p.a * wandF * smoothstep(p.r * 0.5, p.r * 2.4, dd) }; });
    const nachDunst = smoothstep(62, 63, t) * (1 - smoothstep(63.5, 68.5, t));
    puffsG.setze(Q.has('n_g') ? [] : [...(t < 61 ? gischt(t, camP[0], ero, tintG).map((p) => ({ ...p, a: p.a * (1 - smoothstep(56.5, 60.5, t)) })) : []), ...dunstP(t, dunstA * 0.8, camP[0], camP[2], dust), ...dunstP(t + 5, nachDunst * 1.0, camP[0], camP[2], dust), ...wandP], kam);
    if (Q.has('n_a')) { asche.mesh && (asche.mesh.visible = false); staubT.mesh && (staubT.mesh.visible = false); }
    asche.setze(t, kam, { zentrum: [kam.position.x, kam.position.y - 2, kam.position.z - 8], deckkraft: 0.8 * smoothstep(58.4, 60, t) * (1 - smoothstep(64, 69, t)), wind: [3, -0.4, 2] });
    staubT.setze(t, kam, { zentrum: [kam.position.x, kam.position.y - 2, kam.position.z + 4], deckkraft: 0.5 * smoothstep(36, 44, t) * (1 - smoothstep(58, 60, t)) + 0.4 * smoothstep(62, 66, t), wind: [2.6 + WIND(t), 0, 1.0] });
    moewen.mesh.visible = t < 13.5; moewen.setze(t); moewen2.mesh.visible = false;
    const fp = farben(t);
    const heiss = Q.has('n_f') ? 0 : 0.9 * smoothstep(40, 52, t) + 1.2 * smoothstep(61, 65, t);
    Object.assign(welt.post, fp, { vignette: 0, koernung: 0.008, tiltStaerke: 0, flimmern: heiss, flimmerY: [0.32, 0.62] });
    welt.post.schleier = [0.82, 0.62, 0.45]; welt.post.schleierStaerke = Math.max(0, 0.5 * wand.vorKamera(t)) + 0.1 * smoothstep(60, 62.4, t) * (1 - smoothstep(63, 68, t));
  } };

  // ---------------------------------------------------------------- Text: Titel, Anzeige, Sätze, Abspann (1:1 aus dem Skript)
  const TITEL = "Was wäre, wenn alle Kontinente wieder zusammenstoßen würden?";
  const FAKT = "PLATTEN WANDERN ETWA SO SCHNELL, WIE FINGERNÄGEL WACHSEN · IM KLIMAMODELL BLEIBEN 8–16 % DES LANDES FÜR SÄUGETIERE BEWOHNBAR";
  const S = [
    [4.8, "Abend an einer Felsküste in Westafrika."], [8.8, "Dann vergehen Millionen Jahre in Sekunden."],
    [12.8, "Der Atlantik wächst um 1.500 Kilometer."], [16.8, "Dann kehrt sich die Bewegung um."],
    [21, "Das Meer vor dir wird schmaler."], [25.2, "Die Brandung nagt an den Felsen."],
    [29.4, "Hinter dir wird das Land trockener."], [33.4, "Weit draußen ist noch nichts zu sehen."],
    [37.6, "Noch 2.000 Kilometer bis Südamerika."], [41.8, "Die Luft wird heißer und trockener."],
    [46, "Nur noch 1.000 Kilometer bis Südamerika."], [50.2, "Rauchsäulen stehen über dem Horizont."],
    [54.2, "Dann tauchen Berge auf der anderen Seite auf."], [62.4, "Afrika und Amerika sind wieder vereint."],
    [66.4, "Nur 8 bis 16 Prozent des Landes bleiben bewohnbar."],
  ];
  const SAETZE = S.map(([t, x], i) => [t, x, i === S.length - 1 ? 3.4 : 3.6]);
  const anzeige = (t) => {
    const y = jahre(t), e = etikettBei(t);
    if (t < 16.5) return { etikett: e, zahl: zahlDE(Math.round(y), 0), einheit: "", unter: "ATLANTIK WÄCHST 3 CM PRO JAHR · 3.003 → 4.503 KM BREIT", wert: y };
    if (t < 50) return { etikett: e, zahl: zahlDE(Math.round(breiteBei(t)), 0), einheit: "KM", unter: "SCHRUMPFT 2,3 CM PRO JAHR · 1 S = 5,3 MIO. JAHRE", wert: breiteBei(t) };
    if (t < T_HIER) return { etikett: e, zahl: zahlDE(Math.round(jahreBisStoss(t)), 0), einheit: "", unter: "ABSTAND 520 → 0 KM · ZEITRAFFER BREMST", wert: jahreBisStoss(t) };
    return { etikett: "+250.000.000 JAHRE", zahl: "HIER", einheit: "", unter: "NEUER SUPERKONTINENT · MODELL PANGAEA PROXIMA", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE });

  const ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices, jahre: [0, 16.5, 50, 58].map(jahre) };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
