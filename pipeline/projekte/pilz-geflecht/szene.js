// Account 2 @stelldirvor.pov – „Was wäre, wenn du 2.400 Jahre einem Pilzgeflecht zusiehst?“ (Skript acc2-2026-11-09-abend)
// Welt: Wald (engine/welt_waldlichtung.js, Waldboden im Hang) + neuer Baustein engine/myzel.js (Boden-Querschnitt, leuchtendes Geflecht im Waldboden).
// 0–8 s Nacht im Wald (Countdown, ahnungslos). Ereignis bei 8 s = Countdown-Null: weißes Glimmen im Boden, Zeitraffer 1 s = 46 Jahre.
// 10–24 s harter Schnitt in den Boden-Querschnitt (Maßstabssprung), danach langsame Fahrt nach oben bis über den ganzen Hang (965 ha).
// Fläche, Felder, Jahr und Radius des Geflechts kommen aus sim/pilz_geflecht.mjs; Bild und Anzeige lesen dieselbe Funktion.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Himmel, PovKamera, Protokoll } from "../../engine/stil_lunar_pov.js";
import { LunarHUD, zahlDE } from "../../engine/lunar_hud.js";
import { Waldlichtung, saison, sonnenRichtung, hoehe } from "../../engine/welt_waldlichtung.js";
import { MyzelDecke, MyzelBoden } from "../../engine/myzel.js";
import * as S from "../../sim/pilz_geflecht.mjs";

const FPS = 30, DAUER = 80, T_NULL = S.T_EREIGNIS, T_HIER = S.T_HIER;
const T_IN = 10, T_AUS = 24;                                         // Querschnitt (harter Schnitt hinein und zurück)
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const MITTE = [-110, -40];
const hM = hoehe(...MITTE);
const STAND = [MITTE[0] + 3.2, hoehe(MITTE[0] + 3.2, MITTE[1] + 4.2) + 1.7, MITTE[1] + 4.2];
const HOCH = [MITTE[0], 2050, 1600], HOCHZIEL = [MITTE[0], 0, -255];
const K = (keys, e = ease.inOutSine) => (t) => keyframes(keys.map(([tt, v, ee]) => ({ t: tt, v, e: ee || e })), t);

// Tageszeit: 0 = Nacht … 1 = Tag (Nacht 0–10, Morgengrauen 16–24, Herbsttag 26–33, bedeckt, Schnee 41–45, goldenes Abendlicht 45–70)
const TAG = K([[0, 0.3], [10, 0.3], [16, 0.38], [24, 0.6], [26.5, 1], [33, 0.85], [41, 0.7], [45, 0.95], [52, 1], [80, 1]]);
const JAHRZ = K([[0, 0.35], [24, 0.3], [27, 0.56], [33, 0.6], [39, 0.78], [42, 0.88], [47, 0.88], [52, 0.36], [80, 0.36]]);   // Jahresposition für saison()
const GOLD = (t) => smoothstep(44, 50, t) * (1 - smoothstep(70, 74, t));

async function start() {
  aktiviereHoehenNebel({ abfall: 0.0035, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#0C1424", 1.9e-4);
  const kam = new THREE.PerspectiveCamera(60, 1080 / 1920, 0.05, 40000);
  const welt0 = new Waldlichtung(szene, { schatten: SCHATTEN > 0 });
  const himmel = new Himmel(szene, { radius: 9000, zenit: "#050B1E", horizont: "#101C3A", unten: "#0A1020", dunst: 0.28, sonnenRichtung: sonnenRichtung(-6, 32), sonnenStaerke: 20, glanz: 0.7, zirren: 0.1 });
  const pov = new PovKamera(kam, { pos: STAND, ziel: [MITTE[0] - 0.6, hM - 0.2, MITTE[1] - 1.2], fov: 60 }).atmen({ staerke: 1 });
  const hemi = new THREE.HemisphereLight("#BFD2E8", "#6C7A48", 1.0);
  const sonne = new THREE.DirectionalLight("#FFE2C0", 2.0);
  sonne.castShadow = SCHATTEN > 0; sonne.shadow.mapSize.set(SCHATTEN || 1, SCHATTEN || 1);
  Object.assign(sonne.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 1, far: 900 });
  sonne.shadow.bias = -0.0005; sonne.shadow.normalBias = 0.08;
  szene.add(hemi, sonne, sonne.target);
  const decke = new MyzelDecke(szene, { mitte: MITTE, rMax: 1800, seed: 3 });
  const boden = new MyzelBoden(szene, { pos: [0, -2000, 0], seed: 7 });

  const cNZ = new THREE.Color("#0A1838"), cNH = new THREE.Color("#22386A"), tmp = new THREE.Color(), tmp2 = new THREE.Color(), gold = new THREE.Color("#FFB866");
  const sdTag = sonnenRichtung(-6, 32), sdAbend = sonnenRichtung(-12, 74), sonneV = new THREE.Vector3();

  // ---------------------------------------------------------------- Kamera
  const w = (t) => { const f = clamp((t - T_AUS) / (56 - T_AUS)); return ease.inOutSine(f) ** 1.5; };    // Aufstieg 24–56 s
  const hOben = (t) => (t < 26.6 ? STAND[1] : t < 30.5 ? STAND[1] * Math.pow(45 / STAND[1], ease.inOutSine((t - 26.6) / 3.9)) : 45 * Math.pow(HOCH[1] / 45, ease.inOutSine(clamp((t - 30.5) / 25.5)) ** 1.2));
  const posOben = (t) => {
    const h = hOben(t), f = clamp((h - 45) / (HOCH[1] - 45));
    return [lerp(STAND[0], HOCH[0], f), Math.max(h, hoehe(lerp(STAND[0], HOCH[0], f), lerp(STAND[2], HOCH[2], f)) + 4), lerp(STAND[2], HOCH[2], f)];
  };
  const zielOben = (t) => { const k = clamp((hOben(t) - 45) / (HOCH[1] - 45)); const f = Math.pow(k, 0.8); return [lerp(MITTE[0] - 0.6, HOCHZIEL[0], f), lerp(hM - 0.2, HOCHZIEL[1], f), lerp(MITTE[1] - 1.2, HOCHZIEL[2], f)]; };
  const schnittWurzel = (t) => smoothstep(18, 21, t);                      // innerhalb des Querschnitts langsam näher an die Wurzel
  const KOMMT = K([[0, 60], [8, 56], [24, 60], [40, 64], [56, 62], [70, 60]]);
  const KOMPITCH = K([[0, 0], [8, 3]]);

  // ---------------------------------------------------------------- Protokoll
  const prot = new Protokoll();
  prot.effekt(0.5, "nebel_zieht", { klang: false, text: "Nebel kriecht durch den Nachtwald, Mondlicht in den Wipfeln" })
    .effekt(2.4, "reh_zieht", { klang: false, text: "Ein Reh zieht vorbei" })
    .effekt(4.2, "nebel_dichter", { klang: false, text: "Nebel wird dichter, Kamera fährt ein" })
    .effekt(T_NULL, "gimmen_im_boden", { klang: "windstoss", staerke: 0.7, dauer: 2.5, text: "Countdown-Null: weißes Glimmen im Boden unter der Kamera, Licht kippt ins Kühle, Zeitraffer startet" })
    .effekt(9.0, "faeden_kriechen", { klang: false, text: "Weiße Fäden kriechen durch den Waldboden" })
    .effekt(T_IN, "schnitt_querschnitt", { klang: "zischen", staerke: 0.5, dauer: 2, text: "Harter Schnitt in den Boden-Querschnitt: leuchtende Fäden von Wurzel zu Wurzel" })
    .effekt(13.0, "faeden_wachsen", { klang: false, text: "Fäden verzweigen sich, Rhizomorphe laufen voraus" })
    .effekt(15.8, "wurzelkontakt", { klang: "windstoss", staerke: 0.4, dauer: 2, text: "Fäden dringen in die Wurzel der Tanne" })
    .effekt(19.6, "tanne_verliert_nadeln", { klang: false, text: "Die Tanne wird braun, Wurzel färbt sich dunkel" })
    .effekt(23.4, "tanne_stuerzt", { klang: "druckwelle", staerke: 0.35, dauer: 3, text: "Erschütterung: die Tanne stürzt, Staubwolke im Querschnitt" })
    .effekt(T_AUS, "zurueck_oberflaeche", { klang: "windstoss", staerke: 0.45, dauer: 2, text: "Harter Schnitt zurück an die Oberfläche, Morgengrauen, Geflecht leuchtet unter dem Wald" })
    .effekt(26.6, "huete_im_moos", { klang: false, text: "Herbst: braune Pilzhüte sprießen aus dem Moos" })
    .effekt(29.8, "hektar_170", { klang: false, text: "Nach 1.000 Jahren 170 Hektar, Netz leuchtet weiter" })
    .effekt(33.6, "luecken", { klang: false, text: "Lücken im Wald, Geflecht darunter wächst" })
    .effekt(37.4, "jungwuchs", { klang: false, text: "Junge Bäume schließen die Lücken" })
    .effekt(41.2, "schnee", { klang: "windstoss", staerke: 0.3, dauer: 3, text: "Schnee fällt, Geflecht schimmert durch" })
    .effekt(45.6, "fussballfelder", { klang: false, text: "Das Geflecht bedeckt über 700 Fußballfelder, Licht wird golden" })
    .effekt(49.4, "netz_hang", { klang: "zischen", staerke: 0.4, dauer: 3, text: "Das Netz spannt sich unter dem ganzen Hang" })
    .effekt(53.2, "ein_pilz", { klang: false, text: "Ein einziger Pilz: das Netz schließt sich" })
    .effekt(T_HIER, "hoehepunkt", { klang: "windstoss", staerke: 0.85, dauer: 3, text: "Höhepunkt: höchster Punkt, das ganze Geflecht leuchtet einmal auf, Anzeige HIER" })
    .effekt(62.4, "netz_erlischt", { klang: "zischen", staerke: 0.4, dauer: 3, text: "Das Netz erlischt, nur ein paar Pilze im Moos" })
    .effekt(66.0, "ruhe", { klang: false, text: "Ruhiger Wald im Abendlicht" });
  prot.melde({ t: 0.3, typ: "kamera", art: "fahrt", dauer: 7.7, text: "Langsame Fahrt ein auf den Waldboden, Zoom 60° → 56°", klang: false })
    .melde({ t: T_IN, typ: "schnitt", grund: "Maßstabssprung: Boden-Querschnitt", klang: false })
    .melde({ t: 12, typ: "kamera", art: "zoom", dauer: 12, text: "Querschnitt: Kamera nähert sich der Wurzel", klang: false })
    .melde({ t: T_AUS, typ: "schnitt", grund: "Zurück an die Oberfläche (Szenensprung)", klang: false })
    .melde({ t: 24, typ: "kamera", art: "fahrt", dauer: 32, text: "Weiche Fahrt nach oben über den Hang, Neigung nach unten", klang: false })
    .melde({ t: 58, typ: "kamera", art: "fahrt", dauer: 12, text: "Langsame Drift am höchsten Punkt", klang: false });

  const welt = { szene, kamera: kam, post: {}, update(t) {
    const im = t >= T_IN && t < T_AUS;
    boden.zeige(im); decke.zeige(!im);
    const tag = TAG(t), gld = GOLD(t), S0 = saison(JAHRZ(t), 1);
    // Kamera
    if (im) {
      const k = boden.kamera(t < 17 ? "total" : "wurzel"); const kt = boden.kamera("total"), kw = boden.kamera("wurzel");
      const m = schnittWurzel(t);
      pov.fov = lerp(kt.fov, kw.fov, m); pov.posKeys = [{ t: 0, v: kt.pos.map((v, i) => lerp(v, kw.pos[i], m)) }]; pov.zielKeys = [{ t: 0, v: kt.ziel.map((v, i) => lerp(v, kw.ziel[i], m)) }];
      void k;
    } else {
      const p = t < T_IN ? [STAND[0] + 0.35 * Math.sin(t * 0.12), STAND[1], STAND[2] - 0.8 * ease.inOutSine(clamp(t / 8))] : posOben(t);
      const z = t < T_IN ? [MITTE[0] - 0.6 + 0.7 * smoothstep(0, 8, t), hM - 0.2 + 0.6 * smoothstep(0, 8, t), MITTE[1] - 1.2 - 2 * smoothstep(0, 8, t)] : t < T_AUS + 0.01 ? zielOben(T_AUS) : zielOben(t);
      pov.fov = t < T_IN ? KOMMT(t) : KOMMT(t); pov.posKeys = [{ t: 0, v: p }]; pov.zielKeys = [{ t: 0, v: z }];
    }
    pov.anwenden(t);
    himmel.folge(kam);
    // Licht und Himmel
    const nachtF = 1 - clamp(tag * 1.2);
    tmp.copy(cNZ).lerp(S0.zenit, clamp(tag * 1.15)); tmp2.copy(cNH).lerp(S0.horizont, clamp(tag * 1.15));
    if (gld > 0) { tmp2.lerp(gold, 0.5 * gld); }
    const sd = sdTag.map((v, i) => lerp(v, sdAbend[i], gld));
    himmel.setze({ zenit: tmp, horizont: tmp2, unten: tmp2.clone().multiplyScalar(0.5), sonnenRichtung: sd, sonnenFarbe: gld > 0.2 ? gold : S0.sonne, sonnenStaerke: 8 + 26 * tag, glanz: 0.5 + 0.3 * tag, zirren: 0.12 });
    szene.fog.color.copy(tmp2).lerp(new THREE.Color("#CAD6E2"), 0.2 * tag); szene.fog.density = lerp(2.6e-4, 1.8e-4, tag) * (1 - 0.85 * smoothstep(32, 54, t));
    sonneV.set(...sd).normalize();
    sonne.position.copy(kam.position).addScaledVector(sonneV, 420); sonne.target.position.copy(kam.position); sonne.target.updateMatrixWorld();
    sonne.color.set(nachtF > 0.3 ? "#9FB8F0" : gld > 0.2 ? "#FFC880" : "#FFF0D8");
    sonne.intensity = 1.6 + 1.2 * tag; hemi.intensity = 1.9 - 0.9 * tag; hemi.color.copy(S0.zenit).lerp(new THREE.Color("#40527F"), nachtF * 0.7);
    welt0.setze(t, kam, { saison: S0, wind: 0.7 + 0.2 * Math.sin(t * 0.4), rehe: { wachsam: [0, 0, 0, 0], gehen: [0.3, 0.1, 0.1, 0.1] } });
    // Geflecht
    const r = S.radiusM(t), br = smoothstep(T_HIER - 0.3, T_HIER + 1.2, t) * (1 - smoothstep(61, 64, t));
    const zeigeNetz = t >= T_NULL;
    const durch = 1 - 0.5 * smoothstep(T_AUS + 1, 40, t) * (1 - smoothstep(T_HIER - 3, T_HIER, t));
    if (!im) {
      decke.update(t, { radius: Math.max(0.01, r), deckung: zeigeNetz ? durch : 0, glanz: (t >= T_NULL ? 1.5 : 0) + 1.2 * br + 1.2 * tag * 0.3, huete: smoothstep(26, 29, t) * (1 - smoothstep(62, 66, t)) * 0.8, farbe: "#E6FFF0" });
    } else {
      const wach = smoothstep(T_IN, 17.5, t) * 0.6 + 0.4 * smoothstep(15.5, T_AUS, t);
      boden.update(t, { wachstum: clamp(wach), befall: smoothstep(16, T_AUS - 1, t), glanz: 1 });
    }
    const sh = 0.012 * Math.exp(-(((t - 23.4) / 0.3) ** 2));
    Object.assign(welt.post, im
      ? { belichtung: 1.0, saettigung: 1.0, kontrast: 1.05, bloomStaerke: 1.3, bloomSchwelle: 0.85, vignette: 0.28, koernung: 0.01, tiltStaerke: 0, tonungStaerke: 0 }
      : { belichtung: (0.95 + 0.1 * tag - 0.12 * smoothstep(48, 56, t) + 0.9 * nachtF) * (1 + 0.1 * br), saettigung: 1.05, kontrast: 1.06, bloomStaerke: 1.1 + 0.3 * br, bloomSchwelle: 0.95, vignette: 0.12, koernung: 0.008, tiltStaerke: 0, tonungStaerke: gld * 0.25, tonung: [1.08, 1.02, 0.9] });
    if (sh > 0) kam.rotateZ(sh * Math.sin(t * 80));
  } };

  // ---------------------------------------------------------------- Text
  const TITEL = "Was wäre, wenn du 2.400 Jahre einem Pilzgeflecht zusiehst?";
  const FAKT = "Malheur National Forest, Oregon · 965 Hektar · Alter mindestens 2.400, vielleicht 8.650 Jahre";
  const SAETZE = [
    [4.8, "Du stehst nachts am Waldhang in Oregon.", 3.45], [8.4, "Dann beginnt unter dir ein Pilz zu wachsen.", 3.45], [12, "Weiße Fäden kriechen von Wurzel zu Wurzel.", 3.6],
    [15.8, "Sie dringen in die Wurzeln einer Tanne.", 3.65], [19.6, "Oben verliert die Tanne ihre Nadeln.", 3.65], [23.4, "Dann stürzt sie, und junge Bäume wachsen nach.", 3.05],
    [26.6, "Im Herbst sprießen braune Hüte aus dem Moos.", 3.05], [29.8, "Nach 1.000 Jahren misst das Geflecht 170 Hektar.", 3.65], [33.6, "Im Wald entstehen Lücken mit toten Stämmen.", 3.65],
    [37.4, "Junge Bäume schließen sie wieder.", 3.65], [41.2, "Schnee fällt, das Geflecht wächst weiter.", 4.2], [45.6, "Es bedeckt jetzt über 700 Fußballfelder.", 3.65],
    [49.4, "Dann spannt es sich unter dem ganzen Hang.", 3.65], [53.2, "Ein einziger Pilz, genetisch überall gleich.", 3.65], [62.4, "Oben siehst du nur ein paar Pilze.", 3.65],
    [66.4, "Er ist der größte bekannte Pilz der Welt.", 3.4],
  ];
  const jahrTxt = (t) => `JAHR ${zahlDE(Math.round(S.jahr(t)))}`;
  const anzeige = (t) => {
    if (t < T_NULL) return { etikett: "PILZ KEIMT IN", zahl: S.countdownText(t), einheit: "", unter: t < 4 ? "BLUE MOUNTAINS, OREGON" : "WALD AHNUNGSLOS", wert: T_NULL - t };
    if (t < 30) return { etikett: "FLÄCHE", zahl: zahlDE(S.flaeche(t), 1), einheit: "HEKTAR", unter: t < 16 ? "1 SEKUNDE = 46 JAHRE" : t < 23 ? "ERSTE TANNE BEFALLEN" : t < 27 ? "TANNE STÜRZT" : jahrTxt(t), wert: S.flaeche(t) };
    if (t < 50) return { etikett: "FUSSBALLFELDER", zahl: zahlDE(Math.round(S.felder(t))), einheit: "", unter: t < 34 ? jahrTxt(t) : t < 41 ? "LÜCKEN IM WALD" : t < 46 ? "WINTER" : jahrTxt(t), wert: S.felder(t) };
    if (t < T_HIER) return { etikett: "FLÄCHE", zahl: zahlDE(S.flaeche(t), 1), einheit: "HEKTAR", unter: t < 53 ? jahrTxt(t) : t < 56 ? "EIN EINZIGER PILZ" : jahrTxt(t), wert: S.flaeche(t) };
    return { etikett: "HIER", zahl: "HIER", einheit: "", unter: "965 HEKTAR · ÜBER 1.350 FUSSBALLFELDER · JAHR 2.400", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE });
  const ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices, deckeVertices: decke.vertices, bodenVertices: boden.vertices };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
