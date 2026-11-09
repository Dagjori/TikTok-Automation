// Account 2 @stelldirvor.pov – „Was wäre, wenn du 28 Jahre lang Ameisen zusiehst?“ (Skript acc2-2026-11-10-mittag)
// Welt: engine/welt_garten_terrasse.js (Garten mit Terrasse, Makro-Maßstab) + Objekttyp engine/ameisen.js (Arbeiterinnen, Königin, Schwarm).
// 0–2,5 s Sommerabend (Countdown, ahnungslos). Ereignis bei 2,5 s = Countdown-Null (Testblock a): eine Königin landet auf der Platte.
// Zeitraffer: 2,5–9 s 1 s ≈ 4 Std. · 9–14 s 1 s ≈ 12 Tage · 14–22 s 1 s ≈ 38 Tage · 22–60 s 1 Jahr ≈ 1,4 s. Tag, Jahr, Jahreszeit kommen aus sim/ameisen.mjs.
// Ein harter Schnitt bei 58,5 s (Höhepunkt): von nah an der Fuge auf weit über den Garten im Abendlicht mit aufsteigendem Schwarm.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Himmel, PovKamera, Protokoll } from "../../engine/stil_lunar_pov.js";
import { LunarHUD, zahlDE } from "../../engine/lunar_hud.js";
import { GartenTerrasse, jahreszeit, tageslicht, TERRASSE, NEST, ROSE, FUGE_Y } from "../../engine/welt_garten_terrasse.js";
import { Ameisen, Koenigin, Schwarm } from "../../engine/ameisen.js";
import * as S from "../../sim/ameisen.mjs";

const FPS = 30, DAUER = 80, T_NULL = S.T_EREIGNIS, T_HIER = S.T_HIER;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 4096;
const TY = TERRASSE.y;
const K = (keys, e = ease.inOutSine) => (t) => keyframes(keys.map(([tt, v, ee]) => ({ t: tt, v, e: ee || e })), t);

// Volk (Bild): erste Arbeiterinnen ab Tag ≈ 46, dann Wachstum bis ≈ 6.000 (im Text nur „Tausende“)
const volk = (t) => { const d = S.tag(t), j = S.jahr(t); if (j < 1) return d < 44 ? 0 : 6 + 14 * smoothstep(44, 300, d); return Math.min(6000, 30 + 5970 * smoothstep(1, 14, j)); };
const STUNDE = K([[0, 18.0], [9, 18.0], [10, 15], [16, 13], [22, 15], [52, 16], [56, 17.6], [80, 17.9]]);
// Jahreszeit: im schnellen Zeitraffer (ab 22 s) schwingt die Position im Jahr um Mitte Juli; in den Fenstern der Sommer-Momente
// (Frühling/Blattläuse 22–28,6 s, erster Schwarm 32,4–36 s, Hochzeitsflug ab 49 s) wird der Ausschlag eingefroren, damit sie nie im Winter landen.
const AUSSCHLAG = (t) => 1 - 0.95 * Math.max(smoothstep(21.9, 22.3, t) * (1 - smoothstep(28.6, 29.8, t)), smoothstep(31.6, 32.6, t) * (1 - smoothstep(36, 37.2, t)), smoothstep(48, 50, t));
const jahrPos = (t) => {
  if (t < S.T_JAHR0) return S.jahresPos(t);
  const p = 196 / 365 + AUSSCHLAG(t) * 0.42 * Math.sin(Math.PI * S.jahr(t));   // stetig: Mitte Juli bei jedem ganzen Jahr, dazwischen ein Ausflug Richtung Winter (kein Sprung)
  return ((p % 1) + 1) % 1;
};
// Königin: Landung 2,5 s auf der Platte, Flügel ab 4,8–6,6 s, läuft zur Fuge 6,6–8,0 s, verschwindet bis 8,8 s
const LAND = [0.045, TY + 0.0003, 0.285], FUGE = [0.0, FUGE_Y + 0.0003, 0.24];
function koenigin(t) {
  if (t < T_NULL) { const f = clamp((T_NULL - t) / T_NULL); return { pos: [LAND[0] - 0.065 * f, LAND[1] + 0.08 * f * f + 0.012 * Math.sin(t * 7) * f, LAND[2] - 0.015 * f], flug: 1, yaw: 2.2 }; }
  const geh = smoothstep(6.6, 8.0, t);
  return { pos: [lerp(LAND[0], FUGE[0], geh), lerp(LAND[1], FUGE[1], smoothstep(0.7, 1, geh)), lerp(LAND[2], FUGE[2], geh)], flug: 1 - smoothstep(T_NULL, 3.1, t), yaw: lerp(2.2, 2.9, geh),
    fluegelAb: smoothstep(4.8, 6.6, t), versinken: smoothstep(8.4, 9.6, t), tempo: t > 6.6 && t < 8.2 ? 1 : 0.15 };
}
// Kamera: [px,py,pz, zx,zy,zz, fov, fokus, tiefe]
const CAM = K([
  [0, [0.135, TY + 0.175, 0.53, 0.02, TY, 0.255, 50, 0.26, 2.4]],
  [4.5, [0.11, TY + 0.15, 0.46, 0.02, TY, 0.255, 50, 0.24, 2.4]],
  [8.6, [0.06, TY + 0.085, 0.36, 0.02, TY, 0.255, 50, 0.15, 2.4]],
  [9.8, [0.06, TY + 0.085, 0.36, 0.02, TY, 0.255, 50, 0.15, 2.4]],
  [14.0, [0.3, TY + 0.38, 0.92, -0.12, 0.06, -0.8, 56, 1.1, 0.9]],
  [19.0, [0.16, TY + 0.12, 0.62, 0, TY, 0.0, 52, 0.45, 1.4]],
  [22.5, [0.12, TY + 0.11, 0.5, 0, TY - 0.02, -0.1, 52, 0.45, 1.4]],
  [25.0, [-0.2, 0.2, -1.55, ROSE.x + 0.05, 0.28, ROSE.z + 0.15, 50, 1.35, 1.2]],
  [28.6, [-0.2, 0.2, -1.55, ROSE.x + 0.05, 0.28, ROSE.z + 0.15, 50, 1.35, 1.2]],
  [30.4, [0.18, TY + 0.2, 0.62, 0, TY + 0.03, 0.12, 54, 0.6, 1.2]],
  [54.0, [0.12, TY + 0.17, 0.56, 0, TY + 0.03, 0.15, 54, 0.55, 1.2]],
  [56.0, [0.11, TY + 0.12, 0.48, 0, TY + 0.05, 0.12, 53, 0.5, 1.1]],
  [58.4, [0.1, TY + 0.08, 0.4, 0, TY + 0.42, 0.0, 52, 0.45, 1.0]],
]);
const WEIT = K([[58.5, [0.12, 0.5, 0.62, -0.12, 1.25, -1.0, 62, 1.4, 0.5]], [70, [0.14, 0.62, 0.55, -0.1, 1.45, -1.0, 62, 1.8, 0.4]]]);

async function start() {
  aktiviereHoehenNebel({ abfall: 0.01, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#D6E2EC", 0.006);
  const kam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.004, 6000);
  const welt0 = new GartenTerrasse(szene, { schatten: SCHATTEN > 0 });
  const himmel = new Himmel(szene, { radius: 3000, zenit: "#4A84C8", horizont: "#D6E2EC", unten: "#8A8F80", dunst: 0.25, sonnenStaerke: 24, glanz: 0.7, zirren: 0.35 });
  const pov = new PovKamera(kam, { pos: [0, 0.3, 0.5], ziel: [0, 0.17, 0], fov: 50 }).atmen({ staerke: 0.5 });
  const hemi = new THREE.HemisphereLight("#C6D8EE", "#6E7A4C", 1.0);
  const sonne = new THREE.DirectionalLight("#FFF3DE", 3);
  sonne.castShadow = SCHATTEN > 0; sonne.shadow.mapSize.set(SCHATTEN || 1, SCHATTEN || 1);
  Object.assign(sonne.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 60 });
  sonne.shadow.bias = -0.0002; sonne.shadow.normalBias = 0.01;
  szene.add(hemi, sonne, sonne.target);
  const ameisen = new Ameisen(szene, { max: 2600 });
  const kn = new Koenigin(szene);
  const tanz = new Schwarm(szene, { max: 300 }), schwarm = new Schwarm(szene, { max: 1500 });
  const sv = new THREE.Vector3();

  // ---------------------------------------------------------------- Protokoll
  const prot = new Protokoll();
  prot.effekt(0.3, "gegenlicht_tanz", { klang: false, text: "Geflügelte Ameisen tanzen im Gegenlicht über dem Rasen, Hummeln an der Rose" })
    .effekt(T_NULL, "landung", { klang: "fluegel", staerke: 0.45, dauer: 1.4, text: "Countdown-Null: eine Königin landet auf der Plattenkante, Lichtreflex auf den Flügeln, Anzeige kippt auf TAGE IM NEST" })
    .effekt(4.8, "fluegel_ab", { klang: "fluegel", staerke: 0.35, dauer: 1.6, text: "Die Königin wirft ihre Flügel ab, sie glitzern auf dem Beton" })
    .effekt(6.8, "zur_fuge", { klang: false, text: "Sie läuft zur Fuge und verschwindet, Dämmerung" })
    .effekt(9.0, "zeitraffer_schneller", { klang: "windstoss", staerke: 0.3, dauer: 1.8, text: "Zeitraffer wird schneller: Tage und Nächte wechseln weich" })
    .effekt(12.5, "erste_arbeiterinnen", { klang: false, text: "Erste winzige Arbeiterinnen an der Fuge" })
    .effekt(14.0, "zeitraffer_schneller2", { klang: "zischen", staerke: 0.3, dauer: 1.5, text: "Zeitraffer wird noch schneller, Herbstlaub weht über die Platten" })
    .effekt(16.8, "schnee", { klang: "windstoss", staerke: 0.3, dauer: 3, text: "Schnee deckt den Garten zu, kaltes Licht" })
    .effekt(19.8, "fruehling", { klang: false, text: "Tauwetter, Rosen treiben aus" })
    .effekt(21.2, "strasse_waechst", { klang: false, text: "Die Ameisenstraße wächst sichtbar zum Beet" })
    .effekt(25.2, "blattlaeuse", { klang: false, text: "Nahaufnahme: Ameisen melken Blattläuse an der Rose" })
    .effekt(29.4, "sand", { klang: false, text: "Sandhäufchen quellen aus den Fugen" })
    .effekt(33.3, "erster_schwarm", { klang: "fluegel", staerke: 0.5, dauer: 2.5, text: "Erster Schwarm geflügelter Jungköniginnen steigt im Abendlicht auf" })
    .effekt(38.0, "hecke_waechst", { klang: false, text: "Hecke, Rose und Apfelbaum wachsen, Möbel wechseln" })
    .effekt(47.4, "moebel_metall", { klang: false, text: "Gartenmöbel wechseln zu Metall" })
    .effekt(51.0, "zeitraffer_bremst", { klang: "windstoss", staerke: 0.35, dauer: 3, text: "Zeitraffer bremst weich auf einen Sommerabend" })
    .effekt(54.4, "geluegelte_kriechen", { klang: "fluegel", staerke: 0.5, dauer: 3, text: "Arbeiterinnen drängen an die Fuge, erste Geflügelte kriechen heraus, Kamera neigt sich nach oben" })
    .effekt(T_HIER, "hoehepunkt", { klang: "windstoss", staerke: 0.9, dauer: 3, text: "Höhepunkt: harter Schnitt auf weit, Tausende Geflügelte steigen im Gegenlicht auf, Anzeige HIER" })
    .effekt(T_HIER + 0.2, "hoehepunkt_fluegel", { klang: "fluegel", staerke: 0.8, dauer: 3, text: "Flügelschwirren des Schwarms" })
    .effekt(63.0, "nachspiel", { klang: false, text: "Der Schwarm verteilt sich, Licht klingt zur blauen Stunde ab" })
    .effekt(66.5, "jungkoenigin_landet", { klang: false, text: "Einzelne Jungköniginnen landen im Rasen" });
  prot.melde({ t: 0.3, typ: "kamera", art: "fahrt", dauer: 4.2, text: "Sehr langsame Fahrt ein auf die Plattenfuge", klang: false })
    .melde({ t: 4.5, typ: "kamera", art: "zoom", dauer: 4.3, text: "Langsamer Zoom auf die Königin an der Fuge", klang: false })
    .melde({ t: 9.8, typ: "kamera", art: "fahrt", dauer: 4.2, text: "Fahrt zurück und höher: Blick entlang der entstehenden Ameisenstraße", klang: false })
    .melde({ t: 22.5, typ: "kamera", art: "fahrt", dauer: 2.5, text: "Fahrt über den Rasen zum Rosenbeet entlang der Ameisenstraße", klang: false })
    .melde({ t: 28.6, typ: "kamera", art: "fahrt", dauer: 1.8, text: "Fahrt zurück zur Terrassenfuge", klang: false })
    .melde({ t: 54.0, typ: "kamera", art: "schwenk", dauer: 4.4, text: "Annäherung an die Fuge, Neigung nach oben", klang: false })
    .melde({ t: T_HIER, typ: "schnitt", grund: "Höhepunkt: von nah an der Fuge auf weit über den Garten", klang: false })
    .melde({ t: 60, typ: "kamera", art: "fahrt", dauer: 10, text: "Langsame Drift am Schwarm im Gegenlicht", klang: false });

  const welt = { szene, kamera: kam, post: {}, update(t) {
    const j = S.jahr(t), jn = j < 1 ? 0 : Math.floor(j);
    const p = jahrPos(t);
    const Z = jahreszeit(p, jn), L = tageslicht(p, STUNDE(t), Z);
    // Kamera
    const RP = welt0.rosenPfad(j);
    let c = t < T_HIER ? CAM(t) : WEIT(t);
    if (t < T_HIER) {
      const w = smoothstep(23.2, 24.8, t) * (1 - smoothstep(27.6, 29.2, t));
      if (w > 0) {
        const z = RP[RP.length - 1].p, a = [z[0] + 0.1, z[1] + 0.05, z[2] + 0.2, z[0], z[1], z[2], 40, 0.23, 1.6];
        c = c.map((v, i) => lerp(v, a[i], w));
      }
    }
    pov.fov = c[6]; pov.posKeys = [{ t: 0, v: c.slice(0, 3) }]; pov.zielKeys = [{ t: 0, v: c.slice(3, 6) }];
    pov.anwenden(t); himmel.folge(kam);
    // Licht
    himmel.setze({ zenit: L.zenit, horizont: L.horizont, unten: L.horizont.clone().multiplyScalar(0.55), sonnenRichtung: L.sonne, sonnenFarbe: L.licht.farbe, sonnenStaerke: L.hoehe > -2 ? 14 + 18 * L.tag : 0, glanz: 0.45 + 0.4 * L.gold });
    szene.fog.color.copy(L.horizont);
    hemi.color.copy(L.hemi.oben); hemi.groundColor.copy(L.hemi.unten); hemi.intensity = L.hemi.staerke;
    sonne.color.copy(L.licht.farbe); sonne.intensity = L.licht.staerke;
    sv.set(...L.licht.richtung).normalize();
    const mitte = new THREE.Vector3(kam.position.x * 0.5, 0, Math.min(kam.position.z, 0.5) - 1.5);
    sonne.position.copy(mitte).addScaledVector(sv, 30); sonne.target.position.copy(mitte); sonne.target.updateMatrixWorld();
    // Welt
    welt0.setze(t, kam, { zustand: Z, jahre: j, wind: 0.8, sand: t < 9 ? 0 : clamp(0.15 + j / 10), loch: smoothstep(7.5, 9, t), blattlaeuse: j >= 1 ? 1 : 0, moebel: j < 9 ? 0 : j < 19 ? 1 : 2, hummeln: 1 });
    // Ameisen
    const v = volk(t), str = welt0.strassen(j);
    const offen = [smoothstep(0.6, 3, j) + (j < 1 && S.tag(t) > 200 ? 0.3 : 0), smoothstep(4, 9, j), smoothstep(10, 16, j)];
    const nestBoden = (x, z) => (Math.abs(x - NEST.x) < 0.0034 || Math.abs(z - 0.5) < 0.0034 ? FUGE_Y : TY);
    ameisen.update(t, { strassen: str.map((s, i) => ({ punkte: s.punkte, anteil: Math.min(1, offen[i]), gewicht: [1, 0.6, 0.4][i] })), volk: v, aktiv: Z.aktiv, tempo: 1.2, draussen: 0.5,
      nest: [NEST.x, FUGE_Y, NEST.z], nestBoden, nestRadius: 0.035 });
    const q = koenigin(t);
    kn.update(t, { sichtbar: t < 10, ...q, ablage: LAND, glanz: 0.8 * L.gold + 0.3 });
    tanz.update(t, kam, { modus: "tanzen", anzahl: t < 4 ? 220 : 0, bereich: { mitte: [-0.4, 0.35, -2.0], radius: 2.2, hoehe: 1.6 }, sonne: L.sonne, glanz: 1 });
    const gross = t > 50;
    schwarm.update(t, kam, { modus: "aufstieg", anzahl: gross ? 1500 : 160, t0: gross ? 54.0 : 33.2, dauer: gross ? 7 : 2.5, quellen: welt0.fugenPunkte.map((f) => [f[0], FUGE_Y, f[2]]), streu: 0.015,
      krabbeln: gross ? 2.5 : 1.5, steig: 0.7, hoehe: 12, wind: [0.15, -0.35], sonne: L.sonne, glanz: 1.1 });
    // Nachbearbeitung
    Object.assign(welt.post, { belichtung: lerp(1.1, 1.38, L.gold) + 0.12 * Z.kalt, bloomStaerke: 0.7 + 0.5 * L.gold, bloomSchwelle: 0.95, saettigung: lerp(1.02, 0.85, Z.kalt * 0.6), kontrast: 1.04,
      tonung: [1.08, 0.98, 0.86], tonungStaerke: 0.35 * L.gold, vignette: 0.24, koernung: 0.012, tiefeFern: c[8], fokusFern: c[7], tiefeNah: 0.35, fokusNah: c[7] * 0.4 });
  } };

  // ---------------------------------------------------------------- Text
  const TITEL = "Was wäre, wenn du 28 Jahre lang Ameisen zusiehst?";
  const FAKT = "SCHWARZE WEGAMEISE · EINE KÖNIGIN JE NEST, IM LABOR 28 ¾ JAHRE ALT";
  const SKRIPT_SAETZE = [
    [4.8, "Die Königin wirft ihre Flügel ab."], [8.8, "Dann gräbt sie sich unter die Platte."], [12.8, "Wochen später schlüpfen die ersten Arbeiterinnen."],
    [16.8, "Dann deckt Schnee den Garten zu."], [20.8, "Im Frühling führt eine Straße zum Beet."], [25, "An der Rose melken sie Blattläuse."],
    [29.2, "Jedes Jahr quillt Sand aus den Fugen."], [33.4, "Jahre später schwärmen eigene Königinnen aus."], [37.6, "Tausende Arbeiterinnen leben jetzt unter dir."],
    [41.8, "Keine von ihnen lebt so lange wie sie."], [46, "Jede einzelne ist ihre Tochter."], [50.2, "Der Garten verändert sich, das Nest bleibt."],
    [54.4, "Das Volk macht sich bereit zum Schwärmen."], [63, "Im Labor wurde eine 28 ¾ Jahre alt."], [66.8, "Mit ihr endet einmal der ganze Staat."],
  ];
  const SAETZE = SKRIPT_SAETZE.map(([t, s], i) => { const nxt = SKRIPT_SAETZE[i + 1] ? SKRIPT_SAETZE[i + 1][0] : 70.4; return [t, s, +Math.min(3.9, nxt - t - 0.4, i === 12 ? 3.6 : 9).toFixed(2)]; });
  const unter = (t) => {
    if (t < T_NULL) return "SOMMERABEND, JULI";
    if (t >= 9 && t < 10.6) return "ZEITRAFFER WIRD SCHNELLER";
    if (t >= 14 && t < 15.6) return "ZEITRAFFER WIRD SCHNELLER";
    if (t < 8) return "FLÜGEL AB";
    if (t < 12) return "NEST GEGRABEN";
    if (t < 16) return "ERSTE ARBEITERINNEN";
    if (t < 19.5) return "WINTERRUHE";
    if (t < 22) return "FRÜHLING";
    if (t < 28) return "1 JAHR ≈ 1,4 SEKUNDEN";
    if (t < 33) return "VOLK WÄCHST";
    if (t < 37) return "ERSTE JUNGKÖNIGINNEN";
    if (t < 46) return "TAUSENDE ARBEITERINNEN";
    if (t < 50) return "EINE MUTTER";
    return "LABORREKORD: 28 ¾ JAHRE";
  };
  const anzeige = (t) => {
    if (t < T_NULL) return { etikett: "LANDUNG IN", zahl: S.countdownText(t), einheit: "", unter: unter(t), wert: T_NULL - t };
    if (t < S.T_JAHR0) return { etikett: "TAGE IM NEST", zahl: zahlDE(S.tageAnzeige(t)), einheit: "", unter: unter(t), wert: S.tag(t) };
    if (t < T_HIER) return { etikett: "JAHRE IM NEST", zahl: zahlDE(S.jahrAnzeige(t)), einheit: "", unter: unter(t), wert: S.jahr(t) };
    return { etikett: "HIER", zahl: "HIER", einheit: "", unter: "28 JAHRE", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE, hinweis: "Heute Abend: die letzte Sonne vor der Polarnacht" });
  const ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
