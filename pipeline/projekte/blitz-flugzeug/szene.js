// Account 2 @stelldirvor.pov – „Was passiert, wenn ein Blitz dein Flugzeug trifft, in Zeitlupe vom Fensterplatz?“ (Skript acc2-2026-11-12-abend)
// Welt: Fensterplatz über der Tragfläche (engine/welt_flugzeug_fenster.js, Neubau 12.11.2026). Testblöcke: einstieg_a2 = b (zweite sichtbare Stufe bei 13 s), folgen_hinweis = mit.
// Ereignis bei 8 s = Countdown-Null. 8–13 s Zeitlupe 1:909.000 (Spitzenstrom), 13–48 s 1:219 (ms), 48–58 s 1:250 (Strecke), HIER 58 s (harter Schnitt nach hinten), ab 62 s Echtzeit.
// Alle Zahlen und Zeitpunkte kommen aus sim/blitz_flugzeug.mjs.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes } from "../../engine/bewegung.js";
import { Protokoll } from "../../engine/stil_lunar_pov.js";
import { LunarHUD } from "../../engine/lunar_hud.js";
import { FlugzeugFenster, blitzHelligkeit, AUGE_NAH, AUGE_VORN, AUGE_HINTEN, augeVor, ZIELE, NASE_Z, FENSTER, GESCHWINDIGKEIT } from "../../engine/welt_flugzeug_fenster.js";
import * as S from "../../sim/blitz_flugzeug.mjs";

const FPS = 30, DAUER = 80, T0 = S.T_EREIGNIS, T_HIER = S.T_HIER, T_ECHT = S.T_ECHTZEIT, T_ECHT_BLITZ = 62.4;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const L = ease.inOutSine;

// ------------------------------------------------------------------------------ Zeiten der Außenwelt
/** Kanal: Kontaktstelle am Rumpf = Nase + 130 m/s · ms (das Flugzeug fliegt durch den stehenden Kanal) */
const kanalZMs = (ms) => NASE_Z + 0.3 + (GESCHWINDIGKEIT * Math.max(0, ms)) / 1000;
const kanalZ = (t) => kanalZMs(S.msBei(t));
const tempoBei = (t) => (t < T0 ? 1 : t < 61 ? 1 / S.zeitlupe(t) : t < T_ECHT ? lerp(1 / S.ZEITLUPE_ENDE, 0.2, smoothstep(61, T_ECHT, t)) : lerp(0.2, 1, smoothstep(T_ECHT, T_ECHT + 0.8, t)));

// ------------------------------------------------------------------------------ Kamera (Augenpunkt immer so, dass das Fenster mittig bleibt)
// 0–6,5 s langsamer Zoom von der Wolkenwand auf die Tragflächenspitze (erste Bewegung ab Bild 1); 8–10,5 s Blick schräg nach vorn Richtung Nase;
// 25–58 s Schwenk von vorn nach hinten, die Kamera folgt dem Kanal; 58 s harter Schnitt auf den Blick zum Leitwerk; ab 62 s Blick auf die Wolken.
const HINTEN_ZIEL = [-10, 3, 12];          // Blick nach hinten: Heckkegel und Seitenleitwerk
const BLICK = [
  { t: 0, pos: augeVor(ZIELE.himmel, 0.85), ziel: ZIELE.himmel, fov: 58 },
  { t: 6.5, pos: AUGE_NAH, ziel: ZIELE.spitze, fov: 54 },
  { t: 8.0, pos: AUGE_NAH, ziel: ZIELE.spitze, fov: 54 },
  { t: 10.5, pos: AUGE_VORN, ziel: ZIELE.vorn, fov: 56 },
  { t: 25, pos: AUGE_VORN, ziel: ZIELE.vorn, fov: 56 },
];
function blickBei(t) {
  if (Q.get("debug") === "s") return { pos: [-2.5, 0.25, FENSTER[2] - 0.2], ziel: ZIELE.spitze, fov: 40 };
  if (t >= T_HIER && t < T_ECHT) {
    const hz = Q.has("hz") ? +Q.get("hz") : HINTEN_ZIEL[2], hy = Q.has("hy") ? +Q.get("hy") : HINTEN_ZIEL[1], hx = Q.has("hx") ? +Q.get("hx") : HINTEN_ZIEL[0], d = Q.has("hd") ? +Q.get("hd") : 0.25;
    const ziel = [hx, hy, hz];
    return { pos: augeVor(ziel, d), ziel, fov: Q.has("hf") ? +Q.get("hf") : 62 };
  }
  if (t >= T_ECHT) return { pos: keyframes([{ t: T_ECHT, v: augeVor(ZIELE.wolken, 0.4) }, { t: 70, v: augeVor(ZIELE.wolken, 0.8) }], t), ziel: ZIELE.wolken, fov: 56 };
  if (t >= 25) {                                          // Folgen: Ziel läuft mit dem Kanal
    const f = smoothstep(25, 29, t), zz = lerp(ZIELE.vorn[2], kanalZ(t), f);
    const ziel = [-13, lerp(-2.4, -1.4, f), zz], d = lerp(0.32, 0.36, f);
    return { pos: augeVor(ziel, d), ziel, fov: lerp(56, 52, smoothstep(25, 40, t)) + 4 * smoothstep(44, 57.9, t) };
  }
  const k = (f) => BLICK.map((b) => ({ t: b.t, v: f(b), e: L }));
  return { pos: keyframes(k((b) => b.pos), t), ziel: keyframes(k((b) => b.ziel), t), fov: keyframes(k((b) => b.fov), t) };
}

async function start() {
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: false });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const szene = new THREE.Scene();
  const kam = new THREE.PerspectiveCamera(56, 1080 / 1920, 0.03, 95000);
  const welt0 = new FlugzeugFenster(szene, { schatten: SCHATTEN });

  // ------------------------------------------------------------------ Protokoll (Klang und Prüfung)
  const prot = new Protokoll();
  const tS = [1, 2, 3].map((k) => S.schlagZeit(k));
  prot.effekt(0.3, "wolkentuerme_wachsen", { klang: false, text: "Sonnenbeschienene Wolkentürme ziehen vorbei, die Tragfläche zittert leicht (Alltag, ahnungslos)" })
    .effekt(1.2, "regentropfen_ziehen", { klang: false, text: "Regentropfen ziehen über die Scheibe, Zoom auf die Tragflächenspitze" })
    .effekt(5.6, "einflug_wolke", { klang: "windstoss", staerke: 0.25, dauer: 2.5, text: "Einflug in die Wolke, leichte Turbulenz, das Licht wird weicher" })
    .effekt(T0, "blitzeinschlag", { klang: "einschlag", staerke: 0.9, dauer: 2.5, text: "Countdown-Null: Blitz trifft die Nase, grelles Licht, Tragfläche leuchtet, Zeitlupe 1:909.000" })
    .effekt(T0, "blitzlicht", { klang: "blitz", staerke: 0.8, text: "Aufleuchten von vorn (Zeitlupe, kein Flackern)" })
    .effekt(S.T_MS0, "zeitlupe_ms", { klang: false, text: "Etikettwechsel ZEIT SEIT EINSCHLAG, Zeitlupe 1:219, Tropfen stehen in der Luft, Lichtadern laufen über die Hülle" })
    .effekt(tS[0], "schlag_2", { klang: "blitz", staerke: 0.7, text: "35 ms: zweiter Schlag, erneutes Aufleuchten" })
    .effekt(tS[1], "schlag_3", { klang: "blitz", staerke: 0.55, text: "70 ms: dritter Schlag" })
    .effekt(tS[2], "schlag_4", { klang: "blitz", staerke: 0.4, text: "105 ms: vierter, schwächerer Schlag, der Kanal wandert" })
    .effekt(42.5, "kanal_am_fenster", { klang: false, text: "Der Kanal steht auf Höhe deines Fensters, das Flugzeug fliegt hindurch" })
    .effekt(S.T_MS1, "strecke", { klang: false, text: "Etikettwechsel STRECKE DURCH DEN BLITZ, 21 m, Zeitlupe 1:250" })
    .effekt(T_HIER, "kanal_reisst_ab", { klang: "druckwelle", staerke: 0.5, dauer: 3, text: "HIER: 26 m, der Kanal reißt am Heck ab, das Licht erlischt" })
    .effekt(T_ECHT_BLITZ, "echtzeit_blitz", { klang: "blitz", staerke: 0.5, text: "Echtzeit: Lichtblitz in 0,2 s" })
    .effekt(T_ECHT_BLITZ + 0.05, "echtzeit_knall", { klang: "donner", staerke: 0.6, text: "Echtzeit: ein Knall" })
    .effekt(64, "ausflug_wolke", { klang: "windstoss", staerke: 0.2, dauer: 4, text: "Die Maschine steigt aus der Wolke, goldenes Licht über der Wolkendecke" });
  prot.melde({ t: 0, typ: "kamera", art: "zoom", dauer: 6.5, von: 58, bis: 54, text: "langsamer Zoom von der Wolkenwand auf die Tragflächenspitze, Brennweite 58° → 54°", klang: false })
    .melde({ t: 8, typ: "kamera", art: "schwenk", dauer: 2.5, text: "Schwenk schräg nach vorn Richtung Nase", klang: false })
    .melde({ t: 25, typ: "kamera", art: "schwenk", dauer: 33, text: "langsamer Schwenk nach hinten, die Kamera folgt dem Kanal", klang: false })
    .melde({ t: 44, typ: "kamera", art: "zoom", dauer: 14, von: 52, bis: 56, text: "Brennweite weitet sich leicht, 52° → 56°", klang: false })
    .melde({ t: T_HIER, typ: "schnitt", grund: "Höhepunkt: Schnitt auf den Blick nach hinten zum Leitwerk, wo der Kanal am Heck abreißt", klang: false })
    .melde({ t: T_ECHT, typ: "kamera", art: "schwenk", dauer: 8, text: "ruhiger Blick auf Wolken und Sonne, langsame Fahrt", klang: false });

  const post = {};
  const welt = { szene, kamera: kam, post, update(t) {
    const raus = smoothstep(63.5, 68, t);                  // Ausflug aus der Wolke
    // bis zum Einschlag nur leichte, helle Wolke, der dunkle Gewitterkern kommt erst danach (Tageslicht bis zum Ereignis)
    const wolke = (0.4 * smoothstep(5.5, 7.9, t) + 0.6 * smoothstep(8.0, 10.5, t)) * (1 - smoothstep(63.5, 67, t));
    let ms, abriss, staerke = 1;
    if (t < T_ECHT) { ms = S.msBei(t); abriss = smoothstep(T_HIER, T_HIER + 0.9, t); }
    else { ms = t >= T_ECHT_BLITZ && t < T_ECHT_BLITZ + 0.25 ? (t - T_ECHT_BLITZ) * 1000 : -1; abriss = 0; staerke = 0.5; }
    welt0.update(t, {
      kamera: kam, blick: blickBei(t),
      flugzeit: t < T_ECHT ? S.flugzeit(t) : S.flugzeit(T_ECHT) + (t - T_ECHT), tempo: tempoBei(t),
      sonne: [lerp(-0.45, -0.35, raus), lerp(0.45, 0.2, raus), lerp(-0.75, -0.9, raus)], sonneFarbe: raus > 0 ? "#FFD39A" : "#FFE2B8", hell: 1,
      wolke, dunkel: 0.55 * smoothstep(8, 13, t) * (1 - raus), wachsen: smoothstep(0, 7, t), deckY: lerp(-420, -150, raus),
      regen: smoothstep(4, 6.5, t) * (1 - raus), nass: lerp(0.22, 0.6, smoothstep(4, 9, t)), eis: 0.3 * wolke,
      turbulenz: lerp(0.15, 0.6, smoothstep(4, 7, t)) * (1 - raus * 0.7) * (t > 8 && t < T_ECHT ? 0.15 : 1),
      kabine: 0.6, rollo: 0, elmsfeuer: 0,
      // Höhepunkt 57,4–59,2 s: der Kanal flammt beim Abreißen weich auf (Anstieg 0,6 s, Abklingen 1,2 s, kein Stroboskop)
      blitz: { t0: T0, ms, kanalZ: kanalZMs(ms), abriss, staerke, ...(t >= 57.4 && t < T_ECHT ? { hell: Math.max(blitzHelligkeit(ms), 0.65 * smoothstep(57.4, 58.0, t) * (1 - smoothstep(58.0, 59.2, t))) } : {}) },
    });
    Object.assign(post, welt0.post);
  } };

  // ------------------------------------------------------------------ Text: Titel, Anzeige, Sätze, Abspann (1:1 aus dem Skript; Zeiten in skript.json → korrekturen)
  const TITEL = "Was passiert, wenn ein Blitz dein Flugzeug trifft, in Zeitlupe vom Fensterplatz?";
  const FAKT = "JEDES VERKEHRSFLUGZEUG · ETWA EIN BLITZTREFFER PRO JAHR";
  const HINWEIS = "Heute Mittag: Wenn die Netzfrequenz fällt";
  const SAETZE = [
    [4.8, "Du sitzt am Fenster über der Tragfläche.", 3.2], [8.4, "Dann trifft ein Blitz vorne die Nase.", 3.0], [11.4, "In fünfeinhalb Mikrosekunden: 30.000 Ampere.", 3.0],
    [14.4, "Jetzt zählt die Zeit in Millisekunden.", 3.0], [17.6, "Der Strom fließt außen über die Hülle.", 3.0], [20.6, "Nach 35 Millisekunden kommt der zweite Schlag.", 3.2],
    [24.2, "Der Blitzkanal selbst steht still in der Luft.", 3.4], [28.2, "Bei 70 Millisekunden folgt der dritte Schlag.", 3.2], [33.4, "Das Flugzeug fliegt einfach durch ihn hindurch.", 3.4],
    [37.4, "Der Kanal gleitet an deinem Fenster vorbei.", 3.4], [41.2, "Die leitende Hülle führt den Strom an dir vorbei.", 3.2], [44.8, "Nach 160 Millisekunden hängt er hinten.", 3.0],
    [48.0, "Das Flugzeug ist jetzt 21 Meter weiter.", 3.0], [51.6, "Der Kanal rutscht bis ans Heck.", 3.2], [61.0, "In Echtzeit war das ein Knall und ein Lichtblitz.", 3.0],
    [64.0, "Die Maschine steigt aus der Wolke.", 3.0], [67.0, "Über den Wolken scheint wieder die Sonne.", 3.0],
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
