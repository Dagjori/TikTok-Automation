// Account 2 @stelldirvor.pov – „Was wäre, wenn die Erde immer näher an die Sonne rücken würde?“ (Skript acc2-2026-11-03-mittag)
// Küstenklippe am Atlantik (generisch, Westirland-ähnlich), Mittagssonne über dem Meer. Grundwelt engine/welt_kueste_klippe.js (Erstbau).
// Die Entfernung zur Sonne ist die Zeitachse (sim/sonne_naeher.mjs: r(t), anzeige(t)); Sonne wächst in echter Winkelgröße (× 1,8 überhöht,
// damit die Scheibe am Anfang lesbar ist; das Verhältnis bleibt 149,598/r). Eine durchgehende Einstellung: Ruhe, Schwenk die Klippe entlang,
// Schwenk zurück und Zoom (Brennweite) auf die Sonne, Weißblende bei HIER (60 s), danach Blick auf die Sonnenoberfläche.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Puffs, Partikel, PovKamera, farbPhasen, Protokoll } from "../../engine/stil_lunar_pov.js";
import { LunarHUD, zahlDE } from "../../engine/lunar_hud.js";
import { KuesteKlippe } from "../../engine/welt_kueste_klippe.js";
import * as S from "../../sim/sonne_naeher.mjs";

const FPS = 30, DAUER = 80, T_HIER = 60;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const D2R = Math.PI / 180;
const richtung = (yaw, pitch) => [Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R)];
const SONNE = richtung(-6, 11);                        // Mittagssonne im Spätherbst über dem Atlantik (≈ 11° hoch, leicht links)
const UEBERHOEHT = 1.8;
const sonnenWinkel = (t) => Math.asin(Math.min(0.995, UEBERHOEHT * S.R_SONNE / S.r(t)));
// Kamera-Plan (Grad): Ruhe 0–19 s, Schwenk die Klippe entlang 19–37 s, Schwenk zurück 37–46 s, Blick hebt sich und Zoom auf die Sonne 46–58 s
const BLICK = [{ t: 0, v: [-3, -6] }, { t: 19, v: [-3, -6] }, { t: 37, v: [17, -9.5], e: ease.inOutSine }, { t: 46, v: [-4, -2], e: ease.inOutSine }, { t: 52, v: [-5.5, 4], e: ease.inOutSine }, { t: 57.5, v: [-6, 7.6], e: ease.inOutSine }, { t: 70, v: [-5, 9.5], e: ease.inOutSine }];
const FOV = [{ t: 0, v: 52 }, { t: 46, v: 52 }, { t: 58, v: 28, e: ease.inOutSine }, { t: 70, v: 26, e: ease.inOutSine }];

async function start() {
  aktiviereHoehenNebel({ abfall: 0.0009, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#C5CDD6", 4.0e-5);
  const kam = new THREE.PerspectiveCamera(52, 1080 / 1920, 0.1, 60000);
  const welt0 = new KuesteKlippe(szene, { schatten: SCHATTEN > 0, sonne: SONNE });
  const AUGE = [0, welt0.augeY, 0];
  const zielBei = (t) => { const [y, p] = keyframes(BLICK, t), d = richtung(y, p); return [AUGE[0] + d[0] * 1000, AUGE[1] + d[1] * 1000, AUGE[2] + d[2] * 1000]; };
  const pov = new PovKamera(kam, { pos: AUGE, ziel: zielBei(0), fov: 52 }).atmen({ staerke: 1 })
    .beben({ von: 55, bis: 60, staerke: 0.1, frequenz: 3.8, anstieg: 4, abkling: 0.6 })
    .stoss({ t: T_HIER, staerke: 0.9, abkling: 1.2 });

  const hemi = new THREE.HemisphereLight("#BFD0E4", "#4E4A3E", 0.9);
  const sonne = new THREE.DirectionalLight("#FFE6C4", 3.2);
  sonne.castShadow = SCHATTEN > 0; sonne.shadow.mapSize.set(SCHATTEN || 1, SCHATTEN || 1);
  Object.assign(sonne.shadow.camera, { left: -500, right: 500, top: 500, bottom: -500, near: 10, far: 6000 });
  sonne.shadow.bias = -0.001; sonne.shadow.normalBias = 1.2;
  const fuell = new THREE.DirectionalLight("#AFC0D6", 0.55);   // Himmelslicht von hinten, zeigt die Schichten der Wände im Gegenlicht
  fuell.position.set(300, 500, 1500);
  szene.add(hemi, sonne, sonne.target, fuell);

  const puffs = new Puffs(szene, { max: 1100, schatten: 0.6 });
  const funken = new Partikel(szene, { art: "funken", anzahl: 1400, box: [36, 18, 36], seed: 31, groesse: 0.04 });
  const flirren = new Partikel(szene, { art: "staub", anzahl: 1600, box: [30, 14, 30], seed: 32, groesse: 0.03, farbe: "#FFFFFF" });
  const glutFunken = new Partikel(szene, { art: "funken", anzahl: 1800, box: [24, 14, 24], seed: 33, groesse: 0.05 });

  // ---------------------------------------------------------------- Zustände je Zeit (aus dem Skript, siehe skript.json → bewegungsplan)
  const K = (keys) => (t) => keyframes(keys.map(([tt, v, e]) => ({ t: tt, v, e: e || ease.inOutSine })), t);
  const duerre = K([[0, 0], [18, 0], [22, 0.25], [24, 0.55], [26.5, 1.0], [44, 1.08], [47.5, 1.3], [50.5, 1.47]]);
  const pegel = K([[0, 0], [30.5, 0], [40, -127]]);
  const kochen = K([[0, 0], [25.5, 0], [28, 0.3], [31.5, 0.85], [36, 1]]);
  const dampf = K([[0, 0], [12.5, 0], [15, 0.22], [24, 0.3], [27.5, 0.85], [33, 1], [39, 0.75], [42.5, 0]]);
  const salz = K([[0, 0], [35, 0], [42, 1]]);
  const glut = K([[0, 0], [47.5, 0], [49.5, 0.32], [53, 0.66], [57, 0.92], [60, 1]]);
  const rauch = K([[0, 0], [45.5, 0], [47.5, 1], [52, 0.5], [55, 0]]);
  const wolken = K([[0, 1], [21, 1], [32, 0]]);
  const milch = K([[0, 0], [12, 0], [16, 0.06], [26, 0.16], [33, 0.38], [40, 0.48], [46, 0.42], [55, 0.5]]);
  const flaeche = K([[0, 0], [60.25, 0], [61.4, 1]]);
  const weiss = (t) => t < 59.4 ? 0 : t < 60.05 ? ease.inQuad((t - 59.4) / 0.65) : t < 60.7 ? 1 : 1 - ease.outCubic(clamp((t - 60.7) / 2.4));
  const farbe = (keys) => { const C = keys.map(([tt, c]) => [tt, new THREE.Color(c)]), o = new THREE.Color(); return (t) => { o.copy(C[0][1]); for (let i = 1; i < C.length; i++) { if (t <= C[i][0]) { const p = ease.inOutSine(clamp((t - C[i - 1][0]) / (C[i][0] - C[i - 1][0]))); return o.copy(C[i - 1][1]).lerp(C[i][1], p); } o.copy(C[i][1]); } return o; }; };
  const zenit = farbe([[0, "#5A7FB8"], [14, "#6585BA"], [26, "#7D97BE"], [36, "#A9B3BE"], [46, "#B3A48C"], [56, "#A8704A"]]);
  const horizont = farbe([[0, "#C2CCD6"], [14, "#CCD3D9"], [26, "#D6DADC"], [36, "#E2E0DA"], [46, "#E4D2B6"], [56, "#E0A870"]]);
  const milchF = farbe([[0, "#E4E6E7"], [36, "#E8E5DE"], [46, "#E6D4B6"], [56, "#D99A60"]]);
  const sonnenF = farbe([[0, "#FFF0D6"], [30, "#FFF8F0"], [46, "#FFF6E6"], [56, "#FFE9C8"]]);
  const lichtF = farbe([[0, "#FFE6C4"], [30, "#FFF6EC"], [46, "#FFF1DC"], [56, "#FFD9A6"]]);
  const sonnenHell = K([[0, 16], [36, 14], [44, 6], [49, 4.2], [53, 2.8], [57, 1.45], [60, 2.0], [63, 1.1]]);
  const korona = K([[0, 0.55], [40, 0.75], [50, 1.3], [57, 1.5]]);
  const glanz = K([[0, 0.32], [30, 0.45], [38, 0.5], [44, 0.35], [50, 0.4], [57, 0.45]]);
  const nebel = K([[0, 3.6e-5], [14, 4.2e-5], [30, 5.2e-5], [38, 7e-5], [46, 6.5e-5], [56, 7.5e-5]]);
  const licht = K([[0, 3.2], [30, 3.5], [44, 4.1], [56, 5.2]]);

  const farben = farbPhasen([
    { t: 0, phase: "alltag", werte: { saettigung: 1.0, kontrast: 1.04, bloomStaerke: 0.85 } },
    { t: 14, phase: "alltag", werte: { saettigung: 1.0, kontrast: 1.04, bloomStaerke: 0.85 } },
    { t: 30, phase: "alltag", werte: { belichtung: 1.04, saettigung: 0.9, kontrast: 1.0, bloomStaerke: 1.0 } },
    { t: 40, phase: "grell", werte: { belichtung: 0.92, saettigung: 0.88, kontrast: 1.06, bloomStaerke: 1.2, schleierStaerke: 0.08, tonungStaerke: 0.2 } },
    { t: 46, phase: "grell", werte: { belichtung: 0.93, saettigung: 0.95, kontrast: 1.06, bloomStaerke: 1.25, schleierStaerke: 0.06, tonungStaerke: 0.25 } },
    { t: 52, phase: "hitze", werte: { belichtung: 0.95, saettigung: 1.18, kontrast: 1.1, bloomStaerke: 1.05, schleierStaerke: 0.03 } },
    { t: 59.2, phase: "hitze", werte: { belichtung: 0.98, saettigung: 1.15, kontrast: 1.1, bloomStaerke: 1.15, schleierStaerke: 0.04 } },
    { t: 63, phase: "hitze", werte: { belichtung: 0.9, saettigung: 1.15, kontrast: 1.12, bloomStaerke: 1.15, schleierStaerke: 0.0, tonungStaerke: 0.35 } },
    { t: 70, phase: "hitze", werte: { belichtung: 0.82, saettigung: 1.05, kontrast: 1.08, bloomStaerke: 1.0, schleierStaerke: 0.0, tonungStaerke: 0.35 } },
  ]);
  const flimmern = K([[0, 0], [44, 0], [50, 0.9], [57, 2.0], [60, 2.4], [62, 1.0], [70, 0.8]]);

  // ---------------------------------------------------------------- Protokoll (Klang an genau diesen Stellen, atmo.py)
  const prot = new Protokoll();
  prot.effekt(13.2, "dunst_ueber_dem_meer", { klang: false, text: "Wasserverlust-Grenze 148,1 Mio. km bei 15 s" })
    .effekt(19.5, "moewen_fliehen", { klang: "fluegel" })
    .effekt(22.4, "wiese_gelb", { klang: "windstoss", staerke: 0.4 })
    .effekt(26.8, "dampf", { klang: "zischen", dauer: 4, staerke: 0.7 })
    .effekt(30.5, "meer_kocht", { klang: "zischen", dauer: 6, staerke: 1 })
    .effekt(33.0, "meer_sinkt", { klang: "grollen", dauer: 6, staerke: 0.35 })
    .effekt(40.0, "grund_frei", { klang: "windstoss", staerke: 0.5 })
    .effekt(46.5, "wiese_brennt", { klang: "zischen", dauer: 3, staerke: 0.6 })
    .effekt(48.8, "felsen_gluehen", { klang: "grollen", dauer: 5, staerke: 0.6 })
    .effekt(55.0, "parker_distanz", { klang: "windstoss", staerke: 0.9, dauer: 4 })
    .effekt(59.4, "aufhellung_weiss", { klang: "blitz" })
    .effekt(T_HIER, "sonnenoberflaeche_weiss", { klang: "einschlag", staerke: 0.9 })
    .effekt(T_HIER + 1.2, "tinnitus", { dauer: 8.5 });
  prot.melde({ t: 19, typ: "kamera", art: "schwenk", dauer: 18, text: "Schwenk die Klippe entlang (−3° → +17°)", klang: false })
    .melde({ t: 37, typ: "kamera", art: "schwenk", dauer: 20.5, text: "Schwenk zurück zur Sonne (37–46 s), Blick hebt sich bis 57,5 s (+17° → −6°, −9,5° → +7,6°)", klang: false })
    .melde({ t: 46, typ: "kamera", art: "zoom", dauer: 12, von: 52, bis: 28, text: "Zoom über die Brennweite 52° → 28° (szene.js setzt pov.fov je Bild)", klang: false });

  const sDir = new THREE.Vector3(...SONNE), cT = new THREE.Color();
  const welt = { szene, kamera: kam, post: {}, update(t) {
    pov.fov = keyframes(FOV, t);
    pov.zielKeys = [{ t: 0, v: zielBei(t) }];          // Blick je Bild aus dem Kamera-Plan (rein aus t)
    const z = pov.anwenden(t);
    const auf = t >= 60.6;                              // Blick auf die Sonnenoberfläche
    const sw = sonnenWinkel(t);
    welt0.himmel.setze({ sonnenRichtung: SONNE, sonnenWinkel: auf ? 1.45 : sw, sonnenHell: sonnenHell(t), korona: korona(t), glanz: glanz(t), zeit: t,
      zenit: zenit(t), horizont: horizont(t), milch: milch(t), milchFarbe: milchF(t), sonnenFarbe: sonnenF(t), flaeche: flaeche(t), zirren: 0.2 * wolken(t) });
    welt0.setze(t, kam, { duerre: duerre(t), pegel: pegel(t), kochen: kochen(t), glut: glut(t), salz: salz(t), wind: 0.55 + 0.35 * smoothstep(40, 58, t),
      sonneDir: SONNE, sonneFarbe: cT.copy(sonnenF(t)), himmelFarbe: horizont(t), sichtbar: !auf });
    sonne.position.copy(sDir).multiplyScalar(3000); sonne.target.position.set(0, 0, -300);
    sonne.color.copy(lichtF(t)); sonne.intensity = licht(t) * (auf ? 0 : 1);
    hemi.intensity = 0.9 + 0.5 * smoothstep(28, 42, t) + 0.4 * glut(t); hemi.color.set("#BFD0E4").lerp(cT.set("#F2E6D0"), smoothstep(28, 50, t));
    fuell.intensity = 0.55 * (1 - smoothstep(30, 40, t)) + 0.25;
    szene.fog.color.copy(horizont(t)).lerp(milchF(t), milch(t) * 0.7);
    szene.fog.density = nebel(t);
    puffs.setze(auf ? [] : welt0.puffs(t, { dampf: dampf(t), wolken: wolken(t), rauch: rauch(t) }), kam);
    funken.setze(t, kam, { deckkraft: 0.9 * smoothstep(47, 50, t) * (auf ? 0.4 : 1), wind: [1.2, 1.6, 0.6] });
    flirren.setze(t, kam, { deckkraft: 0.35 * smoothstep(40, 46, t) * (1 - smoothstep(58, 60, t)), wind: [0.5, 0.8, 0.2] });
    glutFunken.setze(t, kam, { deckkraft: auf ? 0.8 * (1 - smoothstep(68, 70, t)) : 0, wind: [2.0, 2.4, -0.6] });
    const f = farben(t), w = weiss(t);
    Object.assign(welt.post, f, {
      schleier: [1, 0.985, 0.95], schleierStaerke: Math.max(f.schleierStaerke, w),
      belichtung: f.belichtung * (1 + 0.6 * w), flimmern: flimmern(t), flimmerY: [0, 0.75], unschaerfe: f.unschaerfe + 0.25 * w,
      vignette: 0, koernung: 0.008, tiltStaerke: 0,
    });
    return z;
  } };

  // ---------------------------------------------------------------- Text: Titel, Anzeige, Sätze, Abspann
  const TITEL = "Was wäre, wenn die Erde immer näher an die Sonne rücken würde?";
  const FAKT = "Wasserverlust-Grenze: 0,99 AE\nVenus 467 °C · Sonnenoberfläche 5.500 °C";
  const SAETZE = [
    [4.8, "Du stehst mittags an einer Klippe in Irland.", 3.7], [9.2, "Dann rückt die Erde näher an die Sonne.", 3.7],
    [13.6, "Ein Prozent näher, und das Wasser entweicht.", 3.7], [18.0, "Die Sonnenstrahlung steigt mit jedem Kilometer.", 3.7],
    [22.4, "Die Wiese wird gelb, dann braun.", 3.7], [26.8, "Über dem Meer steigt Dampf auf.", 3.7],
    [31.2, "Jetzt kreist die Erde auf der Venusbahn.", 3.7], [35.6, "Die Venus ist dort 467 Grad heiß.", 3.7],
    [40.0, "Das Meer ist verdampft, der Grund liegt frei.", 3.7], [44.4, "Auf der Merkurbahn ist die Sonne zweieinhalbmal so groß.", 3.7],
    [48.8, "Die Felsen der Klippe beginnen zu glühen.", 3.7], [53.2, "So nah kam nur die Sonde Parker.", 3.7],
    [62.4, "Die Oberfläche der Sonne hat 5.500 Grad.", 3.3], [66.4, "Heute trennen uns 150 Millionen Kilometer.", 3.4],
  ];
  const entf = (t) => `ENTFERNUNG: ${zahlDE(S.r(t), 1)} MIO. KM`;
  const anzeige = (t) => {
    const a = S.anzeige(t), v = a.wert;
    if (t < 18) return { etikett: a.etikett, zahl: zahlDE(v, 2), einheit: a.einheit, unter: t < 12.5 ? "GEDANKENEXPERIMENT: DIE ERDE RÜCKT NÄHER" : "WASSERVERLUST-GRENZE: 148,1 MIO. KM", wert: v };
    if (t < 44) return { etikett: a.etikett, zahl: zahlDE(v, 2), einheit: a.einheit, unter: t >= 30 && t < 38 ? "VENUSBAHN · VENUS: 467 °C" : entf(t), wert: v };
    if (t < 55) return { etikett: a.etikett, zahl: zahlDE(v, v < 10 ? 1 : 0), einheit: a.einheit, unter: t < 50 ? "MERKURBAHN · 57,9 MIO. KM" : entf(t), wert: v };
    if (t < T_HIER) return { etikett: a.etikett, zahl: zahlDE(v, v < 1 ? 2 : 1), einheit: a.einheit, unter: t < 57.5 ? "HIER FLOG DIE SONDE PARKER" : "SONNENOBERFLÄCHE: 5.500 °C", wert: v };
    return { etikett: a.etikett, zahl: "HIER", einheit: "", unter: "", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE });
  hud.flecken({ von: T_HIER + 0.6, bis: 71, anzahl: 16, art: "hell", seed: 9, wind: [8, -12] });

  const ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices, augeY: welt0.augeY };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
