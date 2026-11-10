// Account 2 @stelldirvor.pov – „Was wäre, wenn ein Sonnensturm wie 1859 heute Nacht Deutschland trifft?“ (Skript acc2-2026-11-11-mittag)
// Welt: Wattenmeer mit Leuchtturm (engine/welt_watt_leuchtturm.js, Opus-Neubau 10.11.2026), Standpunkt Galerie des Leuchtturms (39,6 m).
// Ereignis bei 2,5 s = Countdown-Null (Testblock a), danach Zeitraffer 1 s = 10 Minuten (18:35 → 06:15), Stärke aus sim/sonnensturm_1859.mjs (Dst in nT).
// Harter Schnitt bei 58 s auf das Dorf (Höhepunkt „HIER“), bei 62 s zurück auf die Galerie (Nachspiel). Alle Zahlen kommen aus der Rechnung.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Protokoll } from "../../engine/stil_lunar_pov.js";
import { LunarHUD } from "../../engine/lunar_hud.js";
import { WattLeuchtturm, richtung } from "../../engine/welt_watt_leuchtturm.js";
import * as S from "../../sim/sonnensturm_1859.mjs";

const FPS = 30, DAUER = 80, T_NULL = S.T_EREIGNIS, T_HIER = S.T_HIER, T_SCHNITT = S.T_SCHNITT, T_ZURUECK = 62;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048, MSAA = Q.has("msaa") ? +Q.get("msaa") : 4;
const L = ease.inOutSine;
const K = (keys, e = L) => (t) => keyframes(keys.map(([tt, v, ee]) => ({ t: tt, v, e: ee || e })), t);
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// ------------------------------------------------------------------------------ Kamera (yaw 0 = Süden, +90 Westen, ±180 Norden)
// 0–7 s langsame Fahrt am Geländer (Blick Nord, yaw 168 → 192, beginnt vor 2 s); 7–20 s ruhig nach Norden; 20–34 s weicher Schwenk von Nord zum Zenit;
// 34–40 s im Zenit (Korona); 40–50 s Schwenk über den Zenit nach Süden; 50–58 s langsame Annäherung (Zoom); 58 s harter Schnitt auf das Dorf;
// 62 s Schnitt zurück auf die Galerie, 62–70 s ruhiger Blick nach Norden, Morgengrauen im Osten.
const KYAW = K([[0, 168], [7, 192], [20, 184], [34, 180], [40, 180], [47, 2], [58, -4]]);
const KPITCH = K([[0, 3], [7, 4], [20, 4], [34, 78], [40, 78], [43.5, 30], [46, 12], [50, 8], [58, 5]]);
const KFOV = K([[0, 62], [20, 62], [34, 70], [40, 70], [50, 62], [58, 46]]);
const NYAW = K([[T_ZURUECK, 180], [70, 176]]), NPITCH = K([[T_ZURUECK, 7], [70, 13]]), NFOV = K([[T_ZURUECK, 62], [70, 60]]);

// ------------------------------------------------------------------------------ Zustand der Welt aus der Stärke (Dst/900) und der Zeit
const ruhig = (t) => 1 - smoothstep(T_ZURUECK, 68, t);                      // Nachspiel: Sturm klingt ab
const zustand = (t) => {
  const s = S.staerke(t), r = t < T_ZURUECK ? 1 : ruhig(t);
  const nach = t >= T_ZURUECK;
  return {
    dunkel: 0.06 + 0.94 * smoothstep(0, 9, t),
    morgen: smoothstep(T_ZURUECK, 70, t),
    wolken: lerp(0.72, 0.1, smoothstep(24, 35, t)) * (1 - 0.3 * smoothstep(60, 70, t)),
    plNord: t < T_NULL ? 0 : (0.95 * smoothstep(0.0, 0.46, s) * (nach ? 0.15 + 0.85 * r : 1)),
    plRot: (smoothstep(0.34, 0.72, s)) * (nach ? 0.1 + 0.9 * r : 1),
    plKrone: smoothstep(0.52, 0.68, s) * (nach ? r : 1),
    plSued: smoothstep(0.66, 0.86, s) * (nach ? r : 1),
    plHelle: (0.25 * smoothstep(0.1, 0.5, s) + 0.75 * smoothstep(0.7, 1.0, s)) * (nach ? r : 1),
    pegel: S.pegel(t),
  };
};

async function start() {
  const skript = await lade("skript.json");
  aktiviereHoehenNebel({ abfall: 0.0012, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: false });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  const kam = new THREE.PerspectiveCamera(62, 1080 / 1920, 0.15, 90000);
  const welt0 = new WattLeuchtturm(szene, { schatten: SCHATTEN, spiegel: Q.has("spiegel") ? +Q.get("spiegel") : 0.5 });
  const ziel = new THREE.Vector3();
  const db = welt0.dorfBlick;

  // ------------------------------------------------------------------ Protokoll (Klang und Prüfung)
  const prot = new Protokoll();
  prot.effekt(0.5, "moewen_leuchtfeuer", { klang: false, text: "Möwen ziehen über das Watt, das Leuchtfeuer dreht, Schafe weiden auf dem Deich" })
    .effekt(1.7, "wolken_ziehen", { klang: false, text: "Wolkenfelder ziehen über das Watt, Licht in den Prielen" })
    .effekt(T_NULL, "einschlag", { klang: "windstoss", staerke: 0.7, dauer: 2.5, text: "Countdown-Null: tiefer Puls, am Nordhorizont glimmt ein grüner Saum auf, Zeitraffer startet" })
    .effekt(4.6, "saum_waechst", { klang: false, text: "Der grüne Saum wächst über dem Horizont, Spiegelung in den Prielen" })
    .effekt(7.0, "zeitraffer", { klang: "zischen", staerke: 0.3, dauer: 1.5, text: "Zeitraffer: Wolken ziehen schneller, Gezeiten laufen, 1 Sekunde = 10 Minuten" })
    .effekt(10.0, "gruener_bogen", { klang: false, text: "Grüner Bogen mit Strahlen steht über dem Watt" })
    .effekt(13.0, "priele_spiegeln", { klang: false, text: "Priele spiegeln das Licht, Wasser steigt im Watt" })
    .effekt(16.0, "rote_boegen", { klang: "zischen", staerke: 0.3, dauer: 2, text: "Rote Bögen wachsen über das Watt" })
    .effekt(21.0, "wie_mai_2024", { klang: "windstoss", staerke: 0.5, dauer: 2, text: "Stufe 2: so stark wie im Mai 2024, rote und violette Bögen steigen, Licht kräftiger" })
    .effekt(24.0, "wolken_reissen", { klang: false, text: "Die Wolken reißen auf, der Himmel pulsiert" })
    .effekt(27.5, "pulsieren", { klang: false, text: "Vorhänge pulsieren, Licht spiegelt sich im Watt" })
    .effekt(31.0, "korona", { klang: "zischen", staerke: 0.45, dauer: 2.5, text: "Im Zenit bildet sich eine Krone: Strahlen laufen zusammen" })
    .effekt(34.0, "staerkster_seit_1957", { klang: "windstoss", staerke: 0.6, dauer: 2, text: "Stufe 3: stärkster Sturm seit 1957, Etikettwechsel der Anzeige" })
    .effekt(37.5, "korona_pulsiert", { klang: false, text: "Korona pulsiert über dem Leuchtturm" })
    .effekt(40.5, "suedhimmel_rot", { klang: "zischen", staerke: 0.4, dauer: 3, text: "Der Südhimmel färbt sich rot, Strahlen im Süden" })
    .effekt(44.5, "salzwiese_leuchtet", { klang: false, text: "Salzwiese und Deich leuchten rot und grün, Schafe im farbigen Licht" })
    .effekt(48.0, "dorf_rot", { klang: false, text: "Das Dorf liegt im roten Licht, Schatten werden sichtbar" })
    .effekt(51.0, "zeitung_lesen", { klang: "windstoss", staerke: 0.5, dauer: 3, text: "Annäherung: Licht so hell, dass Geländer und Schafe Konturen zeigen, Riser" })
    .effekt(55.0, "fast_1859", { klang: false, text: "Anzeige läuft auf 2,2-fach, Ton schwillt an, Zoom nach Süden" })
    .effekt(T_HIER - 0.2, "hoehepunkt", { klang: "windstoss", staerke: 1.0, dauer: 3.5, text: "Höhepunkt: harter Schnitt auf das Dorf unter rotem und grünem Himmel, Korona über dem Turm, Anzeige HIER" })
    .effekt(60.0, "dorf_unter_himmel", { klang: false, text: "Langsame Kamerabewegung über den Dächern, Himmel wogt in Rot und Grün" })
    .effekt(T_ZURUECK, "zurueck_galerie", { klang: "zischen", staerke: 0.4, dauer: 2, text: "Zurück auf der Galerie: das Licht verebbt" })
    .effekt(64.5, "farben_verblassen", { klang: false, text: "Die Farben verblassen, Wolken ziehen wieder zu" })
    .effekt(67.0, "morgengrauen", { klang: false, text: "Erstes Morgengrauen im Osten, das Leuchtfeuer dreht weiter" });
  prot.melde({ t: 0.2, typ: "kamera", art: "fahrt", dauer: 7, text: "langsame Fahrt am Geländer entlang, Blick nach Norden", klang: false })
    .melde({ t: 20, typ: "kamera", art: "schwenk", dauer: 14, text: "weicher Schwenk von Nord zum Zenit", klang: false })
    .melde({ t: 40, typ: "kamera", art: "schwenk", dauer: 10, text: "Schwenk über den Zenit nach Süden", klang: false })
    .melde({ t: 50, typ: "kamera", art: "zoom", dauer: 8, von: 62, bis: 46, text: "langsame Annäherung nach Süden, Brennweite 62° → 46°", klang: false })
    .melde({ t: T_SCHNITT, typ: "schnitt", grund: "Höhepunkt: harter Schnitt vom Leuchtturm auf das Dorf im Süden unter dem Himmel", klang: false })
    .melde({ t: 58.1, typ: "kamera", art: "schwenk", dauer: 3.9, text: "langsames Abkippen über den Dächern des Dorfes", klang: false })
    .melde({ t: T_ZURUECK, typ: "schnitt", grund: "Szenensprung vom Dorf zurück auf die Galerie, Nachspiel", klang: false })
    .melde({ t: 62.1, typ: "kamera", art: "schwenk", dauer: 7.9, text: "ruhiger Blick nach Norden, leichtes Heben", klang: false });

  const post = {};
  const welt = { szene, kamera: kam, post, update(t) {
    const z = zustand(t);
    const dorf = t >= T_SCHNITT && t < T_ZURUECK;
    let yaw, pitch, fov, pos;
    if (dorf) {
      const u = clamp((t - T_SCHNITT) / (T_ZURUECK - T_SCHNITT));
      yaw = (Q.has("yaw") ? +Q.get("yaw") : db.yaw + 3 * u); pitch = Q.has("pitch") ? +Q.get("pitch") : lerp(db.pitch, db.pitch + 10, u); fov = lerp(db.fov, db.fov - 4, u);
      pos = welt0.dorfAugePos;
    } else {
      const spaet = t >= T_ZURUECK;
      yaw = Q.has("yaw") ? +Q.get("yaw") : spaet ? NYAW(t) : KYAW(t); pitch = Q.has("pitch") ? +Q.get("pitch") : spaet ? NPITCH(t) : KPITCH(t); fov = spaet ? NFOV(t) : KFOV(t);
      pos = welt0.augePos(t, yaw);
    }
    const d = richtung(yaw, pitch);
    kam.position.set(...pos); kam.fov = fov; kam.updateProjectionMatrix();
    kam.lookAt(ziel.set(pos[0] + d[0] * 100, pos[1] + d[1] * 100, pos[2] + d[2] * 100)); kam.updateMatrixWorld();
    welt0.update(t, { kamera: kam, ...z, wind: 0.5, tempo: t > T_NULL && t < T_ZURUECK ? 0.5 : 1, moewen: t < 30 ? 1 : 0.6 });
    const br = smoothstep(T_HIER - 0.8, T_HIER, t) * (1 - smoothstep(T_HIER + 0.2, T_HIER + 1.8, t));
    Object.assign(post, welt0.post, { belichtung: (welt0.post.belichtung ?? 1) * (1 + 0.06 * br) });
  } };

  // ------------------------------------------------------------------ Text: Titel, Anzeige, Sätze, Abspann (1:1 aus dem Skript)
  const TITEL = skript.titelfrage;
  const FAKT = skript.faktenzeile;
  const HINWEIS = skript.testbloecke && skript.testbloecke.folgen_hinweis === "mit" ? skript.folgen_hinweis : undefined;
  const SAETZE = skript.saetze;
  const de1 = (x) => x.toFixed(1).replace(".", ",");
  const anzeige = (t) => {
    if (t < T_NULL) return { etikett: "ANKUNFT PLASMAWOLKE", zahl: S.countdownText(t), einheit: "STD:MIN", unter: "17 STUNDEN UNTERWEGS", wert: S.countdownMin(t) };
    if (t < 34) {
      const unter = t < 8 ? "EINSCHLAG" : t < 21 ? "1 SEKUNDE = 10 MINUTEN" : t < 26 ? "WIE MAI 2024" : "STÄRKER ALS MAI 2024";
      const v = Math.round(S.dst(t));
      return { etikett: "MAGNETFELD-STÖRUNG", zahl: v === 0 ? "0" : `−${Math.abs(v)}`, einheit: "nT", unter, wert: Math.abs(v) };
    }
    if (t < T_HIER) {
      const unter = t < 44 ? "STÄRKSTER SEIT 1957" : t < 52 ? "SÜDHIMMEL ROT" : "FAST WIE 1859";
      return { etikett: "STÄRKE IM VERGLEICH ZU MAI 2024", zahl: de1(S.faktor(t)), einheit: "×", unter, wert: S.faktor(t) };
    }
    return { etikett: "HIER", zahl: "HIER", einheit: "", unter: "STÄRKE WIE 1859 · CA. −900 NT", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE, hinweis: HINWEIS });

  const ereignisse = prot.alle(hud.ereignisse());
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices, haeuser: welt0.hausZahl };
  window.renderAt(Q.has("t") ? +Q.get("t") : 0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
