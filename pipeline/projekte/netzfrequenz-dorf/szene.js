// Account 2 @stelldirvor.pov – „Was passiert in deinem Dorf, wenn die Netzfrequenz unter 50 Hertz fällt?“ (Skript acc2-2026-11-12-mittag)
// Welt: Dorfbahnsteig (engine/welt_dorf_bahnsteig.js, Neubau 12.11.2026), Standpunkt auf dem Bahnsteig, später Nachmittag im November, Tageslicht bis zum Schluss.
// Ereignis bei 2,5 s = Countdown-Null (Testblock a): Kraftwerk fällt aus. Stufen 1–10 des Lastabwurfs 21–46,5 s (ein Ortsteil nach dem anderen dunkel),
// HIER bei 58 s (47,5 Hz): harter Schnitt auf die Gesamtansicht von der Fußgängerbrücke, Umspannwerk, Bahnsteig und Ampel/Laternen aus, Windräder laufen aus.
// Alle Zahlen und Stufenzeiten kommen aus sim/netzfrequenz.mjs.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, farbPhasen, Protokoll } from "../../engine/stil_lunar_pov.js";
import { LunarHUD } from "../../engine/lunar_hud.js";
import { DorfBahnsteig, AUGE } from "../../engine/welt_dorf_bahnsteig.js";
import * as S from "../../sim/netzfrequenz.mjs";

const FPS = 30, DAUER = 80, T_NULL = S.T_EREIGNIS, T_HIER = S.T_HIER, T_SCHNITT = S.T_HIER;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 4096;
const D2R = Math.PI / 180, L = ease.inOutSine;
const K = (keys, e = L) => (t) => keyframes(keys.map(([tt, v, ee]) => ({ t: tt, v, e: ee || e })), t);

// ------------------------------------------------------------------------------ Kamera (yaw 0 = −z (Norden), + = rechts; pitch + = oben)
// 0–8 s Schwenk vom Umspannwerk/Windpark nach links über das Neubaugebiet (erste Bewegung sofort); 8–27 s Zoom auf das Neubaugebiet (Stufe 1 bei 21 s);
// 27–39 s langsamer Schwenk von rechts nach links über die Ortsteile (Stufen 2–6); 39,5–42 s Blick den Bahnsteig entlang (Satz „Dein Bahnsteig hat noch Licht“);
// 42,5–46 s zurück zum Dorf (Gewerbegebiet, Höfe); 46–58 s langsamer Zoom auf die Mitte. 58 s harter Schnitt (Szenensprung) auf die Gesamtansicht von der Brücke.
const KYAW = K([[0, 62], [4, 48], [8, 33], [20, 31], [27, 33], [28.2, 35], [36, -4], [39.5, -14], [41, -72], [42.2, -76], [46, -30], [57.9, -2],
  [T_SCHNITT, 24], [T_SCHNITT + 12, 34], [80, 34]]);
const KPITCH = K([[0, 5], [8, 6], [20, 5], [27, 5], [36, 4], [39.5, 4], [41, -3], [42.2, -3], [46, 4], [57.9, 4], [T_SCHNITT, -3], [T_SCHNITT + 12, -2], [80, -2]]);
const KFOV = K([[0, 60], [8, 58], [20, 52], [27, 46], [28.2, 50], [36, 58], [39.5, 58], [41, 70], [42.2, 70], [46, 56], [57.9, 40], [T_SCHNITT, 84], [T_SCHNITT + 12, 70], [80, 70]]);
const BR_POS = [34, 17.4, 5.5];                      // Fußgängerbrücke (Treppenturm), Standpunkt der Gesamtansicht
const KX = K([[0, 0], [8, 0.4], [40, -0.3], [80, 0]]);   // minimales Wiegen

// ------------------------------------------------------------------------------ Ortsteile → Stufen (Reihenfolge der Abschaltung)
const ORD = [0, 6, 7, 3, 4, 5, 2, 9, 1, 8];            // Stufe i schaltet Ortsteil ORD[i] ab: Neubau, Siedlung Ost, Hang, Schule, Kreuzung (Ampel), Kirche, West, Mühle, Gewerbe, Höfe
const NAMEN = ["Neubaugebiet", "Gewerbegebiet", "Siedlung West", "Schule und Sportplatz", "Kreuzung", "Ortskern mit Kirche", "Siedlung Ost", "Hangsiedlung", "Höfe", "Mühlenweg"];
const AUS = { ortsteile: [], ampel: S.stufeZeit(4), bahnsteig: T_HIER, umspann: T_HIER, wind: T_HIER };
ORD.forEach((od, i) => { AUS.ortsteile[od] = S.stufeZeit(i); });

// Dampf: Kraftwerk A fällt bei 2,5 s zusammen (Emission bis 5,7 s auf null), Kraftwerk B legt zu (12–19 s), nach dem Blackout nimmt er ab
const dampfA = (te) => (te < T_NULL ? 1 : clamp(1 - (te - T_NULL) / 3.2));
const dampfB = (te) => 0.5 + 0.5 * smoothstep(12, 19, te) - 0.8 * smoothstep(T_HIER, T_HIER + 8, te);

async function start() {
  aktiviereHoehenNebel({ abfall: 0.0025, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const szene = new THREE.Scene(); szene.fog = new THREE.FogExp2("#EAC9A2", 0.00042);
  const kam = new THREE.PerspectiveCamera(60, 1080 / 1920, 0.15, 9000);
  const welt0 = new DorfBahnsteig(szene, { schatten: SCHATTEN });
  const ziel = new THREE.Vector3();
  const farben = farbPhasen([
    { t: 0, werte: { belichtung: 1.0, saettigung: 1.0, kontrast: 1.04, bloomStaerke: 0.9, bloomSchwelle: 1.0 } },
    { t: 57, werte: { belichtung: 1.0, saettigung: 1.0, kontrast: 1.05, bloomStaerke: 0.9 } },
    { t: T_HIER + 0.1, werte: { belichtung: 0.96, saettigung: 0.92, kontrast: 1.06, bloomStaerke: 0.7 } },
    { t: 70, werte: { belichtung: 0.9, saettigung: 0.85, kontrast: 1.06, bloomStaerke: 0.6 } },
  ]);

  // ------------------------------------------------------------------ Protokoll (Klang und Prüfung)
  const prot = new Protokoll();
  prot.effekt(0.3, "laub_im_wind", { klang: false, text: "Laub weht über den Bahnsteig, Windräder drehen, Autos fahren (Alltag, ahnungslos)" })
    .effekt(1.2, "dorfleben", { klang: false, text: "Leute warten im Wartehäuschen, Autos auf der Hauptstraße, Dampf steigt aus dem Kraftwerk" })
    .effekt(T_NULL, "kraftwerk_faellt_aus", { klang: "grollen", staerke: 0.45, dauer: 3.5, text: "Countdown-Null: die Dampffahne des fernen Kraftwerks fällt in sich zusammen, das Netzbrummen sinkt ab" })
    .effekt(12, "regelreserve", { klang: false, text: "49,80 Hz: die Regelreserve springt an, ferne Schornsteine stoßen mehr Dampf aus" })
    .effekt(16.5, "reserve_reicht_nicht", { klang: "windstoss", staerke: 0.3, dauer: 3, text: "Reserve reicht nicht, Zoom auf das Neubaugebiet" });
  ORD.forEach((od, i) => prot.effekt(S.stufeZeit(i), `stufe_${i + 1}`, { klang: "einschlag", staerke: i === 4 ? 0.3 : 0.2, dauer: 1.2,
    text: `Stufe ${i + 1} (${S.STUFE_HZ[i].toFixed(1).replace(".", ",")} Hz): Ortsteil ${NAMEN[od]} wird dunkel${i === 4 ? ", die Ampel geht aus, die Autos halten" : ""}` }));
  prot.effekt(40, "bahnsteig_licht", { klang: false, text: "Kamera auf den eigenen Bahnsteig: Lampen und Anzeigetafel noch an, das Dorf dahinter dunkel" })
    .effekt(52, "brummen_sinkt", { klang: false, text: "Das Netzbrummen sinkt weiter, kein Flackern" })
    .effekt(T_HIER, "netzzusammenbruch", { klang: "druckwelle", staerke: 0.3, dauer: 3, text: "HIER, 47,50 Hz: Umspannwerk, Bahnsteig, Ampel und alle Lampen gehen gleichzeitig aus, Stille" })
    .effekt(61, "windraeder_laufen_aus", { klang: false, text: "Die Windräder laufen langsam aus, nur die tiefe Novembersonne beleuchtet das stille Dorf" });
  prot.melde({ t: 0.0, typ: "kamera", art: "schwenk", dauer: 8, text: "Schwenk vom Umspannwerk und Windpark nach links über das Dorf", klang: false })
    .melde({ t: 8, typ: "kamera", art: "zoom", dauer: 19, von: 58, bis: 46, text: "langsamer Zoom auf das Neubaugebiet, Brennweite 58° → 46°", klang: false })
    .melde({ t: 27, typ: "kamera", art: "schwenk", dauer: 12.5, text: "langsamer Schwenk über die Ortsteile von rechts nach links", klang: false })
    .melde({ t: 39.5, typ: "kamera", art: "schwenk", dauer: 6.5, text: "Blick den Bahnsteig entlang, dann zurück zum Dorf", klang: false })
    .melde({ t: 46, typ: "kamera", art: "zoom", dauer: 12, von: 56, bis: 40, text: "langsamer Zoom auf die Dorfmitte, Brennweite 56° → 40°", klang: false })
    .melde({ t: T_SCHNITT, typ: "schnitt", grund: "Szenensprung am Höhepunkt: vom Bahnsteig auf die Gesamtansicht von der Fußgängerbrücke (Dorf, Umspannwerk, Windpark)", klang: false })
    .melde({ t: T_SCHNITT + 0.1, typ: "kamera", art: "schwenk", dauer: 12, text: "langsamer Schwenk über das stille Dorf zum Umspannwerk", klang: false });

  const post = {};
  const welt = { szene, kamera: kam, post, update(t) {
    const pre = t < T_SCHNITT;
    const pos = pre ? [AUGE[0] + KX(t), AUGE[1], AUGE[2]] : BR_POS;
    const yaw = Q.has("yaw") ? +Q.get("yaw") : KYAW(t), pitch = Q.has("pitch") ? +Q.get("pitch") : KPITCH(t);
    const sw = Math.sin(t * 0.9) * 0.0025;
    const d = [Math.sin((yaw + sw * 57) * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R)];
    kam.position.set(pos[0], pos[1] + (pre ? 0.012 * Math.sin(t * 1.1) : 0), pos[2]); kam.fov = KFOV(t); kam.updateProjectionMatrix();
    kam.lookAt(ziel.set(pos[0] + d[0] * 100, pos[1] + d[1] * 100, pos[2] + d[2] * 100)); kam.updateMatrixWorld();
    // Sonne: Nachmittag im November, tief, von links hinten (SW); sinkt langsam, Licht wird wärmer
    const u = clamp(t / 70), el = lerp(0.24, 0.15, u), sx = -0.62, sz = 0.78, n = Math.hypot(sx, sz), c = Math.sqrt(1 - el * el);
    const sonne = [(sx / n) * c, el, (sz / n) * c];
    welt0.update(t, { kamera: kam, sonne, hell: 1, aus: AUS, dampfA, dampfB, laubStaerke: t < 8 ? 1 : 0.55, sonneFarbe: u < 0.5 ? "#FFD2A0" : "#FFC088", sonneStaerke: lerp(3.3, 2.6, u), umgebung: 1.15,
      himmel: { sonnenStaerke: 0, helligkeit: 1 } });
    szene.fog.color.copy(welt0.himmel.horizont);
    Object.assign(post, farben(t), { vignette: 0.1, koernung: 0.008, tiltStaerke: 0 });
  } };

  // ------------------------------------------------------------------ Text: Titel, Anzeige, Sätze, Abspann (1:1 aus dem Skript, Zeiten in skript.json → korrekturen)
  const TITEL = "Was passiert in deinem Dorf, wenn die Netzfrequenz unter 50 Hertz fällt?";
  const FAKT = "IBERISCHE HALBINSEL, 28.04.2025 · 48 HERTZ, DREI SEKUNDEN SPÄTER BLACKOUT";
  const HINWEIS = "Heute Abend: Ein Blitz trifft dein Flugzeug";
  const SAETZE = [
    [4.8, "Ein großes Kraftwerk fällt gerade aus.", 3.4], [8.5, "Die Netzfrequenz sinkt unter 50 Hertz.", 3.4], [12.5, "Bei 49,8 Hertz springt die Reserve an.", 3.4],
    [16.5, "Ferne Kraftwerke fahren hoch. Es reicht nicht.", 3.4], [21, "Dann 49 Hertz: Das Neubaugebiet wird dunkel.", 3.4], [25, "Automatisch, ohne Vorwarnung: 6,4 Prozent der Last.", 3.4],
    [30, "Alle zehntel Hertz trifft es den nächsten Ortsteil.", 3.4], [35, "Die Ampel an der Kreuzung geht aus.", 3.4], [40, "Dein Bahnsteig hat noch Licht.", 3.4],
    [46.5, "Bei 48,1 Hertz sind 41,6 Prozent abgeschaltet.", 3.4], [51, "Dann sinkt die Frequenz trotzdem weiter.", 3.4], [55, "Bei 47,5 Hertz trennen sich die Kraftwerke.", 3.0],
    [61, "Das Umspannwerk ist dunkel.", 3.0], [64, "Die Windräder drehen langsam aus.", 3.0], [67, "Der Netzaufbau dauert jetzt Stunden.", 3.0],
  ];
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige: S.anzeige, saetze: SAETZE, hinweis: HINWEIS });

  const ereignisse = prot.alle(hud.ereignisse());
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
