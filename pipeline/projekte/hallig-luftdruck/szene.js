// Account 2 @stelldirvor.pov – „Was passiert auf einer Hallig, wenn der Luftdruck rapide fällt?“ (Skript acc2-2026-11-13-mittag)
// Welt: Hallig mit Warft, Reetdachhaus und Barometer (engine/welt_hallig.js, Opus-Neubau 11.11.2026 mit Tageshimmel), Standpunkt Südostecke der Warft.
// Countdown bis zum Drucksturz 0–8 s (Zeitraffer 450-fach), Ereignis bei 8 s, danach 576-fach (1 s = 9,6 min); Werte aus sim/hallig_luftdruck.mjs
// (Druck, Meer gehoben, Böen, Uhrzeit) – dieselben Funktionen treiben Anzeige, Barometerzeiger, Pegel, Wind und Licht.
// Testblöcke: einstieg_a2 = b (zweite sichtbare Stufe bei 13 s: MEER GEHOBEN + Priel hebt sich mit Schaumlinie), folgen_hinweis = mit.
// Ein harter Schnitt bei 58 s (Höhepunkt) auf den Barometerzeiger bei 962 hPa.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Protokoll } from "../../engine/stil_lunar_pov.js";
import { LunarHUD } from "../../engine/lunar_hud.js";
import { Hallig, richtung, sonnenStand, BARO } from "../../engine/welt_hallig.js";
import * as S from "../../sim/hallig_luftdruck.mjs";

const FPS = 30, DAUER = 80, T_NULL = S.T_EREIGNIS, T_HIER = S.T_HIER;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048, MSAA = Q.has("msaa") ? +Q.get("msaa") : 4;
const L = ease.inOutSine;
const K = (keys, e = L) => (t) => keyframes(keys.map(([tt, v, ee]) => ({ t: tt, v, e: ee || e })), t);
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };
const huelle = (t, a, b, c, d) => smoothstep(a, b, t) * (1 - smoothstep(c, d, t));

// ------------------------------------------------------------------------------ Zustand der Welt (reine Funktion von t, Werte aus der Rechnung)
const sturmAus = (t) => clamp((S.boe(t) - 30) / 100);                        // Böen 61 → 43 (Flaute) → 130 km/h
const BEW = K([[0, 0.12], [8, 0.16], [16, 0.28], [24, 0.42], [30, 0.52], [33, 0.6], [35.5, 0.88], [38, 1.0]]);
const ZIRR = K([[0, 0.55], [8, 0.62], [17, 0.95], [29, 0.9], [35, 0.25], [38, 0]]);
const DUNKEL = K([[0, 0], [44, 0.04], [49, 0.12], [54, 0.26], [57.9, 0.38], [63, 0.82], [70, 0.9]]);
const SAUM = K([[45, 0], [47.6, 0.7], [49.1, 1], [51.6, 0.45], [54.5, 0]]);
const pegelAus = (t) => -0.06 + 0.0205 * (S.meerCm(t) - 28) + 0.1 * smoothstep(12.4, 14.6, t);   // Priel/Meer, optisch übertrieben (×2)
// Uhren (einmal tabelliert, kein Zustand zwischen Bildern): Wolkenzug im Zeitraffer, Wind/Gras, Grasen der Schafe
const N = DAUER * 120, TW = new Float64Array(N + 2), TG = new Float64Array(N + 2), TS = new Float64Array(N + 2);
for (let i = 1; i <= N + 1; i++) {
  const t = (i - 0.5) / 120, f = t < T_NULL ? 450 : 576, s = sturmAus(t);
  TW[i] = TW[i - 1] + (f / 576) * (0.45 + 1.3 * s) * 300 / 120;
  TG[i] = TG[i - 1] + (0.8 + 2.4 * s) / 120;
  TS[i] = TS[i - 1] + (t < T_NULL ? 1 : 5) / 120;
}
const uhr = (T, t) => { const x = clamp(t, 0, DAUER) * 120, i = Math.floor(x); return T[i] + (T[Math.min(i + 1, N + 1)] - T[i]) * (x - i); };

// ------------------------------------------------------------------------------ Kamera (yaw 0 = Süden, +90 Westen), alles weich
// 0–5 s Fahrt an der Warftkante, Blick über die Fennen, leichtes Heben zum Himmel (Federwolken); 5–8,2 s Schwenk vom Himmel auf das Barometer
// (Zoom 62° → 40°); 8,2–11,6 s Barometer, langsames Heranzoomen; 11,6–14,6 s Schwenk zurück auf Fennen und Priel; 14,6–44 s lange Einstellung mit
// leichter Fahrt nach Osten; 44–53 s Schwenk und Zoom auf Reetdach und Barometer; 53–58 s Abkippen auf die Schafe an der Hauswand, Kamera bebt;
// 58 s harter Schnitt: Nahaufnahme des Zeigers bei 962 hPa (Höhepunkt), 58–70 s langsam zurück, Beben im Sturm.
const PX = K([[0, -2.4], [8.2, -1.2], [11.6, -1.15], [15, -1.9], [40, -2.6], [58, -2.6]]);
const PZ = K([[0, -12.0], [8.2, -14.8], [11.6, -14.9], [15, -13.4], [40, -12.6], [58, -12.6]]);
const KYAW = K([[0, 13], [5, 9], [8.2, 42], [11.6, 43.3], [14.6, 10], [40, 2], [42, 4], [48, 33], [53, 35], [57.9, 29]]);
const KPITCH = K([[0, -6], [5, 7], [8.2, 0], [11.6, 0], [14.6, -6.5], [40, -5], [42, -4], [48, 6], [53, 5], [57.9, -6]]);
const KFOV = K([[0, 60], [5, 62], [8.2, 40], [11.6, 34], [14.6, 56], [40, 54], [42, 54], [48, 42], [53, 37], [57.9, 50]]);
const NABST = K([[T_HIER, 1.85], [70, 2.35]]), NSEIT = K([[T_HIER, 0.34], [70, 0.5]]), NFOV = K([[T_HIER, 46], [70, 50]]);
const beben = (t) => {
  const a = 0.05 * smoothstep(39, 46, t) + 0.22 * smoothstep(52.5, 57.5, t) * (t < T_HIER ? 1 : 0) + (t >= T_HIER ? 0.12 + 0.35 * Math.exp(-(t - T_HIER) * 1.4) : 0);
  const z = (f, s) => Math.sin(2 * Math.PI * f * t + s) * 0.6 + Math.sin(2 * Math.PI * f * 1.37 * t + s * 2.1) * 0.3 + Math.sin(2 * Math.PI * f * 2.3 * t + s * 3.3) * 0.15;
  return [a * z(4.1, 1.3), a * z(4.4, 2.7) * 0.8];
};

async function start() {
  const skript = await lade("skript.json");
  aktiviereHoehenNebel({ abfall: 0.0016, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: false });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 46px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  const kam = new THREE.PerspectiveCamera(60, 1080 / 1920, 0.08, 90000);
  const welt0 = new Hallig(szene, { schatten: SCHATTEN });
  const ziel = new THREE.Vector3();

  // ------------------------------------------------------------------ Protokoll (Klang und Prüfung)
  const prot = new Protokoll();
  prot.effekt(0.4, "gras_schafe_moewen", { klang: false, text: "Wintergras wogt im mäßigen Wind, Schafe grasen in den Fennen, Möwen kreisen über dem Priel" })
    .effekt(1.8, "wolken_ziehen", { klang: false, text: "Federwolken und kleine Haufenwolken ziehen im Zeitraffer, Wolkenschatten wandern über die Fennen" })
    .effekt(5.0, "himmel_hell", { klang: false, text: "Blick hebt sich in den hellen Wintermorgenhimmel mit tiefer Sonne" })
    .effekt(T_NULL, "drucksturz", { klang: "einschlag", staerke: 0.55, dauer: 2.5, text: "Countdown-Null: Barometerzeiger zuckt und beginnt zu fallen, Licht kippt leicht ins Kühle" })
    .effekt(8.05, "zeiger_zuckt", { klang: "zischen", staerke: 0.25, dauer: 1.2, text: "Zeiger zittert, Schleppzeiger bleibt bei 985 hPa stehen" })
    .effekt(13.0, "meer_hebt_sich", { klang: "gischt", staerke: 0.45, dauer: 2.5, text: "Stufe 2: Etikett MEER GEHOBEN, im Priel steigt das Wasser über die Schlickbank, Schaumlinie am Ufer" })
    .effekt(17.5, "federwolken_jagen", { klang: "windstoss", staerke: 0.3, dauer: 2.5, text: "Federwolken jagen schneller über die Hallig" })
    .effekt(21.0, "moewen_tief", { klang: false, text: "Möwen sinken und fliegen tief über das Gras" })
    .effekt(26.5, "druck_faellt", { klang: "zischen", staerke: 0.25, dauer: 2, text: "Druck fällt vier Hektopascal pro Stunde, Wolkenfelder wachsen" })
    .effekt(31.0, "wind_flaut_ab", { klang: false, text: "Wendung: der Wind flaut ab (Böen 43 km/h), das Gras beruhigt sich, unheimliche Ruhe" })
    .effekt(35.0, "decke_schliesst", { klang: "grollen", staerke: 0.35, dauer: 3, text: "Die Wolkendecke schließt sich, das Licht wird bleiern grau" })
    .effekt(39.0, "sturm_setzt_ein", { klang: "windstoss", staerke: 0.8, dauer: 3, text: "Stufe 3: Sturm setzt ein, Gras peitscht, Möwen werden verweht, Schaumkronen auf dem Priel" })
    .effekt(42.5, "gischt_priel", { klang: "gischt", staerke: 0.5, dauer: 2.5, text: "Gischt und Schaumstreifen auf dem Priel, Gischtflocken fliegen" })
    .effekt(44.4, "reet_zittert", { klang: "windstoss", staerke: 0.6, dauer: 3, text: "Zoom auf das Reetdach: die Reetfransen an der Traufe zittern" })
    .effekt(47.5, "abendrot", { klang: false, text: "Unter der Wolkendecke öffnet sich ein schmaler roter Streifen" })
    .effekt(49.1, "sonnenuntergang", { klang: "zischen", staerke: 0.3, dauer: 2, text: "Sonnenuntergang 16:34 Uhr: rotes Licht unter der Decke, Meer 48 cm höher" })
    .effekt(50.6, "hoflampe_an", { klang: false, text: "Die Hoflampe neben dem Barometer geht an" })
    .effekt(53.0, "schafe_draengen", { klang: "windstoss", staerke: 0.7, dauer: 3, text: "Schafe drängen sich an die Hauswand, Kamera bebt, Ton schwillt an" })
    .effekt(T_HIER - 0.2, "hoehepunkt", { klang: "windstoss", staerke: 1.0, dauer: 3.5, text: "Höhepunkt: harter Schnitt auf den Barometerzeiger bei 962 hPa (STURM), stärkste Böe 130 km/h, Anzeige HIER" })
    .effekt(T_HIER, "grollen_hoehepunkt", { klang: "grollen", staerke: 0.6, dauer: 4, text: "Tiefes Grollen des Orkans" })
    .effekt(61.5, "regen_peitscht", { klang: "zischen", staerke: 0.4, dauer: 3, text: "Nacht: Regen und Gischtflocken peitschen vor dem Barometer vorbei" })
    .effekt(65.5, "zeiger_steigt", { klang: false, text: "Der Zeiger steigt sichtbar schnell wieder (sieben Hektopascal pro Stunde)" });
  prot.melde({ t: 0.2, typ: "kamera", art: "fahrt", dauer: 8, text: "langsame Fahrt an der Warftkante entlang, Blick über die Fennen", klang: false })
    .melde({ t: 5.0, typ: "kamera", art: "schwenk", dauer: 3.2, text: "Schwenk vom Himmel auf das Barometer an der Hauswand", klang: false })
    .melde({ t: 5.0, typ: "kamera", art: "zoom", dauer: 6.6, von: 62, bis: 34, text: "Zoom auf das Barometer, Brennweite 62° → 34°", klang: false })
    .melde({ t: 11.6, typ: "kamera", art: "schwenk", dauer: 3, text: "Schwenk zurück auf Fennen und Priel", klang: false })
    .melde({ t: 15, typ: "kamera", art: "fahrt", dauer: 25, text: "lange Einstellung über die Fennen, leichte Fahrt nach Osten", klang: false })
    .melde({ t: 42, typ: "kamera", art: "schwenk", dauer: 11, text: "Schwenk auf Reetdach und Barometer", klang: false })
    .melde({ t: 42, typ: "kamera", art: "zoom", dauer: 11, von: 54, bis: 38, text: "langsamer Zoom auf Reetdach und Barometer, 54° → 38°", klang: false })
    .melde({ t: 53, typ: "kamera", art: "schwenk", dauer: 4.9, text: "Abkippen auf die Schafe an der Hauswand", klang: false })
    .melde({ t: 52.5, typ: "kamera", art: "beben", dauer: 5.5, quelle: "Szene", klang: false })
    .melde({ t: T_HIER, typ: "schnitt", grund: "Höhepunkt: harter Schnitt auf den Barometerzeiger bei 962 hPa", klang: false })
    .melde({ t: 58.1, typ: "kamera", art: "fahrt", dauer: 11.9, text: "langsam zurück vom Barometer, Kamera bebt im Sturm", klang: false });

  const post = {};
  const welt = { szene, kamera: kam, post, update(t) {
    const nah = t >= T_HIER;
    let pos, yaw, pitch, fov;
    if (nah) {
      fov = NFOV(t);
      const b = welt0.baroBlick(NABST(t), { hoch: -0.05, seit: NSEIT(t) });
      const f = 960 / Math.tan((fov / 2) * Math.PI / 180);
      // Zifferblatt rechts oberhalb der Mitte (frei von Anzeige links und Satz unten): Ziel bei x ≈ 690, y ≈ 700
      yaw = b.yaw - Math.atan((690 - 540) / f) * 180 / Math.PI; pitch = b.pitch - Math.atan((960 - 700) / f) * 180 / Math.PI; pos = b.pos;
    } else {
      pos = [PX(t), 4.6 + 1.65, PZ(t)]; yaw = KYAW(t); pitch = KPITCH(t); fov = KFOV(t);
    }
    if (Q.has("yaw")) yaw = +Q.get("yaw"); if (Q.has("pitch")) pitch = +Q.get("pitch"); if (Q.has("fov")) fov = +Q.get("fov");
    const [bp, by] = beben(t); pitch += bp; yaw += by;
    const d = richtung(yaw, pitch);
    kam.position.set(...pos); kam.fov = fov; kam.updateProjectionMatrix();
    kam.lookAt(ziel.set(pos[0] + d[0] * 100, pos[1] + d[1] * 100, pos[2] + d[2] * 100)); kam.updateMatrixWorld();
    const sturm = sturmAus(t), utc = S.utcH(t);
    const zucken = t > T_NULL ? 2.6 * Math.exp(-(t - T_NULL) * 2.0) * Math.sin((t - T_NULL) * 26) : 0;
    const boeZittern = sturm * (0.5 * Math.sin(t * 17.3) + 0.35 * Math.sin(t * 29.1 + 1.2));
    welt0.update(t, {
      kamera: kam, sonne: sonnenStand(utc), bewoelkung: BEW(t), zirren: ZIRR(t), sturm, dunkel: DUNKEL(t), saum: SAUM(t),
      pegel: pegelAus(t), schaum: 0.75 * smoothstep(12.4, 14.6, t) + 0.25 * smoothstep(38, 46, t), lampe: smoothstep(50.4, 51.2, t), regen: smoothstep(55, 60, t) * 0.85,
      wolkenZeit: uhr(TW, t), windZeit: uhr(TG, t), weideZeit: uhr(TS, t), sammeln: smoothstep(40, 57, t), moewenTief: smoothstep(19, 23.5, t), moewenFlucht: 38.5,
      hpa: S.druck(t), schlepp: 985.2, zucken: zucken + (t > T_NULL ? boeZittern * 0.8 : 0),
    });
    // Countdown-Null: Licht kippt leicht ins Kühle (dauerhaft), kurzer Kantenpuls
    const kuehl = smoothstep(T_NULL - 0.1, T_NULL + 1.2, t), puls = smoothstep(T_NULL - 0.05, T_NULL, t) * (1 - smoothstep(T_NULL + 0.1, T_NULL + 1.0, t));
    const hoehe = smoothstep(T_HIER - 0.15, T_HIER, t) * (1 - smoothstep(T_HIER + 0.2, T_HIER + 2.0, t));
    const p0 = welt0.post;
    Object.assign(post, p0, {
      belichtung: p0.belichtung * (1 - 0.06 * puls) * (1 + 0.08 * hoehe),
      tonung: [p0.tonung[0] - 0.05 * kuehl, p0.tonung[1], p0.tonung[2] + 0.05 * kuehl], saettigung: p0.saettigung * (1 - 0.08 * kuehl),
    });
  } };

  // ------------------------------------------------------------------ Text: Titel, Anzeige, Sätze, Abspann (1:1 aus dem Skript)
  const TITEL = skript.titelfrage, FAKT = skript.faktenzeile, SAETZE = skript.saetze;
  const HINWEIS = skript.testbloecke && skript.testbloecke.folgen_hinweis === "mit" ? skript.folgen_hinweis : undefined;
  const anzeige = (t) => {
    if (t < T_NULL) return { etikett: "BIS ZUM DRUCKSTURZ", zahl: S.countdownText(t), einheit: "min", unter: t < 4 ? "HALLIG · 9 UHR" : "ZEITRAFFER 450-FACH", wert: S.countdownMin(t) };
    if (t < 13) return { etikett: "LUFTDRUCK", zahl: S.de(S.druck(t), 1), einheit: "hPa", unter: "ZEITRAFFER 576-FACH", wert: S.druck(t) };
    if (t < 39) {
      const unter = t < 21 ? "DURCH UNTERDRUCK" : t < 31 ? "−4 HPA PRO STUNDE" : "WIND LÄSST NACH";
      return { etikett: "MEER GEHOBEN", zahl: `+${Math.round(S.meerCm(t))}`, einheit: "cm", unter, wert: S.meerCm(t) };
    }
    if (t < T_HIER) {
      const unter = t < 47 ? "STURM SETZT EIN" : t < 53 ? "MEER +48 CM" : "DRUCK 964 HPA";
      return { etikett: "BÖEN", zahl: String(Math.round(S.boe(t))), einheit: "km/h", unter, wert: S.boe(t) };
    }
    return { etikett: "HIER", zahl: "HIER", einheit: "", unter: "962 HPA · 130 KM/H", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE, hinweis: HINWEIS });

  // Zusätzlicher echter Messpunkt der Anzeige kurz vor Countdown-Null (das 0,5-s-Raster des HUD trifft 7,5 s = 3:45 und dann schon 8,0 s)
  const vorNull = [T_NULL - 0.01].map((t) => { const a = anzeige(t); return { t, typ: "anzeige", etikett: a.etikett, zahl: a.zahl, einheit: a.einheit, unter: a.unter, wert: +a.wert.toFixed(4), quelle: "Szene", klang: false, bild: false }; });
  const ereignisse = prot.alle(hud.ereignisse(), vorNull);
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices, baro: BARO.pos };
  window.renderAt(Q.has("t") ? +Q.get("t") : 0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
