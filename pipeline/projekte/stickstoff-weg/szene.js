// Account 2, Video 2: „Was wäre, wenn der Stickstoff 5 Sekunden verschwindet?“ – Referenzformat (docs/16 §12), 80 s, keine Stimme.
// Eine durchgehende feste Ich-Perspektive von der Galerie über dem Supermarkt, Geländer im Vordergrund, nur leichtes Atmen der Kamera,
// beim Höhepunkt Erschütterung. Text nur in drei Ebenen (Titelfrage, Messwert-Anzeige, kursiver Satz) plus Abspann, alles in Serifenschrift.
// Zeitplan: zeiten.json. Rechnung (live): ../../sim/stickstoff_weg.mjs. Deterministisch: window.renderAt(t).
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { clamp, lerp, ease, fortschritt, keyframes, smoothstep } from "../../engine/bewegung.js";
import * as S from "../../sim/stickstoff_weg.mjs";
import { baueHalle, KAMERA } from "./halle.js";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const BLOOM = Q.has("bloom") ? +Q.get("bloom") : 0.7;
const SKALA = Q.has("skala") ? +Q.get("skala") : 1;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };
const el = (id) => document.getElementById(id);
const dez = (x, nk = 0) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: nk, maximumFractionDigits: nk }).format(x);

async function start() {
  const zt = await lade("zeiten.json");
  const DAUER = zt.dauer, ENDE = DAUER - 1 / FPS;
  const R = S.alles();
  const P0 = S.P0, PR = R.rest_druck_hPa, PO2 = R.teildruck_o2_hPa;

  const buehne = new Buehne(el("leinwand"), { breite: Math.round(1080 * SKALA), hoehe: Math.round(1920 * SKALA), msaa: MSAA, schatten: SCHATTEN > 0 });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "400 30px 'EBG'", "500 30px 'EBG'", "italic 400 30px 'EBG'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const H = baueHalle(buehne, { schatten: SCHATTEN, zt });

  // ---------- Physik als Funktion der Zeit ----------
  const [tRueck, rueckD] = [zt.ueberleitung.rueck, zt.rueckDauer];
  const fFall = (t) => keyframes(zt.fKnoten.map(([tt, v]) => ({ t: tt, v, e: ease.inOutSine })), t); // Anteil des Stickstoffs, der noch da ist
  const f = (t) => (t < tRueck ? fFall(t) : ease.inOutCubic(fortschritt(t, tRueck, tRueck + rueckD)));
  const druck = (t) => PR + f(t) * (P0 - PR);                     // hPa: N₂-Teildruck + Rest
  const sieden = (t) => S.siedepunkt(druck(t));                   // °C
  const gefuehlt = (t) => S.gefuehlteHoehe(PO2 * (1 - 62.66 / druck(t)) * S.MMHG, "pio2"); // m: Höhe, in der normale Luft denselben O₂-Druck der Einatemluft liefert
  const kochK = (t) => clamp((80 - sieden(t)) / (80 - R.kaffee.siedepunkt)) * smoothstep(zt.ueberleitung.boil, 52, t); // Kaffee (80 °C) siedet, sobald der Siedepunkt unter 80 °C fällt
  const sekunde = (t) => clamp(Math.floor((t - zt.start) / zt.sekunde) + 1, 1, 5);

  // ---------- Welt ----------
  const kam = new THREE.PerspectiveCamera(KAMERA.fov, 1080 / 1920, 0.05, 400);
  const zust = (t) => ({ periode: ENDE, f: f(t), st: 1 - f(t), tKlatsch: zt.ueberleitung.klatsch, tRueck, koch: kochK(t), tSchub: smoothstep(zt.ueberleitung.palette, zt.ueberleitung.crash, t), pov: true });
  const post = { bloomStaerke: BLOOM, bloomSchwelle: 1.0, bloomRadius: 1.0, belichtung: 0.92, vignette: 0.36, saettigung: 1.1, kontrast: 1.1, koernung: 0.03, tiltMitte: 0.6, tiltBreite: 0.5, tiltStaerke: 0.75, tonung: [1, 1, 1], tonungStaerke: 0 };
  const L = H.licht;
  const sonne0 = L.sonne.color.clone(), hemi0 = L.hemi.intensity;
  const kamZustand = (t) => {
    const crash = zt.ueberleitung.crash, bebenAb = crash - 0.15;
    const b = t > bebenAb ? Math.exp(-(t - bebenAb) * 1.7) * smoothstep(0, 0.12, t - bebenAb) : 0;                 // Erschütterung beim Höhepunkt
    const rum = smoothstep(50, crash, t) * 0.25 * (t < crash ? 1 : 0) + b;                                          // Grollen davor
    const nr = t > tRueck ? Math.exp(-(t - tRueck) * 3) * 0.5 : 0;                                                 // sanfter Stoß bei der Rückkehr
    const a = rum + nr;
    const atm = [Math.sin(t * 0.52) * 0.012, Math.sin(t * 0.83 + 1) * 0.008 + Math.sin(t * 1.7) * 0.004, Math.cos(t * 0.37) * 0.01];
    const bb = [Math.sin(t * 47) * 0.028 * a + Math.sin(t * 29 + 2) * 0.02 * a, Math.sin(t * 41 + 1) * 0.045 * a, Math.sin(t * 33) * 0.02 * a];
    kam.position.set(KAMERA.pos[0] + atm[0] + bb[0], KAMERA.pos[1] + atm[1] + bb[1], KAMERA.pos[2] + atm[2] + bb[2]);
    kam.up.set(0, 1, 0); kam.lookAt(new THREE.Vector3(KAMERA.ziel[0] + Math.sin(t * 0.3) * 0.15, KAMERA.ziel[1], KAMERA.ziel[2] + Math.cos(t * 0.27) * 0.12));
    kam.rotateZ(Math.sin(t * 0.4) * 0.004 + Math.sin(t * 37) * 0.016 * a);
    kam.fov = KAMERA.fov; kam.updateProjectionMatrix(); kam.updateMatrixWorld();
  };
  const welt = { szene: H.szene, kamera: kam, post, update(t) {
    kamZustand(t);
    const st = 1 - f(t);
    post.saettigung = lerp(1.08, 0.78, st); post.tonung = [lerp(1, 0.84, st), lerp(1, 0.93, st), lerp(1, 1.1, st)]; post.tonungStaerke = 0.55 * st; post.vignette = lerp(0.36, 0.55, st);
    L.sonne.color.copy(sonne0).lerp(new THREE.Color("#BFD2FF"), st * 0.6); L.hemi.intensity = hemi0 * lerp(1, 0.78, st);
    H.setze(t, zust(t));
  } };
  const zl = new Zeitleiste(buehne);
  zl.shot(0, welt);

  // ---------- Text: drei Ebenen + Abspann ----------
  const eTitel = el("titel"), eAnz = el("anzeige"), eSatz = el("satz"), eSchwarz = el("schwarz"), eAbs = el("abspann");
  const TITEL = "Was wäre, wenn der Stickstoff 5 Sekunden verschwindet?";
  eTitel.textContent = TITEL; eAbs.querySelector(".frage").textContent = TITEL;
  const FAKT = `${dez(PR)} hPa entsprechen etwa ${dez(R.hoehe_druck_m / 1000, 0)} km Höhe (ICAO-Standardatmosphäre) · Wasser siedet dort bei ${dez(R.kaffee.siedepunkt, 0)} °C · Luft: 78,08 % N₂, 20,95 % O₂`;
  eAbs.querySelector(".fakt").textContent = FAKT;
  const etikett = eAnz.querySelector(".etikett"), zahl = eAnz.querySelector(".zahl"), unter = eAnz.querySelector(".unter");
  const [A0, A1] = [4, 70]; // Anzeige sichtbar
  const anzeige = (t) => {
    const ph = zt.phasen, p = druck(t), s = sekunde(t);
    if (t < ph.druck[0]) return { id: 0, etikett: "Stickstoff fehlt in", zahl: dez(Math.max(0, ph.druck[0] - t), 1), einheit: "s", unter: `Normale Luft · ${dez(P0)} hPa`, wert: Math.max(0, ph.druck[0] - t) };
    if (t < ph.siede[0]) return { id: 1, etikett: "Luftdruck", zahl: dez(p), einheit: "hPa", unter: `Sekunde ${s} von 5 · deine Lunge: wie in ${dez(Math.round(gefuehlt(t) / 10) * 10)} m Höhe`, wert: p };
    if (t < ph.rest[0]) return { id: 2, etikett: "Siedepunkt", zahl: dez(sieden(t), 1), einheit: "°C", unter: `Sekunde ${s} von 5 · dein Kaffee hat 80 °C`, wert: sieden(t) };
    if (t < ph.nachher[0]) { const rest = Math.max(0, (ph.nachher[0] - t) / zt.sekunde); return { id: 3, etikett: "Sekunden bis zur Rückkehr", zahl: dez(rest, 1), einheit: "s", unter: t < zt.ueberleitung.crash - 0.8 ? `Sekunde ${s} von 5 · Luftdruck ${dez(PR)} hPa` : `Hier: ${dez(PR)} hPa, wie in ${dez(R.hoehe_druck_m / 1000, 0)} km Höhe`, wert: rest }; }
    return { id: 4, etikett: "Luftdruck", zahl: dez(p), einheit: "hPa", unter: t < tRueck + rueckD + 0.2 ? "Sekunde 5 von 5 vorbei" : "Nach fünf Sekunden wieder normal", wert: p };
  };
  let letzteId = -1;
  const textAt = (t) => {
    // Titel 0–3,5 s
    eTitel.style.opacity = String(smoothstep(0.15, 0.7, t) * (1 - smoothstep(zt.titelBis - 0.6, zt.titelBis, t)));
    // Messwert-Anzeige
    const a = anzeige(t);
    const ein = smoothstep(A0, A0 + 0.7, t) * (1 - smoothstep(A1 - 0.5, A1 + 1.0, t));
    const wechsel = a.id !== letzteId; // Etikettwechsel: kurz weich blenden
    const ph0 = [4, 30, 36.5, 52, 62][a.id];
    const kurz = smoothstep(0, 0.35, t - ph0);
    eAnz.style.opacity = String(ein * (a.id === 0 ? 1 : 0.35 + 0.65 * kurz));
    if (etikett.textContent !== a.etikett) etikett.textContent = a.etikett;
    const zh = `${a.zahl}<small>${a.einheit}</small>`; if (zahl.innerHTML !== zh) zahl.innerHTML = zh;
    if (unter.textContent !== a.unter) unter.textContent = a.unter;
    letzteId = a.id;
    // kursiver Satz
    let so = 0, txt = "";
    for (const [ts, s] of zt.saetze) { if (t >= ts && t < ts + zt.satzDauer) { txt = s; so = smoothstep(ts, ts + 0.5, t) * (1 - smoothstep(ts + zt.satzDauer - 0.5, ts + zt.satzDauer, t)); } }
    if (eSatz.textContent !== txt && txt) eSatz.textContent = txt;
    eSatz.style.opacity = String(so);
    // Abblende und Abspann
    eSchwarz.style.opacity = String(smoothstep(zt.schwarz[0], zt.schwarz[1], t));
    eAbs.style.opacity = String(smoothstep(zt.abspann[0], zt.abspann[0] + 0.8, t));
    el("hud").querySelectorAll(".lage").forEach((e) => { e.style.opacity = String(1 - smoothstep(zt.schwarz[0], zt.schwarz[1], t)); });
  };

  // ---------- Ereignis-Protokoll (für Prüfung und Ton) ----------
  const ereignisse = [];
  ereignisse.push({ t: 0.15, typ: "titel", dauer: zt.titelBis - 0.15, text: TITEL, quelle: "Szene", klang: false });
  for (let t = A0; t < A1; t += 0.5) { const a = anzeige(t); ereignisse.push({ t, typ: "anzeige", etikett: a.etikett, wert: +a.wert.toFixed(3), einheit: a.einheit, unter: a.unter, quelle: "Szene", klang: false, bild: false }); }
  for (const [ts, s] of zt.saetze) ereignisse.push({ t: ts, typ: "satz", dauer: zt.satzDauer, text: s, woerter: s.split(/\s+/).length, quelle: "Szene", klang: false });
  ereignisse.push({ t: zt.schwarz[0], typ: "abblende", dauer: zt.schwarz[1] - zt.schwarz[0], quelle: "Szene", klang: false });
  ereignisse.push({ t: zt.abspann[0], typ: "abspann", dauer: zt.abspann[1] - zt.abspann[0], text: TITEL, fakt: FAKT, quelle: "Szene", klang: false });
  for (const [k, v] of Object.entries(zt.ueberleitung)) ereignisse.push({ t: v, typ: "szene", name: k, quelle: "Szene", klang: false, bild: false });
  ereignisse.sort((a, b) => a.t - b.t);

  const gl = buehne.renderer.getContext();
  const px = new Uint8Array(4);
  window.renderAt = (t) => { zl.zeichne(t, Math.round(t * FPS)); textAt(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => textAt(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner"; window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { ...R, kurve: [0, 30, 36.5, 40, 47.5, 56, 62, 64.6].map((t) => ({ t, p: druck(t), siede: sieden(t), gefuehlt: gefuehlt(t) })) };
  window.renderAt(0); window.renderAt(40); window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
