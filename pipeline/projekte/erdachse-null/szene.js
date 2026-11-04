// Account 2 @stelldirvor.pov – „Was wäre, wenn die Erdachse nicht mehr geneigt wäre?“ (Skript acc2-2026-11-05-abend)
// Welt: Waldlichtung im Thüringer Wald (engine/welt_waldlichtung.js, Erstbau 05.11.2026), Blick nach Süden, ebenerdig.
// Zeitraffer 0–70 s: 1 Sekunde = 3 Monate (Jahr = 4 s). Die Achsneigung ε(t) sinkt 23,44° → 0° (Ankerwerte aus dem Rechenweg, PCHIP);
// Deklination der Sonne δ = ε·sin(2π(s − 0,055)); Sonnenstand, Schatten, Tagesbögen und Anzeige lesen dasselbe ε(t) (sim/erdachse_null.mjs).
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes, hash } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Himmel, Puffs, Partikel, Voegel, PovKamera, farbPhasen, Protokoll, wolkenFeld } from "../../engine/stil_lunar_pov.js";
import { LunarHUD, zahlDE } from "../../engine/lunar_hud.js";
import { Waldlichtung, Sonnenboegen, saison, sonnenRichtung, hoehe, AUGE } from "../../engine/welt_waldlichtung.js";
import { mittag, tagH } from "../../sim/erdachse_null.mjs";

const FPS = 30, DAUER = 80, T_HIER = 60;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 4096;
const D2R = Math.PI / 180;
const richtung = (yaw, pitch) => [Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R)];
const L = ease.inOutSine;
const K = (keys, e = L) => (t) => keyframes(keys.map(([tt, v, ee]) => ({ t: tt, v, e: ee || e })), t);

// ------------------------------------------------------------------------------ Achsneigung ε(t) (Grad), monotone Hermite-Interpolation (PCHIP) durch die Anker
const ANKER = [[0, 23.44], [4.6, 23.44], [7, 23.0], [13, 22.0], [20, 18.0], [30, 12.0], [40, 7.5], [46.8, 5.0], [52, 2.0], [60, 0.0], [90, 0.0]];
const PCHIP = (() => {
  const x = ANKER.map((a) => a[0]), y = ANKER.map((a) => a[1]), n = x.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d[i] = (y[i + 1] - y[i]) / (x[i + 1] - x[i]);
  for (let i = 1; i < n - 1; i++) { if (d[i - 1] * d[i] <= 0) m[i] = 0; else { const w1 = 2 * (x[i + 1] - x[i]) + (x[i] - x[i - 1]), w2 = (x[i + 1] - x[i]) + 2 * (x[i] - x[i - 1]); m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); } }
  m[0] = 0; m[n - 1] = 0;
  return (t) => {
    if (t <= x[0]) return y[0]; if (t >= x[n - 1]) return y[n - 1];
    let i = 0; while (t > x[i + 1]) i++;
    const h = x[i + 1] - x[i], s = (t - x[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * y[i + 1] + (s3 - s2) * h * m[i + 1];
  };
})();
const eps = (t) => Math.max(0, PCHIP(t));
const jahrS = (t) => 0.28 + t / 4;                                   // Jahrposition (0 März, 0,30 Sommersonnenwende): Start Frühsommer
const dekl = (t) => eps(t) * Math.sin(2 * Math.PI * (jahrS(t) - 0.055));
const H0 = 6;                                                        // Stundenwinkel der gezeigten Sonne (Nachmittag, nahe Süden)

// ------------------------------------------------------------------------------ Kamera (Grad): yaw + = rechts (Westen), pitch + = oben
const KZ = K([[0, 0], [7, -6.5, ease.inOutSine], [18, -10], [50, -10], [60, -3.5], [70, -3]]);
const KYAW = K([[0, 2], [18, 3.5], [34, 5], [50, 5], [60, 6], [70, 3]]);
const KPITCH = K([[0, 6], [7, 11], [18, 19], [34, 31], [50, 32], [60, 24], [70, 20.5]]);
const KFOV = K([[0, 58], [7, 55], [18, 58], [34, 70], [50, 70], [60, 64], [70, 60]]);
const posBei = (t) => { const z = KZ(t); return [0.6 * Math.sin(t * 0.09), hoehe(0, z) + AUGE.hoehe, z]; };
const zielBei = (t) => { const p = posBei(t), d = richtung(KYAW(t), KPITCH(t)); return [p[0] + d[0] * 100, p[1] + d[1] * 100, p[2] + d[2] * 100]; };

async function start() {
  aktiviereHoehenNebel({ abfall: 0.0035, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#CFD9E2", 4.2e-4);
  const kam = new THREE.PerspectiveCamera(58, 1080 / 1920, 0.2, 40000);
  const welt0 = new Waldlichtung(szene, { schatten: SCHATTEN > 0 });
  const himmel = new Himmel(szene, { radius: 9000, zenit: "#4F83C6", horizont: "#D8E3EC", unten: "#8F9A88", dunst: 0.28, sonnenRichtung: sonnenRichtung(23, H0), sonnenStaerke: 30, glanz: 0.7, zirren: 0.12 });
  const boegen = new Sonnenboegen(szene, { N: 9, seg: 90, radius: 18000, breite: 0.3 });
  const pov = new PovKamera(kam, { pos: posBei(0), ziel: zielBei(0), fov: 58 }).atmen({ staerke: 1 });

  const hemi = new THREE.HemisphereLight("#BFD2E8", "#6C7A48", 1.05);
  const sonne = new THREE.DirectionalLight("#FFF0D8", 2.6);
  sonne.castShadow = SCHATTEN > 0; sonne.shadow.mapSize.set(SCHATTEN || 1, SCHATTEN || 1);
  Object.assign(sonne.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 1, far: 900 });
  sonne.shadow.bias = -0.0005; sonne.shadow.normalBias = 0.08;
  const fuell = new THREE.DirectionalLight('#FFF4E0', 0.6); fuell.position.set(-30, 60, 120); szene.add(hemi, sonne, sonne.target, fuell);

  const puffs = new Puffs(szene, { max: 600, schatten: 0.15 });
  const glanzP = new Puffs(szene, { max: 60, additiv: true, nebel: false, renderOrder: 12 });
  const pollen = new Partikel(szene, { art: "staub", anzahl: 1100, box: [16, 9, 20], seed: 41, groesse: 0.03, farbe: "#FFF3CC", fall: 0.02, wirbel: 1.4 });
  const blaetter = new Partikel(szene, { art: "staub", anzahl: 1500, box: [34, 18, 34], seed: 42, groesse: 0.085, farbe: "#C7802A", fall: 0.95, wirbel: 1.3 });
  const schneeT = new Partikel(szene, { art: "schnee", anzahl: 2600, box: [40, 22, 40], seed: 43 });
  const bluetenT = new Partikel(szene, { art: "staub", anzahl: 700, box: [26, 12, 26], seed: 44, groesse: 0.05, farbe: "#FFE6EE", fall: 0.5, wirbel: 1.6 });
  const stare = new Voegel(szene, { anzahl: 18, seed: 51, farbe: "#1B1B1E", spannweite: 0.5 }).schwarm({ zentrum: [-15, 12, -108], radius: 5, hoehe: 4, tempo: 4, anzahl: 18 }).flucht({ t0: 2.7, richtung: [1, 0.45, -0.35], tempo: 15 });
  const zug = new Voegel(szene, { anzahl: 14, seed: 52, farbe: "#26262A", spannweite: 0.4 }).schwarm({ zentrum: [20, 28, -70], radius: 22, hoehe: 5, tempo: 7, anzahl: 14 });
  const falter = new Voegel(szene, { anzahl: 9, seed: 53, farbe: "#FFF0A8", spannweite: 0.16 }).schwarm({ zentrum: [1.2, 1.5, -8], radius: 5, hoehe: 1.2, tempo: 1.1, anzahl: 9 });
  const wolken = wolkenFeld({ anzahl: 18, bereich: { x: [-3200, 3200], z: [-4200, -1100] }, hoehe: [800, 1300], groesse: 170, farbe: "#F4F3EF", a: 0.8, wind: [16, 0], seed: 15 });
  const wolkenZeit = (t) => t * 2.2;

  // ---------------------------------------------------------------- Zustände je Zeit
  const wStaerke = (t) => clamp(eps(t) / 23.44);
  const durchbruch = (t) => smoothstep(57.6, 60.2, t) * (1 - smoothstep(62.5, 66.5, t));        // Leuchten der verschmolzenen Bahn
  const farben = farbPhasen([
    { t: 0, werte: { belichtung: 1.12, saettigung: 1.08, kontrast: 1.08, tonung: [1.06, 1.0, 0.92], tonungStaerke: 0.22, bloomStaerke: 1.0 } },
    { t: 30, werte: { belichtung: 1.12, saettigung: 1.05, kontrast: 1.07, tonung: [1.04, 1.0, 0.95], tonungStaerke: 0.2, bloomStaerke: 1.0 } },
    { t: 58, werte: { belichtung: 1.12, saettigung: 1.05, kontrast: 1.06, tonung: [1.05, 1.02, 0.94], tonungStaerke: 0.22, bloomStaerke: 1.05 } },
    { t: 60.5, werte: { belichtung: 1.08, saettigung: 1.05, kontrast: 1.08, tonung: [1.08, 1.03, 0.9], tonungStaerke: 0.3, bloomStaerke: 1.2, bloomSchwelle: 0.95 } },
    { t: 66, werte: { belichtung: 1.12, saettigung: 1.05, kontrast: 1.06, tonung: [1.05, 1.02, 0.94], tonungStaerke: 0.22, bloomStaerke: 1.1 } },
  ]);
  const wind = K([[0, 0.55], [1.5, 0.6], [2.2, 1.35], [4.5, 0.7], [20, 0.8], [40, 0.7], [58, 0.6], [60, 1.0], [64, 0.6], [70, 0.5]]);
  const kaelte = new THREE.Color("#DCE6F0"), tmp = new THREE.Color(), tmp2 = new THREE.Color();

  // Rehe: eines hebt vor 3 s den Kopf (Vögel steigen auf), sonst grasen sie; im Nachspiel ruhig
  const rehZustand = (t) => ({
    wachsam: [smoothstep(2.0, 2.6, t) * (1 - smoothstep(4.2, 5.0, t)) + 0.35 * smoothstep(18, 19, t) * (1 - smoothstep(21, 22, t)), 0, 0.45 * smoothstep(27, 28, t) * (1 - smoothstep(30, 31, t)), 0],
    gehen: [0.2, 0.15, 0.2, 0.1],
  });

  const nebelPuffs = (t, S) => {
    const a = 0.5 * S.nebel * (0.55 + 0.45 * Math.sin(t * 0.7)) * (0.35 + 0.65 * S.gewichte.herbst + 0.4 * S.gewichte.winter);
    if (a < 0.03) return [];
    const out = [];
    for (let i = 0; i < 70; i++) {
      const x = -300 + 600 * hash(i, 601), z = -160 - 700 * Math.pow(hash(i, 602), 0.8), r = 24 + 40 * hash(i, 603);
      out.push({ p: [x + 8 * Math.sin(t * 0.25 + i), hoehe(x, z) + 6 + 8 * hash(i, 604), z], r, dreh: i, farbe: [0.88, 0.9, 0.93], a: 0.16 * a, licht: 0.9, bild: i % 4 });
    }
    return out;
  };
  const strahlen = (t, sd, a) => {                          // Lichtschäfte (additiv) aus Süden in die Lichtung
    if (a < 0.02) return [];
    const out = [];
    for (let i = 0; i < 20; i++) {
      const k = i / 19, d = 14 + k * 70, off = (hash(i, 611) - 0.5) * 10;
      out.push({ p: [sd[0] * (-d) * 0 + off + 2 * Math.sin(i), 3 + 7 * hash(i, 612), -20 - d * 1.0], r: 5 + 7 * k, dreh: i, farbe: [0.96, 0.86, 0.62].map((c) => c * 0.05 * a), a: 1, licht: 0, bild: i % 4 });
    }
    return out;
  };

  // ---------------------------------------------------------------- Protokoll (Klang an genau diesen Stellen, atmo.py)
  const prot = new Protokoll();
  prot.effekt(1.2, "laubfaerbung", { klang: false, text: "Herbst im Zeitraffer: Laub färbt sich" })
    .effekt(1.8, "windboe", { klang: "windstoss", staerke: 0.55, dauer: 3, text: "Windböe läuft durch Gras und Wipfel" })
    .effekt(2.2, "erster_schnee", { klang: false, text: "Winter im Zeitraffer: erster Schnee, ein Reh hebt den Kopf" })
    .effekt(2.7, "voegel_steigen_auf", { klang: "fluegel", staerke: 0.7, text: "Vogelschwarm steigt aus den Buchen" })
    .effekt(3.2, "fruehling_bluete", { klang: false })
    .effekt(5.2, "laubfall", { klang: false })
    .effekt(6.2, "schnee_faellt", { klang: "windstoss", staerke: 0.35, dauer: 2 })
    .effekt(8.2, "fruehling_bluete_2", { klang: false })
    .effekt(9.2, "laubfall_2", { klang: false })
    .effekt(14.2, "schnee_decke", { klang: false })
    .effekt(18.6, "sonnenboegen_leuchten", { klang: "zischen", staerke: 0.4, dauer: 3, text: "Die Tagesbögen der Sonne leuchten am Himmel auf" })
    .effekt(22.0, "winter_sonne_steigt", { klang: false })
    .effekt(28.0, "schatten_kuerzer", { klang: false })
    .effekt(33.0, "boegen_naeher", { klang: false })
    .effekt(38.5, "schnee_kurz", { klang: false })
    .effekt(44.0, "nebel_im_tal", { klang: "windstoss", staerke: 0.3, dauer: 3 })
    .effekt(52.0, "boegen_ueberlagern", { klang: false })
    .effekt(T_HIER, "boegen_verschmelzen", { klang: "windstoss", staerke: 0.85, dauer: 3, text: "Die Bögen verschmelzen zu einem Bogen bei 39°" })
    .effekt(60.6, "glanz_ueber_wiese", { klang: "zischen", staerke: 0.5, dauer: 3 })
    .effekt(63.0, "rehe_grasen", { klang: false });
  prot.melde({ t: 0.5, typ: "kamera", art: "zoom", dauer: 6.5, von: 58, bis: 55, text: "Langsamer Zoom und Fahrt über die Wiese auf den Waldrand", klang: false })
    .melde({ t: 7, typ: "kamera", art: "schwenk", dauer: 11, text: "Blick hebt sich langsam", klang: false })
    .melde({ t: 18, typ: "kamera", art: "schwenk", dauer: 16, text: "Neigung nach oben zu den Sonnenbögen, Brennweite 58° → 66°", klang: false })
    .melde({ t: 50, typ: "kamera", art: "fahrt", dauer: 10, text: "Weiche Fahrt zurück auf die Lichtung, Blick senkt sich", klang: false });

  const sonneV = new THREE.Vector3(), fwd = new THREE.Vector3();
  const welt = { szene, kamera: kam, post: {}, update(t) {
    pov.fov = KFOV(t); pov.posKeys = [{ t: 0, v: posBei(t) }]; pov.zielKeys = [{ t: 0, v: zielBei(t) }];
    pov.anwenden(t);
    himmel.folge(kam); boegen.folge(kam);
    const e = eps(t), w = wStaerke(t), S = saison(jahrS(t), w), dk = dekl(t), br = durchbruch(t);
    const sd = sonnenRichtung(dk, H0);
    himmel.setze({ zenit: S.zenit, horizont: S.horizont, unten: tmp2.copy(S.horizont).multiplyScalar(0.55), sonnenRichtung: sd, sonnenFarbe: S.sonne, sonnenStaerke: 28 + 10 * br, glanz: 0.7 + 0.25 * br, zirren: 0.12 + 0.12 * S.gewichte.winter });
    szene.fog.color.copy(S.horizont).lerp(tmp.set("#CAD6E2"), 0.2); szene.fog.density = 1.9e-4 * (0.8 + 0.4 * S.nebel);
    sonneV.set(...sd).normalize();
    fwd.set(...zielBei(t)).sub(kam.position).setY(0).normalize();
    sonne.position.copy(kam.position).addScaledVector(fwd, 30).addScaledVector(sonneV, 420); sonne.target.position.copy(kam.position).addScaledVector(fwd, 30); sonne.target.updateMatrixWorld();
    sonne.color.copy(S.sonne);
    const hoheS = Math.asin(sd[1]);
    sonne.intensity = (1.4 + 2.1 * Math.min(1, Math.sin(hoheS) / 0.7)) * (1 + 0.25 * br);
    hemi.intensity = 1.55 + 0.25 * S.gewichte.winter; fuell.intensity = 0.55 + 0.25 * S.gewichte.winter; fuell.color.copy(S.sonne).lerp(tmp.set('#FFFFFF'), 0.4); hemi.color.copy(S.zenit).lerp(tmp.set("#DDE8F2"), 0.5); hemi.groundColor.copy(S.gras).multiplyScalar(0.55);
    welt0.setze(t, kam, { saison: S, wind: wind(t), glanz: smoothstep(58.1, 59.0, t) * (1 - smoothstep(63.2, 65, t)), glanzR: (t - 58.1) * 48, rehe: rehZustand(t) });
    stare.setze(t); zug.mesh.visible = S.warm > 0.35 && t > 6; zug.setze(t);
    falter.mesh.visible = S.warm > 0.4 && S.schnee < 0.1; falter.setze(t);
    const wz = wolkenZeit(t);
    puffs.setze([...wolken(wz).map((c) => ({ ...c, a: 0.55 + 0.25 * S.gewichte.winter, p: [((c.p[0] + 3200) % 6400 + 6400) % 6400 - 3200, c.p[1], c.p[2]] })), ...nebelPuffs(t, S)], kam);
    glanzP.setze([], kam);
    const fall = smoothstep(0.3, 0.8, S.gewichte.winter) * 1.0;
    blaetter.setze(t, kam, { deckkraft: 0.85 * smoothstep(0.25, 0.6, S.gewichte.herbst), wind: [1.4 + 2 * wind(t), -0.5, 0.6], farbe: tmp.copy(S.laub) });
    schneeT.setze(t, kam, { deckkraft: 0.8 * fall });
    pollen.setze(t, kam, { zentrum: [kam.position.x + 1, kam.position.y + 0.5, kam.position.z - 6], deckkraft: 0.65 * clamp(S.warm + 0.3 * S.gewichte.fruehling) * (1 - S.schnee), wind: [0.3, 0.05, 0.1] });
    bluetenT.setze(t, kam, { zentrum: [kam.position.x, kam.position.y + 2, kam.position.z - 9], deckkraft: 0.7 * smoothstep(0.25, 0.7, S.gewichte.fruehling), wind: [1.1, -0.3, 0.2] });
    // Tagesbögen: erst nur die aktuelle Sonnenspur, ab 17 s alle Bögen; bei 0° eine einzige, hell leuchtende Bahn
    const konv = 1 - clamp(e / 7);
    boegen.setze({ eps: e, alpha: smoothstep(16.5, 21.5, t), jetzt: dk, jetztAlpha: 0.55 * smoothstep(1.5, 4, t) * (1 - 0.5 * smoothstep(17, 21, t)), hell: 1.0 * lerp(1, 0.32, konv) * (1 + 0.9 * br), H0 });
    const fp = farben(t);
    Object.assign(welt.post, fp, { belichtung: fp.belichtung * (1 + 0.06 * br), vignette: 0, koernung: 0.008, tiltStaerke: 0 });
  } };

  // ---------------------------------------------------------------- Text: Titel, Anzeige, Sätze, Abspann (1:1 aus dem Skript)
  const TITEL = "Was wäre, wenn die Erdachse nicht mehr geneigt wäre?";
  const FAKT = "IM JANUAR IST DIE ERDE DER SONNE AM NÄCHSTEN · 147 MILLIONEN KILOMETER";
  const SAETZE = [
    [4.8, "Eine Lichtung im Thüringer Wald, Blick nach Süden.", 3.6], [9, "Im Sommer steht die Mittagssonne über 60 Grad hoch.", 3.6],
    [13.2, "Im Winter steht sie flach über den Bäumen.", 3.6], [17.4, "Dann richtet sich die Erdachse langsam auf.", 3.6],
    [21.6, "Die Sommersonne steigt nicht mehr so hoch.", 3.6], [25.8, "Die Wintersonne klettert jedes Jahr höher.", 3.6],
    [30, "Die Schatten im Winter werden kürzer.", 3.6], [34.2, "Die Sonnenbögen rücken immer näher zusammen.", 3.6],
    [38.4, "Dann gleichen sich Sommer und Winter an.", 3.6], [42.6, "Die Winternächte werden kürzer.", 3.6],
    [46.8, "Im Winter bleibt es über elf Stunden hell.", 3.6], [51, "Die Sonnenbögen liegen fast übereinander.", 3.6],
    [55, "Dann steht die Achse fast senkrecht.", 3.6], [62.4, "Jeden Mittag steht die Sonne 39 Grad hoch.", 3.6],
    [66.4, "Jahreszeiten kommen von der Schräglage, nicht vom Abstand.", 3.4],
  ];
  const anzeige = (t) => {
    const e = eps(t);
    if (t < 20) return { etikett: "ACHSNEIGUNG", zahl: zahlDE(e, 2), einheit: "°", unter: "ZEITRAFFER: 1 SEKUNDE = 3 MONATE", wert: e };
    if (t < 40) return { etikett: "MITTAGSSONNE IM SOMMER", zahl: zahlDE(mittag(e), 1), einheit: "°", unter: `IM WINTER: ${zahlDE(mittag(-e), 1)}°`, wert: mittag(e) };
    if (t < T_HIER) return { etikett: "TAGESLÄNGE IM WINTER", zahl: zahlDE(tagH(-e), 2), einheit: "STUNDEN", unter: `ACHSNEIGUNG ${zahlDE(e, 1)}°`, wert: tagH(-e) };
    return { etikett: "TAGESLÄNGE JEDEN TAG", zahl: "HIER", einheit: "", unter: "12 STUNDEN · MITTAGSSONNE 39°", wert: 12 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE });

  const ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices, baeume: welt0.baumZahl, eps: [0, 20, 40, 60].map(eps) };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
