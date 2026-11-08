// Account 2 @stelldirvor.pov – „Teil 2: Erdachse ohne Neigung – was wird aus der Polarnacht?“ (Skript acc2-2026-11-09-mittag)
// Welt: Polar/Fjord (engine/welt_polar_fjord.js, Erstbau 08.11.2026), Deck eines Forschungsboots im Adventfjord vor Longyearbyen (78,22° N).
// 0–8 s Polarnacht in Echtzeit (Countdown, die Stadt ahnungslos). Ereignis bei 8 s = Countdown-Null: die Achse richtet sich auf, Zeitraffer 1 s = 1 Monat.
// ε(t), Deklination, Tageslänge, Polarnacht- und Mitternachtssonne-Tage kommen aus sim/polarnacht_achse.mjs; Bild und Anzeige lesen dasselbe ε(t).
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, farbPhasen, Protokoll } from "../../engine/stil_lunar_pov.js";
import { LunarHUD, zahlDE } from "../../engine/lunar_hud.js";
import { PolarFjord, Sonnenboegen, richtung, polarlichtKurve, tagesMittel } from "../../engine/welt_polar_fjord.js";
import * as S from "../../sim/polarnacht_achse.mjs";

const FPS = 30, DAUER = 80, T_NULL = S.T_EREIGNIS, T_HIER = S.T_HIER, T_SCHNITT = 58;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 4096;
const L = ease.inOutSine;
const K = (keys, e = L) => (t) => keyframes(keys.map(([tt, v, ee]) => ({ t: tt, v, e: ee || e })), t);

// ------------------------------------------------------------------------------ Kamera (yaw 0 = Süden, −90 Osten, ±180 Norden, +90 Westen)
// 0–8 s Fahrt über das Deck: vom Osten (Landzunge, Polarlicht) zum Ort im Süden; 10–16 s Schwenk nach Norden mit der Mitternachtssonne;
// 18–24 s zurück nach Süden; 24–40 s ruhiger Halt Richtung Süden; 40–58 s langsame Rückfahrt; 58 s harter Schnitt auf die Totale.
const KYAW = K([[0, -138], [8, -14], [10, -12], [16, -178], [20, -180], [24, -2], [40, 0], [58, -4], [58.03, -3], [70, -1], [80, 0]]);
const KPITCH = K([[0, 26], [8, 9], [10, 8], [16, 7], [20, 8], [24, 7], [40, 9], [58, 12], [58.03, 4], [70, 5], [80, 5]]);
const KFOV = K([[0, 62], [8, 56], [10, 58], [20, 58], [24, 56], [40, 58], [58, 70], [58.03, 78], [70, 70], [80, 66]]);
const DREH = (yaw) => ((yaw % 360) + 360) % 360;                       // für die Welt (heck) in 0…360
const hStd = K([[0, 0], [9.5, 0, ease.inOutSine], [15, 180], [19.5, 180], [24, 0], [80, 0]]);   // Stundenwinkel der gezeigten Sonne: Süden (0) bzw. Norden (180)

async function start() {
  aktiviereHoehenNebel({ abfall: 0.0016, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  const kam = new THREE.PerspectiveCamera(58, 1080 / 1920, 0.2, 60000);
  const welt0 = new PolarFjord(szene, { schatten: SCHATTEN });
  const boegen = new Sonnenboegen(szene, { N: 9, seg: 120, radius: 18000, breite: 0.3 });
  const ziel = new THREE.Vector3();
  const farben = farbPhasen([
    { t: 0, werte: { belichtung: 1.05, saettigung: 1.05, kontrast: 1.06, bloomStaerke: 1.0 } },
    { t: 58, werte: { belichtung: 1.08, saettigung: 1.05, kontrast: 1.06, bloomStaerke: 1.0 } },
    { t: 60.5, werte: { belichtung: 1.05, saettigung: 1.08, kontrast: 1.08, bloomStaerke: 1.25, bloomSchwelle: 0.95 } },
    { t: 66, werte: { belichtung: 1.08, saettigung: 1.05, kontrast: 1.06, bloomStaerke: 1.05 } },
  ]);

  // ------------------------------------------------------------------ Zustand je Zeit
  const durchbruch = (t) => smoothstep(T_HIER - 0.4, T_HIER + 2.2, t) * (1 - smoothstep(62.5, 66.5, t));
  const zeitraffer = (t) => t >= T_NULL && t < T_HIER;
  const dekT = (t) => (t < T_NULL ? S.dekl(S.eps(0), 0) : t < T_HIER ? S.dekl(S.eps(t), S.doy(t)) : 0);
  const zustand = (t) => {
    const e = S.eps(t), dk = dekT(t);
    // Zeitraffer: mittlere Helligkeit des Tages statt Tag-Nacht-Flackern; Echtzeit-Polarnacht davor, flache Dauersonne danach
    let hell = t < T_NULL ? 0.03 : t < T_HIER ? tagesMittel(dk).hell : 0.9;
    // Dämmerblau-Übergang bei Countdown-Null: Himmel kippt von Schwarz in Dämmerblau
    if (t >= T_NULL && t < T_NULL + 3) hell = Math.max(hell, 0.38 * smoothstep(T_NULL, T_NULL + 0.5, t));
    const sommer = smoothstep(-6, 12, dk);
    const winterNull = t >= T_HIER ? 1 : 0;
    const polarlicht = Math.max(polarlichtKurve(t, [[0, T_NULL + 0.15]], 0.6), polarlichtKurve(t, [[27.2, 30.8]], 1.2)) * clamp(1 - 1.8 * hell);
    return {
      e, dk, hell,
      sonne: { dekl: t >= T_HIER ? 0 : dk, H: hStd(t) },
      schnee: t >= T_HIER ? 0.8 : lerp(1, 0.22, sommer),
      eis: t >= T_HIER ? 0.35 : lerp(0.75, 0.06, sommer),
      polarlicht, tempo: zeitraffer(t) ? 0.3 : 1, winterNull,
    };
  };

  // ------------------------------------------------------------------ Protokoll (Klang und Prüfung)
  const prot = new Protokoll();
  prot.effekt(0.6, "polarlicht_wogt", { klang: false, text: "Polarlicht wogt über dem Fjord, Boot dümpelt" })
    .effekt(2.2, "schneemobil", { klang: false, text: "Schneemobil fährt am Ufer, Stirnlampen bewegen sich" })
    .effekt(4.0, "rentiere_ziehen", { klang: false, text: "Rentiere ziehen am Ufer entlang" })
    .effekt(6.0, "seerauch", { klang: false, text: "Seerauch zieht über das Wasser" })
    .effekt(T_NULL, "achse_richtet_sich_auf", { klang: "windstoss", staerke: 0.7, dauer: 2.5, text: "Countdown-Null: Polarlicht verblasst schlagartig, Himmel kippt in Dämmerblau, Zeitraffer startet" })
    .effekt(9.6, "sonne_kehrt_zurueck", { klang: "zischen", staerke: 0.4, dauer: 2, text: "Die Sonne kehrt zurück, warmes Gold am Horizont" })
    .effekt(11.7, "mitternachtssonne_beginnt", { klang: false, text: "Mitternachtssonne: Sonne kreist um den Fjord" })
    .effekt(13.5, "tagesboegen_schliessen_sich", { klang: false, text: "Tagesbögen schließen sich zum vollen Kreis" })
    .effekt(16.0, "schwenk_norden", { klang: false, text: "Schwenk nach Norden mit der Mitternachtssonne" })
    .effekt(18.0, "wieder_dunkel", { klang: "windstoss", staerke: 0.4, dauer: 2, text: "Zurück in die Polarnacht, Zähler fällt auf 94" })
    .effekt(21.0, "zaehler_94", { klang: false, text: "Polarnacht-Zähler leuchtet bei 94 Tagen" })
    .effekt(24.0, "sommer_2", { klang: false, text: "Sommer: Mitternachtssonne nur noch drei Monate" })
    .effekt(27.5, "polarlicht_herbst", { klang: "zischen", staerke: 0.3, dauer: 3, text: "Grünes Polarlicht in der Herbstnacht" })
    .effekt(31.6, "erster_wintertag", { klang: false, text: "Erster kurzer Wintertag: rosa Bogen über dem Horizont" })
    .effekt(36.4, "sonne_geht_unter", { klang: false, text: "Im Sommer sinkt die Sonne erstmals hinter den Horizont" })
    .effekt(40.4, "mitternachtssonne_weg", { klang: false, text: "Mitternachtssonne verschwunden" })
    .effekt(44.4, "wintersonne_6", { klang: false, text: "Wintermittagssonne 6° hoch" })
    .effekt(48.4, "boegen_aehnlich", { klang: false, text: "Tagesbögen werden einander ähnlicher" })
    .effekt(52.4, "neigung_unter_2", { klang: "windstoss", staerke: 0.35, dauer: 3, text: "Neigung unter 2°, Riser" })
    .effekt(T_HIER, "bogen_verschmelzen", { klang: "windstoss", staerke: 0.85, dauer: 3, text: "Höhepunkt: ein einziger flacher Tagesbogen, Anzeige HIER" })
    .effekt(60.6, "glanz_ueber_fjord", { klang: "zischen", staerke: 0.5, dauer: 3, text: "Glanz auf dem Wasser" })
    .effekt(63.0, "rentiere_grasen", { klang: false, text: "Rentiere grasen, Boote liegen ruhig" })
    .effekt(66.0, "schneemobil_2", { klang: false, text: "Schneemobil und Boote im flachen Licht" });
  prot.melde({ t: 0.3, typ: "kamera", art: "fahrt", dauer: 7.7, text: "Fahrt über das Deck vom Osten zum Ort, Neigung senkt sich", klang: false })
    .melde({ t: 10, typ: "kamera", art: "schwenk", dauer: 6, text: "Schwenk nach Norden mit der Mitternachtssonne", klang: false })
    .melde({ t: 18, typ: "kamera", art: "schwenk", dauer: 6, text: "Schwenk zurück nach Süden", klang: false })
    .melde({ t: 24, typ: "kamera", art: "fahrt", dauer: 16, text: "ruhiger Halt Richtung Süden mit leichter Drift", klang: false })
    .melde({ t: 40, typ: "kamera", art: "zoom", dauer: 18, von: 58, bis: 70, text: "langsame Rückfahrt, Brennweite 58° → 70°", klang: false })
    .melde({ t: T_SCHNITT, typ: "schnitt", grund: "Höhepunkt: Totale über den Fjord, ein einziger flacher Bogen", klang: false })
    .melde({ t: 58.2, typ: "kamera", art: "zoom", dauer: 12, von: 78, bis: 70, text: "Totale zieht sich langsam zusammen", klang: false });

  const post = {};
  const welt = { szene, kamera: kam, post, update(t) {
    const z = zustand(t);
    const yaw = KYAW(t), pitch = KPITCH(t);
    const pos = welt0.augePos(t), d = richtung(yaw, pitch), w = welt0.wiegen(t);
    kam.position.set(...pos); kam.fov = KFOV(t); kam.updateProjectionMatrix();
    kam.lookAt(ziel.set(pos[0] + d[0] * 100, pos[1] + d[1] * 100, pos[2] + d[2] * 100)); kam.rotateZ(w.roll * 0.6); kam.updateMatrixWorld();
    welt0.update(t, { kamera: kam, sonne: z.sonne, hell: z.hell, schnee: z.schnee, eis: z.eis, polarlicht: z.polarlicht, heck: DREH(yaw), wind: 0.5 + 0.25 * smoothstep(T_HIER - 3, T_HIER, t), tempo: z.tempo, seerauch: t < T_NULL ? 0.5 : 0.2 * (1 - z.hell), glitzer: 0 });
    boegen.folge(kam);
    const br = durchbruch(t);
    const zeig = t >= T_NULL + 1.5;
    boegen.setze({ eps: z.e, alpha: (zeig ? 0.6 : 0) * smoothstep(T_NULL + 1.5, T_NULL + 3, t), jetzt: z.sonne.dekl, jetztAlpha: 0.7 * smoothstep(T_NULL + 1.5, T_NULL + 3, t), hell: 0.9 * (1 + 0.9 * br) });
    boegen.mesh.visible = zeig;
    const fp = farben(t);
    Object.assign(post, welt0.post, fp, { belichtung: (welt0.post.belichtung ?? 1) * fp.belichtung * (1 + 0.05 * br), vignette: 0.1, koernung: 0.008, tiltStaerke: 0 });
  } };

  // ------------------------------------------------------------------ Text: Titel, Anzeige, Sätze, Abspann (1:1 aus dem Skript)
  const TITEL = "Teil 2: Erdachse ohne Neigung – was wird aus der Polarnacht?";
  const FAKT = "Longyearbyen, 78° Nord · Sonne heute vom 26. Oktober bis 15. Februar unter dem Horizont";
  const SAETZE = [
    [4.8, "Polarnacht auf Spitzbergen, du stehst an Deck.", 3.45], [8.4, "Dann richtet sich die Erdachse langsam auf.", 3.05], [11.6, "Die Sonne kehrt zurück und bleibt Tag und Nacht.", 3.25],
    [15, "Wochenlang kreist sie rund um den Fjord.", 3.25], [18.4, "Dann wird es wieder dunkel.", 3.05], [21.6, "Diese Polarnacht ist knapp drei Wochen kürzer.", 3.25],
    [25, "Die Mitternachtssonne hält nur noch drei Monate.", 3.05], [28.2, "Über dem Fjord tanzt wieder Polarlicht.", 3.25], [31.6, "Zum ersten Mal geht die Sonne jeden Tag auf.", 3.6],
    [36.4, "Im Sommer geht sie jetzt jeden Abend unter.", 3.6], [40.4, "Die Mitternachtssonne ist verschwunden.", 3.6], [44.4, "Mittags steht sie im Winter sechs Grad hoch.", 3.6],
    [48.4, "Die Tagesbögen werden einander immer ähnlicher.", 3.6], [52.4, "Die Neigung fällt unter zwei Grad.", 3.6], [62.4, "Jeden Tag zwölfeinhalb Stunden Licht, das ganze Jahr.", 3.6],
    [66.4, "Doch höher als zwölf Grad steigt die Sonne nie.", 3.4],
  ];
  const anzeige = (t) => {
    if (t < T_NULL) return { etikett: "ACHSE RICHTET SICH AUF IN", zahl: S.countdownText(t), einheit: "", unter: t < 4 ? "POLARNACHT · LONGYEARBYEN" : "STADT AHNUNGSLOS", wert: T_NULL - t };
    if (t < 24) { const n = S.tage(S.eps(Math.min(t, 19.65))).polarnacht;
      return { etikett: "POLARNACHT", zahl: zahlDE(n), einheit: "TAGE", unter: t < 10 ? "1 SEKUNDE = 1 MONAT" : t < 12 ? "SONNE KEHRT ZURÜCK" : t < 18 ? "MITTERNACHTSSONNE" : t < 21 ? "WIEDER DUNKEL" : "19 TAGE KÜRZER", wert: n }; }
    if (t < 40) { const n = S.tage(S.eps(t)).mitternachtssonne;
      return { etikett: "MITTERNACHTSSONNE", zahl: zahlDE(n), einheit: "TAGE", unter: t < 28 ? "NUR NOCH 3 MONATE" : t < 31 ? "POLARLICHT" : t < 36 ? "SONNE JEDEN TAG" : "SONNE GEHT UNTER", wert: n }; }
    if (t < T_HIER) { const m = S.mittagWinter(t);
      return { etikett: "MITTAGSSONNE IM WINTER", zahl: zahlDE(m, 1), einheit: "°", unter: t < 44 ? `NEIGUNG ${zahlDE(S.eps(t), 1)}°` : t < 52 ? "6° HOCH" : t < 55 ? "NEIGUNG UNTER 2°" : "SOMMER = WINTER", wert: m }; }
    return { etikett: "HIER", zahl: "HIER", einheit: "", unter: "JEDEN TAG 12,5 STUNDEN · MITTAGS 11,8°", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE });

  const ereignisse = prot.alle(hud.ereignisse());
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices, haeuser: welt0.hausZahl, eps: [0, 20, 40, 58].map(S.eps) };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
