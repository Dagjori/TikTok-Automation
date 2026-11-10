// Account 2 @stelldirvor.pov – „Was wäre, wenn der Erdkern abkühlt?“ (Skript acc2-2026-11-11-abend)
// Welt: Bergsee im Herbstwald (engine/welt_bergsee.js, Opus-Neubau 10.11.2026), Standpunkt bodennah am Ufer, Kompass auf dem Stein unten im Bild.
// Ereignis bei 2,5 s = Countdown-Null (Testblock a): Grollen aus dem Boden, Licht flackert, Nadel zuckt. Danach im Modell-Zeitraffer vier Stufen:
//   Magnetfeld 49 → 22 µT (bis 20 s) · Beryllium-10 ×1 → ×2 (20–34 s) · Schutzschild 4,6 → 1,5 Erdradien (34–48 s) · 0,17 → 0 µT (48–58 s), HIER bei 58 s.
// Ein harter Schnitt bei 58 s (Höhepunkt) auf die Totale des Sees. Alle Zahlen kommen aus sim/erdkern_kuehlt.mjs.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { lerp, smoothstep, ease, keyframes } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Protokoll } from "../../engine/stil_lunar_pov.js";
import { LunarHUD } from "../../engine/lunar_hud.js";
import { Bergsee, KOMPASS, richtung, verlauf, nadelKurve } from "../../engine/welt_bergsee.js";
import * as E from "../../sim/erdkern_kuehlt.mjs";

const FPS = 30, DAUER = 80, T_NULL = E.T_EREIGNIS, T_HIER = E.T_HIER, T_SCHNITT = 58;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const L = ease.inOutSine;
const K = (keys, e = L) => (t) => keyframes(keys.map(([tt, v, ee]) => ({ t: tt, v, e: ee || e })), t);
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// ------------------------------------------------------------------------------ Kamera (yaw 0 = Norden über den See, pitch + = oben)
// 0–3 s fest (See und Kompass unten); 3–18 s langsamer Zoom auf die Nadel (Brennweite 58° → 24°, Blick nach unten auf den Kompass);
// 20–26 s Schwenk vom Kompass in den Nordhimmel; 36–40,5 s hoch in den Zenit (Polarlicht über dir), 43,5–46,5 s tiefer Blick zum Horizont (Zugvögel), 49 s wieder Zenit, 50–51,7 s zurück auf die Nadel; 51,7–58 s Zoom bis 14°;
// 58 s harter Schnitt auf die Totale des Sees (Höhepunkt); 62–70 s ruhiger Blick nach Norden.
const KFOV = K([[0, 58], [3, 58], [12, 24], [20, 22], [26, 62], [36, 66], [40.5, 72], [43.5, 66], [49.2, 72], [51.7, 30], [58, 14]]);
const TYAW = K([[T_SCHNITT, -6], [62, 0], [70, 8]]), TPITCH = K([[T_SCHNITT, 3], [62, 4], [70, 8]]), TFOV = K([[T_SCHNITT, 70], [62, 66], [70, 62]]);

// ------------------------------------------------------------------------------ Welt: Tageszeit s (0 Nachmittag … 1 Dämmerung), Polarlicht, Nadel
const SZEIT = K([[0, 0], [14, 0.1], [18, 0.2], [22, 0.32], [24.5, 0.46], [26, 0.56], [58, 0.8], [59, 0.86], [62, 0.9], [70, 1.0]]);
const PL = K([[0, 0], [24, 0], [25, 0.35], [26.2, 0.85], [34, 1], [48, 1], [55, 0.95], [57, 1], [57.95, 0.95], [58, 0.55], [58.6, 0.35], [59.4, 0.05], [60, 0]], ease.linear);
const PLNORD = K([[0, 430], [34, 420], [38, 200], [41, 80], [44, 0], [70, 0]]);
const bump = (t, a, m, b) => smoothstep(a, m, t) * (1 - smoothstep(m, b, t));
const nadel = (t) => {
  const n = nadelKurve(t, { nordBis: T_NULL, zitternBis: 48.5, ruheBis: 54, zitternStaerke: 1, wandern: 0.7 });
  const zuck = bump(t, T_NULL - 0.02, T_NULL + 0.12, T_NULL + 1.2);      // Nadel zuckt beim Modellstart
  return { ...n, zittern: Math.max(n.zittern, 0.9 * zuck), wandern: Math.max(n.wandern, 0.5 * zuck) };
};

async function start() {
  const skript = await lade("skript.json");
  aktiviereHoehenNebel({ abfall: 0.0012, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: Q.has("msaa") ? +Q.get("msaa") : 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const szene = new THREE.Scene();
  const kam = new THREE.PerspectiveCamera(58, 1080 / 1920, 0.03, 40000);
  const welt0 = new Bergsee(szene, { schatten: SCHATTEN });
  // Blick auf den Kompass aus der Geometrie: pK = Neigung zum Kompass, yK = Gierwinkel; +3° → der Kompass sitzt etwas unter der Bildmitte
  const e0 = welt0.augePos(0), pK = (Math.atan2(KOMPASS.mitte[1] - e0[1], Math.hypot(KOMPASS.x, KOMPASS.z)) * 180) / Math.PI + 3, yK = (Math.atan2(KOMPASS.x, -KOMPASS.z) * 180) / Math.PI;
  const KYAW = K([[0, 0], [3, 0], [12, yK], [20, yK], [26, 0], [36, 0], [44, -6], [48.5, -6], [51.7, yK], [58, yK]]);
  const KPITCH = K([[0, -8], [3, -8], [12, pK], [20, pK + 2], [26, 8], [36, 14], [40.5, 62], [43.5, 24], [46.5, 24], [49.2, 78], [50.2, 78], [51.7, pK], [58, pK]]);
  const ziel = new THREE.Vector3();

  // ------------------------------------------------------------------ Protokoll (Klang und Prüfung)
  const prot = new Protokoll();
  prot.effekt(0.4, "enten_wind", { klang: false, text: "Enten ziehen Bahnen, Wind im Schilf, Blätter fallen (Alltag, ahnungslos)" })
    .effekt(1.6, "wolkenschatten", { klang: false, text: "Wolkenschatten ziehen über den See, Licht glitzert im Wasser" })
    .effekt(T_NULL, "kernbeben", { klang: "grollen", staerke: 0.9, dauer: 4, text: "Countdown-Null: tiefes Grollen aus dem Boden, Licht flackert kurz, die Kompassnadel zuckt" })
    .effekt(5.5, "nadel_zittert", { klang: false, text: "Die Nadel zittert, Wasser kräuselt sich unruhig" })
    .effekt(9.0, "nadel_wandert", { klang: false, text: "Die Nadel wandert unruhig umher, Wolkenschatten jagen über den See" })
    .effekt(13.0, "licht_golden", { klang: false, text: "Das Licht wird golden, Enten ziehen Bögen" })
    .effekt(16.0, "feld_22", { klang: "zischen", staerke: 0.25, dauer: 1.5, text: "Stufe 1 erreicht: 22 Mikrotesla, wie über dem Südatlantik" })
    .effekt(18.5, "sonnenuntergang", { klang: false, text: "Sonne sinkt hinter den Gipfel, Himmel glüht orange" })
    .effekt(E.T_STUFE2, "stufe_beryllium", { klang: "zischen", staerke: 0.35, dauer: 1.5, text: "Stufe 2: Anzeige wechselt auf Beryllium-10-Bildung, Schwenk in den Nordhimmel" })
    .effekt(22.5, "nacht", { klang: false, text: "Der Himmel wird tiefblau, erste Sterne, Fensterlicht an der Hütte" })
    .effekt(25.0, "polarlicht_erstes", { klang: "windstoss", staerke: 0.4, dauer: 2, text: "Erstes grünes Polarlicht flackert auf und spiegelt sich im See, Aufleuchten" })
    .effekt(29.0, "polarlicht_heller", { klang: false, text: "Das Polarlicht wird heller, Vorhänge pulsieren" })
    .effekt(E.T_STUFE3, "stufe_schutzschild", { klang: "windstoss", staerke: 0.5, dauer: 2, text: "Stufe 3: Anzeige wechselt auf Schutzschild, das Polarlicht wandert höher" })
    .effekt(38.0, "polarlicht_wandert", { klang: false, text: "Das Polarlicht wandert vom Nordhorizont zum Zenit, Ränder werden rot" })
    .effekt(42.0, "zugvoegel", { klang: false, text: "Ein Zugvogel-Schwarm kreuzt den Himmel und dreht unschlüssig ab" })
    .effekt(E.T_STUFE4, "stufe_dynamo", { klang: "zischen", staerke: 0.45, dauer: 2, text: "Stufe 4: Dynamo stockt, Polarlicht flackert, Anzeige wechselt auf 0,17 Mikrotesla" })
    .effekt(51.7, "nadel_ruhe", { klang: false, text: "Die Kamera kehrt zur Nadel zurück, sie pendelt aus und kommt zur Ruhe" })
    .effekt(55.0, "riser", { klang: "windstoss", staerke: 0.6, dauer: 3, text: "Annäherung: Riser, das Polarlicht flackert unruhig, Zoom auf die ruhende Nadel" })
    .effekt(T_SCHNITT, "hoehepunkt", { klang: "druckwelle", staerke: 0.55, dauer: 3, text: "Höhepunkt: harter Schnitt auf die Totale, das Polarlicht zerfällt schlagartig, Stille, Anzeige HIER" })
    .effekt(62.0, "daemmerung", { klang: false, text: "Fahle Dämmerung, See glatt, kaltes Licht ohne Polarlicht" })
    .effekt(66.0, "morgen_vogel", { klang: false, text: "Wasser kräuselt sich wieder, erster Vogel zieht über den See" });
  prot.melde({ t: 3.0, typ: "kamera", art: "zoom", dauer: 15, von: 58, bis: 24, text: "langsamer Zoom auf die zitternde Nadel, Brennweite 58° → 24°", klang: false })
    .melde({ t: 20, typ: "kamera", art: "schwenk", dauer: 6, text: "Schwenk vom Kompass in den Nordhimmel", klang: false })
    .melde({ t: 36, typ: "kamera", art: "schwenk", dauer: 4.5, text: "Schwenk weiter bis in den Zenit", klang: false })
    .melde({ t: 41, typ: "kamera", art: "schwenk", dauer: 3, text: "Schwenk vom Zenit zurück zum Horizont, Zugvögel kreuzen", klang: false })
    .melde({ t: 46.5, typ: "kamera", art: "schwenk", dauer: 2.7, text: "Schwenk wieder in den Zenit", klang: false })
    .melde({ t: 50.2, typ: "kamera", art: "schwenk", dauer: 1.5, text: "Schwenk vom Zenit zurück auf die Kompassnadel", klang: false })
    .melde({ t: 51.7, typ: "kamera", art: "zoom", dauer: 6.3, von: 30, bis: 14, text: "langsamer Zoom auf die ruhende Nadel, Brennweite 30° → 14°", klang: false })
    .melde({ t: T_SCHNITT, typ: "schnitt", grund: "Höhepunkt: harter Schnitt von der ruhenden Nadel auf die Totale des Sees", klang: false })
    .melde({ t: 62, typ: "kamera", art: "schwenk", dauer: 8, text: "ruhiger Blick nach Norden, leichtes Heben", klang: false });

  const post = {};
  const welt = { szene, kamera: kam, post, update(t) {
    const tot = t >= T_SCHNITT;
    const yaw = Q.has("yaw") ? +Q.get("yaw") : tot ? TYAW(t) : KYAW(t);
    const pitch = Q.has("pitch") ? +Q.get("pitch") : tot ? TPITCH(t) : KPITCH(t);
    const fov = tot ? TFOV(t) : KFOV(t);
    const pos = welt0.augePos(t), d = richtung(yaw, pitch);
    kam.position.set(...pos); kam.fov = fov; kam.updateProjectionMatrix();
    kam.lookAt(ziel.set(pos[0] + d[0] * 100, pos[1] + d[1] * 100, pos[2] + d[2] * 100)); kam.updateMatrixWorld();
    const v = verlauf(SZEIT(t));
    if (tot) { const u = smoothstep(T_SCHNITT, 70, t); v.sonne = { hoehe: lerp(-9, -0.8, u), az: 92 }; v.nebel = lerp(0.35, 0.65, u); v.wolken = lerp(0.2, 0.3, u); }   // fahle Morgendämmerung
    const vogel = Math.max(v.voegel, 0.9 * bump(t, 41.5, 44.5, 47.5));
    const wind = tot ? lerp(0.18, 0.3, smoothstep(T_SCHNITT, 70, t)) : lerp(0.4, 0.75, smoothstep(0, 40, t));
    welt0.update(t, { kamera: kam, sonne: v.sonne, wolken: v.wolken, nebel: v.nebel, blaetter: v.blaetter, voegel: vogel, polarlicht: PL(t), plNord: PLNORD(t), ...(tot ? { stimmung: "daemmerung" } : {}),
      wind, enten: t < 20 ? 1 : 0.6, nadel: nadel(t), tempo: t > T_NULL && t < 20 ? 0.6 : 1 });
    const k = 1 - smoothstep(26, 46, fov);                               // Nahaufnahme: Tiefenunschärfe
    const flackern = 1 - 0.28 * bump(t, T_NULL - 0.02, T_NULL + 0.1, T_NULL + 0.7) * (0.6 + 0.4 * Math.sin(t * 90));
    const aufleuchten = 1 + 0.14 * bump(t, 24.9, 25.15, 26.0);
    Object.assign(post, welt0.post, { vignette: 0.12, koernung: 0.008, tiltStaerke: 0,
      tiefeNah: 0.8, fokusNah: 0.9, tiefeFern: 0.45 * k, fokusFern: 4,
      belichtung: (welt0.post.belichtung ?? 1) * flackern * aufleuchten * (1 + 0.2 * smoothstep(0.2, 0.8, PL(t))),
      ...(tot ? { saettigung: (welt0.post.saettigung ?? 1) * 0.82 } : {}) });
    if (tot) post.belichtung *= 1 + 0.35 * smoothstep(T_SCHNITT, 66, t);
  } };

  // ------------------------------------------------------------------ Text: Titel, Anzeige, Sätze, Abspann (1:1 aus dem Skript)
  const TITEL = skript.titelfrage, FAKT = skript.faktenzeile;
  const HINWEIS = skript.testbloecke && skript.testbloecke.folgen_hinweis === "mit" ? skript.folgen_hinweis : undefined;
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige: (t) => E.anzeige(t), saetze: skript.saetze, hinweis: HINWEIS });

  const ereignisse = prot.alle(hud.ereignisse());
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices, baeumeNah: welt0.baumNah, baeumeFern: welt0.baumFern, schilf: welt0.schilfZahl };
  window.renderAt(Q.has("t") ? +Q.get("t") : 0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
