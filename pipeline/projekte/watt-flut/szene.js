// Account 2 @stelldirvor.pov – „Was passiert, wenn du im Watt stehst und die Flut kommt?“ (Skript acc2-2026-11-13-abend)
// Welt: Sandbank im Watt vor Cuxhaven, bodennah (engine/welt_watt_flut.js, Opus-Neubau 11.11.2026; Himmel/Wasser aus welt_hallig.js übernommen).
// Countdown bis zur Flut 0–8 s, Kenterung der Strömung bei 8 s, Zeitraffer 105,6-fach (1 s = 1,76 min); alle Werte aus sim/watt_flut.mjs
// (anstiegCm, rateCmH, prielCm, countdownText, uhrzeitMez) – dieselbe Funktion treibt Anzeige, Wasserspiegel, Vögel und Sonnenstand.
// Testblöcke: einstieg_a2 = b (zweite sichtbare Stufe bei 13 s: FLUT STEIGT + Strömungslinien klar landeinwärts), folgen_hinweis = mit.
// Ein harter Schnitt bei 58 s (Höhepunkt) auf die Draufsicht: die Sandbank als kleine Insel, Wasser an den Füßen, Sonne am Horizont.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Protokoll } from "../../engine/stil_lunar_pov.js";
import { LunarHUD } from "../../engine/lunar_hud.js";
import { WattSandbank, richtung, sonnenStand, STAND, AUGE_H, optischerPegel, stroemUhr } from "../../engine/welt_watt_flut.js";
import * as S from "../../sim/watt_flut.mjs";

const FPS = 30, DAUER = 80, T_NULL = S.T_EREIGNIS, T_HIER = S.T_HIER;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048, MSAA = Q.has("msaa") ? +Q.get("msaa") : 4;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// ------------------------------------------------------------------------------ weiche Spline (monoton, ohne Halt an jedem Stützpunkt)
function spline(P) {
  const n = P.length, h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h[i] = P[i + 1][0] - P[i][0]; d[i] = (P[i + 1][1] - P[i][1]) / h[i]; }
  m[0] = 0; m[n - 1] = 0;
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return (t) => {
    if (t <= P[0][0]) return P[0][1]; if (t >= P[n - 1][0]) return P[n - 1][1];
    let i = 0; while (t > P[i + 1][0]) i++;
    const u = (t - P[i][0]) / h[i], u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * P[i][1] + (u3 - 2 * u2 + u) * h[i] * m[i] + (-2 * u3 + 3 * u2) * P[i + 1][1] + (u3 - u2) * h[i] * m[i + 1];
  };
}

// ------------------------------------------------------------------------------ Zustand der Welt (reine Funktion von t, Werte aus der Rechnung)
const pegel = (t) => optischerPegel(S.anstiegCm(t));               // m über NW, optisch überhöht bis 1 m (58 s = Füße)
const minuten = (t) => 15 * 60 - 14 + (t <= 8 ? (t / 8) * 14 : 14 + S.minNachNw(t));   // Uhrzeit MEZ in Minuten (wie uhrzeitMez)
// Sonnenstand: Uhrzeit aus der Rechnung, um wenige Minuten verschoben, damit die Sonne bei 58 s den Horizont berührt (Mitte 0,6°)
const DELTA = (() => { let a = -0.5, b = 0.5; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (sonnenStand(minuten(T_HIER) / 60 - 1 + m).hoehe > 0.6) a = m; else b = m; } return (a + b) / 2; })();
const sonne = (t) => sonnenStand(minuten(t) / 60 - 1 + DELTA);
const stromTempo = (t) => -0.55 * (1 - smoothstep(4.5, 8.0, t)) + 0.42 * smoothstep(9.3, 13.0, t) + 0.95 * smoothstep(27, 34, t) + 0.35 * smoothstep(40, 50, t);
const strom = stroemUhr(stromTempo, DAUER);
const K = (P) => spline(P);
const GOLD = K([[0, 0], [43, 0], [48.5, 0.9], [58, 1], [62, 0.75], [70, 0.4]]);
const DUNKEL = K([[0, 0], [58, 0], [62, 0.1], [66, 0.24], [70, 0.36]]);
const SCHAUM = (t) => 0.22 + 0.38 * smoothstep(12.2, 14.2, t) + 0.35 * smoothstep(30, 35, t) - 0.2 * smoothstep(60, 68, t);
const WIRBEL = (t) => 0.9 * smoothstep(30.5, 35, t) - 0.35 * smoothstep(52, 60, t);
const SEEHUNDE = (t) => smoothstep(62.6, 69.5, t) * 0.999;
const N_UHR = DAUER * 120, TW = new Float64Array(N_UHR + 2);
for (let i = 1; i <= N_UHR + 1; i++) { const t = (i - 0.5) / 120; TW[i] = TW[i - 1] + (1 + 0.6 * smoothstep(28, 36, t)) / 120; }
const windZeit = (t) => { const x = clamp(t, 0, DAUER) * 120, i = Math.floor(x); return TW[i] + (TW[Math.min(i + 1, N_UHR + 1)] - TW[i]) * (x - i); };

// ------------------------------------------------------------------------------ Kamera (yaw 0 = Süden, +90 Westen), alles weich
// 0–4,8 s Blick nach vorn über das trockene Watt (Möwen landen, Häufchen wachsen), 4,8–8,4 s Schwenk nach hinten auf den Priel (vor 8 s),
// 8,4–44 s lange Einstellung mit sanften Schwenks (Priel – Rinnsale – vorne trocken – Priel wird Strom – Stange), 44–58 s langsames Absenken
// Richtung Wasserlinie und Schwenk ins Abendlicht; 58 s harter Schnitt auf die Draufsicht; 61–64,5 s Kranfahrt zurück auf Augenhöhe; Nachspiel.
const YAW = K([[0, -6], [4.8, 0], [8.4, 62], [12, 70], [16, 74], [20.5, 66], [26.5, 6], [30.2, 2], [33.4, 57], [37, 63], [41, 66], [44, 63], [48.8, 54], [53.2, 61], [57.95, 59]]);
const PITCH = K([[0, -9], [4.8, -8], [8.4, -8], [12, -9], [16, -15], [20.5, -12], [26.5, -7], [30.2, -7], [33.4, -9], [37, -10], [41, -11], [44, -9], [48.8, -5], [53.2, -10], [57.95, -8]]);
const FOV = K([[0, 58], [8.4, 56], [16, 50], [20.5, 54], [26.5, 58], [30.2, 58], [33.4, 54], [41, 46], [44, 50], [48.8, 56], [53.2, 47], [57.95, 52]]);
const AUGE = K([[0, AUGE_H], [44, AUGE_H], [57.95, 0.55]]);
// Draufsicht nach dem Schnitt: Kamera hinter dir (von der Sonne weg), Blick zur Sonne
const DYAW = (() => { const s = sonne(T_HIER); return s.az - 180 - 14; })();   // Sonne 14° rechts der Bildmitte
const INSEL = richtung(-10).map((v) => v * 2.2);                                  // Mitte zwischen dir und dem Kamm der Sandbank
const D_DIST = K([[T_HIER, 13], [61, 11], [64.5, 0]]), D_HOCH = K([[T_HIER, 8.5], [61, 7.2], [64.5, AUGE_H]]);
const D_PITCH = K([[T_HIER, -27], [61, -27], [64.5, -8], [70, -6]]), D_YAW = K([[T_HIER, DYAW], [61, DYAW], [64.5, 62], [70, 68]]), D_FOV = K([[T_HIER, 70], [61, 66], [64.5, 54], [70, 52]]);
const atmen = (t) => [0.25 * Math.sin(t * 0.9) + 0.12 * Math.sin(t * 2.1 + 1), 0.18 * Math.sin(t * 0.7 + 2) + 0.06 * Math.sin(t * 1.9)];

async function start() {
  const skript = await lade("skript.json");
  aktiviereHoehenNebel({ abfall: 0.0014, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: false });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 46px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  const kam = new THREE.PerspectiveCamera(58, 1080 / 1920, 0.05, 90000);
  const welt0 = new WattSandbank(szene, { schatten: SCHATTEN, pegelVon: pegel });
  const ziel = new THREE.Vector3();

  // ------------------------------------------------------------------ Protokoll (Klang und Prüfung)
  const prot = new Protokoll();
  prot.effekt(0.3, "watt_lebt", { klang: false, text: "Helles Watt am Nachmittag: Rippelmarken, Pfützen spiegeln den Himmel, Austernfischer picken, Möwen kreisen; Wasser rinnt seewärts ab" })
    .effekt(0.8, "moewen_landen", { klang: "fluegel", staerke: 0.45, dauer: 1.6, text: "Möwen gleiten heran und landen vor dir auf dem Watt (0,8–3,6 s)" })
    .effekt(1.2, "wattwurm_haeufchen", { klang: false, text: "Wattwürmer werfen vor dir neue Kothäufchen auf (wachsen 0,6–4,7 s)" })
    .effekt(5.0, "schwenk_priel", { klang: false, text: "Schwenk nach hinten: flacher Priel, Treibschaum zieht noch seewärts" })
    .effekt(T_NULL, "kenterung", { klang: "einschlag", staerke: 0.5, dauer: 2.5, text: "Countdown-Null: die Strömung im Priel kentert, Schaum und Treibgut stehen still, Licht wird einen Hauch kühler" })
    .effekt(8.1, "schaum_steht", { klang: "zischen", staerke: 0.22, dauer: 1.4, text: "Schaum steht, Rauschen setzt ein" })
    .effekt(10.5, "zieht_landeinwaerts", { klang: false, text: "Treibgut beginnt landeinwärts zu ziehen" })
    .effekt(13.0, "flut_steigt", { klang: "gischt", staerke: 0.45, dauer: 2.5, text: "Stufe 2: Etikett FLUT STEIGT, Strömungslinien und Schaumstreifen im Priel klar landeinwärts" })
    .effekt(17.5, "rinnsale_fuellen", { klang: "zischen", staerke: 0.25, dauer: 2.5, text: "Rinnsale füllen sich von unten, verästeln und verbinden sich zu Bächen" })
    .effekt(20.0, "austernfischer_auf", { klang: "fluegel", staerke: 0.4, dauer: 1.6, text: "Die ersten Austernfischer am Prielufer fliegen auf, das Wasser erreicht sie" })
    .effekt(26.5, "vorne_trocken", { klang: false, text: "Schwenk nach vorn: das Watt zum Meer liegt noch trocken, Pfützen glänzen" })
    .effekt(31.2, "priel_wird_strom", { klang: "gischt", staerke: 0.6, dauer: 3, text: "Der Priel wird zum Strom: Schaumlinien, Wirbel, die Flächen hinter dem Priel laufen voll" })
    .effekt(34.0, "wirbel", { klang: "zischen", staerke: 0.3, dauer: 2, text: "Kleine Wirbel drehen den Schaum" })
    .effekt(36.0, "stange_tiefe", { klang: false, text: "Stufe 3: Etikett PRIEL HINTER DIR, an der rot-weißen Stange steigt das Wasser Ring für Ring" })
    .effekt(40.5, "moewen_auf", { klang: "fluegel", staerke: 0.45, dauer: 1.8, text: "Möwen vorne auf dem Watt fliegen auf, das Wasser kommt jetzt auch von vorn" })
    .effekt(44.4, "sandbank_wird_insel", { klang: "gischt", staerke: 0.5, dauer: 3, text: "Pfützen laufen über, das Wasser schließt sich um die Sandbank" })
    .effekt(48.5, "goldene_stunde", { klang: false, text: "Goldene Stunde: tiefe Sonne, das Wasser leuchtet orange" })
    .effekt(53.2, "ueber_der_huefte", { klang: "zischen", staerke: 0.3, dauer: 2, text: "Die Stange zeigt über einen Meter: der Priel reicht über die Hüfte" })
    .effekt(T_HIER - 0.2, "hoehepunkt", { klang: "grollen", staerke: 0.7, dauer: 4, text: "Höhepunkt: Wasser an deinen Füßen, Anzeige HIER" })
    .effekt(T_HIER, "draufsicht", { klang: "gischt", staerke: 0.8, dauer: 3, text: "Harter Schnitt auf die Draufsicht: die Sandbank ist eine kleine Insel, die Sonne berührt den Horizont" })
    .effekt(62.4, "fuesse_nass", { klang: "gischt", staerke: 0.3, dauer: 2, text: "Zurück auf Augenhöhe: Wasser rund um dich, Dämmerung" })
    .effekt(63.0, "seehunde", { klang: false, text: "Seehunde tauchen im Priel auf, Wasserringe" });
  prot.melde({ t: 0.2, typ: "kamera", art: "schwenk", dauer: 4.6, text: "langsamer Schwenk über das trockene Watt nach vorn", klang: false })
    .melde({ t: 4.8, typ: "kamera", art: "schwenk", dauer: 3.6, text: "Schwenk nach hinten auf den Priel", klang: false })
    .melde({ t: 12, typ: "kamera", art: "zoom", dauer: 4, von: 56, bis: 50, text: "Zoom auf die Rinnsale, 56° → 50°", klang: false })
    .melde({ t: 20.5, typ: "kamera", art: "schwenk", dauer: 6, text: "Schwenk nach vorn zum trockenen Watt", klang: false })
    .melde({ t: 30.2, typ: "kamera", art: "schwenk", dauer: 3.2, text: "Schwenk zurück auf den Priel", klang: false })
    .melde({ t: 33.4, typ: "kamera", art: "zoom", dauer: 7.6, von: 54, bis: 46, text: "Zoom auf die Markierungsstange, 54° → 46°", klang: false })
    .melde({ t: 44, typ: "kamera", art: "fahrt", dauer: 14, text: "Kamera sinkt langsam Richtung Wasserlinie, Schwenk ins Abendlicht", klang: false })
    .melde({ t: T_HIER, typ: "schnitt", grund: "Höhepunkt: harter Schnitt auf die Draufsicht der Sandbank (Insel, Wasser an den Füßen)", klang: false })
    .melde({ t: 58.1, typ: "kamera", art: "fahrt", dauer: 3, text: "langsame Fahrt auf die Insel zu", klang: false })
    .melde({ t: 61, typ: "kamera", art: "fahrt", dauer: 3.5, text: "Kranfahrt zurück auf Augenhöhe", klang: false });

  const post = {};
  const welt = { szene, kamera: kam, post, update(t) {
    let pos, yaw, pitch, fov;
    if (t >= T_HIER) {
      yaw = D_YAW(t); pitch = D_PITCH(t); fov = D_FOV(t);
      const d = richtung(DYAW, 0), a = D_DIST(t), [ax, ay] = atmen(t);
      const m = 1 - smoothstep(61, 64.5, t);
      pos = [STAND.x + INSEL[0] * m - d[0] * a, STAND.y + D_HOCH(t), STAND.z + INSEL[2] * m - d[2] * a];
      if (t > 64.5) { yaw += ax * 0.8; pitch += ay * 0.8; }
    } else {
      const [ax, ay] = atmen(t);
      yaw = YAW(t) + ax; pitch = PITCH(t) + ay; fov = FOV(t);
      pos = [STAND.x, STAND.y + AUGE(t) + 0.006 * Math.sin(t * 1.3), STAND.z];
    }
    if (Q.has("yaw")) yaw = +Q.get("yaw"); if (Q.has("pitch")) pitch = +Q.get("pitch"); if (Q.has("fov")) fov = +Q.get("fov");
    const d = richtung(yaw, pitch);
    kam.position.set(...pos); kam.fov = fov; kam.updateProjectionMatrix();
    kam.lookAt(ziel.set(pos[0] + d[0] * 100, pos[1] + d[1] * 100, pos[2] + d[2] * 100)); kam.updateMatrixWorld();
    welt0.update(t, {
      kamera: kam, sonne: sonne(t), bewoelkung: 0.28, zirren: 0.45, dunkel: DUNKEL(t), gold: GOLD(t), pegel: pegel(t),
      strom: strom(t), stromTempo: stromTempo(t), schaum: SCHAUM(t), wirbel: WIRBEL(t), wind: 0.3, windZeit: windZeit(t), seehunde: SEEHUNDE(t),
    });
    // Countdown-Null: Licht kippt einen Hauch ins Kühle (dauerhaft), kurzer Kantenpuls; Höhepunkt: kurzer Lichtstoß
    const kuehl = smoothstep(T_NULL - 0.1, T_NULL + 1.2, t) * (1 - 0.7 * GOLD(t)), puls = smoothstep(T_NULL - 0.05, T_NULL, t) * (1 - smoothstep(T_NULL + 0.1, T_NULL + 1.0, t));
    const hoehe = smoothstep(T_HIER - 0.15, T_HIER, t) * (1 - smoothstep(T_HIER + 0.2, T_HIER + 2.0, t));
    const p0 = welt0.post;
    Object.assign(post, p0, {
      belichtung: p0.belichtung * (1 - 0.06 * puls) * (1 + 0.08 * hoehe),
      tonung: [p0.tonung[0] - 0.05 * kuehl, p0.tonung[1], p0.tonung[2] + 0.05 * kuehl], saettigung: p0.saettigung * (1 - 0.06 * kuehl),
    });
  } };

  // ------------------------------------------------------------------ Text: Titel, Anzeige, Sätze, Abspann (1:1 aus dem Skript)
  const TITEL = skript.titelfrage, FAKT = skript.faktenzeile, SAETZE = skript.saetze;
  const HINWEIS = skript.testbloecke && skript.testbloecke.folgen_hinweis === "mit" ? skript.folgen_hinweis : undefined;
  const anzeige = (t) => {
    if (t < T_NULL) return { etikett: "BIS ZUR FLUT", zahl: S.countdownText(t), einheit: "min", unter: t < 4 ? "NIEDRIGWASSER" : "PRIEL 20 CM TIEF", wert: S.countdownMin(t) };
    if (t < 13) return { etikett: "PEGEL ÜBER NIEDRIGWASSER", zahl: `+${Math.round(S.anstiegCm(t))}`, einheit: "cm", unter: "STRÖMUNG KIPPT", wert: S.anstiegCm(t) };
    if (t < 36) {
      const unter = t < 22 ? "ZEITRAFFER 106-FACH" : t < 31 ? "VORNE NOCH TROCKEN" : "PRIEL WIRD STROM";
      return { etikett: "FLUT STEIGT", zahl: String(Math.round(S.rateCmH(t))), einheit: "cm pro Stunde", unter, wert: S.rateCmH(t) };
    }
    if (t < T_HIER) {
      const unter = t < 44 ? "1 METER PRO STUNDE" : t < 53 ? "SANDBANK WIRD INSEL" : "2 CM PRO MINUTE";
      return { etikett: "PRIEL HINTER DIR", zahl: String(Math.round(S.prielCm(t))), einheit: "cm tief", unter, wert: S.prielCm(t) };
    }
    return { etikett: "HIER", zahl: "HIER", einheit: "", unter: "RÜCKWEG ABGESCHNITTEN", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE, hinweis: HINWEIS });

  const vorNull = [T_NULL - 0.01].map((t) => { const a = anzeige(t); return { t, typ: "anzeige", etikett: a.etikett, zahl: a.zahl, einheit: a.einheit, unter: a.unter, wert: +a.wert.toFixed(4), quelle: "Szene", klang: false, bild: false }; });
  const ereignisse = prot.alle(hud.ereignisse(), vorNull);
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices, delta_h: DELTA, sonne58: sonne(T_HIER), pegel36: pegel(36), pegel53: pegel(53.2), pegel58: pegel(58) };
  window.renderAt(Q.has("t") ? +Q.get("t") : 0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
