// Account 2 @stelldirvor.pov – „Was wäre, wenn du die Polarnacht in Tromsø erlebst?“ (Skript acc2-2026-11-10-abend)
// Welt: Polar/Fjord, Variante „PolarStrand“ (engine/welt_polar_fjord.js, Abwandlung, kein Neubau): ebenerdig am Kiesstrand der Südspitze von Tromsøya (69,65° N).
// Ereignis bei 2,5 s = Countdown-Null (Testblock a: Sonnenuntergang), danach Zeitraffer 1 Tag = 2 s (29.10. → 27.11.), letzter Sonnenrand bei 60–60,5 s, harter Schnitt bei 62 s.
// Sonnenstand, Tageslänge, Datum und Countdown kommen alle aus sim/polarnacht_tromso.mjs (eine Funktion tau(t)).
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, farbPhasen, Protokoll } from "../../engine/stil_lunar_pov.js";
import { LunarHUD } from "../../engine/lunar_hud.js";
import { PolarStrand, richtung, hoehe } from "../../engine/welt_polar_fjord.js";
import * as S from "../../sim/polarnacht_tromso.mjs";

const FPS = 30, DAUER = 80, T_NULL = S.T_EREIGNIS, T_HIER = S.T_HIER, T_SCHNITT = S.T_SCHNITT;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 4096;
const YAWK = Q.has("yaw") ? +Q.get("yaw") : null, PITCHK = Q.has("pitch") ? +Q.get("pitch") : null;   // Prüfschalter: Blickrichtung
const PLK = Q.has("pl") ? +Q.get("pl") : 1;                       // Prüfschalter: Nordlicht-Stärke
const D2R = Math.PI / 180, L = ease.inOutSine;
const K = (keys, e = L) => (t) => keyframes(keys.map(([tt, v, ee]) => ({ t: tt, v, e: ee || e })), t);

// ------------------------------------------------------------------------------ Kamera (yaw 0 = Süden, −90 Osten, +90 Westen, ±180 Norden)
// 0–2,5 s Blick in die Abendsonne (Südwest); 3–8 s Schwenk mit dem Nachglühen nach rechts und zurück (vor 8 s); 10–34 s langsame Drift am Ufer;
// 34–40 s Schwenk und Zoom auf das Schiff zu; 40–52 s zurück Richtung Süden; 52–60 s langsamer Zoom auf den Horizontpunkt der letzten Sonne;
// 62 s harter Schnitt (Maßstabssprung) auf den weiten Blick ins Nordlicht.
const KYAW = K([[0, 54], [2.5, 46], [5, 66], [7.4, 30], [10, 8], [22, -12], [34, 10], [37, 24], [40, 30], [46, 8], [52, -2], [60.5, -6], [62, -6], [62.02, -150], [70, -168], [80, -170]]);
const KPITCH = K([[0, 5], [2.5, 6], [5, 8], [8, 5], [20, 5], [34, 7], [40, 6], [52, 5], [60.5, 3.5], [62, 3.5], [62.02, 26], [70, 18], [80, 15]]);
const KFOV = K([[0, 60], [8, 56], [34, 58], [40, 40], [46, 50], [52, 56], [60.5, 30], [62, 30], [62.02, 80], [70, 74], [80, 70]]);
const KDX = K([[0, 0], [80, 0]]);                  // Fahrt am Ufer (+x = nach Westen), Meter

// Gestaltung: im Zeitraffer (1 Tag = 2 s) bleibt die Sonne nachts nur wenig unter dem Horizont, sonst blitzt der Himmel im Sekundentakt zwischen Schwarz und Tag (Stroboskop).
// Sonnenstand über dem Horizont und der Untergang/Aufgang bleiben exakt, nur die Tiefe der Nacht ist begrenzt (Boden −4° bis −9° gegen Ende).
const weich = (x, t) => {
  const so = S.sonneBei(x), F = -4 - 5 * smoothstep(30, 42, t), z = t > T_NULL + 0.5 && t < T_SCHNITT - 0.5;
  return z && so.scheinbar < F ? { ...so, scheinbar: F + (so.scheinbar - F) * 0.08 } : so;
};
const hellAusHoehe = (a) => smoothstep(-13, 5, a);
const sonnenVec = (so) => { const alt = so.scheinbar * D2R, az = so.az * D2R; return [Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt)]; };
function helligkeit(t, roh = false) {         // Zeitraffer 1 Tag = 2 s: Helligkeit über einen ganzen Tag gemittelt (kein Tag-Nacht-Stroboskop), Sonne und Schatten laufen real
  const tt = (x) => hellAusHoehe(weich(x, t).scheinbar);
  const n = tt(t);
  if (roh) return n;
  let m = 0; for (let i = 0; i < 8; i++) m += tt(t - 1 + (2 * (i + 0.5)) / 8); m /= 8;
  const v = t > T_NULL + 1 && t < T_SCHNITT - 0.2 ? lerp(n, m, 0.8) : n;
  return t >= T_SCHNITT ? v * 0.45 : v;          // Nachspiel: Mittagsdämmerung etwas dunkler gestaltet, damit das Nordlicht trägt
}

async function start() {
  aktiviereHoehenNebel({ abfall: 0.0016, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  const kam = new THREE.PerspectiveCamera(58, 1080 / 1920, 0.2, 60000);
  const welt0 = new PolarStrand(szene, { schatten: SCHATTEN, spiegel: Q.has("spiegel") ? +Q.get("spiegel") : 0.5 });
  const ziel = new THREE.Vector3();
  // Spaziergänger weit weg vom Standpunkt führen (Menschenmodell ist nur für die Ferne gebaut), Stirnlampe im Hinterland ausblenden
  const neuerWeg = (i, a, b) => { const w = welt0.wege[i]; w.w = [a, b]; w.len = Math.hypot(b[0] - a[0], b[1] - a[1]); };
  neuerWeg(1, [70, -5], [180, -4]); neuerWeg(2, [150, -3], [85, -6]); welt0.wege[6].auf = -80;
  const farben = farbPhasen([
    { t: 0, werte: { belichtung: 1.05, saettigung: 1.06, kontrast: 1.06, bloomStaerke: 1.0 } },
    { t: 56, werte: { belichtung: 1.08, saettigung: 1.05, kontrast: 1.07, bloomStaerke: 1.05 } },
    { t: 60.3, werte: { belichtung: 1.04, saettigung: 1.1, kontrast: 1.08, bloomStaerke: 1.3, bloomSchwelle: 0.95 } },
    { t: 63, werte: { belichtung: 1.08, saettigung: 1.05, kontrast: 1.06, bloomStaerke: 1.1 } },
  ]);

  // ------------------------------------------------------------------ Zustand je Zeit
  const zeitraffer = (t) => t >= T_NULL && t < T_SCHNITT;
  const zustand = (t) => {
    const so = weich(t, t), hell = helligkeit(t), hellRoh = hellAusHoehe(S.sonneBei(t).scheinbar) * (t >= T_SCHNITT ? 0.45 : 1);
    const schnee = t < T_NULL ? 0.12 : t >= 25 ? 1 : lerp(0.12, 1, smoothstep(8, 25, t));
    const pl = Math.max(smoothstep(33, 38, t) * (1 - smoothstep(60.2, 61.2, t)), smoothstep(62, 62.5, t));
    return { so, hell, schnee, eis: lerp(0.15, 0.7, smoothstep(10, 48, t)), polarlicht: 0.8 * pl * PLK * clamp(1 - 1.8 * hellRoh),
      schneefall: t < 15 ? 0 : t < 32 ? 0.55 : t < 60 ? 0.3 : 0.15, tempo: zeitraffer(t) ? 0.3 : 1 };
  };
  const schiffPos = (t) => { const u = clamp((t - 31) / 20); return { x: lerp(300, -140, u), z: -320 + 40 * u, ry: Math.PI / 2 }; };

  // ------------------------------------------------------------------ Protokoll (Klang und Prüfung)
  const prot = new Protokoll();
  prot.effekt(0.5, "wellen_moewen", { klang: false, text: "Wellen laufen an den Strand, Möwen kreisen im Gegenlicht der tiefen Sonne" })
    .effekt(1.6, "spaziergaenger", { klang: false, text: "Spaziergänger am Ufer, Eiderenten im Wasser" })
    .effekt(T_NULL, "sonnenrand_taucht_unter", { klang: "windstoss", staerke: 0.7, dauer: 2.5, text: "Countdown-Null: Sonnenrand taucht unter, Licht kippt von Gold zu Rosa-Blau, Zeitraffer startet" })
    .effekt(4.6, "nachgluehen", { klang: false, text: "Nachglühen über dem Horizont, Schwenk mit dem Licht" })
    .effekt(7.0, "tag_nacht_beginnt", { klang: "zischen", staerke: 0.3, dauer: 1.5, text: "Tag-Nacht-Zeitraffer: Sonnenbogen über dem Wasser" })
    .effekt(10.0, "datum_laeuft", { klang: false, text: "Datum läuft mit, Sonnenbogen wird flacher" })
    .effekt(13.0, "schatten_wachsen", { klang: false, text: "Schatten der Steine am Strand werden länger" })
    .effekt(17.0, "schneefall_beginnt", { klang: "zischen", staerke: 0.3, dauer: 2, text: "Schnee beginnt zu fallen" })
    .effekt(21.6, "schnee_auf_daechern", { klang: false, text: "Schnee legt sich auf Holzhäuser und Strand" })
    .effekt(24.0, "mittagshoehe_3", { klang: false, text: "Mittagssonne nur noch 3° hoch" })
    .effekt(27.0, "eis_am_ufer", { klang: false, text: "Eisränder am Ufer, Seerauch" })
    .effekt(30.0, "lichter_frueher", { klang: false, text: "Straßenlaternen und Fensterlichter gehen früher an" })
    .effekt(33.5, "nordlicht_naechte", { klang: "zischen", staerke: 0.3, dauer: 3, text: "Erste Nordlichtbögen in den Nächten" })
    .effekt(34.5, "schiff_im_sund", { klang: false, text: "Ein Schiff zieht mit Lichtern durch den Sund, Zoom auf das Schiff" })
    .effekt(38.4, "licht_blau", { klang: false, text: "Mittagslicht wird blau und fahl" })
    .effekt(42.6, "sonne_knapp_ueber_horizont", { klang: false, text: "Sonne knapp über dem Horizont, Bogen schrumpft" })
    .effekt(46.0, "minus_15_min", { klang: false, text: "Minus 15 Minuten pro Tag" })
    .effekt(50.5, "countdown_tage", { klang: "windstoss", staerke: 0.35, dauer: 3, text: "Zweiter Countdown: letzte Sonne in fünf Tagen, Riser" })
    .effekt(54.0, "zoom_horizont", { klang: false, text: "Langsamer Zoom auf den Horizontpunkt der letzten Sonne" })
    .effekt(T_HIER - 0.8, "letzter_sonnenrand", { klang: "windstoss", staerke: 0.85, dauer: 3, text: "Höhepunkt: der letzte Sonnenrand blitzt kurz auf (11:21–11:43) und verschwindet, Anzeige HIER" })
    .effekt(61.2, "sonne_weg", { klang: "zischen", staerke: 0.5, dauer: 2, text: "Sonne verschwunden, Himmel kippt ins Dämmerblau" })
    .effekt(T_SCHNITT, "nordlicht_oben", { klang: false, text: "Blick nach oben: Nordlicht über dem Fjord" })
    .effekt(65.0, "mittagsdaemmerung", { klang: false, text: "Mittagsdämmerung über dem Schnee, Nordlicht wogt" })
    .effekt(68.0, "nacht", { klang: false, text: "Die Nacht kommt, Lichter am Ufer, Nordlicht" });
  prot.melde({ t: 0.2, typ: "kamera", art: "schwenk", dauer: 2.3, text: "Blick in die Abendsonne, Schwenk mit dem Sonnenrand", klang: false })
    .melde({ t: 3.0, typ: "kamera", art: "schwenk", dauer: 4.6, text: "Schwenk mit dem Nachglühen nach rechts und zurück", klang: false })
    .melde({ t: 10, typ: "kamera", art: "schwenk", dauer: 24, text: "langsame Drift am Ufer, Schwenk mit der Sonnenbahn", klang: false })
    .melde({ t: 34, typ: "kamera", art: "zoom", dauer: 6, von: 58, bis: 40, text: "Zoom und Schwenk auf das Schiff im Sund zu, Brennweite 58° → 40°", klang: false })
    .melde({ t: 40, typ: "kamera", art: "schwenk", dauer: 12, text: "ruhiger Schwenk zurück nach Süden", klang: false })
    .melde({ t: 52, typ: "kamera", art: "zoom", dauer: 8.5, von: 56, bis: 30, text: "langsamer Zoom auf den Horizontpunkt, Brennweite 56° → 30°", klang: false })
    .melde({ t: T_SCHNITT, typ: "schnitt", grund: "Maßstabssprung: vom Horizontpunkt auf den weiten Blick nach oben ins Nordlicht", klang: false })
    .melde({ t: 62.1, typ: "kamera", art: "schwenk", dauer: 8, text: "langsamer Schwenk und Abkippen im Nordlicht, Brennweite 80° → 74°", klang: false });

  const post = {};
  const welt = { szene, kamera: kam, post, update(t) {
    const z = zustand(t), yaw = YAWK ?? KYAW(t), pitch = PITCHK ?? KPITCH(t), dx = KDX(t);
    const base = welt0.augePos(t), w = welt0.wiegen(t);
    const pos = [base[0] + dx, hoehe(base[0] + dx, 0) + 1.45 + 0.4 * w.heave, base[2]];
    const d = richtung(yaw, pitch);
    kam.position.set(...pos); kam.fov = KFOV(t); kam.updateProjectionMatrix();
    kam.lookAt(ziel.set(pos[0] + d[0] * 100, pos[1] + d[1] * 100, pos[2] + d[2] * 100)); kam.rotateZ(w.roll * 0.6); kam.updateMatrixWorld();
    const sc = t > 32 && t < 52 ? schiffPos(t) : null;
    welt0.update(t, { kamera: kam, sonnenRichtung: sonnenVec(z.so), hell: z.hell, schnee: z.schnee, eis: z.eis, polarlicht: 0, heck: 0, wind: 0.45 + 0.3 * smoothstep(50, 60, t),
      tempo: z.tempo, seerauch: smoothstep(22, 30, t) * 0.45 * (1 - z.hell * 0.6), glitzer: 0.2 * z.hell * (t > 12 ? 1 : 0), schneefall: z.schneefall, schiff: sc, moewen: t < 30 ? 1 : 0.5, enten: t < 40 ? 1 : 0.4 });
    welt0.himmel.u.polarlicht.value = Q.has("dome0") ? 0 : z.polarlicht;           // Nordlicht nur in der Himmelskuppel (Prüfschalter dome0)
    const fp = farben(t), br = smoothstep(T_HIER - 0.8, T_HIER, t) * (1 - smoothstep(T_HIER + 0.2, T_HIER + 1.6, t));
    Object.assign(post, welt0.post, fp, { belichtung: (welt0.post.belichtung ?? 1) * fp.belichtung * (1 + 0.06 * br), vignette: 0.1, koernung: 0.008, tiltStaerke: 0 });
  } };

  // ------------------------------------------------------------------ Text: Titel, Anzeige, Sätze, Abspann (1:1 aus dem Skript)
  const TITEL = "Was wäre, wenn du die Polarnacht in Tromsø erlebst?";
  const FAKT = "TROMSØ, 2026 · LETZTE SONNE AM 27. NOVEMBER, DIE NÄCHSTE AM 15. JANUAR";
  const HINWEIS = "Warum die Erdachse das macht: im Profil";
  const SAETZE = [
    [4.8, "Die Sonne geht kurz vor drei unter.", 3.4], [9, "Dann kommt sie später und geht früher.", 3.4], [13.2, "Jeden Tag fehlen rund zehn Minuten Licht.", 3.4],
    [17.4, "Die Schatten am Strand werden immer länger.", 3.4], [21.6, "Schnee legt sich auf die Holzhäuser.", 3.4], [25.8, "Der Tag ist nur noch fünf Stunden lang.", 3.4],
    [30, "Die Lichter am Ufer gehen früher an.", 3.4], [34.2, "Ein Schiff zieht durch den dunklen Fjord.", 3.4], [38.4, "Das Licht wird blau statt golden.", 3.4],
    [42.6, "Mittags steht die Sonne knapp über dem Horizont.", 3.4], [46.8, "Der Tag schrumpft auf drei Stunden.", 3.4], [50.8, "Noch fünf Tage, dann bleibt sie weg.", 3.4],
    [54.6, "Sie streift nur noch den Horizont.", 3.3], [63, "Bis Mitte Januar geht sie nicht mehr auf.", 3.4], [66.8, "Doch mittags dämmert es noch vier Stunden.", 3.2],
  ];
  const stat = (t) => {                                              // Statuszeile (Unterzeile) passend zur Lage
    if (t < 10) return "1 TAG = 2 SEKUNDEN";
    if (t < 24) return S.datumText(clamp(S.tagIndex(t), 0, S.TAG_LETZTE));
    if (t < 30) return `SONNE MITTAGS ${Math.round(S.mittagsHoehe(t))}° HOCH`;
    if (t < 38) return "LICHTER FRÜHER AN";
    if (t < 46) return `SONNE MITTAGS ${Math.max(1, Math.round(S.mittagsHoehe(t)))}° HOCH`;
    return "MINUS 15 MINUTEN PRO TAG";
  };
  const anzeige = (t) => {
    if (t < T_NULL) return { etikett: "SONNENUNTERGANG IN", zahl: S.countdownText(t), einheit: "", unter: "TROMSØ, 29. OKTOBER", wert: T_NULL - t };
    if (t < 50.5) return { etikett: "TAGESLÄNGE", zahl: S.tageslaengeText(t), einheit: "STD:MIN", unter: stat(t), wert: S.tageslaengeMin(t) };
    if (t < T_HIER) return { etikett: "LETZTE SONNE IN", zahl: String(S.tageBisAnzeige(t)), einheit: "TAGE", unter: t < 58 ? `${S.datumText(clamp(S.tagIndex(t), 0, S.TAG_LETZTE))} → 27. NOVEMBER` : "27. NOVEMBER, 11:21–11:43 UHR", wert: S.tageBisAnzeige(t) };
    return { etikett: "HIER", zahl: "HIER", einheit: "", unter: "POLARNACHT BIS 15. JANUAR", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE, hinweis: HINWEIS });

  const ereignisse = prot.alle(hud.ereignisse());
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices, haeuser: welt0.hausZahl };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
